import { useRef } from 'react'
import * as fabric from 'fabric'
import { serializeCanvas } from '../canvas-serial'

// 1×1 transparent GIF — smallest valid image Fabric can decode without errors.
const BLANK_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/**
 * Replace any `"src":"data:,"` entries produced by old saves with a valid
 * blank GIF so Fabric doesn't crash during loadFromJSON.
 * Video placeholder objects are then purged by purgeVideoPlaceholders().
 */
export function sanitizeCanvasJSON(jsonStr: string): string {
  return jsonStr.replace(/"src"\s*:\s*"data:,"/g, `"src":"${BLANK_GIF}"`)
}

/**
 * Manages the undo/redo history stack for the Fabric.js canvas.
 *
 * History is stored as an array of serialized canvas JSON snapshots.
 * The current position in the stack is tracked by histIdxRef.
 * pushHistory() appends a snapshot and trims any forward (redo) entries.
 * undo/redo restore a snapshot via canvas.loadFromJSON() and re-sync
 * the active artboard state with syncActiveArtboardAfterLoad().
 *
 * @param fabricRef         - Ref to the live fabric.Canvas instance
 * @param activeArtboardIdRef - Ref mirror of the activeArtboardId state
 * @param setActiveArtboardId - State setter to update the active artboard
 */
export function useCanvasHistory(
  fabricRef: React.RefObject<fabric.Canvas | null>,
  activeArtboardIdRef: React.RefObject<string | null>,
  setActiveArtboardId: (id: string | null) => void,
) {
  const historyRef = useRef<string[]>([])
  const histIdxRef = useRef<number>(-1)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  // true mentre si ricarica uno stato (annulla, ripeti, apertura progetto):
  // gli eventi object:added/removed generati dal caricamento non sono modifiche
  const restoringRef = useRef(false)

  /** Esegue un caricamento senza registrare passi di cronologia */
  async function restoring<T>(fn: () => Promise<T>): Promise<T> {
    restoringRef.current = true
    try { return await fn() } finally { restoringRef.current = false }
  }

  /** registra subito lo stato della tela (se è cambiato) */
  function record() {
    const canvas = fabricRef.current; if (!canvas || restoringRef.current) return
    const json = serializeCanvas(canvas)
    // dopo un annulla, una modifica nuova cancella il "futuro"
    if (histIdxRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1)
    }
    if (historyRef.current.length > 0 && historyRef.current[historyRef.current.length - 1] === json) return
    historyRef.current.push(json)
    histIdxRef.current = historyRef.current.length - 1
    // al massimo 50 passi
    if (historyRef.current.length > 50) {
      historyRef.current.shift()
      histIdxRef.current--
    }
  }

  /**
   * Aggiunge lo stato attuale alla cronologia. Le modifiche ravvicinate
   * (un raggruppamento sono più eventi) diventano un passo solo, dopo 500 ms;
   * `immediate` lo registra subito (stato di partenza, fine di un caricamento).
   */
  function pushHistory(immediate = false) {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    if (restoringRef.current) return
    if (immediate) record()
    else debounceTimerRef.current = setTimeout(() => { debounceTimerRef.current = null; record() }, 500)
  }

  /** registra il passo in attesa, se c'è: va fatto prima di annullare o ripetere */
  function flushHistory() {
    if (!debounceTimerRef.current) return
    clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = null
    record()
  }

  /**
   * After any canvas reload (undo/redo/loadProject), re-sync which artboard
   * is considered active. Prefers the previously active artboard if it still
   * exists on the canvas, otherwise falls back to the first artboard found.
   */
  function syncActiveArtboardAfterLoad(canvas: fabric.Canvas) {
    const all = canvas.getObjects()
    const artboards = all.filter(o => (o as any).isArtboard || o.get('name')?.startsWith('artboard_'))
    if (artboards.length === 0) { setActiveArtboardId(null); return }
    const currentId = activeArtboardIdRef.current
    const stillExists = currentId ? artboards.find(o => o.get('name') === currentId) : null
    const target = stillExists || artboards[0]
    setActiveArtboardId(target.get('name') || null)
  }

  /**
   * Remove any video placeholder objects that Fabric re-created from JSON.
   * Video objects store a blob: URL in their src; blob URLs expire between
   * sessions / hot-reloads.  addVideoToCanvas overrides toObject() to emit
   * src:'data:,' so the URL never enters the JSON, but the resulting
   * deserialized Image is a blank placeholder — purge it so the canvas
   * doesn't show a broken frame.  Live video elements can't be restored from
   * JSON anyway (they reference a browser media resource).
   */
  function purgeVideoPlaceholders(canvas: fabric.Canvas) {
    canvas.getObjects()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter(o => (o as any).name?.startsWith('video_'))
      .forEach(o => canvas.remove(o))
  }

  function load(canvas: fabric.Canvas, json: string) {
    const keepBg = canvas.backgroundColor
    restoring(() => canvas.loadFromJSON(JSON.parse(sanitizeCanvasJSON(json)))).then(() => {
      if (!canvas.backgroundColor) canvas.backgroundColor = keepBg
      purgeVideoPlaceholders(canvas)
      canvas.discardActiveObject()
      canvas.renderAll()
      syncActiveArtboardAfterLoad(canvas)
      canvas.fire('history:restored' as never)
    })
  }

  function undo() {
    const canvas = fabricRef.current
    if (!canvas || restoringRef.current) return
    flushHistory()
    if (histIdxRef.current <= 0) return
    histIdxRef.current--
    load(canvas, historyRef.current[histIdxRef.current])
  }

  function redo() {
    const canvas = fabricRef.current
    if (!canvas || restoringRef.current) return
    flushHistory()
    if (histIdxRef.current >= historyRef.current.length - 1) return
    histIdxRef.current++
    load(canvas, historyRef.current[histIdxRef.current])
  }

  /** Clear the history stack (call on loadProject / newProject). */
  function resetHistory() {
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null }
    historyRef.current = []
    histIdxRef.current = -1
  }

  return { pushHistory, undo, redo, syncActiveArtboardAfterLoad, resetHistory, restoring, restoringRef }
}
