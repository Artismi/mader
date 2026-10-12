/**
 * Motore effetti: regolazioni, filtri pronti ed effetti su QUALSIASI oggetto
 * Fabric (testo, forme, tratti, immagini, gruppi).
 *
 * Aggancio alla cache di Fabric 7:
 * 1. un oggetto con effetti viene sempre disegnato nella sua cache (shouldCache),
 *    allargata del margine che serve a ombre e bagliori;
 * 2. quando la cache viene ridisegnata (drawObject sul contesto di cache) la
 *    segniamo "da rifare";
 * 3. al momento di copiarla sul canvas (drawCacheOnCanvas) la passiamo nel
 *    renderer WebGL2 (fx/render.ts). Le animazioni rifanno solo questo punto.
 *
 * Gli effetti sono DATI sull'oggetto (`adjust`, `look`, `fx`) salvati nel JSON:
 * tutto si ricostruisce dopo caricamento, annulla, incolla.
 */
import * as fabric from 'fabric'
import { LOOKS, fxDef, migrateFx, newFx, type Adjust, type FxEntry, type FxId, type Look } from './catalog'
import { forgetStroke, fxPadding, fxSpeed, isActive, renderFx, type FxData } from './render'
import { onAssetReady } from './gl'
import { ensureFont } from '../libraries/font-loader'
import { TEXT_STYLES, type TextStyle } from './text-styles'

interface FxState {
  adjust?: Adjust
  look?: Look
  fx?: FxEntry[]
  _fxOn?: boolean
  _fxPad?: number
  _fxStale?: boolean
  _fxCanvas?: HTMLCanvasElement
  _fxSpeed?: number
  _fxTime?: number
  _fxDisabled?: boolean
  /** corpo del testo su cui gli effetti sono tarati: cambiando corpo, gli effetti scalano con lui */
  fxRef?: number
}
type FxObject = fabric.FabricObject & FxState

/** fattore di scala degli effetti: misure tarate su `fxRef` px di corpo, riportate al corpo vero */
export function fxScale(obj: fabric.FabricObject) {
  const o = obj as FxObject
  if (!o.fxRef || !(obj instanceof fabric.Text)) return 1
  return Math.min(10, Math.max(0.05, (obj.fontSize ?? o.fxRef) / o.fxRef))
}

/** Rilegge i dati dell'oggetto: margine, animazione, da ridisegnare */
export function applyFx(obj: fabric.FabricObject) {
  const o = obj as FxObject
  // progetti della prima versione: l'ombra era quella nativa di Fabric
  if (o.fx?.some(e => (e.id as string) === 'shadow')) o.set('shadow', null)
  o.fx = migrateFx(o.fx)
  const data: FxData = { adjust: o.adjust, look: o.look, fx: o.fx }
  o._fxOn = isActive(data)
  o._fxPad = o._fxOn ? fxPadding(data) : 0
  o._fxSpeed = o._fxOn ? fxSpeed(data) : 0
  o._fxTime = o._fxTime ?? 0
  o._fxStale = true
  o.set('dirty', true)
  syncTicker(o)
  if (o instanceof fabric.Group) o.getObjects().forEach(c => { if (hasFx(c)) applyFx(c) })
}

export const hasFx = (obj: fabric.FabricObject) => {
  const o = obj as FxObject
  return !!(o.fx?.length || o.look || (o.adjust && Object.values(o.adjust).some(x => x)))
}

/* ───────── aggancio alla cache (una volta sola) ───────── */
let installed = false
export function installFxEngine() {
  if (installed) return
  installed = true
  // i video ridisegnano un fotogramma nuovo a ogni tick: niente cache, quindi niente effetti per ora
  const active = (o: FxObject) => !!o._fxOn && !o._fxDisabled && !(o as { isVideo?: boolean }).isVideo

  // Immagini e gruppi ridefiniscono questi metodi: vanno agganciati anche loro.
  // In Fabric 7 shouldCache e drawObject di testi e forme stanno su una classe
  // interna, antenata di FabricObject: sulla base si aggancia sempre (il metodo
  // ereditato viene avvolto), sulle sottoclassi solo se lo ridefiniscono.
  for (const cls of [fabric.FabricObject, fabric.FabricImage, fabric.Group]) {
    const proto = cls.prototype as unknown as Record<string, (...a: unknown[]) => unknown>
    const own = (k: string) => cls === fabric.FabricObject || Object.prototype.hasOwnProperty.call(proto, k)
    if (own('shouldCache')) {
      const shouldCache = proto.shouldCache
      proto.shouldCache = function (this: FxObject) {
        if (active(this)) { (this as unknown as { ownCaching: boolean }).ownCaching = true; return true }
        return shouldCache.call(this)
      }
    }
    if (own('drawObject')) {
      const drawObject = proto.drawObject
      proto.drawObject = function (this: FxObject, ...args: unknown[]) {
        const r = drawObject.apply(this, args)
        if (args[0] === (this as unknown as { _cacheContext: unknown })._cacheContext) {
          this._fxStale = true
          const cv = (this as unknown as { _cacheCanvas?: HTMLCanvasElement })._cacheCanvas
          if (cv) forgetStroke(cv)
        }
        return r
      }
    }
  }

  // pixel massimi della cache supercampionata (oltre si scende a 1.5x o a 1x)
  const SS_LIMIT = 16_000_000
  fabric.config.configure({ perfLimitSizeTotal: SS_LIMIT, maxCacheSideLimit: 8192 })
  const P = fabric.FabricObject.prototype as unknown as Record<string, (...a: unknown[]) => unknown>
  const dims = P._getCacheCanvasDimensions
  P._getCacheCanvasDimensions = function (this: FxObject) {
    const d = dims.call(this) as { width: number; height: number; zoomX: number; zoomY: number; x: number; y: number }
    if (!active(this)) return d
    if (this._fxPad) {
      const k = fxScale(this)
      d.width += Math.ceil(this._fxPad * k * 2 * d.zoomX)
      d.height += Math.ceil(this._fxPad * k * 2 * d.zoomY)
    }
    // supercampionamento: gli effetti si calcolano al doppio della risoluzione e poi si
    // riducono, così bordi, filetti e grane escono puliti invece che seghettati
    const ss = d.width * d.height * 4 <= SS_LIMIT ? 2 : d.width * d.height * 2.25 <= SS_LIMIT ? 1.5 : 1
    if (ss > 1) { d.width = Math.ceil(d.width * ss); d.height = Math.ceil(d.height * ss); d.zoomX *= ss; d.zoomY *= ss; (d as { x: number }).x *= ss; (d as { y: number }).y *= ss }
    return d
  }

  const drawCache = P.drawCacheOnCanvas
  P.drawCacheOnCanvas = function (this: FxObject, ...args: unknown[]) {
    const ctx = args[0] as CanvasRenderingContext2D
    if (!active(this)) return drawCache.apply(this, args)
    const self = this as unknown as { _cacheCanvas: HTMLCanvasElement; zoomX: number; zoomY: number; cacheTranslationX: number; cacheTranslationY: number }
    const src = self._cacheCanvas
    const out = this._fxCanvas ?? (this._fxCanvas = document.createElement('canvas'))
    if (this._fxStale || out.width !== src.width || out.height !== src.height) {
      if (!renderFx(src, out, { adjust: this.adjust, look: this.look, fx: this.fx }, self.zoomX * fxScale(this), this._fxTime ?? 0)) return drawCache.apply(this, args)
      this._fxStale = false
    }
    ctx.scale(1 / self.zoomX, 1 / self.zoomY)
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(out, -self.cacheTranslationX, -self.cacheTranslationY)
  }
}

/* ───────── animazione: rifà solo gli effetti, non il disegno dell'oggetto ───────── */
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
    o._fxTime = (o._fxTime ?? 0) + dt * Math.max(0.2, (o._fxSpeed ?? 0) / 40)
    o._fxStale = true
    if (o.group) o.group.set('dirty', true)
    const c = o.canvas ?? o.group?.canvas
    if (c) canvases.add(c)
  }
  canvases.forEach(c => c.requestRenderAll())
  raf = animated.size ? requestAnimationFrame(tick) : 0
}

/** Collega un canvas: ogni oggetto aggiunto (anche da JSON, annulla, incolla) ritrova i suoi effetti */
export function attachFx(canvas: fabric.Canvas) {
  installFxEngine()
  // in sviluppo il catalogo è raggiungibile dalla console (e dai test nel browser)
  if (process.env.NODE_ENV !== 'production') Object.assign(window, { __fx: { newFx, fxDef, LOOKS, applyFx, applyTextStyle, TEXT_STYLES, canvas, fabric } })
  const visit = (o: fabric.FabricObject) => {
    if (hasFx(o)) applyFx(o)
    if (o instanceof fabric.Group) o.getObjects().forEach(visit)
  }
  const onAdded = (e: { target: fabric.FabricObject }) => visit(e.target)
  const onRemoved = (e: { target: fabric.FabricObject }) => animated.delete(e.target as FxObject)
  canvas.on('object:added', onAdded)
  canvas.on('object:removed', onRemoved)
  canvas.getObjects().forEach(visit)
  // quando arriva la texture di un materiale, gli oggetti che la usano si ridisegnano
  const stopAssets = onAssetReady(() => {
    const mark = (o: fabric.FabricObject) => { if ((o as FxObject)._fxOn) { (o as FxObject)._fxStale = true; o.set('dirty', true) } if (o instanceof fabric.Group) o.getObjects().forEach(mark) }
    canvas.getObjects().forEach(mark); canvas.requestRenderAll()
  })
  return () => { canvas.off('object:added', onAdded); canvas.off('object:removed', onRemoved); stopAssets() }
}

/* ───────── anteprime (miniature come in Canva) ───────── */
/** l'oggetto senza effetti, centrato su un riquadro con margine per ombre e bagliori */
function baseImage(obj: fabric.FabricObject, size: number) {
  const o = obj as FxObject
  const w = obj.getScaledWidth(), h = obj.getScaledHeight()
  if (!w || !h) return null
  const m = Math.min(2, (size * 0.62) / Math.max(w, h))
  o._fxDisabled = true
  let img: HTMLCanvasElement
  try { img = obj.toCanvasElement({ multiplier: m }) } finally { o._fxDisabled = false }
  const box = document.createElement('canvas')
  box.width = box.height = size
  box.getContext('2d')!.drawImage(img, (size - img.width) / 2, (size - img.height) / 2)
  return { box, z: m }
}

export function lookPreviews(obj: fabric.FabricObject, size = 84): Record<string, string> {
  const b = baseImage(obj, size); if (!b) return {}
  const res: Record<string, string> = { '': b.box.toDataURL() }
  const out = document.createElement('canvas')
  for (const l of LOOKS) res[l.id] = renderFx(b.box, out, { look: { id: l.id, amount: 100 } }, b.z, 0) ? out.toDataURL() : res['']
  return res
}

/** anteprime per ogni effetto (prima variante) o per le varianti di un effetto */
export function fxPreviews(obj: fabric.FabricObject, items: { key: string; entry: FxEntry }[], size = 84): Record<string, string> {
  const b = baseImage(obj, size); if (!b) return {}
  const res: Record<string, string> = {}
  const out = document.createElement('canvas')
  for (const it of items) res[it.key] = renderFx(b.box, out, { fx: [{ ...it.entry, p: { ...it.entry.p, speed: 0, flicker: 0 } }] }, b.z * fxScale(obj), 0.37) ? out.toDataURL() : b.box.toDataURL()
  return res
}

export const variantEntries = (id: FxId) => (fxDef(id)?.variants ?? []).map(v => ({ key: v.id, entry: newFx(id, v.id) }))

/** corpo di riferimento su cui sono tarati stili ed effetti del testo */
export const TEXT_REF = 120

/** anteprima di uno stile testo: parola d'esempio nel carattere dello stile, sul suo fondo */
export async function stylePreview(st: TextStyle, sample: string, w = 336, h = 200): Promise<string> {
  await Promise.race([ensureFont(st.family, st.weight ?? 400), new Promise(r => setTimeout(r, 4000))])
  const txt = (st.upper ? sample.toUpperCase() : sample).slice(0, 10) || 'Aa'
  const t = new fabric.Textbox(txt, { fontFamily: st.family, fontWeight: String(st.weight ?? 400), fill: st.fill, fontSize: 120, width: 3000, charSpacing: st.tracking ?? 0 })
  t.initDimensions(); t.set({ width: Math.ceil(t.calcTextWidth()) + 6 }); t.initDimensions()
  const m = Math.min(2, (w * 0.66) / t.width, (h * 0.5) / t.height)
  const img = t.toCanvasElement({ multiplier: m })
  const box = document.createElement('canvas'); box.width = w; box.height = h
  box.getContext('2d')!.drawImage(img, (w - img.width) / 2, (h - img.height) / 2)
  const out = document.createElement('canvas')
  const stack = st.fx.map(([id, v, p]) => { const e = newFx(id as FxId, v); return { ...e, p: { ...e.p, ...(p ?? {}), speed: 0, flicker: 0, spin: 0 } } })
  const ok = renderFx(box, out, { fx: stack }, m, 0.37)
  const fin = document.createElement('canvas'); fin.width = w; fin.height = h
  const fx2 = fin.getContext('2d')!
  fx2.fillStyle = st.swatch; fx2.fillRect(0, 0, w, h)
  fx2.drawImage(ok ? out : box, 0, 0)
  return fin.toDataURL('image/webp', 0.95)
}

/** applica uno stile testo: carattere, colore e pila di effetti (poi tutto resta modificabile) */
export async function applyTextStyle(obj: fabric.FabricObject, st: TextStyle, background?: string) {
  if (!(obj instanceof fabric.Text)) return
  await Promise.race([ensureFont(st.family, st.weight ?? 400), new Promise(r => setTimeout(r, 5000))])
  // se il colore dello stile sparisce sul fondo vero (testo bianco su tavola bianca), si usa il suo opposto
  const lum = (c: string) => { const m = /^#?([0-9a-f]{6})$/i.exec(c); if (!m) return 0.5; const n = parseInt(m[1], 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 }
  const fill = background && Math.abs(lum(st.fill) - lum(background)) < 0.3 && Math.abs(lum(st.swatch) - lum(background)) > 0.3 ? st.swatch : st.fill
  obj.set({ fontFamily: st.family, fontWeight: String(st.weight ?? 400), fill, charSpacing: st.tracking ?? obj.charSpacing })
  if (st.upper && obj.text) obj.set('text', obj.text.toUpperCase())
  ;(obj as FxObject).fxRef = TEXT_REF
  ;(obj as FxObject).fx = st.fx.map(([id, v, p]) => { const e = newFx(id as FxId, v); return { ...e, p: { ...e.p, ...(p ?? {}) } } })
  ;(fabric as unknown as { cache?: { clearFontCache?: (f?: string) => void } }).cache?.clearFontCache?.(st.family)
  obj.initDimensions(); obj.setCoords(); obj.set('dirty', true)
  applyFx(obj)
}
