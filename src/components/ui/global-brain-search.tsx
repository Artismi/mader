'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Brain, Zap, FileText, User, Briefcase, Command, X, Loader2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResult {
    id: string
    content: string
    context_type: string
    tier: string
    importance: number
    category: 'memory' | 'skill' | 'project' | 'client'
}

export function GlobalBrainSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (!query) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/ai/brain/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const getIcon = (category: string) => {
    switch (category) {
      case 'skill': return <Zap className="w-3.5 h-3.5 text-yellow-400" />
      case 'project': return <Briefcase className="w-3.5 h-3.5 text-amber-500" />
      case 'client': return <User className="w-3.5 h-3.5 text-blue-500" />
      default: return <Brain className="w-3.5 h-3.5 text-fuchsia-400" />
    }
  }

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="flex items-center gap-4 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-white/20 hover:text-white/40 hover:bg-white/10 transition-all group lg:w-96"
    >
      <Search className="w-4 h-4" />
      <span className="text-[11px] font-black uppercase tracking-widest flex-1 text-left">Cerca nel Cervello...</span>
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10">
        <Command className="w-3 h-3" />
        <span className="text-[10px] font-bold">K</span>
      </div>
    </button>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 backdrop-blur-3xl bg-black/60 animate-in fade-in duration-300">
      <div 
        className="w-full max-w-2xl bg-[#0c0c0e] rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in slide-in-from-top-4 duration-500"
        onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
      >
        <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-white/[0.02]">
            <Search className="w-5 h-5 text-white/40" />
            <input 
                ref={inputRef}
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Cosa vuoi cercare nella memoria dell'IA?"
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg text-white font-medium placeholder:text-white/5"
            />
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-white/20" /> : <button onClick={() => setIsOpen(false)}><X className="w-5 h-5 text-white/10 hover:text-white" /></button>}
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-4 space-y-2 scrollbar-hide">
            {results.length > 0 ? (
                results.map((res) => (
                    <button 
                        key={res.id}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all text-left group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.05] group-hover:border-white/10">
                            {getIcon(res.category)}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{res.category}</span>
                                {res.importance > 0.8 && <div className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-tighter">Pillar</div>}
                            </div>
                            <p className="text-sm font-medium text-slate-300 mt-0.5 line-clamp-1">{res.content}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/5 group-hover:text-white/40 group-hover:translate-x-1 transition-all" />
                    </button>
                ))
            ) : query ? (
                <div className="py-20 text-center space-y-2">
                    <p className="text-sm font-bold text-white/20 uppercase tracking-widest">Nessun match neuronale</p>
                    <p className="text-[10px] text-white/10 italic">Prova a cercare termini più generici o controlla il vault.</p>
                </div>
            ) : (
                <div className="py-20 text-center space-y-2 opacity-20">
                    <Command className="w-8 h-8 mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Inizia a digitare per cercare nel cervello</p>
                </div>
            )}
        </div>

        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 opacity-40">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono font-bold text-white">ESC</kbd>
                    <span className="text-[10px] text-white font-bold uppercase">Chiudi</span>
                </div>
                <div className="flex items-center gap-1.5 opacity-40">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono font-bold text-white">↵</kbd>
                    <span className="text-[10px] text-white font-bold uppercase">Apri</span>
                </div>
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/10">Global Brain Index Pro 2.0</p>
        </div>
      </div>
    </div>
  )
}
