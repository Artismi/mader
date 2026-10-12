/**
 * Generatori procedurali che leggono il soggetto (persona, testo, forma): la
 * logica è quella delle reti di TouchDesigner — l'immagine diventa dati
 * (luminanza, maschera, campo di distanze dal contorno) e i dati guidano
 * l'istanziazione di punti, righe, linee di flusso, curve di livello, blocchi.
 *
 * Tutto statico e deterministico per seme. Uscita: una tela RGBA.
 */

export interface Subject {
  w: number; h: number
  rgba: Uint8ClampedArray
  /** copertura del soggetto 0..1 */
  m: Float32Array
  /** luminanza 0..1 */
  lum: Float32Array
  /** distanza firmata dal contorno in px (negativa dentro) */
  dist: Float32Array
}

export type Bg = 'trasparente' | 'carta' | 'nero' | 'originale'
export interface GenParams {
  /** passo / densità in px (prima della scala) */
  step?: number
  /** colore dell'inchiostro; 'originale' = colori del soggetto */
  ink?: string
  bg?: Bg
  paper?: string
  /** intensità 0..1 */
  amount?: number
  seed?: number
  invert?: boolean
}

// ── preparazione ────────────────────────────────────────────────────────────

/** Distanza euclidea esatta (Felzenszwalb) da un insieme di pixel "dentro". */
function edt(inside: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e20, f = new Float64Array(Math.max(w, h)), d = new Float64Array(Math.max(w, h))
  const v = new Int32Array(Math.max(w, h)), z = new Float64Array(Math.max(w, h) + 1)
  const g = new Float64Array(w * h)
  for (let i = 0; i < w * h; i++) g[i] = inside[i] ? 0 : INF
  const pass = (n: number) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]) }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF
    }
    k = 0
    for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]] }
  }
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; pass(h); for (let y = 0; y < h; y++) g[y * w + x] = d[y] }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; pass(w); for (let x = 0; x < w; x++) g[y * w + x] = d[x] }
  const out = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) out[i] = Math.sqrt(g[i])
  return out
}

/** Immagine + maschera → dati del soggetto, al massimo `maxSide` px. */
export function prepare(img: CanvasImageSource & { width: number; height: number }, mask: CanvasImageSource & { width: number; height: number }, maxSide = 900): Subject {
  const k = Math.min(1, maxSide / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k))
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const x = cv.getContext('2d', { willReadFrequently: true })!
  x.drawImage(img, 0, 0, w, h)
  const rgba = x.getImageData(0, 0, w, h).data
  x.clearRect(0, 0, w, h); x.drawImage(mask, 0, 0, w, h)
  const ma = x.getImageData(0, 0, w, h).data
  const m = new Float32Array(w * h), lum = new Float32Array(w * h)
  const inside = new Uint8Array(w * h), outside = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    m[i] = ma[i * 4 + 3] / 255
    const a = rgba[i * 4 + 3] / 255
    // luminanza percepita, su bianco dove il pixel è trasparente
    lum[i] = (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) / 255 * a + (1 - a)
    inside[i] = m[i] > 0.5 ? 1 : 0; outside[i] = 1 - inside[i]
  }
  const dOut = edt(inside, w, h), dIn = edt(outside, w, h)
  const dist = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) dist[i] = inside[i] ? -dIn[i] : dOut[i]
  return { w, h, rgba, m, lum, dist }
}

// ── utilità ─────────────────────────────────────────────────────────────────

function rng(seed: number) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
function vnoise(x: number, y: number, seed: number) {
  const h = (i: number, j: number) => { let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 2147483647); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296 }
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v
}
const at = (S: Subject, arr: Float32Array, x: number, y: number) => {
  const xi = Math.max(0, Math.min(S.w - 1, Math.round(x))), yi = Math.max(0, Math.min(S.h - 1, Math.round(y)))
  return arr[yi * S.w + xi]
}
const colorAt = (S: Subject, x: number, y: number) => {
  const i = (Math.max(0, Math.min(S.h - 1, Math.round(y))) * S.w + Math.max(0, Math.min(S.w - 1, Math.round(x)))) * 4
  return `rgb(${S.rgba[i]},${S.rgba[i + 1]},${S.rgba[i + 2]})`
}

function surface(S: Subject, p: GenParams) {
  const c = document.createElement('canvas'); c.width = S.w; c.height = S.h
  const x = c.getContext('2d')!
  const bg = p.bg ?? 'trasparente'
  if (bg === 'carta') { x.fillStyle = p.paper ?? '#efe9de'; x.fillRect(0, 0, S.w, S.h) }
  else if (bg === 'nero') { x.fillStyle = '#0b0b0d'; x.fillRect(0, 0, S.w, S.h) }
  else if (bg === 'originale') { const id = new ImageData(new Uint8ClampedArray(S.rgba), S.w, S.h); x.putImageData(id, 0, 0) }
  return { c, x }
}
const inkOf = (p: GenParams) => p.ink ?? (p.bg === 'nero' ? '#f2f2f2' : '#111111')
/** quanto "pesa" un punto: scuro su chiaro, o chiaro su scuro */
const weight = (S: Subject, p: GenParams, x: number, y: number) => {
  const l = at(S, S.lum, x, y)
  return p.invert || p.bg === 'nero' ? l : 1 - l
}

// ── generatori ──────────────────────────────────────────────────────────────

/** Instancing: una griglia di punti dimensionati sulla luminanza, solo sul soggetto. */
export function punti(S: Subject, p: GenParams = {}) {
  const { c, x } = surface(S, p)
  const step = p.step ?? Math.max(5, Math.round(Math.min(S.w, S.h) / 70))
  const ink = inkOf(p)
  for (let y = step / 2; y < S.h; y += step) for (let xx = step / 2; xx < S.w; xx += step) {
    const m = at(S, S.m, xx, y)
    if (m < 0.5) continue
    const v = Math.max(0.06, weight(S, p, xx, y))
    const r = (step / 2) * Math.sqrt(v) * (0.9 + 0.25 * (p.amount ?? 0.6))
    x.fillStyle = ink === 'originale' ? colorAt(S, xx, y) : ink
    x.beginPath(); x.arc(xx, y, r, 0, Math.PI * 2); x.fill()
  }
  return c
}

/** Righe di scansione: ogni riga si solleva dove il soggetto è scuro (come i rilievi di un segnale). */
export function righe(S: Subject, p: GenParams = {}) {
  const { c, x } = surface(S, p)
  const step = p.step ?? Math.max(6, Math.round(S.h / 70))
  const amp = step * (2.2 + 3 * (p.amount ?? 0.6))
  const ink = inkOf(p)
  const bgFill = p.bg === 'nero' ? '#0b0b0d' : p.bg === 'carta' ? (p.paper ?? '#efe9de') : null
  x.lineJoin = 'round'; x.lineWidth = Math.max(1, step * 0.16)
  for (let row = step; row < S.h + amp; row += step) {
    const pts: [number, number][] = []
    for (let xx = 0; xx <= S.w; xx += 2) {
      const yy = Math.min(S.h - 1, row)
      const lift = at(S, S.m, xx, yy) * weight(S, p, xx, yy)
      pts.push([xx, row - lift * amp])
    }
    // le righe davanti coprono quelle dietro (come in un rilievo)
    if (bgFill) {
      x.fillStyle = bgFill; x.beginPath(); x.moveTo(0, S.h + amp)
      for (const [px, py] of pts) x.lineTo(px, py)
      x.lineTo(S.w, S.h + amp); x.closePath(); x.fill()
    }
    x.strokeStyle = ink === 'originale' ? colorAt(S, S.w / 2, Math.min(S.h - 1, row)) : ink
    x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke()
  }
  return c
}

/** Linee di flusso: un campo di rumore che vicino al contorno gira attorno al soggetto. */
export function flusso(S: Subject, p: GenParams = {}) {
  const { c, x } = surface(S, p)
  const R = rng(p.seed ?? 7)
  const step = p.step ?? Math.max(8, Math.round(Math.min(S.w, S.h) / 55))
  const ink = inkOf(p)
  const band = step * 4
  const period = Math.min(S.w, S.h) / 3
  const grad = (px: number, py: number) => [at(S, S.dist, px + 1, py) - at(S, S.dist, px - 1, py), at(S, S.dist, px, py + 1) - at(S, S.dist, px, py - 1)]
  x.lineCap = 'round'
  for (let sy = 0; sy < S.h; sy += step) for (let sx = 0; sx < S.w; sx += step) {
    let px = sx + (R() - 0.5) * step, py = sy + (R() - 0.5) * step
    if (at(S, S.dist, px, py) < 0) continue // si parte fuori dal soggetto
    const L = 18 + Math.floor(R() * 26)
    x.beginPath(); x.moveTo(px, py)
    for (let i = 0; i < L; i++) {
      let a = vnoise(px / period, py / period, p.seed ?? 7) * Math.PI * 4
      const d = at(S, S.dist, px, py)
      if (d < band) {
        // vicino al soggetto: la direzione diventa tangente al contorno
        const [gx, gy] = grad(px, py), n = Math.hypot(gx, gy) || 1
        const tang = Math.atan2(gx / n, -gy / n)
        const k = 1 - Math.max(0, d) / band
        a = a * (1 - k) + tang * k
      }
      px += Math.cos(a) * step * 0.45; py += Math.sin(a) * step * 0.45
      if (px < 0 || py < 0 || px >= S.w || py >= S.h || at(S, S.dist, px, py) < 1) break
      x.lineTo(px, py)
    }
    x.strokeStyle = ink === 'originale' ? colorAt(S, px, py) : ink
    x.globalAlpha = 0.55 + 0.45 * (p.amount ?? 0.6)
    x.lineWidth = Math.max(1, step * 0.12)
    x.stroke()
  }
  x.globalAlpha = 1
  // il soggetto, pieno, sopra il campo
  const sub = subjectLayer(S, p)
  x.drawImage(sub, 0, 0)
  return c
}

/** Curve di livello: anelli a distanza costante dal contorno, come una carta topografica. */
export function isolinee(S: Subject, p: GenParams = {}) {
  const { c, x } = surface(S, p)
  const gap = p.step ?? Math.max(6, Math.round(Math.min(S.w, S.h) / 60))
  const ink = inkOf(p)
  const g = 3 // risoluzione della griglia
  const gw = Math.ceil(S.w / g), gh = Math.ceil(S.h / g)
  // una fascia attorno al soggetto, non tutta l'immagine: 6–16 anelli
  const maxD = gap * (6 + 10 * (p.amount ?? 0.6))
  x.strokeStyle = ink === 'originale' ? '#111' : ink
  x.lineWidth = Math.max(1, gap * 0.14)
  for (let level = gap; level < maxD; level += gap) {
    x.globalAlpha = Math.max(0.12, 1 - level / maxD)
    x.beginPath()
    for (let j = 0; j < gh - 1; j++) for (let i = 0; i < gw - 1; i++) {
      const f = (ii: number, jj: number) => at(S, S.dist, ii * g, jj * g) - level
      const a = f(i, j), b = f(i + 1, j), cc = f(i + 1, j + 1), d = f(i, j + 1)
      const pts: [number, number][] = []
      const edge = (va: number, vb: number, xa: number, ya: number, xb: number, yb: number) => { if ((va < 0) !== (vb < 0)) { const t = va / (va - vb); pts.push([(xa + (xb - xa) * t) * g, (ya + (yb - ya) * t) * g]) } }
      edge(a, b, i, j, i + 1, j); edge(b, cc, i + 1, j, i + 1, j + 1); edge(cc, d, i + 1, j + 1, i, j + 1); edge(d, a, i, j + 1, i, j)
      if (pts.length >= 2) { x.moveTo(pts[0][0], pts[0][1]); x.lineTo(pts[1][0], pts[1][1]) }
      if (pts.length === 4) { x.moveTo(pts[2][0], pts[2][1]); x.lineTo(pts[3][0], pts[3][1]) }
    }
    x.stroke()
  }
  x.globalAlpha = 1
  x.drawImage(subjectLayer(S, p), 0, 0)
  return c
}

/** Eco: il contorno del soggetto ripetuto verso l'esterno, sempre più lieve. */
export function eco(S: Subject, p: GenParams = {}) {
  const gap = p.step ?? Math.max(8, Math.round(Math.min(S.w, S.h) / 40))
  return isolinee(S, { ...p, step: gap, amount: Math.min(0.35, p.amount ?? 0.3) })
}

/** Blocchi in rilievo: il soggetto diventa una città di parallelepipedi alti quanto la luminanza. */
export function blocchi(S: Subject, p: GenParams = {}) {
  const { c, x } = surface(S, p)
  const cell = p.step ?? Math.max(8, Math.round(Math.min(S.w, S.h) / 45))
  const maxH = cell * (2 + 4 * (p.amount ?? 0.6))
  const shade = (rgb: string, k: number) => { const m = rgb.match(/\d+/g)!.map(Number); return `rgb(${m.map(v => Math.round(v * k)).join(',')})` }
  for (let y = cell / 2; y < S.h; y += cell) for (let xx = cell / 2; xx < S.w; xx += cell) {
    if (at(S, S.m, xx, y) < 0.5) continue
    const hgt = maxH * Math.max(0.08, weight(S, p, xx, y))
    const top = p.ink && p.ink !== 'originale' ? p.ink : colorAt(S, xx, y)
    const topRgb = top.startsWith('#') ? `rgb(${parseInt(top.slice(1, 3), 16)},${parseInt(top.slice(3, 5), 16)},${parseInt(top.slice(5, 7), 16)})` : top
    const s = cell * 0.48, X = xx, Y = y - hgt
    // lato destro e lato sinistro più scuri, poi la faccia superiore
    x.fillStyle = shade(topRgb, 0.55); x.beginPath(); x.moveTo(X + s, Y); x.lineTo(X + s, y); x.lineTo(X, y + s * 0.5); x.lineTo(X, Y + s * 0.5); x.closePath(); x.fill()
    x.fillStyle = shade(topRgb, 0.75); x.beginPath(); x.moveTo(X - s, Y); x.lineTo(X - s, y); x.lineTo(X, y + s * 0.5); x.lineTo(X, Y + s * 0.5); x.closePath(); x.fill()
    x.fillStyle = topRgb; x.beginPath(); x.moveTo(X, Y - s * 0.5); x.lineTo(X + s, Y); x.lineTo(X, Y + s * 0.5); x.lineTo(X - s, Y); x.closePath(); x.fill()
  }
  return c
}

/** Mosaico: celle di Voronoi più fitte sui dettagli del soggetto, ognuna del suo colore medio. */
export function mosaico(S: Subject, p: GenParams = {}) {
  const { c, x } = surface(S, p)
  const R = rng(p.seed ?? 3)
  const n = Math.round(400 + 1600 * (p.amount ?? 0.6))
  const sites: [number, number][] = []
  // campionamento per importanza: dentro il soggetto, più punti dove la luminanza cambia
  for (let tries = 0; sites.length < n && tries < n * 30; tries++) {
    const px = R() * S.w, py = R() * S.h
    if (at(S, S.m, px, py) < 0.5) continue
    const gx = at(S, S.lum, px + 2, py) - at(S, S.lum, px - 2, py), gy = at(S, S.lum, px, py + 2) - at(S, S.lum, px, py - 2)
    if (R() < 0.25 + Math.min(0.75, Math.hypot(gx, gy) * 6)) sites.push([px, py])
  }
  if (!sites.length) return c
  const g = 2, gw = Math.ceil(S.w / g), gh = Math.ceil(S.h / g)
  const owner = new Int32Array(gw * gh).fill(-1)
  // ricerca del sito più vicino su una griglia di bucket
  const B = Math.max(8, Math.round(Math.sqrt((S.w * S.h) / sites.length))), bw = Math.ceil(S.w / B), bh = Math.ceil(S.h / B)
  const buckets: number[][] = Array.from({ length: bw * bh }, () => [])
  sites.forEach(([sx, sy], i) => buckets[Math.min(bh - 1, Math.floor(sy / B)) * bw + Math.min(bw - 1, Math.floor(sx / B))].push(i))
  const sum = new Float64Array(sites.length * 4)
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const px = i * g, py = j * g
    if (at(S, S.m, px, py) < 0.5) continue
    const bx = Math.floor(px / B), by = Math.floor(py / B)
    let best = -1, bd = Infinity
    for (let r = 0; r <= 3 && (best < 0 || r <= 1); r++) for (let yy = by - r; yy <= by + r; yy++) for (let xx = bx - r; xx <= bx + r; xx++) {
      if (xx < 0 || yy < 0 || xx >= bw || yy >= bh) continue
      for (const s of buckets[yy * bw + xx]) { const d = (sites[s][0] - px) ** 2 + (sites[s][1] - py) ** 2; if (d < bd) { bd = d; best = s } }
    }
    owner[j * gw + i] = best
    const k = (Math.min(S.h - 1, py) * S.w + Math.min(S.w - 1, px)) * 4
    sum[best * 4] += S.rgba[k]; sum[best * 4 + 1] += S.rgba[k + 1]; sum[best * 4 + 2] += S.rgba[k + 2]; sum[best * 4 + 3]++
  }
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const s = owner[j * gw + i]; if (s < 0) continue
    const k = sum[s * 4 + 3] || 1
    x.fillStyle = `rgb(${Math.round(sum[s * 4] / k)},${Math.round(sum[s * 4 + 1] / k)},${Math.round(sum[s * 4 + 2] / k)})`
    x.fillRect(i * g, j * g, g, g)
  }
  // bordi delle celle sottili, come piombo di vetrata
  x.fillStyle = p.bg === 'nero' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.55)'
  for (let j = 1; j < gh; j++) for (let i = 1; i < gw; i++) {
    const o = owner[j * gw + i]
    if (o >= 0 && (o !== owner[j * gw + i - 1] || o !== owner[(j - 1) * gw + i])) x.fillRect(i * g, j * g, 1, 1)
  }
  return c
}

/** Il soggetto pieno (colore originale o inchiostro), da mettere sopra i campi. */
function subjectLayer(S: Subject, p: GenParams) {
  const c = document.createElement('canvas'); c.width = S.w; c.height = S.h
  const x = c.getContext('2d')!
  const id = x.createImageData(S.w, S.h)
  const ink = inkOf(p)
  const rgb = ink !== 'originale' && ink.startsWith('#') ? [parseInt(ink.slice(1, 3), 16), parseInt(ink.slice(3, 5), 16), parseInt(ink.slice(5, 7), 16)] : null
  for (let i = 0; i < S.w * S.h; i++) {
    const a = S.m[i]
    if (rgb && p.bg !== 'originale') { id.data[i * 4] = rgb[0]; id.data[i * 4 + 1] = rgb[1]; id.data[i * 4 + 2] = rgb[2] }
    else { id.data[i * 4] = S.rgba[i * 4]; id.data[i * 4 + 1] = S.rgba[i * 4 + 1]; id.data[i * 4 + 2] = S.rgba[i * 4 + 2] }
    id.data[i * 4 + 3] = Math.round(a * 255)
  }
  x.putImageData(id, 0, 0)
  return c
}

export const GENERATORS = {
  punti: { label: 'Punti istanziati', run: punti, hint: 'una griglia di punti grandi quanto il buio del soggetto' },
  righe: { label: 'Righe in rilievo', run: righe, hint: 'righe di scansione che si sollevano sul soggetto' },
  flusso: { label: 'Linee di flusso', run: flusso, hint: 'un campo di linee che gira attorno alla sagoma' },
  isolinee: { label: 'Curve di livello', run: isolinee, hint: 'anelli topografici attorno al soggetto' },
  eco: { label: 'Eco del contorno', run: eco, hint: 'il contorno ripetuto verso l\'esterno' },
  blocchi: { label: 'Blocchi in rilievo', run: blocchi, hint: 'pixel estrusi in parallelepipedi isometrici' },
  mosaico: { label: 'Mosaico', run: mosaico, hint: 'celle di vetrata più fitte sui dettagli' },
} as const
export type GeneratorId = keyof typeof GENERATORS
