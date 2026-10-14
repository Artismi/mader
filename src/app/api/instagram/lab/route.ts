import { NextResponse } from 'next/server'
import { labInputSchema, runLab } from '@/lib/ai/instagram'

// Strumenti del circuito Instagram per la UI (anteprima in Pubblicazione, board Editoriale).
// Calcolo locale, niente modelli né rete.
export async function POST(req: Request) {
  const parsed = labInputSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 400 })
  }
  const out = runLab(parsed.data)
  return NextResponse.json(out, { status: out.ok ? 200 : 400 })
}
