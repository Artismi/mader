/**
 * I linguaggi: come l'artista si colloca nella comunicazione, nel design e nell'arte di oggi.
 *
 * Un linguaggio è un insieme di regole visive (toni, armonie, strumenti, trattamenti del
 * segno, composizioni, tipografia) e un contesto: da quale tradizione viene, che cosa
 * significa usarlo. L'artista sceglie il linguaggio in base a che cosa sta dicendo (il
 * lavoro chiama la stampa, la memoria il collage, la lotta il manifesto…), alla novità e a
 * come sono andati i linguaggi usati prima.
 *
 * Due linguaggi si possono INCROCIARE: le regole si mescolano e nasce un linguaggio nuovo,
 * con un nome nuovo. Se funziona resta nel suo repertorio e può incrociarsi ancora: così
 * il suo modo di parlare si allontana dai modelli e diventa suo.
 *
 * Le FOLLIE sono i salti: operazioni che rompono l'aspettativa (scala estrema, ossessione,
 * scambio dei segni, assenza, istruzione, grafico poetico, inversione figura/sfondo).
 */
import type { AgentState } from '../core/types'
import { pick, weighted, type Rnd } from '../core/rng'
import type { FaceId } from '@/components/studio/genera/fonts'
import type { Armonia } from './atlante'

export type Follia = 'scala' | 'ossessione' | 'scambio' | 'assenza' | 'istruzione' | 'grafico' | 'inversione' | 'caleido'
export interface Linguaggio {
  id: string; nome: string; contesto: string
  toni: string[]; armonie: Armonia[]; strumenti: string[]; modi: string[]; lay: string[]
  tipo: { face: FaceId; maiuscolo: boolean; barra: boolean; immagine: boolean; scala: number }
  follie: Follia[]; radici: string[]
  genitori?: [string, string]; nato?: number; punteggio?: number; usi?: number
}

export const LINGUAGGI: Linguaggio[] = [
  { id: 'svizzero', nome: 'griglia svizzera', contesto: 'la grafica razionale del dopoguerra: griglia, grotesk, gerarchia; l\'informazione come etica', toni: ['carta', 'osso', 'cenere'], armonie: ['tono', 'complementare'], strumenti: ['pattern', 'grafico', 'retino'], modi: ['intero', 'contorno', 'negativo'], lay: ['griglia', 'coppia', 'vuoto'], tipo: { face: 'grotesk', maiuscolo: false, barra: false, immagine: false, scala: 1 }, follie: ['grafico', 'ossessione'], radici: ['citt', 'lavor', 'ordin', 'legg', 'sistem', 'temp'] },
  { id: 'costruttivista', nome: 'costruttivismo', contesto: 'l\'arte come strumento: diagonali, rosso e nero, slogan, la forma al servizio della lotta', toni: ['sangue', 'carta', 'osso'], armonie: ['tono', 'complementare'], strumenti: ['ombra', 'tipografia', 'taglia'], modi: ['negativo', 'intero', 'spezzato'], lay: ['diviso', 'zoom', 'coppia'], tipo: { face: 'condensato', maiuscolo: true, barra: true, immagine: true, scala: 1.2 }, follie: ['scala', 'istruzione'], radici: ['lott', 'resist', 'operai', 'fabbric', 'guerr', 'liber', 'poter', 'popol', 'sciop'] },
  { id: 'riso', nome: 'risografia', contesto: 'la stampa povera delle autoproduzioni: due inchiostri, retino, fuori registro, la carta che si vede', toni: ['carta', 'osso', 'cenere'], armonie: ['complementare', 'triade'], strumenti: ['retino', 'duotono', 'sfasa', 'grana'], modi: ['materia', 'frammento', 'intero'], lay: ['coppia', 'zoom', 'sovrapposti'], tipo: { face: 'espanso', maiuscolo: true, barra: false, immagine: true, scala: 1 }, follie: ['ossessione', 'scala'], radici: ['lavor', 'stamp', 'carta', 'libr', 'comunit', 'quartier'] },
  { id: 'glitch', nome: 'glitch', contesto: 'l\'errore della macchina come linguaggio: dati rotti, scorrimenti, il digitale che mostra le sue cuciture', toni: ['notte', 'livido', 'acido'], armonie: ['acida', 'complementare'], strumenti: ['deforma', 'sfasa', 'shader', 'taglia'], modi: ['spezzato', 'negativo', 'frammento'], lay: ['zoom', 'sovrapposti', 'diviso'], tipo: { face: 'mono', maiuscolo: true, barra: false, immagine: true, scala: 0.9 }, follie: ['inversione', 'scambio'], radici: ['macchin', 'telefon', 'dat', 'rete', 'schermo', 'tecn', 'segnal', 'error'] },
  { id: 'organico', nome: 'generativo organico', contesto: 'il codice come natura: campi di flusso, crescite, processi che si vedono crescere', toni: ['notte', 'carta', 'livido'], armonie: ['analoga', 'notturna'], strumenti: ['flusso', 'traccia', 'shader', 'materia'], modi: ['pennello', 'materia', 'intero'], lay: ['orbita', 'vuoto', 'sovrapposti'], tipo: { face: 'corsivo', maiuscolo: false, barra: false, immagine: false, scala: 1 }, follie: ['caleido', 'scala'], radici: ['bosc', 'alber', 'radic', 'mar', 'acqu', 'vent', 'terr', 'pioggi', 'semi', 'vita', 'fung'] },
  { id: 'collage', nome: 'collage e fanzine', contesto: 'tagliare e rimontare: la memoria come archivio strappato, la fotocopia, il frammento che accusa', toni: ['cenere', 'osso', 'carta'], armonie: ['tono', 'notturna'], strumenti: ['taglia', 'duotono', 'grana', 'ombra'], modi: ['frammento', 'sbiadito', 'spezzato'], lay: ['sovrapposti', 'zoom', 'griglia'], tipo: { face: 'condensato', maiuscolo: true, barra: true, immagine: true, scala: 1 }, follie: ['scambio', 'assenza'], radici: ['memor', 'ricord', 'stori', 'passat', 'archiv', 'fotograf', 'immagin'] },
  { id: 'concettuale', nome: 'testo come opera', contesto: 'l\'arte concettuale e le istruzioni: la frase è l\'opera, l\'immagine si toglie per far pensare', toni: ['carta', 'notte', 'sangue'], armonie: ['tono'], strumenti: ['tipografia', 'togli'], modi: ['contorno', 'sbiadito'], lay: ['vuoto', 'solo'], tipo: { face: 'grotesk', maiuscolo: true, barra: true, immagine: true, scala: 1.3 }, follie: ['istruzione', 'assenza'], radici: ['pens', 'parol', 'ide', 'vuot', 'mente', 'senso', 'verit'] },
  { id: 'datapoesia', nome: 'poesia dei dati', contesto: 'la visualizzazione come racconto: grafici che misurano cose che non si misurano', toni: ['carta', 'notte', 'cobalto'], armonie: ['analoga', 'triade'], strumenti: ['grafico', 'pattern', 'retino'], modi: ['contorno', 'ripetuto', 'intero'], lay: ['griglia', 'coppia'], tipo: { face: 'mono', maiuscolo: true, barra: false, immagine: false, scala: 0.9 }, follie: ['grafico', 'ossessione'], radici: ['numer', 'temp', 'misur', 'quant', 'person', 'migli', 'conf'] },
  { id: 'acido', nome: 'psichedelia acida', contesto: 'la grafica dei rave e del web acido: colore che vibra, simmetrie, eccesso come critica', toni: ['acido', 'rosanotte', 'livido'], armonie: ['acida', 'triade'], strumenti: ['caleido', 'shader', 'deforma', 'luce'], modi: ['materia', 'specchio', 'ripetuto'], lay: ['orbita', 'sovrapposti'], tipo: { face: 'espanso', maiuscolo: true, barra: false, immagine: true, scala: 1.1 }, follie: ['caleido', 'ossessione'], radici: ['luce', 'sole', 'fest', 'sogn', 'color', 'fuoc', 'notte'] },
  { id: 'brutalista', nome: 'brutalismo', contesto: 'il web brutalista e l\'anti-design: niente armonia, scatole crude, il sistema a vista', toni: ['cenere', 'carta', 'cobalto'], armonie: ['tono', 'acida'], strumenti: ['grafico', 'ombra', 'taglia'], modi: ['contorno', 'negativo', 'ripetuto'], lay: ['griglia', 'diviso'], tipo: { face: 'mono', maiuscolo: true, barra: true, immagine: true, scala: 1 }, follie: ['inversione', 'istruzione'], radici: ['mur', 'confin', 'legg', 'stat', 'cas', 'cemento', 'strad'] },
  { id: 'minimo', nome: 'minimalismo', contesto: 'togliere finché resta l\'essenziale: un segno, molto vuoto, il tempo dello sguardo', toni: ['carta', 'notte', 'osso'], armonie: ['tono'], strumenti: ['togli', 'luce'], modi: ['intero', 'contorno'], lay: ['vuoto', 'solo'], tipo: { face: 'corsivo', maiuscolo: false, barra: false, immagine: false, scala: 0.9 }, follie: ['assenza', 'scala'], radici: ['silenz', 'vuot', 'spazi', 'nulla', 'sol', 'mort'] },
]

type WithL = AgentState & { linguaggi?: { nati: Linguaggio[]; storia: { day: number; id: string; esito?: number }[] } }
const reg = (st: AgentState) => ((st as WithL).linguaggi ??= { nati: [], storia: [] })
export const getLinguaggi = (st: AgentState) => (st as WithL).linguaggi
const tutti = (st: AgentState) => [...LINGUAGGI, ...reg(st).nati]

const uniq = <T>(xs: T[]) => [...new Set(xs)]
/** due linguaggi incrociati: le regole si mescolano, il nome anche */
export function incrocia(r: Rnd, a: Linguaggio, b: Linguaggio, day: number): Linguaggio {
  const met = <T>(x: T[], y: T[]) => uniq([...x.filter((_, i) => i % 2 === 0), ...y.filter((_, i) => i % 2 === 1), ...(r() < 0.5 ? x.slice(0, 1) : y.slice(0, 1))])
  const nomeA = a.nome.split(' ')[0], nomeB = b.nome.split(' ').slice(-1)[0]
  return {
    id: `${a.id}×${b.id}`, nome: `${nomeA} ${nomeB}`.replace(/^(\w)/, c => c),
    contesto: `un incrocio mio: ${a.contesto.split(':')[0]} dentro ${b.contesto.split(':')[0]}`,
    toni: met(a.toni, b.toni), armonie: met(a.armonie, b.armonie), strumenti: met(a.strumenti, b.strumenti), modi: met(a.modi, b.modi), lay: met(a.lay, b.lay),
    tipo: { ...(r() < 0.5 ? a.tipo : b.tipo), barra: a.tipo.barra || b.tipo.barra, immagine: a.tipo.immagine || b.tipo.immagine },
    follie: uniq([...a.follie, ...b.follie]), radici: uniq([...a.radici, ...b.radici]), genitori: [a.id, b.id], nato: day, punteggio: 0.5, usi: 0,
  }
}

/** sceglie il linguaggio per quello che sta dicendo; a volte ne inventa uno incrociandone due */
export function scegliLinguaggio(st: AgentState, r: Rnd, parole: string[]): { L: Linguaggio; perche: string } {
  const R = reg(st)
  const recenti = R.storia.slice(-4).map(x => x.id)
  const affinita = (L: Linguaggio) => parole.reduce((a, w) => a + (L.radici.some(rad => w.startsWith(rad)) ? 1 : 0), 0)
  const peso = (L: Linguaggio) => (1 + affinita(L) * 2) * (recenti.includes(L.id) ? 0.2 : 1) * (0.5 + (L.punteggio ?? 0.5)) * (L.genitori ? 1.3 : 1)
  let L = weighted(r, tutti(st), peso, Math.max(0.5, st.temperature))
  let perche = affinita(L) ? `parlo di ${parole.find(w => L.radici.some(rad => w.startsWith(rad)))}, e ${L.nome} viene da lì: ${L.contesto}` : `${L.nome}: ${L.contesto}`
  // il salto: con l'umore giusto incrocia il linguaggio scelto con uno lontano
  const pInc = 0.12 + (st.mood === 'curioso' || st.mood === 'inquieto' || st.mood === 'giocoso' ? 0.18 : 0) + (st.temperature > 1 ? 0.1 : 0)
  if (r() < pInc) {
    const altri = tutti(st).filter(x => x.id !== L.id && affinita(x) === 0)
    const B = pick(r, altri.length ? altri : tutti(st).filter(x => x.id !== L.id))
    const nuovo = incrocia(r, L, B, st.day)
    if (!R.nati.some(x => x.id === nuovo.id)) R.nati = [...R.nati, nuovo].slice(-30)
    perche = `invento un linguaggio: ${nuovo.nome} (${L.nome} con ${B.nome}). ${perche}`
    L = R.nati.find(x => x.id === nuovo.id)!
  }
  R.storia = [...R.storia, { day: st.day, id: L.id }].slice(-200)
  L.usi = (L.usi ?? 0) + 1
  return { L, perche }
}

/** come è andata: i linguaggi che funzionano restano, gli incroci che non funzionano spariscono */
export function esitoLinguaggio(st: AgentState, id: string, interesse: number) {
  const R = reg(st)
  const L = tutti(st).find(x => x.id === id)
  if (!L) return
  L.punteggio = (L.punteggio ?? 0.5) * 0.7 + interesse * 0.3
  const last = R.storia.slice().reverse().find(x => x.id === id)
  if (last) last.esito = interesse
  R.nati = R.nati.filter(x => (x.usi ?? 0) < 2 || (x.punteggio ?? 0.5) > 0.35)
}
