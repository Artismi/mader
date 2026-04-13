'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addIdea } from '@/app/actions'
import { TaskFormModal } from './nuovo-task-modal'

const PLATFORMS = [
  { value: 'ig', label: 'Instagram' },
  { value: 'fb', label: 'Facebook' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'altro', label: 'Altro' },
]

export function NuovaIdeaModal() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [clientId, setClientId] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [convertTitle, setConvertTitle] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/clients')
      .then(r => r.json())
      .then((data: { id: string; name: string }[]) => setClients(data || []))
      .catch(() => {/* silently ignore */})
  }, [open])

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() && !title.trim()) return
    setLoading(true)
    setError('')
    try {
      await addIdea(text, clientId || undefined, title || undefined, platforms.length ? platforms : undefined)
      handleClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setLoading(false)
    }
  }

  const handleConvert = async () => {
    if (!text.trim() && !title.trim()) return
    setLoading(true)
    setError('')
    try {
      await addIdea(text, clientId || undefined, title || undefined, platforms.length ? platforms : undefined)
      const ideaTitle = title || text
      handleClose()
      setConvertTitle(ideaTitle)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore')
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setTitle('')
    setText('')
    setClientId('')
    setPlatforms([])
    setError('')
    setLoading(false)
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
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <Lightbulb className="w-6 h-6 text-accent" />
              <h2 className="text-xl font-bold text-gray-900">Nuova Idea</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Titolo (opzionale)"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-shadow"
                autoFocus
              />

              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Descrivi la tua idea..."
                className="w-full border border-gray-200 rounded-xl p-4 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-shadow"
              />

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Piattaforme</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => togglePlatform(p.value)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        platforms.includes(p.value)
                          ? 'bg-accent text-white border-accent'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-accent/40'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
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

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={handleClose}>Annulla</Button>
                <Button
                  type="button"
                  variant="secondary"
                  isLoading={loading}
                  disabled={(!text.trim() && !title.trim()) || loading}
                  onClick={handleConvert}
                >
                  → Trasforma in Task
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={loading}
                  disabled={(!text.trim() && !title.trim()) || loading}
                >
                  Salva Idea
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TaskFormModal
        open={convertTitle !== null}
        onClose={() => setConvertTitle(null)}
        initialTitle={convertTitle ?? ''}
        initialClientId={clientId}
      />
    </>
  )
}
