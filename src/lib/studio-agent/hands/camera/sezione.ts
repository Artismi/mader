/**
 * La sezione: guardare l'universo da un angolo (da stateyour/src/camera/sezione.js).
 * L'universo è un piano più il tempo: uno spaziotempo (x, y, t). La lastra «da sopra» vede solo il piano; inclinandosi
 * il tempo diventa una direzione del disegno: una spirale diventa un'elica e, proiettata, un'onda, una trocoide, una
 * catena di anelli. vista = { inclinazione, rotazione (gradi), scalaTempo }.
 * E la bellezza, misurata alla buona ma onesta: pieno, equilibrio, simmetria, ripetizione, curve, ordine, pulizia.
 */
import type { Traccia } from './mondo'

export interface Vista { inclinazione: number; rotazione: number; scalaTempo: number }
export interface Finestra { centro: [number, number]; lato: number }
export interface Fetta { fine: number; durata: number }
/** un segmento della sezione: u0, v0, u1, v1, spessore, traccia, indice, tempo */
export type Seg = [number, number, number, number, number, number, number, number]
export const VISTA_SOPRA: Vista = { inclinazione: 0, rotazione: 0, scalaTempo: 5 }

export function proiettore(v: Vista, centro: [number, number, number]) {
  const th = (v.inclinazione * Math.PI) / 180, fi = (v.rotazione * Math.PI) / 180, k = v.scalaTempo
  const u = [Math.cos(th) * Math.cos(fi), Math.cos(th) * Math.sin(fi), -Math.sin(th)], w = [-Math.sin(fi), Math.cos(fi), 0]
  const [cx, cy, ct] = centro
  return (x: number, y: number, t: number): [number, number] => { const X = x - cx, Y = y - cy, Tt = k * (t - ct); return [cx + X * u[0] + Y * u[1] + Tt * u[2], cy + X * w[0] + Y * w[1] + Tt * w[2]] }
}

/** i segmenti visibili: proiettati, dentro la fetta di tempo e la finestra, in coordinate della finestra (0..lato) */
export function segmentiSezione(tracce: Traccia[], f: Finestra, sez: Fetta, vista: Vista): Seg[] {
  const t1 = sez.fine, t0 = sez.fine - sez.durata, l = f.lato, x0 = f.centro[0] - l / 2, y0 = f.centro[1] - l / 2
  const P = proiettore(vista, [f.centro[0], f.centro[1], (t0 + t1) / 2]), out: Seg[] = []
  const dentro = (q: number[]) => q[0] >= 0 && q[0] <= l && q[1] >= 0 && q[1] <= l
  for (const tr of tracce) {
    const Q = tr.punti; let prec: number[] | null = null
    for (let i = 0; i < Q.length; i++) {
      const p = Q[i]
      if (!p[2] || p[3] < t0 || p[3] > t1) { prec = null; continue }
      const [U, V] = P(p[0], p[1], p[3]), q = [U - x0, V - y0, p[4], p[3]]
      if (prec && (dentro(q) || dentro(prec))) out.push([prec[0], prec[1], q[0], q[1], (prec[2] + q[2]) / 2, tr.id, i, q[3]])
      prec = q
    }
  }
  return out
}

export function rasterizzaSezione(seg: Seg[], lato: number, N = 96) {
  const m = new Float32Array(N * N), k = N / lato
  for (const [a, b, c, d, w] of seg) {
    const n = Math.max(1, Math.ceil(Math.hypot(c - a, d - b) * k * 1.5)), r = Math.max(0.6, (w * k) / 2)
    for (let i = 0; i <= n; i++) {
      const x = (a + ((c - a) * i) / n) * k, y = (b + ((d - b) * i) / n) * k
      for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
        if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue
        if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r) m[yy * N + xx] = 1
      }
    }
  }
  return m
}

/** gli spigoli di una sezione libera: quanta parte dell'inchiostro è ripassata da molti tratti (scarabocchio, gomitolo)
 *  e quanta sta in nodi affollati. Si conta per tratto: i giunti tra segmenti consecutivi danno 2-3, i ripassi veri di più. */
export function affollamento(seg: Seg[], lato: number, N = 96) {
  const conta = new Uint8Array(N * N), timbro = new Int32Array(N * N).fill(-1), k = N / lato
  seg.forEach(([a, b, c, d, w], id) => {
    const n = Math.max(1, Math.ceil(Math.hypot(c - a, d - b) * k * 1.5)), r = Math.max(0.6, (w * k) / 2)
    for (let i = 0; i <= n; i++) {
      const x = (a + ((c - a) * i) / n) * k, y = (b + ((d - b) * i) / n) * k
      for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
        if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue
        const pp = yy * N + xx
        if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r && timbro[pp] !== id) { timbro[pp] = id; if (conta[pp] < 255) conta[pp]++ }
      }
    }
  })
  let ink = 0, tre = 0, cinque = 0
  for (let i = 0; i < N * N; i++) { const v = conta[i]; if (!v) continue; ink++; if (v >= 4) tre++; if (v >= 6) cinque++ }
  const ripassi = Math.max(0, 1 - 5 * (ink ? tre / ink : 0)), nodi = Math.max(0, 1 - 14 * (ink ? cinque / ink : 0))
  return { ripassi, nodi, fattore: (0.3 + 0.7 * ripassi) * (0.45 + 0.55 * nodi) }
}

export function bellezza(seg: Seg[], lato: number) {
  const N = 96, m = rasterizzaSezione(seg, lato, N)
  let pieno = 0; for (const v of m) pieno += v; pieno /= N * N
  if (pieno < 0.01) return { totale: 0, pieno }
  const sPieno = Math.exp(-(((pieno - 0.2) / 0.11) ** 2))
  const celle = new Float64Array(16); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) celle[Math.floor(y / 24) * 4 + Math.floor(x / 24)] += m[y * N + x]
  const tot = celle.reduce((a, b) => a + b, 0); let Hh = 0; for (const c of celle) if (c) { const p = c / tot; Hh -= p * Math.log(p) }
  const sEq = Hh / Math.log(16)
  const iou = (f: (x: number, y: number) => number) => { let i = 0, u = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const a = m[y * N + x], b = m[f(x, y)]; if (a && b) i++; if (a || b) u++ } return u ? i / u : 0 }
  const sSim = Math.max(iou((x, y) => y * N + (N - 1 - x)), iou((x, y) => (N - 1 - y) * N + x), iou((x, y) => x * N + y), iou((x, y) => (N - 1 - x) * N + (N - 1 - y)), iou((x, y) => (N - 1 - y) * N + (N - 1 - x)))
  let sRip = 0
  for (let dy = -40; dy <= 40; dy += 4) for (let dx = 0; dx <= 40; dx += 4) {
    if (Math.hypot(dx, dy) < 12) continue
    let i = 0, a = 0, b = 0
    for (let y = Math.max(0, -dy); y < Math.min(N, N - dy); y += 2) for (let x = 0; x < N - dx; x += 2) { const p = m[y * N + x], q = m[(y + dy) * N + x + dx]; i += p * q; a += p; b += q }
    if (a && b) sRip = Math.max(sRip, i / Math.sqrt(a * b))
  }
  let giro = 0, lung = 0
  for (let j = 1; j < seg.length; j++) {
    const s0 = seg[j - 1], s1 = seg[j]; if (s0[5] !== s1[5] || s1[6] !== s0[6] + 1) continue
    let d = Math.atan2(s1[3] - s1[1], s1[2] - s1[0]) - Math.atan2(s0[3] - s0[1], s0[2] - s0[0]); d = Math.atan2(Math.sin(d), Math.cos(d))
    giro += Math.abs(d); lung += Math.hypot(s1[2] - s1[0], s1[3] - s1[1])
  }
  const sCurve = 1 - Math.exp(-((giro / Math.max(1e-9, lung)) * lato) / 12)
  const perTraccia = new Map<number, number>()
  for (const sg of seg) perTraccia.set(sg[5], (perTraccia.get(sg[5]) || 0) + Math.hypot(sg[2] - sg[0], sg[3] - sg[1]) * Math.max(0.5, sg[4]))
  const pesi = [...perTraccia.values()].sort((a, b) => b - a), tutto = pesi.reduce((a, b) => a + b, 0)
  const sOrdine = tutto ? pesi.slice(0, 4).reduce((a, b) => a + b, 0) / tutto : 0
  let fr = 0; for (const w of perTraccia.values()) if (w < 0.15 * lato) fr += w
  const sPulizia = tutto ? 1 - fr / tutto : 0
  const af = affollamento(seg, lato, N)
  const totale = sPieno * (0.35 + 0.65 * sEq) * (0.25 + 1.2 * sSim + 0.8 * sRip) * (0.4 + 0.6 * sCurve) * (0.3 + 0.7 * sOrdine) * (0.4 + 0.6 * sPulizia) * af.fattore
  return { totale, pieno, ripassi: af.ripassi, nodi: af.nodi, equilibrio: sEq, simmetria: sSim, ripetizione: sRip, curve: sCurve, ordine: sOrdine, pulizia: sPulizia }
}
