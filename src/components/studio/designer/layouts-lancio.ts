/**
 * Impaginazioni per il lancio di un prodotto. Ognuna è una composizione da
 * designer: zone separate per foto e testo, gerarchia chiara (occhiello ›
 * titolo › testo › dettagli › invito), un solo accento. Tutte le misure
 * vengono dal testo misurato; se qualcosa non sta, l'impaginazione rinuncia.
 */
import type { Scene } from './types'
import {
  type Ctx, label, title, body, detailsLine, ctaText, put, putLabel, putTitle, putBody, hairline, alpha, accentOn, scene,
} from './kit'

const S = (x: Ctx, n: number) => Math.round(n * x.u)

/** Colori del testo sopra una foto scurita. */
const onPhoto = (x: Ctx) => ({ ink: '#f6f1e9', muted: 'rgba(246,241,233,0.74)', scrim: x.s.dark ? x.s.bg : '#120f0c' })

/* 1 ─ Fotografia: foto a tutta tavola, testo in basso su sfumatura ───────── */
export function fotografia(x: Ctx): Scene | null {
  if (!x.hasPhoto) return null
  const { W, H, m, c } = x
  const P = onPhoto(x)
  put(x, { kind: 'image', name: 'foto', x: 0, y: 0, w: W, h: H, url: x.photo, fallback: x.s.surface })
  put(x, { kind: 'rect', name: 'velatura_alto', x: 0, y: 0, w: W, h: Math.round(H * 0.22), fill: { from: alpha(P.scrim, 0.55), to: alpha(P.scrim, 0), fromAt: 0, toAt: 1, vertical: true } })
  put(x, { kind: 'rect', name: 'velatura', x: 0, y: Math.round(H * 0.3), w: W, h: H - Math.round(H * 0.3), fill: { from: alpha(P.scrim, 0), to: alpha(P.scrim, 0.94), fromAt: 0, toAt: 0.62, vertical: true } })

  const brand = label(x, c.brand, x.colW(6))
  const brandBottom = brand ? putLabel(x, 'brand', brand, m, m, x.colW(6), P.ink) : m

  const textW = x.landscape ? x.colW(7) : x.colW(10)
  let y = H - m
  // riga finale: dettagli a sinistra, invito a destra (o uno sotto l'altro se non stanno)
  const cta = label(x, ctaText(c), x.colW(4))
  const det = label(x, detailsLine(c), cta ? x.colW(8) - S(x, 24) : x.colW(12))
  if (cta || det) {
    const rowH = Math.max(cta?.h ?? 0, det?.h ?? 0)
    y -= rowH
    if (det) putLabel(x, 'dettagli', det, m, y, x.colW(8), P.muted)
    if (cta) putLabel(x, 'invito', cta, W - m - x.colW(4), y, x.colW(4), accentOn(x, P.scrim, P.ink), 'right')
    hairline(x, 'filetto', m, y - S(x, 22), W - m, alpha('#f6f1e9', 0.28))
    y -= S(x, 22) + S(x, 40)
  }
  const b = body(x, c.body, x.landscape ? x.colW(6) : x.colW(8), 3)
  if (b) { y -= b.h; putBody(x, b, m, y, x.colW(8), P.muted); y -= S(x, 32) }
  const kick = label(x, c.kicker, textW)
  const room = y - brandBottom - S(x, 56) - (kick ? kick.h + S(x, 22) : 0)
  const t = title(x, c.title, textW, room, x.format === 'storia' ? 168 : 150, 60, x.format === 'storia' ? 3 : 2)
  if (!t) return null
  y -= t.h; putTitle(x, t, m, y, textW, P.ink)
  // sopra la foto l'occhiello resta chiaro: l'accento sulla foto non si legge
  if (kick) { y -= S(x, 22) + kick.h; putLabel(x, 'occhiello', kick, m, y, textW, P.ink) }
  return scene(x, 'fotografia', 'Fotografia a tutta tavola')
}

/* 2 ─ Diviso: foto sopra (o a sinistra), testo sul colore ───────────────── */
export function diviso(x: Ctx): Scene | null {
  if (!x.hasPhoto) return null
  const { W, H, m, c, s } = x
  let tx: number, tw: number, top: number, bottom: number
  if (x.landscape) {
    const pw = Math.round(W * 0.5)
    put(x, { kind: 'image', name: 'foto', x: 0, y: 0, w: pw, h: H, url: x.photo, fallback: s.surface })
    tx = pw + m; tw = W - pw - 2 * m; top = m; bottom = H - m
  } else {
    const ph = Math.round(H * (x.format === 'storia' ? 0.56 : x.format === 'verticale' ? 0.52 : 0.5))
    put(x, { kind: 'image', name: 'foto', x: 0, y: 0, w: W, h: ph, url: x.photo, fallback: s.surface })
    tx = m; tw = W - 2 * m; top = ph + S(x, 56); bottom = H - m
  }
  // piede: brand a sinistra, invito a destra, filetto sopra
  const brand = label(x, c.brand, tw * 0.5)
  const cta = label(x, ctaText(c), tw * 0.45)
  let y = bottom
  if (brand || cta) {
    const rowH = Math.max(brand?.h ?? 0, cta?.h ?? 0)
    y -= rowH
    if (brand) putLabel(x, 'brand', brand, tx, y, tw * 0.5, s.ink)
    if (cta) putLabel(x, 'invito', cta, tx + tw * 0.55, y, tw * 0.45, accentOn(x, s.bg, s.ink), 'right')
    hairline(x, 'filetto', tx, y - S(x, 20), tx + tw, alpha(s.ink, 0.22))
    y -= S(x, 20) + S(x, 36)
  }
  // occhiello, titolo, testo, dettagli: un blocco, in alto (quadrato) o distribuito nello spazio
  const kick = label(x, c.kicker, tw)
  const b = body(x, c.body, Math.min(tw, x.colW(9)), x.format === 'quadrato' && !x.landscape ? 2 : 3, 25)
  const det = label(x, detailsLine(c), tw, 15)
  const head = kick ? kick.h + S(x, 18) : 0
  const tail = (b ? b.h + S(x, 24) : 0) + (det ? det.h + S(x, 20) : 0)
  const t = title(x, c.title, tw, y - top - head - tail - S(x, 8), x.landscape ? 170 : x.format === 'storia' ? 180 : 128, 56, 3)
  if (!t) return null
  const free = y - top - (head + t.h + tail)
  let yt = Math.round(top + free * (x.landscape ? 0.5 : x.format === 'storia' ? 0.3 : 0))
  if (kick) { yt = putLabel(x, 'occhiello', kick, tx, yt, tw, accentOn(x, s.bg, s.ink)) + S(x, 18) }
  yt = putTitle(x, t, tx, yt, tw, s.ink) + S(x, 24)
  if (b) yt = putBody(x, b, tx, yt, Math.min(tw, x.colW(9)), s.muted) + S(x, 20)
  if (det) putLabel(x, 'dettagli', det, tx, yt, tw, s.muted)
  return scene(x, 'diviso', 'Foto e colore')
}

/* 3 ─ Editoriale: testata con filetto, foto incorniciata, testo a colonne ── */
export function editoriale(x: Ctx): Scene | null {
  if (!x.hasPhoto) return null
  const { W, H, m, c, s } = x
  const brand = label(x, c.brand, x.colW(6))
  const kick = label(x, c.kicker, x.colW(6))
  const headH = Math.max(brand?.h ?? 0, kick?.h ?? 0, S(x, 18))
  if (brand) putLabel(x, 'brand', brand, m, m, x.colW(6), s.ink)
  if (kick) putLabel(x, 'occhiello', kick, W - m - x.colW(6), m, x.colW(6), accentOn(x, s.bg, s.ink), 'right')
  const ruleY = m + headH + S(x, 18)
  hairline(x, 'filetto_testata', m, ruleY, W - m, s.ink, 2)

  if (x.landscape) {
    // foto a destra, testo a sinistra
    const px = x.colX(6), py = ruleY + S(x, 32)
    put(x, { kind: 'image', name: 'foto', x: px, y: py, w: W - m - px, h: H - m - py, url: x.photo, fallback: s.surface })
    const tw = x.colW(5)
    let y = py
    const cta = label(x, ctaText(c), tw)
    const det = label(x, detailsLine(c), tw, 15)
    const b = body(x, c.body, tw, 4, 25)
    const tail = (b ? b.h + S(x, 28) : 0) + (det ? det.h + S(x, 18) : 0) + (cta ? cta.h + S(x, 40) : 0)
    const t = title(x, c.title, tw, H - m - y - tail, 170, 54, 3)
    if (!t) return null
    y = putTitle(x, t, m, y, tw, s.ink) + S(x, 28)
    if (b) y = putBody(x, b, m, y, tw, s.muted) + S(x, 18)
    if (det) putLabel(x, 'dettagli', det, m, y, tw, s.muted)
    if (cta) putLabel(x, 'invito', cta, m, H - m - cta.h, tw, accentOn(x, s.bg, s.ink))
    return scene(x, 'editoriale', 'Editoriale')
  }

  const imgY = ruleY + S(x, 32)
  const imgH = Math.round(H * (x.format === 'storia' ? 0.44 : x.format === 'verticale' ? 0.4 : 0.36))
  put(x, { kind: 'image', name: 'foto', x: m, y: imgY, w: W - 2 * m, h: imgH, url: x.photo, fallback: s.surface })
  let y = imgY + imgH + S(x, 40)

  // fondo: invito in basso a sinistra
  const cta = label(x, ctaText(c), x.colW(6))
  const bottom = H - m - (cta ? cta.h + S(x, 36) : 0)
  if (cta) putLabel(x, 'invito', cta, m, H - m - cta.h, x.colW(6), accentOn(x, s.bg, s.ink))

  // colonne: testo (7) e dettagli in elenco (4)
  const b = body(x, c.body, x.colW(7), 4, 24)
  const items = (c.details ?? []).filter(d => d.trim()).slice(0, 4)
  const itemFits = items.map(d => label(x, d, x.colW(4), 15)).filter(Boolean) as NonNullable<ReturnType<typeof label>>[]
  const listH = itemFits.reduce((n, f) => n + f.h + S(x, 26), 0)
  const colsH = Math.max(b?.h ?? 0, listH)
  const t = title(x, c.title, W - 2 * m, bottom - y - colsH - S(x, 32), x.format === 'storia' ? 190 : 128, 56, x.format === 'storia' ? 3 : 2)
  if (!t) return null
  y = putTitle(x, t, m, y, W - 2 * m, s.ink) + S(x, 32)
  if (b) putBody(x, b, m, y, x.colW(7), s.muted)
  let ly = y
  itemFits.forEach((f, i) => {
    hairline(x, `filetto_${i}`, x.colX(8), ly, W - m, alpha(s.ink, 0.25))
    ly += S(x, 12)
    putLabel(x, `dettaglio_${i}`, f, x.colX(8), ly, x.colW(4), s.ink)
    ly += f.h + S(x, 14)
  })
  return scene(x, 'editoriale', 'Editoriale')
}

/* 4 ─ Tipografico: il titolo è l'immagine ──────────────────────────────── */
export function tipografico(x: Ctx): Scene | null {
  const { W, H, m, c, s } = x
  const brand = label(x, c.brand, x.colW(6))
  const kick = label(x, c.kicker, x.colW(6))
  const headH = Math.max(brand?.h ?? 0, kick?.h ?? 0, S(x, 18))
  if (brand) putLabel(x, 'brand', brand, m, m, x.colW(6), s.ink)
  if (kick) putLabel(x, 'occhiello', kick, W - m - x.colW(6), m, x.colW(6), accentOn(x, s.bg, s.ink), 'right')

  // fondo, dal basso: invito e testo a sinistra, dettagli in elenco a destra
  const leftW = x.landscape ? x.colW(5) : x.colW(6)
  const rightX = x.landscape ? x.colX(8) : x.colX(7), rightW = W - m - rightX
  const cta = label(x, ctaText(c), leftW)
  const b = body(x, c.body, leftW, 3, 25)
  const items = (c.details ?? []).filter(d => d.trim()).slice(0, 4)
  const itemFits = items.map(d => label(x, d, rightW, 15)).filter(Boolean) as NonNullable<ReturnType<typeof label>>[]
  let yl = H - m
  if (cta) { yl -= cta.h; putLabel(x, 'invito', cta, m, yl, leftW, accentOn(x, s.bg, s.ink)); yl -= S(x, 28) }
  if (b) { yl -= b.h; putBody(x, b, m, yl, leftW, s.muted) }
  let yr = H - m
  for (let i = itemFits.length - 1; i >= 0; i--) {
    const f = itemFits[i]
    yr -= f.h; putLabel(x, `dettaglio_${i}`, f, rightX, yr, rightW, s.ink)
    yr -= S(x, 12); hairline(x, `filetto_${i}`, rightX, yr, W - m, alpha(s.ink, 0.25)); yr -= S(x, 14)
  }
  const bottomTop = Math.min(yl, yr)

  // titolo grande, a tutta larghezza, bilanciato
  const minTop = m + headH + S(x, 72)
  const barGap = S(x, 36), barH = S(x, 10)
  const t = title(x, c.title, W - 2 * m, bottomTop - minTop - barGap - barH - S(x, 56), x.format === 'storia' ? 260 : 230, 80, x.landscape ? 2 : x.format === 'storia' ? 5 : 4)
  if (!t) return null
  const free = bottomTop - S(x, 56) - minTop - (t.h + barGap + barH)
  const ty = putTitle(x, t, m, Math.round(minTop + free * 0.4), W - 2 * m, s.ink)
  put(x, { kind: 'rect', name: 'barra_accento', x: m, y: ty + barGap, w: x.colW(2), h: barH, fill: s.accent })
  return scene(x, 'tipografico', 'Tipografico')
}

/* 5 ─ Arco: prodotto al centro in una cornice ad arco, tutto centrato ────── */
export function arco(x: Ctx): Scene | null {
  if (!x.hasPhoto) return null
  const { W, H, m, c, s } = x
  if (x.landscape) {
    // arco a sinistra, testo centrato nella metà destra
    const aw = x.colW(4), ah = H - 2 * m
    put(x, { kind: 'image', name: 'foto', x: x.colX(1), y: m, w: aw, h: ah, url: x.photo, fallback: s.surface, shape: 'arch' })
    return centeredText(x, x.colX(6), W - m - x.colX(6), m, H - m, 'arco', 'Arco', true)
  }
  const brand = label(x, c.brand, x.colW(8))
  let y = m
  if (brand) y = putLabel(x, 'brand', brand, m, y, W - 2 * m, s.ink, 'center') + S(x, 44)
  const aw = x.format === 'storia' ? x.colW(9) : x.format === 'verticale' ? x.colW(7) : x.colW(5)
  const ah = Math.min(Math.round(aw * 1.3), Math.round(H * (x.format === 'quadrato' ? 0.46 : 0.5)))
  put(x, { kind: 'image', name: 'foto', x: Math.round((W - aw) / 2), y, w: aw, h: ah, url: x.photo, fallback: s.surface, shape: 'arch' })
  return centeredText(x, m, W - 2 * m, y + ah + S(x, 44), H - m, 'arco', 'Arco')
}

/** Blocco centrato: occhiello, titolo, testo, dettagli, invito a pillola.
 *  In verticale la pillola sta in fondo; con `float` tutto il blocco è centrato nello spazio. */
function centeredText(x: Ctx, left: number, w: number, top: number, bottom: number, id: string, name: string, float = false): Scene | null {
  const { c, s } = x
  const pillF = label(x, c.cta, w * 0.7, 16)
  const pillH = pillF ? Math.round(pillF.h + S(x, 30)) : 0
  const det = label(x, detailsLine(c), w, 15)
  const kick = label(x, c.kicker, w)
  const bw = Math.min(w, x.colW(9))
  const b = x.format === 'quadrato' && !x.landscape ? null : body(x, c.body, bw, 3, 24)
  const fixed = (kick ? kick.h + S(x, 16) : 0) + (b ? b.h + S(x, 22) : 0) + (det ? det.h + S(x, 22) : 0) + (pillF ? pillH + S(x, 30) : 0)
  const t = title(x, c.title, Math.min(w, x.colW(11)), bottom - top - fixed - S(x, 8), float ? 150 : 116, 48, float ? 3 : 2)
  if (!t) return null
  const blockH = fixed + S(x, 22) + t.h
  let y = float ? Math.round(top + (bottom - top - blockH) / 2) : top
  if (kick) y = putLabel(x, 'occhiello', kick, left, y, w, accentOn(x, s.bg, s.ink), 'center') + S(x, 16)
  y = putTitle(x, t, left, y, w, s.ink, 'center') + S(x, 22)
  if (b) y = putBody(x, b, left + (w - bw) / 2, y, bw, s.muted, 'center') + S(x, 22)
  // dettagli e pillola: in fondo alla tavola, o di seguito al blocco se centrato
  let yb = float ? y + (det ? det.h + S(x, 22) : 0) + pillH : bottom
  if (pillF) {
    const pw = Math.round(pillF.w + S(x, 64))
    yb -= pillH
    put(x, { kind: 'rect', name: 'pillola', x: Math.round(left + (w - pw) / 2), y: yb, w: pw, h: pillH, fill: s.accent, r: pillH / 2 })
    putLabel(x, 'invito', pillF, left, yb + (pillH - pillF.h) / 2 + S(x, 1), w, s.onAccent, 'center')
    yb -= S(x, 30)
  }
  if (det) { yb -= det.h; putLabel(x, 'dettagli', det, left, yb, w, s.muted, 'center') }
  return scene(x, id, name)
}

/* 6 ─ Colonna: foto a destra a tutta altezza, colonna di testo a sinistra ── */
export function colonna(x: Ctx): Scene | null {
  if (!x.hasPhoto) return null
  const { W, H, m, c, s } = x
  let tx: number, tw: number, top: number, bottom: number
  if (x.format === 'storia') {
    const ph = Math.round(H * 0.5)
    put(x, { kind: 'image', name: 'foto', x: 0, y: H - ph, w: W, h: ph, url: x.photo, fallback: s.surface })
    tx = m; tw = W - 2 * m; top = m; bottom = H - ph - S(x, 56)
  } else {
    const px = Math.round(W * (x.landscape ? 0.5 : 0.46))
    put(x, { kind: 'image', name: 'foto', x: px, y: 0, w: W - px, h: H, url: x.photo, fallback: s.surface })
    tx = m; tw = px - m - S(x, 56); top = m; bottom = H - m
  }
  const brand = label(x, c.brand, tw)
  let y = top
  if (brand) y = putLabel(x, 'brand', brand, tx, y, tw, s.ink) + S(x, 20)
  if (brand) hairline(x, 'filetto', tx, y, tx + S(x, 48), s.accent, 3)
  // fondo: dettagli in elenco e invito
  const cta = label(x, ctaText(c), tw)
  const items = (c.details ?? []).filter(d => d.trim()).slice(0, 3)
  const itemFits = items.map(d => label(x, d, tw, 15)).filter(Boolean) as NonNullable<ReturnType<typeof label>>[]
  let yb = bottom
  if (cta) { yb -= cta.h; putLabel(x, 'invito', cta, tx, yb, tw, accentOn(x, s.bg, s.ink)); yb -= S(x, 32) }
  for (let i = itemFits.length - 1; i >= 0; i--) { yb -= itemFits[i].h; putLabel(x, `dettaglio_${i}`, itemFits[i], tx, yb, tw, s.muted); yb -= S(x, 12) }
  // centro: occhiello, titolo, testo, centrati in verticale nello spazio rimasto
  const kick = label(x, c.kicker, tw)
  const b = body(x, c.body, tw, x.format === 'storia' ? 3 : 4, 24)
  const room = yb - y - S(x, 64)
  const fixed = (kick ? kick.h + S(x, 18) : 0) + (b ? b.h + S(x, 26) : 0)
  const t = title(x, c.title, tw, room - fixed, x.format === 'storia' ? 150 : 112, 48, 4)
  if (!t) return null
  const blockH = fixed + t.h
  let yc = Math.round(y + S(x, 32) + (room - blockH) / 2)
  if (kick) yc = putLabel(x, 'occhiello', kick, tx, yc, tw, accentOn(x, s.bg, s.ink)) + S(x, 18)
  yc = putTitle(x, t, tx, yc, tw, s.ink) + S(x, 26)
  if (b) putBody(x, b, tx, yc, tw, s.muted)
  return scene(x, 'colonna', 'Colonna e foto')
}

export const LANCIO_LAYOUTS = [fotografia, diviso, editoriale, tipografico, arco, colonna]
