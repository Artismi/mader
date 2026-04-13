'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
const CreativeStudio = dynamic(() => import('../studio/creative-studio').then(m => m.CreativeStudio), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#0d0d0d] animate-pulse" />
})
import { StudioAssetSidebar } from '@/components/ui/studio-asset-sidebar'
import { upsertDesignProject, deleteDesignProject } from '@/app/actions'
import type { Client, DesignProject } from '@/lib/db'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/layout/SidebarContext'

interface Props {
  clients: Client[]
  designProjects?: DesignProject[]
}

export function DesignWindow({ clients, designProjects = [] }: Props) {
  const [imgQueue, setImgQueue] = useState<string | null>(null)
  const [projects, setProjects] = useState<DesignProject[]>(designProjects)
  // Selected client for the asset sidebar — managed globally by AppContext
  // but we can still listen to onClientChange if needed
  const { aiCommand, aiCommands, setCanvasSnapshot, clearAiCommands } = useSidebar()
  const sidebarClient = clients.find(c => c.id === clients[0]?.id) // Fallback or sync

  async function handleSave(data: {
    id: string | null
    name: string
    clientId: string | null
    canvasState: string
    thumbnail?: string | null
    semanticManifest?: string
    userDescription?: string
  }): Promise<string> {
    const newId = await upsertDesignProject({
      id: data.id ?? undefined,
      clientId: data.clientId,
      name: data.name,
      canvasState: data.canvasState,
      thumbnail: data.thumbnail,
      semanticManifest: data.semanticManifest,
      userDescription: data.userDescription,
    })
    // Optimistically update local list
    setProjects(prev => {
      const existing = prev.find(p => p.id === newId)
      const updated: DesignProject = {
        id: newId,
        client_id: data.clientId,
        name: data.name,
        canvas_state: data.canvasState,
        thumbnail: data.thumbnail ?? null,
        updated_at: new Date().toISOString(),
        created_at: existing?.created_at ?? new Date().toISOString(),
      }
      return existing
        ? prev.map(p => p.id === newId ? updated : p)
        : [updated, ...prev]
    })
    return newId
  }

  async function handleDelete(id: string): Promise<void> {
    await deleteDesignProject(id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  // Removed local useChat as it's now global in RootShell

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      <CreativeStudio
        clients={clients.map(c => ({ id: c.id, name: c.name }))}
        designProjects={projects}
        imageUrlQueue={imgQueue}
        onSaveProject={handleSave}
        onDeleteProject={handleDelete}
        onClientChange={() => {}}
        onAICommand={aiCommand}
        aiCommands={aiCommands}
        onClearAICommands={clearAiCommands}
        onCanvasSnapshot={setCanvasSnapshot}
      />
    </div>
  )
}
