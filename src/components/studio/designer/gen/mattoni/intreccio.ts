/**
 * Intrecci voluti tra gli strati (V1, punto 3 del pilota): un livello di
 * profondità progettato, non un incidente.
 * - davanti-dietro: il titolo passa dietro la foto (o il disco) e poi davanti:
 *   metà figura ripetuta sopra il titolo, l'altra metà resta sotto;
 * - sovrastampa: copia del titolo fuori registro, in moltiplica, dietro;
 * - foto nelle lettere: la foto dentro il titolo, con il filo del contorno;
 * - incastro: una forma nel vuoto in fondo alla riga più corta, a filo delle lettere.
 * Ogni elemento che sta sopra un testo dichiara l'intreccio (`intreccio`): il
 * controllo degli spazi (`intrecci` in gen/spazi.ts) applica la regola di
 * leggibilità e annulla l'intreccio che copre troppo.
 */
import type { SceneEl, Intreccio } from '../../types'
import { type G, put, photo, readable, contrast, lum, U } from '../tools'
import { righeVere, copertura, nelMezzoDisco } from '../spazi'
import type { MSegno } from './tipi'
import { par } from './tipi'

type Text = Extract<SceneEl, { kind: 'text' }>
const over = (g: G): GlobalCompositeOperation => (lum(g.P.bg) < 0.18 ? 'screen' : 'multiply')
/** il titolo principale: il più grande tra i testi del titolo, non ruotato */
const titolo = (g: G) => g.els.filter((e): e is Text => e.kind === 'text' && !e.deco && /^titolo/.test(e.name) && !e.angle).sort((a, b) => b.size - a.size)[0]
const i = (g: G, e: SceneEl) => g.els.indexOf(e)

const mezzoDisco = (a: NonNullable<Intreccio['area']>) => {
  const f = (v: number) => v.toFixed(1)
  const p1 = [a.cx - a.r * a.ny, a.cy + a.r * a.nx], p2 = [a.cx + a.r * a.ny, a.cy - a.r * a.nx]
  return `M ${f(p1[0])} ${f(p1[1])} A ${f(a.r)} ${f(a.r)} 0 0 0 ${f(p2[0])} ${f(p2[1])} Z`
}

export const davantiDietro: MSegno = {
  id: 'davanti-dietro', nome: 'Titolo dietro e davanti la figura', ricetta: 'intreccio', cat: 'intreccio', param: { avvicina: [0, 0.6] },
  fai(g, _piano, p) {
    const t = titolo(g)
    type Fig = Extract<SceneEl, { kind: 'image' | 'circle' }>
    const fig = g.els.find((e): e is Fig => (e.kind === 'image' && e.shape === 'circle' && !e.clipText && !e.mask) || (e.kind === 'circle' && (e.name === 'foto' || e.name === 'disco')))
    if (!t || !fig) return false
    const c0 = fig.kind === 'circle' ? { cx: fig.cx, cy: fig.cy, r: fig.r } : { cx: fig.x + fig.w / 2, cy: fig.y + fig.h / 2, r: Math.min(fig.w, fig.h) / 2 }
    const rs = righeVere(t)
    const tc = { x: (Math.min(...rs.map(r => r.x0)) + Math.max(...rs.map(r => r.x1))) / 2, y: (Math.min(...rs.map(r => r.y0)) + Math.max(...rs.map(r => r.y1))) / 2 }
    const passi = [0, 0.15, 0.3, 0.45, 0.6].filter(s => s <= par(p, 'avvicina', 0.6) + 1e-6)
    for (const s of passi) {
      const cx = c0.cx + (tc.x - c0.cx) * s, cy = c0.cy + (tc.y - c0.cy) * s
      if (cx - c0.r < -g.W * 0.1 || cx + c0.r > g.W * 1.1 || cy - c0.r < -g.H * 0.1 || cy + c0.r > g.H * 1.1) continue
      const versi: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      const k0 = g.r.int(0, 3)
      for (const [nx, ny] of versi.map((_, j) => versi[(j + k0) % 4])) {
        const area = { cx, cy, r: c0.r, nx, ny }
        const sopra = copertura(t, (x, y) => nelMezzoDisco(area, x, y))
        const sotto = copertura(t, (x, y) => nelMezzoDisco({ ...area, nx: -nx, ny: -ny }, x, y))
        // la regola: la figura copre al massimo un quarto di ogni riga, e il titolo le passa sopra dall'altra parte
        if (Math.max(...sopra) > 0.25 || sopra.reduce((a, b) => a + b, 0) / sopra.length < 0.04 || Math.max(...sotto) < 0.04) continue
        const dx = cx - c0.cx, dy = cy - c0.cy
        for (const e of g.els) {
          if (e === fig || (e.kind === 'circle' && e.name === 'alone')) {
            if (e.kind === 'circle') { e.cx += dx; e.cy += dy } else if (e.kind === 'image') { e.x += dx; e.y += dy }
          }
        }
        const ii: Intreccio = { tipo: 'davanti-dietro', sopra: true, copre: t.name, area }
        if (fig.kind === 'image') g.els.push({ ...fig, name: 'foto_sopra', shape: undefined, mask: mezzoDisco(area), intreccio: ii } as SceneEl)
        else put(g, { kind: 'path', name: 'figura_sopra', d: mezzoDisco(area), fill: fig.fill, blend: fig.blend, opacity: fig.opacity, fx: fig.fx, intreccio: ii })
        return true
      }
    }
    return false
  },
}

export const sovrastampa: MSegno = {
  id: 'sovrastampa', nome: 'Titolo fuori registro', ricetta: 'intreccio', cat: 'intreccio', param: { scarto: [0.025, 0.07] },
  fai(g, _piano, p) {
    const ts = g.els.filter((e): e is Text => e.kind === 'text' && !e.deco && /^titolo/.test(e.name) && !e.hollow)
    if (!ts.length) return false
    const tinta = readable(g.P.bg, [g.P.acc2, g.P.acc, g.P.fg].filter(c => c !== g.P.bg), 1.3)
    if (contrast(tinta, g.P.bg) < 1.2) return false
    const sc = par(p, 'scarto', 0.04), verso = g.r.chance(0.5) ? 1 : -1
    for (const t of ts) {
      const copia: Text = { ...t, name: `${t.name}_registro`, color: tinta, blend: over(g), deco: true, opacity: 0.9, x: t.x + verso * t.size * sc, y: t.y + t.size * sc * 0.8, intreccio: { tipo: 'sovrastampa' } }
      g.els.splice(i(g, t), 0, copia)
    }
    return true
  },
}

export const fotoLettere: MSegno = {
  id: 'foto-lettere', nome: 'Foto nelle lettere', ricetta: 'intreccio', cat: 'intreccio',
  fai(g) {
    const t = titolo(g)
    // la regola del grafico: lettere grandi e piene, fondo scuro sotto, il filo chiaro sul bordo
    if (!g.photo || !t || t.hollow || t.size < 90 * g.u || lum(g.P.bg) > 0.2 || (t.lines.length > 1 && t.align !== 'left')) return false
    const dx = t.align === 'left' ? 0 : t.align === 'right' ? t.w - t.tw : (t.w - t.tw) / 2
    const n0 = g.els.length
    photo(g, 'foto_lettere', { x: t.x, y: t.y, w: t.w, h: t.h }, { clipText: { lines: t.lines, font: t.font, size: t.size, x: t.x + dx, y: t.y, lineHeight: t.lineHeight, tracking: t.tracking } })
    const im = g.els[n0]
    if (!im) return false
    const ii: Intreccio = { tipo: 'foto-lettere', sopra: true, copre: t.name }
    Object.assign(im, { intreccio: ii })
    const filo = readable(g.P.bg, ['#ffffff', g.P.fg], 4)
    g.els.push({ ...t, name: 'titolo_filo', hollow: true, stroke: filo, color: filo, sw: Math.max(1.5, t.size * 0.012), deco: true, intreccio: ii })
    return true
  },
}

export const incastro: MSegno = {
  id: 'incastro', nome: 'Forma a incastro nel titolo', ricetta: 'intreccio', cat: 'intreccio', param: { misura: [0.6, 1] },
  fai(g, _piano, p) {
    const t = titolo(g)
    if (!t || t.lines.length < 2 || t.align === 'center') return false
    const rs = righeVere(t)
    if (rs.length < 2) return false
    const dx = t.align === 'right' ? -1 : 1
    const bordo = dx > 0 ? Math.max(...rs.map(r => r.x1)) : Math.min(...rs.map(r => r.x0))
    const j = rs.map((r, k) => ({ k, vuoto: dx > 0 ? bordo - r.x1 : r.x0 - bordo })).sort((a, b) => b.vuoto - a.vuoto)[0]
    const r = rs[j.k], h = r.y1 - r.y0, aria = t.size * 0.16
    const d = Math.min(h * par(p, 'misura', 0.9), j.vuoto - aria * 1.5)
    if (d < h * 0.5 || d < U(g, 40)) return false
    const cx = (dx > 0 ? r.x1 + aria : r.x0 - aria) + (dx * d) / 2, cy = (r.y0 + r.y1) / 2
    const tinta = readable(g.P.bg, [g.P.acc, g.P.acc2, g.P.fg], 1.8)
    if (g.r.chance(0.5) && g.s.decor.glyphs.length) put(g, { kind: 'glyph', name: 'incastro', path: g.r.pick(g.s.decor.glyphs), cx, cy, size: d, color: tinta })
    else put(g, { kind: 'circle', name: 'incastro', cx, cy, r: d / 2, fill: tinta })
    return true
  },
}

export const INTRECCI: MSegno[] = [davantiDietro, sovrastampa, fotoLettere, incastro]
