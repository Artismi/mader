'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface Client {
  id: string
  name: string
  email?: string
  sector?: string
  category: 'cliente' | 'bando'
  vault_path?: string
  figjam_board_id?: string
  canvas_state?: string
  created_at: string
}

interface AppContextType {
  clients: Client[]
  selectedClientId: string
  setSelectedClientId: (id: string) => void
  loading: boolean
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => {
        setClients(data)
        if (data.length > 0) setSelectedClientId(data[0].id)
      })
      .catch(err => console.error('AppContext clients fetch:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppContext.Provider value={{ clients, selectedClientId, setSelectedClientId, loading }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
