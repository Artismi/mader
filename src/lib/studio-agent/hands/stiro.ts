/**
 * Due trattamenti da riferimento (toan_vu_huu e simili):
 *  - stiro (pixel stretch): una riga o una colonna di pixel viene stirata su una fascia, come una scansione che si inceppa;
 *  - tasselli: la tavola divisa in una griglia, ogni tassello è lo stesso soggetto trattato diversamente
 *    (ingrandito, ritagliato altrove, specchiato, a soglia, stirato), come un provino di stampa.
 * Le parole restano sopra, leggibili.
 */
import { flatten, fullLayer, newCanvas, type Sheet } from './sheet'
import type { Tool } from './tools'

const TXT = /testo|tipografia|etichette|firma|piastra/
const dividi = (s: Sheet) => { const i = s.layers.findIndex(l => TXT.test(l.kind)); return i < 0 ? [s.layers, []] : [s.layers.slice(0, i), s.layers.slice(i)] }

export function stira(src: HTMLCanvasElement, r: () => number, verticale: boolean, n: number): HTMLCanvasElement {
  const W = src.width, H = src.height, out = newCanvas(W, H), g = out.getContext('2d')!
  g.drawImage(src, 0, 0)
  for (let i = 0; i < n; i++) {
    if (verticale) { const x0 = Math.floor(r() * W), w = Math.floor(W * (0.04 + r() * 0.25)), y0 = Math.floor(r() * H * 0.6), h = Math.floor(H * (0.15 + r() * 0.5)); g.drawImage(src, x0, y0, 1, h, Math.min(W - w, x0), y0, w, h) }
    else { const y0 = Math.floor(r() * H), h = Math.floor(H * (0.03 + r() * 0.2)), x0 = Math.floor(r() * W * 0.5), w = Math.floor(W * (0.2 + r() * 0.6)); g.drawImage(src, x0, y0, w, 1, x0, Math.min(H - h, y0), w, h) }
  }
  return out
}

export function tasselli(src: HTMLCanvasElement, r: () => number, nx: number, ny: number): HTMLCanvasElement {
  const W = src.width, H = src.height, out = newCanvas(W, H), g = out.getContext('2d')!, tw = W / nx, th = H / ny
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = i * tw, y = j * th, q = r()
    g.save(); g.beginPath(); g.rect(x, y, tw, th); g.clip()
    if (q < 0.45) g.drawImage(src, x, y, tw, th, x, y, tw, th) // com'è
    else if (q < 0.5) { const z = 2 + r() * 3, sx = r() * (W - tw / z), sy = r() * (H - th / z); g.drawImage(src, sx, sy, tw / z, th / z, x, y, tw, th) } // un dettaglio ingrandito
    else if (q < 0.65) { g.translate(x + tw, y); g.scale(-1, 1); g.drawImage(src, x, y, tw, th, 0, 0, tw, th) } // specchiato
    else if (q < 0.8) g.drawImage(src, 0, 0, W, H, x, y, tw, th) // tutta la tavola in piccolo
    else { const sx = x + r() * tw; g.drawImage(src, sx, y, 1, th, x, y, tw, th) } // stirato
    g.restore()
    // a soglia, ogni tanto: il tassello diventa bianco e nero netto
    if (r() < 0.08) { const d = g.getImageData(x, y, Math.ceil(tw), Math.ceil(th)), p = d.data, t = 100 + r() * 60; for (let k = 0; k < p.length; k += 4) { const v = (p[k] * 0.3 + p[k + 1] * 0.59 + p[k + 2] * 0.11) > t ? 255 : 0; p[k] = p[k + 1] = p[k + 2] = v } g.putImageData(d, x, y) }
  }
  return out
}

const lid = () => `s${Date.now().toString(36)}${Math.floor(Math.random() * 1e5).toString(36)}`
export const stiroTool: Tool = {
  id: 'stiro', label: 'Pixel stretch', nature: 'trasformazione', pushes: { complessita: 0.05 },
  available: s => s.layers.length >= 1,
  propose: (_s, c) => ({ verticale: c.r() < 0.6, n: 1 + Math.floor(c.r() * 3), seme: Math.floor(c.r() * 1e9) }),
  apply: async (s, p) => {
    let a = (p.seme as number) >>> 0; const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
    const [sotto, sopra] = dividi(s), cv = stira(flatten({ ...s, layers: sotto }, 1), r, p.verticale as boolean, p.n as number)
    return { ...s, layers: [...sotto, fullLayer(s, lid(), 'stiro', cv, 'source-over'), ...sopra] }
  },
}
export const tasselliTool: Tool = {
  id: 'tasselli', label: 'Provino a tasselli', nature: 'ripetizione', pushes: { ripetizione: 0.2, complessita: 0.1 },
  available: s => s.layers.length >= 2,
  propose: (_s, c) => { const n = 2 + Math.floor(c.r() * 4); return { nx: n, ny: n + (c.r() < 0.5 ? 1 : 0), seme: Math.floor(c.r() * 1e9) } },
  apply: async (s, p) => {
    let a = (p.seme as number) >>> 0; const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
    const [sotto, sopra] = dividi(s), cv = tasselli(flatten({ ...s, layers: sotto }, 1), r, p.nx as number, p.ny as number)
    return { ...s, layers: [...sotto, fullLayer(s, lid(), 'tasselli', cv, 'source-over'), ...sopra] }
  },
}
