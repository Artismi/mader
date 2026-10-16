/**
 * Test di L1 (docs/cosa-manca.md): profili di capacità del guscio (forte, medio,
 * base), regia per fasi del medio, un passo alla volta per il base, riassunti
 * dei risultati. Modelli finti, database temporaneo.
 *   npm run test:agente
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'livelli-')), 'test.db')

const reg = await import('../../src/lib/ai/model-registry')
const { runAgent, serverToolDefs } = await import('../../src/lib/agent/run')
const { toolsForPhase } = await import('../../src/lib/agent/steer')
const { MockLanguageModelV3 } = await import('ai/test')

const usage = { inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 10, text: 10, reasoning: 0 } }
const step = (content: unknown[], unified: 'tool-calls' | 'stop' = 'stop') => ({ content, finishReason: { unified, raw: unified }, usage, warnings: [] })
const testo = (t: string) => step([{ type: 'text', text: t }])
const chiama = (toolName: string, input: unknown) => step([{ type: 'tool-call', toolCallId: 't1', toolName, input: JSON.stringify(input) }], 'tool-calls')

function finto(id: string, modelId: string, risposte: ReturnType<typeof step>[], visti?: Record<string, unknown>[]) {
  let i = 0
  const model = new MockLanguageModelV3({ modelId: id, doGenerate: async (o: Record<string, unknown>) => { visti?.push(o); return risposte[Math.min(i++, risposte.length - 1)] as never } })
  return { id: `mock:${id}`, provider: 'google' as const, modelId, label: id, model, profile: reg.profileOf('google', modelId) }
}

/* ── profili ──────────────────────────────────────────────────────────── */

test('il livello si deduce dal modello', () => {
  assert.equal(reg.profileOf('anthropic', 'claude-sonnet-5-5').livello, 'forte')
  assert.equal(reg.profileOf('anthropic', 'claude-haiku-5-5').livello, 'medio')
  assert.equal(reg.profileOf('google', 'gemini-flash-latest').livello, 'medio')
  assert.equal(reg.profileOf('google', 'gemini-flash-lite-latest').livello, 'base')
  assert.equal(reg.profileOf('openrouter', 'meta-llama/llama-3.3-8b-instruct:free').livello, 'base')
  assert.deepEqual([reg.REGIMI.medio.strumenti, reg.REGIMI.base.strumenti, reg.REGIMI.base.contesto], [12, 5, 3000])
})

test('il livello si forza: chiamante, poi Impostazioni per modello, poi per tutti', () => {
  const c = { id: 'google:gemini-flash-lite-latest', profile: reg.profileOf('google', 'gemini-flash-lite-latest') }
  assert.equal(reg.livelloOf(c), 'base')
  reg.setLivello('medio')
  assert.equal(reg.livelloOf(c), 'medio')
  reg.setLivello('forte', c.id)
  assert.equal(reg.livelloOf(c), 'forte')
  assert.equal(reg.livelloOf(c, 'base'), 'base')
  assert.equal(reg.livelloOf(c, 'boh'), 'forte')
  reg.setLivello('', c.id); reg.setLivello('')
  assert.equal(reg.livelloOf(c), 'base')
})

/* ── medio: strumenti per fase ────────────────────────────────────────── */

test('toolsForPhase: al massimo N, le scritture pertinenti in scrittura, updatePlan sempre', () => {
  const defs = serverToolDefs()
  const scrivere = toolsForPhase(defs, 'scrivere', { max: 5, compito: 'Salva come idea un carosello sui chicchi etiopi', always: ['updatePlan'] })
  assert.equal(scrivere.length, 5)
  assert.equal(scrivere[0], 'updatePlan')
  assert.ok(scrivere.includes('createIdea'), scrivere.join(','))
  const leggere = toolsForPhase(defs, 'leggere', { max: 4, compito: 'Cosa c\'è nel piano editoriale di questa settimana?' })
  assert.equal(leggere.length, 4)
  assert.ok(leggere.includes('readEditorialPlan'), leggere.join(','))
})

test('runAgent medio: pochi strumenti attivi per passo, dentro il tetto di 12', async () => {
  const visti: Record<string, unknown>[] = []
  const m = finto('medio', 'gemini-flash-latest', [
    chiama('createIdea', { text: 'Carosello sui chicchi etiopi', title: 'Chicchi etiopi' }),
    testo('Ho salvato l\'idea "Chicchi etiopi".'),
  ], visti)
  const r = await runAgent({ compito: 'Salva come idea un carosello sui chicchi etiopi', candidati: [m] })
  assert.equal(r.ok, true)
  assert.equal(r.livello, 'medio')
  assert.ok(serverToolDefs().length > 12)
  for (const o of visti) assert.ok((o.tools as unknown[]).length <= 12, `strumenti visti: ${(o.tools as unknown[]).length}`)
})

/* ── riassunti dei risultati ──────────────────────────────────────────── */

const { riassunto, riassuntoGenerico, RIASSUNTI } = await import('../../src/lib/agent/summary')
const { SYSTEM_TOOLS } = await import('../../src/lib/agent/system-tools')

test('ogni strumento di sistema ha il suo riassunto', () => {
  for (const d of SYSTEM_TOOLS) assert.ok(RIASSUNTI[d.name], `manca il riassunto di ${d.name}`)
})

test('riassunto: errori in testa, elenchi tagliati con il conto, vault accorciato', () => {
  const ko = riassuntoGenerico({ success: false, error: 'Cliente "X" non trovato.' })
  assert.match(ko, /^NON RIUSCITO\nerror: Cliente "X"/)
  const post = Array.from({ length: 40 }, (_, i) => `[p${i}] 2${i % 9} ott · Post numero ${i} [programmato]`).join('\n')
  const lungo = { success: true, totale: 40, mostrati: 40, post }
  const r = riassunto('readEditorialPlan', lungo)
  assert.match(r, /totale: 40/)
  assert.match(r, /\[p11\]/)
  assert.match(r, /\+28 righe/)
  assert.ok(r.length < JSON.stringify(lungo).length / 2)
  const cli = riassunto('getClient', { success: true, cliente: 'Vigna Alta [ab12cd34] · vino', vault: 'v'.repeat(4000), prossimiPost: 'a\nb' })
  assert.match(cli, /ab12cd34/)
  assert.ok(cli.length < 600, String(cli.length))
})

test('il modello riceve il riassunto in testo, non il JSON', async () => {
  const visti: Record<string, unknown>[] = []
  const m = finto('forte', 'gemini-3-pro', [
    chiama('createIdea', { text: 'Dal tornio', title: 'Dal tornio' }),
    testo('Ho salvato l\'idea "Dal tornio".'),
  ], visti)
  const r = await runAgent({ compito: 'Salva come idea "Dal tornio"', candidati: [m] })
  assert.equal(r.ok, true)
  const tool = (visti[1].prompt as { role: string; content: { type: string; output?: { type: string; value: unknown } }[] }[]).find(x => x.role === 'tool')!
  const out = tool.content.find(p => p.type === 'tool-result')!.output!
  assert.equal(out.type, 'text')
  assert.match(String(out.value), /^ok\nmessage: Idea "Dal tornio"/)
})
