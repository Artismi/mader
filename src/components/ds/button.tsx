'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const base =
  'inline-flex items-center justify-center gap-2 font-text font-semibold select-none ds-anim transition-[background,color,box-shadow,transform] ' +
  'disabled:opacity-45 disabled:pointer-events-none active:translate-y-px'

const variants: Record<Variant, string> = {
  // Ocra con doppio bordo nero, come il bottone "SCRIVIMI" del sito. Una sola per schermata.
  primary:
    'bg-ds-primary text-ds-on-primary uppercase tracking-[0.12em] border-2 border-ds-ink ' +
    'shadow-[inset_0_0_0_2px_var(--ds-primary),inset_0_0_0_3px_var(--ds-ink)] hover:brightness-105',
  secondary: 'bg-ds-surface text-ds-text border border-ds-ink/80 hover:bg-ds-surface-2',
  ghost: 'bg-transparent text-ds-text hover:bg-ds-surface-2',
  danger: 'bg-transparent text-ds-danger border border-ds-danger/60 hover:bg-ds-danger/10',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-ds-xs rounded-ds-sm',
  md: 'h-10 px-4 text-ds-sm rounded-ds-sm',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: React.ReactNode
  /** Scorciatoia mostrata accanto all'etichetta (riconoscere invece di ricordare) */
  shortcut?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, shortcut, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {icon}
      {children}
      {shortcut && <kbd className="font-ds-mono text-[10px] opacity-60 normal-case tracking-normal">{shortcut}</kbd>}
    </button>
  )
})

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obbligatoria: diventa aria-label e tooltip. Nessun bottone muto. */
  label: string
  size?: Size
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-ds-sm text-ds-muted hover:text-ds-text hover:bg-ds-surface-2 ds-anim transition-colors',
        'disabled:opacity-45 disabled:pointer-events-none',
        size === 'sm' ? 'size-8' : 'size-10',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
