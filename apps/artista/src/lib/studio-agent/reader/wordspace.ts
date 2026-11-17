/**
 * Lo spazio delle parole, costruito leggendo: conta quali parole stanno
 * vicine (ipotesi distribuzionale), pesa con PPMI e comprime con una SVD
 * troncata. Nessun addestramento: solo conteggi e algebra.
 * È la "matrice" dell'artista, e cambia con quello che legge.
 */
import type { WordSpaceData } from '../core/types'
import { content, words } from './tokenize'

const WINDOW = 4
const MAX_VOCAB = 5000
const KEEP_VOCAB = 4000

export const emptySpace = (): WordSpaceData => ({ vocab: [], freq: [], cooc: {}, docs: 0 })

export function addText(ws: WordSpaceData, text: string) {
  const idx = new Map(ws.vocab.map((w, i) => [w, i]))
  const toks = content(words(text))
  const ids = toks.map(w => {
    let i = idx.get(w)
    if (i === undefined) { i = ws.vocab.length; ws.vocab.push(w); ws.freq.push(0); idx.set(w, i) }
    ws.freq[i]++
    return i
  })
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b <= Math.min(ids.length - 1, a + WINDOW); b++) {
    const i = Math.min(ids[a], ids[b]), j = Math.max(ids[a], ids[b])
    if (i === j) continue
    const key = i + ',' + j
    ws.cooc[key] = (ws.cooc[key] ?? 0) + 1 / (b - a)
  }
  ws.docs++
  if (ws.vocab.length > MAX_VOCAB) prune(ws)
}

function prune(ws: WordSpaceData) {
  const order = ws.freq.map((f, i) => [f, i]).sort((a, b) => b[0] - a[0]).slice(0, KEEP_VOCAB).map(x => x[1])
  const remap = new Map(order.map((old, nu) => [old, nu]))
  const cooc: Record<string, number> = {}
  for (const [k, v] of Object.entries(ws.cooc)) {
    const [i, j] = k.split(',').map(Number)
    const a = remap.get(i), b = remap.get(j)
    if (a === undefined || b === undefined) continue
    cooc[Math.min(a, b) + ',' + Math.max(a, b)] = v
  }
  ws.vocab = order.map(i => ws.vocab[i])
  ws.freq = order.map(i => ws.freq[i])
  ws.cooc = cooc
}

export interface Embedding {
  words: string[]
  index: Map<string, number>
  vecs: Float32Array[]
}

/** PPMI + SVD troncata (iterazione di potenza a blocchi) sulle parole più frequenti */
export function embed(ws: WordSpaceData, V = 1200, k = 24, seed = 7): Embedding {
  const top = ws.freq.map((f, i) => [f, i]).sort((a, b) => b[0] - a[0]).slice(0, V).map(x => x[1])
  const pos = new Map(top.map((old, i) => [old, i]))
  const n = top.length
  if (n < k + 2) return { words: top.map(i => ws.vocab[i]), index: new Map(top.map((o, i) => [ws.vocab[o], i])), vecs: top.map(() => new Float32Array(k)) }
  // matrice sparsa simmetrica PPMI
  const rows: Map<number, number>[] = Array.from({ length: n }, () => new Map())
  const rowSum = new Float64Array(n)
  let total = 0
  for (const [key, v] of Object.entries(ws.cooc)) {
    const [i, j] = key.split(',').map(Number)
    const a = pos.get(i), b = pos.get(j)
    if (a === undefined || b === undefined) continue
    rows[a].set(b, v); rows[b].set(a, v)
    rowSum[a] += v; rowSum[b] += v; total += 2 * v
  }
  for (let a = 0; a < n; a++) for (const [b, v] of rows[a]) {
    const pmi = Math.log((v * total) / (rowSum[a] * rowSum[b] + 1e-9) + 1e-9)
    if (pmi > 0) rows[a].set(b, pmi); else rows[a].delete(b)
  }
  // iterazione di potenza su A·Q
  let s = seed >>> 0
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 - 0.5 }
  let Q: Float64Array[] = Array.from({ length: k }, () => Float64Array.from({ length: n }, rnd))
  const mul = (x: Float64Array) => {
    const y = new Float64Array(n)
    for (let a = 0; a < n; a++) { let t = 0; for (const [b, v] of rows[a]) t += v * x[b]; y[a] = t }
    return y
  }
  const ortho = (M: Float64Array[]) => {
    for (let i = 0; i < M.length; i++) {
      for (let j = 0; j < i; j++) { let d = 0; for (let t = 0; t < n; t++) d += M[i][t] * M[j][t]; for (let t = 0; t < n; t++) M[i][t] -= d * M[j][t] }
      let nr = 0; for (let t = 0; t < n; t++) nr += M[i][t] ** 2
      nr = Math.sqrt(nr) || 1; for (let t = 0; t < n; t++) M[i][t] /= nr
    }
    return M
  }
  Q = ortho(Q)
  for (let it = 0; it < 6; it++) Q = ortho(Q.map(mul))
  const AQ = Q.map(mul)
  const vecs = Array.from({ length: n }, (_, a) => {
    const v = new Float32Array(k)
    for (let c = 0; c < k; c++) v[c] = AQ[c][a]
    const nr = Math.hypot(...v) || 1
    for (let c = 0; c < k; c++) v[c] /= nr
    return v
  })
  const wordsList = top.map(i => ws.vocab[i])
  return { words: wordsList, index: new Map(wordsList.map((w, i) => [w, i])), vecs }
}

export function similarity(E: Embedding, a: string, b: string) {
  const i = E.index.get(a), j = E.index.get(b)
  if (i === undefined || j === undefined) return 0
  let d = 0
  for (let c = 0; c < E.vecs[i].length; c++) d += E.vecs[i][c] * E.vecs[j][c]
  return d
}

export function neighbors(E: Embedding, w: string, n = 10): { word: string; sim: number }[] {
  const i = E.index.get(w)
  if (i === undefined) return []
  const v = E.vecs[i]
  return E.vecs
    .map((u, j) => { let d = 0; for (let c = 0; c < v.length; c++) d += v[c] * u[c]; return { word: E.words[j], sim: d } })
    .filter(x => x.word !== w)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, n)
}

export const freqOf = (ws: WordSpaceData) => {
  const m = new Map(ws.vocab.map((w, i) => [w, ws.freq[i]]))
  return (w: string) => m.get(w) ?? 0
}
