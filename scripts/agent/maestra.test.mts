/**
 * G5: la maestra sulle scritture (src/lib/agent/checks.ts e i verify/after
 * degli strumenti in core-tools.ts). Database temporaneo.
 *   npm run test:agente
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'maestra-')), 'test.db')

const c = await import('../../src/lib/agent/checks')
const { CORE_TOOLS } = await import('../../src/lib/agent/core-tools')
const { defineTool } = await import('../../src/lib/agent/tools')
const { clients, tasks } = await import('../../src/lib/db/index')

const NOW = new Date('2026-10-14T10:00:00')
const cli = clients.create({ name: 'Ceramiche Terra Mossa', category: 'cliente' } as never)
const tool = (name: string) => defineTool(CORE_TOOLS.find(t => t.name === name)!)
const run = (name: string, input: unknown) => (tool(name) as { execute: (i: unknown, o: unknown) => Promise<Record<string, unknown>> }).execute(input, { toolCallId: 't', messages: [] })

test('dataIso: formato, esistenza, futuro', () => {
  assert.match(c.dataIso('d', '24/10/2026')[0], /non è una data ISO/)
  assert.match(c.dataIso('d', '2026-10-01', { futura: true, now: NOW })[0], /nel passato \(oggi è 2026-10-14\)/)
  assert.deepEqual(c.dataIso('d', '2026-10-14', { futura: true, now: NOW }), [], 'oggi è ammesso')
  assert.deepEqual(c.dataIso('d', '2026-10-20T18:30', { futura: true, now: NOW }), [])
  assert.match(c.dataIso('d', undefined, { obbligatoria: true })[0], /manca la data/)
})

test('clienteEsiste: ID, ID corto, nome, assente', () => {
  assert.deepEqual(c.clienteEsiste('c', cli.id), [])
  assert.deepEqual(c.clienteEsiste('c', cli.id.slice(0, 8)), [])
  assert.deepEqual(c.clienteEsiste('c', 'terra mossa'), [])
  assert.match(c.clienteEsiste('c', 'Inesistente')[0], /non esiste/)
  assert.deepEqual(c.clienteEsiste('c', undefined), [])
  assert.match(c.clienteEsiste('c', undefined, { obbligatorio: true })[0], /indica il cliente/)
})

test('testoSocial blocca una caption con difetti gravi, lascia passare una buona', () => {
  const brutta = 'Scopri di più!!! #a #b #c #d #e #f #g #h #i #j #k #l #m #n #o #p #q #r #s #t #u #v #w #x #y #z #aa #bb #cc #dd #ee #ff'
  assert.ok(c.testoSocial('caption', brutta).length > 0)
  const buona = 'Tre tazze su dieci escono storte dal forno. Le teniamo: sono quelle che preferite.\n\nGres toscano, smalti naturali, cottura a 1250 gradi. Quale sceglieresti per il caffè della domenica?\n\n#ceramica #fattoamano'
  assert.deepEqual(c.testoSocial('caption', buona).filter(e => !/ia\)|IA/.test(e)).filter(e => /da correggere/.test(e)), [])
})

test('createTask: data passata e cliente inesistente non arrivano al database', async () => {
  const prima = tasks.getAll({ limit: 500 }).length
  const out = await run('createTask', { title: 'Consegna logo', category: 'design', deadlinePattern: '2020-01-10', clientId: 'Nessuno' })
  assert.equal(out.success, false)
  assert.match(String(out.error), /nel passato/)
  assert.match(String(out.error), /non esiste/)
  assert.equal(tasks.getAll({ limit: 500 }).length, prima)
})

test('createTask: con il nome del cliente salva l\'ID completo e la rilettura passa', async () => {
  const out = await run('createTask', { title: 'Catalogo autunno', category: 'design', deadlinePattern: '2099-03-01', clientId: 'Terra Mossa' })
  assert.equal(out.success, true)
  assert.equal(out.controlli, undefined)
  assert.equal(tasks.getById(String(out.id))?.client_id, cli.id)
})

test('saveInstagramDraft: data passata e caption con difetti tornano al modello', async () => {
  const out = await run('saveInstagramDraft', { client: 'Terra Mossa', title: 'Tazze storte', content: 'Scopri di più!!! ' + '#tag '.repeat(40), format: 'post', status: 'bozza', scheduledAt: '2020-05-01T18:00' })
  assert.equal(out.success, false)
  assert.match(String(out.error), /scheduledAt: 2020-05-01 è nel passato/)
  assert.match(String(out.error), /content:/)
})

test('createFinancialDocument: prezzo zero e cliente mancante', async () => {
  const out = await run('createFinancialDocument', { type: 'preventivo', clientId: 'Nessuno', title: 'Logo', items: [{ desc: 'logo', qty: 1, unitPrice: 0 }] })
  assert.equal(out.success, false)
  assert.match(String(out.error), /prezzo maggiore di zero/)
  assert.match(String(out.error), /non esiste/)
})

test('remember: un ricordo per cliente richiede un cliente esistente', async () => {
  const out = await run('remember', { content: 'preferisce il blu cobalto', contextType: 'client', contextId: 'Nessuno' })
  assert.equal(out.success, false)
})
