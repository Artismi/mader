import { useRef } from 'react'
import * as fabric from 'fabric'

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

  /** Append the current canvas state to the history stack. */
  function pushHistory(immediate = false) {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const performPush = () => {
      const canvas = fabricRef.current; if (!canvas) return
      
      // Optimization: use requestIdleCallback if available to avoid blocking the main thread
      const runSerialization = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json = JSON.stringify((canvas as any).toJSON([
          'objId', 'name', 'hasStartArrow', 'hasEndArrow', 'isConnector',
          'startObjId', 'endObjId', 'vertexConnections', 'isArtboard', 'artboardExportType',
          '_appliedFX', 'fxProps', 'isSubtitle', 'startTime', 'endTime', 'isVideo',
        ]))

        // If we moved back and then made a new change, discard the "future" history
        if (histIdxRef.current < historyRef.current.length - 1) {
          historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1)
        }

        // Only push if the state actually changed (optional optimization, but stringify is the bottleneck)
        if (historyRef.current.length > 0 && historyRef.current[historyRef.current.length - 1] === json) return

        historyRef.current.push(json)
        histIdxRef.current = historyRef.current.length - 1
        
        // Limit history size to 50 steps to prevent memory bloat
        if (historyRef.current.length > 50) {
          historyRef.current.shift()
          histIdxRef.current--
        }
      }

      if (typeof window !== 'undefined' && (window as any).requestIdleCallback) {
        (window as any).requestIdleCallback(runSerialization)
      } else {
        runSerialization()
      }
    }

    if (immediate) {
      performPush()
    } else {
      debounceTimerRef.current = setTimeout(performPush, 500)
    }
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

  function undo() {
    const canvas = fabricRef.current
    if (!canvas || histIdxRef.current <= 0) return
    histIdxRef.current--
    const raw = sanitizeCanvasJSON(historyRef.current[histIdxRef.current])
    canvas.loadFromJSON(JSON.parse(raw)).then(() => {
      purgeVideoPlaceholders(canvas)
      canvas.renderAll()
      syncActiveArtboardAfterLoad(canvas)
    })
  }

  function redo() {
    const canvas = fabricRef.current
    if (!canvas || histIdxRef.current >= historyRef.current.length - 1) return
    histIdxRef.current++
    const raw = sanitizeCanvasJSON(historyRef.current[histIdxRef.current])
    canvas.loadFromJSON(JSON.parse(raw)).then(() => {
      purgeVideoPlaceholders(canvas)
      canvas.renderAll()
      syncActiveArtboardAfterLoad(canvas)
    })
  }

  /** Clear the history stack (call on loadProject / newProject). */
  function resetHistory() {
    historyRef.current = []
    histIdxRef.current = -1
  }

  return { pushHistory, undo, redo, syncActiveArtboardAfterLoad, resetHistory }
}
