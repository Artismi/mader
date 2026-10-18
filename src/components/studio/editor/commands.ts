/**
 * Comandi di base da programma di grafica, tutti annullabili:
 * capovolgi, blocca, nascondi, zoom da tastiera, grassetto e corsivo.
 * Ogni modifica finisce con un `object:modified`, così cronologia,
 * salvataggio automatico e pannelli si aggiornano.
 */
import * as fabric from 'fabric'

type AnyObj = fabric.FabricObject & { isArtboard?: boolean }

function modified(canvas: fabric.Canvas, objs: fabric.FabricObject[]) {
  objs.forEach(o => canvas.fire('object:modified', { target: o }))
  canvas.requestRenderAll()
}

/** Maiusc+H / Maiusc+V: capovolge ogni oggetto selezionato attorno al centro della selezione */
export function flipSelection(canvas: fabric.Canvas, axis: 'x' | 'y') {
  const active = canvas.getActiveObject()
  if (!active) return
  const key = axis === 'x' ? 'flipX' : 'flipY'
  if (active instanceof fabric.ActiveSelection) {
    // la selezione intera si specchia: posizioni rispecchiate, ogni oggetto capovolto
    active.set(key, !active[key]); active.setCoords()
  } else active.set(key, !active[key])
  modified(canvas, [active])
}

const lockProps = (lock: boolean) => ({
  lockMovementX: lock, lockMovementY: lock, lockScalingX: lock, lockScalingY: lock, lockRotation: lock,
  selectable: !lock, evented: !lock, hasControls: !lock,
})

/** Ctrl+Maiusc+L: blocca la selezione (non si seleziona più col mouse; si sblocca dai livelli) */
export function lockSelection(canvas: fabric.Canvas) {
  const objs = canvas.getActiveObjects().filter(o => !(o as AnyObj).isArtboard)
  if (!objs.length) return 0
  canvas.discardActiveObject()
  objs.forEach(o => o.set(lockProps(true)))
  modified(canvas, objs)
  return objs.length
}

export function setLocked(canvas: fabric.Canvas, o: fabric.FabricObject, lock: boolean) {
  if (lock && canvas.getActiveObjects().includes(o)) canvas.discardActiveObject()
  o.set(lockProps(lock))
  modified(canvas, [o])
}

/** Ctrl+Maiusc+H: nasconde la selezione (si rivede dai livelli) */
export function hideSelection(canvas: fabric.Canvas) {
  const objs = canvas.getActiveObjects().filter(o => !(o as AnyObj).isArtboard)
  if (!objs.length) return 0
  canvas.discardActiveObject()
  objs.forEach(o => o.set('visible', false))
  modified(canvas, objs)
  return objs.length
}

export function setVisible(canvas: fabric.Canvas, o: fabric.FabricObject, visible: boolean) {
  if (!visible && canvas.getActiveObjects().includes(o)) canvas.discardActiveObject()
  o.set('visible', visible)
  modified(canvas, [o])
}

/** zoom attorno al centro della vista, nei limiti della rotella (5%–2000%) */
export function zoomTo(canvas: fabric.Canvas, z: number) {
  const zz = Math.max(0.05, Math.min(20, z))
  canvas.zoomToPoint(new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2), zz)
  canvas.requestRenderAll()
  return zz
}
export const zoomBy = (canvas: fabric.Canvas, f: number) => zoomTo(canvas, canvas.getZoom() * f)

type TextLike = fabric.IText & { isEditing?: boolean }
const isText = (o?: fabric.FabricObject | null): o is TextLike => !!o && (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text')

/**
 * Ctrl+B / Ctrl+I / Ctrl+U: sul testo selezionato cambia tutto il blocco,
 * mentre si scrive cambia solo le lettere selezionate.
 */
export function toggleTextStyle(canvas: fabric.Canvas, style: 'bold' | 'italic' | 'underline') {
  const t = canvas.getActiveObject()
  if (!isText(t)) return false
  const [prop, on, off] = style === 'bold' ? ['fontWeight', 'bold', 'normal'] as const
    : style === 'italic' ? ['fontStyle', 'italic', 'normal'] as const
    : ['underline', true, false] as const
  const isOn = (v: unknown) => style === 'bold' ? (v === 'bold' || Number(v) >= 600) : v === on
  if (t.isEditing && t.selectionStart !== t.selectionEnd) {
    const cur = t.getSelectionStyles(t.selectionStart, t.selectionEnd)
    const all = cur.length > 0 && cur.every(s => isOn(s[prop] ?? t[prop]))
    t.setSelectionStyles({ [prop]: all ? off : on }, t.selectionStart, t.selectionEnd)
  } else {
    t.set(prop, isOn(t[prop]) ? off : on)
  }
  t.initDimensions?.()
  t.setCoords()
  modified(canvas, [t])
  return true
}
