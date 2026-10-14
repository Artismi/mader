/**
 * K1: azioni uniche (src/lib/kernel). Una definizione per pulsanti, chat,
 * runAgent, guscio /os e Ctrl+K. Database temporaneo.
 *   npm run test:agente
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kernel-')), 'test.db')

const { z } = await import('zod')
const k = await import('../../src/lib/kernel/index')
const { CORE_TOOLS } = await import('../../src/lib/agent/core-tools')
const { SYSTEM_TOOLS } = await import('../../src/lib/agent/system-tools')
const { clients, tasks, ideas, editorialPosts } = await import('../../src/lib/db/index')

const cli = clients.create({ name: 'Officina Rame', category: 'cliente' } as never)

test('registro: domini task, idea, post, client con id dominio.verbo', () => {
  const ids = k.listActions({ all: true }).map(a => a.id)
  for (const id of ['task.create', 'task.list', 'task.set_status', 'task.update', 'task.delete', 'task.create_recurring', 'idea.create', 'idea.list', 'idea.update', 'idea.delete', 'post.list', 'post.update', 'post.save_instagram', 'post.set_status', 'client.search', 'client.get', 'client.create', 'client.update'])
    assert.ok(ids.includes(id), id)
  assert.ok(!k.listActions().some(a => a.risk === 'read'), 'Ctrl+K: di default solo le azioni che cambiano qualcosa')
})

test('runAction: input non valido → errori leggibili, niente scrittura', async () => {
  const prima = tasks.getAll({ limit: 500 }).length
  const r = await k.runAction('task.create', { clientId: 'x' })
  assert.equal(r.ok, false)
  assert.match((r as { errors: string[] }).errors.join(' '), /title/)
  assert.equal(tasks.getAll({ limit: 500 }).length, prima)
})

test('stessa azione, regole per chi agisce: l\'utente registra il passato, l\'IA no', async () => {
  const u = await k.runAction('task.create', { title: 'Consegna di agosto', deadlinePattern: '2020-08-01', clientId: 'Officina Rame' }, { actor: 'user' })
  assert.equal(u.ok, true)
  const a = await k.runAction('task.create', { title: 'Consegna di agosto', deadlinePattern: '2020-08-01' }, { actor: 'agent' })
  assert.equal(a.ok, false)
  assert.match((a as { errors: string[] }).errors.join(' '), /nel passato/)
  const t = tasks.getById((u as { output: { id: string } }).output.id)!
  assert.equal(t.client_id, cli.id, 'il nome del cliente diventa l\'ID completo')
})

test('gli strumenti della chat sono le azioni del nucleo (stessi nomi di prima)', async () => {
  const tools = [...CORE_TOOLS, ...SYSTEM_TOOLS]
  for (const [name, id] of [['createTask', 'task.create'], ['readTasks', 'task.list'], ['updateTaskStatus', 'task.set_status'], ['createIdea', 'idea.create'], ['listIdeas', 'idea.list'], ['readEditorialPlan', 'post.list'], ['updateEditorialPost', 'post.update'], ['saveInstagramDraft', 'post.save_instagram'], ['searchClient', 'client.search'], ['getClient', 'client.get']]) {
    const t = tools.find(x => x.name === name)
    assert.ok(t, name)
    assert.equal(t!.description, k.getAction(id)!.description, `${name} deve venire da ${id}`)
  }
  const del = tools.find(x => x.name === 'deleteTask')
  assert.equal(del?.risk, 'destructive', 'eliminare chiede conferma all\'agente')
})

test('una sola implementazione: strumento della chat e Server Action scrivono la stessa cosa', async () => {
  const tool = CORE_TOOLS.find(t => t.name === 'createIdea')!
  await tool.execute({ text: 'Serie sul rame battuto', title: 'Rame battuto', clientId: 'Officina Rame' })
  const r = await k.runAction('idea.create', { text: 'Serie sul rame lucido', title: 'Rame lucido', clientId: 'Officina Rame' }, { actor: 'user' })
  assert.equal(r.ok, true)
  const mie = ideas.getAll().filter(i => /rame/i.test(i.title ?? ''))
  assert.equal(mie.length, 2)
  assert.ok(mie.every(i => i.client_id === cli.id))
})

test('ganci dopo l\'azione: ricevono definizione, input, output e chi agisce (base per gli eventi K2)', async () => {
  const visti: string[] = []
  k.onActionDone((def, _i, _o, ctx) => visti.push(`${def.id}:${ctx.actor}`))
  await k.runAction('post.save_instagram', { client: 'Officina Rame', title: 'Rame e luce', content: 'Il rame cambia colore con la luce: ecco perché lo lucidiamo a mano.', format: 'post' }, { actor: 'user' })
  assert.ok(visti.includes('post.save_instagram:user'))
  assert.equal(editorialPosts.getByClient(cli.id).length, 1)
})

test('external → conferma per l\'agente', () => {
  const ext = k.defineAction({ id: 'prova.invia', title: 'Invia', description: 'x', domain: 'memory', group: 'memoria', risk: 'external', input: z.object({}), run: () => ({ success: true }) })
  const tool = k.actionTool(ext)
  assert.equal(tool.risk, 'destructive')
  assert.equal(tool.needsApproval, true)
})
