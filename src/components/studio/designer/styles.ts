/**
 * Stili del motore designer: palette ristrette (sfondo, superficie, inchiostro,
 * secondario, un solo accento) e una coppia di caratteri collaudata. Lo stile
 * si sceglie dal contenuto (parole del testo), non a caso: le proposte sono
 * varianti di impaginazione dello stesso progetto.
 */
import type { DesignKind, FontSpec } from './types'

/** Registri visivi: dal mondo dei bambini all'editoriale all'avanguardia. */
export type RegistroId = 'infantile' | 'pop' | 'editoriale' | 'svizzero' | 'avanguardia' | 'lusso' | 'artigianale' | 'notte' | 'tech' | 'retro' | 'sportivo'

export interface Style {
  id: string
  name: string
  /** registro visivo a cui appartiene */
  registro: RegistroId
  /** vocabolario di forme: morbide (blob, angoli tondi), nette, a mano, decostruite */
  forma: 'morbido' | 'netto' | 'mano' | 'decostruito'
  /** come si evidenzia la parola chiave: colore, corsivo, lettere che saltellano */
  accento: 'colore' | 'corsivo' | 'saltello'
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

const BASE: Style[] = [
  {
    id: 'notte-calda', name: 'Notte calda', registro: 'artigianale', forma: 'netto', accento: 'corsivo', dark: true,
    bg: '#15100c', surface: '#231a13', ink: '#f2e8d8', muted: '#a8957e', accent: '#c8763a', accent2: '#e8b04a', onAccent: '#15100c',
    display: { family: 'Fraunces', weight: 400 }, displayTracking: -0.02, displayLeading: 0.98,
    text: { family: 'Inter', weight: 400 }, label: { family: 'Inter', weight: 600 },
    impact: { family: 'Big Shoulders Display', weight: 800 }, impactSans: true,
    keywords: ['caffè', 'caffe', 'coffee', 'espresso', 'torrefazione', 'tostatura', 'blend', 'cioccolato', 'cacao', 'vino', 'whisky', 'rum', 'cocktail', 'spezie', 'tabacco'],
    decor: { look: 'portra', adjust: { grain: 28, vignette: -35, halation: 18 }, finishes: ['grana', 'polvere'], fallback: 'grana', ornaments: ['isoipse', 'flusso', 'onde'], glyphs: ['Sparkle', 'Starburst', 'Halo Sparkle', 'Comet Trail'] },
  },
  {
    id: 'carta-editoriale', name: 'Carta editoriale', registro: 'editoriale', forma: 'netto', accento: 'corsivo', dark: false,
    bg: '#f2ede4', surface: '#e4dccd', ink: '#161412', muted: '#6e665d', accent: '#d2462a', accent2: '#1f4bd8', onAccent: '#f2ede4',
    display: { family: 'DM Serif Display', weight: 400 }, displayTracking: -0.015, displayLeading: 1.0,
    text: { family: 'DM Sans', weight: 400 }, label: { family: 'DM Sans', weight: 600 },
    impact: { family: 'Anton', weight: 400 }, impactSans: true,
    keywords: ['viaggio', 'viaggi', 'itinerario', 'itinerari', 'mostra', 'libro', 'libri', 'poesia', 'mostra', 'cultura', 'festival', 'rivista', 'editoriale', 'lettura', 'incontro', 'talk', 'museo', 'teatro', 'arte', 'galleria', 'storia'],
    decor: { look: 'trix', adjust: { grain: 30, vignette: -15 }, finishes: ['carta'], fallback: 'carta', ornaments: ['sovrastampa', 'puntinato', 'archi'], glyphs: ['Twinkle', 'Glint', 'Halftone Star'] },
  },
  {
    id: 'terra-artigiana', name: 'Terra artigiana', registro: 'artigianale', forma: 'mano', accento: 'corsivo', dark: false,
    bg: '#ede3d3', surface: '#dccdb6', ink: '#2b2119', muted: '#7b6a58', accent: '#a8502c', accent2: '#3f6b4a', onAccent: '#f6efe4',
    display: { family: 'Cormorant Garamond', weight: 500 }, displayTracking: -0.01, displayLeading: 0.95,
    text: { family: 'Jost', weight: 400 }, label: { family: 'Jost', weight: 500 },
    impact: { family: 'Fraunces', weight: 800 }, impactSans: false,
    keywords: ['mercato', 'frutta', 'fragole', 'verdura', 'verdure', 'orto', 'contadino', 'agricola', 'agricole', 'raccolta', 'raccolte', 'km zero', 'artigianale', 'artigiano', 'ceramica', 'pane', 'forno', 'pasta', 'olio', 'naturale', 'fatto a mano', 'bottega', 'laboratorio', 'terra', 'lana', 'legno', 'osteria', 'trattoria', 'cucina', 'ricetta'],
    decor: { look: 'polaroid', adjust: { grain: 22, vignette: -20 }, finishes: ['carta', 'grana'], fallback: 'carta', ornaments: ['archi', 'tessere', 'onde'], glyphs: ['Bloom', 'Bloom 6', 'Thorn Branch'] },
  },
  {
    id: 'svizzero', name: 'Svizzero', registro: 'svizzero', forma: 'netto', accento: 'colore', dark: false,
    bg: '#f3f3f0', surface: '#e2e2dd', ink: '#111111', muted: '#6b6b6b', accent: '#e63312', accent2: '#1d3fd6', onAccent: '#ffffff',
    display: { family: 'Inter', weight: 800 }, displayTracking: -0.045, displayLeading: 0.92,
    text: { family: 'Inter', weight: 400 }, label: { family: 'Inter', weight: 600 },
    impact: { family: 'Inter', weight: 900 }, impactSans: true,
    keywords: ['architettura', 'studio', 'design', 'progetto', 'concorso', 'conferenza', 'workshop', 'corso', 'agenzia', 'consulenza', 'report', 'annuncio'],
    decor: { look: 'nitido', adjust: { grain: 8 }, finishes: ['retino'], ornaments: ['tessere', 'strisce', 'anelli'], glyphs: ['Target', 'Cross Flare', 'Squares'] },
  },
  {
    id: 'notte-elettrica', name: 'Notte elettrica', registro: 'notte', forma: 'netto', accento: 'colore', dark: true,
    bg: '#0b0b0c', surface: '#18181b', ink: '#f4f4f5', muted: '#8a8a93', accent: '#c6f432', accent2: '#ff3bd4', onAccent: '#0b0b0c',
    display: { family: 'Archivo Black', weight: 400 }, displayUpper: true, displayTracking: -0.02, displayLeading: 0.9,
    text: { family: 'Space Grotesk', weight: 400 }, label: { family: 'Space Mono', weight: 400 },
    impact: { family: 'Archivo Black', weight: 400 }, impactSans: true,
    keywords: ['techno', 'club', 'dj', 'serata', 'party', 'rave', 'concerto', 'live', 'line-up', 'lineup', 'musica', 'gaming', 'sport', 'evento'],
    decor: { look: 'cinestill', adjust: { grain: 35, vignette: -30, halation: 35 }, finishes: ['grunge', 'graffi'], fallback: 'grana', ornaments: ['anelli', 'strisce', 'puntinato'], glyphs: ['Starburst Alt', 'Saturn Sparkle', 'Orbit X', 'Halftone Burst'] },
  },
  {
    id: 'botanico', name: 'Botanico', registro: 'artigianale', forma: 'morbido', accento: 'corsivo', dark: true,
    bg: '#1d2a21', surface: '#28372c', ink: '#ece8dc', muted: '#a3ad9c', accent: '#d8b76a', accent2: '#e07a5f', onAccent: '#1d2a21',
    display: { family: 'Fraunces', weight: 300 }, displayTracking: -0.02, displayLeading: 0.98,
    text: { family: 'Manrope', weight: 400 }, label: { family: 'Manrope', weight: 600 },
    impact: { family: 'Fraunces', weight: 700 }, impactSans: false,
    keywords: ['lago', 'montagna', 'bosco', 'sentiero', 'rifugio', 'piante', 'pianta', 'verde', 'bio', 'biologico', 'vegan', 'tè', 'te verde', 'erbe', 'giardino', 'fiori', 'natura', 'sostenibile', 'benessere', 'yoga', 'spa'],
    decor: { look: 'fuji', adjust: { grain: 22, vignette: -25 }, finishes: ['grana', 'luce'], fallback: 'grana', ornaments: ['flusso', 'isoipse', 'vetrata'], glyphs: ['Thorn Stem', 'Bloom 12', 'Arc Wave'] },
  },
  {
    id: 'cipria', name: 'Cipria', registro: 'lusso', forma: 'netto', accento: 'corsivo', dark: false,
    bg: '#f4e6e1', surface: '#ead3cb', ink: '#2a1c1e', muted: '#8c7175', accent: '#a3405a', accent2: '#2f4a7a', onAccent: '#fbf3f0',
    display: { family: 'Bodoni Moda', weight: 500 }, displayTracking: -0.01, displayLeading: 0.98,
    text: { family: 'Jost', weight: 400 }, label: { family: 'Jost', weight: 500 },
    impact: { family: 'Bodoni Moda', weight: 800 }, impactSans: false,
    keywords: ['beauty', 'bellezza', 'skincare', 'crema', 'profumo', 'moda', 'gioielli', 'sposa', 'matrimonio', 'make-up', 'trucco', 'parrucchiere', 'estetica'],
    decor: { look: 'morbido', adjust: { grain: 14, vignette: -12 }, finishes: ['carta'], fallback: 'carta', ornaments: ['archi', 'sfera', 'onde'], glyphs: ['Sparkle Slim', 'Halo Wide', 'Twinkle'] },
  },
  {
    id: 'chiaro-tech', name: 'Chiaro tech', registro: 'tech', forma: 'morbido', accento: 'colore', dark: false,
    bg: '#f3f6fb', surface: '#e1e8f4', ink: '#0d1526', muted: '#5a6680', accent: '#2d5bff', accent2: '#ff6b3d', onAccent: '#ffffff',
    display: { family: 'Space Grotesk', weight: 700 }, displayTracking: -0.03, displayLeading: 0.95,
    text: { family: 'Inter', weight: 400 }, label: { family: 'Inter', weight: 600 },
    impact: { family: 'Space Grotesk', weight: 700 }, impactSans: true,
    keywords: ['app', 'software', 'digitale', 'startup', 'ai', 'tech', 'tecnologia', 'piattaforma', 'servizio', 'risparmi', 'banca', 'ios', 'android', 'scarica', 'fintech', 'salute', 'clinica', 'online', 'webinar'],
    decor: { look: 'luminoso', adjust: { grain: 6 }, finishes: [], ornaments: ['sfaccettato', 'vetrata', 'anelli'], glyphs: ['Globe', 'Lens Grid', 'Orbit Twin', 'Gear Line'] },
  },
]

/* ── Registri ──────────────────────────────────────────────────────────
 * Ogni registro ha caratteri, forme, accento, trattamento foto, ornamenti e
 * glifi propri; le palette sono varianti di colore dello stesso registro.
 */
export const REGISTRI: { id: RegistroId; nome: string; quando: string }[] = [
  { id: 'infantile', nome: 'Infantile', quando: 'bambini, scuole, ludoteche, compleanni, famiglie: caratteri tondi, colori pieni, forme morbide, lettere che saltellano' },
  { id: 'pop', nome: 'Pop', quando: 'brand giocosi per adulti, food, estate, festival, aperitivi: colori accesi, grotesk grassi, forme memphis' },
  { id: 'editoriale', nome: 'Editoriale', quando: 'cultura, editoria, riviste, talk, teatro: graziati raffinati, corsivo sulla parola chiave, filetti, carta' },
  { id: 'svizzero', nome: 'Svizzero', quando: 'architettura, design, enti, conferenze, report: griglia, bastoni, rosso o blu, rigore' },
  { id: 'avanguardia', nome: 'Avanguardia', quando: 'arte contemporanea, gallerie, musica sperimentale, zine: composizioni decostruite, mono, acidi, segni a mano' },
  { id: 'lusso', nome: 'Lusso', quando: 'gioielli, moda, profumi, hotel, matrimoni: bodoni, tanto vuoto, oro o avorio, corsivo' },
  { id: 'artigianale', nome: 'Artigianale', quando: 'cibo, vino, botteghe, natura, bio: graziati caldi, carta, colori della terra, segno a mano' },
  { id: 'notte', nome: 'Notte', quando: 'club, concerti, eventi serali: nero, neon, tipografia grassa, ritmo' },
  { id: 'tech', nome: 'Tech', quando: 'app, software, startup, servizi digitali: pulito, blu o viola, numeri, griglie' },
  { id: 'retro', nome: 'Retrò', quando: 'vintage, anni 70-80-90, barbieri, diner, giochi arcade: colori caldi o synth, strisce, raggiere' },
  { id: 'sportivo', nome: 'Sportivo', quando: 'palestre, squadre, gare, tornei: condensati enormi, diagonali, contrasto forte' },
]

const F = (family: string, weight: number, italic?: boolean): FontSpec => (italic ? { family, weight, italic } : { family, weight })

type Kit = Omit<Style, 'id' | 'name' | 'dark' | 'bg' | 'surface' | 'ink' | 'muted' | 'accent' | 'accent2' | 'onAccent'>
type Pal = Pick<Style, 'id' | 'name' | 'dark' | 'bg' | 'surface' | 'ink' | 'muted' | 'accent' | 'accent2' | 'onAccent'> & { keywords?: string[] }
const mk = (kit: Kit, ...pals: Pal[]): Style[] => pals.map(p => ({ ...kit, ...p, keywords: [...(p.keywords ?? []), ...kit.keywords] }))

const NUOVI: Style[] = [
  ...mk({
    registro: 'infantile', forma: 'morbido', accento: 'saltello',
    display: F('Baloo 2', 800), displayTracking: -0.01, displayLeading: 0.95, text: F('Nunito', 600), label: F('Nunito', 800), impact: F('Baloo 2', 800), impactSans: false,
    keywords: ['bambini', 'bambino', 'bimbi', 'bimbo', 'infanzia', 'scuola', 'asilo', 'ludoteca', 'giochi', 'gioco', 'compleanno', 'famiglie', 'famiglia', 'genitori', 'fiaba', 'favola', 'giocattoli', 'merenda', 'centro estivo', 'nido', 'laboratori creativi'],
    decor: { look: 'vivace', adjust: {}, finishes: [], ornaments: ['memphis', 'onde', 'puntinato'], glyphs: ['Sparkle', 'Twinkle', 'Bloom', 'Bloom 6'] },
  },
    { id: 'infantile-pastello', name: 'Pastello', dark: false, bg: '#FFF4E6', surface: '#FFE1EC', ink: '#2B2D42', muted: '#6B6F80', accent: '#FF5C8A', accent2: '#3EC1E8', onAccent: '#2B2D42', keywords: ['nascita', 'neonato', 'battesimo'] },
    { id: 'infantile-primari', name: 'Primari', dark: false, bg: '#FFF8E1', surface: '#FFE27A', ink: '#1D1D3B', muted: '#56567A', accent: '#EF3E36', accent2: '#2E86DE', onAccent: '#FFFFFF' },
    { id: 'infantile-giungla', name: 'Giungla', dark: false, bg: '#DDF4E2', surface: '#B9E6C4', ink: '#1F3B2C', muted: '#4F7A62', accent: '#FF8A3D', accent2: '#7B5EA7', onAccent: '#1F3B2C', keywords: ['animali', 'zoo', 'fattoria didattica', 'natura'] },
  ),
  ...mk({
    registro: 'pop', forma: 'morbido', accento: 'colore',
    display: F('Bricolage Grotesque', 800), displayTracking: -0.03, displayLeading: 0.92, text: F('DM Sans', 500), label: F('DM Sans', 700), impact: F('Shrikhand', 400), impactSans: false,
    keywords: ['estate', 'gelato', 'gelateria', 'street food', 'festival', 'aperitivo', 'spritz', 'pizza', 'burger', 'divertente', 'colorato', 'pop', 'sneakers', 'skate', 'radio', 'podcast', 'merch', 'lancio prodotto'],
    decor: { look: 'vivace', adjust: { grain: 10 }, finishes: [], ornaments: ['memphis', 'strisce', 'raggiera', 'puntinato'], glyphs: ['Starburst', 'Sparkle', 'Halftone Burst', 'Twinkle'] },
  },
    { id: 'pop-gelato', name: 'Gelato', dark: false, bg: '#FFE6D5', surface: '#FFC9D6', ink: '#2A1A1F', muted: '#7A5560', accent: '#FF3D6E', accent2: '#FFB000', onAccent: '#2A1A1F', keywords: ['dolci', 'cono', 'fragola'] },
    { id: 'pop-limone', name: 'Limone', dark: false, bg: '#FFE45E', surface: '#FFF0A0', ink: '#1B1B1B', muted: '#5C5530', accent: '#2F6BFF', accent2: '#FF4F8B', onAccent: '#FFFFFF', keywords: ['limonata', 'sole', 'mare'] },
    { id: 'pop-cobalto', name: 'Cobalto', dark: true, bg: '#1F3BFF', surface: '#3852FF', ink: '#FFF6E5', muted: '#C9CFFF', accent: '#FFD23F', accent2: '#FF6F91', onAccent: '#10156B' },
  ),
  ...mk({
    registro: 'editoriale', forma: 'netto', accento: 'corsivo',
    display: F('Instrument Serif', 400), displayTracking: -0.01, displayLeading: 0.98, text: F('Newsreader', 400), label: F('DM Sans', 600), impact: F('Instrument Serif', 400), impactSans: false,
    keywords: ['conversazione', 'saggio', 'portfolio', 'numero', 'rivista', 'magazine', 'editoriale', 'libro', 'libri', 'casa editrice', 'lettura', 'poesia', 'saggio', 'intervista', 'talk', 'incontro', 'giornale', 'newsletter', 'cultura', 'teatro', 'cinema', 'biblioteca', 'festival letterario'],
    decor: { look: 'trix', adjust: { grain: 25 }, finishes: ['carta'], fallback: 'carta', ornaments: ['sovrastampa', 'archi', 'puntinato'], glyphs: ['Glint', 'Twinkle', 'Halftone Star'] },
  },
    { id: 'editoriale-inchiostro', name: 'Inchiostro', dark: false, bg: '#F6F4EE', surface: '#E8E4DA', ink: '#0E1A3A', muted: '#5A6070', accent: '#C8361F', accent2: '#2A4BD7', onAccent: '#F6F4EE' },
    { id: 'editoriale-notte', name: 'Editoriale notte', dark: true, bg: '#121212', surface: '#1E1E1E', ink: '#F2EFE8', muted: '#9A968E', accent: '#E8C15A', accent2: '#8FB3FF', onAccent: '#121212', keywords: ['cinema', 'noir', 'jazz'] },
  ),
  ...mk({
    registro: 'svizzero', forma: 'netto', accento: 'colore',
    display: F('Inter', 800), displayTracking: -0.045, displayLeading: 0.92, text: F('Inter', 400), label: F('Inter', 600), impact: F('Inter', 900), impactSans: true,
    keywords: ['architettura', 'urbanistica', 'istituzionale', 'comune', 'ente', 'fondazione', 'bando', 'concorso', 'report', 'bilancio', 'studio professionale', 'conferenza', 'workshop'],
    decor: { look: 'nitido', adjust: { grain: 8 }, finishes: ['retino'], ornaments: ['tessere', 'strisce', 'anelli'], glyphs: ['Target', 'Cross Flare', 'Squares'] },
  },
    { id: 'svizzero-blu', name: 'Svizzero blu', dark: false, bg: '#EEF0F3', surface: '#DCE1E8', ink: '#0B1B33', muted: '#5B6575', accent: '#0057FF', accent2: '#FF4D00', onAccent: '#FFFFFF' },
    { id: 'svizzero-giallo', name: 'Svizzero giallo', dark: false, bg: '#FFD400', surface: '#FFE45C', ink: '#111111', muted: '#4A4300', accent: '#E4002B', accent2: '#0047AB', onAccent: '#FFFFFF' },
  ),
  ...mk({
    registro: 'avanguardia', forma: 'decostruito', accento: 'colore',
    display: F('Syne', 800), displayUpper: true, displayTracking: -0.02, displayLeading: 0.9, text: F('Space Mono', 400), label: F('Space Mono', 700), impact: F('Unbounded', 900), impactSans: true,
    keywords: ['arte contemporanea', 'galleria', 'performance', 'installazione', 'sperimentale', 'avanguardia', 'biennale', 'residenza', 'artista', 'artisti', 'videoarte', 'elettronica', 'sound art', 'collettivo', 'manifesto', 'fanzine', 'zine', 'underground', 'opening'],
    decor: { look: 'bleach', adjust: { grain: 35 }, finishes: ['grunge', 'graffi'], fallback: 'grana', ornaments: ['schizzo', 'sovrastampa', 'sfaccettato', 'tessere'], glyphs: ['Cross Flare', 'Target', 'Orbit X', 'Halftone Burst'] },
  },
    { id: 'avanguardia-acido', name: 'Acido', dark: true, bg: '#0A0A0A', surface: '#1A1A1A', ink: '#F0F0F0', muted: '#8C8C8C', accent: '#B6FF00', accent2: '#FF2E88', onAccent: '#0A0A0A', keywords: ['rave', 'techno sperimentale'] },
    { id: 'avanguardia-klein', name: 'Klein', dark: false, bg: '#F4F1EA', surface: '#E6E1D6', ink: '#0F0F0F', muted: '#66625A', accent: '#1A2BFF', accent2: '#FF3B1F', onAccent: '#FFFFFF', keywords: ['mostra', 'museo', 'pittura'] },
    { id: 'avanguardia-cemento', name: 'Cemento', dark: false, bg: '#C4C4BE', surface: '#B0B0A9', ink: '#111111', muted: '#3D3D3A', accent: '#FF5A1F', accent2: '#1D1DFF', onAccent: '#111111', keywords: ['brutalismo', 'spazio industriale'] },
  ),
  ...mk({
    registro: 'lusso', forma: 'netto', accento: 'corsivo',
    display: F('Bodoni Moda', 500), displayTracking: -0.01, displayLeading: 0.98, text: F('Jost', 300), label: F('Jost', 500), impact: F('Bodoni Moda', 800), impactSans: false,
    keywords: ['gioielli', 'gioielleria', 'orologi', 'alta moda', 'profumo', 'profumeria', 'hotel', 'resort', 'matrimonio', 'sposa', 'wedding', 'champagne', 'lusso', 'esclusivo', 'sartoria', 'atelier', 'boutique'],
    decor: { look: 'morbido', adjust: { grain: 10, vignette: -10 }, finishes: ['carta'], fallback: 'carta', ornaments: ['archi', 'sfera', 'onde'], glyphs: ['Sparkle Slim', 'Halo Wide', 'Twinkle'] },
  },
    { id: 'lusso-nero', name: 'Nero e oro', dark: true, bg: '#0E0D0B', surface: '#1A1814', ink: '#EFE6D2', muted: '#A69A80', accent: '#C9A45C', accent2: '#8C6B3F', onAccent: '#0E0D0B', keywords: ['oro', 'notte di gala'] },
    { id: 'lusso-avorio', name: 'Avorio', dark: false, bg: '#F6F1E7', surface: '#EAE2D2', ink: '#2A251E', muted: '#8A7E6B', accent: '#8A6A3B', accent2: '#2F3B2F', onAccent: '#F6F1E7' },
  ),
  ...mk({
    registro: 'artigianale', forma: 'mano', accento: 'corsivo',
    display: F('Fraunces', 600), displayTracking: -0.015, displayLeading: 0.95, text: F('Jost', 400), label: F('Jost', 500), impact: F('Fraunces', 900), impactSans: false,
    keywords: ['vino', 'cantina', 'olio', 'formaggio', 'birra artigianale', 'panificio', 'pasticceria', 'agriturismo', 'fattoria', 'biologico', 'bottega', 'fatto a mano', 'mercato', 'km zero'],
    decor: { look: 'polaroid', adjust: { grain: 22, vignette: -20 }, finishes: ['carta', 'grana'], fallback: 'carta', ornaments: ['schizzo', 'archi', 'onde'], glyphs: ['Bloom', 'Bloom 6', 'Thorn Branch'] },
  },
    { id: 'artigianale-salvia', name: 'Salvia', dark: false, bg: '#E8EDE4', surface: '#D3DDCC', ink: '#22301F', muted: '#5D6E57', accent: '#B5552B', accent2: '#3E5C76', onAccent: '#F4F1EA', keywords: ['erbe', 'orto', 'verdura', 'verdure'] },
    { id: 'artigianale-kraft', name: 'Kraft', dark: false, bg: '#D9C3A0', surface: '#CBB08A', ink: '#2B1E12', muted: '#6B5236', accent: '#9E2B25', accent2: '#2B4A3A', onAccent: '#F4EBDD', keywords: ['pane', 'forno', 'salumi'] },
  ),
  ...mk({
    registro: 'notte', forma: 'netto', accento: 'colore',
    display: F('Archivo Black', 400), displayUpper: true, displayTracking: -0.02, displayLeading: 0.9, text: F('Space Grotesk', 400), label: F('Space Mono', 400), impact: F('Archivo Black', 400), impactSans: true,
    keywords: ['techno', 'club', 'dj', 'serata', 'party', 'concerto', 'live', 'line-up', 'lineup', 'musica', 'notte', 'discoteca'],
    decor: { look: 'cinestill', adjust: { grain: 35, vignette: -30, halation: 35 }, finishes: ['grunge', 'graffi'], fallback: 'grana', ornaments: ['anelli', 'strisce', 'puntinato'], glyphs: ['Starburst Alt', 'Saturn Sparkle', 'Orbit X', 'Halftone Burst'] },
  },
    { id: 'notte-blu', name: 'Blu notte', dark: true, bg: '#0B1026', surface: '#151C3D', ink: '#F2F4FF', muted: '#8E96C2', accent: '#FF7A1A', accent2: '#3DF2E0', onAccent: '#0B1026', keywords: ['jazz club', 'rooftop'] },
    { id: 'notte-magenta', name: 'Magenta', dark: true, bg: '#0D0610', surface: '#1C0F22', ink: '#FCEBFF', muted: '#A98BB5', accent: '#FF2BD6', accent2: '#5CE1FF', onAccent: '#0D0610', keywords: ['queer', 'pride', 'drag'] },
  ),
  ...mk({
    registro: 'tech', forma: 'morbido', accento: 'colore',
    display: F('Space Grotesk', 700), displayTracking: -0.03, displayLeading: 0.95, text: F('Inter', 400), label: F('Inter', 600), impact: F('Space Grotesk', 700), impactSans: true,
    keywords: ['app', 'software', 'digitale', 'startup', 'ai', 'tech', 'tecnologia', 'piattaforma', 'saas', 'fintech', 'webinar', 'online', 'dati', 'cloud'],
    decor: { look: 'luminoso', adjust: { grain: 6 }, finishes: [], ornaments: ['sfaccettato', 'vetrata', 'anelli'], glyphs: ['Globe', 'Lens Grid', 'Orbit Twin', 'Gear Line'] },
  },
    { id: 'tech-viola', name: 'Viola', dark: true, bg: '#120B2E', surface: '#1E1550', ink: '#F4F1FF', muted: '#A49CD6', accent: '#8B6CFF', accent2: '#2EF2B8', onAccent: '#120B2E', keywords: ['web3', 'gaming', 'intelligenza artificiale'] },
    { id: 'tech-menta', name: 'Menta', dark: false, bg: '#F3FBF8', surface: '#DDF3EA', ink: '#0B2A22', muted: '#4E7268', accent: '#00A878', accent2: '#3D5AFE', onAccent: '#FFFFFF', keywords: ['salute', 'benessere digitale', 'sostenibilità'] },
  ),
  ...mk({
    registro: 'retro', forma: 'morbido', accento: 'colore',
    display: F('Bowlby One', 400), displayTracking: -0.01, displayLeading: 0.92, text: F('DM Sans', 500), label: F('DM Sans', 700), impact: F('Bowlby One', 400), impactSans: true,
    keywords: ['barba', 'rasatura', 'taglio classico', 'vinili', 'vinile', 'dischi', 'vintage', 'retro', 'retrò', 'anni 70', 'anni 80', 'anni 90', 'barbiere', 'barber', 'diner', 'juke box', 'roller', 'disco', 'balera', 'mercatino', 'rockabilly', 'swing', 'arcade', 'videogiochi'],
    decor: { look: 'scaduta', adjust: { grain: 35 }, finishes: ['grana', 'polvere'], fallback: 'grana', ornaments: ['raggiera', 'strisce', 'memphis'], glyphs: ['Starburst', 'Sparkle', 'Halo Sparkle'] },
  },
    { id: 'retro-70', name: 'Anni 70', dark: false, bg: '#F3E3C3', surface: '#E8CFA0', ink: '#3B2314', muted: '#7A5638', accent: '#D9642B', accent2: '#E3A72F', onAccent: '#3B2314' },
    { id: 'retro-synth', name: 'Synth', dark: true, bg: '#1A0B2E', surface: '#2A1450', ink: '#FFE9F7', muted: '#B38FD1', accent: '#FF3CAC', accent2: '#2BD2FF', onAccent: '#1A0B2E', keywords: ['anni 80', 'synthwave', 'arcade'] },
  ),
  ...mk({
    registro: 'sportivo', forma: 'netto', accento: 'colore',
    display: F('Big Shoulders Display', 900), displayUpper: true, displayTracking: 0, displayLeading: 0.86, text: F('Barlow', 500), label: F('Barlow Condensed', 700), impact: F('Big Shoulders Display', 900), impactSans: true,
    keywords: ['palestra', 'fitness', 'crossfit', 'corsa', 'maratona', 'calcio', 'basket', 'pallavolo', 'tennis', 'padel', 'squadra', 'partita', 'torneo', 'campionato', 'allenamento', 'sport', 'ciclismo', 'arrampicata', 'boxe'],
    decor: { look: 'nitido', adjust: { grain: 15 }, finishes: ['graffi'], fallback: 'grana', ornaments: ['strisce', 'tessere', 'anelli'], glyphs: ['Starburst Alt', 'Cross Flare', 'Target'] },
  },
    { id: 'sport-arena', name: 'Arena', dark: true, bg: '#0D0D0D', surface: '#1C1C1C', ink: '#FFFFFF', muted: '#9C9C9C', accent: '#FF3B30', accent2: '#FFD60A', onAccent: '#FFFFFF' },
    { id: 'sport-campo', name: 'Campo', dark: false, bg: '#F2F2EE', surface: '#E0E0DA', ink: '#0B3D2E', muted: '#4F6B60', accent: '#00A13A', accent2: '#FF5A00', onAccent: '#FFFFFF' },
  ),
]

export const STYLES: Style[] = [...BASE, ...NUOVI]
export const stiliDel = (r: RegistroId) => STYLES.filter(s => s.registro === r)

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
/** Tutti i caratteri che uno stile usa (anche il corsivo del titolo, se l'accento è in corsivo), da caricare prima di misurare. */
export const fontsOf = (s: Style): FontSpec[] => [s.display, s.text, s.label, s.impact, ...(s.accento === 'corsivo' ? [{ ...s.display, italic: true }] : [])]
