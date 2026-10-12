import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { resolveModel } from '@/lib/ai/model-provider'
import { RECIPES, FINISH_IDS } from '@/lib/design/compose-recipes'
import { VISUAL_TREATMENTS } from '@/lib/design/design-ops-spec'

/**
 * Assistente dei template: propone, non decide. Ogni azione restituisce
 * suggerimenti; è l'utente ad applicarli nello Studio.
 *
 * POST { action: 'testi', brief, content? }            → { options: Content[] }
 * POST { action: 'consiglia', brief, content, proposals } → { ranking: { id, motivo }[] }
 * POST { action: 'aggiusta', instruction, board }      → { patch, spiegazione }
 */

const contentSchema = z.object({
  title: z.string().describe('titolo breve e forte, max 6 parole'),
  subtitle: z.string().optional().describe('max 18 parole'),
  eyebrow: z.string().optional().describe('occhiello, 2-4 parole, es. "Nuovo blend · 250g"'),
  cta: z.string().optional().describe('invito all\'azione, max 3 parole'),
  brand: z.string().optional(),
  body: z.string().optional().describe('solo se serve, max 30 parole'),
  quote: z.string().optional(), author: z.string().optional(),
  stats: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  items: z.array(z.string()).optional(),
})

const SYSTEM = `Sei l'assistente di un art director in uno studio grafico italiano. Non decidi da solo: proponi opzioni chiare e brevi che l'utente sceglie.
Testi: italiano naturale, niente punti esclamativi, niente emoji, niente frasi fatte da marketing. Titoli corti e concreti.`

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const { model, label } = resolveModel(typeof body.modelId === 'string' ? body.modelId : undefined, 'design')
  try {
    if (body.action === 'testi') {
      const { object } = await generateObject({
        model, system: SYSTEM,
        schema: z.object({ options: z.array(contentSchema).min(2).max(4) }),
        prompt: `Brief: ${String(body.brief ?? '')}\nTesti attuali (se ci sono): ${JSON.stringify(body.content ?? {})}\nProponi 3 versioni diverse dei testi per una grafica (una più sobria, una più audace, una più poetica). Mantieni brand e dati veri del brief.`,
      })
      return NextResponse.json({ ...object, model: label })
    }
    if (body.action === 'consiglia') {
      const proposals = (body.proposals as { id: string; label: string }[] | undefined) ?? []
      const { object } = await generateObject({
        model, system: SYSTEM,
        schema: z.object({ ranking: z.array(z.object({ id: z.string(), motivo: z.string().describe('una frase: perché funziona per questo brief') })).max(3) }),
        prompt: `Brief: ${String(body.brief ?? '')}\nTesti: ${JSON.stringify(body.content ?? {})}\nProposte (id: impaginazione · stile · visual):\n${proposals.map(p => `${p.id}: ${p.label}`).join('\n')}\nIndica le 3 più adatte, dalla migliore, con il motivo.`,
      })
      const ids = new Set(proposals.map(p => p.id))
      return NextResponse.json({ ranking: object.ranking.filter(r => ids.has(r.id)), model: label })
    }
    if (body.action === 'aggiusta') {
      const { object } = await generateObject({
        model, system: SYSTEM,
        schema: z.object({
          patch: z.object({
            content: contentSchema.partial().optional(),
            recipe: z.string().optional().describe(`solo se serve cambiare impaginazione o stile: ${RECIPES.map(r => r.id).join(', ')}`),
            palette: z.number().int().min(0).max(4).optional(),
            colors: z.object({ bg: z.string(), ink: z.string(), accent: z.string() }).partial().optional().describe('hex, solo se chiesto'),
            visual: z.object({ source: z.string().optional(), treatment: z.string().optional().describe(VISUAL_TREATMENTS.join(', ')), arrangement: z.string().optional() }).optional(),
            finish: z.array(z.string()).optional().describe(FINISH_IDS.join(', ')),
          }),
          spiegazione: z.string().describe('una frase su cosa cambia'),
        }),
        prompt: `Template attuale: ${JSON.stringify(body.board ?? {})}\nRichiesta dell'utente: ${String(body.instruction ?? '')}\nProponi la modifica minima che soddisfa la richiesta. Cambia solo i campi necessari.`,
      })
      return NextResponse.json({ ...object, model: label })
    }
    return NextResponse.json({ error: 'azione sconosciuta' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: `Il modello non ha risposto in modo utilizzabile (${label}): ${(e as Error).message.slice(0, 200)}` }, { status: 502 })
  }
}
