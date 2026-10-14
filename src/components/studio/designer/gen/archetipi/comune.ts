/**
 * Attrezzi comuni agli archetipi che compongono con la materia: righe di
 * testo misurate, colori leggibili su un fondo dato, e un blocco di contenuto
 * (testo, voci o dettagli, invito) misurato prima di piazzarlo. Il blocco sa
 * impaginare le voci dei tipi con elenco: così ogni archetipo che lo usa vale
 * anche per consigli, menu, dati, programma.
 */
import type { FontSpec } from '../../types'
import { type G, txt, lab, para, display, putLab, putPara, putDisplay, discard, ctaText, detailsLine, readable, darker, lighter, U } from '../tools'
import { fit, type Fit } from '../../text'
import { righe, conVoci, valoreProtagonista, type Riga } from './voci'

export const no = (g: G, why: string): null => { discard(g, why); return null }
export const variante = (g: G, n: number) => (Math.abs(g.k.seme) >> 3) % n
const MONO = /Mono|Code|Courier/i
export const mono = (g: G): FontSpec => [g.s.label, g.s.text].find(f => MONO.test(f.family)) ?? g.s.label
export const inkSu = (g: G, bg: string, min = 4.5) => readable(bg, [g.P.fg, g.P.bg, '#111111', '#ffffff'], min)
export const accSu = (g: G, bg: string, min = 3.4) => readable(bg, [g.P.acc, g.P.acc2, inkSu(g, bg)], min)
export const scuro = (g: G) => darker(g.P.fg, g.P.bg)
export const chiaro = (g: G) => lighter(g.P.fg, g.P.bg)
export const acc2 = (g: G) => (g.P.acc2 === g.P.bg ? g.P.fg : g.P.acc2)
export const f1 = (n: number) => n.toFixed(1)
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export type Box = { x: number; y: number; w: number; h: number }
export type Pt = [number, number]
export const poly = (pts: Pt[]) => 'M ' + pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join(' L ') + ' Z'
export const rectD = (b: Box) => poly([[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]])
export const circD = (cx: number, cy: number, r: number) => `M ${f1(cx - r)} ${f1(cy)} a ${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0 a ${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0 Z`

/** Una riga in un carattere dato, al corpo più grande che entra (null sotto il minimo). */
export function riga1(g: G, text: string, font: FontSpec, maxW: number, size: number, min = 18, o: { upper?: boolean; tracking?: number; lines?: number } = {}): Fit | null {
  if (!text.trim()) return null
  return fit({ text, font, maxW, maxSize: Math.max(size * g.u, min * g.u), minSize: min * g.u, maxLines: o.lines ?? 1, leading: 1.22, tracking: o.tracking ?? 0.04, upper: o.upper ?? true })
}
export const scrivi = (g: G, name: string, f: Fit, font: FontSpec, x: number, y: number, color: string, o: { align?: 'left' | 'center' | 'right'; w?: number; angle?: number; deco?: boolean; opacity?: number; blend?: GlobalCompositeOperation } = {}) =>
  txt(g, { name, lines: f.lines, font, size: f.size, x, y, color, align: o.align ?? 'left', w: o.w ?? f.w, leading: f.leading ?? 1.22, tracking: f.tracking ?? 0.04, angle: o.angle || undefined, deco: o.deco, opacity: o.opacity, blend: o.blend })

/** Colori del blocco su un fondo: testo, secondario, accento. */
export const tinteSu = (g: G, bg: string) => {
  const fg = inkSu(g, bg, 7)
  return { fg, sec: readable(bg, [g.P.sec, fg], 4.5), acc: accSu(g, bg, 3.6) }
}

/**
 * Blocco di contenuto misurato: occhiello, testo, poi le voci (se il
 * contenuto ne ha) oppure i dettagli, infine l'invito. `place` lo disegna e
 * restituisce dove finisce; null se le voci non entrano nella larghezza.
 */
export function blocco(g: G, w: number, o: { kicker?: boolean; body?: boolean; cta?: boolean; bodyLines?: number; scala?: number; font?: FontSpec } = {}) {
  const q = { kicker: true, body: true, cta: true, ...o }
  const f = o.scala ?? 1
  const parti: { h: number; gap: number; draw: (x: number, y: number, c: ReturnType<typeof tinteSu>, align: 'left' | 'center') => void }[] = []
  const k = q.kicker ? lab(g, g.c.kicker, w) : null
  if (k) parti.push({ h: k.h, gap: g.sc.spazio(2), draw: (x, y, c, al) => putLab(g, 'occhiello', k, x, y, c.acc, al, w) })
  const voci = conVoci(g)
  const b = q.body && !voci ? para(g, g.c.body, w, q.bodyLines ?? 3, 0) : null
  if (b) parti.push({ h: b.h, gap: g.sc.spazio(3), draw: (x, y, c, al) => putPara(g, 'testo', b, x, y, c.fg, al, w) })
  if (voci) {
    const rs = righe(g, { max: 6 })
    if (!rs) return null
    const el = elenco(g, rs, w, f)
    if (!el) return null
    parti.push({ h: el.h, gap: g.sc.spazio(3), draw: (x, y, c) => el.place(x, y, c) })
  } else {
    const d = lab(g, detailsLine(g.c), w)
    if (d) parti.push({ h: d.h, gap: g.sc.spazio(2), draw: (x, y, c, al) => putLab(g, 'dettagli', d, x, y, c.sec, al, w) })
  }
  const cta = q.cta ? lab(g, ctaText(g.c), w) : null
  if (cta) parti.push({ h: cta.h, gap: 0, draw: (x, y, c, al) => putLab(g, 'invito', cta, x, y, c.acc, al, w) })
  if (parti.length) parti[parti.length - 1].gap = 0
  const h = parti.reduce((a, p) => a + p.h + p.gap, 0)
  return {
    h, w,
    place(x: number, y: number, c: ReturnType<typeof tinteSu>, align: 'left' | 'center' = 'left') {
      let yy = y
      for (const p of parti) { p.draw(x, yy, c, align); yy += p.h + p.gap }
      return yy
    },
  }
}

/**
 * Le voci in colonna: numero piccolo nell'accento, nome nel carattere del
 * titolo, valore a destra (o sopra, grande, se è il protagonista), spiegazione
 * sotto. Tutti i nomi allo stesso corpo.
 */
export function elenco(g: G, rs: Riga[], w: number, f = 1) {
  const s = g.s
  const prot = valoreProtagonista(g)
  const numW = U(g, 52)
  const vals = rs.map(r => (r.valore ? (prot ? display(g, r.valore, w - numW, U(g, 120), 76 * f, 30, 1) : lab(g, r.valore, w * 0.3, 26 * f)) : null))
  if (rs.some((r, i) => r.valore && !vals[i])) return null
  const nomeW = (i: number) => w - numW - (!prot && vals[i] ? vals[i]!.w + U(g, 24) : 0)
  const tryNome = (i: number, max: number) => fit({ text: rs[i].nome, font: s.display, maxW: nomeW(i), maxSize: max, minSize: 22 * g.u, maxLines: 2, leading: 1.1, tracking: 0, balance: true })
  const size = Math.min(...rs.map((_, i) => tryNome(i, 40 * f * g.u)?.size ?? 0))
  if (!size) return null
  const nomi = rs.map((_, i) => tryNome(i, size)!)
  const testi = rs.map(r => (r.testo ? para(g, r.testo, w - numW, 2, 22) : null))
  const gap = U(g, 20 * Math.min(f, 1.4))
  const alt = rs.map((_, i) => (prot && vals[i] ? vals[i]!.h + U(g, 12) : 0) + nomi[i].h + (testi[i] ? testi[i]!.h + U(g, 12) : 0))
  const h = alt.reduce((a, b) => a + b, 0) + gap * (rs.length - 1)
  return {
    h,
    place(x: number, y: number, c: ReturnType<typeof tinteSu>) {
      let yy = y
      rs.forEach((r, i) => {
        const nf = riga1(g, r.n, s.label, numW - U(g, 10), 20, 16, { tracking: 0.08 })
        if (nf) putLab(g, `numero_${i}`, nf, x, yy + U(g, 4), c.acc)
        let ty = yy
        if (prot && vals[i]) { putDisplay(g, `valore_${i}`, vals[i]!, x + numW, ty, c.acc, 'left', vals[i]!.w); ty += vals[i]!.h + U(g, 12) }
        txt(g, { name: `voce_${i}`, lines: nomi[i].lines, font: s.display, size: nomi[i].size, x: x + numW, y: ty, color: c.fg, leading: 1.1 })
        if (!prot && vals[i]) putLab(g, `valore_${i}`, vals[i]!, x + w - vals[i]!.w, ty + U(g, 4), c.acc)
        ty += nomi[i].h
        if (testi[i]) { ty += U(g, 12); putPara(g, `testo_${i}`, testi[i]!, x + numW, ty, c.sec); ty += testi[i]!.h }
        yy = ty + gap
      })
      return yy - gap
    },
  }
}

/** Titolo nel carattere del titolo, misurato. */
export const titolo = (g: G, w: number, h: number, max: number, lines = 3, min = 44) => display(g, g.c.title, w, h, max, min, lines)
export { putDisplay, putLab, lab }
