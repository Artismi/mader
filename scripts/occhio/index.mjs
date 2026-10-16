/**
 * L'occhio in node (banco del designer e Q0): miniature, griglia numerata,
 * memoria dei verdetti su file, conta di chiamate e token. Usa sharp.
 *   OCCHIO_LATO=512   lato lungo delle miniature mandate al modello
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const sharp = createRequire(import.meta.url)('sharp')
export const LATO = Number(process.env.OCCHIO_LATO ?? 512)

/** Da file, Buffer o data URL a { mime, dati }. */
export function leggi(x) {
  if (Buffer.isBuffer(x)) return x
  if (typeof x === 'string' && x.startsWith('data:')) return Buffer.from(x.split(',')[1], 'base64')
  if (typeof x === 'object' && x?.dati) return Buffer.from(x.dati)
  return fs.readFileSync(x)
}

/** Miniatura JPEG con il lato lungo a `lato` px (mai ingrandita). */
export async function miniatura(x, lato = LATO) {
  const { data, info } = await sharp(leggi(x)).resize(lato, lato, { fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 82 }).toBuffer({ resolveWithObject: true })
  return { mime: 'image/jpeg', dati: data, w: info.width, h: info.height }
}

/** Le miniature in una sola immagine, in colonne, ognuna con il suo numero (1…n) in un cartellino. */
export async function griglia(imgs, o = {}) {
  const n = imgs.length, cols = o.colonne ?? (n <= 2 ? n : n <= 4 ? 2 : 3), rows = Math.ceil(n / cols)
  const cw = Math.max(...imgs.map(i => i.w)), ch = Math.max(...imgs.map(i => i.h)), gap = 12, cart = 44
  const W = cols * cw + (cols + 1) * gap, H = rows * ch + (rows + 1) * gap
  const pezzi = []
  imgs.forEach((im, i) => {
    const x = gap + (i % cols) * (cw + gap), y = gap + Math.floor(i / cols) * (ch + gap)
    pezzi.push({ input: Buffer.from(im.dati), left: x + Math.round((cw - im.w) / 2), top: y + Math.round((ch - im.h) / 2) })
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cart}" height="${cart}"><rect width="${cart}" height="${cart}" rx="6" fill="#d00"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-weight="700" font-size="28" fill="#fff">${i + 1}</text></svg>`
    pezzi.push({ input: Buffer.from(svg), left: x + 4, top: y + 4 })
  })
  const dati = await sharp({ create: { width: W, height: H, channels: 3, background: '#808080' } }).composite(pezzi).jpeg({ quality: 82 }).toBuffer()
  return { mime: 'image/jpeg', dati, w: W, h: H }
}
