import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Users, FolderOpen, Mail, Tag, Landmark, Briefcase, Plus, ChevronRight } from 'lucide-react'
import { clients, tasks } from '@/lib/db'
import { NuovoClienteModal } from '@/components/ui/nuovo-cliente-modal'
import { VaultEditor } from '@/components/ui/vault-editor'
import { EditFigjamBtn } from '@/components/ui/edit-figjam-btn'
import { cn } from '@/lib/utils'

export default function ClientiPage() {
  const allClients = clients.getAll()
  const allTasks = tasks.getAll({ status: 'todo' })

  const processClient = (c: any) => ({
    ...c,
    taskCount: allTasks.filter(t => t.client_id === c.id).length,
  })

  const clienti = allClients.filter(c => c.category === 'cliente' || !c.category).map(processClient)
  const bandi = allClients.filter(c => c.category === 'bando').map(processClient)

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide">
      <div className="cos-page">
        
        {/* Header Section */}
        <PageHeader
          kicker="Business"
          title="Clienti e bandi"
          lead="Chi segui, cosa sai di loro e i bandi aperti."
          actions={<NuovoClienteModal />}
        />

        <div className="grid grid-cols-1 gap-14">
          
          {/* FOLDER: CLIENTI */}
          <section className="space-y-6">
            <div className="cos-section-title border-b border-line pb-3">
              <h2 className="flex items-center gap-2.5 font-display text-[23px] font-bold tracking-[-0.02em] text-ink"><Users className="h-5 w-5 text-ink-3" aria-hidden /> Clienti</h2>
              <span className="font-mono text-xs text-ink-3">{clienti.length}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {clienti.length === 0 ? (
                <EmptyState className="lg:col-span-2" icon={<Users className="h-5 w-5" />} title="Nessun cliente ancora">Aggiungi il primo con «Nuovo cliente».</EmptyState>
              ) : (
                clienti.map(client => <ClientCard key={client.id} client={client} color="sky" />)
              )}
            </div>
          </section>

          {/* FOLDER: BANDI */}
          <section className="space-y-6">
            <div className="cos-section-title border-b border-line pb-3">
              <h2 className="flex items-center gap-2.5 font-display text-[23px] font-bold tracking-[-0.02em] text-ink"><Landmark className="h-5 w-5 text-ink-3" aria-hidden /> Bandi</h2>
              <span className="font-mono text-xs text-ink-3">{bandi.length}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {bandi.length === 0 ? (
                <EmptyState className="lg:col-span-2" icon={<Landmark className="h-5 w-5" />} title="Nessun bando aperto">Quando ne segui uno, aggiungilo come cliente di tipo bando.</EmptyState>
              ) : (
                bandi.map(client => <ClientCard key={client.id} client={client} color="amber" />)
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

function ClientCard({ client, color }: { client: any; color: 'sky' | 'amber' }) {
  const colorMap = {
    sky: {
      bg: 'bg-sky-500/5',
      border: 'border-sky-500/10',
      accent: 'bg-sunk text-ink',
      icon: 'text-sky-500/40',
      hover: 'hover:border-sky-500/30'
    },
    amber: {
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/10',
      accent: 'bg-amber-100 text-amber-700',
      icon: 'text-amber-500/40',
      hover: 'hover:border-amber-500/30'
    }
  }
  const theme = colorMap[color]

  return (
    <div className={cn(
      "cos-card cos-crop group flex flex-col"
    )}>
      <div className="p-6 space-y-4">
        {/* Card Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-full font-display text-lg font-bold", theme.accent)}>
              {client.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-display text-xl font-bold leading-tight tracking-[-0.015em] text-ink">{client.name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {client.email && (
                  <span className="flex items-center gap-1.5 text-[13px] text-ink-3">
                    <Mail className="w-3 h-3" /> {client.email}
                  </span>
                )}
                {client.sector && (
                  <span className="flex items-center gap-1.5 text-[13px] text-ink-3">
                    <Tag className="w-3 h-3" /> {client.sector}
                  </span>
                )}
              </div>
            </div>
          </div>
          {client.taskCount > 0 && (
            <div className="flex flex-col items-end">
              <span className="cos-badge is-hot">
                {client.taskCount} Attivi
              </span>
            </div>
          )}
        </div>

         {/* Resources Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {client.drive_folder_id && (
            <ResourceLink href={`https://drive.google.com/drive/folders/${client.drive_folder_id}`} icon={<FolderOpen className="w-3 h-3" />} label="Drive" />
          )}
          {client.canva_brand_kit_id && (
            <ResourceLink href={`https://www.canva.com/brand/${client.canva_brand_kit_id}`} icon={<span>✦</span>} label="Brand Kit" />
          )}
          
          <EditFigjamBtn clientId={client.id} initialId={client.figjam_board_id} />
          
        </div>
      </div>

      {/* Mini Vault / Notes */}
      <div className="mt-auto border-t border-dashed border-line px-6 pb-6 pt-4">
         <div className="flex items-center justify-between mb-3">
            <span className="cos-kicker">Vault del progetto</span>
            <ChevronRight className="h-4 w-4 text-ink-3 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
         </div>
         <div className="overflow-hidden rounded-[20px] shadow-[inset_0_0_0_1px_var(--cos-line)]">
            <VaultEditor path={`clienti/${client.name.toLowerCase().replace(/\s+/g, '-')}-handbook.md`} />
         </div>
      </div>
    </div>
  )
}

function ResourceLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="cos-btn cos-btn-secondary cos-btn-sm"
    >
      {icon} {label}
    </a>
  )
}
