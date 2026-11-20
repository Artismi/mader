/**
 * Tipografia espressiva, con due sole regole ferme:
 *  1. il testo piccolo non finisce mai sotto o sopra il testo grande (rettangoli che non si toccano);
 *  2. il testo si legge: se lo sfondo sotto non contrasta, il testo cambia colore, prende un alone,
 *     un contorno o una sottolineatura a evidenziatore; la piastra piena è l'ultima risorsa.
 * Dentro queste regole: titoli enormi che attraversano l'immagine e cambiano colore dove passano
 * sopra i segni, parole impilate a tutta larghezza, titoli verticali lungo il bordo, colonne strette,
 * titolo in alto e testo in basso, titolo centrato sull'immagine.
 */
import { pick, range, type Rnd } from '../core/rng'
import { FACES, loadLabFonts, perCarattere, type FaceId } from '@/components/studio/genera/fonts'
import { fontCss, type Face } from '@/components/studio/genera/raster'
import { newCanvas, withLayer, flatten, type Sheet } from './sheet'
import { ratio } from '../eyes/judgement'

export type Impagina = 'blocco' | 'gigante' | 'impilato' | 'verticale' | 'colonna' | 'divaricato' | 'centrato'
interface Rett { x0: number; y0: number; x1: number; y1: number }
const tocca = (a: Rett, b: Rett, m = 0.012) => !(a.x1 + m < b.x0 || b.x1 + m < a.x0 || a.y1 + m < b.y0 || b.y1 + m < a.y0)
const hx = (a: number, b: number, c: number) => '#' + [a, b, c].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
let nid = 0
const lid = () => `t${Date.now().toString(36)}${(nid++).toString(36)}`

function mediaSotto(s: Sheet, r: Rett): string {
  const c = flatten(s, 0.2), g = c.getContext('2d')!
  const X = Math.max(0, Math.floor(r.x0 * c.width)), Y = Math.max(0, Math.floor(r.y0 * c.height))
  const w = Math.max(1, Math.min(c.width - X, Math.ceil((r.x1 - r.x0) * c.width))), h = Math.max(1, Math.min(c.height - Y, Math.ceil((r.y1 - r.y0) * c.height)))
  const d = g.getImageData(X, Y, w, h).data
  let R = 0, G = 0, B = 0, n = 0, var_ = 0
  const lum: number[] = []
  for (let i = 0; i < d.length; i += 16) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++; lum.push(d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) }
  const m = lum.reduce((a, b) => a + b, 0) / Math.max(1, lum.length)
  for (const l of lum) var_ += (l - m) ** 2
  ;(mediaSotto as unknown as { varianza: number }).varianza = Math.sqrt(var_ / Math.max(1, lum.length))
  return hx(R / n, G / n, B / n)
}

interface Righe { cv: HTMLCanvasElement; w: number; h: number }
/** compone un testo in un canvas: righe, interlinea, contorno, alone, evidenziatore */
function righe(text: string, F: Face, sizePx: number, maxPx: number, color: string, o: { lead?: number; stroke?: string; alone?: string; evid?: string; align?: CanvasTextAlign; impila?: boolean } = {}): Righe {
  const T = perCarattere(F.upper ? text.toUpperCase() : text, F.family)
  const probe = newCanvas(4, 4).getContext('2d')!
  probe.font = fontCss(F, sizePx)
  let lines: string[]
  if (o.impila) lines = T.split(/\s+/).filter(Boolean)
  else {
    lines = []; let cur = ''
    for (const w of T.split(/\s+/)) { const t = cur ? cur + ' ' + w : w; if (probe.measureText(t).width > maxPx && cur) { lines.push(cur); cur = w } else cur = t }
    if (cur) lines.push(cur)
  }
  const lead = o.lead ?? 1.12
  const pad = sizePx * 0.35
  const tw = Math.max(...lines.map(l => probe.measureText(l).width), 10)
  const cv = newCanvas(Math.ceil(tw + pad * 2), Math.ceil(lines.length * sizePx * lead + pad * 2)), g = cv.getContext('2d')!
  g.font = fontCss(F, sizePx); g.textBaseline = 'top'; g.textAlign = o.align ?? 'left'
  const ax = o.align === 'right' ? cv.width - pad : o.align === 'center' ? cv.width / 2 : pad
  lines.forEach((l, i) => {
    const y = pad + i * sizePx * lead
    if (o.evid) { const lw = probe.measureText(l).width; const lx = o.align === 'right' ? ax - lw : o.align === 'center' ? ax - lw / 2 : ax; g.fillStyle = o.evid; g.fillRect(lx - sizePx * 0.12, y + sizePx * 0.05, lw + sizePx * 0.24, sizePx * 1.0) }
    if (o.alone) { g.strokeStyle = o.alone; g.lineWidth = sizePx * 0.32; g.lineJoin = 'round'; g.globalAlpha = 0.85; g.strokeText(l, ax, y); g.globalAlpha = 1 }
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = Math.max(1.5, sizePx * 0.06); g.lineJoin = 'round'; g.strokeText(l, ax, y) }
    g.fillStyle = color; g.fillText(l, ax, y)
  })
  return { cv, w: cv.width, h: cv.height }
}

export interface Testi { titolo: string; corpo?: string; fonte?: string; numero?: string }
export interface StileTipo { face: FaceId; lettura: FaceId; colori: string[]; bg: string; maiuscolo?: boolean; barra?: boolean; espressivo?: boolean; zona?: { x0: number; y0: number; x1: number }
  /** solo le lettere, senza aloni, contorni né evidenziatori (chi lo usa decide il colore da sé) */
  nudo?: boolean }

/** impagina titolo, corpo e fonte con un'idea tipografica scelta; restituisce il foglio e l'impaginazione usata */
export async function impaginaTesti(s0: Sheet, r: Rnd, t: Testi, st: StileTipo, vietate: Impagina[] = []): Promise<{ sheet: Sheet; modo: Impagina }> {
  await loadLabFonts()
  // le parole già messe dagli strumenti diventano trama: sbiadite, mai in competizione con il testo da leggere
  let s: Sheet = { ...s0, layers: s0.layers.map(l => (l.kind === 'tipografia' || l.kind === 'testo') ? { ...l, alpha: Math.min(l.alpha, 0.16) } : l) }
  const M = Math.min(s.W, s.H)
  const FT: Face = FACES[st.face] ?? FACES.grotesk, FL: Face = FACES[st.lettura] ?? FACES.corsivo
  const titolo = st.maiuscolo ? t.titolo.toUpperCase() : t.titolo
  const corto = titolo.length <= 34
  const modi: Impagina[] = (['blocco', 'gigante', 'impilato', 'verticale', 'colonna', 'divaricato', 'centrato'] as Impagina[])
    .filter(m => !vietate.includes(m))
    .filter(m => (m === 'gigante' || m === 'impilato' || m === 'centrato' ? corto || st.espressivo : true))
    .filter(m => (m === 'verticale' ? titolo.length <= 40 : true))
  const pesi: Record<Impagina, number> = { blocco: 1, gigante: st.espressivo ? 2 : 1, impilato: corto ? 1.6 : 0.4, verticale: 0.9, colonna: 1, divaricato: 1.2, centrato: st.espressivo ? 1.4 : 0.8 }
  const modo: Impagina = modi.length ? pickPesato(r, modi, pesi) : 'blocco'
  const occupati: Rett[] = []
  const metti = (cv: HTMLCanvasElement, x0: number, y0: number, rot = 0, kind = 'testo') => {
    const w = cv.width / s.W, h = cv.height / s.H
    const rw = rot ? h * (s.H / s.W) : w, rh = rot ? w * (s.W / s.H) : h
    const rect = { x0, y0, x1: x0 + rw, y1: y0 + rh }
    s = withLayer(s, { id: lid(), kind, canvas: cv, x: x0 + rw / 2, y: y0 + rh / 2, scale: Math.max(cv.width, cv.height) / M, rot, alpha: 1, blend: 'source-over' })
    occupati.push(rect)
    return rect
  }
  // il colore che si legge su ciò che c'è sotto (fra quelli della tavolozza); e se non basta, un trattamento
  type Tratt = { color: string; stroke?: string; alone?: string; evid?: string }
  const leggibile = (rect: Rett, grande: boolean): Tratt => {
    const sotto = mediaSotto(s, rect)
    const varianza = (mediaSotto as unknown as { varianza: number }).varianza ?? 0
    const cand = [...st.colori, st.bg, '#111111', '#f4f2ec']
    const col = cand.slice().sort((a, b) => ratio(b, sotto) - ratio(a, sotto))[0]
    const contr = ratio(col, sotto)
    const opposto = ratio('#111111', col) > ratio('#f4f2ec', col) ? '#111111' : '#f4f2ec'
    const soglia = grande ? 3 : 4.5
    if (st.nudo) return { color: col }
    if (contr >= soglia && varianza < 45) return { color: col }
    // sotto c'è materia: alone (piccolo) o contorno/evidenziatore (grande)
    if (!grande) return { color: col, alone: opposto }
    if (st.barra) return { color: opposto === '#111111' ? '#f4f2ec' : '#111111', evid: st.colori.find(c => ratio(c, opposto === '#111111' ? '#f4f2ec' : '#111111') > 3) ?? opposto }
    return pick<Tratt>(r, [{ color: col, stroke: opposto }, { color: col, alone: opposto }])
  }
  const W = s.W, H = s.H
  const z = st.zona ?? { x0: 0.07, y0: 0.62, x1: 0.93 }

  // ── il titolo ──
  let rTit: Rett
  const prova = (size: number, maxW: number, o: Parameters<typeof righe>[5] = {}) => righe(titolo, FT, size * M, maxW * W, '#000', o)
  switch (modo) {
    case 'gigante': case 'centrato': {
      let size = modo === 'gigante' ? range(r, 0.13, 0.19) : range(r, 0.08, 0.11)
      let p = prova(size, 0.9, { lead: 0.92, align: modo === 'centrato' ? 'center' : 'left' })
      while ((p.h / H > 0.55 || p.w / W > 0.95) && size > 0.05) { size *= 0.88; p = prova(size, 0.9, { lead: 0.92, align: modo === 'centrato' ? 'center' : 'left' }) }
      const x0 = modo === 'centrato' ? (1 - p.w / W) / 2 : 0.04, y0 = modo === 'centrato' ? 0.5 - p.h / H / 2 - 0.06 : pick(r, [0.06, 0.5 - p.h / H / 2, 0.92 - p.h / H])
      const rect = { x0, y0, x1: x0 + p.w / W, y1: y0 + p.h / H }
      const tr = leggibile(rect, true)
      const fin = righe(titolo, FT, size * M, 0.9 * W, tr.color, { lead: 0.92, align: modo === 'centrato' ? 'center' : 'left', stroke: tr.stroke, alone: tr.alone, evid: tr.evid })
      rTit = metti(fin.cv, x0, y0)
      // il titolo cambia colore dove passa sopra i segni
      contrappunto(s, fin, rTit, st, (cv) => { s = withLayer(s, { id: lid(), kind: 'testo', canvas: cv, x: (rTit.x0 + rTit.x1) / 2, y: (rTit.y0 + rTit.y1) / 2, scale: Math.max(cv.width, cv.height) / M, rot: 0, alpha: 1, blend: 'source-over' }) })
      break
    }
    case 'impilato': {
      let size = 0.11
      let p = prova(size, 0.9, { impila: true, lead: 0.9 })
      while (p.h / H > 0.62 && size > 0.05) { size *= 0.88; p = prova(size, 0.9, { impila: true, lead: 0.9 }) }
      const x0 = pick(r, [0.05, 0.95 - p.w / W]), y0 = pick(r, [0.06, 0.94 - p.h / H])
      const tr = leggibile({ x0, y0, x1: x0 + p.w / W, y1: y0 + p.h / H }, true)
      const fin = righe(titolo, FT, size * M, 0.9 * W, tr.color, { impila: true, lead: 0.9, stroke: tr.stroke, alone: tr.alone, evid: tr.evid })
      rTit = metti(fin.cv, x0, y0)
      contrappunto(s, fin, rTit, st, (cv) => { s = withLayer(s, { id: lid(), kind: 'testo', canvas: cv, x: (rTit.x0 + rTit.x1) / 2, y: (rTit.y0 + rTit.y1) / 2, scale: Math.max(cv.width, cv.height) / M, rot: 0, alpha: 1, blend: 'source-over' }) })
      break
    }
    case 'verticale': {
      let size = 0.075
      let p = prova(size, 1.1)
      while (p.w / H > 0.9 && size > 0.035) { size *= 0.88; p = prova(size, 1.1) }
      const larg = p.h / W, lung = p.w / H
      const sx = r() < 0.5 ? 0.03 : 0.97 - larg
      const y0 = 0.5 - lung / 2
      const tr = leggibile({ x0: sx, y0, x1: sx + larg, y1: y0 + lung }, true)
      const fin = righe(titolo, FT, size * M, 1.1 * W, tr.color, { stroke: tr.stroke, alone: tr.alone, evid: tr.evid })
      rTit = metti(fin.cv, sx, y0, sx < 0.5 ? -Math.PI / 2 : Math.PI / 2)
      break
    }
    case 'colonna': {
      const colW = 0.34, x0 = r() < 0.5 ? 0.06 : 0.94 - colW
      let size = 0.05
      let p = prova(size, colW)
      while (p.h / H > 0.4 && size > 0.03) { size *= 0.9; p = prova(size, colW) }
      const y0 = pick(r, [0.08, 0.3])
      const tr = leggibile({ x0, y0, x1: x0 + p.w / W, y1: y0 + p.h / H }, true)
      rTit = metti(righe(titolo, FT, size * M, colW * W, tr.color, { stroke: tr.stroke, alone: tr.alone, evid: tr.evid }).cv, x0, y0)
      break
    }
    case 'divaricato': {
      let size = corto ? 0.07 : 0.05
      let p = prova(size, 0.86)
      while (p.h / H > 0.3 && size > 0.03) { size *= 0.9; p = prova(size, 0.86) }
      const x0 = 0.06, y0 = 0.05
      const tr = leggibile({ x0, y0, x1: x0 + p.w / W, y1: y0 + p.h / H }, true)
      rTit = metti(righe(titolo, FT, size * M, 0.86 * W, tr.color, { stroke: tr.stroke, alone: tr.alone, evid: tr.evid }).cv, x0, y0)
      break
    }
    default: {
      let size = titolo.length > 60 ? 0.042 : 0.055
      let p = prova(size, Math.min(0.86, z.x1 - z.x0))
      while (p.h / H > 0.3 && size > 0.03) { size *= 0.9; p = prova(size, Math.min(0.86, z.x1 - z.x0)) }
      const y0 = Math.min(z.y0, 0.93 - p.h / H - 0.12)
      const tr = leggibile({ x0: z.x0, y0, x1: z.x0 + p.w / W, y1: y0 + p.h / H }, true)
      rTit = metti(righe(titolo, FT, size * M, Math.min(0.86, z.x1 - z.x0) * W, tr.color, { stroke: tr.stroke, alone: tr.alone, evid: tr.evid }).cv, z.x0, y0)
    }
  }

  // ── il corpo e la fonte: in uno spazio libero, mai sopra il titolo ──
  const piccoli: { text: string; size: number; maxW: number; F: Face }[] = []
  if (t.corpo) piccoli.push({ text: t.corpo.length > 420 ? t.corpo.slice(0, 420).replace(/\s\S*$/, '') + '…' : t.corpo, size: t.corpo.length > 260 ? 0.022 : 0.026, maxW: modo === 'colonna' ? 0.34 : 0.6, F: FL })
  if (t.fonte) piccoli.push({ text: t.fonte, size: 0.015, maxW: 0.7, F: FACES.mono })
  for (const p of piccoli) {
    let size = p.size, prov = righe(p.text, p.F, size * M, p.maxW * W, '#000')
    const posti = (w: number, h: number): Rett[] => {
      const below = { x0: rTit.x0 < 0.5 ? Math.max(0.06, rTit.x0) : 0.06, y0: rTit.y1 + 0.02 }, above = { x0: below.x0, y0: rTit.y0 - 0.02 - h }
      return [
        { x0: below.x0, y0: below.y0 }, { x0: above.x0, y0: above.y0 },
        { x0: 0.06, y0: 0.94 - h }, { x0: 0.94 - w, y0: 0.94 - h }, { x0: 0.06, y0: 0.06 }, { x0: 0.94 - w, y0: 0.06 }, { x0: 0.06, y0: 0.5 - h / 2 }, { x0: 0.94 - w, y0: 0.5 - h / 2 },
      ].map(q => ({ x0: q.x0, y0: q.y0, x1: q.x0 + w, y1: q.y0 + h })).filter(q => q.x0 >= 0.03 && q.y0 >= 0.05 && q.x1 <= 0.97 && q.y1 <= 0.97)
    }
    let posto: Rett | undefined
    for (let k = 0; k < 5 && !posto; k++) {
      const liberi = posti(prov.w / W, prov.h / H).filter(q => !occupati.some(o => tocca(o, q)))
      // fra i posti liberi, quello più calmo sotto (poca materia = si legge meglio)
      posto = liberi.map((q, i) => { mediaSotto(s, q); return { q, v: (mediaSotto as unknown as { varianza: number }).varianza + i * 2 } }).sort((a, b) => a.v - b.v)[0]?.q
      if (!posto) { size *= 0.88; prov = righe(p.text, p.F, size * M, p.maxW * W, '#000') }
    }
    if (!posto) continue
    const tr = leggibile(posto, false)
    metti(righe(p.text, p.F, size * M, p.maxW * W, tr.color, { alone: tr.alone }).cv, posto.x0, posto.y0)
  }
  if (t.numero) {
    const n = righe(t.numero, FACES.mono, 0.016 * M, 0.2 * W, '#000')
    const q = [{ x0: 0.05, y0: 0.03 }, { x0: 0.95 - n.w / W, y0: 0.03 }, { x0: 0.95 - n.w / W, y0: 0.96 - n.h / H }].map(a => ({ ...a, x1: a.x0 + n.w / W, y1: a.y0 + n.h / H })).find(a => !occupati.some(o => tocca(o, a, 0)))
    if (q) { const tr = leggibile(q, false); metti(righe(t.numero, FACES.mono, 0.016 * M, 0.2 * W, tr.color).cv, q.x0, q.y0) }
  }
  return { sheet: s, modo }
}

function pickPesato<T extends string>(r: Rnd, xs: T[], w: Record<T, number>): T {
  const tot = xs.reduce((a, x) => a + w[x], 0)
  let v = r() * tot
  for (const x of xs) { v -= w[x]; if (v <= 0) return x }
  return xs[xs.length - 1]
}

/** dove il titolo passa sopra un segno, le lettere cambiano colore (il segno le "accende") */
function contrappunto(s: Sheet, fin: Righe, rect: Rett, st: StileTipo, aggiungi: (cv: HTMLCanvasElement) => void) {
  const segni = s.layers.filter(l => l.kind === 'motivo')
  if (!segni.length) return
  const k = fin.cv.width / ((rect.x1 - rect.x0) * s.W)
  const maschera = flatten({ ...s, bg: 'rgba(0,0,0,0)', layers: segni }, 1)
  const cv = newCanvas(fin.cv.width, fin.cv.height), g = cv.getContext('2d')!
  g.drawImage(maschera, rect.x0 * s.W, rect.y0 * s.H, (rect.x1 - rect.x0) * s.W, (rect.y1 - rect.y0) * s.H, 0, 0, cv.width, cv.height)
  void k
  g.globalCompositeOperation = 'destination-in'; g.drawImage(fin.cv, 0, 0)
  // il colore medio dei segni sotto le lettere: il nuovo colore deve staccarsene
  const d = g.getImageData(0, 0, cv.width, cv.height).data
  let R = 0, G = 0, B = 0, n = 0
  for (let i = 0; i < d.length; i += 32) if (d[i + 3] > 128) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++ }
  if (n < 20) return
  const sotto = hx(R / n, G / n, B / n)
  const col = [...st.colori, st.bg, '#111111', '#f4f2ec'].sort((a, b) => ratio(b, sotto) - ratio(a, sotto))[0]
  if (ratio(col, sotto) < 3) return
  g.globalCompositeOperation = 'source-in'
  g.fillStyle = col
  g.fillRect(0, 0, cv.width, cv.height)
  aggiungi(cv)
}
