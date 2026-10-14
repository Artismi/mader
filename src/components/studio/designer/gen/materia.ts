/**
 * Materia: gli oggetti delle tavole come generatori con varianti, non come
 * disegni fissi. Carta (con trama, piega, angolo sollevato), ombre (piatte,
 * morbide, di contatto, sollevate, a strati), nastri adesivi (trasparente,
 * carta, washi a righe o a pois, telato, scotch), timbri (rettangolo, doppio,
 * tondo, etichetta) con l'inchiostro consumato, contatori (palette, rullo,
 * tacche), barrette (codici, avanzamento) e uno strato generativo facoltativo
 * (ornamenti del laboratorio, riempimenti generativi, segni) che si adatta al
 * posto libero e alla palette.
 *
 * Ogni oggetto ha tre livelli di dettaglio, scelti dal seme e dal registro:
 * piatto (grafico, pochi strati), curato, realistico (trame, ombre a strati,
 * pieghe). Le trame stanno sempre in un velo con fusione sopra un fondo pieno:
 * il controllo di leggibilità vede il colore vero della carta.
 */
import type { FontSpec, FxSpec, SceneEl } from '../types'
import { type G, put, U, txt, mix, alpha, readable, darker, lighter, lum, textBox } from './tools'
import { hashText } from './knobs'
import { lineWidth } from '../text'

type Pt = [number, number]
type Box = { x: number; y: number; w: number; h: number }
const f1 = (n: number) => n.toFixed(1)
const poly = (pts: Pt[]) => 'M ' + pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join(' L ') + ' Z'
const rad = (d: number) => (d * Math.PI) / 180

/* ── dettaglio e scelte stabili ───────────────────────────────────────── */
export type Dettaglio = 0 | 1 | 2
/** Scelta stabile dal seme e da un nome (lo stesso oggetto nella stessa tavola sceglie sempre uguale). */
export function sceglie<T>(g: G, chiave: string, lista: readonly T[]): T {
  return lista[hashText(`${g.k.seme}|${chiave}`) % lista.length]
}
/** Quanto realismo: i registri grafici stanno sul piatto, quelli materici sul realistico. */
export function dettaglio(g: G): Dettaglio {
  const reg = g.s.registro
  const base = ['artigianale', 'retro', 'editoriale', 'lusso'].includes(reg) ? 1.4 : ['svizzero', 'tech'].includes(reg) ? 0.4 : 0.9
  const v = base + g.k.densita * 0.8 + ((hashText(`${g.k.seme}|dettaglio`) % 100) / 100 - 0.5) * 1.2
  return v < 0.75 ? 0 : v < 1.55 ? 1 : 2
}

/** Riferimento ruotato di un riquadro (rotazione attorno al centro). */
export function telaio(b: Box, deg: number) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, a = rad(deg), ca = Math.cos(a), sa = Math.sin(a)
  const P = (lx: number, ly: number): Pt => [cx + (lx - b.w / 2) * ca - (ly - b.h / 2) * sa, cy + (lx - b.w / 2) * sa + (ly - b.h / 2) * ca]
  return { P, deg, b, corners: [P(0, 0), P(b.w, 0), P(b.w, b.h), P(0, b.h)] as Pt[] }
}
export type Telaio = ReturnType<typeof telaio>
/** Angolo in alto a sinistra di un rettangolo che ruota attorno al suo angolo (come rect e testo) e ha il centro di `b`. */
const tlDi = (T: Telaio) => T.P(0, 0)

/* ── ombre ────────────────────────────────────────────────────────────── */
export type Ombra = 'nessuna' | 'netta' | 'piatta' | 'contatto' | 'morbida' | 'sollevata' | 'strati'
/** L'ombra adatta al dettaglio (o quella chiesta). */
export function ombraPer(g: G, chiave = 'ombra'): Ombra {
  const d = dettaglio(g)
  return d === 0 ? sceglie(g, chiave, ['netta', 'piatta', 'nessuna'] as const) : d === 1 ? sceglie(g, chiave, ['piatta', 'morbida', 'contatto'] as const) : sceglie(g, chiave, ['sollevata', 'strati', 'morbida'] as const)
}
/**
 * Ombra di una forma (un tracciato in coordinate della tavola). Le ombre
 * morbide usano l'ombra del motore effetti su una copia nascosta sotto
 * l'oggetto: si vede solo quello che sporge.
 */
export function ombra(g: G, d: string, tipo: Ombra, o: { colore?: string; dx?: number; dy?: number } = {}) {
  const dx = o.dx ?? U(g, 10), dy = o.dy ?? U(g, 14)
  const sposta = (x: number, y: number) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, a: string, b: string) => `${f1(+a + x)} ${f1(+b + y)}`)
  switch (tipo) {
    case 'nessuna': return
    case 'netta': put(g, { kind: 'path', name: 'ombra', d: sposta(dx * 0.9, dy * 0.7), fill: o.colore ?? darker(g.P.fg, g.P.bg) }); return
    case 'piatta': put(g, { kind: 'path', name: 'ombra', d: sposta(dx, dy), fill: alpha('#000000', 0.2) }); return
    case 'contatto': put(g, { kind: 'path', name: 'ombra', d: sposta(U(g, 2), U(g, 4)), fill: alpha('#000000', 0.3) }); return
    case 'strati':
      put(g, { kind: 'path', name: 'ombra', d: sposta(dx * 1.6, dy * 1.8), fill: alpha('#000000', 0.08) })
      put(g, { kind: 'path', name: 'ombra', d: sposta(dx * 0.8, dy), fill: alpha('#000000', 0.12) })
      put(g, { kind: 'path', name: 'ombra', d: sposta(U(g, 2), U(g, 3)), fill: alpha('#000000', 0.22) })
      return
    default: {
      const fx: FxSpec[] = [{ id: 'dropShadow', variant: tipo === 'sollevata' ? 'sollevata' : 'morbida' }]
      put(g, { kind: 'path', name: 'ombra', d, fill: '#202020', fx })
    }
  }
}

/* ── carta ────────────────────────────────────────────────────────────── */
export type Trama = 'nessuna' | 'carta' | 'tela' | 'graffi' | 'grana' | 'cemento'
export interface CartaOpts {
  name?: string
  ombra?: Ombra
  trama?: Trama
  /** piega: nessuna, orizzontale, verticale o diagonale */
  piega?: 'nessuna' | 'orizzontale' | 'verticale' | 'diagonale'
  /** angolo sollevato (in basso a destra, o a sinistra) */
  angolo?: 'nessuno' | 'destro' | 'sinistro'
  /** raggio degli angoli */
  r?: number
  /** contorno */
  bordo?: string
  /** tracciato del bordo (per carta strappata o a dente): sostituisce il rettangolo */
  sagoma?: string
  /** con la sagoma: quanto rientra il fondo pieno (in alto e in basso) che regge i testi */
  rientro?: number
}
/** Le scelte della carta adatte al dettaglio (si possono forzare una per una). */
export function cartaPer(g: G, chiave = 'carta'): Required<Pick<CartaOpts, 'ombra' | 'trama' | 'piega' | 'angolo'>> {
  const d = dettaglio(g)
  return {
    ombra: ombraPer(g, `${chiave}|ombra`),
    trama: d === 0 ? 'nessuna' : d === 1 ? sceglie(g, `${chiave}|trama`, ['nessuna', 'carta', 'grana'] as const) : sceglie(g, `${chiave}|trama`, ['carta', 'tela', 'graffi', 'carta'] as const),
    piega: d === 2 ? sceglie(g, `${chiave}|piega`, ['orizzontale', 'diagonale', 'nessuna', 'verticale'] as const) : 'nessuna',
    angolo: d >= 1 ? sceglie(g, `${chiave}|angolo`, ['nessuno', 'destro', 'sinistro', 'nessuno'] as const) : 'nessuno',
  }
}
/**
 * Un foglio: ombra, fondo pieno (che il controllo di leggibilità legge),
 * trama in un velo, piega e angolo sollevato. `b` e `deg`: riquadro e
 * rotazione attorno al centro. Restituisce il telaio per piazzarci i testi
 * e la zona da lasciare libera vicino all'angolo sollevato.
 */
export function carta(g: G, b: Box, deg: number, fill: string, o: CartaOpts = {}) {
  const T = telaio(b, deg)
  const name = o.name ?? 'carta'
  const d = o.sagoma ?? poly(T.corners)
  const lato = Math.min(b.w, b.h)
  const piega = Math.min(lato * 0.16, U(g, 70))
  if (o.ombra && o.ombra !== 'nessuna') ombra(g, d, o.ombra)
  if (o.sagoma) {
    put(g, { kind: 'path', name, d, fill, stroke: o.bordo, sw: o.bordo ? Math.max(1.5, U(g, 2)) : undefined })
    const ri = o.rientro ?? 0
    const [x, y] = T.P(0, ri)
    put(g, { kind: 'rect', name: `${name}_piena`, x, y, w: b.w, h: b.h - 2 * ri, fill, angle: deg || undefined })
  } else { const [x, y] = tlDi(T); put(g, { kind: 'rect', name, x, y, w: b.w, h: b.h, fill, angle: deg || undefined, r: o.r, stroke: o.bordo, sw: o.bordo ? Math.max(1.5, U(g, 2)) : undefined }) }
  // la trama: un velo in fusione (fuori dal controllo di leggibilità), mai sopra i colori dei testi
  if (o.trama && o.trama !== 'nessuna') {
    const [x, y] = tlDi(T)
    const scuraC = lum(fill) < 0.3
    if (o.sagoma) put(g, { kind: 'path', name: `trama_${name}`, d, fill, blend: scuraC ? 'screen' : 'multiply', opacity: 0.7, fx: [{ id: 'textureOverlay', variant: o.trama, p: { opacity: o.trama === 'grana' ? 40 : 55 } }] })
    else put(g, { kind: 'rect', name: `trama_${name}`, x, y, w: b.w, h: b.h, fill, angle: deg || undefined, r: o.r, blend: scuraC ? 'screen' : 'multiply', opacity: 0.7, fx: [{ id: 'textureOverlay', variant: o.trama, p: { opacity: o.trama === 'grana' ? 40 : 55 } }] })
  }
  // la piega: luce da una parte, ombra dall'altra, un filo chiaro sulla cresta
  if (o.piega && o.piega !== 'nessuna') {
    const [a, c] = o.piega === 'orizzontale' ? [T.P(0, b.h * 0.5), T.P(b.w, b.h * 0.5)] : o.piega === 'verticale' ? [T.P(b.w * 0.5, 0), T.P(b.w * 0.5, b.h)] : [T.P(b.w * 0.15, 0), T.P(b.w * 0.85, b.h)]
    const meta = o.piega === 'orizzontale' ? [T.P(0, b.h * 0.5), T.P(b.w, b.h * 0.5), T.P(b.w, b.h), T.P(0, b.h)] : o.piega === 'verticale' ? [T.P(b.w * 0.5, 0), T.P(b.w, 0), T.P(b.w, b.h), T.P(b.w * 0.5, b.h)] : [T.P(b.w * 0.15, 0), T.P(b.w, 0), T.P(b.w, b.h), T.P(b.w * 0.85, b.h)]
    put(g, { kind: 'path', name: `piega_${name}`, d: poly(meta), fill: '#000000', blend: 'multiply', opacity: 0.06 })
    put(g, { kind: 'line', name: `piega_${name}`, x1: a[0], y1: a[1], x2: c[0], y2: c[1], color: alpha('#ffffff', 0.55), width: Math.max(1.5, U(g, 2.5)) })
    put(g, { kind: 'line', name: `piega_${name}`, x1: a[0] + U(g, 2), y1: a[1] + U(g, 2), x2: c[0] + U(g, 2), y2: c[1] + U(g, 2), color: alpha('#000000', 0.12), width: Math.max(1, U(g, 1.5)) })
  }
  // l'angolo sollevato: l'angolo si arriccia, sotto si vede il fondo e un'ombretta
  let libero: Box | null = null
  if (o.angolo && o.angolo !== 'nessuno' && !o.sagoma) {
    const dx = o.angolo === 'destro'
    const ax = dx ? b.w : 0, ay = b.h
    const s = piega
    const p1 = T.P(dx ? ax - s : ax + s, ay), p2 = T.P(ax, ay - s), pc = T.P(ax, ay)
    const lembo = T.P(dx ? ax - s * 0.92 : ax + s * 0.92, ay - s * 0.92)
    put(g, { kind: 'path', name: `angolo_${name}`, d: poly([p1, pc, p2]), fill: g.P.bg })
    put(g, { kind: 'path', name: `angolo_${name}`, d: poly([p1, p2, T.P(dx ? ax - s * 0.6 : ax + s * 0.6, ay - s * 0.35)]), fill: alpha('#000000', 0.18) })
    put(g, { kind: 'path', name: `angolo_${name}`, d: `M ${f1(p1[0])} ${f1(p1[1])} Q ${f1(lembo[0])} ${f1(lembo[1])} ${f1(p2[0])} ${f1(p2[1])} Z`, fill: mix(fill, '#000000', lum(fill) > 0.5 ? 0.1 : 0.25) })
    libero = { x: dx ? b.w - s * 1.2 : 0, y: b.h - s * 1.2, w: s * 1.2, h: s * 1.2 }
  }
  return { T, libero }
}

/* ── nastri ───────────────────────────────────────────────────────────── */
export type Nastro = 'trasparente' | 'carta' | 'washi' | 'pois' | 'telato' | 'scotch'
export function nastroPer(g: G, chiave = 'nastro'): Nastro {
  const d = dettaglio(g)
  const reg = g.s.registro
  const giocoso = ['pop', 'infantile'].includes(reg)
  return d === 0 ? sceglie(g, chiave, giocoso ? ['washi', 'pois'] as const : ['carta', 'washi'] as const)
    : sceglie(g, chiave, giocoso ? ['washi', 'pois', 'trasparente', 'scotch'] as const : ['trasparente', 'carta', 'telato', 'scotch', 'washi'] as const)
}
/** Nastro adesivo centrato in (cx, cy), lungo `len`, ruotato di `deg`, con le estremità strappate. */
export function nastro(g: G, cx: number, cy: number, len: number, deg: number, tipo: Nastro) {
  const wid = U(g, tipo === 'telato' ? 40 : tipo === 'scotch' ? 26 : 32)
  const T = telaio({ x: cx - len / 2, y: cy - wid / 2, w: len, h: wid }, deg)
  // estremità a dentini (strappo); i lati lunghi dritti
  const dent = Math.max(4, Math.round(wid / U(g, 6)))
  const r = (i: number) => ((hashText(`${g.k.seme}|${cx.toFixed(0)}|${i}`) % 100) / 100 - 0.5) * U(g, 6)
  const pts: Pt[] = [T.P(0, 0), T.P(len, 0)]
  for (let i = 1; i < dent; i++) pts.push(T.P(len + r(i), (wid * i) / dent))
  pts.push(T.P(len, wid), T.P(0, wid))
  for (let i = dent - 1; i > 0; i--) pts.push(T.P(r(i + 50), (wid * i) / dent))
  const d = poly(pts)
  const acc = readable(g.P.bg, [g.P.acc, g.P.acc2, g.P.fg], 1.4)
  const colore: Record<Nastro, string> = {
    trasparente: alpha('#efe4c4', 0.72), carta: alpha('#d8c49a', 0.92), washi: alpha(acc, 0.82), pois: alpha(lighter(acc, '#ffffff') === '#ffffff' ? mix(acc, '#ffffff', 0.35) : acc, 0.85),
    telato: alpha('#b8b6ae', 0.94), scotch: alpha('#e9f3fb', 0.45),
  }
  put(g, { kind: 'path', name: 'nastro', d, fill: colore[tipo] })
  if (tipo === 'washi') {
    // righe diagonali chiare dentro il nastro
    let dd = ''
    for (let x = -wid; x < len; x += U(g, 14)) { const a = T.P(Math.max(0, x), x < 0 ? -x : 0), b = T.P(Math.min(len, x + wid), x + wid > len ? wid - (x + wid - len) : wid); dd += `M ${f1(a[0])} ${f1(a[1])} L ${f1(b[0])} ${f1(b[1])} ` }
    put(g, { kind: 'path', name: 'nastro_righe', d: dd, fill: 'transparent', stroke: alpha('#ffffff', 0.45), sw: U(g, 4) })
  } else if (tipo === 'pois') {
    let dd = ''
    const q = U(g, 12)
    for (let x = q; x < len - q / 2; x += q * 1.6) for (const y of [wid * 0.3, wid * 0.72]) { const [px, py] = T.P(x + (y > wid / 2 ? q * 0.8 : 0), y); dd += `M ${f1(px - q * 0.22)} ${f1(py)} a ${f1(q * 0.22)} ${f1(q * 0.22)} 0 1 0 ${f1(q * 0.44)} 0 a ${f1(q * 0.22)} ${f1(q * 0.22)} 0 1 0 ${f1(-q * 0.44)} 0 ` }
    put(g, { kind: 'path', name: 'nastro_pois', d: dd, fill: alpha('#ffffff', 0.7) })
  } else if (tipo === 'telato') {
    let dd = ''
    for (let x = U(g, 5); x < len; x += U(g, 5)) { const a = T.P(x, 0), b = T.P(x, wid); dd += `M ${f1(a[0])} ${f1(a[1])} L ${f1(b[0])} ${f1(b[1])} ` }
    put(g, { kind: 'path', name: 'nastro_trama', d: dd, fill: 'transparent', stroke: alpha('#000000', 0.08), sw: Math.max(1, U(g, 1.5)) })
  } else if (tipo === 'scotch') {
    const a = T.P(0, wid * 0.3), b = T.P(len, wid * 0.3)
    put(g, { kind: 'line', name: 'nastro_riflesso', x1: a[0], y1: a[1], x2: b[0], y2: b[1], color: alpha('#ffffff', 0.6), width: U(g, 3) })
  }
}

/* ── timbri ───────────────────────────────────────────────────────────── */
export type Timbro = 'rettangolo' | 'doppio' | 'tondo' | 'etichetta'
/**
 * Timbro a inchiostro, ruotato, in sovrastampa, con l'inchiostro consumato
 * (dettaglio curato o realistico). Decorativo: non porta contenuto.
 */
export function timbro(g: G, text: string, cx: number, cy: number, deg: number, color: string, size: number, tipo?: Timbro) {
  const tp = tipo ?? sceglie(g, `timbro|${text}`, ['rettangolo', 'doppio', 'tondo', 'etichetta'] as const)
  const f: FontSpec = g.s.label
  const t = text.toUpperCase()
  const usura: FxSpec[] | undefined = dettaglio(g) >= 1 ? [{ id: 'grunge', variant: dettaglio(g) === 2 ? 'rovinata' : 'timbro' }] : undefined
  const look = { blend: (lum(g.P.bg) < 0.2 ? 'screen' : 'multiply') as GlobalCompositeOperation, opacity: 0.88 }
  if (tp === 'tondo') {
    const r = Math.max(size * 2.6, lineWidth(t, f, size * 0.62, 0.12) / 2 + size * 0.9)
    put(g, { kind: 'circle', name: 'timbro', cx, cy, r, fill: 'transparent', stroke: color, sw: size * 0.12, ...look, fx: usura })
    put(g, { kind: 'circle', name: 'timbro', cx, cy, r: r * 0.8, fill: 'transparent', stroke: color, sw: size * 0.06, ...look, fx: usura })
    put(g, { kind: 'arcText', name: 'timbro_giro', cx, cy, r: r * 0.9, text: `${t} ✦ ${t} ✦ `, font: f, size: size * 0.42, color, full: true, tracking: 0.1, ...look })
    const s2 = Math.min(size * 0.9, (r * 1.3) / Math.max(1, lineWidth('★', f, 1)))
    txt(g, { name: 'timbro_testo', lines: ['★'], font: f, size: s2, x: cx - lineWidth('★', f, s2) / 2, y: cy - s2 * 0.6, color, deco: true, ...look })
    return
  }
  const tw = lineWidth(t, f, size, 0.16), pad = size * 0.55
  const w = tw + 2 * pad, h = size * 1.13 + 2 * pad * 0.8
  const a = rad(deg)
  const x = cx - (w / 2) * Math.cos(a) + (h / 2) * Math.sin(a), y = cy - (w / 2) * Math.sin(a) - (h / 2) * Math.cos(a)
  const at = (lx: number, ly: number): Pt => [x + lx * Math.cos(a) - ly * Math.sin(a), y + lx * Math.sin(a) + ly * Math.cos(a)]
  if (tp === 'etichetta') {
    put(g, { kind: 'rect', name: 'timbro', x, y, w, h, fill: color, angle: deg, ...look, fx: usura })
    const [tx, ty] = at(pad, pad * 0.8)
    txt(g, { name: 'timbro_testo', lines: [t], font: f, size, x: tx, y: ty, color: g.P.bg, tracking: 0.16, angle: deg, deco: true })
    return
  }
  put(g, { kind: 'rect', name: 'timbro', x, y, w, h, fill: 'transparent', stroke: color, sw: size * 0.12, angle: deg, r: size * 0.15, ...look, fx: usura })
  if (tp === 'doppio') { const [ix, iy] = at(size * 0.22, size * 0.22); put(g, { kind: 'rect', name: 'timbro', x: ix, y: iy, w: w - size * 0.44, h: h - size * 0.44, fill: 'transparent', stroke: color, sw: size * 0.05, angle: deg, ...look }) }
  const [tx, ty] = at(pad, pad * 0.8)
  txt(g, { name: 'timbro_testo', lines: [t], font: f, size, x: tx, y: ty, color, tracking: 0.16, angle: deg, deco: true, ...look, fx: usura })
}

/* ── contatori ────────────────────────────────────────────────────────── */
export type Contatore = 'palette' | 'rullo' | 'tacche'
/**
 * Un numero come oggetto: palette a sportello, rullo da contachilometri o
 * tacche (per i numeri piccoli). Le cifre sono testi veri (`name`), le celle
 * fondi pieni; i riflessi stanno in veli in fusione. Restituisce la larghezza.
 */
export function contatore(g: G, name: string, valore: string, x: number, y: number, h: number, tipo: Contatore, o: { cella?: string; cifra?: string; font?: FontSpec } = {}) {
  const font = o.font ?? g.s.display
  const cella = o.cella ?? darker(g.P.fg, g.P.bg)
  const cifra = o.cifra ?? readable(cella, ['#ffffff', g.P.bg, g.P.fg, '#111111'], 4.5)
  const n = parseInt(valore.replace(/\D/g, ''), 10)
  if (tipo === 'tacche' && isFinite(n) && n > 0 && n <= 30) {
    // gruppi da cinque: quattro aste e la barra
    const passo = h * 0.22, gruppo = passo * 5.4
    let d = '', gx = x
    for (let i = 0; i < n; i += 5) {
      const k = Math.min(5, n - i)
      for (let j = 0; j < Math.min(4, k); j++) d += `M ${f1(gx + j * passo)} ${f1(y + h * 0.05)} L ${f1(gx + j * passo + passo * 0.15)} ${f1(y + h * 0.95)} `
      if (k === 5) d += `M ${f1(gx - passo * 0.5)} ${f1(y + h * 0.7)} L ${f1(gx + passo * 3.6)} ${f1(y + h * 0.3)} `
      gx += gruppo
    }
    put(g, { kind: 'path', name: `${name}_tacche`, d, fill: 'transparent', stroke: o.cifra ?? g.P.fg, sw: Math.max(3, h * 0.07) })
    // il numero scritto accanto, piccolo: il contenuto resta leggibile
    const s = h * 0.45
    txt(g, { name, lines: [valore], font, size: s, x: gx + passo, y: y + (h - s * 1.13) / 2, color: o.cifra ?? g.P.fg, leading: 1.13 })
    return gx + passo + lineWidth(valore, font, s) - x
  }
  const s = h * 0.72
  const cw = Math.max(...[...'0123456789'].map(ch => lineWidth(ch, font, s))) * 1.25
  const gap = h * 0.06
  let cx = x
  const celle: Box[] = []
  for (const ch of valore) {
    const w = /\d/.test(ch) ? cw : lineWidth(ch, font, s) + gap * 2
    if (/\d/.test(ch)) {
      put(g, { kind: 'rect', name: `${name}_cella`, x: cx, y, w, h, r: h * 0.06, fill: cella })
      celle.push({ x: cx, y, w, h })
    }
    cx += w + gap
  }
  for (const b of celle) {
    if (tipo === 'palette') put(g, { kind: 'line', name: `${name}_taglio`, x1: b.x, y1: b.y + h / 2, x2: b.x + b.w, y2: b.y + h / 2, color: alpha('#000000', 0.55), width: Math.max(2, h * 0.025) })
    else {
      // rullo: ombra in alto e in basso (il cilindro), un velo in fusione
      put(g, { kind: 'rect', name: `${name}_rullo`, x: b.x, y: b.y, w: b.w, h: h * 0.28, fill: { from: alpha('#000000', 0.55), to: alpha('#000000', 0), fromAt: 0, toAt: 1, vertical: true }, blend: 'multiply', opacity: 0.9 })
      put(g, { kind: 'rect', name: `${name}_rullo`, x: b.x, y: b.y + h * 0.72, w: b.w, h: h * 0.28, fill: { from: alpha('#000000', 0), to: alpha('#000000', 0.55), fromAt: 0, toAt: 1, vertical: true }, blend: 'multiply', opacity: 0.9 })
    }
  }
  // le cifre: un testo per riga, con la spaziatura che le mette nelle celle
  let tx = x
  const lines: string[] = []
  for (const ch of valore) lines.push(ch)
  for (const ch of lines) {
    const w = /\d/.test(ch) ? cw : lineWidth(ch, font, s) + gap * 2
    const lw = lineWidth(ch, font, s)
    txt(g, { name: `${name}#${tx.toFixed(0)}`, lines: [ch], font, size: s, x: tx + (w - lw) / 2, y: y + (h - s * 1.13) / 2 + h * 0.02, color: /\d/.test(ch) ? cifra : (o.cifra ?? g.P.fg), leading: 1.13 })
    tx += w + gap
  }
  return cx - gap - x
}
/** Larghezza di un contatore prima di disegnarlo. */
export function largoContatore(g: G, valore: string, h: number, font: FontSpec = g.s.display) {
  const s = h * 0.72, gap = h * 0.06
  const cw = Math.max(...[...'0123456789'].map(ch => lineWidth(ch, font, s))) * 1.25
  return [...valore].reduce((a, ch) => a + (/\d/.test(ch) ? cw : lineWidth(ch, font, s) + gap * 2) + gap, -gap)
}

/* ── barrette ─────────────────────────────────────────────────────────── */
export type Codice = 'barre' | 'ean' | 'qr'
/** Codice decorativo in un riquadro ruotato: barre semplici, EAN con le cifre, QR. */
export function codice(g: G, T: Telaio, b: Box, tipo: Codice, ink: string) {
  let n = g.k.seme
  const rnd = () => { n = (n * 1103515245 + 12345) & 0x7fffffff; return (n >> 8) / 8388608 }
  let d = ''
  if (tipo === 'qr') {
    const q = Math.min(b.w, b.h), cells = 21, s = q / cells
    const ox = b.x + (b.w - q) / 2
    const finder = (i: number, j: number) => (i < 7 && j < 7) || (i >= cells - 7 && j < 7) || (i < 7 && j >= cells - 7)
    for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
      let on = rnd() > 0.52
      if (finder(i, j)) { const fi = i < 7 ? i : i - (cells - 7), fj = j < 7 ? j : j - (cells - 7); on = fi === 0 || fi === 6 || fj === 0 || fj === 6 || (fi >= 2 && fi <= 4 && fj >= 2 && fj <= 4) }
      if (on) d += poly([T.P(ox + i * s, b.y + j * s), T.P(ox + (i + 1) * s, b.y + j * s), T.P(ox + (i + 1) * s, b.y + (j + 1) * s), T.P(ox + i * s, b.y + (j + 1) * s)]) + ' '
    }
    put(g, { kind: 'path', name: 'codice', d, fill: ink })
    return
  }
  const hb = tipo === 'ean' ? b.h * 0.78 : b.h
  let x = b.x
  while (x < b.x + b.w) { const w = U(g, 2 + Math.floor(rnd() * 4) * 1.6); const lungo = tipo === 'ean' && (x - b.x < b.w * 0.04 || Math.abs(x - b.x - b.w / 2) < b.w * 0.03 || x - b.x > b.w * 0.95); const hh = lungo ? b.h : hb; d += poly([T.P(x, b.y), T.P(x + w, b.y), T.P(x + w, b.y + hh), T.P(x, b.y + hh)]) + ' '; x += w + U(g, 3 + Math.floor(rnd() * 3) * 2) }
  put(g, { kind: 'path', name: 'codice', d, fill: ink })
  if (tipo === 'ean') {
    const digits = Array.from({ length: 13 }, () => Math.floor(rnd() * 10)).join('')
    const s = b.h * 0.2
    const [tx, ty] = T.P(b.x + b.w * 0.06, b.y + hb + s * 0.05)
    txt(g, { name: 'codice_cifre', lines: [`${digits[0]} ${digits.slice(1, 7)} ${digits.slice(7)}`], font: g.s.label, size: s, x: tx, y: ty, color: ink, tracking: 0.3, angle: T.deg || undefined, deco: true })
  }
}
export type Avanzamento = 'blocchi' | 'liscia' | 'righe'
/** Barra d'avanzamento (o di valore) in tre maniere. */
export function barra(g: G, name: string, b: Box, q: number, tipo: Avanzamento, pieno: string, vuoto: string) {
  const r = tipo === 'liscia' ? b.h / 2 : 0
  if (tipo === 'blocchi') {
    const nb = Math.max(8, Math.round(b.w / (b.h * 1.1))), w = b.w / nb
    for (let i = 0; i < nb; i++) put(g, { kind: 'rect', name: i / nb < q ? name : `${name}_vuoto`, x: b.x + i * w, y: b.y, w: w - Math.max(2, b.h * 0.12), h: b.h, fill: i / nb < q ? pieno : vuoto })
    return
  }
  put(g, { kind: 'rect', name: `${name}_binario`, ...b, r, fill: vuoto })
  put(g, { kind: 'rect', name, x: b.x, y: b.y, w: Math.max(b.h, b.w * q), h: b.h, r, fill: pieno })
  if (tipo === 'righe') {
    let d = ''
    const w = Math.max(b.h, b.w * q)
    for (let x = -b.h; x < w; x += b.h * 0.9) { const x1 = Math.max(0, x), y1 = x < 0 ? -x : 0, x2 = Math.min(w, x + b.h), y2 = x + b.h > w ? b.h - (x + b.h - w) : b.h; d += `M ${f1(b.x + x1)} ${f1(b.y + b.h - y1)} L ${f1(b.x + x2)} ${f1(b.y + b.h - y2)} ` }
    put(g, { kind: 'path', name: `${name}_righe`, d, fill: 'transparent', stroke: alpha('#ffffff', 0.35), sw: Math.max(2, b.h * 0.22) })
  }
}

/* ── strato generativo ────────────────────────────────────────────────── */
/**
 * A volte (non sempre) uno strato generativo sotto la composizione: un
 * ornamento del laboratorio adatto allo stile, un riempimento generativo in
 * una forma morbida, un campo di segni. Si sceglie dal seme; la probabilità
 * cresce con l'energia e la densità. Sta nella zona più libera della tavola,
 * con un'opacità tarata sul fondo perché i testi restino leggibili.
 * `zone`: riquadri liberi candidati (se mancano, i margini della tavola).
 */
export function stratoGenerativo(g: G, zone: Box[] = [], o: { probabilita?: number; at?: number } = {}) {
  const p = o.probabilita ?? 0.25 + 0.25 * g.k.energia + 0.15 * g.k.densita
  if ((hashText(`${g.k.seme}|strato`) % 1000) / 1000 >= p) return false
  const testi = g.els.filter(e => e.kind === 'text' && !e.deco).map(e => textBox(e as Extract<SceneEl, { kind: 'text' }>))
  const libera = (b: Box) => 1 - testi.reduce((a, t) => a + Math.max(0, Math.min(b.x + b.w, t.x + t.w) - Math.max(b.x, t.x)) * Math.max(0, Math.min(b.y + b.h, t.y + t.h) - Math.max(b.y, t.y)), 0) / Math.max(1, b.w * b.h)
  const cand = (zone.length ? zone : [
    { x: 0, y: g.H * 0.55, w: g.W, h: g.H * 0.45 }, { x: 0, y: 0, w: g.W, h: g.H * 0.45 }, { x: g.W * 0.5, y: 0, w: g.W * 0.5, h: g.H }, { x: 0, y: 0, w: g.W * 0.5, h: g.H },
  ]).map(b => ({ b, l: libera(b) })).sort((a, b) => b.l - a.l)
  const tipo = sceglie(g, 'strato|tipo', ['ornamento', 'ornamento', 'riempimento', 'segni'] as const)
  // un ornamento deve toccare il contenuto (altrimenti è un riempitivo isolato): zona libera ma non vuota
  const z = (tipo === 'ornamento' ? cand.find(c => c.l >= 0.55 && c.l < 0.999) : undefined) ?? cand[0]
  if (!z || z.l < 0.55) return false
  const sottile = z.l < 0.95
  const scuro = lum(g.P.bg) < 0.2
  const at = o.at ?? g.els.length
  const metti = (el: SceneEl) => { g.els.splice(at, 0, el) }
  if (tipo === 'ornamento' && g.s.decor.ornaments.length) {
    const id = sceglie(g, 'strato|orn', g.s.decor.ornaments)
    metti({ kind: 'ornament', name: 'strato', id, x: z.b.x, y: z.b.y, w: z.b.w, h: z.b.h, seed: g.k.seme, opacity: sottile ? 0.2 : 0.55, under: sottile })
  } else if (tipo === 'riempimento' || tipo === 'ornamento') {
    // una macchia morbida riempita dal generatore, al vivo nel bordo della zona
    const R = Math.min(z.b.w, z.b.h) * 0.55
    const cx = z.b.x + z.b.w * (sceglie(g, 'strato|x', [0.15, 0.5, 0.85])), cy = z.b.y + z.b.h * (sceglie(g, 'strato|y', [0.3, 0.7]))
    metti({ kind: 'circle', name: 'strato', cx, cy, r: R, fill: g.P.acc, blend: scuro ? 'screen' : 'multiply', opacity: sottile ? 0.22 : 0.5, fx: [{ id: 'genFill', p: { mode: sceglie(g, 'strato|modo', [0, 1, 3, 4]), c1: g.P.acc, c2: g.P.acc2 === g.P.bg ? g.P.fg : g.P.acc2, c3: g.P.srf, c4: darker(g.P.bg, g.P.fg), grain: 30, warp: 60, scale: 120 } }] })
  } else {
    // segni: un campo di trattini orientati come un flusso, nell'inchiostro tenue
    let d = ''
    const step = U(g, 34), L = step * 0.42
    const f = (x: number, y: number) => Math.sin(x / (g.W * 0.18) + g.k.seme) + Math.cos(y / (g.H * 0.21))
    for (let y = z.b.y + step / 2; y < z.b.y + z.b.h; y += step) for (let x = z.b.x + step / 2; x < z.b.x + z.b.w; x += step) {
      const a = f(x, y)
      d += `M ${f1(x - Math.cos(a) * L)} ${f1(y - Math.sin(a) * L)} L ${f1(x + Math.cos(a) * L)} ${f1(y + Math.sin(a) * L)} `
    }
    const ink = readable(g.P.bg, [g.P.acc, g.P.fg], 1.6)
    metti({ kind: 'path', name: 'strato', d, fill: 'transparent', stroke: ink, sw: Math.max(1.5, U(g, 2.5)), opacity: sottile ? 0.18 : 0.45, blend: scuro ? 'screen' : 'multiply' })
  }
  return true
}
