/**
 * Le misure della tavola: griglia di base, margini, zone sicure, colonne e
 * moduli. Tutto il messaggio si aggancia qui, così i rapporti tra gli elementi
 * nascono da un'unica misura invece che da numeri sparsi.
 *
 * Unità u = lato corto / 1080 (1 px su un 1080).
 */
import type { Format } from '../types'
import { FORMAT_SIZE } from '../types'

export interface Box { x: number; y: number; w: number; h: number }

export interface Misure {
  W: number; H: number; u: number
  /** passo della griglia di base (8u) */
  b: number
  /** margini (alto, destra, basso, sinistra) */
  m: { t: number; r: number; b: number; l: number }
  /** area in cui sta il messaggio: nella storia esclude le zone coperte dall'interfaccia */
  safe: Box
  /** area utile dentro i margini (l'espressione può uscirne, il messaggio no) */
  inner: Box
  cols: number; gut: number; colW: number
  /** x della colonna i (0…cols-1) */
  colX: (i: number) => number
  /** larghezza di n colonne con i canali in mezzo */
  span: (n: number) => number
  rows: number; rowH: number
  rowY: (j: number) => number
  /** aggancia una y alla griglia di base (contata dal margine alto) */
  snap: (y: number, mode?: 'round' | 'floor' | 'ceil') => number
}

const COLS: Record<Format, number> = { quadrato: 6, verticale: 6, storia: 4, orizzontale: 12 }

export function misure(format: Format, opts: { classico?: boolean } = {}): Misure {
  const [W, H] = FORMAT_SIZE[format]
  const u = Math.min(W, H) / 1080
  const b = 8 * u
  const q = (v: number) => Math.round(v / b) * b
  // margine base: 1/15 del lato corto (72u = 9 passi)
  const M = q(Math.min(W, H) / 15)
  // canone classico (editoriale): interno : alto : esterno : basso = 2 : 3 : 4 : 6, con l'alto uguale al margine base
  const m = opts.classico
    ? { l: q((M * 2) / 3), t: M, r: q((M * 4) / 3), b: q(M * 2) }
    : { l: M, t: M, r: M, b: M }
  const inner = { x: m.l, y: m.t, w: W - m.l - m.r, h: H - m.t - m.b }
  // storia: in alto il nome del profilo, in basso la barra delle risposte
  const safe = format === 'storia'
    ? { x: inner.x, y: Math.max(m.t, q(H * 0.13)), w: inner.w, h: H - Math.max(m.t, q(H * 0.13)) - Math.max(m.b, q(H * 0.17)) }
    : { ...inner }
  const cols = COLS[format]
  const gut = 3 * b
  const colW = (inner.w - (cols - 1) * gut) / cols
  const rows = Math.max(3, Math.round((inner.h + gut) / (colW * (cols <= 4 ? 0.75 : 1) + gut)))
  const rowH = (inner.h - (rows - 1) * gut) / rows
  return {
    W, H, u, b, m, safe, inner, cols, gut, colW,
    colX: i => inner.x + i * (colW + gut),
    span: n => n * colW + Math.max(0, n - 1) * gut,
    rows, rowH,
    rowY: j => inner.y + j * (rowH + gut),
    snap: (y, mode = 'round') => m.t + Math[mode]((y - m.t) / b) * b,
  }
}
