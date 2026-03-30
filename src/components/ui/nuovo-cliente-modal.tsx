'use client'

import { useState } from 'react'
import { Plus, X, Users, FolderOpen, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

export function NuovoClienteModal() {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [phase, setPhase] = useState<'idle' | 'saving' | 'drive' | 'done'>('idle')
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        setLoading(true)
        setError('')

        try {
            // 1. Salva cliente su Supabase
            setPhase('saving')
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Non autenticato. Esci e rifai il login.')
            const { data: newClient, error: err } = await supabase
                .from('clients')
                .insert({ name: name.trim(), vault_path: `/_CLIENTI/${name.trim()}/`, user_id: user.id })
                .select()
                .single()

            if (err) throw new Error(err.message)

            // 2. Crea cartella Drive (fire and forget — non blocca se fallisce)
            setPhase('drive')
            try {
                await fetch('/api/drive/setup-client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId: newClient.id, clientName: name.trim() }),
                })
            } catch {
                // Drive non bloccante: il cliente è già salvato
                console.warn('Drive setup non completato — token scaduto o non configurato')
            }

            setPhase('done')
            window.location.reload()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Errore nel salvataggio')
            setLoading(false)
            setPhase('idle')
        }
    }

    const handleClose = () => {
        if (loading) return
        setOpen(false)
        setName('')
        setError('')
        setPhase('idle')
    }

    const phaseLabel: Record<string, string> = {
        idle: 'Salva',
        saving: 'Salvataggio...',
        drive: 'Creo cartella Drive...',
        done: 'Fatto!',
    }

    return (
        <>
            <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nuovo Cliente
            </Button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) handleClose() }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 relative">
                        <button
                            onClick={handleClose}
                            disabled={loading}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-30"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <Users className="w-6 h-6 text-accent" />
                            <h2 className="text-xl font-bold text-gray-900">Nuovo Cliente</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                                    Nome Cliente
                                </label>
                                <Input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="es. Fondazione Alfa"
                                    autoFocus
                                    required
                                    disabled={loading}
                                />
                            </div>

                            {/* Preview cartella Drive */}
                            {name.trim() && (
                                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                                    <FolderOpen className="w-3.5 h-3.5 text-accent" />
                                    <span>Drive: <span className="font-mono text-gray-600">/_CLIENTI/{name.trim()}/</span></span>
                                </div>
                            )}

                            {error && <p className="text-sm text-red-600">{error}</p>}

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
                                    Annulla
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={!name.trim() || loading}
                                >
                                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {phaseLabel[phase]}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
