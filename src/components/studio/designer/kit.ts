/**
 * Attrezzi comuni alle impaginazioni: griglia a 12 colonne con margini
 * proporzionali, scala tipografica, blocchi di testo misurati e il controllo
 * finale (niente testi sovrapposti o fuori dai margini).
 */
import type { DesignContent, Format, FontSpec, Scene, SceneEl } from './types'
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
export function valid(x: Ctx): boolean {
  const pad = x.m * 0.45
  const boxes = x.els.filter(e => e.kind === 'text').map(e => {
    const t = e as Extract<SceneEl, { kind: 'text' }>
    const left = t.align === 'left' ? t.x : t.align === 'right' ? t.x + t.w - t.tw : t.x + (t.w - t.tw) / 2
    return { name: t.name, x: left, y: t.y, w: t.tw, h: t.h }
  })
  for (const b of boxes) {
    if (b.x < pad - 1 || b.y < pad - 1 || b.x + b.w > x.W - pad + 1 || b.y + b.h > x.H - pad + 1) return false
  }
  const gap = 6 * x.u
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j]
    if (a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap) {
      return false
    }
  }
  return true
}

export function scene(x: Ctx, layout: string, label: string): Scene | null {
  if (!valid(x)) return null
  return { w: x.W, h: x.H, bg: x.s.bg, els: x.els, layout, style: x.s.id, label }
}
