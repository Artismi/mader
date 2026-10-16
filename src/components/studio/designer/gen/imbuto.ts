/**
 * L'imbuto prima dell'occhio: il modello con visione costa, il codice no.
 *  1. vaglia: le misure gratuite del critico scartano solo le tavole chiaramente
 *     sbagliate (testo fuori o sovrapposto, contenuto perso, illeggibile, gemella
 *     di una già mostrata, voto molto sotto soglia); i dubbi passano al modello.
 *  2. finaliste: al massimo 6, le migliori diverse tra loro.
 * Poi l'occhio (occhio.ts) le guarda tutte insieme in una sola chiamata.
 */
import type { Esame } from './critico'
import { SOGLIA, ECCELLENTE } from './rubrica'

export type Esito = 'scarta' | 'incerta' | 'buona'
export interface Vaglio { esito: Esito; motivi: string[]; distanza: number }

/** Distanza tra due ossature (1 − Jaccard delle parti della firma). */
export function distanzaFirme(a = '', b = '') {
  const A = new Set(a.split('|').filter(Boolean)), B = new Set(b.split('|').filter(Boolean))
  if (!A.size && !B.size) return 0
  let comuni = 0
  for (const x of A) if (B.has(x)) comuni++
  return 1 - comuni / (A.size + B.size - comuni)
}

/**
 * Il verdetto del codice. `mostrate`: firme (sistema|firma) delle tavole già viste
 * dall'utente. Scarta solo il chiaramente sbagliato; il resto è buona o incerta.
 */
export function vaglia(esame: Esame, o: { sistema?: string; mostrate?: string[] } = {}): Vaglio {
  const m = esame.misure, c = esame.criteri
  const firma = `${o.sistema ?? ''}|${esame.firma}`
  const distanza = Math.min(1, ...(o.mostrate ?? []).map(f => (f.split('|')[0] === (o.sistema ?? '') ? distanzaFirme(f.split('|').slice(1).join('|'), esame.firma) : 1)))
  const scarti: string[] = []
  if (m?.fuori) scarti.push(`${m.fuori} testi fuori tavola`)
  if (m?.sovrapposti) scarti.push(`${m.sovrapposti} testi sovrapposti`)
  if (c.contenuto < 6) scarti.push('contenuto perso')
  if (c.leggibilita < 4 || (m && m.contrastoMin < 1.6)) scarti.push('illeggibile')
  if (esame.voto < SOGLIA - 20) scarti.push(`voto ${esame.voto}, molto sotto soglia`)
  if (o.mostrate?.includes(firma) || distanza < 0.05) scarti.push('gemella di una tavola già mostrata')
  if (scarti.length) return { esito: 'scarta', motivi: scarti, distanza }
  // dubbi: il codice non sa decidere, decide l'occhio
  const dubbi: string[] = []
  if (esame.voto < ECCELLENTE) dubbi.push(`voto ${esame.voto} sotto l'eccellenza`)
  if (m && m.margine < 0.6) dubbi.push('testi vicini al bordo')
  if (m && (m.densita < 0.12 || m.densita > 0.97)) dubbi.push(m.densita < 0.12 ? 'quasi vuota' : 'piena fino all\'orlo')
  if (m && m.squilibrio > 0.3) dubbi.push('pesi tutti da una parte')
  if (m && m.armonia === 'libera') dubbi.push('tinte senza relazione')
  if (distanza < 0.45) dubbi.push('simile a una già mostrata')
  if (c.leggibilita < 6.5) dubbi.push('leggibilità al limite')
  return { esito: dubbi.length ? 'incerta' : 'buona', motivi: dubbi, distanza }
}

export interface Candidata<T = unknown> { id: string; esame: Esame; sistema?: string; dati?: T }

/** Le finaliste dopo il vaglio: prima le buone, poi le incerte, per voto; mai due gemelle. */
export function finaliste<T>(lista: Candidata<T>[], o: { max?: number; mostrate?: string[] } = {}) {
  const max = o.max ?? 6
  const vagliate = lista.map(x => ({ x, v: vaglia(x.esame, { sistema: x.sistema, mostrate: o.mostrate }) }))
  const vive = vagliate.filter(y => y.v.esito !== 'scarta').sort((a, b) => (a.v.esito === b.v.esito ? b.x.esame.voto - a.x.esame.voto : a.v.esito === 'buona' ? -1 : 1))
  const scelte: typeof vive = []
  for (const y of vive) {
    if (scelte.length >= max) break
    if (scelte.some(s => s.x.sistema === y.x.sistema && distanzaFirme(s.x.esame.firma, y.x.esame.firma) < 0.05)) continue
    scelte.push(y)
  }
  return { finaliste: scelte, scartate: vagliate.filter(y => y.v.esito === 'scarta') }
}
