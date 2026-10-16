/**
 * Mattoni dello Scontrino. L'ossatura "banco" è lo scontrino stesso (carta
 * termica a dente di sega con le voci, il totale in negativo e il codice):
 * appoggiato storto al centro (0), sopra la foto (1) o accanto al titolo (2).
 * Il titolo dentro la carta è il mattone "cassa", che sta solo nel banco; con
 * qualunque altro titolo il banco passa alla variante 2 e gli lascia la testata.
 * Dispositivi: timbro a cavallo del bordo, valore cerchiato a penna, freccia.
 * Finiture: il banco a quadretti, lo strato generativo sotto la carta.
 */
import { type G, put, U, txt, para, display, putDisplay, photo, ctaText, alpha, readable, contrast } from '../tools'
import { lineWidth, type Fit } from '../../text'
import { wobblyPath, scribbleEllipse } from '../forme'
import { righe, conVoci, valoreProtagonista, elencoRiuscito } from '../archetipi/voci'
import { riga1, scrivi, mono, inkSu, accSu, acc2, variante, poly, f1, type Pt } from '../archetipi/comune'
import { carta as foglioCarta, cartaPer, timbro as timbroM, codice, sceglie, stratoGenerativo, type Codice } from '../materia'
import { textBox } from '../tools'
import type { Ossatura, MTitolo, MFoto, MSegno, Box } from './tipi'
import { par, no } from './tipi'

const SCALE = [1.75, 1.55, 1.38, 1.22, 1.1, 1, 0.9]
const STACCO = 12
function foglio(cx: number, cy: number, w: number, h: number, deg: number) {
  const a = (deg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a)
  const P = (lx: number, ly: number): Pt => [cx + (lx - w / 2) * ca - (ly - h / 2) * sa, cy + (lx - w / 2) * sa + (ly - h / 2) * ca]
  return { P, deg, w, h, ang: deg || undefined, corners: [P(0, 0), P(w, 0), P(w, h), P(0, h)] as Pt[] }
}
type Foglio = ReturnType<typeof foglio>
const dentro = (g: G, pts: Pt[], pad: number) => pts.every(([x, y]) => x >= pad && y >= pad && x <= g.W - pad && y <= g.H - pad)

/** La variante dello scontrino dal seme (la foto sotto solo se c'è). */
export const varianteScontrino = (g: G) => (variante(g, 3) === 1 && !g.photo ? 0 : variante(g, 3))

export const banco: Ossatura = {
  id: 'banco', nome: 'Scontrino sul banco', ricetta: 'scontrino', cat: 'ossatura', voci: true, offre: ['carta', 'foto-rett'],
  param: { variante: [0, 2], larghezza: [0.55, 0.8] },
  fai(g, piano, p, gen) {
    const { W, H, m, T, B, P, k, s, c } = g
    const rs = righe(g, { max: 7, dettagli: true })
    if (!rs) return false
    const titoloDentro = gen.titolo.id === 'cassa'
    // con il titolo in cassa la variante 2 (titolo fuori) non c'è: si torna al banco; senza foto niente variante 1
    const v0 = titoloDentro ? Math.round(par(p, 'variante', varianteScontrino(g))) : 2
    const v = titoloDentro && (v0 === 2 || (v0 === 1 && !g.photo)) ? 0 : v0
    const titoloFuori = v === 2
    const side = g.landscape
    const font = mono(g)
    const carta = P.dark ? '#f4f1e8' : contrast(P.bg, '#fbfaf6') < 1.08 ? '#efe9dc' : '#fbfaf6'
    const inch = '#1d1d1b'
    const segno = readable(carta, [P.acc, acc2(g), inch], 3.6)
    const pw = side ? W * 0.4 : Math.min(W - 2 * m, W * par(p, 'larghezza', titoloFuori ? 0.6 : 0.72))
    const pad = U(g, 40), inner = pw - 2 * pad
    const dente = U(g, 16)
    const verso = g.r.chance(0.5) ? -1 : 1
    const scalaT = par(gen.titolo.p ?? {}, 'scala', 1)
    // il titolo fuori dalla carta: misurato per primo dal suo mattone, decide lo spazio dello scontrino
    let tF = null as ReturnType<typeof piano.misuraTitolo>
    if (titoloFuori) {
      piano.offre.add(side ? 'campo' : 'riga')
      tF = piano.misuraTitolo({ x: m, y: T, w: side ? W - 2 * m - pw - U(g, 60) : W - 2 * m, h: side ? (B - T) * 0.6 : (B - T) * 0.26, forma: side ? 'campo' : 'riga', maxSize: 170 + 80 * k.scala, minSize: 52, maxLines: 4, caps: true })
      if (!tF) return no(g, 'titolo non entra')
    }
    const alto = titoloFuori && !side ? T + tF!.h + U(g, 50) : T
    const avail = B - alto + U(g, 20)

    function costruisci(f: number) {
      const parti: { h: number; draw: (F: Foglio, y: number) => void }[] = []
      const centro = (ff: Fit, name: string, color: string, deco = false) => ({ h: ff.h, draw: (F: Foglio, y: number) => { const [x, yy] = F.P(pad, y); scrivi(g, name, ff, font, x, yy, color, { align: 'center', w: inner, angle: F.deg, deco }) } })
      const tratteggio = () => ({ h: U(g, 8), draw: (F: Foglio, y: number) => { const a = F.P(pad, y + U(g, 4)), b = F.P(pw - pad, y + U(g, 4)); put(g, { kind: 'line', name: 'tratteggio', x1: a[0], y1: a[1], x2: b[0], y2: b[1], color: alpha(inch, 0.55), width: Math.max(1.5, U(g, 2.5)), dash: [U(g, 8), U(g, 7)] }) } })
      const br = c.brand ? riga1(g, c.brand, font, inner, 30 * f, 18, { tracking: 0.18 }) : null
      if (c.brand && !br) return null
      if (br) parti.push(centro(br, 'brand', inch))
      const intest = riga1(g, `scontrino n. ${String(1000 + (k.seme % 9000))} · cassa ${1 + (k.seme % 4)}`, font, inner, 15 * f, 12, { tracking: 0.1 })
      if (intest) parti.push(centro(intest, 'intestazione', inch, true))
      const kick = c.kicker ? riga1(g, c.kicker, font, inner, 22 * f, 16, { tracking: 0.12 }) : null
      if (kick) parti.push(centro(kick, 'occhiello', segno))
      parti.push(tratteggio())
      if (!titoloFuori) {
        const t = display(g, c.title, inner, avail * 0.3, (96 + 50 * k.scala) * f * scalaT, 40, 3)
        if (!t) return null
        parti.push({ h: t.h, draw: (F, y) => { const [x, yy] = F.P(pad, y); putDisplay(g, 'titolo', t, x, yy, inch, 'center', inner, { angle: F.ang, su: carta }) } })
        const body = !conVoci(g) ? para(g, c.body, inner, 3, 24 * Math.min(f, 1.3)) : null
        if (body) parti.push({ h: body.h, draw: (F, y) => { const [x, yy] = F.P(pad, y); txt(g, { name: 'testo', lines: body.lines, font: s.text, size: body.size, x, y: yy, color: inch, align: 'center', w: inner, leading: body.leading ?? 1.4, angle: F.ang }) } })
        parti.push(tratteggio())
      }
      const rsz = (rs!.length > 5 ? 24 : 28) * f
      const numW = lineWidth('00  ', font, rsz * g.u, 0.04)
      let messe = 0, testi = 0
      for (const [i, r] of rs!.entries()) {
        const vf = r.valore ? riga1(g, r.valore, font, inner * 0.4, rsz, 18, { tracking: 0.02 }) : null
        const nf = riga1(g, r.nome, font, inner - (vf ? vf.w + U(g, 40) : 0) - numW, rsz, 18, { lines: 2, lettura: true })
        if (!nf) continue
        const tf = r.testo ? para(g, r.testo, inner - numW, 2, 22 * Math.min(f, 1.25)) : null
        messe++
        if (tf) testi++
        const h = nf.h + (tf ? tf.h + U(g, STACCO) : 0)
        parti.push({ h, draw: (F, y) => {
          const [nx, ny] = F.P(pad, y)
          const nn = riga1(g, r.n, font, numW, nf.size / g.u, 16, { tracking: 0.04 })
          if (nn) scrivi(g, `numero_${i}`, nn, font, nx, ny, segno, { angle: F.deg })
          const [x, yy] = F.P(pad + numW, y)
          scrivi(g, `voce_${i}`, nf, font, x, yy, inch, { angle: F.deg })
          if (vf) {
            scrivi(g, `valore_${i}`, vf, font, nx, ny, inch, { align: 'right', w: inner, angle: F.deg })
            const lw = lineWidth(nf.lines[nf.lines.length - 1], font, nf.size, nf.tracking ?? 0.04)
            const yb = y + nf.size * (nf.lines.length - 1) * (nf.leading ?? 1.22) + nf.size * 0.95
            const a = F.P(pad + numW + lw + U(g, 14), yb), b = F.P(pw - pad - vf.w - U(g, 14), yb)
            if (b[0] - a[0] > U(g, 24)) put(g, { kind: 'line', name: 'puntini', x1: a[0], y1: a[1], x2: b[0], y2: b[1], color: alpha(inch, 0.5), width: U(g, 3), dash: [U(g, 2), U(g, 8)] })
          }
          if (tf) { const [tx, ty] = F.P(pad + numW, y + nf.h + U(g, STACCO)); txt(g, { name: `testo_${i}`, lines: tf.lines, font: s.text, size: tf.size, x: tx, y: ty, color: '#3a3936', leading: tf.leading ?? 1.35, angle: F.ang }) }
        } })
      }
      const tot = c.numero?.trim() || (c.cta ? ctaText(c) : '')
      const totF = tot ? riga1(g, tot, font, c.numero ? inner * 0.6 : inner - U(g, 40), (c.numero ? 40 : 26) * f, 18, { tracking: 0.06 }) : null
      if (totF) {
        parti.push(tratteggio())
        const lt = c.numero ? riga1(g, 'Totale', font, inner * 0.35, 22 * f, 16) : null
        const bh = totF.h + U(g, 36)
        parti.push({ h: bh, draw: (F, y) => {
          const [x, yy] = F.P(pad - U(g, 8), y)
          put(g, { kind: 'rect', name: 'totale', x, y: yy, w: inner + U(g, 16), h: bh, fill: inch, angle: F.ang })
          const [tx, ty] = F.P(pad + U(g, 14), y + U(g, 18))
          if (c.numero) {
            if (lt) { const [lx, ly] = F.P(pad + U(g, 14), y + U(g, 18) + (totF.h - lt.h) / 2); scrivi(g, 'etichetta_totale', lt, font, lx, ly, carta, { angle: F.deg, deco: true }) }
            const [rx, ry] = F.P(pad, y + U(g, 18))
            scrivi(g, 'numero', totF, font, rx, ry, carta, { align: 'right', w: inner - U(g, 14), angle: F.deg })
          } else scrivi(g, 'invito', totF, font, tx, ty, carta, { angle: F.deg })
        } })
      }
      const cta2 = c.numero && c.cta ? riga1(g, ctaText(c), font, inner, 22 * f, 16) : null
      if (cta2) parti.push(centro(cta2, 'invito', segno))
      const tipoCodice = sceglie<Codice>(g, 'codice', ['barre', 'ean', 'qr'])
      const bcH = U(g, (tipoCodice === 'qr' ? 120 : tipoCodice === 'ean' ? 74 : 60) * Math.min(f, 1.3))
      parti.push({ h: bcH, draw: (F, y) => {
        const w = tipoCodice === 'qr' ? bcH : inner * 0.76
        codice(g, { P: F.P, deg: F.deg, b: { x: 0, y: 0, w: pw, h: F.h }, corners: F.corners }, { x: pad + (inner - w) / 2, y, w, h: bcH }, tipoCodice, inch)
      } })
      const saluto = riga1(g, 'grazie e arrivederci', font, inner, 16 * f, 12, { tracking: 0.14 })
      if (saluto) parti.push(centro(saluto, 'saluto', inch, true))
      const gap = U(g, 20 * Math.min(f, 1.4))
      const ph = parti.reduce((a, q) => a + q.h, 0) + gap * (parti.length - 1) + 2 * pad + 2 * dente
      return { parti, ph, gap, messe, testi }
    }
    let mis: NonNullable<ReturnType<typeof costruisci>> | null = null
    for (const f of SCALE) { const x = costruisci(f); if (x && x.ph <= avail) { mis = x; break } }
    if (!mis) return no(g, 'scontrino troppo lungo')
    if (!elencoRiuscito(g, rs, mis.messe, mis.testi)) return false
    const { parti, ph, gap } = mis
    const deg = titoloFuori ? (k.energia - 0.5) * 5 : v === 1 ? verso * (1.6 + 3 * k.energia) : k.energia > 0.15 ? verso * (1.1 + 1.8 * k.energia) : 0
    const cx = titoloFuori || side ? W - m - pw / 2 - U(g, 10) : W / 2
    const cy = titoloFuori && !side ? alto + Math.min(ph, B - alto) / 2 : (T + B) / 2
    const F = foglio(cx, cy, pw, ph, deg)
    if (!dentro(g, F.corners, m * 0.2)) return no(g, 'scontrino fuori tavola')
    // la foto (mattone foto) sotto la carta: a tutta tavola, a lato, o sotto il titolo accanto allo scontrino
    if (g.photo && (v === 1 || side)) { piano.zonaFoto = side && v !== 1 ? { x: 0, y: 0, w: W * 0.56, h: H } : { x: 0, y: 0, w: W, h: H }; piano.offre.add('fondo-pieno') }
    else if (g.photo && titoloFuori) {
      const pwid = Math.min(...F.corners.map(q => q[0])) - U(g, 30)
      if (pwid > W * 0.22 && B - alto > H * 0.2) piano.zonaFoto = { x: 0, y: alto, w: pwid, h: H - alto }
    }
    const teeth = (y0: number, dir: number) => {
      const n = Math.max(6, Math.round(pw / (dente * 1.6)))
      const out: Pt[] = []
      for (let i = 0; i <= n; i++) out.push(F.P((pw * i) / n, y0 + (i % 2 ? dir * dente : 0)))
      return out
    }
    const shape = [...teeth(0, 1), ...teeth(ph, -1).reverse()]
    piano.sotto = g.els.length
    const scelte = cartaPer(g, 'scontrino')
    foglioCarta(g, { x: cx - pw / 2, y: cy - ph / 2, w: pw, h: ph }, deg, carta, { name: 'carta', sagoma: poly(shape), rientro: dente, ombra: scelte.ombra === 'netta' ? 'piatta' : scelte.ombra, trama: scelte.trama, piega: scelte.piega === 'diagonale' ? 'orizzontale' : scelte.piega })
    let y = dente + pad
    for (const q of parti) { q.draw(F, y); y += q.h + gap }
    piano.carta = { P: F.P, deg, w: pw, h: ph, corners: F.corners, colore: carta }
    piano.ancore.timbro = F.P(pw * 0.78, ph - dente - pad - U(g, 40))
    piano.bersaglio = conVoci(g) && valoreProtagonista(g) ? 'valore_0' : rs.some(r => r.valore) ? `valore_${rs.length - 1}` : 'occhiello'
    if (tF) {
      piano.titolo = tF
      piano.titoloXY = [m, side ? T + (B - T - tF.h) * (0.3 + 0.3 * k.energia) : T]
    }
    return true
  },
}

/** Il titolo dentro lo scontrino: lo impagina il banco, qui c'è solo la dichiarazione. */
export const cassa: MTitolo = {
  id: 'cassa', nome: 'Titolo in cassa', ricetta: 'scontrino', cat: 'titolo', forme: [], serve: ['carta'], param: { scala: [0.8, 1.25] },
  fai: () => null,
}

/** Titolo pieno, misurato nella zona (anche ruotato lungo l'asse). */
export const pieno: MTitolo = {
  id: 'pieno', nome: 'Titolo pieno', ricetta: 'scontrino', cat: 'titolo', forme: ['campo', 'riga'], param: { scala: [0.75, 1.15] },
  fai(g, _piano, z, p) {
    const sc = par(p, 'scala', 1)
    const t = display(g, g.c.title, z.w, z.h, (z.maxSize ?? 170 + 80 * g.k.scala) * sc, z.minSize ?? 52, z.maxLines ?? 4)
    if (!t) return null
    const ang = z.angle ?? 0, a = (ang * Math.PI) / 180
    const colore = inkSu(g, g.P.bg, 3)
    const origine = (x: number, y: number): Pt => {
      if (!ang) return [x, y]
      const cx = x + t.w / 2, cy = y + t.h / 2
      return [cx - (t.w / 2) * Math.cos(a) + (t.h / 2) * Math.sin(a), cy - (t.w / 2) * Math.sin(a) - (t.h / 2) * Math.cos(a)]
    }
    return {
      w: t.w, h: t.h,
      occupa: (x, y) => [{ x, y, w: t.w, h: t.h }],
      davanti: (x, y) => { const [ox, oy] = origine(x, y); putDisplay(g, 'titolo', t, ox, oy, colore, 'left', t.w, { caps: z.caps, angle: ang || undefined }) },
    }
  },
}

export const piena: MFoto = {
  id: 'piena', nome: 'Foto piena', ricetta: 'scontrino', cat: 'foto', serve: ['foto-rett'],
  fai(g, piano) { photo(g, 'foto', piano.zonaFoto!); return true },
}

export const quadretti: MSegno = {
  id: 'quadretti', nome: 'Banco a quadretti', ricetta: 'scontrino', cat: 'finiture', dove: 'fondo', param: { passo: [30, 64] },
  fai(g, piano, p) {
    if (piano.offre.has('fondo-pieno')) return false
    const { W, H } = g
    let d = ''
    const q = U(g, par(p, 'passo', 44))
    for (let x = q; x < W; x += q) d += `M ${f1(x)} 0 L ${f1(x)} ${f1(H)} `
    for (let y = q; y < H; y += q) d += `M 0 ${f1(y)} L ${f1(W)} ${f1(y)} `
    put(g, { kind: 'path', name: 'trama', d, fill: 'transparent', stroke: alpha(inkSu(g, g.P.bg), 0.08), sw: Math.max(1, g.u) })
    return true
  },
}

export const strato: MSegno = {
  id: 'strato', nome: 'Strato generativo', ricetta: 'scontrino', cat: 'finiture', dove: 'sotto',
  fai(g) { stratoGenerativo(g, []); return true },
}

export const cerchiato: MSegno = {
  id: 'cerchiato', nome: 'Cerchiato a penna', ricetta: 'scontrino', cat: 'dispositivi',
  fai(g, piano) {
    const nome = piano.bersaglio ?? 'occhiello'
    const t = g.els.find(e => e.kind === 'text' && e.name === nome) as Extract<typeof g.els[number], { kind: 'text' }> | undefined
    if (!t) return false
    const fondo = piano.carta?.colore ?? g.P.bg
    const penna = readable(fondo, [acc2(g), g.P.acc, '#2747c9'], 3)
    const b = textBox(t)
    put(g, { kind: 'path', name: 'cerchiato', d: scribbleEllipse(g.r, { x: b.x - U(g, 6), y: b.y, w: b.w + U(g, 12), h: b.h }), fill: 'transparent', stroke: penna, sw: U(g, 3.5) })
    return true
  },
}

export const timbro: MSegno = {
  id: 'timbro', nome: 'Timbro', ricetta: 'scontrino', cat: 'dispositivi', serve: ['carta'], param: { attivo: [0, 1] },
  fai(g, piano, p) {
    const { k, P } = g
    if (par(p, 'attivo', Math.max(k.densita > 0.35 ? 1 : 0, k.energia > 0.5 ? 1 : 0)) < 0.5) return false
    const [sx, sy] = piano.ancore.timbro as Pt
    timbroM(g, g.c.tipo === 'menu' ? 'pagato' : g.c.tipo === 'dati' ? 'verificato' : 'originale', sx, sy, -12 - 10 * k.energia, readable(piano.carta!.colore, [P.acc, acc2(g), '#c0392b'], 3), U(g, 26))
    return true
  },
}

/** Freccia a mano dal titolo alla carta (solo in orizzontale, con il titolo a sinistra). */
export const freccia: MSegno = {
  id: 'freccia', nome: 'Freccia a mano', ricetta: 'scontrino', cat: 'dispositivi', serve: ['carta'],
  fai(g, piano) {
    if (!g.landscape || !piano.titolo || !piano.titoloXY || !piano.carta) return false
    const [, ty] = piano.titoloXY
    const x1 = g.m + piano.titolo.w * 0.55, y1 = ty + piano.titolo.h + U(g, 40), x2 = Math.min(...piano.carta.corners.map(q => q[0])) - U(g, 30), y2 = y1 + U(g, 80)
    if (!(x2 > x1 + U(g, 80) && y2 < g.B)) return false
    put(g, { kind: 'path', name: 'freccia', d: wobblyPath(g.r, x1, y1, x2, y2, U(g, 6)), fill: 'transparent', stroke: accSu(g, g.P.bg, 3), sw: U(g, 5) })
    return true
  },
}

export type { Box }
