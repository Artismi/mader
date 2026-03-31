'use client'

import React from 'react'
import {
  LayoutDashboard,
  Briefcase,
  Lightbulb,
  Users,
  Library,
  FileText,
  Settings,
  PenTool,
  Send
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const dockItems = [
  { icon: LayoutDashboard, label: 'Briefing', href: '/' },
  { icon: Briefcase, label: 'Incarichi', href: '/incarichi' },
  { icon: Lightbulb, label: 'Idee', href: '/idee' },
  { icon: Send, label: 'Pubblica', href: '/pubblica' },
  { icon: Users, label: 'Clienti', href: '/clienti' },
  { icon: Library, label: 'Assets', href: '/assets' },
  { icon: PenTool, label: 'Progettaz.', href: '/progettazione' },
  { icon: FileText, label: 'Finanze', href: '/finanze' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

export function DeskDock() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]">
      <div className="bg-black/40 backdrop-blur-xl px-4 py-3 rounded-[2.5rem] flex items-center gap-1 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {dockItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-500 hover:bg-white/10 hover:-translate-y-2",
                isActive ? "bg-white/10 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]" : "text-white/60 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-transform duration-500", isActive ? "scale-110" : "group-hover:scale-110")} />
              
              <span className={cn(
                "text-[9px] font-black uppercase tracking-[0.2em] mt-1.5 transition-all duration-500",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}>
                {item.label}
              </span>

              {/* Active Indicator Dot */}
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent rounded-full shadow-[0_0_10px_rgba(124,58,237,1)]" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
