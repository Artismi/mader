/**
 * Il guscio come servizio (docs/guscio-agente.md, fase G8). Qualunque route o
 * strumento dello Studio può chiedere "fallo nel sistema" con runAgent:
 * stessi strumenti della chat (AgentToolDef), stessa maestra, stessa traccia,
 * ma senza interfaccia e senza streaming.
 *
 *   - i modelli vengono dal registro (scelta dell'utente, poi gli altri
 *     fornitori); con quota finita, errore del servizio o modello che gira a
 *     vuoto (rilevatore di ripetizioni) si passa al successivo;
 *   - A1: una chiamata scritta male (come testo, JSON rotto, nome con prefisso)
 *     si ripara e si esegue; il modello si cambia solo dopo due riparazioni fallite;
 *   - A2: regia per passo (steer.ts): strumento obbligatorio al primo passo se il
 *     compito è un'azione, fase nel promemoria, esecutore diverso dal pianificatore;
 *   - A3: si chiude solo con le prove (evidence.ts): se il registro non conferma
 *     piano e risposta il giro riprende con il motivo, al massimo 3 volte, poi il
 *     compito passa al modello successivo insieme al registro;
 *   - senza interfaccia nessuno può confermare: gli strumenti distruttivi (e le
 *     scritture che chiedono conferma, come la fattura) non vengono eseguiti ma
 *     restituiti come proposte, che il chiamante mostra all'utente.
 */
import { generateText, stepCountIs, type ModelMessage, type StepResult, type ToolSet } from 'ai'
import type { z } from 'zod'
import { candidatesFor, livelloOf, noteFailure, REGIMI, type Livello, type ModelCandidate } from '@/lib/ai/model-registry'
import type { AiTask } from '@/lib/ai/model-provider'
import { buildToolSet, createRepeatGuard, toolGuide, type AgentToolDef, type ToolGroup } from './tools'
import { createTrace } from './trace'
import { createRepairBudget, createToolCallRepair, parseTextToolCalls } from './repair'
import { createPrepareStep, isActionRequest, risksOf, toolsForPhase } from './steer'
import { checkClosure, provaOf, registroText, type EsitoProva } from './evidence'
import type { Risk } from './tools'
import { dayBand, MODO_DI_LAVORARE } from './prompt'
import { CORE_TOOLS } from './core-tools'
import { runPassoPasso } from './passo'
import { SYSTEM_TOOLS } from './system-tools'
import { focusText } from '@/lib/kernel/graph'

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
  /** nodo in focus (es. 'client:abc'): il contesto parte da lui e dai suoi vicini (K3) */
  focus?: string
  /** pagina da cui parte la richiesta (es. '/editoriale'): ai modelli deboli si danno gli strumenti di quella pagina */
  pagina?: string
  /** A2: modello che esegue i passi dopo il primo (il candidato pianifica); costa meno, rompe la cache tra i due */
  esecutore?: ModelCandidate
  /** L1: da dove parte la cascata: 'leggero' (default) sale ai forti solo se A3 non chiude; 'forte' parte dal migliore */
  parti?: 'leggero' | 'forte'
  /** L1: forza il livello di guida ('forte' | 'medio' | 'base'); vuoto = dal registro */
  livello?: Livello
  /** definizioni al posto di quelle di sistema (prove) */
  defs?: Def[]
  /** modelli al posto del registro (prove) */
  candidati?: ModelCandidate[]
  now?: Date
}

/** Una voce del registro delle prove (A3): esito per chiamata, oggetti toccati, elementi falliti. */
export interface Chiamata { strumento: string; input: unknown; esito: EsitoProva; motivo?: string; rischio?: Risk; oggetti?: string[]; falliti?: number }
export interface Proposta { strumento: string; input: unknown; motivo: string }

export interface RunAgentResult {
  ok: boolean
  testo: string
  modello: string
  passi: number
  chiamate: Chiamata[]
  proposte: Proposta[]
  log: string[]
  /** L1: livello di guida del modello che ha risposto */
  livello?: Livello
  /** token del modello che ha completato il compito */
  token?: { input: number; cached: number; output: number }
  /** L1: token spesi da tutti i modelli provati per questo compito */
  spesa?: { input: number; cached: number; output: number }
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
      if (problems.length) chiamate.push({ strumento: d.name, input, esito: 'respinta', rischio: d.risk, motivo: problems.join(' | ').slice(0, 300) })
      return problems
    } : undefined,
    execute: async (input: unknown) => {
      const ask = d.needsApproval ?? d.risk === 'destructive'
      const confirm = typeof ask === 'function' ? await ask(input as never) : ask
      if (confirm) {
        const motivo = d.risk === 'destructive' ? 'azione distruttiva' : 'richiede la conferma dell\'utente'
        proposte.push({ strumento: d.name, input, motivo })
        chiamate.push({ strumento: d.name, input, esito: 'proposta', rischio: d.risk })
        return { success: false, proposta: true, message: `Non eseguito: ${motivo}. L'azione è registrata come proposta e l'utente la confermerà dall'interfaccia. Continua con il resto.` }
      }
      try {
        const out = await d.execute(input as never)
        chiamate.push({ ...provaOf(d.name, d.risk, input, out), input })
        return out
      } catch (e) {
        chiamate.push({ strumento: d.name, input, esito: 'errore', rischio: d.risk })
        throw e
      }
    },
  }))
}

/** Chiamate a strumento scritte nel testo (`<default_api:readTasks …>`, `<tool_call>`, `print(default_api.…)`): il segno di un modello che non usa gli strumenti nativi. */
export function looksLikeTextToolCall(text: string): boolean {
  return parseTextToolCalls(text, []).scritte
}

/** Chiamate che l'AI SDK non è riuscito a leggere nemmeno dopo la riparazione. */
export function invalidCalls(steps: StepResult<ToolSet>[]): number {
  return steps.reduce((n, s) => n + s.toolCalls.filter(t => (t as { invalid?: boolean }).invalid).length, 0)
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
  // K3: il contesto parte dal nodo in focus e dai suoi vicini; il resto l'agente lo chiede al grafo
  const contesto = [input.focus ? focusText(input.focus) : '', input.contesto?.trim() ?? ''].filter(Boolean).join('\n\n')
  const prompt = contesto ? `${input.compito}\n\n<contesto>\n${contesto}\n</contesto>` : input.compito

  const lista = input.candidati ?? candidatesFor({ task: input.task ?? 'general', tools: true, preferisci: input.parti ?? 'leggero' }, { choice: input.modello, riservato: input.riservato })
  if (!lista.length) {
    return { ok: false, testo: 'Nessun modello con strumenti disponibile: aggiungi ANTHROPIC_API_KEY o GEMINI_API_KEY, oppure collega OpenRouter.', modello: '—', passi: 0, chiamate, proposte, log }
  }

  const maxPassi = input.maxPassi ?? 12
  const risks = risksOf(defs)
  const azione = isActionRequest(input.compito)
  let ultimo: { testo: string; modello: string; passi: number; token: RunAgentResult['token'] } | undefined
  const spesa = { input: 0, cached: 0, output: 0 }
  const spendi = (u: { input: number; cached: number; output: number }) => { spesa.input += u.input; spesa.cached += u.cached; spesa.output += u.output }
  for (const c of lista) {
    const trace = createTrace(`runAgent ${c.label}`)
    const ac = new AbortController()
    let stallo = false
    const guard = createRepeatGuard(name => { stallo = true; log.push(`${c.label}: ripete ${name} a vuoto, passo al modello successivo`); ac.abort() })
    const tools = buildToolSet(defs, trace, guard)
    const names = Object.keys(tools)
    const budget = createRepairBudget(2)
    const repair = createToolCallRepair(budget, s => log.push(`${c.label}: ${s}`))
    // il modello successivo riceve il registro: non rifà quello che è già riuscito
    const registro = registroText(chiamate)
    const messages: ModelMessage[] = [{ role: 'user', content: registro ? `${prompt}\n\n${registro}` : prompt }]
    let riprese = 0
    const usage = { input: 0, cached: 0, output: 0 }
    let passi = 0
    let fallitePrima = 0
    let giro = 0
    // se il chiamante ha già scelto gruppi o strumenti vale la sua scelta; altrimenti ai deboli il sottoinsieme di base
    const activeTools = input.pagina && !input.gruppi?.length && !input.strumenti?.length ? toolsForContext(defs, { strength: c.profile.strength, pathname: input.pagina, always: ['updatePlan'] }) : undefined
    // L1: il medio è guidato per fasi, con pochi strumenti per fase e il contesto tenuto corto
    const livello = livelloOf(c, input.livello)
    const regime = REGIMI[livello]
    const pool = activeTools ? defs.filter(d => activeTools.includes(d.name)) : defs
    const perFase = livello === 'medio' && pool.length > regime.strumenti
      ? (f: Parameters<typeof toolsForPhase>[1]) => toolsForPhase(pool, f, { max: regime.strumenti, compito: input.compito, always: ['updatePlan'] })
      : undefined

    // L1: il base lavora un passo alla volta; sale al candidato successivo solo se A3 non chiude (o per errore)
    if (livello === 'base') {
      try {
        const extra = [contesto ? `<contesto>\n${contesto}\n</contesto>` : '', registro].filter(Boolean).join('\n\n')
        const p = await runPassoPasso({
          model: c.model, label: c.label, compito: input.compito, extra, defs: pool, tools, prove: chiamate, risks, azione, maxPassi,
          strumenti: regime.strumenti, contesto: regime.contesto, now, log: s => log.push(s), fermo: () => stallo, abortSignal: ac.signal,
        })
        spendi(p.token)
        if (p.esito === 'ok') {
          trace.finish({ steps: p.passi, inputTokens: p.token.input, cachedInputTokens: p.token.cached, outputTokens: p.token.output, prove: `${chiamate.filter(x => x.rischio && x.rischio !== 'read' && x.esito === 'ok').length} scritture ok` })
          log.push(`${c.label}: un passo alla volta, ${p.passi} passi · ${p.chiamateModello} chiamate`)
          return { ok: true, testo: p.testo, modello: c.label, livello, passi: p.passi, chiamate, proposte, log, token: p.token, spesa }
        }
        if (p.testo) ultimo = { testo: p.testo, modello: c.label, passi: p.passi, token: p.token }
      } catch (e) {
        if (!stallo) log.push(`${c.label}: ${noteFailure(c, e)} · ${String((e as Error)?.message ?? e).slice(0, 160)}`)
      }
      continue
    }
    try {
      while (passi < maxPassi) {
        const r = await generateText({
          model: c.model,
          system,
          messages,
          tools,
          activeTools: activeTools as never,
          experimental_repairToolCall: repair,
          prepareStep: createPrepareStep({
            azione: giro === 0 && azione,
            risks,
            active: activeTools,
            perFase,
            contesto: Number.isFinite(regime.contesto) ? regime.contesto : undefined,
            modelloPerPasso: input.esecutore ? (n => (n > 0 || giro > 0 ? input.esecutore!.model : undefined)) : undefined,
          }),
          // lo stallo ferma il giro anche se il fornitore ignora l'abort (si controlla tra un passo e l'altro);
          // anche due chiamate illeggibili fermano il giro
          stopWhen: [stepCountIs(maxPassi - passi), () => stallo, ({ steps }) => fallitePrima + invalidCalls(steps as never) >= 2],
          abortSignal: ac.signal,
          maxRetries: 0,
        })
        passi += r.steps.length
        giro++
        usage.input += r.totalUsage.inputTokens ?? 0
        usage.cached += r.totalUsage.cachedInputTokens ?? 0
        usage.output += r.totalUsage.outputTokens ?? 0
        if (stallo) break
        budget.fallite = fallitePrima + invalidCalls(r.steps as never)
        fallitePrima = budget.fallite
        if (budget.esaurito) { log.push(`${c.label}: due chiamate illeggibili anche dopo la riparazione, passo al modello successivo`); break }
        messages.push(...r.response.messages)

        // A1: chiamate scritte come testo → si leggono e si eseguono qui, poi il giro riprende
        const scritte = parseTextToolCalls(r.text, names)
        if (scritte.scritte) {
          if (!scritte.chiamate.length) {
            budget.ko()
            fallitePrima = budget.fallite
            if (budget.esaurito) { log.push(`${c.label}: chiamate scritte come testo e illeggibili due volte, passo al modello successivo`); break }
            log.push(`${c.label}: chiamata scritta come testo e illeggibile, chiedo di riprovare`)
            messages.push({ role: 'user', content: `<promemoria>Hai scritto una chiamata a strumento come testo e non si riesce a leggerla. Usa gli strumenti nativi (function calling), con i nomi esatti: ${names.join(', ')}.</promemoria>` })
            continue
          }
          const risultati: string[] = []
          for (const [i, t] of scritte.chiamate.entries()) {
            const out = await tools[t.toolName].execute!(t.input, { toolCallId: `testo-${passi}-${i}`, messages })
            risultati.push(`- ${t.toolName} ${JSON.stringify(t.input)} → ${JSON.stringify(out)}`)
          }
          if (stallo) break
          budget.ok()
          log.push(`${c.label}: riparate ${scritte.chiamate.length} chiamate scritte come testo`)
          messages.push({ role: 'user', content: `<promemoria>Hai scritto le chiamate come testo invece di usare gli strumenti: le ho lette ed eseguite io.\n${risultati.join('\n')}\nContinua il compito usando gli strumenti nativi (function calling), non il testo.</promemoria>` })
          continue
        }
        // A3: chiude solo se il registro conferma piano e risposta
        const motivi = checkClosure({ prove: chiamate, testo: r.text, azione })
        if (motivi.length) {
          ultimo = { testo: r.text.trim(), modello: c.label, passi, token: usage }
          if (++riprese > 3) { log.push(`${c.label}: tre riprese senza prove, il compito passa al modello successivo con il registro`); break }
          log.push(`${c.label}: chiusura senza prove (${riprese}/3): ${motivi[0]}`)
          messages.push({ role: 'user', content: `<promemoria>Non chiudere ancora: il registro delle prove non conferma il lavoro.\n- ${motivi.join('\n- ')}\nContinua con gli strumenti, poi rispondi dicendo solo quello che risulta fatto.</promemoria>` })
          continue
        }
        trace.finish({ steps: passi, inputTokens: usage.input, cachedInputTokens: usage.cached, outputTokens: usage.output, prove: `${chiamate.filter(x => x.rischio && x.rischio !== 'read' && x.esito === 'ok').length} scritture ok${riprese ? `, ${riprese} riprese` : ''}` })
        log.push(`${c.label}: ${passi} passi${budget.riuscite ? ` · ${budget.riuscite} riparazioni` : ''}${riprese ? ` · ${riprese} riprese` : ''}`)
        spendi(usage)
        return { ok: true, testo: r.text.trim(), modello: c.label, livello, passi, chiamate, proposte, log, token: usage, spesa }
      }
      if (passi >= maxPassi && !stallo && !budget.esaurito) log.push(`${c.label}: passi finiti (${maxPassi}) senza chiudere, passo al modello successivo`)
      spendi(usage)
    } catch (e) {
      spendi(usage)
      if (stallo) continue
      const kind = noteFailure(c, e)
      log.push(`${c.label}: ${kind} · ${String((e as Error)?.message ?? e).slice(0, 160)}`)
    }
  }
  // nessuno ha chiuso con le prove: si restituisce l'ultima risposta, segnata come non riuscita
  if (ultimo) return { ok: false, ...ultimo, chiamate, proposte, log, spesa }
  return { ok: false, testo: 'Nessun modello è riuscito a completare il compito.', modello: '—', passi: 0, chiamate, proposte, log }
}
