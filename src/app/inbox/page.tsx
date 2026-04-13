import { messages, clients } from '@/lib/db'
import { InboxView } from '@/components/ui/inbox-view'

export default function InboxPage() {
  const initialMessages = messages.getAll({ channels: ['gmail'], limit: 100 })
  const allClients = clients.getAll()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-3 py-2 sm:px-4">
      <InboxView initialMessages={initialMessages} clients={allClients} />
    </div>
  )
}
