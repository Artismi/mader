/**
 * Attrezzi dei sistemi generativi: palette derivata dai regolatori, testo misurato
 * (anche ruotato, a contorno, a tutta larghezza), trattamenti foto del motore
 * effetti, segni di stampa e il controllo finale di leggibilità.
 */
import type { DesignContent, FontSpec, Format, FxSpec, Scene, SceneEl } from '../types'
import { FORMAT_SIZE } from '../types'
import type { Style } from '../styles'
import { fit, lineWidth, blockHeight, type Fit, type FitOpts } from '../text'
import { type Knobs, type Rng, rng, hashText } from './knobs'
import { misure, type Misure } from '../core/misure'
import { scala, rapportoDa, type Scala, type Voce } from '../core/scala'
import { spazi } from './spazi'
import { opticalLeft, topForCaps } from '../core/metriche'
import { bounce, emphasize } from './forme'
import { conSpecifica, specializza } from './specializza'

export interface Pal { bg: string; fg: string; acc: string; acc2: string; sec: string; srf: string; dark: boolean }

export interface G {
  W: number; H: number; u: number
  /** margine base e canale (dalle misure) */
  m: number; g: number
  /** limiti verticali del messaggio: nella storia escludono le zone coperte dall'interfaccia */
  T: number; B: number
  ms: Misure
  sc: Scala
  format: Format; landscape: boolean; portrait: boolean
  s: Style; k: Knobs; c: DesignContent; photo?: string
  r: Rng
  P: Pal
  els: SceneEl[]
  /** pixel della foto, se caricata */
  pix?: Pix
  /** posizione nella sequenza (carosello): paginazione, ponte con la slide accanto, freccia in copertina */
  seq?: Seq
  /** misure di lettura raccolte dal controllo (per il critico): punti buoni e contrasto medio di ogni testo */
  letture?: { name: string; ok: number; contrasto: number; big: boolean }[]
}

export interface Seq { i: number; n: number; ponte?: { destra?: boolean; sinistra?: boolean }; colore: string; specchio?: boolean }

/* ── colore ───────────────────────────────────────────────────────────── */
const rgb = (hex: string) => { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const hex = (c: number[]) => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
export const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)) }
export const alpha = (h: string, a: number) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})` }
export function lum(h: string) {
  const v = rgb(h).map(c => c / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
}
export const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
/** Il primo colore che si legge sullo sfondo (soglia di contrasto), altrimenti il più contrastato. */
export const readable = (bg: string, list: string[], min = 4.5) => list.find(c => contrast(c, bg) >= min) ?? [...list].sort((a, b) => contrast(b, bg) - contrast(a, bg))[0]
export const darker = (a: string, b: string) => (lum(a) < lum(b) ? a : b)
export const lighter = (a: string, b: string) => (lum(a) < lum(b) ? b : a)

function palette(s: Style, inverti: boolean): Pal {
  if (!inverti) return { bg: s.bg, fg: s.ink, acc: s.accent, acc2: s.accent2, sec: s.muted, srf: s.surface, dark: s.dark }
  const bg = s.accent
  const fg = readable(bg, [s.onAccent, s.ink, s.bg, '#111111', '#ffffff'])
  const acc = readable(bg, [s.accent2, s.bg, fg], 2.2)
  return { bg, fg, acc, acc2: s.bg, sec: mix(fg, bg, 0.3), srf: mix(bg, fg, 0.12), dark: lum(bg) < 0.25 }
}

export function makeG(format: Format, s0: Style, k0: Knobs, c: DesignContent, photo?: string, pix?: Pix, seq?: Seq): G {
  const [W, H] = FORMAT_SIZE[format]
  // la specifica di progetto del brief orienta decori, foto ed enfasi
  const { s, k } = conSpecifica(s0, k0, c)
  const ms = misure(format)
  return {
    W, H, u: ms.u, m: ms.m.l, g: ms.gut, T: ms.safe.y, B: ms.safe.y + ms.safe.h, ms, sc: scala(ms, rapportoDa(k.scala), format),
    format, landscape: W > H * 1.15, portrait: H > W * 1.15,
    s, k, c, photo: photo ?? c.imageUrl,
    r: rng(k.seme ^ hashText(`${c.title}|${k.sistema}`)),
    P: palette(s, k.inverti), els: [], pix, seq, letture: [],
  }
}

export const put = <T extends SceneEl>(g: G, el: T): T => { g.els.push(el); return el }
export const U = (g: G, n: number) => Math.round(n * g.u)

/* ── testo ────────────────────────────────────────────────────────────── */
export const up = (t: string, on?: boolean) => (on ? t.toUpperCase() : t)

/** Dimensione con cui una riga occupa esattamente `w`. */
export function sizeForWidth(text: string, font: FontSpec, w: number, tracking = 0) {
  const base = 100
  return (base * w) / Math.max(1, lineWidth(text, font, base, tracking))
}

export interface TextOpts {
  name: string; lines: string[]; font: FontSpec; size: number; x: number; y: number; color: string
  align?: 'left' | 'center' | 'right'; w?: number; leading?: number; tracking?: number; angle?: number
  hollow?: boolean; stroke?: string; sw?: number; deco?: boolean; sovrapponibile?: boolean
  blend?: GlobalCompositeOperation; opacity?: number; fx?: FxSpec[]
  chars?: Extract<SceneEl, { kind: 'text' }>['chars']
}

/** Testo misurato (righe già decise). */
export function txt(g: G, o: TextOpts) {
  const tracking = o.tracking ?? 0, leading = o.leading ?? 1.1
  const tw = Math.max(...o.lines.map(l => lineWidth(l, o.font, o.size, tracking)))
  return put(g, {
    kind: 'text', name: o.name, x: o.x, y: o.y, w: o.w ?? tw, h: blockHeight(o.size, o.lines.length, leading), tw,
    lines: o.lines, font: o.font, size: o.size, color: o.color, align: o.align ?? 'left', lineHeight: leading, tracking,
    angle: o.angle, hollow: o.hollow, stroke: o.stroke ?? (o.hollow ? o.color : undefined), sw: o.sw, deco: o.deco, sovrapponibile: o.sovrapponibile,
    blend: o.blend, opacity: o.opacity, fx: o.fx, chars: o.chars,
  })
}

/** Etichetta maiuscola spaziata, ridotta se non entra. */
/** Il titolo usa un graziato? (spaziatura e interlinea diverse dai bastoni) */
const SERIF = /Fraunces|Serif|Garamond|Bodoni|Playfair|Cormorant|Lora|Libre Baskerville/i
export const voceTitolo = (font: FontSpec): Voce => (SERIF.test(font.family) ? 'titoloGraziato' : 'titolo')

/**
 * Adatta il testo con spaziatura e interlinea della scala: si misura al corpo
 * massimo, poi si ricalcola al corpo trovato (le correzioni ottiche dipendono dal corpo).
 */
function fitScaled(g: G, o: Omit<FitOpts, 'tracking' | 'leading'>, voce: Voce, upper = false): Fit | null {
  const first = fit({ ...o, tracking: g.sc.tracking(o.maxSize, voce), leading: g.sc.leading(o.maxSize, voce, upper) })
  if (!first) return null
  const again = fit({ ...o, maxSize: first.size, tracking: g.sc.tracking(first.size, voce), leading: g.sc.leading(first.size, voce, upper) })
  return again && again.size >= first.size * 0.97 ? again : first
}

/** Etichetta maiuscola spaziata: mai sotto il corpo delle note (leggibile sul telefono); `lettura` se fa da voce o testo. */
export function lab(g: G, text: string | undefined, maxW: number, size = 0, lettura = false): Fit | null {
  if (!text?.trim()) return null
  const min = lettura ? g.sc.minLettura : g.sc.minNota
  return fitScaled(g, { text, font: g.s.label, maxW, maxSize: Math.max(size * g.u, g.sc.note, min), minSize: min, maxLines: 1, upper: true }, 'etichetta', true)
}
/** Testo corrente: parte dal corpo della scala, non scende sotto il minimo di lettura (se non entra, null). */
export function para(g: G, text: string | undefined, maxW: number, maxLines = 3, size = 0): Fit | null {
  if (!text?.trim()) return null
  return fitScaled(g, { text, font: g.s.text, maxW, maxSize: Math.max(size * g.u, g.sc.testo), minSize: g.sc.minLettura, maxLines }, 'testo')
}
export function display(g: G, text: string, maxW: number, maxH: number, maxSize: number, minSize: number, maxLines: number, upper = g.s.displayUpper): Fit | null {
  return fitScaled(g, { text, font: g.s.display, maxW, maxH, maxSize: maxSize * g.u, minSize: Math.max(minSize * g.u, g.sc.attacco), maxLines, upper, balance: true }, voceTitolo(g.s.display), !!upper)
}
export const putLab = (g: G, name: string, f: Fit, x: number, y: number, color: string, align: 'left' | 'center' | 'right' = 'left', w = f.w, extra: Partial<TextOpts> = {}) =>
  txt(g, { name, lines: f.lines, font: g.s.label, size: f.size, x, y, color, align, w, leading: f.leading ?? 1.25, tracking: f.tracking ?? 0.14, ...extra })
export const putPara = (g: G, name: string, f: Fit, x: number, y: number, color: string, align: 'left' | 'center' | 'right' = 'left', w = f.w) =>
  txt(g, { name, lines: f.lines, font: g.s.text, size: f.size, x, y, color, align, w, leading: f.leading ?? 1.43 })
/**
 * Titolo. `caps`: y è la sommità delle maiuscole (non il box), come allinea un
 * tipografo; a sinistra il rientro ottico porta l'inchiostro sul margine.
 */
export const putDisplay = (g: G, name: string, f: Fit, x: number, y: number, color: string, align: 'left' | 'center' | 'right' = 'left', w = f.w, extra: Partial<TextOpts> & { caps?: boolean; su?: string } = {}) => {
  const leading = f.leading ?? g.s.displayLeading
  const { caps, su, ...rest } = extra
  const yy = caps ? topForCaps(y, g.s.display, f.size, leading) : y
  const xx = align === 'left' && !rest.angle ? x + opticalLeft(f.lines[0], g.s.display, f.size) : x
  // il titolo prende l'accento del registro sulla parola chiave
  // `su`: il colore che il titolo ha sotto (fascia, barra), se non è il fondo
  const chars = rest.chars ?? (name.startsWith('titolo') ? accentChars(g, f.lines, color, su ?? g.P.bg) : undefined)
  return txt(g, { name, lines: f.lines, font: g.s.display, size: f.size, x: xx, y: yy, color, align, w, leading, tracking: f.tracking ?? g.s.displayTracking, ...rest, chars })
}

/**
 * Accento del registro sul titolo: lettere che saltellano in più colori
 * (infantile), parola chiave in corsivo (editoriale, lusso, artigianale) o
 * nel colore d'accento (gli altri). I colori devono leggersi sul fondo.
 */
export function accentChars(g: G, lines: string[], base: string, bg = g.P.bg) {
  const { s, P } = g
  if (s.accento === 'saltello') {
    const cols = [P.acc, base, P.acc2].filter(c => contrast(c, bg) >= 2.4)
    return bounce(lines, cols.length > 1 ? cols : [base], 0.05, g.k.seme % 3)
  }
  const key = keyword(g)
  if (s.accento === 'corsivo') return emphasize(lines, key, { italic: true })
  const acc = readable(bg, [P.acc, P.acc2], 2.4)
  return contrast(acc, bg) >= 2.4 && acc !== base ? emphasize(lines, key, { color: acc }) : undefined
}

export const detailsLine = (c: DesignContent) => (c.details ?? []).map(d => d.trim()).filter(Boolean).join('  ·  ')
export const ctaText = (c: DesignContent) => (c.cta?.trim() ? `${c.cta.trim()}  →` : '')
export const words = (t: string) => t.trim().split(/\s+/).filter(Boolean)

/** Parola da evidenziare: quella indicata, altrimenti la più lunga del titolo. */
export function keyword(g: G) {
  const ws = words(g.c.title).map(w => w.replace(/[.,;:!?«»"]/g, ''))
  const e = g.k.enfasi?.trim().toLowerCase()
  const hit = e ? ws.find(w => w.toLowerCase() === e) ?? ws.find(w => w.toLowerCase().startsWith(e)) : undefined
  return hit ?? [...ws].sort((a, b) => b.length - a.length)[0] ?? g.c.title
}

/** Divide il titolo in righe corte per le pile tipografiche: parole brevi si uniscono alla successiva. */
export function stackLines(title: string, maxLines: number) {
  const ws = words(title)
  const out: string[] = []
  for (const w of ws) {
    const last = out[out.length - 1]
    if (last && (last.length <= 3 || w.length <= 2) && (last + ' ' + w).length <= 12) out[out.length - 1] = `${last} ${w}`
    else out.push(w)
  }
  while (out.length > maxLines) {
    // unisce la coppia di righe adiacenti più corta
    let best = 0
    for (let i = 1; i < out.length - 1; i++) if (out[i].length + out[i + 1].length < out[best].length + out[best + 1].length) best = i
    out.splice(best, 2, `${out[best]} ${out[best + 1]}`)
  }
  return out
}

/**
 * Blocco informativo (occhiello, testo, dettagli, invito) misurato prima di
 * piazzarlo: chi lo usa sa quanto spazio prende.
 */
export function infoBlock(g: G, w: number, opts: { kicker?: boolean; body?: boolean; details?: boolean; cta?: boolean; bodyLines?: number; bodySize?: number } = {}) {
  const o = { kicker: true, body: true, details: true, cta: true, ...opts }
  const parts: { f: Fit; kind: 'lab' | 'para'; role: string; gap: number }[] = []
  const k = o.kicker ? lab(g, g.c.kicker, w) : null
  // distanze dalla scala: le cose legate più vicine (occhiello e testo) di quelle separate (testo e dettagli)
  if (k) parts.push({ f: k, kind: 'lab', role: 'occhiello', gap: g.sc.spazio(2) })
  const b = o.body ? para(g, g.c.body, w, opts.bodyLines ?? 3, opts.bodySize ?? 0) : null
  if (b) parts.push({ f: b, kind: 'para', role: 'testo', gap: g.sc.spazio(3) })
  const d = o.details ? lab(g, detailsLine(g.c), w) : null
  if (d) parts.push({ f: d, kind: 'lab', role: 'dettagli', gap: g.sc.spazio(2) })
  const c = o.cta ? lab(g, ctaText(g.c), w) : null
  if (c) parts.push({ f: c, kind: 'lab', role: 'invito', gap: 0 })
  if (parts.length) parts[parts.length - 1].gap = 0
  const h = parts.reduce((n, p) => n + p.f.h + p.gap, 0)
  return {
    h, w,
    place(x: number, y: number, colors: { fg: string; sec: string; acc: string }, align: 'left' | 'center' | 'right' = 'left') {
      let yy = y
      for (const p of parts) {
        const color = p.role === 'occhiello' || p.role === 'invito' ? colors.acc : p.role === 'testo' ? colors.fg : colors.sec
        if (p.kind === 'lab') putLab(g, p.role, p.f, x, yy, color, align, w)
        else putPara(g, p.role, p.f, x, yy, color, align, w)
        yy += p.f.h + p.gap
      }
      return yy
    },
  }
}

/* ── foto ─────────────────────────────────────────────────────────────── */
/** Trattamento della foto secondo il regolatore, nei colori della tavola. */
export function treat(g: G, opts: { paper?: string; ink?: string } = {}): { look?: string; adjust?: Record<string, number>; fx?: FxSpec[] } {
  const { P, s } = g
  const dk = darker(P.bg, P.fg), lt = lighter(P.bg, P.fg)
  const ink = opts.ink ?? dk, paper = opts.paper ?? lt
  switch (g.k.trattamento) {
    case 'duotone': return { fx: [{ id: 'gradientMap', variant: 'duotone', p: { c1: ink, c2: P.acc, three: 0, contrast: 25 } }] }
    case 'retino': return { fx: [{ id: 'halftone', variant: 'giornale', p: { mode: 0, ink, paper, paperOn: 1, size: Math.round(5 + g.k.densita * 6), angle: 45 } }] }
    case 'riso': return { fx: [{ id: 'riso', p: { ink1: P.acc, ink2: P.acc2 === P.bg ? ink : P.acc2, paper, reg1: Math.round(1 + g.k.sovrastampa * 4), reg2: Math.round(2 + g.k.sovrastampa * 9), texture: 55 } }] }
    case 'serigrafia': return { fx: [{ id: 'screenprint', p: { c1: ink, c2: P.acc, c3: paper, offset: Math.round(1 + g.k.sovrastampa * 5) } }] }
    case 'bn': return { look: 'trix', adjust: { grain: 40 } }
    case 'poster': return { fx: [{ id: 'posterize', variant: 'tre' }, { id: 'gradientMap', p: { c1: ink, c2: P.acc, c3: paper, three: 1 } }] }
    default: return { look: s.decor.look, adjust: { ...s.decor.adjust } }
  }
}

/** Foto (o, senza foto, un riempimento generativo nei colori della tavola). */
export function photo(g: G, name: string, box: { x: number; y: number; w: number; h: number }, extra: Partial<Extract<SceneEl, { kind: 'image' }>> = {}) {
  const t = treat(g)
  if (g.photo) {
    return put(g, { kind: 'image', name, ...box, url: g.photo, fallback: g.P.srf, look: t.look, adjust: t.adjust, ...extra, fx: extra.fx ?? t.fx })
  }
  // senza foto: superficie generativa (il riempimento del laboratorio) con la stessa forma
  const { P } = g
  const fx: FxSpec[] = [{ id: 'genFill', p: { mode: g.r.pick([0, 1, 3, 4]), c1: P.acc, c2: P.acc2, c3: P.srf, c4: darker(P.bg, P.fg), grain: 30, warp: 60, scale: 120 } }]
  if (extra.clipText) return put(g, { kind: 'image', name, ...box, fallback: P.acc, clipText: extra.clipText, fx })
  if (extra.shape === 'circle') return put(g, { kind: 'circle', name, cx: box.x + box.w / 2, cy: box.y + box.h / 2, r: Math.min(box.w, box.h) / 2, fill: P.acc, fx, blend: extra.blend, opacity: extra.opacity })
  return put(g, { kind: 'rect', name, ...box, fill: P.acc, fx, blend: extra.blend, opacity: extra.opacity })
}

/* ── segni ────────────────────────────────────────────────────────────── */
/** Crocini di taglio agli angoli e un segno di registro: la tavola sembra uscita da una tipografia. */
export function printMarks(g: G, color: string) {
  const L = U(g, 26), o = U(g, 22), w = Math.max(1, 1.4 * g.u)
  for (const [x, y, sx, sy] of [[o, o, 1, 1], [g.W - o, o, -1, 1], [o, g.H - o, 1, -1], [g.W - o, g.H - o, -1, -1]]) {
    put(g, { kind: 'line', name: 'crocino', x1: x, y1: y, x2: x + sx * L, y2: y, color, width: w })
    put(g, { kind: 'line', name: 'crocino', x1: x, y1: y, x2: x, y2: y + sy * L, color, width: w })
  }
}
export function regMark(g: G, cx: number, cy: number, r: number, color: string) {
  put(g, { kind: 'circle', name: 'registro', cx, cy, r, fill: 'transparent', stroke: color, sw: Math.max(1, 1.4 * g.u) })
  put(g, { kind: 'line', name: 'registro', x1: cx - r * 1.6, y1: cy, x2: cx + r * 1.6, y2: cy, color, width: Math.max(1, 1.4 * g.u) })
  put(g, { kind: 'line', name: 'registro', x1: cx, y1: cy - r * 1.6, x2: cx, y2: cy + r * 1.6, color, width: Math.max(1, 1.4 * g.u) })
}

/** Nastro con una scritta che si ripete (esce dalla tavola: decorativo). */
export function ticker(g: G, name: string, text: string, y: number, h: number, bg: string, color: string, angle = 0) {
  const pad = U(g, 400)
  put(g, { kind: 'rect', name: `${name}_fondo`, x: -pad, y, w: g.W + 2 * pad, h, fill: bg, angle })
  const size = h * 0.42
  const unit = `${text.toUpperCase()}  ✦  `
  const one = lineWidth(unit, g.s.label, size, 0.14)
  const reps = Math.ceil((g.W + 2 * pad) / Math.max(1, one)) + 1
  // il testo ruota attorno allo stesso angolo del nastro
  const a = (angle * Math.PI) / 180, off = (h - size * 1.13) / 2
  txt(g, { name: `${name}_testo`, lines: [unit.repeat(reps)], font: g.s.label, size, x: -pad - Math.sin(a) * off, y: y + Math.cos(a) * off, color, tracking: 0.14, angle, deco: true })
}

/** Campo di puntini che crescono lungo una direzione (retino a mano): un solo tracciato. */
export function dotField(g: G, name: string, box: { x: number; y: number; w: number; h: number }, step: number, color: string, dir: 'x' | 'y' | 'r' = 'y', blend?: GlobalCompositeOperation) {
  let d = ''
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2, R = Math.hypot(box.w, box.h) / 2
  for (let y = box.y + step / 2; y < box.y + box.h; y += step) {
    for (let x = box.x + step / 2; x < box.x + box.w; x += step) {
      const t = dir === 'x' ? (x - box.x) / box.w : dir === 'y' ? (y - box.y) / box.h : 1 - Math.hypot(x - cx, y - cy) / R
      const r = step * 0.5 * Math.max(0, Math.min(1, t)) ** 1.2
      if (r < 0.6) continue
      d += `M ${(x - r).toFixed(1)} ${y.toFixed(1)} a ${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0 a ${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0 `
    }
  }
  if (d) put(g, { kind: 'path', name, d, fill: color, blend })
}

/** Grana sopra tutto: un grigio neutro in sovrapposizione con la trama del motore. */
export function grainTop(g: G) {
  if (g.k.grana < 0.05) return
  put(g, { kind: 'rect', name: 'grana', x: 0, y: 0, w: g.W, h: g.H, fill: '#808080', blend: 'overlay', opacity: 0.35 + g.k.grana * 0.6, fx: [{ id: 'textureOverlay', variant: 'grana', p: { opacity: 100, blend: 0, scale: 80 + g.k.grana * 80 } }] })
}

/** Motivo di uno scarto: per il banco di prova (scripts/designer) e per il debug. */
/** Motivo dell'ultimo scarto (il motore decide se accorciare il contenuto e riprovare). */
export const scarti = { ultimo: '' }
export function discard(g: G, why: string): false {
  scarti.ultimo = why
  const gl = globalThis as { __designerDebug?: boolean; __designerSink?: string[] }
  if (gl.__designerSink) gl.__designerSink.push(`${g.k.sistema}: ${why}`)
  if (gl.__designerDebug) console.log('[designer] scartata:', g.k.sistema, why)
  return false
}

/* ── controllo ────────────────────────────────────────────────────────── */
type Box = { x: number; y: number; w: number; h: number }
const touches = (a: Box, b: Box, gap: number) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap

/** Ingombro reale di un testo (riga più lunga, rotazione compresa). */
export function textBox(t: Extract<SceneEl, { kind: 'text' }>): Box {
  const left = t.align === 'left' ? 0 : t.align === 'right' ? t.w - t.tw : (t.w - t.tw) / 2
  const a = ((t.angle ?? 0) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a)
  const pts = [[left, 0], [left + t.tw, 0], [left, t.h], [left + t.tw, t.h]].map(([px, py]) => [t.x + px * ca - py * sa, t.y + px * sa + py * ca])
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}

/** Angoli del testo ruotato (riga più lunga), allargati di `pad`. */
export function corners(t: Extract<SceneEl, { kind: 'text' }>, pad: number): [number, number][] {
  const left = t.align === 'left' ? 0 : t.align === 'right' ? t.w - t.tw : (t.w - t.tw) / 2
  const a = ((t.angle ?? 0) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a)
  return [[left - pad, -pad], [left + t.tw + pad, -pad], [left + t.tw + pad, t.h + pad], [left - pad, t.h + pad]].map(([px, py]) => [t.x + px * ca - py * sa, t.y + px * sa + py * ca])
}
/** Due rettangoli orientati si toccano? (assi separatori) */
export function obbTouch(A: [number, number][], B: [number, number][]) {
  for (const P of [A, B]) for (let i = 0; i < 4; i++) {
    const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % 4]
    const nx = y1 - y2, ny = x2 - x1
    const pa = A.map(([x, y]) => x * nx + y * ny), pb = B.map(([x, y]) => x * nx + y * ny)
    if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false
  }
  return true
}

/** Testi leggibili dentro la tavola e mai sovrapposti tra loro; sigilli e glifi non li coprono. */
export function check(g: G): boolean {
  const pad = g.m * 0.4
  const texts = g.els.filter(e => e.kind === 'text' && !e.deco).map(e => textBox(e as Extract<SceneEl, { kind: 'text' }>))
  const dbg = (why: string) => discard(g, why)
  for (const [i, b] of texts.entries()) if (b.x < pad - 1 || b.y < pad - 1 || b.x + b.w > g.W - pad + 1 || b.y + b.h > g.H - pad + 1) return dbg(`fuori bordo ${i} ${JSON.stringify(b)}`)
  // storia: il messaggio sta fuori dalle zone coperte dall'interfaccia (nome del profilo, barra delle risposte)
  if (g.format === 'storia') for (const [i, b] of texts.entries()) if (b.y < g.T - 4 * g.u || b.y + b.h > g.B + 4 * g.u) return dbg(`fuori dalla zona sicura ${i}`)
  // le righe di una stessa pila (nome "titolo#1", "titolo#2"…) possono stringersi tra loro
  const groups = g.els.filter(e => e.kind === 'text' && !e.deco).map(e => (e.name.includes('#') ? e.name.split('#')[0] : `${e.name}@${Math.random()}`))
  const gap = 6 * g.u
  const polys = g.els.filter(e => e.kind === 'text' && !e.deco).map(e => corners(e as Extract<SceneEl, { kind: 'text' }>, gap / 2))
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) if (groups[i] !== groups[j] && obbTouch(polys[i], polys[j])) return dbg(`sovrapposti ${groups[i]} ${groups[j]}`)
  g.els = g.els.filter(e => {
    const d = e.kind === 'seal' ? { x: e.cx - e.r, y: e.cy - e.r, w: 2 * e.r, h: 2 * e.r } : e.kind === 'glyph' ? { x: e.cx - e.size / 2, y: e.cy - e.size / 2, w: e.size, h: e.size } : null
    return !d || !texts.some(t => touches(d, t, 8 * g.u))
  })
  return true
}

/** Pixel della foto (ridotta) per sapere cosa c'è davvero sotto un testo. */
export interface Pix { w: number; h: number; data: Uint8ClampedArray }

const rl = (r: number, g2: number, b: number) => { const v = [r, g2, b].map(c => c / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] }
const toHex = (r: number, g2: number, b: number) => '#' + [r, g2, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')

/** Colore medio e "movimento" (deviazione della luminanza) della foto in un punto della tavola. */
function sampleImage(g: G, e: Extract<SceneEl, { kind: 'image' }>, px: number, py: number): { color: string; busy: number } | null {
  const pix = g.pix
  if (!pix) return null
  const v = e.view ?? { x: e.x, y: e.y, w: e.w, h: e.h }
  const sc = Math.max(v.w / pix.w, v.h / pix.h)
  const sx = (pix.w - v.w / sc) / 2 + (px - v.x) / sc, sy = (pix.h - v.h / sc) / 2 + (py - v.y) / sc
  const rad = Math.max(1, Math.round(pix.w / 40))
  let R = 0, Gc = 0, B = 0, n = 0
  const ls: number[] = []
  for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
    const x = Math.round(sx + dx), y = Math.round(sy + dy)
    if (x < 0 || y < 0 || x >= pix.w || y >= pix.h) continue
    const o = (y * pix.w + x) * 4
    R += pix.data[o]; Gc += pix.data[o + 1]; B += pix.data[o + 2]; n++
    ls.push(Math.sqrt(rl(pix.data[o], pix.data[o + 1], pix.data[o + 2])))
  }
  if (!n) return null
  const mean = ls.reduce((a, b) => a + b, 0) / ls.length
  const busy = Math.sqrt(ls.reduce((a, b) => a + (b - mean) ** 2, 0) / ls.length)
  let color = toHex(R / n, Gc / n, B / n)
  // il trattamento cambia i colori: si stima il risultato dalla luminanza
  const l = Math.sqrt(rl(R / n, Gc / n, B / n))
  const f = e.fx?.[0]
  const P = (f?.p ?? {}) as Record<string, string | number>
  const str = (k: string, d: string) => (typeof P[k] === 'string' ? P[k] as string : d)
  if (f?.id === 'gradientMap') color = P.three ? (l < 0.5 ? mix(str('c1', '#000000'), str('c2', '#888888'), l * 2) : mix(str('c2', '#888888'), str('c3', '#ffffff'), l * 2 - 1)) : mix(str('c1', '#000000'), str('c2', '#ffffff'), l)
  else if (f?.id === 'halftone') color = mix(str('ink', '#111111'), str('paper', '#ffffff'), l)
  else if (f?.id === 'riso') color = mix(str('ink2', '#222222'), str('paper', '#ffffff'), l)
  else if (f?.id === 'screenprint') color = l < 0.33 ? str('c1', '#111111') : l < 0.66 ? str('c2', '#888888') : str('c3', '#ffffff')
  else if (e.look === 'trix' || e.look === 'bn' || e.look === 'noir') { const v2 = Math.round(l * 255); color = toHex(v2, v2, v2) }
  return { color, busy: busy * (f?.id === 'halftone' || f?.id === 'riso' ? 1.6 : 1) }
}

/** Cosa c'è sotto un punto: colore e se è un fondo mosso (foto movimentata, trame, riempimenti). */
function under(g: G, upto: number, px: number, py: number): { color: string; busy: boolean } {
  let res = { color: g.P.bg, busy: false }
  for (let i = 0; i < upto; i++) {
    const e = g.els[i]
    const op = (e as { opacity?: number }).opacity ?? 1
    if ((e as { blend?: string }).blend || op < 0.55) continue
    if (e.kind === 'rect') {
      const a = (-(e.angle ?? 0) * Math.PI) / 180, dx = px - e.x, dy = py - e.y
      const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a)
      if (lx < 0 || ly < 0 || lx > e.w || ly > e.h) continue
      if (e.name === 'grana' || e.name === 'fondo') { if (e.fx?.length && e.name === 'fondo') res = { color: e.fill as string, busy: false }; continue }
      const f = typeof e.fill === 'string' ? e.fill : e.fill.from.startsWith('#') && ly / e.h < 0.5 ? e.fill.from : e.fill.to
      if (f === 'transparent') continue
      res = { color: f.startsWith('#') ? f : res.color, busy: !!e.fx?.length }
    } else if (e.kind === 'circle') {
      if (Math.hypot(px - e.cx, py - e.cy) > e.r || e.fill === 'transparent') continue
      res = { color: e.fill.startsWith('#') ? e.fill : res.color, busy: !!e.fx?.length }
    } else if (e.kind === 'image' && !e.clipText) {
      if (px < e.x || py < e.y || px > e.x + e.w || py > e.y + e.h) continue
      if (e.shape === 'circle' && Math.hypot(px - e.x - e.w / 2, py - e.y - e.h / 2) > Math.min(e.w, e.h) / 2) continue
      const smp = sampleImage(g, e, px, py)
      res = smp ? { color: smp.color, busy: smp.busy > 0.13 } : { color: res.color, busy: true }
    } else if (e.kind === 'ornament') {
      if (e.opacity > 0.25 && px >= e.x && py >= e.y && px <= e.x + e.w && py <= e.y + e.h) res = { ...res, busy: true }
    } else if (e.kind === 'path' && e.name === 'puntini') {
      const b = pathBox(e.d)
      if (b && px >= b.x && py >= b.y && px <= b.x + b.w && py <= b.y + b.h) res = { ...res, busy: true }
    }
  }
  return res
}

/** Cosa c'è sotto un punto della tavola composta: colore e se il fondo è mosso. */
export const sotto = (g: G, x: number, y: number) => under(g, g.els.length, x, y)

function pathBox(d: string): Box | null {
  const xs: number[] = [], ys: number[] = []
  for (const m of d.matchAll(/M\s*(-?[\d.]+)\s+(-?[\d.]+)/g)) { xs.push(+m[1]); ys.push(+m[2]) }
  if (!xs.length) return null
  return { x: Math.min(...xs) - 10, y: Math.min(...ys) - 10, w: Math.max(...xs) - Math.min(...xs) + 20, h: Math.max(...ys) - Math.min(...ys) + 20 }
}

/**
 * Il messaggio si legge sempre. Ogni riga viene campionata su una griglia di
 * punti: sotto può esserci il fondo, una forma, un velo o la foto (letta nei
 * suoi pixel veri). Un punto è buono se il colore contrasta e il fondo non è
 * mosso; la riga passa se lo è nella gran parte dei punti. Così un testo può
 * bucare una foto scura e uscire di poco sul bianco, ma non stare su una
 * foto movimentata. Contorni vuoti solo grandi e con un tratto deciso.
 */
function legible(g: G): boolean {
  g.letture = []
  const dbg = (why: string) => discard(g, why)
  for (let i = 0; i < g.els.length; i++) {
    const e = g.els[i]
    if (e.kind !== 'text' || e.deco || (e.opacity ?? 1) < 0.05) continue
    if (e.hollow && !(e.size >= 90 * g.u && (e.sw ?? 0) >= e.size * 0.025)) return dbg(`contorno troppo sottile ${e.name}`)
    if (!e.color.startsWith('#')) continue
    const left = e.align === 'left' ? 0 : e.align === 'right' ? e.w - e.tw : (e.w - e.tw) / 2
    const a = ((e.angle ?? 0) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a)
    const big = e.size > 40 * g.u
    const min = big ? 2.4 : 3.2
    let ok = 0, n = 0, csum = 0
    for (let fx = 0.04; fx < 1; fx += 0.12) for (const fy of [0.3, 0.55, 0.8]) {
      const lx = left + e.tw * fx, ly = e.h * fy
      const u = under(g, i, e.x + lx * ca - ly * sa, e.y + lx * sa + ly * ca)
      n++
      const cr = contrast(e.color, u.color)
      csum += u.busy ? Math.min(cr, 1.5) : cr
      if (!u.busy && cr >= min) ok++
    }
    if (ok / n < (big ? 0.75 : 0.9)) return dbg(`si legge poco ${e.name} (${Math.round((ok / n) * 100)}%)`)
    g.letture?.push({ name: e.name, ok: ok / n, contrasto: csum / n, big })
    // i colori delle singole lettere (accento, saltello) devono leggersi quanto il testo
    const charColors = [...new Set((e.chars ?? []).flat().map(ch => ch?.c).filter((c): c is string => !!c && c.startsWith('#') && c !== e.color))]
    for (const cc of charColors) {
      let okc = 0
      for (let fx = 0.04; fx < 1; fx += 0.12) for (const fy of [0.3, 0.55, 0.8]) {
        const lx = left + e.tw * fx, ly = e.h * fy
        const u = under(g, i, e.x + lx * ca - ly * sa, e.y + lx * sa + ly * ca)
        if (!u.busy && contrast(cc, u.color) >= min) okc++
      }
      if (okc / n < (big ? 0.75 : 0.9)) return dbg(`lettere in ${cc} poco leggibili in ${e.name}`)
    }
  }
  return true
}

/* ── specchiatura ─────────────────────────────────────────────────────── */
/** Riflette un tracciato SVG (comandi M L C Q A, assoluti e relativi) rispetto all'asse verticale della tavola. */
function mirrorPath(d: string, W: number) {
  const tok = d.match(/[MLCQAZmlcqaz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? []
  const out: string[] = []
  let cmd = '', idx = 0
  for (const t of tok) {
    if (/[A-Za-z]/.test(t)) { cmd = t; idx = 0; out.push(t); continue }
    let v = parseFloat(t)
    const abs = cmd === cmd.toUpperCase()
    if (cmd === 'A' || cmd === 'a') {
      const k = idx % 7
      if (k === 2) v = -v                  // rotazione
      else if (k === 4) v = 1 - v          // verso dell'arco
      else if (k === 5) v = abs ? W - v : -v
    } else if (idx % 2 === 0) v = abs ? W - v : -v
    out.push(String(Math.round(v * 10) / 10))
    idx++
  }
  return out.join(' ')
}

/**
 * Specchia la composizione da destra a sinistra in modo esatto: forme ruotate,
 * tracciati, foto (la foto non si capovolge: si sposta la finestra), testi con
 * l'allineamento invertito. Raddoppia le varianti di ogni sistema; la
 * leggibilità si ricontrolla dopo.
 */
export function mirror(g: G) {
  const W = g.W
  const flipAlign = (a: 'left' | 'center' | 'right') => (a === 'left' ? 'right' : a === 'right' ? 'left' : 'center')
  const rot = (x: number, y: number, w: number, angle = 0) => {
    const a = (angle * Math.PI) / 180
    return { x: W - x - w * Math.cos(a), y: y + w * Math.sin(a), angle: angle ? -angle : angle }
  }
  for (const e of g.els) {
    switch (e.kind) {
      case 'rect': Object.assign(e, rot(e.x, e.y, e.w, e.angle)); break
      case 'text': Object.assign(e, rot(e.x, e.y, e.w, e.angle), { align: flipAlign(e.align) }); break
      case 'circle': e.cx = W - e.cx; break
      case 'line': e.x1 = W - e.x1; e.x2 = W - e.x2; break
      case 'path': e.d = mirrorPath(e.d, W); break
      case 'glyph': e.cx = W - e.cx; if (e.angle) e.angle = -e.angle; break
      case 'seal': e.cx = W - e.cx; if (e.angle) e.angle = -e.angle; break
      case 'arcText': e.cx = W - e.cx; if (e.start) e.start = -e.start; break
      case 'ornament': e.x = W - e.x - e.w; break
      case 'image':
        e.x = W - e.x - e.w
        if (e.view) e.view = { ...e.view, x: W - e.view.x - e.view.w }
        if (e.mask) e.mask = mirrorPath(e.mask, W)
        if (e.clipText) e.clipText = { ...e.clipText, x: W - e.clipText.x - Math.max(...e.clipText.lines.map(l => lineWidth(l, e.clipText!.font, e.clipText!.size, e.clipText!.tracking))) }
        break
    }
  }
}

/** Elementi della sequenza: ponte con la slide accanto, freccia in copertina, paginazione. */
function seqMarks(g: G) {
  const q = g.seq!
  const r = Math.min(g.W, g.H) * 0.22, cy = g.H * 0.56
  const discs: SceneEl[] = []
  // lo stesso disco a cavallo del bordo: metà su questa slide, metà sulla successiva
  if (q.ponte?.destra) discs.push({ kind: 'circle', name: 'ponte', cx: g.W, cy, r, fill: q.colore })
  if (q.ponte?.sinistra) discs.push({ kind: 'circle', name: 'ponte', cx: 0, cy, r, fill: q.colore })
  g.els.unshift(...discs)
  if (q.i === 0 && q.n > 1) {
    const x = g.W - g.m * 0.95, y = cy, L = U(g, 34)
    put(g, { kind: 'path', name: 'freccia', d: `M ${x - L} ${y} L ${x} ${y} M ${x - L * 0.4} ${y - L * 0.4} L ${x} ${y} L ${x - L * 0.4} ${y + L * 0.4}`, fill: 'transparent', stroke: readable(q.colore, [g.P.fg, g.P.bg]), sw: U(g, 5) })
  }
  // paginazione: in alto a destra, altrimenti in basso a destra, se non tocca un testo
  const f = lab(g, `${String(q.i + 1).padStart(2, '0')} / ${String(q.n).padStart(2, '0')}`, g.W * 0.3)
  if (!f) return
  const texts = g.els.filter(e => e.kind === 'text' && !e.deco).map(e => textBox(e as Extract<SceneEl, { kind: 'text' }>))
  for (const y of [g.T, g.B - f.h]) {
    const b = { x: g.W - g.m - f.w, y, w: f.w, h: f.h }
    if (!texts.some(t => touches(t, b, 14 * g.u))) { putLab(g, 'paginazione', f, b.x, y, g.P.sec); break }
  }
}

export function finish(g: G, layout: string, label: string, o: { specchio?: boolean } = {}): Scene | null {
  // una composizione su due-tre si specchia (stesso seme, stessa scelta); mai gli elenchi
  // numerati e le griglie di voci, dove lo specchio invertirebbe l'ordine di lettura
  if (o.specchio !== false && (g.seq?.specchio ?? (hashText(`${g.k.seme}|specchio`) % 10 < 4))) mirror(g)
  if (g.seq) seqMarks(g)
  // la specifica del brief: segni, icone, effetto del titolo (poi i controlli di sempre)
  specializza(g)
  if (!legible(g)) return null
  grainTop(g)
  // i testi veri e i sigilli stanno sopra la grana: nitidi, come li comporrebbe un tipografo
  const front = g.els.filter(e => (e.kind === 'text' && !e.deco) || e.kind === 'seal' || e.kind === 'arcText')
  g.els = [...g.els.filter(e => !front.includes(e)), ...front]
  // misure vere riga per riga: margini, contatti e aria tra i testi, corretti dove si può
  const sp = spazi(g)
  if (sp) { discard(g, sp); return null }
  if (!check(g)) return null
  const d = g.s.decor
  return {
    w: g.W, h: g.H, bg: g.P.bg, els: g.els, layout, style: g.s.id, label,
    palette: { bg: g.P.bg, ink: g.P.fg, accent: g.P.acc, muted: g.P.sec, surface: g.P.srf },
    finish: { ids: d.finishes, seed: `${g.c.title}|${layout}|${g.k.seme}`, fallback: g.k.grana > 0.05 ? (d.fallback ?? 'grana') : undefined, amount: 20 + g.k.grana * 40 },
    knobs: { ...g.k },
  }
}
