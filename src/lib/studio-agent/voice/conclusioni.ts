/**
 * Come conclude un ragionamento: una piccola grammatica, più i modelli che impara da sé.
 *
 * GRAMMATICA. Ogni tipo di deduzione ha pezzi combinabili (apertura × corpo × coda):
 * decine di combinazioni per tipo invece di tre frasi fisse. Sceglie sempre i pezzi
 * meno usati di recente, così non si ripete.
 *
 * MODELLI NATI DA LUI. Quando una conclusione funziona (la tavola o il paragrafo che
 * la contiene viene tenuto), la sua forma viene astratta: i concetti diventano posti
 * vuoti ({a}, {b}, {x}…) e il modello entra nel suo repertorio per quel tipo.
 * Due modelli suoi possono anche incrociarsi (l'inizio di uno con la fine dell'altro).
 * I modelli che non funzionano perdono peso e spariscono.
 */
import type { AgentState } from '../core/types'
import { pick, weighted, type Rnd } from '../core/rng'
import { realizza } from './lingua'

export type TipoD = 'catena' | 'lunga' | 'dipendenza' | 'contesa' | 'disaccordo' | 'eredita' | 'ritrattazione' | 'interrotta'
interface Modello { tpl: string; tipo: TipoD; peso: number; usi: number; nato: number; da?: string }
interface Repertorio { modelli: Modello[]; usiPezzi: Record<string, number> }
type WithR = AgentState & { conclusioni?: Repertorio }
const rep = (st: AgentState): Repertorio => ((st as WithR).conclusioni ??= { modelli: [], usiPezzi: {} })
export const getRepertorio = (st: AgentState) => (st as WithR).conclusioni

// pezzi: {a} {b} {x} {y} {z} sono i concetti; {det:a}, {di:b}, … come in lingua.realizza
const G: Record<TipoD, { apre: string[]; corpo: string[]; coda: string[] }> = {
  catena: {
    apre: ['allora', 'quindi', 'ne viene che', 'a conti fatti,', 'se è così,', 'detto altrimenti,'],
    corpo: ['{det:a} arriva fino {a:b}, passando per {det:x}', 'dietro {a:b} c\'è {det:a}, anche se non si vede', 'se tocchi {det:a} si muove anche {det:b}', '{det:a} decide qualcosa {di:b}, ma per interposta persona: {det:x}', 'tra {det:a} e {det:b} corre un filo, e il filo si chiama {x}', '{det:b} porta il segno {di:a}'],
    coda: ['', '', ', anche se nessuno lo dice', ': è una strada lunga, ma è una strada', ', e questo cambia come guardo {det:b}', ', almeno per come la vedo io'],
  },
  lunga: {
    apre: ['seguo il filo fino in fondo:', 'tiro le somme:', 'se metto in fila tutto,', 'a forza di passaggi,'],
    corpo: ['{det:a}, attraverso {det:x} e {det:y}, arriva {a:b}', 'da {a} a {b} ci sono più tappe: {x}, {y}; ma il punto di partenza resta {det:a}', 'quello che succede {a:b} comincia molto prima, {in:a}', '{det:b} è l\'ultimo anello di una catena che parte {da:a}'],
    coda: ['', ', e ogni anello aggiunge un dubbio', ': più è lunga la catena, meno ne sono sicuro', ', ammesso che tutti i passaggi tengano'],
  },
  dipendenza: {
    apre: ['allora', 'quindi', 'ne ricavo che', 'vuol dire che', 'in fondo,'],
    corpo: ['{det:x} vive {di:b} {di:a}', 'quello che regge {det:x} è {det:b} che {det:a} decide', 'tolto {det:a}, {a:x} manca {det:b}', '{det:x} è appesa {a:a} per un filo, e il filo è {det:b}', 'senza saperlo, {det:x} chiede {a:a} {det:b}', '{det:x} non sta in piedi da sola: le serve {det:b} che viene {da:a}'],
    coda: ['', ', e questo la rende fragile', ': chi controlla {det:a} controlla anche {det:x}', ', anche se sembra autonoma'],
  },
  contesa: {
    apre: ['qui c\'è un conflitto:', 'a guardare bene,', 'ne viene una tensione:', 'c\'è una lotta muta:'],
    corpo: ['{det:a} e {det:b} si contendono {det:x}', '{det:x} sta in mezzo, tirato {da:a} e {da:b}', '{det:x} è un terreno conteso: da una parte {det:a}, dall\'altra {det:b}', 'chi si prende {det:x}, {det:a} o {det:b}?'],
    coda: ['', ', e non è detto che vinca il più forte', ': {det:x} non sceglie, viene scelto', ', e il prezzo lo paga {det:x}'],
  },
  disaccordo: {
    apre: ['qui le fonti litigano:', 'non tutti la raccontano uguale:', 'devo scegliere:'],
    corpo: ['su {det:a} e {det:b} le fonti dicono il contrario', 'per qualcuno {det:a} tocca {det:b}, per altri no', 'il rapporto tra {det:a} e {det:b} è conteso anche tra chi scrive'],
    coda: ['', ': per ora tengo aperte tutte e due', ', e il dubbio lo porto nella tavola'],
  },
  eredita: {
    apre: ['forse', 'per somiglianza,', 'azzardo:'],
    corpo: ['anche {det:a} fa con {det:b} quello che fa {det:x}', '{det:a}, essendo un tipo {di:x}, eredita {det:b}', 'quello che vale per {det:x} vale un po\' anche per {det:a}: {det:b}'],
    coda: ['', ': è un\'ipotesi, non un fatto', ', ma va verificato'],
  },
  interrotta: {
    apre: ['eppure', 'però', 'a guardare la catena,', 'attenzione:'],
    corpo: ['il filo {da:a} {a:b} si spezza a metà', '{det:a} non arriva {a:b}: in mezzo qualcosa dice di no', 'da {a} a {b} la strada è sbarrata', 'tra {det:a} e {det:b} c\'è un muro, e il muro è un «non»'],
    coda: ['', ', e il punto di rottura è {det:x}', ': non tutto passa', ', anche se sembrava una strada dritta'],
  },
  ritrattazione: {
    apre: ['mi devo correggere:', 'mi contraddico:', 'ritiro una cosa:'],
    corpo: ['avevo detto che {a}; ora mi viene che {b}', '{a}: lo pensavo; ma {b}', 'non possono essere vere insieme: {a}, e {b}'],
    coda: [', e tengo la seconda, che ha più fonti', ': una delle premesse era debole', ', e lascio cadere la prima'],
  },
}

/** la conclusione di una deduzione: modello suo (se ne ha di buoni) o grammatica, evitando le ripetizioni */
export function concludi(st: AgentState, r: Rnd, tipo: TipoD, v: Record<string, string>): { testo: string; modello: string } {
  const R = rep(st)
  const miei = R.modelli.filter(m => m.tipo === tipo && m.peso > 0.3)
  if (miei.length && r() < Math.min(0.6, 0.15 + miei.length * 0.08)) {
    const m = weighted(r, miei, x => x.peso / (1 + x.usi * 0.3), 0.8)
    m.usi++
    return { testo: realizza(m.tpl, v), modello: m.tpl }
  }
  const g = G[tipo]
  const meno = (xs: string[]) => weighted(r, xs, x => 1 / (1 + (R.usiPezzi[x] ?? 0)), 0.6)
  const apre = meno(g.apre), corpo = meno(g.corpo), coda = meno(g.coda)
  for (const x of [apre, corpo, coda]) R.usiPezzi[x] = (R.usiPezzi[x] ?? 0) + 1
  // ogni tanto il conteggio si scarica, così i pezzi tornano disponibili
  if (Object.values(R.usiPezzi).reduce((a, b) => a + b, 0) > 600) for (const k of Object.keys(R.usiPezzi)) R.usiPezzi[k] = Math.floor(R.usiPezzi[k] / 2)
  const tpl = `${apre} ${corpo}${coda}`
  return { testo: realizza(tpl, v), modello: tpl }
}

/** la conclusione ha funzionato (o no): il modello nasce, si rafforza, si indebolisce; a volte due si incrociano */
export function esito(st: AgentState, r: Rnd, tipo: TipoD, modello: string, buono: boolean) {
  const R = rep(st)
  let m = R.modelli.find(x => x.tpl === modello)
  if (!m && buono) { m = { tpl: modello, tipo, peso: 0.6, usi: 1, nato: st.day, da: 'una conclusione che ha funzionato' }; R.modelli.push(m) }
  if (m) m.peso = Math.max(0, Math.min(2, m.peso + (buono ? 0.2 : -0.25)))
  // incrocio: l'inizio di un modello buono con la fine di un altro dello stesso tipo
  const buoni = R.modelli.filter(x => x.tipo === tipo && x.peso > 0.8)
  if (buono && buoni.length >= 2 && r() < 0.3) {
    const [x, y] = [pick(r, buoni), pick(r, buoni)]
    const cx = x.tpl.split(/(?<=[,:])\s/), cy = y.tpl.split(/(?<=[,:])\s/)
    if (cx.length > 1 && cy.length > 1 && x !== y) {
      const tpl = [...cx.slice(0, 1), ...cy.slice(1)].join(' ')
      if (!R.modelli.some(z => z.tpl === tpl)) R.modelli.push({ tpl, tipo, peso: 0.5, usi: 0, nato: st.day, da: 'incrocio di due modelli suoi' })
    }
  }
  R.modelli = R.modelli.filter(x => x.peso > 0.05).slice(-120)
}

/** tutte le aperture (per togliere l'attacco quando la conclusione diventa un titolo) */
export const APERTURE = Object.values(G).flatMap(g => g.apre)
