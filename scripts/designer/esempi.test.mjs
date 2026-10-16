/**
 * Prove di G1 (scheda dell'archivio, ricerca dei vicini) e di G2 (programmi
 * dagli esempi: lettura, simulazione, niente copie). Nessuna chiamata vera.
 *   node --test scripts/designer/esempi.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '../..')
const esbuild = createRequire(import.meta.url)('esbuild')
const carica = async f => {
  const r = await esbuild.build({ entryPoints: [path.join(repo, 'src/components/studio/designer', f)], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error', alias: { '@': path.join(repo, 'src') }, external: ['fabric', 'three', 'onnxruntime-web'] })
  return import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'))
}
const { scheda, programmaDa, impronta, distanza } = await carica('archivio/scheda.ts')
const { vicini } = await carica('archivio/cerca.ts')
const { programmaSimulato, leggiProgrammi, promptEsempi, somiglianza, chiediProgrammi } = await carica('gen/esempi.ts')

const testo = (name, x, y, w, size, lines, o = {}) => ({ kind: 'text', name, x, y, w, h: size * lines.length * 1.1, tw: w, lines, font: { family: 'Inter', weight: o.weight ?? 400 }, size, color: o.color ?? '#111111', align: o.align ?? 'left', lineHeight: 1.1, tracking: 0 })
const scena = (dx = 0) => ({
  w: 1000, h: 1400, bg: '#f2ede4', layout: 'decompilata', style: 'decompilata', label: 'x',
  els: [
    { kind: 'rect', name: 'Fondo', x: 0, y: 0, w: 1000, h: 1400, fill: '#f2ede4' },
    { kind: 'rect', name: 'campo', x: 60 + dx, y: 700, w: 880, h: 500, fill: '#c0392b' },
    { kind: 'image', name: 'Immagine', x: 100 + dx, y: 760, w: 400, h: 400, fallback: '#ccc' },
    testo('Titolo', 60 + dx, 80, 880, 160, ['THE', 'CHAP-BOOK'], { weight: 900 }),
    testo('Occhiello', 60 + dx, 450, 500, 30, ['AUGUST 1894']),
    testo('Dettagli', 60 + dx, 1260, 600, 22, ['Stone & Kimball, Chicago']),
  ],
})
const lic = { fonte: 'prova', licenza: 'CC0', verifica: 'test' }
const brief = { brand: 'Torrefazione Aurora', kicker: 'Nuovo blend', title: 'Notte Etiope', body: 'Note di cacao e frutti rossi.', cta: 'Scoprilo in negozio', details: ['250 g', 'Monorigine'] }

test('la scheda riduce la scena a ruoli, frazioni e descrittori', () => {
  const e = scheda(scena(), { id: 'a', origine: 'museo', titolo: 'The Chap-Book poster', anno: 1894, fedelta: 0.93, licenza: lic })
  const ruoli = e.programma.strati.map(s => s.ruolo)
  assert.deepEqual(ruoli.slice(0, 3), ['fondo', 'campo', 'foto'])
  assert.ok(ruoli.includes('titolo') && ruoli.includes('occhiello') && ruoli.includes('dettagli'))
  const t = e.programma.strati.find(s => s.ruolo === 'titolo')
  assert.equal(t.maiuscolo, true); assert.equal(t.famiglia, 'impatto'); assert.ok(Math.abs(t.corpo - 160 / 1400) < 0.002)
  assert.equal(e.programma.strati.find(s => s.ruolo === 'campo').colore, 'accento')
  assert.equal(e.griglia.asse, 'sinistra'); assert.ok(e.tipografia.contrasto > 5)
  assert.deepEqual(e.settore, ['editoria']); assert.equal(e.registro, 'editoriale'); assert.equal(e.epoca, '1890s')
  assert.equal(e.impronta.length, 36 * 2 + 11)
})

test('impronte vicine per scene simili, lontane per scene diverse', () => {
  const a = impronta(programmaDa(scena())), b = impronta(programmaDa(scena(10)))
  const capovolta = { ...scena(), els: scena().els.map(e => (e.kind === 'text' ? { ...e, y: 1400 - e.y - e.h } : e)) }
  assert.ok(distanza(a, b) < distanza(a, impronta(programmaDa(capovolta))))
})

const archivio = () => {
  const es = []
  for (let i = 0; i < 12; i++) es.push(scheda(scena(i * 30 - 150), { id: `m${i}`, origine: i < 4 ? 'motore' : 'museo', titolo: i % 2 ? 'Coffee advertisement' : 'Theatre poster', anno: 1900 + i, fedelta: 0.9, licenza: lic }))
  return { versione: 1, creato: '', esempi: es }
}

test('i vicini: k esempi, al più 2 del motore, il settore del brief prima', () => {
  const v = vicini(brief, 'quadrato', archivio(), { k: 6, hasPhoto: true })
  assert.equal(v.length, 6)
  assert.ok(v.filter(e => e.origine === 'motore').length <= 2)
  assert.ok(v.slice(0, 3).some(e => e.settore.includes('cibo')))
})

test('il programma simulato è valido, ha il titolo e non copia gli esempi', () => {
  const es = vicini(brief, 'quadrato', archivio(), { k: 6, hasPhoto: true })
  for (const seme of [1, 2, 3]) {
    const p = programmaSimulato(brief, 'quadrato', es, seme, true)
    assert.ok(p.strati.some(s => s.ruolo === 'titolo'))
    assert.ok(p.strati.some(s => s.ruolo === 'foto'))
    assert.ok(somiglianza(p, es) <= 0.95)
  }
  const senza = programmaSimulato(brief, 'quadrato', es, 4, false)
  assert.ok(!senza.strati.some(s => s.ruolo === 'foto'))
})

test('la risposta del modello: validata, senza titolo o copiata si scarta, ripiego sui simulati', async () => {
  const es = archivio().esempi.slice(4, 10)
  const buono = { strati: [{ ruolo: 'fondo', box: [0, 0, 1, 1], colore: 'accento' }, { ruolo: 'titolo', box: [0.1, 0.55, 0.8, 0.3], famiglia: 'display', corpo: 0.2 }] }
  assert.equal(leggiProgrammi(`ecco: ${JSON.stringify([buono, { strati: [{ ruolo: 'fondo', box: [0, 0, 1, 1] }, { ruolo: 'campo', box: [0, 0, 1, 1] }] }])}`).length, 1)
  assert.equal(leggiProgrammi('non è json').length, 0)
  assert.equal(leggiProgrammi(JSON.stringify([es[0].programma]), es).length, 0)
  const r = await chiediProgrammi(brief, 'quadrato', es, { chiedi: async () => 'boh', quanti: 2 })
  assert.equal(r.fonte, 'simulato'); assert.equal(r.programmi.length, 2)
  const p = promptEsempi(brief, 'quadrato', es)
  assert.ok(p.includes('Notte Etiope') && p.includes('Esempio 6') && p.includes('Non copiare'))
})

test("l'archivio incluso nel motore rispetta lo schema e registra la licenza", () => {
  const f = path.join(repo, 'src/components/studio/designer/archivio/archivio.json')
  const a = JSON.parse(fs.readFileSync(f, 'utf8'))
  assert.ok(a.esempi.length >= 1)
  for (const e of a.esempi) {
    assert.ok(e.licenza?.fonte && e.licenza?.licenza && e.licenza?.verifica, e.id)
    if (e.origine === 'museo') { assert.ok(/CC0|Public Domain/.test(e.licenza.licenza), e.id); assert.ok(e.licenza.immagine && e.licenza.pagina, e.id) }
    assert.ok(e.programma.strati.some(s => s.ruolo !== 'fondo'), e.id)
  }
})
