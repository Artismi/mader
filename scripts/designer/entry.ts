/**
 * Pagina del banco di prova: genera le tavole con il motore vero e le
 * renderizza con Fabric e il motore effetti, come nello Studio. La guida
 * vetrina.mjs (Playwright).
 */
import * as fabric from 'fabric'
import { generateSystem, proposeKnobs, proponi, tintaFoto, SYSTEMS, type Knobs } from '@/components/studio/designer/gen'
import { styleById } from '@/components/studio/designer/styles'
import { renderScene } from '@/components/studio/designer/render'
import type { DesignContent, Format, Scene } from '@/components/studio/designer/types'
import { MOTIVI } from '@/components/studio/designer/progetto/vocabolario'
import { ripiego } from '@/components/studio/designer/progetto/specifica'

export interface Job { content: DesignContent; format: Format; photo?: string; over?: Partial<Knobs>; sistemi?: Knobs['sistema'][]; thumb: number }
export interface Result { sistema: string; ok: boolean; ms: number; url?: string; knobs: Knobs; reasons: string[]; layout?: string; stile?: string; registro?: string; esame?: Scene['esame'] }

async function draw(sc: Scene, thumb: number) {
  const el = document.createElement('canvas')
  const cv = new fabric.Canvas(el, { width: sc.w, height: sc.h, renderOnAddRemove: false, enableRetinaScaling: false })
  const ab = new fabric.Rect({ left: sc.w / 2, top: sc.h / 2, width: sc.w, height: sc.h, fill: '#fff', strokeWidth: 0 })
  ab.set('name', 'tavola'); (ab as fabric.Rect & { isArtboard?: boolean }).isArtboard = true
  cv.add(ab)
  await renderScene(cv, ab, sc, 'prova')
  cv.renderAll()
  const url = cv.toDataURL({ format: 'jpeg', quality: 0.86, multiplier: thumb })
  cv.dispose()
  return url
}

async function run(job: Job): Promise<Result[]> {
  const sink: string[] = []
  ;(globalThis as { __designerSink?: string[] }).__designerSink = sink
  const tinta = await tintaFoto(job.photo)
  const ks = proposeKnobs(job.content, { hasPhoto: !!job.photo, styleId: job.over?.stile, sistemi: job.sistemi, tinta, seme: (job as { seme?: number }).seme })
  const out: Result[] = []
  // primo: solo la prima identità (un esemplare per sistema), per confronti a parità di regolatori
  for (const k0 of (job as { primo?: boolean }).primo ? ks.slice(0, job.sistemi?.length ?? ks.length) : ks) {
    const k = { ...k0, ...job.over }
    sink.length = 0
    const t0 = performance.now()
    const sc = await generateSystem(job.content, job.format, k, job.photo)
    const reasons = [...new Set(sink)]
    if (!sc) { out.push({ sistema: k.sistema, ok: false, ms: Math.round(performance.now() - t0), knobs: k, reasons }); continue }
    const url = await draw(sc, job.thumb)
    const st = styleById(k.stile)
    out.push({ sistema: k.sistema, ok: true, ms: Math.round(performance.now() - t0), url, knobs: sc.knobs as Knobs ?? k, reasons, layout: sc.label, stile: st.name, registro: st.registro, esame: sc.esame })
  }
  return out
}

/** Le proposte come le vede lo Studio: vivaio ampio, critico, selezione delle migliori diverse. */
async function proposte(job: Job & { n?: number }): Promise<{ items: Result[]; candidate: number; promosse: number; giri: number }> {
  ;(globalThis as { __designerSink?: string[] }).__designerSink = []
  const t0 = performance.now()
  const p = await proponi(job.content, job.format, { photo: job.photo, n: job.n ?? 12, styleId: job.over?.stile, seme: (job as { seme?: number }).seme })
  const items: Result[] = []
  for (const sc of p.scene) {
    const k = sc.knobs as Knobs
    const st = styleById(k.stile)
    items.push({ sistema: k.sistema, ok: true, ms: Math.round(performance.now() - t0), url: await draw(sc, job.thumb), knobs: k, reasons: [], layout: sc.label, stile: st.name, registro: st.registro, esame: sc.esame })
  }
  return { items, candidate: p.candidate, promosse: p.promosse, giri: p.giri }
}

/** Foglio contatti composto nella pagina: niente dipendenze esterne per le immagini. */
async function sheet(o: { title: string; items: { url?: string; label: string; sub: string }[]; cols: number; cellW: number; ratio: number }) {
  const pad = 24, labelH = 46, cellH = Math.round(o.cellW * o.ratio)
  const rows = Math.ceil(o.items.length / o.cols)
  const cv = document.createElement('canvas')
  cv.width = o.cols * o.cellW + (o.cols + 1) * pad
  cv.height = 70 + rows * (cellH + labelH + pad) + pad
  const c = cv.getContext('2d')!
  c.fillStyle = '#2b2b2b'; c.fillRect(0, 0, cv.width, cv.height)
  c.fillStyle = '#fff'; c.font = '600 26px Inter, sans-serif'; c.fillText(o.title, pad, 46)
  for (const [i, it] of o.items.entries()) {
    const x = pad + (i % o.cols) * (o.cellW + pad), y = 70 + Math.floor(i / o.cols) * (cellH + labelH + pad)
    if (it.url) {
      const im = new Image(); im.src = it.url; await im.decode()
      c.drawImage(im, x, y, o.cellW, cellH)
    } else {
      c.fillStyle = '#3a2222'; c.fillRect(x, y, o.cellW, cellH)
      c.fillStyle = '#ff8a8a'; c.font = '600 20px Inter, sans-serif'; c.fillText('SCARTATA', x + 16, y + 34)
    }
    c.fillStyle = '#fff'; c.font = '600 17px Inter, sans-serif'; c.fillText(it.label, x, y + cellH + 20)
    c.fillStyle = '#9a9a9a'; c.font = '400 13px Inter, sans-serif'; c.fillText(it.sub.slice(0, Math.floor(o.cellW / 7)), x, y + cellH + 38)
  }
  return cv.toDataURL('image/jpeg', 0.86)
}

;(window as unknown as { designer: unknown }).designer = { run, sheet, proposte, motivi: () => MOTIVI, ripiego, sistemi: () => Object.keys(SYSTEMS) }
