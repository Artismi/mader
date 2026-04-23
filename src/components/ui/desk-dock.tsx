'use client'

import React, { useTransition } from 'react'
import {
  LayoutDashboard,
  Inbox,
  Film,
  Rocket,
  Users,
  Brain,
  FileText,
  Palette,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const dockItems = [
  { icon: LayoutDashboard, label: 'Oggi', href: '/' },
  { icon: Inbox, label: 'Inbox', href: '/inbox' },
  { icon: Film, label: 'Produzione', href: '/editoriale' },
  { icon: Palette, label: 'Design', href: '/progettazione' },
  { icon: Rocket, label: 'Lancio', href: '/lancio' },
  { icon: Users, label: 'Clienti', href: '/clienti' },
  { icon: Brain, label: 'Memoria', href: '/memoria' },
  { icon: FileText, label: 'Finanze', href: '/finanze' },
]

export function DeskDock() {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingHref, setPendingHref] = React.useState<string | null>(null)

  function navigate(href: string) {
    setPendingHref(href)
    startTransition(() => {
      router.push(href)
    })
  }

  React.useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  return (
    <nav
      className="shrink-0 border-t border-white/[0.07] bg-[#060606] py-1.5"
      aria-label="Accesso rapido sezioni"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-0.5 overflow-x-auto overflow-y-hidden px-2 scrollbar-hide sm:gap-1">
        {dockItems.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const isLoading = isPending && pendingHref === item.href

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => navigate(item.href)}
              title={item.label}
              className={cn(
                'group flex shrink-0 flex-col items-center justify-center rounded-xl px-2 py-1.5 sm:w-[4.25rem] sm:px-0',
                'transition-colors duration-150 active:scale-[0.97]',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:bg-white/[0.06] hover:text-white/85',
              )}
            >
              {isLoading ? (
                <span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white/75 animate-spin" />
              ) : (
                <item.icon
                  className={cn(
                    'h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5',
                    isActive ? 'scale-105' : '',
                  )}
                />
              )}
              <span
                className={cn(
                  'mt-0.5 max-w-[4.5rem] truncate text-[6px] font-black uppercase tracking-wider sm:mt-1 sm:max-w-none sm:text-[7px] sm:tracking-[0.14em]',
                  isActive || isLoading ? 'text-white/90' : 'text-white/35 group-hover:text-white/55',
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
