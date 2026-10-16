/**
 * Copia, incolla, duplica e taglia come in un programma di grafica:
 * con più oggetti selezionati si incollano oggetti separati (mai una
 * ActiveSelection come oggetto della scena), ognuno con un id nuovo e
 * con le proprietà nostre (nomi, effetti, forme vive) conservate.
 */
import * as fabric from 'fabric'
import { SERIAL_PROPS } from '../canvas-serial'

type AnyObj = fabric.FabricObject & { isArtboard?: boolean; objId?: string }

/** passo dello sfalsamento a ogni incolla, in px di scena */
const STEP = 20

export interface Clip { objs: fabric.FabricObject[]; pastes: number }

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'obj_' + Math.random().toString(36).slice(2, 11))

/** gli oggetti selezionati, senza tavole e senza oggetti temporanei */
function picked(canvas: fabric.Canvas) {
  return canvas.getActiveObjects().filter(o => !(o as AnyObj).isArtboard && !o.excludeFromExport)
}

/**
 * Cloni con la trasformazione di scena: dentro una ActiveSelection gli oggetti
 * hanno coordinate relative alla selezione, il clone deve averle assolute.
 */
async function cloneAbsolute(objs: fabric.FabricObject[]) {
  const all = objs[0]?.canvas?.getObjects() ?? []
  const sorted = [...objs].sort((a, b) => all.indexOf(a) - all.indexOf(b))
  return Promise.all(sorted.map(async o => {
    const c = await o.clone(SERIAL_PROPS) as fabric.FabricObject
    if (o.group) fabric.util.applyTransformToObject(c, o.calcTransformMatrix())
    return c
  }))
}

export async function copySelection(canvas: fabric.Canvas): Promise<Clip | null> {
  const objs = picked(canvas)
  if (!objs.length) return null
  return { objs: await cloneAbsolute(objs), pastes: 0 }
}

/** inserisce i cloni sfalsati di `offset` e li seleziona */
async function place(canvas: fabric.Canvas, src: fabric.FabricObject[], offset: number) {
  const fresh = await Promise.all(src.map(o => o.clone(SERIAL_PROPS) as Promise<fabric.FabricObject>))
  canvas.discardActiveObject()
  for (const o of fresh) {
    o.set({ left: o.left + offset, top: o.top + offset, evented: true, selectable: true })
    ;(o as AnyObj).objId = newId()
    o.setCoords()
    canvas.add(o)
  }
  if (fresh.length === 1) canvas.setActiveObject(fresh[0])
  else if (fresh.length > 1) canvas.setActiveObject(new fabric.ActiveSelection(fresh, { canvas }))
  canvas.requestRenderAll()
  return fresh
}

export async function pasteClip(canvas: fabric.Canvas, clip: Clip | null) {
  if (!clip?.objs.length) return []
  clip.pastes++
  return place(canvas, clip.objs, STEP * clip.pastes)
}

export async function duplicateSelection(canvas: fabric.Canvas) {
  const objs = picked(canvas)
  if (!objs.length) return []
  return place(canvas, await cloneAbsolute(objs), STEP)
}

export function deleteSelection(canvas: fabric.Canvas) {
  const objs = canvas.getActiveObjects()
  if (!objs.length) return 0
  canvas.discardActiveObject()
  objs.forEach(o => canvas.remove(o))
  canvas.requestRenderAll()
  return objs.length
}

export async function cutSelection(canvas: fabric.Canvas): Promise<Clip | null> {
  const clip = await copySelection(canvas)
  if (!clip) return null
  // dopo un taglia, il primo incolla torna nello stesso punto
  clip.pastes = -1
  picked(canvas).forEach(o => canvas.remove(o))
  canvas.discardActiveObject()
  canvas.requestRenderAll()
  return clip
}
