/**
 * Ricette del laboratorio grafico. Ogni ricetta è un'idea completa (segno,
 * materia, tipografia, stampa) che il seme varia senza mai uscire dal suo stile.
 * Restituiscono un canvas ad alta risoluzione: tavola intera o pezzo scontornato.
 */
import {
  blurMask, combine, dither, drawMask, fbm, fitSize, grain, inkBox, liquid, makeCanvas, maskToCanvas,
  newMask, noise2, polar, range, remap, rng, slices, smoothstep, stretch, text, xerox,
  type Ctx, type Mask, type Rnd,
} from './raster'
import { SILHOUETTES, band, growth, inkPlume, lozenge, mirrored, needle, sigil, spindle, swash, taper, thornRing, walk, type Pt } from './strokes'
import { shade, type Material } from './material'
import { coffeeRings, crescent, foam, membrane, neuralNet } from './organic'
import { DISPLAY_FACES, FACES, type FaceId } from './fonts'
import { drawWing, gridPaper, mapWing, organism, penLine, wingBox, wingTree, type Hand, type WingGeom } from './notebook'

// ─── tipi ────────────────────────────────────────────────────────────────────

export type RParam =
  | { key: string; label: string; type: 'range'; min: number; max: number; def: number }
  | { key: string; label: string; type: 'select'; options: string[]; def: number }
  | { key: string; label: string; type: 'text'; def: string }
  | { key: string; label: string; type: 'toggle'; def: boolean }

export type RValues = Record<string, number | string | boolean>
export interface Job { W: number; H: number; p: RValues; seed: number; transparent: boolean }
export interface Recipe {
  id: string; label: string; cat: string; hint: string
  /** nasce come pezzo scontornato (decori leggeri) invece che come tavola */
  piece?: boolean
  params: RParam[]
  render: (o: Job) => HTMLCanvasElement
}

export interface Tone { id: string; label: string; bg: string; ink: string; acc: string; dark: boolean }
export const TONES: Tone[] = [
  { id: 'notte', label: 'Notte', bg: '#0b0b0c', ink: '#ecebe6', acc: '#c6ff2e', dark: true },
  { id: 'carta', label: 'Carta', bg: '#ebe6dc', ink: '#121212', acc: '#e3361b', dark: false },
  { id: 'sangue', label: 'Sangue', bg: '#110909', ink: '#efe4da', acc: '#c0121c', dark: true },
  { id: 'osso', label: 'Osso', bg: '#d9d2c3', ink: '#26231e', acc: '#7d1b1b', dark: false },
  { id: 'acido', label: 'Acido', bg: '#d4ff2a', ink: '#0d0d0d', acc: '#ff2b9c', dark: false },
  { id: 'cobalto', label: 'Cobalto', bg: '#1630ff', ink: '#f2efe8', acc: '#ff5b1f', dark: true },
  { id: 'cenere', label: 'Cenere', bg: '#aaa9a4', ink: '#111111', acc: '#f4f3ee', dark: false },
  { id: 'livido', label: 'Livido', bg: '#1a0f24', ink: '#e9dcff', acc: '#9dff6a', dark: true },
  { id: 'rosanotte', label: 'Rosa notte', bg: '#151214', ink: '#f3e7ef', acc: '#ff5fb4', dark: true },
]

const MATS: (Material | null)[] = [null, 'cromo', 'nero', 'oro', 'iride', 'gel', 'perla']
const MAT_LABELS = ['Inchiostro', 'Cromo', 'Nero lucido', 'Oro', 'Iridescente', 'Gel', 'Perla']

// ─── parametri ricorrenti ────────────────────────────────────────────────────

const P = {
  tone: (def = 0): RParam => ({ key: 'tone', label: 'Tono', type: 'select', options: TONES.map(t => t.label), def }),
  mat: (def = 0): RParam => ({ key: 'mat', label: 'Materia', type: 'select', options: MAT_LABELS, def }),
  face: (def: FaceId): RParam => ({ key: 'face', label: 'Carattere', type: 'select', options: DISPLAY_FACES.map(f => f.label), def: DISPLAY_FACES.findIndex(f => f.id === def) }),
  text: (def: string, label = 'Testo'): RParam => ({ key: 'text', label, type: 'text', def }),
  caps: (def = true): RParam => ({ key: 'caps', label: 'Didascalie', type: 'toggle', def }),
  glow: (def = false): RParam => ({ key: 'glow', label: 'Alone', type: 'toggle', def }),
  grain: (def = 30): RParam => ({ key: 'grain', label: 'Grana', type: 'range', min: 0, max: 100, def }),
  range: (key: string, label: string, min: number, max: number, def: number): RParam => ({ key, label, type: 'range', min, max, def }),
  sel: (key: string, label: string, options: string[], def = 0): RParam => ({ key, label, type: 'select', options, def }),
  tog: (key: string, label: string, def: boolean): RParam => ({ key, label, type: 'toggle', def }),
}

const num = (o: Job, k: string) => Number(o.p[k])
const str = (o: Job, k: string) => String(o.p[k] ?? '')
const on = (o: Job, k: string) => o.p[k] === true
const tone = (o: Job) => TONES[num(o, 'tone')] ?? TONES[0]
const face = (o: Job) => FACES[(DISPLAY_FACES[num(o, 'face')] ?? DISPLAY_FACES[0]).id]
const lines = (s: string) => s.split(/\||\n/).map(x => x.trim()).filter(Boolean)
const SS = (o: Job) => Math.min(o.W, o.H)
const luma = (hex: string) => { const v = parseInt(hex.slice(1), 16); return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255 }

// ─── messa in tavola ─────────────────────────────────────────────────────────

function stage(o: Job, t: Tone) {
  const k = makeCanvas(o.W, o.H)
  if (!o.transparent) { k.ctx.fillStyle = t.bg; k.ctx.fillRect(0, 0, o.W, o.H) }
  return k
}

/** stende una maschera: inchiostro piatto o materia 3D, con alone opzionale */
function paint(ctx: Ctx, m: Mask, o: Job, t: Tone, matIdx: number, glow: boolean, round = 0.012, color?: string) {
  const S = SS(o)
  if (glow) {
    ctx.save()
    ctx.globalCompositeOperation = t.dark || o.transparent ? 'screen' : 'multiply'
    ctx.drawImage(maskToCanvas(blurMask(m, S * 0.035), t.acc, t.dark ? 0.95 : 0.55), 0, 0)
    ctx.drawImage(maskToCanvas(blurMask(m, S * 0.008), t.acc, 0.6), 0, 0)
    ctx.restore()
  }
  const mat = MATS[matIdx] ?? null
  ctx.drawImage(mat ? shade(m, mat, S * round, 0.85, t.acc) : maskToCanvas(m, color ?? t.ink), 0, 0)
}

const ROMAN_YEAR = 'MMXXVI'

/** micro-didascalie agli angoli e tacche di registro: il dettaglio da studio */
function captions(ctx: Ctx, o: Job, color: string, items: [string, string, string, string]) {
  const S = SS(o), size = Math.max(7, S * 0.0135), m = S * 0.045
  ctx.save()
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.globalAlpha = 0.9
  const f = FACES.mono
  text(ctx, items[0], m, m + size, f, size, 'left')
  text(ctx, items[1], o.W - m, m + size, f, size, 'right')
  text(ctx, items[2], m, o.H - m, f, size, 'left')
  text(ctx, items[3], o.W - m, o.H - m, f, size, 'right')
  ctx.lineWidth = Math.max(0.6, S * 0.0012)
  const tick = S * 0.018, cy = o.H / 2
  for (const x of [m * 0.55, o.W - m * 0.55]) { ctx.beginPath(); ctx.moveTo(x - tick / 2, cy); ctx.lineTo(x + tick / 2, cy); ctx.moveTo(x, cy - tick / 2); ctx.lineTo(x, cy + tick / 2); ctx.stroke() }
  ctx.restore()
}

const code = (o: Job, id: string) => `${id.toUpperCase()} — ${String(o.seed % 10000).padStart(4, '0')}`

/** pezzo: ritaglia al riquadro dell'inchiostro con un piccolo margine */
function crop(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')!
  const d = ctx.getImageData(0, 0, c.width, c.height).data
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (d[(y * c.width + x) * 4 + 3] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  if (x1 < 0) return c
  const pad = Math.round(Math.min(c.width, c.height) * 0.02)
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(c.width - 1, x1 + pad); y1 = Math.min(c.height - 1, y1 + pad)
  const k = makeCanvas(x1 - x0 + 1, y1 - y0 + 1)
  k.ctx.drawImage(c, -x0, -y0)
  return k.c
}

function finish(c: HTMLCanvasElement, o: Job, t: Tone, id: string, caps: [string, string, string, string] | null) {
  const ctx = c.getContext('2d')!
  if (o.transparent) return crop(c)
  if (caps && on(o, 'caps')) captions(ctx, o, t.ink, caps)
  const g = num(o, 'grain')
  if (g > 0) grain(ctx, o.W, o.H, (g / 100) * 0.16, o.seed)
  void id
  return c
}

/** altezza utile di una parola già adattata (per impaginare sopra/sotto) */
function wordSize(s: string, f: typeof FACES[FaceId], width: number) {
  const { ctx } = makeCanvas(4, 4)
  const str2 = 'upper' in f && f.upper ? s.toUpperCase() : s
  return fitSize(ctx, str2, f, width)
}

// ─── ORGANICI (cyber-gotico) ─────────────────────────────────────────────────

/** schiarisce/scurisce un colore esadecimale verso il nero */
const darken = (hex: string, k: number) => { const v = parseInt(hex.slice(1), 16); const f = (c: number) => Math.round(c * (1 - k)).toString(16).padStart(2, '0'); return '#' + f(v >> 16) + f((v >> 8) & 255) + f(v & 255) }

const membrana: Recipe = {
  id: 'membrana', label: 'Membrana', cat: 'Organici', hint: 'tessuto cellulare a due strati, fori grandi e minuscoli, artigli',
  params: [P.sel('shape', 'Composizione', ['Fuso', 'Fondi di tazza', 'Falce', 'Ali', 'Schiuma']), P.tone(0), P.mat(5), P.range('cells', 'Celle', 8, 80, 34), P.range('web', 'Tessuto', 30, 220, 135),
    P.range('varied', 'Varietà fori', 0, 100, 90), P.range('detail', 'Dettaglio', 0, 100, 60), P.range('claws', 'Artigli', 0, 100, 70), P.range('clawLen', 'Lunghezza artigli', 20, 200, 100),
    P.tog('depth', 'Doppio strato', true), P.tog('mirror', 'Simmetrica', true), P.range('chords', 'Cerchi grandi', 0, 6, 3), P.glow(false), P.caps(), P.grain(20)],
  render: o => {
    const t = tone(o), S = SS(o), sh = num(o, 'shape')
    const cx = o.W / 2, cy = o.H / 2 - S * 0.01
    const base = { cells: num(o, 'cells'), web: num(o, 'web') / 100, claws: num(o, 'claws') / 100, clawLen: num(o, 'clawLen') / 100, detail: num(o, 'detail') / 100 }
    const { c, ctx } = stage(o, t)
    const mat = MATS[num(o, 'mat')] ?? null
    if (sh === 4) {
      const m = foam(o.W, o.H, cx, cy, S * 0.44, rng(o.seed), { count: Math.round(base.cells * 0.7), line: num(o, 'web') / 100, gap: num(o, 'web') / 100, nested: num(o, 'detail') / 250, spread: 1 })
      paint(ctx, m, o, t, num(o, 'mat'), on(o, 'glow'), 0.006)
    } else if (sh === 1) {
      const m = coffeeRings(o.W, o.H, cx, cy, S * 0.34, rng(o.seed), S, { big: 2 + Math.round(num(o, 'chords') / 2), bubbles: Math.round(base.cells * 0.6), gap: base.web, stars: base.claws * 0.55, detail: base.detail })
      paint(ctx, m, o, t, num(o, 'mat'), on(o, 'glow'), 0.01)
    } else {
      const shape = [0, 0, 2, 3][sh]
      const R = S * (shape === 0 ? 0.46 : 0.4)
      const opts = { ...base, shape, holes: 0.9, mirror: on(o, 'mirror'), varied: num(o, 'varied') / 100 }
      if (on(o, 'depth')) {
        // strato di fondo: un altro tessuto, più grande e più scuro, visto attraverso i fori
        const back = membrane(o.W, o.H, cx + S * 0.008, cy - S * 0.012, R * 1.05, rng(o.seed + 77), { ...opts, detail: 0, claws: opts.claws * 0.6, web: opts.web * 0.8 })
        const tint = darken(t.acc, 0.55)
        ctx.drawImage(mat ? shade(back, mat === 'gel' ? 'gel' : mat, S * 0.008, 0.7, tint) : maskToCanvas(back, t.ink, 0.28), 0, 0)
        if (mat && mat !== 'gel') { ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, o.W, o.H); ctx.restore() }
        // ombra portata del tessuto davanti su quello dietro
        const front = membrane(o.W, o.H, cx, cy, R, rng(o.seed), opts)
        ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.drawImage(maskToCanvas(blurMask(front, S * 0.01), '#000000', 0.6), S * 0.006, S * 0.01); ctx.restore()
        paint(ctx, front, o, t, num(o, 'mat'), on(o, 'glow'), 0.012)
      } else paint(ctx, membrane(o.W, o.H, cx, cy, R, rng(o.seed), opts), o, t, num(o, 'mat'), on(o, 'glow'), 0.012)
    }
    return finish(c, o, t, 'membrana', ['CELLULA', code(o, 'cell'), ROMAN_YEAR, 'BIO—GOTHIC'])
  },
}

const rete: Recipe = {
  id: 'rete', label: 'Rete neurale', cat: 'Organici', hint: 'nodi d\'inchiostro a stella uniti da curve sottili come capelli',
  params: [P.tone(1), P.mat(0), P.range('nodes', 'Nodi', 4, 30, 14), P.range('links', 'Legami', 1, 5, 3), P.range('tendrils', 'Tentacoli', 0, 5, 2), P.range('weight', 'Peso', 40, 200, 100), P.range('reach', 'Allungo', 30, 200, 100), P.glow(false), P.caps(), P.grain(15)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed)
    const m = drawMask(o.W, o.H, ctx => neuralNet(ctx, r, o.W * 0.12, o.H * 0.1, o.W * 0.76, o.H * 0.8, S, { nodes: num(o, 'nodes'), links: num(o, 'links'), tendrils: num(o, 'tendrils'), weight: num(o, 'weight') / 100, reach: num(o, 'reach') / 100 }))
    const { c, ctx } = stage(o, t)
    paint(ctx, m, o, t, num(o, 'mat'), on(o, 'glow'), 0.008)
    return finish(c, o, t, 'rete', ['SYNAPSE', code(o, 'nrn'), ROMAN_YEAR, 'INK NETWORK'])
  },
}

const falce: Recipe = {
  id: 'falce', label: 'Falce gotica', cat: 'Organici', hint: 'falci ad ala con smerli concavi, punte interne e artigli',
  params: [P.tone(0), P.mat(0), P.sel('layout', 'Composizione', ['Coppia', 'Singola', 'Corona']), P.range('scallops', 'Smerli', 3, 9, 5), P.range('depth', 'Profondità', 10, 90, 55),
    P.range('thick', 'Spessore', 10, 60, 30), P.range('claws', 'Artigli', 0, 100, 50), P.glow(false), P.caps(), P.grain(20)],
  render: o => {
    const t = tone(o), S = SS(o), lay = num(o, 'layout')
    const opts = { scallops: num(o, 'scallops'), depth: num(o, 'depth') / 100, thickness: num(o, 'thick') / 100, sweep: 2.3, claws: num(o, 'claws') / 100 }
    const m = drawMask(o.W, o.H, ctx => {
      const cx = o.W / 2, cy = o.H / 2
      if (lay === 1) crescent(ctx, rng(o.seed), cx - S * 0.08, cy, S * 0.4, Math.PI, { ...opts, sweep: 2.5 })
      else if (lay === 0) {
        // coppia speculare: due ali che si guardano
        crescent(ctx, rng(o.seed), cx - S * 0.04, cy, S * 0.4, Math.PI, opts)
        ctx.save(); ctx.translate(2 * cx, 0); ctx.scale(-1, 1); crescent(ctx, rng(o.seed), cx - S * 0.04, cy, S * 0.4, Math.PI, opts); ctx.restore()
      } else {
        for (let k = 0; k < 3; k++) crescent(ctx, rng(o.seed + k), cx, cy, S * 0.38, -Math.PI / 2 + k * Math.PI * 2 / 3, { ...opts, sweep: 1.9 })
      }
    })
    const { c, ctx } = stage(o, t)
    paint(ctx, m, o, t, num(o, 'mat'), on(o, 'glow'), 0.01)
    return finish(c, o, t, 'falce', ['FALX', code(o, 'falx'), ROMAN_YEAR, 'NOX'])
  },
}

const quaderno: Recipe = {
  id: 'quaderno', label: 'Quaderno gotico', cat: 'Gotico', hint: 'organismo di ali a falce che germogliano l\'una dall\'altra, a penna viva',
  params: [P.sel('layout', 'Composizione', ['Organismo', 'Ala', 'Corona di ali']), P.tone(0), P.sel('style', 'Segno', ['Penna', 'Pieno']),
    P.range('pen', 'Penna', 40, 250, 100), P.range('bites', 'Smerli', 2, 8, 4), P.range('depth', 'Morso', 20, 90, 62),
    P.range('spikes', 'Aghi', 0, 100, 80), P.range('veins', 'Nervature', 0, 100, 60), P.range('echo', 'Riprese', 0, 100, 50),
    P.range('branch', 'Ramificazioni', 0, 100, 55), P.range('pairs', 'Coppie', 1, 5, 3),
    P.range('shake', 'Mano', 0, 100, 50), P.range('sketch', 'Ripassi', 0, 100, 45), P.range('breaks', 'Stacchi', 0, 100, 25),
    P.tog('grid', 'Quadretti', true), P.caps(false), P.grain(30)],
  render: o => {
    const t = tone(o), S = SS(o), lay = num(o, 'layout'), r = rng(o.seed), W = o.W, H = o.H
    const filled = num(o, 'style') === 1
    const hand: Hand = { lw: S * 0.0032 * num(o, 'pen') / 100, shake: num(o, 'shake') / 50, sketch: num(o, 'sketch') / 100, breaks: num(o, 'breaks') / 100 * 0.6, seed: o.seed + 5, r }
    const opts = (width: number, bites = num(o, 'bites'), bend = 1) => ({ width, bites, depth: num(o, 'depth') / 100, spikes: num(o, 'spikes') / 100, bend, veins: num(o, 'veins') / 100, echo: num(o, 'echo') / 100 })
    const branch = num(o, 'branch') / 100
    const wings: WingGeom[] = []
    const lines: Pt[][] = []
    // centra e scala nella tavola tutto ciò che è stato costruito
    const fit = (margin: number) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      for (const g of wings) { const b = wingBox(g); x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1) }
      for (const q of lines) for (const p of q) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]) }
      const k = Math.min((W * margin) / (x1 - x0), (H * margin) / (y1 - y0))
      const f = (p: Pt): Pt => [W / 2 + (p[0] - (x0 + x1) / 2) * k, H / 2 + (p[1] - (y0 + y1) / 2) * k]
      wings.splice(0, wings.length, ...wings.map(g => mapWing(g, f)))
      lines.splice(0, lines.length, ...lines.map(q => q.map(f)))
      hand.lw *= Math.min(1.6, Math.max(0.7, k))
    }
    if (lay === 1) {
      wings.push(...wingTree(r, 0, 0, 0.95 + range(r, -0.15, 0.15), S, opts(0.2), branch * 0.6, 1))
      fit(0.86)
    } else if (lay === 2) {
      // corona: un anello da cui le ali partono tangenti e si avvitano tutte nello stesso verso
      const R0 = S * range(r, 0.07, 0.11), cnt = 3 + Math.floor(r() * 3), rot = r() * Math.PI * 2
      for (let i = 0; i < cnt; i++) {
        const a = rot + i * Math.PI * 2 / cnt
        wings.push(...wingTree(r, Math.cos(a) * R0, Math.sin(a) * R0, a + Math.PI / 2 - range(r, 0.3, 0.6), S * range(r, 0.4, 0.5), opts(range(r, 0.16, 0.22)), branch))
      }
      const ring = (rr: number) => { const q: Pt[] = []; for (let j = 0; j <= 120; j++) { const a = j / 120 * Math.PI * 2; q.push([Math.cos(a) * rr, Math.sin(a) * rr]) } return q }
      lines.push(ring(R0), ring(R0 * range(r, 0.55, 0.75)))
      fit(0.84)
    } else {
      const org = organism(r, 0, 0, S * 1.3, S, opts(0.2), branch, num(o, 'pairs'))
      wings.push(...org.wings); lines.push(...org.blade)
      fit(0.88)
    }
    const m = drawMask(W, H, ctx => {
      for (const q of lines) penLine(ctx, q, hand, 1.1)
      for (const g of wings) drawWing(ctx, g, hand, filled)
    })
    const { c, ctx } = stage(o, t)
    if (on(o, 'grid') && !o.transparent) gridPaper(ctx, W, H, S * 0.024, t.ink, t.dark ? 0.22 : 0.24)
    ctx.drawImage(maskToCanvas(m, t.ink), 0, 0)
    return finish(c, o, t, 'quaderno', ['LIBER NOCTIS', code(o, 'lbr'), ROMAN_YEAR, 'MANU'])
  },
}

// ─── SIGILLI (cybersigilism) ─────────────────────────────────────────────────

const sigillo: Recipe = {
  id: 'sigillo', label: 'Sigillo cyber', cat: 'Sigilli', hint: 'emblema neo-tribale simmetrico: aghi, uncini, spine',
  params: [P.tone(0), P.mat(1), P.sel('sil', 'Sagoma', ['Dal seme', ...SILHOUETTES.map(x => x.label)]), P.sel('sym', 'Simmetria', ['Specchio', 'Rotazione']), P.range('strokes', 'Bracci', 6, 11, 9), P.range('spikes', 'Spine', 0, 3, 2), P.range('hook', 'Uncini', 0, 100, 60),
    P.range('weight', 'Peso', 40, 170, 100), P.tog('spine', 'Nucleo', true), P.tog('arcs', 'Falce', false), P.glow(false), P.text('', 'Titolo'), P.face('gotico'), P.caps(), P.grain(25)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed), title = str(o, 'text')
    // centro ottico: un poco sopra il centro geometrico
    const cy = o.H / 2 - S * 0.02 - (title ? S * 0.05 : 0)
    const opts = { strokes: num(o, 'strokes'), spikes: num(o, 'spikes'), hook: num(o, 'hook') / 100, weight: num(o, 'weight') / 100, spine: on(o, 'spine'), arcs: on(o, 'arcs'), silhouette: num(o, 'sil') - 1, symmetry: num(o, 'sym') }
    const draw = (k: number) => drawMask(o.W, o.H, ctx => sigil(ctx, rng(o.seed), o.W / 2, cy, S * (title ? 0.74 : 0.84) * k, opts))
    let m = draw(1)
    // la figura resta dentro l'area di sicurezza: se sborda, si ridisegna in scala
    const b = inkBox(m), safeX = o.W * 0.09, safeTop = o.H * 0.08, safeBot = o.H * (title ? 0.8 : 0.92)
    if (b) {
      const k = Math.min(1, (o.W / 2 - safeX) / Math.max(o.W / 2 - b.x0, b.x1 - o.W / 2), (cy - safeTop) / Math.max(1, cy - b.y0), (safeBot - cy) / Math.max(1, b.y1 - cy))
      if (k < 0.995) m = draw(k * 0.98)
    }
    void r
    const { c, ctx } = stage(o, t)
    paint(ctx, m, o, t, num(o, 'mat'), on(o, 'glow'))
    if (title) {
      ctx.fillStyle = t.ink
      const f = face(o), w = Math.min(o.W * 0.62, S * 0.7)
      text(ctx, title, o.W / 2, o.H / 2 + S * 0.43, f, Math.min(wordSize(title, f, w), S * 0.11), 'center')
    }
    return finish(c, o, t, 'sigillo', ['CREATIVE OS ⁄ LAB', code(o, 'sigil'), ROMAN_YEAR, 'NEO—TRIBAL'])
  },
}

const corona: Recipe = {
  id: 'corona', label: 'Corona di spine', cat: 'Sigilli', hint: 'una parola chiusa in un anello di spine affilate',
  params: [P.text('Veritas'), P.face('gotico'), P.tone(3), P.mat(0), P.range('thorns', 'Spine', 8, 40, 22), P.range('weight', 'Peso', 40, 170, 100), P.glow(false), P.caps(), P.grain(30)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed), R = S * 0.3
    const ring = drawMask(o.W, o.H, ctx => thornRing(ctx, r, o.W / 2, o.H / 2, R, S, num(o, 'thorns'), num(o, 'weight') / 100))
    const f = face(o), word = str(o, 'text') || ' '
    const size = Math.min(wordSize(word, f, R * 1.55), S * 0.17)
    const w = drawMask(o.W, o.H, ctx => text(ctx, word, o.W / 2, o.H / 2 + size * 0.32, f, size, 'center'))
    const { c, ctx } = stage(o, t)
    paint(ctx, ring, o, t, num(o, 'mat'), on(o, 'glow'))
    paint(ctx, w, o, t, num(o, 'mat'), false, 0.006)
    return finish(c, o, t, 'corona', ['CORONA SPINARUM', code(o, 'crwn'), ROMAN_YEAR, word.toUpperCase()])
  },
}

const fascia: Recipe = {
  id: 'fascia', label: 'Fascia tribale', cat: 'Sigilli', hint: 'bracciale neo-tribale orizzontale, da testata o divisore',
  piece: true,
  params: [P.tone(1), P.mat(0), P.range('weight', 'Peso', 40, 170, 100), P.range('stack', 'Ripetizioni', 1, 3, 1), P.glow(false), P.caps(false), P.grain(0)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed), n = num(o, 'stack')
    const m = drawMask(o.W, o.H, ctx => {
      for (let i = 0; i < n; i++) band(ctx, rng(o.seed + i * 13), o.W / 2, o.H / 2 + (i - (n - 1) / 2) * S * 0.24, o.W * 0.9, S, num(o, 'weight') / 100)
    })
    void r
    const { c, ctx } = stage(o, t)
    paint(ctx, m, o, t, num(o, 'mat'), on(o, 'glow'))
    return finish(c, o, t, 'fascia', ['ARMBAND', code(o, 'band'), ROMAN_YEAR, '—'])
  },
}

// ─── GOTICO ──────────────────────────────────────────────────────────────────

const PHI = 1.618

const ghirigoro: Recipe = {
  id: 'ghirigoro', label: 'Ghirigoro gotico', cat: 'Gotico', hint: 'parola blackletter con svolazzi a pennino in gerarchia aurea',
  params: [P.text('Anima'), P.face('gotico'), P.tone(3), P.mat(0), P.range('rich', 'Ricchezza', 1, 4, 3), P.range('nib', 'Pennino', 40, 160, 100), P.glow(false), P.caps(true), P.grain(25)],
  render: o => {
    const t = tone(o), S = SS(o), f = face(o), word = str(o, 'text') || 'A'
    const cx = o.W / 2, cy = o.H / 2 - S * 0.02
    const ww = Math.min(o.W * 0.58, S * 0.62)
    const size = Math.min(wordSize(word, f, ww), S * 0.22)
    const xh = size * 0.62                                   // altezza della parola sulla pagina
    const nib = S * 0.014 * (num(o, 'nib') / 100)
    const half = ww / 2, rich = num(o, 'rich')
    // il seme sceglie tra curvature curate, non numeri qualsiasi
    const r = rng(o.seed), cu = [1.5, 1.9, 2.3][Math.floor(r() * 3)], rise = [0.95, 1.05, 1.2][Math.floor(r() * 3)], under = [0.95, 1.1, 1.25][Math.floor(r() * 3)]
    const m = drawMask(o.W, o.H, ctx => {
      text(ctx, word, cx, cy + xh / 2, f, size, 'center')
      mirrored(ctx, cx, () => {
        // 2° livello: sottolineatura che parte dal centro e finisce in ricciolo
        swash(ctx, cx + nib * 3, cy + xh * 0.95, 0.03, half * under, cu * 0.8, nib * 0.85, -0.75, 1)
        // 1° livello: svolazzo che nasce dalla lettera esterna, sale e si avvolge
        if (rich >= 2) swash(ctx, cx + half * 1.04, cy - xh * 0.45, -1.05 * rise, xh * PHI * 1.15, cu, nib, -0.75, -1)
        // 4° livello: riccioli laterali a mezza altezza
        if (rich >= 4) swash(ctx, cx + half * 1.06, cy + xh * 0.2, 0.35, xh * 0.95, 2.1, nib / PHI, -0.75, 1)
      })
      // 3° livello: cresta sopra il centro e punto sotto la sottolineatura
      if (rich >= 3) {
        mirrored(ctx, cx, () => swash(ctx, cx + nib * 1.5, cy - xh * 1.25, -0.55, xh * 0.78, 1.7, nib / PHI, -0.75, -1))
        lozenge(ctx, cx, cy - xh * 1.32, nib * 1.6)
      }
      lozenge(ctx, cx, cy + xh * 0.95 + nib * 3.2, nib * 1.1)
    })
    const { c, ctx } = stage(o, t)
    paint(ctx, m, o, t, num(o, 'mat'), on(o, 'glow'), 0.006)
    return finish(c, o, t, 'gotico', ['LITTERA GOTHICA', code(o, 'goth'), ROMAN_YEAR, word.toUpperCase()])
  },
}

// ─── ALIENO & CROMO ──────────────────────────────────────────────────────────

const alieno: Recipe = {
  id: 'alieno', label: 'Crescita aliena', cat: 'Alieno & cromo', hint: 'rete vascolare biomeccanica: rami, nodi, aghi',
  params: [P.tone(0), P.mat(1), P.sel('layout', 'Forma', ['Simmetrica', 'Radiale', 'Pendente']), P.range('depth', 'Ramificazioni', 3, 7, 5), P.range('spread', 'Apertura', 10, 90, 45),
    P.range('weight', 'Peso', 40, 170, 100), P.tog('nodes', 'Nodi', true), P.glow(false), P.caps(), P.grain(20)],
  render: o => {
    const t = tone(o), S = SS(o), lay = num(o, 'layout')
    const opts = { depth: num(o, 'depth'), spread: num(o, 'spread') / 100, weight: num(o, 'weight') / 100, nodes: on(o, 'nodes') }
    const m = drawMask(o.W, o.H, ctx => {
      const cx = o.W / 2
      if (lay === 0) mirrored(ctx, cx, () => growth(ctx, rng(o.seed), o.seed, cx, o.H * 0.84, -Math.PI / 2 - 0.25, S, opts))
      else if (lay === 1) {
        const n = 5 + (o.seed % 3)
        for (let i = 0; i < n; i++) growth(ctx, rng(o.seed + 31), o.seed, cx, o.H / 2, (i / n) * Math.PI * 2, S * 0.78, { ...opts, depth: Math.max(2, opts.depth - 1) })
        ctx.beginPath(); ctx.arc(cx, o.H / 2, S * 0.035 * opts.weight, 0, Math.PI * 2); ctx.fill()
      } else mirrored(ctx, cx, () => growth(ctx, rng(o.seed), o.seed, cx, o.H * 0.14, Math.PI / 2 - 0.3, S, opts))
    })
    const { c, ctx } = stage(o, t)
    paint(ctx, m, o, t, num(o, 'mat'), on(o, 'glow'), 0.01)
    return finish(c, o, t, 'alieno', ['XENO—FORM', code(o, 'xeno'), ROMAN_YEAR, 'BIOMECH'])
  },
}

const cromo: Recipe = {
  id: 'cromo', label: 'Cromo liquido', cat: 'Alieno & cromo', hint: 'la scritta diventa metallo fuso, deformato e lucido',
  params: [P.text('CHROME'), P.face('espanso'), P.tone(0), P.mat(1), P.sel('warp', 'Deformazione', ['Nessuna', 'Liquido', 'Onda', 'Colata', 'Vortice'], 1),
    P.range('amount', 'Intensità', 0, 100, 55), P.tog('sparks', 'Scintille', true), P.glow(false), P.caps(), P.grain(15)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed), f = face(o), word = str(o, 'text') || ' '
    const amt = num(o, 'amount') / 100, warp = num(o, 'warp')
    const size = Math.min(wordSize(word, f, o.W * 0.82), S * 0.36)
    let m = drawMask(o.W, o.H, ctx => text(ctx, word, o.W / 2, o.H / 2 + size * 0.35, f, size, 'center'))
    const n = noise2(o.seed)
    if (warp === 1) m = remap(m, (x, y) => [x + n(x / S * 3, y / S * 3) * S * 0.035 * amt, y + n(x / S * 3 + 9, y / S * 3) * S * 0.05 * amt])
    if (warp === 2) m = remap(m, (x, y) => [x, y + Math.sin(x / o.W * Math.PI * 3 + o.seed) * S * 0.06 * amt])
    if (warp === 3) { const b = inkBox(m); if (b) m = stretch(m, 'down', b.y0 + (b.y1 - b.y0) * (0.55 + 0.3 * r()), S * 0.25 * amt) }
    if (warp === 4) m = remap(m, (x, y) => { const dx = x - o.W / 2, dy = y - o.H / 2, d = Math.hypot(dx, dy) / S, a = amt * 1.4 * Math.exp(-d * 3); const ca = Math.cos(a), sa = Math.sin(a); return [o.W / 2 + dx * ca - dy * sa, o.H / 2 + dx * sa + dy * ca] })
    m = liquid(m, S * 0.006, 0.5, 0.1)
    if (on(o, 'sparks')) {
      const sp = drawMask(o.W, o.H, ctx => {
        for (let i = 0; i < 4; i++) {
          const x = o.W * range(r, 0.15, 0.85), y = o.H / 2 + (r() < 0.5 ? -1 : 1) * size * range(r, 0.6, 0.95), L = S * range(r, 0.03, 0.07)
          for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; const { pts } = walk(x, y, a, L * (k % 2 ? 0.6 : 1), () => 0, 1); taper(ctx, pts, needle(L * 0.16, 0.02, 1.4)) }
        }
      })
      m = combine(m, sp, 'max')
    }
    const { c, ctx } = stage(o, t)
    paint(ctx, m, o, t, num(o, 'mat'), on(o, 'glow'), 0.016)
    return finish(c, o, t, 'cromo', ['LIQUID METAL', code(o, 'chrm'), ROMAN_YEAR, '©'])
  },
}

// ─── INCHIOSTRO ──────────────────────────────────────────────────────────────

const goccia: Recipe = {
  id: 'goccia', label: "Goccia d'inchiostro", cat: 'Inchiostro', hint: "inchiostro che cade in acqua: getto, fungo, veli",
  params: [P.tone(1), P.sel('inks', 'Inchiostri', ['Uno', 'Due']), P.range('turb', 'Turbolenza', 0, 100, 55), P.range('spread', 'Apertura', 10, 100, 55), P.range('density', 'Densità', 20, 100, 60), P.caps(), P.grain(15)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed)
    const { c, ctx } = stage(o, t)
    const layer = (seed: number, color: string, x: number, k: number) => {
      const L = makeCanvas(o.W, o.H)
      L.ctx.strokeStyle = color
      // testa della goccia: il punto d'impatto, pieno al centro e sfumato
      const hr = S * 0.026, gr = L.ctx.createRadialGradient(x, o.H * 0.16, 0, x, o.H * 0.16, hr)
      gr.addColorStop(0, color); gr.addColorStop(0.55, color); gr.addColorStop(1, color + '00')
      L.ctx.fillStyle = gr; L.ctx.beginPath(); L.ctx.arc(x, o.H * 0.16, hr, 0, Math.PI * 2); L.ctx.fill()
      inkPlume(L.ctx, seed, x, o.H * 0.16, S, o.H * 0.66, Math.round(5200 * (num(o, 'density') / 100) * k), { turb: 0.4 + num(o, 'turb') / 70, spread: num(o, 'spread') / 55, alpha: 0.05 })
      // velo: copia sfocata sotto i filamenti, come l'inchiostro diluito
      const V = makeCanvas(o.W, o.H)
      V.ctx.filter = `blur(${S * 0.006}px)`; V.ctx.globalAlpha = 0.7; V.ctx.drawImage(L.c, 0, 0)
      V.ctx.filter = 'none'; V.ctx.globalAlpha = 1; V.ctx.drawImage(L.c, 0, 0)
      return V.c
    }
    const blend: GlobalCompositeOperation = o.transparent ? 'source-over' : t.dark ? 'screen' : 'multiply'
    ctx.globalCompositeOperation = blend
    ctx.drawImage(layer(o.seed, t.ink, o.W / 2, 1), 0, 0)
    if (num(o, 'inks') === 1) ctx.drawImage(layer(o.seed + 50, t.acc, o.W / 2 + range(r, -0.06, 0.06) * S, 0.55), 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    return finish(c, o, t, 'goccia', ['INK IN WATER', code(o, 'ink'), ROMAN_YEAR, '0.5 ML'])
  },
}

const macchia: Recipe = {
  id: 'macchia', label: 'Macchia simmetrica', cat: 'Inchiostro', hint: 'macchia di Rorschach con schizzi e sbavature',
  params: [P.tone(1), P.range('spread', 'Espansione', 20, 100, 60), P.range('splat', 'Schizzi', 0, 100, 50), P.range('bleed', 'Sbavatura', 0, 100, 40), P.tog('riso', 'Secondo inchiostro', false), P.caps(), P.grain(30)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed), n = noise2(o.seed), n2 = noise2(o.seed + 1)
    const cx = o.W / 2, cy = o.H / 2, R = S * 0.46 * (0.65 + num(o, 'spread') / 250)
    const blot = (sd: number) => {
      const nn = noise2(sd), m = newMask(o.W, o.H)
      for (let y = 0; y < o.H; y++) for (let x = 0; x <= cx; x++) {
        const s = 2.6 / S
        const wx = x + (fbm(n2, x * s, y * s, 3) - 0.5) * S * 0.25, wy = y + (fbm(nn, x * s + 3, y * s, 3) - 0.5) * S * 0.25
        const d = Math.hypot((wx - cx) * 1.25, (wy - cy) * 0.9) / R
        const v = fbm(nn, wx * s * 1.6, wy * s * 1.6, 5) - d * 0.75
        const a = smoothstep(0.02, 0.05, v) * 255
        m.a[y * o.W + x] = a; m.a[y * o.W + (o.W - 1 - x)] = a
      }
      return m
    }
    let m = blot(o.seed)
    const sp = num(o, 'splat') / 100
    if (sp > 0) {
      const dots = drawMask(o.W, o.H, ctx => {
        for (let i = 0; i < 160 * sp; i++) {
          const a = r() * Math.PI * 2, d = R * range(r, 0.55, 1.3), rad = S * 0.01 * Math.pow(r(), 2.2) * 3 + S * 0.0012
          const x = cx - Math.abs(Math.cos(a) * d), y = cy + Math.sin(a) * d * 0.95
          const ang = Math.atan2(y - cy, x - cx), el = range(r, 1.2, 3.2)
          for (const xx of [x, 2 * cx - x]) {
            const aa = xx === x ? ang : Math.PI - ang
            ctx.beginPath(); ctx.ellipse(xx, y, rad * el, rad, aa, 0, Math.PI * 2); ctx.fill()
          }
        }
      })
      m = combine(m, dots, 'max')
    }
    m = liquid(m, S * 0.007, 0.48, 0.05)
    const { c, ctx } = stage(o, t)
    const blend: GlobalCompositeOperation = o.transparent ? 'source-over' : t.dark ? 'screen' : 'multiply'
    ctx.globalCompositeOperation = blend
    const bl = num(o, 'bleed') / 100
    if (bl > 0) ctx.drawImage(maskToCanvas(blurMask(m, S * 0.012 * bl), t.ink, 0.35), 0, 0)
    // densità non uniforme dell'inchiostro
    const tex = newMask(o.W, o.H)
    for (let i = 0; i < m.a.length; i++) { const x = i % o.W, y = (i / o.W) | 0; tex.a[i] = m.a[i] * (0.9 + 0.1 * n(x / S * 7, y / S * 7)) }
    ctx.drawImage(maskToCanvas(tex, t.ink), 0, 0)
    if (on(o, 'riso')) ctx.drawImage(maskToCanvas(liquid(blot(o.seed + 7), S * 0.004, 0.5, 0.12), t.acc, 0.9), S * 0.008, S * 0.004)
    ctx.globalCompositeOperation = 'source-over'
    return finish(c, o, t, 'macchia', ['PLATE № ' + (1 + (o.seed % 10)), code(o, 'blot'), ROMAN_YEAR, 'COSA VEDI?'])
  },
}

// ─── DISTORSIONI & STAMPA ────────────────────────────────────────────────────

const colata: Recipe = {
  id: 'colata', label: 'Colata', cat: 'Distorsioni', hint: 'slit-scan: le lettere colano in barre verso il basso',
  params: [P.text('MELT'), P.face('condensato'), P.tone(1), P.range('cut', 'Punto di taglio', 10, 90, 62), P.range('len', 'Lunghezza', 10, 100, 80), P.sel('dir', 'Direzione', ['Giù', 'Su', 'Destra']),
    P.tog('riso', 'Fuori registro', true), P.caps(), P.grain(35)],
  render: o => {
    const t = tone(o), S = SS(o), f = face(o), word = str(o, 'text') || ' '
    const dir = num(o, 'dir')
    const size = Math.min(wordSize(word, f, o.W * 0.9), o.H * 0.42)
    const base = dir === 1 ? o.H * 0.86 : dir === 2 ? o.H / 2 + size * 0.35 : o.H * 0.12 + size * 0.85
    const cx = dir === 2 ? o.W * 0.45 : o.W / 2
    const src = drawMask(o.W, o.H, ctx => text(ctx, word, cx, base, f, dir === 2 ? size * 0.75 : size, 'center'))
    const b = inkBox(src)
    const run = (cut: number) => {
      if (!b) return src
      if (dir === 2) return stretch(src, 'right', b.x0 + (b.x1 - b.x0) * cut, (o.W - b.x1) * num(o, 'len') / 100 + (b.x1 - b.x0) * (1 - cut))
      const at = dir === 0 ? b.y0 + (b.y1 - b.y0) * cut : b.y1 - (b.y1 - b.y0) * cut
      const room = dir === 0 ? o.H - at : at
      return stretch(src, dir === 0 ? 'down' : 'up', at, room * num(o, 'len') / 100)
    }
    const cut = num(o, 'cut') / 100
    const { c, ctx } = stage(o, t)
    const blend: GlobalCompositeOperation = o.transparent ? 'source-over' : t.dark ? 'screen' : 'multiply'
    ctx.globalCompositeOperation = blend
    if (on(o, 'riso')) ctx.drawImage(maskToCanvas(run(Math.min(0.95, cut + 0.13)), t.acc, 0.95), S * 0.006, S * 0.003)
    ctx.drawImage(maskToCanvas(run(cut), t.ink), 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    return finish(c, o, t, 'colata', ['SLIT—SCAN', code(o, 'melt'), ROMAN_YEAR, word.toUpperCase()])
  },
}

const fette: Recipe = {
  id: 'fette', label: 'Fette Risograph', cat: 'Distorsioni', hint: 'tipografia affettata dallo scanner, due inchiostri sovrastampati',
  params: [P.text('NO|FUTURE'), P.face('condensato'), P.tone(1), P.range('cuts', 'Tagli', 4, 60, 22), P.range('shift', 'Spostamento', 0, 100, 45), P.tog('vertical', 'Verticali', false), P.caps(), P.grain(40)],
  render: o => {
    const t = tone(o), S = SS(o), f = face(o), ls = lines(str(o, 'text'))
    if (!ls.length) ls.push(' ')
    const src = drawMask(o.W, o.H, ctx => {
      const sizes = ls.map(l => wordSize(l, f, o.W * 0.88))
      const total = sizes.reduce((a, b) => a + b * 0.86, 0)
      const k = Math.min(1, (o.H * 0.7) / total)
      let y = (o.H - total * k) / 2
      ls.forEach((l, i) => { y += sizes[i] * 0.86 * k; text(ctx, l, o.W / 2, y - sizes[i] * 0.12 * k, f, sizes[i] * k, 'center') })
    })
    const sh = S * 0.14 * (num(o, 'shift') / 100), v = on(o, 'vertical')
    const a = slices(src, rng(o.seed), num(o, 'cuts'), sh, v), b = slices(src, rng(o.seed + 5), num(o, 'cuts'), sh, v)
    const { c, ctx } = stage(o, t)
    const blend: GlobalCompositeOperation = o.transparent ? 'source-over' : t.dark ? 'screen' : 'multiply'
    ctx.globalCompositeOperation = blend
    ctx.drawImage(maskToCanvas(b, t.acc, 0.95), S * 0.007, -S * 0.004)
    ctx.drawImage(maskToCanvas(a, t.ink), 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    return finish(c, o, t, 'fette', ['RISO 2—INK', code(o, 'riso'), ROMAN_YEAR, ls.join(' ').toUpperCase()])
  },
}

const fotocopia: Recipe = {
  id: 'fotocopia', label: 'Fotocopia punk', cat: 'Distorsioni', hint: 'fanzine: gotico enorme, sigillo, manifesto in mono, nastro adesivo',
  params: [P.text('Caos'), P.face('grenze'), { key: 'body', label: 'Manifesto', type: 'text', def: 'NESSUN DIO|NESSUN MAESTRO|SOLO INCHIOSTRO' }, P.tone(6), P.range('toner', 'Toner', 0, 100, 60), P.tog('tape', 'Nastro', true), P.caps(), P.grain(35)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed), f = face(o), word = str(o, 'text') || ' '
    const size = wordSize(word, f, o.W * 1.08)
    const rot = range(r, -0.09, 0.05)
    let m = drawMask(o.W, o.H, ctx => {
      ctx.save(); ctx.translate(o.W * 0.48, o.H * 0.56); ctx.rotate(rot); text(ctx, word, 0, size * 0.3, f, size, 'center'); ctx.restore()
      sigil(ctx, rng(o.seed + 2), o.W * 0.8, o.H * 0.2, S * 0.26, { strokes: 5, spikes: 2, hook: 0.7, weight: 1.2, spine: true, arcs: false })
      const fs = Math.max(8, S * 0.022), mf = FACES.mono
      lines(str(o, 'body')).forEach((l, i) => text(ctx, l, o.W * 0.07, o.H * 0.83 + i * fs * 1.35, mf, fs, 'left'))
      ctx.lineWidth = Math.max(1, S * 0.004); ctx.strokeRect(o.W * 0.06, o.H * 0.06, o.W * 0.34, o.H * 0.12)
      text(ctx, '№ ' + String(o.seed % 999).padStart(3, '0'), o.W * 0.08, o.H * 0.06 + o.H * 0.085, FACES.condensato, o.H * 0.07, 'left')
    })
    m = xerox(m, o.seed, 0.4 + num(o, 'toner') / 100)
    const { c, ctx } = stage(o, t)
    ctx.drawImage(maskToCanvas(m, t.ink), 0, 0)
    if (on(o, 'tape') && !o.transparent) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = luma(t.acc) > 0.85 ? '#d8c58a' : t.acc; ctx.globalAlpha = 0.78
      for (let i = 0; i < 2; i++) {
        ctx.save(); ctx.translate(o.W * (i ? 0.86 : 0.12), o.H * (i ? 0.62 : 0.32)); ctx.rotate(range(r, -0.9, 0.9))
        const w = S * 0.22, h = S * 0.055
        ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2)
        for (let k = 0; k <= 8; k++) ctx.lineTo(w / 2 + (k % 2 ? -S * 0.006 : 0), -h / 2 + (h * k) / 8)
        for (let k = 8; k >= 0; k--) ctx.lineTo(-w / 2 + (k % 2 ? S * 0.006 : 0), -h / 2 + (h * k) / 8)
        ctx.fill(); ctx.restore()
      }
      ctx.restore()
    }
    return finish(c, o, t, 'fotocopia', ['ZINE / XEROX', code(o, 'zine'), ROMAN_YEAR, 'FAI DA TE'])
  },
}

const vortice: Recipe = {
  id: 'vortice', label: 'Vortice tipografico', cat: 'Distorsioni', hint: 'righe di testo avvolte in un disco (coordinate polari)',
  params: [P.text('ORBITA — '), P.face('condensato'), P.tone(5), P.range('rows', 'Anelli', 2, 9, 5), P.range('twist', 'Torsione', -100, 100, 25), P.tog('mix', 'Caratteri misti', true), P.caps(), P.grain(25)],
  render: o => {
    const t = tone(o), S = SS(o), word = str(o, 'text') || '— '
    const rows = num(o, 'rows'), SW = Math.round(S * 2.6), SH = Math.round(S * 0.62)
    const faces = [face(o), FACES.gotico, FACES.mono, FACES.bodoni]
    const strip = drawMask(SW, SH, ctx => {
      let y = 0
      for (let i = 0; i < rows; i++) {
        const h = (SH / rows) * (0.6 + 0.8 * ((i + 1) / rows)) / 1.1
        const f = on(o, 'mix') ? faces[i % faces.length] : faces[0]
        const unit = ('upper' in f && f.upper ? word.toUpperCase() : word)
        let s = unit
        ctx.font = `${'italic' in f && f.italic ? 'italic ' : ''}${f.weight} ${h}px "${f.family}"`
        while (ctx.measureText(s).width < SW * 1.05) s += unit
        y += h
        text(ctx, s, 0, Math.min(SH, y - h * 0.12), { ...f, upper: false }, h * 0.95, 'left')
      }
    })
    const disc = polar(strip, Math.round(S * 0.86), 0.16, num(o, 'twist') / 100)
    const m = newMask(o.W, o.H)
    const ox = Math.round((o.W - disc.w) / 2), oy = Math.round((o.H - disc.h) / 2)
    for (let y = 0; y < disc.h; y++) for (let x = 0; x < disc.w; x++) { const X = x + ox, Y = y + oy; if (X >= 0 && Y >= 0 && X < o.W && Y < o.H) m.a[Y * o.W + X] = disc.a[y * disc.w + x] }
    const { c, ctx } = stage(o, t)
    ctx.drawImage(maskToCanvas(m, t.ink), 0, 0)
    ctx.fillStyle = t.acc; lozenge(ctx, o.W / 2, o.H / 2, S * 0.05)
    return finish(c, o, t, 'vortice', ['POLAR TYPE', code(o, 'orbt'), ROMAN_YEAR, '360°'])
  },
}

const bit: Recipe = {
  id: 'bit', label: 'Cromo 1-bit', cat: 'Distorsioni', hint: 'una forma cromata ridotta a pixel bianchi e neri',
  params: [P.sel('shape', 'Forma', ['Membrana', 'Crescita', 'Scritta']), P.text('VOID'), P.face('espanso'), P.tone(0), P.range('px', 'Pixel', 1, 10, 3), P.sel('mode', 'Trama', ['Atkinson', 'Bayer']), P.caps(), P.grain(0)],
  render: o => {
    const t = tone(o), S = SS(o), sh = num(o, 'shape')
    let m: Mask
    if (sh === 0) m = membrane(o.W, o.H, o.W / 2, o.H / 2, S * 0.44, rng(o.seed), { shape: 0, cells: 34, web: 1.2, holes: 0.85, claws: 0.7, clawLen: 1, mirror: true })
    else if (sh === 1) m = drawMask(o.W, o.H, ctx => mirrored(ctx, o.W / 2, () => growth(ctx, rng(o.seed), o.seed, o.W / 2, o.H * 0.84, -Math.PI / 2 - 0.25, S, { depth: 5, spread: 0.45, weight: 1.5, nodes: true })))
    else { const f = face(o), w = str(o, 'text') || ' ', size = Math.min(wordSize(w, f, o.W * 0.84), S * 0.4); m = liquid(drawMask(o.W, o.H, ctx => text(ctx, w, o.W / 2, o.H / 2 + size * 0.35, f, size, 'center')), S * 0.006, 0.5, 0.1) }
    const chrome = shade(m, 'cromo', S * 0.016, 0.9)
    const d = chrome.getContext('2d')!.getImageData(0, 0, o.W, o.H).data
    const gray = newMask(o.W, o.H)
    for (let i = 0; i < gray.a.length; i++) gray.a[i] = (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]) * (d[i * 4 + 3] / 255)
    const px = Math.max(1, Math.round(num(o, 'px') * S / 800))
    const dm = dither(gray, px, num(o, 'mode') === 0 ? 'atkinson' : 'bayer')
    const { c, ctx } = stage(o, t)
    ctx.drawImage(maskToCanvas(combine(dm, m, 'min'), t.ink), 0, 0)
    return finish(c, o, t, 'bit', ['1—BIT', code(o, 'dthr'), ROMAN_YEAR, 'ATKINSON'])
  },
}

// ─── LEGGERI (illustrazioni a tratto fine) ───────────────────────────────────

function fillOrStroke(ctx: Ctx, outline: boolean, lw: number) {
  if (outline) { ctx.lineWidth = lw; ctx.stroke() } else ctx.fill()
}

function leaf(ctx: Ctx, x: number, y: number, a: number, len: number, wid: number, outline: boolean, lw: number) {
  const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca
  const tx = x + ca * len, ty = y + sa * len, mx = x + ca * len * 0.45, my = y + sa * len * 0.45
  ctx.beginPath(); ctx.moveTo(x, y)
  ctx.quadraticCurveTo(mx + nx * wid, my + ny * wid, tx, ty)
  ctx.quadraticCurveTo(mx - nx * wid, my - ny * wid, x, y)
  if (outline) { ctx.lineWidth = lw; ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ca * len * 0.85, y + sa * len * 0.85); ctx.stroke() }
  else ctx.fill()
}

const rametto: Recipe = {
  id: 'rametto', label: 'Rametto', cat: 'Leggeri', hint: 'illustrazione botanica a tratto fine: foglie, bacche, felce',
  piece: true,
  params: [P.sel('kind', 'Tipo', ['Foglie', 'Bacche', 'Felce', 'Ulivo']), P.tog('outline', 'Solo contorno', false), P.range('leaves', 'Foglie', 4, 24, 11), P.range('curve', 'Curva', -100, 100, 35), P.tone(1), P.mat(0), P.caps(false), P.grain(0)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed), kind = num(o, 'kind'), outline = on(o, 'outline'), n = num(o, 'leaves')
    const lw = Math.max(1, S * 0.0035)
    const m = drawMask(o.W, o.H, ctx => {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      const len = S * 0.78, k = (num(o, 'curve') / 100) * 2.2 / len
      const { pts, angles } = walk(o.W / 2 - S * 0.12, o.H / 2 + len * 0.45, -Math.PI / 2 + 0.15, len, t2 => k * (1 - t2 * 0.5), 2)
      taper(ctx, pts, t2 => S * 0.009 * (1 - t2 * 0.85) + lw * 0.4)
      for (let i = 0; i < n; i++) {
        const tt = 0.1 + (i / n) * 0.86, j = Math.floor(tt * (pts.length - 1)), side = i % 2 ? 1 : -1
        const [x, y] = pts[j], a = angles[j] + side * range(r, 0.55, 0.95)
        const sc = kind === 2 ? 1 - tt * 0.75 : 1 - tt * 0.35
        if (kind === 1) {
          const { pts: tw } = walk(x, y, a, S * 0.08 * sc, () => side * 4 / S, 2)
          taper(ctx, tw, () => lw * 0.9)
          const [bx, by] = tw[tw.length - 1], br = S * range(r, 0.016, 0.024) * sc
          ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); fillOrStroke(ctx, outline, lw)
          if (!outline) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(bx - br * 0.35, by - br * 0.35, br * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
        } else if (kind === 2) {
          // felce: fogliolina composta da piccoli lobi
          const L = S * 0.16 * sc
          const { pts: rc } = walk(x, y, a, L, () => -side * 1.5 / S, 2)
          taper(ctx, rc, () => lw * 0.8)
          for (let q = 1; q < 7; q++) { const p2 = rc[Math.floor((q / 7) * (rc.length - 1))]; leaf(ctx, p2[0], p2[1], a + 0.9, L * 0.22 * (1 - q / 9), L * 0.06, outline, lw * 0.8); leaf(ctx, p2[0], p2[1], a - 0.9, L * 0.22 * (1 - q / 9), L * 0.06, outline, lw * 0.8) }
        } else {
          const L = S * (kind === 3 ? 0.13 : 0.11) * sc
          leaf(ctx, x, y, a, L, L * (kind === 3 ? 0.16 : 0.32), outline, lw)
        }
      }
      if (kind === 3) for (let i = 0; i < 3; i++) { const j = Math.floor(range(r, 0.3, 0.8) * (pts.length - 1)); const [x, y] = pts[j]; ctx.beginPath(); ctx.ellipse(x + S * 0.03, y, S * 0.018, S * 0.026, 0.4, 0, Math.PI * 2); fillOrStroke(ctx, outline, lw) }
    })
    const { c, ctx } = stage(o, t)
    paint(ctx, m, o, t, num(o, 'mat'), false, 0.004)
    return finish(c, o, t, 'rametto', ['HERBARIUM', code(o, 'herb'), ROMAN_YEAR, 'FOLIA'])
  },
}

function sparkleRays(ctx: Ctx, x: number, y: number, L: number, w: number, diag: boolean) {
  for (let k = 0; k < (diag ? 8 : 4); k++) {
    const a = k * (Math.PI / (diag ? 4 : 2)), len = diag && k % 2 ? L * 0.45 : k % 2 ? L * 0.7 : L
    const { pts } = walk(x, y, a, len, () => 0, Math.max(1, len / 40))
    taper(ctx, pts, needle(w, 0.02, 1.6))
  }
}

const costellazione: Recipe = {
  id: 'costellazione', label: 'Costellazione', cat: 'Leggeri', hint: 'stelline ad ago, puntini e fili tratteggiati',
  piece: true,
  params: [P.range('stars', 'Stelle', 3, 20, 8), P.tog('lines', 'Linee', true), P.tog('dots', 'Polvere', true), P.tone(1), P.mat(0), P.caps(false), P.grain(0)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed), n = num(o, 'stars')
    // gerarchia: una stella primaria su un punto aureo, due secondarie a 1/φ, il resto in scala
    const gx = r() < 0.5 ? 0.382 : 0.618, gy = r() < 0.5 ? 0.382 : 0.618
    const pts: [number, number, number][] = [[o.W * gx, o.H * gy, S * 0.12]]
    const sec = [[1 - gx, 1 - gy + 0.08], [1 - gx + 0.14, gy - 0.18]]
    for (const [x, y] of sec) pts.push([o.W * Math.min(0.88, Math.max(0.12, x)), o.H * Math.min(0.88, Math.max(0.12, y)), S * 0.12 / PHI])
    for (let i = 0, tries = 0; pts.length < n && tries < 800; tries++) {
      const x = o.W * range(r, 0.1, 0.9), y = o.H * range(r, 0.1, 0.9), L = S * 0.12 / PHI / PHI / (1 + (i % 3) * 0.5)
      if (pts.some(p => Math.hypot(p[0] - x, p[1] - y) < (p[2] + L) * 1.8)) continue
      pts.push([x, y, L]); i++
    }
    const m = drawMask(o.W, o.H, ctx => {
      const lw = Math.max(0.8, S * 0.0016)
      if (on(o, 'lines')) {
        // percorso al vicino più prossimo: la costellazione si legge come una figura
        const left = pts.slice(1), path = [pts[0]]
        while (left.length) { const last = path[path.length - 1]; left.sort((a, b) => Math.hypot(a[0] - last[0], a[1] - last[1]) - Math.hypot(b[0] - last[0], b[1] - last[1])); path.push(left.shift()!) }
        ctx.lineWidth = lw; ctx.setLineDash([lw * 1.5, lw * 4])
        ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke()
        ctx.setLineDash([])
      }
      pts.forEach(([x, y, L], i) => sparkleRays(ctx, x, y, L, L * 0.13, i === 0))
      if (on(o, 'dots')) for (let i = 0; i < n * 5; i++) { ctx.beginPath(); ctx.arc(o.W * range(r, 0.06, 0.94), o.H * range(r, 0.06, 0.94), S * 0.0022 * (0.5 + r()), 0, Math.PI * 2); ctx.fill() }
    })
    const { c, ctx } = stage(o, t)
    paint(ctx, m, o, t, num(o, 'mat'), false, 0.004)
    return finish(c, o, t, 'stelle', ['ASTRA', code(o, 'astr'), ROMAN_YEAR, '✦'])
  },
}

const fregio: Recipe = {
  id: 'fregio', label: 'Fregio calligrafico', cat: 'Leggeri', hint: 'divisore simmetrico a pennino con rombi e riccioli',
  piece: true,
  params: [P.range('len', 'Lunghezza', 40, 100, 80), P.range('curls', 'Riccioli', 1, 4, 2), P.range('nib', 'Pennino', 30, 160, 90), P.tone(1), P.mat(0), P.caps(false), P.grain(0)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed), half = (o.W / 2) * (num(o, 'len') / 100) * 0.92, nib = S * 0.012 * (num(o, 'nib') / 100)
    const cx = o.W / 2, cy = o.H / 2
    const subs: { t: number; up: number; len: number; curl: number }[] = []
    for (let i = 0; i < num(o, 'curls'); i++) subs.push({ t: range(r, 0.25, 0.7), up: i % 2 ? 1 : -1, len: S * range(r, 0.06, 0.12), curl: range(r, 1.2, 2.4) })
    const m = drawMask(o.W, o.H, ctx => {
      mirrored(ctx, cx, () => {
        const { pts } = walk(cx + nib * 2, cy, -0.05, half, t2 => (Math.sin(t2 * Math.PI * 2) * 0.25 - Math.pow(t2, 5) * 16) / half * 1.2, Math.max(1, half / 400))
        taper(ctx, pts, (t2, a) => (nib * Math.abs(Math.sin(a + 0.75)) + nib * 0.08) * Math.min(1, t2 / 0.05) * Math.pow(1 - t2, 0.3))
        for (const s of subs) { const p = pts[Math.floor(s.t * (pts.length - 1))]; swash(ctx, p[0], p[1], s.up * 0.9, s.len, s.curl, nib * 0.7, -0.75, s.up) }
        lozenge(ctx, cx + half * 1.02, cy, nib * 0.9)
      })
      lozenge(ctx, cx, cy, nib * 2.2)
      ctx.beginPath(); ctx.arc(cx, cy - nib * 4, nib * 0.6, 0, Math.PI * 2); ctx.arc(cx, cy + nib * 4, nib * 0.6, 0, Math.PI * 2); ctx.fill()
    })
    const { c, ctx } = stage(o, t)
    paint(ctx, m, o, t, num(o, 'mat'), false, 0.004)
    return finish(c, o, t, 'fregio', ['ORNAMENTUM', code(o, 'orn'), ROMAN_YEAR, '—'])
  },
}

/** simboli da tattoo flash, tutti a pennino con punte ad ago */
function flash(ctx: Ctx, kind: number, cx: number, cy: number, S: number, r: Rnd, wt: number) {
  const lw = S * 0.006 * wt
  const ring = (R: number, w: number) => { const pts: Pt[] = []; for (let i = 0; i <= 360; i++) { const a = (i / 360) * Math.PI * 2; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]) } taper(ctx, pts, () => w) }
  const rays = (R0: number, R1: number, n: number, wavy: boolean) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2, long = i % 2 === 0
      const x = cx + Math.cos(a) * R0, y = cy + Math.sin(a) * R0
      const L = (R1 - R0) * (long ? 1 : 0.6)
      const { pts } = walk(x, y, a, L, tt => (wavy && !long ? Math.sin(tt * 12) * 10 / S : 0), 1.5)
      taper(ctx, pts, needle(lw * (long ? 2.2 : 1.4), 0.05, 1.1))
    }
  }
  if (kind === 0) { // sole
    ring(S * 0.17, lw * 1.6); ring(S * 0.13, lw * 0.6)
    ctx.beginPath(); ctx.arc(cx, cy, S * 0.04, 0, Math.PI * 2); ctx.fill()
    rays(S * 0.2, S * 0.44, 24, true)
  } else if (kind === 1) { // luna
    ctx.beginPath(); ctx.arc(cx, cy, S * 0.28, 0, Math.PI * 2); ctx.fill()
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(cx + S * 0.11, cy - S * 0.05, S * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    for (let i = 0; i < 3; i++) sparkleRays(ctx, cx + S * range(r, 0.1, 0.32), cy + S * range(r, -0.3, 0.3), S * range(r, 0.03, 0.07), S * 0.008, false)
  } else if (kind === 2) { // occhio
    const w = S * 0.36, h = S * 0.17
    for (const s of [-1, 1]) { const pts: Pt[] = []; for (let i = 0; i <= 200; i++) { const tt = i / 200; pts.push([cx - w + 2 * w * tt, cy + s * Math.sin(Math.PI * tt) * h]) } taper(ctx, pts, spindle(lw * (s < 0 ? 3 : 1.8), 0.6)) }
    ring(S * 0.1, lw * 1.2)
    ctx.beginPath(); ctx.arc(cx, cy, S * 0.05, 0, Math.PI * 2); ctx.fill()
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(cx - S * 0.018, cy - S * 0.018, S * 0.012, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    for (let i = 0; i < 9; i++) { const tt = 0.15 + (i / 8) * 0.7, x = cx - w + 2 * w * tt, y = cy - Math.sin(Math.PI * tt) * h, a = -Math.PI / 2 + (tt - 0.5) * 1.6; const { pts } = walk(x, y, a, S * 0.06, () => 0, 1); taper(ctx, pts, needle(lw * 1.4, 0.05, 1.2)) }
    const { pts } = walk(cx + S * 0.05, cy + h * 1.2, Math.PI / 2, S * 0.07, () => 0, 1); taper(ctx, pts, tt => S * 0.022 * Math.pow(Math.sin(Math.PI * Math.min(1, tt * 1.1)), 0.7) * tt)
  } else if (kind === 3) { // stella
    sparkleRays(ctx, cx, cy, S * 0.42, S * 0.05 * wt, true)
    ring(S * 0.16, lw * 0.5)
  } else if (kind === 4) { // cuore sacro
    const pts: Pt[] = []
    for (let i = 0; i <= 300; i++) { const a = (i / 300) * Math.PI * 2; pts.push([cx + 16 * Math.pow(Math.sin(a), 3) * S * 0.0145, cy + S * 0.04 - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * S * 0.0145]) }
    taper(ctx, pts, tt => lw * (1.4 + 1.6 * Math.abs(Math.sin(tt * Math.PI))))
    thornRing(ctx, r, cx, cy + S * 0.02, S * 0.17, S * 0.55, 14, wt * 0.7)
    for (let k = -1; k <= 1; k++) { const { pts: fl } = walk(cx + k * S * 0.04, cy - S * 0.15, -Math.PI / 2 + k * 0.4, S * (k ? 0.12 : 0.17), tt => Math.sin(tt * 7 + k) * 9 / S, 1.5); taper(ctx, fl, needle(S * 0.03, 0.15, 1.2)) }
    rays(S * 0.3, S * 0.45, 20, false)
  } else { // pugnale
    const top = cy - S * 0.42, guard = cy - S * 0.12, tip = cy + S * 0.44
    ctx.beginPath(); ctx.moveTo(cx - S * 0.045, guard + S * 0.03); ctx.lineTo(cx + S * 0.045, guard + S * 0.03); ctx.lineTo(cx, tip); ctx.closePath(); ctx.lineWidth = lw * 1.4; ctx.stroke()
    const blade: Pt[] = []; for (let i = 0; i <= 100; i++) blade.push([cx, guard + S * 0.04 + (tip - guard - S * 0.06) * (i / 100)]); taper(ctx, blade, needle(lw * 1.6, 0.02, 1))
    const g: Pt[] = []; for (let i = 0; i <= 100; i++) { const tt = i / 100; g.push([cx - S * 0.17 + S * 0.34 * tt, guard + Math.sin(tt * Math.PI) * -S * 0.02]) } taper(ctx, g, spindle(S * 0.03, 0.4))
    lozenge(ctx, cx - S * 0.19, guard - S * 0.02, S * 0.025); lozenge(ctx, cx + S * 0.19, guard - S * 0.02, S * 0.025)
    for (let i = 0; i < 6; i++) { const y = guard - S * 0.03 - i * S * 0.035; ctx.beginPath(); ctx.ellipse(cx, y, S * 0.026, S * 0.012, 0.25, 0, Math.PI * 2); ctx.lineWidth = lw; ctx.stroke() }
    lozenge(ctx, cx, top + S * 0.03, S * 0.045)
  }
}

const simbolo: Recipe = {
  id: 'simbolo', label: 'Tattoo flash', cat: 'Leggeri', hint: 'sole, luna, occhio, stella, cuore sacro, pugnale a tratto fine',
  piece: true,
  params: [P.sel('kind', 'Simbolo', ['Sole', 'Luna', 'Occhio', 'Stella', 'Cuore sacro', 'Pugnale']), P.range('weight', 'Peso', 50, 200, 100), P.tone(1), P.mat(0), P.glow(false), P.caps(false), P.grain(0)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed)
    const m = drawMask(o.W, o.H, ctx => { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; flash(ctx, num(o, 'kind'), o.W / 2, o.H / 2, S, r, num(o, 'weight') / 100) })
    const { c, ctx } = stage(o, t)
    paint(ctx, m, o, t, num(o, 'mat'), on(o, 'glow'), 0.006)
    return finish(c, o, t, 'flash', ['FLASH SHEET', code(o, 'flsh'), ROMAN_YEAR, '✝'])
  },
}

// ─── catalogo ────────────────────────────────────────────────────────────────

export const RECIPES: Recipe[] = [
  membrana, rete, falce, quaderno, corona, fascia, ghirigoro, alieno, cromo, goccia, macchia,
  colata, fette, fotocopia, vortice, bit,
  simbolo, rametto, costellazione, fregio,
]
export const RECIPE_CATS = [...new Set(RECIPES.map(r => r.cat))]

export const defaults = (rc: Recipe): RValues => Object.fromEntries(rc.params.map(p => [p.key, p.def]))

/** dado: parametri a caso ma dentro lo stile (testo e carattere restano) */
export function shuffle(rc: Recipe, v: RValues, seed: number): RValues {
  const r = rng(seed ^ 0x51ed)
  const out = { ...v }
  for (const p of rc.params) {
    if (p.type === 'range') out[p.key] = Math.round(p.min + (p.max - p.min) * (0.15 + 0.7 * r()))
    else if (p.type === 'select' && p.key !== 'face') out[p.key] = Math.floor(r() * p.options.length)
  }
  return out
}

export const FORMATS = [
  { id: '4:5', label: '4:5', w: 1600, h: 2000 },
  { id: '1:1', label: '1:1', w: 1800, h: 1800 },
  { id: '9:16', label: '9:16', w: 1440, h: 2560 },
  { id: '16:9', label: '16:9', w: 2400, h: 1350 },
  { id: 'pezzo', label: 'Pezzo', w: 1800, h: 1800 },
]

/** esegue una ricetta alla scala voluta (1 = definitiva, <1 = anteprima) */
export function runRecipe(rc: Recipe, values: RValues, seed: number, formatId: string, scale = 1) {
  const f = FORMATS.find(x => x.id === formatId) ?? FORMATS[0]
  const job: Job = { W: Math.round(f.w * scale), H: Math.round(f.h * scale), p: { ...defaults(rc), ...values }, seed, transparent: f.id === 'pezzo' }
  return rc.render(job)
}
