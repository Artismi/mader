/**
 * Quaderno gotico: i segni a penna bianca su carta a quadretti nera dei taccuini
 * tattoo cyber-gotici. Ali a falce con smerli da pipistrello, scritte con le aste
 * che colano in aghi, pugnali a croce. Tutto nasce pieno e poi diventa contorno:
 * così le parti larghe restano disegnate al tratto e le punte sottili si chiudono
 * in nero pieno, come quando la penna ripassa un ago.
 */
import { distance, drawMask, fitSize, makeCanvas, newMask, noise2, range, text, type Ctx, type Face, type Mask, type Rnd } from './raster'
import { lozenge, needle, taper, whip, type Pt } from './strokes'

/**
 * Ala a falce: il dorso è una frusta (curvatura che cresce verso la punta), il ventre
 * è morso da smerli concavi sempre più piccoli verso le estremità; da ogni cuspide
 * parte un ago spazzato verso la punta dell'ala.
 */
export function batWing(ctx: Ctx, r: Rnd, x: number, y: number, angle: number, L: number, o: { width: number; bites: number; depth: number; spikes: number; bend: number }) {
  // falce vera: curva già dalla radice, si chiude di più verso la punta
  const c1 = o.bend * range(r, 2.0, 2.8), c0 = c1 * range(r, 0.35, 0.6)
  const { pts, angles } = whip(x, y, angle, L, c0, c1, 1.4, Math.max(1, L / 900))
  const n = pts.length
  const side = c1 > 0 ? 1 : -1
  const nrm = (i: number): Pt => [-Math.sin(angles[i]) * side, Math.cos(angles[i]) * side]
  // spessore asimmetrico: si gonfia nel primo terzo, poi si allunga in punta d'ago
  const peak = range(r, 0.3, 0.42)
  const th = (t: number) => L * o.width * (t < peak ? Math.pow(Math.sin((t / peak) * Math.PI / 2), 0.7) : Math.pow(Math.cos(((t - peak) / (1 - peak)) * Math.PI / 2), 1.25))
  // cuspidi: intervalli in progressione, più ampi al centro del ventre
  const k = Math.max(2, Math.round(o.bites))
  const t0 = range(r, 0.06, 0.12), t1 = range(r, 0.8, 0.88)
  const cuts = [t0]
  const wts: number[] = []
  for (let i = 0; i < k; i++) wts.push(Math.pow(Math.sin(Math.PI * (i + 0.5) / k), 0.6) * range(r, 0.75, 1.25))
  const tot = wts.reduce((a, b) => a + b, 0)
  for (let i = 0; i < k; i++) cuts.push(cuts[i] + (t1 - t0) * wts[i] / tot)
  const bite = (t: number) => {
    if (t <= t0 || t >= t1) return 0
    let i = 0
    while (i < k - 1 && t > cuts[i + 1]) i++
    const u = (t - cuts[i]) / (cuts[i + 1] - cuts[i])
    // fianchi ripidi alle cuspidi, fondo tondo: lo smerlo da pipistrello
    return o.depth * Math.pow(Math.sin(Math.PI * u), 0.45)
  }
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1])
  for (let i = n - 1; i >= 0; i--) {
    const t = i / (n - 1), w = th(t) * (1 - bite(t)), nv = nrm(i)
    ctx.lineTo(pts[i][0] + nv[0] * w, pts[i][1] + nv[1] * w)
  }
  ctx.closePath(); ctx.fill()
  // aghi dalle cuspidi, piegati verso la punta
  for (let c = 1; c < k; c++) {
    if (r() > o.spikes) continue
    const t = cuts[c], i = Math.round(t * (n - 1)), nv = nrm(i)
    const w = th(t)
    const base: Pt = [pts[i][0] + nv[0] * w * 0.82, pts[i][1] + nv[1] * w * 0.82]
    // l'ago prosegue la cuspide e si piega verso la punta dell'ala
    const out = Math.atan2(nv[1], nv[0]) + side * range(r, 0.7, 1.05)
    const len = w * range(r, 0.45, 0.95)
    const sp = whip(base[0], base[1], out, len, 0, side * range(r, 0.6, 1.4), 2, 1)
    taper(ctx, sp.pts, needle(w * 0.22, 0.02, 1.5))
  }
  // un ago anche alla radice, a controcurva
  if (r() < o.spikes) {
    const nv = nrm(0), a = angle + Math.PI + side * range(r, 0.2, 0.5)
    const sp = whip(pts[0][0] + nv[0] * th(0.02), pts[0][1] + nv[1] * th(0.02), a, L * range(r, 0.06, 0.12), 0, -side * 0.8, 2, 1)
    taper(ctx, sp.pts, needle(L * o.width * 0.12, 0.02, 1.3))
  }
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

/**
 * Scritta che cola: le aste si allungano verso il basso (e qualcuna verso l'alto) in
 * aghi lunghi e diseguali, una barra orizzontale taglia la parola e finisce in punta.
 */
export function spikedWord(W: number, H: number, r: Rnd, s: string, f: Face, cx: number, cy: number, width: number, o: { drip: number; bar: boolean }) {
  const { ctx: mctx } = makeCanvas(4, 4)
  const size = Math.min(fitSize(mctx, f.upper ? s.toUpperCase() : s, f, width), width * 0.5)
  const word = drawMask(W, H, ctx => { text(ctx, s, cx, cy, f, size, 'center') })
  const box = (() => {
    let x0 = W, x1 = -1, y0 = H, y1 = -1
    for (let y = Math.max(0, Math.floor(cy - size * 1.2)); y < Math.min(H, cy + size * 0.5); y++) for (let x = Math.max(0, Math.floor(cx - width)); x < Math.min(W, cx + width); x++)
      if (word.a[y * W + x] > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    return { x0, x1, y0, y1 }
  })()
  if (box.x1 < 0) return word
  const capH = box.y1 - box.y0
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && word.a[(y | 0) * W + (x | 0)] > 127
  // aste: colonne con tanto inchiostro; per ognuna il fondo e la cima
  const stems: { x: number; w: number; bottom: number; top: number }[] = []
  let run = -1
  for (let x = box.x0; x <= box.x1 + 1; x++) {
    let cnt = 0
    for (let y = box.y0; y <= box.y1; y++) if (at(x, y)) cnt++
    const isStem = cnt > capH * 0.55
    if (isStem && run < 0) run = x
    if (!isStem && run >= 0) {
      const sx = (run + x - 1) / 2, sw = x - run
      let bottom = box.y1, top = box.y0
      while (bottom > box.y0 && !at(sx, bottom)) bottom--
      while (top < box.y1 && !at(sx, top)) top++
      stems.push({ x: sx, w: sw, bottom, top })
      run = -1
    }
  }
  return drawMask(W, H, ctx => {
    ctx.drawImage((() => { const k = makeCanvas(W, H); const img = k.ctx.createImageData(W, H); for (let i = 0; i < word.a.length; i++) { img.data[i * 4 + 3] = word.a[i] } k.ctx.putImageData(img, 0, 0); return k.c })(), 0, 0)
    for (const st of stems) {
      if (r() < 0.82 * o.drip + 0.1) {
        // goccia verso il basso: lunga, a volte con un rombo a metà
        const len = capH * range(r, 0.35, 1.6) * o.drip
        const p: Pt[] = []
        for (let i = 0; i <= 60; i++) p.push([st.x + Math.sin(i / 60 * 2) * st.w * 0.04, st.bottom - st.w * 0.3 + (len + st.w * 0.3) * i / 60])
        taper(ctx, p, needle(st.w * 0.9, 0.01, range(r, 0.8, 1.5)))
        if (r() < 0.3) lozenge(ctx, st.x, st.bottom + len * range(r, 0.35, 0.6), st.w * 0.55)
      }
      if (r() < 0.3 * o.drip) {
        const len = capH * range(r, 0.2, 0.6) * o.drip, p: Pt[] = []
        for (let i = 0; i <= 40; i++) p.push([st.x, st.top + st.w * 0.3 - (len + st.w * 0.3) * i / 40])
        taper(ctx, p, needle(st.w * 0.7, 0.01, 1.2))
      }
    }
    if (o.bar) {
      // barra che attraversa la parola e sporge in aghi ai due lati
      const by = box.y0 + capH * range(r, 0.15, 0.3), ext = (box.x1 - box.x0) * range(r, 0.12, 0.22), bw = Math.max(1.5, capH * 0.05)
      const mid = (box.x0 + box.x1) / 2
      for (const sgn of [-1, 1]) {
        const p: Pt[] = []
        const from = mid, to = sgn < 0 ? box.x0 - ext : box.x1 + ext
        for (let i = 0; i <= 60; i++) p.push([from + (to - from) * i / 60, by])
        taper(ctx, p, t => bw * Math.pow(1 - t, 0.25 + 3 * Math.max(0, t - 0.75)))
      }
    }
  })
}

/**
 * Dal pieno al contorno: tratto di penna largo `lw` lungo il bordo interno. Dove la
 * forma è più stretta di due tratti resta piena (gli aghi). Con `echo` un secondo
 * contorno parallelo più dentro, solo dove la forma è abbastanza larga.
 */
export function outline(m: Mask, lw: number, echo = 0) {
  const d = distance(m)
  const o = newMask(m.w, m.h)
  for (let i = 0; i < d.length; i++) {
    if (!m.a[i]) continue
    let v = Math.min(1, Math.max(0, lw - d[i] + 0.5))
    if (echo > 0) {
      const e = Math.min(1, Math.max(0, lw * 0.5 - Math.abs(d[i] - echo) + 0.5))
      if (e > v) v = e
    }
    o.a[i] = Math.min(m.a[i], v * 255)
  }
  return o
}

/** tremolio della mano: spostamento a bassa frequenza, ampiezza in px */
export function wobble(m: Mask, seed: number, amp: number, scale: number) {
  const nx = noise2(seed), ny = noise2(seed + 1)
  const o = newMask(m.w, m.h)
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const sx = x + nx(x / scale, y / scale) * amp, sy = y + ny(x / scale, y / scale) * amp
    const x0 = Math.floor(sx), y0 = Math.floor(sy)
    if (x0 < 0 || y0 < 0 || x0 >= m.w - 1 || y0 >= m.h - 1) continue
    const fx = sx - x0, fy = sy - y0, i = y0 * m.w + x0
    o.a[y * m.w + x] = (m.a[i] * (1 - fx) + m.a[i + 1] * fx) * (1 - fy) + (m.a[i + m.w] * (1 - fx) + m.a[i + m.w + 1] * fx) * fy
  }
  return o
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
