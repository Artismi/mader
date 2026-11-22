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
  meta?: { text: string; color: string; size: number; font?: { family: string; weight: number; italic?: boolean; upper?: boolean }; ruolo?: 'titolo' | 'corpo' | 'fonte' | 'numero' }
  /** come è nato: lo strumento, i suoi parametri e (se ne aveva bisogno) l'immagine su cui ha lavorato. Serve per ridisegnarlo in un altro momento della sua vita (crescita, fase) */
  genera?: { tool: string; p: Record<string, unknown>; fonte?: HTMLCanvasElement }
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
  // se cambia l'immagine, la ricetta non la descrive più
  return { ...s, layers: s.layers.map(l => (l.id === id ? { ...l, ...patch, ...(patch.canvas ? { genera: undefined } : {}) } : l)) }
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

/** un rettangolo vuoto: una sagoma di un colore solo che riempie il suo riquadro (copre e non dice niente) */
const vuoti = new WeakMap<HTMLCanvasElement, boolean>()
export function rettangoloVuoto(cv: HTMLCanvasElement): boolean {
  const v = vuoti.get(cv); if (v !== undefined) return v
  const N = 48, t = newCanvas(N, N), g = t.getContext('2d', { willReadFrequently: true })!; g.drawImage(cv, 0, 0, N, N)
  const d = g.getImageData(0, 0, N, N).data
  let n = 0, x0 = N, y0 = N, x1 = -1, y1 = -1, m = [0, 0, 0], m2 = [0, 0, 0]
  for (let i = 0; i < N * N; i++) if (d[i * 4 + 3] > 60) { n++; const x = i % N, y = (i / N) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); for (let k = 0; k < 3; k++) { m[k] += d[i * 4 + k]; m2[k] += d[i * 4 + k] ** 2 } }
  let r = false
  if (n > N * N * 0.01) {
    const fill = n / ((x1 - x0 + 1) * (y1 - y0 + 1)), std = [0, 1, 2].reduce((a, k) => a + Math.sqrt(Math.max(0, m2[k] / n - (m[k] / n) ** 2)), 0) / 3
    // anche più rettangoli piatti (barre): righe e colonne del riquadro tutte piene o tutte vuote
    let netto = 0, tot = 0
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { tot++; const a = d[(y * N + x) * 4 + 3] > 60, dx = x < x1 ? d[(y * N + x + 1) * 4 + 3] > 60 : a, dy = y < y1 ? d[((y + 1) * N + x) * 4 + 3] > 60 : a; if (a === dx && a === dy) netto++ }
    r = std < 14 && (fill > 0.85 || (netto / tot > 0.93 && fill > 0.3))
  }
  vuoti.set(cv, r); return r
}

/** la ricetta di un segno di muffa (se il canvas ne è uno), da portare nel livello: il reel lo farà ricrescere */
export function generaDi(cv: HTMLCanvasElement): Layer['genera'] | undefined {
  const m = (cv as HTMLCanvasElement & { __muffa?: { seme: number; colore: string; S: number } }).__muffa
  if (m) return { tool: 'muffa', p: { seme: m.seme, colore: m.colore, S: m.S } }
  // i mondi fisici (cristallo, camera) portano la loro ricetta: l'indirizzo
  const q = (cv as HTMLCanvasElement & { __ricetta?: { tool: string; p: Record<string, unknown> } }).__ricetta
  return q ? { tool: q.tool, p: { ...q.p } } : undefined
}
