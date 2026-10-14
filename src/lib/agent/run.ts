/**
 * Il guscio come servizio (docs/guscio-agente.md, fase G8). Qualunque route o
 * strumento dello Studio può chiedere "fallo nel sistema" con runAgent:
 * stessi strumenti della chat (AgentToolDef), stessa maestra, stessa traccia,
 * ma senza interfaccia e senza streaming.
 *
 *   - i modelli vengono dal registro (scelta dell'utente, poi gli altri
 *     fornitori); con quota finita, errore del servizio o modello che gira a
 *     vuoto (rilevatore di ripetizioni) si passa al successivo;
 *   - senza interfaccia nessuno può confermare: gli strumenti distruttivi (e le
 *     scritture che chiedono conferma, come la fattura) non vengono eseguiti ma
 *     restituiti come proposte, che il chiamante mostra all'utente.
 */
import { generateText, stepCountIs } from 'ai'
import type { z } from 'zod'
import { candidatesFor, noteFailure, type ModelCandidate } from '@/lib/ai/model-registry'
import type { AiTask } from '@/lib/ai/model-provider'
import { buildToolSet, createRepeatGuard, toolGuide, type AgentToolDef, type ToolGroup } from './tools'
import { createTrace } from './trace'
import { dayBand, MODO_DI_LAVORARE } from './prompt'
import { CORE_TOOLS } from './core-tools'
import { SYSTEM_TOOLS } from './system-tools'

type Def = AgentToolDef<z.ZodTypeAny>

/* ── sottoinsiemi per i modelli deboli ─────────────────────────────────── */

const GRUPPI_PER_PAGINA: { match: RegExp; gruppi: ToolGroup[] }[] = [
  { match: /^\/(progettazione|studio|assets)/, gruppi: ['studio', 'piano'] },
  { match: /^\/(editoriale|pubblica|lancio|domini)/, gruppi: ['social', 'clienti', 'idee', 'piano'] },
  { match: /^\/clienti/, gruppi: ['clienti', 'lavoro', 'memoria', 'social', 'piano'] },
  { match: /^\/finanze/, gruppi: ['finanze', 'clienti', 'piano'] },
  { match: /^\/(idee|cervello)/, gruppi: ['idee', 'memoria', 'clienti', 'piano'] },
]
const GRUPPI_BASE: ToolGroup[] = ['lavoro', 'clienti', 'idee', 'memoria', 'piano']

/**
 * Strumenti attivi per contesto. I modelli forti e medi li vedono tutti; ai
 * deboli si dà un sottoinsieme fisso secondo la pagina (troppi strumenti li
 * confondono). `undefined` = tutti.
 */
export function toolsForContext(defs: Def[], o: { strength: 'forte' | 'medio' | 'debole'; pathname?: string; always?: string[] }): string[] | undefined {
  if (o.strength !== 'debole') return undefined
  const gruppi = GRUPPI_PER_PAGINA.find(g => o.pathname && g.match.test(o.pathname))?.gruppi ?? GRUPPI_BASE
  const names = defs.filter(d => gruppi.includes(d.group)).map(d => d.name)
  return [...new Set([...names, ...(o.always ?? [])])].filter(n => defs.some(d => d.name === n))
}

/* ── runAgent ──────────────────────────────────────────────────────────── */

export interface RunAgentInput {
  /** cosa fare, in parole naturali */
  compito: string
  /** materiale per il compito (testi della grafica, brief, dati della pagina…) */
  contesto?: string
  /** limita gli strumenti a questi gruppi */
  gruppi?: ToolGroup[]
  /** oppure a questi nomi */
  strumenti?: string[]
  /** fornitore scelto: 'claude' | 'gemini' | 'openrouter' (vuoto = Impostazioni / automatico) */
  modello?: string
  task?: AiTask
  maxPassi?: number
  riservato?: boolean
  /** pagina da cui parte la richiesta (es. '/editoriale'): ai modelli deboli si danno gli strumenti di quella pagina */
  pagina?: string
  /** definizioni al posto di quelle di sistema (prove) */
  defs?: Def[]
  /** modelli al posto del registro (prove) */
  candidati?: ModelCandidate[]
  now?: Date
}

export interface Chiamata { strumento: string; input: unknown; esito: 'ok' | 'errore' | 'proposta' | 'respinta'; motivo?: string }
export interface Proposta { strumento: string; input: unknown; motivo: string }

export interface RunAgentResult {
  ok: boolean
  testo: string
  modello: string
  passi: number
  chiamate: Chiamata[]
  proposte: Proposta[]
  log: string[]
  /** token del modello che ha completato il compito */
  token?: { input: number; cached: number; output: number }
}

/** Tutte le definizioni eseguibili sul server (niente strumenti del canvas: quelli li esegue il widget). */
export function serverToolDefs(): Def[] {
  return [...CORE_TOOLS, ...SYSTEM_TOOLS]
}

function selectDefs(all: Def[], o: Pick<RunAgentInput, 'gruppi' | 'strumenti'>): Def[] {
  let out = all
  if (o.gruppi?.length) out = out.filter(d => o.gruppi!.includes(d.group) || d.group === 'piano')
  if (o.strumenti?.length) out = out.filter(d => o.strumenti!.includes(d.name))
  return out
}

/** Senza interfaccia: le azioni che chiedono conferma diventano proposte; ogni chiamata viene registrata. */
function headless(defs: Def[], chiamate: Chiamata[], proposte: Proposta[]): Def[] {
  return defs.map(d => ({
    ...d,
    needsApproval: false,
    // anche i rifiuti della maestra vanno registrati, con il motivo: servono a capire i fallimenti (banco G6)
    verify: d.verify ? async (input: unknown) => {
      const problems = (await d.verify!(input as never)) ?? []
      if (problems.length) chiamate.push({ strumento: d.name, input, esito: 'respinta', motivo: problems.join(' | ').slice(0, 300) })
      return problems
    } : undefined,
    execute: async (input: unknown) => {
      const ask = d.needsApproval ?? d.risk === 'destructive'
      const confirm = typeof ask === 'function' ? await ask(input as never) : ask
      if (confirm) {
        const motivo = d.risk === 'destructive' ? 'azione distruttiva' : 'richiede la conferma dell\'utente'
        proposte.push({ strumento: d.name, input, motivo })
        chiamate.push({ strumento: d.name, input, esito: 'proposta' })
        return { success: false, proposta: true, message: `Non eseguito: ${motivo}. L'azione è registrata come proposta e l'utente la confermerà dall'interfaccia. Continua con il resto.` }
      }
      try {
        const out = await d.execute(input as never)
        const failed = !!out && typeof out === 'object' && (out as { success?: boolean }).success === false
        chiamate.push({ strumento: d.name, input, esito: failed ? 'errore' : 'ok' })
        return out
      } catch (e) {
        chiamate.push({ strumento: d.name, input, esito: 'errore' })
        throw e
      }
    },
  }))
}

/** Chiamate a strumento scritte nel testo (`<default_api:readTasks …>`, `<tool_call>`, `print(default_api.…)`): il segno di un modello che non usa gli strumenti nativi. */
export function looksLikeTextToolCall(text: string): boolean {
  return /<\s*(default_api:|tool_call\b|function_call\b)|```tool_code|\bprint\(default_api\./i.test(text)
}

export function agentSystemPrompt(defs: Def[], now: Date): string {
  const date = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return [
    MODO_DI_LAVORARE,
    `## Strumenti disponibili\n${toolGuide(defs)}`,
    `## Senza interfaccia\nStai lavorando per conto di un altro strumento di Creative OS, non in chat: nessuno risponde alle tue domande durante il lavoro. Il compito che ricevi è già la richiesta dell'utente, quindi puoi scrivere nel sistema senza chiedere un altro sì. Le azioni che chiedono conferma non vengono eseguite: diventano proposte per l'utente. Alla fine scrivi in poche righe cosa hai fatto (con gli ID) e cosa resta da confermare.`,
    `Data: ${date} (${now.toISOString().slice(0, 10)}, ${dayBand(now)})`,
  ].join('\n\n')
}

export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const now = input.now ?? new Date()
  const chiamate: Chiamata[] = []
  const proposte: Proposta[] = []
  const log: string[] = []
  const defs = headless(selectDefs(input.defs ?? serverToolDefs(), input), chiamate, proposte)
  const system = agentSystemPrompt(defs, now)
  const prompt = input.contesto?.trim() ? `${input.compito}\n\n<contesto>\n${input.contesto.trim()}\n</contesto>` : input.compito

  const lista = input.candidati ?? candidatesFor({ task: input.task ?? 'general', tools: true, preferisci: 'forte' }, { choice: input.modello, riservato: input.riservato })
  if (!lista.length) {
    return { ok: false, testo: 'Nessun modello con strumenti disponibile: aggiungi ANTHROPIC_API_KEY o GEMINI_API_KEY, oppure collega OpenRouter.', modello: '—', passi: 0, chiamate, proposte, log }
  }

  for (const c of lista) {
    const trace = createTrace(`runAgent ${c.label}`)
    const ac = new AbortController()
    let stallo = false
    const guard = createRepeatGuard(name => { stallo = true; log.push(`${c.label}: ripete ${name} a vuoto, passo al modello successivo`); ac.abort() })
    try {
      const r = await generateText({
        model: c.model,
        system,
        prompt,
        tools: buildToolSet(defs, trace, guard),
        // se il chiamante ha già scelto gruppi o strumenti vale la sua scelta; altrimenti ai deboli il sottoinsieme di base
        activeTools: (input.pagina && !input.gruppi?.length && !input.strumenti?.length ? toolsForContext(defs, { strength: c.profile.strength, pathname: input.pagina, always: ['updatePlan'] }) : undefined) as never,
        // lo stallo ferma il giro anche se il fornitore ignora l'abort (si controlla tra un passo e l'altro)
        stopWhen: [stepCountIs(input.maxPassi ?? 12), () => stallo],
        abortSignal: ac.signal,
        maxRetries: 0,
      })
      if (stallo) continue
      // modello che scrive la chiamata come testo invece di usare lo strumento: si passa al successivo
      if (!r.steps.some(s => s.toolCalls.length) && looksLikeTextToolCall(r.text)) {
        log.push(`${c.label}: ha scritto la chiamata come testo invece di usare lo strumento, passo al modello successivo`)
        continue
      }
      trace.finish({ steps: r.steps.length, inputTokens: r.totalUsage.inputTokens, cachedInputTokens: r.totalUsage.cachedInputTokens, outputTokens: r.totalUsage.outputTokens })
      log.push(`${c.label}: ${r.steps.length} passi`)
      return { ok: true, testo: r.text.trim(), modello: c.label, passi: r.steps.length, chiamate, proposte, log, token: { input: r.totalUsage.inputTokens ?? 0, cached: r.totalUsage.cachedInputTokens ?? 0, output: r.totalUsage.outputTokens ?? 0 } }
    } catch (e) {
      if (stallo) continue
      const kind = noteFailure(c, e)
      log.push(`${c.label}: ${kind} · ${String((e as Error)?.message ?? e).slice(0, 160)}`)
    }
  }
  return { ok: false, testo: 'Nessun modello è riuscito a completare il compito.', modello: '—', passi: 0, chiamate, proposte, log }
}
