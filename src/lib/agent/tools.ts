/**
 * Il guscio degli strumenti. Ogni strumento dell'assistente si dichiara una
 * volta con gruppo, rischio, schema e tetto sul risultato; il guscio lo avvolge
 * con le regole comuni (vedi docs/guscio-agente.md):
 *
 *   - un'eccezione non interrompe il giro: torna al modello come
 *     { success: false, error }, così il modello vede cosa è andato storto e si corregge;
 *   - la maestra (`verify`) controlla l'ingresso prima di eseguire e rimanda
 *     errori precisi invece di eseguire una richiesta sbagliata;
 *   - un risultato troppo lungo viene tagliato con una nota che chiede di
 *     restringere la ricerca (protegge la finestra di contesto);
 *   - gli strumenti `destructive` chiedono la conferma dell'utente (approvazione AI SDK v6);
 *   - ogni esecuzione finisce nella traccia della richiesta.
 */
import { tool, type Tool } from 'ai'
import type { z } from 'zod'
import type { Trace } from './trace'
import { riassunto } from './summary'

export type Risk = 'read' | 'write' | 'destructive'
export type ToolGroup = 'lavoro' | 'clienti' | 'idee' | 'social' | 'studio' | 'memoria' | 'finanze' | 'documenti' | 'piano'

export interface AgentToolDef<S extends z.ZodTypeAny> {
  name: string
  group: ToolGroup
  risk: Risk
  /** Scritta per il modello: cosa fa, quando usarlo, quando no. */
  description: string
  inputSchema: S
  /** Tetto sul risultato serializzato, in caratteri (default 8000, ~2k token). */
  maxChars?: number
  /** La maestra sull'ingresso: errori precisi (vuoto = va bene). */
  verify?: (input: z.infer<S>) => string[] | Promise<string[]>
  /**
   * Controllo dopo l'esecuzione (rilettura): problemi trovati su quello che è
   * stato scritto davvero. Non annulla la scrittura: il risultato li riporta in
   * `controlli` perché il modello li corregga o li dica all'utente.
   */
  after?: (input: z.infer<S>, output: unknown) => string[] | Promise<string[]>
  /** Conferma dell'utente: di default solo per gli strumenti distruttivi. */
  needsApproval?: boolean | ((input: z.infer<S>) => boolean | Promise<boolean>)
  /** Esecuzione lato server. Gli strumenti del canvas restituiscono una conferma: li esegue il client. */
  execute: (input: z.infer<S>) => unknown | Promise<unknown>
}

const DEFAULT_MAX = 8000

/** Taglia un risultato troppo lungo: accorcia i campi testo più lunghi, poi in ultima istanza l'intero JSON. */
export function capResult(out: unknown, max = DEFAULT_MAX): unknown {
  let json: string
  try { json = JSON.stringify(out) ?? '' } catch { return out }
  if (json.length <= max) return out
  const note = `Risultato tagliato (${json.length} caratteri, massimo ${max}): restringi la richiesta con filtri o un limite più basso.`
  if (out && typeof out === 'object' && !Array.isArray(out)) {
    const o = { ...(out as Record<string, unknown>) }
    const ELLIPSIS = ' […]'
    const strings = Object.entries(o).filter(([, v]) => typeof v === 'string' && v.length > 200).sort((a, b) => (b[1] as string).length - (a[1] as string).length)
    for (const [k, v] of strings) {
      const over = JSON.stringify(o).length - max + note.length + 40
      if (over <= 0) break
      const s = v as string
      o[k] = s.slice(0, Math.max(200, s.length - over - ELLIPSIS.length)) + ELLIPSIS
    }
    if (JSON.stringify(o).length <= max + note.length + 40) return { ...o, truncated: true, note }
  }
  return { success: true, truncated: true, note, preview: json.slice(0, max) }
}

function errorText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.length > 400 ? msg.slice(0, 400) + '…' : msg
}

/**
 * Rilevatore di ripetizioni: la stessa chiamata identica che fallisce di nuovo
 * (o che si ripete anche se riesce) è il segno che il modello gira a vuoto.
 *   2ª ripetizione fallita → l'errore suggerisce un approccio diverso;
 *   3ª → `onStallo` (runAgent passa al modello successivo) e il modello è invitato a fermarsi.
 */
export interface RepeatGuard {
  after(name: string, input: unknown, failed: boolean): { hint?: string }
}

export function createRepeatGuard(onStallo?: (name: string) => void): RepeatGuard {
  const counts = new Map<string, number>()
  return {
    after(name, input, failed) {
      let key: string
      try { key = `${name}:${JSON.stringify(input)}` } catch { return {} }
      const n = (counts.get(key) ?? 0) + 1
      counts.set(key, n)
      if (failed && n === 2) return { hint: "Hai già fatto questa chiamata identica e non ha funzionato: cambia approccio (parametri diversi, un altro strumento, oppure chiedi all'utente)." }
      if ((failed && n >= 3) || n >= 4) {
        onStallo?.(name)
        return { hint: `Stai ripetendo ${name} con gli stessi parametri (${n} volte): fermati e spiega all'utente cosa non funziona.` }
      }
      return {}
    },
  }
}

/** Trasforma la definizione in uno strumento dell'AI SDK con le regole del guscio. */
export function defineTool<S extends z.ZodTypeAny>(def: AgentToolDef<S>, trace?: Trace, guard?: RepeatGuard): Tool {
  const approval = def.needsApproval ?? def.risk === 'destructive'
  return tool({
    description: def.description,
    inputSchema: def.inputSchema,
    needsApproval: approval as never,
    // L1: al modello poche righe essenziali (summary.ts), all'interfaccia e alle prove il risultato intero
    toModelOutput: ({ output }: { output: unknown }) => ({ type: 'text', value: riassunto(def.name, output, def.maxChars ?? DEFAULT_MAX) }),
    execute: async (input: z.infer<S>) => {
      const t0 = Date.now()
      let ok = true
      const withHint = (out: unknown) => {
        const { hint } = guard?.after(def.name, input, !ok) ?? {}
        if (!hint) return out
        return out && typeof out === 'object' && !Array.isArray(out) ? { ...(out as object), avviso: hint } : { risultato: out, avviso: hint }
      }
      try {
        const problems = (await def.verify?.(input)) ?? []
        if (problems.length) {
          ok = false
          return withHint({ success: false, error: `Richiesta da correggere prima di eseguire:\n- ${problems.join('\n- ')}` })
        }
        let out = await def.execute(input)
        if (out && typeof out === 'object' && (out as { success?: boolean }).success === false) ok = false
        if (ok && def.after) {
          const controlli = await def.after(input, out)
          if (controlli.length) out = out && typeof out === 'object' && !Array.isArray(out) ? { ...(out as object), controlli } : { risultato: out, controlli }
        }
        return withHint(capResult(out, def.maxChars ?? DEFAULT_MAX))
      } catch (e) {
        ok = false
        // un riferimento rotto (cliente, idea, piano) non è un guasto del database: dice come correggere
        const fk = /FOREIGN KEY constraint failed/i.test(errorText(e)) ? ' (un ID passato non esiste: rileggilo con lo strumento di ricerca e usa l’ID che restituisce)' : ''
        return withHint({ success: false, error: `${def.name} non riuscito: ${errorText(e)}${fk}` })
      } finally {
        trace?.tool(def.name, Date.now() - t0, ok)
      }
    },
  } as never) as Tool
}

/** Registro: definizioni → ToolSet dell'AI SDK, più la mappa dei rischi per la guida e i test. */
export function buildToolSet(defs: AgentToolDef<z.ZodTypeAny>[], trace?: Trace, guard?: RepeatGuard) {
  const tools: Record<string, Tool> = {}
  for (const d of defs) tools[d.name] = defineTool(d, trace, guard)
  return tools
}

/** Una riga per strumento, raggruppata: va nella parte stabile del prompt. */
export function toolGuide(defs: AgentToolDef<z.ZodTypeAny>[]): string {
  const groups = new Map<ToolGroup, AgentToolDef<z.ZodTypeAny>[]>()
  for (const d of defs) groups.set(d.group, [...(groups.get(d.group) ?? []), d])
  const RISK: Record<Risk, string> = { read: 'lettura', write: 'scrive', destructive: 'chiede conferma' }
  return [...groups.entries()]
    .map(([g, ds]) => `- **${g}**: ${ds.map(d => `\`${d.name}\` (${RISK[d.risk]})`).join(', ')}`)
    .join('\n')
}
