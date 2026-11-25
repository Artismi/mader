/**
 * Il motore di impaginazione del software di grafica, nelle mani dell'artista.
 * È il mestiere editoriale: margini proporzionati, griglia a 12 colonne, scala tipografica modulare, titolo adattato
 * (mai tagliato), contrasto controllato, decorazioni solo nelle zone libere; 17 stili e 17 impaginazioni.
 * L'artista ci mette le sue parole e la sua arte (le figure che ha fatto: muffe, universi, macchie…) come immagine.
 * Il risultato torna livello per livello (ogni oggetto impaginato è un livello al suo posto): così resta animabile
 * e il reel lo legge come una tavola sua. Niente immagini da fuori: l'immagine è sempre la sua.
 */
import * as fabric from 'fabric'
import type { ComposeBoard, ComposeContent } from '@/lib/design/compose-spec'
import type { Linguaggio } from '../mind/linguaggi'
import type { Layer, Sheet } from './sheet'

/** stili e impaginazioni del motore che appartengono a ogni linguaggio (gli incroci li ereditano dai genitori) */
const PER: Record<string, { stili: string[]; lay: string[] }> = {
  svizzero: { stili: ['svizzero', 'minimal', 'editoriale'], lay: ['rivista', 'eroe', 'numeri', 'tipografico'] },
  costruttivista: { stili: ['bauhaus', 'poster', 'brutalista'], lay: ['manifesto', 'gigante', 'diviso'] },
  riso: { stili: ['riso', 'retro'], lay: ['collage', 'arte', 'galleria', 'copertina'] },
  glitch: { stili: ['tech', 'neon', 'cromo'], lay: ['drop', 'tipografico', 'bento'] },
  organico: { stili: ['organico', 'morbido'], lay: ['arte', 'galleria', 'copertina'] },
  collage: { stili: ['brutalista', 'riso', 'retro'], lay: ['collage', 'cover', 'drop'] },
  concettuale: { stili: ['minimal', 'poster', 'galleria'], lay: ['citazione', 'gigante', 'eroe'] },
  datapoesia: { stili: ['tech', 'svizzero', 'editoriale'], lay: ['numeri', 'manuale', 'elenco', 'bento'] },
  acido: { stili: ['neon', 'cromo', 'morbido'], lay: ['arte', 'drop', 'gigante'] },
  brutalista: { stili: ['brutalista', 'tech'], lay: ['bento', 'scheda', 'elenco'] },
  ornamento: { stili: ['lusso', 'retro', 'galleria'], lay: ['arte', 'galleria', 'manifesto'] },
  minimo: { stili: ['minimal', 'galleria', 'lusso'], lay: ['citazione', 'galleria', 'eroe'] },
}
/** le impaginazioni che mettono in pagina la sua arte (le altre solo quando ha da dire numeri, elenchi o una citazione) */
export const CON_ARTE = new Set(['diviso', 'copertina', 'galleria', 'arte', 'bento', 'cover', 'tipografico', 'collage', 'drop', 'manifesto', 'manuale', 'rivista'])
export function sceltePer(L: Linguaggio): { stili: string[]; lay: string[] } {
  const parti = L.id.split('×').filter(p => PER[p])
  const stili = [...new Set(parti.flatMap(p => PER[p].stili))], lay = [...new Set(parti.flatMap(p => PER[p].lay))]
  const conArte = lay.filter(x => CON_ARTE.has(x))
  return { stili: stili.length ? stili : ['editoriale'], lay: conArte.length ? [...conArte, ...conArte, ...lay.filter(x => !CON_ARTE.has(x) && x !== 'numeri' && x !== 'elenco')] : ['copertina', 'galleria'] }
}

export interface Impaginato { sheet: Sheet; stile: string; impaginazione: string }

/** impagina con il motore; arte = l'immagine dell'artista (le sue figure, senza parole) */
export async function impaginaMotore(o: { W: number; H: number; stile: string; impaginazione: string; contenuto: ComposeContent; arte?: HTMLCanvasElement; colori?: { bg: string; ink: string; accent: string }; densita?: 'essenziale' | 'ricco' | 'massimo'; texture?: ComposeBoard['texture'] }): Promise<Impaginato> {
  const { composeBoard } = await import('@/components/studio/compose/compose')
  const el = document.createElement('canvas')
  const canvas = new fabric.Canvas(el, { width: o.W, height: o.H, renderOnAddRemove: false, enableRetinaScaling: false })
  const tavola = new fabric.Rect({ left: 0, top: 0, originX: 'left', originY: 'top', width: o.W, height: o.H, fill: o.colori?.bg ?? '#ffffff', selectable: false })
  tavola.set('name', 'tavola')
  canvas.add(tavola)
  // niente richieste a servizi esterni: solo la sua immagine
  const contenuto: ComposeContent = { ...o.contenuto, image: o.arte ? { url: o.arte.toDataURL('image/png'), alt: o.contenuto.title } : undefined }
  const spec: ComposeBoard = { style: o.stile, layout: o.impaginazione, width: o.W, height: o.H, content: contenuto, density: o.densita ?? 'ricco', texture: o.texture ?? 'stile', ...(o.colori ? { colors: { bg: o.colori.bg, ink: o.colori.ink, accent: o.colori.accent } } : {}) }
  await composeBoard(canvas as unknown as fabric.Canvas, tavola, spec, 0, 1)
  canvas.renderAll()
  // ogni oggetto diventa un livello, al suo posto (centro, misura, rotazione già dentro il disegno)
  const layers: Layer[] = []
  const S = Math.min(o.W, o.H)
  let k = 0
  for (const ob of canvas.getObjects()) {
    if (ob === tavola) continue
    let cv: HTMLCanvasElement
    try { cv = ob.toCanvasElement({ multiplier: 1 }) } catch { continue }
    if (!cv.width || !cv.height) continue
    const c = ob.getCenterPoint()
    const testo = (ob as unknown as { text?: string }).text
    const fs = (ob as unknown as { fontSize?: number }).fontSize
    const nome = String(ob.get('name') ?? '')
    const kind = testo ? 'testo' : /bg|fondo|background|texture|grana/.test(nome) ? 'fondo' : 'impaginato'
    layers.push({ id: `m${k++}`, kind, canvas: cv, x: c.x / o.W, y: c.y / o.H, scale: Math.max(cv.width, cv.height) / S, rot: 0, alpha: 1, blend: 'source-over', ...(testo ? { meta: { text: testo, size: fs ?? 24, color: String(ob.get('fill') ?? '#000'), ruolo: /title|titolo|display/.test(nome) ? 'titolo' : 'corpo' } as Layer['meta'] } : {}) })
  }
  canvas.dispose()
  return { sheet: { W: o.W, H: o.H, bg: o.colori?.bg ?? '#ffffff', layers }, stile: o.stile, impaginazione: o.impaginazione }
}
