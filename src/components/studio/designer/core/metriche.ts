/**
 * Metriche ottiche dei caratteri, misurate dal browser con il carattere vero:
 * altezza delle maiuscole, della x, rientro della prima lettera. Servono per
 * allineare il titolo sulle maiuscole (non sul box) e sul margine visivo.
 *
 * Geometria di Fabric (IText, originY top), misurata sui pixel: la prima
 * linea di base sta sempre a 0,879 del corpo dal bordo del box (1,13 × (1 − 0,222)),
 * qualunque sia l'interlinea; le righe dopo scendono di un'interlinea L:
 *   base(i) = y + corpo · (0,879 + i · L)
 */
import type { FontSpec, SceneEl } from '../types'
import { cssFont } from '../fonts'

let c2: CanvasRenderingContext2D | null = null
const ctx = () => (c2 ??= document.createElement('canvas').getContext('2d')!)

const capCache = new Map<string, { cap: number; x: number; desc: number }>()

/** Altezza di maiuscole, x e discendenti come frazioni del corpo. */
export function metrics(font: FontSpec) {
  const key = `${font.family}|${font.weight}|${font.italic ? 'i' : ''}`
  let m = capCache.get(key)
  if (!m) {
    const c = ctx(); c.font = cssFont(font, 200)
    const H = c.measureText('H'), x = c.measureText('x'), p = c.measureText('p')
    m = { cap: H.actualBoundingBoxAscent / 200, x: x.actualBoundingBoxAscent / 200, desc: p.actualBoundingBoxDescent / 200 }
    // carattere non ancora caricato o misura assente: valori tipici
    if (!(m.cap > 0.4 && m.cap < 0.95)) m = { cap: 0.7, x: 0.5, desc: 0.2 }
    capCache.set(key, m)
  }
  return m
}

/** Linea di base della riga i di un testo del motore. */
export const FIRST_BASE = 1.13 * (1 - 0.222)
export const baseline = (y: number, size: number, leading: number, i = 0) => y + size * (FIRST_BASE + i * leading)

/** y del box perché la sommità delle maiuscole della prima riga cada su `capY`. */
export function topForCaps(capY: number, font: FontSpec, size: number, leading: number) {
  return capY - (baseline(0, size, leading) - metrics(font).cap * size)
}

/** y del box perché la linea di base dell'ultima riga cada su `baseY`. */
export function topForBaseline(baseY: number, size: number, leading: number, lines: number) {
  return baseY - size * (FIRST_BASE + (lines - 1) * leading)
}

/** Rientro ottico: di quanto spostare la riga perché l'inchiostro della prima lettera tocchi il margine. */
export function opticalLeft(text: string, font: FontSpec, size: number) {
  if (!text) return 0
  const c = ctx(); c.font = cssFont(font, size)
  return c.measureText(text[0]).actualBoundingBoxLeft
}

/** Ingombro dell'inchiostro di un testo del motore (dalla sommità delle maiuscole alla base, più i discendenti se ci sono). */
export function inkBox(t: Extract<SceneEl, { kind: 'text' }>) {
  const m = metrics(t.font)
  const top = baseline(t.y, t.size, t.lineHeight, 0) - m.cap * t.size
  const hasDesc = t.lines[t.lines.length - 1].match(/[gjpqyQ,;]/)
  const bottom = baseline(t.y, t.size, t.lineHeight, t.lines.length - 1) + (hasDesc ? m.desc * t.size : 0)
  return { top, bottom }
}
