/**
 * Test del registro dei modelli e di runAgent (src/lib/ai/model-registry.ts,
 * src/lib/agent/run.ts) con chiavi simulate e un modello finto: nessuna
 * chiamata vera ai fornitori. Database temporaneo.
 *   npm run test:agente
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'registro-')), 'test.db')

const reg = await import('../../src/lib/ai/model-registry')
const { runAgent, toolsForContext, serverToolDefs } = await import('../../src/lib/agent/run')
const { createRepeatGuard } = await import('../../src/lib/agent/tools')
const { MockLanguageModelV3 } = await import('ai/test')
const { ideas } = await import('../../src/lib/db/index')

const NESSUNA = { openrouter: false, anthropic: false, google: false }
const TUTTE = { openrouter: false, anthropic: true, google: true }

/* ── chiavi e ordine ──────────────────────────────────────────────────── */

test('keyState legge le chiavi dall\'ambiente', () => {
  assert.deepEqual(reg.keyState({ ANTHROPIC_API_KEY: 'x' } as unknown as NodeJS.ProcessEnv), { openrouter: false, anthropic: true, google: false })
  assert.equal(reg.keyState({ GOOGLE_GENERATIVE_AI_API_KEY: 'x' } as unknown as NodeJS.ProcessEnv).google, true)
})

test('senza chiavi nessun candidato e un errore chiaro', () => {
  assert.equal(reg.candidatesFor({ task: 'general' }, { keys: NESSUNA }).length, 0)
  assert.throws(() => reg.pickModel({ task: 'general' }, { keys: NESSUNA }), /ANTHROPIC_API_KEY o GEMINI_API_KEY/)
})

test('con una sola chiave si usa quel fornitore, anche se la scelta era un altro', () => {
  const soloGoogle = { ...NESSUNA, google: true }
  const c = reg.pickModel({ task: 'general' }, { keys: soloGoogle, choice: 'claude' })
  assert.equal(c.provider, 'google')
})

test('la scelta della chat viene prima, poi gli altri fornitori', () => {
  assert.equal(reg.candidatesFor({ task: 'design' }, { keys: TUTTE, choice: 'gemini' })[0].provider, 'google')
  assert.equal(reg.candidatesFor({ task: 'design' }, { keys: TUTTE, choice: 'claude' })[0].provider, 'anthropic')
  const ordine = [...new Set(reg.candidatesFor({ task: 'design' }, { keys: TUTTE, choice: 'gemini' }).map(c => c.provider))]
  assert.deepEqual(ordine, ['google', 'anthropic'])
})

test('la scelta nelle Impostazioni vale quando la chat non sceglie', () => {
  reg.setPreferredProvider('google')
  assert.equal(reg.candidatesFor({ task: 'general' }, { keys: TUTTE })[0].provider, 'google')
  reg.setPreferredProvider('')
  assert.equal(reg.candidatesFor({ task: 'general' }, { keys: TUTTE })[0].provider, 'anthropic')
})

test('lavoro riservato: niente Google gratuito', () => {
  assert.ok(reg.candidatesFor({ task: 'general' }, { keys: TUTTE, riservato: true }).every(c => c.provider !== 'google'))
})

test('servono strumenti: Gemma esclusa; senza strumenti resta come ripiego generoso', () => {
  const conTools = reg.candidatesFor({ task: 'general', tools: true }, { keys: { ...NESSUNA, google: true } })
  assert.ok(conTools.length > 0 && conTools.every(c => !/gemma/.test(c.modelId)))
  const senza = reg.candidatesFor({ task: 'general', preferisci: 'leggero' }, { keys: { ...NESSUNA, google: true } })
  assert.match(senza[0].modelId, /gemma|lite/)
})

test('visione: il critico ha solo modelli che vedono le immagini', () => {
  assert.ok(reg.candidatesFor({ task: 'design', vision: true }, { keys: TUTTE }).every(c => c.profile.vision))
})

test('profili', () => {
  assert.equal(reg.profileOf('anthropic', 'claude-sonnet-5-5').strength, 'forte')
  assert.equal(reg.profileOf('anthropic', 'claude-haiku-5-5').strength, 'medio')
  assert.equal(reg.profileOf('openrouter', 'meta-llama/llama-3.3-8b-instruct:free').strength, 'debole')
  assert.equal(reg.profileOf('google', 'gemma-4-31b-it').tools, false)
  assert.equal(reg.profileOf('google', 'gemma-4-31b-it').strength, 'debole')
  assert.equal(reg.profileOf('openrouter', 'anthropic/claude-opus-5.5').strength, 'forte')
})

test('quota: il modello viene saltato, poi si riprova se non resta altro', () => {
  reg.resetExhausted()
  const prima = reg.candidatesFor({ task: 'general' }, { keys: { ...NESSUNA, anthropic: true } })
  for (const c of prima) reg.noteFailure(c, Object.assign(new Error('quota exceeded'), { statusCode: 429 }))
  assert.equal(reg.candidatesFor({ task: 'general' }, { keys: { ...NESSUNA, anthropic: true } }).length, 0)
  assert.equal(reg.pickModel({ task: 'general' }, { keys: { ...NESSUNA, anthropic: true } }).provider, 'anthropic')
  reg.resetExhausted()
})

test('classifyError', () => {
  assert.equal(reg.classifyError({ statusCode: 429 }), 'quota')
  assert.equal(reg.classifyError(new Error('RESOURCE_EXHAUSTED')), 'quota')
  assert.equal(reg.classifyError(new Error('Anthropic API key is missing.')), 'salta')
  assert.equal(reg.classifyError(new Error('This model is no longer available to new users')), 'salta')
  assert.equal(reg.classifyError({ lastError: { statusCode: 429 } }), 'quota')
  assert.equal(reg.classifyError(new Error('schema non valido nel mio codice')), 'altro')
})

test('withModels passa al successivo con la quota finita e si ferma sugli errori veri', async () => {
  reg.resetExhausted()
  const keys = TUTTE
  const visti: string[] = []
  const r = await reg.withModels({ task: 'general' }, async c => {
    visti.push(c.provider)
    if (c.provider === 'anthropic') throw Object.assign(new Error('rate limit'), { statusCode: 429 })
    return 'ok'
  }, { keys })
  assert.equal(r.value, 'ok')
  assert.equal(r.model.provider, 'google')
  assert.ok(visti.includes('anthropic'))
  reg.resetExhausted()
  await assert.rejects(reg.withModels({ task: 'general' }, async () => { throw new Error('bug nel mio codice') }, { keys }), /bug nel mio codice/)
})

/* ── adattamento ai modelli deboli ────────────────────────────────────── */

test('toolsForContext: tutti per i forti, sottoinsieme per pagina ai deboli', () => {
  const defs = serverToolDefs()
  assert.equal(toolsForContext(defs, { strength: 'forte' }), undefined)
  const social = toolsForContext(defs, { strength: 'debole', pathname: '/editoriale', always: ['updatePlan'] })!
  assert.ok(social.includes('readEditorialPlan') && social.includes('saveInstagramDraft'))
  assert.ok(!social.includes('createFinancialDocument'))
  assert.ok(social.length < defs.length)
})

test('rilevatore di ripetizioni: avviso alla seconda, stallo alla terza', () => {
  const stalli: string[] = []
  const g = createRepeatGuard(n => stalli.push(n))
  assert.deepEqual(g.after('readTasks', { a: 1 }, true), {})
  assert.match(g.after('readTasks', { a: 1 }, true).hint!, /cambia approccio/)
  assert.match(g.after('readTasks', { a: 1 }, true).hint!, /fermati/)
  assert.deepEqual(stalli, ['readTasks'])
  assert.deepEqual(g.after('readTasks', { a: 2 }, true), {}, 'parametri diversi: nessun avviso')
})

/* ── runAgent con un modello finto ────────────────────────────────────── */

const usage = { inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 10, text: 10, reasoning: 0 } }
const step = (content: unknown[], unified: 'tool-calls' | 'stop') => ({ content, finishReason: { unified, raw: unified }, usage, warnings: [] })

function finto(id: string, risposte: ReturnType<typeof step>[]) {
  // con un array il mock salta la prima risposta (indice dopo il push): si usa un contatore
  let i = 0
  const model = new MockLanguageModelV3({ modelId: id, doGenerate: async () => risposte[Math.min(i++, risposte.length - 1)] as never })
  return { id: `mock:${id}`, provider: 'anthropic' as const, modelId: id, label: id, model, profile: reg.profileOf('anthropic', 'claude-sonnet-5-5') }
}

test('runAgent esegue uno strumento vero e risponde', async () => {
  const m = finto('m1', [
    step([{ type: 'tool-call', toolCallId: 't1', toolName: 'createIdea', input: JSON.stringify({ text: 'Carosello sui chicchi etiopi', title: 'Chicchi etiopi' }) }], 'tool-calls'),
    step([{ type: 'text', text: 'Ho salvato l\'idea "Chicchi etiopi".' }], 'stop'),
  ])
  const r = await runAgent({ compito: 'Salva come idea un carosello sui chicchi etiopi', candidati: [m] })
  assert.equal(r.ok, true)
  assert.equal(r.modello, 'm1')
  assert.deepEqual(r.chiamate.map(c => [c.strumento, c.esito]), [['createIdea', 'ok']])
  assert.ok(ideas.getAll().some(i => i.title === 'Chicchi etiopi'))
  assert.match(r.testo, /Chicchi etiopi/)
})

test('runAgent: la fattura senza interfaccia diventa una proposta, il preventivo no', async () => {
  const { clients } = await import('../../src/lib/db/index')
  const cli = clients.create({ name: 'Studio Fattura', category: 'cliente' } as never)
  const m = finto('m2', [
    step([{ type: 'tool-call', toolCallId: 't1', toolName: 'createFinancialDocument', input: JSON.stringify({ type: 'fattura', clientId: cli.id, title: 'Logo', items: [{ desc: 'logo', qty: 1, unitPrice: 500 }] }) }], 'tool-calls'),
    step([{ type: 'text', text: 'Fattura da confermare.' }], 'stop'),
  ])
  const r = await runAgent({ compito: 'emetti la fattura', candidati: [m] })
  assert.equal(r.proposte.length, 1)
  assert.equal(r.proposte[0].strumento, 'createFinancialDocument')
  assert.equal(r.chiamate[0].esito, 'proposta')
})

test('runAgent: un modello che gira a vuoto viene sostituito dal successivo', async () => {
  const giro = step([{ type: 'tool-call', toolCallId: 'x', toolName: 'searchClient', input: JSON.stringify({ name: 'Inesistente' }) }], 'tool-calls')
  const testardo = finto('testardo', [giro, giro, giro, giro, giro])
  const bravo = finto('bravo', [step([{ type: 'text', text: 'Il cliente non esiste: va creato prima.' }], 'stop')])
  const r = await runAgent({ compito: 'trova il cliente Inesistente', candidati: [testardo, bravo] })
  assert.equal(r.ok, true)
  assert.equal(r.modello, 'bravo')
  assert.ok(r.log.some(l => /testardo: ripete searchClient/.test(l)))
})

test('runAgent: gruppi limitano gli strumenti (il piano resta sempre)', async () => {
  let visti: string[] = []
  const model = new MockLanguageModelV3({
    modelId: 'spia',
    doGenerate: async (opts) => {
      visti = (opts.tools ?? []).map(t => t.name)
      return step([{ type: 'text', text: 'ok' }], 'stop') as never
    },
  })
  await runAgent({ compito: 'leggi il piano', gruppi: ['social'], candidati: [{ id: 'mock:spia', provider: 'anthropic', modelId: 'spia', label: 'spia', model, profile: reg.profileOf('anthropic', 'claude-sonnet-5-5') }] })
  assert.ok(visti.includes('readEditorialPlan') && visti.includes('updatePlan'))
  assert.ok(!visti.includes('createTask'))
})

test('looksLikeTextToolCall riconosce le chiamate scritte come testo', async () => {
  const { looksLikeTextToolCall } = await import('../../src/lib/agent/run')
  assert.equal(looksLikeTextToolCall('<default_api:readTasks status="todo">'), true)
  assert.equal(looksLikeTextToolCall('<tool_call>{"name":"x"}</tool_call>'), true)
  assert.equal(looksLikeTextToolCall('Hai tre incarichi in scadenza.'), false)
})

test('runAgent: chi scrive la chiamata come testo viene sostituito', async () => {
  const pigro = finto('pigro', [step([{ type: 'text', text: 'Controllo. <default_api:readTasks status="todo">' }], 'stop')])
  const bravo = finto('bravo2', [step([{ type: 'text', text: 'Nessun incarico in scadenza.' }], 'stop')])
  const r = await runAgent({ compito: 'quali incarichi ho?', candidati: [pigro, bravo] })
  assert.equal(r.modello, 'bravo2')
  assert.ok(r.log.some(l => /pigro: ha scritto la chiamata come testo/.test(l)))
})

test('profili: "gemini" non è un modello mini; le taglie contano solo come parti del nome', () => {
  assert.equal(reg.profileOf('google', 'gemini-flash-latest').strength, 'medio')
  assert.equal(reg.profileOf('google', 'gemini-3.5-flash-lite').strength, 'debole')
  assert.equal(reg.profileOf('openrouter', 'openai/gpt-4o-mini').strength, 'debole')
  assert.equal(reg.profileOf('openrouter', 'qwen/qwen3-8b').strength, 'debole')
  assert.equal(reg.profileOf('openrouter', 'qwen/qwen3-235b-a22b').strength, 'medio')
  assert.equal(reg.profileOf('openrouter', 'meta-llama/llama-3.2-3b-instruct').strength, 'debole')
  const ordine = reg.candidatesFor({ task: 'general', tools: true, preferisci: 'forte' }, { keys: { ...NESSUNA, google: true } }).map(c => c.modelId)
  assert.equal(ordine[0], 'gemini-flash-latest', 'in chat si parte dal Gemini più forte, non dal lite')
})
