/**
 * Catalogo degli asset del motore designer: caratteri, icone, texture,
 * illustrazioni. Ogni voce dice da dove viene, con che licenza, con che tag
 * (genere, epoca, umore, soggetto) e, per i caratteri, con che misure.
 * Il motore sceglie da qui per tag e misure, non da elenchi scritti a mano.
 *
 * I metadati stanno in git (`caratteri.json`, `altri.json`); i file scaricati
 * stanno nella cache locale `public/asset-cache/` (fuori da git), servita
 * dall'app come `/asset-cache/…`. Gli script in `scripts/asset/` la riempiono.
 *
 * Regola sulle licenze: nelle tavole entrano solo asset con uso commerciale
 * libero e senza obblighi di condivisione (niente share-alike, niente "solo
 * uso personale", niente licenza ignota). L'attribuzione, quando serve, si
 * raccoglie per ogni tavola con `crediti()`.
 */
import CARATTERI_JSON from './caratteri.json'

export type TipoAsset = 'carattere' | 'icona' | 'texture' | 'illustrazione' | 'foto' | 'motivo' | 'elemento' | 'materiale' | 'sovrapposizione'

export type LicenzaId =
  | 'OFL-1.1' | 'Apache-2.0' | 'UFL-1.0' | 'MIT' | 'ISC' | 'CC0-1.0' | 'CC-BY-3.0' | 'CC-BY-4.0'
  | 'CC-BY-SA-3.0' | 'CC-BY-SA-4.0' | 'personale' | 'sconosciuta'

export interface Licenza { nome: string; commerciale: boolean; condivisione: boolean; attribuzione: boolean; url?: string }

export const LICENZE: Record<LicenzaId, Licenza> = {
  'OFL-1.1': { nome: 'SIL Open Font License 1.1', commerciale: true, condivisione: false, attribuzione: false, url: 'https://openfontlicense.org' },
  'Apache-2.0': { nome: 'Apache License 2.0', commerciale: true, condivisione: false, attribuzione: false, url: 'https://www.apache.org/licenses/LICENSE-2.0' },
  'UFL-1.0': { nome: 'Ubuntu Font Licence 1.0', commerciale: true, condivisione: false, attribuzione: false, url: 'https://ubuntu.com/legal/font-licence' },
  MIT: { nome: 'MIT', commerciale: true, condivisione: false, attribuzione: false },
  ISC: { nome: 'ISC', commerciale: true, condivisione: false, attribuzione: false },
  'CC0-1.0': { nome: 'CC0 1.0 (pubblico dominio)', commerciale: true, condivisione: false, attribuzione: false, url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  'CC-BY-3.0': { nome: 'CC BY 3.0', commerciale: true, condivisione: false, attribuzione: true, url: 'https://creativecommons.org/licenses/by/3.0/' },
  'CC-BY-4.0': { nome: 'CC BY 4.0', commerciale: true, condivisione: false, attribuzione: true, url: 'https://creativecommons.org/licenses/by/4.0/' },
  'CC-BY-SA-3.0': { nome: 'CC BY-SA 3.0', commerciale: true, condivisione: true, attribuzione: true },
  'CC-BY-SA-4.0': { nome: 'CC BY-SA 4.0', commerciale: true, condivisione: true, attribuzione: true },
  personale: { nome: 'solo uso personale', commerciale: false, condivisione: false, attribuzione: true },
  sconosciuta: { nome: 'licenza non verificata', commerciale: false, condivisione: false, attribuzione: true },
}

/** Generi tipografici ricavati dalle misure. */
export type Genere = 'grotesco' | 'neo-grotesco' | 'geometrico' | 'umanista' | 'didone' | 'garalde' | 'slab' | 'script' | 'monospaziato' | 'stencil' | 'display'
export type Epoca = 'rinascimentale' | 'ottocento' | 'primo-novecento' | 'modernista' | 'contemporaneo'
export type Umore = 'giocoso' | 'elegante' | 'tecnico' | 'caldo' | 'sperimentale' | 'forte' | 'morbido'

/** Misure di un carattere (in frazioni dell'em, dal file con opentype.js). */
export interface MisureCarattere {
  /** pesi disponibili (100–900) */
  pesi: number[]
  corsivo: boolean
  /** larghezza media delle minuscole, in em */
  larghezza: number
  /** altezza della x rispetto alle maiuscole */
  altezzaX: number
  /** 0 monolinea → 1 contrasto estremo (filetti sottilissimi) */
  contrasto: number
  grazie: boolean
  /** rotondità della o (larghezza/altezza) */
  tondo: number
  /** spessore dell'asta della I a metà altezza, in em */
  spessore: number
  mono: boolean
  stencil: boolean
  /** assi variabili (wght, wdth, opsz, …) */
  assi: string[]
  /** ha tutti gli accenti italiani (àèéìíòóùú, maiuscole, virgolette) */
  italiano: boolean
}

export interface Asset {
  id: string
  tipo: TipoAsset
  nome: string
  /** fonte: google, velvetyne, collletttivo, league, womxn, public… */
  fonte: string
  url?: string
  autore?: string
  licenza: LicenzaId
  /** testo dell'attribuzione, se la licenza la chiede */
  attribuzione?: string
  tag: { genere?: string[]; epoca?: string[]; umore?: string[]; soggetto?: string[] }
  /** colori dominanti (#rrggbb) */
  colori?: string[]
  /** file: in `public/` (percorso dell'app, "/assets/…") o nella cache ("/asset-cache/…") */
  file?: { url: string; peso?: number; stile?: 'normal' | 'italic' }[]
  /** il file sta nella cache locale, non in git: va scaricato con gli script */
  inCache?: boolean
  /** per i caratteri: misure, ruoli adatti e personalità */
  carattere?: {
    misure?: MisureCarattere
    ruoli: ('titolo' | 'testo' | 'etichetta')[]
    /** personalità 0–1 per tratto (dalle misure o curata a mano) */
    p: Partial<Record<Umore, number>>
    /** quanto è sperimentale da usare: 0 da testo classico → 1 display d'autore */
    osa: number
    maiuscolo?: boolean
    /** servito da Google Fonts (CSS API) oltre che dalla cache */
    google?: boolean
    /** pesi e stili serviti (anche senza misure) */
    pesi?: number[]
    corsivo?: boolean
    sans?: boolean
    mono?: boolean
    /** personalità scritta a mano (i 57 caratteri storici del motore) */
    curato?: boolean
  }
}

export const licenza = (a: Pick<Asset, 'licenza'>) => LICENZE[a.licenza] ?? LICENZE.sconosciuta

/** Può entrare in una tavola consegnata a un cliente? */
export const ammesso = (a: Pick<Asset, 'licenza'>) => { const l = licenza(a); return l.commerciale && !l.condivisione }

/** Righe di attribuzione per gli asset usati in una tavola (solo quelli che la chiedono). */
export function crediti(usati: Asset[]): string[] {
  return [...new Set(usati.filter(a => licenza(a).attribuzione && ammesso(a))
    .map(a => a.attribuzione ?? `${a.nome}${a.autore ? ' di ' + a.autore : ''} (${licenza(a).nome})`))]
}

/** Caratteri del catalogo ammessi nelle tavole. */
export const CATALOGO_CARATTERI: Asset[] = (CARATTERI_JSON as Asset[]).filter(a => a.tipo === 'carattere' && a.carattere && ammesso(a))

const perFamiglia = new Map(CATALOGO_CARATTERI.map(a => [a.nome, a]))
export const carattereDi = (family: string) => perFamiglia.get(family)

/** Attribuzioni per i caratteri usati in una tavola (vuoto se nessuno la chiede). */
export const creditiCaratteri = (famiglie: string[]) => crediti([...new Set(famiglie)].map(carattereDi).filter((a): a is Asset => !!a))
