import { clients, editorialPosts, socialAnalytics } from '@/lib/db'
import { EditorialeBoard } from '@/components/ui/editoriale-board'

export default function EditorialePage() {
  const allClients = clients.getAll()
  const allPosts = editorialPosts.getAll()

  // Metriche per tutti i clienti
  const allMetrics: Record<string, ReturnType<typeof socialAnalytics.getClientMetrics>> = {}
  for (const c of allClients) {
    allMetrics[c.id] = socialAnalytics.getClientMetrics(c.id)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-3 py-2 sm:px-4">
      <EditorialeBoard clients={allClients} initialPosts={allPosts} initialMetrics={allMetrics} />
    </div>
  )
}
