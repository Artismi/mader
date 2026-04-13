'use client'

import { useState, useEffect, useRef } from 'react'
import { Brain, Database, History, RefreshCw, Cpu, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrainTree, type TreeNode } from '@/components/ui/brain-tree'
import { BrainContentEditor } from '@/components/ui/brain-content-editor'
import { BrainPreview } from '@/components/ui/brain-preview'
import { GlobalBrainSearch } from '@/components/ui/global-brain-search'

interface BrainData {
  architecture: { content: string }
  skills: { id: string; name: string; slug: string; active: boolean }[]
  memories: { semantic: unknown[]; episodic: unknown[]; vaultCount: number }
  contextInstructions: { id: string; file_path: string }[]
  vault: { configured: boolean; path: string | null }
  clients: { id: string; name: string; sector: string | null; vault_md_content: string }[]
  stats: { totalMemories: number; vaultChunks: number; activeSkills: number }
}

export function BrainEditor() {
  const [data, setData] = useState<BrainData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [selected, setSelected] = useState<TreeNode | null>(null)
  const [dirtyNodeId, setDirtyNodeId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [showDirtyGuard, setShowDirtyGuard] = useState(false)
  const pendingNodeRef = useRef<TreeNode | null>(null)

  const fetchBrainState = async () => {
    try {
      const res = await fetch('/api/ai/brain')
      if (!res.ok) throw new Error('API failed')
      const d = await res.json()
      setData(d)
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  // Init vault watcher + fetch state
  useEffect(() => {
    fetch('/api/vault', { method: 'POST', body: JSON.stringify({}) }).catch(() => {})
    fetchBrainState()
  }, [])

  const handleSelect = (node: TreeNode) => {
    if (dirtyNodeId && dirtyNodeId !== node.id) {
      pendingNodeRef.current = node
      setShowDirtyGuard(true)
      return
    }
    setSelected(node)
  }

  const confirmDiscard = () => {
    setDirtyNodeId(null)
    setShowDirtyGuard(false)
    if (pendingNodeRef.current) {
      setSelected(pendingNodeRef.current)
      pendingNodeRef.current = null
    }
  }

  const cancelDiscard = () => {
    setShowDirtyGuard(false)
    pendingNodeRef.current = null
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-violet-400 bg-[#08080a]">
        <div className="relative">
          <Brain className="w-12 h-12 animate-pulse" />
          <div className="absolute inset-0 blur-xl bg-violet-500/20 animate-pulse" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em]">Caricamento Brain OS...</span>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-red-400 bg-[#08080a]">
        <AlertCircle className="w-10 h-10 opacity-40" />
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Errore caricamento Brain</p>
        <button
          onClick={() => { setLoading(true); setLoadError(false); fetchBrainState() }}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 inline mr-2" />Riprova
        </button>
      </div>
    )
  }

  const totalMem = (data?.memories.semantic.length ?? 0) + (data?.memories.episodic.length ?? 0)

  return (
    <div className="flex flex-col h-full bg-[#08080a] overflow-hidden">

      {/* ── HEADER ── */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.01] flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/80">Brain OS</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">motore attivo</span>
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-white/[0.06]" />

        {/* Stats */}
        <div className="flex items-center gap-3">
          <StatChip icon={<History className="w-3 h-3" />} value={totalMem} label="mem" color="text-fuchsia-400" />
          <StatChip icon={<Database className="w-3 h-3" />} value={data?.stats.vaultChunks ?? 0} label="chunk" color="text-sky-400" />
          <StatChip icon={<Loader2 className="w-3 h-3" />} value={data?.stats.activeSkills ?? 0} label="skill" color="text-emerald-400" />
        </div>

        <div className="flex-1" />

        {/* Search */}
        <GlobalBrainSearch />

        <div className="h-8 w-px bg-white/[0.06]" />

        {/* Preview toggle */}
        <button
          onClick={() => setPreviewOpen(p => !p)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
            previewOpen
              ? "bg-violet-500/20 border-violet-500/30 text-violet-400"
              : "bg-white/[0.03] border-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.05]"
          )}
        >
          <Cpu className="w-3 h-3" />
          Preview
        </button>

        {/* Refresh */}
        <button
          onClick={() => fetchBrainState()}
          className="p-1.5 hover:bg-white/5 rounded-lg text-white/20 hover:text-white/60 transition-all"
          title="Ricarica stato Brain"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── DIRTY GUARD OVERLAY ── */}
      {showDirtyGuard && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111115] border border-white/10 rounded-2xl p-6 w-80 space-y-4 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-widest text-white/70">Modifiche non salvate</p>
            <p className="text-[11px] text-white/40">Hai modifiche in corso. Vuoi scartarle e continuare?</p>
            <div className="flex gap-3">
              <button
                onClick={confirmDiscard}
                className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
              >
                Scarta
              </button>
              <button
                onClick={cancelDiscard}
                className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Continua a modificare
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BODY ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* Tree nav */}
        <div className="w-56 shrink-0 border-r border-white/[0.06] bg-white/[0.005] overflow-hidden">
          <BrainTree
            data={data}
            selected={selected}
            dirtyNodeId={dirtyNodeId}
            onSelect={handleSelect}
          />
        </div>

        {/* Content editor */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <BrainContentEditor
            node={selected}
            onDirtyChange={setDirtyNodeId}
            onSaved={fetchBrainState}
          />
        </div>

        {/* Preview panel */}
        {previewOpen && (
          <BrainPreview onClose={() => setPreviewOpen(false)} />
        )}
      </div>
    </div>
  )
}

// ─── STAT CHIP ─────────────────────────────────────────────────────────────────

function StatChip({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.025] border border-white/[0.05] rounded-xl">
      <span className={cn("opacity-50", color)}>{icon}</span>
      <span className="text-[10px] font-black tabular-nums text-white/60">{value}</span>
      <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">{label}</span>
    </div>
  )
}
