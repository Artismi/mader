/**
 * Catalogo dei modelli letto dai fornitori: serve a non usare più ID ritirati
 * (com'è successo con gemini-2.5-flash). Gli elenchi si scaricano al massimo
 * una volta al giorno, in sottofondo, e restano nel database per i riavvii.
 *
 *   - un ID è disponibile se compare nell'elenco, o se un ID dell'elenco ne è
 *     la versione datata ("claude-sonnet-5-5" → "claude-sonnet-5-5-20260201");
 *   - gli alias "-latest" non sono mai ritirati: li aggiorna il fornitore;
 *   - senza elenco (offline, chiave assente) l'ID resta "sconosciuto" e si prova.
 * Gli ID visti fallire con "no longer available" o 404 si ricordano come ritirati.
 */
import { config } from '@/lib/db'
import { getOpenRouterKey } from '@/lib/ai/model-provider'

export type CatalogProvider = 'openrouter' | 'anthropic' | 'google'
export type IdState = 'ok' | 'ritirato' | 'sconosciuto'

interface Catalog { at: number; ids: string[] }

const DAY = 24 * 3600_000
const key = (p: CatalogProvider) => `ai.catalogo.${p}`
const memory = new Map<CatalogProvider, Catalog>()
const retiredSeen = new Set<string>()
const inFlight = new Map<CatalogProvider, Promise<string[] | null>>()

function load(p: CatalogProvider): Catalog | undefined {
  const m = memory.get(p)
  if (m) return m
  try {
    const raw = config.get(key(p))
    if (!raw) return undefined
    const c = JSON.parse(raw) as Catalog
    if (Array.isArray(c.ids)) { memory.set(p, c); return c }
  } catch { /* elenco rovinato: si riscarica */ }
  return undefined
}

/** Imposta l'elenco a mano (test, o dopo un download). */
export function setCatalog(p: CatalogProvider, ids: string[], at = Date.now()) {
  const c = { at, ids }
  memory.set(p, c)
  try { config.set(key(p), JSON.stringify(c)) } catch { /* database non disponibile: resta in memoria */ }
}

export function clearCatalogs() { memory.clear(); retiredSeen.clear() }

/** Un ID visto fallire perché ritirato o inesistente. */
export function markRetired(p: CatalogProvider, id: string) { retiredSeen.add(`${p}:${id}`) }

export function idState(p: CatalogProvider, id: string, now = Date.now()): IdState {
  if (retiredSeen.has(`${p}:${id}`)) return 'ritirato'
  if (/-latest$/.test(id)) return 'ok'
  const c = load(p)
  if (!c || now - c.at > 7 * DAY) return 'sconosciuto'
  return c.ids.some(x => x === id || x.startsWith(`${id}-`) || x === `models/${id}`) ? 'ok' : 'ritirato'
}

type Fetch = typeof fetch

async function download(p: CatalogProvider, f: Fetch): Promise<string[] | null> {
  const signal = AbortSignal.timeout(8000)
  if (p === 'google') {
    const k = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!k) return null
    const r = await f(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${encodeURIComponent(k)}`, { signal })
    if (!r.ok) return null
    const j = await r.json() as { models?: { name: string }[] }
    return (j.models ?? []).map(m => m.name.replace(/^models\//, ''))
  }
  if (p === 'anthropic') {
    const k = process.env.ANTHROPIC_API_KEY
    if (!k) return null
    const r = await f('https://api.anthropic.com/v1/models?limit=1000', { headers: { 'x-api-key': k, 'anthropic-version': '2023-06-01' }, signal })
    if (!r.ok) return null
    const j = await r.json() as { data?: { id: string }[] }
    return (j.data ?? []).map(m => m.id)
  }
  if (!getOpenRouterKey()) return null
  const r = await f('https://openrouter.ai/api/v1/models', { signal })
  if (!r.ok) return null
  const j = await r.json() as { data?: { id: string }[] }
  return (j.data ?? []).map(m => m.id)
}

/** Scarica l'elenco di un fornitore (una richiesta alla volta). */
export async function refreshCatalog(p: CatalogProvider, f: Fetch = fetch): Promise<string[] | null> {
  const running = inFlight.get(p)
  if (running) return running
  const job = download(p, f).then(ids => { if (ids?.length) setCatalog(p, ids); return ids }).catch(() => null).finally(() => inFlight.delete(p))
  inFlight.set(p, job)
  return job
}

/** In sottofondo: riscarica gli elenchi più vecchi di un giorno. Non blocca mai la richiesta. */
export function refreshStaleCatalogs(providers: CatalogProvider[], now = Date.now()) {
  if (process.env.CREATIVE_OS_NO_CATALOG === '1') return
  for (const p of providers) {
    const c = load(p)
    if (!c || now - c.at > DAY) void refreshCatalog(p)
  }
}

export function catalogInfo() {
  return (['openrouter', 'anthropic', 'google'] as CatalogProvider[]).map(p => {
    const c = load(p)
    return { fornitore: p, aggiornato: c ? new Date(c.at).toISOString() : null, modelli: c?.ids.length ?? 0 }
  })
}
