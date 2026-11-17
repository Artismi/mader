/**
 * Parole visive: frammenti 8×8 dell'immagine raggruppati per somiglianza.
 * Il codebook è la memoria delle forme tipiche dell'artista, senza nome.
 * Imparare il codebook su un'opera nuova misura anche il "progresso di
 * compressione": quanto l'opera costringe a riorganizzare le forme note.
 */
import type { Raster } from './measure'

export const K = 32
const P = 8 // lato del frammento in pixel (su raster 64)
const D = 16 // descrittore: frammento ridotto a 4×4, centrato e normalizzato

export function patches(R: Raster): number[][] {
  // riduce a 64 sul lato lungo
  const s = 64 / Math.max(R.w, R.h)
  const w = Math.max(P, Math.floor(R.w * s)), h = Math.max(P, Math.floor(R.h * s))
  const at = (x: number, y: number) => R.lum[Math.min(R.h - 1, Math.floor(y / s)) * R.w + Math.min(R.w - 1, Math.floor(x / s))]
  const out: number[][] = []
  for (let py = 0; py + P <= h; py += P / 2) for (let px = 0; px + P <= w; px += P / 2) {
    const v: number[] = []
    for (let by = 0; by < 4; by++) for (let bx = 0; bx < 4; bx++) {
      let t = 0
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) t += at(px + bx * 2 + x, py + by * 2 + y)
      v.push(t / 4)
    }
    const m = v.reduce((a, b) => a + b, 0) / D
    const c = v.map(x => x - m)
    const nrm = Math.sqrt(c.reduce((a, b) => a + b * b, 0))
    // frammenti piatti: parola "vuoto" (resta una forma anch'essa, con norma zero)
    out.push(nrm < 0.02 ? new Array(D).fill(0) : c.map(x => x / nrm))
  }
  return out
}

const dist2 = (a: number[], b: number[]) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return s }

export function nearest(cb: number[][], v: number[]) {
  let bi = 0, bd = Infinity
  for (let i = 0; i < cb.length; i++) { const d = dist2(cb[i], v); if (d < bd) { bd = d; bi = i } }
  return { i: bi, d: bd }
}

/** errore medio di quantizzazione: quanto male il codebook "comprime" questi frammenti */
export function quantError(cb: number[][], ps: number[][]) {
  if (!cb.length || !ps.length) return 1
  let s = 0
  for (const p of ps) s += nearest(cb, p).d
  return s / ps.length
}

export function histogram(cb: number[][], ps: number[][]): number[] {
  const h = new Array(cb.length || K).fill(0)
  if (!cb.length) return h
  for (const p of ps) h[nearest(cb, p).i]++
  const t = ps.length || 1
  return h.map(x => x / t)
}

/** inizializza il codebook dai primi frammenti visti */
export function seedCodebook(ps: number[][], r: () => number): { cb: number[][]; counts: number[] } {
  const cb: number[][] = []
  for (let i = 0; i < K; i++) cb.push((ps[Math.floor(r() * ps.length)] ?? new Array(D).fill(0)).slice())
  return { cb, counts: new Array(K).fill(1) }
}

/**
 * k-medie in linea: aggiorna il codebook con i frammenti dell'opera.
 * Restituisce il progresso di compressione (errore prima − errore dopo).
 */
export function learn(cb: number[][], counts: number[], ps: number[][]): number {
  const before = quantError(cb, ps)
  for (const p of ps) {
    const { i } = nearest(cb, p)
    counts[i] = Math.min(500, counts[i] + 1)
    const lr = 1 / counts[i]
    for (let k = 0; k < p.length; k++) cb[i][k] += lr * (p[k] - cb[i][k])
  }
  // parole morte: rinascono su un frammento mal compresso
  const worst = ps.map(p => ({ p, d: nearest(cb, p).d })).sort((a, b) => b.d - a.d)
  let w = 0
  for (let i = 0; i < counts.length && w < worst.length; i++) {
    if (counts[i] <= 1.01 && worst[w].d > 0.5) { cb[i] = worst[w].p.slice(); counts[i] = 2; w++ }
  }
  const after = quantError(cb, ps)
  return Math.max(0, before - after)
}

export function histDistance(a: number[], b: number[]) {
  // chi quadro simmetrico, 0..1
  let s = 0
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0
    if (x + y > 0) s += (x - y) ** 2 / (x + y)
  }
  return Math.min(1, s / 2)
}
