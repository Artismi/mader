/**
 * OKLCH Color Engine — Creative OS
 *
 * Spazio colore percettivamente uniforme: L (luminosità 0-100%), C (chroma 0-0.4), H (hue 0-360°)
 * Vantaggio su RGB/HSL: calcoli matematici su palette producono risultati visivamente coerenti.
 * L'AI ragiona in OKLCH → converte in hex per Fabric.js.
 */

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export interface OklchColor {
  l: number  // Lightness 0-1 (0=nero, 1=bianco)
  c: number  // Chroma 0-0.4 (0=grigio, 0.4=massima saturazione)
  h: number  // Hue 0-360°
}

export interface OklchPalette {
  bg:      OklchColor
  primary: OklchColor
  accent:  OklchColor
  text:    OklchColor
  surface: OklchColor
}

export interface HexPalette {
  bg:      string
  primary: string
  accent:  string
  text:    string
  surface: string
}

// ─── Conversioni ──────────────────────────────────────────────────────────────

/** OKLCH → OKLab */
function oklchToOklab(l: number, c: number, h: number): [number, number, number] {
  const hr = (h * Math.PI) / 180
  return [l, c * Math.cos(hr), c * Math.sin(hr)]
}

/** OKLab → Linear sRGB */
function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ]
}

/** Linear sRGB → sRGB (gamma) */
function linearToGamma(c: number): number {
  if (c <= 0.0031308) return 12.92 * c
  return 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }

/** OklchColor → hex string */
export function oklchToHex(color: OklchColor): string {
  const [La, a, b] = oklchToOklab(color.l, color.c, color.h)
  const [lr, lg, lb] = oklabToLinearSrgb(La, a, b)
  const r = Math.round(clamp01(linearToGamma(lr)) * 255)
  const g = Math.round(clamp01(linearToGamma(lg)) * 255)
  const bl = Math.round(clamp01(linearToGamma(lb)) * 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

/** Converte una palette OKLCH in hex per Fabric.js */
export function paletteToHex(palette: OklchPalette): HexPalette {
  return {
    bg:      oklchToHex(palette.bg),
    primary: oklchToHex(palette.primary),
    accent:  oklchToHex(palette.accent),
    text:    oklchToHex(palette.text),
    surface: oklchToHex(palette.surface),
  }
}

// ─── Generatori di palette ────────────────────────────────────────────────────

/** Palette monocromatica: stesso hue, variazioni di L e C */
export function monochromatic(hue: number, dark = false): OklchPalette {
  const base = dark ? 0.12 : 0.96
  return {
    bg:      { l: dark ? 0.10 : 0.97, c: 0.005, h: hue },
    primary: { l: dark ? 0.72 : 0.45, c: 0.18,  h: hue },
    accent:  { l: dark ? 0.82 : 0.55, c: 0.24,  h: hue },
    text:    { l: dark ? 0.92 : 0.15, c: 0.01,  h: hue },
    surface: { l: dark ? 0.17 : 0.92, c: 0.008, h: hue },
  }
}

/** Palette complementare: hue + 180° */
export function complementary(primaryHue: number, dark = false): OklchPalette {
  const accentHue = (primaryHue + 180) % 360
  return {
    bg:      { l: dark ? 0.08 : 0.97, c: 0.004, h: primaryHue },
    primary: { l: dark ? 0.70 : 0.42, c: 0.20,  h: primaryHue },
    accent:  { l: dark ? 0.78 : 0.52, c: 0.22,  h: accentHue  },
    text:    { l: dark ? 0.93 : 0.13, c: 0.01,  h: primaryHue },
    surface: { l: dark ? 0.16 : 0.93, c: 0.006, h: primaryHue },
  }
}

/** Palette analoga: hue ± 30° */
export function analogous(primaryHue: number, dark = false): OklchPalette {
  const accentHue = (primaryHue + 30) % 360
  return {
    bg:      { l: dark ? 0.09 : 0.96, c: 0.005, h: primaryHue },
    primary: { l: dark ? 0.68 : 0.44, c: 0.19,  h: primaryHue },
    accent:  { l: dark ? 0.76 : 0.54, c: 0.21,  h: accentHue  },
    text:    { l: dark ? 0.92 : 0.14, c: 0.01,  h: primaryHue },
    surface: { l: dark ? 0.15 : 0.91, c: 0.007, h: (primaryHue - 20 + 360) % 360 },
  }
}

/** Palette triadica: hue, hue+120°, hue+240° */
export function triadic(primaryHue: number, dark = false): OklchPalette {
  const accentHue = (primaryHue + 120) % 360
  return {
    bg:      { l: dark ? 0.09 : 0.97, c: 0.004, h: primaryHue },
    primary: { l: dark ? 0.65 : 0.43, c: 0.21,  h: primaryHue },
    accent:  { l: dark ? 0.74 : 0.53, c: 0.23,  h: accentHue  },
    text:    { l: dark ? 0.91 : 0.12, c: 0.01,  h: primaryHue },
    surface: { l: dark ? 0.14 : 0.92, c: 0.006, h: (primaryHue + 240) % 360 },
  }
}

// ─── Palette predefinite per mood ─────────────────────────────────────────────

export const MOOD_PALETTES: Record<string, OklchPalette> = {
  luxury: {
    bg:      { l: 0.10, c: 0.005, h: 60  },   // quasi nero caldo
    primary: { l: 0.72, c: 0.09,  h: 85  },   // oro
    accent:  { l: 0.78, c: 0.11,  h: 82  },   // oro brillante
    text:    { l: 0.93, c: 0.005, h: 60  },   // bianco caldo
    surface: { l: 0.16, c: 0.007, h: 60  },   // nero elevato
  },
  editorial: {
    bg:      { l: 0.97, c: 0.003, h: 90  },   // bianco carta
    primary: { l: 0.12, c: 0.005, h: 0   },   // inchiostro
    accent:  { l: 0.48, c: 0.22,  h: 25  },   // rosso editoriale
    text:    { l: 0.15, c: 0.005, h: 0   },   // quasi nero
    surface: { l: 0.93, c: 0.003, h: 60  },   // grigio carta
  },
  brutalist: {
    bg:      { l: 0.08, c: 0.000, h: 0   },   // nero assoluto
    primary: { l: 0.95, c: 0.000, h: 0   },   // bianco
    accent:  { l: 0.88, c: 0.20,  h: 95  },   // giallo acceso
    text:    { l: 0.95, c: 0.000, h: 0   },   // bianco
    surface: { l: 0.14, c: 0.000, h: 0   },   // grigio scuro
  },
  minimal: {
    bg:      { l: 0.99, c: 0.000, h: 0   },   // bianco assoluto
    primary: { l: 0.15, c: 0.000, h: 0   },   // grigio molto scuro
    accent:  { l: 0.55, c: 0.000, h: 0   },   // grigio medio
    text:    { l: 0.12, c: 0.000, h: 0   },   // quasi nero
    surface: { l: 0.95, c: 0.000, h: 0   },   // grigio chiarissimo
  },
  tech: {
    bg:      { l: 0.08, c: 0.02,  h: 240 },   // blu notte
    primary: { l: 0.75, c: 0.18,  h: 200 },   // ciano
    accent:  { l: 0.80, c: 0.22,  h: 195 },   // ciano brillante
    text:    { l: 0.92, c: 0.01,  h: 200 },   // bianco freddo
    surface: { l: 0.14, c: 0.03,  h: 240 },   // blu scuro elevato
  },
  fashion: {
    bg:      { l: 0.95, c: 0.008, h: 55  },   // nude
    primary: { l: 0.10, c: 0.000, h: 0   },   // nero
    accent:  { l: 0.72, c: 0.06,  h: 55  },   // beige dorato
    text:    { l: 0.12, c: 0.000, h: 0   },   // quasi nero
    surface: { l: 0.88, c: 0.01,  h: 55  },   // nude scuro
  },
  retro: {
    bg:      { l: 0.94, c: 0.04,  h: 75  },   // crema calda
    primary: { l: 0.38, c: 0.16,  h: 30  },   // terracotta
    accent:  { l: 0.55, c: 0.14,  h: 140 },   // verde salvia
    text:    { l: 0.22, c: 0.05,  h: 40  },   // marrone scuro
    surface: { l: 0.87, c: 0.05,  h: 75  },   // crema scura
  },
}

/** Genera la stringa OKLCH CSS */
export function toOklchCss(c: OklchColor): string {
  return `oklch(${(c.l * 100).toFixed(1)}% ${c.c.toFixed(3)} ${c.h.toFixed(1)})`
}

/** Calcola il contrasto APCA approssimato (Lc) tra testo e sfondo */
export function approximateContrast(text: OklchColor, bg: OklchColor): number {
  // Approssimazione APCA semplificata — usa solo la luminosità percepita
  const lText = text.l ** 2.2
  const lBg   = bg.l ** 2.2
  return Math.abs(lBg - lText) * 100
}

/** Serializza una palette per i prompt del crew (formato compatto) */
export function paletteToPromptString(palette: OklchPalette): string {
  const hex = paletteToHex(palette)
  return Object.entries(palette).map(([key, c]) => {
    const hexVal = hex[key as keyof HexPalette]
    return `${key}: oklch(${(c.l*100).toFixed(0)}% ${c.c.toFixed(2)} ${c.h.toFixed(0)}) → ${hexVal}`
  }).join('\n')
}
