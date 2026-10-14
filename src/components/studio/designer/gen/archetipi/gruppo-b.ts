/**
 * Archetipi del gruppo B · collage e materia. Ogni funzione compone una tavola
 * intera con gli strumenti di ../tools e ../forme, legge regolatori e registro,
 * ha varianti interne scelte dal seme e chiude con finish().
 * Le idee e le ricette d'origine sono in ./elenco.ts.
 *
 * Materia: carta strappata (bordo a frastagli con un velo pieno dentro, così il
 * controllo di leggibilità vede il colore vero), nastro adesivo traslucido,
 * ombre in rgba (fuori dalla palette), foto ritagliate con maschere libere e
 * finestre `view` diverse sulla stessa foto. I testi stanno sempre su un fondo
 * pieno (carta, box, cartiglio, balloon), mai direttamente sulla foto.
 */
import type { Scene, SceneEl, FxSpec, FontSpec } from '../../types'
import {
  type G, put, U, txt, lab, para, display, putLab, putPara, putDisplay, photo, treat, finish, keyword, words, up,
  sizeForWidth, detailsLine, ctaText, mix, alpha, readable, contrast, darker, lighter, lum, corners, obbTouch, stackLines,
} from '../tools'
import { over } from '../systems'
import type { Fit } from '../../text'
import { lineWidth } from '../../text'
import { blobPath, wobblyPath, scribbleEllipse, starPath } from '../forme'
import { toOklch } from '../../core/colore'
import type { Rng } from '../knobs'
import { acquerello, biglietto, etichetta, fumetto } from './gruppo-b2'

type Sistema = (g: G) => Scene | null
type Pt = [number, number]
type Box = { x: number; y: number; w: number; h: number }
type Text = Extract<SceneEl, { kind: 'text' }>

/* ── geometria ────────────────────────────────────────────────────────── */
const f1 = (n: number) => n.toFixed(1)
const rad = (d: number) => (d * Math.PI) / 180
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** Angoli (TL, TR, BR, BL) di un riquadro w×h centrato in (cx, cy), ruotato di `deg` attorno al centro. */
function quad(cx: number, cy: number, w: number, h: number, deg = 0): Pt[] {
  const a = rad(deg), c = Math.cos(a), s = Math.sin(a)
  return ([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as Pt[]).map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c])
}
/** Punto locale (lx, ly) di un riquadro centrato e ruotato, in coordinate della tavola. */
function loc(cx: number, cy: number, deg: number, lx: number, ly: number): Pt {
  const a = rad(deg)
  return [cx + lx * Math.cos(a) - ly * Math.sin(a), cy + lx * Math.sin(a) + ly * Math.cos(a)]
}
/** Angolo in alto a sinistra di un oggetto w×h che ruota attorno al suo angolo (rect, testo) perché il centro cada in (cx, cy). */
function tl(cx: number, cy: number, w: number, h: number, deg = 0): Pt {
  const a = rad(deg), c = Math.cos(a), s = Math.sin(a)
  return [cx - (w / 2) * c + (h / 2) * s, cy - (w / 2) * s - (h / 2) * c]
}
const poly = (pts: Pt[]) => 'M ' + pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join(' L ') + ' Z'
function bbox(pts: Pt[]): Box {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}
const inter = (a: Box, b: Box, gap = 0) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap
/** Sposta tutte le coppie di coordinate assolute di un tracciato (M/L/C/Q). */
const sposta = (d: string, dx: number, dy: number) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, a: string, b: string) => `${f1(+a + dx)} ${f1(+b + dy)}`)

/**
 * Bordo strappato: ogni lato del poligono si percorre a piccoli passi con uno
 * scarto che vaga piano (la fibra della carta) e un tremolio fine. I lati con
 * `netti[i]` restano tagliati a forbice. Con `clip` i punti restano nella tavola.
 */
function strappo(r: Rng, pts: Pt[], amp: number, passo: number, o: { netti?: boolean[]; clip?: Box } = {}): string {
  const out: Pt[] = []
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n]
    const len = Math.hypot(x2 - x1, y2 - y1) || 1
    const nx = -(y2 - y1) / len, ny = (x2 - x1) / len
    const k = Math.max(2, Math.round(len / passo))
    let wander = 0
    for (let j = 0; j < k; j++) {
      const t = j / k
      let off = 0
      if (!o.netti?.[i] && j > 0) {
        wander = clamp(wander + r.range(-0.45, 0.45) * amp, -amp * 0.8, amp * 0.8)
        off = wander + r.range(-0.5, 0.5) * amp * (j % 2 ? 1 : 0.4)
      }
      out.push([x1 + (x2 - x1) * t + nx * off, y1 + (y2 - y1) * t + ny * off])
    }
  }
  const c = o.clip
  return poly(c ? out.map(([x, y]) => [clamp(x, c.x, c.x + c.w), clamp(y, c.y, c.y + c.h)] as Pt) : out)
}
/** Quadrilatero tagliato a forbice: angoli appena fuori squadra. */
function forbice(r: Rng, pts: Pt[], j: number): Pt[] {
  return pts.map(([x, y]) => [x + r.range(-j, j), y + r.range(-j, j)] as Pt)
}

/* ── colore ───────────────────────────────────────────────────────────── */
const oklab = (hex: string) => { const [L, C, h] = toOklch(hex); const a = rad(h); return [L, C * Math.cos(a), C * Math.sin(a)] }
/** Distanza percettiva (la stessa del critico): sotto 0,05 due colori sembrano un errore. */
function dist(a: string, b: string) { const p = oklab(a), q = oklab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) }
/** Il primo candidato ben distinto da tutti i colori già in tavola, altrimenti il fondo stesso. */
function distinto(cands: string[], usati: string[], fallback: string, min = 0.07) {
  return cands.find(c => usati.every(u => dist(c, u) >= min || dist(c, u) < 0.004)) ?? fallback
}
/** Inchiostro per testo piccolo su un fondo: il più contrastato tra quelli del registro. */
const inchiostro = (g: G, su: string, min = 4.5) => readable(su, [g.P.fg, g.P.bg, '#111111', '#ffffff'], min)
const accSu = (g: G, su: string, min = 3.4) => readable(su, [g.P.acc, g.P.acc2, inchiostro(g, su)], min)
/** Carta bianca da ritaglio/cornice: distinta dal fondo e dalle tinte, o il fondo stesso. */
function cartaBianca(g: G) {
  const { P } = g
  return distinto(['#fbfaf6', '#f4f1ea', '#ffffff', '#efe9dc'], [P.bg, P.fg, P.acc, P.acc2, P.srf], P.dark ? '#f4f1ea' : P.bg, 0.06)
}
const ombra = (a = 0.2) => alpha('#000000', a)

/* ── materia ──────────────────────────────────────────────────────────── */
/**
 * Pezzo di carta strappata (o tagliata) ruotato, con ombra portata. Dentro un
 * velo pieno dello stesso colore, rientrato: non si vede, ma il controllo di
 * leggibilità sa che cosa c'è sotto i testi.
 */
function foglio(g: G, name: string, cx: number, cy: number, w: number, h: number, deg: number, fill: string, o: { amp?: number; netti?: boolean[]; ombra?: number; fx?: FxSpec[]; taglio?: boolean } = {}) {
  const amp = o.amp ?? U(g, 5)
  const pts = o.taglio ? forbice(g.r, quad(cx, cy, w, h, deg), U(g, 4)) : quad(cx, cy, w, h, deg)
  const d = o.taglio ? poly(pts) : strappo(g.r, pts, amp, U(g, 9), { netti: o.netti })
  if (o.ombra !== 0) put(g, { kind: 'path', name: `velo_ombra_${name}`, d: sposta(d, U(g, 7), U(g, 10)), fill: ombra(o.ombra ?? 0.16) })
  put(g, { kind: 'path', name: `velo_${name}`, d, fill, fx: o.fx })
  const [x, y] = tl(cx, cy, w - amp * 3, h - amp * 3, deg)
  put(g, { kind: 'rect', name: `velo_${name}_pieno`, x, y, w: w - amp * 3, h: h - amp * 3, fill, angle: deg || undefined })
  return { pts, d }
}

/** Nastro adesivo traslucido con le estremità strappate. */
function nastro(g: G, cx: number, cy: number, len: number, deg: number, color?: string) {
  const wid = U(g, 30 + g.r.range(0, 10))
  const pts = quad(cx, cy, len, wid, deg)
  const d = strappo(g.r, pts, U(g, 3), U(g, 5), { netti: [true, false, true, false] })
  put(g, { kind: 'path', name: 'nastro', d, fill: color ?? alpha('#efe4c4', 0.72) })
}

/** Foto ritagliata: maschera libera (in tavola), finestra `view` sulla foto, trattamento. */
function ritaglio(g: G, name: string, d: string, pts: Pt[], o: { view?: Box; fx?: FxSpec[]; look?: string; adjust?: Record<string, number>; blend?: GlobalCompositeOperation; opacity?: number } = {}) {
  const b = bbox(pts)
  const pad = U(g, 12)
  const box = { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad }
  const t = o.fx || o.look ? { fx: o.fx, look: o.look, adjust: o.adjust } : treat(g)
  return put(g, { kind: 'image', name, ...box, url: g.photo, fallback: g.P.srf, mask: d, view: o.view ?? box, look: t.look, adjust: t.adjust, fx: t.fx, blend: o.blend, opacity: o.opacity })
}
/** Finestra che ingrandisce un dettaglio della foto dentro il riquadro `b` (zoom > 1, fx/fy scelgono la zona). */
function zoomView(b: Box, zoom: number, fx: number, fy: number): Box {
  const w = b.w * zoom, h = b.h * zoom
  return { x: b.x - (w - b.w) * fx, y: b.y - (h - b.h) * fy, w, h }
}

/** Crocini di taglio a "L" attorno a un riquadro. */
function crocini(g: G, b: Box, color: string, off = U(g, 14), L = U(g, 26)) {
  const sw = Math.max(1, 1.6 * g.u)
  for (const [x, y, sx, sy] of [[b.x - off, b.y - off, 1, 1], [b.x + b.w + off, b.y - off, -1, 1], [b.x + b.w + off, b.y + b.h + off, -1, -1], [b.x - off, b.y + b.h + off, 1, -1]]) {
    put(g, { kind: 'path', name: 'crocino', d: `M ${f1(x + sx * L)} ${f1(y)} L ${f1(x)} ${f1(y)} L ${f1(x)} ${f1(y + sy * L)}`, fill: 'transparent', stroke: color, sw })
  }
}

/** Trattamenti alternativi per i frammenti secondari (diversi da quello principale). */
function fxAlt(g: G, i: number, paper: string): { fx?: FxSpec[]; look?: string; adjust?: Record<string, number> } {
  const { P } = g
  const dk = darker(P.bg, P.fg)
  const list: { fx?: FxSpec[]; look?: string; adjust?: Record<string, number> }[] = [
    { fx: [{ id: 'halftone', variant: 'giornale', p: { mode: 0, ink: dk, paper, paperOn: 1, size: 6 + Math.round(g.k.densita * 4), angle: 45 } }] },
    { fx: [{ id: 'gradientMap', variant: 'duotone', p: { c1: dk, c2: P.acc, three: 0, contrast: 30 } }] },
    { look: 'trix', adjust: { grain: 45 } },
  ]
  const main = g.k.trattamento
  const skip = main === 'retino' ? 0 : main === 'duotone' ? 1 : main === 'bn' ? 2 : -1
  const ok = list.filter((_, j) => j !== skip)
  return ok[i % ok.length]
}

/** Segno a pennarello: freccia tracciata a mano da a verso b. */
function freccia(g: G, a: Pt, b: Pt, color: string, sw = U(g, 4)) {
  const d = wobblyPath(g.r, a[0], a[1], b[0], b[1], U(g, 6))
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = U(g, 26)
  const p1: Pt = [b[0] - L * Math.cos(ang - 0.45), b[1] - L * Math.sin(ang - 0.45)], p2: Pt = [b[0] - L * Math.cos(ang + 0.45), b[1] - L * Math.sin(ang + 0.45)]
  put(g, { kind: 'path', name: 'freccia', d: `${d} M ${f1(p1[0])} ${f1(p1[1])} L ${f1(b[0])} ${f1(b[1])} L ${f1(p2[0])} ${f1(p2[1])}`, fill: 'transparent', stroke: color, sw })
}
/** Sottolineatura a mano sotto un testo orizzontale. */
function sottolinea(g: G, x: number, y: number, w: number, color: string, deg = 0) {
  const a = rad(deg)
  const x2 = x + w * Math.cos(a), y2 = y + w * Math.sin(a)
  put(g, { kind: 'path', name: 'segno', d: wobblyPath(g.r, x, y, x2, y2, U(g, 3)) + ' ' + wobblyPath(g.r, x + w * 0.08, y + U(g, 9), x2 - w * 0.12, y2 + U(g, 7), U(g, 3)), fill: 'transparent', stroke: color, sw: U(g, 4) })
}

/** Cerchio a pennarello attorno a un testo già piazzato (per nome). */
function cerchia(g: G, name: string, color: string) {
  const t = [...g.els].reverse().find(e => e.kind === 'text' && e.name === name) as Text | undefined
  if (!t) return
  const b = bbox(corners(t, U(g, 4)))
  put(g, { kind: 'path', name: 'cerchiato', d: scribbleEllipse(g.r, { x: b.x + b.w * 0.04, y: b.y + b.h * 0.1, w: b.w * 0.92, h: b.h * 0.8 }), fill: 'transparent', stroke: color, sw: U(g, 3.5) })
}

/* ── testo ────────────────────────────────────────────────────────────── */
interface Riga { f: Fit; font: FontSpec; role: string; color: string; gap: number }
/** Colonna di righe già misurate, ruotabile attorno al suo angolo alto sinistro. */
function colonna(g: G, righe: Riga[], x: number, y: number, deg = 0, align: 'left' | 'center' = 'left', w = 0) {
  const a = rad(deg)
  let off = 0
  for (const rg of righe) {
    const ww = w || rg.f.w
    const opts = { name: rg.role, lines: rg.f.lines, font: rg.font, size: rg.f.size, x: x - off * Math.sin(a), y: y + off * Math.cos(a), color: rg.color, align, w: ww, leading: rg.f.leading ?? 1.3, tracking: rg.f.tracking ?? 0, angle: deg || undefined }
    txt(g, opts)
    off += rg.f.h + rg.gap
  }
  return off
}
/** Blocco informativo misurato (occhiello, testo, dettagli, invito) come righe per `colonna`. */
function righeInfo(g: G, w: number, o: { kicker?: boolean; body?: boolean; details?: boolean; cta?: boolean; bodyLines?: number } = {}): { righe: Riga[]; h: number; w: number } {
  const q = { kicker: true, body: true, details: true, cta: true, ...o }
  const out: Riga[] = []
  const k = q.kicker ? lab(g, g.c.kicker, w) : null
  if (k) out.push({ f: k, font: g.s.label, role: 'occhiello', color: 'acc', gap: g.sc.spazio(2) })
  const b = q.body ? para(g, g.c.body, w, q.bodyLines ?? 4) : null
  if (b) out.push({ f: b, font: g.s.text, role: 'testo', color: 'fg', gap: g.sc.spazio(3) })
  const d = q.details ? lab(g, detailsLine(g.c), w) : null
  if (d) out.push({ f: d, font: g.s.label, role: 'dettagli', color: 'sec', gap: g.sc.spazio(2) })
  const c = q.cta ? lab(g, ctaText(g.c), w) : null
  if (c) out.push({ f: c, font: g.s.label, role: 'invito', color: 'acc', gap: 0 })
  if (out.length) out[out.length - 1].gap = 0
  return { righe: out, h: out.reduce((n, r) => n + r.f.h + r.gap, 0), w: Math.max(0, ...out.map(r => r.f.w)) }
}
/** Colora le righe sul fondo che avranno sotto. */
function tinte(g: G, righe: Riga[], su: string): Riga[] {
  const fg = inchiostro(g, su, 7), acc = accSu(g, su, 4.2), sec = readable(su, [g.P.sec, fg], 4.5)
  return righe.map(r => ({ ...r, color: r.color === 'acc' ? acc : r.color === 'sec' ? sec : r.color === 'fg' ? fg : r.color }))
}

/** Titolo come testo nel box: colore leggibile sul box, accento del registro sulla parola chiave. */
function titoloSu(g: G, name: string, f: Fit, x: number, y: number, su: string, deg = 0, color?: string, font?: FontSpec) {
  const c = color ?? readable(su, [g.P.fg, g.P.bg, '#111111', '#ffffff'], 4.5)
  if (font && font.family !== g.s.display.family) return txt(g, { name, lines: f.lines, font, size: f.size, x, y, color: c, align: 'left', w: f.w, leading: f.leading ?? 1, tracking: f.tracking ?? 0, angle: deg || undefined })
  return putDisplay(g, name, f, x, y, c, 'left', f.w, { angle: deg || undefined, su })
}

/** Un testo ruotato tocca (o no) un poligono? */
const toccaTesto = (t: Text, pts: Pt[], pad = 0) => obbTouch(corners(t, pad), pts)

/* ═══ Collage strappato ═════════════════════════════════════════════════ */
/**
 * La foto strappata in frammenti (uno grande e altri con dettagli ingranditi
 * e trattamenti diversi), ombre portate, nastro adesivo, crocini; il titolo in
 * strisce di carta appoggiate storte che attraversano il bordo della foto;
 * informazioni su un foglio; ritaglio di giornale e segni a pennarello.
 * Varianti: 0 grande frammento, 1 frammenti sparsi, 2 manifesto strappato.
 */
function collage(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  if (!g.photo) return null
  const v = (k.seme >> 3) % 3
  const side = g.landscape
  const E = k.energia
  const board = { x: 0, y: 0, w: W, h: H }
  const paper = cartaBianca(g)
  const dk = darker(P.bg, P.fg)
  const segnoCol = readable(P.bg, [P.acc, P.acc2, P.fg], 2.6)
  const sobrio = s.registro === 'editoriale'
  const rot = (base: number) => (sobrio ? 0.6 : 1) * base * (0.4 + E)

  // passo 1: misure. Titolo in strisce (una riga per striscia), informazioni su un foglio
  const colW = side ? W * 0.4 : W - 2 * m
  const tMaxW = side ? W * 0.42 : (W - 2 * m) * 0.84
  const t = display(g, g.c.title, tMaxW, side ? H * 0.42 : H * (g.format === 'storia' ? 0.22 : 0.26), 110 + 90 * k.scala, 44, side ? 4 : 3)
  if (!t) return null
  const padX = t.size * 0.3, padY = t.size * 0.16
  const lineH = t.size * 1.13
  const infoW = side ? colW * 0.92 : Math.min(colW * 0.78, U(g, 640))
  const notePad = U(g, 30)
  const info = righeInfo(g, infoW - 2 * notePad, { kicker: false, bodyLines: 3 })
  const noteH = info.h + 2 * notePad
  const stripH = t.lines.length * (lineH + 2 * padY) - (t.lines.length - 1) * padY * 0.6

  // passo 2: dove stanno foto, titolo e foglio
  let main: Box, titleX: number, titleY: number, noteC: Pt
  const headY = T
  if (side) {
    main = { x: v === 2 ? 0 : m * 0.6, y: v === 2 ? 0 : m * 0.8, w: W * (v === 2 ? 0.6 : 0.54), h: v === 2 ? H : H - m * 1.6 }
    titleX = main.x + main.w - U(g, 90)
    titleY = Math.max(T + U(g, 70), (H - stripH - noteH - U(g, 40)) / 2)
    noteC = [W - m - infoW / 2, Math.min(B - noteH / 2, titleY + stripH + U(g, 40) + noteH / 2)]
  } else {
    const noteTop = B - noteH
    titleY = noteTop - U(g, 36) - stripH
    const top = v === 2 ? 0 : T + U(g, 56)
    const bottom = titleY + stripH * 0.45
    if (bottom - top < H * 0.3) return null
    main = v === 2 ? { x: 0, y: 0, w: W, h: bottom } : { x: v === 1 ? m * 0.5 : -W * 0.03, y: top, w: W * (v === 1 ? 0.62 : 0.94), h: bottom - top }
    titleX = m + U(g, 6)
    noteC = [W - m - infoW / 2 - U(g, 6), noteTop + noteH / 2]
  }

  // passo 3: fondo. Cartoncino colorato strappato dietro la foto (variante 0/1) o manifesto al vivo (2)
  const cartoncino = readable(P.bg, [P.acc, P.acc2, P.fg], 1.3)
  if (v !== 2) {
    const cw = main.w * 0.7, ch = main.h * 0.75
    foglio(g, 'cartoncino', main.x + main.w * (side ? 0.62 : 0.7), main.y + main.h * 0.42, cw, ch, rot(5), cartoncino, { amp: U(g, 7), ombra: 0, fx: [{ id: 'textureOverlay', variant: 'carta', p: { opacity: 50 } }] })
  }

  // passo 4: il frammento grande (strappato, con il margine bianco della carta e l'ombra)
  const mainDeg = v === 2 ? 0 : rot(r.pick([-1, 1]) * r.range(1.2, 2.6))
  const mc: Pt = [main.x + main.w / 2, main.y + main.h / 2]
  const mPts = quad(mc[0], mc[1], main.w, main.h, mainDeg)
  if (v === 2) {
    // manifesto: la foto al vivo, poi la carta strappata che la copre in basso (o a destra)
    ritaglio(g, 'foto', poly([[0, 0], [W, 0], [W, H], [0, H]]), [[0, 0], [W, 0], [W, H], [0, H]], { view: side ? { x: 0, y: 0, w: W * 0.66, h: H } : { x: 0, y: 0, w: W, h: main.h + H * 0.12 } })
  } else {
    const dWhite = strappo(r, quad(mc[0], mc[1], main.w + U(g, 22), main.h + U(g, 22), mainDeg), U(g, 7), U(g, 10), { clip: board })
    put(g, { kind: 'path', name: 'velo_ombra_foto', d: sposta(dWhite, U(g, 10), U(g, 14)), fill: ombra(0.2) })
    put(g, { kind: 'path', name: 'velo_bordo_foto', d: dWhite, fill: paper })
    ritaglio(g, 'foto', strappo(r, mPts, U(g, 5), U(g, 8), { clip: board }), mPts)
  }

  // passo 5: frammenti piccoli con dettagli ingranditi e altri trattamenti
  const nSmall = v === 1 ? 2 + Math.round(k.densita * 1.4) : 1 + Math.round(k.densita)
  const spots: Pt[] = side
    ? [[main.x + main.w * 0.86, main.y + main.h * 0.16], [main.x + main.w * 0.18, main.y + main.h * 0.86], [main.x + main.w * 0.7, main.y + main.h * 0.9]]
    : [[main.x + main.w * (v === 1 ? 1.12 : 0.84), main.y + main.h * (v === 1 ? 0.3 : 0.12)], [main.x + main.w * 0.12, main.y + main.h * (v === 2 ? 0.25 : 0.1)], [main.x + main.w * (v === 1 ? 1.1 : 0.9), main.y + main.h * 0.78]]
  // nella storia la zona coperta dall'interfaccia resta materia: un frammento in fondo
  if (g.format === 'storia') spots.push([W * 0.3, B + (H - B) * 0.5])
  const smallPts: Pt[][] = []
  for (let i = 0; i < Math.min(nSmall + (g.format === 'storia' ? 1 : 0), spots.length); i++) {
    if (g.format === 'storia' && i === nSmall) i = spots.length - 1
    const sz = Math.min(W, H) * (0.24 + r.range(0, 0.08)) * (v === 1 ? 1.15 : 1)
    const sw = sz * r.range(0.85, 1.25), sh = sz * r.range(0.8, 1.1)
    const [cx, cy] = [clamp(spots[i][0], sw * 0.35, W - sw * 0.35), clamp(spots[i][1], sh * 0.4, H - sh * 0.3)]
    const deg = rot(r.pick([-1, 1]) * r.range(4, 9))
    const pts = quad(cx, cy, sw, sh, deg)
    const b = bbox(pts)
    const alt = fxAlt(g, i, paper)
    const netto = s.forma === 'netto' && i % 2 === 1
    const dW = netto ? poly(forbice(r, quad(cx, cy, sw + U(g, 16), sh + U(g, 16), deg), U(g, 3))) : strappo(r, quad(cx, cy, sw + U(g, 16), sh + U(g, 16), deg), U(g, 6), U(g, 9), { clip: board })
    put(g, { kind: 'path', name: 'velo_ombra_frammento', d: sposta(dW, U(g, 8), U(g, 12)), fill: ombra(0.22) })
    put(g, { kind: 'path', name: 'velo_bordo_frammento', d: dW, fill: paper })
    const over = k.sovrastampa > 0.55 && i === 0
    if (over) put(g, { kind: 'path', name: 'inchiostro', d: netto ? poly(pts) : strappo(r, pts, U(g, 4), U(g, 8), { clip: board }), fill: P.acc })
    ritaglio(g, `frammento_${i}`, netto ? poly(forbice(r, pts, U(g, 2))) : strappo(r, pts, U(g, 4), U(g, 8), { clip: board }), pts, {
      view: zoomView(b, r.range(1.7, 2.6), r.range(0.2, 0.8), r.range(0.2, 0.8)),
      ...(over ? { fx: [{ id: 'gradientMap', p: { c1: dk, c2: '#ffffff', three: 0, contrast: 35 } }], blend: 'multiply' as GlobalCompositeOperation } : alt),
    })
    smallPts.push(pts)
  }

  // passo 6: manifesto strappato: la carta copre la foto con due strati strappati
  if (v === 2) {
    if (side) {
      const x0 = W * 0.6
      put(g, { kind: 'path', name: 'velo_strato', d: strappo(r, [[x0 - U(g, 40), -10], [W + 10, -10], [W + 10, H + 10], [x0 - U(g, 70), H + 10]], U(g, 12), U(g, 12), { netti: [true, true, true, false] }), fill: P.acc })
      const d = strappo(r, [[x0, -10], [W + 10, -10], [W + 10, H + 10], [x0 - U(g, 20), H + 10]], U(g, 9), U(g, 10), { netti: [true, true, true, false] })
      put(g, { kind: 'path', name: 'velo_ombra_carta', d: sposta(d, -U(g, 8), 0), fill: ombra(0.25) })
      put(g, { kind: 'path', name: 'velo_carta_strappata', d, fill: P.bg })
      put(g, { kind: 'rect', name: 'velo_carta', x: x0 + U(g, 30), y: 0, w: W - x0, h: H, fill: P.bg })
    } else {
      const y0 = titleY + stripH * 0.5
      put(g, { kind: 'path', name: 'velo_strato', d: strappo(r, [[-10, y0 - U(g, 46)], [W + 10, y0 - U(g, 20)], [W + 10, H + 10], [-10, H + 10]], U(g, 12), U(g, 12), { netti: [false, true, true, true] }), fill: P.acc })
      const d = strappo(r, [[-10, y0 - U(g, 10)], [W + 10, y0 + U(g, 12)], [W + 10, H + 10], [-10, H + 10]], U(g, 9), U(g, 10), { netti: [false, true, true, true] })
      put(g, { kind: 'path', name: 'velo_ombra_carta', d: sposta(d, 0, -U(g, 8)), fill: ombra(0.25) })
      put(g, { kind: 'path', name: 'velo_carta_strappata', d, fill: P.bg })
      put(g, { kind: 'rect', name: 'velo_carta', x: 0, y: y0 + U(g, 40), w: W, h: H - y0, fill: P.bg })
    }
  }

  // passo 7: ritaglio di giornale (microtesto decorativo) in una zona libera, dietro i testi
  if (k.densita > 0.45 && !sobrio) {
    const gw = Math.min(W, H) * 0.26, gh = gw * 1.15
    const gc: Pt = side ? [m + gw * 0.5, H - m - gh * 0.3] : [W - m - gw * 0.3, main.y + main.h * 0.5]
    const gd = rot(r.pick([-1, 1]) * r.range(3, 7))
    const news = mix(paper, P.fg, 0.08)
    const newsCol = distinto([news], [P.bg, paper, P.fg, P.acc, P.acc2], paper)
    foglio(g, 'giornale', gc[0], gc[1], gw, gh, gd, newsCol, { amp: U(g, 5), ombra: 0.12 })
    const unit = `${g.c.body ?? g.c.title} ${detailsLine(g.c)} `
    const size = U(g, 9)
    const cols = 2, cw = (gw - U(g, 34)) / cols
    const perLine = Math.max(8, Math.floor(cw / (size * 0.5)))
    const lines: string[] = []
    let txtAll = unit.repeat(12)
    const nL = Math.floor((gh - U(g, 40)) / (size * 1.25))
    for (let i = 0; i < nL; i++) { lines.push(txtAll.slice(0, perLine)); txtAll = txtAll.slice(perLine) }
    for (let c = 0; c < cols; c++) {
      const [x, y] = loc(gc[0], gc[1], gd, -gw / 2 + U(g, 16) + c * (cw + U(g, 4)), -gh / 2 + U(g, 18))
      txt(g, { name: 'giornale_testo', lines, font: g.s.text, size, x, y, color: alpha(inchiostro(g, newsCol), 0.6), leading: 1.25, angle: gd, deco: true })
    }
  }

  // passo 8: il foglio con le informazioni (carta bianca, appena storto) e il nastro che lo tiene
  const noteDeg = rot(r.pick([-1, 1]) * r.range(0.6, 1.6))
  const noteW = infoW
  foglio(g, 'foglio', noteC[0], noteC[1], noteW, noteH, noteDeg, paper, { amp: U(g, 4), netti: [r.chance(0.5), true, false, true], ombra: 0.14 })
  const [nx, ny] = loc(noteC[0], noteC[1], noteDeg, -noteW / 2 + notePad, -noteH / 2 + notePad)
  colonna(g, tinte(g, info.righe, paper), nx, ny, noteDeg)

  // passo 9: il titolo in strisce storte; ogni striscia scende finché non tocca la riga sopra
  const boxCols = [P.fg, readable(P.bg, [P.acc, P.acc2, P.fg], 1.5), paper]
  let y = titleY
  let x = titleX
  const placed: Text[] = []
  const strips: Pt[][] = []
  for (const [i, l] of t.lines.entries()) {
    const lf: Fit = { ...t, lines: [l], w: lineWidth(l, g.s.display, t.size, t.tracking ?? 0), h: lineH }
    const bw = lf.w + 2 * padX, bh = lineH + 2 * padY
    const deg = rot((i % 2 ? 1 : -1) * r.range(1.4, 3.2) * clamp(U(g, 520) / bw, 0.4, 1))
    const bc = boxCols[(i + (k.seme % 2)) % boxCols.length]
    const stag = side ? (i % 2) * U(g, 30) * E : r.range(0, 1) * (W - 2 * m - bw) * (0.25 + 0.35 * E) * (i ? 1 : 0.4)
    let cx = clamp(x + stag + bw / 2, m + bw / 2, W - m - bw / 2 + padX * 0.4), cy = y + bh / 2
    if (side) cx = Math.min(cx, W - m - bw / 2)
    // la striscia scende finché non lascia libera la riga sopra
    for (let n = 0; n < 40; n++) {
      const pts = quad(cx, cy, bw, bh, deg)
      if (!placed.some(p => toccaTesto(p, pts, U(g, 2)))) break
      cy += U(g, 4)
    }
    const pts = quad(cx, cy, bw, bh, deg)
    strips.push(pts)
    put(g, { kind: 'path', name: 'velo_ombra_striscia', d: poly(pts.map(([a, b]) => [a + U(g, 6), b + U(g, 8)] as Pt)), fill: ombra(0.2) })
    if (k.sovrastampa > 0.4) put(g, { kind: 'path', name: 'striscia_registro', d: poly(quad(cx + U(g, 9), cy - U(g, 7), bw, bh, deg)), fill: [P.acc2, P.acc, P.fg].find(c => c !== bc && c !== P.bg) ?? P.acc, blend: over(g, bc), opacity: 0.85 })
    const [rx, ry] = tl(cx, cy, bw, bh, deg)
    put(g, { kind: 'rect', name: 'velo_striscia', x: rx, y: ry, w: bw, h: bh, fill: bc, angle: deg || undefined })
    const [tx, ty] = tl(cx, cy + t.size * 0.03, lf.w, lineH, deg)
    placed.push(titoloSu(g, `titolo#${i}`, lf, tx, ty, bc, deg))
    y = cy + bh / 2 - padY * 0.6
  }

  // passo 10: brand e occhiello come etichette fissate col nastro
  const head = lab(g, g.c.brand, side ? W * 0.3 : W * 0.42)
  const kick = lab(g, g.c.kicker, side ? W * 0.34 : W * 0.46)
  if (head) {
    const hw = head.w + U(g, 40), hh = head.h + U(g, 28)
    const hc: Pt = side ? [W - m - hw / 2, headY + hh / 2] : [m + hw / 2, headY + hh / 2 - U(g, 6)]
    const hd = rot(-1.5)
    const hb = P.fg
    const [rx, ry] = tl(hc[0], hc[1], hw, hh, hd)
    put(g, { kind: 'rect', name: 'velo_brand', x: rx, y: ry, w: hw, h: hh, fill: hb, angle: hd || undefined })
    const [tx, ty] = tl(hc[0], hc[1], head.w, head.h, hd)
    putLab(g, 'brand', head, tx, ty, inchiostro(g, hb, 7), 'left', head.w, { angle: hd || undefined })
  }
  if (kick) {
    const kw = kick.w + U(g, 40), kh = kick.h + U(g, 26)
    const kc: Pt = side ? [titleX + kw / 2 + U(g, 20), titleY - kh / 2 - U(g, 34)] : [W - m - kw / 2, T + kh / 2 + (v === 2 ? U(g, 10) : 0)]
    const kd = rot(r.pick([-1, 1]) * r.range(2, 4))
    const kb = readable(P.bg, [P.acc, P.acc2], 1.3)
    const kpts = quad(kc[0], kc[1], kw, kh, kd)
    if (!placed.some(p => toccaTesto(p, kpts, U(g, 6)))) {
      put(g, { kind: 'path', name: 'velo_ombra_occhiello', d: sposta(poly(kpts), U(g, 5), U(g, 7)), fill: ombra(0.2) })
      const [rx, ry] = tl(kc[0], kc[1], kw, kh, kd)
      put(g, { kind: 'rect', name: 'velo_occhiello', x: rx, y: ry, w: kw, h: kh, fill: kb, angle: kd })
      const [tx, ty] = tl(kc[0], kc[1], kick.w, kick.h, kd)
      putLab(g, 'occhiello', kick, tx, ty, inchiostro(g, kb, 4.5), 'left', kick.w, { angle: kd })
      nastro(g, kc[0] + kw * 0.42, kc[1] - kh * 0.5, U(g, 90), kd + 38)
    }
  }

  // passo 11: nastro sui frammenti e sulle strisce, crocini, segni a pennarello
  const tapes = 1 + Math.round(k.densita * 3)
  const tapeAt: [Pt, number][] = []
  if (v !== 2) tapeAt.push([mPts[0], mainDeg - 40], [mPts[2], mainDeg - 40])
  for (const p of smallPts) tapeAt.push([[(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2], r.range(-12, 12)])
  if (strips.length) tapeAt.push([strips[strips.length - 1][1], 50])
  for (const [p, d] of tapeAt.slice(0, tapes + 1)) nastro(g, p[0], p[1], U(g, 110 + r.range(0, 50)), d)
  if (v !== 2) crocini(g, bbox(mPts), alpha(P.fg, 0.75), U(g, 18))
  else crocini(g, { x: m * 0.5, y: m * 0.5, w: W - m, h: H - m }, alpha(P.fg, 0.7), 0)
  // pennarello: l'invito cerchiato a mano sul foglio
  if (E > 0.3) cerchia(g, 'invito', readable(paper, [P.acc, P.acc2, P.fg], 3))
  return finish(g, 'collage', 'Collage strappato', { specchio: false })
}

/* ═══ Polaroid ══════════════════════════════════════════════════════════ */
/** Fondo da quaderno: puntini o righe a mano, leggerissimi (un solo tracciato). */
function quaderno(g: G, tipo: 'puntini' | 'righe' | 'quadretti') {
  const { W, H, P } = g
  const col = alpha(P.fg, P.dark ? 0.16 : 0.2)
  const st = U(g, tipo === 'puntini' ? 36 : 44)
  let d = ''
  if (tipo === 'puntini') {
    const rr = 1.8 * g.u
    for (let y = st / 2; y < H; y += st) for (let x = st / 2; x < W; x += st) d += `M ${f1(x - rr)} ${f1(y)} a ${f1(rr)} ${f1(rr)} 0 1 0 ${f1(2 * rr)} 0 a ${f1(rr)} ${f1(rr)} 0 1 0 ${f1(-2 * rr)} 0 `
    put(g, { kind: 'path', name: 'quaderno', d, fill: col })
    return
  }
  for (let y = st; y < H; y += st) d += `M 0 ${f1(y)} L ${W} ${f1(y)} `
  if (tipo === 'quadretti') for (let x = st; x < W; x += st) d += `M ${f1(x)} 0 L ${f1(x)} ${H} `
  put(g, { kind: 'path', name: 'quaderno', d, fill: 'transparent', stroke: col, sw: Math.max(1, 1.4 * g.u) })
  // il margine rosso del quaderno
  if (tipo === 'righe') put(g, { kind: 'line', name: 'margine', x1: U(g, 110), y1: 0, x2: U(g, 110), y2: H, color: alpha(g.P.acc, 0.5), width: Math.max(1, 2 * g.u) })
}

/** Un'istantanea: cornice bianca ruotata, ombra, foto nel quadrato, velo sulla striscia della didascalia. */
function istantanea(g: G, cx: number, cy: number, F: number, deg: number, frame: string, o: { name?: string; view?: 'zoom' | 'pieno'; alt?: number } = {}) {
  const Hf = F * 1.21, p = F * 0.88, topB = F * 0.06
  const pts = quad(cx, cy, F, Hf, deg)
  put(g, { kind: 'path', name: 'velo_ombra_polaroid', d: poly(quad(cx + U(g, 12), cy + U(g, 16), F * 1.01, Hf * 1.01, deg)), fill: ombra(0.12) })
  put(g, { kind: 'path', name: 'velo_ombra_polaroid', d: poly(quad(cx + U(g, 5), cy + U(g, 6), F, Hf, deg)), fill: ombra(0.16) })
  const [fx, fy] = tl(cx, cy, F, Hf, deg)
  put(g, { kind: 'rect', name: 'cornice', x: fx, y: fy, w: F, h: Hf, fill: frame, angle: deg || undefined, ...(dist(frame, g.P.bg) < 0.05 ? { stroke: alpha(g.P.fg, 0.18), sw: Math.max(1, 1.5 * g.u) } : {}) })
  const pc = loc(cx, cy, deg, 0, -Hf / 2 + topB + p / 2)
  const ppts = quad(pc[0], pc[1], p, p, deg)
  const b = bbox(ppts)
  const alt = o.alt !== undefined ? fxAlt(g, o.alt, frame) : g.k.trattamento === 'pellicola' ? { look: 'polaroid', adjust: { grain: 22, vignette: 24 } } : undefined
  ritaglio(g, o.name ?? 'foto', poly(ppts), ppts, { view: o.view === 'zoom' ? zoomView(b, g.r.range(1.5, 2.2), g.r.range(0.25, 0.75), g.r.range(0.25, 0.75)) : undefined, ...(alt ?? {}) })
  // striscia della didascalia: velo pieno del colore della cornice
  const sh = Hf - topB - p
  const sc = loc(cx, cy, deg, 0, Hf / 2 - sh / 2)
  const [sx, sy] = tl(sc[0], sc[1], F * 0.94, sh * 0.9, deg)
  put(g, { kind: 'rect', name: 'velo_didascalia', x: sx, y: sy, w: F * 0.94, h: sh * 0.9, fill: frame, angle: deg || undefined })
  return { pts, Hf, strip: { c: sc, w: F * 0.84, h: sh * 0.8 }, photo: ppts }
}

/**
 * La foto in una cornice da istantanea, ruotata e fissata col nastro, la
 * didascalia scritta sulla striscia bianca, fondo di quaderno, foglietto
 * adesivo con il numero, scarabocchi a pennarello.
 * Varianti: 0 una sola istantanea, 1 pila di tre, 2 istantanea al vivo.
 */
function polaroid(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  if (!g.photo) return null
  const v = (k.seme >> 3) % 3
  const side = g.landscape
  const E = k.energia
  const frame = cartaBianca(g)
  const penna = readable(frame, [darker(P.fg, P.bg), P.acc2, '#1d2a6b'], 7)
  const segno = readable(P.bg, [P.acc, P.acc2, P.fg], 2.6)
  const sign = r.pick([-1, 1])
  const deg = sign * (1.5 + 6 * E) * (s.registro === 'lusso' ? 0.5 : 1)

  // passo 1: fondo di quaderno o di carta
  const fondo = s.forma === 'mano' || s.registro === 'infantile' ? r.pick(['puntini', 'quadretti', 'righe'] as const) : k.densita > 0.55 ? r.pick(['puntini', 'quadretti'] as const) : null
  if (fondo) quaderno(g, fondo)

  // passo 2: misure. Testi fuori dall'istantanea (colonna) e foglietto con il numero
  const colW = side ? W * 0.38 : W - 2 * m
  const brand = lab(g, g.c.brand, side ? colW : W * 0.5)
  const headH = brand ? brand.h + U(g, 26) : 0
  // la didascalia: il titolo, se sta grande sulla striscia; altrimenti l'occhiello
  const F0 = side ? Math.min(H * 0.66, W * 0.4) : g.format === 'storia' ? W * 0.74 : W * (v === 2 ? 0.84 : 0.66)
  const capFit = display(g, g.c.title, F0 * 0.84, F0 * 0.2, 150, 40, 2)
  const titleOnFrame = v !== 1 && !!capFit && capFit.size >= g.sc.testo * 2.5
  const tOut = titleOnFrame ? null : display(g, g.c.title, colW, side ? H * 0.4 : H * 0.2, 110 + 80 * k.scala, 48, 3)
  if (!titleOnFrame && !tOut) return null
  const postNum = g.c.numero?.trim()
  const info = righeInfo(g, side ? colW : colW * (postNum ? 0.62 : 0.78), { kicker: titleOnFrame ? false : !postNum, bodyLines: 3 })
  const below = (tOut ? tOut.h + U(g, 34) : 0) + info.h

  // passo 3: l'istantanea (o la pila) nello spazio che resta
  let F = F0, cx: number, cy: number
  if (side) {
    cx = W * 0.3 + (v === 2 ? -W * 0.06 : 0)
    cy = H / 2 + (v === 2 ? -H * 0.08 : 0)
  } else {
    const top = v === 2 ? T - F * 0.35 : T + headH + U(g, 20)
    const avail = B - below - U(g, 60) - top
    F = Math.min(F, avail / (1.21 + 0.12))
    if (F < W * 0.42) return null
    cx = W / 2 + (v === 2 ? -W * 0.05 : sign * W * 0.04)
    cy = top + (F * 1.21 * Math.cos(rad(deg)) + F * Math.abs(Math.sin(rad(deg)))) / 2
  }
  const cap = titleOnFrame ? display(g, g.c.title, F * 0.84, F * 0.2, 150, 40, 2) : lab(g, g.c.kicker || g.c.brand, F * 0.8, 26)
  if (v === 1) {
    // pila: due istantanee dietro, più ruotate, con altri dettagli e trattamenti
    istantanea(g, cx - F * 0.2, cy + F * 0.02, F * 0.9, deg - sign * (8 + 6 * E), frame, { name: 'foto_dietro', view: 'zoom', alt: 0 })
    istantanea(g, cx + F * 0.16, cy - F * 0.05, F * 0.92, deg + sign * (6 + 5 * E), frame, { name: 'foto_dietro', view: 'zoom', alt: 1 })
  } else if (k.densita > 0.6 && !side) {
    // un'istantanea piccola che spunta dietro
    istantanea(g, cx + sign * F * 0.42, cy + F * 0.12, F * 0.5, deg + sign * 9, frame, { name: 'foto_dietro', view: 'zoom', alt: 2 })
  }
  const pol = istantanea(g, cx, cy, F, deg, frame)
  const polB = bbox(pol.pts)

  // passo 4: la didascalia sulla striscia, ruotata con la cornice
  if (cap) {
    const cw = cap.w, ch = cap.h
    const [tx, ty] = tl(pol.strip.c[0], pol.strip.c[1] + (titleOnFrame ? 0 : U(g, 2)), cw, ch, deg)
    if (titleOnFrame) putDisplay(g, 'titolo', cap, tx, ty, penna, 'left', cw, { angle: deg || undefined, su: frame })
    else putLab(g, 'didascalia', cap, tx, ty, penna, 'left', cw, { angle: deg || undefined })
    if (titleOnFrame && E > 0.4) {
      const [ux, uy] = loc(pol.strip.c[0], pol.strip.c[1], deg, -cw * 0.42, ch * 0.52)
      sottolinea(g, ux, uy, cw * 0.84, readable(frame, [P.acc, P.acc2], 2.4), deg)
    }
  }

  // passo 5: nastro adesivo sulla cornice
  const washi = s.registro === 'infantile' || s.registro === 'pop' ? alpha(readable(P.bg, [P.acc2, P.acc], 1.2), 0.7) : undefined
  if (v === 2 && !side) nastro(g, pol.pts[2][0] - U(g, 20), pol.pts[2][1], U(g, 150), deg - 35, washi)
  else if (r.chance(0.5)) nastro(g, (pol.pts[0][0] + pol.pts[1][0]) / 2, (pol.pts[0][1] + pol.pts[1][1]) / 2, U(g, 170), deg + r.range(-6, 6), washi)
  else { nastro(g, pol.pts[0][0] + U(g, 10), pol.pts[0][1] + U(g, 10), U(g, 120), deg - 40, washi); nastro(g, pol.pts[1][0] - U(g, 10), pol.pts[1][1] + U(g, 10), U(g, 120), deg + 40, washi) }

  // passo 6: titolo fuori (a pennarello) e informazioni sotto, o nella colonna accanto
  const brandCol = readable(P.bg, [P.fg], 4.5)
  let tx = m, ty = side ? Math.max(T + headH, (H - below) / 2) : Math.max(polB.y + polB.h + U(g, 44), B - below)
  if (side) tx = W - m - colW
  if (brand) putLab(g, 'brand', brand, side ? tx : m, T, brandCol)
  let titEl: Text | null = null
  if (tOut) {
    titEl = putDisplay(g, 'titolo', tOut, tx, ty, P.fg, 'left', colW)
    if (E > 0.3) sottolinea(g, tx, ty + tOut.h + U(g, 4), Math.min(tOut.w, colW) * r.range(0.45, 0.8), segno)
    ty += tOut.h + U(g, 34)
  }
  colonna(g, tinte(g, info.righe, P.bg), tx, ty, 0, 'left', info.w)

  // passo 7: il foglietto adesivo con il numero (o l'occhiello), a cavallo dell'angolo della foto
  const noteTxt = postNum || (titleOnFrame ? g.c.kicker : '')
  if (noteTxt) {
    const pw = Math.min(W, H) * (side ? 0.22 : 0.26)
    const pcol = distinto([P.acc2, P.acc, mix(P.acc2, '#ffffff', 0.4)], [P.bg, P.fg, frame], P.acc, 0.08)
    const corner = side ? pol.pts[1] : pol.pts[sign > 0 ? 1 : 0]
    const pc: Pt = [clamp(corner[0] + (corner[0] > W / 2 ? -pw * 0.15 : pw * 0.15), pw * 0.6, W - pw * 0.6), clamp(corner[1] + pw * 0.25, T + pw * 0.55, B - pw * 0.6)]
    const pd = -deg * 1.4 + r.range(-4, 4)
    const ppts = quad(pc[0], pc[1], pw, pw, pd)
    // il foglietto non copre testi già piazzati
    const busy = g.els.filter((e): e is Text => e.kind === 'text' && !e.deco).some(t => toccaTesto(t, ppts, U(g, 10)))
    if (!busy) {
      put(g, { kind: 'path', name: 'velo_ombra_foglietto', d: poly(quad(pc[0] + U(g, 6), pc[1] + U(g, 9), pw, pw * 1.02, pd)), fill: ombra(0.18) })
      const [rx, ry] = tl(pc[0], pc[1], pw, pw, pd)
      put(g, { kind: 'rect', name: 'foglietto', x: rx, y: ry, w: pw, h: pw, fill: pcol, angle: pd })
      const on = readable(pcol, [P.fg, '#111111', '#ffffff'], 4.5)
      if (postNum) {
        const ns = Math.min(sizeForWidth(postNum, s.impact, pw * 0.74, -0.01), pw * 0.42)
        const nw = lineWidth(postNum, s.impact, ns, -0.01)
        const kf = g.c.kicker && !titleOnFrame ? null : lab(g, g.c.kicker, pw * 0.8)
        const blockH = ns * 1.13 + (kf ? kf.h + U(g, 8) : 0)
        const [nx, ny] = tl(pc[0], pc[1] - blockH / 2 + ns * 0.565, nw, ns * 1.13, pd)
        txt(g, { name: 'numero', lines: [postNum], font: s.impact, size: ns, x: nx, y: ny, color: on, tracking: -0.01, leading: 1, angle: pd })
        if (kf) { const [kx, ky] = tl(pc[0], pc[1] + blockH / 2 - kf.h / 2, kf.w, kf.h, pd); putLab(g, 'occhiello', kf, kx, ky, on, 'left', kf.w, { angle: pd }) }
      } else {
        const kf = para(g, noteTxt, pw * 0.76, 3, 26)
        if (kf) { const [kx, ky] = tl(pc[0], pc[1], kf.w, kf.h, pd); txt(g, { name: 'occhiello', lines: kf.lines, font: s.text, size: kf.size, x: kx, y: ky, color: on, align: 'center', w: kf.w, leading: kf.leading ?? 1.3, angle: pd }) }
      }
    }
  }

  // passo 8: scarabocchi a pennarello: stelline a contorno vicino alla foto, freccia verso l'invito
  const nDoodle = Math.round(k.densita * 3)
  for (let i = 0; i < nDoodle; i++) {
    const a = r.range(0, Math.PI * 2)
    const px = polB.x + polB.w / 2 + Math.cos(a) * polB.w * 0.62, py = polB.y + polB.h / 2 + Math.sin(a) * polB.h * 0.56
    const sz = U(g, 16 + r.range(0, 14))
    const b = { x: px - sz, y: py - sz, w: 2 * sz, h: 2 * sz }
    if (px < sz || px > W - sz || py < sz || py > H - sz) continue
    if (g.els.some(e => e.kind === 'text' && !e.deco && inter(bbox(corners(e as Text, 0)), b, U(g, 8)))) continue
    put(g, { kind: 'path', name: 'segno', d: starPath(px, py, sz, 5, 0.45, r.range(-1, 1)), fill: 'transparent', stroke: segno, sw: U(g, 3) })
  }
  if (E > 0.45 && !side && titEl) {
    const inv = [...g.els].reverse().find(e => e.kind === 'text' && e.name === 'invito') as Text | undefined
    if (inv) {
      const b = bbox(corners(inv, 0))
      if (b.x + b.w + U(g, 140) < W - m) freccia(g, [b.x + b.w + U(g, 120), b.y - U(g, 40)], [b.x + b.w + U(g, 16), b.y + b.h / 2], segno)
    }
  }
  return finish(g, 'polaroid', 'Polaroid', { specchio: false })
}

/* ═══ Zine a ritagli ═════════════════════════════════════════════════════ */
/** Fotocopia: due toni duri con l'usura del toner (o il trattamento scelto, se è già da stampa). */
function fotocopia(g: G, inkC: string, paper: string): FxSpec[] {
  const { P, k } = g
  switch (k.trattamento) {
    case 'retino': return [{ id: 'halftone', variant: 'giornale', p: { mode: 0, ink: inkC, paper, paperOn: 1, size: 8 + Math.round(k.densita * 5), angle: 45 } }]
    case 'riso': return [{ id: 'riso', p: { ink1: P.acc, ink2: inkC, paper, reg1: 2, reg2: Math.round(3 + k.sovrastampa * 8), texture: 60 } }]
    case 'serigrafia': return [{ id: 'screenprint', p: { c1: inkC, c2: P.acc, c3: paper, offset: Math.round(2 + k.sovrastampa * 5) } }]
    default: return [{ id: 'gradientMap', p: { c1: inkC, c2: paper, three: 0, contrast: 55 } }, { id: 'grunge', variant: 'leggera' }]
  }
}
/** Graffetta: filo metallico piegato, con il riflesso. */
function graffetta(g: G, cx: number, cy: number, deg: number) {
  const L = U(g, 64), h = U(g, 7)
  const pts = quad(cx, cy, L, h, deg)
  put(g, { kind: 'path', name: 'graffetta', d: poly(pts), fill: '#9a9a96', stroke: '#5c5c58', sw: Math.max(1, 1.5 * g.u) })
  const [a, b] = [loc(cx, cy, deg, -L * 0.42, -h * 0.15), loc(cx, cy, deg, L * 0.42, -h * 0.15)]
  put(g, { kind: 'line', name: 'graffetta', x1: a[0], y1: a[1], x2: b[0], y2: b[1], color: alpha('#ffffff', 0.7), width: Math.max(1, 1.4 * g.u) })
}

interface Pezzo { text: string; font: FontSpec; size: number; tw: number; w: number; h: number; box: string; deg: number; up: boolean; tracking: number }

/**
 * Titolo a lettere ritagliate: ogni parola (o lettera, per la parola chiave)
 * in un ritaglio di colore e carattere diverso, ruotato, su righe che vanno a
 * capo come un biglietto anonimo. Restituisce null se non sta nella zona.
 */
function ritagliTitolo(g: G, zone: Box, colori: string[], o: { lettere?: boolean; maxSize: number } ): { pezzi: (Pezzo & { cx: number; cy: number })[]; h: number } | null {
  const { s, k, r } = g
  const fonts = [s.display, s.impact, s.label, s.text]
  const order = [0, 1, 2, 3].sort(() => r.next() - 0.5)
  const key = keyword(g).toUpperCase()
  const ws = words(g.c.title)
  const tokens: { t: string; fi: number; lettera: boolean }[] = []
  let n = 0
  for (const w of ws) {
    const clean = w.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase()
    if (o.lettere && clean === key && w.length >= 3 && w.length <= 9) for (const ch of w) tokens.push({ t: ch, fi: order[n++ % 4], lettera: true })
    else tokens.push({ t: w, fi: order[n++ % 4], lettera: false })
  }
  const E = k.energia
  for (let S = o.maxSize; S >= 44 * g.u; S = Math.floor(S * 0.95)) {
    const pezzi: Pezzo[] = tokens.map((tk, i) => {
      const font = fonts[tk.fi]
      const up2 = font === s.label || font === s.impact || (i % 3 === 1)
      const text = up2 ? tk.t.toUpperCase() : tk.t
      // due corpi soli: il titolo resta una frase
      const size = S * (i % 3 === 2 && !tk.lettera ? 0.82 : 1) * (font === s.label || font === s.text ? 0.9 : 1)
      const tracking = font === s.label ? 0.02 : 0
      const tw = lineWidth(text, font, size, tracking)
      const px = size * (tk.lettera ? 0.14 : 0.2), py = size * 0.08
      return { text, font, size, tw, w: tw + 2 * px, h: size * 1.13 + 2 * py, box: colori[(i * 7 + (k.seme % 5)) % colori.length], deg: (i % 2 ? 1 : -1) * r.range(1, 3 + 5 * E) * (tk.lettera ? 1.4 : clamp(U(g, 260) / (tw + 1), 0.35, 1)), up: up2, tracking }
    })
    // righe
    const gapX = S * 0.1
    const rows: Pezzo[][] = [[]]
    let x = 0
    for (const p of pezzi) {
      if (x + p.w > zone.w && rows[rows.length - 1].length) { rows.push([]); x = 0 }
      rows[rows.length - 1].push(p)
      x += p.w + gapX
    }
    if (pezzi.some(p => p.w > zone.w)) continue
    const rowH = rows.map(rw => Math.max(...rw.map(p => p.h + p.w * Math.abs(Math.sin(rad(p.deg))) * 0.9)))
    const total = rowH.reduce((a, b) => a + b, 0) + (rows.length - 1) * S * 0.06
    if (total > zone.h) continue
    const out: (Pezzo & { cx: number; cy: number })[] = []
    let y = zone.y
    rows.forEach((rw, ri) => {
      const rwW = rw.reduce((a, p) => a + p.w, 0) + (rw.length - 1) * gapX
      let xx = zone.x + (zone.w - rwW) * (ri % 2 ? r.range(0.15, 0.9) : r.range(0, 0.25)) * (0.4 + E)
      for (const p of rw) { out.push({ ...p, cx: xx + p.w / 2, cy: y + rowH[ri] / 2 + r.range(-1, 1) * S * 0.05 * E }); xx += p.w + gapX }
      y += rowH[ri] + S * 0.06
    })
    return { pezzi: out, h: total }
  }
  return null
}

/**
 * Zine: il titolo a lettere ritagliate come un biglietto anonimo, la foto
 * fotocopiata (due toni, toner consumato), graffette, testo battuto a macchina
 * su strisce di carta, evidenziatore, segni a pennarello.
 * Varianti: 0 copertina (foto grande), 1 pagina (foto pinzata), 2 pagina nera.
 */
function zine(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const v = (k.seme >> 3) % 3
  const side = g.landscape
  const E = k.energia
  const dk = darker(P.fg, P.bg), lt = lighter(P.fg, P.bg)
  const nero = v === 2
  const pg = nero ? dk : P.bg
  if (nero && !P.dark) put(g, { kind: 'rect', name: 'pagina', x: 0, y: 0, w: W, h: H, fill: pg })
  const paper = nero ? lt : cartaBianca(g)
  const segno = readable(pg, [P.acc, P.acc2, inchiostro(g, pg)], 3)

  // passo 1: la foto fotocopiata
  let photoBox: Box
  if (side) photoBox = v === 0 ? { x: 0, y: 0, w: W * 0.56, h: H } : { x: m, y: m * 1.2, w: W * 0.44, h: H - m * 2.4 }
  else photoBox = v === 0 ? { x: 0, y: 0, w: W, h: H * (g.format === 'storia' ? 0.5 : 0.56) } : { x: m * 1.1, y: T + U(g, 70), w: W - m * 2.2, h: H * (g.format === 'storia' ? 0.3 : 0.34) }
  const pdeg = v === 0 ? 0 : (r.pick([-1, 1]) * r.range(1, 2.6) * (0.5 + E))
  const ppts = v === 0 ? [[photoBox.x, photoBox.y], [photoBox.x + photoBox.w, photoBox.y], [photoBox.x + photoBox.w, photoBox.y + photoBox.h], [photoBox.x, photoBox.y + photoBox.h]] as Pt[]
    : forbice(r, quad(photoBox.x + photoBox.w / 2, photoBox.y + photoBox.h / 2, photoBox.w, photoBox.h, pdeg), U(g, 5))
  if (v !== 0) put(g, { kind: 'path', name: 'velo_ombra_foto', d: sposta(poly(ppts), U(g, 8), U(g, 12)), fill: ombra(nero ? 0.5 : 0.2) })
  if (g.photo) ritaglio(g, 'foto', poly(ppts), ppts, { fx: fotocopia(g, dk, nero ? lt : paper) })
  else put(g, { kind: 'path', name: 'foto', d: poly(ppts), fill: P.acc, fx: [{ id: 'genFill', p: { mode: 4, c1: paper, c2: paper, c3: P.acc, c4: dk, warp: 55 } }, { id: 'grunge', variant: 'timbro' }] })
  // inchiostro d'accento in sovrastampa su un pezzo della fotocopia
  if (k.sovrastampa > 0.4) {
    const bw = photoBox.w * r.range(0.3, 0.5), bh = photoBox.h * r.range(0.35, 0.6)
    const bx = photoBox.x + (r.chance(0.5) ? 0 : photoBox.w - bw), by = photoBox.y + photoBox.h * r.range(0, 0.3)
    put(g, { kind: 'path', name: 'inchiostro', d: poly(forbice(r, [[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]], U(g, 8))), fill: P.acc, blend: over(g, paper), opacity: 0.9 })
  }
  if (v !== 0) { graffetta(g, ppts[0][0] + photoBox.w * 0.12, ppts[0][1] + U(g, 18), pdeg + r.range(-8, 8)); graffetta(g, ppts[1][0] - photoBox.w * 0.12, ppts[1][1] + U(g, 18), pdeg + r.range(-8, 8)) }
  else if (!side) for (const fx of [0.1, 0.9]) graffetta(g, W * fx, U(g, 26), r.range(-6, 6))

  // passo 2: misure: strisce battute a macchina (brand, occhiello, testo, dettagli, invito)
  const colW = side ? W - photoBox.x - photoBox.w - m - U(g, 50) : W - 2 * m
  const infoW = side ? colW : colW * 0.72
  const info = righeInfo(g, infoW - U(g, 44), { kicker: true, bodyLines: 3 })
  const stripPad = U(g, 22)
  const infoH = info.h + 2 * stripPad

  // passo 3: il titolo ritagliato nello spazio tra la foto e le strisce
  const colori = [P.fg, P.acc, paper, P.acc2, nero ? P.bg : dk].filter((c, i, a) => a.indexOf(c) === i && dist(c, pg) > 0.08)
  const zx = side ? photoBox.x + photoBox.w + U(g, 40) - (v === 0 ? U(g, 120) : 0) : m
  const zw = side ? W - m - zx : W - 2 * m
  const zTop = side ? T + U(g, 70) : photoBox.y + photoBox.h - (v === 0 ? U(g, 90) : U(g, 30))
  const zBot = side ? B - infoH - U(g, 40) : B - infoH - U(g, 40)
  const rt = ritagliTitolo(g, { x: zx, y: zTop, w: zw, h: zBot - zTop }, colori, { lettere: k.densita > 0.5 || s.forma === 'decostruito', maxSize: (110 + 90 * k.scala) * g.u })
  if (!rt) return null
  // la zona del titolo si centra in verticale nello spazio
  const dy = Math.max(0, (zBot - zTop - rt.h) * (v === 0 ? 0.15 : 0.5))
  const placed: Text[] = []
  for (const [i, p] of rt.pezzi.entries()) {
    let cy = p.cy + dy
    let cx = p.cx
    for (let n = 0; n < 30; n++) { const pts = quad(cx, cy, p.w, p.h, p.deg); if (!placed.some(t => toccaTesto(t, pts, U(g, 1)))) break; cx += U(g, 3); cy += U(g, 2) }
    const pts = forbice(r, quad(cx, cy, p.w, p.h, p.deg), p.size * 0.04)
    put(g, { kind: 'path', name: 'velo_ombra_ritaglio', d: sposta(poly(pts), U(g, 4), U(g, 6)), fill: ombra(nero ? 0.6 : 0.25) })
    put(g, { kind: 'path', name: 'velo_ritaglio', d: poly(pts), fill: p.box })
    const [rx, ry] = tl(cx, cy, p.w * 0.9, p.h * 0.84, p.deg)
    put(g, { kind: 'rect', name: 'velo_ritaglio_pieno', x: rx, y: ry, w: p.w * 0.9, h: p.h * 0.84, fill: p.box, angle: p.deg })
    const [tx, ty] = tl(cx, cy + p.size * 0.03, p.tw, p.size * 1.13, p.deg)
    placed.push(txt(g, { name: `titolo#${i}`, lines: [p.text], font: p.font, size: p.size, x: tx, y: ty, color: readable(p.box, [P.fg, P.bg, '#111111', '#ffffff'], 4.5), tracking: p.tracking, leading: 1, angle: p.deg }))
  }

  // passo 4: le strisce battute a macchina, ognuna col suo nastro; evidenziatore sui dettagli
  const sx = side ? W - m - infoW : m + (r.chance(0.5) ? 0 : colW - infoW)
  const sy = B - infoH
  const sdeg = r.pick([-1, 1]) * r.range(0.5, 1.4) * (0.5 + E)
  foglio(g, 'striscia', sx + infoW / 2, sy + infoH / 2, infoW, infoH, sdeg, paper, { taglio: true, ombra: nero ? 0.5 : 0.18 })
  const [ix, iy] = loc(sx + infoW / 2, sy + infoH / 2, sdeg, -infoW / 2 + U(g, 22), -infoH / 2 + stripPad)
  colonna(g, tinte(g, info.righe, paper), ix, iy, sdeg)
  nastro(g, sx + infoW * 0.5, sy, U(g, 130), sdeg + r.range(-5, 5))
  const det = [...g.els].reverse().find(e => e.kind === 'text' && e.name === 'dettagli') as Text | undefined
  if (det && lum(paper) > 0.5) {
    const c = corners(det, U(g, 4))
    put(g, { kind: 'path', name: 'evidenziatore', d: poly([[c[0][0] - U(g, 6), c[0][1] + U(g, 2)], [c[1][0] + U(g, 8), c[1][1] - U(g, 1)], [c[2][0] + U(g, 4), c[2][1]], [c[3][0] - U(g, 3), c[3][1] + U(g, 2)]]), fill: readable(paper, [P.acc2, P.acc], 1.3), blend: 'multiply', opacity: 0.55 })
  }

  // passo 5: brand battuto su una striscia in alto, numero in un timbro a pennarello
  const brand = lab(g, g.c.brand, W * 0.4)
  if (brand) {
    const bw = brand.w + U(g, 36), bh = brand.h + U(g, 22)
    const bc: Pt = side && v === 0 ? [W - m - bw / 2, T + bh / 2] : [W - m - bw / 2, (v === 0 && !side ? photoBox.y + U(g, 70) : T) + bh / 2]
    const bd = r.range(-2.5, 2.5)
    const bpts = quad(bc[0], bc[1], bw, bh, bd)
    if (!placed.some(t => toccaTesto(t, bpts, U(g, 6)))) {
      foglio(g, 'brand', bc[0], bc[1], bw, bh, bd, nero ? P.acc : paper, { taglio: true, ombra: 0.25 })
      const [tx, ty] = tl(bc[0], bc[1], brand.w, brand.h, bd)
      putLab(g, 'brand', brand, tx, ty, inchiostro(g, nero ? P.acc : paper, 4.5), 'left', brand.w, { angle: bd })
    }
  }
  const num = g.c.numero?.trim()
  if (num) {
    const ns = U(g, 54 + 20 * k.scala)
    const nw = lineWidth(num, s.impact, ns, 0)
    const ncx = side ? zx + nw / 2 + U(g, 30) : W - m - nw / 2 - U(g, 30), ncy = side ? B - infoH - U(g, 80) - ns / 2 : sy - U(g, 70) - ns / 2
    const nd = -6 - 6 * E
    const [tx, ty] = tl(ncx, ncy, nw, ns * 1.13, nd)
    const tryT: Text = { kind: 'text', name: 'numero', x: tx, y: ty, w: nw, h: ns * 1.13, tw: nw, lines: [num], font: s.impact, size: ns, color: segno, align: 'left', lineHeight: 1, tracking: 0, angle: nd }
    const ok = !g.els.some(e => e.kind === 'text' && !e.deco && obbTouch(corners(e as Text, U(g, 20)), corners(tryT, 0))) && ty > T && ty + ns * 1.3 < B && (side || !inter(bbox(corners(tryT, 0)), photoBox))
    if (ok) {
      g.els.push(tryT)
      const b = bbox(corners(tryT, U(g, 8)))
      put(g, { kind: 'path', name: 'cerchiato', d: scribbleEllipse(r, { x: b.x + b.w * 0.1, y: b.y + b.h * 0.15, w: b.w * 0.8, h: b.h * 0.7 }), fill: 'transparent', stroke: segno, sw: U(g, 4) })
    }
  }

  // passo 6: segni: freccia a pennarello verso il titolo, scritta di servizio lungo il bordo
  if (E > 0.35 && placed.length) {
    const t0 = bbox(corners(placed[placed.length - 1], 0))
    const ax = t0.x + t0.w + U(g, 120), ay = t0.y + t0.h + U(g, 70)
    if (ax < W - m && ay < sy - U(g, 10)) freccia(g, [ax, ay], [t0.x + t0.w + U(g, 14), t0.y + t0.h * 0.7], segno)
  }
  const servizio = `${(g.c.brand ?? '').toUpperCase()}  ✂  ${detailsLine(g.c).toUpperCase()}  ✂  ${(g.c.kicker ?? '').toUpperCase()}`
  txt(g, { name: 'servizio', lines: [servizio], font: s.label, size: U(g, 12), x: W - m * 0.35, y: side ? m : T, color: alpha(inchiostro(g, pg), 0.55), tracking: 0.18, angle: 90, deco: true })
  return finish(g, 'zine', 'Zine a ritagli', { specchio: false })
}

/* ═══ Mosaico pop ════════════════════════════════════════════════════════ */
/** Retino Ben-Day: puntini regolari in un riquadro (un solo tracciato). */
function benday(g: G, name: string, b: Box, step: number, rr: number, color: string, o: { blend?: GlobalCompositeOperation; opacity?: number } = {}) {
  let d = ''
  let row = 0
  for (let y = b.y + step / 2; y < b.y + b.h; y += step * 0.866, row++) {
    for (let x = b.x + step / 2 + (row % 2 ? step / 2 : 0); x < b.x + b.w - rr; x += step) d += `M ${f1(x - rr)} ${f1(y)} a ${f1(rr)} ${f1(rr)} 0 1 0 ${f1(2 * rr)} 0 a ${f1(rr)} ${f1(rr)} 0 1 0 ${f1(-2 * rr)} 0 `
  }
  if (d) put(g, { kind: 'path', name, d, fill: color, blend: o.blend, opacity: o.opacity })
}

/**
 * Trattamento della tessera i: serigrafia su campo pieno (la foto in nero in
 * moltiplica, fuori registro), bicromia, tre tinte, retino pop. I colori delle
 * foto non entrano nella palette dei campi: le tinte piene restano poche.
 */
function tessera(g: G, i: number, b: Box, campi: string[], o: { gap?: number } = {}) {
  const { P, k, r } = g
  const dk = darker(P.fg, P.bg)
  const ink2 = mix(P.acc2, P.acc, 0.5)
  const tipo = (i * 5 + (k.seme % 7)) % 4
  const reg = U(g, 4 + 14 * k.sovrastampa)
  const view = { x: b.x + r.range(-reg, reg), y: b.y + r.range(-reg, reg), w: b.w, h: b.h }
  if (tipo === 0) {
    // serigrafia alla Warhol: campo pieno e la foto in nero sopra, in moltiplica, fuori registro
    const c = campi[i % campi.length]
    put(g, { kind: 'rect', name: 'tessera_campo', ...b, fill: c })
    put(g, { kind: 'image', name: `tessera_${i}`, ...b, url: g.photo, fallback: c, view, blend: 'multiply', fx: [{ id: 'gradientMap', p: { c1: dk, c2: '#ffffff', three: 0, contrast: 45 } }, { id: 'posterize', variant: 'tre' }] })
  } else if (tipo === 1) {
    const pairs: [string, string][] = [[dk, P.acc], [dk, P.acc2], [P.acc2 === P.bg ? dk : P.acc2, '#fff3c4'], [mix(dk, P.acc, 0.3), ink2]]
    const [c1, c2] = pairs[(i + k.seme) % pairs.length]
    put(g, { kind: 'image', name: `tessera_${i}`, ...b, url: g.photo, fallback: P.acc, view, fx: [{ id: 'gradientMap', variant: 'duotone', p: { c1, c2, three: 0, contrast: 35 } }] })
  } else if (tipo === 2) {
    const tri: [string, string, string][] = [[dk, P.acc, '#fff6d6'], [dk, P.acc2, mix(P.acc, '#ffffff', 0.55)], [mix(dk, P.acc2, 0.25), P.acc, mix(P.acc2, '#ffffff', 0.6)]]
    const [c1, c2, c3] = tri[(i + k.seme) % tri.length]
    put(g, { kind: 'image', name: `tessera_${i}`, ...b, url: g.photo, fallback: P.acc, view, fx: [{ id: 'screenprint', p: { c1, c2, c3, offset: Math.round(2 + k.sovrastampa * 6) } }] })
  } else {
    const c = campi[(i + 1) % campi.length]
    put(g, { kind: 'rect', name: 'tessera_campo', ...b, fill: c })
    put(g, { kind: 'image', name: `tessera_${i}`, ...b, url: g.photo, fallback: c, view, blend: 'multiply', fx: [{ id: 'halftone', variant: 'pop', p: { mode: 0, ink: dk, paper: '#ffffff', paperOn: 1, size: 7 + Math.round(k.densita * 6), angle: 15 } }] })
  }
  void o
}

/**
 * La stessa foto ripetuta in una griglia di tessere, ognuna con un trattamento
 * e una tinta diversa (serigrafia, bicromia, retino), il titolo su una fascia
 * che attraversa la griglia, una tessera di colore pieno con il numero e il
 * retino Ben-Day, le informazioni in un blocco della griglia.
 * Varianti: 0 griglia al vivo, 1 griglia in cornice con fascia inclinata, 2 scacchiera.
 */
function mosaico(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  if (!g.photo) return null
  const v = (k.seme >> 3) % 3
  const side = g.landscape
  const E = k.energia
  const dk = darker(P.fg, P.bg)
  const paper = cartaBianca(g)
  const campi = [P.acc, P.acc2, paper].filter((c, i, a) => a.indexOf(c) === i && c !== P.bg || i === 2)

  // passo 1: misure del titolo e delle informazioni
  const tf = side ? s.display : s.display
  const t = display(g, g.c.title, v === 1 ? W * 0.84 : W - 2 * m - U(g, 40), side ? H * 0.3 : H * 0.2, 130 + 110 * k.scala, 52, v === 2 && !side ? 3 : 2)
  if (!t) return null
  void tf
  const pad = t.size * 0.3
  const bandH = t.h + 2 * pad

  // passo 2: la griglia
  let area: Box
  let infoBox: Box | null = null
  const infoW0 = side ? W * 0.3 : W - 2 * m
  if (v === 0) area = { x: 0, y: 0, w: W, h: H }
  else if (v === 1) area = side ? { x: m, y: m, w: W * 0.62, h: H - 2 * m } : { x: m, y: T + U(g, 60), w: W - 2 * m, h: (B - T) * 0.62 }
  else area = side ? { x: m, y: m, w: W * 0.5, h: H - 2 * m } : { x: m, y: T + U(g, 60), w: W - 2 * m, h: (B - T) * (g.format === 'storia' ? 0.52 : 0.5) }
  const cols = side ? (v === 0 ? (k.densita > 0.6 ? 5 : 4) : 3) : k.densita > 0.6 ? 3 : 2
  const rows = Math.max(2, Math.round(cols * (area.h / area.w)))
  const gut = v === 1 ? U(g, 10) : v === 2 ? U(g, 8) : 0
  const tw = (area.w - (cols - 1) * gut) / cols, th = (area.h - (rows - 1) * gut) / rows
  const cell = (c: number, rr: number, sc = 1, sr = 1): Box => ({ x: area.x + c * (tw + gut), y: area.y + rr * (th + gut), w: sc * tw + (sc - 1) * gut, h: sr * th + (sr - 1) * gut })
  const used = new Set<string>()
  const take = (c: number, rr: number, sc = 1, sr = 1) => { for (let i = 0; i < sc; i++) for (let j = 0; j < sr; j++) used.add(`${c + i},${rr + j}`) }
  if (v === 1) put(g, { kind: 'rect', name: 'cornice', x: area.x - gut, y: area.y - gut, w: area.w + 2 * gut, h: area.h + 2 * gut, fill: dk })

  // passo 3: le celle speciali: blocco informazioni (variante al vivo), tessera del numero
  const info0 = righeInfo(g, (v === 0 ? Math.min(2 * tw, W * 0.62) : infoW0) - U(g, 60), { kicker: v === 0, bodyLines: 3 })
  if (v === 0) {
    // il blocco informazioni occupa due tessere (o una colonna) dentro la zona sicura
    const sc = side ? 2 : Math.min(2, cols), sr = Math.max(1, Math.ceil((info0.h + U(g, 120)) / (th + gut)))
    let rr = rows - sr
    while (rr > 0 && cell(0, rr, sc, sr).y + cell(0, rr, sc, sr).h > H - (H - B) * 0.6) rr--
    const c0 = r.chance(0.5) ? 0 : cols - sc
    infoBox = cell(c0, rr, sc, sr)
    take(c0, rr, sc, sr)
  }
  const num = g.c.numero?.trim()
  let numCell: [number, number] | null = null
  const freeCells = () => { const l: [number, number][] = []; for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) if (!used.has(`${c},${rr}`)) l.push([c, rr]); return l }
  {
    const f = freeCells().filter(([, rr]) => rr === 0 || rr === rows - 1)
    if (f.length) { numCell = r.pick(f); take(numCell[0], numCell[1]) }
  }

  // passo 4: le tessere (scacchiera: una su due a colore pieno con il retino)
  let ti = 0
  for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
    if (used.has(`${c},${rr}`)) continue
    const b = cell(c, rr)
    if (v === 2 && (c + rr) % 2 === 1) {
      const col = campi[(c + rr * 3 + k.seme) % campi.length]
      put(g, { kind: 'rect', name: 'tessera_campo', ...b, fill: col })
      benday(g, 'retino', b, U(g, 18), U(g, 4 + 3 * k.densita), readable(col, [P.acc2, P.acc, dk], 1.4))
      continue
    }
    tessera(g, ti++, b, campi)
  }
  // la tessera del numero (o del brand): colore pieno, retino, cifra enorme
  if (numCell) {
    const b = cell(numCell[0], numCell[1])
    const col = readable(P.bg, [P.acc, P.acc2], 1.2)
    put(g, { kind: 'rect', name: 'tessera_numero', ...b, fill: col })
    benday(g, 'retino', { x: b.x, y: b.y + b.h * 0.5, w: b.w, h: b.h * 0.5 }, U(g, 16), U(g, 4.5), readable(col, [P.acc2, dk, P.fg], 1.5))
    const label = num || (g.c.brand ?? '').split(' ')[0]
    if (label) {
      const font = num ? s.impact : s.display
      const ns = Math.min(sizeForWidth(label, font, b.w - U(g, 50), -0.01), b.h * 0.42)
      if (ns > 40 * g.u) {
        const on = readable(col, [P.fg, dk, '#ffffff', '#111111'], 4.5)
        const lw = lineWidth(label, font, ns, -0.01)
        // il numero sta sul campo pieno, sopra il retino
        txt(g, { name: num ? 'numero' : 'brand_tessera', lines: [label], font, size: ns, x: b.x + (b.w - lw) / 2, y: b.y + U(g, 26), color: on, tracking: -0.01, leading: 1 })
      }
    }
  }

  // passo 5: la fascia col titolo che attraversa la griglia
  const ang = v === 1 ? -(3 + 8 * E) : v === 0 && E > 0.6 ? -(1.5 + 3 * E) : 0
  const bandCol = v === 2 ? P.bg : r.chance(0.5) ? dk : paper
  const onBand = readable(bandCol, [P.fg, P.bg, '#ffffff', '#111111'], 4.5)
  let bandY: number
  if (v === 2) bandY = side ? 0 : area.y + area.h + U(g, 30)
  else if (side) bandY = H * 0.5 - bandH / 2
  else {
    // a cavallo di una linea della griglia, mai sul blocco informazioni
    const lines = Array.from({ length: rows - 1 }, (_, i) => area.y + (i + 1) * (th + gut) - gut / 2).filter(y => y - bandH / 2 > T && (!infoBox || y + bandH / 2 < infoBox.y - U(g, 20) || y - bandH / 2 > infoBox.y + infoBox.h + U(g, 20)))
    const target = area.y + area.h * (v === 1 ? 0.55 : 0.42)
    const y0 = lines.sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0]
    if (y0 === undefined) return null
    bandY = y0 - bandH / 2
  }
  let titleBox: Box
  if (v === 2 && side) {
    const x = area.x + area.w + U(g, 50)
    const t2 = display(g, g.c.title, W - m - x, H * 0.5, 130 + 90 * k.scala, 52, 4)
    if (!t2) return null
    putDisplay(g, 'titolo', t2, x, T + U(g, 40), P.fg, 'left', W - m - x)
    titleBox = { x, y: T + U(g, 40), w: W - m - x, h: t2.h }
  } else if (v === 2) {
    putDisplay(g, 'titolo', t, m, bandY, P.fg, 'left', W - 2 * m)
    titleBox = { x: m, y: bandY, w: t.w, h: t.h }
  } else {
    const L = Math.hypot(W, H) * 1.4
    const cy = bandY + bandH / 2, cx = W / 2
    const [bx, by] = tl(cx, cy, L, bandH, ang)
    if (k.sovrastampa > 0.35) { const [sx, sy] = tl(cx + U(g, 12), cy + U(g, 12), L, bandH, ang); put(g, { kind: 'rect', name: 'ombra_fascia', x: sx, y: sy, w: L, h: bandH, fill: readable(bandCol, [P.acc, P.acc2], 1.4), angle: ang || undefined, blend: over(g, P.acc), opacity: 0.95 }) }
    put(g, { kind: 'rect', name: 'velo_fascia', x: bx, y: by, w: L, h: bandH, fill: bandCol, angle: ang || undefined, stroke: dk === bandCol ? undefined : dk, sw: U(g, 5) })
    const tx0 = side || v === 1 ? m + U(g, 20) : (W - t.w) / 2
    // il titolo segue la fascia: centro sulla stessa retta
    const off = tx0 + t.w / 2 - cx
    const [tx, ty] = tl(cx + off * Math.cos(rad(ang)), cy + off * Math.sin(rad(ang)) + t.size * 0.03, t.w, t.h, ang)
    putDisplay(g, 'titolo', t, tx, ty, onBand, 'center', t.w, { angle: ang || undefined, su: bandCol })
    titleBox = bbox(quad(cx, cy, W, bandH, ang))
  }

  // passo 6: informazioni (nel blocco della griglia, o sotto / accanto)
  const brand = lab(g, g.c.brand, W * 0.4)
  if (infoBox) {
    const ib = infoBox
    const ic = paper === P.bg ? P.bg : paper
    put(g, { kind: 'rect', name: 'velo_info', ...ib, fill: ic, stroke: dk, sw: U(g, 5) })
    let y = ib.y + U(g, 32)
    if (brand && brand.w < ib.w - U(g, 60)) { putLab(g, 'brand', brand, ib.x + U(g, 30), y, inchiostro(g, ic, 7)); y += brand.h + U(g, 18) }
    const info = righeInfo(g, ib.w - U(g, 60), { kicker: true, bodyLines: Math.max(1, Math.floor((ib.y + ib.h - y - U(g, 120)) / (30 * g.u))) })
    if (y + info.h > ib.y + ib.h - U(g, 20)) return null
    colonna(g, tinte(g, info.righe, ic), ib.x + U(g, 30), ib.y + ib.h - U(g, 30) - info.h, 0, 'left', info.w)
  } else {
    const head = lab(g, [g.c.brand, g.c.kicker].filter(Boolean).join('  ·  '), side ? W * 0.5 : W - 2 * m)
    if (head) putLab(g, 'brand', head, side ? area.x : m, side ? H - m - head.h : T, inchiostro(g, P.bg, 7))
    const info = righeInfo(g, side ? (v === 2 ? W - m - (area.x + area.w + U(g, 50)) : W - m - (area.x + area.w + U(g, 50))) : (W - 2 * m) * 0.72, { kicker: false, bodyLines: 3 })
    const ix = side ? area.x + area.w + U(g, 50) : m
    const iy = side ? B - info.h : B - info.h
    if (!side && iy < titleBox.y + titleBox.h + U(g, 30)) return null
    if (side && v === 2 && iy < titleBox.y + titleBox.h + U(g, 40)) return null
    colonna(g, tinte(g, info.righe, P.bg), ix, iy, 0, 'left', info.w)
    // retino Ben-Day accanto alle informazioni
    if (!side && k.densita > 0.4) benday(g, 'retino', { x: W - m - (W - 2 * m) * 0.22, y: iy, w: (W - 2 * m) * 0.22, h: info.h }, U(g, 16), U(g, 4), readable(P.bg, [P.acc, P.acc2], 1.5))
  }
  if (v !== 0) {
    // crocini attorno alla griglia: la tavola esce da una serigrafia
    crocini(g, area, alpha(P.fg, 0.7), U(g, 16), U(g, 22))
  }
  return finish(g, 'mosaico', 'Mosaico pop', { specchio: v === 0 })
}


export const SYSTEMS_B: Record<'collage' | 'polaroid' | 'zine' | 'mosaico' | 'acquerello' | 'biglietto' | 'etichetta' | 'fumetto', Sistema> = {
  collage,
  polaroid,
  zine,
  mosaico,
  acquerello,
  biglietto,
  etichetta,
  fumetto,
}
