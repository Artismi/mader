import { NextResponse } from 'next/server'
import { chiediProgrammiModello } from '@/lib/ai/esempi-modello'
import type { DesignContent, Format } from '@/components/studio/designer/types'

/**
 * G2: POST { content, format, hasPhoto? } → { programmi, esempi, fonte, modello?, motivo? }.
 * Una chiamata testuale con gli esempi più vicini dell'archivio; senza chiave o
 * credito risponde con i programmi simulati dagli esempi (fonte: 'simulato').
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { content?: DesignContent; format?: Format; hasPhoto?: boolean; seme?: number }
  if (!body.content?.title) return NextResponse.json({ error: 'serve content con almeno il titolo' }, { status: 400 })
  return NextResponse.json(await chiediProgrammiModello(body.content, body.format ?? 'quadrato', { hasPhoto: body.hasPhoto, seme: body.seme }))
}
