// Le decisioni della città che toccano la voce e le mani: frasi sospese e spinte verso un mestiere.
// Sono scritte nello stato (st.citta) dall'assemblea; qui si leggono senza dipendenze, da chiunque scriva o scelga.
import type { AgentState } from '../core/types'

type ConCitta = AgentState & { citta?: { decisioni?: { tipo: string; param: Record<string, unknown>; fino: number; stato: string }[] } }
let SOSPESE: string[] = []

/** da chiamare quando si carica lo stato: le frasi sospese valgono finché la decisione è in vigore */
export function aggiornaSospese(st: AgentState) {
  const d = (st as ConCitta).citta?.decisioni ?? []
  SOSPESE = d.filter(x => x.tipo === 'sospendi' && x.stato === 'in vigore' && x.fino >= st.day).map(x => String(x.param.frase).toLowerCase())
  return SOSPESE
}
/** i modelli che non contengono una frase sospesa (se lo sono tutti, si torna a tutti: meglio una ripetizione che il silenzio) */
export function libere<T>(xs: T[], testo: (x: T) => string = x => String(x)): T[] {
  if (!SOSPESE.length) return xs
  const ok = xs.filter(x => { const t = testo(x).toLowerCase(); return !SOSPESE.some(f => t.includes(f)) })
  return ok.length ? ok : xs
}
/** la spinta di oggi: gli strumenti di un mestiere che la città ha deciso di far lavorare da solo */
export function spinta(st: AgentState): string[] | null {
  const d = (st as ConCitta).citta?.decisioni ?? []
  const s = d.find(x => x.tipo === 'solo' && x.stato === 'in vigore' && x.fino >= st.day)
  return s ? (s.param.strumenti as string[]) : null
}

// ── le commissioni della bottega: la città chiede una tavola, lo studio la fa ─────────────────────────────
export type Commissione = { id: string; giorno: number; autore: string; nome: string; con?: string; parola: string; strumenti: string[]; perche: string; stato: 'in attesa' | 'fatta' | 'scaduta'; fatte?: string[]; giornoAgente?: number; esito?: string }
type ConBottega = AgentState & { citta?: { bottega?: Commissione[] } }
/** la prossima commissione da fare (la più vecchia in attesa) */
export function prossimaCommissione(st: AgentState): Commissione | null {
  return (st as ConBottega).citta?.bottega?.find(c => c.stato === 'in attesa') ?? null
}
export function commissioneFatta(st: AgentState, c: Commissione, ids: string[]) {
  c.stato = 'fatta'; c.fatte = ids; c.giornoAgente = st.day
}
