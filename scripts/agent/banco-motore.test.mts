/**
 * Test del motore del banco G6 (L1): riprova dopo 503/429 con attese crescenti,
 * ritmo dosato, ripresa dal file di stato, token per compito riuscito per
 * profilo, prova a secco. Niente attese vere, niente fornitori.
 *   npm run test:agente
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'banco-motore-'))
process.env.DATABASE_PATH = path.join(tmp, 'test.db')

const m = await import('./banco/motore')
const { aSecco } = await import('./banco/secco')

const riga = (id: string, x: Partial<import('./banco/motore').Riga> = {}) => ({ id, area: 'a', ok: true, eseguito: true, motivo: 'ok', passi: 1, ms: 1, errori: 0, ...x })

test('transitorio: 503 e 429 si riprovano, la quota del giorno ferma, il resto no', () => {
  assert.equal(m.transitorio(['x: salta · 503 Service Unavailable']), 'ritenta')
  assert.equal(m.transitorio(['x: quota · 429 Too Many Requests']), 'ritenta')
  assert.equal(m.transitorio(['x: quota · Quota exceeded for GenerateRequestsPerDayPerProjectPerModel']), 'giorno')
  assert.equal(m.transitorio(['x: salta · 404 not found']), undefined)
  assert.equal(m.transitorio(['x: 3 passi']), undefined)
})

test('attese crescenti con tetto; ritmo che sale dopo gli errori e scende piano', () => {
  assert.deepEqual([0, 1, 2, 3].map(n => m.attesaDopo(n, { base: 1000, max: 20_000 })), [1000, 3000, 9000, 20_000])
  const r = m.creaRitmo({ pausa: 1000, max: 3000 })
  r.dopo('transitorio'); assert.equal(r.pausa, 2000)
  r.dopo('transitorio'); r.dopo('transitorio'); assert.equal(r.pausa, 3000)
  r.dopo('ok'); assert.equal(r.pausa, 2250)
  for (let i = 0; i < 10; i++) r.dopo('ok')
  assert.equal(r.pausa, 1000)
})

test('eseguiBanco riprova dopo il 503, riparte dai compiti fatti, si ferma a quota finita', async () => {
  const stato = path.join(tmp, 'stato.json')
  const attese: number[] = []
  const dormi = async (ms: number) => { attese.push(ms) }
  let chiamate = 0
  const esegui = async (c: { id: string }) => {
    chiamate++
    if (c.id === 'b' && chiamate === 2) return { log: ['x: salta · 503 high demand'], riga: riga('b', { ok: false, eseguito: false, motivo: 'non eseguito' }) }
    if (c.id === 'c') return { log: ['x: quota · limit PerDay'], riga: riga('c', { ok: false, eseguito: false, motivo: 'non eseguito' }) }
    return { log: ['x: 1 passi'], riga: riga(c.id, { spesa: { input: 100, cached: 0, output: 10 }, livello: 'base' }) }
  }
  const compiti = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
  const r1 = await m.eseguiBanco({ modello: 'x', compiti, esegui, stato, pausa: 100, attesaBase: 1000, dormi, scrivi: () => {} })
  assert.match(r1.fermo ?? '', /quota del giorno/)
  assert.deepEqual(r1.righe.map(x => [x.id, x.tentativi]), [['a', 1], ['b', 2], ['c', 1]])
  assert.deepEqual(attese, [100, 1000, 150])
  // al rilancio: a e b non si rifanno, c (non eseguito) sì
  const visti: string[] = []
  const r2 = await m.eseguiBanco({ modello: 'x', compiti, stato, dormi, scrivi: () => {}, esegui: async c => { visti.push(c.id); return { log: [], riga: riga(c.id) } } })
  assert.deepEqual(visti, ['c', 'd'])
  assert.deepEqual(r2.righe.map(x => x.id), ['a', 'b', 'c', 'd'])
  assert.equal(m.caricaStato(stato).length, 4)
})

test('token per compito riuscito, per profilo: i falliti pesano sul costo', () => {
  const t = (n: number) => ({ input: n, cached: 0, output: 0 })
  const c = m.tokenPerRiuscito([
    riga('a', { livello: 'base', spesa: t(1000) }), riga('b', { livello: 'base', ok: false, spesa: t(500) }),
    riga('c', { livello: 'forte', spesa: t(9000) }), riga('d', { livello: 'forte', eseguito: false, spesa: t(7000) }),
  ])
  assert.deepEqual(c.map(x => [x.livello, x.riusciti, x.eseguiti, x.token, x.perRiuscito, x.medioRiusciti]), [['forte', 1, 1, 9000, 9000, 9000], ['base', 1, 2, 1500, 1500, 1000]])
  assert.match(m.tabellaCosti(c).join('\n'), /\| base \| 1\/2 \| 1500 \| 1500 \| 1000 \|/)
})

test('prova a secco: tre profili, la riprova dopo il 503, il base costa meno per compito riuscito', async () => {
  const testo: string[] = []
  const righe = await aSecco({ dormi: async () => {}, scrivi: s => testo.push(s) })
  const costi = m.tokenPerRiuscito(righe)
  assert.deepEqual(costi.map(c => c.livello), ['forte', 'medio', 'base'])
  for (const c of costi) assert.ok(c.riusciti >= 2, `${c.livello}: ${c.riusciti} riusciti`)
  const per = Object.fromEntries(costi.map(c => [c.livello, c.perRiuscito!]))
  assert.ok(per.base < per.medio && per.medio < per.forte, JSON.stringify(per))
  assert.equal(testo.filter(s => /servizio occupato/.test(s)).length, 3)
})
