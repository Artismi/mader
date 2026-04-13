'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Save, X, Loader2, AlertTriangle, Info, Trash2, Brain, FolderOpen, GitBranch, Zap, Settings2, FileText, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VaultBrowser } from '@/components/ui/vault-browser'
import { VaultEditor } from '@/components/ui/vault-editor'
import { MemoryManager } from '@/components/ui/memory-manager'
import { BrainGraph } from '@/components/ui/brain-graph'
import type { TreeNode } from '@/components/ui/brain-tree'

interface BrainContentEditorProps {
  node: TreeNode | null
  onDirtyChange: (nodeId: string | null) => void
  onSaved: () => void
}

export function BrainContentEditor({ node, onDirtyChange, onSaved }: BrainContentEditorProps) {
  const [content, setContent] = useState('')
  const [skillData, setSkillData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [vaultEditPath, setVaultEditPath] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const initialRef = useRef('')

  // Load content when node changes
  useEffect(() => {
    if (!node) return
    setLastSaved(null)
    setDeleteConfirm(false)
    setVaultEditPath(null)

    if (node.type === 'architecture') {
      setLoading(true)
      fetch('/api/ai/architecture')
        .then(r => r.json())
        .then(d => {
          const v = d.architecture || ''
          setContent(v)
          initialRef.current = v
          onDirtyChange(null)
        })
        .finally(() => setLoading(false))
    } else if (node.type === 'skill') {
      const skill = node.meta?.skill as Record<string, unknown> | undefined
      if (skill) {
        setSkillData({ ...skill })
        initialRef.current = JSON.stringify(skill)
        onDirtyChange(null)
      }
    } else if (node.type === 'client-vault') {
      const client = node.meta?.client as { vault_md_content?: string } | undefined
      const v = client?.vault_md_content ?? ''
      setContent(v)
      initialRef.current = v
      onDirtyChange(null)
    } else if (node.type === 'context-instruction') {
      const ci = node.meta?.ci as { instructions?: string; file_path?: string } | undefined
      const isNew = node.meta?.isNew as boolean | undefined
      if (isNew) {
        setContent('')
        setSkillData({ file_path: '', instructions: '' })
        initialRef.current = ''
      } else if (ci) {
        setContent(ci.instructions ?? '')
        setSkillData({ file_path: ci.file_path ?? '', instructions: ci.instructions ?? '' })
        initialRef.current = ci.instructions ?? ''
        onDirtyChange(null)
      }
    }
  }, [node?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dirty tracking
  useEffect(() => {
    if (!node) return
    if (node.type === 'architecture' || node.type === 'context-instruction') {
      if (content !== initialRef.current) onDirtyChange(node.id)
      else onDirtyChange(null)
    } else if (node.type === 'skill' && skillData) {
      if (JSON.stringify(skillData) !== initialRef.current) onDirtyChange(node.id)
      else onDirtyChange(null)
    }
  }, [content, skillData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl+S
  const handleSave = useCallback(async () => {
    if (!node || saving) return
    setSaving(true)
    try {
      let res: Response
      if (node.type === 'architecture') {
        res = await fetch('/api/ai/brain', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'architecture', content }),
        })
      } else if (node.type === 'skill' && skillData) {
        res = await fetch('/api/ai/brain', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'skill', data: skillData }),
        })
      } else if (node.type === 'client-vault') {
        res = await fetch('/api/ai/brain', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'client_vault', id: node.id, vault_md_content: content }),
        })
      } else if (node.type === 'context-instruction' && skillData) {
        res = await fetch('/api/ai/brain', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'context_instruction',
            file_path: (skillData as { file_path?: string }).file_path,
            instructions: (skillData as { instructions?: string }).instructions ?? content,
          }),
        })
      } else {
        return
      }
      if (res!.ok) {
        const now = new Date()
        setLastSaved(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
        initialRef.current = node.type === 'skill' ? JSON.stringify(skillData) : content
        onDirtyChange(null)
        onSaved()
      }
    } finally {
      setSaving(false)
    }
  }, [node, content, skillData, saving, onDirtyChange, onSaved])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  const handleDelete = async () => {
    if (!node || !deleteConfirm) return
    const type = node.type === 'context-instruction' ? 'context_instruction' : 'memory'
    await fetch('/api/ai/brain', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id: node.id }),
    })
    onSaved()
  }

  // ── Empty state ──
  if (!node) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
          <Brain className="w-8 h-8 text-white/10" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-white/20">Seleziona un elemento</p>
          <p className="text-[10px] text-white/10 mt-1 italic">dal pannello di navigazione</p>
        </div>
      </div>
    )
  }

  // ── Breadcrumb + header ──
  const isDirty = !saving && content !== initialRef.current ||
    (node.type === 'skill' && JSON.stringify(skillData) !== initialRef.current)

  const NodeIcon = {
    architecture: Settings2,
    skill: Zap,
    'memory-group': Brain,
    'context-instruction': FileText,
    'vault-root': FolderOpen,
    nexus: GitBranch,
    'client-vault': Users,
  }[node.type] ?? Brain

  // ── Special views ──
  if (node.type === 'memory-group') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <EditorHeader node={node} Icon={NodeIcon} dirty={false} lastSaved={null} saving={false} onSave={null} onDiscard={null} />
        <div className="flex-1 overflow-hidden p-4">
          <MemoryManager />
        </div>
      </div>
    )
  }

  if (node.type === 'nexus') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <EditorHeader node={node} Icon={NodeIcon} dirty={false} lastSaved={null} saving={false} onSave={null} onDiscard={null} />
        <div className="flex-1 overflow-hidden">
          <BrainGraph />
        </div>
      </div>
    )
  }

  if (node.type === 'vault-root') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <EditorHeader node={node} Icon={NodeIcon} dirty={false} lastSaved={null} saving={false} onSave={null} onDiscard={null} />
        <div className="flex flex-1 gap-0 overflow-hidden">
          <div className={cn("transition-all duration-300 overflow-hidden", vaultEditPath ? "flex-[0.45]" : "flex-1")}>
            <VaultBrowser onFileClick={p => setVaultEditPath(p)} />
          </div>
          {vaultEditPath && (
            <div className="flex-1 overflow-hidden">
              <VaultEditor path={vaultEditPath} onClose={() => setVaultEditPath(null)} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Architecture editor ──
  if (node.type === 'architecture') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <EditorHeader
          node={node} Icon={NodeIcon}
          dirty={isDirty} lastSaved={lastSaved} saving={saving}
          onSave={handleSave} onDiscard={() => { setContent(initialRef.current); onDirtyChange(null) }}
        />
        <div className="flex-1 relative overflow-hidden">
          {loading
            ? <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/10" /></div>
            : (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full h-full bg-transparent p-6 text-[12px] font-mono leading-relaxed text-slate-300 focus:outline-none resize-none scrollbar-hide selection:bg-violet-500/30"
                placeholder="Inserisci il system prompt..."
                spellCheck={false}
              />
            )
          }
        </div>
        <div className="px-4 py-2 border-t border-white/[0.06] bg-amber-500/[0.02] flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-amber-500/40 flex-shrink-0" />
          <p className="text-[9px] text-amber-500/40 font-medium">Le modifiche qui alterano il comportamento globale dell&apos;AI.</p>
        </div>
      </div>
    )
  }

  // ── Skill editor ──
  if (node.type === 'skill' && skillData) {
    const sk = skillData as {
      id: string; name: string; slug: string; description: string;
      content: string; triggers: string[]; active: boolean; sort_order: number
    }
    const update = (patch: Partial<typeof sk>) => setSkillData(prev => ({ ...prev, ...patch }))

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <EditorHeader
          node={node} Icon={NodeIcon}
          dirty={isDirty} lastSaved={lastSaved} saving={saving}
          onSave={handleSave} onDiscard={() => {
            const orig = JSON.parse(initialRef.current || '{}')
            setSkillData(orig)
            onDirtyChange(null)
          }}
          extra={
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Attiva</span>
              <button
                onClick={() => update({ active: !sk.active })}
                className={cn("w-8 h-4 rounded-full transition-all relative", sk.active ? "bg-emerald-500/40" : "bg-white/10")}
              >
                <div className={cn("absolute top-0.5 w-3 h-3 rounded-full transition-all", sk.active ? "right-0.5 bg-emerald-400" : "left-0.5 bg-white/20")} />
              </button>
            </div>
          }
        />
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <Field label="Nome">
            <input
              value={sk.name ?? ''}
              onChange={e => update({ name: e.target.value })}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[12px] text-white/70 placeholder:text-white/15 focus:outline-none focus:border-violet-500/30 transition-all"
            />
          </Field>
          <Field label="Descrizione">
            <textarea
              value={sk.description ?? ''}
              onChange={e => update({ description: e.target.value })}
              rows={2}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[12px] text-white/70 placeholder:text-white/15 focus:outline-none focus:border-violet-500/30 transition-all resize-none"
            />
          </Field>
          <Field label="Trigger (separati da virgola)">
            <input
              value={Array.isArray(sk.triggers) ? sk.triggers.join(', ') : ''}
              onChange={e => update({ triggers: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[12px] text-white/70 placeholder:text-white/15 focus:outline-none focus:border-violet-500/30 transition-all font-mono"
              placeholder="parola1, parola2, ..."
            />
            {Array.isArray(sk.triggers) && sk.triggers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {sk.triggers.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[9px] font-bold text-violet-300">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </Field>
          <Field label="Handbook (Markdown)" className="flex-1">
            <textarea
              value={sk.content ?? ''}
              onChange={e => update({ content: e.target.value })}
              className="w-full min-h-[400px] bg-black/40 border border-white/10 rounded-3xl p-6 text-[12px] font-mono leading-relaxed text-slate-300 focus:outline-none focus:border-violet-500/30 transition-all scrollbar-hide resize-none"
              placeholder="Istruzioni dettagliate per l'IA..."
              spellCheck={false}
            />
          </Field>
        </div>
      </div>
    )
  }

  // ── Context instruction editor ──
  if (node.type === 'context-instruction') {
    const ci = skillData as { file_path?: string; instructions?: string } | null
    const isNew = node.meta?.isNew as boolean | undefined
    const fileExists = !isNew && !!ci?.file_path

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <EditorHeader
          node={node} Icon={NodeIcon}
          dirty={isDirty} lastSaved={lastSaved} saving={saving}
          onSave={handleSave} onDiscard={() => {
            setContent(initialRef.current)
            if (ci) setSkillData({ ...ci, instructions: initialRef.current })
            onDirtyChange(null)
          }}
          extra={
            !isNew && (
              <button
                onClick={() => setDeleteConfirm(!deleteConfirm)}
                className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500/30 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          }
        />

        {deleteConfirm && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-[10px] text-red-400 flex-1">Rimuovere questo file dal contesto?</p>
            <button onClick={handleDelete} className="px-3 py-1 rounded-lg bg-red-500 text-white text-[9px] font-black uppercase tracking-widest">Elimina</button>
            <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1 rounded-lg bg-white/5 text-white/40 text-[9px] font-black uppercase tracking-widest">Annulla</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <Field label="Percorso file">
            <input
              value={ci?.file_path ?? ''}
              onChange={e => setSkillData(prev => ({ ...prev, file_path: e.target.value }))}
              readOnly={!isNew}
              className={cn("w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[12px] text-white/70 placeholder:text-white/15 focus:outline-none focus:border-violet-500/30 transition-all font-mono", !isNew && "opacity-50 cursor-not-allowed")}
              placeholder="es: C:/vault/_brain/guidelines.md"
            />
            {!fileExists && !isNew && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-500/5 border border-sky-500/10">
                <Info className="w-3.5 h-3.5 text-sky-400/60 flex-shrink-0" />
                <p className="text-[9px] text-sky-400/60">File non trovato su disco — le istruzioni sono comunque iniettate nel contesto.</p>
              </div>
            )}
          </Field>
          <Field label="Istruzioni (iniettate in ogni prompt)" className="flex-1">
            <textarea
              value={ci?.instructions ?? ''}
              onChange={e => {
                setContent(e.target.value)
                setSkillData(prev => ({ ...prev, instructions: e.target.value }))
              }}
              className="w-full min-h-[300px] bg-black/40 border border-white/10 rounded-3xl p-6 text-[12px] font-mono leading-relaxed text-slate-300 focus:outline-none focus:border-sky-500/30 transition-all scrollbar-hide resize-none"
              placeholder="Regole, linee guida o contesto fisso che l'IA deve sempre avere..."
              spellCheck={false}
            />
          </Field>
        </div>
      </div>
    )
  }

  // ── Client vault editor ──
  if (node.type === 'client-vault') {
    const client = node.meta?.client as { name: string; sector?: string | null; vault_md_content?: string } | undefined
    const hasContent = !!content.trim()

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <EditorHeader
          node={node} Icon={NodeIcon}
          dirty={isDirty} lastSaved={lastSaved} saving={saving}
          onSave={handleSave}
          onDiscard={() => { setContent(initialRef.current); onDirtyChange(null) }}
        />

        {/* Client meta bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.04] bg-amber-500/[0.02]">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              hasContent ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]" : "bg-white/15"
            )} />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300/60">
              {client?.name}
            </span>
            {client?.sector && (
              <span className="text-[9px] text-white/20 font-mono">· {client.sector}</span>
            )}
          </div>
          <div className="flex-1" />
          <span className="text-[9px] font-mono text-white/15">
            {hasContent ? `${content.length} char` : 'vault vuoto'}
          </span>
          <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/30">
            Iniettato nel contesto quando il cliente è menzionato
          </span>
        </div>

        {/* Info banner se vuoto */}
        {!hasContent && (
          <div className="mx-4 mt-4 flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-amber-500/5 border border-amber-500/10">
            <Info className="w-3.5 h-3.5 text-amber-400/60 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-amber-400/60 leading-relaxed">
              Questo vault è vuoto. Scrivi qui il brand DNA del cliente: colori, font, tono di voce,
              obiettivi, target, esempi di copy. L&apos;AI lo caricherà automaticamente ogni volta che
              menzioni &ldquo;{client?.name}&rdquo; in una conversazione.
            </p>
          </div>
        )}

        <div className="flex-1 relative overflow-hidden">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full h-full bg-transparent p-6 text-[12px] font-mono leading-relaxed text-slate-300 focus:outline-none resize-none scrollbar-hide selection:bg-amber-500/20"
            placeholder={`# ${client?.name ?? 'Cliente'}\n\n## Brand Identity\n- Colori primari:\n- Font:\n- Tono di voce:\n\n## Obiettivi\n\n## Target\n\n## Note operative`}
            spellCheck={false}
          />
        </div>

        <div className="px-4 py-2 border-t border-white/[0.06] bg-amber-500/[0.02] flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-amber-500/30 flex-shrink-0" />
          <p className="text-[9px] text-amber-500/30 font-medium">
            Il contenuto viene iniettato nel system prompt solo quando il nome cliente appare nella query.
          </p>
        </div>
      </div>
    )
  }

  return null
}

// ─── EDITOR HEADER ─────────────────────────────────────────────────────────────

function EditorHeader({
  node, Icon, dirty, lastSaved, saving, onSave, onDiscard, extra,
}: {
  node: TreeNode
  Icon: React.ElementType
  dirty: boolean
  lastSaved: string | null
  saving: boolean
  onSave: (() => void) | null
  onDiscard: (() => void) | null
  extra?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-white/[0.01] flex-shrink-0">
      <Icon className="w-3.5 h-3.5 text-violet-400/60 flex-shrink-0" />
      <span className="text-[11px] font-bold text-white/50 flex-1 min-w-0 truncate">{node.label}</span>

      {dirty && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)] flex-shrink-0" />}
      {lastSaved && !dirty && (
        <span className="text-[9px] font-mono text-white/20 flex-shrink-0">salvato {lastSaved}</span>
      )}

      {extra}

      {onSave && (
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex-shrink-0",
            dirty
              ? "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
              : "bg-white/[0.02] text-white/15 cursor-not-allowed"
          )}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Salva
        </button>
      )}
      {onDiscard && dirty && (
        <button
          onClick={onDiscard}
          className="p-1.5 hover:bg-white/5 rounded-lg text-white/20 hover:text-white/60 transition-all flex-shrink-0"
          title="Scarta modifiche"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ─── FIELD ─────────────────────────────────────────────────────────────────────

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">{label}</label>
      {children}
    </div>
  )
}

