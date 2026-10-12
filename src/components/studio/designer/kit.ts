/**
 * Attrezzi comuni alle impaginazioni: griglia a 12 colonne con margini
 * proporzionali, scala tipografica, blocchi di testo misurati e il controllo
 * finale (niente testi sovrapposti o fuori dai margini).
 */
import type { DesignContent, Format, FontSpec, Palette, Scene, SceneEl } from './types'
import { FORMAT_SIZE } from './types'
import type { Style } from './styles'
import { fit, type Fit } from './text'

export interface Ctx {
  W: number; H: number
  /** unità: 1 = 1px su un lato corto di 1080 */
  u: number
  m: number; g: number
  format: Format
  landscape: boolean
  s: Style
  c: DesignContent
  /** c'è una foto (trovata o data) */
  hasPhoto: boolean
  photo?: string
  colW: (n: number) => number
  colX: (i: number) => number
  els: SceneEl[]
}

export function makeCtx(format: Format, s: Style, c: DesignContent, photo?: string): Ctx {
  const [W, H] = FORMAT_SIZE[format]
  const u = Math.min(W, H) / 1080
  const m = Math.round(84 * u)
  const g = Math.round(24 * u)
  const inner = W - 2 * m
  const col = (inner - 11 * g) / 12
  return {
    W, H, u, m, g, format, landscape: W > H * 1.15, s, c,
    hasPhoto: !!(photo || c.imageUrl || c.imageQuery), photo: photo ?? c.imageUrl,
    colW: n => Math.round(col * n + g * (n - 1)),
    colX: i => Math.round(m + i * (col + g)),
    els: [],
  }
}

/* ── scala ─────────────────────────────────────────────────────────────── */
export const LABEL_TRACK = 0.16

export function label(x: Ctx, text: string | undefined, maxW: number, size = 17): Fit | null {
  if (!text?.trim()) return null
  return fit({ text, font: x.s.label, maxW, maxSize: size * x.u, minSize: 12 * x.u, maxLines: 1, leading: 1.2, tracking: LABEL_TRACK, upper: true })
}

export function title(x: Ctx, text: string, maxW: number, maxH: number, maxSize: number, minSize: number, maxLines: number): Fit | null {
  return fit({
    text, font: x.s.display, maxW, maxH, maxSize: maxSize * x.u, minSize: minSize * x.u, maxLines,
    leading: x.s.displayLeading, tracking: x.s.displayTracking, upper: x.s.displayUpper, balance: true,
  })
}

export function body(x: Ctx, text: string | undefined, maxW: number, maxLines = 3, size = 26): Fit | null {
  if (!text?.trim()) return null
  return fit({ text, font: x.s.text, maxW, maxSize: size * x.u, minSize: 20 * x.u, maxLines, leading: 1.42 })
}

export const detailsLine = (c: DesignContent) => (c.details ?? []).map(d => d.trim()).filter(Boolean).join('  ·  ')
export const ctaText = (c: DesignContent) => (c.cta?.trim() ? `${c.cta.trim()}  →` : '')

/* ── elementi ──────────────────────────────────────────────────────────── */
export function put(x: Ctx, el: SceneEl) { x.els.push(el); return el }

export function text(x: Ctx, name: string, f: Fit, left: number, top: number, w: number, font: FontSpec, color: string,
  align: 'left' | 'center' | 'right' = 'left', leading = 1.42, tracking = 0) {
  // larghezza del box: quella della colonna, il testo è già spezzato
  put(x, { kind: 'text', name, x: left, y: top, w, h: f.h, tw: f.w, lines: f.lines, font, size: f.size, color, align, lineHeight: leading, tracking })
  return top + f.h
}

export const putLabel = (x: Ctx, name: string, f: Fit, left: number, top: number, w: number, color: string, align: 'left' | 'center' | 'right' = 'left') =>
  text(x, name, f, left, top, w, x.s.label, color, align, 1.2, LABEL_TRACK)

export const putTitle = (x: Ctx, f: Fit, left: number, top: number, w: number, color: string, align: 'left' | 'center' | 'right' = 'left') =>
  text(x, 'titolo', f, left, top, w, x.s.display, color, align, x.s.displayLeading, x.s.displayTracking)

export const putBody = (x: Ctx, f: Fit, left: number, top: number, w: number, color: string, align: 'left' | 'center' | 'right' = 'left') =>
  text(x, 'testo', f, left, top, w, x.s.text, color, align, 1.42, 0)

export function hairline(x: Ctx, name: string, x1: number, y: number, x2: number, color: string, width = 1.5) {
  put(x, { kind: 'line', name, x1, y1: y, x2, y2: y, color, width: Math.max(1, width * x.u) })
}

/** Colore con trasparenza da #rrggbb. */
export function alpha(hex: string, a: number) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function lum(hex: string) {
  const h = hex.replace('#', '')
  const v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
}
export const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
/** L'accento se si legge sullo sfondo, altrimenti l'inchiostro. */
export const accentOn = (x: Ctx, bg: string, fallback: string) => (contrast(x.s.accent, bg) >= 3 ? x.s.accent : fallback)

/* ── controllo finale ──────────────────────────────────────────────────── */
/** I testi devono stare dentro la tavola (con un minimo di respiro) e non toccarsi. */
type Box = { x: number; y: number; w: number; h: number }
const touches = (a: Box, b: Box, gap: number) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap

/** Ingombri dei testi (riga più lunga, non la colonna). */
function textBoxes(x: Ctx): Box[] {
  return x.els.filter(e => e.kind === 'text').map(e => {
    const t = e as Extract<SceneEl, { kind: 'text' }>
    const left = t.align === 'left' ? t.x : t.align === 'right' ? t.x + t.w - t.tw : t.x + (t.w - t.tw) / 2
    return { x: left, y: t.y, w: t.tw, h: t.h }
  })
}

/** Ingombro di un dettaglio grafico che non deve mai coprire un testo (null se può stare sotto). */
function decorBox(e: SceneEl): Box | null {
  if (e.kind === 'seal') return { x: e.cx - e.r, y: e.cy - e.r, w: 2 * e.r, h: 2 * e.r }
  if (e.kind === 'glyph') return { x: e.cx - e.size / 2, y: e.cy - e.size / 2, w: e.size, h: e.size }
  if (e.kind === 'ornament' && !e.under) return { x: e.x, y: e.y, w: e.w, h: e.h }
  return null
}

/** I testi devono stare dentro la tavola (con un minimo di respiro), non toccarsi e non stare sotto i dettagli grafici. */
export function valid(x: Ctx): boolean {
  const pad = x.m * 0.45
  const texts = textBoxes(x)
  for (const b of texts) {
    if (b.x < pad - 1 || b.y < pad - 1 || b.x + b.w > x.W - pad + 1 || b.y + b.h > x.H - pad + 1) return false
  }
  const gap = 6 * x.u
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) if (touches(texts[i], texts[j], gap)) return false
  for (const e of x.els) { const d = decorBox(e); if (d && texts.some(t => touches(d, t, 10 * x.u))) return false }
  return true
}

/** Toglie i dettagli grafici che toccano un testo: meglio una tavola più sobria che un testo coperto. */
function pruneDecor(x: Ctx) {
  const texts = textBoxes(x)
  x.els = x.els.filter(e => { const d = decorBox(e); return !d || !texts.some(t => touches(d, t, 10 * x.u)) })
}

export function scene(x: Ctx, layout: string, label: string): Scene | null {
  pruneDecor(x)
  if (!valid(x)) return null
  const d = x.s.decor
  // la foto prende il look pellicola dello stile
  for (const e of x.els) if (e.kind === 'image' && e.url && !e.look) { e.look = d.look; e.adjust = { ...d.adjust, ...(e.adjust ?? {}) } }
  return {
    w: x.W, h: x.H, bg: x.s.bg, els: x.els, layout, style: x.s.id, label,
    palette: { bg: x.s.bg, ink: x.s.ink, accent: x.s.accent, muted: x.s.muted, surface: x.s.surface },
    finish: { ids: d.finishes, seed: `${x.c.title}|${layout}`, fallback: d.fallback },
  }
}

/* ── dettagli grafici: ornamenti del laboratorio, glifi, sigilli ───────── */
const hash = (t: string) => [...t].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7) >>> 0

/** Seme del contenuto: stesso testo, stessi dettagli; testo diverso, tavola diversa. */
export const seedOf = (x: Ctx, salt = '') => hash(`${x.c.brand ?? ''}|${x.c.title}|${salt}`)

/** Sceglie dall'elenco in modo deterministico per contenuto e impaginazione. */
export const pickFor = <T,>(x: Ctx, list: T[], salt: string): T => list[seedOf(x, salt) % list.length]

export function ornament(x: Ctx, name: string, box: Box, opts: { salt: string; opacity?: number; under?: boolean; id?: string; r?: number; pal?: Palette; prefer?: string[] }) {
  // un ornamento piccolo sembra un adesivo messo a caso: solo se c'è spazio vero
  if (!opts.under && (box.w < 150 * x.u || box.h < 110 * x.u)) return
  if (box.w < 40 * x.u || box.h < 40 * x.u) return
  // `prefer`: forme che reggono in quella zona (es. geometriche in un blocco piccolo), tra quelle dello stile
  const pool = opts.prefer ? x.s.decor.ornaments.filter(o => opts.prefer!.includes(o)) : x.s.decor.ornaments
  if (!opts.id && !pool.length) return
  const id = opts.id ?? pickFor(x, pool, opts.salt)
  const el: SceneEl = { kind: 'ornament', name, id, x: box.x, y: box.y, w: box.w, h: box.h, seed: seedOf(x, opts.salt), opacity: opts.opacity ?? 1, under: opts.under, r: opts.r, pal: opts.pal }
  // la trama "sotto" va prima dei testi, gli altri dettagli sopra lo sfondo nell'ordine dato
  const firstText = x.els.findIndex(e => e.kind === 'text')
  if (opts.under && firstText >= 0) x.els.splice(firstText, 0, el)
  else put(x, el)
}

export function glyph(x: Ctx, name: string, cx: number, cy: number, size: number, color: string, salt: string, angle = 0) {
  put(x, { kind: 'glyph', name, path: pickFor(x, x.s.decor.glyphs, salt), cx, cy, size, color, angle })
}

/** Sigillo con brand e occhiello (o primo dettaglio) che girano attorno a un glifo. */
export function seal(x: Ctx, cx: number, cy: number, r: number, color: string, salt: string, bg?: string) {
  const words = [x.c.brand, x.c.kicker ?? x.c.details?.[0]].filter(Boolean) as string[]
  if (!words.length) return
  const text = `${words.join('  ·  ')}  ·  `.toUpperCase()
  put(x, { kind: 'seal', name: 'sigillo', cx, cy, r, text, color, font: x.s.label, glyph: pickFor(x, x.s.decor.glyphs, salt), bg })
}
