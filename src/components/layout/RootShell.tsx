'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { DeskDock } from '@/components/ui/desk-dock'
import dynamic from 'next/dynamic'
const AIChatWidget = dynamic(
  () => import('@/components/ui/ai-chat-widget').then(mod => mod.AIChatWidget),
  { ssr: false }
)
import { Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppProvider, useApp } from './AppContext'
import { SidebarProvider, useSidebar } from './SidebarContext'
import { StudioAssetSidebar } from '@/components/ui/studio-asset-sidebar'


const ContextGraphAssembler = dynamic(
  () => import('@/components/ui/context-graph-assembler').then(mod => mod.ContextGraphAssembler),
  { ssr: false }
)

export function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <SidebarProvider>
        <RootShellContent>{children}</RootShellContent>
      </SidebarProvider>
    </AppProvider>
  )
}

function RootShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isVaultOpen, isCoPilotOpen, setCoPilotOpen } = useSidebar()
  const { clients, selectedClientId } = useApp()
  const selectedClient = clients.find(c => c.id === selectedClientId)

  // 0 = Chiuso/Normale, 1 = Context Graph (Immersivo)
  const [aiState, setAiState] = useState<0 | 1>(0)
  const [zoomFeedback, setZoomFeedback] = useState<number | null>(null)
  // Rotte che non usano la shell legacy: overlay Electron e nuovo guscio circolare
  const isOverlay = pathname === '/overlay' || pathname?.startsWith('/os')

  // Global UI Zoom control using IPC (Ctrl++ / Ctrl-- / Ctrl-0)
  useEffect(() => {
    let timeout: any
    const handleZoom = async (e: KeyboardEvent) => {
      // Support common zoom patterns (Ctrl++, Ctrl--, Ctrl0)
      const isZoomIn = (e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=' || e.code === 'Equal' || e.code === 'NumpadAdd')
      const isZoomOut = (e.ctrlKey || e.metaKey) && (e.key === '-' || e.code === 'Minus' || e.code === 'NumpadSubtract')
      const isZoomReset = (e.ctrlKey || e.metaKey) && (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0')

      if (!isZoomIn && !isZoomOut && !isZoomReset) return
      
      const api = (window as any).electronAPI
      if (!api || typeof api.getZoomFactor !== 'function') {
        console.warn('Electron Zoom API not yet available (App restart required)')
        return
      }

      try {
        let nextZoom = 1.0
        if (isZoomIn) {
          const current = await api.getZoomFactor()
          nextZoom = Math.min(3, current + 0.1)
        } else if (isZoomOut) {
          const current = await api.getZoomFactor()
          nextZoom = Math.max(0.3, current - 0.1)
        } else if (isZoomReset) {
          nextZoom = 1.0
        }

        await api.setZoomFactor(nextZoom)
        
        // Visual Feedback
        setZoomFeedback(nextZoom)
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => setZoomFeedback(null), 1500)
        
      } catch (err) {
        console.error('Zoom error:', err)
      }
    }
    window.addEventListener('keydown', handleZoom)
    return () => {
      window.removeEventListener('keydown', handleZoom)
      if (timeout) clearTimeout(timeout)
    }
  }, [])

  if (pathname === '/overlay') return <>{children}</>
  // guscio circolare: niente barra legacy, ma il Co-Pilot resta a portata di mano
  if (isOverlay) {
    return (
      <>
        {children}
        <CoPilotFloat open={isCoPilotOpen} setOpen={setCoPilotOpen} />
      </>
    )
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden desk-surface">
      <Header />

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* LEFT DOCK: VAULT */}
        <div className={cn(
          "h-full transition-all duration-300 ease-[var(--cos-ease)] overflow-hidden",
          isVaultOpen ? "w-64 pl-3" : "w-0"
        )}>
          <div className="w-[244px] h-full overflow-hidden rounded-[30px] bg-paper shadow-[0_0_0_1px_var(--cos-line)]"> {/* Inner wrapper to prevent squishing during trans */}
            <StudioAssetSidebar client={selectedClient} />
          </div>
        </div>

        {/* CENTER: MAIN WORKSPACE */}
        <main className="relative mx-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-paper shadow-[var(--cos-shadow-2)] sm:mx-3 sm:rounded-[40px]">
          {zoomFeedback !== null && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-[100] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-paper shadow-lg">
              <span className="cos-kicker !text-paper">
                Zoom {Math.round(zoomFeedback * 100)}%
              </span>
            </div>
          )}

          <div className="relative min-h-0 flex-1 w-full overflow-x-hidden overflow-y-auto">
            {children}
          </div>
        </main>

        {/* RIGHT DOCK: CO-PILOT */}
        <div className={cn(
          "h-full transition-all duration-300 ease-[var(--cos-ease)] overflow-hidden",
          isCoPilotOpen ? "w-[412px] pr-3" : "w-0"
        )}>
          <div className="flex h-full w-[400px] flex-col overflow-hidden rounded-[30px] bg-paper shadow-[0_0_0_1px_var(--cos-line)]">
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
               <div className="flex items-center gap-2">
                 <Sparkles className="h-3.5 w-3.5 text-accent" />
                 <span className="cos-kicker">Co-Pilot</span>
               </div>
               <button type="button" onClick={() => setCoPilotOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunk hover:text-ink" aria-label="Chiudi pannello AI">
                 <X className="h-4 w-4" />
               </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <AIChatWidget />
            </div>
          </div>
        </div>
      </div>

      {/* State 1: Full Immersive Context Graph Assembler (Modal-like) */}
      <div 
        className={cn(
          "fixed inset-0 z-[150] transition-all duration-700 ease-in-out transform bg-black/95 backdrop-blur-3xl overflow-hidden",
          aiState === 1 ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none delay-200"
        )}
      >
        <ContextGraphAssembler isActive={aiState === 1} onExecute={() => { setAiState(0); setCoPilotOpen(true) }} />
      </div>

      <DeskDock />
    </div>
  )
}

/** Co-Pilot nel guscio: chat in un pannello laterale. Si apre dalla pillola in basso (guscio) o dal campo AI (Studio), oppure con Ctrl J. */
function CoPilotFloat({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <>
      <div
        className={cn(
          'fixed bottom-2 right-2 top-2 z-[300] flex w-[400px] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-[30px] bg-paper shadow-[var(--cos-shadow-2)] transition-transform duration-300 ease-[var(--cos-ease)]',
          open ? 'translate-x-0' : 'pointer-events-none translate-x-[110%]',
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="cos-kicker">Co-Pilot</span>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunk hover:text-ink" aria-label="Chiudi pannello AI">
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* sempre montata: chiudendo il pannello la conversazione resta */}
        <div className="relative flex-1 overflow-hidden"><AIChatWidget /></div>
      </div>
    </>
  )
}
