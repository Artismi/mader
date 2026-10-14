/**
 * Ricette del laboratorio grafico. Ogni ricetta è un'idea completa (segno,
 * materia, tipografia, stampa) che il seme varia senza mai uscire dal suo stile.
 * Restituiscono un canvas ad alta risoluzione: tavola intera o pezzo scontornato.
 */
import {
  blurMask, combine, distance, dither, hexRgb, fontCss, drawMask, fbm, fitSize, grain, inkBox, liquid, makeCanvas, maskToCanvas,
  newMask, noise2, polar, range, remap, rng, slices, smoothstep, stretch, text, xerox,
  type Ctx, type Face, type Mask, type Rnd,
} from './raster'
import { SILHOUETTES, band, flick, growth, vessel, inkPlume, lozenge, mirrored, needle, sigil, spindle, swash, taper, thornRing, walk, whip, type Pt } from './strokes'
import { shade, type Material } from './material'
import { coffeeRings, crescent, foam, membrane, neuralNet } from './organic'
import { DISPLAY_FACES, FACES, type FaceId } from './fonts'
import { capOf, eyelet, fitText, laurel, perforated, rope, sunburst, thornBraid, twine } from './wreaths'
import { INK, SUBJECTS, banner, bannerCurve, inkFlash, tattooItems } from './tattoo'
import { arrowNE, asterisk, baseText, capH, inkCanvas, inkOf, inkText, rule, sizeForWidth, up, wrap } from './design'
import { GRADES, POST_FX, postFx, backGlow, backdrop, beams, cinemaFinish, dust, fadeFoot, reflection, rgba } from './cinema'
import { WARPS, band as distBand, extrude, extrudeStriped, glints, shine, fittedWord, grow, invert, puffy, softShadow } from './typo'
import { arcText, barcode, burst, castShadow, star, dieCut, embroidery, inkPress, patchShape, stampPlate, stickerCanvas, tapeStrip, ticketMasks, waxSeal, type Finish } from './stamps'
import { drawWing, gridPaper, mapWing, organism, penLine, growWing, wingBox, wingGeom, wingOverlap, wingTree, type Hand, type Space, type WingGeom } from './notebook'

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

/** firma dello studio nelle didascalie delle tavole */
const BRAND = 'ARTISMI DESIGN STUDIO — TORINO'

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
    return finish(c, o, t, 'membrana', ['CELLULA', code(o, 'cell'), BRAND, 'BIO—GOTHIC'])
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
    return finish(c, o, t, 'rete', ['SYNAPSE', code(o, 'nrn'), BRAND, 'INK NETWORK'])
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
    return finish(c, o, t, 'falce', ['FALX', code(o, 'falx'), BRAND, 'NOX'])
  },
}

const quaderno: Recipe = {
  id: 'quaderno', label: 'Quaderno gotico', cat: 'Gotico', hint: 'organismo di ali a falce che germogliano l\'una dall\'altra, a penna viva',
  params: [P.sel('layout', 'Composizione', ['Organismo', 'Ala', 'Corona di ali']), P.tone(0), P.sel('style', 'Segno', ['Penna', 'Pieno']),
    P.range('pen', 'Penna', 40, 250, 100), P.range('bites', 'Smerli', 2, 8, 4), P.range('depth', 'Morso', 20, 90, 42),
    P.range('spikes', 'Aghi', 0, 100, 80), P.range('veins', 'Nervature', 0, 100, 20), P.range('echo', 'Riprese', 0, 100, 0),
    P.range('branch', 'Ramificazioni', 0, 100, 70), P.range('pairs', 'Coppie', 1, 5, 3),
    P.range('shake', 'Mano', 0, 100, 40), P.range('sketch', 'Ripassi', 0, 100, 0), P.range('breaks', 'Stacchi', 0, 100, 0),
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
      wings.push(...wingTree(r, 0, 0, 0.95 + range(r, -0.15, 0.15), S, opts(0.2), branch * 0.8, 2))
      fit(0.86)
    } else if (lay === 2) {
      // corona: un anello da cui le ali partono tangenti e si avvitano tutte nello stesso verso
      const space: Space = { polys: [] }, mains: { g: WingGeom; L: number }[] = []
      // corona: un anello da cui le ali partono tangenti e si avvitano nello stesso verso.
      // Ogni ala deve trovare il suo spicchio: se cadrebbe sulle precedenti si accorcia.
      const R0 = S * range(r, 0.08, 0.11)
      space.polys.push(Array.from({ length: 48 }, (_, j): Pt => [Math.cos(j / 48 * Math.PI * 2) * R0 * 1.15, Math.sin(j / 48 * Math.PI * 2) * R0 * 1.15]))
      const cnt = 3 + Math.floor(r() * 2), rot = r() * Math.PI * 2
      for (let i = 0; i < cnt; i++) {
        const a = rot + i * Math.PI * 2 / cnt, sd = Math.floor(r() * 1e6)
        for (const k of [1, 0.8, 0.62]) {
          // parte tangente all'anello e si avvita verso l'esterno: il ventre guarda fuori, il cerchio resta libero
          const g = wingGeom(rng(sd), Math.cos(a) * R0, Math.sin(a) * R0, a + Math.PI / 2 - 0.12, S * 0.46 * k, opts(0.19, num(o, 'bites'), -1))
          if (k > 0.62 && wingOverlap(g.hull, space) > 0.12) continue
          space.polys.push(g.hull); mains.push({ g, L: S * 0.46 * k }); break
        }
      }
      // prima tutte le ali principali, poi le figlie nello spazio rimasto
      wings.push(...mains.map(m => m.g))
      for (const m of mains) wings.push(...growWing(r, m.g, m.L, opts(0.19, num(o, 'bites'), -1), branch, 2, space))
      const ring = (rr: number) => { const q: Pt[] = []; for (let j = 0; j <= 120; j++) { const a = j / 120 * Math.PI * 2; q.push([Math.cos(a) * rr, Math.sin(a) * rr]) } return q }
      lines.push(ring(R0))
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
    return finish(c, o, t, 'quaderno', ['LIBER NOCTIS', code(o, 'lbr'), BRAND, 'MANU'])
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
    return finish(c, o, t, 'sigillo', ['ARTISMI ⁄ LAB', code(o, 'sigil'), BRAND, 'NEO—TRIBAL'])
  },
}

const corona: Recipe = {
  id: 'corona', label: 'Corona', cat: 'Sigilli', hint: 'una parola dentro una corona: alloro, spine intrecciate o cordone',
  params: [P.sel('ring', 'Corona', ['Alloro', 'Spine intrecciate', 'Cordone']), P.text('Artismi'), { key: 'sub', label: 'Sotto', type: 'text', def: 'Torino · MMXXVI' },
    P.face('gotico'), P.tone(3), P.mat(0), P.range('thorns', 'Spine', 8, 30, 16), P.range('weight', 'Peso', 50, 170, 100), P.glow(false), P.caps(), P.grain(30)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed), R = S * 0.3, cx = o.W / 2, cy = o.H / 2, kind = num(o, 'ring'), wt = num(o, 'weight') / 100
    const ring = drawMask(o.W, o.H, ctx => {
      if (kind === 0) laurel(ctx, r, cx, cy, R, S, wt)
      else if (kind === 1) thornBraid(ctx, r, cx, cy, R, S, num(o, 'thorns'), wt)
      else { rope(ctx, cx, cy, R, S, wt); ctx.lineWidth = S * 0.003; ctx.beginPath(); ctx.arc(cx, cy, R * 0.86, 0, Math.PI * 2); ctx.stroke() }
    })
    const f = face(o), word = str(o, 'text') || ' ', sub = str(o, 'sub')
    const w = drawMask(o.W, o.H, ctx => {
      const size = Math.min(wordSize(word, f, R * 1.3), S * 0.15)
      const ch = capOf(f, size)
      const subS = sub ? Math.min(wordSize(sub, FACES.mono, R * 0.9), S * 0.022) : 0
      const tot = ch + (sub ? subS * 2.4 : 0)
      text(ctx, word, cx, cy - tot / 2 + ch, f, size, 'center')
      if (sub) text(ctx, sub, cx, cy + tot / 2, FACES.mono, subS, 'center')
    })
    const { c, ctx } = stage(o, t)
    paint(ctx, ring, o, t, num(o, 'mat'), on(o, 'glow'), 0.006)
    paint(ctx, w, o, t, num(o, 'mat'), false, 0.006)
    return finish(c, o, t, 'corona', ['CORONA', code(o, 'crwn'), BRAND, word.toUpperCase()])
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
    return finish(c, o, t, 'fascia', ['ARMBAND', code(o, 'band'), BRAND, '—'])
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
    return finish(c, o, t, 'gotico', ['LITTERA GOTHICA', code(o, 'goth'), BRAND, word.toUpperCase()])
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
    const raw = drawMask(o.W, o.H, ctx => {
      const cx = o.W / 2
      // metà destra cresciuta e specchiata: la potatura non lascia passare la linea di mezzo
      if (lay === 0) mirrored(ctx, cx, () => vessel(ctx, rng(o.seed), cx, o.H * 0.86, -Math.PI / 2, S, { ...opts, half: cx }))
      else if (lay === 1) {
        const n = 5 + (o.seed % 3)
        for (let i = 0; i < n; i++) vessel(ctx, rng(o.seed + 31 + i), cx, o.H / 2, (i / n) * Math.PI * 2 - Math.PI / 2, S * 0.78, { ...opts, depth: Math.max(2, opts.depth - 1) })
        ctx.beginPath(); ctx.arc(cx, o.H / 2, S * 0.03 * opts.weight, 0, Math.PI * 2); ctx.fill()
      } else mirrored(ctx, cx, () => vessel(ctx, rng(o.seed), cx, o.H * 0.12, Math.PI / 2, S, { ...opts, half: cx }))
    })
    // raccordo: le forcelle diventano morbide come un getto unico, le punte restano aghi
    const m = combine(raw, liquid(raw, S * 0.004, 0.5, 0.1), 'max')
    const { c, ctx } = stage(o, t)
    paint(ctx, m, o, t, num(o, 'mat'), on(o, 'glow'), 0.01)
    return finish(c, o, t, 'alieno', ['XENO—FORM', code(o, 'xeno'), BRAND, 'BIOMECH'])
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
    return finish(c, o, t, 'cromo', ['LIQUID METAL', code(o, 'chrm'), BRAND, '©'])
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
    return finish(c, o, t, 'goccia', ['INK IN WATER', code(o, 'ink'), BRAND, '0.5 ML'])
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
    return finish(c, o, t, 'macchia', ['PLATE № ' + (1 + (o.seed % 10)), code(o, 'blot'), BRAND, 'COSA VEDI?'])
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
    return finish(c, o, t, 'colata', ['SLIT—SCAN', code(o, 'melt'), BRAND, word.toUpperCase()])
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
    return finish(c, o, t, 'fette', ['RISO 2—INK', code(o, 'riso'), BRAND, ls.join(' ').toUpperCase()])
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
    return finish(c, o, t, 'fotocopia', ['ZINE / XEROX', code(o, 'zine'), BRAND, 'FAI DA TE'])
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
    return finish(c, o, t, 'vortice', ['POLAR TYPE', code(o, 'orbt'), BRAND, '360°'])
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
    return finish(c, o, t, 'bit', ['1—BIT', code(o, 'dthr'), BRAND, 'ATKINSON'])
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
    return finish(c, o, t, 'rametto', ['HERBARIUM', code(o, 'herb'), BRAND, 'FOLIA'])
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
    return finish(c, o, t, 'stelle', ['ASTRA', code(o, 'astr'), BRAND, '✦'])
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
    return finish(c, o, t, 'fregio', ['ORNAMENTUM', code(o, 'orn'), BRAND, '—'])
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
    return finish(c, o, t, 'flash', ['FLASH SHEET', code(o, 'flsh'), BRAND, '✝'])
  },
}

// ─── TIMBRI & ADESIVI ────────────────────────────────────────────────────────

const STAMP_INKS = [
  { label: 'Rosso ufficio', c: '#c4242b' }, { label: 'Blu notaio', c: '#1d3b8f' }, { label: 'Viola', c: '#5a2d82' },
  { label: 'Nero', c: '#1a1a1a' }, { label: 'Verde', c: '#1f6b3a' }, { label: 'Colore del tono', c: '' },
]

const timbro: Recipe = {
  id: 'timbro', label: 'Timbro', cat: 'Timbri & adesivi', hint: 'timbro di gomma: testo sul cerchio, stelline, inchiostro vero con pressione e grana',
  piece: true,
  params: [P.sel('kind', 'Forma', ['Cerchio', 'Sigillo dentellato', 'Rettangolo', 'Ovale']), P.text('Approvato', 'Parola'),
    { key: 'top', label: 'Testo in alto', type: 'text', def: 'Artismi Design Studio' }, { key: 'bottom', label: 'Testo in basso', type: 'text', def: 'Torino' },
    { key: 'small', label: 'Riga piccola', type: 'text', def: 'MMXXVI' },
    P.sel('ink', 'Inchiostro', STAMP_INKS.map(i => i.label)), P.face('condensato'), P.range('weight', 'Spessore', 50, 180, 100),
    P.range('wear', 'Consumo', 0, 100, 38), P.range('tilt', 'Pressione storta', 0, 100, 45), P.range('angle', 'Rotazione', -30, 30, -8),
    P.tog('ghost', 'Doppia battuta', false), P.tone(1), P.grain(15)],
  render: o => {
    const t = tone(o), S = SS(o), kind = num(o, 'kind')
    const ink = STAMP_INKS[num(o, 'ink')]?.c || t.acc
    const f = face(o)
    const txt = { top: str(o, 'top'), bottom: str(o, 'bottom'), center: str(o, 'text') || ' ', small: str(o, 'small') }
    const faces = { ring: FACES.grotesk, center: f, small: FACES.mono }
    const plate = drawMask(o.W, o.H, ctx => {
      ctx.translate(o.W / 2, o.H / 2); ctx.rotate(num(o, 'angle') * Math.PI / 180); ctx.translate(-o.W / 2, -o.H / 2)
      stampPlate(ctx, kind, o.W / 2, o.H / 2, S * 0.92, txt, faces, num(o, 'weight') / 100)
    })
    const pressed = inkPress(plate, o.seed, S, num(o, 'wear') / 100, { tilt: num(o, 'tilt') / 100 })
    const { c, ctx } = stage(o, t)
    if (on(o, 'ghost')) {
      // seconda battuta leggera e spostata: il timbro rimbalza
      const g = inkPress(plate, o.seed + 31, S, 0.75, { tilt: 1 })
      ctx.save(); ctx.globalAlpha = 0.28; ctx.globalCompositeOperation = o.transparent ? 'source-over' : 'multiply'
      ctx.drawImage(maskToCanvas(g, ink), S * 0.012, -S * 0.008); ctx.restore()
    }
    ctx.save(); if (!o.transparent) ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(maskToCanvas(pressed, ink, 0.94), 0, 0); ctx.restore()
    return finish(c, o, t, 'timbro', null)
  },
}

const adesivo: Recipe = {
  id: 'adesivo', label: 'Adesivo', cat: 'Timbri & adesivi', hint: 'adesivo fustellato: bordo bianco morbido, ombra, finitura lucida o olografica',
  piece: true,
  params: [P.sel('kind', 'Contenuto', ['Parola', 'Simbolo', 'Bollino', 'Tondo con scritta', 'Sigillo packaging']), P.text('Artismi|Torino', 'Testo'), P.face('espanso'),
    P.sel('sym', 'Simbolo', ['Sole', 'Luna', 'Occhio', 'Stella', 'Cuore sacro', 'Pugnale']),
    P.sel('color', 'Colore', ['Due toni', 'Accento', 'Inchiostro']), P.sel('finish', 'Finitura', ['Lucida', 'Opaca', 'Olografica']),
    P.range('border', 'Bordo', 20, 200, 100), P.tog('shadow', 'Ombra', true), P.range('angle', 'Rotazione', -20, 20, -5), P.tone(4), P.grain(0)],
  render: o => {
    const t = tone(o), S = SS(o), kind = num(o, 'kind'), r = rng(o.seed)
    const ang = num(o, 'angle') * Math.PI / 180
    const rot = (ctx: Ctx) => { ctx.translate(o.W / 2, o.H / 2); ctx.rotate(ang); ctx.translate(-o.W / 2, -o.H / 2) }
    const ls = lines(str(o, 'text')).slice(0, 3)
    const f: Face = face(o)
    const cx = o.W / 2, cy = o.H / 2
    let content: Mask, knock: Mask | null = null
    if (kind === 1) {
      content = drawMask(o.W, o.H, ctx => { rot(ctx); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; flash(ctx, num(o, 'sym'), cx, cy, S * 0.8, r, 2.2) })
    } else if (kind === 2) {
      const R = S * 0.32
      content = drawMask(o.W, o.H, ctx => { rot(ctx); burst(ctx, cx, cy, R, 18, 0.86) })
      knock = drawMask(o.W, o.H, ctx => {
        rot(ctx)
        const words = ls.length ? ls : ['NEW']
        const lh = R * 1.05 / words.length
        words.forEach((w, i) => { const { ctx: m } = makeCanvas(4, 4); const sz = Math.min(fitSize(m, f.upper ? w.toUpperCase() : w, f, R * 1.3), lh * 0.95); text(ctx, w, cx, cy - (words.length - 1) * lh / 2 + i * lh + sz * 0.36, f, sz, 'center') })
      })
    } else if (kind === 3 || kind === 4) {
      // tondo da marchio: disco pieno, scritta che gira sopra e sotto, stella al centro;
      // sigillo: bordo smerlato fitto, anello sottile, parola al centro (da chiudere le confezioni)
      const R = S * 0.33
      content = drawMask(o.W, o.H, ctx => {
        rot(ctx)
        if (kind === 3) { ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill() }
        else burst(ctx, cx, cy, R, 42, 0.95)
      })
      knock = drawMask(o.W, o.H, ctx => {
        rot(ctx)
        const top = ls[0] ?? 'Artismi', bottom = ls[1] ?? 'Torino'
        const ringF: Face = FACES.grotesk
        const band = R * 0.2
        ctx.lineWidth = Math.max(1, S * 0.003)
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.68, 0, Math.PI * 2); ctx.stroke()
        if (kind === 4) { ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, Math.PI * 2); ctx.stroke() }
        arcText(ctx, top, cx, cy, R * 0.68 + band * 0.22, ringF, band * 0.62, true, 0.14)
        arcText(ctx, bottom, cx, cy, R * (kind === 4 ? 0.86 : 0.9) - band * 0.12, ringF, band * 0.62, false, 0.3)
        for (const sgn of [-1, 1]) star(ctx, cx + sgn * R * 0.79, cy, band * 0.2)
        if (kind === 3) star(ctx, cx, cy, R * 0.3, -Math.PI / 2, 0.45)
        else {
          const centre = ls[2] ?? 'Fatto a mano'
          const { ctx: m } = makeCanvas(4, 4)
          const sz = Math.min(fitSize(m, centre, FACES.corsivo, R * 1.1), R * 0.3)
          text(ctx, centre, cx, cy + sz * 0.3, FACES.corsivo, sz, 'center')
        }
      })
    } else {
      const words = ls.length ? ls : [' ']
      const { ctx: m } = makeCanvas(4, 4)
      const sizes = words.map(w => Math.min(fitSize(m, f.upper ? w.toUpperCase() : w, f, S * 0.72), S * 0.3))
      const gap = 0.92
      const tot = sizes.reduce((a, b) => a + b * gap, 0)
      content = drawMask(o.W, o.H, ctx => {
        rot(ctx)
        let y = cy - tot / 2
        words.forEach((w, i) => { y += sizes[i] * gap; text(ctx, w, cx, y - sizes[i] * 0.16, f, sizes[i], 'center') })
      })
    }
    const B = S * 0.028 * num(o, 'border') / 100
    const cut = dieCut(content, B, S * 0.03)
    const col = num(o, 'color')
    const main = col === 2 ? t.ink : t.acc
    const layers: { mask: Mask; color: string; dx?: number; dy?: number }[] = []
    // due toni: copia in inchiostro sfalsata dietro, effetto stampa a rilievo
    if (col === 0 && kind < 3) layers.push({ mask: content, color: t.ink, dx: S * 0.006, dy: S * 0.008 })
    layers.push({ mask: content, color: main })
    if (knock) layers.push({ mask: knock, color: kind >= 3 ? '#fbfaf6' : col === 0 ? t.ink : '#ffffff' })
    const finishMode = (['lucida', 'opaca', 'olografica'] as Finish[])[num(o, 'finish')] ?? 'lucida'
    const st = stickerCanvas(cut, layers, S, { paper: '#fbfaf6', finish: finishMode, shadow: on(o, 'shadow'), seed: o.seed })
    const { c, ctx } = stage(o, t)
    ctx.drawImage(st, 0, 0)
    return finish(c, o, t, 'adesivo', null)
  },
}

const WAX = [{ label: 'Rosso', c: '#8e1420' }, { label: 'Bordeaux', c: '#5c0f1c' }, { label: 'Oro', c: '#b0862d' }, { label: 'Nero', c: '#1b1a1d' }, { label: 'Blu notte', c: '#1d2a55' }, { label: 'Verde', c: '#1f4a35' }]

const ceralacca: Recipe = {
  id: 'ceralacca', label: 'Ceralacca', cat: 'Timbri & adesivi', hint: 'sigillo di cera in rilievo: colata irregolare, impronta con monogramma',
  piece: true,
  params: [P.text('A', 'Monogramma'), { key: 'ring', label: 'Scritta in giro', type: 'text', def: 'Artismi · Torino' }, P.face('gotico'),
    P.sel('wax', 'Cera', WAX.map(w => w.label)), P.range('gloss', 'Lucido', 0, 100, 70), P.tog('shadow', 'Ombra', true), P.tone(1), P.grain(0)],
  render: o => {
    const t = tone(o), S = SS(o)
    const seal = waxSeal(o.W, o.H, o.W / 2, o.H / 2, S * 0.36, o.seed, str(o, 'text') || 'A', face(o), WAX[num(o, 'wax')]?.c ?? WAX[0].c, { ring: str(o, 'ring'), gloss: num(o, 'gloss') / 100 })
    const { c, ctx } = stage(o, t)
    if (on(o, 'shadow')) castShadow(ctx, seal.blob, S, 0.4)
    ctx.drawImage(seal.canvas, 0, 0)
    return finish(c, o, t, 'ceralacca', null)
  },
}

const THREADS = [
  { label: 'Nero e oro', base: '#16161a', border: '#c9a24a', thread: '#e7c66b' },
  { label: 'Blu e bianco', base: '#1f3270', border: '#f2efe6', thread: '#f2efe6' },
  { label: 'Rosso e crema', base: '#b3212b', border: '#f0e6cf', thread: '#f0e6cf' },
  { label: 'Verde militare', base: '#4a5233', border: '#d8cfa8', thread: '#e8dfb6' },
  { label: 'Rosa e nero', base: '#ff6fae', border: '#141414', thread: '#141414' },
]

const toppa: Recipe = {
  id: 'toppa', label: 'Toppa ricamata', cat: 'Timbri & adesivi', hint: 'patch ricamata: punto pieno, cordoncino in rilievo, scritta a filo',
  piece: true,
  params: [P.sel('kind', 'Forma', ['Tonda', 'Scudo', 'Nastro']), P.text('Artismi', 'Scritta'), { key: 'sub', label: 'Seconda riga', type: 'text', def: 'Torino' }, P.face('pirata'),
    P.sel('col', 'Fili', THREADS.map(x => x.label)), P.tog('shadow', 'Ombra', true), P.tone(1), P.grain(0)],
  render: o => {
    const t = tone(o), S = SS(o), kind = num(o, 'kind')
    const th = THREADS[num(o, 'col')] ?? THREADS[0]
    const poly = patchShape(kind, o.W / 2, o.H / 2, S)
    const f: Face = face(o), word = str(o, 'text') || ' ', sub = str(o, 'sub')
    const label = drawMask(o.W, o.H, ctx => {
      const { ctx: m } = makeCanvas(4, 4)
      const maxW = kind === 2 ? S * 0.66 : S * 0.56
      const big = Math.min(fitSize(m, f.upper ? word.toUpperCase() : word, f, maxW), kind === 2 ? S * 0.2 : S * 0.24)
      const small = sub ? Math.min(fitSize(m, sub.toUpperCase(), FACES.grotesk, maxW * 0.6), big * 0.36) : 0
      const cy = o.H / 2 + (kind === 1 ? -S * 0.04 : 0)
      if (kind === 2 || !sub) text(ctx, word + (kind === 2 && sub ? '' : ''), o.W / 2, cy + big * 0.34, f, big, 'center')
      else {
        text(ctx, word, o.W / 2, cy + big * 0.12, f, big, 'center')
        text(ctx, sub, o.W / 2, cy + big * 0.12 + small * 1.7, FACES.grotesk, small, 'center')
      }
    })
    const em = embroidery(o.W, o.H, S, poly, label, o.seed, th)
    const { c, ctx } = stage(o, t)
    if (on(o, 'shadow')) castShadow(ctx, em.shape, S, 0.32, 0.6)
    ctx.drawImage(em.canvas, 0, 0)
    return finish(c, o, t, 'toppa', null)
  },
}

const biglietto: Recipe = {
  id: 'biglietto', label: 'Biglietto', cat: 'Timbri & adesivi', hint: 'biglietto d\'ingresso: perforazione, matrice numerata, codice a barre',
  piece: true,
  params: [P.text('Artismi', 'Titolo'), { key: 'sub', label: 'Sopratitolo', type: 'text', def: 'Design Studio — Ingresso' },
    { key: 'date', label: 'Data', type: 'text', def: '12.10.2026 · 21:00' }, { key: 'place', label: 'Luogo', type: 'text', def: 'Torino' },
    P.face('condensato'), P.sel('paper', 'Carta', ['Crema', 'Bianca', 'Kraft', 'Colore del tono']), P.range('angle', 'Rotazione', -20, 20, -6),
    P.tog('shadow', 'Ombra', true), P.tone(5), P.grain(20)],
  render: o => {
    const t = tone(o), S = SS(o)
    const paper = ['#f1e9d6', '#fbfaf6', '#c49a63', t.acc][num(o, 'paper')] ?? '#f1e9d6'
    const inkC = num(o, 'paper') === 3 ? (luma(t.acc) > 0.5 ? '#111111' : '#f5f2ea') : '#1b1b1b'
    const numStr = String(100000 + (o.seed * 7919) % 900000)
    const tk = ticketMasks(o.W, o.H, o.W / 2, o.H / 2, S, o.seed, { title: str(o, 'text') || ' ', sub: str(o, 'sub'), date: str(o, 'date'), place: str(o, 'place'), num: numStr }, { title: face(o), mono: FACES.mono })
    // tutto ruotato insieme
    const ang = num(o, 'angle') * Math.PI / 180
    const rot = (m: Mask) => remap(m, (x, y) => { const dx = x - o.W / 2, dy = y - o.H / 2, cs = Math.cos(-ang), sn = Math.sin(-ang); return [o.W / 2 + dx * cs - dy * sn, o.H / 2 + dx * sn + dy * cs] })
    const body = rot(tk.body), ink = combine(rot(tk.ink), body, 'min')
    const { c, ctx } = stage(o, t)
    if (on(o, 'shadow')) castShadow(ctx, body, S, 0.3, 0.7)
    ctx.drawImage(maskToCanvas(body, paper), 0, 0)
    // inchiostro tipografico: leggermente scarico e fuori registro di un soffio
    ctx.save(); ctx.globalAlpha = 0.9
    ctx.drawImage(maskToCanvas(inkPress(ink, o.seed + 2, S, 0.12, { tilt: 0.25 }), inkC), S * 0.0015, 0); ctx.restore()
    return finish(c, o, t, 'biglietto', null)
  },
}

const nastro: Recipe = {
  id: 'nastro', label: 'Nastro adesivo', cat: 'Timbri & adesivi', hint: 'striscia di nastro strappata a mano: carta washi, telato o trasparente',
  piece: true,
  params: [P.sel('kind', 'Nastro', ['Carta crespa', 'Washi a righe', 'Washi a pois', 'Trasparente', 'Telato nero']), { key: 'print', label: 'Stampa', type: 'text', def: 'Artismi Design Studio · Torino' },
    P.range('len', 'Lunghezza', 40, 100, 78), P.range('angle', 'Rotazione', -45, 45, -12), P.tone(4), P.grain(10)],
  render: o => {
    const t = tone(o), S = SS(o), kind = num(o, 'kind')
    const len = S * 0.9 * num(o, 'len') / 100, wid = S * 0.16, ang = num(o, 'angle') * Math.PI / 180
    const m = tapeStrip(o.W, o.H, o.W / 2, o.H / 2, len, wid, ang, o.seed)
    const base = ['#e9dcb8', '#f4efe4', '#f4efe4', '#ffffff', '#1c1c1e'][kind]
    const alpha = [0.86, 0.9, 0.9, 0.32, 0.95][kind]
    const pat = makeCanvas(o.W, o.H)
    const p = pat.ctx
    p.fillStyle = base; p.fillRect(0, 0, o.W, o.H)
    p.save(); p.translate(o.W / 2, o.H / 2); p.rotate(ang)
    if (kind === 1) { p.fillStyle = t.acc; for (let x = -len; x < len; x += wid * 0.32) { p.save(); p.translate(x, 0); p.rotate(Math.PI / 4); p.fillRect(-wid * 0.06, -wid, wid * 0.12, wid * 2); p.restore() } }
    if (kind === 2) { p.fillStyle = t.acc; for (let x = -len; x < len; x += wid * 0.3) for (let y = -wid; y < wid; y += wid * 0.3) { p.beginPath(); p.arc(x + ((Math.round(y / (wid * 0.3)) & 1) * wid * 0.15), y, wid * 0.05, 0, Math.PI * 2); p.fill() } }
    if (kind === 0 || kind === 4) {
      // fibre e crespe: righe sottili lungo il nastro
      const r = rng(o.seed + 4)
      for (let i = 0; i < 160; i++) { p.globalAlpha = 0.05 + r() * 0.07; p.fillStyle = kind === 4 ? '#ffffff' : '#7a6440'; p.fillRect(-len, -wid / 2 + r() * wid, len * 2, Math.max(0.6, S * 0.0008)) }
      p.globalAlpha = 1
    }
    const pr = str(o, 'print')
    if (pr && kind !== 3) {
      p.fillStyle = kind === 4 ? '#f2efe6' : t.ink; p.globalAlpha = 0.85
      const fs = wid * 0.2
      p.font = fontCss(FACES.mono, fs); p.textAlign = 'left'
      const tw = p.measureText(pr.toUpperCase() + '   ').width
      for (let x = -len; x < len; x += tw) p.fillText(pr.toUpperCase(), x, fs * 0.36)
    }
    p.restore()
    // grinze: due pieghe in diagonale, una chiara e una scura
    const tape = makeCanvas(o.W, o.H)
    tape.ctx.drawImage(pat.c, 0, 0)
    tape.ctx.save(); tape.ctx.translate(o.W / 2, o.H / 2); tape.ctx.rotate(ang)
    const r2 = rng(o.seed + 8)
    for (let i = 0; i < 3; i++) {
      const x = (r2() - 0.5) * len * 0.8, g = tape.ctx.createLinearGradient(x - wid * 0.1, 0, x + wid * 0.1, 0)
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, 'rgba(0,0,0,0.12)'); g.addColorStop(0.55, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)')
      tape.ctx.fillStyle = g; tape.ctx.save(); tape.ctx.translate(x, 0); tape.ctx.rotate((r2() - 0.5) * 0.6); tape.ctx.fillRect(-wid * 0.1, -wid, wid * 0.2, wid * 2); tape.ctx.restore()
    }
    tape.ctx.restore()
    tape.ctx.globalCompositeOperation = 'destination-in'
    tape.ctx.drawImage(maskToCanvas(m, '#000000'), 0, 0)
    const { c, ctx } = stage(o, t)
    castShadow(ctx, m, S, kind === 3 ? 0.12 : 0.2, 0.25)
    ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(tape.c, 0, 0); ctx.restore()
    return finish(c, o, t, 'nastro', null)
  },
}

const OFFICE_WORDS = ['Ricevuto', 'Pagato', 'Approvato', 'Urgente', 'Riservato', 'Copia', 'Bozza', 'Archivio']

const datario: Recipe = {
  id: 'datario', label: 'Timbro datario', cat: 'Timbri & adesivi', hint: 'timbro da ufficio con la data in finestra: ricevuto, pagato, approvato…',
  piece: true,
  params: [P.sel('word', 'Dicitura', OFFICE_WORDS), { key: 'date', label: 'Data', type: 'text', def: '12 OTT 2026' }, { key: 'who', label: 'Intestazione', type: 'text', def: 'Artismi Design Studio · Torino' },
    P.sel('ink', 'Inchiostro', STAMP_INKS.map(i => i.label)), P.range('wear', 'Consumo', 0, 100, 40), P.range('angle', 'Rotazione', -20, 20, -4), P.tone(1), P.grain(15)],
  render: o => {
    const t = tone(o), S = SS(o), cx = o.W / 2, cy = o.H / 2
    const ink = STAMP_INKS[num(o, 'ink')]?.c || t.acc
    const w = S * 0.8, h = S * 0.44, x = cx - w / 2, y = cy - h / 2
    const plate = drawMask(o.W, o.H, ctx => {
      ctx.translate(cx, cy); ctx.rotate(num(o, 'angle') * Math.PI / 180); ctx.translate(-cx, -cy)
      const lw = S * 0.009
      ctx.lineWidth = lw; ctx.beginPath(); ctx.roundRect(x, y, w, h, S * 0.025); ctx.stroke()
      // dicitura in alto, larga e spaziata
      const word = OFFICE_WORDS[num(o, 'word')] ?? 'Ricevuto'
      fitText(ctx, word, FACES.grotesk, cx, y + h * 0.3, w * 0.8, h * 0.2)
      // finestra della data: banda con le rotelle (giorno, mese, anno separati)
      const by = y + h * 0.42, bh = h * 0.28
      ctx.fillRect(x, by - lw * 0.25, w, lw * 0.5); ctx.fillRect(x, by + bh - lw * 0.25, w, lw * 0.5)
      const parts = (str(o, 'date') || '12 OTT 2026').split(/\s+/).slice(0, 3)
      const cw = w / parts.length
      parts.forEach((p, i) => {
        fitText(ctx, p, FACES.mono, x + cw * (i + 0.5), by + bh * 0.72, cw * 0.7, bh * 0.6)
        if (i) ctx.fillRect(x + cw * i - lw * 0.2, by, lw * 0.4, bh)
      })
      fitText(ctx, str(o, 'who'), FACES.mono, cx, y + h * 0.86, w * 0.82, h * 0.07)
    })
    const pressed = inkPress(plate, o.seed, S, num(o, 'wear') / 100, { tilt: 0.55 })
    const { c, ctx } = stage(o, t)
    ctx.save(); if (!o.transparent) ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(maskToCanvas(pressed, ink, 0.94), 0, 0); ctx.restore()
    return finish(c, o, t, 'datario', null)
  },
}

const timbroParola: Recipe = {
  id: 'timbroParola', label: 'Timbro parola', cat: 'Timbri & adesivi', hint: 'una parola sola in un riquadro, battuta storta e decisa: urgente, riservato, approvato',
  piece: true,
  params: [P.text('Approvato', 'Parola'), { key: 'small', label: 'Riga piccola', type: 'text', def: 'Artismi · Torino' }, P.face('condensato'),
    P.sel('frame', 'Cornice', ['Doppia', 'Singola spessa', 'Nessuna']), P.sel('ink', 'Inchiostro', STAMP_INKS.map(i => i.label)),
    P.range('wear', 'Consumo', 0, 100, 55), P.range('angle', 'Rotazione', -25, 25, -11), P.tone(1), P.grain(15)],
  render: o => {
    const t = tone(o), S = SS(o), cx = o.W / 2, cy = o.H / 2
    const ink = STAMP_INKS[num(o, 'ink')]?.c || t.acc
    const word = str(o, 'text') || ' ', small = str(o, 'small'), fr = num(o, 'frame')
    const f: Face = face(o)
    const plate = drawMask(o.W, o.H, ctx => {
      ctx.translate(cx, cy); ctx.rotate(num(o, 'angle') * Math.PI / 180); ctx.translate(-cx, -cy)
      const { ctx: m } = makeCanvas(4, 4)
      const sz = Math.min(fitSize(m, word.toUpperCase(), { ...f, upper: true }, S * 0.74), S * 0.22)
      const ch = capOf({ ...f, upper: true }, sz)
      const ss = small ? Math.min(fitSize(m, small.toUpperCase(), FACES.mono, S * 0.5), S * 0.03) : 0
      const totH = ch + (small ? ss * 2 : 0)
      const pad = S * 0.04, bw = S * 0.74 + pad * 2, bh = totH + pad * 2
      text(ctx, word, cx, cy - totH / 2 + ch, { ...f, upper: true }, sz, 'center')
      if (small) text(ctx, small, cx, cy + totH / 2, FACES.mono, ss, 'center')
      const lw = S * (fr === 1 ? 0.016 : 0.009)
      if (fr < 2) { ctx.lineWidth = lw; ctx.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh) }
      if (fr === 0) { ctx.lineWidth = lw * 0.4; ctx.strokeRect(cx - bw / 2 + lw * 1.6, cy - bh / 2 + lw * 1.6, bw - lw * 3.2, bh - lw * 3.2) }
    })
    const pressed = inkPress(plate, o.seed, S, num(o, 'wear') / 100, { tilt: 0.7 })
    const { c, ctx } = stage(o, t)
    ctx.save(); if (!o.transparent) ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(maskToCanvas(pressed, ink, 0.94), 0, 0); ctx.restore()
    return finish(c, o, t, 'timbroParola', null)
  },
}

const hanko: Recipe = {
  id: 'hanko', label: 'Sigillo quadrato', cat: 'Timbri & adesivi', hint: 'sigillo da firma in negativo, lettere a griglia come un hanko: rosso vermiglio',
  piece: true,
  params: [P.text('ARTS', 'Lettere (max 4)'), P.sel('shape', 'Forma', ['Quadrato', 'Tondo', 'Rettangolo verticale']), P.face('condensato'), P.sel('neg', 'Stampa', ['Negativo', 'Positivo']),
    P.range('wear', 'Consumo', 0, 100, 45), P.tone(1), P.grain(15)],
  render: o => {
    const t = tone(o), S = SS(o), cx = o.W / 2, cy = o.H / 2, sh = num(o, 'shape')
    const letters = [...(str(o, 'text') || 'A').toUpperCase().replace(/\s/g, '')].slice(0, 4)
    const f: Face = face(o)
    const W2 = sh === 2 ? S * 0.32 : S * 0.5, H2 = sh === 2 ? S * 0.62 : S * 0.5
    const R = S * 0.25
    const path = (ctx: Ctx, k: number) => {
      ctx.beginPath()
      if (sh === 1) ctx.arc(cx, cy, R * k, 0, Math.PI * 2)
      else ctx.roundRect(cx - W2 / 2 * k, cy - H2 / 2 * k, W2 * k, H2 * k, S * 0.012)
    }
    const glyphs = drawMask(o.W, o.H, ctx => {
      // griglia: 1 lettera piena, 2 affiancate o impilate, 3-4 in 2x2
      const n = letters.length
      const cols = sh === 2 ? 1 : n === 1 ? 1 : 2, rows = Math.ceil(n / cols)
      const iw = (sh === 1 ? R * 1.3 : W2 * 0.82) / cols, ih = (sh === 1 ? R * 1.3 : H2 * 0.82) / rows
      letters.forEach((ch, i) => {
        // lettura occidentale: righe da sinistra a destra, dall'alto
        const col = i % cols, row = Math.floor(i / cols)
        const gx = cx - (cols * iw) / 2 + iw * (col + 0.5), gy = cy - (rows * ih) / 2 + ih * (row + 0.5)
        const { ctx: m } = makeCanvas(4, 4)
        const sz = Math.min(fitSize(m, ch, f, iw * 0.92), ih * 1.25)
        ctx.save(); ctx.translate(gx, gy); ctx.scale(1, Math.min(1.6, (ih * 0.9) / capOf(f, sz)))
        text(ctx, ch, 0, capOf(f, sz) / 2, f, sz, 'center'); ctx.restore()
      })
    })
    const neg = num(o, 'neg') === 0
    const plate = drawMask(o.W, o.H, ctx => {
      if (neg) { path(ctx, 1); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(maskToCanvas(glyphs, '#000'), 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = S * 0.006; ctx.globalCompositeOperation = 'destination-out'; path(ctx, 0.92); ctx.stroke() }
      else { ctx.lineWidth = S * 0.012; path(ctx, 0.97); ctx.stroke(); ctx.drawImage(maskToCanvas(glyphs, '#000'), 0, 0) }
    })
    const pressed = inkPress(plate, o.seed, S, num(o, 'wear') / 100, { tilt: 0.6 })
    const { c, ctx } = stage(o, t)
    ctx.save(); if (!o.transparent) ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(maskToCanvas(pressed, '#c4161c', 0.95), 0, 0); ctx.restore()
    return finish(c, o, t, 'hanko', null)
  },
}

const foglioAdesivi: Recipe = {
  id: 'foglioAdesivi', label: 'Foglio di adesivi', cat: 'Timbri & adesivi', hint: 'sticker sheet: più adesivi del marchio pretagliati su un foglio di supporto',
  piece: true,
  params: [{ key: 'brand', label: 'Marchio', type: 'text', def: 'Artismi' }, { key: 'city', label: 'Città', type: 'text', def: 'Torino' }, { key: 'tag', label: 'Bollino', type: 'text', def: 'Nuovo' },
    P.face('espanso'), P.sel('finish', 'Finitura', ['Lucida', 'Opaca', 'Olografica']), P.tone(4), P.grain(0)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed)
    const sw = S * 0.86, sh = S * 0.9, sx = o.W / 2 - sw / 2, sy = o.H / 2 - sh / 2
    const brand = str(o, 'brand') || 'Artismi', city = str(o, 'city') || 'Torino', tag = str(o, 'tag') || 'Nuovo'
    const f: Face = face(o)
    // celle: 2 colonne x 3 righe, la prima riga intera per la parola
    const cell = (cxx: number, cyy: number, size: number, k: number, rot: number) => {
      const cont = drawMask(o.W, o.H, ctx => {
        ctx.translate(cxx, cyy); ctx.rotate(rot); ctx.translate(-cxx, -cyy)
        if (k === 0) fitText(ctx, brand, f, cxx, cyy + size * 0.12, size * 1.9, size * 0.42)
        else if (k === 1) { burst(ctx, cxx, cyy, size * 0.42, 16, 0.84) }
        else if (k === 2) { ctx.beginPath(); ctx.arc(cxx, cyy, size * 0.42, 0, Math.PI * 2); ctx.fill() }
        else if (k === 3) { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; flash(ctx, Math.floor(r() * 5), cxx, cyy, size * 0.9, r, 2.4) }
        else { ctx.beginPath(); ctx.roundRect(cxx - size * 0.48, cyy - size * 0.16, size * 0.96, size * 0.32, size * 0.16); ctx.fill() }
      })
      const kn = drawMask(o.W, o.H, ctx => {
        ctx.translate(cxx, cyy); ctx.rotate(rot); ctx.translate(-cxx, -cyy)
        if (k === 1) fitText(ctx, tag, FACES.grotesk, cxx, cyy + size * 0.06, size * 0.56, size * 0.16)
        if (k === 2) { arcText(ctx, brand, cxx, cyy, size * 0.27, FACES.grotesk, size * 0.075, true, 0.16); arcText(ctx, city, cxx, cyy, size * 0.36, FACES.grotesk, size * 0.075, false, 0.3); star(ctx, cxx, cyy, size * 0.09) }
        if (k === 4) fitText(ctx, city, FACES.grotesk, cxx, cyy + size * 0.06, size * 0.7, size * 0.17)
      })
      return { cont, kn }
    }
    const cs = sw * 0.42
    const items = [
      cell(o.W / 2, sy + sh * 0.17, cs * 1.05, 0, -0.06),
      cell(sx + sw * 0.28, sy + sh * 0.45, cs, 1, 0.12), cell(sx + sw * 0.72, sy + sh * 0.45, cs, 2, -0.05),
      cell(sx + sw * 0.28, sy + sh * 0.76, cs, 3, -0.1), cell(sx + sw * 0.72, sy + sh * 0.78, cs, 4, 0.08),
    ]
    const sheet = drawMask(o.W, o.H, ctx => { ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, S * 0.02); ctx.fill() })
    const { c, ctx } = stage(o, t)
    castShadow(ctx, sheet, S, 0.2, 0.4)
    ctx.drawImage(maskToCanvas(sheet, '#f4f2ec'), 0, 0)
    const finishMode = (['lucida', 'opaca', 'olografica'] as Finish[])[num(o, 'finish')] ?? 'lucida'
    items.forEach((it, i) => {
      const cut = dieCut(it.cont, S * 0.016, S * 0.02)
      const fill = i % 2 ? t.acc : t.ink
      const layers = [{ mask: it.cont, color: i === 0 ? t.acc : fill }]
      if (i > 0) layers.push({ mask: it.kn, color: '#fbfaf6' })
      ctx.drawImage(stickerCanvas(cut, layers, S, { paper: '#ffffff', finish: finishMode, shadow: false, seed: o.seed + i }), 0, 0)
    })
    return finish(c, o, t, 'foglioAdesivi', null)
  },
}

const TAT_PALETTES = [
  { label: 'Tradizionale', p: {} },
  { label: 'Solo nero', p: { red: '#141212', yellow: '#141212', green: '#141212', gold: '#3a3634', steel: '#efe2c8', blue: '#141212' } },
  { label: 'Rosso e nero', p: { yellow: '#c3172b', green: '#141212', gold: '#c3172b', blue: '#141212' } },
  { label: 'Pastello', p: { red: '#f08aa4', yellow: '#f6d27a', green: '#8cc9a1', gold: '#f2c879', steel: '#c9d6e8', blue: '#8fb3e6' } },
]

const tattoo: Recipe = {
  id: 'tattoo', label: 'Tattoo flash', cat: 'Tattoo', hint: 'flash tradizionale: contorno pieno, colori piatti, ombra a puntini, cartiglio',
  piece: true,
  params: [P.sel('subj', 'Soggetto', [...SUBJECTS]), { key: 'banner', label: 'Cartiglio', type: 'text', def: 'Artismi' }, P.sel('pal', 'Colori', TAT_PALETTES.map(x => x.label)),
    P.range('line', 'Contorno', 50, 200, 100), P.range('shade', 'Ombra a puntini', 0, 100, 70), P.tog('bg', 'Fondo carta', false), P.tone(1), P.grain(15)],
  render: o => {
    const t = tone(o), S = SS(o), cx = o.W / 2, cy = o.H / 2
    const Pal = { ...INK, ...TAT_PALETTES[num(o, 'pal')]?.p }
    const lw = S * 0.009 * num(o, 'line') / 100
    const ban = str(o, 'banner')
    const s = S * (ban ? 0.66 : 0.78)
    const items = tattooItems(num(o, 'subj'), cx, cy - (ban ? S * 0.04 : 0), s, o.seed, Pal)
    const { c, ctx } = stage(o, t)
    const art = makeCanvas(o.W, o.H)
    inkFlash(art.ctx, o.W, o.H, items, { lw, shade: num(o, 'shade') / 100, seed: o.seed, palette: Pal })
    if (ban) {
      const bw = S * 0.62, bh = S * 0.1, by = cy + S * 0.3
      inkFlash(art.ctx, o.W, o.H, banner(cx, by, bw, bh, Pal), { lw, shade: 0, seed: o.seed, palette: Pal })
      // lettere che seguono la curva del nastro
      const f = FACES.condensato, curve = bannerCurve(cx, bw, bh, by)
      const { ctx: m } = makeCanvas(4, 4)
      const sz = Math.min(fitSize(m, ban.toUpperCase(), f, bw * 0.78), bh * 0.62)
      m.font = fontCss(f, sz)
      const chars = [...ban.toUpperCase()], ws = chars.map(ch => m.measureText(ch).width), tot = ws.reduce((a, b) => a + b, 0)
      let x = cx - tot / 2
      art.ctx.fillStyle = Pal.black; art.ctx.font = fontCss(f, sz); art.ctx.textAlign = 'center'
      chars.forEach((ch, i) => {
        const xm = x + ws[i] / 2, ym = curve(xm), slope = (curve(xm + 1) - curve(xm - 1)) / 2
        art.ctx.save(); art.ctx.translate(xm, ym + capOf(f, sz) / 2); art.ctx.rotate(Math.atan(slope)); art.ctx.fillText(ch, 0, 0); art.ctx.restore()
        x += ws[i]
      })
    }
    if (on(o, 'bg') && !o.transparent) { ctx.fillStyle = INK.skin; ctx.fillRect(0, 0, o.W, o.H) }
    ctx.drawImage(art.c, 0, 0)
    return finish(c, o, t, 'tattoo', null)
  },
}

// ─── EPHEMERA ────────────────────────────────────────────────────────────────

const francobollo: Recipe = {
  id: 'francobollo', label: 'Francobollo', cat: 'Ephemera', hint: 'francobollo dentellato con illustrazione, valore e annullo postale',
  piece: true,
  params: [P.sel('sym', 'Soggetto', ['Sole', 'Luna', 'Occhio', 'Stella', 'Cuore sacro', 'Pugnale', 'Raggiera']), P.text('Torino', 'Luogo'),
    { key: 'value', label: 'Valore', type: 'text', def: '€ 1,20' }, { key: 'issuer', label: 'Emittente', type: 'text', def: 'Artismi Design Studio' },
    P.tog('cancel', 'Annullo', true), P.range('angle', 'Rotazione', -15, 15, 4), P.tog('shadow', 'Ombra', true), P.tone(2), P.grain(20)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed), cx = o.W / 2, cy = o.H / 2
    const w = S * 0.56, h = S * 0.7, x = cx - w / 2, y = cy - h / 2, hole = S * 0.011
    const ang = num(o, 'angle') * Math.PI / 180
    const rot = (m: Mask) => remap(m, (px, py) => { const dx = px - cx, dy = py - cy, cs = Math.cos(-ang), sn = Math.sin(-ang); return [cx + dx * cs - dy * sn, cy + dx * sn + dy * cs] })
    const paper = rot(perforated(o.W, o.H, x, y, w, h, hole))
    const m = S * 0.04, ix = x + m, iy = y + m, iw = w - 2 * m, ih = h - 2 * m
    const panel = rot(drawMask(o.W, o.H, ctx => ctx.fillRect(ix, iy, iw, ih)))
    const light = rot(drawMask(o.W, o.H, ctx => {
      const k = num(o, 'sym'), icx = cx, icy = iy + ih * 0.44
      ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip()
      if (k === 6) sunburst(ctx, icx, icy, ih, 28, r() * 0.2)
      else { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; flash(ctx, k, icx, icy, iw * 0.95, r, 1.6) }
      ctx.restore()
      fitText(ctx, str(o, 'text'), FACES.condensato, ix + iw * 0.06, iy + ih * 0.12, iw * 0.6, ih * 0.08, 'left')
      fitText(ctx, str(o, 'value'), FACES.espanso, ix + iw * 0.94, iy + ih * 0.93, iw * 0.5, ih * 0.1, 'right')
      fitText(ctx, str(o, 'issuer'), FACES.mono, ix + iw * 0.06, iy + ih * 0.93, iw * 0.4, ih * 0.03, 'left')
    }))
    const { c, ctx } = stage(o, t)
    if (on(o, 'shadow')) castShadow(ctx, paper, S, 0.25, 0.5)
    ctx.drawImage(maskToCanvas(paper, '#f6f1e4'), 0, 0)
    const pc = makeCanvas(o.W, o.H)
    pc.ctx.drawImage(maskToCanvas(panel, t.acc), 0, 0)
    pc.ctx.drawImage(maskToCanvas(combine(light, panel, 'min'), '#f6f1e4'), 0, 0)
    // stampa calcografica: inchiostro appena irregolare
    ctx.drawImage(maskToCanvas(inkPress(panel, o.seed + 1, S, 0.05, { tilt: 0.2 }), '#000000', 0), 0, 0)
    ctx.drawImage(pc.c, 0, 0)
    if (on(o, 'cancel')) {
      // annullo: timbro tondo con data e onde, nero e scarico, che sborda dal francobollo
      const pcx = cx + w * 0.42, pcy = cy - h * 0.18
      const plate = drawMask(o.W, o.H, c2 => {
        stampPlate(c2, 0, pcx, pcy, S * 0.38, { top: str(o, 'text'), bottom: 'Poste', center: '12·10·26', small: '' }, { ring: FACES.grotesk, center: FACES.mono, small: FACES.mono }, 0.7)
        c2.lineWidth = S * 0.005
        for (let i = 0; i < 5; i++) { const yy = pcy - S * 0.06 + i * S * 0.03; c2.beginPath(); for (let k = 0; k <= 60; k++) { const xx = pcx + S * 0.17 + k * S * 0.006; c2.lineTo(xx, yy + Math.sin(k * 0.45) * S * 0.008) } c2.stroke() }
      })
      ctx.save(); ctx.globalAlpha = 0.85; ctx.globalCompositeOperation = 'multiply'
      ctx.drawImage(maskToCanvas(inkPress(plate, o.seed + 7, S, 0.5, { tilt: 0.8 }), '#1b1b22'), 0, 0); ctx.restore()
    }
    return finish(c, o, t, 'francobollo', null)
  },
}

const valigia: Recipe = {
  id: 'valigia', label: 'Etichetta da valigia', cat: 'Ephemera', hint: 'etichetta d\'albergo anni 30-50: raggiera, banda col nome, testo in giro',
  piece: true,
  params: [P.sel('kind', 'Forma', ['Tonda', 'Ovale', 'Rombo']), P.text('Torino', 'Banda'), { key: 'top', label: 'In alto', type: 'text', def: 'Artismi Design Studio' },
    { key: 'bottom', label: 'In basso', type: 'text', def: 'Italia' }, P.face('espanso'), P.range('wear', 'Usura', 0, 100, 15), P.range('angle', 'Rotazione', -20, 20, -7), P.tone(5), P.grain(25)],
  render: o => {
    const t = tone(o), S = SS(o), cx = o.W / 2, cy = o.H / 2, kind = num(o, 'kind'), R = S * 0.42
    const ang = num(o, 'angle') * Math.PI / 180
    const shapePath = (ctx: Ctx, k = 1) => {
      ctx.beginPath()
      if (kind === 0) ctx.arc(cx, cy, R * k, 0, Math.PI * 2)
      else if (kind === 1) ctx.ellipse(cx, cy, R * k, R * 0.72 * k, 0, 0, Math.PI * 2)
      else { ctx.moveTo(cx, cy - R * k); ctx.lineTo(cx + R * 1.05 * k, cy); ctx.lineTo(cx, cy + R * k); ctx.lineTo(cx - R * 1.05 * k, cy); ctx.closePath() }
    }
    const rot = (ctx: Ctx) => { ctx.translate(cx, cy); ctx.rotate(ang); ctx.translate(-cx, -cy) }
    const paper = drawMask(o.W, o.H, ctx => { rot(ctx); shapePath(ctx); ctx.fill() })
    const ink1 = drawMask(o.W, o.H, ctx => {
      rot(ctx)
      shapePath(ctx, 0.95); ctx.fill()
      ctx.save(); shapePath(ctx, 0.95); ctx.clip()
      ctx.globalCompositeOperation = 'destination-out'
      shapePath(ctx, 0.9); ctx.lineWidth = S * 0.006; ctx.stroke()
      ctx.restore()
    })
    const ink2 = drawMask(o.W, o.H, ctx => {
      rot(ctx)
      ctx.save(); shapePath(ctx, 0.88); ctx.clip()
      sunburst(ctx, cx, cy, R * 1.2, 36, 0.05)
      ctx.restore()
    })
    const band = drawMask(o.W, o.H, ctx => {
      rot(ctx)
      const bh = R * 0.34, bw = kind === 2 ? R * 2.3 : R * 2.15
      // banda con le code a coda di rondine che escono dalla sagoma
      ctx.beginPath(); ctx.rect(cx - bw / 2, cy - bh / 2, bw, bh); ctx.fill()
      for (const s of [-1, 1]) { const ex = cx + s * bw / 2; ctx.beginPath(); ctx.moveTo(ex, cy - bh * 0.35); ctx.lineTo(ex + s * bh * 0.6, cy - bh * 0.35); ctx.lineTo(ex + s * bh * 0.35, cy + bh * 0.05); ctx.lineTo(ex + s * bh * 0.6, cy + bh * 0.45); ctx.lineTo(ex, cy + bh * 0.45); ctx.closePath(); ctx.fill() }
    })
    // nome nella banda, centrato sull'altezza delle maiuscole
    const word2 = drawMask(o.W, o.H, ctx => { rot(ctx); const f: Face = face(o); const s0 = str(o, 'text'); const { ctx: m } = makeCanvas(4, 4); const sz = Math.min(fitSize(m, f.upper ? s0.toUpperCase() : s0, f, R * 1.6), R * 0.34 * 0.62); text(ctx, s0, cx, cy + capOf(f, sz) / 2, f, sz, 'center') })
    const ring = drawMask(o.W, o.H, ctx => {
      rot(ctx)
      if (kind === 0) {
        if (str(o, 'top')) arcText(ctx, str(o, 'top'), cx, cy, R * 0.68, FACES.grotesk, R * 0.11, true, 0.08)
        if (str(o, 'bottom')) arcText(ctx, str(o, 'bottom'), cx, cy, R * 0.8, FACES.grotesk, R * 0.11, false, 0.25)
      } else {
        if (str(o, 'top')) fitText(ctx, str(o, 'top'), FACES.grotesk, cx, cy - R * 0.3, R * (kind === 2 ? 0.8 : 1.2), R * 0.1)
        if (str(o, 'bottom')) fitText(ctx, str(o, 'bottom'), FACES.grotesk, cx, cy + R * 0.38, R * 0.7, R * 0.09)
      }
    })
    const wear = num(o, 'wear') / 100
    const { c, ctx } = stage(o, t)
    castShadow(ctx, paper, S, 0.22, 0.4)
    ctx.drawImage(maskToCanvas(paper, '#efe5cf'), 0, 0)
    const lay = (m: Mask, col: string, seed: number, dx = 0) => ctx.drawImage(maskToCanvas(inkPress(combine(m, paper, 'min'), seed, S, wear * 0.6, { tilt: 0.3 }), col), dx, 0)
    lay(ink1, t.acc, o.seed)
    ctx.save(); ctx.globalAlpha = 0.16; lay(ink2, '#ffffff', o.seed + 1); ctx.restore()
    const bandOut = drawMask(o.W, o.H, c2 => { c2.drawImage(maskToCanvas(band, '#000'), 0, 0) })
    lay(bandOut, '#efe5cf', o.seed + 2)
    lay(combine(band, word2, 'min'), t.acc, o.seed + 3, S * 0.002)
    ctx.drawImage(maskToCanvas(inkPress(combine(ring, paper, 'min'), o.seed + 4, S, wear * 0.6, { tilt: 0.3 }), '#efe5cf'), 0, 0)
    return finish(c, o, t, 'valigia', null)
  },
}

const fiammiferi: Recipe = {
  id: 'fiammiferi', label: 'Etichetta fiammiferi', cat: 'Ephemera', hint: 'etichetta da scatola di fiammiferi: geometria modernista a tinte piatte',
  piece: true,
  params: [P.text('Artismi', 'Marchio'), { key: 'sub', label: 'Riga', type: 'text', def: 'Torino' }, { key: 'count', label: 'Numero', type: 'text', def: '40' },
    P.face('condensato'), P.sel('pal', 'Colori', ['Rosso e blu', 'Arancio e nero', 'Verde e rosa', 'Tono']), P.range('misreg', 'Fuori registro', 0, 100, 30), P.tone(1), P.grain(25)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed), cx = o.W / 2, cy = o.H / 2
    const pals = [['#d62f2f', '#1d3a8a', '#f2e6c9'], ['#ef6a1f', '#151515', '#f3ead6'], ['#1f7a52', '#f07da6', '#f4ecdb'], [t.acc, t.ink, t.bg]]
    const [c1, c2, pap] = pals[num(o, 'pal')] ?? pals[0]
    const w = S * 0.86, h = S * 0.56, x = cx - w / 2, y = cy - h / 2
    const mis = S * 0.004 * num(o, 'misreg') / 100
    const paper = drawMask(o.W, o.H, ctx => ctx.fillRect(x, y, w, h))
    // composizione: una figura grande in c1, un contrappunto in c2, testo
    const pick = Math.floor(r() * 4)
    const A = drawMask(o.W, o.H, ctx => {
      ctx.save(); ctx.beginPath(); ctx.rect(x + h * 0.06, y + h * 0.06, w - h * 0.12, h - h * 0.12); ctx.clip()
      const gx = x + w * 0.3, gy = cy
      if (pick === 0) { ctx.beginPath(); ctx.arc(gx, gy, h * 0.36, 0, Math.PI * 2); ctx.fill() }
      else if (pick === 1) { ctx.beginPath(); ctx.moveTo(gx - h * 0.4, gy + h * 0.38); ctx.lineTo(gx, gy - h * 0.4); ctx.lineTo(gx + h * 0.4, gy + h * 0.38); ctx.closePath(); ctx.fill() }
      else if (pick === 2) { for (let i = 0; i < 6; i++) ctx.fillRect(gx - h * 0.4, gy - h * 0.38 + i * h * 0.14, h * 0.8, h * 0.07) }
      else { ctx.beginPath(); ctx.arc(gx, gy + h * 0.38, h * 0.62, Math.PI, 0); ctx.fill() }
      ctx.restore()
    })
    const B = drawMask(o.W, o.H, ctx => {
      const gx = x + w * 0.3, gy = cy
      // fiamma geometrica: goccia rovesciata con il cuore vuoto
      ctx.beginPath(); ctx.moveTo(gx, gy - h * 0.3)
      ctx.bezierCurveTo(gx + h * 0.2, gy - h * 0.05, gx + h * 0.16, gy + h * 0.2, gx, gy + h * 0.22)
      ctx.bezierCurveTo(gx - h * 0.16, gy + h * 0.2, gx - h * 0.2, gy - h * 0.05, gx, gy - h * 0.3); ctx.fill()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath(); ctx.ellipse(gx, gy + h * 0.09, h * 0.06, h * 0.1, 0, 0, Math.PI * 2); ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
      // cornice doppia e testo
      ctx.lineWidth = S * 0.005; ctx.strokeRect(x + h * 0.035, y + h * 0.035, w - h * 0.07, h - h * 0.07)
      const tx = x + w * 0.58, tw = w * 0.36
      const big = fitText(ctx, str(o, 'text'), face(o), tx + tw / 2, cy + h * 0.06, tw, h * 0.3)
      ctx.fillRect(tx, cy + h * 0.06 + big * 0.12, tw, S * 0.004)
      fitText(ctx, str(o, 'sub'), FACES.grotesk, tx + tw / 2, cy + h * 0.06 + big * 0.12 + h * 0.11, tw * 0.8, h * 0.07)
      const cnt = str(o, 'count')
      if (cnt) { fitText(ctx, 'N° ' + cnt, FACES.mono, tx + tw / 2, y + h * 0.2, tw * 0.5, h * 0.045) }
    })
    const { c, ctx } = stage(o, t)
    castShadow(ctx, paper, S, 0.2, 0.35)
    ctx.drawImage(maskToCanvas(paper, pap), 0, 0)
    ctx.save(); ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(maskToCanvas(inkPress(combine(A, paper, 'min'), o.seed, S, 0.15, { tilt: 0.3 }), c1), -mis, mis * 0.5)
    ctx.drawImage(maskToCanvas(inkPress(combine(B, paper, 'min'), o.seed + 1, S, 0.12, { tilt: 0.3 }), c2), mis, -mis * 0.5)
    ctx.restore()
    return finish(c, o, t, 'fiammiferi', null)
  },
}

const cartellino: Recipe = {
  id: 'cartellino', label: 'Cartellino', cat: 'Ephemera', hint: 'cartellino con occhiello rinforzato e spago, stampato o scritto',
  piece: true,
  params: [P.text('Artismi', 'Titolo'), { key: 'lines', label: 'Righe', type: 'text', def: 'Design Studio|Torino|Pezzo unico' }, P.face('bodoni'),
    P.sel('paper', 'Carta', ['Kraft', 'Avorio', 'Nero', 'Colore del tono']), P.range('angle', 'Rotazione', -30, 30, 12), P.tog('string', 'Spago', true), P.tone(1), P.grain(20)],
  render: o => {
    const t = tone(o), S = SS(o), cx = o.W / 2, cy = o.H / 2 + S * 0.05
    const w = S * 0.4, h = S * 0.68, x = cx - w / 2, y = cy - h / 2, cut = w * 0.22
    const ang = num(o, 'angle') * Math.PI / 180
    const pk = num(o, 'paper')
    const paperC = ['#b98b57', '#f3ead7', '#161616', t.acc][pk] ?? '#b98b57'
    const inkC = pk === 2 ? '#efe6d2' : pk === 3 ? (luma(t.acc) > 0.5 ? '#141414' : '#f4efe4') : '#1d1a17'
    const rot = (ctx: Ctx) => { ctx.translate(cx, y); ctx.rotate(ang); ctx.translate(-cx, -y) }
    const hy = y + cut * 0.95
    const tag = drawMask(o.W, o.H, ctx => {
      rot(ctx)
      ctx.beginPath(); ctx.moveTo(x + cut, y); ctx.lineTo(x + w - cut, y); ctx.lineTo(x + w, y + cut); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + cut); ctx.closePath(); ctx.fill()
      ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(cx, hy, w * 0.05, 0, Math.PI * 2); ctx.fill()
    })
    const ring = drawMask(o.W, o.H, ctx => { rot(ctx); eyelet(ctx, cx, hy, w * 0.05) })
    const ink = drawMask(o.W, o.H, ctx => {
      rot(ctx)
      const m = w * 0.12, tw = w - 2 * m
      const f = face(o)
      const big = fitText(ctx, str(o, 'text'), f, cx, y + h * 0.42, tw, h * 0.14)
      ctx.fillRect(cx - tw * 0.3, y + h * 0.42 + big * 0.25, tw * 0.6, Math.max(1, S * 0.0025))
      lines(str(o, 'lines')).slice(0, 4).forEach((l, i) => fitText(ctx, l, FACES.mono, cx, y + h * 0.42 + big * 0.25 + h * 0.09 + i * h * 0.065, tw * 0.9, h * 0.032))
      ctx.lineWidth = Math.max(1, S * 0.002); ctx.setLineDash([S * 0.008, S * 0.006])
      ctx.strokeRect(x + m * 0.5, y + cut + h * 0.12, w - m, h - cut - h * 0.12 - m * 0.5)
    })
    const { c, ctx } = stage(o, t)
    castShadow(ctx, tag, S, 0.25, 0.5)
    ctx.drawImage(maskToCanvas(tag, paperC), 0, 0)
    ctx.save(); if (pk !== 2) ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(maskToCanvas(inkPress(combine(ink, tag, 'min'), o.seed, S, 0.15, { tilt: 0.3 }), inkC), 0, 0); ctx.restore()
    ctx.drawImage(maskToCanvas(ring, '#b8b2a6'), 0, 0)
    ctx.drawImage(maskToCanvas(drawMask(o.W, o.H, c2 => { rot(c2); c2.lineWidth = w * 0.012; c2.beginPath(); c2.arc(cx, hy, w * 0.07, 0, Math.PI * 2); c2.stroke() }), '#8d877c'), 0, 0)
    if (on(o, 'string')) {
      // spago: passa nell'occhiello e sale in due capi morbidi
      const ca = Math.cos(ang), sa = Math.sin(ang)
      const hx = cx - (hy - y) * sa, hyy = y + (hy - y) * ca
      const str2 = drawMask(o.W, o.H, c2 => {
        for (const s of [-1, 1]) {
          const pts: [number, number][] = []
          for (let i = 0; i <= 80; i++) { const u = i / 80; pts.push([hx + s * S * 0.05 * Math.sin(u * Math.PI) + s * u * S * 0.08, hyy - u * S * 0.32 + Math.sin(u * 5 + s) * S * 0.01]) }
          twine(c2, pts, S * 0.007)
        }
      })
      castShadow(ctx, str2, S, 0.3, 0.3)
      ctx.drawImage(maskToCanvas(str2, '#d9c7a1'), 0, 0)
    }
    return finish(c, o, t, 'cartellino', null)
  },
}

// incisione: riempie la sagoma di linee parallele il cui spessore segue l'ombra
// (luce da in alto a sinistra), come un bulino. Le linee si chiudono nelle luci.
function engrave(m: Mask, S: number, pitch: number, ang = -0.5): Mask {
  const d = distance(m), W = m.w, H = m.h
  const out = newMask(W, H)
  const ca = Math.cos(ang), sa = Math.sin(ang)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x
    if (!m.a[i]) continue
    // ombra: lato in basso a destra della forma + bordo
    const gx = d[i + 1] - d[i - 1], gy = d[i + W] - d[i - W]
    const shade = Math.max(0, Math.min(1, 0.5 + (gx * 0.45 + gy * 0.6) * 0.5 + 0.35 * Math.exp(-d[i] / (S * 0.01))))
    const u = (x * ca + y * sa) / pitch
    const f = Math.abs(u - Math.round(u)) * 2
    const half = 0.12 + 0.75 * shade
    out.a[i] = Math.max(0, Math.min(1, (half - f) * pitch * 0.5 + 0.5)) * m.a[i]
  }
  return out
}

const exlibris: Recipe = {
  id: 'exlibris', label: 'Ex libris', cat: 'Ephemera', hint: 'ex libris inciso a bulino: cornice, emblema a tratteggio, nome',
  piece: true,
  params: [P.sel('sym', 'Emblema', ['Sole', 'Luna', 'Occhio', 'Stella', 'Cuore sacro', 'Pugnale']), P.text('Artismi', 'Nome'), { key: 'motto', label: 'Motto', type: 'text', def: 'Torino · Design Studio' },
    P.face('gotico'), P.range('pitch', 'Fitta', 40, 200, 100), P.sel('ink', 'Inchiostro', ['Nero', 'Seppia', 'Blu', 'Tono']), P.tone(1), P.grain(25)],
  render: o => {
    const t = tone(o), S = SS(o), r = rng(o.seed), cx = o.W / 2, cy = o.H / 2
    const w = S * 0.6, h = S * 0.8, x = cx - w / 2, y = cy - h / 2
    const inkC = ['#141210', '#4a2f1d', '#1b2c5a', t.ink][num(o, 'ink')] ?? '#141210'
    const paper = drawMask(o.W, o.H, ctx => ctx.fillRect(x, y, w, h))
    const frame = drawMask(o.W, o.H, ctx => {
      const m = w * 0.05
      ctx.lineWidth = S * 0.004; ctx.strokeRect(x + m, y + m, w - 2 * m, h - 2 * m)
      ctx.lineWidth = S * 0.0015; ctx.strokeRect(x + m * 1.5, y + m * 1.5, w - 3 * m, h - 3 * m)
      // angoli: quarti di cerchio rientranti con un rombo
      for (const [ax, ay, sx, sy] of [[x + m * 1.5, y + m * 1.5, 1, 1], [x + w - m * 1.5, y + m * 1.5, -1, 1], [x + m * 1.5, y + h - m * 1.5, 1, -1], [x + w - m * 1.5, y + h - m * 1.5, -1, -1]] as const) {
        ctx.beginPath(); ctx.arc(ax, ay, m * 1.2, sx > 0 ? (sy > 0 ? 0 : -Math.PI / 2) : (sy > 0 ? Math.PI / 2 : Math.PI), sx > 0 ? (sy > 0 ? Math.PI / 2 : 0) : (sy > 0 ? Math.PI : Math.PI * 1.5)); ctx.stroke()
        lozenge(ctx, ax + sx * m * 0.45, ay + sy * m * 0.45, m * 0.22)
      }
      const f = face(o)
      fitText(ctx, 'Ex Libris', FACES.bodoni, cx, y + h * 0.15, w * 0.6, h * 0.07)
      fitText(ctx, str(o, 'text') || ' ', f, cx, y + h * 0.84, w * 0.7, h * 0.1)
      fitText(ctx, str(o, 'motto'), FACES.mono, cx, y + h * 0.9, w * 0.6, h * 0.022)
      ctx.lineWidth = S * 0.0015
      for (const yy of [y + h * 0.19, y + h * 0.745]) { ctx.beginPath(); ctx.moveTo(cx - w * 0.3, yy); ctx.lineTo(cx + w * 0.3, yy); ctx.stroke(); lozenge(ctx, cx, yy, S * 0.006) }
    })
    // emblema: sagoma piena del simbolo, poi incisa a tratteggio; il contorno resta netto
    const emb = drawMask(o.W, o.H, ctx => { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; flash(ctx, num(o, 'sym'), cx, y + h * 0.465, w * 0.95, r, 3.2) })
    const disc = drawMask(o.W, o.H, ctx => { ctx.beginPath(); ctx.arc(cx, y + h * 0.465, w * 0.33, 0, Math.PI * 2); ctx.fill() })
    const pitch = Math.max(2.2, S * 0.006 * num(o, 'pitch') / 100)
    const bgHatch = engrave(combine(disc, emb, 'sub'), S, pitch * 0.8, 0.3)
    const lightBg = newMask(o.W, o.H); for (let i = 0; i < lightBg.a.length; i++) lightBg.a[i] = bgHatch.a[i] * 0.55
    const embH = engrave(emb, S, pitch, -0.6)
    const embEdge = drawMask(o.W, o.H, ctx => { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; flash(ctx, num(o, 'sym'), cx, y + h * 0.465, w * 0.95, rng(o.seed), 1.0) })
    const discRing = drawMask(o.W, o.H, ctx => { ctx.lineWidth = S * 0.002; ctx.beginPath(); ctx.arc(cx, y + h * 0.465, w * 0.33, 0, Math.PI * 2); ctx.stroke() })
    const all = [frame, embH, embEdge, discRing, lightBg].reduce((a, b) => combine(a, b, 'max'))
    const { c, ctx } = stage(o, t)
    castShadow(ctx, paper, S, 0.18, 0.4)
    ctx.drawImage(maskToCanvas(paper, '#f3ecdc'), 0, 0)
    ctx.save(); ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(maskToCanvas(inkPress(combine(all, paper, 'min'), o.seed, S, 0.08, { tilt: 0.25 }), inkC), 0, 0); ctx.restore()
    return finish(c, o, t, 'exlibris', null)
  },
}

const stemma: Recipe = {
  id: 'stemma', label: 'Badge gotico', cat: 'Sigilli', hint: 'monogramma blackletter in un arco a sesto acuto, svolazzi simmetrici, in oro o cromo',
  piece: true,
  params: [P.text('A', 'Monogramma'), { key: 'top', label: 'Sopra', type: 'text', def: 'Artismi' }, { key: 'bottom', label: 'Sotto', type: 'text', def: 'Torino · MMXXVI' },
    P.face('gotico'), P.sel('frame', 'Cornice', ['Arco acuto', 'Scudo', 'Losanga']), P.mat(3), P.range('flour', 'Svolazzi', 0, 100, 70), P.tone(0), P.glow(false), P.grain(15)],
  render: o => {
    const t = tone(o), S = SS(o), cx = o.W / 2, cy = o.H / 2 + S * 0.02, kind = num(o, 'frame'), r = rng(o.seed)
    const m = drawMask(o.W, o.H, ctx => {
      const w = S * 0.3, h = S * 0.42, lw = S * 0.016
      const path = (k: number) => {
        ctx.beginPath()
        if (kind === 0) { ctx.moveTo(cx - w * k, cy + h * 0.5 * k); ctx.lineTo(cx - w * k, cy - h * 0.05 * k); ctx.quadraticCurveTo(cx - w * k, cy - h * 0.45 * k, cx, cy - h * 0.62 * k); ctx.quadraticCurveTo(cx + w * k, cy - h * 0.45 * k, cx + w * k, cy - h * 0.05 * k); ctx.lineTo(cx + w * k, cy + h * 0.5 * k); ctx.closePath() }
        else if (kind === 1) { ctx.moveTo(cx - w * k, cy - h * 0.5 * k); ctx.lineTo(cx + w * k, cy - h * 0.5 * k); ctx.lineTo(cx + w * k, cy + h * 0.05 * k); ctx.quadraticCurveTo(cx + w * k, cy + h * 0.42 * k, cx, cy + h * 0.6 * k); ctx.quadraticCurveTo(cx - w * k, cy + h * 0.42 * k, cx - w * k, cy + h * 0.05 * k); ctx.closePath() }
        else { ctx.moveTo(cx, cy - h * 0.62 * k); ctx.lineTo(cx + w * 1.05 * k, cy); ctx.lineTo(cx, cy + h * 0.62 * k); ctx.lineTo(cx - w * 1.05 * k, cy); ctx.closePath() }
      }
      ctx.lineJoin = 'miter'
      ctx.lineWidth = lw; path(1); ctx.stroke()
      ctx.lineWidth = lw * 0.4; path(0.88); ctx.stroke()
      const f = face(o), mono = str(o, 'text') || 'A'
      fitText(ctx, mono, f, cx, cy + h * (kind === 1 ? 0.12 : 0.2), w * 1.4, h * 0.62)
      // svolazzi: fruste speculari che escono dai fianchi e si arricciano verso l'alto
      const fl = num(o, 'flour') / 100
      if (fl > 0) for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const y0 = cy - h * 0.1 + k * h * 0.22, L = S * (0.22 + 0.06 * k) * fl * range(r, 0.9, 1.1)
          const { pts } = whip(cx + s * w * 1.02, y0, s > 0 ? -0.15 + k * 0.25 : Math.PI + 0.15 - k * 0.25, L, s * (k === 2 ? -1 : 1) * 0.6, s * (k === 2 ? -1 : 1) * 5.2, 2.4)
          taper(ctx, pts, flick(S * 0.02, 0.06, 1.1))
        }
        lozenge(ctx, cx + s * w * 1.02, cy - h * 0.1, S * 0.008)
      }
      // cartigli di testo sopra e sotto
      if (str(o, 'top')) fitText(ctx, str(o, 'top'), FACES.condensato, cx, cy - h * 0.7, w * 1.6, h * 0.18)
      if (str(o, 'bottom')) fitText(ctx, str(o, 'bottom'), FACES.grotesk, cx, cy + h * 0.8, w * 1.4, h * 0.07)
      star(ctx, cx, cy - h * 0.38, S * 0.012); star(ctx, cx - w * 0.6, cy + h * 0.32, S * 0.008); star(ctx, cx + w * 0.6, cy + h * 0.32, S * 0.008)
    })
    const { c, ctx } = stage(o, t)
    paint(ctx, m, o, t, num(o, 'mat'), on(o, 'glow'), 0.004)
    return finish(c, o, t, 'stemma', null)
  },
}

const scontrino: Recipe = {
  id: 'scontrino', label: 'Scontrino', cat: 'Ephemera', hint: 'scontrino termico: carta strappata a zig-zag, mono, stampa che sbiadisce',
  piece: true,
  params: [{ key: 'items', label: 'Voci (nome:prezzo)', type: 'text', def: 'Concept:1200|Identità visiva:2400|Caffè:1,20|Idee folli:0' },
    { key: 'head', label: 'Intestazione', type: 'text', def: 'Artismi Design Studio|Via Po 1 · Torino' }, { key: 'foot', label: 'Saluto', type: 'text', def: 'Grazie e a presto' },
    P.range('fade', 'Sbiadito', 0, 100, 35), P.range('angle', 'Rotazione', -15, 15, 3), P.tone(1), P.grain(15)],
  render: o => {
    const t = tone(o), S = SS(o), cx = o.W / 2, r = rng(o.seed)
    const items = lines(str(o, 'items')).map(l => { const [a, b] = l.split(':'); return { a: (a ?? '').trim(), b: (b ?? '').trim() } })
    const head = lines(str(o, 'head'))
    const w = S * 0.5, fs = w * 0.042, lh = fs * 1.75
    const rows = head.length + 3 + items.length + 5
    const h = Math.min(S * 0.95, lh * rows + fs * 10)
    const x = cx - w / 2, y = o.H / 2 - h / 2
    const ang = num(o, 'angle') * Math.PI / 180
    const rot = (ctx: Ctx) => { ctx.translate(cx, o.H / 2); ctx.rotate(ang); ctx.translate(-cx, -o.H / 2) }
    const paper = drawMask(o.W, o.H, ctx => {
      rot(ctx)
      const zig = w / 26
      ctx.beginPath(); ctx.moveTo(x, y)
      for (let i = 0; i <= 26; i++) ctx.lineTo(x + i * zig, y + (i % 2 ? zig * 0.55 : 0) + r() * zig * 0.15)
      ctx.lineTo(x + w, y + h)
      for (let i = 26; i >= 0; i--) ctx.lineTo(x + i * zig, y + h - (i % 2 ? zig * 0.55 : 0) - r() * zig * 0.15)
      ctx.closePath(); ctx.fill()
    })
    const mono = FACES.mono
    const ink = drawMask(o.W, o.H, ctx => {
      rot(ctx)
      let yy = y + fs * 3.2
      const L = x + w * 0.08, R = x + w * 0.92
      head.forEach((l, i) => { text(ctx, l, cx, yy, i ? mono : FACES.grotesk, i ? fs : fs * 1.25, 'center'); yy += lh * (i ? 1 : 1.3) })
      yy += lh * 0.3
      const dash = () => { ctx.save(); ctx.setLineDash([fs * 0.4, fs * 0.3]); ctx.lineWidth = Math.max(1, fs * 0.08); ctx.beginPath(); ctx.moveTo(L, yy - fs * 0.4); ctx.lineTo(R, yy - fs * 0.4); ctx.stroke(); ctx.restore(); yy += lh * 0.7 }
      dash()
      text(ctx, '12/10/26 21:04', L, yy, mono, fs, 'left'); text(ctx, 'N. ' + String(1000 + o.seed % 9000), R, yy, mono, fs, 'right'); yy += lh
      dash()
      let tot = 0
      for (const it of items) {
        const v = parseFloat(it.b.replace(',', '.')) || 0; tot += v
        text(ctx, it.a.length > 18 ? it.a.slice(0, 17) + '.' : it.a, L, yy, mono, fs, 'left'); text(ctx, v.toFixed(2).replace('.', ','), R, yy, mono, fs, 'right'); yy += lh
      }
      dash()
      text(ctx, 'TOTALE', L, yy + fs * 0.4, mono, fs * 1.3, 'left'); text(ctx, '€ ' + tot.toFixed(2).replace('.', ','), R, yy + fs * 0.4, mono, fs * 1.3, 'right'); yy += lh * 1.8
      barcode(ctx, r, L + w * 0.1, yy, w * 0.64, fs * 2.6); yy += fs * 2.6 + lh
      const foot = str(o, 'foot'); if (foot) text(ctx, foot, cx, yy, mono, fs, 'center')
    })
    // stampa termica: più chiara verso un lato e a strisce orizzontali (testina usurata)
    const fade = num(o, 'fade') / 100
    const n = noise2(o.seed + 3)
    const inkF = newMask(o.W, o.H)
    for (let yy = 0; yy < o.H; yy++) { const band = 0.75 + 0.25 * n(0, yy / (S * 0.02)); for (let xx = 0; xx < o.W; xx++) { const i = yy * o.W + xx; if (!ink.a[i]) continue; const side = (xx - x) / w; inkF.a[i] = ink.a[i] * Math.max(0.15, 1 - fade * (0.55 * side + 0.45 * (1 - band))) } }
    const { c, ctx } = stage(o, t)
    castShadow(ctx, paper, S, 0.2, 0.4)
    ctx.drawImage(maskToCanvas(paper, '#fbfaf5'), 0, 0)
    ctx.drawImage(maskToCanvas(combine(inkF, paper, 'min'), '#26262b'), 0, 0)
    return finish(c, o, t, 'scontrino', null)
  },
}

const bottiglia: Recipe = {
  id: 'bottiglia', label: 'Etichetta bottiglia', cat: 'Ephemera', hint: 'etichetta da vino o liquore: carta avorio, filetti in lamina d\'oro, serif classico',
  piece: true,
  params: [P.text('Artismi', 'Nome'), { key: 'kind', label: 'Tipo', type: 'text', def: 'Riserva dello Studio' }, { key: 'place', label: 'Origine', type: 'text', def: 'Torino · Piemonte' },
    { key: 'year', label: 'Annata', type: 'text', def: 'MMXXVI' }, P.face('bodoni'), P.sel('shape', 'Forma', ['Angoli intagliati', 'Ovale', 'Arco']), P.sel('foil', 'Lamina', ['Oro', 'Cromo', 'Nero lucido', 'Inchiostro']), P.tone(0), P.grain(15)],
  render: o => {
    const t = tone(o), S = SS(o), cx = o.W / 2, cy = o.H / 2, kind = num(o, 'shape')
    const w = S * 0.62, h = S * 0.8, x = cx - w / 2, y = cy - h / 2, nc = w * 0.08
    const path = (ctx: Ctx, k: number) => {
      const ww = w * k, hh = h * k, xx = cx - ww / 2, yy = cy - hh / 2, c2 = nc * k
      ctx.beginPath()
      if (kind === 0) {
        ctx.moveTo(xx + c2, yy); ctx.lineTo(xx + ww - c2, yy); ctx.arc(xx + ww, yy, c2, Math.PI, Math.PI / 2, true); ctx.lineTo(xx + ww, yy + hh - c2); ctx.arc(xx + ww, yy + hh, c2, -Math.PI / 2, Math.PI, true)
        ctx.lineTo(xx + c2, yy + hh); ctx.arc(xx, yy + hh, c2, 0, -Math.PI / 2, true); ctx.lineTo(xx, yy + c2); ctx.arc(xx, yy, c2, Math.PI / 2, 0, true); ctx.closePath()
      } else if (kind === 1) ctx.ellipse(cx, cy, ww / 2, hh / 2, 0, 0, Math.PI * 2)
      else { ctx.moveTo(xx, yy + hh); ctx.lineTo(xx, yy + ww / 2); ctx.arc(cx, yy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(xx + ww, yy + hh); ctx.closePath() }
    }
    const paper = drawMask(o.W, o.H, ctx => { path(ctx, 1); ctx.fill() })
    const foil = drawMask(o.W, o.H, ctx => {
      ctx.lineWidth = S * 0.006; path(ctx, 0.93); ctx.stroke()
      ctx.lineWidth = S * 0.0018; path(ctx, 0.9); ctx.stroke()
      const f = face(o)
      const ny = kind === 2 ? cy + h * 0.02 : cy - h * 0.02
      fitText(ctx, str(o, 'text') || ' ', f, cx, ny, w * 0.72, h * 0.16)
      fitText(ctx, str(o, 'year'), FACES.condensato, cx, y + h * (kind === 2 ? 0.34 : 0.22), w * 0.25, h * 0.05)
      ctx.lineWidth = S * 0.002
      for (const yy of [ny + h * 0.045, y + h * (kind === 2 ? 0.37 : 0.25)]) { ctx.beginPath(); ctx.moveTo(cx - w * 0.2, yy); ctx.lineTo(cx + w * 0.2, yy); ctx.stroke(); lozenge(ctx, cx, yy, S * 0.006) }
    })
    const inkM = drawMask(o.W, o.H, ctx => {
      const ny = kind === 2 ? cy + h * 0.02 : cy - h * 0.02
      fitText(ctx, str(o, 'kind'), FACES.corsivo, cx, ny + h * 0.13, w * 0.6, h * 0.06)
      fitText(ctx, str(o, 'place'), FACES.mono, cx, y + h * 0.84, w * 0.55, h * 0.025)
      fitText(ctx, 'Cl 75 · 13,5% vol', FACES.mono, cx, y + h * 0.88, w * 0.4, h * 0.02)
    })
    const { c, ctx } = stage(o, t)
    castShadow(ctx, paper, S, 0.22, 0.4)
    ctx.drawImage(maskToCanvas(paper, '#f2ead8'), 0, 0)
    // carta vergata: righe sottilissime
    const laid = drawMask(o.W, o.H, c2 => { c2.globalAlpha = 0.06; for (let yy = 0; yy < o.H; yy += Math.max(2, S * 0.0035)) c2.fillRect(0, yy, o.W, 1) })
    ctx.drawImage(maskToCanvas(combine(laid, paper, 'min'), '#7a6a50'), 0, 0)
    ctx.save(); ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(maskToCanvas(inkPress(combine(inkM, paper, 'min'), o.seed, S, 0.06, { tilt: 0.2 }), '#2a2420'), 0, 0); ctx.restore()
    const fi = num(o, 'foil')
    const fm = combine(foil, paper, 'min')
    ctx.drawImage(fi < 3 ? shade(fm, (['oro', 'cromo', 'nero'] as Material[])[fi], S * 0.002, 0.5) : maskToCanvas(fm, t.acc), 0, 0)
    return finish(c, o, t, 'bottiglia', null)
  },
}

// ─── catalogo ────────────────────────────────────────────────────────────────

// ─── TESTO GRAFICO ───────────────────────────────────────────────────────────

/** colore che resta leggibile sul fondo del tono (altrimenti l'inchiostro del tono) */
const visible = (o: Job, t: Tone, col: string) => !o.transparent && Math.abs(luma(col) - luma(t.bg)) < 0.2 ? t.ink : col

const TYPE_FACES: { label: string; f: Face }[] = [
  { label: 'Groovy anni 70', f: FACES.groovy }, { label: 'Gonfio', f: FACES.gonfio }, { label: 'Espanso', f: FACES.espanso },
  { label: 'Condensato', f: FACES.condensato }, { label: 'Bodoni corsivo', f: FACES.bodoni }, { label: 'Fraktur', f: FACES.gotico },
]

const GROOVY_PALETTES = [
  { label: 'Anni 70', fill: '#f7e8c6', bands: ['#f0a12a', '#e0602a', '#b8321f', '#6e2416', '#f0a12a'], ext: '#3a1a10', line: '#e0602a' },
  { label: 'Acido', fill: '#141414', bands: ['#c8ff2e', '#141414', '#ff4fd1', '#141414', '#c8ff2e'], ext: '#141414', line: '#c8ff2e' },
  { label: 'Pop', fill: '#ffd23f', bands: ['#ee4266', '#3bceac', '#540d6e', '#ee4266', '#3bceac'], ext: '#1d0b2e', line: '#ee4266' },
  { label: 'Bianco e nero', fill: '#ffffff', bands: ['#141414', '#ffffff', '#141414', '#ffffff', '#141414'], ext: '#141414', line: '#141414' },
  { label: 'Sorbetto', fill: '#fff6ec', bands: ['#ff9aa2', '#ffc8a2', '#b5ead7', '#9fb8ff', '#ff9aa2'], ext: '#5a4b7a', line: '#ff9aa2' },
  { label: 'Neon notte', fill: '#fdfbff', bands: ['#ff2e88', '#7a2cff', '#00d1ff', '#140a2e', '#ff2e88'], ext: '#140a2e', line: '#ff2e88' },
]

const groovy: Recipe = {
  id: 'groovy', label: 'Scritta a contorni', cat: 'Testo grafico', hint: 'scritta anni 70: contorni concentrici, filo interno, blocco estruso, piegata a busta',
  piece: true,
  params: [P.text('Artismi'), P.sel('face', 'Carattere', TYPE_FACES.map(x => x.label)), P.sel('warp', 'Busta', [...WARPS], 1), P.range('amt', 'Piega', 0, 100, 45),
    P.sel('pal', 'Colori', GROOVY_PALETTES.map(x => x.label)), P.range('rings', 'Contorni', 0, 5, 3), P.range('ringW', 'Spessore contorni', 20, 200, 100),
    P.sel('inner', 'Dentro le lettere', ['Niente', 'Filo interno', 'Lucido', 'Filo e lucido'], 3), P.range('ext', 'Estrusione', 0, 100, 45), P.tog('stripes', 'Estrusione a strisce', true),
    P.tog('glint', 'Scintille', false), P.tone(1), P.range('grain', 'Grana', 0, 30, 10)],
  render: o => {
    const t = tone(o), S = SS(o), W = o.W, H = o.H
    const pal = GROOVY_PALETTES[num(o, 'pal')] ?? GROOVY_PALETTES[0]
    const f = TYPE_FACES[num(o, 'face')]?.f ?? FACES.groovy
    const rings = num(o, 'rings'), bw = S * 0.011 * num(o, 'ringW') / 100, ext = S * 0.05 * num(o, 'ext') / 100
    const room = rings * bw + ext * 0.75 + S * 0.01
    const m = fittedWord(W, H, lines(str(o, 'text') || 'Artismi'), f, num(o, 'warp'), num(o, 'amt') / 100, { room, lead: 0.08 })
    const out = distance(invert(m))
    const all = grow(out, m, rings * bw)
    const { c, ctx } = stage(o, t)
    // blocco: tutta la sagoma (contorni compresi) spinta giù a destra
    if (ext > 0) {
      if (on(o, 'stripes')) extrudeStriped(ctx, all, pal.ext, pal.bands[rings > 1 ? rings - 1 : 0], ext * 0.55, ext * 0.85, 3)
      else extrude(ctx, all, pal.ext, ext * 0.55, ext * 0.85)
    }
    for (let k = rings; k >= 1; k--) ctx.drawImage(maskToCanvas(grow(out, m, k * bw), pal.bands[(k - 1) % pal.bands.length]), 0, 0)
    ctx.drawImage(maskToCanvas(m, pal.fill), 0, 0)
    const inner = num(o, 'inner')
    if (inner) {
      const din = distance(m)
      let mx = 0; for (let i = 0; i < din.length; i++) if (din[i] > mx) mx = din[i]
      // filo che corre dentro le aste, a metà spessore
      if (inner === 1 || inner === 3) { const at = mx * 0.42, w = Math.max(1.2, mx * 0.16); ctx.drawImage(maskToCanvas(distBand(din, W, H, at, at + w), pal.line), 0, 0) }
      // lucido: una lama chiara vicino al bordo, solo dove batte la luce
      if (inner >= 2) { const at = mx * 0.14, w = Math.max(1.2, mx * 0.14); ctx.drawImage(maskToCanvas(shine(m, din, at, w, mx * 0.5), '#ffffff', 0.85), 0, 0) }
    }
    if (on(o, 'glint')) glints(ctx, all, S, t.dark ? '#ffffff' : pal.bands[0], o.seed)
    return finish(c, o, t, 'groovy', null)
  },
}

const PUFFY_COLORS = [
  { label: 'Bubblegum', c: '#ff6fae' }, { label: 'Cielo', c: '#4fa8ff' }, { label: 'Lime', c: '#a8e83a' }, { label: 'Arancio', c: '#ff7a1a' },
  { label: 'Lilla', c: '#a98bff' }, { label: 'Giallo', c: '#ffd02e' }, { label: 'Rosso', c: '#e8283c' }, { label: 'Nero lucido', c: '#232326' },
]

const gonfiabile: Recipe = {
  id: 'gonfiabile', label: 'Scritta gonfiabile', cat: 'Testo grafico', hint: 'lettere gonfie e lucide come palloncini, bordo adesivo, piegate a busta',
  piece: true,
  params: [P.text('Artismi'), P.sel('face', 'Carattere', TYPE_FACES.map(x => x.label), 1), P.sel('warp', 'Busta', [...WARPS], 2), P.range('amt', 'Piega', 0, 100, 35),
    P.sel('col', 'Colore', PUFFY_COLORS.map(x => x.label)), P.range('puff', 'Gonfiore', 20, 100, 70), P.range('gloss', 'Lucido', 0, 100, 80),
    P.sel('edge', 'Bordo', ['Nessuno', 'Bianco adesivo', 'Nero fumetto', 'Doppio'], 1), P.tog('glint', 'Scintille', true), P.tone(1), P.range('grain', 'Grana', 0, 30, 8)],
  render: o => {
    const t = tone(o), S = SS(o), W = o.W, H = o.H
    const f = TYPE_FACES[num(o, 'face')]?.f ?? FACES.gonfio
    const col = PUFFY_COLORS[num(o, 'col')]?.c ?? PUFFY_COLORS[0].c
    const edge = num(o, 'edge'), ew = S * 0.016
    const room = (edge === 3 ? ew * 2 : edge ? ew : 0) + S * 0.02
    // le lettere si toccano e si fondono come un palloncino solo
    const raw = fittedWord(W, H, lines(str(o, 'text') || 'Artismi'), f, num(o, 'warp'), num(o, 'amt') / 100, { room, fat: 0.02, lead: 0.04 })
    // dove le lettere si toccano il gonfio si raccorda morbido invece di fare una piega
    const m = liquid(raw, S * 0.0035, 0.5, 0.08)
    const din = distance(m)
    let mx = 0; for (let i = 0; i < din.length; i++) if (din[i] > mx) mx = din[i]
    const { c, ctx } = stage(o, t)
    const out = edge ? distance(invert(m)) : null
    const shell = out ? grow(out, m, edge === 3 ? ew * 2 : ew) : m
    softShadow(ctx, shell, S, 1.2, '#000000', t.dark ? 0.5 : 0.28)
    if (out && edge === 3) ctx.drawImage(maskToCanvas(shell, '#141414'), 0, 0)
    if (out) ctx.drawImage(maskToCanvas(grow(out, m, ew), edge === 2 ? '#141414' : '#ffffff'), 0, 0)
    ctx.drawImage(puffy(m, mx * (0.5 + num(o, 'puff') / 100 * 0.5), col, num(o, 'gloss') / 100), 0, 0)
    if (on(o, 'glint')) glints(ctx, shell, S, '#ffffff', o.seed)
    return finish(c, o, t, 'gonfiabile', null)
  },
}

const ECO_PALETTES = [
  { label: 'Inchiostro', ink: '#141414', fill: '#141414', acc: '#e8283c' },
  { label: 'Rosso', ink: '#e8283c', fill: '#e8283c', acc: '#141414' },
  { label: 'Blu elettrico', ink: '#2343ff', fill: '#2343ff', acc: '#ff5a1f' },
  { label: 'Lime su nero', ink: '#c8ff2e', fill: '#c8ff2e', acc: '#ff4fd1' },
  { label: 'Bianco', ink: '#ffffff', fill: '#ffffff', acc: '#ffd23f' },
]

const eco: Recipe = {
  id: 'eco', label: 'Scritta eco', cat: 'Testo grafico', hint: 'la parola ripetuta in contorno: scia, zoom, pila, onda — come un poster cinetico fermo',
  piece: true,
  params: [P.text('Artismi'), P.sel('face', 'Carattere', TYPE_FACES.map(x => x.label), 2), P.sel('mode', 'Movimento', ['Scia', 'Aloni', 'Pila', 'Onda', 'Scala']),
    P.range('copies', 'Ripetizioni', 2, 14, 6), P.range('spread', 'Distanza', 20, 200, 100), P.range('lw', 'Filo', 20, 200, 100),
    P.sel('pal', 'Colori', ECO_PALETTES.map(x => x.label)), P.tog('last', 'Ultima in colore', false), P.tone(1), P.range('grain', 'Grana', 0, 30, 8)],
  render: o => {
    const t = tone(o), S = SS(o), W = o.W, H = o.H
    const pal = ECO_PALETTES[num(o, 'pal')] ?? ECO_PALETTES[0]
    const f = TYPE_FACES[num(o, 'face')]?.f ?? FACES.espanso
    const mode = num(o, 'mode'), n = num(o, 'copies')
    // sotto una certa distanza le copie si impastano: c'è un minimo
    const sp = Math.max(mode === 0 ? 0.9 : mode === 3 ? 0.8 : 0.45, num(o, 'spread') / 100)
    // lo spazio per le copie si toglie al riquadro della parola
    const box = [
      { w: W * 0.84 / (1 + 0.25 * sp), h: H * 0.8 / (1 + n * 0.22 * sp) },
      { w: W * 0.84 - 2 * n * S * 0.014 * sp, h: H * 0.8 - 2 * n * S * 0.014 * sp },
      { w: W * 0.84, h: H * 0.84 / ((n + 1) * (1 + 0.12 * Math.min(1, sp))) },
      { w: W * 0.84 - S * 0.16 * sp, h: H * 0.8 / (1 + n * 0.62 * sp) },
      { w: W * 0.84, h: H * 0.8 / (1 + 2.2 * Math.min(1, sp)) },
    ][mode]
    const m = fittedWord(W, H, lines(str(o, 'text') || 'Artismi'), f, 0, 0, { room: 0, boxW: box.w, boxH: box.h, lead: 0.05 })
    const b = inkBox(m)!, wh = b.y1 - b.y0, ww = b.x1 - b.x0
    const din = distance(m)
    // altezza totale della scala, per centrarla
    let totScale = 0
    if (mode === 4) { let z = 1; const q = 1 - 0.14 * Math.min(1.4, sp); for (let i = 0; i < n; i++) { totScale += wh * (z + z * q) / 2 * 1.08; z *= q } }
    const lw = Math.max(1.2, S * 0.0026 * num(o, 'lw') / 100)
    const edge = maskToCanvas(distBand(din, W, H, 0.7, lw + 0.7), visible(o, t, pal.ink))
    const solid = maskToCanvas(m, visible(o, t, on(o, 'last') ? pal.acc : pal.fill))
    const { c, ctx } = stage(o, t)
    const at = (k: number, draw: HTMLCanvasElement) => {
      // k = 0 è la parola piena, le copie si allontanano con k
      ctx.save(); ctx.translate(W / 2, H / 2)
      // scia: ogni copia scende di un quinto d'altezza e scivola di lato, la piena in cima
      if (mode === 0) ctx.translate((k - n / 2) * ww * 0.025 * sp, (k - n / 2) * wh * 0.22 * sp)
      if (mode === 2) { const side = k % 2 ? 1 : -1; ctx.translate(0, side * Math.ceil(k / 2) * wh * (1 + 0.12 * Math.min(1, sp))) }
      if (mode === 3) ctx.translate(Math.sin((k - Math.round(n / 2)) * 0.9) * S * 0.08 * sp, (k - Math.round(n / 2)) * wh * 0.62 * sp)
      // scala: copie sempre più piccole che scendono sotto la parola
      if (mode === 4) { let y = 0, z = 1; const q = 1 - 0.14 * Math.min(1.4, sp); for (let i = 0; i < k; i++) { y += wh * (z + z * q) / 2 * 1.08; z *= q }; ctx.translate(0, y - totScale / 2); ctx.scale(z, z) }
      ctx.translate(-W / 2, -H / 2)
      ctx.drawImage(draw, 0, 0); ctx.restore()
    }
    // la parola piena copre i fili che le passano sotto: in testa alla scia, al centro dell'onda
    const main = mode === 0 ? 0 : mode === 3 ? Math.round(n / 2) : 0
    if (mode === 1) {
      // aloni: contorni che si allargano a passo costante attorno alle lettere
      const out = distance(invert(m)), gap = S * 0.014 * sp
      for (let k = 1; k <= n; k++) ctx.drawImage(maskToCanvas(distBand(out, W, H, k * gap, k * gap + lw), visible(o, t, k % 2 && on(o, 'last') ? pal.acc : pal.ink)), 0, 0)
    } else for (let k = n; k >= (mode === 3 || mode === 0 ? 0 : 1); k--) if (k !== main) at(k, edge)
    at(main, solid)
    return finish(c, o, t, 'eco', null)
  },
}

const TRAMA_PALETTES = [
  { label: 'Rosso e crema', a: '#e8283c', b: '#fff1dc', ink: '#1a1414' },
  { label: 'Blu e giallo', a: '#2343ff', b: '#ffd23f', ink: '#10123a' },
  { label: 'Verde bottiglia', a: '#14593c', b: '#f6e7bf', ink: '#0d2a1d' },
  { label: 'Rosa e bordeaux', a: '#6b0f2a', b: '#ffa3c4', ink: '#2a0712' },
  { label: 'Bianco e nero', a: '#141414', b: '#ffffff', ink: '#141414' },
  { label: 'Arancio e viola', a: '#3a1c71', b: '#ff8a2a', ink: '#1c0d38' },
]

const TRAMA_KINDS = ['Righe tramonto', 'Contorni interni', 'Righe diagonali', 'Scacchi', 'Mezzatinta', 'Metà e metà']

/**
 * Riempimento delle lettere, pensato sulla parola e non sul foglio: le righe
 * tramonto e la mezzatinta crescono dall'alto al basso del suo ingombro, i
 * contorni interni seguono la forma di ogni lettera.
 */
function tramaFill(m: Mask, din: Float32Array, kind: number, a: string, b: string, step: number, ang: number) {
  const W = m.w, H = m.h, bx = inkBox(m)!
  const y0 = bx.y0, hh = bx.y1 - bx.y0
  const { c, ctx } = makeCanvas(W, H)
  ctx.fillStyle = a; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = b
  if (kind === 0) {
    // tramonto: pieno in alto, poi righe chiare sempre più spesse verso il basso
    const n = Math.max(4, Math.round(hh / (step * 2.2)))
    for (let k = 0; k < n; k++) {
      const t = k / n, y = y0 + hh * (0.42 + 0.58 * t), th = (hh * 0.58 / n) * (0.18 + 0.62 * t)
      ctx.fillRect(0, y, W, th)
    }
  } else if (kind === 1) {
    // contorni interni: anelli alterni a passo costante dal bordo verso il cuore
    const img = ctx.getImageData(0, 0, W, H), d = img.data, [ar, ag, ab] = hexRgb(a), [br, bg, bb] = hexRgb(b)
    const p = step * 0.9
    for (let i = 0; i < din.length; i++) {
      if (!m.a[i]) continue
      const v = din[i] / p, f = v - Math.floor(v), k = Math.floor(v) % 2
      // bordo morbido tra un anello e l'altro
      const mix = 0.5 + (k - 0.5) * smoothstep(0, 1.2, Math.min(f, 1 - f) * p)
      d[i * 4] = ar + (br - ar) * mix; d[i * 4 + 1] = ag + (bg - ag) * mix; d[i * 4 + 2] = ab + (bb - ab) * mix
    }
    ctx.putImageData(img, 0, 0)
  } else if (kind === 2 || kind === 3) {
    ctx.save(); ctx.translate((bx.x0 + bx.x1) / 2, (bx.y0 + bx.y1) / 2); ctx.rotate(ang)
    const R = Math.hypot(W, H)
    if (kind === 2) for (let x = -R; x < R; x += step * 2) ctx.fillRect(x, -R, step, R * 2)
    else for (let y = -R, j = 0; y < R; y += step * 2.4, j++) for (let x = -R + (j % 2) * step * 2.4; x < R; x += step * 4.8) ctx.fillRect(x, y, step * 2.4, step * 2.4)
    ctx.restore()
  } else if (kind === 4) {
    // mezzatinta a 45°: niente in alto, punti che si toccano in basso
    const cell = step * 1.6
    ctx.save(); ctx.translate((bx.x0 + bx.x1) / 2, y0); ctx.rotate(Math.PI / 4)
    const R = Math.hypot(W, H)
    for (let v = -R; v < R; v += cell) for (let u = -R; u < R; u += cell) {
      const y = (u + v) / Math.SQRT2, t = Math.min(1, Math.max(0, (y - hh * 0.25) / (hh * 0.8)))
      if (t <= 0) continue
      ctx.beginPath(); ctx.arc(u, v, cell * 0.62 * Math.sqrt(t), 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  } else {
    // metà e metà: taglio ondulato a metà altezza
    ctx.beginPath(); ctx.moveTo(0, H)
    for (let x = 0; x <= W; x += 4) ctx.lineTo(x, y0 + hh * 0.52 + Math.sin(x / (step * 3)) * step * 0.5)
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill()
  }
  ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(maskToCanvas(m, '#000000'), 0, 0)
  return c
}

/** tratteggio diagonale su tutto il foglio (per l'ombra retrò) */
function hatch(W: number, H: number, ink: string, paper: string, gap: number, lw: number) {
  const { c, ctx } = makeCanvas(W, H)
  ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = ink; ctx.lineWidth = lw
  ctx.beginPath()
  for (let x = -H; x < W; x += gap) { ctx.moveTo(x, H); ctx.lineTo(x + H, 0) }
  ctx.stroke()
  return c
}

const trama: Recipe = {
  id: 'trama', label: 'Scritta a trama', cat: 'Testo grafico', hint: 'lettere a righe tramonto, contorni interni, mezzatinta o mezze; contorno pieno e ombra retrò tratteggiata',
  piece: true,
  params: [P.text('Artismi'), P.sel('face', 'Carattere', TYPE_FACES.map(x => x.label), 3), P.sel('warp', 'Busta', [...WARPS]), P.range('amt', 'Piega', 0, 100, 30),
    P.sel('pat', 'Trama', TRAMA_KINDS), P.range('cell', 'Passo trama', 40, 200, 100), P.range('ang', 'Inclinazione righe', -60, 60, 35),
    P.sel('pal', 'Colori', TRAMA_PALETTES.map(x => x.label)), P.sel('shStyle', 'Ombra', ['Tratteggiata', 'Piena', 'Nessuna']), P.range('shadow', 'Profondità ombra', 20, 100, 60),
    P.range('outline', 'Contorno', 0, 100, 50), P.tog('shine', 'Lucido', true), P.tone(1), P.range('grain', 'Grana', 0, 30, 10)],
  render: o => {
    const t = tone(o), S = SS(o), W = o.W, H = o.H
    const pal0 = TRAMA_PALETTES[num(o, 'pal')] ?? TRAMA_PALETTES[0]
    const pal = { ...pal0, ink: visible(o, t, pal0.ink) }
    const f = TYPE_FACES[num(o, 'face')]?.f ?? FACES.condensato
    const shS = num(o, 'shStyle'), sh = shS === 2 ? 0 : S * 0.045 * num(o, 'shadow') / 100
    const lw = Math.max(1.5, S * 0.009 * num(o, 'outline') / 100)
    const m = fittedWord(W, H, lines(str(o, 'text') || 'Artismi'), f, num(o, 'warp'), num(o, 'amt') / 100, { room: sh + lw + S * 0.01, lead: 0.12 })
    const { c, ctx } = stage(o, t)
    const out = distance(invert(m))
    const body = grow(out, m, lw)
    const dx = sh * 0.75, dy = sh
    if (sh > 0) {
      // ombra: il blocco della scritta spostato, pieno o con il bordo e il tratteggio dentro
      extrude(ctx, body, pal.ink, dx, dy)
      if (shS === 0) {
        // l'interno del blocco (tolto il bordo) prende un tratteggio fermo, non trascinato
        const inner = maskToCanvas(grow(out, m, lw * 0.15), '#000')
        const sweep = makeCanvas(W, H), n = Math.ceil(Math.hypot(dx, dy))
        for (let i = n; i >= 1; i--) sweep.ctx.drawImage(inner, (dx * i) / n, (dy * i) / n)
        const h = hatch(W, H, pal.ink, t.bg, Math.max(4, S * 0.0105), Math.max(1.4, S * 0.003))
        const hc = h.getContext('2d')!
        hc.globalCompositeOperation = 'destination-in'; hc.drawImage(sweep.c, 0, 0)
        ctx.drawImage(h, 0, 0)
      }
    }
    ctx.drawImage(maskToCanvas(body, pal.ink), 0, 0)
    const din = distance(m)
    let mx = 0; for (let i = 0; i < din.length; i++) if (din[i] > mx) mx = din[i]
    const step = Math.max(2, mx * 0.34 * num(o, 'cell') / 100)
    ctx.drawImage(tramaFill(m, din, num(o, 'pat'), pal.a, pal.b, step, num(o, 'ang') * Math.PI / 180), 0, 0)
    if (on(o, 'shine')) ctx.drawImage(maskToCanvas(shine(m, din, mx * 0.12, Math.max(1.2, mx * 0.12), mx * 0.5), '#ffffff', 0.9), 0, 0)
    return finish(c, o, t, 'trama', null)
  },
}

// ─── DESIGN TIPOGRAFICO ──────────────────────────────────────────────────────

/** palette da studio: un fondo, un inchiostro, un solo accento */
const DESIGN_PALS: { label: string; bg: string; ink: string; acc: string }[] = [
  { label: 'Crema e inchiostro', bg: '#f1ebe0', ink: '#161412', acc: '#d6371f' },
  { label: 'Bianco ottico', bg: '#f6f6f2', ink: '#0f0f0f', acc: '#2340ff' },
  { label: 'Nero e acido', bg: '#0e0e0e', ink: '#f2f0ea', acc: '#cfff2e' },
  { label: 'Rosso Torino', bg: '#c8231c', ink: '#f6efe4', acc: '#141010' },
  { label: 'Cobalto', bg: '#1d36e8', ink: '#f3efe6', acc: '#ff8a3d' },
  { label: 'Verde bottiglia', bg: '#163b2c', ink: '#efe6cf', acc: '#e9b44c' },
  { label: 'Rosa cipria', bg: '#f2d4d0', ink: '#3a1015', acc: '#c2262e' },
  { label: 'Sabbia', bg: '#d9cbb0', ink: '#2b2219', acc: '#8a2b1c' },
]
const dTone = (o: Job): Tone => { const p = DESIGN_PALS[num(o, 'pal')] ?? DESIGN_PALS[0]; return { id: 'd', label: p.label, bg: p.bg, ink: p.ink, acc: p.acc, dark: luma(p.bg) < 0.45 } }

const PAIRS: { label: string; a: Face; b: Face }[] = [
  { label: 'Grotesk + corsivo', a: FACES.grotesk, b: FACES.corsivo },
  { label: 'Condensato + corsivo', a: FACES.condensato, b: FACES.corsivo },
  { label: 'Bodoni + grotesk', a: FACES.bodoni, b: FACES.grotesk },
  { label: 'Espanso + corsivo', a: FACES.espanso, b: FACES.corsivo },
]
const MICRO: Face = FACES.mono

const lockup: Recipe = {
  id: 'lockup', label: 'Lockup editoriale', cat: 'Design tipografico', hint: 'composizione da locandina su griglia: titolo, corsivo, filetti, dati in mono — pochi colori, molto bianco',
  params: [P.text('Pizza|Party', 'Titolo'), { key: 'sub', label: 'Sottotitolo', type: 'text', def: 'una notte di forno a legna e vinili' },
    { key: 'info', label: 'Informazioni', type: 'text', def: 'Sabato 12.10|Via Po 3, Torino|Dalle 21:00' }, { key: 'num', label: 'Numero', type: 'text', def: '07' },
    P.sel('layout', 'Impaginazione', ['Svizzero', 'Centrato', 'Colonna']), P.sel('pair', 'Caratteri', PAIRS.map(x => x.label)),
    P.sel('pal', 'Colori', DESIGN_PALS.map(x => x.label)), P.sel('mark', 'Segno', ['Nessuno', 'Cerchio pieno', 'Freccia', 'Asterisco']), P.range('grain', 'Grana', 0, 30, 6)],
  render: o => {
    const t = dTone(o), S = SS(o), W = o.W, H = o.H
    const pair = PAIRS[num(o, 'pair')] ?? PAIRS[0]
    const title = lines(str(o, 'text') || 'Artismi'), sub = str(o, 'sub'), info = lines(str(o, 'info')), nr = str(o, 'num')
    const { c, ctx } = stage(o, t)
    const m = Math.round(S * 0.06), ms = S * 0.0155, lw = Math.max(1, S * 0.0016)
    const lay = num(o, 'layout'), mark = num(o, 'mark')
    const top = `${nr ? 'N° ' + nr : ''}`, right = 'Artismi — Torino'
    const drawMark = (x: number, y: number, r: number) => {
      if (mark === 1) { ctx.fillStyle = t.acc; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill() }
      if (mark === 2) arrowNE(ctx, x, y, r * 1.5, Math.max(2, r * 0.16), t.acc)
      if (mark === 3) asterisk(ctx, x, y, r, 3, Math.max(2, r * 0.22), t.acc, Math.PI / 2)
    }
    if (lay === 0) {
      // testata: micro testi e filetto
      baseText(ctx, MICRO, top, ms, m, m + ms, t.ink)
      baseText(ctx, MICRO, right, ms, W - m, m + ms, t.ink, 'right')
      rule(ctx, m, W - m, m + ms * 2, lw, t.ink)
      // piede: filetto e colonne di dati
      const cols = Math.max(1, Math.min(3, info.length)), cw = (W - 2 * m) / cols
      const footTop = H - m - ms * 1.6 * Math.ceil(info.length / cols)
      rule(ctx, m, W - m, footTop - ms * 1.8, lw, t.ink)
      info.forEach((s2, i) => baseText(ctx, MICRO, s2, ms, m + (i % cols) * cw, footTop + ms + Math.floor(i / cols) * ms * 1.6, t.ink))
      // titolo: righe alterne, il tondo a tutta larghezza, il corsivo rientrato a destra
      const avail = { y0: m + ms * 2 + S * 0.05, y1: footTop - ms * 1.8 - S * 0.04 }
      const subSize = S * 0.034
      const subLines = sub ? wrap(pair.b, sub, subSize, (W - 2 * m) * 0.5) : []
      const subH = subLines.length ? subLines.length * subSize * 1.12 + S * 0.03 : 0
      const rows = title.map((s2, i) => {
        const f = i % 2 ? pair.b : pair.a
        const w = (W - 2 * m) * (i % 2 ? 0.8 : 1)
        const sz = sizeForWidth(f, i % 2 ? s2.toLowerCase() : s2, w)
        const k = inkOf(f, i % 2 ? s2.toLowerCase() : s2, sz)
        return { s: i % 2 ? s2.toLowerCase() : s2, f, sz, h: k.asc + k.desc, w }
      })
      const gap = S * 0.012
      let tot = rows.reduce((a, r) => a + r.h, 0) + gap * (rows.length - 1)
      const room = avail.y1 - avail.y0 - subH
      const k = tot > room ? room / tot : 1
      tot *= k
      let y = avail.y0
      let lastRight = 0
      rows.forEach((r, i) => {
        const b = inkText(ctx, r.f, r.s, r.sz * k, i % 2 ? W - m : m, y, t.ink, i % 2 ? 'right' : 'left')
        y += r.h * k + gap * k
        lastRight = b.x + b.w
      })
      void lastRight
      // sottotitolo in corsivo sulla metà destra, sotto al titolo
      subLines.forEach((s2, i) => baseText(ctx, pair.b, s2, subSize, W / 2, y + S * 0.03 + subSize * (0.8 + i * 1.12), t.ink))
      if (mark) drawMark(m + S * 0.022, y + S * 0.03 + subSize * 0.52, S * 0.022)
    } else if (lay === 1) {
      // centrato: cornice sottile doppia, tutto in asse, il titolo in corsivo
      const fr = m * 0.55
      ctx.strokeStyle = t.ink; ctx.lineWidth = lw
      ctx.strokeRect(fr, fr, W - 2 * fr, H - 2 * fr)
      ctx.strokeRect(fr + lw * 4, fr + lw * 4, W - 2 * fr - lw * 8, H - 2 * fr - lw * 8)
      const fT = pair.a === FACES.grotesk || pair.a === FACES.condensato || pair.a === FACES.espanso ? pair.b : pair.a
      const cx = W / 2
      baseText(ctx, MICRO, [top, right].filter(Boolean).join('   ·   '), ms, cx, m + ms * 2.2, t.ink, 'center')
      const rows = title.map(s2 => { const sz = sizeForWidth(fT, s2, W * 0.7); const k2 = inkOf(fT, s2, sz); return { s: s2, sz, h: k2.asc + k2.desc } })
      const gap = S * 0.01
      const subSize = S * 0.03
      const room = H * 0.52
      let tot = rows.reduce((a, r) => a + r.h, 0) + gap * (rows.length - 1)
      const k = tot > room ? room / tot : 1
      tot *= k
      let y = H * 0.47 - tot / 2
      rows.forEach(r => { inkText(ctx, fT, r.s, r.sz * k, cx, y, t.ink, 'center'); y += (r.h + gap) * k })
      // divisorio: filetto con il segno al centro
      const dy = y + S * 0.045
      rule(ctx, cx - S * 0.16, cx - S * 0.03, dy, lw, t.ink); rule(ctx, cx + S * 0.03, cx + S * 0.16, dy, lw, t.ink)
      if (mark) drawMark(cx, dy, S * 0.014); else { ctx.fillStyle = t.acc; ctx.save(); ctx.translate(cx, dy); ctx.rotate(Math.PI / 4); ctx.fillRect(-S * 0.008, -S * 0.008, S * 0.016, S * 0.016); ctx.restore() }
      if (sub) wrap(FACES.grotesk, sub, subSize * 0.62, W * 0.5).forEach((s2, i) => baseText(ctx, FACES.grotesk, s2, subSize * 0.62, cx, dy + S * 0.06 + i * subSize * 0.9, t.ink, 'center', 0.12))
      info.forEach((s2, i) => baseText(ctx, MICRO, s2, ms, cx, H - m - ms * 1.2 - (info.length - 1 - i) * ms * 1.7, t.ink, 'center'))
    } else {
      // colonna: titolo ruotato lungo il bordo sinistro, testi a bandiera a destra
      const f = pair.a, word = title.join(' ')
      const len = H - 2 * m
      let sz = sizeForWidth(f, word, len)
      let k2 = inkOf(f, word, sz)
      const maxThick = W * 0.42
      if (k2.asc + k2.desc > maxThick) { sz *= maxThick / (k2.asc + k2.desc); k2 = inkOf(f, word, sz) }
      const thick = k2.asc + k2.desc
      ctx.save(); ctx.translate(m, H - m); ctx.rotate(-Math.PI / 2)
      inkText(ctx, f, word, sz, 0, 0, t.acc, 'left')
      ctx.restore()
      const x0 = m + thick + S * 0.05, cw = W - m - x0
      baseText(ctx, MICRO, top || '—', ms, x0, m + ms, t.ink)
      baseText(ctx, MICRO, right, ms, W - m, m + ms, t.ink, 'right')
      rule(ctx, x0, W - m, m + ms * 2, lw, t.ink)
      const subSize = Math.min(S * 0.06, sizeForWidth(pair.b, 'una notte di forno', cw))
      const sl = sub ? wrap(pair.b, sub, subSize, cw) : []
      sl.forEach((s2, i) => baseText(ctx, pair.b, s2, subSize, x0, m + ms * 2 + S * 0.06 + subSize * (0.8 + i * 1.08), t.ink))
      rule(ctx, x0, W - m, H - m - ms * 1.7 * info.length - ms * 0.8, lw, t.ink)
      info.forEach((s2, i) => baseText(ctx, MICRO, s2, ms, x0, H - m - (info.length - 1 - i) * ms * 1.7, t.ink))
      // il numero grande chiude la colonna, appoggiato al filetto del piede
      const footRule = H - m - ms * 1.7 * info.length - ms * 0.8
      if (nr) {
        const nf = pair.b, nsz = Math.min(sizeForWidth(nf, nr, cw * 0.62), (footRule - m) * 0.4)
        const nk = inkOf(nf, nr, nsz)
        inkText(ctx, nf, nr, nsz, W - m, footRule - S * 0.03 - nk.asc - nk.desc, t.ink, 'right')
      }
      if (mark) drawMark(x0 + S * 0.03, footRule - S * 0.06, S * 0.03)
    }
    return finish(c, o, t, 'lockup', null)
  },
}

/** testata e piede in micro testo, comuni alle tavole tipografiche */
function microFrame(ctx: Ctx, o: Job, t: Tone, m: number, info: string[], nr: string) {
  const S = SS(o), W = o.W, H = o.H, ms = S * 0.0155
  baseText(ctx, MICRO, nr ? 'N° ' + nr : '—', ms, m, m + ms, t.ink)
  baseText(ctx, MICRO, 'Artismi — Torino', ms, W - m, m + ms, t.ink, 'right')
  const cols = Math.max(1, Math.min(3, info.length)), cw = (W - 2 * m) / cols
  const rows = Math.ceil(info.length / cols)
  info.forEach((s2, i) => {
    const c2 = i % cols, al: CanvasTextAlign = cols === 1 ? 'left' : c2 === 0 ? 'left' : c2 === cols - 1 ? 'right' : 'center'
    const x = al === 'left' ? m + c2 * cw : al === 'right' ? W - m : m + cw * (c2 + 0.5)
    baseText(ctx, MICRO, s2, ms, x, H - m - (rows - 1 - Math.floor(i / cols)) * ms * 1.6, t.ink, al)
  })
  return { top: m + ms * 2, bottom: H - m - rows * ms * 1.6 - ms * 0.4 }
}

/** riga resa a una risoluzione che regge lo stiramento, poi stesa nel riquadro */
function stretchLine(f: Face, s: string, w: number, h: number, color: string) {
  const sw = sizeForWidth(f, s, w), k = inkOf(f, s, sw), sh = sw * h / Math.max(1, k.asc + k.desc)
  return inkCanvas(f, s, Math.min(Math.max(sw, sh), 1600), color)
}

const TENSION_FACES: { label: string; f: Face }[] = [
  { label: 'Condensato', f: FACES.condensato }, { label: 'Grotesk', f: FACES.grotesk }, { label: 'Espanso', f: FACES.espanso }, { label: 'Bodoni corsivo', f: FACES.bodoni },
]

const tensione: Recipe = {
  id: 'tensione', label: 'Tipo sotto tensione', cat: 'Design tipografico', hint: 'lettere fuori scala: righe stirate fino a riempire il foglio, crescendo, onda di altezze, parola tagliata dal formato',
  params: [P.text('Pizza|Party|Torino', 'Testo'), { key: 'info', label: 'Informazioni', type: 'text', def: 'Sabato 12.10|Via Po 3|Dalle 21:00' }, { key: 'num', label: 'Numero', type: 'text', def: '07' },
    P.sel('mode', 'Gesto', ['Riempi', 'Crescendo', 'Onda di altezze', 'Taglio']), P.sel('face', 'Carattere', TENSION_FACES.map(x => x.label)),
    P.sel('pal', 'Colori', DESIGN_PALS.map(x => x.label), 1), P.sel('accent', 'Accento', ['Nessuno', 'Una riga', 'Prima lettera']),
    P.range('wave', 'Onde', 1, 4, 2), P.range('depth', 'Escursione', 10, 60, 45), P.tog('bleed', 'Al vivo', false), P.range('grain', 'Grana', 0, 30, 6)],
  render: o => {
    const t = dTone(o), S = SS(o), W = o.W, H = o.H
    const f = TENSION_FACES[num(o, 'face')]?.f ?? FACES.condensato
    const words = lines(str(o, 'text') || 'Artismi'), info = lines(str(o, 'info'))
    const { c, ctx } = stage(o, t)
    const m = Math.round(S * 0.06)
    const fr = microFrame(ctx, o, t, m, info, str(o, 'num'))
    const bleed = on(o, 'bleed'), x0 = bleed ? 0 : m, x1 = bleed ? W : W - m
    const y0 = fr.top + S * 0.03, y1 = fr.bottom - S * 0.03
    const gap = S * 0.008, mode = num(o, 'mode'), acc = num(o, 'accent')
    const colOf = (i: number) => (acc === 1 && i === (words.length > 1 ? 1 : 0) ? t.acc : t.ink)
    const put = (src: HTMLCanvasElement, x: number, y: number, w: number, h: number, i: number) => {
      ctx.drawImage(src, x, y, w, h)
      if (acc === 2 && i === 0) {
        // prima lettera nel colore d'accento: si ridisegna solo la sua fetta
        const s0 = words[0], k0 = inkOf(f, s0, 100), k1 = inkOf(f, s0.slice(0, 1), 100)
        const frac = Math.min(1, (k1.w + (k0.l - k1.l)) / k0.w + 0.01)
        const tint = makeCanvas(src.width, src.height)
        tint.ctx.drawImage(src, 0, 0); tint.ctx.globalCompositeOperation = 'source-in'; tint.ctx.fillStyle = t.acc; tint.ctx.fillRect(0, 0, src.width * frac, src.height)
        tint.ctx.globalCompositeOperation = 'destination-in'; tint.ctx.fillRect(0, 0, src.width * frac, src.height)
        ctx.drawImage(tint.c, x, y, w, h)
      }
    }
    if (mode === 3) {
      // taglio: la prima parola alta quanto il foglio utile, esce dal bordo destro;
      // le altre parole stanno in una riga di corsivo sotto, nel loro spazio
      const rest = words.slice(1).join(' ')
      const rs = S * 0.052, band = rest ? rs * 1.6 : 0
      const s0 = words[0], hh = y1 - y0 - band
      const sz = sizeForWidth(f, s0, 100), k = inkOf(f, s0, sz)
      const scale = hh / (k.asc + k.desc)
      const src = inkCanvas(f, s0, Math.min(sz * scale, 1800), colOf(0))
      put(src, x0, y0, (k.w * scale), hh, 0)
      if (rest) baseText(ctx, FACES.corsivo, rest, rs, m, y1, acc === 1 ? t.acc : t.ink)
    } else {
      const n = words.length
      const weights = words.map((_, i) => (mode === 1 ? Math.pow(1.75, i) : 1))
      const wsum = weights.reduce((a, b) => a + b, 0)
      const hh = y1 - y0 - gap * (n - 1)
      let y = y0
      words.forEach((s2, i) => {
        const h = hh * weights[i] / wsum, w = x1 - x0
        const src = stretchLine(f, s2, w, h, colOf(i))
        if (mode !== 2) put(src, x0, y, w, h, i)
        else {
          // onda di altezze: la riga a fette verticali, ognuna alta quanto dice l'onda, appoggiate alla base
          const N = 240, waves = num(o, 'wave'), dep = num(o, 'depth') / 100
          for (let j = 0; j < N; j++) {
            const u = (j + 0.5) / N
            const k = 1 - dep * (0.5 + 0.5 * Math.cos((u * waves + i * 0.5) * Math.PI * 2))
            const sx = (j / N) * src.width, sw = src.width / N + 0.6
            ctx.drawImage(src, sx, 0, sw, src.height, x0 + (j / N) * w, y + h - h * k, w / N + 0.6, h * k)
          }
        }
        y += h + gap
      })
    }
    return finish(c, o, t, 'tensione', null)
  },
}

const KINETIC_FACES: { label: string; f: Face }[] = [
  { label: 'Grotesk', f: FACES.grotesk }, { label: 'Condensato', f: FACES.condensato }, { label: 'Espanso', f: FACES.espanso }, { label: 'Mono', f: { ...FACES.mono, weight: 500, track: 0.02 } },
]

const cinetico: Recipe = {
  id: 'cinetico', label: 'Sistema cinetico', cat: 'Design tipografico', hint: 'la parola su una griglia che si deforma con una regola sola: cilindro, fisarmonica, prospettiva, raggiera, onda',
  params: [P.text('Pizza Party', 'Parola'), { key: 'info', label: 'Informazioni', type: 'text', def: 'Sabato 12.10|Via Po 3|Dalle 21:00' }, { key: 'num', label: 'Numero', type: 'text', def: '07' },
    P.sel('mode', 'Regola', ['Cilindro', 'Fisarmonica', 'Prospettiva', 'Raggiera', 'Onda']), P.sel('face', 'Carattere', KINETIC_FACES.map(x => x.label)),
    P.range('rows', 'Righe', 4, 28, 12), P.range('twist', 'Torsione', 0, 100, 40), P.range('waves', 'Onde', 1, 4, 1),
    P.sel('pal', 'Colori', DESIGN_PALS.map(x => x.label), 2), P.tog('accent', 'Una riga in accento', true), P.range('grain', 'Grana', 0, 30, 6)],
  render: o => {
    const t = dTone(o), S = SS(o), W = o.W, H = o.H
    const f = KINETIC_FACES[num(o, 'face')]?.f ?? FACES.grotesk
    const word = (str(o, 'text') || 'Artismi').replace(/\|/g, ' ')
    const { c, ctx } = stage(o, t)
    const m = Math.round(S * 0.06)
    const fr = microFrame(ctx, o, t, m, lines(str(o, 'info')), str(o, 'num'))
    const x0 = m, x1 = W - m, y0 = fr.top + S * 0.04, y1 = fr.bottom - S * 0.04
    const aw = x1 - x0, ah = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    const mode = num(o, 'mode'), N = num(o, 'rows'), tw = num(o, 'twist') / 100, waves = num(o, 'waves')
    const accRow = on(o, 'accent') ? Math.floor(N / 2) : -1
    const col = (r: number) => (r === accRow ? t.acc : t.ink)
    const capK = capH(f, 100) / 100
    const glyphs = (s2: string, size: number) => { ctx.font = fontCss(f, size); return [...up(f, s2)].map(ch => ({ ch, w: ctx.measureText(ch).width })) }
    if (mode === 0) {
      // cilindro: la frase gira attorno a un tubo; davanti piena, dietro in trasparenza e specchiata
      const rh = ah / N, size = rh * 0.78 / capK, R = aw / 2
      const g = glyphs(word + '  ·  ', size)
      const one = g.reduce((a, b) => a + b.w, 0)
      const C = Math.PI * 2 * R, reps = Math.max(1, Math.round(C / one)), sc = C / (reps * one)
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.font = fontCss(f, size)
      for (let r = 0; r < N; r++) {
        const base = y0 + rh * (r + 0.5) + size * capK / 2, phase = r * tw * 0.35
        let acc = 0
        for (let k = 0; k < reps; k++) for (const q of g) {
          const th = phase + (acc + q.w / 2) * sc / R
          acc += q.w
          const cs = Math.cos(th)
          if (Math.abs(cs) < 0.03) continue
          ctx.save(); ctx.globalAlpha = cs > 0 ? 1 : 0.14
          ctx.fillStyle = col(r); ctx.translate(cx + Math.sin(th) * R, base); ctx.scale(cs * sc, 1); ctx.fillText(q.ch, 0, 0); ctx.restore()
        }
      }
    } else if (mode === 1 || mode === 2) {
      // fisarmonica: ogni riga si stringe e si allarga col coseno; prospettiva: righe che rimpiccioliscono verso l'alto
      const gap = ah * 0.012
      const q = 1 - 0.07 * (0.3 + tw)
      const hs = Array.from({ length: N }, (_, r) => (mode === 2 ? Math.pow(q, N - 1 - r) : 1))
      const hsum = hs.reduce((a, b) => a + b, 0)
      let y = y0
      for (let r = 0; r < N; r++) {
        const h = (ah - gap * (N - 1)) * hs[r] / hsum
        const sx = mode === 1 ? 0.12 + 0.88 * (0.5 + 0.5 * Math.cos(((r / Math.max(1, N - 1)) * waves + tw * 0.5) * Math.PI * 2)) : hs[r]
        const w = aw * sx
        const src = stretchLine(f, word, aw, h, col(r))
        ctx.drawImage(src, cx - w / 2, y, w, h)
        y += h + gap
      }
    } else if (mode === 3) {
      // raggiera: la parola ripetuta sui raggi, dal piccolo cerchio vuoto al bordo
      const R1 = Math.min(aw, ah) / 2, R0 = R1 * (0.16 + tw * 0.2)
      const size = sizeForWidth(f, word, R1 - R0)
      const cap = capH(f, size)
      const n = Math.max(6, Math.min(N * 2, Math.floor((Math.PI * 2 * R0) / (cap * 1.25))))
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a)
        inkText(ctx, f, word, size, R0, -cap / 2, i === 0 && accRow >= 0 ? t.acc : t.ink, 'left')
        ctx.restore()
      }
    } else {
      // onda: lettere a passo costante, ogni riga sfasata, ogni lettera ruotata sulla tangente
      const rh = ah / N, size = Math.min(rh * 0.7 / capK, sizeForWidth(f, word, aw * 0.92))
      const g = glyphs(word, size), tot = g.reduce((a, b) => a + b.w, 0)
      const A = rh * (0.3 + tw * 0.6), k = (waves * Math.PI * 2) / aw
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.font = fontCss(f, size)
      for (let r = 0; r < N; r++) {
        const base = y0 + rh * (r + 0.5) + size * capK / 2, ph = r * 0.45
        let x = cx - tot / 2
        for (const q2 of g) {
          const xm = x + q2.w / 2, yy = base + Math.sin(xm * k + ph) * A * 0.5, ang = Math.atan(Math.cos(xm * k + ph) * A * 0.5 * k)
          ctx.save(); ctx.fillStyle = col(r); ctx.translate(xm, yy); ctx.rotate(ang); ctx.fillText(q2.ch, 0, 0); ctx.restore()
          x += q2.w
        }
      }
    }
    return finish(c, o, t, 'cinetico', null)
  },
}

/** un altro generatore reso come pezzo scontornato, con i parametri forzati */
function piece(rc: Recipe, o: Job, size: number, over: RValues = {}, seed = o.seed) {
  return rc.render({ W: Math.round(size), H: Math.round(size), p: { ...defaults(rc), ...over, grain: 0 }, seed, transparent: true })
}

/** ricolora un pezzo piatto (mantiene l'alfa) */
function tint(src: HTMLCanvasElement, color: string) {
  const k = makeCanvas(src.width, src.height)
  k.ctx.drawImage(src, 0, 0); k.ctx.globalCompositeOperation = 'source-in'; k.ctx.fillStyle = color; k.ctx.fillRect(0, 0, src.width, src.height)
  return k.c
}

/**
 * Rimappa un pezzo sui colori della tavola: la luminosità di ogni pixel sceglie
 * il colore lungo una scala (scuri → medi → chiari). Rilievo, lucido, usura e
 * trama restano; cambia solo la tavolozza, che diventa quella della pagina.
 */
function gradientMap(src: HTMLCanvasElement, stops: string[]) {
  const k = makeCanvas(src.width, src.height)
  k.ctx.drawImage(src, 0, 0)
  const d = k.ctx.getImageData(0, 0, src.width, src.height), p = d.data
  const cols = stops.map(hexRgb), n = cols.length - 1
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue
    const l = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) / 255
    const f = Math.min(n - 1e-6, l * n), j = Math.floor(f), u = f - j, a = cols[j], b = cols[j + 1]
    p[i] = a[0] + (b[0] - a[0]) * u; p[i + 1] = a[1] + (b[1] - a[1]) * u; p[i + 2] = a[2] + (b[2] - a[2]) * u
  }
  k.ctx.putImageData(d, 0, 0)
  return k.c
}

/** disegna un pezzo dentro un riquadro, centrato, senza deformarlo */
function placeIn(ctx: Ctx, src: HTMLCanvasElement, x: number, y: number, w: number, h: number, align: 'center' | 'bottom' = 'center') {
  const k = Math.min(w / src.width, h / src.height), dw = src.width * k, dh = src.height * k
  ctx.drawImage(src, x + (w - dw) / 2, align === 'bottom' ? y + h - dh : y + (h - dh) / 2, dw, dh)
  return { x: x + (w - dw) / 2, y: align === 'bottom' ? y + h - dh : y + (h - dh) / 2, w: dw, h: dh }
}

const HEROES: { label: string; rc: () => Recipe; flat: boolean; over?: RValues }[] = [
  { label: 'Crescita aliena', rc: () => alieno, flat: false },
  { label: 'Membrana', rc: () => membrana, flat: false },
  { label: 'Macchia simmetrica', rc: () => macchia, flat: true },
  { label: 'Simbolo', rc: () => simbolo, flat: true },
  { label: 'Rete neurale', rc: () => rete, flat: true },
  { label: 'Costellazione', rc: () => costellazione, flat: true },
  { label: 'Rametto', rc: () => rametto, flat: true },
  { label: 'Goccia', rc: () => goccia, flat: true },
  { label: 'Tattoo flash', rc: () => tattoo, flat: false, over: { banner: '' } },
]
const HERO_MATS = [{ label: 'Originale', v: -1 }, { label: 'Cromo', v: 1 }, { label: 'Nero lucido', v: 2 }, { label: 'Oro', v: 3 }, { label: 'Iridescente', v: 4 }, { label: 'Perla', v: 6 }]

const STAMPS: { label: string; rc: () => Recipe; over: (o: Job) => RValues }[] = [
  { label: 'Nessuno', rc: () => timbro, over: () => ({}) },
  { label: 'Timbro', rc: () => timbro, over: o => ({ text: str(o, 'stamp') || 'Ingresso libero', top: 'Artismi Design Studio', bottom: 'Torino', angle: 0 }) },
  { label: 'Adesivo', rc: () => adesivo, over: o => ({ kind: 3, text: str(o, 'stamp') || 'Ingresso libero', angle: 0 }) },
  { label: 'Ceralacca', rc: () => ceralacca, over: () => ({}) },
  { label: 'Toppa ricamata', rc: () => toppa, over: o => ({ text: 'Artismi', sub: str(o, 'stamp') || 'Torino' }) },
  { label: 'Francobollo', rc: () => francobollo, over: () => ({ angle: 0 }) },
  { label: 'Sigillo quadrato', rc: () => hanko, over: () => ({}) },
]

const locandina: Recipe = {
  id: 'locandina', label: 'Locandina con elemento', cat: 'Design tipografico', hint: 'impaginazione pulita con un elemento dei generatori come protagonista e un timbro, adesivo o ceralacca nell\'angolo',
  params: [P.text('Pizza|Party', 'Titolo'), { key: 'sub', label: 'Sottotitolo', type: 'text', def: 'una notte di forno a legna e vinili' },
    { key: 'info', label: 'Informazioni', type: 'text', def: 'Sabato 12.10|Via Po 3, Torino|Dalle 21:00' }, { key: 'num', label: 'Numero', type: 'text', def: '07' },
    P.sel('layout', 'Impaginazione', ['Protagonista', 'Tipo dietro, elemento davanti', 'Copertina', 'Lockup e timbro']),
    P.sel('hero', 'Elemento', HEROES.map(x => x.label)), P.sel('heroMat', 'Materia elemento', HERO_MATS.map(x => x.label)),
    P.sel('stampKind', 'Nell\'angolo', STAMPS.map(x => x.label), 1), { key: 'stamp', label: 'Scritta del timbro', type: 'text', def: 'Ingresso libero' },
    P.tog('harmony', 'Timbro nei colori della pagina', true), P.sel('corner', 'Angolo', ['Dove c\'è spazio', 'Basso a destra', 'Alto a destra', 'Basso a sinistra', 'Alto a sinistra']),
    P.sel('pair', 'Caratteri', PAIRS.map(x => x.label)), P.sel('pal', 'Colori', DESIGN_PALS.map(x => x.label)), P.range('grain', 'Grana', 0, 30, 8)],
  render: o => {
    const t = dTone(o), S = SS(o), W = o.W, H = o.H
    const pair = PAIRS[num(o, 'pair')] ?? PAIRS[0]
    const lay = num(o, 'layout'), m = Math.round(S * 0.06)
    const title = lines(str(o, 'text') || 'Artismi'), sub = str(o, 'sub'), info = lines(str(o, 'info'))
    const hero = HEROES[num(o, 'hero')] ?? HEROES[0]
    const mat = HERO_MATS[num(o, 'heroMat')]?.v ?? -1
    const heroCanvas = (size: number) => {
      const over: RValues = { ...(hero.over ?? {}), ...(mat >= 0 && !hero.flat ? { mat } : {}) }
      const src = piece(hero.rc(), o, size, over)
      return hero.flat ? tint(src, lay === 1 ? t.acc : t.ink) : src
    }
    let c: HTMLCanvasElement, ctx: Ctx
    if (lay === 3) {
      // il lockup svizzero così com'è, poi il timbro appoggiato sopra
      c = lockup.render({ ...o, p: { ...defaults(lockup), ...o.p, layout: 0, mark: 0, grain: 0 } }); ctx = c.getContext('2d')!
    } else if (lay === 1) {
      // il tipo stirato fa da fondo, l'elemento ci sta davanti con la sua ombra
      c = tensione.render({ ...o, p: { ...defaults(tensione), text: str(o, 'text'), info: str(o, 'info'), num: str(o, 'num'), pal: num(o, 'pal'), mode: 0, face: 0, grain: 0 } })
      ctx = c.getContext('2d')!
      const h = heroCanvas(S * 0.9)
      const box = { x: W * 0.12, y: H * 0.14, w: W * 0.76, h: H * 0.7 }
      const k = Math.min(box.w / h.width, box.h / h.height)
      ctx.save(); ctx.globalAlpha = 0.35; ctx.filter = `blur(${S * 0.012}px)`
      ctx.drawImage(tint(h, '#000000'), box.x + (box.w - h.width * k) / 2 + S * 0.01, box.y + (box.h - h.height * k) / 2 + S * 0.02, h.width * k, h.height * k)
      ctx.restore()
      placeIn(ctx, h, box.x, box.y, box.w, box.h)
    } else {
      ;({ c, ctx } = stage(o, t))
      const fr = microFrame(ctx, o, t, m, info, str(o, 'num'))
      const lw = Math.max(1, S * 0.0016)
      if (lay === 0) {
        // protagonista: l'elemento occupa il centro, il titolo chiude in basso a tutta larghezza
        const rows = title.map((s2, i) => { const f = i % 2 ? pair.b : pair.a, w = (W - 2 * m) * (i % 2 ? 0.7 : 1), ss = i % 2 ? s2.toLowerCase() : s2; const sz = sizeForWidth(f, ss, w); const k = inkOf(f, ss, sz); return { f, s: ss, sz, h: k.asc + k.desc, right: i % 2 === 1 } })
        const gap = S * 0.01, maxT = H * 0.3
        let tot = rows.reduce((a, r) => a + r.h, 0) + gap * (rows.length - 1)
        const k = tot > maxT ? maxT / tot : 1
        tot *= k
        rule(ctx, m, W - m, fr.bottom - S * 0.012, lw, t.ink)
        let y = fr.bottom - S * 0.04 - tot
        const tTop = y
        rows.forEach(r => { inkText(ctx, r.f, r.s, r.sz * k, r.right ? W - m : m, y, t.ink, r.right ? 'right' : 'left'); y += (r.h + gap) * k })
        rule(ctx, m, W - m, fr.top + S * 0.012, lw, t.ink)
        // tavola da catalogo: l'elemento poggia su un filetto subito sopra il titolo,
        // chiuso da crocini di taglio, con la sua didascalia sotto il filetto
        const ms = S * 0.0145
        const ground = tTop - S * 0.045, top = fr.top + S * 0.05 + (sub ? S * 0.045 : 0)
        if (sub) baseText(ctx, pair.b, sub, S * 0.026, m, fr.top + S * 0.05, t.ink)
        const hb = placeIn(ctx, heroCanvas(S * 0.9), m + S * 0.04, top, W - 2 * m - S * 0.08, ground - top, 'bottom')
        rule(ctx, m, W - m, ground, lw, t.ink)
        baseText(ctx, MICRO, `Fig. ${str(o, 'num') || '01'} — ${hero.label}`, ms, m, ground + ms * 1.6, t.ink)
        baseText(ctx, MICRO, `${Math.round(hb.w / S * 100)} × ${Math.round(hb.h / S * 100)}`, ms, W - m, ground + ms * 1.6, t.ink, 'right')
        // crocini agli angoli del riquadro dell'elemento
        const pad = S * 0.02, cl = S * 0.022
        ctx.save(); ctx.strokeStyle = t.ink; ctx.lineWidth = lw; ctx.beginPath()
        for (const [x, y, sx, sy] of [[hb.x - pad, hb.y - pad, 1, 1], [hb.x + hb.w + pad, hb.y - pad, -1, 1]] as const) {
          ctx.moveTo(x, y + sy * cl); ctx.lineTo(x, y); ctx.lineTo(x + sx * cl, y)
        }
        // asse verticale tratteggiato dal crocino alto fino al filetto: tiene l'elemento in squadra
        ctx.stroke(); ctx.setLineDash([lw * 3, lw * 4]); ctx.beginPath(); ctx.moveTo(hb.x + hb.w / 2, hb.y - pad - cl); ctx.lineTo(hb.x + hb.w / 2, hb.y - pad * 0.3); ctx.stroke(); ctx.restore()
      } else {
        // copertina: l'elemento chiuso in un riquadro a filetto, il titolo sotto in asse
        const bx = m, by = fr.top + S * 0.03, bw = W - 2 * m, bh = (fr.bottom - by) * 0.64
        ctx.strokeStyle = t.ink; ctx.lineWidth = lw; ctx.strokeRect(bx, by, bw, bh)
        baseText(ctx, MICRO, 'Fig. ' + (str(o, 'num') || '01'), S * 0.0145, bx + S * 0.02, by + bh - S * 0.02, t.ink)
        placeIn(ctx, heroCanvas(S * 0.9), bx + bw * 0.08, by + bh * 0.07, bw * 0.84, bh * 0.86)
        // in copertina il titolo va nel carattere più "da libro" della coppia
        const fT = pair.a.italic ? pair.a : pair.b
        const rows = title.map(s2 => { const sz = sizeForWidth(fT, s2, W * 0.8); const k2 = inkOf(fT, s2, sz); return { s: s2, sz, h: k2.asc + k2.desc } })
        const room = fr.bottom - (by + bh) - S * 0.1
        let tot = rows.reduce((a, r) => a + r.h, 0) + S * 0.008 * (rows.length - 1)
        const k = tot > room ? room / tot : 1
        tot *= k
        let y = by + bh + S * 0.05
        rows.forEach(r => { inkText(ctx, fT, r.s, r.sz * k, W / 2, y, t.ink, 'center'); y += (r.h + S * 0.008) * k })
        if (sub) baseText(ctx, FACES.grotesk, sub, S * 0.017, W / 2, y + S * 0.035, t.ink, 'center', 0.12)
      }
    }
    // l'oggetto nell'angolo, un po' storto e a cavallo del margine, come appoggiato a mano
    const st = STAMPS[num(o, 'stampKind')] ?? STAMPS[0]
    if (num(o, 'stampKind') > 0) {
      const r = rng(o.seed ^ 0x5a17)
      let src = piece(st.rc(), o, S * 0.7, st.over(o))
      if (on(o, 'harmony')) {
        // scala della pagina: su carta chiara inchiostro → accento → carta; su fondo scuro fondo → accento → inchiostro chiaro
        const paper = t.dark ? t.ink : '#fffaf1'
        src = gradientMap(src, t.dark ? [darken(t.bg, 0.3), t.acc, paper] : [t.ink, t.acc, paper])
      }
      const size = S * 0.27, corner = num(o, 'corner')
      // posti possibili: i quattro angoli a cavallo del margine e qualche punto lungo i bordi
      const L = m + size * 0.42, R = W - m - size * 0.42, T = m + size * 0.55, B = H - m - size * 0.62
      const spots: [number, number][] = corner ? [[[R, B], [R, T], [L, B], [L, T]][corner - 1] as [number, number]]
        : [[R, B], [R, T], [L, B], [L, T], [R, H * 0.5], [L, H * 0.5], [W * 0.5, B], [R, H * 0.33], [R, H * 0.68], [L, H * 0.68]]
      // si sceglie quello che copre meno inchiostro già stampato (a pari merito, il primo)
      const img = ctx.getImageData(0, 0, W, H).data, [br, bg2, bb] = hexRgb(t.bg)
      const cover = ([x, y]: [number, number]) => {
        let n = 0, hit = 0
        const rr = size * 0.46, st = Math.max(2, Math.round(size / 40))
        for (let yy = Math.max(0, Math.round(y - rr)); yy < Math.min(H, y + rr); yy += st) for (let xx = Math.max(0, Math.round(x - rr)); xx < Math.min(W, x + rr); xx += st) {
          if ((xx - x) ** 2 + (yy - y) ** 2 > rr * rr) continue
          const i = (yy * W + xx) * 4
          n++; if (Math.abs(img[i] - br) + Math.abs(img[i + 1] - bg2) + Math.abs(img[i + 2] - bb) > 60) hit++
        }
        return n ? hit / n : 1
      }
      let best = spots[0], bestS = Infinity
      spots.forEach((p2, i) => { const sc = cover(p2) + i * 0.004; if (sc < bestS) { bestS = sc; best = p2 } })
      const [cx, cy] = best
      ctx.save(); ctx.translate(cx, cy); ctx.rotate((r() - 0.5) * 0.5)
      const k = size / Math.max(src.width, src.height)
      ctx.drawImage(src, -src.width * k / 2, -src.height * k / 2, src.width * k, src.height * k)
      ctx.restore()
    }
    return finish(c, o, t, 'locandina', null)
  },
}

const SCENE_HEROES: { label: string; rc: () => Recipe; over?: (o: Job) => RValues }[] = [
  { label: 'Crescita aliena', rc: () => alieno },
  { label: 'Sigillo cyber', rc: () => sigillo },
  { label: 'Membrana', rc: () => membrana },
  { label: 'Falce gotica', rc: () => falce },
  { label: 'Rete neurale', rc: () => rete },
  { label: 'Corona di spine', rc: () => corona, over: () => ({ text: '' }) },
  { label: 'Simbolo', rc: () => simbolo },
  { label: 'Scritta cromata', rc: () => cromo, over: o => ({ text: (lines(str(o, 'text'))[0] ?? 'Artismi'), sparks: false }) },
]
const SCENE_MATS = [{ label: 'Cromo', v: 1 }, { label: 'Nero lucido', v: 2 }, { label: 'Oro', v: 3 }, { label: 'Iridescente', v: 4 }, { label: 'Perla', v: 6 }, { label: 'Gel', v: 5 }]

const scena: Recipe = {
  id: 'scena', label: 'Scena cinematografica', cat: 'Design tipografico', hint: 'locandina da film: l\'elemento in scena con luce, fasci, nebbia, riflesso; titolo e crediti; bloom, viraggio, grana',
  params: [P.text('Techno|Night', 'Titolo'), { key: 'sub', label: 'Frase di lancio', type: 'text', def: 'Una notte sola. Nessuna replica.' },
    { key: 'info', label: 'Informazioni', type: 'text', def: 'Sabato 12.10|Via Po 3, Torino|Dalle 23:00' },
    P.sel('hero', 'Elemento', SCENE_HEROES.map(x => x.label)), P.sel('mat', 'Materia', SCENE_MATS.map(x => x.label)),
    P.sel('shot', 'Inquadratura', ['Centrale', 'Dal basso', 'Laterale']), P.sel('grade', 'Luce e viraggio', GRADES.map(x => x.label)),
    P.sel('back', 'Titolo dietro', ['Pieno tenue', 'Contorno', 'Nessuno']),
    P.range('beams', 'Fasci di luce', 0, 100, 55), P.range('fog', 'Nebbia', 0, 100, 55), P.range('bloom', 'Bagliore', 0, 100, 45),
    P.range('aberr', 'Aberrazione', 0, 100, 35), P.range('grain', 'Grana pellicola', 0, 100, 40)],
  render: o => {
    const g = GRADES[num(o, 'grade')] ?? GRADES[0], S = SS(o), W = o.W, H = o.H
    const shot = num(o, 'shot'), title = lines(str(o, 'text') || 'Artismi'), sub = str(o, 'sub'), info = lines(str(o, 'info'))
    const t: Tone = { id: 'cine', label: g.label, bg: g.bg, ink: g.ink, acc: g.glow, dark: g.dark }
    const { c, ctx } = stage({ ...o, transparent: false }, t)
    const m = Math.round(S * 0.06)
    const horizon = H * (shot === 1 ? 0.8 : 0.7)
    const spotX = shot === 2 ? W * 0.66 : W / 2
    backdrop(ctx, W, H, g, horizon, { x: spotX, y: H * 0.02, r: H * 0.8 })
    beams(ctx, W, H, g, spotX, -H * 0.04, 7, o.seed, num(o, 'beams') / 100)
    // titolo dietro: enorme, tenue, un filo sfocato (è lontano)
    const back = num(o, 'back')
    if (back < 2) {
      const word = title.join(' '), f = FACES.condensato
      const bw = W - 2 * m * 0.6, bh = (horizon - H * 0.12) * 0.62
      const src = stretchLine(f, word, bw, bh, g.ink)
      const k = makeCanvas(W, H)
      k.ctx.drawImage(src, (W - bw) / 2, H * 0.11, bw, bh)
      if (back === 1) {
        // solo contorno: si toglie l'interno eroso
        const kd = k.ctx.getImageData(0, 0, W, H).data, m2 = newMask(W, H)
        for (let i = 0; i < m2.a.length; i++) m2.a[i] = kd[i * 4 + 3]
        const d = distance(m2)
        const edge = newMask(W, H); for (let i = 0; i < d.length; i++) edge.a[i] = m2.a[i] && d[i] < S * 0.0022 ? 255 : 0
        k.ctx.clearRect(0, 0, W, H); k.ctx.drawImage(maskToCanvas(edge, g.ink), 0, 0)
      }
      // si spegne verso il basso, dove comincia la nebbia
      const fade = k.ctx.createLinearGradient(0, H * 0.11, 0, H * 0.11 + bh)
      fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0.15)')
      k.ctx.globalCompositeOperation = 'destination-in'; k.ctx.fillStyle = fade; k.ctx.fillRect(0, 0, W, H)
      ctx.save(); ctx.globalAlpha = back === 1 ? 0.55 : g.dark ? 0.13 : 0.1; ctx.filter = `blur(${S * 0.0018}px)`; ctx.drawImage(k.c, 0, 0); ctx.restore()
    }
    // l'elemento: reso grande, col piede sfumato nella nebbia
    const hero = SCENE_HEROES[num(o, 'hero')] ?? SCENE_HEROES[0]
    const mat = SCENE_MATS[num(o, 'mat')]?.v ?? 1
    let src = piece(hero.rc(), o, S * 1.1, { ...(hero.over?.(o) ?? {}), mat, tone: g.dark ? 0 : 1, glow: false, caps: false })
    src = fadeFoot(src, 0.86, 1)
    const box = shot === 0 ? { x: W * 0.1, y: H * 0.13, w: W * 0.8, h: horizon - H * 0.13 + S * 0.02 }
      : shot === 1 ? { x: -W * 0.02, y: H * 0.08, w: W * 1.04, h: horizon - H * 0.08 + S * 0.05 }
      : { x: W * 0.3, y: H * 0.12, w: W * 0.64, h: horizon - H * 0.12 + S * 0.02 }
    const kk = Math.min(box.w / src.width, box.h / src.height), dw = src.width * kk, dh = src.height * kk
    const hx = box.x + (box.w - dw) / 2, hy = box.y + box.h - dh
    // ombra di contatto e controluce
    ctx.save(); ctx.translate(hx + dw / 2, horizon + S * 0.01); ctx.scale(1, 0.12)
    const cs = ctx.createRadialGradient(0, 0, 0, 0, 0, dw * 0.45); cs.addColorStop(0, 'rgba(0,0,0,0.55)'); cs.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = cs; ctx.fillRect(-W, -H * 4, W * 2, H * 8); ctx.restore()
    backGlow(ctx, src, hx, hy, dw, dh, g.glow, S * 0.06, g.dark ? 0.75 : 0.35, g.dark ? 'screen' : 'soft-light')
    backGlow(ctx, src, hx, hy, dw, dh, g.light, S * 0.015, g.dark ? 0.35 : 0.2, g.dark ? 'screen' : 'soft-light')
    reflection(ctx, src, hx, horizon + S * 0.005, dw, dh, g.dark ? 0.32 : 0.22, S * 0.004)
    ctx.drawImage(src, hx, hy, dw, dh)
    // nebbia bassa che attraversa il piede e il pavimento
    const fog = num(o, 'fog') / 100
    if (fog > 0) {
      const fk = makeCanvas(W, H), r2 = rng(o.seed ^ 0xf06)
      for (let i = 0; i < 14; i++) {
        const y = horizon + (r2() - 0.55) * H * 0.1, x = r2() * W, rx = W * (0.25 + r2() * 0.35), ry = H * (0.02 + r2() * 0.035)
        fk.ctx.save(); fk.ctx.translate(x, y); fk.ctx.scale(1, ry / rx)
        const gr = fk.ctx.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, rgba(g.light, 0.22 * fog)); gr.addColorStop(1, rgba(g.light, 0))
        fk.ctx.fillStyle = gr; fk.ctx.fillRect(-rx, -rx, rx * 2, rx * 2); fk.ctx.restore()
      }
      ctx.save(); ctx.globalCompositeOperation = g.dark ? 'screen' : 'source-over'; ctx.filter = `blur(${S * 0.01}px)`; ctx.drawImage(fk.c, 0, 0); ctx.restore()
    }
    dust(ctx, W, H, g, o.seed, 160, { x: spotX, y: H * 0.35, r: H * 0.45 })
    // ── tipografia in primo piano ──
    const ms = S * 0.0145
    baseText(ctx, MICRO, 'Artismi Design Studio presenta', ms, W / 2, m + ms, g.ink, 'center', 0.2)
    const tf: Face = { ...FACES.grotesk, track: 0.32 }
    const word = title.join(' ')
    const tw = shot === 2 ? W * 0.5 : W * 0.74
    const tsz = Math.min(sizeForWidth(tf, word, tw), S * 0.075)
    const titleY = H * (shot === 1 ? 0.835 : 0.775)
    ctx.save(); ctx.shadowColor = g.glow; ctx.shadowBlur = S * 0.02
    const tb = inkText(ctx, tf, word, tsz, shot === 2 ? m : W / 2, titleY, g.ink, shot === 2 ? 'left' : 'center')
    ctx.restore()
    if (sub) baseText(ctx, FACES.corsivo, sub, S * 0.026, shot === 2 ? m : W / 2, tb.y - S * 0.022, g.ink, shot === 2 ? 'left' : 'center')
    // blocco crediti: condensato stretto e alto, come in fondo ai manifesti
    const credits = ['Artismi Design Studio presenta', word, ...info, 'Torino MMXXVI'].join('   ·   ').toUpperCase()
    const cf = FACES.condensato
    const cy0 = H - m - S * 0.03
    const csrc = inkCanvas(cf, credits, S * 0.05, g.ink)
    const cw = W - 2 * m, ch = Math.min(S * 0.026, cw * csrc.height / csrc.width * 2.2)
    ctx.save(); ctx.globalAlpha = 0.72; ctx.drawImage(csrc, m, cy0 - ch, cw, ch); ctx.restore()
    baseText(ctx, MICRO, info.join('   /   '), ms * 0.95, W / 2, H - m + ms * 0.2, g.ink, 'center', 0.1)
    cinemaFinish(c, g, o.seed, { bloom: num(o, 'bloom') / 100, halation: num(o, 'bloom') / 100 * 0.45, aberration: num(o, 'aberr') / 100, grade: 1, vignette: g.dark ? 0.85 : 0.4, grain: num(o, 'grain') / 100 })
    return c
  },
}

const BASE: Recipe[] = [
  membrana, rete, falce, quaderno, corona, fascia, ghirigoro, alieno, cromo, goccia, macchia,
  colata, fette, fotocopia, vortice, bit,
  simbolo, rametto, costellazione, fregio,
  timbro, datario, timbroParola, hanko, adesivo, foglioAdesivi, ceralacca, toppa, biglietto, nastro,
  tattoo,
  groovy, gonfiabile, eco, trama,
  lockup, tensione, cinetico, locandina, scena,
  francobollo, valigia, fiammiferi, cartellino, exlibris, scontrino, bottiglia, stemma,
]

/**
 * Ogni generatore riceve in coda la stessa finitura (pellicola, emissione,
 * sogno, stampa, profondità): niente esce più "crudo". La scena ha già la sua
 * post-produzione e parte senza.
 */
const withPost = (rc: Recipe): Recipe => ({
  ...rc,
  params: [...rc.params, P.sel('post', 'Finitura', [...POST_FX], 0), P.range('postAmt', 'Intensità finitura', 0, 100, 45)],
  render: o => {
    const c = rc.render(o)
    const out = postFx(c, num(o, 'post'), num(o, 'postAmt') / 100, o.seed, o.transparent)
    return o.transparent && out !== c ? crop(out) : out
  },
})
export const RECIPES: Recipe[] = BASE.map(withPost)
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
