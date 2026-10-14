/**
 * Strumenti di sistema nuovi (docs/guscio-agente.md §4): danno all'assistente
 * occhi e mani sulle parti che prima non vedeva — piano editoriale, idee,
 * scheda cliente, memoria, regia dello Studio — più il piano di lavoro per i
 * compiti lunghi. Regole: cercare con filtri invece di elencare tutto,
 * restituire nomi leggibili con ID corti, errori che dicono come correggere.
 */
import { z } from 'zod'
import { clients, editorialPosts, ideas, socialAnalytics, type Client, type EditorialPost } from '@/lib/db'
import { searchMemories, searchVault } from '@/lib/vault'
import type { AgentToolDef } from './tools'
import { dataIso, testoSocial } from './checks'

/* ── utilità condivise ─────────────────────────────────────────────────── */

const short = (id?: string | null) => (id ? id.slice(0, 8) : '—')

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

/** Trova un post del piano editoriale da ID completo o corto. */
function findPost(ref: string): EditorialPost | undefined {
  return editorialPosts.getById(ref) ?? editorialPosts.getAll().find(p => p.id.startsWith(ref))
}

/** Giorno nel fuso locale (AAAA-MM-GG): toISOString() sposterebbe le date di un giorno attorno alla mezzanotte. */
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/
const STATI = ['idea', 'bozza', 'approvato', 'programmato', 'pubblicato'] as const

function fmtDate(iso?: string) {
  if (!iso) return 'senza data'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/* ── piano di lavoro ───────────────────────────────────────────────────── */

export const planSchema = z.object({
  passi: z.array(z.object({
    testo: z.string().describe('passo breve, all\'imperativo'),
    stato: z.enum(['da_fare', 'in_corso', 'fatto']),
  })).min(1).max(15),
})

export const updatePlan: AgentToolDef<typeof planSchema> = {
  name: 'updatePlan', group: 'piano', risk: 'read', maxChars: 3000,
  description: 'Scrive o aggiorna il piano di lavoro per un compito in più fasi (più di tre azioni). Manda ogni volta la lista intera; un solo passo "in_corso" alla volta. L\'utente vede la lista in chat. Non serve per domande semplici.',
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

/* ── piano editoriale e social ─────────────────────────────────────────── */

const readPlanSchema = z.object({
  cliente: z.string().optional().describe('nome o ID del cliente; vuoto = tutti'),
  stato: z.enum([...STATI, 'tutti']).optional().default('tutti'),
  dal: z.string().optional().describe('data ISO di inizio (inclusa), es. 2026-10-01'),
  al: z.string().optional().describe('data ISO di fine (inclusa), es. 2026-10-31'),
  canale: z.string().optional().describe('es. instagram, linkedin'),
  limite: z.number().int().min(1).max(60).optional().default(30),
})

export const readEditorialPlan: AgentToolDef<typeof readPlanSchema> = {
  name: 'readEditorialPlan', group: 'social', risk: 'read', maxChars: 9000,
  description: 'Legge il piano editoriale (post social pianificati, bozze, pubblicati) con filtri per cliente, stato, periodo e canale. Usalo prima di pianificare, per trovare i buchi nel calendario e non ripetere contenuti già fatti. Restituisce anche i giorni del periodo senza post.',
  inputSchema: readPlanSchema,
  verify: ({ dal, al }) => [
    ...(dal && !ISO_DATE.test(dal) ? [`dal: "${dal}" non è una data ISO (AAAA-MM-GG).`] : []),
    ...(al && !ISO_DATE.test(al) ? [`al: "${al}" non è una data ISO (AAAA-MM-GG).`] : []),
  ],
  execute: ({ cliente, stato, dal, al, canale, limite }) => {
    let posts: EditorialPost[]
    if (cliente) {
      const c = findClient(cliente)
      if ('error' in c) return { success: false, error: c.error }
      posts = editorialPosts.getByClient(c.id)
    } else posts = editorialPosts.getAll()
    const from = dal ? new Date(dal.length === 10 ? `${dal}T00:00:00` : dal) : undefined
    const to = al ? new Date(al.length === 10 ? `${al}T23:59:59` : al) : undefined
    const filtered = posts.filter(p => {
      if (stato && stato !== 'tutti' && p.editorial_status !== stato) return false
      if (canale && !p.channels.some(ch => ch.toLowerCase() === canale.toLowerCase())) return false
      if (from || to) {
        if (!p.scheduled_at) return false
        const d = new Date(p.scheduled_at)
        if (from && d < from) return false
        if (to && d > to) return false
      }
      return true
    }).sort((a, b) => (a.scheduled_at ?? '9').localeCompare(b.scheduled_at ?? '9'))

    const rows = filtered.slice(0, limite).map(p => {
      const meta = p.metadata as { format?: string } | undefined
      return `[${short(p.id)}] ${fmtDate(p.scheduled_at)} · ${p.client_name ?? '—'} · ${p.channels.join('+') || '—'}${meta?.format ? ` · ${meta.format}` : ''} · ${p.editorial_status} · ${p.title ?? (p.content ?? '').slice(0, 60)}`
    })
    // giorni liberi nel periodo (solo se il periodo è dato e non supera i 62 giorni)
    let liberi: string[] | undefined
    if (from && to && (to.getTime() - from.getTime()) / 864e5 <= 62) {
      const pieni = new Set(filtered.map(p => localDay(new Date(p.scheduled_at!))))
      liberi = []
      for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const k = localDay(d)
        if (!pieni.has(k)) liberi.push(k)
      }
    }
    return {
      success: true,
      totale: filtered.length,
      mostrati: rows.length,
      post: rows.join('\n') || 'Nessun post con questi filtri.',
      ...(liberi ? { giorniSenzaPost: liberi.join(', ') || 'nessuno' } : {}),
    }
  },
}

const updatePostSchema = z.object({
  id: z.string().describe('ID del post (anche gli 8 caratteri mostrati da readEditorialPlan)'),
  stato: z.enum(STATI).optional(),
  dataProgrammata: z.string().optional().describe('data/ora ISO, es. 2026-10-21T18:30'),
  titolo: z.string().optional(),
  contenuto: z.string().optional().describe('testo completo che sostituisce quello attuale'),
  canali: z.array(z.string()).optional(),
})

export const updateEditorialPost: AgentToolDef<typeof updatePostSchema> = {
  name: 'updateEditorialPost', group: 'social', risk: 'write', maxChars: 1500,
  description: 'Modifica un post esistente del piano editoriale: stato, data programmata, titolo, testo, canali. Non pubblica nulla sui social: cambia solo il piano. Per creare un post Instagram nuovo usa saveInstagramDraft.',
  inputSchema: updatePostSchema,
  verify: ({ id, dataProgrammata, stato, titolo, contenuto, canali }) => {
    const errs: string[] = []
    if (!findPost(id)) errs.push(`post "${id}" non trovato: leggi gli ID con readEditorialPlan.`)
    if (dataProgrammata && !ISO_DATE.test(dataProgrammata)) errs.push(`dataProgrammata: "${dataProgrammata}" non è ISO (AAAA-MM-GGTHH:MM).`)
    // G5: niente programmazioni nel passato; un testo per Instagram deve passare il lint della caption
    else if (dataProgrammata && stato !== 'pubblicato') errs.push(...dataIso('dataProgrammata', dataProgrammata, { futura: true }))
    if (contenuto !== undefined) {
      const canaliPost = canali ?? findPost(id)?.channels ?? []
      if (canaliPost.some(ch => ch.toLowerCase() === 'instagram')) errs.push(...testoSocial('contenuto', contenuto.split('--- CAPTION ---').pop()))
    }
    if (stato === 'programmato' && !dataProgrammata && !findPost(id)?.scheduled_at) errs.push('per "programmato" serve una dataProgrammata.')
    if (stato === undefined && dataProgrammata === undefined && titolo === undefined && contenuto === undefined && canali === undefined) errs.push('non hai indicato nessuna modifica.')
    return errs
  },
  execute: ({ id, stato, dataProgrammata, titolo, contenuto, canali }) => {
    const p = findPost(id)!
    const patch: Partial<EditorialPost> = {}
    if (stato) patch.editorial_status = stato
    if (dataProgrammata) patch.scheduled_at = new Date(dataProgrammata).toISOString()
    if (titolo !== undefined) patch.title = titolo
    if (contenuto !== undefined) patch.content = contenuto
    if (canali) patch.channels = canali
    if (stato === 'pubblicato') patch.published_at = new Date().toISOString()
    editorialPosts.update(p.id, patch)
    const cambi = Object.keys(patch).filter(k => k !== 'published_at').join(', ')
    return { success: true, message: `Post [${short(p.id)}] "${p.title ?? ''}" aggiornato (${cambi}).` }
  },
}

/* ── idee ──────────────────────────────────────────────────────────────── */

const listIdeasSchema = z.object({
  stato: z.string().optional().describe('es. nuova, in_lavorazione; vuoto = tutte'),
  cliente: z.string().optional(),
  cerca: z.string().optional().describe('parole da cercare nel testo'),
  limite: z.number().int().min(1).max(40).optional().default(15),
})

export const listIdeas: AgentToolDef<typeof listIdeasSchema> = {
  name: 'listIdeas', group: 'idee', risk: 'read', maxChars: 6000,
  description: 'Elenca le idee salvate (filtri per stato, cliente, parole). Usalo per riprendere idee esistenti quando l\'utente pianifica contenuti o chiede "cosa avevo in mente per…".',
  inputSchema: listIdeasSchema,
  execute: ({ stato, cliente, cerca, limite }) => {
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
}

/* ── scheda cliente ────────────────────────────────────────────────────── */

const getClientSchema = z.object({ cliente: z.string().describe('nome o ID del cliente') })

export const getClient: AgentToolDef<typeof getClientSchema> = {
  name: 'getClient', group: 'clienti', risk: 'read', maxChars: 7000,
  description: 'Scheda completa di un cliente: settore, contatti, account social collegati, metriche social più recenti, post nel piano editoriale per stato, estratto del vault (brand, tono, note). Usalo prima di scrivere contenuti o pianificare per quel cliente.',
  inputSchema: getClientSchema,
  execute: ({ cliente }) => {
    const c = findClient(cliente)
    if ('error' in c) return { success: false, error: c.error }
    const metrics = socialAnalytics.getClientMetrics(c.id)
    const posts = editorialPosts.getByClient(c.id)
    const perStato = STATI.map(s => `${s} ${posts.filter(p => p.editorial_status === s).length}`).join(', ')
    const prossimi = posts.filter(p => p.scheduled_at && new Date(p.scheduled_at) >= new Date()).slice(0, 5)
      .map(p => `${fmtDate(p.scheduled_at)} · ${p.title ?? ''}`)
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
  cliente: z.string().optional().describe('nome o ID del cliente: la regia legge brand, piano editoriale e memoria dal sistema'),
})

export const directDesign: AgentToolDef<typeof directDesignSchema> = {
  name: 'directDesign', group: 'studio', risk: 'read', maxChars: 12000,
  description: 'La regia dello Studio: dal brief produce testi verificati (budget di caratteri, niente frasi fatte né numeri inventati) e tre direzioni visive scelte dal menu del motore (sistema, stile, trattamento, regolatori). Per i caroselli anche la scaletta delle slide. Usa poi i testi e una direzione in composeDesign. Richiede da qualche secondo a un minuto.',
  inputSchema: directDesignSchema,
  execute: async ({ brief, slide, haFoto, cliente }) => {
    const { regia } = await import('@/lib/ai/designer-roles')
    const r = await regia(brief, { slides: slide, haFoto, cliente })
    return {
      success: true,
      analisi: r.analisi,
      ...(r.testi ? { testi: r.testi } : {}),
      ...(r.scaletta ? { scaletta: r.scaletta, slide: r.slides } : {}),
      direzioni: r.direzioni,
      modelli: r.modelli,
    }
  },
}

export const SYSTEM_TOOLS = [updatePlan, readEditorialPlan, updateEditorialPost, listIdeas, getClient, searchMemory, directDesign] as unknown as AgentToolDef<z.ZodTypeAny>[]
