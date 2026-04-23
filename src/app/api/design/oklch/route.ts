import {
  monochromatic,
  complementary,
  analogous,
  triadic,
  MOOD_PALETTES,
  paletteToHex,
  paletteToPromptString,
  type OklchPalette,
} from '@/lib/design/oklch'

const MOOD_GENERATORS: Record<string, (hue: number, dark?: boolean) => OklchPalette> = {
  monochromatic,
  complementary,
  analogous,
  triadic,
}

/**
 * GET /api/design/oklch
 *
 * Params:
 *   mood=luxury|editorial|...   → restituisce la palette predefinita MOOD_PALETTES
 *   harmony=complementary&hue=250&dark=1 → genera palette da armonia + hue
 *
 * Risposta JSON:
 *   { oklch: OklchPalette, hex: HexPalette, prompt_string: string }
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const mood = sp.get('mood')
  const harmony = sp.get('harmony') ?? 'complementary'
  const hue = parseFloat(sp.get('hue') ?? '220')
  const dark = sp.get('dark') === '1' || sp.get('dark') === 'true'

  let palette: OklchPalette

  if (mood && MOOD_PALETTES[mood]) {
    palette = MOOD_PALETTES[mood]
  } else if (MOOD_GENERATORS[harmony]) {
    palette = MOOD_GENERATORS[harmony](isNaN(hue) ? 220 : hue, dark)
  } else {
    palette = complementary(220, dark)
  }

  return Response.json({
    oklch: palette,
    hex: paletteToHex(palette),
    prompt_string: paletteToPromptString(palette),
  })
}
