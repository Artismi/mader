/**
 * Righe di contenuto per gli archetipi che sanno impaginare elenchi: dalle voci
 * strutturate (consigli, passi, dati, programma, menu, domande, tappe) o, in
 * una copertina, dai dettagli. Ogni archetipo le disegna nella sua materia
 * (scontrino, lavagna, tabellone, schede, vignette…): così i tipi con voci non
 * escono più solo dal compositore, e le copertine trovano altre impaginazioni.
 */
import type { TipoContenuto } from '../../types'
import { type G, discard } from '../tools'

export interface Riga {
  /** numero d'ordine già formattato ("01") */
  n: string
  /** nome della voce (titolo del consiglio, piatto, evento, etichetta del dato) */
  nome: string
  /** riga di spiegazione, se c'è */
  testo?: string
  /** valore a destra o protagonista: prezzo, ora, anno, numero */
  valore?: string
}

/** Tipi con voci che gli archetipi sanno impaginare (il confronto a colonne resta ai suoi sistemi). */
export const TIPI_ELENCO: TipoContenuto[] = ['consigli', 'passi', 'dati', 'programma', 'menu', 'faq', 'timeline']

/** Il contenuto ha voci da impaginare? */
export const conVoci = (g: G) => !!g.c.tipo && g.c.tipo !== 'copertina' && g.c.tipo !== 'citazione' && g.c.tipo !== 'prodotto'

/**
 * Le righe del contenuto. Con un tipo con voci: le voci (null se il tipo non è
 * supportato o le voci non stanno). In una copertina: i dettagli, se `dettagli`.
 */
export function righe(g: G, o: { max?: number; dettagli?: boolean } = {}): Riga[] | null {
  const max = o.max ?? 6
  const pad = (i: number) => String(i + 1).padStart(2, '0')
  if (!conVoci(g)) {
    if (!o.dettagli) return []
    return (g.c.details ?? []).map(d => d.trim()).filter(Boolean).slice(0, max).map((d, i) => ({ n: pad(i), nome: d }))
  }
  const tipo = g.c.tipo!
  if (!TIPI_ELENCO.includes(tipo)) { discard(g, `tipo ${tipo} non impaginabile qui`); return null }
  const vs = g.c.voci ?? []
  if (vs.length > max) { discard(g, `troppe voci (${vs.length})`); return null }
  const out: Riga[] = vs.map((v, i) => {
    switch (tipo) {
      case 'dati': return { n: pad(i), nome: v.titolo ?? v.testo ?? '', valore: v.valore, testo: v.titolo ? v.testo : undefined }
      case 'menu': return { n: pad(i), nome: v.titolo ?? '', testo: v.testo, valore: v.prezzo }
      case 'programma': return { n: pad(i), nome: v.titolo ?? '', testo: v.testo, valore: v.ora }
      case 'timeline': return { n: pad(i), nome: v.titolo ?? v.testo ?? '', valore: v.valore, testo: v.titolo ? v.testo : undefined }
      default: return { n: pad(i), nome: v.titolo ?? v.testo ?? '', testo: v.titolo ? v.testo : undefined }
    }
  }).filter(r => r.nome || r.valore)
  if (out.length < 2) { discard(g, 'voci insufficienti'); return null }
  return out
}

/** Il valore è il protagonista della riga (dati, tappe)? Altrimenti sta a lato (prezzi, ore). */
export const valoreProtagonista = (g: G) => g.c.tipo === 'dati' || g.c.tipo === 'timeline'

/**
 * Esito di un elenco disegnato: nessuna riga persa, e i testi o ci sono per
 * tutte le righe che ne hanno uno o per nessuna.
 */
export function elencoRiuscito(g: G, rs: Riga[], messe: number, testi: number) {
  if (messe < rs.length) { discard(g, `righe che non entrano (${messe} su ${rs.length})`); return false }
  const attesi = rs.filter(r => r.testo).length
  if (testi > 0 && testi < attesi) { discard(g, `testi delle righe incompleti (${testi} su ${attesi})`); return false }
  return true
}
