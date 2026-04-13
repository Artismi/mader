'use client'

import React, { useState, useTransition } from 'react'
import { SidePanel } from './side-panel'
import { useToast } from './toast-provider'
import { cn } from '@/lib/utils'
import { Calendar, DollarSign, Plus, Trash2, Flag, FileText, Type, Package, Film } from 'lucide-react'
import {
  createBrief,
  updateBrief,
  addMilestone,
  deleteMilestone,
  addDeliverable,
  deleteDeliverable,
  updateMilestoneStatus,
  updateDeliverableStatus,
} from '@/app/actions'
import type { Brief, Milestone, Deliverable, BriefWithDetails, DeliverableType, MilestoneStatus, DeliverableStatus } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BriefEditorProps {
  open: boolean
  onClose: () => void
  clientId: string
  /** Pass an existing brief to edit it; omit to create a new one */
  existing?: BriefWithDetails
  onSaved?: (briefId: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DELIVERABLE_TYPES: { value: DeliverableType; label: string; icon: React.ReactNode }[] = [
  { value: 'design_file', label: 'Design',    icon: <Package className="w-3 h-3" /> },
  { value: 'copy',        label: 'Copy',       icon: <Type    className="w-3 h-3" /> },
  { value: 'asset',       label: 'Asset',      icon: <FileText className="w-3 h-3" /> },
  { value: 'document',    label: 'Documento',  icon: <FileText className="w-3 h-3" /> },
  { value: 'video',       label: 'Video',      icon: <Film    className="w-3 h-3" /> },
]

/** Auto-generates 3 milestones at 25%, 50%, 75% of the time span from today to deadline */
function autoMilestones(deadline: string): { title: string; dueDate: string }[] {
  const now = Date.now()
  const end = new Date(deadline).getTime()
  if (isNaN(end) || end <= now) return []
  const span = end - now
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  return [
    { title: 'Kickoff & revisione brief',    dueDate: fmt(now + span * 0.25) },
    { title: 'Consegna bozze',               dueDate: fmt(now + span * 0.5) },
    { title: 'Revisioni finali',             dueDate: fmt(now + span * 0.75) },
  ]
}

const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  pending:     'In attesa',
  in_progress: 'In corso',
  completed:   'Completato',
}

const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  pending:     'In attesa',
  in_progress: 'In corso',
  ready:       'Pronto',
  approved:    'Approvato',
  delivered:   'Consegnato',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BriefEditor({ open, onClose, clientId, existing, onSaved }: BriefEditorProps) {
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [title,       setTitle]       = useState(existing?.title       ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [scope,       setScope]       = useState(existing?.scope       ?? '')
  const [budgetMin,   setBudgetMin]   = useState(existing?.budget_min?.toString() ?? '')
  const [budgetMax,   setBudgetMax]   = useState(existing?.budget_max?.toString() ?? '')
  const [deadline,    setDeadline]    = useState(
    existing?.deadline ? existing.deadline.slice(0, 10) : '',
  )

  // Milestones / deliverables (for existing briefs, pulled from server; for new ones, generated on save)
  const [localMilestones,   setLocalMilestones]   = useState<Milestone[]>(existing?.milestones   ?? [])
  const [localDeliverables, setLocalDeliverables] = useState<Deliverable[]>(existing?.deliverables ?? [])

  // New deliverable form
  const [newDelType,  setNewDelType]  = useState<DeliverableType>('design_file')
  const [newDelTitle, setNewDelTitle] = useState('')

  // New milestone form
  const [newMsTitle, setNewMsTitle] = useState('')
  const [newMsDate,  setNewMsDate]  = useState('')

  const isNew = !existing

  // ── Save (create) ──────────────────────────────────────────────────────────

  function handleSave() {
    if (!title.trim()) { toast.error('Il titolo è obbligatorio'); return }

    startTransition(async () => {
      try {
        let briefId: string

        if (isNew) {
          briefId = await createBrief({
            clientId,
            title,
            description: description || undefined,
            scope:       scope       || undefined,
            budgetMin:   budgetMin   ? parseFloat(budgetMin) : undefined,
            budgetMax:   budgetMax   ? parseFloat(budgetMax) : undefined,
            deadline:    deadline    || undefined,
          })

          // Auto-generate milestones if deadline given
          if (deadline) {
            const auto = autoMilestones(deadline)
            await Promise.all(
              auto.map((ms, i) => addMilestone({ briefId, title: ms.title, dueDate: ms.dueDate, orderIndex: i }))
            )
          }
        } else {
          briefId = existing!.id
          await updateBrief(briefId, {
            title,
            description: description || undefined,
            scope:       scope       || undefined,
            budgetMin:   budgetMin   ? parseFloat(budgetMin) : undefined,
            budgetMax:   budgetMax   ? parseFloat(budgetMax) : undefined,
            deadline:    deadline    || undefined,
          })
        }

        toast.success(isNew ? 'Brief creato' : 'Brief aggiornato')
        onSaved?.(briefId)
        onClose()
      } catch {
        toast.error('Errore durante il salvataggio')
      }
    })
  }

  // ── Milestone actions (existing brief only) ────────────────────────────────

  async function handleAddMilestone() {
    if (!existing || !newMsTitle.trim() || !newMsDate) return
    const ms = await addMilestone({
      briefId:    existing.id,
      title:      newMsTitle.trim(),
      dueDate:    newMsDate,
      orderIndex: localMilestones.length,
    })
    // Optimistic UI update — server action returns id as string
    const newMs: Milestone = {
      id:          ms,
      brief_id:    existing.id,
      title:       newMsTitle.trim(),
      due_date:    newMsDate,
      status:      'pending',
      order_index: localMilestones.length,
      created_at:  new Date().toISOString(),
    }
    setLocalMilestones(prev => [...prev, newMs])
    setNewMsTitle('')
    setNewMsDate('')
  }

  async function handleDeleteMilestone(id: string) {
    await deleteMilestone(id)
    setLocalMilestones(prev => prev.filter(m => m.id !== id))
  }

  // ── Deliverable actions (existing brief only) ──────────────────────────────

  async function handleAddDeliverable() {
    if (!existing || !newDelTitle.trim()) return
    const delId = await addDeliverable({ briefId: existing.id, type: newDelType, title: newDelTitle.trim() })
    const newDel: Deliverable = {
      id:         delId,
      brief_id:   existing.id,
      type:       newDelType,
      title:      newDelTitle.trim(),
      status:     'pending',
      created_at: new Date().toISOString(),
    }
    setLocalDeliverables(prev => [...prev, newDel])
    setNewDelTitle('')
  }

  async function handleDeleteDeliverable(id: string) {
    await deleteDeliverable(id)
    setLocalDeliverables(prev => prev.filter(d => d.id !== id))
  }

  async function cycleDeliverableStatus(del: Deliverable) {
    const order: DeliverableStatus[] = ['pending', 'in_progress', 'ready', 'approved', 'delivered']
    const next = order[(order.indexOf(del.status) + 1) % order.length]
    await updateDeliverableStatus(del.id, next)
    setLocalDeliverables(prev => prev.map(d => d.id === del.id ? { ...d, status: next } : d))
  }

  async function cycleMilestoneStatus(ms: Milestone) {
    const order: MilestoneStatus[] = ['pending', 'in_progress', 'completed']
    const next = order[(order.indexOf(ms.status) + 1) % order.length]
    await updateMilestoneStatus(ms.id, next)
    setLocalMilestones(prev => prev.map(m => m.id === ms.id ? { ...m, status: next } : m))
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SidePanel open={open} onClose={onClose} title={isNew ? 'Nuovo Progetto' : 'Modifica Brief'}>
      <div className="flex flex-col gap-0 pb-32">

        {/* ── Core info ── */}
        <section className="px-6 py-6 flex flex-col gap-4 border-b border-white/[0.06]">
          <Field label="Titolo *">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nome del progetto..."
              className={inputCls}
            />
          </Field>

          <Field label="Scope / obiettivo">
            <textarea
              value={scope}
              onChange={e => setScope(e.target.value)}
              placeholder="Cosa deve produrre questo progetto?"
              rows={3}
              className={cn(inputCls, 'resize-none')}
            />
          </Field>

          <Field label="Descrizione (interna)">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Note, contesto, riferimenti..."
              rows={2}
              className={cn(inputCls, 'resize-none')}
            />
          </Field>

          {/* Budget + Deadline row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Budget (€)">
              <div className="flex gap-2">
                <input
                  value={budgetMin}
                  onChange={e => setBudgetMin(e.target.value)}
                  placeholder="Min"
                  type="number"
                  className={inputCls}
                />
                <input
                  value={budgetMax}
                  onChange={e => setBudgetMax(e.target.value)}
                  placeholder="Max"
                  type="number"
                  className={inputCls}
                />
              </div>
            </Field>
            <Field label="Deadline">
              <input
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                type="date"
                className={inputCls}
              />
            </Field>
          </div>

          {isNew && deadline && (
            <p className="text-[10px] text-white/30 -mt-1">
              3 milestone verranno generate automaticamente alla creazione
            </p>
          )}
        </section>

        {/* ── Milestones (only when editing) ── */}
        {!isNew && (
          <section className="px-6 py-6 flex flex-col gap-3 border-b border-white/[0.06]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 flex items-center gap-2">
              <Flag className="w-3 h-3" /> Milestone
            </h3>

            {localMilestones.length === 0 && (
              <p className="text-[11px] text-white/25 italic">Nessuna milestone aggiunta.</p>
            )}

            {localMilestones.map(ms => (
              <div key={ms.id} className="flex items-center gap-3 group">
                <button
                  onClick={() => cycleMilestoneStatus(ms)}
                  className={cn('w-2 h-2 rounded-full shrink-0 transition-colors', {
                    'bg-white/20': ms.status === 'pending',
                    'bg-yellow-400': ms.status === 'in_progress',
                    'bg-emerald-400': ms.status === 'completed',
                  })}
                  title={MILESTONE_STATUS_LABEL[ms.status]}
                />
                <span className="text-[11px] text-white/70 flex-1">{ms.title}</span>
                <span className="text-[10px] text-white/30">{ms.due_date.slice(0, 10)}</span>
                <button
                  onClick={() => handleDeleteMilestone(ms.id)}
                  className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Add milestone */}
            <div className="flex gap-2 mt-1">
              <input
                value={newMsTitle}
                onChange={e => setNewMsTitle(e.target.value)}
                placeholder="Milestone..."
                className={cn(inputCls, 'flex-1 text-[11px]')}
                onKeyDown={e => e.key === 'Enter' && handleAddMilestone()}
              />
              <input
                value={newMsDate}
                onChange={e => setNewMsDate(e.target.value)}
                type="date"
                className={cn(inputCls, 'w-32 text-[11px]')}
              />
              <button
                onClick={handleAddMilestone}
                className="w-8 h-8 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-white/50 hover:text-white flex items-center justify-center transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        )}

        {/* ── Deliverables (only when editing) ── */}
        {!isNew && (
          <section className="px-6 py-6 flex flex-col gap-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 flex items-center gap-2">
              <Package className="w-3 h-3" /> Deliverable
            </h3>

            {localDeliverables.length === 0 && (
              <p className="text-[11px] text-white/25 italic">Nessun deliverable aggiunto.</p>
            )}

            {localDeliverables.map(del => {
              const typeInfo = DELIVERABLE_TYPES.find(t => t.value === del.type)
              return (
                <div key={del.id} className="flex items-center gap-3 group">
                  <span className="text-white/30 shrink-0">{typeInfo?.icon}</span>
                  <span className="text-[11px] text-white/70 flex-1">{del.title}</span>
                  <button
                    onClick={() => cycleDeliverableStatus(del)}
                    className={cn('text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border transition-colors', {
                      'border-white/10 text-white/30':     del.status === 'pending',
                      'border-yellow-500/40 text-yellow-400': del.status === 'in_progress',
                      'border-blue-500/40 text-blue-400':  del.status === 'ready',
                      'border-purple-500/40 text-purple-400': del.status === 'approved',
                      'border-emerald-500/40 text-emerald-400': del.status === 'delivered',
                    })}
                  >
                    {DELIVERABLE_STATUS_LABEL[del.status]}
                  </button>
                  <button
                    onClick={() => handleDeleteDeliverable(del.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )
            })}

            {/* Add deliverable */}
            <div className="flex gap-2 mt-1">
              <select
                value={newDelType}
                onChange={e => setNewDelType(e.target.value as DeliverableType)}
                className={cn(inputCls, 'w-28 text-[11px]')}
              >
                {DELIVERABLE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                value={newDelTitle}
                onChange={e => setNewDelTitle(e.target.value)}
                placeholder="Descrizione deliverable..."
                className={cn(inputCls, 'flex-1 text-[11px]')}
                onKeyDown={e => e.key === 'Enter' && handleAddDeliverable()}
              />
              <button
                onClick={handleAddDeliverable}
                className="w-8 h-8 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-white/50 hover:text-white flex items-center justify-center transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        )}

        {/* ── Footer save button ── */}
        <div className="fixed bottom-0 right-0 w-[480px] p-5 border-t border-white/[0.06] bg-[#0F0F1A]/90 backdrop-blur-sm">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full h-11 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/90 disabled:opacity-50 transition-all"
          >
            {isPending ? 'Salvataggio...' : isNew ? 'Crea Progetto' : 'Aggiorna Brief'}
          </button>
        </div>
      </div>
    </SidePanel>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">{label}</label>
      {children}
    </div>
  )
}

const inputCls = [
  'w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5',
  'text-[12px] text-white/80 placeholder:text-white/25',
  'focus:outline-none focus:border-white/20 focus:bg-white/[0.07]',
  'transition-colors',
  '[color-scheme:dark]',
].join(' ')
