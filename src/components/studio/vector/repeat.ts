/**
 * Ripetizione (Illustrator: Oggetto › Ripeti): radiale, griglia, specchio.
 * Il risultato è un gruppo che ricorda l'originale e i parametri, quindi resta
 * modificabile; "Espandi" lo scioglie in oggetti normali.
 */
import * as fabric from 'fabric'
import { SERIAL_PROPS } from '../canvas-serial'

export type RepeatKind = 'radial' | 'grid' | 'mirror'
export interface RepeatSpec {
  kind: RepeatKind
  count: number      // radiale: copie
  radius: number     // radiale: raggio in px
  rotate: boolean    // radiale: copie orientate verso il centro
  cols: number; rows: number; gapX: number; gapY: number // griglia
  brick: boolean     // griglia: righe dispari sfalsate
  flip: boolean      // griglia: copie alterne specchiate (come Illustrator)
  axis: 'v' | 'h'; gap: number // specchio
}
type RepeatGroup = fabric.Group & { repeatSpec?: RepeatSpec; repeatSrc?: object }

export const getRepeat = (o?: fabric.FabricObject | null) => {
  const g = o as RepeatGroup | undefined
  return g?.repeatSpec && g.repeatSrc ? g.repeatSpec : undefined
}

export function defaultSpec(kind: RepeatKind, o: fabric.FabricObject): RepeatSpec {
  const s = Math.max(o.getScaledWidth(), o.getScaledHeight())
  return {
    // raggio iniziale: copie vicine ma senza sovrapporsi (circonferenza ≈ 8 copie)
    kind, count: 8, radius: Math.round(Math.max(s * 0.6, (8 * s * 0.9) / (2 * Math.PI))), rotate: true,
    cols: 4, rows: 3, gapX: Math.round(s * 0.2), gapY: Math.round(s * 0.2), brick: false, flip: false,
    axis: 'v', gap: 0,
  }
}

async function clones(src: object, n: number) {
  const out = await fabric.util.enlivenObjects<fabric.FabricObject>(Array.from({ length: n }, () => src))
  return out
}

/** Copie disposte attorno a `c` (centro del gruppo finale). */
async function build(src: object, spec: RepeatSpec, c: fabric.Point) {
  const probe = (await clones(src, 1))[0]
  const w = probe.getScaledWidth(), h = probe.getScaledHeight(), baseAngle = probe.angle ?? 0
  const place = (o: fabric.FabricObject, x: number, y: number, extra: Partial<fabric.FabricObjectProps> = {}) => {
    o.set(extra)
    o.setPositionByOrigin(new fabric.Point(x, y), 'center', 'center')
    o.setCoords()
    return o
  }
  if (spec.kind === 'radial') {
    const n = Math.max(2, Math.round(spec.count))
    const items = await clones(src, n)
    return items.map((o, i) => {
      const a = (i / n) * Math.PI * 2
      return place(o, c.x + Math.sin(a) * spec.radius, c.y - Math.cos(a) * spec.radius,
        spec.rotate ? { angle: baseAngle + (a * 180) / Math.PI } : {})
    })
  }
  if (spec.kind === 'grid') {
    const cols = Math.max(1, Math.round(spec.cols)), rows = Math.max(1, Math.round(spec.rows))
    const sx = w + spec.gapX, sy = h + spec.gapY
    const items = await clones(src, cols * rows)
    return items.map((o, k) => {
      const i = Math.floor(k / cols), j = k % cols
      const shift = spec.brick && i % 2 ? sx / 2 : 0
      const x = c.x + (j - (cols - 1) / 2) * sx + shift, y = c.y + (i - (rows - 1) / 2) * sy
      return place(o, x, y, spec.flip ? { flipX: j % 2 === 1 ? !o.flipX : o.flipX, flipY: i % 2 === 1 ? !o.flipY : o.flipY } : {})
    })
  }
  const [a, b] = await clones(src, 2)
  const d = (spec.axis === 'v' ? w : h) / 2 + spec.gap / 2
  if (spec.axis === 'v') return [place(a, c.x - d, c.y), place(b, c.x + d, c.y, { flipX: !b.flipX })]
  return [place(a, c.x, c.y - d), place(b, c.x, c.y + d, { flipY: !b.flipY })]
}

async function assemble(canvas: fabric.Canvas, src: object, spec: RepeatSpec, c: fabric.Point, replace: fabric.FabricObject, keepTransform?: fabric.Group) {
  const items = await build(src, spec, c)
  const g = new fabric.Group(items) as RepeatGroup
  g.repeatSpec = { ...spec }
  g.repeatSrc = src
  g.set('name', spec.kind === 'radial' ? 'Ripetizione radiale' : spec.kind === 'grid' ? 'Ripetizione a griglia' : 'Specchio')
  if (keepTransform) {
    g.set({ angle: keepTransform.angle, scaleX: keepTransform.scaleX, scaleY: keepTransform.scaleY })
    g.setPositionByOrigin(keepTransform.getCenterPoint(), 'center', 'center')
  }
  g.setCoords()
  const at = canvas.getObjects().indexOf(replace)
  canvas.remove(replace)
  canvas.insertAt(Math.max(0, at), g)
  canvas.setActiveObject(g)
  canvas.fire('object:modified', { target: g })
  canvas.requestRenderAll()
  return g
}

export async function makeRepeat(canvas: fabric.Canvas, o: fabric.FabricObject, kind: RepeatKind) {
  if (o instanceof fabric.ActiveSelection) return null
  const spec = defaultSpec(kind, o)
  const src = o.toObject(SERIAL_PROPS as never[])
  // la composizione si centra dove stava l'oggetto: resta sulla tavola
  return assemble(canvas, src, spec, o.getCenterPoint(), o)
}

/** Cambia i parametri ricostruendo le copie; spostamenti/rotazioni del gruppo restano. */
export async function updateRepeat(canvas: fabric.Canvas, g: fabric.FabricObject, patch: Partial<RepeatSpec>) {
  const rg = g as RepeatGroup
  if (!rg.repeatSpec || !rg.repeatSrc) return null
  const spec = { ...rg.repeatSpec, ...patch }
  return assemble(canvas, rg.repeatSrc, spec, rg.getCenterPoint(), rg, rg)
}

/** Espandi: il gruppo diventa oggetti normali, selezionati insieme. */
export function expandRepeat(canvas: fabric.Canvas, g: fabric.FabricObject) {
  if (!(g instanceof fabric.Group) || g instanceof fabric.ActiveSelection) return
  const at = canvas.getObjects().indexOf(g)
  const objs = g.removeAll() as fabric.FabricObject[]
  canvas.remove(g)
  objs.forEach((o, i) => { canvas.insertAt(at + i, o); o.setCoords() })
  canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas }))
  objs.forEach(o => canvas.fire('object:modified', { target: o }))
  canvas.requestRenderAll()
}
