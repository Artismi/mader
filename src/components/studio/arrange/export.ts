/**
 * Esportazione per tavola, come Figma/Illustrator: ogni tavola esce alla sua
 * misura reale (1080×1350 resta 1080×1350 a 1x), senza ombra, bordo o etichette
 * di lavoro, con il contenuto "al vivo" già ritagliato dalla tavola stessa.
 * Formati: PNG (anche trasparente), JPG, SVG, PDF multipagina (una tavola = una pagina).
 */
import * as fabric from 'fabric'
import { childrenOf } from './artboards'

export type ExportFormat = 'png' | 'jpg' | 'svg' | 'pdf'
export interface ExportOpts { format: ExportFormat; multiplier: number; transparent?: boolean }

type AnyObj = fabric.FabricObject & { isArtboard?: boolean }

export const listBoards = (c: fabric.Canvas) => c.getObjects().filter(o => (o as AnyObj).isArtboard)

export const boardLabel = (ab: fabric.FabricObject) =>
  String(ab.get('name') ?? 'tavola').replace(/^artboard_/, '') || 'tavola'

const fileSafe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'tavola'

const isWorkUI = (o: fabric.FabricObject) => o.excludeFromExport || String(o.get('name') ?? '').startsWith('label_')

/**
 * Prepara la scena per un'esportazione pulita e la ripristina alla fine:
 * vista a zoom 1, tavola senza ombra/bordo (e senza fondo se trasparente).
 */
async function withCleanBoard<T>(canvas: fabric.Canvas, ab: fabric.FabricObject, transparent: boolean, fn: (r: { left: number; top: number; width: number; height: number }) => T | Promise<T>): Promise<T> {
  const vpt = [...canvas.viewportTransform] as fabric.TMat2D
  const saved = { shadow: ab.shadow, strokeWidth: ab.strokeWidth, fill: ab.fill }
  const bg = canvas.backgroundColor
  const active = canvas.getActiveObject()
  try {
    canvas.discardActiveObject()
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    ab.set({ shadow: null, strokeWidth: 0, ...(transparent ? { fill: 'transparent' } : {}) })
    ab.setCoords()
    if (transparent) canvas.backgroundColor = ''
    const b = ab.getBoundingRect()
    return await fn({ left: Math.round(b.left), top: Math.round(b.top), width: Math.round(b.width), height: Math.round(b.height) })
  } finally {
    ab.set(saved); ab.setCoords()
    canvas.backgroundColor = bg
    canvas.setViewportTransform(vpt)
    if (active) canvas.setActiveObject(active)
    canvas.requestRenderAll()
  }
}

/** Immagine raster di una tavola (data URL). */
export function boardToDataURL(canvas: fabric.Canvas, ab: fabric.FabricObject, opts: { format: 'png' | 'jpeg'; multiplier: number; transparent?: boolean }) {
  const kids = new Set(childrenOf(canvas, ab))
  return withCleanBoard(canvas, ab, !!opts.transparent && opts.format === 'png', r =>
    canvas.toDataURL({
      ...r, format: opts.format, quality: 0.95, multiplier: opts.multiplier,
      filter: o => (o === ab || kids.has(o as fabric.FabricObject)) && !isWorkUI(o as fabric.FabricObject),
    }))
}

/** SVG vettoriale di una tavola: viewBox sulla tavola, elementi di lavoro esclusi. */
export function boardToSVG(canvas: fabric.Canvas, ab: fabric.FabricObject) {
  const kids = new Set(childrenOf(canvas, ab))
  const hidden = canvas.getObjects().filter(o => o !== ab && !kids.has(o) && !o.excludeFromExport)
  hidden.forEach(o => { o.excludeFromExport = true })
  return withCleanBoard(canvas, ab, false, r =>
    canvas.toSVG({ viewBox: { x: r.left, y: r.top, width: r.width, height: r.height }, width: `${r.width}`, height: `${r.height}` }),
  ).finally(() => hidden.forEach(o => { o.excludeFromExport = false }))
}

/** Oggetto selezionato da solo, su fondo trasparente (per sticker, loghi, ritagli). */
export function selectionToDataURL(canvas: fabric.Canvas, multiplier: number) {
  const a = canvas.getActiveObject()
  if (!a) return null
  return a.toDataURL({ format: 'png', multiplier })
}

function download(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
}

const pause = (ms: number) => new Promise(r => setTimeout(r, ms))

async function dataUrlBytes(url: string) {
  return new Uint8Array(await (await fetch(url)).arrayBuffer())
}

/** Esporta le tavole indicate (tutte, se l'elenco è vuoto). Restituisce quante ne ha scritte. */
export async function exportBoards(canvas: fabric.Canvas, opts: ExportOpts, only?: fabric.FabricObject[]) {
  const boards = only?.length ? only : listBoards(canvas)
  if (!boards.length) return 0
  const suffix = opts.multiplier !== 1 ? `@${opts.multiplier}x` : ''

  if (opts.format === 'pdf') {
    const { PDFDocument } = await import('pdf-lib')
    const pdf = await PDFDocument.create()
    for (const ab of boards) {
      // foto e sfumature rendono meglio in JPG; con trasparenze serve il PNG
      const url = await boardToDataURL(canvas, ab, { format: 'png', multiplier: opts.multiplier })
      const img = await pdf.embedPng(await dataUrlBytes(url))
      const w = img.width / opts.multiplier * 0.75, h = img.height / opts.multiplier * 0.75 // px CSS → punti tipografici
      const page = pdf.addPage([w, h])
      page.drawImage(img, { x: 0, y: 0, width: w, height: h })
    }
    const bytes = await pdf.save()
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
    download(url, `${fileSafe(boards.length === 1 ? boardLabel(boards[0]) : 'tavole')}.pdf`)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    return boards.length
  }

  for (const ab of boards) {
    const name = fileSafe(boardLabel(ab))
    if (opts.format === 'svg') {
      const svg = await boardToSVG(canvas, ab)
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      download(url, `${name}.svg`)
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } else {
      const fmt = opts.format === 'jpg' ? 'jpeg' : 'png'
      const url = await boardToDataURL(canvas, ab, { format: fmt, multiplier: opts.multiplier, transparent: opts.transparent })
      download(url, `${name}${suffix}.${opts.format}`)
    }
    // i browser bloccano raffiche di download: un attimo di respiro tra un file e l'altro
    if (boards.length > 1) await pause(350)
  }
  return boards.length
}
