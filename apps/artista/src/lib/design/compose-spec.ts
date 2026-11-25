/**
 * Linguaggio di composizione per l'AI: invece di posizionare pixel a caso, l'AI
 * sceglie formato, direzione artistica, impaginazione e contenuti. Lo Studio
 * calcola margini, griglia, scala tipografica e adattamento dei titoli, e
 * applica caratteri, palette, effetti e filtri coerenti con lo stile.
 * File condiviso tra server (descrizione del tool) e client (motore).
 */

export interface Palette { bg: string; ink: string; accent: string; muted: string; surface: string }

export type DecorId =
  | 'folio'        // righe sottili con informazioni in alto e in basso, da rivista
  | 'columns'      // linee di griglia leggere a 12 colonne
  | 'crop'         // segni di taglio agli angoli, da tipografia
  | 'frame'        // cornice interna sottile
  | 'bauhaus'      // cerchio, mezzo cerchio e rettangolo nei colori della palette
  | 'blob'         // forma organica morbida
  | 'ticker'       // fascia con testo ripetuto
  | 'index'        // numero grande vuoto (01, 02…)
  | 'badge'        // bollino rotondo con testo
  | 'orbs'         // sfere sfocate di luce
  | 'dots'         // trama di punti
  | 'bars'         // barre di colore orizzontali
  | 'ghost'        // parola enorme al vivo, quasi trasparente, dietro a tutto
  | 'vertical'     // testo verticale nel margine (firma, data, luogo)
  | 'sticker'      // adesivo a stella ruotato con contorno bianco (serve badge)
  | 'scribble'     // sottolineatura a mano sotto il titolo
  | 'starburst'    // scintille a quattro punte accanto al titolo
  | 'shape3d'      // oggetto 3D protagonista (sfera, anello) quando non c'è foto
  | 'halftoneDisc' // disco retinato al vivo
  | 'arrow'        // freccia grafica verso l'azione
  | 'barcode'      // codice a barre con il nome
  | 'registration' // segni di registro da stampa
  | 'offset'       // blocco di colore sfalsato dietro alla foto

export const DECOR_IDS: DecorId[] = ['folio', 'columns', 'crop', 'frame', 'bauhaus', 'blob', 'ticker', 'index', 'badge', 'orbs', 'dots', 'bars',
  'ghost', 'vertical', 'sticker', 'scribble', 'starburst', 'shape3d', 'halftoneDisc', 'arrow', 'barcode', 'registration', 'offset']

export type ImageShape = 'rettangolo' | 'arco' | 'cerchio' | 'goccia' | 'strisce'

export interface StyleDef {
  id: string
  label: string
  mood: string
  display: { family: string; weight: number; upper?: boolean; tracking?: number; leading?: number; italic?: boolean }
  text: { family: string; weight: number }
  label_: { family: string; weight: number; upper?: boolean; tracking?: number }
  /** rapporto della scala tipografica */
  ratio: number
  /** margine come frazione del lato corto */
  margin: number
  align: 'left' | 'center'
  palettes: Palette[]
  decor: DecorId[]
  /** ornamenti generativi adatti allo stile (vedi ornaments.ts) */
  ornaments: string[]
  /** effetto consigliato sul titolo */
  titleFx?: { id: string; variant?: string }
  /** sfondo: tinta, sfumatura o riempimento generativo */
  bg?: { kind: 'solid' } | { kind: 'gradient'; angle: number } | { kind: 'generative'; variant: string }
  /** grana sullo sfondo, 0..100 */
  grain?: number
  imageLook?: string
  imageFx?: { id: string; variant?: string }
  /** materia sovrapposta di serie */
  texture?: 'carta' | 'rumore' | 'plastica'
  /** forma in cui la foto viene ritagliata quando fa da arte */
  imageShape?: ImageShape
  /** con una foto, il titolo grande si riempie della foto */
  photoTitle?: boolean
  /** angoli arrotondati delle immagini e delle schede, in frazione del lato corto */
  radius?: number
}

const P = (bg: string, ink: string, accent: string, muted: string, surface: string): Palette => ({ bg, ink, accent, muted, surface })

export const STYLES: StyleDef[] = [
  { id: 'svizzero', label: 'Svizzero', mood: 'griglia rigorosa, titoli enormi a sinistra, un solo colore forte',
    display: { family: 'Inter Tight', weight: 800, tracking: -0.028, leading: 0.92 }, text: { family: 'Inter', weight: 400 }, label_: { family: 'Inter', weight: 600, upper: true, tracking: 0.08 },
    ratio: 1.5, margin: 0.065, align: 'left', imageLook: 'trix', imageShape: 'strisce', ornaments: ['tessere', 'strisce', 'anelli'], decor: ['columns', 'folio', 'index', 'arrow', 'vertical', 'ghost'],
    palettes: [P('#f2f0eb', '#111111', '#e5361b', '#6b6b6b', '#e3e0d8'), P('#e5361b', '#ffffff', '#111111', '#ffd9cf', '#c92d14'), P('#111111', '#f2f0eb', '#e5361b', '#8a8a8a', '#1e1e1e')] },
  { id: 'editoriale', label: 'Editoriale', mood: 'rivista elegante, serif grande, righe sottili, molto respiro',
    display: { family: 'Instrument Serif', weight: 400, tracking: -0.02, leading: 0.95 }, text: { family: 'Instrument Sans', weight: 400 }, label_: { family: 'Instrument Sans', weight: 600, upper: true, tracking: 0.14 },
    ratio: 1.6, margin: 0.075, align: 'left', imageLook: 'portra', imageShape: 'rettangolo', texture: 'carta', ornaments: ['isoipse', 'archi', 'schizzo'], decor: ['folio', 'crop', 'vertical', 'offset'],
    palettes: [P('#efe9df', '#1b1a17', '#9b3d22', '#77706a', '#e2dace'), P('#1b1a17', '#efe9df', '#d9a273', '#a39b91', '#26241f'), P('#dfe5dc', '#17231c', '#335c45', '#5f6e64', '#d0d8cc')] },
  { id: 'lusso', label: 'Lusso', mood: 'nero e oro, centrato, maiuscole spaziate, cornice sottile',
    display: { family: 'Bodoni Moda', weight: 500, tracking: -0.01, leading: 1.0 }, text: { family: 'Manrope', weight: 300 }, label_: { family: 'Manrope', weight: 500, upper: true, tracking: 0.32 },
    ratio: 1.55, margin: 0.09, align: 'center', imageLook: 'noir', imageShape: 'arco', texture: 'carta', ornaments: ['archi', 'anelli', 'raggiera'], decor: ['frame', 'vertical', 'ghost'], titleFx: { id: 'gradientOverlay', variant: 'oro' }, grain: 8,
    palettes: [P('#0d0c0a', '#f3ead7', '#c9a64e', '#8d8473', '#17150f'), P('#f4efe6', '#1a1712', '#a8853a', '#7e7568', '#e8e0d1'), P('#14201b', '#efe6d0', '#c9a64e', '#8d9a8f', '#1b2b24')] },
  { id: 'brutalista', label: 'Brutalista', mood: 'crudo, maiuscolo enorme, bordi netti, mono, colori che urlano',
    display: { family: 'Archivo Black', weight: 400, upper: true, tracking: -0.03, leading: 0.86 }, text: { family: 'IBM Plex Mono', weight: 400 }, label_: { family: 'IBM Plex Mono', weight: 600, upper: true, tracking: 0.04 },
    ratio: 1.45, margin: 0.05, align: 'left', imageLook: 'bleach', imageFx: { id: 'halftone', variant: 'pop' }, imageShape: 'rettangolo', photoTitle: true, texture: 'plastica', ornaments: ['memphis', 'strisce', 'puntinato'], decor: ['ticker', 'sticker', 'barcode', 'arrow', 'ghost', 'offset'],
    palettes: [P('#f4ff3a', '#0a0a0a', '#ff3b1f', '#3a3a3a', '#e6f02b'), P('#0a0a0a', '#f4ff3a', '#ff3b1f', '#b8b8b8', '#1a1a1a'), P('#ff3b1f', '#0a0a0a', '#ffffff', '#5a160b', '#e32f15')] },
  { id: 'tech', label: 'Tech', mood: 'scuro e preciso, accento acceso, dettagli mono, trama di punti',
    display: { family: 'Space Grotesk', weight: 600, tracking: -0.035, leading: 0.95 }, text: { family: 'Space Grotesk', weight: 400 }, label_: { family: 'JetBrains Mono', weight: 500, upper: true, tracking: 0.06 },
    ratio: 1.5, margin: 0.07, align: 'left', imageLook: 'matrix', imageFx: { id: 'gradientMap', variant: 'cyber' }, imageShape: 'cerchio', texture: 'rumore', ornaments: ['flusso', 'isoipse', 'sfaccettato', 'sfera'], decor: ['dots', 'crop', 'orbs', 'shape3d', 'vertical', 'barcode'],
    palettes: [P('#07090f', '#e8edf7', '#3cffb4', '#6b7489', '#111522'), P('#0b0820', '#efeaff', '#8a6bff', '#7d78a0', '#16122e'), P('#f3f5f9', '#0a0f1c', '#2f5bff', '#6a7287', '#e4e8f0')] },
  { id: 'organico', label: 'Organico', mood: 'caldo e morbido, serif rotondo, forme naturali, toni terra',
    display: { family: 'Fraunces', weight: 600, tracking: -0.03, leading: 0.95 }, text: { family: 'Figtree', weight: 400 }, label_: { family: 'Figtree', weight: 600, upper: true, tracking: 0.1 },
    ratio: 1.5, margin: 0.075, align: 'left', imageLook: 'portra', imageShape: 'goccia', texture: 'carta', ornaments: ['sovrastampa', 'onde', 'schizzo'], decor: ['blob', 'scribble', 'sticker', 'offset'], grain: 14, radius: 0.04,
    palettes: [P('#f1e6d6', '#2b1d14', '#c8572b', '#86705e', '#e6d5bf'), P('#e3ead8', '#1f2a1c', '#5e7b3d', '#6f7a64', '#d4dec6'), P('#2b1d14', '#f1e6d6', '#e3935b', '#b39c86', '#3a2a1f')] },
  { id: 'cromo', label: 'Cromo Y2K', mood: 'titolo in cromo 3D, sfondo aurora, energia digitale',
    display: { family: 'Unbounded', weight: 800, tracking: -0.04, leading: 0.92 }, text: { family: 'Onest', weight: 400 }, label_: { family: 'Onest', weight: 600, upper: true, tracking: 0.12 },
    ratio: 1.45, margin: 0.07, align: 'center', imageLook: 'vapor', imageFx: { id: 'chroma', variant: 'leggera' }, imageShape: 'cerchio', texture: 'rumore', ornaments: ['sfera', 'flusso', 'anelli'], decor: ['orbs', 'shape3d', 'starburst', 'vertical'], titleFx: { id: 'material3d', variant: 'cromo' }, bg: { kind: 'generative', variant: 'aurora' },
    palettes: [P('#070b1f', '#f4f6ff', '#2cffb4', '#9aa3c7', '#121a3a'), P('#120a24', '#fff4fb', '#ff4fd8', '#b39bc7', '#20123a')] },
  { id: 'poster', label: 'Poster tipografico', mood: 'parole impilate a tutta larghezza, condensato, contrasto forte',
    display: { family: 'Big Shoulders Display', weight: 900, upper: true, tracking: -0.01, leading: 0.82 }, text: { family: 'Space Mono', weight: 400 }, label_: { family: 'Space Mono', weight: 700, upper: true, tracking: 0.04 },
    ratio: 1.4, margin: 0.05, align: 'left', imageLook: 'trix', imageShape: 'rettangolo', photoTitle: true, texture: 'carta', ornaments: ['raggiera', 'strisce', 'tessere'], decor: ['folio', 'crop', 'registration', 'barcode'],
    palettes: [P('#ece6da', '#121212', '#ff4d00', '#6e6a62', '#dcd4c4'), P('#121212', '#ece6da', '#ff4d00', '#8d887d', '#1d1d1d'), P('#1438ff', '#f1eee6', '#ffcc00', '#a9b6ff', '#0f2ad1')] },
  { id: 'minimal', label: 'Minimale', mood: 'tanto spazio vuoto, pochi elementi piccoli e precisi, calma',
    display: { family: 'Manrope', weight: 500, tracking: -0.04, leading: 1.0 }, text: { family: 'Manrope', weight: 400 }, label_: { family: 'Manrope', weight: 600, upper: true, tracking: 0.16 },
    ratio: 1.4, margin: 0.1, align: 'left', imageLook: 'morbido', imageShape: 'rettangolo', ornaments: ['anelli', 'isoipse'], decor: ['vertical', 'arrow'],
    palettes: [P('#f7f6f3', '#161616', '#161616', '#8f8f8f', '#ecebe7'), P('#161616', '#f2f2f2', '#f2f2f2', '#7d7d7d', '#222222'), P('#e9eef2', '#14212b', '#3f6f8f', '#7b8a96', '#dce4ea')] },
  { id: 'riso', label: 'Risograph', mood: 'stampa artigianale a due inchiostri, carta, forme piatte, giocoso',
    display: { family: 'Bricolage Grotesque', weight: 800, tracking: -0.04, leading: 0.9 }, text: { family: 'Space Mono', weight: 400 }, label_: { family: 'Space Mono', weight: 700, upper: true, tracking: 0.04 },
    ratio: 1.5, margin: 0.07, align: 'left', imageShape: 'cerchio', texture: 'carta', ornaments: ['sovrastampa', 'memphis', 'puntinato'], decor: ['bauhaus', 'sticker', 'halftoneDisc', 'registration', 'scribble', 'offset'], grain: 30, imageFx: { id: 'riso', variant: 'rosablu' },
    palettes: [P('#f3eee3', '#0078bf', '#ff48b0', '#7f8fa0', '#e8e0d0'), P('#f3eee3', '#00838a', '#ff6c2f', '#86908d', '#e8e0d0'), P('#fff7d1', '#765ba7', '#ffe800', '#8f86a3', '#f2e9bd')] },
  { id: 'morbido', label: 'Gradiente morbido', mood: 'startup gentile, sfumature pastello, schede di vetro, arrotondato',
    display: { family: 'Plus Jakarta Sans', weight: 700, tracking: -0.04, leading: 0.98 }, text: { family: 'Plus Jakarta Sans', weight: 400 }, label_: { family: 'Plus Jakarta Sans', weight: 600, upper: true, tracking: 0.1 },
    ratio: 1.45, margin: 0.075, align: 'center', imageLook: 'pastello', imageShape: 'goccia', ornaments: ['sfera', 'onde', 'archi'], decor: ['orbs', 'shape3d', 'starburst'], bg: { kind: 'generative', variant: 'pesca' }, radius: 0.05,
    palettes: [P('#ffd3c4', '#1f1633', '#6a3cff', '#5d5370', '#ffffff'), P('#cfe8ff', '#0f1d33', '#1d6bff', '#4f617c', '#ffffff')] },
  { id: 'neon', label: 'Notte neon', mood: 'buio con titolo al neon, atmosfera da club, bagliori',
    display: { family: 'Syne', weight: 800, tracking: -0.03, leading: 0.92 }, text: { family: 'Inter', weight: 400 }, label_: { family: 'Space Mono', weight: 700, upper: true, tracking: 0.08 },
    ratio: 1.45, margin: 0.07, align: 'center', imageLook: 'notturno', imageFx: { id: 'chroma', variant: 'leggera' }, imageShape: 'arco', texture: 'rumore', ornaments: ['flusso', 'anelli', 'sfera'], decor: ['orbs', 'frame', 'starburst', 'vertical', 'ghost'], titleFx: { id: 'neon', variant: 'rosa' },
    palettes: [P('#0a0614', '#ffe9f6', '#ff3cac', '#8b7a99', '#150c24'), P('#03100f', '#e6fffd', '#22f1ff', '#6f9693', '#071c1b')] },
  { id: 'cinema', label: 'Cinema', mood: 'foto a tutto campo con grading, titolo serif sopra una sfumatura scura',
    display: { family: 'Playfair Display', weight: 600, tracking: -0.02, leading: 0.95, italic: false }, text: { family: 'Inter', weight: 400 }, label_: { family: 'Inter', weight: 600, upper: true, tracking: 0.24 },
    ratio: 1.5, margin: 0.07, align: 'center', imageShape: 'rettangolo', texture: 'rumore', ornaments: ['isoipse', 'onde'], decor: ['vertical', 'crop'], imageLook: 'tealorange', grain: 12,
    palettes: [P('#0c0d10', '#f5f1ea', '#e7b46a', '#a7a29a', '#1a1b20')] },
  { id: 'bauhaus', label: 'Bauhaus', mood: 'geometria primaria, cerchi e quadrati, rosso giallo blu',
    display: { family: 'Jost', weight: 700, tracking: -0.03, leading: 0.92 }, text: { family: 'Jost', weight: 400 }, label_: { family: 'Jost', weight: 600, upper: true, tracking: 0.12 },
    ratio: 1.5, margin: 0.07, align: 'left', imageFx: { id: 'gradientMap', variant: 'duotone' }, imageShape: 'cerchio', texture: 'carta', ornaments: ['tessere', 'raggiera', 'strisce'], decor: ['bauhaus', 'halftoneDisc', 'arrow', 'vertical'], grain: 10,
    palettes: [P('#eee6d3', '#161616', '#d8352a', '#706a5c', '#e2d8c0'), P('#161616', '#eee6d3', '#f2b705', '#8c8678', '#232323')] },
  { id: 'retro', label: 'Retrò anni 70', mood: 'caldo e rotondo, ombre piene, strisce di colore',
    display: { family: 'Tilt Warp', weight: 400, tracking: -0.02, leading: 0.95 }, text: { family: 'Figtree', weight: 500 }, label_: { family: 'Figtree', weight: 800, upper: true, tracking: 0.1 },
    ratio: 1.45, margin: 0.07, align: 'center', imageLook: 'kodachrome', imageShape: 'arco', texture: 'carta', ornaments: ['raggiera', 'onde', 'archi'], decor: ['bars', 'sticker', 'halftoneDisc', 'starburst', 'offset'], titleFx: { id: 'extrude', variant: 'arancio' }, grain: 18,
    palettes: [P('#f4e3c1', '#3b1f0e', '#e8572a', '#8a6b4d', '#ecd3a6'), P('#203b37', '#f4e3c1', '#f2a33a', '#9db0a6', '#2b4a45')] },
  { id: 'galleria', label: 'Galleria', mood: 'museo contemporaneo, molta aria, serif sottile, didascalie precise',
    display: { family: 'Cormorant Garamond', weight: 300, tracking: -0.02, leading: 0.95 }, text: { family: 'Hanken Grotesk', weight: 400 }, label_: { family: 'Hanken Grotesk', weight: 600, upper: true, tracking: 0.18 },
    ratio: 1.6, margin: 0.09, align: 'left', imageLook: 'argento', imageShape: 'rettangolo', texture: 'carta', ornaments: ['vetrata', 'schizzo', 'archi'], decor: ['folio', 'vertical'],
    palettes: [P('#ffffff', '#141414', '#141414', '#8a8a8a', '#f2f2f2'), P('#efece6', '#1e1c19', '#5b4a3a', '#8b847a', '#e4e0d8')] },
]

export interface LayoutDef { id: string; label: string; use: string; needsImage?: boolean }
export const LAYOUTS: LayoutDef[] = [
  { id: 'eroe', label: 'Eroe', use: 'titolo protagonista con sottotitolo e informazioni: annunci, post, copertine senza foto' },
  { id: 'gigante', label: 'Tipografia gigante', use: 'il titolo riempie la tavola parola per parola: poster, manifesti, slogan brevi (1-4 parole)' },
  { id: 'diviso', label: 'Diviso', use: 'metà immagine e metà testo: prodotti, persone, eventi con foto', needsImage: true },
  { id: 'copertina', label: 'Copertina', use: 'foto a tutto campo con titolo sopra: copertine, storie, poster fotografici', needsImage: true },
  { id: 'rivista', label: 'Rivista', use: 'testata, titolo, sommario e testo in colonne: articoli, comunicati, newsletter' },
  { id: 'citazione', label: 'Citazione', use: 'una frase grande con autore: testimonianze, citazioni, pensieri' },
  { id: 'numeri', label: 'Numeri', use: 'titolo con 2-4 dati grandi e didascalie: risultati, statistiche, report' },
  { id: 'elenco', label: 'Elenco', use: 'titolo con 3-6 punti numerati: consigli, servizi, passaggi, agenda' },
  { id: 'scheda', label: 'Scheda', use: 'una scheda centrata sopra lo sfondo: offerte, inviti, biglietti' },
  { id: 'galleria', label: 'Galleria', use: 'immagine incorniciata con didascalia da museo: portfolio, opere, prodotti', needsImage: true },
  { id: 'arte', label: 'Arte', use: 'grande ornamento generativo al vivo in alto e testo sotto: poster, copertine, annunci d\'impatto senza foto' },
  { id: 'bento', label: 'Bento', use: 'griglia a moduli arrotondati (titolo, arte, dati, foto, azione): lanci, servizi, presentazioni, riepiloghi' },
  { id: 'cover', label: 'Copertina rivista', use: 'testata enorme, foto a tutto campo, titoli di copertina numerati, codice a barre: copertine, lanci, numeri speciali', needsImage: true },
  { id: 'tipografico', label: 'Poster tipografico', use: 'titolo a tutta larghezza riga per riga con una fascia fotografica che lo attraversa e microtipografia in colonne: eventi, mostre, festival' },
  { id: 'manuale', label: 'Manuale tecnico', use: 'tavola illustrata da manuale con richiami numerati, scheda tecnica e griglia: prodotti, servizi, processi, avanguardia' },
  { id: 'collage', label: 'Collage', use: 'foto ritagliata con effetto stampa, segni a inchiostro, adesivi e etichette ruotate su carta: cultura, eventi, giovani, artigianato', needsImage: true },
  { id: 'drop', label: 'Drop', use: 'foto a tutto campo con plastica, titolo ripetuto vuoto, segni tribali e dettagli tecnici: streetwear, musica, lanci', needsImage: true },
  { id: 'manifesto', label: 'Manifesto', use: 'titolo verticale enorme sul bordo, arte grande e testi in colonna: avanguardia, mostre, eventi culturali' },
]

export const FORMATS: Record<string, { w: number; h: number; label: string }> = {
  quadrato: { w: 1080, h: 1080, label: 'post quadrato' },
  verticale: { w: 1080, h: 1350, label: 'post verticale 4:5' },
  storia: { w: 1080, h: 1920, label: 'storia / reel 9:16' },
  orizzontale: { w: 1920, h: 1080, label: 'slide / video 16:9' },
  banner: { w: 1200, h: 628, label: 'banner / anteprima link' },
  poster: { w: 1200, h: 1700, label: 'poster / locandina' },
  a4: { w: 1240, h: 1754, label: 'foglio A4' },
}

export interface ComposeContent {
  eyebrow?: string
  title: string
  subtitle?: string
  body?: string
  cta?: string
  meta?: string[]
  quote?: string
  author?: string
  stats?: { value: string; label: string }[]
  items?: string[]
  brand?: string
  badge?: string
  /** scheda tecnica: coppie etichetta/valore (Data, Luogo, Formato…) */
  details?: { label: string; value: string }[]
  /** 2-5 etichette brevi (servizi, temi, ingredienti) mostrate come pillole */
  tags?: string[]
  image?: { url?: string; prompt?: string; alt?: string; /** parole per cercare una foto vera (archivi liberi) */ query?: string }
}

export interface ComposeBoard {
  name?: string
  format?: string
  width?: number
  height?: number
  style: string
  layout: string
  /** indice della palette dello stile (0..) */
  palette?: number
  /** colori propri (sostituiscono quelli della palette) */
  colors?: Partial<Palette>
  content: ComposeContent
  /** 'stile' = effetto consigliato dallo stile, 'nessuno', oppure id effetto con variante "id:variante" */
  titleEffect?: string
  imageLook?: string
  imageEffect?: string
  /** forma della foto quando fa da arte */
  imageShape?: ImageShape
  /** foto dentro le lettere del titolo */
  photoTitle?: boolean
  /** riempimento generativo dello sfondo (variante di genFill) oppure 'tinta' */
  background?: string
  /** caratteri propri (nomi del catalogo) */
  displayFont?: string
  textFont?: string
  align?: 'left' | 'center'
  /** decorazioni in più o al posto di quelle dello stile */
  decor?: DecorId[]
  noDecor?: boolean
  /** materia sopra la tavola: carta, rumore, plastica o nessuna */
  texture?: 'stile' | 'carta' | 'rumore' | 'plastica' | 'nessuna'
  /** ornamento generativo: 'stile' (predefinito), 'nessuno' o un id */
  ornament?: string
  /** quanta regia grafica: essenziale (pulito), ricco (predefinito), massimo (tutto) */
  density?: 'essenziale' | 'ricco' | 'massimo'
}

export const styleOf = (id?: string) => STYLES.find(s => s.id === id) ?? STYLES[0]
export const layoutOf = (id?: string) => LAYOUTS.find(l => l.id === id) ?? LAYOUTS[0]
