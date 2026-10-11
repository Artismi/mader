// Genera il set "Celestial" (sparkle, starburst, orbite) per la libreria forme.
// Ogni forma e' UNA sagoma pulita: le primitive vengono campionate in poligoni,
// unite/tagliate con operazioni booleane (polygon-clipping) e semplificate.
// Linework a inchiostro: ogni tratto si gonfia e si assottiglia e chiude in punta d'ago;
// le orbite passano davanti alla stella e si aprono dietro con due punte.
// Output: src/components/studio/libraries/celestial-library.ts + SVG in public/assets/elements/celestial/
// Uso: node scripts/generate-celestial.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
const pc = createRequire(import.meta.url)('polygon-clipping')

const rad = d => d * Math.PI / 180
const rotP = ([x, y], cx, cy, deg) => {
  const a = rad(deg), c = Math.cos(a), s = Math.sin(a)
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]
}
const cubic = (p0, p1, p2, p3, t) => {
  const u = 1 - t
  return [0, 1].map(i => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i])
}
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const poly = ring => [[...ring, ring[0]]]

// ── Primitive (ritornano un Polygon) ──────────────────────────────────────

// Stella a n punte con lati concavi (sparkle = 4 punte). rx/ry = raggi delle punte,
// pinch = quanto il corpo si stringe verso il centro (piu' basso = punte piu' ad ago).
function star(cx, cy, rx, ry = rx, { n = 4, pinch = 0.1, alt = 1, rotate = 0, bend = 0.82 } = {}) {
  const ring = [], R = Math.min(rx, ry)
  const tip = i => {
    const a = i * 2 * Math.PI / n - Math.PI / 2 + rad(rotate), k = i % 2 ? alt : 1
    return [cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)]
  }
  for (let i = 0; i < n; i++) {
    const A = tip(i), B = tip(i + 1)
    const am = (i + 0.5) * 2 * Math.PI / n - Math.PI / 2 + rad(rotate)
    const P = [cx + R * pinch * Math.cos(am), cy + R * pinch * Math.sin(am)]
    const c1 = lerp(A, P, bend), c2 = lerp(B, P, bend)
    for (let k = 0; k < 48; k++) ring.push(cubic(A, c1, c2, B, k / 48))
  }
  return poly(ring)
}
const sparkle = (cx, cy, rx, ry = rx, o = {}) => star(cx, cy, rx, ry, { n: 4, ...o })
// Raggi ad ago: ogni raggio va dalla punta a una valle vicina al centro con un lato
// leggermente concavo, cosi' il raggio e' sottilissimo in punta e si apre solo al centro.
function needles(cx, cy, r, { n = 8, inner = 0.07, alt = 1, rotate = 0, concave = 0.35 } = {}) {
  const ring = []
  const pt = (rr, a) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]
  for (let i = 0; i < n; i++) {
    const a = i * 2 * Math.PI / n - Math.PI / 2 + rad(rotate), am = a + Math.PI / n
    const R = r * (i % 2 ? alt : 1), A = pt(R, a), P = pt(r * inner, am), An = pt(r * ((i + 1) % 2 ? alt : 1), a + 2 * Math.PI / n)
    // lato punta -> valle: controllo spostato verso l'asse del raggio (concavo)
    const q1 = lerp(lerp(A, P, 0.6), pt(R * 0.4, a), concave)
    const q2 = lerp(lerp(An, P, 0.6), pt(r * ((i + 1) % 2 ? alt : 1) * 0.4, a + 2 * Math.PI / n), concave)
    for (let k = 0; k < 32; k++) { const t = k / 32, u = 1 - t; ring.push([u * u * A[0] + 2 * u * t * q1[0] + t * t * P[0], u * u * A[1] + 2 * u * t * q1[1] + t * t * P[1]]) }
    for (let k = 0; k < 32; k++) { const t = k / 32, u = 1 - t; ring.push([u * u * P[0] + 2 * u * t * q2[0] + t * t * An[0], u * u * P[1] + 2 * u * t * q2[1] + t * t * An[1]]) }
  }
  return poly(ring)
}
const burst = (cx, cy, r, o = {}) => needles(cx, cy, r, { n: 8, ...o })
const cross = (cx, cy, r, o = {}) => needles(cx, cy, r, { n: 4, rotate: 45, inner: 0.1, ...o })
// Stella a 5 punte piena (lati dritti).
function star5(cx, cy, r, { inner = 0.42 } = {}) {
  const ring = []
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * inner : r
    ring.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)])
  }
  return poly(ring)
}

function dot(cx, cy, r) {
  const ring = []
  for (let i = 0; i < 48; i++) ring.push([cx + r * Math.cos(i / 48 * 2 * Math.PI), cy + r * Math.sin(i / 48 * 2 * Math.PI)])
  return poly(ring)
}

// Pennellata lungo un'ellisse inclinata, da a0 a a1 gradi (90 = davanti/in basso).
// Linework: si gonfia davanti (wf), si assottiglia dietro (wb) e chiude
// SEMPRE in punta d'ago alle due estremita' (needle = quota di arco rastremata).
function stroke(cx, cy, rx, ry, a0, a1, { wf = 5.5, wb = 0.8, tilt = -12, needle = 0.3, swell = 1.6 } = {}) {
  const N = 220, outer = [], inner = []
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = rad(a0 + (a1 - a0) * t)
    const e = Math.min(1, Math.min(t, 1 - t) / needle)
    const ease = Math.pow(Math.sin(e * Math.PI / 2), 1.4)
    const w = ease * (wb + (wf - wb) * Math.pow((1 + Math.sin(a)) / 2, swell))
    const nx = Math.cos(a) / rx, ny = Math.sin(a) / ry, nl = Math.hypot(nx, ny)
    const px = cx + rx * Math.cos(a), py = cy + ry * Math.sin(a)
    outer.push(rotP([px + nx / nl * w / 2, py + ny / nl * w / 2], cx, cy, tilt))
    inner.push(rotP([px - nx / nl * w / 2, py - ny / nl * w / 2], cx, cy, tilt))
  }
  return poly([...outer, ...inner.reverse().slice(1, -1)])
}

// Orbita attorno a una stella: un'unica pennellata che passa davanti alla stella
// e si apre dietro (attorno a 270 gradi) con due punte d'ago, come nel riferimento.
const ring = (cx, cy, rx, ry, { gap = 22, at = 270, ...o } = {}) => stroke(cx, cy, rx, ry, at + gap - 360, at - gap, o)

const union = (...g) => pc.union(...g.filter(x => x && x.length))

// ── Output path ───────────────────────────────────────────────────────────
function rdp(pts, eps) {
  if (pts.length < 3) return pts
  const [a, b] = [pts[0], pts[pts.length - 1]]
  let max = 0, idx = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9
    const d = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / L
    if (d > max) { max = d; idx = i }
  }
  if (max <= eps) return [a, b]
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)]
}
const n2 = v => String(Math.round(v * 100) / 100)
const ringArea = r => Math.abs(r.reduce((a, p, i) => { const q = r[(i + 1) % r.length]; return a + p[0] * q[1] - q[0] * p[1] }, 0) / 2)
function toPath(geom, eps = 0.035) {
  // scarto i frammenti minuscoli lasciati dai tagli degli intrecci
  const polys = (typeof geom[0][0][0] === 'number' ? [geom] : geom).filter(p => ringArea(p[0]) > eps * 30)
  return polys.flatMap(p => p.map(ring => {
    // anello chiuso: lo spezzo nel punto piu' lontano dall'inizio, poi RDP sulle due meta'
    const r = ring.slice(0, -1)
    let far = 0
    r.forEach((p, i) => { if (Math.hypot(p[0] - r[0][0], p[1] - r[0][1]) > Math.hypot(r[far][0] - r[0][0], r[far][1] - r[0][1])) far = i })
    const pts = [...rdp(r.slice(0, far + 1), eps).slice(0, -1), ...rdp([...r.slice(far), r[0]], eps).slice(0, -1)]
    return 'M' + pts.map(([x, y]) => `${n2(x)} ${n2(y)}`).join('L') + 'Z'
  })).join('')
}

// ── Composizioni ──────────────────────────────────────────────────────────
const SHAPES = {
  'Sparkle':        union(sparkle(50, 50, 36, 48, { pinch: 0.08 })),
  'Sparkle Tall':   union(sparkle(50, 50, 20, 48, { pinch: 0.12 })),
  'Sparkle Duo':    union(sparkle(40, 58, 28, 38, { pinch: 0.08 }), sparkle(80, 22, 12, 16)),
  'Sparkle Trio':   union(sparkle(42, 52, 20, 46, { pinch: 0.12 }), sparkle(76, 22, 10, 15), sparkle(18, 84, 7, 10)),
  'Sparkle Cross':  union(sparkle(38, 44, 18, 42, { pinch: 0.12 }), sparkle(66, 60, 14, 34, { pinch: 0.12 })),
  'Sparkle X':      union(cross(58, 42, 42), cross(20, 76, 16, { inner: 0.13 })),
  'Starburst':      union(burst(50, 50, 47)),
  'Starburst Alt':  union(burst(50, 50, 47, { alt: 0.58 })),
  'Burst Cluster':  union(burst(42, 44, 38, { alt: 0.62 }), sparkle(80, 76, 10, 14)),
  'Star Solid':     union(star5(50, 53, 46)),
  'Orbit Swoosh':   union(stroke(50, 46, 46, 16, 20, 300, { wf: 7, wb: 0.8 })),
  'Orbit Dust':     union(stroke(50, 58, 46, 15, 20, 300, { wf: 7, wb: 0.8 }), sparkle(55, 22, 6, 10), sparkle(68, 20, 4, 7), dot(43, 23, 1.8)),
  'Orbit Open':     union(stroke(50, 46, 46, 17, 15, 205, { wf: 7, wb: 0.8 }), stroke(50, 46, 46, 17, 222, 335, { wf: 4, wb: 0.8, needle: 0.45 }), sparkle(54, 70, 6, 11), sparkle(66, 65, 4, 7)),
  'Comet Trail':    union(stroke(50, 52, 46, 15, 25, 305, { wf: 6.5, wb: 0.6, tilt: -16 }), sparkle(80, 20, 6, 10), sparkle(14, 80, 4, 7)),
  'Saturn Sparkle': union(sparkle(50, 50, 15, 48, { pinch: 0.12 }), ring(50, 54, 46, 14, { gap: 16 })),
  'Saturn Burst':   union(burst(50, 47, 42, { alt: 0.55 }), ring(50, 56, 46, 14, { gap: 14 })),
  'Orbit Twin':     union(sparkle(40, 52, 14, 40, { pinch: 0.12 }), sparkle(62, 38, 10, 28, { pinch: 0.12 }), ring(50, 56, 45, 14, { gap: 26, at: 265 })),
  'Orbit X':        union(cross(56, 40, 34), ring(50, 58, 46, 15, { gap: 30, at: 280 }), cross(18, 30, 12, { inner: 0.13 })),
  'Halo Sparkle':   union(sparkle(46, 46, 14, 44, { pinch: 0.12 }), ring(47, 54, 44, 13, { gap: 16 }), sparkle(78, 82, 6, 11)),
  'Atom Sparkle':   union(sparkle(50, 50, 14, 46, { pinch: 0.12 }), ring(50, 50, 44, 17, { tilt: 24, gap: 14, wf: 5, wb: 0.6 }), ring(50, 50, 44, 17, { tilt: -24, gap: 14, wf: 5, wb: 0.6 }), sparkle(36, 72, 6, 10)),
  'Shooting Star':  union(star5(52, 54, 26), stroke(50, 52, 46, 14, 20, 300, { wf: 6.5, wb: 0.6, tilt: -18 }), sparkle(80, 22, 5, 9), sparkle(18, 74, 4, 7)),
  'Orbit Star':     union(star5(50, 47, 32), ring(50, 58, 46, 14, { gap: 20 })),
  'Twinkle Field':  union(sparkle(28, 32, 12, 20), sparkle(70, 26, 7, 11), sparkle(62, 68, 16, 26), sparkle(20, 80, 5, 8), dot(46, 52, 1.8)),
  'Dot Sparkle':    union(sparkle(50, 50, 28, 42, { pinch: 0.08 }), dot(84, 16, 3.2), dot(16, 84, 2.4)),
}

// ── ICONE (viewBox 24, piene come le forme: stesso linework, scala 0.24) ───
const ICON_FROM = { Sparkle: 'Sparkle', Sparkles: 'Sparkle Duo', Twinkle: 'Twinkle Field', Orbit: 'Saturn Sparkle', Comet: 'Comet Trail', Starburst: 'Starburst', Star: 'Star Solid', Atom: 'Atom Sparkle' }
const scaleGeom = (g, k) => g.map(p => p.map(r => r.map(([x, y]) => [x * k, y * k])))

// ── Scrittura ──────────────────────────────────────────────────────────────
const list = Object.entries(SHAPES).map(([name, g]) => ({ name, path: toPath(g) }))
const ICONS = Object.entries(ICON_FROM).map(([name, src]) => ({ name, path: toPath(scaleGeom(SHAPES[src], 0.24), 0.01) }))
const ts = `// AUTO-GENERATO da scripts/generate-celestial.mjs — non modificare a mano.
// Set "Celestial": sparkle, starburst e orbite. Forme piene (fill), viewBox 100.

export const CELESTIAL_CATEGORY = 'CELESTIAL (Sparkle & Orbit)'

export const CELESTIAL_SHAPES: { name: string; path: string }[] = [
${list.map(x => `  { name: ${JSON.stringify(x.name)}, path: ${JSON.stringify(x.path)} },`).join('\n')}
]

// Icone piene, viewBox 24: vanno disegnate con fill (non stroke).
export const CELESTIAL_ICONS: { name: string; path: string }[] = [
${ICONS.map(x => `  { name: ${JSON.stringify(x.name)}, path: ${JSON.stringify(x.path)} },`).join('\n')}
]
`
writeFileSync('src/components/studio/libraries/celestial-library.ts', ts)

const dir = 'public/assets/elements/celestial'
mkdirSync(dir, { recursive: true })
const slug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-')
for (const x of list)
  writeFileSync(`${dir}/${slug(x.name)}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${x.path}" fill="currentColor"/></svg>\n`)
for (const x of ICONS)
  writeFileSync(`${dir}/icon-${slug(x.name)}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${x.path}" fill="currentColor"/></svg>\n`)

const cols = 6, cell = 120, rows = Math.ceil(list.length / cols)
const cells = list.map((x, i) => `<g transform="translate(${(i % cols) * cell + 10} ${Math.floor(i / cols) * cell + 10})"><path d="${x.path}"/></g>`).join('')
writeFileSync(`${dir}/_master-sheet.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * cell} ${rows * cell}" fill="currentColor">${cells}</svg>\n`)
console.log(`${list.length} forme, ${ICONS.length} icone, ${Math.round(ts.length / 1024)} KB`)
