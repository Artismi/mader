import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { tokens } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

interface SendPayload {
  to: string
  subject: string
  htmlBody: string
  replyToMessageIdHeader?: string  // RFC 2822 Message-ID header (per threading)
  threadId?: string                 // Gmail thread ID
}

function buildMimeMessage(payload: SendPayload): string {
  const lines = [
    `To: ${payload.to}`,
    `Subject: ${payload.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
  ]

  if (payload.replyToMessageIdHeader) {
    lines.push(`In-Reply-To: ${payload.replyToMessageIdHeader}`)
    lines.push(`References: ${payload.replyToMessageIdHeader}`)
  }

  lines.push('', payload.htmlBody)

  return Buffer.from(lines.join('\r\n')).toString('base64url')
}

export async function POST(req: Request) {
  try {
    const body: SendPayload = await req.json()
    const { to, subject, htmlBody, replyToMessageIdHeader, threadId } = body

    if (!to || !subject || !htmlBody) {
      return NextResponse.json({ error: 'Campi obbligatori: to, subject, htmlBody' }, { status: 400 })
    }

    let accessToken = tokens.get('google')?.provider_token
    if (!accessToken) {
      const supabase = await createClient()
      const { data: { session } } = await supabase.auth.getSession()
      accessToken = session?.provider_token ?? undefined
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Token Google non trovato' }, { status: 401 })
    }

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const raw = buildMimeMessage({ to, subject, htmlBody, replyToMessageIdHeader })

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
        ...(threadId ? { threadId } : {}),
      },
    })

    return NextResponse.json({ id: res.data.id, threadId: res.data.threadId })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Gmail send error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
