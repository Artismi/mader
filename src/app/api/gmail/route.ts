import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'
import { messages, clientChannels, tokens } from '@/lib/db'

function getGmailClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth: oauth2Client })
}

// GET /api/gmail — sincronizza le ultime 50 email da Gmail → SQLite e restituisce la lista
export async function GET() {
  try {
    // Token da SQLite (già persistito dopo il login)
    const tokenData = tokens.get('google')

    // Fallback: token da Supabase session
    let accessToken = tokenData?.provider_token
    if (!accessToken) {
      const supabase = await createClient()
      const { data: { session } } = await supabase.auth.getSession()
      accessToken = session?.provider_token ?? undefined
    }

    if (!accessToken) {
      return NextResponse.json({ messages: [], error: 'Token Google non trovato' })
    }

    const gmail = getGmailClient(accessToken)

    // Ultime 50 email in inbox
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: 50,
    })

    const gmailMessages = listRes.data.messages || []
    if (gmailMessages.length === 0) {
      return NextResponse.json({ messages: messages.getAll({ channels: ['gmail'] }) })
    }

    // Fetch metadata in parallelo (batch di 10 per non sovraccaricare)
    const batches: typeof gmailMessages[] = []
    for (let i = 0; i < gmailMessages.length; i += 10) {
      batches.push(gmailMessages.slice(i, i + 10))
    }

    for (const batch of batches) {
      await Promise.all(batch.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date', 'Message-ID'],
        })

        const headers = detail.data.payload?.headers || []
        const get = (name: string) => headers.find(h => h.name === name)?.value || ''

        const from = get('From')
        const emailMatch = from.match(/<(.+?)>/) || from.match(/(\S+@\S+)/)
        const senderEmail = emailMatch?.[1] || from
        const senderName = from.replace(/<.+>/, '').replace(/"/g, '').trim() || senderEmail

        const dateStr = get('Date')
        const timestamp = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString()

        const channel = clientChannels.getByHandle('gmail', senderEmail)
        const isUnread = (detail.data.labelIds || []).includes('UNREAD')

        messages.upsertFromGmail({
          gmail_id: msg.id!,
          channel: 'gmail',
          sender_id: senderEmail,
          sender_name: senderName,
          client_id: channel?.client_id,
          subject: get('Subject') || '(nessun oggetto)',
          content: detail.data.snippet || '',
          timestamp,
          read: !isUnread,
          replied: (detail.data.labelIds || []).includes('SENT'),
          metadata: {
            thread_id: detail.data.threadId || '',
            message_id_header: get('Message-ID'),
          },
        })
      }))
    }

    return NextResponse.json({ messages: messages.getAll({ channels: ['gmail'] }) })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Gmail sync error:', msg)
    // Restituisce i messaggi già in cache anche se il sync fallisce
    return NextResponse.json({ messages: messages.getAll({ channels: ['gmail'] }), error: msg })
  }
}
