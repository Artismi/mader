/**
 * Testo curvo (come "Curva" di Canva / "Arco" di Illustrator): il testo segue
 * un arco di cerchio lungo esattamente quanto la riga, quindi resta centrato e
 * non si deforma. Usa il testo-su-tracciato nativo di Fabric: la scritta resta
 * modificabile, con font, colori ed effetti.
 *
 * curve  > 0  arco verso l'alto (∩), < 0 verso il basso (∪); ±100 ≈ cerchio quasi chiuso.
 */
import * as fabric from 'fabric'
import { SERIAL_PROPS } from '../canvas-serial'

type CurvedText = fabric.FabricText & { textCurve?: number; textCurveWidth?: number; textCurveAlign?: string }

export const isText = (o?: fabric.FabricObject | null): o is fabric.FabricText =>
  !!o && (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text')

export const getTextCurve = (o?: fabric.FabricObject | null) => (isText(o) ? (o as CurvedText).textCurve ?? 0 : 0)

/** Larghezza della riga più lunga, misurata senza tracciato. */
function lineWidth(t: fabric.FabricText) {
  t.set({ path: undefined })
  t.initDimensions()
  let w = 0
  for (let i = 0; i < t._textLines.length; i++) w = Math.max(w, t.getLineWidth(i))
  return w
}

function arcPath(len: number, curve: number, margin: number) {
  const sweep = (Math.abs(curve) / 100) * Math.PI * 1.9
  const R = len / sweep
  const up = curve > 0
  // ∩: da sinistra a destra sulla parte alta, in senso orario (lettere verso l'esterno)
  // ∪: da sinistra a destra sulla parte bassa, in senso antiorario
  const mid = up ? -Math.PI / 2 : Math.PI / 2
  const a0 = up ? mid - sweep / 2 : mid + sweep / 2
  const a1 = up ? mid + sweep / 2 : mid - sweep / 2
  const am = mid
  const pt = (a: number) => `${(Math.cos(a) * R).toFixed(2)} ${(Math.sin(a) * R).toFixed(2)}`
  const flag = up ? 1 : 0
  // il riquadro dell'oggetto è quello del tracciato: senza margine le lettere
  // alle estremità uscirebbero e verrebbero tagliate. Due segmenti finali di lunghezza zero (
  // non spostano il testo) allargano il riquadro alla corona occupata dalle lettere.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let i = 0; i <= 48; i++) {
    const a = a0 + ((a1 - a0) * i) / 48
    for (const r of [Math.max(0, R - margin), R + margin]) {
      const x = Math.cos(a) * r, y = Math.sin(a) * r
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
    }
  }
  const box = `M ${x0.toFixed(2)} ${y0.toFixed(2)} L ${x0.toFixed(2)} ${y0.toFixed(2)} M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)}`
  // due mezzi archi: un solo comando A non supera i 180° in modo affidabile
  return `M ${pt(a0)} A ${R.toFixed(2)} ${R.toFixed(2)} 0 0 ${flag} ${pt(am)} A ${R.toFixed(2)} ${R.toFixed(2)} 0 0 ${flag} ${pt(a1)} ${box}`
}

/** Disegna l'arco su un testo a riga libera (IText/Text), tenendo fermo il centro. */
function bend(t: fabric.FabricText, k: number) {
  const center = t.getCenterPoint()
  const ct = t as CurvedText
  // sull'arco l'allineamento non ha senso (l'arco è lungo quanto la riga) e con
  // "centro"/"destra" Fabric sposta le lettere lungo il tracciato: si tiene a sinistra
  // e si ripristina quello scelto quando la curva si toglie
  if (k !== 0 && !ct.textCurve && t.textAlign !== 'left') { ct.textCurveAlign = t.textAlign; t.set({ textAlign: 'left' }) }
  ct.textCurve = k
  if (k === 0) {
    t.set({ path: undefined })
    if (ct.textCurveAlign) { t.set({ textAlign: ct.textCurveAlign }); ct.textCurveAlign = undefined }
  } else {
    const path = new fabric.Path(arcPath(lineWidth(t), k, (t.fontSize ?? 40) * 1.15), { visible: false, fill: '', stroke: '' })
    // ∪: l'arco passa sulla cima delle lettere, così si aprono verso l'esterno invece di accalcarsi
    t.set({ path, pathSide: 'left', pathAlign: k > 0 ? 'baseline' : 'ascender', pathStartOffset: 0 })
  }
  t.initDimensions()
  t.setPositionByOrigin(center, 'center', 'center')
  t.setCoords()
  t.dirty = true
}

/** Ricrea il testo come altro tipo (Textbox ⇄ IText) con tutte le proprietà, anche le nostre. */
async function retype(canvas: fabric.Canvas, t: fabric.FabricText, type: 'i-text' | 'textbox', extra: Record<string, unknown> = {}) {
  const data = { ...t.toObject(SERIAL_PROPS as never[]), type, ...extra }
  const Cls = type === 'textbox' ? fabric.Textbox : fabric.IText
  const next = (await Cls.fromObject(data as never)) as fabric.FabricText
  const at = canvas.getObjects().indexOf(t)
  const wasActive = canvas.getActiveObject() === t
  canvas.remove(t)
  canvas.insertAt(Math.max(0, at), next)
  if (wasActive) canvas.setActiveObject(next)
  return next
}

/**
 * Applica (o toglie, con 0) la curvatura. Un Textbox va a capo da solo e Fabric non
 * ne calcola il riquadro sul tracciato: finché è curvo diventa un testo a riga libera
 * (IText) e torna Textbox, con la larghezza di prima, quando la curva si azzera.
 * Restituisce l'oggetto finale (può essere uno nuovo).
 */
export async function applyTextCurve(canvas: fabric.Canvas, t: fabric.FabricText, curve: number) {
  const k = Math.max(-100, Math.min(100, Math.round(curve)))
  const ct = t as CurvedText
  let obj = t
  if (k !== 0 && t.type === 'textbox') {
    obj = await retype(canvas, t, 'i-text', { textCurveWidth: t.width, path: undefined })
  } else if (k === 0 && t.type === 'i-text' && ct.textCurveWidth) {
    bend(t, 0)
    obj = await retype(canvas, t, 'textbox', { width: ct.textCurveWidth, textCurveWidth: undefined, path: undefined })
  }
  bend(obj, k)
  canvas.fire('object:modified', { target: obj })
  canvas.requestRenderAll()
  return obj
}

/**
 * Tiene l'arco della lunghezza giusta mentre si scrive o si cambia carattere/corpo.
 * Restituisce la funzione per staccare gli ascoltatori.
 */
export function installTextCurve(canvas: fabric.Canvas) {
  const refresh = (e: { target?: fabric.FabricObject }) => {
    const t = e.target
    if (!isText(t) || !(t as CurvedText).textCurve) return
    bend(t, (t as CurvedText).textCurve!)
    canvas.requestRenderAll()
  }
  canvas.on('text:changed', refresh)
  canvas.on('object:modified', refresh)
  return () => { canvas.off('text:changed', refresh); canvas.off('object:modified', refresh) }
}
