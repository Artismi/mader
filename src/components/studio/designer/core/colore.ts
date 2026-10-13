/**
 * Colore percettivo (OKLCH) per costruire palette invece di sceglierle da un
 * elenco: tinta di partenza, armonia, tono e saturazione, con i contrasti per
 * la lettura garantiti per calcolo.
 */
import type { Pix } from '../gen/tools'
import type { Rng } from '../gen/knobs'

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function oklchToLinear(L: number, C: number, hDeg: number) {
  const h = (hDeg * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
}

/** OKLCH → #rrggbb, riducendo la saturazione finché il colore sta nello spazio sRGB. */
export function oklch(L: number, C: number, h: number): string {
  let c = C
  for (let i = 0; i < 60; i++) {
    const rgb = oklchToLinear(clamp(L), c, h)
    if (rgb.every(v => v >= -0.0005 && v <= 1.0005) || c <= 0) {
      return '#' + rgb.map(v => Math.round(clamp(toGam(clamp(v))) * 255).toString(16).padStart(2, '0')).join('')
    }
    c = Math.max(0, c - 0.006)
  }
  return '#808080'
}

/** #rrggbb → [L, C, h] */
export function toOklch(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => toLin(v / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360]
}

function relLum(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => toLin(v / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrasto = (a: string, b: string) => { const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

/** Sposta la luminosità del colore (stessa tinta) finché contrasta almeno `min` con il fondo. */
export function fino(L: number, C: number, h: number, bg: string, min: number): string {
  const bgL = toOklch(bg)[0]
  const dir = bgL > 0.6 ? -1 : 1
  let l = L
  for (let i = 0; i < 40; i++) {
    const c = oklch(l, C, h)
    if (contrasto(c, bg) >= min) return c
    l = clamp(l + dir * 0.025)
  }
  return oklch(dir < 0 ? 0.12 : 0.97, C * 0.5, h)
}

export type Armonia = 'monocromo' | 'analoghi' | 'complementari' | 'divisi' | 'triade' | 'neutri' | 'acido'
export type Tono = 'chiaro' | 'scuro' | 'colore'
export const ARMONIE: Armonia[] = ['monocromo', 'analoghi', 'complementari', 'divisi', 'triade', 'neutri', 'acido']
export const TONI: Tono[] = ['chiaro', 'scuro', 'colore']

/** Tendenze cromatiche di un registro: pesi di toni e armonie, saturazione, tinte probabili. */
export interface TendenzaColore {
  toni: Partial<Record<Tono, number>>
  armonie: Partial<Record<Armonia, number>>
  /** saturazione dell'accento (OKLCH C) */
  croma: [number, number]
  /** saturazione del fondo chiaro o scuro */
  cromaFondo: [number, number]
  /** tinte preferite (gradi), se il registro ne ha */
  tinte?: [number, number][]
}

export const pesato = <T extends string>(r: Rng, w: Partial<Record<T, number>>): T => {
  const e = Object.entries(w) as [T, number][]
  const tot = e.reduce((a, [, v]) => a + v, 0)
  let x = r.next() * tot
  for (const [k, v] of e) { if ((x -= v) <= 0) return k }
  return e[0][0]
}

const NOMI: [number, string][] = [[0, 'rosso'], [18, 'corallo'], [38, 'arancio'], [58, 'ocra'], [78, 'senape'], [100, 'oliva'], [128, 'verde'], [158, 'smeraldo'], [178, 'acqua'], [198, 'ottanio'], [220, 'azzurro'], [245, 'blu'], [268, 'indaco'], [290, 'viola'], [315, 'magenta'], [340, 'rosa'], [361, 'rosso']]
export const nomeTinta = (h: number) => NOMI.reduce((best, n) => (Math.abs(n[0] - h) < Math.abs(best[0] - h) ? n : best), NOMI[0])[1]

export interface PaletteGen { bg: string; surface: string; ink: string; muted: string; accent: string; accent2: string; onAccent: string; dark: boolean; nome: string; armonia: Armonia; tono: Tono; tinta: number }

const mixHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const ch = (p: number, s: number) => (p >> s) & 255
  return '#' + [16, 8, 0].map(sh => Math.round(ch(pa, sh) + (ch(pb, sh) - ch(pa, sh)) * t).toString(16).padStart(2, '0')).join('')
}

/** Palette costruita: tinta, armonia, tono; contrasti di lettura garantiti. */
export function generaPalette(r: Rng, t: TendenzaColore, o: { tinta?: number; armonia?: Armonia; tono?: Tono } = {}): PaletteGen {
  const armonia = o.armonia ?? pesato(r, t.armonie)
  const tono = o.tono ?? pesato(r, t.toni)
  const range = t.tinte ? r.pick(t.tinte) : null
  const h = o.tinta ?? (range ? r.range(range[0], range[1]) : r.range(0, 360))
  const off = { monocromo: 0, analoghi: r.pick([28, -28, 40]), complementari: 180, divisi: r.pick([150, -150]), triade: 120, neutri: 0, acido: 180 + r.range(-25, 25) }[armonia]
  const h2 = (h + off + 360) % 360
  const croma = armonia === 'acido' ? Math.max(t.croma[1], 0.24) : r.range(t.croma[0], t.croma[1])
  const cf = armonia === 'neutri' ? 0.004 : r.range(t.cromaFondo[0], t.cromaFondo[1])
  let bg: string, ink: string, accent: string, accent2: string
  if (tono === 'chiaro') {
    bg = oklch(r.range(0.95, 0.985), cf, armonia === 'neutri' ? r.range(60, 90) : h)
    ink = fino(r.range(0.16, 0.24), Math.min(0.05, croma * 0.25), h, bg, 8)
    accent = fino(r.range(0.55, 0.7), croma, h, bg, 3)
    accent2 = fino(r.range(0.6, 0.8), croma * (armonia === 'monocromo' ? 0.45 : 0.9), h2, bg, 2)
  } else if (tono === 'scuro') {
    bg = oklch(r.range(0.12, 0.2), cf * 1.5, h)
    ink = fino(r.range(0.93, 0.98), Math.min(0.04, croma * 0.2), h, bg, 9)
    accent = fino(r.range(0.7, 0.85), croma, armonia === 'neutri' ? h : (armonia === 'acido' ? h2 : h), bg, 4)
    accent2 = fino(r.range(0.6, 0.8), croma * 0.9, armonia === 'acido' ? h : h2, bg, 2.2)
  } else {
    // fondo a colore pieno: la tinta principale è il campo; inchiostro scurissimo o chiarissimo
    bg = oklch(r.range(0.6, 0.82), Math.max(croma, 0.12), h)
    const dark = oklch(0.16, 0.03, h), light = oklch(0.98, 0.01, h)
    ink = contrasto(dark, bg) >= contrasto(light, bg) ? dark : light
    accent = fino(toOklch(ink)[0] > 0.5 ? 0.92 : 0.25, croma, h2, bg, 3)
    accent2 = mixHex(bg, ink, 0.35)
  }
  const surface = mixHex(bg, tono === 'colore' ? ink : accent, tono === 'colore' ? 0.1 : 0.12)
  let muted = mixHex(ink, bg, 0.38)
  if (contrasto(muted, bg) < 4.5) muted = mixHex(ink, bg, 0.2)
  const onAccent = [bg, ink, '#ffffff', '#111111'].sort((a, b) => contrasto(b, accent) - contrasto(a, accent))[0]
  const dark = toOklch(bg)[0] < 0.5
  return { bg, surface, ink, muted, accent, accent2, onAccent, dark, armonia, tono, tinta: Math.round(h), nome: `${nomeTinta(h)} ${armonia === 'monocromo' ? 'monocromo' : armonia === 'neutri' ? 'su neutri' : armonia === 'acido' ? 'acido' : '+ ' + nomeTinta(h2)}` }
}

/** Tinta dominante di una foto (pesata per saturazione), per accordare la palette all'immagine. */
export function tintaDominante(pix: Pix): { tinta: number; chiara: boolean } | undefined {
  const bins = new Array(24).fill(0)
  let Lsum = 0, n = 0
  for (let i = 0; i < pix.data.length; i += 16) {
    const hex = '#' + [pix.data[i], pix.data[i + 1], pix.data[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('')
    const [L, C, h] = toOklch(hex)
    Lsum += L; n++
    if (C < 0.04) continue
    bins[Math.floor(h / 15) % 24] += C
  }
  const max = Math.max(...bins)
  if (max <= 0) return n ? { tinta: 60, chiara: Lsum / n > 0.6 } : undefined
  const i = bins.indexOf(max)
  return { tinta: i * 15 + 7, chiara: Lsum / n > 0.6 }
}
