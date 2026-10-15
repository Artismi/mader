/**
 * Verifica: la scena ricostruita si rende con lo stesso render dello Studio
 * (Fabric + motore effetti) e si confronta con l'originale. Per i testi si
 * rende ogni blocco da solo e se ne misurano le righe: da lì si correggono
 * posizione, corpo, spaziatura e interlinea.
 */
import * as fabric from 'fabric'
import { renderScene } from '../render'
import { loadFonts } from '../fonts'
import type { FontSpec, Scene, SceneEl } from '../types'
import { daTela } from './pixel'
import type { Box, Raster } from './tipi'

type Testo = Extract<SceneEl, { kind: 'text' }>

/** Caratteri usati dalla scena, compreso il corsivo delle righe con stili per lettera. */
export function caratteriDi(sc: Scene): FontSpec[] {
  return sc.els.flatMap(e => {
    if (!('font' in e) || !e.font) return []
    const it = e.kind === 'text' && e.chars?.some(l => l?.some(c => c?.it))
    return it ? [e.font, { ...e.font, italic: true }] : [e.font]
  })
}

/** Rende la scena alla sua misura e restituisce i pixel. */
export async function rendi(sc: Scene): Promise<Raster> {
  await loadFonts(caratteriDi(sc))
  const el = document.createElement('canvas')
  const cv = new fabric.Canvas(el, { width: sc.w, height: sc.h, renderOnAddRemove: false, enableRetinaScaling: false })
  const ab = new fabric.Rect({ left: sc.w / 2, top: sc.h / 2, width: sc.w, height: sc.h, fill: sc.bg, strokeWidth: 0 })
  ab.set('name', 'tavola'); (ab as fabric.Rect & { isArtboard?: boolean }).isArtboard = true
  cv.add(ab)
  await renderScene(cv, ab, sc, 'verifica')
  cv.renderAll()
  const out = daTela(cv.toCanvasElement(1))
  cv.dispose()
  return out
}

export interface RigheRese { righe: Box[]; box: Box }

/** Rende un testo da solo, su fondo trasparente, e ne misura le righe d'inchiostro (coordinate della tavola). */
export async function misuraTesto(t: Testo): Promise<RigheRese | null> {
  const pad = Math.ceil(t.size * 1.2)
  const ox = Math.floor(t.x - pad), oy = Math.floor(t.y - pad)
  const sc: Scene = {
    w: Math.ceil(t.w + 2 * pad + t.size * Math.abs(t.tracking) * 40), h: Math.ceil(t.lines.length * t.size * Math.max(1, t.lineHeight) + 2 * pad),
    bg: 'rgba(0,0,0,0)', els: [{ ...t, x: t.x - ox, y: t.y - oy }], layout: 'misura', style: 'misura', label: 'misura',
  }
  const r = await rendi(sc)
  const A = (x: number, y: number) => r.data[(y * r.w + x) * 4 + 3] > 90
  const conta = Array.from({ length: r.h }, (_, y) => { let n = 0; for (let x = 0; x < r.w; x++) if (A(x, y)) n++; return n })
  let fasce: [number, number][] = []
  let s = -1
  conta.forEach((n, y) => { if (n && s < 0) s = y; if (!n && s >= 0) { fasce.push([s, y - 1]); s = -1 } })
  if (s >= 0) fasce.push([s, r.h - 1])
  if (!fasce.length) return null
  // accenti e puntini staccati: si uniscono i buchi più piccoli finché le fasce sono quante le righe
  while (fasce.length > t.lines.length) {
    let m = 1
    for (let i = 1; i < fasce.length; i++) if (fasce[i][0] - fasce[i - 1][1] < fasce[m][0] - fasce[m - 1][1]) m = i
    fasce = [...fasce.slice(0, m - 1), [fasce[m - 1][0], fasce[m][1]], ...fasce.slice(m + 1)]
  }
  const righe = fasce.map(([a, b]) => {
    let x0 = r.w, x1 = -1
    for (let y = a; y <= b; y++) for (let x = 0; x < r.w; x++) if (A(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x }
    return { x: x0 + ox, y: a + oy, w: x1 - x0 + 1, h: b - a + 1 }
  })
  const x0 = Math.min(...righe.map(q => q.x)), y0 = Math.min(...righe.map(q => q.y))
  const x1 = Math.max(...righe.map(q => q.x + q.w)), y1 = Math.max(...righe.map(q => q.y + q.h))
  return { righe: fasce.length === t.lines.length ? righe : [], box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } }
}
