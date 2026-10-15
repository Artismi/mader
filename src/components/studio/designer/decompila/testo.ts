/**
 * Testo vivo: dai riquadri del modello con visione alle misure vere.
 * 1. Ogni riga si stringe sull'inchiostro (il riquadro del modello è
 *    approssimato) e diventa una maschera morbida 0..1 con il suo colore.
 * 2. Render-and-compare: ogni carattere del motore si rende nel riquadro
 *    (corpo dall'altezza dell'inchiostro, spaziatura dalla larghezza) e si
 *    sceglie quello con la differenza di pixel minima; poi i pesi vicini e il
 *    corsivo riga per riga.
 * 3. Interlinea dalle linee di base, allineamento dalla geometria.
 */
import { CARATTERI } from '../core/caratteri'
import { cssFont, loadFonts } from '../fonts'
import type { FontSpec } from '../types'
import { daHex, dist, hex, mediana, moda, px } from './pixel'
import type { Blocco, Box, Raster, RGB, TestoTrovato } from './tipi'

/** Una riga misurata nell'originale. */
export interface RigaMisurata {
  testo: string
  /** riquadro stretto sull'inchiostro */
  box: Box
  /** maschera dell'inchiostro (0..1) dentro il riquadro, riga per riga */
  alfa: Float32Array
  fondo: RGB
  inchiostro: RGB
  /** seconda tinta della riga (una parola di un altro colore) e, colonna per colonna, quale tinta c'è (-1 nessuna) */
  seconda?: RGB
  quale?: Int8Array
  /** raggio dello spianamento contro la grana (0 = nessuno): il reso va trattato allo stesso modo */
  raggio?: number
}

/* ── 1. misura delle righe ─────────────────────────────────────────────── */

/** Righe di pixel con inchiostro, raggruppate in fasce continue. */
function fasce(conta: number[], minimo = 1): [number, number][] {
  const out: [number, number][] = []
  let s = -1
  conta.forEach((n, i) => {
    if (n >= minimo && s < 0) s = i
    if (n < minimo && s >= 0) { out.push([s, i - 1]); s = -1 }
  })
  if (s >= 0) out.push([s, conta.length - 1])
  return out
}

/** Dal riquadro del modello (millesimi) all'inchiostro vero della riga. */
export function misuraRiga(r: Raster, testo: string, b: number[]): RigaMisurata | null {
  const top = (b[0] / 1000) * r.h, left = (b[1] / 1000) * r.w, bottom = (b[2] / 1000) * r.h, right = (b[3] / 1000) * r.w
  const bh = Math.max(4, bottom - top)
  // zona di ricerca: il riquadro con un margine (i modelli sbagliano di qualche punto)
  const R: Box = { x: Math.max(0, Math.floor(left - 0.6 * bh)), y: Math.max(0, Math.floor(top - 0.45 * bh)), w: 0, h: 0 }
  R.w = Math.min(r.w, Math.ceil(right + 0.6 * bh)) - R.x
  R.h = Math.min(r.h, Math.ceil(bottom + 0.45 * bh)) - R.y
  if (R.w < 3 || R.h < 3) return null
  // fondo: il colore più frequente sull'anello, spianato 5×5 e a classi larghe, così la grana
  // non lo sparpaglia e non vince una lettera della riga accanto, che è di un colore solo
  const m = (x: number, y: number, k: number): RGB => { const q = [0, 0, 0]; let n = 0; for (let yy = Math.max(0, y - k); yy <= Math.min(r.h - 1, y + k); yy++) for (let xx = Math.max(0, x - k); xx <= Math.min(r.w - 1, x + k); xx++) { const p = px(r, xx, yy); q[0] += p[0]; q[1] += p[1]; q[2] += p[2]; n++ } return [q[0] / n, q[1] / n, q[2] / n] }
  const punti: [number, number][] = []
  for (let x = R.x; x < R.x + R.w; x++) punti.push([x, R.y], [x, R.y + R.h - 1])
  for (let y = R.y; y < R.y + R.h; y++) punti.push([R.x, y], [R.x + R.w - 1, y])
  const anelloPx = punti.map(([x, y]) => m(x, y, 2))
  const classi = new Map<number, { n: number; s: [number, number, number] }>()
  for (const p of anelloPx) {
    const k = ((p[0] >> 4) << 8) | ((p[1] >> 4) << 4) | (p[2] >> 4)
    const c = classi.get(k) ?? { n: 0, s: [0, 0, 0] }
    c.n++; c.s[0] += p[0]; c.s[1] += p[1]; c.s[2] += p[2]
    classi.set(k, c)
  }
  const cl = [...classi.values()].reduce((a, c) => (c.n > a.n ? c : a))
  const fondo: RGB = [cl.s[0] / cl.n, cl.s[1] / cl.n, cl.s[2] / cl.n]
  // colore dell'inchiostro: i pixel più lontani dal fondo dentro il riquadro del modello
  const dentro: { p: RGB; d: number }[] = []
  for (let y = Math.max(0, Math.floor(top)); y < Math.min(r.h, Math.ceil(bottom)); y++)
    for (let x = Math.max(0, Math.floor(left)); x < Math.min(r.w, Math.ceil(right)); x++) { const p = px(r, x, y); dentro.push({ p, d: dist(p, fondo) }) }
  if (!dentro.length) return null
  const ds = dentro.map(o => o.d).sort((a, c) => a - c)
  const dmax = ds[Math.floor(ds.length * 0.985)]
  if (dmax < 40) return null
  // due tinte? i pixel lontani dal fondo divisi in due gruppi (parola chiara in un titolo scuro)
  // la grana del fondo non deve fare da seconda tinta: si sta sopra il suo 99° percentile
  // (solo dove l'anello spianato è fondo: le lettere vicine non sono grana)
  const db = punti.filter((_, i) => dist(anelloPx[i], fondo) < 25).map(([x, y]) => dist(px(r, x, y), fondo)).sort((x, y) => x - y)
  const rumore = db[Math.floor(db.length * 0.99)] ?? 0
  const lontani = dentro.filter(o => o.d > Math.max(0.6 * dmax, rumore + 25)).map(o => o.p)
  // (i pixel più pieni: le aste sottili del testo piccolo non arrivano al colore vero, e un
  // inchiostro stimato chiaro ingrossa la maschera e fa scegliere un peso più nero)
  let tinte: RGB[] = [mediana(dentro.filter(o => o.d > 0.9 * dmax).map(o => o.p))]
  // e solo su un fondo unito: sopra una foto i chiari della foto sembrerebbero una tinta
  const anello = anelloPx.map(p => dist(p, fondo)).sort((x, y) => x - y)
  const unito = (anello[Math.floor(anello.length * 0.75)] ?? 0) < 30
  if (unito && lontani.length > 40) {
    let c0 = lontani.reduce((m, p) => (dist(p, fondo) > dist(m, fondo) ? p : m))
    let c1 = lontani.reduce((m, p) => (dist(p, c0) > dist(m, c0) ? p : m))
    let g0: RGB[] = [], g1: RGB[] = []
    for (let k = 0; k < 6; k++) {
      g0 = []; g1 = []
      for (const p of lontani) (dist(p, c0) <= dist(p, c1) ? g0 : g1).push(p)
      if (!g0.length || !g1.length) break
      c0 = mediana(g0); c1 = mediana(g1)
    }
    const quota = Math.min(g0.length, g1.length) / lontani.length
    if (dist(c0, c1) > 70 && quota > 0.12) tinte = g0.length >= g1.length ? [c0, c1] : [c1, c0]
  }
  const inchiostro = tinte[0]
  const assi = tinte.map(c => { const v: RGB = [c[0] - fondo[0], c[1] - fondo[1], c[2] - fondo[2]]; return { v, vv: v[0] * v[0] + v[1] * v[1] + v[2] * v[2] || 1 } })
  // maschera: proiezione sul segmento fondo→inchiostro (la grana trasversale si annulla)
  let tt = new Float32Array(R.w * R.h)
  const qualePx = new Uint8Array(R.w * R.h)
  for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) {
    const p = px(r, R.x + x, R.y + y)
    let t = -1, k = 0
    for (const [j, { v, vv }] of assi.entries()) { const q = ((p[0] - fondo[0]) * v[0] + (p[1] - fondo[1]) * v[1] + (p[2] - fondo[2]) * v[2]) / vv; if (q > t) { t = q; k = j } }
    tt[y * R.w + x] = t
    if (k) qualePx[y * R.w + x] = 1
  }
  // grana forte lungo fondo→inchiostro (inchiostro chiaro su fondo granuloso): il rumore del
  // bordo, che è fondo, dice quanto spianare prima della soglia, se no la riga si gonfia
  const sb: number[] = []
  punti.forEach(([x, y], i) => { if (dist(anelloPx[i], fondo) < 25) sb.push(tt[(y - R.y) * R.w + x - R.x]) })
  if (!sb.length) sb.push(0)
  const mb = sb.reduce((s, q) => s + q, 0) / sb.length
  const sigma = Math.sqrt(sb.reduce((s, q) => s + (q - mb) ** 2, 0) / sb.length)
  const raggio = sigma > 0.16 ? 2 : sigma > 0.06 ? 1 : 0
  if (raggio) {
    const o = new Float32Array(tt.length)
    for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) {
      let s = 0, n = 0
      for (let yy = Math.max(0, y - raggio); yy <= Math.min(R.h - 1, y + raggio); yy++) for (let xx = Math.max(0, x - raggio); xx <= Math.min(R.w - 1, x + raggio); xx++) { s += tt[yy * R.w + xx]; n++ }
      o[y * R.w + x] = s / n
    }
    tt = o
  }
  const a = new Float32Array(R.w * R.h)
  for (let i = 0; i < a.length; i++) { const t = tt[i]; a[i] = t < 0.18 ? 0 : t > 0.85 ? 1 : (t - 0.18) / 0.67 }
  // fasce di righe con inchiostro, solo nelle colonne del riquadro
  const c0 = Math.max(0, Math.floor(left - R.x - 0.3 * bh)), c1 = Math.min(R.w, Math.ceil(right - R.x + 0.3 * bh))
  const perRiga = Array.from({ length: R.h }, (_, y) => { let n = 0; for (let x = c0; x < c1; x++) if (a[y * R.w + x] > 0.5) n++; return n })
  const fs = fasce(perRiga, 2)
  if (!fs.length) return null
  const t0 = top - R.y, t1 = bottom - R.y
  const sovr = (f: [number, number]) => Math.max(0, Math.min(f[1], t1) - Math.max(f[0], t0))
  let best = fs.reduce((m, f) => (sovr(f) > sovr(m) ? f : m), fs[0])
  if (sovr(best) <= 0) return null
  // accenti e puntini: fasce vicine dentro il riquadro si uniscono
  for (let changed = true; changed;) {
    changed = false
    for (const f of fs) {
      if (f === best || (f[0] >= best[0] && f[1] <= best[1])) continue
      const gap = f[0] > best[1] ? f[0] - best[1] : best[0] - f[1]
      if (gap <= Math.max(2, 0.22 * bh) && f[0] >= t0 - 0.3 * bh && f[1] <= t1 + 0.3 * bh) { best = [Math.min(best[0], f[0]), Math.max(best[1], f[1])]; changed = true }
    }
  }
  // interlinea stretta: le lettere di due righe si toccano e la fascia le prende entrambe.
  // Si taglia dove l'inchiostro è minimo, vicino al bordo del riquadro del modello
  if (best[1] - best[0] + 1 > 1.35 * bh) {
    const minimo = (da: number, fino: number) => { let k = -1, v = Infinity; for (let y = Math.max(best[0], Math.round(da)); y <= Math.min(best[1], Math.round(fino)); y++) if (perRiga[y] < v) { v = perRiga[y]; k = y } return k }
    if (best[0] < t0 - 0.25 * bh) { const k = minimo(t0 - 0.4 * bh, t0 + 0.15 * bh); if (k >= 0) best = [k + 1, best[1]] }
    if (best[1] > t1 + 0.25 * bh) { const k = minimo(t1 - 0.15 * bh, t1 + 0.4 * bh); if (k >= 0) best = [best[0], k - 1] }
  }
  // colonne: gruppi di inchiostro con buchi piccoli, quelli che toccano il riquadro
  const hb = best[1] - best[0] + 1
  const perCol = Array.from({ length: R.w }, (_, x) => { let n = 0; for (let y = best[0]; y <= best[1]; y++) if (a[y * R.w + x] > 0.5) n++; return n })
  const gruppi: [number, number][] = []
  // (un testo più piccolo accanto, dentro la stessa fascia, ha l'inchiostro basso: non è di questa riga)
  const alto = (f: [number, number]) => { let y0 = Infinity, y1 = -1; for (let x = f[0]; x <= f[1]; x++) for (let y = best[0]; y <= best[1]; y++) if (a[y * R.w + x] > 0.5) { if (y < y0) y0 = y; if (y > y1) y1 = y } return y1 - y0 + 1 }
  const colonne = fasce(perCol, 1)
  const piu = Math.max(...colonne.map(alto))
  const l0 = left - R.x, l1 = right - R.x
  // (la punteggiatura è bassa ma sta dentro il riquadro del modello: resta)
  for (const f of colonne.filter(f => alto(f) >= 0.3 * piu || ((f[0] + f[1]) / 2 >= l0 && (f[0] + f[1]) / 2 <= l1))) {
    const g = gruppi[gruppi.length - 1]
    if (g && f[0] - g[1] <= Math.max(6, 0.5 * hb)) g[1] = f[1]; else gruppi.push([f[0], f[1]])
  }
  // (gruppi che entrano davvero nel riquadro: un testo vicino che lo sfiora resta fuori)
  const tocca = gruppi.filter(g => Math.min(g[1], l1) - Math.max(g[0], l0) > 0.3 * Math.min(g[1] - g[0] + 1, l1 - l0))
  if (!tocca.length) return null
  const x0 = Math.min(...tocca.map(g => g[0])), x1 = Math.max(...tocca.map(g => g[1]))
  const box: Box = { x: R.x + x0, y: R.y + best[0], w: x1 - x0 + 1, h: hb }
  const alfa = new Float32Array(box.w * box.h)
  for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) alfa[y * box.w + x] = a[(best[0] + y) * R.w + x0 + x]
  if (tinte.length < 2) return { testo, box, alfa, fondo, inchiostro, raggio }
  // per colonna, la tinta che prevale tra i pixel d'inchiostro
  const quale = new Int8Array(box.w).fill(-1)
  for (let x = 0; x < box.w; x++) {
    let n0 = 0, n1 = 0
    for (let y = 0; y < box.h; y++) if (alfa[y * box.w + x] > 0.5) { if (qualePx[(best[0] + y) * R.w + x0 + x]) n1++; else n0++ }
    if (n0 + n1) quale[x] = n1 > n0 ? 1 : 0
  }
  // la seconda tinta vale solo se occupa davvero delle colonne (non qualche bordo)
  const n1 = quale.reduce((s, q) => s + (q === 1 ? 1 : 0), 0), n = quale.reduce((s, q) => s + (q >= 0 ? 1 : 0), 0)
  if (n1 < 0.08 * n) return { testo, box, alfa, fondo, inchiostro, raggio }
  return { testo, box, alfa, fondo, inchiostro, seconda: tinte[1], quale, raggio }
}

/* ── 2. render-and-compare ─────────────────────────────────────────────── */

let tela: HTMLCanvasElement | null = null

interface Reso { a: Float32Array; w: number; h: number; /** dalla cima dell'inchiostro alla linea di base */ asc: number }

/** Rende una riga e restituisce la maschera ritagliata sull'inchiostro. */
/**
 * Rende una riga e restituisce la maschera ritagliata sull'inchiostro. Con `colori` la riga si
 * disegna con quell'inchiostro su quel fondo e la maschera è la stessa proiezione di misuraRiga:
 * il browser corregge il contrasto del testo secondo i colori (un bianco su scuro esce più nero
 * della sua copertura), quindi la sola copertura su trasparente non è confrontabile.
 */
export function rendiRiga(testo: string, font: FontSpec, size: number, trackPx: number, colori?: { fondo: RGB; inchiostro: RGB }): Reso | null {
  tela ??= document.createElement('canvas')
  const cx = tela.getContext('2d', { willReadFrequently: true })!
  cx.font = cssFont(font, size)
  ;(cx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${trackPx}px`
  const W = Math.ceil(cx.measureText(testo).width + Math.abs(trackPx) * 2 + size * 0.8 + 8), H = Math.ceil(size * 2.4 + 8)
  if (W * H > 16e6) return null
  tela.width = W; tela.height = H
  cx.font = cssFont(font, size)
  ;(cx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${trackPx}px`
  if (colori) { cx.fillStyle = hex(colori.fondo); cx.fillRect(0, 0, W, H) }
  cx.fillStyle = colori ? hex(colori.inchiostro) : '#000'; cx.textBaseline = 'alphabetic'
  const base = Math.round(size * 1.6)
  cx.fillText(testo, Math.round(size * 0.4), base)
  const d = cx.getImageData(0, 0, W, H).data
  const cop = new Float32Array(W * H)
  if (colori) {
    const f = colori.fondo, v = [colori.inchiostro[0] - f[0], colori.inchiostro[1] - f[1], colori.inchiostro[2] - f[2]], vv = v[0] * v[0] + v[1] * v[1] + v[2] * v[2] || 1
    for (let i = 0; i < W * H; i++) cop[i] = Math.max(0, Math.min(1, ((d[i * 4] - f[0]) * v[0] + (d[i * 4 + 1] - f[1]) * v[1] + (d[i * 4 + 2] - f[2]) * v[2]) / vv))
  } else for (let i = 0; i < W * H; i++) cop[i] = d[i * 4 + 3] / 255
  let x0 = W, x1 = -1, y0 = H, y1 = -1
  // ritaglio con lo stesso criterio di misuraRiga: righe con almeno due pixel e colonne con almeno
  // uno sopra metà maschera (t > 0,515); con un criterio più largo il reso è un pixel più alto per
  // lato, il corpo esce piccolo e il carattere, schiacciato nel riquadro, sembra più sottile
  const pieno = (i: number) => cop[i] > 0.515
  for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) if (pieno(y * W + x)) n++; if (n >= 2) { if (y < y0) y0 = y; y1 = y } }
  if (y1 >= 0) for (let x = 0; x < W; x++) for (let y = y0; y <= y1; y++) if (pieno(y * W + x)) { if (x < x0) x0 = x; if (x > x1) x1 = x; break }
  if (x1 < 0) return null
  const w = x1 - x0 + 1, h = y1 - y0 + 1, a = new Float32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = cop[(y0 + y) * W + x0 + x]
  return { a, w, h, asc: base - y0 }
}

/** Media a finestra (2r+1)², separabile, con le somme cumulative. */
function sfoca(a: Float32Array, w: number, h: number, r: number): Float32Array {
  const t = new Float32Array(a.length), o = new Float32Array(a.length)
  for (let y = 0; y < h; y++) {
    let s = 0
    for (let x = -r; x < w + r; x++) {
      if (x + r < w && x + r >= 0) s += a[y * w + x + r]
      if (x - r - 1 >= 0 && x - r - 1 < w) s -= a[y * w + x - r - 1]
      if (x >= 0 && x < w) t[y * w + x] = s / (2 * r + 1)
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0
    for (let y = -r; y < h + r; y++) {
      if (y + r < h && y + r >= 0) s += t[(y + r) * w + x]
      if (y - r - 1 >= 0 && y - r - 1 < h) s -= t[(y - r - 1) * w + x]
      if (y >= 0 && y < h) o[y * w + x] = s / (2 * r + 1)
    }
  }
  return o
}
const sfocate = new WeakMap<Float32Array, Float32Array>()

/**
 * Differenza tra due maschere (0 = uguali, 1 = nulla in comune), la seconda riportata sulla misura
 * della prima. Tutte e due passano da una sfocatura leggera: conserva la massa d'inchiostro (che
 * distingue i pesi) e perdona gli spostamenti sotto il pixel tra due motori di testo, che sulle
 * aste sottili pesano più del carattere e farebbero vincere sempre il peso più nero.
 */
export function differenzaMaschere(A: Float32Array, w: number, h: number, B: Reso): number {
  const r = Math.max(1, Math.round(h / 24))
  const Bw = new Float32Array(w * h)
  const sx = B.w / w, sy = B.h / h
  for (let y = 0; y < h; y++) {
    const by = Math.min(B.h - 1, Math.max(0, (y + 0.5) * sy - 0.5)), y0 = Math.floor(by), y1 = Math.min(B.h - 1, y0 + 1), fy = by - y0
    for (let x = 0; x < w; x++) {
      const bx = Math.min(B.w - 1, Math.max(0, (x + 0.5) * sx - 0.5)), x0 = Math.floor(bx), x1 = Math.min(B.w - 1, x0 + 1), fx = bx - x0
      Bw[y * w + x] = (B.a[y0 * B.w + x0] * (1 - fx) + B.a[y0 * B.w + x1] * fx) * (1 - fy) + (B.a[y1 * B.w + x0] * (1 - fx) + B.a[y1 * B.w + x1] * fx) * fy
    }
  }
  let As = sfocate.get(A)
  if (!As || As.length !== A.length) { As = sfoca(A, w, h, r); sfocate.set(A, As) }
  const Bs = sfoca(Bw, w, h, r)
  let num = 0, den = 0
  for (let i = 0; i < As.length; i++) { num += Math.abs(As[i] - Bs[i]); den += Math.max(As[i], Bs[i]) }
  return den ? num / den : 1
}

const lettere = (s: string) => [...s].length

export interface Prova { font: FontSpec; size: number; trackPx: number; errore: number; asc: number; h: number }

/** Il carattere reso nel riquadro della riga: corpo dall'altezza, spaziatura dalla larghezza, poi la differenza. */
/** Il reso passa dalla stessa strada della maschera misurata: spianamento e soglie. */
function comeMisurata(p: Reso, raggio: number): Reso {
  let a = p.a
  if (raggio) {
    const o = new Float32Array(a.length)
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      let s = 0, n = 0
      for (let yy = y - raggio; yy <= y + raggio; yy++) for (let xx = x - raggio; xx <= x + raggio; xx++) { n++; if (yy >= 0 && xx >= 0 && yy < p.h && xx < p.w) s += a[yy * p.w + xx] }
      o[y * p.w + x] = s / n
    }
    a = o
  }
  const b = new Float32Array(a.length)
  for (let i = 0; i < a.length; i++) { const t = a[i]; b[i] = t < 0.18 ? 0 : t > 0.85 ? 1 : (t - 0.18) / 0.67 }
  return { ...p, a: b }
}

export function provaRiga(r: RigaMisurata, font: FontSpec): Prova | null {
  const S0 = 100
  const col = { fondo: r.fondo, inchiostro: r.inchiostro }
  const p0 = rendiRiga(r.testo, font, S0, 0, col)
  if (!p0) return null
  const stima = (S0 * r.box.h) / p0.h
  const n = Math.max(1, lettere(r.testo) - 1)
  // sul testo piccolo mezzo pixel d'altezza vale qualche punto di corpo: si provano i corpi vicini
  const passi = r.box.h < 40 ? [0, -0.03, 0.03, -0.06, 0.06] : [0]
  let meglio: Prova | null = null
  for (const k of passi) {
    const size = stima * (1 + k)
    // spaziature fuori misura: il carattere è sbagliato, ma si confronta lo stesso (con la penalità dello stiramento)
    const trackPx = Math.max(-0.12 * size, Math.min(0.6 * size, (r.box.w - (p0.w * size) / S0) / n))
    const p = rendiRiga(r.testo, font, size, trackPx, col)
    if (!p) continue
    const stira = Math.abs(Math.log(p.w / r.box.w)) + Math.abs(Math.log(p.h / r.box.h))
    const errore = differenzaMaschere(r.alfa, r.box.w, r.box.h, comeMisurata(p, r.raggio ?? 0)) + 0.6 * stira
    if (!meglio || errore < meglio.errore) meglio = { font, size, trackPx, errore, asc: p.asc, h: p.h }
  }
  return meglio
}

const PESO: Record<Blocco['peso'], number> = { sottile: 300, regolare: 400, medio: 500, neretto: 700, nero: 900 }
const vicino = (pesi: number[], voluto: number) => pesi.reduce((b, p) => (Math.abs(p - voluto) < Math.abs(b - voluto) ? p : b), pesi[0])

/** Righe più lunghe per il confronto: bastano tre per riconoscere un carattere. */
const campione = (righe: RigaMisurata[]) => [...righe].sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h).slice(0, 3)

/** Errore del blocco per un carattere: media pesata sulle righe; con `corsivo` ogni riga sceglie tondo o corsivo. */
function provaBlocco(righe: RigaMisurata[], font: FontSpec, corsivo: boolean): { errore: number; prove: Prova[] } | null {
  const prove: Prova[] = []
  let s = 0, peso = 0
  for (const r of righe) {
    const tondo = provaRiga(r, { ...font, italic: false })
    const ita = corsivo ? provaRiga(r, { ...font, italic: true }) : null
    const p = ita && (!tondo || ita.errore < tondo.errore) ? ita : tondo
    if (!p) return null
    const k = r.box.w * r.box.h
    prove.push(p); s += p.errore * k; peso += k
  }
  return { errore: s / (peso || 1), prove }
}

/** Errore del blocco per un carattere preciso (famiglia e peso), corsivo per riga dove c'è. */
export async function erroreCarattere(righe: RigaMisurata[], font: FontSpec): Promise<number> {
  const c = CARATTERI.find(x => x.family === font.family)
  await loadFonts(c?.corsivo ? [font, { ...font, italic: true }] : [font])
  return provaBlocco(campione(righe), font, !!c?.corsivo)?.errore ?? 9
}

/** Errore del blocco per una famiglia: il migliore tra i pesi vicini a quello voluto. */
export async function provaFamiglia(righe: RigaMisurata[], family: string, voluto: number): Promise<{ font: FontSpec; errore: number } | null> {
  const c = CARATTERI.find(x => x.family === family)
  if (!c) return null
  const fonts = c.pesi.filter(p => Math.abs(p - voluto) <= 200).map(weight => ({ family, weight } as FontSpec))
  await loadFonts(fonts.flatMap(f => (c.corsivo ? [f, { ...f, italic: true }] : [f])))
  let best: { font: FontSpec; errore: number } | null = null
  for (const f of fonts) {
    const e = provaBlocco(campione(righe), f, !!c.corsivo)?.errore
    if (e !== undefined && (!best || e < best.errore)) best = { font: f, errore: e }
  }
  return best
}

/**
 * Blocchi contigui della stessa natura (un titolo con una riga in corsivo che
 * il modello ha diviso in due): si uniscono se le righe sono allineate, di
 * altezza simile e alla distanza di un'interlinea.
 */
export function unisciBlocchi(blocchi: { b: Blocco; righe: RigaMisurata[] }[]): { b: Blocco; righe: RigaMisurata[] }[] {
  const out = [...blocchi].sort((p, q) => p.righe[0].box.y - q.righe[0].box.y)
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const A = out[i], B = out[j]
      if (A.b.ruolo !== B.b.ruolo || A.b.famiglia !== B.b.famiglia) continue
      const a = A.righe[A.righe.length - 1].box, b = B.righe[0].box
      const h = Math.max(a.h, b.h), gap = b.y - (a.y + a.h)
      const allineati = Math.abs(a.x - b.x) < 0.25 * h || Math.abs(a.x + a.w / 2 - (b.x + b.w / 2)) < 0.25 * h || Math.abs(a.x + a.w - (b.x + b.w)) < 0.25 * h
      if (gap > -0.1 * h && gap < 0.7 * h && Math.min(a.h, b.h) / h > 0.6 && allineati) {
        out[i] = { b: { ...A.b, corsivo: A.b.corsivo || B.b.corsivo }, righe: [...A.righe, ...B.righe] }
        out.splice(j, 1); j = i
      }
    }
  }
  return out
}

export interface Scelta { font: FontSpec; errore: number; candidati: { family: string; weight: number; errore: number }[] }

/** Sceglie carattere e peso per un blocco tra quelli del motore. */
export async function scegliCarattere(righe: RigaMisurata[], blocco: Blocco): Promise<Scelta> {
  const voluto = PESO[blocco.peso]
  const campioni = campione(righe)
  // primo giro: tutte le famiglie al peso più vicino a quello letto
  const primo = CARATTERI.map(c => ({ c, f: { family: c.family, weight: vicino(c.pesi, voluto) } as FontSpec }))
  await loadFonts(primo.flatMap(({ c, f }) => (blocco.corsivo && c.corsivo ? [f, { ...f, italic: true }] : [f])))
  const g1 = primo.map(({ c, f }) => ({ c, f, e: provaBlocco(campioni, f, blocco.corsivo && !!c.corsivo)?.errore ?? 9 })).sort((a, b) => a.e - b.e)
  // secondo giro: i cinque migliori con tutti i pesi vicini, corsivo dove c'è
  const finalisti = g1.slice(0, 5)
  const secondo = finalisti.flatMap(({ c }) => c.pesi.filter(p => Math.abs(p - voluto) <= 300).map(weight => ({ c, f: { family: c.family, weight } as FontSpec })))
  await loadFonts(secondo.flatMap(({ c, f }) => (c.corsivo ? [f, { ...f, italic: true }] : [f])))
  const g2 = secondo.map(({ c, f }) => ({ c, f, e: provaBlocco(campioni, f, !!c.corsivo)?.errore ?? 9 }))
  const tutti = [...g1.slice(0, 5), ...g2].sort((a, b) => a.e - b.e)
  const visti = new Set<string>()
  const candidati = tutti.filter(t => { const k = `${t.f.family}|${t.f.weight}`; if (visti.has(k)) return false; visti.add(k); return true }).slice(0, 5)
  return { font: candidati[0].f, errore: candidati[0].e, candidati: candidati.map(t => ({ family: t.f.family, weight: t.f.weight, errore: +t.e.toFixed(4) })) }
}

/* ── 3. misure del blocco ──────────────────────────────────────────────── */

const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0 }

/** Corpo, spaziatura, interlinea, corsivo per riga, colore e allineamento del blocco con il carattere scelto. */
/**
 * Inclinazione dell'inchiostro di una riga (0 = dritto, ~0,2 = corsivo): si raddrizza la maschera
 * a vari angoli e vince quello che rende le aste più nette, cioè le colonne più piene e più vuote.
 * Serve perché un tondo con la spaziatura giusta spiega quasi altrettanto bene un corsivo.
 */
export function inclinazione(r: RigaMisurata): number {
  const { w, h } = r.box
  let meglio = 0, vmax = -1
  for (let k = -0.1; k <= 0.4001; k += 0.025) {
    const col = new Float32Array(w + h)
    for (let y = 0; y < h; y++) { const dx = Math.round(k * (h - 1 - y)); for (let x = 0; x < w; x++) col[x - dx + h] += r.alfa[y * w + x] }
    let v = 0
    for (const c of col) v += c * c
    if (v > vmax) { vmax = v; meglio = k }
  }
  return meglio
}

/** Tinta di ogni carattere: le colonne d'inchiostro divise tra le lettere secondo le larghezze rese. */
function tinteRiga(r: RigaMisurata, font: FontSpec, size: number, trackPx: number, colore: string): (string | null)[] {
  const car = [...r.testo]
  const principale = hex(r.inchiostro)
  if (!r.quale || !r.seconda) return car.map(ch => (ch.trim() && dist(r.inchiostro, daHex(colore)) > 40 ? principale : null))
  tela ??= document.createElement('canvas')
  const cx = tela.getContext('2d', { willReadFrequently: true })!
  cx.font = cssFont(font, size)
  ;(cx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${trackPx}px`
  const pre = car.map((_, i) => cx.measureText(car.slice(0, i).join('')).width)
  const tot = cx.measureText(r.testo).width || 1
  const k = r.box.w / tot, seconda = hex(r.seconda)
  return car.map((ch, i) => {
    if (!ch.trim()) return null
    const a = Math.floor(pre[i] * k), b = Math.ceil((i + 1 < car.length ? pre[i + 1] : tot) * k)
    let n0 = 0, n1 = 0
    for (let x = Math.max(0, a); x < Math.min(r.quale!.length, b); x++) { if (r.quale![x] === 1) n1++; else if (r.quale![x] === 0) n0++ }
    const t = n1 > n0 ? seconda : principale
    return t.toLowerCase() === colore.toLowerCase() || dist(daHex(t), daHex(colore)) < 30 ? null : t
  })
}

export function misureBlocco(righe: RigaMisurata[], blocco: Blocco, font: FontSpec, nome: string, errore: number, candidati: Scelta['candidati']): TestoTrovato & { corsive: boolean[]; asc: number[]; tinte: (string | null)[][] } {
  const fam = CARATTERI.find(c => c.family === font.family)
  const prove = righe.map(r => {
    const tondo = provaRiga(r, { ...font, italic: false })!
    const ita = fam?.corsivo ? provaRiga(r, { ...font, italic: true }) : null
    if (!ita) return { ...tondo, it: false }
    // l'inclinazione misurata decide; solo nel dubbio decide l'errore
    const k = r.box.h >= 20 ? inclinazione(r) : NaN
    const it = k >= 0.1 ? true : k <= 0.04 ? false : ita.errore < tondo.errore
    return it ? { ...ita, it: true } : { ...tondo, it: false }
  })
  const size = med(prove.map(p => p.size))
  const tracking = med(prove.map((p, i) => (lettere(righe[i].testo) > 3 ? p.trackPx / p.size : NaN)).filter(v => !Number.isNaN(v))) || 0
  // interlinea: distanza media tra le linee di base (cima dell'inchiostro + ascendente reso)
  const basi = righe.map((r, i) => r.box.y + (prove[i].asc * r.box.h) / prove[i].h)
  const passi = basi.slice(1).map((b, i) => b - basi[i])
  const lineHeight = passi.length ? med(passi) / size : 1.2
  // allineamento: il bordo che varia meno tra le righe (con una riga sola vale la risposta del modello)
  let align: TestoTrovato['allineamento'] = blocco.allineamento === 'centro' ? 'center' : blocco.allineamento === 'destra' ? 'right' : 'left'
  if (righe.length > 1) {
    const sd = (v: number[]) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) }
    const l = sd(righe.map(r => r.box.x)), c = sd(righe.map(r => r.box.x + r.box.w / 2)), d = sd(righe.map(r => r.box.x + r.box.w))
    align = l <= c && l <= d ? 'left' : c <= d ? 'center' : 'right'
  }
  const x0 = Math.min(...righe.map(r => r.box.x)), y0 = Math.min(...righe.map(r => r.box.y))
  const x1 = Math.max(...righe.map(r => r.box.x + r.box.w)), y1 = Math.max(...righe.map(r => r.box.y + r.box.h))
  // colore: l'inchiostro più frequente (le parole colorate a parte non spostano la media)
  const colore = hex(moda(righe.map(r => r.inchiostro)))
  return {
    nome, ruolo: blocco.ruolo, righe: righe.map(r => r.testo), font: { family: font.family, weight: font.weight, ...(prove.every(p => p.it) ? { italic: true } : {}) },
    size, lineHeight, tracking, colore, allineamento: align, box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, righeBox: righe.map(r => r.box), errore, candidati,
    corsive: prove.map(p => p.it), asc: prove.map(p => p.asc),
    tinte: righe.map((r, i) => tinteRiga(r, { ...font, ...(prove[i].it ? { italic: true } : {}) }, prove[i].size, prove[i].trackPx, colore)),
  }
}
