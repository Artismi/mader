/**
 * Sistemi per le slide interne di un carosello: tesi, dato, citazione, elenco,
 * chiusura. Ognuno parla il registro dello stile (forme morbide, nette, a mano
 * o decostruite; accento in colore, corsivo o saltello), così una sequenza
 * resta coerente anche cambiando composizione da una slide all'altra.
 */
import type { Scene } from '../types'
import {
  type G, put, U, txt, lab, para, display, putLab, putPara, putDisplay, infoBlock, finish, sizeForWidth, detailsLine, ctaText, mix, alpha, readable, contrast,
} from './tools'
import { ink } from './systems'
import { blobPath, wobblyPath, scribbleEllipse, sticker, stars } from './forme'
import { lineWidth } from '../text'

/** Segno del registro sotto o attorno a un riquadro: blob, filetto, tratto a mano, scarabocchio. */
function segno(g: G, b: { x: number; y: number; w: number; h: number }, dove: 'sotto' | 'dietro') {
  const { P, s, r } = g
  const acc = P.acc2 === P.bg ? P.acc : P.acc2
  if (s.forma === 'morbido' && dove === 'dietro') {
    const pad = b.h * 0.35
    put(g, { kind: 'path', name: 'blob', d: blobPath(r, { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad }, 0.3, 8), fill: mix(P.bg, P.acc, 0.28) })
  } else if (s.forma === 'mano') {
    put(g, { kind: 'path', name: 'tratto', d: wobblyPath(r, b.x, b.y + b.h + U(g, 10), b.x + b.w * r.range(0.5, 0.9), b.y + b.h + U(g, 14), U(g, 5)), fill: 'transparent', stroke: P.acc, sw: U(g, 6) })
  } else if (s.forma === 'decostruito') {
    put(g, { kind: 'path', name: 'segno', d: scribbleEllipse(r, b), fill: 'transparent', stroke: acc, sw: U(g, 4) })
  } else {
    put(g, { kind: 'rect', name: 'filetto_spesso', x: b.x, y: b.y + b.h + U(g, 18), w: Math.min(b.w, U(g, 160)), h: U(g, 10), fill: P.acc })
  }
}

/** Intestazione ricorrente: brand piccolo in alto (la paginazione la aggiunge la sequenza). */
function testatina(g: G) {
  const b = lab(g, g.c.brand, g.W * 0.5)
  if (b) putLab(g, 'brand', b, g.m, g.T, g.P.sec)
  return b ? b.h + U(g, 30) : 0
}

/* Tesi: un'affermazione grande, tanto vuoto ──────────────────────────── */
export function tesi(g: G): Scene | null {
  const { W, m, T, B, P } = g
  const head = testatina(g)
  const info = infoBlock(g, W * 0.62, { kicker: false, details: false, cta: false })
  const kick = lab(g, g.c.kicker, W - 2 * m)
  const avail = B - T - head - info.h - (kick ? kick.h + U(g, 24) : 0) - U(g, 80)
  const t = display(g, g.c.title, W - 2 * m, avail, 140 + 60 * g.k.scala, 56, 5)
  if (!t) return null
  const blockH = (kick ? kick.h + U(g, 24) : 0) + t.h + U(g, 50) + info.h
  let y = T + head + Math.max(0, (B - T - head - blockH) * 0.42)
  if (kick) { putLab(g, 'occhiello', kick, m, y, ink(g).acc); y += kick.h + U(g, 24) }
  segno(g, { x: m, y, w: t.w, h: t.h }, 'dietro')
  putDisplay(g, 'titolo', t, m, y, P.fg)
  y += t.h + U(g, 50)
  info.place(m, y, ink(g))
  return finish(g, 'tesi', 'Tesi')
}

/* Dato: un numero protagonista ─────────────────────────────────────────── */
export function dato(g: G): Scene | null {
  const { W, m, T, B, P, s } = g
  const num = (g.c.numero || '').trim()
  if (!num) return null
  const head = testatina(g)
  const font = s.impact
  const t = display(g, g.c.title, W - 2 * m, (B - T) * 0.22, 80, 40, 3)
  const info = infoBlock(g, W * 0.7, { kicker: false, details: false, cta: false })
  const rest = (t ? t.h + U(g, 30) : 0) + info.h
  const size = Math.min(sizeForWidth(num, font, (W - 2 * m) * (0.7 + 0.25 * g.k.scala), -0.02), (B - T - head - rest - U(g, 80)) / 1.13)
  if (size < 120 * g.u) return null
  const nw = lineWidth(num, font, size, -0.02)
  let y = T + head + U(g, 20)
  const color = readable(P.bg, [P.acc, P.fg], 2.4)
  // il registro attorno al numero: anello (netto), blob (morbido), scarabocchio (decostruito), tratto (mano)
  if (s.forma === 'netto') put(g, { kind: 'circle', name: 'anello', cx: m + nw * 0.5, cy: y + size * 0.55, r: Math.max(nw, size) * 0.62, fill: 'transparent', stroke: alpha(P.fg, 0.25), sw: U(g, 2) })
  else segno(g, { x: m, y: y + size * 0.15, w: nw, h: size * 0.8 }, 'dietro')
  txt(g, { name: 'numero', lines: [num], font, size, x: m, y, color, tracking: -0.02, leading: 1 })
  y += size * 1.13 + U(g, 20)
  if (t) { putDisplay(g, 'titolo', t, m, y, P.fg); y += t.h + U(g, 30) }
  info.place(m, y, ink(g))
  return finish(g, 'dato', 'Dato')
}

/* Citazione: virgolette grandi, frase in corsivo o nel display ────────── */
export function citazione(g: G): Scene | null {
  const { W, m, T, B, P, s } = g
  const head = testatina(g)
  const who = lab(g, `— ${g.c.kicker || g.c.brand || ''}`.trim() === '—' ? '' : `— ${g.c.kicker || g.c.brand}`, W - 2 * m)
  const qSize = U(g, 220 + 80 * g.k.scala)
  const avail = B - T - head - qSize * 0.55 - (who ? who.h + U(g, 40) : 0) - U(g, 60)
  const t = display(g, g.c.title, W - 2 * m, avail, 110 + 30 * g.k.scala, 48, 6, false)
  if (!t) return null
  let y = T + head + Math.max(0, (avail - t.h) * 0.35)
  txt(g, { name: 'virgolette', lines: ['“'], font: s.display, size: qSize, x: m - qSize * 0.06, y: y - qSize * 0.2, color: readable(P.bg, [P.acc, P.fg], 2), leading: 1, deco: true })
  y += qSize * 0.55
  // la frase: tutta in corsivo se il registro lo usa
  const italic = s.accento === 'corsivo'
  putDisplay(g, 'titolo', t, m, y, P.fg, 'left', t.w, italic ? { chars: t.lines.map(l => [...l].map(() => ({ it: true }))) } : {})
  y += t.h + U(g, 40)
  if (who) putLab(g, 'firma', who, m, y, ink(g).acc)
  return finish(g, 'citazione', 'Citazione')
}

/* Elenco: punti numerati grandi ─────────────────────────────────────────── */
export function elenco(g: G): Scene | null {
  const { W, m, T, B, P, s } = g
  const items = (g.c.details?.length ? g.c.details : (g.c.body ?? '').split(/(?<=[.;])\s+/)).map(x => x.trim()).filter(Boolean).slice(0, 4)
  if (items.length < 2) return null
  const head = testatina(g)
  const t = display(g, g.c.title, W - 2 * m, (B - T) * 0.24, 110, 44, 3)
  if (!t) return null
  let y = T + head
  putDisplay(g, 'titolo', t, m, y, P.fg)
  y += t.h + U(g, 50)
  const numSize = U(g, 64 + 24 * g.k.scala)
  const rowH = (B - y) / items.length
  const textW = W - 2 * m - numSize * 1.6
  for (const [i, it] of items.entries()) {
    const f = para(g, it, textW, 2, 34)
    if (!f) continue
    if (i > 0) {
      if (s.forma === 'mano') put(g, { kind: 'path', name: 'filetto', d: wobblyPath(g.r, m, y - U(g, 14), W - m, y - U(g, 14), U(g, 2)), fill: 'transparent', stroke: alpha(P.fg, 0.35), sw: U(g, 2) })
      else put(g, { kind: 'line', name: 'filetto', x1: m, y1: y - U(g, 14), x2: W - m, y2: y - U(g, 14), color: alpha(P.fg, 0.25), width: Math.max(1, g.u) })
    }
    txt(g, { name: `numero_${i + 1}`, lines: [String(i + 1).padStart(2, '0')], font: s.impact, size: numSize, x: m, y, color: readable(P.bg, [P.acc, P.fg], 2.4), leading: 1 })
    putPara(g, `punto_${i + 1}`, f, m + numSize * 1.6, y + (numSize * 1.13 - f.h) / 2, P.fg)
    y += Math.min(rowH, Math.max(numSize * 1.13, f.h) + U(g, 34))
  }
  return finish(g, 'elenco', 'Elenco')
}

/* Chiusura: l'invito come protagonista, brand grande ──────────────────── */
export function chiusura(g: G): Scene | null {
  const { W, m, T, B, P, s } = g
  const cta = (g.c.cta || '').trim()
  const brandSize = Math.min(sizeForWidth(g.c.brand || ' ', s.display, (W - 2 * m) * 0.7, s.displayTracking), U(g, 120))
  const t = display(g, g.c.title, W - 2 * m, (B - T) * 0.3, 120, 48, 3)
  if (!t) return null
  let y = T + U(g, 30)
  putDisplay(g, 'titolo', t, m, y, P.fg)
  y += t.h + U(g, 60)
  if (cta) {
    const size = U(g, 38)
    const bg = [P.acc, P.acc2, P.fg].find(c => contrast(c, P.bg) >= 2) ?? P.fg
    const fg = readable(bg, [P.bg, P.fg, '#111111', '#ffffff'])
    sticker(g, { x: m, y, text: ctaText(g.c), bg, fg, ink: s.forma === 'morbido' ? P.fg : bg, size, angle: s.forma === 'netto' ? 0 : g.r.range(-4, 3), font: s.label })
    y += size * 2.6 + U(g, 40)
  }
  const det = lab(g, detailsLine(g.c), W - 2 * m)
  if (det) { putLab(g, 'dettagli', det, m, y, P.sec); y += det.h + U(g, 20) }
  if (g.c.brand) txt(g, { name: 'brand_grande', lines: [g.c.brand], font: s.display, size: brandSize, x: m, y: B - brandSize * 1.13, color: P.fg, tracking: s.displayTracking, leading: 1 })
  if (s.forma === 'morbido' && g.k.densita > 0.3) stars(g, 3, [P.acc, P.acc2])
  return finish(g, 'chiusura', 'Chiusura')
}

export const SYSTEMS_SLIDE = { tesi, dato, citazione, elenco, chiusura }
