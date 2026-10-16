/**
 * Critico del carattere (C4): non "è corretta?" ma "ha una determinazione?".
 * - dominanza: il punto focale pesa molto più del secondo elemento;
 * - contrasto di scala: il titolo (o la parola gesto) contro il testo più grande dopo di lui;
 * - ornamento senza funzione: nastri, timbri, stelle, puntini, grana… che l'idea non motiva tolgono;
 * - genericità: quanto la tavola somiglia alla media del suo archetipo (ricordata qui).
 * Il carattere (0-100) non tocca il voto né la promozione: pesa nella scelta delle proposte.
 */
import type { SceneEl } from '../types'
import { type G, textBox } from './tools'

type Box = { x: number; y: number; w: number; h: number }
type Text = Extract<SceneEl, { kind: 'text' }>

/** Ornamenti riconosciuti dal nome; `motivo` = l'idea che li giustifica (vedi concetto.ts). */
export const ORNAMENTI: [RegExp, string][] = [
  [/^nastro/, 'ripetizione'], [/^timbro/, 'documento'], [/^(stella|glifo|ornamento)/, 'decoro'], [/^puntini$/, 'ritmo'],
  [/^tassello/, 'ritmo'], [/^(crocino|registro)/, 'stampa'], [/^(cerchiato|freccia|segno|scarabocchio)/, 'mano'],
  [/^barra_sottile/, 'ritmo'], [/^alone/, 'stampa'], [/^(trama|strato)/, 'materia'],
]

export interface Carattere { carattere: number; dominanza: number; scala: number; ornamenti: number; genericita: number }

const area = (b: Box) => Math.max(0, b.w) * Math.max(0, b.h)
function boxOf(e: SceneEl): Box | null {
  switch (e.kind) {
    case 'rect': case 'image': return { x: e.x, y: e.y, w: e.w, h: e.h }
    case 'circle': return { x: e.cx - e.r, y: e.cy - e.r, w: 2 * e.r, h: 2 * e.r }
    case 'text': return textBox(e)
    default: return null
  }
}
const clamp = (v: number) => Math.max(0, Math.min(1, v))

/** Impronta della composizione: 6×6 celle, quanto ciascuna è occupata da testi grandi, foto e forme. */
function impronta(g: G): number[] {
  const v = new Array(36 * 3).fill(0)
  for (const e of g.els) {
    const b = boxOf(e)
    if (!b || area(b) > g.W * g.H * 0.95) continue
    const canale = e.kind === 'text' ? 0 : e.kind === 'image' ? 1 : 2
    if (e.kind === 'text' && e.size < 40 * g.u) continue
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      const c = { x: (g.W * i) / 6, y: (g.H * j) / 6, w: g.W / 6, h: g.H / 6 }
      const ix = Math.max(0, Math.min(b.x + b.w, c.x + c.w) - Math.max(b.x, c.x)), iy = Math.max(0, Math.min(b.y + b.h, c.y + c.h) - Math.max(b.y, c.y))
      v[(j * 6 + i) * 3 + canale] = Math.min(1, v[(j * 6 + i) * 3 + canale] + (ix * iy) / area(c))
    }
  }
  return v
}

/** Media delle impronte per archetipo (in memoria per la sessione). */
const MEDIE = new Map<string, { n: number; v: number[] }>()
export const dimenticaMedie = () => MEDIE.clear()

export function carattere(g: G): Carattere {
  const testi = g.els.filter((e): e is Text => e.kind === 'text' && (e.opacity ?? 1) > 0.05)
  /* dominanza: i pesi visivi dei candidati punto focale (titolo intero, parola gesto, foto, forme piene), il primo contro il secondo */
  const titolo = testi.filter(t => !t.deco && t.name.startsWith('titolo'))
  const pesi: number[] = []
  if (titolo.length) pesi.push(titolo.reduce((a, t) => a + area(textBox(t)), 0) * 1.4)
  for (const e of g.els) {
    if (e.kind === 'text') { if (e.deco && e.size > 120 * g.u) pesi.push(area(textBox(e)) * 0.6); continue }
    const b = boxOf(e)
    if (!b || area(b) > g.W * g.H * 0.9) continue
    pesi.push(area(b) * (e.kind === 'image' ? 1 : 0.7))
  }
  pesi.sort((a, b) => b - a)
  const dominanza = pesi.length < 2 ? 1 : clamp((pesi[0] / Math.max(1, pesi[1]) - 1) / 3)
  /* contrasto di scala: il corpo più grande contro il più grande dei testi di lettura */
  const grande = Math.max(0, ...testi.map(t => t.size))
  const lettura = Math.max(1, ...testi.filter(t => !t.deco && !t.name.startsWith('titolo')).map(t => t.size))
  const scala = clamp(Math.log(grande / lettura) / Math.log(10))
  /* ornamenti: quelli che l'idea della tavola non motiva */
  const motivi = new Set((g.k as { idea?: { motivi?: string[] } }).idea?.motivi ?? [])
  let orn = 0
  const contati = new Set<string>()
  for (const e of g.els) {
    const o = ORNAMENTI.find(([re]) => re.test(e.name))
    if (!o || motivi.has(o[1]) || contati.has(e.name)) continue
    contati.add(e.name); orn++
  }
  if (g.k.grana > 0.05 && !motivi.has('materia')) orn += 0.5
  const ornamenti = clamp(orn * 0.1)
  /* genericità: distanza dalla media dell'archetipo (neutra finché la media non ha almeno 4 tavole) */
  const imp = impronta(g)
  const m = MEDIE.get(g.k.sistema)
  const dist = m ? imp.reduce((a, x, i) => a + Math.abs(x - m.v[i]), 0) / imp.length : 0
  const genericita = !m || m.n < 4 ? 0.5 : clamp(1 - dist / 0.25)
  if (!m) MEDIE.set(g.k.sistema, { n: 1, v: imp })
  else { m.n++; m.v = m.v.map((x, i) => x + (imp[i] - x) / m.n) }
  // l'intreccio voluto è profondità progettata: un gradino in più
  const intreccio = g.segni?.some(s => s.startsWith('intreccio:')) || g.els.some(e => (e as { intreccio?: unknown }).intreccio) ? 0.08 : 0
  const base = 0.35 * dominanza + 0.3 * scala + 0.35 * (1 - genericita) + intreccio
  return { carattere: Math.round(100 * clamp(base - ornamenti)), dominanza, scala, ornamenti, genericita }
}
