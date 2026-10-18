/**
 * Banco di prova della tela (Fabric.js) con eventi veri di mouse e tastiera.
 * Il server di sviluppo va avviato a parte (npm run tela:server, porta 3100,
 * database di prova in .tela-test/): qui si apre /progettazione in Chrome
 * e si legge lo stato dagli oggetti Fabric esposti sull'elemento canvas.
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('../designer/node_modules/playwright-core')

export const BASE = process.env.TELA_URL ?? 'http://127.0.0.1:3100'
let browser

export async function launch() {
  const exe = process.env.TELA_CHROME
  browser = await chromium.launch(exe ? { executablePath: exe } : { channel: 'chrome' })
  return browser
}
export async function close() { await browser?.close() }

/** pagina nuova con la tela pronta: una tavola 1080×1080 e niente altro */
export async function openStudio() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))
  await page.goto(BASE + '/progettazione', { waitUntil: 'domcontentloaded', timeout: 240000 })
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas.lower-canvas')?._fabric
    return c && c.getObjects().some(o => o.isArtboard)
  }, null, { timeout: 240000 })
  await page.waitForTimeout(900)   // cronologia iniziale e adattamento della vista
  return wrap(page)
}

function wrap(page) {
  const T = {
    page,
    /** esegue fn(canvas, ...args) nella pagina */
    run: (fn, ...args) => page.evaluate(([src, a]) => {
      const c = document.querySelector('canvas.lower-canvas')._fabric
      return (0, eval)('(' + src + ')')(c, ...a)
    }, [fn.toString(), args]),
    /** coordinate di schermo di un punto della scena */
    async screen(x, y) {
      return T.run((c, x, y) => {
        const v = c.viewportTransform, r = c.upperCanvasEl.getBoundingClientRect()
        return { x: r.left + x * v[0] + v[4], y: r.top + y * v[3] + v[5] }
      }, x, y)
    },
    /** angolo in alto a sinistra e misure della tavola (in Fabric 7 left/top sono il centro) */
    board: () => T.run(c => { const b = c.getObjects().find(o => o.isArtboard), p = b.getCenterPoint(), w = b.width * b.scaleX, h = b.height * b.scaleY; return { left: p.x - w / 2, top: p.y - h / 2, w, h } }),
    /** oggetti "veri" (niente tavole, etichette, anteprime) */
    objs: () => T.run(c => c.getObjects().filter(o => !o.isArtboard && !o.excludeFromExport && !String(o.name ?? '').startsWith('label_')).map(o => {
      const r = o.getBoundingRect()
      return { id: o.objId, type: o.type, left: Math.round(o.left * 100) / 100, top: Math.round(o.top * 100) / 100, w: Math.round(o.getScaledWidth()), h: Math.round(o.getScaledHeight()), angle: o.angle, flipX: o.flipX, flipY: o.flipY, visible: o.visible, text: o.text, bx: r.left, by: r.top, bw: r.width, bh: r.height, n: o.type === 'group' ? o.getObjects().length : 0 }
    })),
    active: () => T.run(c => { const a = c.getActiveObject(); return a ? { type: a.type, n: c.getActiveObjects().length, ids: c.getActiveObjects().map(o => o.objId), artboard: !!a.isArtboard, editing: !!a.isEditing } : null }),
    /** aggiunge un rettangolo con la classe del Rect della tavola (coordinate relative alla tavola) */
    async rect(x, y, w = 100, h = 100, extra = {}) {
      return T.run((c, x, y, w, h, extra) => {
        const ab = c.getObjects().find(o => o.isArtboard), R = ab.constructor, p = ab.getCenterPoint()
        const r = new R({ left: p.x - ab.width / 2 + x + w / 2, top: p.y - ab.height / 2 + y + h / 2, width: w, height: h, fill: '#3366ff', strokeWidth: 0, ...extra })
        r.objId = 'r' + Math.random().toString(36).slice(2, 8)
        c.add(r); c.requestRenderAll(); return r.objId
      }, x, y, w, h, extra)
    },
    /** punto della scena relativo alla tavola → schermo */
    async at(x, y) { const b = await T.board(); return T.screen(b.left + x, b.top + y) },
    /** clic con eventuali tasti premuti (page.mouse.click non conosce i modificatori) */
    async clickScreen(p, { modifiers = [], clickCount = 1 } = {}) {
      for (const k of modifiers) await page.keyboard.down(k)
      await page.mouse.click(p.x, p.y, { clickCount })
      for (const k of modifiers) await page.keyboard.up(k)
      await page.waitForTimeout(60)
    },
    async click(x, y, opts) { await T.clickScreen(await T.at(x, y), opts) },
    async drag(x1, y1, x2, y2, { steps = 12, keys = [] } = {}) {
      const a = await T.at(x1, y1), b = await T.at(x2, y2)
      await page.mouse.move(a.x, a.y)
      for (const k of keys) await page.keyboard.down(k)
      await page.mouse.down()
      await page.mouse.move(b.x, b.y, { steps })
      await page.mouse.up()
      for (const k of keys) await page.keyboard.up(k)
      await page.waitForTimeout(80)
    },
    /** trascina tra due punti di schermo */
    async dragScreen(a, b, { steps = 12, keys = [] } = {}) {
      await page.mouse.move(a.x, a.y)
      for (const k of keys) await page.keyboard.down(k)
      await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps }); await page.mouse.up()
      for (const k of keys) await page.keyboard.up(k)
      await page.waitForTimeout(80)
    },
    key: async (k) => { await page.keyboard.press(k); await page.waitForTimeout(60) },
    /** seleziona con clic e Maiusc+clic al centro degli oggetti */
    async select(ids) {
      for (let i = 0; i < ids.length; i++) {
        const p = await T.run((c, id) => { const o = c.getObjects().find(o => o.objId === id), q = o.getCenterPoint(), v = c.viewportTransform, r = c.upperCanvasEl.getBoundingClientRect(); return { x: r.left + q.x * v[0] + v[4], y: r.top + q.y * v[3] + v[5] } }, ids[i])
        await T.clickScreen(p, i ? { modifiers: ['Shift'] } : undefined)
      }
    },
    /** il tempo di far entrare l'ultima modifica nella cronologia */
    settle: (ms = 900) => page.waitForTimeout(ms),
    /** posizione di una maniglia di controllo dell'oggetto attivo, in coordinate di schermo */
    control: (name) => T.run((c, name) => {
      const a = c.getActiveObject(); a.setCoords()
      const p = a.oCoords[name], r = c.upperCanvasEl.getBoundingClientRect()
      return { x: r.left + p.x, y: r.top + p.y }
    }, name),
    /** zoom attuale */
    zoom: () => T.run(c => c.getZoom()),
  }
  return T
}
