/**
 * Sistemi dei registri che il primo gruppo non copriva:
 *   giocoso     infantile e pop: blob, foto in una forma morbida con contorno
 *               spesso e ombra piena, titolo che saltella, adesivo, coriandoli
 *   decostruito avanguardia: parole del titolo sparse sulla griglia con scarti
 *               di scala, striscia di foto, filetti tecnici, segno a mano
 *   rivista     editoriale e lusso: testata, foto grande, titolo con corsivo,
 *               capolettera, folio
 * Il messaggio resta leggibile: la sperimentazione sta negli elementi decorativi.
 */
import type { Scene } from '../types'
import {
  type G, put, U, txt, lab, para, display, putLab, putPara, putDisplay, infoBlock, photo, printMarks, finish, keyword, words, up,
  sizeForWidth, detailsLine, ctaText, mix, alpha, readable, darker, contrast,
} from './tools'
import { ink, over } from './systems'
import { blobPath, scribbleEllipse, confetti, stars, sticker, starPath } from './forme'
import { lineWidth } from '../text'

/* ═══ Giocoso (infantile, pop) ══════════════════════════════════════════ */
export function giocoso(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const side = g.landscape
  // passo 1: blob grandi e tenui sullo sfondo, che escono dalla tavola
  const tints = [P.acc, P.acc2, P.srf]
  const nb = 2 + (k.densita > 0.5 ? 1 : 0)
  for (let i = 0; i < nb; i++) {
    const sz = Math.min(W, H) * r.range(0.45, 0.75)
    const cx = [W * 0.05, W * 0.95, W * 0.5][i] + r.range(-0.08, 0.08) * W, cy = [H * 0.12, H * 0.62, H * 1.0][i] + r.range(-0.06, 0.06) * H
    put(g, { kind: 'path', name: 'blob', d: blobPath(r, { x: cx - sz / 2, y: cy - sz / 2, w: sz, h: sz }, 0.4, 7), fill: mix(P.bg, tints[i % 3], 0.32 + 0.2 * k.sovrastampa) })
  }
  // passo 2: misure del testo (titolo che saltella e informazioni)
  const colW = side ? (W - 2 * m) * 0.48 : W - 2 * m
  const info = infoBlock(g, side ? colW : Math.min(colW, W * 0.78), { kicker: false })
  const t = display(g, g.c.title, colW, side ? H * 0.42 : H * 0.24, 150 + 50 * k.scala, 52, 3)
  if (!t) return null
  // passo 3: brand in alto, poi la foto in un blob con contorno spesso e ombra piena (sembra un adesivo)
  const brand = lab(g, g.c.brand, side ? (W - 2 * m) * 0.4 : W * 0.5)
  if (brand) putLab(g, 'brand', brand, side ? W - m - colW : m, T, P.fg)
  const top = T + (brand && !side ? brand.h + U(g, 26) : 0)
  const textH = t.h + U(g, 30) + info.h
  const pb = side
    ? { x: m, y: T + U(g, 10), w: (W - 2 * m) * 0.46, h: B - T - U(g, 20) }
    : { x: W * 0.16, y: top, w: W * 0.68, h: Math.max(U(g, 200), B - top - textH - U(g, 90)) }
  const sq = Math.min(pb.w, pb.h), box = { x: pb.x + (pb.w - sq) / 2, y: pb.y + (pb.h - sq) / 2, w: sq, h: sq }
  const d = blobPath(r, box, 0.22, 8)
  const off = U(g, 12 + 10 * k.sovrastampa), sw = U(g, 7)
  // ombra piena: lo stesso blob spostato
  const dShadow = d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, a: string, b: string) => `${(+a + off).toFixed(1)} ${(+b + off).toFixed(1)}`)
  put(g, { kind: 'path', name: 'ombra_foto', d: dShadow, fill: P.fg })
  if (g.photo) photo(g, 'foto', box, { mask: d })
  else put(g, { kind: 'path', name: 'foto', d, fill: P.acc, fx: [{ id: 'genFill', p: { mode: 5, c1: P.acc, c2: P.acc2, c3: P.srf, c4: P.bg, grain: 10 } }] })
  put(g, { kind: 'path', name: 'contorno_foto', d, fill: 'transparent', stroke: P.fg, sw })
  // passo 4: titolo e informazioni
  if (side) {
    const x = W - m - colW, y = Math.max(T, (H - textH) / 2)
    putDisplay(g, 'titolo', t, x, y, P.fg, 'left', colW)
    info.place(x, y + t.h + U(g, 30), ink(g))
  } else {
    const y = B - textH
    putDisplay(g, 'titolo', t, m, y, P.fg, 'center', W - 2 * m)
    info.place((W - info.w) / 2, y + t.h + U(g, 30), ink(g), 'center')
  }
  // passo 5: adesivo con il numero o l'invito, a cavallo della foto
  const badge = g.c.numero || g.c.kicker
  if (badge) {
    const size = U(g, 30)
    const bx = side ? box.x + box.w * 0.62 : box.x + box.w * 0.66, by = box.y + box.h * 0.04
    const bg = [P.acc2, P.acc, P.bg].find(c => contrast(P.fg, c) >= 3) ?? P.bg
    sticker(g, { x: bx, y: by, text: up(badge, true), bg, fg: P.fg, ink: P.fg, size, angle: r.range(-12, 8) })
  }
  // passo 6: stelline e coriandoli negli spazi liberi
  if (k.densita > 0.25) stars(g, 2 + Math.round(k.densita * 4), [P.acc, P.acc2, P.fg])
  if (k.densita > 0.5) confetti(g, 6 + Math.round(k.densita * 10), [P.acc, P.acc2, P.fg])
  return finish(g, 'giocoso', 'Giocoso')
}

/* ═══ Decostruito (avanguardia) ═════════════════════════════════════════ */
export function decostruito(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const font = s.display
  const ws = words(up(g.c.title, s.displayUpper))
  const key = keyword(g).toUpperCase()
  const keyIdx = Math.max(0, ws.findIndex(w => w.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase() === key.replace(/[^\p{L}\p{N}]/gu, '')))
  // passo 1: filetti tecnici che attraversano la tavola e segni di stampa
  const rows = [0.18, 0.5, 0.82].map(f => T + (B - T) * f + r.range(-20, 20) * g.u)
  rows.forEach((y, i) => { if (r.chance(0.5 + k.densita * 0.4)) put(g, { kind: 'line', name: 'filetto', x1: 0, y1: y, x2: W, y2: y, color: alpha(P.fg, 0.55), width: Math.max(1, (i === 1 ? 2 : 1) * g.u) }) })
  if (k.densita > 0.3) printMarks(g, alpha(P.fg, 0.6))
  // passo 2: misure delle informazioni (in basso, monospazio)
  const info = infoBlock(g, g.landscape ? (W - 2 * m) * 0.36 : (W - 2 * m) * 0.62, { kicker: false })
  const infoTop = B - info.h
  // passo 3: le parole del titolo in ordine di lettura, con scarti di scala; la parola chiave enorme
  const zoneTop = T + U(g, 70), zoneBot = infoTop - U(g, 50)
  const big = Math.min(sizeForWidth(ws[keyIdx], font, (W - 2 * m) * (0.82 + 0.18 * k.scala), s.displayTracking), (zoneBot - zoneTop) * 0.42)
  const small = Math.max(big * (0.24 + 0.12 * (1 - k.energia)), 46 * g.u)
  const sizes = ws.map((_, i) => (i === keyIdx ? big : small))
  const total = sizes.reduce((a, z) => a + z * 0.98, 0)
  if (total > zoneBot - zoneTop) return null
  // spazio verticale distribuito: le parole piccole respirano attorno a quella grande
  const gap = (zoneBot - zoneTop - total) / Math.max(1, ws.length)
  let y = zoneTop + gap * 0.5
  const cols = 12, colW = (W - 2 * m) / cols
  const placed: { x: number; y: number; w: number; h: number }[] = []
  ws.forEach((w, i) => {
    const sz = sizes[i], tw = lineWidth(w, font, sz, s.displayTracking)
    // parole piccole su colonne diverse (scarto a scacchiera), la grande a filo del margine
    const col = i === keyIdx ? 0 : [0, 7, 3, 9, 1, 6][i % 6]
    const x = Math.min(m + col * colW, W - m - tw)
    const hollow = false
    const color = i === keyIdx ? P.fg : (i % 2 ? readable(P.bg, [P.acc, P.fg], 3) : P.fg)
    txt(g, { name: `titolo#${i}`, lines: [w], font, size: sz, x, y, color, tracking: s.displayTracking, leading: 1, hollow })
    placed.push({ x, y, w: tw, h: sz * 1.13 })
    y += sz * 0.98 + gap
  })
  // passo 4: striscia verticale di foto nella colonna più libera, in sovrastampa
  const stripW = colW * (2 + Math.round(k.densita * 2))
  const cand = [W - m - stripW, m + colW * 4, m + colW * 2]
  const free = cand.find(x => !placed.some(p => p.x < x + stripW && x < p.x + p.w && p.h < big)) ?? cand[0]
  const firstText = g.els.findIndex(e => e.kind === 'text')
  const before = g.els.length
  photo(g, 'striscia_foto', { x: free, y: 0, w: stripW, h: H }, { blend: g.photo ? undefined : over(g), fx: g.photo ? [{ id: 'halftone', p: { mode: 0, ink: darker(P.fg, P.bg), paper: P.bg === darker(P.fg, P.bg) ? P.fg : P.bg, paperOn: 1, size: 7, angle: 30 } }] : undefined })
  // la striscia va sotto le parole
  const [stripEl] = g.els.splice(before, 1)
  g.els.splice(Math.max(0, firstText), 0, stripEl)
  // blocco d'accento fuori griglia
  if (k.sovrastampa > 0.3) put(g, { kind: 'rect', name: 'blocco', x: free - colW * 0.6, y: rows[1] - U(g, 30), w: colW * 1.2, h: U(g, 60), fill: P.acc, blend: over(g) })
  // passo 5: segno a mano attorno alla parola chiave
  const kp = placed[keyIdx]
  if (kp && (k.energia > 0.45 || k.sovrastampa > 0.5)) put(g, { kind: 'path', name: 'segno', d: scribbleEllipse(r, { x: kp.x + kp.w * 0.05, y: kp.y + kp.h * 0.15, w: kp.w * 0.9, h: kp.h * 0.6 }), fill: 'transparent', stroke: P.acc2 === P.bg ? P.acc : P.acc2, sw: U(g, 5) })
  // passo 6: brand e occhiello ruotati sul bordo, microtesto tecnico, informazioni
  const side = lab(g, [g.c.brand, g.c.kicker].filter(Boolean).join('  /  '), (B - T) * 0.6)
  if (side) putLab(g, 'brand', side, W - m * 0.55, T, P.fg, 'left', side.w, { angle: 90 })
  const micro = `${(g.c.brand ?? '').toUpperCase()} — N° ${String((g.k.seme % 90) + 10)} — ${detailsLine(g.c).toUpperCase()}`
  txt(g, { name: 'microtesto', lines: [micro], font: s.label, size: U(g, 11), x: m, y: m * 0.45, color: alpha(P.fg, 0.7), tracking: 0.12, deco: true })
  info.place(m, infoTop, ink(g))
  return finish(g, 'decostruito', 'Decostruito')
}

/* ═══ Rivista (editoriale, lusso) ═══════════════════════════════════════ */
export function rivista(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const side = g.landscape
  const testata = (g.c.brand || g.c.kicker || '').trim()
  // passo 1: testata come il nome di una rivista, a tutta larghezza, con filetti doppi
  let y = T
  if (testata) {
    const size = Math.min(sizeForWidth(testata, s.display, side ? (W - 2 * m) * 0.45 : W - 2 * m, s.displayTracking), H * (side ? 0.16 : 0.11))
    txt(g, { name: 'testata', lines: [testata], font: s.display, size, x: m, y, color: P.fg, tracking: s.displayTracking, leading: 1 })
    y += size * 1.13 + U(g, 8)
  }
  const lineW = side ? (W - 2 * m) * 0.45 : W - 2 * m
  put(g, { kind: 'line', name: 'filetto', x1: m, y1: y, x2: m + lineW, y2: y, color: P.fg, width: Math.max(1, 2 * g.u) })
  put(g, { kind: 'line', name: 'filetto', x1: m, y1: y + U(g, 6), x2: m + lineW, y2: y + U(g, 6), color: P.fg, width: Math.max(1, g.u) })
  y += U(g, 14)
  const kick = lab(g, g.c.kicker && testata !== g.c.kicker ? g.c.kicker : '', lineW * 0.6), det = lab(g, detailsLine(g.c), lineW * 0.5)
  if (kick) putLab(g, 'occhiello', kick, m, y, ink(g).acc)
  if (det && (!kick || kick.w + det.w + U(g, 30) < lineW)) putLab(g, 'dettagli', det, m + lineW - det.w, y, P.sec)
  y += Math.max(kick?.h ?? 0, det?.h ?? 0, U(g, 16)) + U(g, 30)
  // passo 2: misure del testo: titolo con corsivo, capolettera, folio
  const colW = side ? (W - 2 * m) * 0.45 : W - 2 * m
  const t = display(g, g.c.title, colW, side ? H * 0.34 : H * 0.2, 120 + 50 * k.scala, 44, 3)
  if (!t) return null
  const folio = lab(g, `${testata ? testata + '  —  ' : ''}${ctaText(g.c)}`, colW)
  const bodyW = side ? colW : (W - 2 * m) * 0.7
  const dropSize = U(g, 92)
  const b = para(g, g.c.body ? g.c.body.slice(1) : '', bodyW - dropSize * 0.8, 4, 0)
  const textH = t.h + U(g, 26) + (b ? Math.max(b.h, dropSize * 0.9) + U(g, 24) : 0) + (folio ? folio.h + U(g, 20) : 0)
  // passo 3: la foto grande nello spazio che resta (a destra in orizzontale)
  const pbox = side ? { x: W / 2 + U(g, 10), y: T, w: W / 2 - m - U(g, 10), h: B - T } : { x: m, y, w: W - 2 * m, h: B - y - textH - U(g, 36) }
  if (pbox.h > H * 0.18) {
    photo(g, 'foto', pbox, s.forma === 'morbido' ? { shape: 'arch' } : {})
    if (!side) y = pbox.y + pbox.h + U(g, 30)
  }
  if (side) y = Math.max(y, B - textH)
  // passo 4: titolo, capolettera e testo
  putDisplay(g, 'titolo', t, m, y, P.fg, 'left', colW)
  y += t.h + U(g, 26)
  if (b && g.c.body) {
    txt(g, { name: 'capolettera', lines: [g.c.body[0].toUpperCase()], font: s.display, size: dropSize, x: m, y: y - dropSize * 0.12, color: ink(g).acc, leading: 1 })
    putPara(g, 'testo', b, m + dropSize * 0.8, y, P.fg)
    y += Math.max(b.h, dropSize * 0.9) + U(g, 24)
  }
  if (folio) {
    put(g, { kind: 'line', name: 'filetto_folio', x1: m, y1: y - U(g, 10), x2: m + colW, y2: y - U(g, 10), color: alpha(P.fg, 0.4), width: Math.max(1, g.u) })
    putLab(g, 'invito', folio, m, y, ink(g).acc)
  }
  // un solo ornamento discreto: stellina accanto alla testata
  if (testata && k.densita > 0.5) put(g, { kind: 'path', name: 'stellina', d: starPath(W - m - U(g, 20), T + U(g, 20), U(g, 16), 4, 0.3), fill: P.acc })
  return finish(g, 'rivista', 'Rivista')
}

export const SYSTEMS_REGISTRI = { giocoso, decostruito, rivista }
