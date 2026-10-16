/**
 * Catalogo degli asset: regole di licenza, crediti, caratteri ammessi,
 * abbinamenti generati e regolatore di sperimentazione.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '../..')
const esbuild = createRequire(path.join(repo, 'scripts/designer/package.json'))('esbuild')
const b = await esbuild.build({
  stdin: { contents: "export * from './asset/catalogo'; export * from './core/caratteri'; export { rng } from './gen/knobs'", resolveDir: path.join(repo, 'src/components/studio/designer'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error', alias: { '@': path.join(repo, 'src') },
})
const m = await import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'))

test('licenze: solo commerciali senza share-alike', () => {
  assert.equal(m.ammesso({ licenza: 'OFL-1.1' }), true)
  assert.equal(m.ammesso({ licenza: 'CC-BY-4.0' }), true)
  for (const l of ['CC-BY-SA-4.0', 'personale', 'sconosciuta', 'inventata']) assert.equal(m.ammesso({ licenza: l }), false, l)
})

test('crediti: solo per le licenze che chiedono attribuzione', () => {
  const c = m.crediti([
    { nome: 'Icona', autore: 'Lorc', licenza: 'CC-BY-3.0' }, { nome: 'Inter', licenza: 'OFL-1.1' }, { nome: 'X', licenza: 'CC-BY-SA-4.0' },
  ])
  assert.deepEqual(c, ['Icona di Lorc (CC BY 3.0)'])
})

test('caratteri del motore: tutti ammessi, con gli accenti, tanti', () => {
  assert.ok(m.CARATTERI.length >= 150, `solo ${m.CARATTERI.length} caratteri`)
  for (const c of m.CARATTERI) {
    assert.ok(m.ammesso(m.carattereDi(c.family)), c.family)
    assert.notEqual(c.misure?.italiano, false, c.family)
    assert.ok(c.pesi.length && c.ruoli.length, c.family)
  }
  assert.ok(m.CARATTERI.some(c => c.ruoli.includes('testo')) && m.CARATTERI.some(c => c.ruoli.includes('etichetta')))
})

test('abbinamenti generati: molte coppie, testo leggibile', () => {
  const dir = { elegante: 0.6, caldo: 0.5 }
  const coppie = new Set()
  for (let i = 1; i <= 200; i++) {
    const a = m.abbina(m.rng(i), dir, { sperimentazione: 0.4 })
    coppie.add(`${a.display.family}+${a.text.family}`)
    assert.ok(m.CARATTERI.find(c => c.family === a.text.family).ruoli.includes('testo'), a.text.family)
  }
  assert.ok(coppie.size >= 60, `solo ${coppie.size} coppie su 200`)
})

test('regola del contrasto: graziato con bastoni', () => {
  const serif = m.CARATTERI.find(c => !c.sans && c.ruoli.includes('titolo')), sans = m.CARATTERI.find(c => c.sans && c.ruoli.includes('testo') && c.family !== serif.family)
  assert.ok(m.compatibilita(serif, sans, 'contrasto') > m.compatibilita(serif, { ...sans, sans: false }, 'contrasto'))
})

test('sperimentazione: a 0 titoli sobri, a 1 anche i display d’autore', () => {
  const osa = s => Array.from({ length: 150 }, (_, i) => {
    const f = m.abbina(m.rng(i + 1), { sperimentale: 0.5, forte: 0.5 }, { sperimentazione: s }).display.family
    return m.CARATTERI.find(c => c.family === f).osa
  })
  const zero = osa(0), uno = osa(1)
  assert.ok(Math.max(...zero) <= 0.3, `a 0 un titolo osa ${Math.max(...zero)}`)
  assert.ok(uno.filter(x => x >= 0.7).length >= 30, `a 1 solo ${uno.filter(x => x >= 0.7).length} titoli audaci`)
})
