'use client'

import { useState } from 'react'
import { Copy, Check, Loader2, Cpu, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PreviewSection {
  label: string
  content: string
  color: string
  labelColor: string
}

export function BrainPreview({ onClose }: { onClose: () => void }) {
  const [testQuery, setTestQuery] = useState('')
  const [sections, setSections] = useState<PreviewSection[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [tokenCount, setTokenCount] = useState<number | null>(null)
  const [hasResult, setHasResult] = useState(false)

  const assemble = async () => {
    setLoading(true)
    try {
      const [ctxRes, archRes] = await Promise.all([
        fetch(`/api/ai/context?q=${encodeURIComponent(testQuery || 'contesto generale')}`),
        fetch('/api/ai/architecture'),
      ])
      const ctx = await ctxRes.json()
      const arch = await archRes.json()

      const archContent: string = arch.architecture || ''
      const snapshotContent: string = ctx.snapshot || ''
      const activeSkillNames: string = (ctx.skills ?? [])
        .filter((s: { active: boolean; name: string }) => s.active)
        .map((s: { name: string }) => `• ${s.name}`)
        .join('\n') || 'Nessuna skill attiva'

      const ragContent: string = snapshotContent.includes('Dal vault')
        ? snapshotContent.split('---').filter(c => c.includes('Dal vault')).join('\n').trim()
        : '— nessun chunk rilevante per questa query —'

      const memContent: string = snapshotContent.includes('Memorie richiamate')
        ? snapshotContent.split('---').filter(c => c.includes('Memorie richiamate')).join('\n').trim()
        : '— nessuna memoria rilevante —'

      const operativeContent: string = snapshotContent.split('\n\n---\n').shift()?.trim() || snapshotContent

      const newSections: PreviewSection[] = [
        {
          label: 'Architecture',
          content: archContent,
          color: 'bg-white/[0.02] border-white/[0.06]',
          labelColor: 'text-white/40',
        },
        {
          label: 'Skills attivi',
          content: activeSkillNames,
          color: 'bg-violet-500/[0.04] border-violet-500/[0.08]',
          labelColor: 'text-violet-400/70',
        },
        {
          label: 'Snapshot operativo',
          content: operativeContent || '— nessun dato contestuale —',
          color: 'bg-sky-500/[0.04] border-sky-500/[0.08]',
          labelColor: 'text-sky-400/70',
        },
        {
          label: 'Vault RAG',
          content: ragContent,
          color: 'bg-emerald-500/[0.04] border-emerald-500/[0.08]',
          labelColor: 'text-emerald-400/70',
        },
        {
          label: 'Memorie',
          content: memContent,
          color: 'bg-fuchsia-500/[0.04] border-fuchsia-500/[0.08]',
          labelColor: 'text-fuchsia-400/70',
        },
      ]

      setSections(newSections)
      const total = newSections.reduce((acc, s) => acc + s.content.length, 0)
      setTokenCount(Math.ceil(total / 4))
      setHasResult(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    const full = sections.map(s => `## ${s.label}\n${s.content}`).join('\n\n---\n\n')
    navigator.clipboard.writeText(full)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const toggleSection = (label: string) =>
    setCollapsed(p => ({ ...p, [label]: !p[label] }))

  const tokenColor =
    tokenCount === null
      ? 'text-white/20'
      : tokenCount < 4000
        ? 'text-emerald-400'
        : tokenCount < 8000
          ? 'text-amber-400'
          : 'text-red-400'

  return (
    <div className="w-[340px] shrink-0 flex flex-col border-l border-white/[0.06] bg-[#070709]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Preview Prompt</span>
        </div>
        <div className="flex items-center gap-2">
          {hasResult && (
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all"
              title="Copia prompt completo"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Query input */}
      <div className="px-4 py-3 border-b border-white/[0.06] space-y-2">
        <label className="text-[9px] font-black uppercase tracking-widest text-white/20">
          Query di test
        </label>
        <div className="flex gap-2">
          <input
            value={testQuery}
            onChange={e => setTestQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && assemble()}
            placeholder="Es: prepara post Instagram per Artismi..."
            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-[11px] text-white/70 placeholder:text-white/15 focus:outline-none focus:border-violet-500/30 transition-all"
          />
          <button
            onClick={assemble}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-violet-500/20 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-widest hover:bg-violet-500/30 transition-all disabled:opacity-40 flex-shrink-0"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'GO'}
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-2">
        {!hasResult && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <Cpu className="w-8 h-8 text-white/5" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white/10">
              Inserisci una query<br />e premi GO per<br />assemblare il contesto
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400/40" />
          </div>
        )}

        {hasResult && !loading && sections.map(section => {
          const isCollapsed = collapsed[section.label]
          const preview = section.content.slice(0, 120) + (section.content.length > 120 ? '…' : '')
          return (
            <div
              key={section.label}
              className={cn("rounded-2xl border overflow-hidden transition-all", section.color)}
            >
              <button
                onClick={() => toggleSection(section.label)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.02] transition-all"
              >
                <span className={cn("text-[9px] font-black uppercase tracking-widest", section.labelColor)}>
                  {section.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-white/15 tabular-nums">
                    ~{Math.ceil(section.content.length / 4)} tk
                  </span>
                  {isCollapsed
                    ? <ChevronDown className="w-3 h-3 text-white/20" />
                    : <ChevronUp className="w-3 h-3 text-white/20" />
                  }
                </div>
              </button>
              {!isCollapsed && (
                <div className="px-3 pb-3">
                  <pre className="text-[10px] font-mono text-white/40 leading-relaxed whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto scrollbar-hide">
                    {section.content || '—'}
                  </pre>
                </div>
              )}
              {isCollapsed && (
                <div className="px-3 pb-2">
                  <p className="text-[9px] text-white/20 font-mono truncate">{preview}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer token count */}
      {tokenCount !== null && (
        <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/15">Token stimati</span>
          <span className={cn("text-[11px] font-black tabular-nums", tokenColor)}>
            ~{tokenCount.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  )
}
