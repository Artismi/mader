'use client'

import React, { createContext, useContext, useState } from 'react'

interface SidebarContextType {
  isVaultOpen: boolean
  isCoPilotOpen: boolean
  aiCommand: any | null
  aiCommands: any[]
  canvasSnapshot: string | null
  toggleVault: () => void
  toggleCoPilot: () => void
  setVaultOpen: (open: boolean) => void
  setCoPilotOpen: (open: boolean) => void
  setAiCommand: (command: any) => void
  pushAiCommand: (command: any) => void
  clearAiCommands: () => void
  setCanvasSnapshot: (snapshot: string | null) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isVaultOpen, setVaultOpen] = useState(false)
  const [isCoPilotOpen, setCoPilotOpen] = useState(false)
  const [aiCommand, setAiCommand] = useState<any | null>(null)
  const [aiCommands, setAiCommands] = useState<any[]>([])
  const [canvasSnapshot, setCanvasSnapshot] = useState<string | null>(null)

  const toggleVault = () => setVaultOpen(prev => !prev)
  const toggleCoPilot = () => setCoPilotOpen(prev => !prev)

  const pushAiCommand = (command: any) => {
    setAiCommands(prev => [...prev, command])
  }

  const clearAiCommands = () => setAiCommands([])

  return (
    <SidebarContext.Provider
      value={{
        isVaultOpen,
        isCoPilotOpen,
        aiCommand,
        aiCommands,
        canvasSnapshot,
        toggleVault,
        toggleCoPilot,
        setVaultOpen,
        setCoPilotOpen,
        setAiCommand,
        pushAiCommand,
        clearAiCommands,
        setCanvasSnapshot,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
