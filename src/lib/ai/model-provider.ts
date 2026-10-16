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
  // script e banco: la chiave può arrivare dall'ambiente (mai stampata)
  return tokens.get(OPENROUTER_PROVIDER)?.provider_token ?? process.env.OPENROUTER_API_KEY ?? null
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

// La scelta del modello per compito sta in model-registry.ts (resolveModel, pickModel).

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
