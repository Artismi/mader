/**
 * Motore effetti: applica regolazioni, filtri pronti ed effetti a QUALSIASI
 * oggetto Fabric (testo, forme, tratti, immagini, gruppi), non solo alle immagini.
 *
 * Come funziona (Fabric 7):
 * 1. un oggetto con effetti viene sempre disegnato nella sua cache (shouldCache);
 * 2. quando la cache viene ridisegnata (drawObject sul contesto di cache) la
 *    segniamo "da filtrare";
 * 3. al momento di copiarla sul canvas (drawCacheOnCanvas) passiamo la cache nei
 *    filtri WebGL e copiamo il risultato. Le animazioni rifanno solo il punto 3.
 * La cache viene allargata del margine che serve a bagliori e contorni.
 *
 * Gli effetti sono DATI sull'oggetto (`adjust`, `look`, `fx`), salvati nel JSON:
 * i filtri si ricostruiscono da lì dopo ogni caricamento, annulla o incolla.
 */
import * as fabric from 'fabric'
import { getFilterBackend, config } from 'fabric'
import { fxDef, LOOKS, type Adjust, type FxEntry, type Look } from './catalog'
import {
  FxBlur, FxChroma, FxDuotone, FxFinish, FxGlitch, FxGlow, FxHalftone, FxOutline,
  FxPixel, FxPosterize, FxRiso, FxSharpen, FxTone, FxVhs, FxWave, hexToRgb,
} from './filters'

type AnyFilter = InstanceType<typeof fabric.filters.BaseFilter> & { uZoom?: number; uTime?: number }
interface FxState {
  adjust?: Adjust
  look?: Look
  fx?: FxEntry[]
  _fxFilters?: AnyFilter[]
  _fxPad?: number
  _fxStale?: boolean
  _fxCanvas?: HTMLCanvasElement
  _fxSpeed?: number
  _fxTime?: number
  _fxDisabled?: boolean
  _fxOwnsShadow?: boolean
}
type FxObject = fabric.FabricObject & FxState

/* ───────── dati → filtri ───────── */
const v = (a: Adjust, k: keyof Adjust) => (a[k] ?? 0) / 100

/** regolazioni effettive: quelle a mano + il filtro pronto scalato per la sua intensità */
export function effectiveAdjust(o: FxState): Adjust {
  const out: Adjust = { ...(o.adjust ?? {}) }
  const look = o.look && LOOKS.find(l => l.id === o.look!.id)
  if (look) {
    const k = (o.look!.amount ?? 100) / 100
    for (const [key, val] of Object.entries(look.adjust)) {
      const kk = key as keyof Adjust
      out[kk] = Math.max(-100, Math.min(100, (out[kk] ?? 0) + (val ?? 0) * k))
    }
  }
  return out
}

function toneAndFinish(a: Adjust) {
  const pre: AnyFilter[] = [], tone: AnyFilter[] = [], post: AnyFilter[] = []
  if (a.blur) { pre.push(new FxBlur({ radius: a.blur * 0.3, horizontal: true }), new FxBlur({ radius: a.blur * 0.3, horizontal: false })) }
  if (a.sharpen) pre.push(new FxSharpen({ amount: v(a, 'sharpen') }))
  const t = { bri: v(a, 'brightness'), con: v(a, 'contrast'), hi: v(a, 'highlights'), sh: v(a, 'shadows'), temp: v(a, 'temperature'), tint: v(a, 'tint'), sat: v(a, 'saturation'), vib: v(a, 'vibrance'), fade: v(a, 'fade') }
  if (Object.values(t).some(x => x !== 0)) tone.push(new FxTone(t))
  if (a.vignette || a.grain) post.push(new FxFinish({ vig: v(a, 'vignette'), grain: v(a, 'grain') }))
  return { pre, tone, post }
}

function fxFilter(e: FxEntry): AnyFilter | null {
  const p = e.p, amount = e.amount / 100
  const num = (k: string, d = 0) => Number(p[k] ?? d)
  const col = (k: string, d: string) => hexToRgb(String(p[k] ?? d))
  switch (e.id) {
    case 'glow': return new FxGlow({ size: num('size', 18), strength: num('strength', 70) / 100, color: col('color', '#ffd166'), neon: 0, amount })
    case 'neon': return new FxGlow({ size: num('size', 14), strength: num('strength', 85) / 100, color: col('color', '#3df5ff'), neon: 1, amount })
    case 'outline': return new FxOutline({ width: num('width', 6), color: col('color', '#ffffff'), amount })
    case 'duotone': return new FxDuotone({ c1: col('c1', '#1d1a6e'), c2: col('c2', '#ff7aa8'), amount })
    case 'posterize': return new FxPosterize({ levels: num('levels', 4), amount })
    case 'halftone': return new FxHalftone({ size: num('size', 9), angle: num('angle', 45), ink: col('ink', '#111111'), paper: col('paper', '#f4efe6'), paperOn: num('paperOn'), colored: num('colored', 1), amount })
    case 'riso': return new FxRiso({ ink1: col('ink1', '#ff48b0'), ink2: col('ink2', '#0078bf'), paper: col('paper', '#f2ede4'), size: num('size', 6), offset: num('offset', 4), amount })
    case 'pixel': return new FxPixel({ size: num('size', 10), amount })
    case 'chroma': return new FxChroma({ px: num('px', 6), amount })
    case 'glitch': return new FxGlitch({ power: num('power', 40) / 100, seed: 1 + (num('power') % 7), amount })
    case 'wave': return new FxWave({ amp: num('amp', 8), freq: num('freq', 6), amount })
    case 'vhs': return new FxVhs({ power: num('power', 60) / 100, amount })
    default: return null
  }
}

/** Ricostruisce filtri, margine, ombra e animazione dai dati salvati sull'oggetto */
export function applyFx(obj: fabric.FabricObject) {
  const o = obj as FxObject
  const { pre, tone, post } = toneAndFinish(effectiveAdjust(o))
  const stack = (o.fx ?? []).filter(e => e.on)
  const mid: AnyFilter[] = []
  let pad = 0, speed = 0
  for (const e of stack) {
    const d = fxDef(e.id)
    if (e.id === 'shadow') continue
    const f = fxFilter(e)
    if (f) mid.push(f)
    pad = Math.max(pad, d?.pad?.(e.p) ?? 0)
    if (d?.animated) speed = Math.max(speed, Number(e.p.speed ?? 0))
  }
  o._fxFilters = [...pre, ...tone, ...mid, ...post]
  o._fxPad = pad
  o._fxSpeed = speed
  o._fxTime = o._fxTime ?? 0
  o._fxStale = true

  // l'ombra è nativa di Fabric: segue la forma filtrata e non viene tagliata dalla cache
  const sh = stack.find(e => e.id === 'shadow')
  if (sh) {
    const p = sh.p, ang = (Number(p.angle ?? 90) * Math.PI) / 180, dist = Number(p.distance ?? 12)
    const [r, g, b] = hexToRgb(String(p.color ?? '#000000')).map(x => Math.round(x * 255))
    o.set('shadow', new fabric.Shadow({ color: `rgba(${r},${g},${b},${Number(p.opacity ?? 35) / 100})`, blur: Number(p.blur ?? 24), offsetX: Math.cos(ang) * dist, offsetY: Math.sin(ang) * dist }))
    o._fxOwnsShadow = true
  } else if (o._fxOwnsShadow) {
    o.set('shadow', null); o._fxOwnsShadow = false
  }
  o.set('dirty', true)
  syncTicker(o)
  if (o instanceof fabric.Group) o.getObjects().forEach(c => { if (hasFx(c)) applyFx(c) })
}

export const hasFx = (obj: fabric.FabricObject) => {
  const o = obj as FxObject
  return !!(o.fx?.length || o.look || (o.adjust && Object.values(o.adjust).some(x => x)))
}

/* ───────── aggancio alla cache di Fabric (una volta sola) ───────── */
let installed = false
let warned = false
export function installFxEngine() {
  if (installed) return
  installed = true
  config.configure({ textureSize: 4096 })
  const P = fabric.FabricObject.prototype as unknown as Record<string, (...a: unknown[]) => unknown>
  // i video ridisegnano un fotogramma nuovo a ogni tick: niente cache, quindi niente effetti per ora
  const active = (o: FxObject) => !!o._fxFilters?.length && !o._fxDisabled && !(o as { isVideo?: boolean }).isVideo

  // Immagini e gruppi ridefiniscono questi metodi: vanno agganciati anche loro
  const protos = [fabric.FabricObject, fabric.FabricImage, fabric.Group].map(c => c.prototype as unknown as Record<string, (...a: unknown[]) => unknown>)
  for (const proto of protos) {
    if (Object.prototype.hasOwnProperty.call(proto, 'shouldCache')) {
      const shouldCache = proto.shouldCache
      proto.shouldCache = function (this: FxObject) {
        if (active(this)) { (this as unknown as { ownCaching: boolean }).ownCaching = true; return true }
        return shouldCache.call(this)
      }
    }
    if (Object.prototype.hasOwnProperty.call(proto, 'drawObject')) {
      const drawObject = proto.drawObject
      proto.drawObject = function (this: FxObject, ctx: unknown, ...rest: unknown[]) {
        const r = drawObject.call(this, ctx, ...rest)
        if (ctx === (this as unknown as { _cacheContext: unknown })._cacheContext) this._fxStale = true
        return r
      }
    }
  }

  const dims = P._getCacheCanvasDimensions
  P._getCacheCanvasDimensions = function (this: FxObject) {
    const d = dims.call(this) as { width: number; height: number; zoomX: number; zoomY: number }
    if (active(this) && this._fxPad) {
      d.width += Math.ceil(this._fxPad * 2 * d.zoomX)
      d.height += Math.ceil(this._fxPad * 2 * d.zoomY)
    }
    return d
  }

  const drawCache = P.drawCacheOnCanvas
  P.drawCacheOnCanvas = function (this: FxObject, ...args: unknown[]) {
    const ctx = args[0] as CanvasRenderingContext2D
    if (!active(this)) return drawCache.call(this, ctx)
    const self = this as unknown as { _cacheCanvas: HTMLCanvasElement; zoomX: number; zoomY: number; cacheTranslationX: number; cacheTranslationY: number }
    const src = self._cacheCanvas
    const out = this._fxCanvas ?? (this._fxCanvas = document.createElement('canvas'))
    if (this._fxStale || out.width !== src.width || out.height !== src.height) {
      if (!runFilters(this._fxFilters!, src, out, self.zoomX, this._fxTime ?? 0)) return drawCache.call(this, ctx)
      this._fxStale = false
    }
    ctx.scale(1 / self.zoomX, 1 / self.zoomY)
    ctx.drawImage(out, -self.cacheTranslationX, -self.cacheTranslationY)
  }
}

/** Passa `src` nei filtri e scrive in `out`. false se WebGL non c'è o qualcosa va storto. */
function runFilters(list: AnyFilter[], src: HTMLCanvasElement, out: HTMLCanvasElement, zoom: number, time: number) {
  const backend = getFilterBackend() as unknown as { gl?: WebGLRenderingContext; tileSize?: number; applyFilters: (...a: unknown[]) => void }
  if (!backend?.gl || src.width > (backend.tileSize ?? 4096) || src.height > (backend.tileSize ?? 4096) || !src.width || !src.height) {
    if (!warned) { console.warn('[fx] WebGL non disponibile o cache troppo grande: effetti non applicati'); warned = true }
    return false
  }
  for (const f of list) { f.uZoom = zoom; f.uTime = time }
  out.width = src.width; out.height = src.height
  try {
    backend.applyFilters(list, src, src.width, src.height, out)
    return true
  } catch (e) {
    if (!warned) { console.warn('[fx] filtro non riuscito', e); warned = true }
    return false
  }
}

/* ───────── animazione: rifà solo i filtri, non il disegno dell'oggetto ───────── */
const animated = new Set<FxObject>()
let raf = 0, last = 0
function syncTicker(o: FxObject) {
  if (o._fxSpeed && o._fxSpeed > 0) animated.add(o); else animated.delete(o)
  if (animated.size && !raf) { last = performance.now(); raf = requestAnimationFrame(tick) }
}
function tick(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now
  const canvases = new Set<fabric.StaticCanvas>()
  for (const o of animated) {
    if (!o.canvas && !o.group) { animated.delete(o); continue }
    o._fxTime = (o._fxTime ?? 0) + dt * (o._fxSpeed ?? 0) / 25
    o._fxStale = true
    const c = o.canvas ?? o.group?.canvas
    if (o.group) o.group.set('dirty', true)
    if (c) canvases.add(c)
  }
  canvases.forEach(c => c.requestRenderAll())
  raf = animated.size ? requestAnimationFrame(tick) : 0
}

/** Collega un canvas: ogni oggetto aggiunto (anche da JSON, annulla, incolla) ritrova i suoi effetti */
export function attachFx(canvas: fabric.Canvas) {
  installFxEngine()
  const visit = (o: fabric.FabricObject) => {
    if (hasFx(o)) applyFx(o)
    if (o instanceof fabric.Group) o.getObjects().forEach(visit)
  }
  const onAdded = (e: { target: fabric.FabricObject }) => visit(e.target)
  const onRemoved = (e: { target: fabric.FabricObject }) => animated.delete(e.target as FxObject)
  canvas.on('object:added', onAdded)
  canvas.on('object:removed', onRemoved)
  canvas.getObjects().forEach(visit)
  return () => { canvas.off('object:added', onAdded); canvas.off('object:removed', onRemoved) }
}

/* ───────── anteprime dei filtri pronti (miniature come in Canva) ───────── */
export function lookPreviews(obj: fabric.FabricObject, size = 72): Record<string, string> {
  const o = obj as FxObject
  const res: Record<string, string> = {}
  const w = obj.getScaledWidth(), h = obj.getScaledHeight()
  if (!w || !h) return res
  o._fxDisabled = true
  let base: HTMLCanvasElement
  try {
    base = obj.toCanvasElement({ multiplier: Math.min(2, size / Math.max(w, h)) })
  } finally { o._fxDisabled = false }
  const out = document.createElement('canvas')
  for (const look of [{ id: '', adjust: {} as Adjust }, ...LOOKS]) {
    const { pre, tone, post } = toneAndFinish(look.adjust)
    const list = [...pre, ...tone, ...post]
    if (!list.length) { res[look.id] = base.toDataURL(); continue }
    res[look.id] = runFilters(list, base, out, 0.3, 0) ? out.toDataURL() : base.toDataURL()
  }
  return res
}
