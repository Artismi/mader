'use client'

import { useState } from 'react'
import { ChevronRight, Zap, History, FileText, FolderOpen, GitBranch, Settings2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TreeNode {
  id: string
  type: 'architecture' | 'skill' | 'memory-group' | 'context-instruction' | 'vault-root' | 'nexus' | 'client-vault'
  label: string
  meta?: Record<string, unknown>
}

interface BrainTreeData {
  architecture: { content: string }
  skills: { id: string; name: string; slug: string; active: boolean }[]
  memories: { semantic: unknown[]; episodic: unknown[]; vaultCount: number }
  contextInstructions: { id: string; file_path: string }[]
  vault: { configured: boolean; path: string | null }
  clients: { id: string; name: string; sector: string | null; vault_md_content: string }[]
  stats: { totalMemories: number; vaultChunks: number; activeSkills: number }
}

interface BrainTreeProps {
  data: BrainTreeData | null
  selected: TreeNode | null
  dirtyNodeId: string | null
  onSelect: (node: TreeNode) => void
}

export function BrainTree({ data, selected, dirtyNodeId, onSelect }: BrainTreeProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    skills: false,
    memories: false,
    context: false,
    vault: true,
    clients: false,
  })

  const toggle = (key: string) => setCollapsed(p => ({ ...p, [key]: !p[key] }))
  const isSelected = (id: string) => selected?.id === id
  const isDirty = (id: string) => dirtyNodeId === id

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide py-3 gap-0.5">

      {/* ── ARCHITETTURA ── */}
      <Leaf
        icon={<Settings2 className="w-3.5 h-3.5" />}
        label="Architettura"
        color="text-violet-400"
        selected={isSelected('arch')}
        dirty={isDirty('arch')}
        onClick={() => onSelect({ id: 'arch', type: 'architecture', label: 'Architettura' })}
      />

      {/* ── SKILLS ── */}
      <SectionHeader
        icon={<Zap className="w-3.5 h-3.5" />}
        label="Skills"
        color="text-violet-300"
        count={data?.skills.length ?? 0}
        collapsed={collapsed.skills}
        onToggle={() => toggle('skills')}
      />
      {!collapsed.skills && data?.skills.map(skill => (
        <Leaf
          key={skill.id}
          indent
          icon={
            <div className={cn(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              skill.active
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                : "bg-white/15"
            )} />
          }
          label={skill.name}
          sublabel={skill.slug}
          color={skill.active ? "text-white/80" : "text-white/30"}
          selected={isSelected(skill.id)}
          dirty={isDirty(skill.id)}
          onClick={() => onSelect({ id: skill.id, type: 'skill', label: skill.name, meta: { skill } })}
        />
      ))}

      <div className="h-px bg-white/[0.04] my-1 mx-3" />

      {/* ── MEMORIE ── */}
      <SectionHeader
        icon={<History className="w-3.5 h-3.5" />}
        label="Memorie"
        color="text-fuchsia-300"
        count={(data?.memories.semantic.length ?? 0) + (data?.memories.episodic.length ?? 0)}
        collapsed={collapsed.memories}
        onToggle={() => toggle('memories')}
      />
      {!collapsed.memories && (
        <>
          <Leaf
            indent
            icon={<div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 flex-shrink-0" />}
            label="Semantica"
            sublabel={`${data?.memories.semantic.length ?? 0} fatti`}
            color="text-fuchsia-300/70"
            selected={isSelected('mem-semantic')}
            dirty={isDirty('mem-semantic')}
            onClick={() => onSelect({ id: 'mem-semantic', type: 'memory-group', label: 'Memorie Semantiche', meta: { tier: 'semantic' } })}
          />
          <Leaf
            indent
            icon={<div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
            label="Episodica"
            sublabel={`${data?.memories.episodic.length ?? 0} ricordi`}
            color="text-blue-300/70"
            selected={isSelected('mem-episodic')}
            dirty={isDirty('mem-episodic')}
            onClick={() => onSelect({ id: 'mem-episodic', type: 'memory-group', label: 'Memorie Episodiche', meta: { tier: 'episodic' } })}
          />
          {(data?.memories.vaultCount ?? 0) > 0 && (
            <Leaf
              indent
              icon={<div className="w-1.5 h-1.5 rounded-full bg-sky-400/50 flex-shrink-0" />}
              label="Vault RAG"
              sublabel={`${data?.memories.vaultCount} chunk`}
              color="text-sky-300/50"
              selected={false}
              dirty={false}
              onClick={() => onSelect({ id: 'vault', type: 'vault-root', label: 'Vault' })}
            />
          )}
        </>
      )}

      <div className="h-px bg-white/[0.04] my-1 mx-3" />

      {/* ── CONTEXT INSTRUCTIONS ── */}
      <SectionHeader
        icon={<FileText className="w-3.5 h-3.5" />}
        label="Context"
        color="text-sky-300"
        count={data?.contextInstructions.length ?? 0}
        collapsed={collapsed.context}
        onToggle={() => toggle('context')}
      />
      {!collapsed.context && (
        <>
          {(data?.contextInstructions ?? []).length === 0 ? (
            <div className="px-5 py-1.5 text-[9px] font-bold text-white/15 uppercase tracking-widest italic">
              Nessun file attivato
            </div>
          ) : data?.contextInstructions.map(ci => (
            <Leaf
              key={ci.id}
              indent
              icon={<FileText className="w-3 h-3 flex-shrink-0 opacity-40" />}
              label={ci.file_path.split(/[\\/]/).pop() ?? ci.file_path}
              sublabel={ci.file_path}
              color="text-sky-300/70"
              selected={isSelected(ci.id)}
              dirty={isDirty(ci.id)}
              onClick={() => onSelect({ id: ci.id, type: 'context-instruction', label: ci.file_path, meta: { ci } })}
            />
          ))}
          {/* Add new */}
          <button
            onClick={() => onSelect({ id: 'ci-new', type: 'context-instruction', label: 'Nuovo file', meta: { isNew: true } })}
            className="mx-3 mt-1 mb-0.5 px-3 py-1.5 rounded-xl border border-dashed border-white/10 text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-sky-400 hover:border-sky-500/30 transition-all text-left"
          >
            + Aggiungi file
          </button>
        </>
      )}

      <div className="h-px bg-white/[0.04] my-1 mx-3" />

      {/* ── CLIENTI ── */}
      <SectionHeader
        icon={<Users className="w-3.5 h-3.5" />}
        label="Clienti"
        color="text-amber-300"
        count={data?.clients.length ?? 0}
        collapsed={collapsed.clients}
        onToggle={() => toggle('clients')}
      />
      {!collapsed.clients && (
        <>
          {(data?.clients ?? []).length === 0 ? (
            <div className="px-5 py-1.5 text-[9px] font-bold text-white/15 uppercase tracking-widest italic">
              Nessun cliente
            </div>
          ) : data?.clients.map(client => (
            <Leaf
              key={client.id}
              indent
              icon={
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  client.vault_md_content
                    ? "bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]"
                    : "bg-white/15"
                )} />
              }
              label={client.name}
              sublabel={client.vault_md_content
                ? `${client.vault_md_content.length} char`
                : client.sector ?? 'vault vuoto'
              }
              color={client.vault_md_content ? "text-amber-200/80" : "text-white/30"}
              selected={isSelected(client.id)}
              dirty={isDirty(client.id)}
              onClick={() => onSelect({
                id: client.id,
                type: 'client-vault',
                label: client.name,
                meta: { client },
              })}
            />
          ))}
        </>
      )}

      <div className="h-px bg-white/[0.04] my-1 mx-3" />

      {/* ── VAULT ── */}
      <SectionHeader
        icon={<FolderOpen className="w-3.5 h-3.5" />}
        label="Vault"
        color="text-sky-300"
        count={data?.vault.configured ? undefined : undefined}
        badge={data?.vault.configured ? undefined : 'non configurato'}
        collapsed={collapsed.vault}
        onToggle={() => toggle('vault')}
      />
      {!collapsed.vault && (
        <Leaf
          indent
          icon={<FolderOpen className="w-3 h-3 flex-shrink-0 opacity-40" />}
          label="Obsidian Vault"
          sublabel={data?.vault.path ?? 'percorso non configurato'}
          color="text-sky-300/70"
          selected={isSelected('vault')}
          dirty={false}
          onClick={() => onSelect({ id: 'vault', type: 'vault-root', label: 'Vault' })}
        />
      )}

      <div className="h-px bg-white/[0.04] my-1 mx-3" />

      {/* ── NEXUS ── */}
      <Leaf
        icon={<GitBranch className="w-3.5 h-3.5" />}
        label="Nexus"
        sublabel="grafo connessioni"
        color="text-violet-300/60"
        selected={isSelected('nexus')}
        dirty={false}
        onClick={() => onSelect({ id: 'nexus', type: 'nexus', label: 'Nexus' })}
      />
    </div>
  )
}

// ─── SECTION HEADER ────────────────────────────────────────────────────────────

function SectionHeader({
  icon, label, color, count, badge, collapsed, onToggle,
}: {
  icon: React.ReactNode
  label: string
  color: string
  count?: number
  badge?: string
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.03] rounded-xl transition-all group text-left"
    >
      <ChevronRight className={cn(
        "w-3 h-3 text-white/20 transition-transform duration-200",
        !collapsed && "rotate-90"
      )} />
      <span className={cn("opacity-60 group-hover:opacity-100 transition-opacity", color)}>{icon}</span>
      <span className={cn("text-[10px] font-black uppercase tracking-[0.15em] flex-1", color)}>{label}</span>
      {count !== undefined && (
        <span className="text-[9px] font-bold text-white/15 tabular-nums">{count}</span>
      )}
      {badge && (
        <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/40">{badge}</span>
      )}
    </button>
  )
}

// ─── LEAF ──────────────────────────────────────────────────────────────────────

function Leaf({
  icon, label, sublabel, color, selected, dirty, indent, onClick,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  color: string
  selected: boolean
  dirty: boolean
  indent?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 py-1.5 rounded-xl transition-all text-left group",
        indent ? "pl-8 pr-3" : "px-3",
        selected
          ? "bg-white/[0.07] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]"
          : "hover:bg-white/[0.04]"
      )}
    >
      <span className={cn("flex-shrink-0", color, selected ? "opacity-80" : "opacity-40 group-hover:opacity-60 transition-opacity")}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn(
            "text-[11px] font-semibold truncate",
            selected ? "text-white/90" : color,
          )}>
            {label}
          </span>
          {dirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
          )}
        </div>
        {sublabel && (
          <p className="text-[8px] text-white/15 font-mono truncate leading-tight mt-0.5">{sublabel}</p>
        )}
      </div>
    </button>
  )
}
