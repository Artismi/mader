/**
 * Catena dei ruoli: ogni compito dell'IA (analista, copywriter, direttore
 * creativo, regista, critico) ha una lista di modelli in ordine di preferenza.
 * Se un modello ha finito la quota, non esiste o il servizio non risponde, si
 * passa al successivo, e ci si ricorda per un po' che è esaurito.
 *
 * Le risposte sono JSON validati con zod; la maestra (maestra.ts) controlla il
 * contenuto e, se qualcosa non va, rimanda al modello l'errore preciso (al
 * massimo 3 giri). Solo lato server: le chiavi non escono mai dal portale.
 */
import { generateText, type LanguageModel, type ModelMessage } from 'ai'
import type { z } from 'zod'
import { google } from '@/lib/ai/google'
import { getOpenRouterKey, resolveModel } from '@/lib/ai/model-provider'

export type Ruolo = 'analista' | 'copywriter' | 'direttore' | 'regista' | 'critico'

/** Modelli Gemini per ruolo (chiave di Google AI Studio): prima i più generosi, poi i più forti. */
const CATENE: Record<Ruolo, string[]> = {
  analista: ['gemma-4-31b-it', 'gemini-3.5-flash-lite', 'gemma-4-26b-a4b-it', 'gemini-flash-lite-latest'],
  copywriter: ['gemma-4-31b-it', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemma-4-26b-a4b-it'],
  direttore: ['gemini-3.5-flash-lite', 'gemma-4-31b-it', 'gemini-flash-lite-latest', 'gemini-flash-latest'],
  regista: ['gemini-3.5-flash-lite', 'gemma-4-31b-it', 'gemini-flash-lite-latest'],
  // guarda le immagini: servono modelli con la visione
  critico: ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemma-4-31b-it'],
}

export interface Candidato { id: string; label: string; model: LanguageModel; gemma: boolean }

/** Modelli esauriti: fino a quando non riprovarli. */
const esauriti = new Map<string, number>()

function candidati(ruolo: Ruolo, opts: { riservato?: boolean }): Candidato[] {
  const out: Candidato[] = []
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  // lavoro riservato: niente tier gratuiti di Google (i contenuti possono essere usati per migliorare i prodotti)
  if (hasGemini && !opts.riservato) {
    for (const id of CATENE[ruolo]) out.push({ id: `gemini:${id}`, label: id, model: google(id), gemma: id.startsWith('gemma') })
  }
  if (getOpenRouterKey()) {
    const r = resolveModel('openrouter', ruolo === 'critico' || ruolo === 'direttore' ? 'design' : 'general')
    out.push({ id: r.label, label: r.label, model: r.model, gemma: false })
  }
  const now = Date.now()
  return out.filter(c => (esauriti.get(c.id) ?? 0) < now)
}

/** Che tipo di errore è: quota (passa oltre e ricorda), modello assente/non adatto (passa oltre), altro. */
function classify(e: unknown): 'quota' | 'salta' | 'altro' {
  const err = e as { statusCode?: number; message?: string; responseBody?: string }
  const text = `${err.message ?? ''} ${err.responseBody ?? ''}`
  if (err.statusCode === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(text)) return 'quota'
  if (err.statusCode === 404 || err.statusCode === 400 || err.statusCode === 403 || (err.statusCode ?? 0) >= 500 || /not found|not supported|unavailable|overloaded|denied|internal error/i.test(text)) return 'salta'
  return 'altro'
}

/** Estrae il primo oggetto JSON da una risposta (anche se il modello aggiunge testo o ```json). */
export function parseJson(text: string): unknown {
  const t = text.replace(/```(?:json)?/g, '')
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a < 0 || b <= a) throw new Error('nessun oggetto JSON nella risposta')
  return JSON.parse(t.slice(a, b + 1))
}

export interface Giro { modello: string; esito: 'ok' | 'quota' | 'saltato' | 'errore' | 'corretto'; dettaglio?: string }

export interface RuoloOpts<T> {
  ruolo: Ruolo
  /** istruzioni di sistema (per Gemma finiscono nel primo messaggio: lo fa l'SDK) */
  system: string
  prompt: string
  /** immagini (data URL) per il critico */
  images?: string[]
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
  /** la maestra: elenco di errori da correggere (vuoto = va bene) */
  verifica?: (v: T) => string[]
  giri?: number
  riservato?: boolean
  temperature?: number
  /** modelli da usare al posto della catena del ruolo (prove) */
  modelli?: Candidato[]
}

export interface RuoloEsito<T> { valore: T; modello: string; log: Giro[] }

/**
 * Esegue un ruolo: prova i modelli della catena; per ognuno fino a `giri`
 * correzioni della maestra. Se nessun modello produce un risultato valido,
 * restituisce l'ultimo valore valido per lo schema (con i difetti nel log) o lancia.
 */
export async function eseguiRuolo<T>(o: RuoloOpts<T>): Promise<RuoloEsito<T>> {
  const log: Giro[] = []
  const lista = o.modelli ?? candidati(o.ruolo, { riservato: o.riservato })
  if (!lista.length) throw new Error('Nessun modello disponibile: aggiungi GEMINI_API_KEY in .env.local o collega OpenRouter nelle Impostazioni.')
  let migliore: { valore: T; modello: string; difetti: number } | null = null
  for (const c of lista) {
    const userContent: ModelMessage['content'] = o.images?.length
      ? [{ type: 'text', text: o.prompt }, ...o.images.map(img => ({ type: 'image' as const, image: img }))]
      : o.prompt
    const messages: ModelMessage[] = [{ role: 'user', content: userContent } as ModelMessage]
    for (let giro = 0; giro < (o.giri ?? 3); giro++) {
      let text: string
      try {
        ;({ text } = await generateText({ model: c.model, system: o.system, messages, temperature: o.temperature ?? 0.7, maxRetries: 0 }))
      } catch (e) {
        const kind = classify(e)
        // errori del servizio o modello assente: per un po' non lo si riprova (non si spreca una chiamata a ogni richiesta)
        const code = (e as { statusCode?: number }).statusCode ?? 0
        if (kind === 'salta') esauriti.set(c.id, Date.now() + (code === 404 ? 24 * 3600_000 : 10 * 60_000))
        if (kind === 'quota') {
          // quota giornaliera o al minuto: non riprovare per un po'
          const daily = /per.?day|daily/i.test(String((e as Error).message))
          esauriti.set(c.id, Date.now() + (daily ? 3 * 3600_000 : 65_000))
        }
        log.push({ modello: c.label, esito: kind === 'quota' ? 'quota' : kind === 'salta' ? 'saltato' : 'errore', dettaglio: String((e as Error).message).slice(0, 160) })
        break // modello successivo
      }
      // schema
      let valore: T
      try {
        valore = o.schema.parse(parseJson(text))
      } catch (e) {
        const why = e instanceof Error ? e.message.slice(0, 600) : 'risposta non valida'
        log.push({ modello: c.label, esito: 'corretto', dettaglio: `schema: ${why.slice(0, 160)}` })
        messages.push({ role: 'assistant', content: text }, { role: 'user', content: `La risposta non rispetta il formato richiesto:\n${why}\nRispondi di nuovo SOLO con l'oggetto JSON corretto, completo di tutti i campi.` })
        continue
      }
      // maestra
      const errori = o.verifica?.(valore) ?? []
      if (!errori.length) {
        log.push({ modello: c.label, esito: 'ok' })
        return { valore, modello: c.label, log }
      }
      if (!migliore || errori.length < migliore.difetti) migliore = { valore, modello: c.label, difetti: errori.length }
      log.push({ modello: c.label, esito: 'corretto', dettaglio: errori.join(' | ').slice(0, 300) })
      messages.push({ role: 'assistant', content: text }, {
        role: 'user',
        content: `La revisione ha trovato questi problemi, correggili tutti senza cambiare il resto:\n- ${errori.join('\n- ')}\nRispondi di nuovo SOLO con l'oggetto JSON completo.`,
      })
    }
  }
  if (migliore) return { valore: migliore.valore, modello: migliore.modello, log }
  throw Object.assign(new Error(`Nessun modello ha prodotto una risposta valida per il ruolo ${o.ruolo}.`), { log })
}
