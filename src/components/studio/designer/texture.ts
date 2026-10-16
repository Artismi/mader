/**
 * Texture della tavola (AS4): materie procedurali parametriche in canvas 2D
 * (carta con fibre, cartone, tessuto, pietra, metallo spazzolato, plastica,
 * vetro smerigliato, intonaco, inchiostro, pieghe, macchie), le texture SVG
 * della libreria dello Studio e le foto di superfici CC0 in cache locale
 * (Poly Haven, fuori da git). Il canvas è in scala di grigi centrata sul
 * grigio medio: il render lo compone in sovrapposizione (overlay), così
 * scurisce e schiarisce senza cambiare la tinta della tavola.
 */
import { TEXTURE_LIBRARY } from '../libraries/texture-library'
import { PRO_ASSETS } from '../libraries/pro-assets'

export const TEXTURE_PROCEDURALI = ['carta', 'cartone', 'tessuto', 'pietra', 'metallo', 'plastica', 'vetro', 'intonaco', 'inchiostro', 'pieghe', 'macchie'] as const
export type TexturaProcedurale = typeof TEXTURE_PROCEDURALI[number]
/**
 * Texture SVG della libreria dello Studio usate dal motore: fuori i pack DS (licenza non verificata) e quelle che
 * nel canvas escono piatte (Crushed Paper, Blueprint Grid, Plastic Wrap, Distortion Layer: filtri SVG non resi).
 */
export const TEXTURE_LIBRERIA = ['Cinematic Grain', 'Analog Fiber', 'Micro Dots 1024', 'CRT Scanlines'].filter(n => Object.values(TEXTURE_LIBRARY).flat().some(t => t.name === n))

const rnd = (seed: number) => { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296 }

function rumore(seed: number) {
  const r = rnd(seed), P = Array.from({ length: 1024 }, () => r())
  const v = (x: number, y: number) => P[(((Math.floor(x) * 73856093) ^ (Math.floor(y) * 19349663)) >>> 0) & 1023]
  const s = (t: number) => t * t * (3 - 2 * t)
  const n = (x: number, y: number) => { const xi = Math.floor(x), yi = Math.floor(y), fx = s(x - xi), fy = s(y - yi); const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy }
  return (x: number, y: number, ott = 4) => { let t = 0, a = 0.5, f = 1, m = 0; for (let i = 0; i < ott; i++) { t += a * n(x * f, y * f); m += a; a /= 2; f *= 2 } return t / m }
}

/** Campo di luminanza per pixel (0 scuro … 1 chiaro, 0.5 neutro) su una griglia ridotta, poi ingrandito. */
function campo(w: number, h: number, passo: number, f: (x: number, y: number) => number) {
  const cw = Math.ceil(w / passo), ch = Math.ceil(h / passo)
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch
  const c = cv.getContext('2d')!, im = c.createImageData(cw, ch)
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const v = Math.max(0, Math.min(255, f(x * passo, y * passo) * 255)), i = (y * cw + x) * 4
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255
  }
  c.putImageData(im, 0, 0)
  return cv
}

function proc(tipo: TexturaProcedurale, w: number, h: number, seed: number): HTMLCanvasElement {
  const r = rnd(seed), n = rumore(seed), S = Math.min(w, h)
  const out = document.createElement('canvas'); out.width = Math.round(w); out.height = Math.round(h)
  const c = out.getContext('2d')!
  const base = (cv: HTMLCanvasElement, liscio = true) => { c.imageSmoothingEnabled = liscio; c.drawImage(cv, 0, 0, out.width, out.height) }
  const grana = (x: number, y: number) => (r() - 0.5) * 0.12
  switch (tipo) {
    case 'carta': base(campo(w, h, 2, (x, y) => 0.5 + (n(x / S * 6, y / S * 6) - 0.5) * 0.18 + grana(x, y)))
      // fibre: trattini sottili chiari e scuri in tutte le direzioni
      for (let i = 0; i < S * 0.9; i++) { const x = r() * w, y = r() * h, a = r() * Math.PI, l = S * (0.006 + r() * 0.02); c.strokeStyle = r() < 0.5 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.25)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + 0.5) * l / 2, y + Math.sin(a + 0.5) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke() }
      break
    case 'cartone': base(campo(w, h, 2, (x, y) => 0.5 + (n(x / S * 3, y / S * 40, 3) - 0.5) * 0.25 + Math.sin(y / S * 140) * 0.05 + grana(x, y)))
      for (let i = 0; i < S * 0.4; i++) { const x = r() * w, y = r() * h; c.fillStyle = `rgba(${r() < 0.6 ? '0,0,0' : '255,255,255'},.2)`; c.fillRect(x, y, 1 + r() * 2, 1) }
      break
    case 'tessuto': { const p = S / (110 + r() * 80)
      base(campo(w, h, 1, (x, y) => 0.5 + (Math.sin(x / p * Math.PI) * Math.sign(Math.sin(y / (2 * p) * Math.PI)) + Math.sin(y / p * Math.PI) * Math.sign(Math.sin(x / (2 * p) * Math.PI))) * 0.09 + (n(x / S * 8, y / S * 8) - 0.5) * 0.12), false)
      break }
    case 'pietra': base(campo(w, h, 2, (x, y) => { const v = n(x / S * 4 + n(x / S * 2, y / S * 2) * 1.5, y / S * 4); return 0.5 + (v - 0.5) * 0.4 + (Math.abs(n(x / S * 9, y / S * 9) - 0.5) < 0.012 ? -0.25 : 0) + grana(x, y) * 1.4 }))
      break
    case 'metallo': base(campo(w, h, 1, (x, y) => 0.5 + (n(x / S * 0.6, y / S * 90, 2) - 0.5) * 0.3 + (x / w - 0.5) * 0.12 + grana(x, y) * 0.5))
      break
    case 'plastica': base(campo(w, h, 3, (x, y) => { const v = n(x / S * 2.5, y / S * 2.5, 3); return 0.5 + Math.pow(Math.max(0, Math.sin(v * 18)), 6) * 0.35 - (v - 0.5) * 0.1 }))
      break
    case 'vetro': { const p = S / (26 + r() * 30)
      base(campo(w, h, 2, (x, y) => 0.5 + Math.sin((x / p) * Math.PI) * 0.12 + (n(x / S * 30, y / S * 30, 2) - 0.5) * 0.18))
      break }
    case 'intonaco': base(campo(w, h, 2, (x, y) => { const v = n(x / S * 14, y / S * 14, 5); return 0.5 + (v - 0.5) * 0.55 + (v > 0.68 ? 0.12 : 0) + grana(x, y) }))
      break
    case 'inchiostro': base(campo(w, h, 2, (x, y) => 0.5 + (n(x / S * 3, y / S * 3) > 0.62 ? -0.18 : 0) + (n(x / S * 25, y / S * 25, 2) - 0.5) * 0.08))
      break
    case 'pieghe': { c.fillStyle = '#808080'; c.fillRect(0, 0, out.width, out.height)
      // due-tre pieghe: luce da un lato della linea, ombra dall'altro
      for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
        const ver = r() < 0.5, pos = (ver ? w : h) * (0.25 + r() * 0.5), lar = S * 0.05
        const g = ver ? c.createLinearGradient(pos - lar, 0, pos + lar, 0) : c.createLinearGradient(0, pos - lar, 0, pos + lar)
        g.addColorStop(0, 'rgba(128,128,128,0)'); g.addColorStop(0.48, 'rgba(90,90,90,.7)'); g.addColorStop(0.52, 'rgba(190,190,190,.7)'); g.addColorStop(1, 'rgba(128,128,128,0)')
        c.fillStyle = g; ver ? c.fillRect(pos - lar, 0, lar * 2, h) : c.fillRect(0, pos - lar, w, lar * 2)
      }
      c.globalAlpha = 0.5; base(campo(w, h, 3, (x, y) => 0.5 + (n(x / S * 7, y / S * 7) - 0.5) * 0.15)); c.globalAlpha = 1
      break }
    case 'macchie': { c.fillStyle = '#808080'; c.fillRect(0, 0, out.width, out.height)
      // macchie, spruzzi e gocce dai pro asset dello Studio (categorie con licenza propria)
      const pezzi = PRO_ASSETS.filter(a => a.path && ['stains', 'spray', 'ink'].includes(a.category))
      for (let i = 0; i < 3 + Math.floor(r() * 3) && pezzi.length; i++) {
        const a = pezzi[Math.floor(r() * pezzi.length)], k = S * (0.002 + r() * 0.004) * (a.defaultScale ?? 1)
        c.save(); c.translate(r() * w, r() * h); c.rotate(r() * Math.PI * 2); c.scale(k, k)
        c.fillStyle = 'rgba(40,40,40,.45)'; c.fill(new Path2D(a.path!)); c.restore()
      }
      break }
  }
  return out
}

/**
 * In grigi, centrata sul grigio medio e con lo stesso scarto tipo per tutte (le texture della libreria
 * sono veli quasi trasparenti, le procedurali hanno contrasti diversi): l'opacità decide la forza.
 * `k` < 1 per le texture fatte di segni rari (pieghe, macchie), che non vanno gonfiate.
 */
function normalizza(cv: HTMLCanvasElement, k = 1, modo: 'multiply' | 'screen' | 'overlay' = 'overlay'): HTMLCanvasElement | null {
  const c = cv.getContext('2d', { willReadFrequently: true })!
  const d = c.getImageData(0, 0, cv.width, cv.height), n = d.data.length / 4
  const l = new Float32Array(n)
  let m = 0
  for (let i = 0; i < n; i++) { l[i] = (d.data[i * 4] + d.data[i * 4 + 1] + d.data[i * 4 + 2]) / 3; m += l[i] }
  m /= n
  let v = 0
  for (let i = 0; i < n; i++) v += (l[i] - m) ** 2
  const sd = Math.sqrt(v / n)
  if (sd < 0.4) return null
  const g = Math.min(12, (28 * k) / sd)
  // moltiplica: bianco = nessun effetto, ogni scarto scurisce; schermo: nero = nessun effetto, ogni scarto schiarisce
  const map = (dv: number) => (modo === 'multiply' ? 255 - Math.abs(dv) * 1.4 : modo === 'screen' ? Math.abs(dv) * 1.4 : 128 + dv)
  for (let i = 0; i < n; i++) { const x = Math.max(0, Math.min(255, map((l[i] - m) * g))); d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = x; d.data[i * 4 + 3] = 255 }
  c.putImageData(d, 0, 0)
  return cv
}

const carica = (src: string) => new Promise<HTMLImageElement | null>(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src })

/** La texture come canvas in grigi (per la sovrapposizione). id: "tex:<procedurale>", "lib:<nome>", "cc0:<url>". */
export async function disegnaTexture(id: string, w: number, h: number, seed: number, modo: 'multiply' | 'screen' | 'overlay' = 'overlay'): Promise<HTMLCanvasElement | null> {
  const [tipo, ...resto] = id.split(':'), nome = resto.join(':')
  if (tipo === 'tex') return normalizza(proc((TEXTURE_PROCEDURALI as readonly string[]).includes(nome) ? nome as TexturaProcedurale : 'carta', w, h, seed), /^(pieghe|macchie|inchiostro)$/.test(nome) ? 0.6 : 1, modo)
  const src = tipo === 'lib' ? Object.values(TEXTURE_LIBRARY).flat().find(t => t.name === nome)?.url : tipo === 'cc0' ? nome : undefined
  if (!src) return null
  const im = await carica(src)
  if (!im) return null
  const out = document.createElement('canvas'); out.width = Math.round(w); out.height = Math.round(h)
  const c = out.getContext('2d')!
  c.fillStyle = '#808080'; c.fillRect(0, 0, out.width, out.height)
  // a tappeto (le foto di superficie sono 1k), poi in grigi e centrata sul grigio medio
  const lato = tipo === 'cc0' ? Math.min(w, h) * 0.6 : Math.max(w, h)
  for (let y = 0; y < h; y += lato) for (let x = 0; x < w; x += lato) c.drawImage(im, x, y, lato, lato)
  return normalizza(out, 1, modo)
}
