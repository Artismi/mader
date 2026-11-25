/**
 * Ornamenti generativi: pezzi grafici "di spessore" disegnati in vettoriale,
 * pensati per riempire una zona della tavola con un'idea visiva vera.
 * Ogni ornamento usa la palette della tavola, è deterministico (stesso seme,
 * stesso disegno) e produce pochi oggetti modificabili (un tracciato per colore).
 */
import * as fabric from 'fabric'
import { createNoise2D } from 'simplex-noise'
import { Delaunay } from 'd3-delaunay'
import rough from 'roughjs'
import { interpolate, formatHex, oklch, parse } from 'culori'
import { svgPath as blobPath } from 'blobs/v2'
import type { Palette } from '@/lib/design/compose-spec'
import type { FxEntry } from '../fx/catalog'

export type FxMaker = (id: string, variant?: string, p?: Record<string, number | string>) => FxEntry | null
export interface OrnCtx { w: number; h: number; pal: Palette; ink: string; s: number; seed: number; fx: FxMaker }
export type Piece = { o: fabric.FabricObject & { fx?: FxEntry[] }; role: string }

/* ───────── utilità ───────── */
function rng(seed: number) {
  let a = seed >>> 0
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const mix = (a: string, b: string, t: number) => formatHex(interpolate([a, b], 'oklch')(Math.max(0, Math.min(1, t)))) ?? a
const shade = (c: string, dl: number) => { const o = oklch(parse(c)); if (!o) return c; return formatHex({ ...o, l: Math.max(0, Math.min(1, o.l + dl)) }) ?? c }
const f = (n: number) => Math.round(n * 10) / 10
const path = (d: string, opts: Partial<fabric.PathProps>) => new fabric.Path(d, { strokeWidth: 0, objectCaching: true, ...opts })
const circleD = (cx: number, cy: number, r: number) => `M ${f(cx - r)} ${f(cy)} a ${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a ${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0 Z`

/* ───────── ornamenti ───────── */
type Maker = (c: OrnCtx) => Piece[]

/** sole nascente: raggi a ventaglio e dischi concentrici */
const raggiera: Maker = ({ w, h, pal, ink }) => {
  const cx = w / 2, cy = h * 0.98, R = Math.hypot(w, h)
  const n = 36
  let d = ''
  for (let i = 0; i < n; i += 2) {
    const a0 = Math.PI + (i / n) * Math.PI, a1 = Math.PI + ((i + 1) / n) * Math.PI
    d += `M ${f(cx)} ${f(cy)} L ${f(cx + Math.cos(a0) * R)} ${f(cy + Math.sin(a0) * R)} L ${f(cx + Math.cos(a1) * R)} ${f(cy + Math.sin(a1) * R)} Z `
  }
  const r0 = Math.min(w, h) * 0.42
  return [
    { o: path(d, { left: 0, top: 0, fill: mix(pal.accent, pal.bg, 0.55), opacity: 0.9 }), role: 'raggi' },
    { o: path(circleD(cx, cy, r0 * 1.35), { left: cx - r0 * 1.35, top: cy - r0 * 1.35, fill: mix(pal.accent, pal.bg, 0.3) }), role: 'alone' },
    { o: path(circleD(cx, cy, r0), { left: cx - r0, top: cy - r0, fill: pal.accent }), role: 'sole' },
    { o: path(circleD(cx, cy, r0 * 0.55), { left: cx - r0 * 0.55, top: cy - r0 * 0.55, fill: lumOf(pal.accent) > 0.5 ? ink : pal.bg, opacity: 0.18 }), role: 'nucleo' },
  ]
}

/** op-art: due famiglie di anelli sfalsati che generano moiré */
const anelli: Maker = ({ w, h, ink, pal, s }) => {
  const R = Math.min(w, h) / 2, cx = w / 2, cy = h / 2, step = Math.max(6, s * 0.011)
  const ring = (ox: number) => { let d = ''; for (let r = step; r < R; r += step) d += circleD(cx + ox, cy, r) + ' '; return d }
  const sw = Math.max(1.2, step * 0.32)
  return [
    { o: path(circleD(cx, cy, R), { left: cx - R, top: cy - R, fill: pal.accent }), role: 'disco' },
    { o: path(ring(-step * 0.9), { left: cx - R + step * 0.1, top: cy - R + step, fill: '', stroke: ink, strokeWidth: sw }), role: 'anelli-a' },
    { o: path(ring(step * 0.9), { left: cx - R + step * 1.9, top: cy - R + step, fill: '', stroke: pal.bg, strokeWidth: sw, opacity: 0.85 }), role: 'anelli-b' },
  ]
}

/** onde morbide sovrapposte, dal colore d'accento allo sfondo */
const onde: Maker = ({ w, h, pal, seed }) => {
  const noise = createNoise2D(rng(seed)), out: Piece[] = [], k = 7
  for (let i = 0; i < k; i++) {
    const y0 = (h * (i + 1)) / (k + 1)
    let d = `M 0 ${f(h)} L 0 ${f(y0)}`
    for (let x = 0; x <= w; x += w / 48) {
      const y = y0 + Math.sin(x / w * Math.PI * 2 + i * 0.9) * h * 0.04 + noise(x / w * 1.6, i * 0.7) * h * 0.05
      d += ` L ${f(x)} ${f(y)}`
    }
    d += ` L ${f(w)} ${f(h)} Z`
    out.push({ o: path(d, { left: 0, top: Math.min(h, y0 - h * 0.1), fill: mix(pal.accent, pal.surface, i / (k - 1)) }), role: `onda-${i + 1}` })
  }
  // i tracciati sono posizionati dal loro riquadro: si ricalcola in base al punto più alto
  out.forEach(p => { const b = (p.o as fabric.Path).pathOffset; const ph = (p.o as fabric.Path).height; p.o.set({ top: b.y - ph / 2 }) })
  return out
}

/** tessere Bauhaus: quarti di cerchio, mezzelune e dischi su una griglia */
const tessere: Maker = ({ w, h, pal, ink, seed }) => {
  const r = rng(seed), cols = 4, cell = w / cols, rows = Math.max(2, Math.round(h / cell))
  const colors = [pal.accent, ink, pal.surface, mix(pal.accent, pal.bg, 0.5)]
  const layers: Record<string, string> = {}
  const add = (c: string, d: string) => { layers[c] = (layers[c] ?? '') + d + ' ' }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = i * cell, y = j * cell, bgc = colors[Math.floor(r() * colors.length)]
    let fg = colors[Math.floor(r() * colors.length)]; if (fg === bgc) fg = colors[(colors.indexOf(bgc) + 1) % colors.length]
    add(bgc, `M ${f(x)} ${f(y)} h ${f(cell)} v ${f(cell)} h ${f(-cell)} Z`)
    const t = Math.floor(r() * 5), q = Math.floor(r() * 4)
    const corners = [[x, y], [x + cell, y], [x + cell, y + cell], [x, y + cell]]
    const [px, py] = corners[q]
    if (t === 0 || t === 1) { // quarto di cerchio dall'angolo
      const sx = q === 1 || q === 2 ? -1 : 1, sy = q >= 2 ? -1 : 1
      add(fg, `M ${f(px)} ${f(py)} L ${f(px + sx * cell)} ${f(py)} A ${f(cell)} ${f(cell)} 0 0 ${sx * sy > 0 ? 1 : 0} ${f(px)} ${f(py + sy * cell)} Z`)
    } else if (t === 2) add(fg, circleD(x + cell / 2, y + cell / 2, cell * 0.36))
    else if (t === 3) { // mezzaluna
      const vertical = q % 2 === 0
      add(fg, vertical
        ? `M ${f(x + cell / 2)} ${f(y)} A ${f(cell / 2)} ${f(cell / 2)} 0 0 ${q === 0 ? 1 : 0} ${f(x + cell / 2)} ${f(y + cell)} Z`
        : `M ${f(x)} ${f(y + cell / 2)} A ${f(cell / 2)} ${f(cell / 2)} 0 0 ${q === 1 ? 1 : 0} ${f(x + cell)} ${f(y + cell / 2)} Z`)
    } else { // strisce
      for (let k = 0; k < 4; k++) add(fg, `M ${f(x)} ${f(y + (k * 2 + 0.5) * cell / 8)} h ${f(cell)} v ${f(cell / 8)} h ${f(-cell)} Z`)
    }
  }
  return Object.entries(layers).map(([c, d], i) => ({ o: path(d, { left: 0, top: 0, fill: c }), role: `tessere-${i + 1}` }))
}

/** linee di flusso che seguono un campo di rumore */
const flusso: Maker = ({ w, h, ink, pal, seed, s }) => {
  const r = rng(seed), noise = createNoise2D(r)
  let a = '', b = ''
  const n = 170, steps = 70, len = s * 0.006, sc = 1.6 / Math.max(w, h)
  for (let i = 0; i < n; i++) {
    let x = r() * w, y = r() * h
    let d = `M ${f(x)} ${f(y)}`
    for (let k = 0; k < steps; k++) {
      const ang = noise(x * sc, y * sc) * Math.PI * 1.6
      x += Math.cos(ang) * len; y += Math.sin(ang) * len
      if (x < 0 || y < 0 || x > w || y > h) break
      d += ` L ${f(x)} ${f(y)}`
    }
    if (i % 9 === 0) b += d + ' '; else a += d + ' '
  }
  const sw = Math.max(1, s * 0.0016)
  return [
    { o: path(a, { left: 0, top: 0, fill: '', stroke: ink, strokeWidth: sw, opacity: 0.55, strokeLineCap: 'round' }), role: 'flusso' },
    { o: path(b, { left: 0, top: 0, fill: '', stroke: pal.accent, strokeWidth: sw * 2.6, strokeLineCap: 'round' }), role: 'flusso-accento' },
  ].map(p => { p.o.set({ left: (p.o as fabric.Path).pathOffset.x - (p.o as fabric.Path).width / 2, top: (p.o as fabric.Path).pathOffset.y - (p.o as fabric.Path).height / 2 }); return p })
}

/** curve di livello (carta topografica) da un rilievo di rumore */
const isoipse: Maker = ({ w, h, ink, pal, seed, s }) => {
  const noise = createNoise2D(rng(seed)), N = 90
  const gx = N, gy = Math.round(N * h / w), cw = w / gx, ch = h / gy
  const v = (i: number, j: number) => {
    const x = i / gx * 2.2, y = j / gy * 2.2 * (h / w)
    return noise(x, y) * 0.6 + noise(x * 2.1 + 5, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3 + 9) * 0.1
  }
  const grid: number[][] = []
  for (let j = 0; j <= gy; j++) { grid[j] = []; for (let i = 0; i <= gx; i++) grid[j][i] = v(i, j) }
  const levels = 14, layers = ['', '']
  for (let l = 0; l < levels; l++) {
    const t = -0.75 + (1.5 * l) / levels
    let d = ''
    for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
      const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], e = grid[j + 1][i]
      const pts: number[][] = []
      const edge = (v1: number, v2: number, x1: number, y1: number, x2: number, y2: number) => {
        if ((v1 < t) !== (v2 < t)) { const k = (t - v1) / (v2 - v1); pts.push([x1 + (x2 - x1) * k, y1 + (y2 - y1) * k]) }
      }
      const x = i * cw, y = j * ch
      edge(a, b, x, y, x + cw, y); edge(b, c, x + cw, y, x + cw, y + ch); edge(e, c, x, y + ch, x + cw, y + ch); edge(a, e, x, y, x, y + ch)
      for (let k = 0; k + 1 < pts.length; k += 2) d += `M ${f(pts[k][0])} ${f(pts[k][1])} L ${f(pts[k + 1][0])} ${f(pts[k + 1][1])} `
    }
    layers[l % 5 === 2 ? 1 : 0] += d
  }
  const sw = Math.max(1, s * 0.0014)
  return [
    { o: path(layers[0], { fill: '', stroke: ink, strokeWidth: sw, opacity: 0.55, strokeLineCap: 'round' }), role: 'isoipse' },
    { o: path(layers[1], { fill: '', stroke: pal.accent, strokeWidth: sw * 2.4, strokeLineCap: 'round' }), role: 'isoipse-accento' },
  ].map(p => { p.o.set({ left: (p.o as fabric.Path).pathOffset.x - (p.o as fabric.Path).width / 2, top: (p.o as fabric.Path).pathOffset.y - (p.o as fabric.Path).height / 2 }); return p })
}

/** coriandoli Memphis: zigzag, triangoli, cerchi, puntini, distribuiti senza affollarsi */
const memphis: Maker = ({ w, h, pal, ink, seed, s }) => {
  const r = rng(seed), placed: number[][] = [], out: Record<string, string> = {}, strokes: Record<string, string> = {}
  const u = s * 0.05, colors = [pal.accent, ink, mix(pal.accent, pal.surface, 0.5), pal.muted]
  for (let tries = 0; tries < 400 && placed.length < 26; tries++) {
    const x = u + r() * (w - 2 * u), y = u + r() * (h - 2 * u)
    if (placed.some(([px, py]) => Math.hypot(px - x, py - y) < u * 1.7)) continue
    placed.push([x, y])
    const c = colors[placed.length % colors.length], k = placed.length % 6, a = r() * Math.PI * 2
    const rot = (dx: number, dy: number) => [x + dx * Math.cos(a) - dy * Math.sin(a), y + dx * Math.sin(a) + dy * Math.cos(a)].map(f).join(' ')
    if (k === 0) { let d = `M ${rot(-u * 0.7, 0)}`; for (let i = 1; i <= 6; i++) d += ` L ${rot(-u * 0.7 + i * u * 0.24, i % 2 ? -u * 0.18 : u * 0.18)}`; strokes[c] = (strokes[c] ?? '') + d + ' ' }
    else if (k === 1) out[c] = (out[c] ?? '') + `M ${rot(0, -u * 0.4)} L ${rot(u * 0.38, u * 0.28)} L ${rot(-u * 0.38, u * 0.28)} Z `
    else if (k === 2) out[c] = (out[c] ?? '') + circleD(x, y, u * 0.22) + ' '
    else if (k === 3) { let d = ''; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) d += circleD(x + (i - 1) * u * 0.22, y + (j - 1) * u * 0.22, u * 0.045) + ' '; out[ink] = (out[ink] ?? '') + d }
    else if (k === 4) strokes[c] = (strokes[c] ?? '') + `M ${rot(-u * 0.45, 0)} Q ${rot(-u * 0.22, -u * 0.35)} ${rot(0, 0)} T ${rot(u * 0.45, 0)} `
    else out[c] = (out[c] ?? '') + `M ${rot(-u * 0.35, 0)} A ${f(u * 0.35)} ${f(u * 0.35)} 0 0 1 ${rot(u * 0.35, 0)} Z `
  }
  const sw = Math.max(2, s * 0.006)
  const pieces: Piece[] = [
    ...Object.entries(out).map(([c, d], i) => ({ o: path(d, { fill: c }), role: `coriandoli-${i + 1}` })),
    ...Object.entries(strokes).map(([c, d], i) => ({ o: path(d, { fill: '', stroke: c, strokeWidth: sw, strokeLineCap: 'round', strokeLineJoin: 'round' }), role: `segni-${i + 1}` })),
  ]
  return pieces.map(p => { p.o.set({ left: (p.o as fabric.Path).pathOffset.x - (p.o as fabric.Path).width / 2, top: (p.o as fabric.Path).pathOffset.y - (p.o as fabric.Path).height / 2 }); return p })
}

/** archi affiancati con sfumature, come finestre */
const archi: Maker = ({ w, h, pal, ink }) => {
  const n = w > h * 1.2 ? 4 : 3, gap = w * 0.03, aw = (w - gap * (n - 1)) / n
  const out: Piece[] = []
  for (let i = 0; i < n; i++) {
    const x = i * (aw + gap), top = h * (0.08 + (i % 2) * 0.12), r = aw / 2
    const d = `M ${f(x)} ${f(h)} L ${f(x)} ${f(top + r)} A ${f(r)} ${f(r)} 0 0 1 ${f(x + aw)} ${f(top + r)} L ${f(x + aw)} ${f(h)} Z`
    const c1 = i % 2 ? pal.accent : mix(pal.accent, pal.surface, 0.55), c2 = i % 2 ? mix(pal.accent, ink, 0.35) : pal.surface
    const o = path(d, { left: x, top, fill: new fabric.Gradient({ type: 'linear', gradientUnits: 'percentage', coords: { x1: 0, y1: 0, x2: 0, y2: 1 }, colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] }) })
    out.push({ o, role: `arco-${i + 1}` })
  }
  const sr = aw * 0.22
  out.push({ o: path(circleD(aw * 1.5 + gap, h * 0.32, sr), { left: aw * 1.5 + gap - sr, top: h * 0.32 - sr, fill: ink === '#111111' ? pal.bg : pal.bg }), role: 'astro' })
  return out
}

/** vetrata Voronoi: celle rilassate con tinte vicine, fughe nello sfondo */
const vetrata: Maker = ({ w, h, pal, seed, s }) => {
  const r = rng(seed)
  let pts: [number, number][] = Array.from({ length: 46 }, () => [r() * w, r() * h])
  for (let it = 0; it < 3; it++) { // rilassamento di Lloyd: celle più regolari
    const v = Delaunay.from(pts).voronoi([0, 0, w, h])
    pts = pts.map((_, i) => { const poly = v.cellPolygon(i); if (!poly) return pts[i]; let cx = 0, cy = 0; poly.forEach(([x, y]) => { cx += x; cy += y }); return [cx / poly.length, cy / poly.length] })
  }
  const vor = Delaunay.from(pts).voronoi([0, 0, w, h])
  const tones = [pal.accent, mix(pal.accent, pal.surface, 0.35), mix(pal.accent, pal.surface, 0.7), pal.surface, shade(pal.accent, -0.12)]
  const layers: Record<string, string> = {}
  pts.forEach((_, i) => {
    const poly = vor.cellPolygon(i); if (!poly) return
    const c = tones[Math.floor(r() * tones.length)]
    layers[c] = (layers[c] ?? '') + 'M ' + poly.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L ') + ' Z '
  })
  const gapW = Math.max(2, s * 0.006)
  return Object.entries(layers).map(([c, d], i) => ({ o: path(d, { left: 0, top: 0, fill: c, stroke: pal.bg, strokeWidth: gapW, strokeLineJoin: 'round' }), role: `vetrata-${i + 1}` }))
}

/** sfaccettato: triangoli di Delaunay con una sfumatura diagonale */
const sfaccettato: Maker = ({ w, h, pal, ink, seed }) => {
  const r = rng(seed), pts: [number, number][] = []
  const n = 70
  for (let i = 0; i < n; i++) pts.push([r() * w, r() * h])
  ;[[0, 0], [w, 0], [0, h], [w, h], [w / 2, 0], [w / 2, h], [0, h / 2], [w, h / 2]].forEach(p => pts.push(p as [number, number]))
  const del = Delaunay.from(pts), t = del.triangles
  const layers: Record<string, string> = {}
  for (let i = 0; i < t.length; i += 3) {
    const [a, b, c] = [pts[t[i]], pts[t[i + 1]], pts[t[i + 2]]]
    const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3
    const k = Math.round(((cx / w) * 0.6 + (cy / h) * 0.4 + (r() - 0.5) * 0.18) * 7) / 7
    const col = k < 0.5 ? mix(pal.accent, pal.surface, k * 2) : mix(pal.surface, mix(ink, pal.accent, 0.6), (k - 0.5) * 2)
    layers[col] = (layers[col] ?? '') + `M ${f(a[0])} ${f(a[1])} L ${f(b[0])} ${f(b[1])} L ${f(c[0])} ${f(c[1])} Z `
  }
  return Object.entries(layers).map(([c, d], i) => ({ o: path(d, { left: 0, top: 0, fill: c, stroke: c, strokeWidth: 0.6 }), role: `faccette-${i + 1}` }))
}

/** schizzo a mano (Rough.js): composizione disegnata con tratteggi */
const schizzo: Maker = ({ w, h, pal, ink, seed, s }) => {
  const gen = rough.generator({ options: { seed: seed % 2147483647 || 1 } })
  const sw = Math.max(1.5, s * 0.003)
  const shapes = [
    gen.circle(w * 0.62, h * 0.36, Math.min(w, h) * 0.52, { fill: pal.accent, fillStyle: 'hachure', hachureGap: sw * 3.2, fillWeight: sw * 0.9, stroke: ink, strokeWidth: sw, roughness: 1.4 }),
    gen.rectangle(w * 0.08, h * 0.5, w * 0.42, h * 0.42, { fill: mix(pal.accent, pal.surface, 0.5), fillStyle: 'cross-hatch', hachureGap: sw * 4, fillWeight: sw * 0.7, stroke: ink, strokeWidth: sw, roughness: 1.6 }),
    gen.polygon([[w * 0.35, h * 0.95], [w * 0.62, h * 0.48], [w * 0.92, h * 0.95]], { fill: ink, fillStyle: 'zigzag', hachureGap: sw * 3, fillWeight: sw * 0.8, stroke: ink, strokeWidth: sw, roughness: 1.2 }),
    gen.line(w * 0.04, h * 0.97, w * 0.96, h * 0.97, { stroke: ink, strokeWidth: sw * 1.6, roughness: 2 }),
    gen.curve([[w * 0.05, h * 0.18], [w * 0.2, h * 0.08], [w * 0.3, h * 0.2], [w * 0.42, h * 0.1]], { stroke: pal.accent, strokeWidth: sw * 1.4, roughness: 1.2 }),
  ]
  const out: Piece[] = []
  shapes.forEach((sh, i) => gen.toPaths(sh).forEach((p, j) => {
    const o = path(p.d, { fill: p.fill && p.fill !== 'none' ? p.fill : '', stroke: p.stroke, strokeWidth: p.strokeWidth, strokeLineCap: 'round', strokeLineJoin: 'round' })
    o.set({ left: o.pathOffset.x - o.width / 2, top: o.pathOffset.y - o.height / 2 })
    out.push({ o, role: `schizzo-${i + 1}-${j + 1}` })
  }))
  return out
}

/** sovrastampa: tre forme organiche che si fondono come inchiostri */
const sovrastampa: Maker = ({ w, h, pal, ink, seed }) => {
  const size = Math.min(w, h) * 0.72
  const cols = [pal.accent, mix(pal.accent, ink, 0.25), mix(pal.accent, pal.surface, 0.45)]
  const pos = [[0.08, 0.04], [0.32, 0.26], [0.02, 0.36]]
  return cols.map((c, i) => {
    const o = path(blobPath({ seed: seed + i * 17, extraPoints: 4, randomness: 6, size }), { fill: c, opacity: 0.88 })
    o.set({ left: w * pos[i][0], top: h * pos[i][1], globalCompositeOperation: 'multiply' })
    return { o, role: `inchiostro-${i + 1}` }
  })
}

/** retino vettoriale: puntini che crescono lungo una sfumatura radiale */
const puntinato: Maker = ({ w, h, pal, s }) => {
  const step = Math.max(9, s * 0.022), cx = w * 0.7, cy = h * 0.35, R = Math.hypot(w, h) * 0.75
  let d = ''
  for (let y = step / 2; y < h; y += step) for (let x = step / 2 + ((y / step) % 2 ? step / 2 : 0); x < w; x += step) {
    const k = 1 - Math.min(1, Math.hypot(x - cx, y - cy) / R)
    const r = step * 0.5 * Math.pow(k, 1.4)
    if (r > 0.6) d += circleD(x, y, r) + ' '
  }
  const o = path(d, { fill: pal.accent })
  o.set({ left: o.pathOffset.x - o.width / 2, top: o.pathOffset.y - o.height / 2 })
  return [{ o, role: 'retino' }]
}

/** disco a strisce diagonali, con anello: op-art pulita */
const strisce: Maker = ({ w, h, pal, ink, s }) => {
  const R = Math.min(w, h) / 2, cx = w / 2, cy = h / 2, step = Math.max(8, s * 0.018)
  let d = ''
  for (let k = -2 * R; k < 2 * R; k += step * 2) d += `M ${f(cx + k - R)} ${f(cy + R)} L ${f(cx + k + R)} ${f(cy - R)} L ${f(cx + k + R + step)} ${f(cy - R)} L ${f(cx + k - R + step)} ${f(cy + R)} Z `
  const stripes = path(d, { fill: ink })
  stripes.clipPath = new fabric.Circle({ radius: R, originX: 'center', originY: 'center' })
  stripes.set({ left: stripes.pathOffset.x - stripes.width / 2, top: stripes.pathOffset.y - stripes.height / 2 })
  // il ritaglio è relativo al centro del tracciato: si sposta sul centro del disco
  const off = { x: cx - stripes.pathOffset.x, y: cy - stripes.pathOffset.y }
  stripes.clipPath.set({ left: off.x, top: off.y })
  return [
    { o: path(circleD(cx, cy, R), { left: cx - R, top: cy - R, fill: pal.accent }), role: 'disco' },
    { o: stripes, role: 'strisce' },
    { o: path(circleD(cx + R * 0.35, cy + R * 0.35, R * 0.38), { left: cx - R * 0.03, top: cy - R * 0.03, fill: pal.bg, stroke: ink, strokeWidth: Math.max(2, s * 0.004) }), role: 'lente' },
  ]
}

/** sfera di vetro con riempimento generativo e materiale 3D */
const sfera: Maker = ({ w, h, pal, fx, ink }) => {
  const R = Math.min(w, h) * 0.46
  const o: Piece['o'] = path(circleD(w / 2, h / 2, R), { left: w / 2 - R, top: h / 2 - R, fill: pal.accent })
  const g = fx('genFill', 'notte', { c1: pal.accent, c2: mix(pal.accent, pal.surface, 0.5), c3: pal.surface, c4: mix(pal.accent, ink, 0.4), grain: 10 })
  const m = fx('material3d', 'vetro', { shape: 1, depth: Math.round(R * 0.3), rx: 16, ry: -22 })
  o.fx = [g, m].filter(Boolean) as FxEntry[]
  return [{ o, role: 'sfera' }]
}

function lumOf(hex: string) { const o = oklch(parse(hex)); return o?.l ?? 0.5 }

export const ORNAMENTS: Record<string, { label: string; make: Maker }> = {
  raggiera: { label: 'sole a raggi', make: raggiera },
  anelli: { label: 'anelli op-art (moiré)', make: anelli },
  onde: { label: 'onde sovrapposte', make: onde },
  tessere: { label: 'tessere geometriche Bauhaus', make: tessere },
  flusso: { label: 'linee di flusso', make: flusso },
  isoipse: { label: 'curve di livello topografiche', make: isoipse },
  memphis: { label: 'coriandoli Memphis', make: memphis },
  archi: { label: 'archi sfumati', make: archi },
  vetrata: { label: 'vetrata Voronoi', make: vetrata },
  sfaccettato: { label: 'sfaccettature low-poly', make: sfaccettato },
  schizzo: { label: 'schizzo a mano', make: schizzo },
  sovrastampa: { label: 'inchiostri in sovrastampa', make: sovrastampa },
  puntinato: { label: 'retino a puntini', make: puntinato },
  strisce: { label: 'disco a strisce op-art', make: strisce },
  sfera: { label: 'sfera di vetro 3D', make: sfera },
}
export const ORNAMENT_IDS = Object.keys(ORNAMENTS)
