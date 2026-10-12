/**
 * Quaderno gotico: i segni a penna bianca su carta a quadretti nera dei taccuini
 * tattoo cyber-gotici: ali a falce con smerli da pipistrello e pugnali a croce.
 * Le ali sono linee vere, non sagome contornate: gli smerli sforano e si incrociano
 * sulle cuspidi, le ali che si sovrappongono mostrano entrambe le linee, la mano
 * preme e rilascia, trema, si stacca e ripassa. Gli aghi restano pieni.
 */
import { noise2, range, type Ctx, type Rnd } from './raster'
import { lozenge, needle, taper, whip, type Pt } from './strokes'

export interface WingGeom {
  /** dorso, dalla radice alla punta */
  back: Pt[]
  /** ventre spezzato in smerli: ogni arco sfora oltre la cuspide e incrocia il vicino */
  arcs: Pt[][]
  /** aghi pieni: asse e larghezza alla base */
  spikes: { pts: Pt[]; w: number }[]
  /** nervature: dalla cuspide dentro la lama, verso il dorso */
  veins: Pt[][]
  /** ripresa interna parallela al dorso, a tratti */
  echo: Pt[][]
  /** sagoma piena (per lo stile pieno) */
  poly: Pt[]
}

/**
 * Ala a falce: il dorso è una frusta (curvatura che cresce verso la punta), il ventre
 * è morso da smerli concavi sempre più piccoli verso le estremità; da ogni cuspide
 * parte un ago spazzato verso la punta dell'ala. Restituisce linee, non una sagoma:
 * così le cuspidi si incrociano come nel disegno a mano.
 */
export function wingGeom(r: Rnd, x: number, y: number, angle: number, L: number, o: { width: number; bites: number; depth: number; spikes: number; bend: number; veins: number; echo: number }): WingGeom {
  // falce vera: curva già dalla radice, si chiude di più verso la punta
  const c1 = o.bend * range(r, 2.0, 2.8), c0 = c1 * range(r, 0.35, 0.6)
  const { pts, angles } = whip(x, y, angle, L, c0, c1, 1.4, Math.max(1, L / 900))
  const n = pts.length
  const side = c1 > 0 ? 1 : -1
  const at = (t: number) => Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))))
  const nrm = (i: number): Pt => [-Math.sin(angles[i]) * side, Math.cos(angles[i]) * side]
  const off = (t: number, w: number): Pt => { const i = at(t), v = nrm(i); return [pts[i][0] + v[0] * w, pts[i][1] + v[1] * w] }
  // spessore asimmetrico: si gonfia nel primo terzo, poi si allunga in punta d'ago
  const peak = range(r, 0.3, 0.42)
  const th = (t: number) => L * o.width * (t < peak ? Math.pow(Math.sin((Math.max(0, t) / peak) * Math.PI / 2), 0.7) : Math.pow(Math.cos((Math.min(1, t) - peak) / (1 - peak) * Math.PI / 2), 1.25))
  // cuspidi: intervalli diseguali, più ampi al centro del ventre
  const k = Math.max(2, Math.round(o.bites))
  const t0 = range(r, 0.06, 0.12), t1 = range(r, 0.8, 0.88)
  const cuts = [t0]
  const wts: number[] = []
  for (let i = 0; i < k; i++) wts.push(Math.pow(Math.sin(Math.PI * (i + 0.5) / k), 0.6) * range(r, 0.7, 1.3))
  const tot = wts.reduce((a, b) => a + b, 0)
  for (let i = 0; i < k; i++) cuts.push(cuts[i] + (t1 - t0) * wts[i] / tot)
  const depths = wts.map(() => o.depth * range(r, 0.8, 1.15))
  // profilo dello smerlo: fianchi ripidi, fondo tondo; oltre la cuspide (u<0, u>1) esce
  // dalla lama, così due smerli vicini si incrociano a X sulla punta
  const biteU = (u: number, d: number) => { const s = Math.sin(Math.PI * u); return d * Math.sign(s) * Math.pow(Math.abs(s), 0.45) }
  const arcs: Pt[][] = []
  const steps = (dt: number) => Math.max(8, Math.ceil(dt * n))
  // radice → prima cuspide e ultima cuspide → punta: ventre pieno
  const plain = (ta: number, tb: number) => { const q: Pt[] = []; const m = steps(tb - ta); for (let j = 0; j <= m; j++) { const t = ta + (tb - ta) * j / m; q.push(off(t, th(t))) } return q }
  arcs.push(plain(0, t0))
  for (let i = 0; i < k; i++) {
    const ta = cuts[i], tb = cuts[i + 1], e0 = range(r, 0.04, 0.12), e1 = range(r, 0.04, 0.12)
    const q: Pt[] = [], m = steps(tb - ta)
    for (let j = 0; j <= m; j++) {
      const u = -e0 + (1 + e0 + e1) * j / m, t = ta + (tb - ta) * u
      q.push(off(t, th(t) * (1 - biteU(u, depths[i]))))
    }
    arcs.push(q)
  }
  arcs.push(plain(t1, 1))
  // aghi dalle cuspidi, piegati verso la punta
  const spikes: { pts: Pt[]; w: number }[] = []
  for (let c = 1; c < k; c++) {
    if (r() > o.spikes) continue
    const t = cuts[c], i = at(t), nv = nrm(i), w = th(t)
    const base = off(t, w * 0.9)
    const out = Math.atan2(nv[1], nv[0]) + side * range(r, 0.7, 1.05)
    const sp = whip(base[0], base[1], out, w * range(r, 0.5, 1.0), side * 0.2, side * range(r, 1.2, 2.4), 1.6, 1)
    spikes.push({ pts: sp.pts, w: w * range(r, 0.08, 0.12) })
  }
  if (r() < o.spikes) {
    const nv = nrm(0), a = angle + Math.PI + side * range(r, 0.2, 0.5)
    const sp = whip(pts[0][0] + nv[0] * th(0.02), pts[0][1] + nv[1] * th(0.02), a, L * range(r, 0.06, 0.12), 0, -side * 0.8, 2, 1)
    spikes.push({ pts: sp.pts, w: L * o.width * 0.06 })
  }
  // nervature: come le dita dell'ala, dalla cuspide piegano verso la punta e muoiono
  // prima del dorso
  const veins: Pt[][] = []
  for (let c = 1; c < k; c++) {
    if (r() > o.veins) continue
    const t = cuts[c], dt = range(r, 0.03, 0.09), reach = range(r, 0.55, 0.85)
    const q: Pt[] = []
    for (let j = 0; j <= 30; j++) {
      const u = j / 30, tt = t + dt * Math.pow(u, 1.6)
      q.push(off(tt, th(tt) * (1 - reach * Math.pow(u, 0.8)) * 0.98))
    }
    veins.push(q)
  }
  // ripresa del dorso: una seconda linea a filo, a tratti
  const echo: Pt[][] = []
  if (r() < o.echo) {
    let ta = range(r, 0.05, 0.2)
    while (ta < 0.85) {
      const tb = Math.min(0.92, ta + range(r, 0.15, 0.45)), q: Pt[] = [], m = steps(tb - ta), d = range(r, 0.12, 0.2)
      for (let j = 0; j <= m; j++) { const t = ta + (tb - ta) * j / m; q.push(off(t, th(t) * d)) }
      echo.push(q)
      ta = tb + range(r, 0.04, 0.12)
    }
  }
  const poly: Pt[] = [...pts]
  for (let i = n - 1; i >= 0; i--) {
    const t = i / (n - 1)
    let b = 0
    if (t > t0 && t < t1) { let c = 0; while (c < k - 1 && t > cuts[c + 1]) c++; b = biteU((t - cuts[c]) / (cuts[c + 1] - cuts[c]), depths[c]) }
    poly.push(off(t, th(t) * (1 - b)))
  }
  return { back: pts, arcs, spikes, veins, echo, poly }
}

/** riflette una geometria d'ala (o qualsiasi insieme di punti) con una funzione */
export function mapWing(g: WingGeom, f: (p: Pt) => Pt): WingGeom {
  const m = (q: Pt[]) => q.map(f)
  return { back: m(g.back), arcs: g.arcs.map(m), spikes: g.spikes.map(s => ({ pts: m(s.pts), w: s.w })), veins: g.veins.map(m), echo: g.echo.map(m), poly: m(g.poly) }
}

export function wingBox(g: WingGeom) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const q of [g.poly, ...g.spikes.map(s => s.pts), ...g.arcs]) for (const p of q) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1] }
  return { x0, y0, x1, y1 }
}

export interface Hand { lw: number; shake: number; sketch: number; breaks: number; seed: number; r: Rnd }

/**
 * Linea a penna: pressione che respira lungo il tratto, attacco e stacco sottili,
 * tremolio della mano (un campo di spostamento unico per tutta la pagina, così le
 * linee vicine tremano insieme), qualche interruzione e qualche ripassata storta.
 */
export function penLine(ctx: Ctx, pts: Pt[], h: Hand, weight = 1) {
  if (pts.length < 2) return
  const nx = noise2(h.seed), ny = noise2(h.seed + 1), np = noise2(h.seed + 2)
  const sc = h.lw * 90, amp = h.lw * 1.6 * h.shake
  const q: Pt[] = pts.map(p => [p[0] + nx(p[0] / sc, p[1] / sc) * amp, p[1] + ny(p[0] / sc, p[1] / sc) * amp])
  const len: number[] = [0]
  for (let i = 1; i < q.length; i++) len.push(len[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]))
  const total = len[len.length - 1]
  if (total < 1) return
  const off0 = h.r() * 100
  const draw = (seg: Pt[], s0: number, s1: number, k: number) => {
    const lw = h.lw * weight * k
    taper(ctx, seg, t => {
      const s = s0 + (s1 - s0) * t
      const ends = Math.min(1, (s - s0) / (lw * 5), (s1 - s) / (lw * 5))
      const press = 0.6 + 0.8 * (0.5 + 0.5 * np(off0 + s / (h.lw * 70), 0.5))
      return lw * press * Math.pow(Math.max(0.15, ends), 0.5)
    })
  }
  const slice = (a: number, b: number) => {
    const seg: Pt[] = []
    for (let i = 0; i < q.length; i++) if (len[i] >= a && len[i] <= b) seg.push(q[i])
    return seg
  }
  // interruzioni: la penna si stacca per un attimo
  let s = 0
  while (s < total) {
    let e = total
    if (h.breaks > 0 && total > h.lw * 80 && h.r() < h.breaks) e = Math.min(total, s + total * range(h.r, 0.35, 0.8))
    draw(slice(s, e), s, e, 1)
    s = e + h.lw * range(h.r, 1.5, 4)
  }
  // ripassata: un pezzo della linea ridisegnato un filo accanto, più sottile
  if (h.r() < h.sketch && total > h.lw * 30) {
    const a = total * range(h.r, 0, 0.5), b = Math.min(total, a + total * range(h.r, 0.25, 0.6))
    const seg = slice(a, b), dd = h.lw * range(h.r, 0.9, 2.2) * (h.r() < 0.5 ? -1 : 1)
    const shifted: Pt[] = seg.map((p, i) => {
      const pa = seg[Math.max(0, i - 1)], pb = seg[Math.min(seg.length - 1, i + 1)]
      const tx = pb[0] - pa[0], ty = pb[1] - pa[1], l = Math.hypot(tx, ty) || 1
      const fade = Math.sin(Math.PI * i / Math.max(1, seg.length - 1))
      return [p[0] - ty / l * dd * fade, p[1] + tx / l * dd * fade]
    })
    draw(shifted, a, b, 0.6)
  }
}

/** disegna un'ala a penna (linee) o piena (sagoma con le nervature incise) */
export function drawWing(ctx: Ctx, g: WingGeom, h: Hand, filled: boolean) {
  if (filled) {
    ctx.beginPath(); g.poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill()
    for (const sp of g.spikes) taper(ctx, sp.pts, needle(sp.w, 0.12, 1.3))
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'
    for (const v of [...g.veins, ...g.echo]) penLine(ctx, v, h, 0.9)
    ctx.restore()
    return
  }
  penLine(ctx, g.back, h, 1.15)
  for (const a of g.arcs) penLine(ctx, a, h)
  for (const v of g.veins) penLine(ctx, v, h, 0.8)
  for (const e of g.echo) penLine(ctx, e, h, 0.7)
  // aghi: pieni ma fini, con l'attacco che nasce dalla linea e la punta ricurva
  for (const sp of g.spikes) taper(ctx, sp.pts, needle(sp.w, 0.12, 1.3))
}

/** pugnale a croce: asta ad ago, rombo al centro, braccia corte affilate */
export function dagger(ctx: Ctx, r: Rnd, x: number, y: number, h: number) {
  const w = h * 0.07
  const cy = y + h * range(r, 0.38, 0.48)
  const up: Pt[] = [], dn: Pt[] = []
  for (let i = 0; i <= 40; i++) { up.push([x, cy - (cy - y) * i / 40]); dn.push([x, cy + (y + h - cy) * i / 40]) }
  taper(ctx, up, needle(w, 0.02, 1.2))
  taper(ctx, dn, needle(w, 0.02, 1.05))
  const arm = h * range(r, 0.13, 0.2)
  for (const s of [-1, 1]) {
    const a: Pt[] = []
    for (let i = 0; i <= 20; i++) a.push([x + s * arm * i / 20, cy - h * 0.06 + Math.pow(i / 20, 2) * h * 0.03])
    taper(ctx, a, needle(w * 0.8, 0.02, 1.2))
  }
  lozenge(ctx, x, cy - h * 0.06, w * 2.2)
}

/** carta a quadretti: linee sottili tratteggiate, una ogni `step` px, e il margine della pagina */
export function gridPaper(ctx: Ctx, W: number, H: number, step: number, color: string, alpha: number) {
  ctx.save()
  ctx.strokeStyle = color; ctx.globalAlpha = alpha
  ctx.lineWidth = Math.max(0.5, step * 0.04)
  ctx.setLineDash([step * 0.12, step * 0.1])
  ctx.beginPath()
  for (let x = step * 0.5; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H) }
  for (let y = step * 0.5; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y) }
  ctx.stroke()
  ctx.restore()
}
