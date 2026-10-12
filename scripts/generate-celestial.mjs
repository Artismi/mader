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
  const width = t => w * (1 - tipTaper * t) + 0.3
  const parts = [brush(at, width, { needle: 0.12 })]
  for (let i = 0; i < n; i++) {
    const t = 0.1 + 0.8 * (i + 0.5) / n + (R() - 0.5) * 0.04, h = 1e-3
    const a = at(t), b = at(t + h), tl = Math.hypot(b[0] - a[0], b[1] - a[1])
    const tan = [(b[0] - a[0]) / tl, (b[1] - a[1]) / tl], side = i % 2 ? 1 : -1
    const wl = width(t) / 2
    parts.push(thorn([a[0] - tan[1] * side * wl * 0.5, a[1] + tan[0] * side * wl * 0.5], tan, side, len * 1.7 * (0.8 + R() * 0.4) * (1 - 0.25 * t), wl * 1.7, { lean: 0.15 + R() * 0.3 }))
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
  'CELESTIAL · Sparkle': {
    'Sparkle':          [S(50, 50, 36, 48, { pinch: 0.08 })],
    'Sparkle Tall':     [S(50, 50, 20, 48, { pinch: 0.12 })],
    'Sparkle Needle':   [S(50, 50, 12, 48, { pinch: 0.14 })],
    'Sparkle Wide':     [S(50, 50, 48, 30, { pinch: 0.1 })],
    'Sparkle Duo':      [S(40, 58, 28, 38, { pinch: 0.08 }), S(82, 20, 12, 16)],
    'Sparkle Trio':     [S(42, 52, 20, 46, { pinch: 0.12 }), S(78, 24, 10, 15), S(16, 84, 7, 10)],
    'Sparkle Pair':     [S(32, 40, 18, 38, { pinch: 0.12 }), S(72, 62, 14, 32, { pinch: 0.12 })],
    'Sparkle Steps':    [S(22, 74, 10, 16), S(48, 52, 13, 22), S(78, 26, 18, 24)],
    'Twinkle Field':    [S(26, 30, 12, 20), S(70, 24, 7, 11), S(64, 68, 16, 26), S(20, 80, 5, 8), dot(44, 54, 1.8)],
    'Dot Sparkle':      [S(50, 50, 28, 42, { pinch: 0.08 }), dot(86, 14, 3.2), dot(14, 86, 2.4)],
    'Constellation':    [S(18, 70, 8, 12), dot(36, 52, 2), S(56, 44, 11, 17), dot(74, 30, 2), S(86, 14, 6, 10), dot(30, 86, 1.6)],
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
  },
  'CELESTIAL · Fine Line': {
    'Sparkle Outline':  [sparkleLine(50, 50, 34, 48, 1.4, { pinch: 0.1 })],
    'Sparkle Inlay':    [sparkleLine(50, 50, 34, 48, 1.4, { pinch: 0.1 }), S(50, 50, 9, 16, { pinch: 0.12 })],
    'Sparkle Halo':     [S(50, 50, 14, 30, { pinch: 0.12 }), ...Array.from({ length: 24 }, (_, i) => dot(50 + 42 * Math.cos(i * Math.PI / 12), 50 + 42 * Math.sin(i * Math.PI / 12), i % 2 ? 0.8 : 1.4))],
    'Sparkle Frame':    [S(50, 50, 12, 26, { pinch: 0.12 }), ringO(50, 50, 34, 1), ...[0, 90, 180, 270].map(d => ray(50, 50, d, 38, 48, 1.6)), ...[45, 135, 225, 315].map(d => dot(50 + 40 * Math.cos(rad(d)), 50 + 40 * Math.sin(rad(d)), 1.2))],
    'Fine Flare':       [join(needles(50, 50, 48, { n: 4, inner: 0.03, concave: 0.55 }), needles(50, 50, 22, { n: 4, inner: 0.06, rotate: 45, concave: 0.5 }))],
    'Constellation Line': (() => {
      const st = [[16, 74, 6], [36, 56, 4], [56, 62, 8], [70, 36, 5], [88, 16, 7]]
      return [...st.map(([x, y, r]) => S(x, y, r * 0.7, r * 1.15)), ...st.slice(1).map((b, i) => link(st[i], b, st[i][2] + 3, b[2] + 3))]
    })(),
    'Constellation Hunter': (() => {
      const st = [[22, 14, 5], [74, 18, 6], [42, 50, 3], [50, 50, 3], [58, 50, 3], [26, 86, 6], [78, 84, 5]]
      const e = [[0, 2], [1, 4], [2, 5], [4, 6]]
      return [...st.map(([x, y, r]) => (r > 3 ? S(x, y, r * 0.75, r * 1.2) : dot(x, y, 1.6))), ...e.map(([a, b]) => link(st[a], st[b], st[a][2] + 2.5, st[b][2] + 2.5))]
    })(),
    'Crescent Fine':    [crescent(50, 50, 42)],
    'Crescent Sparkle': [crescent(42, 54, 36), S(78, 24, 8, 16, { pinch: 0.12 }), S(86, 50, 4, 7)],
    'Crescent Hanging': (() => {
      const m = crescent(50, 34, 26, { dir: -90 })
      return [m, line([38, 64], [38, 74]), S(38, 86, 4, 7), line([50, 66], [50, 82]), S(50, 94, 3, 5), line([62, 64], [62, 69]), S(62, 80, 4, 7)]
    })(),
    'Moon Phases':      [circle(10, 50, 7), pc.union(ringO(30, 50, 7, 1), poly(Array.from({ length: 41 }, (_, i) => [30 + 7 * Math.cos(rad(90 + i * 4.5)), 50 + 7 * Math.sin(rad(90 + i * 4.5))]))), ringO(50, 50, 7, 1), pc.union(ringO(70, 50, 7, 1), poly(Array.from({ length: 41 }, (_, i) => [70 + 7 * Math.cos(rad(-90 + i * 4.5)), 50 + 7 * Math.sin(rad(-90 + i * 4.5))]))), circle(90, 50, 7)],
    'Moon Phases Arc':  [0, 1, 2, 3, 4].map(i => { const a = rad(200 + i * 35), x = 50 + 40 * Math.cos(a), y = 70 + 40 * Math.sin(a); return i === 2 ? S(x, y, 7, 12) : moon(x, y, 7, { phase: 0.55, rotate: i < 2 ? 160 : -20 }) }),
    'Dot Orbit':        [S(50, 48, 13, 42, { pinch: 0.12 }), ...dotOrbit(50, 54, 46, 14, 30, { avoid: [S(50, 48, 13, 42, { pinch: 0.12 })] })],
    'Sacred Triangle':  [join(line([50, 8], [92, 82], 1.2, 0.02), line([92, 82], [8, 82], 1.2, 0.02), line([8, 82], [50, 8], 1.2, 0.02)), S(50, 58, 9, 16, { pinch: 0.12 }), dot(50, 92, 1.4), dot(50, 97, 0.9)],
    'Sacred Circle':    [ringO(50, 50, 40, 1.1), ringO(50, 50, 30, 0.8), S(50, 50, 10, 20, { pinch: 0.12 }), ...[0, 90, 180, 270].map(d => dot(50 + 35 * Math.cos(rad(d)), 50 + 35 * Math.sin(rad(d)), 1.3))],
    'Comet Fine':       [S(78, 22, 10, 16, { pinch: 0.12 }), line([8, 92], [66, 34], 1.2, 0.5), line([18, 94], [64, 46], 0.9, 0.5), line([6, 80], [56, 36], 0.8, 0.5)],
  },
  'CELESTIAL · Flash Tattoo': {
    'Sun Flame':        [ringO(50, 50, 16, 1.6), dot(50, 50, 3), ...Array.from({ length: 16 }, (_, i) => ray(50, 50, i * 22.5 - 90, 21, i % 2 ? 40 : 48, i % 2 ? 2.4 : 2.8, { wave: i % 2 ? 2.2 : 0 }))],
    'Sun Black':        [circle(50, 50, 15), ...Array.from({ length: 24 }, (_, i) => ray(50, 50, i * 15, 20, i % 3 === 0 ? 48 : i % 3 === 1 ? 34 : 40, i % 3 === 0 ? 2.6 : 1.6))],
    'Sun Sparkle':      [ringO(50, 50, 20, 1.4), S(50, 50, 9, 15, { pinch: 0.12 }), ...Array.from({ length: 12 }, (_, i) => ray(50, 50, i * 30 - 90, 25, i % 2 ? 38 : 48, 2.2, { wave: i % 2 ? 0 : 1.8, waves: 1 }))],
    'Sun Moon':         [crescent(44, 52, 38, { dir: -25 }), circle(62, 44, 8), ...Array.from({ length: 8 }, (_, i) => ray(62, 44, i * 45, 12, i % 2 ? 17 : 21, 1.6)).filter((_, i) => ![3, 4, 5].includes(i))],
    'Burst Seal':       [join(needles(50, 50, 48, { n: 8, inner: 0.06, alt: 0.6 }), ringO(50, 50, 24, 1.2))],
    'Sparkle Cross':    [S(50, 50, 12, 46, { pinch: 0.1 }), ...[45, 135, 225, 315].map(d => ray(50, 50, d, 12, 36, 1.8))],
  },
  'TATTOO · Spine': {
    'Thorn Branch':     [thornBranch([6, 84], [34, 54], [58, 66], [94, 16], { n: 7, len: 15 })],
    'Thorn Stem':       [thornBranch([10, 92], [36, 66], [62, 38], [90, 10], { n: 6, len: 15, w: 6 })],
    'Thorn Arc':        [thornBranch([12, 76], [24, 24], [76, 24], [88, 76], { n: 7, len: 9, w: 5, seed: 5 })],
    'Thorn Sparkle':    [thornBranch([6, 92], [26, 70], [44, 62], [62, 42], { n: 4, len: 12, w: 5.5 }), S(80, 22, 10, 18, { pinch: 0.1 })],
    'Thorn Crown':      (() => {
      const parts = [ringO(50, 50, 30, 3.2)]
      for (let i = 0; i < 14; i++) { const a = rad(i * 360 / 14), c = [50 + 30 * Math.cos(a), 50 + 30 * Math.sin(a)], tan = [-Math.sin(a), Math.cos(a)]
        parts.push(thorn(c, tan, i % 2 ? 1 : -1, i % 2 ? 9 : 16, 2.6, { lean: 0.4 })) }
      return [{ joined: pc.union(...parts) }]
    })(),
    'Thorn Dotwork':    [htGlow(thornBranch([6, 86], [30, 60], [60, 52], [94, 14], { n: 7, len: 15, w: 8 }), 6, { step: 2.4 })],
  },
  'TATTOO · Ink & Blade': {
    'Sparkle Blade':    [blade(50, 50, 1.35)],
    'Blade Straight':   [blade(50, 50, 1.35, { bend: 0 })],
    'Blade Vertical':   [blade(50, 50, 1.35, { rot: -90, bend: 5 })],
    'Blade Trio':       [blade(26, 24, 0.62), blade(50, 52, 0.55), blade(76, 80, 0.62)],
    'Blade Pair':       [blade(34, 38, 0.85), blade(78, 76, 0.5)],
    'Ink Smoke':        (() => { const b = [blade(20, 30, 0.5, { rot: 45 }), blade(48, 58, 0.42, { rot: 45 }), blade(76, 84, 0.5, { rot: 45 })]
      return [...b, ...inkSmoke([[8, 2], [22, 10], [30, 22], [44, 30], [52, 42], [66, 50], [76, 62], [90, 70], [97, 90]], { avoid: b })] })(),
    'Ink Smoke Line':   inkSmoke([[4, 8], [22, 22], [28, 44], [46, 50], [54, 66], [72, 70], [80, 88], [96, 96]], { seed: 21, w: 2.8 }),
    'Ink Smoke Star':   (() => { const b = [S(52, 46, 9, 20, { pinch: 0.08 })]
      return [...b, ...inkSmoke([[10, 96], [22, 76], [40, 64], [50, 46], [58, 30], [76, 18], [92, 4]], { seed: 5, w: 2.6, avoid: b })] })(),
  },
  'OP ART · Archi': {
    'Arc Wave':         [serpentine(8, 10.5, [{ top: 16, bot: 70 }, { top: 40, bot: 92 }, { top: 30, bot: 84 }, { top: 8, bot: 60 }], { n: 7 }), dot(39.5, 24, 6), dot(81.5, 80, 6)],
    'Arc Serpent':      [serpentine(5, 7.5, [{ top: 10, bot: 60 }, { top: 40, bot: 90 }, { top: 10, bot: 60 }, { top: 40, bot: 90 }, { top: 10, bot: 60 }, { top: 40, bot: 90 }], { n: 6, gap: 3 })],
    'Arc Rainbow':      [{ joined: pc.union(...Array.from({ length: 8 }, (_, i) => arcLine(50, 74, 44 - i * 4.6, 180, 360, 1.1, { needle: 0 }))) }, dot(50, 86, 5)],
    'Arc Sunset':       [dot(50, 22, 11), ...Array.from({ length: 6 }, (_, i) => arcLine(50, 12 + i * 7.5, 40, 20, 160, 1.2, { needle: 0.05 }))],
    'Arc Tunnel':       Array.from({ length: 7 }, (_, i) => { const r = 44 - i * 6; return { joined: pc.union(arcLine(50, 50, r, 180, 360, 1.1, { needle: 0 }), line([50 - r, 50], [50 - r, 96], 1.1, 0), line([50 + r, 50], [50 + r, 96], 1.1, 0)) } }),
    'Arc Moons':        [0, 1, 2, 3, 4].map(i => arcLine(50, 4 + i * 12, 30, 20 + i * 5, 160 - i * 5, 1.4 + i * 0.5, { needle: 0.3 })).concat([dot(50, 8, 4)]),
  },
  'HALFTONE': {
    'Halftone Star':       [htFill(star5(50, 54, 44), 10)],
    'Halftone Star Line':  [htLine(star5(50, 54, 42), 4.5, { step: 2.8 })],
    'Halftone Star Glow':  [htGlow(star5(50, 54, 34), 12)],
    'Halftone Star Hollow':[halftone((x, y) => { const d = sdGeom([x, y], star5(50, 54, 44)); return d > 0 ? clamp01(0.7 - d / 8) : clamp01(1.1 - Math.abs(d + 6) / 6) })],
    'Halftone Sparkle':    [htGlow(sparkle(50, 50, 22, 38, { pinch: 0.1 }), 10, { step: 3 })],
    'Halftone Burst':      [htFill(burst(50, 50, 46, { inner: 0.1, alt: 0.6 }), 6, { step: 2.6 })],
    'Halftone Moon':       [htGlow(moon(50, 50, 34, { phase: 0.55 }), 10)],
    'Halftone Sun':        [halftone((x, y) => { const d = Math.hypot(x - 50, y - 50); return d < 20 ? 1 : clamp01(1 - (d - 20) / 28) * (0.55 + 0.45 * Math.cos(Math.atan2(y - 50, x - 50) * 12)) })],
    'Halftone Orbit':      [S(50, 46, 12, 30, { pinch: 0.1 }), halftone((x, y) => { const u = (x - 50) / 46, v = (y - 58) / 13, d = Math.abs(Math.hypot(u, v) - 1) * 13; const front = y > 52 ? 1 : 0.55
      return Math.hypot(x - 50, y - 46) < 16 ? 0 : clamp01((1 - d / 3.5) * front) })],
  },
  'DOTWORK · Ombre': {
    'Thorn Stipple':    (() => { const g = thornBranch([6, 84], [34, 54], [58, 66], [94, 16], { n: 7, len: 15, w: 9 })
      return [stipple(shade(g, { light: -60, edge: 2.6, base: 0.03, side: 0.8 }), { step: 0.62, r: 0.4, seed: 4 })] })(),
    'Thorn Stipple Arc':(() => { const g = thornBranch([10, 78], [24, 22], [76, 22], [90, 78], { n: 7, len: 10, w: 8, seed: 5 })
      return [stipple(shade(g, { light: -90, edge: 2.4, base: 0.03, side: 0.8 }), { step: 0.62, r: 0.4, seed: 8 })] })(),
    'Sparkle Stipple':  (() => { const g = sparkle(50, 50, 32, 46, { pinch: 0.1 })
      return [sparkleLine(50, 50, 32, 46, 0.9, { pinch: 0.1 }), stipple(shade(g, { inset: 2.2, edge: 7, base: 0.05, side: 1 }), { seed: 2 })] })(),
    'Burst Glow':       (() => { const g = burst(50, 50, 46, { alt: 0.55 })
      return [g, stipple((x, y) => { const d = Math.hypot(x - 50, y - 50); return sdGeom([x, y], g) < 1.6 ? 0 : 0.7 * Math.pow(clamp01(1 - d / 26), 1.6) }, { seed: 3 })] })(),
    'Moon Stipple':     (() => { const g = crescentInside(50, 50, 42, { phase: 0.45, dir: -20 })
      return [crescent(50, 50, 42, { phase: 0.45, dir: -20, wo: 1.6, wi: 0.9 }), stipple((x, y) => (sdGeom([x, y], g) > 0 ? 0 : clamp01(0.95 - Math.hypot(x - 50, y - 50) / 70 - 0.5 * clamp01((x - 30) / 50))), { seed: 14 })]
    })(),
    'Sun Stipple':      [stipple((x, y) => { const d = Math.hypot(x - 50, y - 50); return d < 15 ? 0.25 + 0.75 * clamp01((d - 6) / 9) : 0 }, { seed: 16 }), ringO(50, 50, 16.4, 1), ...Array.from({ length: 16 }, (_, i) => ray(50, 50, i * 22.5, 21, i % 2 ? 36 : 47, i % 2 ? 1.4 : 2.2))],
  },
  'INCISIONE · Tratteggio': {
    'Sparkle Hatch':    (() => { const g = sparkle(50, 50, 32, 46, { pinch: 0.1 })
      return [join(sparkleLine(50, 50, 32, 46, 0.9, { pinch: 0.1 }), hatch(sparkle(50, 50, 31.3, 45.3, { pinch: 0.1 }), { shadeAt: sideShade(-135), gap: 2.2 }))] })(),
    'Moon Hatch':       [join(crescent(50, 50, 42, { phase: 0.45, dir: -20, wo: 1.6, wi: 0.9 }), hatch(crescentInside(50, 50, 42, { phase: 0.45, dir: -20, k: 0.6 }), { angle: 30, gap: 2.2, shadeAt: (x, y) => clamp01(1.1 - (x - 8) / 50) }))],
    'Sun Hatch':        [join(ringO(50, 50, 18, 1.1), hatch(circle(50, 50, 17.8, 120), { angle: 0, gap: 2, wmin: 0.5, wmax: 1.6, shadeAt: (x, y) => clamp01((y - 36) / 28) })), ...Array.from({ length: 12 }, (_, i) => ray(50, 50, i * 30, 23, i % 2 ? 38 : 48, 2.2, { wave: i % 2 ? 0 : 1.6, waves: 1 }))],
    'Burst Hatch':      (() => { const g = circle(50, 50, 13, 90)
      return [join(ringO(50, 50, 14.4, 1), hatch(circle(50, 50, 14.2, 90), { angle: -45, gap: 1.7, shadeAt: sideShade(-135) })), ...Array.from({ length: 16 }, (_, i) => ray(50, 50, i * 22.5 - 90, 19, i % 2 ? 34 : 48, i % 2 ? 1.6 : 2.6))] })(),
  },
  'CELESTIAL · Orbit': {
    'Orbit Swoosh':     orbit(50, 44, 46, 16, 20, 300, { echo: [45, 150] }),
    'Orbit Smile':      orbit(50, 36, 46, 18, 0, 180, { wb: 1.4, tilt: 0 }),
    'Orbit Dust':       [...orbit(50, 56, 46, 15, 20, 300, { echo: [45, 150] }), S(55, 22, 6, 10), S(68, 20, 4, 7), dot(43, 23, 1.8)],
    'Orbit Open':       [...orbit(50, 46, 46, 17, 15, 205), ...orbit(50, 46, 46, 17, 225, 330, { wf: 4 }), S(48, 46, 6, 11), S(60, 42, 4, 7)],
    'Comet Trail':      [...orbit(50, 48, 46, 15, 25, 300, { wb: 0.6, tilt: -16, echo: [50, 150] }), S(82, 18, 6, 10), S(14, 82, 4, 7)],
    'Saturn Sparkle':   ringAround([S(50, 46, 15, 44, { pinch: 0.12 })], 50, 54, 46, 14),
    'Saturn Burst':     ringAround([burst(50, 46, 42, { alt: 0.55 })], 50, 56, 46, 14),
    'Saturn Tilt':      ringAround([S(50, 50, 15, 46, { pinch: 0.12 })], 50, 52, 46, 15, { tilt: 14 }),
    'Orbit Twin':       ringAround([S(38, 48, 14, 40, { pinch: 0.12 }), S(64, 32, 9, 22, { pinch: 0.12 })], 50, 58, 45, 14),
    'Orbit X':          ringAround([cross(56, 40, 34), cross(16, 24, 11, { inner: 0.13 })], 50, 62, 46, 15),
    'Halo Sparkle':     ringAround([S(46, 44, 14, 42, { pinch: 0.12 }), S(80, 84, 6, 10)], 47, 54, 44, 13),
    'Halo Wide':        ringAround([S(50, 50, 30, 44, { pinch: 0.08 })], 50, 56, 47, 12, { wf: 5.5 }),
  },
  'CELESTIAL · Luna & Scie': {
    'Moon Burst':       [crescent(40, 58, 34, { dir: -40 }), burst(78, 24, 20, { alt: 0.6 })],
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
  Starburst: 'Starburst', Flare: 'Flare', 'Cross X': 'Cross X', Sun: 'Sun Flame', Burst: 'Burst Glow',
  Orbit: 'Saturn Sparkle', Comet: 'Comet Line', Arcs: 'Arc Wave',
  Moon: 'Crescent Fine', 'Moon Sparkle': 'Crescent Sparkle', Halo: 'Halo Wide', Wave: 'Wave Trail', Meteor: 'Meteor Shower', Thorn: 'Thorn Branch', Blade: 'Sparkle Blade', Crown: 'Thorn Crown',
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
