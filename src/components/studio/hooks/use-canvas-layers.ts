import React, { useState, useRef, useCallback } from 'react'
import * as fabric from 'fabric'
const getObjId = (obj: any): string => {
  if (!obj) return ''
  if (!obj.objId) {
    obj.objId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) 
      ? (crypto as any).randomUUID() 
      : 'obj_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now()
  }
  return obj.objId
}

export interface LayerEntry {
  id: string
  label: string
  type: string
  visible: boolean
  locked: boolean
}

/**
 * Manages the layer list derived from the Fabric.js canvas object stack.
 * The layer array is a React-state mirror of canvas.getObjects() (reversed,
 * so top layer = first entry) — it drives the Layers panel UI.
 *
 * All mutations call refreshLayers() internally so the UI stays in sync.
 */
export function useCanvasLayers(fabricRef: React.RefObject<fabric.Canvas | null>) {
  const [layers, setLayers] = useState<LayerEntry[]>([])
  const layersRafRef = useRef<number | null>(null)

  // Debounced via RAF: rapid canvas mutations (paste, group, etc.) collapse
  // into a single React setState, preventing multi-frame re-render bursts.
  function refreshLayers() {
    if (layersRafRef.current) return  // already queued this frame
    layersRafRef.current = requestAnimationFrame(() => {
      layersRafRef.current = null
      const canvas = fabricRef.current; if (!canvas) return
      const objs = [...canvas.getObjects()].reverse()
      setLayers(objs.map(o => ({
      id: getObjId(o),
      label: (o as any).name
        || (o.type === 'textbox'  ? (o as any).text?.slice(0, 20) || 'Testo'
          : o.type === 'image'    ? 'Immagine'
          : o.type === 'path'     ? 'Path'
          : o.type === 'polyline' ? 'Polilinea'
          : o.type === 'line'     ? 'Linea'
          : o.type               || 'Oggetto'),
      type: o.type || 'object',
      visible: o.visible !== false,
      locked: !o.selectable,
    })))
    })  // end requestAnimationFrame
  }

  function layerSelect(id: string) {
    const canvas = fabricRef.current; if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).objId === id); if (!obj) return
    canvas.setActiveObject(obj); canvas.requestRenderAll()
  }

  function layerToggleVisible(id: string) {
    const canvas = fabricRef.current; if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).objId === id); if (!obj) return
    obj.set('visible', obj.visible === false)
    canvas.requestRenderAll(); refreshLayers()
  }

  function layerToggleLock(id: string) {
    const canvas = fabricRef.current; if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).objId === id); if (!obj) return
    const lock = obj.selectable !== false
    obj.set({ selectable: !lock, evented: !lock, hasControls: !lock })
    canvas.requestRenderAll(); refreshLayers()
  }

  const layerMoveUp = useCallback((id?: string) => {
    const canvas = fabricRef.current; if (!canvas) return
    if (id) {
      const obj = canvas.getObjects().find(o => (o as any).objId === id || (o as any).id === id)
      if (obj) canvas.setActiveObject(obj)
    }
    const sel = canvas.getActiveObject()
    if (!sel) return
    const objs = sel.type === 'activeSelection' ? (sel as any).getObjects() : [sel]
    objs.forEach((o: any) => canvas.bringForward(o))
    canvas.requestRenderAll()
    refreshLayers()
  }, [refreshLayers, fabricRef])

  const layerMoveDown = useCallback((id?: string) => {
    const canvas = fabricRef.current; if (!canvas) return
    if (id) {
      const obj = canvas.getObjects().find(o => (o as any).objId === id || (o as any).id === id)
      if (obj) canvas.setActiveObject(obj)
    }
    const sel = canvas.getActiveObject()
    if (!sel) return
    const objs = sel.type === 'activeSelection' ? (sel as any).getObjects() : [sel]
    objs.forEach((o: any) => canvas.sendBackwards(o))
    canvas.requestRenderAll()
    refreshLayers()
  }, [refreshLayers, fabricRef])

  const layerBringToFront = useCallback((id?: string) => {
    const canvas = fabricRef.current; if (!canvas) return
    if (id) {
      const obj = canvas.getObjects().find(o => (o as any).objId === id || (o as any).id === id)
      if (obj) canvas.setActiveObject(obj)
    }
    const sel = canvas.getActiveObject()
    if (!sel) return
    const objs = sel.type === 'activeSelection' ? (sel as any).getObjects() : [sel]
    objs.forEach((o: any) => canvas.bringToFront(o))
    canvas.requestRenderAll()
    refreshLayers()
  }, [refreshLayers, fabricRef])

  const layerSendToBack = useCallback((id?: string) => {
    const canvas = fabricRef.current; if (!canvas) return
    if (id) {
      const obj = canvas.getObjects().find(o => (o as any).objId === id || (o as any).id === id)
      if (obj) canvas.setActiveObject(obj)
    }
    const sel = canvas.getActiveObject()
    if (!sel) return
    const objs = sel.type === 'activeSelection' ? (sel as any).getObjects() : [sel]
    objs.forEach((o: any) => canvas.sendToBack(o))
    canvas.requestRenderAll()
    refreshLayers()
  }, [refreshLayers, fabricRef])

  function layerDelete(id: string) {
    const canvas = fabricRef.current; if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).objId === id); if (!obj) return
    canvas.remove(obj); canvas.requestRenderAll(); refreshLayers()
  }

  return {
    layers,
    refreshLayers,
    layerSelect,
    layerToggleVisible,
    layerToggleLock,
    layerMoveUp,
    layerMoveDown,
    layerBringToFront,
    layerSendToBack,
    layerDelete,
  }
}
