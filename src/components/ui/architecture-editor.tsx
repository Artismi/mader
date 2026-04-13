'use client'

import { useState, useEffect } from 'react'
import { Save, RotateCcw, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ArchitectureEditor() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchArch = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/architecture')
      const data = await res.json()
      setContent(data.architecture || '')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArch()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/ai/architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architecture: content }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-400" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/60">System Architecture</h3>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => { if(confirm('Vuoi davvero ripristinare la configurazione predefinita?')) setContent('') }}
                className="p-1.5 hover:bg-white/5 rounded-lg text-white/20 hover:text-white/40 transition-all"
                title="Reset"
            >
                <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button 
                onClick={handleSave} 
                disabled={saving || loading}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    saved ? "bg-emerald-500/20 text-emerald-400" : "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
                )}
            >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                {saved ? 'Salvato' : 'Applica'}
            </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white/10" />
            </div>
        ) : (
            <textarea 
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full h-full bg-transparent p-6 text-[12px] font-mono leading-relaxed text-slate-300 focus:outline-none resize-none scrollbar-hide selection:bg-violet-500/30"
                placeholder="Caricamento architettura..."
            />
        )}
      </div>

      <div className="px-4 py-2 border-t border-white/[0.06] bg-amber-500/[0.02] flex items-center gap-2">
        <AlertTriangle className="w-3 h-3 text-amber-500/40" />
        <p className="text-[9px] text-amber-500/40 font-medium">Attenzione: le modifiche qui alterano il comportamento globale dell&apos;AI.</p>
      </div>
    </div>
  )
}
