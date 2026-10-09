'use client'

import { useId, useRef } from 'react'
import { cn } from '@/lib/utils'

interface TabsProps<T extends string> {
  tabs: { id: T; label: string; count?: number }[]
  value: T
  onChange: (id: T) => void
  label: string
}

/** Tab accessibili: frecce ←/→, Home/End, un solo tab nel ciclo del Tab */
export function Tabs<T extends string>({ tabs, value, onChange, label }: TabsProps<T>) {
  const base = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const last = tabs.length - 1
    const next =
      e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
      : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null
    if (next === null) return
    e.preventDefault()
    onChange(tabs[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-ds-line">
      {tabs.map((t, i) => {
        const selected = t.id === value
        return (
          <button
            key={t.id}
            ref={el => { refs.current[i] = el }}
            id={`${base}-${t.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={e => onKey(e, i)}
            className={cn(
              '-mb-px inline-flex items-center gap-2 h-10 px-3 border-b-2 text-ds-sm font-semibold uppercase tracking-[0.12em] ds-anim transition-colors',
              selected ? 'border-ds-ink text-ds-text' : 'border-transparent text-ds-muted hover:text-ds-text',
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="font-ds-mono text-ds-xs text-ds-muted">{t.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
