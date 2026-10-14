/**
 * Dominio post (K1): piano editoriale e social. Leggere il piano, modificare
 * un post, cambiarne lo stato, salvare una bozza Instagram.
 */
import { z } from 'zod'
import { editorialPosts, type EditorialPost } from '@/lib/db'
import { instagramScores } from '@/lib/ai/instagram'
import { avvisiSocial, budget, clienteEsiste, dataIso, testoSocial, tutti } from '@/lib/agent/checks'
import { defineAction } from '../actions'
import { findClient } from './client'

const short = (id?: string | null) => (id ? id.slice(0, 8) : '—')
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/
export const STATI_POST = ['idea', 'bozza', 'approvato', 'programmato', 'pubblicato'] as const

/** Giorno nel fuso locale (AAAA-MM-GG): toISOString() sposterebbe le date di un giorno attorno alla mezzanotte. */
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function fmtDate(iso?: string) {
  if (!iso) return 'senza data'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Trova un post del piano editoriale da ID completo, corto o "post:<id>". */
export function findPost(ref: string): EditorialPost | undefined {
  const id = ref.replace(/^post:/, '')
  return editorialPosts.getById(id) ?? editorialPosts.getAll().find(p => p.id.startsWith(id))
}

export const postList = defineAction({
  id: 'post.list', title: 'Piano editoriale', domain: 'post', group: 'social', risk: 'read', toolName: 'readEditorialPlan', maxChars: 9000,
  description: 'Legge il piano editoriale (post social pianificati, bozze, pubblicati) con filtri per cliente, stato, periodo e canale. Usalo prima di pianificare, per trovare i buchi nel calendario e non ripetere contenuti già fatti. Restituisce anche i giorni del periodo senza post.',
  input: z.object({
    cliente: z.string().optional().describe('nome o ID del cliente; vuoto = tutti'),
    stato: z.enum([...STATI_POST, 'tutti']).optional().default('tutti'),
    dal: z.string().optional().describe('data ISO di inizio (inclusa), es. 2026-10-01'),
    al: z.string().optional().describe('data ISO di fine (inclusa), es. 2026-10-31'),
    canale: z.string().optional().describe('es. instagram, linkedin'),
    limite: z.number().int().min(1).max(60).optional().default(30),
  }),
  verify: ({ dal, al }) => [
    ...(dal && !ISO_DATE.test(dal) ? [`dal: "${dal}" non è una data ISO (AAAA-MM-GG).`] : []),
    ...(al && !ISO_DATE.test(al) ? [`al: "${al}" non è una data ISO (AAAA-MM-GG).`] : []),
  ],
  run: ({ cliente, stato, dal, al, canale, limite }) => {
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
})

export const postUpdate = defineAction({
  id: 'post.update', title: 'Modifica un post del piano', domain: 'post', group: 'social', risk: 'write', toolName: 'updateEditorialPost', maxChars: 1500,
  description: 'Modifica un post esistente del piano editoriale: stato, data programmata, titolo, testo, canali. Non pubblica nulla sui social: cambia solo il piano. Per creare un post Instagram nuovo usa saveInstagramDraft.',
  input: z.object({
    id: z.string().describe('ID del post (anche gli 8 caratteri mostrati da readEditorialPlan)'),
    stato: z.enum(STATI_POST).optional(),
    dataProgrammata: z.string().optional().describe('data/ora ISO, es. 2026-10-21T18:30'),
    titolo: z.string().optional(),
    contenuto: z.string().optional().describe('testo completo che sostituisce quello attuale'),
    canali: z.array(z.string()).optional(),
  }),
  verify: ({ id, dataProgrammata, stato, titolo, contenuto, canali }, ctx) => {
    const errs: string[] = []
    const p = findPost(id)
    if (!p) errs.push(`post "${id}" non trovato: leggi gli ID con readEditorialPlan.`)
    if (dataProgrammata && !ISO_DATE.test(dataProgrammata)) errs.push(`dataProgrammata: "${dataProgrammata}" non è ISO (AAAA-MM-GGTHH:MM).`)
    // G5: per l'IA niente programmazioni nel passato; un testo per Instagram deve passare il lint della caption
    else if (dataProgrammata && stato !== 'pubblicato' && ctx.actor !== 'user') errs.push(...dataIso('dataProgrammata', dataProgrammata, { futura: true }))
    if (contenuto !== undefined && ctx.actor !== 'user') {
      const canaliPost = canali ?? p?.channels ?? []
      if (canaliPost.some(ch => ch.toLowerCase() === 'instagram')) errs.push(...testoSocial('contenuto', contenuto.split('--- CAPTION ---').pop()))
    }
    if (stato === 'programmato' && !dataProgrammata && !p?.scheduled_at) errs.push('per "programmato" serve una dataProgrammata.')
    if (stato === undefined && dataProgrammata === undefined && titolo === undefined && contenuto === undefined && canali === undefined) errs.push('non hai indicato nessuna modifica.')
    return errs
  },
  run: ({ id, stato, dataProgrammata, titolo, contenuto, canali }) => {
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
    return { success: true, message: `Post [${short(p.id)}] "${p.title ?? ''}" aggiornato (${cambi}).`, id: p.id }
  },
  after: ({ id, stato }) => {
    if (!stato) return []
    const p = findPost(id)
    return p?.editorial_status === stato ? [] : [`lo stato del post risulta "${p?.editorial_status}", non "${stato}".`]
  },
})

export const postSaveInstagram = defineAction({
  id: 'post.save_instagram', title: 'Salva una bozza Instagram nel piano', domain: 'post', group: 'social', risk: 'write', toolName: 'saveInstagramDraft',
  description: 'Salva un contenuto Instagram approvato dall\'utente nel piano editoriale (board Editoriale) con formato, formula hook e punteggi. Usalo SOLO dopo il "sì" dell\'utente. Non pubblica nulla.',
  input: z.object({
    client: z.string().describe('ID cliente (anche i primi 8 caratteri) o nome'),
    title: z.string().describe('Titolo breve / prima riga'),
    content: z.string().describe('Copione, slide o caption finali, già umanizzati'),
    format: z.enum(['reel', 'carousel', 'story', 'post']),
    status: z.enum(['idea', 'bozza']).default('bozza'),
    scheduledAt: z.string().optional().describe('Data/ora prevista ISO, se pianificata'),
    hookFormula: z.string().optional().describe('Es. "#3 Nessuno ti dice"'),
    caption: z.string().optional().describe('Caption separata dal copione, se presente'),
  }),
  verify: ({ client, title, content, format, scheduledAt, caption }, ctx) => tutti(
    clienteEsiste('client', client, { obbligatorio: true }),
    budget('title', title, 80, 3),
    budget('content', content, 5000, 10),
    dataIso('scheduledAt', scheduledAt, { futura: ctx.actor !== 'user' }),
    // la caption (o il contenuto di un post singolo) deve essere pronta: lint e testo non generato
    ctx.actor !== 'user' ? testoSocial(caption ? 'caption' : 'content', caption ?? (format === 'post' ? content : undefined)) : [],
    budget('caption', caption, 2200),
  ),
  run: ({ client, title, content, format, status, scheduledAt, hookFormula, caption }) => {
    const match = findClient(client)
    if ('error' in match) return { success: false, message: match.error }
    const scores = instagramScores(caption ?? content)
    const post = editorialPosts.create({
      client_id: match.id,
      title,
      content: caption ? `${content}\n\n--- CAPTION ---\n${caption}` : content,
      channels: ['instagram'],
      editorial_status: status,
      scheduled_at: scheduledAt,
      metadata: { circuit: 'instagram', format, hookFormula, ...scores },
    })
    return {
      success: true,
      message: `Salvato nel piano editoriale di ${match.name} come "${status}" (${format}). Linter caption: ${scores.captionVerdict}, human score ${scores.humanScore} ${scores.humanVerdict}.`,
      postId: post?.id,
    }
  },
  after: ({ caption, content, format }, out) => {
    const id = (out as { postId?: string }).postId
    const salvato = id && editorialPosts.getById(id) ? [] : ['il post non risulta nel piano editoriale: rileggi con readEditorialPlan.']
    return [...salvato, ...avvisiSocial(caption ?? (format === 'post' ? content : undefined)).map(a => `da rivedere: ${a}`)]
  },
})

/** Un passo avanti nello stato (guscio /os): idea → bozza → approvato → programmato → pubblicato. */
export const postSetStatus = defineAction({
  id: 'post.set_status', title: 'Cambia lo stato di un post', domain: 'post', group: 'social', risk: 'write', palette: false,
  description: 'Cambia lo stato di un post del piano editoriale.',
  input: z.object({ ref: z.string().describe('ID del post o "post:<id>"'), status: z.enum(['bozza', 'approvato', 'programmato', 'pubblicato']) }),
  verify: ({ ref }) => (findPost(ref) ? [] : ['Contenuto non trovato']),
  run: ({ ref, status }) => {
    const p = findPost(ref)!
    editorialPosts.updateStatus(p.id, status, status === 'pubblicato' ? { published_at: new Date().toISOString() } : undefined)
    return { success: true, id: p.id, message: `Post "${p.title ?? ''}" ora è ${status}.` }
  },
})
