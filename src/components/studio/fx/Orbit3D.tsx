'use client'

/**
 * Maniglia d'orbita per gli oggetti con "Materiale 3D", come in un piccolo Blender:
 * - trascina: rotazione (orizzontale) e inclinazione (verticale) in tempo reale
 * - Maiusc + rotella: spessore dell'estrusione
 * - doppio clic: torna alla vista frontale
 * Il solido nasce dalla forma vera: modificare tracciato, testo o angoli lo aggiorna.
 */
import React, { useEffect, useRef, useState } from 'react'
import type * as fabric from 'fabric'
import { Rotate3d } from 'lucide-react'
import { applyFx } from './engine'
import type { FxEntry } from './catalog'

type Obj = fabric.FabricObject & { fx?: FxEntry[] }
const entryOf = (o?: Obj | null) => o?.fx?.find(e => e.id === 'material3d' && e.on)

export function Orbit3D({ fabricRef }: { fabricRef: React.RefObject<fabric.Canvas | null> }) {
  const [pos, setPos] = useState<{ x: number; y: number; rx: number; ry: number } | null>(null)
  const drag = useRef<{ x: number; y: number; rx: number; ry: number; obj: Obj } | null>(null)

  useEffect(() => {
    const c = fabricRef.current; if (!c) return
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const o = c.getActiveObject() as Obj | undefined
        const e = entryOf(o)
        if (!o || !e) { setPos(p => (p ? null : p)); return }
        const b = o.getBoundingRect(), v = c.viewportTransform
        const x = Math.round((b.left + b.width) * v[0] + v[4] + 14), y = Math.round(b.top * v[3] + v[5] - 14)
        const rx = Number(e.p.rx ?? 18), ry = Number(e.p.ry ?? -24)
        setPos(p => (p && p.x === x && p.y === y && p.rx === rx && p.ry === ry ? p : { x, y, rx, ry }))
      })
    }
    const evs = ['selection:created', 'selection:updated', 'selection:cleared', 'object:moving', 'object:scaling', 'object:modified', 'mouse:wheel', 'after:render'] as const
    evs.forEach(ev => c.on(ev as never, update))
    update()
    return () => { cancelAnimationFrame(raf); evs.forEach(ev => c.off(ev as never, update)) }
  }, [fabricRef])

  const set = (o: Obj, patch: Record<string, number>) => {
    o.fx = (o.fx ?? []).map(e => (e.id === 'material3d' ? { ...e, variant: undefined, p: { ...e.p, ...patch } } : e))
    applyFx(o)
    fabricRef.current?.requestRenderAll()
  }

  if (!pos) return null
  return (
    <button
      className="absolute z-[30] flex items-center gap-1.5 h-8 pl-2 pr-2.5 rounded-full bg-[#141414]/85 backdrop-blur border border-white/15 text-white/80 text-[10px] font-bold shadow-xl cursor-grab active:cursor-grabbing select-none touch-none"
      style={{ left: pos.x, top: pos.y }}
      title="Trascina per ruotare in 3D · Maiusc + rotella: spessore · doppio clic: vista frontale"
      onPointerDown={ev => {
        const o = fabricRef.current?.getActiveObject() as Obj | undefined
        const e = entryOf(o); if (!o || !e) return
        ;(ev.target as HTMLElement).setPointerCapture(ev.pointerId)
        drag.current = { x: ev.clientX, y: ev.clientY, rx: Number(e.p.rx ?? 18), ry: Number(e.p.ry ?? -24), obj: o }
      }}
      onPointerMove={ev => {
        const d = drag.current; if (!d) return
        const ry = Math.max(-85, Math.min(85, d.ry + (ev.clientX - d.x) * 0.45))
        const rx = Math.max(-85, Math.min(85, d.rx - (ev.clientY - d.y) * 0.45))
        set(d.obj, { rx: Math.round(rx), ry: Math.round(ry) })
      }}
      onPointerUp={() => {
        const d = drag.current; drag.current = null
        if (d) fabricRef.current?.fire('object:modified', { target: d.obj })
      }}
      onDoubleClick={() => {
        const o = fabricRef.current?.getActiveObject() as Obj | undefined
        if (!o) return
        set(o, { rx: 0, ry: 0 }); fabricRef.current?.fire('object:modified', { target: o })
      }}
      onWheel={ev => {
        if (!ev.shiftKey) return
        const o = fabricRef.current?.getActiveObject() as Obj | undefined
        const e = entryOf(o); if (!o || !e) return
        set(o, { depth: Math.max(2, Math.min(200, Number(e.p.depth ?? 40) - Math.sign(ev.deltaY) * 4)) })
      }}
    >
      <Rotate3d className="w-3.5 h-3.5" />
      <span className="tabular-nums text-white/50">{pos.ry}° · {pos.rx}°</span>
    </button>
  )
}
