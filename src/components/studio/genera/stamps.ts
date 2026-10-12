/**
 * Timbri e adesivi.
 *
 * Timbro: si costruisce come un timbro di gomma vero (anelli, testo che corre sul
 * cerchio, stelline separatrici, parola centrale tra due filetti) e poi lo si
 * "stampa": la gomma arrotonda gli spigoli, la pressione non è mai uniforme (un
 * lato più scarico, chiazze larghe), la carta lascia la sua grana, il bordo del
 * segno trattiene più inchiostro, qualche bollicina d'aria resta bianca.
 *
 * Adesivo: il contenuto viene fustellato con un margine bianco morbido (le conche
 * strette si chiudono come fa la lama del plotter), con ombra di contatto, filo
 * grigio sul taglio e finitura lucida, opaca o olografica.
 */
import { blurMask, distance, drawMask, fbm, fitSize, fontCss, hexRgb, liquid, makeCanvas, maskToCanvas, newMask, noise2, range, rng, smoothField, text, type Ctx, type Face, type Mask } from './raster'

const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (a: number, b: number, x: number) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t) }

// ─── testo su cerchio ────────────────────────────────────────────────────────

/**
 * Scrive `s` lungo un cerchio di raggio R centrato su `mid`. In alto (`top`) le
 * lettere poggiano sul cerchio e crescono verso l'esterno; in basso si leggono
 * comunque da sinistra a destra, con la testa verso il centro.
 */
export function arcText(ctx: Ctx, s: string, cx: number, cy: number, R: number, f: Face, size: number, top: boolean, track = 0.12) {
  const str = f.upper ? s.toUpperCase() : s
  ctx.font = fontCss(f, size)
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  const sp = size * track
  const ws = [...str].map(ch => ctx.measureText(ch).width + sp)
  const tot = ws.reduce((a, b) => a + b, 0) - sp
  const mid = top ? -Math.PI / 2 : Math.PI / 2
  let acc = 0
  ;[...str].forEach((ch, i) => {
    const off = (acc + (ws[i] - sp) / 2 - tot / 2) / R
    const a = top ? mid + off : mid - off
    ctx.save()
    ctx.translate(cx + Math.cos(a) * R, cy + Math.sin(a) * R)
    ctx.rotate(top ? a + Math.PI / 2 : a - Math.PI / 2)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
    acc += ws[i]
  })
  return tot / R
}

/** stella a cinque punte piena */
export function star(ctx: Ctx, x: number, y: number, r: number, rot = -Math.PI / 2, inner = 0.42) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5, rr = i % 2 ? r * inner : r
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath(); ctx.fill()
}

/** corpo che porta la parola alla larghezza voluta, mai oltre maxH */
function sizeFor(s: string, f: Face, width: number, maxH: number) {
  const { ctx: m } = makeCanvas(4, 4)
  return Math.min(fitSize(m, f.upper ? s.toUpperCase() : s, f, width), maxH)
}
/** altezza delle maiuscole rispetto al corpo (misurata, non stimata) */
function capH(f: Face, size: number) {
  const { ctx: m } = makeCanvas(4, 4)
  m.font = fontCss(f, size)
  return m.measureText('H').actualBoundingBoxAscent || size * 0.72
}
/**
 * Pila verticale centrata: righe di testo e filetti, ognuno con la sua altezza e
 * il suo spazio sotto. Nessuna sovrapposizione: le posizioni nascono dalle misure.
 */
type Row = { kind: 'text'; s: string; f: Face; size: number } | { kind: 'rule'; w: number; lw: number }
function stack(ctx: Ctx, rows: Row[], cx: number, cy: number, gap: number) {
  const hs = rows.map(r => (r.kind === 'text' ? capH(r.f, r.size) : r.lw))
  const tot = hs.reduce((a, b) => a + b, 0) + gap * (rows.length - 1)
  let y = cy - tot / 2
  rows.forEach((r, i) => {
    if (r.kind === 'text') text(ctx, r.s, cx, y + hs[i], r.f, r.size, 'center')
    else { ctx.lineWidth = r.lw; ctx.beginPath(); ctx.moveTo(cx - r.w / 2, y + r.lw / 2); ctx.lineTo(cx + r.w / 2, y + r.lw / 2); ctx.stroke() }
    y += hs[i] + gap
  })
}

export interface StampText { top: string; bottom: string; center: string; small: string }
export interface StampFaces { ring: Face; center: Face; small: Face }

/**
 * Disegna la matrice del timbro (pieno = gomma). `S` è il lato utile.
 * Forme: 0 cerchio, 1 sigillo dentellato, 2 rettangolo, 3 ovale.
 */
export function stampPlate(ctx: Ctx, kind: number, cx: number, cy: number, S: number, t: StampText, f: StampFaces, weight: number) {
  const lw = S * 0.011 * weight
  ctx.lineJoin = 'round'
  if (kind === 0 || kind === 1) {
    const R = S * 0.44
    // bordo: anello pieno, o festone di sigillo
    if (kind === 0) {
      ctx.lineWidth = lw * 1.6
      ctx.beginPath(); ctx.arc(cx, cy, R - lw * 0.8, 0, Math.PI * 2); ctx.stroke()
    } else {
      const n = 36, depth = S * 0.018
      ctx.beginPath()
      for (let i = 0; i <= 720; i++) {
        const a = i / 720 * Math.PI * 2, rr = R - depth * (0.5 - 0.5 * Math.cos(a * n))
        if (i) ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
      }
      ctx.closePath()
      ctx.lineWidth = lw * 1.2; ctx.stroke()
    }
    const r1 = R - lw * 3.2, r2 = R * 0.66
    ctx.lineWidth = lw * 0.55
    ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.stroke()
    // testo nella fascia tra i due anelli, centrato in altezza
    const band = r1 - r2, size = band * 0.5
    const baseTop = r2 + (band - size * 0.72) / 2
    const spanT = t.top ? arcText(ctx, t.top, cx, cy, baseTop, f.ring, size, true) : 0
    const baseBot = r1 - (band - size * 0.72) / 2
    const spanB = t.bottom ? arcText(ctx, t.bottom, cx, cy, baseBot, f.ring, size, false) : 0
    // stelline a metà tra i due testi, a sinistra e a destra
    const free = (Math.PI * 2 - spanT - spanB) / 2
    if (free > 0.25) for (const sgn of [-1, 1]) {
      const a = sgn < 0 ? Math.PI : 0
      star(ctx, cx + Math.cos(a) * (r2 + band / 2), cy + Math.sin(a) * (r2 + band / 2), size * 0.34)
    }
    // centro: filetto, parola, filetto, riga piccola: una pila misurata
    const cw = r2 * 1.5
    const big = sizeFor(t.center, f.center, cw, r2 * 0.46)
    const rows: Row[] = [{ kind: 'rule', w: cw * 0.86, lw: lw * 0.5 }, { kind: 'text', s: t.center, f: f.center, size: big }, { kind: 'rule', w: cw * 0.86, lw: lw * 0.5 }]
    if (t.small) rows.push({ kind: 'text', s: t.small, f: f.small, size: sizeFor(t.small, f.small, r2 * 0.8, r2 * 0.13) })
    stack(ctx, rows, cx, cy, r2 * 0.09)
    return
  }
  // rettangolo / ovale: righe orizzontali
  const w = S * 0.9, h = S * (kind === 2 ? 0.5 : 0.56)
  ctx.lineWidth = lw * 1.5
  if (kind === 2) {
    const rr = S * 0.02
    ctx.beginPath(); ctx.roundRect(cx - w / 2 + lw, cy - h / 2 + lw, w - lw * 2, h - lw * 2, rr); ctx.stroke()
    ctx.lineWidth = lw * 0.5
    ctx.beginPath(); ctx.roundRect(cx - w / 2 + lw * 3.4, cy - h / 2 + lw * 3.4, w - lw * 6.8, h - lw * 6.8, rr * 0.6); ctx.stroke()
  } else {
    ctx.beginPath(); ctx.ellipse(cx, cy, w / 2 - lw, h / 2 - lw, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = lw * 0.5
    ctx.beginPath(); ctx.ellipse(cx, cy, w / 2 - lw * 3.4, h / 2 - lw * 3.4, 0, 0, Math.PI * 2); ctx.stroke()
  }
  const inner = kind === 2 ? w * 0.74 : w * 0.6
  const smallH = h * 0.085
  const rows: Row[] = []
  if (t.top) rows.push({ kind: 'text', s: t.top, f: f.ring, size: sizeFor(t.top, f.ring, inner * 0.78, smallH) })
  rows.push({ kind: 'rule', w: inner, lw: lw * 0.5 })
  rows.push({ kind: 'text', s: t.center, f: f.center, size: sizeFor(t.center, f.center, inner, h * 0.3) })
  rows.push({ kind: 'rule', w: inner, lw: lw * 0.5 })
  const bl = [t.bottom, t.small].filter(Boolean).join(' · ')
  if (bl) rows.push({ kind: 'text', s: bl, f: f.small, size: sizeFor(bl, f.small, inner * 0.7, smallH) })
  stack(ctx, rows, cx, cy, h * 0.055)
  for (const sgn of [-1, 1]) star(ctx, cx + sgn * (inner / 2 + h * 0.07), cy, h * 0.04)
}

/**
 * Stampa la matrice: gomma che arrotonda, pressione a chiazze con un lato più
 * scarico, grana della carta, bordo più carico, bolle d'aria. Ritorna l'alpha.
 */
export function inkPress(plate: Mask, seed: number, S: number, wear: number, o: { tilt?: number } = {}) {
  const W = plate.w, H = plate.h
  const soft = liquid(plate, Math.max(0.6, S * 0.0012), 0.5, 0.08)
  const d = distance(soft)
  const nP = noise2(seed), nG = noise2(seed + 3), nF = noise2(seed + 5)
  const r = rng(seed + 9)
  // lato scarico: la mano non preme mai dritta
  const ta = r() * Math.PI * 2, tx = Math.cos(ta), ty = Math.sin(ta), tilt = o.tilt ?? 0.5
  // bolle d'aria: piccoli vuoti tondi
  const bubbles = drawMask(W, H, ctx => {
    const n = Math.round(30 + 160 * wear)
    for (let i = 0; i < n; i++) {
      const rad = S * range(r, 0.0012, 0.0055) * (r() < 0.1 ? 2.2 : 1)
      ctx.beginPath(); ctx.arc(r() * W, r() * H, rad, 0, Math.PI * 2); ctx.fill()
    }
  })
  const out = newMask(W, H)
  const kP = 1 / (S * 0.22), kG = 1 / (S * 0.006), kF = 1 / (S * 0.0022)
  const rimW = S * 0.005
  const thr = -0.35 + 0.75 * wear
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    const a = soft.a[i]
    if (!a) continue
    const press = fbm(nP, x * kP, y * kP, 3)
    const grain = nG(x * kG, y * kG) * 0.6 + nF(x * kF, y * kF) * 0.4
    const side = ((x - W / 2) * tx + (y - H / 2) * ty) / S * tilt
    const rim = 1 - smooth(0, rimW, d[i])
    const v = press * 0.75 + grain * 0.32 + rim * 0.35 - side
    // soglia morbida ma stretta: bordi del vuoto netti, non sfocati
    const keep = smooth(thr - 0.035, thr + 0.035, v)
    const dens = 0.78 + 0.22 * smooth(-0.3, 0.5, press) + rim * 0.1
    out.a[i] = a * keep * Math.min(1, dens) * (1 - bubbles.a[i] / 255)
  }
  return out
}

// ─── adesivo ─────────────────────────────────────────────────────────────────

/**
 * Fustella: margine di `border` px attorno al contenuto; le conche più strette di
 * `round` si chiudono (la lama non entra negli angoli interni). Ritorna la sagoma.
 */
export function dieCut(content: Mask, border: number, round: number) {
  const W = content.w, H = content.h
  const comp = newMask(W, H)
  for (let i = 0; i < comp.a.length; i++) comp.a[i] = 255 - content.a[i]
  const dOut = distance(comp)
  const R = border + round
  const dil = newMask(W, H)
  for (let i = 0; i < dil.a.length; i++) dil.a[i] = content.a[i] > 127 ? 255 : sat(R - dOut[i] + 0.5) * 255
  const e = distance(dil)
  const cut = newMask(W, H)
  for (let i = 0; i < cut.a.length; i++) cut.a[i] = Math.max(content.a[i], sat(e[i] - round + 0.5) * 255)
  return cut
}

export type Finish = 'lucida' | 'opaca' | 'olografica'

/** compone l'adesivo: ombra, sagoma bianca, contenuto, finitura, filo del taglio */
export function stickerCanvas(cut: Mask, layers: { mask: Mask; color: string; dx?: number; dy?: number }[], S: number, o: { paper: string; finish: Finish; shadow: boolean; seed: number }) {
  const W = cut.w, H = cut.h
  const { c, ctx } = makeCanvas(W, H)
  if (o.shadow) {
    ctx.save(); ctx.globalAlpha = 0.22
    ctx.drawImage(maskToCanvas(blurMask(cut, S * 0.012), '#000000'), S * 0.004, S * 0.01)
    ctx.globalAlpha = 0.18
    ctx.drawImage(maskToCanvas(blurMask(cut, S * 0.003), '#000000'), S * 0.001, S * 0.003)
    ctx.restore()
  }
  const sticker = makeCanvas(W, H)
  sticker.ctx.drawImage(maskToCanvas(cut, o.paper), 0, 0)
  if (o.finish === 'olografica') {
    // arcobaleno tenue che scorre in diagonale, solo sul bordo bianco
    const g = sticker.ctx.createLinearGradient(0, 0, W, H)
    const r = rng(o.seed)
    const off = r()
    for (let i = 0; i <= 12; i++) g.addColorStop(i / 12, `hsl(${Math.round((off + i / 6) * 360) % 360} 85% 72%)`)
    sticker.ctx.save(); sticker.ctx.globalCompositeOperation = 'source-atop'; sticker.ctx.globalAlpha = 0.6
    sticker.ctx.fillStyle = g; sticker.ctx.fillRect(0, 0, W, H); sticker.ctx.restore()
  }
  for (const l of layers) sticker.ctx.drawImage(maskToCanvas(l.mask, l.color), l.dx ?? 0, l.dy ?? 0)
  // filo del taglio: un'ombra sottilissima sul bordo, la carta ha uno spessore
  const d = distance(cut)
  const edge = newMask(W, H)
  for (let i = 0; i < edge.a.length; i++) if (cut.a[i]) edge.a[i] = cut.a[i] * sat(1 - d[i] / Math.max(1, S * 0.0018)) * 0.5
  sticker.ctx.drawImage(maskToCanvas(edge, '#000000', 0.35), 0, 0)
  if (o.finish !== 'opaca') {
    // riflesso: una banda larga e morbida più una sottile, in diagonale
    const g = sticker.ctx.createLinearGradient(W * 0.15, 0, W * 0.85, H)
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.34, 'rgba(255,255,255,0)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.32)'); g.addColorStop(0.47, 'rgba(255,255,255,0.05)')
    g.addColorStop(0.53, 'rgba(255,255,255,0.18)'); g.addColorStop(0.56, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    sticker.ctx.save(); sticker.ctx.globalCompositeOperation = 'source-atop'; sticker.ctx.globalAlpha = o.finish === 'olografica' ? 0.5 : 1
    sticker.ctx.fillStyle = g; sticker.ctx.fillRect(0, 0, W, H); sticker.ctx.restore()
  }
  ctx.drawImage(sticker.c, 0, 0)
  return c
}

/** stella a raggi per bollini (starburst), raggi alterni */
export function burst(ctx: Ctx, cx: number, cy: number, R: number, n: number, inner = 0.84) {
  ctx.beginPath()
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? R * inner : R
    if (i) ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
  }
  ctx.closePath(); ctx.fill()
}

// ─── rilievo: da un campo di altezze a una superficie illuminata ─────────────

/**
 * Luce da in alto a sinistra su un campo di altezze: diffusa morbida, riflesso
 * stretto (cera, plastica) e un'occlusione nelle conche. `gloss` 0..1.
 */
export function relief(h: Float32Array, alpha: Mask, color: string, o: { gloss: number; k?: number; amb?: number }) {
  const W = alpha.w, H = alpha.h
  const [cr, cg, cb] = hexRgb(color).map(v => v / 255)
  const { c, ctx } = makeCanvas(W, H)
  const img = ctx.createImageData(W, H), d = img.data
  const k = o.k ?? 1, amb = o.amb ?? 0.32
  const L = [-0.5, -0.62, 0.6], ll = Math.hypot(L[0], L[1], L[2]); L[0] /= ll; L[1] /= ll; L[2] /= ll
  const Hv = [L[0], L[1], L[2] + 1], hl = Math.hypot(Hv[0], Hv[1], Hv[2]); Hv[0] /= hl; Hv[1] /= hl; Hv[2] /= hl
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, a = alpha.a[i]
    if (!a) continue
    const dx = (h[i + 1] - h[i - 1]) * 0.5 * k, dy = (h[i + W] - h[i - W]) * 0.5 * k
    let nx = -dx, ny = -dy, nz = 1
    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl
    const diff = sat(nx * L[0] + ny * L[1] + nz * L[2])
    const spec = Math.pow(sat(nx * Hv[0] + ny * Hv[1] + nz * Hv[2]), 70) * o.gloss
    const sheen = Math.pow(sat(nx * Hv[0] + ny * Hv[1] + nz * Hv[2]), 12) * o.gloss * 0.18
    const lit = amb + (1 - amb) * diff
    d[i * 4] = sat(cr * lit + spec + sheen) * 255; d[i * 4 + 1] = sat(cg * lit + spec + sheen) * 255; d[i * 4 + 2] = sat(cb * lit + spec + sheen) * 255
    d[i * 4 + 3] = a
  }
  ctx.putImageData(img, 0, 0)
  return c
}

/** ombra portata morbida di una sagoma */
export function castShadow(ctx: Ctx, m: Mask, S: number, strength = 0.35, lift = 1) {
  ctx.save()
  ctx.globalAlpha = strength
  ctx.drawImage(maskToCanvas(blurMask(m, S * 0.012 * lift), '#000000'), S * 0.006 * lift, S * 0.012 * lift)
  ctx.globalAlpha = strength * 0.8
  ctx.drawImage(maskToCanvas(blurMask(m, S * 0.0025), '#000000'), S * 0.001, S * 0.003)
  ctx.restore()
}

// ─── ceralacca ───────────────────────────────────────────────────────────────

/**
 * Sigillo di ceralacca: una colata dal bordo irregolare, alta e tonda ai margini,
 * con al centro l'impronta del sigillo (conca piatta, bordino rialzato, monogramma
 * e anello di puntini in rilievo).
 */
export function waxSeal(W: number, H: number, cx: number, cy: number, R: number, seed: number, mono: string, f: Face, color: string, o: { ring: string; gloss: number }) {
  const n = noise2(seed), r = rng(seed)
  // colata: raggio che ondeggia piano, con due o tre lingue più lunghe
  const lobes = Array.from({ length: 2 + Math.floor(r() * 3) }, () => ({ a: r() * Math.PI * 2, w: range(r, 0.15, 0.35), l: range(r, 0.06, 0.16) }))
  const blob = drawMask(W, H, ctx => {
    ctx.beginPath()
    for (let i = 0; i <= 360; i++) {
      const a = i / 360 * Math.PI * 2
      let rr = R * (1 + 0.07 * fbm(n, Math.cos(a) * 1.6 + 3, Math.sin(a) * 1.6 + 3, 3) + 0.018 * n(Math.cos(a) * 9, Math.sin(a) * 9))
      for (const lb of lobes) { const da = Math.atan2(Math.sin(a - lb.a), Math.cos(a - lb.a)); rr += R * lb.l * Math.exp(-(da * da) / (lb.w * lb.w)) }
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y)
    }
    ctx.closePath(); ctx.fill()
  })
  const dist = distance(blob)
  const r0 = R * 0.7
  // impronta: monogramma e anello di puntini, ammorbiditi come metallo premuto nella cera
  const emb = blurMask(drawMask(W, H, ctx => {
    const { ctx: m } = makeCanvas(4, 4)
    const sz = Math.min(fitSize(m, f.upper ? mono.toUpperCase() : mono, f, r0 * 1.15), r0 * 1.1)
    m.font = fontCss(f, sz)
    const asc = m.measureText(f.upper ? mono.toUpperCase() : mono).actualBoundingBoxAscent || sz * 0.7
    text(ctx, mono, cx, cy + asc / 2, f, sz, 'center')
    if (o.ring) arcText(ctx, o.ring, cx, cy, r0 * 0.8, FACE_RING, r0 * 0.11, true, 0.25)
    const nd = 44
    for (let i = 0; i < nd; i++) { const a = i / nd * Math.PI * 2; if (o.ring && Math.sin(a) < -0.25) continue; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r0 * 0.86, cy + Math.sin(a) * r0 * 0.86, r0 * 0.022, 0, Math.PI * 2); ctx.fill() }
  }), R * 0.006)
  const h = new Float32Array(W * H)
  const edge = R * 0.22, top = R * 0.16, dep = R * 0.07
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (!blob.a[i]) continue
    const t = Math.min(1, dist[i] / edge)
    let z = top * Math.sqrt(1 - (1 - t) * (1 - t))
    const rc = Math.hypot(x - cx, y - cy)
    // conca del sigillo con bordino: il metallo spinge la cera fuori e la alza
    const inside = 1 - smooth(r0 - R * 0.02, r0 + R * 0.02, rc)
    const lip = Math.exp(-((rc - r0 - R * 0.04) ** 2) / (2 * (R * 0.035) ** 2))
    z += -dep * inside + dep * 0.55 * lip
    z += dep * 0.75 * (emb.a[i] / 255) * inside
    z += R * 0.0015 * n(x / (R * 0.09), y / (R * 0.09))
    h[i] = z
  }
  const hs = smoothField(h, W, H, Math.max(1, R * 0.008), 1)
  return { blob, canvas: relief(hs, blob, color, { gloss: o.gloss, k: 1, amb: 0.28 }) }
}
const FACE_RING: Face = { family: 'Geist Mono', weight: 500, upper: true, track: 0.1 }

// ─── toppa ricamata ──────────────────────────────────────────────────────────

/** forme della toppa come poligono chiuso */
export function patchShape(kind: number, cx: number, cy: number, S: number): [number, number][] {
  const pts: [number, number][] = []
  if (kind === 0) { const R = S * 0.42; for (let i = 0; i < 240; i++) { const a = i / 240 * Math.PI * 2; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]) } }
  else if (kind === 1) {
    // scudo: lati dritti che si chiudono in un arco a punta
    const w = S * 0.4, top = cy - S * 0.42, mid = cy + S * 0.05, bot = cy + S * 0.44
    for (let i = 0; i <= 40; i++) pts.push([cx - w + 2 * w * i / 40, top + Math.sin(Math.PI * i / 40) * -S * 0.02])
    for (let i = 0; i <= 30; i++) pts.push([cx + w, top + (mid - top) * i / 30])
    for (let i = 0; i <= 60; i++) { const t = i / 60; pts.push([cx + w * (1 - t) * Math.cos(t * Math.PI / 2) ** 0.4, mid + (bot - mid) * Math.sin(t * Math.PI / 2)]) }
    for (let i = 0; i <= 60; i++) { const t = 1 - i / 60; pts.push([cx - w * (1 - t) * Math.cos(t * Math.PI / 2) ** 0.4, mid + (bot - mid) * Math.sin(t * Math.PI / 2)]) }
    for (let i = 0; i <= 30; i++) pts.push([cx - w, mid - (mid - top) * i / 30])
  } else {
    // nastro con angoli tondi (rettangolo largo)
    const w = S * 0.46, h = S * 0.22, rr = h * 0.5
    for (let i = 0; i < 60; i++) { const a = -Math.PI / 2 + i / 59 * Math.PI; pts.push([cx + w - rr + Math.cos(a) * rr, cy + Math.sin(a) * h]) }
    for (let i = 0; i < 60; i++) { const a = Math.PI / 2 + i / 59 * Math.PI; pts.push([cx - w + rr + Math.cos(a) * rr, cy + Math.sin(a) * h]) }
  }
  return pts
}

/**
 * Toppa: fondo a punto pieno con i fili tutti nella stessa direzione, bordo
 * "merrow" (punti fitti perpendicolari al contorno, in rilievo), scritta ricamata
 * con i fili inclinati diversamente, leggero gonfiore e ombra.
 */
export function embroidery(W: number, H: number, S: number, poly: [number, number][], label: Mask, seed: number, c: { base: string; border: string; thread: string }) {
  const shape = drawMask(W, H, ctx => { ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill() })
  const d = distance(shape)
  const band = S * 0.03
  const nT = noise2(seed)
  const pitch = Math.max(1.6, S * 0.0032)
  // altezza: cuscino morbido, bordo più alto (cordoncino), scritta rialzata
  const lab = blurMask(label, S * 0.0015)
  const h = new Float32Array(W * H)
  const val = new Float32Array(W * H)       // 0 fondo, 1 bordo, 2 scritta
  const thr = new Float32Array(W * H)       // modulazione del filo
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (!shape.a[i]) continue
    const dd = d[i]
    const inBand = dd < band
    const L = lab.a[i] / 255
    let z = S * 0.012 * Math.min(1, dd / (S * 0.05))
    let t: number
    if (inBand) {
      // cordoncino: sezione tonda, fili perpendicolari al bordo (lungo la distanza)
      const u = dd / band
      z = S * 0.02 * Math.sin(Math.PI * Math.min(1, u * 1.02)) + S * 0.004
      // posizione lungo il bordo: angolo attorno al centro della sagoma
      const ang = Math.atan2(y - H / 2, x - W / 2)
      const s = ang * S * 0.42 / pitch
      t = 0.5 + 0.5 * Math.cos(s * Math.PI * 2 * 0.5)
      val[i] = 1
    } else if (L > 0.5) {
      z += S * 0.008 * L
      t = 0.5 + 0.5 * Math.sin((x * 0.8 - y * 0.6) / pitch * Math.PI + nT(x / 30, y / 30) * 2)
      val[i] = 2
    } else {
      t = 0.5 + 0.5 * Math.sin((x * 0.6 + y * 0.8) / pitch * Math.PI + nT(x / 40, y / 40) * 1.5)
      val[i] = 0
    }
    thr[i] = t
    h[i] = z + t * S * 0.0016
  }
  const hs = smoothField(h, W, H, 0.8, 1)
  const out = makeCanvas(W, H)
  const cols = [c.base, c.border, c.thread].map(hexRgb)
  const img = out.ctx.createImageData(W, H), px = img.data
  const L = [-0.5, -0.62, 0.6], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x
    if (!shape.a[i]) continue
    const dx = (hs[i + 1] - hs[i - 1]) * 0.5, dy = (hs[i + W] - hs[i - W]) * 0.5
    let nx = -dx, ny = -dy, nz = 1
    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl
    const diff = sat(nx * L[0] + ny * L[1] + nz * L[2])
    const sheen = Math.pow(sat(nx * L[0] + ny * L[1] + (nz + 1) * L[2] / 2), 8) * 0.25 * thr[i]
    const col = cols[val[i]]
    const lit = (0.42 + 0.68 * diff) * (0.82 + 0.18 * thr[i])
    px[i * 4] = sat(col[0] / 255 * lit + sheen) * 255; px[i * 4 + 1] = sat(col[1] / 255 * lit + sheen) * 255; px[i * 4 + 2] = sat(col[2] / 255 * lit + sheen) * 255
    px[i * 4 + 3] = shape.a[i]
  }
  out.ctx.putImageData(img, 0, 0)
  return { shape, canvas: out.c }
}

// ─── biglietto ───────────────────────────────────────────────────────────────

/** codice a barre (Code-like: barre di 1–4 moduli, casuali ma con quiete ai lati) */
export function barcode(ctx: Ctx, r: () => number, x: number, y: number, w: number, h: number) {
  const mod = w / 95
  let cx = x
  while (cx < x + w - mod * 4) {
    const bw = mod * (1 + Math.floor(r() * 3)), gap = mod * (1 + Math.floor(r() * 3))
    ctx.fillRect(cx, y, bw, h); cx += bw + gap
  }
}

/**
 * Biglietto d'ingresso: corpo e matrice divisi dalla perforazione, due tacche
 * tonde ai lati, cornice sottile, titolo grande, righe di dati in mono,
 * numerazione ruotata sulla matrice, codice a barre.
 */
export function ticketMasks(W: number, H: number, cx: number, cy: number, S: number, seed: number, t: { title: string; sub: string; date: string; place: string; num: string }, f: { title: Face; mono: Face }) {
  const r = rng(seed)
  const w = S * 0.94, h = S * 0.42, x0 = cx - w / 2, y0 = cy - h / 2
  const stubX = x0 + w * 0.76, notch = h * 0.075, rr = S * 0.012
  const body = drawMask(W, H, ctx => {
    ctx.beginPath(); ctx.roundRect(x0, y0, w, h, rr); ctx.fill()
    ctx.globalCompositeOperation = 'destination-out'
    for (const yy of [y0, y0 + h]) { ctx.beginPath(); ctx.arc(stubX, yy, notch, 0, Math.PI * 2); ctx.fill() }
    // perforazione: fori piccoli in colonna
    const nh = 18
    for (let i = 1; i < nh; i++) { ctx.beginPath(); ctx.arc(stubX, y0 + notch + (h - 2 * notch) * i / nh, S * 0.0035, 0, Math.PI * 2); ctx.fill() }
  })
  const ink = drawMask(W, H, ctx => {
    const m = S * 0.03
    ctx.lineWidth = Math.max(1, S * 0.0022)
    ctx.beginPath(); ctx.roundRect(x0 + m, y0 + m, stubX - x0 - m * 1.6, h - 2 * m, rr * 0.5); ctx.stroke()
    ctx.beginPath(); ctx.roundRect(stubX + m * 0.6, y0 + m, x0 + w - stubX - m * 1.6, h - 2 * m, rr * 0.5); ctx.stroke()
    const bx = x0 + m * 2.2, bw = stubX - x0 - m * 4.4
    const { ctx: mm } = makeCanvas(4, 4)
    const smallS = h * 0.055
    text(ctx, t.sub, bx, y0 + m * 2 + smallS, f.mono, smallS, 'left')
    const tsz = Math.min(fitSize(mm, f.title.upper ? t.title.toUpperCase() : t.title, f.title, bw), h * 0.36)
    const tY = y0 + h * 0.58
    text(ctx, t.title, bx, tY, f.title, tsz, 'left')
    ctx.fillRect(bx, tY + h * 0.06, bw, Math.max(1, S * 0.0016))
    text(ctx, t.date, bx, y0 + h - m * 2.1, f.mono, smallS, 'left')
    text(ctx, t.place, bx + bw, y0 + h - m * 2.1, f.mono, smallS, 'right')
    // matrice: numero ruotato e codice a barre
    const sx = stubX + m * 1.4, sw = x0 + w - stubX - m * 3
    ctx.save(); ctx.translate(sx + sw * 0.5, y0 + h * 0.3); ctx.rotate(-Math.PI / 2)
    text(ctx, 'N° ' + t.num, 0, smallS * 0.4, f.mono, smallS * 1.05, 'center'); ctx.restore()
    barcode(ctx, r, sx, y0 + h * 0.52, sw, h * 0.3)
  })
  return { body, ink }
}

// ─── nastro adesivo ──────────────────────────────────────────────────────────

/** striscia di nastro con i due capi strappati a zig-zag irregolare */
export function tapeStrip(W: number, H: number, cx: number, cy: number, len: number, wid: number, ang: number, seed: number) {
  const r = rng(seed)
  const torn = (sgn: number) => {
    const pts: [number, number][] = [], n = 14
    for (let i = 0; i <= n; i++) { const v = -wid / 2 + wid * i / n; pts.push([sgn * len / 2 + sgn * (r() - 0.5) * wid * 0.12 + (i % 2 ? sgn * wid * 0.03 : 0), v]) }
    return pts
  }
  const right = torn(1), left = torn(-1).reverse()
  return drawMask(W, H, ctx => {
    ctx.translate(cx, cy); ctx.rotate(ang)
    ctx.beginPath(); ctx.moveTo(-len / 2, -wid / 2)
    for (const p of right) ctx.lineTo(p[0], p[1])
    for (const p of left) ctx.lineTo(p[0], p[1])
    ctx.closePath(); ctx.fill()
  })
}
