/**
 * L'occhio nello Studio: le proposte composte, in una griglia numerata, guardate
 * da un modello con visione del registro (gratis se c'è la chiave di Gemini).
 * Una sola chiamata per composizione; risponde con la classifica e le tavole da
 * non consegnare. Senza chiave o senza risposta valida resta l'ordine del critico.
 * Solo lato server: qui passano le chiavi.
 */
import { generateText } from 'ai'
import { candidatesFor, keyState, noteFailure } from '@/lib/ai/model-registry'
import { CRITERIO, leggiClassifica } from '@/components/studio/designer/gen/occhio'

export interface ClassificaOcchio { ordine: number[]; scarta: number[]; fonte: 'modello' | 'codice'; modello?: string; motivo?: string }

/** Classifica di `n` tavole in una griglia JPEG (data URL o base64). */
export async function chiediOcchio(griglia: string, n: number, o: { keys?: ReturnType<typeof keyState> } = {}): Promise<ClassificaOcchio> {
  const ordineCodice = Array.from({ length: n }, (_, i) => i + 1)
  const keys = o.keys ?? keyState()
  if (!keys.openrouter && !keys.anthropic && !keys.google) return { ordine: ordineCodice, scarta: [], fonte: 'codice', motivo: 'nessuna chiave' }
  const image = griglia.replace(/^data:image\/\w+;base64,/, '')
  const prompt = `${CRITERIO}\nTavole: ${n}.`
  let motivo = 'nessun modello con visione'
  // fino a 3 modelli: quota finita, risposta vuota o illeggibile passano al successivo
  for (const m of candidatesFor({ task: 'design', vision: true, preferisci: 'medio' }).slice(0, 3)) {
    try {
      const r = await generateText({
        model: m.model, temperature: 0, maxOutputTokens: 1500, maxRetries: 0,
        providerOptions: { openrouter: { reasoning: { effort: 'low' } } },
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image', image, mediaType: 'image/jpeg' }] }],
      })
      const cl = leggiClassifica(r.text, n)
      if (cl) return { ...cl, fonte: 'modello', modello: m.label }
      motivo = `${m.label}: risposta non leggibile (${r.text.slice(0, 80) || 'vuota'})`
    } catch (e) {
      motivo = `${m.label}: ${noteFailure(m, e)}: ${(e as Error).message.slice(0, 120)}`
    }
  }
  return { ordine: ordineCodice, scarta: [], fonte: 'codice', motivo }
}
