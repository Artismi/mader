/**
 * Compositore generativo: invece di applicare un'impaginazione fissa, taglia
 * la tavola in celle (tagli ricorsivi con rapporti da grafico: terzi, sezione
 * aurea, metà) e assegna a ogni cella un ruolo: titolo, informazioni, foto,
 * campo di colore, numero, segno del registro, contenuto (elenco, programma,
 * dati…) o vuoto. Celle accostate (blocchi al vivo) o staccate (canale bianco),
 * fondi colorati, titolo sopra la foto con un velo, titolo ruotato in una cella
 * stretta: le ossature possibili sono migliaia, il seme ne sceglie una.
 */
import type { Scene, TipoContenuto } from '../types'
import {
  type G, put, U, txt, lab, display, putLab, putDisplay, infoBlock, photo, finish, sizeForWidth, mix, alpha, readable, contrast,
} from './tools'
import { blobPath, scribbleEllipse, wobblyPath, starPath } from './forme'
import { dotField } from './tools'
import { BLOCCHI } from './tipi'
import { lineWidth } from '../text'

type Ruolo = 'titolo' | 'info' | 'titoloinfo' | 'foto' | 'fototitolo' | 'campo' | 'numero' | 'segno' | 'voci' | 'vuoto'
interface Cella { x: number; y: number; w: number; h: number; ruolo?: Ruolo; fondo?: string; bordi: { t: boolean; r: boolean; b: boolean; l: boolean } }

const RAPPORTI = [1 / 3, 0.382, 0.5, 0.618, 2 / 3]

/** Tagli ricorsivi della tavola. */
function taglia(g: G, c: Cella, depth: number, maxDepth: number, out: Cella[]) {
  const { r, u } = g
  const minLato = 220 * u
  const stop = depth >= maxDepth || (depth > 0 && r.chance(0.18 + depth * 0.18)) || (c.w < minLato * 2 && c.h < minLato * 2)
  if (stop) { out.push(c); return }
  const verticale = c.w < minLato * 2 ? false : c.h < minLato * 2 ? true : r.chance(c.w > c.h * 1.15 ? 0.72 : c.h > c.w * 1.15 ? 0.28 : 0.5)
  const estremi = g.k.energia > 0.6 ? [0.25, 0.75] : []
  const k = r.pick([...RAPPORTI, ...estremi])
  if (verticale) {
    const w1 = Math.round((c.w * k) / g.ms.b) * g.ms.b
    if (w1 < minLato || c.w - w1 < minLato) { out.push(c); return }
    taglia(g, { ...c, w: w1, bordi: { ...c.bordi, r: false } }, depth + 1, maxDepth, out)
    taglia(g, { ...c, x: c.x + w1, w: c.w - w1, bordi: { ...c.bordi, l: false } }, depth + 1, maxDepth, out)
  } else {
    const h1 = Math.round((c.h * k) / g.ms.b) * g.ms.b
    if (h1 < minLato || c.h - h1 < minLato) { out.push(c); return }
    taglia(g, { ...c, h: h1, bordi: { ...c.bordi, b: false } }, depth + 1, maxDepth, out)
    taglia(g, { ...c, y: c.y + h1, h: c.h - h1, bordi: { ...c.bordi, t: false } }, depth + 1, maxDepth, out)
  }
}

/** Riquadro utile dentro una cella: margine sui lati della tavola, metà canale sui lati interni (+ respiro per i testi). */
function interno(g: G, c: Cella, respiro: number, staccate: boolean) {
  const half = staccate ? g.g / 2 : 0
  const t = c.bordi.t ? Math.max(g.T, g.m) : half + respiro, b = c.bordi.b ? Math.max(g.H - g.B, g.m) : half + respiro
  const l = c.bordi.l ? g.m : half + respiro, rr = c.bordi.r ? g.m : half + respiro
  return { x: c.x + l, y: c.y + t, w: c.w - l - rr, h: c.h - t - b }
}
/** Riquadro della cella per foto e campi: al vivo se le celle sono accostate, altrimenti col canale. */
function pieno(g: G, c: Cella, staccate: boolean) {
  if (!staccate) return { x: c.x, y: c.y, w: c.w, h: c.h }
  const half = g.g / 2
  const t = c.bordi.t ? g.m : half, b = c.bordi.b ? g.m : half, l = c.bordi.l ? g.m : half, rr = c.bordi.r ? g.m : half
  return { x: c.x + l, y: c.y + t, w: c.w - l - rr, h: c.h - t - b }
}

const area = (c: Cella) => c.w * c.h

export function composto(g: G): Scene | null {
  const { W, H, P, s, k, r, c } = g
  const tipo: TipoContenuto = c.tipo && c.tipo !== 'copertina' && BLOCCHI[c.tipo] ? c.tipo : 'copertina'
  const haVoci = tipo !== 'copertina'
  // passo 1: l'ossatura
  const celle: Cella[] = []
  const maxDepth = 2 + (k.densita > 0.55 ? 1 : 0) + (haVoci ? 0 : r.chance(0.3) ? 1 : 0)
  taglia(g, { x: 0, y: 0, w: W, h: H, bordi: { t: true, r: true, b: true, l: true } }, 0, maxDepth, celle)
  if (celle.length < 2) return null
  const staccate = r.chance(s.forma === 'netto' || s.forma === 'decostruito' ? 0.45 : 0.6)
  // passo 2: i ruoli. Prima il contenuto (serve spazio), poi titolo, foto, informazioni, il resto
  const libere = () => celle.filter(x => !x.ruolo)
  const prendi = (pred: (x: Cella) => boolean, ord: (a: Cella, b: Cella) => number) => libere().filter(pred).sort(ord)[0]
  if (haVoci) {
    const v = prendi(x => area(x) > W * H * 0.3 && x.w > W * 0.45, (a, b) => area(b) - area(a))
    if (!v) return null
    v.ruolo = 'voci'
  }
  const titoloCand = libere().filter(x => x.w > W * 0.38 && x.h > 150 * g.u).sort((a, b) => area(b) - area(a))
  if (!titoloCand.length) return null
  const tc = titoloCand[Math.min(titoloCand.length - 1, r.int(0, Math.min(2, titoloCand.length - 1)))]
  // con poche celle, titolo e informazioni stanno insieme
  tc.ruolo = libere().length <= 2 || r.chance(0.35) ? 'titoloinfo' : 'titolo'
  if (g.photo || r.chance(0.5)) {
    const f = prendi(() => true, (a, b) => area(b) - area(a))
    if (f) {
      // a volte il titolo va sopra la foto, con un velo
      if (!haVoci && tc.ruolo === 'titolo' && r.chance(0.25 + k.energia * 0.2) && area(f) > area(tc)) { f.ruolo = 'fototitolo'; tc.ruolo = 'info' }
      else f.ruolo = 'foto'
    }
  }
  const haInfo = celle.some(x => x.ruolo === 'titoloinfo' || x.ruolo === 'info')
  if (!haInfo) {
    const i = prendi(x => x.w > W * 0.3 && x.h > 140 * g.u, (a, b) => area(a) - area(b))
    if (i) i.ruolo = 'info'
    else if (tc.ruolo === 'titolo') tc.ruolo = 'titoloinfo'
  }
  if (c.numero) { const n = prendi(x => x.w > 180 * g.u && x.h > 160 * g.u, (a, b) => area(a) - area(b)); if (n && r.chance(0.7)) n.ruolo = 'numero' }
  for (const x of libere()) x.ruolo = r.chance(0.35 * (1 - k.densita)) ? 'vuoto' : r.chance(0.5) ? 'campo' : 'segno'
  // passo 3: i fondi delle celle (campi pieni, a volte anche sotto il titolo o le informazioni)
  const tinte = [P.acc, P.srf, P.fg, P.acc2].filter((t, i, a) => a.indexOf(t) === i)
  for (const x of celle) {
    if (x.ruolo === 'campo') x.fondo = r.pick(tinte)
    else if ((x.ruolo === 'titolo' || x.ruolo === 'titoloinfo' || x.ruolo === 'info' || x.ruolo === 'numero') && r.chance(staccate ? 0.25 : 0.4)) x.fondo = r.pick(tinte)
  }
  // passo 4: disegno, cella per cella
  const brandFatto = { v: false }
  for (const x of celle) {
    const F = x.fondo ?? P.bg
    const fg = readable(F, [P.fg, P.bg, '#111111', '#ffffff'])
    const accTxt = readable(F, [P.acc, P.acc2, fg], 3.6)
    const colori = { fg, sec: mix(fg, F, 0.28), acc: accTxt }
    if (x.fondo) put(g, { kind: 'rect', name: x.ruolo === 'campo' ? 'campo' : 'velo_cella', ...pieno(g, x, staccate), fill: x.fondo, r: s.forma === 'morbido' && staccate ? U(g, 24) : 0 })
    const box = interno(g, x, U(g, 28), staccate)
    if (box.w < 120 * g.u || box.h < 60 * g.u) continue
    switch (x.ruolo) {
      case 'foto': {
        const b = pieno(g, x, staccate)
        const sq = Math.min(b.w, b.h)
        const quadra = b.w / b.h > 0.75 && b.w / b.h < 1.33
        if (s.forma === 'morbido' && quadra && staccate) {
          const bb = { x: b.x + (b.w - sq) / 2, y: b.y + (b.h - sq) / 2, w: sq, h: sq }
          if (g.photo) photo(g, 'foto', bb, { mask: blobPath(r, bb, 0.2, 8) }); else put(g, { kind: 'path', name: 'foto', d: blobPath(r, bb, 0.2, 8), fill: P.acc })
        } else photo(g, 'foto', b, s.registro === 'lusso' && b.h > b.w * 1.2 && staccate ? { shape: 'arch' } : quadra && r.chance(0.2) && staccate ? { shape: 'circle' } : {})
        break
      }
      case 'fototitolo': {
        const b = pieno(g, x, staccate)
        photo(g, 'foto', b)
        const t = display(g, c.title, box.w, box.h * 0.45, 150 + 60 * k.scala, 48, 3)
        if (!t) return null
        // velo pieno sotto il titolo (la foto resta protagonista sopra)
        const vh = t.h + U(g, 60) + (x.bordi.b ? Math.max(g.H - g.B, g.m) : U(g, 30))
        put(g, { kind: 'rect', name: 'velo_titolo', x: b.x, y: b.y + b.h - vh, w: b.w, h: vh, fill: P.bg })
        putDisplay(g, 'titolo', t, box.x, b.y + b.h - vh + U(g, 30), P.fg, 'left', box.w)
        break
      }
      case 'titolo': case 'titoloinfo': {
        const conInfo = x.ruolo === 'titoloinfo'
        const info = conInfo ? infoBlock(g, Math.min(box.w, 640 * g.u), { kicker: true }) : null
        const head = !brandFatto.v ? lab(g, c.brand, box.w * 0.7) : null
        const resto = (info ? info.h + U(g, 36) : 0) + (head ? head.h + U(g, 24) : 0)
        // cella stretta e alta: titolo ruotato lungo il lato (gesto, con energia)
        const ruotato = !conInfo && box.h > box.w * 1.8 && k.energia > 0.45
        const t = ruotato
          ? display(g, c.title, box.h, box.w * 0.9, 180, 48, 2)
          : display(g, c.title, box.w, box.h - resto, 110 + 90 * k.scala, 42, 4)
        if (!t) return null
        if (head) { putLab(g, 'brand', head, box.x, box.y, colori.sec); brandFatto.v = true }
        if (ruotato) {
          putDisplay(g, 'titolo', t, box.x, box.y + box.h, fg, 'left', box.h, { angle: -90, su: F })
          break
        }
        // allineamento verticale: in alto, in basso o al centro della cella
        const blocco = t.h + (info ? info.h + U(g, 36) : 0)
        const top0 = box.y + (head ? head.h + U(g, 24) : 0)
        const spazio = box.y + box.h - top0 - blocco
        const vy = r.pick([0, 1, 0.5])
        let y = top0 + Math.max(0, spazio) * vy
        const centro = s.forma === 'morbido' && r.chance(0.3)
        putDisplay(g, 'titolo', t, box.x, y, fg, centro ? 'center' : 'left', box.w, { su: F })
        y += t.h + U(g, 36)
        if (info) info.place(centro ? box.x + (box.w - info.w) / 2 : box.x, y, colori, centro ? 'center' : 'left')
        break
      }
      case 'info': {
        const info = infoBlock(g, Math.min(box.w, 640 * g.u), { kicker: true })
        if (info.h > box.h) return null
        const head = !brandFatto.v ? lab(g, c.brand, box.w * 0.7) : null
        if (head) { putLab(g, 'brand', head, box.x, box.y, colori.sec); brandFatto.v = true }
        const y = r.chance(0.6) ? box.y + box.h - info.h : box.y + (head ? head.h + U(g, 24) : 0)
        info.place(box.x, y, colori)
        break
      }
      case 'numero': {
        const num = c.numero!
        const size = Math.min(sizeForWidth(num, s.impact, box.w * 0.9, -0.02), box.h / 1.13)
        if (size < 70 * g.u) break
        txt(g, { name: 'numero', lines: [num], font: s.impact, size, x: box.x, y: box.y + box.h - size * 1.13, color: readable(F, [P.acc, P.acc2, fg], 2.4), tracking: -0.02, leading: 1 })
        break
      }
      case 'segno': segno(g, pieno(g, x, staccate), x.fondo)
        break
      case 'voci': {
        const blocco = BLOCCHI[tipo]
        if (!blocco || !blocco(g, box)) return null
        break
      }
    }
  }
  // l'ossatura è già generata: lo specchio non aggiunge varietà e invertirebbe gli elenchi
  return finish(g, 'composto', 'Composto', { specchio: false })
}

/** Segno del registro che riempie una cella: ornamento del laboratorio, campo di puntini, blob, scarabocchi, glifo. */
function segno(g: G, b: { x: number; y: number; w: number; h: number }, fondo?: string) {
  const { P, s, r } = g
  const ink2 = fondo ? readable(fondo, [P.acc, P.acc2, P.fg, P.bg], 1.6) : (P.acc2 === P.bg ? P.acc : P.acc2)
  const scelta = r.pick(s.forma === 'morbido' ? ['blob', 'ornamento', 'glifo'] : s.forma === 'mano' ? ['scarabocchio', 'ornamento', 'righe'] : s.forma === 'decostruito' ? ['puntini', 'scarabocchio', 'ornamento'] : ['puntini', 'ornamento', 'righe'])
  switch (scelta) {
    case 'blob': put(g, { kind: 'path', name: 'blob', d: blobPath(r, { x: b.x + b.w * 0.1, y: b.y + b.h * 0.1, w: b.w * 0.8, h: b.h * 0.8 }, 0.4, 7), fill: mix(fondo ?? P.bg, P.acc, 0.5) }); break
    case 'puntini': dotField(g, 'puntini', b, U(g, 16 + r.range(0, 14)), ink2, r.pick(['x', 'y', 'r'])); break
    case 'scarabocchio': put(g, { kind: 'path', name: 'segno', d: scribbleEllipse(r, { x: b.x + b.w * 0.2, y: b.y + b.h * 0.3, w: b.w * 0.6, h: b.h * 0.4 }), fill: 'transparent', stroke: ink2, sw: U(g, 5) }); break
    case 'righe': {
      let d = ''
      const st = U(g, 14 + r.range(0, 12))
      for (let v = 0; v < b.h; v += st) d += s.forma === 'mano' ? wobblyPath(r, b.x, b.y + v, b.x + b.w, b.y + v, U(g, 2)) + ' ' : `M ${b.x} ${b.y + v} L ${b.x + b.w} ${b.y + v} `
      put(g, { kind: 'path', name: 'righe', d, fill: 'transparent', stroke: alpha(ink2, 0.8), sw: U(g, 3) })
      break
    }
    case 'glifo': put(g, { kind: 'glyph', name: 'glifo', path: r.pick(s.decor.glyphs), cx: b.x + b.w / 2, cy: b.y + b.h / 2, size: Math.min(b.w, b.h) * 0.6, color: ink2 }); break
    default: {
      // ornamento generativo del laboratorio, nei colori della tavola
      put(g, { kind: 'ornament', name: 'ornamento', id: r.pick(s.decor.ornaments), x: b.x, y: b.y, w: b.w, h: b.h, seed: r.int(1, 99999), opacity: 1, pal: { bg: fondo ?? P.bg, ink: P.fg, accent: P.acc, muted: P.sec, surface: P.srf } })
    }
  }
}

/** Per i test: stella decorativa usata dai segni (evita l'avviso di import inutilizzato). */
export const _forme = { starPath, contrast, lineWidth }
