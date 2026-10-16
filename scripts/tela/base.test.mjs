// Tela: selezione, spostamento, scala, rotazione, gruppi, ordine, appunti, annulla, zoom.
// Avvio: npm run tela:server (in un altro terminale), poi npm run test:tela
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { launch, close, openStudio } from './harness.mjs'

before(launch)
after(close)

/** ogni prova parte da una pagina pulita */
function t(name, fn) {
  test(name, async () => {
    const T = await openStudio()
    try { await fn(T); assert.deepEqual(T.page.errors, [], 'errori nella pagina') }
    finally { await T.page.close() }
  })
}
const near = (a, b, tol = 1.5, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} atteso ${b}, trovato ${a}`)

// ── Selezione ────────────────────────────────────────────────────────────────
t('clic seleziona, Maiusc+clic aggiunge e toglie', async T => {
  const a = await T.rect(100, 100), b = await T.rect(400, 100)
  await T.click(150, 150)
  assert.deepEqual((await T.active())?.ids, [a])
  await T.click(450, 150, { modifiers: ['Shift'] })
  assert.equal((await T.active())?.n, 2)
  await T.click(450, 150, { modifiers: ['Shift'] })
  assert.deepEqual((await T.active())?.ids, [a])
})

t('trascinare sul vuoto della tavola fa un riquadro di selezione e non sposta la tavola', async T => {
  await T.rect(100, 100); await T.rect(300, 100)
  const before = await T.board()
  await T.drag(50, 50, 450, 260)
  const after = await T.board()
  assert.deepEqual([after.left, after.top], [before.left, before.top], 'la tavola si è spostata')
  assert.equal((await T.active())?.n, 2)
})

t('lazo seleziona gli oggetti racchiusi', async T => {
  await T.rect(100, 100); await T.rect(300, 100); await T.rect(700, 700)
  await T.key('a')
  const pts = [[50, 50], [500, 50], [500, 300], [50, 300], [50, 60]]
  const s = await Promise.all(pts.map(([x, y]) => T.at(x, y)))
  await T.page.mouse.move(s[0].x, s[0].y); await T.page.mouse.down()
  for (const p of s.slice(1)) await T.page.mouse.move(p.x, p.y, { steps: 8 })
  await T.page.mouse.up(); await T.page.waitForTimeout(80)
  const act = await T.active()
  assert.equal(act?.n, 2); assert.equal(act.artboard, false)
})

t('Ctrl+A seleziona gli oggetti ma non la tavola', async T => {
  await T.rect(100, 100); await T.rect(300, 100)
  await T.click(150, 150)
  await T.key('Control+a')
  const act = await T.active()
  assert.equal(act?.n, 2)
})

t('Esc e clic sul vuoto deselezionano', async T => {
  await T.rect(100, 100)
  await T.click(150, 150); await T.key('Escape')
  assert.equal(await T.active(), null)
  await T.click(150, 150); await T.click(-80, -80)
  assert.equal(await T.active(), null)
})

t('Tab passa all\'oggetto successivo, Maiusc+Tab al precedente', async T => {
  const a = await T.rect(100, 100), b = await T.rect(300, 100), c = await T.rect(500, 100)
  await T.click(150, 150)
  await T.key('Tab'); assert.deepEqual((await T.active())?.ids, [b])
  await T.key('Tab'); assert.deepEqual((await T.active())?.ids, [c])
  await T.key('Shift+Tab'); assert.deepEqual((await T.active())?.ids, [b])
})

t('Ctrl+clic seleziona un oggetto dentro un gruppo', async T => {
  const a = await T.rect(100, 100), b = await T.rect(300, 100)
  await T.select([a, b]); await T.key('Control+g')
  assert.equal((await T.active())?.type, 'group')
  await T.click(-80, -80)
  await T.click(350, 150, { modifiers: ['Control'] })
  assert.deepEqual((await T.active())?.ids, [b])
})

// ── Spostamento ──────────────────────────────────────────────────────────────
t('trascinare sposta l\'oggetto della distanza del mouse', async T => {
  const a = await T.rect(100, 100)
  await T.drag(150, 150, 350, 250)
  const o = (await T.objs())[0], b = await T.board()
  near(o.bx - b.left, 300, 2); near(o.by - b.top, 200, 2)
})

t('frecce: 1 px, Maiusc 10 px; annulla torna indietro', async T => {
  await T.rect(100, 100); await T.settle()
  await T.click(150, 150)
  const x0 = (await T.objs())[0].left
  await T.key('ArrowRight'); await T.key('ArrowRight')
  near((await T.objs())[0].left, x0 + 2, 0.01)
  await T.key('Shift+ArrowRight')
  near((await T.objs())[0].left, x0 + 12, 0.01)
  await T.key('Shift+ArrowDown')
  await T.settle()
  await T.key('Control+z'); await T.settle(300)
  near((await T.objs())[0].by, (await T.board()).top + 100, 0.01, 'annulla dopo le frecce')
})

t('aggancio alla griglia mentre si trascina', async T => {
  await T.rect(100, 100)
  await T.page.getByRole('button', { name: 'Snap', exact: true }).click()
  await T.drag(150, 150, 233, 247)
  const o = (await T.objs())[0], b = await T.board()
  // il bordo dell'oggetto cade sulla griglia (passo 20, contata dall'angolo della tavola)
  near((o.bx - b.left) % 20, 0, 0.5, 'x sulla griglia'); near((o.by - b.top) % 20, 0, 0.5, 'y sulla griglia')
})

t('le guide agganciano al bordo di un altro oggetto', async T => {
  await T.rect(100, 100); const b = await T.rect(400, 400)
  // porta il secondo vicino (3 px) all'allineamento col bordo sinistro del primo
  await T.drag(450, 450, 153, 450, { steps: 20 })
  const os = await T.objs()
  near(os[1].bx, os[0].bx, 0.5, 'bordo sinistro agganciato')
})

// ── Scala ────────────────────────────────────────────────────────────────────
t('maniglia d\'angolo con Maiusc mantiene le proporzioni', async T => {
  await T.rect(100, 100, 200, 100)
  await T.click(200, 150)
  const br = await T.control('br')
  await T.dragScreen(br, { x: br.x + 120, y: br.y + 10 }, { keys: ['Shift'] })
  const o = (await T.objs())[0]
  near(o.w / o.h, 2, 0.05, 'rapporto')
  assert.ok(o.w > 250)
})

t('Alt scala dal centro', async T => {
  await T.rect(100, 100, 200, 200)
  await T.click(200, 200)
  const c0 = await T.run(c => { const p = c.getActiveObject().getCenterPoint(); return [p.x, p.y] })
  const br = await T.control('br')
  await T.dragScreen(br, { x: br.x + 60, y: br.y + 60 }, { keys: ['Alt'] })
  const c1 = await T.run(c => { const p = c.getActiveObject().getCenterPoint(); return [p.x, p.y] })
  near(c1[0], c0[0], 1); near(c1[1], c0[1], 1)
  assert.ok((await T.objs())[0].w > 250)
})

t('valori numerici: X, Y, L, A applicati dal pannello', async T => {
  await T.rect(100, 100, 200, 100)
  await T.click(200, 150)
  const inputs = T.page.locator('input[type=number]')
  const fill = async (i, v) => { const el = inputs.nth(i); await el.click({ clickCount: 3 }); await el.fill(String(v)); await el.press('Enter') }
  await fill(0, 40); await fill(1, 60); await fill(2, 300); await fill(3, 150)
  const o = (await T.objs())[0], b = await T.board()
  near(o.bx - b.left, 40, 1); near(o.by - b.top, 60, 1); near(o.w, 300, 1); near(o.h, 150, 1)
})

t('il pannello delle misure segue le frecce', async T => {
  await T.rect(100, 100)
  await T.click(150, 150)
  await T.key('Shift+ArrowRight')
  await T.page.waitForTimeout(100)
  assert.equal(await T.page.locator('input[type=number]').nth(0).inputValue(), '110')
})

// ── Rotazione e capovolgimento ───────────────────────────────────────────────
t('rotazione con la maniglia, Maiusc a scatti di 15°', async T => {
  await T.rect(300, 300, 200, 200)
  await T.click(400, 400)
  const mtr = await T.control('mtr'), c = await T.at(400, 400)
  // ruota di circa 40° attorno al centro
  const r = Math.hypot(mtr.x - c.x, mtr.y - c.y), ang = (-90 + 40) * Math.PI / 180
  await T.dragScreen(mtr, { x: c.x + r * Math.cos(ang), y: c.y + r * Math.sin(ang) }, { keys: ['Shift'] })
  const o = (await T.objs())[0]
  assert.equal(o.angle % 15, 0, `angolo ${o.angle}`)
  assert.ok(o.angle > 20 && o.angle < 60)
})

t('Maiusc+H e Maiusc+V capovolgono', async T => {
  await T.rect(100, 100)
  await T.click(150, 150)
  await T.key('Shift+h'); assert.equal((await T.objs())[0].flipX, true)
  await T.key('Shift+v'); assert.equal((await T.objs())[0].flipY, true)
})

// ── Gruppi, ordine, allinea ──────────────────────────────────────────────────
t('raggruppa e separa mantengono le posizioni; annulla il raggruppamento in un passo', async T => {
  const a = await T.rect(100, 100), b = await T.rect(300, 200)
  await T.settle()
  const before = (await T.objs()).map(o => [o.bx, o.by])
  await T.select([a, b]); await T.key('Control+g')
  let os = await T.objs()
  assert.equal(os.length, 1); assert.equal(os[0].type, 'group')
  await T.key('Control+Shift+g')
  os = await T.objs()
  assert.deepEqual(os.map(o => [Math.round(o.bx), Math.round(o.by)]), before.map(([x, y]) => [Math.round(x), Math.round(y)]))
  await T.key('Control+g'); await T.settle()
  await T.key('Control+z'); await T.settle(300)
  assert.equal((await T.objs()).length, 2, 'un annulla toglie il gruppo')
})

t('ordine degli strati con ] [ e Ctrl+] Ctrl+[', async T => {
  const a = await T.rect(100, 100), b = await T.rect(150, 150), c = await T.rect(200, 200)
  const order = () => T.objs().then(os => os.map(o => o.id))
  await T.select([a]); await T.key(']')
  assert.deepEqual(await order(), [b, a, c])
  await T.key('Control+]'); assert.deepEqual(await order(), [b, c, a])
  await T.key('Control+['); assert.deepEqual(await order(), [a, b, c])
})

t('allinea a sinistra (Alt+A) e distribuisci (Alt+Maiusc+H)', async T => {
  const a = await T.rect(100, 100), b = await T.rect(250, 300), c = await T.rect(700, 500)
  await T.select([a, b, c])
  await T.key('Alt+Shift+h')
  let os = await T.objs()
  near(os[1].bx - (os[0].bx + os[0].bw), os[2].bx - (os[1].bx + os[1].bw), 1, 'spazi uguali')
  await T.key('Alt+a')
  os = await T.objs()
  near(os[1].bx, os[0].bx, 0.5); near(os[2].bx, os[0].bx, 0.5)
})

// ── Appunti ──────────────────────────────────────────────────────────────────
t('copia e incolla di un oggetto', async T => {
  await T.rect(100, 100)
  await T.click(150, 150)
  await T.key('Control+c'); await T.key('Control+v'); await T.page.waitForTimeout(150)
  const os = await T.objs()
  assert.equal(os.length, 2); assert.notEqual(os[0].id, os[1].id)
})

t('copia e incolla di più oggetti: diventano oggetti separati', async T => {
  const a = await T.rect(100, 100), b = await T.rect(300, 100)
  await T.select([a, b])
  await T.key('Control+c'); await T.key('Control+v'); await T.page.waitForTimeout(200)
  const os = await T.objs()
  assert.equal(os.length, 4, JSON.stringify(os.map(o => o.type)))
  assert.ok(os.every(o => o.type === 'rect'))
  assert.equal(new Set(os.map(o => o.id)).size, 4, 'id unici')
  near(os[2].bx, os[0].bx + 20, 0.5, 'incollato sfalsato di 20'); near(os[3].by, os[1].by + 20, 0.5)
})

t('duplica (Ctrl+D) più oggetti', async T => {
  const a = await T.rect(100, 100), b = await T.rect(300, 100)
  await T.select([a, b])
  await T.key('Control+d'); await T.page.waitForTimeout(200)
  const os = await T.objs()
  assert.equal(os.length, 4); assert.ok(os.every(o => o.type === 'rect'))
})

t('taglia (Ctrl+X) e incolla', async T => {
  await T.rect(100, 100)
  await T.click(150, 150)
  await T.key('Control+x'); await T.page.waitForTimeout(150)
  assert.equal((await T.objs()).length, 0)
  await T.key('Control+v'); await T.page.waitForTimeout(150)
  assert.equal((await T.objs()).length, 1)
})

t('Canc elimina la selezione e annulla la riporta', async T => {
  const a = await T.rect(100, 100), b = await T.rect(300, 100)
  await T.settle()
  await T.select([a, b]); await T.key('Delete')
  assert.equal((await T.objs()).length, 0)
  await T.settle()
  await T.key('Control+z'); await T.settle(300)
  assert.equal((await T.objs()).length, 2)
})

// ── Annulla / ripeti ─────────────────────────────────────────────────────────
t('annulla subito dopo una modifica toglie solo quella', async T => {
  await T.rect(100, 100); await T.settle()
  await T.rect(300, 100)
  await T.key('Control+z'); await T.settle(300)
  assert.equal((await T.objs()).length, 1)
})

t('Ctrl+Maiusc+Z e Ctrl+Y ripetono', async T => {
  await T.rect(100, 100); await T.settle()
  await T.key('Control+z'); await T.settle(300)
  assert.equal((await T.objs()).length, 0)
  await T.key('Control+Shift+z'); await T.settle(300)
  assert.equal((await T.objs()).length, 1, 'Ctrl+Maiusc+Z')
  await T.key('Control+z'); await T.settle(300)
  await T.key('Control+y'); await T.settle(300)
  assert.equal((await T.objs()).length, 1, 'Ctrl+Y')
})

t('annulla uno spostamento col mouse', async T => {
  await T.rect(100, 100); await T.settle()
  await T.drag(150, 150, 350, 350); await T.settle()
  await T.key('Control+z'); await T.settle(300)
  const o = (await T.objs())[0], b = await T.board()
  near(o.bx - b.left, 100, 0.5)
})

// ── Zoom e pan ───────────────────────────────────────────────────────────────
t('rotella zooma verso il cursore; Ctrl+più/meno; Ctrl+0 adatta', async T => {
  const z0 = await T.zoom()
  const p = await T.at(500, 500)
  await T.page.mouse.move(p.x, p.y); await T.page.mouse.wheel(0, -300); await T.page.waitForTimeout(100)
  assert.ok(await T.zoom() > z0)
  const p2 = await T.at(500, 500)
  near(p2.x, p.x, 2, 'il punto sotto il cursore resta fermo')
  await T.key('Control+0'); near(await T.zoom(), z0, 0.01)
  await T.key('Control+='); assert.ok(await T.zoom() > z0, 'Ctrl+=')
  await T.key('Control+-'); await T.key('Control+-'); assert.ok(await T.zoom() < z0, 'Ctrl+-')
})

t('Spazio+trascina sposta la vista senza spostare oggetti', async T => {
  await T.rect(100, 100)
  const b0 = await T.at(0, 0)
  await T.page.keyboard.down(' ')
  await T.drag(150, 150, 250, 200)
  await T.page.keyboard.up(' ')
  const b1 = await T.at(0, 0)
  assert.ok(Math.abs(b1.x - b0.x) > 50, 'la vista non si è spostata')
  const o = (await T.objs())[0], b = await T.board()
  near(o.bx - b.left, 100, 0.5, 'l\'oggetto non deve muoversi')
})
