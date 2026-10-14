/**
 * Allinea, distribuisci, sposta di un passo, maschera di ritaglio.
 * Comportamento da Figma/Illustrator:
 * - con più oggetti si allinea ai bordi della selezione;
 * - con un oggetto solo si allinea alla sua tavola (come "Posiziona" di Canva);
 * - le tavole si portano dietro il loro contenuto.
 * Ogni operazione finisce con un `object:modified`, così cronologia,
 * salvataggio automatico e appartenenza alle tavole si aggiornano da soli.
 */
import * as fabric from 'fabric'
import { boardOf, childrenOf } from './artboards'

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'
export type Axis = 'h' | 'v'

type AnyObj = fabric.FabricObject & { isArtboard?: boolean }
interface Box { left: number; top: number; width: number; height: number }

/** Prende la selezione "sciolta": coordinate di scena, niente ActiveSelection di mezzo. */
function takeSelection(canvas: fabric.Canvas) {
  const objs = canvas.getActiveObjects().filter(o => !o.excludeFromExport && !(o.lockMovementX && o.lockMovementY))
  if (canvas.getActiveObject() instanceof fabric.ActiveSelection) canvas.discardActiveObject()
  return objs
}

function restoreSelection(canvas: fabric.Canvas, objs: fabric.FabricObject[]) {
  if (objs.length > 1) canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas }))
  else if (objs.length === 1) canvas.setActiveObject(objs[0])
  objs.forEach(o => canvas.fire('object:modified', { target: o }))
  canvas.requestRenderAll()
}

const box = (o: fabric.FabricObject): Box => o.getBoundingRect()

/** Sposta un oggetto in coordinate di scena; una tavola trascina con sé il suo contenuto. */
function moveBy(canvas: fabric.Canvas, o: fabric.FabricObject, dx: number, dy: number) {
  if (!dx && !dy) return
  const kids = (o as AnyObj).isArtboard ? childrenOf(canvas, o) : []
  for (const t of [o, ...kids]) { t.set({ left: t.left + dx, top: t.top + dy }); t.setCoords() }
}

function union(boxes: Box[]): Box {
  const l = Math.min(...boxes.map(b => b.left)), t = Math.min(...boxes.map(b => b.top))
  const r = Math.max(...boxes.map(b => b.left + b.width)), btm = Math.max(...boxes.map(b => b.top + b.height))
  return { left: l, top: t, width: r - l, height: btm - t }
}

/** true se c'è qualcosa da allineare (due oggetti, o uno dentro una tavola) */
export function canAlign(canvas: fabric.Canvas) {
  const objs = canvas.getActiveObjects()
  return objs.length > 1 || (objs.length === 1 && !!boardOf(canvas, objs[0]))
}

export function alignObjects(canvas: fabric.Canvas, mode: AlignMode) {
  const objs = takeSelection(canvas)
  if (!objs.length) return
  let ref: Box | undefined
  if (objs.length === 1) {
    const ab = boardOf(canvas, objs[0])
    if (ab) ref = box(ab)
  } else ref = union(objs.map(box))
  if (!ref) { restoreSelection(canvas, objs); return }
  for (const o of objs) {
    const b = box(o)
    let dx = 0, dy = 0
    if (mode === 'left') dx = ref.left - b.left
    if (mode === 'hcenter') dx = ref.left + ref.width / 2 - (b.left + b.width / 2)
    if (mode === 'right') dx = ref.left + ref.width - (b.left + b.width)
    if (mode === 'top') dy = ref.top - b.top
    if (mode === 'vcenter') dy = ref.top + ref.height / 2 - (b.top + b.height / 2)
    if (mode === 'bottom') dy = ref.top + ref.height - (b.top + b.height)
    moveBy(canvas, o, dx, dy)
  }
  restoreSelection(canvas, objs)
}

/** Spaziatura uguale tra gli oggetti (non tra i centri): i due estremi restano fermi. */
export function distributeObjects(canvas: fabric.Canvas, axis: Axis) {
  const objs = takeSelection(canvas)
  if (objs.length < 3) { restoreSelection(canvas, objs); return }
  const items = objs.map(o => ({ o, b: box(o) }))
  const start = (b: Box) => axis === 'h' ? b.left : b.top
  const size = (b: Box) => axis === 'h' ? b.width : b.height
  items.sort((a, z) => (start(a.b) + size(a.b) / 2) - (start(z.b) + size(z.b) / 2))
  const first = items[0].b, last = items[items.length - 1].b
  const span = start(last) + size(last) - start(first)
  const gap = (span - items.reduce((s, it) => s + size(it.b), 0)) / (items.length - 1)
  let cursor = start(first)
  for (const it of items) {
    const d = cursor - start(it.b)
    moveBy(canvas, it.o, axis === 'h' ? d : 0, axis === 'v' ? d : 0)
    cursor += size(it.b) + gap
  }
  restoreSelection(canvas, objs)
}

/** Frecce: 1 px, con Maiuscole 10 px (come in tutti i programmi di grafica). */
export function nudgeSelection(canvas: fabric.Canvas, dx: number, dy: number) {
  const active = canvas.getActiveObject()
  if (!active) return
  // l'ActiveSelection si sposta in blocco, ma il contenuto delle tavole va trascinato a mano
  const objs = canvas.getActiveObjects()
  if (active instanceof fabric.ActiveSelection) {
    active.set({ left: active.left + dx, top: active.top + dy }); active.setCoords()
    objs.filter(o => (o as AnyObj).isArtboard).forEach(ab => childrenOf(canvas, ab).filter(k => !objs.includes(k)).forEach(k => { k.set({ left: k.left + dx, top: k.top + dy }); k.setCoords() }))
  } else moveBy(canvas, active, dx, dy)
  canvas.fire('object:modified', { target: active })
  canvas.requestRenderAll()
}

// ─── MASCHERA DI RITAGLIO ────────────────────────────────────────────────────
// L'oggetto più in alto della selezione diventa la forma che ritaglia gli altri,
// riuniti in un gruppo. Il gruppo resta modificabile; "Rilascia" li separa di nuovo.

export const isMaskGroup = (o?: fabric.FabricObject | null): o is fabric.Group =>
  !!o && o instanceof fabric.Group && !(o instanceof fabric.ActiveSelection) && !!(o as fabric.Group & { isClipMask?: boolean }).isClipMask

export async function makeClipMask(canvas: fabric.Canvas) {
  const objs = takeSelection(canvas).filter(o => !(o as AnyObj).isArtboard)
  if (objs.length < 2) { restoreSelection(canvas, objs); return null }
  const all = canvas.getObjects()
  objs.sort((a, b) => all.indexOf(a) - all.indexOf(b))
  const shape = objs[objs.length - 1], content = objs.slice(0, -1)
  const at = all.indexOf(content[0])

  const clip = await shape.clone()
  content.forEach(o => canvas.remove(o))
  canvas.remove(shape)
  const g = new fabric.Group(content)
  // il ritaglio vive nel sistema del gruppo: segue spostamenti, scale e rotazioni
  const gc = g.getCenterPoint(), sc = shape.getCenterPoint()
  clip.set({ originX: 'center', originY: 'center', left: sc.x - gc.x, top: sc.y - gc.y, absolutePositioned: false })
  g.clipPath = clip
  ;(g as fabric.Group & { isClipMask?: boolean }).isClipMask = true
  g.set('name', 'Maschera')
  canvas.insertAt(at, g)
  canvas.setActiveObject(g)
  canvas.fire('object:modified', { target: g })
  canvas.requestRenderAll()
  return g
}

export async function releaseClipMask(canvas: fabric.Canvas) {
  const g = canvas.getActiveObject()
  if (!isMaskGroup(g) || !g.clipPath) return
  const at = canvas.getObjects().indexOf(g)
  // la forma torna in scena con la trasformazione completa (gruppo × ritaglio)
  const shape = (await g.clipPath.clone()) as fabric.FabricObject
  const m = fabric.util.multiplyTransformMatrices(g.calcTransformMatrix(), shape.calcTransformMatrix())
  fabric.util.applyTransformToObject(shape, m)
  shape.set({ absolutePositioned: false })
  g.clipPath = undefined
  const objs = g.removeAll() as fabric.FabricObject[]
  canvas.remove(g)
  objs.forEach((o, i) => { canvas.insertAt(at + i, o); o.setCoords() })
  canvas.insertAt(at + objs.length, shape); shape.setCoords()
  restoreSelection(canvas, [...objs, shape])
}
