/**
 * Test dell'aggregazione del banco di confronto: npm run confronto:test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NOSTRO, maggioranza, combinaOrdini, tabellaVittorie, verdettiUtente, verdettiGiuria, accordo, incertezzaGiuria, coppieIncerte, prossimaCoppia } from './lib.mjs'

const C = 'canva', G = 'google'
const tutte = v => ({ lettura: v, protagonista: v, designer: v })
const r = (brief, concorrente, modello, ordine, risposte) => ({ brief, famiglia: 'prodotto', concorrente, modello, ordine, risposte })

test('maggioranza: serve più della metà, altrimenti pari', () => {
  assert.equal(maggioranza([NOSTRO, NOSTRO, C]), NOSTRO)
  assert.equal(maggioranza([NOSTRO, C, null]), null)
  assert.equal(maggioranza([NOSTRO, null, null]), null)
  assert.equal(maggioranza([C, C]), C)
  assert.equal(maggioranza([NOSTRO, C]), null)
  assert.equal(maggioranza([]), null)
})

test('combinaOrdini: vale solo se le due posizioni danno la stessa risposta', () => {
  assert.equal(combinaOrdini(NOSTRO, NOSTRO), NOSTRO)
  assert.equal(combinaOrdini(NOSTRO, C), null)
  assert.equal(combinaOrdini(null, null), null)
})

test('tabellaVittorie: per concorrente e per famiglia, pari a metà nel punteggio', () => {
  const t = tabellaVittorie([
    { concorrente: C, famiglia: 'evento', vincitore: NOSTRO },
    { concorrente: C, famiglia: 'evento', vincitore: null },
    { concorrente: C, famiglia: 'prodotto', vincitore: C },
    { concorrente: C, famiglia: 'prodotto', vincitore: NOSTRO },
    { concorrente: G, famiglia: 'evento', vincitore: G },
  ])
  assert.deepEqual([t[C].totale.vittorie, t[C].totale.pari, t[C].totale.sconfitte, t[C].totale.n], [2, 1, 1, 4])
  assert.equal(t[C].totale.percentuale, 0.5)
  assert.equal(t[C].totale.punteggio, 0.625)
  assert.equal(t[C].famiglie.evento.punteggio, 0.75)
  assert.equal(t[C].famiglie.prodotto.percentuale, 0.5)
  assert.equal(t[G].totale.percentuale, 0)
})

test('verdettiGiuria: domande combinate tra ordini, poi maggioranza per modello e tra modelli', () => {
  const righe = [
    // m1: coerente, vince Creative OS
    r('01', C, 'm1', 'nostro-primo', tutte(NOSTRO)), r('01', C, 'm1', 'nostro-secondo', tutte(NOSTRO)),
    // m2: sceglie sempre la prima posizione → tutte pari dopo lo scambio
    r('01', C, 'm2', 'nostro-primo', tutte(NOSTRO)), r('01', C, 'm2', 'nostro-secondo', tutte(C)),
    // m3: due domande su tre per Creative OS
    r('01', C, 'm3', 'nostro-primo', { lettura: NOSTRO, protagonista: NOSTRO, designer: C }), r('01', C, 'm3', 'nostro-secondo', { lettura: NOSTRO, protagonista: NOSTRO, designer: C }),
    // m4: manca un ordine → non vota
    r('01', C, 'm4', 'nostro-primo', tutte(C)),
  ]
  const v = verdettiGiuria(righe).get('01|canva')
  assert.equal(v.modelli.m1.vincitore, NOSTRO)
  assert.equal(v.modelli.m2.vincitore, null)
  assert.equal(v.modelli.m3.vincitore, NOSTRO)
  assert.equal(v.modelli.m4, undefined)
  assert.equal(v.vincitore, NOSTRO)
})

test('verdettiGiuria: senza modelli completi la coppia non ha verdetto', () => {
  assert.equal(verdettiGiuria([r('02', C, 'm1', 'nostro-primo', tutte(NOSTRO))]).size, 0)
})

test('verdettiUtente e accordo', () => {
  const g = (brief, vincitore) => ({ brief, famiglia: 'evento', concorrente: C, vincitore })
  const u = verdettiUtente([g('01', NOSTRO), g('01', NOSTRO), g('01', C), g('02', null), g('03', C)])
  assert.equal(u.get('01|canva').vincitore, NOSTRO)
  assert.equal(u.get('02|canva').vincitore, null)
  const giuria = new Map([['01|canva', { vincitore: NOSTRO }], ['02|canva', { vincitore: C }], ['99|canva', { vincitore: C }]])
  const a = accordo(u, giuria)
  assert.equal(a.n, 2)
  assert.equal(a.concordi, 1)
  assert.equal(a.percentuale, 0.5)
  assert.equal(a.concorrenti.canva.n, 2)
})

test('incertezza: netta → 0, divisa o pari → 1; le coppie incerte vengono prima', () => {
  const righe = [
    r('01', C, 'm1', 'nostro-primo', tutte(NOSTRO)), r('01', C, 'm1', 'nostro-secondo', tutte(NOSTRO)),
    r('02', C, 'm1', 'nostro-primo', tutte(NOSTRO)), r('02', C, 'm1', 'nostro-secondo', tutte(C)),
    r('03', C, 'm1', 'nostro-primo', tutte(null)),
  ]
  const inc = incertezzaGiuria(righe)
  assert.equal(inc.get('01|canva'), 0)
  assert.equal(inc.get('02|canva'), 1)
  assert.equal(inc.get('03|canva'), 1)
  const lista = ['01', '02', '03', '04'].map(brief => ({ brief, concorrente: C }))
  const scelte = coppieIncerte(lista, righe, [{ brief: '02', concorrente: C }], 2)
  assert.equal(scelte.length, 2)
  assert.ok(scelte.every(c => ['03', '04'].includes(c.brief)), 'esclude le già giudicate e mette in fondo le nette')
})

test('prossimaCoppia: tra le meno giudicate', () => {
  const lista = ['01', '02'].map(brief => ({ brief, concorrente: C }))
  assert.equal(prossimaCoppia(lista, [{ brief: '01', concorrente: C }]).brief, '02')
  assert.equal(prossimaCoppia([], []), null)
})
