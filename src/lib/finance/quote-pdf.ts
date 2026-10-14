/**
 * Preventivo / fattura → PDF A4 (pdf-lib, font standard: nessun file da caricare).
 * Solo lato server.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { config, type Quote } from '@/lib/db'

/** Intestazione di chi emette il documento, salvata in system_config */
export interface StudioProfile { name: string; details: string }
const PROFILE_KEY = 'studio_profile'

export function getProfile(): StudioProfile {
  try { return { name: 'artismi', details: '', ...JSON.parse(config.get(PROFILE_KEY) ?? '{}') } } catch { return { name: 'artismi', details: '' } }
}
export function setProfile(p: StudioProfile) {
  config.set(PROFILE_KEY, JSON.stringify({ name: p.name.trim() || 'artismi', details: p.details.trim() }))
}

// separatore delle migliaia sempre (it-IT di default non lo mette sotto 10.000)
const eur = (n: number) => { const [i, d] = Math.abs(n).toFixed(2).split('.'); return `${n < 0 ? '-' : ''}€ ${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${d}` }
const day = (iso?: string) => (iso ? new Date(iso) : new Date()).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

export const pdfName = (q: Quote) => `${q.type === 'fattura' ? 'Fattura' : 'Preventivo'} ${q.number} - ${q.client_name}.pdf`.replace(/[\\/:*?"<>|]/g, '-')

// I font standard usano WinAnsi: i caratteri fuori set (emoji, ecc.) farebbero fallire il disegno
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'
const safe = (s: string) => [...s].filter(c => c.charCodeAt(0) < 256 || WIN_ANSI_EXTRA.includes(c)).join('').replace(/ +$/, '')

/** Spezza il testo in righe che stanno in `width` */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = []
  for (const para of safe(text).split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= width || !line) line = next
      else { out.push(line); line = word }
    }
    out.push(line)
  }
  return out
}

export async function quotePdf(q: Quote): Promise<Uint8Array> {
  const profile = getProfile()
  const pdf = await PDFDocument.create()
  pdf.setTitle(pdfName(q).replace(/\.pdf$/, ''))
  pdf.setAuthor(profile.name)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const W = 595.28, H = 841.89, M = 56, ink = rgb(0.1, 0.1, 0.1), soft = rgb(0.45, 0.45, 0.45), line = rgb(0.85, 0.85, 0.85)
  let page: PDFPage = pdf.addPage([W, H])
  let y = H - M

  const text = (s: string, x: number, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; right?: boolean } = {}) => {
    const size = opts.size ?? 10, font = opts.font ?? regular, t = safe(s)
    page.drawText(t, { x: opts.right ? x - font.widthOfTextAtSize(t, size) : x, y, size, font, color: opts.color ?? ink })
  }
  const ensure = (need: number) => { if (y - need < M) { page = pdf.addPage([W, H]); y = H - M } }

  // ── intestazione ──
  text(profile.name, M, { size: 16, font: bold })
  const label = q.type === 'fattura' ? 'FATTURA' : 'PREVENTIVO'
  text(label, W - M, { size: 10, font: bold, color: soft, right: true })
  y -= 16
  for (const l of wrap(profile.details, regular, 9, 260)) { if (!l) continue; text(l, M, { size: 9, color: soft }); y -= 12 }
  y = Math.min(y, H - M - 40)

  // ── destinatario e riferimenti ──
  y -= 28
  const top = y
  text('PER', M, { size: 8, font: bold, color: soft }); y -= 14
  text(q.client_name, M, { size: 12, font: bold })
  y = top
  text(`N. ${q.number}`, W - M, { size: 10, font: bold, right: true }); y -= 14
  text(`Data ${day(q.issued_at ?? q.created_at)}`, W - M, { size: 9, color: soft, right: true }); y -= 12
  if (q.expires_at) { text(`Valido fino al ${day(q.expires_at)}`, W - M, { size: 9, color: soft, right: true }); y -= 12 }

  y -= 26
  for (const l of wrap(q.title, bold, 14, W - 2 * M)) { text(l, M, { size: 14, font: bold }); y -= 18 }

  // ── voci ──
  y -= 14
  const cQty = W - M - 170, cUnit = W - M - 85, cTot = W - M
  text('DESCRIZIONE', M, { size: 8, font: bold, color: soft })
  text('Q.TÀ', cQty, { size: 8, font: bold, color: soft, right: true })
  text('PREZZO', cUnit, { size: 8, font: bold, color: soft, right: true })
  text('TOTALE', cTot, { size: 8, font: bold, color: soft, right: true })
  y -= 8
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: line })
  y -= 16

  for (const it of q.items) {
    const lines = wrap(it.desc, regular, 10, cQty - M - 40)
    ensure(lines.length * 13 + 10)
    const rowTop = y
    lines.forEach((l, i) => { y = rowTop - i * 13; text(l, M) })
    y = rowTop
    text(String(it.qty), cQty, { right: true })
    text(eur(it.unit_price), cUnit, { right: true })
    text(eur(it.qty * it.unit_price), cTot, { right: true })
    y = rowTop - lines.length * 13 - 6
    page.drawLine({ start: { x: M, y: y + 2 }, end: { x: W - M, y: y + 2 }, thickness: 0.3, color: line })
    y -= 10
  }

  ensure(60)
  y -= 6
  text('Totale', cUnit, { size: 11, font: bold, right: true })
  text(eur(q.total), cTot, { size: 11, font: bold, right: true })

  if (q.notes?.trim()) {
    y -= 36
    ensure(40)
    text('NOTE', M, { size: 8, font: bold, color: soft }); y -= 14
    for (const l of wrap(q.notes, regular, 9, W - 2 * M)) { ensure(12); text(l, M, { size: 9, color: soft }); y -= 12 }
  }

  return pdf.save()
}
