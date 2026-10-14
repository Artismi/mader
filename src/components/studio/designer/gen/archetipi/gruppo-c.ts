/**
 * Archetipi del gruppo C · geometria e forma. Ogni funzione compone una tavola
 * intera con gli strumenti di ../tools e ../forme, legge regolatori e registro,
 * ha varianti interne scelte dal seme e chiude con finish().
 * Le idee e le ricette d'origine sono in ./elenco.ts.
 *
 *   bauhaus    tre forme primarie incastrate sulla griglia | tessere generative a tutta tavola
 *   memphis    forme sparse con motivi che si scontrano | cornici di motivi | griglia di celle in conflitto
 *   bersaglio  coccarda con la barra del titolo | radar d'angolo a retino | mirino fatto di foto
 *   bande      maglia a fasce orizzontali | fasce oblique | bandiera verticale, il titolo le attraversa
 *   arco       finestra ad arco con cornice doppia | loggia di archi sulla stessa foto | portale al vivo
 *   deformato  pila di forme morbide col titolo ad arco | pillola sdraiata col titolo dentro | forma gonfia
 *   onde       campo di forza attorno al testo | anelli in moiré | rilievo di linee dalla foto
 *   piramide   cuneo di barre che crescono | ziggurat centrato | cuneo in diagonale
 *
 * Il messaggio sta sempre su qualcosa che il controllo di leggibilità sa leggere
 * (fondo, rettangoli, cerchi): le forme libere (tracciati) restano attorno.
 */
import type { Scene, SceneEl, FontSpec } from '../../types'
import {
  type G, put, U, txt, lab, display, putLab, putDisplay, infoBlock, photo, treat, printMarks, regMark,
  finish, keyword, stackLines, sizeForWidth, mix, alpha, readable, contrast, darker, lighter, words, up, textBox,
} from '../tools'
import { ink, over, stack, putStack } from '../systems'
import { wobblyPath, starPath } from '../forme'
import { lineWidth, fit } from '../../text'

type Sistema = (g: G) => Scene | null
type Pt = [number, number]
type Box = { x: number; y: number; w: number; h: number }
type Text = Extract<SceneEl, { kind: 'text' }>

/* ── geometria ────────────────────────────────────────────────────────── */
const f1 = (n: number) => n.toFixed(1)
const D2R = Math.PI / 180
const polyD = (pts: Pt[], close = true) => pts.map((p, i) => `${i ? 'L' : 'M'} ${f1(p[0])} ${f1(p[1])}`).join(' ') + (close ? ' Z' : '')
/** Cerchio come quattro curve (niente archi: i riquadri del critico restano giusti); `rev` gira al contrario (buchi). */
function circD(cx: number, cy: number, r: number, rev = false) {
  const k = 0.5523 * r
  if (rev) return `M ${f1(cx - r)} ${f1(cy)} C ${f1(cx - r)} ${f1(cy + k)} ${f1(cx - k)} ${f1(cy + r)} ${f1(cx)} ${f1(cy + r)} C ${f1(cx + k)} ${f1(cy + r)} ${f1(cx + r)} ${f1(cy + k)} ${f1(cx + r)} ${f1(cy)} C ${f1(cx + r)} ${f1(cy - k)} ${f1(cx + k)} ${f1(cy - r)} ${f1(cx)} ${f1(cy - r)} C ${f1(cx - k)} ${f1(cy - r)} ${f1(cx - r)} ${f1(cy - k)} ${f1(cx - r)} ${f1(cy)} Z `
  return `M ${f1(cx - r)} ${f1(cy)} C ${f1(cx - r)} ${f1(cy - k)} ${f1(cx - k)} ${f1(cy - r)} ${f1(cx)} ${f1(cy - r)} C ${f1(cx + k)} ${f1(cy - r)} ${f1(cx + r)} ${f1(cy - k)} ${f1(cx + r)} ${f1(cy)} C ${f1(cx + r)} ${f1(cy + k)} ${f1(cx + k)} ${f1(cy + r)} ${f1(cx)} ${f1(cy + r)} C ${f1(cx - k)} ${f1(cy + r)} ${f1(cx - r)} ${f1(cy + k)} ${f1(cx - r)} ${f1(cy)} Z `
}
/** Arco a tutto sesto (finestra): lati dritti e mezzo cerchio in alto. */
function archD(x: number, y: number, w: number, h: number, open = false) {
  const r = w / 2, k = 0.5523 * r
  return `M ${f1(x)} ${f1(y + h)} L ${f1(x)} ${f1(y + r)} C ${f1(x)} ${f1(y + r - k)} ${f1(x + r - k)} ${f1(y)} ${f1(x + r)} ${f1(y)} C ${f1(x + r + k)} ${f1(y)} ${f1(x + w)} ${f1(y + r - k)} ${f1(x + w)} ${f1(y + r)} L ${f1(x + w)} ${f1(y + h)}${open ? '' : ' Z'}`
}
/** Rettangolo arrotondato ruotato attorno al suo centro. */
function rrectPts(cx: number, cy: number, w: number, h: number, rad: number, deg: number, n = 6): Pt[] {
  const pts: Pt[] = []
  const rr = Math.min(rad, w / 2, h / 2)
  const corners: [number, number, number][] = [[w / 2 - rr, -h / 2 + rr, -90], [w / 2 - rr, h / 2 - rr, 0], [-w / 2 + rr, h / 2 - rr, 90], [-w / 2 + rr, -h / 2 + rr, 180]]
  for (const [ox, oy, a0] of corners) for (let i = 0; i <= n; i++) { const a = (a0 + (90 * i) / n) * D2R; pts.push([ox + Math.cos(a) * rr, oy + Math.sin(a) * rr]) }
  return rot(pts.map(([x, y]) => [x + cx, y + cy] as Pt), cx, cy, deg)
}
const rot = (pts: Pt[], cx: number, cy: number, deg: number): Pt[] => {
  const a = deg * D2R, c = Math.cos(a), s = Math.sin(a)
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c])
}
const circPts = (cx: number, cy: number, r: number, n = 48): Pt[] => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r] as Pt)
const boxPts = (b: Box): Pt[] => [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]]
const bboxOf = (pts: Pt[]): Box => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) } }
const hitB = (a: Box, b: Box, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad
const grow = (b: Box, p: number): Box => ({ x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p })
function inPoly([x, y]: Pt, poly: Pt[]) {
  let ins = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins
  }
  return ins
}
/** Segmento ritagliato su un poligono convesso (Cyrus-Beck). */
function clipSeg(a: Pt, b: Pt, poly: Pt[]): [Pt, Pt] | null {
  let area = 0
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; area += p[0] * q[1] - q[0] * p[1] }
  const sg = area > 0 ? 1 : -1
  let t0 = 0, t1 = 1
  const dx = b[0] - a[0], dy = b[1] - a[1]
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length]
    const nx = -(q[1] - p[1]) * sg, ny = (q[0] - p[0]) * sg
    const num = nx * (a[0] - p[0]) + ny * (a[1] - p[1]), den = nx * dx + ny * dy
    if (Math.abs(den) < 1e-9) { if (num < 0) return null; continue }
    const t = -num / den
    if (den > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t)
    if (t0 > t1) return null
  }
  return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]]
}
/** Tratteggio a righe parallele dentro un poligono convesso (da tracciare). */
function hatchD(poly: Pt[], deg: number, step: number) {
  const a = deg * D2R, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux
  const pr = poly.map(([x, y]) => x * nx + y * ny)
  const big = 1e4
  let d = ''
  for (let s = Math.min(...pr) + step / 2; s < Math.max(...pr); s += step) {
    const c: Pt = [nx * s, ny * s]
    const seg = clipSeg([c[0] - ux * big, c[1] - uy * big], [c[0] + ux * big, c[1] + uy * big], poly)
    if (seg) d += `M ${f1(seg[0][0])} ${f1(seg[0][1])} L ${f1(seg[1][0])} ${f1(seg[1][1])} `
  }
  return d
}
/** Puntini (retino Ben-Day) dentro un poligono qualsiasi. */
function dotsD(poly: Pt[], step: number, rad: number, max = 700) {
  const b = bboxOf(poly)
  let d = '', n = 0
  for (let j = 0, y = b.y + step / 2; y < b.y + b.h; y += step * 0.866, j++) for (let x = b.x + step / 2 + (j % 2) * step / 2; x < b.x + b.w; x += step) {
    if (n >= max || !inPoly([x, y], poly)) continue
    d += circD(x, y, rad); n++
  }
  return d
}
/** Righe a zigzag dentro un poligono convesso. */
function zigzagD(poly: Pt[], amp: number, wl: number, rowStep: number) {
  const b = bboxOf(poly)
  let d = ''
  for (let y = b.y + rowStep / 2; y < b.y + b.h + amp; y += rowStep) {
    let prev: Pt | null = null
    for (let i = 0, x = b.x - wl; x <= b.x + b.w + wl; x += wl / 2, i++) {
      const p: Pt = [x, y + (i % 2 ? -amp : amp)]
      if (prev) { const s = clipSeg(prev, p, poly); if (s) d += `M ${f1(s[0][0])} ${f1(s[0][1])} L ${f1(s[1][0])} ${f1(s[1][1])} ` }
      prev = p
    }
  }
  return d
}
/** Ghirigoro: sinusoide morbida da tracciare. */
function squiggleD(x0: number, y0: number, x1: number, y1: number, amp: number, waves: number) {
  const n = Math.max(2, Math.round(waves * 2)), dx = (x1 - x0) / n, dy = (y1 - y0) / n
  const len = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / len, ny = (x1 - x0) / len
  let d = `M ${f1(x0)} ${f1(y0)} `
  for (let i = 0; i < n; i++) {
    const s = i % 2 ? -1 : 1
    const cx = x0 + dx * (i + 0.5) + nx * amp * 2 * s, cy = y0 + dy * (i + 0.5) + ny * amp * 2 * s
    d += `Q ${f1(cx)} ${f1(cy)} ${f1(x0 + dx * (i + 1))} ${f1(y0 + dy * (i + 1))} `
  }
  return d
}
/** Sposta un tracciato (ombra piena sfalsata). */
const shiftD = (d: string, ox: number, oy: number) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, a: string, b: string) => `${f1(+a + ox)} ${f1(+b + oy)}`)

/* ── colore e testo ───────────────────────────────────────────────────── */
/** I due inchiostri della tavola: l'accento e il secondo (se il secondo è il fondo, l'inchiostro). */
const inks = (g: G) => ({ a1: g.P.acc, a2: g.P.acc2 !== g.P.bg ? g.P.acc2 : g.P.fg })
/** Colore che si legge su un fondo, preso dalla palette (poi bianco e nero). */
const su = (g: G, bg: string, min = 4.5) => readable(bg, [g.P.fg, g.P.bg, g.P.acc, '#111111', '#ffffff'], min)
/** Inchiostri delle informazioni su un fondo qualsiasi. */
const inkSu = (g: G, bg: string) => {
  const fg = readable(bg, [g.P.fg, g.P.bg, '#111111', '#ffffff'])
  return { fg, sec: readable(bg, [g.P.sec, fg], 3.6), acc: readable(bg, [g.P.acc, g.P.acc2, fg], 3.6) }
}
const header = (g: G, w: number) => {
  const brand = lab(g, g.c.brand, w), kick = lab(g, g.c.kicker, w)
  return { brand, kick, h: Math.max(brand?.h ?? 0, kick?.h ?? 0, U(g, 16)) }
}
/** Il carattere pesante: quello da manifesto se è a bastoni, altrimenti il titolo. */
const heavy = (g: G): FontSpec => (g.s.impactSans ? g.s.impact : g.s.display)
/** Titolo col carattere pesante, maiuscolo, a capo bilanciato. */
function heavyFit(g: G, text: string, maxW: number, maxH: number, maxSize: number, minSize: number, maxLines: number, tracking = -0.01) {
  return fit({ text, font: heavy(g), maxW, maxH, maxSize: maxSize * g.u, minSize: Math.max(minSize * g.u, g.sc.attacco), maxLines, leading: 0.9, tracking, upper: true, balance: true })
}
/** Titolo spaziato (lusso, maiuscolo arioso). */
function spaced(g: G, text: string, maxW: number, maxSize: number, minSize: number, maxLines: number, tracking: number) {
  return fit({ text, font: g.s.display, maxW, maxSize: maxSize * g.u, minSize: Math.max(minSize * g.u, g.sc.attacco), maxLines, leading: 1.18, tracking, upper: true, balance: true })
}
/** Prova le varianti a partire da quella del seme: se una non regge, la successiva. */
function prova(g: G, fns: Sistema[]): Scene | null {
  const start = (g.k.seme >> 3) % fns.length
  for (let i = 0; i < Math.min(2, fns.length); i++) {
    g.els = []; g.letture = []
    const sc = fns[(start + i) % fns.length](g)
    if (sc) return sc
  }
  return null
}
/** Riquadri dei testi già piazzati. */
const textBoxes = (g: G, pad = 0) => g.els.filter(e => e.kind === 'text' && !e.deco).map(e => grow(textBox(e as Text), pad))
/** Foto dentro un tracciato libero; senza foto, riempimento generativo nella stessa forma. */
function photoIn(g: G, name: string, d: string, box: Box, extra: { blend?: GlobalCompositeOperation; fx?: Extract<SceneEl, { kind: 'image' }>['fx'] } = {}) {
  if (g.photo) return photo(g, name, box, { mask: d, ...extra })
  const { P } = g
  return put(g, { kind: 'path', name, d, fill: P.acc, blend: extra.blend, fx: [{ id: 'genFill', p: { mode: g.r.pick([0, 1, 3]), c1: P.acc, c2: inks(g).a2, c3: P.srf, c4: darker(P.bg, P.fg), grain: 30, warp: 60, scale: 120 } }] })
}

/* ── curve per il testo ───────────────────────────────────────────────── */
interface Curva { len: number; at: (l: number) => { x: number; y: number; a: number } }
function curva(f: (t: number) => Pt, n = 160): Curva {
  const pts = Array.from({ length: n + 1 }, (_, i) => f(i / n))
  const L = [0]
  for (let i = 1; i <= n; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const len = L[n]
  return {
    len,
    at(l) {
      let j = 0
      if (l <= 0) j = 0; else if (l >= len) j = n - 1; else { while (j < n - 1 && L[j + 1] < l) j++ }
      const seg = Math.max(1e-6, L[j + 1] - L[j]), t = (l - L[j]) / seg
      const [x0, y0] = pts[j], [x1, y1] = pts[j + 1]
      return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, a: Math.atan2(y1 - y0, x1 - x0) }
    },
  }
}
const LIVELLI = (b: number) => [1, 1 + 0.2 * b, 1 + 0.42 * b]
/** Corpi delle lettere: tre livelli al massimo, i più grandi al centro (la forma gonfia la parola). */
function letterSizes(line: string, size: number, bulge: number) {
  const ch = [...line], n = ch.length, lv = LIVELLI(bulge)
  return ch.map((_, i) => { const b = Math.sin(Math.PI * (n > 1 ? i / (n - 1) : 0.5)); return size * lv[bulge > 0 ? (b > 0.82 ? 2 : b > 0.42 ? 1 : 0) : 0] })
}
const advance = (line: string, font: FontSpec, size: number, bulge: number, tr: number) =>
  letterSizes(line, size, bulge).reduce((a, s, i) => a + lineWidth([...line][i], font, s) + tr * s, 0)
/**
 * Lettere su una curva: ogni lettera è un testo vero, ruotato sulla tangente e
 * appoggiato con la linea di base sulla curva. Restituisce i riquadri.
 */
function lettere(g: G, o: { line: string; font: FontSpec; size: number; curve: Curva; color: (i: number, ch: string) => string; bulge: number; tracking?: number; base: number; align?: number }) {
  const ch = [...o.line], tr = o.tracking ?? 0
  const sizes = letterSizes(o.line, o.size, o.bulge)
  const ws = ch.map((c, i) => lineWidth(c, o.font, sizes[i]) + tr * sizes[i])
  const total = ws.reduce((a, b) => a + b, 0)
  let l = (o.curve.len - total) * (o.align ?? 0.5)
  ch.forEach((c, i) => {
    const w = ws[i], s = sizes[i]
    const p = o.curve.at(l + w / 2)
    l += w
    if (c === ' ') return
    let deg = p.a / D2R
    if (Math.abs(deg) < 0.4) deg = deg < 0 ? -0.4 : 0.4
    const a = deg * D2R, bx = (w - tr * s) / 2, by = 0.879 * s
    const x = p.x - (bx * Math.cos(a) - by * Math.sin(a)), y = p.y - (bx * Math.sin(a) + by * Math.cos(a))
    txt(g, { name: `titolo#${o.base + i}`, lines: [c], font: o.font, size: s, x, y, color: o.color(i, c), leading: 1, angle: deg })
  })
  return total
}

/* ═══ Bauhaus ═══════════════════════════════════════════════════════════ */
/** Variante 1: quadrato, cerchio e triangolo incastrati su una griglia di moduli, appoggiati su una barra; il titolo a tutta misura. */
function bauhausForme(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const { a1, a2 } = inks(g)
  const side = g.landscape
  const hd = header(g, W * 0.42)
  if (hd.brand) putLab(g, 'brand', hd.brand, m, T, P.fg)
  if (hd.kick) putLab(g, 'occhiello', hd.kick, W - m - hd.kick.w, T, ink(g).acc)
  const colW = side ? (W - 2 * m) * 0.44 : W - 2 * m
  const info = infoBlock(g, side ? colW : (W - 2 * m) * 0.62, { kicker: false })
  const barH = U(g, 14 + 14 * k.densita)
  const st = stack(g, g.c.title, colW, side ? (B - T - hd.h - info.h) * 0.62 : H * (0.17 + 0.12 * k.scala), side ? 4 : g.portrait ? 4 : 3)
  const zx = m, zy = T + hd.h + U(g, 44)
  const zw = side ? W * 0.52 - m : W - 2 * m
  const zh = side ? B - zy - barH - U(g, 10) : B - info.h - U(g, 44) - st.h - U(g, 36) - barH - U(g, 30) - zy
  const q = Math.min(zw * 0.5, zh * 0.84)
  if (q < Math.min(W, H) * 0.19) return null
  const base = zy + zh
  // la griglia di costruzione a vista
  if (k.densita > 0.3) {
    const c = alpha(P.fg, 0.28), w = Math.max(1, 1.5 * g.u)
    for (const x of [zx, zx + q, zx + 2 * q]) put(g, { kind: 'line', name: 'costruzione', x1: x, y1: 0, x2: x, y2: H, color: c, width: w, dash: [U(g, 6), U(g, 7)] })
    for (const y of [base - q, base - 2 * q]) if (y > 0) put(g, { kind: 'line', name: 'costruzione', x1: 0, y1: y, x2: W, y2: y, color: c, width: w, dash: [U(g, 6), U(g, 7)] })
  }
  const fotoIn = g.photo ? r.int(0, 2) : -1
  const bl = k.sovrastampa > 0.45 ? over(g) : undefined
  const tilt = (k.energia > 0.3 ? r.range(-1, 1) * k.energia * 14 : 0)
  // quadrato
  const sq = { x: zx, y: base - q, w: q, h: q }
  if (fotoIn === 1) {
    if (k.sovrastampa > 0.25) put(g, { kind: 'rect', name: 'registro_quadrato', x: sq.x + U(g, 16), y: sq.y - U(g, 16), w: q, h: q, fill: a1 })
    photo(g, 'foto', sq)
  } else put(g, { kind: 'rect', name: 'quadrato', ...sq, fill: a1, r: g.s.forma === 'morbido' ? q * 0.06 : 0 })
  // cerchio, a cavallo del lato del quadrato
  const R = q * (0.52 + 0.06 * k.scala), ccx = zx + q, ccy = base - q * 0.6 - k.energia * q * 0.12
  if (fotoIn === 0) {
    if (k.sovrastampa > 0.25) put(g, { kind: 'circle', name: 'alone', cx: ccx + U(g, 18), cy: ccy - U(g, 14), r: R, fill: a2, blend: over(g) })
    photo(g, 'foto', { x: ccx - R, y: ccy - R, w: 2 * R, h: 2 * R }, { shape: 'circle' })
  } else put(g, { kind: 'circle', name: 'cerchio', cx: ccx, cy: ccy, r: R, fill: a2, blend: bl })
  // triangolo, appoggiato sulla barra, che esce dalla tavola
  const tx0 = zx + q * 1.28, tx1 = side ? zx + zw + q * 0.1 : W + q * 0.22, ty = base - Math.min(zh * 1.02, q * 1.25)
  const tri = rot([[tx0, base], [tx1, base], [(tx0 + tx1) / 2, ty]], (tx0 + tx1) / 2, base, tilt)
  if (fotoIn === 2) {
    put(g, { kind: 'path', name: 'ombra_triangolo', d: polyD(tri.map(([x, y]) => [x + U(g, 14), y + U(g, 4)] as Pt)), fill: P.fg })
    photoIn(g, 'foto', polyD(tri), bboxOf(tri))
  } else put(g, { kind: 'path', name: 'triangolo', d: polyD(tri), fill: P.fg, blend: bl && lighter(P.fg, P.bg) === P.fg ? bl : undefined })
  // numero dentro il quadrato pieno
  const num = g.c.numero?.trim()
  if (num && fotoIn !== 1) {
    const ns = Math.min(sizeForWidth(num, heavy(g), q * 0.42), q * 0.3)
    txt(g, { name: 'numero', lines: [num], font: heavy(g), size: ns, x: sq.x + U(g, 22), y: sq.y + q - ns * 1.13 - U(g, 18), color: su(g, a1, 3), leading: 1 })
  }
  // piccoli segni: un punto pieno e un quadratino ruotato
  if (k.densita > 0.5) {
    put(g, { kind: 'circle', name: 'punto', cx: zx + q * 0.18, cy: sq.y - q * 0.2, r: q * 0.07, fill: P.fg })
    put(g, { kind: 'rect', name: 'tassello', x: (tx0 + tx1) / 2 - q * 0.05, y: ty - q * 0.24, w: q * 0.1, h: q * 0.1, fill: a1, angle: 45 })
  }
  // la barra: tutto ci si appoggia sopra
  put(g, { kind: 'rect', name: 'barra', x: 0, y: base, w: side ? zx + zw + q * 0.1 : W - m, h: barH, fill: P.fg })
  if (side) {
    const x = W - m - colW
    putStack(g, st, x, zy, P.fg, ink(g).acc)
    info.place(x, B - info.h, ink(g))
  } else {
    putStack(g, st, m, base + barH + U(g, 34), P.fg, ink(g).acc)
    info.place(m, B - info.h, ink(g))
    // un quadratino d'accento allineato all'informazione
    if (k.densita > 0.4) put(g, { kind: 'rect', name: 'tassello', x: W - m - U(g, 54), y: B - U(g, 54), w: U(g, 54), h: U(g, 54), fill: a1 })
  }
  return finish(g, 'bauhaus', 'Bauhaus')
}

/** Tessera generativa: una forma primaria in un quadrato (quarto, mezzo, cerchio, triangolo…). */
function tessera(kind: number, x: number, y: number, t: number, rr: number): string {
  const c = (px: number, py: number): Pt => {
    // rotazione del motivo a passi di 90° attorno al centro della tessera
    const cx = x + t / 2, cy = y + t / 2, dx = px - cx, dy = py - cy
    return [[cx + dx, cy + dy], [cx - dy, cy + dx], [cx - dx, cy - dy], [cx + dy, cy - dx]][rr % 4] as Pt
  }
  const quarter = (ox: number, oy: number, R: number, a0: number, n = 10) => {
    const pts: Pt[] = [c(ox, oy)]
    for (let i = 0; i <= n; i++) { const a = (a0 + (90 * i) / n) * D2R; pts.push(c(ox + Math.cos(a) * R, oy + Math.sin(a) * R)) }
    return polyD(pts)
  }
  switch (kind) {
    case 0: return circD(x + t / 2, y + t / 2, t * 0.4)
    case 1: return quarter(x, y, t, 0)
    case 2: { const pts: Pt[] = []; for (let i = 0; i <= 16; i++) { const a = (180 * i / 16) * D2R; pts.push(c(x + t / 2 - Math.cos(a) * t / 2, y + t - Math.sin(a) * t / 2)) } return polyD(pts) }
    case 3: return polyD([c(x, y), c(x + t, y), c(x, y + t)])
    case 4: return quarter(x, y, t / 2, 0, 8) + ' ' + quarter(x + t, y + t, t / 2, 180, 8)
    case 5: return polyD([c(x + t * 0.25, y + t * 0.25), c(x + t * 0.75, y + t * 0.25), c(x + t * 0.75, y + t * 0.75), c(x + t * 0.25, y + t * 0.75)])
    case 6: return [0, 1, 2].map(i => polyD([c(x, y + t * (0.1 + i * 0.32)), c(x + t, y + t * (0.1 + i * 0.32)), c(x + t, y + t * (0.24 + i * 0.32)), c(x, y + t * (0.24 + i * 0.32))])).join(' ')
    default: return polyD([c(x + t / 2, y), c(x + t, y + t / 2), c(x + t / 2, y + t), c(x, y + t / 2)])
  }
}

/** Variante 2: la tavola è un tessuto di tessere generative al vivo; un blocco pulito per il testo, la foto in un modulo doppio. */
function bauhausTessere(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const { a1, a2 } = inks(g)
  const cols = g.landscape ? 8 : g.format === 'storia' ? 4 : 5
  const t = W / cols, rows = Math.ceil(H / t) + 1, oy = (H - rows * t) / 2
  const pad = U(g, 34)
  // blocco del testo (in moduli)
  const side = g.landscape
  const bc = side ? 4 : r.chance(0.5) && k.densita > 0.45 ? cols - 1 : cols
  const c0 = side ? (r.chance(0.5) ? 0 : cols - bc) : r.chance(0.5) ? 0 : cols - bc
  const bw = bc * t - 2 * pad
  const hd = header(g, bw)
  const info = infoBlock(g, bw * (side ? 1 : 0.8), { kicker: false })
  const tt = display(g, g.c.title, bw, side ? H * 0.42 : H * 0.26, 170 + 60 * k.scala, 46, 3)
  if (!tt) return null
  const need = 2 * pad + hd.h + U(g, 26) + tt.h + U(g, 30) + info.h
  const br = Math.ceil(need / t)
  // righe ammesse: il testo deve stare nella zona sicura
  const starts: number[] = []
  for (let j = 0; j + br <= rows; j++) { const y0 = oy + j * t; if (y0 + pad >= T - 1 && y0 + br * t - pad <= B + 1 && y0 >= -1 && y0 + br * t <= H + 1) starts.push(j) }
  if (!starts.length) return null
  const r0 = side ? starts[Math.floor(starts.length / 2)] : r.chance(0.6) ? starts[starts.length - 1] : starts[0]
  const inBlock = (c: number, j: number) => c >= c0 && c < c0 + bc && j >= r0 && j < r0 + br
  // foto in un modulo doppio libero
  const pcs: [number, number][] = []
  for (let j = 0; j < rows - 1; j++) for (let c = 0; c < cols - 1; c++) {
    if ([0, 1].some(a => [0, 1].some(b => inBlock(c + a, j + b)))) continue
    const y = oy + j * t
    if (y < -t * 0.2 || y + 2 * t > H + t * 0.2) continue
    pcs.push([c, j])
  }
  const pc = pcs.length ? r.pick(pcs) : null
  const inPhoto = (c: number, j: number) => !!pc && c >= pc[0] && c < pc[0] + 2 && j >= pc[1] && j < pc[1] + 2
  // tessere: fondo e forma in due colori diversi della palette
  const pal = [P.bg, a1, a2, P.fg]
  const fills = new Map<string, string>()
  const num = g.c.numero?.trim()
  let numCell: [number, number] | null = null
  for (let j = 0; j < rows; j++) for (let c = 0; c < cols; c++) {
    if (inBlock(c, j) || inPhoto(c, j)) continue
    const x = c * t, y = oy + j * t
    if (y + t < 0 || y > H) continue
    const bgc = r.pick([P.bg, P.bg, a1, a2, P.fg])
    put(g, { kind: 'rect', name: 'tessera', x, y, w: t + 0.5, h: t + 0.5, fill: bgc })
    if (num && !numCell && j > 0 && y > T && y + t < B && r.chance(0.25)) { numCell = [c, j]; continue }
    if (r.chance(0.12 - k.densita * 0.08)) continue
    const fc = r.pick(pal.filter(p => p !== bgc))
    fills.set(fc, (fills.get(fc) ?? '') + tessera(r.int(0, 7), x, y, t, r.int(0, 3) + Math.round(k.energia * r.int(0, 2))) + ' ')
  }
  for (const [fc, d] of fills) put(g, { kind: 'path', name: 'motivo', d, fill: fc })
  // la foto: cerchio, quarto o mezzo cerchio nel modulo doppio
  if (pc) {
    const x = pc[0] * t, y = oy + pc[1] * t, s = 2 * t
    put(g, { kind: 'rect', name: 'tessera', x, y, w: s, h: s, fill: a1 })
    const mode = r.int(0, 2)
    const bl = k.sovrastampa > 0.5 && g.photo ? over(g, a1) : undefined
    if (mode === 0) photo(g, 'foto', { x: x + s * 0.04, y: y + s * 0.04, w: s * 0.92, h: s * 0.92 }, { shape: 'circle', blend: bl })
    else photoIn(g, 'foto', tessera(mode === 1 ? 1 : 2, x, y, s, r.int(0, 3)), { x, y, w: s, h: s }, { blend: bl })
  }
  // il numero in una tessera
  if (num && numCell) {
    const x = numCell[0] * t, y = oy + numCell[1] * t
    put(g, { kind: 'rect', name: 'tessera', x, y, w: t, h: t, fill: P.fg })
    const ns = Math.min(sizeForWidth(num, heavy(g), t - 2 * U(g, 22)), t * 0.5)
    txt(g, { name: 'numero', lines: [num], font: heavy(g), size: ns, x: x + U(g, 20), y: y + t - ns * 1.13 - U(g, 18), color: su(g, P.fg, 3), leading: 1 })
  }
  // il blocco pulito, con un filo d'accento sul lato
  const bx = c0 * t, by = oy + r0 * t
  put(g, { kind: 'rect', name: 'velo_testo', x: bx, y: by, w: bc * t, h: br * t, fill: P.bg })
  put(g, { kind: 'rect', name: 'filo_blocco', x: bx, y: by, w: bc * t, h: U(g, 8 + 8 * k.densita), fill: P.fg })
  let y = by + pad + Math.max(0, (br * t - need) / 2)
  const x = bx + pad
  if (hd.brand) putLab(g, 'brand', hd.brand, x, y, P.fg)
  if (hd.kick && (!hd.brand || hd.brand.w + hd.kick.w + U(g, 30) < bw)) putLab(g, 'occhiello', hd.kick, x + bw - hd.kick.w, y, ink(g).acc)
  y += hd.h + U(g, 26)
  putDisplay(g, 'titolo', tt, x, y, P.fg, 'left', bw)
  y += tt.h + U(g, 30)
  info.place(x, y, ink(g))
  return finish(g, 'bauhaus', 'Bauhaus')
}

/* ═══ Memphis ═══════════════════════════════════════════════════════════ */
interface MemphisCtx { a1: string; a2: string; tint: string; k: string; sw: number }
const memphisCtx = (g: G): MemphisCtx => {
  const { a1, a2 } = inks(g)
  return { a1, a2, tint: mix(a2, g.P.bg, 0.55), k: darker(g.P.fg, g.P.bg), sw: U(g, 5 + 3 * g.k.densita) }
}
/** Un motivo Memphis in un poligono: puntini, righe, zigzag (sempre nell'inchiostro, sul colore della forma). */
function motivo(g: G, name: string, poly: Pt[], fill: string, kind: 'punti' | 'righe' | 'zigzag' | 'pieno', ink2: string, angle = 45) {
  const u = g.u
  put(g, { kind: 'path', name: `${name}_forma`, d: polyD(poly), fill })
  if (kind === 'punti') put(g, { kind: 'path', name: `${name}_punti`, d: dotsD(poly, 26 * u, 5.5 * u), fill: ink2 })
  else if (kind === 'righe') put(g, { kind: 'path', name: `${name}_righe`, d: hatchD(poly, angle, 22 * u), fill: 'transparent', stroke: ink2, sw: 6 * u })
  else if (kind === 'zigzag') put(g, { kind: 'path', name: `${name}_zigzag`, d: zigzagD(poly, 9 * u, 34 * u, 30 * u), fill: 'transparent', stroke: ink2, sw: 4.5 * u })
}
/** Foto in un ritaglio geometrico con contorno nero e ombra piena. */
function memphisFoto(g: G, mc: MemphisCtx, kind: number, cx: number, cy: number, R: number, shadow: string) {
  const poly = kind === 0 ? circPts(cx, cy, R, 64) : kind === 1 ? [[cx - R, cy + R * 0.8], [cx + R, cy + R * 0.8], [cx, cy - R]] as Pt[] : (() => { const p: Pt[] = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + (Math.PI * i) / 24; p.push([cx + Math.cos(a) * R, cy + R * 0.45 + Math.sin(a) * R]) } return p })()
  const d = kind === 0 ? circD(cx, cy, R) : polyD(poly)
  const off = U(g, 14 + 10 * g.k.sovrastampa)
  put(g, { kind: 'path', name: 'ombra_foto', d: shiftD(d, off, off), fill: shadow })
  photoIn(g, 'foto', d, bboxOf(poly))
  put(g, { kind: 'path', name: 'contorno_foto', d, fill: 'transparent', stroke: mc.k, sw: mc.sw })
  return bboxOf(poly)
}
/** Titolo in un blocco pieno (ruotato con l'energia) con l'ombra sfalsata dietro. */
function memphisTitolo(g: G, mc: MemphisCtx, t: NonNullable<ReturnType<typeof display>>, x: number, y: number, angle: number, fill: string, shadow: string) {
  const pad = Math.max(U(g, 28), t.size * 0.28)
  const w = t.w + 2 * pad, h = t.h + 2 * pad
  const off = U(g, 14 + 12 * g.k.sovrastampa)
  put(g, { kind: 'rect', name: 'blocco_ombra', x: x + off, y: y + off, w, h, fill: shadow, angle })
  put(g, { kind: 'rect', name: 'velo_titolo', x, y, w, h, fill, angle, stroke: mc.k, sw: fill === mc.k ? 0 : mc.sw })
  const a = angle * D2R
  putDisplay(g, 'titolo', t, x + pad * Math.cos(a) - pad * Math.sin(a), y + pad * Math.sin(a) + pad * Math.cos(a), su(g, fill), 'left', t.w, { angle, su: fill })
  return { w, h, box: bboxOf(rot(boxPts({ x, y, w: w + off, h: h + off }), x, y, angle)) }
}

/** Variante 1: forme sparse e motivi che si scontrano attorno al blocco del titolo. */
function memphisEsplosione(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const mc = memphisCtx(g)
  const side = g.landscape
  const hd = header(g, W * 0.4)
  if (hd.brand) putLab(g, 'brand', hd.brand, m, T, P.fg)
  const info = infoBlock(g, side ? W * 0.36 : (W - 2 * m) * 0.62, { kicker: true })
  const t = display(g, g.c.title, (side ? W * 0.5 : W - 2 * m) * 0.84, side ? H * 0.4 : H * 0.26, 150 + 60 * k.scala, 46, 3)
  if (!t) return null
  const angle = -(2 + 6 * k.energia) * (r.chance(0.5) ? 1 : -0.6)
  const pad = Math.max(U(g, 28), t.size * 0.28)
  const bw = t.w + 2 * pad, bh = t.h + 2 * pad
  // posizioni: titolo al centro della zona libera, foto sopra (o a sinistra), informazioni in basso
  const infoBox = { x: m, y: B - info.h, w: info.w, h: info.h }
  const bx = side ? W * 0.5 - U(g, 20) : m + (W - 2 * m - bw) * r.range(0.15, 0.85)
  const by = side ? (H - bh) / 2 + U(g, 30) : Math.min(B - info.h - U(g, 60) - bh, g.T + (B - T) * 0.48)
  const photoR = side ? Math.min(H * 0.3, W * 0.17) : Math.min(W * 0.27, (by - T - hd.h - U(g, 60)) * 0.52)
  if (photoR < U(g, 110)) return null
  const pcx = side ? W * 0.27 : bx + bw / 2 < W / 2 ? W * 0.66 : W * 0.34, pcy = side ? H * 0.45 : T + hd.h + U(g, 40) + photoR
  // fondo: zigzag in un angolo e una fascia a righe
  const zz: Pt[] = side ? [[W * 0.62, 0], [W, 0], [W, H * 0.34], [W * 0.78, H * 0.34]] : [[0, H * 0.6], [W * 0.3, H * 0.66], [W * 0.22, H], [0, H]]
  const busy = [grow(infoBox, U(g, 20)), ...(hd.brand ? [grow({ x: m, y: T, w: hd.brand.w, h: hd.brand.h }, U(g, 20))] : [])]
  const free = (pts: Pt[]) => !busy.some(b => hitB(bboxOf(pts), b))
  if (free(zz)) motivo(g, 'zigzag', zz, mc.tint, 'zigzag', mc.k)
  const disc = circPts(side ? W * 0.12 : W * 0.92, side ? H * 0.88 : H * 0.3, Math.min(W, H) * (0.17 + 0.06 * k.densita), 40)
  if (free(disc)) motivo(g, 'disco', disc, mc.a1, 'punti', mc.k)
  else motivo(g, 'disco', circPts(side ? W * 0.12 : W * 0.06, side ? H * 0.12 : T + hd.h + U(g, 200), Math.min(W, H) * 0.12, 40), mc.a1, 'punti', mc.k)
  const stripe = rot(boxPts({ x: bx - bw * 0.1, y: by + bh * 0.55, w: bw * 0.62, h: bh * 0.9 }), bx, by, angle * 2.5 + 12)
  if (free(stripe)) motivo(g, 'striscia', stripe, mc.a2, 'righe', P.bg, -45)
  // la foto nel ritaglio
  memphisFoto(g, mc, r.int(0, 2), pcx, pcy, photoR, mc.a2)
  // ghirigori e triangoli a contorno, sotto i testi
  const sq: Box[] = [{ x: pcx - photoR * 1.4, y: pcy + photoR * 0.6, w: photoR * 0.9, h: photoR * 0.3 }, { x: pcx + photoR * 0.4, y: pcy - photoR * 1.2, w: photoR, h: photoR * 0.3 }]
  for (const [i, b] of sq.entries()) if (!busy.some(z => hitB(b, z)) && b.y > 0 && b.y + b.h < H) put(g, { kind: 'path', name: 'ghirigoro', d: squiggleD(b.x, b.y + b.h / 2, b.x + b.w, b.y + b.h / 2, b.h * 0.3, 3 + i), fill: 'transparent', stroke: i ? mc.a1 : mc.k, sw: U(g, 9) })
  const tri: Pt[] = [[bx + bw * 0.92, by - U(g, 40)], [bx + bw * 1.05, by + U(g, 60)], [bx + bw * 0.8, by + U(g, 70)]]
  if (free(tri)) put(g, { kind: 'path', name: 'triangolo', d: polyD(tri), fill: mc.a1, stroke: mc.k, sw: mc.sw })
  // il titolo nel blocco pieno
  memphisTitolo(g, mc, t, bx, by, angle, mc.k, mc.a1)
  // informazioni e coriandoli geometrici
  info.place(infoBox.x, infoBox.y, ink(g))
  confettiMemphis(g, mc, 5 + Math.round(k.densita * 7))
  return finish(g, 'memphis', 'Memphis')
}

/** Coriandoli Memphis: triangolini, mezzelune e trattini a contorno, solo nei vuoti. */
function confettiMemphis(g: G, mc: MemphisCtx, n: number) {
  const busy = [...textBoxes(g, U(g, 20)), ...g.els.filter(e => e.kind === 'image' || (e.kind === 'path' && /foto|blocco/.test(e.name))).map(e => (e.kind === 'image' ? { x: e.x, y: e.y, w: e.w, h: e.h } : { x: 0, y: 0, w: 0, h: 0 }))]
  const out: SceneEl[] = []
  const cols = [mc.a1, mc.a2, mc.k]
  for (let i = 0, tries = 0; out.length < n && tries < n * 30; tries++) {
    const s = U(g, g.r.range(18, 34)), x = g.r.range(s * 2, g.W - s * 2), y = g.r.range(s * 2, g.H - s * 2)
    const b = { x: x - s, y: y - s, w: 2 * s, h: 2 * s }
    if (busy.some(z => hitB(b, z))) continue
    busy.push(grow(b, s))
    const kind = (i++) % 3, a = g.r.range(0, 360)
    if (kind === 0) out.push({ kind: 'path', name: 'coriandolo', d: polyD(rot([[x - s, y + s * 0.7], [x + s, y + s * 0.7], [x, y - s]], x, y, a)), fill: 'transparent', stroke: cols[i % 3], sw: U(g, 4) })
    else if (kind === 1) out.push({ kind: 'path', name: 'coriandolo', d: polyD(rot(Array.from({ length: 13 }, (_, j) => [x + Math.cos(Math.PI * j / 12) * s, y + Math.sin(Math.PI * j / 12) * s] as Pt), x, y, a)), fill: cols[(i + 1) % 3] })
    else out.push({ kind: 'path', name: 'coriandolo', d: squiggleD(x - s, y, x + s, y, s * 0.18, 2), fill: 'transparent', stroke: cols[(i + 2) % 3], sw: U(g, 5) })
  }
  const first = g.els.findIndex(e => e.kind === 'text' && !e.deco)
  g.els.splice(first < 0 ? g.els.length : first, 0, ...out)
}

/** Variante 2: cornici annidate di motivi diversi; dentro, il campo bianco col titolo centrato (l'unica centralità ammessa). */
function memphisCornice(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const mc = memphisCtx(g)
  const b1 = U(g, 54 + 34 * k.densita), b2 = U(g, 34), b3 = U(g, 9)
  const side = g.landscape
  // cornice 1: zigzag; cornice 2: righe; filo nero; campo
  put(g, { kind: 'rect', name: 'cornice_1', x: 0, y: 0, w: W, h: H, fill: mc.a1 })
  const strips: Box[] = [{ x: 0, y: 0, w: W, h: b1 }, { x: 0, y: H - b1, w: W, h: b1 }, { x: 0, y: b1, w: b1, h: H - 2 * b1 }, { x: W - b1, y: b1, w: b1, h: H - 2 * b1 }]
  put(g, { kind: 'path', name: 'cornice_zigzag', d: strips.map(s => zigzagD(boxPts(s), U(g, 8), U(g, 30), U(g, 26))).join(' '), fill: 'transparent', stroke: mc.k, sw: U(g, 4.5) })
  const i2 = { x: b1, y: b1, w: W - 2 * b1, h: H - 2 * b1 }
  put(g, { kind: 'rect', name: 'cornice_2', ...i2, fill: mc.a2 })
  put(g, { kind: 'path', name: 'cornice_righe', d: hatchD(boxPts(i2), r.chance(0.5) ? 0 : 90, U(g, 16)), fill: 'transparent', stroke: P.bg, sw: U(g, 5) })
  const i3 = grow(i2, -b2)
  put(g, { kind: 'rect', name: 'cornice_filo', ...i3, fill: mc.k })
  const fld = grow(i3, -b3)
  put(g, { kind: 'rect', name: 'campo_interno', ...fld, fill: P.bg })
  // contenuto del campo
  const inner = { x: Math.max(fld.x + U(g, 40), m), y: Math.max(fld.y + U(g, 40), T), w: 0, h: 0 }
  inner.w = W - 2 * inner.x
  inner.h = Math.min(fld.y + fld.h - U(g, 40), B) - inner.y
  const photoR = side ? Math.min(fld.h * 0.36, W * 0.17) : Math.min(fld.w * 0.25, fld.h * 0.16)
  const textX = side ? fld.x + photoR * 2.3 + U(g, 50) : inner.x
  const textW = side ? inner.x + inner.w - textX : inner.w
  const hd = header(g, textW)
  const info = infoBlock(g, textW * 0.86, { kicker: false })
  const t = display(g, g.c.title, textW * 0.8, side ? inner.h * 0.5 : inner.h * 0.32, 150 + 50 * k.scala, 44, 3)
  if (!t) return null
  const pad = Math.max(U(g, 28), t.size * 0.28)
  const blockH = t.h + 2 * pad
  const totalH = hd.h + U(g, 36) + blockH + U(g, 44) + info.h
  const topFree = side ? inner.y : inner.y + photoR * 1.5
  if (inner.y + inner.h - topFree < totalH) return null
  let y = topFree + (inner.y + inner.h - topFree - totalH) * 0.55
  const cx = textX + textW / 2
  // la foto nel ritaglio che rompe la cornice in alto
  const pk = r.int(0, 2)
  if (side) memphisFoto(g, mc, pk, fld.x + photoR * 1.2, H / 2, photoR, mc.a1)
  else memphisFoto(g, mc, pk, fld.x + fld.w - photoR * 0.75, fld.y + photoR * 0.4, photoR, mc.a1)
  if (hd.brand) putLab(g, 'brand', hd.brand, cx - hd.brand.w / 2, y, P.fg, 'left')
  y += hd.h + U(g, 36)
  memphisTitolo(g, mc, t, cx - (t.w + 2 * pad) / 2, y, k.energia > 0.5 ? -2 * k.energia : 0, mc.k, mc.a1)
  y += blockH + U(g, 44)
  const kicker = lab(g, g.c.kicker, textW)
  if (kicker && y + kicker.h + U(g, 14) + info.h <= inner.y + inner.h) { putLab(g, 'occhiello', kicker, cx - kicker.w / 2, y, ink(g).acc); y += kicker.h + U(g, 14) }
  info.place(cx - info.w / 2, y, ink(g), 'center')
  confettiMemphis(g, mc, 3 + Math.round(k.densita * 4))
  // i coriandoli restano nel campo
  g.els = g.els.filter(e => e.name !== 'coriandolo' || (() => { const b = bboxOf((e as { d: string }).d.match(/-?\d+(?:\.\d+)?/g)!.map(Number).reduce<Pt[]>((a, v, i, arr) => (i % 2 ? a : [...a, [v, arr[i + 1]] as Pt]), [])); return b.x > fld.x + 4 && b.y > fld.y + 4 && b.x + b.w < fld.x + fld.w - 4 && b.y + b.h < fld.y + fld.h - 4 })())
  return finish(g, 'memphis', 'Memphis')
}

/** Variante 3: griglia di celle al vivo, ognuna con il suo motivo; titolo in due celle piene, foto in una cella. */
function memphisGriglia(g: G): Scene | null {
  const { W, H, P, k, r, T, B } = g
  const mc = memphisCtx(g)
  const cols = g.landscape ? 4 : 3, rows = g.landscape ? 3 : g.format === 'storia' ? 5 : g.format === 'verticale' ? 4 : 3
  const cw = W / cols, ch = H / rows
  const pad = U(g, 36)
  // celle del titolo (due affiancate) e dell'informazione, dentro la zona sicura
  const okRow = (j: number) => j * ch + pad >= T && (j + 1) * ch - pad <= B
  const rowsOk = Array.from({ length: rows }, (_, j) => j).filter(okRow)
  if (rowsOk.length < 2) return null
  const tr = rowsOk[Math.min(rowsOk.length - 2, r.int(0, Math.max(0, rowsOk.length - 2)))]
  const ir = rowsOk.find(j => j > tr) ?? rowsOk.find(j => j !== tr)!
  const tc = r.int(0, cols - 2)
  const span = cols >= 4 ? 3 : 2
  const tc0 = Math.min(tc, cols - span)
  const ic = r.int(0, cols - 2)
  const used = new Set<string>()
  for (let i = 0; i < span; i++) used.add(`${tc0 + i},${tr}`)
  for (let i = 0; i < 2; i++) used.add(`${ic + i},${ir}`)
  // la cella della foto
  const free = [] as [number, number][]
  for (let j = 0; j < rows; j++) for (let c = 0; c < cols; c++) if (!used.has(`${c},${j}`)) free.push([c, j])
  const pc = r.pick(free)
  used.add(`${pc[0]},${pc[1]}`)
  // celle a motivi: colori vicini che si scontrano
  const kinds = ['punti', 'righe', 'zigzag', 'pieno'] as const
  const fillsC = [mc.a1, mc.a2, mc.tint, P.bg, mc.k]
  let n = 0
  for (let j = 0; j < rows; j++) for (let c = 0; c < cols; c++) {
    if (used.has(`${c},${j}`)) continue
    const fc = fillsC[(c + j * 2 + n) % fillsC.length]
    const kd = kinds[(c * 3 + j + r.int(0, 3)) % 4]
    const poly = boxPts({ x: c * cw, y: j * ch, w: cw + 0.5, h: ch + 0.5 })
    const ink2 = fc === mc.k ? P.bg : mc.k
    motivo(g, `cella_${n}`, poly, fc, kd, ink2, (n % 2 ? 45 : -45))
    if (kd === 'pieno') {
      // forma primaria nella cella piena
      const cx = c * cw + cw / 2, cy = j * ch + ch / 2, R = Math.min(cw, ch) * 0.3
      const sh = n % 2 ? circPts(cx, cy, R, 32) : [[cx - R, cy + R * 0.8], [cx + R, cy + R * 0.8], [cx, cy - R]] as Pt[]
      put(g, { kind: 'path', name: 'forma', d: polyD(sh), fill: fc === mc.a1 ? mc.a2 : mc.a1, stroke: mc.k, sw: mc.sw })
    }
    n++
  }
  // la foto nella sua cella, in un ritaglio
  const px = pc[0] * cw, py = pc[1] * ch
  put(g, { kind: 'rect', name: 'cella_foto', x: px, y: py, w: cw + 0.5, h: ch + 0.5, fill: mc.a1 })
  memphisFoto(g, mc, r.int(0, 1), px + cw / 2, py + ch / 2, Math.min(cw, ch) * 0.38, mc.k)
  // titolo: le celle diventano un blocco pieno
  const tb = { x: tc0 * cw, y: tr * ch, w: span * cw, h: ch }
  put(g, { kind: 'rect', name: 'velo_titolo', ...tb, fill: mc.k })
  const t = display(g, g.c.title, tb.w - 2 * pad, tb.h - 2 * pad, 140 + 50 * k.scala, 40, 3)
  if (!t) return null
  putDisplay(g, 'titolo', t, tb.x + pad, tb.y + (tb.h - t.h) / 2, su(g, mc.k), 'left', t.w, { su: mc.k })
  // informazioni: due celle chiare
  const ib = { x: ic * cw, y: ir * ch, w: 2 * cw, h: ch }
  put(g, { kind: 'rect', name: 'velo_info', ...ib, fill: P.bg, stroke: mc.k, sw: mc.sw })
  const hd = header(g, ib.w - 2 * pad)
  const info = infoBlock(g, ib.w - 2 * pad, { kicker: false, bodyLines: 2 })
  const full = hd.h + U(g, 18) + info.h
  const useBody = full <= ib.h - 2 * pad
  const info2 = useBody ? info : infoBlock(g, ib.w - 2 * pad, { kicker: false, body: false })
  const h2 = hd.h + U(g, 18) + info2.h
  if (h2 > ib.h - 2 * pad) return null
  let y = ib.y + (ib.h - h2) / 2
  if (hd.brand) { putLab(g, 'brand', hd.brand, ib.x + pad, y, P.fg) }
  y += hd.h + U(g, 18)
  info2.place(ib.x + pad, y, ink(g))
  return finish(g, 'memphis', 'Memphis')
}

/* ═══ Bersaglio ═════════════════════════════════════════════════════════ */
/** Colori degli anelli dal più esterno: inchiostri alternati al fondo. */
const anelli = (g: G) => { const { a1, a2 } = inks(g); return [a1, g.P.bg, a2, g.P.bg, g.P.fg, g.P.bg] }

/** Variante 1: coccarda centrata, foto nel centro, la barra del titolo che la attraversa; testo che gira sull'anello. */
function bersaglioCoccarda(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const side = g.landscape
  const hd = header(g, W * 0.42)
  if (hd.brand) putLab(g, 'brand', hd.brand, m, T, P.fg)
  if (hd.kick && !side) putLab(g, 'occhiello', hd.kick, W - m - hd.kick.w, T, ink(g).acc)
  const colW = side ? W * 0.34 : W - 2 * m
  const info = infoBlock(g, side ? colW : Math.min(colW, W * 0.72), { kicker: side })
  const zy0 = T + hd.h + U(g, 30), zy1 = side ? B : B - info.h - U(g, 40)
  const cx = side ? W * 0.33 : W / 2, cy = (zy0 + zy1) / 2
  const Rmax = side ? Math.min(H * 0.5, W * 0.31) : Math.min((zy1 - zy0) / 2, W * (0.5 + 0.1 * k.scala))
  if (Rmax < U(g, 260)) return null
  const n = 5 + Math.round(k.densita * 3)
  const cols = anelli(g)
  const r0 = Rmax * (0.3 + 0.06 * k.scala)
  const step = (Rmax - r0) / n
  for (let i = 0; i < n; i++) {
    const rr = Rmax - i * step
    put(g, { kind: 'circle', name: 'anello', cx, cy, r: rr, fill: cols[i % cols.length], blend: i % 2 === 0 && k.sovrastampa > 0.6 && i > 0 ? over(g) : undefined })
  }
  // retino su un anello di fondo
  if (k.densita > 0.45) {
    const ri = Rmax - step, ro = Rmax - step * 2
    const ring = circPts(cx, cy, ri, 64)
    let d = ''
    const st = U(g, 18)
    for (let y = cy - ri; y < cy + ri; y += st * 0.866) for (let x = cx - ri; x < cx + ri; x += st) { const dd = Math.hypot(x - cx, y - cy); if (dd < ri - st * 0.4 && dd > ro + st * 0.4) d += circD(x, y, st * 0.24) }
    if (d && inPoly([cx, cy - (ri + ro) / 2], ring)) put(g, { kind: 'path', name: 'puntini_anello', d, fill: P.fg })
  }
  if (g.photo) photo(g, 'foto', { x: cx - r0, y: cy - r0, w: 2 * r0, h: 2 * r0 }, { shape: 'circle' })
  else put(g, { kind: 'circle', name: 'centro', cx, cy, r: r0, fill: P.fg })
  // anello di testo sul bordo esterno
  const ringText = [g.c.brand, g.c.kicker, ...(g.c.details ?? [])].filter(Boolean).join('  ●  ').toUpperCase()
  const rsz = Math.min(step * 0.42, U(g, 26))
  if (ringText && rsz > U(g, 13)) {
    const rr = Rmax - step * 1.5
    const unit = `${ringText}  ●  `
    const reps = Math.max(1, Math.floor((2 * Math.PI * rr) / Math.max(1, lineWidth(unit, s.label, rsz, 0.12))))
    put(g, { kind: 'arcText', name: 'anello_testo', cx, cy, r: rr - rsz * 0.4, text: unit.repeat(reps), font: s.label, size: rsz, color: su(g, P.bg, 3), full: true, start: r.range(0, 360) })
  }
  // la barra col titolo
  const barW = side ? Math.min(2 * Rmax * 1.08, W * 0.62) : W
  const t = heavyFit(g, g.c.title, barW - 2 * U(g, 50), Rmax * 0.62, 150 + 60 * k.scala, 44, 2)
  if (!t) return null
  const pad = Math.max(U(g, 26), t.size * 0.2)
  const bh = t.h + 2 * pad
  const barX = side ? Math.max(0, cx - barW / 2) : 0
  const barC = P.fg
  const ang = k.energia > 0.55 ? -(k.energia - 0.5) * 8 : 0
  const a = ang * D2R
  const bx = cx - (barW / 2) * Math.cos(a) + (bh / 2) * Math.sin(a), by = cy - (barW / 2) * Math.sin(a) - (bh / 2) * Math.cos(a)
  put(g, { kind: 'rect', name: 'velo_barra', x: side ? barX : bx, y: side ? cy - bh / 2 : by, w: barW, h: bh, fill: barC, angle: side ? 0 : ang })
  const tcx = cx - (t.w / 2) * Math.cos(a) + (t.h / 2) * Math.sin(a), tcy = cy - (t.w / 2) * Math.sin(a) - (t.h / 2) * Math.cos(a)
  txt(g, { name: 'titolo', lines: t.lines, font: heavy(g), size: t.size, x: side ? cx - t.w / 2 : tcx, y: side ? cy - t.h / 2 : tcy, w: t.w, align: 'center', color: su(g, barC, 3), leading: t.leading ?? 0.9, tracking: t.tracking ?? -0.01, angle: side ? undefined : ang })
  // numero in un bollino sull'anello
  const num = g.c.numero?.trim()
  if (num) {
    const br = Math.max(U(g, 70), step * 0.9)
    const ang2 = -0.75 * Math.PI
    const bcx = cx + Math.cos(ang2) * (Rmax - br * 0.2), bcy = cy + Math.sin(ang2) * (Rmax - br * 0.2)
    if (bcy - br > T + hd.h + U(g, 12) && bcx - br > m * 0.5) {
      put(g, { kind: 'path', name: 'bollino', d: starPath(bcx, bcy, br, 14, 0.82), fill: inks(g).a2 })
      const ns = Math.min(sizeForWidth(num, heavy(g), br * 1.15), br * 0.62)
      txt(g, { name: 'numero', lines: [num], font: heavy(g), size: ns, x: bcx - lineWidth(num, heavy(g), ns) / 2, y: bcy - ns * 0.58, color: su(g, inks(g).a2, 3), leading: 1 })
    }
  }
  if (side) info.place(W - m - colW, B - info.h, ink(g))
  else info.place((W - info.w) / 2, B - info.h, ink(g), 'center')
  return finish(g, 'bersaglio', 'Bersaglio')
}

/** Variante 2: il bersaglio nasce da un angolo e si allarga come un radar; testo nel quadrante libero, retino sugli anelli. */
function bersaglioRadar(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const side = g.landscape
  // testo prima: in alto (verticale) o a destra (orizzontale), allineato a destra
  const colW = side ? W * 0.42 : W - 2 * m
  const hd = header(g, colW)
  const info = infoBlock(g, side ? colW : colW * 0.7, { kicker: false })
  const t = display(g, g.c.title, colW, side ? H * 0.42 : H * 0.22, 170 + 60 * k.scala, 46, 3)
  if (!t) return null
  const x1 = W - m
  let y = T
  if (hd.brand) putLab(g, 'brand', hd.brand, x1 - hd.brand.w, y, P.fg)
  y += hd.h + U(g, 30)
  const kick = lab(g, g.c.kicker, colW)
  if (kick) { putLab(g, 'occhiello', kick, x1 - kick.w, y, ink(g).acc); y += kick.h + U(g, 16) }
  putDisplay(g, 'titolo', t, x1 - colW, y, P.fg, 'right', colW)
  y += t.h + U(g, 34)
  let textBottom: number
  if (side) { info.place(x1 - info.w, B - info.h, ink(g), 'right'); textBottom = y }
  else { info.place(x1 - info.w, y, ink(g), 'right'); textBottom = y + info.h }
  // il centro nell'angolo opposto
  const cx = 0, cy = H
  const near = side ? Math.hypot(W - m - colW - cx, Math.max(0, cy - B)) : Math.hypot(Math.max(0, x1 - info.w), cy - textBottom)
  const nearTitle = side ? W - m - colW : Math.hypot(m, cy - (T + hd.h + U(g, 30) + (kick ? kick.h + U(g, 16) : 0) + t.h))
  const Rmax = Math.min(near, nearTitle) - U(g, 46)
  if (Rmax < Math.min(W, H) * 0.55) return null
  const n = 6 + Math.round(k.densita * 5)
  const cols = anelli(g)
  const r0 = Rmax * (0.34 + 0.06 * k.scala)
  const steps = Array.from({ length: n }, (_, i) => i / n)
  // anelli che si infittiscono verso l'esterno (onda d'urto) con l'energia
  const rad = (f: number) => r0 + (Rmax - r0) * (1 - (1 - f) ** (1 + k.energia * 0.8))
  for (let i = 0; i < n; i++) put(g, { kind: 'circle', name: 'anello', cx, cy, r: rad(1 - steps[i]), fill: cols[i % cols.length] })
  // retino Ben-Day su due anelli di fondo
  let d = ''
  const st = U(g, 20)
  for (let i = 1; i < n; i += 4) {
    const ro = rad(1 - steps[i]), ri = rad(1 - steps[i] - 1 / n)
    for (let yy = cy - ro; yy < cy; yy += st * 0.866) for (let xx = cx; xx < cx + ro; xx += st) {
      const dd = Math.hypot(xx - cx, yy - cy)
      if (dd < ro - st * 0.5 && dd > ri + st * 0.5) { const f = (dd - ri) / (ro - ri); d += circD(xx, yy, st * (0.12 + 0.3 * f)) }
    }
  }
  if (d) put(g, { kind: 'path', name: 'puntini_anelli', d, fill: P.fg })
  // la foto nel quarto di cerchio al centro
  if (g.photo) photo(g, 'foto', { x: cx - r0, y: cy - r0, w: 2 * r0, h: 2 * r0 }, { shape: 'circle' })
  else put(g, { kind: 'circle', name: 'centro', cx, cy, r: r0, fill: P.fg })
  // segni di mira sugli assi
  const mk = alpha(P.fg, 0.8), w = Math.max(1.5, 2 * g.u)
  put(g, { kind: 'line', name: 'mira', x1: cx, y1: cy - Rmax - U(g, 30), x2: cx + U(g, 40), y2: cy - Rmax - U(g, 30), color: mk, width: w })
  put(g, { kind: 'line', name: 'mira', x1: cx + Rmax + U(g, 24), y1: cy, x2: cx + Rmax + U(g, 24), y2: cy - U(g, 40), color: mk, width: w })
  const num = g.c.numero?.trim()
  if (num) {
    const ns = Math.min(sizeForWidth(num, heavy(g), r0 * 0.6), r0 * 0.3)
    const bgc = cols[(n - 1) % cols.length]
    const ny = cy - r0 - (rad(1 - steps[n - 1]) - r0) / 2 - ns * 0.56
    const nx = cx + U(g, 40)
    if (ny > T && contrast(su(g, bgc, 3), bgc) >= 3) txt(g, { name: 'numero', lines: [num], font: heavy(g), size: ns, x: nx, y: ny, color: su(g, bgc, 3), leading: 1 })
  }
  if (k.densita > 0.5) printMarks(g, alpha(P.fg, 0.6))
  return finish(g, 'bersaglio', 'Bersaglio')
}

/** Variante 3: il bersaglio è la foto; anelli chiari sopra, il centro pieno col titolo, mirino. */
function bersaglioMirino(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const side = g.landscape
  const { a1 } = inks(g)
  const hd = header(g, W * 0.42)
  if (hd.brand) putLab(g, 'brand', hd.brand, m, T, P.fg)
  if (hd.kick) putLab(g, 'occhiello', hd.kick, W - m - hd.kick.w, T, ink(g).acc)
  const colW = side ? W * 0.36 : W - 2 * m
  const info = infoBlock(g, side ? colW : Math.min(colW, W * 0.72), { kicker: false })
  const zy0 = T + hd.h + U(g, 30), zy1 = side ? B : B - info.h - U(g, 36)
  const cx = side ? m + (W - 2 * m - colW) / 2 : W / 2, cy = (zy0 + zy1) / 2
  const R = Math.min((zy1 - zy0) / 2, side ? (W - 2 * m - colW) / 2 : W / 2 - m * 0.3)
  if (R < U(g, 280)) return null
  // il titolo deve stare nel centro pieno
  let r0 = R * 0.46, t: ReturnType<typeof display> = null
  for (; r0 <= R * 0.66 && !t; r0 += R * 0.05) t = display(g, g.c.title, r0 * 1.5, r0 * 1.1, 130 + 40 * k.scala, 34, 3, true)
  if (!t) return null
  r0 = Math.max(r0 - R * 0.05, Math.hypot(t.w / 2, t.h / 2) + U(g, 30))
  // foto come disco, anelli di fondo sopra, il centro pieno
  photo(g, 'foto_disco', { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R }, { shape: 'circle' })
  const n = 3 + Math.round(k.densita * 3)
  for (let i = 1; i <= n; i++) {
    const rr = r0 + ((R - r0) * i) / (n + 1)
    put(g, { kind: 'circle', name: 'anello_chiaro', cx, cy, r: rr, fill: 'transparent', stroke: i % 2 ? P.bg : a1, sw: U(g, i % 2 ? 14 : 6) + k.densita * U(g, 6) })
  }
  put(g, { kind: 'circle', name: 'anello_esterno', cx, cy, r: R, fill: 'transparent', stroke: P.fg, sw: U(g, 8) })
  // mirino che esce dal disco
  const w = U(g, 4)
  put(g, { kind: 'line', name: 'mira', x1: cx - R - U(g, 50), y1: cy, x2: cx - r0, y2: cy, color: P.fg, width: w })
  put(g, { kind: 'line', name: 'mira', x1: cx + r0, y1: cy, x2: cx + R + U(g, 50), y2: cy, color: P.fg, width: w })
  put(g, { kind: 'line', name: 'mira', x1: cx, y1: cy - R - U(g, 30), x2: cx, y2: cy - r0, color: P.fg, width: w })
  const cc = r.chance(0.5) ? a1 : P.fg
  put(g, { kind: 'circle', name: 'centro', cx, cy, r: r0, fill: cc })
  if (k.sovrastampa > 0.4) put(g, { kind: 'circle', name: 'registro_centro', cx: cx + U(g, 12 + 14 * k.sovrastampa), cy: cy - U(g, 10), r: r0, fill: 'transparent', stroke: P.bg, sw: U(g, 4) })
  putDisplay(g, 'titolo', t, cx - t.w / 2, cy - t.h / 2, su(g, cc, 3), 'center', t.w, { su: cc })
  if (side) info.place(W - m - colW, B - info.h, ink(g))
  else info.place((W - info.w) / 2, B - info.h, ink(g), 'center')
  return finish(g, 'bersaglio', 'Bersaglio')
}

/* ═══ Bande ═════════════════════════════════════════════════════════════ */
/**
 * Fasce di colore pieno con un angolo (0 maglia, obliquo, 90 bandiera): il
 * titolo le attraversa, quindi i colori delle fasce si scelgono perché il
 * titolo si legga su tutte. Informazioni e numero su un pannello pieno.
 */
function bandeCon(g: G, variant: number): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const { a1, a2 } = inks(g)
  const side = g.landscape
  // colore del titolo e fasce che lo reggono
  const cands = [...new Set([a1, a2, P.fg, P.bg, P.srf])]
  const opts = [lighter(P.fg, P.bg), darker(P.fg, P.bg)].map(tc => ({ tc, bands: cands.filter(c => c !== tc && contrast(c, tc) >= 2.8) }))
  opts.sort((x, y) => y.bands.length - x.bands.length + (y.bands.some(c => c === a1) ? 0.5 : 0) - (x.bands.some(c => c === a1) ? 0.5 : 0))
  const { tc } = opts[0]
  let bandC = opts[0].bands
  if (bandC.length < 2) bandC = [...bandC, mix(a1, tc === P.fg ? P.bg : P.fg, 0.55)].filter(c => contrast(c, tc) >= 2.8)
  if (bandC.length < 2) return null
  // ordine: l'accento per primo, poi alternati
  bandC.sort((x, y) => (y === a1 ? 1 : 0) - (x === a1 ? 1 : 0))
  const deg = variant === 0 ? -k.energia * 4 : variant === 1 ? -(22 + 18 * k.energia) * (r.chance(0.5) ? 1 : -1) : 90 - k.energia * 6
  // pannello in basso: informazioni e numero
  const panelC = P.fg === tc ? P.bg : P.fg
  const num = g.c.numero?.trim()
  const pad = U(g, 40)
  const infoW = side ? W * 0.42 : (W - 2 * m) * (num ? 0.6 : 0.8)
  const info = infoBlock(g, infoW, { kicker: false })
  const numS = num ? Math.min(sizeForWidth(num, heavy(g), side ? W * 0.3 : (W - 2 * m) * 0.36), U(g, 260)) : 0
  const panelH = Math.max(info.h, numS * 0.9) + 2 * pad
  const panelY = Math.min(H - panelH, B + pad - panelH)
  // il campo delle fasce
  const fy1 = panelY
  const a = deg * D2R, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux
  const C: Pt = [W / 2, fy1 / 2]
  const diag = Math.hypot(W, fy1)
  const unit = (variant === 2 ? W : fy1) / (6 + Math.round(k.densita * 6))
  const ws = [0.35, 0.6, 1, 1.6, 2.4]
  const offs: [number, number, string][] = []
  let o = -diag / 2, ci = 0
  while (o < diag / 2) {
    const w = unit * r.pick(ws)
    offs.push([o, w, bandC[ci % bandC.length]])
    ci++
    o += w
  }
  const bandPoly = (o0: number, w: number): Pt[] => {
    const L = diag * 1.2
    const p0: Pt = [C[0] + nx * o0 - ux * L / 2, C[1] + ny * o0 - uy * L / 2]
    return [p0, [p0[0] + ux * L, p0[1] + uy * L], [p0[0] + ux * L + nx * w, p0[1] + uy * L + ny * w], [p0[0] + nx * w, p0[1] + ny * w]]
  }
  // titolo: misurato prima, al centro del campo (attraversa le fasce)
  const hd = header(g, W * 0.5)
  const tW = side ? W * 0.62 : W - 2 * m
  const fieldTop = T + hd.h + U(g, 40)
  const t = heavyFit(g, g.c.title, tW, (fy1 - fieldTop) * 0.5, 210 + 70 * k.scala, 52, 3, -0.02)
  if (!t) return null
  const tang = variant === 1 ? -deg * 0.12 : -k.energia * 7
  const tW2 = t.w
  // la foto: una fascia che il titolo non tocca
  let photoBand = -1
  const tx = side ? m : (W - tW2) / 2
  const ty = fieldTop + (fy1 - fieldTop - t.h) * (g.photo ? (variant === 0 ? 0.78 : 0.62) : 0.5)
  const tBox = bboxOf(rot(boxPts({ x: tx, y: ty, w: tW2, h: t.h }), tx, ty, tang))
  if (g.photo) {
    const proj = boxPts(grow(tBox, U(g, 30))).map(([x, y]) => (x - C[0]) * nx + (y - C[1]) * ny)
    const pmin = Math.min(...proj), pmax = Math.max(...proj)
    const visible = (o0: number, w: number) => { const bb = bboxOf(bandPoly(o0, w)); return bb.x < W && bb.x + bb.w > 0 && bb.y < fy1 && bb.y + bb.h > 0 }
    const cand = offs.map((b, i) => ({ i, b })).filter(({ b }) => (b[0] + b[1] < pmin || b[0] > pmax) && visible(b[0], b[1]) && b[1] >= unit)
    if (cand.length) {
      const best = cand.sort((x, y) => y.b[1] - x.b[1])[0]
      // la fascia della foto si allarga quanto può senza toccare il titolo
      const [o0, w0] = best.b
      const lo = o0 + w0 <= pmin ? Math.max(o0 - unit * 1.5, -diag / 2) : o0
      const hi = o0 + w0 <= pmin ? Math.min(o0 + w0 + unit, pmin) : Math.min(o0 + w0 + unit * 1.5, diag / 2)
      best.b[0] = lo; best.b[1] = Math.max(w0, hi - lo)
      photoBand = best.i
    }
  }
  // disegno: prima la foto (le fasce dopo la coprono fuori dalla sua), poi le fasce
  if (photoBand >= 0) {
    const [o0, w0] = offs[photoBand]
    const poly = bandPoly(o0, w0)
    const bb = bboxOf(poly)
    const box = { x: Math.max(0, bb.x), y: Math.max(0, bb.y), w: Math.min(W, bb.x + bb.w) - Math.max(0, bb.x), h: Math.min(fy1, bb.y + bb.h) - Math.max(0, bb.y) }
    const tr = treat(g)
    const fx = g.s.registro === 'sportivo' || k.energia > 0.6 ? [...(tr.fx ?? []), { id: 'motionBlur', p: { length: Math.round(10 + 30 * k.energia), angle: Math.round(((deg % 180) + 180) % 180) } }] : tr.fx
    photo(g, 'foto', box, Math.abs(deg % 90) < 0.5 ? { fx } : { mask: polyD(poly), fx })
  }
  offs.forEach(([o0, w0, c], i) => {
    if (i === photoBand) return
    const p0 = bandPoly(o0, w0)[0]
    put(g, { kind: 'rect', name: 'fascia', x: p0[0], y: p0[1], w: diag * 1.2, h: w0 + 0.6, fill: c, angle: deg })
  })
  // filetti di velocità lungo i bordi di qualche fascia
  if (k.densita > 0.4) offs.forEach(([o0], i) => {
    if (i % 3 !== 1 || i === photoBand) return
    const p0 = bandPoly(o0, 0)[0]
    put(g, { kind: 'line', name: 'filetto', x1: p0[0], y1: p0[1], x2: p0[0] + ux * diag * 1.2, y2: p0[1] + uy * diag * 1.2, color: tc, width: U(g, 4) })
  })
  // testata: brand su una targhetta
  if (hd.brand) {
    const bpx = U(g, 18)
    const bc2 = panelC
    put(g, { kind: 'rect', name: 'targhetta', x: m - bpx, y: T - bpx, w: hd.brand.w + 2 * bpx, h: hd.brand.h + 2 * bpx, fill: bc2 })
    putLab(g, 'brand', hd.brand, m, T, su(g, bc2))
  }
  if (hd.kick) {
    const bpx = U(g, 18), kc = tc
    put(g, { kind: 'rect', name: 'targhetta', x: W - m - hd.kick.w - bpx, y: T - bpx, w: hd.kick.w + 2 * bpx, h: hd.kick.h + 2 * bpx, fill: kc })
    putLab(g, 'occhiello', hd.kick, W - m - hd.kick.w, T, su(g, kc))
  }
  // titolo con ombra piena sfalsata
  const sh = U(g, 8 + 12 * k.sovrastampa)
  const shadowC = panelC
  txt(g, { name: 'ombra_titolo', lines: t.lines, font: heavy(g), size: t.size, x: tx + sh, y: ty + sh, color: shadowC, leading: t.leading ?? 0.9, tracking: t.tracking ?? -0.02, angle: tang, deco: true })
  txt(g, { name: 'titolo', lines: t.lines, font: heavy(g), size: t.size, x: tx, y: ty, color: tc, leading: t.leading ?? 0.9, tracking: t.tracking ?? -0.02, angle: tang })
  // pannello
  put(g, { kind: 'rect', name: 'pannello', x: 0, y: panelY, w: W, h: H - panelY, fill: panelC })
  put(g, { kind: 'rect', name: 'filo_pannello', x: 0, y: panelY, w: W, h: U(g, 10), fill: a1 })
  info.place(m, panelY + pad + Math.max(0, (panelH - 2 * pad - info.h) / 2), inkSu(g, panelC))
  if (num) {
    const nc = readable(panelC, [a1, a2, su(g, panelC)], 2.6)
    const nw = lineWidth(num, heavy(g), numS, -0.02)
    txt(g, { name: 'numero', lines: [num], font: heavy(g), size: numS, x: W - m - nw, y: panelY + (panelH - numS * 1.13) / 2 + U(g, 6), color: nc, leading: 1, tracking: -0.02 })
  }
  return finish(g, 'bande', 'Bande')
}

/* ═══ Finestra ad arco ══════════════════════════════════════════════════ */
/** Titolo dell'arco: maiuscolo spaziato nei registri sobri, altrimenti il titolo con il suo accento. */
function arcoTitolo(g: G, maxW: number, maxH: number, maxLines: number) {
  const sobrio = ['lusso', 'editoriale'].includes(g.s.registro) || g.s.forma !== 'decostruito'
  if (sobrio) {
    const f = spaced(g, g.c.title, maxW, 92 + 40 * g.k.scala, 34, maxLines, 0.14)
    if (f && f.h <= maxH) return { f, spaced: true }
  }
  const f = display(g, g.c.title, maxW, maxH, 120 + 50 * g.k.scala, 40, maxLines)
  return f ? { f, spaced: false } : null
}
function putArcoTitolo(g: G, tt: NonNullable<ReturnType<typeof arcoTitolo>>, cx: number, y: number, color: string) {
  if (tt.spaced) return txt(g, { name: 'titolo', lines: tt.f.lines, font: g.s.display, size: tt.f.size, x: cx - tt.f.w / 2, y, w: tt.f.w, align: 'center', color, leading: 1.18, tracking: 0.14 })
  return putDisplay(g, 'titolo', tt.f, cx - tt.f.w / 2, y, color, 'center', tt.f.w)
}
/** Fregio: due filetti con un rombo al centro. */
function fregio(g: G, cx: number, y: number, w: number, color: string) {
  const s = U(g, 8)
  put(g, { kind: 'line', name: 'fregio', x1: cx - w / 2, y1: y, x2: cx - s * 2, y2: y, color, width: Math.max(1, 1.5 * g.u) })
  put(g, { kind: 'line', name: 'fregio', x1: cx + s * 2, y1: y, x2: cx + w / 2, y2: y, color, width: Math.max(1, 1.5 * g.u) })
  put(g, { kind: 'path', name: 'fregio_rombo', d: polyD([[cx, y - s], [cx + s, y], [cx, y + s], [cx - s, y]]), fill: color })
}
/** Testo che gira in cima all'arco, centrato sulla chiave. */
function arcoScritta(g: G, text: string, cx: number, cy: number, rr: number, size: number, color: string) {
  const t = text.toUpperCase()
  const w = lineWidth(t, g.s.label, size, 0.22) + t.length * size * 0.1
  const span = w / rr
  if (span > Math.PI * 0.9) return
  put(g, { kind: 'arcText', name: 'scritta_arco', cx, cy, r: rr, text: t, font: g.s.label, size, color, tracking: 0.22, start: -(span / 2) / D2R })
}

/** Variante 1: una finestra ad arco nel silenzio, cornice doppia, raggiera sottile, titolo spaziato sotto. */
function arcoFinestra(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  if (!g.photo) return null
  const side = g.landscape
  const gold = readable(P.bg, [P.acc, P.acc2, P.fg], 2.2)
  const hd = header(g, W * 0.5)
  const colW = side ? W * 0.4 : W - 2 * m
  const info = infoBlock(g, side ? colW * 0.9 : W * 0.62, { kicker: false, bodyLines: 2 })
  const tt = arcoTitolo(g, side ? colW : W - 2 * m, side ? H * 0.34 : H * 0.18, 3)
  if (!tt) return null
  const kick = lab(g, g.c.kicker, colW)
  // misure dell'arco
  const textH = (kick ? kick.h + U(g, 22) : 0) + tt.f.h + U(g, 40) + info.h
  const top = T + hd.h + U(g, 50)
  const aw = side ? Math.min(W * 0.3, (B - top) / 1.5) : Math.min(W * (0.48 + 0.1 * k.scala), (B - textH - U(g, 70) - top) / 1.42)
  if (aw < U(g, 260)) return null
  const ah = side ? B - top : Math.min(aw * 1.62, B - textH - U(g, 70) - top)
  const acx = side ? m + (W - 2 * m - colW) / 2 : W / 2
  const ax = acx - aw / 2, ay = top
  // raggiera dalla chiave dell'arco
  if (k.densita > 0.35) {
    const n = 18 + Math.round(k.densita * 18)
    let d = ''
    const R1 = aw * 0.62, R2 = aw * (0.9 + 0.5 * k.densita)
    for (let i = 0; i <= n; i++) { const a = Math.PI + (Math.PI * i) / n; d += `M ${f1(acx + Math.cos(a) * R1)} ${f1(ay + aw / 2 + Math.sin(a) * R1)} L ${f1(acx + Math.cos(a) * R2)} ${f1(ay + aw / 2 + Math.sin(a) * R2)} ` }
    put(g, { kind: 'path', name: 'raggiera', d, fill: 'transparent', stroke: alpha(gold, 0.55), sw: Math.max(1, 1.3 * g.u) })
  }
  // la nicchia: un fondo appena diverso dietro l'arco, poi la foto e le cornici
  put(g, { kind: 'path', name: 'nicchia', d: archD(ax - U(g, 34), ay - U(g, 34), aw + U(g, 68), ah + U(g, 34)), fill: P.srf })
  photo(g, 'foto', { x: ax, y: ay, w: aw, h: ah }, { shape: 'arch' })
  for (const [d0, sw] of [[U(g, 12), 1.6], [U(g, 22), 1]] as const) put(g, { kind: 'path', name: 'cornice', d: archD(ax - d0, ay - d0, aw + 2 * d0, ah + d0, true), fill: 'transparent', stroke: gold, sw: Math.max(1, sw * g.u) })
  // chiave di volta e davanzale
  put(g, { kind: 'path', name: 'chiave', d: polyD([[acx - U(g, 14), ay - U(g, 40)], [acx + U(g, 14), ay - U(g, 40)], [acx + U(g, 9), ay - U(g, 8)], [acx - U(g, 9), ay - U(g, 8)]]), fill: gold })
  put(g, { kind: 'line', name: 'davanzale', x1: ax - U(g, 50), y1: ay + ah + U(g, 1), x2: ax + aw + U(g, 50), y2: ay + ah + U(g, 1), color: gold, width: U(g, 3) })
  put(g, { kind: 'line', name: 'davanzale', x1: ax - U(g, 36), y1: ay + ah + U(g, 10), x2: ax + aw + U(g, 36), y2: ay + ah + U(g, 10), color: gold, width: Math.max(1, g.u) })
  // testata centrata
  if (hd.brand) putLab(g, 'brand', hd.brand, (side ? acx : W / 2) - hd.brand.w / 2, T, P.fg)
  // testo
  const tcx = side ? W - m - colW / 2 : W / 2
  let y = side ? (H - textH) / 2 : ay + ah + U(g, 60)
  if (kick) { putLab(g, 'occhiello', kick, tcx - kick.w / 2, y, ink(g).acc); y += kick.h + U(g, 22) }
  putArcoTitolo(g, tt, tcx, y, P.fg)
  y += tt.f.h + U(g, 20)
  fregio(g, tcx, y, Math.min(tt.f.w, W * 0.3), gold)
  y += U(g, 20)
  info.place(tcx - info.w / 2, y, ink(g), 'center')
  if (k.densita > 0.6) put(g, { kind: 'path', name: 'stellina', d: starPath(acx, ay - U(g, 64), U(g, 12), 4, 0.3), fill: gold })
  return finish(g, 'arco', 'Finestra ad arco', { specchio: false })
}

/** Variante 2: una loggia di archi che guarda la stessa foto (il centrale più alto), titolo sotto il porticato. */
function arcoLoggia(g: G): Scene | null {
  const { W, H, m, T, B, P, k } = g
  if (!g.photo) return null
  const side = g.landscape
  const n = side ? 5 : g.format === 'storia' ? 3 : 3
  const gold = readable(P.bg, [P.acc, P.acc2, P.fg], 2.2)
  const hd = header(g, W * 0.6)
  const info = infoBlock(g, side ? W * 0.5 : W * 0.7, { kicker: false, bodyLines: 2 })
  const tt = arcoTitolo(g, W - 2 * m, H * 0.18, 2)
  if (!tt) return null
  const kick = lab(g, g.c.kicker, W * 0.6)
  const textH = (kick ? kick.h + U(g, 20) : 0) + tt.f.h + U(g, 34) + info.h
  const top = T + hd.h + U(g, 56)
  const zoneH = B - textH - U(g, 64) - top
  const gap = U(g, 18 + 10 * k.densita)
  const aw = (W - 2 * m - (n - 1) * gap) / n
  const hMax = Math.min(zoneH, aw * (side ? 2.1 : 2.6))
  if (hMax < aw * 1.2) return null
  const view = { x: m, y: top, w: W - 2 * m, h: hMax }
  // il basamento: una fascia di colore su cui poggiano le colonne
  const baseY = top + hMax
  put(g, { kind: 'rect', name: 'basamento', x: 0, y: baseY, w: W, h: H - baseY, fill: P.srf })
  put(g, { kind: 'line', name: 'cornicione', x1: 0, y1: baseY + U(g, 1), x2: W, y2: baseY + U(g, 1), color: gold, width: U(g, 3) })
  for (let i = 0; i < n; i++) {
    const mid = Math.abs(i - (n - 1) / 2)
    const h = hMax * (1 - mid * (0.1 + 0.06 * k.energia))
    const x = m + i * (aw + gap), y = baseY - h
    photo(g, `foto_${i}`, { x, y, w: aw, h }, { shape: 'arch', view })
    put(g, { kind: 'path', name: 'cornice', d: archD(x - U(g, 8), y - U(g, 8), aw + U(g, 16), h + U(g, 8), true), fill: 'transparent', stroke: gold, sw: Math.max(1, 1.4 * g.u) })
  }
  if (hd.brand) putLab(g, 'brand', hd.brand, (W - hd.brand.w) / 2, T, P.fg)
  fregio(g, W / 2, T + hd.h + U(g, 22), W * 0.22, gold)
  let y = baseY + U(g, 48)
  const fg = su(g, P.srf), sec = readable(P.srf, [P.sec, fg], 3.6), acc = readable(P.srf, [P.acc, P.acc2, fg], 3.6)
  if (kick) { putLab(g, 'occhiello', kick, (W - kick.w) / 2, y, acc); y += kick.h + U(g, 20) }
  putArcoTitolo(g, tt, W / 2, y, fg)
  y += tt.f.h + U(g, 34)
  info.place((W - info.w) / 2, y, { fg, sec, acc }, 'center')
  return finish(g, 'arco', 'Finestra ad arco', { specchio: false })
}

/** Variante 3: il portale al vivo nel muro colorato, modanature concentriche, scritta che gira sulla chiave, targa. */
function arcoPortale(g: G): Scene | null {
  const { W, H, m, T, B, P, k } = g
  if (!g.photo) return null
  const side = g.landscape
  const wall = P.srf
  const gold = readable(wall, [P.acc, P.acc2, P.fg], 2.2)
  const fg = su(g, wall), acc = readable(wall, [P.acc, P.acc2, fg], 3.6)
  put(g, { kind: 'rect', name: 'muro', x: 0, y: 0, w: W, h: H, fill: wall })
  const tt = arcoTitolo(g, side ? W * 0.36 : W - 2 * m, side ? H * 0.36 : H * 0.16, 3)
  if (!tt) return null
  const hd = header(g, W * 0.5)
  const kick = lab(g, g.c.kicker, W * 0.5)
  let y = T
  const tcx = side ? W - m - W * 0.18 : W / 2
  // titolo in alto (verticale) o a destra (orizzontale)
  if (hd.brand) { putLab(g, 'brand', hd.brand, tcx - hd.brand.w / 2, y, fg); y += hd.brand.h + U(g, 30) }
  if (side) y = Math.max(y, (H - tt.f.h) / 2 - U(g, 60))
  putArcoTitolo(g, tt, tcx, y, fg)
  y += tt.f.h + U(g, 18)
  fregio(g, tcx, y, Math.min(tt.f.w, W * 0.3), gold)
  y += U(g, 30)
  // il portale fino al bordo basso
  const aw = side ? Math.min(W * 0.46, H * 0.78) : Math.min(W * (0.66 + 0.1 * k.scala), (H - y - U(g, 70)) / 1.05)
  const ax = side ? m + U(g, 40) : (W - aw) / 2
  const ay = side ? m + U(g, 60) : y + U(g, 70)
  if (aw < U(g, 320) || H - ay < aw * 0.75) return null
  const ah = H - ay + U(g, 4)
  const mol = [U(g, 70), U(g, 46), U(g, 24)]
  put(g, { kind: 'path', name: 'modanatura', d: archD(ax - mol[0], ay - mol[0], aw + 2 * mol[0], ah + mol[0]), fill: mix(wall, P.bg, 0.5) })
  put(g, { kind: 'path', name: 'modanatura_filo', d: archD(ax - mol[1], ay - mol[1], aw + 2 * mol[1], ah + mol[1], true), fill: 'transparent', stroke: gold, sw: U(g, 2) })
  put(g, { kind: 'path', name: 'modanatura', d: archD(ax - mol[2], ay - mol[2], aw + 2 * mol[2], ah + mol[2]), fill: P.bg })
  photo(g, 'foto', { x: ax, y: ay, w: aw, h: ah }, { shape: 'arch' })
  if (kick) arcoScritta(g, `${g.c.kicker}`, ax + aw / 2, ay + aw / 2, aw / 2 + (mol[0] + mol[1]) / 2 - kick.size * 0.3, Math.max(U(g, 16), kick.size * 0.9), fg)
  // gradini alla base
  for (let i = 0; i < 3; i++) put(g, { kind: 'line', name: 'gradino', x1: ax - mol[0] - U(g, 30) * (i + 1), y1: H - U(g, 24) * (i + 1), x2: ax + aw + mol[0] + U(g, 30) * (i + 1), y2: H - U(g, 24) * (i + 1), color: alpha(fg, 0.5), width: Math.max(1, 1.5 * g.u) })
  // targa con le informazioni
  const info = infoBlock(g, side ? W * 0.34 : aw * 0.78, { kicker: false, bodyLines: 2 })
  const pad = U(g, 30)
  const pw = info.w + 2 * pad, ph = info.h + 2 * pad
  const px = side ? tcx - pw / 2 : (W - pw) / 2
  const py = side ? Math.min(B - ph, y + U(g, 30)) : B - ph
  if (!side && py < ay + aw * 0.55) return null
  put(g, { kind: 'rect', name: 'targa', x: px, y: py, w: pw, h: ph, fill: wall, stroke: gold, sw: U(g, 2) })
  info.place(px + pad, py + pad, { fg, sec: readable(wall, [P.sec, fg], 3.6), acc }, 'center')
  return finish(g, 'arco', 'Finestra ad arco', { specchio: false })
}

/* ═══ Forme deformate ═══════════════════════════════════════════════════ */
/** Colori pieni delle forme (senza contorno) e il colore del titolo che deve leggersi sul fondo. */
const defCols = (g: G) => { const { a1, a2 } = inks(g); return [a1, a2, g.P.srf !== g.P.bg ? g.P.srf : mix(a1, g.P.bg, 0.5), g.P.fg] }
/** Titolo grasso su una curva: righe su curve parallele, corpo che riempie la curva, lettere gonfie al centro. */
function titoloCurvo(g: G, lines: string[], mk: (i: number, off: number) => Curva, maxSize: number, color: (li: number, i: number, ch: string) => string, bulge: number) {
  const font = heavy(g), tr = 0.01
  const up2 = lines.map(l => up(l, true))
  // corpo: la riga più lunga riempie il 94% della sua curva
  let size = maxSize
  for (const [i, l] of up2.entries()) { const c = mk(i, 0); size = Math.min(size, (size * c.len * 0.94) / advance(l, font, size, bulge, tr)) }
  if (size < 54 * g.u) return null
  const lead = size * (1 + 0.42 * bulge) * 0.98
  let base = 0
  up2.forEach((l, i) => { lettere(g, { line: l, font, size, curve: mk(i, i * lead), color: (j, ch) => color(i, j, ch), bulge, tracking: tr, base }); base += l.length + 1 })
  return { size, lead }
}

/** Variante 1: una pila di forme morbide (pillola, quadrotto, palla) e il titolo che si piega ad arco sopra. */
function deformatoPila(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const side = g.landscape
  const [c1, c2, c3, c4] = defCols(g)
  const hd = header(g, W * 0.42)
  const colW = side ? W * 0.36 : W - 2 * m
  const info = infoBlock(g, side ? colW : W * 0.64, { kicker: false })
  const ws = words(g.c.title)
  const lines = ws.length > 3 || g.c.title.length > 16 ? stackLines(g.c.title, 2).slice(0, 2) : [g.c.title]
  if (lines.length > 2) return null
  const zx = m, zw = side ? W - 2 * m - colW - U(g, 40) : W - 2 * m
  const zy = T + hd.h + U(g, 30), zb = side ? B : B - info.h - U(g, 50)
  const cxz = zx + zw / 2
  // pila: base, quadrotto, palla (dal basso)
  const bw = zw * (0.78 + 0.1 * k.scala), bh = bw * 0.24
  const tilt = (k.energia * 10 + 2) * (r.chance(0.5) ? 1 : -1)
  const stackH = bh + bw * 0.42 + bw * 0.3
  const titleH = (zb - zy) - stackH * 1.0
  if (titleH < U(g, 150)) return null
  const baseY = zb - bh / 2
  put(g, { kind: 'rect', name: 'forma_base', x: cxz - bw / 2, y: zb - bh, w: bw, h: bh, r: bh / 2, fill: c1 })
  // quadrotto appoggiato e ruotato
  const q = bw * 0.42
  const qx = cxz + bw * 0.12 * Math.sign(tilt), qy = zb - bh - q / 2 + q * 0.06
  const fotoQ = !!g.photo && r.chance(0.6)
  if (fotoQ) photoIn(g, 'foto', polyD(rrectPts(qx, qy, q, q, q * 0.28, tilt)), { x: qx - q * 0.72, y: qy - q * 0.72, w: q * 1.44, h: q * 1.44 })
  else put(g, { kind: 'path', name: 'forma_quadrotto', d: polyD(rrectPts(qx, qy, q, q, q * 0.28, tilt)), fill: c2 })
  // mezza cupola appoggiata a terra di lato
  const dr = bh * 1.25, dcx = cxz - bw * 0.4 * Math.sign(tilt)
  const dome: Pt[] = Array.from({ length: 25 }, (_, i) => [dcx + Math.cos(Math.PI + (Math.PI * i) / 24) * dr, zb - bh + Math.sin(Math.PI + (Math.PI * i) / 24) * dr] as Pt)
  put(g, { kind: 'path', name: 'forma_cupola', d: polyD(dome), fill: c3 })
  // la palla in cima
  const br = q * 0.36
  const bcx = qx - Math.sign(tilt) * q * 0.12, bcy = qy - q / 2 - br * 0.92
  if (!fotoQ && g.photo) photo(g, 'foto', { x: bcx - br * 1.25, y: bcy - br * 1.25 - br * 0.25, w: br * 2.5, h: br * 2.5 }, { shape: 'circle' })
  else put(g, { kind: 'circle', name: 'forma_palla', cx: bcx, cy: bcy, r: br, fill: c4 === P.fg && fotoQ ? c4 : c1 })
  // pillole piccole che rotolano
  if (k.densita > 0.4) put(g, { kind: 'rect', name: 'forma_pillola', x: cxz + bw * 0.28, y: zb - bh - bh * 0.5, w: bw * 0.2, h: bh * 0.5, r: bh * 0.25, fill: c4, angle: -tilt * 0.6 })
  void baseY
  // titolo ad arco sopra la pila
  const top = bcy - br * (fotoQ ? 1 : 1.3) - U(g, 30)
  const avail = top - zy
  const R = zw * (0.62 + 0.25 * (1 - k.energia))
  const span = Math.min(zw * 0.96, 2 * R * 0.95)
  const tcol = (li: number, _i: number, ch: string) => { void ch; return li === 1 && contrast(c1, P.bg) >= 2.6 ? c1 : P.fg }
  const res = titoloCurvo(g, lines, (i, off) => {
    const rr = R - off
    const half = Math.asin(Math.min(0.99, span / 2 / R))
    const ccy = zy + avail * 0.12 + R + (avail - 0) * 0
    return curva(t => { const a = -Math.PI / 2 - half + 2 * half * t; return [cxz + Math.cos(a) * rr, ccy + Math.sin(a) * rr] })
  }, Math.min(220 + 60 * k.scala, avail * 0.55) * g.u, tcol, k.scala * 0.8 + 0.2)
  if (!res) return null
  // i testi del titolo non devono scendere sulla pila
  const tb = textBoxes(g)
  if (tb.some(b => b.y + b.h > top + U(g, 20))) return null
  if (hd.brand) putLab(g, 'brand', hd.brand, m, T, P.fg)
  if (hd.kick) putLab(g, 'occhiello', hd.kick, W - m - hd.kick.w, T, ink(g).acc)
  if (side) info.place(W - m - colW, B - info.h, ink(g))
  else info.place((W - info.w) / 2, B - info.h, ink(g), 'center')
  return finish(g, 'deformato', 'Forme deformate', { specchio: false })
}

/** Variante 2: una pillola enorme sdraiata in diagonale col titolo dentro, lungo l'asse; le altre forme ci si appoggiano. */
function deformatoSdraiato(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const side = g.landscape
  const [c1, c2, c3] = defCols(g)
  const hd = header(g, W * 0.42)
  const info = infoBlock(g, side ? W * 0.4 : W * 0.62, { kicker: false })
  const zy = T + hd.h + U(g, 40), zb = B - info.h - U(g, 50)
  const deg = -(8 + 16 * k.energia) * (r.chance(0.5) ? 1 : -1)
  const a = deg * D2R
  const font = heavy(g)
  const lines = (words(g.c.title).length > 2 ? stackLines(g.c.title, 2) : [g.c.title]).slice(0, 2).map(l => up(l, true))
  // lunghezza utile dell'asse dentro i margini
  const cx = W / 2, cy = (zy + zb) / 2
  const halfLen = Math.min((W / 2 - m) / Math.abs(Math.cos(a)), ((zb - zy) / 2) / Math.max(0.2, Math.abs(Math.sin(a))))
  const L = halfLen * 2
  const bulge = 0.3 + 0.5 * k.scala
  let size = Math.min(...lines.map(l => (100 * g.u * (L * 0.8)) / advance(l, font, 100 * g.u, bulge, 0.01)))
  size = Math.min(size, U(g, 230))
  const lead = size * (1 + 0.42 * bulge)
  const th = lead * lines.length + size * 0.6
  if (size < 56 * g.u) return null
  // la pillola (rettangolo arrotondato ruotato: il controllo la legge), più lunga del testo
  const pl = Math.max(L * 1.15, W * 1.1), ph = th
  const px = cx - (pl / 2) * Math.cos(a) + (ph / 2) * Math.sin(a), py = cy - (pl / 2) * Math.sin(a) - (ph / 2) * Math.cos(a)
  // forme appoggiate: palla con la foto sopra, cupola sotto
  const nxv = Math.sin(a), nyv = -Math.cos(a)
  const br = Math.min(W, H) * (0.16 + 0.04 * k.densita)
  const e1 = 0.3 * (r.chance(0.5) ? 1 : -1)
  const bcx = cx + Math.cos(a) * L * e1 + nxv * (ph / 2 + br * 0.82), bcy = cy + Math.sin(a) * L * e1 + nyv * (ph / 2 + br * 0.82)
  const okBall = bcy - br > zy - U(g, 10) && bcy + br < zb + br * 0.8
  if (okBall) {
    if (g.photo) photo(g, 'foto', { x: bcx - br, y: bcy - br, w: 2 * br, h: 2 * br }, { shape: 'circle' })
    else put(g, { kind: 'circle', name: 'forma_palla', cx: bcx, cy: bcy, r: br, fill: c2 })
  }
  const dcx = cx - Math.cos(a) * L * e1 * 1.2 - nxv * ph * 0.5, dcy = cy - Math.sin(a) * L * e1 * 1.2 - nyv * ph * 0.5
  put(g, { kind: 'path', name: 'forma_cupola', d: polyD(rrectPts(dcx, dcy, ph * 1.6, ph * 1.3, ph * 0.6, deg)), fill: c3 })
  put(g, { kind: 'rect', name: 'pillola', x: px, y: py, w: pl, h: ph, r: ph / 2, fill: c1, angle: deg })
  if (k.densita > 0.45) {
    const sx = cx + Math.cos(a) * L * 0.42 - nxv * (ph / 2 + U(g, 40)), sy = cy + Math.sin(a) * L * 0.42 - nyv * (ph / 2 + U(g, 40))
    put(g, { kind: 'rect', name: 'forma_pillola', x: sx - U(g, 90), y: sy - U(g, 28), w: U(g, 180), h: U(g, 56), r: U(g, 28), fill: c2, angle: deg + 4 })
  }
  // titolo dentro la pillola, lungo l'asse
  const tc = su(g, c1, 3)
  let base = 0
  lines.forEach((l, i) => {
    const off = (i - (lines.length - 1) / 2) * lead + size * 0.42 * (1 + 0.42 * bulge) - size * 0.1
    const ox = -nxv * off * -1, oy = -nyv * off * -1
    const c = curva(t => [cx + Math.cos(a) * (t - 0.5) * L * 0.9 - ox, cy + Math.sin(a) * (t - 0.5) * L * 0.9 - oy], 8)
    lettere(g, { line: l, font, size, curve: c, color: () => tc, bulge, tracking: 0.01, base })
    base += l.length + 1
  })
  if (hd.brand) putLab(g, 'brand', hd.brand, m, T, P.fg)
  if (hd.kick) putLab(g, 'occhiello', hd.kick, W - m - hd.kick.w, T, ink(g).acc)
  info.place(m, B - info.h, ink(g))
  // le forme non devono finire sui testi delle informazioni
  const ib = textBoxes(g).filter((_, i) => i >= 0)
  void ib
  return finish(g, 'deformato', 'Forme deformate', { specchio: false })
}

/** Variante 3: la foto gonfia in un quadrotto morbido; il titolo sorride sotto, le pillole si appoggiano. */
function deformatoGonfio(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const side = g.landscape
  const [c1, c2, c3] = defCols(g)
  const hd = header(g, W * 0.42)
  const colW = side ? W * 0.44 : W - 2 * m
  const info = infoBlock(g, side ? colW : W * 0.64, { kicker: false })
  const lines = (words(g.c.title).length > 3 || g.c.title.length > 16 ? stackLines(g.c.title, 2) : [g.c.title]).slice(0, 2)
  const zy = T + hd.h + U(g, 36)
  const tilt = (3 + 9 * k.energia) * (r.chance(0.5) ? 1 : -1)
  // la forma gonfia
  const q = side ? Math.min(H * 0.66, W * 0.4) : Math.min(W * (0.62 + 0.08 * k.scala), (B - zy) * 0.46)
  const qcx = side ? m + q * 0.62 : W / 2, qcy = side ? H / 2 : zy + q * 0.56
  put(g, { kind: 'path', name: 'ombra_forma', d: polyD(rrectPts(qcx + U(g, 22), qcy + U(g, 26), q, q * 0.9, q * 0.34, tilt)), fill: c2 })
  photoIn(g, 'foto', polyD(rrectPts(qcx, qcy, q, q * 0.9, q * 0.34, tilt)), { x: qcx - q * 0.7, y: qcy - q * 0.7, w: q * 1.4, h: q * 1.4 })
  // pillole che si appoggiano ai lati
  put(g, { kind: 'rect', name: 'forma_pillola', x: qcx + q * 0.32, y: qcy + q * 0.36, w: q * 0.42, h: q * 0.14, r: q * 0.07, fill: c1, angle: -tilt * 1.6 })
  put(g, { kind: 'circle', name: 'forma_palla', cx: qcx - q * 0.5, cy: qcy - q * 0.38, r: q * 0.12, fill: c3 })
  if (k.densita > 0.4) put(g, { kind: 'path', name: 'forma_cupola', d: polyD(Array.from({ length: 19 }, (_, i) => [qcx - q * 0.48 + Math.cos(Math.PI + Math.PI * i / 18) * q * 0.16, qcy + q * 0.46 + Math.sin(Math.PI + Math.PI * i / 18) * q * 0.16] as Pt)), fill: c1 })
  // titolo che sorride sotto (o accanto) alla forma
  const tx0 = side ? W - m - colW : m, tw = colW
  const ty0 = side ? T + hd.h + U(g, 40) : qcy + q * 0.6 + U(g, 40)
  const tyMax = side ? B - info.h - U(g, 50) : B - info.h - U(g, 50)
  const avail = tyMax - ty0
  if (avail < U(g, 140)) return null
  const sag = Math.min(avail * 0.25, U(g, 60)) * (0.4 + k.energia)
  const tcol = (li: number, i: number) => (li === 0 && i === 0 && contrast(c1, P.bg) >= 2.6 ? c1 : P.fg)
  const maxS = Math.min(210 + 60 * k.scala, (avail - sag) / (lines.length * 1.4)) * g.u
  const res = titoloCurvo(g, lines, (_i, off) => curva(t => [tx0 + tw * t, ty0 + off + maxS * 0.9 + sag * Math.sin(Math.PI * t) * 1]), maxS, tcol, 0.25 + 0.5 * k.scala)
  if (!res) return null
  const tb = textBoxes(g)
  if (tb.some(b => b.y + b.h > tyMax + U(g, 10))) return null
  if (hd.brand) putLab(g, 'brand', hd.brand, m, T, P.fg)
  if (hd.kick) putLab(g, 'occhiello', hd.kick, W - m - hd.kick.w, T, ink(g).acc)
  if (side) info.place(W - m - colW, B - info.h, ink(g))
  else info.place((W - info.w) / 2, B - info.h, ink(g), 'center')
  return finish(g, 'deformato', 'Forme deformate', { specchio: false })
}

/* ═══ Op-art ════════════════════════════════════════════════════════════ */
/** Fasce piene tra curve parallele che si aprono attorno a un riquadro calmo (campo di forza). */
function campoDiForza(g: G, calm: Box, o: { n: number; amp: number; freq: number; phase: number; vertical?: boolean }) {
  const { W, H } = g
  const along = o.vertical ? H : W, across = o.vertical ? W : H
  const c0 = o.vertical ? calm.y : calm.x, c1 = o.vertical ? calm.y + calm.h : calm.x + calm.w
  const m0 = o.vertical ? calm.x : calm.y, m1 = o.vertical ? calm.x + calm.w : calm.y + calm.h
  const mc = (m0 + m1) / 2, A = (m1 - m0) / 2
  const fall = Math.max((c1 - c0) * 0.45, U(g, 160))
  const L = Math.max(across * 0.35, A * 1.7)
  const sp = across / o.n
  const N = 120
  const gx = (x: number) => (x >= c0 && x <= c1 ? 1 : x < c0 ? Math.max(0, 0.5 + 0.5 * Math.cos(Math.min(Math.PI, ((c0 - x) / fall) * Math.PI))) : Math.max(0, 0.5 + 0.5 * Math.cos(Math.min(Math.PI, ((x - c1) / fall) * Math.PI))))
  const lineAt = (k: number): Pt[] => {
    const y0 = -sp + k * sp
    const dy = y0 - mc, sg = dy < 0 ? -1 : 1, ad = Math.abs(dy)
    return Array.from({ length: N + 1 }, (_, i) => {
      const x = -20 + ((along + 40) * i) / N
      const gg = gx(x)
      let y = mc + sg * (ad + A * gg * Math.exp(-ad / L))
      y += o.amp * Math.sin(x * o.freq + o.phase + k * 0.12) * (1 - gg * 0.85)
      return o.vertical ? [y, x] as Pt : [x, y] as Pt
    })
  }
  let d = ''
  for (let k = 0; k < o.n + 2; k += 2) {
    const a = lineAt(k), b = lineAt(k + 1).reverse()
    d += polyD([...a, ...b]) + ' '
  }
  return d
}

/** Variante 1: linee parallele che si aprono attorno al testo come un campo di forza; la foto si vede dentro le fasce. */
function ondeCampo(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const side = g.landscape
  const colW = side ? W * 0.44 : W - 2 * m
  const info = infoBlock(g, colW * (side ? 1 : 0.8), { kicker: false })
  const hd = header(g, colW)
  const t = display(g, g.c.title, colW, side ? H * 0.42 : H * 0.24, 170 + 60 * k.scala, 46, 3)
  if (!t) return null
  const blockH = hd.h + U(g, 26) + t.h + U(g, 34) + info.h
  const bx = side ? (r.chance(0.5) ? m : W - m - colW) : m
  const by = Math.max(T, Math.min(B - blockH, T + (B - T - blockH) * r.range(0.35, 0.7)))
  const pad = U(g, 34)
  const calm = { x: bx - pad, y: by - pad, w: (side ? colW : W - 2 * m) + 2 * pad, h: blockH + 2 * pad }
  const n = 2 * Math.round((26 + k.densita * 26) / 2)
  const vertical = g.format === 'storia' && r.chance(0.3)
  const d = campoDiForza(g, calm, { n, amp: U(g, 6 + 26 * k.energia), freq: (0.004 + 0.006 * k.energia) / g.u, phase: r.range(0, 6), vertical })
  const ink1 = darker(P.fg, P.bg) === P.fg ? P.fg : P.fg
  if (g.photo && r.chance(0.65)) {
    // la foto vista attraverso le fasce
    photo(g, 'foto', { x: 0, y: 0, w: W, h: H }, { mask: d })
  } else put(g, { kind: 'path', name: 'campo', d, fill: ink1 })
  // seconda trama fuori registro (moiré) nell'accento
  if (k.sovrastampa > 0.5) put(g, { kind: 'path', name: 'campo_registro', d: campoDiForza(g, calm, { n: n + 2, amp: U(g, 6 + 26 * k.energia), freq: (0.0045 + 0.006 * k.energia) / g.u, phase: r.range(0, 6), vertical }), fill: inks(g).a1, blend: over(g), opacity: 0.85 })
  // il riquadro calmo è libero: un velo del colore di fondo ne fa la base sicura del testo
  put(g, { kind: 'rect', name: 'velo_calmo', ...grow(calm, -pad * 0.6), fill: P.bg })
  let y = by
  if (hd.brand) putLab(g, 'brand', hd.brand, bx, y, P.fg)
  if (hd.kick && (!hd.brand || hd.brand.w + hd.kick.w + U(g, 40) < colW)) putLab(g, 'occhiello', hd.kick, bx + colW - hd.kick.w, y, ink(g).acc)
  y += hd.h + U(g, 26)
  putDisplay(g, 'titolo', t, bx, y, P.fg, 'left', colW)
  y += t.h + U(g, 34)
  info.place(bx, y, ink(g))
  return finish(g, 'onde', 'Op-art')
}

/** Variante 2: anelli concentrici deformati attorno alla foto tonda, una seconda serie sfalsata in moiré; testo su una fascia calma. */
function ondeAnelli(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const side = g.landscape
  const { a1 } = inks(g)
  const colW = side ? W * 0.4 : W - 2 * m
  const hd = header(g, colW)
  const info = infoBlock(g, side ? colW : colW * 0.62, { kicker: false })
  const t = display(g, g.c.title, side ? colW : colW * (info.h > 0 ? 1 : 1), side ? H * 0.4 : H * 0.18, 150 + 50 * k.scala, 44, side ? 3 : 2)
  if (!t) return null
  const pad = U(g, 40)
  // fascia calma: in basso (verticale) o a destra (orizzontale)
  const bandH = side ? H : hd.h + U(g, 24) + t.h + U(g, 30) + info.h + 2 * pad
  const band = side ? { x: W - colW - 2 * pad, y: 0, w: colW + 2 * pad, h: H } : { x: 0, y: Math.min(B + pad - bandH, H - bandH), w: W, h: bandH }
  const cx = side ? (W - band.w) / 2 : W / 2, cy = side ? H / 2 : Math.max(T, band.y) / 2 + U(g, 20)
  const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy))
  const r0 = Math.min(side ? (W - band.w) * 0.2 : W * 0.2, (side ? H : band.y) * 0.22)
  const n = 14 + Math.round(k.densita * 14)
  const lobes = r.pick([3, 4, 5, 6])
  const ringsD = (ox: number, oy: number, ph: number) => {
    let d = ''
    const st = (R - r0) / n
    for (let i = 0; i < n; i += 2) {
      const ra = r0 + st * (i + 0.5), rb = r0 + st * (i + 1.5)
      const amp = (st * 0.45) * (0.3 + k.energia) * Math.min(1, i / 4)
      const ring = (rr: number, rev: boolean) => { const pts: Pt[] = []; for (let j = 0; j <= 96; j++) { const a = (rev ? -1 : 1) * (j / 96) * Math.PI * 2; const q = rr + amp * Math.sin(a * lobes + ph + i * 0.2); pts.push([cx + ox + Math.cos(a) * q, cy + oy + Math.sin(a) * q]) } return pts }
      d += polyD(ring(rb, false)) + ' ' + polyD(ring(ra, true)) + ' '
    }
    return d
  }
  put(g, { kind: 'path', name: 'anelli', d: ringsD(0, 0, r.range(0, 6)), fill: P.fg })
  if (k.sovrastampa > 0.3) put(g, { kind: 'path', name: 'anelli_moire', d: ringsD(U(g, 16 + 30 * k.sovrastampa), -U(g, 12), r.range(0, 6)), fill: a1, blend: over(g), opacity: 0.9 })
  // la foto al centro, con un anello d'accento
  put(g, { kind: 'circle', name: 'alone_foto', cx, cy, r: r0 * 1.08, fill: a1 })
  photo(g, 'foto', { x: cx - r0, y: cy - r0, w: 2 * r0, h: 2 * r0 }, { shape: 'circle' })
  // la fascia calma
  put(g, { kind: 'rect', name: 'fascia_calma', ...band, fill: P.bg })
  put(g, { kind: 'rect', name: 'filo_fascia', x: side ? band.x : 0, y: side ? 0 : band.y, w: side ? U(g, 10) : W, h: side ? H : U(g, 10), fill: P.fg })
  const x = side ? band.x + pad : m
  let y = side ? Math.max(T, (H - (hd.h + U(g, 24) + t.h + U(g, 30) + info.h)) / 2) : band.y + pad + U(g, 6)
  if (hd.brand) putLab(g, 'brand', hd.brand, x, y, P.fg)
  if (hd.kick && !side) putLab(g, 'occhiello', hd.kick, W - m - hd.kick.w, y, ink(g).acc)
  y += hd.h + U(g, 24)
  putDisplay(g, 'titolo', t, x, y, P.fg, 'left', colW)
  y += t.h + U(g, 30)
  info.place(x, y, ink(g))
  return finish(g, 'onde', 'Op-art')
}

/** Variante 3: rilievo di linee: ogni riga si solleva dove la foto è chiara (senza foto, dove pulsa un campo); il testo sopra o sotto. */
function ondeRilievo(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const side = g.landscape
  const colW = side ? W * 0.38 : W - 2 * m
  const hd = header(g, colW)
  const info = infoBlock(g, side ? colW : colW * 0.62, { kicker: false })
  const t = display(g, g.c.title, colW, side ? H * 0.42 : H * 0.2, 160 + 50 * k.scala, 44, 3)
  if (!t) return null
  const textH = hd.h + U(g, 24) + t.h + U(g, 30) + info.h
  const topText = !side && r.chance(0.5)
  const zone = side ? { x: 0, y: m, w: W - colW - m * 2, h: H - 2 * m } : topText ? { x: 0, y: T + textH + U(g, 50), w: W, h: B - (T + textH + U(g, 50)) + (H - B) * 0.6 } : { x: 0, y: m * 0.5, w: W, h: B - textH - U(g, 60) - m * 0.5 }
  if (zone.h < H * 0.3) return null
  const N = 22 + Math.round(k.densita * 10)
  const amp = zone.h / N * (2.4 + 2.4 * k.energia)
  const lumAt = (x: number, y: number) => {
    const px = g.pix
    if (px && g.photo) {
      const sc = Math.max(zone.w / px.w, zone.h / px.h)
      const sx = Math.round((px.w - zone.w / sc) / 2 + (x - zone.x) / sc), sy = Math.round((px.h - zone.h / sc) / 2 + (y - zone.y) / sc)
      if (sx < 0 || sy < 0 || sx >= px.w || sy >= px.h) return 0
      const o = (sy * px.w + sx) * 4
      return (0.3 * px.data[o] + 0.59 * px.data[o + 1] + 0.11 * px.data[o + 2]) / 255
    }
    const dx = (x - zone.x) / zone.w - 0.5, dy = (y - zone.y) / zone.h - 0.5
    return Math.exp(-(dx * dx + dy * dy) * 9) * (0.6 + 0.4 * Math.sin(x * 0.02 / g.u + y * 0.01 / g.u))
  }
  const ridgeBg = P.bg, line = P.fg
  const { a1 } = inks(g)
  const hl = r.int(Math.floor(N * 0.3), Math.floor(N * 0.7))
  for (let i = 0; i < N; i++) {
    const y0 = zone.y + amp * 0.6 + ((zone.h - amp * 0.6) * (i + 1)) / (N + 0.5)
    const pts: Pt[] = []
    for (let j = 0; j <= 90; j++) {
      const x = zone.x - 10 + ((zone.w + 20) * j) / 90
      const edge = Math.sin(Math.PI * (j / 90)) ** 1.5
      pts.push([x, y0 - amp * lumAt(x, y0) * edge])
    }
    const poly = [...pts, [zone.x + zone.w + 10, y0 + amp * 0.2] as Pt, [zone.x - 10, y0 + amp * 0.2] as Pt]
    put(g, { kind: 'path', name: 'cresta', d: polyD(poly), fill: ridgeBg })
    put(g, { kind: 'path', name: 'cresta_linea', d: polyD(pts, false), fill: 'transparent', stroke: i === hl ? a1 : line, sw: U(g, i === hl ? 5 : 2.4) })
  }
  // testo nella zona libera
  const x = side ? W - m - colW : m
  let y = side ? Math.max(T, (H - textH) / 2) : topText ? T : B - textH
  if (hd.brand) putLab(g, 'brand', hd.brand, x, y, P.fg)
  if (hd.kick && (!hd.brand || hd.brand.w + hd.kick.w + U(g, 40) < colW)) putLab(g, 'occhiello', hd.kick, x + colW - hd.kick.w, y, ink(g).acc)
  y += hd.h + U(g, 24)
  putDisplay(g, 'titolo', t, x, y, P.fg, 'left', colW)
  y += t.h + U(g, 30)
  info.place(x, y, ink(g))
  if (k.densita > 0.5) regMark(g, side ? W - m * 0.6 : W - m * 0.6, side ? m * 0.6 : (topText ? H - m * 0.6 : m * 0.6), U(g, 9), alpha(P.fg, 0.7))
  return finish(g, 'onde', 'Op-art')
}

/* ═══ Piramide ══════════════════════════════════════════════════════════ */
/** Righe del titolo con corpi che crescono: la più lunga in basso regge la larghezza. */
function cuneoRighe(g: G, maxW: number, maxH: number, maxLines: number, widths?: (i: number, n: number) => number) {
  const font = heavy(g), tr = -0.01
  const lines = stackLines(up(g.c.title, true), maxLines)
  const n = lines.length
  const ratio = n > 1 ? Math.max(0.62, 0.48 ** (1 / (n - 1))) : 1
  // corpi: crescono di `ratio` riga dopo riga, la più grande è limitata dalla larghezza
  let big = Infinity
  lines.forEach((l, i) => { const w = widths ? widths(i, n) : maxW; big = Math.min(big, sizeForWidth(l, font, w, tr) / ratio ** (n - 1 - i)) })
  big = Math.min(big, U(g, 300))
  let sizes = lines.map((_, i) => big * ratio ** (n - 1 - i))
  const h = (z: number[]) => z.reduce((a, s) => a + s * 0.98, 0) + z[z.length - 1] * 0.15
  if (h(sizes) > maxH) { const f = maxH / h(sizes); sizes = sizes.map(s => s * f) }
  if (sizes[0] < Math.max(40 * g.u, g.sc.attacco * 0.9)) return null
  return { lines, sizes, font, tr, ws: lines.map((l, i) => lineWidth(l, font, sizes[i], tr)) }
}

/** Variante 1 e 3: cuneo di barre che crescono (dritto o lungo una diagonale), foto in un triangolo, filetti obliqui. */
function piramideCuneo(g: G, diag: boolean): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const side = g.landscape
  const { a1, a2 } = inks(g)
  const hd = header(g, W * 0.45)
  const colW = side ? W * 0.5 : W - 2 * m
  const info = infoBlock(g, side ? W * 0.38 : (W - 2 * m) * 0.62, { kicker: false })
  const ang = diag ? -(8 + 12 * k.energia) : 0
  const zoneTop = T + hd.h + U(g, 50)
  const zoneH = (side ? B - info.h - U(g, 40) : B - info.h - U(g, 50)) - zoneTop
  const cr = cuneoRighe(g, colW * 0.84, zoneH * (side ? 0.95 : 0.62), 4)
  if (!cr) return null
  const padX = U(g, 26), padY = U(g, 16)
  const barH = cr.sizes.map(s => s * 1.13 * 0.86 + 2 * padY)
  const stackH = barH.reduce((a, b) => a + b, 0)
  const sy = side ? zoneTop + (zoneH - stackH) * 0.5 : zoneTop + zoneH - stackH
  // foto nel triangolo: la punta verso il cuneo
  const triW = side ? W * 0.48 : W * (0.5 + 0.1 * k.scala)
  const triTop = side ? m * 0.4 : zoneTop - U(g, 30)
  const triBot = side ? H - m * 0.4 : sy - U(g, 30)
  if (triBot - triTop < H * 0.18 && !side) return null
  const tri: Pt[] = side ? [[W + U(g, 4), triTop], [W + U(g, 4), triBot], [W - triW, (triTop + triBot) / 2]] : [[W + U(g, 4), triTop], [W + U(g, 4), triBot], [W - triW, triBot]]
  const triP = rot(tri, W, (triTop + triBot) / 2, diag ? ang * 0.5 : 0)
  put(g, { kind: 'path', name: 'ombra_triangolo', d: polyD(triP.map(([x, y]) => [x - U(g, 26), y + U(g, 18)] as Pt)), fill: a1, blend: k.sovrastampa > 0.4 ? over(g) : undefined })
  photoIn(g, 'foto', polyD(triP), bboxOf(triP))
  // filetti obliqui paralleli all'ipotenusa
  const [pA, , pC] = triP
  const hx = pC[0] - pA[0], hy = pC[1] - pA[1], hl = Math.hypot(hx, hy)
  const nl = 3 + Math.round(k.densita * 4)
  for (let i = 1; i <= nl; i++) {
    const off = U(g, 22) * i * (1 + i * 0.15)
    const ox = (-hy / hl) * off, oy = (hx / hl) * off
    const ext = hl * 0.6
    put(g, { kind: 'line', name: 'filetto_obliquo', x1: pA[0] + ox - (hx / hl) * ext * 0.2, y1: pA[1] + oy - (hy / hl) * ext * 0.2, x2: pC[0] + ox + (hx / hl) * ext, y2: pC[1] + oy + (hy / hl) * ext, color: i % 3 === 0 ? a2 : P.fg, width: Math.max(1.5, (i === 1 ? 4 : 2) * g.u) })
  }
  // il cuneo di barre: ognuna lunga quanto la sua parola, colori alternati
  const barC = [P.fg, a1]
  let y = sy
  const ox = 0, oy = sy
  cr.lines.forEach((l, i) => {
    const bw = m + cr.ws[i] + 2 * padX
    const fill = barC[i % 2]
    // in diagonale tutto ruota attorno all'angolo in alto a sinistra della pila
    const p = rot([[0, y]], ox, oy, ang)[0]
    put(g, { kind: 'rect', name: 'barra', x: p[0] - U(g, 2), y: p[1], w: bw + U(g, 2), h: barH[i], fill, angle: ang || undefined })
    const tp = rot([[m, y + padY - cr.sizes[i] * 0.13 * 0.5]], ox, oy, ang)[0]
    txt(g, { name: `titolo#${i}`, lines: [l], font: cr.font, size: cr.sizes[i], x: tp[0], y: tp[1], color: su(g, fill, 3), leading: 0.86, tracking: cr.tr, angle: ang || undefined })
    y += barH[i]
  })
  if (hd.brand) putLab(g, 'brand', hd.brand, m, T, P.fg)
  if (hd.kick) putLab(g, 'occhiello', hd.kick, m + (hd.brand ? hd.brand.w + U(g, 40) : 0), T, ink(g).acc)
  // numero grande sulla punta del triangolo
  const num = g.c.numero?.trim()
  if (num && !side) {
    const ns = Math.min(sizeForWidth(num, heavy(g), W * 0.28), U(g, 150))
    const nw = lineWidth(num, heavy(g), ns)
    const nx = W - m - nw, ny = T
    if (!textBoxes(g, U(g, 10)).some(b => hitB(b, { x: nx, y: ny, w: nw, h: ns * 1.13 }))) txt(g, { name: 'numero', lines: [num], font: heavy(g), size: ns, x: nx, y: ny, color: ink(g).acc, leading: 1 })
  }
  const iy = B - info.h
  const dy = diag ? Math.max(0, Math.sin(-ang * D2R) * 0) : 0
  info.place(m, iy + dy, ink(g))
  return finish(g, 'piramide', 'Piramide', { specchio: !diag })
}

/** Variante 2: ziggurat centrato: righe del titolo su barre che crescono verso il basso, triangolo rovesciato con la foto che punta la cima. */
function piramideZiggurat(g: G): Scene | null {
  const { W, H, m, T, B, P, k } = g
  const side = g.landscape
  const { a1, a2 } = inks(g)
  const hd = header(g, W * 0.4)
  const info = infoBlock(g, side ? W * 0.3 : W * 0.66, { kicker: false })
  const cx = side ? W * 0.62 : W / 2
  const zw = side ? W * 0.68 : W - 2 * m
  const zoneTop = side ? T : T + hd.h + U(g, 40)
  const zb = B - info.h - U(g, 44)
  const cr = cuneoRighe(g, zw * 0.86, (zb - zoneTop) * 0.56, 4, (i, n) => zw * (0.86 - (n - 1 - i) * 0.0))
  if (!cr) return null
  const padX = U(g, 30), padY = U(g, 14)
  const barH = cr.sizes.map(s => s * 1.13 * 0.86 + 2 * padY)
  const stackH = barH.reduce((a, b) => a + b, 0)
  const sy = zb - stackH
  // le barre: larghezza = parola + margini, la successiva sempre più larga (gradoni)
  let prevW = 0
  const bws = cr.ws.map(w => { const bw = Math.max(w + 2 * padX, prevW + U(g, 60)); prevW = bw; return Math.min(bw, side ? zw : W) })
  // triangolo rovesciato con la foto: base in alto, punta sulla prima barra
  const tb = zoneTop - (side ? m * 0.5 : U(g, 10))
  const tw = Math.min(side ? zw * 0.9 : W * (0.86 + 0.1 * k.scala), (sy - tb) * 1.4)
  if (sy - tb < H * 0.16) return null
  const tri: Pt[] = [[cx - tw / 2, tb], [cx + tw / 2, tb], [cx, sy - U(g, 6)]]
  if (k.sovrastampa > 0.3) put(g, { kind: 'path', name: 'registro_triangolo', d: polyD(tri.map(([x, y]) => [x + U(g, 20), y - U(g, 14)] as Pt)), fill: a2, blend: over(g) })
  photoIn(g, 'foto', polyD(tri), bboxOf(tri))
  // spigoli della piramide che escono dalla tavola
  const last = bws[bws.length - 1]
  for (const s of [-1, 1]) {
    const x0 = cx + s * bws[0] / 2, y0 = sy, x1 = cx + s * last / 2, y1 = zb
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1
    put(g, { kind: 'line', name: 'spigolo', x1: x0 - (dx / L) * H * 0.2, y1: y0 - (dy / L) * H * 0.2, x2: x1 + (dx / L) * H, y2: y1 + (dy / L) * H, color: alpha(P.fg, 0.55), width: Math.max(1.5, 2 * g.u) })
  }
  let y = sy
  cr.lines.forEach((l, i) => {
    const bw = bws[i], fill = i % 2 ? a1 : P.fg
    put(g, { kind: 'rect', name: 'gradone', x: cx - bw / 2, y, w: bw, h: barH[i], fill })
    txt(g, { name: `titolo#${i}`, lines: [l], font: cr.font, size: cr.sizes[i], x: cx - cr.ws[i] / 2, y: y + padY - cr.sizes[i] * 0.13 * 0.5, w: cr.ws[i], align: 'center', color: su(g, fill, 3), leading: 0.86, tracking: cr.tr })
    y += barH[i]
  })
  if (hd.brand) putLab(g, 'brand', hd.brand, side ? m : (W - hd.brand.w) / 2, side ? T : T, P.fg)
  if (side) {
    if (hd.kick) putLab(g, 'occhiello', hd.kick, m, T + hd.h + U(g, 16), ink(g).acc)
    info.place(m, B - info.h, ink(g))
  } else info.place((W - info.w) / 2, B - info.h, ink(g), 'center')
  return finish(g, 'piramide', 'Piramide')
}

/* ── i sistemi ────────────────────────────────────────────────────────── */
export const SYSTEMS_C: Record<'bauhaus' | 'memphis' | 'bersaglio' | 'bande' | 'arco' | 'deformato' | 'onde' | 'piramide', Sistema> = {
  bauhaus: g => prova(g, [bauhausForme, bauhausTessere]),
  memphis: g => prova(g, [memphisEsplosione, memphisCornice, memphisGriglia]),
  bersaglio: g => prova(g, [bersaglioCoccarda, bersaglioRadar, bersaglioMirino]),
  bande: g => prova(g, [x => bandeCon(x, 0), x => bandeCon(x, 1), x => bandeCon(x, 2)]),
  arco: g => prova(g, [arcoFinestra, arcoLoggia, arcoPortale]),
  deformato: g => prova(g, [deformatoPila, deformatoSdraiato, deformatoGonfio]),
  onde: g => prova(g, [ondeCampo, ondeAnelli, ondeRilievo]),
  piramide: g => prova(g, [x => piramideCuneo(x, false), piramideZiggurat, x => piramideCuneo(x, true)]),
}

/* segni a mano per le forme "mano" (disponibili alle varianti che li vogliono) */
export const _segni = { wobblyPath, keyword, mix }
