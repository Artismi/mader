import { NextResponse } from 'next/server'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { resolveModel } from '@/lib/ai/model-provider'

/**
 * Assistente del pannello Template: dal brief compila i campi dei contenuti.
 * L'impaginazione la fa lo Studio, quindi al modello serve solo capire il
 * testo: va bene anche un modello gratuito.
 *
 * POST { action: 'contenuti', brief, content? } → { content }
 */

const contentSchema = z.object({
  brand: z.string().optional().describe('nome del brand o di chi parla, se c\'è'),
  kicker: z.string().optional().describe('occhiello, 2-4 parole: "Nuovo blend", "Sabato 14 novembre"'),
  title: z.string().describe('titolo breve e concreto, massimo 6 parole'),
  body: z.string().optional().describe('una o due frasi, massimo 22 parole'),
  details: z.array(z.string()).optional().describe('da 0 a 3 dettagli brevi (1-3 parole ciascuno): formato, origine, data, luogo, prezzo'),
  cta: z.string().optional().describe('invito all\'azione, massimo 3 parole'),
  imageQuery: z.string().optional().describe('cosa deve mostrare la foto, 3-6 parole concrete (soggetto, materiale, luce); vuoto se una foto non serve'),
})

const SYSTEM = `Compili i contenuti di una grafica per uno studio grafico italiano.
Usa solo informazioni vere del brief: non inventare prezzi, date o dati. Italiano naturale, niente punti esclamativi, niente emoji, niente frasi fatte da marketing.`

/** Ripiego per i modelli che non reggono l'output strutturato: JSON nel testo. */
async function viaText(model: Parameters<typeof generateText>[0]['model'], prompt: string) {
  const { text } = await generateText({
    model, system: SYSTEM,
    prompt: `${prompt}\n\nRispondi SOLO con un oggetto JSON con le chiavi: brand, kicker, title, body, details (array di stringhe), cta, imageQuery.`,
  })
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  return contentSchema.parse(JSON.parse(json))
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const { model, label } = resolveModel(typeof body.modelId === 'string' ? body.modelId : undefined, 'general')
  if (body.action !== 'contenuti') return NextResponse.json({ error: 'azione sconosciuta' }, { status: 400 })
  const prompt = `Brief: ${String(body.brief ?? '')}\nCampi già scritti dall'utente (tienili se ci sono): ${JSON.stringify(body.content ?? {})}`
  try {
    let content: z.infer<typeof contentSchema>
    try {
      content = (await generateObject({ model, system: SYSTEM, schema: contentSchema, prompt })).object
    } catch {
      content = await viaText(model, prompt)
    }
    return NextResponse.json({ content, model: label })
  } catch (e) {
    return NextResponse.json({ error: `Il modello non ha risposto in modo utilizzabile (${label}): ${(e as Error).message.slice(0, 200)}` }, { status: 502 })
  }
}
