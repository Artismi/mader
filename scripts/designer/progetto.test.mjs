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
  assert.ok(!ripiego('Su appuntamento, taglio classico').motivi.includes('risparmio'), 'parole intere, non pezzi')
})

/* ── C1: il concetto dal brief ─────────────────────────────────────────── */
const con = await esbuild.build({ entryPoints: [path.join(repo, 'src/components/studio/designer/gen/concetto.ts')], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error' })
const { ideeDaRegole, leggiIdee, concetti, simulato, promptIdee } = await import('data:text/javascript;base64,' + Buffer.from(con.outputFiles[0].text).toString('base64'))
const caffe = { brand: 'Tostatura Nera', kicker: 'Nuovo blend', title: 'Notte Etiope', numero: '250 g', body: 'Note di cacao, spezie e frutti rossi.' }

test('C1: dalle regole da 3 a 5 idee, un gesto diverso ciascuna, poli estremi', () => {
  const idee = ideeDaRegole(caffe)
  assert.ok(idee.length >= 3 && idee.length <= 5, `${idee.length} idee`)
  assert.equal(new Set(idee.map(i => i.gesto)).size, idee.length)
  for (const i of idee) for (const k of ['scala', 'energia', 'densita']) assert.ok(i[k] === 0 || i[k] === 1)
  assert.ok(idee.some(i => i.gesto === 'vuoto'), 'la notte dà il vuoto')
})

test('C1: risposta illeggibile o povera → si completa con le regole; la simulata passa dal lettore', async () => {
  assert.ok(leggiIdee('non so', caffe).length >= 3)
  const una = leggiIdee('[{"nome":"lettere di caffè","gesto":"spezzato","parola":"Notte","scala":1,"energia":0.9,"densita":0,"togli":["dettagli","x"],"motivi":["mano","boh"]}]', caffe)
  assert.equal(una[0].gesto, 'spezzato'); assert.deepEqual(una[0].togli, ['dettagli']); assert.deepEqual(una[0].motivi, ['mano']); assert.ok(una.length >= 3)
  const conta = { chiamate: 0, token: 0 }
  const s = await concetti(caffe, { chiedi: simulato(caffe, conta) })
  assert.deepEqual(s.map(i => i.gesto), ideeDaRegole(caffe).map(i => i.gesto))
  assert.equal(conta.chiamate, 1); assert.ok(conta.token > 100 && conta.token < 1500, `${conta.token} token`)
})

test('C1: il controllo dell\'uscita scarta le decorazioni travestite e i gesti doppi; il prompt ha gli esempi d\'autore', () => {
  const r = leggiIdee('[{"nome":"una cornice dorata elegante","gesto":"scala"},{"nome":"la notte che inghiotte il titolo","gesto":"vuoto"},{"nome":"il buio ancora","gesto":"vuoto"}]', caffe)
  assert.ok(!r.some(i => /cornice/.test(i.nome)))
  assert.equal(r.filter(i => i.gesto === 'vuoto').length, 1)
  assert.equal(r[0].nome, 'la notte che inghiotte il titolo')
})
test('C1: il prompt è breve e porta il brief', () => {
  const p = promptIdee(caffe)
  assert.ok(p.includes('Notte Etiope') && p.includes('Esempi'))
  assert.ok(p.length / 4 < 700, `${Math.round(p.length / 4)} token`)
})
