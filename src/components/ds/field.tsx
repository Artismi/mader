'use client'

import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

const control =
  'w-full bg-ds-surface text-ds-text placeholder:text-ds-muted/70 border border-ds-line rounded-ds-sm px-3 ' +
  'font-text text-ds-base ds-anim transition-[border-color,box-shadow] hover:border-ds-ink/40 ' +
  'focus:outline-none focus-visible:border-ds-focus focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ds-focus)_25%,transparent)] ' +
  'aria-[invalid=true]:border-ds-danger disabled:opacity-50'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode
  className?: string
}

/** Etichetta + controllo + aiuto/errore, collegati per gli screen reader */
export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId()
  const descId = hint || error ? `${id}-desc` : undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-ds-sm font-semibold text-ds-text">
        {label}
      </label>
      {children({ id, 'aria-describedby': descId, 'aria-invalid': !!error || undefined })}
      {(error || hint) && (
        <p id={descId} className={cn('text-ds-xs', error ? 'text-ds-danger' : 'text-ds-muted')}>
          {error ? `⚠ ${error}` : hint}
        </p>
      )}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(control, 'h-10', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(control, 'py-2 resize-y min-h-20', className)} {...rest} />
  },
)

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cn(control, 'h-10 pr-8 appearance-auto', className)} {...rest}>
      {children}
    </select>
  )
})

interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
}

/** Interruttore accessibile (role=switch) con etichetta sempre visibile */
export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 text-ds-sm text-ds-text disabled:opacity-50"
    >
      <span
        className={cn(
          'relative inline-block h-5 w-9 rounded-full border border-ds-ink/70 ds-anim transition-colors',
          checked ? 'bg-ds-accent' : 'bg-ds-surface-2',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-3.5 rounded-full bg-ds-ink ds-anim transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </span>
      {label}
    </button>
  )
}
