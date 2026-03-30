'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

const CATEGORIE = [
    { value: 'social', label: 'Social' },
    { value: 'design', label: 'Design' },
    { value: 'dev', label: 'Sviluppo' },
    { value: 'bando', label: 'Bando' },
    { value: 'finanze', label: 'Finanze' },
    { value: 'general', label: 'Generale' },
]

interface TaskFormModalProps {
    open: boolean;
    onClose: () => void;
    initialDate?: string;
}

export function TaskFormModal({ open, onClose, initialDate }: TaskFormModalProps) {
    const [title, setTitle] = useState('')
    const [categoria, setCategoria] = useState('general')
    const [deadline, setDeadline] = useState(initialDate || '')
    const [clientId, setClientId] = useState('')
    const [clients, setClients] = useState<{ id: string; name: string }[]>([])
    const [category, setCategory] = useState<'task' | 'engagement'>('task')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (initialDate) {
            setDeadline(initialDate)
        }
    }, [initialDate, open])

    useEffect(() => {
        if (!open) return
        const supabase = createClient()
        supabase.from('clients').select('id, name').order('name').then(({ data }) => {
            setClients(data || [])
        })
    }, [open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !deadline) return
        setLoading(true)
        setError('')
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Non autenticato. Esci e rifai il login.')
            const { error: err } = await supabase.from('tasks').insert({
                title: title.trim(),
                type: categoria,
                category: category,
                deadline: new Date(deadline).toISOString(),
                status: 'todo',
                client_id: clientId || null,
                user_id: user.id,
            })
            if (err) throw new Error(err.message)
            handleClose()
            window.location.reload()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Errore nel salvataggio')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setTitle('')
        setCategoria('general')
        setCategory('task')
        setDeadline('')
        setClientId('')
        setError('')
        onClose()
    }

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 relative border border-gray-100">
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6 font-sans">
                    <Briefcase className="w-6 h-6 text-accent" />
                    <h2 className="text-xl font-bold text-gray-900">Nuovo Incarico</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                        <button
                            type="button"
                            onClick={() => setCategory('task')}
                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${category === 'task' ? 'bg-white text-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Progetto
                        </button>
                        <button
                            type="button"
                            onClick={() => setCategory('engagement')}
                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${category === 'engagement' ? 'bg-white text-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Impegno
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Titolo</label>
                        <Input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={category === 'task' ? "es. Post carosello Instagram..." : "es. Lavoro al pomeriggio..."}
                            autoFocus
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Categoria</label>
                            <select
                                value={categoria}
                                onChange={e => setCategoria(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-gray-800"
                            >
                                {CATEGORIE.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Scadenza</label>
                            <input
                                type="date"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-gray-800"
                                required
                            />
                        </div>
                    </div>

                    {clients.length > 0 && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Cliente (opzionale)</label>
                            <select
                                value={clientId}
                                onChange={e => setClientId(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-gray-800"
                            >
                                <option value="">— Nessun cliente —</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" className="text-gray-500 hover:text-gray-700" onClick={handleClose}>Annulla</Button>
                        <Button type="submit" variant="primary" isLoading={loading} disabled={!title.trim() || !deadline}>
                            Crea Incarico
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export function NuovoTaskModal() {
    const [open, setOpen] = useState(false)
    return (
        <>
            <Button variant="primary" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Task
            </Button>
            <TaskFormModal open={open} onClose={() => setOpen(false)} />
        </>
    )
}
