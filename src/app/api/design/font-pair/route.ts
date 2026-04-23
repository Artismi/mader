import { FONT_PAIRS } from '@/lib/design/font-pairs'

export async function GET(req: Request) {
  const mood = new URL(req.url).searchParams.get('mood') ?? ''
  const pair = FONT_PAIRS[mood as keyof typeof FONT_PAIRS]
  if (!pair) {
    return Response.json(
      { error: `Font pair '${mood}' non trovato. Valori validi: ${Object.keys(FONT_PAIRS).join(', ')}` },
      { status: 404 }
    )
  }
  return Response.json(pair)
}
