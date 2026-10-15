/**
 * Trama: la grana di stampa e la carta sopra la tavola. Si misura il rumore
 * fine nelle zone piene dell'originale e si ricostruisce con lo stesso
 * livello del motore (rettangolo grigio in sovrapposizione con l'effetto
 * textureOverlay "grana"), scegliendo l'intensità per render-and-compare su
 * un campione dello stesso colore.
 */
import type { SceneEl } from '../types'
import { hex, moda, px } from './pixel'
import type { Box, Raster, RGB } from './tipi'
import { rendi } from './verifica'

const lum = (p: RGB) => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]

/** Rumore fine (scarto dalla media 3×3 della luminanza) dentro alcune finestre. */
export function rumore(r: Raster, finestre: Box[]): number {
  const v: number[] = []
  for (const b of finestre) {
    let s = 0, s2 = 0, n = 0
    for (let y = Math.max(1, b.y + 1); y < Math.min(r.h - 1, b.y + b.h - 1); y++) for (let x = Math.max(1, b.x + 1); x < Math.min(r.w - 1, b.x + b.w - 1); x++) {
      let m = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m += lum(px(r, x + dx, y + dy))
      const d = lum(px(r, x, y)) - m / 9
      s += d; s2 += d * d; n++
    }
    if (n) v.push(Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)))
  }
  v.sort((a, b) => a - b)
  return v.length ? v[v.length >> 1] : 0
}

/** Il livello di grana del motore per un'intensità 0..1 (come in gen/tools.ts). */
export const livelloGrana = (w: number, h: number, g: number): SceneEl => ({
  kind: 'rect', name: 'Grana', x: 0, y: 0, w, h, fill: '#808080', blend: 'overlay', opacity: +(0.35 + g * 0.6).toFixed(3),
  fx: [{ id: 'textureOverlay', variant: 'grana', p: { opacity: 100, blend: 0, scale: Math.round(80 + g * 80) } }],
})

/** Grana dell'originale come livello del motore, o null se l'immagine è pulita. */
export async function trama(r: Raster, finestre: Box[]): Promise<SceneEl | null> {
  if (finestre.length < 2) return null
  const voluto = rumore(r, finestre)
  if (voluto < 2.5) return null
  // campione: una tela del colore delle zone piene, con la grana a varie intensità
  const colore = hex(moda(finestre.flatMap(b => [px(r, b.x + (b.w >> 1), b.y + (b.h >> 1)), px(r, b.x + 2, b.y + 2)])))
  const S = 192, centro: Box[] = [{ x: 32, y: 32, w: 128, h: 128 }]
  let migliore: { g: number; d: number } | null = null
  const prove: [number, number][] = []
  for (const g of [0, 0.25, 0.5, 0.75, 1]) {
    const sc = { w: S, h: S, bg: colore, els: [{ kind: 'rect', name: 'Fondo', x: 0, y: 0, w: S, h: S, fill: colore } as SceneEl, livelloGrana(S, S, g)], layout: 'trama', style: 'trama', label: 'trama' }
    const n = rumore(await rendi(sc), centro)
    prove.push([g, n])
    const d = Math.abs(n - voluto)
    if (!migliore || d < migliore.d) migliore = { g, d }
  }
  // tra le due prove vicine si interpola
  let g = migliore!.g
  for (let i = 1; i < prove.length; i++) {
    const [g0, n0] = prove[i - 1], [g1, n1] = prove[i]
    if ((voluto - n0) * (voluto - n1) <= 0 && n1 !== n0) { g = g0 + ((voluto - n0) / (n1 - n0)) * (g1 - g0); break }
  }
  if (voluto > prove[prove.length - 1][1]) g = 1
  return livelloGrana(r.w, r.h, Math.max(0, Math.min(1, g)))
}
