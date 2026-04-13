'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Zap, Loader2, Search, Edit3, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Skill {
  id: string
  name: string
  slug: string
  description: string
  content: string
  triggers: string[]
  active: boolean
  sort_order: number
}

export function SkillFoundry() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const fetchSkills = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/brain')
      if (res.ok) {
        const data = await res.json()
        setSkills(data.skills || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSkills()
  }, [])

  const handleSave = async (skill: Skill) => {
    setSaving(true)
    try {
      const res = await fetch('/api/ai/brain', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'skill', data: skill }),
      })
      if (res.ok) {
        setSkills(prev => prev.map(s => s.id === skill.id ? skill : s))
        setEditingSkill(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const filtered = skills.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/80">Skill Foundry</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-white/20" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filtra handbook..."
              className="bg-transparent border-none focus:ring-0 text-[11px] text-white/60 placeholder:text-white/10 w-48"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-widest hover:bg-violet-500/20 transition-all">
            <Plus className="w-3.5 h-3.5" /> Nuova Skill
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* List Sidebar */}
        <div className="w-80 border-r border-white/[0.06] overflow-y-auto p-4 space-y-2 scrollbar-hide bg-white/[0.01]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-white/10" />
            </div>
          ) : filtered.map(skill => (
            <button
              key={skill.id}
              onClick={() => setEditingSkill(skill)}
              className={cn(
                "w-full text-left p-4 rounded-2xl border transition-all group",
                editingSkill?.id === skill.id 
                  ? "bg-white/10 border-white/10 shadow-xl" 
                  : "bg-white/[0.02] border-white/[0.04] hover:border-white/10 hover:bg-white/[0.04]"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      skill.active ? "text-white/90" : "text-white/20"
                    )}>{skill.name}</span>
                    {skill.active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                  </div>
                  <p className="text-[9px] text-white/30 font-mono italic truncate w-48">{skill.slug}</p>
                </div>
                <Edit3 className={cn("w-3.5 h-3.5 transition-all", editingSkill?.id === skill.id ? "text-violet-400" : "text-white/10 group-hover:text-white/40")} />
              </div>
            </button>
          ))}
        </div>

        {/* Editor Area */}
        <div className="flex-1 bg-black/40 relative flex flex-col overflow-hidden">
          {editingSkill ? (
            <>
              <div className="px-8 py-6 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-white">{editingSkill.name}</h4>
                  <p className="text-[10px] text-white/30 mt-1 uppercase tracking-widest font-bold">Identificativo: {editingSkill.slug}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                     <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Active</span>
                     <button 
                        onClick={() => setEditingSkill({...editingSkill, active: !editingSkill.active})}
                        className={cn(
                           "w-8 h-4 rounded-full transition-all relative",
                           editingSkill.active ? "bg-emerald-500/40" : "bg-white/10"
                        )}
                     >
                        <div className={cn(
                           "absolute top-0.5 w-3 h-3 rounded-full transition-all",
                           editingSkill.active ? "right-0.5 bg-emerald-400" : "left-0.5 bg-white/20"
                        )} />
                     </button>
                  </div>
                  <button 
                    onClick={() => handleSave(editingSkill)}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-violet-400 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Pubblica Modifiche
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Descrizione Funzionale</label>
                  <textarea 
                    value={editingSkill.description}
                    onChange={e => setEditingSkill({...editingSkill, description: e.target.value})}
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-slate-300 focus:outline-none focus:border-violet-500/50 transition-all resize-none"
                    placeholder="A cosa serve questa skill?"
                  />
                </div>

                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Handbook (System Instructions)</label>
                    <span className="text-[9px] text-white/20 font-mono">MD SUPPORTED</span>
                  </div>
                  <textarea 
                    value={editingSkill.content}
                    onChange={e => setEditingSkill({...editingSkill, content: e.target.value})}
                    className="flex-1 min-h-[400px] w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-[13px] font-mono leading-relaxed text-slate-400 focus:outline-none focus:border-violet-500/50 transition-all scrollbar-hide"
                    placeholder="Inserisci qui le istruzioni dettagliate per l'IA..."
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10">
                <Zap className="w-8 h-8 text-white/10" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-white/40">Seleziona una Skill</h4>
                <p className="text-[10px] text-white/10 mt-1 max-w-[200px] leading-relaxed italic">Modifica le istruzioni operative per affinare il comportamento dell&apos;IA.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
