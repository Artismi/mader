import { clients, designProjects } from '@/lib/db'
import { DesignWindow } from '@/components/ui/design-window'
import { StudioReturn } from '@/components/os/StudioReturn'

export const metadata = { title: 'Studio · Creative OS' }

/** Il canvas a tutto schermo dentro il guscio: il design scelto si apre per primo */
export default async function OsStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const all = designProjects.getAll()
  const ordered = [...all.filter(p => p.id === id), ...all.filter(p => p.id !== id)]
  return (
    <div className="fixed inset-0 flex flex-col bg-[#0d0d0d]">
      <DesignWindow clients={clients.getAll('cliente')} designProjects={ordered} />
      <StudioReturn />
    </div>
  )
}
