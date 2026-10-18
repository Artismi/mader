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
      className="shrink-0 px-2 pb-2 pt-1.5"
      aria-label="Accesso rapido sezioni"
    >
      <div className="mx-auto flex w-fit max-w-full items-center gap-0.5 overflow-x-auto overflow-y-hidden rounded-full bg-paper p-1.5 shadow-[var(--cos-shadow-1)] scrollbar-hide sm:gap-1">
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
                'group flex shrink-0 items-center gap-2 rounded-full p-1 pr-1 transition-[background,box-shadow] duration-200 active:scale-[0.97]',
                isActive ? 'bg-ink pr-4 text-paper' : 'text-ink-2 hover:bg-sunk hover:text-ink',
              )}
            >
              {isLoading ? (
                <span className="grid h-9 w-9 place-items-center"><span className="cos-reg !h-4 !w-4" /></span>
              ) : (
                <item.icon
                  className={cn(
                    'box-content h-[18px] w-[18px] shrink-0 rounded-full p-[9px] transition-colors',
                    isActive ? 'bg-hot text-ink' : '',
                  )}
                  strokeWidth={1.75}
                />
              )}
              <span
                className={cn(
                  'whitespace-nowrap text-[13px] font-semibold',
                  isActive ? 'block' : 'sr-only',
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
