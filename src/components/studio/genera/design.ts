/**
 * Strumenti da impaginatore: misure sull'inchiostro vero dei glifi (allineamenti
 * ottici a filo), righe stirate su un solo asse, testo a capo, testo in cerchio
 * che chiude il giro senza buchi.
 */
import { fontCss, makeCanvas, type Ctx, type Face } from './raster'

export const up = (f: Face, s: string) => (f.upper ? s.toUpperCase() : s)

function track(ctx: Ctx, f: Face, size: number, extra = 0) {
  const c = ctx as Ctx & { letterSpacing?: string }
  if ('letterSpacing' in c) c.letterSpacing = `${((f.track ?? 0) + extra) * size}px`
}

const probe = makeCanvas(4, 4).ctx

/** riquadro dell'inchiostro di una riga (l = quanto sporge a sinistra del punto d'appoggio) */
export function inkOf(f: Face, s: string, size: number, extra = 0) {
  probe.font = fontCss(f, size); track(probe, f, size, extra)
  const m = probe.measureText(up(f, s))
  return { w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, l: m.actualBoundingBoxLeft, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent, adv: m.width }
}

/** corpo che porta l'inchiostro della riga esattamente a `width` */
export function sizeForWidth(f: Face, s: string, width: number, extra = 0) {
  const k = inkOf(f, s, 100, extra)
  return k.w > 0 ? (100 * width) / k.w : 100
}

/** altezza delle maiuscole (H) per un corpo */
export function capH(f: Face, size: number) { return inkOf(f, 'H', size).asc }

/**
 * Scrive con l'inchiostro a filo: `x` è il bordo sinistro (o centro, o destro) del
 * segno vero, `top` il punto più alto del segno. Restituisce il riquadro occupato.
 */
export function inkText(ctx: Ctx, f: Face, s: string, size: number, x: number, top: number, color: string, align: 'left' | 'center' | 'right' = 'left', extra = 0) {
  const k = inkOf(f, s, size, extra)
  const x0 = align === 'left' ? x : align === 'center' ? x - k.w / 2 : x - k.w
  ctx.save()
  ctx.font = fontCss(f, size); track(ctx, f, size, extra)
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color
  ctx.fillText(up(f, s), x0 + k.l, top + k.asc)
  ctx.restore()
  return { x: x0, y: top, w: k.w, h: k.asc + k.desc, base: top + k.asc }
}

/** scrive appoggiando sulla linea di base (per testi piccoli allineati fra loro) */
export function baseText(ctx: Ctx, f: Face, s: string, size: number, x: number, base: number, color: string, align: CanvasTextAlign = 'left', extra = 0) {
  ctx.save()
  ctx.font = fontCss(f, size); track(ctx, f, size, extra)
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color
  ctx.fillText(up(f, s), x, base)
  ctx.restore()
}

/** la riga resa su un foglio grande esattamente quanto il suo inchiostro */
export function inkCanvas(f: Face, s: string, size: number, color: string, extra = 0) {
  const k = inkOf(f, s, size, extra)
  const w = Math.max(1, Math.ceil(k.w)), h = Math.max(1, Math.ceil(k.asc + k.desc))
  const { c, ctx } = makeCanvas(w, h)
  ctx.font = fontCss(f, size); track(ctx, f, size, extra)
  ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
  ctx.fillText(up(f, s), k.l, k.asc)
  return c
}

/** a capo per parole entro `maxW` */
export function wrap(f: Face, s: string, size: number, maxW: number) {
  const out: string[] = []
  for (const para of s.split('\n')) {
    let cur = ''
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const t = cur ? cur + ' ' + w : w
      if (cur && inkOf(f, t, size).adv > maxW) { out.push(cur); cur = w } else cur = t
    }
    if (cur) out.push(cur)
  }
  return out
}

/**
 * Testo che gira tutto il cerchio: la frase si ripete quante volte ci sta e la
 * spaziatura si allarga quel tanto che serve perché il giro chiuda pari.
 */
export function ringText(ctx: Ctx, s: string, cx: number, cy: number, R: number, f: Face, size: number, color: string, start = -Math.PI / 2) {
  const str = up(f, s)
  ctx.save()
  ctx.font = fontCss(f, size); track(ctx, f, size)
  const one = ctx.measureText(str).width
  const reps = Math.max(1, Math.floor((Math.PI * 2 * R) / one))
  const full = str.repeat(reps)
  const chars = [...full]
  ctx.letterSpacing = '0px'
  const ws = chars.map(ch => ctx.measureText(ch).width)
  const tot = ws.reduce((a, b) => a + b, 0)
  const gap = (Math.PI * 2 * R - tot) / chars.length
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color
  let acc = 0
  chars.forEach((ch, i) => {
    const a = start + (acc + ws[i] / 2) / R
    ctx.save(); ctx.translate(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.rotate(a + Math.PI / 2)
    ctx.fillText(ch, 0, 0); ctx.restore()
    acc += ws[i] + gap
  })
  ctx.restore()
}

/** testo su un arco (centrato su `mid`), per le scritte dei marchi */
export function arcLine(ctx: Ctx, s: string, cx: number, cy: number, R: number, f: Face, size: number, color: string, mid: number, inside = false, extra = 0.1) {
  const str = up(f, s)
  ctx.save()
  ctx.font = fontCss(f, size)
  const sp = size * ((f.track ?? 0) + extra)
  const chars = [...str], ws = chars.map(ch => ctx.measureText(ch).width + sp)
  const tot = ws.reduce((a, b) => a + b, 0) - sp
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color
  // in alto si legge in senso orario, in basso al contrario (dritto per chi guarda)
  const dir = inside ? -1 : 1
  let acc = 0
  chars.forEach((ch, i) => {
    const a = mid + dir * (acc + (ws[i] - sp) / 2 - tot / 2) / R
    ctx.save(); ctx.translate(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.rotate(inside ? a - Math.PI / 2 : a + Math.PI / 2)
    ctx.fillText(ch, 0, 0); ctx.restore()
    acc += ws[i]
  })
  ctx.restore()
}

/** asterisco a n bracci, tratto pieno con le punte tonde */
export function asterisk(ctx: Ctx, cx: number, cy: number, r: number, n: number, w: number, color: string, rot = 0) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'
  ctx.beginPath()
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI; ctx.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) }
  ctx.stroke(); ctx.restore()
}

/** freccia diagonale ↗ disegnata (non un glifo: stesso spessore dei filetti) */
export function arrowNE(ctx: Ctx, x: number, y: number, s: number, w: number, color: string) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'square'; ctx.lineJoin = 'miter'
  ctx.beginPath(); ctx.moveTo(x - s / 2, y + s / 2); ctx.lineTo(x + s / 2, y - s / 2)
  ctx.moveTo(x - s * 0.15, y - s / 2); ctx.lineTo(x + s / 2, y - s / 2); ctx.lineTo(x + s / 2, y + s * 0.15)
  ctx.stroke(); ctx.restore()
}

/** filetto orizzontale */
export function rule(ctx: Ctx, x0: number, x1: number, y: number, w: number, color: string) {
  ctx.save(); ctx.fillStyle = color; ctx.fillRect(x0, Math.round(y - w / 2), x1 - x0, Math.max(1, w)); ctx.restore()
}
