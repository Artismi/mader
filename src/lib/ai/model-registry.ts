/**
 * Registro unico dei modelli (docs/guscio-agente.md, fase G7).
 *
 * Ogni chiamata IA del portale (chat, ruoli dello Studio, planner, Office,
 * schemi, OS, template) sceglie il modello da qui:
 *   - fornitori disponibili secondo le chiavi presenti: OpenRouter (OAuth),
 *     Claude (ANTHROPIC_API_KEY), Gemini (GEMINI_API_KEY o GOOGLE_GENERATIVE_AI_API_KEY);
 *   - un profilo di capacità per modello: strumenti, visione, output strutturato, forza, contesto;
 *   - ordine: scelta dell'utente (chat o Impostazioni) → gli altri fornitori;
 *     i modelli che hanno finito la quota si saltano per un po'.
 * Solo lato server: le chiavi non escono dal portale.
 */
import { anthropic } from '@ai-sdk/anthropic'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateObject, generateText, type LanguageModel } from 'ai'
import type { z } from 'zod'
import { google } from '@/lib/ai/google'
import { config } from '@/lib/db'
import { getOpenRouterKey, getOpenRouterModels, type AiTask } from '@/lib/ai/model-provider'
import { idState, markRetired, refreshStaleCatalogs, type IdState } from '@/lib/ai/model-catalog'

export type Provider = 'openrouter' | 'anthropic' | 'google'
export type Strength = 'forte' | 'medio' | 'debole'

export interface ModelProfile {
  /** strumenti (function calling) nativi */
  tools: boolean
  vision: boolean
  /** output strutturato con schema (Output.object / generateObject) */
  structured: boolean
  strength: Strength
  /** finestra di contesto in token (stima) */
  context: number
  free: boolean
  /** L1: come lo guida il guscio (dedotto dalla forza; si forza con setLivello) */
  livello: Livello
}

/**
 * L1: profili di capacità del guscio. Il codice decide, il modello fa solo il pezzo che il codice non sa fare:
 *   - forte: agente libero, tutti gli strumenti, contesto intero (come prima);
 *   - medio: guidato per fasi, fino a 12 strumenti per fase, contesto ~8k;
 *   - base: un passo alla volta (il codice chiede strumento e dati, esegue, riassume), 3–5 strumenti, contesto ~3k.
 */
export type Livello = 'forte' | 'medio' | 'base'
export interface Regime { livello: Livello; strumenti: number; contesto: number }
export const REGIMI: Record<Livello, Regime> = {
  forte: { livello: 'forte', strumenti: Infinity, contesto: Infinity },
  medio: { livello: 'medio', strumenti: 12, contesto: 8_000 },
  base: { livello: 'base', strumenti: 5, contesto: 3_000 },
}
const LIVELLO_DA_FORZA: Record<Strength, Livello> = { forte: 'forte', medio: 'medio', debole: 'base' }
export const isLivello = (v: unknown): v is Livello => v === 'forte' || v === 'medio' || v === 'base'

export interface ModelCandidate {
  /** chiave unica per la quota: "fornitore:modello" */
  id: string
  provider: Provider
  modelId: string
  label: string
  profile: ModelProfile
  model: LanguageModel
}

/** Modelli abbastanza bravi da impaginare a coordinate e reggere compiti aperti. */
export function isStrongModel(label: string): boolean {
  if (/:free\b/i.test(label)) return false
  return /claude-(sonnet|opus|fable)|gpt-5|gpt-4\.1|\bo3\b|gemini-(2\.5|3(\.\d)?)-pro|grok-4/i.test(label)
}

/** Profilo dedotto dal nome: prudente quando non si sa. */
export function profileOf(provider: Provider, modelId: string): ModelProfile {
  const id = modelId.toLowerCase()
  const free = /:free\b/.test(id)
  const gemma = /gemma/.test(id)
  // parole di taglia come segmenti del nome ("gemini" contiene "mini": non deve contare)
  const small = /(^|[-_/.:])(lite|mini|nano|small|[1-9](\.\d)?b)(?=$|[-_/.:])/.test(id)
  const lite = small || /haiku|flash-8b/.test(id)
  const strength: Strength = isStrongModel(modelId) ? 'forte' : free || gemma || small ? 'debole' : 'medio'
  const claude = /claude/.test(id)
  const gemini = /gemini/.test(id)
  return {
    // Gemma via API Gemini non ha strumenti nativi né istruzioni di sistema
    tools: !gemma,
    vision: claude || gemini || /gpt-4o|gpt-4\.1|gpt-5|vision|vl\b|llama-4|pixtral/.test(id),
    structured: !gemma && (claude || gemini || provider === 'openrouter'),
    strength,
    context: claude ? 200_000 : gemini ? 1_000_000 : lite ? 32_000 : 128_000,
    free,
    livello: LIVELLO_DA_FORZA[strength],
  }
}

const LIVELLO_KEY = 'ai.livello'

/**
 * Il livello con cui il guscio guida un candidato: forzato dal chiamante, poi dalle
 * Impostazioni (per modello, poi per tutti), altrimenti dedotto dal profilo.
 */
export function livelloOf(c: { id: string; profile: Pick<ModelProfile, 'livello'> }, forza?: string): Livello {
  const scelto = [forza, config.get(`${LIVELLO_KEY}:${c.id}`), config.get(LIVELLO_KEY)].find(isLivello)
  return scelto ?? c.profile.livello
}
/** Forza il livello per un modello ("fornitore:modello") o per tutti; '' torna alla deduzione. */
export function setLivello(v: Livello | '', id?: string) { config.set(id ? `${LIVELLO_KEY}:${id}` : LIVELLO_KEY, v) }

/* ── chiavi e fornitori ────────────────────────────────────────────────── */

export interface KeyState { openrouter: boolean; anthropic: boolean; google: boolean }

export function keyState(env: NodeJS.ProcessEnv = process.env): KeyState {
  return {
    openrouter: !!getOpenRouterKey(),
    anthropic: !!env.ANTHROPIC_API_KEY,
    google: !!(env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY),
  }
}

/** Modelli per fornitore e livello: il primo è il preferito, gli altri ripieghi nello stesso fornitore. */
const DIRECT: Record<Exclude<Provider, 'openrouter'>, Record<AiTask, string[]>> = {
  // alias senza data: Anthropic li sposta sull'ultima versione della famiglia
  anthropic: { design: ['claude-sonnet-5-5', 'claude-haiku-5-5'], general: ['claude-haiku-5-5', 'claude-sonnet-5-5'] },
  // prima gli alias "-latest" (non vengono ritirati); gli ID con versione restano come ripiego e il catalogo
  // li scarta quando il fornitore li ritira. Gemma: gratuita, senza strumenti nativi: solo ruoli a JSON
  google: { design: ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-flash-lite-latest', 'gemma-4-31b-it'], general: ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemma-4-31b-it', 'gemma-4-26b-a4b-it'] },
}

const PREF_KEY = 'ai.fornitore'

/** Il fornitore scelto nelle Impostazioni (vuoto = automatico). */
export function preferredProvider(): Provider | undefined {
  const v = config.get(PREF_KEY)
  return v === 'openrouter' || v === 'anthropic' || v === 'google' ? v : undefined
}
export function setPreferredProvider(p: Provider | '') { config.set(PREF_KEY, p) }

/** Normalizza la scelta della chat ('claude' | 'gemini' | 'openrouter') nel nome del fornitore. */
export function choiceToProvider(choice?: string): Provider | undefined {
  if (choice === 'claude' || choice === 'anthropic') return 'anthropic'
  if (choice === 'gemini' || choice === 'google') return 'google'
  if (choice === 'openrouter') return 'openrouter'
  return undefined
}

function instantiate(provider: Provider, modelId: string): LanguageModel {
  if (provider === 'anthropic') return anthropic(modelId)
  if (provider === 'google') return google(modelId)
  const or = createOpenRouter({ apiKey: getOpenRouterKey() ?? '', compatibility: 'strict', headers: { 'X-Title': 'Creative OS' } })
  return or.chat(modelId)
}

/* ── quota e errori (prima in roles.ts) ───────────────────────────────── */

const exhausted = new Map<string, number>()

export function markExhausted(id: string, ms: number) { exhausted.set(id, Date.now() + ms) }
export function isExhausted(id: string) { return (exhausted.get(id) ?? 0) > Date.now() }
export function resetExhausted() { exhausted.clear() }

/** quota: passa oltre e ricorda · salta: modello assente o non adatto · altro: errore vero. */
export function classifyError(e: unknown): 'quota' | 'salta' | 'altro' {
  const err = e as { statusCode?: number; message?: string; responseBody?: string; lastError?: unknown }
  const inner = err.lastError as { statusCode?: number; message?: string; responseBody?: string } | undefined
  const status = err.statusCode ?? inner?.statusCode
  const text = `${err.message ?? ''} ${err.responseBody ?? ''} ${inner?.message ?? ''} ${inner?.responseBody ?? ''}`
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit|credits/i.test(text)) return 'quota'
  if (status === 404 || status === 400 || status === 401 || status === 403 || (status ?? 0) >= 500
    || /not found|not supported|unavailable|overloaded|denied|no longer available|api key is missing|invalid x-api-key|internal error/i.test(text)) return 'salta'
  return 'altro'
}

/** Registra l'errore di un candidato: per la quota lo mette da parte per un po'. */
export function noteFailure(c: { id: string }, e: unknown): 'quota' | 'salta' | 'altro' {
  const kind = classifyError(e)
  if (kind === 'quota') markExhausted(c.id, /per.?day|daily/i.test(String((e as Error)?.message)) ? 3 * 3600_000 : 65_000)
  // modello inesistente: un giorno; servizio giù o richiesta rifiutata: dieci minuti
  const retired = (e as { statusCode?: number })?.statusCode === 404 || /no longer available|not found for api version|does not exist|deprecated/i.test(`${(e as Error)?.message ?? ''} ${(e as { responseBody?: string })?.responseBody ?? ''}`)
  if (kind === 'salta') markExhausted(c.id, retired ? 24 * 3600_000 : 10 * 60_000)
  // ID ritirato: lo ricorda il catalogo, e checkModelIds lo segnala nelle Impostazioni
  if (kind === 'salta' && retired) {
    const [provider, ...rest] = c.id.split(':')
    if (provider === 'google' || provider === 'anthropic' || provider === 'openrouter') markRetired(provider, rest.join(':'))
  }
  return kind
}

/* ── scelta ────────────────────────────────────────────────────────────── */

export interface Need {
  task: AiTask
  /** servono strumenti nativi */
  tools?: boolean
  vision?: boolean
  structured?: boolean
  /** preferenza di forza: 'forte' mette avanti i forti, 'leggero' gli economici */
  preferisci?: 'forte' | 'leggero'
}

export interface PickOptions {
  /** scelta esplicita (chat): 'openrouter' | 'claude' | 'gemini' */
  choice?: string
  /** lavoro riservato: niente tier gratuiti di Google */
  riservato?: boolean
  keys?: KeyState
  /** includere anche i modelli in pausa per quota (ultimo tentativo) */
  includeExhausted?: boolean
}

function providerOrder(keys: KeyState, first?: Provider): Provider[] {
  const base: Provider[] = ['openrouter', 'anthropic', 'google']
  const order = first ? [first, ...base.filter(p => p !== first)] : base
  return order.filter(p => keys[p])
}

function modelsFor(provider: Provider, task: AiTask): string[] {
  if (provider === 'openrouter') {
    const m = getOpenRouterModels()
    return [...new Set(task === 'design' ? [m.design, m.general] : [m.general, m.design])]
  }
  return DIRECT[provider][task]
}

/** Tutti i candidati adatti, in ordine di preferenza. */
export function candidatesFor(need: Need, opts: PickOptions = {}): ModelCandidate[] {
  const keys = opts.keys ?? keyState()
  const first = choiceToProvider(opts.choice) ?? preferredProvider()
  const out: ModelCandidate[] = []
  const providers = providerOrder(keys, first)
  if (!opts.keys) refreshStaleCatalogs(providers)
  for (const provider of providers) {
    // Google gratuito usa i contenuti per migliorare i prodotti: escluso per i lavori riservati
    if (opts.riservato && provider === 'google') continue
    for (const modelId of modelsFor(provider, need.task)) {
      const profile = profileOf(provider, modelId)
      if (need.tools && !profile.tools) continue
      if (need.vision && !profile.vision) continue
      if (need.structured && !profile.structured) continue
      const id = `${provider}:${modelId}`
      // ritirato secondo l'elenco del fornitore: non si prova nemmeno
      if (idState(provider, modelId) === 'ritirato') continue
      if (!opts.includeExhausted && isExhausted(id)) continue
      out.push({ id, provider, modelId, label: provider === 'openrouter' ? `openrouter:${modelId}` : modelId, profile, model: instantiate(provider, modelId) })
    }
  }
  if (need.preferisci) {
    const rank = (s: Strength) => (need.preferisci === 'forte' ? { forte: 0, medio: 1, debole: 2 } : { debole: 0, medio: 1, forte: 2 })[s]
    // ordinamento stabile: dentro lo stesso livello resta l'ordine dei fornitori
    return out.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c.profile.strength) - rank(b.c.profile.strength) || a.i - b.i).map(x => x.c)
  }
  return out
}

/** Il primo candidato adatto. Se sono tutti in pausa per quota, riprova comunque il primo. */
export function pickModel(need: Need, opts: PickOptions = {}): ModelCandidate {
  const list = candidatesFor(need, opts)
  if (list.length) return list[0]
  const any = candidatesFor(need, { ...opts, includeExhausted: true })
  if (any.length) return any[0]
  throw new Error('Nessun modello disponibile: aggiungi ANTHROPIC_API_KEY o GEMINI_API_KEY in .env.local, oppure collega OpenRouter nelle Impostazioni.')
}

/** Compatibilità con il vecchio resolveModel(choice, task). */
export function resolveModel(choice: string | undefined, task: AiTask): { model: LanguageModel; label: string; profile: ModelProfile; id: string } {
  const c = pickModel({ task }, { choice })
  return { model: c.model, label: c.label, profile: c.profile, id: c.id }
}

/** Panoramica per le Impostazioni e il debug. */
export function registrySummary() {
  const keys = keyState()
  return {
    chiavi: keys,
    preferito: preferredProvider() ?? 'automatico',
    modelli: (['design', 'general'] as AiTask[]).map(task => ({
      task,
      ordine: candidatesFor({ task }, { includeExhausted: true }).map(c => ({ id: c.id, ...c.profile, inPausa: isExhausted(c.id) })),
    })),
  }
}

/**
 * Esegue una chiamata provando i candidati in ordine: con quota finita, chiave
 * mancante o modello non disponibile passa al successivo. Gli altri errori risalgono.
 */
export async function withModels<T>(need: Need, run: (c: ModelCandidate) => Promise<T>, opts: PickOptions = {}): Promise<{ value: T; model: ModelCandidate }> {
  const list = candidatesFor(need, opts)
  if (!list.length) list.push(pickModel(need, opts))
  let last: unknown
  for (const c of list) {
    try {
      return { value: await run(c), model: c }
    } catch (e) {
      last = e
      if (noteFailure(c, e) === 'altro') throw e
    }
  }
  throw last instanceof Error ? last : new Error(String(last))
}

/** generateText con la cascata dei modelli. */
export async function generateTextWith(need: Need, args: Omit<Parameters<typeof generateText>[0], 'model'>, opts: PickOptions = {}) {
  const r = await withModels(need, c => generateText({ ...args, model: c.model, maxRetries: 0 } as Parameters<typeof generateText>[0]), opts)
  return { text: r.value.text, label: r.model.label, result: r.value }
}

/** generateObject con la cascata dei modelli che reggono l'output strutturato. */
export async function generateObjectWith<S extends z.ZodTypeAny>(
  need: Omit<Need, 'structured'>,
  args: { schema: S; system?: string; prompt: string; temperature?: number },
  opts: PickOptions = {},
): Promise<{ object: z.infer<S>; label: string }> {
  const r = await withModels({ ...need, structured: true }, c => generateObject({ model: c.model, schema: args.schema, system: args.system, prompt: args.prompt, temperature: args.temperature, maxRetries: 0 }), opts)
  return { object: r.value.object as z.infer<S>, label: r.model.label }
}

/** Stato di ogni ID usato dal portale (registro + modelli OpenRouter scelti): per le Impostazioni e i test. */
export function checkModelIds(): { fornitore: Provider; id: string; stato: IdState }[] {
  const out: { fornitore: Provider; id: string; stato: IdState }[] = []
  const seen = new Set<string>()
  const add = (p: Provider, id: string) => { if (!seen.has(`${p}:${id}`)) { seen.add(`${p}:${id}`); out.push({ fornitore: p, id, stato: idState(p, id) }) } }
  for (const p of ['anthropic', 'google'] as const) for (const t of ['design', 'general'] as AiTask[]) DIRECT[p][t].forEach(id => add(p, id))
  const or = getOpenRouterModels()
  add('openrouter', or.design); add('openrouter', or.general)
  return out
}
