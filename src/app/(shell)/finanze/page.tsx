import { quotes, clients } from '@/lib/db'
import { QuotesBoard } from '@/components/ui/quotes-board'

export default function FinanzePage() {
  const allQuotes = quotes.getAll()
  const allClients = clients.getAll()
  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden px-3 py-2 sm:px-4">
      <QuotesBoard initialQuotes={allQuotes} clients={allClients} />
    </div>
  )
}
