/**
 * Dai riferimenti video:
 *  - particelle: la figura diventa una nuvola di punti luminosi; la luminosità dà la profondità, la nuvola è vista
 *    un poco di sbieco (come un modello 3D di punti), i punti brillano per somma di luce;
 *  - sciame: la figura si scompone in quadretti; quelli sul bordo si staccano e si disperdono verso fuori,
 *    sempre più radi, come se la forma si sfaldasse in pixel.
 */
import { newCanvas, replaceLayer, type Sheet } from './sheet'
import type { Tool } from './tools'

const rnd = (seme: number) => { let a = seme >>> 0; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296) }

export function particelle(src: HTMLCanvasElement, seme: number, passo = 4, inclinazione = 0.5, colore?: string): HTMLCanvasElement {
  const r = rnd(seme), W = src.width, H = src.height, A = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, W, H).data
  const out = newCanvas(W, H), g = out.getContext('2d')!
  g.globalCompositeOperation = 'lighter'
  const cx = W / 2, cy = H / 2, ca = Math.cos(inclinazione), sa = Math.sin(inclinazione), prof = Math.min(W, H) * 0.35
  for (let y = 0; y < H; y += passo) for (let x = 0; x < W; x += passo) {
    const i = (Math.floor(y) * W + Math.floor(x)) * 4; if (A[i + 3] < 30) continue
    const lum = (A[i] * 0.3 + A[i + 1] * 0.59 + A[i + 2] * 0.11) / 255
    if (r() > 0.25 + 0.75 * (A[i + 3] / 255)) continue
    // profondità dalla luce, poi la rotazione attorno all'asse orizzontale e una prospettiva leggera
    const z = (lum - 0.5) * prof + (r() - 0.5) * passo * 2
    const yy = (y - cy) * ca - z * sa, zz = (y - cy) * sa + z * ca, f = 1 / (1 + zz / (Math.min(W, H) * 2.5))
    const px = cx + (x - cx + (r() - 0.5) * passo) * f, py = cy + yy * f
    const rr = Math.max(0.6, passo * 0.35 * f * (0.6 + lum))
    g.fillStyle = colore ?? `rgb(${A[i]},${A[i + 1]},${A[i + 2]})`
    g.globalAlpha = 0.25 + 0.6 * lum; g.beginPath(); g.arc(px, py, rr, 0, 6.283); g.fill()
    if (lum > 0.75 && r() < 0.08) { g.globalAlpha = 0.12; g.beginPath(); g.arc(px, py, rr * 5, 0, 6.283); g.fill() } // alone sui punti più chiari
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'
  return out
}

export function sciame(src: HTMLCanvasElement, seme: number, blocco = 8, dispersione = 0.5): HTMLCanvasElement {
  const r = rnd(seme), W = src.width, H = src.height
  const sg = src.getContext('2d', { willReadFrequently: true })!, A = sg.getImageData(0, 0, W, H).data
  // quanto un blocco è vicino al bordo: alfa sfocata (al centro piena, sul bordo media)
  const b = newCanvas(W, H), bg = b.getContext('2d', { willReadFrequently: true })!
  bg.filter = `blur(${blocco * 2.5}px)`; bg.drawImage(src, 0, 0); const B = bg.getImageData(0, 0, W, H).data
  const out = newCanvas(W, H), g = out.getContext('2d')!
  const cx = W / 2, cy = H / 2
  for (let y = 0; y < H; y += blocco) for (let x = 0; x < W; x += blocco) {
    const i = (Math.min(H - 1, y + (blocco >> 1)) * W + Math.min(W - 1, x + (blocco >> 1))) * 4
    if (A[i + 3] < 40) continue
    const dentro = B[i + 3] / 255 // 1 al centro della forma, ~0.5 sul bordo
    const bordo = Math.max(0, 1 - Math.abs(dentro - 0.55) * 3)
    let dx = 0, dy = 0, fuori = false
    if (r() < bordo * dispersione * 1.4) {
      // il quadretto si stacca e va verso fuori, lontano in proporzione al caso
      const an = Math.atan2(y - cy, x - cx) + (r() - 0.5) * 1.2, d = blocco * (1 + Math.pow(r(), 2) * 22 * dispersione)
      dx = Math.cos(an) * d; dy = Math.sin(an) * d; fuori = true
    }
    g.fillStyle = `rgb(${A[i]},${A[i + 1]},${A[i + 2]})`
    g.globalAlpha = fuori ? 0.55 + r() * 0.45 : 1
    const s = fuori ? blocco * (0.4 + r() * 0.6) : blocco
    g.fillRect(Math.round(x + dx), Math.round(y + dy), Math.ceil(s), Math.ceil(s))
  }
  g.globalAlpha = 1
  return out
}

export const particelleTool: Tool = {
  id: 'particelle', label: 'Nuvola di particelle', nature: 'trasformazione', pushes: { complessita: 0.08, luminosita: 0.05 },
  available: s => s.layers.some(l => l.scale < 0.99 && !/testo|tipografia|etichette|firma/.test(l.kind)),
  propose: (s, c) => { const f = s.layers.filter(l => l.scale < 0.99 && !/testo|tipografia|etichette|firma/.test(l.kind)); return { layer: f[Math.floor(c.r() * f.length)].id, passo: 3 + Math.floor(c.r() * 4), incl: 0.2 + c.r() * 0.8, seme: Math.floor(c.r() * 1e9) } },
  apply: async (s, p) => { const l = s.layers.find(x => x.id === p.layer); return l ? replaceLayer(s, l.id, { canvas: particelle(l.canvas, p.seme as number, p.passo as number, p.incl as number), blend: 'screen' }) : s },
}
export const sciameTool: Tool = {
  id: 'sciame', label: 'Sciame di pixel', nature: 'trasformazione', pushes: { complessita: 0.08 },
  available: s => s.layers.some(l => l.scale < 0.99 && !/testo|tipografia|etichette|firma/.test(l.kind)),
  propose: (s, c) => { const f = s.layers.filter(l => l.scale < 0.99 && !/testo|tipografia|etichette|firma/.test(l.kind)); return { layer: f[Math.floor(c.r() * f.length)].id, blocco: 5 + Math.floor(c.r() * 10), disp: 0.3 + c.r() * 0.6, seme: Math.floor(c.r() * 1e9) } },
  apply: async (s, p) => { const l = s.layers.find(x => x.id === p.layer); return l ? replaceLayer(s, l.id, { canvas: sciame(l.canvas, p.seme as number, p.blocco as number, p.disp as number) }) : s },
}
