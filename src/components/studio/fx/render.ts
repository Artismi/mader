/**
 * Esecuzione degli effetti sulla cache di un oggetto.
 * Ordine (come in un editor fotografico): dettaglio → tono e colore → halation
 * → effetti della pila (nell'ordine scelto) → vignettatura e grana per ultime.
 * Tutte le misure arrivano in pixel di design e si moltiplicano per lo zoom
 * della cache (`z`): l'effetto ha lo stesso aspetto a ogni zoom e nell'export.
 */
import { FxGL, type Tex, type UVal } from './gl'
import {
  MASK, MASK_A, ADJUST, GRUNGE, STITCH, FOIL, IMPRESS, SMEAR, RAYS, GLITTER, FLUTED, ASCII, LINOCUT, MIRRORTILE, LIGHTCAST, PIXELSORT, LOWPOLY, KALEIDO, HAL_MASK, HAL_ADD, FINISH, SHADOW_COMP, INNER_SHADOW, GLOW_COMP, INNER_GLOW, BEVEL_H, BEVEL, STROKE, SATIN, COLOR_OVERLAY, GRAD_OVERLAY, TEX_OVERLAY, NEON, ECHO, HOLLOW, SPLICE, LONG_SHADOW, EXTRUDE, GLITCH, BLOOM_MASK, BLOOM, LIGHT_LEAK, HALFTONE, RISO, DITHER, SCREENPRINT, GRAD_MAP, POSTERIZE, TILT, MOTION, ZOOM_BLUR, WAVE, RIPPLE, TWIRL, BULGE, MOSAIC, CHROMA, VHS, CRT,
  MAT3D, GENFILL, MIX_AMT,
} from './shaders'
import { LOOKS, HSL_BANDS, fxDef, migrateFx, type Adjust, type FxEntry, type Look, type PVal } from './catalog'

export interface FxData { adjust?: Adjust; look?: Look; fx?: FxEntry[] }

const rgb = (hex: PVal | undefined, d = '#000000'): number[] => {
  const h = String(hex ?? d).replace('#', '')
  const f = h.length === 3 ? h.split('').map(x => x + x).join('') : h.padEnd(6, '0')
  return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16) / 255)
}
const num = (v: PVal | undefined, d = 0) => (typeof v === 'number' ? v : v === undefined ? d : Number(v) || d)
const rad = (deg: number) => (deg * Math.PI) / 180

/** regolazioni effettive = a mano + filtro pronto scalato per la sua intensità */
export function effectiveAdjust(d: FxData): Adjust {
  const out: Adjust = { ...(d.adjust ?? {}) }
  const look = d.look && LOOKS.find(l => l.id === d.look!.id)
  if (look) {
    const k = (d.look!.amount ?? 100) / 100
    for (const [key, v] of Object.entries(look.adjust)) {
      if (key === 'curve') { if (k >= 0.5 && !out.curve) out.curve = v; continue }
      // tinte (gradi) e dimensioni non si scalano: si scala solo la forza
      if (/_h$|^gSh_h$|^gMid_h$|^gHi_h$/.test(key) && !key.startsWith('hsl_')) { if (out[key] === undefined) out[key] = v; continue }
      if (key === 'grainSize' || key === 'vigFeather') { if (out[key] === undefined) out[key] = v; continue }
      out[key] = Math.max(-100, Math.min(100, (out[key] ?? 0) + v * k))
    }
  }
  return out
}

/** margine (pixel di design) che gli effetti richiedono attorno all'oggetto */
export function fxPadding(d: FxData): number {
  let pad = 0
  for (const e of migrateFx(d.fx) ?? []) if (e.on) pad = Math.max(pad, fxDef(e.id)?.pad?.(e.p) ?? 0)
  const a = effectiveAdjust(d)
  if (a.halation) pad = Math.max(pad, 6 + a.halation * 0.25)
  return Math.ceil(pad)
}
export function fxSpeed(d: FxData): number {
  let s = 0
  for (const e of migrateFx(d.fx) ?? []) {
    if (!e.on || !fxDef(e.id)?.animated) continue
    s = Math.max(s, num(e.p.speed), num(e.p.flicker))
  }
  return s
}
export const isActive = (d: FxData) => {
  const a = effectiveAdjust(d)
  return !!(migrateFx(d.fx)?.some(e => e.on) || Object.entries(a).some(([k, v]) => v && k !== 'grainSize' && k !== 'vigFeather'))
}

/* ════════════════ render ════════════════ */
interface Ctx {
  g: FxGL; orig: Tex; W: number; H: number; z: number; t: number
  sdf: Tex | null
  /** copertura della forma erosa di e pixel (e < 0: dilatata) */
  mask: (e: number) => Tex
}

export function renderFx(src: HTMLCanvasElement, out: HTMLCanvasElement, data: FxData, z: number, time: number): boolean {
  const g = FxGL.get(); if (!g) return false
  const W = src.width, H = src.height
  if (!W || !H) return false
  try {
    const orig = g.upload(src, W, H)
    const stack = (migrateFx(data.fx) ?? []).filter(e => e.on && fxDef(e.id))
    const need = sdfReach(stack) * z
    const sdf = need > 0 ? g.sdf(orig, need + 4) : null
    const ctx: Ctx = {
      g, orig, W, H, z, t: time, sdf,
      mask: e => sdf
        ? g.pass('mask', MASK, W, H, { uSdf: sdf, uE: e })
        : g.pass('maskA', MASK_A, W, H, { uSrc: orig }),
    }
    const a = effectiveAdjust(data)
    let cur = adjustPass(ctx, orig, a)
    for (const e of stack) {
      const run = RUN[e.id]; if (!run) continue
      const next = run(ctx, cur, e.p, e.amount / 100)
      if (next !== cur && cur !== orig) g.release(cur)
      cur = next
    }
    cur = finishPass(ctx, cur, a)
    g.present(cur, out)
    return true
  } catch (err) {
    console.warn('[fx] render non riuscito', err)
    return false
  } finally {
    g.releaseAll()
  }
}

/** fino a che distanza dal bordo serve il campo di distanze (pixel di design) */
function sdfReach(stack: FxEntry[]): number {
  let m = 0
  for (const e of stack) {
    const p = e.p
    switch (e.id) {
      case 'dropShadow': m = Math.max(m, num(p.spread) + 1); break
      case 'outerGlow': m = Math.max(m, num(p.spread) + 1); break
      case 'innerShadow': m = Math.max(m, num(p.choke) + 1); break
      case 'innerGlow': m = Math.max(m, num(p.choke) + num(p.size, 14) + 2); break
      case 'bevel': m = Math.max(m, num(p.size, 10) + 2); break
      case 'stroke': m = Math.max(m, num(p.size, 6) + 2); break
      case 'neon': m = Math.max(m, num(p.size, 18) * 0.15 + 3); break
      case 'hollow': case 'splice': m = Math.max(m, num(p.thickness, 3) + 2); break
      case 'material3d': m = Math.max(m, 100000); break
      case 'grunge': m = Math.max(m, 10); break
      case 'glitter': m = Math.max(m, 60); break
      case 'raggi': m = Math.max(m, 400); break
      case 'impressione': break
      case 'stitch': m = Math.max(m, num(p.inset, 5) + 6); break
      case 'foil': m = Math.max(m, num(p.bevel, 4) + 4); break
    }
  }
  return m
}

/* ─── regolazioni ─── */
function adjustPass(c: Ctx, src: Tex, a: Adjust): Tex {
  const { g, W, H, z } = c
  const v = (k: string) => (a[k] ?? 0) / 100
  let cur = src
  if (a.blur) cur = g.blur(src, a.blur * 0.35 * z)
  const tone = ['temperature', 'tint', 'exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'clarity', 'vibrance', 'saturation', 'sharpen', 'fade', 'curve']
  const hslOn = HSL_BANDS.some(b => a[`hsl_${b.key}_h`] || a[`hsl_${b.key}_s`] || a[`hsl_${b.key}_l`])
  const gradeOn = !!(a.gSh_s || a.gMid_s || a.gHi_s)
  if (tone.some(k => a[k]) || hslOn || gradeOn) {
    const big = a.clarity ? g.blur(cur, 18 * z) : cur
    const small = a.sharpen ? g.blur(cur, 1.2 * Math.max(1, z)) : cur
    const next = g.pass('adjust', ADJUST, W, H, {
      uSrc: cur, uBlurL: big, uBlurS: small,
      uTemp: v('temperature'), uTint: v('tint'), uExp: v('exposure'), uCon: v('contrast'), uHi: v('highlights'), uSh: v('shadows'),
      uWh: v('whites'), uBl: v('blacks'), uClar: v('clarity'), uVib: v('vibrance'), uSat: v('saturation'), uSharp: v('sharpen'),
      uFade: v('fade'), uCurve: a.curve ?? 0, uBal: v('gBal'),
      uGSh: [a.gSh_h ?? 0, v('gSh_s')], uGMid: [a.gMid_h ?? 0, v('gMid_s')], uGHi: [a.gHi_h ?? 0, v('gHi_s')],
      uHslH: HSL_BANDS.map(b => v(`hsl_${b.key}_h`)), uHslS: HSL_BANDS.map(b => v(`hsl_${b.key}_s`)), uHslL: HSL_BANDS.map(b => v(`hsl_${b.key}_l`)),
    })
    if (big !== cur) g.release(big)
    if (small !== cur) g.release(small)
    if (cur !== src) g.release(cur)
    cur = next
  }
  if (a.halation) {
    const bright = g.pass('halMask', HAL_MASK, W, H, { uSrc: cur, uTh: 0.62 })
    const b = g.blur(bright, (6 + a.halation * 0.35) * z)
    g.release(bright)
    const next = g.pass('halAdd', HAL_ADD, W, H, { uSrc: cur, uB: b, uK: v('halation') * 1.4 })
    g.release(b); if (cur !== src) g.release(cur)
    cur = next
  }
  return cur
}

function finishPass(c: Ctx, cur: Tex, a: Adjust): Tex {
  if (!a.vignette && !a.grain) return cur
  const next = c.g.pass('finish', FINISH, c.W, c.H, {
    uSrc: cur, uVig: (a.vignette ?? 0) / 100, uVigF: (a.vigFeather ?? 50) / 100,
    uGrain: (a.grain ?? 0) / 100, uGrainSize: (a.grainSize ?? 25) / 100, uZ: c.z, uT: c.t,
  })
  if (cur !== c.orig) c.g.release(cur)
  return next
}

/* ════════════════ effetti ════════════════ */
type Run = (c: Ctx, cur: Tex, p: Record<string, PVal>, amt: number) => Tex
const dirUv = (c: Ctx, angle: number, dist: number) => [Math.cos(rad(angle)) * dist * c.z / c.W, Math.sin(rad(angle)) * dist * c.z / c.H]
const std = (c: Ctx, cur: Tex, amt: number, extra: Record<string, UVal> = {}): Record<string, UVal> =>
  ({ uSrc: cur, uOrig: c.orig, uZ: c.z, uT: c.t, uAmt: amt, ...(c.sdf ? { uSdf: c.sdf } : {}), uHasSdf: c.sdf ? 1 : 0, ...extra })
const simple = (key: string, frag: string, uni: (c: Ctx, p: Record<string, PVal>) => Record<string, UVal>): Run =>
  (c, cur, p, amt) => c.g.pass(key, frag, c.W, c.H, std(c, cur, amt, uni(c, p)))

export const ASCII_SETS = [
  " .'`,-_:;~^\"+=<>*rcvszxoaeunmwqpdbkhXZOQ8#%&@",
  ' .,:;irsXA253hMHGS#9B&@', ' ░▒▓█', ' 01', ' ·•●', ' ／＼｜＿＃', ' .:-=+*#%@',
]
/** atlante dei caratteri: la scala viene riordinata per copertura reale (dal più vuoto
 *  al più pieno), poi quattro segni per i contorni: | / - \ */
function asciiAtlas(set: string) {
  const cw = 40, ch = 64
  const glyph = (c: string) => {
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch
    const x = cv.getContext('2d', { willReadFrequently: true })!
    x.fillStyle = '#000'; x.fillRect(0, 0, cw, ch)
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'
    x.font = `700 ${ch * 0.8}px "JetBrains Mono", "IBM Plex Mono", "DejaVu Sans Mono", monospace`
    x.fillText(c, cw / 2, ch / 2 + 2)
    let sum = 0; const d = x.getImageData(0, 0, cw, ch).data
    for (let i = 0; i < d.length; i += 4) sum += d[i]
    return { cv, cov: sum / (cw * ch * 255) }
  }
  const ramp = [...new Set([...set])].map(glyph).sort((a, b) => a.cov - b.cov)
  const edges = ['|', '/', '-', '\\'].map(glyph)
  const all = [...ramp, ...edges]
  const cv = document.createElement('canvas'); cv.width = cw * all.length; cv.height = ch
  const x = cv.getContext('2d')!
  all.forEach((g, i) => x.drawImage(g.cv, i * cw, 0))
  return cv
}

export const MATERIALS = ['carta-bianca', 'carta-grigia', 'carta-stropicciata', 'cartoncino-avana', 'carta-kraft', 'carta-paglia', 'gesso', 'intonaco', 'cemento-scuro', 'marmo-nero', 'pelle', 'tela', 'metallo-spazzolato', 'metallo-bianco', 'lamina', 'plastica']

const RUN: Partial<Record<string, Run>> = {
  dropShadow: (c, cur, p) => {
    const m = c.mask(-num(p.spread) * c.z)
    const b = num(p.size, 20) > 0 ? c.g.blur(m, num(p.size, 20) * c.z) : m
    const out = c.g.pass('shadowComp', SHADOW_COMP, c.W, c.H, { uSrc: cur, uM: b, uOff: dirUv(c, num(p.angle, 90), num(p.distance, 12)), uCol: rgb(p.color), uOp: num(p.opacity, 35) / 100 })
    c.g.release(m, b)
    return out
  },
  innerShadow: (c, cur, p) => {
    const m = c.mask(num(p.choke) * c.z)
    const b = num(p.size, 10) > 0 ? c.g.blur(m, num(p.size, 10) * c.z) : m
    const out = c.g.pass('innerShadow', INNER_SHADOW, c.W, c.H, { uSrc: cur, uM: b, uOff: dirUv(c, num(p.angle, 120), num(p.distance, 6)), uCol: rgb(p.color), uOp: num(p.opacity, 45) / 100 })
    c.g.release(m, b)
    return out
  },
  outerGlow: (c, cur, p) => {
    const m = c.mask(-num(p.spread) * c.z)
    const b = c.g.blur(m, num(p.size, 24) * c.z)
    const out = c.g.pass('glowComp', GLOW_COMP, c.W, c.H, { uSrc: cur, uM: b, uCol: rgb(p.color), uCol2: rgb(p.color2), uTwo: num(p.two), uOp: num(p.opacity, 80) / 100 })
    c.g.release(m, b)
    return out
  },
  innerGlow: simple('innerGlow', INNER_GLOW, (c, p) => ({ uCol: rgb(p.color), uOp: num(p.opacity, 70) / 100, uCenter: num(p.source), uChoke: num(p.choke) * c.z, uSize: Math.max(1, num(p.size, 14) * c.z) })),
  bevel: (c, cur, p) => {
    const size = Math.max(1, num(p.size, 10) * c.z)
    const hgt = c.g.pass('bevelH', BEVEL_H, c.W, c.H, std(c, cur, 1, { uSize: size, uStyle: num(p.style), uTech: num(p.technique) }))
    const hb = c.g.blur(hgt, (1.6 + num(p.soften, 2)) * c.z)
    c.g.release(hgt)
    const out = c.g.pass('bevel', BEVEL, c.W, c.H, std(c, cur, 1, {
      uH: hb, uSize: size, uStyle: num(p.style), uDepth: num(p.depth, 100) / 100,
      uAng: rad(num(p.angle, 120)), uAlt: rad(num(p.altitude, 32)), uGloss: num(p.gloss) / 100,
      uHi: rgb(p.hiColor, '#ffffff'), uHiOp: num(p.hiOpacity, 75) / 100, uShC: rgb(p.shColor), uShOp: num(p.shOpacity, 60) / 100,
    }))
    c.g.release(hb)
    return out
  },
  stroke: simple('stroke', STROKE, (c, p) => ({ uPos: num(p.position), uSize: num(p.size, 6) * c.z, uCol: rgb(p.color, '#ffffff'), uCol2: rgb(p.color2), uGrad: num(p.gradient), uGAng: rad(num(p.gangle, 90)), uOp: num(p.opacity, 100) / 100 })),
  satin: (c, cur, p) => {
    const b = c.g.blur(c.orig, num(p.size, 16) * c.z)
    const out = c.g.pass('satin', SATIN, c.W, c.H, { uSrc: cur, uB: b, uOff: dirUv(c, num(p.angle, 19), num(p.distance, 14)), uCol: rgb(p.color), uOp: num(p.opacity, 40) / 100, uInv: num(p.invert) })
    c.g.release(b)
    return out
  },
  colorOverlay: simple('colorOverlay', COLOR_OVERLAY, (_c, p) => ({ uCol: rgb(p.color), uMode: num(p.blend), uOp: num(p.opacity, 100) / 100 })),
  gradientOverlay: simple('gradOverlay', GRAD_OVERLAY, (_c, p) => ({ uC1: rgb(p.c1), uC2: rgb(p.c2), uC3: rgb(p.c3, '#ffffff'), uThree: num(p.three), uType: num(p.type), uAng: rad(num(p.angle, 90)), uScale: num(p.scale, 100) / 100, uMode: num(p.blend), uOp: num(p.opacity, 100) / 100 })),
  textureOverlay: simple('texOverlay', TEX_OVERLAY, (_c, p) => ({ uKind: num(p.kind, 1), uScale: num(p.scale, 100) / 100, uMode: num(p.blend, 3), uOp: num(p.opacity, 60) / 100 })),
  neon: (c, cur, p, amt) => {
    const s = num(p.size, 18) * c.z
    const b1 = c.g.blur(c.orig, s * 0.3), b2 = c.g.blur(c.orig, s), b3 = c.g.blur(c.orig, s * 2.2)
    const out = c.g.pass('neon', NEON, c.W, c.H, std(c, cur, amt, { uB1: b1, uB2: b2, uB3: b3, uCol: rgb(p.color), uInt: num(p.intensity, 75) / 100, uTube: num(p.tube, 65) / 100, uFlick: num(p.flicker) / 100, uEdge: Math.max(1.5 * c.z, s * 0.12) }))
    c.g.release(b1, b2, b3)
    return out
  },
  echo: simple('echo', ECHO, (c, p) => ({ uCount: Math.round(num(p.count, 4)), uOff: dirUv(c, num(p.angle, 315), num(p.distance, 8)), uUse: num(p.useColor), uCol: rgb(p.color), uFade: num(p.fade, 70) / 100 })),
  impressione: (c, cur, p, amt) => {
    const name = MATERIALS[num(p.material)] ?? MATERIALS[0]
    const mat = c.g.image(`/assets/materials/${name}.jpg`), nrm = c.g.image(`/assets/materials/${name}-rilievo.jpg`)
    const size = num(p.size, 8)
    const mode = num(p.mode)
    const h = mode > 3.5 ? c.orig : c.g.blur(c.orig, size * c.z * 0.6)
    const hb = mode > 3.5 ? c.orig : c.g.blur(c.orig, size * c.z * 1.8)
    return c.g.pass('impress', IMPRESS, c.W, c.H, std(c, cur, amt, {
      uMat: mat ?? cur, uNrm: nrm ?? cur, uH: h, uHb: hb, uHasMat: mat && nrm ? 1 : 0, uMode: mode, uDepth: num(p.depth, 60) / 100, uSize: size,
      uLight: num(p.light, 135) * Math.PI / 180, uScale: num(p.scale, 100) / 100, uMicro: num(p.micro, 60) / 100, uScene: num(p.scene, 60) / 100,
      uInk: rgb(p.ink, '#1d2a6b'), uFoilA: rgb(p.c1, '#6b4a10'), uFoilB: rgb(p.c2, '#ffe9a8'), uTint: rgb(p.tint, '#ffffff'),
    }))
  },
  vetro: (c, cur, p, amt) => {
    const w = Math.max(4, num(p.width, 22))
    const fr = c.g.blur(cur, w * 0.35 * c.z)
    const out = c.g.pass('fluted', FLUTED, c.W, c.H, std(c, cur, amt, { uFrostTex: fr, uW: w, uStr: num(p.strength, 45) / 100, uAng: rad(num(p.angle, 0)), uHi: num(p.highlight, 45) / 100, uShade: num(p.shade, 55) / 100, uDisp: num(p.dispersion, 25) / 100 * 0.12, uFrost: num(p.frost, 25) / 100 }))
    c.g.release(fr)
    return out
  },
  ascii: (c, cur, p, amt) => {
    const set = ASCII_SETS[num(p.charset)] ?? ASCII_SETS[0]
    const n = new Set([...set]).size
    const atlas = c.g.canvasTex(`ascii3|${set}`, () => asciiAtlas(set))
    const cell = Math.max(3, num(p.cell, 7))
    const ct = c.g.blur(cur, cell * 0.35 * c.z), loc = c.g.blur(cur, cell * 4 * c.z)
    const out = c.g.pass('ascii', ASCII, c.W, c.H, std(c, cur, amt, { uAtlas: atlas, uCellTex: ct, uLocal: loc, uCell: cell, uN: n, uMode: num(p.mode), uColor: num(p.color, 100) / 100, uUnder: num(p.under, 45) / 100, uEdges: num(p.edges, 60) / 100, uCon: num(p.contrast, 50) / 100, uSat: num(p.saturation, 80) / 100 * 1.6, uInv: num(p.mode) === 1 ? 1 : 0, uInk: rgb(p.ink, '#f4f1ea'), uBg: rgb(p.bg, '#07080a') }))
    c.g.release(ct, loc)
    return out
  },
  linocut: (c, cur, p, amt) => {
    const lines = Math.max(2, num(p.lines, 4.5))
    const fl = c.g.blur(cur, lines * 3 * c.z)
    const out = c.g.pass('linocut', LINOCUT, c.W, c.H, std(c, cur, amt, { uFlowTex: fl, uInk: rgb(p.ink, '#141414'), uPaper: rgb(p.paper, '#f1ebdd'), uLines: lines, uAng: rad(num(p.angle, 30)), uFlow: num(p.flow, 55) / 100, uCross: num(p.cross, 60) / 100, uColor: num(p.color, 0) / 100, uRough: num(p.rough, 20) / 100, uTh: num(p.threshold, 50) / 100 }))
    c.g.release(fl)
    return out
  },
  specchi: simple('mirrortile', MIRRORTILE, (_c, p) => ({ uSize: Math.max(6, num(p.size, 26)), uRefr: num(p.refraction, 35) / 100, uGrout: num(p.grout, 6) / 100, uGloss: num(p.gloss, 50) / 100, uGroutCol: rgb(p.groutColor, '#1a1a1a') })),
  luceProiettata: simple('lightcast', LIGHTCAST, (_c, p) => ({ uMode: num(p.mode), uAng: rad(num(p.angle, 20)), uScale: num(p.scale, 100) / 100, uSoft: num(p.soft, 50) / 100, uStr: num(p.strength, 70) / 100, uWarm: rgb(p.warm, '#ffd9a0') })),
  pixelSort: simple('pixelsort', PIXELSORT, (c, p) => ({ uDir: dirUv(c, num(p.angle, 90), num(p.length, 420)), uLo: num(p.threshold, 45) / 100, uHi: num(p.upper, 100) / 100, uVar: num(p.vary, 70) / 100, uRev: num(p.reverse) })),
  lowPoly: (c, cur, p, amt) => {
    const size = Math.max(4, num(p.size, 26))
    const soft = c.g.blur(cur, size * 0.06 * c.z)
    const out = c.g.pass('lowpoly', LOWPOLY, c.W, c.H, std(c, cur, amt, { uSoft: soft, uSize: size, uEdge: num(p.edge, 25) / 100, uDetail: num(p.detail, 60) / 100, uRelief: num(p.relief, 60) / 100, uJit: num(p.jitter, 45) / 100 }))
    c.g.release(soft)
    return out
  },
  caleido: simple('kaleido', KALEIDO, (_c, p) => ({ uSeg: Math.max(2, Math.round(num(p.segments, 8))), uRot: rad(num(p.rotation, 0)), uZoom: num(p.zoom, 100) / 100, uC: [num(p.cx, 50) / 100, num(p.cy, 50) / 100] })),
  grunge: simple('grunge', GRUNGE, (_c, p) => ({ uWear: num(p.wear, 45) / 100, uScale: num(p.scale, 100) / 100, uSpeck: num(p.speck, 40) / 100 })),
  stitch: simple('stitch', STITCH, (_c, p) => ({ uThread: rgb(p.color, '#e94f37'), uStitch: rgb(p.stitch, '#fff4e0'), uUseColor: num(p.useColor), uDensity: num(p.density, 70) / 40, uInset: num(p.inset, 5) })),
  foil: simple('foil', FOIL, (_c, p) => ({ uA: rgb(p.c1, '#7a5310'), uB: rgb(p.c2, '#fff1b8'), uCrinkle: num(p.crinkle, 60) / 100, uLight: num(p.light, 220) * Math.PI / 180, uBevel: num(p.bevel, 4) })),
  hollow: simple('hollow', HOLLOW, (c, p) => ({ uW: num(p.thickness, 3) * c.z })),
  splice: simple('splice', SPLICE, (c, p) => ({ uW: num(p.thickness, 3) * c.z, uOff: dirUv(c, num(p.angle, 315), num(p.distance, 8)), uCol: rgb(p.color) })),
  longShadow: simple('longShadow', LONG_SHADOW, (c, p) => ({ uDir: dirUv(c, num(p.angle, 45), num(p.length, 120)), uCol: rgb(p.color), uOp: num(p.opacity, 35) / 100, uFade: num(p.fade, 60) / 100 })),
  extrude: simple('extrude', EXTRUDE, (c, p) => ({ uDir: dirUv(c, num(p.angle, 45), num(p.depth, 24)), uCol: rgb(p.color), uShade: num(p.shade, 60) / 100, uBands: num(p.bands), uC2: rgb(p.c2, '#ffb000'), uC3: rgb(p.c3, '#ff3d00'), uC4: rgb(p.c4, '#7a1fa2') })),
  colata: simple('smear', SMEAR, (c, p) => ({ uDir: dirUv(c, num(p.angle, 90), num(p.length, 260)), uFade: Math.max(0.3, num(p.fade, 60) / 25), uWobble: num(p.wobble, 30) / 100, uGlow: num(p.glow, 50) / 100, uSpectrum: num(p.spectrum) / 100 })),
  raggi: simple('rays', RAYS, (_c, p) => ({ uCenter: [num(p.cx, 50) / 100, num(p.cy, 50) / 100], uLen: num(p.length, 60) / 100, uInt: num(p.intensity, 70) / 100, uMode: num(p.mode), uCol: rgb(p.color, '#7ab8ff') })),
  glitter: simple('glitter', GLITTER, (_c, p) => ({ uBase: rgb(p.color, '#c9ccd6'), uUse: num(p.useColor, 1), uSize: Math.max(0.5, num(p.size, 4)), uSpark: num(p.sparkle, 70) / 100, uDust: num(p.dust, 50) / 100 })),
  glitch: simple('glitch', GLITCH, (_c, p) => ({ uPow: num(p.power, 50) / 100, uSplit: num(p.split, 30) / 100, uSlices: num(p.slices, 18), uNoise: num(p.noise, 20) / 100 })),
  bloom: (c, cur, p, amt) => {
    const bright = c.g.pass('bloomMask', BLOOM_MASK, c.W, c.H, { uSrc: cur, uTh: num(p.threshold, 60) / 100 })
    const s = num(p.size, 30) * c.z
    const b1 = c.g.blur(bright, s * 0.35), b2 = c.g.blur(bright, s)
    c.g.release(bright)
    const out = c.g.pass('bloom', BLOOM, c.W, c.H, std(c, cur, amt, { uB1: b1, uB2: b2, uInt: num(p.intensity, 55) / 100, uWarm: num(p.warmth, 10) / 100 }))
    c.g.release(b1, b2)
    return out
  },
  lightLeak: simple('lightLeak', LIGHT_LEAK, (_c, p) => ({ uC1: rgb(p.c1), uC2: rgb(p.c2), uPos: num(p.position, 20) / 100, uSize: num(p.size, 55) / 100, uSpeed: num(p.speed) })),
  halftone: simple('halftone', HALFTONE, (_c, p) => ({ uMode: num(p.mode, 1), uShape: num(p.shape), uSize: num(p.size, 8), uAng: rad(num(p.angle, 45)), uInk: rgb(p.ink, '#111111'), uPaperOn: num(p.paperOn, 1), uPaper: rgb(p.paper, '#f5f0e6') })),
  riso: simple('riso', RISO, (_c, p) => ({ uInk1: rgb(p.ink1), uInk2: rgb(p.ink2), uPaper: rgb(p.paper, '#f3eee4'), uScreen: num(p.screen), uSize: num(p.size, 3), uReg1: num(p.reg1, 2), uReg2: num(p.reg2, 6), uLoad: num(p.ink, 70) / 100, uWear: num(p.texture, 45) / 100 })),
  dither: simple('dither', DITHER, (_c, p) => ({ uDark: rgb(p.dark), uLight: rgb(p.light, '#ffffff'), uPattern: num(p.pattern, 1), uSize: num(p.size, 2), uCon: num(p.contrast, 20) / 100, uFour: num(p.levels4, 1) })),
  screenprint: simple('screenprint', SCREENPRINT, (_c, p) => ({ uC1: rgb(p.c1), uC2: rgb(p.c2), uC3: rgb(p.c3), uTh: num(p.threshold, 50) / 100, uRough: num(p.rough, 40) / 100, uOffset: num(p.offset, 2) })),
  gradientMap: simple('gradMap', GRAD_MAP, (_c, p) => ({ uC1: rgb(p.c1), uC2: rgb(p.c2), uC3: rgb(p.c3, '#ffffff'), uThree: num(p.three, 1), uCon: num(p.contrast, 10) / 100 })),
  posterize: simple('posterize', POSTERIZE, (_c, p) => ({ uLevels: Math.max(2, num(p.levels, 4)), uDither: num(p.dither), uSat: num(p.saturation, 15) / 100 })),
  tiltShift: (c, cur, p, amt) => {
    const b = c.g.blur(cur, num(p.size, 16) * c.z)
    const out = c.g.pass('tilt', TILT, c.W, c.H, std(c, cur, amt, { uB: b, uPos: num(p.position, 50) / 100, uWidth: num(p.width, 18) / 100, uFeather: num(p.feather, 22) / 100, uAng: rad(num(p.angle)) }))
    c.g.release(b)
    return out
  },
  motionBlur: simple('motion', MOTION, (c, p) => ({ uDir: dirUv(c, num(p.angle), num(p.length, 30)) })),
  zoomBlur: simple('zoomBlur', ZOOM_BLUR, (_c, p) => ({ uK: num(p.amount, 25) / 100, uC: [num(p.cx, 50) / 100, num(p.cy, 50) / 100] })),
  wave: simple('wave', WAVE, (_c, p) => ({ uAmp: num(p.amp, 10), uLen: num(p.length, 120), uAng: rad(num(p.angle)), uSpeed: num(p.speed) })),
  ripple: simple('ripple', RIPPLE, (_c, p) => ({ uAmp: num(p.amp, 6), uLen: num(p.length, 40), uSpeed: num(p.speed) })),
  twirl: simple('twirl', TWIRL, (_c, p) => ({ uAng: rad(num(p.angle, 180)), uR: num(p.radius, 60) / 100 })),
  bulge: simple('bulge', BULGE, (_c, p) => ({ uK: num(p.amount, 50) / 100, uR: num(p.radius, 70) / 100 })),
  mosaic: simple('mosaic', MOSAIC, (_c, p) => ({ uShape: num(p.shape), uSize: num(p.size, 12), uGap: num(p.gap) / 100 })),
  chroma: simple('chroma', CHROMA, (_c, p) => ({ uPx: num(p.amount, 6), uDist: num(p.distortion) / 100, uRadial: num(p.radial, 1) })),
  vhs: simple('vhs', VHS, (_c, p) => ({ uPow: num(p.power, 55) / 100, uBleed: num(p.bleed, 50) / 100, uLines: num(p.lines, 40) / 100 })),
  material3d: (c, cur, p, amt) => {
    if (!c.sdf) return cur
    // campo di distanze ammorbidito: superfici lisce, niente striature sulle forme gonfie
    const s3 = c.g.blur(c.sdf, (num(p.shape) > 0 ? 3 : 1.6) * Math.max(1, c.z))
    const spin = num(p.spin) > 0 ? c.t * num(p.spin) * 0.04 : 0
    const out = c.g.pass('mat3d', MAT3D, c.W, c.H, {
      uSrc: cur, uS3: s3, uZ: c.z, uDepth: num(p.depth, 40) * c.z, uBevel: num(p.bevel, 6) * c.z,
      uRx: rad(num(p.rx, 18)), uRy: rad(num(p.ry, -24)) + spin, uPersp: num(p.persp, 40) / 100, uMat: num(p.material),
      uShape: num(p.shape), uUseCol: num(p.useColor), uCol: rgb(p.color, '#ff5a36'), uEnv: num(p.env), uLightA: rad(num(p.light, 220)), uRough: num(p.rough, 30) / 100,
    })
    c.g.release(s3)
    if (amt >= 1) return out
    const mixd = c.g.pass('mixAmt', MIX_AMT, c.W, c.H, { uA: cur, uB: out, uK: amt })
    c.g.release(out)
    return mixd
  },
  genFill: simple('genFill', GENFILL, (_c, p) => ({ uMode: num(p.mode), uScale: num(p.scale, 100) / 100, uWarp: num(p.warp, 50) / 100, uGrain: num(p.grain, 20) / 100, uMix: num(p.keep) / 100, uC1: rgb(p.c1), uC2: rgb(p.c2), uC3: rgb(p.c3), uC4: rgb(p.c4) })),
  crt: (c, cur, p, amt) => {
    const b = c.g.blur(cur, 3 * c.z)
    const out = c.g.pass('crt', CRT, c.W, c.H, std(c, cur, amt, { uB: b, uScan: num(p.scan, 55) / 100, uMask: num(p.mask, 45) / 100, uCurve: num(p.curve, 25) / 100, uGlow: num(p.glow, 35) / 100, uFlick: num(p.speed) / 100 }))
    c.g.release(b)
    return out
  },
}
