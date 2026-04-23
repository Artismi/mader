import { NextRequest, NextResponse } from 'next/server'
import { designRecipes } from '@/lib/db'

/**
 * GET /api/design/recipes
 * Params: mood, format, limit, few_shot=1 (solo per crew — restituisce prompt-ready text)
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const mood   = sp.get('mood')   ?? undefined
  const format = sp.get('format') ?? undefined
  const limit  = parseInt(sp.get('limit') ?? '20', 10)
  const fewShot = sp.get('few_shot') === '1'

  if (fewShot && mood && format) {
    const recipes = designRecipes.getFewShot(mood, format, Math.min(limit, 5))
    if (recipes.length === 0) {
      return new Response('Nessuna ricetta disponibile.', { headers: { 'Content-Type': 'text/plain' } })
    }
    const text = recipes.map((r, i) => {
      // Restituisce solo i metadati + primi 500 chars del canvas state per non sovraccaricare il prompt
      const preview = r.canvas_state.slice(0, 500)
      return [
        `--- RICETTA ${i + 1}: ${r.name} ---`,
        `Mood: ${r.mood} | Formato: ${r.format} | Score: ${r.score}`,
        r.description ? `Descrizione: ${r.description}` : '',
        `Tags: ${r.tags.join(', ')}`,
        `Canvas JSON (preview): ${preview}...`,
      ].filter(Boolean).join('\n')
    }).join('\n\n')
    return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  const recipes = designRecipes.getAll({ mood, format, limit })
  return NextResponse.json({ recipes })
}

/**
 * POST /api/design/recipes
 * Body: { name, mood, format, description?, canvas_state, thumbnail?, score?, tags?, client_id? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, mood, format, description, canvas_state, thumbnail, score, tags, client_id } = body

  if (!name || !canvas_state || !mood || !format) {
    return NextResponse.json({ error: 'Campi obbligatori: name, mood, format, canvas_state' }, { status: 400 })
  }

  const recipe = designRecipes.create({
    client_id: client_id ?? null,
    name,
    mood,
    format,
    description: description ?? null,
    canvas_state,
    thumbnail: thumbnail ?? null,
    score: score ?? 0,
    tags: Array.isArray(tags) ? tags : [],
  })

  return NextResponse.json({ recipe })
}

/**
 * DELETE /api/design/recipes?id=...
 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })
  designRecipes.delete(id)
  return NextResponse.json({ ok: true })
}
