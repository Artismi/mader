'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
const CreativeStudio = dynamic(() => import('../studio/creative-studio').then(m => m.CreativeStudio), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#0d0d0d] animate-pulse" />
})
import { upsertDesignProject, deleteDesignProject } from '@/app/actions'
import type { Client, DesignProject } from '@/lib/db'
import { useSidebar } from '@/components/layout/SidebarContext'
import { CanvasErrorBoundary } from '@/components/studio/canvas-error-boundary'

interface Props {
  clients: Client[]
  designProjects?: DesignProject[]
}

const MOODS = ['luxury','editorial','brutalist','minimal','tech','fashion','retro'] as const
const FORMATS = ['instagram_square','instagram_story','linkedin_post','poster_a4','banner_web'] as const

export function DesignWindow({ clients, designProjects = [] }: Props) {
  const [projects, setProjects] = useState<DesignProject[]>(designProjects)
  const { aiCommand, aiCommands, setCanvasSnapshot, clearAiCommands } = useSidebar()

  // Track last saved canvas state for recipe saving
  const [lastSave, setLastSave] = useState<{
    canvasState: string
    thumbnail?: string | null
    projectName: string
  } | null>(null)

  // Recipe modal state
  const [recipeModal, setRecipeModal] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [recipeMood, setRecipeMood] = useState<typeof MOODS[number]>('minimal')
  const [recipeFormat, setRecipeFormat] = useState<typeof FORMATS[number]>('instagram_square')
  const [recipeDesc, setRecipeDesc] = useState('')
  const [recipeSaving, setRecipeSaving] = useState(false)
  const [recipeDone, setRecipeDone] = useState(false)

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
    setProjects(prev => {
      const existing = prev.find(p => p.id === newId)
      const updated: DesignProject = {
        id: newId,
        client_id: data.clientId,
        brief_id: existing?.brief_id ?? null,
        name: data.name,
        type: existing?.type ?? 'board',
        canvas_state: data.canvasState,
        thumbnail: data.thumbnail ?? null,
        metadata: existing?.metadata ?? {},
        updated_at: new Date().toISOString(),
        created_at: existing?.created_at ?? new Date().toISOString(),
      }
      return existing
        ? prev.map(p => p.id === newId ? updated : p)
        : [updated, ...prev]
    })
    // Store for recipe saving
    setLastSave({ canvasState: data.canvasState, thumbnail: data.thumbnail, projectName: data.name })
    return newId
  }

  async function handleDelete(id: string): Promise<void> {
    await deleteDesignProject(id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  function openRecipeModal() {
    if (!lastSave) return
    setRecipeName(lastSave.projectName)
    setRecipeDone(false)
    setRecipeModal(true)
  }

  async function saveRecipe() {
    if (!lastSave || !recipeName) return
    setRecipeSaving(true)
    try {
      await fetch('/api/design/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recipeName,
          mood: recipeMood,
          format: recipeFormat,
          description: recipeDesc || null,
          canvas_state: lastSave.canvasState,
          thumbnail: lastSave.thumbnail ?? null,
          score: 80, // default score for manually saved recipes
          tags: [recipeMood, recipeFormat],
        }),
      })
      setRecipeDone(true)
      setTimeout(() => setRecipeModal(false), 1200)
    } finally {
      setRecipeSaving(false)
    }
  }

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      <CanvasErrorBoundary>
        <CreativeStudio
          clients={clients.map(c => ({ id: c.id, name: c.name }))}
          designProjects={projects}
          imageUrlQueue={null}
          onSaveProject={handleSave}
          onDeleteProject={handleDelete}
          onClientChange={() => {}}
          onAICommand={aiCommand}
          aiCommands={aiCommands}
          onClearAICommands={clearAiCommands}
          onCanvasSnapshot={setCanvasSnapshot}
        />
      </CanvasErrorBoundary>

      {/* Bottone Salva come ricetta — visibile solo dopo il primo salvataggio */}
      {lastSave && (
        <button
          onClick={openRecipeModal}
          title="Salva come ricetta di design riutilizzabile"
          className="absolute bottom-14 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#1a1a1a] border border-[#2a2a2a] text-[#a0a0a0] hover:text-white hover:border-[#444] transition-colors"
        >
          <span className="text-[10px]">✦</span> Ricetta
        </button>
      )}

      {/* Modal Salva come ricetta */}
      {recipeModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[360px] bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-4">Salva come ricetta</h3>

            {recipeDone ? (
              <p className="text-center text-green-400 text-sm py-4">Ricetta salvata ✓</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#666] block mb-1">Nome</label>
                  <input
                    value={recipeName}
                    onChange={e => setRecipeName(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#444]"
                    placeholder="es. Editorial Split Luxury"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-wider text-[#666] block mb-1">Mood</label>
                    <select
                      value={recipeMood}
                      onChange={e => setRecipeMood(e.target.value as typeof MOODS[number])}
                      className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white focus:outline-none"
                    >
                      {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-wider text-[#666] block mb-1">Formato</label>
                    <select
                      value={recipeFormat}
                      onChange={e => setRecipeFormat(e.target.value as typeof FORMATS[number])}
                      className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white focus:outline-none"
                    >
                      {FORMATS.map(f => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#666] block mb-1">Note (opzionale)</label>
                  <textarea
                    value={recipeDesc}
                    onChange={e => setRecipeDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-[#ccc] focus:outline-none focus:border-[#444] resize-none"
                    placeholder="Cosa rende questo layout efficace..."
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setRecipeModal(false)}
                    className="flex-1 py-2 rounded-lg text-xs text-[#666] hover:text-white border border-[#2a2a2a] hover:border-[#444] transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={saveRecipe}
                    disabled={recipeSaving || !recipeName}
                    className="flex-1 py-2 rounded-lg text-xs font-medium bg-white text-black hover:bg-[#e0e0e0] disabled:opacity-40 transition-colors"
                  >
                    {recipeSaving ? 'Salvo...' : 'Salva ricetta'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
