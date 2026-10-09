'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './button'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

/** Basato su <dialog> nativo: focus trap, Esc e backdrop gestiti dal browser */
export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={e => { if (e.target === ref.current) onClose() }}
      className="m-auto w-[min(560px,calc(100vw-32px))] rounded-ds-md border border-ds-ink bg-ds-surface p-0 text-ds-text shadow-ds-3 backdrop:bg-ds-ink/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 border-b border-ds-line px-5 py-3">
        <h2 className="ds-shout flex-1 text-ds-lg">{title}</h2>
        <IconButton label="Chiudi" size="sm" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-ds-line px-5 py-3">{footer}</div>}
    </dialog>
  )
}
