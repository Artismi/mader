/**
 * Archetipi del gruppo D (seconda parte) · digitale e notte: brutale,
 * agenzia, pixel, manga, aero, acido. Compongono con la materia e con i
 * generatori del motore effetti (cromo, retino, mosaico, riempimenti
 * generativi) a strati; i testi stanno sempre su un fondo pieno. Brutale,
 * agenzia e pixel impaginano anche le voci (indici, tabelle, classifiche).
 */
import type { Scene } from '../../types'
import { type G, put, U, txt, para, photo, finish, mix, alpha, readable, keyword, ctaText } from '../tools'
import { blobPath, starPath, wobblyPath } from '../forme'
import { lineWidth } from '../../text'
import { sceglie, dettaglio, stratoGenerativo } from '../materia'
import { onomatopeeAmmesse, giapponeseAmmesso } from '../affinita'
import { righe, conVoci, valoreProtagonista, elencoRiuscito } from './voci'
import {
  no, variante, mono, inkSu, scuro, chiaro, acc2, f1, poly, rectD, riga1, scrivi, tinteSu, blocco, titolo, putDisplay, putLab, lab, type Box, type Pt,
} from './comune'

/* ═══ Brutale ═══════════════════════════════════════════════════════════ */
/**
 * Pagina web senza stile: barra dell'indirizzo, un blocco nero al vivo con il
 * titolo enorme in bianco, la sua eco gigante che esce dalla tavola, filetti
 * da tabella, link sottolineati, la foto in bianco e nero sparata con un
 * bordo di un pixel. Varianti: 0 fondo d'allarme (accento), 1 pagina bianca.
 */
export function brutale(g: G): Scene | null {
  const { W, H, m, T, B, P, k, s, c } = g
  const v = variante(g, 2)
  const fondo = v === 0 ? readable('#111111', [P.acc, acc2(g), '#ff4a1c'], 5) : '#f6f6f2'
  const nero = '#0d0d0d'
  const ink = inkSu(g, fondo, 7)
  const font = mono(g)
  put(g, { kind: 'rect', name: 'pagina', x: 0, y: 0, w: W, h: H, fill: fondo })
  // eco gigante del titolo, decorativa, che esce dai bordi
  const eco = keyword(g).toUpperCase()
  const es = Math.min(H * 0.36, sizeFor(g, eco, W * 1.25))
  txt(g, { name: 'eco', lines: [eco], font: s.impact, size: es, x: -W * 0.08, y: H - es * 0.95, color: ink, opacity: 0.1, deco: true, tracking: -0.03 })
  // barra dell'indirizzo con il brand
  const barH = U(g, 64)
  const barY = Math.max(0, T - U(g, 18))
  put(g, { kind: 'rect', name: 'barra', x: 0, y: barY, w: W, h: barH, fill: v === 0 ? nero : '#e2e2dc' })
  const suBar = inkSu(g, v === 0 ? nero : '#e2e2dc', 7)
  const br = c.brand ? riga1(g, c.brand, font, W * 0.4, 22, 16, { tracking: 0.04, upper: false }) : null
  if (c.brand && !br) return no(g, 'brand')
  const url = riga1(g, `https://${(c.brand || 'pagina').toLowerCase().replace(/[^a-z0-9]+/g, '')}.it/${(keyword(g) || 'index').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, font, W * 0.5, 18, 12, { upper: false, tracking: 0 })
  if (url && br && m + br.w + U(g, 40) < W - m - url.w) scrivi(g, 'indirizzo', url, font, W - m - url.w, barY + (barH - url.h) / 2, suBar, { deco: true, opacity: 0.75 })
  // il blocco del titolo, al vivo a sinistra
  const tW = W - 2 * m - U(g, 40)
  const t = titolo(g, tW, (B - T) * 0.32, 170 + 80 * k.scala, 4, 48)
  if (!t) return no(g, 'titolo non entra')
  const pad = U(g, 40)
  const bY = barY + barH + U(g, 40)
  const bW = Math.min(W, m + t.w + pad + U(g, 30))
  put(g, { kind: 'rect', name: 'blocco', x: 0, y: bY, w: bW, h: t.h + 2 * pad, fill: nero })
  const tEl = putDisplay(g, 'titolo', t, m, bY + pad, '#ffffff', 'left', t.w, { su: nero, caps: false })
  if (br) scrivi(g, 'brand', br, font, tEl.x, barY + (barH - br.h) / 2, suBar)
  let y = bY + t.h + 2 * pad + U(g, 40)
  // il contenuto: a sinistra (o a tutta larghezza con le voci); la foto a destra o sotto
  const conFoto = !!g.photo
  const largo = conVoci(g) || !conFoto || g.landscape === false && g.format === 'quadrato'
  const iW = largo ? W - 2 * m : (W - 2 * m) * 0.5
  const info = blocco(g, iW, { kicker: true, cta: false, bodyLines: 4 })
  if (!info) return null
  const cta = lab(g, ctaText(c).replace(/\s*→$/, ''), iW, 24)
  const restaFoto = B - y - info.h - (cta ? cta.h + U(g, 40) : 0) - U(g, 40)
  // filetti da tabella sopra e sotto il contenuto
  put(g, { kind: 'line', name: 'filetto', x1: m, y1: y - U(g, 20), x2: W - m, y2: y - U(g, 20), color: ink, width: Math.max(1, U(g, 2)) })
  y = info.place(m, y, tinteSu(g, fondo))
  if (cta) {
    y += U(g, 30)
    putLab(g, 'invito', cta, m, y, ink)
    put(g, { kind: 'line', name: 'sottolineatura', x1: m, y1: y + cta.h + U(g, 4), x2: m + cta.w, y2: y + cta.h + U(g, 4), color: ink, width: Math.max(2, U(g, 3)) })
    y += cta.h
  }
  if (y > B + U(g, 4)) return no(g, 'pagina troppo lunga')
  let fotoMessa = false
  if (conFoto) {
    const fb: Box = largo ? { x: W * 0.38, y: y + U(g, 40), w: W * 0.62, h: H - (y + U(g, 40)) } : { x: m + iW + U(g, 40), y: bY + t.h + 2 * pad + U(g, 40), w: W - (m + iW + U(g, 40)), h: Math.min(B, H) - (bY + t.h + 2 * pad + U(g, 40)) }
    if (fb.h > H * 0.14 && (largo ? restaFoto > H * 0.12 : true)) {
      photo(g, 'foto', fb, { look: 'trix', adjust: { grain: 35, contrast: 35 } })
      fotoMessa = true
      put(g, { kind: 'rect', name: 'bordo_foto', ...fb, fill: 'transparent', stroke: nero, sw: Math.max(2, U(g, 2)) })
      const tag = riga1(g, `img_${String(k.seme % 1000).padStart(3, '0')}.jpg`, font, fb.w * 0.6, 16, 12, { upper: false, tracking: 0 })
      if (tag) { put(g, { kind: 'rect', name: 'targhetta', x: fb.x, y: fb.y, w: tag.w + U(g, 24), h: tag.h + U(g, 14), fill: nero }); scrivi(g, 'nome_file', tag, font, fb.x + U(g, 12), fb.y + U(g, 7), '#ffffff', { deco: true }) }
    }
  }
  if (!fotoMessa && B - y > H * 0.15) stratoGenerativo(g, [{ x: 0, y: y + U(g, 30), w: W, h: H - y - U(g, 30) }], { at: 1, probabilita: 0.85 })
  return finish(g, 'brutale', 'Brutalista', { specchio: false })
}
/** Corpo con cui una parola occupa una larghezza nel carattere da manifesto. */
function sizeFor(g: G, text: string, w: number) { return (100 * w) / Math.max(1, lineWidth(text, g.s.impact, 100, -0.03)) }

/* ═══ Agenzia ═══════════════════════════════════════════════════════════ */
/**
 * Il sito di uno studio: nero e un colore acceso, barra di navigazione,
 * titolo grande a bandiera, indici enormi (01, 02…) con le voci o i
 * dettagli su una griglia di filetti sottili, la foto al vivo con
 * un'etichetta tecnica e il mirino, l'occhiello in verticale sul bordo.
 * Varianti: 0 indice sotto il titolo, 1 foto in alto e indice a due colonne.
 */
export function agenzia(g: G): Scene | null {
  const { W, H, m, T, B, P, k, s, c } = g
  const v = variante(g, 2)
  const nero = mix(scuro(g), '#000000', 0.55)
  const bianco = '#f2f1ee'
  const vivo = readable(nero, [P.acc, acc2(g), '#ff5a1f'], 4.5)
  const font = mono(g)
  put(g, { kind: 'rect', name: 'fondo_nero', x: 0, y: 0, w: W, h: H, fill: nero })
  // griglia di colonne sottili
  let gd = ''
  for (let i = 1; i < 6; i++) { const x = m + ((W - 2 * m) * i) / 6; gd += `M ${f1(x)} 0 L ${f1(x)} ${f1(H)} ` }
  put(g, { kind: 'path', name: 'griglia', d: gd, fill: 'transparent', stroke: alpha(bianco, 0.07), sw: Math.max(1, g.u) })
  // navigazione
  const br = lab(g, c.brand, W * 0.4, 22)
  if (c.brand && !br) return no(g, 'brand')
  if (br) putLab(g, 'brand', br, m, T, bianco)
  const nav = riga1(g, 'lavori   studio   contatti', font, W * 0.45, 18, 12, { tracking: 0.08 })
  if (nav && br && m + br.w + U(g, 50) < W - m - nav.w) scrivi(g, 'navigazione', nav, font, W - m - nav.w, T, bianco, { deco: true, opacity: 0.7 })
  const navH = Math.max(br?.h ?? 0, U(g, 24))
  put(g, { kind: 'line', name: 'filetto', x1: m, y1: T + navH + U(g, 22), x2: W - m, y2: T + navH + U(g, 22), color: alpha(bianco, 0.35), width: Math.max(1, g.u) })
  // occhiello in verticale lungo il bordo sinistro (ruotato)
  const kick = lab(g, c.kicker, (B - T) * 0.5, 18)
  const left = kick ? m + kick.h + U(g, 30) : m
  const tW = W - left - m
  const t = titolo(g, tW, (B - T) * (v === 1 ? 0.24 : 0.3), 160 + 70 * k.scala, 4, 46)
  if (!t) return no(g, 'titolo non entra')
  let y = T + navH + U(g, 60)
  // foto (variante 1) al vivo sotto la navigazione
  const rs = righe(g, { max: 6, dettagli: true })
  if (!rs) return null
  if (v === 1 && g.photo) {
    const ph = (B - T) * 0.26
    photo(g, 'foto', { x: 0, y, w: W, h: ph }, { look: 'trix', adjust: { grain: 25, contrast: 25 } })
    put(g, { kind: 'rect', name: 'tinta_foto', x: 0, y, w: W, h: ph, fill: vivo, blend: 'multiply', opacity: 0.55 })
    mirinoAg(g, W * 0.7, y + ph * 0.5, Math.min(ph * 0.3, U(g, 70)), bianco)
    const tag = riga1(g, `[ fig. ${String(1 + (k.seme % 9)).padStart(2, '0')} — ${keyword(g).toLowerCase()} ]`, font, W * 0.5, 16, 12, { upper: false, tracking: 0.04 })
    if (tag) { put(g, { kind: 'rect', name: 'targhetta', x: m, y: y + ph - tag.h - U(g, 30), w: tag.w + U(g, 24), h: tag.h + U(g, 16), fill: nero }); scrivi(g, 'didascalia', tag, font, m + U(g, 12), y + ph - tag.h - U(g, 22), bianco, { deco: true }) }
    y += ph + U(g, 50)
  }
  if (kick) {
    putLab(g, 'occhiello', kick, m, y + kick.w, vivo, 'left', kick.w, { angle: -90 })
  }
  putDisplay(g, 'titolo', t, left, y, bianco, 'left', t.w, { su: nero })
  y += t.h + U(g, 50)
  // indice: numero enorme nell'accento, voce accanto, filetto sopra ogni riga
  const cols = v === 1 && rs.length > 3 && !g.portrait ? 2 : 1
  const colW = (W - left - m - (cols - 1) * U(g, 40)) / cols
  const nsz = Math.min(U(g, 120), (B - y) / Math.ceil(rs.length / cols) * 0.7)
  const numW = Math.max(...rs.map((_, i) => lineWidth(String(i + 1).padStart(2, '0'), s.impact, nsz, -0.02))) + U(g, 24)
  const prot = valoreProtagonista(g)
  let messe = 0, testi = 0
  const rowsH: number[] = []
  const prep = rs.map(r => {
    const nf = riga1(g, r.nome, s.display, colW - numW - (r.valore && !prot ? U(g, 120) : 0), 34, 20, { lettura: true, upper: false, tracking: 0, lines: 2 })
    const vf = r.valore ? riga1(g, r.valore, prot ? s.impact : font, prot ? colW - numW : U(g, 160), prot ? 56 : 20, 16, { upper: false, tracking: 0 }) : null
    const tf = r.testo ? para(g, r.testo, colW - numW, 2, 22) : null
    const h = Math.max(nsz * 1.05, (prot && vf ? vf.h + U(g, 8) : 0) + (nf?.h ?? 0) + (tf ? tf.h + U(g, 12) : 0)) + U(g, 28)
    rowsH.push(h)
    return { r, nf, vf, tf }
  })
  const rows = Math.ceil(rs.length / cols)
  const totH = Array.from({ length: rows }, (_, j) => Math.max(...prep.map((_, i) => (Math.floor(i / cols) === j ? rowsH[i] : 0)))).reduce((a, b) => a + b, 0)
  const cta = lab(g, ctaText(c), W - 2 * m, 22)
  if (y + totH + (cta ? cta.h + U(g, 30) : 0) > B + U(g, 4)) return no(g, 'indice troppo lungo')
  let ry = y
  for (let j = 0; j < rows; j++) {
    const rh = Math.max(...prep.map((_, i) => (Math.floor(i / cols) === j ? rowsH[i] : 0)))
    prep.forEach((x, i) => {
      if (Math.floor(i / cols) !== j || !x.nf) return
      const cx = left + (i % cols) * (colW + U(g, 40))
      put(g, { kind: 'line', name: 'filetto', x1: cx, y1: ry, x2: cx + colW, y2: ry, color: alpha(bianco, 0.3), width: Math.max(1, g.u) })
      txt(g, { name: `numero_${i}`, lines: [String(i + 1).padStart(2, '0')], font: s.impact, size: nsz, x: cx, y: ry + U(g, 14), color: vivo, leading: 1, tracking: -0.02 })
      let yy = ry + U(g, 18)
      if (x.vf && prot) { scrivi(g, `valore_${i}`, x.vf, s.impact, cx + numW, yy, vivo); yy += x.vf.h + U(g, 8) }
      scrivi(g, `voce_${i}`, x.nf, s.display, cx + numW, yy, bianco)
      if (x.vf && !prot) scrivi(g, `valore_${i}`, x.vf, font, cx + colW - x.vf.w, yy + U(g, 4), vivo)
      yy += x.nf.h
      if (x.tf) { yy += U(g, 12); txt(g, { name: `testo_${i}`, lines: x.tf.lines, font: s.text, size: x.tf.size, x: cx + numW, y: yy, color: mix(bianco, nero, 0.25), leading: x.tf.leading ?? 1.35 }); testi++ }
      messe++
    })
    ry += rh
  }
  if (conVoci(g) && !elencoRiuscito(g, rs, messe, testi)) return null
  if (cta) {
    const cy = Math.max(ry + U(g, 20), B - cta.h)
    putLab(g, 'invito', cta, left, cy, vivo)
  }
  // foto (variante 0) nello spazio che resta in basso, al vivo a destra
  if (v === 0 && g.photo) {
    const py = ry + U(g, 30) + (cta ? cta.h + U(g, 30) : 0)
    if (H - py > H * 0.16) {
      const fb = { x: W * 0.42, y: py, w: W * 0.58, h: H - py }
      photo(g, 'foto', fb, { look: 'trix', adjust: { grain: 25, contrast: 25 } })
      put(g, { kind: 'rect', name: 'tinta_foto', ...fb, fill: vivo, blend: 'multiply', opacity: 0.5 })
      mirinoAg(g, fb.x + fb.w * 0.5, fb.y + fb.h * 0.5, Math.min(fb.h * 0.25, U(g, 60)), bianco)
    }
  }
  if (!g.els.some(e => e.name === 'foto') && B - ry > H * 0.14) stratoGenerativo(g, [{ x: 0, y: ry + U(g, 30), w: W, h: H - ry - U(g, 30) }], { at: 2, probabilita: 0.85 })
  return finish(g, 'agenzia', 'Studio', { specchio: false })
}
function mirinoAg(g: G, cx: number, cy: number, r: number, color: string) {
  put(g, { kind: 'circle', name: 'mirino', cx, cy, r, fill: 'transparent', stroke: color, sw: Math.max(1.5, U(g, 2)) })
  put(g, { kind: 'path', name: 'mirino', d: `M ${f1(cx - r * 1.5)} ${f1(cy)} L ${f1(cx + r * 1.5)} ${f1(cy)} M ${f1(cx)} ${f1(cy - r * 1.5)} L ${f1(cx)} ${f1(cy + r * 1.5)}`, fill: 'transparent', stroke: color, sw: Math.max(1, U(g, 1.5)) })
}

/* ═══ Pixel ═════════════════════════════════════════════════════════════ */
/**
 * Schermata di un videogioco: barra del punteggio con il brand e le vite a
 * cuori di pixel, il titolo con l'ombra a blocchi, la foto ridotta a pixel
 * grandi in una cornice a gradini, una finestra di dialogo in basso con il
 * testo (o la classifica delle voci). Varianti: 0 notte, 1 cartuccia chiara.
 */
export function pixel(g: G): Scene | null {
  const { W, H, m, T, B, P, k, s, c } = g
  const v = variante(g, 2)
  const font = mono(g)
  const schermo = v === 0 ? mix(scuro(g), '#0b0b1a', 0.5) : mix('#c4d39a', P.acc, 0.1)
  const ink = inkSu(g, schermo, 7)
  const vivo = readable(schermo, [P.acc, acc2(g), v === 0 ? '#ffd23f' : '#d6336c'], 3.6)
  const px = U(g, 8)
  put(g, { kind: 'rect', name: 'schermo', x: 0, y: 0, w: W, h: H, fill: schermo })
  // griglia di pixel appena visibile
  let gd = ''
  for (let x = px * 4; x < W; x += px * 4) gd += `M ${f1(x)} 0 L ${f1(x)} ${f1(H)} `
  for (let y = px * 4; y < H; y += px * 4) gd += `M 0 ${f1(y)} L ${f1(W)} ${f1(y)} `
  put(g, { kind: 'path', name: 'griglia_pixel', d: gd, fill: 'transparent', stroke: alpha(ink, 0.05), sw: Math.max(1, g.u) })
  // barra del punteggio
  const hudH = U(g, 76)
  const hudY = Math.max(0, T - U(g, 20))
  put(g, { kind: 'rect', name: 'barra_punti', x: 0, y: hudY, w: W, h: hudH, fill: v === 0 ? '#000000' : ink })
  const suH = v === 0 ? '#ffffff' : schermo
  const br = c.brand ? riga1(g, c.brand, font, W * 0.36, 22, 14, { tracking: 0.08 }) : null
  if (c.brand && !br) return no(g, 'brand')
  if (br) scrivi(g, 'brand', br, font, m, hudY + (hudH - br.h) / 2, suH)
  const punti = riga1(g, `score ${String((k.seme * 37) % 1000000).padStart(6, '0')}`, font, W * 0.3, 20, 12, { tracking: 0.08 })
  if (punti && br) scrivi(g, 'punteggio', punti, font, (W - punti.w) / 2, hudY + (hudH - punti.h) / 2, suH, { deco: true })
  // le vite: cuori di pixel
  const cuore = ['01100110', '11111111', '11111111', '01111110', '00111100', '00011000']
  const q = U(g, 4.5)
  for (let h = 0; h < 3; h++) {
    let dd = ''
    const ox = W - m - (3 - h) * (8 * q + U(g, 12)), oy = hudY + (hudH - 6 * q) / 2
    cuore.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') dd += rectD({ x: ox + i * q, y: oy + j * q, w: q, h: q }) + ' ' }))
    put(g, { kind: 'path', name: 'vita', d: dd, fill: h < 2 ? '#ff4d6d' : alpha('#ff4d6d', 0.3) })
  }
  // la finestra di dialogo in basso (testo, o la classifica delle voci)
  const dW = W - 2 * m
  const pad = U(g, 34)
  const info = blocco(g, dW - 2 * pad, { kicker: false, bodyLines: 3 })
  if (!info) return null
  const dH = info.h + 2 * pad
  const dY = B - dH
  // il titolo con l'ombra a blocchi
  const kick = lab(g, c.kicker ? `> ${c.kicker}` : '', dW, 20)
  const top = hudY + hudH + U(g, 44)
  const t = titolo(g, dW, (dY - top) * 0.45, 150 + 60 * k.scala, 3, 44)
  if (!t) return no(g, 'titolo non entra')
  let y = top
  if (kick) { putLab(g, 'occhiello', kick, m, y, vivo, 'left', kick.w, { font }); y += kick.h + U(g, 16) }
  const sh = Math.max(px, U(g, 8))
  txt(g, { name: 'ombra_titolo', lines: t.lines, font: s.display, size: t.size, x: m + sh, y: y + sh, color: vivo, leading: t.leading ?? s.displayLeading, tracking: t.tracking ?? s.displayTracking, deco: true })
  txt(g, { name: 'ombra_titolo', lines: t.lines, font: s.display, size: t.size, x: m + sh * 2, y: y + sh * 2, color: v === 0 ? '#000000' : ink, opacity: 0.6, leading: t.leading ?? s.displayLeading, tracking: t.tracking ?? s.displayTracking, deco: true })
  putDisplay(g, 'titolo', t, m, y, ink, 'left', t.w, { su: schermo, chars: undefined })
  y += t.h + U(g, 40)
  // la foto a pixel in una cornice a gradini, nello spazio tra titolo e dialogo
  const fH = dY - U(g, 40) - y
  if (fH > H * 0.14) {
    const fW = Math.min(W - 2 * m, fH * (g.photo ? 1.5 : 2.2))
    const fx0 = W - m - fW
    const st = U(g, 10)
    const cornice: Pt[] = [[fx0 + st, y - st], [fx0 + fW - st, y - st], [fx0 + fW - st, y], [fx0 + fW, y], [fx0 + fW, y + st], [fx0 + fW + st, y + st], [fx0 + fW + st, y + fH - st], [fx0 + fW, y + fH - st], [fx0 + fW, y + fH], [fx0 + fW - st, y + fH], [fx0 + fW - st, y + fH + st], [fx0 + st, y + fH + st], [fx0 + st, y + fH], [fx0, y + fH], [fx0, y + fH - st], [fx0 - st, y + fH - st], [fx0 - st, y + st], [fx0, y + st], [fx0, y], [fx0 + st, y]]
    put(g, { kind: 'path', name: 'cornice', d: poly(cornice), fill: ink })
    const pb = { x: fx0 + st, y: y + st, w: fW - 2 * st, h: fH - 2 * st }
    if (g.photo) photo(g, 'foto', pb, { fx: [{ id: 'mosaic', variant: 'pixel', p: { size: Math.round(10 + 10 * (1 - k.densita)) } }, { id: 'posterize', variant: 'tre' }] })
    else {
      // senza foto: un paesaggio a blocchi (cielo, colline, sole)
      put(g, { kind: 'rect', name: 'cielo', ...pb, fill: mix(vivo, schermo, 0.6) })
      let dd = ''
      const b0 = U(g, 24)
      for (let x = pb.x; x < pb.x + pb.w; x += b0) { const hh = pb.h * (0.25 + 0.2 * Math.sin((x - pb.x) / (pb.w * 0.18) + k.seme)); dd += rectD({ x, y: pb.y + pb.h - Math.round(hh / b0) * b0, w: b0, h: Math.round(hh / b0) * b0 }) + ' ' }
      put(g, { kind: 'path', name: 'colline', d: dd, fill: mix(acc2(g), '#000000', 0.2) })
      put(g, { kind: 'rect', name: 'sole', x: pb.x + pb.w * 0.7, y: pb.y + pb.h * 0.15, w: b0 * 3, h: b0 * 3, fill: vivo })
    }
  }
  // dialogo: doppio bordo
  put(g, { kind: 'rect', name: 'dialogo', x: m, y: dY, w: dW, h: dH, fill: '#000000' })
  put(g, { kind: 'rect', name: 'dialogo_bordo', x: m + U(g, 8), y: dY + U(g, 8), w: dW - U(g, 16), h: dH - U(g, 16), fill: 'transparent', stroke: '#ffffff', sw: Math.max(3, U(g, 4)) })
  info.place(m + pad, dY + pad, { fg: '#ffffff', sec: '#d8d8d8', acc: readable('#000000', [vivo, '#ffd23f'], 4.5) })
  // righe dello schermo in sovrastampa e un bollino storto («1UP»)
  let sd = ''
  for (let yy = 0; yy < H; yy += U(g, 6)) sd += `M 0 ${f1(yy)} L ${f1(W)} ${f1(yy)} `
  put(g, { kind: 'path', name: 'righe_schermo', d: sd, fill: 'transparent', stroke: '#000000', sw: Math.max(1, U(g, 1.5)), blend: 'multiply', opacity: 0.12 })
  const up1 = riga1(g, sceglie(g, 'bollino', ['1up', 'new!', 'start', 'lv. 1']), font, U(g, 200), 22, 14, { tracking: 0.1 })
  if (up1) {
    const bx = m + U(g, 10), by2 = dY - up1.h - U(g, 60)
    put(g, { kind: 'rect', name: 'bollino', x: bx, y: by2, w: up1.w + U(g, 30), h: up1.h + U(g, 20), fill: vivo, angle: -8 })
    scrivi(g, 'bollino_testo', up1, font, bx + U(g, 15), by2 + U(g, 10), inkSu(g, vivo, 4.5), { angle: -8, deco: true })
  }
  // freccina lampeggiante del dialogo
  put(g, { kind: 'path', name: 'freccina', d: poly([[m + dW - U(g, 50), dY + dH - U(g, 40)], [m + dW - U(g, 26), dY + dH - U(g, 40)], [m + dW - U(g, 38), dY + dH - U(g, 26)]]), fill: '#ffffff' })
  return finish(g, 'pixel', 'Pixel', { specchio: false })
}

/* ═══ Manga ═════════════════════════════════════════════════════════════ */
/**
 * Una tavola di manga: due vignette separate da un taglio diagonale, la foto
 * in bianco e nero retinata con le linee di velocità, l'onomatopea enorme,
 * l'occhiello in verticale, il titolo e il testo nella vignetta di sotto con
 * un campo di retino. Varianti: 0 taglio che scende verso destra, 1 verso sinistra.
 */
export function manga(g: G): Scene | null {
  const { W, H, m, T, B, P, k, s, c } = g
  if (conVoci(g)) return no(g, 'manga: niente voci')
  const v = variante(g, 2)
  const carta0 = '#f7f5ef', nero = '#121212'
  const gut = U(g, 22), bordo = Math.max(4, U(g, 6))
  put(g, { kind: 'rect', name: 'carta_pagina', x: 0, y: 0, w: W, h: H, fill: carta0 })
  // misure del contenuto (vignetta di sotto)
  const iw = W - 2 * m - U(g, 40)
  const info = blocco(g, iw, { kicker: false, bodyLines: 3 })
  if (!info) return null
  const br = lab(g, c.brand, iw, 20)
  const t = titolo(g, iw, (B - T) * 0.22, 140 + 60 * k.scala, 3, 44)
  if (!t) return no(g, 'titolo non entra')
  const pad = U(g, 30)
  const bassoH = (br ? br.h + U(g, 16) : 0) + t.h + U(g, 30) + info.h + 2 * pad
  // il taglio: la vignetta alta finisce in diagonale
  const X0 = m * 0.6, X1 = W - m * 0.6, Y0 = Math.max(m * 0.6, T - U(g, 30))
  const sl = Math.min(U(g, 120), (B - Y0) * 0.08) * (v === 0 ? 1 : -1)
  const yb = Math.min(B, H - m * 0.6) - bassoH - gut - Math.abs(sl)
  if (yb - Y0 < H * 0.28) return no(g, 'vignetta alta troppo bassa')
  const alta: Pt[] = [[X0, Y0], [X1, Y0], [X1, yb + (sl > 0 ? sl : 0)], [X0, yb + (sl < 0 ? -sl : 0)]]
  const altaBox = { x: X0, y: Y0, w: X1 - X0, h: yb + Math.abs(sl) - Y0 }
  if (g.photo) photo(g, 'foto', altaBox, { mask: poly(alta), look: 'trix', adjust: { grain: 30, contrast: 40 }, fx: [{ id: 'halftone', p: { mode: 0, ink: nero, paper: carta0, paperOn: 1, size: Math.round(5 + 4 * k.densita), angle: 45 } }] })
  else put(g, { kind: 'path', name: 'vignetta_colore', d: poly(alta), fill: P.acc, fx: [{ id: 'genFill', p: { mode: 3, c1: nero, c2: P.acc, c3: carta0, c4: nero, grain: 30, warp: 70, scale: 120 } }] })
  // linee di velocità dentro la vignetta alta (convergono sul soggetto)
  const cx = X0 + (X1 - X0) * (0.4 + 0.2 * g.r.next()), cy = Y0 + (yb - Y0) * 0.45
  let dd = ''
  const nl = 50 + Math.round(60 * k.energia)
  for (let i = 0; i < nl; i++) {
    const a = (i / nl) * Math.PI * 2 + g.r.next() * 0.04
    const ca = Math.cos(a), sa = Math.sin(a)
    const tx = ca > 0 ? (X1 - cx) / ca : ca < 0 ? (X0 - cx) / ca : Infinity
    const ty = sa > 0 ? (yb - cx * 0 - cy) / sa : sa < 0 ? (Y0 - cy) / sa : Infinity
    const r1 = Math.min(tx, ty), r0 = Math.min(X1 - X0, yb - Y0) * (0.22 + 0.1 * g.r.next())
    if (r1 <= r0) continue
    // linea a cuneo: larga al bordo, a punta verso il centro
    const w2 = U(g, 3 + 5 * g.r.next())
    dd += poly([[cx + ca * r0, cy + sa * r0], [cx + ca * r1 - sa * w2, cy + sa * r1 + ca * w2], [cx + ca * r1 + sa * w2, cy + sa * r1 - ca * w2]]) + ' '
  }
  put(g, { kind: 'path', name: 'segno_velocita', d: dd, fill: nero, opacity: 0.75 })
  put(g, { kind: 'path', name: 'bordo_vignetta', d: poly(alta), fill: 'transparent', stroke: nero, sw: bordo })
  // onomatopea in katakana di fantasia: decorativa, storta, con il contorno
  // katakana solo se il brief parla di Giappone o manga; altrimenti latine se il tono le consente, o niente
  const ono = giapponeseAmmesso(g.c) ? sceglie(g, 'ono', ['ドドド', 'ゴゴゴ', 'バン!', 'ザッ']) : onomatopeeAmmesse(g.c) ? sceglie(g, 'ono', ['BAM!', 'ZOOM!', 'WHAM!']) : ''
  const os = Math.min((yb - Y0) * 0.24, U(g, 220))
  if (ono) txt(g, { name: 'onomatopea', lines: [ono], font: s.impact, size: os, x: X0 + U(g, 40), y: Y0 + U(g, 40), color: '#ffffff', stroke: nero, sw: Math.max(3, os * 0.06), angle: 8 + 6 * k.energia, deco: true })
  // occhiello in verticale in un cartiglio bianco sul lato
  const kick = lab(g, c.kicker, (yb - Y0) * 0.6, 22)
  if (kick) {
    const kx = v === 0 ? X1 - kick.h - U(g, 50) : X0 + U(g, 30), ky = Y0 + U(g, 40)
    put(g, { kind: 'rect', name: 'cartiglio', x: kx, y: ky, w: kick.h + U(g, 36), h: kick.w + U(g, 36), fill: carta0, stroke: nero, sw: Math.max(2, U(g, 3)) })
    putLab(g, 'occhiello', kick, kx + U(g, 18) + kick.h, ky + U(g, 18), nero, 'left', kick.w, { angle: 90 })
  }
  // vignetta bassa: titolo, testo, retino in un angolo
  const bassa: Box = { x: X0, y: yb + Math.abs(sl) + gut, w: X1 - X0, h: Math.min(B, H - m * 0.6) - (yb + Math.abs(sl) + gut) }
  if (bassa.h < bassoH - U(g, 4)) return no(g, 'vignetta bassa piccola')
  put(g, { kind: 'rect', name: 'vignetta', ...bassa, fill: carta0, stroke: nero, sw: bordo })
  // campo di retino sfumato nell'angolo opposto al testo
  let rd = ''
  const st = U(g, 16)
  for (let y = bassa.y + st; y < bassa.y + bassa.h; y += st) for (let x = bassa.x + bassa.w * 0.55; x < bassa.x + bassa.w - st / 2; x += st) { const r = st * 0.42 * ((x - bassa.x - bassa.w * 0.55) / (bassa.w * 0.45)); if (r > 0.8) rd += `M ${f1(x - r)} ${f1(y)} a ${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0 a ${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0 ` }
  put(g, { kind: 'path', name: 'retino', d: rd, fill: alpha(nero, 0.22) })
  let y = bassa.y + pad
  const x = bassa.x + pad
  if (br) { putLab(g, 'brand', br, x, y, nero); y += br.h + U(g, 16) }
  putDisplay(g, 'titolo', t, x, y, nero, 'left', t.w, { su: carta0 })
  y += t.h + U(g, 30)
  info.place(x, y, { fg: nero, sec: '#3a3a3a', acc: readable(carta0, [P.acc, acc2(g), nero], 4.5) })
  return finish(g, 'manga', 'Manga', { specchio: v === 0 })
}

/* ═══ Aero ══════════════════════════════════════════════════════════════ */
/**
 * Frutiger aero: cielo sfumato, bolle lucide con il riflesso, onde morbide,
 * un pannello di vetro arrotondato con il contenuto, la foto in un riquadro
 * tondo con il lucido sopra. Varianti: 0 pannello in basso, 1 pannello a lato.
 */
export function aero(g: G): Scene | null {
  const { W, H, m, T, B, P, k, c } = g
  const v = g.landscape ? 1 : variante(g, 2)
  const cielo1 = mix(readable('#ffffff', [P.acc, acc2(g), '#3aa0ff'], 1.6), '#ffffff', 0.35)
  const cielo2 = mix(cielo1, '#ffffff', 0.75)
  put(g, { kind: 'rect', name: 'cielo', x: 0, y: 0, w: W, h: H, fill: { from: cielo1, to: cielo2, fromAt: 0, toAt: 1, vertical: true } })
  // onde morbide in basso
  for (let i = 0; i < 3; i++) {
    const y0 = H * (0.72 + i * 0.07)
    let d = `M 0 ${f1(H)} L 0 ${f1(y0)} `
    for (let x = 0; x <= W; x += U(g, 40)) d += `L ${f1(x)} ${f1(y0 + Math.sin(x / (W * 0.22) + i * 1.7 + k.seme) * U(g, 30))} `
    d += `L ${f1(W)} ${f1(H)} Z`
    put(g, { kind: 'path', name: 'onda', d, fill: alpha('#ffffff', 0.18 + i * 0.08) })
  }
  // bolle lucide
  const nb = 4 + Math.round(k.densita * 6)
  for (let i = 0; i < nb; i++) {
    const r = Math.min(W, H) * g.r.range(0.03, 0.11)
    const bx = g.r.range(r, W - r), by = g.r.range(r, H * 0.9)
    put(g, { kind: 'circle', name: 'bolla', cx: bx, cy: by, r, fill: alpha('#ffffff', 0.18), stroke: alpha('#ffffff', 0.7), sw: Math.max(1.5, U(g, 2)) })
    put(g, { kind: 'circle', name: 'bolla_luce', cx: bx - r * 0.35, cy: by - r * 0.4, r: r * 0.22, fill: alpha('#ffffff', 0.8) })
  }
  // il pannello di vetro (fondo pieno che il controllo legge) con il lucido sopra
  const vetro = mix('#ffffff', cielo1, 0.18)
  const ink = inkSu(g, vetro, 7)
  const pad = U(g, 44)
  const pW = v === 1 ? (W - 2 * m) * 0.5 : W - 2 * m
  const info = blocco(g, pW - 2 * pad, { bodyLines: 3 })
  if (!info) return null
  const br = lab(g, c.brand, pW - 2 * pad, 20)
  const t = titolo(g, pW - 2 * pad, (B - T) * 0.24, 130 + 50 * k.scala, 3, 44)
  if (!t) return no(g, 'titolo non entra')
  const pH = (br ? br.h + U(g, 18) : 0) + t.h + U(g, 30) + info.h + 2 * pad
  if (pH > B - T) return no(g, 'pannello troppo alto')
  const pX = v === 1 ? W - m - pW : m, pY = v === 1 ? T + (B - T - pH) / 2 : B - pH
  // la foto: tonda (o a pillola) nello spazio libero, con il lucido
  const fz: Box = v === 1 ? { x: m, y: T, w: pX - m - U(g, 50), h: B - T } : { x: m, y: T, w: W - 2 * m, h: pY - T - U(g, 50) }
  if (fz.h > H * 0.16 && fz.w > W * 0.2) {
    const R = Math.min(fz.w, fz.h) / 2
    const fcx = fz.x + fz.w / 2, fcy = fz.y + fz.h / 2
    put(g, { kind: 'circle', name: 'alone', cx: fcx, cy: fcy, r: R * 1.04, fill: '#ffffff', fx: [{ id: 'outerGlow', p: { color: '#ffffff', opacity: 70, size: 40 } }] })
    if (g.photo) photo(g, 'foto', { x: fcx - R, y: fcy - R, w: 2 * R, h: 2 * R }, { shape: 'circle', look: 'vivace', adjust: { saturation: 15 } })
    else put(g, { kind: 'circle', name: 'globo', cx: fcx, cy: fcy, r: R, fill: P.acc, fx: [{ id: 'genFill', p: { mode: 0, c1: cielo1, c2: P.acc, c3: '#ffffff', c4: acc2(g), grain: 10, warp: 40, scale: 140 } }] })
    put(g, { kind: 'path', name: 'lucido', d: `M ${f1(fcx - R * 0.8)} ${f1(fcy - R * 0.1)} A ${f1(R * 0.85)} ${f1(R * 0.85)} 0 0 1 ${f1(fcx + R * 0.8)} ${f1(fcy - R * 0.1)} Q ${f1(fcx)} ${f1(fcy - R * 0.45)} ${f1(fcx - R * 0.8)} ${f1(fcy - R * 0.1)} Z`, fill: '#ffffff', blend: 'screen', opacity: 0.55 })
  }
  put(g, { kind: 'rect', name: 'ombra_vetro', x: pX + U(g, 6), y: pY + U(g, 12), w: pW, h: pH, r: U(g, 36), fill: alpha('#0a3a6a', 0.18) })
  put(g, { kind: 'rect', name: 'vetro', x: pX, y: pY, w: pW, h: pH, r: U(g, 36), fill: vetro, stroke: '#ffffff', sw: Math.max(2, U(g, 3)) })
  put(g, { kind: 'rect', name: 'lucido_vetro', x: pX + U(g, 10), y: pY + U(g, 8), w: pW - U(g, 20), h: pH * 0.35, r: U(g, 30), fill: { from: '#ffffff', to: vetro, fromAt: 0, toAt: 1, vertical: true }, blend: 'screen', opacity: 0.6 })
  let y = pY + pad
  if (br) { putLab(g, 'brand', br, pX + pad, y, readable(vetro, [mix(cielo1, '#000000', 0.45), ink], 4.5)); y += br.h + U(g, 18) }
  putDisplay(g, 'titolo', t, pX + pad, y, ink, 'left', t.w, { su: vetro })
  y += t.h + U(g, 14)
  put(g, { kind: 'path', name: 'segno_onda', d: wobblyPath(g.r, pX + pad, y + U(g, 4), pX + pad + Math.min(t.w, pW * 0.5), y + U(g, 6), U(g, 3)), fill: 'transparent', stroke: readable(vetro, [P.acc, acc2(g)], 2), sw: U(g, 5) })
  y += U(g, 16)
  info.place(pX + pad, y, tinteSu(g, vetro))
  return finish(g, 'aero', 'Aero', { specchio: !conVoci(g) })
}

/* ═══ Acido ═════════════════════════════════════════════════════════════ */
/**
 * Grafica acid / Y2K: notte, griglia in prospettiva, forme liquide cromate
 * (motore effetti: cromo, olografico, gonfiabile), stelle a quattro punte,
 * il titolo con le eco a contorno stirate, un alone in sovrastampa.
 * Varianti: 0 cromo, 1 olografico.
 */
export function acido(g: G): Scene | null {
  const { W, H, m, T, B, P, k, s, c } = g
  if (conVoci(g)) return no(g, 'acido: niente voci')
  const v = variante(g, 2)
  const notte = mix(scuro(g), '#05030a', 0.5)
  const ink = '#f4f2ff'
  const vivo = readable(notte, [P.acc, acc2(g), '#b6ff3c'], 4.5)
  put(g, { kind: 'rect', name: 'notte', x: 0, y: 0, w: W, h: H, fill: notte })
  // griglia in prospettiva sul pavimento
  const hz = H * 0.62, vpx = W / 2
  let gd = ''
  for (let i = -10; i <= 10; i++) gd += `M ${f1(vpx)} ${f1(hz)} L ${f1(vpx + i * W * 0.18)} ${f1(H)} `
  for (let j = 1; j < 9; j++) { const y = hz + (H - hz) * (j / 9) ** 2; gd += `M 0 ${f1(y)} L ${f1(W)} ${f1(y)} ` }
  put(g, { kind: 'path', name: 'griglia', d: gd, fill: 'transparent', stroke: alpha(vivo, 0.45), sw: Math.max(1.5, U(g, 2)) })
  // alone in sovrastampa dietro tutto
  put(g, { kind: 'circle', name: 'alone', cx: W * 0.5, cy: hz, r: Math.min(W, H) * 0.45, fill: vivo, blend: 'screen', opacity: 0.45, fx: [{ id: 'genFill', p: { mode: 1, c1: vivo, c2: acc2(g), c3: notte, c4: notte, grain: 20, warp: 80, scale: 160 } }] })
  // forme liquide cromate
  const mat = v === 0 ? sceglie(g, 'mat', ['cromo', 'studio']) : sceglie(g, 'mat', ['olografico', 'gonfio'])
  const nf = 2 + Math.round(k.densita * 2)
  for (let i = 0; i < nf; i++) {
    const w = W * g.r.range(0.2, 0.36), h = w * g.r.range(0.5, 1)
    const b = { x: g.r.range(-w * 0.2, W - w * 0.8), y: g.r.range(H * 0.05, H * 0.8), w, h }
    put(g, { kind: 'path', name: 'forma_liquida', d: blobPath(g.r, b, 0.6, 8), fill: mix(vivo, '#ffffff', 0.4), fx: dettaglio(g) ? [{ id: 'material3d', variant: mat }] : undefined })
  }
  // stelle a quattro punte
  const ns = 4 + Math.round(k.energia * 6)
  for (let i = 0; i < ns; i++) {
    const r = U(g, g.r.range(14, 46))
    put(g, { kind: 'path', name: 'stella', d: starPath(g.r.range(r, W - r), g.r.range(r, H - r), r, 4, 0.16, 0), fill: i % 3 ? ink : vivo })
  }
  // il contenuto su una lastra scura, così le forme non disturbano la lettura
  const pad = U(g, 40)
  const iw = W - 2 * m - 2 * pad
  const info = blocco(g, iw, { bodyLines: 3 })
  if (!info) return null
  const br = lab(g, c.brand, iw, 20)
  const t = titolo(g, iw, (B - T) * 0.28, 170 + 70 * k.scala, 3, 48)
  if (!t) return no(g, 'titolo non entra')
  const lH = (br ? br.h + U(g, 18) : 0) + t.h + U(g, 36) + info.h + 2 * pad
  if (lH > B - T) return no(g, 'lastra troppo alta')
  const lY = T + (B - T - lH) * (0.35 + 0.3 * k.energia)
  // eco del titolo: copie a contorno stirate sopra e sotto (decorative)
  for (const dy of [-1, 1]) txt(g, { name: 'eco_titolo', lines: t.lines, font: s.display, size: t.size, x: m + pad, y: lY + pad + (br ? br.h + U(g, 18) : 0) + dy * t.size * 0.45, color: 'transparent', stroke: alpha(vivo, 0.6), sw: Math.max(2, U(g, 2)), hollow: true, leading: t.leading ?? s.displayLeading, tracking: t.tracking ?? s.displayTracking, deco: true })
  put(g, { kind: 'rect', name: 'lastra', x: m, y: lY, w: W - 2 * m, h: lH, r: U(g, 24), fill: mix(notte, '#000000', 0.2), stroke: alpha(vivo, 0.7), sw: Math.max(2, U(g, 2)) })
  let y = lY + pad
  if (br) { putLab(g, 'brand', br, m + pad, y, vivo); y += br.h + U(g, 18) }
  putDisplay(g, 'titolo', t, m + pad, y, ink, 'left', t.w, { su: mix(notte, '#000000', 0.2) })
  y += t.h + U(g, 36)
  info.place(m + pad, y, { fg: ink, sec: mix(ink, notte, 0.25), acc: vivo })
  return finish(g, 'acido', 'Acid')
}
