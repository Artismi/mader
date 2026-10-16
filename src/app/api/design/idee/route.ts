import { NextResponse } from 'next/server'
import { chiediIdee } from '@/lib/ai/concetto-modello'
import type { DesignContent } from '@/components/studio/designer/types'

/**
 * Concetto (C1): POST { content } → { idee, fonte, modello?, motivo? }.
 * Una chiamata testuale breve con il registro dei modelli; senza chiave o
 * credito risponde con le idee delle regole (fonte: 'regole').
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { content?: DesignContent }
  if (!body.content?.title) return NextResponse.json({ error: 'serve content con almeno il titolo' }, { status: 400 })
  return NextResponse.json(await chiediIdee(body.content))
}
