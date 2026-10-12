/**
 * Testo come elemento grafico: la parola diventa una maschera che si piega
 * (busta: arco, rigonfio, bandiera…), si gonfia o si circonda di contorni.
 * Tutto parte da una sola maschera ben adattata al formato.
 */
import { blurMask, distance, drawMask, fitSize, fontCss, hexRgb, inkBox, makeCanvas, maskToCanvas, newMask, remap, smoothField, smoothstep, type Ctx, type Face, type Mask } from './raster'

export const WARPS = ['Dritto', 'Arco', 'Rigonfio', 'Bandiera', 'Onda', 'Prospettiva', 'Strozzato', 'Ponte'] as const

/** righe impilate e centrate, ogni riga larga uguale (`fat` ingrassa i tratti) */
export function wordMask(W: number, H: number, lines: string[], f: Face, width: number, maxH: number, o: { lead?: number; fat?: number; cy?: number } = {}): Mask {
  const { ctx: m } = makeCanvas(4, 4)
  const strs = lines.map(s => f.upper ? s.toUpperCase() : s)
  const rows = strs.map(s => {
    const size = fitSize(m, s, f, width)
    m.font = fontCss(f, size)
    const mt = m.measureText(s)
    return { s, size, asc: mt.actualBoundingBoxAscent, desc: mt.actualBoundingBoxDescent }
  })
  const lead = o.lead ?? 0.16
  const gap = (i: number) => (i ? Math.min(rows[i].size, rows[i - 1].size) * lead : 0)
  let tot = rows.reduce((a, r, i) => a + r.asc + r.desc + gap(i), 0)
  const k = tot > maxH ? maxH / tot : 1
  tot *= k
  return drawMask(W, H, ctx => {
    let y = (o.cy ?? H / 2) - tot / 2
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'
    rows.forEach((r, i) => {
      y += (gap(i) + r.asc) * k
      const sz = r.size * k
      ctx.font = fontCss(f, sz)
      const c = ctx as Ctx & { letterSpacing?: string }
      if ('letterSpacing' in c) c.letterSpacing = `${(f.track ?? 0) * sz}px`
      ctx.fillText(r.s, W / 2, y)
      if (o.fat) { ctx.lineWidth = sz * o.fat; ctx.strokeStyle = '#fff'; ctx.strokeText(r.s, W / 2, y) }
      y += r.desc * k
    })
  })
}

/** piega la maschera dentro il suo riquadro: ogni forma tiene fermo il centro */
export function warp(m: Mask, kind: number, amt: number): Mask {
  if (!kind || !amt) return m
  const b = inkBox(m)
  if (!b) return m
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, hw = (b.x1 - b.x0) / 2, hh = (b.y1 - b.y0) / 2
  const A = amt
  return remap(m, (x, y) => {
    const u = (x - cx) / hw, v = (y - cy) / hh
    const uu = Math.min(1.2, Math.abs(u))
    switch (kind) {
      case 1: return [x, y + A * hh * 0.9 * (1 - uu * uu)]                          // arco: il centro sale
      case 2: return [x, cy + (y - cy) / (1 + A * 0.7 * (1 - uu * uu))]                // rigonfio
      case 3: return [x, y - A * hh * 0.55 * Math.sin(u * Math.PI)]                    // bandiera
      case 4: return [x + A * hw * 0.03 * Math.sin(v * 3), y - A * hh * 0.42 * Math.sin(u * Math.PI * 2)] // onda
      case 5: { const k = 1 + A * 0.55 * v; return [cx + (x - cx) / k, y] }            // prospettiva: la base si allarga
      case 6: return [x, cy + (y - cy) / Math.max(0.3, 1 - A * 0.45 * (1 - uu * uu))]  // strozzato
      default: return [x, y - A * hh * 0.9 * (1 - uu * uu) * (v < 0 ? 1 : 0.15)]       // ponte: sale solo il bordo alto
    }
  })
}

/**
 * Maschera finale della scritta: la disegna, la piega e, se esce dal riquadro
 * utile, la ridisegna più piccola. `room` è lo spazio da lasciare attorno per
 * contorni ed estrusione.
 */
export function fittedWord(W: number, H: number, lines: string[], f: Face, kind: number, amt: number, o: { room: number; fat?: number; lead?: number; boxW?: number; boxH?: number }): Mask {
  const bw = (o.boxW ?? W * 0.84) - o.room * 2, bh = (o.boxH ?? H * 0.8) - o.room * 2
  let width = bw, m = newMask(W, H)
  for (let i = 0; i < 3; i++) {
    m = warp(wordMask(W, H, lines, f, width, bh / (1 + amt * 0.6), { fat: o.fat, lead: o.lead }), kind, amt)
    const b = inkBox(m)
    if (!b) return m
    const k = Math.min(bw / (b.x1 - b.x0 + 1), bh / (b.y1 - b.y0 + 1))
    if (k >= 0.985 && i) break
    if (k >= 1 && !i) break
    width *= Math.min(1, k) * 0.99
  }
  // centra davvero l'inchiostro (le lettere hanno pance e code diverse)
  const b = inkBox(m)!
  const dx = Math.round(W / 2 - (b.x0 + b.x1) / 2), dy = Math.round(H / 2 - (b.y0 + b.y1) / 2)
  if (!dx && !dy) return m
  const out = newMask(W, H)
  for (let y = 0; y < H; y++) { const sy = y - dy; if (sy < 0 || sy >= H) continue; for (let x = 0; x < W; x++) { const sx = x - dx; if (sx >= 0 && sx < W) out.a[y * W + x] = m.a[sy * W + sx] } }
  return out
}

export const invert = (m: Mask): Mask => { const o = newMask(m.w, m.h); for (let i = 0; i < m.a.length; i++) o.a[i] = 255 - m.a[i]; return o }

/** fascia [d0, d1) della distanza, con bordi antialias */
export function band(d: Float32Array, W: number, H: number, d0: number, d1: number): Mask {
  const o = newMask(W, H)
  for (let i = 0; i < d.length; i++) o.a[i] = smoothstep(d0 - 0.6, d0 + 0.6, d[i]) * (1 - smoothstep(d1 - 0.6, d1 + 0.6, d[i])) * 255
  return o
}

/** tutto ciò che sta entro `r` pixel dall'inchiostro (dilatazione tonda) */
export function grow(outside: Float32Array, m: Mask, r: number): Mask {
  const o = newMask(m.w, m.h)
  for (let i = 0; i < outside.length; i++) o.a[i] = m.a[i] > 127 ? 255 : (1 - smoothstep(r - 0.7, r + 0.7, outside[i])) * 255
  return o
}

/** estrusione piena: la sagoma ripetuta lungo la diagonale, come un blocco */
export function extrude(ctx: Ctx, m: Mask, color: string, dx: number, dy: number) {
  const src = maskToCanvas(m, color), n = Math.ceil(Math.hypot(dx, dy))
  for (let i = n; i >= 1; i--) ctx.drawImage(src, (dx * i) / n, (dy * i) / n)
}

/**
 * Lettere gonfie: altezza a cupola (profilo circolare) dalla distanza dal bordo,
 * levigata, poi luce con riflesso lucido stretto e un secondo riflesso morbido.
 */
export function puffy(m: Mask, R: number, color: string, gloss: number) {
  const W = m.w, H = m.h, d = distance(m)
  const h = new Float32Array(W * H)
  for (let i = 0; i < h.length; i++) { if (!m.a[i]) continue; const t = Math.min(1, d[i] / R); h[i] = Math.sqrt(1 - (1 - t) * (1 - t)) * R }
  const hs = smoothField(h, W, H, R * 0.12, 2)
  const [cr, cg, cb] = hexRgb(color).map(v => v / 255)
  const { c, ctx } = makeCanvas(W, H)
  const img = ctx.createImageData(W, H), px = img.data
  const L = norm([-0.45, -0.7, 0.55]), Hv = norm([L[0], L[1], L[2] + 1])
  const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, a = m.a[i]
    if (!a) continue
    const gx = (hs[i + 1] - hs[i - 1]) * 0.5, gy = (hs[i + W] - hs[i - W]) * 0.5
    const n = norm([-gx, -gy, 1])
    const diff = sat(n[0] * L[0] + n[1] * L[1] + n[2] * L[2])
    const nh = sat(n[0] * Hv[0] + n[1] * Hv[1] + n[2] * Hv[2])
    const spec = Math.pow(nh, 90) * gloss + Math.pow(nh, 14) * gloss * 0.22
    // luce di rimbalzo dal basso: le pance non diventano mai nere
    const bounce = sat(n[1]) * 0.18
    const rim = Math.pow(1 - n[2], 3) * 0.25
    const lit = 0.42 + 0.58 * diff + bounce - rim
    px[i * 4] = sat(cr * lit + spec) * 255; px[i * 4 + 1] = sat(cg * lit + spec) * 255; px[i * 4 + 2] = sat(cb * lit + spec) * 255; px[i * 4 + 3] = a
  }
  ctx.putImageData(img, 0, 0)
  return c
}

function norm(v: number[]) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l] }

/** ombra morbida sotto un pezzo in rilievo */
export function softShadow(ctx: Ctx, m: Mask, S: number, k = 1, color = '#000000', alpha = 0.3) {
  ctx.save(); ctx.globalAlpha = alpha
  ctx.drawImage(maskToCanvas(blurMask(m, S * 0.014 * k), color), S * 0.004 * k, S * 0.016 * k)
  ctx.restore()
}
