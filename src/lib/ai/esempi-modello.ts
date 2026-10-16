/**
 * G2 con un modello vero: i programmi del brief chiesti al registro dei modelli
 * (profilo medio, testo), con gli esempi più vicini dell'archivio G1 nel prompt,
 * letti e controllati da `leggiProgrammi`. Senza chiave, senza credito o con una
 * risposta che non regge, i programmi si costruiscono dagli esempi (simulati).
 * Solo lato server. Le vie gratuite del registro si agganciano da sole.
 */
import { generateTextWith, keyState, classifyError } from '@/lib/ai/model-registry'
import { chiediProgrammi } from '@/components/studio/designer/gen/esempi'
import { vicini } from '@/components/studio/designer/archivio/cerca'
import type { Archivio, Programma } from '@/components/studio/designer/archivio/tipi'
import type { DesignContent, Format } from '@/components/studio/designer/types'
import archivio from '@/components/studio/designer/archivio/archivio.json'

export interface ProgrammiDalModello { programmi: Programma[]; esempi: string[]; fonte: 'modello' | 'simulato'; modello?: string; motivo?: string; token?: number }

export async function chiediProgrammiModello(c: DesignContent, format: Format, o: { hasPhoto?: boolean; seme?: number; quanti?: number; keys?: ReturnType<typeof keyState> } = {}): Promise<ProgrammiDalModello> {
  const es = vicini(c, format, archivio as unknown as Archivio, { k: 8, hasPhoto: o.hasPhoto, seme: o.seme })
  const keys = o.keys ?? keyState()
  let modello: string | undefined, token: number | undefined, motivo: string | undefined
  const chiedi = async (prompt: string) => {
    if (!keys.openrouter && !keys.anthropic && !keys.google) throw new Error('nessuna chiave (OpenRouter, Anthropic o Gemini)')
    try {
      const { text, label, result } = await generateTextWith({ task: 'design', preferisci: 'medio' }, { prompt, temperature: 0.8, maxOutputTokens: 2400 })
      modello = label
      token = (result as { usage?: { totalTokens?: number } }).usage?.totalTokens
      return text
    } catch (e) { motivo = `${classifyError(e)}: ${(e as Error).message.slice(0, 160)}`; throw e }
  }
  const r = await chiediProgrammi(c, format, es, { chiedi, quanti: o.quanti ?? 3, seme: o.seme, hasPhoto: o.hasPhoto }).catch(e => { motivo ??= (e as Error).message; return null })
  const fonte = r?.fonte ?? 'simulato'
  return { programmi: r?.programmi ?? [], esempi: es.map(e => e.id), fonte, modello, token, ...(fonte === 'simulato' ? { motivo: motivo ?? 'risposta non valida: programmi simulati' } : {}) }
}
