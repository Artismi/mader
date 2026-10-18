import { NextResponse } from 'next/server'
import { salvaChiave, statoChiavi } from '@/lib/ai/chiavi'

// Schermata Modelli: stato delle chiavi (mai i valori) e salvataggio cifrato.

export async function GET() {
  return NextResponse.json(statoChiavi())
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { id?: unknown; valore?: unknown } | null
  if (typeof body?.id !== 'string' || typeof body.valore !== 'string') {
    return NextResponse.json({ error: 'Servono id e valore' }, { status: 400 })
  }
  try {
    salvaChiave(body.id, body.valore)
    return NextResponse.json(statoChiavi())
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Salvataggio non riuscito' }, { status: 400 })
  }
}
