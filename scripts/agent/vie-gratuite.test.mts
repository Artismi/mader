/**
 * Test delle vie gratuite (src/lib/ai/vie-gratuite.ts): ordine, interruttore,
 * quota del giorno su disco, tentativi su 503, memoria delle risposte. Nessuna chiamata vera.
 *   npm run test:agente
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vie-'))
process.env.DATABASE_PATH = path.join(dir, 'test.db')
process.env.CREATIVE_OS_NO_CATALOG = '1'
delete process.env.CREATIVE_OS_SOLO_GRATIS

const vie = await import('../../src/lib/ai/vie-gratuite')
const reg = await import('../../src/lib/ai/model-registry')
const { generateText } = await import('ai')
const { MockLanguageModelV3 } = await import('ai/test')

const KEYS = { openrouter: true, anthropic: true, google: true }

test('solo gratis è attivo di base: niente Claude, niente modelli a pagamento', () => {
  assert.equal(vie.soloGratis(), true)
  const ids = reg.candidatesFor({ task: 'general', tools: true }, { keys: KEYS }).map(c => c.id)
  assert.equal(ids[0], 'google:gemini-flash-lite-latest')
  assert.ok(ids.every(id => vie.VIE_GRATUITE[id]), ids.join())
  assert.ok(!ids.some(id => id.startsWith('anthropic:')))
  assert.ok(reg.candidatesFor({ task: 'general' }, { keys: KEYS }).every(c => c.profile.free))
})

test('ordine: la scelta della chat mette avanti il fornitore, riservato salta Google, visione filtra', () => {
  assert.ok(reg.candidatesFor({ task: 'design' }, { keys: KEYS, choice: 'openrouter' })[0].id.startsWith('openrouter:'))
  assert.ok(reg.candidatesFor({ task: 'design' }, { keys: KEYS, riservato: true }).every(c => c.provider === 'openrouter'))
  const v = reg.candidatesFor({ task: 'design', vision: true }, { keys: KEYS }).map(c => c.id)
  assert.ok(!v.includes('openrouter:nvidia/nemotron-3-super-120b-a12b:free'))
  assert.ok(reg.candidatesFor({ task: 'general' }, { keys: { openrouter: true, anthropic: false, google: false } }).every(c => c.provider === 'openrouter'))
})

test('interruttore spento: torna il registro completo', () => {
  vie.setSoloGratis(false)
  try { assert.ok(reg.candidatesFor({ task: 'general' }, { keys: KEYS }).some(c => c.provider === 'anthropic')) }
  finally { vie.setSoloGratis(true) }
})

test('quota del giorno: il conto sta su disco e a limite raggiunto lancia un 429 per-day', async () => {
  const via = { ...vie.VIE_GRATUITE['openrouter:nvidia/nemotron-3-super-120b-a12b:free'], gruppo: 'prova', alGiorno: 2, alMinuto: 100 }
  await vie.attendiTurno(via); await vie.attendiTurno(via)
  assert.equal(vie.contiDelGiorno().prova, 2)
  await assert.rejects(vie.attendiTurno(via), (e: Error & { statusCode?: number }) => e.statusCode === 429 && /per-day/.test(e.message) && reg.classifyError(e) === 'quota')
})

test('503 si riprova, la quota del giorno no', async () => {
  let n = 0
  const r = await vie.conTentativi(undefined, async () => { if (n++ === 0) throw Object.assign(new Error('high demand'), { statusCode: 503 }); return 'ok' }, [1])
  assert.equal(r, 'ok'); assert.equal(n, 2)
  n = 0
  await assert.rejects(vie.conTentativi(undefined, async () => { n++; throw Object.assign(new Error('Rate limit exceeded: free-models-per-day'), { statusCode: 429 }) }, [1]))
  assert.equal(n, 1)
})

test('memoria su disco: stessa richiesta, nessuna nuova chiamata', async () => {
  let chiamate = 0
  const finto = new MockLanguageModelV3({
    doGenerate: async () => {
      chiamate++
      return { content: [{ type: 'text', text: `risposta ${chiamate}` }], finishReason: { unified: 'stop', raw: 'stop' }, usage: { inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 2, text: 2, reasoning: 0 } }, warnings: [] }
    },
  })
  const m = vie.avvolgi(finto, 'finto:modello')
  const a = await generateText({ model: m, prompt: 'ciao' })
  const b = await generateText({ model: m, prompt: 'ciao' })
  const c = await generateText({ model: m, prompt: 'altro' })
  assert.equal(a.text, 'risposta 1'); assert.equal(b.text, 'risposta 1'); assert.equal(c.text, 'risposta 2')
  assert.equal(chiamate, 2)
})

/* ── chat dal vivo: quota del giorno e catena ─────────────────────────── */

const USO = { inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 2, text: 2, reasoning: 0 } }
const FINE = { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USO }
const flusso = (parti: unknown[]) => new MockLanguageModelV3({
  doStream: async () => ({ stream: new ReadableStream({ start(c) { for (const p of parti) c.enqueue(p as never); c.close() } }) }),
})
const testo = (t: string) => [{ type: 'stream-start', warnings: [] }, { type: 'text-start', id: '1' }, { type: 'text-delta', id: '1', delta: t }, { type: 'text-end', id: '1' }, FINE]
const cand = (id: string, model: unknown) => ({ id, provider: 'google' as const, modelId: id, label: id, profile: reg.profileOf('google', 'gemini-flash-lite-latest'), model: model as never })

test('il registro sa quanta quota resta oggi e salta le vie esaurite', () => {
  const lite = vie.VIE_GRATUITE['google:gemini-flash-lite-latest']
  assert.equal(vie.restantiOggi(lite), lite.alGiorno)
  process.env.CREATIVE_OS_AI_DIR = path.join(dir, 'quota-finita')
  fs.mkdirSync(process.env.CREATIVE_OS_AI_DIR, { recursive: true })
  fs.writeFileSync(path.join(process.env.CREATIVE_OS_AI_DIR, 'quote.json'), JSON.stringify({ giorno: new Date().toISOString().slice(0, 10), conti: { 'google:gemini-flash-lite-latest': lite.alGiorno } }))
  assert.equal(vie.restantiOggi(lite), 0)
  const ids = reg.candidatesFor({ task: 'general', tools: true }, { keys: KEYS }).map(c => c.id)
  assert.ok(!ids.includes('google:gemini-flash-lite-latest'), ids.join())
  assert.equal(ids[0], 'google:gemini-3.5-flash-lite')
  // all'ultimo tentativo si può ancora includerla
  assert.ok(reg.candidatesFor({ task: 'general', tools: true }, { keys: KEYS, includeExhausted: true }).some(c => c.id === 'google:gemini-flash-lite-latest'))
})

test('catena in chat: quota del giorno e risposta vuota passano al successivo', async () => {
  const { streamText } = await import('ai')
  reg.resetExhausted()
  const finita = new MockLanguageModelV3({ doStream: async () => { throw Object.assign(new Error('quota del giorno finita per google:gemini-flash-latest (limite 250 per-day)'), { statusCode: 429 }) } })
  const cambi: string[] = []
  const catena = reg.catenaModelli([cand('a', finita), cand('b', flusso([{ type: 'stream-start', warnings: [] }, FINE])), cand('c', flusso(testo('eccomi')))], { onCambio: d => cambi.push(d) })
  const r = streamText({ model: catena, prompt: 'vai' })
  assert.equal(await r.text, 'eccomi')
  assert.deepEqual(cambi, ['a', 'b'])
  assert.ok(reg.isExhausted('a') && reg.isExhausted('b'))
  // dopo i risultati degli strumenti chiudere senza testo è lecito
  assert.equal(reg.vuotoVietato([{ role: 'user', content: [{ type: 'text', text: 'vai' }] }, { role: 'tool', content: [] }, { role: 'user', content: [{ type: 'text', text: '<promemoria>fase: chiudere</promemoria>' }] }] as never), false)
  reg.resetExhausted()
})

test('catena in chat: se cadono tutti, l\'errore arriva con i motivi (mai un silenzio)', async () => {
  const { streamText } = await import('ai')
  reg.resetExhausted()
  const giu = new MockLanguageModelV3({ doStream: async () => { throw Object.assign(new Error('high demand'), { statusCode: 503 }) } })
  const errori: string[] = []
  const r = streamText({ model: reg.catenaModelli([cand('x', giu), cand('y', flusso([{ type: 'stream-start', warnings: [] }, { type: 'error', error: new Error('rotto') }]))]), prompt: 'vai', onError: ({ error }) => { errori.push(String((error as Error).message)) } })
  await r.consumeStream()
  assert.equal(errori.length, 1)
  assert.match(errori[0], /Nessun modello ha risposto.*x: high demand.*y: rotto/)
  reg.resetExhausted()
})
