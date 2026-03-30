'use client'

import { useState } from 'react'
import { Bot, ChevronDown } from 'lucide-react'
import { AIChatWidget } from './ai-chat-widget'

export function ToolPanels() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-16 border-t border-white/5">
      <div className="flex items-center gap-2 py-5">
        <button
          onClick={() => setOpen(prev => !prev)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
            open
              ? 'bg-accent/15 border-accent/25 text-accent'
              : 'bg-white/[0.03] border-white/8 text-white/30 hover:text-white/60 hover:border-white/15'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          Co-Pilot
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="pb-16 max-w-xl">
          <AIChatWidget />
        </div>
      )}
    </div>
  )
}
