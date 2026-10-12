/**
 * Regolatori dei sistemi generativi. Il sistema è una ricetta di molti passaggi
 * (fondo, foto trattata, forme, tipografia, sovrastampa, trame, segni di stampa);
 * i regolatori decidono quanto spingere ogni passaggio. L'IA e l'utente muovono
 * solo questi: la composizione la costruisce il sistema.
 */

export type SistemaId = 'supertipo' | 'eco' | 'strisce' | 'costruttivo' | 'riso' | 'modulare' | 'orbita' | 'ritaglio' | 'giocoso' | 'decostruito' | 'rivista'
export type Trattamento = 'pellicola' | 'duotone' | 'retino' | 'riso' | 'serigrafia' | 'bn' | 'poster'

export interface Knobs {
  sistema: SistemaId
  /** stile (palette e caratteri) */
  stile: string
  /** 0 sobria → 1 il titolo occupa tutto */
  scala: number
  /** 0 statica e ortogonale → 1 diagonali, sfalsamenti, rotazioni */
  energia: number
  /** 0 pochi elementi e tanto vuoto → 1 ricca, stratificata */
  densita: number
  /** 0 colori pieni → 1 inchiostri che si sovrappongono fuori registro */
  sovrastampa: number
  trattamento: Trattamento
  /** fondo nel colore d'accento */
  inverti: boolean
  /** grana e trama di stampa */
  grana: number
  seme: number
  /** parola del titolo da mettere in evidenza */
  enfasi?: string
}

export interface SistemaInfo { id: SistemaId; nome: string; idea: string; foto: 'serve' | 'meglio' | 'no' }

export const SISTEMI: SistemaInfo[] = [
  { id: 'supertipo', nome: 'Tipo gigante', idea: 'il titolo parola per parola a tutta larghezza, pieno e contorno alternati, foto in un blocco con cornice fuori registro, scritta verticale sul bordo', foto: 'meglio' },
  { id: 'eco', nome: 'Eco', idea: 'il titolo ripetuto a contorno su tutta la tavola, sfalsato come in movimento, una sola riga piena; foto tonda retinata; nastri con il brand che scorre', foto: 'meglio' },
  { id: 'strisce', nome: 'Strisce', idea: 'la foto tagliata in strisce sfalsate, alternate a colori diversi; titolo su una fascia piena con ombra colorata; segni di registro e crocini di taglio', foto: 'serve' },
  { id: 'costruttivo', nome: 'Costruttivista', idea: 'grande disco, barra diagonale con il titolo dentro, foto retinata in sovrastampa nel disco, numero gigante a contorno', foto: 'meglio' },
  { id: 'riso', nome: 'Risograph', idea: 'forme piene in due inchiostri che si sovrappongono fuori registro, foto in riso, campo di puntini sfumato, carta granulosa', foto: 'meglio' },
  { id: 'modulare', nome: 'Griglia modulare', idea: 'griglia svizzera a moduli: la foto si vede solo in alcune celle, celle di colore, numero gigante, dettagli numerati nelle celle', foto: 'meglio' },
  { id: 'orbita', nome: 'Orbita', idea: 'anelli di testo che girano attorno alla foto tonda, fondo sfumato generativo, stelle del set Celestial', foto: 'meglio' },
  { id: 'giocoso', nome: 'Giocoso', idea: 'blob morbidi, foto in una forma con contorno spesso e ombra piena, titolo che saltella in più colori, adesivo, stelline e coriandoli', foto: 'meglio' },
  { id: 'decostruito', nome: 'Decostruito', idea: 'le parole del titolo sparse sulla griglia con forti scarti di scala, striscia di foto retinata, filetti tecnici, segno a mano attorno alla parola chiave', foto: 'meglio' },
  { id: 'rivista', nome: 'Rivista', idea: 'testata come il nome di una rivista, foto grande, titolo con la parola chiave in corsivo, capolettera, folio', foto: 'meglio' },
  { id: 'ritaglio', nome: 'Foto nelle lettere', idea: 'la parola chiave enorme con la foto dentro le lettere, contorno fuori registro dietro, titolo completo sotto', foto: 'serve' },
]

export const TRATTAMENTI: { id: Trattamento; nome: string }[] = [
  { id: 'pellicola', nome: 'Pellicola' }, { id: 'duotone', nome: 'Duotone' }, { id: 'retino', nome: 'Retino' },
  { id: 'riso', nome: 'Riso' }, { id: 'serigrafia', nome: 'Serigrafia' }, { id: 'bn', nome: 'Bianco e nero' }, { id: 'poster', nome: 'Tinte piatte' },
]

/** Descrizione dei regolatori per la UI e per l'IA. */
export const RANGE_KNOBS: { key: 'scala' | 'energia' | 'densita' | 'sovrastampa' | 'grana'; nome: string; hint: string }[] = [
  { key: 'scala', nome: 'Scala', hint: 'quanto è grande il titolo' },
  { key: 'energia', nome: 'Energia', hint: 'diagonali, sfalsamenti, movimento' },
  { key: 'densita', nome: 'Densità', hint: 'quanti elementi e strati' },
  { key: 'sovrastampa', nome: 'Sovrastampa', hint: 'inchiostri sovrapposti fuori registro' },
  { key: 'grana', nome: 'Grana', hint: 'trama di stampa e carta' },
]

const clamp01 = (n: unknown, d: number) => (typeof n === 'number' && isFinite(n) ? Math.max(0, Math.min(1, n)) : d)

/** Regolatori validi da qualsiasi input (IA, salvataggi): i valori sbagliati tornano ai default. */
export function normKnobs(k: Partial<Knobs> & Record<string, unknown>, fallback: Knobs): Knobs {
  return {
    sistema: SISTEMI.some(s => s.id === k.sistema) ? k.sistema as SistemaId : fallback.sistema,
    stile: typeof k.stile === 'string' && k.stile ? k.stile : fallback.stile,
    scala: clamp01(k.scala, fallback.scala),
    energia: clamp01(k.energia, fallback.energia),
    densita: clamp01(k.densita, fallback.densita),
    sovrastampa: clamp01(k.sovrastampa, fallback.sovrastampa),
    trattamento: TRATTAMENTI.some(t => t.id === k.trattamento) ? k.trattamento as Trattamento : fallback.trattamento,
    inverti: typeof k.inverti === 'boolean' ? k.inverti : fallback.inverti,
    grana: clamp01(k.grana, fallback.grana),
    seme: typeof k.seme === 'number' && isFinite(k.seme) ? Math.round(k.seme) : fallback.seme,
    enfasi: typeof k.enfasi === 'string' ? k.enfasi : fallback.enfasi,
  }
}

/** Generatore pseudo-casuale con seme (stessi regolatori, stessa tavola). */
export function rng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (lo: number, hi: number) => lo + (hi - lo) * next(),
    int: (lo: number, hi: number) => Math.floor(lo + (hi - lo + 1) * next()),
    pick: <T,>(list: T[]): T => list[Math.floor(next() * list.length)],
    chance: (p: number) => next() < p,
  }
}
export type Rng = ReturnType<typeof rng>

export const hashText = (t: string) => [...t].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7) >>> 0
