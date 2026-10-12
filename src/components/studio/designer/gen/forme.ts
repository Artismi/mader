/**
 * Vocabolario di forme dei registri: blob morbidi (infantile, pop), linee e
 * cerchi tracciati a mano (zine, avanguardia), stelle e coriandoli, adesivi
 * con contorno spesso e ombra piena, lettere che saltellano e cambiano colore,
 * parola chiave in corsivo (editoriale). Tutto in coordinate della tavola.
 */
import type { SceneEl } from '../types'
import type { G } from './tools'
import { put, textBox, U, txt, type TextOpts } from './tools'
import type { Rng } from './knobs'
import { lineWidth } from '../text'

type Box = { x: number; y: number; w: number; h: number }
const f1 = (n: number) => n.toFixed(1)

/** Curva chiusa morbida per punti (Catmull-Rom → Bézier). */
function smoothClosed(pts: [number, number][]) {
  const n = pts.length
  let d = `M ${f1(pts[0][0])} ${f1(pts[0][1])} `
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C ${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])} `
  }
  return d + 'Z'
}

/** Blob: forma organica nel riquadro (mollezza 0 = quasi tondo, 1 = molto irregolare). */
export function blobPath(r: Rng, b: Box, mollezza = 0.35, punti = 7) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2
  const pts: [number, number][] = []
  for (let i = 0; i < punti; i++) {
    const a = (i / punti) * Math.PI * 2 + r.range(-0.15, 0.15)
    const k = 1 - mollezza * r.range(0, 0.45)
    pts.push([cx + Math.cos(a) * (b.w / 2) * k, cy + Math.sin(a) * (b.h / 2) * k])
  }
  return smoothClosed(pts)
}

/** Linea tracciata a mano: leggera ondulazione e un capo che sfugge. */
export function wobblyPath(r: Rng, x1: number, y1: number, x2: number, y2: number, amp: number) {
  const n = 6, dx = (x2 - x1) / n, dy = (y2 - y1) / n
  const len = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / len, ny = (x2 - x1) / len
  let d = `M ${f1(x1)} ${f1(y1)} `
  for (let i = 1; i <= n; i++) {
    const o = r.range(-amp, amp)
    const px = x1 + dx * i + nx * o, py = y1 + dy * i + ny * o
    const cx = x1 + dx * (i - 0.5) + nx * r.range(-amp, amp), cy = y1 + dy * (i - 0.5) + ny * r.range(-amp, amp)
    d += `Q ${f1(cx)} ${f1(cy)} ${f1(px)} ${f1(py)} `
  }
  return d
}

/** Cerchio a mano attorno a un riquadro (un giro e mezzo, non chiuso). */
export function scribbleEllipse(r: Rng, b: Box) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, rx = b.w / 2 + b.h * 0.35, ry = b.h * 0.85
  const start = r.range(0, Math.PI * 2), turns = 1.15 + r.range(0, 0.25), n = 28
  let d = ''
  for (let i = 0; i <= n; i++) {
    const t = start + (i / n) * turns * Math.PI * 2
    const k = 1 + Math.sin(i * 0.9) * 0.04 + (i / n) * 0.06
    const x = cx + Math.cos(t) * rx * k, y = cy + Math.sin(t) * ry * k
    d += `${i ? 'L' : 'M'} ${f1(x)} ${f1(y)} `
  }
  return d
}

/** Stella a punte (piena). */
export function starPath(cx: number, cy: number, r: number, punte = 5, interno = 0.45, rot = -Math.PI / 2) {
  let d = ''
  for (let i = 0; i < punte * 2; i++) {
    const rr = i % 2 ? r * interno : r, a = rot + (i * Math.PI) / punte
    d += `${i ? 'L' : 'M'} ${f1(cx + Math.cos(a) * rr)} ${f1(cy + Math.sin(a) * rr)} `
  }
  return d + 'Z'
}

/** Riquadri occupati dai testi veri (per non metterci sopra coriandoli e stelle). */
export function textAreas(g: G, pad = 0): Box[] {
  return g.els.filter(e => e.kind === 'text' && !e.deco).map(e => {
    const b = textBox(e as Extract<SceneEl, { kind: 'text' }>)
    return { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad }
  })
}
const hit = (a: Box, list: Box[]) => list.some(b => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)

/**
 * Sparge piccoli elementi (coriandoli, stelline) nelle zone libere: mai sui testi.
 * Si chiama a composizione finita e li mette sotto i testi.
 */
export function scatter(g: G, n: number, make: (x: number, y: number, s: number, i: number) => SceneEl, opts: { size: [number, number]; avoid?: Box[] } = { size: [12, 26] }) {
  const busy = [...textAreas(g, U(g, 14)), ...(opts.avoid ?? [])]
  const out: SceneEl[] = []
  for (let tries = 0; out.length < n && tries < n * 20; tries++) {
    const s = U(g, g.r.range(opts.size[0], opts.size[1]))
    const x = g.r.range(s, g.W - s), y = g.r.range(s, g.H - s)
    const b = { x: x - s, y: y - s, w: 2 * s, h: 2 * s }
    if (hit(b, busy)) continue
    busy.push(b)
    out.push(make(x, y, s, out.length))
  }
  // sotto i testi, sopra il resto
  const firstText = g.els.findIndex(e => e.kind === 'text' && !e.deco)
  g.els.splice(firstText < 0 ? g.els.length : firstText, 0, ...out)
}

/** Coriandoli: rettangolini ruotati e pallini nei colori dati. */
export function confetti(g: G, n: number, colors: string[]) {
  scatter(g, n, (x, y, s, i) => (i % 3 === 0
    ? { kind: 'circle', name: 'coriandolo', cx: x, cy: y, r: s * 0.32, fill: colors[i % colors.length] }
    : { kind: 'rect', name: 'coriandolo', x: x - s * 0.5, y: y - s * 0.18, w: s, h: s * 0.36, r: s * 0.12, fill: colors[i % colors.length], angle: g.r.range(-70, 70) }), { size: [10, 20] })
}

/** Stelline sparse (piene, a 4 o 5 punte). */
export function stars(g: G, n: number, colors: string[]) {
  scatter(g, n, (x, y, s, i) => ({ kind: 'path', name: 'stellina', d: starPath(x, y, s * 0.7, i % 2 ? 4 : 5, i % 2 ? 0.32 : 0.45), fill: colors[i % colors.length] }), { size: [14, 30] })
}

/**
 * Adesivo: riquadro arrotondato con contorno spesso e ombra piena sfalsata, ruotato,
 * con un'etichetta. Il testo è vero (si modifica) e passa dai controlli.
 */
export function sticker(g: G, o: { x: number; y: number; text: string; bg: string; fg: string; ink: string; size: number; angle?: number; font?: TextOpts['font'] }) {
  const font = o.font ?? g.s.label
  const tw = lineWidth(o.text, font, o.size, 0.06)
  const padX = o.size * 0.75, padY = o.size * 0.5
  const w = tw + 2 * padX, h = o.size * 1.13 + 2 * padY
  const a = o.angle ?? 0, sw = Math.max(2, o.size * 0.12), off = o.size * 0.22
  const ar = (a * Math.PI) / 180
  put(g, { kind: 'rect', name: 'adesivo_ombra', x: o.x + off, y: o.y + off, w, h, r: h * 0.3, fill: o.ink, angle: a })
  put(g, { kind: 'rect', name: 'velo_adesivo', x: o.x, y: o.y, w, h, r: h * 0.3, fill: o.bg, stroke: o.ink, sw, angle: a })
  const dx = padX, dy = padY
  txt(g, { name: 'adesivo', lines: [o.text], font, size: o.size, x: o.x + dx * Math.cos(ar) - dy * Math.sin(ar), y: o.y + dx * Math.sin(ar) + dy * Math.cos(ar), color: o.fg, tracking: 0.06, leading: 1, angle: a })
  return { w, h }
}

/** Lettere che saltellano e cambiano colore (registro infantile e pop): stili per lettera. */
export function bounce(lines: string[], colors: string[], amp = 0.06, seed = 0): NonNullable<Extract<SceneEl, { kind: 'text' }>['chars']> {
  let n = seed
  return lines.map(l => [...l].map(ch => (ch === ' ' ? null : { c: colors[n++ % colors.length], dy: (n % 2 ? -1 : 1) * amp })))
}

/** Parola chiave in corsivo (registro editoriale) e/o in un altro colore. */
export function emphasize(lines: string[], word: string, o: { italic?: boolean; color?: string }) {
  const w = word.toLowerCase()
  if (!w) return undefined
  let any = false
  const chars = lines.map(l => {
    const i = l.toLowerCase().indexOf(w)
    return [...l].map((_, ci) => {
      if (i < 0 || ci < i || ci >= i + w.length) return null
      any = true
      return { it: o.italic, c: o.color }
    })
  })
  return any ? chars : undefined
}
