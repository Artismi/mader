/**
 * Identità di progetto: palette e caratteri generati per ogni progetto invece
 * di scelti da un elenco. Il registro è una tendenza (saturazione, toni,
 * armonie, personalità dei caratteri, forme, accenti, trattamenti), non un
 * preset; il seme decide, e ogni tanto l'identità mescola il registro con un
 * vicino. La stessa identità (stesso id) torna identica: coerenza tra slide.
 *
 * id: "id:<registro>:<seme>:<tinta>:<armonia>:<tono>" (campi vuoti = liberi)
 */
import type { Style, RegistroId } from './styles'
import { generaPalette, pesato, type TendenzaColore, type Armonia, type Tono } from './core/colore'
import { abbina, type Personalita } from './core/caratteri'
import { rng, hashText } from './gen/knobs'

interface Tendenza {
  colore: TendenzaColore
  persona: Personalita
  forme: Partial<Record<Style['forma'], number>>
  accenti: Partial<Record<Style['accento'], number>>
  looks: string[]
  finiture: string[][]
  ornamenti: string[]
  glifi: string[]
  maiuscolo: number
  grana: number
}

export const TENDENZE: Record<RegistroId, Tendenza> = {
  infantile: {
    colore: { toni: { chiaro: 0.6, colore: 0.4 }, armonie: { triade: 0.35, complementari: 0.25, analoghi: 0.25, divisi: 0.15 }, croma: [0.13, 0.2], cromaFondo: [0.015, 0.04] },
    persona: { giocoso: 1, morbido: 1, caldo: 0.5 }, forme: { morbido: 0.75, mano: 0.25 }, accenti: { saltello: 0.55, colore: 0.45 },
    looks: ['vivace', 'luminoso', 'pastello'], finiture: [[]], ornamenti: ['memphis', 'onde', 'puntinato', 'anelli'], glifi: ['Sparkle', 'Twinkle', 'Bloom', 'Bloom 6', 'Halo Sparkle'], maiuscolo: 0.1, grana: 0.1,
  },
  pop: {
    colore: { toni: { colore: 0.45, chiaro: 0.4, scuro: 0.15 }, armonie: { complementari: 0.35, divisi: 0.25, triade: 0.2, acido: 0.2 }, croma: [0.16, 0.24], cromaFondo: [0.02, 0.05] },
    persona: { giocoso: 0.8, forte: 0.7, sperimentale: 0.3 }, forme: { morbido: 0.6, netto: 0.4 }, accenti: { colore: 0.8, saltello: 0.2 },
    looks: ['vivace', 'acido', 'lomo'], finiture: [[], ['grana']], ornamenti: ['memphis', 'strisce', 'raggiera', 'puntinato'], glifi: ['Starburst', 'Sparkle', 'Halftone Burst', 'Twinkle'], maiuscolo: 0.35, grana: 0.25,
  },
  editoriale: {
    colore: { toni: { chiaro: 0.65, scuro: 0.2, colore: 0.15 }, armonie: { neutri: 0.4, monocromo: 0.25, complementari: 0.2, analoghi: 0.15 }, croma: [0.1, 0.18], cromaFondo: [0.005, 0.025] },
    persona: { elegante: 0.8, caldo: 0.5 }, forme: { netto: 0.75, mano: 0.25 }, accenti: { corsivo: 0.75, colore: 0.25 },
    looks: ['trix', 'argento', 'bn', 'portra'], finiture: [['carta']], ornamenti: ['sovrastampa', 'archi', 'puntinato'], glifi: ['Glint', 'Twinkle', 'Halftone Star'], maiuscolo: 0.2, grana: 0.4,
  },
  svizzero: {
    colore: { toni: { chiaro: 0.6, colore: 0.25, scuro: 0.15 }, armonie: { neutri: 0.5, monocromo: 0.3, complementari: 0.2 }, croma: [0.18, 0.24], cromaFondo: [0, 0.01], tinte: [[20, 35], [250, 265], [85, 100]] },
    persona: { tecnico: 0.9, forte: 0.6 }, forme: { netto: 1 }, accenti: { colore: 1 },
    looks: ['nitido', 'bn'], finiture: [['retino'], []], ornamenti: ['tessere', 'strisce', 'anelli'], glifi: ['Target', 'Cross Flare', 'Squares'], maiuscolo: 0.3, grana: 0.15,
  },
  avanguardia: {
    colore: { toni: { scuro: 0.4, chiaro: 0.35, colore: 0.25 }, armonie: { acido: 0.35, monocromo: 0.25, complementari: 0.2, neutri: 0.2 }, croma: [0.2, 0.3], cromaFondo: [0, 0.02] },
    persona: { sperimentale: 1, forte: 0.6, tecnico: 0.4 }, forme: { decostruito: 0.7, mano: 0.3 }, accenti: { colore: 0.8, corsivo: 0.2 },
    looks: ['bleach', 'noir', 'acido', 'cianotipia'], finiture: [['grunge', 'graffi'], ['grana']], ornamenti: ['schizzo', 'sovrastampa', 'sfaccettato', 'tessere'], glifi: ['Cross Flare', 'Target', 'Orbit X', 'Halftone Burst'], maiuscolo: 0.6, grana: 0.55,
  },
  lusso: {
    colore: { toni: { scuro: 0.45, chiaro: 0.45, colore: 0.1 }, armonie: { neutri: 0.4, monocromo: 0.35, analoghi: 0.25 }, croma: [0.05, 0.11], cromaFondo: [0.005, 0.025], tinte: [[60, 95], [340, 360], [0, 20], [150, 170]] },
    persona: { elegante: 1, morbido: 0.3 }, forme: { netto: 0.8, morbido: 0.2 }, accenti: { corsivo: 0.85, colore: 0.15 },
    looks: ['morbido', 'argento', 'portra'], finiture: [['carta'], []], ornamenti: ['archi', 'sfera', 'onde'], glifi: ['Sparkle Slim', 'Halo Wide', 'Twinkle'], maiuscolo: 0.35, grana: 0.15,
  },
  artigianale: {
    colore: { toni: { chiaro: 0.65, scuro: 0.2, colore: 0.15 }, armonie: { analoghi: 0.4, complementari: 0.2, monocromo: 0.2, neutri: 0.2 }, croma: [0.07, 0.14], cromaFondo: [0.02, 0.05], tinte: [[30, 95], [110, 160], [15, 35]] },
    persona: { caldo: 1, morbido: 0.4, elegante: 0.3 }, forme: { mano: 0.55, morbido: 0.25, netto: 0.2 }, accenti: { corsivo: 0.6, colore: 0.4 },
    looks: ['polaroid', 'portra', 'caldo'], finiture: [['carta', 'grana'], ['carta']], ornamenti: ['schizzo', 'archi', 'onde', 'flusso'], glifi: ['Bloom', 'Bloom 6', 'Thorn Branch', 'Thorn Stem'], maiuscolo: 0.15, grana: 0.4,
  },
  notte: {
    colore: { toni: { scuro: 0.85, colore: 0.15 }, armonie: { complementari: 0.3, acido: 0.3, divisi: 0.2, monocromo: 0.2 }, croma: [0.18, 0.28], cromaFondo: [0.01, 0.04] },
    persona: { forte: 1, sperimentale: 0.5, tecnico: 0.3 }, forme: { netto: 0.8, decostruito: 0.2 }, accenti: { colore: 1 },
    looks: ['cinestill', 'notturno', 'vapor'], finiture: [['grunge', 'graffi'], ['grana']], ornamenti: ['anelli', 'strisce', 'puntinato'], glifi: ['Starburst Alt', 'Saturn Sparkle', 'Orbit X', 'Halftone Burst'], maiuscolo: 0.7, grana: 0.5,
  },
  tech: {
    colore: { toni: { chiaro: 0.5, scuro: 0.4, colore: 0.1 }, armonie: { analoghi: 0.35, complementari: 0.25, monocromo: 0.25, neutri: 0.15 }, croma: [0.14, 0.22], cromaFondo: [0.005, 0.03], tinte: [[200, 300], [150, 180]] },
    persona: { tecnico: 1, morbido: 0.3 }, forme: { morbido: 0.6, netto: 0.4 }, accenti: { colore: 1 },
    looks: ['luminoso', 'freddo', 'nitido'], finiture: [[]], ornamenti: ['sfaccettato', 'vetrata', 'anelli'], glifi: ['Globe', 'Lens Grid', 'Orbit Twin', 'Gear Line'], maiuscolo: 0.2, grana: 0.08,
  },
  retro: {
    colore: { toni: { chiaro: 0.5, scuro: 0.3, colore: 0.2 }, armonie: { analoghi: 0.4, triade: 0.2, complementari: 0.2, divisi: 0.2 }, croma: [0.12, 0.2], cromaFondo: [0.03, 0.06], tinte: [[30, 90], [300, 350], [180, 210]] },
    persona: { caldo: 0.7, giocoso: 0.5, forte: 0.6 }, forme: { morbido: 0.7, netto: 0.3 }, accenti: { colore: 0.9, saltello: 0.1 },
    looks: ['scaduta', 'polaroid', 'tramonto', 'vapor'], finiture: [['grana', 'polvere']], ornamenti: ['raggiera', 'strisce', 'memphis'], glifi: ['Starburst', 'Sparkle', 'Halo Sparkle'], maiuscolo: 0.4, grana: 0.5,
  },
  sportivo: {
    colore: { toni: { scuro: 0.5, chiaro: 0.3, colore: 0.2 }, armonie: { complementari: 0.35, divisi: 0.25, monocromo: 0.2, acido: 0.2 }, croma: [0.18, 0.26], cromaFondo: [0, 0.02] },
    persona: { forte: 1, tecnico: 0.4 }, forme: { netto: 0.9, decostruito: 0.1 }, accenti: { colore: 1 },
    looks: ['nitido', 'bleach', 'tealorange'], finiture: [['graffi'], ['grana']], ornamenti: ['strisce', 'tessere', 'anelli'], glifi: ['Starburst Alt', 'Cross Flare', 'Target'], maiuscolo: 0.85, grana: 0.3,
  },
}

/** Registri vicini: da qui arrivano i mix inattesi (editoriale con avanguardia, infantile con retrò…). */
export const VICINI: Record<RegistroId, RegistroId[]> = {
  infantile: ['pop', 'retro', 'artigianale'], pop: ['retro', 'infantile', 'avanguardia', 'notte'], editoriale: ['lusso', 'svizzero', 'avanguardia', 'artigianale'],
  svizzero: ['editoriale', 'tech', 'avanguardia'], avanguardia: ['notte', 'editoriale', 'pop', 'svizzero'], lusso: ['editoriale', 'artigianale'],
  artigianale: ['editoriale', 'retro', 'lusso'], notte: ['avanguardia', 'pop', 'sportivo'], tech: ['svizzero', 'pop'], retro: ['pop', 'artigianale', 'notte'], sportivo: ['notte', 'svizzero', 'pop'],
}

export interface OpzioniIdentita { tinta?: number; armonia?: Armonia; tono?: Tono }

export const idIdentita = (registro: RegistroId, seme: number, o: OpzioniIdentita = {}) => `id:${registro}:${seme}:${o.tinta ?? ''}:${o.armonia ?? ''}:${o.tono ?? ''}`

const cache = new Map<string, Style>()

/** Identità generata (deterministica per id). */
export function identita(registro: RegistroId, seme: number, o: OpzioniIdentita = {}): Style {
  const id = idIdentita(registro, seme, o)
  const hit = cache.get(id)
  if (hit) return hit
  const r = rng(hashText(id))
  const T = TENDENZE[registro]
  // mix: a volte i caratteri o i colori vengono dal registro vicino
  const mix = r.chance(0.22) ? TENDENZE[r.pick(VICINI[registro])] : null
  const colore = mix && r.chance(0.5) ? mix.colore : T.colore
  const persona: Personalita = mix && colore === T.colore
    ? Object.fromEntries([...new Set([...Object.keys(T.persona), ...Object.keys(mix.persona)])].map(k => [k, ((T.persona as Record<string, number>)[k] ?? 0) * 0.6 + ((mix.persona as Record<string, number>)[k] ?? 0) * 0.4]))
    : T.persona
  const pal = generaPalette(r, colore, o)
  const ab = abbina(r, persona, { maiuscolo: T.maiuscolo })
  let accento = pesato(r, T.accenti)
  if (accento === 'corsivo' && !ab.corsivo) accento = 'colore'
  const forma = pesato(r, T.forme)
  const style: Style = {
    id, name: `${pal.nome} · ${ab.nome}`, registro, forma, accento,
    dark: pal.dark, bg: pal.bg, surface: pal.surface, ink: pal.ink, muted: pal.muted, accent: pal.accent, accent2: pal.accent2, onAccent: pal.onAccent,
    display: ab.display, displayUpper: ab.displayUpper,
    displayTracking: ab.displaySerif ? -0.01 : ab.displayUpper ? -0.01 : -0.03, displayLeading: ab.displaySerif ? 0.98 : 0.92,
    text: ab.text, label: ab.label, impact: ab.impact, impactSans: ab.impactSans,
    keywords: [],
    decor: {
      look: r.pick(T.looks), adjust: { grain: Math.round(T.grana * 50) }, finishes: r.pick(T.finiture),
      fallback: T.grana > 0.3 ? (T.finiture.flat().includes('carta') ? 'carta' : 'grana') : undefined,
      ornaments: [...T.ornamenti, ...(mix ? [r.pick(mix.ornamenti)] : [])], glyphs: [...T.glifi, ...(mix ? [r.pick(mix.glifi)] : [])],
    },
  }
  cache.set(id, style)
  return style
}

/** Identità da id (null se l'id non è di un'identità generata). */
export function daId(id: string): Style | null {
  if (!id.startsWith('id:')) return null
  const [, registro, seme, tinta, armonia, tono] = id.split(':')
  if (!(registro in TENDENZE)) return null
  return identita(registro as RegistroId, Number(seme) || 0, {
    tinta: tinta ? Number(tinta) : undefined, armonia: (armonia || undefined) as Armonia | undefined, tono: (tono || undefined) as Tono | undefined,
  })
}
