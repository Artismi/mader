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
import { generateText, Output, type LanguageModel, type ModelMessage } from 'ai'
import type { z } from 'zod'
import { candidatesFor, noteFailure, type Need } from '@/lib/ai/model-registry'

export type Ruolo = 'analista' | 'copywriter' | 'direttore' | 'regista' | 'critico'

/**
 * Preferenze per ruolo, non più ID scritti nel codice: il registro dei modelli
 * (model-registry.ts) dà i candidati secondo le chiavi presenti e la scelta
 * dell'utente. I compiti piccoli e chiusi partono dai modelli leggeri e
 * generosi; il critico guarda le immagini e vuole la visione.
 */
const BISOGNI: Record<Ruolo, Need> = {
  analista: { task: 'general', preferisci: 'leggero' },
  copywriter: { task: 'general', preferisci: 'leggero' },
  regista: { task: 'general', preferisci: 'leggero' },
  direttore: { task: 'design', preferisci: 'leggero' },
  critico: { task: 'design', vision: true },
}

export interface Candidato { id: string; label: string; model: LanguageModel; gemma: boolean; structured?: boolean }

function candidati(ruolo: Ruolo, opts: { riservato?: boolean; choice?: string }): Candidato[] {
  return candidatesFor(BISOGNI[ruolo], { riservato: opts.riservato, choice: opts.choice })
    .map(c => ({ id: c.id, label: c.label, model: c.model, gemma: /gemma/i.test(c.modelId), structured: c.profile.structured }))
}

/** Solo per capire se l'errore dell'output strutturato è di quota (non segna nulla). */
function noteFailureSoft(e: unknown) {
  const msg = `${(e as Error)?.message ?? ''} ${(e as { responseBody?: string })?.responseBody ?? ''}`
  return (e as { statusCode?: number })?.statusCode === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(msg) ? 'quota' : 'altro'
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
  /** fornitore scelto dall'utente ('claude' | 'gemini' | 'openrouter') */
  choice?: string
}

export interface RuoloEsito<T> { valore: T; modello: string; log: Giro[] }

/**
 * Esegue un ruolo: prova i modelli della catena; per ognuno fino a `giri`
 * correzioni della maestra. Se nessun modello produce un risultato valido,
 * restituisce l'ultimo valore valido per lo schema (con i difetti nel log) o lancia.
 */
export async function eseguiRuolo<T>(o: RuoloOpts<T>): Promise<RuoloEsito<T>> {
  const log: Giro[] = []
  const lista = o.modelli ?? candidati(o.ruolo, { riservato: o.riservato, choice: o.choice })
  if (!lista.length) throw new Error('Nessun modello disponibile: aggiungi ANTHROPIC_API_KEY o GEMINI_API_KEY in .env.local, oppure collega OpenRouter nelle Impostazioni.')
  let migliore: { valore: T; modello: string; difetti: number } | null = null
  for (const c of lista) {
    const userContent: ModelMessage['content'] = o.images?.length
      ? [{ type: 'text', text: o.prompt }, ...o.images.map(img => ({ type: 'image' as const, image: img }))]
      : o.prompt
    const messages: ModelMessage[] = [{ role: 'user', content: userContent } as ModelMessage]
    // output strutturato dove il fornitore lo regge; se lo schema non gli va bene, si torna al JSON nel testo
    let strutturato = !!c.structured
    let erroriPrima = ''
    // due giri per modello, poi si sale nella cascata
    for (let giro = 0; giro < (o.giri ?? 2); giro++) {
      let text: string
      try {
        if (strutturato) {
          try {
            const r = await generateText({ model: c.model, system: o.system, messages, temperature: o.temperature ?? 0.7, maxRetries: 0, output: Output.object({ schema: o.schema as z.ZodType<T> }) })
            text = JSON.stringify(r.output)
          } catch (e) {
            if (noteFailureSoft(e) === 'quota') throw e
            strutturato = false
            ;({ text } = await generateText({ model: c.model, system: o.system, messages, temperature: o.temperature ?? 0.7, maxRetries: 0 }))
          }
        } else {
          ;({ text } = await generateText({ model: c.model, system: o.system, messages, temperature: o.temperature ?? 0.7, maxRetries: 0 }))
        }
      } catch (e) {
        // quota o modello assente: il registro lo mette da parte per un po' (vale per tutto il portale)
        const kind = noteFailure(c, e)
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
      // stessi errori di prima: il modello non sa correggerli, si passa al successivo
      const firma = errori.join('|')
      if (firma === erroriPrima) break
      erroriPrima = firma
      messages.push({ role: 'assistant', content: text }, {
        role: 'user',
        content: `La revisione ha trovato questi problemi, correggili tutti senza cambiare il resto:\n- ${errori.join('\n- ')}\nRispondi di nuovo SOLO con l'oggetto JSON completo.`,
      })
    }
  }
  if (migliore) return { valore: migliore.valore, modello: migliore.modello, log }
  throw Object.assign(new Error(`Nessun modello ha prodotto una risposta valida per il ruolo ${o.ruolo}.`), { log })
}
