/**
 * L1: riassunti dei risultati fatti dal codice. Al modello arrivano poche righe
 * essenziali (ID, titoli, stati, conteggi) invece del JSON intero; il risultato
 * vero resta all'interfaccia e al registro delle prove. capResult resta il tetto.
 *
 * Via di mezzo: si toglie il rumore (JSON, campi tecnici), non i dati che servono
 * a decidere; i tetti sono larghi e ogni taglio dice quante righe mancano.
 * Ogni strumento di sistema ha il suo riassunto; gli altri usano quello generico,
 * che tiene i messaggi interi e taglia gli elenchi lunghi dicendo quante righe mancano.
 */
type Out = Record<string, unknown>

const PRIMA = ['error', 'message', 'avviso', 'controlli']
const SALTA = new Set(['success', 'truncated'])

function righe(s: string, max: number): string {
  const r = s.split('\n').map(x => x.trim()).filter(Boolean)
  const tagliate = r.slice(0, max).map(x => (x.length > 300 ? `${x.slice(0, 297)}…` : x))
  return r.length > max ? `${tagliate.join('\n')}\n…(+${r.length - max} righe: restringi con filtri)` : tagliate.join('\n')
}

function breve(v: unknown, max = 200): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v) ?? ''
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

function voce(k: string, v: unknown, maxRighe: number): string | undefined {
  if (v === undefined || v === null || v === '') return undefined
  if (typeof v === 'string') return v.includes('\n') ? `${k}:\n${righe(v, maxRighe)}` : `${k}: ${breve(v, 3000)}`
  if (typeof v === 'number' || typeof v === 'boolean') return `${k}: ${v}`
  if (Array.isArray(v)) {
    if (!v.length) return `${k}: nessuno`
    const r = v.map(x => (x && typeof x === 'object' ? Object.values(x).filter(y => y !== undefined && y !== '').map(y => breve(y, 200)).join(' · ') : breve(x, 160)))
    return `${k} (${v.length}):\n${righe(r.join('\n'), maxRighe)}`
  }
  return `${k}: ${breve(v, 300)}`
}

/** Riassunto generico: prima errori, messaggi e avvisi, poi i campi; elenchi lunghi tagliati. */
export function riassuntoGenerico(out: unknown, o: { maxRighe?: number; salta?: string[] } = {}): string {
  if (out === undefined || out === null) return 'fatto'
  if (typeof out !== 'object' || Array.isArray(out)) return voce('risultato', out, o.maxRighe ?? 30) ?? 'fatto'
  const x = out as Out
  const chiavi = [...PRIMA.filter(k => k in x), ...Object.keys(x).filter(k => !PRIMA.includes(k) && !SALTA.has(k) && !o.salta?.includes(k))]
  const testa = x.success === false ? 'NON RIUSCITO' : x.success === true ? 'ok' : ''
  const corpo = chiavi.map(k => voce(k, x[k], o.maxRighe ?? 30)).filter(Boolean)
  return [testa, ...corpo].filter(Boolean).join('\n') || 'fatto'
}

const conCampi = (prendi: (x: Out) => Out, maxRighe?: number) => (out: unknown) =>
  out && typeof out === 'object' && (out as Out).success !== false ? riassuntoGenerico(prendi(out as Out), { maxRighe }) : riassuntoGenerico(out)

/** Un riassunto per ogni strumento di sistema (system-tools.ts). */
export const RIASSUNTI: Record<string, (out: unknown) => string> = {
  updatePlan: conCampi(x => ({ success: x.success, avanzamento: x.avanzamento, prossimo: x.prossimo })),
  readEditorialPlan: conCampi(x => x, 40),
  updateEditorialPost: conCampi(x => ({ success: x.success, message: x.message, id: x.id, controlli: x.controlli, avviso: x.avviso })),
  listIdeas: conCampi(x => x, 30),
  getClient: conCampi(x => ({ ...x, vault: breve(x.vault, 2500) }), 15),
  graphSearch: conCampi(x => ({ ...x, nodi: Array.isArray(x.nodi) ? (x.nodi as Out[]).map(n => ({ ref: n.ref, titolo: n.titolo, estratto: breve(n.estratto, 200) })) : x.nodi }), 15),
  graphRelated: conCampi(x => ({ ...x, vicini: Array.isArray(x.vicini) ? (x.vicini as Out[]).map(n => ({ ref: n.ref, relazione: n.relazione, titolo: n.titolo })) : x.vicini }), 30),
  clientContext: conCampi(x => ({ success: x.success, nome: x.nome, percentuale: x.percentuale, manca: x.manca, presente: x.presente }), 20),
  searchMemory: conCampi(x => ({ ...x, vault: breve(x.vault, 2000) }), 15),
  // la regia: testi e direzioni servono interi a chi impagina; si toglie solo l'elenco dei modelli usati
  directDesign: out => (out && typeof out === 'object' && (out as Out).success !== false
    ? JSON.stringify(Object.fromEntries(Object.entries(out as Out).filter(([k]) => k !== 'modelli')))
    : riassuntoGenerico(out)),
}

/** Il testo che vede il modello per il risultato di uno strumento, entro `max` caratteri. */
export function riassunto(strumento: string, out: unknown, max = 8000): string {
  let s: string
  try { s = (RIASSUNTI[strumento] ?? riassuntoGenerico)(out) } catch { s = breve(out, max) }
  return s.length > max ? `${s.slice(0, max - 60)}…\n(tagliato a ${max} caratteri: restringi la richiesta)` : s
}
