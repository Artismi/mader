/**
 * Prove del vocabolario della specifica di progetto: ogni icona dei motivi
 * esiste nei set in locale, ogni voce è una di quelle che il motore esegue,
 * il ripiego senza IA trova i motivi giusti dalle parole del brief.
 *   node --test scripts/designer/progetto.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '../..')
const esbuild = createRequire(import.meta.url)('esbuild')
const out = path.join(here, 'out', 'progetto.test.bundle.mjs')
await esbuild.build({ entryPoints: [path.join(repo, 'src/components/studio/designer/progetto/specifica.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(repo, 'src') } })
const { espandi, ripiego } = await import(pathToFileURL(out).href)
const voc = await esbuild.build({ entryPoints: [path.join(repo, 'src/components/studio/designer/progetto/vocabolario.ts')], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error' })
const { MOTIVI, ORNAMENTI, EFFETTI_TESTO } = await import('data:text/javascript;base64,' + Buffer.from(voc.outputFiles[0].text).toString('base64'))

const setIcone = s => [path.join(repo, 'node_modules'), path.resolve(repo, '../../../node_modules')].map(d => path.join(d, '@iconify-json', s, 'icons.json')).find(f => fs.existsSync(f))

test('ogni icona dei motivi esiste ed è un tracciato pieno', () => {
  const cache = {}
  for (const [id, m] of Object.entries(MOTIVI)) for (const ic of m.icone) {
    const [set, nome] = ic.split(':')
    assert.ok(['game-icons', 'ph'].includes(set), `${id}: set ${set} non monocromo`)
    const file = setIcone(set)
    if (!file) return // set non installati: si salta
    cache[set] ??= JSON.parse(fs.readFileSync(file, 'utf8'))
    assert.match(cache[set].icons[nome]?.body ?? '', /^<path[^>]* d="/, `${id}: ${ic} manca o non è un tracciato`)
  }
})

test('i motivi usano solo voci che il motore esegue', () => {
  for (const [id, m] of Object.entries(MOTIVI)) {
    for (const o of m.ornamenti ?? []) assert.ok(ORNAMENTI.includes(o), `${id}: ornamento ${o}`)
    if (m.effetto) assert.ok(m.effetto in EFFETTI_TESTO, `${id}: effetto ${m.effetto}`)
    if (m.accento) assert.match(m.accento, /^#[0-9a-f]{6}$/i)
  }
})

test('espandi scioglie i motivi e scarta le voci sconosciute', () => {
  const e = espandi({ motivi: ['barbiere', 'inesistente'], ornamenti: ['finto'], testo: { titolo: ['neon', 'timbro'] }, evita: ['neon', 'boh'] })
  assert.ok(e.icone.some(i => i.id === 'game-icons:razor'))
  assert.deepEqual(e.ornamenti, ['strisce'])
  assert.deepEqual(e.effetti, ['timbro'])
  assert.deepEqual(e.evita, ['neon'])
  assert.equal(e.accento, MOTIVI.barbiere.accento)
})

test('il ripiego trova i motivi dal brief', () => {
  assert.equal(ripiego('Bottega Baffo, barba e rasatura col panno caldo').motivi[0], 'barbiere')
  assert.ok(ripiego('Notte Etiope, nuovo blend di caffè tostato a Bologna').motivi.includes('caffe'))
  assert.deepEqual(ripiego('niente di riconoscibile qui').motivi, [])
})
