import { NextResponse } from 'next/server'
import { z } from 'zod'
import { runAgent } from '@/lib/agent/run'

/**
 * Il guscio come servizio: qualunque strumento dello Studio o pagina del
 * portale chiede "fallo nel sistema" (salva nel piano, crea un incarico,
 * prepara un preventivo…). Stessi strumenti e controlli della chat; le azioni
 * che chiedono conferma tornano come `proposte`.
 *
 * POST { compito, contesto?, gruppi?, strumenti?, modello?, maxPassi?, riservato? }
 */
export const maxDuration = 120

const GRUPPI = ['lavoro', 'clienti', 'idee', 'social', 'studio', 'memoria', 'finanze', 'documenti', 'piano'] as const

const bodySchema = z.object({
  compito: z.string().min(5, 'Descrivi cosa fare (almeno qualche parola).'),
  contesto: z.string().max(20_000).optional(),
  gruppi: z.array(z.enum(GRUPPI)).optional(),
  strumenti: z.array(z.string()).optional(),
  modello: z.string().optional(),
  maxPassi: z.number().int().min(1).max(24).optional(),
  riservato: z.boolean().optional(),
})

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 400 })
  try {
    const r = await runAgent(parsed.data)
    return NextResponse.json(r, { status: r.ok ? 200 : 502 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
