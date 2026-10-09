import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { editorialPosts, messages, quotes, tasks } from '@/lib/db'
import { clientOfRef, getList, getNode, linkOrigin, quoteFor, search } from '@/lib/os/graph'
import { googleStatus } from '@/lib/google/auth'
import { upcomingEvents } from '@/lib/google/calendar'

/**
 * API unica dello spazio di lavoro circolare.
 * GET  ?list=oggi | ?ref=mail:id | ?q=testo | ?quote=clientId
 * POST { action: 'reply', ref, text } → invia via Gmail e segna come risposto
 * POST { action: 'draft', ref }       → bozza scritta dall'AI (solo su richiesta esplicita)
 */
export async function GET(req: Request) {
  const u = new URL(req.url)
  try {
    if (u.searchParams.has('list')) return NextResponse.json(await getList(u.searchParams.get('list')!))
    if (u.searchParams.has('busy')) {
      // intervalli occupati nei prossimi giorni: il calendario propone solo orari liberi
      const evs = await upcomingEvents(10)
      return NextResponse.json(evs.filter(e => !e.allDay).map(e => ({ start: e.start, end: e.end })))
    }
    if (u.searchParams.has('ref')) {
      const n = await getNode(u.searchParams.get('ref')!)
      return n ? NextResponse.json(n) : NextResponse.json({ error: 'Non trovato' }, { status: 404 })
    }
    if (u.searchParams.has('q')) return NextResponse.json(search(u.searchParams.get('q')!))
    if (u.searchParams.has('google')) return NextResponse.json(googleStatus())
    if (u.searchParams.has('quote')) return NextResponse.json(quoteFor(u.searchParams.get('quote') || undefined, u.searchParams.get('from') || undefined))
    return NextResponse.json({ error: 'Parametro mancante' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

const findMail = (ref: string) => messages.getAll({ limit: 1000 }).find(m => `mail:${m.id}` === ref)
const toHtml = (text: string) => text.split(/\n{2,}/).map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`).join('')

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const m = body.ref ? findMail(body.ref) : undefined

  if (body.action === 'reply') {
    if (!m) return NextResponse.json({ error: 'Mail non trovata' }, { status: 404 })
    if (!body.text?.trim()) return NextResponse.json({ error: 'La risposta è vuota' }, { status: 400 })
    const meta = (m.metadata ?? {}) as Record<string, string>
    const res = await fetch(new URL('/api/gmail/send', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') ?? '' },
      body: JSON.stringify({
        to: m.sender_id,
        subject: m.subject?.startsWith('Re:') ? m.subject : `Re: ${m.subject ?? ''}`,
        htmlBody: toHtml(body.text),
        replyToMessageIdHeader: meta.messageIdHeader ?? meta.message_id_header,
        threadId: meta.threadId ?? meta.thread_id,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err.error ?? 'Invio non riuscito: ricollega Google dalle impostazioni' }, { status: 502 })
    }
    messages.markReplied(m.id)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'draft') {
    if (!m) return NextResponse.json({ error: 'Mail non trovata' }, { status: 404 })
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'Manca ANTHROPIC_API_KEY in .env.local' }, { status: 400 })
    const plain = (m.content || '').replace(/<[^>]+>/g, ' ').slice(0, 4000)
    try {
      const { text } = await generateText({
        model: anthropic('claude-haiku-5-5'),
        system: 'Sei l’assistente di un designer freelance italiano. Scrivi bozze di risposta brevi, cordiali e concrete, in italiano, senza firma e senza inventare prezzi o date non presenti. Se ti chiedono un appuntamento, proponi di concordare un orario.',
        prompt: `Mail di ${m.sender_name ?? m.sender_id}, oggetto "${m.subject ?? ''}":\n\n${plain}\n\nScrivi la bozza di risposta.`,
      })
      return NextResponse.json({ text })
    } catch (e) {
      return NextResponse.json({ error: `Bozza non riuscita: ${(e as Error).message}` }, { status: 502 })
    }
  }

  // Nuovo task nato da un nodo (mail, cliente…): resta la traccia "nato da"
  if (body.action === 'task') {
    const title = String(body.title ?? '').trim()
    if (!title) return NextResponse.json({ error: 'Dai un nome al task' }, { status: 400 })
    const client = body.fromRef ? clientOfRef(body.fromRef) : undefined
    const t = tasks.create({ client_id: client?.id, title, type: 'general', category: 'task', deadline: body.deadline ?? undefined, status: 'todo' })
    if (body.fromRef) linkOrigin(body.fromRef, 'task', t.id)
    return NextResponse.json({ ref: `task:${t.id}` })
  }

  if (body.action === 'done') {
    const id = String(body.ref ?? '').replace(/^task:/, '')
    if (!tasks.getById(id)) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
    tasks.update(id, { status: 'done' })
    return NextResponse.json({ ok: true })
  }

  // Un contenuto social avanza di un passo (idea → bozza → approvato → programmato → pubblicato)
  if (body.action === 'post-status') {
    const id = String(body.ref ?? '').replace(/^post:/, '')
    const allowed = ['bozza', 'approvato', 'programmato', 'pubblicato']
    if (!allowed.includes(body.status)) return NextResponse.json({ error: 'Stato non valido' }, { status: 400 })
    if (!editorialPosts.getAll().some(p => p.id === id)) return NextResponse.json({ error: 'Contenuto non trovato' }, { status: 404 })
    editorialPosts.updateStatus(id, body.status, body.status === 'pubblicato' ? { published_at: new Date().toISOString() } : undefined)
    return NextResponse.json({ ok: true })
  }

  // Preventivo in bozza, collegato al cliente del nodo da cui nasce
  if (body.action === 'quote') {
    const client = body.fromRef ? clientOfRef(body.fromRef) : undefined
    const items = (Array.isArray(body.items) ? body.items : [])
      .map((i: { desc?: string; qty?: number; unit_price?: number }) => ({ desc: String(i.desc ?? '').trim(), qty: Number(i.qty) || 1, unit_price: Number(i.unit_price) || 0 }))
      .filter((i: { desc: string }) => i.desc)
    if (!items.length) return NextResponse.json({ error: 'Aggiungi almeno una voce' }, { status: 400 })
    const year = new Date().getFullYear()
    const q = quotes.create({
      client_id: client?.id, client_name: client?.name ?? body.clientName ?? 'Senza cliente', title: String(body.title ?? 'Preventivo'),
      number: `${year}-${String(quotes.getAll().length + 1).padStart(3, '0')}`, type: 'preventivo', status: 'bozza', items,
      total: items.reduce((s: number, i: { qty: number; unit_price: number }) => s + i.qty * i.unit_price, 0),
    })
    if (body.fromRef) linkOrigin(body.fromRef, 'quote', q.id)
    return NextResponse.json({ id: q.id, number: q.number })
  }

  return NextResponse.json({ error: 'Azione sconosciuta' }, { status: 400 })
}
