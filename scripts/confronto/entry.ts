/**
 * Pagina del banco di confronto: per ogni brief la migliore tavola del motore
 * designer, come la sceglierebbe lo Studio (vivaio, critico, prima per voto),
 * renderizzata in PNG a piena risoluzione. La guida genera.mjs (Playwright).
 * Usa il motore, non lo modifica.
 */
import * as fabric from 'fabric'
import { proponi, rng, type Knobs } from '@/components/studio/designer/gen'
import { styleById } from '@/components/studio/designer/styles'
import { renderScene } from '@/components/studio/designer/render'
import { FORMAT_SIZE, type DesignContent, type Format, type Scene } from '@/components/studio/designer/types'

/** Direzione del direttore creativo (dalla regia), come in DesignPanel. */
interface Direzione { sistema: Knobs['sistema']; stile: string; trattamento: Knobs['trattamento']; inverti: boolean; regolatori: Record<'scala' | 'energia' | 'densita' | 'sovrastampa' | 'grana', [number, number]> }

export interface Job { content: DesignContent; format: Format; photo?: string; direzioni?: Direzione[]; enfasi?: string; n?: number; seme?: number }

/** Regolatori dentro gli intervalli del direttore: la stessa regola di DesignPanel. */
function knobsFrom(d: Direzione, seed: number, enfasi?: string): Knobs {
  const r = rng(seed)
  const pick = ([lo, hi]: [number, number]) => lo + (hi - lo) * r.next()
  return {
    sistema: d.sistema, stile: d.stile, trattamento: d.trattamento, inverti: d.inverti,
    scala: pick(d.regolatori.scala), energia: pick(d.regolatori.energia), densita: pick(d.regolatori.densita),
    sovrastampa: pick(d.regolatori.sovrastampa), grana: pick(d.regolatori.grana), seme: r.int(1, 99999), enfasi,
  }
}

async function png(sc: Scene) {
  const el = document.createElement('canvas')
  const cv = new fabric.Canvas(el, { width: sc.w, height: sc.h, renderOnAddRemove: false, enableRetinaScaling: false })
  const ab = new fabric.Rect({ left: sc.w / 2, top: sc.h / 2, width: sc.w, height: sc.h, fill: '#fff', strokeWidth: 0 })
  ab.set('name', 'tavola'); (ab as fabric.Rect & { isArtboard?: boolean }).isArtboard = true
  cv.add(ab)
  await renderScene(cv, ab, sc, 'prova')
  cv.renderAll()
  const url = cv.toDataURL({ format: 'png', multiplier: 1 })
  cv.dispose()
  return url
}

/** La migliore tavola: le proposte dello Studio sono già in ordine di voto del critico. */
async function migliore(job: Job) {
  ;(globalThis as { __designerSink?: string[] }).__designerSink = []
  const ks = (job.direzioni ?? []).flatMap((d, i) => [0, 1, 2, 3].map(j => knobsFrom(d, 1000 + i * 97 + j * 7919, job.enfasi)))
  const p = await proponi(job.content, job.format, { photo: job.photo, n: job.n ?? 12, knobs: ks.length ? ks : undefined, seme: job.seme ?? 0 })
  const sc = p.scene[0]
  if (!sc) return null
  const k = sc.knobs as Knobs
  return {
    url: await png({ ...sc, knobs: { ...sc.knobs, enfasi: job.enfasi ?? k.enfasi } }),
    sistema: k.sistema, stile: styleById(k.stile).name, voto: sc.esame?.voto ?? null, promossa: sc.esame?.promossa ?? null,
    candidate: p.candidate, promosse: p.promosse,
  }
}

/** Concorrente finto per provare il banco: titolo centrato su fondo pieno, niente di più. */
async function finta(job: { content: DesignContent; format: Format; colore?: string }) {
  const [w, h] = FORMAT_SIZE[job.format]
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const c = cv.getContext('2d')!
  c.fillStyle = job.colore ?? '#2f4f6f'; c.fillRect(0, 0, w, h)
  c.fillStyle = '#fff'; c.textAlign = 'center'
  const righe = (testo: string, max: number) => {
    const out: string[] = []; let r = ''
    for (const p of testo.split(' ')) { if (c.measureText(`${r} ${p}`).width > max && r) { out.push(r); r = p } else r = r ? `${r} ${p}` : p }
    return r ? [...out, r] : out
  }
  c.font = '700 84px Arial, sans-serif'
  const t = righe(job.content.title, w * 0.8)
  t.forEach((r, i) => c.fillText(r, w / 2, h * 0.42 + (i - (t.length - 1) / 2) * 96))
  c.font = '400 36px Arial, sans-serif'
  righe(job.content.body ?? '', w * 0.75).forEach((r, i) => c.fillText(r, w / 2, h * 0.42 + t.length * 60 + 60 + i * 46))
  c.font = '600 30px Arial, sans-serif'
  c.fillText(job.content.brand ?? '', w / 2, h - 90)
  return cv.toDataURL('image/png')
}

;(window as unknown as { confronto: unknown }).confronto = { migliore, finta }
