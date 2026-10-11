/**
 * Generatore procedurale di asset — adesivi, badge, sparkle Y2K, guilloche,
 * superformula, Truchet, testo a matrice di punti, scarabocchi, cornici, simboli.
 *
 * Ogni generatore è una funzione pura e deterministica: stessi parametri + stesso
 * seme → stesso disegno. Restituisce un SVG autonomo (viewBox fisso) che serve sia
 * per l'anteprima nel pannello (data URI) sia per l'inserimento nel canvas
 * (fabric.loadSVGFromString → oggetti vettoriali modificabili).
 *
 * Solo primitive che il parser SVG di Fabric gestisce bene: path, circle, rect,
 * text (con transform), linearGradient/radialGradient, stroke-dasharray.
 * Niente <filter>, <mask>, <clipPath> o <textPath>.
 */

// ─── TIPI ─────────────────────────────────────────────────────────────────────

export type GenParam =
  | { key: string; label: string; type: 'range'; min: number; max: number; step?: number; def: number }
  | { key: string; label: string; type: 'color'; def: string }
  | { key: string; label: string; type: 'toggle'; def: boolean }
  | { key: string; label: string; type: 'select'; options: string[]; def: number }
  | { key: string; label: string; type: 'text'; def: string }

export type GenValue = number | string | boolean
export type GenValues = Record<string, GenValue>

export interface GenDef {
  id: string
  label: string
  cat: string
  hint: string
  params: GenParam[]
  make: (p: GenValues, seed: number) => string
}

export interface GenPalette { id: string; label: string; c1: string; c2: string; c3: string; ink: string }

/** Palette rapide: sostituiscono c1/c2/c3/ink in qualunque generatore. */
export const GEN_PALETTES: GenPalette[] = [
  { id: 'acido', label: 'Acido', c1: '#d4ff3a', c2: '#ff3ea5', c3: '#3a5bff', ink: '#111111' },
  { id: 'y2k', label: 'Y2K cromo', c1: '#c9d1e0', c2: '#8fd3ff', c3: '#ff9ce6', ink: '#1a1a2e' },
  { id: 'riso', label: 'Riso', c1: '#ff48b0', c2: '#0078bf', c3: '#ffe800', ink: '#1b1b1b' },
  { id: 'bauhaus', label: 'Bauhaus', c1: '#e63946', c2: '#1d3557', c3: '#f1c40f', ink: '#111111' },
  { id: 'pastello', label: 'Pastello', c1: '#ffd6e0', c2: '#c1f0dc', c3: '#d6d1ff', ink: '#3a3a5a' },
  { id: 'retro', label: 'Retro 70', c1: '#e76f51', c2: '#f4a261', c3: '#2a9d8f', ink: '#264653' },
  { id: 'neon', label: 'Notte neon', c1: '#00f0ff', c2: '#ff00e5', c3: '#7cff00', ink: '#0a0a14' },
  { id: 'mono', label: 'Mono', c1: '#111111', c2: '#7a7a7a', c3: '#ffffff', ink: '#111111' },
]

export const GEN_FONTS = ['Inter', 'Syne', 'Space Mono', 'Georgia', 'Impact', 'Arial Black', 'Courier New']

// ─── UTILITÀ ──────────────────────────────────────────────────────────────────

/** PRNG mulberry32: veloce, deterministico, sufficiente per la grafica. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Pt = [number, number]
const f = (n: number) => Math.round(n * 100) / 100
const TAU = Math.PI * 2
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const num = (p: GenValues, k: string) => Number(p[k])
const str = (p: GenValues, k: string) => String(p[k] ?? '')
const bool = (p: GenValues, k: string) => p[k] === true || p[k] === 1 || p[k] === 'true'
const font = (p: GenValues) => GEN_FONTS[num(p, 'font')] ?? 'Inter'

function svg(w: number, h: number, body: string, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`
}

const poly = (pts: Pt[], close = true) =>
  pts.map((q, i) => `${i ? 'L' : 'M'} ${f(q[0])} ${f(q[1])}`).join(' ') + (close ? ' Z' : '')

/** Catmull-Rom → Bézier cubiche: curva morbida che passa per tutti i punti. */
function smooth(pts: Pt[], closed: boolean, tension = 1) {
  const n = pts.length
  if (n < 3) return poly(pts, closed)
  const at = (i: number) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    const k = tension / 6
    d += ` C ${f(p1[0] + (p2[0] - p0[0]) * k)} ${f(p1[1] + (p2[1] - p0[1]) * k)} ${f(p2[0] - (p3[0] - p1[0]) * k)} ${f(p2[1] - (p3[1] - p1[1]) * k)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + (closed ? ' Z' : '')
}

const circ = (cx: number, cy: number, r: number) =>
  `M ${f(cx - r)} ${f(cy)} a ${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a ${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0 Z`

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M ${f(cx - rx)} ${f(cy)} a ${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0 a ${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0 Z`

/** Schiarisce/scurisce un colore esadecimale (t in -1..1). */
export function tone(hex: string, t: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const v = parseInt(m[1], 16)
  const ch = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map(c =>
    Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t)))
  return '#' + ch.map(c => c.toString(16).padStart(2, '0')).join('')
}

function luma(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return 0.5
  const v = parseInt(m[1], 16)
  return (0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255
}

function mixHex(a: string, b: string, t: number) {
  const pa = /^#?([0-9a-f]{6})$/i.exec(a), pb = /^#?([0-9a-f]{6})$/i.exec(b)
  if (!pa || !pb) return a
  const va = parseInt(pa[1], 16), vb = parseInt(pb[1], 16)
  const ch = [16, 8, 0].map(s => Math.round(((va >> s) & 255) * (1 - t) + ((vb >> s) & 255) * t))
  return '#' + ch.map(v => v.toString(16).padStart(2, '0')).join('')
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/**
 * Strati "adesivo" sotto una forma: ombra morbida simulata (copia scura sfalsata)
 * + bordo bianco di fustella (stroke spesso con giunzioni arrotondate).
 */
function stickerUnder(d: string, border: number, shadow: boolean, borderColor = '#ffffff') {
  let out = ''
  if (shadow) {
    const sw = border * 2 + 2
    out += `<path d="${d}" transform="translate(5 8)" fill="#000000" fill-opacity="0.22" stroke="#000000" stroke-opacity="0.22" stroke-width="${sw}" stroke-linejoin="round"/>`
  }
  if (border > 0) out += `<path d="${d}" fill="${borderColor}" stroke="${borderColor}" stroke-width="${border * 2}" stroke-linejoin="round"/>`
  return out
}

/** Testo multilinea centrato ('|' o a-capo separano le righe). */
function centerText(text: string, cx: number, cy: number, size: number, fill: string, family: string, weight = 900, spacing = 0) {
  const lines = text.split(/\||\n/).map(s => s.trim()).filter(Boolean)
  if (!lines.length) return ''
  const lh = size * 1.02
  const top = cy - ((lines.length - 1) * lh) / 2 + size * 0.35
  return lines.map((ln, i) =>
    `<text x="${f(cx)}" y="${f(top + i * lh)}" text-anchor="middle" font-family="${esc(family)}" font-weight="${weight}" font-size="${f(size)}"${spacing ? ` letter-spacing="${spacing}"` : ''} fill="${fill}">${esc(ln)}</text>`
  ).join('')
}

/** Testo disposto lungo un cerchio, un <text> ruotato per carattere. */
function circleText(text: string, cx: number, cy: number, r: number, size: number, fill: string, family: string, startDeg = -90, sweepDeg = 360) {
  const chars = [...text]
  if (!chars.length) return ''
  const full = Math.abs(sweepDeg) >= 359
  const step = sweepDeg / (full ? chars.length : Math.max(1, chars.length - 1))
  const start = full ? startDeg : startDeg - sweepDeg / 2
  return chars.map((ch, i) => {
    if (ch === ' ') return ''
    const a = start + i * step
    const rad = (a * Math.PI) / 180
    const x = cx + Math.cos(rad) * r, y = cy + Math.sin(rad) * r
    return `<text x="0" y="${f(size * 0.35)}" text-anchor="middle" transform="translate(${f(x)} ${f(y)}) rotate(${f(a + 90)})" font-family="${esc(family)}" font-weight="800" font-size="${f(size)}" fill="${fill}">${esc(ch)}</text>`
  }).join('')
}

/** Gradiente "cromo" a bande, ricavato dal colore base. */
function chromeGradient(id: string, base: string, angle = 90) {
  const rad = (angle * Math.PI) / 180
  const x2 = 0.5 + Math.cos(rad) * 0.5, y2 = 0.5 + Math.sin(rad) * 0.5
  const stops: [number, string][] = [
    [0, tone(base, 0.85)], [0.22, tone(base, 0.15)], [0.45, tone(base, -0.55)],
    [0.5, tone(base, 0.9)], [0.62, tone(base, 0.25)], [0.85, tone(base, -0.35)], [1, tone(base, 0.7)],
  ]
  return `<linearGradient id="${id}" x1="${f(1 - x2)}" y1="${f(1 - y2)}" x2="${f(x2)}" y2="${f(y2)}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`
}

// ─── PARAMETRI RICORRENTI ────────────────────────────────────────────────────

const P = {
  c1: (def = '#d4ff3a', label = 'Colore'): GenParam => ({ key: 'c1', label, type: 'color', def }),
  c2: (def = '#ff3ea5', label = 'Secondo'): GenParam => ({ key: 'c2', label, type: 'color', def }),
  c3: (def = '#3a5bff', label = 'Accento'): GenParam => ({ key: 'c3', label, type: 'color', def }),
  ink: (def = '#111111', label = 'Inchiostro'): GenParam => ({ key: 'ink', label, type: 'color', def }),
  text: (def: string, label = 'Testo'): GenParam => ({ key: 'text', label, type: 'text', def }),
  font: (def = 0): GenParam => ({ key: 'font', label: 'Carattere', type: 'select', options: GEN_FONTS, def }),
  border: (def = 10): GenParam => ({ key: 'border', label: 'Bordo adesivo', type: 'range', min: 0, max: 30, def }),
  shadow: (def = true): GenParam => ({ key: 'shadow', label: 'Ombra', type: 'toggle', def }),
  stroke: (def = 6, max = 30): GenParam => ({ key: 'sw', label: 'Spessore', type: 'range', min: 1, max, def }),
}

// ─── ADESIVI & BADGE ─────────────────────────────────────────────────────────

const starburst: GenDef = {
  id: 'starburst', label: 'Esplosione', cat: 'Adesivi & badge', hint: 'badge a raggi stile offerta / sale, a punte o morbido',
  params: [
    P.text('NEW|DROP'), P.font(0),
    { key: 'points', label: 'Punte', type: 'range', min: 6, max: 48, def: 18 },
    { key: 'depth', label: 'Profondità', type: 'range', min: 4, max: 60, def: 18 },
    { key: 'soft', label: 'Morbido', type: 'toggle', def: false },
    { key: 'size', label: 'Testo', type: 'range', min: 20, max: 120, def: 64 },
    P.c1('#d4ff3a', 'Fondo'), P.ink('#111111', 'Testo'), P.border(10), P.shadow(),
  ],
  make: (p) => {
    const W = 440, c = W / 2, R = 180, n = num(p, 'points'), r2 = R * (1 - num(p, 'depth') / 100)
    const pts: Pt[] = []
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * TAU - Math.PI / 2
      const r = i % 2 ? r2 : R
      pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r])
    }
    const d = bool(p, 'soft') ? smooth(pts, true, 0.8) : poly(pts)
    return svg(W, W,
      stickerUnder(d, num(p, 'border'), bool(p, 'shadow')) +
      `<path d="${d}" fill="${p.c1}"/>` +
      centerText(str(p, 'text'), c, c, num(p, 'size'), str(p, 'ink'), font(p)))
  },
}

const seal: GenDef = {
  id: 'seal', label: 'Sigillo', cat: 'Adesivi & badge', hint: 'bollino ondulato con testo circolare e anello tratteggiato',
  params: [
    P.text('100%', 'Centro'), { key: 'ring', label: 'Testo anello', type: 'text', def: 'HANDMADE • ORIGINAL • ' }, P.font(0),
    { key: 'waves', label: 'Onde', type: 'range', min: 8, max: 40, def: 22 },
    { key: 'amp', label: 'Ampiezza', type: 'range', min: 0, max: 20, def: 7 },
    { key: 'size', label: 'Testo', type: 'range', min: 20, max: 110, def: 70 },
    P.c1('#ff3ea5', 'Fondo'), P.ink('#ffffff', 'Testo'), P.border(8), P.shadow(),
  ],
  make: (p) => {
    const W = 440, c = W / 2, R = 180, n = num(p, 'waves'), A = num(p, 'amp')
    const pts: Pt[] = []
    const steps = n * 12
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * TAU
      const r = R + Math.sin(a * n) * A
      pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r])
    }
    const d = poly(pts)
    const ink = str(p, 'ink')
    const ringR = R - A - 30
    return svg(W, W,
      stickerUnder(d, num(p, 'border'), bool(p, 'shadow')) +
      `<path d="${d}" fill="${p.c1}"/>` +
      `<circle cx="${c}" cy="${c}" r="${f(ringR - 22)}" fill="none" stroke="${ink}" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>` +
      `<circle cx="${c}" cy="${c}" r="${f(ringR + 22)}" fill="none" stroke="${ink}" stroke-width="2.5"/>` +
      circleText(str(p, 'ring'), c, c, ringR, 22, ink, font(p)) +
      centerText(str(p, 'text'), c, c, num(p, 'size'), ink, font(p)))
  },
}

const rosette: GenDef = {
  id: 'rosette', label: 'Coccarda', cat: 'Adesivi & badge', hint: 'premio con petali e nastri, per "1° posto" e best-seller',
  params: [
    P.text('BEST|SELLER'), P.font(0),
    { key: 'petals', label: 'Petali', type: 'range', min: 10, max: 36, def: 20 },
    { key: 'size', label: 'Testo', type: 'range', min: 16, max: 80, def: 40 },
    P.c1('#f1c40f', 'Coccarda'), P.c2('#e63946', 'Nastri'), P.ink('#1d3557', 'Testo'), P.border(6), P.shadow(),
  ],
  make: (p) => {
    const W = 400, H = 520, cx = W / 2, cy = 190, R = 150, n = num(p, 'petals')
    const c1 = str(p, 'c1'), c2 = str(p, 'c2'), ink = str(p, 'ink')
    const scallop = (rad: number, depth: number) => {
      const pts: Pt[] = []
      for (let i = 0; i < n * 10; i++) {
        const a = (i / (n * 10)) * TAU
        const r = rad - depth * (1 - Math.abs(Math.sin(a * n / 2)))
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
      }
      return poly(pts)
    }
    const tail = (dir: number) => {
      const x0 = cx + dir * 30, x1 = cx + dir * 115
      return poly([[x0 - dir * 40, cy + 60], [x0 + dir * 20, cy + 60], [x1, 490], [x1 - dir * 35, 455], [x1 - dir * 80, 500]])
    }
    const outer = scallop(R, 14)
    const silhouette = `${tail(-1)} ${tail(1)} ${outer}`
    return svg(W, H,
      stickerUnder(silhouette, num(p, 'border'), bool(p, 'shadow')) +
      `<path d="${tail(-1)}" fill="${tone(c2, -0.15)}"/><path d="${tail(1)}" fill="${c2}"/>` +
      `<path d="${outer}" fill="${c1}"/>` +
      `<path d="${scallop(R - 22, 8)}" fill="${tone(c1, -0.12)}"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${R - 42}" fill="${tone(c1, 0.35)}" stroke="${ink}" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round"/>` +
      centerText(str(p, 'text'), cx, cy, num(p, 'size'), ink, font(p)))
  },
}

const blobSticker: GenDef = {
  id: 'blob', label: 'Blob', cat: 'Adesivi & badge', hint: 'forma organica casuale con testo: cambia seme per nuove forme',
  params: [
    P.text('hello!'), P.font(1),
    { key: 'lobes', label: 'Lobi', type: 'range', min: 4, max: 12, def: 7 },
    { key: 'wobble', label: 'Irregolarità', type: 'range', min: 0, max: 60, def: 28 },
    { key: 'size', label: 'Testo', type: 'range', min: 20, max: 120, def: 70 },
    P.c1('#8fd3ff', 'Fondo'), P.ink('#1a1a2e', 'Testo'), P.border(12), P.shadow(),
  ],
  make: (p, seed) => {
    const W = 460, H = 380, cx = W / 2, cy = H / 2, R = 150, n = num(p, 'lobes'), w = num(p, 'wobble') / 100
    const r = rng(seed)
    const pts: Pt[] = []
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (r() - 0.5) * 0.4
      const k = 1 - w / 2 + r() * w
      pts.push([cx + Math.cos(a) * R * 1.2 * k, cy + Math.sin(a) * R * 0.95 * k])
    }
    const d = smooth(pts, true)
    return svg(W, H,
      stickerUnder(d, num(p, 'border'), bool(p, 'shadow')) +
      `<path d="${d}" fill="${p.c1}"/>` +
      centerText(str(p, 'text'), cx, cy, num(p, 'size'), str(p, 'ink'), font(p), 800))
  },
}

const ticket: GenDef = {
  id: 'ticket', label: 'Biglietto', cat: 'Adesivi & badge', hint: 'ticket con tacche, perforazione e numero di serie',
  params: [
    P.text('ADMIT ONE'), { key: 'sub', label: 'Sottotitolo', type: 'text', def: 'SAT 21:00 · ROW B' }, P.font(2),
    { key: 'notch', label: 'Tacche', type: 'range', min: 0, max: 40, def: 22 },
    P.c1('#ffe800', 'Carta'), P.ink('#1b1b1b', 'Stampa'), P.border(0), P.shadow(),
  ],
  make: (p, seed) => {
    const W = 560, H = 240, m = 20, x0 = m, y0 = m, x1 = W - m, y1 = H - m, nr = num(p, 'notch'), cy = H / 2
    const stub = x0 + (x1 - x0) * 0.72
    const d = nr > 0
      ? `M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${cy - nr} A ${nr} ${nr} 0 0 0 ${x1} ${cy + nr} L ${x1} ${y1} L ${x0} ${y1} L ${x0} ${cy + nr} A ${nr} ${nr} 0 0 0 ${x0} ${cy - nr} Z`
      : `M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${y1} L ${x0} ${y1} Z`
    const ink = str(p, 'ink'), fam = font(p)
    const serial = String(Math.floor(rng(seed)() * 900000) + 100000)
    return svg(W, H,
      stickerUnder(d, num(p, 'border'), bool(p, 'shadow')) +
      `<path d="${d}" fill="${p.c1}"/>` +
      `<rect x="${x0 + 14}" y="${y0 + 14}" width="${f(stub - x0 - 28)}" height="${y1 - y0 - 28}" fill="none" stroke="${ink}" stroke-width="2"/>` +
      `<path d="M ${f(stub)} ${y0 + 8} L ${f(stub)} ${y1 - 8}" stroke="${ink}" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/>` +
      centerText(str(p, 'text'), (x0 + stub) / 2, cy - 14, 46, ink, fam, 900) +
      centerText(str(p, 'sub'), (x0 + stub) / 2, cy + 38, 18, ink, fam, 600, 2) +
      `<text x="0" y="0" text-anchor="middle" transform="translate(${f((stub + x1) / 2 + 6)} ${cy}) rotate(-90)" font-family="${esc(fam)}" font-weight="700" font-size="26" letter-spacing="3" fill="${ink}">№ ${serial}</text>`)
  },
}

const ribbon: GenDef = {
  id: 'ribbon', label: 'Nastro', cat: 'Adesivi & badge', hint: 'banner a nastro con code piegate, per titoli e etichette',
  params: [
    P.text('LIMITED EDITION'), P.font(0),
    { key: 'curve', label: 'Curvatura', type: 'range', min: -60, max: 60, def: 18 },
    { key: 'size', label: 'Testo', type: 'range', min: 16, max: 60, def: 34 },
    P.c1('#e63946', 'Nastro'), P.ink('#ffffff', 'Testo'), P.shadow(false),
  ],
  make: (p) => {
    const W = 640, H = 260, k = num(p, 'curve'), x0 = 90, x1 = W - 90, top = 90, bh = 74
    const c1 = str(p, 'c1')
    const band = `M ${x0} ${top} Q ${W / 2} ${top + k} ${x1} ${top} L ${x1} ${top + bh} Q ${W / 2} ${top + bh + k} ${x0} ${top + bh} Z`
    const tail = (dir: number) => {
      const xa = dir < 0 ? x0 : x1, xo = xa - dir * 70
      return poly([[xa + dir * 24, top + 22], [xo, top + 22], [xo + dir * 26, top + 22 + bh / 2], [xo, top + 22 + bh], [xa + dir * 24, top + 22 + bh]])
    }
    const fold = (dir: number) => {
      const xa = dir < 0 ? x0 : x1
      return poly([[xa, top + bh], [xa + dir * 24, top + 22 + bh], [xa + dir * 24, top + bh]])
    }
    const textY = top + bh / 2 + k / 2
    return svg(W, H,
      (bool(p, 'shadow') ? `<path d="${band}" transform="translate(4 8)" fill="#000" fill-opacity="0.2"/>` : '') +
      `<path d="${tail(-1)}" fill="${tone(c1, -0.25)}"/><path d="${tail(1)}" fill="${tone(c1, -0.25)}"/>` +
      `<path d="${fold(-1)}" fill="${tone(c1, -0.5)}"/><path d="${fold(1)}" fill="${tone(c1, -0.5)}"/>` +
      `<path d="${band}" fill="${c1}"/>` +
      centerText(str(p, 'text'), W / 2, textY, num(p, 'size'), str(p, 'ink'), font(p), 900, 2))
  },
}

const smiley: GenDef = {
  id: 'smiley', label: 'Smile', cat: 'Adesivi & badge', hint: 'faccina acid/Y2K: classica, occhi X, stelle, cuori o che si scioglie',
  params: [
    { key: 'style', label: 'Stile', type: 'select', options: ['Classica', 'Occhi X', 'Stelle', 'Cuori', 'Si scioglie'], def: 0 },
    P.c1('#ffe800', 'Faccia'), P.ink('#111111', 'Tratti'), P.border(10), P.shadow(),
  ],
  make: (p) => {
    const W = 420, c = W / 2, R = 160, ink = str(p, 'ink'), st = num(p, 'style')
    let face = circ(c, c, R)
    if (st === 4) {
      // colature: gaussiane sommate al raggio nella metà inferiore
      const pts: Pt[] = []
      const drips = [[0.18, 70], [0.32, 30], [0.5, 110], [0.66, 45], [0.8, 80]]
      for (let i = 0; i <= 200; i++) {
        const a = (i / 200) * TAU
        let r = R
        if (Math.sin(a) > 0.2) {
          const u = 0.5 - Math.cos(a) * 0.5
          for (const [pos, len] of drips) r += len * Math.exp(-Math.pow((u - pos) / 0.035, 2)) * Math.sin(a)
        }
        pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r])
      }
      face = smooth(pts, true)
    }
    const eye = (x: number) => {
      const y = c - 40
      if (st === 1) return `<path d="M ${x - 20} ${y - 20} L ${x + 20} ${y + 20} M ${x + 20} ${y - 20} L ${x - 20} ${y + 20}" stroke="${ink}" stroke-width="12" stroke-linecap="round"/>`
      if (st === 2) {
        const pts: Pt[] = []
        for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, r = i % 2 ? 11 : 28; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]) }
        return `<path d="${poly(pts)}" fill="${ink}"/>`
      }
      if (st === 3) return `<path d="M ${x} ${y + 24} C ${x - 40} ${y - 4} ${x - 22} ${y - 34} ${x} ${y - 14} C ${x + 22} ${y - 34} ${x + 40} ${y - 4} ${x} ${y + 24} Z" fill="#e63946"/>`
      return `<path d="${ellipse(x, y, 15, 26)}" fill="${ink}"/>`
    }
    const mouth = `<path d="M ${c - 85} ${c + 30} Q ${c} ${c + 120} ${c + 85} ${c + 30}" fill="none" stroke="${ink}" stroke-width="13" stroke-linecap="round"/>`
    return svg(W, W + (st === 4 ? 80 : 0),
      stickerUnder(face, num(p, 'border'), bool(p, 'shadow')) +
      `<path d="${face}" fill="${p.c1}"/>` + eye(c - 55) + eye(c + 55) + mouth)
  },
}

// ─── Y2K & SPARKLE ───────────────────────────────────────────────────────────

function sparklePath(cx: number, cy: number, R: number, n: number, pinch: number, rot = 0) {
  // punte unite da curve quadratiche che passano vicino al centro: stella concava
  let d = ''
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU + rot - Math.PI / 2
    const a1 = ((i + 1) / n) * TAU + rot - Math.PI / 2
    const am = (a0 + a1) / 2
    const tip0: Pt = [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R]
    const tip1: Pt = [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R]
    const k = R * pinch
    const ctrl: Pt = [cx + Math.cos(am) * k, cy + Math.sin(am) * k]
    if (i === 0) d += `M ${f(tip0[0])} ${f(tip0[1])}`
    d += ` Q ${f(ctrl[0])} ${f(ctrl[1])} ${f(tip1[0])} ${f(tip1[1])}`
  }
  return d + ' Z'
}

const sparkle: GenDef = {
  id: 'sparkle', label: 'Sparkle', cat: 'Y2K & sparkle', hint: 'stella concava Y2K, piena, cromata o a contorno',
  params: [
    { key: 'points', label: 'Punte', type: 'range', min: 3, max: 12, def: 4 },
    { key: 'pinch', label: 'Concavità', type: 'range', min: 0, max: 60, def: 12 },
    { key: 'mode', label: 'Resa', type: 'select', options: ['Piena', 'Cromo', 'Contorno', 'Doppia'], def: 1 },
    { key: 'rot', label: 'Rotazione', type: 'range', min: 0, max: 90, def: 0 },
    P.c1('#c9d1e0', 'Colore'), P.c2('#ff9ce6', 'Secondo'), P.stroke(6, 20),
  ],
  make: (p) => {
    const W = 400, c = W / 2, mode = num(p, 'mode'), rot = (num(p, 'rot') * Math.PI) / 180
    const d = sparklePath(c, c, 185, num(p, 'points'), num(p, 'pinch') / 100, rot)
    const c1 = str(p, 'c1'), c2 = str(p, 'c2')
    if (mode === 1) return svg(W, W, `<path d="${d}" fill="url(#chr)" stroke="${tone(c1, -0.6)}" stroke-width="2"/>`, chromeGradient('chr', c1, 70))
    if (mode === 2) return svg(W, W, `<path d="${d}" fill="none" stroke="${c1}" stroke-width="${p.sw}" stroke-linejoin="round"/>`)
    if (mode === 3) {
      const d2 = sparklePath(c, c, 110, num(p, 'points'), num(p, 'pinch') / 100, rot + Math.PI / num(p, 'points'))
      return svg(W, W, `<path d="${d2}" fill="${c2}"/><path d="${d}" fill="${c1}" fill-opacity="0.92"/>`)
    }
    return svg(W, W, `<path d="${d}" fill="${c1}"/>`)
  },
}

const sparkleCluster: GenDef = {
  id: 'sparkles', label: 'Costellazione', cat: 'Y2K & sparkle', hint: 'sciame di stelline e puntini sparsi, per riempire angoli',
  params: [
    { key: 'count', label: 'Quante', type: 'range', min: 3, max: 40, def: 12 },
    { key: 'spread', label: 'Varietà taglia', type: 'range', min: 0, max: 100, def: 70 },
    { key: 'dots', label: 'Puntini', type: 'toggle', def: true },
    P.c1('#ffffff', 'Colore'), P.c2('#8fd3ff', 'Secondo'), P.c3('#ff9ce6', 'Accento'),
  ],
  make: (p, seed) => {
    const W = 600, H = 400, r = rng(seed), n = num(p, 'count'), sp = num(p, 'spread') / 100
    const cols = [str(p, 'c1'), str(p, 'c2'), str(p, 'c3')]
    const placed: [number, number, number][] = []
    let body = ''
    // posizionamento con rifiuto: niente stelle sovrapposte
    for (let i = 0, tries = 0; i < n && tries < n * 40; tries++) {
      const R = 14 + (1 - sp + r() * sp) * 46 * (r() < 0.2 ? 1.6 : 1)
      const x = R + r() * (W - 2 * R), y = R + r() * (H - 2 * R)
      if (placed.some(([px, py, pr]) => Math.hypot(px - x, py - y) < (pr + R) * 0.9)) continue
      placed.push([x, y, R])
      body += `<path d="${sparklePath(x, y, R, r() < 0.8 ? 4 : 8, 0.08 + r() * 0.12, r() < 0.7 ? 0 : Math.PI / 4)}" fill="${cols[Math.floor(r() * 3)]}"/>`
      i++
    }
    if (bool(p, 'dots')) for (let i = 0; i < n * 1.5; i++) body += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(2 + r() * 4)}" fill="${cols[i % 3]}"/>`
    return svg(W, H, body)
  },
}

const chromeShape: GenDef = {
  id: 'chromeblob', label: 'Goccia cromo', cat: 'Y2K & sparkle', hint: 'forma liquida metallica stile 2000, nuovi seed = nuove gocce',
  params: [
    { key: 'lobes', label: 'Lobi', type: 'range', min: 3, max: 10, def: 5 },
    { key: 'spike', label: 'Tensione', type: 'range', min: 0, max: 100, def: 55 },
    { key: 'angle', label: 'Luce', type: 'range', min: 0, max: 180, def: 70 },
    P.c1('#c9d1e0', 'Metallo'),
  ],
  make: (p, seed) => {
    const W = 460, c = W / 2, n = num(p, 'lobes'), r = rng(seed), sp = num(p, 'spike') / 100
    const pts: Pt[] = []
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * TAU + (r() - 0.5) * 0.3
      const R = i % 2 ? 90 + (1 - sp) * 60 + r() * 20 : 170 + r() * 40
      pts.push([c + Math.cos(a) * R, c + Math.sin(a) * R])
    }
    const d = smooth(pts, true, 1.1)
    const c1 = str(p, 'c1')
    return svg(W, W,
      `<path d="${d}" fill="url(#chr)" stroke="${tone(c1, -0.7)}" stroke-width="2.5"/>` +
      `<path d="${d}" transform="translate(${c} ${c}) scale(0.55) translate(${-c} ${-c - 40})" fill="#ffffff" fill-opacity="0.18"/>`,
      chromeGradient('chr', c1, num(p, 'angle')))
  },
}

// ─── GEOMETRIA PROCEDURALE ───────────────────────────────────────────────────

const superformula: GenDef = {
  id: 'superformula', label: 'Superformula', cat: 'Geometria', hint: 'forme naturali di Gielis: fiori, conchiglie, stelle, cristalli',
  params: [
    { key: 'm', label: 'Simmetria', type: 'range', min: 1, max: 24, def: 6 },
    { key: 'n1', label: 'n1', type: 'range', min: 1, max: 100, def: 30, step: 1 },
    { key: 'n2', label: 'n2', type: 'range', min: 1, max: 100, def: 15, step: 1 },
    { key: 'n3', label: 'n3', type: 'range', min: 1, max: 100, def: 15, step: 1 },
    { key: 'layers', label: 'Strati', type: 'range', min: 1, max: 8, def: 3 },
    { key: 'outline', label: 'Solo contorno', type: 'toggle', def: false },
    P.c1('#ff3ea5', 'Esterno'), P.c2('#ffe800', 'Interno'), P.stroke(3, 12),
  ],
  make: (p) => {
    const W = 440, c = W / 2, m = num(p, 'm'), n1 = num(p, 'n1') / 10, n2 = num(p, 'n2') / 10, n3 = num(p, 'n3') / 10
    const raw: Pt[] = []
    let maxR = 0
    for (let i = 0; i < 720; i++) {
      const t = (i / 720) * TAU
      const r = Math.pow(Math.pow(Math.abs(Math.cos((m * t) / 4)), n2) + Math.pow(Math.abs(Math.sin((m * t) / 4)), n3), -1 / n1)
      const rr = Number.isFinite(r) ? Math.min(r, 50) : 0
      maxR = Math.max(maxR, rr)
      raw.push([Math.cos(t) * rr, Math.sin(t) * rr])
    }
    const L = num(p, 'layers'), out = bool(p, 'outline'), sw = num(p, 'sw')
    let body = ''
    for (let l = 0; l < L; l++) {
      const s = (190 / (maxR || 1)) * (1 - l / (L + 0.5))
      const d = poly(raw.map(([x, y]) => [c + x * s, c + y * s] as Pt))
      const col = mixHex(str(p, 'c1'), str(p, 'c2'), L > 1 ? l / (L - 1) : 0)
      body += out
        ? `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round"/>`
        : `<path d="${d}" fill="${col}"/>`
    }
    return svg(W, W, body)
  },
}

const guilloche: GenDef = {
  id: 'guilloche', label: 'Guilloche', cat: 'Geometria', hint: 'rosoni da banconota / spirografo: ruote che girano dentro ruote',
  params: [
    { key: 'R', label: 'Ruota fissa', type: 'range', min: 40, max: 150, def: 96 },
    { key: 'r', label: 'Ruota mobile', type: 'range', min: 5, max: 120, def: 35 },
    { key: 'd', label: 'Penna', type: 'range', min: 10, max: 150, def: 80 },
    { key: 'layers', label: 'Passate', type: 'range', min: 1, max: 6, def: 3 },
    { key: 'outer', label: 'Epicicloide', type: 'toggle', def: false },
    P.c1('#1d3557', 'Colore'), P.c2('#e63946', 'Secondo'), P.c3('#2a9d8f', 'Terzo'),
    { key: 'sw', label: 'Spessore', type: 'range', min: 1, max: 30, def: 8, step: 1 },
  ],
  make: (p) => {
    const W = 480, c = W / 2, Rw = num(p, 'R'), rw = Math.max(1, num(p, 'r')), epi = bool(p, 'outer')
    // la curva si chiude dopo r/gcd(R,r) giri completi
    const turns = rw / gcd(Rw, rw)
    const steps = Math.min(2400, Math.max(600, Math.round(turns * 120)))
    const cols = [str(p, 'c1'), str(p, 'c2'), str(p, 'c3')]
    const L = num(p, 'layers'), sw = num(p, 'sw') / 10
    let body = ''
    for (let l = 0; l < L; l++) {
      const dPen = num(p, 'd') / 100 * rw * (1 - l * 0.12)
      const phase = (l / L) * (TAU / Math.max(1, Rw / gcd(Rw, rw)))
      const pts: Pt[] = []
      let maxR = 0
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * TAU * turns + phase
        const k = epi ? Rw + rw : Rw - rw
        const x = k * Math.cos(t) + (epi ? -1 : 1) * dPen * Math.cos((k / rw) * t)
        const y = k * Math.sin(t) - dPen * Math.sin((k / rw) * t)
        maxR = Math.max(maxR, Math.hypot(x, y))
        pts.push([x, y])
      }
      const s = 210 / (maxR || 1)
      body += `<path d="${poly(pts.map(([x, y]) => [c + x * s, c + y * s] as Pt), false)}" fill="none" stroke="${cols[l % 3]}" stroke-width="${f(sw)}" stroke-linejoin="round"/>`
    }
    return svg(W, W, body)
  },
}

const flower: GenDef = {
  id: 'flower', label: 'Fiore', cat: 'Geometria', hint: 'fiore stilizzato a petali, a uno o più giri, stile anni 70',
  params: [
    { key: 'petals', label: 'Petali', type: 'range', min: 3, max: 24, def: 8 },
    { key: 'rings', label: 'Giri', type: 'range', min: 1, max: 4, def: 2 },
    { key: 'width', label: 'Larghezza', type: 'range', min: 10, max: 100, def: 60 },
    { key: 'center', label: 'Centro', type: 'range', min: 10, max: 60, def: 28 },
    P.c1('#ff48b0', 'Petali'), P.c2('#ffd6e0', 'Interni'), P.c3('#ffe800', 'Centro'), P.border(0), P.shadow(false),
  ],
  make: (p) => {
    const W = 440, c = W / 2, n = num(p, 'petals'), rings = num(p, 'rings'), wd = num(p, 'width') / 100
    const petal = (a: number, len: number, wid: number, r0: number) => {
      const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca
      const bx = c + ca * r0, by = c + sa * r0
      const tx = c + ca * (r0 + len), ty = c + sa * (r0 + len)
      const m1x = bx + ca * len * 0.55, m1y = by + sa * len * 0.55
      return `M ${f(bx)} ${f(by)} C ${f(m1x + nx * wid)} ${f(m1y + ny * wid)} ${f(tx + nx * wid * 0.6)} ${f(ty + ny * wid * 0.6)} ${f(tx)} ${f(ty)} C ${f(tx - nx * wid * 0.6)} ${f(ty - ny * wid * 0.6)} ${f(m1x - nx * wid)} ${f(m1y - ny * wid)} ${f(bx)} ${f(by)} Z`
    }
    let body = '', all = ''
    for (let k = 0; k < rings; k++) {
      const len = 180 * (1 - k / (rings + 0.6)), wid = len * wd * (TAU / n) * 0.9
      const col = mixHex(str(p, 'c1'), str(p, 'c2'), rings > 1 ? k / (rings - 1) : 0)
      let d = ''
      for (let i = 0; i < n; i++) d += petal((i / n) * TAU + (k % 2 ? Math.PI / n : 0) - Math.PI / 2, len, wid, 4) + ' '
      body += `<path d="${d}" fill="${col}"/>`
      if (k === 0) all = d
    }
    const cr = num(p, 'center') / 100 * 120
    body += `<circle cx="${c}" cy="${c}" r="${f(cr)}" fill="${p.c3}"/>`
    return svg(W, W, stickerUnder(all, num(p, 'border'), bool(p, 'shadow')) + body)
  },
}

const truchet: GenDef = {
  id: 'truchet', label: 'Truchet', cat: 'Geometria', hint: 'piastrelle ruotate a caso: labirinti, archi, onde continue',
  params: [
    { key: 'grid', label: 'Griglia', type: 'range', min: 3, max: 20, def: 8 },
    { key: 'style', label: 'Tessera', type: 'select', options: ['Archi', 'Diagonali', 'Triangoli', 'Quarti di cerchio', 'Labirinto 10 PRINT'], def: 0 },
    { key: 'bg', label: 'Sfondo pieno', type: 'toggle', def: true },
    P.c1('#111111', 'Tratto'), P.c2('#f4f1ea', 'Sfondo'), P.stroke(6, 20),
  ],
  make: (p, seed) => {
    const W = 480, n = num(p, 'grid'), s = W / n, r = rng(seed), st = num(p, 'style'), sw = num(p, 'sw')
    const c1 = str(p, 'c1')
    let strokes = '', fills = ''
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * s, y = j * s, flip = r() < 0.5, rot = Math.floor(r() * 4)
      if (st === 0) {
        const h = s / 2
        strokes += flip
          ? `M ${f(x + h)} ${f(y)} A ${f(h)} ${f(h)} 0 0 0 ${f(x + s)} ${f(y + h)} M ${f(x)} ${f(y + h)} A ${f(h)} ${f(h)} 0 0 1 ${f(x + h)} ${f(y + s)} `
          : `M ${f(x + h)} ${f(y)} A ${f(h)} ${f(h)} 0 0 1 ${f(x)} ${f(y + h)} M ${f(x + s)} ${f(y + h)} A ${f(h)} ${f(h)} 0 0 0 ${f(x + h)} ${f(y + s)} `
      } else if (st === 1 || st === 4) {
        strokes += flip ? `M ${f(x)} ${f(y)} L ${f(x + s)} ${f(y + s)} ` : `M ${f(x + s)} ${f(y)} L ${f(x)} ${f(y + s)} `
      } else if (st === 2) {
        const c: Pt[] = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]]
        fills += poly([c[rot], c[(rot + 1) % 4], c[(rot + 2) % 4]]) + ' '
      } else {
        const corners: Pt[] = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]]
        const [cx, cy] = corners[rot]
        const a0 = rot * (Math.PI / 2)
        const p0: Pt = [cx + Math.cos(a0) * s, cy + Math.sin(a0) * s]
        const p1: Pt = [cx + Math.cos(a0 + Math.PI / 2) * s, cy + Math.sin(a0 + Math.PI / 2) * s]
        fills += `M ${f(cx)} ${f(cy)} L ${f(p0[0])} ${f(p0[1])} A ${f(s)} ${f(s)} 0 0 1 ${f(p1[0])} ${f(p1[1])} Z `
      }
    }
    const bg = bool(p, 'bg') ? `<rect x="0" y="0" width="${W}" height="${W}" fill="${p.c2}"/>` : ''
    const cap = st === 4 ? 'square' : 'round'
    return svg(W, W, bg +
      (fills ? `<path d="${fills}" fill="${c1}"/>` : '') +
      (strokes ? `<path d="${strokes}" fill="none" stroke="${c1}" stroke-width="${sw}" stroke-linecap="${cap}"/>` : ''))
  },
}

const symbol: GenDef = {
  id: 'symbol', label: 'Simbolo', cat: 'Geometria', hint: 'marchio astratto a simmetria radiale: ogni seme è un logo diverso',
  params: [
    { key: 'sym', label: 'Simmetria', type: 'range', min: 2, max: 12, def: 6 },
    { key: 'parts', label: 'Elementi', type: 'range', min: 1, max: 4, def: 2 },
    P.c1('#111111', 'Colore'), P.c2('#e63946', 'Secondo'),
  ],
  make: (p, seed) => {
    const W = 400, c = W / 2, r = rng(seed), n = num(p, 'sym')
    const cols = [str(p, 'c1'), str(p, 'c2')]
    let body = ''
    for (let k = 0; k < num(p, 'parts'); k++) {
      const kind = Math.floor(r() * 5), dist = 30 + r() * 120, size = 14 + r() * 50, col = cols[k % 2]
      let d = ''
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU - Math.PI / 2, x = c + Math.cos(a) * dist, y = c + Math.sin(a) * dist
        const ca = Math.cos(a), sa = Math.sin(a)
        const rotP = (dx: number, dy: number): Pt => [x + dx * ca - dy * sa, y + dx * sa + dy * ca]
        if (kind === 0) d += circ(x, y, size * 0.6) + ' '
        else if (kind === 1) d += poly([rotP(size, 0), rotP(-size * 0.6, size * 0.8), rotP(-size * 0.6, -size * 0.8)]) + ' '
        else if (kind === 2) d += poly([rotP(-size, -size * 0.25), rotP(size, -size * 0.25), rotP(size, size * 0.25), rotP(-size, size * 0.25)]) + ' '
        else if (kind === 3) {
          const tip = rotP(size * 1.4, 0), b = rotP(-size * 0.4, 0), l = rotP(size * 0.4, size * 0.6), rr = rotP(size * 0.4, -size * 0.6)
          d += `M ${f(b[0])} ${f(b[1])} Q ${f(l[0])} ${f(l[1])} ${f(tip[0])} ${f(tip[1])} Q ${f(rr[0])} ${f(rr[1])} ${f(b[0])} ${f(b[1])} Z `
        } else d += poly([rotP(0, -size * 0.7), rotP(size * 0.7, 0), rotP(0, size * 0.7), rotP(-size * 0.7, 0)]) + ' '
      }
      body += `<path d="${d}" fill="${col}"/>`
    }
    if (r() < 0.6) body += `<circle cx="${c}" cy="${c}" r="${f(10 + r() * 26)}" fill="${cols[0]}"/>`
    return svg(W, W, body)
  },
}

const identicon: GenDef = {
  id: 'identicon', label: 'Pixel icona', cat: 'Geometria', hint: 'icona a pixel speculare (tipo avatar/space invader) dal seme',
  params: [
    { key: 'grid', label: 'Griglia', type: 'range', min: 5, max: 13, def: 7 },
    { key: 'fill', label: 'Densità', type: 'range', min: 20, max: 80, def: 50 },
    { key: 'cell', label: 'Pixel', type: 'select', options: ['Quadrati', 'Cerchi', 'Arrotondati', 'Rombi'], def: 0 },
    P.c1('#3a5bff', 'Colore'), P.c2('#ff3ea5', 'Secondo'), { key: 'two', label: 'Due colori', type: 'toggle', def: false },
  ],
  make: (p, seed) => {
    const n = num(p, 'grid'), W = 420, s = W / n, r = rng(seed), dens = num(p, 'fill') / 100, mode = num(p, 'cell')
    const half = Math.ceil(n / 2)
    let a = '', b = ''
    for (let j = 0; j < n; j++) for (let i = 0; i < half; i++) {
      if (r() > dens) continue
      const second = bool(p, 'two') && r() < 0.3
      const xs = i === n - 1 - i ? [i] : [i, n - 1 - i]
      for (const x of xs) {
        const px = x * s, py = j * s, g = s * 0.06
        let d: string
        if (mode === 1) d = circ(px + s / 2, py + s / 2, s / 2 - g)
        else if (mode === 2) { const rr = s * 0.28; d = `M ${f(px + g + rr)} ${f(py + g)} H ${f(px + s - g - rr)} A ${f(rr)} ${f(rr)} 0 0 1 ${f(px + s - g)} ${f(py + g + rr)} V ${f(py + s - g - rr)} A ${f(rr)} ${f(rr)} 0 0 1 ${f(px + s - g - rr)} ${f(py + s - g)} H ${f(px + g + rr)} A ${f(rr)} ${f(rr)} 0 0 1 ${f(px + g)} ${f(py + s - g - rr)} V ${f(py + g + rr)} A ${f(rr)} ${f(rr)} 0 0 1 ${f(px + g + rr)} ${f(py + g)} Z` }
        else if (mode === 3) d = poly([[px + s / 2, py], [px + s, py + s / 2], [px + s / 2, py + s], [px, py + s / 2]])
        else d = poly([[px, py], [px + s, py], [px + s, py + s], [px, py + s]])
        if (second) b += d + ' '; else a += d + ' '
      }
    }
    return svg(W, W, (a ? `<path d="${a}" fill="${p.c1}"/>` : '') + (b ? `<path d="${b}" fill="${p.c2}"/>` : ''))
  },
}

// ─── LINEE & DECORI ──────────────────────────────────────────────────────────

const squiggle: GenDef = {
  id: 'squiggle', label: 'Scarabocchio', cat: 'Linee & decori', hint: 'onde, zigzag, spirali, riccioli e scarabocchi disegnati',
  params: [
    { key: 'kind', label: 'Tipo', type: 'select', options: ['Onda', 'Zigzag', 'Riccioli', 'Spirale', 'Scarabocchio', 'Molla'], def: 0 },
    { key: 'freq', label: 'Ripetizioni', type: 'range', min: 2, max: 20, def: 6 },
    { key: 'amp', label: 'Ampiezza', type: 'range', min: 5, max: 100, def: 40 },
    P.c1('#ff3ea5', 'Colore'), P.stroke(10, 40),
  ],
  make: (p, seed) => {
    const W = 600, H = 240, k = num(p, 'kind'), n = num(p, 'freq'), A = (num(p, 'amp') / 100) * (H / 2 - 20), cy = H / 2, m = 30
    const pts: Pt[] = []
    let d: string
    if (k === 0) { for (let i = 0; i <= n * 16; i++) { const t = i / (n * 16); pts.push([m + t * (W - 2 * m), cy + Math.sin(t * n * TAU) * A]) } d = smooth(pts, false) }
    else if (k === 1) { for (let i = 0; i <= n * 2; i++) pts.push([m + (i / (n * 2)) * (W - 2 * m), cy + (i % 2 ? A : -A)]); d = poly(pts, false) }
    else if (k === 2) {
      for (let i = 0; i <= n * 24; i++) {
        const t = i / (n * 24), a = t * n * TAU
        pts.push([m + t * (W - 2 * m - 60) + 30 + Math.cos(a + Math.PI) * A * 0.5, cy + Math.sin(a + Math.PI) * A])
      }
      d = smooth(pts, false)
    } else if (k === 3) {
      for (let i = 0; i <= n * 40; i++) { const t = i / (n * 40), a = t * n * TAU, rr = t * (H / 2 - 12) * (0.4 + A / 120); pts.push([W / 2 + Math.cos(a) * rr * 1.6, cy + Math.sin(a) * rr]) }
      d = smooth(pts, false)
    } else if (k === 4) {
      const r = rng(seed)
      for (let i = 0; i < n * 3; i++) pts.push([m + r() * (W - 2 * m), cy + (r() - 0.5) * 2 * A])
      pts.sort((a, b) => a[0] - b[0] + (r() - 0.5) * 140)
      d = smooth(pts, false, 1.2)
    } else {
      for (let i = 0; i <= n * 30; i++) { const t = i / (n * 30), a = t * n * TAU; pts.push([m + 20 + t * (W - 2 * m - 40) + Math.cos(a) * 18, cy + Math.sin(a) * A]) }
      d = smooth(pts, false)
    }
    return svg(W, H, `<path d="${d}" fill="none" stroke="${p.c1}" stroke-width="${p.sw}" stroke-linecap="round" stroke-linejoin="round"/>`)
  },
}

/** Tracciato "a mano": campiona la curva e aggiunge un tremolio morbido. */
function handLine(pts: Pt[], jitter: number, r: () => number) {
  const out: Pt[] = pts.map(([x, y], i) => {
    const edge = i === 0 || i === pts.length - 1 ? 0.3 : 1
    return [x + (r() - 0.5) * jitter * edge, y + (r() - 0.5) * jitter * edge]
  })
  return smooth(out, false)
}

const arrow: GenDef = {
  id: 'arrow', label: 'Freccia a mano', cat: 'Linee & decori', hint: 'freccia disegnata, curva, a ricciolo o doppia, per annotare',
  params: [
    { key: 'shape', label: 'Andamento', type: 'select', options: ['Arco', 'Dritta', 'Ricciolo', 'Onda'], def: 0 },
    { key: 'head', label: 'Punta', type: 'select', options: ['Aperta', 'Piena', 'Doppia'], def: 0 },
    { key: 'bend', label: 'Curvatura', type: 'range', min: -100, max: 100, def: 40 },
    { key: 'jitter', label: 'Tremolio', type: 'range', min: 0, max: 30, def: 6 },
    P.c1('#111111', 'Colore'), P.stroke(8, 24),
  ],
  make: (p, seed) => {
    const W = 560, H = 300, r = rng(seed), sh = num(p, 'shape'), bend = (num(p, 'bend') / 100) * 110, sw = num(p, 'sw')
    const A: Pt = [50, H / 2 + 50], B: Pt = [W - 60, H / 2 - 40]
    const pts: Pt[] = []
    const N = 40
    for (let i = 0; i <= N; i++) {
      const t = i / N
      let x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t
      if (sh === 0) y -= Math.sin(t * Math.PI) * bend
      if (sh === 3) y += Math.sin(t * TAU * 1.5) * bend * 0.5
      if (sh === 2) {
        // ricciolo: un giro completo concentrato attorno a metà percorso
        const loop = Math.exp(-Math.pow((t - 0.45) / 0.12, 2))
        x += Math.cos(t * TAU * 3) * 55 * loop - 25 * loop
        y += Math.sin(t * TAU * 3) * 55 * loop - Math.sin(t * Math.PI) * bend * 0.5
      }
      pts.push([x, y])
    }
    const d = handLine(pts, num(p, 'jitter'), r)
    const head = (tip: Pt, from: Pt) => {
      const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]), L = 26 + sw * 1.6, spread = 0.5
      const l: Pt = [tip[0] - Math.cos(a - spread) * L, tip[1] - Math.sin(a - spread) * L]
      const rr: Pt = [tip[0] - Math.cos(a + spread) * L, tip[1] - Math.sin(a + spread) * L]
      return num(p, 'head') === 1
        ? `<path d="${poly([tip, l, rr])}" fill="${p.c1}" stroke="${p.c1}" stroke-width="${sw * 0.6}" stroke-linejoin="round"/>`
        : `<path d="M ${f(l[0])} ${f(l[1])} L ${f(tip[0])} ${f(tip[1])} L ${f(rr[0])} ${f(rr[1])}" fill="none" stroke="${p.c1}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
    }
    return svg(W, H,
      `<path d="${d}" fill="none" stroke="${p.c1}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>` +
      head(pts[N], pts[N - 3]) + (num(p, 'head') === 2 ? head(pts[0], pts[3]) : ''))
  },
}

const handCircle: GenDef = {
  id: 'handcircle', label: 'Cerchio a mano', cat: 'Linee & decori', hint: 'cerchiatura da evidenziatore, a più giri, per enfatizzare',
  params: [
    { key: 'loops', label: 'Giri', type: 'range', min: 1, max: 4, def: 2 },
    { key: 'ratio', label: 'Ovale', type: 'range', min: 20, max: 100, def: 55 },
    { key: 'jitter', label: 'Tremolio', type: 'range', min: 0, max: 40, def: 12 },
    P.c1('#e63946', 'Colore'), P.stroke(7, 24),
  ],
  make: (p, seed) => {
    const W = 560, H = 360, r = rng(seed), loops = num(p, 'loops'), ratio = num(p, 'ratio') / 100
    const rx = 240, ry = Math.min(160, rx * ratio), j = num(p, 'jitter')
    const pts: Pt[] = []
    const N = 28 * loops + 8
    const start = -2.2 + r() * 0.4
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = start + t * TAU * (loops + 0.12)
      const drift = 1 + (r() - 0.5) * j / 120 + Math.sin(a * 0.5) * 0.04
      pts.push([W / 2 + Math.cos(a) * rx * drift, H / 2 + Math.sin(a) * ry * drift])
    }
    return svg(W, H, `<path d="${handLine(pts, j * 0.4, r)}" fill="none" stroke="${p.c1}" stroke-width="${p.sw}" stroke-linecap="round" stroke-linejoin="round"/>`)
  },
}

const divider: GenDef = {
  id: 'divider', label: 'Divisore', cat: 'Linee & decori', hint: 'separatore ornamentale per impaginati e menu',
  params: [
    { key: 'style', label: 'Stile', type: 'select', options: ['Rombo', 'Punti', 'Stella', 'Onda', 'Fiocco'], def: 0 },
    { key: 'len', label: 'Lunghezza', type: 'range', min: 20, max: 100, def: 80 },
    P.c1('#1d3557', 'Colore'), P.stroke(3, 10),
  ],
  make: (p) => {
    const W = 640, H = 80, cy = H / 2, cx = W / 2, half = (W / 2 - 20) * (num(p, 'len') / 100), st = num(p, 'style'), sw = num(p, 'sw'), c1 = str(p, 'c1')
    const gap = 34
    let body = `<path d="M ${f(cx - half)} ${cy} L ${cx - gap} ${cy} M ${cx + gap} ${cy} L ${f(cx + half)} ${cy}" stroke="${c1}" stroke-width="${sw}" stroke-linecap="round"/>`
    if (st === 0) body += `<path d="${poly([[cx, cy - 16], [cx + 16, cy], [cx, cy + 16], [cx - 16, cy]])}" fill="${c1}"/><path d="${poly([[cx - 30, cy - 6], [cx - 24, cy], [cx - 30, cy + 6], [cx - 36, cy]])} ${poly([[cx + 30, cy - 6], [cx + 36, cy], [cx + 30, cy + 6], [cx + 24, cy]])}" fill="${c1}"/>`
    else if (st === 1) body += `<path d="${circ(cx, cy, 7)} ${circ(cx - 20, cy, 4)} ${circ(cx + 20, cy, 4)}" fill="${c1}"/>`
    else if (st === 2) body += `<path d="${sparklePath(cx, cy, 22, 4, 0.1)}" fill="${c1}"/>`
    else if (st === 3) { const pts: Pt[] = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([cx - gap + t * gap * 2, cy + Math.sin(t * TAU * 2) * 9]) } body += `<path d="${smooth(pts, false)}" fill="none" stroke="${c1}" stroke-width="${sw}" stroke-linecap="round"/>` }
    else body += `<path d="M ${cx} ${cy} C ${cx - 10} ${cy - 30} ${cx - 40} ${cy - 10} ${cx - 22} ${cy} C ${cx - 40} ${cy + 10} ${cx - 10} ${cy + 30} ${cx} ${cy} C ${cx + 10} ${cy - 30} ${cx + 40} ${cy - 10} ${cx + 22} ${cy} C ${cx + 40} ${cy + 10} ${cx + 10} ${cy + 30} ${cx} ${cy} Z" fill="none" stroke="${c1}" stroke-width="${sw}" stroke-linejoin="round"/>`
    return svg(W, H, body)
  },
}

const frame: GenDef = {
  id: 'frame', label: 'Cornice', cat: 'Linee & decori', hint: 'angoli, doppio filo, déco, mirino o francobollo per incorniciare',
  params: [
    { key: 'style', label: 'Stile', type: 'select', options: ['Angoli', 'Doppio filo', 'Art déco', 'Mirino', 'Francobollo'], def: 0 },
    { key: 'ratio', label: 'Proporzione', type: 'range', min: 40, max: 160, def: 125 },
    P.c1('#111111', 'Colore'), P.stroke(4, 16),
  ],
  make: (p) => {
    const H = 400, W = Math.round(H * num(p, 'ratio') / 100), st = num(p, 'style'), sw = num(p, 'sw'), c1 = str(p, 'c1'), m = 16
    const x0 = m, y0 = m, x1 = W - m, y1 = H - m
    const S = (d: string) => `<path d="${d}" fill="none" stroke="${c1}" stroke-width="${sw}" stroke-linecap="square" stroke-linejoin="miter"/>`
    if (st === 0 || st === 3) {
      const L = Math.min(W, H) * (st === 3 ? 0.14 : 0.22)
      let d = `M ${x0} ${y0 + L} L ${x0} ${y0} L ${x0 + L} ${y0} M ${x1 - L} ${y0} L ${x1} ${y0} L ${x1} ${y0 + L} M ${x1} ${y1 - L} L ${x1} ${y1} L ${x1 - L} ${y1} M ${x0 + L} ${y1} L ${x0} ${y1} L ${x0} ${y1 - L}`
      if (st === 3) d += ` M ${W / 2 - 14} ${H / 2} L ${W / 2 + 14} ${H / 2} M ${W / 2} ${H / 2 - 14} L ${W / 2} ${H / 2 + 14}`
      return svg(W, H, S(d))
    }
    if (st === 1) return svg(W, H, S(`M ${x0} ${y0} H ${x1} V ${y1} H ${x0} Z`) + `<path d="M ${x0 + 12} ${y0 + 12} H ${x1 - 12} V ${y1 - 12} H ${x0 + 12} Z" fill="none" stroke="${c1}" stroke-width="${f(sw / 2.5)}"/>`)
    if (st === 2) {
      const c = 34, i = 14
      const oct = `M ${x0 + c} ${y0} H ${x1 - c} L ${x1} ${y0 + c} V ${y1 - c} L ${x1 - c} ${y1} H ${x0 + c} L ${x0} ${y1 - c} V ${y0 + c} Z`
      const inner = `M ${x0 + c + i} ${y0 + i} H ${x1 - c - i} L ${x1 - i} ${y0 + c + i} V ${y1 - c - i} L ${x1 - c - i} ${y1 - i} H ${x0 + c + i} L ${x0 + i} ${y1 - c - i} V ${y0 + c + i} Z`
      const fan = (cx: number, cy: number, dx: number, dy: number) => [0.2, 0.5, 0.8].map(t => `M ${cx} ${cy} L ${f(cx + dx * 44 * (1 - t) + dx * 10)} ${f(cy + dy * 44 * t + dy * 10)}`).join(' ')
      return svg(W, H, S(oct) + `<path d="${inner}" fill="none" stroke="${c1}" stroke-width="${f(sw / 2)}"/>` +
        `<path d="${fan(x0 + i, y0 + i, 1, 1)} ${fan(x1 - i, y0 + i, -1, 1)} ${fan(x0 + i, y1 - i, 1, -1)} ${fan(x1 - i, y1 - i, -1, -1)}" fill="none" stroke="${c1}" stroke-width="${f(sw / 2)}"/>`)
    }
    // francobollo: bordo dentellato con semicerchi lungo i quattro lati
    const tooth = 14
    const nx = Math.max(2, Math.round((x1 - x0) / (tooth * 2))), ny = Math.max(2, Math.round((y1 - y0) / (tooth * 2)))
    const tx = (x1 - x0) / nx, ty = (y1 - y0) / ny, rr = Math.min(tx, ty) * 0.3
    let d = `M ${x0} ${y0}`
    for (let i = 0; i < nx; i++) d += ` L ${f(x0 + i * tx + tx / 2 - rr)} ${y0} A ${f(rr)} ${f(rr)} 0 0 0 ${f(x0 + i * tx + tx / 2 + rr)} ${y0} L ${f(x0 + (i + 1) * tx)} ${y0}`
    for (let i = 0; i < ny; i++) d += ` L ${x1} ${f(y0 + i * ty + ty / 2 - rr)} A ${f(rr)} ${f(rr)} 0 0 0 ${x1} ${f(y0 + i * ty + ty / 2 + rr)} L ${x1} ${f(y0 + (i + 1) * ty)}`
    for (let i = nx - 1; i >= 0; i--) d += ` L ${f(x0 + i * tx + tx / 2 + rr)} ${y1} A ${f(rr)} ${f(rr)} 0 0 0 ${f(x0 + i * tx + tx / 2 - rr)} ${y1} L ${f(x0 + i * tx)} ${y1}`
    for (let i = ny - 1; i >= 0; i--) d += ` L ${x0} ${f(y0 + i * ty + ty / 2 + rr)} A ${f(rr)} ${f(rr)} 0 0 0 ${x0} ${f(y0 + i * ty + ty / 2 - rr)} L ${x0} ${f(y0 + i * ty)}`
    return svg(W, H, `<path d="${d} Z" fill="#ffffff" stroke="${c1}" stroke-width="${f(sw / 3)}"/><rect x="${x0 + 22}" y="${y0 + 22}" width="${f(x1 - x0 - 44)}" height="${f(y1 - y0 - 44)}" fill="none" stroke="${c1}" stroke-width="${f(sw / 2)}"/>`)
  },
}

// ─── TESTO COME GRAFICA ──────────────────────────────────────────────────────

/** Font bitmap 5×7 (stile display LCD/LED). Ogni carattere = 7 righe da 5 bit. */
const DOT_FONT: Record<string, string> = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110', D: '11100 10010 10001 10001 10001 10010 11100',
  E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110', J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 10001 11001 10101 10011 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111', 3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110', 9: '01110 10001 10001 01111 00001 00010 01100',
  ' ': '00000 00000 00000 00000 00000 00000 00000', '!': '00100 00100 00100 00100 00100 00000 00100',
  '?': '01110 10001 00001 00010 00100 00000 00100', '.': '00000 00000 00000 00000 00000 01100 01100',
  ',': '00000 00000 00000 00000 01100 00100 01000', '-': '00000 00000 00000 11111 00000 00000 00000',
  '+': '00000 00100 00100 11111 00100 00100 00000', ':': '00000 01100 01100 00000 01100 01100 00000',
  '/': '00000 00001 00010 00100 01000 10000 00000', '&': '01100 10010 10100 01000 10101 10010 01101',
  '#': '01010 01010 11111 01010 11111 01010 01010', '*': '00000 00100 10101 01110 10101 00100 00000',
  '@': '01110 10001 00001 01101 10101 10101 01110', "'": '00100 00100 01000 00000 00000 00000 00000',
  '%': '11000 11001 00010 00100 01000 10011 00011', '=': '00000 00000 11111 00000 11111 00000 00000',
  '♥': '00000 01010 11111 11111 01110 00100 00000', '★': '00100 00100 11111 01110 01110 11011 10001',
  '<': '00010 00100 01000 10000 01000 00100 00010', '>': '01000 00100 00010 00001 00010 00100 01000',
  '(': '00010 00100 01000 01000 01000 00100 00010', ')': '01000 00100 00010 00010 00010 00100 01000',
  '€': '00111 01000 11110 01000 11110 01000 00111', '$': '00100 01111 10100 01110 00101 11110 00100',
}

function glyphRows(ch: string): number[][] {
  // toglie gli accenti (È → E) prima di cercare il glifo
  const key = ch.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const src = DOT_FONT[key] ?? DOT_FONT[ch] ?? DOT_FONT['?']
  return src.split(' ').map(row => [...row].map(b => (b === '1' ? 1 : 0)))
}

const dotMatrix: GenDef = {
  id: 'dotmatrix', label: 'Dot matrix', cat: 'Testo grafico', hint: 'scritta a LED / tabellone a puntini, con pixel spenti visibili',
  params: [
    P.text('OPEN 24/7'),
    { key: 'dot', label: 'Punto', type: 'select', options: ['Cerchio', 'Quadrato', 'Rombo', 'Croce', 'Stellina'], def: 0 },
    { key: 'size', label: 'Grandezza punto', type: 'range', min: 30, max: 100, def: 78 },
    { key: 'off', label: 'LED spenti', type: 'toggle', def: true },
    { key: 'panel', label: 'Pannello', type: 'toggle', def: true },
    P.c1('#ff6a00', 'Acceso'), P.c2('#2a1408', 'Spento'), P.ink('#0d0d0d', 'Pannello'),
  ],
  make: (p) => {
    const lines = str(p, 'text').split(/\||\n/).map(s => s.trimEnd()).filter(s => s.length)
    if (!lines.length) lines.push(' ')
    // 5 colonne per glifo + 1 di spazio; 7 righe + 1 di interlinea
    const pitch = 14, cols = Math.max(...lines.map(l => [...l].length)) * 6 - 1, rows = lines.length * 8 - 1
    const pad = bool(p, 'panel') ? pitch * 1.5 : pitch * 0.5
    const W = Math.ceil(cols * pitch + pad * 2), H = Math.ceil(rows * pitch + pad * 2)
    const rad = (pitch / 2) * (num(p, 'size') / 100), shape = num(p, 'dot')
    const dotD = (cx: number, cy: number) => {
      if (shape === 1) return poly([[cx - rad, cy - rad], [cx + rad, cy - rad], [cx + rad, cy + rad], [cx - rad, cy + rad]])
      if (shape === 2) return poly([[cx, cy - rad * 1.2], [cx + rad * 1.2, cy], [cx, cy + rad * 1.2], [cx - rad * 1.2, cy]])
      if (shape === 3) { const t = rad * 0.38; return poly([[cx - t, cy - rad], [cx + t, cy - rad], [cx + t, cy - t], [cx + rad, cy - t], [cx + rad, cy + t], [cx + t, cy + t], [cx + t, cy + rad], [cx - t, cy + rad], [cx - t, cy + t], [cx - rad, cy + t], [cx - rad, cy - t], [cx - t, cy - t]]) }
      if (shape === 4) return sparklePath(cx, cy, rad * 1.3, 4, 0.12)
      return circ(cx, cy, rad)
    }
    let on = '', off = ''
    lines.forEach((ln, li) => {
      const chars = [...ln]
      const offsetX = Math.floor((cols - (chars.length * 6 - 1)) / 2)
      const glyphs = chars.map(glyphRows)
      const lastRow = li === lines.length - 1 ? 7 : 8
      for (let r = 0; r < lastRow; r++) for (let c = 0; c < cols; c++) {
        const ci = Math.floor((c - offsetX) / 6), gx = (c - offsetX) % 6
        const lit = r < 7 && c >= offsetX && ci < chars.length && gx < 5 && glyphs[ci][r][gx] === 1
        const d = dotD(pad + c * pitch + pitch / 2, pad + (li * 8 + r) * pitch + pitch / 2)
        if (lit) on += d + ' '; else off += d + ' '
      }
    })
    const panel = bool(p, 'panel') ? `<rect x="0" y="0" width="${W}" height="${H}" rx="${pitch}" ry="${pitch}" fill="${p.ink}"/>` : ''
    return svg(W, H, panel +
      (bool(p, 'off') && off ? `<path d="${off}" fill="${p.c2}"/>` : '') +
      (on ? `<path d="${on}" fill="${p.c1}"/>` : ''))
  },
}

const circleBadgeText: GenDef = {
  id: 'circletext', label: 'Testo circolare', cat: 'Testo grafico', hint: 'scritta che gira in tondo con simbolo al centro (badge rotante)',
  params: [
    P.text('CREATIVE STUDIO • EST. 2026 • '), P.font(0),
    { key: 'size', label: 'Corpo', type: 'range', min: 14, max: 48, def: 30 },
    { key: 'center', label: 'Centro', type: 'select', options: ['Stella', 'Freccia', 'Punto', 'Nessuno'], def: 0 },
    { key: 'disc', label: 'Disco pieno', type: 'toggle', def: false },
    P.c1('#111111', 'Testo'), P.c2('#f1c40f', 'Disco'),
  ],
  make: (p) => {
    const W = 440, c = W / 2, size = num(p, 'size'), R = 180 - size * 0.5, c1 = str(p, 'c1')
    const ctr = num(p, 'center')
    let mid = ''
    if (ctr === 0) mid = `<path d="${sparklePath(c, c, 70, 4, 0.12)}" fill="${c1}"/>`
    else if (ctr === 1) mid = `<path d="M ${c - 50} ${c + 50} L ${c + 50} ${c - 50} M ${c - 10} ${c - 50} L ${c + 50} ${c - 50} L ${c + 50} ${c + 10}" fill="none" stroke="${c1}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`
    else if (ctr === 2) mid = `<circle cx="${c}" cy="${c}" r="22" fill="${c1}"/>`
    return svg(W, W,
      (bool(p, 'disc') ? `<circle cx="${c}" cy="${c}" r="${f(R + size * 0.95)}" fill="${p.c2}"/>` : '') +
      circleText(str(p, 'text'), c, c, R, size, c1, font(p)) + mid)
  },
}

const barcode: GenDef = {
  id: 'barcode', label: 'Codice a barre', cat: 'Testo grafico', hint: 'barcode decorativo con cifre, stile packaging e streetwear',
  params: [
    { key: 'digits', label: 'Cifre', type: 'text', def: '' },
    { key: 'bars', label: 'Barre', type: 'range', min: 20, max: 90, def: 48 },
    { key: 'height', label: 'Altezza', type: 'range', min: 30, max: 100, def: 70 },
    { key: 'vertical', label: 'Verticale', type: 'toggle', def: false },
    P.c1('#111111', 'Inchiostro'),
  ],
  make: (p, seed) => {
    const r = rng(seed), n = num(p, 'bars'), BW = 420, H = 220 * (num(p, 'height') / 100) + 50
    const unit = BW / (n * 2.6)
    let x = 20, d = ''
    for (let i = 0; i < n; i++) {
      const w = unit * (1 + Math.floor(r() * 3)), guard = i < 2 || i > n - 3 || i === Math.floor(n / 2)
      const h = H - (guard ? 18 : 40)
      d += `M ${f(x)} 10 h ${f(w)} v ${f(h)} h ${f(-w)} Z `
      x += w + unit * (1 + Math.floor(r() * 2))
    }
    const W = x + 20
    const digits = str(p, 'digits') || Array.from({ length: 12 }, () => Math.floor(r() * 10)).join('')
    const body = `<path d="${d}" fill="${p.c1}"/><text x="${f(W / 2)}" y="${f(H + 4)}" text-anchor="middle" font-family="Courier New" font-weight="700" font-size="24" letter-spacing="6" fill="${p.c1}">${esc(digits)}</text>`
    if (!bool(p, 'vertical')) return svg(Math.ceil(W), Math.ceil(H + 14), body)
    return svg(Math.ceil(H + 14), Math.ceil(W), `<g transform="translate(${f(H + 14)} 0) rotate(90)">${body}</g>`)
  },
}

// ─── CATALOGO ────────────────────────────────────────────────────────────────

export const GENERATORS: GenDef[] = [
  starburst, seal, rosette, blobSticker, ticket, ribbon, smiley,
  sparkle, sparkleCluster, chromeShape,
  superformula, guilloche, flower, truchet, symbol, identicon,
  squiggle, arrow, handCircle, divider, frame,
  dotMatrix, circleBadgeText, barcode,
]

export const GEN_CATEGORIES = [...new Set(GENERATORS.map(g => g.cat))]

export function defaultValues(g: GenDef): GenValues {
  return Object.fromEntries(g.params.map(p => [p.key, p.def]))
}

/** Applica una palette ai soli parametri colore che il generatore espone. */
export function applyPalette(g: GenDef, values: GenValues, pal: GenPalette): GenValues {
  const out = { ...values }
  for (const p of g.params) {
    if (p.type !== 'color') continue
    if (p.key === 'c1' || p.key === 'c2' || p.key === 'c3' || p.key === 'ink') out[p.key] = pal[p.key]
  }
  // testo su fondo: garantisce leggibilità se la palette ha inchiostro e fondo troppo simili
  if (typeof out.c1 === 'string' && typeof out.ink === 'string' && Math.abs(luma(out.c1) - luma(out.ink)) < 0.25) {
    out.ink = luma(out.c1) > 0.5 ? '#111111' : '#ffffff'
  }
  return out
}

/** Valori casuali "sensati" per l'esplorazione (dado): tocca solo range e select. */
export function randomValues(g: GenDef, values: GenValues, seed: number): GenValues {
  const r = rng(seed ^ 0x9e3779b9)
  const out = { ...values }
  for (const p of g.params) {
    if (p.type === 'range') out[p.key] = Math.round(p.min + r() * (p.max - p.min))
    else if (p.type === 'select' && p.key !== 'font') out[p.key] = Math.floor(r() * p.options.length)
  }
  const pal = GEN_PALETTES[Math.floor(r() * GEN_PALETTES.length)]
  return applyPalette(g, out, pal)
}

export function renderGenerator(g: GenDef, values: GenValues, seed: number): string {
  try {
    return g.make({ ...defaultValues(g), ...values }, seed)
  } catch (e) {
    console.warn('[generative-assets] generatore fallito', g.id, e)
    return svg(10, 10, '')
  }
}

export const svgToDataUri = (s: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`
