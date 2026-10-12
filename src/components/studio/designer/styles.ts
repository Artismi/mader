/**
 * Stili del motore designer: palette ristrette (sfondo, superficie, inchiostro,
 * secondario, un solo accento) e una coppia di caratteri collaudata. Lo stile
 * si sceglie dal contenuto (parole del testo), non a caso: le proposte sono
 * varianti di impaginazione dello stesso progetto.
 */
import type { DesignKind, FontSpec } from './types'

export interface Style {
  id: string
  name: string
  dark: boolean
  bg: string
  surface: string
  ink: string
  muted: string
  accent: string
  /** secondo inchiostro (riso, sovrastampe): accordato all'accento */
  accent2: string
  onAccent: string
  display: FontSpec
  /** il titolo in maiuscolo (stili tipografici) */
  displayUpper?: boolean
  /** spaziatura del titolo in em (negativa per i grotesk pesanti) */
  displayTracking: number
  /** interlinea del titolo */
  displayLeading: number
  text: FontSpec
  label: FontSpec
  /** carattere da manifesto per i titoli enormi (pesante; `impactSans` = bastoni, regge il contorno vuoto) */
  impact: FontSpec
  impactSans: boolean
  keywords: string[]
  decor: Decor
}

/** Corredo dello stile: come si trattano foto, superfici e dettagli. */
export interface Decor {
  /** look pellicola per le foto e regolazioni (grana, vignettatura, halation) */
  look: string
  adjust: Record<string, number>
  /** finiture dai pack dell'utente (nomi di finish.ts) */
  finishes: string[]
  /** trama procedurale se non ci sono pack */
  fallback?: 'grana' | 'carta'
  /** ornamenti generativi adatti (compose/ornaments.ts) */
  ornaments: string[]
  /** glifi del set Celestial adatti (nomi) */
  glyphs: string[]
}

export const STYLES: Style[] = [
  {
    id: 'notte-calda', name: 'Notte calda', dark: true,
    bg: '#15100c', surface: '#231a13', ink: '#f2e8d8', muted: '#a8957e', accent: '#c8763a', accent2: '#e8b04a', onAccent: '#15100c',
    display: { family: 'Fraunces', weight: 400 }, displayTracking: -0.02, displayLeading: 0.98,
    text: { family: 'Inter', weight: 400 }, label: { family: 'Inter', weight: 600 },
    impact: { family: 'Big Shoulders Display', weight: 800 }, impactSans: true,
    keywords: ['caffè', 'caffe', 'coffee', 'espresso', 'torrefazione', 'tostatura', 'blend', 'notte', 'cioccolato', 'cacao', 'vino', 'whisky', 'rum', 'cocktail', 'bar', 'cena', 'autunno', 'inverno', 'spezie', 'tabacco', 'legno'],
    decor: { look: 'portra', adjust: { grain: 28, vignette: -35, halation: 18 }, finishes: ['grana', 'polvere'], fallback: 'grana', ornaments: ['isoipse', 'flusso', 'onde'], glyphs: ['Sparkle', 'Starburst', 'Halo Sparkle', 'Comet Trail'] },
  },
  {
    id: 'carta-editoriale', name: 'Carta editoriale', dark: false,
    bg: '#f2ede4', surface: '#e4dccd', ink: '#161412', muted: '#6e665d', accent: '#d2462a', accent2: '#1f4bd8', onAccent: '#f2ede4',
    display: { family: 'DM Serif Display', weight: 400 }, displayTracking: -0.015, displayLeading: 1.0,
    text: { family: 'DM Sans', weight: 400 }, label: { family: 'DM Sans', weight: 600 },
    impact: { family: 'Anton', weight: 400 }, impactSans: true,
    keywords: ['libro', 'libri', 'poesia', 'mostra', 'cultura', 'festival', 'rivista', 'editoriale', 'lettura', 'incontro', 'talk', 'museo', 'teatro', 'arte', 'galleria', 'storia'],
    decor: { look: 'trix', adjust: { grain: 30, vignette: -15 }, finishes: ['carta'], fallback: 'carta', ornaments: ['sovrastampa', 'puntinato', 'archi'], glyphs: ['Twinkle', 'Glint', 'Halftone Star'] },
  },
  {
    id: 'terra-artigiana', name: 'Terra artigiana', dark: false,
    bg: '#ede3d3', surface: '#dccdb6', ink: '#2b2119', muted: '#7b6a58', accent: '#a8502c', accent2: '#3f6b4a', onAccent: '#f6efe4',
    display: { family: 'Cormorant Garamond', weight: 500 }, displayTracking: -0.01, displayLeading: 0.95,
    text: { family: 'Jost', weight: 400 }, label: { family: 'Jost', weight: 500 },
    impact: { family: 'Fraunces', weight: 800 }, impactSans: false,
    keywords: ['artigianale', 'artigiano', 'ceramica', 'pane', 'forno', 'pasta', 'olio', 'naturale', 'fatto a mano', 'bottega', 'laboratorio', 'terra', 'lana', 'legno', 'osteria', 'trattoria', 'cucina', 'ricetta'],
    decor: { look: 'polaroid', adjust: { grain: 22, vignette: -20 }, finishes: ['carta', 'grana'], fallback: 'carta', ornaments: ['archi', 'tessere', 'onde'], glyphs: ['Bloom', 'Bloom 6', 'Thorn Branch'] },
  },
  {
    id: 'svizzero', name: 'Svizzero', dark: false,
    bg: '#f3f3f0', surface: '#e2e2dd', ink: '#111111', muted: '#6b6b6b', accent: '#e63312', accent2: '#1d3fd6', onAccent: '#ffffff',
    display: { family: 'Inter', weight: 800 }, displayTracking: -0.045, displayLeading: 0.92,
    text: { family: 'Inter', weight: 400 }, label: { family: 'Inter', weight: 600 },
    impact: { family: 'Inter', weight: 900 }, impactSans: true,
    keywords: ['architettura', 'studio', 'design', 'progetto', 'concorso', 'conferenza', 'workshop', 'corso', 'agenzia', 'consulenza', 'report', 'annuncio'],
    decor: { look: 'nitido', adjust: { grain: 8 }, finishes: ['retino'], ornaments: ['tessere', 'strisce', 'anelli'], glyphs: ['Target', 'Cross Flare', 'Squares'] },
  },
  {
    id: 'notte-elettrica', name: 'Notte elettrica', dark: true,
    bg: '#0b0b0c', surface: '#18181b', ink: '#f4f4f5', muted: '#8a8a93', accent: '#c6f432', accent2: '#ff3bd4', onAccent: '#0b0b0c',
    display: { family: 'Archivo Black', weight: 400 }, displayUpper: true, displayTracking: -0.02, displayLeading: 0.9,
    text: { family: 'Space Grotesk', weight: 400 }, label: { family: 'Space Mono', weight: 400 },
    impact: { family: 'Archivo Black', weight: 400 }, impactSans: true,
    keywords: ['techno', 'club', 'dj', 'serata', 'party', 'rave', 'concerto', 'live', 'line-up', 'lineup', 'musica', 'gaming', 'sport', 'evento'],
    decor: { look: 'cinestill', adjust: { grain: 35, vignette: -30, halation: 35 }, finishes: ['grunge', 'graffi'], fallback: 'grana', ornaments: ['anelli', 'strisce', 'puntinato'], glyphs: ['Starburst Alt', 'Saturn Sparkle', 'Orbit X', 'Halftone Burst'] },
  },
  {
    id: 'botanico', name: 'Botanico', dark: true,
    bg: '#1d2a21', surface: '#28372c', ink: '#ece8dc', muted: '#a3ad9c', accent: '#d8b76a', accent2: '#e07a5f', onAccent: '#1d2a21',
    display: { family: 'Fraunces', weight: 300 }, displayTracking: -0.02, displayLeading: 0.98,
    text: { family: 'Manrope', weight: 400 }, label: { family: 'Manrope', weight: 600 },
    impact: { family: 'Fraunces', weight: 700 }, impactSans: false,
    keywords: ['piante', 'pianta', 'verde', 'bio', 'biologico', 'vegan', 'tè', 'te verde', 'erbe', 'giardino', 'fiori', 'natura', 'sostenibile', 'benessere', 'yoga', 'spa'],
    decor: { look: 'fuji', adjust: { grain: 22, vignette: -25 }, finishes: ['grana', 'luce'], fallback: 'grana', ornaments: ['flusso', 'isoipse', 'vetrata'], glyphs: ['Thorn Stem', 'Bloom 12', 'Arc Wave'] },
  },
  {
    id: 'cipria', name: 'Cipria', dark: false,
    bg: '#f4e6e1', surface: '#ead3cb', ink: '#2a1c1e', muted: '#8c7175', accent: '#a3405a', accent2: '#2f4a7a', onAccent: '#fbf3f0',
    display: { family: 'Bodoni Moda', weight: 500 }, displayTracking: -0.01, displayLeading: 0.98,
    text: { family: 'Jost', weight: 400 }, label: { family: 'Jost', weight: 500 },
    impact: { family: 'Bodoni Moda', weight: 800 }, impactSans: false,
    keywords: ['beauty', 'bellezza', 'skincare', 'crema', 'profumo', 'moda', 'gioielli', 'sposa', 'matrimonio', 'make-up', 'trucco', 'parrucchiere', 'estetica'],
    decor: { look: 'morbido', adjust: { grain: 14, vignette: -12 }, finishes: ['carta'], fallback: 'carta', ornaments: ['archi', 'sfera', 'onde'], glyphs: ['Sparkle Slim', 'Halo Wide', 'Twinkle'] },
  },
  {
    id: 'chiaro-tech', name: 'Chiaro tech', dark: false,
    bg: '#f3f6fb', surface: '#e1e8f4', ink: '#0d1526', muted: '#5a6680', accent: '#2d5bff', accent2: '#ff6b3d', onAccent: '#ffffff',
    display: { family: 'Space Grotesk', weight: 700 }, displayTracking: -0.03, displayLeading: 0.95,
    text: { family: 'Inter', weight: 400 }, label: { family: 'Inter', weight: 600 },
    impact: { family: 'Space Grotesk', weight: 700 }, impactSans: true,
    keywords: ['app', 'software', 'digitale', 'startup', 'ai', 'tech', 'tecnologia', 'piattaforma', 'servizio', 'risparmi', 'banca', 'ios', 'android', 'scarica', 'fintech', 'salute', 'clinica', 'online', 'webinar'],
    decor: { look: 'luminoso', adjust: { grain: 6 }, finishes: [], ornaments: ['sfaccettato', 'vetrata', 'anelli'], glyphs: ['Globe', 'Lens Grid', 'Orbit Twin', 'Gear Line'] },
  },
]

const KIND_DEFAULT: Record<DesignKind, string> = {
  lancio: 'notte-calda', evento: 'notte-elettrica', citazione: 'carta-editoriale', annuncio: 'svizzero',
}

export const styleById = (id: string) => STYLES.find(s => s.id === id) ?? STYLES[0]

/** Stile dal contenuto: conta le parole chiave nel testo; a parità vale lo stile del tipo. */
export function inferStyle(text: string, kind: DesignKind): Style {
  // confronto sull'inizio delle parole: "arte" non deve scattare dentro "parte"
  const t = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `
  let best: Style | null = null, bestScore = 0
  for (const s of STYLES) {
    const score = s.keywords.reduce((n, k) => n + (t.includes(` ${k.replace(/[^\p{L}\p{N}]+/gu, ' ')}`) ? 1 : 0), 0)
    if (score > bestScore) { best = s; bestScore = score }
  }
  return best ?? styleById(KIND_DEFAULT[kind])
}

/** Tutti i caratteri che uno stile usa, da caricare prima di misurare. */
export const fontsOf = (s: Style): FontSpec[] => [s.display, s.text, s.label, s.impact]
