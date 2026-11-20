/**
 * I testi dei reel non sono sottotitoli: li impagina lo stesso generatore tipografico delle tavole
 * (parola gigante che attraversa, impilato, verticale, colonna, divaricato, centrato…), con i suoi caratteri
 * e la tavolozza della tavola su cui cadono, guardando cosa c'è sotto per restare leggibili.
 * Il risultato è un livello trasparente che entra nell'immagine e viene lavorato dal programma del laboratorio.
 */
import type { Rnd } from '../core/rng'
import type { FaceId } from '@/components/studio/genera/fonts'
import { impaginaTesti, type Impagina } from './tipo'
import type { Sheet } from './sheet'

const W = 720, H = 1280

function copri(img: CanvasImageSource & { width: number; height: number }) {
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, s = Math.max(W / img.width, H / img.height)
  g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s)
  return c
}

export async function testoGrafico(img: CanvasImageSource & { width: number; height: number }, testo: string, st: { face: FaceId; lettura: FaceId; colori: string[]; bg: string; maiuscolo?: boolean }, r: Rnd, vietate: Impagina[] = []): Promise<{ cv: HTMLCanvasElement; modo: Impagina }> {
  const base = copri(img)
  const sheet: Sheet = { W, H, bg: st.bg, layers: [{ id: 'tavola', kind: 'tavola', canvas: base, x: 0.5, y: 0.5, scale: H / W, rot: 0, alpha: 1, blend: 'source-over' }] }
  const { sheet: s, modo } = await impaginaTesti(sheet, r, { titolo: testo }, { ...st, espressivo: true, nudo: true }, vietate)
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d')!
  const M = Math.min(W, H)
  for (const l of s.layers) {
    if (l.id === 'tavola') continue
    const k = (M * l.scale) / Math.max(l.canvas.width, l.canvas.height)
    g.save(); g.globalAlpha = l.alpha; g.globalCompositeOperation = l.blend
    g.translate(l.x * W, l.y * H); g.rotate(l.rot); if (l.flipX) g.scale(-1, 1); g.scale(k, k)
    g.drawImage(l.canvas, -l.canvas.width / 2, -l.canvas.height / 2); g.restore()
  }
  return { cv, modo }
}
