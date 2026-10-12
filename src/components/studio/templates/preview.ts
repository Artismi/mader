/**
 * Anteprime delle proposte: ogni template viene impaginato su un canvas nascosto,
 * con lo stesso motore della tavola vera (impaginazione, effetti, visual,
 * finiture), e restituito come miniatura.
 */
import * as fabric from 'fabric'
import type { ComposeBoard } from '@/lib/design/compose-spec'
import { boardSize, composeBoard } from '../compose/compose'
import { applyFinish } from '../ai/finish'
import { buildVisual, type VisualSpec } from '../ai/visual'
import { resolvePhoto } from '../ai/photos'

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Una alla volta: il motore effetti usa un solo contesto WebGL. */
let chain: Promise<unknown> = Promise.resolve()

export function renderPreview(board: ComposeBoard, width = 360): Promise<string> {
  const job = async () => {
    const b: ComposeBoard = JSON.parse(JSON.stringify(board))
    await resolvePhoto(b)
    // a metà misura: la composizione è proporzionale, e l'anteprima costa un quarto
    const full = boardSize(b)
    b.width = Math.round(full.w / 2); b.height = Math.round(full.h / 2)
    if (b.visual) b.visual = { ...b.visual, ...(b.visual.size ? { size: b.visual.size / 2 } : {}), ...(b.visual.x !== undefined ? { x: b.visual.x / 2 } : {}), ...(b.visual.y !== undefined ? { y: b.visual.y / 2 } : {}) }
    await wait(30) // si lascia respirare l'interfaccia tra un'anteprima e l'altra
    const { w, h } = boardSize(b)
    const el = document.createElement('canvas')
    const c = new fabric.Canvas(el, { width: w, height: h, renderOnAddRemove: false, selection: false, enableRetinaScaling: false })
    try {
      const ab = new fabric.Rect({ left: w / 2, top: h / 2, width: w, height: h, fill: '#ffffff', strokeWidth: 0 })
      ;(ab as fabric.Rect & { isArtboard?: boolean }).isArtboard = true
      ab.set('name', 'anteprima')
      c.add(ab)
      await composeBoard(c, ab, b, 0, 1)
      if (b.finish?.length) await applyFinish(c, ab, b.finish, `${b.content.title}|${b.recipe ?? b.style}|0`)
      if (b.visual?.source) await buildVisual(c, ab, { ...b.visual, arrangement: b.visual.arrangement as VisualSpec['arrangement'], seed: `${b.content.title}|0` })
      // le foto arrivano dopo: si aspetta un poco se ce n'è una
      await wait(b.content.image?.url ? 2500 : 250)
      c.renderAll()
      return c.toDataURL({ format: 'jpeg', quality: 0.85, multiplier: width / w, left: 0, top: 0, width: w, height: h })
    } finally {
      c.dispose()
    }
  }
  const run = chain.then(job, job)
  chain = run.catch(() => undefined)
  return run
}
