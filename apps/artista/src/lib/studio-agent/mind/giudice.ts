/**
 * Il giudice: impara dalle risposte vere ai reel (tempo di visione, skip, invii, salvataggi, like per copertura)
 * quali tratti di un reel tengono le persone. Sa di non sapere:
 *  - è una regressione bayesiana: oltre alla stima tiene l'incertezza, e sceglie campionando (Thompson), non indovinando;
 *  - la sua voce pesa quanto sa: con pochi dati quasi niente, al massimo metà del voto. L'ultima parola resta all'occhio di Copibolo;
 *  - un reel su cinque esce senza di lui (esplorazione libera);
 *  - dimentica: i dati vecchi pesano la metà ogni settimana, perché il sistema cambia e il giudice deve cambiare con lui.
 */
export const TRATTI = ['materia', 'cambiamento', 'ripete', 'tavole', 'durata', 'aggancio', 'apertura', 'testo', 'bpm'] as const
export type Tratti = Record<(typeof TRATTI)[number], number>
export interface Giudice { n: number; mu: number[]; S: number[][]; quando: string; media?: number; sd?: number }

const D = TRATTI.length + 1
const vec = (t: Tratti) => [1, ...TRATTI.map(k => t[k] ?? 0)]

function inv(A: number[][]): number[][] {
  const n = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))])
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    const d = M[c][c] || 1e-9; for (let j = 0; j < 2 * n; j++) M[c][j] /= d
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j] }
  }
  return M.map(r => r.slice(n))
}
function chol(A: number[][]): number[][] {
  const n = A.length, L = A.map(() => Array(n).fill(0))
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]
    L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j][j]
  }
  return L
}

/** il voto di un reel pubblicato, dalle misure di Instagram (null se non ci sono ancora) */
export function esito(I: Record<string, number>, durataS: number): number | null {
  const reach = Math.max(I.reach ?? 0, 1), views = I.views ?? 0
  if (!views && !I.reach) return null
  const tenuta = I.ig_reels_avg_watch_time ? Math.min(1.5, I.ig_reels_avg_watch_time / 1000 / Math.max(5, durataS)) : null
  const skip = I.reels_skip_rate !== undefined ? I.reels_skip_rate / 100 : null
  // l'ordine di Instagram: tempo di visione, poi invii per copertura, poi like per copertura (salvataggi come gli invii)
  return (tenuta ?? 0.3) * 2 + 6 * ((I.shares ?? 0) / reach) + 4 * ((I.saved ?? 0) / reach) + 2 * ((I.likes ?? I.total_interactions ?? 0) / reach) - (skip ?? 0.5) + 0.15 * Math.log1p(views)
}

/** riaddestra da capo sui reel misurati (pochi parametri: è veloce), con l'oblio settimanale */
export function addestra(dati: { tratti: Tratti; y: number; giorni: number }[]): Giudice {
  const ys = dati.map(d => d.y), media = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0
  const sd = ys.length > 1 ? Math.sqrt(ys.reduce((a, b) => a + (b - media) ** 2, 0) / ys.length) || 1 : 1
  const tau2 = 0.5, s2 = 1
  const P = Array.from({ length: D }, (_, i) => Array.from({ length: D }, (_, j) => (i === j ? 1 / tau2 : 0))), b = Array(D).fill(0)
  let n = 0
  for (const d of dati) {
    const w = 0.5 ** (d.giorni / 7), x = vec(d.tratti), y = (d.y - media) / sd
    n += w
    for (let i = 0; i < D; i++) { b[i] += (w * x[i] * y) / s2; for (let j = 0; j < D; j++) P[i][j] += (w * x[i] * x[j]) / s2 }
  }
  const S = inv(P), mu = S.map(r => r.reduce((a, v, j) => a + v * b[j], 0))
  return { n, mu, S, quando: new Date().toISOString(), media, sd }
}

/** quanto conta la sua voce: niente sotto i 5 reel misurati, poi cresce piano, mai oltre metà */
export const fiducia = (g?: Giudice) => (!g || g.n < 5 ? 0 : Math.min(0.5, (g.n - 5) / (g.n + 25)))

/** Thompson: un'ipotesi estratta dall'incertezza, la stessa per tutte le versioni di questo reel */
export function ipotesi(g: Giudice, r: () => number): number[] {
  const L = chol(g.S), z = Array.from({ length: D }, () => { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) })
  return g.mu.map((m, i) => m + L[i].reduce((a, l, k) => a + l * z[k], 0))
}
export const stima = (theta: number[], t: Tratti) => vec(t).reduce((a, x, i) => a + x * theta[i], 0)
