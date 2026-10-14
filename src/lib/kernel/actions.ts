/**
 * Azioni uniche (docs/sistema-centrale.md §3.1, fase K1). Ogni capacità del
 * sistema si definisce una volta sola: schema, rischio, controlli della
 * maestra, logica. Dalla stessa definizione nascono:
 *   - le Server Actions dei pulsanti (runAction con actor 'user');
 *   - gli strumenti dell'agente (actionTool → AgentToolDef, actor 'agent');
 *   - le voci di Ctrl+K (listActions);
 *   - più avanti l'API, il server MCP e gli eventi (K2).
 */
import type { z } from 'zod'
import type { AgentToolDef, Risk, ToolGroup } from '@/lib/agent/tools'

export type ActionRisk = 'read' | 'write' | 'destructive' | 'external'
export type Domain = 'task' | 'idea' | 'post' | 'client' | 'quote' | 'memory' | 'design'

export interface ActionContext {
  /** chi agisce: 'user', 'agent', 'agent:<profilo>', 'rule:<id>', 'sync:<connettore>' */
  actor: string
  /** riferimento del nodo da cui nasce l'azione (es. 'mail:123'): la provenienza */
  origin?: string
}

export interface ActionDef<S extends z.ZodTypeAny = z.ZodTypeAny, O = unknown> {
  /** dominio.verbo */
  id: string
  /** per Ctrl+K e i pulsanti */
  title: string
  /** per il modello: cosa fa, quando usarlo, quando no */
  description: string
  domain: Domain
  /** gruppo degli strumenti dell'agente */
  group: ToolGroup
  input: S
  risk: ActionRisk
  /** nome dello strumento in chat, se esisteva già (il widget e le skill lo conoscono) */
  toolName?: string
  maxChars?: number
  /** la maestra: errori precisi; ctx dice chi agisce (alcune regole valgono solo per l'IA) */
  verify?: (input: z.infer<S>, ctx: ActionContext) => string[] | Promise<string[]>
  run: (input: z.infer<S>, ctx: ActionContext) => O | Promise<O>
  /** rilettura dopo l'esecuzione */
  after?: (input: z.infer<S>, output: O) => string[] | Promise<string[]>
  needsApproval?: boolean | ((input: z.infer<S>) => boolean | Promise<boolean>)
  /** evento registrato (K2) */
  emits?: string
  /** compare in Ctrl+K (default: sì per write, no per read) */
  palette?: boolean
}

type AnyAction = ActionDef<z.ZodTypeAny, unknown>
const registry = new Map<string, AnyAction>()

export function defineAction<S extends z.ZodTypeAny, O>(def: ActionDef<S, O>): ActionDef<S, O> {
  if (!/^[a-z]+\.[a-z_]+$/.test(def.id)) throw new Error(`id azione non valido: ${def.id} (dominio.verbo)`)
  registry.set(def.id, def as unknown as AnyAction)
  return def
}

export function getAction(id: string): AnyAction | undefined { return registry.get(id) }

/** Ganci eseguiti dopo ogni azione riuscita (K2: eventi e provenienza). */
type AfterHook = (def: AnyAction, input: unknown, output: unknown, ctx: ActionContext) => void
const hooks: AfterHook[] = []
export function onActionDone(h: AfterHook) { hooks.push(h) }

const failed = (out: unknown) => !!out && typeof out === 'object' && (out as { success?: boolean }).success === false

/** Esegue la logica e i ganci, senza controlli (li fa chi chiama: runAction o il guscio degli strumenti). */
export async function executeAction<S extends z.ZodTypeAny, O>(def: ActionDef<S, O>, input: z.infer<S>, ctx: ActionContext): Promise<O> {
  const out = await def.run(input, ctx)
  if (!failed(out)) for (const h of hooks) {
    try { h(def as unknown as AnyAction, input, out, ctx) } catch (e) { console.error(`[azioni] gancio dopo ${def.id}:`, e) }
  }
  return out
}

export type ActionResult<O> = { ok: true; output: O; controlli?: string[] } | { ok: false; errors: string[]; output?: O }

/**
 * Esegue un'azione da qualunque superficie: valida l'ingresso, applica la
 * maestra, esegue, rilegge. Per l'utente non chiede conferme (le chiede
 * l'interfaccia); per l'agente le conferme le gestisce il guscio.
 */
export async function runAction<O = unknown>(idOrDef: string | ActionDef<z.ZodTypeAny, O>, rawInput: unknown, ctx: ActionContext = { actor: 'user' }): Promise<ActionResult<O>> {
  const def = (typeof idOrDef === 'string' ? registry.get(idOrDef) : idOrDef) as ActionDef<z.ZodTypeAny, O> | undefined
  if (!def) return { ok: false, errors: [`azione sconosciuta: ${String(idOrDef)}`] }
  const parsed = def.input.safeParse(rawInput)
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map(i => `${i.path.join('.') || 'input'}: ${i.message}`) }
  const problems = (await def.verify?.(parsed.data, ctx)) ?? []
  if (problems.length) return { ok: false, errors: problems }
  const output = await executeAction(def, parsed.data, ctx)
  if (failed(output)) {
    const o = output as { error?: string; message?: string }
    return { ok: false, errors: [o.error ?? o.message ?? 'azione non riuscita'], output }
  }
  const controlli = (await def.after?.(parsed.data, output)) ?? []
  return controlli.length ? { ok: true, output, controlli } : { ok: true, output }
}

/** Esegue e lancia un errore leggibile se non riesce (comodo nelle Server Actions). */
export async function runActionOrThrow<O = unknown>(id: string, input: unknown, ctx: ActionContext = { actor: 'user' }): Promise<O> {
  const r = await runAction<O>(id, input, ctx)
  if (!r.ok) throw new Error(r.errors.join(' '))
  return r.output
}

const TOOL_RISK: Record<ActionRisk, Risk> = { read: 'read', write: 'write', destructive: 'destructive', external: 'destructive' }

/** Lo strumento dell'agente generato dall'azione (stesse regole, actor 'agent'). */
export function actionTool<S extends z.ZodTypeAny, O>(def: ActionDef<S, O>, actor = 'agent'): AgentToolDef<S> {
  return {
    name: def.toolName ?? def.id.replace('.', '_'),
    group: def.group,
    risk: TOOL_RISK[def.risk],
    description: def.description,
    inputSchema: def.input,
    maxChars: def.maxChars,
    verify: def.verify ? (i: z.infer<S>) => def.verify!(i, { actor }) : undefined,
    after: def.after as AgentToolDef<S>['after'],
    needsApproval: def.needsApproval ?? (def.risk === 'external' ? true : undefined),
    execute: (i: z.infer<S>) => executeAction(def, i, { actor }),
  }
}

/** Voci per Ctrl+K: le azioni che cambiano qualcosa (e quelle segnate palette). */
export function listActions(o: { all?: boolean } = {}) {
  return [...registry.values()]
    .filter(a => o.all || (a.palette ?? a.risk !== 'read'))
    .map(a => ({ id: a.id, title: a.title, domain: a.domain, risk: a.risk }))
    .sort((a, b) => a.id.localeCompare(b.id))
}
