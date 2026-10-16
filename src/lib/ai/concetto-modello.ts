/**
 * C1 con un modello vero: le idee del brief chieste al registro dei modelli
 * (profilo medio, testo breve), lette e controllate da `leggiIdee`. Se manca la
 * chiave, il credito è finito o la risposta non regge, le idee vengono dalle
 * regole: il motore non resta mai senza concetto. Solo lato server.
 */
import { generateText } from 'ai'
import { candidatesFor, keyState, noteFailure } from '@/lib/ai/model-registry'
import { leggiIdee, ideeDaRegole, promptIdee, type Idea } from '@/components/studio/designer/gen/concetto'
import type { DesignContent } from '@/components/studio/designer/types'

export interface IdeeDalModello { idee: Idea[]; fonte: 'modello' | 'regole'; modello?: string; motivo?: string; token?: number; dalModello?: number }

export async function chiediIdee(c: DesignContent, o: { keys?: ReturnType<typeof keyState> } = {}): Promise<IdeeDalModello> {
  const keys = o.keys ?? keyState()
  if (!keys.openrouter && !keys.anthropic && !keys.google) return { idee: ideeDaRegole(c), fonte: 'regole', motivo: 'nessuna chiave (OpenRouter, Anthropic o Gemini)' }
  // leggiIdee completa con le regole: contano solo le idee che vengono davvero dal modello
  const regole = new Set(ideeDaRegole(c).map(i => i.nome))
  let motivo = 'nessun modello adatto', token = 0
  // fino a 4 modelli: una risposta vuota o illeggibile (succede ai gratuiti che ragionano a lungo) passa al successivo
  for (const m of candidatesFor({ task: 'design', preferisci: 'medio' }).slice(0, 4)) {
    try {
      // margine largo e ragionamento corto: i modelli che ragionano spendono token prima della risposta
      const r = await generateText({ model: m.model, prompt: promptIdee(c), temperature: 0.9, maxOutputTokens: 3000, maxRetries: 0, providerOptions: { openrouter: { reasoning: { effort: 'low' } } } })
      token += r.usage?.totalTokens ?? 0
      const idee = leggiIdee(r.text, c)
      const dalModello = idee.filter(i => !regole.has(i.nome)).length
      if (dalModello) return { idee, fonte: 'modello', modello: m.label, token, dalModello }
      motivo = `${m.label}: risposta non leggibile (${r.text.slice(0, 80) || 'vuota'})`
    } catch (e) {
      motivo = `${m.label}: ${noteFailure(m, e)}: ${(e as Error).message.slice(0, 120)}`
    }
  }
  return { idee: ideeDaRegole(c), fonte: 'regole', motivo, token: token || undefined }
}
