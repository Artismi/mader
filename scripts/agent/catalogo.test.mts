/**
 * Modelli ritirati: catalogo dei fornitori, ID nel codice, segnalazione.
 *   npm run test:agente
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'catalogo-')), 'test.db')
process.env.CREATIVE_OS_SOLO_GRATIS = '0' // qui si prova il registro completo; le vie gratuite in vie-gratuite.test.mts
process.env.CREATIVE_OS_NO_CATALOG = '1'

const cat = await import('../../src/lib/ai/model-catalog')
const reg = await import('../../src/lib/ai/model-registry')

const GOOGLE = { openrouter: false, anthropic: false, google: true }

test('stato degli ID: elenco, versioni datate, alias -latest, elenco assente', () => {
  cat.clearCatalogs()
  assert.equal(cat.idState('google', 'gemini-3.8-flash'), 'sconosciuto')
  cat.setCatalog('google', ['gemini-flash-latest', 'gemini-3.8-flash', 'gemma-4-31b-it'])
  cat.setCatalog('anthropic', ['claude-sonnet-5-5-20260301', 'claude-haiku-5-5-20260301'])
  assert.equal(cat.idState('google', 'gemini-3.8-flash'), 'ok')
  assert.equal(cat.idState('google', 'gemini-2.5-flash'), 'ritirato')
  assert.equal(cat.idState('google', 'gemini-flash-lite-latest'), 'ok', 'gli alias -latest non si ritirano')
  assert.equal(cat.idState('anthropic', 'claude-sonnet-5-5'), 'ok', 'alias senza data → versione datata')
  assert.equal(cat.idState('google', 'gemini-3.8-flash', Date.now() + 8 * 864e5), 'sconosciuto', 'elenco troppo vecchio')
})

test('il registro non propone gli ID ritirati', () => {
  cat.clearCatalogs()
  cat.setCatalog('google', ['gemini-flash-latest', 'gemma-4-31b-it'])
  const ids = reg.candidatesFor({ task: 'general' }, { keys: GOOGLE }).map(c => c.modelId)
  assert.ok(!ids.includes('gemini-3.5-flash-lite'))
  assert.ok(ids.includes('gemini-flash-latest') && ids.includes('gemini-flash-lite-latest'))
})

test('un errore "no longer available" segna l\'ID come ritirato e checkModelIds lo segnala', () => {
  cat.clearCatalogs(); reg.resetExhausted()
  reg.noteFailure({ id: 'google:gemini-3.8-flash' }, Object.assign(new Error('This model models/gemini-3.8-flash is no longer available to new users'), { statusCode: 404 }))
  const r = reg.checkModelIds().find(x => x.id === 'gemini-3.8-flash')
  assert.equal(r?.stato, 'ritirato')
  assert.ok(!reg.candidatesFor({ task: 'design' }, { keys: GOOGLE }).some(c => c.modelId === 'gemini-3.8-flash'))
})

test('refreshCatalog legge l\'elenco del fornitore (fetch finto)', async () => {
  cat.clearCatalogs()
  process.env.GEMINI_API_KEY = 'finta'
  const fake = (async () => new Response(JSON.stringify({ models: [{ name: 'models/gemini-flash-latest' }, { name: 'models/gemini-9-pro' }] }))) as unknown as typeof fetch
  const ids = await cat.refreshCatalog('google', fake)
  assert.deepEqual(ids, ['gemini-flash-latest', 'gemini-9-pro'])
  assert.equal(cat.idState('google', 'gemini-9-pro'), 'ok')
  delete process.env.GEMINI_API_KEY
})

test('nessun ID di modello scritto a mano fuori dal registro', () => {
  const root = path.resolve(import.meta.dirname, '../../src')
  const bad: string[] = []
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(e.name) && !/model-(registry|catalog|provider)\.ts$/.test(e.name)) {
        const src = fs.readFileSync(p, 'utf8')
        // chiamate dirette ai fornitori con un ID: devono passare dal registro
        for (const m of src.matchAll(/\b(google|anthropic|openai)\(\s*['"`]([^'"`]+)['"`]/g)) bad.push(`${path.relative(root, p)}: ${m[1]}('${m[2]}')`)
      }
    }
  }
  walk(root)
  assert.deepEqual(bad, [], 'usa pickModel / generateTextWith / generateObjectWith di model-registry')
})
