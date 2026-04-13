'use client'

import { useState, useEffect } from 'react'
import { Trash2, Brain, History, Loader2, Search, X, MessageSquare, User, Briefcase, Plus, Sparkles, Edit3, Link2, ExternalLink, Save, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Memory {
  id: string
  content: string
  context_type: 'general' | 'cliente' | 'progetto' | 'preferenza'
  context_id?: string
  tier: 'semantic' | 'episodic' | 'vault'
  importance: number
  created_at: string
  url?: string // Extended field
}

interface MemoryLink {
    id: string
    target_id: string
    target_type: string
    relation: string
    content?: string // Joined content for display
}

export function MemoryManager() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Memory>>({})
  const [saving, setSaving] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const fetchMemories = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/memories')
      const data = await res.json()
      setMemories(data.memories || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMemories()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Vuoi davvero dimenticare questo fatto?')) return
    setDeleting(id)
    try {
      const res = await fetch('/api/ai/memories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setMemories(prev => prev.filter(m => m.id !== id))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(null)
    }
  }

  const handleUpdate = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/ai/memories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm }),
      })
      if (res.ok) {
        setMemories(prev => prev.map(m => m.id === id ? { ...m, ...editForm } as Memory : m))
        setEditingId(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!editForm.content) return
    setSaving(true)
    try {
      const res = await fetch('/api/ai/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        fetchMemories()
        setIsAdding(false)
        setEditForm({})
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const filteredMemories = memories.filter(m => 
    m.content.toLowerCase().includes(search.toLowerCase()) || 
    (m.context_type || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.tier || '').toLowerCase().includes(search.toLowerCase())
  )

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cliente': return <User className="w-3 h-3" />
      case 'progetto': return <Briefcase className="w-3 h-3" />
      case 'preferenza': return <Sparkles className="w-3 h-3" />
      default: return <History className="w-3 h-3" />
    }
  }

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Brain className="w-4 h-4 text-fuchsia-400" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">Memory Explorer</h3>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-1.5 focus-within:border-white/20 transition-all">
                <Search className="w-3.5 h-3.5 text-white/20" />
                <input 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cerca nella mente..."
                    className="bg-transparent border-none focus:ring-0 text-[11px] text-white/60 placeholder:text-white/10 w-32 sm:w-48"
                />
            </div>
            <button 
                onClick={() => { setIsAdding(true); setEditForm({ tier: 'semantic', importance: 0.5, context_type: 'general' }) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
            >
                <Plus className="w-3.5 h-3.5" /> Aggiungi Fatto
            </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide bg-black/10">
        
        {isAdding && (
            <div className="p-5 rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/[0.02] space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400">Nuova Memoria Semantica</span>
                    <button onClick={() => setIsAdding(false)}><X className="w-4 h-4 text-white/20 hover:text-white" /></button>
                </div>
                <textarea 
                    value={editForm.content || ''}
                    onChange={e => setEditForm({...editForm, content: e.target.value})}
                    placeholder="Descrivi il fatto o la regola da memorizzare..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-fuchsia-500/30 transition-all resize-none"
                    rows={3}
                />
                <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-1">Importanza ({Math.round((editForm.importance || 0.5) * 100)}%)</label>
                        <input 
                            type="range" min="0" max="1" step="0.1" 
                            value={editForm.importance || 0.5} 
                            onChange={e => setEditForm({...editForm, importance: parseFloat(e.target.value)})}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                        />
                    </div>
                    <button 
                        onClick={handleCreate}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-xl bg-fuchsia-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-fuchsia-400 transition-all shadow-[0_0_15px_rgba(217,70,239,0.3)]"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Memorizza'}
                    </button>
                </div>
            </div>
        )}

        {loading ? (
            <div className="flex items-center justify-center h-full py-20">
                <Loader2 className="w-6 h-6 animate-spin text-white/10" />
            </div>
        ) : filteredMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-white/10 gap-4">
                <div className="w-16 h-16 rounded-3xl bg-white/[0.02] flex items-center justify-center border border-white/[0.05]">
                    <MessageSquare className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em]">Tabula Rasa</p>
            </div>
        ) : (
            filteredMemories.map(m => (
                <div key={m.id} className={cn(
                    "group p-4 rounded-3xl border transition-all relative overflow-hidden",
                    editingId === m.id ? "bg-white/[0.05] border-white/20 shadow-2xl" : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10"
                )}>
                    {/* Tier Indicator Strip */}
                    <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1",
                        m.tier === 'semantic' ? "bg-fuchsia-500" : "bg-blue-500"
                    )} />

                    {editingId === m.id ? (
                        <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-widest text-violet-400">Editing Memoria</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setEditingId(null)} className="p-1 px-3 rounded-lg bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">Annulla</button>
                                    <button onClick={() => handleUpdate(m.id)} className="p-1 px-4 rounded-lg bg-violet-500 text-[9px] font-black uppercase tracking-widest text-white shadow-lg">Salva</button>
                                </div>
                             </div>
                             <textarea 
                                value={editForm.content || ''}
                                onChange={e => setEditForm({...editForm, content: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none"
                                rows={4}
                             />
                             <div className="flex items-center gap-6">
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-white/20">Peso Semantico ({Math.round((editForm.importance || 0) * 100)}%)</label>
                                    <input type="range" min="0" max="1" step="0.1" value={editForm.importance || 0} onChange={e => setEditForm({...editForm, importance: parseFloat(e.target.value)})} className="w-full h-1 bg-white/10 rounded-full appearance-none accent-violet-400" />
                                </div>
                                <div className="w-48 space-y-1.5 text-right">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-white/20">Link Esterno</label>
                                    <div className="flex items-center bg-black/40 rounded-xl px-2 py-1.5 border border-white/5">
                                        <Globe className="w-3 h-3 text-white/20 mr-2" />
                                        <input 
                                            value={editForm.url || ''} 
                                            onChange={e => setEditForm({...editForm, url: e.target.value})}
                                            placeholder="https://..."
                                            className="bg-transparent border-none focus:ring-0 text-[10px] text-white/60 p-0 w-full"
                                        />
                                    </div>
                                </div>
                             </div>
                        </div>
                    ) : (
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-1.5 rounded-xl bg-white/5 text-white/40 group-hover:bg-white/10 transition-all",
                                        m.context_type === 'cliente' && "text-blue-400 bg-blue-400/5",
                                        m.context_type === 'preferenza' && "text-yellow-400 bg-yellow-400/5"
                                    )}>
                                        {getTypeIcon(m.context_type)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-widest",
                                            m.tier === 'semantic' ? "text-fuchsia-400/80" : "text-blue-400/80"
                                        )}>
                                            {m.tier} • {m.context_type}
                                        </span>
                                        <span className="text-[8px] text-white/10 font-mono mt-0.5">
                                            {new Date(m.created_at).toLocaleDateString('it-IT')}
                                        </span>
                                    </div>
                                    <div className="flex-1" />
                                    <div className="flex items-center gap-2 group/imp">
                                        <div className="w-20 h-1 rounded-full bg-white/5 overflow-hidden">
                                            <div 
                                                className={cn("h-full transition-all duration-1000", m.tier === 'semantic' ? "bg-fuchsia-500" : "bg-blue-500")} 
                                                style={{ width: `${(m.importance || 0.5) * 100}%` }} 
                                            />
                                        </div>
                                        <span className="text-[8px] text-white/20 font-black font-mono w-6">
                                            {Math.round((m.importance || 0.5) * 100)}%
                                        </span>
                                    </div>
                                </div>
                                <p className="text-[12px] text-slate-300 leading-relaxed font-medium pl-1 selection:bg-fuchsia-500/20">
                                    {m.content}
                                </p>
                                
                                {m.url && (
                                    <a 
                                        href={m.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/5 border border-sky-500/10 text-sky-400 text-[10px] font-bold hover:bg-sky-500/10 transition-all"
                                    >
                                        <Globe className="w-3 h-3" />
                                        Sorgente Esterna
                                        <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                                    </a>
                                )}
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                <button 
                                    onClick={() => { setEditingId(m.id); setEditForm(m); }}
                                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-white/5 text-white/20 hover:text-white transition-all rounded-xl"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(m.id)}
                                    disabled={deleting === m.id}
                                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-red-500/30 hover:text-red-500 transition-all rounded-xl"
                                >
                                    {deleting === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))
        )}
      </div>

      <div className="px-6 py-4 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Legend color="bg-fuchsia-500" label="Semantic" />
            <Legend color="bg-blue-500" label="Episodic" />
        </div>
        <p className="text-[9px] text-white/10 font-bold uppercase tracking-widest italic">
            Cognitive Precision: {filteredMemories.length} FACTS ACTIVE
        </p>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string, label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", color)} />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">{label}</span>
        </div>
    )
}
