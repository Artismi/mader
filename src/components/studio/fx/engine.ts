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
import { fxPadding, fxSpeed, isActive, renderFx, type FxData } from './render'
import { onAssetReady } from './gl'

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
}
type FxObject = fabric.FabricObject & FxState

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

  // Immagini e gruppi ridefiniscono questi metodi: vanno agganciati anche loro
  for (const cls of [fabric.FabricObject, fabric.FabricImage, fabric.Group]) {
    const proto = cls.prototype as unknown as Record<string, (...a: unknown[]) => unknown>
    if (Object.prototype.hasOwnProperty.call(proto, 'shouldCache')) {
      const shouldCache = proto.shouldCache
      proto.shouldCache = function (this: FxObject) {
        if (active(this)) { (this as unknown as { ownCaching: boolean }).ownCaching = true; return true }
        return shouldCache.call(this)
      }
    }
    if (Object.prototype.hasOwnProperty.call(proto, 'drawObject')) {
      const drawObject = proto.drawObject
      proto.drawObject = function (this: FxObject, ...args: unknown[]) {
        const r = drawObject.apply(this, args)
        if (args[0] === (this as unknown as { _cacheContext: unknown })._cacheContext) this._fxStale = true
        return r
      }
    }
  }

  const P = fabric.FabricObject.prototype as unknown as Record<string, (...a: unknown[]) => unknown>
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
    if (!active(this)) return drawCache.apply(this, args)
    const self = this as unknown as { _cacheCanvas: HTMLCanvasElement; zoomX: number; zoomY: number; cacheTranslationX: number; cacheTranslationY: number }
    const src = self._cacheCanvas
    const out = this._fxCanvas ?? (this._fxCanvas = document.createElement('canvas'))
    if (this._fxStale || out.width !== src.width || out.height !== src.height) {
      if (!renderFx(src, out, { adjust: this.adjust, look: this.look, fx: this.fx }, self.zoomX, this._fxTime ?? 0)) return drawCache.apply(this, args)
      this._fxStale = false
    }
    ctx.scale(1 / self.zoomX, 1 / self.zoomY)
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
  if (process.env.NODE_ENV !== 'production') Object.assign(window, { __fx: { newFx, fxDef, LOOKS, applyFx, canvas, fabric } })
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
  for (const it of items) res[it.key] = renderFx(b.box, out, { fx: [{ ...it.entry, p: { ...it.entry.p, speed: 0, flicker: 0 } }] }, b.z, 0.37) ? out.toDataURL() : b.box.toDataURL()
  return res
}

export const variantEntries = (id: FxId) => (fxDef(id)?.variants ?? []).map(v => ({ key: v.id, entry: newFx(id, v.id) }))
