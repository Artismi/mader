/**
 * Strumenti dall'analisi dei video di riferimento (app di dither/glitch, siti di shader):
 *  - ondine: l'immagine ridisegnata solo da righe orizzontali ondulate, spesse dove è chiaro, con bagliore a due colori;
 *  - mosaico: celle di passo fisso, ognuna riempita da un micro-motivo scelto dalla luminosità (punto, barre, croce, pieno, segni);
 *  - colata: le luci colano in verticale (ordinamento dei pixel solo sopra soglia) con bagliore e scala termica;
 *  - dither: soglia a diffusione d'errore (Atkinson) in duotono, su carta o su inchiostro.
 * Tutti agiscono sotto le parole: il testo resta sopra, intero.
 */
import { flatten, fullLayer, newCanvas, type Sheet } from './sheet'
import type { Tool } from './tools'

const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const lumi = (p: Uint8ClampedArray, k: number) => (p[k] * 0.3 + p[k + 1] * 0.59 + p[k + 2] * 0.11) / 255
const dati = (cv: HTMLCanvasElement) => cv.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, cv.width, cv.height)

export function ondine(src: HTMLCanvasElement, o: { passo: number; onda: number; fondo: string; a: string; b: string; bagliore: number }) {
  const W = src.width, H = src.height, D = dati(src).data, out = newCanvas(W, H), g = out.getContext('2d')!
  g.fillStyle = o.fondo; g.fillRect(0, 0, W, H)
  const passo = Math.max(3, Math.min(W, H) * o.passo)
  if (o.bagliore > 0) g.filter = `drop-shadow(0 0 ${passo * o.bagliore}px ${o.a})`
  for (let y0 = passo / 2; y0 < H; y0 += passo) {
    g.beginPath()
    const top: number[][] = [], bot: number[][] = []
    for (let x = 0; x <= W; x += 2) {
      const yy = Math.min(H - 1, Math.max(0, y0 | 0)), l = lumi(D, (yy * W + Math.min(W - 1, x)) * 4)
      const dy = Math.sin(x * 0.02 + y0 * 0.05) * passo * o.onda * l, t = passo * 0.48 * l
      top.push([x, y0 + dy - t]); bot.push([x, y0 + dy + t])
    }
    top.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); bot.reverse().forEach(([x, y]) => g.lineTo(x, y)); g.closePath()
    const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, o.a); gr.addColorStop(1, o.b); g.fillStyle = gr; g.fill()
  }
  return out
}

const MOTIVI = ['vuoto', 'punto', 'trattino', 'barre', 'croce', 'x', 'griglia', 'pieno'] as const
export function mosaico(src: HTMLCanvasElement, o: { passo: number; fondo: string; inchiostro: string; misto: number; seme: number }) {
  const W = src.width, H = src.height, D = dati(src).data, out = newCanvas(W, H), g = out.getContext('2d')!
  g.fillStyle = o.fondo; g.fillRect(0, 0, W, H)
  const c = Math.max(4, Math.min(W, H) * o.passo)
  let a = o.seme >>> 0; const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
  g.strokeStyle = g.fillStyle = o.inchiostro; g.lineWidth = Math.max(1, c * 0.12)
  for (let y = 0; y < H; y += c) for (let x = 0; x < W; x += c) {
    const k = ((Math.min(H - 1, y + c / 2) | 0) * W + (Math.min(W - 1, x + c / 2) | 0)) * 4
    // il colore dell'originale passa in una cella su tante (misto), come nei mosaici ibridi
    if (r() < o.misto) { g.fillStyle = `rgb(${D[k]},${D[k + 1]},${D[k + 2]})`; g.fillRect(x, y, c, c); g.fillStyle = o.inchiostro; continue }
    const m = MOTIVI[Math.min(7, Math.floor((1 - lumi(D, k)) * 8))], cx = x + c / 2, cy = y + c / 2, h = c * 0.36
    g.beginPath()
    if (m === 'punto') { g.arc(cx, cy, c * 0.12, 0, 7); g.fill() }
    else if (m === 'trattino') { g.moveTo(cx - h, cy); g.lineTo(cx + h, cy); g.stroke() }
    else if (m === 'barre') { for (const d of [-h / 2, h / 2]) { g.moveTo(cx - h, cy + d); g.lineTo(cx + h, cy + d) } g.stroke() }
    else if (m === 'croce') { g.moveTo(cx - h, cy); g.lineTo(cx + h, cy); g.moveTo(cx, cy - h); g.lineTo(cx, cy + h); g.stroke() }
    else if (m === 'x') { g.moveTo(cx - h, cy - h); g.lineTo(cx + h, cy + h); g.moveTo(cx + h, cy - h); g.lineTo(cx - h, cy + h); g.stroke() }
    else if (m === 'griglia') { g.rect(x + c * 0.15, y + c * 0.15, c * 0.7, c * 0.7); g.moveTo(cx, y + c * 0.15); g.lineTo(cx, y + c * 0.85); g.moveTo(x + c * 0.15, cy); g.lineTo(x + c * 0.85, cy); g.stroke() }
    else if (m === 'pieno') g.fillRect(x + 1, y + 1, c - 2, c - 2)
  }
  return out
}

const TERMICA = ['#05030a', '#3b0f70', '#8c2981', '#de4968', '#fe9f6d', '#fcfdbf']
export function colata(src: HTMLCanvasElement, o: { soglia: number; lunghezza: number; termica: boolean; bagliore: number }) {
  const W = src.width, H = src.height, id = dati(src), D = id.data, L = Math.round(H * o.lunghezza)
  // per colonna: dove la luce supera la soglia, il pixel si trascina verso il basso, sfumando
  for (let x = 0; x < W; x++) {
    let cola = 0, cr = 0, cg = 0, cb = 0
    for (let y = 0; y < H; y++) {
      const k = (y * W + x) * 4, l = lumi(D, k)
      if (l > o.soglia && (cola <= 0 || l > 0.9)) { cola = L * (0.3 + 0.7 * Math.abs(Math.sin(x * 0.37))); cr = D[k]; cg = D[k + 1]; cb = D[k + 2] }
      else if (cola > 0) { const t = cola / L; D[k] = D[k] * (1 - t) + cr * t; D[k + 1] = D[k + 1] * (1 - t) + cg * t; D[k + 2] = D[k + 2] * (1 - t) + cb * t; cola-- }
    }
  }
  if (o.termica) {
    const T = TERMICA.map(rgb)
    for (let k = 0; k < D.length; k += 4) { const l = lumi(D, k) * (T.length - 1), i = Math.min(T.length - 2, l | 0), f = l - i; for (let c = 0; c < 3; c++) D[k + c] = T[i][c] * (1 - f) + T[i + 1][c] * f }
  }
  const out = newCanvas(W, H), g = out.getContext('2d')!; g.putImageData(id, 0, 0)
  if (o.bagliore > 0) { g.globalCompositeOperation = 'screen'; g.filter = `blur(${Math.min(W, H) * 0.02}px) brightness(${0.6 + o.bagliore})`; g.drawImage(out, 0, 0); g.filter = 'none'; g.globalCompositeOperation = 'source-over' }
  return out
}

export function dither(src: HTMLCanvasElement, o: { scala: number; carta: string; inchiostro: string; contrasto: number }) {
  const s = Math.max(1, Math.round(o.scala)), w = Math.ceil(src.width / s), h = Math.ceil(src.height / s)
  const p = newCanvas(w, h), pg = p.getContext('2d', { willReadFrequently: true })!; pg.filter = `contrast(${o.contrasto})`; pg.drawImage(src, 0, 0, w, h)
  const id = pg.getImageData(0, 0, w, h), D = id.data, E = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) E[i] = lumi(D, i * 4)
  // soglia adattiva: la luce si stira sul suo campo, così un'immagine scura o chiara non diventa una campitura
  { let lo = 1, hi = 0, m = 0; for (let i = 0; i < E.length; i++) { lo = Math.min(lo, E[i]); hi = Math.max(hi, E[i]); m += E[i] } m /= E.length; const k = 1 / Math.max(0.05, hi - lo), mm = (m - lo) * k; for (let i = 0; i < E.length; i++) E[i] = Math.max(0, Math.min(1, ((E[i] - lo) * k - mm) + 0.5)) }
  const A = rgb(o.carta), B = rgb(o.inchiostro)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, v = E[i] > 0.5 ? 1 : 0, err = (E[i] - v) / 8
    for (const [dx, dy] of [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && xx < w && yy < h) E[yy * w + xx] += err }
    const C = v ? A : B; D[i * 4] = C[0]; D[i * 4 + 1] = C[1]; D[i * 4 + 2] = C[2]; D[i * 4 + 3] = 255
  }
  pg.filter = 'none'; pg.putImageData(id, 0, 0)
  const out = newCanvas(src.width, src.height), g = out.getContext('2d')!; g.imageSmoothingEnabled = false; g.drawImage(p, 0, 0, src.width, src.height)
  return out
}

const TXT = /testo|tipografia|etichette|firma|piastra/
const sottoTesto = async (s: Sheet, kind: string, f: (cv: HTMLCanvasElement) => HTMLCanvasElement): Promise<Sheet> => {
  const i = s.layers.findIndex(l => TXT.test(l.kind)), sotto = i < 0 ? s.layers : s.layers.slice(0, i), sopra = i < 0 ? [] : s.layers.slice(i)
  return { ...s, layers: [...sotto, fullLayer(s, `${kind}${Date.now().toString(36)}`, kind, f(flatten({ ...s, layers: sotto }, 1)), 'source-over'), ...sopra] }
}
const base = { available: (s: Sheet) => s.layers.length >= 1 }

export const ondineTool: Tool = { ...base, id: 'ondine', label: 'Righe d\'onda', nature: 'trasformazione', pushes: { ripetizione: 0.15, contrasto: 0.1 },
  propose: (_s, c) => ({ passo: 0.006 + c.r() * 0.014, onda: c.r() < 0.5 ? c.r() * 0.8 : 0, fondo: c.r() < 0.6 ? '#0b0a10' : c.tone.bg, a: c.tone.acc, b: c.r() < 0.5 ? c.tone.ink : '#f2efe6', bagliore: c.r() < 0.5 ? c.r() * 0.6 : 0 }),
  apply: async (s, p) => sottoTesto(s, 'ondine', cv => ondine(cv, p as never)) }
export const mosaicoTool: Tool = { ...base, id: 'mosaico', label: 'Mosaico di segni', nature: 'trasformazione', pushes: { ripetizione: 0.2, complessita: 0.1 },
  propose: (_s, c) => { const buio = c.r() < 0.5; return { passo: 0.008 + c.r() * 0.02, fondo: buio ? '#0e0e0e' : c.tone.bg, inchiostro: buio ? (c.r() < 0.5 ? c.tone.acc : '#f2efe6') : (c.r() < 0.5 ? c.tone.ink : c.tone.acc), misto: c.r() < 0.5 ? c.r() * 0.25 : 0, seme: Math.floor(c.r() * 1e9) } },
  apply: async (s, p) => sottoTesto(s, 'mosaico', cv => mosaico(cv, p as never)) }
export const colataTool: Tool = { ...base, id: 'colata', label: 'Colata di luce', nature: 'trasformazione', pushes: { movimento: 0.2, contrasto: 0.1 },
  propose: (_s, c) => ({ soglia: 0.55 + c.r() * 0.3, lunghezza: 0.05 + c.r() * 0.3, termica: c.r() < 0.35, bagliore: c.r() < 0.6 ? c.r() * 0.6 : 0 }),
  apply: async (s, p) => sottoTesto(s, 'colata', cv => colata(cv, p as never)) }
export const ditherTool: Tool = { ...base, id: 'dither', label: 'Dither duotono', nature: 'trasformazione', pushes: { contrasto: 0.15 },
  propose: (_s, c) => { const inv = c.r() < 0.5; return { scala: 1 + Math.floor(c.r() * 3), carta: inv ? c.tone.acc : c.tone.bg, inchiostro: inv ? '#0d0d12' : c.tone.acc, contrasto: 1 + c.r() * 0.8 } },
  apply: async (s, p) => sottoTesto(s, 'dither', cv => dither(cv, p as never)) }

/**
 * Memoria (da geometric-art: Editorial grid / Portrait window / Glyph memory): sopra l'immagine, su una griglia,
 * pochi blocchi pieni col colore medio della loro zona (la tavolozza estratta) e alcune finestre che mostrano
 * il sorgente intatto, ingrandito, dentro un'immagine trasformata.
 */
export function memoria(src: HTMLCanvasElement, orig: HTMLCanvasElement, o: { col: number; blocchi: number; finestre: number; seme: number; zoom: number }) {
  const W = src.width, H = src.height, out = newCanvas(W, H), g = out.getContext('2d')!
  g.drawImage(src, 0, 0)
  let a = o.seme >>> 0; const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
  const cw = W / o.col, rows = Math.round(H / cw), ch = H / rows
  const piccolo = newCanvas(o.col, rows); piccolo.getContext('2d')!.drawImage(orig, 0, 0, o.col, rows)
  const P = dati(piccolo).data
  for (let i = 0; i < o.blocchi + o.finestre; i++) {
    const w = 1 + Math.floor(r() * 3), h = 1 + Math.floor(r() * 2), x = Math.floor(r() * (o.col - w + 1)), y = Math.floor(r() * (rows - h + 1))
    if (i < o.blocchi) { const k = (y * o.col + x) * 4; g.fillStyle = `rgb(${P[k]},${P[k + 1]},${P[k + 2]})`; g.fillRect(x * cw, y * ch, w * cw, h * ch) }
    else { const sw = (w * cw) / o.zoom, sh = (h * ch) / o.zoom, cx = (x + w / 2) * cw - sw / 2, cy = (y + h / 2) * ch - sh / 2
      g.drawImage(orig, Math.max(0, cx), Math.max(0, cy), sw, sh, x * cw, y * ch, w * cw, h * ch)
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1; g.strokeRect(x * cw + 0.5, y * ch + 0.5, w * cw - 1, h * ch - 1) }
  }
  return out
}
export const memoriaTool: Tool = { ...base, id: 'memoria', label: 'Memoria a griglia', nature: 'struttura', pushes: { complessita: 0.1, ripetizione: 0.05 },
  propose: (_s, c) => ({ col: 6 + Math.floor(c.r() * 8), blocchi: Math.floor(c.r() * 5), finestre: 1 + Math.floor(c.r() * 5), seme: Math.floor(c.r() * 1e9), zoom: 1 + c.r() * 1.5, sotto: ['mosaico', 'dither', 'ondine', 'nessuno'][Math.floor(c.r() * 4)] }),
  apply: async (s, p) => {
    const o = p as { sotto: string } & Parameters<typeof memoria>[2], c = { r: Math.random, tone: { bg: '#ebe6dc', ink: '#121212', acc: '#e9e4da' } } as never
    return sottoTesto(s, 'memoria', cv => {
      // le finestre mostrano il sorgente dentro un'immagine trasformata (o dentro se stessa)
      const t = o.sotto === 'mosaico' ? mosaico(cv, mosaicoTool.propose(s, c) as never) : o.sotto === 'dither' ? dither(cv, ditherTool.propose(s, c) as never) : o.sotto === 'ondine' ? ondine(cv, ondineTool.propose(s, c) as never) : cv
      return memoria(t, cv, o)
    })
  } }
