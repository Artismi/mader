/**
 * La veste dei mondi: le linee di un cristallo o di una camera non restano di un colore solo. Prendono la luce:
 * sfumature (lineari, radiali come la profondità, coniche come un'iride astrale) dalle palette del software di grafica
 * (i preset di sfumatura, le armonie OKLCH) o dalla tavola; un bagliore attorno ai tratti (come le tracce luminose e le
 * stelle); la grana. Tutto deriva dai parametri, quindi lo stesso strato si rifà identico (anche crescendo nel reel).
 */
import { newCanvas } from './sheet'

export interface Veste { luce: 'mono' | 'lineare' | 'radiale' | 'iride'; colori: string[]; angolo: number; bagliore: number; grana: number }

// i preset di sfumatura del software di grafica, più alcuni astrali
export const SFUMATURE: string[][] = [
  ['#ff6b6b', '#feca57'], ['#0abde3', '#a29bfe'], ['#6c5ce7', '#fd79a8'], ['#2d3436', '#74b9ff'], ['#a29bfe', '#00cec9'], ['#f9ca24', '#f0932b'], ['#e17055', '#d63031'],
  // astrali: nebulose, plasma, aurore, oro su blu profondo
  ['#9ad1ff', '#f4f1ff', '#b38cff'], ['#ffd27a', '#ff6a3d', '#7b2cbf'], ['#7cf7d4', '#5b5bff'], ['#f5f3ff', '#7dd3fc', '#1e3a8a'], ['#fde68a', '#f472b6', '#60a5fa'], ['#c4f1ff', '#ffe29a'],
]

export function vesteACaso(r: () => number, tinte: string[] = [], scuro = true): Veste {
  const q = r()
  const luce: Veste['luce'] = q < 0.2 ? 'mono' : q < 0.45 ? 'lineare' : q < 0.72 ? 'radiale' : 'iride'
  const pres = SFUMATURE[Math.floor(r() * SFUMATURE.length)]
  const colori = tinte.length >= 2 && r() < 0.35 ? tinte.slice(0, 3) : pres
  return { luce, colori, angolo: r() * Math.PI * 2, bagliore: scuro ? (r() < 0.6 ? 0.3 + r() * 0.7 : 0) : (r() < 0.2 ? 0.3 : 0), grana: r() < 0.4 ? 0.05 + r() * 0.12 : 0 }
}

/** veste un canvas di linee (alfa = inchiostro): colore come luce, bagliore, grana */
export function vesti(cv: HTMLCanvasElement, v: Veste): HTMLCanvasElement {
  const W = cv.width, H = cv.height
  const out = newCanvas(W, H), g = out.getContext('2d')!
  // il colore: la sfumatura dentro la forma delle linee
  const col = newCanvas(W, H), q = col.getContext('2d')!
  q.drawImage(cv, 0, 0)
  if (v.luce !== 'mono' && v.colori.length >= 2) {
    q.globalCompositeOperation = 'source-in'
    let gr: CanvasGradient
    if (v.luce === 'lineare') { const dx = Math.cos(v.angolo) * W / 2, dy = Math.sin(v.angolo) * H / 2; gr = q.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy) }
    else if (v.luce === 'radiale') gr = q.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2)
    else gr = (q as CanvasRenderingContext2D & { createConicGradient: (a: number, x: number, y: number) => CanvasGradient }).createConicGradient(v.angolo, W / 2, H / 2)
    const cs = v.luce === 'iride' ? [...v.colori, v.colori[0]] : v.colori
    cs.forEach((c, i) => gr.addColorStop(i / (cs.length - 1), c))
    q.fillStyle = gr; q.fillRect(0, 0, W, H)
    q.globalCompositeOperation = 'source-over'
  }
  // il bagliore: la stessa luce sfocata, sotto, che si somma
  if (v.bagliore > 0) {
    g.save(); g.filter = `blur(${Math.round(W * 0.012)}px)`; g.globalAlpha = Math.min(1, v.bagliore); g.globalCompositeOperation = 'lighter'
    g.drawImage(col, 0, 0); g.filter = `blur(${Math.round(W * 0.004)}px)`; g.drawImage(col, 0, 0); g.restore()
  }
  g.drawImage(col, 0, 0)
  // la grana: polvere sull'inchiostro
  if (v.grana > 0) {
    const d = g.getImageData(0, 0, W, H), p = d.data
    let s = 9301
    for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 8) continue; s = (s * 1103515245 + 12345) >>> 0; const n = ((s >>> 16) / 65535 - 0.5) * 255 * v.grana * 2; p[i] = Math.max(0, Math.min(255, p[i] + n)); p[i + 1] = Math.max(0, Math.min(255, p[i + 1] + n)); p[i + 2] = Math.max(0, Math.min(255, p[i + 2] + n)) }
    g.putImageData(d, 0, 0)
  }
  return out
}

/** un fondo cosmico: profondo, con una nebulosa appena accennata e polvere di stelle */
export function fondoCosmico(W: number, H: number, r: () => number, colori: string[]): HTMLCanvasElement {
  const cv = newCanvas(W, H), g = cv.getContext('2d')!
  const gr = g.createRadialGradient(W * (0.3 + r() * 0.4), H * (0.3 + r() * 0.4), 0, W / 2, H / 2, Math.hypot(W, H) * 0.7)
  gr.addColorStop(0, '#1a1633'); gr.addColorStop(0.55, '#0b0b18'); gr.addColorStop(1, '#040408')
  g.fillStyle = gr; g.fillRect(0, 0, W, H)
  // la nebulosa: due velature dei colori della veste, sfocate
  g.save(); g.filter = `blur(${Math.round(W * 0.08)}px)`; g.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 3; i++) { g.globalAlpha = 0.08 + r() * 0.1; g.fillStyle = colori[i % colori.length]; g.beginPath(); g.ellipse(W * r(), H * r(), W * (0.2 + r() * 0.3), H * (0.1 + r() * 0.2), r() * 3, 0, 6.283); g.fill() }
  g.restore()
  // le stelle: tante piccolissime, poche più luminose
  for (let i = 0; i < 900; i++) { const b = r(); g.globalAlpha = 0.2 + 0.8 * b * b; g.fillStyle = b > 0.97 ? '#fff6e0' : '#cfd8ff'; const rr = b > 0.985 ? 1.6 : 0.6 + r() * 0.5; g.beginPath(); g.arc(r() * W, r() * H, rr, 0, 6.283); g.fill() }
  g.globalAlpha = 1
  return cv
}
