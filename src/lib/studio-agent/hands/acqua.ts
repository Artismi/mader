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
  // la superficie liscia: si ammorbidisce la mappa d'altezza (normali pulite, niente grana)
  {
    const t = new Float32Array(W * H), rr = Math.max(1, Math.round(S * 0.0015))
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let sm = 0, c = 0; for (let k = -rr; k <= rr; k++) { const xx = x + k; if (xx >= 0 && xx < W) { sm += h[y * W + xx]; c++ } } t[y * W + x] = sm / c }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let sm = 0, c = 0; for (let k = -rr; k <= rr; k++) { const yy = y + k; if (yy >= 0 && yy < H) { sm += t[yy * W + x]; c++ } } h[y * W + x] = sm / c }
    }
  }
  // 2. l'ombra: solo dal lato opposto alla luce, stretta e morbida; dentro l'ombra la luce che la goccia concentra (caustica)
  const Lx = -0.6, Ly = -0.7
  const ombra = newCanvas(W, H), og = ombra.getContext('2d')!
  og.filter = `blur(${Math.max(1, S * 0.003)}px)`
  for (const d of gocce) { og.fillStyle = 'rgba(0,0,0,0.42)'; og.beginPath(); og.ellipse(d.x - Lx * d.R * 0.22, d.y - Ly * d.R * 0.22, d.R * 1.0, d.R * 0.97, 0, 0, 6.283); og.fill() }
  const od = og.getImageData(0, 0, W, H).data
  const caus = newCanvas(W, H), cg = caus.getContext('2d')!
  cg.filter = `blur(${Math.max(1, S * 0.004)}px)`
  for (const d of gocce) { cg.fillStyle = 'rgba(255,255,235,0.75)'; cg.beginPath(); cg.ellipse(d.x - Lx * d.R * 0.78, d.y - Ly * d.R * 0.78, d.R * 0.42, d.R * 0.24, Math.atan2(-Ly, -Lx) + Math.PI / 2, 0, 6.283); cg.fill() }
  const cd = cg.getImageData(0, 0, W, H).data
  // fuori dalla goccia: la carta in ombra, e la luce che la goccia ha raccolto e posa accanto, dal lato opposto alla luce
  for (let k = 0; k < W * H; k++) { if (h[k] > 0.02) continue; const sh = od[k * 4 + 3] / 255, ca = cd[k * 4 + 3] / 255; if (sh <= 0.01 && ca <= 0.01) continue; for (let c = 0; c < 3; c++) { let v = src[k * 4 + c] * (1 - sh * 0.75); v = v + (255 - v) * ca * 0.8; o[k * 4 + c] = v } o[k * 4 + 3] = 255 }
  // 3. dentro: quello che c'è sotto, spostato poco (di più verso il bordo), un velo di aberrazione sul bordo,
  //    il bordo scuro dal lato in ombra, la caustica chiara dal lato opposto alla luce, un riflesso piccolo e netto
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const k = y * W + x; if (h[k] <= 0.02) continue
    const d = gocce[cid[k]] ?? gocce[0], hx = (h[k + 1] - h[k - 1]) / 2, hy = (h[k + W] - h[k - W]) / 2
    const l = Math.hypot(hx, hy, 1), nx = -hx / l, ny = -hy / l, nz = 1 / l
    const pend = 1 - nz, grande = d.R > S * 0.06
    const sp = (grande ? 1.1 : 0.9) * h[k] * 0.9
    const ox = nx * sp + (grande ? (d.x - x) * 0.06 * (h[k] / d.R) : 0), oy = ny * sp + (grande ? (d.y - y) * 0.06 * (h[k] / d.R) : 0)
    const camp = (dx: number, dy: number, c: number) => { const sx = Math.max(0, Math.min(W - 1, Math.round(x - dx))), sy = Math.max(0, Math.min(H - 1, Math.round(y - dy))); return src[(sy * W + sx) * 4 + c] }
    const ab = 1 + Math.pow(pend, 3) * 0.12
    const rgb = [camp(ox * ab, oy * ab, 0), camp(ox, oy, 1), camp(ox / ab, oy / ab, 2)]
    const lato = nx * Lx + ny * Ly // > 0 verso la luce
    // come nelle foto: la goccia è trasparente, quindi il lato SCURO è quello verso la luce (la luce entra e se ne va dall'altra parte),
    // la caustica CHIARA è dal lato opposto, vicino al bordo; il riflesso netto resta sul lato della luce; una linea di contatto scura tutt'intorno
    const pos = ((x - d.x) * Lx + (y - d.y) * Ly) / d.R // > 0: metà verso la luce
    const contatto = h[k] < d.R * 0.06 ? 0.35 * (1 - h[k] / (d.R * 0.06)) : 0
    const scuro = Math.min(0.85, Math.pow(Math.min(1, pend * 1.5), 1.8) * (0.2 + 0.45 * Math.max(0, lato)) + 0.28 * Math.max(0, pos) + contatto)
    const chiaro = Math.max(0, -pos) * Math.pow(Math.min(1, pend * 2.2), 1.2) * 0.55 + Math.max(0, -pos) * 0.12 + (cd[k * 4 + 3] / 255) * 0.2
    const hl = Math.pow(Math.max(0, nx * -0.42 + ny * -0.5 + nz * 0.76), 140), hl2 = Math.pow(Math.max(0, nx * 0.5 + ny * 0.55 + nz * 0.67), 220) * 0.4
    const spec = Math.min(1, (hl > 0.5 ? 1 : hl * 2) + hl2)
    for (let c = 0; c < 3; c++) {
      // bagnato: quello che sta sotto è più scuro e più saturo; il corpo dell'acqua ha volume (più scuro dal lato in ombra)
      const mm = (rgb[0] + rgb[1] + rgb[2]) / 3
      let v = (mm + (rgb[c] - mm) * 1.18) * 0.9 * (1 - scuro) * (1 - 0.1 * Math.max(0, -lato) * (1 - nz * 0.5))
      v = v + (255 - v) * chiaro
      v = v + (255 - v) * spec
      o[k * 4 + c] = Math.max(0, Math.min(255, v))
    }
    // il bordo sfuma di un pixel nella carta (niente scalino)
    o[k * 4 + 3] = Math.min(255, 255 * Math.min(1, h[k] / Math.max(0.5, S * 0.0012)))
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
  // i cristalli: piume di ghiaccio che crescono dove il gelo è più forte verso dove è più debole (dal bordo verso dentro),
  // ramificate a ~60° con un poco di disordine, più fitte e sottili; prima un alone (bloom), poi il tratto netto
  const zd = zg.getImageData(0, 0, W, H).data
  const zA = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : zd[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] / 255
  const segni: [number, number, number, number, number, number][] = []
  const piuma = (x: number, y: number, an: number, L: number, w: number, prof: number) => {
    if (L < S * 0.003 || prof > 5 || segni.length > 60000) return
    let cx = x, cy = y, a0 = an
    const passi = 6
    for (let i = 0; i < passi; i++) {
      const nx2 = cx + Math.cos(a0) * L / passi, ny2 = cy + Math.sin(a0) * L / passi
      if (zA(nx2, ny2) < 0.15) return
      segni.push([cx, cy, nx2, ny2, w * (1 - i / passi * 0.5), 0.35 + 0.55 * zA(cx, cy)])
      // rami laterali alternati, più corti verso la punta
      if (r() < 0.7) { const lato = i % 2 ? 1 : -1, l2 = L * (0.5 - 0.06 * i) * (0.6 + r() * 0.5); piuma(nx2, ny2, a0 + lato * (Math.PI / 3 + (r() - 0.5) * 0.25), l2, w * 0.6, prof + 1) }
      cx = nx2; cy = ny2; a0 += (r() - 0.5) * 0.12
    }
  }
  const nC = modo === 'brina' ? 380 + Math.floor(r() * 200) : 160 + Math.floor(r() * 100)
  for (let i = 0; i < nC; i++) {
    const x = r() * W, y = r() * H, z = zA(x, y)
    if (z < 0.45) continue
    // verso dove il gelo cala (gradiente della zona)
    const e = S * 0.02, gx = zA(x + e, y) - zA(x - e, y), gy = zA(x, y + e) - zA(x, y - e)
    const an = Math.hypot(gx, gy) > 0.01 ? Math.atan2(-gy, -gx) + (r() - 0.5) * 0.9 : r() * 6.283
    piuma(x, y, an, S * (0.04 + r() * 0.1) * z, Math.max(0.4, S * 0.0011), 0)
  }
  // i segni si disegnano a gruppi (per opacità e spessore), in pochi tracciati: prima l'alone su un foglio sfocato una volta sola
  if (segni.length > 60000) segni.length = 60000
  const disegnaSegni = (q: CanvasRenderingContext2D, alpha: number, extra: number) => {
    q.lineCap = 'round'
    const gruppi = new Map<string, number[]>()
    for (let i = 0; i < segni.length; i++) { const [, , , , w, al] = segni[i]; const k = `${Math.round(al * 8)}|${Math.round(w * 4)}`; const a = gruppi.get(k); if (a) a.push(i); else gruppi.set(k, [i]) }
    for (const [k, idx] of gruppi) { const [a8, w4] = k.split('|').map(Number); q.globalAlpha = (a8 / 8) * alpha; q.lineWidth = w4 / 4 + extra; q.beginPath(); for (const i of idx) { const [x1, y1, x2, y2] = segni[i]; q.moveTo(x1, y1); q.lineTo(x2, y2) } q.stroke() }
    q.globalAlpha = 1
  }
  const alone = newCanvas(W, H), ag = alone.getContext('2d')!
  ag.strokeStyle = 'rgb(235,245,255)'; disegnaSegni(ag, 0.45, S * 0.002)
  g.filter = `blur(${Math.max(1, S * 0.003)}px)`; g.drawImage(alone, 0, 0); g.filter = 'none'
  g.strokeStyle = '#fff'; disegnaSegni(g, 0.9, 0)
  // grana di vetro smerigliato: puntini fitti e minuscoli, più densi dove il gelo è forte
  g.fillStyle = '#fff'
  for (let i = 0; i < (modo === 'brina' ? 30000 : 16000); i++) { const x = r() * W, y = r() * H, z = zA(x, y); if (z < 0.2 || r() > z) continue; g.globalAlpha = 0.08 + r() * 0.25; g.fillRect(x, y, 1, 1) }
  for (let i = 0; i < 400; i++) { const x = r() * W, y = r() * H, z = zA(x, y); if (z < 0.5) continue; g.globalAlpha = 0.7; g.fillRect(x, y, 1.5, 1.5) }
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
