/**
 * Dominio client (K1): cercare, leggere, creare e aggiornare i clienti.
 * Una sola implementazione per pulsanti, chat, runAgent e Ctrl+K.
 */
import { z } from 'zod'
import { clients, editorialPosts, socialAnalytics, type Client } from '@/lib/db'
import { budget, tutti } from '@/lib/agent/checks'
import { defineAction } from '../actions'

const short = (id?: string | null) => (id ? id.slice(0, 8) : '—')
const STATI = ['idea', 'bozza', 'approvato', 'programmato', 'pubblicato'] as const

function fmtDate(iso?: string) {
  if (!iso) return 'senza data'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Trova un cliente da ID completo, ID corto (prefisso) o parte del nome. */
export function findClient(ref: string): Client | { error: string } {
  const key = ref.trim().toLowerCase()
  if (!key) return { error: 'Indica un cliente (nome o ID).' }
  const all = clients.getAll()
  const hit = all.find(c => c.id === ref) ?? all.find(c => c.id.startsWith(ref))
  if (hit) return hit
  const byName = all.filter(c => c.name.toLowerCase().includes(key))
  if (byName.length === 1) return byName[0]
  if (byName.length > 1) return { error: `"${ref}" corrisponde a più clienti: ${byName.map(c => `${c.name} [${short(c.id)}]`).join(', ')}. Usa l'ID.` }
  return { error: `Cliente "${ref}" non trovato. Usa searchClient per vedere i nomi esatti.` }
}

/** ID completo del cliente, o undefined se il riferimento è vuoto o non risolve. */
export function clientIdOf(ref?: string | null): string | undefined {
  if (!ref) return undefined
  const c = findClient(ref)
  return 'error' in c ? undefined : c.id
}

export const clientSearch = defineAction({
  id: 'client.search', title: 'Cerca un cliente', domain: 'client', group: 'clienti', risk: 'read', toolName: 'searchClient',
  description: 'Cerca un cliente per nome e restituisce nome, ID corto e settore.',
  input: z.object({ name: z.string() }),
  run: ({ name }) => {
    const matches = clients.getAll().filter(c => c.name.toLowerCase().includes(name.toLowerCase()))
    if (matches.length === 0) return { success: false, message: `Nessun cliente trovato per "${name}"` }
    return { success: true, clients: matches.map(c => `[${short(c.id)}] ${c.name} (${c.sector || 'settore non specificato'})`).join('\n') }
  },
})

export const clientGet = defineAction({
  id: 'client.get', title: 'Scheda cliente', domain: 'client', group: 'clienti', risk: 'read', toolName: 'getClient', maxChars: 7000,
  description: 'Scheda completa di un cliente: settore, contatti, account social collegati, metriche social più recenti, post nel piano editoriale per stato, estratto del vault (brand, tono, note). Usalo prima di scrivere contenuti o pianificare per quel cliente.',
  input: z.object({ cliente: z.string().describe('nome o ID del cliente') }),
  run: ({ cliente }) => {
    const c = findClient(cliente)
    if ('error' in c) return { success: false, error: c.error }
    const metrics = socialAnalytics.getClientMetrics(c.id)
    const posts = editorialPosts.getByClient(c.id)
    const perStato = STATI.map(s => `${s} ${posts.filter(p => p.editorial_status === s).length}`).join(', ')
    const prossimi = posts.filter(p => p.scheduled_at && new Date(p.scheduled_at) >= new Date()).slice(0, 5).map(p => `${fmtDate(p.scheduled_at)} · ${p.title ?? ''}`)
    return {
      success: true,
      cliente: `${c.name} [${short(c.id)}] · ${c.category} · ${c.sector ?? 'settore non indicato'}${c.email ? ` · ${c.email}` : ''}`,
      social: [c.meta_ig_account_id ? 'Instagram collegato' : '', c.meta_page_id ? 'Pagina Facebook collegata' : ''].filter(Boolean).join(', ') || 'nessun account collegato',
      metriche: Object.entries(metrics).map(([pl, m]) => `${pl}: ${m.followers} follower, engagement ${m.engagement_rate}%, copertura ${m.reach} (al ${m.recorded_at.slice(0, 10)})`).join('\n') || 'nessuna metrica registrata',
      pianoEditoriale: `${posts.length} post (${perStato})`,
      prossimiPost: prossimi.join('\n') || 'nessun post programmato',
      vault: (c.vault_md_content ?? '').trim().slice(0, 4000) || 'vault vuoto',
    }
  },
})

export const clientCreate = defineAction({
  id: 'client.create', title: 'Nuovo cliente', domain: 'client', group: 'clienti', risk: 'write', toolName: 'createClient',
  description: 'Crea un nuovo cliente (con la sua cartella su Drive, se Google è collegato). Prima controlla con searchClient che non esista già.',
  input: z.object({ name: z.string(), email: z.string().optional(), sector: z.string().optional() }),
  verify: ({ name }) => tutti(
    budget('name', name, 80, 2),
    clients.getAll().some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase()) ? [`name: il cliente "${name}" esiste già.`] : [],
  ),
  run: async ({ name, email, sector }) => {
    const c = clients.create({ name: name.trim(), email: email?.trim() || undefined, sector: sector || undefined, category: 'cliente', vault_path: `/_CLIENTI/${name.trim()}/` })
    try {
      const { getDriveClient, createClientVault } = await import('@/lib/google/drive')
      const { folderId } = await createClientVault(await getDriveClient(), name.trim())
      clients.update(c.id, { drive_folder_id: folderId })
    } catch (e) {
      console.error('[Drive Automation Error]', e)
    }
    return { success: true, message: `Cliente "${c.name}" creato.`, id: c.id }
  },
})

export const clientUpdate = defineAction({
  id: 'client.update', title: 'Aggiorna cliente', domain: 'client', group: 'clienti', risk: 'write', toolName: 'updateClient', palette: false,
  description: 'Aggiorna i dati di un cliente: nome, email, settore, vault (brand, tono, note).',
  input: z.object({
    cliente: z.string(),
    name: z.string().optional(), email: z.string().optional(), sector: z.string().optional(),
    vault_md_content: z.string().optional(), canva_brand_kit_id: z.string().optional(), figjam_board_id: z.string().optional(), canvas_state: z.string().optional(),
  }),
  verify: ({ cliente }) => { const c = findClient(cliente); return 'error' in c ? [`cliente: ${c.error}`] : [] },
  run: ({ cliente, ...data }) => {
    const c = findClient(cliente) as Client
    clients.update(c.id, data)
    return { success: true, message: `Cliente "${c.name}" aggiornato (${Object.keys(data).join(', ') || 'niente'}).`, id: c.id }
  },
})
