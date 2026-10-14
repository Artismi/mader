/**
 * Tipi di contenuto oltre la copertina: consigli, passi, dati, confronto,
 * programma, menu, domande e risposte, prodotto, timeline. Ogni sistema ha due
 * impaginazioni (scelte dal seme) e parla il registro dello stile: card
 * arrotondate o blob (morbido), filetti e griglia (netto), tratti a mano
 * (mano), scarti e segni (decostruito).
 */
import type { Scene, TipoContenuto, Voce } from '../types'
import {
  type G, put, U, txt, lab, para, display, putLab, putPara, putDisplay, photo, finish, sizeForWidth, ctaText, mix, alpha, readable, contrast, words, discard,
} from './tools'
import { ink } from './systems'
import { blobPath, wobblyPath, scribbleEllipse, starPath, sticker } from './forme'
import { lineWidth } from '../text'

type Box = { x: number; y: number; w: number; h: number }
/** Distanza tra il nome di una voce e il suo testo (sopra la soglia del controllo sovrapposizioni). */
const stacco = (g: G) => U(g, 12)
/**
 * Esito di un blocco: nessuna voce persa per strada, e i testi o ci sono per
 * tutte le voci o per nessuna (metà sì e metà no sembra un errore).
 */
function esito(g: G, rotte: number[], testi: number) {
  if (rotte.length) { discard(g, `voci che non entrano: ${rotte.join(', ')}`); return false }
  const attesi = voci(g, v => !!v.testo).length
  if (testi > 0 && testi < attesi) { discard(g, `testi delle voci incompleti (${testi} su ${attesi})`); return false }
  return true
}
const variante = (g: G, n = 2) => (g.k.seme >> 3) % n
const voci = (g: G, f: (v: Voce) => boolean, max = 6) => (g.c.voci ?? []).filter(f).slice(0, max)

/** Testata dei contenuti: brand piccolo, occhiello, titolo; restituisce dove finisce. */
function testata(g: G, o: { quota?: number; righe?: number; centro?: boolean } = {}) {
  const { W, m, T, B, P } = g
  const brand = lab(g, g.c.brand, W * 0.45)
  if (brand) putLab(g, 'brand', brand, o.centro ? (W - brand.w) / 2 : m, T, P.sec)
  let y = T + (brand ? brand.h + U(g, 26) : 0)
  const kick = lab(g, g.c.kicker, W - 2 * m)
  if (kick) { putLab(g, 'occhiello', kick, o.centro ? (W - kick.w) / 2 : m, y, ink(g).acc); y += kick.h + U(g, 16) }
  const t = display(g, g.c.title, W - 2 * m, (B - T) * (o.quota ?? 0.22), 96 + 40 * g.k.scala, 40, o.righe ?? 3)
  if (!t) return null
  putDisplay(g, 'titolo', t, o.centro ? m : m, y, P.fg, o.centro ? 'center' : 'left', W - 2 * m)
  return y + t.h + U(g, 44)
}

/** Separatore nel registro: filetto, tratto a mano o niente (morbido usa le card). */
function separa(g: G, y: number, x1 = g.m, x2 = g.W - g.m) {
  const { P, s } = g
  if (s.forma === 'mano') put(g, { kind: 'path', name: 'filetto', d: wobblyPath(g.r, x1, y, x2, y, U(g, 2)), fill: 'transparent', stroke: alpha(P.fg, 0.4), sw: U(g, 2) })
  else if (s.forma !== 'morbido') put(g, { kind: 'line', name: 'filetto', x1, y1: y, x2, y2: y, color: alpha(P.fg, 0.28), width: Math.max(1, g.u * (s.forma === 'decostruito' ? 2 : 1)), dash: s.forma === 'decostruito' ? [U(g, 6), U(g, 6)] : undefined })
}

/** Fondo di una card nel registro. */
function card(g: G, b: { x: number; y: number; w: number; h: number }, name = 'velo_card') {
  const { P, s } = g
  if (s.forma === 'morbido') put(g, { kind: 'rect', name, ...b, r: U(g, 28), fill: P.srf })
  else if (s.forma === 'mano') put(g, { kind: 'rect', name, ...b, r: U(g, 6), fill: P.srf, angle: g.r.range(-1.2, 1.2) })
  else if (s.forma === 'decostruito') { put(g, { kind: 'rect', name: 'ombra_card', x: b.x + U(g, 8), y: b.y + U(g, 8), w: b.w, h: b.h, fill: P.acc }); put(g, { kind: 'rect', name, ...b, fill: P.bg, stroke: P.fg, sw: U(g, 2) }) }
  else put(g, { kind: 'rect', name, ...b, fill: 'transparent', stroke: alpha(P.fg, 0.35), sw: U(g, 2) })
}

/** Numero in un bollino (cerchio d'accento) o nudo e grande. */
function numero(g: G, n: string, x: number, y: number, size: number, bollino: boolean) {
  const { P, s } = g
  if (bollino) {
    const r = size * 0.62
    const bg = readable(P.bg, [P.acc, P.acc2, P.fg], 2)
    put(g, { kind: 'circle', name: 'bollino', cx: x + r, cy: y + r, r, fill: bg })
    const f = s.label, tw = lineWidth(n, f, size * 0.62, 0)
    txt(g, { name: 'numero', lines: [n], font: f, size: size * 0.62, x: x + r - tw / 2, y: y + r - size * 0.62 * 0.62, color: readable(bg, [P.bg, P.fg, '#111111', '#ffffff']), leading: 1 })
    return 2 * r
  }
  txt(g, { name: 'numero', lines: [n], font: s.impact, size, x, y, color: readable(P.bg, [P.acc, P.fg], 2.4), leading: 1 })
  return lineWidth(n, s.impact, size, 0)
}

/* ═══ Consigli ══════════════════════════════════════════════════════════ */
export function blocco_consigli(g: G, box: Box): boolean {
  const { P, s } = g
  // geometria del riquadro: m = sinistra, W - m = destra, B = fondo
  const m = box.x, W = 2 * box.x + box.w, B = box.y + box.h, top = box.y
  const rotte: number[] = []
  let testi = 0
  const vs = voci(g, v => !!(v.titolo || v.testo))
  if (vs.length < 2) return false
  const v = variante(g)
  if (v === 0 || vs.length === 5) {
    // elenco: numeri grandi a sinistra, titolo e testo a destra
    const rowH = (B - top) / vs.length, num = Math.min(rowH * 0.7, U(g, 78))
    // la colonna dei numeri è larga quanto il numero più largo (i caratteri impact larghi non invadono il testo)
    const nw = g.s.forma === 'morbido' ? num * 1.24 : Math.max(...vs.map((_, i) => lineWidth(String(i + 1).padStart(2, '0'), s.impact, num, 0)))
    const tx = m + nw + U(g, 28), tw = W - m - tx
    vs.forEach((it, i) => {
      const y = top + i * rowH
      if (i) separa(g, y - U(g, 10), m, W - m)
      numero(g, String(i + 1).padStart(2, '0'), m, y, num, g.s.forma === 'morbido')
      let yy = y
      const tt = it.titolo ? display(g, it.titolo, tw, rowH * 0.5, 44, 28, 2) : null
      if (tt) { putDisplay(g, `voce_${i}`, tt, tx, yy, P.fg); yy += tt.h + stacco(g) } else if (it.titolo) rotte.push(i)
      const p = para(g, it.testo, tw, Math.max(1, Math.floor((y + rowH - yy - U(g, 16)) / (36 * g.u))), 26)
      if (p) { putPara(g, `testo_${i}`, p, tx, yy, P.sec); testi++ }
    })
  } else {
    // card in griglia
    const cols = 2, rows = Math.ceil(vs.length / cols), gap = g.g
    const cw = (W - 2 * m - gap) / cols, ch = (B - top - gap * (rows - 1)) / rows
    vs.forEach((it, i) => {
      const b = { x: m + (i % cols) * (cw + gap), y: top + Math.floor(i / cols) * (ch + gap), w: cw, h: ch }
      card(g, b)
      const pad = U(g, 26)
      const nh = numero(g, String(i + 1), b.x + pad, b.y + pad, U(g, 52), true)
      let yy = b.y + pad + nh + U(g, 16)
      const tt = it.titolo ? display(g, it.titolo, cw - 2 * pad, ch * 0.4, 40, 26, 3) : null
      if (tt) { putDisplay(g, `voce_${i}`, tt, b.x + pad, yy, P.fg); yy += tt.h + stacco(g) } else if (it.titolo) rotte.push(i)
      const p = para(g, it.testo, cw - 2 * pad, Math.max(1, Math.floor((b.y + ch - pad - yy) / (34 * g.u))), 24)
      if (p) { putPara(g, `testo_${i}`, p, b.x + pad, yy, P.sec); testi++ }
    })
  }
  return esito(g, rotte, testi)
}

export function consigli(g: G): Scene | null {
  const top = testata(g, { quota: 0.2 })
  if (top === null || !blocco_consigli(g, { x: g.m, y: top, w: g.W - 2 * g.m, h: g.B - top })) return null
  return finish(g, 'consigli', 'Consigli', { specchio: false })
}

/* ═══ Passo dopo passo ══════════════════════════════════════════════════ */
export function blocco_passi(g: G, box: Box): boolean {
  const { P, s } = g
  // geometria del riquadro: m = sinistra, W - m = destra, B = fondo
  const m = box.x, W = 2 * box.x + box.w, B = box.y + box.h, top = box.y
  const rotte: number[] = []
  let testi = 0
  const vs = voci(g, v => !!(v.titolo || v.testo), 5)
  if (vs.length < 2) return false
  const rowH = (B - top) / vs.length, r = Math.min(U(g, 34), rowH * 0.3)
  const cx = m + r
  // il filo che collega i passi: dritto, a mano o tratteggiato
  const y1 = top + r, y2 = top + (vs.length - 1) * rowH + r
  if (s.forma === 'mano') put(g, { kind: 'path', name: 'filo', d: wobblyPath(g.r, cx, y1, cx, y2, U(g, 4)), fill: 'transparent', stroke: P.acc, sw: U(g, 4) })
  else put(g, { kind: 'line', name: 'filo', x1: cx, y1, x2: cx, y2, color: P.acc, width: U(g, s.forma === 'morbido' ? 8 : 3), dash: s.forma === 'decostruito' ? [U(g, 10), U(g, 8)] : undefined })
  const tx = m + 2 * r + U(g, 30), tw = W - m - tx
  vs.forEach((it, i) => {
    const y = top + i * rowH
    if (s.forma === 'netto' || s.forma === 'decostruito') {
      const bg = readable(P.bg, [P.acc, P.fg], 2)
      put(g, { kind: 'rect', name: 'tappa', x: cx - r, y, w: 2 * r, h: 2 * r, fill: bg, angle: s.forma === 'decostruito' ? 8 : 0 })
      const f = s.label, sz = r * 0.95, tw2 = lineWidth(String(i + 1), f, sz, 0)
      txt(g, { name: 'numero', lines: [String(i + 1)], font: f, size: sz, x: cx - tw2 / 2, y: y + r - sz * 0.6, color: readable(bg, [P.bg, P.fg, '#111111', '#ffffff']), leading: 1 })
    } else numero(g, String(i + 1), cx - r * 1.0, y, r / 0.62, true)
    let yy = y
    const tt = it.titolo ? display(g, it.titolo, tw, rowH * 0.45, 42, 28, 2) : null
    if (tt) { putDisplay(g, `voce_${i}`, tt, tx, yy, P.fg); yy += tt.h + stacco(g) } else if (it.titolo) rotte.push(i)
    const p = para(g, it.testo, tw, Math.max(1, Math.floor((y + rowH - yy - U(g, 14)) / (36 * g.u))), 26)
    if (p) { putPara(g, `testo_${i}`, p, tx, yy, P.sec); testi++ }
  })
  return esito(g, rotte, testi)
}

export function passi(g: G): Scene | null {
  const top = testata(g, { quota: 0.2 })
  if (top === null || !blocco_passi(g, { x: g.m, y: top, w: g.W - 2 * g.m, h: g.B - top })) return null
  return finish(g, 'passi', 'Passo dopo passo', { specchio: false })
}

/* ═══ Dati ══════════════════════════════════════════════════════════════ */
export function blocco_dati(g: G, box: Box): boolean {
  const { P, s } = g
  // geometria del riquadro: m = sinistra, W - m = destra, B = fondo
  const m = box.x, W = 2 * box.x + box.w, B = box.y + box.h, top = box.y
  const rotte: number[] = []
  let testi = 0
  const vs = voci(g, v => !!v.valore, 4)
  if (!vs.length) return false
  const perc = vs.every(v => /^\s*-?\d+([.,]\d+)?\s*%\s*$/.test(v.valore!))
  const acc = readable(P.bg, [P.acc, P.fg], 2.4)
  if (perc && (variante(g) === 0 || vs.length > 1)) {
    // barre: etichetta, binario, riempimento proporzionale, valore
    const rowH = Math.min((B - top) / vs.length, U(g, 190))
    vs.forEach((it, i) => {
      const y = top + i * rowH
      const val = Math.max(0, Math.min(100, parseFloat(it.valore!.replace(',', '.'))))
      const lf = lab(g, it.titolo, W - 2 * m - U(g, 160), 20)
      if (lf) putLab(g, `voce_${i}`, lf, m, y, P.fg); else if (it.titolo) rotte.push(i)
      const by = y + (lf ? lf.h : 0) + U(g, 14), bh = U(g, s.forma === 'morbido' ? 44 : 30), bw = W - 2 * m - U(g, 150)
      const rr = s.forma === 'morbido' ? bh / 2 : 0
      put(g, { kind: 'rect', name: 'binario', x: m, y: by, w: bw, h: bh, r: rr, fill: P.srf })
      put(g, { kind: 'rect', name: 'barra', x: m, y: by, w: Math.max(bh, (bw * val) / 100), h: bh, r: rr, fill: acc })
      const vf = display(g, it.valore!, U(g, 140), bh * 2, 64, 30, 1)
      if (vf) putDisplay(g, `valore_${i}`, vf, W - m - vf.w, by + bh / 2 - vf.h / 2, P.fg, 'left', vf.w); else rotte.push(i)
      const p = para(g, it.testo, W - 2 * m, 1, 22)
      if (p) putPara(g, `testo_${i}`, p, m, by + bh + U(g, 10), P.sec)
    })
  } else {
    // numeri grandi in griglia
    const cols = vs.length <= 2 ? 1 : 2, rows = Math.ceil(vs.length / cols)
    const cw = (W - 2 * m - (cols - 1) * g.g) / cols, ch = (B - top) / rows
    vs.forEach((it, i) => {
      const x = m + (i % cols) * (cw + g.g), y = top + Math.floor(i / cols) * ch
      if (i >= cols) separa(g, y - U(g, 14), x, x + cw)
      const size = Math.min(sizeForWidth(it.valore!, s.impact, cw * 0.9, -0.02), ch * 0.5)
      if (s.forma === 'morbido') put(g, { kind: 'path', name: 'blob', d: blobPath(g.r, { x: x - U(g, 10), y: y - U(g, 6), w: lineWidth(it.valore!, s.impact, size, -0.02) + U(g, 30), h: size * 1.1 }, 0.3, 7), fill: mix(P.bg, P.acc, 0.25) })
      txt(g, { name: `valore_${i}`, lines: [it.valore!], font: s.impact, size, x, y, color: acc, tracking: -0.02, leading: 1 })
      let yy = y + size * 1.13 + stacco(g)
      const tt = it.titolo ? display(g, it.titolo, cw, ch * 0.25, 38, 26, 2) : null
      if (tt) { putDisplay(g, `voce_${i}`, tt, x, yy, P.fg); yy += tt.h + stacco(g) } else if (it.titolo) rotte.push(i)
      const p = para(g, it.testo, cw, 2, 24)
      if (p && yy + p.h < y + ch - U(g, 10)) putPara(g, `testo_${i}`, p, x, yy, P.sec)
    })
  }
  return esito(g, rotte, testi)
}

export function dati(g: G): Scene | null {
  const top = testata(g, { quota: 0.18 })
  if (top === null || !blocco_dati(g, { x: g.m, y: top, w: g.W - 2 * g.m, h: g.B - top })) return null
  return finish(g, 'dati', 'Dati', { specchio: false })
}

/** Spunta e croce disegnate (per i confronti). */
const spunta = (x: number, y: number, s: number) => `M ${x} ${y + s * 0.55} L ${x + s * 0.38} ${y + s * 0.9} L ${x + s} ${y + s * 0.12}`
const croce = (x: number, y: number, s: number) => `M ${x + s * 0.1} ${y + s * 0.1} L ${x + s * 0.9} ${y + s * 0.9} M ${x + s * 0.9} ${y + s * 0.1} L ${x + s * 0.1} ${y + s * 0.9}`

/* ═══ Confronto ═════════════════════════════════════════════════════════ */
export function blocco_confronto(g: G, box: Box): boolean {
  const { P, s } = g
  // geometria del riquadro: m = sinistra, W - m = destra, B = fondo
  const m = box.x, W = 2 * box.x + box.w, B = box.y + box.h, top = box.y
  const rotte: number[] = []
  let testi = 0
  const cols = (g.c.colonne ?? []).filter(c => c.titolo && c.punti?.length).slice(0, 2)
  if (cols.length < 2) return false
  const gap = U(g, 44), cw = (W - 2 * m - gap) / 2
  const acc = readable(P.bg, [P.acc, P.fg], 2.4)
  // la colonna "giusta" (la seconda) prende l'accento e un fondo
  card(g, { x: m + cw + gap - U(g, 20), y: top - U(g, 20), w: cw + U(g, 40), h: B - top + U(g, 20) }, 'velo_colonna')
  if (s.forma !== 'morbido') put(g, { kind: 'line', name: 'divisore', x1: m + cw + gap / 2 - U(g, 22), y1: top, x2: m + cw + gap / 2 - U(g, 22), y2: B, color: alpha(P.fg, 0.25), width: Math.max(1, g.u) })
  cols.forEach((c, ci) => {
    const x = m + ci * (cw + gap)
    const h = display(g, c.titolo, cw, U(g, 120), 56, 30, 2)
    let y = top
    if (h) { putDisplay(g, `colonna_${ci}`, h, x, y, ci ? acc : P.sec); y += h.h + U(g, 30) } else rotte.push(ci)
    const rowH = (B - y) / Math.max(1, Math.min(5, c.punti.length))
    c.punti.slice(0, 5).forEach((pt, i) => {
      const yy = y + i * rowH, mk = U(g, 26)
      put(g, { kind: 'path', name: ci ? 'spunta' : 'croce', d: ci ? spunta(x, yy + U(g, 4), mk) : croce(x, yy + U(g, 4), mk), fill: 'transparent', stroke: ci ? acc : alpha(P.fg, 0.5), sw: U(g, 4) })
      const p = para(g, pt, cw - mk - U(g, 18), Math.max(1, Math.floor(rowH / (36 * g.u))), 26)
      if (p) putPara(g, `punto_${ci}_${i}`, p, x + mk + U(g, 16), yy, ci ? P.fg : P.sec); else rotte.push(ci * 10 + i)
    })
  })
  return esito(g, rotte, testi)
}

export function confronto(g: G): Scene | null {
  const top = testata(g, { quota: 0.18 })
  if (top === null || !blocco_confronto(g, { x: g.m, y: top, w: g.W - 2 * g.m, h: g.B - top })) return null
  return finish(g, 'confronto', 'Confronto', { specchio: false })
}

/* ═══ Programma ═════════════════════════════════════════════════════════ */
export function blocco_programma(g: G, box: Box): boolean {
  const { P, s } = g
  // geometria del riquadro: m = sinistra, W - m = destra, B = fondo
  const m = box.x, W = 2 * box.x + box.w, B = box.y + box.h, top = box.y
  const rotte: number[] = []
  let testi = 0
  const vs = voci(g, v => !!(v.ora && v.titolo), 8)
  if (vs.length < 2) return false
  const rowH = (B - top) / vs.length
  const oraW = Math.max(...vs.map(v => lineWidth(v.ora!, s.label, U(g, 30), 0.08))) + U(g, 30)
  const pill = variante(g) === 1 || s.forma === 'morbido'
  vs.forEach((it, i) => {
    const y = top + i * rowH
    if (pill) card(g, { x: m, y: y + U(g, 4), w: W - 2 * m, h: rowH - U(g, 12) })
    else if (i) separa(g, y, m, W - m)
    const pad = pill ? U(g, 22) : 0
    const of = lab(g, it.ora, oraW, 30)
    const yy = y + (pill ? (rowH - U(g, 8)) / 2 : U(g, 14))
    if (of) putLab(g, `ora_${i}`, of, m + pad, pill ? yy - of.h / 2 : yy, readable(pill ? P.srf : P.bg, [P.acc, P.fg], 3.6))
    const tx = m + pad + oraW, tw = W - m - pad - tx
    const tt = display(g, it.titolo!, tw, rowH * 0.6, 38, 24, it.testo ? 1 : 2)
    const pp = it.testo ? para(g, it.testo, tw, 1, 22) : null
    const hh = (tt?.h ?? 0) + (pp ? pp.h + stacco(g) : 0)
    let ty = pill ? yy - hh / 2 : y + U(g, 10)
    if (tt) { putDisplay(g, `voce_${i}`, tt, tx, ty, P.fg); ty += tt.h + stacco(g) } else rotte.push(i)
    if (pp) { putPara(g, `testo_${i}`, pp, tx, ty, P.sec); testi++ }
  })
  return esito(g, rotte, testi)
}

export function programma(g: G): Scene | null {
  const top = testata(g, { quota: 0.2 })
  if (top === null || !blocco_programma(g, { x: g.m, y: top, w: g.W - 2 * g.m, h: g.B - top })) return null
  return finish(g, 'programma', 'Programma', { specchio: false })
}

/* ═══ Menu e listino ════════════════════════════════════════════════════ */
export function blocco_menu(g: G, box: Box): boolean {
  const { P, s } = g
  // geometria del riquadro: m = sinistra, W - m = destra, B = fondo
  const m = box.x, W = 2 * box.x + box.w, B = box.y + box.h, top = box.y
  const rotte: number[] = []
  let testi = 0
  const vs = voci(g, v => !!(v.titolo && v.prezzo), 8)
  if (vs.length < 2) return false
  const centro = s.registro === 'lusso' || s.registro === 'editoriale' || variante(g) === 1
  const rowH = (B - top) / vs.length
  vs.forEach((it, i) => {
    const y = top + i * rowH
    const pf = display(g, it.prezzo!, U(g, 180), rowH * 0.5, 40, 26, 1)
    const nf = display(g, it.titolo!, W - 2 * m - (pf?.w ?? 0) - U(g, 60), rowH * 0.5, 40, 26, 1)
    if (!nf) { rotte.push(i); return }
    if (!pf) rotte.push(i)
    if (centro) {
      putDisplay(g, `voce_${i}`, nf, m, y, P.fg, 'center', W - 2 * m)
      let yy = y + nf.h + stacco(g)
      const p = para(g, it.testo, box.w * 0.8, 1, 22)
      if (p) { putPara(g, `testo_${i}`, p, m + box.w * 0.1, yy, P.sec, 'center', box.w * 0.8); yy += p.h + stacco(g) }
      if (pf) putDisplay(g, `prezzo_${i}`, pf, m, yy, readable(P.bg, [P.acc, P.fg], 2.4), 'center', W - 2 * m)
    } else {
      putDisplay(g, `voce_${i}`, nf, m, y, P.fg)
      if (pf) putDisplay(g, `prezzo_${i}`, pf, W - m - pf.w, y, readable(P.bg, [P.acc, P.fg], 2.4), 'left', pf.w)
      // puntini guida tra il nome e il prezzo
      const x1 = m + nf.w + U(g, 16), x2 = W - m - (pf?.w ?? 0) - U(g, 16), yb = y + nf.size * 0.85
      if (x2 - x1 > U(g, 30)) put(g, { kind: 'line', name: 'puntini', x1, y1: yb, x2, y2: yb, color: alpha(P.fg, 0.45), width: U(g, 3), dash: [U(g, 2), U(g, 9)] })
      const p = para(g, it.testo, W - 2 * m - U(g, 120), 1, 22)
      if (p) putPara(g, `testo_${i}`, p, m, y + nf.h + stacco(g), P.sec)
    }
  })
  return esito(g, rotte, testi)
}

export function menu(g: G): Scene | null {
  const centro = g.s.registro === 'lusso' || g.s.registro === 'editoriale' || variante(g) === 1
  const top = testata(g, { quota: 0.18, centro })
  if (top === null || !blocco_menu(g, { x: g.m, y: top, w: g.W - 2 * g.m, h: g.B - top })) return null
  return finish(g, 'menu', 'Menu', { specchio: false })
}

/* ═══ Domande e risposte ════════════════════════════════════════════════ */
export function blocco_faq(g: G, box: Box): boolean {
  const { P, s } = g
  // geometria del riquadro: m = sinistra, W - m = destra, B = fondo
  const m = box.x, W = 2 * box.x + box.w, B = box.y + box.h, top = box.y
  const rotte: number[] = []
  let testi = 0
  const vs = voci(g, v => !!(v.titolo && v.testo), 4)
  if (vs.length < 2) return false
  const rowH = (B - top) / vs.length
  const qs = U(g, 64)
  vs.forEach((it, i) => {
    const y = top + i * rowH
    if (i) separa(g, y - U(g, 14), m, W - m)
    txt(g, { name: 'domanda_segno', lines: ['?'], font: s.impact, size: qs, x: m, y: y - U(g, 6), color: readable(P.bg, [P.acc, P.fg], 2.4), leading: 1 })
    const tx = m + qs * 0.9, tw = W - m - tx
    const q = display(g, it.titolo!, tw, rowH * 0.4, 40, 26, 2)
    let yy = y
    if (q) { putDisplay(g, `domanda_${i}`, q, tx, yy, P.fg); yy += q.h + stacco(g) } else rotte.push(i)
    const a = para(g, it.testo, tw, Math.max(1, Math.floor((y + rowH - yy - U(g, 20)) / (36 * g.u))), 26)
    if (a) putPara(g, `risposta_${i}`, a, tx, yy, P.sec); else rotte.push(i)
  })
  return esito(g, rotte, testi)
}

export function faq(g: G): Scene | null {
  const top = testata(g, { quota: 0.16 })
  if (top === null || !blocco_faq(g, { x: g.m, y: top, w: g.W - 2 * g.m, h: g.B - top })) return null
  return finish(g, 'faq', 'Domande e risposte', { specchio: false })
}

/* ═══ Prodotto ══════════════════════════════════════════════════════════ */
export function prodotto(g: G): Scene | null {
  const { W, m, T, B, P, s } = g
  const feats = voci(g, v => !!v.titolo, 4)
  const brand = lab(g, g.c.brand, W * 0.5)
  if (brand) putLab(g, 'brand', brand, m, T, P.sec)
  const top = T + (brand ? brand.h + U(g, 26) : 0)
  const side = W >= g.H * 0.95
  const pw = side ? (W - 2 * m) * 0.5 : W - 2 * m, ph = side ? B - top : (B - top) * 0.46
  const box = { x: m, y: top, w: pw, h: ph }
  // la foto nella forma del registro
  if (s.forma === 'morbido') {
    const sq = Math.min(pw, ph), b2 = { x: m + (pw - sq) / 2, y: top, w: sq, h: sq }
    const d = blobPath(g.r, b2, 0.18, 8)
    if (g.photo) photo(g, 'foto', b2, { mask: d }); else put(g, { kind: 'path', name: 'foto', d, fill: P.srf })
  } else photo(g, 'foto', box, s.forma === 'mano' ? {} : { shape: s.registro === 'lusso' ? 'arch' : 'rect' })
  const tx = side ? m + pw + g.g * 2 : m, tw = side ? W - m - tx : W - 2 * m
  let y = side ? top : top + ph + U(g, 34)
  const t = display(g, g.c.title, tw, (B - y) * 0.35, 90, 40, 3)
  if (!t) return null
  putDisplay(g, 'titolo', t, tx, y, P.fg)
  y += t.h + U(g, 24)
  for (const [i, f] of feats.entries()) {
    const ff = para(g, f.titolo, tw - U(g, 40), 1, 26)
    if (!ff) continue
    put(g, { kind: 'path', name: 'segno', d: starPath(tx + U(g, 12), y + ff.h / 2, U(g, 11), 4, 0.35), fill: readable(P.bg, [P.acc, P.fg], 2) })
    putPara(g, `caratteristica_${i}`, ff, tx + U(g, 36), y, P.fg)
    y += ff.h + U(g, 12)
  }
  const prezzo = g.c.numero || feats.find(f => f.prezzo)?.prezzo
  if (prezzo) {
    const bg = [P.acc, P.acc2, P.fg].find(c => contrast(c, P.bg) >= 2) ?? P.fg
    sticker(g, { x: tx, y: y + U(g, 16), text: prezzo, bg, fg: readable(bg, [P.bg, P.fg, '#111111', '#ffffff']), ink: s.forma === 'morbido' ? P.fg : bg, size: U(g, 40), angle: s.forma === 'netto' ? 0 : -4, font: s.impact })
    y += U(g, 40) * 2.6 + U(g, 24)
  }
  const c = lab(g, ctaText(g.c), tw)
  if (c && y + c.h < B) putLab(g, 'invito', c, tx, Math.max(y, B - c.h), ink(g).acc)
  return finish(g, 'prodotto', 'Prodotto')
}

/* ═══ Timeline ══════════════════════════════════════════════════════════ */
export function blocco_timeline(g: G, box: Box): boolean {
  const { P, s } = g
  // geometria del riquadro: m = sinistra, W - m = destra, B = fondo
  const m = box.x, W = 2 * box.x + box.w, B = box.y + box.h, top = box.y
  const rotte: number[] = []
  let testi = 0
  const vs = voci(g, v => !!(v.valore && (v.titolo || v.testo)), 6)
  if (vs.length < 2) return false
  const acc = readable(P.bg, [P.acc, P.fg], 2.4)
  if (box.h >= box.w * 1.1 || variante(g) === 0) {
    // verticale: linea a sinistra, anni grandi, testo accanto
    const rowH = (B - top) / vs.length, x0 = m + U(g, 10)
    put(g, { kind: 'line', name: 'linea', x1: x0, y1: top, x2: x0, y2: B - rowH * 0.4, color: alpha(P.fg, 0.4), width: U(g, 3) })
    vs.forEach((it, i) => {
      const y = top + i * rowH
      put(g, { kind: 'circle', name: 'tappa', cx: x0, cy: y + U(g, 22), r: U(g, 12), fill: acc })
      const vf = display(g, it.valore!, box.w * 0.6, rowH * 0.45, 64, 30, 1)
      const tx = x0 + U(g, 40)
      let yy = y
      if (vf) { txt(g, { name: `anno_${i}`, lines: vf.lines, font: s.impact, size: vf.size, x: tx, y: yy, color: acc, leading: 1 }); yy += vf.size * 1.13 + stacco(g) } else rotte.push(i)
      const p = para(g, [it.titolo, it.testo].filter(Boolean).join(' — '), W - m - tx, Math.max(1, Math.floor((y + rowH - yy - U(g, 10)) / (36 * g.u))), 26)
      if (p) putPara(g, `testo_${i}`, p, tx, yy, P.fg); else rotte.push(i)
    })
  } else {
    // orizzontale: linea al centro, tappe alternate sopra e sotto
    const y0 = top + (B - top) / 2, step = (W - 2 * m) / vs.length
    put(g, { kind: 'line', name: 'linea', x1: m, y1: y0, x2: W - m, y2: y0, color: alpha(P.fg, 0.4), width: U(g, 3) })
    vs.forEach((it, i) => {
      const x = m + i * step, upTo = i % 2 === 0
      put(g, { kind: 'circle', name: 'tappa', cx: x + U(g, 12), cy: y0, r: U(g, 12), fill: acc })
      const vf = display(g, it.valore!, step - U(g, 10), U(g, 90), 56, 26, 1)
      const p = para(g, [it.titolo, it.testo].filter(Boolean).join(' — '), step - U(g, 16), 4, 22)
      const blockH = (vf ? vf.size * 1.13 + stacco(g) : 0) + (p?.h ?? 0)
      let yy = upTo ? y0 - U(g, 30) - blockH : y0 + U(g, 30)
      if (vf) { txt(g, { name: `anno_${i}`, lines: vf.lines, font: s.impact, size: vf.size, x, y: yy, color: acc, leading: 1 }); yy += vf.size * 1.13 + stacco(g) } else rotte.push(i)
      if (p) putPara(g, `testo_${i}`, p, x, yy, P.fg); else rotte.push(i)
    })
  }
  return esito(g, rotte, testi)
}

export function timeline(g: G): Scene | null {
  const top = testata(g, { quota: 0.18 })
  if (top === null || !blocco_timeline(g, { x: g.m, y: top, w: g.W - 2 * g.m, h: g.B - top })) return null
  return finish(g, 'timeline', 'Timeline', { specchio: false })
}

/** Segno a mano facoltativo (non usato da tutti): esportato per i test. */
export const _segni = { scribbleEllipse, words }

export const SYSTEMS_TIPI = { consigli, passi, dati, confronto, programma, menu, faq, prodotto, timeline }

/** Blocchi di contenuto per il compositore: disegnano le voci dentro un riquadro qualsiasi. */
export const BLOCCHI: Partial<Record<TipoContenuto, (g: G, box: Box) => boolean>> = {
  consigli: blocco_consigli, passi: blocco_passi, dati: blocco_dati, confronto: blocco_confronto,
  programma: blocco_programma, menu: blocco_menu, faq: blocco_faq, timeline: blocco_timeline,
}
