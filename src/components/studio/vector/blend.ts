/**
 * Fusione (Illustrator: Oggetto › Fusione): passaggi intermedi tra due oggetti.
 * - Due forme: la forma stessa si trasforma (contorni ricampionati e allineati),
 *   insieme a colore e opacità.
 * - Altri oggetti (testi, immagini, gruppi): copie che passano gradualmente da
 *   posizione, scala, rotazione, opacità e colore del primo a quelli del secondo.
 * Il gruppo ricorda gli estremi: il numero di passaggi resta modificabile.
 */
import * as fabric from 'fabric'
import { SERIAL_PROPS } from '../canvas-serial'
import { isShape, mainRing, pathFromMP, resample, ringArea, styleOf, toMultiPolygon, type Pair } from './geom'

type BlendGroup = fabric.Group & { blendSteps?: number; blendSrc?: [object, object] }
export const getBlend = (o?: fabric.FabricObject | null) => {
  const g = o as BlendGroup | undefined
  return g?.blendSrc ? g.blendSteps ?? 0 : undefined
}

const N = 160 // punti per contorno nel morph

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function lerpColor(a: unknown, b: unknown, t: number) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b || a === 'transparent' || b === 'transparent') return t < 0.5 ? a : b
  const ca = new fabric.Color(a).getSource(), cb = new fabric.Color(b).getSource()
  const c = ca.map((v, i) => (i < 3 ? Math.round(lerp(v, cb[i], t)) : lerp(v, cb[i], t)))
  return `rgba(${c[0]},${c[1]},${c[2]},${Math.round(c[3] * 1000) / 1000})`
}

/** Allinea il contorno B ad A: stesso verso e punto di partenza più vicino. */
function align(a: Pair[], b: Pair[]): Pair[] {
  if (Math.sign(ringArea(a)) !== Math.sign(ringArea(b))) b = b.slice().reverse()
  const ca = centroid(a), cb = centroid(b)
  let best = 0, bestD = Infinity
  for (let s = 0; s < b.length; s += 2) {
    let d = 0
    for (let i = 0; i < a.length; i += 8) {
      const p = a[i], q = b[(i + s) % b.length]
      d += Math.hypot(p[0] - ca[0] - (q[0] - cb[0]), p[1] - ca[1] - (q[1] - cb[1]))
    }
    if (d < bestD) { bestD = d; best = s }
  }
  return b.map((_, i) => b[(i + best) % b.length])
}

function centroid(r: Pair[]): Pair {
  let x = 0, y = 0
  for (const p of r) { x += p[0]; y += p[1] }
  return [x / r.length, y / r.length]
}

async function steps(srcA: object, srcB: object, n: number): Promise<fabric.FabricObject[]> {
  const [A, B] = await fabric.util.enlivenObjects<fabric.FabricObject>([srcA, srcB])
  const out: fabric.FabricObject[] = []
  const ra = isShape(A) && isShape(B) ? mainRing(toMultiPolygon(A)) : null
  const rb = ra ? mainRing(toMultiPolygon(B)) : null
  if (ra && rb) {
    const pa = resample(ra, N), pb = align(pa, resample(rb, N))
    const sa = styleOf(A), sb = styleOf(B)
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1)
      const ring = pa.map((p, k) => [lerp(p[0], pb[k][0], t), lerp(p[1], pb[k][1], t)] as Pair)
      ring.push(ring[0])
      out.push(pathFromMP([[ring]], {
        fill: lerpColor(sa.fill, sb.fill, t) as string, stroke: lerpColor(sa.stroke, sb.stroke, t) as string,
        strokeWidth: lerp(sa.strokeWidth, sb.strokeWidth, t), opacity: lerp(sa.opacity, sb.opacity, t),
      }))
    }
    return out
  }
  // oggetti qualsiasi: copie di A che vanno verso B
  const copies = await fabric.util.enlivenObjects<fabric.FabricObject>(Array.from({ length: n }, () => srcA))
  const ca = A.getCenterPoint(), cb = B.getCenterPoint()
  copies.forEach((o, k) => {
    const t = (k + 1) / (n + 1)
    o.set({
      scaleX: lerp(A.scaleX, B.scaleX * (B.width / (A.width || 1)), t),
      scaleY: lerp(A.scaleY, B.scaleY * (B.height / (A.height || 1)), t),
      angle: lerp(A.angle, B.angle, t), opacity: lerp(A.opacity, B.opacity, t),
      fill: lerpColor(A.fill, B.fill, t) as string,
    })
    o.setPositionByOrigin(new fabric.Point(lerp(ca.x, cb.x, t), lerp(ca.y, cb.y, t)), 'center', 'center')
    o.setCoords()
    out.push(o)
  })
  return out
}

async function assemble(canvas: fabric.Canvas, srcA: object, srcB: object, n: number, replace: fabric.FabricObject[], at: number) {
  const [A, B] = await fabric.util.enlivenObjects<fabric.FabricObject>([srcA, srcB])
  const mids = await steps(srcA, srcB, n)
  const g = new fabric.Group([A, ...mids, B]) as BlendGroup
  g.blendSteps = n
  g.blendSrc = [srcA, srcB]
  g.set('name', 'Fusione')
  replace.forEach(o => canvas.remove(o))
  canvas.insertAt(Math.max(0, Math.min(at, canvas.getObjects().length)), g)
  g.setCoords()
  canvas.setActiveObject(g)
  canvas.fire('object:modified', { target: g })
  canvas.requestRenderAll()
  return g
}

/** Crea la fusione tra i due oggetti selezionati (dal più in basso al più in alto). */
export async function makeBlend(canvas: fabric.Canvas, n = 6): Promise<string | null> {
  const all = canvas.getObjects()
  const objs = canvas.getActiveObjects().slice().sort((a, b) => all.indexOf(a) - all.indexOf(b))
  if (objs.length !== 2) return 'Seleziona esattamente due oggetti.'
  canvas.discardActiveObject()
  const [a, b] = objs
  await assemble(canvas, a.toObject(SERIAL_PROPS as never[]), b.toObject(SERIAL_PROPS as never[]), n, objs, all.indexOf(a))
  return null
}

/** Nuovo numero di passaggi. Se il gruppo è stato spostato, ruotato o scalato, il nuovo lo segue. */
export async function updateBlend(canvas: fabric.Canvas, g: fabric.FabricObject, n: number) {
  const bg = g as BlendGroup
  if (!bg.blendSrc || !(bg instanceof fabric.Group)) return
  const { angle, scaleX, scaleY } = bg
  const center = bg.getCenterPoint()
  // di quanto si è spostato il primo estremo da quando la fusione è nata
  const first = bg.getObjects()[0]
  const now = fabric.util.transformPoint(first.getRelativeCenterPoint(), bg.calcTransformMatrix())
  const [A0] = await fabric.util.enlivenObjects<fabric.FabricObject>([bg.blendSrc[0]])
  const delta = now.subtract(A0.getCenterPoint())
  const at = canvas.getObjects().indexOf(bg)
  const ng = await assemble(canvas, bg.blendSrc[0], bg.blendSrc[1], Math.max(1, Math.round(n)), [bg], at)
  if (angle || scaleX !== 1 || scaleY !== 1) {
    ng.set({ angle, scaleX, scaleY })
    ng.setPositionByOrigin(center, 'center', 'center')
  } else ng.set({ left: ng.left + delta.x, top: ng.top + delta.y })
  ng.setCoords()
  canvas.requestRenderAll()
}
