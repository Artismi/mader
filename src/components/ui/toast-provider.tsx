'use client'

import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
  actionLabel?: string
  onAction?: () => void
}

interface ToastContextValue {
  toast: {
    success: (message: string, opts?: ToastOpts) => void
    error:   (message: string, opts?: ToastOpts) => void
    info:    (message: string, opts?: ToastOpts) => void
    promise: <T>(
      promise: Promise<T>,
      messages: { loading: string; success: string; error: string },
    ) => Promise<T>
  }
}

interface ToastOpts {
  actionLabel?: string
  onAction?: () => void
  duration?: number
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue['toast'] {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx.toast
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current[id])
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((variant: ToastVariant, message: string, opts: ToastOpts = {}) => {
    const id = crypto.randomUUID()
    const toast: Toast = { id, message, variant, actionLabel: opts.actionLabel, onAction: opts.onAction }
    setToasts(prev => [...prev.slice(-2), toast]) // max 3 visible
    timers.current[id] = setTimeout(() => dismiss(id), opts.duration ?? 4000)
    return id
  }, [dismiss])

  const toast = React.useMemo(() => ({
    success: (msg: string, opts?: ToastOpts) => show('success', msg, opts),
    error:   (msg: string, opts?: ToastOpts) => show('error',   msg, opts),
    info:    (msg: string, opts?: ToastOpts) => show('info',    msg, opts),
    promise: async <T,>(
      promise: Promise<T>,
      messages: { loading: string; success: string; error: string },
    ): Promise<T> => {
      const id = show('info', messages.loading, { duration: 60000 })
      try {
        const result = await promise
        dismiss(id)
        show('success', messages.success)
        return result
      } catch (err) {
        dismiss(id)
        show('error', messages.error)
        throw err
      }
    },
  }), [show, dismiss])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Portal-like fixed container — sits above DeskDock (bottom-6 + ~56px = ~104px) */}
      <div className="fixed bottom-[104px] right-4 z-[200] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ─── Toast Item ───────────────────────────────────────────────────────────────

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  error:   <XCircle     className="w-4 h-4 text-red-400     shrink-0" />,
  info:    <Info        className="w-4 h-4 text-blue-400    shrink-0" />,
}

const BORDERS: Record<ToastVariant, string> = {
  success: 'border-emerald-500/30',
  error:   'border-red-500/30',
  info:    'border-blue-500/30',
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <div
      className={cn(
        'pointer-events-auto',
        'flex items-center gap-3 px-4 py-3 rounded-2xl',
        'bg-black/80 backdrop-blur-xl border shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
        'animate-[slideInRight_0.2s_ease-out]',
        BORDERS[t.variant],
        'max-w-[320px]',
      )}
    >
      {ICONS[t.variant]}
      <span className="text-[11px] font-medium text-white/90 leading-tight flex-1">{t.message}</span>
      {t.actionLabel && t.onAction && (
        <button
          onClick={() => { t.onAction?.(); onDismiss(t.id) }}
          className="text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-white transition-colors shrink-0"
        >
          {t.actionLabel}
        </button>
      )}
      <button
        onClick={() => onDismiss(t.id)}
        className="text-white/30 hover:text-white/60 transition-colors shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
