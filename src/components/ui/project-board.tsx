'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from './toast-provider'
import { BriefEditor } from './brief-editor'
import { cn } from '@/lib/utils'
import {
  Flag,
  Package,
  ChevronDown,
  ChevronRight,
  Plus,
  Palette,
  Film,
  FileText,
  ArrowRight,
} from 'lucide-react'
import { updateBrief, updateDeliverableStatus } from '@/app/actions'
import type { BriefWithDetails, BriefStatus, DeliverableStatus } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectBoardProps {
  clientId: string
  briefs: BriefWithDetails[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BriefStatus, { label: string; dot: string; border: string }> = {
  draft:       { label: 'Bozza',     dot: 'bg-white/20',     border: 'border-white/10' },
  approved:    { label: 'Approvato', dot: 'bg-blue-400',     border: 'border-blue-500/30' },
  in_progress: { label: 'In corso',  dot: 'bg-yellow-400',   border: 'border-yellow-500/30' },
  delivered:   { label: 'Consegnato',dot: 'bg-emerald-400',  border: 'border-emerald-500/30' },
  closed:      { label: 'Chiuso',    dot: 'bg-white/10',     border: 'border-white/[0.06]' },
}

const DEL_STATUS_COLORS: Record<DeliverableStatus, string> = {
  pending:     'text-white/30',
  in_progress: 'text-yellow-400',
  ready:       'text-blue-400',
  approved:    'text-purple-400',
  delivered:   'text-emerald-400',
}

function deliverableProgress(brief: BriefWithDetails) {
  if (brief.deliverables.length === 0) return null
  const done = brief.deliverables.filter(d => d.status === 'delivered' || d.status === 'approved').length
  return { done, total: brief.deliverables.length }
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectBoard({ clientId, briefs: initialBriefs }: ProjectBoardProps) {
  const router  = useRouter()
  const toast   = useToast()
  const [briefs, setBriefs]           = useState(initialBriefs)
  const [expanded, setExpanded]       = useState<Set<string>>(new Set())
  const [editorOpen, setEditorOpen]   = useState(false)
  const [editingBrief, setEditingBrief] = useState<BriefWithDetails | undefined>()

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openNewBrief() {
    setEditingBrief(undefined)
    setEditorOpen(true)
  }

  function openEditBrief(brief: BriefWithDetails) {
    setEditingBrief(brief)
    setEditorOpen(true)
  }

  async function cycleStatus(brief: BriefWithDetails) {
    const order: BriefStatus[] = ['draft', 'approved', 'in_progress', 'delivered', 'closed']
    const next = order[(order.indexOf(brief.status) + 1) % order.length]
    await updateBrief(brief.id, { status: next })
    setBriefs(prev => prev.map(b => b.id === brief.id ? { ...b, status: next } : b))
  }

  async function cycleDeliverable(briefId: string, delId: string, current: DeliverableStatus) {
    const order: DeliverableStatus[] = ['pending', 'in_progress', 'ready', 'approved', 'delivered']
    const next = order[(order.indexOf(current) + 1) % order.length]
    await updateDeliverableStatus(delId, next)
    setBriefs(prev => prev.map(b => b.id === briefId
      ? { ...b, deliverables: b.deliverables.map(d => d.id === delId ? { ...d, status: next } : d) }
      : b
    ))
    if (next === 'delivered') {
      const brief = briefs.find(b => b.id === briefId)
      const allDone = brief?.deliverables.every(d => d.id === delId || d.status === 'delivered' || d.status === 'approved')
      if (allDone && brief) {
        toast.info(`Progetto "${brief.title}" completato!`, {
          actionLabel: 'Crea Fattura →',
          onAction: () => router.push('/finanze'),
        })
      }
    }
  }

  function handleBriefSaved(id: string) {
    // After save, the page will revalidate via Server Actions — just close
    router.refresh()
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
          Progetti ({briefs.length})
        </h2>
        <button
          onClick={openNewBrief}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white/40 hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuovo Progetto
        </button>
      </div>

      {/* Brief list */}
      {briefs.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] px-6 py-8 text-center">
          <p className="text-[12px] text-white/30">Nessun progetto ancora.</p>
          <button
            onClick={openNewBrief}
            className="mt-3 text-[11px] font-black uppercase tracking-wider text-white/50 hover:text-white transition-colors"
          >
            + Crea il primo
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {briefs.map(brief => {
            const cfg      = STATUS_CONFIG[brief.status]
            const progress = deliverableProgress(brief)
            const isOpen   = expanded.has(brief.id)
            const days     = brief.deadline ? daysUntil(brief.deadline) : null
            const urgent   = days !== null && days <= 7

            return (
              <div
                key={brief.id}
                className={cn(
                  'rounded-2xl border transition-colors',
                  cfg.border,
                  'bg-white/[0.02] hover:bg-white/[0.04]',
                )}
              >
                {/* ── Card header ── */}
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => toggleExpand(brief.id)}>
                  {/* Status dot */}
                  <button
                    onClick={e => { e.stopPropagation(); cycleStatus(brief) }}
                    className={cn('w-2.5 h-2.5 rounded-full shrink-0 transition-transform hover:scale-125', cfg.dot)}
                    title={`Status: ${cfg.label}. Click per avanzare.`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-white/80 truncate">{brief.title}</span>
                      <span className={cn(
                        'text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full border',
                        cfg.border, cfg.dot === 'bg-white/20' ? 'text-white/40' : 'text-current',
                      )}>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-0.5">
                      {brief.deadline && (
                        <span className={cn('text-[10px]', urgent ? 'text-orange-400' : 'text-white/30')}>
                          {urgent ? `⚡ ${days}g` : brief.deadline.slice(0, 10)}
                        </span>
                      )}
                      {progress && (
                        <span className="text-[10px] text-white/30">
                          {progress.done}/{progress.total} consegnati
                        </span>
                      )}
                      {brief.budget_max && (
                        <span className="text-[10px] text-white/25">
                          €{brief.budget_max.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {progress && progress.total > 0 && (
                    <div className="w-16 h-1 rounded-full bg-white/[0.06] shrink-0 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400/60 transition-all"
                        style={{ width: `${(progress.done / progress.total) * 100}%` }}
                      />
                    </div>
                  )}

                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  )}
                </div>

                {/* ── Expanded body ── */}
                {isOpen && (
                  <div className="px-4 pb-4 flex flex-col gap-4 border-t border-white/[0.06] pt-4">

                    {/* Scope */}
                    {brief.scope && (
                      <p className="text-[11px] text-white/50 leading-relaxed">{brief.scope}</p>
                    )}

                    {/* Milestones */}
                    {brief.milestones.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-1.5">
                          <Flag className="w-2.5 h-2.5" /> Milestone
                        </span>
                        {brief.milestones
                          .sort((a, b) => a.order_index - b.order_index)
                          .map(ms => (
                            <div key={ms.id} className="flex items-center gap-2">
                              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', {
                                'bg-white/20':   ms.status === 'pending',
                                'bg-yellow-400': ms.status === 'in_progress',
                                'bg-emerald-400': ms.status === 'completed',
                              })} />
                              <span className={cn('text-[11px] flex-1', ms.status === 'completed' ? 'line-through text-white/30' : 'text-white/60')}>
                                {ms.title}
                              </span>
                              <span className="text-[10px] text-white/25">{ms.due_date.slice(0, 10)}</span>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Deliverables */}
                    {brief.deliverables.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-1.5">
                          <Package className="w-2.5 h-2.5" /> Deliverable
                        </span>
                        {brief.deliverables.map(del => (
                          <div key={del.id} className="flex items-center gap-2">
                            <span className={cn('text-[11px] flex-1', del.status === 'delivered' ? 'line-through text-white/30' : 'text-white/60')}>
                              {del.title}
                            </span>
                            <button
                              onClick={() => cycleDeliverable(brief.id, del.id, del.status)}
                              className={cn('text-[9px] font-black uppercase tracking-wide hover:opacity-70 transition-opacity', DEL_STATUS_COLORS[del.status])}
                            >
                              {del.status === 'pending' ? '○' : del.status === 'delivered' ? '✓' : '●'} {del.status}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap pt-1">
                      <ActionBtn
                        icon={<Palette className="w-3 h-3" />}
                        label="Apri Canvas"
                        onClick={() => {
                          sessionStorage.setItem('cos_brief_id', brief.id)
                          sessionStorage.setItem('cos_brief_title', brief.title)
                          router.push('/progettazione')
                        }}
                      />
                      <ActionBtn
                        icon={<Film className="w-3 h-3" />}
                        label="Editoriale"
                        onClick={() => router.push(`/editoriale?briefId=${brief.id}`)}
                      />
                      <ActionBtn
                        icon={<FileText className="w-3 h-3" />}
                        label="Modifica"
                        onClick={() => openEditBrief(brief)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Brief Editor */}
      <BriefEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        clientId={clientId}
        existing={editingBrief}
        onSaved={handleBriefSaved}
      />
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/50 hover:text-white text-[10px] font-semibold transition-colors"
    >
      {icon}
      {label}
    </button>
  )
}
