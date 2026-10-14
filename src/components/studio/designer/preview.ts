/**
 * Anteprime delle proposte: la scena viene disegnata su un canvas nascosto con
 * lo stesso codice della tavola vera e restituita come miniatura.
 */
import * as fabric from 'fabric'
import type { Scene } from './types'
import { renderScene } from './render'

/** Una alla volta, per non bloccare l'interfaccia. */
let chain: Promise<unknown> = Promise.resolve()

export function renderPreview(sc: Scene, width = 360): Promise<string> {
  const job = async () => {
    await new Promise(r => setTimeout(r, 20))
    const el = document.createElement('canvas')
    const c = new fabric.Canvas(el, { width: sc.w, height: sc.h, renderOnAddRemove: false, selection: false, enableRetinaScaling: false })
    try {
      const ab = new fabric.Rect({ left: sc.w / 2, top: sc.h / 2, width: sc.w, height: sc.h, fill: sc.bg, strokeWidth: 0 })
      ab.set('name', 'anteprima')
      ;(ab as fabric.Rect & { isArtboard?: boolean }).isArtboard = true
      c.add(ab)
      await renderScene(c, ab, sc, 'anteprima')
      c.renderAll()
      return c.toDataURL({ format: 'jpeg', quality: 0.85, multiplier: width / sc.w })
    } finally {
      c.dispose()
    }
  }
  const run = chain.then(job, job)
  chain = run.catch(() => undefined)
  return run
}
