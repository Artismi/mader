// Genera il set "Celestial" (sparkle, starburst, orbite) per la libreria forme.
// Ogni forma e' UNA sagoma pulita: le primitive vengono campionate in poligoni,
// unite/tagliate con operazioni booleane (polygon-clipping) e semplificate.
// Gli incroci stella/orbita sono "intrecciati": l'arco frontale taglia la stella,
// la stella taglia l'arco posteriore, con un piccolo varco netto.
// Output: src/components/studio/libraries/celestial-library.ts + SVG in public/assets/elements/celestial/
// Uso: node scripts/generate-celestial.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
const pc = createRequire(import.meta.url)('polygon-clipping')

const GAP = 1.6 // varco degli intrecci (unita' viewBox 100)
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

// Sparkle a 4 punte, lati concavi. s = quanto e' "magro" (piu' basso = piu' sottile).
function sparkle(cx, cy, rx, ry = rx, { s = 0.1, rotate = 0, grow = 0 } = {}) {
  rx += grow; ry += grow
  const pinch = Math.max(s * Math.min(rx, ry), 0.6) + grow * 0.7
  const tips = [[0, -ry], [rx, 0], [0, ry], [-rx, 0]]
  const pin = [[pinch, -pinch], [pinch, pinch], [-pinch, pinch], [-pinch, -pinch]]
  const ring = []
  for (let i = 0; i < 4; i++) {
    const A = tips[i], B = tips[(i + 1) % 4], P = pin[i]
    const c1 = lerp(A, P, 0.82), c2 = lerp(B, P, 0.82)
    for (let k = 0; k < 40; k++) {
      const [x, y] = cubic(A, c1, c2, B, k / 40)
      ring.push(rotP([cx + x, cy + y], cx, cy, rotate))
    }
  }
  return poly(ring)
}

// Starburst: n raggi sottili; alt = lunghezza relativa dei raggi alterni.
function burst(cx, cy, r, { n = 8, inner = 0.07, alt = 1, rotate = 0, grow = 0 } = {}) {
  const ring = []
  for (let i = 0; i < n * 2; i++) {
    const a = i * Math.PI / n - Math.PI / 2 + rad(rotate)
    const rr = i % 2 ? r * inner + grow : r * ((i / 2) % 2 ? alt : 1) + grow
    ring.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)])
  }
  return poly(ring)
}
const star5 = (cx, cy, r, o = {}) => burst(cx, cy, r, { n: 5, inner: 0.4, ...o })

function dot(cx, cy, r) {
  const ring = []
  for (let i = 0; i < 48; i++) ring.push([cx + r * Math.cos(i / 48 * 2 * Math.PI), cy + r * Math.sin(i / 48 * 2 * Math.PI)])
  return poly(ring)
}

// Arco d'orbita su ellisse inclinata, da a0 a a1 (gradi; 0..180 = davanti/in basso).
// Spessore: wf davanti, wb dietro, con punte rastremate alle estremita'.
function arc(cx, cy, rx, ry, a0, a1, { wf = 3.2, wb = 1.8, tilt = -12, tip = 0.22, grow = 0, from = a0, to = a1 } = {}) {
  const N = 160, outer = [], inner = []
  for (let i = 0; i <= N; i++) {
    const t = i / N, deg = from + (to - from) * t, a = rad(deg)
    const tt = (deg - a0) / (a1 - a0)
    const ease = Math.sin(Math.min(1, Math.min(tt, 1 - tt) / tip) * Math.PI / 2)
    const w = ease * (wb + (wf - wb) * (1 + Math.sin(a)) / 2) + grow * 2
    const nx = Math.cos(a) / rx, ny = Math.sin(a) / ry, nl = Math.hypot(nx, ny)
    const px = cx + rx * Math.cos(a), py = cy + ry * Math.sin(a)
    outer.push(rotP([px + nx / nl * w / 2, py + ny / nl * w / 2], cx, cy, tilt))
    inner.push(rotP([px - nx / nl * w / 2, py - ny / nl * w / 2], cx, cy, tilt))
  }
  return poly([...outer, ...inner.reverse()])
}

// Orbita intrecciata attorno a un "corpo" (stella). body(grow) -> Polygon.
// Ritorna { add, cut } da passare a compose.
function orbitAround(o, body, extra = {}) {
  const { cx, cy, rx, ry, a0 = -160, a1 = 160, ...opt } = { ...o, ...extra }
  const front = arc(cx, cy, rx, ry, a0, a1, { ...opt, from: Math.max(a0, 0), to: Math.min(a1, 180) })
  const frontX = arc(cx, cy, rx, ry, a0, a1, { ...opt, from: Math.max(a0, 0), to: Math.min(a1, 180), grow: GAP })
  const backL = a0 < 0 ? pc.difference(arc(cx, cy, rx, ry, a0, a1, { ...opt, from: a0, to: 0 }), body(GAP)) : []
  const backR = a1 > 180 ? pc.difference(arc(cx, cy, rx, ry, a0, a1, { ...opt, from: 180, to: a1 }), body(GAP)) : []
  return { front, frontX, back: [...backL, ...backR] }
}

// Unisce le parti; ogni "cut" sottrae dalle parti indicate.
const union = (...g) => pc.union(...g.filter(x => x && x.length))
function interlace(bodyFn, orbits, extras = []) {
  let body = bodyFn(0)
  for (const o of orbits) body = pc.difference(body, o.frontX)
  return union(body, ...orbits.flatMap(o => [o.front, o.back]), ...extras)
}

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
function toPath(geom) {
  // scarto i frammenti minuscoli lasciati dai tagli degli intrecci
  const polys = (typeof geom[0][0][0] === 'number' ? [geom] : geom).filter(p => ringArea(p[0]) > 3)
  return polys.flatMap(p => p.map(ring => {
    // anello chiuso: lo spezzo nel punto piu' lontano dall'inizio, poi RDP sulle due meta'
    const r = ring.slice(0, -1)
    let far = 0
    r.forEach((p, i) => { if (Math.hypot(p[0] - r[0][0], p[1] - r[0][1]) > Math.hypot(r[far][0] - r[0][0], r[far][1] - r[0][1])) far = i })
    const pts = [...rdp(r.slice(0, far + 1), 0.035).slice(0, -1), ...rdp([...r.slice(far), r[0]], 0.035).slice(0, -1)]
    return 'M' + pts.map(([x, y]) => `${n2(x)} ${n2(y)}`).join('L') + 'Z'
  })).join('')
}

// ── Composizioni ──────────────────────────────────────────────────────────
const S = (cx, cy, rx, ry, o = {}) => g => sparkle(cx, cy, rx, ry, { ...o, grow: g })
const B = (cx, cy, r, o = {}) => g => burst(cx, cy, r, { ...o, grow: g })
const ST = (cx, cy, r, o = {}) => g => star5(cx, cy, r, { ...o, grow: g })

const SHAPES = {
  'Sparkle':        union(sparkle(50, 50, 36, 48, { s: 0.1 })),
  'Sparkle Tall':   union(sparkle(50, 50, 18, 48, { s: 0.12 })),
  'Sparkle Duo':    union(sparkle(40, 58, 28, 38), sparkle(80, 22, 12, 16)),
  'Sparkle Trio':   union(sparkle(42, 52, 18, 46, { s: 0.12 }), sparkle(76, 22, 10, 15), sparkle(18, 84, 7, 10)),
  'Sparkle Cross':  union(sparkle(38, 44, 18, 42, { s: 0.11 }), sparkle(66, 60, 14, 34, { s: 0.11 })),
  'Sparkle X':      union(burst(58, 42, 40, { n: 4, inner: 0.06, rotate: 45 }), burst(20, 76, 15, { n: 4, inner: 0.08, rotate: 45 })),
  'Starburst':      union(burst(50, 50, 47, { n: 8, inner: 0.075 })),
  'Starburst Alt':  union(burst(50, 50, 47, { n: 8, inner: 0.075, alt: 0.6 })),
  'Burst Cluster':  union(burst(42, 44, 38, { n: 8, inner: 0.06, alt: 0.62 }), sparkle(80, 76, 10, 14)),
  'Star Solid':     union(star5(50, 53, 46)),
  'Orbit Swoosh':   union(arc(50, 50, 46, 15, 160, 380, { wf: 3.6, wb: 2.4 })),
  'Orbit Dust':     union(arc(50, 56, 46, 15, 150, 385, { wf: 3.6, wb: 2.4 }), sparkle(55, 22, 6, 10), sparkle(68, 20, 4, 7), dot(43, 23, 1.6)),
  'Orbit Open':     union(arc(50, 50, 46, 17, 150, 290, { wf: 3.4, wb: 2.4 }), arc(50, 50, 46, 17, 305, 385, { wf: 3.4, wb: 2.4 }), sparkle(54, 70, 6, 11), sparkle(66, 65, 4, 7)),
  'Comet Trail':    union(arc(50, 52, 46, 15, 165, 385, { wf: 3.4, wb: 2.2, tilt: -16 }), sparkle(80, 20, 6, 10), sparkle(14, 80, 4, 7)),
  'Saturn Sparkle': interlace(S(50, 50, 14, 48, { s: 0.12 }), [orbitAround({ cx: 50, cy: 54, rx: 46, ry: 14 }, S(50, 50, 14, 48, { s: 0.12 }))]),
  'Saturn Burst':   interlace(B(50, 47, 42, { n: 8, inner: 0.06, alt: 0.55 }), [orbitAround({ cx: 50, cy: 56, rx: 46, ry: 14 }, B(50, 47, 42, { n: 8, inner: 0.06, alt: 0.55 }))]),
  'Orbit Twin':     (() => {
    const body = g => union(sparkle(40, 52, 13, 40, { s: 0.12, grow: g }), sparkle(62, 38, 9, 28, { s: 0.12, grow: g }))
    return interlace(body, [orbitAround({ cx: 50, cy: 56, rx: 45, ry: 14 }, body)])
  })(),
  'Orbit X':        (() => {
    const body = g => union(burst(56, 40, 32, { n: 4, inner: 0.06, rotate: 45, grow: g }))
    return interlace(body, [orbitAround({ cx: 50, cy: 58, rx: 46, ry: 15, a0: -150, a1: 165 }, body)], [burst(18, 30, 11, { n: 4, inner: 0.08, rotate: 45 })])
  })(),
  'Halo Sparkle':   interlace(S(46, 46, 13, 44, { s: 0.12 }), [orbitAround({ cx: 47, cy: 54, rx: 44, ry: 13 }, S(46, 46, 13, 44, { s: 0.12 }))], [sparkle(78, 82, 6, 11)]),
  'Atom Sparkle':   (() => {
    const body = S(50, 50, 13, 46, { s: 0.12 })
    const o1 = orbitAround({ cx: 50, cy: 50, rx: 44, ry: 17, tilt: 24, wf: 3, wb: 1.8 }, body)
    const o2 = orbitAround({ cx: 50, cy: 50, rx: 44, ry: 17, tilt: -24, wf: 3, wb: 1.8 }, body)
    // dove le due orbite si incrociano, la seconda passa sotto la prima
    const o1X = union(o1.frontX, arc(50, 50, 44, 17, -160, 160, { tilt: 24, wf: 3, wb: 1.8, grow: GAP }))
    o2.front = pc.difference(o2.front, o1X); o2.back = pc.difference(o2.back, o1X)
    return interlace(body, [o1, o2])
  })(),
  'Shooting Star':  (() => {
    const body = ST(52, 56, 26)
    return interlace(body, [orbitAround({ cx: 50, cy: 52, rx: 46, ry: 14, tilt: -18, a0: -130, a1: 150 }, body)], [sparkle(80, 22, 5, 9), sparkle(18, 72, 4, 7)])
  })(),
  'Orbit Star':     interlace(ST(50, 47, 32), [orbitAround({ cx: 50, cy: 58, rx: 46, ry: 14 }, ST(50, 47, 32))]),
  'Twinkle Field':  union(sparkle(28, 32, 12, 20), sparkle(70, 26, 7, 11), sparkle(62, 68, 16, 26), sparkle(20, 80, 5, 8), dot(46, 52, 1.8)),
  'Dot Sparkle':    union(sparkle(50, 50, 28, 42), dot(84, 16, 3.2), dot(16, 84, 2.4)),
}

// ── ICONE (viewBox 24, tratto 2 come ICONS_LIBRARY) ────────────────────────
// Sparkle a tratto: lati concavi con cubiche, punte nette.
const isp = (cx, cy, rx, ry, p = 0.18) => {
  const P = Math.min(rx, ry) * p
  const side = (ax, ay, bx, by, px, py) => `C ${n2(ax + (px - ax) * 0.8)} ${n2(ay + (py - ay) * 0.8)} ${n2(bx + (px - bx) * 0.8)} ${n2(by + (py - by) * 0.8)} ${n2(bx)} ${n2(by)}`
  return `M ${n2(cx)} ${n2(cy - ry)} ` +
    side(cx, cy - ry, cx + rx, cy, cx + P, cy - P) + ' ' + side(cx + rx, cy, cx, cy + ry, cx + P, cy + P) + ' ' +
    side(cx, cy + ry, cx - rx, cy, cx - P, cy + P) + ' ' + side(cx - rx, cy, cx, cy - ry, cx - P, cy - P) + ' Z'
}
const ICONS = [
  { name: 'Sparkle',   path: isp(12, 12, 8, 9.5) },
  { name: 'Sparkles',  path: `${isp(10, 13, 6.5, 8.5)} ${isp(18.5, 5.5, 2.5, 3.5)}` },
  { name: 'Twinkle',   path: `${isp(8.5, 9, 5, 6.5)} ${isp(16.5, 16, 4, 5.5)}` },
  { name: 'Orbit',     path: `${isp(19, 5, 3, 3.8, 0.12)} M 15.5 7.2 C 10 7.5 4.5 9.5 3 12.5 C 1.5 15.5 6 17 11.5 16 C 16.5 15 21 12.5 21 10` },
  { name: 'Comet',     path: `${isp(17, 7, 4, 4.8)} M 3 18 C 6.5 20.5 13 19.5 19 15` },
  { name: 'Starburst', path: 'M 12 2 V 22 M 2 12 H 22 M 5.6 5.6 L 18.4 18.4 M 18.4 5.6 L 5.6 18.4' },
  { name: 'Star',      path: 'M 12 2.5 L 14.8 8.6 L 21.5 9.3 L 16.5 13.8 L 17.9 20.5 L 12 17.1 L 6.1 20.5 L 7.5 13.8 L 2.5 9.3 L 9.2 8.6 Z' },
]

// ── Scrittura ──────────────────────────────────────────────────────────────
const list = Object.entries(SHAPES).map(([name, g]) => ({ name, path: toPath(g) }))
const ts = `// AUTO-GENERATO da scripts/generate-celestial.mjs — non modificare a mano.
// Set "Celestial": sparkle, starburst e orbite. Forme piene (fill), viewBox 100.

export const CELESTIAL_CATEGORY = 'CELESTIAL (Sparkle & Orbit)'

export const CELESTIAL_SHAPES: { name: string; path: string }[] = [
${list.map(x => `  { name: ${JSON.stringify(x.name)}, path: ${JSON.stringify(x.path)} },`).join('\n')}
]

// Icone a tratto, viewBox 24 (stesso formato di ICONS_LIBRARY).
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
  writeFileSync(`${dir}/icon-${slug(x.name)}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${x.path}"/></svg>\n`)

const cols = 6, cell = 120, rows = Math.ceil(list.length / cols)
const cells = list.map((x, i) => `<g transform="translate(${(i % cols) * cell + 10} ${Math.floor(i / cols) * cell + 10})"><path d="${x.path}"/></g>`).join('')
writeFileSync(`${dir}/_master-sheet.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * cell} ${rows * cell}" fill="currentColor">${cells}</svg>\n`)
console.log(`${list.length} forme, ${ICONS.length} icone, ${Math.round(ts.length / 1024)} KB`)
