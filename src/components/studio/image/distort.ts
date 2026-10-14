/**
 * Distorci / Prospettiva a 4 angoli (Photoshop: Trasforma › Distorci e
 * Prospettiva; Illustrator: Distorsione libera).
 *
 * - Immagini: la foto viene rideformata ad ogni spostamento (omografia, disegnata
 *   a triangoli). La foto originale e gli angoli restano salvati nell'oggetto,
 *   quindi la distorsione resta modificabile anche dopo aver riaperto il progetto.
 * - Forme e tracciati: si trasformano i punti stessi, il risultato resta vettoriale.
 * - Testi e gruppi diventano prima un'immagine.
 *
 * Trascina un angolo: distorsione libera. Maiusc+trascina: prospettiva
 * (l'angolo accanto si muove a specchio). Invio, Esc o clic fuori: fine.
 */
import * as fabric from 'fabric'
import { convertToPath } from '../vector/direct-select'

type Quad = [number, number, number, number, number, number, number, number] // tl tr br bl
type WarpImg = fabric.FabricImage & { warpCorners?: Quad; warpSrc?: string; warpSize?: [number, number]; warpOff?: [number, number] }

const ACCENT = '#7C3AED'
const GRID = 16
const MAX_SIDE = 8000

interface Session {
  target: fabric.FabricObject
  kind: 'image' | 'path'
  corners: Quad
  start?: Quad // angoli all'inizio del trascinamento (per la prospettiva)
  srcEl?: CanvasImageSource & { width: number; height: number }
  srcCmds?: (string | number)[][]
  rect?: { x: number; y: number; w: number; h: number }
  saved: { controls: Record<string, fabric.Control>; hasBorders: boolean }
  off: () => void
}
const sessions = new WeakMap<fabric.Canvas, Session>()

export const isDistorting = (canvas: fabric.Canvas) => sessions.has(canvas)
export const isWarped = (o?: fabric.FabricObject | null) => !!(o as WarpImg | undefined)?.warpCorners

// ── omografia ───────────────────────────────────────────────────────────────

/** Quadrato unitario → quadrilatero (Heckbert). Restituisce la funzione (u,v) → (x,y). */
function squareToQuad(q: Quad) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3
  let a, b, c, d, e, f, g, h
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    a = x1 - x0; b = x2 - x1; c = x0; d = y1 - y0; e = y2 - y1; f = y0; g = 0; h = 0
  } else {
    const det = dx1 * dy2 - dx2 * dy1 || 1e-9
    g = (dx3 * dy2 - dx2 * dy3) / det
    h = (dx1 * dy3 - dx3 * dy1) / det
    a = x1 - x0 + g * x1; b = x3 - x0 + h * x3; c = x0
    d = y1 - y0 + g * y1; e = y3 - y0 + h * y3; f = y0
  }
  return (u: number, v: number): [number, number] => {
    const w = g * u + h * v + 1
    return [(a * u + b * v + c) / w, (d * u + e * v + f) / w]
  }
}

/** Il quadrilatero deve restare convesso, altrimenti la foto si ribalta su se stessa. */
function convex(q: Quad) {
  let sign = 0
  for (let i = 0; i < 4; i++) {
    const ax = q[i * 2], ay = q[i * 2 + 1], bx = q[((i + 1) % 4) * 2], by = q[((i + 1) % 4) * 2 + 1], cx = q[((i + 2) % 4) * 2], cy = q[((i + 2) % 4) * 2 + 1]
    const z = (bx - ax) * (cy - by) - (by - ay) * (cx - bx)
    if (Math.abs(z) < 1e-6) return false
    if (sign && Math.sign(z) !== sign) return false
    sign = Math.sign(z)
  }
  return true
}

const bbox = (q: Quad) => {
  const xs = [q[0], q[2], q[4], q[6]], ys = [q[1], q[3], q[5], q[7]]
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
}

/** Disegna `img` deformata nel quadrilatero (coordinate relative al centro della foto originale). */
export function warpImage(img: CanvasImageSource & { width: number; height: number }, w0: number, h0: number, q: Quad) {
  const { minX, minY, maxX, maxY } = bbox(q)
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.ceil(maxX - minX)); out.height = Math.max(1, Math.ceil(maxY - minY))
  const ctx = out.getContext('2d')!
  const H = squareToQuad(q)
  const sx = img.width / w0, sy = img.height / h0 // pixel della sorgente per unità
  const P: [number, number][][] = []
  for (let j = 0; j <= GRID; j++) {
    P[j] = []
    for (let i = 0; i <= GRID; i++) { const [x, y] = H(i / GRID, j / GRID); P[j][i] = [x - minX, y - minY] }
  }
  const tri = (src: [number, number][], dst: [number, number][]) => {
    const [s0, s1, s2] = src, [d0, d1, d2] = dst
    // allarga di poco il triangolo di destinazione per non lasciare fessure tra i pezzi
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3
    const grow = (p: [number, number]) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + (dx / l) * 0.7, p[1] + (dy / l) * 0.7] }
    const u1 = s1[0] - s0[0], v1 = s1[1] - s0[1], u2 = s2[0] - s0[0], v2 = s2[1] - s0[1]
    const den = u1 * v2 - u2 * v1
    if (Math.abs(den) < 1e-9) return
    const dx1 = d1[0] - d0[0], dy1 = d1[1] - d0[1], dx2 = d2[0] - d0[0], dy2 = d2[1] - d0[1]
    const a = (dx1 * v2 - dx2 * v1) / den, c = (dx2 * u1 - dx1 * u2) / den
    const b = (dy1 * v2 - dy2 * v1) / den, d = (dy2 * u1 - dy1 * u2) / den
    const e = d0[0] - a * s0[0] - c * s0[1], f = d0[1] - b * s0[0] - d * s0[1]
    ctx.save()
    ctx.beginPath()
    const g = [grow(d0), grow(d1), grow(d2)]
    ctx.moveTo(g[0][0], g[0][1]); ctx.lineTo(g[1][0], g[1][1]); ctx.lineTo(g[2][0], g[2][1]); ctx.closePath()
    ctx.clip()
    ctx.setTransform(a, b, c, d, e, f)
    ctx.drawImage(img, 0, 0)
    ctx.restore()
  }
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    const s = (ii: number, jj: number): [number, number] => [(ii / GRID) * w0 * sx, (jj / GRID) * h0 * sy]
    tri([s(i, j), s(i + 1, j), s(i, j + 1)], [P[j][i], P[j][i + 1], P[j + 1][i]])
    tri([s(i + 1, j), s(i + 1, j + 1), s(i, j + 1)], [P[j][i + 1], P[j + 1][i + 1], P[j + 1][i]])
  }
  return { canvas: out, center: [(minX + maxX) / 2, (minY + maxY) / 2] as [number, number] }
}

// ── applicazione ────────────────────────────────────────────────────────────

function applyImage(s: Session) {
  const o = s.target as WarpImg
  const [w0, h0] = o.warpSize!
  const { canvas: el, center } = warpImage(s.srcEl!, w0, h0, s.corners)
  const L = o.calcOwnMatrix()
  const prev = o.warpOff ?? [0, 0]
  // origine della foto originale nel piano del genitore: resta ferma
  const origin = o.getRelativeCenterPoint().subtract(fabric.util.transformPoint(new fabric.Point(prev[0], prev[1]), L, true))
  o.set({ cropX: 0, cropY: 0 })
  o.setElement(el)
  o.warpCorners = [...s.corners] as Quad
  o.warpOff = center
  o.setPositionByOrigin(origin.add(fabric.util.transformPoint(new fabric.Point(center[0], center[1]), L, true)), 'center', 'center')
  o.set('dirty', true)
  o.setCoords()
}

function applyPath(s: Session) {
  const p = s.target as fabric.Path
  const { x, y, w, h } = s.rect!
  const H = squareToQuad(s.corners)
  const out = s.srcCmds!.map(c => {
    const n = [...c]
    for (let k = 1; k + 1 < n.length; k += 2) {
      const [X, Y] = H(((n[k] as number) - x) / w, ((n[k + 1] as number) - y) / h)
      n[k] = X; n[k + 1] = Y
    }
    return n
  })
  const before = p.pathOffset.clone(), center = p.getRelativeCenterPoint()
  p.set({ path: out as unknown as fabric.TSimplePathData })
  p.setDimensions()
  p.setPositionByOrigin(center.add(fabric.util.transformPoint(p.pathOffset.subtract(before), p.calcOwnMatrix(), true)), 'center', 'center')
  p.set('dirty', true)
  p.setCoords()
}

const apply = (s: Session) => (s.kind === 'image' ? applyImage(s) : applyPath(s))

/** Angoli: coordinate di lavoro → schermo, e mouse (scena) → coordinate di lavoro. */
function frameOf(s: Session) {
  const o = s.target
  if (s.kind === 'path') {
    const p = o as fabric.Path
    return {
      toScreen: (x: number, y: number) => fabric.util.transformPoint(new fabric.Point(x - p.pathOffset.x, y - p.pathOffset.y),
        fabric.util.multiplyTransformMatrices(p.getViewportTransform(), p.calcTransformMatrix())),
      fromScene: (x: number, y: number) => fabric.util.transformPoint(new fabric.Point(x, y), fabric.util.invertTransform(p.calcTransformMatrix())).add(p.pathOffset),
    }
  }
  const off = () => { const w = (o as WarpImg).warpOff ?? [0, 0]; return new fabric.Point(w[0], w[1]) }
  return {
    toScreen: (x: number, y: number) => fabric.util.transformPoint(new fabric.Point(x, y).subtract(off()),
      fabric.util.multiplyTransformMatrices(o.getViewportTransform(), o.calcTransformMatrix())),
    fromScene: (x: number, y: number) => fabric.util.transformPoint(new fabric.Point(x, y), fabric.util.invertTransform(o.calcTransformMatrix())).add(off()),
  }
}

const PARTNER_H = [1, 0, 3, 2] // tl↔tr, br↔bl
const PARTNER_V = [3, 2, 1, 0] // tl↔bl, tr↔br

function cornerControl(s: Session, k: number) {
  return new fabric.Control({
    sizeX: 12, sizeY: 12, cursorStyle: 'crosshair', actionName: 'distort',
    positionHandler: () => frameOf(s).toScreen(s.corners[k * 2], s.corners[k * 2 + 1]),
    mouseDownHandler: () => { s.start = [...s.corners] as Quad; return false },
    actionHandler: (ev, _t, x, y) => {
      const m = frameOf(s).fromScene(x, y)
      const st = s.start ?? s.corners
      const next = [...s.corners] as Quad
      if ((ev as MouseEvent).shiftKey) {
        // prospettiva: si muove sull'asse dominante, l'angolo accanto a specchio
        const dx = m.x - st[k * 2], dy = m.y - st[k * 2 + 1]
        next.splice(0, 8, ...st)
        if (Math.abs(dx) >= Math.abs(dy)) {
          const p = PARTNER_H[k]
          next[k * 2] = st[k * 2] + dx; next[p * 2] = st[p * 2] - dx
        } else {
          const p = PARTNER_V[k]
          next[k * 2 + 1] = st[k * 2 + 1] + dy; next[p * 2 + 1] = st[p * 2 + 1] - dy
        }
      } else { next[k * 2] = m.x; next[k * 2 + 1] = m.y }
      const b = bbox(next)
      if (!convex(next) || b.maxX - b.minX > MAX_SIDE || b.maxY - b.minY > MAX_SIDE) return false
      s.corners = next
      apply(s)
      return true
    },
    render: (ctx, left, top, _st, o) => {
      ctx.save()
      if (k === 0) { // il contorno del quadrilatero, disegnato una volta sola
        const f = frameOf(s)
        const pts = [0, 1, 2, 3].map(i => f.toScreen(s.corners[i * 2], s.corners[i * 2 + 1]))
        ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4])
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke()
        ctx.setLineDash([])
      }
      void o
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = ACCENT; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(left, top, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.restore()
    },
  })
}

function loadEl(url: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const el = new Image()
    el.crossOrigin = 'anonymous'
    el.onload = () => res(el); el.onerror = () => rej(new Error('Immagine originale non leggibile'))
    el.src = url
  })
}

/** Ritaglio visibile della foto, senza filtri: è la sorgente della distorsione. */
function visibleSource(img: fabric.FabricImage) {
  const el = ((img as unknown as { _originalElement?: CanvasImageSource })._originalElement ?? img.getElement()) as HTMLImageElement
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(img.width)); c.height = Math.max(1, Math.round(img.height))
  c.getContext('2d')!.drawImage(el, img.cropX, img.cropY, img.width, img.height, 0, 0, c.width, c.height)
  return c
}

/** Testi, gruppi e altro: diventano un'immagine al doppio della risoluzione. */
function rasterize(canvas: fabric.Canvas, o: fabric.FabricObject) {
  const m = 2
  const el = o.toCanvasElement({ multiplier: m, withoutTransform: true })
  const img = new fabric.FabricImage(el, {
    angle: o.angle, flipX: o.flipX, flipY: o.flipY, scaleX: o.scaleX / m, scaleY: o.scaleY / m, // l'opacità è già nei pixel
    globalCompositeOperation: o.globalCompositeOperation,
  })
  img.set('name', (o as fabric.FabricObject & { name?: string }).name ?? 'Immagine')
  img.setPositionByOrigin(o.getRelativeCenterPoint(), 'center', 'center')
  const at = canvas.getObjects().indexOf(o)
  canvas.remove(o)
  canvas.insertAt(Math.max(0, at), img)
  return img
}

export async function startDistort(canvas: fabric.Canvas, o?: fabric.FabricObject | null): Promise<string | null> {
  if (!o || o instanceof fabric.ActiveSelection) return 'Seleziona un solo oggetto.'
  if ((o as fabric.FabricObject & { isArtboard?: boolean }).isArtboard) return 'Le tavole non si distorcono.'
  endDistort(canvas)
  let target: fabric.FabricObject = o
  let kind: Session['kind']
  const base = { corners: [0, 0, 0, 0, 0, 0, 0, 0] as Quad } as Partial<Session>
  if (o instanceof fabric.FabricImage) {
    kind = 'image'
    const w = o as WarpImg
    if (w.warpCorners && w.warpSrc && w.warpSize) {
      base.srcEl = await loadEl(w.warpSrc)
      base.corners = [...w.warpCorners] as Quad
    } else {
      const src = visibleSource(o)
      base.srcEl = src
      w.warpSrc = src.toDataURL('image/png')
      w.warpSize = [o.width, o.height]
      w.warpOff = [0, 0]
      const hw = o.width / 2, hh = o.height / 2
      base.corners = [-hw, -hh, hw, -hh, hw, hh, -hw, hh]
    }
  } else {
    const p = o instanceof fabric.Path || o instanceof fabric.Rect || o instanceof fabric.Ellipse || o instanceof fabric.Circle
      || o instanceof fabric.Triangle || o instanceof fabric.Polyline ? convertToPath(canvas, o) : null
    if (p) {
      kind = 'path'
      target = p
      p.setDimensions()
      const w = Math.max(p.width, 1e-3), h = Math.max(p.height, 1e-3)
      const x = p.pathOffset.x - w / 2, y = p.pathOffset.y - h / 2
      base.rect = { x, y, w, h }
      base.srcCmds = (p.path as unknown as (string | number)[][]).map(c => [...c])
      base.corners = [x, y, x + w, y, x + w, y + h, x, y + h]
    } else {
      kind = 'image'
      const img = rasterize(canvas, o)
      target = img
      const w = img as WarpImg
      const src = visibleSource(img)
      base.srcEl = src
      w.warpSrc = src.toDataURL('image/png')
      w.warpSize = [img.width, img.height]
      w.warpOff = [0, 0]
      const hw = img.width / 2, hh = img.height / 2
      base.corners = [-hw, -hh, hw, -hh, hw, hh, -hw, hh]
    }
  }

  const s = {
    ...base, target, kind,
    saved: { controls: target.controls, hasBorders: target.hasBorders },
  } as Session
  target.controls = { d0: cornerControl(s, 0), d1: cornerControl(s, 1), d2: cornerControl(s, 2), d3: cornerControl(s, 3) }
  target.hasBorders = false
  target.setCoords()

  const onSel = () => { if (canvas.getActiveObject() !== target) endDistort(canvas) }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); endDistort(canvas) }
  }
  const onRestore = () => { s.off(); sessions.delete(canvas) } // annulla: gli oggetti sono nuovi, nulla da ripristinare
  canvas.on('selection:updated', onSel)
  canvas.on('selection:cleared', onSel)
  canvas.on('history:restored' as never, onRestore)
  window.addEventListener('keydown', onKey, true)
  s.off = () => {
    canvas.off('selection:updated', onSel); canvas.off('selection:cleared', onSel); canvas.off('history:restored' as never, onRestore)
    window.removeEventListener('keydown', onKey, true)
  }
  sessions.set(canvas, s)
  canvas.setActiveObject(target)
  if (target !== o) canvas.fire('object:modified', { target })
  canvas.requestRenderAll()
  return null
}

export function endDistort(canvas: fabric.Canvas) {
  const s = sessions.get(canvas)
  if (!s) return
  sessions.delete(canvas)
  s.off()
  const t = s.target
  t.controls = s.saved.controls
  t.hasBorders = s.saved.hasBorders
  t.setCoords()
  canvas.fire('object:modified', { target: t })
  canvas.requestRenderAll()
}

/** Toglie la distorsione da un'immagine: torna la foto (ritagliata) di partenza. */
export async function resetDistort(canvas: fabric.Canvas, o?: fabric.FabricObject | null) {
  const w = o as WarpImg | undefined
  if (!w?.warpCorners || !w.warpSrc || !w.warpSize) return
  endDistort(canvas)
  const el = await loadEl(w.warpSrc)
  const [w0, h0] = w.warpSize
  const off = w.warpOff ?? [0, 0]
  const origin = w.getRelativeCenterPoint().subtract(fabric.util.transformPoint(new fabric.Point(off[0], off[1]), w.calcOwnMatrix(), true))
  w.set({ cropX: 0, cropY: 0 })
  w.setElement(el, { width: w0, height: h0 })
  w.warpCorners = undefined; w.warpSrc = undefined; w.warpSize = undefined; w.warpOff = undefined
  w.setPositionByOrigin(origin, 'center', 'center')
  w.set('dirty', true)
  w.setCoords()
  canvas.fire('object:modified', { target: w })
  canvas.requestRenderAll()
}
