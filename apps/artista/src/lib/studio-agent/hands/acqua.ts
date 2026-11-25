/**
 * Acqua sul poster: gocce appoggiate sulla stampa, con tensione superficiale. Ogni goccia è una piccola lente:
 * dalla mappa d'altezza vengono le normali, che rifrangono quello che c'è sotto (ingrandito e capovolto se grande),
 * il bordo scuro, il riflesso della luce e l'ombra sulla carta. E il freddo: brina (cristalli a felce) e gelo (vetro smerigliato).
 * Modi: goccioloni (1–2 grandi), gocce (decine), rugiada (centinaia di minuscole), brina, gelo.
 * Può stare su tutta la tavola o solo dove c'è un livello (l'acqua si posa su quello).
 */
import { flatten, fullLayer, newCanvas, withLayer, type Sheet } from './sheet'
import type { Tool } from './tools'

export type ModoAcqua = 'goccioloni' | 'gocce' | 'rugiada' | 'brina' | 'gelo'
const lid = () => `w${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`

export function acquaSu(base: HTMLCanvasElement, modo: ModoAcqua, seme: number, maschera?: HTMLCanvasElement): HTMLCanvasElement {
  const W = base.width, H = base.height, S = Math.min(W, H)
  let a = seme >>> 0
  const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
  const src = base.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, W, H).data
  const M = maschera ? maschera.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, W, H).data : null
  const out = newCanvas(W, H), g = out.getContext('2d')!
  const img = g.createImageData(W, H), o = img.data
  if (modo === 'brina' || modo === 'gelo') return gelo(base, src, M, W, H, S, r, modo, out)
  // 1. la mappa d'altezza: ogni goccia è una calotta con il bordo irregolare (la tensione la tiene, ma la carta la deforma)
  const h = new Float32Array(W * H), cid = new Int32Array(W * H).fill(-1)
  const n = modo === 'goccioloni' ? 1 + Math.floor(r() * 2) : modo === 'gocce' ? 10 + Math.floor(r() * 22) : 140 + Math.floor(r() * 260)
  const gocce: { x: number; y: number; R: number }[] = []
  for (let i = 0; i < n; i++) {
    const R = modo === 'goccioloni' ? S * (0.1 + r() * 0.14) : modo === 'gocce' ? S * (0.012 + Math.pow(r(), 2.5) * 0.06) : S * (0.005 + Math.pow(r(), 2.5) * 0.02)
    let x = 0, y = 0, prova = 0
    do { x = R + r() * (W - 2 * R); y = R + r() * (H - 2 * R); prova++ } while (M && prova < 40 && M[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] < 40)
    if (M && M[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] < 40) continue
    gocce.push({ x, y, R })
    const lob = [r() * 6.28, r() * 6.28, r() * 6.28], la = [0.08 + r() * 0.1, 0.04 + r() * 0.06, 0.02 + r() * 0.04], sq = 0.85 + r() * 0.25
    const id = gocce.length - 1
    for (let yy = Math.max(0, Math.floor(y - R * 1.3)); yy < Math.min(H, y + R * 1.3); yy++) for (let xx = Math.max(0, Math.floor(x - R * 1.3)); xx < Math.min(W, x + R * 1.3); xx++) {
      const dx = (xx - x) / sq, dy = (yy - y) * sq, an = Math.atan2(dy, dx)
      const Rb = R * (1 + la[0] * Math.sin(2 * an + lob[0]) + la[1] * Math.sin(3 * an + lob[1]) + la[2] * Math.sin(5 * an + lob[2]))
      const d = Math.hypot(dx, dy) / Rb
      if (d >= 1) continue
      // profilo da goccia appoggiata: piatta sopra, ripida sul bordo (angolo di contatto)
      const v = Math.pow(1 - d * d, 0.6) * R
      const k = yy * W + xx
      if (v > h[k]) { h[k] = v; cid[k] = id }
    }
  }
  // 2. ombra sulla carta (sotto e a destra, morbida): lo strato è trasparente fuori dalle gocce
  const ombra = newCanvas(W, H), og = ombra.getContext('2d')!
  og.filter = `blur(${Math.max(1, S * 0.004)}px)`; og.fillStyle = 'rgba(0,0,0,0.22)'
  for (const d of gocce) { og.beginPath(); og.ellipse(d.x + d.R * 0.12, d.y + d.R * 0.18, d.R * 0.95, d.R * 0.9, 0, 0, 6.283); og.fill() }
  const od = og.getImageData(0, 0, W, H).data
  for (let k = 0; k < W * H; k++) { if (h[k] > 0) continue; const al = od[k * 4 + 3] / 255; if (al > 0) { o[k * 4 + 3] = al * 255 } }
  // 3. dentro la goccia: rifrazione (la lente), bordo scuro, caustica, riflesso
  const Lx = -0.55, Ly = -0.65, Lz = 0.52
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const k = y * W + x; if (h[k] <= 0) continue
    const d = gocce[cid[k]], hx = (h[k + 1] - h[k - 1]) / 2, hy = (h[k + W] - h[k - W]) / 2
    const l = Math.hypot(hx, hy, 1), nx = -hx / l, ny = -hy / l, nz = 1 / l
    // la lente: le gocce grandi ingrandiscono e capovolgono il centro; il bordo piega forte verso l'interno
    const t = h[k] / d.R, inv = d.R > S * 0.05 ? -0.35 : 0.75
    let sx = d.x + (x - d.x) * inv * t + (x - d.x) * (1 - t) + nx * d.R * 0.5, sy = d.y + (y - d.y) * inv * t + (y - d.y) * (1 - t) + ny * d.R * 0.5
    sx = Math.max(0, Math.min(W - 1, sx)); sy = Math.max(0, Math.min(H - 1, sy))
    const s4 = (Math.floor(sy) * W + Math.floor(sx)) * 4
    const bordo = Math.pow(1 - nz, 1.6) * 0.75, luce = Math.max(0, nx * Lx + ny * Ly + nz * Lz)
    const spec = Math.pow(Math.max(0, nx * -0.35 + ny * -0.45 + nz * 0.82), 60) * 1.2
    const caust = Math.max(0, -(nx * Lx + ny * Ly)) * (1 - nz) * 0.5
    for (let c = 0; c < 3; c++) {
      let v = src[s4 + c] * (1.06 - bordo) * (0.92 + 0.12 * luce) + caust * 120
      v = v + (255 - v) * Math.min(1, spec)
      o[k * 4 + c] = Math.max(0, Math.min(255, v))
    }
    o[k * 4 + 3] = 255
  }
  g.putImageData(img, 0, 0)
  // l'orlo: una linea sottile più chiara dove l'acqua tocca la carta
  g.globalAlpha = 0.18; g.strokeStyle = '#fff'; g.lineWidth = Math.max(0.6, S * 0.0012)
  for (const d of gocce) if (d.R > S * 0.01) { g.beginPath(); g.arc(d.x, d.y, d.R * 0.98, Math.PI * 0.1, Math.PI * 0.9); g.stroke() }
  g.globalAlpha = 1
  return out
}

function gelo(base: HTMLCanvasElement, src: Uint8ClampedArray, M: Uint8ClampedArray | null, W: number, H: number, S: number, r: () => number, modo: 'brina' | 'gelo', out: HTMLCanvasElement) {
  const g = out.getContext('2d')!
  // la zona gelata: dal bordo verso dentro (brina) o a chiazze larghe (gelo), con qualche varco pulito
  const zona = newCanvas(W, H), zg = zona.getContext('2d')!
  zg.filter = `blur(${S * 0.05}px)`; zg.fillStyle = '#fff'
  if (modo === 'brina') { const sp = S * (0.12 + r() * 0.2); zg.lineWidth = sp; zg.strokeStyle = '#fff'; zg.strokeRect(0, 0, W, H); for (let i = 0; i < 5; i++) { zg.beginPath(); zg.arc(r() * W, r() < 0.5 ? 0 : H, S * (0.1 + r() * 0.25), 0, 6.283); zg.fill() } }
  else { zg.fillRect(0, 0, W, H); zg.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 2 + r() * 3; i++) { zg.beginPath(); zg.ellipse(r() * W, r() * H, S * (0.08 + r() * 0.18), S * (0.06 + r() * 0.12), r() * 3, 0, 6.283); zg.fill() } }
  if (M) { zg.filter = 'none'; zg.globalCompositeOperation = 'destination-in'; zg.drawImage(maschiera(M, W, H), 0, 0) }
  // vetro smerigliato: la tavola sfocata e schiarita, dentro la zona
  const smer = newCanvas(W, H), sg = smer.getContext('2d')!
  sg.filter = `blur(${S * (modo === 'gelo' ? 0.012 : 0.006)}px)`; sg.drawImage(base, 0, 0); sg.filter = 'none'
  sg.fillStyle = modo === 'gelo' ? 'rgba(225,235,245,0.38)' : 'rgba(240,245,250,0.22)'; sg.fillRect(0, 0, W, H)
  sg.globalCompositeOperation = 'destination-in'; sg.drawImage(zona, 0, 0)
  g.drawImage(smer, 0, 0)
  // i cristalli: felci a 60°, sottili, che crescono dentro la zona
  const zd = zg.getImageData(0, 0, W, H).data
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineCap = 'round'
  const felce = (x: number, y: number, an: number, L: number, w: number, prof: number) => {
    if (L < S * 0.004 || prof > 4) return
    const x2 = x + Math.cos(an) * L, y2 = y + Math.sin(an) * L
    g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke()
    const nR = 3 + Math.floor(r() * 5)
    for (let i = 1; i <= nR; i++) { const t = i / (nR + 1), px = x + (x2 - x) * t, py = y + (y2 - y) * t, l2 = L * (0.45 - 0.3 * t) * (0.7 + r() * 0.4); felce(px, py, an + Math.PI / 3, l2, w * 0.6, prof + 1); felce(px, py, an - Math.PI / 3, l2, w * 0.6, prof + 1) }
  }
  const nC = modo === 'brina' ? 140 + Math.floor(r() * 120) : 50 + Math.floor(r() * 60)
  for (let i = 0; i < nC; i++) {
    const x = r() * W, y = r() * H, z = zd[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] / 255
    if (z < 0.35) continue
    g.globalAlpha = 0.25 + 0.6 * z
    felce(x, y, r() * 6.283, S * (0.015 + r() * 0.05) * z, Math.max(0.5, S * 0.0012), 0)
  }
  // granelli di ghiaccio che brillano
  g.fillStyle = '#fff'
  for (let i = 0; i < (modo === 'brina' ? 2500 : 900); i++) { const x = r() * W, y = r() * H, z = zd[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] / 255; if (z < 0.3) continue; g.globalAlpha = 0.3 + r() * 0.5 * z; g.fillRect(x, y, 1 + r() * 1.4, 1 + r() * 1.4) }
  g.globalAlpha = 1
  return out
}
function maschiera(M: Uint8ClampedArray, W: number, H: number) { const c = newCanvas(W, H), q = c.getContext('2d')!, d = q.createImageData(W, H); d.data.set(M); q.putImageData(d, 0, 0); return c }

export const acqua: Tool = {
  id: 'acqua', label: 'Acqua sul poster', nature: 'trasformazione',
  pushes: { complessita: 0.08, contrasto: 0.05 },
  available: s => s.layers.length >= 2,
  propose: (s, c) => {
    const q = c.r()
    const modo: ModoAcqua = q < 0.18 ? 'goccioloni' : q < 0.48 ? 'gocce' : q < 0.72 ? 'rugiada' : q < 0.88 ? 'brina' : 'gelo'
    const figure = s.layers.filter(l => l.scale < 0.99)
    return { modo, seme: Math.floor(c.r() * 1e9), livello: figure.length && c.r() < 0.4 ? figure[Math.floor(c.r() * figure.length)].id : '' }
  },
  apply: async (s, p) => {
    const base = flatten(s, 1)
    const l = p.livello ? s.layers.find(x => x.id === p.livello) : undefined
    const maschera = l ? flatten({ ...s, bg: 'rgba(0,0,0,0)', layers: [l] }, 1) : undefined
    const cv = acquaSu(base, p.modo as ModoAcqua, p.seme as number, maschera)
    return withLayer(s, fullLayer(s, lid(), 'acqua', cv, 'source-over'))
  },
}
