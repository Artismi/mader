import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { tokens, messages } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function extractBody(payload: { mimeType?: string | null; body?: { data?: string | null }; parts?: unknown[] } | undefined): { html: string; text: string } {
  if (!payload) return { html: '', text: '' }

  let html = ''
  let text = ''

  if (payload.mimeType === 'text/html' && payload.body?.data) {
    html = decodeBase64(payload.body.data)
  } else if (payload.mimeType === 'text/plain' && payload.body?.data) {
    text = decodeBase64(payload.body.data)
  }

  if (payload.parts) {
    for (const part of payload.parts as typeof payload[]) {
      const sub = extractBody(part)
      if (sub.html) html = sub.html
      if (sub.text && !text) text = sub.text
    }
  }

  return { html, text }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
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

    // Cerca il gmail_id nei metadata
    const allMsgs = messages.getAll({ channels: ['gmail'] })
    const localMsg = allMsgs.find(m => (m.metadata as Record<string, string>).gmail_id === id || m.id === id)
    const gmailId = localMsg ? (localMsg.metadata as Record<string, string>).gmail_id || id : id

    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: gmailId,
      format: 'full',
    })

    const { html, text } = extractBody(detail.data.payload as Parameters<typeof extractBody>[0])

    // Segna come letto nel DB locale se aperto
    if (localMsg) {
      messages.markRead(localMsg.id)
    }

    return NextResponse.json({ html, text, snippet: detail.data.snippet })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
