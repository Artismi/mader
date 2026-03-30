'use client'

import { useState } from 'react'
import { Plus, X, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addIdea } from '@/app/actions'

export function NuovaIdeaModal() {
    const [open, setOpen] = useState(false)
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!text.trim()) return
        setLoading(true)
        setError('')
        try {
            await addIdea(text)
            setText('')
            setOpen(false)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Errore nel salvataggio')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setOpen(false)
        setText('')
        setError('')
    }

    return (
        <>
            <Button variant="secondary" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Idea
            </Button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) handleClose() }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 relative">
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
                            aria-label="Chiudi"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <Lightbulb className="w-6 h-6 text-accent" />
                            <h2 className="text-xl font-bold text-gray-900">Nuova Idea</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="Descrivi la tua idea..."
                                className="w-full border border-gray-200 rounded-xl p-4 text-sm resize-none h-32 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-shadow"
                                autoFocus
                            />
                            {error && (
                                <p className="text-sm text-red-600">{error}</p>
                            )}
                            <div className="flex justify-end gap-3">
                                <Button type="button" variant="ghost" onClick={handleClose}>
                                    Annulla
                                </Button>
                                <Button type="submit" variant="primary" isLoading={loading} disabled={!text.trim()}>
                                    Salva Idea
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
