/**
 * Forme parametriche "vive", come Poligono e Stella di Illustrator: restano
 * modificabili (lati/punte, rientro, arrotondamento degli spigoli) finché non
 * le si converte o combina. Sono tracciati Fabric con i parametri salvati sopra.
 */
import * as fabric from 'fabric'

export interface PolyParams { kind: 'polygon' | 'star'; sides: number; inner: number; round: number }
type LiveShape = fabric.Path & { liveShape?: PolyParams }

export const DEFAULT_POLYGON: PolyParams = { kind: 'polygon', sides: 6, inner: 50, round: 0 }
export const DEFAULT_STAR: PolyParams = { kind: 'star', sides: 5, inner: 45, round: 0 }

export const getLiveShape = (o?: fabric.FabricObject | null) => (o as LiveShape | undefined)?.liveShape

const f = (n: number) => Math.round(n * 100) / 100

/** Vertici attorno all'origine, raggio R, prima punta in alto. */
function vertices(p: PolyParams, R: number): [number, number][] {
  const n = Math.max(3, Math.round(p.sides))
  const count = p.kind === 'star' ? n * 2 : n
  const out: [number, number][] = []
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2
    const r = p.kind === 'star' && i % 2 ? R * Math.max(0.05, Math.min(0.98, p.inner / 100)) : R
    out.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  return out
}

/**
 * Spigoli arrotondati: ogni vertice viene sostituito da una curva che parte e arriva
 * a una distanza proporzionale al lato più corto (0–100% di metà lato).
 */
export function polyPathD(p: PolyParams, R = 100) {
  const v = vertices(p, R)
  const k = Math.max(0, Math.min(100, p.round)) / 100
  if (!k) return v.map((q, i) => `${i ? 'L' : 'M'} ${f(q[0])} ${f(q[1])}`).join(' ') + ' Z'
  const n = v.length
  let d = ''
  for (let i = 0; i < n; i++) {
    const prev = v[(i - 1 + n) % n], cur = v[i], next = v[(i + 1) % n]
    const lp = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]), ln = Math.hypot(next[0] - cur[0], next[1] - cur[1])
    const cut = (Math.min(lp, ln) / 2) * k
    const a: [number, number] = [cur[0] + ((prev[0] - cur[0]) / lp) * cut, cur[1] + ((prev[1] - cur[1]) / lp) * cut]
    const b: [number, number] = [cur[0] + ((next[0] - cur[0]) / ln) * cut, cur[1] + ((next[1] - cur[1]) / ln) * cut]
    d += `${i ? ' L' : 'M'} ${f(a[0])} ${f(a[1])} Q ${f(cur[0])} ${f(cur[1])} ${f(b[0])} ${f(b[1])}`
  }
  return d + ' Z'
}

export function makeLiveShape(p: PolyParams, at: { x: number; y: number }, style: Partial<fabric.FabricObjectProps> = {}) {
  const shape = new fabric.Path(polyPathD(p), { strokeWidth: 0, objectCaching: false, ...style }) as LiveShape
  shape.liveShape = { ...p }
  shape.set('name', p.kind === 'star' ? 'Stella' : 'Poligono')
  shape.setPositionByOrigin(new fabric.Point(at.x, at.y), 'center', 'center')
  shape.setCoords()
  return shape
}

/**
 * Cambia i parametri ricreando il tracciato: centro, scala, rotazione e stile restano.
 * La misura visiva si mantiene: il nuovo disegno ha lo stesso raggio di base.
 */
export function updateLiveShape(canvas: fabric.Canvas, s: fabric.FabricObject, patch: Partial<PolyParams>) {
  const live = s as LiveShape
  if (!live.liveShape || s.type !== 'path') return
  const p = { ...live.liveShape, ...patch }
  const center = s.getCenterPoint()
  const fresh = new fabric.Path(polyPathD(p))
  live.set({ path: fresh.path })
  live.setDimensions() // riquadro e pathOffset del nuovo disegno
  live.liveShape = p
  live.setPositionByOrigin(center, 'center', 'center')
  live.setCoords()
  live.dirty = true
  canvas.fire('object:modified', { target: live })
  canvas.requestRenderAll()
}
