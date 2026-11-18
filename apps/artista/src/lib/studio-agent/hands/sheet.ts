/**
 * Il foglio di lavoro: uno sfondo e una pila di livelli, come fogli sulla
 * scrivania. Ogni gesto produce un nuovo foglio (i canvas già fatti non si
 * toccano), così annullare un gesto costa nulla.
 */

export type Blend = GlobalCompositeOperation

export interface Layer {
  id: string
  kind: string
  canvas: HTMLCanvasElement
  x: number // centro, 0..1
  y: number
  scale: number // rispetto al lato corto del foglio
  rot: number // radianti
  alpha: number
  blend: Blend
  flipX?: boolean
  /** per i testi: cosa c'è scritto, colore e corpo in px del foglio (serve a capire se si legge) */
  meta?: { text: string; color: string; size: number }
}

export interface Sheet {
  W: number
  H: number
  bg: string
  layers: Layer[]
}

export function newCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h))
  return c
}

export const emptySheet = (W: number, H: number, bg: string): Sheet => ({ W, H, bg, layers: [] })

export function withLayer(s: Sheet, l: Layer): Sheet { return { ...s, layers: [...s.layers, l] } }
export function replaceLayer(s: Sheet, id: string, patch: Partial<Layer>): Sheet {
  return { ...s, layers: s.layers.map(l => (l.id === id ? { ...l, ...patch } : l)) }
}

export function drawLayer(ctx: CanvasRenderingContext2D, s: Sheet, l: Layer) {
  const side = Math.min(s.W, s.H) * l.scale
  const k = side / Math.max(l.canvas.width, l.canvas.height)
  ctx.save()
  ctx.globalAlpha = l.alpha
  ctx.globalCompositeOperation = l.blend
  ctx.translate(l.x * s.W, l.y * s.H)
  ctx.rotate(l.rot)
  if (l.flipX) ctx.scale(-1, 1)
  ctx.scale(k, k)
  ctx.drawImage(l.canvas, -l.canvas.width / 2, -l.canvas.height / 2)
  ctx.restore()
}

export function flatten(s: Sheet, scale = 1): HTMLCanvasElement {
  const c = newCanvas(s.W * scale, s.H * scale)
  const ctx = c.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = s.bg
  ctx.fillRect(0, 0, s.W, s.H)
  for (const l of s.layers) drawLayer(ctx, s, l)
  return c
}

/** un livello che copre tutto il foglio (per gesti "a tutta pagina") */
export function fullLayer(s: Sheet, id: string, kind: string, canvas: HTMLCanvasElement, blend: Blend = 'source-over', alpha = 1): Layer {
  return { id, kind, canvas, x: 0.5, y: 0.5, scale: Math.max(s.W, s.H) / Math.min(s.W, s.H), rot: 0, alpha, blend }
}

/**
 * Bordi morbidi: un'immagine che arriva fino al bordo del suo riquadro viene tagliata di netto
 * quando la si appoggia sul foglio. Qui i bordi sfumano (frac = quota del lato che sfuma).
 */
export function sfuma(src: HTMLCanvasElement, frac = 0.12): HTMLCanvasElement {
  const W = src.width, H = src.height
  const c = newCanvas(W, H), g = c.getContext('2d')!
  g.drawImage(src, 0, 0)
  g.globalCompositeOperation = 'destination-in'
  const gx = g.createLinearGradient(0, 0, W, 0)
  gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(frac, 'rgba(0,0,0,1)'); gx.addColorStop(1 - frac, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gx; g.fillRect(0, 0, W, H)
  const gy = g.createLinearGradient(0, 0, 0, H)
  gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(frac, 'rgba(0,0,0,1)'); gy.addColorStop(1 - frac, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gy; g.fillRect(0, 0, W, H)
  return c
}
