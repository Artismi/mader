/**
 * Mattoni della grammatica (V1 di docs/varieta-e-affinamento.md, §6 di
 * docs/motore-designer-progetto.md). Un archetipo non è più un blocco unico ma
 * una ricetta: un'ossatura, un trattamento del titolo, uno della foto, dei
 * dispositivi e delle finiture. Ogni mattone dichiara cosa gli serve (`serve`),
 * cosa offre agli altri (`offre`) e i parametri che la mutazione può spostare.
 *
 * L'ossatura comanda: decide le zone, impagina le informazioni e chiede al
 * mattone del titolo di misurarsi nella zona che gli dà (`piano.misuraTitolo`).
 * Poi, in quest'ordine: il retro del titolo (eco, copie), la foto, il titolo,
 * i dispositivi, le finiture, gli intrecci. Ogni mattone pesca da un suo
 * generatore casuale: cambiare un mattone non cambia le scelte degli altri.
 */
import type { Scene, SceneEl } from '../../types'
import { type G, finish, discard } from '../tools'
import { rng, hashText } from '../knobs'

export type Box = { x: number; y: number; w: number; h: number }
export type Pt = [number, number]
export type Categoria = 'ossatura' | 'titolo' | 'foto' | 'dispositivi' | 'finiture' | 'intreccio'
/** forma della zona del titolo: un campo alto (eco, pile) o una riga (barra, testata) */
export type FormaZona = 'campo' | 'riga'

export interface Zona extends Box {
  forma: FormaZona
  /** rotazione della riga in gradi (asse costruttivista) */
  angle?: number
  maxSize?: number; minSize?: number; maxLines?: number
  caps?: boolean
}

/** Il titolo misurato da un mattone, pronto da disegnare dove l'ossatura decide. */
export interface Titolo {
  w: number; h: number
  /** quello che sta dietro alla foto (eco, copie a contorno) */
  dietro?: (x: number, y: number) => void
  davanti: (x: number, y: number) => void
  /** riquadri occupati dal titolo leggibile, a (x, y) */
  occupa: (x: number, y: number) => Box[]
  /** il campo libero che il titolo lascia alle figure (eco: il campo delle copie) */
  campo?: Box
  ancore?: Record<string, Pt>
}

export interface Piano {
  offre: Set<string>
  titolo?: Titolo
  titoloXY?: Pt
  /** zona della foto, con il disco se l'ossatura ne disegna uno */
  zonaFoto?: Box & { disco?: { cx: number; cy: number; r: number } }
  /** indice degli elementi sotto la figura principale (carta, scontrino): foto e finiture di fondo vanno qui */
  sotto?: number
  ancore: Record<string, Pt | Box>
  /** la carta dello scontrino, per i dispositivi che ci si appoggiano */
  carta?: { P: (lx: number, ly: number) => Pt; deg: number; w: number; h: number; corners: Pt[]; colore: string }
  misuraTitolo: (z: Zona) => Titolo | null
  /** il testo da cerchiare a penna (scontrino: il valore più importante) */
  bersaglio?: string
  /** riquadri dei testi del messaggio (per gli intrecci: non vanno coperti) */
  info: Box[]
}

/** Parametri di un mattone: intervallo per la mutazione; il valore assente vuol dire "dai regolatori". */
export type Param = Record<string, number>
export type DefParam = Record<string, [number, number]>

interface Base { id: string; nome: string; ricetta: string; serve?: string[]; offre?: string[]; param?: DefParam }
export interface Ossatura extends Base { cat: 'ossatura'; voci?: boolean; fai: (g: G, piano: Piano, p: Param, gen: Genoma) => boolean }
export interface MTitolo extends Base { cat: 'titolo'; forme: FormaZona[]; fai: (g: G, piano: Piano, z: Zona, p: Param) => Titolo | null }
export interface MFoto extends Base { cat: 'foto'; fai: (g: G, piano: Piano, p: Param) => boolean }
export interface MSegno extends Base { cat: 'dispositivi' | 'finiture' | 'intreccio'; /** prima del titolo (sotto di lui) */ prima?: boolean; dove?: 'fondo' | 'sotto'; fai: (g: G, piano: Piano, p: Param) => boolean }
export type Mattone = Ossatura | MTitolo | MFoto | MSegno

export interface Gene { id: string; p?: Param }
export interface Genoma { ossatura: Gene; titolo: Gene; foto?: Gene; dispositivi: Gene[]; finiture: Gene[]; intreccio?: Gene[] }

export const no = (g: G, why: string): false => { discard(g, why); return false }

/** Il mattone pesca dal suo generatore: stesso seme e stesso mattone, stesse scelte, qualunque siano gli altri. */
export function conRng<T>(g: G, id: string, fn: () => T): T {
  const r0 = g.r
  g.r = rng(g.k.seme ^ hashText(`${id}|${g.c.title}`))
  try { return fn() } finally { g.r = r0 }
}

/** Disegna con `fn` e infila gli elementi nuovi all'indice `at` (sotto la figura), spostando il segno. */
export function infila(g: G, piano: Piano, dove: 'fondo' | 'sotto' | 'fine', fn: () => unknown) {
  const n0 = g.els.length
  const out = fn()
  if (dove === 'fine') return out
  const nuovi: SceneEl[] = g.els.splice(n0)
  const at = dove === 'fondo' ? 0 : piano.sotto ?? n0
  g.els.splice(at, 0, ...nuovi)
  if (piano.sotto !== undefined && at <= piano.sotto) piano.sotto += nuovi.length
  return out
}

/** Il valore del parametro: quello del gene, altrimenti quello dai regolatori. */
export const par = (p: Param, nome: string, da: number) => (p[nome] ?? da)

/** I mattoni di un genoma, nell'ordine della ricetta. */
export const geni = (gen: Genoma) => [gen.ossatura, gen.titolo, ...(gen.foto ? [gen.foto] : []), ...gen.dispositivi, ...gen.finiture, ...(gen.intreccio ?? [])]

/**
 * Compone la tavola dal genoma. `catalogo` risolve gli id; il titolo lo chiede
 * l'ossatura; dispositivi e finiture che non trovano posto saltano (non fanno
 * cadere la tavola); la scena porta la lista dei mattoni usati.
 */
export function componi(g: G, gen: Genoma, catalogo: Record<string, Mattone>, o: { layout: string; label: string; specchio?: boolean }): Scene | null {
  const O = catalogo[gen.ossatura.id] as Ossatura, T = catalogo[gen.titolo.id] as MTitolo
  if (!O || !T) { discard(g, `mattone sconosciuto: ${!O ? gen.ossatura.id : gen.titolo.id}`); return null }
  const usati = [`ossatura:${O.id}`, `titolo:${T.id}`]
  const piano: Piano = {
    offre: new Set(O.offre ?? []), ancore: {}, info: [],
    misuraTitolo: z => {
      if (!T.forme.includes(z.forma) || (T.serve ?? []).some(x => !piano.offre.has(x))) { discard(g, `titolo ${T.id} non sta in ${O.id}`); return null }
      return conRng(g, T.id, () => T.fai(g, piano, z, gen.titolo.p ?? {}))
    },
  }
  if (!conRng(g, O.id, () => O.fai(g, piano, gen.ossatura.p ?? {}, gen))) return null
  // il titolo dentro la figura (scontrino) lo disegna l'ossatura: allora qui non c'è
  if (piano.titolo && !piano.titoloXY) { discard(g, 'titolo misurato ma non piazzato'); return null }
  const [tx, ty] = piano.titoloXY ?? [0, 0]
  if (piano.titolo?.ancore) Object.assign(piano.ancore, piano.titolo.ancore)
  conRng(g, `${T.id}|dietro`, () => piano.titolo?.dietro?.(tx, ty))
  const ok = (m: Mattone | undefined) => !!m && (m.serve ?? []).every(x => piano.offre.has(x))
  const F = gen.foto ? catalogo[gen.foto.id] as MFoto | undefined : undefined
  if (F && ok(F) && piano.zonaFoto && conRng(g, F.id, () => infila(g, piano, piano.sotto !== undefined ? 'sotto' : 'fine', () => F.fai(g, piano, gen.foto!.p ?? {})))) usati.push(`foto:${F.id}`)
  const segni = (lista: Gene[], prima: boolean) => {
    for (const x of lista) {
      const m = catalogo[x.id] as MSegno | undefined
      if (!m || !!m.prima !== prima || !ok(m)) continue
      if (conRng(g, m.id, () => infila(g, piano, m.dove ?? 'fine', () => m.fai(g, piano, x.p ?? {})))) usati.push(`${m.cat}:${m.id}`)
    }
  }
  segni(gen.dispositivi, true)
  conRng(g, `${T.id}|davanti`, () => piano.titolo?.davanti(tx, ty))
  segni(gen.dispositivi, false)
  segni(gen.finiture, false)
  segni(gen.intreccio ?? [], false)
  const sc = finish(g, o.layout, o.label, { specchio: o.specchio })
  if (sc) sc.mattoni = usati
  return sc
}
