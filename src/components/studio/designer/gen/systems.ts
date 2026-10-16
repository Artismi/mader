/**
 * Sistemi generativi: ognuno è una ricetta di passaggi in sequenza (fondo,
 * forme, foto trattata, tipografia, sovrastampa, segni, trame). I regolatori
 * spingono o frenano ogni passaggio; il seme decide le varianti. Le misure
 * vengono dai testi veri, mai da coordinate inventate.
 */
import type { Scene } from '../types'
import {
  type G, put, U, txt, lab, para, display, putLab, putPara, putDisplay, infoBlock, photo, treat, printMarks, regMark, ticker,
  dotField, finish, keyword, stackLines, accentChars, sizeForWidth, detailsLine, ctaText, mix, alpha, readable, darker, lighter, words, up, lum, discard,
} from './tools'
import { lineWidth } from '../text'

export const ink = (g: G) => ({ fg: g.P.fg, sec: g.P.sec, acc: readable(g.P.bg, [g.P.acc, g.P.acc2, g.P.fg], 3.6) })
/** Sovrastampa che funziona sul fondo: moltiplica sul chiaro, schiarisce sul buio. */
export const over = (g: G, under = g.P.bg): GlobalCompositeOperation => (lum(under) < 0.18 ? 'screen' : 'multiply')

/* ═══ 1. Tipo gigante ═══════════════════════════════════════════════════ */
/** Pila tipografica col carattere da manifesto: righe a tutta larghezza (bastoni) o di corpo uguale (graziati). */
export function stack(g: G, text: string, w: number, maxH: number, maxLines: number) {
  const { s } = g
  const font = s.impact, tr = s.impactSans ? -0.01 : -0.015
  const lines = stackLines(up(text, true), maxLines)
  const lead = s.impactSans ? 0.86 : 0.92
  let sizes = s.impactSans
    ? lines.map(l => Math.min(sizeForWidth(l, font, w, tr), g.H * 0.3))
    : Array(lines.length).fill(Math.min(...lines.map(l => sizeForWidth(l, font, w, tr)), g.H * 0.22))
  const total = (z: number[]) => z.reduce((n, v) => n + v * lead, 0) + z[z.length - 1] * (1.13 - lead)
  if (total(sizes) > maxH) { const f = maxH / total(sizes); sizes = sizes.map(v => v * f) }
  return { lines, sizes, lead, font, tr, h: total(sizes), w: Math.max(...lines.map((l, i) => lineWidth(l, font, sizes[i], tr))) }
}

export function putStack(g: G, st: ReturnType<typeof stack>, x: number, y: number, color: string, accent: string, align: 'left' | 'center' = 'left', boxW = st.w) {
  const key = keyword(g).toUpperCase()
  let yy = y
  st.lines.forEach((l, i) => {
    // accento del registro: saltello su tutte le righe, corsivo se il carattere da manifesto è il titolo, altrimenti la riga chiave in colore
    const chars = g.s.accento === 'saltello' ? accentChars(g, [l], color)
      : g.s.accento === 'corsivo' && st.font.family === g.s.display.family && l.includes(key) ? accentChars(g, [l], color) : undefined
    const lineColor = !chars && l.includes(key) ? accent : color
    txt(g, { name: `titolo#${i}`, lines: [l], font: st.font, size: st.sizes[i], x, y: yy, w: boxW, align, color: lineColor, tracking: st.tr, leading: 1, chars })
    yy += st.sizes[i] * st.lead
  })
  return y + st.h
}

export function supertipo(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const side = g.landscape
  // passo 1: testata
  const brand = lab(g, g.c.brand, W * 0.45), right = lab(g, g.c.numero || g.c.kicker, W * 0.45)
  const headH = Math.max(brand?.h ?? 0, right?.h ?? 0, U(g, 16))
  const top = T + headH + U(g, 40)
  const overPhoto = !!g.photo && !side && r.chance(0.5)
  const colW = side ? (W - 2 * m) * 0.42 : (W - 2 * m - g.g) / 2
  const info = infoBlock(g, colW, { kicker: !!g.c.numero, details: !side || true })

  // variante: foto a tutta tavola, velo che sale dal basso, pila sopra il velo; la foto resta protagonista (almeno il 45% visibile)
  const stOver = overPhoto ? stack(g, g.c.title, W - 2 * m, H * 0.3, g.portrait ? 4 : 3) : null
  const veilTopOver = stOver ? B - info.h - U(g, 44) - stOver.h - U(g, 50) : 0
  if (stOver && veilTopOver >= H * 0.45) {
    photo(g, 'foto', { x: 0, y: 0, w: W, h: H })
    const st = stOver, veilTop = veilTopOver
    put(g, { kind: 'rect', name: 'sfumatura', x: 0, y: veilTop - H * 0.25, w: W, h: H * 0.25 + 2, fill: { from: alpha(P.bg, 0), to: P.bg, fromAt: 0, toAt: 1, vertical: true } })
    put(g, { kind: 'rect', name: 'velo', x: 0, y: veilTop, w: W, h: H - veilTop, fill: P.bg })
    // testata su una fascia piena in alto
    put(g, { kind: 'rect', name: 'velo_testata', x: 0, y: 0, w: W, h: T + headH + U(g, 18), fill: P.bg })
    if (brand) putLab(g, 'brand', brand, m, T, P.fg)
    if (right) putLab(g, 'occhiello', right, W - m - right.w, m, ink(g).acc)
    const y = putStack(g, st, m, veilTop + U(g, 30), P.fg, ink(g).acc)
    put(g, { kind: 'line', name: 'filetto', x1: m, y1: y + U(g, 14), x2: W - m, y2: y + U(g, 14), color: P.fg, width: Math.max(1, 2 * g.u) })
    info.place(m, B - info.h, ink(g))
    return finish(g, 'supertipo', 'Tipo gigante')
  }

  // passo 2: un disco tenue che esce dalla tavola, dietro a tutto
  if (k.densita > 0.35) put(g, { kind: 'circle', name: 'disco', cx: r.pick([W * 0.92, W * 0.08]), cy: H * r.range(0.25, 0.5), r: Math.min(W, H) * (0.35 + k.densita * 0.2), fill: mix(P.bg, P.acc, 0.12 + k.sovrastampa * 0.15) })
  if (brand) putLab(g, 'brand', brand, m, T, P.fg)
  if (right) putLab(g, 'occhiello', right, W - m - right.w, m, ink(g).acc)
  put(g, { kind: 'line', name: 'filetto', x1: m, y1: T + headH + U(g, 16), x2: W - m, y2: T + headH + U(g, 16), color: P.fg, width: Math.max(1, 2 * g.u) })
  // passo 3: la pila; dietro, se si spinge la sovrastampa, la stessa pila fuori registro nell'altro inchiostro
  const stW = side ? (W - 2 * m) * 0.52 : W - 2 * m
  const st = stack(g, g.c.title, stW, side ? H - top - m - info.h - U(g, 50) : H * (0.3 + 0.18 * k.scala), side ? 4 : g.portrait ? 4 : 3)
  if (k.sovrastampa > 0.45 && s.impactSans) {
    const off = U(g, 8 + 14 * k.sovrastampa)
    let yy = top
    st.lines.forEach((l, i) => { txt(g, { name: 'registro', lines: [l], font: st.font, size: st.sizes[i], x: m + off, y: yy + off * 0.6, color: P.acc2 === P.bg ? P.acc : P.acc2, tracking: st.tr, leading: 1, opacity: 0.85, blend: over(g), deco: true }); yy += st.sizes[i] * st.lead })
  }
  const yEnd = putStack(g, st, m, top, P.fg, ink(g).acc)
  // passo 4: la foto grande nello spazio che resta, informazioni sotto o accanto
  if (side) {
    const px = m + stW + U(g, 50)
    frame(g, px, top, W - m - px, B - top)
    info.place(m, B - info.h, ink(g))
  } else {
    const bottomH = info.h
    const py = yEnd + U(g, 40), ph = B - bottomH - U(g, 40) - py
    if (ph > H * 0.16) frame(g, m, py, W - 2 * m, ph)
    info.place(m, B - info.h, ink(g))
    // a destra dell'informazione: dettagli numerati
    let yr = B - info.h
    for (const [i, d] of (g.c.details ?? []).slice(0, 3).entries()) {
      const f = lab(g, `${String(i + 1).padStart(2, '0')}   ${d}`, colW, 14)
      if (!f) continue
      putLab(g, `dettaglio_${i}`, f, W - m - colW, yr, P.fg)
      yr += f.h + U(g, 12)
    }
  }
  // passo 5: scritta verticale sul bordo, come la costa di una rivista
  if (k.energia > 0.3 && g.c.brand) {
    const t = `${g.c.brand} — ${g.c.kicker ?? ''} — ${detailsLine(g.c)}`.toUpperCase()
    txt(g, { name: 'costa', lines: [t], font: s.label, size: U(g, 11), x: W - m * 0.32, y: m, angle: 90, color: alpha(P.fg, 0.6), tracking: 0.2, deco: true })
  }
  return finish(g, 'supertipo', 'Tipo gigante')
}

/** Foto con cornice d'accento sfalsata dietro (fuori registro) e sigillo sull'angolo. */
function frame(g: G, x: number, y: number, w: number, h: number) {
  const { P, k } = g
  const d = U(g, 10 + 30 * k.sovrastampa)
  if (k.sovrastampa > 0.6) {
    // la foto stampata sull'accento (sovrastampa), con un filetto fuori registro
    put(g, { kind: 'rect', name: 'cornice', x: x + d, y: y - d, w, h, fill: 'transparent', stroke: P.acc2 === P.bg ? P.fg : P.acc2, sw: U(g, 3) })
    put(g, { kind: 'rect', name: 'campo', x, y, w, h, fill: P.acc })
    photo(g, 'foto', { x, y, w, h }, { blend: over(g, P.acc) })
  } else {
    if (k.sovrastampa > 0.2) put(g, { kind: 'rect', name: 'cornice', x: x + d, y: y - d, w, h, fill: P.acc })
    photo(g, 'foto', { x, y, w, h })
  }
  if (k.densita > 0.5 && g.c.brand) sealAt(g, x, y + h, Math.min(w, h) * 0.2)
}

/** Sigillo con brand e occhiello che girano attorno a un glifo: mai piccolo, e se il testo non sta nel giro si accorcia. */
function sealAt(g: G, cx: number, cy: number, r0: number) {
  const r = Math.max(U(g, 100), r0)
  const size = Math.max(14 * g.u, r * 0.16)
  const tr = r - size * 1.05
  const circ = 2 * Math.PI * tr
  const options = [[g.c.brand, g.c.kicker ?? g.c.details?.[0]], [g.c.brand], [g.c.kicker]].map(w => w.filter(Boolean) as string[]).filter(w => w.length)
  // il testo deve occupare il giro con una spaziatura normale (non stirata né compressa)
  const fitsRing = (t: string) => { const w = lineWidth(t, g.s.label, size, 0.1); return w <= circ * 0.98 && w >= circ * 0.55 }
  let text = ''
  for (const ws of options) {
    let t = `${ws.join('  ·  ')}  ·  `.toUpperCase()
    if (lineWidth(t, g.s.label, size, 0.1) < circ * 0.55) t = t.repeat(Math.max(1, Math.floor((circ * 0.95) / lineWidth(t, g.s.label, size, 0.1))))
    if (fitsRing(t)) { text = t; break }
  }
  if (!text) return
  put(g, { kind: 'seal', name: 'sigillo', cx, cy, r, text, color: g.P.fg, font: g.s.label, glyph: g.r.pick(g.s.decor.glyphs), bg: g.P.bg, angle: g.r.range(-20, 20) })
}

/* ═══ 2. Eco ════════════════════════════════════════════════════════════ */
export function eco(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const font = s.display
  const tickH = U(g, 58)
  // passo 1: nastri in alto e in basso con il brand che scorre
  const tape = [g.c.brand, g.c.kicker].filter(Boolean).join('  ✦  ') || g.c.title
  ticker(g, 'nastro_alto', tape, 0, tickH, P.acc, readable(P.acc, [P.bg, P.fg, '#111111', '#ffffff']))
  // passo 2: blocco informativo in fondo
  const info = infoBlock(g, g.landscape ? (W - 2 * m) * 0.45 : W - 2 * m, { kicker: false })
  const infoTop = B - info.h
  const many = words(g.c.title).length > 3
  const full = many ? display(g, g.c.title, W - 2 * m, U(g, 140), 54, 28, 2) : null
  const fullTop = full ? infoTop - full.h - U(g, 22) : infoTop
  const zoneTop = Math.max(tickH + U(g, 24), T), zoneBot = fullTop - U(g, 36)
  // passo 3: la riga piena e le sue eco a contorno
  const row = up(many ? keyword(g) : g.c.title, true)
  const size = Math.min(sizeForWidth(row, font, (W - 2 * m) * (0.75 + 0.25 * k.scala), s.displayTracking), (zoneBot - zoneTop) * 0.3)
  const rowW = lineWidth(row, font, size, s.displayTracking)
  const step = size * (0.78 + (1 - k.densita) * 0.35)
  const n = Math.max(3, Math.floor((zoneBot - zoneTop - size * 1.13) / step) + 1)
  const fi = Math.min(n - 1, Math.max(0, Math.round((n - 1) * r.pick([0.25, 0.7, 0.5]))))
  const x0 = (W - rowW) / 2
  for (let i = 0; i < n; i++) {
    const y = zoneTop + i * step
    const shift = (i - fi) * k.energia * U(g, 70)
    if (i === fi) continue
    const fade = 1 - Math.abs(i - fi) / n
    txt(g, { name: 'eco', lines: [row], font, size, x: x0 + shift, y, color: P.fg, hollow: true, sw: Math.max(1.2, size * 0.012 * (1 + k.densita)), opacity: 0.18 + 0.7 * fade, tracking: s.displayTracking, leading: 1, deco: true })
  }
  // passo 4: foto tonda nella metà opposta alla riga piena
  const fy = zoneTop + fi * step
  const D = Math.min(W * 0.52, (zoneBot - zoneTop) * 0.5)
  const upHalf = fi > (n - 1) / 2
  const cy = upHalf ? zoneTop + D / 2 + U(g, 10) : zoneBot - D / 2
  const cx = W * r.range(0.32, 0.68)
  if (Math.abs(cy - (fy + size * 0.56)) > D / 2 + size * 0.6) {
    if (k.sovrastampa > 0.2) put(g, { kind: 'circle', name: 'alone', cx: cx + U(g, 24) * k.sovrastampa, cy: cy - U(g, 20) * k.sovrastampa, r: D / 2, fill: P.acc2, blend: over(g) })
    photo(g, 'foto', { x: cx - D / 2, y: cy - D / 2, w: D, h: D }, { shape: 'circle' })
  }
  // passo 5: la riga piena sopra a tutto
  txt(g, { name: 'titolo', lines: [row], font, size, x: x0, y: fy, color: ink(g).acc, tracking: s.displayTracking, leading: 1 })
  // passo 6: testo e, se la riga è solo la parola chiave, il titolo intero
  const y = fullTop
  if (full) putDisplay(g, 'titolo_intero', full, m, y, P.fg)
  info.place(m, infoTop, ink(g))
  if (k.densita > 0.6) put(g, { kind: 'glyph', name: 'stella', path: r.pick(s.decor.glyphs), cx: W - m - U(g, 30), cy: y - U(g, 60), size: U(g, 56), color: P.acc })
  return finish(g, 'eco', 'Eco')
}

/* ═══ 3. Strisce ════════════════════════════════════════════════════════ */
export function strisce(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const side = g.landscape
  const ph = side ? H : Math.round(H * ((g.format === 'storia' ? 0.64 : 0.56) + 0.1 * k.scala))
  const pw = side ? Math.round(W * 0.58) : W
  // passo 1: la foto tagliata in strisce sfalsate, una su tre con l'altro inchiostro
  const n = 5 + Math.round(k.densita * 9)
  const sw = pw / n
  const phase = r.range(0, 6)
  for (let i = 0; i < n; i++) {
    const dy = Math.sin(i * 1.3 + phase) * k.energia * U(g, 80)
    const box = { x: Math.floor(i * sw), y: dy, w: Math.ceil(sw) + 1, h: ph }
    const alt = i % 3 === 1
    if (g.photo) {
      const t = treat(g)
      put(g, {
        kind: 'image', name: `striscia_${i}`, ...box, url: g.photo, fallback: P.srf, view: { x: 0, y: dy, w: pw, h: ph },
        look: alt ? undefined : t.look, adjust: alt ? undefined : t.adjust,
        fx: alt ? [{ id: 'gradientMap', variant: 'duotone', p: { c1: darker(P.bg, P.fg), c2: P.acc2 === P.bg ? P.acc : P.acc2, three: 0, contrast: 30 } }] : t.fx,
      })
    } else {
      put(g, { kind: 'rect', name: `striscia_${i}`, ...box, fill: mix(alt ? P.acc2 : P.acc, P.bg, (i % 4) * 0.12), fx: [{ id: 'genFill', p: { mode: 3, c1: P.acc, c2: P.acc2, c3: P.srf, c4: darker(P.bg, P.fg), grain: 40 } }] })
    }
  }
  // passo 2: un velo d'accento in sovrastampa su un gruppo di strisce
  if (k.sovrastampa > 0.25) {
    const a = r.int(0, n - 3)
    put(g, { kind: 'rect', name: 'velo', x: a * sw, y: 0, w: sw * r.int(2, 3), h: ph, fill: P.acc, blend: 'multiply', opacity: 0.55 + 0.4 * k.sovrastampa })
  }
  // passo 3: fascia piena con il titolo, a cavallo del bordo della foto
  const bandW = side ? W - m - (pw - U(g, 120)) : W - m
  const bandX = side ? pw - U(g, 120) : 0
  const pad = U(g, 34)
  const t = display(g, g.c.title, bandW - 2 * pad - (side ? 0 : m), side ? H * 0.42 : H * 0.24, 150 + 80 * k.scala, 44, 3)
  if (!t) return null
  const bandH = t.h + 2 * pad
  const bandY = side ? m + U(g, 60) : ph - bandH * 0.55
  const angle = -k.energia * 3
  const barColor = P.fg, onBar = P.bg
  put(g, { kind: 'rect', name: 'velo_fascia', x: bandX, y: bandY, w: bandW, h: bandH, fill: barColor, angle })
  const a = (angle * Math.PI) / 180
  const tx = bandX + (side ? pad : m), ty = bandY + pad
  // la rotazione è attorno all'angolo della fascia: il titolo segue
  const dx = tx - bandX, dy = ty - bandY
  putDisplay(g, 'titolo', t, bandX + dx * Math.cos(a) - dy * Math.sin(a), bandY + dx * Math.sin(a) + dy * Math.cos(a), onBar, 'left', t.w, {
    angle, su: barColor, fx: k.sovrastampa > 0.15 ? [{ id: 'echo', variant: 'pop', p: { color: P.acc, distance: Math.round(4 + 10 * k.sovrastampa), count: 1, angle: 45 } }] : undefined,
  })
  // passo 4: testata e informazioni nello spazio libero
  if (side) {
    const colX = pw + U(g, 40), colW = W - m - colX
    const info = infoBlock(g, colW)
    info.place(colX, B - info.h, ink(g))
    const brand = lab(g, g.c.brand, colW)
    if (brand) putLab(g, 'brand', brand, W - m - brand.w, bandY + bandH + U(g, 40), P.fg)
  } else {
    const yTop = bandY + bandH + U(g, 44)
    const colW = (W - 2 * m - g.g) / 2
    const info = infoBlock(g, colW, { details: false, cta: false })
    const brand = lab(g, g.c.brand, colW)
    let y = yTop
    if (brand) { putLab(g, 'brand', brand, m, y, P.fg); y += brand.h + U(g, 20) }
    info.place(m, y, ink(g))
    // a destra: dettagli in colonna e invito
    let yr = yTop
    for (const [i, d] of (g.c.details ?? []).slice(0, 4).entries()) {
      const f = lab(g, `${String(i + 1).padStart(2, '0')}  ${d}`, colW, 14)
      if (!f) continue
      putLab(g, `dettaglio_${i}`, f, W - m - colW, yr, P.fg)
      yr += f.h + U(g, 10)
      put(g, { kind: 'line', name: 'filetto', x1: W - m - colW, y1: yr, x2: W - m, y2: yr, color: alpha(P.fg, 0.3), width: Math.max(1, g.u) })
      yr += U(g, 12)
    }
    const c = lab(g, ctaText(g.c), colW)
    if (c) putLab(g, 'invito', c, W - m - colW, Math.max(yr + U(g, 20), B - c.h), ink(g).acc)
  }
  // passo 5: segni di stampa
  if (k.densita > 0.35) {
    printMarks(g, alpha(P.fg, 0.7))
    regMark(g, W - m * 0.5, H - m * 0.5, U(g, 9), alpha(P.fg, 0.7))
  }
  return finish(g, 'strisce', 'Strisce')
}

/* ═══ 4. Costruttivista ═════════════════════════════════════════════════ */
export function costruttivo(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const ang = -(14 + k.energia * 22) + r.range(-4, 4)
  const a = (ang * Math.PI) / 180
  // passo 1: il grande disco, che esce dalla tavola in alto a destra
  const R = Math.min(W, H) * ((g.landscape ? 0.3 : 0.36) + 0.12 * k.scala) * r.range(0.9, 1.05)
  const dcx = W * (g.landscape ? 0.7 : 0.66) + r.range(-0.04, 0.04) * W, dcy = g.landscape ? H * 0.36 : H * 0.3
  put(g, { kind: 'circle', name: 'disco', cx: dcx, cy: dcy, r: R, fill: P.acc })
  // passo 2: la foto retinata nel disco, in sovrastampa
  const pr = R * (0.78 + 0.1 * k.densita)
  photo(g, 'foto', { x: dcx - pr + R * 0.12, y: dcy - pr + R * 0.1, w: pr * 2, h: pr * 2 }, { shape: 'circle', blend: g.photo ? over(g, P.acc) : undefined })
  // passo 3: numero gigante a contorno, dietro
  const num = g.c.numero || ''
  let numH = 0
  if (num) {
    const ns = Math.min(sizeForWidth(num, s.display, W * 0.5), H * 0.3)
    numH = ns * 1.13
    txt(g, { name: 'numero', lines: [num], font: s.display, size: ns, x: m * 0.6, y: m * 0.6, color: P.fg, hollow: true, sw: Math.max(1.5, ns * 0.012), deco: true })
  }
  // passo 4: la barra diagonale con il titolo dentro
  const visible = Math.min(W / Math.cos(a), H / Math.abs(Math.sin(a))) * 0.82
  const title = up(g.c.title, s.displayUpper || k.energia > 0.5)
  const one = words(title).length <= 4
  const t = display(g, title, visible * (0.7 + 0.25 * k.scala), H * 0.3, 190, 40, one ? 1 : 2)
  if (!t) return null
  const pad = t.size * 0.3
  const barH = t.h + 2 * pad
  // centro della barra: sotto il disco, verso sinistra
  const bcx = W * 0.48, bcy = g.landscape ? H * 0.66 : H * 0.6
  const L = Math.hypot(W, H) * 1.6
  const bx = bcx - (L / 2) * Math.cos(a) + (barH / 2) * Math.sin(a), by = bcy - (L / 2) * Math.sin(a) - (barH / 2) * Math.cos(a)
  put(g, { kind: 'rect', name: 'velo_barra', x: bx, y: by, w: L, h: barH, fill: P.fg, angle: ang })
  // barra sottile parallela nell'altro inchiostro
  if (k.densita > 0.3) {
    const off = U(g, 22 + 30 * k.densita)
    const h2 = U(g, 14 + 16 * k.densita)
    put(g, { kind: 'rect', name: 'barra_sottile', x: bx - Math.sin(a) * (barH + off), y: by + Math.cos(a) * (barH + off), w: L, h: h2, fill: P.acc2 === P.bg ? P.acc : P.acc2, angle: ang, blend: k.sovrastampa > 0.4 ? over(g) : undefined })
  }
  // il titolo, centrato lungo la barra
  const tx0 = bcx - (t.w / 2) * Math.cos(a) + (t.h / 2) * Math.sin(a), ty0 = bcy - (t.w / 2) * Math.sin(a) - (t.h / 2) * Math.cos(a)
  putDisplay(g, 'titolo', t, tx0, ty0, P.bg, 'center', t.w, { angle: ang, su: P.fg })
  // passo 5: brand e occhiello in verticale sul bordo sinistro
  const brand = lab(g, [g.c.brand, g.c.kicker].filter(Boolean).join('  /  '), H * 0.5)
  if (brand) putLab(g, 'brand', brand, m, Math.max(T, m * 0.6 + numH + U(g, 20)) + brand.w, P.fg, 'left', brand.w, { angle: -90 })
  // passo 6: informazioni in basso a destra, allineate a destra
  const colW = g.landscape ? W * 0.32 : W * 0.5
  const info = infoBlock(g, colW, { kicker: false })
  info.place(W - m - colW, B - info.h, ink(g), 'right')
  // passo 7: blocchetti e puntini lungo l'asse
  if (k.densita > 0.5) {
    dotField(g, 'puntini', { x: m * 1.6, y: H * 0.08 + (num ? H * 0.2 : 0), w: W * 0.28, h: H * 0.18 }, U(g, 16), P.fg, 'x')
    put(g, { kind: 'rect', name: 'tassello', x: dcx - R - U(g, 40), y: dcy + R * 0.2, w: U(g, 46), h: U(g, 46), fill: P.fg, angle: ang })
  }
  return finish(g, 'costruttivo', 'Costruttivista')
}

/* ═══ 5. Risograph ══════════════════════════════════════════════════════ */
export function riso(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r } = g
  const bl = over(g)
  const inkA = P.acc, inkB = P.acc2 === P.bg ? P.fg : P.acc2
  // la zona delle forme e quella del testo
  const side = g.landscape
  const head = lab(g, [g.c.brand, g.c.kicker].filter(Boolean).join('  —  '), side ? (W - 2 * m) * 0.38 : W - 2 * m)
  const zx = m, zy = T + (head && !side ? head.h + U(g, 26) : 0), zw = side ? (W - 2 * m) * 0.58 : W - 2 * m, zh = side ? H - 2 * m : H * ((g.format === 'storia' ? 0.56 : 0.46) + 0.06 * k.scala)
  const cols = side ? 3 : 2, rows = side ? 2 : 3
  const cw = zw / cols, ch = zh / rows
  // passo 1: forme piene in due inchiostri che si sovrappongono
  const kinds = ['cerchio', 'mezzo', 'arco', 'quarto', 'rett', 'triangolo'] as const
  const nShapes = 3 + Math.round(k.densita * 3)
  const reg = U(g, 4 + 18 * k.sovrastampa)
  const cells = Array.from({ length: cols * rows }, (_, i) => i).sort(() => r.next() - 0.5)
  let photoDone = false
  for (let i = 0; i < nShapes; i++) {
    const c = cells[i % cells.length]
    const cx = zx + (c % cols) * cw, cy = zy + Math.floor(c / cols) * ch
    const spanX = r.chance(0.4) && c % cols < cols - 1 ? 2 : 1
    const box = { x: cx, y: cy, w: cw * spanX, h: ch }
    const kind = r.pick([...kinds])
    const color = i % 2 ? inkB : inkA
    const d = shapePath(kind, box, r.int(0, 3))
    if (!photoDone && (kind === 'arco' || kind === 'cerchio') && i > 0) {
      // la foto prende una forma, stampata in riso
      photoDone = true
      const sq = Math.min(box.w, box.h)
      photo(g, 'foto', { x: box.x + (box.w - sq) / 2, y: box.y, w: sq, h: sq }, { shape: kind === 'arco' ? 'arch' : 'circle', blend: bl, fx: g.photo && g.k.trattamento === 'pellicola' ? [{ id: 'riso', p: { ink1: inkA, ink2: inkB, paper: lighter(P.bg, P.fg), reg2: Math.round(2 + 8 * k.sovrastampa) } }] : undefined })
      continue
    }
    put(g, { kind: 'path', name: `forma_${i}`, d, fill: color, blend: bl, opacity: 0.92 })
    // fuori registro: la stessa forma, sfalsata, nell'altro inchiostro
    if (k.sovrastampa > 0.3 && i % 2 === 0) put(g, { kind: 'path', name: `registro_${i}`, d: shapePath(kind, { ...box, x: box.x + reg, y: box.y - reg * 0.6 }, 0), fill: 'transparent', stroke: i % 2 ? inkA : inkB, sw: U(g, 3), blend: bl })
  }
  if (!photoDone && g.photo) {
    const c = cells[nShapes % cells.length]
    const sq = Math.min(cw, ch) * 0.92
    photo(g, 'foto', { x: zx + (c % cols) * cw + (cw - sq) / 2, y: zy + Math.floor(c / cols) * ch + (ch - sq) / 2, w: sq, h: sq }, { shape: 'circle', blend: bl })
  }
  // passo 2: campo di puntini sfumato
  const dc = cells[(nShapes + 1) % cells.length]
  dotField(g, 'puntini', { x: zx + (dc % cols) * cw, y: zy + Math.floor(dc / cols) * ch, w: cw, h: ch }, U(g, 14 + 10 * (1 - k.densita)), inkB, r.pick(['x', 'y', 'r']), bl)
  // passo 3: titolo nell'inchiostro scuro, in sovrastampa sulle forme
  const tx = side ? zx + zw + U(g, 40) : m, tw = side ? W - m - tx : W - 2 * m
  const info = infoBlock(g, side ? tw : tw * 0.62, { kicker: false })
  const top = side ? m + U(g, 50) : zy + zh + U(g, 30)
  const t = display(g, g.c.title, tw, (side ? H - 2 * m - info.h - U(g, 90) : B - info.h - U(g, 40) - top), 230, 50, 4)
  if (!t) return null
  const titleColor = readable(P.bg, [inkA, inkB, P.fg], 3)
  putDisplay(g, 'titolo', t, tx, top, titleColor)
  // passo 4: brand e occhiello come intestazione di stampa
  if (head) putLab(g, 'brand', head, side ? tx : m, T, P.fg)
  info.place(side ? tx : W - m - tw * 0.62, side ? B - info.h : top + t.h + U(g, 34), ink(g), side ? 'left' : 'left')
  return finish(g, 'riso', 'Risograph')
}

function shapePath(kind: string, b: { x: number; y: number; w: number; h: number }, rot: number): string {
  const s = Math.min(b.w, b.h), x = b.x + (b.w - s) / 2, y = b.y + (b.h - s) / 2, rr = s / 2
  switch (kind) {
    case 'cerchio': return `M ${x} ${y + rr} a ${rr} ${rr} 0 1 0 ${s} 0 a ${rr} ${rr} 0 1 0 ${-s} 0 Z`
    case 'mezzo': return [`M ${x} ${y + rr} A ${rr} ${rr} 0 0 1 ${x + s} ${y + rr} Z`, `M ${x + rr} ${y} A ${rr} ${rr} 0 0 1 ${x + rr} ${y + s} Z`, `M ${x} ${y + rr} A ${rr} ${rr} 0 0 0 ${x + s} ${y + rr} Z`, `M ${x + rr} ${y} A ${rr} ${rr} 0 0 0 ${x + rr} ${y + s} Z`][rot % 4]
    case 'arco': return `M ${b.x} ${b.y + b.h} L ${b.x} ${b.y + b.w / 2} A ${b.w / 2} ${b.w / 2} 0 0 1 ${b.x + b.w} ${b.y + b.w / 2} L ${b.x + b.w} ${b.y + b.h} Z`
    case 'quarto': return [`M ${x} ${y} L ${x + s} ${y} A ${s} ${s} 0 0 1 ${x} ${y + s} Z`, `M ${x + s} ${y} L ${x + s} ${y + s} A ${s} ${s} 0 0 1 ${x} ${y} Z`, `M ${x + s} ${y + s} L ${x} ${y + s} A ${s} ${s} 0 0 1 ${x + s} ${y} Z`, `M ${x} ${y + s} L ${x} ${y} A ${s} ${s} 0 0 1 ${x + s} ${y + s} Z`][rot % 4]
    case 'triangolo': return [`M ${x} ${y + s} L ${x + s / 2} ${y} L ${x + s} ${y + s} Z`, `M ${x} ${y} L ${x + s} ${y} L ${x} ${y + s} Z`][rot % 2]
    default: return `M ${b.x} ${b.y} L ${b.x + b.w} ${b.y} L ${b.x + b.w} ${b.y + b.h} L ${b.x} ${b.y + b.h} Z`
  }
}

/* ═══ 6. Griglia modulare ═══════════════════════════════════════════════ */
export function modulare(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const cols = g.landscape ? 6 : 4
  const gw = W - 2 * m, gh = B - T, gut = g.g
  const cw = (gw - (cols - 1) * gut) / cols
  const rows = Math.max(4, Math.round((gh + gut) / (cw + gut)))
  const ch = (gh - (rows - 1) * gut) / rows
  const cell = (c: number, rr: number, sc = 1, sr = 1) => ({ x: m + c * (cw + gut), y: T + rr * (ch + gut), w: sc * cw + (sc - 1) * gut, h: sr * ch + (sr - 1) * gut })
  // passo 1: titolo sulle prime file, a tutta larghezza
  const t = display(g, g.c.title, gw, ch * 2 + gut - U(g, 10), 200 + 60 * k.scala, 44, 3)
  if (!t) return null
  const tr = Math.max(1, Math.ceil((t.h + U(g, 10)) / (ch + gut)))
  const used = new Set<string>()
  const take = (c: number, rr: number, sc = 1, sr = 1) => {
    for (let i = 0; i < sc; i++) for (let j = 0; j < sr; j++) { const key = `${c + i},${rr + j}`; if (used.has(key) || c + i >= cols || rr + j >= rows) return null }
    for (let i = 0; i < sc; i++) for (let j = 0; j < sr; j++) used.add(`${c + i},${rr + j}`)
    return cell(c, rr, sc, sr)
  }
  for (let c = 0; c < cols; c++) for (let rr = 0; rr < tr; rr++) used.add(`${c},${rr}`)
  // passo 2: la griglia a vista
  if (k.densita > 0.35) {
    for (let c = 0; c <= cols; c++) { const x = c === cols ? W - m : m + c * (cw + gut) - (c ? gut / 2 : 0); put(g, { kind: 'line', name: 'griglia', x1: x, y1: T, x2: x, y2: B, color: alpha(P.fg, 0.12), width: Math.max(1, g.u) }) }
  }
  // passo 3: finestre sulla stessa foto (un blocco grande e celle sparse)
  const view = cell(0, tr, cols, rows - tr)
  const big = { c: r.int(0, cols - 2), rr: tr + r.int(0, Math.max(0, rows - tr - 3)) }
  const bigBox = take(big.c, big.rr, 2, Math.min(2, rows - big.rr))
  const pic = (b: ReturnType<typeof cell>, name: string) => {
    if (g.photo) photo(g, name, b, { view })
    else put(g, { kind: 'rect', name, ...b, fill: P.acc, fx: [{ id: 'genFill', p: { mode: 1, c1: P.acc, c2: P.acc2, c3: P.srf, c4: darker(P.bg, P.fg), grain: 25 } }] })
  }
  if (bigBox) pic(bigBox, 'foto')
  const free = () => {
    const list: [number, number][] = []
    for (let rr = tr; rr < rows; rr++) for (let c = 0; c < cols; c++) if (!used.has(`${c},${rr}`)) list.push([c, rr])
    return list
  }
  const extraPics = Math.round(k.densita * 3)
  for (let i = 0; i < extraPics; i++) { const f = free(); if (!f.length) break; const [c, rr] = r.pick(f); const b = take(c, rr); if (b) pic(b, `finestra_${i}`) }
  // passo 4: celle di contenuto: numero, dettagli numerati, testo, invito
  const textCells: (() => boolean)[] = []
  const num = g.c.numero || (g.c.details ?? []).map(d => d.match(/\d[\d.,:%]*/)?.[0]).find(Boolean)
  if (num) textCells.push(() => {
    const f = free().find(([c]) => c < cols - 1); if (!f) return false
    const b = take(f[0], f[1], 2, 1); if (!b) return false
    put(g, { kind: 'rect', name: 'cella_numero', ...b, fill: P.acc })
    const size = Math.min(sizeForWidth(num, s.display, b.w - U(g, 30)), b.h * 0.8)
    txt(g, { name: 'numero', lines: [num], font: s.display, size, x: b.x + U(g, 14), y: b.y + b.h - size * 1.05, color: readable(P.acc, [P.bg, P.fg, '#111111', '#ffffff']), tracking: s.displayTracking, leading: 1 })
    return true
  })
  if (g.c.body) textCells.push(() => {
    const f = free().find(([c]) => c < cols - 1); if (!f) return false
    const b = take(f[0], f[1], 2, 1); if (!b) return false
    const p = para(g, g.c.body, b.w - U(g, 8), Math.max(2, Math.floor(b.h / (30 * g.u))), 22)
    if (!p) return false
    putPara(g, 'testo', p, b.x, b.y, P.fg)
    return true
  })
  for (const [i, d] of (g.c.details ?? []).slice(0, 3).entries()) textCells.push(() => {
    const f = free(); if (!f.length) return false
    const [c, rr] = f[0]; const b = take(c, rr); if (!b) return false
    put(g, { kind: 'line', name: 'filetto', x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y, color: P.fg, width: Math.max(1, 2 * g.u) })
    const n = lab(g, String(i + 1).padStart(2, '0'), b.w, 13); const v = lab(g, d, b.w - U(g, 4), 15)
    if (n) putLab(g, `indice_${i}`, n, b.x, b.y + U(g, 12), ink(g).acc)
    if (v) putLab(g, `dettaglio_${i}`, v, b.x, b.y + b.h - v.h, P.fg)
    return true
  })
  if (g.c.cta) textCells.push(() => {
    const f = free(); const last = f[f.length - 1]; if (!last) return false
    const b = take(last[0], last[1]); if (!b) return false
    put(g, { kind: 'rect', name: 'cella_invito', ...b, fill: P.fg })
    const v = lab(g, g.c.cta, b.w - U(g, 24), 15)
    if (v) putLab(g, 'invito', v, b.x + U(g, 12), b.y + U(g, 14), P.bg)
    txt(g, { name: 'freccia', lines: ['→'], font: s.display, size: b.h * 0.42, x: b.x + b.w - b.h * 0.5, y: b.y + b.h - b.h * 0.52, color: P.acc, leading: 1, deco: true })
    return true
  })
  for (const f of textCells) f()
  // passo 5: celle grafiche nei buchi rimasti: disco, righe, colore pieno
  const rest = free()
  rest.forEach(([c, rr], i) => {
    if (!r.chance(0.35 + k.densita * 0.5)) return
    const b = take(c, rr); if (!b) return
    const kind = (i + r.int(0, 3)) % 4
    if (kind === 0) put(g, { kind: 'circle', name: 'cella_disco', cx: b.x + b.w / 2, cy: b.y + b.h / 2, r: Math.min(b.w, b.h) / 2, fill: P.acc2 === P.bg ? P.acc : P.acc2, blend: over(g) })
    else if (kind === 1) {
      let d = ''
      const st = U(g, 12)
      for (let v = -b.h; v < b.w; v += st) d += `M ${b.x + Math.max(0, v)} ${b.y + Math.max(0, -v)} L ${b.x + Math.min(b.w, v + b.h)} ${b.y + Math.min(b.h, b.h - (v + b.h - b.w > 0 ? v + b.h - b.w : 0))} `
      put(g, { kind: 'path', name: 'cella_righe', d, fill: 'transparent', stroke: P.fg, sw: Math.max(1, 2 * g.u) })
    } else if (kind === 2) put(g, { kind: 'rect', name: 'cella_colore', ...b, fill: P.srf })
    else put(g, { kind: 'glyph', name: 'cella_stella', path: r.pick(s.decor.glyphs), cx: b.x + b.w / 2, cy: b.y + b.h / 2, size: Math.min(b.w, b.h) * 0.7, color: P.acc })
  })
  // titolo sopra a tutto, con brand e occhiello nell'angolo
  putDisplay(g, 'titolo', t, m, T, P.fg)
  const head = lab(g, [g.c.brand, g.c.kicker].filter(Boolean).join('  /  '), gw)
  if (head && t.lines.length < 3) {
    const y = m + tr * (ch + gut) - gut - head.h - U(g, 6)
    if (y > m + t.h + U(g, 12)) putLab(g, 'brand', head, m, y, ink(g).acc)
  }
  return finish(g, 'modulare', 'Griglia modulare')
}

/* ═══ 7. Orbita ═════════════════════════════════════════════════════════ */
export function orbita(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  // passo 1: fondo sfumato generativo nei colori della tavola
  put(g, { kind: 'rect', name: 'fondo', x: 0, y: 0, w: W, h: H, fill: P.bg, fx: [{ id: 'genFill', p: { mode: r.pick([0, 3]), c1: P.bg, c2: P.srf, c3: mix(P.bg, P.acc, 0.45), c4: P.bg, grain: 25, warp: 40, scale: 140 } }] })
  const side = g.landscape
  // passo 2: titolo e informazioni, misurati prima (decidono quanto spazio resta alle orbite)
  const colW = side ? (W - 2 * m) * 0.42 : W - 2 * m
  const info = infoBlock(g, side ? colW : Math.min(colW, W * 0.7), { kicker: false })
  const t = display(g, g.c.title, colW, side ? H * 0.5 : H * 0.24, 150 + 50 * k.scala, 40, 3)
  if (!t) return null
  const textH = t.h + U(g, 30) + info.h
  const cx = side ? m + (W - 2 * m - colW) / 2 : W / 2
  const cy = side ? H / 2 : T + (B - T - textH - U(g, 50)) / 2
  const Rmax = Math.min(side ? (W - 2 * m - colW) / 2 : W / 2 - m * 0.6, side ? H / 2 - m * 0.6 : cy - m * 0.6)
  if (Rmax < U(g, 200)) return null
  // passo 3: anelli di testo che girano, dal più esterno
  const n = 2 + Math.round(k.densita * 3)
  const ringSize = U(g, 17 + 6 * k.scala)
  const step = ringSize * 2.3
  const R0 = Rmax - n * step
  const texts = [g.c.brand, g.c.kicker, detailsLine(g.c), g.c.cta, g.c.title].filter(Boolean) as string[]
  for (let i = 0; i < n; i++) {
    const rr = Rmax - ringSize * 0.6 - i * step
    put(g, { kind: 'circle', name: 'orbita', cx, cy, r: rr + ringSize * 1.15, fill: 'transparent', stroke: alpha(P.fg, 0.25), sw: Math.max(1, g.u) })
    const line = texts[i % texts.length].toUpperCase()
    const circ = 2 * Math.PI * rr
    const unit = `${line}  ✦  `
    const reps = Math.max(1, Math.floor(circ / Math.max(1, lineWidth(unit, s.label, ringSize, 0.12))))
    put(g, { kind: 'arcText', name: `anello_${i}`, cx, cy, r: rr, text: unit.repeat(reps), font: s.label, size: ringSize, color: i % 2 ? P.acc : P.fg, full: true, start: r.range(0, 360) * (0.2 + k.energia) })
  }
  // passo 4: foto tonda al centro, con un alone in sovrastampa
  const pr = Math.max(U(g, 80), R0 - ringSize * 0.8)
  if (k.sovrastampa > 0.2) put(g, { kind: 'circle', name: 'alone', cx: cx - pr * 0.12 * k.sovrastampa * 2, cy: cy + pr * 0.1 * k.sovrastampa * 2, r: pr, fill: P.acc, blend: over(g) })
  photo(g, 'foto', { x: cx - pr, y: cy - pr, w: 2 * pr, h: 2 * pr }, { shape: 'circle' })
  // passo 5: un pianeta sull'orbita esterna e stelle attorno
  const pa = r.range(0, Math.PI * 2)
  put(g, { kind: 'circle', name: 'pianeta', cx: cx + Math.cos(pa) * (Rmax + ringSize * 0.55), cy: cy + Math.sin(pa) * (Rmax + ringSize * 0.55), r: U(g, 12 + 10 * k.densita), fill: P.acc })
  const stars = 2 + Math.round(k.densita * 4)
  for (let i = 0; i < stars; i++) {
    const aa = r.range(0, Math.PI * 2), dd = Rmax + U(g, r.range(40, 120))
    put(g, { kind: 'glyph', name: 'stella', path: r.pick(s.decor.glyphs), cx: cx + Math.cos(aa) * dd, cy: cy + Math.sin(aa) * dd, size: U(g, r.range(22, 54)), color: i % 2 ? P.fg : P.acc })
  }
  // passo 6: titolo e informazioni
  if (side) {
    const x = W - m - colW
    const y = (H - textH) / 2
    putDisplay(g, 'titolo', t, x, y, P.fg)
    info.place(x, y + t.h + U(g, 30), ink(g))
  } else {
    const y = B - textH
    putDisplay(g, 'titolo', t, m, y, P.fg, 'center', W - 2 * m)
    info.place((W - info.w) / 2, y + t.h + U(g, 30), ink(g), 'center')
  }
  // le stelle fuori dalla tavola si tolgono
  g.els = g.els.filter(e => e.kind !== 'glyph' || (e.cx > e.size && e.cx < W - e.size && e.cy > e.size && e.cy < H - e.size))
  return finish(g, 'orbita', 'Orbita')
}

/* ═══ 8. Foto nelle lettere ═════════════════════════════════════════════ */
export function ritaglio(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  if (!g.photo) return null
  // il fondo delle lettere è sempre scuro: la foto dentro le lettere si legge solo così
  const dark = P.dark ? P.bg : mix(darker(P.fg, P.bg), '#000000', 0.25)
  const light = lighter(P.fg, P.bg)
  const onDark = readable(dark, [light, '#ffffff'])
  const accDark = readable(dark, [P.acc, P.acc2, onDark], 3)
  const side = g.landscape
  // passo 1: misure: testata, informazioni, pila di parole col carattere da manifesto
  const brand = lab(g, g.c.brand, W * 0.45), kick = lab(g, g.c.kicker, W * 0.45)
  const headH = Math.max(brand?.h ?? 0, kick?.h ?? 0, U(g, 16))
  const info = infoBlock(g, side ? (W - 2 * m) * 0.42 : (W - 2 * m) * 0.7, { kicker: false })
  const top = T + headH + U(g, 44)
  const maxH = H - top - info.h - U(g, 70) - m
  // le lettere sono la foto: occupano lo spazio che resta (con poco, la fascia scura restava un vuoto)
  const st = stack(g, g.c.title, W - 2 * m, Math.min(maxH, H * (0.62 + 0.25 * k.scala)), g.portrait ? 4 : g.landscape ? 2 : 3)
  if (!s.impactSans && st.sizes.some(z => z < 60 * g.u)) return discard(g, 'lettere troppo sottili per la foto'), null
  const y0 = top + Math.max(0, (maxH - st.h) * 0.45)
  // passo 2: fondo scuro su tutta la tavola (o una fascia larga se lo stile è chiaro)
  // la fascia non sale sulla testata né scende sulle informazioni: sopra un fondo misto non si leggono
  const bandTop = P.dark ? 0 : Math.max(y0 - U(g, 60), T + headH + U(g, 16))
  const bandH = P.dark ? H : Math.min(y0 + st.h + U(g, 60), B - info.h - U(g, 16)) - bandTop
  put(g, { kind: 'rect', name: 'fondo_lettere', x: 0, y: bandTop, w: W, h: bandH, fill: dark })
  // passo 3: per ogni riga: ombra piena fuori registro, foto dentro le lettere, filo chiaro sul bordo
  const view = { x: m, y: y0, w: W - 2 * m, h: st.h }
  const off = U(g, 6 + 16 * k.sovrastampa)
  let y = y0
  st.lines.forEach((l, i) => {
    const size = st.sizes[i], lw = lineWidth(l, st.font, size, st.tr), x = (W - lw) / 2
    if (k.sovrastampa > 0.3) txt(g, { name: 'ombra', lines: [l], font: st.font, size, x: x + off, y: y + off, color: accDark, tracking: st.tr, leading: 1, deco: true })
    photo(g, `foto_${i}`, { x, y, w: lw, h: size * 1.13 }, { clipText: { lines: [l], font: st.font, size, x, y, lineHeight: 1, tracking: st.tr }, view, fx: [], look: s.decor.look, adjust: { ...s.decor.adjust, exposure: 18, contrast: 12 } })
    txt(g, { name: 'filo', lines: [l], font: st.font, size, x, y, color: onDark, hollow: true, sw: Math.max(1, size * 0.008), tracking: st.tr, leading: 1, deco: true })
    y += size * st.lead
  })
  // il titolo come testo vero (invisibile): resta modificabile nello Studio
  y = y0
  st.lines.forEach((l, i) => { const lw = lineWidth(l, st.font, st.sizes[i], st.tr); txt(g, { name: `titolo#${i}`, lines: [l], font: st.font, size: st.sizes[i], x: (W - lw) / 2, y, color: onDark, tracking: st.tr, leading: 1, opacity: 0 }); y += st.sizes[i] * st.lead })
  // passo 4: testata e informazioni, sul colore che hanno sotto
  const headBg = P.dark ? dark : P.bg
  const headFg = readable(headBg, [P.fg, light, '#111111'])
  if (brand) putLab(g, 'brand', brand, m, T, headFg)
  if (kick) putLab(g, 'occhiello', kick, W - m - kick.w, T, readable(headBg, [P.acc, headFg], 3.6))
  const infoBg = P.dark ? dark : P.bg
  info.place(m, B - info.h, { fg: readable(infoBg, [P.fg, light, '#111111']), sec: readable(infoBg, [P.sec, P.fg], 3), acc: readable(infoBg, [P.acc, P.fg], 3.6) })
  if (k.densita > 0.55) put(g, { kind: 'glyph', name: 'stella', path: r.pick(s.decor.glyphs), cx: W - m - U(g, 46), cy: B - U(g, 46), size: U(g, 70), color: readable(infoBg, [P.acc, P.fg], 2) })
  return finish(g, 'ritaglio', 'Foto nelle lettere')
}

export const SYSTEMS_BASE = { supertipo, eco, strisce, costruttivo, riso, modulare, orbita, ritaglio }
