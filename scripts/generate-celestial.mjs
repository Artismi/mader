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
const pcRaw = createRequire(import.meta.url)('polygon-clipping')
// polygon-clipping a volte fallisce su segmenti quasi coincidenti: in quel caso
// riprovo arrotondando le coordinate (prima a 1e-3, poi a 1e-2).
const snap = (g, q) => JSON.parse(JSON.stringify(g), (k, v) => (typeof v === 'number' ? Math.round(v / q) * q : v))
const safe = op => (...g) => {
  try { return pcRaw[op](...g) } catch {
    try { return pcRaw[op](...g.map(x => snap(x, 1e-3))) } catch { return pcRaw[op](...g.map(x => snap(x, 1e-2))) }
  }
}
const pc = { union: safe('union'), intersection: safe('intersection'), difference: safe('difference') }

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
// Starburst: raggi ad ago; dai 30 di raggio in su, raggi secondari a capello tra quelli principali.
const burst = (cx, cy, r, o = {}) => {
  const main = needles(cx, cy, r, { n: 8, ...o })
  if (r < 30) return main
  return pc.union(main, needles(cx, cy, r * 0.82, { n: 8, inner: 0.025, concave: 0.6, rotate: 22.5 + (o.rotate || 0) }))
}
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
    const e = needle > 0 ? Math.min(1, Math.min(u, 1 - u) / needle) : 1
    const w = Math.pow(Math.sin(e * Math.PI / 2), 1.4) * width(t)
    L.push([p[0] - ty * w / 2, p[1] + tx * w / 2]); R.push([p[0] + ty * w / 2, p[1] - tx * w / 2])
  }
  return poly([...L, ...R.reverse().slice(1, -1)])
}

// Orbita su ellisse inclinata da a0 a a1 gradi (90 = davanti/in basso).
// Spessa davanti (wf), sottile dietro (wb). Se ci sono corpi da evitare, l'arco
// viene spezzato dove passerebbe sopra/sotto un corpo e ogni pezzo chiude ad ago.
function orbit(cx, cy, rx, ry, a0, a1, { wf = 6.5, wb = 0.8, tilt = -12, swell = 1.6, avoid = [], minSeg = 30, needleDeg = 70, echo = null } = {}) {
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
  const main = segs.filter(([s, e]) => e - s >= minSeg).map(([s, e]) =>
    brush(t => pt(s + (e - s) * t), t => wid(s + (e - s) * t), { needle: Math.min(0.45, needleDeg / (e - s)) }))
  if (!echo) return main
  // linea d'eco a capello che accompagna il tratto davanti, all'esterno
  const ept = d => { const a = rad(d); return rotP([cx + (rx + 3) * Math.cos(a), cy + (ry + wf / 2 + 3.9) * Math.sin(a)], cx, cy, tilt) }
  const lo = Math.max(a0, echo[0]), hi = Math.min(a1, echo[1]), es = []
  let c = null
  for (let d = lo; d <= hi; d += 0.5) {
    const ok = avoid.every(b => distToGeom(ept(d), b) > BODY_GAP + 0.5)
    if (ok) { if (!c) c = [d, d]; c[1] = d } else if (c) { es.push(c); c = null }
  }
  if (c) es.push(c)
  return main.concat(es.filter(([s, e]) => e - s >= 18).map(([s, e]) => brush(t => ept(s + (e - s) * t), () => 0.8, { needle: 0.4 })))
}

// Swoosh libero su cubica (per scie e onde): p0..p3 punti di controllo.
// Il tratto e' sottile in coda (p0) e si gonfia verso la testa (p3), dove chiude ad ago.
const swoosh = (p0, p1, p2, p3, w = 6, o = {}) => brush(t => cubic(p0, p1, p2, p3, t), t => w * Math.pow(t, 1.2) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.35) + 0.4, { needle: 0.2, ...o })


// ── Fine line & flash tattoo ──────────────────────────────────────────────

// Tratto fine (fine line): spessore quasi costante, punte appena rastremate.
const fine = (at, w = 1.1, needle = 0.1) => brush(at, () => w, { needle })
const line = (a, b, w = 1.1, needle = 0.1) => fine(t => lerp(a, b, t), w, needle)
const ellAt = (cx, cy, rx, ry, d0, d1, tilt = 0) => t => { const a = rad(d0 + (d1 - d0) * t); return rotP([cx + rx * Math.cos(a), cy + ry * Math.sin(a)], cx, cy, tilt) }
const arcLine = (cx, cy, r, d0, d1, w = 1.1, o = {}) => fine(ellAt(cx, cy, r, o.ry ?? r, d0, d1, o.tilt ?? 0), w, o.needle ?? 0.1)
// Cerchio a contorno (anello sottile).
const ringO = (cx, cy, r, w = 1.2) => pc.difference(circle(cx, cy, r + w / 2, 160), circle(cx, cy, r - w / 2, 160))
// Raggio di sole: si stringe dalla base alla punta; wave > 0 lo rende una fiamma ondulata.
function ray(cx, cy, deg, r0, r1, w, { wave = 0, waves = 1.5 } = {}) {
  const a = rad(deg), d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]]
  return brush(t => {
    const r = r0 + (r1 - r0) * t, off = wave * Math.sin(t * waves * 2 * Math.PI) * (1 - t * 0.4)
    return [cx + d[0] * r + n[0] * off, cy + d[1] * r + n[1] * off]
  }, t => w * Math.pow(1 - t, 0.85) + 0.2, { needle: 0.06 })
}

// Punti di una stella (punte e valli alternate).
function starPts(cx, cy, r, { n = 5, inner = 0.42, alt = 1, rotate = 0 } = {}) {
  const pts = []
  for (let i = 0; i < n * 2; i++) {
    const a = i * Math.PI / n - Math.PI / 2 + rad(rotate)
    const rr = i % 2 ? r * inner : r * ((i / 2) % 2 ? alt : 1)
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)])
  }
  return pts
}
// Rientro (offset verso l'interno) di un poligono a lati dritti, con spigoli a punta.
function inset(pts, t) {
  const n = pts.length
  const make = sg => pts.map((p, i) => {
    const prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n]
    const e1 = [p[0] - prev[0], p[1] - prev[1]], e2 = [next[0] - p[0], next[1] - p[1]]
    const l1 = Math.hypot(...e1), l2 = Math.hypot(...e2)
    const n1 = [-e1[1] / l1 * sg, e1[0] / l1 * sg], n2 = [-e2[1] / l2 * sg, e2[0] / l2 * sg]
    // intersezione delle due rette spostate
    const a1 = [prev[0] + n1[0] * t, prev[1] + n1[1] * t], a2 = [p[0] + n2[0] * t, p[1] + n2[1] * t]
    const den = e1[0] * e2[1] - e1[1] * e2[0]
    const k = ((a2[0] - a1[0]) * e2[1] - (a2[1] - a1[1]) * e2[0]) / den
    return [a1[0] + e1[0] * k, a1[1] + e1[1] * k]
  })
  const A = make(1), B = make(-1)
  return ringArea(A) < ringArea(B) ? A : B
}
// Contorno di una stella a lati dritti.
const starLine = (cx, cy, r, o = {}, w = 1.3) => { const p = starPts(cx, cy, r, o); return pc.difference(poly(p), poly(inset(p, w))) }
// Stella nautica: contorno + meta' di ogni punta piena (classico flash tattoo).
function nautical(cx, cy, r, { n = 5, inner = 0.42, alt = 1, rotate = 0, w = 1.3 } = {}) {
  const p = starPts(cx, cy, r, { n, inner, alt, rotate })
  const halves = []
  for (let i = 0; i < n; i++) halves.push(poly([p[2 * i], [cx, cy], p[2 * i + 1]]))
  return pc.union(pc.difference(poly(p), poly(inset(p, w))), ...halves)
}
// Contorno di uno sparkle: lo sparkle meno una sua copia piu' piccola (punte che si chiudono ad ago).
const sparkleLine = (cx, cy, rx, ry, w = 1.6, o = {}) => pc.difference(sparkle(cx, cy, rx, ry, o), sparkle(cx, cy, rx - w * 2.6, ry - w * 2.6, o))

// Luna crescente fine line: arco esterno modulato + arco interno sottile, uniti alle punte.
function crescent(cx, cy, r, { phase = 0.42, dir = -30, wo = 2.6, wi = 1 } = {}) {
  const a = rad(dir), d = r * phase, r2 = r * 0.92
  const c2 = [cx + d * Math.cos(a), cy + d * Math.sin(a)]
  // intersezione dei due cerchi
  const x = (d * d + r * r - r2 * r2) / (2 * d), h = Math.sqrt(r * r - x * x)
  const base = [cx + x * Math.cos(a), cy + x * Math.sin(a)], nrm = [-Math.sin(a), Math.cos(a)]
  const T1 = [base[0] + nrm[0] * h, base[1] + nrm[1] * h], T2 = [base[0] - nrm[0] * h, base[1] - nrm[1] * h]
  const ang = (c, p) => Math.atan2(p[1] - c[1], p[0] - c[0]) * 180 / Math.PI
  // arco che passa dalla parte opposta all'offset (dir + 180)
  const span = (c, rr, w, swell) => {
    let s0 = ang(c, T1), s1 = ang(c, T2), mid = dir + 180
    const norm = v => ((v % 360) + 360) % 360
    if (!(norm(mid - s0) < norm(s1 - s0))) [s0, s1] = [s1, s0]
    let e = s0 + norm(s1 - s0)
    return brush(ellAt(c[0], c[1], rr, rr, s0, e), t => swell ? w * Math.pow(Math.sin(Math.PI * t), 0.6) + 0.5 : w, { needle: 0.06 })
  }
  return { joined: pc.union(span([cx, cy], r, wo, true), span(c2, r2, wi, false)) }
}

// // Interno della luna crescente (stessi parametri di crescent), rientrato di `k` dalle linee.
function crescentInside(cx, cy, r, { phase = 0.42, dir = -30, k = 2.4 } = {}) {
  const a = rad(dir), d = r * phase
  return pc.difference(circle(cx, cy, r - k, 160), circle(cx + d * Math.cos(a), cy + d * Math.sin(a), r * 0.92 + k, 160))
}

// Occhio mistico: palpebre a mandorla unite agli angoli.
function eyeLids(cx, cy, hw, hh, w = 1.8) {
  const L = [cx - hw, cy], R = [cx + hw, cy]
  const lid = k => brush(t => quad(L, [cx, cy + k * hh * 2], R, t), t => w * Math.pow(Math.sin(Math.PI * t), 0.5) + 0.6, { needle: 0.05 })
  return { joined: pc.union(lid(-1), lid(1)) }
}
// Punti lungo un'ellisse, piu' grandi davanti e piu' piccoli dietro (dotwork).
function dotOrbit(cx, cy, rx, ry, n, { tilt = -12, rmax = 1.8, rmin = 0.6, avoid = [] } = {}) {
  // passo costante lungo la curva (non lungo l'angolo), cosi' i punti non si addensano ai lati
  const fine = Array.from({ length: 721 }, (_, i) => i / 2), pos = [0]
  const at = d => rotP([cx + rx * Math.cos(rad(d)), cy + ry * Math.sin(rad(d))], cx, cy, tilt)
  for (let i = 1; i < fine.length; i++) { const a = at(fine[i - 1]), b = at(fine[i]); pos.push(pos[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])) }
  const out = [], total = pos[pos.length - 1]
  for (let k = 0; k < n; k++) {
    const target = k * total / n, i = pos.findIndex(v => v >= target), d = fine[i], p = at(d)
    const r = rmin + (rmax - rmin) * (1 + Math.sin(rad(d))) / 2
    if (avoid.every(b => distToGeom(p, b) > r + BODY_GAP)) out.push(dot(p[0], p[1], r))
  }
  return out
}
// Linea di costellazione accorciata ai due capi (non tocca le stelle).
const link = (a, b, ga, gb, w = 0.9) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); return line(lerp(a, b, ga / L), lerp(a, b, 1 - gb / L), w, 0.15) }
// Parti volutamente unite (es. contorno + riempimento): contano come una parte sola.
const join = (...g) => ({ joined: pc.union(...g.filter(Boolean).map(x => x.joined || x)) })


// ── Spine, lame, op-art, mezzatinta ───────────────────────────────────────

// Generatore pseudo-casuale con seme (forme riproducibili a ogni rigenerazione).
function rng(seed) { let x = seed >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296) }

// Punta di spina: base appoggiata al ramo, punta ad ago piegata in avanti.
function thorn(base, tan, side, len, half, { lean = 0.55, curl = 0.18 } = {}) {
  const nrm = [-tan[1] * side, tan[0] * side]
  const dir = [nrm[0] * (1 - lean) + tan[0] * lean, nrm[1] * (1 - lean) + tan[1] * lean], dl = Math.hypot(...dir)
  const tip = [base[0] + dir[0] / dl * len, base[1] + dir[1] / dl * len]
  const b1 = [base[0] - tan[0] * half, base[1] - tan[1] * half], b2 = [base[0] + tan[0] * half, base[1] + tan[1] * half]
  const mid = lerp(base, tip, 0.35), k = [tan[0] * len * curl, tan[1] * len * curl]
  const ring = []
  for (let i = 0; i <= 24; i++) ring.push(quad(b1, [mid[0] - k[0] * 0.2, mid[1] - k[1] * 0.2], tip, i / 24))
  for (let i = 1; i <= 24; i++) ring.push(quad(tip, [mid[0] + k[0], mid[1] + k[1]], b2, i / 24))
  return poly(ring)
}
// Ramo spinoso lungo una cubica: si assottiglia verso la punta, spine alternate sui due lati.
function thornBranch(p0, p1, p2, p3, { w = 6, n = 7, len = 16, seed = 3, tipTaper = 0.75 } = {}) {
  const at = t => cubic(p0, p1, p2, p3, t), R = rng(seed)
  const width = t => w * 0.62 * (1 - tipTaper * t) + 0.3
  const parts = [brush(at, width, { needle: 0.12 })]
  for (let i = 0; i < n; i++) {
    const t = 0.1 + 0.8 * (i + 0.5) / n + (R() - 0.5) * 0.04, h = 1e-3
    const a = at(t), b = at(t + h), tl = Math.hypot(b[0] - a[0], b[1] - a[1])
    const tan = [(b[0] - a[0]) / tl, (b[1] - a[1]) / tl], side = i % 2 ? 1 : -1
    const wl = width(t) / 2
    parts.push(thorn([a[0] - tan[1] * side * wl * 0.5, a[1] + tan[0] * side * wl * 0.5], tan, side, len * 1.7 * (0.8 + R() * 0.4) * (1 - 0.25 * t), wl * 1.45, { lean: 0.15 + R() * 0.3 }))
  }
  return { joined: pc.union(...parts) }
}

// Braccio di sparkle "a lama": dal centro alla punta, piegato, si assottiglia ad ago.
function bladeArm(c, deg, len, w, bend = 0) {
  const a = rad(deg), d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]]
  const tip = [c[0] + d[0] * len, c[1] + d[1] * len], ctrl = [c[0] + d[0] * len * 0.5 + n[0] * bend, c[1] + d[1] * len * 0.5 + n[1] * bend]
  return brush(t => quad(c, ctrl, tip, t), t => w * Math.pow(1 - t, 1.7), { needle: 0.02 })
}
// Sparkle a lama: due code lunghe e curve sulla diagonale, due braccia corte.
const blade = (cx, cy, s = 1, { rot = -45, bend = 6 } = {}) => ({ joined: pc.union(
  bladeArm([cx, cy], rot, 34 * s, 6.5 * s, bend * s), bladeArm([cx, cy], rot + 180, 34 * s, 6.5 * s, bend * s),
  bladeArm([cx, cy], rot + 90, 15 * s, 7 * s, 0), bladeArm([cx, cy], rot - 90, 15 * s, 7 * s, 0), dot(cx, cy, 2.4 * s)) })

// Linea di fumo d'inchiostro: tracciato organico con spessore irregolare,
// spezzato dove incontra i corpi indicati (ogni pezzo chiude ad ago).
function inkSmoke(pts, { seed = 7, w = 2.4, avoid = [], minLen = 0.04 } = {}) {
  const R = rng(seed), ph = Array.from({ length: 6 }, () => R() * 6.28)
  const base = t => {
    const k = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1))), u = t * (pts.length - 1) - k
    const P = i => pts[Math.max(0, Math.min(pts.length - 1, i))]
    const p0 = P(k - 1), p1 = P(k), p2 = P(k + 1), p3 = P(k + 2)  // Catmull-Rom
    return [0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u * u + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u * u * u))
  }
  const at = t => { const p = base(t), q = base(Math.min(1, t + 1e-3)), o = base(Math.max(0, t - 1e-3)); const dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1
    const off = 1.6 * Math.sin(t * 13 + ph[0]) + 0.5 * Math.sin(t * 31 + ph[1]); return [p[0] - dy / l * off, p[1] + dx / l * off] }
  const width = t => Math.max(0.5, w * (0.8 + 0.45 * Math.sin(t * 9 + ph[2]) * Math.sin(t * 4 + ph[3]) + 0.9 * Math.pow(Math.max(0, Math.sin(t * 7 + ph[4])), 8)))
  const segs = []; let cur = null
  for (let i = 0; i <= 600; i++) {
    const t = i / 600, ok = avoid.every(b => distToGeom(at(t), b) > BODY_GAP + width(t) / 2)
    if (ok) { if (!cur) cur = [t, t]; cur[1] = t } else if (cur) { segs.push(cur); cur = null }
  }
  if (cur) segs.push(cur)
  return segs.filter(([a, b]) => b - a > minLen).map(([a, b]) => brush(at, width, { t0: a, t1: b, needle: Math.min(0.4, 0.06 / (b - a)) }))
}

// Op-art: capsula a contorno con archi impilati all'interno (tutti uniti: una parte sola).
function arcColumn(cx, top, bot, r, { n = 9, w = 1.1, dir = 'down' } = {}) {
  const parts = [line([cx - r, top + r], [cx - r, bot - r], w, 0), line([cx + r, top + r], [cx + r, bot - r], w, 0),
    arcLine(cx, top + r, r, 180, 360, w, { needle: 0 }), arcLine(cx, bot - r, r, 0, 180, w, { needle: 0 })]
  const step = (bot - top - 2 * r) / n
  for (let i = 1; i <= n; i++) {
    const y = dir === 'down' ? top + r + i * step : bot - r - i * step
    parts.push(dir === 'down' ? arcLine(cx, y, r, 180, 360, w, { needle: 0 }) : arcLine(cx, y, r, 0, 180, w, { needle: 0 }))
  }
  return { joined: pc.union(...parts) }
}

// Serpentino op-art (come le onde ad archi): colonne affiancate che si girano
// alternativamente in alto e in basso; vicino a ogni curva, archi impilati.
// cols: [{ top, bot }] ; la prima colonna gira in alto.
function serpentine(x0, r, cols, { n = 8, gap = 3.4, w = 1.1, tail = 0 } = {}) {
  const parts = []
  cols.forEach(({ top, bot }, i) => {
    const cx = x0 + (2 * i + 1) * r, up = i % 2 === 0
    const turnY = up ? top + r : bot - r
    parts.push(up ? arcLine(cx, turnY, r, 180, 360, w, { needle: 0 }) : arcLine(cx, turnY, r, 0, 180, w, { needle: 0 }))
    for (let k = 1; k <= n; k++) { const y = up ? turnY + k * gap : turnY - k * gap
      parts.push(up ? arcLine(cx, y, r, 180, 360, w, { needle: 0 }) : arcLine(cx, y, r, 0, 180, w, { needle: 0 })) }
    // lati: scendono/salgono dalla curva fino all'estremo opposto della colonna
    const yA = up ? turnY : top, yB = up ? bot : turnY
    parts.push(line([cx - r, yA], [cx - r, yB], w, 0), line([cx + r, yA], [cx + r, yB], w, 0))
  })
  if (tail) parts.push(line([x0, cols[0].bot], [x0, cols[0].bot - tail], w, 0.3))
  return { joined: pc.union(...parts) }
}

// Distanza con segno da una geometria (negativa dentro).
function sdGeom(p, g) {
  if (g.joined) g = g.joined
  let m = Infinity, inside = false
  for (const pl of asPolys(g)) {
    if (inRing(p, pl[0]) && !pl.slice(1).some(h => inRing(p, h))) inside = true
    for (const r of pl) for (let i = 0; i < r.length - 1; i++) m = Math.min(m, segDist(p, r[i], r[i + 1]))
  }
  return inside ? -m : m
}
// Mezzatinta: griglia di punti sfalsata, raggio = cov(x, y) in [0,1] * raggio massimo.
// Esce come path SVG di archi (leggero), non passa dalle unioni booleane.
function halftone(cov, { step = 3.6, box = [2, 2, 98, 98] } = {}) {
  const rmax = step * 0.48, out = []
  for (let j = 0, y = box[1]; y <= box[3]; j++, y += step * 0.866)
    for (let x = box[0] + (j % 2) * step / 2; x <= box[2]; x += step) {
      const r = rmax * Math.max(0, Math.min(1, cov(x, y)))
      if (r > 0.28) out.push(`M${n2(x - r)} ${n2(y)}a${n2(r)} ${n2(r)} 0 1 0 ${n2(2 * r)} 0a${n2(r)} ${n2(r)} 0 1 0 ${n2(-2 * r)} 0Z`)
    }
  return { raw: out.join('') }
}
const clamp01 = v => Math.max(0, Math.min(1, v))
// Mezzatinta "piena" con bordo sfumato, "a contorno" e "piena con alone".
const htFill = (g, fade = 9, o = {}) => halftone((x, y) => clamp01(0.85 - sdGeom([x, y], g) / fade), o)
const htLine = (g, band = 7, o = {}) => halftone((x, y) => clamp01(1 - Math.abs(sdGeom([x, y], g) + 1) / band), o)
const htGlow = (g, fade = 12, o = {}) => halftone((x, y) => { const d = sdGeom([x, y], g); return d < -3 ? 1.2 : clamp01(0.75 - d / fade) }, o)


// ── Dettaglio: stipple (dotwork) e tratteggio inciso ──────────────────────

// Stipple: puntini sparsi a caso (con seme) la cui densita' segue cov(x, y) in [0,1],
// come l'ombreggiatura a puntini dei tatuaggi dotwork. Esce come path di archi.
function stipple(cov, { step = 0.8, r = 0.46, seed = 1, box = [1, 1, 99, 99] } = {}) {
  const R = rng(seed), out = []
  const f = v => String(Math.round(v * 10) / 10).replace(/^0\./, '.').replace(/^-0\./, '-.')
  for (let y = box[1]; y < box[3]; y += step) for (let x = box[0]; x < box[2]; x += step) {
    const px = x + R() * step, py = y + R() * step, c = cov(px, py)
    if (c > 0 && R() < c) { const rr = r * (0.55 + 0.55 * c) * (0.85 + R() * 0.3); out.push(`M${f(px - rr)} ${f(py)}a${f(rr)} ${f(rr)} 0 1 0 ${f(2 * rr)} 0a${f(rr)} ${f(rr)} 0 1 0 ${f(-2 * rr)} 0Z`) }
  }
  return { raw: out.join('') }
}
// Ombra di volume dentro una forma: scura vicino al bordo e sul lato in ombra (luce da `light` gradi),
// chiara al centro; i puntini restano a distanza dal contorno se c'e' una linea di contorno.
function shade(g, { light = -135, edge = 6, base = 0.12, side = 0.75, inset = 0, cx = 50, cy = 50 } = {}) {
  const lx = Math.cos(rad(light)), ly = Math.sin(rad(light))
  return (x, y) => {
    const d = -sdGeom([x, y], g)
    if (d <= inset) return 0
    const e = Math.pow(clamp01(1 - (d - inset) / edge), 1.6)
    const sdir = clamp01(0.5 - ((x - cx) * lx + (y - cy) * ly) / 55)
    return clamp01(Math.pow(base + e * 0.75 + sdir * side, 1.5))
  }
}
// Alone a puntini fuori da una forma (luce, bagliore).
const glow = (g, reach = 14, k = 0.6) => (x, y) => { const d = sdGeom([x, y], g); return d <= 1.5 ? 0 : k * Math.pow(clamp01(1 - d / reach), 2) }

// Tratteggio inciso: linee parallele ritagliate dentro la forma; lo spessore cresce
// verso il lato in ombra (shadeAt(x, y) in [0,1]).
function hatch(g, { angle = -35, gap = 2.6, wmin = 0.35, wmax = 1.5, shadeAt = () => 0.5, cx = 50, cy = 50 } = {}) {
  const a = rad(angle), d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]], lines = []
  for (let o = -75; o <= 75; o += gap) {
    const p0 = [cx + n[0] * o - d[0] * 75, cy + n[1] * o - d[1] * 75], p1 = [cx + n[0] * o + d[0] * 75, cy + n[1] * o + d[1] * 75]
    lines.push(brush(t => lerp(p0, p1, t), t => { const p = lerp(p0, p1, t); return wmin + (wmax - wmin) * clamp01(shadeAt(p[0], p[1])) }, { N: 120, needle: 0 }))
  }
  const res = pc.intersection(g.joined || g, pc.union(...lines))
  return res.length ? { joined: res } : null
}
const sideShade = (light = -135, cx = 50, cy = 50) => (x, y) => clamp01(0.5 - ((x - cx) * Math.cos(rad(light)) + (y - cy) * Math.sin(rad(light))) / 60)

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
  if (g.joined) g = g.joined
  let m = Infinity
  for (const pl of asPolys(g)) {
    if (inRing(p, pl[0]) && !pl.slice(1).some(h => inRing(p, h))) return 0
    for (const r of pl) for (let i = 0; i < r.length - 1; i++) m = Math.min(m, segDist(p, r[i], r[i + 1]))
  }
  return m
}
const geomDist = (a, b) => {
  let m = Infinity
  if (a.joined) a = a.joined
  for (const pl of asPolys(a)) for (const p of pl[0]) { m = Math.min(m, distToGeom(p, b)); if (m === 0) return 0 }
  return m
}

// Compone le parti e verifica: nessun contatto tra parti, tutto dentro il riquadro.
const problems = []
const rawOf = {}
function compose(name, parts) {
  rawOf[name] = parts.filter(p => p && p.raw).map(p => p.raw).join('')
  parts = parts.filter(p => p && !p.raw)
  const flat = parts.flatMap(p => (p.joined ? [p.joined] : Array.isArray(p[0][0][0]) ? p : [p])).filter(Boolean)
  for (let i = 0; i < flat.length; i++) for (let j = i + 1; j < flat.length; j++) {
    const d = Math.min(geomDist(flat[i], flat[j]), geomDist(flat[j], flat[i]))
    if (d < MIN_GAP) problems.push(`${name}: parti ${i} e ${j} troppo vicine (${d.toFixed(2)})`)
  }
  const out = flat.flatMap(g => asPolys(g).flatMap(pl => pl[0])).find(([x, y]) => x < 0.5 || x > 99.5 || y < 0.5 || y > 99.5)
  if (out) problems.push(`${name}: esce dal riquadro (${out[0].toFixed(1)}, ${out[1].toFixed(1)})`)
  return flat.length ? pc.union(...flat) : []
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
  // verso coerente: contorno esterno in un senso, fori nel senso opposto (riempimento nonzero)
  const signed = r => r.reduce((a, p, i) => { const q = r[(i + 1) % r.length]; return a + p[0] * q[1] - q[0] * p[1] }, 0)
  return asPolys(geom).filter(p => ringArea(p[0]) > eps * 30).flatMap(p => p.map((ring, ri) => {
    if ((signed(ring) > 0) !== (ri === 0)) ring = [...ring].reverse()
    // anello chiuso: lo spezzo nel punto piu' lontano dall'inizio, poi RDP sulle due meta'
    const r = ring.slice(0, -1)
    let far = 0
    r.forEach((p, i) => { if (Math.hypot(p[0] - r[0][0], p[1] - r[0][1]) > Math.hypot(r[far][0] - r[0][0], r[far][1] - r[0][1])) far = i })
    const pts = [...rdp(r.slice(0, far + 1), eps).slice(0, -1), ...rdp([...r.slice(far), r[0]], eps).slice(0, -1)]
    return 'M' + pts.map(([x, y]) => `${n2(x)} ${n2(y)}`).join('L') + 'Z'
  })).join('')
}


// ── Cyber sigilism ────────────────────────────────────────────────────────
// Tratti affilati e fluidi, simmetrici: una spina centrale ad ago, coppie di tratti
// che partono tangenti alla spina, curvano verso l'esterno e chiudono in punta,
// con spine secondarie (barbe) che si diramano verso la punta. Tutto unito in un segno.

// Tratto su cubica: nasce sottile, si gonfia presto (peak) e si allunga in un ago.
function sigStroke(p0, p1, p2, p3, w, { peak = 0.28, tail = 1.25 } = {}) {
  return brush(t => cubic(p0, p1, p2, p3, t), t => w * (t < peak ? Math.pow(t / peak, 0.55) : Math.pow((1 - t) / (1 - peak), tail)), { N: 160, needle: 0 })
}
// Spina secondaria che esce da un tratto e punta verso la sua estremita'.
function barb(at, t, side, len, w, { ang = 38, bend = 0.25 } = {}) {
  const a = at(t), b = at(Math.min(1, t + 0.01)), tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const tan = [(b[0] - a[0]) / tl, (b[1] - a[1]) / tl], nrm = [-tan[1] * side, tan[0] * side]
  const c = Math.cos(rad(ang)), sn = Math.sin(rad(ang)), dir = [tan[0] * c + nrm[0] * sn, tan[1] * c + nrm[1] * sn]
  const tip = [a[0] + dir[0] * len, a[1] + dir[1] * len], mid = [a[0] + dir[0] * len * 0.5 - nrm[0] * len * bend, a[1] + dir[1] * len * 0.5 - nrm[1] * len * bend]
  return brush(u => quad(a, mid, tip, u), u => w * Math.pow(1 - u, 1.3), { N: 60, needle: 0 })
}
const mirrorX = g => g.map(r => r.map(([x, y]) => [100 - x, y]))
const clampBox = ([x, y]) => [Math.max(5, Math.min(95, x)), Math.max(4, Math.min(96, y))]

// Sigillo generato da un seme. core: 'spine' | 'sparkle' | 'blade' | 'none'.
// Ogni tratto laterale: parte tangente alla spina, si apre in una lunga S e chiude
// con un uncino (curl = rotazione della direzione finale rispetto alla corda).
function sigil(seed, { pairs = 3, core = 'spine', w = 3.4, barbs = 1, reach = 1, curl = 1, mirror = true, spineW = 1 } = {}) {
  const R = rng(seed * 7919 + 13), parts = []
  if (core === 'spine') parts.push(sigStroke([50, 2], [50, 30], [50, 70], [50, 98], w * spineW, { peak: 0.5, tail: 1.6 }))
  if (core === 'sparkle') parts.push(sparkle(50, 50, 9, 47, { pinch: 0.12 }))
  if (core === 'blade') parts.push(...asPolys(blade(50, 50, 1.3, { rot: -90, bend: 0 }).joined))
  const side = []
  const ys = Array.from({ length: pairs }, (_, i) => 12 + 76 * (i + 0.5) / pairs + (R() - 0.5) * 8)
  ys.forEach((y0, i) => {
    const up = i < pairs / 2 ? -1 : (i > (pairs - 1) / 2 ? 1 : (R() < 0.5 ? -1 : 1))
    const L = (30 + R() * 26) * reach
    const th = rad(up < 0 ? -(18 + R() * 50) : (18 + R() * 50))         // direzione della corda (0 = orizzontale verso destra)
    const p0 = [50.5, y0]
    let p3 = [p0[0] + Math.cos(th) * L, p0[1] + Math.sin(th) * L]
    p3 = clampBox(p3)
    const cl = rad((R() < 0.5 ? 1 : -1) * (40 + R() * 70) * curl)          // uncino finale
    const ch = Math.atan2(p3[1] - p0[1], p3[0] - p0[0]), dEnd = [Math.cos(ch + cl), Math.sin(ch + cl)]
    const p1 = [p0[0] + 3, p0[1] + up * L * 0.42]
    const p2 = [p3[0] - dEnd[0] * L * 0.45, p3[1] - dEnd[1] * L * 0.45]
    const at = t => cubic(p0, p1, p2, p3, t)
    side.push(sigStroke(p0, p1, p2, p3, w * (0.8 + R() * 0.35), { peak: 0.22 + R() * 0.12, tail: 1.3 }))
    for (let k = 0; k < barbs; k++) side.push(barb(at, 0.38 + R() * 0.28, R() < 0.5 ? 1 : -1, 7 + R() * 9, w * 0.7, { ang: 30 + R() * 25, bend: 0.3 }))
    if (R() < 0.5) {                                                         // ramo secondario
      const t = 0.3 + R() * 0.25, a0 = at(t), L2 = L * (0.35 + R() * 0.25), th2 = ch + (R() < 0.5 ? 1 : -1) * rad(35 + R() * 35)
      const e = clampBox([a0[0] + Math.cos(th2) * L2, a0[1] + Math.sin(th2) * L2])
      side.push(sigStroke(a0, lerp(a0, at(t + 0.08), 1.6), lerp(a0, e, 0.6), e, w * 0.6, { peak: 0.25 }))
    }
  })
  parts.push(...side)
  if (mirror) parts.push(...side.map(mirrorX))
  return { joined: pc.union(...parts) }
}

// Adatta una geometria al riquadro (margine m), mantenendo le proporzioni.
function fitBox(g, m = 4, box = [0, 0, 100, 100]) {
  const pts = asPolys(g).flatMap(p => p.flat())
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  const k = Math.min((box[2] - box[0] - 2 * m) / (x1 - x0), (box[3] - box[1] - 2 * m) / (y1 - y0))
  const ox = (box[0] + box[2]) / 2 - (x0 + x1) / 2 * k, oy = (box[1] + box[3]) / 2 - (y0 + y1) / 2 * k
  return asPolys(g).map(p => p.map(r => r.map(([x, y]) => [x * k + ox, y * k + oy])))
}

// Ventaglio di tratti da una radice: tutte le corde ruotano tra a0 e a1 (gradi),
// lunghezze che calano verso i bordi del ventaglio, uncino finale coerente (flow).
function fan(root, { n = 4, a0 = -15, a1 = -80, L = 50, Lmin = 0.55, curl = 70, w = 3.4, start = [0, -1], barbs = 1, seed = 1, jitter = 1 } = {}) {
  const R = rng(seed * 104729 + 7), out = []
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1), th = rad(a0 + (a1 - a0) * u + (R() - 0.5) * 8 * jitter)
    const len = L * (Lmin + (1 - Lmin) * Math.sin(Math.PI * (0.25 + 0.6 * u))) * (0.9 + R() * 0.2)
    const p0 = [root[0] + (R() - 0.5) * 2 * jitter, root[1] + i * 1.2], p3 = [p0[0] + Math.cos(th) * len, p0[1] + Math.sin(th) * len]
    const cl = rad(curl * (0.7 + R() * 0.6)), dEnd = [Math.cos(th + cl), Math.sin(th + cl)]
    const p1 = [p0[0] + start[0] * len * 0.35 + Math.cos(th) * len * 0.1, p0[1] + start[1] * len * 0.35 + Math.sin(th) * len * 0.1]
    const p2 = [p3[0] - dEnd[0] * len * 0.42, p3[1] - dEnd[1] * len * 0.42]
    const at = t => cubic(p0, p1, p2, p3, t)
    out.push(sigStroke(p0, p1, p2, p3, w * (0.75 + 0.45 * Math.sin(Math.PI * u)), { peak: 0.2 + R() * 0.1, tail: 1.35 }))
    for (let k = 0; k < barbs; k++) if (R() < 0.75) out.push(barb(at, 0.36 + R() * 0.3, Math.sign(curl) || 1, 10 + R() * 9, w * 0.5, { ang: 24 + R() * 16, bend: 0.12 }))
  }
  return out
}
// Sigillo: combina spina e ventagli, specchia, unisce e adatta al riquadro.
function sigilOf(parts, { mirror = true, core = [] } = {}) {
  const all = [...core, ...parts, ...(mirror ? parts.map(mirrorX) : [])]
  return { joined: fitBox(pc.union(...all)) }
}
const spine = (y0 = 4, y1 = 96, w = 3, x = 50) => sigStroke([x, y0], [x, y0 + (y1 - y0) * 0.3], [x, y0 + (y1 - y0) * 0.7], [x, y1], w, { peak: 0.5, tail: 1.6 })
// Ricette: ogni seme dà una variante della stessa famiglia.
const SIGILS = {
  wing:  s => { const R = rng(s); return sigilOf([...fan([51, 54], { n: 3 + (s % 3), a0: -8 - R() * 10, a1: -70 - R() * 15, L: 48, curl: -(50 + R() * 40), seed: s }), ...fan([51, 62], { n: 2, a0: 25, a1: 55, L: 30, curl: 60, start: [0, 1], seed: s + 50 })], { core: [spine(6, 96, 3.2)] }) },
  flame: s => { const R = rng(s); return sigilOf(fan([51, 94], { n: 4 + (s % 2), a0: -30 - R() * 10, a1: -85, L: 80, Lmin: 0.45, curl: -(60 + R() * 50), seed: s, w: 3.6 }), { core: [spine(4, 96, 3.6)] }) },
  halo:  s => { const R = rng(s); return sigilOf([...fan([52, 44], { n: 3, a0: -10, a1: -60, L: 40, curl: 90 + R() * 40, seed: s }), ...fan([52, 56], { n: 3, a0: 10, a1: 60, L: 40, curl: -(90 + R() * 40), start: [0, 1], seed: s + 9 })], { core: [sparkle(50, 50, 10, 46, { pinch: 0.12 })] }) },
  crown: s => { const R = rng(s); return sigilOf([...fan([51, 70], { n: 4, a0: -20, a1: -82, L: 52, Lmin: 0.5, curl: 70 + R() * 50, seed: s, w: 3.2 }), ...fan([51, 74], { n: 1, a0: 8, a1: 8, L: 40, curl: -(40 + R() * 40), start: [1, 0], seed: s + 4, barbs: 2 })], { core: [spine(8, 92, 3.2)] }) },
  flow:  s => { const R = rng(s); const parts = [sigStroke([8, 94], [30, 60], [70, 40], [92, 6], 3.6, { peak: 0.5, tail: 1.5 }),
      ...fan([34, 64], { n: 2, a0: -60, a1: -100, L: 34, curl: -80, seed: s, start: [0.6, -0.8] }), ...fan([62, 38], { n: 2, a0: 10, a1: 50, L: 30, curl: 80, seed: s + 1, start: [0.6, -0.8] }),
      ...fan([50, 50], { n: 1, a0: 160, a1: 160, L: 30, curl: 80, seed: s + 2, start: [-0.8, 0.6] })]
    return { joined: fitBox(pc.union(...parts)) } },
  cross: s => { const R = rng(s); return sigilOf([...fan([51, 40], { n: 2, a0: -20, a1: -55, L: 44, curl: -(70 + R() * 40), seed: s }), ...fan([51, 50], { n: 1, a0: 0, a1: 0, L: 46, curl: 50 + R() * 50, start: [1, 0], seed: s + 3 }), ...fan([51, 60], { n: 2, a0: 25, a1: 60, L: 40, curl: 70 + R() * 40, start: [0, 1], seed: s + 5 })], { core: [spine(2, 98, 3)] }) },
}


// ── Sigilli fine line ─────────────────────────────────────────────────────
// Principi (cyber sigilism): linee sottili e nette, ritmo di curve a S, molto spazio
// vuoto, composizione verticale, un solo punto focale. Niente nodi pesanti.

// Tratto a S lungo una Catmull-Rom per i punti dati: sottile, si gonfia appena e chiude ad ago.
function sLine(pts, w = 1.6, { peak = 0.3, tail = 1.2, head = 0.5 } = {}) {
  const at = t => {
    const n = pts.length - 1, k = Math.min(n - 1, Math.floor(t * n)), u = t * n - k
    const P = i => pts[Math.max(0, Math.min(n, i))], p0 = P(k - 1), p1 = P(k), p2 = P(k + 1), p3 = P(k + 2)
    return [0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u * u + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u * u * u))
  }
  return brush(at, t => w * (t < peak ? Math.pow(t / peak, head) : Math.pow((1 - t) / (1 - peak), tail)) + 0.15, { N: 260, needle: 0 })
}
// Ago sottile (spina fine line) dalla posizione p in direzione deg.
const needle = (p, deg, len, w = 1.1) => { const d = [Math.cos(rad(deg)), Math.sin(rad(deg))]; return brush(t => [p[0] + d[0] * len * t, p[1] + d[1] * len * t], t => w * Math.pow(1 - t, 1.2) + 0.1, { N: 40, needle: 0 }) }
// Sigillo verticale fine line: spina sottile e serpentine a S che oscillano (salgono o
// scendono), chiudono con un uncino verso l'asse o con un ago verso l'esterno.
function vine(seed, { lines = 4, w = 1.6, focal = 'sparkle' } = {}) {
  const R = rng(seed * 31337 + 5), side = []
  const spineG = sLine([[50, 1], [50, 30], [50, 70], [50, 99]], w * 1.15, { peak: 0.5, tail: 1.6, head: 1.6 })
  for (let i = 0; i < lines; i++) {
    const y0 = 18 + (64 * (i + 0.5)) / lines + (R() - 0.5) * 8, dir = R() < 0.62 ? -1 : 1
    const amp = 10 + R() * 20, len = 22 + R() * 26, waves = 1 + Math.floor(R() * 2), k = 6
    const pts = [[50.4, y0]]
    for (let j = 1; j <= k; j++) {
      const u = j / k, x = 50 + amp * Math.sin(Math.PI * u * (waves === 1 ? 0.9 : 1.6)) * (1 - 0.25 * u) + u * 6
      pts.push([x, y0 + dir * len * u])
    }
    const g = sLine(pts, w * (0.75 + R() * 0.35), { peak: 0.2 + R() * 0.15 })
    side.push(g)
    const peakP = pts.reduce((m, p) => (p[0] > m[0] ? p : m))
    if (R() < 0.7) side.push(needle([peakP[0] - 0.3, peakP[1]], dir < 0 ? -20 - R() * 25 : 20 + R() * 25, 8 + R() * 10, w * 0.75))
  }
  const parts = [spineG, ...side, ...side.map(mirrorX)]
  if (focal === 'sparkle') parts.push(sparkle(50, 50, 5 + R() * 3, 11 + R() * 4, { pinch: 0.12 }))
  return { joined: fitBox(pc.union(...parts), 4) }
}

// ── Sistema di glifi ──────────────────────────────────────────────────────
// Come nei pacchetti professionali: un alfabeto di glifi base, tutti centrati e con lo
// stesso ingombro ottico, declinati in trattamenti coerenti (pieno, linea, mezzatinta).

// Twinkle: 4 punte lunghe e 4 corte, lati concavi.
const twinkle = (cx = 50, cy = 50, R = 46) => needles(cx, cy, R, { n: 8, inner: 0.1, alt: 0.42, concave: 0.5 })
// Cross flare: fasci lunghissimi verticale/orizzontale, brevi diagonali, nucleo a diamante.
const crossFlare = (cx = 50, cy = 50, R = 47) => pc.union(needles(cx, cy, R, { n: 4, inner: 0.035, concave: 0.65 }), needles(cx, cy, R * 0.3, { n: 4, inner: 0.12, rotate: 45, concave: 0.5 }), sparkle(cx, cy, R * 0.12, R * 0.12, { pinch: 0.3, bend: 0.5 }))
// Glint: nucleo piccolo e quattro fasci a capello.
const glint = (cx = 50, cy = 50, R = 47) => pc.union(sparkle(cx, cy, R * 0.22, R * 0.22, { pinch: 0.14 }), needles(cx, cy, R, { n: 4, inner: 0.012, concave: 0.75 }))
// Bloom: fiore a petali tondi (r polare = base + petali).
function bloom(cx = 50, cy = 50, R = 46, { n = 8, depth = 0.4, round = 0.55, rotate = 0 } = {}) {
  const ring = []
  for (let i = 0; i < 360; i++) { const a = rad(i), r = R * (1 - depth + depth * Math.pow(Math.abs(Math.cos((a - rad(rotate)) * n / 2)), round)); ring.push([cx + r * Math.cos(a - Math.PI / 2), cy + r * Math.sin(a - Math.PI / 2)]) }
  return poly(ring)
}
// Ingranaggio: corona dentata con foro.
function gear(cx = 50, cy = 50, R = 46, { teeth = 16, depth = 0.14, hole = 0.5, duty = 0.5 } = {}) {
  const ring = []
  for (let i = 0; i < 720; i++) { const a = i / 720 * 2 * Math.PI, f = ((a / (2 * Math.PI)) * teeth) % 1, inT = f < duty
    const sm = Math.min(1, Math.min(Math.abs(f - 0), Math.abs(f - duty), Math.abs(1 - f)) * teeth * 0.9)
    const r = R * (inT ? 1 : 1 - depth) ; ring.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]) }
  return pc.difference(poly(ring), circle(cx, cy, R * hole, 120))
}
// Croce: bracci paralleli che finiscono a punta.
function crossArm(cx = 50, cy = 50, R = 46, { w = 0.2, tip = 0.3 } = {}) {
  const h = R * w / 2, pts = []
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]]
    const P = (along, side) => [cx + d[0] * along + n[0] * side, cy + d[1] * along + n[1] * side]
    pts.push(P(h, -h), P(R * (1 - tip), -h), P(R, 0), P(R * (1 - tip), h)) }
  return poly(pts)
}
// Bersaglio: anelli concentrici e punto centrale.
const target = (cx = 50, cy = 50, R = 46, { rings = 3, w = 1.6 } = {}) => pc.union(dot(cx, cy, R * 0.12), ...Array.from({ length: rings }, (_, i) => ringO(cx, cy, R * (0.36 + 0.64 * i / Math.max(1, rings - 1)) - w / 2, w)))
const targetSolid = (cx = 50, cy = 50, R = 46) => pc.union(dot(cx, cy, R * 0.18), ringO(cx, cy, R * 0.52, R * 0.16), ringO(cx, cy, R * 0.88, R * 0.16))

// Elementi a linea Y2K.
const ellLine = (cx, cy, rx, ry, w = 1.3, tilt = 0) => brush(ellAt(cx, cy, rx, ry, 0, 360, tilt), () => w, { N: 360, needle: 0 })
// Globo wireframe: contorno, meridiani ed equatore/paralleli.
function globe(cx = 50, cy = 50, R = 45, { w = 1.3, mer = [0.72, 0.38], par = [0.5, 0.86] } = {}) {
  const parts = [ringO(cx, cy, R, w), line([cx, cy - R], [cx, cy + R], w, 0), line([cx - R, cy], [cx + R, cy], w, 0)]
  for (const k of mer) parts.push(ellLine(cx, cy, R * k, R, w))
  for (const k of par) { const y = R * k, hw = Math.sqrt(R * R - y * y); parts.push(line([cx - hw, cy - y], [cx + hw, cy - y], w, 0), line([cx - hw, cy + y], [cx + hw, cy + y], w, 0)) }
  return pc.union(...parts)
}
// Rettangolo arrotondato (poligono).
function roundRect(cx, cy, hw, hh, r) {
  const pts = [], c = [[cx + hw - r, cy - hh + r, -90], [cx + hw - r, cy + hh - r, 0], [cx - hw + r, cy + hh - r, 90], [cx - hw + r, cy - hh + r, 180]]
  for (const [x, y, a0] of c) for (let i = 0; i <= 12; i++) { const a = rad(a0 + i * 7.5); pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]) }
  return poly(pts)
}
const concentricSquares = (n = 5, w = 1.3) => pc.union(...Array.from({ length: n }, (_, i) => { const h = 45 - i * (38 / n); return lineOf(roundRect(50, 50, h, h, h * 0.28), w) }))
// Griglia deformata a lente (fisheye) dentro un cerchio.
function warpGrid(n = 11, w = 1, bulge = 0.3) {
  // lente: dentro il cerchio unitario i punti si allontanano dal centro come su una sfera
  const map = (u, v) => { const r = Math.hypot(u, v), k = r < 1e-6 ? 1 + bulge : Math.sin(r * Math.PI / 2) / r * (1 + bulge * 0) ; return [50 + 45 * u * k, 50 + 45 * v * k] }
  const parts = [ringO(50, 50, 45, w)]
  for (let i = 1; i < n - 1; i++) { const c = -1 + 2 * i / (n - 1), h = Math.sqrt(1 - c * c)
    parts.push(brush(t => map(c, -h + 2 * h * t), () => w, { N: 120, needle: 0 }), brush(t => map(-h + 2 * h * t, c), () => w, { N: 120, needle: 0 })) }
  return pc.union(...parts)
}
// Eco: lo stesso glifo ripetuto a contorno, in scala decrescente.
const echo = (make, scales = [1, 0.72, 0.44], w = 1.3) => pc.union(...scales.map(k => lineOf(make(k), w)))

// Linea di precisione: contorno a spessore costante di qualunque forma (anche con fori),
// costruito come unione di segmenti spessi lungo il bordo.
function lineOf(g, w = 1.6) {
  const quads = []
  for (const pl of asPolys(g.joined || g)) for (const r of pl) {
    for (let i = 0; i < r.length - 1; i++) {
      const a = r[i], b = r[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue
      const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [-d[1] * w / 2, d[0] * w / 2], e = [d[0] * w * 0.35, d[1] * w * 0.35]
      quads.push(poly([[a[0] - e[0] + n[0], a[1] - e[1] + n[1]], [b[0] + e[0] + n[0], b[1] + e[1] + n[1]], [b[0] + e[0] - n[0], b[1] + e[1] - n[1]], [a[0] - e[0] - n[0], a[1] - e[1] - n[1]]]))
    }
  }
  return pc.union(...quads)
}

// ── Design Syndrome: manuale tecnico, ragnatele, flussi ────────────────────
// Ispirati agli asset del progetto (public/assets/elements/ds-assembly, ds-tribals,
// textures/ds-noise): annotazioni da manuale di montaggio, filamenti organici, campi di linee.

const TW = 1.1 // spessore del tratto tecnico
// Linea tratteggiata.
function dashed(a, b, { dash = 2.6, gap = 1.8, w = TW } = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), out = []
  for (let d = 0; d < L - 0.5; d += dash + gap) out.push(line(lerp(a, b, d / L), lerp(a, b, Math.min(L, d + dash) / L), w, 0))
  return out
}
// Punta di freccia: aperta (due tratti) o piena (triangolo).
function arrowHead(tip, deg, size = 5, { open = true, w = TW } = {}) {
  const a = rad(deg), back = [tip[0] - Math.cos(a) * size, tip[1] - Math.sin(a) * size], n = [-Math.sin(a) * size * 0.45, Math.cos(a) * size * 0.45]
  const l = [back[0] + n[0], back[1] + n[1]], r = [back[0] - n[0], back[1] - n[1]]
  return open ? [line(l, tip, w, 0), line(r, tip, w, 0)] : [poly([tip, l, r])]
}
// Cifre a 7 segmenti (stile display tecnico), box w x h con angolo alto-sinistra in (x, y).
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' }
function digit(ch, x, y, w = 5, h = 9, sw = TW) {
  const P = { tl: [x, y], tr: [x + w, y], ml: [x, y + h / 2], mr: [x + w, y + h / 2], bl: [x, y + h], br: [x + w, y + h] }
  const segs = { a: ['tl', 'tr'], b: ['tr', 'mr'], c: ['mr', 'br'], d: ['bl', 'br'], e: ['ml', 'bl'], f: ['tl', 'ml'], g: ['ml', 'mr'] }
  return [...SEG[ch]].map(k => line(P[segs[k][0]], P[segs[k][1]], sw, 0))
}
const number = (str, x, y, size = 9) => [...String(str)].flatMap((c, i) => digit(c, x + i * size * 0.78, y, size * 0.55, size))
// Richiamo numerato: punto sull'oggetto, linea guida, cerchio col numero.
function callout(from, to, n, { r = 6.5 } = {}) {
  const d = Math.hypot(to[0] - from[0], to[1] - from[1]), end = lerp(from, to, 1 - (r + 0.2) / d)
  const sz = r * 0.95, str = String(n)
  return [dot(from[0], from[1], 1.4), line(from, end, TW, 0), ringO(to[0], to[1], r, TW), ...number(str, to[0] - (str.length * sz * 0.78 - sz * 0.23) / 2, to[1] - sz / 2, sz)]
}
// Quota: linea con frecce/tacche e linee di riferimento.
function dimension(a, b, { off = 0, ticks = true, w = TW } = {}) {
  const deg = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
  const n = [-Math.sin(rad(deg)), Math.cos(rad(deg))], A = [a[0] + n[0] * off, a[1] + n[1] * off], B = [b[0] + n[0] * off, b[1] + n[1] * off]
  const out = [line(A, B, w, 0), ...arrowHead(A, deg + 180, 3.6, { w }), ...arrowHead(B, deg, 3.6, { w })]
  if (ticks) out.push(line([A[0] - n[0] * 4, A[1] - n[1] * 4], [A[0] + n[0] * 4, A[1] + n[1] * 4], w, 0), line([B[0] - n[0] * 4, B[1] - n[1] * 4], [B[0] + n[0] * 4, B[1] + n[1] * 4], w, 0))
  return out
}
// Crocino di registro.
const registration = (cx = 50, cy = 50, R = 30) => [ringO(cx, cy, R * 0.55, TW), dot(cx, cy, R * 0.12), line([cx - R, cy], [cx + R, cy], TW, 0), line([cx, cy - R], [cx, cy + R], TW, 0)]
// Segni di taglio agli angoli.
const cropMarks = (m = 8, L = 14) => [[m, m, 1, 1], [100 - m, m, -1, 1], [m, 100 - m, 1, -1], [100 - m, 100 - m, -1, -1]].flatMap(([x, y, sx, sy]) => [line([x, y], [x + sx * L, y], TW, 0), line([x, y], [x, y + sy * L], TW, 0)])
// Righello con tacche lunghe ogni 5.
function ruler(x0 = 6, x1 = 94, y = 50, step = 2.2) { const out = [line([x0, y], [x1, y], TW, 0)]; let i = 0; for (let x = x0; x <= x1 + 0.01; x += step, i++) out.push(line([x, y], [x, y - (i % 5 === 0 ? 7 : 3.5)], TW * 0.85, 0)); return out }
// Freccia di rotazione (come nelle istruzioni di montaggio).
function rotateArrow(cx = 50, cy = 50, r = 34, a0 = 200, a1 = 470, dashedArc = true) {
  const out = []
  const at = d => [cx + r * Math.cos(rad(d)), cy + r * Math.sin(rad(d))]
  if (dashedArc) for (let d = a0; d < a1 - 14; d += 11) out.push(brush(t => at(d + 6 * t), () => TW, { N: 20, needle: 0 }))
  else out.push(brush(t => at(a0 + (a1 - a0 - 6) * t), () => TW, { N: 200, needle: 0 }))
  const tip = at(a1), tangent = a1 + 90
  return [...out, ...arrowHead(tip, tangent, 6, { open: false })]
}

// Richiamo con freccia: la linea guida termina con una punta piena sull'oggetto.
function calloutArrow(from, to, n, { r = 6.5 } = {}) {
  const deg = Math.atan2(from[1] - to[1], from[0] - to[0]) * 180 / Math.PI, d = Math.hypot(to[0] - from[0], to[1] - from[1])
  const end = lerp(from, to, 1 - (r + 0.2) / d), sz = r * 0.95, str = String(n)
  return [...arrowHead(from, deg, 4.5, { open: false }), line(lerp(from, to, 3.5 / d), end, TW, 0), ringO(to[0], to[1], r, TW), ...number(str, to[0] - (str.length * sz * 0.78 - sz * 0.23) / 2, to[1] - sz / 2, sz)]
}
// Cerchio numerato (passaggio di una sequenza).
const stepBadge = (c, n, r = 7) => { const sz = r * 0.95; return [ringO(c[0], c[1], r, TW), ...number(n, c[0] - sz * 0.275, c[1] - sz / 2, sz)] }
// Marcatore di sezione: cerchio diviso con frecce di vista.
function sectionMarker(cx = 50, cy = 50, r = 16) {
  return [ringO(cx, cy, r, TW), line([cx - r, cy], [cx + r, cy], TW, 0), ...number(1, cx - 2.6, cy - r * 0.75, r * 0.55), ...number(2, cx - 2.6, cy + r * 0.2, r * 0.55),
    line([cx + r, cy], [cx + r + 18, cy], TW, 0), ...arrowHead([cx + r + 18, cy + 9], 90, 5, { open: false }), line([cx + r + 18, cy], [cx + r + 18, cy + 5], TW, 0)]
}
// Quota angolare: due lati e un arco con frecce.
function angleMarker(cx = 20, cy = 80, L = 70, deg = 40) {
  const a = rad(-deg), arcR = L * 0.55
  const at = d => [cx + arcR * Math.cos(rad(d)), cy + arcR * Math.sin(rad(d))]
  return [line([cx, cy], [cx + L, cy], TW, 0), line([cx, cy], [cx + L * Math.cos(a), cy + L * Math.sin(a)], TW, 0),
    brush(t => at(-deg * t), () => TW, { N: 80, needle: 0 }), ...arrowHead(at(-2), 90, 3.6, { w: TW }), ...arrowHead(at(-deg + 2), -90 - deg, 3.6, { w: TW })]
}
// Scala grafica a blocchi alternati pieni/vuoti.
function scaleBar(x0 = 8, x1 = 92, y = 50, n = 6, h = 5) {
  const out = [lineOf(poly([[x0, y], [x1, y], [x1, y + h], [x0, y + h]]), TW)], step = (x1 - x0) / n
  for (let i = 0; i < n; i += 2) out.push(poly([[x0 + i * step, y], [x0 + (i + 1) * step, y], [x0 + (i + 1) * step, y + h], [x0 + i * step, y + h]]))
  return out
}
// Griglia di crocini (blueprint).
function plusGrid(n = 6, m = 8, s = 2.6) { const out = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = m + i * (100 - 2 * m) / (n - 1), y = m + j * (100 - 2 * m) / (n - 1); out.push(join(line([x - s, y], [x + s, y], TW, 0), line([x, y - s], [x, y + s], TW, 0))) } return out }
// Mirino HUD: anello con tacche graduate.
function hudReticle(cx = 50, cy = 50, R = 40) {
  const out = [ringO(cx, cy, R, TW), ringO(cx, cy, R * 0.18, TW)]
  for (let i = 0; i < 72; i++) { const a = rad(i * 5), L = i % 18 === 0 ? 9 : i % 6 === 0 ? 5 : 2.6
    out.push(line([cx + R * Math.cos(a), cy + R * Math.sin(a)], [cx + (R - L) * Math.cos(a), cy + (R - L) * Math.sin(a)], TW * 0.8, 0)) }
  out.push(line([cx, cy - R + 11], [cx, cy - R * 0.18 - 3], TW, 0), line([cx, cy + R - 11], [cx, cy + R * 0.18 + 3], TW, 0), line([cx - R + 11, cy], [cx - R * 0.18 - 3, cy], TW, 0), line([cx + R - 11, cy], [cx + R * 0.18 + 3, cy], TW, 0))
  return out
}

// Ragnatela organica: nodi collegati da filamenti che si assottigliano a meta' e
// si annodano nei nodi; alcuni filamenti escono liberi e chiudono ad ago.
function web(seed, { nodes = 6, free = 6, w = 2.6, box = [22, 22, 78, 78] } = {}) {
  const R = rng(seed * 7717 + 3), pts = []
  for (let i = 0; i < nodes; i++) pts.push([box[0] + R() * (box[2] - box[0]), box[1] + R() * (box[3] - box[1])])
  // albero di copertura minimo + un paio di lati extra
  const edges = [], inT = [0]
  while (inT.length < nodes) { let best = null
    for (const i of inT) for (let j = 0; j < nodes; j++) if (!inT.includes(j)) { const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); if (!best || d < best[2]) best = [i, j, d] }
    edges.push(best); inT.push(best[1]) }
  for (let k = 0; k < 2; k++) { const i = Math.floor(R() * nodes), j = Math.floor(R() * nodes); if (i !== j) edges.push([i, j]) }
  const parts = []
  for (const [i, j] of edges) { const a = pts[i], b = pts[j], m = lerp(a, b, 0.5), n = [-(b[1] - a[1]), b[0] - a[0]], k = (R() - 0.5) * 0.5
    const c = [m[0] + n[0] * k, m[1] + n[1] * k]
    parts.push(brush(t => quad(a, c, b, t), t => 0.45 + w * Math.pow(Math.abs(t - 0.5) * 2, 2.2), { N: 120, needle: 0 })) }
  for (let f = 0; f < free; f++) { const a = pts[Math.floor(R() * nodes)], ang = R() * 2 * Math.PI, L = 18 + R() * 30
    const e = clampBox([a[0] + Math.cos(ang) * L, a[1] + Math.sin(ang) * L]), c = [lerp(a, e, 0.5)[0] + (R() - 0.5) * 12, lerp(a, e, 0.5)[1] + (R() - 0.5) * 12]
    parts.push(brush(t => quad(a, c, e, t), t => w * Math.pow(1 - t, 1.6) + 0.1, { N: 100, needle: 0 })) }
  for (const p of pts) parts.push(sparkle(p[0], p[1], 2.2 + R() * 1.5, 2.2 + R() * 1.5, { pinch: 0.35, bend: 0.5, rotate: R() * 90 }))
  return { joined: fitBox(pc.union(...parts), 3) }
}

// Campo di flusso: linee sottili che seguono un rumore morbido, dentro una maschera,
// distanziate in modo uniforme (una linea si ferma quando si avvicina troppo a un'altra).
function flowField(seed, { inside = (x, y) => Math.hypot(x - 50, y - 50) < 44, sep = 2.1, w = 0.55, scale = 0.05, step = 0.6, maxLen = 160 } = {}) {
  const R = rng(seed * 9973 + 1), ph = Array.from({ length: 6 }, () => R() * 6.28)
  const ang = (x, y) => Math.sin(x * scale + ph[0]) * 1.5 + Math.cos(y * scale * 1.2 + ph[1]) * 1.3 + Math.sin((x - y) * scale * 0.6 + ph[2]) * 0.8
  const cell = sep / 2, grid = new Map(), key = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`
  const near = (p, own) => { const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell)
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const l = grid.get(`${cx + i},${cy + j}`); if (l) for (const q of l) if (q.id !== own && Math.hypot(q.x - p[0], q.y - p[1]) < sep) return true }
    return false }
  const add = (p, id) => { const k = key(...p); if (!grid.has(k)) grid.set(k, []); grid.get(k).push({ x: p[0], y: p[1], id }) }
  const parts = []; let id = 0
  const seeds = []
  for (let y = 3; y < 97; y += sep * 1.3) for (let x = 3; x < 97; x += sep * 1.3) seeds.push([x + (R() - 0.5) * sep, y + (R() - 0.5) * sep])
  seeds.sort(() => R() - 0.5)
  for (const s0 of seeds) {
    if (!inside(...s0) || near(s0, -1)) continue
    id++
    const trace = dir => { const out = []; let p = s0
      for (let k = 0; k < maxLen; k++) { const a = ang(...p); const q = [p[0] + Math.cos(a) * step * dir, p[1] + Math.sin(a) * step * dir]
        if (!inside(...q) || near(q, id)) break; out.push(q); p = q }
      return out }
    const pts = [...trace(-1).reverse(), s0, ...trace(1)]
    if (pts.length < 14) continue
    pts.forEach(p => add(p, id))
    const at = t => { const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)); return lerp(pts[i], pts[i + 1], f - i) }
    parts.push(brush(at, t => w * Math.pow(Math.sin(Math.PI * t), 0.35) + 0.12, { N: Math.min(200, pts.length), needle: 0 }))
  }
  return { joined: pc.union(...parts) }
}

// ── Combinazioni: strumenti ───────────────────────────────────────────────
// Mette una forma (anche un sigillo) dentro un riquadro [x0, y0, x1, y1].
const place = (g, box) => ({ joined: fitBox(g.joined || g, 0, box) })
// Maschera una copertura di punti: zero vicino ai tratti indicati (i punti non li toccano).
const masked = (cov, geoms, gap = 2.6) => (x, y) => (geoms.some(g => sdGeom([x, y], g) < gap) ? 0 : cov(x, y))
// Scia di punti lungo una curva at(t): raggio da r0 a r1, passo costante lungo la curva.
function dotTrail(at, n, r0, r1, { t0 = 0, t1 = 1 } = {}) {
  const N = 400, pos = [0], pts = [at(t0)]
  for (let i = 1; i <= N; i++) { const p = at(t0 + (t1 - t0) * i / N); pos.push(pos[i - 1] + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])); pts.push(p) }
  const out = []
  for (let k = 0; k < n; k++) { const target = pos[N] * k / Math.max(1, n - 1), i = pos.findIndex(v => v >= target - 1e-9), u = k / Math.max(1, n - 1)
    out.push(dot(pts[i][0], pts[i][1], r0 + (r1 - r0) * u)) }
  return out
}
// Mezzatinta a cerchi concentrici (al posto della griglia): anelli di punti attorno a (cx, cy).
function halftoneRadial(cov, cx = 50, cy = 50, { step = 3.2, rmaxR = 48 } = {}) {
  const out = [], rm = step * 0.46
  const f = v => String(Math.round(v * 100) / 100)
  for (let rr = 0; rr <= rmaxR; rr += step) {
    const n = rr === 0 ? 1 : Math.round(2 * Math.PI * rr / step)
    for (let i = 0; i < n; i++) {
      const a = i * 2 * Math.PI / n + rr * 0.07, x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a), r = rm * clamp01(cov(x, y))
      if (r > 0.25 && x > 1 && x < 99 && y > 1 && y < 99) out.push(`M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`)
    }
  }
  return { raw: out.join('') }
}
// Coperture pronte per le stelle a punti.
const covFill = (g, fade = 8) => (x, y) => clamp01(0.85 - sdGeom([x, y], g) / fade)
const covGlow = (g, fade = 10) => (x, y) => { const d = sdGeom([x, y], g); return d < -3 ? 1.2 : clamp01(0.75 - d / fade) }
const covLine = (g, band = 4) => (x, y) => clamp01(1 - Math.abs(sdGeom([x, y], g) + 1) / band)

// Sigillo a raggiera senza nucleo (per metterci al centro una stella a punti).
const haloOpen = s => { const R = rng(s); return sigilOf([...fan([54, 44], { n: 3, a0: -10, a1: -60, L: 40, curl: 90 + R() * 40, seed: s }), ...fan([54, 56], { n: 3, a0: 10, a1: 60, L: 40, curl: -(90 + R() * 40), start: [0, 1], seed: s + 9 })]) }
const flipY = g => ({ joined: (g.joined || g).map(p => p.map(r => r.map(([x, y]) => [x, 100 - y]))) })
const geomOf = g => g.joined || g

// ── Composizioni ──────────────────────────────────────────────────────────
// Orbita completa attorno a dei corpi: spezzata automaticamente dove li incontra.
const ringAround = (bodies, cx, cy, rx, ry, o = {}) => [...bodies, ...orbit(cx, cy, rx, ry, -90, 270, { avoid: bodies, echo: [40, 140], ...o })]
// Sparkle con faccette incise: quattro tagli a capello lungo gli assi (dal centro verso
// le punte, senza staccarle) danno un effetto a rilievo. Solo sugli sparkle grandi.
function facetSparkle(cx, cy, rx, ry = rx, o = {}) {
  const g = sparkle(cx, cy, rx, ry, o)
  const cuts = []
  for (const [len, ax] of [[ry, [0, -1]], [rx, [1, 0]], [ry, [0, 1]], [rx, [-1, 0]]]) {
    if (len < 22) continue
    const d = rotP([cx + ax[0], cy + ax[1]], cx, cy, o.rotate || 0), u = [d[0] - cx, d[1] - cy]
    const a = [cx + u[0] * len * 0.2, cy + u[1] * len * 0.2], b = [cx + u[0] * len * 0.66, cy + u[1] * len * 0.66]
    cuts.push(brush(t => lerp(a, b, t), t => 0.85 * Math.sin(Math.PI * t), { needle: 0 }))
  }
  return cuts.length ? pc.difference(g, ...cuts)[0] ? pc.difference(g, ...cuts) : g : g
}
const S = (cx, cy, rx, ry = rx, o = {}) => (Math.max(rx, ry) >= 30 ? facetSparkle(cx, cy, rx, ry, o) : sparkle(cx, cy, rx, ry, o))

const CATS = {
  'GLIFI · PIENI': {
    'Sparkle':          [S(50, 50, 36, 48, { pinch: 0.08 })],
    'Sparkle Slim': [sparkle(50, 50, 18, 47, { pinch: 0.12 })],
    'Sparkle Wide':     [S(50, 50, 48, 30, { pinch: 0.1 })],
    'Twinkle': [twinkle()],
    'Cross Flare': [join(crossFlare())],
    'Glint': [join(glint())],
    'Starburst':        [burst(50, 50, 47)],
    'Starburst Alt':    [burst(50, 50, 47, { alt: 0.58 })],
    'Bloom': [bloom()],
    'Bloom 6': [bloom(50, 50, 46, { n: 6, depth: 0.5 })],
    'Bloom 12': [bloom(50, 50, 46, { n: 12, depth: 0.28, round: 0.7 })],
    'Gear': [join(gear())],
    'Target': [join(targetSolid())],
    'Sparkle Duo':      [S(40, 58, 28, 38, { pinch: 0.08 }), S(82, 20, 12, 16)],
    'Sparkle Trio':     [S(42, 52, 20, 46, { pinch: 0.12 }), S(78, 24, 10, 15), S(16, 84, 7, 10)],
    'Sparkle Blade':    [blade(50, 50, 1.35)],
  },
  'GLIFI · LINEA': {
    'Sparkle Line': [join(lineOf(sparkle(50, 50, 34, 47, { pinch: 0.1 }), 1.6))],
    'Slim Line': [join(lineOf(sparkle(50, 50, 18, 47, { pinch: 0.12 }), 1.6))],
    'Bloom Line': [join(lineOf(bloom(), 1.6))],
    'Bloom 6 Line': [join(lineOf(bloom(50, 50, 46, { n: 6, depth: 0.5 }), 1.6))],
    'Gear Line': [join(lineOf(gear(), 1.4))],
    'Target Line': [join(target(50, 50, 46, { rings: 4, w: 1.4 }))],
    'Echo Bloom': [join(echo(k => bloom(50, 50, 46 * k), [1, 0.74, 0.48, 0.22]))],
    'Echo Sparkle': [join(echo(k => sparkle(50, 50, 34 * k, 47 * k, { pinch: 0.16 })))],
    'Echo Slim': [join(echo(k => sparkle(50, 50, 18 * k + 2, 47 * k, { pinch: 0.2 }), [1, 0.7, 0.4]))],
    'Globe': [join(globe())],
    'Lens Grid': [join(warpGrid())],
    'Squares': [join(concentricSquares())],
    'Sparkle Inlay':    [sparkleLine(50, 50, 34, 48, 1.4, { pinch: 0.1 }), S(50, 50, 9, 16, { pinch: 0.12 })],
    'Sparkle Hatch':    (() => { const g = sparkle(50, 50, 32, 46, { pinch: 0.1 })
      return [join(sparkleLine(50, 50, 32, 46, 0.9, { pinch: 0.1 }), hatch(sparkle(50, 50, 31.3, 45.3, { pinch: 0.1 }), { shadeAt: sideShade(-135), gap: 2.2 }))] })(),
  },
  'GLIFI · MEZZATINTA': {
    'Dot Sparkle': [halftone(covGlow(sparkle(50, 50, 34, 47, { pinch: 0.1 }), 7), { step: 2.6 })],
    'Dot Slim': [halftone(covGlow(sparkle(50, 50, 18, 47, { pinch: 0.12 }), 7), { step: 2.6 })],
    'Dot Twinkle': [halftone(covGlow(twinkle(), 7), { step: 2.6 })],
    'Dot Flare': [halftone(covGlow(crossFlare(), 6), { step: 2.2 })],
    'Dot Bloom': [halftone(covGlow(bloom(), 7), { step: 2.6 })],
    'Dot Gear': [halftone(covGlow(gear(), 6), { step: 2.6 })],
    'Dot Target': [halftoneRadial(covGlow(targetSolid(), 5), 50, 50, { step: 2.4 })],
    'Halftone Star':       [htFill(star5(50, 54, 44), 10)],
    'Halftone Star Line':  [htLine(star5(50, 54, 42), 4.5, { step: 2.8 })],
    'Halftone Star Hollow':[halftone((x, y) => { const d = sdGeom([x, y], star5(50, 54, 44)); return d > 0 ? clamp01(0.7 - d / 8) : clamp01(1.1 - Math.abs(d + 6) / 6) })],
    'Halftone Star Glow':  [htGlow(star5(50, 54, 34), 12)],
    'Stella Radiale':        [halftoneRadial(covFill(star5(50, 54, 44), 8), 50, 52, { step: 2.8 })],
    'Halftone Burst':      [htFill(burst(50, 50, 46, { inner: 0.1, alt: 0.6 }), 6, { step: 2.6 })],
  },
  'MANUALE TECNICO': {
    'Callout 1':        [join(...callout([26, 74], [70, 30], 1, { r: 9 }))],
    'Callout 2':        [join(...callout([26, 74], [70, 30], 2, { r: 9 }))],
    'Callout 3':        [join(...callout([26, 74], [70, 30], 3, { r: 9 }))],
    'Callout Set':      [join(...callout([34, 62], [72, 26], 1)), join(...callout([46, 76], [82, 72], 2)), join(...callout([24, 46], [14, 14], 3))],
    'Dimension':        [join(...dimension([8, 50], [92, 50]))],
    'Dimension Cross':  [join(...dimension([8, 50], [92, 50], { ticks: false }), ...dimension([50, 8], [50, 92], { ticks: false }))],
    'Registration':     [join(...registration(50, 50, 44))],
    'Crop Marks':       [join(...cropMarks())],
    'Ruler':            [join(...ruler(6, 94, 54))],
    'Rotate Arrow':     [join(...rotateArrow())],
    'Arrow':            [join(line([8, 50], [86, 50], TW, 0), ...arrowHead([92, 50], 0, 8))],
    'Arrow Dashed':     [join(...dashed([8, 50], [84, 50]), ...arrowHead([92, 50], 0, 8, { open: false }))],
    'Exploded Axis':    [join(...dashed([50, 10], [50, 90]), ...arrowHead([50, 4], -90, 7), ...arrowHead([50, 96], 90, 7))],
    'Callout Arrow':    [join(...calloutArrow([24, 76], [70, 30], 1, { r: 9 }))],
    'Steps':            [join(...stepBadge([14, 50], 1)), join(...dashed([24, 50], [36, 50]), ...arrowHead([40, 50], 0, 4, { open: false })), join(...stepBadge([50, 50], 2)), join(...dashed([60, 50], [72, 50]), ...arrowHead([76, 50], 0, 4, { open: false })), join(...stepBadge([86, 50], 3))],
    'Section Marker':   [join(...sectionMarker(36, 50, 18))],
    'Angle':            [join(...angleMarker(12, 80, 80, 38))],
    'Scale Bar':        [join(...scaleBar(8, 92, 47, 6, 6))],
    'Plus Grid':        plusGrid(6, 8, 2.6),
    'HUD Reticle':      [join(...hudReticle(50, 50, 44))],
  },
  'SPEC': {
    'Sparkle Spec':     [join(sparkle(44, 46, 16, 38, { pinch: 0.12 }), ...callout([45.5, 20], [80, 14], 1)), join(...dimension([28, 92], [60, 92], { ticks: true }))],
    'Flare Spec':       [join(crossFlare(46, 54, 40), ...callout([46, 54], [84, 16], 2))],
    'Bloom Spec':       [join(lineOf(bloom(44, 54, 32), 1.4), ...callout([44, 54], [86, 12], 3)), join(...dimension([12, 93], [76, 93], { ticks: true }))],
    'Gear Exploded':    [join(gear(44, 22, 17), ...callout([60, 26], [86, 40], 1)), join(...dashed([44, 43], [44, 57])), join(gear(44, 78, 17, { teeth: 12, hole: 0.42 }), ...callout([60, 74], [86, 60], 2))],
    'Globe Spec':       [join(globe(44, 50, 36), ...callout([64, 24], [86, 10], 1)), join(...ruler(8, 80, 97, 2.4))],
    'Target Spec':      [join(...registration(50, 50, 30), lineOf(sparkle(50, 50, 6, 12, { pinch: 0.15 }), 1)), join(...cropMarks(6, 10))],
    'Slim Spec':        [join(sparkle(40, 50, 14, 44, { pinch: 0.12 }), ...callout([40, 50], [84, 30], 1)), join(...dimension([10, 6], [10, 94], { ticks: true }))],
    'Twinkle Spec':     [twinkle(42, 56, 36), join(...calloutArrow([55.5, 42.5], [84, 14], 2))],
    'Bloom Exploded':   [join(lineOf(bloom(50, 24, 20), 1.3)), join(...dashed([50, 47], [50, 55])), join(lineOf(bloom(50, 78, 20, { n: 6, depth: 0.5 }), 1.3)), join(...stepBadge([86, 24], 1, 6)), join(...stepBadge([86, 78], 2, 6))],
    'Flow Specimen':    [flowField(8, { inside: (x, y) => Math.hypot(x - 50, y - 50) < 32, sep: 1.8 }), join(...cropMarks(6, 10))],
  },
  'RAGNATELE': {
    'Web 1':            [web(1)], 'Web 2': [web(4)], 'Web 3': [web(6)], 'Web 4': [web(9)], 'Web 5': [web(10)], 'Web 6': [web(12)],
    'Web Tall':         [web(3, { nodes: 5, free: 5, box: [42, 8, 58, 92] })],
    'Web Wide':         [web(7, { nodes: 5, free: 5, box: [8, 40, 92, 60] })],
  },
  'FLUSSI': {
    'Flow Circle':      [flowField(1)],
    'Flow Square':      [flowField(2, { inside: (x, y) => x > 5 && x < 95 && y > 5 && y < 95 })],
    'Flow Band':        [flowField(4, { inside: (x, y) => y > 32 && y < 68 && x > 3 && x < 97, sep: 1.8 })],
    'Flow Ring':        [flowField(5, { inside: (x, y) => { const d = Math.hypot(x - 50, y - 50); return d < 46 && d > 24 }, sep: 1.8 })],
    'Flow Bloom':       [flowField(6, { inside: (x, y) => sdGeom([x, y], bloom()) < -0.5, sep: 1.8 })],
    'Flow Arch':        [flowField(7, { inside: (x, y) => (y > 50 ? Math.abs(x - 50) < 40 : Math.hypot(x - 50, y - 50) < 40) && y < 96, sep: 1.9 })],
    'Flow Sparkle':     [flowField(9, { inside: (x, y) => sdGeom([x, y], sparkle(50, 50, 44, 47, { pinch: 0.25, bend: 0.6 })) < -0.5, sep: 1.6 })],
    'Flow Diagonal':    [flowField(10, { inside: (x, y) => Math.abs(x - y) < 26 && x > 3 && x < 97 && y > 3 && y < 97, sep: 1.8 })],
    'Flow Half':        [flowField(11, { inside: (x, y) => y > 50 && Math.hypot(x - 50, y - 50) < 46, sep: 1.8 })],
  },
  'ORBITE': {
    'Saturn Sparkle':   ringAround([S(50, 46, 15, 44, { pinch: 0.12 })], 50, 54, 46, 14),
    'Saturn Tilt':      ringAround([S(50, 50, 15, 46, { pinch: 0.12 })], 50, 52, 46, 15, { tilt: 14 }),
    'Halo Sparkle':     ringAround([S(46, 44, 14, 42, { pinch: 0.12 }), S(80, 84, 6, 10)], 47, 54, 44, 13),
    'Halo Wide':        ringAround([S(50, 50, 30, 44, { pinch: 0.08 })], 50, 56, 47, 12, { wf: 5.5 }),
    'Orbit Twin':       ringAround([S(38, 48, 14, 40, { pinch: 0.12 }), S(64, 32, 9, 22, { pinch: 0.12 })], 50, 58, 45, 14),
    'Orbit X':          ringAround([cross(56, 40, 34), cross(16, 24, 11, { inner: 0.13 })], 50, 62, 46, 15),
    'Orbit Swoosh':     orbit(50, 44, 46, 16, 20, 300, { echo: [45, 150] }),
    'Orbit Dust':       [...orbit(50, 56, 46, 15, 20, 300, { echo: [45, 150] }), S(55, 22, 6, 10), S(68, 20, 4, 7), dot(43, 23, 1.8)],
    'Comet Trail':      [...orbit(50, 48, 46, 15, 25, 300, { wb: 0.6, tilt: -16, echo: [50, 150] }), S(82, 18, 6, 10), S(14, 82, 4, 7)],
  },
  'SPINE & INCHIOSTRO': {
    'Thorn Branch':     [thornBranch([6, 84], [34, 54], [58, 66], [94, 16], { n: 7, len: 15 })],
    'Thorn Stem':       [thornBranch([10, 92], [36, 66], [62, 38], [90, 10], { n: 6, len: 15, w: 6 })],
    'Thorn Crown':      (() => {
      const parts = [ringO(50, 50, 30, 1.7)]
      for (let i = 0; i < 14; i++) { const a = rad(i * 360 / 14), c = [50 + 30 * Math.cos(a), 50 + 30 * Math.sin(a)], tan = [-Math.sin(a), Math.cos(a)]
        parts.push(thorn(c, tan, i % 2 ? 1 : -1, i % 2 ? 9 : 16, 1.6, { lean: 0.4 })) }
      return [{ joined: pc.union(...parts) }]
    })(),
    'Thorn Stipple':    (() => { const g = thornBranch([6, 84], [34, 54], [58, 66], [94, 16], { n: 7, len: 15, w: 9 })
      return [stipple(shade(g, { light: -60, edge: 2.6, base: 0.03, side: 0.8 }), { step: 0.62, r: 0.4, seed: 4 })] })(),
    'Thorn Stipple Arc':(() => { const g = thornBranch([10, 78], [24, 22], [76, 22], [90, 78], { n: 7, len: 10, w: 8, seed: 5 })
      return [stipple(shade(g, { light: -90, edge: 2.4, base: 0.03, side: 0.8 }), { step: 0.62, r: 0.4, seed: 8 })] })(),
    'Ink Smoke':        (() => { const b = [blade(20, 30, 0.5, { rot: 45 }), blade(48, 58, 0.42, { rot: 45 }), blade(76, 84, 0.5, { rot: 45 })]
      return [...b, ...inkSmoke([[8, 2], [22, 10], [30, 22], [44, 30], [52, 42], [66, 50], [76, 62], [90, 70], [97, 90]], { avoid: b })] })(),
    'Ink Smoke Line':   inkSmoke([[4, 8], [22, 22], [28, 44], [46, 50], [54, 66], [72, 70], [80, 88], [96, 96]], { seed: 21, w: 2.8 }),
  },
  'OP ART': {
    'Arc Wave':         [serpentine(8, 10.5, [{ top: 16, bot: 70 }, { top: 40, bot: 92 }, { top: 30, bot: 84 }, { top: 8, bot: 60 }], { n: 7 }), dot(39.5, 24, 6), dot(81.5, 80, 6)],
    'Arc Serpent':      [serpentine(5, 7.5, [{ top: 10, bot: 60 }, { top: 40, bot: 90 }, { top: 10, bot: 60 }, { top: 40, bot: 90 }, { top: 10, bot: 60 }, { top: 40, bot: 90 }], { n: 6, gap: 3 })],
  },
}

// ── ICONE (viewBox 24): stesse forme in scala, piene ───────────────────────
const ICON_FROM = {
  Sparkle: 'Sparkle', 'Sparkle Slim': 'Sparkle Slim', Twinkle: 'Twinkle', Flare: 'Cross Flare', Glint: 'Glint', Starburst: 'Starburst',
  Bloom: 'Bloom', 'Bloom Line': 'Bloom Line', Gear: 'Gear', Target: 'Target Line', Globe: 'Globe', 'Sparkle Line': 'Sparkle Line',
  Orbit: 'Saturn Sparkle', Halo: 'Halo Wide', Thorn: 'Thorn Branch', Arcs: 'Arc Wave',
}

// ── Esplorazione glifi: GLYPH_EXPLORE=<cartella> scrive la matrice glifo × trattamento ──
const GLYPHS = {
  sparkle: () => sparkle(50, 50, 34, 47, { pinch: 0.1 }), slim: () => sparkle(50, 50, 18, 47, { pinch: 0.12 }), twinkle: () => twinkle(), flare: () => crossFlare(),
  glint: () => glint(), burst: () => burst(50, 50, 47), bloom: () => bloom(), bloom6: () => bloom(50, 50, 46, { n: 6, depth: 0.5 }), cross: () => crossArm(),
  gear: () => gear(), target: () => targetSolid(), star: () => star5(50, 53, 46),
}
const DS = {
  callouts: () => pc.union(...callout([30, 60], [64, 26], 1), ...callout([40, 74], [78, 64], 2), ...callout([22, 40], [16, 14], 3)),
  dim: () => pc.union(...dimension([12, 50], [88, 50]), ...dimension([50, 14], [50, 86], { off: 0 })),
  reg: () => pc.union(...registration(50, 50, 44)), crop: () => pc.union(...cropMarks()), ruler: () => pc.union(...ruler()),
  rot: () => pc.union(...rotateArrow()), arrows: () => pc.union(line([10, 50], [86, 50], TW, 0), ...arrowHead([90, 50], 0, 7), ...dashed([10, 70], [86, 70]), ...arrowHead([90, 70], 0, 7, { open: false })),
  ...Object.fromEntries([5,6,7,8,9,10,11,12].map(k => [`web${k}`, () => web(k).joined])),
  web1: () => web(1).joined, web2: () => web(2).joined, web3: () => web(3).joined, web4: () => web(4).joined,
  flow1: () => flowField(1).joined, flow2: () => flowField(2, { inside: (x, y) => x > 6 && x < 94 && y > 6 && y < 94 }).joined,
  flow3: () => flowField(3, { inside: (x, y) => sdGeom([x, y], sparkle(50, 50, 34, 47, { pinch: 0.1 })) < 0, n: 220 }).joined,
}
const LINES = {
  globe: () => globe(), squares: () => concentricSquares(), warp: () => warpGrid(), echoSparkle: () => echo(k => sparkle(50, 50, 34 * k, 47 * k, { pinch: 0.16 })),
  echoBloom: () => echo(k => bloom(50, 50, 46 * k), [1, 0.74, 0.48, 0.22]), echoSlim: () => echo(k => sparkle(50, 50, 18 * k + 2, 47 * k, { pinch: 0.2 }), [1, 0.7, 0.4]),
}
if (process.env.GLYPH_EXPLORE) {
  const dir = process.env.GLYPH_EXPLORE; mkdirSync(dir, { recursive: true })
  const svg = d => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${d}" fill="currentColor"/></svg>`
  for (const [k, f] of Object.entries(GLYPHS)) {
    const g = f()
    writeFileSync(`${dir}/${k}-1solid.svg`, svg(toPath(g)))
    writeFileSync(`${dir}/${k}-2line.svg`, svg(toPath(lineOf(g, 1.6))))
    writeFileSync(`${dir}/${k}-3half.svg`, svg(halftone(covGlow(g, 7), { step: 2.6 }).raw))
  }
  for (const [k, f] of Object.entries(LINES)) writeFileSync(`${dir}/z-${k}.svg`, svg(toPath(f())))
  for (const [k, f] of Object.entries(DS)) writeFileSync(`${dir}/ds-${k}.svg`, svg(toPath(f())))
  process.exit(0)
}

// ── Esplorazione: SIGIL_EXPLORE=<cartella> genera candidati e si ferma ─────
if (process.env.SIGIL_EXPLORE) {
  const dir = process.env.SIGIL_EXPLORE, conf = JSON.parse(process.env.SIGIL_CONF || '{}')
  mkdirSync(dir, { recursive: true })
  for (let i = 1; i <= (conf.count || 48); i++) {
    const g = conf.type === 'vine' ? vine(i, conf) : SIGILS[conf.type || 'wing'](i)
    writeFileSync(`${dir}/s${String(i).padStart(2, '0')}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${toPath(g.joined)}" fill="currentColor"/></svg>`)
  }
  process.exit(0)
}

// ── Scrittura ──────────────────────────────────────────────────────────────
const geoms = {}
const cats = Object.fromEntries(Object.entries(CATS).map(([cat, items]) => [cat, Object.entries(items).map(([name, parts]) => {
  geoms[name] = compose(name, parts)
  return { name, path: (geoms[name].length ? toPath(geoms[name]) : '') + rawOf[name] }
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
