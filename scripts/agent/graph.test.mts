/**
 * K3: grafo e grounding (src/lib/kernel/graph.ts). Database temporaneo,
 * embedder finto (nessuna rete), modello finto per la domanda sul lancio.
 *   npm run test:agente
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'grafo-')), 'test.db')
delete process.env.GEMINI_API_KEY
delete process.env.GOOGLE_GENERATIVE_AI_API_KEY

const k = await import('../../src/lib/kernel/index')
const reg = await import('../../src/lib/ai/model-registry')
const { runAgent } = await import('../../src/lib/agent/run')
const { SYSTEM_TOOLS } = await import('../../src/lib/agent/system-tools')
const { CORE_TOOLS } = await import('../../src/lib/agent/core-tools')
const { zodSchema } = await import('ai')
const { MockLanguageModelV3 } = await import('ai/test')
const { clients } = await import('../../src/lib/db/index')

const cli = clients.create({ name: 'Vigna Alta', category: 'cliente', sector: 'vino' } as never)
const altro = clients.create({ name: 'Ottica Bruni', category: 'cliente' } as never)
const task = await k.runAction<{ id: string }>('task.create', { title: 'Shooting vendemmia per la campagna', clientId: cli.id }, { actor: 'user' })
const taskId = (task as { output: { id: string } }).output.id
await k.runAction('idea.create', { text: 'Raccontare il lavoro in vigna all\'alba', title: 'Alba tra i filari', clientId: cli.id }, { actor: 'user', origin: `task:${taskId}` })
await k.runAction('post.save_instagram', { client: 'Vigna Alta', title: 'Lancio campagna rosso', content: 'Il nostro rosso nasce tra i filari: la campagna parte a novembre.', format: 'post' }, { actor: 'user' })
await k.runAction('idea.create', { text: 'Montature in acetato riciclato', title: 'Occhiali verdi', clientId: altro.id }, { actor: 'user' })

// embedder finto: vettore di "temi" (vino/uva, occhiali/vista)
const TEMI = [/vin|vign|filar|vendemm|uva|ross/i, /occhial|montatur|vista|lent/i]
const finto = async (t: string) => new Float32Array(TEMI.map(r => (r.test(t) ? 1 : 0)))

test('indice: tutti i nodi, aggiornamento solo dei cambiati, vettori se c\'è un embedder', async () => {
  const a = await k.reindex({ embed: finto })
  assert.ok(a.nodi >= 6 && a.vettori === a.nodi)
  const b = await k.reindex({ embed: finto })
  assert.equal(b.cambiati, 0)
  assert.equal(b.vettori, 0)
})

test('searchGraph: parole e significato, filtro per cliente', async () => {
  const w = await k.searchGraph('campagna', { embed: null })
  assert.ok(w.some(h => h.kind === 'task') && w.some(h => h.kind === 'post'), 'parole nel titolo di incarico e post')
  const s = await k.searchGraph('uva matura', { embed: finto })
  assert.ok(s.length && s.every(h => h.clientId === cli.id), 'significato: niente occhiali')
  assert.match(s[0].perché, /significato/)
  const solo = await k.searchGraph('montature', { clientId: cli.id, embed: null })
  assert.equal(solo.length, 0)
})

test('related: un cliente vede il suo lavoro; un nodo vede cliente e provenienza', () => {
  const v = k.related(`client:${cli.id}`)
  assert.deepEqual([...new Set(v.map(n => n.kind))].sort(), ['idea', 'post', 'task'])
  const t = k.related(`task:${taskId}`)
  assert.ok(t.some(n => n.rel === 'cliente' && n.title === 'Vigna Alta'))
  assert.ok(t.some(n => n.rel === 'ha generato' && n.title === 'Alba tra i filari'))
})

test('completezza: cosa manca nel contesto di un cliente', () => {
  const c = k.completeness(cli.id)!
  assert.ok(c.presente.includes('settore') && c.presente.includes('storico dei contenuti'))
  assert.ok(c.manca.includes('tono di voce') && c.manca.includes('account Instagram collegato'))
  assert.ok(c.percentuale > 0 && c.percentuale < 100)
})

test('focusText: nodo, vicini e lacune in poche righe', () => {
  const f = k.focusText(`client:${cli.id}`)
  assert.match(f, /In focus: cliente «Vigna Alta»/)
  assert.match(f, /Shooting vendemmia/)
  assert.match(f, /Manca: .*tono di voce/)
  assert.ok(f.length < 2000)
})

test('strumenti per l\'agente: graphSearch, graphRelated, clientContext', () => {
  for (const n of ['graphSearch', 'graphRelated', 'clientContext']) assert.ok(SYSTEM_TOOLS.some(t => t.name === n), n)
})

// Gemini accetta solo enum di stringhe: un enum numerico (es. z.union di z.literal(1|2))
// fa rifiutare l'intera richiesta con tutti gli strumenti.
test('schemi degli strumenti: nessun enum o const non stringa (Gemini li rifiuta)', async () => {
  const errati: string[] = []
  const visita = (s: unknown, dove: string) => {
    if (Array.isArray(s)) return s.forEach((x, i) => visita(x, `${dove}[${i}]`))
    if (!s || typeof s !== 'object') return
    const o = s as Record<string, unknown>
    if (Array.isArray(o.enum) && o.enum.some(v => typeof v !== 'string')) errati.push(`${dove}.enum`)
    if ('const' in o && typeof o.const !== 'string') errati.push(`${dove}.const`)
    for (const [k, v] of Object.entries(o)) if (k !== 'enum' && k !== 'const') visita(v, `${dove}.${k}`)
  }
  for (const t of [...CORE_TOOLS, ...SYSTEM_TOOLS]) visita(await zodSchema(t.inputSchema).jsonSchema, t.name)
  assert.deepEqual(errati, [])
})

// Anthropic accetta solo chiavi ASCII nelle proprietà: "profondità" faceva rifiutare tutti gli strumenti.
test('schemi degli strumenti: nomi delle proprietà ASCII (Anthropic li rifiuta)', async () => {
  const errati: string[] = []
  const visita = (s: unknown, dove: string) => {
    if (Array.isArray(s)) return s.forEach((x, i) => visita(x, `${dove}[${i}]`))
    if (!s || typeof s !== 'object') return
    const o = s as Record<string, unknown>
    if (o.properties && typeof o.properties === 'object') for (const k of Object.keys(o.properties)) if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(k)) errati.push(`${dove}.${k}`)
    for (const [k, v] of Object.entries(o)) visita(v, `${dove}.${k}`)
  }
  for (const t of [...CORE_TOOLS, ...SYSTEM_TOOLS]) visita(await zodSchema(t.inputSchema).jsonSchema, t.name)
  assert.deepEqual(errati, [])
})

const usage = { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 5, text: 5, reasoning: 0 } }
const step = (content: unknown[], unified: 'tool-calls' | 'stop') => ({ content, finishReason: { unified, raw: unified }, usage, warnings: [] })

test('"cosa manca per lanciare la campagna di Vigna Alta?": il contesto parte dal focus e la risposta viene dal grafo', async () => {
  let prompt = ''
  let i = 0
  const risposte = [
    step([{ type: 'tool-call', toolCallId: '1', toolName: 'graphRelated', input: JSON.stringify({ ref: `client:${cli.id}` }) }], 'tool-calls'),
    step([{ type: 'text', text: 'Manca il tono di voce e l\'account Instagram; c\'è lo shooting da fare.' }], 'stop'),
  ]
  const model = new MockLanguageModelV3({ modelId: 'finto', doGenerate: async (o: { prompt: unknown }) => { if (!prompt) prompt = JSON.stringify(o.prompt); return risposte[Math.min(i++, risposte.length - 1)] as never } })
  const cand = { id: 'mock:finto', provider: 'anthropic' as const, modelId: 'finto', label: 'finto', model, profile: reg.profileOf('anthropic', 'claude-sonnet-5-5') }
  const r = await runAgent({ compito: 'Cosa manca per lanciare la campagna di Vigna Alta?', focus: `client:${cli.id}`, candidati: [cand as never] })
  assert.equal(r.ok, true)
  assert.match(prompt, /In focus: cliente/, 'il promemoria contiene il nodo in focus')
  const c = r.chiamate.find(x => x.strumento === 'graphRelated')
  assert.equal(c?.esito, 'ok')
})
