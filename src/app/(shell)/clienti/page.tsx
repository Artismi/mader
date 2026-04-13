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
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide pb-6">
      <div className="max-w-7xl mx-auto space-y-12 py-8 px-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white">Business.</h1>
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-white/20">Gestione Clienti e Bandi Attivi</p>
          </div>
          <NuovoClienteModal />
        </div>

        <div className="grid grid-cols-1 gap-16">
          
          {/* FOLDER: CLIENTI */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 shadow-sm">
                <Users className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-widest text-white/80">[CLIENTI]</h2>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest leading-none mt-0.5">{clienti.length} Entità Identificate</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {clienti.length === 0 ? (
                <p className="text-xs text-white/10 italic py-4">Nessun cliente in questa cartella.</p>
              ) : (
                clienti.map(client => <ClientCard key={client.id} client={client} color="sky" />)
              )}
            </div>
          </section>

          {/* FOLDER: BANDI */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-sm">
                <Landmark className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-widest text-white/80">[BANDI]</h2>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest leading-none mt-0.5">{bandi.length} Opportunità in Corso</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {bandi.length === 0 ? (
                <p className="text-xs text-white/10 italic py-4">Nessun bando in questa cartella.</p>
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
      accent: 'bg-sky-500/20 text-sky-300',
      icon: 'text-sky-500/40',
      hover: 'hover:border-sky-500/30'
    },
    amber: {
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/10',
      accent: 'bg-amber-500/20 text-amber-300',
      icon: 'text-amber-500/40',
      hover: 'hover:border-amber-500/30'
    }
  }
  const theme = colorMap[color]

  return (
    <div className={cn(
      "group relative flex flex-col rounded-2xl border bg-[#0a0a0a] transition-all duration-300 overflow-hidden",
      theme.border, theme.hover
    )}>
      <div className="p-6 space-y-4">
        {/* Card Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shadow-inner", theme.accent)}>
              {client.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-black text-white/90 leading-tight group-hover:text-white transition-colors">{client.name}</h3>
              <div className="flex items-center gap-3 mt-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                {client.email && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
                    <Mail className="w-3 h-3" /> {client.email}
                  </span>
                )}
                {client.sector && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
                    <Tag className="w-3 h-3" /> {client.sector}
                  </span>
                )}
              </div>
            </div>
          </div>
          {client.taskCount > 0 && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
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
      <div className="mt-auto px-6 pb-6 pt-2 border-t border-white/[0.03] bg-white/[0.01]">
         <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/10">Project Vault</span>
            <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-white/30 transition-all" />
         </div>
         <div className="rounded-xl overflow-hidden border border-white/5 bg-black/40">
            <VaultEditor clientId={client.id} initialContent={client.vault_md_content} />
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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[9px] font-black uppercase tracking-widest text-white/40 hover:bg-white/[0.08] hover:text-white/80 transition-all"
    >
      {icon} {label}
    </a>
  )
}
