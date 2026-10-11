/**
 * Primitive raster del laboratorio grafico: maschere (canale alfa), distorsioni
 * e trattamenti di stampa. Tutto lavora su pixel veri, ad alta risoluzione, e
 * tutto è deterministico: stessa ricetta + stesso seme = stessa immagine.
 *
 * Convenzione: una Mask è un'immagine a un canale 0..255 (copertura dell'inchiostro).
 * Le ricette disegnano tipografia e forme in maschere, le deformano, e solo alla
 * fine le "stampano" con un inchiostro sulla carta.
 */
import { createNoise2D, createNoise3D } from 'simplex-noise'

export interface Mask { w: number; h: number; a: Uint8ClampedArray }
export type Ctx = CanvasRenderingContext2D

// ─── caso & rumore ───────────────────────────────────────────────────────────

export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export type Rnd = ReturnType<typeof rng>
export const pick = <T,>(r: Rnd, arr: readonly T[]) => arr[Math.floor(r() * arr.length)]
export const range = (r: Rnd, a: number, b: number) => a + r() * (b - a)

export function noise2(seed: number) { return createNoise2D(rng(seed)) }
export function noise3(seed: number) { return createNoise3D(rng(seed)) }

/** rumore frattale (fBm) in 0..1 */
export function fbm(n: (x: number, y: number) => number, x: number, y: number, oct = 4) {
  let v = 0, amp = 0.5, f = 1, norm = 0
  for (let i = 0; i < oct; i++) { v += amp * n(x * f, y * f); norm += amp; amp *= 0.5; f *= 2.03 }
  return v / norm * 0.5 + 0.5
}

const clamp = (v: number, a = 0, b = 255) => (v < a ? a : v > b ? b : v)
export const smoothstep = (e0: number, e1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t) }

// ─── canvas & maschere ───────────────────────────────────────────────────────

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  return { c, ctx }
}

export const newMask = (w: number, h: number): Mask => ({ w, h, a: new Uint8ClampedArray(w * h) })

/** disegna con le API canvas (fill bianco/qualsiasi colore) e restituisce l'alfa come maschera */
export function drawMask(w: number, h: number, draw: (ctx: Ctx) => void): Mask {
  const { ctx } = makeCanvas(w, h)
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'
  draw(ctx)
  const d = ctx.getImageData(0, 0, w, h).data
  const m = newMask(w, h)
  for (let i = 0, j = 3; i < m.a.length; i++, j += 4) m.a[i] = d[j]
  return m
}

export function maskToCanvas(m: Mask, color: string, alpha = 1) {
  const { c, ctx } = makeCanvas(m.w, m.h)
  const img = ctx.createImageData(m.w, m.h)
  const [r, g, b] = hexRgb(color)
  const d = img.data
  for (let i = 0, j = 0; i < m.a.length; i++, j += 4) { d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = m.a[i] * alpha }
  ctx.putImageData(img, 0, 0)
  return c
}

export function hexRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return [0, 0, 0]
  const v = parseInt(m[1], 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

/** campionamento bilineare (fuori dai bordi = 0) */
function sample(m: Mask, x: number, y: number) {
  if (x < 0 || y < 0 || x > m.w - 1 || y > m.h - 1) return 0
  const x0 = x | 0, y0 = y | 0, x1 = Math.min(x0 + 1, m.w - 1), y1 = Math.min(y0 + 1, m.h - 1)
  const fx = x - x0, fy = y - y0, a = m.a
  const top = a[y0 * m.w + x0] * (1 - fx) + a[y0 * m.w + x1] * fx
  const bot = a[y1 * m.w + x0] * (1 - fx) + a[y1 * m.w + x1] * fx
  return top * (1 - fy) + bot * fy
}

export function combine(a: Mask, b: Mask, op: 'max' | 'min' | 'sub' | 'xor') {
  const o = newMask(a.w, a.h)
  for (let i = 0; i < o.a.length; i++) {
    const x = a.a[i], y = b.a[i]
    o.a[i] = op === 'max' ? Math.max(x, y) : op === 'min' ? Math.min(x, y) : op === 'sub' ? x - y : Math.abs(x - y)
  }
  return o
}

// ─── tipografia ──────────────────────────────────────────────────────────────

export interface Face { family: string; weight: number; italic?: boolean; upper?: boolean; track?: number }

export const fontCss = (f: Face, size: number) => `${f.italic ? 'italic ' : ''}${f.weight} ${size}px "${f.family}"`

/** corpo che porta il testo esattamente alla larghezza voluta (misura reale dei glifi) */
export function fitSize(ctx: Ctx, text: string, f: Face, width: number) {
  ctx.font = fontCss(f, 100)
  setTrack(ctx, f, 100)
  const w = ctx.measureText(text).width
  return w > 0 ? (100 * width) / w : 100
}

function setTrack(ctx: Ctx, f: Face, size: number) {
  const c = ctx as Ctx & { letterSpacing?: string }
  if ('letterSpacing' in c) c.letterSpacing = `${(f.track ?? 0) * size}px`
}

/** testo con il suo corpo, tracking e allineamento; restituisce le metriche reali */
export function text(ctx: Ctx, s: string, x: number, y: number, f: Face, size: number, align: CanvasTextAlign = 'left', mode: 'fill' | 'stroke' = 'fill') {
  const str = f.upper ? s.toUpperCase() : s
  ctx.font = fontCss(f, size)
  setTrack(ctx, f, size)
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  if (mode === 'fill') ctx.fillText(str, x, y); else ctx.strokeText(str, x, y)
  const m = ctx.measureText(str)
  return { w: m.width, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent }
}

/** bounding box reale dell'inchiostro di una maschera */
export function inkBox(m: Mask, thr = 8) {
  let x0 = m.w, y0 = m.h, x1 = -1, y1 = -1
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (m.a[y * m.w + x] > thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 }
}

// ─── distorsioni ─────────────────────────────────────────────────────────────

/**
 * Slit-scan: dalla riga (o colonna) `at` in poi ogni pixel ripete quella riga,
 * per `len` pixel. È l'effetto "lettere che colano/si stirano".
 */
export function stretch(m: Mask, axis: 'down' | 'up' | 'right' | 'left', at: number, len: number) {
  const o = { w: m.w, h: m.h, a: new Uint8ClampedArray(m.a) }
  at = Math.round(at)
  if (axis === 'down' || axis === 'up') {
    const dir = axis === 'down' ? 1 : -1
    const src = at * m.w
    for (let k = 1; k <= len; k++) {
      const y = at + k * dir
      if (y < 0 || y >= m.h) break
      o.a.set(m.a.subarray(src, src + m.w), y * m.w)
    }
    // dopo la colata il resto dell'originale scorre via
    for (let y = at + (len + 1) * dir; y >= 0 && y < m.h; y += dir) {
      const sy = y - (len + 1) * dir
      if (sy < 0 || sy >= m.h) { o.a.fill(0, y * m.w, y * m.w + m.w); continue }
      o.a.set(m.a.subarray(sy * m.w, sy * m.w + m.w), y * m.w)
    }
  } else {
    const dir = axis === 'right' ? 1 : -1
    for (let y = 0; y < m.h; y++) {
      const row = y * m.w, v = m.a[row + at]
      for (let k = 1; k <= len; k++) { const x = at + k * dir; if (x < 0 || x >= m.w) break; o.a[row + x] = v }
      for (let x = at + (len + 1) * dir; x >= 0 && x < m.w; x += dir) {
        const sx = x - (len + 1) * dir
        o.a[row + x] = sx >= 0 && sx < m.w ? m.a[row + sx] : 0
      }
    }
  }
  return o
}

/** sposta ogni pixel: f restituisce da dove campionare */
export function remap(m: Mask, f: (x: number, y: number) => [number, number]) {
  const o = newMask(m.w, m.h)
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const [sx, sy] = f(x, y)
    o.a[y * m.w + x] = sample(m, sx, sy)
  }
  return o
}

/** fette orizzontali (o verticali) spostate: glitch da scanner */
export function slices(m: Mask, r: Rnd, count: number, maxShift: number, vertical = false) {
  const o = newMask(m.w, m.h)
  const len = vertical ? m.w : m.h
  const cuts: number[] = [0]
  for (let i = 0; i < count; i++) cuts.push(Math.floor(r() * len))
  cuts.push(len); cuts.sort((a, b) => a - b)
  for (let i = 0; i < cuts.length - 1; i++) {
    const big = r() < 0.18
    const sh = Math.round((r() - 0.5) * 2 * maxShift * (big ? 2.2 : r() < 0.5 ? 0.15 : 0.6))
    for (let k = cuts[i]; k < cuts[i + 1]; k++) {
      if (!vertical) {
        const row = k * m.w
        for (let x = 0; x < m.w; x++) { const sx = x - sh; o.a[row + x] = sx >= 0 && sx < m.w ? m.a[row + sx] : 0 }
      } else {
        for (let y = 0; y < m.h; y++) { const sy = y - sh; o.a[y * m.w + k] = sy >= 0 && sy < m.h ? m.a[sy * m.w + k] : 0 }
      }
    }
  }
  return o
}

/** striscia rettangolare → disco (coordinate polari): la x diventa l'angolo, la y il raggio */
export function polar(m: Mask, out: number, r0 = 0.08, twist = 0) {
  const o = newMask(out, out)
  const c = out / 2, R = out / 2
  for (let y = 0; y < out; y++) for (let x = 0; x < out; x++) {
    const dx = x - c, dy = y - c, rr = Math.hypot(dx, dy) / R
    if (rr > 1 || rr < r0) continue
    let th = Math.atan2(dy, dx) / (Math.PI * 2) + 0.25
    th += twist * rr
    th -= Math.floor(th)
    const sy = ((rr - r0) / (1 - r0)) * (m.h - 1)
    o.a[y * out + x] = sample(m, th * (m.w - 1), m.h - 1 - sy)
  }
  return o
}

/** sfocatura + soglia morbida: le forme si fondono come liquido (metaball) */
export function liquid(m: Mask, blur: number, thr = 0.5, soft = 0.06) {
  const { c } = (() => { const k = makeCanvas(m.w, m.h); k.ctx.drawImage(maskToCanvas(m, '#ffffff'), 0, 0); return k })()
  const k2 = makeCanvas(m.w, m.h)
  k2.ctx.filter = `blur(${blur}px)`
  k2.ctx.drawImage(c, 0, 0)
  const d = k2.ctx.getImageData(0, 0, m.w, m.h).data
  const o = newMask(m.w, m.h)
  for (let i = 0, j = 3; i < o.a.length; i++, j += 4) o.a[i] = smoothstep(thr - soft, thr + soft, d[j] / 255) * 255
  return o
}

/** sfocatura semplice (per ombre, aloni, fonti di grigio) */
export function blurMask(m: Mask, blur: number) {
  const k = makeCanvas(m.w, m.h)
  k.ctx.filter = `blur(${blur}px)`
  k.ctx.drawImage(maskToCanvas(m, '#ffffff'), 0, 0)
  const d = k.ctx.getImageData(0, 0, m.w, m.h).data
  const o = newMask(m.w, m.h)
  for (let i = 0, j = 3; i < o.a.length; i++, j += 4) o.a[i] = d[j]
  return o
}

/** specchio a caleidoscopio: n spicchi attorno al centro */
export function kaleido(m: Mask, n: number, rot = 0) {
  const c = m.w / 2, cy = m.h / 2, seg = (Math.PI * 2) / n
  return remap(m, (x, y) => {
    const dx = x - c, dy = y - cy
    const r = Math.hypot(dx, dy)
    let a = Math.atan2(dy, dx) - rot
    a = ((a % seg) + seg) % seg
    if (a > seg / 2) a = seg - a
    return [c + Math.cos(a + rot) * r, cy + Math.sin(a + rot) * r]
  })
}

// ─── trattamenti di stampa ───────────────────────────────────────────────────

const BAYER8 = (() => {
  const b = [[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]]
  return b.map(row => row.map(v => (v + 0.5) / 64))
})()

/** dithering 1-bit a pixel grossi: Bayer ordinato o Atkinson (diffusione d'errore, Mac anni 80) */
export function dither(gray: Mask, px: number, mode: 'bayer' | 'atkinson' = 'bayer') {
  const W = Math.ceil(gray.w / px), H = Math.ceil(gray.h / px)
  const g = new Float32Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y * W + x] = sample(gray, Math.min(gray.w - 1, x * px + px / 2), Math.min(gray.h - 1, y * px + px / 2)) / 255
  const bit = new Uint8Array(W * H)
  if (mode === 'bayer') {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) bit[y * W + x] = g[y * W + x] > BAYER8[y & 7][x & 7] ? 1 : 0
  } else {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, old = g[i], nw = old > 0.5 ? 1 : 0, err = (old - nw) / 8
      bit[i] = nw
      const spread = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]]
      for (const [dx, dy] of spread) { const xx = x + dx, yy = y + dy; if (xx >= 0 && xx < W && yy < H) g[yy * W + xx] += err }
    }
  }
  const o = newMask(gray.w, gray.h)
  for (let y = 0; y < gray.h; y++) { const by = (y / px) | 0; for (let x = 0; x < gray.w; x++) o.a[y * gray.w + x] = bit[by * W + ((x / px) | 0)] * 255 }
  return o
}

/** retino da stampa: punti (o linee) ruotati la cui area segue il grigio */
export function halftone(gray: Mask, cell: number, angleDeg: number, shape: 'dot' | 'square' | 'line' = 'dot', gain = 1) {
  const a = (angleDeg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a)
  const diag = Math.hypot(gray.w, gray.h)
  return drawMask(gray.w, gray.h, ctx => {
    ctx.fillStyle = '#fff'
    for (let v = -diag; v < diag; v += cell) for (let u = -diag; u < diag; u += cell) {
      const x = gray.w / 2 + u * ca - v * sa, y = gray.h / 2 + u * sa + v * ca
      if (x < -cell || y < -cell || x > gray.w + cell || y > gray.h + cell) continue
      const g = Math.min(1, (sample(gray, Math.max(0, Math.min(gray.w - 1, x)), Math.max(0, Math.min(gray.h - 1, y))) / 255) * gain)
      if (g < 0.02) continue
      if (shape === 'dot') { ctx.beginPath(); ctx.arc(x, y, Math.sqrt(g) * cell * 0.62, 0, Math.PI * 2); ctx.fill() }
      else if (shape === 'square') { const s = Math.sqrt(g) * cell * 0.92; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore() }
      else { const t = g * cell * 0.95; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillRect(-cell / 2 - 0.5, -t / 2, cell + 1, t); ctx.restore() }
    }
  })
}

/**
 * Fotocopia: soglia rumorosa (il toner non copre uniforme), bordi mangiati,
 * puntini di sporco e strisce verticali del rullo.
 */
export function xerox(m: Mask, seed: number, amount = 1) {
  const n = noise2(seed), r = rng(seed + 9)
  const o = newMask(m.w, m.h)
  const streaks: number[] = []
  for (let i = 0; i < 6; i++) streaks.push(r() * m.w)
  const s = 1 / Math.max(1, m.w / 700)
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const i = y * m.w + x
    let v = m.a[i] / 255
    const grain = n(x * 0.9 * s, y * 0.9 * s) * 0.5 + n(x * 0.08 * s, y * 0.08 * s) * 0.5
    v = v + grain * 0.28 * amount
    let ink = v > 0.55 ? 1 : 0
    // strisce del rullo e polvere
    for (const sx of streaks) if (Math.abs(x - sx) < 1.2 && n(sx, y * 0.004 * s) > 0.35) ink = 1
    if (r() < 0.00025 * amount) ink = 1
    o.a[i] = ink * 255
  }
  return o
}

// ─── composizione finale ─────────────────────────────────────────────────────

export interface Ink { mask: Mask; color: string; dx?: number; dy?: number; blend?: GlobalCompositeOperation; alpha?: number }

/**
 * Stampa le maschere sulla carta. Con blend 'multiply' gli inchiostri si
 * sovrappongono come in Risograph; dx/dy simulano il fuori registro.
 */
export function print(w: number, h: number, paper: string | null, inks: Ink[], grainAmt = 0, seed = 1) {
  const { c, ctx } = makeCanvas(w, h)
  if (paper) { ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h) }
  for (const k of inks) {
    ctx.globalCompositeOperation = paper ? (k.blend ?? 'source-over') : 'source-over'
    ctx.drawImage(maskToCanvas(k.mask, k.color, k.alpha ?? 1), k.dx ?? 0, k.dy ?? 0)
  }
  ctx.globalCompositeOperation = 'source-over'
  if (grainAmt > 0) grain(ctx, w, h, grainAmt, seed)
  return c
}

/** grana fotografica monocromatica, solo dove c'è già colore */
export function grain(ctx: Ctx, w: number, h: number, amt: number, seed: number) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data, r = rng(seed * 31 + 7)
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    const g = (r() + r() - 1) * amt * 255
    d[i] = clamp(d[i] + g); d[i + 1] = clamp(d[i + 1] + g); d[i + 2] = clamp(d[i + 2] + g)
  }
  ctx.putImageData(img, 0, 0)
}

/** ordina i pixel per luminosità lungo le colonne, solo nei tratti sopra soglia */
export function pixelSort(ctx: Ctx, w: number, h: number, lo: number, hi: number, vertical = true) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data
  const L = (i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  const outer = vertical ? w : h, inner = vertical ? h : w
  const idx = (o: number, k: number) => (vertical ? k * w + o : o * w + k) * 4
  for (let o = 0; o < outer; o++) {
    let k = 0
    while (k < inner) {
      while (k < inner && !(L(idx(o, k)) >= lo && L(idx(o, k)) <= hi)) k++
      const s = k
      while (k < inner && L(idx(o, k)) >= lo && L(idx(o, k)) <= hi) k++
      if (k - s > 2) {
        const run: [number, number, number, number, number][] = []
        for (let q = s; q < k; q++) { const i = idx(o, q); run.push([L(i), d[i], d[i + 1], d[i + 2], d[i + 3]]) }
        run.sort((a, b) => a[0] - b[0])
        for (let q = s; q < k; q++) { const i = idx(o, q), p = run[q - s]; d[i] = p[1]; d[i + 1] = p[2]; d[i + 2] = p[3]; d[i + 3] = p[4] }
      }
    }
  }
  ctx.putImageData(img, 0, 0)
}
