import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { messages } from '@/lib/db'
import { getList, getNode, quoteFor, search } from '@/lib/os/graph'

/**
 * API unica dello spazio di lavoro circolare.
 * GET  ?list=oggi | ?ref=mail:id | ?q=testo | ?quote=clientId
 * POST { action: 'reply', ref, text } → invia via Gmail e segna come risposto
 * POST { action: 'draft', ref }       → bozza scritta dall'AI (solo su richiesta esplicita)
 */
export async function GET(req: Request) {
  const u = new URL(req.url)
  try {
    if (u.searchParams.has('list')) return NextResponse.json(getList(u.searchParams.get('list')!))
    if (u.searchParams.has('ref')) {
      const n = getNode(u.searchParams.get('ref')!)
      return n ? NextResponse.json(n) : NextResponse.json({ error: 'Non trovato' }, { status: 404 })
    }
    if (u.searchParams.has('q')) return NextResponse.json(search(u.searchParams.get('q')!))
    if (u.searchParams.has('quote')) return NextResponse.json(quoteFor(u.searchParams.get('quote') || undefined))
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

  return NextResponse.json({ error: 'Azione sconosciuta' }, { status: 400 })
}
