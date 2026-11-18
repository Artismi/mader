/**
 * Tipi dell'artista-osservatore. Tutto lo stato è JSON semplice: si salva in
 * SQLite, si apre e si legge. Nessun modello esterno.
 */

export type Features = Record<string, number>

export interface Reading {
  id: string
  url: string
  source: string
  title: string
  text: string
  kind: 'wiki' | 'rss' | 'pagina' | 'biblioteca' | 'rilettura'
  fetchedAt: string
  links?: string[]
}

/** un tema: un gruppo di parole vicine nello spazio delle parole */
export interface Theme { id: string; words: string[]; weight: number }

/** una ricerca dura più giorni: esplora le parole del tema, approfondisce la parola centrale, chiude con una sintesi */
export interface Ricerca {
  id: string
  word: string
  words: string[]
  question: string
  start: number
  length: number
  phase: 'esplorare' | 'approfondire' | 'sintesi'
  workIds: string[]
  /** cosa ha capito strada facendo (frasi sue, dal dibattito) */
  findings: string[]
  closed?: boolean
}

/** genoma di una tavola riuscita: i gesti tenuti, con i parametri completi, per rifarla e variarla */
export interface Genome {
  id: string
  workId: string
  day: number
  interest: number
  tone: string
  ricercaId?: string
  gestures: { tool: string; params: Record<string, unknown> }[]
}

export interface Gesture {
  tool: string
  params: Record<string, unknown>
  /** il gesto è stato tenuto o annullato dopo averlo guardato */
  kept: boolean
  /** variazione di interesse misurata dopo il gesto */
  delta: number
}

export interface VisualCard {
  features: Features
  /** istogramma delle "parole visive" (indici del codebook) */
  words: number[]
  palette: string[]
}

export type Polarity = 'pro' | 'contro'

export interface Argument {
  id: string
  voice: string
  aspect: string
  polarity: Polarity
  claim: string
  weight: number
  attacks: string[]
}

export interface Debate {
  args: Argument[]
  accepted: string[]
  verdict: 'tiene' | 'butta'
  /** il verbale in prosa, generato dal dibattito */
  verbale: string[]
}

export interface Intention {
  word: string
  register: Register
  targets: Features
  tools: string[]
  why: string
}

export type Register = 'filosofico' | 'poetico' | 'scherzoso' | 'documentario' | 'slogan' | 'silenzio'

export interface Work {
  id: string
  day: number
  createdAt: string
  title: string
  text: string
  intention: Intention
  mood: Mood
  readings: { title: string; url: string; source: string }[]
  gestures: Gesture[]
  visual: VisualCard
  debate: Debate
  interest: number
  progress: number
  novelty: number
  kept: boolean
  image: string
  /** numero della tavola nella giornata (1, 2, 3) */
  tavola?: number
  /** perché ha fatto questa tavola: prima, serie (variazione su ciò che ha funzionato) o ritentativo */
  ragione?: 'prima' | 'serie' | 'ritenta'
  /** se fa parte di un episodio: quale, e in che posizione */
  episodio?: { id: string; n: number; i: number; N: number; ruolo: string; titolo: string }
}

export type Mood = 'curioso' | 'annoiato' | 'inquieto' | 'giocoso' | 'cupo' | 'calmo'

export interface Criterion {
  id: string
  feature: string
  target: number
  tolerance: number
  weight: number
  born: number
  /** punteggi dati alle ultime opere, per giudicare il criterio stesso */
  scores: number[]
  /** interesse misurato sulle stesse opere */
  outcomes: number[]
}

export type WordState = 'ancorata' | 'definita' | 'a_vuoto' | 'ignota'

export interface LexEntry {
  word: string
  state: WordState
  definition?: string
  defWords?: string[]
  anchor?: string
  checkedDay?: number
  /** giorno dell'ultimo tentativo di ancoraggio semantico fallito */
  semDay?: number
}

export interface Belief {
  s: string
  p: string
  o: string
  neg: boolean
  source: string
}

export interface Question {
  id: string
  text: string
  word: string
  openedDay: number
  visits: number
  closed?: boolean
}

export interface NotebookEntry {
  day: number
  date: string
  intention: string
  done: string[]
  verbale: string[]
  wants: string[]
  bored: string[]
  workId?: string
  workIds?: string[]
}

export interface PoeticsVersion {
  day: number
  date: string
  text: string
}

export interface ToolSense {
  uses: number
  /** effetto medio dello strumento sulle misure dell'immagine */
  effect: Features
  /** interesse medio prodotto */
  gain: number
}

export interface WordSpaceData {
  vocab: string[]
  freq: number[]
  /** co-occorrenze sparse: "i,j" -> conteggio */
  cooc: Record<string, number>
  docs: number
}

export interface ShaderSource {
  id: string
  url: string
  license: string
  code?: string
  uses: number
  gain: number
}

export interface Visit {
  id: string
  date: string
  workId?: string
  text: string
  /** voto rapido di Andrea sulla tavola: +1 tiene, −1 non tiene */
  vote?: 1 | -1
  read?: boolean
}

export interface AgentState {
  version: 1
  name: string
  day: number
  seed: number
  lastRun?: string
  mood: Mood
  temperature: number
  /** novità preferita (curva di Wundt), si sposta con l'esperienza */
  wundtPeak: number
  poetics: PoeticsVersion[]
  notebook: NotebookEntry[]
  questions: Question[]
  readings: Reading[]
  beliefs: Belief[]
  lexicon: Record<string, LexEntry>
  criteria: Criterion[]
  voices: Record<string, number>
  tools: Record<string, ToolSense>
  registers: Record<Register, number>
  codebook: number[][]
  codebookCounts: number[]
  words: WordSpaceData
  feeds: string[]
  shaders: ShaderSource[]
  visits: Visit[]
  /** ultime schede visive, per novità e ripetizioni senza ricaricare le opere */
  recentVisual: { id: string; features: Features; words: number[] }[]
  /** storia sintetica delle giornate, per umore e ricorsione */
  history: { day: number; interest: number; novelty: number; progress: number; kept: boolean }[]
  /** voci di Wikipedia incontrate nei link e non ancora lette */
  linkQueue?: string[]
  themes?: Theme[]
  ricerca?: Ricerca
  ricercheChiuse?: Ricerca[]
  repertorio?: Genome[]
  /** siti da cui esplorare (home o sezioni): legge articoli senza motore di ricerca */
  sites?: string[]
  /** libero: segue i link anche fuori dai siti scelti (sempre rispettando robots.txt) */
  liberta?: boolean
  /** archivio degli stili (MAP-Elites): la tavola migliore per ogni casella densità × elemento dominante × luce */
  archivio?: Record<string, Genome & { quality: number; cell: string }>
}
