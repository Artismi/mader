/**
 * Segni disegnati: tratti che si assottigliano fino all'ago, spine, ghirigori a
 * pennino largo, crescite vascolari. È il vocabolario del cybersigilism / neo-tribal
 * e della calligrafia gotica, generato invece che disegnato a mano.
 *
 * Tutte le misure sono in frazioni di S (lato corto della tavola): la stessa
 * ricetta regge qualsiasi risoluzione.
 */
import { fbm, noise2, noise3, range, type Ctx, type Rnd } from './raster'

export type Pt = [number, number]

/** cammina da un punto con curvatura variabile: base di ogni tratto */
export function walk(x: number, y: number, angle: number, length: number, curv: (t: number) => number, step = 2) {
  const n = Math.max(4, Math.ceil(length / step))
  const pts: Pt[] = [[x, y]]
  const angles = [angle]
  for (let i = 1; i <= n; i++) {
    const t = i / n
    angle += curv(t) * (length / n)
    x += Math.cos(angle) * (length / n); y += Math.sin(angle) * (length / n)
    pts.push([x, y]); angles.push(angle)
  }
  return { pts, angles }
}

/**
 * Tratto a spessore variabile: il bordo sinistro e destro seguono la normale.
 * `width(t, angolo)` permette sia il profilo ad ago sia il pennino calligrafico.
 */
export function taper(ctx: Ctx, pts: Pt[], width: (t: number, ang: number) => number) {
  const n = pts.length
  if (n < 2) return
  const L: Pt[] = [], R: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]
    let tx = b[0] - a[0], ty = b[1] - a[1]
    const len = Math.hypot(tx, ty) || 1
    tx /= len; ty /= len
    const w = width(i / (n - 1), Math.atan2(ty, tx)) / 2
    L.push([pts[i][0] - ty * w, pts[i][1] + tx * w])
    R.push([pts[i][0] + ty * w, pts[i][1] - tx * w])
  }
  ctx.beginPath()
  ctx.moveTo(L[0][0], L[0][1])
  for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1])
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1])
  ctx.closePath()
  ctx.fill()
}

/** profili di spessore */
export const needle = (base: number, attack = 0.08, power = 1.1) => (t: number) =>
  base * Math.min(1, t / attack) * Math.pow(1 - t, power)
export const spindle = (base: number, power = 0.7) => (t: number) => base * Math.pow(Math.sin(Math.PI * t), power)

/** spina: triangolo curvo che parte dal tratto e finisce in punta; bend = curvatura totale in radianti */
function thorn(ctx: Ctx, x: number, y: number, ang: number, len: number, w: number, bend: number) {
  const { pts } = walk(x, y, ang, len, t => (bend / len) * 2 * t, Math.max(0.75, len / 40))
  taper(ctx, pts, t => w * Math.pow(1 - t, 1.15))
}

/** esegue il disegno anche specchiato attorno all'asse verticale cx */
export function mirrored(ctx: Ctx, cx: number, draw: () => void, on = true) {
  draw()
  if (!on) return
  ctx.save(); ctx.translate(cx * 2, 0); ctx.scale(-1, 1); draw(); ctx.restore()
}

// ─── cybersigilism ───────────────────────────────────────────────────────────

export interface SigilOpts { strokes: number; spikes: number; hook: number; weight: number; spine: boolean; arcs: boolean; silhouette?: number }

export const PHI = 1.618

/** sagome: larghezza relativa della figura in funzione dell'altezza (0 = cima, 1 = fondo) */
export const SILHOUETTES: { label: string; e: (u: number) => number }[] = [
  { label: 'Diamante', e: u => Math.pow(Math.sin(Math.PI * u), 0.9) },
  { label: 'Calice', e: u => 1 - 0.72 * Math.pow(u, 0.8) },
  { label: 'Corona', e: u => (u < 0.34 ? 1 : 0.42 + 0.3 * (1 - u)) },
  { label: 'Ali', e: u => 0.35 + 0.65 * Math.exp(-Math.pow((u - 0.42) / 0.16, 2)) },
  { label: 'Fuso', e: u => 0.5 * Math.pow(Math.sin(Math.PI * u), 0.6) },
  { label: 'Radice', e: u => 0.32 + 0.68 * Math.pow(u, 1.1) },
]

/** grammatiche: che tipo di braccio va in cima, al centro e in fondo */
const GRAMMARS: ('flame' | 'blade' | 'recurve' | 'drip')[][] = [
  ['flame', 'blade', 'blade', 'drip'],
  ['blade', 'recurve', 'blade', 'drip'],
  ['flame', 'recurve', 'recurve', 'blade'],
  ['blade', 'blade', 'blade', 'blade'],
]

/** Bézier cubica campionata con passo regolare (circa 1.5 px) */
export function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, step = 1.5): Pt[] {
  const est = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1])
  const n = Math.max(8, Math.ceil(est / step))
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ])
  }
  return out
}

const dirv = (a: number): Pt => [Math.cos(a), Math.sin(a)]
const add = (p: Pt, d: Pt, k: number): Pt => [p[0] + d[0] * k, p[1] + d[1] * k]
const angleAt = (pts: Pt[], i: number) => {
  const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)]
  return Math.atan2(b[1] - a[1], b[0] - a[0])
}

/**
 * Spina "a rosa": la base si fonde con il bordo del tratto, i fianchi sono
 * concavi e la punta è spazzata nella direzione del moto. Disegnata come parte
 * del tratto, non appoggiata sopra: niente grumi alle giunzioni.
 */
export function roseThorn(ctx: Ctx, pts: Pt[], i: number, side: number, halfAt: (j: number) => number, h: number, base: number, sweep = 0.55) {
  const n = pts.length
  const ia = Math.max(1, i - Math.round(base)), ib = Math.min(n - 2, i + Math.round(base * 0.45))
  const edge = (j: number): Pt => { const a = angleAt(pts, j); return add(pts[j], [-Math.sin(a) * side, Math.cos(a) * side], halfAt(j) * 0.92) }
  const ta: Pt = dirv(angleAt(pts, ia)), tb: Pt = dirv(angleAt(pts, ib)), ti: Pt = dirv(angleAt(pts, i))
  const nrm: Pt = [-ti[1] * side, ti[0] * side]
  const Ba = edge(ia), Bb = edge(ib), Ei = edge(i)
  // asse della spina: fuori dal bordo e spazzato in avanti
  const ax: Pt = [nrm[0] + ti[0] * sweep, nrm[1] + ti[1] * sweep]
  const al = Math.hypot(ax[0], ax[1]); ax[0] /= al; ax[1] /= al
  const T = add(Ei, ax, h * Math.sqrt(1 + sweep * sweep))
  const dA = Math.hypot(T[0] - Ba[0], T[1] - Ba[1]), dB = Math.hypot(T[0] - Bb[0], T[1] - Bb[1])
  ctx.beginPath()
  ctx.moveTo(Ba[0], Ba[1])
  // fianco posteriore: esce tangente al bordo e si inarca fino alla punta
  const a1 = add(Ba, ta, dA * 0.45), a2 = add(T, ax, -dA * 0.42)
  ctx.bezierCurveTo(a1[0], a1[1], a2[0], a2[1], T[0], T[1])
  // fianco anteriore: corto e concavo, rientra tangente al bordo
  const b1 = add(T, ax, -dB * 0.5), b2 = add(Bb, tb, -dB * 0.35)
  ctx.bezierCurveTo(b1[0], b1[1], b2[0], b2[1], Bb[0], Bb[1])
  ctx.lineTo(pts[ib][0], pts[ib][1]); ctx.lineTo(pts[ia][0], pts[ia][1])
  ctx.closePath()
  ctx.fill()
}

/** lunghezza in punti di un tratto pari a una distanza in px (campioni ~1.5 px) */
const ptsFor = (px: number) => Math.max(2, px / 1.5)

/**
 * Sigillo neo-tribale progettato con regole, non a caso:
 * - la sagoma decide la lunghezza di ogni braccio;
 * - gerarchia a sezione aurea: primario, secondari (1/φ), terziari (1/φ²) per
 *   spessore, spine e rami;
 * - ritmo: bracci a intervalli regolari, uncini tutti nello stesso verso,
 *   spine nei punti aurei del tratto;
 * - il seme sceglie solo tra decisioni discrete (sagoma, grammatica, curvatura).
 */
export function sigil(ctx: Ctx, r: Rnd, cx: number, cy: number, S: number, o: SigilOpts) {
  const wt = o.weight
  const arms = Math.max(3, Math.min(5, Math.round(o.strokes / 2.2)))
  const sil = SILHOUETTES[o.silhouette != null && o.silhouette >= 0 ? o.silhouette % SILHOUETTES.length : Math.floor(r() * SILHOUETTES.length)]
  const grammar = GRAMMARS[Math.floor(r() * GRAMMARS.length)]
  const curl = [0.7, 0.95, 1.2][Math.floor(r() * 3)]           // curvatura unica per tutta la figura
  const spread = [0.85, 1, 1.15][Math.floor(r() * 3)]          // apertura unica
  const spineW = S * 0.015 * wt
  const Lmax = S * 0.44
  const blade = (W: number) => (t: number) => W * (0.22 * Math.pow(1 - t, 3) + Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 1.1))
  type Shape = { pts: Pt[]; prof: (t: number) => number; thorns: { i: number; side: number; h: number; base: number }[] }
  const shapes: Shape[] = []

  // posizioni regolari e lunghezze dalla sagoma
  const specs = Array.from({ length: arms }, (_, k) => { const u = (k + 0.5) / arms; return { k, u, len: Math.max(0.28, sil.e(u)) } })
  const order = [...specs].sort((a, b) => b.len - a.len)
  const rank = new Map(order.map((sp, i) => [sp.k, i === 0 ? 0 : i <= 2 ? 1 : 2]))
  const Wp = S * 0.036 * wt

  for (const sp of specs) {
    const { k, u } = sp
    const rk = rank.get(k)!
    const scale = Math.pow(PHI, -rk)
    const vert = (u - 0.5) * 2
    const y0 = cy + vert * S * 0.31
    const P0: Pt = [cx + spineW * 0.3, y0]
    const kind = grammar[Math.min(grammar.length - 1, Math.floor(u * grammar.length))]
    const L = Lmax * sp.len * (kind === 'drip' ? 0.9 : 1)
    const W = Wp * (0.55 + 0.45 * scale)
    let body: Pt[], turn: number
    if (kind === 'flame') {
      const a0 = -Math.PI / 2 + 0.55 * spread; turn = -0.7 * curl
      const P3 = add(P0, dirv(a0 + turn * 0.45), L * 0.75)
      body = bezier(P0, add(P0, dirv(a0), L * 0.38), add(P3, dirv(a0 + turn), -L * 0.28), P3)
    } else if (kind === 'drip') {
      const a0 = Math.PI / 2 - 0.5 * spread; turn = 0.4 * curl
      const P3 = add(P0, dirv(a0 + turn * 0.5), L)
      body = bezier(P0, add(P0, dirv(a0), L * 0.4), add(P3, dirv(a0 + turn), -L * 0.45), P3)
    } else if (kind === 'recurve') {
      const up = vert <= 0 ? -1 : 1
      const a0 = up * 0.55 * spread; turn = -up * 2.3 * Math.min(1.1, curl)
      const P3 = add(P0, dirv(a0 + turn * 0.5), L * 0.62)
      body = bezier(P0, add(P0, dirv(a0), L * 0.62), add(P3, dirv(a0 + turn), -L * 0.45), P3)
    } else {
      const a0 = vert * 1.05 * spread
      turn = (Math.abs(vert) < 0.15 ? -1 : -Math.sign(vert)) * 0.9 * curl
      const P3 = add(P0, dirv(a0 + turn * 0.35), L)
      body = bezier(P0, add(P0, dirv(a0), L * 0.45), add(P3, dirv(a0 + turn), -L * 0.4), P3)
    }
    let pts = body
    if (kind !== 'drip') {
      const hookLen = L * (0.08 + 0.22 * o.hook) * scale, hookTurn = Math.sign(turn) * Math.PI * (0.6 + 0.8 * o.hook)
      const end = body[body.length - 1]
      const { pts: hook } = walk(end[0], end[1], angleAt(body, body.length - 1), hookLen, t => (hookTurn / hookLen) * 2 * t, 1.5)
      pts = body.concat(hook.slice(1))
    }
    const prof = blade(W)
    // spine: solo dove c'è peso, nei punti aurei del tratto, decrescenti
    const thorns: Shape['thorns'] = []
    const nT = rk === 0 ? o.spikes : rk === 1 ? Math.max(0, o.spikes - 1) : 0
    const golden = [0.236, 0.382, 0.5, 0.618]
    for (let q = 0; q < Math.min(nT, golden.length); q++) {
      const t = golden[q] * 0.85
      thorns.push({ i: Math.floor(t * (pts.length - 1)), side: -Math.sign(turn) || 1, h: S * 0.05 * wt * scale * Math.pow(PHI, -q * 0.6), base: ptsFor(S * 0.05 * wt * scale) })
    }
    shapes.push({ pts, prof, thorns })
    // ramo: solo sul primario, staccato tangente nel punto aureo
    if (rk === 0 && kind !== 'drip') {
      const tb = 0.382, ib = Math.floor(tb * (body.length - 1))
      const Pb = body[ib], ab = angleAt(body, ib)
      const lb = L / PHI / PHI * 1.3, ae = ab - Math.sign(turn) * 1.2 * curl
      const Pe = add(Pb, dirv(ab - Math.sign(turn) * 0.45 * curl), lb)
      const bpts = bezier(Pb, add(Pb, dirv(ab), lb * 0.45), add(Pe, dirv(ae), -lb * 0.35), Pe)
      const w0 = prof(tb) / PHI
      shapes.push({ pts: bpts, prof: t => w0 * Math.pow(1 - t, 0.85), thorns: [] })
    }
  }

  mirrored(ctx, cx, () => {
    for (const s of shapes) {
      taper(ctx, s.pts, s.prof)
      for (const th of s.thorns) roseThorn(ctx, s.pts, th.i, th.side, j => s.prof(j / (s.pts.length - 1)) / 2, th.h, th.base, 0.9)
    }
  })

  if (o.spine) {
    const top = cy - S * 0.47, bot = cy + S * 0.47
    const pts: Pt[] = []
    for (let i = 0; i <= 400; i++) pts.push([cx, top + (bot - top) * (i / 400)])
    taper(ctx, pts, t => spineW * Math.pow(Math.sin(Math.PI * t), 0.55))
    // nodi sugli attacchi dei bracci: il ritmo si legge sull'asse
    for (const sp of specs) {
      const yy = cy + ((sp.u - 0.5) * 2) * S * 0.31, d = spineW * (rank.get(sp.k) === 0 ? 1.5 : 1.1)
      ctx.beginPath(); ctx.moveTo(cx, yy - d * 2.6); ctx.quadraticCurveTo(cx + d * 0.35, yy - d * 0.35, cx + d, yy); ctx.quadraticCurveTo(cx + d * 0.35, yy + d * 0.35, cx, yy + d * 2.6)
      ctx.quadraticCurveTo(cx - d * 0.35, yy + d * 0.35, cx - d, yy); ctx.quadraticCurveTo(cx - d * 0.35, yy - d * 0.35, cx, yy - d * 2.6); ctx.fill()
    }
  }
  if (o.arcs) {
    const R = S * 0.3, a0 = -Math.PI / 2 + 0.35, a1 = Math.PI / 2 - 0.35
    const pts: Pt[] = []
    for (let i = 0; i <= 300; i++) { const a = a0 + (a1 - a0) * (i / 300); pts.push([cx + Math.cos(a) * R * 1.05, cy + Math.sin(a) * R]) }
    mirrored(ctx, cx, () => taper(ctx, pts, spindle(S * 0.011 * wt, 0.7)))
  }
}

/** corona: anello sottile con spine a rosa regolari, spazzate nello stesso verso */
export function thornRing(ctx: Ctx, r: Rnd, cx: number, cy: number, R: number, S: number, count: number, weight: number) {
  const pts: Pt[] = []
  const n = 1200
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]) }
  const W = S * 0.009 * weight
  taper(ctx, pts, () => W)
  const inner: Pt[] = pts.map(([x, y]) => [cx + (x - cx) * 0.93, cy + (y - cy) * 0.93])
  taper(ctx, inner, () => W * 0.28)
  for (let k = 0; k < count; k++) {
    const i = Math.round(((k + 0.5) / count) * n)
    const big = k % 2 === 0
    roseThorn(ctx, pts, i, -1, () => W / 2, S * (big ? 0.05 : 0.03) * weight * range(r, 0.9, 1.1), ptsFor(W * (big ? 4.5 : 3.2)), 0.9)
  }
}

/** fascia neo-tribale orizzontale (bracciale): asse a fuso con lame a uncino e spine a rosa */
export function band(ctx: Ctx, r: Rnd, cx: number, cy: number, Wd: number, S: number, weight: number) {
  const half = Wd / 2
  const axis: Pt[] = []
  for (let i = 0; i <= 600; i++) axis.push([cx - half + Wd * (i / 600), cy])
  taper(ctx, axis, t => S * 0.014 * weight * Math.pow(Math.sin(Math.PI * t), 0.5))
  const blade = (W: number) => (t: number) => W * (0.22 * Math.pow(1 - t, 3) + Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 1.1))
  type Arm = { pts: Pt[]; prof: (t: number) => number; thorn: number; side: number }
  const arms: Arm[] = []
  const count = 3 + Math.floor(r() * 3)
  for (let k = 0; k < count; k++) {
    const x0 = cx + half * (0.04 + 0.9 * (k + 0.5) / count) * 0.98
    const up = k % 2 === 0 ? -1 : 1
    const P0: Pt = [x0, cy]
    const L = S * range(r, 0.12, 0.2) * weight * (k === 0 ? 1.25 : 1) * (1 - k / (count * 2.2))
    const a0 = up * Math.PI / 2 + range(r, 0.35, 0.75)          // si piega verso l'esterno
    const turn = -up * range(r, 0.8, 1.3), a1 = a0 + turn
    const P3 = add(P0, dirv(a0 + turn * 0.4), L)
    const body = bezier(P0, add(P0, dirv(a0), L * 0.5), add(P3, dirv(a1), -L * 0.4), P3)
    const hl = L * 0.3
    const { pts: hook } = walk(P3[0], P3[1], angleAt(body, body.length - 1), hl, t => (Math.sign(turn) * Math.PI * 1.1 / hl) * 2 * t, 1.5)
    const pts = body.concat(hook.slice(1))
    arms.push({ pts, prof: blade(S * range(r, 0.016, 0.024) * weight), thorn: Math.floor(range(r, 0.25, 0.45) * pts.length), side: -Math.sign(turn) })
  }
  mirrored(ctx, cx, () => {
    for (const a of arms) {
      taper(ctx, a.pts, a.prof)
      roseThorn(ctx, a.pts, a.thorn, a.side, j => a.prof(j / (a.pts.length - 1)) / 2, S * 0.03 * weight, ptsFor(S * 0.04 * weight), 0.9)
    }
  })
  // nodo centrale a rombo affilato
  const d = S * 0.022 * weight
  ctx.beginPath(); ctx.moveTo(cx, cy - d * 2.4); ctx.quadraticCurveTo(cx + d * 0.3, cy - d * 0.3, cx + d, cy); ctx.quadraticCurveTo(cx + d * 0.3, cy + d * 0.3, cx, cy + d * 2.4)
  ctx.quadraticCurveTo(cx - d * 0.3, cy + d * 0.3, cx - d, cy); ctx.quadraticCurveTo(cx - d * 0.3, cy - d * 0.3, cx, cy - d * 2.4); ctx.fill()
}

// ─── calligrafia gotica ──────────────────────────────────────────────────────

/**
 * Ghirigoro a pennino largo: la spessore dipende dalla direzione del tratto
 * rispetto all'angolo del pennino (pieni e filetti), la curva si avvolge in spirale.
 */
export function swash(ctx: Ctx, x: number, y: number, angle: number, len: number, curl: number, nib: number, nibAngle = -0.75, dir = 1) {
  const { pts } = walk(x, y, angle, len, t => dir * (curl * Math.pow(t, 2.2) * 3 + 0.4 * curl * Math.sin(t * 6)) / len * 6, Math.max(1, len / 500))
  taper(ctx, pts, (t, a) => {
    const fade = Math.min(1, t / 0.04) * Math.pow(1 - t, 0.35)
    return (nib * Math.abs(Math.sin(a - nibAngle)) + nib * 0.06) * fade
  })
  return pts[pts.length - 1]
}

/** rombo calligrafico (il "punto" del gotico) */
export function lozenge(ctx: Ctx, x: number, y: number, s: number) {
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.62, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.62, y); ctx.closePath(); ctx.fill()
}

// ─── crescita aliena ─────────────────────────────────────────────────────────

/**
 * Rete vascolare: rami guidati dal rumore che si biforcano e si assottigliano
 * (legge di Murray), con nodi gonfi agli innesti e punte ad ago. Biomeccanico.
 */
export function growth(ctx: Ctx, r: Rnd, seed: number, x: number, y: number, angle: number, S: number, opts: { depth: number; spread: number; weight: number; nodes: boolean }) {
  const n = noise2(seed)
  const branch = (x: number, y: number, a: number, w: number, len: number, d: number) => {
    const { pts, angles } = walk(x, y, a, len, t => n(x / S * 3 + t * 2, y / S * 3 + d) * 7 / S, Math.max(1.5, S / 600))
    taper(ctx, pts, t => (d === 0 ? w * Math.pow(1 - t, 1.2) : w * (1 - t * 0.35)))
    const [ex, ey] = pts[pts.length - 1], ea = angles[angles.length - 1]
    if (d === 0) return
    if (opts.nodes && r() < 0.55) { ctx.beginPath(); ctx.ellipse(ex, ey, w * 0.95, w * 1.25, ea, 0, Math.PI * 2); ctx.fill() }
    const kids = r() < 0.25 ? 3 : 2
    for (let k = 0; k < kids; k++) {
      const off = (k - (kids - 1) / 2) * opts.spread * range(r, 0.7, 1.3)
      branch(ex, ey, ea + off, w * Math.pow(0.5, 1 / 3) * range(r, 0.85, 1), len * range(r, 0.62, 0.85), d - 1)
    }
    // spine laterali sul ramo
    if (r() < 0.6) {
      const i = Math.floor(range(r, 0.3, 0.8) * (pts.length - 1)), side = r() < 0.5 ? -1 : 1
      thorn(ctx, pts[i][0], pts[i][1], angles[i] + side * range(r, 0.5, 1.1), len * range(r, 0.25, 0.5), w * 0.8, side * range(r, 0.15, 0.5))
    }
  }
  branch(x, y, angle, S * 0.035 * opts.weight, S * 0.2, opts.depth)
}

// ─── inchiostro ──────────────────────────────────────────────────────────────

/**
 * Densità di una goccia d'inchiostro in acqua (0..1 per pixel): nucleo denso,
 * filamenti creati da rumore increspato (ridged) e dal dominio deformato.
 */
export function inkField(w: number, h: number, seed: number, cx: number, cy: number, R: number, opts: { turb: number; ridges: number }) {
  const n1 = noise2(seed), n2 = noise2(seed + 1), n3 = noise2(seed + 2)
  const out = new Float32Array(w * h)
  const s = 2.2 / R
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const qx = x + (fbm(n1, x * s, y * s, 3) - 0.5) * R * 1.1 * opts.turb
    const qy = y + (fbm(n2, x * s + 5.2, y * s + 1.3, 3) - 0.5) * R * 1.1 * opts.turb
    const d = Math.hypot(qx - cx, (qy - cy) * 1.08) / R
    if (d > 1.6) continue
    const f = fbm(n3, qx * s * 1.3, qy * s * 1.3, 5)
    const ridge = Math.pow(1 - Math.abs(2 * f - 1), 2 + opts.ridges * 6)
    const fall = Math.max(0, 1 - d)
    const core = Math.pow(fall, 2.2)
    out[y * w + x] = Math.min(1, core * 0.85 + ridge * Math.pow(fall, 0.7) * 0.9 + f * fall * 0.15)
  }
  return out
}

/** fumo d'inchiostro: migliaia di particelle trascinate da un campo senza divergenza */
export function inkSmoke(ctx: Ctx, seed: number, r: Rnd, cx: number, cy: number, R: number, count: number, alpha: number) {
  const n = noise2(seed + 7)
  const e = 0.5, sc = 1.8 / R
  ctx.globalAlpha = alpha
  ctx.lineWidth = Math.max(0.6, R / 700)
  ctx.lineCap = 'round'
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * R * 0.35
    let x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr
    ctx.beginPath(); ctx.moveTo(x, y)
    const steps = 30 + Math.floor(r() * 90)
    for (let k = 0; k < steps; k++) {
      // curl del rumore: flusso che si avvolge senza addensarsi
      const nx = (n(x * sc, (y + e) * sc) - n(x * sc, (y - e) * sc)) / (2 * e)
      const ny = -(n((x + e) * sc, y * sc) - n((x - e) * sc, y * sc)) / (2 * e)
      const ox = (x - cx) / R, oy = (y - cy) / R
      x += (nx * 900 / R + ox * 0.9) * (R / 260)
      y += (ny * 900 / R + oy * 0.9 - 0.15) * (R / 260)
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

/**
 * Pennacchio d'inchiostro che cade in acqua: migliaia di filamenti partono dal
 * punto d'impatto, scendono per gravità e vengono avvolti da un flusso curl che
 * cresce con la profondità (in alto il getto è compatto, in basso si apre a fungo).
 */
export function inkPlume(ctx: Ctx, seed: number, cx: number, top: number, S: number, depth: number, count: number, opts: { turb: number; spread: number; alpha: number }) {
  const n = noise3(seed), r = (() => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } })()
  const sc = 2.4 / S, h = 0.02, step = S * 0.0032
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  for (let i = 0; i < count; i++) {
    let x = cx + (r() - 0.5) * S * 0.03 * opts.spread, y = top + r() * S * 0.03
    const life = Math.floor((depth / step) * (0.35 + r() * 0.75))
    ctx.globalAlpha = opts.alpha * (0.5 + r())
    ctx.lineWidth = Math.max(0.5, S * 0.0011 * (0.4 + r() * 1.6))
    ctx.beginPath(); ctx.moveTo(x, y)
    const side = r() < 0.5 ? -1 : 1
    // ogni famiglia di filamenti vive in una "fetta" diversa del rumore: il getto si divide in veli
    const z = Math.floor(r() * 7) * 0.37 + r() * 0.08
    for (let k = 0; k < life; k++) {
      const prog = Math.min(1, (y - top) / depth)
      const X = x * sc, Y = y * sc
      const cxv = (n(X, Y + h, z) - n(X, Y - h, z)) / (2 * h), cyv = -(n(X + h, Y, z) - n(X - h, Y, z)) / (2 * h)
      const tw = opts.turb * (0.15 + prog * prog * 2.2)
      // a metà caduta il getto si allarga a fungo
      const bloom = Math.max(0, prog - 0.35) * side * 0.9 * opts.spread
      x += (cxv * tw * 0.35 + bloom + (r() - 0.5) * 0.25 * prog) * step
      y += (1 - prog * 0.55 + cyv * tw * 0.25) * step
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}
