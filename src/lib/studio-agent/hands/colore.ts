// Il colore come lo usa il software: toni (fondo profondo, inchiostro, un solo accento),
// armonie e sfumature calcolate in OKLCH (percettivo: niente fanghi, niente arcobaleni flat UI).

export interface Lch { l: number; c: number; h: number }

const toLin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const toSrgb = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

export function hexToLch(hex: string): Lch {
  const n = parseInt((hex.length === 4 ? hex.replace(/(\w)/g, '$1$1') : hex).slice(1, 7), 16)
  const r = toLin(((n >> 16) & 255) / 255), g = toLin(((n >> 8) & 255) / 255), b = toLin((n & 255) / 255)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 }
}

function lchToRgb({ l: L, c, h }: Lch): [number, number, number] {
  const A = c * Math.cos((h * Math.PI) / 180), B = c * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

/** in gamut: se sfora, cala il croma (mai la luce né la tinta) */
export function lchToHex(x: Lch): string {
  let c = Math.max(0, x.c), rgb = lchToRgb({ ...x, c })
  for (let i = 0; i < 24 && rgb.some(v => v < -0.001 || v > 1.001); i++) { c *= 0.9; rgb = lchToRgb({ ...x, c }) }
  return '#' + rgb.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')
}

export const lch = (l: number, c: number, h: number) => lchToHex({ l, c, h: ((h % 360) + 360) % 360 })
const mod = (h: number) => ((h % 360) + 360) % 360

/** una rampa percettiva fra colori (tinta per la via breve), n tappe */
export function rampa(colori: string[], n = 7): string[] {
  if (colori.length < 2) return colori
  const P = colori.map(hexToLch), out: string[] = []
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (P.length - 1), k = Math.min(P.length - 2, Math.floor(t)), f = t - k
    const a = P[k], b = P[k + 1]
    const ha = a.c < 0.02 ? b.h : a.h, hb = b.c < 0.02 ? a.h : b.h
    let dh = hb - ha; if (dh > 180) dh -= 360; if (dh < -180) dh += 360
    out.push(lchToHex({ l: a.l + (b.l - a.l) * f, c: a.c + (b.c - a.c) * f, h: mod(ha + dh * f) }))
  }
  return out
}

/** l'accento di un gruppo di tinte: la più satura */
export function accentoDi(tinte: string[]): string | undefined {
  return [...tinte].sort((a, b) => hexToLch(b).c - hexToLch(a).c)[0]
}

export type Armonia = 'tono' | 'complementare' | 'analoga' | 'triade' | 'acida' | 'notturna'

/** armonie sull'accento: un colore forte, gli altri a sostegno */
export function armoniaSu(acc: string, ink: string, armonia: Armonia, r: () => number): string[] {
  const a = hexToLch(acc), C = Math.max(0.06, a.c)
  const scuro = (h: number, c = C * 0.55) => lch(0.26, c, h), medio = (h: number, c = C * 0.6) => lch(0.5, c, h), chiaro = (h: number, c = C * 0.18) => lch(0.84, c, h)
  switch (armonia) {
    case 'complementare': return [ink, acc, scuro(a.h + 180), chiaro(a.h + 180)]
    case 'analoga': return [ink, acc, medio(a.h + 28, C * 0.8), scuro(a.h - 32)]
    case 'triade': return [ink, acc, medio(a.h + 150, C * 0.35), scuro(a.h + 210, C * 0.4)]
    case 'acida': return [ink, acc, lch(Math.min(0.9, a.l + 0.12), Math.min(0.3, C * 1.1), a.h + 100 + r() * 60)]
    case 'notturna': return [ink, acc, lch(0.18, 0.06, a.h + 200), lch(0.34, 0.08, a.h + 220)]
    default: return [ink, acc, lch(Math.max(0.2, a.l - 0.25), C * 0.8, a.h), lch(Math.max(0.12, a.l - 0.42), C * 0.5, a.h + 12)]
  }
}

/** sfumature astrali: sempre da un fondo profondo verso una luce sola */
export const ASTRALI: string[][] = [
  [lch(0.14, 0.05, 285), lch(0.42, 0.16, 300), lch(0.88, 0.05, 310)], // nebulosa viola
  [lch(0.12, 0.03, 25), lch(0.48, 0.17, 30), lch(0.86, 0.08, 60)],   // brace
  [lch(0.13, 0.04, 200), lch(0.5, 0.11, 175), lch(0.9, 0.06, 150)],  // aurora fredda
  [lch(0.1, 0.02, 260), lch(0.35, 0.1, 255), lch(0.82, 0.04, 240)],  // abisso
  [lch(0.16, 0.06, 340), lch(0.55, 0.18, 355), lch(0.92, 0.04, 20)], // plasma
  [lch(0.12, 0.01, 90), lch(0.6, 0.06, 85), lch(0.95, 0.02, 90)],    // polvere
]

/** sfumature di un tono: dentro la sua tinta, o dal fondo all'accento, o una astrale */
export function sfumaturaDi(tinte: string[], r: () => number, scuro: boolean, astrali = true): string[] {
  const acc = accentoDi(tinte)
  const q = astrali ? r() : r() * 0.8
  if (!acc || q > 0.8) return ASTRALI[Math.floor(r() * ASTRALI.length)]
  const a = hexToLch(acc), C = Math.max(0.05, a.c)
  if (q < 0.35) return scuro ? [lch(0.16, C * 0.4, a.h), acc, lch(0.93, C * 0.25, a.h + 15)] : [lch(0.3, C * 0.7, a.h - 10), acc, lch(0.9, C * 0.3, a.h + 10)]
  if (q < 0.6) return [acc, lch(a.l, C * 0.9, a.h + (r() < 0.5 ? 35 : -35))]
  return [lch(scuro ? 0.22 : 0.35, C * 0.5, a.h + 180), acc]
}
