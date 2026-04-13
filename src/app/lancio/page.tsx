import { messages, clients } from '@/lib/db'
import { LancioEditor } from '@/components/ui/lancio-editor'

interface Props {
  searchParams: Promise<{
    reply?: string
    subject?: string
    to?: string
    name?: string
  }>
}

export default async function LancioPage({ searchParams }: Props) {
  const params = await searchParams

  // Carica messaggio originale se è una risposta
  const replyMessage = params.reply
    ? messages.getAll({ channels: ['gmail'] }).find(m => m.id === params.reply)
    : null

  const client = replyMessage?.client_id
    ? clients.getById(replyMessage.client_id)
    : null

  const defaultTo = params.to || replyMessage?.sender_id || ''
  const defaultName = params.name || replyMessage?.sender_name || ''
  const defaultSubject = replyMessage
    ? `Re: ${replyMessage.subject || ''}`.replace(/^Re: Re: /i, 'Re: ')
    : (params.subject || '')

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-3 py-2 sm:px-4">
      <LancioEditor
        defaultTo={defaultTo}
        defaultName={defaultName}
        defaultSubject={defaultSubject}
        replyMessage={replyMessage ? {
          id: replyMessage.id,
          subject: replyMessage.subject || '',
          senderName: replyMessage.sender_name || '',
          senderEmail: replyMessage.sender_id || '',
          content: replyMessage.content,
          timestamp: replyMessage.timestamp,
          gmailId: (replyMessage.metadata as Record<string, string>).gmail_id || '',
          threadId: (replyMessage.metadata as Record<string, string>).thread_id || '',
          messageIdHeader: (replyMessage.metadata as Record<string, string>).message_id_header || '',
        } : null}
        client={client ? { id: client.id, name: client.name, sector: client.sector, figjam_board_id: client.figjam_board_id } : null}
        allClients={clients.getAll().map(c => ({ id: c.id, name: c.name, figjam_board_id: c.figjam_board_id }))}
      />
    </div>
  )
}
