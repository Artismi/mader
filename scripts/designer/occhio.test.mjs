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

const occhio = await carica('occhio.ts')
const { griglia, miniatura } = await import('../occhio/index.mjs')
const sharp = createRequire(import.meta.url)('sharp')
const tavola = (r, g, b) => sharp({ create: { width: 1080, height: 1350, channels: 3, background: { r, g, b } } }).png().toBuffer()
const memoriaRam = () => { const m = new Map(); return { get: k => m.get(k), set: (k, v) => m.set(k, v), m } }

test('le finaliste vanno al modello in una sola griglia numerata di miniature', async () => {
  const imgs = await Promise.all([[200, 0, 0], [0, 200, 0], [0, 0, 200], [9, 9, 9]].map(c => tavola(...c)))
  const lista = imgs.map((_, i) => ({ id: `t${i}`, sistema: `s${i}`, esame: esame(70 + i) }))
  const { finaliste: fin } = finaliste(lista)
  const viste = []
  const oc = {
    miniatura: id => miniatura(imgs[Number(id.slice(1))]), griglia,
    chiedi: async (p, g) => { viste.push(g); return '{"ordine": [4, 1, 2, 3], "scarta": [3]}' },
    memoria: memoriaRam(), conta: occhio.contaVuota(),
  }
  const r = await occhio.giudica(fin, 2, oc)
  assert.equal(oc.conta.chiamate, 1)
  assert.equal(viste.length, 1)
  assert.ok(viste[0].w <= 3 * 512 + 100 && viste[0].h <= 2 * 512 + 100, `griglia ${viste[0].w}×${viste[0].h}`)
  // la griglia segue l'ordine delle finaliste: il 4 è la quarta finalista
  assert.equal(r.scelte[0].id, fin[3].x.id)
  assert.equal(r.scelte.length, 2)
})

test('nessuna chiamata se le finaliste sono tutte sicure e bastano', async () => {
  const lista = [0, 1].map(i => ({ id: `t${i}`, sistema: `s${i}`, esame: esame(90 + i) }))
  const oc = { miniatura: () => { throw new Error('non serve') }, griglia, chiedi: () => { throw new Error('non serve') }, memoria: memoriaRam(), conta: occhio.contaVuota() }
  const r = await occhio.giudica(finaliste(lista).finaliste, 2, oc)
  assert.equal(oc.conta.chiamate, 0)
  assert.equal(r.scelte.length, 2)
})

test('la classifica del modello si legge anche sporca, e senza risposta resta l\'ordine del codice', () => {
  assert.deepEqual(occhio.leggiClassifica('ecco: {"ordine":[2,9,2],"scarta":[1]}', 3), { ordine: [2, 1, 3], scarta: [1] })
  assert.equal(occhio.leggiClassifica('non so', 3), null)
})

test('al modello vanno miniature di circa 512 px, configurabili', async () => {
  const t = await tavola(10, 20, 30)
  const m = await miniatura(t)
  assert.equal(Math.max(m.w, m.h), 512)
  assert.equal(m.mime, 'image/jpeg')
  assert.equal(Math.max((await miniatura(t, 384)).h), 384)
  const piccola = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#fff' } }).png().toBuffer()
  assert.equal((await miniatura(piccola)).w, 200, 'mai ingrandita')
  assert.ok(occhio.tokenImmagine(m.w, m.h) * 5 < occhio.tokenImmagine(1080, 1350), 'la miniatura costa almeno 5 volte meno')
})

test('i verdetti si ricordano per impronta: la stessa tavola non si rigiudica', async () => {
  const os = await import('node:os'), fs = await import('node:fs')
  const { memoriaFile } = await import('../occhio/index.mjs')
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'occhio-')), 'verdetti.jsonl')
  const imgs = await Promise.all([[200, 0, 0], [0, 200, 0], [0, 0, 200]].map(c => tavola(...c)))
  const fin = finaliste(imgs.map((_, i) => ({ id: `t${i}`, sistema: `s${i}`, esame: esame(75 + i) }))).finaliste
  const giro = async () => {
    const oc = { miniatura: id => miniatura(imgs[Number(id.slice(1))]), griglia, chiedi: async () => '{"ordine":[2,3,1],"scarta":[]}', memoria: memoriaFile(file), conta: occhio.contaVuota() }
    const r = await occhio.giudica(fin, 2, oc)
    return { chiamate: oc.conta.chiamate, ids: r.scelte.map(x => x.id) }
  }
  const primo = await giro(), secondo = await giro()
  assert.equal(primo.chiamate, 1)
  assert.equal(secondo.chiamate, 0, 'dalla memoria su file')
  assert.deepEqual(secondo.ids, primo.ids)
  // un criterio diverso è un giudizio diverso
  const m = await miniatura(imgs[0])
  assert.notEqual(await occhio.impronta(m, 'a'), await occhio.impronta(m, 'b'))
})

test('con controlla l\'occhio guarda anche finaliste tutte sicure, una volta sola', async () => {
  const imgs = await Promise.all([[1, 2, 3], [4, 5, 6]].map(c => tavola(...c)))
  const fin = finaliste(imgs.map((_, i) => ({ id: `t${i}`, sistema: `s${i}`, esame: esame(95) }))).finaliste
  const oc = { miniatura: id => miniatura(imgs[Number(id.slice(1))]), griglia, chiedi: async () => '{"ordine":[2,1],"scarta":[]}', memoria: memoriaRam(), conta: occhio.contaVuota() }
  const r = await occhio.giudica(fin, 2, oc, { controlla: true })
  assert.equal(oc.conta.chiamate, 1)
  assert.equal(r.scelte[0].id, fin[1].x.id)
})

test('le note del critico pesano sul voto secondo la gravità', async () => {
  const { pesoDifetti } = await carica('critico.ts')
  assert.equal(pesoDifetti([]), 0)
  assert.ok(pesoDifetti(["manca l'invito"]) > pesoDifetti(['brand quasi allineato (5u)']))
  assert.ok(pesoDifetti(['manca il titolo']) >= 30)
  assert.equal(pesoDifetti(['nota mai vista']), 2)
})

test('lo stile segue il soggetto: niente manga per un caffè di pregio, niente onomatopee in palestra', async () => {
  const { affinita, settori, onomatopeeAmmesse, giapponeseAmmesso } = await carica('affinita.ts')
  const caffe = { brand: 'Tostatura Nera', title: 'Caffè monorigine di pregio' }
  assert.ok(settori(caffe).includes('pregio'))
  assert.equal(affinita(caffe, 'manga'), 'esclusa')
  assert.equal(affinita(caffe, 'colonne'), 'ok')
  const gym = { brand: 'Forge Gym', title: 'Allenamento funzionale' }
  assert.equal(affinita(gym, 'fumetto'), 'lontana')
  assert.equal(onomatopeeAmmesse(gym), false)
  assert.equal(onomatopeeAmmesse({ title: 'Festa dei fumetti' }), true)
  assert.equal(affinita({ title: 'Caffè di pregio e manga' }, 'manga'), 'ok', 'chiamato per nome')
  assert.equal(giapponeseAmmesso(caffe), false)
})
