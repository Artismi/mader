/**
 * Rete di sicurezza per le tavole generate dall'IA: qualunque modello le abbia
 * scritte (anche uno piccolo e gratuito), dopo la generazione tutto torna dentro
 * la tavola e leggibile.
 *
 * - coordinate dell'IA = angolo in alto a sinistra della tavola (come Figma)
 * - testi: larghezza entro i margini, parole lunghe e testi troppo alti rimpiccioliti
 * - bottoni (rettangolo + testo sopra): testo centrato, rettangolo largo quanto serve
 * - blocchi (testi e bottoni) che si sovrappongono: quello sotto scende
 * - nulla esce dalla tavola; le forme decorative trasparenti possono uscire dal bordo
 */
import * as fabric from 'fabric'
import { childrenOf } from '../arrange/artboards'

type Box = { l: number; t: number; r: number; b: number }

/** Angolo in alto a sinistra della tavola, in coordinate di scena. */
export function boardTopLeft(ab: fabric.FabricObject) {
  const c = ab.getCenterPoint()
  return new fabric.Point(c.x - ab.getScaledWidth() / 2 + ab.strokeWidth / 2, c.y - ab.getScaledHeight() / 2 + ab.strokeWidth / 2)
}

/** Mette l'angolo in alto a sinistra di `o` in (x,y) relativi alla tavola. */
export function placeInBoard(o: fabric.FabricObject, ab: fabric.FabricObject, x: number, y: number) {
  const tl = boardTopLeft(ab)
  o.setPositionByOrigin(new fabric.Point(tl.x + x, tl.y + y), 'left', 'top')
  o.setCoords()
}

const isText = (o: fabric.FabricObject): o is fabric.Textbox => o instanceof fabric.FabricText
const boxOf = (o: fabric.FabricObject): Box => { o.setCoords(); const r = o.getBoundingRect(); return { l: r.left, t: r.top, r: r.left + r.width, b: r.top + r.height } }
const area = (b: Box) => Math.max(0, b.r - b.l) * Math.max(0, b.b - b.t)
const inter = (a: Box, b: Box): Box => ({ l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) })
const move = (o: fabric.FabricObject, dx: number, dy: number) => { if (!dx && !dy) return; o.set({ left: o.left + dx, top: o.top + dy }); o.setCoords() }

/** Riga più larga di un testo (in px di scena). */
function widestLine(t: fabric.Textbox) {
  t.initDimensions()
  let w = 0
  for (let i = 0; i < t._textLines.length; i++) w = Math.max(w, t.getLineWidth(i))
  return w * Math.abs(t.scaleX)
}

/** Il testo sta in `maxW` px: prima va a capo, poi (parole lunghe) si rimpicciolisce. */
function fitTextWidth(t: fabric.Textbox, maxW: number, minSize: number) {
  const s = Math.abs(t.scaleX) || 1
  if (t.width * s > maxW) t.set('width', maxW / s)
  if (t instanceof fabric.Textbox) {
    for (let i = 0; i < 12 && widestLine(t) > maxW + 0.5 && t.fontSize > minSize; i++)
      t.set('fontSize', Math.max(minSize, t.fontSize * Math.min(0.95, maxW / widestLine(t))))
  }
  t.initDimensions()
  t.setCoords()
}

interface Block { items: fabric.FabricObject[]; box: Box; text?: fabric.Textbox }

/**
 * Sistema la tavola. `bleed` = forme decorative che possono uscire dal bordo
 * (opacità bassa o molto grandi, come i glifi di sfondo).
 */
export function fitBoard(canvas: fabric.Canvas, ab: fabric.FabricObject) {
  const tl = boardTopLeft(ab)
  const W = ab.getScaledWidth(), H = ab.getScaledHeight()
  const B: Box = { l: tl.x, t: tl.y, r: tl.x + W, b: tl.y + H }
  const m = Math.round(Math.min(W, H) * 0.06)
  const inner: Box = { l: B.l + m, t: B.t + m, r: B.r - m, b: B.b - m }
  const minSize = Math.max(12, Math.round(Math.min(W, H) / 70))

  const kids = childrenOf(canvas, ab).filter(o => o.visible !== false)
  const isBackground = (o: fabric.FabricObject) => !isText(o) && area(inter(boxOf(o), B)) > W * H * 0.85
  const isDecor = (o: fabric.FabricObject) => !isText(o) && !isBackground(o) && ((o.opacity ?? 1) < 0.5 || area(boxOf(o)) > W * H * 0.3)
  const texts = kids.filter(isText) as fabric.Textbox[]
  const solids = kids.filter(o => !isText(o) && !isBackground(o) && !isDecor(o))

  // 1. testi entro la larghezza utile
  for (const t of texts) fitTextWidth(t, inner.r - inner.l, minSize)

  // 2. bottoni: un rettangolo piccolo con un testo che ci sta sopra (anche solo in parte)
  const blocks: Block[] = []
  const used = new Set<fabric.FabricObject>()
  for (const r of solids) {
    if (!(r instanceof fabric.Rect) || area(boxOf(r)) > W * H * 0.2) continue
    const rb = boxOf(r)
    const t = texts.find(x => !used.has(x) && area(inter(boxOf(x), rb)) > 0.3 * Math.min(area(boxOf(x)), area(rb)))
    if (!t) continue
    used.add(r); used.add(t)
    // il testo su una riga, centrato; il rettangolo lo contiene con un margine
    t.set({ textAlign: 'center' })
    const padX = Math.max(24, t.fontSize * 1.2), padY = Math.max(12, t.fontSize * 0.6)
    t.set('width', Math.min(inner.r - inner.l - 2 * padX, Math.max(widestLineSingle(t), 10)))
    fitTextWidth(t, inner.r - inner.l - 2 * padX, minSize)
    const tb = boxOf(t)
    const needW = tb.r - tb.l + 2 * padX, needH = tb.b - tb.t + 2 * padY
    const sx = Math.abs(r.scaleX) || 1, sy = Math.abs(r.scaleY) || 1
    const cur = boxOf(r)
    if (cur.r - cur.l < needW) r.set('width', needW / sx)
    if (cur.b - cur.t < needH) r.set('height', needH / sy)
    if (r.rx) { const k = Math.min(r.rx, (r.height * sy) / 2); r.set({ rx: k, ry: k }) }
    r.setCoords()
    const c = r.getCenterPoint()
    t.setPositionByOrigin(c, 'center', 'center'); t.setCoords()
    blocks.push({ items: [r, t], box: boxOf(r) })
  }
  for (const t of texts) if (!used.has(t)) blocks.push({ items: [t], box: boxOf(t), text: t })
  for (const o of solids) if (!used.has(o)) blocks.push({ items: [o], box: boxOf(o) })

  const refresh = (bl: Block) => { bl.box = bl.items.map(boxOf).reduce((a, b) => ({ l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) })) }
  const shift = (bl: Block, dx: number, dy: number) => { bl.items.forEach(o => move(o, dx, dy)); refresh(bl) }

  // 3. dentro i margini in orizzontale (e rimpicciolite le forme troppo grandi)
  for (const bl of blocks) {
    const w = bl.box.r - bl.box.l
    if (!bl.text && bl.items.length === 1 && w > inner.r - inner.l) {
      const o = bl.items[0], k = (inner.r - inner.l) / w
      o.set({ scaleX: o.scaleX * k, scaleY: o.scaleY * k }); o.setCoords(); refresh(bl)
    }
    if (bl.box.l < inner.l) shift(bl, inner.l - bl.box.l, 0)
    else if (bl.box.r > inner.r) shift(bl, inner.r - bl.box.r, 0)
  }

  // 4. sovrapposizioni: dall'alto in basso, chi si sovrappone scende sotto
  blocks.sort((a, b) => a.box.t - b.box.t)
  for (let i = 0; i < blocks.length; i++) for (let j = 0; j < i; j++) {
    const a = blocks[j], b = blocks[i], x = inter(a.box, b.box)
    if (x.r - x.l <= 2 || x.b - x.t <= 2) continue
    const gap = Math.round((a.text?.fontSize ?? b.text?.fontSize ?? 24) * 0.5)
    shift(b, 0, a.box.b + gap - b.box.t)
  }

  // 5. in verticale: se il contenuto esce sotto, prima sale, poi i testi si rimpiccioliscono
  const bottom = () => Math.max(...blocks.map(b => b.box.b), -Infinity)
  const top = () => Math.min(...blocks.map(b => b.box.t), Infinity)
  for (let pass = 0; pass < 8 && blocks.length && bottom() > inner.b; pass++) {
    const over = bottom() - inner.b, room = Math.max(0, top() - inner.t)
    if (room > 0) { const d = Math.min(room, over); blocks.forEach(b => shift(b, 0, -d)); continue }
    // stringe: testi più piccoli del 10% e spazi ricalcolati
    for (const t of texts) { t.set('fontSize', Math.max(minSize, t.fontSize * 0.9)); t.initDimensions(); t.setCoords() }
    blocks.forEach(refresh)
    blocks.sort((a, b) => a.box.t - b.box.t)
    for (let i = 1; i < blocks.length; i++) {
      const prev = blocks[i - 1], b = blocks[i], x = inter(prev.box, b.box)
      if (x.r - x.l > 2 && x.b - x.t > 2) shift(b, 0, prev.box.b + 8 - b.box.t)
    }
  }
  for (const bl of blocks) if (bl.box.t < inner.t) shift(bl, 0, inner.t - bl.box.t)

  // 6. le forme decorative restano almeno in parte sulla tavola
  for (const o of kids.filter(isDecor)) {
    const b = boxOf(o)
    if (area(inter(b, B)) < area(b) * 0.25) {
      const dx = b.r < B.l + (b.r - b.l) * 0.5 ? B.l - b.l : b.l > B.r - (b.r - b.l) * 0.5 ? B.r - b.r : 0
      const dy = b.b < B.t + (b.b - b.t) * 0.5 ? B.t - b.t : b.t > B.b - (b.b - b.t) * 0.5 ? B.b - b.b : 0
      move(o, dx, dy)
    }
  }
  canvas.requestRenderAll()
}

/** Larghezza della riga più larga se il testo stesse su una riga sola. */
function widestLineSingle(t: fabric.Textbox) {
  const saved = t.width
  t.set('width', 100000); t.initDimensions()
  const w = widestLine(t)
  t.set('width', saved); t.initDimensions()
  return w / (Math.abs(t.scaleX) || 1) + 2
}
