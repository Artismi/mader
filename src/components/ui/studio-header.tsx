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
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-5 sm:px-8">
      
      {/* Brand & Context Selector */}
      <div className="flex items-center gap-8">
        <div>
          <h1 className="flex items-center gap-2.5 font-display text-[29px] font-bold leading-none tracking-[-0.03em] text-ink">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-hot"><Sparkles className="h-4 w-4" aria-hidden /></span> Studio
          </h1>
          <p className="cos-kicker ml-[46px] mt-1">Produzione</p>
        </div>

        <div className="mx-2 hidden h-10 w-px bg-line md:block" />

        {/* Global Client Selector */}
        <div className="group relative">
          <div className="flex flex-col">
            <span className="cos-kicker mb-1.5 ml-4">Per il cliente</span>
            <div className="flex items-center gap-3 rounded-full bg-paper py-1.5 pl-1.5 pr-4 shadow-[inset_0_0_0_1.5px_var(--cos-line)] transition-shadow group-hover:shadow-[inset_0_0_0_1.5px_var(--cos-ink)] group-focus-within:shadow-[inset_0_0_0_1.5px_var(--cos-ink),0_0_0_4px_var(--cos-hot-soft)] cursor-pointer min-w-[200px]">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-sunk font-display text-[12px] font-bold text-ink">
                {selectedClient?.category === 'bando' ? <Landmark className="w-3.5 h-3.5" /> : selectedClient?.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold leading-none text-ink">{selectedClient?.name || 'Seleziona Cliente'}</p>
                {selectedClient?.sector && <p className="mt-1 text-[12px] text-ink-3">{selectedClient.sector}</p>}
              </div>
              <ChevronDown className="h-4 w-4 text-ink-3" aria-hidden />
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
        
        <div className="ml-2 flex items-center gap-2 border-l border-line pl-6">
          <button className="grid h-11 w-11 place-items-center rounded-full bg-paper text-ink-2 shadow-[inset_0_0_0_1.5px_var(--cos-line)] transition-shadow hover:text-ink hover:shadow-[inset_0_0_0_1.5px_var(--cos-ink)]" aria-label="Impostazioni dello Studio">
            <Settings2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
