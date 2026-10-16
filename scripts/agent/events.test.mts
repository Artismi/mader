/**
 * K2: eventi e provenienza (src/lib/kernel/events.ts). Database temporaneo.
 *   npm run test:agente
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'eventi-')), 'test.db')

const k = await import('../../src/lib/kernel/index')
const { CORE_TOOLS } = await import('../../src/lib/agent/core-tools')
const { clients, memoryLinks } = await import('../../src/lib/db/index')

const cli = clients.create({ name: 'Forno Aurora', category: 'cliente' } as never)
const ref = `client:${cli.id}`

test('la linea del tempo di un cliente mostra utente e IA in ordine', async () => {
  const u = await k.runAction<{ id: string }>('task.create', { title: 'Menu autunno', clientId: cli.id }, { actor: 'user' })
  assert.equal(u.ok, true)
  await new Promise(r => setTimeout(r, 5))
  await CORE_TOOLS.find(t => t.name === 'createIdea')!.execute({ text: 'Pane alle castagne in vetrina', title: 'Castagne', clientId: cli.id })
  const ev = k.timeline(ref)
  assert.deepEqual(ev.map(e => `${e.type}:${e.actor}`), ['idea.create:agent', 'task.create:user'], 'dal più recente')
  assert.ok(ev.every(e => e.scope === ref))
  assert.match(k.describe(ev[1]), /Menu autunno/)
  assert.equal(k.actorLabel(ev[0].actor), 'IA')
})

test('le letture non lasciano eventi', async () => {
  const prima = k.changesSince('2000-01-01').length
  await k.runAction('task.list', {}, { actor: 'agent' })
  await k.runAction('client.search', { query: 'Forno' }, { actor: 'agent' })
  assert.equal(k.changesSince('2000-01-01').length, prima)
})

test('provenienza: il nodo nato da un altro ha il link origin (una volta sola) e compare nella sua storia', async () => {
  const r = await k.runAction<{ id: string }>('task.create', { title: 'Rispondere sul preventivo', clientId: cli.id }, { actor: 'user', origin: 'mail:m1' })
  assert.equal(r.ok, true)
  const id = (r as { output: { id: string } }).output.id
  const links = memoryLinks.getAll().filter((l: { target_id: string; relation: string }) => l.target_id === id && l.relation === 'origin')
  assert.equal(links.length, 1)
  assert.equal(links[0].source_id, 'm1')
  assert.equal(k.timeline('mail:m1')[0].ref, `task:${id}`)
})

test('dalle liste non nasce provenienza', async () => {
  const r = await k.runAction<{ id: string }>('task.create', { title: 'Dalla lista', clientId: cli.id }, { actor: 'user', origin: 'list:oggi' })
  const id = (r as { output: { id: string } }).output.id
  assert.equal(memoryLinks.getAll().filter((l: { target_id: string }) => l.target_id === id).length, 0)
})
