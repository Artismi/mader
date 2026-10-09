'use client'

import { useState } from 'react'
import { ChevronRight, MoreHorizontal, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconButton } from './button'

/** Un passo successivo sensato per il nodo in focus: crearlo genera un figlio nel ramo */
export interface Branch {
  label: string
  onSelect: () => void
  shortcut?: string
}

export type ModuleSize = 'chip' | 'card' | 'full'

interface ModuleProps {
  /** Tipo di nodo: CLIENTE, MESSAGGIO, TASK… */
  type: string
  title: string
  status?: React.ReactNode
  /** L'unica azione principale (Button variant="primary") */
  action?: React.ReactNode
  /** Tutte le altre azioni: menu ⋯ (si trovano anche con Ctrl+K) */
  onMenu?: () => void
  /** Rami possibili mostrati in fondo */
  branches?: Branch[]
  size?: Exclude<ModuleSize, 'chip'>
  pinned?: boolean
  children?: React.ReactNode
  className?: string
}

/**
 * Anatomia del modulo (STRUTTURA_WORKSPACE.md §3):
 * intestazione con tipo · titolo · stato · azione principale · ⋯
 * corpo essenziale → rami possibili in fondo.
 */
export function Module({
  type, title, status, action, onMenu, branches, size = 'full', pinned, children, className,
}: ModuleProps) {
  const isCard = size === 'card'
  return (
    <section
      aria-label={`${type}: ${title}`}
      className={cn(
        'flex flex-col bg-ds-surface border border-ds-ink/85 rounded-ds-md shadow-ds-2 overflow-hidden',
        className,
      )}
    >
      <header className={cn('flex items-center gap-3 border-b border-ds-line', isCard ? 'px-3 py-2' : 'px-5 py-3')}>
        <div className="min-w-0 flex-1">
          <p className="ds-label flex items-center gap-1.5">
            {pinned && <span aria-label="fissato" className="text-ds-accent">✦</span>}
            {type}
          </p>
          <h2 className={cn('ds-shout truncate text-ds-text', isCard ? 'text-ds-base' : 'text-ds-xl mt-0.5')}>{title}</h2>
        </div>
        {status}
        {!isCard && action}
        {onMenu && (
          <IconButton label="Altre azioni" size="sm" onClick={onMenu}>
            <MoreHorizontal className="size-4" />
          </IconButton>
        )}
      </header>

      {children && <div className={cn('flex-1 min-h-0 overflow-auto', isCard ? 'p-3' : 'p-5')}>{children}</div>}

      {branches && branches.length > 0 && !isCard && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-ds-line bg-ds-surface-2/50 px-5 py-3">
          <span className="ds-label mr-1">Rami</span>
          {branches.map(b => (
            <button
              key={b.label}
              type="button"
              onClick={b.onSelect}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-ds-ink/60 text-ds-sm text-ds-text hover:bg-ds-accent-soft hover:border-ds-ink ds-anim transition-colors"
            >
              <Plus className="size-3.5" aria-hidden />
              {b.label}
              {b.shortcut && <kbd className="font-ds-mono text-[10px] text-ds-muted">{b.shortcut}</kbd>}
            </button>
          ))}
        </footer>
      )}
    </section>
  )
}

/** Sezione espandibile: "mostrare per gradi" (Dettagli, Avanzate) */
export function Disclosure({ label, defaultOpen = false, children }: {
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-ds-line first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 py-2.5 text-ds-sm font-semibold text-ds-text hover:text-ds-accent"
      >
        <ChevronRight className={cn('size-4 ds-anim transition-transform', open && 'rotate-90')} aria-hidden />
        {label}
      </button>
      {open && <div className="pb-3 pl-6">{children}</div>}
    </div>
  )
}

/** Nodo come chip: usato nell'albero del ramo e nelle liste di "Oggi" */
export function NodeChip({ type, title, active, onClick }: {
  type: string
  title: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'group flex w-full items-center gap-2 rounded-ds-sm px-2 py-1.5 text-left ds-anim transition-colors',
        active ? 'bg-ds-ink text-ds-bg' : 'text-ds-text hover:bg-ds-surface-2',
      )}
    >
      <span aria-hidden className={cn('text-[10px]', active ? 'text-ds-accent-soft' : 'text-ds-muted')}>
        {active ? '◆' : '◇'}
      </span>
      <span className="min-w-0 flex-1 truncate text-ds-sm">{title}</span>
      <span className={cn('text-[10px] uppercase tracking-[0.14em]', active ? 'text-ds-bg/70' : 'text-ds-muted')}>{type}</span>
    </button>
  )
}
