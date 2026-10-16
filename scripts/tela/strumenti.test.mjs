// Tela: testo, forme, linee, penna, matita, gomma, forbici, immagini, barre, esporta, salva.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { launch, close, openStudio } from './harness.mjs'

before(launch)
after(close)

function t(name, fn) {
  test(name, async () => {
    const T = await openStudio()
    try { await fn(T); assert.deepEqual(T.page.errors, [], 'errori nella pagina') }
    finally { await T.page.close() }
  })
}
const near = (a, b, tol = 1.5, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} atteso ${b}, trovato ${a}`)
const leftovers = T => T.run(c => c.getObjects().filter(o => o.excludeFromExport && !o.isArtboard).length)

// PNG 4×4 rosso, per inserire e sostituire immagini
const PNG = path.resolve('.tela-test/rosso.png')
fs.mkdirSync(path.dirname(PNG), { recursive: true })
fs.writeFileSync(PNG, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEklEQVR4nGP4z8CAB+GTG8HSALfKY52fTcuYAAAAAElFTkSuQmCC', 'base64'))

// ── Testo ────────────────────────────────────────────────────────────────────
t('testo: crea, scrive, va a capo con Invio, esce con Esc', async T => {
  await T.key('t')
  await T.click(100, 100)
  await T.page.waitForTimeout(200)
  assert.equal((await T.active())?.editing, true, 'in modifica')
  await T.page.keyboard.type('Ciao')
  await T.key('Enter')
  await T.page.keyboard.type('mondo')
  await T.key('Escape')
  const os = await T.objs()
  assert.equal(os.length, 1)
  assert.equal(os[0].text, 'Ciao\nmondo')
  assert.notEqual((await T.active())?.editing, true, 'Esc esce dalla modifica')
})

t('testo: la maniglia laterale allarga il riquadro senza deformare il carattere', async T => {
  await T.key('t'); await T.click(100, 100); await T.page.waitForTimeout(200)
  await T.page.keyboard.type('Titolo'); await T.key('Escape')
  const before = await T.run(c => { const o = c.getActiveObject(); return { w: o.width, fs: o.fontSize, sx: o.scaleX } })
  const mr = await T.control('mr')
  await T.dragScreen(mr, { x: mr.x + 80, y: mr.y })
  const after = await T.run(c => { const o = c.getActiveObject(); return { w: o.width, fs: o.fontSize, sx: o.scaleX } })
  assert.ok(after.w > before.w + 50, 'larghezza'); assert.equal(after.fs, before.fs); assert.equal(after.sx, 1)
})

t('testo: Ctrl+B e Ctrl+I sul testo selezionato', async T => {
  await T.key('t'); await T.click(100, 100); await T.page.waitForTimeout(200)
  await T.page.keyboard.type('Peso'); await T.key('Escape')
  await T.key('Control+b'); await T.key('Control+i')
  const s = await T.run(c => { const o = c.getActiveObject(); return [String(o.fontWeight), o.fontStyle] })
  assert.ok(['bold', '700'].includes(s[0]), `peso ${s[0]}`); assert.equal(s[1], 'italic')
})

t('testo: doppio clic rientra in modifica', async T => {
  await T.key('t'); await T.click(100, 100); await T.page.waitForTimeout(200)
  await T.page.keyboard.type('Parola'); await T.key('Escape')
  await T.click(-80, -80)
  const c = await T.run(c => { const o = c.getObjects().find(o => o.type === 'textbox'), p = o.getCenterPoint(), v = c.viewportTransform, r = c.upperCanvasEl.getBoundingClientRect(); return { x: r.left + p.x * v[0] + v[4], y: r.top + p.y * v[3] + v[5] } })
  await T.clickScreen(c, { clickCount: 2 }); await T.page.waitForTimeout(150)
  assert.equal((await T.active())?.editing, true)
})

// ── Forme ────────────────────────────────────────────────────────────────────
t('rettangolo: trascinare ne decide la misura', async T => {
  await T.key('r')
  await T.drag(100, 100, 400, 250)
  const o = (await T.objs())[0], b = await T.board()
  assert.equal(o?.type, 'rect')
  near(o.bx - b.left, 100, 2); near(o.by - b.top, 100, 2); near(o.w, 300, 3); near(o.h, 150, 3)
})

t('rettangolo: Maiusc fa un quadrato; un clic solo dà la misura standard', async T => {
  await T.key('r'); await T.drag(100, 100, 400, 250, { keys: ['Shift'] })
  let o = (await T.objs())[0]
  near(o.w, o.h, 2, 'quadrato')
  await T.key('r'); await T.click(600, 600)
  o = (await T.objs())[1]
  assert.ok(o && o.w >= 50, 'forma standard col clic')
})

t('ellisse: trascinare ne decide la misura', async T => {
  await T.key('c'); await T.drag(100, 100, 300, 200)
  const o = (await T.objs())[0]
  assert.equal(o?.type, 'ellipse'); near(o.w, 200, 3); near(o.h, 100, 3)
})

t('linea: si disegna trascinando, Maiusc la tiene orizzontale', async T => {
  await T.key('l'); await T.drag(100, 100, 400, 130, { keys: ['Shift'] })
  const os = await T.objs()
  assert.equal(os.length, 1)
  assert.ok(os[0].bh < 12, `alta ${os[0].bh}: non orizzontale`)
  assert.equal(await leftovers(T), 0)
})

// ── Penna, matita, gomma, forbici ────────────────────────────────────────────
async function penPath(T, pts = [[100, 100], [300, 300], [500, 100]]) {
  await T.key('f')
  for (const [x, y] of pts) await T.click(x, y)
  await T.key('Enter')
}

t('penna: tre clic e Invio fanno un tracciato, che poi si può scalare', async T => {
  await penPath(T)
  const os = await T.objs()
  assert.equal(os.length, 1); assert.equal(os[0].type, 'path')
  assert.equal(await leftovers(T), 0, 'anteprima rimasta')
  const locked = await T.run(c => { const o = c.getObjects().find(o => o.type === 'path' && !o.excludeFromExport); return !!(o.lockScalingX || o.lockScalingY) })
  assert.equal(locked, false, 'il tracciato non si può scalare')
})

t('penna: Esc annulla il tracciato in corso; cambiare strumento non lascia anteprime', async T => {
  await T.key('f'); await T.click(100, 100); await T.click(300, 300)
  await T.key('Escape')
  assert.equal((await T.objs()).length, 0); assert.equal(await leftovers(T), 0)
  await T.key('f'); await T.click(100, 100); await T.click(300, 300)
  await T.key('v')
  assert.equal(await leftovers(T), 0, 'anteprima rimasta cambiando strumento')
  await T.key('f'); await T.click(600, 600); await T.click(700, 700); await T.key('Enter')
  const ps = (await T.objs()).filter(o => o.type === 'path')
  assert.equal(ps.length, 1, 'i punti vecchi non devono finire nel tracciato nuovo')
  near(ps[0].bw, 100, 6)
})

t('penna: tracciato spostato si modifica nel posto giusto', async T => {
  await penPath(T)
  await T.key('v')
  await T.drag(300, 300, 400, 300)   // trascina il tracciato di 100 a destra (clic sul punto di mezzo)
  const b0 = (await T.objs())[0]
  // doppio clic: modifica dei punti; Invio/Esc per uscire. Il tracciato non deve tornare indietro.
  const p = await T.at(400, 300)
  await T.clickScreen(p, { clickCount: 2 }); await T.page.waitForTimeout(150)
  await T.key('Escape'); await T.key('Escape')
  const b1 = (await T.objs())[0]
  near(b1.bx, b0.bx, 2, 'il tracciato è saltato')
})

t('matita: trascinare disegna un tratto', async T => {
  await T.key('p'); await T.drag(100, 100, 400, 300, { steps: 25 })
  const os = await T.objs()
  assert.equal(os.length, 1); assert.equal(os[0].type, 'path')
})

t('gomma: cancella l\'oggetto toccato ma non la tavola', async T => {
  await T.rect(100, 100)
  await T.key('e'); await T.drag(50, 150, 900, 150, { steps: 30 })
  assert.equal((await T.objs()).length, 0)
  assert.equal(await T.run(c => c.getObjects().filter(o => o.isArtboard).length), 1, 'la tavola è stata cancellata')
})

t('forbici: tagliano un tracciato della penna in due', async T => {
  await penPath(T, [[100, 100], [500, 100]])
  await T.key('x'); await T.click(300, 100)
  const ps = (await T.objs()).filter(o => o.type === 'path')
  assert.equal(ps.length, 2)
})

t('forbici: tagliano anche una linea', async T => {
  await T.key('l'); await T.drag(100, 100, 500, 100)
  await T.key('x'); await T.click(300, 100)
  assert.equal((await T.objs()).length, 2)
})

// ── Immagini ─────────────────────────────────────────────────────────────────
async function insertImage(T) {
  const [fc] = await Promise.all([T.page.waitForEvent('filechooser'), (async () => { await T.key('i'); await T.click(100, 100) })()])
  await fc.setFiles(PNG)
  await T.page.waitForFunction(() => document.querySelector('canvas.lower-canvas')._fabric.getObjects().some(o => o.type === 'image'))
}

t('immagine: si inserisce col suo strumento', async T => {
  await insertImage(T)
  const os = await T.objs()
  assert.equal(os.length, 1); assert.equal(os[0].type, 'image')
})

t('immagine: doppio clic avvia il ritaglio, Esc lo chiude senza lasciare oggetti', async T => {
  await insertImage(T)
  await T.key('v')
  const c = await T.run(c => { const o = c.getObjects().find(o => o.type === 'image'), p = o.getCenterPoint(), v = c.viewportTransform, r = c.upperCanvasEl.getBoundingClientRect(); return { x: r.left + p.x * v[0] + v[4], y: r.top + p.y * v[3] + v[5] } })
  await T.clickScreen(c, { clickCount: 2 }); await T.page.waitForTimeout(150)
  assert.ok(await leftovers(T) > 0, 'il ritaglio non è partito')
  await T.key('Escape'); await T.page.waitForTimeout(100)
  assert.equal(await leftovers(T), 0, 'restano oggetti del ritaglio')
  assert.equal((await T.objs()).length, 1)
})

// ── Barre contestuali ────────────────────────────────────────────────────────
t('le schede del pannello seguono il tipo dell\'oggetto selezionato', async T => {
  const tabs = () => T.page.locator('button[title="Testo"], button[title="Forma"], button[title="Linea"], button[title="Immagine"], button[title="Gruppo"]').evaluateAll(bs => bs.map(b => b.title))
  await T.rect(100, 100); await T.click(150, 150)
  assert.deepEqual(await tabs(), ['Forma'])
  await T.key('t'); await T.click(400, 400); await T.page.waitForTimeout(200); await T.page.keyboard.type('x'); await T.key('Escape')
  assert.deepEqual(await tabs(), ['Testo'])
  await T.key('Escape'); await T.key('l'); await T.drag(100, 700, 500, 700)
  assert.deepEqual(await tabs(), ['Linea'])
  await T.key('Control+a'); await T.key('Control+g')
  assert.deepEqual(await tabs(), ['Gruppo'], 'un gruppo vero')
})

// ── Esporta, salva, ricarica ─────────────────────────────────────────────────
t('esporta la tavola in PNG', async T => {
  await T.rect(100, 100); await T.click(150, 150)
  await T.page.getByRole('button', { name: /Esporta/ }).first().click()
  const [dl] = await Promise.all([T.page.waitForEvent('download', { timeout: 15000 }), T.page.getByRole('button', { name: /^Esporta/ }).last().click()])
  assert.match(dl.suggestedFilename(), /\.png$/)
})

t('salva e ricarica: gli oggetti tornano uguali', async T => {
  await T.rect(100, 100, 120, 80, { angle: 30 })
  await T.key('t'); await T.click(400, 400); await T.page.waitForTimeout(200); await T.page.keyboard.type('Salvato'); await T.key('Escape')
  await T.settle()
  const before = await T.objs()
  await T.key('Control+s')
  const name = T.page.getByPlaceholder('Nome progetto...')
  await name.fill('prova-tela-' + Date.now())
  await T.page.getByRole('button', { name: 'Salva', exact: true }).last().click()
  await T.page.waitForTimeout(1500)
  await T.page.reload({ waitUntil: 'domcontentloaded' })
  await T.page.waitForFunction(() => document.querySelector('canvas.lower-canvas')?._fabric?.getObjects().some(o => o.type === 'textbox'), null, { timeout: 60000 })
  const after = await T.objs()
  // pulizia: il progetto di prova non deve restare nel database
  const { DatabaseSync } = await import('node:sqlite')
  const db = new DatabaseSync(path.resolve('.tela-test/tela.db')); db.exec("DELETE FROM design_projects WHERE name LIKE 'prova-tela-%'"); db.close()
  assert.equal(after.length, before.length)
  for (let i = 0; i < before.length; i++) {
    assert.equal(after[i].type, before[i].type); near(after[i].bx, before[i].bx, 0.5); near(after[i].angle, before[i].angle, 0.01)
  }
  assert.equal(after.find(o => o.type === 'textbox').text, 'Salvato')
})
