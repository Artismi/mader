import { NextResponse } from 'next/server'
import { getOpenRouterKey, getOpenRouterModels } from '@/lib/ai/model-provider'
import { resolveModel } from '@/lib/ai/model-registry'
import { google } from '@/lib/ai/google'
import { leggiConRipiego, MODELLI_GEMINI } from '@/components/studio/designer/decompila/visione'

/**
 * Decompilatore, lettura del testo: un'immagine di una grafica → blocchi di
 * testo con righe, riquadri e risposte chiuse (famiglia, peso, corsivo,
 * allineamento, ruolo). Le chiavi restano qui: OpenRouter se l'utente l'ha
 * collegato, altrimenti la chiave Gemini del portale.
 *
 * POST { png: dataURL, modelId?: 'openrouter' | 'gemini' } → { lettura, model }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { png?: unknown; modelId?: unknown }
  if (typeof body.png !== 'string' || !body.png.startsWith('data:image/')) return NextResponse.json({ error: 'serve png come data URL' }, { status: 400 })
  if (body.png.length > 12_000_000) return NextResponse.json({ error: 'immagine troppo grande (massimo ~9 MB)' }, { status: 413 })
  const scelta = typeof body.modelId === 'string' ? body.modelId : undefined
  // OpenRouter: il modello "design" dell'utente (con visione); Gemini: gli ID attuali in fila
  const modelli = getOpenRouterKey() && scelta !== 'gemini'
    ? [resolveModel('openrouter', 'design')]
    : MODELLI_GEMINI.map(id => ({ model: google(id), label: id }))
  try {
    const { lettura, label } = await leggiConRipiego(modelli, body.png)
    return NextResponse.json({ lettura, model: label })
  } catch (e) {
    const label = getOpenRouterKey() && scelta !== 'gemini' ? `openrouter:${getOpenRouterModels().design}` : MODELLI_GEMINI.join(', ')
    return NextResponse.json({ error: `Lettura del testo non riuscita (${label}): ${(e as Error).message.slice(0, 200)}` }, { status: 502 })
  }
}
