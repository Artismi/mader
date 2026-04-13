'use server'

import { clients, designProjects } from '@/lib/db'
import { DesignWindow } from '@/components/ui/design-window'

export default async function ProgettazionePage() {
  const allClients    = clients.getAll('cliente')
  const allProjects   = designProjects.getAll()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DesignWindow clients={allClients} designProjects={allProjects} />
    </div>
  )
}
