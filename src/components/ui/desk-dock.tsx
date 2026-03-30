'use client'

import React from 'react'
import { 
  LayoutDashboard, 
  Briefcase, 
  Lightbulb, 
  Users, 
  Library, 
  FileText, 
  Settings 
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const dockItems = [
  { icon: LayoutDashboard, label: 'Briefing', href: '/' },
  { icon: Briefcase, label: 'Incarichi', href: '/incarichi' },
  { icon: Lightbulb, label: 'Idee', href: '/idee' },
  { icon: Users, label: 'Clienti', href: '/clienti' },
  { icon: Library, label: 'Assets', href: '/assets' },
  { icon: FileText, label: 'Documenti', href: '/docs' },
  { icon: Settings, label: 'Impostazioni', href: '/settings' },
]

export function DeskDock() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]">
      <div className="glass-card px-3 py-3 rounded-[2rem] flex items-center gap-1 border-white/5 shadow-2xl">
        {dockItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-500 hover:bg-white/10 hover:-translate-y-1",
                isActive ? "bg-white/5 text-white shadow-inner" : "text-white/40"
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-transform duration-500", isActive ? "scale-110" : "group-hover:scale-110")} />
              
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest mt-1.5 transition-all duration-500",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}>
                {item.label}
              </span>

              {/* Active Indicator Dot */}
              {isActive && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_rgba(124,58,237,1)]" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
