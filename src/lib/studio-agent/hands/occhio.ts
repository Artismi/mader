/**
 * L'occhio del designer: l'ultimo passaggio su una tavola finita. Non aggiunge niente, sistema quello che c'è.
 *  - l'elemento più bello, se è piccolo e sperduto, cresce e va su un punto forte (centro o terzi);
 *  - le figure rientrano nei margini (tranne quelle che escono di proposito, più grandi del foglio);
 *  - due figure secondarie che si coprono a metà: la più piccola si sposta dove c'è vuoto;
 *  - un testo che tocca una figura o un altro testo, o esce dai margini: si sposta e, se serve, si rimpicciolisce.
 */
import { newCanvas, type Layer, type Sheet } from './sheet'

const TXT = /testo|tipografia|etichette|firma|piastra/
const BELLI = /motivo|camera|cristallo|muffa|ornato|caleido|geometria|flusso|mondo/
type Box = { x0: number; y0: number; x1: number; y1: number }
const area = (b: Box) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0)
const inter = (a: Box, b: Box) => area({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) })

/** il riquadro dell'inchiostro vero (non del canvas), in px del foglio */
function scatola(s: Sheet, l: Layer, cache: Map<HTMLCanvasElement, Box>): Box {
  const cv = l.canvas, cw = cv.width, ch = cv.height
  let c = cache.get(cv)
  if (!c) {
    const n = 64, t = newCanvas(n, n), g = t.getContext('2d', { willReadFrequently: true })!
    g.drawImage(cv, 0, 0, n, n)
    const d = g.getImageData(0, 0, n, n).data
    let x0 = n, y0 = n, x1 = -1, y1 = -1
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[(y * n + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y }
    c = x1 < 0 ? { x0: 0, y0: 0, x1: 0, y1: 0 } : { x0: (x0 / n) * cw, y0: (y0 / n) * ch, x1: ((x1 + 1) / n) * cw, y1: ((y1 + 1) / n) * ch }
    cache.set(cv, c)
  }
  const k = (Math.min(s.W, s.H) * l.scale) / Math.max(cw, ch)
  const pts = [[c.x0, c.y0], [c.x1, c.y0], [c.x0, c.y1], [c.x1, c.y1]].map(([x, y]) => {
    const dx = (x - cw / 2) * k, dy = (y - ch / 2) * k, co = Math.cos(l.rot), si = Math.sin(l.rot)
    return [l.x * s.W + dx * co - dy * si, l.y * s.H + dx * si + dy * co]
  })
  return { x0: Math.min(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), x1: Math.max(...pts.map(p => p[0])), y1: Math.max(...pts.map(p => p[1])) }
}

export function occhio(s: Sheet): { sheet: Sheet; note: string[] } {
  const cache = new Map<HTMLCanvasElement, Box>(), note: string[] = []
  const L = s.layers.map(l => ({ ...l, meta: l.meta ? { ...l.meta } : undefined }))
  const S = s.W * s.H, m = Math.min(s.W, s.H) * 0.05
  const pieno = (l: Layer) => { const b = scatola(s, l, cache); return area(b) > S * 0.8 || b.x1 - b.x0 > s.W * 1.02 || b.y1 - b.y0 > s.H * 1.02 }
  const testi = L.filter(l => TXT.test(l.kind) && l.kind !== 'firma' && l.alpha > 0.2)
  const figure = L.filter(l => !TXT.test(l.kind) && l.alpha > 0.3 && !pieno(l) && area(scatola(s, l, cache)) > S * 0.004)
  const box = (l: Layer) => scatola(s, l, cache)
  const sposta = (l: Layer, b: Box, cx: number, cy: number) => { l.x += (cx - (b.x0 + b.x1) / 2) / s.W; l.y += (cy - (b.y0 + b.y1) / 2) / s.H }

  // 1. il protagonista: la figura bella più grande; se è piccola, cresce e va su un punto forte
  const prot = figure.filter(l => BELLI.test(l.kind)).sort((a, b) => area(box(b)) - area(box(a)))[0]
  if (prot) {
    const b = box(prot), a = area(b) / S
    if (a < 0.16) {
      const f = Math.min(1.8, Math.sqrt(0.3 / Math.max(a, 0.01)))
      prot.scale *= f
      const b2 = box(prot), cx = (b2.x0 + b2.x1) / 2, cy = (b2.y0 + b2.y1) / 2
      const punti = [[0.5, 0.5], [1 / 3, 1 / 3], [2 / 3, 1 / 3], [1 / 3, 2 / 3], [2 / 3, 2 / 3]].map(([x, y]) => [x * s.W, y * s.H])
      const [px, py] = punti.sort((p, q) => Math.hypot(p[0] - cx, p[1] - cy) - Math.hypot(q[0] - cx, q[1] - cy))[0]
      sposta(prot, b2, px, py)
      note.push(`ingrandisco ${prot.kind} e lo porto su un punto forte`)
    }
  }
  // 2. le figure dentro i margini (quelle più grandi del foglio escono di proposito)
  for (const l of figure) {
    const b = box(l), w = b.x1 - b.x0, h = b.y1 - b.y0
    if (w > s.W - 2 * m || h > s.H - 2 * m) continue
    const dx = b.x0 < m ? m - b.x0 : b.x1 > s.W - m ? s.W - m - b.x1 : 0, dy = b.y0 < m ? m - b.y0 : b.y1 > s.H - m ? s.H - m - b.y1 : 0
    if (Math.abs(dx) + Math.abs(dy) > 1) { l.x += dx / s.W; l.y += dy / s.H }
  }
  // 3. figure secondarie che si coprono: la più piccola va nel terzo più vuoto
  const sec = figure.filter(l => l !== prot).sort((a, b) => area(box(a)) - area(box(b)))
  for (const l of sec) {
    const b = box(l), altri = figure.filter(o => o !== l)
    const copre = altri.some(o => { const ob = box(o); return inter(b, ob) > 0.5 * Math.min(area(b), area(ob)) })
    if (!copre) continue
    const w = b.x1 - b.x0, h = b.y1 - b.y0
    let best: [number, number] | null = null, bc = Infinity
    for (const fx of [0.25, 0.5, 0.75]) for (const fy of [0.22, 0.5, 0.78]) {
      const c: Box = { x0: fx * s.W - w / 2, y0: fy * s.H - h / 2, x1: fx * s.W + w / 2, y1: fy * s.H + h / 2 }
      const costo = altri.reduce((a, o) => a + inter(c, box(o)), 0) + [...testi].reduce((a, t) => a + 2 * inter(c, box(t)), 0)
      if (costo < bc) { bc = costo; best = [fx * s.W, fy * s.H] }
    }
    if (best && bc < inter(b, box(altri[0]))) { sposta(l, b, best[0], best[1]); note.push(`sposto ${l.kind} dove c'è vuoto`) }
  }
  // 4a. un paragrafo lungo non si urla: torna a corpo da lettura (da qualunque strumento venga)
  for (const t of testi) {
    const n = t.meta?.text?.length ?? 0, sz = t.meta?.size ?? 0, tetto = n > 160 ? s.W * 0.028 : n > 90 ? s.W * 0.04 : Infinity
    if (sz > tetto * 1.1) { const k = tetto / sz; t.scale *= k; t.meta!.size *= k; note.push('un paragrafo lungo era troppo grosso: lo porto a corpo da lettura') }
  }
  // 4. i testi: non toccano figure né altri testi, stanno nei margini; se serve si rimpiccioliscono un poco
  const posati: Layer[] = []
  for (const t of [...testi].sort((a, b) => area(box(b)) - area(box(a)))) {
    const b0 = box(t), costoDi = (b: Box) => {
      const fuori = Math.max(0, m - b.x0) + Math.max(0, m - b.y0) + Math.max(0, b.x1 - (s.W - m)) + Math.max(0, b.y1 - (s.H - m))
      return figure.reduce((a, f) => a + inter(b, box(f)), 0) / area(b) + 3 * posati.reduce((a, p) => a + inter(b, box(p)), 0) / area(b) + fuori / Math.min(s.W, s.H) * 4
    }
    const c0 = costoDi(b0)
    if (c0 < 0.06) { posati.push(t); continue }
    let best = { c: c0, x: t.x, y: t.y, k: 1 }
    const w0 = b0.x1 - b0.x0, h0 = b0.y1 - b0.y0
    for (const k of [1, 0.85, 0.72]) {
      const w = w0 * k, h = h0 * k
      if (w > s.W - 2 * m) continue
      for (const fx of [m + w / 2, s.W / 2, s.W - m - w / 2]) for (const fy of [m + h / 2, s.H * 0.3, s.H * 0.5, s.H * 0.7, s.H - m - h / 2]) {
        const b: Box = { x0: fx - w / 2, y0: fy - h / 2, x1: fx + w / 2, y1: fy + h / 2 }
        const mosso = Math.hypot(fx - (b0.x0 + b0.x1) / 2, fy - (b0.y0 + b0.y1) / 2) / Math.max(s.W, s.H)
        const c = costoDi(b) + 0.25 * mosso + 0.5 * (1 - k)
        if (c < best.c - 0.02) best = { c, x: t.x + (fx - (b0.x0 + b0.x1) / 2) / s.W, y: t.y + (fy - (b0.y0 + b0.y1) / 2) / s.H, k }
      }
    }
    if (best.x !== t.x || best.y !== t.y || best.k !== 1) {
      t.x = best.x; t.y = best.y
      if (best.k !== 1) { t.scale *= best.k; if (t.meta) t.meta.size *= best.k }
      note.push(best.k < 1 ? 'un testo toccava altro: lo sposto e lo rimpicciolisco' : 'un testo toccava altro: lo sposto')
    }
    posati.push(t)
  }
  return { sheet: { ...s, layers: L }, note }
}
