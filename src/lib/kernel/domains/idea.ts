/**
 * Dominio idea (K1): creare, elencare, aggiornare, eliminare le idee.
 */
import { z } from 'zod'
import { ideas } from '@/lib/db'
import { budget, clienteEsiste, tutti } from '@/lib/agent/checks'
import { defineAction } from '../actions'
import { clientIdOf, findClient } from './client'

const short = (id?: string | null) => (id ? id.slice(0, 8) : '—')
const findIdea = (ref: string) => ideas.getAll().find(i => i.id === ref || i.id.startsWith(ref.replace(/^idea:/, '')))

export const ideaCreate = defineAction({
  id: 'idea.create', title: 'Nuova idea', domain: 'idea', group: 'idee', risk: 'write', toolName: 'createIdea',
  description: 'Cattura una nuova idea creativa nel sistema.',
  input: z.object({
    text: z.string().describe("Il contenuto dell'idea"),
    title: z.string().optional(),
    clientId: z.string().optional().describe('nome o ID del cliente'),
    platforms: z.array(z.string()).optional(),
    status: z.string().optional().describe('stato iniziale (default "nuova")'),
  }),
  verify: ({ text, title, clientId }) => tutti(budget('text', text, 2000, 2), budget('title', title, 120), clienteEsiste('clientId', clientId)),
  run: ({ text, title, clientId, platforms, status }) => {
    // nome, ID corto o completo: nel database va l'ID completo
    const idea = ideas.create({
      client_id: clientIdOf(clientId),
      text: text.trim(),
      title: title?.trim() || undefined,
      platforms: platforms || [],
      idea_status: status ?? 'nuova',
      assigned: false,
      output_links: [],
    })
    return { success: true, message: `Idea "${title || text.slice(0, 20)}" salvata con successo.`, id: idea.id }
  },
  after: (_i, out) => {
    const id = (out as { id?: string }).id
    return id && ideas.getAll().some(i => i.id === id) ? [] : ["l'idea non risulta salvata: rileggi con listIdeas."]
  },
})

export const ideaList = defineAction({
  id: 'idea.list', title: 'Idee salvate', domain: 'idea', group: 'idee', risk: 'read', toolName: 'listIdeas', maxChars: 6000,
  description: 'Elenca le idee salvate (filtri per stato, cliente, parole). Usalo per riprendere idee esistenti quando l\'utente pianifica contenuti o chiede "cosa avevo in mente per…".',
  input: z.object({
    stato: z.string().optional().describe('es. nuova, in_lavorazione; vuoto = tutte'),
    cliente: z.string().optional(),
    cerca: z.string().optional().describe('parole da cercare nel testo'),
    limite: z.number().int().min(1).max(40).optional().default(15),
  }),
  run: ({ stato, cliente, cerca, limite }) => {
    let list = stato ? ideas.getByStatus(stato) : ideas.getAll()
    if (cliente) {
      const c = findClient(cliente)
      if ('error' in c) return { success: false, error: c.error }
      list = list.filter(i => i.client_id === c.id)
    }
    if (cerca) {
      const words = cerca.toLowerCase().split(/\s+/).filter(Boolean)
      list = list.filter(i => words.every(w => `${i.title ?? ''} ${i.text}`.toLowerCase().includes(w)))
    }
    const rows = list.slice(0, limite).map(i => `[${short(i.id)}] ${i.title ?? i.text.slice(0, 50)} · ${i.idea_status}${i.platforms.length ? ` · ${i.platforms.join('+')}` : ''}${i.title ? ` — ${i.text.slice(0, 120)}` : ''}`)
    return { success: true, totale: list.length, idee: rows.join('\n') || 'Nessuna idea con questi filtri.' }
  },
})

export const ideaUpdate = defineAction({
  id: 'idea.update', title: 'Aggiorna un\'idea', domain: 'idea', group: 'idee', risk: 'write', toolName: 'updateIdea', palette: false,
  description: 'Aggiorna titolo, descrizione, stato o piattaforme di un\'idea esistente (ID da listIdeas).',
  input: z.object({ id: z.string(), idea_status: z.string().optional(), platforms: z.array(z.string()).optional(), description: z.string().optional(), title: z.string().optional() }),
  verify: ({ id }) => (findIdea(id) ? [] : [`idea "${id}" non trovata: leggi gli ID con listIdeas.`]),
  run: ({ id, ...data }) => {
    const i = findIdea(id)!
    ideas.update(i.id, data)
    return { success: true, id: i.id, message: `Idea "${i.title ?? i.text.slice(0, 30)}" aggiornata.` }
  },
})

export const ideaDelete = defineAction({
  id: 'idea.delete', title: 'Elimina un\'idea', domain: 'idea', group: 'idee', risk: 'destructive', toolName: 'deleteIdea', palette: false,
  description: 'Elimina un\'idea. Chiede conferma all\'utente.',
  input: z.object({ id: z.string() }),
  verify: ({ id }) => (findIdea(id) ? [] : [`idea "${id}" non trovata.`]),
  run: ({ id }) => { const i = findIdea(id)!; ideas.delete(i.id); return { success: true, id: i.id, message: 'Idea eliminata.' } },
})
