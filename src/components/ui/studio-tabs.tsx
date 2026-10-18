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
    <div className="flex rounded-full bg-sunk p-1">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon
        return (
          <Link
            key={tab.id}
            href={`/studio?tab=${tab.id}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
              isActive
                ? "bg-ink text-paper"
                : "text-ink-2 hover:bg-paper hover:text-ink"
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
