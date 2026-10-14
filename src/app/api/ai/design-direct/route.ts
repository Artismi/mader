import { NextResponse } from 'next/server'
import { regia } from '@/lib/ai/designer-roles'

/**
 * Regia del motore designer: dal brief ai contenuti e alle direzioni visive,
 * con la catena di ruoli (analista, regista, copywriter, direttore) e i
 * controlli della maestra. I modelli si scelgono da soli (Gemini, poi
 * OpenRouter) e si passa al successivo quando uno finisce la quota.
 *
 * POST { brief, slides?: number | 'auto', haFoto?: boolean, riservato?: boolean }
 */
export const maxDuration = 120

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { brief?: string; slides?: number | 'auto'; haFoto?: boolean; riservato?: boolean }
  const brief = String(body.brief ?? '').trim()
  if (brief.length < 10) return NextResponse.json({ error: 'Scrivi un brief di almeno qualche parola.' }, { status: 400 })
  const slides = body.slides === 'auto' ? 'auto' : Math.max(1, Math.min(10, Number(body.slides) || 1))
  try {
    const r = await regia(brief, { slides, haFoto: body.haFoto, riservato: !!body.riservato })
    // charset esplicito: alcuni client (PowerShell) altrimenti leggono male gli accenti
    return NextResponse.json(r, { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, log: (e as { log?: unknown }).log }, { status: 502 })
  }
}
