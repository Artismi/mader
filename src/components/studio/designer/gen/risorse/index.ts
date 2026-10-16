/**
 * Risorse dello Studio nel motore: un passaggio comune a tutti gli archetipi
 * (in `finish`, prima dei controlli di lettura e degli spazi) che collega
 * effetti e filtri del catalogo completo, generatori procedurali, oggetti 3D
 * e toglie le forme senza motivo. Deterministico dal seme della tavola.
 */
import type { SceneEl, FxSpec } from '../../types'
import { textBox, lum, type G } from '../tools'
import { rng, hashText, type Rng } from '../knobs'
import { scegliFx, looksPer } from './effetti'

type Box = { x: number; y: number; w: number; h: number }
type Testo = Extract<SceneEl, { kind: 'text' }>
const area = (b: Box) => b.w * b.h
const inter = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
const boxOf = (e: SceneEl): Box | null => (e.kind === 'rect' || e.kind === 'image' || e.kind === 'ornament') ? { x: e.x, y: e.y, w: e.w, h: e.h } : e.kind === 'circle' ? { x: e.cx - e.r, y: e.cy - e.r, w: 2 * e.r, h: 2 * e.r } : null

export const testi = (g: G) => g.els.filter(e => e.kind === 'text' && !e.deco) as Testo[]
export const rngRisorse = (g: G, chiave: string): Rng => rng(hashText(`${g.c.title}|${g.k.sistema}|${g.k.seme}|${chiave}`))

/** Colori della tavola per tingere gli effetti (accento, secondo, inchiostro, superficie). */
const colori = (g: G) => [g.P.acc, g.P.acc2, g.P.fg, g.P.srf]

/** Quota del riquadro coperta da testi veri. */
export function coperturaTesti(g: G, b: Box) {
  return testi(g).reduce((a, t) => a + inter(b, textBox(t)), 0) / Math.max(1, area(b))
}

/* ── 1. effetti e filtri dal catalogo completo ──────────────────────────── */
function effetti(g: G) {
  const r = rngRisorse(g, 'fx'), reg = g.s.registro, pick = <X,>(l: readonly X[]) => r.pick(l as X[])
  const usati: string[] = []
  const aggiungi = (e: { fx?: FxSpec[] }, f: FxSpec | null) => { if (f) { e.fx = [...(e.fx ?? []), f]; usati.push(f.id) } }

  // foto: un filtro pronto e un effetto; le copie della stessa foto (strisce, celle) prendono lo stesso trattamento
  const foto = g.els.filter(e => e.kind === 'image' && e.url) as Extract<SceneEl, { kind: 'image' }>[]
  if (foto.length) {
    const main = foto.reduce((a, b) => (area(b) > area(a) ? b : a))
    const sotto = coperturaTesti(g, main) > 0.02
    const look = !main.look && r.chance(0.55) ? pick(looksPer(reg)) : undefined
    const ha = (main.fx ?? []).length > 0
    const f = !ha && r.chance(0.65) ? scegliFx(pick, 'foto', reg, colori(g), sotto ? 0.2 : 0.45) : null
    for (const e of foto.filter(x => x.url === main.url)) {
      if (look) e.look = look
      if (f) aggiungi(e, { ...f })
    }
  }

  // fondi e forme grandi senza effetti: trama o riempimento se nessun testo ci passa sopra, solo trama leggera se sì
  const grandi = g.els.filter(e => (e.kind === 'rect' && typeof e.fill === 'string') || e.kind === 'circle')
    .filter(e => !(e as { fx?: FxSpec[] }).fx?.length && area(boxOf(e)!) > g.W * g.H * 0.08)
  for (const e of grandi.slice(0, 2)) {
    if (!r.chance(0.35)) continue
    const libera = coperturaTesti(g, boxOf(e)!) < 0.02
    const b = libera ? (r.chance(0.5) ? 'fondo' : 'forma') : 'fondo'
    aggiungi(e as { fx?: FxSpec[] }, scegliFx(pick, b, reg, colori(g), libera ? 0.3 : 0.05, libera ? usati : [...usati, 'genFill', 'caleido', 'raggi', 'gradientOverlay', 'luceProiettata']))
  }

  // titolo: solo il testo più grande, solo se è davvero grande, solo effetti che non ne coprono la lettura
  const ts = testi(g).filter(t => !t.hollow && !t.fx?.length && !t.chars?.length)
  const titolo = ts.reduce<Testo | null>((a, t) => (!a || t.size > a.size ? t : a), null)
  if (titolo && titolo.size >= g.H * 0.07 && r.chance(0.3)) {
    const scuro = lum(g.P.bg) < 0.2
    const max = titolo.size >= g.H * 0.14 ? 0.3 : 0.15
    const escludi = [...usati, ...(scuro ? [] : ['neon', 'outerGlow'])]
    aggiungi(titolo, scegliFx(pick, 'titolo', reg, colori(g), max, escludi))
  }
}

/** Il passaggio delle risorse dello Studio (chiamato da `finish`). */
export function arricchisci(g: G) {
  effetti(g)
}
