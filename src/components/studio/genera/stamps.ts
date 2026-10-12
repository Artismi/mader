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
import { blurMask, distance, drawMask, fbm, fitSize, fontCss, liquid, makeCanvas, maskToCanvas, newMask, noise2, range, rng, text, type Ctx, type Face, type Mask } from './raster'

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
