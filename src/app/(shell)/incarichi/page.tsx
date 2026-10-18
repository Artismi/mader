import { Search, Filter, MoreHorizontal } from "lucide-react";
import { tasks } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { NuovoIncaricoButton } from "@/components/ui/nuovo-incarico-button";

export default async function IncarichiPage() {
  const allTasks = tasks.getAll()

  const getBadgeStatus = (status: string, deadline?: string) => {
    const today = new Date().getTime()
    const tDeadline = deadline ? new Date(deadline).getTime() : null
    if (status === 'done') return <Badge variant="success">Completato</Badge>
    if (status === 'in_progress') return <Badge variant="warning">In Corso</Badge>
    if (tDeadline && tDeadline < today) return <Badge variant="destructive">In Ritardo</Badge>
    return <Badge variant="default">Da Iniziare</Badge>
  }

  const isLate = (task: { status: string; deadline?: string }) =>
    !!task.deadline && new Date(task.deadline).getTime() < new Date().getTime() && task.status !== 'done'

  return (
    <div className="cos-page">
      <PageHeader
        kicker={`${allTasks.length} ${allTasks.length === 1 ? 'incarico' : 'incarichi'}`}
        title="Incarichi"
        lead="Progetti attivi, scadenze e pianificazione."
        actions={<NuovoIncaricoButton />}
      />

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <Input type="text" leftIcon={<Search className="h-4 w-4" />} placeholder="Cerca per titolo o cliente…" aria-label="Cerca incarichi" />
        </div>
        <Button variant="ghost" size="sm" className="self-start sm:self-auto">
          <Filter className="h-4 w-4" />
          Filtri: nessuno
        </Button>
      </div>

      <section aria-label="Elenco incarichi">
        {allTasks.length === 0 ? (
          <EmptyState icon={<Search className="h-5 w-5" />} title="Ancora nessun incarico">
            Crea il primo con «Nuovo incarico»: lo ritrovi qui e nel guscio.
          </EmptyState>
        ) : (
          <ul role="list" className="-mx-3">
            {allTasks.map((task) => (
              <li key={task.id} className="group relative flex items-center gap-4 rounded-full px-3 py-2.5 transition-colors hover:bg-sunk">
                <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sunk font-display text-[13px] font-bold text-ink transition-colors group-hover:bg-paper">
                  {(task.client_name || task.title || '?').slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-auto">
                  <div className="flex items-center gap-x-3">
                    <h2 className="min-w-0 text-[15px] font-semibold leading-6 text-ink">
                      <a href={`/incarichi/${task.id}`} className="flex gap-x-2 focus-visible:outline-none">
                        <span className="truncate">{task.title}</span>
                        <span className="absolute inset-0 rounded-full group-has-[:focus-visible]:outline group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-offset-2 group-has-[:focus-visible]:outline-[var(--cos-hot-ink)]" />
                      </a>
                    </h2>
                    {getBadgeStatus(task.status, task.deadline)}
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-ink-3">
                    {task.client_name || 'Senza cliente'}<span aria-hidden> · </span><span className="font-mono text-[11px] uppercase tracking-[0.06em]">{task.type}</span>
                  </p>
                </div>
                <span className={`shrink-0 font-mono text-[12px] ${isLate(task) ? 'text-[var(--cos-err)]' : 'text-ink-3'}`}>
                  {task.deadline ? new Date(task.deadline).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : '—'}
                </span>
                <MoreHorizontal className="hidden h-5 w-5 shrink-0 text-ink-3 sm:block" aria-hidden />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
