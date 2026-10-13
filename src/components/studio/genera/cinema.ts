/**
 * Post-produzione da locandina cinematografica, a strati: luce d'ambiente,
 * fasci, nebbia, riflesso sul pavimento, poi sull'immagine finita bloom,
 * alone rosso (halation), aberrazione cromatica, viraggio ombre/luci, curva a
 * S, vignettatura e grana di pellicola. Ogni passo è dosato: il look nasce
 * dalla somma, nessuno deve vedersi da solo.
 */
import { hexRgb, makeCanvas, rng, type Ctx } from './raster'

export interface Grade {
  label: string
  bg: string; floor: string
  light: string        // colore della luce principale (spot e fasci)
  glow: string         // controluce dietro l'elemento
  ink: string          // testi in primo piano
  shadow: string; high: string   // viraggio: ombre e luci
  dark: boolean
}

export const GRADES: Grade[] = [
  { label: 'Notte cromata', bg: '#040507', floor: '#0b0f14', light: '#a9c1d8', glow: '#5d8fd8', ink: '#e9edf1', shadow: '#06121f', high: '#f3ebdf', dark: true },
  { label: 'Sodio', bg: '#070403', floor: '#140a05', light: '#ff9a4a', glow: '#ff5d1f', ink: '#f7e7d3', shadow: '#1a0903', high: '#ffe6c2', dark: true },
  { label: 'Rosso noir', bg: '#060203', floor: '#120406', light: '#ff4150', glow: '#ff1f3d', ink: '#f3e6e2', shadow: '#1a0206', high: '#ffe8e2', dark: true },
  { label: 'Acido', bg: '#030503', floor: '#080d06', light: '#d2ff4a', glow: '#8cff2e', ink: '#ecf7e2', shadow: '#041006', high: '#f6ffe0', dark: true },
  { label: 'Teal e ambra', bg: '#02080a', floor: '#061215', light: '#58d6cf', glow: '#ffb04a', ink: '#e8f3f1', shadow: '#01161a', high: '#ffe9c9', dark: true },
  { label: 'Avorio', bg: '#e6e0d4', floor: '#d6cfc1', light: '#ffffff', glow: '#fff6e6', ink: '#141210', shadow: '#2a2622', high: '#fffaf0', dark: false },
]

/** fondo: spot dall'alto, pavimento che sfuma, linea d'orizzonte appena accennata */
export function backdrop(ctx: Ctx, W: number, H: number, g: Grade, horizon: number, spot: { x: number; y: number; r: number }) {
  ctx.fillStyle = g.bg; ctx.fillRect(0, 0, W, H)
  const fl = ctx.createLinearGradient(0, horizon, 0, H)
  fl.addColorStop(0, g.floor); fl.addColorStop(1, g.bg)
  ctx.fillStyle = fl; ctx.fillRect(0, horizon, W, H - horizon)
  ctx.save()
  ctx.globalCompositeOperation = g.dark ? 'screen' : 'soft-light'
  const sp = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spot.r)
  sp.addColorStop(0, rgba(g.light, g.dark ? 0.32 : 0.7)); sp.addColorStop(0.45, rgba(g.light, g.dark ? 0.1 : 0.3)); sp.addColorStop(1, rgba(g.light, 0))
  ctx.fillStyle = sp; ctx.fillRect(0, 0, W, H)
  // pozza di luce sul pavimento sotto l'elemento
  ctx.save(); ctx.translate(spot.x, horizon + (H - horizon) * 0.18); ctx.scale(1, 0.22)
  const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, spot.r * 0.9)
  pool.addColorStop(0, rgba(g.light, g.dark ? 0.22 : 0.4)); pool.addColorStop(1, rgba(g.light, 0))
  ctx.fillStyle = pool; ctx.fillRect(-W, -H * 3, W * 2, H * 6)
  ctx.restore()
  ctx.restore()
}

/** fasci di luce dall'alto, morbidi e additivi */
export function beams(ctx: Ctx, W: number, H: number, g: Grade, x: number, y: number, n: number, seed: number, strength = 1) {
  const r = rng(seed ^ 0xbea)
  const k = makeCanvas(W, H), c = k.ctx
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + (r() - 0.5) * 0.9, w0 = W * (0.004 + r() * 0.01), w1 = W * (0.08 + r() * 0.16), len = H * (0.8 + r() * 0.5)
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len, nx = -Math.sin(a), ny = Math.cos(a)
    const gr = c.createLinearGradient(x, y, ex, ey)
    gr.addColorStop(0, rgba(g.light, 0.32 * strength)); gr.addColorStop(1, rgba(g.light, 0))
    c.fillStyle = gr
    c.beginPath(); c.moveTo(x + nx * w0, y + ny * w0); c.lineTo(ex + nx * w1, ey + ny * w1); c.lineTo(ex - nx * w1, ey - ny * w1); c.lineTo(x - nx * w0, y - ny * w0); c.closePath(); c.fill()
  }
  ctx.save(); ctx.globalCompositeOperation = g.dark ? 'screen' : 'soft-light'; ctx.filter = `blur(${W * 0.012}px)`; ctx.drawImage(k.c, 0, 0); ctx.restore()
}

/** pulviscolo nella luce: punti sfocati a profondità diverse */
export function dust(ctx: Ctx, W: number, H: number, g: Grade, seed: number, count: number, area: { x: number; y: number; r: number }) {
  const r = rng(seed ^ 0xd057)
  for (const [blur, size, alpha, frac] of [[W * 0.004, W * 0.006, 0.35, 0.25], [W * 0.0008, W * 0.0018, 0.6, 0.75]] as const) {
    const k = makeCanvas(W, H), c = k.ctx
    c.fillStyle = g.light
    for (let i = 0; i < count * frac; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * area.r
      const x = area.x + Math.cos(a) * d * 1.2, y = area.y + Math.sin(a) * d
      c.globalAlpha = alpha * (0.3 + r() * 0.7) * (1 - d / area.r)
      c.beginPath(); c.arc(x, y, size * (0.4 + r()), 0, Math.PI * 2); c.fill()
    }
    ctx.save(); ctx.globalCompositeOperation = g.dark ? 'screen' : 'source-over'; ctx.filter = `blur(${blur}px)`; ctx.drawImage(k.c, 0, 0); ctx.restore()
  }
}

/**
 * Sfuma il piede di un pezzo nella nebbia: dal punto `from` (0..1 dell'altezza)
 * in giù l'alfa cala dolcemente. Così un tronco tagliato non si interrompe di netto.
 */
export function fadeFoot(src: HTMLCanvasElement, from = 0.72, to = 1) {
  const k = makeCanvas(src.width, src.height)
  k.ctx.drawImage(src, 0, 0)
  const g = k.ctx.createLinearGradient(0, src.height * from, 0, src.height * to)
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)')
  k.ctx.globalCompositeOperation = 'destination-in'
  k.ctx.fillStyle = g; k.ctx.fillRect(0, 0, src.width, src.height)
  return k.c
}

/** riflesso sul pavimento lucido: capovolto, schiacciato, sfumato e sfocato */
export function reflection(ctx: Ctx, src: HTMLCanvasElement, x: number, floorY: number, w: number, h: number, strength: number, blur: number) {
  const k = makeCanvas(Math.ceil(w), Math.ceil(h))
  k.ctx.save(); k.ctx.translate(0, h); k.ctx.scale(1, -1); k.ctx.drawImage(src, 0, 0, w, h); k.ctx.restore()
  const g = k.ctx.createLinearGradient(0, 0, 0, h * 0.55)
  g.addColorStop(0, `rgba(0,0,0,${strength})`); g.addColorStop(1, 'rgba(0,0,0,0)')
  k.ctx.globalCompositeOperation = 'destination-in'; k.ctx.fillStyle = g; k.ctx.fillRect(0, 0, w, h)
  ctx.save(); ctx.filter = `blur(${blur}px)`; ctx.drawImage(k.c, x, floorY, w, h * 0.6); ctx.restore()
}

/** controluce: l'alfa del pezzo sfocato e colorato, dietro di lui */
export function backGlow(ctx: Ctx, src: HTMLCanvasElement, x: number, y: number, w: number, h: number, color: string, blur: number, alpha: number, mode: GlobalCompositeOperation = 'screen') {
  const k = makeCanvas(src.width, src.height)
  k.ctx.drawImage(src, 0, 0); k.ctx.globalCompositeOperation = 'source-in'; k.ctx.fillStyle = color; k.ctx.fillRect(0, 0, src.width, src.height)
  ctx.save(); ctx.globalCompositeOperation = mode; ctx.globalAlpha = alpha; ctx.filter = `blur(${blur}px)`; ctx.drawImage(k.c, x, y, w, h); ctx.restore()
}

/**
 * Finitura sull'immagine intera: bloom e halation dalle luci alte, aberrazione
 * cromatica radiale, viraggio ombre/luci con curva a S, vignettatura, grana.
 */
export function cinemaFinish(c: HTMLCanvasElement, g: Grade, seed: number, o: { bloom: number; halation: number; aberration: number; grade: number; vignette: number; grain: number }) {
  const W = c.width, H = c.height, S = Math.min(W, H), ctx = c.getContext('2d')!
  // luci alte isolate → sfocate → sommate in schermo
  if (o.bloom > 0 || o.halation > 0) {
    const hi = makeCanvas(W, H)
    hi.ctx.drawImage(c, 0, 0)
    const d = hi.ctx.getImageData(0, 0, W, H), p = d.data
    for (let i = 0; i < p.length; i += 4) {
      const l = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) / 255
      const k = Math.max(0, (l - 0.62) / 0.38)
      p[i] *= k; p[i + 1] *= k; p[i + 2] *= k
    }
    hi.ctx.putImageData(d, 0, 0)
    ctx.save(); ctx.globalCompositeOperation = 'screen'
    if (o.bloom > 0) {
      ctx.globalAlpha = o.bloom * 0.9; ctx.filter = `blur(${S * 0.02}px)`; ctx.drawImage(hi.c, 0, 0)
      ctx.globalAlpha = o.bloom * 0.6; ctx.filter = `blur(${S * 0.006}px)`; ctx.drawImage(hi.c, 0, 0)
    }
    if (o.halation > 0) {
      // alone rosso-arancio stretto attorno alle luci, come la pellicola
      const t = makeCanvas(W, H); t.ctx.drawImage(hi.c, 0, 0); t.ctx.globalCompositeOperation = 'multiply'; t.ctx.fillStyle = '#ff4a1a'; t.ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = o.halation; ctx.filter = `blur(${S * 0.004}px)`; ctx.drawImage(t.c, 0, 0)
    }
    ctx.restore()
  }
  const img = ctx.getImageData(0, 0, W, H), p = img.data
  const src = o.aberration > 0 ? new Uint8ClampedArray(p) : p
  const [sr, sg, sb] = hexRgb(g.shadow), [hr, hg, hb] = hexRgb(g.high)
  const cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy), ab = o.aberration * S * 0.0035
  const r = rng(seed ^ 0x9a1)
  const curve = (v: number) => { const x = v / 255; const s = x * x * (3 - 2 * x); return (x + (s - x) * 0.55 * o.grade) * 255 }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4
    let R0 = p[i], B0 = p[i + 2]
    const G0 = p[i + 1]
    const dx = x - cx, dy = y - cy, rr = Math.hypot(dx, dy) / R
    if (ab > 0) {
      // il rosso scivola verso l'esterno, il blu verso l'interno, crescendo ai bordi
      const k = ab * rr * rr, ux = rr > 0 ? dx / (rr * R) : 0, uy = rr > 0 ? dy / (rr * R) : 0
      const xr = Math.min(W - 1, Math.max(0, Math.round(x - ux * k))), yr = Math.min(H - 1, Math.max(0, Math.round(y - uy * k)))
      const xb = Math.min(W - 1, Math.max(0, Math.round(x + ux * k))), yb = Math.min(H - 1, Math.max(0, Math.round(y + uy * k)))
      R0 = src[(yr * W + xr) * 4]; B0 = src[(yb * W + xb) * 4 + 2]
    }
    // curva a S e viraggio: ombre verso un colore, luci verso un altro
    let Rc = curve(R0), Gc = curve(G0), Bc = curve(B0)
    const l = (Rc * 0.299 + Gc * 0.587 + Bc * 0.114) / 255
    const ws = (1 - l) * (1 - l) * 0.35 * o.grade, wh = l * l * 0.18 * o.grade
    Rc += (sr - Rc) * ws + (hr - Rc) * wh; Gc += (sg - Gc) * ws + (hg - Gc) * wh; Bc += (sb - Bc) * ws + (hb - Bc) * wh
    // vignettatura morbida
    const v = 1 - o.vignette * Math.pow(Math.max(0, rr - 0.35) / 0.65, 1.8) * 0.75
    // grana: più forte nei mezzitoni, come l'argento
    const gn = (r() - 0.5) * o.grain * 46 * (0.4 + 0.6 * (1 - Math.abs(l - 0.5) * 2))
    p[i] = Rc * v + gn; p[i + 1] = Gc * v + gn; p[i + 2] = Bc * v + gn
  }
  ctx.putImageData(img, 0, 0)
}

export function rgba(hex: string, a: number) { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})` }

// ─── finiture applicabili a qualsiasi generatore ─────────────────────────────

export const POST_FX = ['Nessuna', 'Pellicola', 'Emissione', 'Sogno', 'Stampa', 'Profondità'] as const

/** copia sfocata (con filtro canvas) */
function blurred(src: HTMLCanvasElement, r: number) {
  const k = makeCanvas(src.width, src.height)
  k.ctx.filter = `blur(${r}px)`; k.ctx.drawImage(src, 0, 0)
  return k.c
}

/** grana di pellicola solo dove c'è immagine; più forte nei mezzitoni */
export function grainIn(c: HTMLCanvasElement, amt: number, seed: number) {
  const ctx = c.getContext('2d')!, d = ctx.getImageData(0, 0, c.width, c.height), p = d.data, r = rng(seed ^ 0x6a1)
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue
    const l = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) / 255
    const n = (r() + r() - 1) * amt * 52 * (0.35 + 0.65 * (1 - Math.abs(l - 0.5) * 2))
    p[i] += n; p[i + 1] += n; p[i + 2] += n
  }
  ctx.putImageData(d, 0, 0)
}

/** frangia cromatica: rosso e blu sfasati di qualche pixel, come una lente economica */
export function fringe(c: HTMLCanvasElement, px: number) {
  if (px < 0.5) return
  const ctx = c.getContext('2d')!, W = c.width, H = c.height, d = ctx.getImageData(0, 0, W, H), p = d.data, s = new Uint8ClampedArray(p), o = Math.round(px)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, xr = Math.min(W - 1, x + o), xb = Math.max(0, x - o)
    p[i] = s[(y * W + xr) * 4]; p[i + 2] = s[(y * W + xb) * 4 + 2]
    p[i + 3] = Math.max(s[i + 3], s[(y * W + xr) * 4 + 3] * 0.6, s[(y * W + xb) * 4 + 3] * 0.6)
  }
  ctx.putImageData(d, 0, 0)
}

/** solo le luci alte di un'immagine (per bagliori ed emissione) */
function highlights(src: HTMLCanvasElement, from = 0.55) {
  const k = makeCanvas(src.width, src.height); k.ctx.drawImage(src, 0, 0)
  const d = k.ctx.getImageData(0, 0, src.width, src.height), p = d.data
  for (let i = 0; i < p.length; i += 4) {
    const l = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) / 255, kk = Math.max(0, (l - from) / (1 - from))
    p[i] *= kk; p[i + 1] *= kk; p[i + 2] *= kk; p[i + 3] *= Math.min(1, kk * 1.5)
  }
  k.ctx.putImageData(d, 0, 0)
  return k.c
}

/**
 * Finitura su un'immagine finita. `transparent`: è un pezzo scontornato, quindi
 * gli aloni crescono fuori dalla sagoma (si allarga il foglio prima) e il fondo
 * resta trasparente.
 */
export function postFx(src: HTMLCanvasElement, kind: number, amt: number, seed: number, transparent: boolean) {
  if (!kind || amt <= 0) return src
  const S = Math.min(src.width, src.height)
  const pad = transparent ? Math.round(S * 0.06) : 0
  const k = makeCanvas(src.width + pad * 2, src.height + pad * 2), ctx = k.ctx
  ctx.drawImage(src, pad, pad)
  const c = k.c, W = c.width, H = c.height
  const glowUnder = (img: HTMLCanvasElement, r: number, a: number) => {
    // sotto la sagoma se è un pezzo, in schermo sopra se è una tavola piena
    ctx.save(); ctx.globalAlpha = a; ctx.filter = `blur(${r}px)`
    ctx.globalCompositeOperation = transparent ? 'destination-over' : 'screen'
    ctx.drawImage(img, 0, 0); ctx.restore()
  }
  if (kind === 1) {
    // pellicola: morbidezza appena percettibile, alone sulle luci, frangia, grana
    const base = makeCanvas(W, H); base.ctx.drawImage(c, 0, 0)
    ctx.clearRect(0, 0, W, H); ctx.filter = `blur(${S * 0.0006}px)`; ctx.drawImage(base.c, 0, 0); ctx.filter = 'none'
    const hi = highlights(c, 0.6)
    ctx.save(); ctx.globalCompositeOperation = transparent ? 'source-atop' : 'screen'; ctx.globalAlpha = 0.5 * amt; ctx.filter = `blur(${S * 0.006}px)`; ctx.drawImage(hi, 0, 0); ctx.restore()
    fringe(c, S * 0.0012 * amt)
    grainIn(c, 0.55 * amt, seed)
  } else if (kind === 2) {
    // emissione: la forma brilla del suo colore, alone largo e uno stretto
    const glowSrc = transparent ? c : highlights(c, 0.45)
    const g1 = blurred(glowSrc, S * 0.035), g2 = blurred(glowSrc, S * 0.008)
    glowUnder(g1, 0, 0.9 * amt); glowUnder(g2, 0, 0.8 * amt)
    if (transparent) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 * amt; ctx.drawImage(g2, 0, 0); ctx.restore() }
    grainIn(c, 0.3 * amt, seed)
  } else if (kind === 3) {
    // sogno (effetto Orton): una copia sfocata in schermo e una in luce morbida
    const b = blurred(c, S * 0.012)
    ctx.save(); ctx.globalCompositeOperation = transparent ? 'source-atop' : 'screen'; ctx.globalAlpha = 0.45 * amt; ctx.drawImage(b, 0, 0)
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.6 * amt; ctx.drawImage(b, 0, 0); ctx.restore()
    if (transparent) glowUnder(b, S * 0.01, 0.6 * amt)
    grainIn(c, 0.35 * amt, seed)
  } else if (kind === 4) {
    // stampa: inchiostro irregolare, puntinatura di carta, registro un filo fuori
    const d = ctx.getImageData(0, 0, W, H), p = d.data, r = rng(seed ^ 0x51a)
    const n = noiseField(W, H, S * 0.012, seed)
    for (let i = 0, j = 0; i < p.length; i += 4, j++) {
      if (!p[i + 3]) continue
      if (transparent) {
        // pezzo: l'inchiostro si scarica verso la carta, a chiazze e con qualche buco
        const ink = 0.82 + n[j] * 0.3 - (r() < 0.012 * amt ? 0.5 : 0)
        const kk = 1 - (1 - Math.min(1, ink)) * amt
        p[i] = 255 - (255 - p[i]) * kk; p[i + 1] = 255 - (255 - p[i + 1]) * kk; p[i + 2] = 255 - (255 - p[i + 2]) * kk
      } else {
        // tavola piena: solo un velo di irregolarità che scurisce appena, il fondo resta suo
        const kk = 1 - (1 - n[j]) * 0.14 * amt
        p[i] *= kk; p[i + 1] *= kk; p[i + 2] *= kk
      }
    }
    ctx.putImageData(d, 0, 0)
    fringe(c, S * 0.0025 * amt)
    grainIn(c, 0.4 * amt, seed)
  } else if (kind === 5) {
    // profondità: fuoco al centro, sopra e sotto sfuocano (tilt-shift)
    const b = blurred(c, S * 0.01 * amt)
    const m = makeCanvas(W, H)
    const gr = m.ctx.createLinearGradient(0, 0, 0, H)
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.3, 'rgba(0,0,0,0)'); gr.addColorStop(0.7, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)')
    m.ctx.drawImage(b, 0, 0); m.ctx.globalCompositeOperation = 'destination-in'; m.ctx.fillStyle = gr; m.ctx.fillRect(0, 0, W, H)
    ctx.drawImage(m.c, 0, 0)
    grainIn(c, 0.35 * amt, seed)
  }
  return c
}

/** rumore morbido a valori 0..1 (blocchi interpolati), per l'inchiostro irregolare */
function noiseField(W: number, H: number, cell: number, seed: number) {
  const r = rng(seed ^ 0x77), gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2
  const g = Float32Array.from({ length: gw * gh }, () => r())
  const out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    const fy = y / cell, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty)
    for (let x = 0; x < W; x++) {
      const fx = x / cell, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx)
      const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1]
      out[y * W + x] = (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy
    }
  }
  return out
}

/** finitura per l'elemento in scena: emissione del suo colore, grana, frangia */
export function heroFx(src: HTMLCanvasElement, color: string, seed: number, emit: number) {
  const S = Math.min(src.width, src.height)
  const k = makeCanvas(src.width, src.height), ctx = k.ctx
  ctx.drawImage(src, 0, 0)
  if (emit > 0) {
    const hi = highlights(src, 0.5)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * emit; ctx.filter = `blur(${S * 0.012}px)`; ctx.drawImage(hi, 0, 0)
    ctx.globalAlpha = 0.35 * emit; ctx.filter = `blur(${S * 0.003}px)`; ctx.drawImage(hi, 0, 0); ctx.restore()
    // un velo del colore della scena sulle ombre dell'oggetto: è immerso in quella luce
    ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = 0.18; ctx.fillStyle = color; ctx.fillRect(0, 0, src.width, src.height); ctx.restore()
  }
  fringe(k.c, S * 0.0018)
  grainIn(k.c, 0.5, seed)
  return k.c
}
