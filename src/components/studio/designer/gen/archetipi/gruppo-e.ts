/**
 * Archetipi del gruppo E · elenchi e oggetti. Impaginazioni nate per le voci
 * (consigli, menu, dati, programma, passi, tappe, domande) che valgono anche
 * per le copertine, dove le righe sono i dettagli. Ogni elenco ha la sua
 * materia: lo scontrino, la lavagna, il tabellone delle partenze, i foglietti
 * adesivi, l'infografica. Le righe arrivano da ./voci.ts, già normalizzate.
 *
 * Regola comune: i testi stanno sempre su un fondo pieno (carta, lavagna,
 * palette, foglietto); foto e trame vivono attorno. Ogni impaginazione prova
 * più scale e tiene la più grande che entra: l'elenco riempie la tavola.
 * Le righe si chiamano voce_i, valore_i, testo_i (il critico le riconosce).
 */
import type { FontSpec, Scene } from '../../types'
import {
  type G, put, U, txt, lab, para, display, putLab, putPara, putDisplay, photo, finish, discard,
  ctaText, mix, alpha, readable, contrast, darker, lighter,
} from '../tools'
import { fit, lineWidth, type Fit } from '../../text'
import { wobblyPath, starPath, scribbleEllipse } from '../forme'
import { type Riga, righe, conVoci, valoreProtagonista, elencoRiuscito } from './voci'
import { riga1 } from './comune'
import { ricetta } from '../mattoni'
import {
  carta as foglioCarta, cartaPer, nastro, nastroPer, contatore, largoContatore, barra, sceglie, dettaglio, stratoGenerativo,
  type Avanzamento, type Contatore,
} from '../materia'

type Sistema = (g: G) => Scene | null
type Box = { x: number; y: number; w: number; h: number }
type Pt = [number, number]

/* ── attrezzi comuni ──────────────────────────────────────────────────── */
const f1 = (n: number) => n.toFixed(1)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const no = (g: G, why: string): null => { discard(g, why); return null }
const variante = (g: G, n: number) => (Math.abs(g.k.seme) >> 3) % n
const MONO = /Mono|Code|Courier/i
const mono = (g: G): FontSpec => [g.s.label, g.s.text].find(f => MONO.test(f.family)) ?? g.s.label
const inkSu = (g: G, bg: string, min = 4.5) => readable(bg, [g.P.fg, g.P.bg, '#111111', '#ffffff'], min)
const accSu = (g: G, bg: string, min = 3.4) => readable(bg, [g.P.acc, g.P.acc2, inkSu(g, bg)], min)
const scuro = (g: G) => darker(g.P.fg, g.P.bg)
const acc2 = (g: G) => (g.P.acc2 === g.P.bg ? g.P.fg : g.P.acc2)
/** Scale da provare, dalla più generosa: si tiene la prima con cui l'elenco entra. */
const SCALE = [1.75, 1.55, 1.38, 1.22, 1.1, 1, 0.9]
/** Distanza tra due testi di gruppi diversi (sopra la soglia del controllo). */
const STACCO = 12

const scrivi = (g: G, name: string, f: Fit, font: FontSpec, x: number, y: number, color: string, o: { align?: 'left' | 'center' | 'right'; w?: number; angle?: number; deco?: boolean; opacity?: number } = {}) =>
  txt(g, { name, lines: f.lines, font, size: f.size, x, y, color, align: o.align ?? 'left', w: o.w ?? f.w, leading: f.leading ?? 1.22, tracking: f.tracking ?? 0.04, angle: o.angle || undefined, deco: o.deco, opacity: o.opacity })
const poly = (pts: Pt[]) => 'M ' + pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join(' L ') + ' Z'
/** Numero dal valore scritto ("12.400", "3,5", "38%"). */
function numeroDa(v?: string) {
  if (!v) return NaN
  const s = v.replace(/\s/g, '').replace(/[^\d.,-]/g, '')
  const it = /\.\d{3}(\D|$)/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.')
  return parseFloat(it)
}

/* ═══ Scontrino ═════════════════════════════════════════════════════════ */
/**
 * Uno scontrino di cassa, ora ricetta di mattoni (gen/mattoni/scontrino.ts):
 * il banco (carta a dente di sega con voci, totale in negativo, codice), il
 * titolo in cassa o fuori, la foto sotto, timbro, cerchiato, freccia, quadretti.
 */
export const scontrino = (g: G): Scene | null => ricetta(g, 'scontrino')

/* ═══ Lavagna ═══════════════════════════════════════════════════════════ */
/**
 * La lavagna di una trattoria o di un bar: ardesia scura, cornice di legno,
 * il titolo in gesso con una sottolineatura a mano, l'occhiello scritto di
 * traverso, le voci con stelline o numeri cerchiati, prezzi e ore in un gesso
 * colorato; nello spazio che resta la foto ridisegnata a gesso. Varianti:
 * 0 lavagna a tutta tavola, 1 cavalletto davanti alla foto, 2 lavagna appesa
 * al muro (con la foto accanto nei formati larghi).
 */
export function lavagna(g: G): Scene | null {
  const { W, H, m, T, B, P, k, s, c } = g
  const rs = righe(g, { max: 6, dettagli: true })
  if (!rs) return null
  const v = variante(g, 3) === 1 && !g.photo ? 0 : variante(g, 3)
  const ardesia = mix(scuro(g), '#1e2a25', P.dark ? 0.35 : 0.6)
  const gesso = '#f3f0e6'
  const gessoC = readable(ardesia, [P.acc, acc2(g), '#f2c14e'], 4)
  const legno = mix('#7a4e2d', P.acc, 0.2)
  const fr = U(g, v === 1 ? 26 : 34)
  let L: Box
  if (v === 1) {
    const lw = Math.min(W * (g.landscape ? 0.5 : 0.84), W - 2 * m)
    L = { x: g.landscape ? W - m - lw : (W - lw) / 2, y: T - U(g, 20), w: lw, h: (B - T) * (g.landscape ? 1 : 0.86) + U(g, 20) }
  } else if (v === 2) {
    const lw = g.landscape ? W * 0.6 : W - 2 * m
    L = { x: m, y: T - U(g, 10), w: lw, h: B - T + U(g, 20) }
  } else L = { x: m * 0.5, y: Math.max(m * 0.5, T - U(g, 30)), w: W - m, h: Math.min(H - m * 0.5, B + U(g, 30)) - Math.max(m * 0.5, T - U(g, 30)) }
  const I = { x: L.x + fr, y: L.y + fr, w: L.w - 2 * fr, h: L.h - 2 * fr }
  const pad = U(g, g.landscape ? 40 : 50)
  const iw = I.w - 2 * pad
  const segnoW = U(g, 64)
  const rowGap = U(g, 26)
  const kick = lab(g, c.kicker, iw * 0.7, 22)
  function costruisci(f: number) {
    const br = lab(g, c.brand, iw * 0.7, 20 * Math.min(f, 1.3))
    const t = display(g, c.title, iw, I.h * 0.3, (110 + 50 * k.scala) * f, 44, 3)
    if (!t) return null
    const nsz = (rs!.length > 4 ? 36 : 42) * f
    const rowsF = rs!.map(r => {
      const vf = r.valore ? display(g, r.valore, iw * 0.34, nsz * 2 * g.u, nsz, 30, 1) : null
      const nf = fit({ text: r.nome, font: s.display, maxW: iw - segnoW - (vf ? vf.w + U(g, 40) : 0), maxSize: nsz * g.u, minSize: Math.max(24 * g.u, g.sc.minLettura), maxLines: 2, leading: 1.1, tracking: 0, balance: true })
      const tf = r.testo ? para(g, r.testo, iw - segnoW, 2, 24 * Math.min(f, 1.25)) : null
      return { vf, nf, tf, ok: !!nf && (!r.valore || !!vf) }
    })
    if (rowsF.some(x => !x.ok)) return null
    const rowsH = rowsF.reduce((a, x) => a + x.nf!.h + (x.tf ? x.tf.h + U(g, STACCO) : 0), 0) + rowGap * (rowsF.length - 1)
    const cta = lab(g, ctaText(c), iw, 22 * Math.min(f, 1.3))
    const total = (br ? br.h + U(g, 20) : 0) + (kick ? kick.h + U(g, 32) + kick.w * Math.sin((4 + 4 * k.energia) * Math.PI / 180) : 0) + t.h + U(g, 46) + rowsH + (cta ? U(g, 40) + cta.h : 0)
    return { br, t, rowsF, cta, total }
  }
  let mis: NonNullable<ReturnType<typeof costruisci>> | null = null
  for (const f of SCALE) { const x = costruisci(f); if (x && x.total <= I.h - 2 * pad) { mis = x; break } }
  if (!mis) return no(g, 'lavagna troppo piena')
  const { br, t, rowsF, cta, total } = mis
  // fondo dietro la lavagna
  if (v === 1 && g.photo) photo(g, 'foto', { x: 0, y: 0, w: W, h: H })
  else if (v === 2) put(g, { kind: 'rect', name: 'muro', x: 0, y: 0, w: W, h: H, fill: mix(P.bg, legno, 0.1) })
  if (v === 1) {
    const leg = U(g, 30), y0 = L.y + L.h - 4, yb = H
    put(g, { kind: 'path', name: 'gambe', d: poly([[L.x + L.w * 0.12, y0], [L.x + L.w * 0.12 + leg, y0], [L.x + L.w * 0.06 + leg, yb], [L.x + L.w * 0.06, yb]]) + ' ' + poly([[L.x + L.w * 0.88 - leg, y0], [L.x + L.w * 0.88, y0], [L.x + L.w * 0.94, yb], [L.x + L.w * 0.94 - leg, yb]]), fill: mix(legno, '#000000', 0.25) })
  }
  put(g, { kind: 'rect', name: 'ombra', x: L.x + U(g, 10), y: L.y + U(g, 14), w: L.w, h: L.h, fill: alpha('#000000', 0.3) })
  put(g, { kind: 'rect', name: 'cornice', ...L, fill: legno, r: U(g, 6), fx: dettaglio(g) ? [{ id: 'textureOverlay', variant: 'tela', p: { opacity: 45 } }] : undefined })
  let dv = ''
  for (let i = 0; i < 4; i++) { const yy = L.y + fr * (0.25 + i * 0.17); dv += `M ${f1(L.x + U(g, 10))} ${f1(yy)} L ${f1(L.x + L.w - U(g, 10))} ${f1(yy + (i % 2 ? 2 : -2))} ` }
  put(g, { kind: 'path', name: 'venature', d: dv, fill: 'transparent', stroke: alpha('#000000', 0.18), sw: Math.max(1, U(g, 2)) })
  put(g, { kind: 'rect', name: 'ardesia', ...I, fill: ardesia })
  // la polvere di gesso: una trama in fusione (fuori dal controllo di leggibilità)
  if (dettaglio(g)) put(g, { kind: 'rect', name: 'polvere_gesso', ...I, fill: ardesia, blend: 'screen', opacity: 0.8, fx: [{ id: 'textureOverlay', variant: sceglie(g, 'ardesia', ['graffi', 'cemento', 'grana']), p: { opacity: 50 } }] })
  // contenuti: lo spazio che avanza va per metà tra le righe e per metà al disegno in fondo
  const libero = I.h - 2 * pad - total
  const disegno = (g.photo && v !== 1 && libero > I.h * 0.2) ? libero - U(g, 30) : 0
  const extra = disegno ? 0 : Math.min(libero * 0.7 / Math.max(1, rowsF.length), U(g, 90))
  let y = I.y + pad + (disegno ? 0 : Math.max(0, (libero - extra * rowsF.length) * 0.4))
  const x = I.x + pad
  if (br) { putLab(g, 'brand', br, x, y, gesso, 'center', iw); y += br.h + U(g, 20) }
  if (kick) {
    // l'occhiello scritto di traverso, come un'aggiunta a gesso
    const ang = -4 - 4 * k.energia
    const sale = kick.w * Math.sin(-ang * Math.PI / 180)
    putLab(g, 'occhiello', kick, x + (iw - kick.w) / 2, y + sale + U(g, 6), gessoC, 'left', kick.w, { angle: ang })
    y += kick.h + U(g, 26) + sale
  }
  putDisplay(g, 'titolo', t, x, y, gesso, 'center', iw, { su: ardesia })
  y += t.h + U(g, 14)
  const uw = Math.min(iw, t.w * 0.8)
  put(g, { kind: 'path', name: 'segno_gesso', d: wobblyPath(g.r, x + (iw - uw) / 2, y, x + (iw + uw) / 2, y + U(g, 4), U(g, 4)), fill: 'transparent', stroke: gessoC, sw: U(g, 5) })
  y += U(g, 32)
  const stella = s.forma === 'morbido' || s.registro === 'infantile' || s.registro === 'pop'
  rowsF.forEach(({ vf, nf, tf }, i) => {
    const nx = x + segnoW
    const cy = y + nf!.size * 0.55
    if (stella) put(g, { kind: 'path', name: 'stellina', d: starPath(x + U(g, 22), cy, U(g, 16), 5, 0.45), fill: gessoC })
    else {
      const ns = U(g, 28), nt = String(i + 1)
      txt(g, { name: `numero_${i}`, lines: [nt], font: s.display, size: ns, x: x - U(g, 4), y: cy - ns * 0.58, w: U(g, 52), align: 'center', color: gessoC, leading: 1.13 })
      put(g, { kind: 'path', name: 'cerchiato', d: scribbleEllipse(g.r, { x: x - U(g, 4), y: cy - U(g, 27), w: U(g, 52), h: U(g, 52) }), fill: 'transparent', stroke: gessoC, sw: U(g, 3) })
    }
    txt(g, { name: `voce_${i}`, lines: nf!.lines, font: s.display, size: nf!.size, x: nx, y, color: gesso, leading: 1.1, tracking: 0 })
    if (vf) putDisplay(g, `valore_${i}`, vf, x, y, gessoC, 'right', iw)
    let yy = y + nf!.h
    if (tf) { yy += U(g, STACCO); putPara(g, `testo_${i}`, tf, nx, yy, '#d9d5c8'); yy += tf.h }
    y = yy + rowGap + extra
  })
  if (cta) { y += U(g, 16); putLab(g, 'invito', cta, x, y, gessoC, 'center', iw); y += cta.h }
  // la foto ridisegnata a gesso nello spazio che resta
  if (disegno) {
    const dh = Math.min(disegno, I.y + I.h - pad - (y + U(g, 30)))
    if (dh > I.h * 0.16) {
      const dw = Math.min(iw, dh * 1.5)
      photo(g, 'foto', { x: x + (iw - dw) / 2, y: I.y + I.h - pad - dh, w: dw, h: dh }, { fx: [{ id: 'dither', p: { dark: ardesia, light: gesso, size: 3, levels4: 0, pattern: 1 } }], look: undefined, adjust: undefined })
    }
  }
  stratoGenerativo(g, [I], { at: g.els.findIndex(e => e.name === 'ardesia') + 1, probabilita: disegno ? 0 : 0.6 })
  if (v === 2 && g.photo && g.landscape) {
    const px = L.x + L.w + U(g, 50), pwid = W - m - px
    if (pwid > W * 0.18) {
      const ph = Math.min(B - T, pwid * 1.25)
      put(g, { kind: 'rect', name: 'cornice_foto', x: px - U(g, 14), y: T + (B - T - ph) / 2 - U(g, 14), w: pwid + U(g, 28), h: ph + U(g, 28), fill: legno })
      photo(g, 'foto', { x: px, y: T + (B - T - ph) / 2, w: pwid, h: ph })
    }
  }
  return finish(g, 'lavagna', 'Lavagna', { specchio: false })
}

/* ═══ Tabellone ═════════════════════════════════════════════════════════ */
/**
 * Il tabellone delle partenze di una stazione: una fascia d'intestazione al
 * vivo nell'accento, palette a sportello con la riga di taglio a metà, il
 * titolo una parola per paletta, una colonna per l'ora (o il numero, il
 * prezzo) e una per la voce, il binario gigante in sovrastampa. Varianti:
 * 0 tabellone a tutta tavola, 1 appeso davanti alla foto, 2 palette
 * nell'accento su un quadro chiaro.
 */
export function tabellone(g: G): Scene | null {
  const { W, H, m, T, B, P, k, c } = g
  const rs = righe(g, { max: 7, dettagli: true })
  if (!rs || !rs.length) return no(g, 'senza righe')
  const v = variante(g, 3) === 1 && !g.photo ? 0 : variante(g, 3)
  const font = mono(g)
  const quadro = v === 2 ? lighter(P.bg, P.fg) : mix(scuro(g), '#000000', 0.35)
  const paletta = v === 2 ? readable(quadro, [P.acc, acc2(g), scuro(g)], 2) : mix(quadro, '#3a3a3a', 0.55)
  const cifre = v === 2 ? inkSu(g, paletta, 4.5) : readable(paletta, ['#f5d547', P.acc, '#ffffff'], 4.5)
  const chiare = inkSu(g, paletta, 7)
  const etich = readable(quadro, [v === 2 ? scuro(g) : cifre, '#ffffff', '#111111'], 4.5)
  const fascia = readable(quadro, [P.acc, acc2(g), cifre], 1.8)
  const suFascia = inkSu(g, fascia, 4.5)
  const Q: Box = v === 1 ? { x: m * 0.5, y: T - U(g, 10), w: W - m, h: (B - T) * (g.portrait ? 0.76 : 0.94) } : { x: 0, y: 0, w: W, h: H }
  const inset = v === 1 ? U(g, 36) : 0
  const x0 = Q.x + (v === 1 ? inset : m), x1 = Q.x + Q.w - (v === 1 ? inset : m)
  const w0 = x1 - x0
  // fascia d'intestazione: occhiello a sinistra, brand a destra
  const head = riga1(g, c.kicker || 'Partenze', font, w0 * 0.5, 22, 16, { tracking: 0.16 })
  const brand = c.brand ? riga1(g, c.brand, font, w0 * 0.42, 22, 16, { tracking: 0.16 }) : null
  if (c.brand && !brand) return no(g, 'brand')
  const fPad = U(g, 22)
  const fH = Math.max(head?.h ?? 0, brand?.h ?? 0) + 2 * fPad
  const fY = v === 1 ? Q.y : Math.max(0, T - fPad)
  const top = fY + fH + U(g, 34)
  const bottom = v === 1 ? Q.y + Q.h - inset : B
  const conVal = rs.some(r => r.valore)
  const rowGap = U(g, 12)
  const cta = lab(g, ctaText(c), w0, 20)
  const parole = c.title.trim().toUpperCase().split(/\s+/)
  const SP = '   '
  function costruisci(f: number) {
    const pad = U(g, 16 * Math.min(f, 1.3))
    // titolo: una parola per paletta, una riga di testo per riga di palette (un solo asse)
    let tf: { size: number; lines: string[] } | null = null
    const maxT = Math.min(U(g, (110 + 50 * k.scala) * f), (bottom - top) * 0.13)
    for (let sz = maxT; sz >= Math.max(U(g, 40), g.sc.attacco); sz *= 0.94) {
      const lines: string[] = []
      let cur = ''
      for (const p of parole) { const tr = cur ? `${cur}${SP}${p}` : p; if (lineWidth(tr, g.s.display, sz, 0.02) + 2 * pad > w0 && cur) { lines.push(cur); cur = p } else cur = tr }
      lines.push(cur)
      if (lines.length <= 3 && lines.every(l => lineWidth(l, g.s.display, sz, 0.02) + 2 * pad <= w0)) { tf = { size: sz, lines }; break }
    }
    if (!tf) return null
    const cellH = tf.size * 1.13 + 2 * U(g, 16)
    const titH = tf.lines.length * cellH + (tf.lines.length - 1) * U(g, 10)
    const rsz = (rs!.length > 5 ? 26 : 30) * f
    const colV = Math.max(...rs!.map(r => lineWidth((r.valore ?? r.n).toUpperCase(), font, U(g, rsz), 0.04))) + 2 * pad
    if (colV > w0 * 0.42) return null
    const nomeW = w0 - colV - U(g, 18) - 2 * pad
    const rowsF = rs!.map(r => ({ r, nf: riga1(g, r.nome, font, nomeW, rsz, 18, { tracking: 0.04, lettura: true }), tf: r.testo ? riga1(g, r.testo, g.s.text, nomeW, 22 * Math.min(f, 1.25), 18, { upper: false, tracking: 0, lines: 2, lettura: true }) : null }))
    if (rowsF.some(x => !x.nf)) return null
    const rowH = (x: typeof rowsF[number]) => x.nf!.h + 2 * pad + (x.tf ? x.tf.h + U(g, STACCO) : 0)
    const total = titH + U(g, 40) + U(g, 34) + rowsF.reduce((a, x) => a + rowH(x), 0) + rowGap * (rowsF.length - 1) + (cta ? U(g, 34) + cta.h : 0)
    return { pad, tf, cellH, titH, colV, rowsF, total }
  }
  let mis: NonNullable<ReturnType<typeof costruisci>> | null = null
  for (const f of SCALE) { const x = costruisci(f); if (x && x.total <= bottom - top) { mis = x; break } }
  if (!mis) return no(g, 'tabellone troppo pieno')
  const { pad, tf, cellH, colV, rowsF, total } = mis
  if (v === 1) {
    if (g.photo) photo(g, 'foto', { x: 0, y: 0, w: W, h: H })
    put(g, { kind: 'rect', name: 'ombra', x: Q.x + U(g, 10), y: Q.y + U(g, 14), w: Q.w, h: Q.h, fill: alpha('#000000', 0.35) })
    for (const xx of [Q.x + Q.w * 0.2, Q.x + Q.w * 0.8]) put(g, { kind: 'line', name: 'tirante', x1: xx, y1: 0, x2: xx, y2: Q.y, color: mix(scuro(g), '#000000', 0.2), width: U(g, 6) })
  }
  put(g, { kind: 'rect', name: 'quadro', ...Q, fill: quadro, r: v === 1 ? U(g, 10) : 0 })
  const sottoT = g.els.length
  // la fascia d'intestazione (al vivo sul tabellone a tutta tavola)
  put(g, { kind: 'rect', name: 'fascia', x: Q.x, y: fY, w: Q.w, h: fH, fill: fascia })
  if (head) scrivi(g, 'occhiello', head, font, x0, fY + fPad, suFascia)
  if (brand) scrivi(g, 'brand', brand, font, x0, fY + fPad, suFascia, { align: 'right', w: w0 })
  // il binario: un numero gigante a contorno, in sovrastampa nello spazio libero in basso
  const libero = bottom - top - total
  // lo spazio che avanza si divide tra le righe (fino a un tetto); il resto va al binario
  const extra = Math.min(libero * 0.5 / (rowsF.length + 1), U(g, 34))
  let y = top + Math.max(0, v === 1 ? (libero - extra * (rowsF.length + 1)) * 0.5 : extra)
  tf.lines.forEach((l, li) => {
    // una paletta per parola, sotto un solo testo per riga
    let off = 0
    for (const p of l.split(SP)) {
      const pw = lineWidth(p, g.s.display, tf.size, 0.02)
      put(g, { kind: 'rect', name: 'paletta', x: x0 + off, y, w: pw + 2 * pad, h: cellH, fill: paletta, r: U(g, 4) })
      put(g, { kind: 'line', name: 'taglio', x1: x0 + off, y1: y + cellH / 2, x2: x0 + off + pw + 2 * pad, y2: y + cellH / 2, color: alpha('#000000', 0.5), width: Math.max(2, U(g, 3)) })
      off += lineWidth(p + SP, g.s.display, tf.size, 0.02)
    }
    txt(g, { name: `titolo#${li}`, lines: [l], font: g.s.display, size: tf.size, x: x0 + pad, y: y + U(g, 16), color: li === 0 ? cifre : chiare, leading: 1.13, tracking: 0.02 })
    y += cellH + U(g, 10)
  })
  y += U(g, 30)
  const hs = U(g, 16)
  const capo = conVal ? (g.c.tipo === 'menu' ? 'prezzo' : g.c.tipo === 'dati' ? 'cifra' : g.c.tipo === 'timeline' ? 'anno' : 'ora') : 'n.'
  txt(g, { name: 'colonne', lines: [capo.toUpperCase()], font, size: hs, x: x0, y, color: etich, tracking: 0.14, deco: true, opacity: 0.7 })
  txt(g, { name: 'colonne', lines: [(g.c.tipo === 'menu' ? 'piatto' : g.c.tipo === 'programma' ? 'appuntamento' : 'voce').toUpperCase()], font, size: hs, x: x0 + colV + U(g, 18), y, color: etich, tracking: 0.14, deco: true, opacity: 0.7 })
  y += U(g, 34)
  let messe = 0, testi = 0
  rowsF.forEach((x, i) => {
    const h = x.nf!.h + 2 * pad
    put(g, { kind: 'rect', name: 'paletta', x: x0, y, w: colV, h, fill: paletta, r: U(g, 4) })
    put(g, { kind: 'line', name: 'taglio', x1: x0, y1: y + h / 2, x2: x0 + colV, y2: y + h / 2, color: alpha('#000000', 0.5), width: Math.max(2, U(g, 2)) })
    const vf = riga1(g, x.r.valore ?? x.r.n, font, colV - 2 * pad, x.nf!.size / g.u, 16, { tracking: 0.04 })
    if (vf) scrivi(g, `valore_${i}`, vf, font, x0 + pad, y + pad, cifre)
    const nx = x0 + colV + U(g, 18)
    put(g, { kind: 'rect', name: 'paletta', x: nx, y, w: x1 - nx, h, fill: paletta, r: U(g, 4) })
    put(g, { kind: 'line', name: 'taglio', x1: nx, y1: y + h / 2, x2: x1, y2: y + h / 2, color: alpha('#000000', 0.5), width: Math.max(2, U(g, 2)) })
    scrivi(g, `voce_${i}`, x.nf!, font, nx + pad, y + pad, chiare)
    messe++
    y += h
    if (x.tf) { y += U(g, STACCO); scrivi(g, `testo_${i}`, x.tf, g.s.text, nx + pad, y, etich); y += x.tf.h; testi++ }
    y += rowGap + extra
  })
  if (!elencoRiuscito(g, rs, messe, testi)) return null
  if (cta) { y += U(g, 22); putLab(g, 'invito', cta, x0, y, etich); y += cta.h }
  // binario gigante nello spazio che resta (o dietro, a destra, in sovrastampa)
  const resto = bottom - y - U(g, 20)
  const bs = Math.min(resto * 0.95, U(g, 420))
  if (bs > U(g, 140)) {
    // il binario: un contatore (rullo, palette o tacche) nello spazio libero in basso a destra
    const tipoC = sceglie<Contatore>(g, 'binario', ['rullo', 'palette', 'tacche'])
    const n = String(tipoC === 'tacche' ? 3 + (k.seme % 9) : 1 + (k.seme % 19))
    const ch = Math.min(bs * 0.7, U(g, 200))
    const bw = tipoC === 'tacche' ? ch * 1.6 : largoContatore(g, n, ch, g.s.impact)
    contatore(g, 'numero_binario', n, x1 - bw, bottom - ch, ch, tipoC, { cella: paletta, cifra: cifre, font: g.s.impact })
    const lb = riga1(g, 'binario', font, x1 - bw - U(g, 70) - x0, 20, 14, { tracking: 0.16 })
    if (lb) scrivi(g, 'binario_etichetta', lb, font, x1 - bw - U(g, 30) - lb.w, bottom - lb.h, etich, { deco: true })
  }
  if (v !== 1) stratoGenerativo(g, [{ x: Q.x, y, w: Q.w, h: Math.max(0, bottom - y) }], { at: sottoT, probabilita: 0.3 })
  return finish(g, 'tabellone', 'Tabellone', { specchio: false })
}

/* ═══ Foglietti ═════════════════════════════════════════════════════════ */
/**
 * Foglietti adesivi attaccati a una bacheca: uno per voce, ruotati, con nastro
 * o puntina e l'ombra; numero grande, nome e spiegazione. Il titolo sul fondo
 * con l'occhiello cerchiato a pennarello e una freccia verso i foglietti.
 * Varianti: 0 griglia, 1 a scacchiera sfalsata, 2 colonna di foglietti larghi.
 */
export function foglietti(g: G): Scene | null {
  const sc = fogliettiCon(g, g.landscape)
  if (sc || g.landscape || g.format !== 'quadrato') return sc
  // nel quadrato i foglietti sotto il titolo restano bassi: il titolo va a sinistra
  g.els = []; g.letture = []
  return fogliettiCon(g, true)
}
function fogliettiCon(g: G, side: boolean): Scene | null {
  const { W, H, m, T, B, P, k, s, c } = g
  const rs = righe(g, { max: 6, dettagli: true })
  if (!rs || rs.length < 2) return no(g, 'pochi foglietti')
  const v = variante(g, 3)
  const ink = '#1f1d1a'
  const tinte = [P.acc, acc2(g), P.srf, '#f7e27a', '#ffd6c9'].filter(x => contrast(x, ink) >= 7 && contrast(x, P.bg) >= 1.15)
  const fogli = [...new Set(tinte)].slice(0, 2)
  // due tinte solo se si distinguono davvero (colori quasi uguali sembrano un errore)
  if (fogli.length === 2 && contrast(fogli[0], fogli[1]) < 1.2) fogli.pop()
  if (!fogli.length) fogli.push(P.dark ? '#f7e27a' : '#ffffff')
  const pennarello = readable(P.bg, [acc2(g), P.acc, inkSu(g, P.bg)], 3)
  const tW = side ? (W - 2 * m) * 0.36 : W - 2 * m
  const br = lab(g, c.brand, tW, 20)
  const kick = lab(g, c.kicker, tW * 0.8, 22)
  const t = display(g, c.title, tW, side ? (B - T) * 0.5 : (B - T) * 0.2, 130 + 60 * k.scala, 44, side ? 4 : 3)
  if (!t) return no(g, 'titolo non entra')
  const cta = lab(g, ctaText(c), tW, 20)
  const headH = (br ? br.h + U(g, 18) : 0) + (kick ? kick.h + U(g, 24) : 0) + t.h
  const A: Box = side ? { x: m + tW + U(g, 70), y: T + U(g, 16), w: W - 2 * m - tW - U(g, 70), h: B - T - U(g, 16) } : { x: m, y: T + headH + U(g, 64), w: W - 2 * m, h: B - T - headH - U(g, 64) - (cta ? cta.h + U(g, 40) : 0) }
  const n = rs.length
  const gap = U(g, 34)
  const pad = U(g, 28)
  // colonne: si prova la disposizione del seme, poi le altre, finché ogni foglietto contiene la sua voce
  const pref = v === 2 ? 1 : side ? (n > 4 ? 3 : n) : n === 3 ? 1 : 2
  const opzioni = [...new Set([pref, 2, 1, 3].filter(x => x <= n))]
  let scelta: { cols: number; cw: number; ch: number; prep: ReturnType<typeof prepara> } | null = null
  function prepara(cols: number, cw: number, ch: number) {
    const largo = cols === 1
    const iw = largo ? cw - 2 * pad - U(g, 110) : cw - 2 * pad
    // un corpo solo per i nomi e uno per i valori: il più piccolo che serve (niente corpi sparsi)
    const fitNome = (t: string, max: number) => fit({ text: t, font: s.display, maxW: iw, maxH: ch * 0.4, maxSize: max, minSize: Math.max(22 * g.u, g.sc.minLettura), maxLines: 3, leading: 1.1, tracking: 0, balance: true })
    const nomeMax = Math.min(...rs!.map(r => fitNome(r.nome, Math.min(48, ch / g.u * 0.16) * g.u)?.size ?? 0))
    const valMax = Math.min(...rs!.map(r => (r.valore && valoreProtagonista(g) ? display(g, r.valore, iw, ch * 0.36, 100, 32, 1)?.size : Infinity) ?? 0))
    return rs!.map(r => {
      const numS = Math.min(90, (ch / g.u) * 0.3)
      const nf = riga1(g, String(Number(r.n)), s.display, U(g, 140), numS, 30, { upper: false, tracking: 0 })
      const val = r.valore && valoreProtagonista(g) && valMax > 0 ? display(g, r.valore, iw, ch * 0.36, valMax / g.u, 32, 1) : null
      const nome = nomeMax > 0 ? fitNome(r.nome, nomeMax) : null
      const lato = r.valore && !valoreProtagonista(g) ? lab(g, r.valore, iw, 24) : null
      const tf = r.testo ? para(g, r.testo, iw, 3, 22) : null
      const top = pad + U(g, 14) + (val ? val.h + U(g, STACCO) : nf && !largo ? nf.size * 1.13 + U(g, STACCO) : 0)
      const h = top + (nome?.h ?? 0) + U(g, STACCO) + (lato ? lato.h + U(g, STACCO) : 0) + (tf?.h ?? 0) + pad * 0.6
      return { nf, val, nome, lato, tf, alto: h, ok: !!nome && h <= ch && (!r.valore || !valoreProtagonista(g) || !!val), largo }
    })
  }
  for (const cols of opzioni) {
    const rows = Math.ceil(n / cols)
    const cw = (A.w - gap * (cols - 1)) / cols
    const ch = Math.min((A.h - gap * (rows - 1) - (v === 1 && cols > 1 ? U(g, 24) : 0)) / rows, cols === 1 ? U(g, 360) : cw * 1.05)
    if (ch < U(g, 150) || cw < U(g, 220)) continue
    const prep = prepara(cols, cw, ch)
    if (prep.every(x => x.ok)) { scelta = { cols, cw, ch, prep }; break }
  }
  if (!scelta) return no(g, 'foglietti troppo piccoli')
  const { cols, cw, ch, prep } = scelta
  // una macchia di colore in sovrastampa, al vivo nell'angolo dietro i foglietti
  const R = Math.min(W, H) * (0.36 + 0.12 * k.densita)
  put(g, { kind: 'circle', name: 'macchia', cx: side ? W - R * 0.35 : W * (g.r.chance(0.5) ? 0.08 : 0.92), cy: H - R * 0.3, r: R, fill: readable(P.bg, [P.acc, acc2(g)], 1.3), blend: P.dark ? 'screen' : 'multiply', opacity: 0.5 })
  const sottoF = g.els.length
  // bacheca: trama di puntini
  let dp = ''
  const st = U(g, 22)
  for (let yy = st / 2, row = 0; yy < H; yy += st, row++) for (let xx = row % 2 ? st : st / 2; xx < W; xx += st) dp += `M ${f1(xx)} ${f1(yy)} l 0.1 0 `
  put(g, { kind: 'path', name: 'trama', d: dp, fill: 'transparent', stroke: alpha(inkSu(g, P.bg), 0.12), sw: U(g, 3) })
  let y = side ? T + Math.max(0, (B - T - headH - (cta ? cta.h + U(g, 40) : 0)) * 0.4) : T
  if (br) { putLab(g, 'brand', br, m, y, inkSu(g, P.bg)); y += br.h + U(g, 18) }
  if (kick) {
    putLab(g, 'occhiello', kick, m + U(g, 14), y + U(g, 4), inkSu(g, P.bg))
    put(g, { kind: 'path', name: 'cerchiato', d: scribbleEllipse(g.r, { x: m + U(g, 4), y: y + U(g, 4), w: kick.w + U(g, 20), h: kick.h }), fill: 'transparent', stroke: pennarello, sw: U(g, 4) })
    y += kick.h + U(g, 24)
  }
  putDisplay(g, 'titolo', t, m, y, inkSu(g, P.bg), 'left', t.w)
  const tEnd = y + t.h
  let messe = 0, testi = 0
  const angoli = prep.map((_, i) => (i % 2 ? 1 : -1) * (1.2 + g.r.next() * (1 + 3 * k.energia)))
  prep.forEach((x, i) => {
    const col = i % cols, row = Math.floor(i / cols)
    const bx = A.x + col * (cw + gap)
    const by = A.y + row * (ch + gap) + (v === 1 && col % 2 ? U(g, 24) : 0)
    const ang = angoli[i]
    const fill = fogli[i % fogli.length]
    // il foglietto: ombra, trama e angolo sollevato secondo il dettaglio (l'angolo solo se resta libero)
    const sc0 = cartaPer(g, `foglietto${i}`)
    const piega = Math.min(Math.min(cw, ch) * 0.16, U(g, 70))
    const { T: TT } = foglioCarta(g, { x: bx, y: by, w: cw, h: ch }, ang, fill, { name: 'foglietto', ombra: sc0.ombra, trama: sc0.trama, angolo: x.alto + piega * 1.3 < ch ? sc0.angolo : 'nessuno' })
    const at = (lx: number, ly: number): Pt => TT.P(lx, ly)
    // fissaggio: nastro (di tipo diverso per tavola), due nastri agli angoli, o la puntina
    const fiss = s.forma === 'morbido' ? 'puntina' : sceglie(g, 'fissaggio', ['nastro', 'nastro', 'angoli'])
    const tipoN = nastroPer(g, 'nastro')
    if (fiss === 'puntina') { const [px, py] = at(cw / 2, U(g, 16)); put(g, { kind: 'circle', name: 'puntina', cx: px, cy: py, r: U(g, 11), fill: readable(fill, [P.acc, acc2(g), ink], 2.4) }); put(g, { kind: 'circle', name: 'puntina_luce', cx: px - U(g, 3), cy: py - U(g, 3), r: U(g, 4), fill: alpha('#ffffff', 0.6) }) }
    else if (fiss === 'angoli') { for (const [lx, d0] of [[0, -40], [cw, 40]] as const) { const [px, py] = at(lx, 0); nastro(g, px, py, U(g, 90), ang + d0, tipoN) } }
    else { const [px, py] = at(cw / 2, 0); nastro(g, px, py, U(g, 110), ang + (i % 2 ? 4 : -5), tipoN) }
    let ly = pad + U(g, 14)
    let lx = pad
    if (x.val) {
      const [px, py] = at(pad, ly)
      txt(g, { name: `valore_${i}`, lines: x.val.lines, font: s.display, size: x.val.size, x: px, y: py, color: ink, leading: x.val.leading ?? 1.05, tracking: x.val.tracking ?? 0, angle: ang })
      ly += x.val.h + U(g, STACCO)
    } else if (x.nf) {
      const [px, py] = at(pad, ly)
      txt(g, { name: `numero_${i}`, lines: x.nf.lines, font: s.display, size: x.nf.size, x: px, y: py, color: ink, leading: 1.13, angle: ang })
      if (x.largo) lx = pad + U(g, 110)
      else ly += x.nf.size * 1.13 + U(g, STACCO)
    }
    const [nx, ny] = at(lx, ly)
    txt(g, { name: `voce_${i}`, lines: x.nome!.lines, font: s.display, size: x.nome!.size, x: nx, y: ny, color: ink, leading: 1.1, tracking: 0, angle: ang })
    ly += x.nome!.h + U(g, STACCO)
    if (x.lato) { const [sx, sy] = at(lx, ly); putLab(g, `prezzo_${i}`, x.lato, sx, sy, ink, 'left', x.lato.w, { angle: ang }); ly += x.lato.h + U(g, STACCO) }
    if (x.tf) { const [tx, ty] = at(lx, ly); txt(g, { name: `testo_${i}`, lines: x.tf.lines, font: s.text, size: x.tf.size, x: tx, y: ty, color: '#36332e', leading: x.tf.leading ?? 1.35, angle: ang }); testi++ }
    messe++
  })
  if (!elencoRiuscito(g, rs, messe, testi)) return null
  // freccia a pennarello dal titolo al primo foglietto
  if (!side) {
    const x1 = m + Math.min(t.w, tW) * 0.7, y1 = tEnd + U(g, 10), x2 = A.x + cw * 0.5 + (cols > 1 ? cw + gap : 0) * 0.4, y2 = A.y - U(g, 18)
    if (y2 - y1 > U(g, 26)) put(g, { kind: 'path', name: 'freccia', d: wobblyPath(g.r, x1, y1, x2, y2, U(g, 4)), fill: 'transparent', stroke: pennarello, sw: U(g, 4) })
  }
  if (cta) putLab(g, 'invito', cta, m, side ? tEnd + U(g, 30) : B - cta.h, accSu(g, P.bg, 3.6))
  if (side && g.photo) {
    const py = tEnd + U(g, 50) + (cta ? cta.h + U(g, 30) : 0)
    const ph = Math.min(B - py, tW * 0.8)
    if (ph > U(g, 180)) photo(g, 'foto', { x: m, y: py, w: Math.min(tW, ph * 1.3), h: ph })
  }
  stratoGenerativo(g, [], { at: sottoF, probabilita: 0.2 })
  return finish(g, 'foglietti', 'Foglietti', { specchio: false })
}

/* ═══ Infografica ═══════════════════════════════════════════════════════ */
/**
 * Infografica: le voci come forme che dicono il dato. La testata sta su una
 * fascia al vivo; sotto, a seconda del contenuto: bolle con l'area
 * proporzionale al numero (dati poco sbilanciati), cifre giganti con una barra
 * proporzionale (dati sbilanciati), un percorso a nodi numerati (tappe,
 * programma, consigli, passi), un diagramma con la foto al centro e i fili di
 * richiamo (copertine). Varianti: 0 bolle e nodi, 1 cifre e linea dritta, 2 diagramma.
 */
export function infografica(g: G): Scene | null {
  const { W, H, m, T, B, P, k, s, c } = g
  const rs = righe(g, { max: 6, dettagli: true })
  if (!rs || rs.length < 2) return no(g, 'poche voci')
  const v = variante(g, 3)
  const side = g.landscape
  const fg = inkSu(g, P.bg, 7), ac = readable(P.bg, [P.acc, acc2(g), fg], 2.2), a2 = readable(P.bg, [acc2(g), P.acc, fg].filter(x => x !== ac), 2.2) ?? ac
  const nota = (g: G, text: string, x: number, y: number, w: number, color: string) => { const f = riga1(g, text, mono(g), w, 15, 12, { tracking: 0.12 }); if (f) scrivi(g, 'nota', f, mono(g), x, y, color, { deco: true }) }
  // testata su una fascia al vivo
  const tW = side ? (W - 2 * m) * 0.36 : W - 2 * m
  const br = lab(g, c.brand, tW, 20)
  const kick = lab(g, c.kicker, tW, 20)
  const t = display(g, c.title, tW, side ? (B - T) * 0.5 : (B - T) * 0.2, 140 + 60 * k.scala, 44, 3)
  if (!t) return no(g, 'titolo non entra')
  const cta = lab(g, ctaText(c), tW, 20)
  const body = !conVoci(g) ? para(g, c.body, tW, 3) : null
  const headH = (br ? br.h + U(g, 18) : 0) + (kick ? kick.h + U(g, 12) : 0) + t.h + (body ? U(g, 24) + body.h : 0)
  const fasciaC = readable(P.bg, [P.srf, mix(P.bg, ac, 0.18)], 1.08)
  const suF = inkSu(g, fasciaC, 7)
  const fasciaB = side ? { x: 0, y: 0, w: m + tW + U(g, 36), h: H } : { x: 0, y: 0, w: W, h: T + headH + U(g, 40) }
  const A: Box = side ? { x: fasciaB.w + U(g, 40), y: T, w: W - m - fasciaB.w - U(g, 40), h: B - T } : { x: m, y: fasciaB.h + U(g, 50), w: W - 2 * m, h: B - fasciaB.h - U(g, 50) - (cta ? cta.h + U(g, 40) : 0) }
  if (A.h < (B - T) * 0.35) return no(g, 'poco spazio per il grafico')
  put(g, { kind: 'rect', name: 'fascia', ...fasciaB, fill: fasciaC })
  const sottoI = g.els.length
  let y = side ? T + Math.max(0, (B - T - headH - (cta ? cta.h + U(g, 40) : 0)) * 0.45) : T
  if (br) { putLab(g, 'brand', br, m, y, suF); y += br.h + U(g, 18) }
  if (kick) { putLab(g, 'occhiello', kick, m, y, accSu(g, fasciaC, 3.6)); y += kick.h + U(g, 12) }
  putDisplay(g, 'titolo', t, m, y, suF, 'left', t.w, { su: fasciaC })
  y += t.h
  if (body) { y += U(g, 24); putPara(g, 'testo', body, m, y, suF); y += body.h }
  if (cta && side) putLab(g, 'invito', cta, m, y + U(g, 40), accSu(g, fasciaC, 3.6))
  else if (cta) putLab(g, 'invito', cta, m, B - cta.h, accSu(g, P.bg, 3.6))
  let messe = 0, testi = 0
  const nums = rs.map(r => numeroDa(r.valore))
  const quantitativo = g.c.tipo === 'dati' && nums.every(x => isFinite(x) && x > 0)
  const sbilanciati = quantitativo && Math.max(...nums) / Math.min(...nums) > 25
  const sw = Math.max(2, U(g, 3))
  if (!conVoci(g) || (v === 2 && !quantitativo)) {
    /* ── diagramma: un cerchio al centro (foto o numero), le righe attorno con i fili ── */
    const R = Math.min(A.w * 0.22, A.h * 0.3)
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2
    if (g.photo) photo(g, 'foto', { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R }, { shape: 'circle' })
    else put(g, { kind: 'circle', name: 'disco', cx, cy, r: R, fill: ac })
    put(g, { kind: 'circle', name: 'anello', cx, cy, r: R + U(g, 14), fill: 'transparent', stroke: fg, sw })
    if (!g.photo && c.numero) {
      const nf = display(g, c.numero, R * 1.5, R, 160, 40, 1)
      if (nf) putDisplay(g, 'numero', nf, cx - R, cy - nf.h / 2, inkSu(g, ac, 4.5), 'center', 2 * R)
    }
    const colW = A.w / 2 - R - U(g, 70)
    if (colW < U(g, 150)) return no(g, 'colonne strette')
    // senza voci le righe sono i dettagli: note brevi, al corpo delle note (le voci vere al corpo di lettura)
    const dett = !conVoci(g), minR = dett ? g.sc.minNota : g.sc.minLettura
    for (const dx of [-1, 1]) {
      const grp = rs.map((r, i) => ({ r, i })).filter(x => (x.i % 2 ? 1 : -1) === dx)
      grp.forEach((x, j) => {
        const fy = A.y + (A.h * (j + 0.5)) / grp.length
        const lf = fit({ text: x.r.nome, font: g.s.label, maxW: colW, maxSize: Math.max(26 * g.u, minR), minSize: minR, maxLines: 3, leading: 1.25, tracking: 0.1, upper: true })
        if (!lf) return
        const tf = x.r.testo ? para(g, x.r.testo, colW, 2, 22) : null
        const hh = lf.h + (tf ? tf.h + U(g, STACCO) : 0)
        const tx = dx < 0 ? A.x : A.x + A.w - colW
        const ty = clamp(fy - hh / 2, A.y, A.y + A.h - hh)
        const al = dx < 0 ? 'right' : 'left'
        txt(g, { name: `${dett ? 'dettaglio' : 'voce'}_${x.i}`, lines: lf.lines, font: g.s.label, size: lf.size, x: tx, y: ty, color: fg, align: al, w: colW, leading: 1.25, tracking: 0.1 })
        if (tf) { txt(g, { name: `testo_${x.i}`, lines: tf.lines, font: s.text, size: tf.size, x: tx, y: ty + lf.h + U(g, STACCO), color: fg, align: al, w: colW, leading: tf.leading ?? 1.35 }); testi++ }
        const ex = dx < 0 ? tx + colW + U(g, 16) : tx - U(g, 16), ey = ty + lf.size * 0.6
        const ang = Math.atan2(ey - cy, ex - cx)
        const px = cx + Math.cos(ang) * (R + U(g, 14)), py = cy + Math.sin(ang) * (R + U(g, 14))
        put(g, { kind: 'path', name: 'filo', d: `M ${f1(ex)} ${f1(ey)} L ${f1(ex - dx * U(g, 26))} ${f1(ey)} L ${f1(px)} ${f1(py)}`, fill: 'transparent', stroke: fg, sw: Math.max(1.5, U(g, 2)) })
        put(g, { kind: 'circle', name: 'nodo', cx: px, cy: py, r: U(g, 9), fill: a2 })
        messe++
      })
    }
    nota(g, `fig. ${1 + (k.seme % 9)} — ${(c.brand || 'schema').toLowerCase()}`, A.x, A.y + A.h - U(g, 18), A.w * 0.5, fg)
  } else if (quantitativo && (sbilanciati || v === 1)) {
    /* ── cifre giganti: ogni valore enorme, la voce accanto, una barra proporzionale sotto ── */
    const max = Math.max(...nums)
    const n = rs.length
    const step = A.h / n
    const vw = A.w * 0.58
    const tipoB = sceglie<Avanzamento>(g, 'barre', ['liscia', 'blocchi', 'righe'])
    rs.forEach((r, i) => {
      const y0 = A.y + i * step
      const vf = display(g, r.valore!, vw, step * 0.62, 260, 40, 1)
      const lf = lab(g, r.nome, A.w - vw - U(g, 30), 26, true)
      if (!vf || !lf) return
      putDisplay(g, `valore_${i}`, vf, A.x, y0, i % 2 ? fg : readable(P.bg, [ac, fg], 3), 'left', vf.w)
      putLab(g, `voce_${i}`, lf, A.x + A.w - lf.w, y0 + vf.h - lf.h - U(g, 6), fg, 'left', lf.w)
      // barra: lunga quanto il valore (scala logaritmica se i numeri sono sbilanciati)
      const q = sbilanciati ? Math.log10(1 + nums[i]) / Math.log10(1 + max) : nums[i] / max
      const by = y0 + vf.h + U(g, 14)
      barra(g, 'barra', { x: A.x, y: by, w: A.w, h: U(g, tipoB === 'liscia' ? 14 : 18) }, q, tipoB, i % 2 ? a2 : ac, mix(P.bg, fg, 0.12))
      messe++
    })
    nota(g, sbilanciati ? 'barre in scala logaritmica' : 'barre in proporzione', A.x, A.y + A.h - U(g, 16), A.w, fg)
  } else if (quantitativo) {
    /* ── bolle proporzionali: valore sopra, bolla, voce sotto ── */
    const max = Math.max(...nums)
    const n = rs.length
    const cols = side ? Math.min(n, 4) : n <= 3 ? n : 2
    const rows = Math.ceil(n / cols)
    const cw = A.w / cols, chh = A.h / rows
    const vh = U(g, 90), lh = U(g, 44)
    const Rmax = Math.min(cw * 0.44, (chh - vh - lh - U(g, 40)) / 2)
    if (Rmax < U(g, 40)) return no(g, 'bolle troppo piccole')
    rs.forEach((r, i) => {
      const col = i % cols, row = Math.floor(i / cols)
      const R = Math.max(Rmax * 0.3, Rmax * Math.sqrt(nums[i] / max))
      const cx = A.x + cw * (col + 0.5), y0 = A.y + chh * row
      const vf = display(g, r.valore!, cw * 0.9, vh, 90, 30, 1)
      const lf = lab(g, r.nome, cw * 0.9, 24, true)
      if (!vf || !lf) return
      putDisplay(g, `valore_${i}`, vf, cx - cw * 0.45, y0, fg, 'center', cw * 0.9)
      const by = y0 + vf.h + U(g, 16) + Rmax
      put(g, { kind: 'circle', name: 'bolla', cx, cy: by + (Rmax - R), r: R, fill: i % 2 ? a2 : ac })
      put(g, { kind: 'circle', name: 'filo', cx, cy: by, r: Rmax, fill: 'transparent', stroke: alpha(fg, 0.3), sw: Math.max(1, U(g, 2)) })
      putLab(g, `voce_${i}`, lf, cx - cw * 0.45, by + Rmax + U(g, 16), fg, 'center', cw * 0.9)
      messe++
    })
    nota(g, 'area proporzionale al valore', A.x, A.y + A.h - U(g, 16), A.w, fg)
  } else {
    /* ── percorso: nodi numerati su una linea ── */
    const n = rs.length
    const vertical = !side || v === 1
    if (vertical) {
      const step = A.h / n
      const R = Math.min(U(g, 40), step * 0.3)
      const lx = A.x + R
      // con la foto: il percorso a sinistra, la foto al vivo nella colonna di destra
      let Aw = A.w
      if (g.photo && !side) {
        const px = A.x + A.w * 0.6
        photo(g, 'foto', { x: px, y: A.y, w: W - px, h: H - A.y })
        Aw = A.w * 0.6 - U(g, 34)
      } else {
        const Rm = Math.min(W, H) * 0.4
        put(g, { kind: 'circle', name: 'macchia', cx: W - Rm * 0.3, cy: H - Rm * 0.35, r: Rm, fill: readable(P.bg, [P.acc, acc2(g)], 1.3), blend: P.dark ? 'screen' : 'multiply', opacity: 0.45 })
      }
      put(g, { kind: 'path', name: 'filo', d: wobblyPath(g.r, lx, A.y + R, lx, A.y + (n - 1) * step + R, U(g, 1.5)), fill: 'transparent', stroke: fg, sw })
      rs.forEach((r, i) => {
        const yy = A.y + i * step
        const bolla = i % 2 ? a2 : ac
        put(g, { kind: 'circle', name: 'nodo', cx: lx, cy: yy + R, r: R, fill: bolla })
        const nf = riga1(g, String(i + 1), s.label, R * 1.3, R / g.u, 16, { tracking: 0 })
        if (nf && contrast(inkSu(g, bolla, 3), bolla) >= 3) scrivi(g, `numero_${i}`, nf, s.label, lx - R, yy + R - nf.h / 2, inkSu(g, bolla, 3), { align: 'center', w: 2 * R })
        const tx = lx + R + U(g, 30), tw = A.x + Aw - tx
        let ty = yy
        const vf = r.valore ? display(g, r.valore, tw, step * 0.35, valoreProtagonista(g) ? 90 : 48, 30, 1) : null
        if (r.valore && !vf) return
        if (vf) { putDisplay(g, `valore_${i}`, vf, tx, ty, readable(P.bg, [ac, fg], 3), 'left', vf.w); ty += vf.h + U(g, STACCO) }
        const nm = fit({ text: r.nome, font: s.display, maxW: tw, maxH: step * 0.4, maxSize: Math.min(60, step / g.u * 0.24) * g.u, minSize: Math.max(22 * g.u, g.sc.minLettura), maxLines: 2, leading: 1.1, tracking: 0, balance: true })
        if (!nm) return
        txt(g, { name: `voce_${i}`, lines: nm.lines, font: s.display, size: nm.size, x: tx, y: ty, color: fg, leading: 1.1 })
        ty += nm.h + U(g, STACCO)
        const tf = r.testo ? para(g, r.testo, tw, 2, 24) : null
        if (tf) { if (ty + tf.h > yy + step - U(g, 8)) return; putPara(g, `testo_${i}`, tf, tx, ty, fg); testi++; ty += tf.h }
        if (ty > yy + step - U(g, 4)) return
        messe++
      })
    } else {
      const step = A.w / n
      const R = Math.min(U(g, 40), step * 0.2)
      const ly = A.y + A.h * 0.3
      put(g, { kind: 'path', name: 'filo', d: wobblyPath(g.r, A.x + step / 2, ly, A.x + A.w - step / 2, ly, U(g, 1.5)), fill: 'transparent', stroke: fg, sw })
      rs.forEach((r, i) => {
        const cx = A.x + step * (i + 0.5)
        put(g, { kind: 'circle', name: 'nodo', cx, cy: ly, r: R, fill: i % 2 ? a2 : ac })
        const cw = step * 0.88
        const vf = r.valore ? display(g, r.valore, cw, ly - R - U(g, 16) - A.y, 80, 30, 1) : null
        if (r.valore && !vf) return
        if (vf) putDisplay(g, `valore_${i}`, vf, cx - cw / 2, ly - R - U(g, 16) - vf.h, readable(P.bg, [ac, fg], 3), 'center', cw)
        const nm = fit({ text: r.nome, font: s.display, maxW: cw, maxH: A.h * 0.3, maxSize: 38 * g.u, minSize: Math.max(22 * g.u, g.sc.minLettura), maxLines: 3, leading: 1.1, tracking: 0, balance: true })
        if (!nm) return
        txt(g, { name: `voce_${i}`, lines: nm.lines, font: s.display, size: nm.size, x: cx - cw / 2, y: ly + R + U(g, 20), color: fg, align: 'center', w: cw, leading: 1.1 })
        const tf = r.testo ? para(g, r.testo, cw, 3, 22) : null
        if (tf) { putPara(g, `testo_${i}`, tf, cx - cw / 2, ly + R + U(g, 20) + nm.h + U(g, STACCO), fg, 'center', cw); testi++ }
        messe++
      })
    }
  }
  if (!elencoRiuscito(g, rs, messe, testi)) return null
  if (!g.els.some(e => e.name === 'macchia')) stratoGenerativo(g, [A], { at: sottoI })
  return finish(g, 'infografica', 'Infografica', { specchio: false })
}

export const SYSTEMS_E: Record<'scontrino' | 'lavagna' | 'tabellone' | 'foglietti' | 'infografica', Sistema> = {
  scontrino, lavagna, tabellone, foglietti, infografica,
}

/** Riga normalizzata (per chi compone sopra questi archetipi). */
export type { Riga }
