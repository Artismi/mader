/**
 * Aggancio mentre si trascina, come in Figma:
 * - griglia: il bordo in alto a sinistra del riquadro cade sulla griglia;
 * - oggetti e tavole: bordi e centri si allineano a quelli vicini (entro pochi
 *   pixel di schermo) e compare la guida;
 * - funziona anche con più oggetti selezionati (si aggancia il riquadro intero).
 * Le guide tornano in coordinate di schermo, pronte per l'overlay SVG.
 */
import * as fabric from 'fabric'

export type Guide = { x?: number; y?: number }

/** soglia in pixel di schermo */
const SNAP_PX = 6

const lines = (r: fabric.TBBox, axis: 'x' | 'y') => axis === 'x'
  ? [r.left, r.left + r.width / 2, r.left + r.width]
  : [r.top, r.top + r.height / 2, r.top + r.height]

/**
 * Sposta `moved` per agganciarlo; restituisce le guide da mostrare.
 * `grid` è il passo della griglia in px di scena (0 = spenta).
 */
export function snapMoving(canvas: fabric.Canvas, moved: fabric.FabricObject, grid = 0): Guide[] {
  const z = canvas.getZoom(), v = canvas.viewportTransform
  moved.setCoords()
  let r = moved.getBoundingRect()

  if (grid > 0) {
    const dx = Math.round(r.left / grid) * grid - r.left, dy = Math.round(r.top / grid) * grid - r.top
    moved.set({ left: moved.left + dx, top: moved.top + dy }); moved.setCoords()
    r = moved.getBoundingRect()
  }

  const self = new Set<fabric.FabricObject>(moved instanceof fabric.ActiveSelection ? moved.getObjects() : [moved])
  const others = canvas.getObjects().filter(o =>
    !self.has(o) && o.visible !== false && !o.excludeFromExport && !String(o.get('name') ?? '').startsWith('label_'))
  if (!others.length) return []

  const tol = SNAP_PX / z
  const best = { x: { d: tol + 1, delta: 0, at: 0 }, y: { d: tol + 1, delta: 0, at: 0 } }
  for (const o of others) {
    const b = o.getBoundingRect()
    for (const axis of ['x', 'y'] as const) {
      const mine = lines(r, axis), theirs = lines(b, axis)
      for (const m of mine) for (const t of theirs) {
        const d = Math.abs(t - m)
        if (d < best[axis].d) best[axis] = { d, delta: t - m, at: t }
      }
    }
  }
  const guides: Guide[] = []
  if (best.x.d <= tol) { moved.set({ left: moved.left + best.x.delta }); guides.push({ x: best.x.at * z + v[4] }) }
  if (best.y.d <= tol) { moved.set({ top: moved.top + best.y.delta }); guides.push({ y: best.y.at * z + v[5] }) }
  moved.setCoords()
  return guides
}
