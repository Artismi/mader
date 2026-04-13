'use client'

import { useState } from 'react'
import { Plus, X, Users, FolderOpen, Loader2, Landmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addClient } from '@/app/actions'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export function NuovoClienteModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<'cliente' | 'bando'>('cliente')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'saving' | 'drive' | 'done'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    setPhase('saving')

    try {
      await addClient({ name: name.trim(), sector: category === 'bando' ? 'bando' : undefined })
      setPhase('done')
      handleClose()
      router.refresh()
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
    setCategory('cliente')
    setError('')
    setPhase('idle')
    setLoading(false)
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
        <Plus className="w-4 h-4 mr-2" /> Nuovo Cliente / Bando
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 relative border border-gray-100">
            <button
              onClick={handleClose}
              disabled={loading}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-30"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                {category === 'cliente' ? <Users className="w-6 h-6 text-accent" /> : <Landmark className="w-6 h-6 text-accent" />}
              </div>
              <h2 className="text-xl font-bold text-gray-900">Nuova Entità</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex bg-gray-50 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setCategory('cliente')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                    category === 'cliente' ? "bg-white text-accent shadow-sm" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <Users className="w-3.5 h-3.5" /> Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('bando')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                    category === 'bando' ? "bg-white text-accent shadow-sm" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <Landmark className="w-3.5 h-3.5" /> Bando
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-widest">
                  {category === 'cliente' ? 'Nome Cliente' : 'Titolo Bando'}
                </label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={category === 'cliente' ? "es. Fondazione Alfa" : "es. Bando Creative Europe 2024"}
                  autoFocus
                  required
                  disabled={loading}
                />
              </div>

              {name.trim() && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Percorso Vault</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                    <FolderOpen className="w-3.5 h-3.5 text-accent/60" />
                    <span className="font-mono">{category === 'bando' ? '/_BANDI/' : '/_CLIENTI/'}{name.trim()}/</span>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={handleClose} disabled={loading} className="text-gray-400 font-bold">
                  Annulla
                </Button>
                <Button type="submit" variant="primary" disabled={!name.trim() || loading}
                  className="h-10 px-6 font-black uppercase tracking-widest text-[11px]">
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
