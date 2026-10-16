/**
 * Leggibilità sui pixel veri (blocco A di robustezza). Il controllo di `legible`
 * stima il fondo dai colori dichiarati; qui si misura dopo il render: la tavola
 * senza i testi (foto, texture, effetti, campi generativi compresi) e, per ogni
 * riga d'inchiostro, il contrasto del colore del testo contro i pixel che ha sotto.
 */
import type { Scene, SceneEl } from '../types'
import { righeVere } from './spazi'

type Text = Extract<SceneEl, { kind: 'text' }>
/** Pixel della tavola renderizzata senza i testi, ridotta (lato in pixel = w). */
export interface Pixel { w: number; h: number; data: Uint8ClampedArray }
export interface LetturaRiga { testo: string; riga: number; ok: number; contrasto: number; mosso: number; big: boolean }

const lin = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const lumRgb = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const rgbHex = (h: string) => { const x = h.replace('#', ''); const n = parseInt(x.length === 3 ? x.split('').map(c => c + c).join('') : x.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
export const lumHex = (h: string) => { const [r, g, b] = rgbHex(h); return lumRgb(r, g, b) }
const cr = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

/** Soglie: testo piccolo 4 (vicino al 4.5 del WCAG, con l'inchiostro pieno), grande 2.6; la riga passa se lo sono quasi tutti i punti. */
export const SOGLIA_PIXEL = { piccolo: 4, grande: 2.6, quotaPiccolo: 0.85, quotaGrande: 0.75 }
const grande = (t: Text, u: number) => t.size > 40 * u
export const sottoSoglia = (l: LetturaRiga) => l.ok < (l.big ? SOGLIA_PIXEL.quotaGrande : SOGLIA_PIXEL.quotaPiccolo)

/** I testi da misurare: veri, visibili, a colore pieno, non ruotati (i ruotati restano alla stima). */
export const testiDaMisurare = (sc: Scene) => sc.els.filter((e): e is Text => e.kind === 'text' && !e.deco && (e.opacity ?? 1) > 0.05 && e.color.startsWith('#') && !e.hollow && !(e.angle && Math.abs(e.angle) > 2))

/** Luminanze dei pixel sotto ogni riga (griglia di punti dentro il riquadro d'inchiostro). */
export function campioniRighe(sc: Scene, px: Pixel, t: Text) {
  const s = px.w / sc.w
  return righeVere(t).map(r => {
    const out: number[] = []
    for (let fx = 0.04; fx < 1; fx += 0.06) for (const fy of [0.25, 0.5, 0.75]) {
      const x = Math.round((r.x0 + (r.x1 - r.x0) * fx) * s), y = Math.round((r.y0 + (r.y1 - r.y0) * fy) * s)
      if (x < 0 || y < 0 || x >= px.w || y >= px.h) continue
      const o = (y * px.w + x) * 4
      out.push(lumRgb(px.data[o], px.data[o + 1], px.data[o + 2]))
    }
    return out
  })
}

/** Una riga letta con un colore: quota di punti sopra la soglia, contrasto mediano e movimento del fondo. */
export function leggiRiga(lums: number[], colore: string, big: boolean) {
  const L = lumHex(colore), min = big ? SOGLIA_PIXEL.grande : SOGLIA_PIXEL.piccolo
  if (!lums.length) return { ok: 1, contrasto: 21, mosso: 0 }
  const cs = lums.map(l => cr(L, l)).sort((a, b) => a - b)
  const m = lums.reduce((a, b) => a + Math.sqrt(b), 0) / lums.length
  const mosso = Math.sqrt(lums.reduce((a, b) => a + (Math.sqrt(b) - m) ** 2, 0) / lums.length)
  return { ok: cs.filter(c => c >= min).length / cs.length, contrasto: cs[Math.floor(cs.length / 2)], mosso }
}

/** Le letture di tutte le righe della scena sui pixel veri. */
export function lettureVere(sc: Scene, px: Pixel): LetturaRiga[] {
  const u = Math.min(sc.w, sc.h) / 1080
  return testiDaMisurare(sc).flatMap(t => {
    const big = grande(t, u)
    return campioniRighe(sc, px, t).map((lums, riga) => ({ testo: t.name, riga, big, ...leggiRiga(lums, t.color, big) }))
  })
}
