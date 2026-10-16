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

/**
 * Memoria dei verdetti su file (una riga JSON per verdetto, chiave = impronta di
 * immagine e criterio): lo stesso giudizio non si chiede mai due volte.
 */
export function memoriaFile(file) {
  const m = new Map()
  if (fs.existsSync(file)) for (const r of fs.readFileSync(file, 'utf8').split('\n')) { try { const j = JSON.parse(r); m.set(j.k, j.v) } catch { /* riga vuota o rotta */ } }
  return {
    get: k => m.get(k),
    set: (k, v) => { m.set(k, v); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.appendFileSync(file, JSON.stringify({ k, v }) + '\n') },
    get size() { return m.size },
  }
}

/* ── conta e modelli ───────────────────────────────────────────────────── */
/** Token d'immagine stimati (regola di Anthropic: lato lungo ≤ 1568 px, w·h/750); gli stessi di occhio.ts. */
export function tokenImmagine(w, h) { const s = Math.min(1, 1568 / Math.max(w, h)); return Math.ceil((w * s) * (h * s) / 750) }
export const contaVuota = () => ({ chiamate: 0, tokenImmagine: 0, tokenTesto: 0, consegnate: 0 })
export const somma = (a, b) => Object.fromEntries(Object.keys(contaVuota()).map(k => [k, (a[k] ?? 0) + (b[k] ?? 0)]))
/** «x chiamate, y token d'immagine» in tutto e per tavola consegnata. */
export function riga(nome, c) {
  const per = v => (c.consegnate ? (v / c.consegnate).toFixed(v / c.consegnate < 10 ? 2 : 0) : '—')
  return `${nome.padEnd(6)} ${String(c.chiamate).padStart(5)} chiamate · ${String(c.tokenImmagine).padStart(7)} token immagine · ${String(c.tokenTesto).padStart(6)} testo  |  per tavola consegnata: ${per(c.chiamate)} chiamate, ${per(c.tokenImmagine + c.tokenTesto)} token`
}

/** Modello simulato (prove a secco): classifica a caso ma stabile per la stessa immagine, niente rete. */
export function simulato(rit = 0) {
  return async (prompt, img) => {
    const n = Number(prompt.match(/Tavole: (\d+)/)?.[1] ?? 2)
    let s = 0
    for (let i = 0; i < img.dati.length; i += 997) s = (s * 31 + img.dati[i]) >>> 0
    const ordine = Array.from({ length: n }, (_, i) => i + 1).sort((a, b) => ((a * 2654435761 + s) >>> 0) % 1000 - ((b * 2654435761 + s) >>> 0) % 1000)
    if (rit) await new Promise(r => setTimeout(r, rit))
    return JSON.stringify({ ordine, scarta: [] })
  }
}

/** Modello vero da OCCHIO_MODELLO (es. gemini:gemini-flash-lite-latest o openrouter:google/gemma-3-27b-it:free). */
export async function modello(spec = process.env.OCCHIO_MODELLO) {
  if (!spec) throw new Error('serve OCCHIO_MODELLO (servizio:modello) oppure --a-secco')
  const { chiavi } = await import('../confronto/chiavi.mjs')
  const { chiediGemini, chiediOpenRouter } = await import('../confronto/ia.mjs')
  const k = await chiavi()
  // più modelli separati da virgola: ripiego in ordine; 429 e 503 si riprovano due volte (la quota del giorno no)
  const vie = spec.split(',').map(s => { const [servizio, ...resto] = s.trim().split(':'); return { servizio, id: resto.join(':') } })
  const uno = (v, prompt, img) => (v.servizio === 'gemini' ? chiediGemini(k.gemini, v.id, prompt, [img]) : chiediOpenRouter(k.openrouter, v.id, prompt, [img]))
  return async (prompt, img) => {
    let ultimo
    for (const v of vie) {
      for (const attesa of [0, 4000, 12000]) {
        if (attesa) await new Promise(r => setTimeout(r, attesa))
        try { return await uno(v, prompt, img) } catch (e) {
          ultimo = e
          if (!(e.status === 429 || e.status === 503) || /per.?day|daily|PerDay/i.test(e.message)) break
        }
      }
    }
    throw ultimo
  }
}
