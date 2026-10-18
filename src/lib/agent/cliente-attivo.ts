/**
 * Il cliente del turno, deciso dalla conversazione e non dal cliente selezionato
 * nell'app: l'ultima frase dell'utente che nomina un cliente o dice "nessun
 * cliente" / "progetto nuovo" vince. Il cliente non si attribuisce da solo ai
 * progetti nuovi: senza indicazioni resta un suggerimento, non una scelta.
 */

export type SceltaCliente =
  | { stato: 'nessuno'; motivo: string }
  | { stato: 'cliente'; nome: string }
  | { stato: 'auto' }

// "[Soggetto: X]" e "[File: …]" in testa li aggiunge la chat: non sono parole dell'utente
export const senzaPrefissi = (t: string) => t.replace(/^(\s*\[(Soggetto|File): [^\]]*\]\s*)+/i, '').trim()

const NESSUNO = /\b(nessun cliente|senza (?:un |il )?cliente|niente cliente|non (?:è|e'|e) (?:per )?(?:un |il )?cliente|non (?:è|e') di (?:un |nessun )?cliente|(?:è |e' )?(?:un )?progetto (?:nuovo|personale|mio)|nuovo progetto|progetto interno)\b/i
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Scelta del cliente dagli ultimi messaggi dell'utente (dal più vecchio al più recente). */
export function clienteDelTurno(testiUtente: string[], nomiClienti: string[]): SceltaCliente {
  const nomi = nomiClienti.filter(n => n.trim().length >= 3)
  for (let i = testiUtente.length - 1; i >= Math.max(0, testiUtente.length - 6); i--) {
    const t = senzaPrefissi(testiUtente[i])
    const n = NESSUNO.exec(t)
    if (n) return { stato: 'nessuno', motivo: n[0] }
    for (const nome of nomi) {
      const parola = new RegExp(`(^|[^\\p{L}])${esc(nome)}($|[^\\p{L}])`, 'iu')
      if (!parola.test(t)) continue
      // "non è per Bicicleria", "lascia stare Bicicleria": nominato per escluderlo
      if (new RegExp(`\\b(non (è|e'|riguarda|c'entra)|lascia (stare|perdere)|niente|tranne)\\s+(per |con |di )?(il |la )?(cliente )?${esc(nome)}`, 'iu').test(t)) return { stato: 'nessuno', motivo: `non ${nome}` }
      return { stato: 'cliente', nome }
    }
  }
  return { stato: 'auto' }
}

/** Riga del promemoria sul cliente. */
export function notaCliente(s: SceltaCliente, selezionato?: string): string {
  if (s.stato === 'nessuno') return `## Cliente\nNessun cliente: l'utente ha detto «${s.motivo}». Non attribuire il lavoro a nessun cliente, non passare clientId o cliente agli strumenti e non usare brand o vault di clienti.`
  if (s.stato === 'cliente') return `## Cliente\nCliente del lavoro: ${s.nome} (nominato dall'utente).`
  return selezionato
    ? `## Cliente\nNell'app è selezionato ${selezionato}, ma l'utente non l'ha nominato: usalo solo se la richiesta lo riguarda chiaramente. Un progetto nuovo non si attribuisce a un cliente senza che l'utente lo dica.`
    : ''
}

/** Con "nessun cliente" gli strumenti non ricevono un cliente: la chiamata si respinge con il motivo. */
export function clienteVietato(s: SceltaCliente, input: unknown): string | undefined {
  if (s.stato !== 'nessuno' || !input || typeof input !== 'object') return undefined
  const i = input as Record<string, unknown>
  const v = i.clientId ?? i.cliente ?? i.client
  return typeof v === 'string' && v.trim()
    ? `L'utente ha detto che questo lavoro non è di un cliente («${s.motivo}»): ripeti la chiamata senza clientId/cliente.`
    : undefined
}
