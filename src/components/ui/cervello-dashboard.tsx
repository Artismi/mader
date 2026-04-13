'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Brain, Database, Zap, Sparkles, History, Activity, FolderSearch, LayoutDashboard, Copy, Info, Search, Map, FileText, Settings, Shield, RefreshCw } from 'lucide-react'
import { VaultBrowser } from '@/components/ui/vault-browser'
import { ArchitectureEditor } from '@/components/ui/architecture-editor'
import { MemoryManager } from '@/components/ui/memory-manager'
import { SkillFoundry } from '@/components/ui/skill-foundry'
import { VaultEditor } from '@/components/ui/vault-editor'
import { BrainGraph } from '@/components/ui/brain-graph'
import { GlobalBrainSearch } from '@/components/ui/global-brain-search'
import { cn } from '@/lib/utils'

interface SnapshotData {
  snapshot: string
  ragCount: number
  memoryCount: number
  timestamp: string
}

type CervelloTab = 'nexus' | 'vault' | 'skills' | 'experience' | 'system'

export function CervelloDashboard() {
  const [data, setData] = useState<SnapshotData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<CervelloTab>('nexus')
  const [editingFilePath, setEditingFilePath] = useState<string | null>(null)

  const fetchContext = async () => {
    try {
      const res = await fetch('/api/ai/context')
      if (!res.ok) throw new Error('API request failed')
      const d = await res.json()
      setData(d)
    } catch (err) {
      console.error("Context fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const initVault = async () => {
    try {
      await fetch('/api/vault', { method: 'POST', body: JSON.stringify({}) })
    } catch (e) {
      console.error("Vault init error:", e)
    }
  }

  useEffect(() => {
    initVault()
    fetchContext()
    const interval = setInterval(fetchContext, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-violet-400 bg-[#08080a]">
      <div className="relative">
        <Brain className="w-12 h-12 animate-pulse" />
        <div className="absolute inset-0 blur-xl bg-violet-500/20 animate-pulse" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.4em]">Sincronizzando Neural Hub...</span>
    </div>
  )

  return (
    <div className="flex flex-col h-full gap-6 bg-[#08080a] p-6 overflow-hidden">
      
      {/* Header: Global Search & Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                    <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">Cervello Pro</h1>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/20">v2.0 Neural Control Center</p>
                </div>
            </div>
            <GlobalBrainSearch />
        </div>

        <div className="flex items-center gap-6">
            <StatPill icon={<Database className="w-3.5 h-3.5" />} label="Chunks" value={data?.ragCount || 0} color="text-sky-400" />
            <StatPill icon={<History className="w-3.5 h-3.5" />} label="Memorie" value={data?.memoryCount || 0} color="text-fuchsia-400" />
            <div className="h-8 w-px bg-white/5 mx-2" />
            <button 
                onClick={async () => {
                    setLoading(true)
                    await initVault()
                    await fetchContext()
                }}
                className="flex items-center gap-3 group"
            >
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2 group-hover:bg-emerald-500/20 transition-all">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Motore Attivo</span>
                    <RefreshCw className="w-3 h-3 text-emerald-500/40 group-hover:rotate-180 transition-transform duration-500" />
                </div>
            </button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* Navigation Sidebar */}
        <div className="w-20 bg-white/[0.02] border border-white/[0.06] rounded-[2.5rem] p-3 flex flex-col items-center gap-4">
            <NavTab active={activeTab === 'nexus'} onClick={() => setActiveTab('nexus')} icon={<Map />} label="MAPPA" />
            <NavTab active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} icon={<FolderSearch />} label="FONTE" />
            <NavTab active={activeTab === 'skills'} onClick={() => setActiveTab('skills')} icon={<Zap />} label="SKILL" />
            <NavTab active={activeTab === 'experience'} onClick={() => setActiveTab('experience')} icon={<Activity />} label="MEMORIA" />
            <div className="flex-1" />
            <NavTab active={activeTab === 'system'} onClick={() => setActiveTab('system')} icon={<Settings />} label="SISTEMA" />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 flex flex-col h-full">
            {activeTab === 'nexus' && <BrainGraph />}
            
            {activeTab === 'vault' && (
                <div className="flex h-full gap-6">
                    <div className={cn("flex-1 transition-all duration-500", editingFilePath ? "flex-[0.4]" : "flex-1")}>
                        <VaultBrowser onFileClick={(path) => setEditingFilePath(path)} />
                    </div>
                    {editingFilePath && (
                        <div className="flex-1 h-full min-w-0">
                            <VaultEditor path={editingFilePath} onClose={() => setEditingFilePath(null)} />
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'skills' && <SkillFoundry />}

            {activeTab === 'experience' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    <MemoryManager />
                    <div className="flex flex-col gap-6">
                        <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-[2rem] p-8 overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <Activity className="w-5 h-5 text-violet-400" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Live Context Snapshot</h3>
                                </div>
                                <button 
                                    onClick={() => navigator.clipboard.writeText(data?.snapshot || '')}
                                    className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white transition-all"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-400 bg-black/20 rounded-2xl p-6 border border-white/5 scrollbar-hide">
                                {data?.snapshot || 'Nessun snapshot attivo.'}
                            </div>
                        </div>
                        <div className="h-48 bg-violet-900/10 border border-violet-500/20 rounded-[2rem] p-6 flex items-center justify-center text-center">
                            <div className="space-y-2">
                                <Sparkles className="w-8 h-8 text-violet-400 mx-auto mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-violet-200/60">Brain Intelligence Optimised</p>
                                <p className="text-[8px] text-violet-300/40 font-bold uppercase tracking-widest">Neural weights and tiered associations consolidated.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'system' && <ArchitectureEditor />}
        </div>
      </div>
    </div>
  )
}

function StatPill({ icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
            <span className={cn("opacity-40", color)}>{icon}</span>
            <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/20 leading-none">{label}</span>
                <span className="text-[11px] font-black text-white/80 mt-1 leading-none">{value}</span>
            </div>
        </div>
    )
}

function NavTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative group",
                active ? "bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]" : "bg-transparent text-white/20 hover:text-white/40 hover:bg-white/5"
            )}
        >
            {icon}
            <div className={cn(
                "absolute left-full ml-4 px-3 py-1.5 bg-black border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-white transition-all opacity-0 pointer-events-none group-hover:opacity-100 z-[110]",
                "before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-8 before:border-transparent before:border-r-black"
            )}>
                {label}
            </div>
        </button>
    )
}
