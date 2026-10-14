/**
 * Archetipi del gruppo B (seconda parte) · carta e oggetti: acquerello,
 * biglietto, etichetta, fumetto. Compongono con la materia (../materia):
 * carta con trama e ombre a strati, nastri, timbri, codici; il livello di
 * dettaglio (piatto, curato, realistico) lo sceglie il seme col registro.
 * I testi stanno sempre su un fondo pieno che il controllo di leggibilità vede.
 */
import type { Scene } from '../../types'
import { type G, put, U, txt, para, photo, finish, mix, alpha, readable, lum, keyword, ctaText, detailsLine } from '../tools'
import { blobPath, wobblyPath, starPath } from '../forme'
import { lineWidth } from '../../text'
import { carta, cartaPer, codice, timbro, sceglie, dettaglio, stratoGenerativo } from '../materia'
import { righe, conVoci, elencoRiuscito } from './voci'
import {
  no, variante, mono, inkSu, acc2, f1, poly, riga1, scrivi, tinteSu, blocco, titolo, putDisplay, putLab, lab, type Box, type Pt,
} from './comune'

/* ═══ Acquerello ════════════════════════════════════════════════════════ */
/**
 * Macchie d'acquerello che si sovrappongono in trasparenza su carta da
 * disegno: ogni macchia ha il velo, il pigmento che si raccoglie al centro e
 * il bordo asciutto più scuro (più strati col dettaglio). La foto sta in una
 * macchia; il titolo serif sotto o accanto, con una pennellata.
 * Varianti: 0 macchie in alto e testo sotto, 1 grappolo sparso con la foto piccola.
 */
export function acquerello(g: G): Scene | null {
  const { W, H, m, T, B, P, k, c } = g
  const v = variante(g, 2)
  const side = g.landscape
  const d = dettaglio(g)
  const scuro = lum(P.bg) < 0.2
  // la carta: trama in un velo
  put(g, { kind: 'rect', name: 'trama_fondo', x: 0, y: 0, w: W, h: H, fill: P.bg, blend: scuro ? 'screen' : 'multiply', opacity: 0.6, fx: [{ id: 'textureOverlay', variant: d === 2 ? 'tela' : 'carta', p: { opacity: 50 } }] })
  const tW = side ? (W - 2 * m) * 0.44 : W - 2 * m
  const info = blocco(g, tW, { bodyLines: 3 })
  if (!info) return null
  const br = lab(g, c.brand, tW, 20)
  const t = titolo(g, tW, side ? (B - T) * 0.4 : (B - T) * 0.2, 130 + 60 * k.scala)
  if (!t) return no(g, 'titolo non entra')
  const gap = U(g, 26)
  const testoH = (br ? br.h + gap : 0) + t.h + U(g, 30) + gap + info.h
  const Z: Box = side ? { x: m + tW + U(g, 60), y: T - U(g, 20), w: W - m * 0.5 - (m + tW + U(g, 60)), h: B - T + U(g, 40) } : { x: m * 0.5, y: Math.max(m * 0.4, T - U(g, 40)), w: W - m, h: B - testoH - U(g, 70) - Math.max(m * 0.4, T - U(g, 40)) }
  if (Z.h < H * 0.25 || Z.w < W * 0.3) return no(g, 'poco spazio per le macchie')
  // le macchie: tre tinte, ciascuna con velo, pigmento e bordo asciutto
  const tinte = [P.acc, acc2(g), mix(P.acc, P.bg, 0.45)]
  const n = 3 + Math.round(k.densita * 3)
  const blend = scuro ? 'screen' : 'multiply'
  for (let i = 0; i < n; i++) {
    const w = Z.w * g.r.range(0.35, 0.65), h = Z.h * g.r.range(0.35, 0.65)
    const b = { x: Z.x + g.r.range(0, Z.w - w), y: Z.y + g.r.range(0, Z.h - h), w, h }
    const col = tinte[i % tinte.length]
    const dd = blobPath(g.r, b, 0.42, 9)
    put(g, { kind: 'path', name: 'macchia', d: dd, fill: col, blend, opacity: 0.32 })
    if (d >= 1) put(g, { kind: 'path', name: 'macchia', d: blobPath(g.r, { x: b.x + w * 0.2, y: b.y + h * 0.2, w: w * 0.6, h: h * 0.6 }, 0.5, 7), fill: col, blend, opacity: 0.22 })
    if (d === 2) put(g, { kind: 'path', name: 'macchia_bordo', d: dd, fill: 'transparent', stroke: mix(col, '#000000', 0.15), sw: Math.max(1.5, U(g, 2.5)), blend, opacity: 0.45 })
  }
  // la foto in una macchia
  if (g.photo) {
    const q = v === 0 ? 0.78 : 0.5
    const pb = { x: Z.x + Z.w * (1 - q) / 2, y: Z.y + Z.h * (1 - q) / 2, w: Z.w * q, h: Z.h * q }
    photo(g, 'foto', pb, { mask: blobPath(g.r, pb, 0.35, 10), look: 'portra', adjust: { grain: 15, vignette: -20 }, fx: [{ id: 'gradientMap', p: { c1: mix(P.fg, '#000000', 0.2), c2: P.acc, c3: '#fbf8f2', three: 1, contrast: 10 } }] })
    put(g, { kind: 'path', name: 'macchia', d: blobPath(g.r, { x: pb.x - U(g, 30), y: pb.y + pb.h * 0.6, w: pb.w * 0.5, h: pb.h * 0.5 }, 0.45, 8), fill: P.acc, blend, opacity: 0.3 })
  }
  // didascalia a matita (decorativa)
  const did = riga1(g, `acquerello su carta · n. ${1 + (k.seme % 40)}`, mono(g), Z.w * 0.6, 15, 12, { tracking: 0.12, upper: false })
  if (did) scrivi(g, 'didascalia', did, mono(g), Z.x + Z.w - did.w - U(g, 10), Z.y + Z.h - did.h, inkSu(g, P.bg, 3), { deco: true, opacity: 0.8 })
  // testi
  const col = tinteSu(g, P.bg)
  let y = side ? T + Math.max(0, (B - T - testoH) * 0.45) : Z.y + Z.h + U(g, 60)
  const x = m
  if (br) { putLab(g, 'brand', br, x, y, col.sec); y += br.h + gap }
  putDisplay(g, 'titolo', t, x, y, col.fg, 'left', t.w)
  y += t.h + U(g, 10)
  put(g, { kind: 'path', name: 'segno_pennello', d: wobblyPath(g.r, x, y + U(g, 8), x + Math.min(t.w, tW) * 0.7, y + U(g, 12), U(g, 5)), fill: 'transparent', stroke: alpha(P.acc, 0.8), sw: U(g, 9) })
  y += U(g, 20) + gap
  info.place(x, y, col)
  return finish(g, 'acquerello', 'Acquerello', { specchio: !conVoci(g) })
}

/* ═══ Biglietto ═════════════════════════════════════════════════════════ */
/**
 * Un biglietto d'ingresso: carta spessa con le tacche ai lati della
 * perforazione, il talloncino con il numero di serie, il prezzo o la data e
 * un codice, i dettagli in caselle, la foto nel corpo. Sotto: la foto a tutta
 * tavola o una trama di sicurezza (guilloche). Varianti: 0 trama e foto nel
 * biglietto, 1 foto di sfondo e biglietto pulito; verticale nei formati alti.
 */
export function biglietto(g: G): Scene | null {
  const { W, H, m, T, B, P, k, s, c } = g
  if (conVoci(g)) return no(g, 'biglietto: niente voci')
  const v = variante(g, 2) === 1 && !g.photo ? 0 : variante(g, 2)
  const verticale = g.portrait
  const cartaC = P.dark ? '#f3efe4' : lum(P.bg) > 0.8 ? mix(P.acc, '#ffffff', 0.82) : '#fbf8f0'
  const ink = inkSu(g, cartaC, 7)
  const accC = readable(cartaC, [P.acc, acc2(g), ink], 3.6)
  const deg = k.energia > 0.45 ? (g.r.chance(0.5) ? -1 : 1) * (1.5 + 2.5 * k.energia) : 0
  // misure del biglietto
  const bw = verticale ? Math.min(W - 2 * m, W * 0.82) : Math.min(W - 2 * m, W * (g.landscape ? 0.8 : 0.92))
  const bh = verticale ? Math.min(B - T, H * 0.8) : Math.min(B - T, bw * 0.62)
  const stub = verticale ? bh * 0.24 : bw * 0.27
  const pad = U(g, 36)
  const corpo: Box = verticale ? { x: 0, y: 0, w: bw, h: bh - stub } : { x: 0, y: 0, w: bw - stub, h: bh }
  const tal: Box = verticale ? { x: 0, y: bh - stub, w: bw, h: stub } : { x: bw - stub, y: 0, w: stub, h: bh }
  const iw = corpo.w - 2 * pad
  const br = riga1(g, c.brand ?? '', mono(g), iw * 0.6, 22, 16, { tracking: 0.2 })
  const kick = lab(g, c.kicker, iw, 22)
  const fotoIn = v === 0 && !!g.photo
  const fotoH = fotoIn ? (verticale ? corpo.h * 0.36 : 0) : 0
  const fotoW = fotoIn && !verticale ? corpo.w * 0.36 : 0
  const tw = iw - (fotoW ? fotoW + pad : 0)
  const dets = (c.details ?? []).map(x => x.trim()).filter(Boolean).slice(0, 3)
  const casH = U(g, 70)
  const avail = corpo.h - 2 * pad - (br ? br.h + U(g, 16) : 0) - (kick ? kick.h + U(g, 14) : 0) - fotoH - (fotoH ? U(g, 24) : 0) - (dets.length ? casH + U(g, 24) : 0)
  const t = titolo(g, tw, avail * 0.75, 130 + 60 * k.scala, 3, 40)
  if (!t) return no(g, 'titolo non entra')
  const body = para(g, c.body, tw, 2, 0)
  if (t.h + (body ? body.h + U(g, 16) : 0) > avail) return no(g, 'biglietto troppo pieno')
  const sotto = g.els.length
  // fondo
  if (v === 1) photo(g, 'foto', { x: 0, y: 0, w: W, h: H })
  else {
    // trama di sicurezza: onde sottili che si incrociano
    let dd = ''
    const amp = U(g, 26), step = U(g, 22)
    for (let y0 = -amp; y0 < H + amp; y0 += step) { dd += `M 0 ${f1(y0)} `; for (let x = 0; x <= W; x += U(g, 24)) dd += `L ${f1(x)} ${f1(y0 + Math.sin(x / U(g, 90) + y0 / U(g, 140)) * amp)} ` }
    put(g, { kind: 'path', name: 'guilloche', d: dd, fill: 'transparent', stroke: alpha(readable(P.bg, [P.acc, P.fg], 1.5), 0.35), sw: Math.max(1, U(g, 1.5)) })
  }
  // il biglietto (carta della materia), con le tacche della perforazione
  const X0 = (W - bw) / 2, Y0 = verticale ? T + (B - T - bh) / 2 : (T + B) / 2 - bh / 2
  const sc = cartaPer(g, 'biglietto')
  const { T: Tt } = carta(g, { x: X0, y: Y0, w: bw, h: bh }, deg, cartaC, { name: 'biglietto', ombra: sc.ombra, trama: sc.trama, r: U(g, 14), piega: 'nessuna' })
  const P0 = (lx: number, ly: number) => Tt.P(lx, ly)
  const rT = U(g, 24)
  const [n1, n2] = verticale ? [P0(0, tal.y), P0(bw, tal.y)] : [P0(tal.x, 0), P0(tal.x, bh)]
  for (const [cx, cy] of [n1, n2]) put(g, { kind: 'circle', name: 'tacca', cx, cy, r: rT, fill: v === 1 ? '#000000' : P.bg, opacity: v === 1 ? 0.0001 : 1 })
  if (v === 1) for (const [cx, cy] of [n1, n2]) put(g, { kind: 'circle', name: 'tacca_ombra', cx, cy, r: rT, fill: alpha('#000000', 0.35) })
  const [a1, a2] = verticale ? [P0(rT * 1.4, tal.y), P0(bw - rT * 1.4, tal.y)] : [P0(tal.x, rT * 1.4), P0(tal.x, bh - rT * 1.4)]
  put(g, { kind: 'line', name: 'perforazione', x1: a1[0], y1: a1[1], x2: a2[0], y2: a2[1], color: alpha(ink, 0.5), width: Math.max(2, U(g, 3)), dash: [U(g, 4), U(g, 9)] })
  // corpo: brand, occhiello, foto, titolo, testo, caselle
  let y = pad
  const ang = deg || undefined
  const at = (lx: number, ly: number) => P0(lx, ly)
  if (br) { const [x, yy] = at(pad, y); scrivi(g, 'brand', br, mono(g), x, yy, ink, { angle: deg }); y += br.h + U(g, 16) }
  if (kick) { const [x, yy] = at(pad, y); putLab(g, 'occhiello', kick, x, yy, accC, 'left', kick.w, { angle: ang }); y += kick.h + U(g, 14) }
  if (fotoIn && verticale) {
    const [x, yy] = at(pad, y)
    photo(g, 'foto', { x, y: yy, w: iw, h: fotoH }, { fx: [{ id: 'halftone', variant: 'fumetto' }] })
    y += fotoH + U(g, 24)
  }
  if (fotoIn && !verticale) { const [x, yy] = at(pad + iw - fotoW, pad); photo(g, 'foto', { x, y: yy, w: fotoW, h: corpo.h - 2 * pad }) }
  { const [x, yy] = at(pad, y); putDisplay(g, 'titolo', t, x, yy, ink, 'left', t.w, { angle: ang, su: cartaC }); y += t.h + U(g, 16) }
  if (body) { const [x, yy] = at(pad, y); txt(g, { name: 'testo', lines: body.lines, font: s.text, size: body.size, x, y: yy, color: ink, leading: body.leading ?? 1.4, angle: ang }); y += body.h + U(g, 16) }
  if (dets.length) {
    const cy = corpo.h - pad - casH
    const cw = (tw - U(g, 12) * (dets.length - 1)) / dets.length
    dets.forEach((d0, i) => {
      const lx = pad + i * (cw + U(g, 12))
      const [x, yy] = at(lx, cy)
      put(g, { kind: 'rect', name: 'casella', x, y: yy, w: cw, h: casH, fill: 'transparent', stroke: alpha(ink, 0.6), sw: Math.max(1.5, U(g, 2)), angle: ang })
      const f = riga1(g, d0, mono(g), cw - U(g, 24), 20, 14, { tracking: 0.04, lines: 2 })
      if (f) { const [tx, ty] = at(lx + U(g, 12), cy + (casH - f.h) / 2); scrivi(g, `dettaglio_${i}`, f, mono(g), tx, ty, ink, { angle: deg }) }
    })
  }
  // talloncino: numero di serie, il numero protagonista (o l'invito), un codice
  const sw = tal.w - 2 * pad
  let ty = tal.y + pad
  const serie = riga1(g, `n. ${String(k.seme % 100000).padStart(6, '0')}`, mono(g), sw, 18, 12, { tracking: 0.14 })
  if (serie) { const [x, yy] = at(tal.x + pad, ty); scrivi(g, 'serie', serie, mono(g), x, yy, accC, { angle: deg, deco: true }); ty += serie.h + U(g, 14) }
  const num = c.numero?.trim()
  const nf = num ? riga1(g, num, s.impact, sw, verticale ? 90 : 110, 30, { tracking: 0, upper: false }) : null
  if (nf) { const [x, yy] = at(tal.x + pad, ty); scrivi(g, 'numero', nf, s.impact, x, yy, ink, { angle: deg }); ty += nf.h + U(g, 14) }
  const cta = lab(g, ctaText(c), sw, 20)
  if (cta) { const [x, yy] = at(tal.x + pad, ty); putLab(g, 'invito', cta, x, yy, accC, 'left', cta.w, { angle: ang }); ty += cta.h + U(g, 18) }
  const codH = Math.min(U(g, 70), tal.y + tal.h - pad - ty)
  if (codH > U(g, 30)) codice(g, Tt, { x: tal.x + pad, y: tal.y + tal.h - pad - codH, w: Math.min(sw, U(g, 260)), h: codH }, sceglie(g, 'codice', ['barre', 'ean'] as const), ink)
  if (ty > tal.y + tal.h - pad + U(g, 4)) return no(g, 'talloncino troppo pieno')
  // timbro di convalida a cavallo della perforazione
  if (k.densita > 0.3) { const [sx, sy] = verticale ? at(bw * 0.72, tal.y) : at(tal.x, bh * 0.7); timbro(g, sceglie(g, 'conv', ['valido', 'convalidato', 'ingresso']), sx, sy, -14 - 8 * k.energia, readable(cartaC, [acc2(g), P.acc, '#b23a3a'], 3), U(g, 30)) }
  stratoGenerativo(g, [], { at: sotto, probabilita: v === 1 ? 0 : 0.35 })
  return finish(g, 'biglietto', 'Biglietto', { specchio: false })
}

/* ═══ Etichetta ═════════════════════════════════════════════════════════ */
/**
 * Un'etichetta o un sigillo grande al centro: bordo dentellato o cartiglio a
 * angoli scavati, anello di testo con il brand che gira, il titolo dentro, un
 * nastro sotto con l'invito o i dettagli. Dietro, raggi a tutta tavola o la
 * foto. Varianti: 0 sigillo tondo e raggi, 1 cartiglio sulla foto (o su una trama).
 */
export function etichetta(g: G): Scene | null {
  const { W, H, m, T, B, P, k, s, c } = g
  if (conVoci(g)) return no(g, 'etichetta: niente voci')
  const v = variante(g, 2)
  const cartaC = P.dark ? '#f4efe2' : mix(P.bg, '#ffffff', 0.6)
  const ink = inkSu(g, cartaC, 7)
  const accC = readable(cartaC, [P.acc, acc2(g), ink], 3.6)
  const cx = W / 2
  // dietro: raggi (variante 0) o foto/trama (variante 1)
  if (v === 0) {
    const n = 18 + Math.round(k.densita * 14), R = Math.hypot(W, H)
    let dd = ''
    const cy0 = (T + B) / 2
    for (let i = 0; i < n; i += 2) { const a1 = (i / n) * Math.PI * 2, a2 = ((i + 1) / n) * Math.PI * 2; dd += poly([[cx, cy0], [cx + Math.cos(a1) * R, cy0 + Math.sin(a1) * R], [cx + Math.cos(a2) * R, cy0 + Math.sin(a2) * R]]) + ' ' }
    put(g, { kind: 'path', name: 'raggi', d: dd, fill: readable(P.bg, [P.acc, acc2(g), P.fg], 1.25), opacity: 0.9, fx: dettaglio(g) ? [{ id: 'grunge', variant: 'leggera' }] : undefined })
  } else if (g.photo) photo(g, 'foto', { x: 0, y: 0, w: W, h: H })
  else stratoGenerativo(g, [{ x: 0, y: 0, w: W, h: H }], { probabilita: 1 })
  // misure: nastro sotto con invito (o dettagli)
  const nastroTxt = c.cta ? ctaText(c) : detailsLine(c)
  const nf = nastroTxt ? riga1(g, nastroTxt, s.label, W * 0.62, 26, 16, { tracking: 0.12 }) : null
  const nastroH = nf ? nf.h + U(g, 36) : 0
  const R = Math.min(W - 2 * m, B - T - nastroH - U(g, 60)) * 0.5
  const cy = T + R + U(g, 10)
  if (R < U(g, 220)) return no(g, 'etichetta piccola')
  const inner = R * (v === 0 ? 0.74 : 0.8)
  // forma
  if (v === 0) {
    const dd = starPath(cx, cy, R, 48 + Math.round(k.densita * 24), 0.93, 0)
    put(g, { kind: 'path', name: 'ombra', d: dd.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, a: string, b: string) => `${f1(+a + U(g, 10))} ${f1(+b + U(g, 14))}`), fill: alpha('#000000', 0.25) })
    put(g, { kind: 'path', name: 'sigillo', d: dd, fill: accC === ink ? P.acc : readable(P.bg, [P.acc, acc2(g)], 1.2) })
    put(g, { kind: 'circle', name: 'sigillo_carta', cx, cy, r: R * 0.86, fill: cartaC, stroke: ink, sw: Math.max(2, U(g, 3)) })
    put(g, { kind: 'circle', name: 'sigillo_filo', cx, cy, r: R * 0.79, fill: 'transparent', stroke: ink, sw: Math.max(1, U(g, 1.5)) })
    put(g, { kind: 'arcText', name: 'anello', cx, cy, r: R * 0.82, text: `${(c.brand || keyword(g)).toUpperCase()} ✦ `.repeat(3), font: s.label, size: U(g, 22), color: ink, full: true, tracking: 0.18 })
  } else {
    // cartiglio: rettangolo con gli angoli scavati, doppio filetto
    const w = R * 2, h = R * 1.5, x0 = cx - R, y0 = cy - h / 2, q = R * 0.16
    const pts: Pt[] = [[x0 + q, y0], [x0 + w - q, y0], [x0 + w, y0 + q], [x0 + w, y0 + h - q], [x0 + w - q, y0 + h], [x0 + q, y0 + h], [x0, y0 + h - q], [x0, y0 + q]]
    put(g, { kind: 'path', name: 'ombra', d: poly(pts.map(([a, b]) => [a + U(g, 10), b + U(g, 14)] as Pt)), fill: alpha('#000000', 0.3) })
    put(g, { kind: 'path', name: 'cartiglio', d: poly(pts), fill: cartaC, stroke: ink, sw: Math.max(2, U(g, 3)) })
    put(g, { kind: 'rect', name: 'cartiglio_pieno', x: x0 + q, y: y0 + q, w: w - 2 * q, h: h - 2 * q, fill: cartaC, stroke: ink, sw: Math.max(1, U(g, 1.5)) })
  }
  // dentro: brand (nel cartiglio), occhiello, titolo, numero piccolo decorativo
  const iw = inner * 1.5
  const kick = lab(g, c.kicker, iw, 20)
  const t = titolo(g, iw, inner * 0.8, 120 + 50 * k.scala, 3, 36)
  if (!t) return no(g, 'titolo non entra')
  const br = v === 1 ? lab(g, c.brand, iw, 20) : null
  const tot = (br ? br.h + U(g, 16) : 0) + (kick ? kick.h + U(g, 16) : 0) + t.h
  let y = cy - tot / 2
  const x = cx - iw / 2
  if (br) { putLab(g, 'brand', br, x, y, ink, 'center', iw); y += br.h + U(g, 16) }
  if (kick) { putLab(g, 'occhiello', kick, x, y, accC, 'center', iw); y += kick.h + U(g, 16) }
  putDisplay(g, 'titolo', t, x, y, ink, 'center', iw, { su: cartaC })
  if (v === 0 && !c.brand) return no(g, 'senza brand')
  const anno = riga1(g, `— n. ${1 + (k.seme % 99)} —`, s.label, iw, 16, 12, { tracking: 0.2 })
  if (anno && cy + tot / 2 + U(g, 24) + anno.h < cy + inner) scrivi(g, 'fregio', anno, s.label, x, cy + tot / 2 + U(g, 24), ink, { align: 'center', w: iw, deco: true })
  // nastro con le code a coda di rondine
  if (nf) {
    const nw = Math.min(W - 2 * m, nf.w + U(g, 120)), ny = cy + R + U(g, 30) - (v === 0 ? R * 0.18 : 0)
    const nx = cx - nw / 2, cd = U(g, 50)
    const fillN = readable(P.bg, [P.acc, acc2(g)], 1.1)
    const suN = inkSu(g, fillN, 4.5)
    put(g, { kind: 'path', name: 'code', d: poly([[nx - cd, ny + U(g, 16)], [nx + U(g, 30), ny + U(g, 16)], [nx + U(g, 30), ny + nastroH + U(g, 16)], [nx - cd, ny + nastroH + U(g, 16)], [nx - cd * 0.6, ny + nastroH / 2 + U(g, 16)]]) + ' ' + poly([[nx + nw + cd, ny + U(g, 16)], [nx + nw - U(g, 30), ny + U(g, 16)], [nx + nw - U(g, 30), ny + nastroH + U(g, 16)], [nx + nw + cd, ny + nastroH + U(g, 16)], [nx + nw + cd * 0.6, ny + nastroH / 2 + U(g, 16)]]), fill: mix(fillN, '#000000', 0.25) })
    // il nastro appena storto: ruota attorno al suo angolo, il testo con lui
    const na = -(1.5 + 3 * k.energia)
    put(g, { kind: 'rect', name: 'nastro', x: nx, y: ny, w: nw, h: nastroH, fill: fillN, angle: na })
    const ar = (na * Math.PI) / 180, oy = (nastroH - nf.h) / 2
    scrivi(g, c.cta ? 'invito' : 'dettagli', nf, s.label, nx - oy * Math.sin(ar), ny + oy * Math.cos(ar), suN, { align: 'center', w: nw, angle: na })
    if (ny + nastroH > B + U(g, 4)) return no(g, 'nastro fuori')
  }
  // il testo, se c'è posto, sotto il nastro
  const body = para(g, c.body, W - 2 * m, 2, 0)
  const by = cy + R + U(g, 40) + nastroH + U(g, 30)
  if (body && by + body.h < B) {
    put(g, { kind: 'rect', name: 'velo_testo', x: m - U(g, 24), y: by - U(g, 20), w: W - 2 * m + U(g, 48), h: body.h + U(g, 40), fill: cartaC })
    txt(g, { name: 'testo', lines: body.lines, font: s.text, size: body.size, x: m, y: by, color: ink, align: 'center', w: W - 2 * m, leading: body.leading ?? 1.4 })
  }
  if (v === 0) stratoGenerativo(g, [{ x: 0, y: 0, w: W * 0.3, h: H }, { x: W * 0.7, y: 0, w: W * 0.3, h: H }], { at: 1, probabilita: 0.7 })
  return finish(g, 'etichetta', 'Etichetta', { specchio: false })
}

/* ═══ Fumetto ═══════════════════════════════════════════════════════════ */
/**
 * Una pagina di fumetto: vignette dai bordi neri spessi su carta, una con la
 * foto retinata e le linee di velocità, il titolo in una didascalia gialla o
 * in un balloon, un'onomatopea enorme; le voci (o i dettagli) ognuna nella sua
 * vignetta con il numero in un cartiglio. Varianti: 0 didascalia, 1 balloon.
 */
export function fumetto(g: G): Scene | null {
  const { W, H, m, T, B, P, k, s, c } = g
  const v = variante(g, 2)
  const carta0 = P.dark ? '#f4f0e6' : '#fbfaf5'
  const nero = '#141414'
  const giallo = readable(nero, ['#ffe14d', P.acc, '#ffffff'], 9)
  const gut = U(g, 18), bordo = Math.max(4, U(g, 6))
  const pad = U(g, 26)
  put(g, { kind: 'rect', name: 'carta_pagina', x: 0, y: 0, w: W, h: H, fill: carta0 })
  // righe delle voci (o dei dettagli) nelle vignette di sotto
  const rs = righe(g, { max: 4, dettagli: true })
  if (!rs) return null
  const X = m * 0.6, Y = Math.max(T, m * 0.6), Wp = W - 2 * X, Hp = Math.min(B, H - m * 0.6) - Y
  // misure: vignetta del titolo
  const tW = Wp - 2 * pad - U(g, 20)
  const br = lab(g, c.brand, tW * 0.6, 20)
  const t = titolo(g, tW, Hp * 0.18, 120 + 50 * k.scala, 3, 40)
  if (!t) return no(g, 'titolo non entra')
  const titH = (br ? br.h + U(g, 14) : 0) + t.h + 2 * pad + U(g, 20)
  // vignette delle voci: due colonne
  const cols = rs.length === 1 ? 1 : 2, rows = Math.ceil(rs.length / cols)
  const vw = (Wp - gut * (cols - 1)) / cols
  const dentro = vw - 2 * pad
  const prep = rs.map(r => {
    const nome = riga1(g, r.nome, s.display, dentro, 34, 22, { upper: false, tracking: 0, lines: 2 })
    const val = r.valore ? riga1(g, r.valore, s.impact, dentro, 54, 26, { upper: false, tracking: 0 }) : null
    const tf = r.testo ? para(g, r.testo, dentro, 3, 22) : null
    return { r, nome, val, tf, h: (val ? val.h + U(g, 10) : 0) + (nome?.h ?? 0) + (tf ? tf.h + U(g, 12) : 0) + U(g, 64) + 2 * pad }
  })
  if (prep.some(x => !x.nome)) return no(g, 'voci non entrano')
  const rowH = Math.max(...prep.map(x => x.h))
  const cta = lab(g, ctaText(c), Wp * 0.7, 22)
  const ctaH = cta ? cta.h + U(g, 44) : 0
  const fotoH = Hp - titH - rows * rowH - gut * (rows + 1) - ctaH
  if (fotoH < Hp * 0.2) return no(g, 'pagina troppo piena')
  let y = Y
  // 1 · vignetta del titolo
  const tv: Box = { x: X, y, w: Wp, h: titH }
  put(g, { kind: 'rect', name: 'vignetta', ...tv, fill: carta0, stroke: nero, sw: bordo })
  if (v === 0) {
    // didascalia gialla a tutta vignetta, appena storta
    put(g, { kind: 'rect', name: 'didascalia', x: tv.x + U(g, 14), y: tv.y + U(g, 14), w: tv.w - U(g, 28), h: tv.h - U(g, 28), fill: giallo, stroke: nero, sw: Math.max(2, U(g, 3)) })
  } else {
    // balloon: ovale con la coda, un fondo pieno dentro per i testi
    const ex = tv.x + tv.w / 2, ey = tv.y + tv.h / 2, rx = tv.w * 0.49, ry = tv.h * 0.47
    put(g, { kind: 'path', name: 'balloon', d: `M ${f1(ex - rx)} ${f1(ey)} a ${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0 a ${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0 Z M ${f1(ex + rx * 0.3)} ${f1(ey + ry * 0.9)} L ${f1(ex + rx * 0.5)} ${f1(ey + ry * 1.25)} L ${f1(ex + rx * 0.45)} ${f1(ey + ry * 0.85)} Z`, fill: '#ffffff', stroke: nero, sw: Math.max(3, U(g, 4)) })
    put(g, { kind: 'rect', name: 'balloon_pieno', x: ex - rx * 0.78, y: ey - ry * 0.7, w: rx * 1.56, h: ry * 1.4, fill: '#ffffff' })
  }
  const suT = v === 0 ? giallo : '#ffffff'
  let ty = tv.y + pad + U(g, 10)
  if (br) { putLab(g, 'brand', br, tv.x, ty, nero, 'center', tv.w); ty += br.h + U(g, 14) }
  putDisplay(g, 'titolo', t, tv.x, ty, nero, 'center', tv.w, { su: suT })
  y += titH + gut
  // 2 · vignetta della foto, con le linee di velocità e l'onomatopea
  const fv: Box = { x: X, y, w: Wp, h: fotoH }
  if (g.photo) photo(g, 'foto', fv, { fx: [{ id: 'halftone', variant: 'fumetto' }] })
  else put(g, { kind: 'rect', name: 'vignetta_colore', ...fv, fill: P.acc, fx: [{ id: 'genFill', p: { mode: 1, c1: P.acc, c2: acc2(g), c3: carta0, c4: nero, grain: 20, warp: 50, scale: 100 } }] })
  // linee di velocità dal centro verso i bordi
  let dd = ''
  const cxv = fv.x + fv.w * (0.35 + 0.3 * g.r.next()), cyv = fv.y + fv.h * 0.5
  const nl = 40 + Math.round(k.energia * 40)
  for (let i = 0; i < nl; i++) {
    const a = (i / nl) * Math.PI * 2 + g.r.next() * 0.05
    // fino al bordo della vignetta (le linee non escono sulla pagina)
    const ca = Math.cos(a), sa = Math.sin(a)
    const tx = ca > 0 ? (fv.x + fv.w - cxv) / ca : ca < 0 ? (fv.x - cxv) / ca : Infinity
    const ty = sa > 0 ? (fv.y + fv.h - cyv) / sa : sa < 0 ? (fv.y - cyv) / sa : Infinity
    const r0 = Math.min(fv.w, fv.h) * (0.28 + 0.12 * g.r.next()), r1 = Math.min(tx, ty)
    if (r1 <= r0) continue
    dd += `M ${f1(cxv + Math.cos(a) * r0)} ${f1(cyv + Math.sin(a) * r0)} L ${f1(cxv + Math.cos(a) * r1)} ${f1(cyv + Math.sin(a) * r1)} `
  }
  put(g, { kind: 'path', name: 'segno_velocita', d: dd, fill: 'transparent', stroke: alpha(nero, 0.55), sw: Math.max(1.5, U(g, 2.5)), opacity: 0.4 + 0.4 * k.energia })
  put(g, { kind: 'rect', name: 'vignetta', ...fv, fill: 'transparent', stroke: nero, sw: bordo })
  // onomatopea: decorativa, enorme, storta, con il contorno nero
  const ono = sceglie(g, 'ono', ['WOW!', 'BAM!', 'ZAP!', 'POP!', 'WHAM!', 'SBAM!'])
  const os = Math.min(fv.h * 0.32, U(g, 200))
  const ow = lineWidth(ono, s.impact, os, 0.02)
  if (ow < fv.w * 0.7) {
    const ox = fv.x + fv.w - ow - U(g, 30), oy = fv.y + fv.h - os * 1.3 - U(g, 10), oa = -10 - 8 * k.energia
    txt(g, { name: 'onomatopea_ombra', lines: [ono], font: s.impact, size: os, x: ox + U(g, 8), y: oy + U(g, 8), color: nero, angle: oa, tracking: 0.02, deco: true })
    txt(g, { name: 'onomatopea', lines: [ono], font: s.impact, size: os, x: ox, y: oy, color: giallo, angle: oa, tracking: 0.02, deco: true, stroke: nero, sw: Math.max(3, os * 0.04) })
  }
  // cartellino storto in un angolo della vignetta
  const ep = riga1(g, `ep. ${1 + (k.seme % 12)}`, s.label, U(g, 200), 20, 14, { tracking: 0.14 })
  if (ep) { put(g, { kind: 'rect', name: 'cartellino', x: fv.x + U(g, 20), y: fv.y + U(g, 22), w: ep.w + U(g, 28), h: ep.h + U(g, 18), fill: '#ffffff', stroke: nero, sw: Math.max(2, U(g, 3)), angle: -5 }); scrivi(g, 'cartellino_testo', ep, s.label, fv.x + U(g, 34), fv.y + U(g, 30), nero, { angle: -5, deco: true }) }
  y += fotoH + gut
  // 3 · le vignette delle voci
  let messe = 0, testi = 0
  prep.forEach((x, i) => {
    const col = i % cols, row = Math.floor(i / cols)
    const b: Box = { x: X + col * (vw + gut), y: y + row * (rowH + gut), w: vw, h: rowH }
    put(g, { kind: 'rect', name: 'vignetta', ...b, fill: i % 2 ? carta0 : mix(carta0, giallo, 0.18), stroke: nero, sw: bordo })
    const nf = riga1(g, String(i + 1), s.label, U(g, 80), 20, 14, { tracking: 0.1 })
    if (nf) { put(g, { kind: 'rect', name: 'numero_cartiglio', x: b.x, y: b.y, w: nf.w + pad + U(g, 18), h: nf.h + U(g, 36), fill: giallo, stroke: nero, sw: Math.max(2, U(g, 3)) }); scrivi(g, `numero_${i}`, nf, s.label, b.x + pad, b.y + U(g, 18), nero) }
    let yy = b.y + pad + U(g, 50)
    const su = i % 2 ? carta0 : mix(carta0, giallo, 0.18)
    if (x.val) { scrivi(g, `valore_${i}`, x.val, s.impact, b.x + pad, yy, readable(su, [P.acc, nero], 3.4)); yy += x.val.h + U(g, 10) }
    scrivi(g, `voce_${i}`, x.nome!, s.display, b.x + pad, yy, nero)
    yy += x.nome!.h
    if (x.tf) { yy += U(g, 12); txt(g, { name: `testo_${i}`, lines: x.tf.lines, font: s.text, size: x.tf.size, x: b.x + pad, y: yy, color: '#2a2a2a', leading: x.tf.leading ?? 1.35 }); testi++ }
    messe++
  })
  if (conVoci(g) && !elencoRiuscito(g, rs, messe, testi)) return null
  y += rows * rowH + (rows - 1) * gut + gut
  if (cta) {
    put(g, { kind: 'rect', name: 'didascalia', x: X + Wp - cta.w - U(g, 44), y, w: cta.w + U(g, 44), h: cta.h + U(g, 36), fill: giallo, stroke: nero, sw: Math.max(2, U(g, 3)) })
    putLab(g, 'invito', cta, X + Wp - cta.w - U(g, 22), y + U(g, 18), nero)
  }
  return finish(g, 'fumetto', 'Fumetto', { specchio: false })
}
