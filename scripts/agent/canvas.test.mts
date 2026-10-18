/**
 * Controlli della maestra sulle tavole composte a mano e verifica delle scritture
 * dichiarate (src/lib/agent/canvas-checks.ts). Casi presi dalla chat dal vivo.
 *   npm run test:agente
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const cc = await import('../../src/lib/agent/canvas-checks')

test('isDesignRequest: grafiche nuove sì, ritocchi e domande no', () => {
  for (const t of ['crea un post per LoopAI', 'fammi un volantino per la serata', 'prepara una presentazione di 8 slide', 'ricrea la grafica']) assert.equal(cc.isDesignRequest(t), true, t)
  for (const t of ['sposta il titolo più in alto', 'che font usa questo post?', 'metti la foto sotto il testo']) assert.equal(cc.isDesignRequest(t), false, t)
})

test('elementi fuori tavola: testo e foto spostati dentro, forme rifilate, foto al vivo lasciata', () => {
  const { boards, avvisi } = cc.controllaTavole([{ name: 'post', width: 1080, height: 1080, elements: [
    { id: 'titolo', type: 'text', x: 900, y: 100, w: 500, h: 120, text: 'LoopAI' },
    { id: 'foto', type: 'image', x: -400, y: 200, w: 600, h: 600 },
    { id: 'banda', type: 'rect', x: 800, y: 900, w: 600, h: 300 },
    { id: 'vivo', type: 'image', x: -20, y: -20, w: 1120, h: 1120 },
  ] }])
  const [t, f, b, v] = ['titolo', 'foto', 'banda', 'vivo'].map(id => boards[0].elements!.find(e => e.id === id)!)
  assert.ok(t.x! + t.w! <= 1080 - 43 && t.x! >= 43, JSON.stringify(t))
  assert.equal(f.x, 0); assert.equal(f.w, 600)
  assert.deepEqual([b.x, b.y, b.w, b.h], [800, 900, 280, 180])
  assert.equal(v.x, -20)
  assert.equal(avvisi.filter(a => /usciva/.test(a)).length, 3)
})

test('livelli: fondo sotto, foto grande sopra il fondo, testo sopra a tutto', () => {
  const { boards, avvisi } = cc.controllaTavole([{ width: 1080, height: 1080, elements: [
    { id: 'titolo', type: 'text', x: 80, y: 80, zIndex: 0, text: 'Ciao' },
    { id: 'foto', type: 'image', x: 0, y: 0, w: 1080, h: 800, zIndex: 9 },
    { id: 'sfondo', type: 'rect', x: 0, y: 0, w: 1080, h: 1080, zIndex: 5 },
  ] }])
  assert.deepEqual(boards[0].elements!.map(e => [e.id, e.zIndex]), [['sfondo', 0], ['foto', 1], ['titolo', 2]])
  assert.ok(avvisi.some(a => /livelli riordinati/.test(a)))
})

test('riquadro opaco sopra la foto importante: diventa un velo', () => {
  const { boards, avvisi } = cc.controllaTavole([{ width: 1080, height: 1080, elements: [
    { id: 'foto', type: 'image', x: 0, y: 0, w: 1080, h: 700 },
    { id: 'pannello', type: 'rect', x: 0, y: 0, w: 1080, h: 600, color: '#000' },
    { id: 'fascia', type: 'rect', x: 0, y: 900, w: 1080, h: 180, color: '#000' },
  ] }])
  const el = (id: string) => boards[0].elements!.find(e => e.id === id)!
  assert.equal(el('pannello').opacity, 0.45)
  assert.equal(el('fascia').opacity, undefined)
  assert.ok(avvisi.some(a => /copriva la foto/.test(a)))
})

test('verifica: z-index annunciato ma mancante, canvas vuoto dopo "ho ricreato la grafica"', () => {
  const snap = 'Il progetto contiene 1 tavole.\n## Tavola [tav_1] "Post" 1080×1080\n- [titolo] testo "Bicicleria"'
  const mancano = cc.verificaCanvas([
    { strumento: 'updateCanvasElements', input: { updates: [{ id: 'titolo', changes: { text: 'LoopAI' } }, { id: 'foto_2', changes: { x: 0 } }] } },
  ], snap)
  assert.deepEqual(mancano, ['il testo «LoopAI» su «titolo»', "l'elemento «foto_2»"])
  assert.match(cc.notaVerifica(mancano), /non risultano/)
  assert.deepEqual(cc.verificaCanvas([{ strumento: 'composeDesign', input: { boards: [{}] } }], ''), ['le tavole di composeDesign (il canvas è vuoto)'])
  assert.deepEqual(cc.verificaCanvas([{ strumento: 'updateCanvasElements', input: { updates: [{ id: 'titolo', changes: { text: 'Bicicleria' } }] } }], snap), [])
  assert.equal(cc.notaVerifica([]), '')
})
