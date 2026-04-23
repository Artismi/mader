import { useState, useRef, useEffect } from 'react'
import * as fabric from 'fabric'
import { sanitizeCanvasJSON } from './use-canvas-history'

interface SavePayload {
  id: string | null
  name: string
  clientId: string | null
  canvasState: string
  thumbnail?: string | null
  semanticManifest?: string
  userDescription?: string
}

interface DesignProjectItem {
  id: string
  client_id: string | null
  name: string
  canvas_state: string | null
  updated_at: string
  metadata?: string | Record<string, any>
}

/**
 * Manages project persistence: current project identity, dirty state,
 * autosave debounce, manual save/load, and new project creation.
 */
export function useProjectSync(
  fabricRef: React.RefObject<fabric.Canvas | null>,
  onSaveProject: ((data: SavePayload) => Promise<string>) | undefined,
  onClientChange: ((clientId: string | null) => void) | undefined,
  callbacks: {
    syncActiveArtboardAfterLoad: (canvas: fabric.Canvas) => void
    resetHistory: () => void
    setShowSaveDialog: (v: boolean) => void
    setShowProjectList: (v: boolean) => void
    setActiveArtboardId: (id: string | null) => void
    getManifest?: () => string
    onAfterLoad?: (canvas: fabric.Canvas) => void
  },
) {
  const [saving, setSaving]                         = useState(false)
  const [isDirty, setIsDirty]                       = useState(false)
  const [currentProjectId, setCurrentProjectId]     = useState<string | null>(null)
  const [currentProjectName, setCurrentProjectName] = useState('Senza titolo')
  const [currentClientId, setCurrentClientId]       = useState<string | null>(null)
  const [currentUserDescription, setCurrentUserDescription] = useState('')

  // Ref mirrors — stable references for Fabric event handlers and async callbacks
  const autoSaveRef          = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentProjectIdRef  = useRef<string | null>(null)
  const currentProjectNameRef = useRef<string>('Senza titolo')
  const currentClientIdRef   = useRef<string | null>(null)
  const currentUserDescriptionRef = useRef<string>('')

  useEffect(() => { currentProjectIdRef.current  = currentProjectId   }, [currentProjectId])
  useEffect(() => { currentProjectNameRef.current = currentProjectName }, [currentProjectName])
  useEffect(() => { currentClientIdRef.current   = currentClientId    }, [currentClientId])
  useEffect(() => { currentUserDescriptionRef.current = currentUserDescription }, [currentUserDescription])

  // ── Canvas serialization ────────────────────────────────────────────────────

  function getCanvasState(): string {
    const canvas = fabricRef.current; if (!canvas) return '{}'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return JSON.stringify((canvas as any).toJSON([
      'objId', 'name', 'hasStartArrow', 'hasEndArrow', 'isConnector',
      'startObjId', 'endObjId', 'vertexConnections', 'artboardExportType', 'isArtboard',
      'parentBoard',
    ]))
  }

  // ── Autosave — debounced 2500ms ─────────────────────────────────────────────

  function scheduleAutoSave() {
    if (!currentProjectIdRef.current || !onSaveProject) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    setIsDirty(true)
    autoSaveRef.current = setTimeout(async () => {
      if (!currentProjectIdRef.current || !onSaveProject) return
      const state = getCanvasState()
      await onSaveProject({
        id:          currentProjectIdRef.current,
        name:        currentProjectNameRef.current,
        clientId:    currentClientIdRef.current,
        canvasState: state,
        // Autosave doesn't usually trigger manifest re-gen for performance
      })
      setIsDirty(false)
    }, 2500)
  }

  // ── Manual save (Ctrl+S) ────────────────────────────────────────────────────

  async function triggerSave() {
    if (!onSaveProject) return
    if (currentProjectIdRef.current) {
      setSaving(true)
      const state = getCanvasState()
      const manifest = callbacks.getManifest?.()
      
      await onSaveProject({
        id:          currentProjectIdRef.current,
        name:        currentProjectNameRef.current,
        clientId:    currentClientIdRef.current,
        canvasState: state,
        semanticManifest: manifest,
        userDescription: currentUserDescriptionRef.current,
      })
      setIsDirty(false)
      setTimeout(() => setSaving(false), 1200)
    } else {
      callbacks.setShowSaveDialog(true)
    }
  }

  // ── Save dialog confirmation ────────────────────────────────────────────────

  async function saveProject(name: string, clientId: string | null, userDescription: string = '') {
    if (!onSaveProject) return
    setSaving(true)
    const state = getCanvasState()
    const manifest = callbacks.getManifest?.()

    const newId = await onSaveProject({ 
        id: currentProjectId, 
        name, 
        clientId, 
        canvasState: state,
        semanticManifest: manifest,
        userDescription: userDescription || currentUserDescription
    })
    
    setCurrentProjectId(newId)
    setCurrentProjectName(name)
    setCurrentClientId(clientId)
    setCurrentUserDescription(userDescription || currentUserDescription)
    setCurrentUserDescription(userDescription || currentUserDescription)
    setIsDirty(false)
    callbacks.setShowSaveDialog(false)
    if (clientId) onClientChange?.(clientId)
    setTimeout(() => setSaving(false), 1200)
  }

  // ── Load project ────────────────────────────────────────────────────────────

  async function loadProject(project: DesignProjectItem) {
    const canvas = fabricRef.current; if (!canvas) return
    setCurrentProjectId(project.id)
    setCurrentProjectName(project.name)
    setCurrentClientId(project.client_id)
    
    // Extract user description from metadata
    let userDesc = ''
    if (project.metadata) {
      try {
        const meta = typeof project.metadata === 'string' ? JSON.parse(project.metadata) : project.metadata
        userDesc = meta.userDescription || ''
      } catch (e) {
        console.warn('[loadProject] Metadata parse error:', e)
      }
    }
    setCurrentUserDescription(userDesc)

    callbacks.setShowProjectList(false)
    if (project.canvas_state) {
      try {
        await canvas.loadFromJSON(JSON.parse(sanitizeCanvasJSON(project.canvas_state)))
        // Purge any video placeholder objects — blob: URLs stored in canvas_state
        // have expired.  Video elements cannot be restored from JSON; the user
        // must re-add videos manually.
        canvas.getObjects()
          .filter(o => (o as any).name?.startsWith('video_'))
          .forEach(o => canvas.remove(o))
        canvas.renderAll()
        callbacks.syncActiveArtboardAfterLoad(canvas)
        callbacks.onAfterLoad?.(canvas)
      } catch (err) {
        console.warn('[loadProject] Error:', err)
      }
    } else {
      canvas.clear(); canvas.backgroundColor = '#111111'; canvas.renderAll()
      callbacks.setActiveArtboardId(null)
    }
    callbacks.resetHistory()
    setIsDirty(false)
    if (project.client_id) onClientChange?.(project.client_id)
  }

  // ── New project ─────────────────────────────────────────────────────────────

  function newProject() {
    const canvas = fabricRef.current; if (!canvas) return
    setCurrentProjectId(null)
    setCurrentProjectName('Senza titolo')
    setCurrentClientId(null)
    setCurrentUserDescription('')
    callbacks.setShowProjectList(false)
    canvas.clear(); canvas.backgroundColor = '#111111'; canvas.renderAll()
    callbacks.resetHistory()
    setIsDirty(false)
  }

  return {
    // State (needed by JSX)
    saving,
    isDirty,
    currentProjectId,
    currentProjectName,
    currentClientId,
    currentUserDescription,
    // Stable refs (needed by Fabric event handlers)
    currentProjectIdRef,
    currentProjectNameRef,
    currentClientIdRef,
    // Functions
    getCanvasState,
    scheduleAutoSave,
    triggerSave,
    saveProject,
    loadProject,
    newProject,
    setCurrentUserDescription,
  }
}
