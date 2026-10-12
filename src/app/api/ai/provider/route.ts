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
// i modelli scelti, i crediti rimasti e i modelli gratuiti disponibili.

interface FreeModel { id: string; label: string }
let freeCache: { at: number; models: FreeModel[] } | null = null

/** Modelli gratuiti di OpenRouter che supportano i tool (servono per il canvas). Cache 1h. */
async function freeModels(): Promise<FreeModel[]> {
  if (freeCache && Date.now() - freeCache.at < 60 * 60 * 1000) return freeCache.models
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return freeCache?.models ?? []
    const { data } = await res.json() as { data: { id: string; name?: string; supported_parameters?: string[] }[] }
    const models = data
      .filter(m => m.id.endsWith(':free') && m.supported_parameters?.includes('tools'))
      .map(m => ({ id: m.id, label: (m.name ?? m.id).replace(/\s*\(free\)\s*$/i, '') }))
      .sort((a, b) => a.label.localeCompare(b.label))
    freeCache = { at: Date.now(), models }
    return models
  } catch {
    return freeCache?.models ?? []
  }
}

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
      freeModels: key ? await freeModels() : [],
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
