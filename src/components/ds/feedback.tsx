import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'info'

const tones: Record<Tone, string> = {
  neutral: 'text-ds-muted border-ds-line',
  accent: 'text-ds-accent border-ds-accent/50',
  ok: 'text-ds-ok border-ds-ok/50',
  warn: 'text-ds-warn border-ds-warn/50',
  danger: 'text-ds-danger border-ds-danger/50',
  info: 'text-ds-info border-ds-info/50',
}

/** Badge di stato col pallino, come "● disponibile" del sito. Il testo porta il significato, non solo il colore. */
export function Badge({ tone = 'neutral', dot = true, children, className }: {
  tone?: Tone
  dot?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 h-6 px-2 border rounded-[3px] text-[11px] font-semibold uppercase tracking-[0.14em] whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center h-5 min-w-5 px-1.5 rounded-[4px] border border-ds-line border-b-2 bg-ds-surface font-ds-mono text-[11px] text-ds-muted">
      {children}
    </kbd>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('rounded-ds-sm bg-ds-surface-2 animate-pulse motion-reduce:animate-none', className)} />
}

/** Stato vuoto: è un posto dove lo stile può osare (titolo gridato) e deve sempre proporre un'azione */
export function EmptyState({ title, text, action, icon }: {
  title: string
  text?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-6">
      {icon && <div className="text-ds-accent">{icon}</div>}
      <h3 className="ds-shout text-ds-xl text-ds-text">{title}</h3>
      {text && <p className="max-w-sm text-ds-sm text-ds-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Tooltip leggero: compare con hover E con focus da tastiera */
export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-ds-sm bg-ds-ink px-2 py-1 text-ds-xs text-ds-bg opacity-0 ds-anim transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
