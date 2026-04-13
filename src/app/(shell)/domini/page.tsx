import { domains } from '@/lib/db'
import { DominiBoard } from '@/components/ui/domini-board'

export default function DominiPage() {
  const allDomains = domains.getAll()
  return <DominiBoard initialDomains={allDomains} />
}
