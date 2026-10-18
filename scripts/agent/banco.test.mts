/**
 * Il banco di prova G6 regge: 23 compiti, verifiche che distinguono il giusto
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

test('23 compiti, ID unici, tutte le aree', () => {
  assert.equal(COMPITI.length, 23)
  assert.equal(new Set(COMPITI.map(c => c.id)).size, 23)
  assert.deepEqual([...new Set(COMPITI.map(c => c.area))].sort(), ['chat', 'clienti', 'grafiche', 'idee', 'incarichi', 'memoria', 'piano', 'sicurezza'])
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

/* ── chat dal vivo ─────────────────────────────────────────────────────── */

const chiamata = (nome: string, dati: unknown, id = '1') => step([{ type: 'tool-call', toolCallId: id, toolName: nome, input: JSON.stringify(dati) }], 'tool-calls')

test('chat-vai: "vai" dopo una proposta obbliga lo strumento; il piano ripetuto non passa', async () => {
  const scelte: unknown[] = []
  const buono = finto([chiamata('createIdea', { title: 'Smalti al buio', text: 'Reel con le tazze che brillano al buio', clientId: 'Terra Mossa', platforms: ['instagram'] }), step([{ type: 'text', text: 'Idea salvata.' }], 'stop')])
  const gen = buono.model.doGenerate.bind(buono.model)
  buono.model.doGenerate = (async (o: { toolChoice?: unknown }) => { scelte.push(o.toolChoice); return gen(o as never) }) as never
  const c = compito('chat-vai')
  const r = await runAgent({ compito: c.compito, contesto: c.contesto, dopoProposta: c.dopoProposta, candidati: [buono] })
  assert.equal(c.verifica(r, s).ok, true, c.verifica(r, s).motivo)
  assert.deepEqual(scelte[0], { type: 'required' })
  // il modello che ripropone il piano non salva nulla: il compito fallisce (e A3 lo segnala)
  const pigro = finto([step([{ type: 'text', text: 'Procedo con il salvataggio di "Bozze notturne". Sei d\'accordo?' }], 'stop')])
  const r2 = await runAgent({ compito: 'vai', contesto: 'Assistente: salvo l\'idea "Bozze notturne"?', dopoProposta: true, candidati: [pigro] })
  assert.ok(!ideas.getAll().some(i => /bozze notturne/i.test(i.title ?? '')))
  assert.equal(r2.ok, false)
})

test('chat-nessun-cliente: il cliente passato per abitudine viene respinto, l\'idea resta senza cliente', async () => {
  const m = finto([
    chiamata('createIdea', { title: 'LoopAI', text: 'Film partecipativo girato con il pubblico', clientId: 'Tostatura Nera' }),
    chiamata('createIdea', { title: 'LoopAI', text: 'Film partecipativo girato con il pubblico' }, '2'),
    step([{ type: 'text', text: 'Idea LoopAI salvata senza cliente.' }], 'stop'),
  ])
  const c = compito('chat-nessun-cliente')
  const r = await runAgent({ compito: c.compito, candidati: [m] })
  assert.equal(c.verifica(r, s).ok, true, c.verifica(r, s).motivo)
  assert.ok(r.chiamate.some(x => x.esito === 'respinta' && /non è di un cliente/.test(x.motivo ?? '')))
})

test('chat-grafica: comporre a mano non passa', () => {
  const c = compito('chat-grafica')
  const finta = (strumenti: string[]) => ({ ok: true, testo: '', modello: 'x', passi: 1, chiamate: strumenti.map(st => ({ strumento: st, input: {}, esito: 'ok' as const })), proposte: [], log: [] })
  assert.equal(c.verifica(finta(['createDesignBoards']), s).ok, false)
  assert.equal(c.verifica(finta(['directDesign']), s).ok, true)
  assert.equal(c.verifica(finta([]), s).ok, false)
})

test('quota esaurita simulata: il primo modello ha finito la quota del giorno, il compito passa al successivo', async () => {
  reg.resetExhausted()
  const finita = new MockLanguageModelV3({ modelId: 'finito', doGenerate: async () => { throw Object.assign(new Error('quota del giorno finita per google:gemini-flash-latest (limite 250 per-day)'), { statusCode: 429 }) } })
  const primo = { id: 'google:finito', provider: 'google' as const, modelId: 'finito', label: 'finito', model: finita, profile: reg.profileOf('google', 'gemini-flash-latest') }
  const secondo = finto([chiamata('createIdea', { title: 'Ricambi in vetrina', text: 'Post sui ricambi', clientId: 'Terra Mossa' }), step([{ type: 'text', text: 'Salvata.' }], 'stop')])
  const r = await runAgent({ compito: 'Salva un\'idea per Terra Mossa: "Ricambi in vetrina".', candidati: [primo, secondo] })
  assert.equal(r.ok, true, r.log.join(' | '))
  assert.equal(r.modello, 'finto')
  assert.ok(reg.isExhausted('google:finito'))
  reg.resetExhausted()
})
