/**
 * Motivi organici del linguaggio cyber-gotico: membrane cellulari, reti
 * neurali d'inchiostro, falci smerlate. Il peso sta negli incroci (nodi pieni,
 * raccordi), i tratti si assottigliano fino al capello, i bordi finiscono in
 * artigli ricurvi.
 */
import { Delaunay } from 'd3-delaunay'
import { distance, drawMask, liquid, noise2, range, type Ctx, type Mask, type Rnd } from './raster'
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
  const ins = (x: number, y: number) => shape.inside((x - cx) / R, (y - cy) / R)
  const sil: Mask = { w: W, h: H, a: new Uint8ClampedArray(W * H) }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ins(x, y)) sil.a[y * W + x] = 255
  const silS = liquid(sil, R * 0.02, 0.5, 0.04)           // sagoma levigata
  const dSil = distance(silS)
  // siti dentro la sagoma, a distanza minima; specchiati se simmetrico
  const area = silS.a.reduce((n, v) => n + (v > 127 ? 1 : 0), 0)
  const minD = Math.sqrt(area / o.cells) * 0.92
  const sites: Pt[] = []
  for (let i = 0; i < o.cells * 120 && sites.length < o.cells * 1.4; i++) {
    const x = cx + range(r, o.mirror ? 0 : -1.1, 1.1) * R, y = cy + range(r, -1.1, 1.1) * R
    const xi = Math.round(x), yi = Math.round(y)
    if (xi < 0 || yi < 0 || xi >= W || yi >= H || dSil[yi * W + xi] < minD * 0.35) continue
    if (sites.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < minD)) continue
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
    const node = 0.22 + 1.35 * Math.exp(-dv / (w0 * 2.2))
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

  const spikes = drawMask(W, H, ctx => {
    for (const c of claws) {
      const { pts } = whip(c.p[0], c.p[1], c.a, c.L, c.curl * 0.15, c.curl * 2.4, 2.4)
      taper(ctx, pts, t => w0 * 0.85 * Math.pow(1 - t, 1.15))
    }
  })
  for (let k = 0; k < soft.a.length; k++) if (spikes.a[k] > soft.a[k]) soft.a[k] = spikes.a[k]
  return soft
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
