/**
 * Misure come in Figma: con un oggetto selezionato, tieni premuto Alt e passa
 * sopra un altro oggetto per vedere le distanze in px. Sopra il vuoto, le
 * distanze sono verso la tavola che contiene la selezione.
 */
import * as fabric from 'fabric'
import { boardOf } from './artboards'

const RED = '#F24822'

interface Box { l: number; t: number; r: number; b: number }
const boxOf = (o: fabric.FabricObject): Box => {
  const r = o.getBoundingRect() // coordinate di scena
  return { l: r.left, t: r.top, r: r.left + r.width, b: r.top + r.height }
}

export interface Gap { x1: number; y1: number; x2: number; y2: number; value: number }

/** Linee di misura tra la selezione `a` e l'oggetto `b` (in coordinate di scena). */
export function gaps(a: Box, b: Box): Gap[] {
  const out: Gap[] = []
  const contains = b.l <= a.l && b.t <= a.t && b.r >= a.r && b.b >= a.b
  const midY = (Math.max(a.t, b.t) + Math.min(a.b, b.b)) / 2, midX = (Math.max(a.l, b.l) + Math.min(a.r, b.r)) / 2
  const cy = (a.t + a.b) / 2, cx = (a.l + a.r) / 2
  if (contains) { // dentro: distanza da ogni bordo del contenitore
    out.push({ x1: b.l, y1: cy, x2: a.l, y2: cy, value: a.l - b.l }, { x1: a.r, y1: cy, x2: b.r, y2: cy, value: b.r - a.r })
    out.push({ x1: cx, y1: b.t, x2: cx, y2: a.t, value: a.t - b.t }, { x1: cx, y1: a.b, x2: cx, y2: b.b, value: b.b - a.b })
    return out.filter(g => g.value > 0.01)
  }
  const overlapY = a.t < b.b && b.t < a.b, overlapX = a.l < b.r && b.l < a.r
  const y = overlapY ? midY : cy, x = overlapX ? midX : cx
  if (a.r <= b.l) out.push({ x1: a.r, y1: y, x2: b.l, y2: y, value: b.l - a.r })
  else if (b.r <= a.l) out.push({ x1: b.r, y1: y, x2: a.l, y2: y, value: a.l - b.r })
  if (a.b <= b.t) out.push({ x1: x, y1: a.b, x2: x, y2: b.t, value: b.t - a.b })
  else if (b.b <= a.t) out.push({ x1: x, y1: b.b, x2: x, y2: a.t, value: a.t - b.b })
  if (!out.length) { // si sovrappongono: scarto tra i bordi a sinistra e in alto
    out.push({ x1: Math.min(a.l, b.l), y1: y, x2: Math.max(a.l, b.l), y2: y, value: Math.abs(a.l - b.l) })
    out.push({ x1: x, y1: Math.min(a.t, b.t), x2: x, y2: Math.max(a.t, b.t), value: Math.abs(a.t - b.t) })
  }
  return out.filter(g => g.value > 0.01)
}

const fmt = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1))

export function installMeasure(canvas: fabric.Canvas) {
  let alt = false
  let hover: fabric.FabricObject | undefined

  const draw = () => {
    if (!alt) return
    const active = canvas.getActiveObject()
    if (!active) return
    const other = hover && hover !== active && !canvas.getActiveObjects().includes(hover) ? hover : boardOf(canvas, active)
    if (!other || other === active) return
    const A = boxOf(active), B = boxOf(other)
    const ctx = canvas.getContext()
    const v = canvas.viewportTransform
    const S = (x: number, y: number) => fabric.util.transformPoint(new fabric.Point(x, y), v)
    ctx.save()
    ctx.setTransform(canvas.getRetinaScaling(), 0, 0, canvas.getRetinaScaling(), 0, 0)
    // riquadro dell'oggetto di riferimento
    const p0 = S(B.l, B.t), p1 = S(B.r, B.b)
    ctx.strokeStyle = RED; ctx.lineWidth = 1; ctx.setLineDash([4, 3])
    ctx.strokeRect(p0.x + 0.5, p0.y + 0.5, p1.x - p0.x, p1.y - p0.y)
    ctx.setLineDash([])
    ctx.font = '600 11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    for (const g of gaps(A, B)) {
      const a = S(g.x1, g.y1), b = S(g.x2, g.y2)
      // linee nitide: sul mezzo pixel
      if (Math.abs(a.y - b.y) < 0.5) a.y = b.y = Math.round(a.y) + 0.5
      else if (Math.abs(a.x - b.x) < 0.5) a.x = b.x = Math.round(a.x) + 0.5
      ctx.strokeStyle = RED; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
      // stanghette alle estremità
      const vert = Math.abs(a.x - b.x) < 0.5
      for (const p of [a, b]) {
        if (vert) { ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x + 4, p.y) } else { ctx.moveTo(p.x, p.y - 4); ctx.lineTo(p.x, p.y + 4) }
      }
      ctx.stroke()
      const label = fmt(g.value), w = ctx.measureText(label).width + 10
      const mx = (a.x + b.x) / 2 + (vert ? w / 2 + 4 : 0), my = (a.y + b.y) / 2 + (vert ? 0 : -12)
      ctx.fillStyle = RED
      ctx.beginPath(); ctx.roundRect(mx - w / 2, my - 9, w, 18, 4); ctx.fill()
      ctx.fillStyle = '#ffffff'; ctx.fillText(label, mx, my + 0.5)
    }
    ctx.restore()
  }

  const setAlt = (v: boolean) => { if (alt !== v) { alt = v; canvas.requestRenderAll() } }
  const onKey = (e: KeyboardEvent) => setAlt(e.altKey)
  const onBlur = () => setAlt(false)
  const onMove = (e: fabric.TPointerEventInfo) => {
    const t = e.target && !(e.target as fabric.FabricObject & { isArtboard?: boolean }).isArtboard ? e.target : undefined
    const was = hover
    hover = t
    const a = (e.e as MouseEvent).altKey
    if (a !== alt) setAlt(a)
    else if (alt && was !== hover) canvas.requestRenderAll()
  }
  const onOut = () => { if (hover) { hover = undefined; if (alt) canvas.requestRenderAll() } }

  canvas.on('after:render', draw)
  canvas.on('mouse:move', onMove)
  canvas.on('mouse:out', onOut)
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
  window.addEventListener('blur', onBlur)
  return () => {
    canvas.off('after:render', draw); canvas.off('mouse:move', onMove); canvas.off('mouse:out', onOut)
    window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', onBlur)
  }
}
