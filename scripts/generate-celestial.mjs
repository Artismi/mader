// Genera il set "Celestial" (sparkle, starburst, orbite) per la libreria forme.
// Output: src/components/studio/libraries/celestial-library.ts + SVG in public/assets/elements/celestial/
// Uso: node scripts/generate-celestial.mjs
import { writeFileSync, mkdirSync } from 'node:fs'

const r1 = n => Math.round(n * 10) / 10
const fmt = (x, y) => `${r1(x)} ${r1(y)}`
const rot = (x, y, cx, cy, deg) => {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]
}
const area = pts => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1] }, 0) / 2

// Sparkle a 4 punte con lati concavi. rx/ry = semi-assi, k = "pancia" vicino al centro.
function sparkle(cx, cy, rx, ry = rx, { k = 0.1, rotate = 0 } = {}) {
  const kk = Math.min(rx, ry) * k
  const tips = [[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]]
  const ctrls = [[cx + kk, cy - kk], [cx + kk, cy + kk], [cx - kk, cy + kk], [cx - kk, cy - kk]]
  const R = p => rot(p[0], p[1], cx, cy, rotate)
  let d = `M ${fmt(...R(tips[0]))}`
  for (let i = 0; i < 4; i++) d += ` Q ${fmt(...R(ctrls[i]))} ${fmt(...R(tips[(i + 1) % 4]))}`
  return d + ' Z'
}

// Stella a n raggi sottili (starburst); raggi alterni lunghi/corti se alt < 1.
function burst(cx, cy, r, { n = 8, inner = 0.14, alt = 1, rotate = 0 } = {}) {
  const pts = []
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI / n) - Math.PI / 2 + rotate * Math.PI / 180
    const rr = i % 2 ? r * inner : r * ((i / 2) % 2 ? alt : 1)
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)])
  }
  return 'M ' + pts.map(p => fmt(...p)).join(' L ') + ' Z'
}

// Stella classica a 5 punte.
function star5(cx, cy, r, { inner = 0.42, rotate = 0 } = {}) {
  return burst(cx, cy, r, { n: 5, inner, rotate })
}

const dot = (cx, cy, r) => `M ${fmt(cx - r, cy)} A ${r1(r)} ${r1(r)} 0 1 0 ${fmt(cx + r, cy)} A ${r1(r)} ${r1(r)} 0 1 0 ${fmt(cx - r, cy)} Z`

// Arco di orbita rastremato (swoosh) lungo un'ellisse inclinata, da a0 a a1 gradi.
// L'ellisse e' in coordinate schermo: angoli 0..180 = meta' frontale (in basso).
function swoosh(cx, cy, rx, ry, a0, a1, { w = 5, tilt = -12, steps = 28, taper = 0.8 } = {}) {
  const outer = [], inner = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = (a0 + (a1 - a0) * t) * Math.PI / 180
    const th = w * Math.pow(Math.sin(Math.PI * t), taper)
    const nx = Math.cos(a) / rx, ny = Math.sin(a) / ry, nl = Math.hypot(nx, ny)
    const px = cx + rx * Math.cos(a), py = cy + ry * Math.sin(a)
    outer.push(rot(px + nx / nl * th / 2, py + ny / nl * th / 2, cx, cy, tilt))
    inner.push(rot(px - nx / nl * th / 2, py - ny / nl * th / 2, cx, cy, tilt))
  }
  let pts = [...outer, ...inner.reverse().slice(1, -1)]
  if (area(pts) < 0) pts = pts.reverse()  // stesso verso degli altri subpath (nonzero = unione)
  return smoothClosed(pts)
}

// Catmull-Rom chiuso -> cubiche, con le due punte del crescente lasciate appuntite.
function smoothClosed(pts) {
  const n = pts.length, P = i => pts[(i + n) % n]
  let d = `M ${fmt(...P(0))}`
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2)
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${fmt(...c1)} ${fmt(...c2)} ${fmt(...p2)}`
  }
  return d + ' Z'
}

// Orbita completa con varchi "dietro" (meta' superiore) dove passa la stella.
function orbit(cx, cy, rx, ry, { w = 6, tilt = -12, gap = 18, back = 0.55 } = {}) {
  return [
    swoosh(cx, cy, rx, ry, -8, 188, { w, tilt }),
    swoosh(cx, cy, rx, ry, 196, 270 - gap, { w: w * back, tilt }),
    swoosh(cx, cy, rx, ry, 270 + gap, 352, { w: w * back, tilt }),
  ].join(' ')
}

const s = (...parts) => parts.join(' ')

const SHAPES = [
  { name: 'Sparkle',           path: sparkle(50, 50, 40, 46) },
  { name: 'Sparkle Tall',      path: sparkle(50, 50, 22, 48, { k: 0.12 }) },
  { name: 'Sparkle Duo',       path: s(sparkle(40, 58, 32, 36), sparkle(78, 24, 15, 17)) },
  { name: 'Sparkle Trio',      path: s(sparkle(42, 52, 22, 46, { k: 0.12 }), sparkle(76, 24, 12, 18), sparkle(18, 82, 8, 12)) },
  { name: 'Sparkle Cross',     path: s(sparkle(40, 46, 20, 40, { k: 0.12 }), sparkle(66, 58, 16, 32, { k: 0.12 })) },
  { name: 'Sparkle X',         path: s(burst(58, 42, 42, { n: 4, inner: 0.1, rotate: 45 }), burst(20, 74, 17, { n: 4, inner: 0.14, rotate: 45 })) },
  { name: 'Starburst',         path: burst(50, 50, 46, { n: 8, inner: 0.12 }) },
  { name: 'Starburst Alt',     path: burst(50, 50, 46, { n: 8, inner: 0.12, alt: 0.62 }) },
  { name: 'Burst Cluster',     path: s(burst(40, 46, 38, { n: 8, inner: 0.12, alt: 0.7 }), sparkle(80, 74, 12, 16)) },
  { name: 'Burst Spark',       path: s(burst(62, 52, 34, { n: 8, inner: 0.12 }), sparkle(20, 34, 10, 16)) },
  { name: 'Star Solid',        path: star5(50, 53, 46) },
  { name: 'Orbit Swoosh',      path: swoosh(50, 50, 46, 16, 160, 380, { w: 7 }) },
  { name: 'Orbit Open',        path: s(swoosh(50, 52, 46, 18, 150, 300, { w: 6 }), swoosh(50, 52, 46, 18, 312, 380, { w: 5 }), sparkle(58, 66, 8, 14), sparkle(70, 60, 5, 8)) },
  { name: 'Orbit Dust',        path: s(swoosh(50, 54, 46, 16, 150, 380, { w: 7 }), sparkle(54, 18, 7, 11), sparkle(70, 17, 5, 8), dot(41, 19, 2.2)) },
  { name: 'Comet Trail',       path: s(swoosh(50, 52, 46, 16, 160, 390, { w: 6, tilt: -16 }), sparkle(76, 22, 7, 11), sparkle(16, 76, 5, 8)) },
  { name: 'Saturn Sparkle',    path: s(orbit(50, 54, 46, 15, { w: 7, gap: 10 }), sparkle(50, 50, 16, 48, { k: 0.12 })) },
  { name: 'Saturn Burst',      path: s(orbit(50, 56, 46, 15, { w: 7, gap: 10 }), burst(52, 46, 40, { n: 8, inner: 0.12, alt: 0.55 })) },
  { name: 'Orbit Twin',        path: s(orbit(52, 56, 44, 15, { w: 6, gap: 22 }), sparkle(42, 54, 14, 40, { k: 0.12 }), sparkle(62, 38, 10, 28, { k: 0.12 })) },
  { name: 'Orbit X',           path: s(swoosh(50, 64, 46, 15, -10, 230, { w: 7 }), burst(58, 40, 34, { n: 4, inner: 0.1, rotate: 45 }), burst(22, 40, 13, { n: 4, inner: 0.14, rotate: 45 })) },
  { name: 'Halo Sparkle',      path: s(orbit(46, 56, 44, 14, { w: 7, gap: 14 }), sparkle(46, 48, 14, 44, { k: 0.12 }), sparkle(66, 82, 7, 14)) },
  { name: 'Atom Sparkle',      path: s(swoosh(50, 52, 46, 20, -160, 160, { w: 5, tilt: 22, taper: 0.5 }), swoosh(50, 52, 46, 20, 20, 340, { w: 5, tilt: -22, taper: 0.5 }), sparkle(54, 46, 14, 44, { k: 0.12 }), sparkle(40, 68, 8, 14)) },
  { name: 'Shooting Star',     path: s(swoosh(50, 50, 46, 14, 160, 330, { w: 7, tilt: -20 }), star5(52, 58, 28), sparkle(74, 26, 6, 9), sparkle(22, 66, 5, 8)) },
  { name: 'Twinkle Field',     path: s(sparkle(30, 34, 14, 22), sparkle(70, 30, 8, 12), sparkle(62, 70, 18, 26), sparkle(22, 78, 6, 9), dot(48, 52, 2.2)) },
  { name: 'Dot Sparkle',       path: s(sparkle(50, 50, 30, 42), dot(84, 18, 4), dot(16, 84, 3)) },
]

// ── ICONE (viewBox 24, stroke, stile lucide) ───────────────────────────────
const ICONS = [
  { name: 'Sparkle',  path: 'M 12 3 Q 12.8 11.2 21 12 Q 12.8 12.8 12 21 Q 11.2 12.8 3 12 Q 11.2 11.2 12 3 Z' },
  { name: 'Sparkles', path: 'M 10 4 Q 10.7 10.3 17 11 Q 10.7 11.7 10 18 Q 9.3 11.7 3 11 Q 9.3 10.3 10 4 Z M 18.5 3 V 7 M 16.5 5 H 20.5 M 18 16 V 20 M 16 18 H 20' },
  { name: 'Orbit',    path: 'M 5 9.5 C 2 11 1.5 13 3.5 14.2 C 6.5 16 16 15 20 12.8 C 22.5 11.4 22 9.6 19 9.2 M 12 4 Q 12.5 9.5 15.5 10 Q 12.5 10.5 12 16 Q 11.5 10.5 8.5 10 Q 11.5 9.5 12 4 Z M 18 17.5 V 20.5 M 16.5 19 H 19.5' },
  { name: 'Saturn',   path: 'M 12 2.5 Q 12.6 11.4 15 12 Q 12.6 12.6 12 21.5 Q 11.4 12.6 9 12 Q 11.4 11.4 12 2.5 Z M 7 10.5 C 3 11.5 1.5 13.5 3.5 14.8 C 6 16.4 15 15.6 19.5 13.5 C 22.5 12 22 10 17 10.2' },
  { name: 'Comet',    path: 'M 2.5 17 C 6 20 15 18 21 12.5 M 18 3.5 Q 18.4 7.6 22 8 Q 18.4 8.4 18 12 Q 17.6 8.4 14 8 Q 17.6 7.6 18 3.5 Z M 5 9 V 12 M 3.5 10.5 H 6.5' },
  { name: 'Starburst',path: 'M 12 2 V 22 M 2 12 H 22 M 5 5 L 19 19 M 19 5 L 5 19' },
  { name: 'Star',     path: 'M 12 2.5 L 14.8 8.6 L 21.5 9.3 L 16.5 13.8 L 17.9 20.5 L 12 17.1 L 6.1 20.5 L 7.5 13.8 L 2.5 9.3 L 9.2 8.6 Z' },
  { name: 'Twinkle',  path: 'M 8 3 Q 8.5 8.5 13 9 Q 8.5 9.5 8 15 Q 7.5 9.5 3 9 Q 7.5 8.5 8 3 Z M 17 12 Q 17.4 16.1 21 16.5 Q 17.4 16.9 17 21 Q 16.6 16.9 13 16.5 Q 16.6 16.1 17 12 Z' },
]

// ── Scrittura ──────────────────────────────────────────────────────────────
const ts = `// AUTO-GENERATO da scripts/generate-celestial.mjs — non modificare a mano.
// Set "Celestial": sparkle, starburst e orbite. Forme piene (fill), viewBox 100.

export const CELESTIAL_CATEGORY = 'CELESTIAL (Sparkle & Orbit)'

export const CELESTIAL_SHAPES: { name: string; path: string }[] = [
${SHAPES.map(x => `  { name: ${JSON.stringify(x.name)}, path: ${JSON.stringify(x.path)} },`).join('\n')}
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
for (const x of SHAPES)
  writeFileSync(`${dir}/${slug(x.name)}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${x.path}" fill="currentColor"/></svg>\n`)
for (const x of ICONS)
  writeFileSync(`${dir}/icon-${slug(x.name)}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="${x.path}"/></svg>\n`)

// Master sheet: tutte le forme in griglia 6 colonne.
const cols = 6, cell = 120, rows = Math.ceil(SHAPES.length / cols)
const cells = SHAPES.map((x, i) => `<g transform="translate(${(i % cols) * cell + 10} ${Math.floor(i / cols) * cell + 10})"><path d="${x.path}"/></g>`).join('')
writeFileSync(`${dir}/_master-sheet.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * cell} ${rows * cell}" fill="currentColor">${cells}</svg>\n`)
console.log(`${SHAPES.length} forme, ${ICONS.length} icone`)
