import { NextResponse } from 'next/server'
import { sendMail, type MailPayload } from '@/lib/google/gmail'
import { googleAuth } from '@/lib/google/auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { to, subject, htmlBody, replyToMessageIdHeader, threadId }: MailPayload = await req.json()

    if (!to || !subject || !htmlBody) {
      return NextResponse.json({ error: 'Campi obbligatori: to, subject, htmlBody' }, { status: 400 })
    }

    // senza token in SQLite si prova con la sessione Supabase (vecchio login)
    let fallback: string | undefined
    if (!googleAuth()) {
      const supabase = await createClient()
      const { data: { session } } = await supabase.auth.getSession()
      fallback = session?.provider_token ?? undefined
      if (!fallback) return NextResponse.json({ error: 'Google non collegato: accedi di nuovo con Google' }, { status: 401 })
    }

    return NextResponse.json(await sendMail({ to, subject, htmlBody, replyToMessageIdHeader, threadId }, fallback))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Gmail send error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
