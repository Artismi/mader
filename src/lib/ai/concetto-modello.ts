/**
 * C1 con un modello vero: le idee del brief chieste al registro dei modelli
 * (profilo medio, testo breve), lette e controllate da `leggiIdee`. Se manca la
 * chiave, il credito è finito o la risposta non regge, le idee vengono dalle
 * regole: il motore non resta mai senza concetto. Solo lato server.
 */
import { generateTextWith, keyState, classifyError } from '@/lib/ai/model-registry'
import { leggiIdee, ideeDaRegole, promptIdee, type Idea } from '@/components/studio/designer/gen/concetto'
import type { DesignContent } from '@/components/studio/designer/types'

export interface IdeeDalModello { idee: Idea[]; fonte: 'modello' | 'regole'; modello?: string; motivo?: string; token?: number }

export async function chiediIdee(c: DesignContent, o: { keys?: ReturnType<typeof keyState> } = {}): Promise<IdeeDalModello> {
  const keys = o.keys ?? keyState()
  if (!keys.openrouter && !keys.anthropic && !keys.google) return { idee: ideeDaRegole(c), fonte: 'regole', motivo: 'nessuna chiave (OpenRouter, Anthropic o Gemini)' }
  try {
    const { text, label, result } = await generateTextWith({ task: 'design', preferisci: 'medio' }, { prompt: promptIdee(c), temperature: 0.9, maxOutputTokens: 900 })
    const idee = leggiIdee(text, c)
    const u = (result as { usage?: { totalTokens?: number } }).usage
    return { idee, fonte: 'modello', modello: label, token: u?.totalTokens }
  } catch (e) {
    return { idee: ideeDaRegole(c), fonte: 'regole', motivo: `${classifyError(e)}: ${(e as Error).message.slice(0, 160)}` }
  }
}
