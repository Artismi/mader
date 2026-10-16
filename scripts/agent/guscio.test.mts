/**
 * Test dei moduli del guscio agente (src/lib/agent). Girano con Node puro:
 *   npm run test:agente
 * Il database è un file temporaneo: non tocca i dati veri.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'guscio-')), 'test.db')

const { capResult, defineTool, toolGuide } = await import('../../src/lib/agent/tools')
const { clearOldToolOutputs, compactHistory, estimateTokens } = await import('../../src/lib/agent/compact')
const { stableSystemText, reminderText, withReminder, dayBand, selectActiveSkills } = await import('../../src/lib/agent/prompt')
const sys = await import('../../src/lib/agent/system-tools')
const { z } = await import('zod')

/* ── tools.ts ─────────────────────────────────────────────────────────── */

test('capResult lascia passare i risultati corti', () => {
  const r = { success: true, text: 'ciao' }
  assert.deepEqual(capResult(r, 100), r)
})

test('capResult accorcia il campo testo più lungo e aggiunge la nota', () => {
  const r = capResult({ success: true, corto: 'x', lungo: 'a'.repeat(20_000) }, 2000) as Record<string, unknown>
  assert.equal(r.truncated, true)
  assert.equal(r.corto, 'x')
  assert.match(String(r.note), /restringi/)
  assert.ok(JSON.stringify(r).length < 2600)
})

test('capResult su array lungo restituisce un\'anteprima', () => {
  const r = capResult(Array.from({ length: 2000 }, (_, i) => ({ i })), 500) as Record<string, unknown>
  assert.equal(r.truncated, true)
  assert.equal(String(r.preview).length, 500)
})

const exec = (t: unknown, input: unknown) =>
  (t as { execute: (i: unknown, o: unknown) => Promise<unknown> }).execute(input, { toolCallId: 't', messages: [] })

test('defineTool: un\'eccezione torna al modello come risultato', async () => {
  const calls: [string, boolean][] = []
  const trace = { tool: (n: string, _ms: number, ok: boolean) => { calls.push([n, ok]) }, finish() {} }
  const t = defineTool({ name: 'rompe', group: 'lavoro', risk: 'read', description: 'x', inputSchema: z.object({}), execute: () => { throw new Error('disco pieno') } }, trace)
  const out = await exec(t, {}) as { success: boolean; error: string }
  assert.equal(out.success, false)
  assert.match(out.error, /rompe non riuscito: disco pieno/)
  assert.deepEqual(calls, [['rompe', false]])
})

test('defineTool: la maestra blocca prima di eseguire', async () => {
  let eseguito = false
  const t = defineTool({ name: 'v', group: 'lavoro', risk: 'write', description: 'x', inputSchema: z.object({ n: z.number() }),
    verify: ({ n }) => (n > 3 ? ['n troppo grande'] : []), execute: () => { eseguito = true; return { success: true } } })
  const out = await exec(t, { n: 9 }) as { success: boolean; error: string }
  assert.equal(out.success, false)
  assert.match(out.error, /n troppo grande/)
  assert.equal(eseguito, false)
})

test('defineTool: i distruttivi chiedono conferma, gli altri no', () => {
  const mk = (risk: 'read' | 'destructive') => defineTool({ name: risk, group: 'studio', risk, description: 'x', inputSchema: z.object({}), execute: () => ({}) }) as { needsApproval?: unknown }
  assert.equal(mk('destructive').needsApproval, true)
  assert.equal(mk('read').needsApproval, false)
})

test('toolGuide raggruppa e segnala le conferme', () => {
  const g = toolGuide([
    { name: 'a', group: 'social', risk: 'read', description: '', inputSchema: z.object({}), execute: () => 0 },
    { name: 'b', group: 'studio', risk: 'destructive', description: '', inputSchema: z.object({}), execute: () => 0 },
  ])
  assert.match(g, /\*\*social\*\*: `a` \(lettura\)/)
  assert.match(g, /`b` \(chiede conferma\)/)
})

/* ── compact.ts ───────────────────────────────────────────────────────── */

type M = Parameters<typeof estimateTokens>[0]
function conversazione(turni: number, peso: number): M {
  const out: M = []
  for (let i = 0; i < turni; i++) {
    out.push({ role: 'user', content: `domanda ${i}` })
    out.push({ role: 'assistant', content: [{ type: 'tool-call', toolCallId: `c${i}`, toolName: 'composeDesign', input: { boards: 'x'.repeat(peso) } }] })
    out.push({ role: 'tool', content: [{ type: 'tool-result', toolCallId: `c${i}`, toolName: 'composeDesign', output: { type: 'json', value: { success: true, dati: 'y'.repeat(peso) } } }] })
    out.push({ role: 'assistant', content: `fatto ${i}` })
  }
  return out
}

test('clearOldToolOutputs svuota i vecchi strumenti e lascia intatti i recenti', () => {
  const m = conversazione(5, 3000)
  const c = clearOldToolOutputs(m, 6)
  assert.ok(estimateTokens(c) < estimateTokens(m) / 2)
  assert.deepEqual(c.slice(-6), m.slice(-6))
  const vecchio = c[2] as { content: { output: { value: string } }[] }
  assert.match(vecchio.content[0].output.value, /composeDesign rimosso per spazio: ok/)
})

test('compactHistory sotto soglia non tocca nulla', async () => {
  const m = conversazione(2, 10)
  const r = await compactHistory(m, async () => { throw new Error('non deve servire') })
  assert.equal(r.messages, m)
  assert.equal(r.note, undefined)
})

test('compactHistory riassume quando lo svuotamento non basta, e ricorda il riassunto', async () => {
  const m: M = []
  for (let i = 0; i < 40; i++) { m.push({ role: 'user', content: `messaggio ${i} ` + 'z'.repeat(2000) }); m.push({ role: 'assistant', content: 'ok ' + 'w'.repeat(2000) }) }
  let chiamate = 0
  const riassumi = async (t: string) => { chiamate++; assert.match(t, /messaggio 0/); return '- l\'utente vuole un piano di ottobre' }
  const r = await compactHistory(m, riassumi, 5000)
  assert.equal(r.messages[0].role, 'user')
  assert.match(String(r.messages[0].content), /piano di ottobre/)
  assert.equal(r.messages[1].role, 'assistant')
  assert.equal(r.messages[2].role, 'user')
  assert.match(String(r.note), /riassunti/)
  await compactHistory(m, riassumi, 5000)
  assert.equal(chiamate, 1, 'il secondo giro usa il riassunto in memoria')
})

/* ── prompt.ts ────────────────────────────────────────────────────────── */

const skill = (slug: string, content: string) => ({ slug, name: slug, description: `desc ${slug}`, content, triggers: [] }) as never

test("il prompt stabile è identico tra due richieste e contiene solo l'indice delle skill", () => {
  const parts = { architecture: 'ARCH', toolGuide: '- x', skills: [skill('core', 'CORE'), skill('ig-reel', 'REEL')] }
  const a = stableSystemText(parts), b = stableSystemText({ ...parts })
  assert.equal(a, b)
  assert.match(a, /`ig-reel` — desc ig-reel/)
  assert.match(a, /`core` — desc core/)
  assert.ok(!a.includes('REEL') && !a.includes('CORE'), 'il contenuto delle skill non entra nel prompt stabile')
  assert.ok(!a.includes('Contesto:') && !a.includes('</promemoria>'), 'niente parti variabili nel prompt stabile')
  const pinned = stableSystemText({ ...parts, pinned: [skill('core', 'CORE')] })
  assert.match(pinned, /CORE/)
  assert.ok(!/`core` —/.test(pinned), "una skill fissata non compare anche nell'indice")
})

test('selectActiveSkills: router, trigger a parola intera, tetto', () => {
  const sk = (slug: string, triggers: string[], n: number) => ({ slug, name: slug, description: slug, content: 'x'.repeat(n), triggers }) as never
  const all = [sk('ig-reel', ['reel'], 3000), sk('design-poster', ['poster'], 9000), sk('design-logo', ['logo'], 9000), sk('dic-admin', ['dm'], 100)]
  const r = selectActiveSkills({ skills: all, query: 'Fammi un poster e un logo, poi un reel', routed: new Set(['ig-reel']), maxChars: 14000 })
  assert.deepEqual(r.active.map((s: { slug: string }) => s.slug), ['ig-reel', 'design-poster'])
  assert.deepEqual(r.altre, ['design-logo'])
  assert.equal(selectActiveSkills({ skills: all, query: "scrivi all'admin" }).active.length, 0, '"dm" non scatta su "admin"')
})

test('il promemoria contiene data, situazione, skill attive e canvas', () => {
  const ctx = { snapshot: '## Contesto: martedì, 10:42\n### OGGI\n- [abc] consegna', ragChunks: [], memories: [{ id: '1', content: 'preferisce il blu', score: 1 }], clientVaults: [], activatedFiles: [] }
  const r = reminderText({ now: new Date('2026-10-14T09:30:00'), pathname: '/editoriale', ctx, canvasSnapshot: 'tavola 1', activeSkills: [skill('ig-plan', 'PIANO IG')] })
  assert.match(r, /^<promemoria>/)
  assert.match(r, /2026-10-14, mattina/)
  assert.match(r, /Pagina aperta: \/editoriale/)
  assert.match(r, /### OGGI/)
  assert.ok(!r.includes('10:42'), 'la riga con l\'orario al minuto è sostituita')
  assert.match(r, /preferisce il blu/)
  assert.match(r, /PIANO IG/)
  assert.match(r, /tavola 1/)
})

test('withReminder attacca il promemoria solo all\'ultimo messaggio utente, senza mutare la storia', () => {
  const m: M = [{ role: 'user', content: 'prima' }, { role: 'assistant', content: 'ok' }, { role: 'user', content: 'seconda' }]
  const out = withReminder(m, '<promemoria>x</promemoria>')
  assert.equal(m[2].content, 'seconda')
  assert.deepEqual(out[2].content, [{ type: 'text', text: 'seconda' }, { type: 'text', text: '<promemoria>x</promemoria>' }])
  assert.equal(out[0], m[0])
})

test('dayBand', () => {
  assert.equal(dayBand(new Date('2026-10-14T08:00:00')), 'mattina')
  assert.equal(dayBand(new Date('2026-10-14T16:00:00')), 'pomeriggio')
  assert.equal(dayBand(new Date('2026-10-14T21:00:00')), 'sera')
})

/* ── system-tools.ts (database temporaneo) ────────────────────────────── */

const { clients, editorialPosts } = await import('../../src/lib/db/index')
const cliente = clients.create({ name: 'Tostatura Nera', category: 'cliente', sector: 'caffè' } as never)
const post = editorialPosts.create({ client_id: cliente.id, title: 'Notte Etiope', content: 'testo', channels: ['instagram'], editorial_status: 'bozza', scheduled_at: '2026-10-21T18:30:00.000Z' } as never)

test('readEditorialPlan: la maestra rifiuta date non ISO', () => {
  assert.deepEqual(sys.readEditorialPlan.verify!({ dal: '21/10/2026', stato: 'tutti', limite: 30 } as never), ['dal: "21/10/2026" non è una data ISO (AAAA-MM-GG).'])
  assert.deepEqual(sys.readEditorialPlan.verify!({ dal: '2026-10-01', al: '2026-10-31', stato: 'tutti', limite: 30 } as never), [])
})

test('readEditorialPlan trova il post e i giorni liberi del periodo', async () => {
  const r = await sys.readEditorialPlan.execute({ cliente: 'tostatura', dal: '2026-10-20', al: '2026-10-22', stato: 'tutti', limite: 30 } as never) as Record<string, string | number>
  assert.equal(r.totale, 1)
  assert.match(String(r.post), /Notte Etiope/)
  assert.equal(r.giorniSenzaPost, '2026-10-20, 2026-10-22')
})

test('updateEditorialPost: errori precisi prima di scrivere', () => {
  assert.match((sys.updateEditorialPost.verify!({ id: 'nonesiste' } as never) as string[])[0], /non trovato/)
  const e = sys.updateEditorialPost.verify!({ id: post.id.slice(0, 8), dataProgrammata: 'venerdì' } as never) as string[]
  assert.ok(e.some(x => /non è ISO/.test(x)))
  assert.deepEqual(sys.updateEditorialPost.verify!({ id: post.id.slice(0, 8) } as never), ['non hai indicato nessuna modifica.'])
})

test('updateEditorialPost aggiorna con l\'ID corto', async () => {
  const r = await sys.updateEditorialPost.execute({ id: post.id.slice(0, 8), stato: 'approvato' } as never) as { success: boolean; message: string }
  assert.equal(r.success, true)
  assert.equal(editorialPosts.getById(post.id)?.editorial_status, 'approvato')
})

test('getClient e findClient', async () => {
  const r = await sys.getClient.execute({ cliente: 'Tostatura' } as never) as Record<string, string>
  assert.match(r.cliente, /Tostatura Nera .* caffè/)
  assert.match(r.pianoEditoriale, /1 post/)
  const miss = sys.findClient('Inesistente') as { error: string }
  assert.match(miss.error, /searchClient/)
})

test('updatePlan: un solo passo in corso', () => {
  const two = { passi: [{ testo: 'a', stato: 'in_corso' }, { testo: 'b', stato: 'in_corso' }] }
  assert.equal((sys.updatePlan.verify!(two as never) as string[]).length, 1)
  const ok = sys.updatePlan.execute({ passi: [{ testo: 'a', stato: 'fatto' }, { testo: 'b', stato: 'in_corso' }] } as never) as Record<string, string>
  assert.equal(ok.avanzamento, '1/2')
  assert.equal(ok.prossimo, 'b')
})

/* ── A1: riparare, non sostituire ─────────────────────────────────────── */

const rep = await import('../../src/lib/agent/repair')
const { runAgent } = await import('../../src/lib/agent/run')
const { MockLanguageModelV3 } = await import('ai/test')
const reg = await import('../../src/lib/ai/model-registry')

test('repairJson: apici, chiavi nude, True/None, virgole finali, parentesi aperte, recinti', () => {
  assert.deepEqual(rep.repairJson(`{'a': 'l"x', b: True, c: None, d: [1, 2,],}`), { a: 'l"x', b: true, c: null, d: [1, 2] })
  assert.deepEqual(rep.repairJson('```json\n{"titolo": "Notte", "n": 3'), { titolo: 'Notte', n: 3 })
  assert.deepEqual(rep.repairJson('ecco: {"a": 1} e poi altro testo'), { a: 1 })
  assert.equal(rep.repairJson('niente qui'), undefined)
})

test('parseHermes legge <tool_call> con arguments oggetto o stringa', () => {
  const c = rep.parseHermes('ok <tool_call>{"name": "createIdea", "arguments": {"title": "X"}}</tool_call> e <tool_call>{"name":"readTasks","arguments":"{\\"status\\": \\"todo\\"}"}</tool_call>')
  assert.deepEqual(c, [{ toolName: 'createIdea', input: { title: 'X' } }, { toolName: 'readTasks', input: { status: 'todo' } }])
})

test('parseGemini legge <default_api:…/> e print(default_api.…)', () => {
  assert.deepEqual(rep.parseGemini('<default_api:readTasks status="todo" limit="5"/>'), [{ toolName: 'readTasks', input: { status: 'todo', limit: 5 } }])
  assert.deepEqual(rep.parseGemini('```tool_code\nprint(default_api.createIdea(title="Dal tornio", platforms=["instagram"], urgent=True))\n```'),
    [{ toolName: 'createIdea', input: { title: 'Dal tornio', platforms: ['instagram'], urgent: true } }])
})

test('parseTextToolCalls tiene solo strumenti esistenti, con il nome giusto', () => {
  const r = rep.parseTextToolCalls('<tool_call>{"name":"default_api:CREATEIDEA","arguments":{}}</tool_call><tool_call>{"name":"inventato","arguments":{}}</tool_call>', ['createIdea'])
  assert.equal(r.scritte, true)
  assert.deepEqual(r.chiamate, [{ toolName: 'createIdea', input: {} }])
  assert.equal(rep.parseTextToolCalls('nessuna chiamata qui', ['createIdea']).scritte, false)
})

test('createToolCallRepair: nome con prefisso e JSON rotto; null se non si ripara', async () => {
  const { NoSuchToolError, InvalidToolInputError } = await import('ai')
  const budget = rep.createRepairBudget()
  const fix = rep.createToolCallRepair(budget)
  const tools = { createIdea: {} } as never
  const base = { type: 'tool-call' as const, toolCallId: '1' }
  const a = await fix({ toolCall: { ...base, toolName: 'default_api:createIdea', input: "{title: 'X'}" }, tools, error: new NoSuchToolError({ toolName: 'default_api:createIdea' }) } as never)
  assert.deepEqual([a?.toolName, JSON.parse(a!.input)], ['createIdea', { title: 'X' }])
  const b = await fix({ toolCall: { ...base, toolName: 'createIdea', input: '{"title": "Y",' }, tools, error: new InvalidToolInputError({ toolName: 'createIdea', toolInput: '', cause: new Error('x') }) } as never)
  assert.deepEqual(JSON.parse(b!.input), { title: 'Y' })
  const c = await fix({ toolCall: { ...base, toolName: 'boh', input: '{}' }, tools, error: new NoSuchToolError({ toolName: 'boh' }) } as never)
  assert.equal(c, null)
  assert.equal(budget.riuscite, 2)
})

/* banco finto: un modello che risponde a copione, uno strumento di scrittura che registra */
const usoFinto = { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 5, text: 5, reasoning: 0 } }
const passo = (content: unknown[], unified: 'tool-calls' | 'stop' = 'stop') => ({ content, finishReason: { unified, raw: unified }, usage: usoFinto, warnings: [] })
const testo = (t: string) => passo([{ type: 'text', text: t }])
const chiama = (toolName: string, input: unknown, id = '1') => passo([{ type: 'tool-call', toolCallId: id, toolName, input: typeof input === 'string' ? input : JSON.stringify(input) }], 'tool-calls')
function copione(label: string, risposte: ReturnType<typeof passo>[], visti?: Record<string, unknown>[]) {
  let i = 0
  const model = new MockLanguageModelV3({ modelId: label, doGenerate: async (o: Record<string, unknown>) => { visti?.push(o); return risposte[Math.min(i++, risposte.length - 1)] as never } })
  return { id: `mock:${label}`, provider: 'anthropic' as const, modelId: label, label, model, profile: reg.profileOf('anthropic', 'claude-sonnet-5-5') }
}
function salvaDef(salvati: unknown[]) {
  return { name: 'salvaNota', group: 'memoria', risk: 'write', description: 'salva una nota', inputSchema: z.object({ testo: z.string() }), execute: ({ testo }: { testo: string }) => { salvati.push(testo); return { success: true, id: `n${salvati.length}` } } } as never
}

test('runAgent esegue la chiamata scritta come testo e continua con lo stesso modello', async () => {
  const salvati: unknown[] = []
  const r = await runAgent({ compito: 'nota "ciao"', defs: [salvaDef(salvati)], candidati: [
    copione('debole', [testo('<tool_call>{"name": "salvaNota", "arguments": {"testo": "ciao"}}</tool_call>'), testo('Nota n1 a posto.')]),
    copione('caro', [testo('non dovrei servire')]),
  ] })
  assert.equal(r.ok, true)
  assert.equal(r.modello, 'debole')
  assert.deepEqual(salvati, ['ciao'])
  assert.ok(r.log.some(l => /riparate 1/.test(l)))
})

test('runAgent cambia modello solo dopo due riparazioni fallite', async () => {
  const r = await runAgent({ compito: 'nota', defs: [salvaDef([])], candidati: [
    copione('confuso', [testo('<tool_call>non si legge</tool_call>'), testo('<tool_call>ancora no</tool_call>')]),
    copione('bravo', [testo('Nessuna nota da salvare.')]),
  ] })
  assert.equal(r.modello, 'bravo')
  assert.ok(r.log.some(l => /confuso: chiamata scritta come testo e illeggibile, chiedo/.test(l)))
  assert.ok(r.log.some(l => /illeggibili due volte/.test(l)))
})

test('runAgent ripara nome e JSON rotto di una chiamata nativa', async () => {
  const salvati: unknown[] = []
  const r = await runAgent({ compito: 'nota "x"', defs: [salvaDef(salvati)], candidati: [copione('debole', [chiama('default_api:salvaNota', "{testo: 'x',}"), testo('Nota n1.')])] })
  assert.equal(r.modello, 'debole')
  assert.deepEqual(salvati, ['x'])
})

/* ── A2: regia per passo ──────────────────────────────────────────────── */

const steer = await import('../../src/lib/agent/steer')

test('isActionRequest: verbi che cambiano il sistema sì, domande e testi no', () => {
  for (const t of ['Programma 3 post per la settimana', 'crea un incarico per lunedì', 'Sposta la riunione a giovedì', 'ricordami di chiamare Luca']) assert.equal(steer.isActionRequest(t), true, t)
  for (const t of ['Come creo un incarico?', 'scrivimi una caption per il post', 'quali incarichi ho oggi?', 'ciao']) assert.equal(steer.isActionRequest(t), false, t)
})

test('phaseOf: leggere → scrivere → verificare → chiudere', () => {
  const risks = { leggi: 'read', scrivi: 'write' } as const
  const s = (toolName: string, output: unknown = { success: true }) => ({ toolCalls: [], toolResults: [{ toolName, output }] }) as never
  assert.equal(steer.phaseOf([], risks), 'leggere')
  assert.equal(steer.phaseOf([s('leggi')], risks), 'scrivere')
  assert.equal(steer.phaseOf([s('leggi'), s('scrivi', { success: false })], risks), 'scrivere')
  assert.equal(steer.phaseOf([s('leggi'), s('scrivi')], risks), 'verificare')
  assert.equal(steer.phaseOf([s('leggi'), s('scrivi'), s('leggi')], risks), 'chiudere')
  assert.match(steer.phaseNote('scrivere', risks), /fase: scrivere;.*strumenti utili: scrivi<\/promemoria>/)
})

test('prepareStep: required solo al primo passo di un\'azione; fase in coda senza toccare il prefisso', async () => {
  const prep = steer.createPrepareStep({ azione: true, risks: { leggi: 'read' } })
  const msgs = [{ role: 'user', content: 'crea' }] as never[]
  const p0 = (await prep({ stepNumber: 0, steps: [], messages: msgs } as never))!
  assert.equal(p0.toolChoice, 'required')
  assert.equal(p0.messages, undefined)
  const p1 = (await prep({ stepNumber: 1, steps: [], messages: msgs } as never))!
  assert.equal(p1.toolChoice, undefined)
  assert.deepEqual(p1.messages!.slice(0, 1), msgs)
  assert.match(String(p1.messages!.at(-1)!.content), /^<promemoria>fase: leggere/)
})

test('runAgent: strumento obbligatorio al primo passo e esecutore dal secondo', async () => {
  const visti: Record<string, unknown>[] = []
  const vistiEsec: Record<string, unknown>[] = []
  const salvati: unknown[] = []
  const r = await runAgent({ compito: 'salva la nota "ciao"', defs: [salvaDef(salvati)],
    candidati: [copione('pianifica', [chiama('salvaNota', { testo: 'ciao' })], visti)],
    esecutore: copione('esegue', [testo('Nota n1 salvata.')], vistiEsec) })
  assert.equal(r.ok, true)
  assert.deepEqual(visti[0].toolChoice, { type: 'required' })
  assert.equal(visti.length, 1)
  assert.equal(vistiEsec.length, 1)
  assert.match(JSON.stringify(vistiEsec[0].prompt), /fase: verificare/)
})

/* ── A3: chiudere solo con le prove ───────────────────────────────────── */

const ev = await import('../../src/lib/agent/evidence')

test('objectsOf/provaOf: successo per oggetto, non per chiamata', () => {
  assert.deepEqual(ev.objectsOf('x', { success: true, id: 'a' }), { oggetti: ['a'], falliti: 0 })
  assert.deepEqual(ev.objectsOf('slot', { success: true, count: 2 }), { oggetti: ['slot#1', 'slot#2'], falliti: 0 })
  const p = ev.provaOf('sposta', 'write', {}, { success: true, ids: ['a', 'b'], errori: ['c', 'd', 'e'] })
  assert.equal(p.esito, 'parziale')
  assert.equal(ev.provaOf('sposta', 'write', {}, { success: false, error: 'no' }).esito, 'errore')
})

test('checkClosure: promessa senza azione, conteggio, piano non finito, voce con prova', () => {
  const scritto = (id: string) => ({ strumento: 'salvaNota', rischio: 'write' as const, esito: 'ok' as const, oggetti: [id] })
  assert.match(ev.checkClosure({ prove: [], testo: 'Ho programmato i post.', azione: true })[0], /nessuna scrittura riuscita/)
  assert.deepEqual(ev.checkClosure({ prove: [], testo: 'Non ho creato niente: mancano le date.', azione: true }), [])
  assert.deepEqual(ev.checkClosure({ prove: [], testo: 'Ho creato tre varianti qui sotto.' }), [], 'richiesta solo di testo: niente rilevatore')
  assert.match(ev.checkClosure({ prove: [scritto('a')], testo: 'Ho programmato 3 post.', azione: true })[0], /ne risulta 1/)
  const piano = { strumento: 'updatePlan', rischio: 'read' as const, esito: 'ok' as const, input: { passi: [
    { testo: 'leggi il piano', stato: 'fatto' },
    { testo: 'programma i post', stato: 'fatto', prova: { strumento: 'salvaNota', almeno: 2 } },
    { testo: 'avvisa il cliente', stato: 'da_fare' },
  ] } }
  const m = ev.checkClosure({ prove: [piano, scritto('a')], testo: 'Fatto.' })
  assert.equal(m.length, 2)
  assert.match(m.join('|'), /risultano 1 salvaNota riusciti, ne servono 2/)
  assert.match(m.join('|'), /«avvisa il cliente» del piano è ancora «da_fare»/)
  assert.deepEqual(ev.checkClosure({ prove: [{ ...piano, input: { passi: [{ testo: 'programma', stato: 'fatto', prova: { strumento: 'salvaNota', almeno: 2 } }] } }, scritto('a'), scritto('b')], testo: 'Ho programmato 2 post.' }), [])
  const parziale = { strumento: 'sposta', rischio: 'write' as const, esito: 'parziale' as const, oggetti: ['a', 'b'], falliti: 3 }
  assert.match(ev.checkClosure({ prove: [parziale], testo: 'Spostati.' })[0], /riuscito su 2 elementi, 3 non riusciti/)
  assert.deepEqual(ev.checkClosure({ prove: [parziale], testo: 'Spostati 2; 3 non sono riusciti.' }), [])
})

test('runAgent: promessa senza azione → riprende con il motivo e chiude quando le prove ci sono', async () => {
  const salvati: unknown[] = []
  const visti: Record<string, unknown>[] = []
  const r = await runAgent({ compito: 'salva la nota "ciao"', defs: [salvaDef(salvati)], candidati: [copione('pigro', [
    testo('Ho salvato la nota.'),
    chiama('salvaNota', { testo: 'ciao' }),
    testo('Ho salvato la nota (n1).'),
  ], visti)] })
  assert.equal(r.ok, true)
  assert.equal(r.modello, 'pigro')
  assert.deepEqual(salvati, ['ciao'])
  assert.ok(r.log.some(l => /chiusura senza prove \(1\/3\)/.test(l)))
  assert.match(JSON.stringify(visti[1].prompt), /Non chiudere ancora/)
  assert.equal(r.chiamate[0].rischio, 'write')
  assert.deepEqual(r.chiamate[0].oggetti, ['n1'])
})

test('runAgent: dopo tre riprese senza prove passa al modello successivo con il registro', async () => {
  const salvati: unknown[] = []
  const visti: Record<string, unknown>[] = []
  const r = await runAgent({ compito: 'salva le note "a" e "b"', defs: [salvaDef(salvati)], candidati: [
    copione('bugiardo', [chiama('salvaNota', { testo: 'a' }), testo('Ho salvato 2 note.')]),
    copione('onesto', [chiama('salvaNota', { testo: 'b' }), testo('Ho salvato 2 note (n1, n2).')], visti),
  ] })
  assert.equal(r.ok, true)
  assert.equal(r.modello, 'onesto')
  assert.ok(r.log.some(l => /bugiardo: tre riprese senza prove/.test(l)))
  assert.match(JSON.stringify(visti[0].prompt), /<registro>.*salvaNota: ok \(n1\)/)
  assert.deepEqual(salvati, ['a', 'b'])
})

test('runAgent: se nessuno chiude con le prove restituisce l\'ultima risposta come non riuscita', async () => {
  const r = await runAgent({ compito: 'salva la nota', defs: [salvaDef([])], candidati: [copione('solo', [testo('Ho salvato la nota.')])] })
  assert.equal(r.ok, false)
  assert.equal(r.testo, 'Ho salvato la nota.')
  assert.equal(r.modello, 'solo')
})
