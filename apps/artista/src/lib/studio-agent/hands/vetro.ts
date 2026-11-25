/**
 * Vetro: una lastra lavorata sospesa sopra l'immagine, con aria in mezzo, sotto una luce che si sposta.
 *  - geometria: celle (canne verticali/orizzontali/diagonali, tasselli a cuscino, croce, fasce, riquadri,
 *    vetrata a celle irregolari con piombo, martellato); ogni cella ha un profilo di spessore → una normale per pixel;
 *  - rifrazione: il retro è letto spostato lungo la normale, di più quanto più la lastra è alta (aria) e densa (indice);
 *  - densità interna variabile per cella: sabbiatura (sfocatura), tinta, bolle e filamenti nella pasta del vetro;
 *  - luce: la lastra proietta sul retro un'ombra spostata (bordi delle celle) e caustiche (dove le canne concentrano la luce);
 *    sulla superficie un riflesso speculare e il bordo che brilla di più (Fresnel);
 *  - tempo: la luce gira (per i reel).
 */
import { flatten, fullLayer, newCanvas, replaceLayer, type Sheet } from './sheet'
import type { Tool } from './tools'

export type Disegno = 'verticale' | 'orizzontale' | 'diagonale' | 'tasselli' | 'croce' | 'fasce' | 'riquadri' | 'vetrata' | 'martellato'
export interface OpzioniVetro {
  disegno: Disegno; canna: number; curva: number; ombra: number; seme: number
  aria?: number; indice?: number; sabbia?: number; tinta?: number; bolle?: number; luce?: number; lucido?: number; tempo?: number; colori?: string[]
}

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

export function vetro(src: HTMLCanvasElement, o: OpzioniVetro): HTMLCanvasElement {
  const W = src.width, H = src.height, S = Math.min(W, H)
  const aria = (o.aria ?? 0.5) * S * 0.06, ind = o.indice ?? 0.6, curva = o.curva
  const ang = (o.luce ?? -2.2) + (o.tempo ?? 0) * Math.PI * 2, Lx = Math.cos(ang), Ly = Math.sin(ang)
  let a = o.seme >>> 0
  const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
  const cvA = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, W, H).data
  // copia sabbiata (vetro opaco): la si mescola cella per cella secondo la densità
  const bl = newCanvas(W, H), bg = bl.getContext('2d', { willReadFrequently: true })!
  bg.filter = `blur(${Math.max(2, S * 0.012)}px)`; bg.drawImage(src, 0, 0)
  const cvB = bg.getImageData(0, 0, W, H).data
  const w = Math.max(5, S * o.canna)
  // celle della vetrata (Voronoi) e fasce/riquadri
  const nv = 14 + Math.floor(r() * 26), semi = Array.from({ length: nv }, () => [r() * W, r() * H])
  const cx = W * (0.3 + r() * 0.4), cy = H * (0.3 + r() * 0.4), bw = S * (0.12 + r() * 0.15)
  const fasce = Array.from({ length: 3 + Math.floor(r() * 3) }, () => r()).sort()
  // proprietà interne per cella: sabbia, tinta, bolle
  const pal = (o.colori ?? ['#c8d6d2', '#e9d8a6', '#9fb8c9', '#d9a7a0']).map(hex)
  const cella = (id: number) => { let b = (id * 2654435761 + o.seme) >>> 0; const q = () => ((b = (b * 1664525 + 1013904223) >>> 0) / 4294967296)
    return { sab: (o.sabbia ?? 0.3) * (q() < 0.5 ? q() : 0), tin: (o.tinta ?? 0.15) * q(), col: pal[Math.floor(q() * pal.length)], fase: q() * 6.28 } }
  const cache = new Map<number, ReturnType<typeof cella>>(), C = (id: number) => cache.get(id) ?? (cache.set(id, cella(id)), cache.get(id)!)
  // rumore per martellato e bolle
  const nz = (x: number, y: number) => Math.sin(x * 0.11 + Math.sin(y * 0.07) * 2) * Math.cos(y * 0.13 + Math.sin(x * 0.05) * 2)
  const nb = Math.floor((o.bolle ?? 0.3) * 900), bolle = Array.from({ length: nb }, () => [r() * W, r() * H, S * (0.0012 + Math.pow(r(), 3) * 0.008)])

  /** per un punto: normale (nx, ny), id cella, distanza dal bordo cella (0 bordo → 1 centro), piombo */
  const geo = (x: number, y: number): [number, number, number, number, number] => {
    const prof = (t: number) => { const s = 2 * t - 1; return [-s * curva, 1 - Math.abs(s)] } // pendenza, distanza dal bordo
    let d = o.disegno
    let ww = w
    if (d === 'croce') { if (Math.abs(x - cx) < bw) { d = 'orizzontale'; ww = w * 0.7 } else if (Math.abs(y - cy) < bw) { d = 'verticale'; ww = w * 0.7 } else { d = 'verticale'; ww = w * 1.6 } }
    if (d === 'fasce') { const k = fasce.findIndex(f => y / H < f); d = k % 2 ? 'orizzontale' : 'verticale'; ww = w * (k % 3 ? 0.6 : 1) }
    if (d === 'riquadri') { const qx = Math.floor(x / (S * 0.33)), qy = Math.floor(y / (S * 0.33)); d = (['verticale', 'orizzontale', 'diagonale'] as Disegno[])[(qx + qy) % 3]; ww = w * (0.6 + ((qx * 7 + qy * 3) % 3) * 0.4) }
    if (d === 'verticale') { const i = Math.floor(x / ww), [p, e] = prof(x / ww - i); return [p, 0, i, e, 0] }
    if (d === 'orizzontale') { const j = Math.floor(y / ww), [p, e] = prof(y / ww - j); return [0, p, j + 5000, e, 0] }
    if (d === 'diagonale') { const t = (x + y) / Math.SQRT2 / ww, i = Math.floor(t), [p, e] = prof(t - i); return [p / Math.SQRT2, p / Math.SQRT2, i + 9000, e, 0] }
    if (d === 'tasselli') { const q = ww * 2, i = Math.floor(x / q), j = Math.floor(y / q), [px, ex] = prof(x / q - i), [py, ey] = prof(y / q - j); return [px, py, i * 131 + j, Math.min(ex, ey), 0] }
    if (d === 'martellato') { const k = S * o.canna * 0.4, h = (xx: number, yy: number) => nz(xx / k * 6, yy / k * 6); return [(h(x + 1, y) - h(x - 1, y)) * curva * 9, (h(x, y + 1) - h(x, y - 1)) * curva * 9, 0, 1, 0] }
    // vetrata: cella più vicina, piombo dove le due più vicine si equivalgono; dentro, cuscino verso il centro del seme
    let b1 = 1e18, b2 = 1e18, k1 = 0
    for (let k = 0; k < nv; k++) { const dx = x - semi[k][0], dy = y - semi[k][1], dd = dx * dx + dy * dy; if (dd < b1) { b2 = b1; b1 = dd; k1 = k } else if (dd < b2) b2 = dd }
    const bordo = (Math.sqrt(b2) - Math.sqrt(b1)) / (S * 0.06), e = Math.min(1, bordo)
    const dx = x - semi[k1][0], dy = y - semi[k1][1], dl = Math.hypot(dx, dy) || 1
    return [(dx / dl) * (1 - e) * curva, (dy / dl) * (1 - e) * curva, k1 + 20000, e, bordo < 0.035 ? 1 : 0]
  }

  const out = newCanvas(W, H), g = out.getContext('2d')!, I = g.createImageData(W, H), B = I.data
  const leggi = (D: Uint8ClampedArray, x: number, y: number, c: number) => {
    x = Math.max(0, Math.min(W - 1.001, x)); y = Math.max(0, Math.min(H - 1.001, y))
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = (y0 * W + x0) * 4 + c
    return (D[i] * (1 - fx) + D[i + 4] * fx) * (1 - fy) + (D[i + W * 4] * (1 - fx) + D[i + W * 4 + 4] * fx) * fy
  }
  const lucido = o.lucido ?? 0.6, om = o.ombra
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [nx, ny, id, e, piombo] = geo(x, y), p = C(id), d4 = (y * W + x) * 4
    if (piombo) { B[d4] = 22; B[d4 + 1] = 20; B[d4 + 2] = 18; B[d4 + 3] = 255; continue }
    // rifrazione: più aria e più indice → più spostamento del retro
    const sx = x + nx * aria * ind, sy = y + ny * aria * ind
    // ombra portata della lastra sul retro: il bordo della cella che sta sopra al punto (spostato verso la luce)
    const [, , , eo] = geo(x + Lx * aria, y + Ly * aria)
    const ombra = Math.pow(1 - eo, 5) * om
    // caustica: la canna concentra la luce verso il suo centro, spostata dall'aria
    const caus = Math.pow(Math.max(0, eo), 10) * om * 0.9
    // superficie: speculare dalla normale verso la luce, e Fresnel al bordo
    const nl = Math.max(0, -(nx * Lx + ny * Ly)) / (1 + Math.hypot(nx, ny))
    const spec = Math.pow(nl, 8 + (1 - lucido) * 30) * lucido * 1.4, fres = Math.pow(1 - e, 3) * 0.25
    // pasta del vetro: filamenti e bolle
    const fil = 1 + Math.sin(x * 0.02 + y * 0.003 + p.fase + nz(x * 0.3, y * 0.3)) * 0.04
    for (let c = 0; c < 3; c++) {
      let v = leggi(cvA, sx, sy, c) * (1 - p.sab) + leggi(cvB, sx, sy, c) * p.sab
      v = v * (1 - ombra) + (255 - v) * caus * 0.5
      v = v * (1 - p.tin) + p.col[c] * p.tin * (v / 255 + 0.3)
      v = v * fil + (255 - v) * (spec + fres)
      B[d4 + c] = v
    }
    B[d4 + 3] = leggi(cvA, sx, sy, 3)
  }
  g.putImageData(I, 0, 0)
  // bolle: lentine minuscole con il loro riflesso e un'ombra
  for (const [bx, by, br] of bolle) {
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.arc(bx - Lx * br * 0.8, by - Ly * br * 0.8, br, 0, 7); g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(0.6, br * 0.25); g.beginPath(); g.arc(bx, by, br, 0, 7); g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(bx + Lx * br * 0.4, by + Ly * br * 0.4, br * 0.25, 0, 7); g.fill()
  }
  return out
}

export const vetroTool: Tool = {
  id: 'vetro', label: 'Vetro lavorato', nature: 'trasformazione',
  pushes: { complessita: 0.06, ripetizione: 0.1, profondita: 0.1 },
  available: s => s.layers.length >= 1,
  propose: (s, c) => {
    const r = c.r, d = (['verticale', 'verticale', 'orizzontale', 'diagonale', 'tasselli', 'croce', 'fasce', 'riquadri', 'vetrata', 'vetrata', 'martellato'] as Disegno[])[Math.floor(r() * 11)]
    const figure = s.layers.filter(l => l.scale < 0.99)
    return { disegno: d, canna: 0.025 + r() * 0.1, curva: 0.5 + r() * 1.2, ombra: 0.15 + r() * 0.35, seme: Math.floor(r() * 1e9),
      aria: 0.2 + r() * 0.8, indice: 0.3 + r() * 0.8, sabbia: r() < 0.5 ? r() * 0.8 : 0, tinta: r() < 0.4 ? r() * 0.35 : 0.05, bolle: r() < 0.4 ? r() * 0.6 : 0,
      luce: -Math.PI / 2 - 0.8 + r() * 1.6, lucido: 0.3 + r() * 0.6, tempo: 0, colori: [c.tone.acc, c.tone.bg, c.tone.ink, '#c8d6d2'],
      layer: figure.length && r() < 0.35 ? figure[Math.floor(r() * figure.length)].id : '' }
  },
  apply: async (s: Sheet, p) => {
    const o = p as unknown as OpzioniVetro & { layer: string }
    const l = o.layer ? s.layers.find(x => x.id === o.layer) : undefined
    if (l) return replaceLayer(s, l.id, { canvas: vetro(l.canvas, o) })
    const TXT = /testo|tipografia|etichette|firma|piastra/
    const primoTesto = s.layers.findIndex(l => TXT.test(l.kind))
    const sotto = primoTesto < 0 ? s.layers : s.layers.slice(0, primoTesto), sopra = primoTesto < 0 ? [] : s.layers.slice(primoTesto)
    const cv = vetro(flatten({ ...s, layers: sotto }, 1), o)
    return { ...s, layers: [...sotto, fullLayer(s, `v${Date.now().toString(36)}`, 'vetro', cv, 'source-over'), ...sopra] }
  },
}
