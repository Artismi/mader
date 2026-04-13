'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidePanelProps {
  open: boolean
  onClose: () => void
  title?: string
  width?: string
  children: React.ReactNode
}

export function SidePanel({ open, onClose, title, width = 'w-[480px]', children }: SidePanelProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 z-[151] flex flex-col',
          width,
          'bg-[#0F0F1A] border-l border-white/10',
          'shadow-[-20px_0_60px_rgba(0,0,0,0.6)]',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] shrink-0">
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/50">
              {title}
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.07] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  )
}
