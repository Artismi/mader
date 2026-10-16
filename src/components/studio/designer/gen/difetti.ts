/**
 * Misure dei difetti sulla scena composta (blocco A di robustezza), comuni a
 * controllo, critico e banco di prova:
 * - zone vuote (griglia 16×16) con il loro rettangolo libero più grande;
 * - sovrapposizioni non volute tra testo e qualunque elemento, sui riquadri d'inchiostro;
 * - testo tagliato (righe con i puntini) o saltato (campi del brief che non compaiono).
 * Il contrasto sui pixel veri sta in `pixel.ts` (serve il render).
 */
import type { DesignContent, SceneEl } from '../types'
import { textBox } from './tools'
import { righeVere } from './spazi'

type Text = Extract<SceneEl, { kind: 'text' }>
export type Box = { x: number; y: number; w: number; h: number }
export interface Tavola { W: number; H: number; u: number; els: SceneEl[] }

const isText = (e: SceneEl): e is Text => e.kind === 'text' && !e.deco
const gruppo = (n: string) => (n.includes('#') ? n.split('#')[0] : n)

/** Riquadro di un elemento (forme, foto, segni). */
export function boxEl(e: SceneEl): Box | null {
  switch (e.kind) {
    case 'rect': case 'image': case 'ornament': return { x: e.x, y: e.y, w: e.w, h: e.h }
    case 'circle': return { x: e.cx - e.r, y: e.cy - e.r, w: 2 * e.r, h: 2 * e.r }
    case 'glyph': return { x: e.cx - e.size / 2, y: e.cy - e.size / 2, w: e.size, h: e.size }
    case 'seal': case 'arcText': return { x: e.cx - e.r, y: e.cy - e.r, w: 2 * e.r, h: 2 * e.r }
    case 'line': return { x: Math.min(e.x1, e.x2), y: Math.min(e.y1, e.y2), w: Math.abs(e.x2 - e.x1) + 1, h: Math.abs(e.y2 - e.y1) + 1 }
    case 'path': {
      const n = (e.d.match(/-?\d*\.?\d+/g) ?? []).map(Number)
      if (n.length < 2) return null
      const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
    }
    default: return null
  }
}

/* ── vuoti ────────────────────────────────────────────────────────────── */
export const N_VUOTI = 16
export interface Zona { frac: number; celle: number[]; libero: Box }

/** Zone continue vuote (solo fondo o campi piatti grandi), dalla più grande, con il rettangolo libero più grande di ciascuna. */
export function zoneVuote(t: Tavola): Zona[] {
  const N = N_VUOTI, cw = t.W / N, ch = t.H / N, area = t.W * t.H
  const pieno = Array.from({ length: N * N }, () => false)
  for (const e of t.els) {
    let b: Box | null = null
    // la tipografia decorativa grande (parola gigante, eco, ripetizioni) è una massa progettata, non vuoto
    if (e.kind === 'text' && e.deco) { if (e.size >= 100 * t.u && (e.opacity ?? 1) >= 0.25) b = textBox(e) }
    else if (isText(e)) b = textBox(e)
    else if (e.kind === 'image' || e.kind === 'ornament' || e.kind === 'glyph' || e.kind === 'seal' || e.kind === 'arcText' || e.kind === 'line') b = boxEl(e)
    else if ((e.kind === 'rect' || e.kind === 'circle' || e.kind === 'path') && !/grana|fondo|carta/.test(e.name)) {
      const x = boxEl(e)
      // i campi piatti grandi sono fondo; le forme piccole e i tratti sono segni
      if (x && (x.w * x.h < area * 0.2 || (e as { stroke?: string }).stroke || (e as { fx?: unknown[] }).fx?.length)) b = x
    }
    if (!b) continue
    for (let i = Math.max(0, Math.floor(b.x / cw)); i <= Math.min(N - 1, Math.floor((b.x + b.w) / cw)); i++)
      for (let j = Math.max(0, Math.floor(b.y / ch)); j <= Math.min(N - 1, Math.floor((b.y + b.h) / ch)); j++) pieno[j * N + i] = true
  }
  const visto = new Set<number>()
  const zone: Zona[] = []
  for (let k = 0; k < N * N; k++) {
    if (pieno[k] || visto.has(k)) continue
    const celle: number[] = []
    const coda = [k]; visto.add(k)
    while (coda.length) {
      const c = coda.pop()!; celle.push(c)
      const i = c % N, j = Math.floor(c / N)
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj, nk = nj * N + ni
        if (ni >= 0 && nj >= 0 && ni < N && nj < N && !pieno[nk] && !visto.has(nk)) { visto.add(nk); coda.push(nk) }
      }
    }
    const r = rettangolo(new Set(celle), N)
    zone.push({ frac: celle.length / (N * N), celle, libero: { x: r.i * cw, y: r.j * ch, w: r.w * cw, h: r.h * ch } })
  }
  return zone.sort((a, b) => b.frac - a.frac)
}

/** Il rettangolo più grande fatto solo di celle della zona (istogramma per righe). */
function rettangolo(celle: Set<number>, N: number) {
  const alt = Array(N).fill(0)
  let best = { i: 0, j: 0, w: 0, h: 0 }
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) alt[i] = celle.has(j * N + i) ? alt[i] + 1 : 0
    for (let i = 0; i < N; i++) {
      let h = Infinity
      for (let k = i; k < N && alt[k]; k++) {
        h = Math.min(h, alt[k])
        if ((k - i + 1) * h > best.w * best.h) best = { i, j: j - h + 1, w: k - i + 1, h }
      }
    }
  }
  return best
}

/**
 * I vuoti non progettati: oltre il 10% della tavola; il più grande è ammesso fino al limite
 * del registro (più largo per i sobri) e, se l'idea è il vuoto, è sempre una scelta.
 */
export function vuotiNonProgettati(zone: Zona[], o: { sobrio?: boolean; voluto?: boolean }) {
  const limite = o.sobrio ? 0.38 : 0.28
  return zone.filter((z, i) => z.frac > 0.1 && (i > 0 || z.frac > limite)).slice(o.voluto ? 1 : 0)
}

/* ── sovrapposizioni ─────────────────────────────────────────────────── */
/** Segni sotto i testi per progetto (blob, tratti, veli, fondi, trame leggere), non sovrapposizioni. */
const SOTTO_VOLUTO = /^(fondo|grana|carta|texture|blob|segno|tratto|sottolin|evidenz|velo|fascia|alone|pannello|bollo|campo|ponte|cornice|bordo)/
export interface Sovrapposizione { testo: string; con: string; quota: number; el?: SceneEl }

const area = (b: Box) => Math.max(0, b.w) * Math.max(0, b.h)
const inter = (a: Box, b: Box) => area({ x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), w: Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h: Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) })
const daR = (r: { x0: number; y0: number; x1: number; y1: number }): Box => ({ x: r.x0, y: r.y0, w: r.x1 - r.x0, h: r.y1 - r.y0 })

/**
 * Sovrapposizioni non volute, misurate sulle righe d'inchiostro: testi di gruppi diversi che
 * si toccano, e segni (forme piccole, filetti, glifi, sigilli, trame sopra) che tagliano in
 * parte una riga. Il testo che sconfina su una foto o su un campo grande è un gesto
 * (la leggibilità la misura il contrasto sui pixel); un segno che contiene tutta la riga è un
 * fondo. Restano fuori gli intrecci dichiarati e le sovrapposizioni `sovrapponibile`.
 */
export function sovrapposizioni(t: Tavola): Sovrapposizione[] {
  const out: Sovrapposizione[] = []
  const testi = t.els.filter((e): e is Text => isText(e) && !e.angle && (e.opacity ?? 1) > 0.05)
  const righe = new Map(testi.map(x => [x, righeVere(x).map(daR)]))
  for (let i = 0; i < testi.length; i++) for (let j = i + 1; j < testi.length; j++) {
    const a = testi[i], b = testi[j]
    if (a.sovrapponibile || b.sovrapponibile || gruppo(a.name) === gruppo(b.name)) continue
    let q = 0
    for (const p of righe.get(a)!) for (const r of righe.get(b)!) q = Math.max(q, inter(p, r) / Math.max(1, Math.min(area(p), area(r))))
    if (q > 0.02) out.push({ testo: a.name, con: b.name, quota: q })
  }
  const tav = t.W * t.H
  for (const e of t.els) {
    if (e.kind === 'text' || (e as { intreccio?: unknown }).intreccio || SOTTO_VOLUTO.test(e.name)) continue
    if (e.kind === 'ornament' && (e.under || /^(tex|lib|cc0):/.test(e.id))) continue
    if (e.kind === 'image' && (e.clipText || area(boxEl(e)!) > tav * 0.03)) continue
    if ((e.kind === 'rect' || e.kind === 'path' || e.kind === 'circle') && !(e as { stroke?: string }).stroke && (e as { opacity?: number }).opacity !== undefined && (e as { opacity?: number }).opacity! < 0.3) continue
    const b = boxEl(e)
    if (!b || area(b) > tav * 0.03 && e.kind !== 'line' && e.kind !== 'ornament' && !(e as { stroke?: string }).stroke) continue
    for (const x of testi) {
      if (x.sovrapponibile) continue
      let q = 0
      for (const r of righe.get(x)!) {
        // un fondo che contiene tutta la riga non è una sovrapposizione
        const c = inter(r, b) / Math.max(1, area(r))
        if (c < 0.97) q = Math.max(q, c)
      }
      if (q > 0.04) { out.push({ testo: x.name, con: e.name, quota: q, el: e }); break }
    }
  }
  return out
}

/* ── testo tagliato o saltato ───────────────────────────────────────── */
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9%€]+/g, ' ').trim()
const parole = (s: string) => norm(s).split(' ').filter(w => w.length > 2 || /\d/.test(w))

/** Tutto il testo che si legge nella scena (anche decorativo, archi e sigilli), con gli a capo sillabati ricuciti. */
export function testoScena(els: SceneEl[]) {
  return els.map(e => e.kind === 'text' ? e.lines.join('\n').replace(/[-‐]\n/g, '').replace(/\n/g, ' ') : e.kind === 'arcText' || e.kind === 'seal' ? e.text : '').join(' ')
}

/**
 * Campi del brief tagliati (righe che finiscono coi puntini, quota di parole sotto il 60%)
 * o saltati (meno di un quarto delle parole). `togli` = campi tolti di proposito dall'idea.
 */
export function testoMancante(els: SceneEl[], c: DesignContent, togli: string[] = []) {
  const visto = new Set(parole(testoScena(els)))
  const quota = (s: string) => { const p = [...new Set(parole(s))]; return p.length ? p.filter(w => visto.has(w)).length / p.length : 1 }
  const campi: [string, string | undefined][] = [
    ['titolo', c.title], ['brand', c.brand], ['invito', c.cta], ['occhiello', c.kicker], ['numero', c.numero],
    ...(togli.includes('testo') ? [] : [['testo', c.body] as [string, string | undefined]]),
    ...(togli.includes('dettagli') ? [] : (c.details ?? []).map((d, i) => [`dettaglio ${i + 1}`, d] as [string, string])),
    ...(c.voci ?? []).map((v, i) => [`voce ${i + 1}`, [v.titolo, v.valore, v.ora].filter(Boolean).join(' ')] as [string, string]),
  ]
  const tagliati: string[] = [], saltati: string[] = []
  for (const [nome, s] of campi) {
    if (!s?.trim()) continue
    const q = quota(s)
    // sotto un quarto delle parole il campo non c'è (le poche trovate vengono da altri campi)
    if (q < 0.25) saltati.push(nome)
    else if (q < 0.6) tagliati.push(nome)
  }
  if (els.some(e => e.kind === 'text' && !e.deco && e.lines.some(l => /…\s*$/.test(l)))) tagliati.push('righe coi puntini')
  return { tagliati, saltati }
}
