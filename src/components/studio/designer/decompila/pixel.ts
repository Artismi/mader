/**
 * Pixel per il decompilatore: lettura e scrittura di tele, riduzioni, colori
 * dominanti, distanze e differenza media tra due immagini. Tutto su
 * Uint8ClampedArray RGBA, senza librerie.
 */
import type { Box, Raster, RGB } from './tipi'

export function tela(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h))
  return c
}

export function daTela(c: HTMLCanvasElement | OffscreenCanvas, box?: Box): Raster {
  const x = box?.x ?? 0, y = box?.y ?? 0, w = box?.w ?? c.width, h = box?.h ?? c.height
  const cx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  return { w, h, data: cx.getImageData(x, y, w, h).data }
}

export function aTela(r: Raster): HTMLCanvasElement {
  const c = tela(r.w, r.h)
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(r.data), r.w, r.h), 0, 0)
  return c
}

export async function daUrl(url: string): Promise<{ img: HTMLImageElement; raster: Raster }> {
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url
  await img.decode()
  const c = tela(img.naturalWidth, img.naturalHeight)
  c.getContext('2d')!.drawImage(img, 0, 0)
  return { img, raster: daTela(c) }
}

/** Ritaglio di un raster (il riquadro si stringe dentro i bordi). */
export function ritaglia(r: Raster, b: Box): Raster {
  const x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y))
  const x1 = Math.min(r.w, Math.ceil(b.x + b.w)), y1 = Math.min(r.h, Math.ceil(b.y + b.h))
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0)
  const d = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) d.set(r.data.subarray(((y0 + y) * r.w + x0) * 4, ((y0 + y) * r.w + x0 + w) * 4), y * w * 4)
  return { w, h, data: d }
}

/** Riduzione per media sui blocchi (niente aliasing: la grana e i retini si spianano). */
export function riduci(r: Raster, w: number, h: number): Raster {
  const d = new Uint8ClampedArray(w * h * 4), sx = r.w / w, sy = r.h / h
  for (let y = 0; y < h; y++) {
    const ya = Math.floor(y * sy), yb = Math.max(ya + 1, Math.floor((y + 1) * sy))
    for (let x = 0; x < w; x++) {
      const xa = Math.floor(x * sx), xb = Math.max(xa + 1, Math.floor((x + 1) * sx))
      let a = 0, b = 0, c = 0, al = 0, n = 0
      for (let yy = ya; yy < yb; yy++) for (let xx = xa; xx < xb; xx++) {
        const i = (yy * r.w + xx) * 4
        a += r.data[i]; b += r.data[i + 1]; c += r.data[i + 2]; al += r.data[i + 3]; n++
      }
      const o = (y * w + x) * 4
      d[o] = a / n; d[o + 1] = b / n; d[o + 2] = c / n; d[o + 3] = al / n
    }
  }
  return { w, h, data: d }
}

export const px = (r: Raster, x: number, y: number): RGB => { const i = (y * r.w + x) * 4; return [r.data[i], r.data[i + 1], r.data[i + 2]] }
export const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
export const hex = (c: RGB) => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
export const daHex = (h: string): RGB => { const v = parseInt(h.replace('#', '').slice(0, 6), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255] }

/** Colore più frequente (istogramma a 5 bit per canale, poi media dei pixel di quella cella). */
export function moda(pixels: Iterable<RGB>): RGB {
  const conta = new Map<number, { n: number; s: [number, number, number] }>()
  for (const p of pixels) {
    const k = ((p[0] >> 3) << 10) | ((p[1] >> 3) << 5) | (p[2] >> 3)
    const c = conta.get(k) ?? { n: 0, s: [0, 0, 0] }
    c.n++; c.s[0] += p[0]; c.s[1] += p[1]; c.s[2] += p[2]
    conta.set(k, c)
  }
  let best: { n: number; s: [number, number, number] } | null = null
  for (const c of conta.values()) if (!best || c.n > best.n) best = c
  return best ? [best.s[0] / best.n, best.s[1] / best.n, best.s[2] / best.n] : [255, 255, 255]
}

/** Pixel dell'anello di bordo di un riquadro (spessore `t`). */
export function* bordo(r: Raster, b: Box, t = 2): Generator<RGB> {
  const x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y))
  const x1 = Math.min(r.w, Math.ceil(b.x + b.w)), y1 = Math.min(r.h, Math.ceil(b.y + b.h))
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (y - y0 < t || y1 - 1 - y < t || x - x0 < t || x1 - 1 - x < t) yield px(r, x, y)
  }
}

/** Mediana per canale. */
export function mediana(pixels: RGB[]): RGB {
  if (!pixels.length) return [0, 0, 0]
  const m = (k: number) => { const v = pixels.map(p => p[k]).sort((a, b) => a - b); return v[v.length >> 1] }
  return [m(0), m(1), m(2)]
}

/** Lato lungo per il confronto di fedeltà: abbastanza per vedere forme e righe, non la grana. */
export const LATO_CONFRONTO = 200

/** Differenza media per pixel (0..1) tra due immagini, ridotte alla stessa misura. */
export function differenza(a: Raster, b: Raster, lato = LATO_CONFRONTO): number {
  const k = lato / Math.max(a.w, a.h)
  const w = Math.max(1, Math.round(a.w * k)), h = Math.max(1, Math.round(a.h * k))
  const ra = riduci(a, w, h), rb = riduci(b, w, h)
  let s = 0
  for (let i = 0; i < ra.data.length; i += 4) s += Math.abs(ra.data[i] - rb.data[i]) + Math.abs(ra.data[i + 1] - rb.data[i + 1]) + Math.abs(ra.data[i + 2] - rb.data[i + 2])
  return s / (w * h * 3 * 255)
}

/** Raster in data URL PNG (per le immagini della scena). */
export const aPng = (r: Raster) => aTela(r).toDataURL('image/png')
