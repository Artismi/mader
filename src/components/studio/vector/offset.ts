/**
 * Offset tracciato (Illustrator: Oggetto › Tracciato › Offset tracciato).
 * Distanza positiva: contorno più grande; negativa: più piccolo (anche fino a
 * far sparire le parti sottili). Spigoli arrotondati.
 *
 * Metodo: la "fascia" attorno al contorno è l'unione di capsule (un rettangolo
 * per lato + un disco per vertice). Offset esterno = forma ∪ fascia,
 * interno = forma − fascia. Prima si semplifica il contorno per restare rapidi.
 */
import * as fabric from 'fabric'
import polygonClipping, { type MultiPolygon, type Pair, type Ring } from 'polygon-clipping'
import { isShape, pathFromMP, styleOf, toMultiPolygon } from './geom'

/** Douglas–Peucker: toglie i punti che non cambiano la forma oltre `tol` px. */
function simplify(r: Ring, tol: number): Ring {
  if (r.length < 5) return r
  const keep = new Uint8Array(r.length); keep[0] = keep[r.length - 1] = 1
  const stack: [number, number][] = [[0, r.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    let max = 0, idx = -1
    const [x1, y1] = r[a], [x2, y2] = r[b], L = Math.hypot(x2 - x1, y2 - y1)
    for (let i = a + 1; i < b; i++) {
      // contorno chiuso: primo e ultimo punto coincidono, si misura la distanza dal punto
      const d = L < 1e-9 ? Math.hypot(r[i][0] - x1, r[i][1] - y1)
        : Math.abs((x2 - x1) * (y1 - r[i][1]) - (x1 - r[i][0]) * (y2 - y1)) / L
      if (d > max) { max = d; idx = i }
    }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]) }
  }
  return r.filter((_, i) => keep[i])
}

function disc(c: Pair, r: number, n: number): Ring {
  const out: Ring = []
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]) }
  out.push(out[0])
  return out
}

function band(mp: MultiPolygon, d: number): MultiPolygon {
  const parts: MultiPolygon[] = []
  const n = Math.max(12, Math.min(48, Math.round(d * 1.5)))
  for (const poly of mp) for (const ring0 of poly) {
    const ring = simplify(ring0, Math.max(0.25, d / 40))
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i], b = ring[i + 1]
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy)
      if (L < 1e-6) continue
      const nx = (-dy / L) * d, ny = (dx / L) * d
      parts.push([[[[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny], [a[0] + nx, a[1] + ny]]]])
      parts.push([[disc(a, d, n)]])
    }
  }
  if (!parts.length) return []
  // unione a blocchi: molto più rapida di un'unica unione di centinaia di pezzi
  let acc = parts
  while (acc.length > 1) {
    const next: MultiPolygon[] = []
    for (let i = 0; i < acc.length; i += 16) {
      const chunk = acc.slice(i, i + 16)
      next.push(chunk.length > 1 ? polygonClipping.union(chunk[0], ...chunk.slice(1)) : chunk[0])
    }
    acc = next
  }
  return acc[0]
}

export function offsetMP(mp: MultiPolygon, distance: number): MultiPolygon {
  if (!distance) return mp
  const b = band(mp, Math.abs(distance))
  return distance > 0 ? polygonClipping.union(mp, b) : polygonClipping.difference(mp, b)
}

/**
 * Crea il contorno a distanza `distance` px dall'oggetto selezionato.
 * `keep`: tiene l'originale e mette il nuovo sotto (uso tipico: bordo adesivo,
 * contorno di taglio), altrimenti lo sostituisce.
 */
export function offsetSelection(canvas: fabric.Canvas, distance: number, keep = true, color?: string): string | null {
  const o = canvas.getActiveObject()
  if (!o || o instanceof fabric.ActiveSelection) return 'Seleziona una sola forma.'
  if (!isShape(o)) return 'L’offset funziona su forme e tracciati (vettorializza testi e immagini prima).'
  const mp = offsetMP(toMultiPolygon(o), distance)
  if (!mp.length) return 'Con questa distanza la forma sparisce.'
  const style = styleOf(o)
  const res = pathFromMP(mp, { ...style, ...(color ? { fill: color } : {}) })
  const at = canvas.getObjects().indexOf(o)
  if (keep) canvas.insertAt(at, res) // sotto l'originale
  else { canvas.remove(o); canvas.insertAt(at, res) }
  canvas.setActiveObject(res)
  canvas.fire('object:modified', { target: res })
  canvas.requestRenderAll()
  return null
}
