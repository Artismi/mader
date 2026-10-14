/**
 * Archetipi del gruppo A · editoriale e tipografico. Ogni funzione compone una tavola
 * intera con gli strumenti di ../tools e ../forme, legge regolatori e registro,
 * ha varianti interne scelte dal seme e chiude con finish().
 * Le idee e le ricette d'origine sono in ./elenco.ts.
 *
 *   manifesto     griglia a 12 colonne, titolo enorme a bandiera, colonne numerate, foto in un modulo
 *   scalinata     le parole scendono a gradini, la foto (o il pieno) riempie il triangolo sotto la scala
 *   strilli       copertina: testata gigante, foto a tutta pagina, strilli numerati, bollino, codice a barre
 *   colonne       pagina di rivista: testatina, titolo, capolettera, colonne, foto stretta, acquerello
 *   centrato      locandina simmetrica: cornice doppia, fregi, righe di corpi diversi, foto ovale o ad arco
 *   verticale     titolo in piedi a tutta altezza, foto alta e stretta, segni a pennarello
 *   iniziale      l'iniziale del titolo enorme (piena, con la foto dentro o a contorno), titolo accanto
 *   calligrafico  tanto vuoto, pennellate (ensō, tratti), timbro rosso, titolo sottile in colonna
 */
import type { Scene, SceneEl, FontSpec } from '../../types'
import {
  type G, put, U, txt, lab, para, display, putLab, putPara, putDisplay, photo, treat, printMarks, regMark,
  dotField, finish, keyword, stackLines, accentChars, sizeForWidth, detailsLine, ctaText, mix, alpha, readable, darker, lighter,
  words, up, lum, contrast, textBox,
} from '../tools'
import { ink, over } from '../systems'
import { blobPath, wobblyPath, scribbleEllipse, starPath } from '../forme'
import { lineWidth, type Fit } from '../../text'
import { metrics, FIRST_BASE } from '../../core/metriche'

type Sistema = (g: G) => Scene | null
type Box = { x: number; y: number; w: number; h: number }
type Pt = [number, number]
type Testo = Extract<SceneEl, { kind: 'text' }>

/* ═══ attrezzi locali ═══════════════════════════════════════════════════ */
const f1 = (n: number) => n.toFixed(1)
/** variante interna dal seme (stabile per lo stesso seme) */
const variante = (g: G, n: number) => (g.k.seme >> 3) % n
const filo = (g: G, n: number) => Math.max(1, n * g.u)
/** colore del testo che si legge su un fondo, e l'accento che ci sta sopra */
const su = (g: G, bgc: string) => readable(bgc, [g.P.fg, g.P.bg, '#111111', '#ffffff'])
const accSu = (g: G, bgc: string) => readable(bgc, [g.P.acc, g.P.acc2, su(g, bgc)], 3.4)
const colori = (g: G, bgc: string) => ({ fg: su(g, bgc), sec: readable(bgc, [g.P.sec, mix(su(g, bgc), bgc, 0.25), su(g, bgc)], 4.6), acc: accSu(g, bgc) })
const poly = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${f1(p[0])} ${f1(p[1])}`).join(' ') + ' Z'
const ellisse = (cx: number, cy: number, rx: number, ry: number) => `M ${f1(cx - rx)} ${f1(cy)} A ${f1(rx)} ${f1(ry)} 0 1 0 ${f1(cx + rx)} ${f1(cy)} A ${f1(rx)} ${f1(ry)} 0 1 0 ${f1(cx - rx)} ${f1(cy)} Z`
const archD = (b: Box) => { const rr = b.w / 2; return `M ${f1(b.x)} ${f1(b.y + b.h)} L ${f1(b.x)} ${f1(b.y + rr)} A ${f1(rr)} ${f1(rr)} 0 0 1 ${f1(b.x + b.w)} ${f1(b.y + rr)} L ${f1(b.x + b.w)} ${f1(b.y + b.h)} Z` }
const iniz = (t: string) => words(t).map(w => w.replace(/[^\p{L}\p{N}]/gu, '')[0] ?? '').join('').slice(0, 2).toUpperCase()

/** Punto ruotato attorno a (ox, oy): per mettere un testo dentro un riquadro ruotato. */
function ruota(ox: number, oy: number, dx: number, dy: number, angle: number): Pt {
  const a = (angle * Math.PI) / 180
  return [ox + dx * Math.cos(a) - dy * Math.sin(a), oy + dx * Math.sin(a) + dy * Math.cos(a)]
}

/** Curva morbida per punti (Catmull-Rom), campionata in n tratti. */
function curva(pts: Pt[], n: number): Pt[] {
  if (pts.length < 2) return pts
  const P = [pts[0], ...pts, pts[pts.length - 1]]
  const seg = pts.length - 1, out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * seg, s = Math.min(seg - 1, Math.floor(t)), u = t - s
    const [p0, p1, p2, p3] = [P[s], P[s + 1], P[s + 2], P[s + 3]]
    const c = (a: number, b: number, c2: number, d: number) => 0.5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (-a + 3 * b - 3 * c2 + d) * u * u * u)
    out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])])
  }
  return out
}

/**
 * Pennellata: un tratto pieno lungo una curva, con l'attacco carico, la coda che
 * si assottiglia e i bordi irregolari; in coda il pennello si apre in fili secchi.
 */
function pennellata(g: G, name: string, guide: Pt[], w: number, color: string, o: { blend?: GlobalCompositeOperation; opacity?: number; secco?: boolean; coda?: number } = {}) {
  const { r } = g
  const pts = curva(guide, 48)
  const L: Pt[] = [], R: Pt[] = []
  const coda = o.coda ?? 0.85
  pts.forEach((p, i) => {
    const t = i / (pts.length - 1)
    const q = pts[Math.min(pts.length - 1, i + 1)], pp = pts[Math.max(0, i - 1)]
    const dx = q[0] - pp[0], dy = q[1] - pp[1], len = Math.hypot(dx, dy) || 1
    const nx = -dy / len, ny = dx / len
    const prof = Math.min(1, (t + 0.02) / 0.1) ** 0.5 * (1 - coda * t ** 2.2) * (1 + 0.12 * Math.sin(t * 17 + w))
    const hw = (w / 2) * prof
    L.push([p[0] + nx * hw * (1 + r.range(-0.07, 0.07)), p[1] + ny * hw * (1 + r.range(-0.07, 0.07))])
    R.push([p[0] - nx * hw * (1 + r.range(-0.07, 0.07)), p[1] - ny * hw * (1 + r.range(-0.07, 0.07))])
  })
  put(g, { kind: 'path', name, d: poly([...L, ...R.reverse()]), fill: color, blend: o.blend, opacity: o.opacity, fx: [{ id: 'grunge', variant: 'leggera', p: { wear: 26, speck: 18, scale: 120 } }] })
  if (o.secco !== false) {
    // fili secchi: setole che si staccano nell'ultimo terzo
    for (let j = 0; j < 4; j++) {
      const off = r.range(-0.42, 0.42) * w, from = Math.floor(pts.length * r.range(0.45, 0.65)), to = Math.min(pts.length - 1, from + Math.floor(pts.length * r.range(0.3, 0.42)))
      const seg = pts.slice(from, to + 1)
      if (seg.length < 3) continue
      let d = ''
      seg.forEach((p, i) => {
        const q = pts[Math.min(pts.length - 1, from + i + 1)], pp = pts[Math.max(0, from + i - 1)]
        const dx = q[0] - pp[0], dy = q[1] - pp[1], len = Math.hypot(dx, dy) || 1
        const k = 1 - (from + i) / pts.length * 0.6
        d += `${i ? 'L' : 'M'} ${f1(p[0] - (dy / len) * off * k)} ${f1(p[1] + (dx / len) * off * k)} `
      })
      put(g, { kind: 'path', name: 'segno', d, fill: 'transparent', stroke: color, sw: Math.max(1, w * 0.045), blend: o.blend, opacity: (o.opacity ?? 1) * 0.9 })
    }
  }
}

/** Ensō: il cerchio a pennello, aperto, che parte carico e si consuma. */
function enso(g: G, cx: number, cy: number, R: number, w: number, color: string, o: { blend?: GlobalCompositeOperation; opacity?: number } = {}) {
  const a0 = g.r.range(-2.4, -1.6), giro = Math.PI * 2 * g.r.range(0.84, 0.93)
  const pts: Pt[] = []
  for (let i = 0; i <= 14; i++) {
    const a = a0 + (giro * i) / 14, rr = R * (1 + 0.035 * Math.sin(i * 1.7) + (i / 14) * 0.03)
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  pennellata(g, 'enso', pts, w, color, { ...o, coda: 0.7 })
}

/** Timbro (hanko): quadrato rosso consumato, con le iniziali in negativo e un filetto interno. */
function timbro(g: G, x: number, y: number, s: number, testo: string, color: string, angle = 0) {
  const paper = readable(color, [g.P.bg, '#ffffff', '#111111'], 3)
  put(g, { kind: 'rect', name: 'timbro', x, y, w: s, h: s, r: s * 0.08, fill: color, angle, fx: [{ id: 'grunge', variant: 'timbro', p: { wear: 46, speck: 44, scale: 90 } }] })
  const ins = s * 0.09
  const [ix, iy] = ruota(x, y, ins, ins, angle)
  put(g, { kind: 'rect', name: 'timbro_filo', x: ix, y: iy, w: s - 2 * ins, h: s - 2 * ins, r: s * 0.04, fill: 'transparent', stroke: paper, sw: Math.max(1.5, s * 0.03), angle })
  const t = testo || '印'
  const z = Math.min(s * 0.5, sizeForWidth(t, g.s.display, s * 0.66))
  const tw = lineWidth(t, g.s.display, z)
  const [tx, ty] = ruota(x, y, (s - tw) / 2, (s - z * 1.13) / 2 + z * 0.04, angle)
  txt(g, { name: 'timbro_sigla', lines: [t], font: g.s.display, size: z, x: tx, y: ty, color: paper, leading: 1, angle, deco: true })
}

/** Codice a barre: aste di spessore diverso in un solo tracciato. */
function codice(g: G, x: number, y: number, w: number, h: number, color: string) {
  let d = '', xx = x, i = 0
  while (xx < x + w) {
    const bw = Math.max(1.5, g.u * [2, 3, 2, 5, 2, 3, 7, 2][(i * 7 + g.k.seme) % 8] * 0.9)
    const gap = Math.max(1.5, g.u * [2, 3, 4, 2][(i * 3 + 1) % 4] * 0.9)
    if (xx + bw > x + w) break
    const hh = i < 2 || (x + w - xx) < bw * 3 ? h * 1.08 : h
    d += `M ${f1(xx)} ${f1(y)} L ${f1(xx + bw)} ${f1(y)} L ${f1(xx + bw)} ${f1(y + hh)} L ${f1(xx)} ${f1(y + hh)} Z `
    xx += bw + gap; i++
  }
  put(g, { kind: 'path', name: 'codice', d, fill: color })
}

/** Fregio: due filetti che si assottigliano verso l'esterno, una losanga e due punti al centro. */
function fregio(g: G, cx: number, y: number, w: number, color: string) {
  const t = Math.max(1.5, 3 * g.u), l = U(g, 9), gap = U(g, 16)
  const d = [
    `M ${f1(cx - gap)} ${f1(y - t / 2)} L ${f1(cx - w / 2)} ${f1(y)} L ${f1(cx - gap)} ${f1(y + t / 2)} Z`,
    `M ${f1(cx + gap)} ${f1(y - t / 2)} L ${f1(cx + w / 2)} ${f1(y)} L ${f1(cx + gap)} ${f1(y + t / 2)} Z`,
    `M ${f1(cx)} ${f1(y - l)} L ${f1(cx + l * 0.7)} ${f1(y)} L ${f1(cx)} ${f1(y + l)} L ${f1(cx - l * 0.7)} ${f1(y)} Z`,
  ].join(' ')
  put(g, { kind: 'path', name: 'fregio', d, fill: color })
  put(g, { kind: 'circle', name: 'fregio_punto', cx: cx - gap * 1.6, cy: y, r: t * 0.9, fill: color })
  put(g, { kind: 'circle', name: 'fregio_punto', cx: cx + gap * 1.6, cy: y, r: t * 0.9, fill: color })
}

/** Ornamento d'angolo della cornice: un ricciolo e una foglia (sx, sy = verso dell'angolo). */
function angolo(g: G, x: number, y: number, sx: number, sy: number, s: number, color: string) {
  const p = (dx: number, dy: number) => `${f1(x + sx * dx)} ${f1(y + sy * dy)}`
  const d = `M ${p(0, s)} C ${p(0, s * 0.35)} ${p(s * 0.35, 0)} ${p(s, 0)} M ${p(s * 0.22, s * 0.62)} C ${p(s * 0.22, s * 0.3)} ${p(s * 0.3, s * 0.22)} ${p(s * 0.62, s * 0.22)} C ${p(s * 0.42, s * 0.42)} ${p(s * 0.42, s * 0.42)} ${p(s * 0.22, s * 0.62)}`
  put(g, { kind: 'path', name: 'angolo', d, fill: 'transparent', stroke: color, sw: filo(g, 2) })
}

/** Freccia tracciata a mano. */
function freccia(g: G, x1: number, y1: number, x2: number, y2: number, color: string, w = 4) {
  const a = Math.atan2(y2 - y1, x2 - x1), L = U(g, 22)
  const d = wobblyPath(g.r, x1, y1, x2, y2, U(g, 4)) + ` M ${f1(x2 + Math.cos(a + 2.6) * L)} ${f1(y2 + Math.sin(a + 2.6) * L)} L ${f1(x2)} ${f1(y2)} L ${f1(x2 + Math.cos(a - 2.6) * L)} ${f1(y2 + Math.sin(a - 2.6) * L)}`
  put(g, { kind: 'path', name: 'freccia', d, fill: 'transparent', stroke: color, sw: U(g, w) })
}

/** Foto in una forma libera; senza foto, la stessa forma col riempimento generativo nei colori della tavola. */
function fotoForma(g: G, name: string, box: Box, d: string, extra: Partial<Extract<SceneEl, { kind: 'image' }>> = {}) {
  if (g.photo) return photo(g, name, box, { mask: d, ...extra })
  const { P } = g
  return put(g, { kind: 'path', name, d, fill: P.acc, fx: [{ id: 'genFill', p: { mode: g.r.pick([0, 1, 3, 4]), c1: P.acc, c2: P.acc2, c3: P.srf, c4: darker(P.bg, P.fg), grain: 30, warp: 60, scale: 120 } }], blend: extra.blend, opacity: extra.opacity })
}

/**
 * Velo sfumato sopra la foto: trasparente da un lato, pieno dall'altro. Il colore
 * pieno sta sempre dalla parte del testo (la rotazione di 180° porta il pieno in
 * alto o a sinistra); i testi si mettono solo nella parte piena.
 */
function velo(g: G, b: Box, lato: 'alto' | 'basso' | 'sinistra' | 'destra', color: string, pieno = 0.5) {
  const vertical = lato === 'alto' || lato === 'basso'
  const fill = { from: alpha(color, 0), to: color, fromAt: 0, toAt: 1 - pieno, vertical }
  if (lato === 'basso' || lato === 'destra') put(g, { kind: 'rect', name: 'velo', ...b, fill })
  else put(g, { kind: 'rect', name: 'velo', x: b.x + b.w, y: b.y + b.h, w: b.w, h: b.h, fill, angle: 180 })
}

/** Pila di righe misurate (etichette, paragrafi, filetti) da mettere in colonna. */
interface Riga { f?: Fit; kind: 'lab' | 'para' | 'filo' | 'disp'; name: string; ruolo: 'fg' | 'sec' | 'acc'; gap: number; font?: FontSpec }
function pila(g: G, w: number) {
  const righe: Riga[] = []
  const api = {
    righe, w,
    add(f: Fit | null | undefined, kind: Riga['kind'], name: string, ruolo: Riga['ruolo'] = 'fg', gap = g.sc.spazio(2)) { if (f) righe.push({ f, kind, name, ruolo, gap }); return api },
    filo(gap = U(g, 12)) { righe.push({ kind: 'filo', name: 'filetto', ruolo: 'fg', gap }); return api },
    get h() { return righe.reduce((n, x, i) => n + (x.kind === 'filo' ? filo(g, 1.5) : x.f!.h) + (i < righe.length - 1 ? x.gap : 0), 0) },
    get vuota() { return !righe.some(x => x.kind !== 'filo') },
    place(x: number, y: number, col: { fg: string; sec: string; acc: string }, align: 'left' | 'center' | 'right' = 'left') {
      let yy = y
      for (const x2 of righe) {
        const c = col[x2.ruolo]
        if (x2.kind === 'filo') { put(g, { kind: 'line', name: 'filetto', x1: x, y1: yy, x2: x + w, y2: yy, color: col.fg, width: filo(g, 1.5) }); yy += filo(g, 1.5) + x2.gap; continue }
        const f = x2.f!
        if (x2.kind === 'lab') putLab(g, x2.name, f, x, yy, c, align, w)
        else if (x2.kind === 'para') putPara(g, x2.name, f, x, yy, c, align, w)
        else txt(g, { name: x2.name, lines: f.lines, font: g.s.display, size: f.size, x, y: yy, color: c, align, w, leading: f.leading ?? 1, tracking: f.tracking ?? g.s.displayTracking })
        yy += f.h + x2.gap
      }
      return yy
    },
  }
  return api
}

/** Etichette dei dettagli una per riga (con indice), finché stanno. */
function dettagli(p: ReturnType<typeof pila>, g: G, w: number, numerati = true, max = 4) {
  for (const [i, d] of (g.c.details ?? []).filter(x => x.trim()).slice(0, max).entries()) {
    p.add(lab(g, numerati ? `${String(i + 1).padStart(2, '0')}  ${d}` : d, w, 15), 'lab', `dettaglio_${i}`, 'fg', U(g, 14))
  }
  return p
}

/** Riquadro di un testo già messo (per evitare sovrapposizioni con i segni). */
const boxDi = (e: SceneEl) => textBox(e as Testo)
const tocca = (a: Box, b: Box, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad
function liberoDaTesti(g: G, b: Box, pad: number) {
  return !g.els.some(e => e.kind === 'text' && !e.deco && tocca(boxDi(e), b, pad))
}

/**
 * Il rientro ottico sposta il titolo di qualche unità rispetto alle etichette della
 * stessa colonna: prima di chiudere, le etichette a sinistra vicine all'asse del
 * titolo si portano sullo stesso asse (niente allineamenti mancati di poco).
 */
function allinea(g: G) {
  const tt = g.els.filter(e => e.kind === 'text' && !e.deco && !e.angle && e.align === 'left' && e.name.startsWith('titolo')) as Testo[]
  const assi = [...new Set(tt.map(t => t.x))]
  for (const e of g.els) {
    if (e.kind !== 'text' || e.deco || e.angle || e.align !== 'left' || e.name.startsWith('titolo')) continue
    const a = assi.find(x => Math.abs(x - e.x) > 1.5 * g.u && Math.abs(x - e.x) < 16 * g.u)
    if (a !== undefined && a >= g.m * 0.45) e.x = a
  }
}

/** Prima lettera vera del titolo (salta apostrofi e virgolette). */
const primaLettera = (t: string) => (t.match(/[\p{L}\p{N}]/u)?.[0] ?? t[0] ?? 'A').toUpperCase()

/* ═══ 1. Manifesto svizzero ═════════════════════════════════════════════ */
function manifesto(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const side = g.landscape, v = variante(g, 3)
  const N = 12, gut = g.g
  const cw = (W - 2 * m - (N - 1) * gut) / N
  const cx = (i: number) => m + i * (cw + gut), sp = (n: number) => n * cw + (n - 1) * gut
  const C = colori(g, P.bg)
  const accBar = readable(P.bg, [P.acc, P.acc2, P.fg], 2.2)

  /** testata: brand, occhiello sulla colonna kc, numero a destra, filetto sotto */
  const testata = (x0: number, x1: number, y: number, kc: number, col = C) => {
    const b = lab(g, g.c.brand, Math.min(sp(5), x1 - x0))
    const num = g.c.numero ? lab(g, g.c.numero, sp(3), 15) : null
    const kx = Math.max(x0, cx(kc))
    const kk = b && b.w + gut < kx - x0 ? lab(g, g.c.kicker, x1 - kx - (num ? num.w + gut : 0)) : null
    if (b) putLab(g, 'brand', b, x0, y, col.fg)
    if (kk) putLab(g, 'occhiello', kk, kx, y, col.acc)
    if (num) putLab(g, 'numero', num, x1 - num.w, y, col.fg, 'right', num.w)
    const h = Math.max(b?.h ?? 0, kk?.h ?? 0, num?.h ?? 0, U(g, 16))
    put(g, { kind: 'line', name: 'filetto', x1: x0, y1: y + h + U(g, 14), x2: x1, y2: y + h + U(g, 14), color: col.fg, width: filo(g, 1.5) })
    return { y: y + h + U(g, 14), kicker: !!kk }
  }
  /** colonna numerata: filetto, indice, contenuti */
  const colonna = (n: number, w: number, parti: ('occhiello' | 'testo' | 'dettagli' | 'invito')[], bodyLines = 5) => {
    const p = pila(g, w).filo(U(g, 12)).add(lab(g, String(n).padStart(2, '0'), w, 14), 'lab', `indice_${n}`, 'acc', U(g, 14))
    for (const x of parti) {
      if (x === 'occhiello') p.add(lab(g, g.c.kicker, w), 'lab', 'occhiello', 'acc', U(g, 12))
      if (x === 'testo') p.add(para(g, g.c.body, w, bodyLines, 22), 'para', 'testo', 'fg', U(g, 18))
      if (x === 'dettagli') dettagli(p, g, w, false)
      if (x === 'invito') p.add(lab(g, ctaText(g.c), w), 'lab', 'invito', 'acc', U(g, 10))
    }
    if (p.righe.length) p.righe[p.righe.length - 1].gap = 0
    return p
  }

  if (v === 1) {
    /* ── variante: pannello di carta che morde la foto ── */
    if (side) {
      const xP = cx(6) + gut / 2
      photo(g, 'foto', { x: 0, y: 0, w: xP, h: H })
      const yPan = Math.round(H * (0.3 + 0.08 * r.next()))
      const px = cx(5)
      put(g, { kind: 'rect', name: 'velo_pannello', x: px - U(g, 40), y: yPan, w: W - px + U(g, 40), h: H - yPan, fill: P.bg })
      const hd = testata(cx(6), W - m, T, 9)
      const x = cx(6), w = W - m - x
      const info = colonna(1, sp(3), [...(hd.kicker ? [] : ['occhiello' as const]), 'testo'], 6)
      const info2 = colonna(2, sp(3), ['dettagli', 'invito'])
      const t = display(g, g.c.title, w, B - yPan - U(g, 50) - Math.max(info.h, info2.h) - U(g, 50), 220 + 90 * k.scala, 56, 4)
      if (!t) return null
      putDisplay(g, 'titolo', t, x, yPan + U(g, 44), C.fg)
      const yi = B - Math.max(info.h, info2.h)
      info.place(x, yi, C); info2.place(cx(9), yi, C)
    } else {
      const yP = Math.round(H * (g.format === 'storia' ? 0.4 : 0.42 + 0.06 * r.next()))
      const pw = cx(8) - gut / 2
      const info2 = colonna(2, W - m - (pw + gut), ['dettagli', 'invito'])
      const ovl = Math.round((H - yP) * 0.42)
      photo(g, 'foto', { x: 0, y: 0, w: W, h: yP + ovl })
      put(g, { kind: 'rect', name: 'velo_pannello', x: 0, y: yP, w: pw, h: H - yP, fill: P.bg })
      // dove la foto finisce: il filetto d'accento chiude il modulo
      put(g, { kind: 'rect', name: 'barra', x: pw, y: yP + ovl, w: W - pw, h: U(g, 10), fill: accBar })
      const hd = testata(m, pw - U(g, 36), yP + U(g, 36), 4)
      const info = colonna(1, pw - m - U(g, 36), [...(hd.kicker ? [] : ['occhiello' as const]), 'testo'], 4)
      const top = hd.y + U(g, 36)
      const t = display(g, g.c.title, pw - m - U(g, 36), B - top - info.h - U(g, 44), 200 + 80 * k.scala, 52, 4)
      if (!t) return null
      putDisplay(g, 'titolo', t, m, top, C.fg)
      info.place(m, B - info.h, C)
      if (!info2.vuota) {
        const y2 = Math.max(yP + ovl + U(g, 50), B - info2.h)
        if (y2 + info2.h > B + 1) return null
        info2.place(pw + gut, y2, C)
      }
    }
  } else {
    /* ── varianti: titolo mostro (0) o tipografico con numero gigante (2) ── */
    const hd = testata(m, W - m, T, v === 2 ? 4 : 6)
    let y = hd.y + U(g, 40)
    if (v === 0) {
      const tw = side ? sp(8) : W - 2 * m
      const iw = side ? sp(4) : sp(5)
      const info = colonna(1, iw, [...(hd.kicker ? [] : ['occhiello' as const]), 'testo', ...(side ? [] : ['dettagli' as const]), 'invito'], 5)
      const info2 = side ? colonna(2, sp(4), ['dettagli']) : null
      const bottom = side ? Math.max(info.h, info2?.h ?? 0) : Math.max(info.h, (B - T) * 0.3)
      const t = display(g, g.c.title, tw, B - y - U(g, 60) - bottom, 300 + 130 * k.scala, 60, 4)
      if (!t) return null
      putDisplay(g, 'titolo', t, m, y, C.fg)
      const ty = y + t.h
      put(g, { kind: 'rect', name: 'barra', x: m, y: ty + U(g, 24), w: sp(2), h: U(g, 10), fill: accBar })
      const y2 = ty + U(g, 60)
      // la foto in un modulo, al vivo sul bordo destro e in fondo
      const px = side ? cx(8) : cx(6)
      const py = side ? hd.y + U(g, 40) : y2
      if (H - py < H * 0.18) return null
      photo(g, 'foto', { x: px, y: py, w: W - px, h: H - py })
      if (k.sovrastampa > 0.35) put(g, { kind: 'circle', name: 'punto', cx: px, cy: py + U(g, 10), r: Math.min(W, H) * (0.07 + 0.04 * k.densita), fill: P.acc, blend: over(g), opacity: 0.9 })
      if (info.h > B - y2 + 1) return null
      info.place(m, B - info.h, C)
      info2?.place(cx(4), B - info2.h, C)
    } else {
      const nc = 3, iw = sp(4)
      const cols = [colonna(1, iw, [...(hd.kicker ? [] : ['occhiello' as const]), 'testo'], 5), colonna(2, iw, ['dettagli', 'invito'])]
      const rowH = Math.max(...cols.map(c => c.h), sp(4) * 0.9)
      const t = display(g, g.c.title, W - 2 * m, B - y - rowH - U(g, 70), 320 + 140 * k.scala, 60, 4)
      if (!t) return null
      // numero gigante a contorno, che esce dal bordo destro
      const big = g.c.numero || primaLettera(g.c.title)
      const bz = Math.min(sizeForWidth(big, s.impact, W * 0.62), H * 0.55)
      txt(g, { name: 'numero_fondo', lines: [big], font: s.impact, size: bz, x: W - lineWidth(big, s.impact, bz) * 0.72, y: y - bz * 0.12, color: P.fg, hollow: true, sw: Math.max(1.5, bz * 0.008), opacity: 0.45, leading: 1, deco: true })
      putDisplay(g, 'titolo', t, m, y, C.fg)
      const rowTop = B - rowH
      cols.forEach((c, i) => c.place(cx(i * 4), rowTop, C))
      // la foto nel terzo modulo, con il quadrato d'accento fuori registro
      const pb = { x: cx(8), y: rowTop, w: sp(4), h: B - rowTop }
      const d = U(g, 14 + 26 * k.sovrastampa)
      put(g, { kind: 'rect', name: 'quadro', x: pb.x + d, y: pb.y - d, w: pb.w * 0.62, h: pb.w * 0.62, fill: P.acc })
      photo(g, 'foto', pb)
      if (k.sovrastampa > 0.3) put(g, { kind: 'rect', name: 'quadro_sovrastampa', x: pb.x + d, y: pb.y - d, w: pb.w * 0.62, h: pb.w * 0.62, fill: P.acc, blend: over(g, P.acc), opacity: 0.55 })
      void nc
    }
  }
  // crocini della griglia negli spazi liberi: la struttura si vede
  if (k.densita > 0.4) {
    let d = ''
    const L = U(g, 7)
    const rows = 6
    for (let j = 1; j < rows; j++) for (let i = 0; i <= N; i += 2) {
      const x = i === N ? W - m : cx(i) - (i ? gut / 2 : 0), y = T + ((B - T) * j) / rows
      const b = { x: x - L, y: y - L, w: 2 * L, h: 2 * L }
      if (!liberoDaTesti(g, b, U(g, 16)) || g.els.some(e => (e.kind === 'image' || e.name === 'velo_pannello' || e.name === 'quadro') && tocca(b, e as unknown as Box, 4))) continue
      d += `M ${f1(x - L)} ${f1(y)} L ${f1(x + L)} ${f1(y)} M ${f1(x)} ${f1(y - L)} L ${f1(x)} ${f1(y + L)} `
    }
    if (d) put(g, { kind: 'path', name: 'griglia', d, fill: 'transparent', stroke: alpha(P.fg, 0.45), sw: filo(g, 1.2) })
  }
  allinea(g)
  return finish(g, 'manifesto', 'Manifesto svizzero', { specchio: v === 2 })
}

/* ═══ 2. Scalinata ══════════════════════════════════════════════════════ */
interface Gradino { x: number; y: number; w: number; line: string; top: number; bot: number }

/** Profilo a gradini sotto (o sopra) le parole, da x0 a W: per la maschera della foto e per il pieno. */
function profilo(W: number, steps: Gradino[], gp: number, kind: 'sotto' | 'sopra', x0 = 0): Pt[] {
  const br = [...new Set([x0, W, ...steps.flatMap(s => [s.x - gp, s.x + s.w + gp])].map(v => Math.max(x0, Math.min(W, v))))].sort((a, b) => a - b)
  const vals: { a: number; b: number; v: number | null }[] = []
  for (let i = 0; i < br.length - 1; i++) {
    const a = br[i], b = br[i + 1], mid = (a + b) / 2
    const cov = steps.filter(s => s.x - gp <= mid && mid <= s.x + s.w + gp)
    vals.push({ a, b, v: cov.length ? (kind === 'sotto' ? Math.max(...cov.map(s => s.bot)) + gp : Math.min(...cov.map(s => s.top)) - gp) : null })
  }
  // dove nessuna parola copre, il gradino continua dal vicino
  for (let i = 0; i < vals.length; i++) if (vals[i].v === null) vals[i].v = vals[i - 1]?.v ?? vals.find(x => x.v !== null)?.v ?? 0
  const pts: Pt[] = []
  for (const x of vals) { pts.push([x.a, x.v!]); pts.push([x.b, x.v!]) }
  return pts
}

/** Il profilo a gradini fatto di rettangoli (la leggibilità li vede davvero, una maschera no). */
function aGradini(g: G, pts: Pt[], kind: 'sotto' | 'sopra', make: (b: Box, i: number) => void) {
  for (let i = 0; i + 1 < pts.length; i += 2) {
    const a = pts[i][0], b = pts[i + 1][0], v = pts[i][1]
    if (b - a < 0.5) continue
    make(kind === 'sotto' ? { x: a, y: v, w: b - a + 1, h: g.H - v } : { x: a, y: 0, w: b - a + 1, h: Math.max(0, v) }, i / 2)
  }
}
/** Foto ritagliata a gradini: pezzi rettangolari della stessa foto (senza foto, un tracciato generativo). */
function fotoGradini(g: G, pts: Pt[], kind: 'sotto' | 'sopra', d: string, bbox: Box) {
  if (!g.photo) { fotoForma(g, 'foto', bbox, d); return }
  aGradini(g, pts, kind, (b, i) => { if (b.h > 1) photo(g, i ? `foto_${i}` : 'foto', b, { view: bbox }) })
}

function scalinata(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const v = variante(g, 3)
  const font = s.display, upper = !!s.displayUpper, tr = s.displayTracking
  const lines = stackLines(up(g.c.title, upper), g.landscape ? 4 : 5)
  if (lines.length < 2) return null
  const n = lines.length
  const mt = metrics(font)
  const desc = (l: string) => /[gjpqyQ,;]/.test(l)
  const brand = lab(g, g.c.brand, W * 0.5)
  const y0 = T + (brand ? brand.h + U(g, 36) : 0)
  const availW = W - 2 * m
  const step = (z: number) => z * (v === 2 ? mt.cap + 0.08 + 0.36 : 0.94 + 0.22 * k.energia)
  const sum = (ls: string[]) => ls.reduce((a, l) => a + lineWidth(l, font, 100, tr), 0) / 100
  // una rampa o due (a zigzag) per i titoli lunghi
  const zH = B - y0 - (g.landscape ? U(g, 40) : (B - T) * 0.22)
  const sizeFor = (wsum: number) => Math.min(availW / wsum, zH / (n * (step(1)) + 0.2), H * 0.26)
  const z1 = sizeFor(sum(lines))
  let split = n
  let z = z1
  if (n >= 3) {
    let best = { z: 0, i: n }
    for (let i = 2; i < n; i++) { const zz = sizeFor(Math.max(sum(lines.slice(0, i)), sum(lines.slice(i)))); if (zz > best.z) best = { z: zz, i } }
    if (best.z > z1 * 1.3 && z1 < 110 * g.u) { split = best.i; z = best.z }
  }
  if (z < 52 * g.u) return null
  // posizioni: la prima rampa scende verso destra, la seconda torna verso sinistra
  const steps: Gradino[] = []
  const wid = lines.map(l => lineWidth(l, font, z, tr))
  const sumB = wid.slice(split).reduce((a, b) => a + b, 0)
  let y = y0
  lines.forEach((l, i) => {
    const w = wid[i]
    let x = m
    if (i > 0 && i < split) x = steps[i - 1].x + steps[i - 1].w
    else if (i === split) { const prev = steps[i - 1]; x = Math.min(W - m, Math.max(prev.x + prev.w, m + sumB)) - w }
    else if (i > split) x = steps[i - 1].x - w
    const base = y + z * FIRST_BASE
    steps.push({ x, y, w, line: l, top: base - mt.cap * z, bot: base + (desc(l) ? mt.desc * z : z * 0.02) })
    y += step(z)
  })
  const accTxt = readable(P.bg, [P.acc, P.acc2], 2.4)
  const gp = U(g, 20)
  const last = split < n ? steps.slice(split) : steps
  const words2 = (bgs: string[]) => {
    steps.forEach((st, i) => {
      // allineamenti alterni (destra, sinistra): due parole consecutive condividono lo stesso asse
      const right = i % 2 === 0 && i + 1 < split
      const bg = bgs[i] ?? P.bg, color = su(g, bg)
      txt(g, { name: `titolo#${i}`, lines: [st.line], font, size: z, x: st.x, y: st.y, w: st.w, align: right ? 'right' : 'left', color, tracking: tr, leading: 1, chars: accentChars(g, [st.line], color, bg) })
    })
  }
  // spazio per le informazioni in alto a destra (sopra la scala)
  const infoTopRight = (col: ReturnType<typeof colori>, iw: number) => {
    const x0 = W - m - iw
    const lim = Math.min(B, ...steps.filter(st => st.x + st.w > x0 - U(g, 20)).map(st => st.top - U(g, 40)))
    const tries = [{ body: true, det: true }, { body: true, det: false }, { body: false, det: true }, { body: false, det: false }]
    for (const o of tries) {
      const p = pila(g, iw)
      if (g.c.numero) p.add(display(g, g.c.numero, iw, U(g, 120), 110, 48, 1, false), 'disp', 'numero', 'acc', U(g, 16))
      p.add(lab(g, g.c.kicker, iw), 'lab', 'occhiello', 'acc', U(g, 14))
      if (o.body) p.add(para(g, g.c.body, iw, 4, 24), 'para', 'testo', 'fg', U(g, 20))
      if (o.det) dettagli(p, g, iw, false, 3)
      p.add(lab(g, ctaText(g.c), iw), 'lab', 'invito', 'acc', 0)
      if (T + p.h <= lim) { p.place(x0, T, col); return true }
    }
    return false
  }
  if (brand) putLab(g, 'brand', brand, m, T, P.fg)

  if (v === 0) {
    /* ── la foto riempie il triangolo sotto la scala ── */
    const pts = profilo(W, last, gp, 'sotto')
    const d = poly([...pts, [W, H], [0, H]])
    const top = Math.min(...pts.map(p => p[1]))
    if (H - top < H * 0.2) return null
    if (k.sovrastampa > 0.3) {
      const reg = U(g, 8 + 18 * k.sovrastampa)
      put(g, { kind: 'path', name: 'registro', d: poly([...pts.map(([px, py]) => [px - reg, py - reg] as Pt), [W, H], [0, H]]), fill: P.acc })
    }
    fotoGradini(g, pts, 'sotto', d, { x: 0, y: top, w: W, h: H - top })
    words2([])
    if (!infoTopRight(colori(g, P.bg), g.landscape ? W * 0.3 : W * 0.4)) return null
  } else if (v === 1) {
    /* ── il pieno sotto la scala porta le informazioni; la foto sta sopra, a destra ── */
    const pts = profilo(W, last, gp, 'sotto')
    const top = Math.min(...pts.map(p => p[1]))
    const massa = r.chance(0.5) ? P.fg : readable(P.bg, [P.acc, P.fg], 1.8)
    aGradini(g, pts, 'sotto', b => put(g, { kind: 'rect', name: 'gradini', ...b, fill: massa }))
    const ph = profilo(W, steps, gp, 'sopra', steps[1].x - gp)
    const pTop = ph.filter(p => p[0] > steps[1].x)
    const dP = poly([[steps[1].x - gp, 0], ...ph, [W, 0]])
    if (Math.max(...pTop.map(p => p[1])) < H * 0.18) return null
    fotoGradini(g, ph, 'sopra', dP, { x: steps[1].x - gp, y: 0, w: W - steps[1].x + gp, h: Math.max(...ph.map(p => p[1])) })
    words2([])
    // informazioni dentro il pieno, in basso a sinistra
    const col = colori(g, massa)
    let placed = false
    for (const iw of [W * 0.46, W * 0.6, W * 0.38]) {
      const p = pila(g, iw)
      if (g.c.numero) p.add(display(g, g.c.numero, iw, U(g, 110), 100, 44, 1, false), 'disp', 'numero', 'acc', U(g, 14))
      p.add(lab(g, g.c.kicker, iw), 'lab', 'occhiello', 'acc', U(g, 12))
      p.add(para(g, g.c.body, iw, 3, 24), 'para', 'testo', 'fg', U(g, 18))
      p.add(lab(g, detailsLine(g.c), iw), 'lab', 'dettagli', 'sec', U(g, 12))
      p.add(lab(g, ctaText(g.c), iw), 'lab', 'invito', 'acc', 0)
      const surf = Math.max(...pts.filter(q => q[0] <= m + iw + U(g, 30)).map(q => q[1]))
      if (B - p.h >= surf + U(g, 40)) { p.place(m, B - p.h, col); placed = true; break }
    }
    if (!placed || top > B - U(g, 60)) return null
  } else {
    /* ── ogni parola su un gradino pieno, la foto sotto la scala, la carta sopra ── */
    const padX = Math.max(U(g, 20), z * 0.16), padY = Math.max(U(g, 18), z * 0.12)
    const slabs = steps.map((st, i) => ({ x: st.x - padX, y: st.top - padY, w: st.w + 2 * padX, h: st.bot - st.top + 2 * padY, c: i % 2 ? readable(P.bg, [P.acc, P.acc2, P.fg], 1.6) : P.fg }))
    if (slabs.some(sl => sl.x < 0 || sl.x + sl.w > W)) return null
    photo(g, 'foto', { x: 0, y: 0, w: W, h: H })
    const sl2 = steps.map((st, i) => ({ ...st, top: slabs[i].y, bot: slabs[i].y + slabs[i].h }))
    const ph = profilo(W, sl2, 0, 'sopra')
    // la carta sopra la scala, a gradini
    aGradini(g, ph, 'sopra', b => put(g, { kind: 'rect', name: 'velo_carta', ...b, fill: P.bg }))
    slabs.forEach((sl, i) => put(g, { kind: 'rect', name: `gradino_${i}`, x: sl.x, y: sl.y, w: i === n - 1 && split === n ? W - sl.x : sl.w, h: sl.h, fill: sl.c }))
    words2(slabs.map(sl => sl.c))
    const iw = g.landscape ? W * 0.3 : W * 0.4
    const x0 = W - m - iw
    const lim = Math.min(...sl2.filter(st => st.x + st.w > x0 - U(g, 20)).map(st => st.top - U(g, 30)))
    const p = pila(g, iw)
    p.add(lab(g, g.c.kicker, iw), 'lab', 'occhiello', 'acc', U(g, 14))
    p.add(para(g, g.c.body, iw, 3, 24), 'para', 'testo', 'fg', U(g, 18))
    p.add(lab(g, ctaText(g.c), iw), 'lab', 'invito', 'acc', 0)
    const ok = T + p.h <= lim
    if (ok) p.place(x0, T, colori(g, P.bg))
    else {
      const p2 = pila(g, iw).add(lab(g, ctaText(g.c), iw), 'lab', 'invito', 'acc', 0)
      if (T + p2.h > lim) return null
      p2.place(x0, T, colori(g, P.bg))
    }
    if (g.c.numero) {
      const nb = lab(g, g.c.numero, W * 0.3, 18)
      const lastS = slabs[slabs.length - 1]
      if (nb && lastS.y + lastS.h + U(g, 30) + nb.h < B) {
        const by = lastS.y + lastS.h + U(g, 30)
        put(g, { kind: 'rect', name: 'targhetta', x: W - m - nb.w - U(g, 36), y: by, w: nb.w + U(g, 36), h: nb.h + U(g, 30), fill: P.bg })
        putLab(g, 'numero', nb, W - m - nb.w - U(g, 18), by + U(g, 15), P.fg)
      }
    }
  }
  // il filo che segue la pendenza della scala, sopra le parole
  if (k.energia > 0.45 && split === n && n >= 3) {
    const a = steps[0], b = steps[n - 1]
    const off = U(g, 26)
    const d = s.forma === 'mano' || s.forma === 'decostruito'
      ? wobblyPath(r, a.x + a.w * 0.5, a.top - off, b.x + b.w * 0.5, b.top - off, U(g, 3))
      : `M ${f1(a.x + a.w * 0.5)} ${f1(a.top - off)} L ${f1(b.x + b.w * 0.5)} ${f1(b.top - off)}`
    const seg = { x: Math.min(a.x, b.x), y: a.top - off - 4, w: Math.abs(b.x - a.x) + b.w, h: b.top - a.top + 8 }
    void seg
    put(g, { kind: 'path', name: 'filo', d, fill: 'transparent', stroke: v === 2 ? P.fg : accTxt, sw: filo(g, 2), opacity: 0.8 })
  }
  allinea(g)
  return finish(g, 'scalinata', 'Scalinata')
}

/* ═══ 3. Copertina con strilli ══════════════════════════════════════════ */
function strilli(g: G): Scene | null {
  if (!g.photo) return null
  const { W, H, m, T, B, P, s, k, r } = g
  const v = variante(g, 3), side = g.landscape
  const scuro = mix(darker(P.bg, P.fg), '#000000', 0.3)
  const chiaro = lighter(P.bg, P.fg)
  const testataTxt = (g.c.brand || g.c.kicker || '').trim()
  if (!testataTxt) return null
  const mFont = s.impactSans ? s.impact : s.display
  const mUp = s.impactSans || !!s.displayUpper
  const mt = up(testataTxt, mUp)
  /** testata (decorativa: il brand vero sta nel riquadro del codice) */
  const testata = (x: number, y: number, w: number, maxH: number, color: string) => {
    const tr = mUp ? -0.01 : -0.02
    const z = Math.min(sizeForWidth(mt, mFont, w, tr), maxH / 1.0)
    const mm = metrics(mFont)
    const yy = y - (z * FIRST_BASE - mm.cap * z)
    txt(g, { name: 'testata', lines: [mt], font: mFont, size: z, x, y: yy, color, tracking: tr, leading: 1, deco: true })
    return { h: mm.cap * z, z }
  }
  /** riquadro bianco col codice a barre e il brand: misura, poi si appoggia per l'angolo in basso a destra */
  const blC = lab(g, g.c.brand, W * 0.42, 14)
  const padC = U(g, 16), barW = Math.max(U(g, 168), blC?.w ?? 0), barH = U(g, 66)
  const cb = { w: barW + padC * 2, h: barH + padC * 2 + (blC ? blC.h + U(g, 10) : 0) }
  const riquadroCodice = (xr: number, yb: number) => {
    const x = xr - cb.w, y = yb - cb.h
    put(g, { kind: 'rect', name: 'campo_codice', x, y, w: cb.w, h: cb.h, fill: '#ffffff' })
    codice(g, x + padC, y + padC, barW, barH, '#111111')
    if (blC) putLab(g, 'brand', blC, x + padC, y + padC + barH + U(g, 10), '#111111')
    return { x, y }
  }
  const bollino = (cx: number, cy: number, R: number) => {
    const fill = P.acc, fg = readable(fill, [P.bg, P.fg, '#111111', '#ffffff'])
    put(g, { kind: 'path', name: 'bollino_raggi', d: starPath(cx, cy, R * 1.12, 22, 0.88, r.range(0, 1)), fill: mix(fill, scuro, 0.18) })
    put(g, { kind: 'circle', name: 'bollino', cx, cy, r: R, fill })
    const p = pila(g, R * 1.3)
    if (g.c.numero) p.add(display(g, g.c.numero, R * 1.3, R * 0.62, 90, 30, 1, false), 'disp', 'numero', 'fg', U(g, 8))
    p.add(lab(g, g.c.cta || g.c.kicker || '', R * 1.3, 14), 'lab', 'invito', 'fg', 0)
    if (p.vuota) return
    p.place(cx - R * 0.65, cy - p.h / 2, { fg, sec: fg, acc: fg }, 'center')
  }
  const strillo = (w: number, list: { n: string; t: string }[], col: ReturnType<typeof colori>) => {
    const p = pila(g, w)
    list.forEach((it, i) => {
      p.add(display(g, it.n, w, U(g, 70), 64, 30, 1, false), 'disp', `numero_${i}`, 'acc', U(g, 4))
      p.add(lab(g, it.t, w, 17), 'lab', `strillo_${i}`, 'fg', U(g, 26))
    })
    if (p.righe.length) p.righe[p.righe.length - 1].gap = 0
    void col
    return p
  }
  const voci = [...(g.c.details ?? []).filter(d => d.trim()).map((d, i) => ({ n: String(i + 1).padStart(2, '0'), t: d }))].slice(0, side ? 3 : 3)

  if (v === 0) {
    /* ── classica: foto a tutta pagina, velo in alto per la testata, strilli a sinistra, titolo in fondo ── */
    photo(g, 'foto', { x: 0, y: 0, w: W, h: H })
    const mh = testata(m, T, W - 2 * m, H * (side ? 0.24 : 0.17), chiaro)
    const yRow = T + mh.h + U(g, 26)
    const kk = lab(g, g.c.kicker && g.c.brand ? g.c.kicker : '', W * 0.6)
    velo(g, { x: 0, y: 0, w: W, h: (yRow + (kk?.h ?? 0) + U(g, 20)) * 1.9 }, 'alto', scuro, 0.52)
    // la testata va sopra il velo
    const tEl = g.els.findIndex(e => e.name === 'testata'); const [te] = g.els.splice(tEl, 1); g.els.push(te)
    put(g, { kind: 'line', name: 'filetto', x1: m, y1: yRow - U(g, 12), x2: W - m, y2: yRow - U(g, 12), color: chiaro, width: filo(g, 1.5) })
    if (kk) putLab(g, 'occhiello', kk, m, yRow, readable(scuro, [P.acc, P.acc2, chiaro], 3.4))
    // fondo: titolo, testo e codice
    const tw = W - 2 * m - cb.w - g.g
    const body = para(g, g.c.body, tw * 0.9, 2, 24)
    const t = display(g, g.c.title, tw, H * 0.3, 190 + 80 * k.scala, 56, 3)
    if (!t) return null
    const yB = B - (body ? body.h + U(g, 20) : 0) - t.h
    velo(g, { x: 0, y: yB - H * 0.2, w: W, h: H - yB + H * 0.2 }, 'basso', scuro, (H - yB + U(g, 30)) / (H - yB + H * 0.2))
    const col = colori(g, scuro)
    putDisplay(g, 'titolo', t, m, yB, col.fg, 'left', tw, { su: scuro })
    if (body) putPara(g, 'testo', body, m, yB + t.h + U(g, 20), col.fg)
    riquadroCodice(W - m, B)
    // strilli a sinistra, su un velo laterale
    const st = strillo(side ? W * 0.26 : W * 0.4, voci, col)
    const zTop = yRow + (kk?.h ?? 0) + U(g, 50), zBot = yB - U(g, 50)
    if (!st.vuota && st.h <= zBot - zTop) {
      const sy = zTop + (zBot - zTop - st.h) * 0.35
      velo(g, { x: 0, y: sy - U(g, 60), w: (side ? W * 0.26 : W * 0.4) + m + W * 0.22, h: st.h + U(g, 120) }, 'sinistra', scuro, 0.62)
      st.place(m, sy, col)
    }
    const R = Math.min(W, H) * (0.1 + 0.03 * k.scala)
    const bcy = zTop + (zBot - zTop) * r.range(0.35, 0.65)
    if (zBot - zTop > 2.4 * R) bollino(W - m - R * 1.1, bcy, R)
  } else if (v === 1) {
    /* ── cornice piena: la foto dentro un bordo di colore, testata sulla fascia alta ── */
    const frame = readable(P.bg, [P.acc, P.acc2, P.fg], 1.5)
    const bw = U(g, side ? 34 : 30)
    const onF = colori(g, frame)
    const mh0 = { h: 0 }
    const topH = Math.max(T, m) + (H * (side ? 0.2 : 0.14))
    put(g, { kind: 'rect', name: 'cornice', x: 0, y: 0, w: W, h: H, fill: frame })
    const pb = { x: bw, y: topH, w: W - 2 * bw, h: H - topH - (g.format === 'storia' ? H - B + U(g, 10) : bw) }
    photo(g, 'foto', pb)
    const mh = testata(m, Math.max(T, m) - U(g, 4), W - 2 * m, topH - Math.max(T, m) - U(g, 22), onF.fg)
    void mh0; void mh
    // titolo su una fascia piena in fondo alla foto
    const band = P.bg === frame ? P.fg : P.bg
    const colB = colori(g, band)
    const tw = W - 2 * m - U(g, 40)
    const t = display(g, g.c.title, tw - cb.w - U(g, 30), H * 0.22, 150 + 70 * k.scala, 52, 3)
    if (!t) return null
    const body = para(g, g.c.body, tw - cb.w - U(g, 30), 2, 22)
    const bandH = Math.max(t.h + (body ? body.h + U(g, 16) : 0), cb.h) + U(g, 72)
    const bandY = pb.y + pb.h - bandH
    put(g, { kind: 'rect', name: 'velo_titolo', x: pb.x, y: bandY, w: pb.w, h: bandH, fill: band })
    putDisplay(g, 'titolo', t, m + U(g, 20), bandY + U(g, 36), colB.fg, 'left', t.w, { su: band })
    if (body) putPara(g, 'testo', body, m + U(g, 20), bandY + U(g, 36) + t.h + U(g, 16), colB.fg)
    // codice nel riquadro bianco, nella fascia a destra
    riquadroCodice(pb.x + pb.w - U(g, 20), bandY + U(g, 30) + cb.h)
    // strilli in riquadri pieni, scalati a sinistra
    const col = colori(g, P.bg)
    let y = pb.y + U(g, 40)
    for (const [i, it] of voci.entries()) {
      const f = lab(g, it.t, W * 0.5, 17)
      if (!f) continue
      const n0 = lab(g, it.n, U(g, 60), 17)!
      const h = f.h + U(g, 30)
      if (y + h > bandY - U(g, 30)) break
      const x = pb.x + U(g, 20 + 24 * (i % 2) * k.energia)
      const wBox = n0.w + f.w + U(g, 70)
      put(g, { kind: 'rect', name: `riquadro_${i}`, x, y, w: wBox, h, fill: P.bg })
      putLab(g, `indice_${i}`, n0, x + U(g, 18), y + U(g, 15), col.acc)
      putLab(g, `strillo_${i}`, f, x + U(g, 18) + n0.w + U(g, 22), y + U(g, 15), col.fg)
      y += h + U(g, 18)
    }
    const kk = lab(g, g.c.brand ? g.c.kicker : '', W * 0.4)
    if (kk) putLab(g, 'occhiello', kk, W - bw - U(g, 20) - kk.w, topH + U(g, 20) - kk.h - U(g, 30) > 0 ? topH - kk.h - U(g, 12) : topH + U(g, 20), onF.fg)
    const R = Math.min(W, H) * 0.1
    if (bandY - (y + U(g, 20)) > R * 2.6 || side) bollino(pb.x + pb.w - R * 1.25, (side ? pb.y + R * 1.5 : bandY - R * 1.4), R)
  } else {
    /* ── ritagli: carta, foto fuori centro con crocini, strilli in riquadri inclinati ── */
    const col = colori(g, P.bg)
    const mh = testata(m, T, W - 2 * m, H * (side ? 0.2 : 0.15), P.fg)
    const top = T + mh.h + U(g, 40)
    const pb = side ? { x: W * 0.36, y: top, w: W - W * 0.36 - m * 0.5, h: B - top } : { x: W * 0.2, y: top, w: W - W * 0.2, h: B - top - (g.format === 'storia' ? U(g, 40) : 0) }
    put(g, { kind: 'rect', name: 'ombra_foto', x: pb.x - U(g, 14), y: pb.y + U(g, 14), w: pb.w, h: pb.h, fill: readable(P.bg, [P.acc, P.fg], 1.5) })
    photo(g, 'foto', pb)
    printMarks(g, alpha(P.fg, 0.7))
    const kk = lab(g, g.c.brand ? g.c.kicker : '', W * 0.6)
    if (kk) putLab(g, 'occhiello', kk, m, top - kk.h - U(g, 14) > T + mh.h + U(g, 8) ? top - kk.h - U(g, 14) : top, col.acc)
    // titolo in un riquadro pieno inclinato, a cavallo del bordo della foto
    const t = display(g, g.c.title, (side ? W * 0.42 : W * 0.66), H * 0.22, 140 + 60 * k.scala, 48, 3)
    if (!t) return null
    const box = P.fg, onBox = colori(g, box)
    const ang = -(2 + 4 * k.energia) * (r.chance(0.5) ? 1 : -0.6)
    const pad = U(g, 30)
    const bx = m, by = B - t.h - 2 * pad - U(g, 10)
    put(g, { kind: 'rect', name: 'velo_titolo', x: bx, y: by, w: t.w + 2 * pad, h: t.h + 2 * pad, fill: box, angle: ang })
    const [tx, ty] = ruota(bx, by, pad, pad, ang)
    putDisplay(g, 'titolo', t, tx, ty, onBox.fg, 'left', t.w, { angle: ang, su: box })
    // strilli: etichette inclinate a sinistra, sopra il titolo
    let y = top + U(g, 30)
    const lim = Math.min(by, by + Math.sin((ang * Math.PI) / 180) * (t.w + 2 * pad)) - U(g, 40)
    const list = [...voci.map(x => `${x.n}  ${x.t}`), ...(g.c.body ? [] : [])]
    list.forEach((tt, i) => {
      const f = lab(g, tt, W * 0.5, 17)
      if (!f) return
      const h = f.h + U(g, 28)
      if (y + h + U(g, 30) > lim) return
      const a = r.range(-5, 7) * (0.4 + k.energia)
      const c = i % 2 ? readable(P.bg, [P.acc, P.acc2, P.fg], 1.6) : P.bg
      const x = m + U(g, (i % 2) * 40)
      put(g, { kind: 'rect', name: `riquadro_${i}`, x, y, w: f.w + U(g, 36), h, fill: c, angle: a, stroke: c === P.bg ? P.fg : undefined, sw: filo(g, 2) })
      const [lx, ly] = ruota(x, y, U(g, 18), U(g, 14), a)
      putLab(g, `strillo_${i}`, f, lx, ly, su(g, c), 'left', f.w, { angle: a })
      y += h + U(g, 30)
    })
    const body = para(g, g.c.body, side ? W * 0.28 : W * 0.5, 3, 22)
    if (body && y + body.h + U(g, 50) + U(g, 28) < lim) {
      put(g, { kind: 'rect', name: 'riquadro_testo', x: m, y, w: body.w + U(g, 40), h: body.h + U(g, 36), fill: P.bg })
      putPara(g, 'testo', body, m + U(g, 20), y + U(g, 18), col.fg)
    }
    riquadroCodice(W - m * 0.5 - U(g, 20), pb.y + pb.h - U(g, 20))
    const R = Math.min(W, H) * 0.1
    bollino(pb.x + pb.w - R * 1.3, pb.y + R * 1.3, R)
  }
  allinea(g)
  return finish(g, 'strilli', 'Copertina con strilli')
}

/* ═══ 4. Pagina a colonne ═══════════════════════════════════════════════ */
function colonne(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const v = variante(g, 3), side = g.landscape
  const C = colori(g, P.bg)
  const gut = g.g
  // acquerello: macchie sovrapposte in trasparenza, con i bordi bagnati
  const acquerello = (b: Box, n: number) => {
    const bl: GlobalCompositeOperation = P.dark ? 'screen' : 'multiply'
    const tinte = [P.acc, P.acc2 === P.bg ? P.acc : P.acc2, mix(P.acc, P.fg, 0.3)]
    for (let i = 0; i < n; i++) {
      const sc = r.range(0.7, 1.05)
      const bb = { x: b.x + r.range(-0.08, 0.12) * b.w, y: b.y + r.range(-0.08, 0.12) * b.h, w: b.w * sc, h: b.h * sc * r.range(0.8, 1.1) }
      const op = (P.dark ? 0.3 : 0.42) + 0.2 * k.sovrastampa
      put(g, { kind: 'path', name: 'acquerello', d: blobPath(r, bb, 0.55, 9), fill: tinte[i % tinte.length], blend: bl, opacity: op })
      // bordo bagnato: lo stesso contorno un po' più scuro e sottile
      put(g, { kind: 'path', name: 'acquerello_bordo', d: blobPath(r, { x: bb.x + bb.w * 0.04, y: bb.y + bb.h * 0.04, w: bb.w * 0.94, h: bb.h * 0.94 }, 0.5, 9), fill: 'transparent', stroke: alpha(tinte[i % tinte.length], 0.5), sw: filo(g, 3), blend: bl })
    }
  }
  // testatina: sezione a sinistra, brand a destra, filetto doppio
  let y = T
  const kick = lab(g, g.c.kicker, (W - 2 * m) * 0.55), br = lab(g, g.c.brand, (W - 2 * m) * 0.4)
  if (kick) putLab(g, 'occhiello', kick, m, y, C.acc)
  if (br) putLab(g, 'brand', br, W - m - br.w, y, C.fg, 'right', br.w)
  y += Math.max(kick?.h ?? 0, br?.h ?? 0, U(g, 16)) + U(g, 12)
  const rw = v === 1 ? W - m - (W * (side ? 0.3 : 0.34)) - gut : W - 2 * m
  put(g, { kind: 'line', name: 'filetto', x1: m, y1: y, x2: v === 1 ? W - m : m + rw, y2: y, color: C.fg, width: filo(g, 2.5) })
  put(g, { kind: 'line', name: 'filetto', x1: m, y1: y + U(g, 6), x2: v === 1 ? W - m : m + rw, y2: y + U(g, 6), color: C.fg, width: filo(g, 1) })
  y += U(g, 40)
  // folio in fondo: numero di pagina (decorativo) e filetto
  const folioH = U(g, 40)
  const yF = B - U(g, 26)
  const pag = String((k.seme % 180) + 12)
  put(g, { kind: 'line', name: 'filetto_folio', x1: m, y1: yF - U(g, 12), x2: W - m, y2: yF - U(g, 12), color: alpha(C.fg, 0.5), width: filo(g, 1) })
  txt(g, { name: 'folio', lines: [pag], font: s.label, size: U(g, 20), x: m, y: yF, color: C.sec, tracking: 0.1, deco: true })
  const bot = yF - U(g, 12) - U(g, 30)
  void folioH

  /** capolettera + testo; restituisce l'altezza usata */
  const corpo = (x: number, yy: number, w: number, maxLines: number) => {
    const body = g.c.body?.trim()
    if (!body) return 0
    const lead = 1.43, bz0 = g.sc.testo
    const drop = Math.round(bz0 * (lead * 2 + 1.13) * 1.0)
    const rest = body.slice(1)
    const b = para(g, rest, w - drop * 0.82, maxLines, 26)
    if (!b) return -1
    const ch = body[0].toUpperCase()
    const dz = drop / metrics(s.display).cap * 0.98
    txt(g, { name: 'capolettera', lines: [ch], font: s.display, size: dz, x, y: yy + b.size * FIRST_BASE - metrics(s.display).cap * b.size - (dz * FIRST_BASE - metrics(s.display).cap * dz), color: C.acc, leading: 1, deco: true })
    putPara(g, 'testo', b, x + drop * 0.82, yy, C.fg)
    return Math.max(b.h, drop)
  }
  /** elenco "in breve": dettagli numerati e invito */
  const breve = (w: number) => {
    const p = pila(g, w).filo(U(g, 12))
    p.add(lab(g, 'In breve', w, 14), 'lab', 'indice_breve', 'acc', U(g, 14))
    dettagli(p, g, w, true, 4)
    p.add(lab(g, ctaText(g.c), w), 'lab', 'invito', 'acc', 0)
    if (p.righe.length) p.righe[p.righe.length - 1].gap = 0
    return p
  }
  /** segno a matita rossa sulla parola chiave del titolo */
  const matita = (t: Fit, tx: number, ty: number) => {
    if (k.energia < 0.35 && s.forma !== 'mano') return
    const key = keyword(g).toLowerCase()
    const li = t.lines.findIndex(l => l.toLowerCase().includes(key))
    if (li < 0) return
    const l = t.lines[li], i0 = l.toLowerCase().indexOf(key)
    const x0 = tx + lineWidth(l.slice(0, i0), s.display, t.size, t.tracking ?? 0), kw = lineWidth(l.slice(i0, i0 + key.length), s.display, t.size, t.tracking ?? 0)
    const base = ty + t.size * (FIRST_BASE + li * (t.leading ?? 1))
    const col = readable(P.bg, [P.acc2 === P.bg ? P.acc : P.acc2, P.acc], 2)
    put(g, { kind: 'path', name: 'segno', d: wobblyPath(r, x0 - U(g, 6), base + U(g, 12), x0 + kw + U(g, 10), base + U(g, 8), U(g, 3)), fill: 'transparent', stroke: col, sw: U(g, 4) })
  }

  if (v === 0 || v === 2) {
    /* ── tre (o quattro) colonne: titolo in alto (0) o in fondo (2), foto stretta in una colonna ── */
    const nc = side ? 4 : 3
    const colW = (W - 2 * m - (nc - 1) * gut) / nc
    const cx = (i: number) => m + i * (colW + gut)
    const fc = r.chance(0.5) ? nc - 1 : 0
    const textCols = Array.from({ length: nc }, (_, i) => i).filter(i => i !== fc)
    const spanX = cx(textCols[0]), spanW = colW * (nc - 1) + gut * (nc - 2)
    const t = display(g, g.c.title, spanW, (bot - y) * (v === 2 ? 0.36 : 0.42), 150 + 70 * k.scala, 52, 4)
    if (!t) return null
    const tY = v === 0 ? y : bot - t.h
    const cTop = v === 0 ? y + t.h + U(g, 40) : y
    const cBot = v === 0 ? bot : tY - U(g, 40)
    // foto stretta: tutta l'altezza della pagina
    const pb = { x: cx(fc), y, w: colW, h: bot - y }
    acquerello({ x: pb.x - colW * 0.5, y: pb.y + pb.h * 0.15, w: colW * 2, h: pb.h * 0.7 }, 2 + Math.round(k.densita * 2))
    photo(g, 'foto', pb, s.forma === 'morbido' ? { shape: 'arch' } : {})
    txt(g, { name: 'didascalia', lines: [`fig. ${(k.seme % 9) + 1}`], font: s.label, size: U(g, 16), x: pb.x, y: pb.y + pb.h + U(g, 8), color: C.sec, tracking: 0.08, deco: true })
    putDisplay(g, 'titolo', t, spanX, tY, C.fg, 'left', spanW)
    matita(t, spanX, tY)
    const a = textCols[0], b2 = textCols[1]
    const used = corpo(cx(a), cTop, colW * (nc > 3 ? 2 : 1) + (nc > 3 ? gut : 0), Math.floor((cBot - cTop) / (g.sc.testo * 1.43)))
    if (used < 0) return null
    const bcol = nc > 3 ? textCols[2] : b2
    const p = breve(colW)
    if (p.h > cBot - cTop) return null
    p.place(cx(bcol), v === 0 ? cTop : cTop, C)
    // filetto verticale tra le colonne di testo
    put(g, { kind: 'line', name: 'filetto_colonna', x1: cx(bcol) - gut / 2, y1: cTop, x2: cx(bcol) - gut / 2, y2: cBot, color: alpha(C.fg, 0.35), width: filo(g, 1) })
  } else {
    /* ── striscia di foto al vivo sul bordo, pagina a due colonne con filetto ── */
    const fw = W * (side ? 0.3 : 0.34)
    const px = W - fw
    const pageW = px - gut - m
    acquerello({ x: px - fw * 0.55, y: H * 0.12, w: fw * 1.1, h: H * 0.5 }, 2 + Math.round(k.densita * 2))
    photo(g, 'foto', { x: px, y: 0, w: fw, h: H })
    const t = display(g, g.c.title, pageW, (bot - y) * 0.45, 150 + 70 * k.scala, 52, 4)
    if (!t) return null
    putDisplay(g, 'titolo', t, m, y, C.fg, 'left', pageW)
    matita(t, m, y)
    const cTop = y + t.h + U(g, 44)
    const cw2 = (pageW - gut) / 2
    const two = cw2 > 300 * g.u
    if (two) {
      const used = corpo(m, cTop, cw2, Math.floor((bot - cTop) / (g.sc.testo * 1.43)))
      if (used < 0) return null
      const p = breve(cw2)
      if (p.h > bot - cTop) return null
      p.place(m + cw2 + gut, cTop, C)
      put(g, { kind: 'line', name: 'filetto_colonna', x1: m + cw2 + gut / 2, y1: cTop, x2: m + cw2 + gut / 2, y2: bot, color: alpha(C.fg, 0.35), width: filo(g, 1) })
    } else {
      const used = corpo(m, cTop, pageW, 4)
      if (used < 0) return null
      const p = breve(pageW)
      const yy = cTop + used + U(g, 36)
      if (yy + p.h > bot) return null
      p.place(m, yy, C)
    }
  }
  allinea(g)
  return finish(g, 'colonne', 'Pagina a colonne')
}

/* ═══ 5. Locandina centrata ═════════════════════════════════════════════ */
function centrato(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const v = variante(g, 3), side = g.landscape
  const C = colori(g, P.bg)
  const orn = readable(P.bg, [P.acc, P.fg], 2)
  // cornice doppia con gli angoli ornati
  const fo = Math.round(m * 0.42), fi = fo + U(g, 12)
  put(g, { kind: 'rect', name: 'cornice', x: fo, y: fo, w: W - 2 * fo, h: H - 2 * fo, fill: 'transparent', stroke: C.fg, sw: filo(g, 3.5), r: v === 2 ? U(g, 26) : 0 })
  put(g, { kind: 'rect', name: 'cornice', x: fi, y: fi, w: W - 2 * fi, h: H - 2 * fi, fill: 'transparent', stroke: C.fg, sw: filo(g, 1.2), r: v === 2 ? U(g, 18) : 0 })
  const ca = U(g, 54)
  for (const [x, y, sx, sy] of [[fi + U(g, 10), fi + U(g, 10), 1, 1], [W - fi - U(g, 10), fi + U(g, 10), -1, 1], [fi + U(g, 10), H - fi - U(g, 10), 1, -1], [W - fi - U(g, 10), H - fi - U(g, 10), -1, -1]]) angolo(g, x, y, sx, sy, ca, orn)
  // zona del contenuto: in orizzontale la foto a sinistra e la colonna di testo a destra
  const zx0 = side ? W * 0.42 : fi + U(g, 60), zx1 = side ? W - fi - U(g, 60) : W - fi - U(g, 60)
  const colW = zx1 - zx0, cx = (zx0 + zx1) / 2
  const top = Math.max(T, fi + U(g, 50)), bot = Math.min(B, H - fi - U(g, 50))

  // il titolo: righe centrate (0, 2) o cartellone a righe piene di corpi diversi (1)
  type Riga2 = { l: string; font: FontSpec; size: number; tr: number }
  let righe: Riga2[] = []
  const titleH = (rr: Riga2[]) => rr.reduce((a, x, i) => a + x.size * 1.13 + (i ? U(g, 4) : 0), 0)
  if (v === 1) {
    const ls = stackLines(g.c.title, side ? 3 : 4)
    const it = { ...s.display, italic: s.accento === 'corsivo' || undefined }
    righe = ls.map((l, i) => {
      const small = i % 2 === 1 && ls.length > 2
      const font = small ? it : s.impact
      const text = small ? l.toLowerCase() : l.toUpperCase()
      const tr = small ? 0 : (s.impactSans ? 0.01 : -0.005)
      return { l: text, font, size: sizeForWidth(text, font, colW * (small ? 0.62 : 1), tr), tr }
    })
    const maxS = Math.min(Math.max(...righe.map(x => x.size)), H * 0.16)
    const minS = maxS * 0.44
    righe = righe.map(x => ({ ...x, size: Math.max(minS, Math.min(maxS, x.size)) }))
    righe = righe.map(x => ({ ...x, size: Math.min(x.size, sizeForWidth(x.l, x.font, colW, x.tr)) }))
  }
  const fitT = (maxH: number) => v === 1 ? (titleH(righe) <= maxH ? righe : null) : display(g, g.c.title, colW, maxH, 170 + 70 * k.scala, 52, 4)
  // pezzi della colonna: misurati prima, poi distribuiti nello spazio
  const brand = lab(g, g.c.brand, colW * 0.8)
  const kickFont = { ...s.display, italic: s.accento === 'corsivo' || undefined }
  const kz = g.c.kicker ? Math.min(U(g, 38), sizeForWidth(g.c.kicker, kickFont, colW * 0.8)) : 0
  const num = g.c.numero ? display(g, g.c.numero, colW * 0.5, U(g, 110), 96, 40, 1, false) : null
  const det = lab(g, detailsLine(g.c), colW)
  const body = para(g, g.c.body, colW * 0.82, 3, 0)
  const cta = lab(g, ctaText(g.c), colW)
  const fixed = (brand ? brand.h + U(g, 26) : 0) + U(g, 30) + (kz ? kz * 1.13 + U(g, 26) : 0) + U(g, 34) + (num ? num.h + U(g, 20) : 0) + (det ? det.h + U(g, 18) : 0) + (cta ? cta.h : 0)
  let bodyOn = !!body
  let avail = bot - top - fixed - (bodyOn ? body!.h + U(g, 22) : 0)
  // foto: arco o ovale (nella colonna) o a sinistra in orizzontale
  const wantPhoto = !side && (g.photo || v !== 1)
  let photoH = wantPhoto ? Math.max(0, avail * (v === 2 ? 0.55 : 0.48)) : 0
  let t = fitT(avail - photoH - U(g, 50))
  if (!t && bodyOn) { bodyOn = false; avail += body!.h + U(g, 22); photoH = wantPhoto ? avail * 0.45 : 0; t = fitT(avail - photoH - U(g, 50)) }
  if (!t && wantPhoto) { photoH = avail * 0.3; t = fitT(avail - photoH - U(g, 50)) }
  if (!t) return null
  const th = Array.isArray(t) ? titleH(t) : t.h
  if (photoH < H * 0.12) photoH = 0
  const used = fixed + (bodyOn ? body!.h + U(g, 22) : 0) + th + (photoH ? photoH + U(g, 50) : 0)
  const extra = Math.max(0, bot - top - used)
  const gapX = extra / (photoH ? 6 : 5)
  let y = top + gapX * 0.5
  if (brand) { putLab(g, 'brand', brand, zx0, y, C.fg, 'center', colW); y += brand.h + U(g, 26) }
  fregio(g, cx, y + U(g, 10), Math.min(colW * 0.5, U(g, 300)), orn); y += U(g, 30) + gapX
  if (kz) { txt(g, { name: 'occhiello', lines: [g.c.kicker!], font: kickFont, size: kz, x: zx0, y, w: colW, align: 'center', color: C.acc, leading: 1 }); y += kz * 1.13 + U(g, 26) }
  const fotoIn = (b: Box) => {
    const shape = v === 2 || s.forma === 'morbido' ? 'arco' : 'ovale'
    const d = shape === 'arco' ? archD(b) : ellisse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2)
    // alone d'accento fuori registro dietro la foto
    if (k.sovrastampa > 0.3) put(g, { kind: 'path', name: 'alone', d: shape === 'arco' ? archD({ ...b, x: b.x + U(g, 14), y: b.y - U(g, 14) }) : ellisse(b.x + b.w / 2 + U(g, 14), b.y + b.h / 2 - U(g, 14), b.w / 2, b.h / 2), fill: readable(P.bg, [P.acc, P.acc2], 1.3), opacity: 0.85 })
    fotoForma(g, 'foto', b, d)
    put(g, { kind: 'path', name: 'filo_foto', d: shape === 'arco' ? archD({ x: b.x - U(g, 10), y: b.y - U(g, 10), w: b.w + U(g, 20), h: b.h + U(g, 10) }) : ellisse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + U(g, 10), b.h / 2 + U(g, 10)), fill: 'transparent', stroke: C.fg, sw: filo(g, 1.5) })
    // colpi di frusta liberty da un lato
    if (v === 2) {
      const s1 = b.x - U(g, 26), yy0 = b.y + b.h * 0.1, yy1 = b.y + b.h
      const d2 = `M ${f1(s1)} ${f1(yy1)} C ${f1(s1 - b.w * 0.25)} ${f1(yy1 - b.h * 0.3)} ${f1(s1 + b.w * 0.12)} ${f1(yy0 + b.h * 0.35)} ${f1(s1 - b.w * 0.1)} ${f1(yy0)} C ${f1(s1 - b.w * 0.2)} ${f1(yy0 - b.h * 0.08)} ${f1(s1 - b.w * 0.32)} ${f1(yy0 + b.h * 0.05)} ${f1(s1 - b.w * 0.26)} ${f1(yy0 + b.h * 0.14)}`
      put(g, { kind: 'path', name: 'frusta', d: d2, fill: 'transparent', stroke: orn, sw: filo(g, 3) })
    }
  }
  if (photoH) {
    const pw = Math.min(colW * 0.72, photoH * (v === 2 ? 0.78 : 0.8))
    fotoIn({ x: cx - pw / 2, y, w: pw, h: photoH })
    y += photoH + U(g, 50)
  }
  y += gapX * (photoH ? 0.5 : 0)
  if (Array.isArray(t)) {
    t.forEach((x, i) => {
      txt(g, { name: `titolo#${i}`, lines: [x.l], font: x.font, size: x.size, x: zx0, y, w: colW, align: 'center', color: i % 2 && t.length > 2 ? C.acc : C.fg, tracking: x.tr, leading: 1 })
      y += x.size * 1.13 + (i < t.length - 1 ? U(g, 4) : 0)
    })
  } else { putDisplay(g, 'titolo', t, zx0, y, C.fg, 'center', colW); y += t.h }
  y += gapX + U(g, 20)
  fregio(g, cx, y, Math.min(colW * 0.6, U(g, 360)), orn); y += U(g, 24) + gapX * 0.6
  if (num) { txt(g, { name: 'numero', lines: num.lines, font: s.display, size: num.size, x: zx0, y, w: colW, align: 'center', color: C.acc, leading: 1, tracking: num.tracking }); y += num.h + U(g, 20) }
  if (det) { putLab(g, 'dettagli', det, zx0, y, C.sec, 'center', colW); y += det.h + U(g, 18) }
  if (bodyOn && body) { putPara(g, 'testo', body, zx0, y, C.fg, 'center', colW); y += body.h + U(g, 22) }
  if (cta) { putLab(g, 'invito', cta, zx0, y, C.acc, 'center', colW); y += cta.h }
  if (y > bot + 2) return null
  if (side) {
    // orizzontale: la foto (o il sole di raggi) nella metà sinistra
    const pbH = bot - top, pbW = Math.min(W * 0.42 - fi - U(g, 110), pbH * 0.8)
    const b = { x: fi + U(g, 60) + (W * 0.42 - fi - U(g, 110) - pbW) / 2, y: top, w: pbW, h: pbH }
    fotoIn(b)
    put(g, { kind: 'line', name: 'filetto', x1: W * 0.42 - U(g, 30), y1: top, x2: W * 0.42 - U(g, 30), y2: bot, color: alpha(C.fg, 0.4), width: filo(g, 1) })
  } else if (!photoH && k.densita > 0.4) {
    // senza foto: raggiera sottile dietro il titolo
    put(g, { kind: 'ornament', name: 'raggiera', id: 'raggiera', x: fi + U(g, 10), y: top + (bot - top) * 0.25, w: W - 2 * fi - U(g, 20), h: (bot - top) * 0.5, seed: r.int(1, 9999), opacity: 0.18, under: true, pal: { bg: P.bg, ink: P.fg, accent: P.acc, muted: P.sec, surface: P.srf } })
    const o = g.els.pop()!; g.els.splice(2, 0, o)
  }
  allinea(g)
  return finish(g, 'centrato', 'Locandina centrata', { specchio: side })
}

/* ═══ 6. Titolo in piedi ════════════════════════════════════════════════ */
function verticale(g: G): Scene | null {
  if (!g.photo) return null
  const { W, H, m, T, B, P, s, k, r } = g
  const v = variante(g, 3), side = g.landscape
  const font = s.impactSans ? s.impact : s.display
  const upp = s.impactSans || !!s.displayUpper
  const tr = s.impactSans ? 0 : s.displayTracking
  const tt = up(g.c.title, upp)
  const L = (B - T) * (side ? 0.98 : 0.96)
  const lead = 0.88
  // una riga a tutta altezza o due righe (come due colonne di pietra)
  const z1 = Math.min(sizeForWidth(tt, font, L, tr), (W * (side ? 0.22 : 0.34)) / 1.13)
  const two = stackLines(tt, 2)
  const z2 = two.length === 2 ? Math.min(...two.map(l => sizeForWidth(l, font, L, tr)), (W * (side ? 0.26 : 0.4)) / (1.13 + lead)) : 0
  const lines = v !== 1 && z2 > z1 * 1.35 ? two : [tt]
  const z = lines.length === 2 ? z2 : z1
  if (z < 64 * g.u) return null
  const th = z * 1.13 + (lines.length - 1) * z * lead
  const tw = Math.max(...lines.map(l => lineWidth(l, font, z, tr)))
  const mark = readable(P.bg, ['#ffffff', P.acc2, P.acc], 2.5)
  /** segni a pennarello: cerchio, sottolineatura, asterisco */
  const pennarello = (b: Box, color: string) => {
    if (k.energia < 0.3 && s.forma !== 'mano' && s.forma !== 'decostruito') return
    put(g, { kind: 'path', name: 'cerchiato', d: scribbleEllipse(r, b), fill: 'transparent', stroke: color, sw: U(g, 4) })
  }
  /** pannello d'informazioni orizzontale */
  const pannello = (x: number, w: number, bgc: string) => {
    const col = colori(g, bgc)
    const p = pila(g, w - U(g, 72))
    p.add(lab(g, g.c.brand, w - U(g, 72)), 'lab', 'brand', 'fg', U(g, 18))
    p.add(lab(g, g.c.kicker, w - U(g, 72)), 'lab', 'occhiello', 'acc', U(g, 12))
    p.add(para(g, g.c.body, w - U(g, 72), 3, 24), 'para', 'testo', 'fg', U(g, 18))
    p.add(lab(g, detailsLine(g.c), w - U(g, 72)), 'lab', 'dettagli', 'sec', U(g, 12))
    p.add(lab(g, ctaText(g.c), w - U(g, 72)), 'lab', 'invito', 'acc', 0)
    const hh = p.h + U(g, 72)
    const yy = g.format === 'storia' ? B - p.h - U(g, 36) : H - hh
    put(g, { kind: 'rect', name: 'velo_info', x, y: yy, w, h: H - yy, fill: bgc })
    p.place(x + U(g, 36), yy + U(g, 36), col)
    return { y: yy, h: hh, col }
  }

  if (v === 0 || v === 1) {
    const x0 = m * 0.7
    const colR = x0 + th + U(g, 44)
    const yStart = T + (B - T + tw) / 2
    const pX = colR
    if (W - pX < W * (side ? 0.4 : 0.36)) return null
    photo(g, 'foto', { x: pX, y: 0, w: W - pX, h: H })
    if (v === 1 && lines.length === 1) {
      // il titolo attraversa il confine tra il blocco scuro e la carta: i colori si scambiano tra due lettere
      const sp = [...tt.matchAll(/ /g)].map(x => x.index!)
      const mid = tt.length / 2
      const cut = sp.length ? sp.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0] + 1 : Math.round(mid)
      const A = tt.slice(0, cut).trimEnd(), Bt = tt.slice(cut)
      const offB = lineWidth(tt.slice(0, cut), font, z, tr) + tr * z
      const yS = yStart - lineWidth(A, font, z, tr) - (offB - lineWidth(A, font, z, tr)) / 2
      const blk = P.fg
      put(g, { kind: 'rect', name: 'blocco', x: 0, y: yS, w: pX, h: H - yS, fill: blk })
      const ca = su(g, blk)
      txt(g, { name: 'titolo#0', lines: [A], font, size: z, x: x0, y: yStart, color: ca, tracking: tr, leading: 1, angle: -90, chars: accentChars(g, [A], ca, blk) })
      txt(g, { name: 'titolo#1', lines: [Bt], font, size: z, x: x0, y: yStart - offB, color: P.fg, tracking: tr, leading: 1, angle: -90, chars: accentChars(g, [Bt], P.fg, P.bg) })
    } else {
      txt(g, { name: 'titolo', lines, font, size: z, x: x0, y: yStart, color: P.fg, tracking: tr, leading: lead, angle: -90, chars: accentChars(g, lines, P.fg, P.bg) })
    }
    const pw = side ? Math.min(W - pX, W * 0.36) : W - pX
    const pn = pannello(side ? W - pw : pX, pw, v === 1 ? P.bg : readable(P.bg, [P.acc, P.bg], 1.2) === P.acc && contrast(P.acc, P.fg) > 3 ? P.acc : P.bg)
    if (pn.y < H * 0.35) return null
    // segno a pennarello attorno all'invito o al dettaglio, sul pannello
    const inv = g.els.find(e => e.name === 'invito')
    if (inv) { const b = boxDi(inv); pennarello({ x: b.x, y: b.y, w: b.w, h: b.h }, readable(pn.col.fg === P.fg ? (pn.y ? P.bg : P.bg) : P.bg, [P.acc2, P.acc, pn.col.fg], 1.5)) }
    if (k.densita > 0.45) {
      const yy = pn.y - U(g, 60)
      freccia(g, pX + (W - pX) * 0.2, yy - U(g, 120), pX + (W - pX) * 0.32, yy - U(g, 10), mark)
    }
  } else {
    /* ── titolo sul bordo destro dall'alto in basso, eco a contorno, foto alta al centro ── */
    const xR = W - m * 0.7
    const yTop = T + (B - T - tw) / 2
    const col = readable(P.bg, [P.acc, P.fg], 2.6)
    for (let j = 1; j <= 1 + Math.round(k.densita); j++) txt(g, { name: 'eco', lines, font, size: z, x: xR - th * 0.92 * j, y: yTop, color: col, hollow: true, sw: Math.max(1.5, z * 0.012), tracking: tr, leading: lead, angle: 90, opacity: 0.5 / j, deco: true })
    txt(g, { name: 'titolo', lines, font, size: z, x: xR, y: yTop, color: col, tracking: tr, leading: lead, angle: 90, chars: accentChars(g, lines, col, P.bg) })
    const pR = xR - th - U(g, 40)
    const C = colori(g, P.bg)
    const head = pila(g, Math.min(W * 0.5, pR - m)).add(lab(g, g.c.brand, Math.min(W * 0.5, pR - m)), 'lab', 'brand', 'fg', U(g, 14)).add(lab(g, g.c.kicker, Math.min(W * 0.5, pR - m)), 'lab', 'occhiello', 'acc', 0)
    const iw = side ? (pR - m) * 0.45 : pR - m
    const foot = pila(g, iw)
    foot.add(para(g, g.c.body, iw, 3, 24), 'para', 'testo', 'fg', U(g, 16))
    foot.add(lab(g, detailsLine(g.c), iw), 'lab', 'dettagli', 'sec', U(g, 12))
    foot.add(lab(g, ctaText(g.c), iw), 'lab', 'invito', 'acc', 0)
    head.place(m, T, C)
    const pTop = T + head.h + U(g, 40)
    const pBot = side ? B : B - foot.h - U(g, 40)
    const pw = side ? (pR - m) * 0.5 : Math.min(pR - m, (pBot - pTop) * 0.62)
    if (pBot - pTop < H * 0.3 || pw < W * 0.25) return null
    const pb = { x: side ? m + iw + U(g, 40) : m, y: pTop, w: side ? pR - m - iw - U(g, 40) : pw, h: pBot - pTop }
    const d = U(g, 12 + 20 * k.sovrastampa)
    put(g, { kind: 'rect', name: 'quadro', x: pb.x + d, y: pb.y + d, w: pb.w, h: pb.h, fill: readable(P.bg, [P.acc, P.acc2, P.fg], 1.5) })
    photo(g, 'foto', pb)
    put(g, { kind: 'rect', name: 'filo_foto', x: pb.x - U(g, 12), y: pb.y - U(g, 12), w: pb.w + U(g, 24), h: pb.h + U(g, 24), fill: 'transparent', stroke: C.fg, sw: filo(g, 1.5) })
    foot.place(m, side ? B - foot.h : B - foot.h, C)
    const inv = g.els.find(e => e.name === 'invito')
    if (inv) { const b = boxDi(inv); pennarello(b, readable(P.bg, [P.acc2, P.acc], 1.6)) }
  }
  allinea(g)
  return finish(g, 'verticale', 'Titolo in piedi')
}

/* ═══ 7. Lettera gigante ════════════════════════════════════════════════ */
function iniziale(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const v = variante(g, 3)
  const ch = primaLettera(g.c.title)
  const font = v === 1 || s.impactSans ? s.impact : s.display
  const mt = metrics(font)
  const C = colori(g, P.bg)
  const affiancati = W / H >= 0.75
  // la lettera: altezza delle maiuscole quasi a tutta tavola, larghezza a metà
  const capT = affiancati ? H * (0.86 + 0.1 * k.scala) : H * 0.52
  const wT = affiancati ? W * (g.landscape ? 0.42 : 0.56) : W * 0.9
  let z = Math.min(capT / mt.cap, sizeForWidth(ch, font, wT))
  const adv = lineWidth(ch, font, z)
  // sconfina: a sinistra e in basso (o in alto nella storia)
  const lx = -adv * (0.06 + 0.06 * k.energia)
  const capH = mt.cap * z
  const baseY = affiancati ? H + capH * (0.04 + 0.06 * k.energia) - (H - B) * 0.2 : T + capH * 0.98
  const ly = baseY - z * FIRST_BASE
  const lb = { x: lx, y: baseY - capH, w: adv, h: capH }
  // colonna del testo
  const colX = affiancati ? Math.max(lx + adv * 0.92, W * 0.42) + g.g : m
  const colW = W - m - colX
  if (colW < W * 0.28) z = 0
  if (!z) return null
  const top = affiancati ? T : baseY + U(g, 50)
  const brand = lab(g, g.c.brand, colW)
  const p = pila(g, colW)
  p.add(lab(g, g.c.kicker, colW), 'lab', 'occhiello', 'acc', U(g, 14))
  p.add(para(g, g.c.body, colW, 4, 24), 'para', 'testo', 'fg', U(g, 18))
  p.add(lab(g, detailsLine(g.c), colW), 'lab', 'dettagli', 'sec', U(g, 12))
  p.add(lab(g, ctaText(g.c), colW), 'lab', 'invito', 'acc', 0)
  const yTitleMax = B - p.h - U(g, 50)
  const photoMod = v === 0 && affiancati
  const phH = photoMod ? (yTitleMax - top) * 0.42 : 0
  const t = display(g, g.c.title, colW, yTitleMax - top - (brand ? brand.h + U(g, 40) : 0) - (phH ? phH + U(g, 40) : 0), 150 + 60 * k.scala, 52, 4)
  if (!t) return null
  const letterCol = readable(P.bg, [P.acc, P.acc2, P.fg], 1.8)
  if (v === 0) {
    /* ── lettera piena in sovrastampa su una foto ── */
    if (photoMod) {
      const pb = { x: colX - U(g, 40) - adv * 0.3, y: top + (brand ? brand.h + U(g, 40) : 0), w: W - (colX - U(g, 40) - adv * 0.3), h: phH }
      photo(g, 'foto', pb)
    } else {
      photo(g, 'foto', { x: 0, y: 0, w: W, h: baseY - capH * 0.35 })
    }
    txt(g, { name: 'lettera', lines: [ch], font, size: z, x: lx, y: ly, color: letterCol, leading: 1, blend: over(g), opacity: 0.95, deco: true })
  } else if (v === 1) {
    /* ── la foto dentro la lettera, contorno fuori registro e ombra piena ── */
    const off = U(g, 10 + 22 * k.sovrastampa)
    txt(g, { name: 'ombra_lettera', lines: [ch], font, size: z, x: lx + off, y: ly + off * 0.7, color: letterCol, leading: 1, deco: true })
    const bx = Math.max(0, lx), by = Math.max(0, ly), bw = Math.min(W, lx + adv) - bx, bh = Math.min(H, ly + z * 1.13) - by
    const im = photo(g, 'foto', { x: bx, y: by, w: bw, h: bh }, { clipText: { lines: [ch], font, size: z, x: lx, y: ly, lineHeight: 1, tracking: 0 } })
    void im
    txt(g, { name: 'filo_lettera', lines: [ch], font, size: z, x: lx - off * 0.6, y: ly - off * 0.4, color: P.fg, hollow: true, sw: Math.max(1.5, z * 0.005), leading: 1, deco: true })
  } else {
    /* ── tre scale della stessa lettera: contorno enorme, piena media, minuscola ── */
    txt(g, { name: 'lettera', lines: [ch], font, size: z, x: lx, y: ly, color: P.fg, hollow: true, sw: Math.max(2, z * 0.006), leading: 1, deco: true })
    const z2 = z * 0.42
    const x2 = lx + adv * 0.42, y2 = ly + z * 0.42
    txt(g, { name: 'lettera_media', lines: [ch], font, size: z2, x: x2, y: y2, color: letterCol, leading: 1, blend: over(g), deco: true })
    const R = Math.min(adv * 0.24, W * 0.14)
    const cxp = lx + adv * 0.36, cyp = baseY - capH * 0.7
    if (cxp - R > U(g, 10) && cyp - R > 0) photo(g, 'foto', { x: cxp - R, y: cyp - R, w: 2 * R, h: 2 * R }, { shape: 'circle' })
    if (k.densita > 0.4) dotField(g, 'puntini', { x: Math.max(0, lx + adv * 0.5), y: Math.max(0, lb.y + capH * 0.1), w: adv * 0.4, h: capH * 0.45 }, U(g, 16), readable(P.bg, [P.acc, P.fg], 1.5), 'x')
  }
  // specimen: la lettera nominata come in un campionario
  txt(g, { name: 'specimen', lines: [`${ch} — ${font.family} ${font.weight}`.toUpperCase()], font: s.label, size: U(g, 14), x: affiancati ? m : m, y: affiancati ? T - U(g, 30) > m * 0.5 ? T - U(g, 30) : m * 0.5 : baseY + U(g, 14), color: alpha(P.fg, 0.7), tracking: 0.14, deco: true })
  let y = top
  if (brand) { putLab(g, 'brand', brand, colX, y, C.fg); y += brand.h + U(g, 40) }
  if (phH) y += phH + U(g, 40)
  const tY = affiancati ? Math.max(y, yTitleMax - t.h) : y
  // filetto d'accento che collega la lettera al titolo
  put(g, { kind: 'rect', name: 'barra', x: colX - g.g - U(g, 40), y: tY - U(g, 22), w: U(g, 40) + g.g + colW * 0.3, h: U(g, 8), fill: readable(P.bg, [P.acc, P.fg], 2) })
  putDisplay(g, 'titolo', t, colX, tY, C.fg, 'left', colW)
  p.place(colX, B - p.h, C)
  allinea(g)
  return finish(g, 'iniziale', 'Lettera gigante')
}

/* ═══ 8. Pagina calligrafica ════════════════════════════════════════════ */
function calligrafico(g: G): Scene | null {
  const { W, H, m, T, B, P, s, k, r } = g
  const v = variante(g, 3), side = g.landscape
  const C = colori(g, P.bg)
  const sumi = P.dark ? P.fg : mix(P.fg, '#0b1530', 0.25)
  const rosso = readable(P.bg, ['#c8321f', P.acc, '#b22a1a'], 3)
  const font = s.display
  const trD = 0.05
  const hk = Math.min(W, H) * 0.085
  const sigla = iniz(g.c.brand || g.c.title)
  /** informazioni sussurrate: piccole, in basso */
  const info = (w: number) => {
    const p = pila(g, w)
    p.add(lab(g, g.c.brand, w), 'lab', 'brand', 'fg', U(g, 16))
    p.add(para(g, g.c.body, w, 3, 22), 'para', 'testo', 'sec', U(g, 16))
    p.add(lab(g, detailsLine(g.c), w), 'lab', 'dettagli', 'sec', U(g, 12))
    p.add(lab(g, ctaText(g.c), w), 'lab', 'invito', 'acc', 0)
    return p
  }
  const nota = (x: number, y: number, w: number, align: 'left' | 'right' = 'left') => {
    const f = g.c.kicker ? lab(g, g.c.kicker, w) : null
    if (!f) return null
    putLab(g, 'occhiello', f, align === 'left' ? x : x - f.w, y, C.acc, align, f.w)
    return f
  }

  if (v === 0) {
    /* ── ensō con la foto dentro, titolo in colonna verticale a destra ── */
    const R = Math.min(W, H) * (side ? 0.3 : 0.27) * (0.9 + 0.2 * k.scala)
    const ecx = side ? W * 0.3 : m + R * 1.1, ecy = side ? H * 0.47 : T + (B - T) * (g.format === 'storia' ? 0.33 : 0.4)
    const bw = R * 0.2
    if (k.sovrastampa > 0.3) put(g, { kind: 'circle', name: 'macchia', cx: ecx + R * 0.15, cy: ecy - R * 0.1, r: R * 0.62, fill: rosso, blend: over(g), opacity: 0.35 })
    const pr = R * 0.62
    photo(g, 'foto', { x: ecx - pr, y: ecy - pr, w: 2 * pr, h: 2 * pr }, { shape: 'circle' })
    enso(g, ecx, ecy, R, bw, sumi, { blend: P.dark ? undefined : 'multiply' })
    // titolo verticale (dall'alto in basso): le righe si leggono da destra a sinistra
    const L = (B - T) * 0.82
    const ls = stackLines(g.c.title, 2)
    const one = Math.min(sizeForWidth(g.c.title, font, L, trD), W * 0.2)
    const twoZ = ls.length === 2 ? Math.min(...ls.map(l => sizeForWidth(l, font, L, trD)), W * 0.13) : 0
    const lines = twoZ > one * 1.3 ? ls : [g.c.title]
    const z = (lines.length === 2 ? twoZ : one) * (0.86 + 0.14 * k.scala)
    if (z < 56 * g.u) return null
    const xR = W - m
    const thk = z * 1.13 + (lines.length - 1) * z * 1.15
    const tL = Math.max(...lines.map(l => lineWidth(l, font, z, trD)))
    if (xR - thk < ecx + R + bw + U(g, 30)) return null
    txt(g, { name: 'titolo', lines, font, size: z, x: xR, y: T, color: sumi, tracking: trD, leading: 1.15, angle: 90, chars: accentChars(g, lines, sumi, P.bg) })
    timbro(g, xR - thk / 2 - hk / 2, T + tL + U(g, 40), hk, sigla, rosso, r.range(-6, 6))
    const iw = side ? W * 0.3 : Math.min(W * 0.5, xR - thk - m - U(g, 40))
    const p = info(iw)
    if (ecy + R + bw / 2 + U(g, 40) > B - p.h) return null
    p.place(m, B - p.h, C)
    const nf = nota(ecx + R * 0.72, ecy - R - bw - U(g, 10) - U(g, 22), W * 0.4)
    void nf
    if (k.energia > 0.4) put(g, { kind: 'line', name: 'filetto', x1: m, y1: B - p.h - U(g, 30), x2: m + iw * 0.4, y2: B - p.h - U(g, 30), color: alpha(sumi, 0.6), width: filo(g, 1) })
  } else if (v === 1) {
    /* ── titolo a capo spezzato come una poesia, un tratto lungo di pennello, foto piccola ── */
    const ls = stackLines(g.c.title, side ? 3 : 4)
    const ind = W * (side ? 0.05 : 0.07)
    const maxW = W - 2 * m - ind * (ls.length - 1)
    const z0 = Math.min(...ls.map(l => sizeForWidth(l, font, maxW, trD)), H * 0.13) * (0.8 + 0.2 * k.scala)
    const z = Math.min(z0, (B - T) * 0.42 / (ls.length * 1.15))
    if (z < 56 * g.u) return null
    const iw = side ? W * 0.32 : W * 0.52
    const p = info(iw)
    const pw = side ? W * 0.22 : W * 0.32, ph = pw * 1.25
    const pb = { x: W - m - pw, y: T, w: pw, h: ph }
    const tTop = side ? T + U(g, 60) : T + ph + U(g, 60)
    const tH = z * 1.13 + (ls.length - 1) * z * 1.15
    if (tTop + tH + U(g, 60) > B - p.h) return null
    const yMid = tTop + tH * 0.62
    // tratto orizzontale dietro la parte bassa del titolo
    pennellata(g, 'tratto', [[-W * 0.04, yMid + z * 0.2], [W * 0.3, yMid - z * 0.05], [W * 0.62, yMid + z * 0.1], [W * 0.86, yMid - z * 0.02]], z * 0.9, readable(P.bg, [P.acc, P.acc2], 1.3), { blend: over(g), opacity: P.dark ? 0.32 : 0.4 })
    photo(g, 'foto', pb)
    put(g, { kind: 'rect', name: 'filo_foto', x: pb.x - U(g, 10), y: pb.y - U(g, 10), w: pb.w + U(g, 20), h: pb.h + U(g, 20), fill: 'transparent', stroke: alpha(sumi, 0.7), sw: filo(g, 1) })
    timbro(g, pb.x - hk * 0.5, pb.y + pb.h - hk * 0.6, hk, sigla, rosso, r.range(-8, 4))
    let y = tTop
    ls.forEach((l, i) => {
      const x = m + ind * i
      if (x + lineWidth(l, font, z, trD) > W - m || (side && x + lineWidth(l, font, z, trD) > pb.x - U(g, 30) && y < pb.y + pb.h + U(g, 20))) return
      txt(g, { name: `titolo#${i}`, lines: [l], font, size: z, x, y, color: sumi, tracking: trD, leading: 1, chars: accentChars(g, [l], sumi, P.bg) })
      y += z * 1.15
    })
    if (g.els.filter(e => e.name.startsWith('titolo#')).length !== ls.length) return null
    const nf = nota(m, side ? T : T + U(g, 6), side ? W * 0.3 : pb.x - m - U(g, 40))
    void nf
    p.place(m, B - p.h, C)
  } else {
    /* ── un tratto diagonale che attraversa la foto; titolo basso, timbro, filetto verticale ── */
    const pw = side ? W * 0.26 : W * 0.4
    const pb = { x: side ? W * 0.5 : W - m - pw, y: side ? T + (B - T) * 0.12 : T + U(g, 40), w: pw, h: pw * (side ? 1.05 : 0.9) }
    photo(g, 'foto', pb)
    const wB = Math.min(W, H) * 0.16
    pennellata(g, 'tratto', [[-W * 0.05, pb.y + pb.h * 1.1], [pb.x - pw * 0.1, pb.y + pb.h * 0.62], [pb.x + pw * 0.55, pb.y + pb.h * 0.3], [pb.x + pw * 1.25, pb.y - pb.h * 0.15]], wB, sumi, { blend: P.dark ? 'screen' : 'multiply', opacity: 0.9 })
    const iw = side ? W * 0.34 : W - 2 * m - U(g, 60)
    const p = info(Math.min(iw, W * 0.6))
    const tw = side ? W * 0.4 : W - 2 * m
    const tTop = side ? pb.y : pb.y + pb.h + wB * 0.6 + U(g, 50)
    const t = display(g, g.c.title, tw, B - p.h - U(g, 60) - tTop, 130 + 50 * k.scala, 56, 4)
    if (!t) return null
    const ty = side ? Math.max(tTop, B - p.h - U(g, 60) - t.h) : B - p.h - U(g, 60) - t.h
    putDisplay(g, 'titolo', t, m, ty, sumi, 'left', tw, { tracking: trD })
    p.place(m, B - p.h, C)
    const xr = m + Math.max(t.w, p.w) + U(g, 40)
    if (xr + hk + U(g, 20) < W - m) {
      put(g, { kind: 'line', name: 'filetto', x1: xr, y1: ty, x2: xr, y2: B, color: alpha(sumi, 0.6), width: filo(g, 1) })
      timbro(g, xr + U(g, 24), B - hk, hk, sigla, rosso, r.range(-6, 6))
    } else timbro(g, pb.x + pb.w - hk * 0.7, pb.y + pb.h - hk * 0.5, hk, sigla, rosso, r.range(-6, 6))
    nota(m, T, side ? pb.x - m - U(g, 40) : pb.x - m - U(g, 40))
  }
  allinea(g)
  return finish(g, 'calligrafico', 'Pagina calligrafica', { specchio: v !== 0 })
}

export const SYSTEMS_A: Record<'manifesto' | 'scalinata' | 'strilli' | 'colonne' | 'centrato' | 'verticale' | 'iniziale' | 'calligrafico', Sistema> = {
  manifesto, scalinata, strilli, colonne, centrato, verticale, iniziale, calligrafico,
}

/* attrezzi importati per gli sviluppi successivi (evitano l'avviso di import inutilizzato) */
export const _a = { treat, regMark, lum, ink }
