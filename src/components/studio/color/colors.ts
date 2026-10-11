/**
 * Colore come in Illustrator: colori del documento, campioni, palette estratta
 * da una foto, armonie, e Ricolora grafica (tutti i colori di una selezione,
 * anche dentro gruppi, sfumature e testi a più colori, cambiati insieme).
 */
import * as fabric from 'fabric'

export interface Rgba { r: number; g: number; b: number; a: number }

/** Un punto in cui un colore è usato: riempimento, tratto, tappa di sfumatura o carattere di un testo. */
export type ColorRef =
  | { obj: fabric.FabricObject; kind: 'fill' }
  | { obj: fabric.FabricObject; kind: 'stroke' }
  | { obj: fabric.FabricObject; kind: 'stop'; prop: 'fill' | 'stroke'; index: number }
  | { obj: fabric.FabricObject; kind: 'style'; line: string; char: string; prop: 'fill' | 'stroke' }

export interface ColorUse { key: string; hex: string; alpha: number; count: number; refs: ColorRef[] }

// ── conversioni ─────────────────────────────────────────────────────────────

export function parse(c: unknown): Rgba | null {
  if (typeof c !== 'string' || !c || c === 'transparent' || c === 'none') return null
  const col = new fabric.Color(c)
  const [r, g, b, a] = col.getSource()
  if (a === 0) return null
  return { r, g, b, a }
}

const h2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
export const toHex = ({ r, g, b }: Rgba) => `#${h2(r)}${h2(g)}${h2(b)}`
export const toCss = (c: Rgba) => (c.a >= 1 ? toHex(c) : `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${Math.round(c.a * 1000) / 1000})`)
const keyOf = (c: Rgba) => `${toHex(c)}/${Math.round(c.a * 100)}`

export function rgbToHsl({ r, g, b }: Rgba): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

export function hslToRgb(h: number, s: number, l: number, a = 1): Rgba {
  h = ((h % 360) + 360) % 360 / 360
  s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l))
  if (!s) return { r: l * 255, g: l * 255, b: l * 255, a }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const f = (t: number) => {
    t = (t + 1) % 1
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p
  }
  return { r: f(h + 1 / 3) * 255, g: f(h) * 255, b: f(h - 1 / 3) * 255, a }
}

/** Luminanza percepita 0–1 (per ordinare dal chiaro allo scuro). */
export const luma = ({ r, g, b }: Rgba) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

// ── raccolta ────────────────────────────────────────────────────────────────

const isBoard = (o: fabric.FabricObject) => !!(o as fabric.FabricObject & { isArtboard?: boolean }).isArtboard
const isLabel = (o: fabric.FabricObject) => String(o.get('name') ?? '').startsWith('label_')

function refsOf(o: fabric.FabricObject, out: ColorRef[]) {
  if (o instanceof fabric.Group) { o.getObjects().forEach(c => refsOf(c, out)); return }
  for (const prop of ['fill', 'stroke'] as const) {
    const v = o[prop]
    if (v instanceof fabric.Gradient) v.colorStops.forEach((_, index) => out.push({ obj: o, kind: 'stop', prop, index }))
    else if (typeof v === 'string' && (prop === 'fill' || o.strokeWidth > 0)) out.push({ obj: o, kind: prop })
  }
  if (o instanceof fabric.FabricText && o.styles) {
    for (const [line, chars] of Object.entries(o.styles)) for (const [char, st] of Object.entries(chars as Record<string, Record<string, unknown>>)) {
      if (typeof st.fill === 'string') out.push({ obj: o, kind: 'style', line, char, prop: 'fill' })
      if (typeof st.stroke === 'string') out.push({ obj: o, kind: 'style', line, char, prop: 'stroke' })
    }
  }
}

export function getRef(r: ColorRef): string | undefined {
  if (r.kind === 'fill' || r.kind === 'stroke') return r.obj[r.kind] as string
  if (r.kind === 'stop') return (r.obj[r.prop] as fabric.Gradient<'linear'>).colorStops[r.index]?.color
  const st = (r.obj as fabric.FabricText).styles?.[r.line as unknown as number]?.[r.char as unknown as number] as Record<string, unknown> | undefined
  return st?.[r.prop] as string | undefined
}

export function setRef(r: ColorRef, color: string) {
  if (r.kind === 'fill' || r.kind === 'stroke') r.obj.set(r.kind, color)
  else if (r.kind === 'stop') {
    const g = r.obj[r.prop] as fabric.Gradient<'linear'>
    if (g.colorStops[r.index]) g.colorStops[r.index].color = color
    r.obj.set(r.prop, g) // la sfumatura va ridisegnata
  } else {
    const st = (r.obj as fabric.FabricText).styles?.[r.line as unknown as number]?.[r.char as unknown as number] as Record<string, unknown> | undefined
    if (st) st[r.prop] = color
  }
  r.obj.set('dirty', true)
  r.obj.group?.set('dirty', true)
}

export function collectColors(objs: fabric.FabricObject[]): ColorUse[] {
  const refs: ColorRef[] = []
  objs.forEach(o => refsOf(o, refs))
  const map = new Map<string, ColorUse>()
  for (const r of refs) {
    const c = parse(getRef(r))
    if (!c) continue
    const k = keyOf(c)
    const u = map.get(k) ?? { key: k, hex: toHex(c), alpha: c.a, count: 0, refs: [] }
    u.count++; u.refs.push(r)
    map.set(k, u)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

/** Colori usati nel documento (le tavole e le etichette non contano). */
export const documentColors = (canvas: fabric.Canvas) =>
  collectColors(canvas.getObjects().filter(o => !isBoard(o) && !isLabel(o) && !o.excludeFromExport))

/** Applica un colore alla selezione: riempimento, o tratto (linee e forme vuote prendono il tratto). */
export function applyColor(canvas: fabric.Canvas, hex: string, target: 'fill' | 'stroke' | 'auto' = 'auto') {
  const objs = canvas.getActiveObjects().filter(o => !isBoard(o) || canvas.getActiveObjects().length === 1)
  for (const o of objs) {
    const strokeOnly = o.type === 'line' || !o.fill || o.fill === 'transparent'
    const prop = target === 'auto' ? (strokeOnly ? 'stroke' : 'fill') : target
    if (o instanceof fabric.Group && !isBoard(o)) {
      const refs: ColorRef[] = []; refsOf(o, refs)
      refs.filter(r => (r.kind === prop) || (r.kind !== 'fill' && r.kind !== 'stroke' && r.prop === prop)).forEach(r => setRef(r, hex))
    } else {
      o.set(prop, hex)
      if (prop === 'stroke' && !o.strokeWidth) o.set('strokeWidth', 2)
      if (o instanceof fabric.FabricText && !(o as fabric.IText).isEditing) { // anche le lettere colorate a parte
        const refs: ColorRef[] = []; refsOf(o, refs)
        refs.forEach(r => { if (r.kind === 'style' && r.prop === prop) setRef(r, hex) })
      }
    }
    canvas.fire('object:modified', { target: o })
  }
  canvas.requestRenderAll()
}

// ── palette da foto (k-means) ───────────────────────────────────────────────

/** I colori dominanti di un'immagine, dal più presente. */
export function extractPalette(el: CanvasImageSource & { width: number; height: number }, k = 6): string[] {
  const S = 72
  const c = document.createElement('canvas'), ratio = el.width / el.height || 1
  c.width = ratio >= 1 ? S : Math.max(8, Math.round(S * ratio)); c.height = ratio >= 1 ? Math.max(8, Math.round(S / ratio)) : S
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(el, 0, 0, c.width, c.height)
  const d = ctx.getImageData(0, 0, c.width, c.height).data
  const px: [number, number, number][] = []
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) px.push([d[i], d[i + 1], d[i + 2]])
  if (!px.length) return []
  const dist = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  // inizio deterministico: il colore medio, poi ogni volta il più lontano dai centri già scelti
  const mean = px.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map(v => v / px.length)
  const centers: number[][] = []
  const minD = new Float64Array(px.length).fill(Infinity)
  let next: number[] = mean
  for (let j = 0; j < Math.min(k, px.length); j++) {
    centers.push([...next])
    let far = 0, best = -1
    px.forEach((p, i) => { minD[i] = Math.min(minD[i], dist(p, next)); if (minD[i] > best) { best = minD[i]; far = i } })
    next = px[far]
  }
  const assign = new Int32Array(px.length)
  for (let it = 0; it < 12; it++) {
    px.forEach((p, i) => { let bi = 0, bd = Infinity; centers.forEach((cc, j) => { const dd = dist(p, cc); if (dd < bd) { bd = dd; bi = j } }); assign[i] = bi })
    const sum = centers.map(() => [0, 0, 0, 0])
    px.forEach((p, i) => { const s = sum[assign[i]]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++ })
    sum.forEach((s, j) => { if (s[3]) centers[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]] })
  }
  const counts = centers.map((_, j) => ({ j, n: 0 }))
  assign.forEach(a => counts[a].n++)
  const out: string[] = []
  const kept: number[][] = []
  for (const { j, n } of counts.sort((a, b) => b.n - a.n)) {
    // via i gruppi minuscoli (pixel di bordo sfumati) e i quasi doppioni
    if (n < px.length * 0.02 || kept.some(k2 => dist(k2, centers[j]) < 18 * 18)) continue
    kept.push(centers[j])
    const hex = toHex({ r: centers[j][0], g: centers[j][1], b: centers[j][2], a: 1 })
    if (!out.includes(hex)) out.push(hex)
  }
  return out
}

// ── armonie ─────────────────────────────────────────────────────────────────

export type Harmony = 'complementare' | 'analoghi' | 'triade' | 'complementari divisi' | 'tetrade' | 'monocromatica'
export const HARMONIES: Harmony[] = ['complementare', 'analoghi', 'triade', 'complementari divisi', 'tetrade', 'monocromatica']

export function harmony(base: string, kind: Harmony): string[] {
  const c = parse(base) ?? { r: 124, g: 58, b: 237, a: 1 }
  const [h, s, l] = rgbToHsl(c)
  const at = (dh: number, ss = s, ll = l) => toHex(hslToRgb(h + dh, ss, ll))
  switch (kind) {
    case 'complementare': return [at(0), at(0, s, Math.min(0.9, l + 0.25)), at(180), at(180, s, Math.max(0.12, l - 0.2))]
    case 'analoghi': return [at(-60), at(-30), at(0), at(30), at(60)]
    case 'triade': return [at(0), at(120), at(240)]
    case 'complementari divisi': return [at(0), at(150), at(210)]
    case 'tetrade': return [at(0), at(90), at(180), at(270)]
    case 'monocromatica': return [0.15, 0.32, 0.5, 0.68, 0.85].map(L => at(0, s, L))
  }
}

// ── ricolora grafica ────────────────────────────────────────────────────────

export interface RecolorAdjust { hue: number; sat: number; light: number } // gradi, −100…100, −100…100

/**
 * Sessione di ricolorazione: si ricordano i colori originali, così ogni modifica
 * (mappa colore→colore e regolazioni globali) riparte da quelli e non si accumula.
 */
export class Recolor {
  readonly colors: ColorUse[]
  private originals: { ref: ColorRef; value: string; key: string }[] = []

  constructor(objs: fabric.FabricObject[]) {
    this.colors = collectColors(objs)
    for (const u of this.colors) for (const ref of u.refs) this.originals.push({ ref, value: getRef(ref)!, key: u.key })
  }

  get empty() { return !this.colors.length }

  apply(map: Record<string, string>, adj: RecolorAdjust) {
    const touched = new Set<fabric.FabricObject>()
    for (const { ref, value, key } of this.originals) {
      const orig = parse(value)
      if (!orig) continue
      const base = map[key] ? { ...parse(map[key])!, a: orig.a } : orig
      let out = base
      if (adj.hue || adj.sat || adj.light) {
        const [h, s, l] = rgbToHsl(base)
        const s2 = adj.sat >= 0 ? s + (1 - s) * adj.sat / 100 : s * (1 + adj.sat / 100)
        const l2 = adj.light >= 0 ? l + (1 - l) * adj.light / 100 : l * (1 + adj.light / 100)
        out = hslToRgb(h + adj.hue, s2, l2, base.a)
      }
      setRef(ref, toCss(out))
      touched.add(ref.obj)
    }
    return touched
  }

  /** Ripristina i colori di partenza. */
  reset() { for (const { ref, value } of this.originals) setRef(ref, value) }

  /**
   * Assegna una palette ai colori della grafica per luminosità: il più chiaro al più
   * chiaro, il più scuro al più scuro (come "Ricolora" con una libreria di colori).
   */
  mapToPalette(palette: string[]): Record<string, string> {
    const pal = palette.map(p => ({ p, l: luma(parse(p)!) })).sort((a, b) => b.l - a.l)
    const src = this.colors.map(u => ({ key: u.key, l: luma(parse(u.hex)!) })).sort((a, b) => b.l - a.l)
    const out: Record<string, string> = {}
    src.forEach((s, i) => {
      const t = src.length === 1 ? 0 : i / (src.length - 1)
      out[s.key] = pal[Math.round(t * (pal.length - 1))].p
    })
    return out
  }
}

// ── campioni salvati (per questo computer) ──────────────────────────────────

const KEY = 'studio.swatches'
export function loadSwatches(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [] } catch { return [] }
}
export function saveSwatches(list: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 120))) } catch { /* archiviazione non disponibile */ }
}

/** Mette sul canvas una striscia di campioni con il codice sotto (come la palette di un moodboard). */
export function placePalette(canvas: fabric.Canvas, colors: string[], at: { x: number; y: number }) {
  const S = 80, G = 8
  const items: fabric.FabricObject[] = []
  colors.forEach((hex, i) => {
    const x = i * (S + G)
    items.push(new fabric.Rect({ left: x, top: 0, width: S, height: S, fill: hex, rx: 6, ry: 6, originX: 'left', originY: 'top', strokeWidth: 0 }))
    items.push(new fabric.FabricText(hex.toUpperCase(), { left: x, top: S + 8, fontSize: 12, fontFamily: 'monospace', fill: '#555555', originX: 'left', originY: 'top' }))
  })
  const g = new fabric.Group(items)
  g.set('name', 'Palette')
  g.setPositionByOrigin(new fabric.Point(at.x, at.y), 'center', 'center')
  g.setCoords()
  canvas.add(g)
  canvas.setActiveObject(g)
  canvas.requestRenderAll()
  return g
}
