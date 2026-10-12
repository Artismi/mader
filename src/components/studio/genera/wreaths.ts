/**
 * Corone ed ephemera. Corone: alloro (due rami che si incontrano in basso, foglie a
 * coppie che crescono dalla base alla punta, nastro annodato), spine intrecciate
 * (due steli che si avvolgono, poche spine a rosa che nascono dal tratto e si
 * piegano nel verso della crescita), cordone (corda ritorta a spicchi).
 * Ephemera: francobollo dentellato, etichetta da valigia, etichetta di fiammiferi,
 * cartellino con occhiello e spago.
 */
import { drawMask, fitSize, fontCss, makeCanvas, range, rng, text, type Ctx, type Face, type Mask, type Rnd } from './raster'
import { roseThorn, taper, type Pt } from './strokes'

const arcPts = (cx: number, cy: number, R: number, a0: number, a1: number, n: number, wob?: (t: number) => number): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = a0 + (a1 - a0) * t, rr = R + (wob ? wob(t) : 0); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] })

/** foglia a mandorla: punta affilata, ventre pieno verso la base, nervatura vuota */
function leaf(ctx: Ctx, x: number, y: number, ang: number, L: number, W: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang)
  ctx.beginPath(); ctx.moveTo(0, 0)
  ctx.bezierCurveTo(L * 0.25, -W, L * 0.75, -W * 0.7, L, 0)
  ctx.bezierCurveTo(L * 0.75, W * 0.7, L * 0.25, W, 0, 0)
  ctx.fill()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.lineWidth = Math.max(0.6, W * 0.12); ctx.beginPath(); ctx.moveTo(L * 0.12, 0); ctx.quadraticCurveTo(L * 0.5, -W * 0.06, L * 0.86, 0); ctx.stroke()
  ctx.restore()
}

/** corona d'alloro: due rami da sotto che salgono e quasi si toccano in alto */
export function laurel(ctx: Ctx, r: Rnd, cx: number, cy: number, R: number, S: number, weight: number) {
  const lw = S * 0.004 * weight
  for (const side of [-1, 1]) {
    // ramo: parte in basso, sale sul suo lato e si ferma prima della cima
    const from = Math.PI / 2 - side * 0.2, to = side < 0 ? Math.PI * 1.5 - 0.38 : -Math.PI / 2 + 0.38
    const pts = arcPts(cx, cy, R, from, to, 160)
    taper(ctx, pts, t => lw * (1.6 - 1.1 * t))
    const dir = to > from ? 1 : -1
    const n = 12
    for (let i = 0; i < n; i++) {
      const t = 0.07 + 0.9 * i / n + range(r, -0.012, 0.012)
      const p = pts[Math.round(t * 160)]
      const a = from + (to - from) * t
      const grow = a + dir * Math.PI / 2
      const L = S * 0.08 * (1.05 - 0.4 * t) * range(r, 0.92, 1.08), Wd = L * 0.3
      // coppia piegata in avanti: una fuori, una dentro
      leaf(ctx, p[0], p[1], grow - dir * 0.6, L, Wd)
      leaf(ctx, p[0], p[1], grow + dir * 0.6, L * 0.88, Wd)
    }
    // bacca in cima
    const e = pts[160]; ctx.beginPath(); ctx.arc(e[0], e[1], S * 0.009, 0, Math.PI * 2); ctx.fill()
  }
  // nastro in basso: fiocco con due code a coda di rondine
  const by = cy + R
  ctx.beginPath(); ctx.ellipse(cx, by, S * 0.016, S * 0.012, 0, 0, Math.PI * 2); ctx.fill()
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(cx, by)
    ctx.quadraticCurveTo(cx + s * S * 0.05, by - S * 0.04, cx + s * S * 0.07, by - S * 0.005)
    ctx.quadraticCurveTo(cx + s * S * 0.05, by + S * 0.015, cx, by); ctx.fill()
    ctx.beginPath(); ctx.moveTo(cx - s * S * 0.004, by)
    ctx.lineTo(cx + s * S * 0.05, by + S * 0.07); ctx.lineTo(cx + s * S * 0.035, by + S * 0.06); ctx.lineTo(cx + s * S * 0.03, by + S * 0.078); ctx.lineTo(cx + s * S * 0.008, by + S * 0.01)
    ctx.closePath(); ctx.fill()
  }
}

/**
 * Spine intrecciate: due steli che si avvolgono in un'onda lenta, sottili e
 * continui; poche spine a rosa, distanziate con regolarità e un po' di gioco,
 * che nascono dal tratto e si piegano nel verso della crescita.
 */
export function thornBraid(ctx: Ctx, r: Rnd, cx: number, cy: number, R: number, S: number, count: number, weight: number) {
  const lw = S * 0.0045 * weight, n = 720, waves = 7, amp = S * 0.012
  for (const ph of [0, Math.PI]) {
    const pts = arcPts(cx, cy, R, -Math.PI / 2, Math.PI * 1.5, n, t => amp * Math.sin(t * Math.PI * 2 * waves + ph))
    const half = (j: number) => lw * (0.85 + 0.25 * Math.sin(j / n * Math.PI * 2 * waves * 2 + ph)) / 2
    taper(ctx, pts, (t: number) => half(Math.round(t * n)) * 2)
    // spine solo dove lo stelo è all'esterno: non si incrociano con l'altro
    const k = Math.max(4, Math.round(count / 2))
    for (let i = 0; i < k; i++) {
      const t = (i + 0.25 + (ph ? 0.5 : 0) + range(r, -0.12, 0.12)) / k
      const j = Math.max(6, Math.min(n - 6, Math.round(t * n)))
      const h = S * range(r, 0.022, 0.036) * weight
      roseThorn(ctx, pts, j, -1, half, h, Math.max(6, h * 0.9 / (S * 0.0025)), 0.75)
    }
  }
}

/** cordone ritorto: spicchi obliqui alternati lungo l'anello */
export function rope(ctx: Ctx, cx: number, cy: number, R: number, S: number, weight: number) {
  const w = S * 0.022 * weight, n = Math.round(Math.PI * 2 * R / (w * 0.75))
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2
    ctx.save(); ctx.translate(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.rotate(a + Math.PI / 2 + 0.6)
    ctx.beginPath(); ctx.ellipse(0, 0, w * 0.62, w * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
}

// ─── francobollo ─────────────────────────────────────────────────────────────

/** sagoma dentellata: rettangolo con semicerchi mangiati lungo i bordi */
export function perforated(W: number, H: number, x: number, y: number, w: number, h: number, hole: number) {
  return drawMask(W, H, ctx => {
    ctx.fillRect(x, y, w, h)
    ctx.globalCompositeOperation = 'destination-out'
    const step = hole * 2.6
    const nx = Math.round(w / step), ny = Math.round(h / step)
    for (let i = 0; i <= nx; i++) for (const yy of [y, y + h]) { ctx.beginPath(); ctx.arc(x + w * i / nx, yy, hole, 0, Math.PI * 2); ctx.fill() }
    for (let i = 0; i <= ny; i++) for (const xx of [x, x + w]) { ctx.beginPath(); ctx.arc(xx, y + h * i / ny, hole, 0, Math.PI * 2); ctx.fill() }
  })
}

/** parola al corpo che la porta alla larghezza, con tetto in altezza */
export function fitText(ctx: Ctx, s: string, f: Face, x: number, base: number, width: number, maxH: number, align: CanvasTextAlign = 'center') {
  const { ctx: m } = makeCanvas(4, 4)
  const size = Math.min(fitSize(m, f.upper ? s.toUpperCase() : s, f, width), maxH)
  text(ctx, s, x, base, f, size, align)
  return size
}
export function capOf(f: Face, size: number) { const { ctx } = makeCanvas(4, 4); ctx.font = fontCss(f, size); return ctx.measureText('H').actualBoundingBoxAscent || size * 0.72 }

/** raggiera (sunburst) a spicchi alterni, ritagliata da chi la chiama */
export function sunburst(ctx: Ctx, cx: number, cy: number, R: number, n: number, rot = 0) {
  for (let i = 0; i < n; i++) {
    if (i % 2) continue
    const a0 = rot + i / n * Math.PI * 2, a1 = rot + (i + 1) / n * Math.PI * 2
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath(); ctx.fill()
  }
}

/** occhiello del cartellino: anello di rinforzo e foro */
export function eyelet(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, Math.PI * 2); ctx.fill()
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}

/** spago: curva morbida con trefoli torti (due tratti alternati) */
export function twine(ctx: Ctx, pts: Pt[], w: number) {
  taper(ctx, pts, () => w)
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = Math.max(0.6, w * 0.18)
  for (let i = 2; i < pts.length - 2; i += 3) {
    const a = pts[i - 1], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1
    const nx = -dy / l * w * 0.5, ny = dx / l * w * 0.5
    ctx.beginPath(); ctx.moveTo(pts[i][0] - nx + dx * 0.3, pts[i][1] - ny + dy * 0.3); ctx.lineTo(pts[i][0] + nx - dx * 0.3, pts[i][1] + ny - dy * 0.3); ctx.stroke()
  }
  ctx.restore()
}

export const rngOf = (s: number) => rng(s)
export type { Mask }
