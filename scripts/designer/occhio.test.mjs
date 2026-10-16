/**
 * Prove dell'imbuto e dell'occhio: il codice scarta solo il chiaramente
 * sbagliato, i dubbi passano al modello, una chiamata per griglia, verdetti
 * ricordati per impronta. Nessuna chiamata vera: il modello è simulato.
 *   node --test scripts/designer/occhio.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '../..')
const esbuild = createRequire(import.meta.url)('esbuild')
const carica = async f => {
  const r = await esbuild.build({ entryPoints: [path.join(repo, 'src/components/studio/designer/gen', f)], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error', alias: { '@': path.join(repo, 'src') } })
  return import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'))
}
const { vaglia, finaliste, distanzaFirme } = await carica('imbuto.ts')

const misure = { fuori: 0, sovrapposti: 0, margine: 1, densita: 0.5, squilibrio: 0.1, armonia: 'complementare', contrastoMin: 7 }
const criteri = { leggibilita: 9, contenuto: 10, gerarchia: 9, allineamento: 9, respiro: 9, colore: 9, decoro: 9, sperimentazione: 9 }
const esame = (voto, o = {}) => ({ voto, criteri: { ...criteri, ...o.criteri }, difetti: [], gesti: [], correzioni: [], promossa: voto >= 72, firma: o.firma ?? `T${voto}`, misure: { ...misure, ...o.misure } })

test('il codice scarta solo il chiaramente sbagliato', () => {
  assert.equal(vaglia(esame(90, { misure: { fuori: 1 } })).esito, 'scarta')
  assert.equal(vaglia(esame(90, { misure: { sovrapposti: 1 } })).esito, 'scarta')
  assert.equal(vaglia(esame(90, { criteri: { contenuto: 4 } })).esito, 'scarta')
  assert.equal(vaglia(esame(40)).esito, 'scarta')
  assert.equal(vaglia(esame(90)).esito, 'buona')
})

test('i dubbi passano all\'occhio, non si scartano', () => {
  for (const e of [esame(70), esame(90, { misure: { squilibrio: 0.4 } }), esame(90, { misure: { armonia: 'libera' } }), esame(90, { misure: { margine: 0.4 } })]) {
    assert.equal(vaglia(e).esito, 'incerta')
  }
})

test('le gemelle di tavole già mostrate si scartano, le simili restano in dubbio', () => {
  assert.equal(distanzaFirme('A|B', 'A|B'), 0)
  assert.equal(vaglia(esame(90, { firma: 'T1|F2' }), { sistema: 'eco', mostrate: ['eco|T1|F2'] }).esito, 'scarta')
  assert.equal(vaglia(esame(90, { firma: 'T1|F2' }), { sistema: 'orbita', mostrate: ['eco|T1|F2'] }).esito, 'buona')
  assert.equal(vaglia(esame(90, { firma: 'T1|F2|C3|C4' }), { sistema: 'eco', mostrate: ['eco|T1|F2|C3|C5'] }).esito, 'incerta')
})

test('al massimo 6 finaliste, prima le buone', () => {
  const lista = Array.from({ length: 14 }, (_, i) => ({ id: `t${i}`, sistema: `s${i}`, esame: esame(i < 4 ? 30 : 60 + i * 2) }))
  const { finaliste: f, scartate } = finaliste(lista)
  assert.equal(f.length, 6)
  assert.equal(scartate.length, 4)
  assert.equal(f[0].v.esito, 'buona')
  assert.ok(f.every(y => y.x.esame.voto >= 60))
})
