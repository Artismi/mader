'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, FileText, ChevronLeft, ShieldCheck, Info, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VaultEditorProps {
  path: string
  onClose: () => void
}

export function VaultEditor({ path, onClose }: VaultEditorProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFile = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/vault/file?path=${encodeURIComponent(path)}`)
      if (!res.ok) throw new Error('Impossibile caricare il file')
      const text = await res.text()
      setContent(text)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFile()
  }, [path])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/vault/file?path=${encodeURIComponent(path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Salvataggio fallito')
      // Success feedback
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-black/40 border-l border-white/[0.06] backdrop-blur-3xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.03]">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white/80">{path.split('/').pop()}</h3>
            </div>
            <p className="text-[10px] text-white/20 mt-0.5 truncate max-w-[300px]">{path}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-sky-400 transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salva Conoscenza
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col p-4">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white/5" />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-red-400">
            <AlertCircle className="w-12 h-12 opacity-20" />
            <p className="text-xs font-black uppercase tracking-widest">{error}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-2 mb-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/60" />
              <p className="text-[9px] text-emerald-400/60 font-black uppercase tracking-widest">
                Editing sicuro: il salvataggio sincronizza automaticamente il database vettoriale dell&apos;IA.
              </p>
            </div>
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              className="flex-1 w-full bg-black/20 border border-white/[0.04] rounded-3xl p-8 text-[13px] font-mono leading-relaxed text-slate-300 focus:outline-none focus:border-sky-500/30 transition-all resize-none scrollbar-hide selection:bg-sky-500/20"
              placeholder="Inizia a scrivere la conoscenza del brand..."
            />
          </>
        )}
      </div>

      <div className="px-6 py-3 border-t border-white/[0.06] bg-white/[0.01] flex items-center gap-2">
        <Info className="w-3 h-3 text-white/10" />
        <p className="text-[9px] text-white/10 italic">Ogni modifica qui è definitiva e viene indicizzata come RAG Chunk.</p>
      </div>
    </div>
  )
}
