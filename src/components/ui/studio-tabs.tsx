'use client'

import { cn } from '@/lib/utils'
import { CalendarDays, Send, Lightbulb, PenTool } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const TABS = [
  { id: 'editoriale',   label: 'Editoriale',   icon: CalendarDays },
  { id: 'pubblica',     label: 'Lancio',      icon: Send },
  { id: 'idee',         label: 'Idee',         icon: Lightbulb },
  { id: 'progettazione', label: 'Progettaz.', icon: PenTool },
]

export function StudioTabs({ activeTab }: { activeTab: string }) {
  return (
    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 shadow-inner">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon
        return (
          <Link
            key={tab.id}
            href={`/studio?tab=${tab.id}`}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              isActive 
                ? "bg-white/10 text-white border border-white/10 shadow-sm" 
                : "text-white/20 hover:text-white/40"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
