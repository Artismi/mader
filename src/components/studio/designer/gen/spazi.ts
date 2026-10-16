/**
 * Controllo degli spazi sulle misure vere (P1 di docs/varieta-e-affinamento.md).
 *
 * Un passaggio unico per tutti gli archetipi, alla fine (in `finish`, prima di `check`):
 * di ogni testo si leggono i riquadri d'inchiostro riga per riga con i caratteri veri
 * del render, poi si verificano margini, contatti e aria minima tra testi di gruppi
 * diversi, in proporzione al corpo. Le sovrapposizioni volute sono marcate
 * `sovrapponibile` dall'archetipo; testi decorativi e ruotati restano a `check`.
 *
 * Correzione, in quest'ordine: si sposta il testo secondario, se no si riduce il corpo
 * (al massimo del 12%, mai sotto il corpo minimo), se no si accorcia (righe finali del
 * testo, o si toglie un secondario facoltativo); se non basta la tavola si scarta.
 * Gli allineamenti mancati di poco li ripara già il critico (`ripara`).
 */
import type { SceneEl, Intreccio, Look } from '../types'
import { inkLine } from '../text'
import { baseline } from '../core/metriche'
import { corpoMinimo } from '../core/scala'
import type { G } from './tools'

type Text = Extract<SceneEl, { kind: 'text' }>
type R = { x0: number; y0: number; x1: number; y1: number }

const gruppo = (n: string) => (n.includes('#') ? n.split('#')[0] : n)
/** chi cede quando due testi si toccano: prima i secondari, mai il titolo */
const RANGO: [RegExp, number][] = [[/^titolo/, 9], [/^(brand|marchio)/, 8], [/^(invito|cta)/, 7], [/^(voce|valore|numero)/, 6], [/^occhiello/, 5], [/^testo$/, 4]]
const rango = (t: Text) => RANGO.find(([re]) => re.test(t.name))?.[1] ?? 2
/** secondari che si possono togliere senza perdere il contenuto del brief */
const FACOLTATIVO = /^(dettagli|intestazione|saluto|didascalia|nota|folio|indice)/

/** Riquadri d'inchiostro delle righe di un testo, in coordinate della tavola. */
export function righeVere(t: Text): R[] {
  return t.lines.map((l, i) => {
    const k = inkLine(l, t.font, t.size, t.tracking)
    const x = t.x + (t.align === 'left' ? 0 : t.align === 'right' ? t.w - k.w : (t.w - k.w) / 2)
    const b = baseline(t.y, t.size, t.lineHeight, i)
    return { x0: x - k.l, x1: x + k.r, y0: b - k.a, y1: b + k.d }
  }).filter(r => r.x1 > r.x0 && r.y1 > r.y0)
}

/** Quanto manca all'aria minima tra due testi (0 = va bene); `dy` = spostamento verticale che la ristabilisce per b. */
function conflitto(a: R[], b: R[], aria: number) {
  let peggio = 0, dy = 0
  for (const p of a) for (const q of b) {
    const gx = Math.max(q.x0 - p.x1, p.x0 - q.x1), gy = Math.max(q.y0 - p.y1, p.y0 - q.y1)
    // la distanza vera tra i due riquadri (in diagonale se non si affiancano)
    const d = gx > 0 && gy > 0 ? Math.hypot(gx, gy) : Math.max(gx, gy)
    const manca = aria - d
    if (manca > peggio) { peggio = manca; dy = gy >= gx ? ((q.y0 + q.y1) / 2 >= (p.y0 + p.y1) / 2 ? 1 : -1) * (aria - gy) : 0 }
  }
  return { manca: peggio, dy }
}

/** Le correzioni finiscono nel registro del banco di prova (vetrina, schede), come gli scarti. */
const annota = (g: G, cosa: string) => { (globalThis as { __designerSink?: string[] }).__designerSink?.push(`${g.k.sistema}: spazi ${cosa}`) }

/** null se gli spazi vanno (eventualmente dopo le correzioni), altrimenti il motivo per scartare. */
export function spazi(g: G): string | null {
  const u = g.u, pad = g.m * 0.4
  const tutti = () => g.els.filter((e): e is Text => e.kind === 'text' && !e.deco && !e.angle)
  const aria = (a: Text, b: Text) => Math.max(8 * u, 0.32 * Math.min(a.size, b.size))
  const dentro = (rs: R[]) => rs.every(r => r.x0 >= pad - 1 && r.y0 >= pad - 1 && r.x1 <= g.W - pad + 1 && r.y1 <= g.H - pad + 1)
  const libero = (t: Text, lista: Text[]) => {
    const rs = righeVere(t)
    return dentro(rs) && lista.every(o => o === t || o.sovrapponibile || t.sovrapponibile || gruppo(o.name) === gruppo(t.name) || conflitto(righeVere(o), rs, aria(o, t)).manca <= 0.5)
  }

  // margini: un testo che sborda di poco rientra
  for (const t of tutti()) {
    const rs = righeVere(t)
    if (!rs.length || dentro(rs)) continue
    const x0 = Math.min(...rs.map(r => r.x0)), x1 = Math.max(...rs.map(r => r.x1)), y0 = Math.min(...rs.map(r => r.y0)), y1 = Math.max(...rs.map(r => r.y1))
    const dx = x0 < pad ? pad - x0 : x1 > g.W - pad ? g.W - pad - x1 : 0
    const dy = y0 < pad ? pad - y0 : y1 > g.H - pad ? g.H - pad - y1 : 0
    if (Math.hypot(dx, dy) > g.W * 0.03) continue // lo sbordo grande è una scelta o un errore: decide `check`
    t.x += dx; t.y += dy
    annota(g, `rientrato ${t.name}`)
  }

  for (let giro = 0; giro < 8; giro++) {
    const lista = tutti()
    let trovato: { a: Text; b: Text; dy: number } | null = null
    for (let i = 0; i < lista.length && !trovato; i++) for (let j = i + 1; j < lista.length; j++) {
      const a = lista[i], b = lista[j]
      if (a.sovrapponibile || b.sovrapponibile || gruppo(a.name) === gruppo(b.name)) continue
      const c = conflitto(righeVere(a), righeVere(b), aria(a, b))
      if (c.manca <= 0.5) continue
      // b è chi cede: rango più basso, a parità il corpo più piccolo
      const cede = rango(b) < rango(a) || (rango(b) === rango(a) && b.size <= a.size)
      trovato = cede ? { a, b, dy: c.dy } : { a: b, b: a, dy: -c.dy }
      break
    }
    if (!trovato) return null
    const { b } = trovato
    const salva = { x: b.x, y: b.y, size: b.size, w: b.w, tw: b.tw, h: b.h, lines: b.lines }
    const torna = () => { Object.assign(b, salva) }

    // 1. spostare il secondario, nella direzione che lo allontana (al massimo un paio di righe)
    if (trovato.dy && Math.abs(trovato.dy) < b.size * 2.5) {
      b.y += trovato.dy + Math.sign(trovato.dy)
      if (libero(b, lista)) { annota(g, `spostato ${b.name}`); continue }
      torna()
    }
    // 2. ridurre il corpo tenendo fermo l'allineamento, mai sotto il minimo per il telefono
    const min = b.name.startsWith('titolo') ? 0 : corpoMinimo(b.name, g.format, g.W)
    let ok = false
    for (const f of [0.96, 0.92, 0.88]) {
      if (salva.size * f < min) break
      Object.assign(b, { size: salva.size * f, tw: salva.tw * f, h: salva.h * f })
      if (b.align !== 'left') { b.w = salva.w * f; b.x = salva.x + (salva.w - b.w) * (b.align === 'right' ? 1 : 0.5) }
      if (libero(b, lista)) { ok = true; break }
      torna()
    }
    if (ok) { annota(g, `ridotto ${b.name}`); continue }
    // 3. accorciare: le righe finali di un testo lungo (con i puntini), o via un secondario facoltativo
    if (rango(b) <= 4 && b.lines.length > 1) {
      for (let n = b.lines.length - 1; n >= 1 && !ok; n--) {
        b.lines = [...salva.lines.slice(0, n - 1), salva.lines[n - 1].replace(/[\s,.;:]*$/, '') + '…']
        b.h = salva.h - (salva.lines.length - n) * b.size * b.lineHeight
        ok = libero(b, lista)
      }
      if (ok) { annota(g, `accorciato ${b.name}`); continue }
      torna()
    }
    if (FACOLTATIVO.test(b.name)) { g.els = g.els.filter(e => e !== b); annota(g, `tolto ${b.name}`); continue }
    // 4. niente da fare: la tavola si scarta
    return `spazi: ${trovato.a.name} e ${b.name} troppo vicini`
  }
  return null
}

/** Quota coperta di ogni riga del testo (campioni sui riquadri d'inchiostro) da una zona. */
export function copertura(t: Text, dentro: (x: number, y: number) => boolean) {
  return righeVere(t).map(r => {
    let n = 0, c = 0
    for (let fx = 0.05; fx < 1; fx += 0.075) for (const fy of [0.2, 0.5, 0.8]) { n++; if (dentro(r.x0 + (r.x1 - r.x0) * fx, r.y0 + (r.y1 - r.y0) * fy)) c++ }
    return c / n
  })
}
/** Il punto sta nel mezzo disco (n = verso della metà; n nullo = disco intero). */
export const nelMezzoDisco = (a: { cx: number; cy: number; r: number; nx: number; ny: number }, x: number, y: number) =>
  Math.hypot(x - a.cx, y - a.cy) <= a.r && (x - a.cx) * a.nx + (y - a.cy) * a.ny >= 0
/** Il punto sta nell'area coperta dall'intreccio (mezzo disco o rettangolo). */
export const nellArea = (a: NonNullable<Intreccio['area']>, x: number, y: number) =>
  'r' in a ? nelMezzoDisco(a, x, y) : x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h

/** Più di un quarto di una riga coperto: le lettere non si riconoscono più. */
const MAX_COPERTO = 0.25

/**
 * Intrecci voluti (V1): elementi che stanno sopra i testi per scelta (il titolo che
 * passa dietro la foto, la foto nelle lettere). La regola di leggibilità: la parte da
 * leggere resta sopra o in contrasto. Il testo dichiarato (`copre`) può perdere al
 * massimo un quarto di ogni riga; gli altri testi del messaggio niente. Un intreccio
 * che rompe la regola è una sovrapposizione sbagliata: si toglie (la tavola resta,
 * senza il gesto); un elemento sopra i testi senza intreccio dichiarato fa scartare.
 */
export function intrecci(g: G): string | null {
  const testi = g.els.filter((e): e is Text => e.kind === 'text' && !e.deco && (e.opacity ?? 1) > 0.05)
  const primo = g.els.findIndex(e => e.kind === 'text' && !e.deco)
  if (primo < 0) return null
  const via = new Set<Intreccio>()
  for (const e of g.els.slice(primo + 1)) {
    if (e.kind === 'text' || e.kind === 'seal' || e.kind === 'arcText') continue
    const ii = (e as Look).intreccio
    if (!ii?.sopra) return `spazi: ${e.name} sopra i testi senza intreccio dichiarato`
    const bersaglio = testi.find(t => t.name === ii.copre)
    if (!bersaglio) { via.add(ii); continue }
    if (ii.tipo === 'foto-lettere') {
      // la foto sta solo dentro le lettere del titolo: serve un corpo da manifesto
      if (bersaglio.size < 90 * g.u || bersaglio.angle) via.add(ii)
      continue
    }
    if (!ii.area) { via.add(ii); continue }
    const area = ii.area
    for (const t of testi) {
      if (t.angle) continue
      const cop = copertura(t, (x, y) => nellArea(area, x, y))
      const max = gruppo(t.name) === gruppo(bersaglio.name) ? MAX_COPERTO : 0.02
      if (Math.max(0, ...cop) > max) { via.add(ii); break }
    }
  }
  if (via.size) {
    g.els = g.els.filter(e => !via.has((e as Look).intreccio as Intreccio))
    for (const ii of via) annota(g, `intreccio annullato ${ii.tipo}`)
  }
  return null
}
