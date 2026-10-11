/**
 * Segni disegnati: tratti che si assottigliano fino all'ago, spine, ghirigori a
 * pennino largo, crescite vascolari. È il vocabolario del cybersigilism / neo-tribal
 * e della calligrafia gotica, generato invece che disegnato a mano.
 *
 * Tutte le misure sono in frazioni di S (lato corto della tavola): la stessa
 * ricetta regge qualsiasi risoluzione.
 */
import { fbm, noise2, range, type Ctx, type Rnd } from './raster'

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

/** spina: triangolo curvo che parte dal tratto e finisce in punta */
function thorn(ctx: Ctx, x: number, y: number, ang: number, len: number, w: number, bend: number) {
  const { pts } = walk(x, y, ang, len, () => bend / len, Math.max(1, len / 30))
  taper(ctx, pts, t => w * Math.pow(1 - t, 1.3))
}

/** esegue il disegno anche specchiato attorno all'asse verticale cx */
export function mirrored(ctx: Ctx, cx: number, draw: () => void, on = true) {
  draw()
  if (!on) return
  ctx.save(); ctx.translate(cx * 2, 0); ctx.scale(-1, 1); draw(); ctx.restore()
}

// ─── cybersigilism ───────────────────────────────────────────────────────────

export interface SigilOpts { strokes: number; spikes: number; hook: number; weight: number; spine: boolean; arcs: boolean }

/**
 * Sigillo neo-tribale: spina centrale, tratti ad ago che escono dall'asse e si
 * arricciano in uncini, spine affilate rivolte all'esterno, archi che incrociano.
 * Si disegna metà e si specchia: la simmetria è ciò che lo rende "emblema".
 */
export function sigil(ctx: Ctx, r: Rnd, cx: number, cy: number, S: number, o: SigilOpts) {
  const wt = o.weight
  const strokes: { pts: Pt[]; angles: number[]; prof: (t: number) => number }[] = []
  // tratti laterali distribuiti in altezza per un equilibrio verticale
  for (let i = 0; i < o.strokes; i++) {
    const band = (i + 0.2 + r() * 0.6) / o.strokes
    const y0 = cy + (band - 0.5) * S * 0.78
    const x0 = cx + range(r, 0.004, 0.05) * S
    const out = range(r, -1.05, 1.05) + (band - 0.5) * 0.9 // in alto verso l'alto, in basso verso il basso
    const len = range(r, 0.16, 0.42) * S
    const k1 = range(r, -3.2, 3.2) / S, ph = r() * Math.PI * 2, freq = range(r, 0.6, 1.8)
    const hookDir = r() < 0.5 ? -1 : 1, hook = o.hook * range(r, 6, 16) / S * hookDir
    const curv = (t: number) => k1 * Math.sin(t * Math.PI * freq + ph) + hook * Math.pow(t, 3.2)
    const { pts, angles } = walk(x0, y0, out, len, curv, Math.max(1.5, S / 600))
    const base = range(r, 0.016, 0.034) * S * wt
    const prof = r() < 0.7 ? needle(base, 0.06, 1.05) : spindle(base * 0.85, 0.6)
    strokes.push({ pts, angles, prof })
  }
  mirrored(ctx, cx, () => {
    for (const s of strokes) {
      taper(ctx, s.pts, s.prof)
      // spine verso l'esterno della curva
      const nT = Math.floor(o.spikes * range(r, 0.4, 1.4) + 0.3)
      for (let k = 0; k < nT; k++) {
        const t = range(r, 0.15, 0.75), i = Math.floor(t * (s.pts.length - 1))
        const [x, y] = s.pts[i], a = s.angles[i]
        const side = r() < 0.65 ? -1 : 1
        const ang = a + side * range(r, 0.45, 1.05)
        thorn(ctx, x, y, ang, range(r, 0.035, 0.11) * S, s.prof(t) * 0.95, side * range(r, 0.02, 0.09) * S)
      }
    }
  })
  if (o.spine) {
    // asse centrale: fuso lungo con punte in alto e in basso, nodi a rombo
    const top = cy - S * 0.47, bot = cy + S * 0.47
    const pts: Pt[] = []
    for (let i = 0; i <= 200; i++) pts.push([cx, top + (bot - top) * (i / 200)])
    taper(ctx, pts, t => S * 0.022 * wt * (Math.pow(Math.sin(Math.PI * t), 0.45) * (0.55 + 0.45 * Math.abs(Math.cos(t * Math.PI * 3)))))
    for (let k = 0; k < 3; k++) {
      const yy = cy + (k - 1) * S * 0.2, d = S * (0.022 + r() * 0.02) * wt
      ctx.beginPath(); ctx.moveTo(cx, yy - d * 2.4); ctx.lineTo(cx + d, yy); ctx.lineTo(cx, yy + d * 2.4); ctx.lineTo(cx - d, yy); ctx.closePath(); ctx.fill()
    }
  }
  if (o.arcs) {
    // archi ad ago che tagliano la figura: il "circuito" del sigillo
    const n = 1 + Math.floor(r() * 2)
    for (let k = 0; k < n; k++) {
      const R = S * range(r, 0.18, 0.36), a0 = range(r, -2.6, -1.9), sweep = range(r, 1.6, 2.6)
      const pts: Pt[] = []
      for (let i = 0; i <= 160; i++) { const a = a0 + sweep * (i / 160); pts.push([cx + Math.cos(a) * R * 1.08, cy + Math.sin(a) * R + S * range(r, -0.03, 0.03) * 0]) }
      mirrored(ctx, cx, () => taper(ctx, pts, spindle(S * 0.011 * wt, 0.8)))
    }
  }
}

/** corona di spine attorno a un cerchio (per incorniciare una parola) */
export function thornRing(ctx: Ctx, r: Rnd, cx: number, cy: number, R: number, S: number, count: number, weight: number) {
  const pts: Pt[] = []
  for (let i = 0; i <= 400; i++) { const a = (i / 400) * Math.PI * 2; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.92]) }
  taper(ctx, pts, t => S * 0.008 * weight * (0.5 + 0.5 * Math.abs(Math.sin(t * Math.PI * count / 2))))
  const half: { a: number; len: number; bend: number; w: number }[] = []
  for (let i = 0; i < count / 2; i++) half.push({ a: -Math.PI / 2 + (i + 0.5) / (count / 2) * Math.PI, len: range(r, 0.05, 0.16) * S, bend: range(r, -0.06, 0.06) * S, w: range(r, 0.012, 0.024) * S * weight })
  mirrored(ctx, cx, () => {
    for (const h of half) {
      const x = cx + Math.cos(h.a) * R, y = cy + Math.sin(h.a) * R * 0.92
      thorn(ctx, x, y, h.a + range(r, -0.35, 0.35), h.len, h.w, h.bend)
    }
  })
}

/** fascia neo-tribale orizzontale (tipo bracciale): onda centrale con uncini */
export function band(ctx: Ctx, r: Rnd, cx: number, cy: number, Wd: number, S: number, weight: number) {
  const pts: Pt[] = []
  const amp = S * 0.035, f = 2 + Math.floor(r() * 3)
  for (let i = 0; i <= 400; i++) { const t = i / 400; pts.push([cx - Wd / 2 + Wd * t, cy + Math.sin(t * Math.PI * 2 * f) * amp * Math.sin(Math.PI * t)]) }
  taper(ctx, pts, t => S * 0.02 * weight * Math.pow(Math.sin(Math.PI * t), 0.35))
  const hooks = 3 + Math.floor(r() * 4)
  const specs: { t: number; up: number; len: number; k: number; w: number }[] = []
  for (let i = 0; i < hooks; i++) specs.push({ t: (i + 0.5) / hooks * 0.5, up: r() < 0.5 ? -1 : 1, len: range(r, 0.08, 0.2) * S, k: range(r, 5, 14) / S, w: range(r, 0.014, 0.026) * S * weight })
  mirrored(ctx, cx, () => {
    for (const h of specs) {
      const i = Math.floor(h.t * 400), [x, y] = pts[i]
      const { pts: hp } = walk(x, y, h.up * Math.PI / 2 + range(r, -0.5, 0.5), h.len, t => h.k * h.up * Math.pow(t, 2) * 3, Math.max(1.5, S / 600))
      taper(ctx, hp, needle(h.w, 0.05, 1.1))
    }
  })
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
      thorn(ctx, pts[i][0], pts[i][1], angles[i] + side * range(r, 0.5, 1.1), len * range(r, 0.25, 0.5), w * 0.8, side * len * 0.05)
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
