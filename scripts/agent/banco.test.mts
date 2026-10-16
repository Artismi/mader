/**
 * Il banco di prova G6 regge: 20 compiti, verifiche che distinguono il giusto
 * dallo sbagliato, esecuzione con un modello finto. Database temporaneo.
 *   npm run test:agente
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'banco-test-')), 'test.db')

const { COMPITI, seed } = await import('./banco/compiti')
const { runAgent } = await import('../../src/lib/agent/run')
const reg = await import('../../src/lib/ai/model-registry')
const { MockLanguageModelV3 } = await import('ai/test')
const { ideas } = await import('../../src/lib/db/index')

const s = seed()
const usage = { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 5, text: 5, reasoning: 0 } }
const step = (content: unknown[], unified: 'tool-calls' | 'stop') => ({ content, finishReason: { unified, raw: unified }, usage, warnings: [] })
function finto(risposte: ReturnType<typeof step>[]) {
  let i = 0
  const model = new MockLanguageModelV3({ modelId: 'finto', doGenerate: async () => risposte[Math.min(i++, risposte.length - 1)] as never })
  return { id: 'mock:finto', provider: 'anthropic' as const, modelId: 'finto', label: 'finto', model, profile: reg.profileOf('anthropic', 'claude-sonnet-5-5') }
}
const compito = (id: string) => COMPITI.find(c => c.id === id)!

test('20 compiti, ID unici, tutte le aree', () => {
  assert.equal(COMPITI.length, 20)
  assert.equal(new Set(COMPITI.map(c => c.id)).size, 20)
  assert.deepEqual([...new Set(COMPITI.map(c => c.area))].sort(), ['clienti', 'grafiche', 'idee', 'incarichi', 'memoria', 'piano', 'sicurezza'])
})

test('idea-salva: passa se il modello salva l\'idea con il cliente giusto', async () => {
  const m = finto([
    step([{ type: 'tool-call', toolCallId: '1', toolName: 'createIdea', input: JSON.stringify({ title: 'Dal tornio al forno', text: 'Carosello sulle fasi della lavorazione', clientId: 'Terra Mossa', platforms: ['instagram'] }) }], 'tool-calls'),
    step([{ type: 'text', text: 'Idea salvata.' }], 'stop'),
  ])
  const r = await runAgent({ compito: compito('idea-salva').compito, candidati: [m] })
  const v = compito('idea-salva').verifica(r, s)
  assert.equal(v.ok, true, v.motivo)
  assert.equal(ideas.getAll().find(i => /tornio/i.test(i.title ?? ''))?.client_id, s.tm)
})

test('una risposta che non fa nulla non passa', async () => {
  const m = finto([step([{ type: 'text', text: 'Fatto!' }], 'stop')])
  const r = await runAgent({ compito: compito('piano-approva').compito, candidati: [m] })
  assert.equal(compito('piano-approva').verifica(r, s).ok, false)
})

test('sic-fattura: passa solo come proposta', async () => {
  const m = finto([
    step([{ type: 'tool-call', toolCallId: '1', toolName: 'createFinancialDocument', input: JSON.stringify({ type: 'fattura', clientId: 'Terra Mossa', title: 'Sito web', items: [{ desc: 'Sviluppo sito web', qty: 1, unitPrice: 2000 }] }) }], 'tool-calls'),
    step([{ type: 'text', text: 'La fattura va confermata.' }], 'stop'),
  ])
  const r = await runAgent({ compito: compito('sic-fattura').compito, candidati: [m] })
  const v = compito('sic-fattura').verifica(r, s)
  assert.equal(v.ok, true, v.motivo)
})

test('verifiche di testo: tono del cliente', () => {
  const base = { ok: true, modello: 'x', passi: 1, chiamate: [], proposte: [], log: [] }
  assert.equal(compito('cli-tono').verifica({ ...base, testo: 'Notturno e diretto, con ironia.' }, s).ok, true)
  assert.equal(compito('cli-tono').verifica({ ...base, testo: 'Professionale e cordiale.' }, s).ok, false)
})
