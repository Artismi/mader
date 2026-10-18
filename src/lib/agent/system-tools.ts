/**
 * Strumenti di sistema nuovi (docs/guscio-agente.md §4): danno all'assistente
 * occhi e mani sulle parti che prima non vedeva — piano editoriale, idee,
 * scheda cliente, memoria, regia dello Studio — più il piano di lavoro per i
 * compiti lunghi. Regole: cercare con filtri invece di elencare tutto,
 * restituire nomi leggibili con ID corti, errori che dicono come correggere.
 */
import { z } from 'zod'
import { searchMemories, searchVault } from '@/lib/vault'
import type { AgentToolDef } from './tools'
import { actionTool, clientContext, clientGet, graphRelated, graphSearch, ideaList, postList, postUpdate } from '@/lib/kernel'

/* ── dal nucleo (K1) ───────────────────────────────────────────────────── */

// Piano editoriale, idee e scheda cliente sono azioni del nucleo (src/lib/kernel):
// qui le si espone come strumenti con i nomi di sempre. findClient resta esportato.
export { findClient } from '@/lib/kernel'
export const readEditorialPlan = actionTool(postList)
export const updateEditorialPost = actionTool(postUpdate)
export const listIdeas = actionTool(ideaList)
export const getClient = actionTool(clientGet)
// K3: il contesto si va a prendere (grafo), non si incolla tutto nel prompt
export const searchGraphTool = actionTool(graphSearch)
export const relatedTool = actionTool(graphRelated)
export const clientContextTool = actionTool(clientContext)

/* ── piano di lavoro ───────────────────────────────────────────────────── */

export const planSchema = z.object({
  passi: z.array(z.object({
    testo: z.string().describe('passo breve, all\'imperativo'),
    stato: z.enum(['da_fare', 'in_corso', 'fatto']),
    // A3: il contratto del compito; a fine lavoro il codice confronta le voci con il registro delle prove
    prova: z.object({
      strumento: z.string().describe('strumento di scrittura che dimostra il passo'),
      almeno: z.number().int().min(1).optional().describe('quante volte deve riuscire (default 1)'),
    }).optional().describe('facoltativo: come si dimostra il passo, es. {"strumento":"updateEditorialPost","almeno":3}'),
  })).min(1).max(15),
})

export const updatePlan: AgentToolDef<typeof planSchema> = {
  name: 'updatePlan', group: 'piano', risk: 'read', maxChars: 3000,
  description: 'Scrive o aggiorna il piano di lavoro per un compito in più fasi (più di tre azioni). Manda ogni volta la lista intera; un solo passo "in_corso" alla volta. L\'utente vede la lista in chat. Non serve per domande semplici. Il piano è un contratto: chiudi solo quando ogni passo è "fatto" e le scritture risultano riuscite.',
  inputSchema: planSchema,
  verify: ({ passi }) => {
    const inCorso = passi.filter(p => p.stato === 'in_corso').length
    return inCorso > 1 ? [`ci sono ${inCorso} passi "in_corso": tienine uno solo.`] : []
  },
  execute: ({ passi }) => {
    const fatti = passi.filter(p => p.stato === 'fatto').length
    const prossimo = passi.find(p => p.stato === 'in_corso') ?? passi.find(p => p.stato === 'da_fare')
    return { success: true, avanzamento: `${fatti}/${passi.length}`, prossimo: prossimo?.testo ?? 'piano completato' }
  },
}

/* ── memoria ───────────────────────────────────────────────────────────── */

const searchMemorySchema = z.object({ query: z.string().min(3).describe('cosa cerchi, in parole naturali') })

export const searchMemory: AgentToolDef<typeof searchMemorySchema> = {
  name: 'searchMemory', group: 'memoria', risk: 'read', maxChars: 7000,
  description: 'Cerca nella memoria a lungo termine: fatti e preferenze ricordati (remember) e documenti del vault. Usalo quando servono informazioni su decisioni, preferenze o materiali passati che non sono nel promemoria.',
  inputSchema: searchMemorySchema,
  execute: async ({ query }) => {
    const [mem, docs] = await Promise.all([searchMemories(query, 6), searchVault(query, 4)])
    return {
      success: true,
      ricordi: mem.map(m => `- ${m.content}`).join('\n') || 'nessun ricordo pertinente',
      vault: docs.join('\n\n---\n') || 'nessun documento pertinente (o ricerca semantica non configurata)',
    }
  },
}

/* ── regia dello Studio ────────────────────────────────────────────────── */

const directDesignSchema = z.object({
  brief: z.string().min(10).describe('il brief completo: cosa, per chi, fatti, numeri, date, tono'),
  slide: z.union([z.number().int().min(1).max(10), z.literal('auto')]).optional().default(1).describe('1 = grafica singola; N o "auto" = carosello'),
  haFoto: z.boolean().optional(),
  formato: z.enum(['quadrato', 'verticale', 'storia', 'orizzontale']).optional().describe('formato della tavola: quadrato (post), verticale (4:5), storia (9:16), orizzontale (slide)'),
  cliente: z.string().optional().describe('nome o ID del cliente: la regia legge brand, piano editoriale e memoria dal sistema'),
})

export const directDesign: AgentToolDef<typeof directDesignSchema> = {
  name: 'directDesign', group: 'studio', risk: 'read', maxChars: 12000,
  description: 'La regia dello Studio: dal brief produce testi verificati (budget di caratteri, niente frasi fatte né numeri inventati) e tre direzioni visive scelte dal menu del motore (sistema, stile, trattamento, regolatori). Per i caroselli anche la scaletta delle slide. Usa poi i testi e una direzione in composeDesign. Richiede da qualche secondo a un minuto.',
  inputSchema: directDesignSchema,
  execute: async ({ brief, slide, haFoto, formato, cliente }) => {
    const { regia } = await import('@/lib/ai/designer-roles')
    const r = await regia(formato ? `${brief}
Formato: ${formato}.` : brief, { slides: slide, haFoto, cliente })
    return {
      success: true,
      analisi: r.analisi,
      ...(r.testi ? { testi: r.testi } : {}),
      ...(r.scaletta ? { scaletta: r.scaletta, slide: r.slides } : {}),
      direzioni: r.direzioni,
      modelli: r.modelli,
      ...(formato ? { formato } : {}),
      prossimo: 'Ora chiama composeDesign con questi testi e una delle direzioni (stesso formato): non comporre a mano.',
    }
  },
}

export const SYSTEM_TOOLS = [updatePlan, readEditorialPlan, updateEditorialPost, listIdeas, getClient, searchGraphTool, relatedTool, clientContextTool, searchMemory, directDesign] as unknown as AgentToolDef<z.ZodTypeAny>[]
