/**
 * Vocabolario della specifica di progetto: le voci che l'IA (o una specifica
 * scritta a mano) può scegliere per specializzare una tavola, e che il motore
 * sa eseguire tutte. Solo dati: niente Fabric, si usa anche lato server.
 *
 *   motivi        → pacchetti di segni per settore (icone, ornamenti, glifi, segni)
 *   effetti testo → trattamenti del titolo che lasciano il colore leggibile
 *   segni         → sigillo, cornice, crocini
 *   evita         → famiglie di segni da togliere
 */
import type { Trattamento } from '../gen/knobs'

/** Ornamenti generativi del laboratorio (compose/ornaments.ts). */
export const ORNAMENTI = ['raggiera', 'anelli', 'onde', 'tessere', 'flusso', 'isoipse', 'memphis', 'archi', 'vetrata', 'sfaccettato', 'schizzo', 'sovrastampa', 'puntinato', 'strisce', 'sfera'] as const

/** Look fotografici del motore effetti (fx/catalog LOOKS) adatti alle tavole. */
export const LOOK_FOTO = ['luminoso', 'morbido', 'nitido', 'caldo', 'freddo', 'portra', 'ektar', 'fuji', 'cinestill', 'kodachrome', 'polaroid', 'scaduta', 'notturno', 'deserto', 'bleach', 'trix', 'argento', 'noir', 'seppia', 'cianotipia', 'sogno', 'pastello', 'tramonto'] as const

export const TRATTAMENTI_FOTO: Trattamento[] = ['pellicola', 'duotone', 'retino', 'riso', 'serigrafia', 'bn', 'poster']

export const SEGNI = ['sigillo', 'cornice', 'crocini'] as const
export type Segno = typeof SEGNI[number]

/**
 * Effetti di testo per il titolo. Nessuno cambia il colore del testo (tranne la
 * lamina, che lo controlla): la leggibilità misurata dal motore resta vera.
 * `scuro`: solo su fondi scuri; `chiaro`: solo su fondi chiari.
 */
export const EFFETTI_TESTO = {
  'ombra-netta': { nome: 'Ombra piena sfalsata', quando: 'retrò, artigianale, pop' },
  'ombra-lunga': { nome: 'Ombra lunga piatta', quando: 'pop, sportivo, tech' },
  estruso: { nome: 'Estrusione retrò', quando: 'retrò, pop, insegne', fondo: 'chiaro' },
  eco: { nome: 'Eco colorata', quando: 'notte, pop, musica' },
  bagliore: { nome: 'Bagliore caldo', quando: 'notte, lusso, caffè serale', fondo: 'scuro' },
  neon: { nome: 'Insegna neon', quando: 'notte, club, bar', fondo: 'scuro' },
  timbro: { nome: 'Inchiostro consumato, come un timbro', quando: 'artigianale, botteghe, vintage' },
  'lamina-oro': { nome: 'Lamina d’oro', quando: 'lusso, anniversari, botteghe storiche' },
  contorno: { nome: 'Contorno adesivo', quando: 'pop, infantile, adesivi' },
} as const satisfies Record<string, { nome: string; quando: string; fondo?: 'scuro' | 'chiaro' }>
export type EffettoTesto = keyof typeof EFFETTI_TESTO

/** Famiglie di segni che una specifica può escludere (e che il motore toglie). */
export const EVITABILI = {
  coriandoli: /^coriandolo/,
  stelle: /^(stellina|stella|cella_stella)$/,
  glifi: /^(glifo|stella|cella_stella|stellina)$/,
  ornamenti: /^ornamento/,
  puntini: /^puntini/,
  crocini: /^(crocino|registro)$/,
  adesivi: /^(adesivo|velo_adesivo|adesivo_ombra)$/,
  neon: null,
  glitter: null,
  lamina: null,
} as const satisfies Record<string, RegExp | null>
export type Evitabile = keyof typeof EVITABILI

export interface Motivo {
  nome: string
  /** parole del brief che lo richiamano (minuscole, senza accenti) */
  parole: string[]
  /** icone Iconify (set monocromi in locale: game-icons, ph) */
  icone: string[]
  ornamenti?: (typeof ORNAMENTI)[number][]
  glifi?: string[]
  segni?: Segno[]
  effetto?: EffettoTesto
  look?: (typeof LOOK_FOTO)[number]
  /** colore d'accento del settore (il motore lo schiarisce o scurisce finché si legge sul fondo) */
  accento?: string
}

/**
 * Motivi per settore: ogni voce è un pacchetto di segni coerenti che il motore
 * sa disegnare. L'IA sceglie per nome; il ripiego senza IA li trova dalle
 * parole del brief.
 */
export const MOTIVI: Record<string, Motivo> = {
  barbiere: { accento: '#b3261e', nome: 'Bottega del barbiere', parole: ['barbiere', 'barba', 'rasatura', 'baffi', 'barber', 'taglio classico'], icone: ['game-icons:razor', 'game-icons:scissors', 'game-icons:comb', 'game-icons:beard'], ornamenti: ['strisce'], segni: ['sigillo', 'cornice'], effetto: 'timbro', look: 'seppia' },
  vinili: { nome: 'Dischi e vinili', parole: ['vinile', 'vinili', 'dischi', 'giradischi', 'musica'], icone: ['ph:vinyl-record-fill', 'game-icons:musical-notes', 'ph:music-notes-fill'], ornamenti: ['anelli'], segni: ['sigillo'] },
  caffe: { accento: '#8a5a2b', nome: 'Caffè e torrefazione', parole: ['caffe', 'torrefazione', 'tostato', 'tostatura', 'espresso', 'blend', 'chicchi'], icone: ['ph:coffee-bean-fill', 'game-icons:coffee-beans', 'game-icons:coffee-cup', 'game-icons:moka-pot'], ornamenti: ['isoipse', 'flusso'], segni: ['sigillo'], look: 'portra' },
  notte: { accento: '#d9a441', nome: 'Notte e luna', parole: ['notte', 'sera', 'notturno', 'luna', 'buio'], icone: ['ph:moon-stars-fill', 'game-icons:moon', 'ph:star-four-fill'], ornamenti: ['onde'], glifi: ['Sparkle', 'Twinkle'], effetto: 'bagliore', look: 'cinestill' },
  origine: { nome: 'Origine e viaggio', parole: ['etiopia', 'etiope', 'origine', 'monorigine', 'viaggio', 'altopiano'], icone: ['ph:mountains-fill', 'ph:globe-hemisphere-east-fill', 'ph:compass-fill'], ornamenti: ['isoipse'] },
  cucina: { accento: '#9c3d22', nome: 'Cucina e osteria', parole: ['osteria', 'ristorante', 'menu', 'cucina', 'piatti', 'pranzo', 'cena'], icone: ['ph:fork-knife-fill', 'ph:cooking-pot-fill', 'ph:wine-fill', 'ph:leaf-fill'], ornamenti: ['archi'], segni: ['cornice'], look: 'caldo' },
  orto: { accento: '#c2362f', nome: 'Orto e mercato', parole: ['orto', 'verdure', 'fragole', 'mercato', 'raccolto', 'km zero', 'stagione'], icone: ['ph:carrot-fill', 'ph:plant-fill', 'ph:basket-fill', 'ph:leaf-fill'], ornamenti: ['tessere'], look: 'ektar' },
  club: { accento: '#ff2d55', nome: 'Club e musica elettronica', parole: ['techno', 'club', 'dj', 'live set', 'rave'], icone: ['ph:waveform-bold', 'ph:speaker-hifi-fill', 'ph:lightning-fill'], ornamenti: ['strisce', 'sovrastampa'], segni: ['crocini'], effetto: 'eco', look: 'notturno' },
  ceramica: { accento: '#a8502c', nome: 'Ceramica e artigianato', parole: ['ceramica', 'gres', 'argilla', 'smalti', 'fatto a mano', 'tazze'], icone: ['game-icons:painted-pottery', 'ph:hand-fill', 'ph:flower-tulip-fill'], ornamenti: ['schizzo', 'archi'], effetto: 'timbro' },
  natura: { accento: '#3f6b4a', nome: 'Natura e montagna', parole: ['lago', 'bosco', 'montagna', 'rifugio', 'canoa', 'sentiero'], icone: ['ph:mountains-fill', 'ph:tree-evergreen-fill', 'ph:tent-fill', 'ph:sun-horizon-fill'], ornamenti: ['isoipse', 'onde'], look: 'fuji' },
  bambini: { accento: '#ff7a3d', nome: 'Bambini e gioco', parole: ['bambini', 'ludoteca', 'famiglia', 'laboratorio creativo', 'orsetti'], icone: ['ph:balloon-fill', 'ph:puzzle-piece-fill', 'ph:star-fill', 'ph:heart-fill'], ornamenti: ['memphis'], effetto: 'contorno' },
  bellezza: { accento: '#c98b8b', nome: 'Bellezza e cura', parole: ['siero', 'pelle', 'beauty', 'cosmetico', 'crema'], icone: ['ph:drop-fill', 'ph:flower-lotus-fill', 'ph:sparkle-fill'], ornamenti: ['sfera'], glifi: ['Sparkle Slim'], look: 'morbido' },
  gioielli: { accento: '#b8902f', nome: 'Gioielli e oro', parole: ['gioielli', 'oro', 'anelli', 'orecchini', 'atelier'], icone: ['ph:diamond-fill', 'ph:sparkle-fill', 'game-icons:ring'], ornamenti: ['raggiera'], effetto: 'lamina-oro', segni: ['cornice'] },
  mare: { accento: '#1fb5c9', nome: 'Mare e abissi', parole: ['mare', 'meduse', 'abissi', 'bioluminescenza', 'pesci'], icone: ['game-icons:jellyfish', 'ph:fish-fill', 'ph:waves-bold'], ornamenti: ['onde', 'flusso'], effetto: 'bagliore' },
  sport: { accento: '#ff5a1f', nome: 'Sport e allenamento', parole: ['palestra', 'allenamento', 'gym', 'squadra', 'corso', 'coach'], icone: ['ph:barbell-fill', 'ph:lightning-fill', 'ph:timer-fill'], ornamenti: ['strisce'], effetto: 'ombra-lunga' },
  design: { accento: '#e63312', nome: 'Design e città', parole: ['design', 'festival', 'talk', 'architettura', 'spazio pubblico'], icone: ['ph:compass-tool-fill', 'ph:buildings-fill', 'ph:grid-four-fill'], ornamenti: ['tessere'], segni: ['crocini'] },
  risparmio: { accento: '#1f9d6b', nome: 'Soldi e risparmio', parole: ['risparmia', 'risparmio', 'spesa', 'app', 'soldi'], icone: ['ph:piggy-bank-fill', 'ph:coins-fill', 'ph:device-mobile-fill'], ornamenti: ['anelli'], effetto: 'ombra-netta' },
  storia: { accento: '#7a2e1f', nome: 'Tradizione e storia', parole: ['dal 19', 'storica', 'tradizione', 'generazioni', 'anniversario', 'sartoria'], icone: ['ph:seal-check-fill', 'game-icons:laurel-crown'], segni: ['sigillo', 'cornice'], effetto: 'timbro' },
}
