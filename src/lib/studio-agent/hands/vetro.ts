/**
 * Vetro: l'immagine vista attraverso un vetro lavorato.
 *  - cannellato: strisce parallele (verticali, orizzontali, diagonali), ognuna una lente cilindrica: dentro la canna
 *    l'immagine si comprime e si ribalta un poco, ai bordi la canna scurisce e prende un filo di luce;
 *  - tasselli: una griglia di lenti quadrate (ognuna ingrandisce il suo pezzo);
 *  - vetrata: zone con orientamenti diversi che si incrociano (a croce, a fasce, a riquadri), come vetri sovrapposti.
 * Tutto deriva dai parametri, quindi si rifà identico.
 */
import { flatten, fullLayer, newCanvas, replaceLayer, type Sheet } from './sheet'
import type { Tool } from './tools'

export type Disegno = 'verticale' | 'orizzontale' | 'diagonale' | 'tasselli' | 'croce' | 'fasce' | 'riquadri'
export interface OpzioniVetro { disegno: Disegno; canna: number; curva: number; ombra: number; seme: number }

export function vetro(src: HTMLCanvasElement, o: OpzioniVetro): HTMLCanvasElement {
  const W = src.width, H = src.height, S = Math.min(W, H)
  const A = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, W, H).data
  const out = newCanvas(W, H), g = out.getContext('2d')!, I = g.createImageData(W, H), B = I.data
  let a = o.seme >>> 0
  const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
  const w = Math.max(4, S * o.canna)
  // le zone della vetrata: per ogni pixel, l'orientamento della canna (0 vert, 1 oriz, 2 diag, 3 tassello) e la sua larghezza
  const cx = W * (0.3 + r() * 0.4), cy = H * (0.3 + r() * 0.4), bw = S * (0.12 + r() * 0.15)
  const nf = 3 + Math.floor(r() * 3), fasce = Array.from({ length: nf }, () => r()).sort()
  const zona = (x: number, y: number): [number, number] => {
    switch (o.disegno) {
      case 'verticale': return [0, w]
      case 'orizzontale': return [1, w]
      case 'diagonale': return [2, w]
      case 'tasselli': return [3, w * 2.2]
      case 'croce': return Math.abs(x - cx) < bw ? [1, w * 0.7] : Math.abs(y - cy) < bw ? [0, w * 0.7] : [0, w * 1.6]
      case 'fasce': { const t = y / H; const k = fasce.findIndex(f => t < f); return [k % 2 === 0 ? 0 : 1, w * (k % 3 === 0 ? 1 : 0.6)] }
      default: { const qx = Math.floor(x / (S * 0.33)), qy = Math.floor(y / (S * 0.33)); return [(qx + qy) % 3, w * (0.6 + ((qx * 7 + qy * 3) % 3) * 0.4)] }
    }
  }
  const k = o.curva // quanto la canna comprime e ribalta
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [dir, ww] = zona(x, y)
    let sx = x, sy = y, u = 0, v = 0
    if (dir === 0 || dir === 3) { const i0 = Math.floor(x / ww); u = x / ww - i0; sx = (i0 + 0.5) * ww + (0.5 - u) * ww * k + (u - 0.5) * ww * (1 - k) }
    if (dir === 1 || dir === 3) { const j0 = Math.floor(y / ww); v = y / ww - j0; sy = (j0 + 0.5) * ww + (0.5 - v) * ww * k + (v - 0.5) * ww * (1 - k) }
    if (dir === 2) { const d = (x + y) / Math.SQRT2, i0 = Math.floor(d / ww); u = d / ww - i0; const off = ((0.5 - u) * ww * k * 2 - (u - 0.5) * ww * 0) / Math.SQRT2; sx = x + off; sy = y + off }
    sx = Math.max(0, Math.min(W - 1, Math.round(sx))); sy = Math.max(0, Math.min(H - 1, Math.round(sy)))
    const s4 = (sy * W + sx) * 4, d4 = (y * W + x) * 4
    // la canna: scura ai bordi, un filo di luce poco dentro il bordo sinistro/alto
    const t = dir === 1 ? v : u, t2 = dir === 3 ? Math.min(u, v, 1 - u, 1 - v) * 2 : Math.min(t, 1 - t) * 2
    const scuro = Math.pow(1 - t2, 6) * o.ombra, luce = Math.exp(-Math.pow((t - 0.14) / 0.05, 2)) * o.ombra * 0.6
    for (let c = 0; c < 3; c++) { let val = A[s4 + c] * (1 - scuro); val = val + (255 - val) * luce; B[d4 + c] = val }
    B[d4 + 3] = A[s4 + 3]
  }
  g.putImageData(I, 0, 0)
  return out
}

export const vetroTool: Tool = {
  id: 'vetro', label: 'Vetro lavorato', nature: 'trasformazione',
  pushes: { complessita: 0.06, ripetizione: 0.1 },
  available: s => s.layers.length >= 1,
  propose: (s, c) => {
    const d = (['verticale', 'verticale', 'orizzontale', 'diagonale', 'tasselli', 'croce', 'fasce', 'riquadri'] as Disegno[])[Math.floor(c.r() * 8)]
    const figure = s.layers.filter(l => l.scale < 0.99)
    return { disegno: d, canna: 0.025 + c.r() * 0.1, curva: 0.5 + c.r() * 1.2, ombra: 0.15 + c.r() * 0.35, seme: Math.floor(c.r() * 1e9), layer: figure.length && c.r() < 0.35 ? figure[Math.floor(c.r() * figure.length)].id : '' }
  },
  apply: async (s: Sheet, p) => {
    const o = p as unknown as OpzioniVetro & { layer: string }
    const l = o.layer ? s.layers.find(x => x.id === o.layer) : undefined
    if (l) return replaceLayer(s, l.id, { canvas: vetro(l.canvas, o) })
    // tutta la tavola: la lastra sta davanti all'immagine ma dietro alle parole (che restano leggibili, sopra il vetro)
    const TXT = /testo|tipografia|etichette|firma|piastra/
    const primoTesto = s.layers.findIndex(l => TXT.test(l.kind))
    const sotto = primoTesto < 0 ? s.layers : s.layers.slice(0, primoTesto), sopra = primoTesto < 0 ? [] : s.layers.slice(primoTesto)
    const cv = vetro(flatten({ ...s, layers: sotto }, 1), o)
    const lastra = fullLayer(s, `v${Date.now().toString(36)}`, 'vetro', cv, 'source-over')
    return { ...s, layers: [...sotto, lastra, ...sopra] }
  },
}
