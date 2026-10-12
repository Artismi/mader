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
  spikes: { pts: Pt[]; w: number; cusp?: number }[]
  /** nervature: dalla cuspide dentro la lama, verso il dorso */
  veins: Pt[][]
  /** ripresa interna parallela al dorso, a tratti */
  echo: Pt[][]
  /** sagoma piena (per lo stile pieno) */
  poly: Pt[]
  /** cuspidi del ventre: punto, direzione d'uscita, spessore locale (per farci crescere altre ali) */
  cusps: { p: Pt; a: number; w: number }[]
  /** curvatura: +1 o -1 */
  side: number
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
  const steps = (dt: number) => Math.max(8, Math.ceil(dt * n))
  // punte: non sono pezzi aggiunti. Vicino alla cuspide i due smerli che vi arrivano
  // piegano in fuori e si chiudono nello stesso punto, come le dita di un'ala di
  // pipistrello: fianchi concavi, una sola punta affilata.
  const spikes: { pts: Pt[]; w: number; cusp?: number }[] = []
  const cusps: { p: Pt; a: number; w: number }[] = []
  const horns: ({ len: number; dt: number } | null)[] = [null]
  for (let c = 1; c < k; c++) {
    const t = cuts[c], i = at(t), nv = nrm(i), w = th(t)
    const hasHorn = r() <= o.spikes
    const horn = hasHorn ? { len: w * range(r, 0.35, 0.7), dt: (t1 - t0) / k * range(r, 0.12, 0.35) } : null
    horns.push(horn)
    const tip = horn ? off(t + horn.dt, w + horn.len) : off(t, w)
    cusps.push({ p: tip, a: Math.atan2(nv[1], nv[0]) + side * range(r, 0.3, 0.6), w })
  }
  horns.push(null)
  const arcs: Pt[][] = []
  // radice → prima cuspide e ultima cuspide → punta: ventre pieno
  const plain = (ta: number, tb: number) => { const q: Pt[] = []; const m = steps(tb - ta); for (let j = 0; j <= m; j++) { const t = ta + (tb - ta) * j / m; q.push(off(t, th(t))) } return q }
  arcs.push(plain(0, t0))
  for (let i = 0; i < k; i++) {
    const ta = cuts[i], tb = cuts[i + 1], hIn = horns[i], hOut = horns[i + 1]
    // senza punta lo smerlo sfora la cuspide e incrocia il vicino
    const e0 = hIn ? 0 : range(r, 0.04, 0.12), e1 = hOut ? 0 : range(r, 0.04, 0.12)
    const q: Pt[] = [], m = steps(tb - ta) * 2
    const reach = range(r, 0.3, 0.45)
    for (let j = 0; j <= m; j++) {
      const u = -e0 + (1 + e0 + e1) * j / m
      let t = ta + (tb - ta) * u, w = th(t) * (1 - biteU(u, depths[i]))
      // rampa dolce che porta lo smerlo fino alla punta: tangente, poi sempre più tesa
      const gOut = hOut ? Math.pow(Math.max(0, (u - (1 - reach)) / reach), 2.4) : 0
      const gIn = hIn ? Math.pow(Math.max(0, (reach - u) / reach), 2.4) : 0
      if (hOut) { t += hOut.dt * gOut; w += hOut.len * gOut }
      if (hIn) { t += hIn.dt * gIn; w += hIn.len * gIn }
      q.push(off(t, w))
    }
    arcs.push(q)
  }
  arcs.push(plain(t1, 1))
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
  return { back: pts, arcs, spikes, veins, echo, poly, cusps, side }
}

/** riflette una geometria d'ala (o qualsiasi insieme di punti) con una funzione */
export function mapWing(g: WingGeom, f: (p: Pt) => Pt): WingGeom {
  const m = (q: Pt[]) => q.map(f)
  const p0 = f([0, 0]), px = f([1, 0]), py = f([0, 1])
  // riflessione? allora le direzioni si specchiano e la curvatura cambia verso
  const det = (px[0] - p0[0]) * (py[1] - p0[1]) - (px[1] - p0[1]) * (py[0] - p0[0])
  const dirMap = (a: number) => { const q = f([Math.cos(a), Math.sin(a)]); return Math.atan2(q[1] - p0[1], q[0] - p0[0]) }
  const k = Math.sqrt(Math.abs(det))
  return {
    back: m(g.back), arcs: g.arcs.map(m), spikes: g.spikes.map(s => ({ pts: m(s.pts), w: s.w * k, cusp: s.cusp })), veins: g.veins.map(m), echo: g.echo.map(m), poly: m(g.poly),
    cusps: g.cusps.map(c => ({ p: f(c.p), a: dirMap(c.a), w: c.w * k })), side: det < 0 ? -g.side : g.side,
  }
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

type WingOpts = { width: number; bites: number; depth: number; spikes: number; bend: number; veins: number; echo: number }

/**
 * Un'ala con le sue figlie: da alcune cuspidi, al posto dell'ago, nasce un'ala più
 * piccola che parte tangente al ventre e si piega nello stesso verso della madre.
 * Le linee continuano l'una nell'altra: si legge un solo organismo, non pezzi sparsi.
 */
/** punto dentro un poligono (pari-dispari) */
function inside(p: Pt, poly: Pt[]) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c
  }
  return c
}

/** spazio occupato: le sagome già disegnate (e, se c'è, il loro specchio) */
export interface Space { polys: Pt[][]; mirror?: (p: Pt) => Pt }
const occupy = (sp: Space, poly: Pt[]) => { sp.polys.push(poly); if (sp.mirror) sp.polys.push(poly.map(sp.mirror)) }
/** quanta parte di una sagoma (radice esclusa) cade su sagome esistenti */
function overlap(poly: Pt[], sp: Space) {
  const n = poly.length, step = Math.max(1, Math.floor(n / 60))
  let hit = 0, tot = 0
  for (let i = 0; i < n; i += step) {
    const t = i / n
    if (t < 0.08 || t > 0.92) continue      // dorso e ventre partono entrambi dalla radice
    tot++
    if (sp.polys.some(q => inside(poly[i], q))) hit++
  }
  return tot ? hit / tot : 0
}

/**
 * Un'ala con le sue figlie: da alcune cuspidi nasce un'ala più piccola che parte
 * dalla punta e si apre nel vuoto. Una figlia nasce solo se trova posto: se finirebbe
 * sopra il corpo della madre o di altre ali si rinuncia (o si prova più corta), così
 * l'insieme resta ricco ma leggibile.
 */
export function wingTree(r: Rnd, x: number, y: number, angle: number, L: number, o: WingOpts, branch: number, depth = 2, space: Space = { polys: [] }): WingGeom[] {
  const g = wingGeom(r, x, y, angle, L, o)
  const out = [g]
  occupy(space, g.poly)
  if (depth <= 0 || L < 40) return out
  g.cusps.forEach(c => {
    if (r() > branch) return
    for (const k of [1, 0.65]) {
      const sub = wingGeom(r, c.p[0], c.p[1], c.a + g.side * range(r, 0.1, 0.35), L * range(r, 0.32, 0.5) * k, { ...o, width: o.width * range(r, 0.9, 1.15), bites: Math.max(2, o.bites - 1), bend: -Math.sign(o.bend) * range(r, 0.7, 1.0) })
      if (overlap(sub.poly, space) > 0.04) continue
      // trovato posto: la figlia diventa a sua volta un albero (con il seme già consumato)
      out.push(sub); occupy(space, sub.poly)
      if (depth > 1) sub.cusps.forEach(cc => {
        if (r() > branch * 0.5) return
        const g2 = wingGeom(r, cc.p[0], cc.p[1], cc.a + sub.side * range(r, 0.1, 0.35), L * 0.4 * range(r, 0.32, 0.5) * k, { ...o, bites: 2, bend: Math.sign(o.bend) })
        if (overlap(g2.poly, space) <= 0.04) { out.push(g2); occupy(space, g2.poly) }
      })
      break
    }
  })
  return out
}

/** lama centrale a doppio taglio: due fili che si chiudono in punta d'ago ai due capi */
export function bladeLines(cx: number, top: number, bottom: number, wmax: number, bulge = 0.42): Pt[][] {
  const L: Pt[] = [], R: Pt[] = [], n = 200
  for (let i = 0; i <= n; i++) {
    const t = i / n, y = top + (bottom - top) * t
    // pancia alta, punta inferiore lunga: slancio verso il basso
    const u = t < bulge ? Math.pow(Math.sin(t / bulge * Math.PI / 2), 0.9) : Math.pow(Math.cos((t - bulge) / (1 - bulge) * Math.PI / 2), 1.4)
    L.push([cx - wmax * u, y]); R.push([cx + wmax * u, y])
  }
  return [L, R]
}

/**
 * Organismo: una lama verticale da cui germogliano coppie di ali speculari, ognuna
 * con le sue figlie. Le radici delle ali poggiano sul filo della lama e partono
 * tangenti, così tutto è un unico oggetto simmetrico.
 */
export function organism(r: Rnd, cx: number, top: number, bottom: number, S: number, o: WingOpts, branch: number, pairs: number) {
  const wmax = S * 0.03
  const blade = bladeLines(cx, top, bottom, wmax)
  // filo centrale della lama, solo nella pancia: la nervatura che regge le ali
  const Hb = bottom - top
  blade.push(Array.from({ length: 80 }, (_, j): Pt => [cx, top + Hb * (0.08 + 0.6 * j / 79)]))
  const wings: WingGeom[] = []
  const Hh = Hb
  // lo spazio è condiviso da tutte le coppie: le figlie non invadono le ali vicine
  const space: Space = { polys: [], mirror: p => [2 * cx - p[0], p[1]] }
  for (let i = 0; i < pairs; i++) {
    const t = 0.1 + 0.6 * (pairs === 1 ? 0.3 : i / (pairs - 1)) + range(r, -0.04, 0.04)
    const y = top + Hh * t
    const u = t < 0.42 ? Math.pow(Math.sin(t / 0.42 * Math.PI / 2), 0.9) : Math.pow(Math.cos((t - 0.42) / 0.58 * Math.PI / 2), 1.4)
    // le alte salgono e si aprono, le basse ricadono verso il basso: un ventaglio
    const down = i >= Math.ceil(pairs * 0.6)
    const a = down ? Math.PI / 2 - range(r, 0.35, 0.8) : -Math.PI / 2 + range(r, 0.15, 0.5) + i * 0.32
    // lunghe abbastanza da accavallarsi alla coppia vicina: gli incroci legano il tutto
    const L = S * (down ? range(r, 0.45, 0.6) : range(r, 0.6, 0.8) * (1 - i * 0.1))
    const tree = wingTree(r, cx + wmax * u * 0.9, y, a, L, { ...o, bend: down ? -1 : 1 }, branch, 2, space)
    for (const g of tree) { wings.push(g); wings.push(mapWing(g, p => [2 * cx - p[0], p[1]])) }
  }
  return { blade, wings }
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
