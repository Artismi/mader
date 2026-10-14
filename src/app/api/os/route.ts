import { NextResponse } from 'next/server'
import { generateTextWith } from '@/lib/ai/model-registry'
import { messages, quotes } from '@/lib/db'
import { runAction } from '@/lib/kernel'
import { clientOfRef, getList, getNode, linkOrigin, quoteFor, search } from '@/lib/os/graph'
import { googleStatus } from '@/lib/google/auth'
import { sendMail } from '@/lib/google/gmail'
import { getProfile, pdfName, quotePdf, setProfile } from '@/lib/finance/quote-pdf'
import { archiveQuotePdf } from '@/lib/finance/quote-drive'
import { upcomingEvents } from '@/lib/google/calendar'

/**
 * API unica dello spazio di lavoro circolare.
 * GET  ?list=oggi | ?ref=mail:id | ?q=testo | ?quote=clientId
 * POST { action: 'reply', ref, text } → invia via Gmail e segna come risposto
 * POST { action: 'draft', ref }       → bozza scritta dall'AI (solo su richiesta esplicita)
 * POST { action: 'quote-send', ref, to, subject, text } → PDF del preventivo allegato e inviato via Gmail
 * POST { action: 'quote-drive', ref } → copia del PDF nella cartella documenti del cliente su Drive
 * POST { action: 'quote-status' | 'quote-items' | 'quote-invoice' | 'profile', … }
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
    if (u.searchParams.has('profile')) return NextResponse.json(getProfile())
    if (u.searchParams.has('quote')) return NextResponse.json(quoteFor(u.searchParams.get('quote') || undefined, u.searchParams.get('from') || undefined))
    return NextResponse.json({ error: 'Parametro mancante' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

const findMail = (ref: string) => messages.getAll({ limit: 1000 }).find(m => `mail:${m.id}` === ref)
type Item = { desc: string; qty: number; unit_price: number }
const cleanItems = (raw: unknown): Item[] => (Array.isArray(raw) ? raw : [])
  .map((i: Partial<Item>) => ({ desc: String(i.desc ?? '').trim(), qty: Number(i.qty) || 1, unit_price: Number(i.unit_price) || 0 }))
  .filter(i => i.desc)
const totalOf = (items: Item[]) => items.reduce((s, i) => s + i.qty * i.unit_price, 0)
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
    const plain = (m.content || '').replace(/<[^>]+>/g, ' ').slice(0, 4000)
    try {
      const { text } = await generateTextWith({ task: 'general', preferisci: 'leggero' }, {
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
    // stessa azione del pulsante e dell'assistente (nucleo, K1)
    const r = await runAction<{ id: string }>('task.create', { title, clientId: client?.id, category: 'general', deadlinePattern: body.deadline ?? undefined }, { actor: 'user', origin: body.fromRef })
    if (!r.ok) return NextResponse.json({ error: r.errors.join(' ') }, { status: 400 })
    if (body.fromRef) linkOrigin(body.fromRef, 'task', r.output.id)
    return NextResponse.json({ ref: `task:${r.output.id}` })
  }

  if (body.action === 'done') {
    const r = await runAction('task.set_status', { taskId: String(body.ref ?? ''), newStatus: 'done' }, { actor: 'user' })
    if (!r.ok) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
    return NextResponse.json({ ok: true })
  }

  // Un contenuto social avanza di un passo (idea → bozza → approvato → programmato → pubblicato)
  if (body.action === 'post-status') {
    const allowed = ['bozza', 'approvato', 'programmato', 'pubblicato']
    if (!allowed.includes(body.status)) return NextResponse.json({ error: 'Stato non valido' }, { status: 400 })
    const r = await runAction('post.set_status', { ref: String(body.ref ?? ''), status: body.status }, { actor: 'user' })
    if (!r.ok) return NextResponse.json({ error: 'Contenuto non trovato' }, { status: 404 })
    return NextResponse.json({ ok: true })
  }

  // Preventivo in bozza, collegato al cliente del nodo da cui nasce
  if (body.action === 'quote') {
    const client = body.fromRef ? clientOfRef(body.fromRef) : undefined
    const items = cleanItems(body.items)
    if (!items.length) return NextResponse.json({ error: 'Aggiungi almeno una voce' }, { status: 400 })
    const q = quotes.create({
      client_id: client?.id, client_name: client?.name ?? body.clientName ?? 'Senza cliente', title: String(body.title ?? 'Preventivo'),
      number: quotes.nextNumber('preventivo'), type: 'preventivo', status: 'bozza', items, total: totalOf(items),
      issued_at: new Date().toISOString().split('T')[0],
    })
    if (body.fromRef) linkOrigin(body.fromRef, 'quote', q.id)
    return NextResponse.json({ id: q.id, number: q.number, ref: `quote:${q.id}` })
  }

  // ───── preventivo come nodo: voci, stato, invio, fattura ─────
  const q = String(body.ref ?? '').startsWith('quote:') ? quotes.getById(body.ref.slice(6)) : undefined

  if (body.action === 'quote-items') {
    if (!q) return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 })
    if (q.status !== 'bozza') return NextResponse.json({ error: 'Si modifica solo finché è in bozza' }, { status: 400 })
    const items = cleanItems(body.items)
    if (!items.length) return NextResponse.json({ error: 'Aggiungi almeno una voce' }, { status: 400 })
    quotes.update(q.id, { items, total: totalOf(items), title: String(body.title ?? q.title).trim() || q.title, notes: body.notes ?? q.notes })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'quote-status') {
    if (!q) return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 })
    if (!['bozza', 'inviato', 'accettato', 'rifiutato'].includes(body.status)) return NextResponse.json({ error: 'Stato non valido' }, { status: 400 })
    quotes.update(q.id, { status: body.status })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'quote-invoice') {
    if (!q) return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 })
    if (q.status !== 'accettato') return NextResponse.json({ error: 'La fattura nasce da un preventivo accettato' }, { status: 400 })
    const f = quotes.convertToInvoice(q.id)
    if (!f) return NextResponse.json({ error: 'Fattura non creata' }, { status: 500 })
    linkOrigin(`quote:${q.id}`, 'quote', f.id)
    return NextResponse.json({ ref: `quote:${f.id}`, number: f.number })
  }

  if (body.action === 'quote-send') {
    if (!q) return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 })
    const to = String(body.to ?? '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ error: 'Indirizzo email non valido' }, { status: 400 })
    if (!String(body.text ?? '').trim()) return NextResponse.json({ error: 'Scrivi due righe di accompagnamento' }, { status: 400 })
    const pdf = await quotePdf(q)
    try {
      const sent = await sendMail({
        to, subject: String(body.subject ?? '').trim() || `${q.type === 'fattura' ? 'Fattura' : 'Preventivo'} ${q.number} · ${q.title}`,
        htmlBody: toHtml(body.text), attachments: [{ filename: pdfName(q), mimeType: 'application/pdf', data: pdf }],
      })
      quotes.update(q.id, { status: q.status === 'bozza' ? 'inviato' : q.status, gmail_thread_id: sent.threadId, issued_at: q.issued_at ?? new Date().toISOString().split('T')[0] })
    } catch (e) {
      return NextResponse.json({ error: `Invio non riuscito: ${(e as Error).message}` }, { status: 502 })
    }
    // la copia su Drive non deve mai bloccare un invio già fatto
    const drive = await archiveQuotePdf(q, pdf).then(() => true, () => false)
    return NextResponse.json({ ok: true, drive })
  }

  if (body.action === 'quote-drive') {
    if (!q) return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 })
    try {
      return NextResponse.json({ url: await archiveQuotePdf(q, await quotePdf(q)) })
    } catch (e) {
      return NextResponse.json({ error: `Drive non raggiungibile: ${(e as Error).message}` }, { status: 502 })
    }
  }

  if (body.action === 'profile') {
    setProfile({ name: String(body.name ?? ''), details: String(body.details ?? '') })
    return NextResponse.json(getProfile())
  }

  return NextResponse.json({ error: 'Azione sconosciuta' }, { status: 400 })
}
