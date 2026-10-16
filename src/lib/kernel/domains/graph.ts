/**
 * Dominio graph (K3): l'agente va a prendere il contesto che serve invece di
 * riceverlo tutto nel prompt. Solo letture.
 */
import { z } from 'zod'
import { defineAction } from '../actions'
import { completeness, related, searchGraph, type NodeKind } from '../graph'
import { findClient } from './client'

const KINDS = ['client', 'task', 'idea', 'post', 'design', 'quote', 'mail'] as const

export const graphSearch = defineAction({
  id: 'graph.search', title: 'Cerca nel lavoro', domain: 'graph', group: 'memoria', risk: 'read', toolName: 'graphSearch', maxChars: 4000,
  description: 'Cerca in tutto il lavoro (clienti, incarichi, idee, post, grafiche, preventivi, mail) per parole e significato. Restituisce i nodi con il loro riferimento (es. post:abc) da passare a graphRelated o agli altri strumenti. Usalo quando ti manca contesto, invece di chiedere all\'utente cose che il sistema sa già.',
  input: z.object({
    query: z.string().min(2).describe('cosa cerchi, in parole libere'),
    tipi: z.array(z.enum(KINDS)).optional().describe('limita a questi tipi di nodo'),
    cliente: z.string().optional().describe('nome o ID del cliente, per cercare solo nel suo lavoro'),
  }),
  run: async ({ query, tipi, cliente }) => {
    let clientId: string | undefined
    if (cliente) {
      const c = findClient(cliente)
      if ('error' in c) return { success: false, message: c.error }
      clientId = c.id
    }
    const hits = await searchGraph(query, { kinds: tipi as NodeKind[] | undefined, clientId, limit: 10 })
    if (!hits.length) return { success: true, nodi: [], message: `Niente su "${query}". Prova altre parole o togli i filtri.` }
    return { success: true, nodi: hits.map(h => ({ ref: h.ref, tipo: h.kind, titolo: h.title, estratto: h.text, perché: h.perché })) }
  },
})

export const graphRelated = defineAction({
  id: 'graph.related', title: 'Vicini di un nodo', domain: 'graph', group: 'memoria', risk: 'read', toolName: 'graphRelated', maxChars: 4000,
  description: 'I nodi collegati a un riferimento (es. client:abc, post:xyz): il cliente, il lavoro dello stesso cliente, da cosa è nato e cosa ha generato. Per un cliente restituisce anche cosa manca nel suo contesto.',
  input: z.object({
    ref: z.string().regex(/^[a-z]+:.+/, 'usa un riferimento come client:abc o post:xyz'),
    profondità: z.number().int().min(1).max(2).optional().describe('1 = vicini diretti, 2 = anche i vicini dei vicini'),
  }),
  run: ({ ref, profondità }) => {
    const vicini = related(ref, { depth: profondità ?? 1, limit: 30 })
    const [kind, id] = ref.split(':')
    const contesto = kind === 'client' ? completeness(id) : undefined
    if (!vicini.length && !contesto) return { success: false, message: `Nessun nodo ${ref} (o nessun vicino). Cercalo con graphSearch.` }
    return { success: true, vicini: vicini.map(v => ({ ref: v.ref, tipo: v.kind, titolo: v.title, relazione: v.rel })), ...(contesto ? { contesto: { completo: `${contesto.percentuale}%`, manca: contesto.manca } } : {}) }
  },
})

export const clientContext = defineAction({
  id: 'client.context', title: 'Completezza del contesto', domain: 'client', group: 'clienti', risk: 'read', toolName: 'clientContext',
  description: 'Cosa il sistema sa e cosa non sa di un cliente (tono, marchio, account, metriche, scheda). Usalo prima di scrivere o progettare per un cliente: ciò che manca va chiesto, non inventato.',
  input: z.object({ cliente: z.string().describe('nome o ID del cliente') }),
  run: ({ cliente }) => {
    const c = findClient(cliente)
    if ('error' in c) return { success: false, message: c.error }
    return { success: true, ...completeness(c.id) }
  },
})
