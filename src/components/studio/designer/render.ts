/**
 * Dalla scena agli oggetti Fabric sulla tavola: testi modificabili (righe già
 * spezzate dal motore), forme, filetti e foto ritagliate "a riempimento".
 */
import * as fabric from 'fabric'
import type { Scene, SceneEl } from './types'

type Obj = fabric.FabricObject & { parentBoard?: string }

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

async function imageObj(el: Extract<SceneEl, { kind: 'image' }>, left: number, top: number): Promise<fabric.FabricObject> {
  const fallback = () => shapeFor(el, left, top, el.fallback, false)
  if (!el.url) return fallback()
  const img = await withTimeout<fabric.FabricImage | null>(fabric.FabricImage.fromURL(srcOf(el.url), { crossOrigin: 'anonymous' }).catch(() => null), 20000, null)
  if (!img) return fallback()
  const iw = img.width || 1, ih = img.height || 1
  const scale = Math.max(el.w / iw, el.h / ih)
  const cw = el.w / scale, ch = el.h / scale
  img.set({
    cropX: (iw - cw) / 2, cropY: (ih - ch) / 2, width: cw, height: ch,
    scaleX: scale, scaleY: scale, left, top, originX: 'left', originY: 'top',
  })
  if (el.shape && el.shape !== 'rect') img.clipPath = shapeFor(el, left, top, '#000', true)
  return img
}

/** Disegna la scena sulla tavola; restituisce gli oggetti aggiunti. */
export async function renderScene(canvas: fabric.Canvas, artboard: fabric.FabricObject, sc: Scene, slug = 'tavola'): Promise<fabric.FabricObject[]> {
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
      o = new fabric.Rect({ left: el.x * k, top: el.y * k, width: el.w * k, height: el.h * k, rx: (el.r ?? 0) * k, ry: (el.r ?? 0) * k, fill, opacity: el.opacity ?? 1, strokeWidth: 0 })
    } else if (el.kind === 'circle') {
      o = new fabric.Circle({ left: (el.cx - el.r) * k, top: (el.cy - el.r) * k, radius: el.r * k, fill: el.fill, strokeWidth: 0 })
    } else if (el.kind === 'line') {
      o = new fabric.Line([el.x1 * k, el.y1 * k, el.x2 * k, el.y2 * k], { stroke: el.color, strokeWidth: el.width * k, left: Math.min(el.x1, el.x2) * k, top: (Math.min(el.y1, el.y2) - el.width / 2) * k })
    } else if (el.kind === 'text') {
      const t = new fabric.IText(el.lines.join('\n'), {
        fontFamily: el.font.family, fontWeight: el.font.weight, fontStyle: el.font.italic ? 'italic' : 'normal',
        fontSize: el.size * k, fill: el.color, textAlign: el.align,
        lineHeight: el.lineHeight / 1.13, charSpacing: el.tracking * 1000,
      })
      const tw = t.width ?? 0
      const left = el.align === 'left' ? el.x : el.align === 'right' ? el.x + el.w - tw / k : el.x + (el.w - tw / k) / 2
      t.set({ left: left * k, top: el.y * k })
      o = t
    } else if (el.kind === 'image') {
      const sx = { ...el, x: el.x * k, y: el.y * k, w: el.w * k, h: el.h * k }
      o = await imageObj(sx, OX + sx.x, OY + sx.y)
      // imageObj lavora già in coordinate assolute
      o.set({ originX: 'left', originY: 'top' })
      ;(o as Obj).set('name', name(el.name)); (o as Obj).parentBoard = boardName
      o.setCoords(); canvas.add(o); added.push(o as Obj)
      continue
    }
    if (!o) continue
    o.set({ originX: 'left', originY: 'top', left: (o.left ?? 0) + OX, top: (o.top ?? 0) + OY })
    ;(o as Obj).set('name', name(el.name)); (o as Obj).parentBoard = boardName
    o.setCoords()
    canvas.add(o); added.push(o as Obj)
  }
  canvas.requestRenderAll()
  return added
}
