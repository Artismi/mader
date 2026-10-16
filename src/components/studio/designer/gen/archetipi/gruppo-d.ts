/**
 * Archetipi del gruppo D · digitale e notte. Ogni funzione compone una tavola
 * intera con gli strumenti di ../tools e ../forme, legge regolatori e registro,
 * ha varianti interne scelte dal seme e chiude con finish().
 * Le idee e le ricette d'origine sono in ./elenco.ts.
 *
 *   interfaccia   finestre di un vecchio sistema operativo (vaporwave-01)
 *   sorveglianza  monitor a circuito chiuso, riquadri di rilevamento (surveillance-01)
 *   terminale     schermo o tabulato a caratteri, il titolo come comando (tech-mono-01)
 *   brutale       blocchi grezzi, testo che esce dai bordi, pagina web senza stile (digital-brutalism-01)
 *   acido         forme liquide cromate, stelle a quattro punte, eco a contorno (acidgraphics-01)
 *   aero          cielo, bolle lucide, pannelli di vetro (frutiger-aero-01)
 *   pixel         titolo a blocchi, foto a pixel grandi, cornice da videogioco (pixel-retro-01)
 *   manga         linee di velocità, retino, onomatopea, vignette (manga-01)
 *   agenzia       nero e un colore acceso, indici grandi, griglia da sito (agency-black-orange-01)
 *
 * Regola comune: i testi del messaggio stanno sempre su un fondo pieno (finestre,
 * fasce, targhette); foto trattate, trame, righe e segni vivono attorno e sotto.
 */
import type { FontSpec, Gradient, Scene, SceneEl } from '../../types'
import {
  type G, put, U, txt, lab, para, display, putLab, putPara, putDisplay, infoBlock, photo, treat,
  finish, discard, keyword, words, up, sizeForWidth, detailsLine, ctaText, mix, alpha, readable, darker, lighter, contrast, lum,
} from '../tools'
import { over } from '../systems'
import { blobPath, starPath, wobblyPath } from '../forme'
import { lineWidth } from '../../text'
import { brutale, acido, aero, pixel, manga, agenzia } from './gruppo-d2'
import type { Fit } from '../../text'

type Sistema = (g: G) => Scene | null
type Box = { x: number; y: number; w: number; h: number }
type Img = Extract<SceneEl, { kind: 'image' }>

/* ── attrezzi comuni ──────────────────────────────────────────────────── */
/** Rinuncia motivata (il banco di prova la registra). */
const no = (g: G, why: string): null => { discard(g, why); return null }
const f1 = (n: number) => n.toFixed(1)
const rectD = (b: Box) => `M ${f1(b.x)} ${f1(b.y)} L ${f1(b.x + b.w)} ${f1(b.y)} L ${f1(b.x + b.w)} ${f1(b.y + b.h)} L ${f1(b.x)} ${f1(b.y + b.h)} Z`
/** Variante interna dal seme (stabile per lo stesso seme). */
const variante = (g: G, n: number) => (Math.abs(g.k.seme) >> 3) % n
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const MONO = /Mono|Code|Courier/i
/** Carattere "di sistema": il monospazio dello stile se c'è, altrimenti l'etichetta. */
const mono = (g: G): FontSpec => [g.s.label, g.s.text].find(f => MONO.test(f.family)) ?? g.s.label
/** Chiaro e scuro della tavola (inchiostro e carta). */
const chiaro = (g: G) => lighter(g.P.fg, g.P.bg)
const scuro = (g: G) => darker(g.P.fg, g.P.bg)
/** Un colore vivo che si legga sul fondo dato, dall'accento in giù. */
const vivo = (g: G, su: string, min = 3) => readable(su, [g.P.acc, g.P.acc2, lighter(g.P.fg, g.P.bg), darker(g.P.fg, g.P.bg)], min)
/** Il secondo inchiostro (se l'identità ne ha uno diverso dal fondo). */
const acc2 = (g: G) => (g.P.acc2 === g.P.bg ? g.P.fg : g.P.acc2)

/** Riga di testo in un carattere dato, ridotta se supera `maxW`; null se scenderebbe sotto il corpo minimo. */
function riga(g: G, name: string, text: string, x: number, y: number, size: number, color: string,
  o: { font?: FontSpec; maxW?: number; align?: 'left' | 'center' | 'right'; w?: number; tracking?: number; deco?: boolean; angle?: number; caps?: boolean; blend?: GlobalCompositeOperation; opacity?: number } = {}) {
  const font = o.font ?? mono(g)
  const t = o.caps === false ? text : text.toUpperCase()
  if (!t.trim()) return null
  const tr = o.tracking ?? 0.06
  let sz = size
  if (o.maxW) sz = Math.min(sz, sizeForWidth(t, font, o.maxW, tr))
  if (sz < 16 * g.u && !o.deco) return null
  return txt(g, { name, lines: [t], font, size: sz, x, y, color, align: o.align, w: o.w, tracking: tr, leading: 1.2, deco: o.deco, angle: o.angle, blend: o.blend, opacity: o.opacity })
}
/** Larghezza di una riga come la scriverebbe `riga`. */
const largo = (g: G, text: string, size: number, font = mono(g), tr = 0.06) => lineWidth(text.toUpperCase(), font, size, tr)

/** Righe orizzontali di scansione in un solo tracciato. */
function scansione(g: G, b: Box, passo: number, color: string, sw = Math.max(1, g.u * 1.5), blend?: GlobalCompositeOperation, opacity?: number) {
  let d = ''
  for (let y = b.y + passo / 2; y < b.y + b.h; y += passo) d += `M ${f1(b.x)} ${f1(y)} L ${f1(b.x + b.w)} ${f1(y)} `
  if (d) put(g, { kind: 'path', name: 'scansione', d, fill: 'transparent', stroke: color, sw, blend, opacity })
}
/** Griglia di linee (orizzontali e verticali) in un solo tracciato. */
function griglia(g: G, name: string, b: Box, passoX: number, passoY: number, color: string, sw = Math.max(1, g.u)) {
  let d = ''
  for (let x = b.x; x <= b.x + b.w + 0.5; x += passoX) d += `M ${f1(x)} ${f1(b.y)} L ${f1(x)} ${f1(b.y + b.h)} `
  for (let y = b.y; y <= b.y + b.h + 0.5; y += passoY) d += `M ${f1(b.x)} ${f1(y)} L ${f1(b.x + b.w)} ${f1(y)} `
  put(g, { kind: 'path', name, d, fill: 'transparent', stroke: color, sw })
}
/** Crocette piccole su una griglia (trama di scrivania, carta millimetrata). */
function crocette(g: G, b: Box, passo: number, color: string) {
  let d = ''
  const L = passo * 0.12
  for (let y = b.y + passo / 2; y < b.y + b.h; y += passo) for (let x = b.x + passo / 2; x < b.x + b.w; x += passo) d += `M ${f1(x - L)} ${f1(y)} L ${f1(x + L)} ${f1(y)} M ${f1(x)} ${f1(y - L)} L ${f1(x)} ${f1(y + L)} `
  if (d) put(g, { kind: 'path', name: 'trama_crocette', d, fill: 'transparent', stroke: color, sw: Math.max(1, g.u * 1.5) })
}

/** Il punto della foto con più dettaglio (il soggetto da inquadrare), in coordinate della tavola. */
function soggetto(g: G, box: Box): { x: number; y: number } {
  const pix = g.pix
  if (!pix) return { x: box.x + box.w * (0.42 + 0.16 * g.r.next()), y: box.y + box.h * (0.4 + 0.16 * g.r.next()) }
  const sc = Math.max(box.w / pix.w, box.h / pix.h)
  const ox = (pix.w - box.w / sc) / 2, oy = (pix.h - box.h / sc) / 2
  const L = (x: number, y: number) => { const o = (Math.round(y) * pix.w + Math.round(x)) * 4; return (0.2126 * pix.data[o] + 0.7152 * pix.data[o + 1] + 0.0722 * pix.data[o + 2]) / 255 }
  const N = 7
  let best = { v: -Infinity, x: box.x + box.w / 2, y: box.y + box.h / 2 }
  for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
    const cx = box.x + (box.w * (i + 0.5)) / N, cy = box.y + (box.h * (j + 0.5)) / N
    const px = ox + (cx - box.x) / sc, py = oy + (cy - box.y) / sc
    const rad = (box.w / N / sc) * 0.7
    const ls: number[] = []
    for (let dy = -rad; dy <= rad; dy += rad / 3) for (let dx = -rad; dx <= rad; dx += rad / 3) {
      const x = px + dx, y = py + dy
      if (x >= 0 && y >= 0 && x < pix.w - 1 && y < pix.h - 1) ls.push(L(x, y))
    }
    if (!ls.length) continue
    const mean = ls.reduce((a, b) => a + b, 0) / ls.length
    const dev = Math.sqrt(ls.reduce((a, b) => a + (b - mean) ** 2, 0) / ls.length)
    const centro = Math.hypot((i + 0.5) / N - 0.5, (j + 0.5) / N - 0.5)
    const v = dev + 0.12 * mean - 0.22 * centro
    if (v > best.v) best = { v, x: cx, y: cy }
  }
  return best
}

/** Data e ora "di sistema" dal contenuto (numero o dettagli), altrimenti dal seme. */
function marcaTempo(g: G) {
  const src = [g.c.numero, g.c.kicker, ...(g.c.details ?? [])].filter(Boolean).join(' ')
  const m = src.match(/(\d{1,2})[./-](\d{1,2})(?![\d])/)
  const y = src.match(/\b(20\d\d)\b/)?.[1] ?? '2026'
  const dd = m ? m[1].padStart(2, '0') : String(1 + (g.k.seme % 28)).padStart(2, '0')
  const mm = m ? m[2].padStart(2, '0') : String(1 + ((g.k.seme >> 2) % 12)).padStart(2, '0')
  const hh = String(20 + (g.k.seme % 4)).padStart(2, '0'), mi = String((g.k.seme * 7) % 60).padStart(2, '0'), ss = String((g.k.seme * 13) % 60).padStart(2, '0')
  return { data: `${y}-${mm}-${dd}`, ora: `${hh}:${mi}:${ss}` }
}

/** Cursore a freccia classico (punta in x, y). */
function cursore(g: G, x: number, y: number, s: number, fill: string, stroke: string) {
  const p = [[0, 0], [0, 17], [4, 13], [7, 20], [10, 19], [7, 12], [12, 12]].map(([a, b]) => [x + a * s, y + b * s])
  put(g, { kind: 'path', name: 'freccia_cursore', d: 'M ' + p.map(q => `${f1(q[0])} ${f1(q[1])}`).join(' L ') + ' Z', fill, stroke, sw: Math.max(2, s * 1.1) })
}

/* ═══ Finestra di sistema ═══════════════════════════════════════════════ */
interface Tinte { desk: string; corpo: string; ink: string; barra: string | Gradient; suBarra: string; acc: string }

/** Una finestra: ombra piena, corpo, barra del titolo (nome decorativo), pulsanti, rilievo. Restituisce l'area interna. */
function finestra(g: G, b: Box, T: Tinte, nome: string, o: { attiva?: boolean; ombra?: boolean } = {}) {
  const morb = g.s.forma === 'morbido'
  const r = morb ? U(g, 16) : 0
  const bw = Math.max(2, U(g, 3))
  const barH = U(g, 46)
  if (o.ombra !== false) put(g, { kind: 'rect', name: 'ombra_finestra', x: b.x + U(g, 14), y: b.y + U(g, 14), w: b.w, h: b.h, r, fill: alpha('#000000', 0.35) })
  put(g, { kind: 'rect', name: 'finestra', ...b, r, fill: T.corpo, stroke: T.ink, sw: bw })
  const barra = o.attiva === false ? mix(T.corpo, T.ink, 0.35) : T.barra
  const su = o.attiva === false ? T.corpo : T.suBarra
  put(g, { kind: 'rect', name: 'barra', x: b.x + bw * 2, y: b.y + bw * 2, w: b.w - bw * 4, h: barH, r: morb ? r * 0.6 : 0, fill: barra })
  if (!morb) {
    // rilievo alla Windows 95: luce in alto a sinistra, ombra in basso a destra
    put(g, { kind: 'rect', name: 'rilievo', x: b.x + bw, y: b.y + b.h - bw * 2, w: b.w - bw * 2, h: bw, fill: alpha(T.ink, 0.45) })
    put(g, { kind: 'rect', name: 'rilievo', x: b.x + b.w - bw * 2, y: b.y + bw, w: bw, h: b.h - bw * 2, fill: alpha(T.ink, 0.45) })
  }
  const bs = barH * 0.6, by = b.y + bw * 2 + (barH - bs) / 2
  let d = ''
  let nx = b.x + U(g, 18)
  if (morb) {
    // tre pallini a sinistra (sistema morbido)
    for (let i = 0; i < 3; i++) { const cx = b.x + U(g, 26) + i * bs * 1.3, cy = by + bs / 2, rr = bs * 0.36; d += `M ${f1(cx - rr)} ${f1(cy)} a ${f1(rr)} ${f1(rr)} 0 1 0 ${f1(2 * rr)} 0 a ${f1(rr)} ${f1(rr)} 0 1 0 ${f1(-2 * rr)} 0 ` }
    nx = b.x + U(g, 26) + 3 * bs * 1.3 + U(g, 8)
    put(g, { kind: 'path', name: 'pulsanti', d, fill: T.corpo, stroke: T.ink, sw: Math.max(1.5, U(g, 2)) })
  } else {
    // ridurre, ingrandire, chiudere a destra
    for (let i = 0; i < 3; i++) {
      const x = b.x + b.w - bw * 2 - U(g, 8) - (3 - i) * (bs + U(g, 6))
      put(g, { kind: 'rect', name: 'pulsante', x, y: by, w: bs, h: bs, fill: T.corpo, stroke: T.ink, sw: Math.max(1.5, U(g, 2)) })
      const q = bs * 0.28
      if (i === 0) d += `M ${f1(x + q)} ${f1(by + bs - q)} L ${f1(x + bs - q)} ${f1(by + bs - q)} `
      else if (i === 1) d += rectD({ x: x + q, y: by + q, w: bs - 2 * q, h: bs - 2 * q }) + ' '
      else d += `M ${f1(x + q)} ${f1(by + q)} L ${f1(x + bs - q)} ${f1(by + bs - q)} M ${f1(x + bs - q)} ${f1(by + q)} L ${f1(x + q)} ${f1(by + bs - q)} `
    }
    put(g, { kind: 'path', name: 'pulsanti', d, fill: 'transparent', stroke: T.ink, sw: Math.max(2, U(g, 3)) })
  }
  const sz = U(g, 19)
  const maxW = morb ? b.x + b.w - nx - U(g, 16) : b.w - 3 * (bs + U(g, 6)) - U(g, 50)
  if (maxW > U(g, 60)) riga(g, 'nome_finestra', nome, nx, b.y + bw * 2 + (barH - sz * 1.13) / 2, sz, su, { maxW, deco: true, caps: false, tracking: 0.02 })
  return { x: b.x + bw * 2, y: b.y + bw * 2 + barH, w: b.w - bw * 4, h: b.h - bw * 4 - barH, barH: barH + bw * 2 }
}

/** Pulsante a rilievo con l'etichetta centrata (l'invito). */
function pulsante(g: G, f: Fit, x: number, y: number, w: number, h: number, T: Tinte, name = 'invito') {
  const morb = g.s.forma === 'morbido'
  put(g, { kind: 'rect', name: 'pulsante_invito', x, y, w, h, r: morb ? h / 2 : 0, fill: T.corpo, stroke: T.ink, sw: Math.max(2, U(g, 3)) })
  if (!morb) put(g, { kind: 'rect', name: 'rilievo', x: x + U(g, 3), y: y + h - U(g, 6), w: w - U(g, 6), h: U(g, 3), fill: alpha(T.ink, 0.45) })
  putLab(g, name, f, x + U(g, 22), y + (h - f.h) / 2, T.ink)
}

export function interfaccia(g: G): Scene | null {
  const { W, H, m, T: top, B, P, k, r, s, c } = g
  const v = variante(g, 3)
  const side = g.landscape
  const lt = chiaro(g), dk = scuro(g)
  // tinte: finestre chiare con inchiostro scuro; la barra del titolo nell'accento (sfumata verso il secondo)
  const desk = P.dark ? P.bg : P.acc
  const barraPiena = readable(lt, [P.acc, acc2(g), dk], 3)
  const T: Tinte = {
    desk, corpo: lt, ink: dk, acc: readable(lt, [P.acc, acc2(g), dk], 3.6),
    barra: s.forma === 'netto' || s.forma === 'decostruito' ? { from: barraPiena, to: mix(barraPiena, acc2(g), 0.6), fromAt: 0, toAt: 1, vertical: false } : barraPiena,
    suBarra: readable(barraPiena, [lt, dk]),
  }
  // passo 1: la scrivania (fondo sfumato, oppure la foto come sfondo nella prima variante)
  if (v === 0 && g.photo) {
    photo(g, 'foto', { x: 0, y: 0, w: W, h: H }, { fx: [{ id: 'gradientMap', p: { c1: dk, c2: P.acc, c3: lt, three: 1, contrast: 20 } }] })
    put(g, { kind: 'rect', name: 'riflesso', x: 0, y: 0, w: W, h: H * 0.6, fill: { from: alpha(acc2(g), 0.7), to: alpha(acc2(g), 0), fromAt: 0, toAt: 1, vertical: true }, blend: 'screen', opacity: 0.4 + 0.5 * k.sovrastampa })
  } else {
    put(g, { kind: 'rect', name: 'scrivania', x: 0, y: 0, w: W, h: H, fill: { from: desk, to: mix(desk, acc2(g), 0.45), fromAt: 0.2, toAt: 1, vertical: true } })
    crocette(g, { x: 0, y: 0, w: W, h: H }, U(g, 36 - 12 * k.densita), alpha(readable(desk, [lt, dk]), 0.22))
  }
  // passo 2: barra delle applicazioni con il brand nel pulsante d'avvio e l'orologio
  const tbH = U(g, 84)
  const tbY = g.format === 'storia' ? B - tbH + U(g, 20) : H - tbH
  put(g, { kind: 'rect', name: 'barra_applicazioni', x: -U(g, 4), y: tbY, w: W + U(g, 8), h: g.format === 'storia' ? tbH : tbH + U(g, 4), fill: T.corpo, stroke: T.ink, sw: Math.max(2, U(g, 3)) })
  const brand = lab(g, c.brand || 'Avvio', W * 0.4, 20)
  const btnH = U(g, 58), btnY = tbY + (tbH - btnH) / 2
  // il pulsante d'avvio mette il brand sullo stesso asse del titolo
  const asse = m + Math.max(2, U(g, 3)) * 2 + U(g, 30)
  const sx0 = asse - U(g, 56)
  let startW = 0
  if (brand) {
    startW = brand.w + U(g, 78)
    put(g, { kind: 'rect', name: 'avvio', x: sx0, y: btnY, w: startW, h: btnH, r: s.forma === 'morbido' ? btnH / 2 : 0, fill: T.corpo, stroke: T.ink, sw: Math.max(2, U(g, 3)) })
    // logo: quattro quadretti nei colori della tavola
    const q = U(g, 11), lx = sx0 + U(g, 18), ly = btnY + btnH / 2 - q
    put(g, { kind: 'path', name: 'logo', d: [rectD({ x: lx, y: ly, w: q - 1, h: q - 1 }), rectD({ x: lx + q, y: ly + q, w: q - 1, h: q - 1 })].join(' '), fill: T.acc })
    put(g, { kind: 'path', name: 'logo', d: [rectD({ x: lx + q, y: ly, w: q - 1, h: q - 1 }), rectD({ x: lx, y: ly + q, w: q - 1, h: q - 1 })].join(' '), fill: T.ink })
    putLab(g, 'brand', brand, asse, btnY + (btnH - brand.h) / 2, T.ink)
  }
  const orologio = lab(g, c.numero || marcaTempo(g).ora.slice(0, 5), W * 0.3, 20)
  if (orologio) {
    const ow = orologio.w + U(g, 40), ox = W - m * 0.5 - ow
    if (ox > sx0 + startW + U(g, 30)) {
      put(g, { kind: 'rect', name: 'orologio', x: ox, y: btnY, w: ow, h: btnH, r: s.forma === 'morbido' ? btnH / 2 : 0, fill: T.corpo, stroke: alpha(T.ink, 0.6), sw: Math.max(1.5, U(g, 2)) })
      putLab(g, 'numero_orologio', orologio, ox, btnY + (btnH - orologio.h) / 2, T.ink, 'right', ow - U(g, 20))
    }
  }
  // passo 3: misure delle finestre di testo (titolo e informazioni), poi la foto nello spazio che resta
  const R = { x: m, y: top, w: W - 2 * m, h: tbY - U(g, 36) - top }
  const pad = U(g, 30)
  const tW = side ? R.w * 0.5 : R.w * (0.86 + 0.08 * (1 - k.energia))
  const dW = side ? R.w * 0.46 : R.w * 0.66
  const kick = lab(g, c.kicker, tW - 2 * pad - U(g, 12))
  const dInner = dW - 2 * pad - U(g, 12)
  const body = para(g, c.body, dInner, side ? 4 : 3)
  const det = lab(g, detailsLine(c), dInner)
  const cta = lab(g, c.cta, dInner - U(g, 40))
  const btn = cta ? cta.h + U(g, 36) : 0
  const dH = U(g, 52) + pad + (body ? body.h + U(g, 20) : 0) + (det ? det.h + U(g, 24) : 0) + btn + pad
  const tMaxH = side ? R.h - dH - U(g, 70) : R.h * 0.34
  const t = display(g, c.title, tW - 2 * pad - U(g, 12), tMaxH - U(g, 52) - 2 * pad - (kick ? kick.h + U(g, 16) : 0), 120 + 80 * k.scala, 44, 3)
  if (!t) return no(g, "titolo non entra")
  const tH = U(g, 52) + pad + (kick ? kick.h + U(g, 16) : 0) + t.h + pad
  const ov = U(g, 40 + 60 * k.energia)
  let PB: Box, TB: Box, DB: Box
  if (side) {
    PB = { x: R.x, y: R.y, w: R.w * 0.6, h: R.h }
    TB = { x: R.x + R.w - tW, y: R.y + U(g, 30), w: tW, h: tH }
    DB = { x: TB.x, y: TB.y + tH + U(g, 26), w: dW, h: dH }
    if (DB.y + dH > R.y + R.h) return no(g, 'finestre troppo alte')
  } else {
    // il titolo si appoggia sul bordo basso della foto, le informazioni scendono a destra
    const hp = R.h - (tH - ov) - dH - U(g, 26)
    if (hp < R.h * 0.26) return no(g, 'foto troppo bassa')
    const icone = k.densita > 0.45 && v !== 0 ? U(g, 150) : 0
    PB = { x: R.x + icone, y: R.y, w: R.w - icone, h: hp }
    TB = { x: R.x, y: R.y + hp - ov, w: tW, h: tH }
    DB = { x: R.x + R.w - dW, y: TB.y + tH + U(g, 26), w: dW, h: dH }
  }
  const nomeFoto = `${(keyword(g) || 'foto').toLowerCase().replace(/[^a-z0-9àèéìòù]+/g, '_')}_01.jpg`
  // passo 4: la finestra della foto (se la foto non è già lo sfondo)
  if (!(v === 0 && g.photo)) {
    const inner = finestra(g, PB, T, nomeFoto)
    const pb = { x: inner.x, y: inner.y, w: inner.w, h: inner.h }
    if (v === 2) {
      // editor d'immagini: righelli sul bordo e la foto nella tela
      const rl = U(g, 26)
      put(g, { kind: 'rect', name: 'righello', x: pb.x, y: pb.y, w: pb.w, h: rl, fill: mix(T.corpo, T.ink, 0.12) })
      put(g, { kind: 'rect', name: 'righello', x: pb.x, y: pb.y, w: rl, h: pb.h, fill: mix(T.corpo, T.ink, 0.12) })
      let d = ''
      for (let x = pb.x + rl; x < pb.x + pb.w; x += U(g, 12)) { const big = Math.round((x - pb.x - rl) / U(g, 12)) % 5 === 0; d += `M ${f1(x)} ${f1(pb.y + rl)} L ${f1(x)} ${f1(pb.y + rl - (big ? rl * 0.7 : rl * 0.35))} ` }
      for (let y = pb.y + rl; y < pb.y + pb.h; y += U(g, 12)) { const big = Math.round((y - pb.y - rl) / U(g, 12)) % 5 === 0; d += `M ${f1(pb.x + rl)} ${f1(y)} L ${f1(pb.x + rl - (big ? rl * 0.7 : rl * 0.35))} ${f1(y)} ` }
      put(g, { kind: 'path', name: 'tacche', d, fill: 'transparent', stroke: alpha(T.ink, 0.7), sw: Math.max(1, g.u * 1.2) })
      const tela = { x: pb.x + rl, y: pb.y + rl, w: pb.w - rl, h: pb.h - rl }
      photo(g, 'foto', tela, { look: 'vapor', adjust: { grain: 20 } })
      // selezione tratteggiata attorno al soggetto, con le maniglie
      const sp = soggetto(g, tela)
      const sw2 = Math.min(tela.w, tela.h) * 0.42
      const sb = { x: clamp(sp.x - sw2 / 2, tela.x + U(g, 12), tela.x + tela.w - sw2 - U(g, 12)), y: clamp(sp.y - sw2 / 2, tela.y + U(g, 12), tela.y + tela.h - sw2 - U(g, 12)), w: sw2, h: sw2 }
      for (const [x1, y1, x2, y2] of [[sb.x, sb.y, sb.x + sb.w, sb.y], [sb.x + sb.w, sb.y, sb.x + sb.w, sb.y + sb.h], [sb.x + sb.w, sb.y + sb.h, sb.x, sb.y + sb.h], [sb.x, sb.y + sb.h, sb.x, sb.y]])
        put(g, { kind: 'line', name: 'selezione', x1, y1, x2, y2, color: lt, width: Math.max(2, U(g, 3)), dash: [U(g, 12), U(g, 8)] })
      const hq = U(g, 14)
      let dh = ''
      for (const [hx, hy] of [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]]) dh += rectD({ x: sb.x + sb.w * hx - hq / 2, y: sb.y + sb.h * hy - hq / 2, w: hq, h: hq }) + ' '
      put(g, { kind: 'path', name: 'maniglie', d: dh, fill: lt, stroke: dk, sw: Math.max(1.5, U(g, 2)) })
    } else {
      photo(g, 'foto', pb, g.photo ? { look: s.decor.look === 'vapor' ? 'vapor' : r.pick(['vapor', 'tramonto', 'scaduta']), adjust: { grain: 25 } } : {})
      // aberrazione: la stessa foto spostata nell'altro inchiostro, in sovrastampa
      if (g.photo && k.sovrastampa > 0.35) put(g, { kind: 'rect', name: 'riflesso', ...pb, fill: { from: alpha(acc2(g), 0.8), to: alpha(P.acc, 0.1), fromAt: 0, toAt: 1, vertical: false }, blend: over(g, dk), opacity: 0.35 + 0.4 * k.sovrastampa })
    }
    // icone sulla scrivania accanto alla foto: i dettagli come file
    if (!side && PB.x > R.x + U(g, 100)) {
      const items = (c.details ?? []).slice(0, Math.max(1, Math.floor(PB.h / U(g, 150))))
      const cx = R.x + (PB.x - R.x) / 2 - U(g, 8)
      const onDesk = readable(desk, [lt, dk])
      items.forEach((it, i) => {
        const y = R.y + U(g, 10) + i * U(g, 150)
        const q = U(g, 56)
        // cartellina: linguetta e corpo
        put(g, { kind: 'path', name: 'icona', d: `M ${f1(cx - q / 2)} ${f1(y + q * 0.2)} L ${f1(cx - q * 0.1)} ${f1(y + q * 0.2)} L ${f1(cx)} ${f1(y + q * 0.32)} L ${f1(cx + q / 2)} ${f1(y + q * 0.32)} L ${f1(cx + q / 2)} ${f1(y + q * 0.95)} L ${f1(cx - q / 2)} ${f1(y + q * 0.95)} Z`, fill: T.acc, stroke: T.ink, sw: Math.max(2, U(g, 3)) })
        const f = lab(g, it, PB.x - R.x - U(g, 10), 16)
        if (f && f.w < PB.x - R.x) {
          put(g, { kind: 'rect', name: 'etichetta_icona', x: cx - f.w / 2 - U(g, 6), y: y + q + U(g, 6), w: f.w + U(g, 12), h: f.h + U(g, 8), fill: alpha(desk, 0.92) })
          putLab(g, `icona#${i}`, f, cx - f.w / 2, y + q + U(g, 10), onDesk)
        }
      })
    }
  }
  // passo 5: la scia di finestre d'errore (energia), sotto il titolo
  if (v === 1 || (v === 0 && k.energia > 0.5)) {
    const n = 3 + Math.round(k.energia * 6)
    const st = U(g, 22 + 10 * k.energia)
    const w0 = DB.w * 0.62, h0 = U(g, 120)
    for (let i = n; i >= 1; i--) {
      const x = DB.x + DB.w - w0 - i * st * (side ? 1.6 : 1.2), y = DB.y - i * st
      put(g, { kind: 'rect', name: 'scia', x, y, w: w0, h: h0, fill: T.corpo, stroke: T.ink, sw: Math.max(2, U(g, 2)) })
      put(g, { kind: 'rect', name: 'scia_barra', x: x + U(g, 4), y: y + U(g, 4), w: w0 - U(g, 8), h: U(g, 26), fill: barraPiena })
    }
  }
  // passo 6: la finestra del titolo, con l'aberrazione cromatica a scelta
  const ti = finestra(g, TB, T, `${(c.brand || 'sistema').toLowerCase().replace(/\s+/g, '_')}.exe`)
  let y = ti.y + pad
  if (kick) { putLab(g, 'occhiello', kick, ti.x + pad, y, T.acc); y += kick.h + U(g, 16) }
  if (k.sovrastampa > 0.3) {
    const off = U(g, 3 + 7 * k.sovrastampa)
    for (const [dx, col] of [[-off, P.acc], [off, acc2(g)]] as const)
      txt(g, { name: 'aberrazione', lines: t.lines, font: s.display, size: t.size, x: ti.x + pad + dx, y: y, color: col, leading: t.leading ?? s.displayLeading, tracking: t.tracking ?? s.displayTracking, deco: true, blend: 'multiply', opacity: 0.85 })
  }
  putDisplay(g, 'titolo', t, ti.x + pad, y, T.ink, 'left', t.w, { su: T.corpo })
  // passo 7: la finestra di dialogo con testo, dettagli e il pulsante dell'invito
  const di = finestra(g, DB, T, (c.kicker || 'avviso').toLowerCase(), { attiva: false })
  y = di.y + pad
  if (body) { putPara(g, 'testo', body, di.x + pad, y, T.ink); y += body.h + U(g, 20) }
  if (det) { putLab(g, 'dettagli', det, di.x + pad, y, T.acc); y += det.h + U(g, 24) }
  if (cta) {
    const bw = Math.min(di.w - 2 * pad + U(g, 22), cta.w + U(g, 44))
    const bx = di.x + pad - U(g, 22)
    pulsante(g, cta, bx, y, bw, cta.h + U(g, 36), T)
    cursore(g, bx + bw * 0.8, y + cta.h * 1.1, U(g, 3.2) * (0.9 + 0.3 * k.scala), lt, dk)
  }
  return finish(g, 'interfaccia', 'Finestra di sistema')
}

/* ═══ Sorveglianza ══════════════════════════════════════════════════════ */
/** Angolari del mirino attorno a un riquadro. */
function mirino(g: G, b: Box, color: string, L: number, sw: number) {
  const d = [
    `M ${f1(b.x)} ${f1(b.y + L)} L ${f1(b.x)} ${f1(b.y)} L ${f1(b.x + L)} ${f1(b.y)}`,
    `M ${f1(b.x + b.w - L)} ${f1(b.y)} L ${f1(b.x + b.w)} ${f1(b.y)} L ${f1(b.x + b.w)} ${f1(b.y + L)}`,
    `M ${f1(b.x + b.w)} ${f1(b.y + b.h - L)} L ${f1(b.x + b.w)} ${f1(b.y + b.h)} L ${f1(b.x + b.w - L)} ${f1(b.y + b.h)}`,
    `M ${f1(b.x + L)} ${f1(b.y + b.h)} L ${f1(b.x)} ${f1(b.y + b.h)} L ${f1(b.x)} ${f1(b.y + b.h - L)}`,
  ].join(' ')
  put(g, { kind: 'path', name: 'mirino', d, fill: 'transparent', stroke: color, sw })
}
/** Targhetta piena con una riga di testo (OSD): il testo si legge sempre, anche sopra la foto. */
function targa(g: G, name: string, text: string, x: number, y: number, size: number, fg: string, bg: string, o: { align?: 'left' | 'right'; maxW?: number; deco?: boolean } = {}) {
  const padX = U(g, 16), padY = U(g, 15)
  const sz = o.maxW ? Math.min(size, sizeForWidth(text.toUpperCase(), mono(g), o.maxW - 2 * padX, 0.08)) : size
  // le scritte vere non scendono sotto il corpo delle note; le decorative possono
  if (sz < (o.deco ? 16 * g.u : g.sc.minNota)) return null
  const w = largo(g, text, sz, mono(g), 0.08) + 2 * padX, h = sz * 1.13 + 2 * padY
  const bx = o.align === 'right' ? x - w : x
  put(g, { kind: 'rect', name: 'targa', x: bx, y, w, h, fill: bg })
  riga(g, name, text, bx + padX, y + padY, sz, fg, { tracking: 0.08, deco: o.deco })
  return { x: bx, y, w, h }
}

export function sorveglianza(g: G): Scene | null {
  const { W, H, m, T, B, P, k, r, s, c } = g
  if (!g.photo) return no(g, "senza foto")
  const v = variante(g, 3)
  const side = g.landscape
  const lt = chiaro(g), dk = scuro(g)
  // notte: il fondo scuro della tavola (o l'inchiostro scuro di un'identità chiara); fosforo: l'accento che si legge sul buio
  const notte = P.dark ? P.bg : dk
  const fosforo = readable(notte, [P.acc, acc2(g), lt], 4.5)
  const allarme = readable(notte, [acc2(g), P.acc, lt].filter(x => x !== fosforo), 3) ?? fosforo
  const suAllarme = readable(allarme, [notte, lt, '#000000'])
  const tempo = marcaTempo(g)
  const cam = `CAM ${String(1 + (k.seme % 9)).padStart(2, '0')}`
  const night: { fx?: Img['fx']; look?: string; adjust?: Record<string, number> } = { fx: [{ id: 'gradientMap', variant: 'duotone', p: { c1: mix(notte, '#000000', 0.4), c2: lighter(fosforo, lt) === fosforo ? fosforo : mix(fosforo, lt, 0.4), three: 0, contrast: 35 } }] }
  const osd = Math.max(U(g, 20), g.sc.minNota)

  if (v === 2) {
    /* ── fascicolo: la foto è un fermo immagine graffettato su un documento riservato ── */
    const carta = P.dark ? P.fg : P.bg, inch = readable(carta, [P.dark ? P.bg : P.fg, '#111111'], 7)
    if (P.dark) put(g, { kind: 'rect', name: 'carta', x: 0, y: 0, w: W, h: H, fill: carta })
    const rosso = readable(carta, [acc2(g), P.acc, inch], 3)
    const colW = side ? (W - 2 * m) * 0.46 : W - 2 * m
    // testata del documento
    const head = lab(g, `${c.brand ?? ''}  ·  ${cam}  ·  ${tempo.data}`, colW, 18)
    if (!head) return no(g, "testata")
    putLab(g, 'brand', head, m, T, inch)
    put(g, { kind: 'line', name: 'filetto', x1: m, y1: T + head.h + U(g, 14), x2: side ? m + colW : W - m, y2: T + head.h + U(g, 14), color: inch, width: Math.max(2, U(g, 3)) })
    const info = infoBlock(g, side ? colW : (W - 2 * m) * 0.62, { kicker: false })
    const t = display(g, up(c.title, true), colW, side ? H * 0.34 : H * 0.2, 130 + 60 * k.scala, 44, 3, true)
    if (!t) return no(g, "titolo non entra")
    // il fermo immagine
    const fb = side
      ? { x: m + colW + U(g, 70), y: T, w: W - 2 * m - colW - U(g, 70), h: B - T }
      : { x: m, y: T + head.h + U(g, 44), w: W - 2 * m, h: B - (T + head.h + U(g, 44)) - t.h - info.h - U(g, 120) }
    if (fb.h < H * 0.2) return no(g, "fermo immagine basso")
    const ang = (r.chance(0.5) ? -1 : 1) * (1 + 3 * k.energia)
    put(g, { kind: 'rect', name: 'ombra_foto', x: fb.x + U(g, 10), y: fb.y + U(g, 12), w: fb.w, h: fb.h, fill: alpha('#000000', 0.28) })
    photo(g, 'foto', fb, { look: 'trix', adjust: { grain: 50, contrast: 20 } })
    scansione(g, fb, U(g, 6), alpha(notte, 0.35), Math.max(1, U(g, 2)))
    const sp = soggetto(g, fb), q = Math.min(fb.w, fb.h) * 0.3
    const sb = { x: clamp(sp.x - q / 2, fb.x + U(g, 20), fb.x + fb.w - q - U(g, 20)), y: clamp(sp.y - q / 2, fb.y + U(g, 60), fb.y + fb.h - q - U(g, 20)), w: q, h: q }
    put(g, { kind: 'rect', name: 'rilevamento', ...sb, fill: 'transparent', stroke: rosso, sw: Math.max(3, U(g, 4)) })
    targa(g, 'etichetta', `${cam}  ${tempo.ora}`, fb.x + U(g, 16), fb.y + U(g, 16), osd, lt, notte, { deco: true })
    // graffetta
    const gx = fb.x + fb.w * 0.78, gy = fb.y - U(g, 26), gw = U(g, 30), gh = U(g, 96)
    put(g, { kind: 'path', name: 'filo_graffetta', d: `M ${f1(gx)} ${f1(gy + gh)} L ${f1(gx)} ${f1(gy + gw / 2)} A ${f1(gw / 2)} ${f1(gw / 2)} 0 0 1 ${f1(gx + gw)} ${f1(gy + gw / 2)} L ${f1(gx + gw)} ${f1(gy + gh * 0.85)} A ${f1(gw * 0.35)} ${f1(gw * 0.35)} 0 0 1 ${f1(gx + gw * 0.3)} ${f1(gy + gh * 0.85)} L ${f1(gx + gw * 0.3)} ${f1(gy + gw * 0.7)}`, fill: 'transparent', stroke: mix(inch, carta, 0.35), sw: U(g, 5) })
    // titolo e testo, con righe oscurate accanto
    let y = side ? T + head.h + U(g, 60) : fb.y + fb.h + U(g, 40)
    putDisplay(g, 'titolo', t, m, y, inch)
    y += t.h + U(g, 30)
    info.place(m, y, { fg: inch, sec: inch, acc: rosso })
    const yEnd = y + info.h
    // righe di testo coperte dagli omissis (decorative)
    const ox = side ? m : m + (W - 2 * m) * 0.68, ow = side ? colW : (W - 2 * m) * 0.32
    const ry0 = side ? yEnd + U(g, 40) : y, ryMax = H - m * 0.9
    for (let ry = ry0, i = 0; ry + U(g, 14) < ryMax; ry += U(g, 30), i++) {
      const lw = ow * (0.55 + 0.45 * ((i * 37) % 10) / 10)
      put(g, { kind: 'rect', name: 'riga_omissis', x: ox, y: ry, w: lw, h: U(g, 12), fill: alpha(inch, 0.18) })
      if (i % 3 !== 1) put(g, { kind: 'rect', name: 'omissis', x: ox + lw * 0.2, y: ry - U(g, 4), w: lw * (0.35 + 0.3 * ((i * 13) % 5) / 5), h: U(g, 20), fill: inch })
    }
    riga(g, 'piede', `${cam} — ${tempo.data} — PAG. 1/${2 + (k.seme % 4)} — USO INTERNO`, m, H - m * 0.62, U(g, 15), alpha(inch, 0.7), { deco: true, maxW: W - 2 * m })
    // timbro rosso ruotato
    const tim = up(c.kicker || 'Riservato', true)
    const ts = U(g, 34)
    const tw = largo(g, tim, ts, s.label, 0.12) + U(g, 40)
    const sx = side ? fb.x + U(g, 30) : W - m - tw - U(g, 10), sy = side ? fb.y + fb.h - U(g, 130) : fb.y + fb.h - U(g, 40)
    const sa = -8 - 6 * k.energia
    put(g, { kind: 'rect', name: 'timbro', x: sx, y: sy, w: tw, h: ts * 1.13 + U(g, 24), fill: carta, stroke: rosso, sw: U(g, 5), angle: sa, blend: 'multiply', opacity: 0.92 })
    const a = (sa * Math.PI) / 180
    riga(g, 'timbro_testo', tim, sx + U(g, 20) * Math.cos(a) - U(g, 12) * Math.sin(a), sy + U(g, 20) * Math.sin(a) + U(g, 12) * Math.cos(a), ts, rosso, { font: s.label, tracking: 0.12, angle: sa, deco: true, blend: 'multiply' })
    void ang
    return finish(g, 'sorveglianza', 'Sorveglianza')
  }

  // le altre varianti: la tavola è lo schermo notturno
  if (!P.dark) put(g, { kind: 'rect', name: 'notte', x: 0, y: 0, w: W, h: H, fill: notte })
  // misure della fascia del titolo (in basso, o a destra in orizzontale)
  const colW = side ? (W - 2 * m) * 0.36 : W - 2 * m
  const info = infoBlock(g, side ? colW : (W - 2 * m) * 0.64, { kicker: false })
  const t = display(g, up(c.title, true), colW, side ? H * 0.42 : H * 0.18, 120 + 70 * k.scala, 44, 3, true)
  if (!t) return no(g, "titolo non entra")
  const alert = lab(g, `▲ ${c.kicker || 'Movimento rilevato'}`, colW * 0.9, 18)
  const bandH = side ? H : (alert ? alert.h + U(g, 24) : 0) + t.h + U(g, 30) + info.h + U(g, 50) + (H - B)
  const screen: Box = side ? { x: 0, y: 0, w: W - colW - m * 2, h: H } : { x: 0, y: 0, w: W, h: H - bandH }
  if (!side && screen.h < H * 0.42) return no(g, "schermo basso")

  if (v === 0) {
    /* ── monitor singolo: tutta la foto, mirino sul soggetto, OSD agli angoli ── */
    photo(g, 'foto', screen, night)
    const sp = soggetto(g, screen)
    const q = Math.min(screen.w, screen.h) * (0.34 + 0.1 * k.scala)
    const sb = { x: clamp(sp.x - q / 2, screen.x + U(g, 40), screen.x + screen.w - q - U(g, 40)), y: clamp(sp.y - q / 2, Math.max(T, screen.y) + U(g, 90), screen.y + screen.h - q - U(g, 60)), w: q, h: q }
    // velo scuro sui bordi (vignetta) e righe di scansione in sovrastampa
    put(g, { kind: 'rect', name: 'vignetta', x: screen.x, y: screen.y, w: screen.w, h: screen.h * 0.22, fill: { from: alpha('#000000', 0.55), to: alpha('#000000', 0), fromAt: 0, toAt: 1, vertical: true } })
    scansione(g, screen, U(g, 5 + 3 * (1 - k.densita)), alpha('#000000', 0.5), Math.max(1, U(g, 2)))
    put(g, { kind: 'rect', name: 'fosfori', ...screen, fill: fosforo, blend: over(g, notte) === 'screen' ? 'overlay' : 'multiply', opacity: 0.25 + 0.3 * k.sovrastampa })
    // tracciamento: riquadro d'allarme, mirino, croce al centro, scia tratteggiata
    put(g, { kind: 'rect', name: 'rilevamento', ...sb, fill: 'transparent', stroke: allarme, sw: Math.max(3, U(g, 4)) })
    mirino(g, { x: sb.x - U(g, 16), y: sb.y - U(g, 16), w: sb.w + U(g, 32), h: sb.h + U(g, 32) }, fosforo, q * 0.18, Math.max(2, U(g, 3)))
    const cx = sb.x + sb.w / 2, cy = sb.y + sb.h / 2
    put(g, { kind: 'path', name: 'croce', d: `M ${f1(cx - U(g, 22))} ${f1(cy)} L ${f1(cx + U(g, 22))} ${f1(cy)} M ${f1(cx)} ${f1(cy - U(g, 22))} L ${f1(cx)} ${f1(cy + U(g, 22))}`, fill: 'transparent', stroke: fosforo, sw: Math.max(2, U(g, 2)) })
    if (k.densita > 0.4) {
      // secondo bersaglio, più piccolo e solo tracciato
      const q2 = q * 0.45
      const x2 = sb.x + sb.w + q2 < screen.w - U(g, 40) ? sb.x + sb.w + U(g, 50) : sb.x - q2 - U(g, 50)
      const y2 = clamp(sb.y + sb.h * 0.5, screen.y + U(g, 120), screen.y + screen.h - q2 - U(g, 40))
      if (x2 > U(g, 30)) {
        mirino(g, { x: x2, y: y2, w: q2, h: q2 }, fosforo, q2 * 0.25, Math.max(2, U(g, 2)))
        put(g, { kind: 'line', name: 'traccia', x1: cx, y1: cy, x2: x2 + q2 / 2, y2: y2 + q2 / 2, color: fosforo, width: Math.max(2, U(g, 2)), dash: [U(g, 6), U(g, 8)] })
      }
    }
    // etichetta del soggetto (occhiello) agganciata al riquadro
    targa(g, 'etichetta', `ID ${String(100 + (k.seme % 900))} · ${Math.round(88 + (k.seme % 11))}%`, sb.x - Math.max(2, U(g, 2)), sb.y - U(g, 52), osd, suAllarme, allarme, { deco: true })
  } else {
    /* ── sala di controllo: la stessa foto in più monitor, ognuno con il suo taglio e trattamento ── */
    const cols = side ? 2 : 2, rows = side ? 3 : g.format === 'storia' ? 3 : 2
    const gap = U(g, 10)
    const cw = (screen.w - gap * (cols + 1)) / cols, ch = (screen.h - gap * (rows + 1)) / rows
    const sp = soggetto(g, screen)
    const looks: { fx?: Img['fx']; look?: string; adjust?: Record<string, number> }[] = [
      night,
      { look: 'noir', adjust: { grain: 45 } },
      { fx: [{ id: 'gradientMap', p: { c1: notte, c2: allarme, c3: lighter(lt, fosforo), three: 1, contrast: 30 } }] },
      { fx: [{ id: 'dither', p: { dark: notte, light: fosforo, size: 3, levels4: 1 } }] },
      { look: 'trix', adjust: { grain: 60 } },
      night,
    ]
    let n = 0
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const b = { x: screen.x + gap + i * (cw + gap), y: screen.y + gap + j * (ch + gap), w: cw, h: ch }
      // zoom diverso per monitor: dal campo largo al dettaglio sul soggetto
      const z = [1, 2.2, 1.4, 3, 1.7, 2.6][n % 6]
      const vw = screen.w * z, vh = screen.h * z
      const view = { x: b.x + b.w / 2 - (sp.x - screen.x) * z, y: b.y + b.h / 2 - (sp.y - screen.y) * z, w: vw, h: vh }
      // la finestra di vista deve coprire il monitor
      view.x = clamp(view.x, b.x + b.w - vw, b.x); view.y = clamp(view.y, b.y + b.h - vh, b.y)
      const lk = looks[n % looks.length]
      put(g, { kind: 'image', name: n ? `monitor_${n}` : 'foto', ...b, url: g.photo, fallback: notte, view, look: lk.look, adjust: lk.adjust, fx: lk.fx })
      scansione(g, b, U(g, 5), alpha('#000000', 0.45), Math.max(1, U(g, 2)))
      put(g, { kind: 'rect', name: 'cornice_monitor', ...b, fill: 'transparent', stroke: alpha(fosforo, 0.6), sw: Math.max(1.5, U(g, 2)) })
      if (b.y > T - U(g, 40) || true) targa(g, `cam_${n}`, `CAM ${String(n + 1).padStart(2, '0')}`, b.x + U(g, 10), b.y + U(g, 10), U(g, 16), lt, alpha(notte, 0.85) as string, { deco: true })
      if (n === 1) {
        // il dettaglio ingrandito ha il riquadro d'allarme
        const q = Math.min(b.w, b.h) * 0.5
        put(g, { kind: 'rect', name: 'rilevamento', x: b.x + (b.w - q) / 2, y: b.y + (b.h - q) / 2, w: q, h: q, fill: 'transparent', stroke: allarme, sw: Math.max(3, U(g, 4)) })
      }
      n++
    }
  }
  // OSD: REC e ora in alto (in una targhetta piena, dentro la zona sicura)
  const oy = Math.max(T, m * 0.6)
  const rec = targa(g, 'rec', `REC  ${cam}`, m * 0.6 + U(g, 2), oy, osd, lt, notte, { deco: true })
  if (rec) put(g, { kind: 'circle', name: 'punto_rec', cx: rec.x + rec.w + U(g, 22), cy: rec.y + rec.h / 2, r: U(g, 11), fill: allarme })
  targa(g, 'ora', `${tempo.data}  ${tempo.ora}`, screen.x + screen.w - m * 0.6, oy, osd, lt, notte, { align: 'right', deco: true, maxW: screen.w * 0.55 })
  // coordinate sul bordo dello schermo (decorative)
  const fondoSchermo = Math.min(screen.y + screen.h, B + U(g, 4))
  const bt = targa(g, 'brand', `${cam} · ${c.brand || 'ingresso'}`, m * 0.6 + U(g, 2), fondoSchermo - U(g, 20) - (osd * 1.13 + U(g, 30)), osd, lt, notte, { maxW: screen.w * 0.7 })
  if (k.densita > 0.3 && bt) riga(g, 'coordinate', `N 44°29'41"  E 11°20'33"  ALT 54M  ZOOM ×${(1 + k.scala * 3).toFixed(1)}`, m * 0.6, bt.y - U(g, 30), U(g, 15), alpha(lt, 0.85), { deco: true, maxW: screen.w - 1.2 * m })
  // la fascia del titolo
  const bx = side ? W - m - colW : m
  let y = side ? Math.max(T, (H - (alert ? alert.h + U(g, 24) : 0) - t.h - U(g, 30) - info.h) / 2) : screen.h + U(g, 30)
  if (side) put(g, { kind: 'rect', name: 'fascia', x: screen.w, y: 0, w: W - screen.w, h: H, fill: notte })
  else put(g, { kind: 'line', name: 'filetto', x1: 0, y1: screen.h, x2: W, y2: screen.h, color: fosforo, width: Math.max(2, U(g, 3)) })
  if (alert) { putLab(g, 'occhiello', alert, bx, y, readable(notte, [allarme, fosforo, lt], 4.5)); y += alert.h + U(g, 24) }
  putDisplay(g, 'titolo', t, bx, y, fosforo === lt ? lt : lighter(fosforo, lt) === lt ? lt : fosforo, 'left', t.w, { su: notte })
  y += t.h + U(g, 30)
  info.place(bx, y, { fg: lt, sec: readable(notte, [P.sec, lt], 4.5), acc: fosforo })
  return finish(g, 'sorveglianza', 'Sorveglianza')
}

/* ═══ Terminale ═════════════════════════════════════════════════════════ */
export function terminale(g: G): Scene | null {
  const { W, H, m, T, B, P, k, s, c } = g
  const v = variante(g, 3)
  const side = g.landscape
  const font = mono(g)
  const schermo = P.dark
  const fondo = P.bg
  const testo = readable(fondo, [P.fg, schermo ? '#ffffff' : '#111111'], 7)
  const segnale = readable(fondo, [P.acc, acc2(g), testo], schermo ? 4.5 : 3.4)
  const tenue = alpha(testo, 0.45)
  const st = g.format === 'storia' ? 1.25 : 1
  // passo 1: il supporto: schermo con righe e trama di caratteri, oppure tabulato a modulo continuo
  const row = U(g, 40 * st)
  if (schermo) {
    griglia(g, 'trama_caratteri', { x: 0, y: 0, w: W, h: H }, row * 0.6, row, alpha(testo, 0.06))
  } else {
    // modulo continuo: righe alternate a fasce, fori di trascinamento sui bordi, perforazione
    for (let y = 0; y < H; y += row * 2) put(g, { kind: 'rect', name: 'fascia_modulo', x: m * 0.95, y, w: W - m * 1.9, h: row, fill: alpha(P.acc, 0.1) })
    let d = ''
    const rr = U(g, 9)
    for (let y = U(g, 24); y < H; y += U(g, 48)) for (const x of [m * 0.45, W - m * 0.45]) d += `M ${f1(x - rr)} ${f1(y)} a ${f1(rr)} ${f1(rr)} 0 1 0 ${f1(2 * rr)} 0 a ${f1(rr)} ${f1(rr)} 0 1 0 ${f1(-2 * rr)} 0 `
    put(g, { kind: 'path', name: 'fori', d, fill: alpha(testo, 0.18), stroke: alpha(testo, 0.4), sw: Math.max(1, g.u) })
    for (const x of [m * 0.92, W - m * 0.92]) put(g, { kind: 'line', name: 'perforazione', x1: x, y1: 0, x2: x, y2: H, color: alpha(testo, 0.35), width: Math.max(1, U(g, 2)), dash: [U(g, 4), U(g, 6)] })
  }
  // passo 2: misure. Colonna del testo, il titolo come comando con il prompt appeso nel margine
  const gutter = U(g, 64)
  const colX = m + gutter
  const colW = side ? (W - 2 * m) * 0.54 - gutter : W - 2 * m - gutter
  const prompt = v === 2 ? '' : '$ '
  const t = display(g, c.title, colW * (prompt ? 0.84 : 0.92) - U(g, 30), side ? H * 0.36 : H * 0.22, 120 + 80 * k.scala, 44, 3)
  if (!t) return no(g, 'titolo non entra')
  const promptW = prompt ? lineWidth(prompt, s.display, t.size, t.tracking ?? 0) : 0
  const X = colX + promptW, Wt = colW - promptW
  if (t.w + t.size * 0.7 > Wt) return no(g, 'comando troppo largo')
  const colR = colX + colW
  // passo 3: intestazione di sistema (brand e data), con il filetto a caratteri
  const tempo = marcaTempo(g)
  const head = lab(g, `${c.brand ?? ''} — ${tempo.data}`, side ? colW : (W - 2 * m) * 0.62, 18 * st)
  if (!head) return no(g, 'testata')
  const ty = Math.max(T, m)
  putLab(g, 'brand', head, m, ty, testo, 'left', head.w, { font })
  const stato = lab(g, schermo ? '● in linea' : `pag. ${String(1 + (k.seme % 9)).padStart(2, '0')}`, W * 0.3, 18 * st)
  if (stato && m + head.w + U(g, 40) < colR - stato.w) putLab(g, 'stato', stato, colR - stato.w, ty, segnale, 'right', stato.w, { font })
  const sepY = ty + head.h + U(g, 18)
  riga(g, 'separatore', '─'.repeat(200), m, sepY - U(g, 8), U(g, 16), tenue, { deco: true, caps: false, tracking: 0, maxW: colR - m })
  const firstY = sepY + U(g, 40)
  let y = firstY
  // passo 4: il comando: occhiello come istruzione, titolo, cursore a blocco
  const cmd = lab(g, v === 2 ? `// ${c.kicker ?? 'progetto'}` : `${(c.kicker || 'esegui').toLowerCase()} --avvia`, Wt, 18 * st)
  if (cmd) { putLab(g, 'occhiello', cmd, X, y, segnale, 'left', cmd.w, { font }); y += cmd.h + U(g, 20) }
  const titleY = y
  if (k.energia > 0.5 && schermo) txt(g, { name: 'fantasma', lines: t.lines, font: s.display, size: t.size, x: X + U(g, 6), y: y + U(g, 3), color: acc2(g), leading: t.leading ?? s.displayLeading, tracking: t.tracking ?? s.displayTracking, deco: true, blend: 'screen', opacity: 0.6 })
  if (prompt) txt(g, { name: 'prompt', lines: ['$'], font: s.display, size: t.size, x: colX, y, color: segnale, leading: 1, deco: true })
  putDisplay(g, 'titolo', t, X, y, testo, 'left', t.w, { su: fondo })
  const lastW = lineWidth(t.lines[t.lines.length - 1], s.display, t.size, t.tracking ?? s.displayTracking)
  const cy = titleY + (t.lines.length - 1) * t.size * (t.leading ?? s.displayLeading)
  put(g, { kind: 'rect', name: 'cursore', x: X + lastW + t.size * 0.12, y: cy + t.size * 0.16, w: t.size * 0.5, h: t.size * 0.86, fill: segnale, opacity: 0.9 })
  y += t.h + U(g, 36)
  // passo 5: la risposta: testo, poi dati allineati (o codice), barra d'avanzamento, invito
  const info = infoBlock(g, Wt, { kicker: false, details: false, cta: false, bodySize: 28 * st })
  if (info.h) y = info.place(X, y, { fg: testo, sec: testo, acc: segnale }) + U(g, 30)
  const detSize = Math.max(18 * g.u, g.sc.note) * st
  const dets = (c.details ?? []).slice(0, side ? 4 : 3)
  if (v === 2) {
    // il contenuto scritto come codice: chiavi nell'inchiostro, stringhe nel colore del segnale
    const q = (x: string) => `"${x}"`
    const rows = [`const dettagli = [`, ...dets.map(d => `  ${q(d)},`), `]`]
    rows.forEach((l, i) => {
      if (largo(g, l, detSize, font, 0.02) > Wt) return
      const chars = [[...l].map((_, ci) => { const a = l.indexOf('"'), b2 = l.lastIndexOf('"'); return a >= 0 && ci >= a && ci <= b2 ? { c: segnale } : null })]
      txt(g, { name: `codice#${i}`, lines: [l], font, size: detSize, x: X, y, color: testo, tracking: 0.02, leading: 1.2, chars })
      y += row * 0.9
    })
    y += U(g, 20)
  } else {
    dets.forEach((d, i) => {
      const key = `${String(i + 1).padStart(2, '0')}`
      const kw = largo(g, key, detSize, font, 0.06), vw = largo(g, d, detSize, font, 0.06)
      if (kw + vw + U(g, 60) > colR - X) return
      riga(g, `dettaglio#${i}`, key, X, y, detSize, segnale, { font })
      const dots = '.'.repeat(Math.max(3, Math.floor((colR - X - kw - vw - U(g, 40)) / Math.max(1, largo(g, '.', detSize, font, 0.06)))))
      riga(g, 'puntini_guida', dots, X + kw + U(g, 14), y, detSize, tenue, { font, deco: true, caps: false })
      riga(g, `valore#${i}`, d, colR, y, detSize, testo, { font, align: 'right', w: 0 })
      y += row
    })
    // barra d'avanzamento a blocchi
    const nb = 16 + Math.round(k.densita * 8), pct = 0.45 + 0.5 * ((k.seme % 50) / 50)
    const bw = Math.min(Wt * 0.62, U(g, 420 * st)), qq = bw / nb
    y += U(g, 10)
    for (let i = 0; i < nb; i++) put(g, { kind: 'rect', name: i / nb < pct ? 'blocco_pieno' : 'blocco_vuoto', x: X + i * qq, y, w: qq - U(g, 3), h: U(g, 24 * st), fill: i / nb < pct ? segnale : alpha(testo, 0.18) })
    riga(g, 'percentuale', `${Math.round(pct * 100)}%`, X + bw + U(g, 16), y + U(g, 1), U(g, 20 * st), testo, { font, deco: true })
    y += U(g, 24 * st) + U(g, 34)
  }
  const cta = lab(g, c.cta ? `${c.cta}_` : '', Wt, 20 * st)
  if (cta) {
    // freccia appesa nel margine, come il prompt
    const ay = y + cta.h / 2, ax = X - U(g, 16)
    put(g, { kind: 'path', name: 'freccia_invito', d: `M ${f1(ax - U(g, 34))} ${f1(ay)} L ${f1(ax)} ${f1(ay)} M ${f1(ax - U(g, 12))} ${f1(ay - U(g, 11))} L ${f1(ax)} ${f1(ay)} L ${f1(ax - U(g, 12))} ${f1(ay + U(g, 11))}`, fill: 'transparent', stroke: segnale, sw: U(g, 4) })
    putLab(g, 'invito', cta, X, y, segnale, 'left', cta.w, { font })
    y += cta.h
  }
  if (y > B + U(g, 4)) return no(g, 'colonna troppo lunga')
  // numeri di riga: uno per ogni riga di base usata
  const nRows = Math.max(4, Math.floor((y - firstY) / row) + 1)
  txt(g, { name: 'numeri_riga', lines: Array.from({ length: nRows }, (_, i) => String(i + 1).padStart(3, '0')), font, size: U(g, 15), x: m * 0.7, y: firstY + U(g, 4), color: tenue, leading: row / U(g, 15), deco: true })
  // passo 6: la foto ridisegnata in caratteri (o a punti), al vivo nello spazio libero
  const fb = side
    ? { x: m + (W - 2 * m) * 0.58, y: 0, w: W - m - (W - 2 * m) * 0.58 + m, h: H }
    : { x: X, y: y + U(g, 60), w: W - X, h: H - y - U(g, 60) }
  if (fb.h > H * 0.14) {
    const fx: Img['fx'] = v === 1
      ? [{ id: 'dither', p: { dark: fondo, light: segnale, size: 3 + Math.round(3 * k.densita), levels4: 1, pattern: 1 } }]
      : [{ id: 'ascii', variant: 'terminale', p: { ink: segnale, bg: fondo, mode: schermo ? 1 : 2, cell: Math.round(7 + 5 * (1 - k.densita)), color: 0, glow: schermo ? 55 : 0 } }]
    if (g.photo) put(g, { kind: 'image', name: 'foto', ...fb, url: g.photo, fallback: fondo, fx })
    else {
      // senza foto: un dump esadecimale che riempie il riquadro, su un campo del colore del segnale
      const hs = U(g, 17 * st), lines: string[] = []
      put(g, { kind: 'rect', name: 'cornice_dump', ...fb, fill: mix(fondo, segnale, schermo ? 0.16 : 0.12) })
      const per = Math.max(4, Math.floor((fb.w - U(g, 28)) / largo(g, '00 ', hs, font, 0)))
      let n = k.seme
      for (let yy = U(g, 16); yy + hs * 1.4 < fb.h; yy += hs * 1.4) lines.push(Array.from({ length: per }, () => { n = (n * 1103515245 + 12345) & 0x7fffffff; return ((n >> 8) & 255).toString(16).padStart(2, '0') }).join(' '))
      txt(g, { name: 'dump', lines, font, size: hs, x: fb.x + U(g, 14), y: fb.y + U(g, 14), color: alpha(segnale, 0.8), leading: 1.4, deco: true, tracking: 0 })
    }
    // etichetta del file sopra la foto
    if (!side) riga(g, 'nome_file', `[ ${(keyword(g) || 'foto').toLowerCase()}.raw  ${Math.round(fb.w)}×${Math.round(fb.h)} ]`, fb.x, fb.y - U(g, 30), U(g, 16), tenue, { font, deco: true, caps: false, maxW: fb.w })
  }
  // righe di scansione sopra a tutto (schermo) o grana d'aghi (tabulato)
  scansione(g, { x: 0, y: 0, w: W, h: H }, U(g, schermo ? 4 : 6), alpha('#000000', schermo ? 0.6 : 0.25), Math.max(1, U(g, 1.5)), 'multiply', 0.6)
  return finish(g, 'terminale', 'Terminale', { specchio: false })
}

export const SYSTEMS_D: Record<'interfaccia' | 'sorveglianza' | 'terminale' | 'brutale' | 'acido' | 'aero' | 'pixel' | 'manga' | 'agenzia', Sistema> = {
  interfaccia,
  sorveglianza,
  terminale,
  brutale,
  acido,
  aero,
  pixel,
  manga,
  agenzia,
}

/** Riferimenti per gli archetipi successivi (evitano gli avvisi di import inutilizzati). */
export const _d = { blobPath, starPath, wobblyPath, treat, words, ctaText, contrast, lum }
