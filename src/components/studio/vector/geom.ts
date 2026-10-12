/**
 * Geometria vettoriale comune: qualunque oggetto Fabric → poligoni in coordinate
 * di scena (con buchi e più contorni), e ritorno a tracciato Fabric.
 * Base per Pathfinder, Offset, Fusione.
 */
import * as fabric from 'fabric'
import polygonClipping, { type MultiPolygon, type Pair, type Ring } from 'polygon-clipping'

export type { MultiPolygon, Pair, Ring }

const STEPS = 24 // campioni per curva di Bézier

type Mat = fabric.TMat2D

function tp(m: Mat, x: number, y: number): Pair {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

export function ringArea(r: Ring) {
  let a = 0
  for (let i = 0, n = r.length; i < n; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % n]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}

function close(r: Ring): Ring {
  if (r.length && (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1])) r.push([r[0][0], r[0][1]])
  return r
}

/** Contorni di un tracciato Fabric (comandi già normalizzati da Fabric: M L C Q Z assoluti). */
function pathRings(p: fabric.Path, m: Mat): Ring[] {
  const ox = p.pathOffset?.x ?? 0, oy = p.pathOffset?.y ?? 0
  const T = (x: number, y: number) => tp(m, x - ox, y - oy)
  const rings: Ring[] = []
  let cur: Ring = [], cx = 0, cy = 0, sx = 0, sy = 0
  const flush = () => { if (cur.length > 2) rings.push(close(cur)); cur = [] }
  for (const cmd of p.path as unknown as (string | number)[][]) {
    const t = cmd[0] as string, a = cmd.slice(1) as number[]
    if (t === 'M') { flush(); cx = sx = a[0]; cy = sy = a[1]; cur.push(T(cx, cy)) }
    else if (t === 'L') { cx = a[0]; cy = a[1]; cur.push(T(cx, cy)) }
    else if (t === 'C') {
      for (let i = 1; i <= STEPS; i++) {
        const s = i / STEPS, u = 1 - s
        cur.push(T(u * u * u * cx + 3 * u * u * s * a[0] + 3 * u * s * s * a[2] + s * s * s * a[4],
          u * u * u * cy + 3 * u * u * s * a[1] + 3 * u * s * s * a[3] + s * s * s * a[5]))
      }
      cx = a[4]; cy = a[5]
    } else if (t === 'Q') {
      for (let i = 1; i <= STEPS; i++) {
        const s = i / STEPS, u = 1 - s
        cur.push(T(u * u * cx + 2 * u * s * a[0] + s * s * a[2], u * u * cy + 2 * u * s * a[1] + s * s * a[3]))
      }
      cx = a[2]; cy = a[3]
    } else if (t === 'Z' || t === 'z') { flush(); cx = sx; cy = sy }
  }
  flush()
  return rings
}

function ellipseRing(m: Mat, rx: number, ry: number): Ring {
  const n = Math.max(32, Math.min(128, Math.round((rx + ry) / 3)))
  const r: Ring = []
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; r.push(tp(m, Math.cos(a) * rx, Math.sin(a) * ry)) }
  return close(r)
}

function rectRing(m: Mat, w: number, h: number, rx = 0, ry = 0): Ring {
  const hw = w / 2, hh = h / 2
  rx = Math.min(rx, hw); ry = Math.min(ry || rx, hh)
  if (!rx || !ry) return close([tp(m, -hw, -hh), tp(m, hw, -hh), tp(m, hw, hh), tp(m, -hw, hh)])
  const r: Ring = []
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * (Math.PI / 2); r.push(tp(m, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)) }
  }
  corner(hw - rx, -hh + ry, -Math.PI / 2); corner(hw - rx, hh - ry, 0); corner(-hw + rx, hh - ry, Math.PI / 2); corner(-hw + rx, -hh + ry, Math.PI)
  return close(r)
}

/**
 * Contorni con la regola di riempimento: pari-dispari → XOR dei contorni;
 * non-zero → i contorni con il verso del più grande si sommano, gli altri bucano.
 */
function ringsToMP(rings: Ring[], evenOdd: boolean): MultiPolygon {
  if (!rings.length) return []
  if (rings.length === 1) return [[rings[0]]]
  if (evenOdd) return polygonClipping.xor([[rings[0]]], ...rings.slice(1).map(r => [[r]] as MultiPolygon))
  const big = rings.reduce((a, b) => (Math.abs(ringArea(b)) > Math.abs(ringArea(a)) ? b : a))
  const sign = Math.sign(ringArea(big))
  const plus = rings.filter(r => Math.sign(ringArea(r)) === sign), minus = rings.filter(r => Math.sign(ringArea(r)) !== sign)
  let mp = polygonClipping.union([[plus[0]]], ...plus.slice(1).map(r => [[r]] as MultiPolygon))
  if (minus.length) mp = polygonClipping.difference(mp, ...minus.map(r => [[r]] as MultiPolygon))
  return mp
}

/** true se l'oggetto ha una forma che si può trasformare in poligoni */
export function isShape(o: fabric.FabricObject): boolean {
  if (o instanceof fabric.Group) return o.getObjects().some(isShape)
  return ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'triangle'].includes(o.type)
}

/** Oggetto (anche gruppo) → MultiPolygon in coordinate di scena. */
export function toMultiPolygon(o: fabric.FabricObject, parent?: Mat): MultiPolygon {
  const own = o.calcOwnMatrix()
  const m = parent ? fabric.util.multiplyTransformMatrices(parent, own) : o.calcTransformMatrix()
  if (o instanceof fabric.Group) {
    const parts = o.getObjects().map(c => toMultiPolygon(c, m)).filter(mp => mp.length)
    return parts.length ? polygonClipping.union(parts[0], ...parts.slice(1)) : []
  }
  let rings: Ring[] = []
  if (o.type === 'path') rings = pathRings(o as fabric.Path, m)
  else if (o.type === 'rect') { const r = o as fabric.Rect; rings = [rectRing(m, r.width, r.height, r.rx, r.ry)] }
  else if (o.type === 'circle') { const c = o as fabric.Circle; rings = [ellipseRing(m, c.radius, c.radius)] }
  else if (o.type === 'ellipse') { const e = o as fabric.Ellipse; rings = [ellipseRing(m, e.rx, e.ry)] }
  else if (o.type === 'triangle') { const w = o.width / 2, h = o.height / 2; rings = [close([tp(m, 0, -h), tp(m, w, h), tp(m, -w, h)])] }
  else if (o.type === 'polygon' || o.type === 'polyline') {
    const p = o as fabric.Polygon, ox = p.pathOffset.x, oy = p.pathOffset.y
    rings = [close(p.points.map(q => tp(m, q.x - ox, q.y - oy)))]
  }
  return ringsToMP(rings.filter(r => r.length > 3), (o as fabric.Path).fillRule === 'evenodd')
}

export function mpToPathD(mp: MultiPolygon) {
  const f = (n: number) => Math.round(n * 100) / 100
  let d = ''
  for (const poly of mp) for (const ring of poly) {
    // l'ultimo punto ripete il primo: lo chiude la Z
    const pts = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring
    pts.forEach((p, i) => { d += `${i ? ' L' : ' M'} ${f(p[0])} ${f(p[1])}` })
    d += ' Z'
  }
  return d.trim()
}

/** Stile "da forma" da copiare sul risultato (riempimento, tratto, opacità, effetti). */
export function styleOf(o: fabric.FabricObject) {
  const src = o instanceof fabric.Group ? (o.getObjects().find(isShape) ?? o) : o
  return {
    fill: src.fill ?? '#ffffff', stroke: src.stroke ?? null, strokeWidth: src.strokeWidth ?? 0,
    opacity: o.opacity ?? 1, strokeLineJoin: src.strokeLineJoin, strokeLineCap: src.strokeLineCap,
  }
}

/** Tracciato Fabric da poligoni di scena: si posiziona da solo dove sono i punti. */
export function pathFromMP(mp: MultiPolygon, style: Partial<fabric.FabricObjectProps> = {}) {
  const p = new fabric.Path(mpToPathD(mp), { fillRule: 'evenodd', objectCaching: false, ...style })
  // Fabric 7 posiziona dall'origine al centro: si allinea il riquadro ai punti
  const b = bounds(mp)
  p.setPositionByOrigin(new fabric.Point(b.x + b.w / 2, b.y + b.h / 2), 'center', 'center')
  p.setCoords()
  return p
}

export function bounds(mp: MultiPolygon) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const poly of mp) for (const r of poly) for (const [x, y] of r) {
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** Contorno esterno più grande (per fusioni di forma). */
export function mainRing(mp: MultiPolygon): Ring | null {
  let best: Ring | null = null, area = 0
  for (const poly of mp) { const a = Math.abs(ringArea(poly[0])); if (a > area) { area = a; best = poly[0] } }
  return best
}

/** Ricampiona un contorno chiuso a n punti equidistanti lungo il perimetro. */
export function resample(r: Ring, n: number): Pair[] {
  const pts = r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] ? r.slice(0, -1) : r.slice()
  const seg: number[] = []
  let L = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push(d); L += d
  }
  const out: Pair[] = []
  let i = 0, acc = 0
  for (let k = 0; k < n; k++) {
    const target = (k / n) * L
    while (i < pts.length - 1 && acc + seg[i] < target) { acc += seg[i]; i++ }
    const a = pts[i], b = pts[(i + 1) % pts.length], t = seg[i] ? (target - acc) / seg[i] : 0
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
  }
  return out
}
