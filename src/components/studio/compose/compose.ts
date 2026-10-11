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
export async function composeBoard(canvas: fabric.Canvas, artboard: fabric.FabricObject, spec: ComposeBoard, index = 0) {
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
  const decor = new Set<DecorId>(spec.noDecor ? [] : [...(spec.decor ?? S.decor)])
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
  const placeImage = (box: Box, role = 'immagine', r = radius) => {
    const ph = put(new fabric.Rect({ left: box.x, top: box.y, width: box.w, height: box.h, rx: r, ry: r, fill: pal.surface, strokeWidth: 0 }) as fabric.Rect & Obj, role)
    if (!imgUrl) return ph
    const src = imgUrl.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(imgUrl)}` : imgUrl
    withTimeout(fabric.FabricImage.fromURL(src, { crossOrigin: 'anonymous' }).catch(() => null), 45000, null).then(img => {
      if (!img || !canvas.getObjects().includes(ph)) return
      const iw = img.width || 1, ih = img.height || 1
      const k = Math.max(box.w / iw, box.h / ih)
      const cw = box.w / k, ch = box.h / k
      img.set({ cropX: (iw - cw) / 2, cropY: (ih - ch) * 0.4, width: cw, height: ch, scaleX: k, scaleY: k, originX: 'left', originY: 'top', left: ph.left, top: ph.top })
      if (r) img.clipPath = new fabric.Rect({ width: cw, height: ch, rx: r / k, ry: r / k, originX: 'center', originY: 'center' })
      const o = img as unknown as Obj
      o.set('name', ph.get('name')); o.parentBoard = boardName
      if (imageLook) o.look = { id: imageLook, amount: 100 }
      if (imageFx) { const e = fx(imageFx.id, imageFx.variant); if (e) { o.fx = [e] } }
      applyFx(o)
      const at = canvas.getObjects().indexOf(ph)
      canvas.insertAt(at, o); canvas.remove(ph)
      canvas.requestRenderAll()
    })
    return ph
  }

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

  /* ── impaginazioni ── */
  const heroText = (box: Box, opts: { maxTitle: number; titleShare: number; anchor: 'bottom' | 'center' | 'top' }) => {
    const tw = align === 'center' ? box.w : Math.min(box.w, colW(11, box.w))
    const eyebrow = c.eyebrow ? tb(c.eyebrow, 'label', lab, { width: tw, fill: accent === pal.bg ? ink : readable(accent, pal.bg, 3) }) : null
    const title = styleTitle(fit(c.title, 'display', tw, box.h * opts.titleShare, opts.maxTitle, sub * 1.2, 5))
    const subW = align === 'center' ? Math.min(box.w, colW(10, box.w)) : Math.min(box.w, colW(8, box.w))
    const subtitle = c.subtitle ? tb(c.subtitle, 'text', sub, { width: subW, fill: ink, fontWeight: String(textF.weight) }) : null
    const body = c.body ? tb(c.body, 'text', base, { width: Math.min(box.w, colW(align === 'center' ? 9 : 7, box.w)), fill: muted }) : null
    const items: [Obj | null, number][] = [[eyebrow, 0], [title, eyebrow ? lab * 1.6 : 0], [subtitle, sub * 0.8], [body, base * 1.1]]
    const ctaH = c.cta ? Math.round(base * 0.9 * 3) + base * 1.6 : 0
    const h = stackH(items) + ctaH
    const top = opts.anchor === 'bottom' ? box.y + box.h - h : opts.anchor === 'center' ? box.y + (box.h - h) / 2 : box.y
    const used = stack(items, box.x, top, box.w)
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

    default: { // eroe
      const shapes = ['bauhaus', 'blob', 'index', 'dots'].some(d => decor.has(d as DecorId))
      const r = heroText(area, { maxTitle: s * (align === 'center' ? (c.title.split(/\s+/).length <= 2 ? 0.24 : 0.16) : 0.19), titleShare: shapes && align !== 'center' ? 0.46 : 0.62, anchor: align === 'center' ? 'center' : 'bottom' })
      free = align === 'center' ? null : r.top - area.y > s * 0.22 ? { x: area.x, y: area.y, w: area.w, h: r.top - area.y - g * 2 } : null
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
  const zone: Box | null = free
  if (zone && zone.h > s * 0.12) {
    const z = zone as Box
    const side = Math.min(z.w * 0.45, z.h)
    const zx = align === 'center' ? z.x + (z.w - side) / 2 : z.x + z.w - side
    if (decor.has('bauhaus')) {
      const u = side / 2
      put(new fabric.Circle({ left: zx, top: z.y, radius: u, fill: accent, strokeWidth: 0 }) as fabric.Circle & Obj, 'cerchio')
      put(new fabric.Rect({ left: zx + u, top: z.y + u, width: u, height: u, fill: ink, strokeWidth: 0 }) as fabric.Rect & Obj, 'quadrato')
      put(new fabric.Path(`M 0 ${u / 2} A ${u / 2} ${u / 2} 0 0 1 ${u} ${u / 2} Z`, { left: zx - u * 0.6, top: z.y + u * 1.2, fill: pal.muted, strokeWidth: 0 }) as fabric.Path & Obj, 'mezzaluna')
    }
    if (decor.has('blob')) {
      const n = 7, r0 = side / 2, pts: string[] = []
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2, rr = r0 * (0.78 + 0.22 * Math.sin(i * 2.3 + index))
        pts.push(`${r0 + Math.cos(a) * rr} ${r0 + Math.sin(a) * rr}`)
      }
      // curva morbida chiusa (Catmull-Rom → Bézier)
      const P_ = pts.map(p => p.split(' ').map(Number))
      let d = `M ${P_[0][0]} ${P_[0][1]}`
      for (let i = 0; i < n; i++) {
        const p0 = P_[(i - 1 + n) % n], p1 = P_[i], p2 = P_[(i + 1) % n], p3 = P_[(i + 2) % n]
        d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`
      }
      put(new fabric.Path(d + ' Z', { left: zx, top: z.y, fill: accent, opacity: 0.9, strokeWidth: 0 }) as fabric.Path & Obj, 'forma')
    }
    if (decor.has('index')) {
      const t = tb(String(index + 1).padStart(2, '0'), 'display', Math.min(z.h, s * 0.3), { width: side * 1.4, fill: ink, textAlign: align === 'center' ? 'center' : 'right' })
      t.set({ left: align === 'center' ? z.x + (z.w - side * 1.4) / 2 : z.x + z.w - side * 1.4, top: z.y })
      const e = fx('hollow', 'fine', { thickness: Math.max(2, Math.round(s * 0.002)) }); if (e) t.fx = [e]
      put(t, 'indice')
    }
    if (decor.has('dots')) {
      const step = Math.round(s * 0.028), tile = document.createElement('canvas'); tile.width = tile.height = step
      const tx = tile.getContext('2d')!; tx.fillStyle = ink; tx.globalAlpha = 0.35; tx.beginPath(); tx.arc(step / 2, step / 2, Math.max(1.2, s * 0.0019), 0, Math.PI * 2); tx.fill()
      put(new fabric.Rect({ left: z.x + z.w * 0.45, top: z.y, width: z.w * 0.55, height: z.h, fill: new fabric.Pattern({ source: tile, repeat: 'repeat' }), strokeWidth: 0 }) as fabric.Rect & Obj, 'puntini')
    }
  }
  if (decor.has('orbs')) {
    const orb = (cx: number, cy: number, r: number, col: string, role: string) => put(new fabric.Circle({
      left: cx - r, top: cy - r, radius: r, strokeWidth: 0,
      fill: new fabric.Gradient({ type: 'radial', gradientUnits: 'percentage', coords: { x1: 0.5, y1: 0.5, r1: 0, x2: 0.5, y2: 0.5, r2: 0.5 }, colorStops: [{ offset: 0, color: alpha(col, 0.55) }, { offset: 1, color: alpha(col, 0) }] }),
    }) as fabric.Circle & Obj, role)
    orb(W * 0.82, H * 0.18, s * 0.42, accent, 'luce-1')
    orb(W * 0.12, H * 0.86, s * 0.36, pal.muted, 'luce-2')
    // le luci vanno dietro al testo
    added.filter(o => /luce-\d$/.test(String(o.get('name')))).forEach(o => canvas.moveObjectTo(o, canvas.getObjects().indexOf(bg) + 1))
  }
  if (decor.has('bars') && !decor.has('ticker')) {
    const bh = Math.round(s * 0.014), cols = [accent, pal.muted, ink]
    cols.forEach((col, i) => put(new fabric.Rect({ left: 0, top: H - (cols.length - i) * bh * 1.6, width: W, height: bh, fill: col, strokeWidth: 0 }) as fabric.Rect & Obj, `striscia-${i + 1}`))
  }
  if (decor.has('badge') && c.badge) {
    const r = Math.round(s * 0.09)
    const bx = W - M - 2 * r, by = M + (folioText ? folioH + g : 0)
    const circ = put(new fabric.Circle({ left: bx, top: by, radius: r, fill: accent, strokeWidth: 0, angle: 0 }) as fabric.Circle & Obj, 'bollino')
    const t = fit(c.badge, 'label', r * 1.5, r * 1.1, lab * 1.6, 10, 3, { fill: readable(pal.bg, accent), textAlign: 'center' })
    t.set({ left: bx + r - t.width / 2, top: by + r - heightOf(t) / 2 })
    put(t, 'bollino-testo')
    circ.setCoords()
  }

  // le decorazioni restano dietro ai testi: si riordinano i livelli una volta
  const behind = /_(griglia|cornice|taglio|cerchio|quadrato|mezzaluna|forma|indice|puntini|striscia)/
  added.filter(o => behind.test(String(o.get('name')))).forEach(o => canvas.moveObjectTo(o, canvas.getObjects().indexOf(bg) + 1))
  canvas.requestRenderAll()
  return added
}
