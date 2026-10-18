import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { config, tokens } from '@/lib/db'

// ── Cassaforte delle chiavi dell'utente (fase 1, docs/lancio-sul-mercato.md §2) ──
// Nel pacchetto Electron custodisce una chiave maestra cifrata con safeStorage
// (portachiavi del sistema) e la passa al server come CREATIVE_OS_CHIAVE_MAESTRA.
// Le chiavi dei modelli si salvano in system_config cifrate (AES-256-GCM), mai in
// chiaro, e si applicano a process.env: il resto del codice le legge da lì.
// Senza chiave maestra (sviluppo) valgono solo quelle di .env.local.

export type IdChiave = 'anthropic' | 'gemini' | 'openrouter' | 'pexels' | 'unsplash'

export interface DefChiave {
  id: IdChiave
  nome: string
  uso: string
  /** variabili d'ambiente lette dal codice; la prima è quella principale */
  env: string[]
  dove: string
}

export const CHIAVI: DefChiave[] = [
  { id: 'gemini', nome: 'Google Gemini', uso: 'Livello gratuito: chat, idee, ricerca nel vault', env: ['GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'], dove: 'https://aistudio.google.com/apikey' },
  { id: 'openrouter', nome: 'OpenRouter', uso: 'Modelli :free e a consumo di molti fornitori', env: ['OPENROUTER_API_KEY'], dove: 'https://openrouter.ai/settings/keys' },
  { id: 'anthropic', nome: 'Anthropic Claude', uso: 'Modelli Claude a consumo', env: ['ANTHROPIC_API_KEY'], dove: 'https://console.anthropic.com/settings/keys' },
  { id: 'pexels', nome: 'Pexels', uso: 'Ricerca di foto libere', env: ['PEXELS_API_KEY'], dove: 'https://www.pexels.com/api/' },
  { id: 'unsplash', nome: 'Unsplash', uso: 'Ricerca di foto libere', env: ['UNSPLASH_ACCESS_KEY'], dove: 'https://unsplash.com/developers' },
]

const PREFISSO = 'chiavi.'
const OPENROUTER_TOKEN = 'openrouter'

// Valori di .env.local all'avvio: tornano validi quando si toglie una chiave salvata.
// Su globalThis perché instrumentation e route sono bundle diversi con copie diverse
// di questo modulo: la seconda fotograferebbe un process.env già con le chiavi salvate.
const stato = ((globalThis as { __cosChiavi?: { ambiente: Record<string, string | undefined> | null; applicate: boolean } })
  .__cosChiavi ??= { ambiente: null, applicate: false })

function maestra(): Buffer | null {
  const hex = process.env.CREATIVE_OS_CHIAVE_MAESTRA
  if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) return null
  return Buffer.from(hex, 'hex')
}

export function cassaforteAttiva(): boolean {
  return maestra() !== null
}

function cifra(testo: string, k: Buffer): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', k, iv)
  const dati = Buffer.concat([c.update(testo, 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), dati]).toString('base64')
}

function decifra(b64: string, k: Buffer): string | null {
  try {
    const raw = Buffer.from(b64, 'base64')
    const d = createDecipheriv('aes-256-gcm', k, raw.subarray(0, 12))
    d.setAuthTag(raw.subarray(12, 28))
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8')
  } catch {
    return null // chiave maestra diversa (portachiavi cambiato) o dato rovinato
  }
}

function def(id: string): DefChiave | undefined {
  return CHIAVI.find(c => c.id === id)
}

function fotografaAmbiente() {
  if (stato.ambiente) return
  const ambiente: Record<string, string | undefined> = (stato.ambiente = {})
  for (const c of CHIAVI) for (const v of c.env) ambiente[v] = process.env[v]
}

function letta(id: IdChiave, k: Buffer): string | null {
  const b64 = config.get(PREFISSO + id)
  return b64 ? decifra(b64, k) : null
}

function imposta(d: DefChiave, valore: string | undefined) {
  for (const v of d.env) {
    const val = valore ?? stato.ambiente?.[v]
    if (val) process.env[v] = val
    else delete process.env[v]
  }
}

/** All'avvio del server (e prima di ogni lettura): applica le chiavi salvate. */
export function applicaChiavi(): void {
  if (stato.applicate) return
  stato.applicate = true
  fotografaAmbiente()
  const k = maestra()
  if (!k) return
  // la chiave di OpenRouter presa con l'OAuth stava in chiaro in user_tokens: si sposta qui
  const vecchia = tokens.get(OPENROUTER_TOKEN)?.provider_token
  if (vecchia && !config.get(PREFISSO + 'openrouter')) {
    config.set(PREFISSO + 'openrouter', cifra(vecchia, k))
    tokens.remove(OPENROUTER_TOKEN)
  }
  for (const d of CHIAVI) {
    const v = letta(d.id, k)
    if (v) imposta(d, v)
  }
}

export interface StatoChiave {
  id: IdChiave
  nome: string
  uso: string
  dove: string
  /** salvata nella cassaforte, presa da .env.local, oppure assente */
  origine: 'cassaforte' | 'ambiente' | null
}

export function statoChiavi(): { attiva: boolean; chiavi: StatoChiave[] } {
  applicaChiavi()
  const k = maestra()
  return {
    attiva: !!k,
    chiavi: CHIAVI.map(d => ({
      id: d.id, nome: d.nome, uso: d.uso, dove: d.dove,
      origine: k && letta(d.id, k) ? 'cassaforte' : d.env.some(v => stato.ambiente?.[v]) ? 'ambiente' : null,
    })),
  }
}

/** Salva (cifrata) o, con valore vuoto, toglie una chiave. Effetto immediato. */
export function salvaChiave(id: string, valore: string): void {
  applicaChiavi()
  const d = def(id)
  if (!d) throw new Error('Chiave sconosciuta')
  const k = maestra()
  if (!k) throw new Error('La cassaforte delle chiavi c\'è solo nell\'app installata: in sviluppo usa .env.local')
  const v = valore.trim()
  if (v && (v.length > 500 || /\s/.test(v))) throw new Error('Il valore non sembra una chiave')
  config.set(PREFISSO + d.id, v ? cifra(v, k) : '')
  if (d.id === 'openrouter' && !v) tokens.remove(OPENROUTER_TOKEN)
  imposta(d, v || undefined)
}

/** Chiave di OpenRouter presa con l'OAuth: nella cassaforte se c'è, altrimenti come prima. */
export function salvaChiaveOpenRouterOAuth(key: string): void {
  if (cassaforteAttiva()) salvaChiave('openrouter', key)
  else tokens.upsert({ provider: OPENROUTER_TOKEN, provider_token: key })
}
