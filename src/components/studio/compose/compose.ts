/**
 * Motore di impaginazione: trasforma una scheda di composizione (stile,
 * impaginazione, contenuti) in oggetti Fabric veri e modificabili.
 *
 * Regole di mestiere applicate a ogni tavola:
 * - margini proporzionati al lato corto, griglia a 12 colonne con canalini;
 * - scala tipografica modulare (corpo → sottotitolo → titolo) con interlinea e
 *   spaziatura dello stile; il titolo viene adattato allo spazio, mai tagliato;
 * - contrasto controllato tra testo e sfondo;
 * - decorazioni solo nelle zone libere, effetti e filtri coerenti con lo stile.
 * Tutto resta un oggetto singolo e nominato: l'utente può rifinire ogni pezzo.
 */
import * as fabric from 'fabric'
import { ensureFont, fontEntry } from '../libraries/font-loader'
import { applyFx } from '../fx/engine'
import { fxDef, newFx, LOOKS, type FxEntry, type FxId } from '../fx/catalog'
import { ORNAMENTS } from './ornaments'
import { FORMATS, layoutOf, styleOf, type ComposeBoard, type DecorId, type Palette, type StyleDef } from '@/lib/design/compose-spec'

type Obj = fabric.FabricObject & { fx?: FxEntry[]; look?: { id: string; amount: number }; parentBoard?: string }
interface Box { x: number; y: number; w: number; h: number }

export const boardSize = (b: ComposeBoard) => {
  const f = FORMATS[b.format ?? ''] ?? FORMATS.quadrato
  return { w: Math.round(b.width ?? f.w), h: Math.round(b.height ?? f.h) }
}

/* ───────────── colore ───────────── */
const rgb = (hex: string) => {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0').slice(0, 6)
  return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255)
}
const lum = (hex: string) => {
  const [r, g, b] = rgb(hex).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => { const x = lum(a) + 0.05, y = lum(b) + 0.05; return x > y ? x / y : y / x }
const readable = (fg: string, bg: string, min = 4.5) => (contrast(fg, bg) >= min ? fg : lum(bg) > 0.35 ? '#111111' : '#ffffff')
const mix2 = (a: string, b: string, t = 0.18) => { const x = rgb(a), y = rgb(b); return '#' + x.map((v, i) => Math.round((v + (y[i] - v) * t) * 255).toString(16).padStart(2, '0')).join('') }
const alpha = (hex: string, a: number) => { const [r, g, b] = rgb(hex).map(v => Math.round(v * 255)); return `rgba(${r},${g},${b},${a})` }

/* ───────────── misure del testo ───────────── */
const mctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
function measure(str: string, family: string, weight: number, size: number, tracking: number, italic = false) {
  if (!mctx) return str.length * size * 0.55
  mctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px "${family}"`
  return mctx.measureText(str).width + tracking * size * Math.max(0, [...str].length - 1)
}

const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T) =>
  Promise.race([p, new Promise<T>(r => setTimeout(() => r(fallback), ms))])

/* ───────────── composizione ───────────── */
export async function composeBoard(canvas: fabric.Canvas, artboard: fabric.FabricObject, spec: ComposeBoard, index = 0, total = 1) {
  const S: StyleDef = styleOf(spec.style)
  const L = layoutOf(spec.layout)
  const pal: Palette = { ...(S.palettes[Math.min(spec.palette ?? 0, S.palettes.length - 1)] ?? S.palettes[0]), ...(spec.colors ?? {}) }
  const ink = readable(pal.ink, pal.bg), muted = readable(pal.muted, pal.bg, 3), accent = pal.accent
  const align = spec.align ?? S.align
  const c = spec.content ?? { title: '' }

  const display = { ...S.display, family: spec.displayFont && fontEntry(spec.displayFont) ? spec.displayFont : S.display.family }
  const textF = { ...S.text, family: spec.textFont && fontEntry(spec.textFont) ? spec.textFont : S.text.family }
  const labF = S.label_
  const pickWeight = (fam: string, w: number) => { const ws = fontEntry(fam)?.weights ?? [w]; return ws.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a), ws[0]) }
  display.weight = pickWeight(display.family, display.weight)
  textF.weight = pickWeight(textF.family, textF.weight)
  const labW = pickWeight(labF.family, labF.weight)
  await Promise.all([
    withTimeout(ensureFont(display.family, display.weight), 6000, false),
    withTimeout(ensureFont(textF.family, textF.weight), 6000, false),
    withTimeout(ensureFont(labF.family, labW), 6000, false),
  ])

  artboard.setCoords()
  const ab = artboard.getBoundingRect()
  const W = Math.round(artboard.getScaledWidth()), H = Math.round(artboard.getScaledHeight())
  const OX = ab.left + (ab.width - W) / 2, OY = ab.top + (ab.height - H) / 2
  const boardName = String(artboard.get('name') ?? '')
  const slug = (spec.name ?? c.title ?? 'tavola').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'tavola'
  const added: Obj[] = []

  // geometria
  const s = Math.min(W, H)
  const M = Math.round(s * S.margin)
  const g = Math.round(s * 0.022)
  const inner: Box = { x: M, y: M, w: W - 2 * M, h: H - 2 * M }
  const colW = (n: number, w = inner.w) => ((w - 11 * g) / 12) * n + (n - 1) * g
  const base = Math.round(Math.max(15, Math.min(46, s * 0.0235)))
  const lab = Math.max(12, Math.round(base * 0.62))
  const sub = Math.round(base * S.ratio)
  const radius = Math.round(s * (S.radius ?? 0))
  const landscape = W > H * 1.15

  /* ── fabbrica di oggetti ── */
  const put = <T extends Obj>(o: T, role: string): T => {
    o.set({ originX: 'left', originY: 'top', left: (o.left ?? 0) + OX, top: (o.top ?? 0) + OY } as Partial<T>)
    o.set('name', `${slug}_${role}${added.some(a => a.get('name') === `${slug}_${role}`) ? `_${added.length}` : ''}`)
    o.parentBoard = boardName
    if (o.fx?.length) applyFx(o)
    o.setCoords()
    canvas.add(o); added.push(o)
    return o
  }
  const local = (o: fabric.FabricObject): Box => { o.setCoords(); const r = o.getBoundingRect(); return { x: r.left - OX, y: r.top - OY, w: r.width, h: r.height } }
  const fx = (id: string, variant?: string, p: Record<string, number | string> = {}): FxEntry | null => {
    if (!fxDef(id)) return null
    const e = newFx(id as FxId, variant && fxDef(id)!.variants.some(v => v.id === variant) ? variant : undefined)
    return { ...e, p: { ...e.p, ...p } }
  }
  const parseFx = (v?: string, fallback?: { id: string; variant?: string }) => {
    if (v === 'nessuno') return null
    if (v && v !== 'stile') { const [id, variant] = v.split(':'); return fxDef(id) ? { id, variant } : fallback ?? null }
    return fallback ?? null
  }

  type Role = 'display' | 'text' | 'label'
  const tb = (str: string, role: Role, size: number, opts: Partial<fabric.TextboxProps> & { width: number }) => {
    const f = role === 'display' ? display : role === 'text' ? textF : { ...labF, weight: labW, leading: 1.3 }
    const upper = role === 'display' ? !!S.display.upper : role === 'label' ? labF.upper !== false : false
    const tracking = role === 'display' ? (S.display.tracking ?? 0) : role === 'label' ? (labF.tracking ?? 0.08) : 0
    const lh = role === 'display' ? (S.display.leading ?? 0.95) : role === 'label' ? 1.3 : 1.42
    return new fabric.Textbox(upper ? str.toUpperCase() : str, {
      fontFamily: f.family, fontWeight: String(f.weight), fontSize: Math.round(size),
      fontStyle: role === 'display' && S.display.italic ? 'italic' : 'normal',
      charSpacing: Math.round(tracking * 1000), lineHeight: lh,
      textAlign: align, fill: role === 'label' ? muted : ink, splitByGrapheme: false,
      ...opts,
    }) as fabric.Textbox & Obj
  }
  /** il corpo più grande che entra in larghezza, altezza e righe */
  const fit = (str: string, role: Role, width: number, maxH: number, maxSize: number, minSize: number, maxLines = 6, opts: Partial<fabric.TextboxProps> = {}) => {
    let lo = minSize, hi = Math.max(minSize, maxSize), best = minSize
    const t = tb(str, role, hi, { width, ...opts })
    const ok = (sz: number) => { t.set({ fontSize: sz, width }); t.initDimensions(); return t.width <= width + 1 && t.height <= maxH && t.textLines.length <= maxLines }
    if (ok(hi)) best = hi
    else for (let i = 0; i < 14 && hi - lo > 0.5; i++) { const mid = (lo + hi) / 2; if (ok(mid)) { best = mid; lo = mid } else hi = mid }
    t.set({ fontSize: Math.floor(best), width }); t.initDimensions()
    return t
  }
  const heightOf = (o: fabric.FabricObject) => (o instanceof fabric.Textbox ? (o.initDimensions(), o.height) : o.getScaledHeight())

  /* ── sfondo ── */
  const bgSpec = spec.background && spec.background !== 'stile' ? (spec.background === 'tinta' ? { kind: 'solid' as const } : { kind: 'generative' as const, variant: spec.background }) : S.bg ?? { kind: 'solid' as const }
  const bg = new fabric.Rect({ left: 0, top: 0, width: W, height: H, fill: pal.bg, strokeWidth: 0 }) as fabric.Rect & Obj
  bg.fx = []
  if (bgSpec.kind === 'gradient') {
    bg.set('fill', new fabric.Gradient({ type: 'linear', gradientUnits: 'percentage', coords: { x1: 0, y1: 0, x2: 1, y2: 1 }, colorStops: [{ offset: 0, color: pal.bg }, { offset: 1, color: pal.surface }] }))
  } else if (bgSpec.kind === 'generative') {
    // su palette scure il riempimento prende i colori della palette: il testo resta leggibile
    const dark = lum(pal.bg) < 0.2
    const e = fx('genFill', bgSpec.variant, dark && !spec.background ? { c1: accent, c2: pal.surface, c3: pal.muted, c4: pal.bg } : {}); if (e) bg.fx.push(e)
  }
  if (S.grain) { const e = fx('textureOverlay', 'grana', { opacity: Math.min(100, S.grain * 1.6), scale: 100 }); if (e) bg.fx.push(e) }
  put(bg, 'sfondo')

  /* ── fasce che rubano spazio (prima della disposizione) ── */
  const density = spec.density ?? 'ricco'
  const recipe: DecorId[] = density === 'essenziale' ? S.decor.slice(0, 2) : density === 'massimo' ? [...S.decor, 'ghost', 'vertical', 'crop'] : S.decor
  const decor = new Set<DecorId>(spec.noDecor ? [] : [...recipe, ...(spec.decor ?? [])])
  // le impaginazioni a moduli hanno già la loro struttura: niente testata, griglie o forme libere
  if (['arte', 'bento', 'manifesto', 'cover', 'tipografico', 'manuale', 'collage', 'drop'].includes(L.id)) (['folio', 'columns', 'index', 'bauhaus', 'blob', 'dots', 'orbs', 'ticker', 'bars', 'frame'] as DecorId[]).forEach(d => decor.delete(d))
  if (L.id === 'bento') (['ghost', 'shape3d', 'halftoneDisc'] as DecorId[]).forEach(d => decor.delete(d))
  if (L.id === 'galleria') decor.delete('folio') // le informazioni stanno già nella didascalia
  let area: Box = { ...inner }
  const folioText = (c.brand || c.meta?.length) && decor.has('folio')
  const folioH = Math.round(lab * 2.4)
  if (folioText) { area = { ...area, y: area.y + folioH + g, h: area.h - 2 * (folioH + g) } }
  const tickerH = Math.round(lab * 3)
  if (decor.has('ticker')) area = { ...area, h: area.h - tickerH - g }

  /* ── immagine (segnaposto subito, foto vera quando arriva) ── */
  const imgUrl = c.image?.url || (c.image?.prompt ? `https://image.pollinations.ai/prompt/${encodeURIComponent(c.image.prompt)}?width=${Math.min(1600, W)}&height=${Math.min(1600, H)}&nologo=true&seed=${Math.floor(Math.random() * 1e9)}` : '')
  const imageLook = spec.imageLook === 'nessuno' ? null : LOOKS.some(l => l.id === spec.imageLook) ? spec.imageLook! : S.imageLook
  const imageFx = parseFx(spec.imageEffect, S.imageFx)
  let noImageFx = false
  const imageShape = spec.imageShape ?? S.imageShape ?? 'rettangolo'
  /** effetto foto accordato alla palette: duotone, risograph e retino usano i colori della tavola */
  const imageFxEntry = () => {
    if (!imageFx || noImageFx) return null
    const dark = lum(pal.bg) < 0.35 ? pal.bg : ink
    const p: Record<string, number | string> =
      imageFx.id === 'gradientMap' ? { c1: dark, c2: accent, c3: lum(pal.bg) < 0.35 ? pal.ink : pal.bg, three: 1 }
      : imageFx.id === 'riso' ? { ink1: accent, ink2: ink }
      : imageFx.id === 'halftone' ? { ink, paper: pal.bg }
      : {}
    return fx(imageFx.id, imageFx.variant, p)
  }
  const srcOf = (u: string) => (u.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(u)}` : u)
  const loadImg = () => withTimeout(fabric.FabricImage.fromURL(srcOf(imgUrl), { crossOrigin: 'anonymous' }).catch(() => null), 45000, null)
  /** tracciato della forma, in coordinate del riquadro */
  const shapeD = (shape: string, w: number, h: number, r: number) => {
    if (shape === 'arco') { const rr = Math.min(w / 2, h); return `M 0 ${h} L 0 ${rr} A ${w / 2} ${rr} 0 0 1 ${w} ${rr} L ${w} ${h} Z` }
    if (shape === 'cerchio') { const d = Math.min(w, h), cx = w / 2, cy = h / 2; return `M ${cx - d / 2} ${cy} a ${d / 2} ${d / 2} 0 1 0 ${d} 0 a ${d / 2} ${d / 2} 0 1 0 ${-d} 0 Z` }
    if (shape === 'goccia') {
      // forma organica: ellisse deformata con curve morbide
      const n = 6, pts: number[][] = []
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 0.86 + 0.14 * Math.sin(i * 2.7 + index); pts.push([w / 2 + Math.cos(a) * w / 2 * k, h / 2 + Math.sin(a) * h / 2 * k]) }
      let d = `M ${pts[0][0]} ${pts[0][1]}`
      for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]; d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}` }
      return d + ' Z'
    }
    return `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`
  }
  /** foto ritagliata a copertura del riquadro, nella forma scelta (segnaposto subito, foto quando arriva) */
  const placeImage = (box: Box, role = 'immagine', r = radius, shape: string = 'rettangolo', shiftY = 0) => {
    const d = shapeD(shape, box.w, box.h, r)
    const ph = new fabric.Path(d, { fill: pal.surface, strokeWidth: 0 }) as fabric.Path & Obj
    ph.set({ left: box.x + ph.pathOffset.x - ph.width / 2, top: box.y + ph.pathOffset.y - ph.height / 2 })
    put(ph, role)
    if (!imgUrl) return ph
    loadImg().then(img => {
      if (!img || !canvas.getObjects().includes(ph)) return
      const iw = img.width || 1, ih = img.height || 1
      const k = Math.max(box.w / iw, box.h / ih) * (shiftY ? 1.12 : 1)
      const cw = box.w / k, ch = box.h / k
      const cy = Math.max(0, Math.min(ih - ch, (ih - ch) * 0.4 + shiftY * ih))
      img.set({ cropX: (iw - cw) / 2, cropY: cy, width: cw, height: ch, scaleX: k, scaleY: k, originX: 'left', originY: 'top', left: box.x + OX, top: box.y + OY })
      if (shape !== 'rettangolo' || r) {
        const clip = new fabric.Path(d, { originX: 'center', originY: 'center', scaleX: 1 / k, scaleY: 1 / k })
        // il centro della forma rispetto al centro del riquadro (la goccia non è simmetrica)
        clip.set({ left: (clip.pathOffset.x - box.w / 2) / k, top: (clip.pathOffset.y - box.h / 2) / k })
        img.clipPath = clip
      }
      const o = img as unknown as Obj
      o.set('name', ph.get('name')); o.parentBoard = boardName
      if (imageLook) o.look = { id: imageLook, amount: 100 }
      const e = imageFxEntry(); if (e) o.fx = [e]
      applyFx(o)
      const at = canvas.getObjects().indexOf(ph)
      canvas.insertAt(at, o); canvas.remove(ph)
      canvas.requestRenderAll()
    })
    return ph
  }
  /** la foto come arte: nella forma dello stile, o a strisce sfalsate come un collage */
  const photoArt = (box: Box) => {
    if (!imgUrl) return false
    if (imageShape === 'strisce') {
      const n = 3, gap = Math.round(g * 0.6), sw = (box.w - gap * (n - 1)) / n
      for (let i = 0; i < n; i++) placeImage({ x: box.x + i * (sw + gap), y: box.y + (i === 1 ? box.h * 0.06 : 0), w: sw, h: box.h * 0.94 }, `foto-${i + 1}`, 0, 'rettangolo', (i - 1) * 0.04)
    } else {
      const d = Math.min(box.w, box.h)
      const b = imageShape === 'cerchio' ? { x: box.x + (box.w - d) / 2, y: box.y + (box.h - d) / 2, w: d, h: d } : box
      placeImage(b, 'immagine', radius, imageShape)
    }
    usedImage = true
    return true
  }
  let usedImage = false

  /* ── pezzi di testo ricorrenti ── */
  const titleFx = parseFx(spec.titleEffect, S.titleFx)
  const styleTitle = (t: Obj) => {
    if (!titleFx) return t
    const def = fxDef(titleFx.id); if (!def) return t
    const p: Record<string, number | string> = {}
    // effetti con un colore proprio: si accordano all'accento della palette
    if (['neon', 'echo', 'splice', 'outerGlow'].includes(titleFx.id) && def.params.some(q => q.key === 'color')) p.color = accent
    if (titleFx.id === 'neon') t.set('fill', '#ffffff')
    // volume retrò: lettera nel colore d'accento, profondità nell'inchiostro
    if (titleFx.id === 'extrude' || titleFx.id === 'longShadow') { p.color = ink; if (contrast(accent, pal.bg) >= 2.2) t.set('fill', accent) }
    const e = fx(titleFx.id, titleFx.variant, p); if (e) t.fx = [e]
    return t
  }
  const ctaBlock = (x: number, y: number, w: number) => {
    if (!c.cta) return 0
    const size = Math.round(base * 0.9)
    const t = tb(c.cta, 'label', size, { width: w, fill: readable(pal.bg, accent), textAlign: 'center' })
    t.set({ charSpacing: 60 }); t.initDimensions()
    const tw = Math.min(w, Math.ceil(measure(t.text, labF.family, labW, size, 0.06) + size * 2.4))
    const h = Math.round(size * 3)
    const bx = align === 'center' ? x + (w - tw) / 2 : x
    put(new fabric.Rect({ left: bx, top: y, width: tw, height: h, rx: h / 2, ry: h / 2, fill: accent, strokeWidth: 0 }) as fabric.Rect & Obj, 'cta-fondo')
    t.set({ left: bx, top: y + (h - heightOf(t)) / 2, width: tw }); t.initDimensions()
    put(t, 'cta')
    return h
  }
  /** pila verticale: [oggetto, spazio prima] */
  const stack = (items: [Obj | null, number][], x: number, top: number, boxW = 0) => {
    let y = top
    for (const [o, gap] of items) {
      if (!o) continue
      y += gap
      const ow = o.getScaledWidth()
      o.set({ left: align === 'center' && boxW ? x + (boxW - ow) / 2 : x, top: y }); y += heightOf(o)
    }
    return y - top
  }
  const stackH = (items: [Obj | null, number][]) => items.reduce((h, [o, gap]) => (o ? h + gap + heightOf(o) : h), 0)

  let free: Box | null = null
  const contentW = (n: number, w = area.w) => (align === 'center' ? w : colW(n, w))

  /** etichette a pillola, su più righe se serve */
  const chips = (maxW: number) => {
    const tags = (c.tags ?? []).filter(Boolean).slice(0, 6)
    if (!tags.length) return null
    const size = Math.round(lab * 1.05), ph = Math.round(size * 2.3), padX = Math.round(size * 1.1), gap = Math.round(g * 0.45)
    const ws = tags.map(t => Math.ceil(measure(t.toUpperCase(), labF.family, labW, size, labF.tracking ?? 0.08)) + padX * 2)
    const rows: number[][] = [[]]; let rw = 0
    ws.forEach((w, i) => { if (rw && rw + gap + w > maxW) { rows.push([]); rw = 0 } rows[rows.length - 1].push(i); rw += (rw ? gap : 0) + w })
    return {
      h: rows.length * ph + (rows.length - 1) * gap,
      draw: (x: number, y: number, boxW: number) => rows.forEach((row, ri) => {
        const total = row.reduce((a, i) => a + ws[i], 0) + gap * (row.length - 1)
        let cx = align === 'center' ? x + (boxW - total) / 2 : x
        row.forEach(i => {
          const cy = y + ri * (ph + gap)
          put(new fabric.Rect({ left: cx, top: cy, width: ws[i], height: ph, rx: ph / 2, ry: ph / 2, fill: '', stroke: ink, strokeWidth: Math.max(1, s * 0.0016), opacity: 0.55 }) as fabric.Rect & Obj, `etichetta-${i + 1}`)
          const t = tb(tags[i], 'label', size, { width: ws[i], fill: ink, textAlign: 'center' })
          t.set({ left: cx, top: cy + (ph - heightOf(t)) / 2 }); put(t, `etichetta-testo-${i + 1}`)
          cx += ws[i] + gap
        })
      }),
    }
  }

  /* ── impaginazioni ── */
  const heroText = (box: Box, opts: { maxTitle: number; titleShare: number; anchor: 'bottom' | 'center' | 'top' }) => {
    const tw = align === 'center' ? box.w : Math.min(box.w, colW(11, box.w))
    const eyebrow = c.eyebrow ? tb(c.eyebrow, 'label', lab, { width: tw, fill: accent === pal.bg ? ink : readable(accent, pal.bg, 3) }) : null
    const subW = align === 'center' ? Math.min(box.w, colW(10, box.w)) : Math.min(box.w, colW(8, box.w))
    let subtitle = c.subtitle ? tb(c.subtitle, 'text', sub, { width: subW, fill: ink, fontWeight: String(textF.weight) }) : null
    let body = c.body ? tb(c.body, 'text', base, { width: Math.min(box.w, colW(align === 'center' ? 9 : 7, box.w)), fill: muted }) : null
    // gerarchia: se lo spazio è poco, prima si toglie il testo lungo, poi si riduce il sottotitolo
    const squeezed = box.h < s * 0.5
    if (squeezed && body) body = null
    if (squeezed && subtitle) subtitle = tb(c.subtitle!, 'text', base * 1.05, { width: subW, fill: ink, fontWeight: String(textF.weight) })
    const tagRow = chips(box.w)
    const ctaH = c.cta ? Math.round(base * 0.9 * 3) + base * 1.6 : 0
    // spazio per la sottolineatura a mano sotto il titolo
    const underGap = decor.has('scribble') ? s * 0.035 : 0
    const rest = stackH([[eyebrow, 0], [subtitle, sub * 0.8 + underGap], [body, base * 1.1]]) + (eyebrow ? lab * 1.6 : 0) + ctaH + (tagRow ? tagRow.h + base * 1.3 : 0)
    // il titolo prende lo spazio che resta: niente esce mai dalla tavola
    const title = styleTitle(fit(c.title, 'display', tw, Math.max(sub * 1.4, Math.min(box.h * opts.titleShare, box.h - rest)), opts.maxTitle, sub * 1.1, 5))
    const items: [Obj | null, number][] = [[eyebrow, 0], [title, eyebrow ? lab * 1.6 : 0], [subtitle, sub * 0.8 + underGap], [body, base * 1.1]]
    const h = stackH(items) + ctaH + (tagRow ? tagRow.h + base * 1.3 : 0)
    const top = Math.max(box.y, opts.anchor === 'bottom' ? box.y + box.h - h : opts.anchor === 'center' ? box.y + (box.h - h) / 2 : box.y)
    let used = stack(items, box.x, top, box.w)
    if (tagRow) { tagRow.draw(box.x, top + used + base * 1.3, box.w); used += tagRow.h + base * 1.3 }
    // sopra sfondi generativi i testi piccoli hanno un'ombra morbida che li stacca
    if (bgSpec.kind === 'generative') [eyebrow, subtitle, body].forEach(o => { const e = o && fx('dropShadow', 'morbida', { opacity: 55, distance: 2, size: 18, color: lum(ink) > 0.5 ? '#000000' : '#ffffff' }); if (o && e) o.fx = [e] })
    for (const [o] of items) if (o) put(o, o === eyebrow ? 'occhiello' : o === title ? 'titolo' : o === subtitle ? 'sottotitolo' : 'testo')
    ctaBlock(box.x, top + used + base * 1.6, box.w)
    return { top, h }
  }

  const metaRow = (y: number, list: string[], role: string) => {
    if (!list.length) return
    const n = list.length, w = (inner.w - g * (n - 1)) / n
    list.forEach((m, i) => {
      const t = tb(m, 'label', lab, { width: w, textAlign: n === 1 ? (align === 'center' ? 'center' : 'left') : i === 0 ? 'left' : i === n - 1 ? 'right' : 'center' })
      t.set({ left: inner.x + i * (w + g), top: y }); put(t, `${role}-${i + 1}`)
    })
  }

  const hash = (t: string) => [...t].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7)
  /* ── materiali e asset di studio (public/assets/compose) ── */
  const R = (() => { let a = (hash(slug) + index * 977) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } })()
  const pick = <T,>(list: T[]) => list[Math.floor(R() * list.length)]
  const TAVOLE = [10, 19, 22, 28, 3, 8, 5, 6, 25, 26, 29, 30, 34, 2, 21, 15, 24, 12, 31, 14, 17]
  const ASSET = {
    tavola: (list = TAVOLE) => `/assets/compose/tavola-${list[(hash(slug) >>> 0) % list.length]}.png`,
    segno: () => `/assets/compose/segno-${1 + Math.floor(R() * 9)}.png`,
    carta: () => `/assets/compose/carta-${1 + Math.floor(R() * 3)}.jpg`,
    rumore: () => `/assets/compose/rumore-${1 + Math.floor(R() * 5)}.jpg`,
    plastica: () => `/assets/compose/plastica-${1 + Math.floor(R() * 5)}.jpg`,
  }
  /** immagine d'archivio: segnaposto invisibile subito (tiene il livello), immagine quando arriva */
  const asset = (url: string, box: Box, o: { role: string; color?: string; blend?: GlobalCompositeOperation; opacity?: number; angle?: number; cover?: boolean; flip?: boolean; locked?: boolean }) => {
    const ph = put(new fabric.Rect({ left: box.x, top: box.y, width: box.w, height: box.h, fill: '', strokeWidth: 0, opacity: 0, selectable: false, evented: false }) as fabric.Rect & Obj, o.role)
    const ready = withTimeout(fabric.FabricImage.fromURL(url).catch(() => null), 15000, null).then(img => {
      if (!img || !canvas.getObjects().includes(ph)) return null
      const iw = img.width || 1, ih = img.height || 1
      if (o.cover) {
        const k = Math.max(box.w / iw, box.h / ih), cw = box.w / k, ch = box.h / k
        img.set({ cropX: (iw - cw) / 2, cropY: (ih - ch) / 2, width: cw, height: ch, scaleX: k, scaleY: k, left: box.x + OX, top: box.y + OY })
      } else {
        const k = Math.min(box.w / iw, box.h / ih)
        img.set({ scaleX: k, scaleY: k, left: box.x + OX + (box.w - iw * k) / 2, top: box.y + OY + (box.h - ih * k) / 2 })
      }
      img.set({ originX: 'left', originY: 'top', opacity: o.opacity ?? 1, globalCompositeOperation: o.blend ?? 'source-over', flipX: !!o.flip })
      if (o.angle) img.rotate(o.angle)
      if (o.locked) img.set({ selectable: false, evented: false })
      const im = img as unknown as Obj
      if (o.color) { const e = fx('colorOverlay', 'pieno', { color: o.color }); if (e) im.fx = [e] }
      im.set('name', ph.get('name')); im.parentBoard = boardName
      applyFx(im)
      canvas.insertAt(canvas.getObjects().indexOf(ph), im); canvas.remove(ph)
      canvas.requestRenderAll()
      return img
    })
    return { ph, ready }
  }
  /** punti d'inchiostro veri dell'illustrazione: per ogni quota, il primo pixel pieno da sinistra */
  const inkPoints = (img: fabric.FabricImage, rows: number[]) => {
    const el = img.getElement() as HTMLImageElement, sw = 160, sh = Math.round(sw * (el.naturalHeight || el.height) / (el.naturalWidth || el.width))
    const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh
    const cx = cv.getContext('2d', { willReadFrequently: true })!; cx.drawImage(el, 0, 0, sw, sh)
    const data = cx.getImageData(0, 0, sw, sh).data
    const b = local(img), kx = b.w / sw, ky = b.h / sh
    return rows.map(fy => {
      // si cerca nella fascia attorno alla quota la riga con l'inchiostro più a sinistra
      let best: [number, number] | null = null
      const y0 = Math.round(fy * sh)
      for (let dy = -Math.round(sh * 0.06); dy <= Math.round(sh * 0.06); dy++) {
        const y = Math.max(0, Math.min(sh - 1, y0 + dy))
        for (let x = 0; x < sw; x++) if (data[(y * sw + x) * 4 + 3] > 140) { if (!best || x < best[0]) best = [x, y]; break }
      }
      return best ? { x: b.x + best[0] * kx, y: b.y + best[1] * ky } : null
    })
  }
  /** tema delle tavole tecniche in base al contenuto */
  const TEMI: Record<string, number[]> = { persone: [10, 19, 22, 28, 3, 8, 5, 6], tecnologia: [25, 26, 29, 30, 34, 2, 21], oggetti: [15, 24, 12, 31, 14, 17] }
  const tema = () => {
    const t = `${c.title} ${c.subtitle ?? ''} ${(c.tags ?? []).join(' ')} ${(c.items ?? []).join(' ')}`.toLowerCase()
    if (/(app|digital|software|dati|tech|web|codice|intelligenza|ai\b|sito|online|piattaforma)/.test(t)) return TEMI.tecnologia
    if (/(persone|team|formazione|corso|workshop|servizi|consulenza|clienti|ascolto|incontro|comunità|lavoro)/.test(t)) return TEMI.persone
    return TEMI.oggetti
  }
  /** scheda tecnica: righe etichetta/valore con filetti */
  const specRows = () => (c.details?.length ? c.details : (c.meta ?? []).map((v, i) => ({ label: String(i + 1).padStart(2, '0'), value: v }))).slice(0, 5)
  const specTable = (box: Box, color = ink) => {
    const rows = specRows(); if (!rows.length) return 0
    const rh = Math.round(lab * 2.7), hair = Math.max(1, Math.round(s * 0.0016))
    rows.forEach((r, i) => {
      const y = box.y + i * rh
      put(new fabric.Rect({ left: box.x, top: y, width: box.w, height: hair, fill: color, opacity: 0.45, strokeWidth: 0 }) as fabric.Rect & Obj, `scheda-riga-${i + 1}`)
      const l = tb(r.label, 'label', lab * 0.9, { width: box.w * 0.38, fill: color, textAlign: 'left', opacity: 0.7 }); l.set({ left: box.x, top: y + (rh - heightOf(l)) / 2 }); put(l, `scheda-voce-${i + 1}`)
      const v = tb(r.value, 'text', lab * 1.15, { width: box.w * 0.6, fill: color, textAlign: 'right' }); v.set({ left: box.x + box.w * 0.4, top: y + (rh - heightOf(v)) / 2 }); put(v, `scheda-valore-${i + 1}`)
    })
    put(new fabric.Rect({ left: box.x, top: box.y + rows.length * rh, width: box.w, height: hair, fill: color, opacity: 0.45, strokeWidth: 0 }) as fabric.Rect & Obj, 'scheda-fine')
    return rows.length * rh
  }
  /** richiami numerati: un filo dal pallino sull'illustrazione all'etichetta */
  const callouts = (target: Box, labels: string[], col: Box) => {
    const n = Math.min(4, labels.length); if (!n) return
    const rowH = Math.min(col.h / n, sub * 3), r = Math.round(lab * 1.15), sw = Math.max(1.5, s * 0.0018)
    for (let i = 0; i < n; i++) {
      const ly = col.y + i * rowH + r
      const tx = target.x + target.w * (0.25 + 0.5 * R()), ty = target.y + target.h * (0.15 + 0.7 * ((i + 0.5) / n))
      const num = put(new fabric.Circle({ left: col.x, top: ly - r, radius: r, fill: accent, strokeWidth: 0 }) as fabric.Circle & Obj, `richiamo-${i + 1}`)
      const nt = tb(String(i + 1).padStart(2, '0'), 'label', lab * 0.9, { width: 2 * r, fill: readable(pal.bg, accent), textAlign: 'center' }); nt.set({ left: col.x, top: ly - heightOf(nt) / 2 }); put(nt, `richiamo-numero-${i + 1}`)
      const t = tb(labels[i], 'text', base * 0.9, { width: col.w - 2 * r - g, fill: ink, textAlign: 'left' }); t.set({ left: col.x + 2 * r + g * 0.6, top: ly - heightOf(t) / 2 }); put(t, `richiamo-testo-${i + 1}`)
      const x0 = col.x + 2 * r + g * 0.6 + Math.min(col.w - 2 * r - g, measure(labels[i], textF.family, textF.weight, base * 0.9, 0)) + g * 0.5
      put(new fabric.Path(`M ${x0} ${ly} L ${tx - (tx > x0 ? 0 : 0)} ${ty}`, { fill: '', stroke: ink, strokeWidth: sw, opacity: 0.8 }) as fabric.Path & Obj, `richiamo-filo-${i + 1}`)
      put(new fabric.Circle({ left: tx - r * 0.35, top: ty - r * 0.35, radius: r * 0.35, fill: accent, stroke: pal.bg, strokeWidth: sw }) as fabric.Circle & Obj, `richiamo-punto-${i + 1}`)
      void num
    }
  }
  /** righe di titolo dimensionate una per una sulla larghezza */
  const titleLines = (text: string, width: number, maxLines = 4) => {
    const words = (S.display.upper ? text.toUpperCase() : text).split(/\s+/).filter(Boolean)
    const target = Math.min(maxLines, Math.max(1, words.length <= maxLines ? words.length : Math.ceil(words.length / 2)))
    const per = Math.ceil(words.length / target), lines: string[] = []
    for (let i = 0; i < words.length; i += per) lines.push(words.slice(i, i + per).join(' '))
    return lines.map(l => ({ text: l, size: Math.floor((width / measure(l, display.family, display.weight, 100, S.display.tracking ?? 0, S.display.italic)) * 100 * 0.98) }))
  }

  /* ── arte generativa ── */
  const ornId = spec.ornament === 'nessuno' || (density === 'essenziale' && !spec.ornament) ? null
    : spec.ornament && ORNAMENTS[spec.ornament] ? spec.ornament : S.ornaments[Math.abs(index) % S.ornaments.length]
  const artGroups: { anchor: Obj; pieces: Obj[] }[] = []
  const art = (box: Box, opts: { id?: string | null; seedOff?: number; panel?: string; r?: number; clip?: boolean } = {}) => {
    const id = opts.id === undefined ? ornId : opts.id
    if (!id || !ORNAMENTS[id] || box.w < 20 || box.h < 20) return false
    const r = opts.r ?? 0
    const anchor = opts.panel ? put(new fabric.Rect({ left: box.x, top: box.y, width: box.w, height: box.h, rx: r, ry: r, fill: opts.panel, strokeWidth: 0 }) as fabric.Rect & Obj, 'pannello-arte') : bg
    const pieces: Obj[] = []
    for (const { o, role } of ORNAMENTS[id].make({ w: box.w, h: box.h, pal, ink, s, seed: hash(slug) + index * 101 + (opts.seedOff ?? 0), fx })) {
      if (o instanceof fabric.Path) o.set({ left: o.pathOffset.x - o.width / 2, top: o.pathOffset.y - o.height / 2 })
      o.set({ left: (o.left ?? 0) + box.x, top: (o.top ?? 0) + box.y })
      if (opts.clip !== false && !o.clipPath) o.clipPath = new fabric.Rect({ left: box.x + OX, top: box.y + OY, width: box.w, height: box.h, rx: r, ry: r, originX: 'left', originY: 'top', absolutePositioned: true })
      pieces.push(put(o as Obj, `arte-${role}`))
    }
    artGroups.push({ anchor, pieces })
    return true
  }
  /** testo di cella: occhiello in alto, titolo e sottotitolo in basso */
  const cellTitle = (b: Box, fill: string, maxTitle: number) => {
    const fg = readable(pal.ink, fill), soft = readable(pal.muted, fill, 3)
    const eyebrow = c.eyebrow ? tb(c.eyebrow, 'label', lab, { width: b.w, fill: readable(accent, fill, 3), textAlign: 'left' }) : null
    const subtitle = c.subtitle ? tb(c.subtitle, 'text', base, { width: Math.min(b.w, b.w * 0.85), fill: soft, textAlign: 'left' }) : null
    const rest = (eyebrow ? heightOf(eyebrow) + lab * 2 : 0) + (subtitle ? heightOf(subtitle) + base : 0)
    const title = styleTitle(fit(c.title, 'display', b.w, Math.max(sub, b.h - rest), maxTitle, sub, 4, { textAlign: 'left', fill: fg }))
    if (eyebrow) { eyebrow.set({ left: b.x, top: b.y }); put(eyebrow, 'occhiello') }
    const h = heightOf(title) + (subtitle ? base + heightOf(subtitle) : 0)
    title.set({ left: b.x, top: b.y + b.h - h }); put(title, 'titolo')
    if (subtitle) { subtitle.set({ left: b.x, top: b.y + b.h - heightOf(subtitle) }); put(subtitle, 'sottotitolo') }
  }

  switch (L.id) {
    case 'gigante': {
      const words = (S.display.upper ? c.title.toUpperCase() : c.title).split(/\s+/).filter(Boolean)
      // righe bilanciate: al massimo 5, parole brevi raggruppate
      const target = Math.min(5, Math.max(1, words.length <= 4 ? words.length : Math.ceil(words.length / 2)))
      const lines: string[] = []
      const per = Math.ceil(words.length / target)
      for (let i = 0; i < words.length; i += per) lines.push(words.slice(i, i + per).join(' '))
      const eyebrow = c.eyebrow ? tb(c.eyebrow, 'label', lab, { width: area.w, fill: readable(accent, pal.bg, 3) }) : null
      const subtitle = c.subtitle ? tb(c.subtitle, 'text', sub, { width: align === 'center' ? area.w : colW(7), fill: ink }) : null
      const reserved = (eyebrow ? heightOf(eyebrow) + lab * 2 : 0) + (subtitle ? heightOf(subtitle) + sub : 0) + (c.cta ? base * 4.5 : 0)
      const tr = S.display.tracking ?? 0, lead = S.display.leading ?? 0.9
      let sizes = lines.map(l => Math.floor((area.w / measure(l, display.family, display.weight, 100, tr, S.display.italic)) * 100 * 0.985))
      const maxLine = area.h * 0.5
      sizes = sizes.map(z => Math.min(z, maxLine))
      const t = tb(lines.join('\n'), 'display', sizes[0], { width: area.w + 4, textAlign: 'left' })
      const applySizes = (k: number) => {
        t.styles = Object.fromEntries(lines.map((l, i) => [i, Object.fromEntries([...l].map((_, j) => [j, { fontSize: Math.floor(sizes[i] * k) }]))]))
        t.set({ fontSize: Math.floor(Math.max(...sizes) * k), lineHeight: lead }); t.initDimensions()
      }
      applySizes(1)
      const avail = area.h - reserved
      if (t.height > avail) applySizes(avail / t.height)
      if (t.height > avail) applySizes((avail / t.height) * 0.98)
      styleTitle(t)
      const h = stackH([[eyebrow, 0], [t, eyebrow ? lab * 2 : 0], [subtitle, sub]])
      const top = align === 'center' ? area.y + (area.h - h - (c.cta ? base * 4.5 : 0)) / 2 : area.y + area.h - h - (c.cta ? base * 4.5 : 0)
      const y = stack([[eyebrow, 0], [t, eyebrow ? lab * 2 : 0], [subtitle, sub]], area.x, top, area.w)
      if (eyebrow) put(eyebrow, 'occhiello')
      put(t, 'titolo'); if (subtitle) put(subtitle, 'sottotitolo')
      ctaBlock(area.x, top + y + base * 1.5, align === 'center' ? area.w : colW(6))
      free = top - area.y > s * 0.25 ? { x: area.x, y: area.y, w: area.w, h: top - area.y - g } : null
      break
    }

    case 'diviso': {
      const imgBox: Box = landscape ? { x: 0, y: 0, w: Math.round(W * 0.5), h: H } : { x: 0, y: 0, w: W, h: Math.round(H * 0.52) }
      placeImage(imgBox, 'immagine', 0)
      const tbox: Box = landscape
        ? { x: imgBox.w + M, y: area.y, w: W - imgBox.w - 2 * M, h: area.h }
        : { x: area.x, y: imgBox.h + M, w: area.w, h: area.y + area.h - imgBox.h - M }
      heroText(tbox, { maxTitle: s * 0.13, titleShare: 0.5, anchor: landscape ? 'center' : 'top' })
      break
    }

    case 'copertina': {
      placeImage({ x: 0, y: 0, w: W, h: H }, 'immagine', 0)
      // velo che garantisce la lettura del testo sopra la foto
      const veil = put(new fabric.Rect({ left: 0, top: Math.round(H * 0.3), width: W, height: H - Math.round(H * 0.3), strokeWidth: 0 }) as fabric.Rect & Obj, 'velo')
      veil.set('fill', new fabric.Gradient({ type: 'linear', gradientUnits: 'percentage', coords: { x1: 0, y1: 0, x2: 0, y2: 1 }, colorStops: [{ offset: 0, color: alpha(pal.bg, 0) }, { offset: 0.55, color: alpha(pal.bg, 0.72) }, { offset: 1, color: alpha(pal.bg, 0.94) }] }))
      heroText({ ...area, y: area.y + area.h * 0.35, h: area.h * 0.65 }, { maxTitle: s * 0.15, titleShare: 0.55, anchor: 'bottom' })
      break
    }

    case 'rivista': {
      const mast = c.brand ? fit(c.brand, 'display', area.w, s * 0.11, s * 0.11, lab * 2, 1, { textAlign: 'left' }) : null
      if (mast) { mast.set({ left: area.x, top: area.y }); put(mast, 'testata') }
      let y = area.y + (mast ? heightOf(mast) + g * 0.6 : 0)
      if (mast) { put(new fabric.Rect({ left: area.x, top: y, width: area.w, height: Math.max(1, Math.round(s * 0.0025)), fill: ink, strokeWidth: 0 }) as fabric.Rect & Obj, 'riga-testata'); y += g * 1.4 }
      const eyebrow = c.eyebrow ? tb(c.eyebrow, 'label', lab, { width: area.w, fill: readable(accent, pal.bg, 3), textAlign: 'left' }) : null
      const title = styleTitle(fit(c.title, 'display', area.w, area.h * 0.3, s * 0.11, sub, 3, { textAlign: 'left' }))
      const subtitle = c.subtitle ? tb(c.subtitle, 'text', sub * 0.85, { width: colW(9), fill: ink, textAlign: 'left' }) : null
      const items: [Obj | null, number][] = [[eyebrow, 0], [title, eyebrow ? lab : 0], [subtitle, sub * 0.6]]
      y += stack(items, area.x, y)
      for (const [o] of items) if (o) put(o, o === eyebrow ? 'occhiello' : o === title ? 'titolo' : 'sommario')
      y += g * 1.5
      if (imgUrl) { const ih = Math.round((area.y + area.h - y) * 0.42); placeImage({ x: area.x, y, w: area.w, h: ih }); y += ih + g }
      if (c.body) {
        const cols = landscape ? 3 : 2, cw = (area.w - g * (cols - 1)) / cols
        const words = c.body.split(/\s+/), per = Math.ceil(words.length / cols)
        for (let i = 0; i < cols; i++) {
          const part = words.slice(i * per, (i + 1) * per).join(' ')
          if (!part) continue
          const t = tb(part, 'text', base * 0.92, { width: cw, fill: ink, textAlign: 'left' })
          t.set({ left: area.x + i * (cw + g), top: y }); put(t, `colonna-${i + 1}`)
        }
      }
      break
    }

    case 'citazione': {
      const q = c.quote || c.title
      const mark = tb('“', 'display', s * 0.34, { width: s * 0.3, fill: accent, textAlign: 'left', lineHeight: 0.8 })
      const markH = heightOf(mark) * 0.55
      const qt = styleTitle(fit(q, 'display', align === 'center' ? area.w : colW(11), area.h * 0.62, s * 0.085, base * 1.2, 8))
      const author = c.author ? tb(`— ${c.author}`, 'label', lab * 1.1, { width: area.w, fill: muted }) : null
      const items: [Obj | null, number][] = [[qt, 0], [author, sub]]
      const h = markH + stackH(items)
      const top = area.y + (area.h - h) / 2
      mark.set({ left: align === 'center' ? area.x + (area.w - measure('“', display.family, display.weight, mark.fontSize, 0)) / 2 : area.x - s * 0.01, top: top - heightOf(mark) * 0.12 })
      put(mark, 'virgolette')
      stack(items, area.x, top + markH, area.w)
      put(qt, 'citazione'); if (author) put(author, 'autore')
      if (c.eyebrow) { const e = tb(c.eyebrow, 'label', lab, { width: area.w, fill: readable(accent, pal.bg, 3) }); e.set({ left: area.x, top: area.y }); put(e, 'occhiello') }
      break
    }

    case 'numeri': {
      const stats = (c.stats ?? []).slice(0, 4)
      const eyebrow = c.eyebrow ? tb(c.eyebrow, 'label', lab, { width: area.w, fill: readable(accent, pal.bg, 3) }) : null
      const title = styleTitle(fit(c.title, 'display', contentW(10), area.h * 0.28, s * (landscape ? 0.12 : 0.09), sub, 3))
      const subtitle = c.subtitle ? tb(c.subtitle, 'text', base, { width: contentW(8), fill: muted }) : null
      const items: [Obj | null, number][] = [[eyebrow, 0], [title, eyebrow ? lab * 1.4 : 0], [subtitle, base]]
      const y0 = area.y
      stack(items, area.x, y0, area.w)
      for (const [o] of items) if (o) put(o, o === eyebrow ? 'occhiello' : o === title ? 'titolo' : 'sottotitolo')
      if (stats.length) {
        const cols = landscape ? stats.length : Math.min(2, stats.length), rows = Math.ceil(stats.length / cols)
        const gridTop = area.y + area.h * (landscape ? 0.42 : 0.45)
        const cellW = (area.w - g * (cols - 1)) / cols, cellH = (area.y + area.h - gridTop - g * (rows - 1)) / rows
        const valSize = Math.min(...stats.map(st => fit(st.value, 'display', cellW * 0.88, cellH * 0.62, s * 0.2, sub, 1).fontSize))
        stats.forEach((st, i) => {
          const cx = area.x + (i % cols) * (cellW + g), cy = gridTop + Math.floor(i / cols) * (cellH + g)
          put(new fabric.Rect({ left: cx, top: cy, width: cellW, height: Math.max(1, Math.round(s * 0.002)), fill: ink, opacity: 0.35, strokeWidth: 0 }) as fabric.Rect & Obj, `riga-dato-${i + 1}`)
          const v = tb(st.value, 'display', valSize, { width: cellW, fill: i === 0 ? readable(accent, pal.bg, 3) : ink, textAlign: 'left' })
          v.set({ left: cx, top: cy + g * 0.8 }); put(v, `dato-${i + 1}`)
          const l = tb(st.label, 'text', base * 0.9, { width: cellW * 0.9, fill: muted, textAlign: 'left' })
          l.set({ left: cx, top: cy + g * 0.8 + heightOf(v) + base * 0.5 }); put(l, `didascalia-${i + 1}`)
        })
      }
      break
    }

    case 'elenco': {
      const list = (c.items ?? []).slice(0, 8)
      const eyebrow = c.eyebrow ? tb(c.eyebrow, 'label', lab, { width: area.w, fill: readable(accent, pal.bg, 3), textAlign: 'left' }) : null
      const title = styleTitle(fit(c.title, 'display', colW(11), area.h * 0.3, s * 0.1, sub, 3, { textAlign: 'left' }))
      const y = area.y + stack([[eyebrow, 0], [title, eyebrow ? lab * 1.4 : 0]], area.x, area.y)
      if (eyebrow) put(eyebrow, 'occhiello'); put(title, 'titolo')
      if (list.length) {
        const top = y + sub * 1.4, rowH = (area.y + area.h - top) / list.length
        const numW = colW(2)
        const size = Math.min(sub, Math.max(base, rowH * 0.36))
        list.forEach((it, i) => {
          const ry = top + i * rowH
          put(new fabric.Rect({ left: area.x, top: ry, width: area.w, height: Math.max(1, Math.round(s * 0.0018)), fill: ink, opacity: 0.25, strokeWidth: 0 }) as fabric.Rect & Obj, `riga-${i + 1}`)
          const n = tb(String(i + 1).padStart(2, '0'), 'label', lab * 1.1, { width: numW, fill: readable(accent, pal.bg, 3), textAlign: 'left' })
          const t = fit(it, 'text', area.w - numW - g, rowH * 0.8, size, base * 0.8, 2, { textAlign: 'left', fill: ink })
          const th = heightOf(t)
          t.set({ left: area.x + numW + g, top: ry + (rowH - th) / 2 }); n.set({ left: area.x, top: ry + (rowH - heightOf(n)) / 2 })
          put(n, `numero-${i + 1}`); put(t, `voce-${i + 1}`)
        })
      }
      break
    }

    case 'scheda': {
      const cw = Math.min(area.w, landscape ? colW(7) : area.w * 0.9), cx = (W - cw) / 2
      const pad = Math.round(s * 0.06)
      // altezza della scheda: si misura il contenuto e si centra
      const surface = pal.surface
      const tInk = readable(pal.ink, surface)
      const eyebrow = c.eyebrow ? tb(c.eyebrow, 'label', lab, { width: cw - 2 * pad, fill: readable(accent, surface, 3) }) : null
      const title = styleTitle(fit(c.title, 'display', cw - 2 * pad, area.h * 0.4, s * 0.1, sub, 4, { fill: tInk }))
      const subtitle = c.subtitle ? tb(c.subtitle, 'text', base * 1.05, { width: cw - 2 * pad, fill: readable(pal.muted, surface, 3) }) : null
      const meta = c.meta?.length ? tb(c.meta.join('  ·  '), 'label', lab, { width: cw - 2 * pad, fill: readable(pal.muted, surface, 3) }) : null
      const items: [Obj | null, number][] = [[eyebrow, 0], [title, eyebrow ? lab * 1.4 : 0], [subtitle, base], [meta, base * 1.4]]
      const ctaH = c.cta ? Math.round(base * 0.9 * 3) + base * 1.6 : 0
      const ch = Math.min(area.h, stackH(items) + ctaH + 2 * pad)
      const cy = (H - ch) / 2
      const card = new fabric.Rect({ left: cx, top: cy, width: cw, height: ch, rx: Math.max(radius, s * 0.02), ry: Math.max(radius, s * 0.02), fill: surface, strokeWidth: 0 }) as fabric.Rect & Obj
      const sh = fx('dropShadow', 'sollevata'); if (sh) card.fx = [sh]
      if (ornId && bgSpec.kind !== 'generative') art({ x: 0, y: 0, w: W, h: H }, { clip: false })
      put(card, 'scheda')
      const used = stack(items, cx + pad, cy + pad, cw - 2 * pad)
      for (const [o] of items) if (o) put(o, o === eyebrow ? 'occhiello' : o === title ? 'titolo' : o === subtitle ? 'sottotitolo' : 'info')
      ctaBlock(cx + pad, cy + pad + used + base * 1.6, cw - 2 * pad)
      free = { x: inner.x, y: inner.y, w: inner.w, h: Math.max(0, cy - inner.y - g) }
      break
    }

    case 'galleria': {
      const imgH = Math.round(area.h * (landscape ? 1 : 0.62))
      const imgW = landscape ? Math.round(area.w * 0.55) : area.w
      placeImage({ x: area.x, y: area.y, w: imgW, h: imgH }, 'opera', radius)
      const tbox: Box = landscape ? { x: area.x + imgW + g * 2, y: area.y, w: area.w - imgW - g * 2, h: area.h } : { x: area.x, y: area.y + imgH + g * 1.5, w: area.w, h: area.h - imgH - g * 1.5 }
      const title = styleTitle(fit(c.title, 'display', tbox.w, tbox.h * 0.45, s * 0.075, base * 1.2, 3, { textAlign: 'left' }))
      const author = c.author ? tb(c.author, 'label', lab, { width: tbox.w, fill: ink, textAlign: 'left' }) : null
      const subtitle = c.subtitle ? tb(c.subtitle, 'text', base * 0.9, { width: Math.min(tbox.w, colW(7)), fill: muted, textAlign: 'left' }) : null
      const meta = c.meta?.length ? tb(c.meta.join('\n'), 'label', lab * 0.95, { width: tbox.w, fill: muted, textAlign: 'left' }) : null
      const items: [Obj | null, number][] = [[author, 0], [title, author ? lab : 0], [subtitle, base], [meta, base * 1.2]]
      stack(items, tbox.x, landscape ? tbox.y + tbox.h - stackH(items) : tbox.y)
      for (const [o] of items) if (o) put(o, o === author ? 'autore' : o === title ? 'titolo' : o === subtitle ? 'descrizione' : 'scheda-tecnica')
      break
    }

    case 'cover': {
      // foto a tutto campo, veli per la lettura, testata enorme, titoli di copertina, codice
      if (!photoArt({ x: 0, y: 0, w: W, h: H }) && !art({ x: 0, y: 0, w: W, h: H }, { clip: false })) put(new fabric.Rect({ left: 0, top: 0, width: W, height: H, fill: pal.surface, strokeWidth: 0 }) as fabric.Rect & Obj, 'pannello-arte')
      const veil = (y: number, h: number, up: boolean, role: string) => { const v = put(new fabric.Rect({ left: 0, top: y, width: W, height: h, strokeWidth: 0 }) as fabric.Rect & Obj, role); v.set('fill', new fabric.Gradient({ type: 'linear', gradientUnits: 'percentage', coords: { x1: 0, y1: 0, x2: 0, y2: 1 }, colorStops: up ? [{ offset: 0, color: alpha(pal.bg, 0.78) }, { offset: 1, color: alpha(pal.bg, 0) }] : [{ offset: 0, color: alpha(pal.bg, 0) }, { offset: 0.5, color: alpha(pal.bg, 0.6) }, { offset: 1, color: alpha(pal.bg, 0.92) }] })) }
      veil(0, H * 0.34, true, 'velo-alto'); veil(H * 0.45, H * 0.55, false, 'velo')
      const mastText = (c.brand || c.title.split(/\s+/)[0]).toUpperCase()
      const mast = fit(mastText, 'display', inner.w, H * 0.17, H * 0.2, sub, 1, { textAlign: 'center', fill: lum(pal.bg) > 0.5 ? ink : pal.ink })
      mast.set({ left: inner.x, top: inner.y - s * 0.01, width: inner.w }); put(mast, 'testata')
      const lineY = inner.y + heightOf(mast) + g * 0.5
      put(new fabric.Rect({ left: inner.x, top: lineY, width: inner.w, height: Math.max(1, s * 0.002), fill: ink, strokeWidth: 0 }) as fabric.Rect & Obj, 'riga-testata')
      const issue = [c.eyebrow, ...(c.meta ?? [])].filter(Boolean).slice(0, 3) as string[]
      issue.forEach((m, i) => { const t = tb(m, 'label', lab, { width: inner.w / 3, fill: ink, textAlign: i === 0 ? 'left' : i === issue.length - 1 && issue.length > 1 ? 'right' : 'center' }); t.set({ left: inner.x + (issue.length === 1 ? 0 : (i * inner.w) / 3), top: lineY + g * 0.5 }); put(t, `numero-uscita-${i + 1}`) })
      // titoli di copertina a sinistra
      const lines = (c.items?.length ? c.items : c.tags ?? []).slice(0, 4)
      let y = lineY + g * 3.2
      lines.forEach((l, i) => {
        const n = tb(String(i + 1).padStart(2, '0'), 'label', lab, { width: colW(4), fill: readable(accent, pal.bg, 2.5), textAlign: 'left' }); n.set({ left: inner.x, top: y }); put(n, `strillo-numero-${i + 1}`)
        const t = tb(l, 'text', sub * 0.72, { width: colW(4), fill: ink, textAlign: 'left', lineHeight: 1.1, fontWeight: String(pickWeight(textF.family, 700)) }); t.set({ left: inner.x, top: y + heightOf(n) + lab * 0.3 }); put(t, `strillo-${i + 1}`)
        y += heightOf(n) + heightOf(t) + g * 1.3
      })
      // titolo principale in basso
      const eyebrow = c.eyebrow && issue[0] !== c.eyebrow ? tb(c.eyebrow, 'label', lab, { width: colW(8), fill: readable(accent, pal.bg, 2.5), textAlign: 'left' }) : null
      const subtitle = c.subtitle ? tb(c.subtitle, 'text', base * 1.1, { width: colW(7), fill: ink, textAlign: 'left' }) : null
      const restH = (eyebrow ? heightOf(eyebrow) + lab : 0) + (subtitle ? heightOf(subtitle) + base : 0)
      const title = styleTitle(fit(c.title, 'display', colW(9), H * 0.3 - restH, s * 0.16, sub, 3, { textAlign: 'left', fill: ink }))
      const bh = stackH([[eyebrow, 0], [title, eyebrow ? lab : 0], [subtitle, base]])
      stack([[eyebrow, 0], [title, eyebrow ? lab : 0], [subtitle, base]], inner.x, inner.y + inner.h - bh)
      if (eyebrow) put(eyebrow, 'occhiello'); put(title, 'titolo'); if (subtitle) put(subtitle, 'sottotitolo')
      decor.add('barcode'); if (c.badge) decor.add('sticker')
      break
    }

    case 'tipografico': {
      // righe di titolo a tutta larghezza, una fascia foto (o arte) che le attraversa, microtipografia in colonne
      const ls = titleLines(c.title, inner.w, 3)
      const footH = Math.round(H * 0.17)
      const avail = inner.h - footH - g * 2
      const lead = S.display.leading ?? 0.9
      const bandH = Math.round(avail * 0.34)
      let k = 1
      const total = () => ls.reduce((a, l) => a + l.size * k * lead * 1.02, 0) + bandH
      if (total() > avail) k = (avail - bandH) / (total() - bandH)
      let y = inner.y
      const objs: Obj[] = []
      ls.forEach((l, i) => {
        const t = new fabric.Text(l.text, { fontFamily: display.family, fontWeight: String(display.weight), fontSize: Math.floor(l.size * k), charSpacing: Math.round((S.display.tracking ?? 0) * 1000), lineHeight: 1, fill: ink }) as fabric.Text & Obj
        if (i === 1) y += bandH - t.height * 0.32 // la seconda riga morde la fascia
        t.set({ left: inner.x - t.fontSize * 0.04, top: y }); objs.push(t)
        y += t.height * lead
      })
      const bandY = inner.y + (objs[0] ? objs[0].height * lead : 0) + g * 0.2
      const band: Box = { x: 0, y: bandY, w: W, h: bandH - g * 0.4 }
      if (!photoArt(band)) art(band)
      objs.forEach((o, i) => { styleTitle(o); put(o, `titolo-${i + 1}`) })
      // microtipografia: tre colonne sotto un filetto
      const fy = inner.y + inner.h - footH
      put(new fabric.Rect({ left: inner.x, top: fy, width: inner.w, height: Math.max(1, s * 0.002), fill: ink, strokeWidth: 0 }) as fabric.Rect & Obj, 'filetto-piede')
      const cw3 = (inner.w - 2 * g) / 3
      const colTxt: [string, Role, string][] = [[c.subtitle ?? '', 'text', 'sottotitolo'], [c.body ?? (c.tags ?? []).join(' · '), 'text', 'testo'], [[c.brand, ...(c.meta ?? [])].filter(Boolean).join('\n'), 'label', 'informazioni']]
      colTxt.forEach(([txt, role, name], i) => { if (!txt) return; const t = fit(txt, role, cw3, footH - g, role === 'label' ? lab * 1.1 : base, lab * 0.8, 6, { fill: i === 0 ? ink : muted, textAlign: 'left' }); t.set({ left: inner.x + i * (cw3 + g), top: fy + g * 0.8 }); put(t, name) })
      if (c.eyebrow) {
        // occhiello come etichetta appoggiata sulla fascia, in alto a destra
        const ew = Math.ceil(measure(c.eyebrow.toUpperCase(), labF.family, labW, lab, labF.tracking ?? 0.08)) + lab * 2
        const e = tb(c.eyebrow, 'label', lab, { width: ew, fill: readable(pal.bg, accent), textAlign: 'center', backgroundColor: accent })
        e.set({ left: inner.x + inner.w - ew, top: bandY + g * 0.6 }); put(e, 'occhiello')
      }
      break
    }

    case 'manuale': {
      // tavola tecnica: richiami orizzontali che cadono su punti veri dell'illustrazione
      const cols = 6
      for (let i = 0; i <= cols; i++) put(new fabric.Rect({ left: inner.x + (inner.w * i) / cols, top: 0, width: 1, height: H, fill: ink, opacity: 0.06, strokeWidth: 0, selectable: false, evented: false }) as fabric.Rect & Obj, `griglia-${i + 1}`)
      const eyebrow = tb(`${c.eyebrow ? c.eyebrow + '  —  ' : ''}Fig. ${String(index + 1).padStart(2, '0')}`, 'label', lab, { width: inner.w, fill: readable(accent, pal.bg, 2.5), textAlign: 'left' })
      eyebrow.set({ left: inner.x, top: inner.y }); put(eyebrow, 'occhiello')
      const title = styleTitle(fit(c.title, 'display', landscape ? inner.w * 0.5 : inner.w * 5 / 6, H * 0.2, s * 0.12, sub, 3, { textAlign: 'left' }))
      title.set({ left: inner.x, top: inner.y + heightOf(eyebrow) + lab * 1.2 }); put(title, 'titolo')
      const top = inner.y + heightOf(eyebrow) + lab * 1.2 + heightOf(title) + g * 2
      const tableH = specRows().length * Math.round(lab * 2.7)
      const labels = (c.items?.length ? c.items : c.tags ?? []).slice(0, 4)
      const colW2 = inner.w * (landscape ? 2 : 2) / cols  // due colonne di griglia per le voci
      const ill: Box = landscape
        ? { x: inner.x + inner.w * 3 / cols, y: inner.y, w: inner.w * 3 / cols, h: inner.h }
        : { x: inner.x + colW2 + g, y: top, w: inner.w - colW2 - g, h: inner.y + inner.h - top - tableH - g * 3 }
      const subY = ill.y + ill.h - (c.subtitle ? heightOf(tb(c.subtitle, 'text', base, { width: colW2 - g, fill: muted })) : 0)
      if (imgUrl) photoArt(ill)
      else {
        const { ready } = asset(ASSET.tavola(tema()), ill, { role: 'illustrazione', color: ink, blend: lum(pal.bg) > 0.5 ? 'multiply' : 'screen' })
        const img = await ready
        if (img && labels.length) {
          const n = labels.length
          const rows = Array.from({ length: n }, (_, i) => 0.14 + (0.6 * i) / Math.max(1, n - 1))
          const pts = inkPoints(img, rows)
          const r = Math.round(lab * 1.1), sw = Math.max(1.2, s * 0.0016)
          pts.forEach((pt, i) => {
            if (!pt) return
            const y = Math.min(pt.y, subY - g * 2 - (n - 1 - i) * sub * 2.2)
            const num = tb(String(i + 1).padStart(2, '0'), 'label', lab * 0.85, { width: 2 * r, fill: readable(pal.bg, accent), textAlign: 'center' })
            put(new fabric.Circle({ left: inner.x, top: y - r, radius: r, fill: accent, strokeWidth: 0 }) as fabric.Circle & Obj, `richiamo-${i + 1}`)
            num.set({ left: inner.x, top: y - heightOf(num) / 2 }); put(num, `richiamo-numero-${i + 1}`)
            const t = tb(labels[i], 'text', base * 0.85, { width: colW2 - 2 * r - g, fill: ink, textAlign: 'left' })
            t.set({ left: inner.x + 2 * r + g * 0.5, top: y - heightOf(t) / 2 }); put(t, `richiamo-testo-${i + 1}`)
            const x0 = inner.x + colW2
            // filo orizzontale fino alla colonna dell'illustrazione, poi dritto al punto
            put(new fabric.Path(`M ${x0} ${y} L ${pt.x - (pt.y === y ? 0 : 0)} ${y} L ${pt.x} ${pt.y}`, { fill: '', stroke: ink, strokeWidth: sw, opacity: 0.85 }) as fabric.Path & Obj, `richiamo-filo-${i + 1}`)
            put(new fabric.Circle({ left: pt.x - r * 0.32, top: pt.y - r * 0.32, radius: r * 0.32, fill: accent, stroke: pal.bg, strokeWidth: sw }) as fabric.Circle & Obj, `richiamo-punto-${i + 1}`)
          })
        }
      }
      if (c.subtitle) { const t = tb(c.subtitle, 'text', base, { width: landscape ? inner.w * 0.45 : colW2 - g, fill: muted, textAlign: 'left' }); t.set({ left: inner.x, top: landscape ? inner.y + inner.h - tableH - g * 2 - heightOf(t) : subY }); put(t, 'sottotitolo') }
      specTable(landscape ? { x: inner.x, y: inner.y + inner.h - tableH, w: inner.w * 0.45, h: tableH } : { x: inner.x, y: inner.y + inner.h - tableH, w: inner.w, h: tableH })
      decor.add('crop'); decor.delete('ghost'); decor.delete('arrow'); decor.delete('vertical')
      break
    }

    case 'collage': {
      // composizione a registro: foto stampata nel disco, inchiostro sfalsato di un passo,
      // un solo segno al vivo, timbri in colonna sulla destra, titolo che morde la foto
      const pd = Math.round(Math.min(colW(9), H * 0.56))
      const pbox: Box = { x: inner.x, y: inner.y + lab * 3, w: pd, h: pd }
      const off = Math.round(g * 0.9)
      put(new fabric.Path(shapeD('cerchio', pd, pd, 0), { left: pbox.x + off, top: pbox.y + off, fill: accent, strokeWidth: 0, globalCompositeOperation: 'multiply' }) as fabric.Path & Obj, 'inchiostro')
      const prevShape = imageShape
      if (!imgUrl) art(pbox, { r: pd / 2 })
      else placeImage(pbox, 'immagine', 0, prevShape === 'strisce' || prevShape === 'rettangolo' ? 'cerchio' : prevShape)
      asset(ASSET.segno(), { x: W - colW(5), y: -H * 0.04, w: colW(5) + M, h: H * 0.32 }, { role: 'segno', color: ink, flip: true, opacity: 0.9 })
      const right: Box = { x: inner.x + colW(9) + g, y: pbox.y + pd * 0.12, w: colW(3), h: pd * 0.76 }
      const tags = (c.tags ?? []).slice(0, 4)
      tags.forEach((tag, i) => {
        const t = tb(tag, 'label', lab * 1.05, { width: right.w, fill: i === 0 ? readable(pal.bg, accent) : ink, textAlign: 'center', backgroundColor: i === 0 ? accent : pal.surface })
        t.set({ left: right.x, top: right.y + (i * right.h) / Math.max(1, tags.length), angle: i % 2 ? 3 : -3, padding: lab * 0.5 }); put(t, `timbro-${i + 1}`)
      })
      if (c.eyebrow) { const e = tb(c.eyebrow, 'label', lab, { width: colW(6), fill: ink, textAlign: 'left' }); e.set({ left: inner.x, top: inner.y }); put(e, 'occhiello') }
      const tTop = pbox.y + pd * 0.78
      const subH = c.subtitle ? heightOf(tb(c.subtitle, 'text', base * 1.05, { width: colW(8) })) + base * 1.4 : 0
      const title = fit(c.title, 'display', inner.w, inner.y + inner.h - tTop - subH, s * 0.15, sub, 3, { textAlign: 'left' })
      const st = fx('stroke', 'adesivo', { size: Math.max(6, Math.round(s * 0.009)), color: pal.bg }); if (st) title.fx = [st]
      title.set({ left: inner.x, top: tTop }); put(title, 'titolo')
      if (c.subtitle) { const t = tb(c.subtitle, 'text', base * 1.05, { width: colW(8), fill: ink, textAlign: 'left' }); t.set({ left: inner.x, top: tTop + heightOf(title) + base * 1.2 }); put(t, 'sottotitolo') }
      if (c.badge) decor.add('sticker')
      decor.delete('scribble'); decor.delete('halftoneDisc'); decor.delete('bauhaus')
      break
    }

    case 'drop': {
      // foto con plastica, titolo ripetuto vuoto, segni tribali, dettagli tecnici agli angoli
      noImageFx = true
      if (!photoArt({ x: 0, y: 0, w: W, h: H })) art({ x: 0, y: 0, w: W, h: H }, { clip: false })
      asset(ASSET.plastica(), { x: 0, y: 0, w: W, h: H }, { role: 'plastica', cover: true, blend: 'screen', opacity: 0.42, locked: true })
      const word = (S.display.upper ? c.title.toUpperCase() : c.title)
      const base0 = fit(word, 'display', inner.w, H * 0.16, s * 0.3, sub, 2, { textAlign: 'center' })
      const th = heightOf(base0), n = 3, y0 = (H - th * n * 0.82) / 2
      for (let i = 0; i < n; i++) {
        const t = fit(word, 'display', inner.w, H * 0.16, s * 0.3, sub, 2, { textAlign: 'center', fill: i === n - 1 ? accent : pal.ink })
        if (i < n - 1) { const e = fx('hollow', 'medio', { thickness: Math.max(2, Math.round(s * 0.0025)) }); if (e) t.fx = [e]; t.set('opacity', 0.35 + i * 0.2) }
        t.set({ left: inner.x, top: y0 + i * th * 0.82 }); put(t, i === n - 1 ? 'titolo' : `eco-${i + 1}`)
      }
      asset(ASSET.segno(), { x: W * 0.45, y: H * 0.6, w: W * 0.6, h: H * 0.42 }, { role: 'segno', color: accent, flip: true })
      const corner = (txt: string, x: number, y: number, alignR: boolean, role: string) => { const t = tb(txt, 'label', lab, { width: colW(4), fill: pal.ink, textAlign: alignR ? 'right' : 'left' }); t.set({ left: x - (alignR ? colW(4) : 0), top: y }); put(t, role) }
      if (c.brand) corner(c.brand, inner.x, inner.y, false, 'marchio')
      if (c.eyebrow) corner(c.eyebrow, inner.x + inner.w, inner.y, true, 'occhiello')
      if (c.subtitle) { const t = tb(c.subtitle, 'text', base * 0.95, { width: colW(6), fill: pal.ink, textAlign: 'left' }); t.set({ left: inner.x, top: inner.y + inner.h - heightOf(t) - (c.cta ? 0 : 0) }); put(t, 'sottotitolo') }
      ;(c.meta ?? []).slice(0, 2).forEach((m, i) => corner(m, inner.x + inner.w, inner.y + inner.h - lab * 1.6 * (2 - i), true, `info-${i + 1}`))
      decor.add('barcode'); if (c.badge) decor.add('sticker')
      break
    }

    case 'arte': {
      const abox: Box = landscape ? { x: 0, y: 0, w: Math.round(W * 0.52), h: H } : { x: 0, y: 0, w: W, h: Math.round(H * 0.56) }
      if (!art(abox)) put(new fabric.Rect({ left: abox.x, top: abox.y, width: abox.w, height: abox.h, fill: pal.surface, strokeWidth: 0 }) as fabric.Rect & Obj, 'pannello-arte')
      const tbox: Box = landscape
        ? { x: abox.w + M, y: area.y, w: W - abox.w - 2 * M, h: area.h }
        : { x: area.x, y: abox.h + M * 0.9, w: area.w, h: area.y + area.h - abox.h - M * 0.9 }
      heroText(tbox, { maxTitle: s * 0.13, titleShare: 0.6, anchor: landscape ? 'center' : 'top' })
      break
    }

    case 'bento': {
      type Cell = 'title' | 'art' | 'info' | 'extra' | 'action'
      const [gc, gr, tpl]: [number, number, Record<Cell, number[]>] = landscape ? [8, 4, { title: [0, 0, 4, 3], art: [4, 0, 4, 4], action: [0, 3, 2, 1], info: [2, 3, 2, 1], extra: [0, 0, 0, 0] }]
        : H > W * 1.5 ? [6, 10, { title: [0, 0, 6, 3], art: [0, 3, 6, 3], info: [0, 6, 3, 2], extra: [3, 6, 3, 2], action: [0, 8, 6, 2] }]
        : H > W * 1.1 ? [6, 8, { title: [0, 0, 6, 3], art: [0, 3, 4, 3], info: [4, 3, 2, 3], extra: [0, 6, 3, 2], action: [3, 6, 3, 2] }]
        : [6, 6, { title: [0, 0, 4, 3], art: [4, 0, 2, 3], info: [0, 3, 2, 3], extra: [2, 3, 4, 2], action: [2, 5, 4, 1] }]
      const gap = Math.round(g * 0.8), cw = (inner.w - gap * (gc - 1)) / gc, chh = (inner.h - gap * (gr - 1)) / gr
      const rr = S.id === 'brutalista' ? 0 : Math.max(radius, Math.round(s * 0.022))
      const cell = (k: Cell): Box => { const [x, y, w, h] = tpl[k]; return { x: inner.x + x * (cw + gap), y: inner.y + y * (chh + gap), w: w * cw + (w - 1) * gap, h: h * chh + (h - 1) * gap } }
      const pad = Math.round(s * 0.035)
      const inset = (b: Box): Box => ({ x: b.x + pad, y: b.y + pad, w: b.w - 2 * pad, h: b.h - 2 * pad })
      const panel = (b: Box, fill: string, role: string) => put(new fabric.Rect({ left: b.x, top: b.y, width: b.w, height: b.h, rx: rr, ry: rr, fill, strokeWidth: 0 }) as fabric.Rect & Obj, role)
      // titolo
      const tc = cell('title'); panel(tc, pal.surface, 'cella-titolo'); cellTitle(inset(tc), pal.surface, s * 0.13)
      // arte
      const ac = cell('art'); art(ac, { panel: mix2(pal.surface, accent), r: rr })
      // informazione chiave su accento
      const ic = cell('info'); panel(ic, accent, 'cella-info')
      const onAcc = readable(pal.bg, accent), ib = inset(ic)
      const st = c.stats?.[0]
      if (st) {
        const v = fit(st.value, 'display', ib.w, ib.h * 0.6, s * 0.16, sub, 1, { fill: onAcc, textAlign: 'left' }); v.set({ left: ib.x, top: ib.y }); put(v, 'dato-1')
        const l = tb(st.label, 'text', base * 0.9, { width: ib.w, fill: onAcc, textAlign: 'left' }); l.set({ left: ib.x, top: ib.y + ib.h - heightOf(l) }); put(l, 'didascalia-1')
      } else if (c.badge || c.brand) {
        const t = fit(c.badge || c.brand!, 'display', ib.w, ib.h, s * 0.1, base, 4, { fill: onAcc, textAlign: 'left' }); t.set({ left: ib.x, top: ib.y + ib.h - heightOf(t) }); put(t, 'info')
      }
      // foto o seconda arte o etichette
      if (tpl.extra[2]) {
        const ec = cell('extra')
        if (imgUrl) placeImage(ec, 'immagine', rr)
        else if (c.tags?.length) {
          panel(ec, pal.surface, 'cella-etichette'); const eb = inset(ec)
          const t = fit(c.tags.slice(0, 5).map(x => `— ${x}`).join('\n'), 'text', eb.w, eb.h, sub, base * 0.8, 6, { fill: readable(pal.ink, pal.surface), textAlign: 'left' }); t.set({ left: eb.x, top: eb.y }); put(t, 'elenco-etichette')
        } else art(ec, { id: S.ornaments[(index + 1) % S.ornaments.length], seedOff: 7, panel: pal.surface, r: rr })
      }
      // azione su inchiostro
      const xc = cell('action'); const dark = lum(pal.bg) < 0.35 ? pal.surface : ink
      panel(xc, dark, 'cella-azione'); const xb = inset(xc), onInk = readable(pal.bg, dark)
      const main = c.cta || c.brand || ''
      if (main) { const t = fit(main, 'display', xb.w * 0.78, xb.h * 0.6, s * 0.075, base, 2, { fill: onInk, textAlign: 'left' }); t.set({ left: xb.x, top: xb.y + xb.h - heightOf(t) }); put(t, 'cta') }
      const metaLine = (c.meta ?? []).slice(0, 2).join('  ·  ')
      if (metaLine) { const m = tb(metaLine, 'label', lab, { width: xb.w, fill: onInk, textAlign: 'left', opacity: 0.75 }); m.set({ left: xb.x, top: xb.y }); put(m, 'info-azione') }
      const a = Math.min(xb.h * 0.5, s * 0.07)
      put(new fabric.Path(`M 0 ${a / 2} L ${a} ${a / 2} M ${a / 2} 0 L ${a} ${a / 2} L ${a / 2} ${a}`, { left: xb.x + xb.w - a, top: xb.y + xb.h - a, fill: '', stroke: onInk, strokeWidth: Math.max(3, s * 0.005), strokeLineCap: 'square' }) as fabric.Path & Obj, 'freccia-azione')
      break
    }

    case 'manifesto': {
      const colMax = Math.round(W * (landscape ? 0.2 : 0.27))
      const t = styleTitle(fit(c.title, 'display', H - 2 * M, colMax, s * 0.32, sub, 2, { textAlign: 'left' }))
      const th = heightOf(t)
      put(t, 'titolo')
      t.set({ angle: -90, left: inner.x + OX, top: H - M + OY }); t.setCoords()
      const x0 = M + th + g * 1.6
      put(new fabric.Rect({ left: x0 - g * 0.8, top: inner.y, width: Math.max(1, Math.round(s * 0.0018)), height: inner.h, fill: ink, opacity: 0.5, strokeWidth: 0 }) as fabric.Rect & Obj, 'filetto')
      const rb: Box = { x: x0, y: inner.y, w: W - x0 - M, h: inner.h }
      const artH = Math.round(rb.h * 0.55)
      art({ x: rb.x, y: rb.y, w: rb.w, h: artH }, { r: radius })
      const below: Box = { x: rb.x, y: rb.y + artH + g * 1.8, w: rb.w, h: rb.h - artH - g * 1.8 }
      const eyebrow = c.eyebrow ? tb(c.eyebrow, 'label', lab, { width: below.w, fill: readable(accent, pal.bg, 3), textAlign: 'left' }) : null
      const subtitle = c.subtitle ? fit(c.subtitle, 'text', below.w, below.h * 0.45, sub * 1.1, base, 4, { fill: ink, textAlign: 'left' }) : null
      const items: [Obj | null, number][] = [[eyebrow, 0], [subtitle, eyebrow ? lab * 1.4 : 0]]
      let y = below.y + stack(items, below.x, below.y)
      if (eyebrow) put(eyebrow, 'occhiello'); if (subtitle) put(subtitle, 'sottotitolo')
      const colsTxt = [c.body, (c.meta ?? []).join('\n')].filter(Boolean) as string[]
      if (colsTxt.length) {
        const cw2 = (below.w - g) / 2
        y += base * 1.2
        colsTxt.forEach((txt, i) => { const o = tb(txt, i === 1 || !c.body ? 'label' : 'text', i === 1 || !c.body ? lab : base * 0.82, { width: cw2, fill: muted, textAlign: 'left' }); o.set({ left: below.x + i * (cw2 + g), top: y }); put(o, i ? 'piede-1' : 'testo') })
      }
      if (c.cta) ctaBlock(below.x, below.y + below.h - Math.round(base * 0.9 * 3), below.w)
      break
    }

    default: { // eroe
      if (ornId && align === 'center') {
        // arte in alto, testo centrato sotto
        const artH = Math.round(area.h * 0.42)
        art({ x: area.x, y: area.y, w: area.w, h: artH }, { r: radius })
        heroText({ x: area.x, y: area.y + artH + g * 2, w: area.w, h: area.h - artH - g * 2 }, { maxTitle: s * 0.15, titleShare: 0.6, anchor: 'center' })
        break
      }
      const shapes = ornId || ['bauhaus', 'blob', 'index', 'dots'].some(d => decor.has(d as DecorId))
      const r = heroText(area, { maxTitle: s * (align === 'center' ? (c.title.split(/\s+/).length <= 2 ? 0.24 : 0.16) : 0.19), titleShare: shapes && align !== 'center' ? 0.42 : 0.62, anchor: align === 'center' ? 'center' : 'bottom' })
      const room: Box = { x: area.x, y: area.y, w: area.w, h: r.top - area.y - g * 2 }
      if (align !== 'center' && ornId && room.h > s * 0.2 && art(room, { r: radius })) free = null
      else free = align === 'center' ? null : room.h > s * 0.22 - g * 2 ? room : null
    }
  }

  /* ── fasce e decorazioni ── */
  const hair = Math.max(1, Math.round(s * 0.0016))
  if (folioText) {
    const top = [c.brand ?? '', c.meta?.[0] ?? ''].filter(Boolean)
    metaRow(inner.y, top, 'testata-info')
    put(new fabric.Rect({ left: inner.x, top: inner.y + folioH - hair, width: inner.w, height: hair, fill: ink, opacity: 0.5, strokeWidth: 0 }) as fabric.Rect & Obj, 'riga-alta')
    const bottom = (c.meta ?? []).slice(1, 4)
    const by = inner.y + inner.h - folioH + g * 0.4 - (decor.has('ticker') ? tickerH + g : 0)
    if (bottom.length) {
      put(new fabric.Rect({ left: inner.x, top: by - g * 0.4, width: inner.w, height: hair, fill: ink, opacity: 0.5, strokeWidth: 0 }) as fabric.Rect & Obj, 'riga-bassa')
      metaRow(by + g * 0.2, bottom, 'piede')
    }
  }
  if (decor.has('ticker')) {
    const y = H - tickerH
    put(new fabric.Rect({ left: 0, top: y, width: W, height: tickerH, fill: accent, strokeWidth: 0 }) as fabric.Rect & Obj, 'fascia')
    const word = (c.brand || c.badge || c.eyebrow || c.title).toUpperCase()
    let line = ''; while (measure(line, labF.family, labW, lab * 1.15, 0.08) < W + lab * 4 && line.length < 400) line += `${word}  ✦  `
    const t = new fabric.Text(line, { fontFamily: labF.family, fontWeight: String(labW), fontSize: Math.round(lab * 1.15), charSpacing: 80, fill: readable(pal.bg, accent) }) as fabric.Text & Obj
    t.set({ left: -lab * 2, top: y + (tickerH - t.height) / 2 })
    // il testo scorre oltre i bordi: lo si taglia alla larghezza della tavola
    t.clipPath = new fabric.Rect({ originX: 'left', originY: 'top', left: -t.width / 2 + lab * 2, top: -t.height, width: W, height: t.height * 2 })
    put(t, 'fascia-testo')
  }
  if (decor.has('crop')) {
    const d = Math.round(M * 0.45), len = Math.round(M * 0.35)
    ;[[d, d, 1, 1], [W - d, d, -1, 1], [d, H - d, 1, -1], [W - d, H - d, -1, -1]].forEach(([x, y, sx, sy], i) => {
      put(new fabric.Rect({ left: sx > 0 ? x : x - len, top: y - hair / 2, width: len, height: hair, fill: ink, opacity: 0.6, strokeWidth: 0 }) as fabric.Rect & Obj, `taglio-${i + 1}a`)
      put(new fabric.Rect({ left: x - hair / 2, top: sy > 0 ? y : y - len, width: hair, height: len, fill: ink, opacity: 0.6, strokeWidth: 0 }) as fabric.Rect & Obj, `taglio-${i + 1}b`)
    })
  }
  if (decor.has('frame')) {
    const d = Math.round(M * 0.45)
    put(new fabric.Rect({ left: d, top: d, width: W - 2 * d, height: H - 2 * d, fill: '', stroke: S.titleFx?.id === 'gradientOverlay' ? accent : ink, strokeWidth: hair, opacity: 0.7 }) as fabric.Rect & Obj, 'cornice')
  }
  if (decor.has('columns')) {
    for (let i = 0; i <= 12; i++) {
      const x = inner.x + (i === 12 ? inner.w : i * (colW(1) + g))
      put(new fabric.Rect({ left: x, top: 0, width: hair, height: H, fill: ink, opacity: 0.06, strokeWidth: 0, selectable: false, evented: false }) as fabric.Rect & Obj, `griglia-${i + 1}`)
    }
  }
  /* ── interventi editoriali e decorativi ──
     Ogni intervento si appoggia solo a contenuti veri e cerca uno spazio libero:
     i riquadri dei testi sono "occupati" e nulla ci finisce sopra. Grazie al
     taglio delle tavole le forme possono uscire al vivo dai bordi. */
  const backdrop = /_(sfondo|griglia-\d+|luce-\d|parola-fondo|taglio-\d+[ab]|cornice|registro-\d|puntini|velo|riga-alta|riga-bassa)(_\d+)?$/
  const occupied: Box[] = added.filter(o => !backdrop.test(String(o.get('name'))) && !(o.width >= W * 0.95 && o.height >= H * 0.95)).map(local)
  const hit = (b: Box, pad = g) => occupied.some(o => b.x < o.x + o.w + pad && b.x + b.w > o.x - pad && b.y < o.y + o.h + pad && b.y + b.h > o.y - pad)
  /** primo posto libero tra i candidati (coordinate della tavola) */
  const spot = (w: number, h: number, cands: [number, number][]) => {
    for (const [x, y] of cands) { const b = { x, y, w, h }; if (!hit(b)) return b }
    return null
  }
  const corners = (w: number, h: number, inset = M): [number, number][] => [
    [W - inset - w, inset], [inset, inset], [W - inset - w, H - inset - h], [inset, H - inset - h],
    [(W - w) / 2, inset], [(W - w) / 2, H - inset - h], [W - inset - w, (H - h) / 2], [inset, (H - h) / 2],
  ]
  const occupy = (o: fabric.FabricObject) => occupied.push(local(o))
  const titleObj = added.find(o => /_(titolo|citazione)$/.test(String(o.get('name')))) as (fabric.Textbox & Obj) | undefined

  const zone: Box | null = free
  if (zone && zone.h > s * 0.12) {
    const z = zone as Box
    const side = Math.min(z.w * 0.45, z.h)
    const zx = align === 'center' ? z.x + (z.w - side) / 2 : z.x + z.w - side
    if (decor.has('bauhaus')) {
      // composizione al vivo: il cerchio esce dal bordo, la mezzaluna e il quadrato lo agganciano
      const u = side / 2
      put(new fabric.Circle({ left: zx + u * 0.4, top: z.y - u * 0.5, radius: u * 1.1, fill: accent, strokeWidth: 0 }) as fabric.Circle & Obj, 'cerchio')
      put(new fabric.Rect({ left: zx + u * 0.9, top: z.y + u * 0.9, width: u, height: u, fill: ink, strokeWidth: 0 }) as fabric.Rect & Obj, 'quadrato')
      put(new fabric.Path(`M 0 ${u / 2} A ${u / 2} ${u / 2} 0 0 1 ${u} ${u / 2} Z`, { left: zx - u * 0.25, top: z.y + u * 1.35, fill: pal.muted, strokeWidth: 0 }) as fabric.Path & Obj, 'mezzaluna')
      put(new fabric.Rect({ left: zx - u * 0.25, top: z.y + u * 0.25, width: u * 0.12, height: u * 1.0, fill: ink, strokeWidth: 0 }) as fabric.Rect & Obj, 'asta')
      added.slice(-4).forEach(occupy)
    }
    if (decor.has('blob')) {
      const n = 7, r0 = side / 2, pts: number[][] = []
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, rr = r0 * (0.74 + 0.26 * Math.sin(i * 2.3 + index * 1.7))
        pts.push([r0 + Math.cos(a) * rr, r0 + Math.sin(a) * rr])
      }
      // curva morbida chiusa (Catmull-Rom → Bézier)
      let d = `M ${pts[0][0]} ${pts[0][1]}`
      for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
        d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`
      }
      put(new fabric.Path(d + ' Z', { left: zx + side * 0.25, top: z.y - side * 0.2, scaleX: 1.25, scaleY: 1.25, fill: accent, opacity: 0.92, strokeWidth: 0 }) as fabric.Path & Obj, 'forma')
      put(new fabric.Path(d + ' Z', { left: zx - side * 0.05, top: z.y + side * 0.35, scaleX: 0.55, scaleY: 0.55, angle: 30, fill: pal.surface, strokeWidth: 0 }) as fabric.Path & Obj, 'forma-piccola')
      added.slice(-2).forEach(occupy)
    }
    if (decor.has('index')) {
      const t = tb(String(index + 1).padStart(2, '0'), 'display', Math.min(z.h, s * 0.3), { width: side * 1.4, fill: ink, textAlign: align === 'center' ? 'center' : 'right' })
      t.set({ left: align === 'center' ? z.x + (z.w - side * 1.4) / 2 : z.x + z.w - side * 1.4, top: z.y })
      const e = fx('hollow', 'fine', { thickness: Math.max(2, Math.round(s * 0.002)) }); if (e) t.fx = [e]
      put(t, 'indice'); occupy(t)
    }
    if (decor.has('dots')) {
      const step = Math.round(s * 0.028), tile = document.createElement('canvas'); tile.width = tile.height = step
      const tx = tile.getContext('2d')!; tx.fillStyle = ink; tx.globalAlpha = 0.35; tx.beginPath(); tx.arc(step / 2, step / 2, Math.max(1.2, s * 0.0019), 0, Math.PI * 2); tx.fill()
      put(new fabric.Rect({ left: z.x + z.w * 0.45, top: z.y, width: z.w * 0.55, height: z.h, fill: new fabric.Pattern({ source: tile, repeat: 'repeat' }), strokeWidth: 0 }) as fabric.Rect & Obj, 'puntini')
    }
  }

  // parola fantasma: una parola enorme, al vivo, dietro a tutto
  if (decor.has('ghost') && !(folioText && (c.meta ?? []).length > 1)) {
    const word = (c.brand?.split(/\s+/)[0] || c.title.split(/\s+/).sort((a, b) => b.length - a.length)[0] || '').replace(/[^\p{L}\p{N}&]/gu, '')
    if (word) {
      const size = Math.min(H * 0.62, (W * 1.25) / Math.max(1, measure(word.toUpperCase(), display.family, display.weight, 1, S.display.tracking ?? 0)))
      const t = new fabric.Text(word.toUpperCase(), { fontFamily: display.family, fontWeight: String(display.weight), fontSize: Math.round(size), charSpacing: Math.round((S.display.tracking ?? 0) * 1000), lineHeight: 0.8, fill: ink, opacity: lum(pal.bg) > 0.5 ? 0.06 : 0.08 }) as fabric.Text & Obj
      t.set({ left: -W * 0.08, top: H - t.height * 0.78 })
      put(t, 'parola-fondo')
    }
  }

  // testo verticale nel margine: firma, data, luogo
  if (decor.has('vertical') && M >= lab * 2.2) {
    const parts = [c.brand, ...(c.meta ?? []).slice(0, 2)].filter(Boolean) as string[]
    if (parts.length) {
      const str = parts.join('   —   ').toUpperCase()
      const t = new fabric.Text(str, { fontFamily: labF.family, fontWeight: String(labW), fontSize: Math.round(lab * 0.9), charSpacing: Math.round((labF.tracking ?? 0.1) * 1000), fill: muted, angle: 90 }) as fabric.Text & Obj
      const len = t.width
      if (len < H - 2 * M) { t.set({ left: W - M / 2 + t.height / 2, top: (H - len) / 2 }); put(t, 'testo-verticale') }
    }
  }

  // adesivo: bollino ruotato con il testo del badge, contorno bianco e ombra
  if ((decor.has('sticker') || decor.has('badge')) && c.badge) {
    const r = Math.round(s * 0.1)
    const b = spot(2 * r, 2 * r, corners(2 * r, 2 * r, M * 0.7))
    if (b) {
      const starburst = decor.has('sticker')
      const pts: string[] = []
      const n = 14
      for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.86 : r; pts.push(`${r + Math.cos(a) * rr} ${r + Math.sin(a) * rr}`) }
      const shape = (starburst ? new fabric.Path(`M ${pts.join(' L ')} Z`, { left: b.x, top: b.y, fill: accent, strokeWidth: 0 }) : new fabric.Circle({ left: b.x, top: b.y, radius: r, fill: accent, strokeWidth: 0 })) as fabric.FabricObject & Obj
      shape.fx = [fx('stroke', 'adesivo', { size: Math.max(4, Math.round(s * 0.008)), color: '#ffffff' }), fx('dropShadow', 'morbida', { opacity: 22, distance: 6, size: 18 })].filter(Boolean) as FxEntry[]
      const rot = index % 2 ? 10 : -12
      put(shape, 'adesivo')
      const t = fit(c.badge, 'label', r * 1.35, r * 1.0, lab * 1.7, 10, 3, { fill: readable(pal.bg, accent), textAlign: 'center' })
      t.set({ left: b.x + r - t.width / 2, top: b.y + r - heightOf(t) / 2 })
      put(t, 'adesivo-testo')
      ;[shape, t].forEach(o => o.rotate(rot))
      occupied.push(b)
    }
  }

  // sottolineatura a mano sotto l'ultima riga del titolo
  if (decor.has('scribble') && titleObj && titleObj.textLines?.length) {
    const li = titleObj.textLines.length - 1
    const lw = Math.min(titleObj.getLineWidth(li), titleObj.width)
    const tl = local(titleObj)
    const x0 = titleObj.textAlign === 'center' ? tl.x + (tl.w - lw) / 2 : tl.x
    const y0 = tl.y + tl.h + s * 0.008
    const amp = s * 0.012, seg = 6
    let d = `M 0 ${amp}`
    for (let i = 1; i <= seg; i++) d += ` Q ${(lw * (i - 0.5)) / seg} ${i % 2 ? -amp * 0.4 : amp * 2.2} ${(lw * i) / seg} ${amp * (i % 2 ? 0.6 : 1.2)}`
    put(new fabric.Path(d, { left: x0, top: y0, fill: '', stroke: accent, strokeWidth: Math.max(3, s * 0.007), strokeLineCap: 'round', strokeLineJoin: 'round' }) as fabric.Path & Obj, 'sottolineatura')
  }

  // stelline: scintille a 4 punte vicino al titolo (cromate negli stili Y2K)
  if (decor.has('starburst') && titleObj) {
    const tl = local(titleObj)
    const star = (cx: number, cy: number, r: number, role: string) => {
      const k = r * 0.16
      const d = `M ${r} 0 C ${r + k} ${r - k} ${r + k} ${r - k} ${2 * r} ${r} C ${r + k} ${r + k} ${r + k} ${r + k} ${r} ${2 * r} C ${r - k} ${r + k} ${r - k} ${r + k} 0 ${r} C ${r - k} ${r - k} ${r - k} ${r - k} ${r} 0 Z`
      const o = new fabric.Path(d, { left: cx - r, top: cy - r, fill: S.id === 'cromo' ? '#d9dde8' : accent, strokeWidth: 0 }) as fabric.Path & Obj
      if (S.id === 'cromo' || S.id === 'morbido') { const e = fx('material3d', S.id === 'cromo' ? 'cromo' : 'gonfio', { depth: Math.round(r * 0.25), rx: 10, ry: -18 }); if (e) o.fx = [e] }
      put(o, role)
    }
    const r1 = s * 0.045, r2 = s * 0.025
    if (!hit({ x: tl.x + tl.w - r1, y: tl.y - r1 * 2.4, w: r1 * 2, h: r1 * 2 }, 0)) star(tl.x + tl.w, tl.y - r1 * 1.2, r1, 'stella-1')
    if (!hit({ x: tl.x - r2 * 2.2, y: tl.y + tl.h - r2, w: r2 * 2, h: r2 * 2 }, 0)) star(tl.x - r2 * 1.4, tl.y + tl.h, r2, 'stella-2')
  }

  // oggetto 3D protagonista quando non c'è una foto
  if (decor.has('shape3d') && !imgUrl) {
    const d = s * 0.42
    const b = spot(d, d, [[W - d * 0.72, -d * 0.22], [-d * 0.28, -d * 0.22], [W - d * 0.72, H - d * 0.78], [-d * 0.28, H - d * 0.78]])
    if (b) {
      const ring = S.id === 'tech' || S.id === 'neon'
      const o = (ring
        ? new fabric.Path(`M ${d / 2} 0 A ${d / 2} ${d / 2} 0 1 1 ${d / 2 - 0.1} 0 Z M ${d / 2} ${d * 0.28} A ${d * 0.22} ${d * 0.22} 0 1 0 ${d / 2 + 0.1} ${d * 0.28} Z`, { left: b.x, top: b.y, fill: '#c9cede', fillRule: 'evenodd', strokeWidth: 0 })
        : new fabric.Circle({ left: b.x, top: b.y, radius: d / 2, fill: accent, strokeWidth: 0 })) as fabric.FabricObject & Obj
      const variant = S.id === 'cromo' || ring ? 'cromo' : S.id === 'morbido' ? 'gonfio' : 'vetro'
      const e = fx('material3d', variant, { shape: ring ? 0 : 1, depth: Math.round(d * 0.12), rx: 22, ry: -28, useColor: variant === 'gonfio' ? 1 : 0, color: accent })
      if (e) o.fx = [e]
      put(o, 'oggetto-3d'); occupied.push(b)
    }
  }

  // disco retinato al vivo: tono pop/stampa
  if (decor.has('halftoneDisc')) {
    const d = s * 0.5
    const b = spot(d, d, [[W - d * 0.6, H - d * 0.6], [-d * 0.4, H - d * 0.6], [W - d * 0.6, -d * 0.4], [-d * 0.4, -d * 0.4]])
    if (b) {
      const o = new fabric.Circle({ left: b.x, top: b.y, radius: d / 2, strokeWidth: 0,
        fill: new fabric.Gradient({ type: 'linear', gradientUnits: 'percentage', coords: { x1: 0, y1: 0, x2: 1, y2: 1 }, colorStops: [{ offset: 0, color: accent }, { offset: 1, color: pal.bg }] }) }) as fabric.Circle & Obj
      const e = fx('halftone', 'giornale', { ink: accent, paperOn: 0, size: Math.max(5, Math.round(s * 0.008)) }); if (e) o.fx = [e]
      put(o, 'disco-retinato'); occupied.push(b)
    }
  }

  // freccia grafica verso l'azione (o in basso a destra)
  if (decor.has('arrow')) {
    const a = s * 0.09
    const cta = added.find(o => String(o.get('name')).endsWith('_cta-fondo'))
    const cb = cta ? local(cta) : null
    const b = cb && !hit({ x: cb.x + cb.w + g, y: cb.y, w: a, h: cb.h }, 0) ? { x: cb.x + cb.w + g, y: cb.y + (cb.h - a * 0.5) / 2, w: a, h: a * 0.5 } : spot(a, a * 0.5, [[W - M - a, H - M - a * 0.5]])
    if (b) {
      const sw = Math.max(3, s * 0.006)
      put(new fabric.Path(`M 0 ${b.h / 2} L ${b.w} ${b.h / 2} M ${b.w - b.h / 2} 0 L ${b.w} ${b.h / 2} L ${b.w - b.h / 2} ${b.h}`, { left: b.x, top: b.y, fill: '', stroke: S.id === 'minimal' ? ink : accent, strokeWidth: sw, strokeLineCap: 'square', strokeLineJoin: 'miter' }) as fabric.Path & Obj, 'freccia')
    }
  }

  // codice a barre con il nome: dettaglio da etichetta/streetwear
  if (decor.has('barcode') && (c.brand || c.title)) {
    const code = (c.brand || c.title).toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 14)
    if (fontEntry('Libre Barcode 39 Text')) {
      await withTimeout(ensureFont('Libre Barcode 39 Text', 400), 4000, false)
      const t = new fabric.Text(`*${code}*`, { fontFamily: 'Libre Barcode 39 Text', fontSize: Math.round(s * 0.06), fill: ink }) as fabric.Text & Obj
      const b = spot(t.width, t.height, [[W - M - t.width, H - M - t.height], [M, H - M - t.height], [W - M - t.width, M]])
      if (b) { t.set({ left: b.x, top: b.y }); put(t, 'codice'); occupied.push(b) }
    }
  }

  // segni di registro tipografici
  if (decor.has('registration')) {
    const r = s * 0.018
    ;[[W / 2, M * 0.45], [W / 2, H - M * 0.45]].forEach(([x, y], i) => {
      const o = new fabric.Path(`M ${r} 0 L ${r} ${2 * r} M 0 ${r} L ${2 * r} ${r} M ${r * 1.6} ${r} A ${r * 0.6} ${r * 0.6} 0 1 1 ${r * 1.6 - 0.01} ${r - 0.05}`, { left: x - r, top: y - r, fill: '', stroke: ink, strokeWidth: Math.max(1, s * 0.0015), opacity: 0.7 }) as fabric.Path & Obj
      put(o, `registro-${i + 1}`)
    })
  }

  // blocco di colore sfalsato dietro alla foto
  if (decor.has('offset') && imgUrl) {
    const im = added.find(o => /_(immagine|opera)$/.test(String(o.get('name'))))
    if (im) {
      const b = local(im), d = s * 0.025
      if (b.w < W * 0.95 || b.h < H * 0.95) put(new fabric.Rect({ left: b.x + d, top: b.y + d, width: b.w, height: b.h, rx: radius, ry: radius, fill: accent, strokeWidth: 0 }) as fabric.Rect & Obj, 'blocco-dietro')
    }
  }

  if (decor.has('orbs')) {
    const orb = (cx: number, cy: number, r: number, col: string, role: string) => put(new fabric.Circle({
      left: cx - r, top: cy - r, radius: r, strokeWidth: 0,
      fill: new fabric.Gradient({ type: 'radial', gradientUnits: 'percentage', coords: { x1: 0.5, y1: 0.5, r1: 0, x2: 0.5, y2: 0.5, r2: 0.5 }, colorStops: [{ offset: 0, color: alpha(col, 0.55) }, { offset: 1, color: alpha(col, 0) }] }),
    }) as fabric.Circle & Obj, role)
    orb(W * 0.85, H * 0.15, s * 0.5, accent, 'luce-1')
    orb(W * 0.1, H * 0.88, s * 0.42, pal.muted, 'luce-2')
  }
  if (decor.has('bars') && !decor.has('ticker')) {
    const bh = Math.round(s * 0.014), cols = [accent, pal.muted, ink]
    cols.forEach((col, i) => put(new fabric.Rect({ left: 0, top: H - (cols.length - i) * bh * 1.6, width: W, height: bh, fill: col, strokeWidth: 0 }) as fabric.Rect & Obj, `striscia-${i + 1}`))
  }

  // numero di pagina nei caroselli
  if (total > 1) {
    const t = new fabric.Text(`${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, { fontFamily: labF.family, fontWeight: String(labW), fontSize: lab, charSpacing: 80, fill: muted }) as fabric.Text & Obj
    const b = spot(t.width, t.height, [[W - M - t.width, H - M * 0.55 - t.height / 2], [W - M - t.width, M * 0.55 - t.height / 2], [M, H - M * 0.55 - t.height / 2]])
    if (b) { t.set({ left: b.x, top: b.y }); put(t, 'pagina') }
  }

  /* ── controllo finale: una decorazione non tocca mai un testo ──
     Se un intervento decorativo invade un testo (con un minimo di respiro),
     viene tolto: meglio un dettaglio in meno che un dettaglio che disturba. */
  const nameOf = (o: fabric.FabricObject) => String(o.get('name') ?? '')
  const decorRe = /_(adesivo|indice|stella-\d|oggetto-3d|freccia|codice|testo-verticale|pagina|forma|forma-piccola|cerchio|quadrato|mezzaluna|asta|disco-retinato|sottolineatura|puntini|parola-fondo)(_\d+)?$/
  const textRe = /_(titolo|sottotitolo|occhiello|testo|cta|info|sommario|autore|citazione|testata|descrizione|scheda-tecnica|elenco-etichette|info-azione|etichetta-testo-\d+|colonna-\d+|voce-\d+|numero-\d+|dato-\d+|didascalia-\d+|testata-info-\d+|piede-\d+)(_\d+)?$/
  const breathe = Math.round(base * 0.5)
  const texts = added.filter(o => textRe.test(nameOf(o))).map(o => ({ o, b: local(o) }))
  const meet = (a: Box, b: Box, pad: number) => a.x < b.x + b.w + pad && a.x + a.w > b.x - pad && a.y < b.y + b.h + pad && a.y + a.h > b.y - pad
  for (const d of added.filter(o => decorRe.test(nameOf(o)))) {
    if (!canvas.getObjects().includes(d) || /_parola-fondo/.test(nameOf(d))) continue
    const db = local(d)
    const clash = texts.some(t => {
      if (/_sottolineatura/.test(nameOf(d)) && /_titolo$/.test(nameOf(t.o))) return false
      return meet(db, t.b, breathe)
    })
    if (clash) {
      canvas.remove(d)
      if (/_adesivo$/.test(nameOf(d))) added.filter(o => /_adesivo-testo/.test(nameOf(o))).forEach(o => canvas.remove(o))
    }
  }

  // l'arte sta subito sopra il suo pannello (o sopra lo sfondo), sotto a tutto il resto
  for (const { anchor, pieces } of artGroups) pieces.forEach((o, i) => canvas.moveObjectTo(o, canvas.getObjects().indexOf(anchor) + 1 + i))

  // materia: carta, rumore o plastica sopra a tutto, bloccata (non intralcia la selezione)
  const tex = spec.texture === 'nessuna' ? null : spec.texture && spec.texture !== 'stile' ? spec.texture : S.texture
  if (tex && density !== 'essenziale' && L.id !== 'drop') {
    const dark = lum(pal.bg) < 0.35
    asset(ASSET[tex](), { x: 0, y: 0, w: W, h: H }, { role: 'materia', cover: true, locked: true,
      blend: tex === 'carta' ? 'multiply' : tex === 'plastica' ? 'screen' : dark ? 'screen' : 'multiply',
      opacity: tex === 'carta' ? (dark ? 0.0 : usedImage && ['cover', 'copertina', 'drop'].includes(L.id) ? 0.22 : 0.5) : tex === 'plastica' ? 0.35 : dark ? 0.16 : 0.22 })
  }

  // le decorazioni restano dietro ai testi: si riordinano i livelli una volta
  const behind = /_(griglia|cornice|taglio|cerchio|quadrato|mezzaluna|asta|forma|forma-piccola|indice|puntini|striscia|luce-\d|parola-fondo|disco-retinato|oggetto-3d|blocco-dietro)(_\d+)?$/
  added.filter(o => behind.test(String(o.get('name')))).forEach(o => canvas.moveObjectTo(o, canvas.getObjects().indexOf(bg) + 1))
  // la parola fantasma sta sotto a tutto
  added.filter(o => /_parola-fondo/.test(String(o.get('name')))).forEach(o => canvas.moveObjectTo(o, canvas.getObjects().indexOf(bg) + 1))
  canvas.requestRenderAll()
  return added
}
