/**
 * Occhi: misure sulle immagini, senza modelli. Tutto quello che l'artista
 * "vede" di un'opera passa da qui: peso, direzioni, vuoti, tensioni, materia.
 * Le misure sono normalizzate fra 0 e 1, così criteri e voci le confrontano.
 */
import type { Features } from '../core/types'

export const N = 128

export interface Raster {
  w: number
  h: number
  /** luminanza 0..1 */
  lum: Float32Array
  /** rgb 0..1 */
  rgb: Float32Array
  /** "inchiostro": quanto il pixel si stacca dallo sfondo, 0..1 */
  ink: Float32Array
  bg: number
}

export function rasterize(src: HTMLCanvasElement | OffscreenCanvas, size = N): Raster {
  const sw = src.width, sh = src.height
  const s = size / Math.max(sw, sh)
  const w = Math.max(8, Math.round(sw * s)), h = Math.max(8, Math.round(sh * s))
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(src as CanvasImageSource, 0, 0, w, h)
  const d = ctx.getImageData(0, 0, w, h).data
  const lum = new Float32Array(w * h), rgb = new Float32Array(w * h * 3)
  for (let i = 0; i < w * h; i++) {
    const a = d[i * 4 + 3] / 255
    const r = (d[i * 4] / 255) * a, g = (d[i * 4 + 1] / 255) * a, b = (d[i * 4 + 2] / 255) * a
    rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b
    lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  // sfondo = luminanza più frequente sul bordo
  const hist = new Array(32).fill(0)
  for (let x = 0; x < w; x++) { hist[Math.min(31, Math.floor(lum[x] * 32))]++; hist[Math.min(31, Math.floor(lum[(h - 1) * w + x] * 32))]++ }
  for (let y = 0; y < h; y++) { hist[Math.min(31, Math.floor(lum[y * w] * 32))]++; hist[Math.min(31, Math.floor(lum[y * w + w - 1] * 32))]++ }
  const bg = (hist.indexOf(Math.max(...hist)) + 0.5) / 32
  const ink = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) ink[i] = Math.min(1, Math.abs(lum[i] - bg) * 2.2)
  return { w, h, lum, rgb, ink, bg }
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d > 1e-6) {
    if (mx === r) h = ((g - b) / d) % 6
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6; if (h < 0) h += 1
  }
  return [h, mx === 0 ? 0 : d / mx, mx]
}

/** componenti connesse dell'inchiostro su griglia 32×32: punti, linee, superfici (Kandinsky) */
function elements(R: Raster) {
  const G = 32, cell = new Uint8Array(G * G)
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    let s = 0, n = 0
    const x0 = Math.floor(gx * R.w / G), x1 = Math.floor((gx + 1) * R.w / G)
    const y0 = Math.floor(gy * R.h / G), y1 = Math.floor((gy + 1) * R.h / G)
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += R.ink[y * R.w + x]; n++ }
    cell[gy * G + gx] = n && s / n > 0.25 ? 1 : 0
  }
  const seen = new Uint8Array(G * G)
  let points = 0, lines = 0, planes = 0, total = 0
  const stack: number[] = []
  for (let i = 0; i < G * G; i++) {
    if (!cell[i] || seen[i]) continue
    let size = 0, minx = G, maxx = 0, miny = G, maxy = 0
    stack.push(i); seen[i] = 1
    while (stack.length) {
      const j = stack.pop()!, x = j % G, y = (j / G) | 0
      size++; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue
        const k = ny * G + nx
        if (cell[k] && !seen[k]) { seen[k] = 1; stack.push(k) }
      }
    }
    total++
    const bw = maxx - minx + 1, bh = maxy - miny + 1
    const fill = size / (bw * bh), aspect = Math.max(bw, bh) / Math.min(bw, bh)
    if (size <= 3) points++
    else if (aspect > 3 || fill < 0.3) lines++
    else planes++
  }
  const t = Math.max(1, total)
  return { points: points / t, lines: lines / t, planes: planes / t, count: Math.min(1, total / 60) }
}

/** palette: k-medie su pochi campioni */
export function palette(R: Raster, k = 5): string[] {
  const pts: number[][] = []
  const step = Math.max(1, Math.floor((R.w * R.h) / 900))
  for (let i = 0; i < R.w * R.h; i += step) pts.push([R.rgb[i * 3], R.rgb[i * 3 + 1], R.rgb[i * 3 + 2]])
  let cent = Array.from({ length: k }, (_, i) => pts[Math.floor((i + 0.5) * pts.length / k)].slice())
  for (let it = 0; it < 8; it++) {
    const sum = cent.map(() => [0, 0, 0, 0])
    for (const p of pts) {
      let bi = 0, bd = Infinity
      cent.forEach((c, i) => { const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2; if (d < bd) { bd = d; bi = i } })
      sum[bi][0] += p[0]; sum[bi][1] += p[1]; sum[bi][2] += p[2]; sum[bi][3]++
    }
    cent = sum.map((s, i) => s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : cent[i])
  }
  const hex = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
  return cent.map(c => '#' + hex(c[0]) + hex(c[1]) + hex(c[2]))
}

/** tutte le misure di un'immagine */
export function measure(R: Raster): Features {
  const { w, h, lum, ink, rgb } = R
  const n = w * h
  let sum = 0, sum2 = 0, inkSum = 0, cx = 0, cy = 0, sat = 0
  const lh = new Array(16).fill(0)
  const hueBins = new Array(12).fill(0)
  for (let i = 0; i < n; i++) {
    const l = lum[i]; sum += l; sum2 += l * l
    lh[Math.min(15, Math.floor(l * 16))]++
    const k = ink[i]; inkSum += k
    cx += (i % w) * k; cy += Math.floor(i / w) * k
    const [hh, s, v] = rgbToHsv(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2])
    sat += s
    if (s > 0.2 && v > 0.15) hueBins[Math.min(11, Math.floor(hh * 12))]++
  }
  const mean = sum / n
  const contrast = Math.sqrt(Math.max(0, sum2 / n - mean * mean)) * 2
  const density = inkSum / n
  cx = inkSum ? cx / inkSum / (w - 1) : 0.5
  cy = inkSum ? cy / inkSum / (h - 1) : 0.5
  let entropy = 0
  for (const c of lh) if (c) { const p = c / n; entropy -= p * Math.log2(p) }

  // bordi e direzioni (Sobel)
  const ori = new Array(4).fill(0)
  let edge = 0
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    const gx = lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1] - lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1]
    const gy = lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1] - lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1]
    const m = Math.hypot(gx, gy)
    if (m < 0.08) continue
    edge += m
    // direzione del segno = perpendicolare al gradiente
    let a = Math.atan2(gy, gx) + Math.PI / 2
    a = ((a % Math.PI) + Math.PI) % Math.PI
    ori[Math.round(a / (Math.PI / 4)) % 4] += m
  }
  const oriTot = ori.reduce((a, b) => a + b, 0) || 1
  edge = Math.min(1, edge / n / 0.6)

  // simmetrie
  let symH = 0, symV = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w / 2; x++) symH += Math.abs(ink[y * w + x] - ink[y * w + (w - 1 - x)])
  for (let y = 0; y < h / 2; y++) for (let x = 0; x < w; x++) symV += Math.abs(ink[y * w + x] - ink[(h - 1 - y) * w + x])
  const norm = (n / 2) * Math.max(0.05, density)
  symH = 1 - Math.min(1, symH / norm / 2)
  symV = 1 - Math.min(1, symV / norm / 2)

  // vuoto: celle 8×8 quasi senza inchiostro
  let empty = 0
  const G = 8
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    let s = 0, c = 0
    for (let y = Math.floor(gy * h / G); y < Math.floor((gy + 1) * h / G); y++)
      for (let x = Math.floor(gx * w / G); x < Math.floor((gx + 1) * w / G); x++) { s += ink[y * w + x]; c++ }
    if (c && s / c < 0.05) empty++
  }

  // peso per quadranti, equilibrio, terzi
  const q = [0, 0, 0, 0]
  for (let i = 0; i < n; i++) q[((i % w) < w / 2 ? 0 : 1) + (Math.floor(i / w) < h / 2 ? 0 : 2)] += ink[i]
  const qt = q.reduce((a, b) => a + b, 0) || 1
  const qmax = Math.max(...q) / qt
  const thirds = Math.min(...[1 / 3, 2 / 3].flatMap(t => [Math.abs(cx - t), Math.abs(cy - t)])) * 6

  // compressibilità: entropia delle differenze quantizzate tra pixel vicini
  const dh = new Map<number, number>()
  for (let i = 1; i < n; i++) { const d = Math.round((lum[i] - lum[i - 1]) * 16); dh.set(d, (dh.get(d) ?? 0) + 1) }
  let dEnt = 0
  for (const c of dh.values()) { const p = c / n; dEnt -= p * Math.log2(p) }

  // forma contro rumore (in spirito Machado–Cardoso): quanta struttura sopravvive a una sfocatura.
  // le forme vere restano, la grana e il pattern fitto spariscono.
  const blur = (src: Float32Array) => {
    const out = new Float32Array(n)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let t = 0, c = 0
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
        t += src[yy * w + xx]; c++
      }
      out[y * w + x] = t / c
    }
    return out
  }
  const bl = blur(lum)
  const dh2 = new Map<number, number>()
  for (let i = 1; i < n; i++) { const d = Math.round((bl[i] - bl[i - 1]) * 64); dh2.set(d, (dh2.get(d) ?? 0) + 1) }
  let bEnt = 0
  for (const c of dh2.values()) { const p = c / n; bEnt -= p * Math.log2(p) }
  let fine = 0, coarse = 0
  for (let i = 0; i < n; i++) { fine += Math.abs(lum[i] - bl[i]); coarse += Math.abs(bl[i] - mean) }
  const forma = coarse / (coarse + fine * 2 + 1e-6)

  const hueUsed = hueBins.filter(c => c > n * 0.01).length
  const el = elements(R)

  return {
    luminosita: mean,
    contrasto: Math.min(1, contrast),
    densita: Math.min(1, density * 1.6),
    bordi: edge,
    orizzontali: ori[0] / oriTot,
    diagonali: (ori[1] + ori[3]) / oriTot,
    verticali: ori[2] / oriTot,
    simmetria: Math.max(symH, symV),
    vuoto: empty / (G * G),
    centroX: cx,
    centroY: cy,
    squilibrio: Math.min(1, Math.hypot(cx - 0.5, cy - 0.5) * 2.5),
    peso_quadrante: Math.min(1, (qmax - 0.25) / 0.75),
    terzi: 1 - Math.min(1, thirds),
    entropia: entropy / 4,
    complessita: Math.min(1, dEnt / 5),
    saturazione: sat / n,
    tinte: hueUsed / 12,
    punti: el.points,
    linee: el.lines,
    superfici: el.planes,
    elementi: el.count,
    forma: Math.max(0, Math.min(1, forma)),
    rumore: Math.max(0, Math.min(1, (fine / n) * 6 * (1 - forma))),
    struttura_tonale: Math.min(1, bEnt / 6),
  }
}

export const FEATURE_KEYS = [
  'luminosita', 'contrasto', 'densita', 'bordi', 'orizzontali', 'diagonali', 'verticali', 'simmetria', 'vuoto',
  'centroX', 'centroY', 'squilibrio', 'peso_quadrante', 'terzi', 'entropia', 'complessita', 'saturazione', 'tinte',
  'punti', 'linee', 'superfici', 'elementi', 'forma', 'rumore',
] as const

export function featureDistance(a: Features, b: Features) {
  let s = 0
  for (const k of FEATURE_KEYS) s += ((a[k] ?? 0) - (b[k] ?? 0)) ** 2
  return Math.sqrt(s / FEATURE_KEYS.length)
}
