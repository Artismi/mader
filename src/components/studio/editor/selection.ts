/**
 * Selezione come in Figma e Illustrator:
 * - il vuoto di una tavola è vuoto: un clic deseleziona, un trascinamento fa
 *   il riquadro di selezione (la tavola si seleziona dalla sua etichetta o dai
 *   livelli, e una volta selezionata si trascina e si scala come le altre);
 * - riquadro, lazo e Ctrl+A prendono gli oggetti, mai le tavole né gli
 *   oggetti temporanei (anteprime, ritaglio, guide);
 * - Tab e Maiusc+Tab passano da un oggetto all'altro nell'ordine degli strati;
 * - Ctrl+clic seleziona l'oggetto dentro un gruppo.
 */
import * as fabric from 'fabric'

type AnyObj = fabric.FabricObject & { isArtboard?: boolean }

const isBoard = (o?: fabric.FabricObject | null) => !!(o as AnyObj | undefined)?.isArtboard

/** oggetti che una selezione può prendere */
export function pickable(canvas: fabric.Canvas) {
  return canvas.getObjects().filter(o =>
    !isBoard(o) && !o.excludeFromExport && o.selectable !== false && o.visible !== false &&
    !String(o.get('name') ?? '').startsWith('label_'))
}

/** seleziona un elenco di oggetti (uno solo o una ActiveSelection) */
export function selectObjects(canvas: fabric.Canvas, objs: fabric.FabricObject[]) {
  canvas.discardActiveObject()
  if (objs.length === 1) canvas.setActiveObject(objs[0])
  else if (objs.length > 1) canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas }))
  canvas.requestRenderAll()
}

export function selectAll(canvas: fabric.Canvas) { selectObjects(canvas, pickable(canvas)) }

/** Tab: l'oggetto successivo (o precedente) nell'ordine degli strati */
export function cycleSelection(canvas: fabric.Canvas, dir: 1 | -1) {
  const list = pickable(canvas)
  if (!list.length) return
  const cur = canvas.getActiveObject()
  const i = cur ? list.indexOf(cur) : -1
  const next = i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length
  selectObjects(canvas, [list[next]])
}

export function selectBoard(canvas: fabric.Canvas, name: string) {
  const ab = canvas.getObjects().find(o => isBoard(o) && o.get('name') === name)
  if (ab) selectObjects(canvas, [ab])
  return ab
}

/**
 * true se il punto di scena cade nel riquadro dell'oggetto. Si passa dalla
 * matrice completa: le coordinate in cache dei figli di un gruppo non sono affidabili.
 */
function hits(o: fabric.FabricObject, p: fabric.Point) {
  const q = fabric.util.transformPoint(p, fabric.util.invertTransform(o.calcTransformMatrix()))
  const pad = (o.strokeWidth ?? 0) / 2
  return Math.abs(q.x) <= o.width / 2 + pad && Math.abs(q.y) <= o.height / 2 + pad
}

/** oggetto più in alto, dentro un gruppo, sotto il punto (coordinate di scena) */
function deepTarget(group: fabric.Group, p: fabric.Point): fabric.FabricObject | undefined {
  const objs = group.getObjects()
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i]
    if (!o.visible || !hits(o, p)) continue
    if (o instanceof fabric.Group && !(o instanceof fabric.ActiveSelection)) return deepTarget(o, p) ?? o
    return o
  }
}

/**
 * Ctrl+clic su un gruppo: l'oggetto interno diventa modificabile da solo.
 * Il gruppo si fa "interattivo" finché la selezione resta dentro di esso.
 */
function enterGroup(canvas: fabric.Canvas, group: fabric.Group, p: fabric.Point) {
  const inner = deepTarget(group, p)
  if (!inner) return false
  group.set({ interactive: true, subTargetCheck: true })
  canvas.setActiveObject(inner)
  canvas.requestRenderAll()
  return true
}

export function installSelection(canvas: fabric.Canvas) {
  type Internals = {
    _checkTarget: (o: fabric.FabricObject, p: fabric.Point) => boolean
    collectObjects: (bbox: fabric.TBBox, opts?: { includeIntersecting?: boolean }) => fabric.FabricObject[]
  }
  const c = canvas as unknown as Internals
  const check = c._checkTarget, collect = c.collectObjects

  // una tavola risponde al mouse solo quando è già selezionata
  c._checkTarget = function (o, p) {
    if (isBoard(o) && canvas.getActiveObject() !== o) return false
    return check.call(this, o, p)
  }
  // il riquadro di selezione non prende tavole né oggetti temporanei
  c.collectObjects = function (bbox, opts) {
    return collect.call(this, bbox, opts).filter(o => !isBoard(o) && !o.excludeFromExport)
  }

  // Ctrl+clic: dentro il gruppo
  const onDown = (opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
    const e = opt.e as MouseEvent
    if (!(e.ctrlKey || e.metaKey) || e.button !== 0) return
    const t = opt.target
    if (t instanceof fabric.Group && !(t instanceof fabric.ActiveSelection)) enterGroup(canvas, t, canvas.getScenePoint(opt.e))
  }
  // uscendo dal gruppo torna un blocco unico
  const onCleared = (e: { deselected?: fabric.FabricObject[] }) => {
    for (const o of e.deselected ?? []) {
      const g = o.group
      if (g && !(g instanceof fabric.ActiveSelection) && (g as fabric.Group).interactive) {
        const still = canvas.getActiveObjects().some(a => a.group === g)
        if (!still) g.set({ interactive: false, subTargetCheck: false })
      }
    }
  }
  canvas.on('mouse:down', onDown)
  canvas.on('selection:cleared', onCleared)
  canvas.on('selection:updated', onCleared)

  return () => {
    c._checkTarget = check
    c.collectObjects = collect
    canvas.off('mouse:down', onDown)
    canvas.off('selection:cleared', onCleared)
    canvas.off('selection:updated', onCleared)
  }
}
