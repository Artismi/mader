'use client'

import React from 'react'
import { Users, ChevronDown, LayoutGrid, Settings2, Sparkles, FolderOpen, Landmark } from 'lucide-react'
import { StudioTabs } from './studio-tabs'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  name: string
  category?: 'cliente' | 'bando'
  sector?: string
}

interface Props {
  clients: Client[]
  selectedClientId: string
  onSelectClient: (id: string) => void
  activeTab: string
}

export function StudioHeader({ clients, selectedClientId, onSelectClient, activeTab }: Props) {
  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.06] bg-[#090909] shadow-2xl">
      
      {/* Brand & Context Selector */}
      <div className="flex items-center gap-8">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white/90 uppercase flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> Studio
          </h1>
          <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.2em] mt-0.5 ml-7">Production Hub</p>
        </div>

        <div className="h-8 w-px bg-white/10 mx-2" />

        {/* Global Client Selector */}
        <div className="group relative">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-1 mb-1">Contesto Attivo</span>
            <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:bg-white/[0.06] hover:border-white/20 transition-all cursor-pointer min-w-[200px]">
              <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center text-[10px] font-black text-accent/80">
                {selectedClient?.category === 'bando' ? <Landmark className="w-3.5 h-3.5" /> : selectedClient?.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white/80 leading-none">{selectedClient?.name || 'Seleziona Cliente'}</p>
                {selectedClient?.sector && <p className="text-[9px] text-white/20 uppercase tracking-wider mt-1">{selectedClient.sector}</p>}
              </div>
              <ChevronDown className="w-4 h-4 text-white/20" />
            </div>
          </div>

          {/* Dropdown (Simplified for now) */}
          <select
            value={selectedClientId}
            onChange={(e) => onSelectClient(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs & Tools */}
      <div className="flex items-center gap-6">
        <StudioTabs activeTab={activeTab} />
        
        <div className="flex items-center gap-2 border-l border-white/10 pl-6 ml-2">
          <button className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10 transition-all">
            <Settings2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
