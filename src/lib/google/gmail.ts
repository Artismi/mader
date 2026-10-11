/**
 * Invio mail con Gmail: corpo HTML, risposta in thread, allegati.
 * Solo lato server.
 */
import { google } from 'googleapis'
import { googleAuth } from './auth'

export interface Attachment { filename: string; mimeType: string; data: Uint8Array }
export interface MailPayload {
  to: string
  subject: string
  htmlBody: string
  replyToMessageIdHeader?: string   // Message-ID RFC 2822 (per il threading)
  threadId?: string                 // id del thread Gmail
  attachments?: Attachment[]
}

// RFC 2047: oggetti e nomi file con accenti restano leggibili
const encodeWord = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`)
const b64lines = (buf: Buffer) => buf.toString('base64').replace(/.{76}(?=.)/g, '$&\r\n')

export function buildMime(p: MailPayload): string {
  const head = [`To: ${p.to}`, `Subject: ${encodeWord(p.subject)}`, 'MIME-Version: 1.0']
  if (p.replyToMessageIdHeader) head.push(`In-Reply-To: ${p.replyToMessageIdHeader}`, `References: ${p.replyToMessageIdHeader}`)

  const html = ['Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64', '', b64lines(Buffer.from(p.htmlBody))]
  let lines: string[]
  if (!p.attachments?.length) lines = [...head, ...html]
  else {
    const b = `mix_${Date.now().toString(36)}`
    lines = [...head, `Content-Type: multipart/mixed; boundary="${b}"`, '', `--${b}`, ...html]
    for (const a of p.attachments) {
      const name = encodeWord(a.filename).replace(/"/g, '')
      lines.push(`--${b}`, `Content-Type: ${a.mimeType}; name="${name}"`, `Content-Disposition: attachment; filename="${name}"`,
        'Content-Transfer-Encoding: base64', '', b64lines(Buffer.from(a.data)))
    }
    lines.push(`--${b}--`)
  }
  return Buffer.from(lines.join('\r\n')).toString('base64url')
}

/** Invia; senza Google collegato lancia un errore leggibile */
export async function sendMail(p: MailPayload, fallbackAccessToken?: string) {
  const auth = googleAuth(fallbackAccessToken)
  if (!auth) throw new Error('Google non collegato: accedi di nuovo con Google')
  const gmail = google.gmail({ version: 'v1', auth })
  const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: buildMime(p), ...(p.threadId ? { threadId: p.threadId } : {}) } })
  return { id: res.data.id ?? undefined, threadId: res.data.threadId ?? undefined }
}
