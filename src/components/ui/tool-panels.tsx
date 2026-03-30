'use client'

import { useState } from 'react'
import { Bot, Sparkles, ChevronDown } from 'lucide-react'
import { AIChatWidget } from './ai-chat-widget'
import { PlannerWidget } from './planner-widget'

type Panel = 'chat' | 'planner' | null

export function ToolPanels() {
  const [open, setOpen] = useState<Panel>(null)

  const toggle = (panel: 'chat' | 'planner') => {
    setOpen(prev => prev === panel ? null : panel)
  }

  return (
    <div className="mt-16 border-t border-white/5">
      <div className="flex items-center gap-2 py-5">
        <button
          onClick={() => toggle('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
            open === 'chat'
              ? 'bg-accent/15 border-accent/25 text-accent'
              : 'bg-white/[0.03] border-white/8 text-white/30 hover:text-white/60 hover:border-white/15'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          Co-Pilot
          <ChevronDown className={`w-3 h-3 transition-transform ${open === 'chat' ? 'rotate-180' : ''}`} />
        </button>

        <button
          onClick={() => toggle('planner')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
            open === 'planner'
              ? 'bg-accent/15 border-accent/25 text-accent'
              : 'bg-white/[0.03] border-white/8 text-white/30 hover:text-white/60 hover:border-white/15'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Piano AI
          <ChevronDown className={`w-3 h-3 transition-transform ${open === 'planner' ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open === 'chat' && (
        <div className="pb-16 max-w-xl">
          <AIChatWidget />
        </div>
      )}

      {open === 'planner' && (
        <div className="pb-16 max-w-xl">
          <PlannerWidget />
        </div>
      )}
    </div>
  )
}
