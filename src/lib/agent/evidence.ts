/**
 * A3 (docs/cosa-manca.md): chiudere solo con le prove. Il modello non decide da
 * solo quando ha finito:
 *
 *   - il **contratto** sono le voci del piano (`updatePlan`); una voce può dire
 *     quale strumento la dimostra e quante volte (`prova: { strumento, almeno }`);
 *     senza, vale il controllo a regole sul testo della voce;
 *   - il **registro delle prove** sono le chiamate della traccia, con gli
 *     oggetti toccati: il successo si conta per oggetto, non per chiamata
 *     (2 riusciti su 5 è un risultato parziale);
 *   - il **rilevatore di promesse**: "ho programmato / salvato / creato" senza
 *     nessuna scrittura riuscita non si accetta.
 *
 * `checkClosure` restituisce i motivi per non chiudere (vuoto = si chiude).
 */
import type { Risk } from './tools'

export type EsitoProva = 'ok' | 'parziale' | 'errore' | 'proposta' | 'respinta'

export interface Prova {
  strumento: string
  rischio?: Risk
  esito: EsitoProva
  /** ID degli oggetti scritti o letti con successo */
  oggetti?: string[]
  /** elementi non riusciti dentro una chiamata riuscita */
  falliti?: number
  input?: unknown
}

export interface VoceContratto {
  testo: string
  stato: string
  prova?: { strumento: string; almeno?: number }
}

const LISTE_FALLITI = ['errori', 'falliti', 'errors', 'failed', 'scartati']

/** Oggetti toccati e falliti, letti dal risultato di uno strumento (`id`, `ids`, `count`, `errori`…). */
export function objectsOf(strumento: string, out: unknown): { oggetti: string[]; falliti: number } {
  const o = out && typeof out === 'object' && !Array.isArray(out) ? out as Record<string, unknown> : {}
  const oggetti: string[] = []
  if (typeof o.id === 'string' && o.id) oggetti.push(o.id)
  for (const k of ['ids', 'creati', 'aggiornati']) if (Array.isArray(o[k])) oggetti.push(...(o[k] as unknown[]).map(String))
  if (!oggetti.length && typeof o.count === 'number') for (let i = 0; i < o.count; i++) oggetti.push(`${strumento}#${i + 1}`)
  let falliti = 0
  for (const k of LISTE_FALLITI) {
    if (Array.isArray(o[k])) falliti += (o[k] as unknown[]).length
    else if (typeof o[k] === 'number') falliti += o[k] as number
  }
  return { oggetti, falliti }
}

/** Una chiamata come prova: errore se `success: false`, parziale se dentro qualcosa è fallito. */
export function provaOf(strumento: string, rischio: Risk | undefined, input: unknown, out: unknown): Prova {
  const failed = !!out && typeof out === 'object' && (out as { success?: unknown }).success === false
  const { oggetti, falliti } = objectsOf(strumento, out)
  return { strumento, rischio, input, esito: failed ? 'errore' : falliti > 0 ? 'parziale' : 'ok', oggetti, falliti }
}

/** L'ultimo piano scritto con updatePlan: è il contratto del compito. */
export function contractOf(prove: Pick<Prova, 'strumento' | 'input'>[]): VoceContratto[] | undefined {
  const last = [...prove].reverse().find(p => p.strumento === 'updatePlan')
  const passi = (last?.input as { passi?: VoceContratto[] } | undefined)?.passi
  return Array.isArray(passi) ? passi : undefined
}

const scrittura = (p: Prova) => p.rischio !== undefined && p.rischio !== 'read'
const riuscita = (p: Prova) => p.esito === 'ok' || p.esito === 'parziale'
/** oggetti distinti scritti con successo (da uno strumento o da tutti) */
function scritti(prove: Prova[], strumento?: string): number {
  const ids = new Set<string>()
  let senzaId = 0
  for (const p of prove) {
    if (!scrittura(p) || !riuscita(p) || (strumento && p.strumento !== strumento)) continue
    if (p.oggetti?.length) p.oggetti.forEach(id => ids.add(id))
    else senzaId++
  }
  return ids.size + senzaId
}

const VERBO_SCRITTURA = /\b(programm|pianific|cre|aggiung|salv|spost|aggiorn|modific|elimin|cancell|segn|registr|inser|impost|archivi|assegn|rinomin|approv|fattur)\w*/i
const PROMESSA = /(?<!\bnon\s)\b(?:ho|abbiamo|l'ho|li ho|le ho)\s+(?:già\s+|anche\s+)?(programmat|pianificat|creat|aggiunt|salvat|spostat|aggiornat|modificat|eliminat|cancellat|segnat|registrat|inserit|impostat|archiviat|assegnat|rinominat|approvat|fatturat)\w*(?:\s+(\d+))?|\b(?:è|sono)\s+stat[aoie]\s+(?:programmat|creat|aggiunt|salvat|spostat|aggiornat|eliminat|registrat|inserit)\w*/i

/** Numero nel testo di una voce ("programma 3 post") o di una promessa ("ho creato 3 incarichi"). */
const numero = (t: string) => { const m = /\b(\d{1,3})\b/.exec(t); return m ? Number(m[1]) : undefined }

export interface ClosureInput {
  prove: Prova[]
  /** risposta finale del modello */
  testo: string
  /** contratto esplicito; se manca si usa l'ultimo updatePlan del registro */
  contratto?: VoceContratto[]
  /** la richiesta era un'azione: il rilevatore di promesse vale anche senza piano né scritture tentate */
  azione?: boolean
}

// la risposta ammette che qualcosa non è andato: il risultato parziale è dichiarato
const AMMESSO = /\bnon (?:sono |è )?(?:riuscit|andat|stat[oaie] possibil)|\bfallit|\berror[ei]\b|\bmancan[ot]|\bsolo \d+|\bnon ho potuto/i

/** Prove dai passi dell'AI SDK (chat in streaming: lì non c'è il registro di runAgent). */
export function proveFromSteps(steps: { toolCalls: { toolName: string; input?: unknown }[]; toolResults: { toolName: string; input?: unknown; output?: unknown }[] }[], risks: Record<string, Risk | undefined>): Prova[] {
  return steps.flatMap(s => s.toolResults.map(r => provaOf(r.toolName, risks[r.toolName], r.input, r.output)))
}

export function checkClosure(o: ClosureInput): string[] {
  const motivi: string[] = []
  const prove = o.prove
  const piano = o.contratto ?? contractOf(prove)
  const totale = scritti(prove)
  const proposte = prove.filter(p => p.esito === 'proposta').length

  for (const v of piano ?? []) {
    if (v.stato !== 'fatto') { motivi.push(`il passo «${v.testo}» del piano è ancora «${v.stato}»: completalo o aggiorna il piano spiegando perché non si può`); continue }
    if (v.prova?.strumento) {
      const serve = v.prova.almeno ?? 1
      const n = scritti(prove, v.prova.strumento) + prove.filter(p => p.esito === 'proposta' && p.strumento === v.prova!.strumento).length
      if (n < serve) motivi.push(`«${v.testo}»: risultano ${n} ${v.prova.strumento} riusciti, ne servono ${serve}`)
      continue
    }
    if (VERBO_SCRITTURA.test(v.testo) && !totale && !proposte) {
      motivi.push(`«${v.testo}» è segnato fatto, ma nel registro non c'è nessuna scrittura riuscita`)
      continue
    }
    const n = VERBO_SCRITTURA.test(v.testo) ? numero(v.testo) : undefined
    if (n && totale + proposte < n) motivi.push(`«${v.testo}»: hai detto ${n}, ne risultano ${totale + proposte}`)
  }

  // rilevatore di promesse senza azione
  const promessa = o.azione || piano || prove.some(scrittura) ? PROMESSA.exec(o.testo) : null
  if (promessa) {
    const n = promessa[2] ? Number(promessa[2]) : undefined
    if (!totale) {
      motivi.push(proposte
        ? `scrivi di aver ${promessa[0].replace(/^\S+\s+/, '')}, ma le scritture sono solo proposte da confermare: dillo così`
        : `scrivi «${promessa[0]}», ma nel registro non c'è nessuna scrittura riuscita: fai davvero l'azione con lo strumento, poi rispondi`)
    } else if (n && totale < n) {
      motivi.push(`hai detto di averne ${n}, ne risulta${totale === 1 ? '' : 'no'} ${totale}`)
    }
  }

  // successo per oggetto: una chiamata riuscita a metà non è un successo
  for (const p of AMMESSO.test(o.testo) ? [] : prove.filter(p => p.esito === 'parziale')) {
    motivi.push(`${p.strumento}: riuscito su ${p.oggetti?.length ?? 0} elementi, ${p.falliti} non riusciti: rimedia o dillo nella risposta`)
  }
  return [...new Set(motivi)]
}

/** Il registro in breve, per il modello successivo quando il compito cambia mano. */
export function registroText(prove: Prova[]): string {
  const righe = prove.filter(p => scrittura(p) || p.esito === 'proposta').map(p => `- ${p.strumento}: ${p.esito}${p.oggetti?.length ? ` (${p.oggetti.slice(0, 6).join(', ')})` : ''}`)
  return righe.length ? `<registro>\nGià fatto da un modello precedente (non ripeterlo):\n${righe.join('\n')}\n</registro>` : ''
}
