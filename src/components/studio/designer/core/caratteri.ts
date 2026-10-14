/**
 * Raccolta di caratteri (Google Fonts) con la loro personalità, e abbinamenti
 * per affinità: il registro indica una direzione (giocoso, elegante, tecnico,
 * caldo, sperimentale, forte, morbido), il seme sceglie tra i candidati più
 * vicini; ogni tanto si pesca apposta fuori direzione, per sorprendere.
 * I pesi elencati sono quelli che Google Fonts serve davvero.
 */
import type { FontSpec } from '../types'
import type { Rng } from '../gen/knobs'

export type Tratto = 'giocoso' | 'elegante' | 'tecnico' | 'caldo' | 'sperimentale' | 'forte' | 'morbido'
export type Personalita = Partial<Record<Tratto, number>>

export interface Carattere {
  family: string
  pesi: number[]
  corsivo?: boolean
  ruoli: ('titolo' | 'testo' | 'etichetta')[]
  sans: boolean
  mono?: boolean
  /** regge il tutto maiuscolo */
  maiuscolo?: boolean
  p: Personalita
}

const V = (a: number, b: number) => Array.from({ length: (b - a) / 100 + 1 }, (_, i) => a + i * 100)

export const CARATTERI: Carattere[] = [
  // graziati da titolo
  { family: 'Fraunces', pesi: V(100, 900), corsivo: true, ruoli: ['titolo'], sans: false, p: { caldo: 0.9, morbido: 0.6, elegante: 0.5, giocoso: 0.3 } },
  { family: 'Instrument Serif', pesi: [400], corsivo: true, ruoli: ['titolo'], sans: false, p: { elegante: 0.9, caldo: 0.4 } },
  { family: 'DM Serif Display', pesi: [400], corsivo: true, ruoli: ['titolo'], sans: false, p: { elegante: 0.7, forte: 0.5, caldo: 0.4 } },
  { family: 'Bodoni Moda', pesi: V(400, 900), corsivo: true, ruoli: ['titolo'], sans: false, p: { elegante: 1, forte: 0.3 } },
  { family: 'Playfair Display', pesi: V(400, 900), corsivo: true, ruoli: ['titolo'], sans: false, p: { elegante: 0.8, caldo: 0.3 } },
  { family: 'Gloock', pesi: [400], ruoli: ['titolo'], sans: false, p: { elegante: 0.6, forte: 0.6, sperimentale: 0.3 } },
  { family: 'Young Serif', pesi: [400], ruoli: ['titolo'], sans: false, p: { caldo: 0.8, giocoso: 0.4, morbido: 0.5 } },
  { family: 'Cormorant Garamond', pesi: V(300, 700), corsivo: true, ruoli: ['titolo'], sans: false, p: { elegante: 0.95, caldo: 0.3 } },
  { family: 'Rozha One', pesi: [400], ruoli: ['titolo'], sans: false, maiuscolo: true, p: { forte: 0.8, elegante: 0.5 } },
  { family: 'Newsreader', pesi: V(200, 800), corsivo: true, ruoli: ['titolo', 'testo'], sans: false, p: { elegante: 0.6, caldo: 0.6 } },
  { family: 'Spectral', pesi: V(200, 800), corsivo: true, ruoli: ['testo'], sans: false, p: { elegante: 0.6, caldo: 0.4 } },
  { family: 'Literata', pesi: V(200, 900), corsivo: true, ruoli: ['testo'], sans: false, p: { caldo: 0.7 } },
  { family: 'Source Serif 4', pesi: V(200, 900), corsivo: true, ruoli: ['testo'], sans: false, p: { elegante: 0.4, tecnico: 0.3 } },
  // grotesk e bastoni da titolo
  { family: 'Inter', pesi: V(100, 900), ruoli: ['titolo', 'testo', 'etichetta'], sans: true, maiuscolo: true, p: { tecnico: 0.8, forte: 0.4 } },
  { family: 'Archivo', pesi: V(100, 900), ruoli: ['titolo', 'testo', 'etichetta'], sans: true, maiuscolo: true, p: { tecnico: 0.6, forte: 0.6 } },
  { family: 'Archivo Black', pesi: [400], ruoli: ['titolo'], sans: true, maiuscolo: true, p: { forte: 1, sperimentale: 0.3 } },
  { family: 'Bricolage Grotesque', pesi: V(200, 800), ruoli: ['titolo'], sans: true, p: { giocoso: 0.7, sperimentale: 0.5, caldo: 0.4, forte: 0.5 } },
  { family: 'Space Grotesk', pesi: V(300, 700), ruoli: ['titolo', 'testo'], sans: true, maiuscolo: true, p: { tecnico: 0.9, sperimentale: 0.4 } },
  { family: 'Syne', pesi: V(400, 800), ruoli: ['titolo'], sans: true, maiuscolo: true, p: { sperimentale: 1, forte: 0.5 } },
  { family: 'Unbounded', pesi: V(200, 900), ruoli: ['titolo'], sans: true, maiuscolo: true, p: { sperimentale: 0.8, forte: 0.7, giocoso: 0.3 } },
  { family: 'Familjen Grotesk', pesi: V(400, 700), ruoli: ['titolo', 'testo'], sans: true, p: { tecnico: 0.5, caldo: 0.4, sperimentale: 0.3 } },
  { family: 'Hanken Grotesk', pesi: V(100, 900), ruoli: ['titolo', 'testo', 'etichetta'], sans: true, p: { tecnico: 0.5, morbido: 0.3 } },
  { family: 'Schibsted Grotesk', pesi: V(400, 900), ruoli: ['titolo', 'testo'], sans: true, maiuscolo: true, p: { forte: 0.6, tecnico: 0.5 } },
  { family: 'Instrument Sans', pesi: V(400, 700), ruoli: ['titolo', 'testo', 'etichetta'], sans: true, p: { tecnico: 0.5, elegante: 0.4 } },
  { family: 'Sora', pesi: V(100, 800), ruoli: ['titolo', 'testo'], sans: true, p: { tecnico: 0.7, morbido: 0.4 } },
  { family: 'Outfit', pesi: V(100, 900), ruoli: ['titolo', 'testo'], sans: true, p: { morbido: 0.6, tecnico: 0.5, giocoso: 0.3 } },
  { family: 'Epilogue', pesi: V(100, 900), ruoli: ['titolo', 'testo'], sans: true, maiuscolo: true, p: { forte: 0.6, sperimentale: 0.4 } },
  { family: 'Darker Grotesque', pesi: V(300, 900), ruoli: ['titolo'], sans: true, p: { sperimentale: 0.7, elegante: 0.4 } },
  { family: 'Big Shoulders Display', pesi: V(100, 900), ruoli: ['titolo'], sans: true, maiuscolo: true, p: { forte: 1, tecnico: 0.4 } },
  { family: 'Anton', pesi: [400], ruoli: ['titolo'], sans: true, maiuscolo: true, p: { forte: 1 } },
  { family: 'Bebas Neue', pesi: [400], ruoli: ['titolo'], sans: true, maiuscolo: true, p: { forte: 0.9, tecnico: 0.3 } },
  { family: 'Oswald', pesi: V(200, 700), ruoli: ['titolo'], sans: true, maiuscolo: true, p: { forte: 0.8 } },
  { family: 'Antonio', pesi: V(100, 700), ruoli: ['titolo'], sans: true, maiuscolo: true, p: { forte: 0.7, elegante: 0.3 } },
  { family: 'Chivo', pesi: V(100, 900), ruoli: ['titolo', 'testo'], sans: true, maiuscolo: true, p: { forte: 0.6, tecnico: 0.5 } },
  { family: 'Rubik', pesi: V(300, 900), ruoli: ['titolo', 'testo'], sans: true, p: { morbido: 0.7, giocoso: 0.5 } },
  { family: 'Lexend', pesi: V(100, 900), ruoli: ['titolo', 'testo'], sans: true, p: { morbido: 0.5, tecnico: 0.5 } },
  // tondi e giocosi
  { family: 'Baloo 2', pesi: V(400, 800), ruoli: ['titolo'], sans: true, p: { giocoso: 1, morbido: 1, caldo: 0.5 } },
  { family: 'Fredoka', pesi: V(300, 700), ruoli: ['titolo', 'testo'], sans: true, p: { giocoso: 0.9, morbido: 1 } },
  { family: 'Nunito', pesi: V(200, 900), ruoli: ['titolo', 'testo', 'etichetta'], sans: true, p: { morbido: 0.8, giocoso: 0.5, caldo: 0.4 } },
  { family: 'Quicksand', pesi: V(300, 700), ruoli: ['titolo', 'testo'], sans: true, p: { morbido: 0.8, elegante: 0.3 } },
  { family: 'Chewy', pesi: [400], ruoli: ['titolo'], sans: true, p: { giocoso: 1, morbido: 0.7 } },
  { family: 'Bowlby One', pesi: [400], ruoli: ['titolo'], sans: true, p: { forte: 0.8, giocoso: 0.6, caldo: 0.5 } },
  { family: 'Shrikhand', pesi: [400], ruoli: ['titolo'], sans: false, p: { giocoso: 0.8, caldo: 0.8 } },
  { family: 'Rammetto One', pesi: [400], ruoli: ['titolo'], sans: true, p: { giocoso: 0.8, forte: 0.7 } },
  { family: 'Caveat', pesi: V(400, 700), ruoli: ['titolo'], sans: false, p: { caldo: 0.8, giocoso: 0.6, morbido: 0.5 } },
  // testo
  { family: 'DM Sans', pesi: V(100, 900), ruoli: ['testo', 'etichetta'], sans: true, p: { morbido: 0.4, tecnico: 0.4 } },
  { family: 'Jost', pesi: V(100, 900), ruoli: ['testo', 'etichetta'], sans: true, p: { elegante: 0.6, tecnico: 0.3 } },
  { family: 'Manrope', pesi: V(200, 800), ruoli: ['testo', 'etichetta'], sans: true, p: { tecnico: 0.5, morbido: 0.4 } },
  { family: 'Work Sans', pesi: V(100, 900), ruoli: ['testo', 'etichetta'], sans: true, p: { tecnico: 0.4, caldo: 0.3 } },
  { family: 'Karla', pesi: V(200, 800), ruoli: ['testo', 'etichetta'], sans: true, p: { caldo: 0.4, sperimentale: 0.2 } },
  { family: 'Figtree', pesi: V(300, 900), ruoli: ['testo', 'etichetta'], sans: true, p: { morbido: 0.5, giocoso: 0.3 } },
  { family: 'Barlow', pesi: V(100, 900), ruoli: ['testo', 'etichetta'], sans: true, p: { tecnico: 0.5, forte: 0.3 } },
  { family: 'Barlow Condensed', pesi: V(100, 900), ruoli: ['etichetta'], sans: true, maiuscolo: true, p: { forte: 0.6, tecnico: 0.5 } },
  // mono
  { family: 'Space Mono', pesi: [400, 700], ruoli: ['testo', 'etichetta'], sans: true, mono: true, p: { tecnico: 0.8, sperimentale: 0.7 } },
  { family: 'IBM Plex Mono', pesi: V(100, 700), ruoli: ['testo', 'etichetta'], sans: true, mono: true, p: { tecnico: 1 } },
  { family: 'DM Mono', pesi: [300, 400, 500], ruoli: ['etichetta'], sans: true, mono: true, p: { tecnico: 0.7, morbido: 0.3 } },
  { family: 'JetBrains Mono', pesi: V(100, 800), ruoli: ['testo', 'etichetta'], sans: true, mono: true, p: { tecnico: 0.9 } },
]

const TRATTI: Tratto[] = ['giocoso', 'elegante', 'tecnico', 'caldo', 'sperimentale', 'forte', 'morbido']
const affinita = (a: Personalita, b: Personalita) => TRATTI.reduce((n, t) => n + (a[t] ?? 0) * (b[t] ?? 0), 0) / (Math.hypot(...TRATTI.map(t => a[t] ?? 0)) * Math.hypot(...TRATTI.map(t => b[t] ?? 0)) || 1)

/** Sceglie per affinità con un po' di caso: i primi candidati pesano di più, ma non sono gli unici. */
function scegli(r: Rng, list: Carattere[], dir: Personalita, temperatura = 0.12, fuori = 0.12): Carattere {
  if (r.chance(fuori)) return r.pick(list)
  const scored = list.map(c => ({ c, w: Math.exp(affinita(c.p, dir) / temperatura) }))
  const tot = scored.reduce((a, s) => a + s.w, 0)
  let x = r.next() * tot
  for (const s of scored) { if ((x -= s.w) <= 0) return s.c }
  return scored[0].c
}

const peso = (c: Carattere, voluto: number) => c.pesi.reduce((best, p) => (Math.abs(p - voluto) < Math.abs(best - voluto) ? p : best), c.pesi[0])

export interface Abbinamento { display: FontSpec; text: FontSpec; label: FontSpec; impact: FontSpec; impactSans: boolean; displayUpper: boolean; displaySerif: boolean; corsivo: boolean; nome: string }

/** Abbinamento di caratteri per una direzione di personalità. */
export function abbina(r: Rng, dir: Personalita, opts: { maiuscolo?: number } = {}): Abbinamento {
  const titoli = CARATTERI.filter(c => c.ruoli.includes('titolo'))
  const d = scegli(r, titoli, dir)
  const forte = dir.forte ?? 0, elegante = dir.elegante ?? 0, giocoso = dir.giocoso ?? 0
  const display: FontSpec = { family: d.family, weight: peso(d, forte > 0.6 ? 800 : giocoso > 0.6 ? 700 : elegante > 0.6 ? 400 : 600) }
  // testo: di solito contrasta il titolo (graziato con bastoni, e viceversa); lo stesso carattere solo se è da testo
  const testi = CARATTERI.filter(c => c.ruoli.includes('testo') && !(c.mono && (dir.tecnico ?? 0) < 0.5 && (dir.sperimentale ?? 0) < 0.5))
  const voglioSans = d.sans ? r.chance(0.7) : r.chance(0.85)
  const pool = testi.filter(c => c.sans === voglioSans || (d.ruoli.includes('testo') && c.family === d.family))
  const t = scegli(r, pool.length ? pool : testi, { ...dir, sperimentale: (dir.sperimentale ?? 0) * 0.5 }, 0.2, 0.08)
  const text: FontSpec = { family: t.family, weight: peso(t, elegante > 0.7 ? 300 : 400) }
  // etichette: il carattere del testo in neretto, oppure un mono (tecnico, sperimentale), oppure un condensato (forte)
  const lab = (dir.tecnico ?? 0) + (dir.sperimentale ?? 0) > 1 && r.chance(0.6) ? r.pick(CARATTERI.filter(c => c.mono))
    : forte > 0.8 && r.chance(0.4) ? CARATTERI.find(c => c.family === 'Barlow Condensed')!
      : t.ruoli.includes('etichetta') ? t : CARATTERI.find(c => c.family === 'DM Sans')!
  const label: FontSpec = { family: lab.family, weight: peso(lab, lab.mono ? 500 : 700) }
  // carattere da manifesto: il titolo al massimo peso se è un bastone pesante, altrimenti un condensato forte
  const pesanti = CARATTERI.filter(c => c.ruoli.includes('titolo') && c.sans && (c.pesi[c.pesi.length - 1] >= 800 || ['Anton', 'Archivo Black', 'Bebas Neue', 'Bowlby One', 'Rammetto One'].includes(c.family)))
  const imp = d.sans && d.pesi[d.pesi.length - 1] >= 800 ? d : scegli(r, pesanti, { ...dir, forte: 1 }, 0.15, 0.1)
  const impact: FontSpec = { family: imp.family, weight: imp.pesi[imp.pesi.length - 1] }
  const displayUpper = !!d.maiuscolo && r.chance(opts.maiuscolo ?? 0.25)
  return {
    display, text, label, impact, impactSans: imp.sans, displayUpper, displaySerif: !d.sans, corsivo: !!d.corsivo,
    nome: `${d.family}${t.family !== d.family ? ' + ' + t.family : ''}`,
  }
}
