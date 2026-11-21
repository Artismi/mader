/**
 * Il cassetto: le tavole che vale la pena riprendere restano con tutti i loro livelli (non solo l'immagine finale),
 * così un discorso che si allinea tra più giornate può essere rimontato e animato oggetto per oggetto.
 * I livelli si salvano in webp, ridotti a una misura da reel.
 */
import { newCanvas, type Layer, type Sheet } from './sheet'

export interface LivelloSalvato extends Omit<Layer, 'canvas' | 'genera'> { img: string; k: number; genera?: { tool: string; p: Record<string, unknown>; fonte?: string } }
export interface FoglioSalvato { W: number; H: number; bg: string; layers: LivelloSalvato[] }

const riduci = (c: HTMLCanvasElement, lato: number) => {
  const k = Math.min(1, lato / Math.max(c.width, c.height))
  if (k >= 1) return { c, k: 1 }
  const o = newCanvas(Math.max(1, Math.round(c.width * k)), Math.max(1, Math.round(c.height * k)))
  o.getContext('2d')!.drawImage(c, 0, 0, o.width, o.height)
  return { c: o, k }
}

// la materia fine (retini, grane, punti) in webp compresso si impasta: va salvata senza perdite, alla misura del reel
const FINE = /retino|punti|grana|pattern|ornato|caleido|sfasa|duotono|materia|onde/
export function serializza(s: Sheet, lato = 1080): FoglioSalvato {
  return {
    W: s.W, H: s.H, bg: s.bg,
    layers: s.layers.map(l => {
      const { c, k } = riduci(l.canvas, lato)
      const { canvas: _c, genera, ...resto } = l
      void _c
      return {
        ...resto, k, img: c.toDataURL('image/webp', FINE.test(l.kind) || l.blend !== 'source-over' ? 1 : 0.88),
        // il corpo del testo segue la riduzione (serve a capire se si legge)
        meta: l.meta ? { ...l.meta, size: l.meta.size * k } : undefined,
        genera: genera ? { tool: genera.tool, p: genera.p, fonte: genera.fonte ? riduci(genera.fonte, 512).c.toDataURL('image/webp', 0.8) : undefined } : undefined,
      }
    }),
  }
}

const immagine = (url: string) => new Promise<HTMLCanvasElement>((res, rej) => {
  const im = new Image()
  im.onload = () => { const c = newCanvas(im.naturalWidth, im.naturalHeight); c.getContext('2d')!.drawImage(im, 0, 0); res(c) }
  im.onerror = rej
  im.src = url
})

export async function ricostruisci(f: FoglioSalvato): Promise<Sheet> {
  const layers: Layer[] = []
  for (const l of f.layers) {
    const { img, k: _k, genera, ...resto } = l
    void _k
    layers.push({ ...resto, canvas: await immagine(img), genera: genera ? { tool: genera.tool, p: genera.p, fonte: genera.fonte ? await immagine(genera.fonte) : undefined } : undefined } as Layer)
  }
  return { W: f.W, H: f.H, bg: f.bg, layers }
}
