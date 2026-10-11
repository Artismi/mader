// Genera il set "Celestial" (sparkle, starburst, stelle, orbite, lune) per lo Studio.
//
// Regole di stile (linework a inchiostro, ispirato alle tavole flash tattoo):
//  - ogni tratto cambia spessore e chiude SEMPRE in punta d'ago, mai tagliato di netto;
//  - nessuna sovrapposizione: le orbite si interrompono da sole prima di toccare
//    un corpo (stella, pianeta) e ripartono dopo, con punte rastremate;
//  - le parti separate di una forma devono restare distanti almeno MIN_GAP:
//    lo script lo verifica e si ferma se una composizione viola la regola.
//
// Output: src/components/studio/libraries/celestial-library.ts + SVG in public/assets/elements/celestial/
// Uso: node scripts/generate-celestial.mjs   (richiede polygon-clipping, gia' tra le dipendenze)
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
const pc = createRequire(import.meta.url)('polygon-clipping')

const MIN_GAP = 2.2   // distanza minima tra parti separate (unita' viewBox 100)
const BODY_GAP = 3.2  // varco tra un'orbita e il corpo che attraversa

const rad = d => d * Math.PI / 180
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const rotP = ([x, y], cx, cy, deg) => {
  const a = rad(deg), c = Math.cos(a), s = Math.sin(a)
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]
}
const cubic = (p0, p1, p2, p3, t) => {
  const u = 1 - t
  return [0, 1].map(i => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i])
}
const quad = (p0, p1, p2, t) => { const u = 1 - t; return [0, 1].map(i => u * u * p0[i] + 2 * u * t * p1[i] + t * t * p2[i]) }
const poly = ring => [[...ring, ring[0]]]

// ── Corpi ─────────────────────────────────────────────────────────────────

// Sparkle a 4 punte con lati concavi. pinch: quanto il corpo si stringe (basso = punte ad ago).
function sparkle(cx, cy, rx, ry = rx, { pinch = 0.1, rotate = 0, bend = 0.82 } = {}) {
  const ring = [], R = Math.min(rx, ry)
  const tip = i => { const a = i * Math.PI / 2 - Math.PI / 2; return rotP([cx + rx * Math.cos(a), cy + ry * Math.sin(a)], cx, cy, rotate) }
  for (let i = 0; i < 4; i++) {
    const A = tip(i), B = tip(i + 1), am = (i + 0.5) * Math.PI / 2 - Math.PI / 2 + rad(rotate)
    const P = [cx + R * pinch * Math.cos(am), cy + R * pinch * Math.sin(am)]
    const c1 = lerp(A, P, bend), c2 = lerp(B, P, bend)
    for (let k = 0; k < 48; k++) ring.push(cubic(A, c1, c2, B, k / 48))
  }
  return poly(ring)
}

// Raggi ad ago: sottilissimi in punta, si aprono solo vicino al centro.
// alt = lunghezza dei raggi dispari; inner = raggio della valle; concave = curvatura dei lati.
function needles(cx, cy, r, { n = 8, inner = 0.07, alt = 1, rotate = 0, concave = 0.35, ry = r } = {}) {
  const ring = [], k = ry / r
  const pt = (rr, a) => [cx + rr * Math.cos(a), cy + rr * k * Math.sin(a)]
  const len = i => r * (i % 2 ? alt : 1)
  for (let i = 0; i < n; i++) {
    const a = i * 2 * Math.PI / n - Math.PI / 2 + rad(rotate), an = a + 2 * Math.PI / n
    const A = pt(len(i), a), An = pt(len(i + 1), an), P = pt(r * inner, a + Math.PI / n)
    const q1 = lerp(lerp(A, P, 0.6), pt(len(i) * 0.4, a), concave)
    const q2 = lerp(lerp(An, P, 0.6), pt(len(i + 1) * 0.4, an), concave)
    for (let s = 0; s < 32; s++) ring.push(quad(A, q1, P, s / 32))
    for (let s = 0; s < 32; s++) ring.push(quad(P, q2, An, s / 32))
  }
  return poly(ring)
}
const burst = (cx, cy, r, o = {}) => needles(cx, cy, r, { n: 8, ...o })
const cross = (cx, cy, r, o = {}) => needles(cx, cy, r, { n: 4, rotate: 45, inner: 0.1, ...o })
const plus = (cx, cy, r, o = {}) => needles(cx, cy, r, { n: 4, inner: 0.1, ...o })

// Stella a n punte, lati dritti (5 = classica).
function starN(cx, cy, r, { n = 5, inner = 0.42, rotate = 0 } = {}) {
  const ring = []
  for (let i = 0; i < n * 2; i++) {
    const a = i * Math.PI / n - Math.PI / 2 + rad(rotate), rr = i % 2 ? r * inner : r
    ring.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)])
  }
  return poly(ring)
}
const star5 = (cx, cy, r, o = {}) => starN(cx, cy, r, { n: 5, ...o })

function circle(cx, cy, r, n = 72) {
  const ring = []
  for (let i = 0; i < n; i++) ring.push([cx + r * Math.cos(i / n * 2 * Math.PI), cy + r * Math.sin(i / n * 2 * Math.PI)])
  return poly(ring)
}
const dot = (cx, cy, r) => circle(cx, cy, r, 40)

// Luna crescente: le due punte sono naturalmente ad ago.
function moon(cx, cy, r, { phase = 0.38, rotate = -20 } = {}) {
  const off = rotP([cx + r * phase * 1.25, cy - r * phase * 0.35], cx, cy, rotate)
  return pc.difference(circle(cx, cy, r, 120), circle(off[0], off[1], r * 0.92, 120))[0]
}

// ── Tratti (linework) ─────────────────────────────────────────────────────

// Pennellata lungo una curva qualsiasi. at(t) -> punto, width(t) -> spessore.
// needle: quota iniziale/finale rastremata fino a zero.
function brush(at, width, { N = 220, needle = 0.3, t0 = 0, t1 = 1 } = {}) {
  const L = [], R = []
  for (let i = 0; i <= N; i++) {
    const u = i / N, t = t0 + (t1 - t0) * u, h = 1e-4
    const p = at(t), q = at(Math.min(1, t + h)), o = at(Math.max(0, t - h))
    let tx = q[0] - o[0], ty = q[1] - o[1]; const tl = Math.hypot(tx, ty) || 1
    tx /= tl; ty /= tl
    const e = Math.min(1, Math.min(u, 1 - u) / needle)
    const w = Math.pow(Math.sin(e * Math.PI / 2), 1.4) * width(t)
    L.push([p[0] - ty * w / 2, p[1] + tx * w / 2]); R.push([p[0] + ty * w / 2, p[1] - tx * w / 2])
  }
  return poly([...L, ...R.reverse().slice(1, -1)])
}

// Orbita su ellisse inclinata da a0 a a1 gradi (90 = davanti/in basso).
// Spessa davanti (wf), sottile dietro (wb). Se ci sono corpi da evitare, l'arco
// viene spezzato dove passerebbe sopra/sotto un corpo e ogni pezzo chiude ad ago.
function orbit(cx, cy, rx, ry, a0, a1, { wf = 6.5, wb = 0.8, tilt = -12, swell = 1.6, avoid = [], minSeg = 30, needleDeg = 70 } = {}) {
  const pt = d => { const a = rad(d); return rotP([cx + rx * Math.cos(a), cy + ry * Math.sin(a)], cx, cy, tilt) }
  const wid = d => wb + (wf - wb) * Math.pow((1 + Math.sin(rad(d))) / 2, swell)
  const segs = []
  let cur = null
  for (let d = a0; d <= a1 + 1e-9; d += 0.5) {
    const blocked = avoid.some(b => distToGeom(pt(d), b) < BODY_GAP + wid(d) / 2)
    if (!blocked) { if (!cur) cur = [d, d]; cur[1] = d } else if (cur) { segs.push(cur); cur = null }
  }
  if (cur) segs.push(cur)
  // orbita chiusa: il primo e l'ultimo pezzo sono lo stesso tratto che attraversa a0
  if (a1 - a0 >= 360 && segs.length > 1 && segs[0][0] === a0 && segs[segs.length - 1][1] >= a1 - 0.5) {
    const first = segs.shift(); segs[segs.length - 1][1] = first[1] + 360
  }
  if (a1 - a0 >= 360 && segs.length === 1 && segs[0][0] === a0 && segs[0][1] >= a1 - 0.5) segs[0] = [a0, a1 - 6]
  return segs.filter(([s, e]) => e - s >= minSeg).map(([s, e]) =>
    brush(t => pt(s + (e - s) * t), t => wid(s + (e - s) * t), { needle: Math.min(0.45, needleDeg / (e - s)) }))
}

// Swoosh libero su cubica (per scie e onde): p0..p3 punti di controllo.
// Il tratto e' sottile in coda (p0) e si gonfia verso la testa (p3), dove chiude ad ago.
const swoosh = (p0, p1, p2, p3, w = 6, o = {}) => brush(t => cubic(p0, p1, p2, p3, t), t => w * Math.pow(t, 1.2) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.35) + 0.4, { needle: 0.2, ...o })

// ── Geometria di servizio ─────────────────────────────────────────────────
const asPolys = g => (typeof g[0][0][0] === 'number' ? [g] : g)
function inRing(p, r) {
  let c = false
  for (let i = 0, j = r.length - 1; i < r.length; j = i++)
    if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c
  return c
}
function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy
  const t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}
function distToGeom(p, g) {
  let m = Infinity
  for (const pl of asPolys(g)) {
    const r = pl[0]
    if (inRing(p, r)) return 0
    for (let i = 0; i < r.length - 1; i++) m = Math.min(m, segDist(p, r[i], r[i + 1]))
  }
  return m
}
const geomDist = (a, b) => {
  let m = Infinity
  for (const pl of asPolys(a)) for (const p of pl[0]) { m = Math.min(m, distToGeom(p, b)); if (m === 0) return 0 }
  return m
}

// Compone le parti e verifica: nessun contatto tra parti, tutto dentro il riquadro.
const problems = []
function compose(name, parts) {
  const flat = parts.flatMap(p => (Array.isArray(p[0][0][0]) ? p : [p])).filter(Boolean)
  for (let i = 0; i < flat.length; i++) for (let j = i + 1; j < flat.length; j++) {
    const d = Math.min(geomDist(flat[i], flat[j]), geomDist(flat[j], flat[i]))
    if (d < MIN_GAP) problems.push(`${name}: parti ${i} e ${j} troppo vicine (${d.toFixed(2)})`)
  }
  const out = flat.flatMap(g => asPolys(g).flatMap(pl => pl[0])).find(([x, y]) => x < 0.5 || x > 99.5 || y < 0.5 || y > 99.5)
  if (out) problems.push(`${name}: esce dal riquadro (${out[0].toFixed(1)}, ${out[1].toFixed(1)})`)
  return pc.union(...flat)
}

// ── Output path ───────────────────────────────────────────────────────────
function rdp(pts, eps) {
  if (pts.length < 3) return pts
  const a = pts[0], b = pts[pts.length - 1]
  let max = 0, idx = 0
  for (let i = 1; i < pts.length - 1; i++) { const d = segDist(pts[i], a, b); if (d > max) { max = d; idx = i } }
  if (max <= eps) return [a, b]
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)]
}
const n2 = v => String(Math.round(v * 100) / 100)
const ringArea = r => Math.abs(r.reduce((a, p, i) => { const q = r[(i + 1) % r.length]; return a + p[0] * q[1] - q[0] * p[1] }, 0) / 2)
function toPath(geom, eps = 0.035) {
  return asPolys(geom).filter(p => ringArea(p[0]) > eps * 30).flatMap(p => p.map(ring => {
    // anello chiuso: lo spezzo nel punto piu' lontano dall'inizio, poi RDP sulle due meta'
    const r = ring.slice(0, -1)
    let far = 0
    r.forEach((p, i) => { if (Math.hypot(p[0] - r[0][0], p[1] - r[0][1]) > Math.hypot(r[far][0] - r[0][0], r[far][1] - r[0][1])) far = i })
    const pts = [...rdp(r.slice(0, far + 1), eps).slice(0, -1), ...rdp([...r.slice(far), r[0]], eps).slice(0, -1)]
    return 'M' + pts.map(([x, y]) => `${n2(x)} ${n2(y)}`).join('L') + 'Z'
  })).join('')
}

// ── Composizioni ──────────────────────────────────────────────────────────
// Orbita completa attorno a dei corpi: spezzata automaticamente dove li incontra.
const ringAround = (bodies, cx, cy, rx, ry, o = {}) => [...bodies, ...orbit(cx, cy, rx, ry, -90, 270, { avoid: bodies, ...o })]
const S = sparkle

const CATS = {
  'CELESTIAL · Sparkle': {
    'Sparkle':          [S(50, 50, 36, 48, { pinch: 0.08 })],
    'Sparkle Tall':     [S(50, 50, 20, 48, { pinch: 0.12 })],
    'Sparkle Needle':   [S(50, 50, 12, 48, { pinch: 0.14 })],
    'Sparkle Wide':     [S(50, 50, 48, 30, { pinch: 0.1 })],
    'Sparkle Round':    [S(50, 50, 44, 44, { pinch: 0.2, bend: 0.7 })],
    'Sparkle Diamond':  [S(50, 50, 44, 44, { pinch: 0.08, rotate: 45 })],
    'Sparkle Duo':      [S(40, 58, 28, 38, { pinch: 0.08 }), S(82, 20, 12, 16)],
    'Sparkle Trio':     [S(42, 52, 20, 46, { pinch: 0.12 }), S(78, 24, 10, 15), S(16, 84, 7, 10)],
    'Sparkle Pair':     [S(32, 40, 18, 38, { pinch: 0.12 }), S(72, 62, 14, 32, { pinch: 0.12 })],
    'Sparkle Steps':    [S(22, 74, 10, 16), S(48, 52, 13, 22), S(78, 26, 18, 24)],
    'Sparkle Column':   [S(50, 18, 8, 13), S(50, 50, 13, 16), S(50, 83, 8, 13)],
    'Twinkle Field':    [S(26, 30, 12, 20), S(70, 24, 7, 11), S(64, 68, 16, 26), S(20, 80, 5, 8), dot(44, 54, 1.8)],
    'Dot Sparkle':      [S(50, 50, 28, 42, { pinch: 0.08 }), dot(86, 14, 3.2), dot(14, 86, 2.4)],
    'Constellation':    [S(18, 70, 8, 12), dot(36, 52, 2), S(56, 44, 11, 17), dot(74, 30, 2), S(86, 14, 6, 10), dot(30, 86, 1.6)],
    'Sparkle Quad':     [S(28, 28, 14, 20), S(72, 28, 10, 16), S(28, 72, 10, 16), S(72, 72, 14, 20)],
  },
  'CELESTIAL · Burst & Star': {
    'Starburst':        [burst(50, 50, 47)],
    'Starburst Alt':    [burst(50, 50, 47, { alt: 0.58 })],
    'Starburst 12':     [needles(50, 50, 47, { n: 12, inner: 0.08, alt: 0.6 })],
    'Starburst 16':     [needles(50, 50, 47, { n: 16, inner: 0.09, alt: 0.45 })],
    'Starburst 6':      [needles(50, 50, 47, { n: 6, inner: 0.08 })],
    'Flare':            [needles(50, 50, 48, { n: 8, inner: 0.06, alt: 0.3 })],
    'Flare Wide':       [needles(50, 50, 48, { n: 4, inner: 0.08, ry: 30 })],
    'Cross X':          [cross(50, 50, 46)],
    'Cross Plus':       [plus(50, 50, 46)],
    'Cross X Duo':      [cross(58, 42, 40), cross(14, 86, 12, { inner: 0.13 })],
    'Burst Cluster':    [burst(40, 42, 37, { alt: 0.62 }), S(82, 78, 10, 14)],
    'Burst Spark':      [burst(60, 54, 36), S(16, 26, 8, 14)],
    'Burst Twins':      [burst(32, 34, 28, { alt: 0.6 }), burst(72, 72, 24, { alt: 0.6 })],
    'Star Solid':       [star5(50, 53, 46)],
    'Star Slim':        [star5(50, 53, 46, { inner: 0.3 })],
    'Star 6':           [starN(50, 50, 46, { n: 6, inner: 0.45 })],
    'Star 7':           [starN(50, 50, 46, { n: 7, inner: 0.4 })],
    'Star Duo':         [star5(40, 56, 34), S(84, 18, 10, 14)],
    'Stars Trio':       [star5(30, 34, 22), star5(72, 46, 16), star5(42, 80, 12)],
  },
  'CELESTIAL · Orbit': {
    'Orbit Swoosh':     orbit(50, 48, 46, 16, 20, 300),
    'Orbit Smile':      orbit(50, 36, 46, 18, 0, 180, { wb: 1.4, tilt: 0 }),
    'Orbit Dust':       [...orbit(50, 60, 46, 15, 20, 300), S(55, 22, 6, 10), S(68, 20, 4, 7), dot(43, 23, 1.8)],
    'Orbit Open':       [...orbit(50, 46, 46, 17, 15, 205), ...orbit(50, 46, 46, 17, 225, 330, { wf: 4 }), S(48, 46, 6, 11), S(60, 42, 4, 7)],
    'Comet Trail':      [...orbit(50, 52, 46, 15, 25, 300, { wb: 0.6, tilt: -16 }), S(82, 18, 6, 10), S(14, 82, 4, 7)],
    'Saturn Sparkle':   ringAround([S(50, 46, 15, 44, { pinch: 0.12 })], 50, 54, 46, 14),
    'Saturn Burst':     ringAround([burst(50, 46, 42, { alt: 0.55 })], 50, 56, 46, 14),
    'Saturn Star':      ringAround([star5(50, 38, 30)], 50, 62, 46, 13),
    'Saturn Tilt':      ringAround([S(50, 50, 15, 46, { pinch: 0.12 })], 50, 52, 46, 15, { tilt: 14 }),
    'Orbit Twin':       ringAround([S(38, 48, 14, 40, { pinch: 0.12 }), S(64, 32, 9, 22, { pinch: 0.12 })], 50, 58, 45, 14),
    'Orbit X':          ringAround([cross(56, 40, 34), cross(16, 24, 11, { inner: 0.13 })], 50, 62, 46, 15),
    'Halo Sparkle':     ringAround([S(46, 44, 14, 42, { pinch: 0.12 }), S(80, 84, 6, 10)], 47, 54, 44, 13),
    'Halo Wide':        ringAround([S(50, 50, 30, 44, { pinch: 0.08 })], 50, 56, 47, 12, { wf: 5.5 }),
    'Shooting Star':    [star5(72, 30, 22), ...orbit(46, 60, 42, 16, 60, 320, { wb: 0.6, tilt: -22, avoid: [star5(72, 30, 22)] }), S(16, 22, 5, 9), S(88, 84, 4, 7)],
    'Planet':           ringAround([circle(50, 50, 20)], 50, 52, 47, 13, { tilt: -16 }),
    'Planet Sparkle':   [...ringAround([circle(46, 54, 17)], 46, 56, 44, 12, { tilt: -16 }), S(84, 18, 7, 12), S(70, 10, 3.5, 6)],
  },
  'CELESTIAL · Luna & Scie': {
    'Moon':             [moon(50, 50, 44, { phase: 0.5 })],
    'Moon Slim':        [moon(50, 50, 44, { phase: 0.62, rotate: -35 })],
    'Moon Sparkle':     [moon(40, 54, 36, { phase: 0.5 }), S(78, 26, 10, 16), S(88, 52, 5, 8)],
    'Moon Stars':       [moon(38, 50, 34, { phase: 0.5 }), star5(76, 30, 10), star5(82, 66, 6), dot(70, 84, 1.8)],
    'Moon Burst':       [moon(40, 56, 34, { phase: 0.5 }), burst(78, 24, 20, { alt: 0.6 })],
    'Wave Trail':       [swoosh([6, 64], [30, 20], [58, 92], [86, 40], 7), S(86, 16, 8, 12)],
    'Comet Line':       [swoosh([6, 70], [24, 92], [56, 66], [68, 36], 8), S(80, 18, 12, 16)],
    'Comet Double':     [swoosh([4, 56], [14, 84], [44, 72], [62, 38], 7), swoosh([14, 92], [36, 98], [64, 84], [76, 52], 4), S(78, 22, 12, 16)],
    'Shooting Sparkle': [swoosh([4, 74], [16, 98], [44, 80], [58, 50], 7), S(74, 28, 16, 22)],
    'Dust Arc':         [swoosh([6, 78], [16, 36], [54, 14], [88, 22], 6), dot(30, 72, 2), S(48, 60, 6, 10), dot(64, 50, 1.6), S(80, 46, 4, 7)],
    'Comet Burst':      [swoosh([6, 88], [12, 60], [36, 48], [52, 50], 7), burst(74, 40, 24, { alt: 0.55 })],
    'Meteor Shower':    [swoosh([8, 50], [16, 36], [30, 26], [42, 22], 4.5), S(52, 20, 6, 9), swoosh([20, 84], [30, 66], [50, 56], [64, 52], 6), S(76, 48, 9, 13), swoosh([46, 96], [56, 86], [70, 80], [80, 80], 3.5), S(90, 80, 4, 7)],
  },
}

// ── ICONE (viewBox 24): stesse forme in scala, piene ───────────────────────
const ICON_FROM = {
  Sparkle: 'Sparkle', Sparkles: 'Sparkle Duo', Twinkle: 'Twinkle Field', Constellation: 'Constellation',
  Starburst: 'Starburst', Flare: 'Flare', 'Cross X': 'Cross X', Star: 'Star Solid',
  Orbit: 'Saturn Sparkle', Planet: 'Planet', Comet: 'Comet Line', 'Shooting Star': 'Shooting Star',
  Moon: 'Moon', 'Moon Sparkle': 'Moon Sparkle', Halo: 'Halo Wide', Wave: 'Wave Trail', Meteor: 'Meteor Shower',
}

// ── Scrittura ──────────────────────────────────────────────────────────────
const geoms = {}
const cats = Object.fromEntries(Object.entries(CATS).map(([cat, items]) => [cat, Object.entries(items).map(([name, parts]) => {
  geoms[name] = compose(name, parts)
  return { name, path: toPath(geoms[name]) }
})]))
if (problems.length) { console.error(problems.join('\n')); process.exit(1) }
const scale = (g, k) => g.map(p => p.map(r => r.map(([x, y]) => [x * k, y * k])))
const ICONS = Object.entries(ICON_FROM).map(([name, src]) => ({ name, path: toPath(scale(geoms[src], 0.24), 0.01) }))
const fmtList = l => l.map(x => `    { name: ${JSON.stringify(x.name)}, path: ${JSON.stringify(x.path)} },`).join('\n')

const ts = `// AUTO-GENERATO da scripts/generate-celestial.mjs — non modificare a mano.
// Set "Celestial": linework a inchiostro, forme piene (fill), viewBox 100.

export const CELESTIAL_LIBRARY: Record<string, { name: string; path: string }[]> = {
${Object.entries(cats).map(([c, l]) => `  ${JSON.stringify(c)}: [\n${fmtList(l)}\n  ],`).join('\n')}
}

// Icone piene, viewBox 24: vanno disegnate con fill (non stroke).
export const CELESTIAL_ICONS: { name: string; path: string }[] = [
${fmtList(ICONS).replace(/^ {4}/gm, '  ')}
]
`
writeFileSync('src/components/studio/libraries/celestial-library.ts', ts)

const dir = 'public/assets/elements/celestial'
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true })
const slug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const all = Object.values(cats).flat()
for (const x of all)
  writeFileSync(`${dir}/${slug(x.name)}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${x.path}" fill="currentColor"/></svg>\n`)
for (const x of ICONS)
  writeFileSync(`${dir}/icon-${slug(x.name)}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${x.path}" fill="currentColor"/></svg>\n`)
const cols = 8, cell = 120, rows = Math.ceil(all.length / cols)
const cells = all.map((x, i) => `<g transform="translate(${(i % cols) * cell + 10} ${Math.floor(i / cols) * cell + 10})"><path d="${x.path}"/></g>`).join('')
writeFileSync(`${dir}/_master-sheet.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * cell} ${rows * cell}" fill="currentColor">${cells}</svg>\n`)
console.log(`${all.length} forme in ${Object.keys(cats).length} categorie, ${ICONS.length} icone, ${Math.round(ts.length / 1024)} KB`)
