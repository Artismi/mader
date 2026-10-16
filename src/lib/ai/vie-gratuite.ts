/**
 * Vie gratuite: far girare il portale senza spendere, con le chiavi che ci sono già.
 *
 *   - elenco dei modelli gratuiti provati (Gemini nel livello gratuito, OpenRouter ":free"
 *     con strumenti e output strutturato), in ordine di preferenza per compito;
 *   - interruttore "solo gratis" (attivo per impostazione predefinita): il registro usa
 *     solo queste vie; si spegne con `setSoloGratis(false)` o CREATIVE_OS_SOLO_GRATIS=0;
 *   - ritmo per gruppo di quota (OpenRouter free è un solo secchio per account:
 *     20 al minuto, 50 al giorno senza credito); il conto del giorno sta su disco;
 *   - nuovi tentativi brevi su 429 e 503 (la quota del giorno no: si passa oltre);
 *   - memoria delle risposte su disco: stessa richiesta allo stesso modello = nessuna
 *     nuova chiamata (CREATIVE_OS_AI_CACHE=0 o `ai.cache`=0 la spengono).
 * Solo lato server.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { wrapLanguageModel, type LanguageModel } from 'ai'
import type { LanguageModelV3, LanguageModelV3Middleware } from '@ai-sdk/provider'
import { config } from '@/lib/db'

export interface ViaGratuita {
  provider: 'google' | 'openrouter'
  modelId: string
  /** secchio della quota: le vie dello stesso gruppo la condividono */
  gruppo: string
  alMinuto: number
  alGiorno: number
  tools: boolean
  structured: boolean
  vision: boolean
  forza: 'medio' | 'debole'
}

const OR_FREE = { gruppo: 'openrouter:free', alMinuto: 20, alGiorno: 50 }
// Gemini, livello gratuito: limiti prudenti per famiglia (Flash-Lite ~15/min, Flash ~10/min)
const LITE = { alMinuto: 15, alGiorno: 1000 }
const FLASH = { alMinuto: 10, alGiorno: 250 }
const g = (modelId: string, q: typeof LITE, forza: ViaGratuita['forza']): ViaGratuita =>
  ({ provider: 'google', modelId, gruppo: `google:${modelId}`, ...q, tools: true, structured: true, vision: true, forza })
const or = (modelId: string, vision: boolean, forza: ViaGratuita['forza'] = 'debole'): ViaGratuita =>
  ({ provider: 'openrouter', modelId, ...OR_FREE, tools: true, structured: true, vision, forza })

/** Provate il 16/10/2026: chiamata con strumento riuscita su tutte (Flash a volte 503 per sovraccarico). */
export const VIE_GRATUITE: Record<string, ViaGratuita> = Object.fromEntries([
  g('gemini-flash-lite-latest', LITE, 'debole'),
  g('gemini-3.5-flash-lite', LITE, 'debole'),
  g('gemini-flash-latest', FLASH, 'medio'),
  g('gemini-3.8-flash', FLASH, 'medio'),
  or('nvidia/nemotron-3-super-120b-a12b:free', false),
  or('nvidia/nemotron-3.5-super-vl:free', true),
  or('dots-studio/dots-3-note-preview:free', true),
].map(v => [`${v.provider}:${v.modelId}`, v]))

/** Ordine di preferenza: Gemini prima (quote più larghe), OpenRouter free come ripiego. */
const ORDINE = {
  design: ['google:gemini-flash-latest', 'google:gemini-3.8-flash', 'openrouter:nvidia/nemotron-3.5-super-vl:free', 'google:gemini-flash-lite-latest', 'openrouter:nvidia/nemotron-3-super-120b-a12b:free', 'google:gemini-3.5-flash-lite', 'openrouter:dots-studio/dots-3-note-preview:free'],
  general: ['google:gemini-flash-lite-latest', 'google:gemini-3.5-flash-lite', 'openrouter:nvidia/nemotron-3-super-120b-a12b:free', 'google:gemini-flash-latest', 'openrouter:nvidia/nemotron-3.5-super-vl:free', 'google:gemini-3.8-flash', 'openrouter:dots-studio/dots-3-note-preview:free'],
} as const

export function vieGratuite(task: 'design' | 'general'): ViaGratuita[] {
  return ORDINE[task].map(id => VIE_GRATUITE[id])
}

/* ── interruttore ──────────────────────────────────────────────────────── */

const SOLO_KEY = 'ai.solo-gratis'
export function soloGratis(): boolean {
  const env = process.env.CREATIVE_OS_SOLO_GRATIS
  if (env === '0' || env === '1') return env === '1'
  try { return config.get(SOLO_KEY) !== '0' } catch { return true }
}
export function setSoloGratis(on: boolean) { config.set(SOLO_KEY, on ? '1' : '0') }

/* ── cartella su disco: conti del giorno e memoria delle risposte ─────── */

function cartella(): string {
  const base = process.env.CREATIVE_OS_AI_DIR
    || path.join(path.dirname(process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'x.db')), 'ai-vie')
  fs.mkdirSync(path.join(base, 'cache'), { recursive: true })
  return base
}

const oggi = () => new Date().toISOString().slice(0, 10)
interface Conti { giorno: string; conti: Record<string, number> }

function leggiConti(): Conti {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(cartella(), 'quote.json'), 'utf8')) as Conti
    if (c.giorno === oggi()) return c
  } catch { /* primo giro o file rovinato */ }
  return { giorno: oggi(), conti: {} }
}
function scriviConti(c: Conti) { try { fs.writeFileSync(path.join(cartella(), 'quote.json'), JSON.stringify(c)) } catch { /* disco non scrivibile: solo memoria */ } }

/** Chiamate usate oggi per gruppo (UTC, come i fornitori). */
export function contiDelGiorno(): Record<string, number> { return leggiConti().conti }

const finestre = new Map<string, number[]>()
const dormi = (ms: number) => new Promise(r => setTimeout(r, ms))

function erroreQuota(msg: string) { return Object.assign(new Error(msg), { statusCode: 429 }) }

/** Aspetta il turno nel minuto e conta la chiamata del giorno; a quota finita lancia un 429 "per-day". */
export async function attendiTurno(via: ViaGratuita, ora = Date.now) {
  const c = leggiConti()
  if ((c.conti[via.gruppo] ?? 0) >= via.alGiorno) throw erroreQuota(`quota del giorno finita per ${via.gruppo} (limite ${via.alGiorno} per-day)`)
  const f = (finestre.get(via.gruppo) ?? []).filter(t => ora() - t < 60_000)
  if (f.length >= via.alMinuto) await dormi(60_000 - (ora() - f[0]) + 250)
  f.push(ora()); finestre.set(via.gruppo, f.filter(t => ora() - t < 60_000))
  const d = leggiConti(); d.conti[via.gruppo] = (d.conti[via.gruppo] ?? 0) + 1; scriviConti(d)
}

/** Il fornitore dice che la quota del giorno è finita: lo ricordano anche gli altri processi. */
function segnaFinita(via: ViaGratuita) { const c = leggiConti(); c.conti[via.gruppo] = Math.max(c.conti[via.gruppo] ?? 0, via.alGiorno); scriviConti(c) }

type ErrApi = { statusCode?: number; message?: string; responseBody?: string; responseHeaders?: Record<string, string> }
const delGiorno = (e: ErrApi) => /per.?day|daily|free-models-per-day|PerDay/i.test(`${e.message ?? ''} ${e.responseBody ?? ''}`)

/** Esegue con il ritmo della via e fino a 2 nuovi tentativi brevi su 429 (non del giorno) e 503. */
export async function conTentativi<T>(via: ViaGratuita | undefined, run: () => PromiseLike<T>, attese = [3_000, 8_000]): Promise<T> {
  for (let i = 0; ; i++) {
    if (via) await attendiTurno(via)
    try {
      return await run()
    } catch (e) {
      const err = e as ErrApi
      const s = err.statusCode ?? 0
      if (s === 429 && delGiorno(err)) { if (via) segnaFinita(via); throw e }
      const ritenta = s === 429 || s === 503 || s === 502 || /overloaded|high demand/i.test(err.message ?? '')
      if (!ritenta || i >= attese.length) throw e
      const dopo = Number(err.responseHeaders?.['retry-after'])
      await dormi(Number.isFinite(dopo) && dopo > 0 && dopo <= 30 ? dopo * 1000 : attese[i])
    }
  }
}

/* ── memoria delle risposte ───────────────────────────────────────────── */

function cacheAttiva(): boolean {
  if (process.env.CREATIVE_OS_AI_CACHE === '0') return false
  try { return config.get('ai.cache') !== '0' } catch { return true }
}

function impronta(id: string, params: Record<string, unknown>): string {
  const { abortSignal: _a, headers: _h, ...resto } = params
  const json = JSON.stringify({ id, resto }, (_k, v) => v instanceof Uint8Array
    ? `bin:${crypto.createHash('sha256').update(v).digest('hex')}` : v)
  return crypto.createHash('sha256').update(json).digest('hex')
}

type Risultato = Awaited<ReturnType<LanguageModelV3['doGenerate']>>

function leggiCache(k: string): Risultato | undefined {
  try {
    const r = JSON.parse(fs.readFileSync(path.join(cartella(), 'cache', `${k}.json`), 'utf8'))
    if (r.response?.timestamp) r.response.timestamp = new Date(r.response.timestamp)
    return r
  } catch { return undefined }
}
function scriviCache(k: string, r: Risultato) {
  if (r.content.some(p => p.type === 'file')) return
  const { request: _req, ...resto } = r
  try { fs.writeFileSync(path.join(cartella(), 'cache', `${k}.json`), JSON.stringify(resto)) } catch { /* pazienza */ }
}

/** Avvolge un modello: ritmo e tentativi (vie gratuite), memoria su disco per le chiamate non in streaming. */
export function avvolgi(model: LanguageModel, id: string): LanguageModel {
  if (typeof model === 'string') return model
  const via = VIE_GRATUITE[id]
  const mw: LanguageModelV3Middleware = {
    specificationVersion: 'v3',
    wrapGenerate: async ({ doGenerate, params }) => {
      const k = cacheAttiva() ? impronta(id, params as unknown as Record<string, unknown>) : undefined
      const hit = k ? leggiCache(k) : undefined
      if (hit) return hit
      const r = await conTentativi(via, doGenerate)
      if (k) scriviCache(k, r)
      return r
    },
    wrapStream: async ({ doStream }) => conTentativi(via, doStream),
  }
  return wrapLanguageModel({ model: model as LanguageModelV3, middleware: mw })
}
