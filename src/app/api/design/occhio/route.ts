import { NextResponse } from 'next/server'
import { chiediOcchio } from '@/lib/ai/occhio-modello'

/**
 * L'occhio dello Studio: POST { griglia (JPEG data URL), n } → { ordine, scarta, fonte, modello?, motivo? }.
 * Una chiamata con visione sulle proposte composte; senza chiave resta l'ordine del critico.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { griglia?: unknown; n?: unknown }
  const n = Number(body.n)
  if (typeof body.griglia !== 'string' || !body.griglia.startsWith('data:image/jpeg;base64,') || !Number.isInteger(n) || n < 2 || n > 24) {
    return NextResponse.json({ error: 'servono griglia (JPEG) e n tra 2 e 24' }, { status: 400 })
  }
  if (body.griglia.length > 6_000_000) return NextResponse.json({ error: 'griglia troppo grande' }, { status: 413 })
  return NextResponse.json(await chiediOcchio(body.griglia, n))
}
