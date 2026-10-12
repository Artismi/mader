import { NextResponse } from 'next/server'
import { tokens } from '@/lib/db'
import {
  OPENROUTER_DEFAULTS,
  OPENROUTER_PROVIDER,
  getOpenRouterKey,
  getOpenRouterModels,
  setOpenRouterModel,
  type AiTask,
} from '@/lib/ai/model-provider'

// Stato del fornitore AI per la UI: mai la chiave, solo se è collegato,
// i modelli scelti e i crediti rimasti.

export async function GET() {
  const key = getOpenRouterKey()
  let credits: { usage: number; limit: number | null } | null = null

  if (key) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/key', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const { data } = await res.json() as { data?: { usage?: number; limit?: number | null } }
        credits = { usage: data?.usage ?? 0, limit: data?.limit ?? null }
      }
    } catch {
      // crediti non disponibili: lo stato di collegamento basta
    }
  }

  return NextResponse.json({
    openrouter: {
      connected: !!key,
      models: getOpenRouterModels(),
      defaults: OPENROUTER_DEFAULTS,
      credits,
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json() as Partial<Record<AiTask, string>>
  for (const task of ['design', 'general'] as AiTask[]) {
    const value = body[task]
    if (typeof value === 'string' && value.trim()) setOpenRouterModel(task, value)
  }
  return NextResponse.json({ models: getOpenRouterModels() })
}

export async function DELETE() {
  tokens.remove(OPENROUTER_PROVIDER)
  return NextResponse.json({ connected: false })
}
