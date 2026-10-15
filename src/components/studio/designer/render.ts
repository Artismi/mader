/**
 * Dalla scena agli oggetti Fabric sulla tavola: testi modificabili (righe già
 * spezzate dal motore), forme, filetti e foto ritagliate "a riempimento".
 */
import * as fabric from 'fabric'
import type { FxSpec, Scene, SceneEl } from './types'
import { ORNAMENTS } from '../compose/ornaments'
import { applyFx, installFxEngine } from '../fx/engine'
import { fxDef, newFx, type FxEntry, type FxId } from '../fx/catalog'
import { CELESTIAL_LIBRARY } from '../libraries/celestial-library'
import { SHAPE_LIBRARY } from '../libraries/shape-library'
import { applyFinish } from '../ai/finish'

type Obj = fabric.FabricObject & { parentBoard?: string; fx?: FxEntry[]; look?: { id: string; amount: number }; adjust?: Record<string, number> }

const GLYPHS: Record<string, string> = {}
for (const list of [...Object.values(SHAPE_LIBRARY as Record<string, { name: string; path: string }[]>), ...Object.values(CELESTIAL_LIBRARY)]) {
  for (const g of list) GLYPHS[g.name] = g.path
}

/** Effetto del motore per nome e variante (come in compose). */
const fxMaker = (id: string, variant?: string, p: Record<string, number | string> = {}): FxEntry | null => {
  if (!fxDef(id)) return null
  const e = newFx(id as FxId, variant && fxDef(id)!.variants.some(v => v.id === variant) ? variant : undefined)
  return { ...e, p: { ...e.p, ...p } }
}

/** Glifo vettoriale centrato in (cx, cy) con lato `size`. */
function glyphObj(nameOrPath: string, cx: number, cy: number, size: number, fill: string, angle = 0, opacity = 1) {
  // un nome del catalogo, oppure il tracciato di un'icona (specifica di progetto)
  const d = GLYPHS[nameOrPath] ?? (/^ *[Mm]/.test(nameOrPath) ? nameOrPath : GLYPHS.Sparkle)
  const p = new fabric.Path(d, { fill, strokeWidth: 0, opacity })
  const k = size / Math.max(p.width || 1, p.height || 1)
  p.set({ scaleX: k, scaleY: k, angle })
  p.setPositionByOrigin(new fabric.Point(cx, cy), 'center', 'center')
  return p
}

const srcOf = (u: string) => (u.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(u)}` : u)
const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T) => Promise.race([p, new Promise<T>(r => setTimeout(() => r(fallback), ms))])

function archPath(w: number, h: number) {
  const r = w / 2
  return `M 0 ${h} L 0 ${r} A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${h} Z`
}

function shapeFor(el: Extract<SceneEl, { kind: 'image' }>, left: number, top: number, fill: string, absolute: boolean): fabric.FabricObject {
  const base = { left, top, originX: 'left' as const, originY: 'top' as const, fill, strokeWidth: 0, absolutePositioned: absolute }
  if (el.shape === 'arch') return new fabric.Path(archPath(el.w, el.h), base)
  if (el.shape === 'circle') return new fabric.Circle({ ...base, radius: Math.min(el.w, el.h) / 2 })
  return new fabric.Rect({ ...base, width: el.w, height: el.h })
}

function textClip(ct: NonNullable<Extract<SceneEl, { kind: 'image' }>['clipText']>, k: number, OX: number, OY: number) {
  return new fabric.FabricText(ct.lines.join('\n'), {
    fontFamily: ct.font.family, fontWeight: ct.font.weight, fontStyle: ct.font.italic ? 'italic' : 'normal',
    fontSize: ct.size * k, lineHeight: ct.lineHeight / 1.13, charSpacing: ct.tracking * 1000,
    left: ct.x * k + OX, top: ct.y * k + OY, originX: 'left', originY: 'top', absolutePositioned: true,
  })
}

async function imageObj(el: Extract<SceneEl, { kind: 'image' }>, left: number, top: number): Promise<fabric.FabricObject> {
  const fallback = () => shapeFor(el, left, top, el.fallback, false)
  if (!el.url) return fallback()
  const img = await withTimeout<fabric.FabricImage | null>(loadImage(el.url), 20000, null)
  if (!img) return fallback()
  const iw = img.width || 1, ih = img.height || 1
  // la foto copre il riquadro `view` (di solito l'elemento stesso), poi si ritaglia sull'elemento
  const v = el.view ?? { x: el.x, y: el.y, w: el.w, h: el.h }
  const scale = Math.max(v.w / iw, v.h / ih)
  const ox = (iw - v.w / scale) / 2, oy = (ih - v.h / scale) / 2
  const cx = Math.max(0, Math.min(iw - 1, ox + (el.x - v.x) / scale)), cy = Math.max(0, Math.min(ih - 1, oy + (el.y - v.y) / scale))
  img.set({
    cropX: cx, cropY: cy, width: Math.min(iw - cx, el.w / scale), height: Math.min(ih - cy, el.h / scale),
    scaleX: scale, scaleY: scale, left, top, originX: 'left', originY: 'top',
  })
  if (el.shape && el.shape !== 'rect') img.clipPath = shapeFor(el, left, top, '#000', true)
  return img
}

/** Le stesse foto tornano in più elementi (strisce, celle): si scaricano una volta. */
const imgCache = new Map<string, Promise<HTMLImageElement | null>>()
function loadImage(url: string): Promise<fabric.FabricImage | null> {
  const src = srcOf(url)
  if (!imgCache.has(src)) imgCache.set(src, new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src }))
  return imgCache.get(src)!.then(im => (im ? new fabric.FabricImage(im) : null))
}

/** Effetti del laboratorio sull'oggetto (duotone, retino, riso, riempimenti generativi…). */
function withFx(o: Obj, fx?: FxSpec[]) {
  const list = (fx ?? []).map(f => fxMaker(f.id, f.variant, f.p)).filter(Boolean) as FxEntry[]
  if (!list.length) return
  o.fx = [...(o.fx ?? []), ...list]
  try { applyFx(o) } catch (e) { console.warn('[designer] fx', e) }
}

/** Sovrastampa e trasparenza comuni. */
function withLook(o: fabric.FabricObject, l: { blend?: GlobalCompositeOperation; opacity?: number }) {
  if (l.blend) o.set('globalCompositeOperation', l.blend)
  if (l.opacity !== undefined) o.set('opacity', l.opacity)
}

/** Ciò che esce dalla tavola si ritaglia sul suo bordo (lo Studio non ritaglia le tavole). */
function clipToBoard(o: fabric.FabricObject, OX: number, OY: number, W: number, H: number) {
  if (o.clipPath) return
  o.setCoords()
  const b = o.getBoundingRect()
  if (b.left >= OX - 1 && b.top >= OY - 1 && b.left + b.width <= OX + W + 1 && b.top + b.height <= OY + H + 1) return
  o.clipPath = new fabric.Rect({ left: OX, top: OY, width: W, height: H, originX: 'left', originY: 'top', absolutePositioned: true })
}

/** Disegna la scena sulla tavola; restituisce gli oggetti aggiunti. */
export async function renderScene(canvas: fabric.Canvas, artboard: fabric.FabricObject, sc: Scene, slug = 'tavola'): Promise<fabric.FabricObject[]> {
  installFxEngine() // le anteprime usano canvas propri: il motore effetti va agganciato anche lì
  artboard.setCoords()
  const ab = artboard.getBoundingRect()
  const W = Math.round(artboard.getScaledWidth()), H = Math.round(artboard.getScaledHeight())
  const OX = ab.left + (ab.width - W) / 2, OY = ab.top + (ab.height - H) / 2
  // la scena è disegnata per la misura della tavola; se la tavola è diversa si scala tutto
  const k = W / sc.w
  const boardName = String(artboard.get('name') ?? '')
  artboard.set('fill', sc.bg)

  const added: Obj[] = []
  const used = new Set<string>()
  const name = (n: string) => { let v = `${slug}_${n}`, i = 2; while (used.has(v)) v = `${slug}_${n}_${i++}`; used.add(v); return v }

  for (const el of sc.els) {
    let o: fabric.FabricObject | null = null
    if (el.kind === 'rect') {
      const fill = typeof el.fill === 'string' ? el.fill : new fabric.Gradient({
        type: 'linear', gradientUnits: 'percentage',
        coords: el.fill.vertical ? { x1: 0, y1: 0, x2: 0, y2: 1 } : { x1: 0, y1: 0, x2: 1, y2: 0 },
        colorStops: [{ offset: el.fill.fromAt, color: el.fill.from }, { offset: el.fill.toAt, color: el.fill.to }],
      })
      o = new fabric.Rect({ left: el.x * k, top: el.y * k, width: el.w * k, height: el.h * k, rx: (el.r ?? 0) * k, ry: (el.r ?? 0) * k, fill, opacity: el.opacity ?? 1, angle: el.angle ?? 0, stroke: el.stroke, strokeWidth: el.stroke ? (el.sw ?? 2) * k : 0 })
    } else if (el.kind === 'circle') {
      const sw = el.stroke ? (el.sw ?? 2) : 0
      o = new fabric.Circle({ left: (el.cx - el.r - sw / 2) * k, top: (el.cy - el.r - sw / 2) * k, radius: el.r * k, fill: el.fill, stroke: el.stroke, strokeWidth: sw * k })
    } else if (el.kind === 'path') {
      const p = new fabric.Path(el.d, { fill: el.fill, stroke: el.stroke, strokeWidth: el.stroke ? (el.sw ?? 2) : 0, strokeLineJoin: 'miter' })
      // il tracciato è in coordinate della tavola: si riporta l'origine dove la mette Fabric
      p.set({ scaleX: k, scaleY: k, left: (p.pathOffset.x - p.width / 2 - (el.stroke ? (el.sw ?? 2) / 2 : 0)) * k, top: (p.pathOffset.y - p.height / 2 - (el.stroke ? (el.sw ?? 2) / 2 : 0)) * k })
      o = p
    } else if (el.kind === 'line') {
      o = new fabric.Line([el.x1 * k, el.y1 * k, el.x2 * k, el.y2 * k], { stroke: el.color, strokeWidth: el.width * k, strokeDashArray: el.dash?.map(d => d * k), opacity: el.opacity ?? 1, left: (Math.min(el.x1, el.x2) - (el.x1 === el.x2 ? el.width / 2 : 0)) * k, top: (Math.min(el.y1, el.y2) - (el.y1 === el.y2 ? el.width / 2 : 0)) * k })
    } else if (el.kind === 'text') {
      const t = new fabric.IText(el.lines.join('\n'), {
        fontFamily: el.font.family, fontWeight: el.font.weight, fontStyle: el.font.italic ? 'italic' : 'normal',
        fontSize: el.size * k, fill: el.hollow ? 'transparent' : el.color, textAlign: el.align,
        lineHeight: el.lineHeight / 1.13, charSpacing: el.tracking * 1000,
        stroke: el.stroke, strokeWidth: el.stroke ? (el.sw ?? 2) * k : 0, paintFirst: el.hollow ? 'fill' : 'stroke', strokeLineJoin: 'round',
      })
      // stili per lettera: colore, saltello (deltaY), corsivo
      if (el.chars?.length) {
        const styles: Record<number, Record<number, Record<string, unknown>>> = {}
        el.chars.forEach((line, li) => line.forEach((ch, ci) => {
          if (!ch) return
          const st: Record<string, unknown> = {}
          if (ch.c) st.fill = ch.c
          if (ch.dy) st.deltaY = ch.dy * el.size * k
          if (ch.it) st.fontStyle = 'italic'
          ;(styles[li] ??= {})[ci] = st
        }))
        t.set('styles', styles)
        t.initDimensions()
      }
      const tw = t.width ?? 0
      // allineamento dentro la colonna, poi rotazione attorno all'angolo del box (come nel motore)
      const dx = el.align === 'left' ? 0 : el.align === 'right' ? el.w - tw / k : (el.w - tw / k) / 2
      const a = ((el.angle ?? 0) * Math.PI) / 180
      t.set({ left: (el.x + dx * Math.cos(a)) * k, top: (el.y + dx * Math.sin(a)) * k, angle: el.angle ?? 0 })
      o = t
    } else if (el.kind === 'arcText') {
      const r = el.r * k
      const circle = new fabric.Path(`M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r}`, { fill: '', stroke: '', visible: false })
      const size = el.size * k
      let spacing = (el.tracking ?? 0.1) * 1000
      if (el.full) {
        const probe = new fabric.FabricText(el.text, { fontFamily: el.font.family, fontWeight: el.font.weight, fontSize: size })
        spacing = Math.max(0, ((2 * Math.PI * r - (probe.width ?? 0)) / Math.max(1, el.text.length)) / size * 1000)
      }
      const txt = new fabric.FabricText(el.text, { fontFamily: el.font.family, fontWeight: el.font.weight, fontSize: size, fill: el.color, charSpacing: spacing, path: circle, pathAlign: 'center' })
      const g = new fabric.Group([txt], { originX: 'center', originY: 'center', left: el.cx * k + OX, top: el.cy * k + OY, angle: el.start ?? 0 })
      withLook(g, el); withFx(g as Obj, el.fx); clipToBoard(g, OX, OY, W, H)
      ;(g as Obj).set('name', name(el.name)); (g as Obj).parentBoard = boardName
      g.setCoords(); canvas.add(g); added.push(g as Obj)
      continue
    } else if (el.kind === 'ornament') {
      // ornamento generativo del laboratorio, ritagliato nella sua zona
      const make = ORNAMENTS[el.id]?.make
      if (!make) continue
      const zx = el.x * k, zy = el.y * k, zw = el.w * k, zh = el.h * k
      const pal = el.pal ?? sc.palette ?? { bg: sc.bg, ink: '#111111', accent: '#cc3300', muted: '#888888', surface: sc.bg }
      let pieces: { o: Obj; role: string }[] = []
      try { pieces = make({ w: zw, h: zh, pal, ink: pal.ink, s: Math.min(sc.w, sc.h) * k, seed: el.seed, fx: fxMaker }) as { o: Obj; role: string }[] } catch (e) { console.warn('[designer] ornamento', el.id, e); continue }
      for (const { o: po, role } of pieces) {
        if ((po as fabric.FabricObject) instanceof fabric.Path) { const pp = po as unknown as fabric.Path; pp.set({ left: pp.pathOffset.x - pp.width / 2, top: pp.pathOffset.y - pp.height / 2 }) }
        po.set({ originX: 'left', originY: 'top', left: (po.left ?? 0) + zx + OX, top: (po.top ?? 0) + zy + OY, opacity: (po.opacity ?? 1) * el.opacity })
        if (!po.clipPath) po.clipPath = new fabric.Rect({ left: zx + OX, top: zy + OY, width: zw, height: zh, rx: (el.r ?? 0) * k, ry: (el.r ?? 0) * k, originX: 'left', originY: 'top', absolutePositioned: true })
        if (po.fx?.length) applyFx(po)
        po.set('name', name(`${el.name}_${role}`)); po.parentBoard = boardName
        po.setCoords(); canvas.add(po); added.push(po)
      }
      continue
    } else if (el.kind === 'glyph') {
      o = glyphObj(el.path, el.cx * k + OX, el.cy * k + OY, el.size * k, el.color, el.angle ?? 0, el.opacity ?? 1)
      if (el.blend) o.set('globalCompositeOperation', el.blend)
      ;(o as Obj).set('name', name(el.name)); (o as Obj).parentBoard = boardName
      o.setCoords(); canvas.add(o); added.push(o as Obj)
      continue
    } else if (el.kind === 'seal') {
      // anello sottile, testo che gira lungo il cerchio, glifo al centro: un solo gruppo
      const r = el.r * k, cx = el.cx * k + OX, cy = el.cy * k + OY
      const size = Math.max(14 * k * (Math.min(sc.w, sc.h) / 1080), r * 0.16)
      const tr = r - size * 1.05
      const ring = new fabric.Circle({ radius: r, fill: el.bg ?? 'transparent', stroke: el.color, strokeWidth: Math.max(1, r * 0.018), originX: 'center', originY: 'center', left: 0, top: 0 })
      const inner = new fabric.Circle({ radius: tr - size * 0.95, fill: 'transparent', stroke: el.color, strokeWidth: Math.max(1, r * 0.012), originX: 'center', originY: 'center', left: 0, top: 0 })
      const circle = new fabric.Path(`M 0 ${-tr} A ${tr} ${tr} 0 1 1 0 ${tr} A ${tr} ${tr} 0 1 1 0 ${-tr}`, { fill: '', stroke: '', visible: false })
      // spaziatura calcolata perché il testo copra il giro intero
      const probe = new fabric.FabricText(el.text, { fontFamily: el.font.family, fontWeight: el.font.weight, fontSize: size })
      const spacing = Math.max(0, ((2 * Math.PI * tr - (probe.width ?? 0)) / Math.max(1, el.text.length)) / size * 1000)
      const txt = new fabric.FabricText(el.text, { fontFamily: el.font.family, fontWeight: el.font.weight, fontSize: size, fill: el.color, charSpacing: spacing, path: circle, pathAlign: 'center', originX: 'center', originY: 'center', left: 0, top: 0 })
      const center = glyphObj(el.glyph ?? 'Sparkle', 0, 0, (tr - size) * 1.1, el.color)
      const g = new fabric.Group([ring, inner, txt, center], { originX: 'center', originY: 'center', left: cx, top: cy, angle: el.angle ?? 0 })
      ;(g as Obj).set('name', name(el.name)); (g as Obj).parentBoard = boardName
      g.setCoords(); canvas.add(g); added.push(g as Obj)
      continue
    } else if (el.kind === 'image') {
      const sx = { ...el, x: el.x * k, y: el.y * k, w: el.w * k, h: el.h * k }
      o = await imageObj({ ...sx, view: el.view && { x: el.view.x * k, y: el.view.y * k, w: el.view.w * k, h: el.view.h * k } }, OX + sx.x, OY + sx.y)
      if (el.clipText) o.clipPath = textClip(el.clipText, k, OX, OY)
      else if (el.mask) {
        const mp = new fabric.Path(el.mask, { absolutePositioned: true, originX: 'left', originY: 'top' })
        mp.set({ scaleX: k, scaleY: k, left: (mp.pathOffset.x - mp.width / 2) * k + OX, top: (mp.pathOffset.y - mp.height / 2) * k + OY })
        o.clipPath = mp
      }
      // look pellicola e regolazioni del motore effetti
      if (el.url && (el.look || el.adjust)) {
        const im = o as Obj
        if (el.look) im.look = { id: el.look, amount: 100 }
        if (el.adjust) im.adjust = { ...el.adjust }
        try { applyFx(im) } catch (e) { console.warn('[designer] look', e) }
      }
      withFx(o as Obj, el.fx)
      withLook(o, el)
      clipToBoard(o, OX, OY, W, H)
      // imageObj lavora già in coordinate assolute
      o.set({ originX: 'left', originY: 'top' })
      ;(o as Obj).set('name', name(el.name)); (o as Obj).parentBoard = boardName
      o.setCoords(); canvas.add(o); added.push(o as Obj)
      continue
    }
    if (!o) continue
    o.set({ originX: 'left', originY: 'top', left: (o.left ?? 0) + OX, top: (o.top ?? 0) + OY })
    if ('blend' in el || 'opacity' in el) withLook(o, el as { blend?: GlobalCompositeOperation; opacity?: number })
    if ('fx' in el && el.fx) withFx(o as Obj, el.fx)
    clipToBoard(o, OX, OY, W, H)
    ;(o as Obj).set('name', name(el.name)); (o as Obj).parentBoard = boardName
    o.setCoords()
    canvas.add(o); added.push(o as Obj)
  }
  // finiture con i pack dell'utente; se non ci sono, trama procedurale sullo sfondo
  if (sc.finish) {
    let n = 0
    if (sc.finish.ids.length) {
      try { n = await applyFinish(canvas, artboard, sc.finish.ids, sc.finish.seed) } catch (e) { console.warn('[designer] finiture', e) }
    }
    if (!n && sc.finish.fallback) {
      const bg = new fabric.Rect({ left: OX, top: OY, width: W, height: H, fill: sc.bg, strokeWidth: 0, originX: 'left', originY: 'top' }) as Obj
      bg.fx = [fxMaker('textureOverlay', sc.finish.fallback, { opacity: sc.finish.amount ?? (sc.finish.fallback === 'carta' ? 45 : 35) })].filter(Boolean) as FxEntry[]
      try { applyFx(bg) } catch { /* senza WebGL resta lo sfondo pieno */ }
      bg.set('name', name('trama')); bg.parentBoard = boardName
      bg.setCoords()
      // sopra la tavola, sotto tutto il resto
      const first = added.length ? canvas.getObjects().indexOf(added[0]) : canvas.getObjects().length
      canvas.insertAt(Math.max(0, first), bg)
      added.unshift(bg)
    }
  }
  canvas.requestRenderAll()
  return added
}
