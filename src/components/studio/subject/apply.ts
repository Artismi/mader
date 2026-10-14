/**
 * Dal soggetto selezionato a una nuova immagine generata.
 * - testi, forme, PNG scontornati: la sagoma è la loro trasparenza
 * - foto piene: lo scontorno locale (U²-Net); se il modello non c'è, una maschera
 *   dal contrasto con il colore dei bordi
 * Il risultato va sopra l'originale, con la stessa posizione e rotazione;
 * l'originale resta (si può nascondere o cancellare).
 */
import * as fabric from 'fabric'
import { GENERATORS, prepare, type GenParams, type GeneratorId } from './generators'

async function photoMask(src: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  try {
    const { subjectMask } = await import('../compose/cutout')
    return await subjectMask(src)
  } catch {
    // ripiego: ciò che si stacca dal colore medio dei bordi è il soggetto
    const w = src.width, h = src.height, x = src.getContext('2d', { willReadFrequently: true })!
    const d = x.getImageData(0, 0, w, h).data
    let r = 0, g = 0, b = 0, n = 0
    const add = (i: number) => { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++ }
    for (let i = 0; i < w; i++) { add(i * 4); add(((h - 1) * w + i) * 4) }
    for (let j = 0; j < h; j++) { add(j * w * 4); add((j * w + w - 1) * 4) }
    r /= n; g /= n; b /= n
    const m = document.createElement('canvas'); m.width = w; m.height = h
    const mx = m.getContext('2d')!, md = mx.createImageData(w, h)
    for (let i = 0; i < w * h; i++) {
      const dd = Math.hypot(d[i * 4] - r, d[i * 4 + 1] - g, d[i * 4 + 2] - b) / 255
      md.data[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, (dd - 0.12) / 0.2)) * 255)
    }
    mx.putImageData(md, 0, 0)
    return m
  }
}

function opaque(c: HTMLCanvasElement) {
  const x = c.getContext('2d', { willReadFrequently: true })!
  const d = x.getImageData(0, 0, c.width, c.height).data
  for (let i = 3; i < d.length; i += 4 * 97) if (d[i] < 250) return false
  return true
}

/** Applica un generatore all'oggetto: restituisce la nuova immagine o un messaggio. */
export async function applyGenerator(canvas: fabric.Canvas, o: fabric.FabricObject, id: GeneratorId, params: GenParams & { keepOriginal?: boolean } = {}): Promise<fabric.FabricImage | string> {
  const gen = GENERATORS[id]
  if (!gen) return `Generatore "${id}" sconosciuto`
  if ((o as fabric.FabricObject & { isArtboard?: boolean }).isArtboard) return 'Seleziona un soggetto, non la tavola'
  // il soggetto senza trasformazioni, a buona risoluzione
  const longSide = Math.max(o.width, o.height) || 1
  const mult = Math.min(3, 1100 / longSide)
  const src = o.toCanvasElement({ multiplier: mult, withoutTransform: true, withoutShadow: true })
  const mask = o instanceof fabric.FabricImage && opaque(src) ? await photoMask(src) : src
  const S = prepare(src, mask, 900)
  const out = gen.run(S, params)
  const img = new fabric.FabricImage(out)
  // stessa misura a schermo dell'originale
  const k = src.width / out.width / mult
  img.set({ angle: o.angle, flipX: o.flipX, flipY: o.flipY, scaleX: o.scaleX * k, scaleY: o.scaleY * k })
  img.setPositionByOrigin(o.getCenterPoint(), 'center', 'center')
  img.set('name', `${String(o.get('name') ?? 'soggetto')}_${id}`)
  canvas.insertAt(canvas.getObjects().indexOf(o) + 1, img)
  // l'originale resta, nascosto, per poterlo rigenerare o riprendere
  if (params.keepOriginal !== true) { o.set('visible', false); canvas.fire('object:modified', { target: o }) }
  img.setCoords()
  canvas.setActiveObject(img)
  canvas.fire('object:modified', { target: img })
  canvas.requestRenderAll()
  return img
}
