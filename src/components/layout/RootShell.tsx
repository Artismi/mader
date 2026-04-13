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
  const isOverlay = pathname === '/overlay'

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

  if (isOverlay) {
    return <>{children}</>
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[#050505]">
      <Header />

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* LEFT DOCK: VAULT */}
        <div className={cn(
          "h-full transition-all duration-500 ease-in-out border-r border-white/5 bg-[#090909] overflow-hidden",
          isVaultOpen ? "w-64" : "w-0"
        )}>
          <div className="w-64 h-full"> {/* Inner wrapper to prevent squishing during trans */}
            <StudioAssetSidebar client={selectedClient} />
          </div>
        </div>

        {/* CENTER: MAIN WORKSPACE */}
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {zoomFeedback !== null && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-[100] -translate-x-1/2 rounded-xl border border-white/10 bg-black/85 px-3 py-1.5 shadow-lg backdrop-blur-xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
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
          "h-full transition-all duration-500 ease-in-out border-l border-white/5 bg-[#090909] overflow-hidden",
          isCoPilotOpen ? "w-[400px]" : "w-0"
        )}>
          <div className="flex h-full w-[400px] flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 bg-white/[0.02] px-3 py-2">
               <div className="flex items-center gap-2">
                 <Sparkles className="h-3.5 w-3.5 text-accent" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Co-Pilot</span>
               </div>
               <button type="button" onClick={() => setCoPilotOpen(false)} className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white" aria-label="Chiudi pannello AI">
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

