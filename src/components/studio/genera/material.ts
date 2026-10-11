/**
 * Dal piatto al volume: una maschera 2D diventa un oggetto gonfio e lucido.
 * L'altezza è la maschera sfocata (più spessa al centro dei tratti); dalle sue
 * pendenze si ricavano le normali, che riflettono un ambiente da studio.
 */
import { distance, hexRgb, makeCanvas, smoothField, type Mask } from './raster'

export type Material = 'cromo' | 'nero' | 'oro' | 'gel' | 'iride' | 'perla'
export const MATERIALS: { id: Material; label: string }[] = [
  { id: 'cromo', label: 'Cromo' }, { id: 'nero', label: 'Nero lucido' }, { id: 'oro', label: 'Oro' },
  { id: 'gel', label: 'Gel' }, { id: 'iride', label: 'Iridescente' }, { id: 'perla', label: 'Perla' },
]

const mix = (a: number, b: number, t: number) => a + (b - a) * t
const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** ambiente "cromo da studio": cielo chiaro, linea d'orizzonte scura, pavimento */
function env(rx: number, ry: number, rz: number): [number, number, number] {
  const t = -ry
  let v: number
  if (t > 0.08) v = mix(0.78, 1.0, Math.pow(sat((t - 0.08) / 0.92), 0.6))
  else if (t > -0.06) v = mix(0.08, 0.55, sat((t + 0.06) / 0.14))           // l'orizzonte netto: il segreto del cromo
  else v = mix(0.18, 0.5, Math.pow(sat(-t), 1.4))
  v += 0.05 * Math.sin(rx * 2.6 + 0.6)                                       // softbox laterali, larghi
  const cool = 0.03 * t
  return [v - cool, v, v + cool * 2]
}

/** massimo su una finestra quadrata (separabile): dilatazione in scala di grigi */
function maxFilter(src: Float32Array, W: number, H: number, rad: number) {
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let m = 0
    for (let k = Math.max(0, x - rad); k <= Math.min(W - 1, x + rad); k++) { const v = src[y * W + k]; if (v > m) m = v }
    tmp[y * W + x] = m
  }
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    let m = 0
    for (let k = Math.max(0, y - rad); k <= Math.min(H - 1, y + rad); k++) { const v = tmp[k * W + x]; if (v > m) m = v }
    out[y * W + x] = m
  }
  return out
}

function hue(h: number): [number, number, number] {
  const f = (n: number) => { const k = (n + h * 6) % 6; return 1 - Math.max(0, Math.min(k, 4 - k, 1)) }
  return [f(5), f(3), f(1)]
}

/**
 * @param depth quanto è gonfio (0..1), @param round raggio di arrotondamento in px
 * @param tint colore del materiale (gel, perla); la luce arriva da in alto a sinistra
 */
export function shade(m: Mask, material: Material, round: number, depth = 0.7, tint = '#ff2d55') {
  const W = m.w, H = m.h
  // profilo a quarto di cerchio di raggio R sul bordo, piano oltre: un tubo/smusso vero
  const R = Math.max(1.5, round)
  const dist = distance(m)
  // mezza larghezza locale: dove il tratto è più stretto del raggio, il tubo diventa un
  // semicerchio pieno (cima piatta) invece di un arco interrotto con la cresta a spigolo
  const half = maxFilter(dist, W, H, Math.ceil(R))
  const raw = new Float32Array(W * H)
  for (let i = 0; i < raw.length; i++) {
    const dd = dist[i]
    if (dd <= 0) continue
    const Re = Math.max(0.75, Math.min(R, half[i])), d = Math.min(dd, Re)
    raw[i] = Math.sqrt(Math.max(0, Re * Re - (Re - d) * (Re - d))) * (R / Math.max(R, Re * 1.0))
  }
  const h = smoothField(raw, W, H, Math.max(1, R * 0.15), 2)
  const { c, ctx } = makeCanvas(W, H)
  const img = ctx.createImageData(W, H), d = img.data
  const k = 0.5 * (0.4 + depth)
  const L = [-0.45, -0.62, 0.64], Ll = Math.hypot(L[0], L[1], L[2]); L[0] /= Ll; L[1] /= Ll; L[2] /= Ll
  const [tr, tg, tb] = hexRgb(tint).map(v => v / 255)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x
    const a = m.a[i]
    if (a === 0) continue
    const dx = (h[i + 1] - h[i - 1]) * k, dy = (h[i + W] - h[i - W]) * k
    let nx = -dx, ny = -dy, nz = 1
    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl
    const rx = 2 * nz * nx, ry = 2 * nz * ny, rz = 2 * nz * nz - 1
    const diff = sat(nx * L[0] + ny * L[1] + nz * L[2])
    const hx = L[0], hy = L[1], hz = L[2] + 1, hl = Math.hypot(hx, hy, hz)
    const spec = Math.pow(sat((nx * hx + ny * hy + nz * hz) / hl), 90)
    const fres = Math.pow(1 - nz, 2.2)
    let r: number, g: number, b: number
    const [er, eg, eb] = env(rx, ry, rz)
    if (material === 'cromo') { r = er; g = eg; b = eb }
    else if (material === 'oro') { r = er * 1.05 + 0.08; g = eg * 0.78 + 0.02; b = eb * 0.32; }
    else if (material === 'nero') { const v = 0.03 + er * 0.22 * (0.3 + fres); r = v; g = v; b = v * 1.05 }
    else if (material === 'iride') {
      const [hr, hg, hb2] = hue(((rx * 0.35 + ry * 0.25 + 1.5) % 1 + 1) % 1)
      r = mix(er, hr, 0.55); g = mix(eg, hg, 0.55); b = mix(eb, hb2, 0.55)
    } else if (material === 'perla') {
      const [hr, hg, hb2] = hue(((nx * 0.5 + ny * 0.3 + 2) % 1))
      const base = 0.82 + diff * 0.15
      r = mix(base, hr, 0.12) + fres * 0.08; g = mix(base, hg, 0.12) + fres * 0.08; b = mix(base, hb2, 0.12) + fres * 0.1
      r = mix(r, tr, 0.1); g = mix(g, tg, 0.1); b = mix(b, tb, 0.1)
    } else {
      // gel: colore pieno, luce morbida, bordo che si illumina (fresnel)
      const lit = 0.38 + diff * 0.62
      r = tr * lit + fres * 0.35; g = tg * lit + fres * 0.35; b = tb * lit + fres * 0.35
    }
    const sp = material === 'nero' ? spec * 1.4 : spec * 0.9
    d[i * 4] = sat(r + sp) * 255; d[i * 4 + 1] = sat(g + sp) * 255; d[i * 4 + 2] = sat(b + sp) * 255; d[i * 4 + 3] = a
  }
  ctx.putImageData(img, 0, 0)
  return c
}
