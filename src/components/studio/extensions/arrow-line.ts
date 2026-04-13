/**
 * ArrowLine — custom Fabric.js Line subclass with optional arrowheads and
 * smart connector behaviour (startObjId / endObjId).
 *
 * Also exports all connector-math helpers and snap/lasso utilities that
 * depend on fabric types but are pure functions (no React).
 */

import * as fabric from 'fabric'

// ─── ARROW LINE ───────────────────────────────────────────────────────────────

export class ArrowLine extends fabric.Line {
  hasStartArrow: boolean = false
  hasEndArrow:   boolean = false
  isConnector:   boolean = false
  startObjId:    string | null = null
  endObjId:      string | null = null

  _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx)
    const x1 = -(this.width! / 2), y1 = -(this.height! / 2)
    const x2 =  (this.width! / 2), y2 =  (this.height! / 2)
    const col = (this.stroke as string) || '#ffffff'
    const sw  = this.strokeWidth || 2
    if (this.hasEndArrow)   renderArrow(ctx, x1, y1, x2, y2, col, sw)
    if (this.hasStartArrow) renderArrow(ctx, x2, y2, x1, y1, col, sw)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toObject(props?: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { ...(super.toObject as any)(props), hasStartArrow: this.hasStartArrow, hasEndArrow: this.hasEndArrow, isConnector: this.isConnector, startObjId: this.startObjId, endObjId: this.endObjId }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(ArrowLine, 'ArrowLine')

// ─── ARROW RENDERING ─────────────────────────────────────────────────────────

export function renderArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  col: string, sw: number,
) {
  const a = Math.atan2(y2-y1, x2-x1), sz = Math.max(8, sw*4)
  ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - sz*Math.cos(a-Math.PI/6), y2 - sz*Math.sin(a-Math.PI/6))
  ctx.lineTo(x2 - sz*Math.cos(a+Math.PI/6), y2 - sz*Math.sin(a+Math.PI/6))
  ctx.closePath(); ctx.fill(); ctx.restore()
}

// ─── CONNECTOR MATH ───────────────────────────────────────────────────────────

/** Returns the edge point of obj closest to the given target point. */
export function getEdgePoint(
  obj: fabric.Object,
  toward: { x: number; y: number },
): { x: number; y: number } {
  const c  = obj.getCenterPoint()
  const w2 = (obj.getScaledWidth()  || 0) / 2 + (obj.strokeWidth || 0)
  const h2 = (obj.getScaledHeight() || 0) / 2 + (obj.strokeWidth || 0)
  if (obj.type === 'ellipse') {
    const rx = (obj as any).rx ? (obj as any).rx * (obj.scaleX || 1) : w2
    const dx = toward.x - c.x, dy = toward.y - c.y
    const d  = Math.hypot(dx, dy)
    if (d === 0) return c
    return { x: c.x + (dx/d)*rx, y: c.y + (dy/d)*rx }
  }
  const dx = toward.x - c.x, dy = toward.y - c.y
  if (dx === 0 && dy === 0) return c
  const tX = dx !== 0 ? w2 / Math.abs(dx) : Infinity
  const tY = dy !== 0 ? h2 / Math.abs(dy) : Infinity
  const t  = Math.min(tX, tY) + 0.05
  if (t > 1) return toward
  return { x: c.x + t*dx, y: c.y + t*dy }
}

// ─── OBJECT ID ───────────────────────────────────────────────────────────────

/** Returns (and lazily creates) a stable UUID for any Fabric object. */
export function getObjId(obj: fabric.Object): string {
  if (!(obj as any).objId) (obj as any).objId = crypto.randomUUID()
  return (obj as any).objId
}

// ─── POLYLINE CONNECTIONS ────────────────────────────────────────────────────

export function updatePolylineConnections(line: any, canvas: fabric.Canvas) {
  if (!line.vertexConnections) return
  const pts = line.get('points') as { x: number; y: number }[]
  let changed = false
  Object.entries(line.vertexConnections).forEach(([idxStr, targetId]: [string, any]) => {
    const idx    = parseInt(idxStr)
    const target = canvas.getObjects().find(o => getObjId(o) === targetId)
    if (!target) return
    const otherIdx = idx === 0 ? 1 : pts.length - 2
    const edge     = getEdgePoint(target, pts[otherIdx])
    pts[idx] = { x: edge.x - (line.left || 0), y: edge.y - (line.top || 0) }
    changed = true
  })
  if (changed) { line.set({ points: [...pts] }); line.setCoords() }
}

// ─── SNAP ─────────────────────────────────────────────────────────────────────

export const SNAP_R = 30

export function findSnapPoint(
  canvas: fabric.Canvas,
  px: number,
  py: number,
  excl?: string,
): { x: number; y: number; objId: string } | null {
  let best: { x: number; y: number; objId: string; dist: number } | null = null
  canvas.getObjects().forEach(obj => {
    const id = (obj as any).objId
    if (!id || id === excl || obj instanceof ArrowLine) return
    const c = obj.getCenterPoint()
    const l = obj.left!, t = obj.top!, w = obj.getScaledWidth(), h = obj.getScaledHeight()
    const pts = [
      c,
      { x: l,     y: c.y },
      { x: l + w, y: c.y },
      { x: c.x,   y: t   },
      { x: c.x,   y: t+h },
      { x: l,     y: t   },
      { x: l+w,   y: t   },
      { x: l,     y: t+h },
      { x: l+w,   y: t+h },
    ]
    if (obj.type === 'polyline') {
      const m = (obj as any).calcTransformMatrix()
      ;((obj as any).get('points') as { x: number; y: number }[]).forEach(pt => {
        const gp = fabric.util.transformPoint(new fabric.Point(pt.x, pt.y), m)
        pts.push({ x: gp.x, y: gp.y })
      })
    }
    for (const p of pts) {
      const d = Math.hypot(p.x - px, p.y - py)
      if (d < SNAP_R && (!best || d < best.dist)) best = { x: p.x, y: p.y, objId: id, dist: d }
    }
  })
  return best
}

// ─── LASSO ───────────────────────────────────────────────────────────────────

/** Ray-casting point-in-polygon test (for lasso selection). */
export function pointInPoly(
  pt: { x: number; y: number },
  poly: { x: number; y: number }[],
): boolean {
  if (poly.length < 3) return false
  let inside = false
  const n = poly.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x, yi = poly[i].y
    const xj = poly[j].x, yj = poly[j].y
    if (((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi))
      inside = !inside
  }
  return inside
}
