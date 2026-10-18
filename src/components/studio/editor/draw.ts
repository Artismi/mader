/**
 * Disegno delle forme e tagli, come in Illustrator:
 * - trascinando si decide la misura (Maiusc: proporzioni uguali, Alt: dal centro),
 *   un clic solo dà la misura standard con l'angolo in alto a sinistra nel punto cliccato;
 * - in Fabric 7 l'origine degli oggetti è il centro: qui si posiziona sempre dal centro
 *   del riquadro, così la forma sta esattamente dove la si è disegnata;
 * - linea con Maiusc a scatti di 45°;
 * - forbici su tracciati della penna, linee e polilinee, anche spostati o scalati.
 */
import * as fabric from 'fabric'
import type { BzAnchor } from '../bezier-utils'
import { ArrowLine } from '../extensions/arrow-line'
import { makeLiveShape, DEFAULT_POLYGON, DEFAULT_STAR } from '../vector/shapes'

export interface Box { left: number; top: number; w: number; h: number }
type Pt = { x: number; y: number }

/** sotto questa distanza (px di schermo) il gesto è un clic, non un trascinamento */
export const CLICK_PX = 4
export const DEFAULT_SIZE = 200

export function boxFrom(a: Pt, b: Pt, { shift = false, alt = false } = {}): Box {
  let dx = b.x - a.x, dy = b.y - a.y
  if (shift) { const m = Math.max(Math.abs(dx), Math.abs(dy)); dx = Math.sign(dx || 1) * m; dy = Math.sign(dy || 1) * m }
  if (alt) return { left: a.x - Math.abs(dx), top: a.y - Math.abs(dy), w: Math.abs(dx) * 2, h: Math.abs(dy) * 2 }
  return { left: Math.min(a.x, a.x + dx), top: Math.min(a.y, a.y + dy), w: Math.abs(dx), h: Math.abs(dy) }
}

export type ShapeTool = 'rect' | 'circle' | 'polygon' | 'star'

/** forma nel riquadro dato, posizionata dal centro */
export function makeShape(tool: ShapeTool, b: Box, opts: Partial<fabric.FabricObjectProps> = {}) {
  const w = Math.max(1, b.w), h = Math.max(1, b.h)
  const cx = b.left + w / 2, cy = b.top + h / 2
  if (tool === 'rect') return new fabric.Rect({ left: cx, top: cy, width: w, height: h, strokeWidth: 0, rx: 0, ry: 0, ...opts })
  if (tool === 'circle') return new fabric.Ellipse({ left: cx, top: cy, rx: w / 2, ry: h / 2, strokeWidth: 0, ...opts })
  // forme vive: lati e punte si cambiano poi dal pannello Vettoriale; la misura viene dalla scala
  const sh = makeLiveShape(tool === 'star' ? DEFAULT_STAR : DEFAULT_POLYGON, { x: cx, y: cy }, opts) as fabric.FabricObject
  sh.set({ scaleX: w / (sh.width || 1), scaleY: h / (sh.height || 1) })
  sh.setPositionByOrigin(new fabric.Point(cx, cy), 'center', 'center')
  sh.setCoords()
  return sh
}

/** porta l'angolo in alto a sinistra dell'oggetto nel punto dato */
export function placeTopLeft(o: fabric.FabricObject, p: Pt) {
  o.setPositionByOrigin(new fabric.Point(p.x, p.y), 'left', 'top')
  o.setCoords()
}

/** linea con Maiusc: l'angolo va al multiplo di 45° più vicino */
export function constrain45(a: Pt, b: Pt): Pt {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy)
  const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
  return { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len }
}

/** punto delle coordinate interne di un tracciato o di una polilinea → scena */
function toScene(o: fabric.Path | fabric.Polyline, p: Pt) {
  return fabric.util.transformPoint(new fabric.Point(p.x - o.pathOffset.x, p.y - o.pathOffset.y), o.calcTransformMatrix())
}

/**
 * I punti della penna sono salvati nelle coordinate del tracciato (quelle del suo `path`):
 * dopo uno spostamento o una scala vanno riportati in scena.
 */
export function anchorsInScene(fp: fabric.Path, stored: BzAnchor[]): BzAnchor[] {
  return stored.map(a => {
    const p = toScene(fp, a), c1 = toScene(fp, { x: a.cp1x, y: a.cp1y }), c2 = toScene(fp, { x: a.cp2x, y: a.cp2y })
    return { ...a, x: p.x, y: p.y, cp1x: c1.x, cp1y: c1.y, cp2x: c2.x, cp2y: c2.y }
  })
}

/** estremi di una linea in coordinate di scena */
export function lineEnds(l: fabric.Line) {
  const { x1, y1, x2, y2 } = l.calcLinePoints()
  const m = l.calcTransformMatrix()
  return [fabric.util.transformPoint(new fabric.Point(x1, y1), m), fabric.util.transformPoint(new fabric.Point(x2, y2), m)]
}

/** taglia una linea nel punto più vicino a p; null se il punto è lontano o a un estremo */
export function splitLine(l: ArrowLine, p: Pt, maxDist: number): [ArrowLine, ArrowLine] | null {
  const [a, b] = lineEnds(l)
  const vx = b.x - a.x, vy = b.y - a.y, len2 = vx * vx + vy * vy
  if (!len2) return null
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2))
  const c = { x: a.x + vx * t, y: a.y + vy * t }
  if (Math.hypot(p.x - c.x, p.y - c.y) > maxDist || t < 0.01 || t > 0.99) return null
  const style = { stroke: l.stroke, strokeWidth: l.strokeWidth, strokeDashArray: l.strokeDashArray, strokeLineCap: l.strokeLineCap, opacity: l.opacity }
  const l1 = new ArrowLine([a.x, a.y, c.x, c.y], style), l2 = new ArrowLine([c.x, c.y, b.x, b.y], style)
  l1.hasStartArrow = l.hasStartArrow; l2.hasEndArrow = l.hasEndArrow
  return [l1, l2]
}

/** taglia una polilinea al vertice più vicino a p */
export function splitPolyline(pl: fabric.Polyline, p: Pt): [fabric.Polyline, fabric.Polyline] | null {
  const pts = pl.points.map(q => toScene(pl, q))
  if (pts.length < 3) return null
  let k = 1, best = Infinity
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.hypot(pts[i].x - p.x, pts[i].y - p.y); if (d < best) { best = d; k = i } }
  const style = { stroke: pl.stroke, strokeWidth: pl.strokeWidth, fill: 'transparent', opacity: pl.opacity }
  return [new fabric.Polyline(pts.slice(0, k + 1), style), new fabric.Polyline(pts.slice(k), style)]
}
