/**
 * Anteprime delle proposte: la scena viene disegnata su un canvas nascosto con
 * lo stesso codice della tavola vera e restituita come miniatura.
 */
import * as fabric from 'fabric'
import type { Scene } from './types'
import { renderScene } from './render'
import { lumHex } from './gen/pixel'

const contrastoHex = (a: string, b: string) => { const x = lumHex(a), y = lumHex(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

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

/**
 * La tavola renderizzata senza i testi veri (resta tutto il resto: foto, effetti,
 * texture, campi, veli), ridotta a `lato` pixel di larghezza: i pixel su cui
 * `gen/pixel.ts` misura il contrasto reale di ogni riga.
 */
export async function sfondoPixel(sc: Scene, lato = 540): Promise<{ w: number; h: number; data: Uint8ClampedArray }> {
  const el = document.createElement('canvas')
  const c = new fabric.Canvas(el, { width: sc.w, height: sc.h, renderOnAddRemove: false, selection: false, enableRetinaScaling: false })
  try {
    const ab = new fabric.Rect({ left: sc.w / 2, top: sc.h / 2, width: sc.w, height: sc.h, fill: sc.bg, strokeWidth: 0 })
    ab.set('name', 'sfondo')
    ;(ab as fabric.Rect & { isArtboard?: boolean }).isArtboard = true
    c.add(ab)
    // via i testi veri e le loro copie di colore simile (ombre ed echi spostati, che l'occhio separa dal testo);
    // restano le copie ferme e in contrasto (aloni) e la tipografia decorativa
    const veri = sc.els.filter((e): e is Extract<Scene['els'][number], { kind: 'text' }> => e.kind === 'text' && !e.deco)
    const copia = (e: Scene['els'][number]) => e.kind === 'text' && e.deco && e.color.startsWith('#') && veri.some(v => e.lines.every(l => v.lines.includes(l)) && v.color.startsWith('#') && (Math.hypot(e.x - v.x, e.y - v.y) > 0.5 || contrastoHex(v.color, e.color) < 2))
    await renderScene(c, ab, { ...sc, els: sc.els.filter(e => (e.kind !== 'text' || e.deco) && !copia(e)) }, 'sfondo')
    c.renderAll()
    const cv = c.toCanvasElement(lato / sc.w)
    const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height)
    return { w: d.width, h: d.height, data: d.data }
  } finally {
    c.dispose()
  }
}
