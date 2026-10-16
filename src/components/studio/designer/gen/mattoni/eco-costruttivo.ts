/**
 * Mattoni di Eco e del Costruttivista: le stesse misure degli archetipi di
 * prima, separate per categoria. Eco: ossatura a fasce (nastro in alto,
 * informazioni in basso, campo in mezzo), titolo a eco, foto tonda, nastro e
 * stella. Costruttivista: ossatura ad asse inclinato con il disco, titolo in
 * barra, foto nel disco in sovrastampa, numero a contorno, puntini e tassello.
 */
import {
  type G, put, U, txt, lab, display, putLab, putDisplay, infoBlock, photo, ticker, dotField, sizeForWidth, keyword, up, words, readable, lum,
} from '../tools'
import { lineWidth } from '../../text'
import type { Ossatura, MTitolo, MFoto, MSegno, Box, Zona, Piano, Param } from './tipi'
import { par, no } from './tipi'

const ink = (g: G) => ({ fg: g.P.fg, sec: g.P.sec, acc: readable(g.P.bg, [g.P.acc, g.P.acc2, g.P.fg], 3.6) })
const over = (g: G, under = g.P.bg): GlobalCompositeOperation => (lum(under) < 0.18 ? 'screen' : 'multiply')
const ruota = (b: Box, deg: number): Box => {
  // riquadro allineato agli assi di un rettangolo ruotato attorno al suo centro
  const a = (deg * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a))
  const w = b.w * c + b.h * s, h = b.w * s + b.h * c
  return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h }
}

/* ═══ Eco ═══════════════════════════════════════════════════════════════ */
export const fasce: Ossatura = {
  id: 'fasce', nome: 'Fasce', ricetta: 'eco', cat: 'ossatura', offre: ['campo', 'fascia-alta'],
  param: { nastro: [40, 80], infoLarg: [0.35, 0.6] },
  fai(g, piano, p, gen) {
    const { W, m, T, B } = g
    const tickH = U(g, par(p, 'nastro', 58))
    // senza il nastro il brand sta nella fascia alta, fermo
    if (!gen.dispositivi.some(d => d.id === 'nastro')) {
      const b = lab(g, [g.c.brand, g.c.kicker].filter(Boolean).join('  ·  '), W - 2 * m)
      if (b) putLab(g, 'brand', b, m, Math.max(m * 0.6, (tickH - b.h) / 2), g.P.fg)
    }
    piano.ancore.nastro = { x: 0, y: 0, w: W, h: tickH }
    const info = infoBlock(g, g.landscape ? (W - 2 * m) * par(p, 'infoLarg', 0.45) : W - 2 * m, { kicker: false })
    const infoTop = B - info.h
    const zoneTop = Math.max(tickH + U(g, 24), T)
    const zona: Zona = { x: m, y: zoneTop, w: W - 2 * m, h: infoTop - zoneTop, forma: 'campo' }
    const t = piano.misuraTitolo(zona)
    if (!t) return false
    piano.titolo = t; piano.titoloXY = [zona.x, zona.y]
    piano.zonaFoto = t.campo ?? zona
    info.place(m, infoTop, ink(g))
    piano.info.push({ x: m, y: infoTop, w: info.w, h: info.h })
    piano.ancore.stella ??= [W - m - U(g, 30), infoTop - U(g, 60)]
    return true
  },
}

export const titoloEco: MTitolo = {
  id: 'eco', nome: 'Eco cinetica', ricetta: 'eco', cat: 'titolo', forme: ['campo'],
  param: { passo: [0.6, 1.2], spostamento: [0, 1], riga: [0.2, 0.8] },
  fai(g, piano, z, p) {
    const { W, m, P, s, k, r } = g
    const font = s.display
    const many = words(g.c.title).length > 3
    const full = many ? display(g, g.c.title, z.w, U(g, 140), 54, 28, 2) : null
    const fullTop = full ? z.y + z.h - full.h - U(g, 22) : z.y + z.h
    const zoneTop = z.y, zoneBot = fullTop - U(g, 36)
    const row = up(many ? keyword(g) : g.c.title, true)
    const size = Math.min(sizeForWidth(row, font, z.w * (0.75 + 0.25 * k.scala), s.displayTracking), (zoneBot - zoneTop) * 0.3)
    if (!(size > 30 * g.u)) { no(g, 'eco: campo troppo basso'); return null }
    const rowW = lineWidth(row, font, size, s.displayTracking)
    const step = size * par(p, 'passo', 0.78 + (1 - k.densita) * 0.35)
    const n = Math.max(3, Math.floor((zoneBot - zoneTop - size * 1.13) / step) + 1)
    const fi = Math.min(n - 1, Math.max(0, Math.round((n - 1) * par(p, 'riga', r.pick([0.25, 0.7, 0.5])))))
    const x0 = z.x + (z.w - rowW) / 2
    const fy = zoneTop + fi * step
    const sposta = par(p, 'spostamento', k.energia)
    const colore = ink(g).acc
    return {
      w: z.w, h: z.h,
      campo: { x: z.x, y: zoneTop, w: z.w, h: zoneBot - zoneTop },
      ancore: { stella: [W - m - U(g, 30), fullTop - U(g, 60)], riga: [x0, fy] },
      occupa: () => [{ x: x0, y: fy, w: rowW, h: size * 1.13 }, ...(full ? [{ x: m, y: fullTop, w: full.w, h: full.h }] : [])],
      dietro: () => {
        for (let i = 0; i < n; i++) {
          if (i === fi) continue
          const fade = 1 - Math.abs(i - fi) / n
          txt(g, { name: 'eco', lines: [row], font, size, x: x0 + (i - fi) * sposta * U(g, 70), y: zoneTop + i * step, color: P.fg, hollow: true, sw: Math.max(1.2, size * 0.012 * (1 + k.densita)), opacity: 0.18 + 0.7 * fade, tracking: s.displayTracking, leading: 1, deco: true })
        }
      },
      davanti: () => {
        txt(g, { name: 'titolo', lines: [row], font, size, x: x0, y: fy, color: colore, tracking: s.displayTracking, leading: 1 })
        if (full) putDisplay(g, 'titolo_intero', full, z.x, fullTop, P.fg)
      },
    }
  },
}

/** Il posto di un tondo nella zona della foto: la metà lontana dal titolo, senza toccarne i riquadri. */
function postoTondo(g: G, piano: Piano, p: Param) {
  const { W, r } = g
  const z = piano.zonaFoto!
  const occ = piano.titolo?.occupa(...(piano.titoloXY ?? [0, 0])) ?? []
  const riga = occ[0]
  const D = Math.min(W * par(p, 'diametro', 0.52), z.h * 0.5, z.w)
  if (D < 120 * g.u) return null
  const fy = riga ? riga.y : z.y
  const upHalf = riga ? fy - z.y > (z.h - riga.h) / 2 : r.chance(0.5)
  const cy = upHalf ? z.y + D / 2 + U(g, 10) : z.y + z.h - D / 2
  const cx = z.x + z.w * par(p, 'centro', r.range(0.32 * W - z.x, 0.68 * W - z.x) / z.w)
  const size = riga ? riga.h / 1.13 : 0
  if (riga && Math.abs(cy - (fy + size * 0.56)) <= D / 2 + size * 0.6) return null
  // nessun altro riquadro del titolo dentro il tondo (titolo pieno su più righe, titolo intero)
  const aria = U(g, 16)
  if (occ.slice(1).some(b => cx + D / 2 > b.x - aria && cx - D / 2 < b.x + b.w + aria && cy + D / 2 > b.y - aria && cy - D / 2 < b.y + b.h + aria)) return null
  return { cx, cy, D }
}

/** Foto tonda nella metà del campo lontana dal titolo, con l'alone d'accento in sovrastampa. */
export const tondo: MFoto = {
  id: 'tondo', nome: 'Foto tonda', ricetta: 'eco', cat: 'foto',
  param: { diametro: [0.35, 0.6], centro: [0.3, 0.7], alone: [0, 1] },
  fai(g, piano, p) {
    const { P, k } = g
    const t = postoTondo(g, piano, p)
    if (!t) return false
    const { cx, cy, D } = t
    const alone = par(p, 'alone', k.sovrastampa)
    if (alone > 0.2) put(g, { kind: 'circle', name: 'alone', cx: cx + U(g, 24) * alone, cy: cy - U(g, 20) * alone, r: D / 2, fill: P.acc2, blend: over(g) })
    photo(g, 'foto', { x: cx - D / 2, y: cy - D / 2, w: D, h: D }, { shape: 'circle' })
    return true
  },
}

export const nastro: MSegno = {
  id: 'nastro', nome: 'Nastro scorrevole', ricetta: 'eco', cat: 'dispositivi', serve: ['fascia-alta'],
  fai(g, piano) {
    const b = piano.ancore.nastro as Box
    const tape = [g.c.brand, g.c.kicker].filter(Boolean).join('  ✦  ') || g.c.title
    ticker(g, 'nastro_alto', tape, b.y, b.h, g.P.acc, readable(g.P.acc, [g.P.bg, g.P.fg, '#111111', '#ffffff']))
    return true
  },
}

export const stella: MSegno = {
  id: 'stella', nome: 'Stella', ricetta: 'eco', cat: 'dispositivi', param: { attivo: [0, 1] },
  fai(g, piano, p) {
    const a = piano.ancore.stella as [number, number] | undefined
    if (!a || par(p, 'attivo', g.k.densita) <= 0.6) return false
    put(g, { kind: 'glyph', name: 'stella', path: g.r.pick(g.s.decor.glyphs), cx: a[0], cy: a[1], size: U(g, 56), color: g.P.acc })
    return true
  },
}

/* ═══ Costruttivista ════════════════════════════════════════════════════ */
export const asse: Ossatura = {
  id: 'asse', nome: 'Asse inclinato', ricetta: 'costruttivo', cat: 'ossatura', offre: ['riga', 'disco', 'angolo-numero'],
  param: { angolo: [-40, -8], disco: [0.28, 0.5], discoX: [0.55, 0.75] },
  fai(g, piano, p, gen) {
    const { W, H, m, T, B, P, s, k, r } = g
    const ang = par(p, 'angolo', -(14 + k.energia * 22) + r.range(-4, 4))
    const a = (ang * Math.PI) / 180
    const R = Math.min(W, H) * par(p, 'disco', (g.landscape ? 0.3 : 0.36) + 0.12 * k.scala) * r.range(0.9, 1.05)
    const dcx = W * par(p, 'discoX', g.landscape ? 0.7 : 0.66) + r.range(-0.04, 0.04) * W, dcy = g.landscape ? H * 0.36 : H * 0.3
    put(g, { kind: 'circle', name: 'disco', cx: dcx, cy: dcy, r: R, fill: P.acc })
    piano.zonaFoto = { x: dcx - R, y: dcy - R, w: 2 * R, h: 2 * R, disco: { cx: dcx, cy: dcy, r: R } }
    // il numero a contorno in alto a sinistra: anche senza il dispositivo, il brand gli lascia il posto
    const num = g.c.numero || ''
    const ns = num ? Math.min(sizeForWidth(num, s.display, W * 0.5), H * 0.3) : 0
    piano.ancore.numero = { x: m * 0.6, y: m * 0.6, w: W * 0.5, h: ns * 1.13 }
    const visible = Math.min(W / Math.cos(a), H / Math.abs(Math.sin(a))) * 0.82
    const one = words(g.c.title).length <= 4
    const bcx = W * 0.48, bcy = g.landscape ? H * 0.66 : H * 0.6
    const brand = lab(g, [g.c.brand, g.c.kicker].filter(Boolean).join('  /  '), H * 0.5)
    // un titolo che non sta in una barra non deve arrivare al brand in verticale sul bordo
    const libero = gen.titolo.id === 'barra' ? Infinity : 2 * (bcx - m - (brand ? brand.h + U(g, 30) : 0))
    const tw = Math.min(visible * (0.7 + 0.25 * k.scala), libero), th = H * 0.3
    const t = piano.misuraTitolo({ x: bcx - tw / 2, y: bcy - th / 2, w: tw, h: th, forma: 'riga', angle: ang, maxSize: 190, minSize: 40, maxLines: one ? 1 : 2, caps: s.displayUpper || k.energia > 0.5 })
    if (!t) return false
    piano.titolo = t; piano.titoloXY = [bcx - t.w / 2, bcy - t.h / 2]
    piano.ancore.asse = [bcx, bcy]
    if (brand) putLab(g, 'brand', brand, m, Math.max(T, m * 0.6 + ns * 1.13 + U(g, 20)) + brand.w, P.fg, 'left', brand.w, { angle: -90 })
    const colW = g.landscape ? W * 0.32 : W * 0.5
    const info = infoBlock(g, colW, { kicker: false })
    info.place(W - m - colW, B - info.h, ink(g), 'right')
    piano.info.push({ x: W - m - colW, y: B - info.h, w: colW, h: info.h })
    piano.ancore.tassello = [dcx - R - U(g, 40), dcy + R * 0.2]
    piano.ancore.angolo = [ang, 0]
    return true
  },
}

/** Il titolo dentro una barra piena che attraversa la tavola lungo l'angolo della zona. */
export const barra: MTitolo = {
  id: 'barra', nome: 'Barra', ricetta: 'costruttivo', cat: 'titolo', forme: ['riga', 'campo'],
  param: { margine: [0.2, 0.45], sottile: [0, 1] },
  fai(g, piano, z, p) {
    const { W, H, P, s, k } = g
    const ang = z.angle ?? -(k.energia * 6)
    const a = (ang * Math.PI) / 180
    const title = up(g.c.title, z.caps ?? (s.displayUpper || k.energia > 0.5))
    const t = display(g, title, z.w, z.forma === 'campo' ? Math.min(z.h, H * 0.3) : z.h, z.maxSize ?? 190, z.minSize ?? 40, z.maxLines ?? (words(title).length <= 4 ? 1 : 2))
    if (!t) return null
    const pad = t.size * par(p, 'margine', 0.3)
    const barH = t.h + 2 * pad
    const bcx = z.x + z.w / 2, bcy = z.y + z.h / 2
    const L = Math.hypot(W, H) * 1.6
    const sottile = par(p, 'sottile', k.densita)
    return {
      w: t.w, h: barH,
      occupa: () => [ruota({ x: bcx - t.w / 2, y: bcy - barH / 2, w: t.w, h: barH }, ang)],
      davanti: () => {
        const bx = bcx - (L / 2) * Math.cos(a) + (barH / 2) * Math.sin(a), by = bcy - (L / 2) * Math.sin(a) - (barH / 2) * Math.cos(a)
        put(g, { kind: 'rect', name: 'velo_barra', x: bx, y: by, w: L, h: barH, fill: P.fg, angle: ang })
        if (sottile > 0.3) {
          const off = U(g, 22 + 30 * sottile), h2 = U(g, 14 + 16 * sottile)
          put(g, { kind: 'rect', name: 'barra_sottile', x: bx - Math.sin(a) * (barH + off), y: by + Math.cos(a) * (barH + off), w: L, h: h2, fill: P.acc2 === P.bg ? P.acc : P.acc2, angle: ang, blend: k.sovrastampa > 0.4 ? over(g) : undefined })
        }
        const tx0 = bcx - (t.w / 2) * Math.cos(a) + (t.h / 2) * Math.sin(a), ty0 = bcy - (t.w / 2) * Math.sin(a) - (t.h / 2) * Math.cos(a)
        putDisplay(g, 'titolo', t, tx0, ty0, P.bg, 'center', t.w, { angle: ang || undefined, su: P.fg })
      },
    }
  },
}

/** La foto nel disco (o in un tondo nella zona), in sovrastampa sull'accento. */
export const disco: MFoto = {
  id: 'disco', nome: 'Foto nel disco', ricetta: 'costruttivo', cat: 'foto', param: { raggio: [0.7, 0.95] },
  fai(g, piano, p) {
    const z = piano.zonaFoto!
    // senza il disco dell'ossatura se ne disegna uno dove starebbe la foto tonda, lontano dal titolo
    const t = z.disco ? null : postoTondo(g, piano, p)
    if (!z.disco && !t) return false
    const d = z.disco ?? { cx: t!.cx, cy: t!.cy, r: t!.D / 2 }
    if (!z.disco) put(g, { kind: 'circle', name: 'disco', cx: d.cx, cy: d.cy, r: d.r, fill: g.P.acc })
    const pr = d.r * par(p, 'raggio', 0.78 + 0.1 * g.k.densita)
    photo(g, 'foto', { x: d.cx - pr + d.r * 0.12, y: d.cy - pr + d.r * 0.1, w: pr * 2, h: pr * 2 }, { shape: 'circle', blend: g.photo ? over(g, g.P.acc) : undefined })
    return true
  },
}

export const numeroContorno: MSegno = {
  id: 'numero-contorno', nome: 'Numero gigante a contorno', ricetta: 'costruttivo', cat: 'dispositivi', serve: ['angolo-numero'], prima: true,
  fai(g, piano) {
    const num = g.c.numero || ''
    const b = piano.ancore.numero as Box
    if (!num || !b) return false
    const ns = Math.min(sizeForWidth(num, g.s.display, g.W * 0.5), g.H * 0.3)
    txt(g, { name: 'numero', lines: [num], font: g.s.display, size: ns, x: b.x, y: b.y, color: g.P.fg, hollow: true, sw: Math.max(1.5, ns * 0.012), deco: true })
    return true
  },
}

export const puntini: MSegno = {
  id: 'puntini', nome: 'Puntini e tassello', ricetta: 'costruttivo', cat: 'dispositivi', param: { attivo: [0, 1] },
  fai(g, piano, p) {
    const { W, H, m, P } = g
    if (par(p, 'attivo', g.k.densita) <= 0.5) return false
    dotField(g, 'puntini', { x: m * 1.6, y: H * 0.08 + (g.c.numero ? H * 0.2 : 0), w: W * 0.28, h: H * 0.18 }, U(g, 16), P.fg, 'x')
    const t = piano.ancore.tassello as [number, number] | undefined, ang = (piano.ancore.angolo as [number, number] | undefined)?.[0] ?? 0
    if (t) put(g, { kind: 'rect', name: 'tassello', x: t[0], y: t[1], w: U(g, 46), h: U(g, 46), fill: P.fg, angle: ang })
    return true
  },
}
