/**
 * Tavole come pagine vere (alla Canva):
 * - quello che esce dal bordo della tavola viene tagliato, a schermo e in
 *   esportazione: si possono far uscire forme, foto e parole al vivo;
 * - un oggetto appartiene alla tavola in cui sta il suo centro;
 * - mentre lo si trascina si vede intero, così si capisce dove sta andando;
 * - spostando una tavola, il suo contenuto la segue.
 */
import * as fabric from 'fabric'

type AnyObj = fabric.FabricObject & { isArtboard?: boolean; parentBoard?: string }

const boards = (c: fabric.StaticCanvas) => c.getObjects().filter(o => (o as AnyObj).isArtboard) as AnyObj[]

function contains(ab: fabric.FabricObject, p: fabric.Point) {
  const [a, b, , d] = ab.getCoords()
  // tavola eventualmente ruotata: si proietta sui due lati
  const ux = b.x - a.x, uy = b.y - a.y, vx = d.x - a.x, vy = d.y - a.y
  const px = p.x - a.x, py = p.y - a.y
  const s = (px * ux + py * uy) / (ux * ux + uy * uy), t = (px * vx + py * vy) / (vx * vx + vy * vy)
  return s >= 0 && s <= 1 && t >= 0 && t <= 1
}

/** la tavola che contiene il centro dell'oggetto (la più in alto se si sovrappongono) */
export function boardOf(c: fabric.StaticCanvas, o: fabric.FabricObject, list = boards(c)): AnyObj | undefined {
  if ((o as AnyObj).isArtboard) return undefined
  const p = o.getCenterPoint()
  for (let i = list.length - 1; i >= 0; i--) if (contains(list[i], p)) return list[i]
  return undefined
}

export function childrenOf(c: fabric.StaticCanvas, ab: fabric.FabricObject) {
  const list = boards(c)
  return c.getObjects().filter(o => o !== ab && !(o as AnyObj).isArtboard && !String(o.get('name') ?? '').startsWith('label_') && boardOf(c, o, list) === ab)
}

export function installArtboards(canvas: fabric.Canvas) {
  const proto = canvas as unknown as { _renderObjects: (ctx: CanvasRenderingContext2D, objs: fabric.FabricObject[]) => void }
  const original = proto._renderObjects
  proto._renderObjects = function (this: fabric.Canvas, ctx: CanvasRenderingContext2D, objects: fabric.FabricObject[]) {
    const list = boards(this)
    if (!list.length) return original.call(this, ctx, objects)
    const moving = (this as unknown as { _currentTransform?: { target?: fabric.FabricObject } })._currentTransform?.target
    for (const o of objects) {
      if (!o) continue
      const ab = o instanceof fabric.ActiveSelection || o === moving ? undefined : boardOf(this, o, list)
      if (!ab) { o.render(ctx); continue }
      const [p1, p2, p3, p4] = ab.getCoords()
      ctx.save()
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath()
      ctx.clip()
      o.render(ctx)
      ctx.restore()
    }
  }

  // il contenuto segue la tavola
  let drag: { ab: fabric.FabricObject; x: number; y: number; kids: fabric.FabricObject[] } | null = null
  const onDown = (e: { target?: fabric.FabricObject }) => {
    const t = e.target
    drag = t && (t as AnyObj).isArtboard ? { ab: t, x: t.left, y: t.top, kids: childrenOf(canvas, t) } : null
  }
  const onMoving = (e: { target: fabric.FabricObject }) => {
    if (!drag || e.target !== drag.ab) return
    const dx = e.target.left - drag.x, dy = e.target.top - drag.y
    drag.x = e.target.left; drag.y = e.target.top
    for (const k of drag.kids) { k.set({ left: k.left + dx, top: k.top + dy }); k.setCoords() }
  }
  const onUp = () => {
    if (drag) { const name = drag.ab.get('name'); drag.kids.forEach(k => { (k as AnyObj).parentBoard = name }) }
    drag = null
  }
  // dopo ogni modifica l'appartenenza si aggiorna
  const onModified = (e: { target?: fabric.FabricObject }) => {
    const t = e.target; if (!t || (t as AnyObj).isArtboard) return
    const objs = t instanceof fabric.ActiveSelection ? t.getObjects() : [t]
    objs.forEach(o => { (o as AnyObj).parentBoard = boardOf(canvas, o)?.get('name') })
  }
  canvas.on('mouse:down', onDown)
  canvas.on('object:moving', onMoving)
  canvas.on('mouse:up', onUp)
  canvas.on('object:modified', onModified)
  return () => {
    proto._renderObjects = original
    canvas.off('mouse:down', onDown); canvas.off('object:moving', onMoving); canvas.off('mouse:up', onUp); canvas.off('object:modified', onModified)
  }
}
