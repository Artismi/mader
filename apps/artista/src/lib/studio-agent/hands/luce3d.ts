/**
 * La luce di scena (2.5D): i livelli non sono più ritagli piatti impilati, ma piani a quote diverse sotto una luce sola.
 *  - quota: dall'ordine dei livelli (quelli sopra sono più alti);
 *  - ombra portata: ogni figura proietta sui livelli sotto la sua sagoma, spostata nella direzione opposta alla luce
 *    e sfumata in proporzione alla distanza (più è alta, più l'ombra è lunga e morbida);
 *  - rilievo: dalla forma (spessore che cresce dal bordo) una normale per pixel, illuminata dalla stessa luce: sobrio,
 *    come carta stampata sotto una lampada, non un render;
 *  - nebbia: i livelli in fondo si velano appena del colore del fondo.
 * Livelli che hanno già un'ombra disegnata (ombra, estrusione) non ne ricevono un'altra.
 */
import { newCanvas, type Layer, type Sheet } from './sheet'
import type { Tool } from './tools'

const SALTA = /^(fondo|colore|grana|ombra|ombra3d|campo|acqua|retino|pattern|trama|sfondo|luce)$/
const lid = () => `z${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`

/** il rilievo di un livello: spessore dal bordo (alfa sfocata), normali, luce */
function rilievo(cv: HTMLCanvasElement, Lx: number, Ly: number, forza: number): HTMLCanvasElement {
  const k = Math.min(1, 700 / Math.max(cv.width, cv.height)), w = Math.max(2, Math.round(cv.width * k)), h = Math.max(2, Math.round(cv.height * k))
  const a = newCanvas(w, h), ag = a.getContext('2d', { willReadFrequently: true })!
  ag.filter = `blur(${Math.max(1, Math.min(w, h) * 0.012)}px)`; ag.drawImage(cv, 0, 0, w, h)
  const A = ag.getImageData(0, 0, w, h).data
  const luce = newCanvas(w, h), lg = luce.getContext('2d')!, L = lg.createImageData(w, h)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = (y * w + x) * 4, gx = (A[i + 4 + 3] - A[i - 4 + 3]) / 255, gy = (A[i + w * 4 + 3] - A[i - w * 4 + 3]) / 255
    // la normale guarda fuori dal bordo; il prodotto con la luce dice quanto è illuminato quel pendio
    const d = -(gx * Lx + gy * Ly) * 3 * forza
    const v = d > 0 ? 255 : 0, al = Math.min(1, Math.abs(d)) * 0.55
    L.data[i] = L.data[i + 1] = L.data[i + 2] = v; L.data[i + 3] = al * 255
  }
  lg.putImageData(L, 0, 0)
  const out = newCanvas(cv.width, cv.height), g = out.getContext('2d')!
  g.drawImage(cv, 0, 0)
  // la luce si posa solo sull'inchiostro del livello, in sovrapposizione morbida
  const sopra = newCanvas(cv.width, cv.height), sg = sopra.getContext('2d')!
  sg.drawImage(luce, 0, 0, cv.width, cv.height); sg.globalCompositeOperation = 'destination-in'; sg.drawImage(cv, 0, 0)
  g.globalCompositeOperation = 'soft-light'; g.drawImage(sopra, 0, 0); g.globalCompositeOperation = 'source-over'
  return out
}

export interface OpzioniLuce { angolo: number; quota: number; morbidezza: number; rilievo: number; nebbia: number }

export function luceDiScena(s: Sheet, o: OpzioniLuce): Sheet {
  const Lx = Math.cos(o.angolo), Ly = Math.sin(o.angolo), M = Math.min(s.W, s.H)
  const fig = (l: Layer) => !SALTA.test(l.kind) && l.scale < 0.99 && l.alpha > 0.2
  const n = s.layers.length, out: Layer[] = []
  s.layers.forEach((l, i) => {
    const z = (i + 1) / n // quota relativa
    if (fig(l)) {
      // l'ombra di questo livello cade sui livelli sotto: si mette subito sotto di lui
      const side = M * l.scale, kk = side / Math.max(l.canvas.width, l.canvas.height) // px del foglio per px del livello
      const dist = M * o.quota * (0.4 + z), blur = Math.max(1, (M * o.morbidezza * (0.3 + z)) / kk)
      const om = newCanvas(l.canvas.width, l.canvas.height), og = om.getContext('2d')!
      og.filter = `blur(${blur}px)`; og.drawImage(l.canvas, 0, 0); og.filter = 'none'
      og.globalCompositeOperation = 'source-in'; og.fillStyle = 'rgba(10,8,6,1)'; og.fillRect(0, 0, om.width, om.height)
      out.push({ ...l, id: lid(), kind: 'ombra3d', canvas: om, x: l.x - (Lx * dist) / s.W, y: l.y - (Ly * dist) / s.H, alpha: 0.38 * l.alpha, blend: 'multiply', genera: undefined })
      out.push(o.rilievo > 0 && !/testo|tipografia|etichette|firma/.test(l.kind) ? { ...l, canvas: rilievo(l.canvas, Lx, Ly, o.rilievo) } : l)
    } else out.push(l)
    // nebbia: i piani in fondo si velano appena
    if (o.nebbia > 0 && i < n - 1 && fig(l) && z < 0.5) out[out.length - 1] = { ...out[out.length - 1], alpha: out[out.length - 1].alpha * (1 - o.nebbia * (0.5 - z)) }
  })
  return { ...s, layers: out }
}

export const luce3d: Tool = {
  id: 'luce3d', label: 'Luce di scena', nature: 'luce',
  pushes: { contrasto: 0.06, profondita: 0.2 },
  available: s => s.layers.filter(l => l.scale < 0.99).length >= 1 && !s.layers.some(l => l.kind === 'ombra3d'),
  propose: (_s, c) => ({ angolo: -Math.PI / 2 - 0.6 + c.r() * 1.2 + (c.r() < 0.3 ? Math.PI : 0), quota: 0.01 + c.r() * 0.025, morbidezza: 0.005 + c.r() * 0.012, rilievo: c.r() < 0.6 ? 0.4 + c.r() * 0.6 : 0, nebbia: c.r() < 0.4 ? 0.2 : 0 }),
  apply: async (s, p) => luceDiScena(s, p as unknown as OpzioniLuce),
}
