import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import { config, tokens } from '@/lib/db'

// ── Fornitore dei modelli AI ─────────────────────────────────────────────────
// L'utente può collegare il proprio account OpenRouter (OAuth PKCE): la chiave
// resta in user_tokens (solo server) e i crediti consumati sono i suoi.
// Le richieste grafiche usano un modello forte, il resto uno economico.

export type AiTask = 'design' | 'general'
export type ModelChoice = 'openrouter' | 'claude' | 'gemini'

export const OPENROUTER_PROVIDER = 'openrouter'

export const OPENROUTER_DEFAULTS: Record<AiTask, string> = {
  design: 'anthropic/claude-sonnet-5.5',
  general: 'anthropic/claude-haiku-5.5',
}

const CONFIG_KEYS: Record<AiTask, string> = {
  design: 'ai.openrouter.model.design',
  general: 'ai.openrouter.model.general',
}

export function getOpenRouterKey(): string | null {
  return tokens.get(OPENROUTER_PROVIDER)?.provider_token ?? null
}

export function getOpenRouterModels(): Record<AiTask, string> {
  return {
    design: config.get(CONFIG_KEYS.design) || OPENROUTER_DEFAULTS.design,
    general: config.get(CONFIG_KEYS.general) || OPENROUTER_DEFAULTS.general,
  }
}

export function setOpenRouterModel(task: AiTask, modelId: string): void {
  config.set(CONFIG_KEYS[task], modelId.trim())
}

/**
 * Sceglie il modello per una richiesta.
 * - 'openrouter' (o nessuna scelta con OpenRouter collegato) → modello dell'utente per il task
 * - 'gemini' / 'claude' → chiavi d'ambiente del portale, come prima
 */
export function resolveModel(choice: string | undefined, task: AiTask): { model: LanguageModel; label: string } {
  const orKey = getOpenRouterKey()

  if (orKey && (choice === 'openrouter' || !choice)) {
    const modelId = getOpenRouterModels()[task]
    const openrouter = createOpenRouter({
      apiKey: orKey,
      compatibility: 'strict',
      headers: { 'X-Title': 'Creative OS' },
    })
    return { model: openrouter.chat(modelId), label: `openrouter:${modelId}` }
  }

  if (choice === 'gemini') {
    return { model: google('gemini-2.5-flash'), label: 'gemini-2.5-flash' }
  }
  return { model: anthropic('claude-sonnet-5-5'), label: 'claude-sonnet-5-5' }
}

// ── PKCE in attesa ───────────────────────────────────────────────────────────
// Il login può partire in Electron e finire nel browser di sistema (dove il
// login di OpenRouter funziona): niente cookie, il verifier resta nel DB locale.
// App desktop a utente singolo: basta un solo collegamento in attesa alla volta.

const PKCE_KEY = 'ai.openrouter.pkce'
const PKCE_TTL_MS = 10 * 60 * 1000

export function savePendingPkce(verifier: string, external: boolean): void {
  config.set(PKCE_KEY, JSON.stringify({ verifier, external, ts: Date.now() }))
}

export function takePendingPkce(): { verifier: string; external: boolean } | null {
  const raw = config.get(PKCE_KEY)
  config.set(PKCE_KEY, '')
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as { verifier: string; external: boolean; ts: number }
    return Date.now() - p.ts < PKCE_TTL_MS ? p : null
  } catch {
    return null
  }
}
