/**
 * Motivi organici del linguaggio cyber-gotico: membrane cellulari, reti
 * neurali d'inchiostro, falci smerlate. Il peso sta negli incroci (nodi pieni,
 * raccordi), i tratti si assottigliano fino al capello, i bordi finiscono in
 * artigli ricurvi.
 */
import { Delaunay } from 'd3-delaunay'
import { distance, drawMask, liquid, noise2, range, rng, type Ctx, type Mask, type Rnd } from './raster'
import { taper, whip, type Pt } from './strokes'

// ─── sagome ──────────────────────────────────────────────────────────────────

/** dentro/fuori della sagoma, in coordinate normalizzate (centro 0,0, raggio ~1) */
export const SHAPES: { label: string; inside: (x: number, y: number) => boolean }[] = [
  // fuso verticale: largo al centro, punte lunghissime in alto e in basso
  { label: 'Fuso', inside: (x, y) => Math.abs(y) < 1 && Math.abs(x) < 0.42 * Math.pow(1 - y * y, 1.4) },
  { label: 'Cerchio', inside: (x, y) => x * x + y * y < 0.62 },
  // falce: disco meno un disco spostato
  { label: 'Falce', inside: (x, y) => x * x + y * y < 0.8 && (x - 0.42) * (x - 0.42) + (y + 0.05) * (y + 0.05) > 0.5 },
  // ali: due lobi orizzontali con il corpo stretto al centro
  { label: 'Ali', inside: (x, y) => Math.abs(y + 0.15 * x * x) < 0.36 * (0.35 + 0.65 * Math.pow(Math.min(1, Math.abs(x) / 0.95), 0.6)) * Math.max(0, 1 - Math.pow(Math.abs(x), 6)) },
]

// ─── membrana (Voronoi raccordato) ───────────────────────────────────────────

export interface MembraneOpts {
  shape: number; cells: number; web: number; holes: number; claws: number; clawLen: number; mirror: boolean; skin?: boolean
  /** sagoma personalizzata in coordinate normalizzate (sostituisce shape) */
  inside?: (x: number, y: number) => boolean
  /** micro-artigli dentro i fori (0..1) */
  detail?: number
  /** varietà di grandezza dei fori (0 = uniformi, 1 = grandi e minuscoli) */
  varied?: number
}

const fbmLite = (n: (x: number, y: number) => number, x: number, y: number) => (n(x, y) * 0.65 + n(x * 2.1, y * 2.1) * 0.35) * 0.5 + 0.5

const hash = (a: number, b: number) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }

/**
 * Membrana: celle di Voronoi dentro una sagoma. Per ogni pixel si calcola la
 * distanza esatta dal bordo della sua cella; sotto lo spessore è "tessuto",
 * sopra è foro. Una sfocatura con soglia raccorda gli incroci e arrotonda i fori.
 * Dai vertici sul contorno escono artigli ricurvi.
 */
export function membrane(W: number, H: number, cx: number, cy: number, R: number, r: Rnd, o: MembraneOpts): Mask {
  const shape = SHAPES[o.shape % SHAPES.length]
  const insN = o.inside ?? shape.inside
  const ins = (x: number, y: number) => insN((x - cx) / R, (y - cy) / R)
  const sil: Mask = { w: W, h: H, a: new Uint8ClampedArray(W * H) }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ins(x, y)) sil.a[y * W + x] = 255
  const silS = liquid(sil, R * 0.02, 0.5, 0.04)           // sagoma levigata
  const dSil = distance(silS)
  // siti dentro la sagoma, a distanza minima; specchiati se simmetrico
  const area = silS.a.reduce((n, v) => n + (v > 127 ? 1 : 0), 0)
  const minD = Math.sqrt(area / o.cells) * 0.92
  const sites: Pt[] = []
  // spaziatura variabile: zone di celle grandi e zone di celle minuscole (simmetrica se serve)
  const spN = noise2(Math.floor(r() * 1e6)), varied = o.varied ?? 0
  const spacing = (x: number, y: number) => minD * (1 - varied * 0.45 + varied * 0.9 * fbmLite(spN, (o.mirror ? Math.abs(x - cx) : x - cx) / R * 1.4, (y - cy) / R * 1.4))
  for (let i = 0; i < o.cells * 160 && sites.length < o.cells * 2.4; i++) {
    const x = cx + range(r, o.mirror ? 0 : -1.1, 1.1) * R, y = cy + range(r, -1.1, 1.1) * R
    const xi = Math.round(x), yi = Math.round(y)
    const lm = spacing(x, y)
    if (xi < 0 || yi < 0 || xi >= W || yi >= H || dSil[yi * W + xi] < lm * 0.35) continue
    if (sites.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < lm)) continue
    // sull'asse il sito si aggancia al centro: le due metà combaciano senza cuciture
    if (o.mirror && Math.abs(x - cx) < minD * 0.5) { sites.push([cx, y]); continue }
    sites.push([x, y])
    if (o.mirror) sites.push([2 * cx - x, y])
  }
  if (sites.length < 3) return silS
  const del = Delaunay.from(sites)
  // celle "dense": parete spessa e foro piccolo, mai poligoni pieni
  const cellW = sites.map(([x, y]) => { const h = hash(Math.round(Math.abs(x - cx)), Math.round(y)); return h < o.holes ? 1 + h * 0.5 : 2.6 + (1 - h) * 2 })
  const w0 = minD * 0.16 * o.web
  // vertici di ogni cella: lo spessore della parete cresce verso gli incroci
  const vor = del.voronoi([0, 0, W, H])
  const verts: Pt[][] = sites.map((_, i) => (vor.cellPolygon(i) ?? []).map(q => [q[0], q[1]] as Pt))
  const dens = noise2(Math.floor(r() * 1e6))
  const m: Mask = { w: W, h: H, a: new Uint8ClampedArray(W * H) }
  const owner = new Int32Array(W * H).fill(-1)
  let hint = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x
    if (silS.a[k] < 128) continue
    const i = del.find(x, y, hint); hint = i; owner[k] = i
    if (o.skin && dSil[k] < w0 * 1.7) { m.a[k] = 255; continue }
    const [sx, sy] = sites[i]
    let border = Infinity
    for (const j of del.neighbors(i)) {
      const [tx, ty] = sites[j]
      const L = Math.hypot(tx - sx, ty - sy)
      const dd = ((tx - x) * (tx - x) + (ty - y) * (ty - y) - (sx - x) * (sx - x) - (sy - y) * (sy - y)) / (2 * L)
      if (dd < border) border = dd
    }
    let dv = Infinity
    for (const [vx, vy] of verts[i]) { const dd = (vx - x) * (vx - x) + (vy - y) * (vy - y); if (dd < dv) dv = dd }
    dv = Math.sqrt(dv)
    // incroci pieni, fili sottili a metà parete; zone dense e rade dal rumore lento
    const zone = 0.55 + 0.9 * fbmLite(dens, x / R * 1.3, y / R * 1.3)
    const node = 0.3 + 1.7 * Math.exp(-dv / (w0 * 2.8))
    // verso il contorno le pareti si assottigliano fino all'ago
    const edge = o.skin ? 1 : Math.min(1, 0.6 + dSil[k] / (w0 * 8))
    // il filamento non scende mai sotto uno spessore minimo: niente strappi a metà parete
    const half = Math.max(w0 * 0.17, w0 * 0.5 * cellW[i] * zone * node * edge)
    if (border < half) m.a[k] = 255
  }
  const soft = liquid(m, w0 * 0.45, 0.42, 0.02)
  for (let k = 0; k < soft.a.length; k++) if (silS.a[k] < 128) soft.a[k] = 0

  // artigli: ogni parete che attraversa il contorno prosegue oltre, dal suo nodo interno, e si incurva in punta
  const claws: { p: Pt; a: number; L: number; curl: number }[] = []
  const insideAt = (x: number, y: number) => { const xi = Math.round(x), yi = Math.round(y); return xi >= 0 && yi >= 0 && xi < W && yi < H && silS.a[yi * W + xi] > 127 }
  const done = new Set<string>()
  for (let i = 0; i < sites.length; i++) {
    for (const j of del.neighbors(i)) {
      if (j < i) continue
      const pi = verts[i], pj = verts[j]
      const shared = pi.filter(v => pj.some(q => Math.abs(q[0] - v[0]) < 0.5 && Math.abs(q[1] - v[1]) < 0.5))
      if (shared.length < 2) continue
      const [A, B] = shared
      const inA = insideAt(A[0], A[1]), inB = insideAt(B[0], B[1])
      if (inA === inB) continue
      const P = inA ? A : B, Q = inA ? B : A
      const key = `${Math.round(Math.abs(P[0] - cx))},${Math.round(P[1])}`
      const hv = hash(Math.round(Math.abs(P[0] - cx)), Math.round(P[1]))
      if (hv > o.claws) continue
      done.add(key)
      const a = Math.atan2(Q[1] - P[1], Q[0] - P[0])
      const side = P[0] >= cx ? 1 : -1
      const reach = Math.hypot(P[0] - cx, P[1] - cy) / R
      claws.push({ p: P, a, L: R * o.clawLen * (0.14 + 0.24 * hv + 0.2 * reach * reach), curl: side * (hv < 0.5 ? 1 : -1) })
    }
  }

  // micro-artigli: dalle pareti interne verso il centro di un foro, piccoli e ricurvi
  const det = o.detail ?? 0
  const micro: { p: Pt; a: number; L: number; curl: number }[] = []
  if (det > 0) for (let i = 0; i < sites.length; i++) for (const j of del.neighbors(i)) {
    if (j < i) continue
    const shared = verts[i].filter(v => verts[j].some(q => Math.abs(q[0] - v[0]) < 0.5 && Math.abs(q[1] - v[1]) < 0.5))
    if (shared.length < 2) continue
    const [A, B] = shared
    if (!insideAt(A[0], A[1]) || !insideAt(B[0], B[1])) continue
    const M: Pt = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]
    const hv = hash(Math.round(Math.abs(M[0] - cx)), Math.round(M[1]))
    if (hv > det * 0.7) continue
    const into = hv < det * 0.35 ? i : j
    const [tx, ty] = sites[into]
    const d = Math.hypot(tx - M[0], ty - M[1])
    const side = M[0] >= cx ? 1 : -1
    micro.push({ p: M, a: Math.atan2(ty - M[1], tx - M[0]), L: Math.min(d * 0.55, Math.hypot(B[0] - A[0], B[1] - A[1]) * 0.6), curl: side * (hv < det * 0.18 ? 1 : -1) })
  }
  const spikes = drawMask(W, H, ctx => {
    for (const c of micro) {
      const { pts } = whip(c.p[0], c.p[1], c.a, c.L, c.curl * 0.3, c.curl * 2.8, 2.2)
      taper(ctx, pts, t => w0 * 0.42 * Math.pow(1 - t, 1.2))
    }
    for (const c of claws) {
      const { pts } = whip(c.p[0], c.p[1], c.a, c.L, c.curl * 0.15, c.curl * 2.4, 2.4)
      taper(ctx, pts, t => w0 * 0.85 * Math.pow(1 - t, 1.15))
    }
  })
  for (let k = 0; k < soft.a.length; k++) if (spikes.a[k] > soft.a[k]) soft.a[k] = spikes.a[k]
  return soft
}

// ─── composizione ad anello ──────────────────────────────────────────────────

/** archi concentrici spezzati, leggermente eccentrici */
export function brokenRings(ctx: Ctx, r: Rnd, cx: number, cy: number, R: number, S: number, n: number) {
  for (let k = 0; k < n; k++) {
    const rr = R * (1 + k * 0.07 + range(r, -0.02, 0.03)), ox = range(r, -0.05, 0.05) * R, oy = range(r, -0.05, 0.05) * R
    let a = r() * Math.PI * 2
    const end = a + Math.PI * 2 * range(r, 0.55, 1)
    while (a < end) {
      const len = range(r, 0.2, 1.3), gap = range(r, 0.05, 0.4)
      const pts: Pt[] = []
      for (let q = 0; q <= 60; q++) { const t = a + Math.min(len, end - a) * (q / 60); pts.push([cx + ox + Math.cos(t) * rr, cy + oy + Math.sin(t) * rr]) }
      taper(ctx, pts, t => S * 0.0026 * (0.3 + 0.7 * Math.pow(Math.sin(Math.PI * t), 0.25)))
      a += len + gap
    }
  }
}

/** nodo a stella: inchiostro raccolto al centro e aghi di lunghezza diversa */
export function starNode(ctx: Ctx, r: Rnd, x: number, y: number, size: number, W: number) {
  const n = 4 + Math.floor(r() * 4), base = r() * Math.PI * 2
  for (let k = 0; k < n; k++) {
    const a = base + (k / n) * Math.PI * 2 + range(r, -0.35, 0.35)
    const L = size * (k === 0 ? range(r, 1.2, 1.8) : range(r, 0.45, 1.1))
    const bend = range(r, -1, 1)
    const { pts } = whip(x, y, a, L, bend * 0.3, bend * 1.8, 2)
    taper(ctx, pts, t => W * Math.pow(1 - t, 1.7))
  }
  ctx.beginPath(); ctx.ellipse(x, y, W * 0.85, W * 0.7, r() * Math.PI, 0, Math.PI * 2); ctx.fill()
}

/**
 * Anello: il tessuto cresce lungo un arco del cerchio (non al centro), corde
 * dritte e sottili lo attraversano, nodi a stella sugli incroci, archi
 * tratteggiati eccentrici attorno. Lo scheletro è il cerchio.
 */
export function ringPiece(W: number, H: number, cx: number, cy: number, R: number, r: Rnd, S: number, o: { cells: number; web: number; claws: number; clawLen: number; detail: number; chords: number }): Mask {
  const a0 = r() * Math.PI * 2, sweep = range(r, 2.3, 4.2), r1 = 0.48, r2 = 1.02
  const band = (x: number, y: number) => {
    const rr = Math.hypot(x, y)
    let a = Math.atan2(y, x) - a0
    a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    if (a > sweep) return false
    const t = a / sweep, w = (r2 - r1) * Math.pow(Math.sin(Math.PI * t), 0.55)
    return Math.abs(rr - (r1 + r2) / 2) < w / 2
  }
  const arc = membrane(W, H, cx, cy, R, r, { shape: 0, cells: Math.round(o.cells * 1.3), web: o.web * 1.25, holes: 0.9, claws: o.claws, clawLen: o.clawLen * 0.7, mirror: false, inside: band, detail: o.detail, varied: 0.6 })
  // grumo denso dalla parte opposta, sull'anello
  const ga = a0 + sweep + (Math.PI * 2 - sweep) / 2, gx = Math.cos(ga) * 0.83, gy = Math.sin(ga) * 0.83
  const blob = membrane(W, H, cx, cy, R, r, { shape: 0, cells: 10, web: o.web * 1.4, holes: 0.95, claws: o.claws, clawLen: o.clawLen * 0.6, mirror: false, inside: (x, y) => Math.hypot(x - gx, y - gy) < 0.27, detail: 0, varied: 0.8 })
  const lines = drawMask(W, H, ctx => {
    const hair = S * 0.0032
    const pts: Pt[] = []
    for (let k = 0; k < o.chords; k++) {
      const p1 = r() * Math.PI * 2, p2 = p1 + range(r, 1.4, 3.1)
      const rr1 = R * range(r, 0.78, 1.08), rr2 = R * range(r, 0.78, 1.08)
      const A: Pt = [cx + Math.cos(p1) * rr1, cy + Math.sin(p1) * rr1], B: Pt = [cx + Math.cos(p2) * rr2, cy + Math.sin(p2) * rr2]
      const seg: Pt[] = []
      for (let q = 0; q <= 80; q++) seg.push([A[0] + (B[0] - A[0]) * q / 80, A[1] + (B[1] - A[1]) * q / 80])
      taper(ctx, seg, t => hair * (0.4 + 0.6 * Math.pow(Math.sin(Math.PI * t), 0.2)))
      pts.push(A, B)
    }
    // stelle dove le corde toccano l'anello, più qualcuna libera sull'arco
    pts.forEach((p, i) => { if (i % 2 === 0 || r() < 0.6) starNode(ctx, r, p[0], p[1], S * range(r, 0.04, 0.08), S * 0.012) })
    brokenRings(ctx, r, cx, cy, R * 1.08, S, 3)
  })
  for (let k = 0; k < arc.a.length; k++) arc.a[k] = Math.max(arc.a[k], blob.a[k], lines.a[k])
  return arc
}

// ─── fondi di tazza: geometria dalle intersezioni dei cerchi ─────────────────

type Circle = { x: number; y: number; r: number; big: boolean }

/** intersezioni tra due cerchi (0, 1 o 2 punti) */
function intersect(a: Circle, b: Circle): Pt[] {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy)
  if (d > a.r + b.r || d < Math.abs(a.r - b.r) || d === 0) return []
  const l = (a.r * a.r - b.r * b.r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a.r * a.r - l * l))
  const mx = a.x + dx * l / d, my = a.y + dy * l / d
  return [[mx + dy * h / d, my - dx * h / d], [mx - dy * h / d, my + dx * h / d]]
}

/**
 * Cerchi che si sovrappongono come i fondi delle tazze di caffè. L'inchiostro si
 * raccoglie solo negli spazi stretti tra due bordi vicini (come nella schiuma):
 * dove tre cerchi si toccano nasce la macchia a fianchi concavi, le bolle piccole
 * restano fori tondi. I contorni dei cerchi grandi proseguono come linee sottili
 * spezzate; sugli incroci tra contorni nascono nodi con aghi lungo le tangenti.
 */
export function coffeeRings(W: number, H: number, cx: number, cy: number, R: number, r: Rnd, S: number, o: { big: number; bubbles: number; gap: number; stars: number; detail: number }): Mask {
  const circles: Circle[] = []
  for (let k = 0; k < o.big; k++) {
    const a = r() * Math.PI * 2, off = R * range(r, 0.05, 0.35)
    circles.push({ x: cx + Math.cos(a) * off, y: cy + Math.sin(a) * off, r: R * range(r, 0.6, 0.95), big: true })
  }
  // la massa: una membrana (pareti sottili, nodi pieni a stella) che cresce lungo un arco
  // di un cerchio grande e si assottiglia a lente alle estremità
  const arcMass = (host: Circle, mid: number, span: number, thick: number, cells: number, seed: number) => {
    const hx = (host.x - cx) / R, hy = (host.y - cy) / R, hr = host.r / R
    return membrane(W, H, cx, cy, R, rng(seed), {
      shape: 0, cells, web: 1.15 * o.gap, holes: 0.97, claws: o.stars, clawLen: 0.5, mirror: false, detail: o.detail * 0.6, varied: 0.9,
      inside: (x, y) => {
        let a = Math.atan2(y - hy, x - hx) - mid
        a = Math.atan2(Math.sin(a), Math.cos(a))
        if (Math.abs(a) > span / 2) return false
        const w = thick * Math.pow(Math.cos((a / span) * Math.PI), 0.7)
        return Math.abs(Math.hypot(x - hx, y - hy) - hr) < w / 2
      },
    })
  }
  const host = circles[Math.floor(r() * circles.length)]
  const ink = arcMass(host, r() * Math.PI * 2, range(r, 1.3, 2), range(r, 0.5, 0.66), Math.round(o.bubbles * 2.2), Math.floor(r() * 1e6))
  if (false && circles.length > 1) {   // secondo grumo disattivato: produceva frammenti casuali
    const other = circles.find(c => c !== host)!
    const small = arcMass(other, r() * Math.PI * 2, range(r, 0.6, 0.9), range(r, 0.3, 0.38), Math.max(6, Math.round(o.bubbles * 0.4)), Math.floor(r() * 1e6))
    for (let k = 0; k < ink.a.length; k++) if (small.a[k] > ink.a[k]) ink.a[k] = small.a[k]
  }
  const lines = drawMask(W, H, ctx => {
    const hair = Math.max(1, S * 0.0022)
    ctx.lineWidth = hair; ctx.lineCap = 'butt'
    // contorni netti: pieni, doppi o con poche pause volute
    for (const c of circles) {
      if (!c.big) continue
      const style = r()
      const gaps = style < 0.35 ? 0 : 1 + Math.floor(r() * 3)
      const a0 = r() * Math.PI * 2
      const cuts = Array.from({ length: gaps }, () => range(r, 0.15, 0.5))
      let a = a0
      const seg = (Math.PI * 2 - cuts.reduce((p, q) => p + q, 0)) / Math.max(1, gaps)
      if (gaps === 0) { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke() }
      else for (let g = 0; g < gaps; g++) { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, a, a + seg); ctx.stroke(); a += seg + cuts[g] }
      if (style > 0.7) { ctx.beginPath(); ctx.arc(c.x + R * 0.01, c.y, c.r + R * 0.035, a0, a0 + Math.PI * range(r, 0.6, 1.4)); ctx.stroke() }
    }
    // nodi sugli incroci tra contorni grandi, aghi dritti lungo le tangenti
    const nodes: Pt[] = []
    const big = circles.filter(c => c.big)
    for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) for (const p of intersect(big[i], big[j])) {
      if (r() > o.stars || nodes.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < R * 0.12)) continue
      nodes.push(p)
      const ta = Math.atan2(p[1] - big[i].y, p[0] - big[i].x) + Math.PI / 2, tb = Math.atan2(p[1] - big[j].y, p[0] - big[j].x) + Math.PI / 2
      const L = S * range(r, 0.035, 0.07), W0 = S * 0.012
      // sei punte: lungo le due tangenti e sulle bisettrici (quelle si staccano dalle linee)
      const bis = (ta + tb) / 2
      for (const [a, k] of [[ta, 0.6], [ta + Math.PI, 0.6], [tb, 0.6], [tb + Math.PI, 0.6], [bis + Math.PI / 2, 1.3], [bis - Math.PI / 2, 1.1]] as [number, number][]) {
        const { pts } = whip(p[0], p[1], a, L * k * range(r, 0.7, 1.2), 0, 0, 1)
        taper(ctx, pts, t => W0 * Math.pow(1 - t, 1.8))
      }
      ctx.beginPath(); ctx.arc(p[0], p[1], W0 * 0.75, 0, Math.PI * 2); ctx.fill()
    }
    // corde dritte tra alcuni nodi: triangoli dentro il cerchio
    if (nodes.length >= 2 && o.detail > 0) {
      ctx.lineWidth = hair
      const k = Math.min(nodes.length - 1, 1 + Math.round(o.detail * 3))
      for (let i = 0; i < k; i++) { const A = nodes[i], B = nodes[(i + 1 + Math.floor(r() * (nodes.length - 1))) % nodes.length]; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke() }
    }
  })
  for (let k = 0; k < ink.a.length; k++) ink.a[k] = Math.max(ink.a[k], lines.a[k])
  return ink
}

/** elimina le macchioline isolate più piccole di minArea (pixel) */
function dropSpecks(m: Mask, minArea: number): Mask {
  const { w, h, a } = m
  const lab = new Int32Array(w * h).fill(-1)
  const stack: number[] = []
  for (let i = 0; i < a.length; i++) {
    if (a[i] < 128 || lab[i] >= 0) continue
    const comp: number[] = []
    stack.push(i); lab[i] = i
    while (stack.length) {
      const k = stack.pop()!; comp.push(k)
      const x = k % w, y = (k / w) | 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const n = ny * w + nx
        if (a[n] >= 128 && lab[n] < 0) { lab[n] = i; stack.push(n) }
      }
    }
    if (comp.length < minArea) for (const k of comp) {
      a[k] = 0
      const x = k % w, y = (k / w) | 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h) { const n = ny * w + nx; if (a[n] < 128) a[n] = 0 } }
    }
  }
  return m
}

// ─── rete neurale d'inchiostro ───────────────────────────────────────────────

export interface NetOpts { nodes: number; links: number; tendrils: number; weight: number; reach: number }

/** collegamento: pieno ai due nodi, sottile come un capello a metà, leggermente arcuato */
function link(ctx: Ctx, a: Pt, b: Pt, bow: number, W: number) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy)
  const c: Pt = [mx - dy / L * L * bow, my + dx / L * L * bow]
  const pts: Pt[] = []
  const n = Math.max(12, Math.ceil(L / 1.5))
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t
    pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]])
  }
  taper(ctx, pts, t => W * Math.pow(Math.abs(2 * t - 1), 3.2) + W * 0.035)
}

/**
 * Rete neurale: nodi a stella (inchiostro raccolto all'incrocio) uniti da curve
 * lunghe che si assottigliano a metà, più tentacoli liberi che finiscono ad ago.
 */
export function neuralNet(ctx: Ctx, r: Rnd, x0: number, y0: number, w: number, h: number, S: number, o: NetOpts) {
  const nodes: Pt[] = []
  const minD = Math.sqrt((w * h) / o.nodes) * 0.75
  for (let i = 0; i < o.nodes * 80 && nodes.length < o.nodes; i++) {
    const p: Pt = [x0 + r() * w, y0 + r() * h]
    if (nodes.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < minD)) continue
    nodes.push(p)
  }
  if (nodes.length < 3) return
  const W = S * 0.022 * o.weight
  const del = Delaunay.from(nodes)
  const deg = new Array(nodes.length).fill(0)
  const dirs: number[][] = nodes.map(() => [])
  // collegamenti: i lati di Delaunay più corti, finché ogni nodo ne ha abbastanza
  const edges: [number, number, number][] = []
  for (let e = 0; e < del.halfedges.length; e++) {
    const j = del.halfedges[e]
    if (j < e) continue
    const a = del.triangles[e], b = del.triangles[e % 3 === 2 ? e - 2 : e + 1]
    edges.push([a, b, Math.hypot(nodes[a][0] - nodes[b][0], nodes[a][1] - nodes[b][1])])
  }
  edges.sort((p, q) => p[2] - q[2])
  for (const [a, b, L] of edges) {
    if (deg[a] >= o.links || deg[b] >= o.links || L > minD * 2.6) continue
    deg[a]++; deg[b]++
    const bow = range(r, -0.16, 0.16)
    link(ctx, nodes[a], nodes[b], bow, W)
    dirs[a].push(Math.atan2(nodes[b][1] - nodes[a][1], nodes[b][0] - nodes[a][0]))
    dirs[b].push(Math.atan2(nodes[a][1] - nodes[b][1], nodes[a][0] - nodes[b][0]))
  }
  nodes.forEach((p, i) => {
    // tentacoli liberi negli spazi lasciati dai collegamenti
    const k = o.tendrils + Math.floor(r() * 2)
    for (let t = 0; t < k; t++) {
      let a = r() * Math.PI * 2
      for (let tries = 0; tries < 12 && dirs[i].some(d => Math.abs(Math.atan2(Math.sin(a - d), Math.cos(a - d))) < 0.55); tries++) a = r() * Math.PI * 2
      dirs[i].push(a)
      const L = S * o.reach * (r() < 0.3 ? range(r, 0.18, 0.4) : range(r, 0.05, 0.12))
      const bend = range(r, -1, 1)
      const { pts } = whip(p[0], p[1], a, L, bend * 0.6, bend * 2.4, 1.8)
      taper(ctx, pts, tt => W * Math.pow(1 - tt, 2.2) + W * 0.03 * (1 - tt))
    }
    // nodo: inchiostro raccolto all'incrocio
    ctx.beginPath(); ctx.ellipse(p[0], p[1], W * 0.75, W * 0.6, r() * Math.PI, 0, Math.PI * 2); ctx.fill()
  })
}

// ─── falce smerlata ──────────────────────────────────────────────────────────

export interface CrescentOpts { scallops: number; depth: number; thickness: number; sweep: number; claws: number }

/**
 * Falce ad ala: arco esterno pieno, bordo interno fatto di smerli concavi che si
 * incontrano in punte rivolte verso il centro; le estremità finiscono ad ago.
 */
export function crescent(ctx: Ctx, r: Rnd, cx: number, cy: number, R: number, rot: number, o: CrescentOpts) {
  const a0 = rot - o.sweep / 2, a1 = rot + o.sweep / 2
  const thick = (t: number) => R * o.thickness * Math.pow(Math.sin(Math.PI * t), 0.75)   // zero alle punte
  const P = (a: number, rr: number): Pt => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]
  ctx.beginPath()
  const n = 240
  for (let i = 0; i <= n; i++) { const t = i / n, p = P(a0 + (a1 - a0) * t, R); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]) }
  // bordo interno: smerli concavi tra punte
  const k = o.scallops
  for (let s = k - 1; s >= 0; s--) {
    const tA = (s + 1) / k, tB = s / k
    const aA = a0 + (a1 - a0) * tA, aB = a0 + (a1 - a0) * tB
    const rA = R - thick(tA), rB = R - thick(tB)
    const tm = (tA + tB) / 2, am = a0 + (a1 - a0) * tm
    // il centro dello smerlo rientra verso l'arco esterno (concavo visto dall'interno)
    const rm = R - thick(tm) * (1 - o.depth)
    const steps = 30
    for (let q = 1; q <= steps; q++) {
      const u = q / steps
      // arco quadratico tra le due punte passando per il fondo dello smerlo
      const a = aA + (aB - aA) * u
      const base = rA + (rB - rA) * u
      const dip = (rm - (rA + rB) / 2) * Math.pow(Math.sin(Math.PI * u), 0.55)   // fianchi ripidi: cuspidi affilate
      const p = P(a, base + dip)
      ctx.lineTo(p[0], p[1])
    }
    void am
  }
  ctx.closePath(); ctx.fill()
  // artigli: dalle punte interne, verso il centro, ricurvi nel verso della falce
  for (let s = 1; s < k; s++) {
    if (r() > o.claws) continue
    const t = s / k, a = a0 + (a1 - a0) * t, base = R - thick(t)
    const p = P(a, base)
    const L = thick(t) * range(r, 0.9, 1.8)
    const { pts } = whip(p[0], p[1], a + Math.PI + 0.3, L, 0.4, 2.6, 2)
    taper(ctx, pts, tt => R * 0.032 * Math.pow(1 - tt, 1.15))
  }
}
