/**
 * Affettatore (dall'analisi dello strumento di toan_vu_huu): l'immagine tagliata in una griglia di fette,
 * ognuna una finestra autonoma sull'immagine.
 *  - geometria: la dimensione delle fette cambia dal centro ai bordi (grandi al centro → piccole fuori, o il contrario)
 *    con una curva di decadimento; spaziatura tra le fette (dove si vede il fondo, pieno di colore); apertura verso fuori;
 *  - fette: ingrandimento di ogni fetta, scostamento progressivo in X/Y, stiramento al centro;
 *  - retino opzionale sulle fette (punti o linee diagonali) per la resa da stampa;
 *  - tempo: lo scostamento può scorrere (per i reel: le fette si muovono).
 */
import { flatten, fullLayer, newCanvas, type Sheet } from './sheet'
import type { Tool } from './tools'

export interface OpzioniFette {
  colonne: number; righe: number; centro: number; bordo: number; curva: number
  spazio: number; ingrandimento: number; scostaX: number; scostaY: number; stiro: number; apertura: number
  fondo: string; retino: 'no' | 'punti' | 'linee' | 'misto'; quota?: number; tempo: number; seme?: number
}

function misure(n: number, totale: number, gap: number, o: OpzioniFette): number[] {
  const c = (n - 1) / 2, w = Array.from({ length: n }, (_, i) => { const d = c ? Math.abs(i - c) / c : 0; return o.centro + (o.bordo - o.centro) * Math.pow(d, o.curva) })
  const sum = w.reduce((a, b) => a + b, 0), netto = totale - gap * (n - 1)
  return w.map(x => (x / sum) * netto)
}

export function affetta(src: HTMLCanvasElement, o: OpzioniFette): HTMLCanvasElement {
  const W = src.width, H = src.height, out = newCanvas(W, H), g = out.getContext('2d')!
  g.fillStyle = o.fondo; g.fillRect(0, 0, W, H)
  const gap = Math.min(W, H) * o.spazio
  const cw = misure(o.colonne, W, gap, o), rh = misure(o.righe, H, gap, o)
  const ci = (o.colonne - 1) / 2, ri = (o.righe - 1) / 2
  const celle: number[][] = []
  let y = 0
  for (let j = 0; j < o.righe; j++) {
    let x = 0
    for (let i = 0; i < o.colonne; i++) {
      const w = cw[i], h = rh[j], dx = i - ci, dy = j - ri
      // la finestra sull'immagine: centrata sulla fetta, spostata in modo progressivo (e nel tempo), ingrandita, stirata al centro
      const mag = o.ingrandimento * (1 + o.stiro * Math.exp(-(dx * dx) / 2))
      const sw = w / mag, sh = h / o.ingrandimento
      const ap = 1 + o.apertura
      let sx = (x + w / 2) * 1 + dx * o.scostaX * W * 0.05 * ap + o.tempo * o.scostaX * W * 0.1 - sw / 2
      let sy = (y + h / 2) + dy * o.scostaY * H * 0.05 * ap + o.tempo * o.scostaY * H * 0.1 - sh / 2
      sx = ((sx % W) + W) % W; sy = ((sy % H) + H) % H
      sx = Math.min(sx, W - sw); sy = Math.min(sy, H - sh)
      g.drawImage(src, sx, sy, Math.max(1, sw), Math.max(1, sh), x, y, w, h)
      celle.push([x, y, w, h])
      x += w + gap
    }
    y += rh[j] + gap
  }
  if (o.retino !== 'no') {
    // retinature per cella: non tutte, e ognuna col suo tipo, passo e angolo (come nei fogli stampati a mano)
    let a = (o.seme ?? 7) >>> 0; const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
    const quota = o.quota ?? 0.5
    const d = g.getImageData(0, 0, W, H), p = d.data
    for (const [cx0, cy0, cw0, ch0] of celle) {
      if (r() > quota) continue
      const tipo = o.retino === 'misto' ? RETINI[Math.floor(r() * RETINI.length)] : o.retino
      const passo = Math.max(2.5, Math.min(W, H) / (60 + r() * 200)), an = r() * Math.PI, ca = Math.cos(an), sa = Math.sin(an)
      const x0 = Math.max(0, cx0 | 0), y0 = Math.max(0, cy0 | 0), x1 = Math.min(W, (cx0 + cw0) | 0), y1 = Math.min(H, (cy0 + ch0) | 0)
      const inchiostro = r() < 0.7
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const k = (yy * W + xx) * 4, lum = (p[k] * 0.3 + p[k + 1] * 0.59 + p[k + 2] * 0.11) / 255
        const t = soglia(tipo, (xx * ca + yy * sa) / passo, (-xx * sa + yy * ca) / passo, xx, yy, cx0 + cw0 / 2, cy0 + ch0 / 2, passo)
        const on = lum > t
        if (inchiostro) { const v = on ? 255 : 0; p[k] = p[k + 1] = p[k + 2] = v } else if (!on) { p[k] *= 0.15; p[k + 1] *= 0.15; p[k + 2] *= 0.15 }
      }
    }
    g.putImageData(d, 0, 0)
  }
  return out
}

const RETINI = ['punti', 'linee', 'croce', 'onde', 'stocastico', 'concentrico', 'mezzatinta', 'mattoni'] as const
const fr = (v: number) => v - Math.floor(v)
const hash = (x: number, y: number) => fr(Math.sin(x * 127.1 + y * 311.7) * 43758.5453)
/** soglia del retino nel punto (u, v in unità di passo, ruotate): sotto la soglia è inchiostro */
function soglia(tipo: string, u: number, v: number, x: number, y: number, cx: number, cy: number, passo: number): number {
  switch (tipo) {
    case 'punti': return Math.hypot(fr(u) - 0.5, fr(v) - 0.5) / 0.7
    case 'linee': return Math.abs(fr(u) - 0.5) * 2
    case 'croce': return Math.min(Math.abs(fr(u) - 0.5), Math.abs(fr(v) - 0.5)) * 2.6
    case 'onde': return Math.abs(fr(u + Math.sin(v * 0.9) * 0.6) - 0.5) * 2
    case 'stocastico': return hash(x, y)
    case 'concentrico': return Math.abs(fr(Math.hypot(x - cx, y - cy) / passo) - 0.5) * 2
    case 'mattoni': { const sh = Math.floor(v) % 2 ? 0.5 : 0; return Math.max(Math.abs(fr(u * 0.5 + sh) - 0.5), Math.abs(fr(v) - 0.5)) * 2 }
    default: return fr(hash(Math.floor(x / 2), Math.floor(y / 2)) + Math.abs(fr(u * 0.3) - 0.5)) // mezzatinta: grana a vermicelli
  }
}

const TXT = /testo|tipografia|etichette|firma|piastra/
export const affettatoreTool: Tool = {
  id: 'affettatore', label: 'Affettatore', nature: 'ripetizione', pushes: { ripetizione: 0.2, complessita: 0.1 },
  available: s => s.layers.length >= 1,
  propose: (s, c) => {
    const r = c.r, verso = r() < 0.65
    return { colonne: 3 + Math.floor(r() * 12), righe: r() < 0.15 ? 1 : 2 + Math.floor(r() * 8), centro: verso ? 3 : 1, bordo: verso ? 0.6 : 3, curva: 0.6 + r() * 2,
      spazio: r() < 0.5 ? 0.004 + r() * 0.02 : 0, ingrandimento: 0.8 + r() * 2, scostaX: (r() - 0.5) * 2, scostaY: (r() - 0.5) * 1, stiro: r() < 0.4 ? r() * 1.5 : 0,
      apertura: r() * 0.8, fondo: r() < 0.5 ? c.tone.acc : c.tone.bg, retino: r() < 0.55 ? 'misto' : r() < 0.3 ? 'punti' : 'no', quota: 0.2 + r() * 0.6, seme: Math.floor(r() * 1e9), tempo: 0 }
  },
  apply: async (s, p) => {
    // si affetta l'immagine sotto le parole; le parole restano sopra, intere
    const i = s.layers.findIndex(l => TXT.test(l.kind)), sotto = i < 0 ? s.layers : s.layers.slice(0, i), sopra = i < 0 ? [] : s.layers.slice(i)
    const cv = affetta(flatten({ ...s, layers: sotto }, 1), p as unknown as OpzioniFette)
    return { ...s, layers: [...sotto, fullLayer(s, `f${Date.now().toString(36)}`, 'affettatore', cv, 'source-over'), ...sopra] }
  },
}
