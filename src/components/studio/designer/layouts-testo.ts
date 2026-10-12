/**
 * Impaginazioni senza foto: il messaggio lo portano tipografia, colore e
 * struttura. Valgono per qualsiasi tipo di contenuto.
 */
import type { Scene } from './types'
import {
  type Ctx, label, title, body, detailsLine, ctaText, put, putLabel, putTitle, putBody, hairline, alpha, accentOn, contrast, scene,
  ornament, glyph,
} from './kit'
import { tipografico } from './layouts-lancio'

const S = (x: Ctx, n: number) => Math.round(n * x.u)

/* Manifesto: tavola intera nel colore d'accento, titolo enorme ───────────── */
export function manifesto(x: Ctx): Scene | null {
  const { W, H, m, c, s } = x
  const bg = s.accent
  const ink = contrast(s.onAccent, bg) >= 4.5 ? s.onAccent : s.ink
  put(x, { kind: 'rect', name: 'fondo', x: 0, y: 0, w: W, h: H, fill: bg })
  const brand = label(x, c.brand, x.colW(6))
  const kick = label(x, c.kicker, x.colW(6))
  const headH = Math.max(brand?.h ?? 0, kick?.h ?? 0, S(x, 18))
  if (brand) putLabel(x, 'brand', brand, m, m, x.colW(6), ink)
  if (kick) putLabel(x, 'occhiello', kick, W - m - x.colW(6), m, x.colW(6), ink, 'right')
  hairline(x, 'filetto_testata', m, m + headH + S(x, 18), W - m, alpha(ink, 0.5), 2)

  const cta = label(x, ctaText(c), x.colW(5))
  const det = label(x, detailsLine(c), cta ? x.colW(7) - S(x, 24) : x.colW(12))
  let y = H - m
  if (cta || det) {
    y -= Math.max(cta?.h ?? 0, det?.h ?? 0)
    if (det) putLabel(x, 'dettagli', det, m, y, x.colW(7), ink)
    if (cta) putLabel(x, 'invito', cta, W - m - x.colW(5), y, x.colW(5), ink, 'right')
    y -= S(x, 44)
  }
  const b = body(x, c.body, x.landscape ? x.colW(6) : x.colW(9), 3, 27)
  if (b) { y -= b.h; putBody(x, b, m, y, x.colW(9), ink); y -= S(x, 48) }
  const top = m + headH + S(x, 64)
  const t = title(x, c.title, W - 2 * m, y - top, 280, 80, x.landscape ? 2 : 5)
  if (!t) return null
  putTitle(x, t, m, y - t.h, W - 2 * m, ink)
  ornament(x, 'trama', { x: 0, y: 0, w: W, h: H }, { salt: 'manifesto', under: true, opacity: 0.16, pal: { bg, ink, accent: ink, muted: ink, surface: bg } })
  return scene(x, 'manifesto', 'Manifesto')
}

/* Fascia: blocco di colore pieno che contiene il titolo ─────────────────── */
export function fascia(x: Ctx): Scene | null {
  const { W, H, m, c, s } = x
  const brand = label(x, c.brand, x.colW(6))
  const cta = label(x, ctaText(c), x.colW(6))
  if (brand) putLabel(x, 'brand', brand, m, m, x.colW(6), s.ink)
  // la fascia occupa la fascia centrale; sotto testo e dettagli
  const bandY = Math.round(H * (x.format === 'storia' ? 0.22 : 0.17))
  const pad = S(x, 56)
  const kick = label(x, c.kicker, W - 2 * m - 2 * pad)
  const t = title(x, c.title, W - 2 * m - 2 * pad, H * 0.3, x.landscape ? 170 : 130, 56, 3)
  if (!t) return null
  const bandH = Math.round(pad * 2 + (kick ? kick.h + S(x, 20) : 0) + t.h)
  put(x, { kind: 'rect', name: 'fascia', x: m, y: bandY, w: W - 2 * m, h: bandH, fill: s.accent })
  const onBand = contrast(s.onAccent, s.accent) >= 4.5 ? s.onAccent : s.ink
  let y = bandY + pad
  if (kick) y = putLabel(x, 'occhiello', kick, m + pad, y, W - 2 * m - 2 * pad, onBand) + S(x, 20)
  putTitle(x, t, m + pad, y, W - 2 * m - 2 * pad, onBand)
  ornament(x, 'trama_fascia', { x: m, y: bandY, w: W - 2 * m, h: bandH }, { salt: 'fascia', under: true, opacity: 0.22, pal: { bg: s.accent, ink: onBand, accent: onBand, muted: onBand, surface: s.accent } })

  let yb = H - m
  if (cta) { yb -= cta.h; putLabel(x, 'invito', cta, m, yb, x.colW(6), accentOn(x, s.bg, s.ink)); yb -= S(x, 40) }
  const items = (c.details ?? []).filter(d => d.trim()).slice(0, 3)
  const cols = items.length
  if (cols) {
    const cw = (W - 2 * m - (cols - 1) * x.g) / cols
    const fits = items.map(d => label(x, d, cw, 15))
    const rowH = Math.max(...fits.map(f => f?.h ?? 0))
    yb -= rowH
    fits.forEach((f, i) => { if (f) putLabel(x, `dettaglio_${i}`, f, m + i * (cw + x.g), yb, cw, s.ink) })
    hairline(x, 'filetto', m, yb - S(x, 16), W - m, alpha(s.ink, 0.25))
    yb -= S(x, 16) + S(x, 40)
  }
  const b = body(x, c.body, x.landscape ? x.colW(6) : x.colW(9), 3, 26)
  let freeBottom = yb
  if (b) {
    const by = Math.max(bandY + bandH + S(x, 48), yb - b.h)
    if (by + b.h > yb) return null
    putBody(x, b, m, by, x.colW(9), s.muted)
    freeBottom = by
  }
  // lo spazio tra la fascia e il testo diventa un pezzo grafico
  const oy = bandY + bandH + S(x, 40)
  ornament(x, 'ornamento', { x: m, y: oy, w: W - 2 * m, h: freeBottom - S(x, 40) - oy }, { salt: 'fascia_sotto' })
  return scene(x, 'fascia', 'Fascia di colore')
}

/* Centrato: composizione simmetrica tra due filetti, molto spazio ───────── */
export function centrato(x: Ctx): Scene | null {
  const { W, H, m, c, s } = x
  const w = x.landscape ? x.colW(8) : W - 2 * m
  const left = (W - w) / 2
  const brand = label(x, c.brand, w)
  if (brand) putLabel(x, 'brand', brand, left, m, w, s.ink, 'center')
  const kick = label(x, c.kicker, w)
  const b = body(x, c.body, Math.min(w, x.colW(8)), 3, 25)
  const det = label(x, detailsLine(c), w, 15)
  const cta = label(x, ctaText(c), w)
  const rule = S(x, 64)
  const fixed = (kick ? kick.h + S(x, 28) : 0) + S(x, 40) * 2 + (b ? b.h + S(x, 32) : 0)
  const avail = H - 2 * m - (brand ? brand.h + S(x, 48) : 0) - (det ? det.h + S(x, 24) : 0) - (cta ? cta.h + S(x, 24) : 0)
  const t = title(x, c.title, Math.min(w, x.colW(11)), avail - fixed - S(x, 40), x.landscape ? 170 : 160, 56, 4)
  if (!t) return null
  const blockH = fixed + t.h
  let y = Math.round((H - blockH) / 2)
  if (kick) y = putLabel(x, 'occhiello', kick, left, y, w, accentOn(x, s.bg, s.ink), 'center') + S(x, 28)
  glyph(x, 'glifo', W / 2, y + S(x, 4), S(x, 34), s.accent, 'centrato')
  y += S(x, 40)
  y = putTitle(x, t, left, y, w, s.ink, 'center') + S(x, 40)
  hairline(x, 'filetto_basso', W / 2 - rule / 2, y, W / 2 + rule / 2, s.accent, 3)
  y += S(x, 32)
  if (b) putBody(x, b, (W - Math.min(w, x.colW(8))) / 2, y, Math.min(w, x.colW(8)), s.muted, 'center')
  let yb = H - m
  if (cta) { yb -= cta.h; putLabel(x, 'invito', cta, left, yb, w, accentOn(x, s.bg, s.ink), 'center'); yb -= S(x, 24) }
  if (det) { yb -= det.h; putLabel(x, 'dettagli', det, left, yb, w, s.muted, 'center') }
  const side = Math.min(W, H) * 0.92
  ornament(x, 'trama', { x: (W - side) / 2, y: (H - side) / 2, w: side, h: side }, { salt: 'centrato', under: true, opacity: 0.1, id: 'anelli' })
  return scene(x, 'centrato', 'Centrato')
}

/* Griglia: titolo in alto a sinistra, dettagli numerati in colonne ──────── */
export function griglia(x: Ctx): Scene | null {
  const { W, H, m, c, s } = x
  const items = (c.details ?? []).filter(d => d.trim()).slice(0, 3)
  const brand = label(x, c.brand, x.colW(6))
  const kick = label(x, c.kicker, x.colW(6))
  const headH = Math.max(brand?.h ?? 0, kick?.h ?? 0, S(x, 18))
  if (brand) putLabel(x, 'brand', brand, m, m, x.colW(6), s.ink)
  if (kick) putLabel(x, 'occhiello', kick, W - m - x.colW(6), m, x.colW(6), accentOn(x, s.bg, s.ink), 'right')
  put(x, { kind: 'rect', name: 'quadrato_accento', x: m, y: m + headH + S(x, 40), w: S(x, 28), h: S(x, 28), fill: s.accent })

  // fondo: colonne numerate, invito
  let yb = H - m
  const cta = label(x, ctaText(c), x.colW(6))
  if (cta) { yb -= cta.h; putLabel(x, 'invito', cta, m, yb, x.colW(6), accentOn(x, s.bg, s.ink)); yb -= S(x, 48) }
  if (items.length) {
    const cols = items.length
    const cw = (W - 2 * m - (cols - 1) * x.g) / cols
    const nums = items.map((_, i) => title(x, String(i + 1).padStart(2, '0'), cw, 200 * x.u, 64, 40, 1))
    const fits = items.map(d => body(x, d, cw - S(x, 8), 2, 22))
    const numH = Math.max(...nums.map(n => n?.h ?? 0)), txtH = Math.max(...fits.map(f => f?.h ?? 0))
    yb -= txtH
    fits.forEach((f, i) => { if (f) putBody(x, f, m + i * (cw + x.g), yb, cw, s.ink) })
    yb -= S(x, 14) + numH
    nums.forEach((n, i) => { if (n) putTitle(x, n, m + i * (cw + x.g), yb, cw, s.accent) })
    // putTitle chiama tutti "titolo": rinomina i numeri
    x.els.slice(-cols).forEach((e, i) => { e.name = `numero_${i + 1}` })
    hairline(x, 'filetto', m, yb - S(x, 24), W - m, alpha(s.ink, 0.3), 2)
    yb -= S(x, 24) + S(x, 56)
  }
  const gridBottom = yb
  // titolo e testo in alto
  const top = m + headH + S(x, 40) + S(x, 28) + S(x, 40)
  const b = body(x, c.body, x.landscape ? x.colW(6) : x.colW(8), 3, 26)
  const t = title(x, c.title, x.landscape ? x.colW(9) : W - 2 * m, yb - top - (b ? b.h + S(x, 32) : 0), 200, 64, 4)
  if (!t) return null
  const y = putTitle(x, t, m, top, W - 2 * m, s.ink) + S(x, 32)
  const yEnd = b ? putBody(x, b, m, y, x.colW(8), s.muted) : y
  // il blocco grafico prende la fascia libera a destra del testo, fino alle colonne
  const ox = b ? x.colX(9) : m, oy = b ? y : yEnd + S(x, 24)
  ornament(x, 'ornamento', { x: ox, y: oy, w: W - m - ox, h: gridBottom - oy }, { salt: 'griglia', r: S(x, 6), prefer: ['tessere', 'puntinato', 'strisce', 'anelli', 'vetrata', 'sfaccettato', 'archi', 'raggiera'] })
  return scene(x, 'griglia', 'Griglia')
}

export const TEXT_LAYOUTS = [tipografico, manifesto, fascia, centrato, griglia]
