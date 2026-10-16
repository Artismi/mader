/**
 * Compattazione della storia (docs/guscio-agente.md §3.4). La chat rimanda a
 * ogni richiesta tutta la conversazione, comprese le tavole JSON di
 * composeDesign: oltre una soglia costa e peggiora le risposte (context rot).
 *
 *   1. svuotare: i risultati e gli ingressi degli strumenti più vecchi degli
 *      ultimi messaggi diventano una riga (nome dello strumento ed esito);
 *   2. riassumere: se non basta, i turni vecchi diventano un riassunto scritto
 *      da un modello economico, tenuto in memoria per non rifarlo a ogni richiesta.
 */
import type { ModelMessage } from 'ai'

export const COMPACT_BUDGET = 60_000   // token stimati oltre cui si interviene
export const KEEP_RECENT = 6           // messaggi recenti lasciati intatti

/** Stima grezza ma stabile: ~4 caratteri per token. */
export function estimateTokens(messages: ModelMessage[]): number {
  return Math.ceil(JSON.stringify(messages).length / 4)
}

type Part = { type: string; toolName?: string; output?: { type: string; value?: unknown }; input?: unknown }

function outcome(output: Part['output']): string {
  const v = output?.value as { success?: boolean } | string | undefined
  // L1: i risultati arrivano al modello come riassunto di testo (summary.ts)
  if (typeof v === 'string') return v.startsWith('NON RIUSCITO') ? 'errore' : 'ok'
  return v && typeof v === 'object' && v.success === false ? 'errore' : 'ok'
}

/** Passo 1: svuota strumenti vecchi. Non tocca gli ultimi `keep` messaggi. */
export function clearOldToolOutputs(messages: ModelMessage[], keep = KEEP_RECENT): ModelMessage[] {
  const cut = Math.max(0, messages.length - keep)
  return messages.map((m, i) => {
    if (i >= cut || typeof m.content === 'string') return m
    if (m.role === 'tool') {
      return { ...m, content: (m.content as Part[]).map(p => p.type === 'tool-result'
        ? { ...p, output: { type: 'text', value: `[risultato di ${p.toolName} rimosso per spazio: ${outcome(p.output)}]` } }
        : p) } as ModelMessage
    }
    if (m.role === 'assistant') {
      return { ...m, content: (m.content as Part[]).map(p => p.type === 'tool-call' && JSON.stringify(p.input ?? {}).length > 400
        ? { ...p, input: { compattato: true } }
        : p) } as ModelMessage
    }
    return m
  }) as ModelMessage[]
}

const summaries = new Map<string, string>()

function hash(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0).toString(36) + s.length
}

function transcript(messages: ModelMessage[]): string {
  return messages.map(m => {
    const body = typeof m.content === 'string' ? m.content
      : (m.content as (Part & { text?: string })[]).map(p => p.type === 'text' ? p.text : p.type === 'tool-call' ? `[usa ${p.toolName}]` : p.type === 'tool-result' ? `[${p.toolName}: ${outcome(p.output)}]` : '').join(' ')
    return `${m.role}: ${body}`
  }).join('\n').slice(0, 120_000)
}

export interface CompactResult { messages: ModelMessage[]; note?: string }

/**
 * Applica i due passi solo se servono. `summarize` riceve la trascrizione dei
 * turni vecchi e restituisce il riassunto (iniettato dalla route con il modello economico).
 */
export async function compactHistory(
  messages: ModelMessage[],
  summarize: (text: string) => Promise<string>,
  budget = COMPACT_BUDGET,
): Promise<CompactResult> {
  const before = estimateTokens(messages)
  if (before <= budget) return { messages }

  const cleared = clearOldToolOutputs(messages)
  const afterClear = estimateTokens(cleared)
  if (afterClear <= budget) return { messages: cleared, note: `svuotati strumenti vecchi ${before}→${afterClear} token` }

  // taglio su un messaggio dell'utente, così le coppie chiamata/risultato restano intere
  let cut = Math.max(0, cleared.length - KEEP_RECENT)
  while (cut > 0 && cleared[cut].role !== 'user') cut--
  if (cut <= 1) return { messages: cleared, note: `svuotati strumenti vecchi ${before}→${afterClear} token` }

  const old = cleared.slice(0, cut)
  const key = hash(JSON.stringify(old))
  let summary = summaries.get(key)
  if (!summary) {
    try {
      summary = await summarize(transcript(old))
    } catch {
      return { messages: cleared, note: 'riassunto non riuscito: solo svuotamento' }
    }
    summaries.set(key, summary)
    if (summaries.size > 50) summaries.delete(summaries.keys().next().value as string)
  }
  const out: ModelMessage[] = [
    { role: 'user', content: `<riassunto-conversazione>\n${summary}\n</riassunto-conversazione>` },
    { role: 'assistant', content: 'Ho il riassunto della conversazione precedente: continuo da lì.' },
    ...cleared.slice(cut),
  ]
  return { messages: out, note: `riassunti ${cut} messaggi ${before}→${estimateTokens(out)} token` }
}

export const SUMMARY_PROMPT = `Riassumi questa conversazione tra un utente e l'assistente di Creative OS per l'assistente stesso, che dovrà continuarla senza rileggerla.
Tieni: obiettivi dell'utente, decisioni prese, preferenze espresse, cliente e progetto in corso, contenuti approvati o salvati (con ID se presenti), cose create nel sistema, problemi aperti, prossimo passo.
Scarta: saluti, ripetizioni, output grezzi degli strumenti. Elenco puntato, in italiano, al massimo 350 parole.`
