import { Users, FolderOpen, Mail, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NuovoClienteModal } from "@/components/ui/nuovo-cliente-modal";
import { DriveFiles } from "@/components/ui/drive-files";
import { SetupVaultButton } from "@/components/ui/setup-vault-button";
import { VaultEditor } from "@/components/ui/vault-editor";

type Client = {
    id: string
    name: string
    email: string | null
    sector: string | null
    vault_path: string | null
    vault_md_content: string | null
    drive_folder_id: string | null
    canva_brand_kit_id: string | null
    figjam_board_id: string | null
    created_at: string
    taskCount: number
}

export default async function ClientiPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let clients: Client[] = [];

    if (user) {
        const { data } = await supabase
            .from('clients')
            .select('*')
            .order('name', { ascending: true });

        const raw = data || [];

        if (raw.length > 0) {
            const { data: taskCounts } = await supabase
                .from('tasks')
                .select('client_id')
                .in('client_id', raw.map((c: Client) => c.id))
                .neq('status', 'done');

            clients = raw.map((c: Client) => ({
                ...c,
                taskCount: taskCounts?.filter(t => t.client_id === c.id).length || 0
            }));
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Clienti</h1>
                    <p className="mt-2 text-sm text-primary/70">
                        Gestisci i tuoi clienti. Ogni cliente ha una cartella Drive dedicata.
                    </p>
                </div>
                <NuovoClienteModal />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {clients.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-primary/40">
                        <Users className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm italic">Nessun cliente ancora. Aggiungine uno per creare automaticamente la cartella su Drive.</p>
                    </div>
                ) : (
                    clients.map(client => (
                        <div key={client.id} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                            {/* Header cliente */}
                            <div className="p-6 border-b border-border">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                                            <span className="text-lg font-black text-accent">{client.name.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-primary text-lg leading-none">{client.name}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                {client.email && (
                                                    <span className="flex items-center gap-1 text-xs text-primary/40">
                                                        <Mail className="w-3 h-3" /> {client.email}
                                                    </span>
                                                )}
                                                {client.sector && (
                                                    <span className="flex items-center gap-1 text-xs text-primary/40">
                                                        <Tag className="w-3 h-3" /> {client.sector}
                                                    </span>
                                                )}
                                                {!client.email && !client.sector && (
                                                    <p className="text-xs text-primary/40">
                                                        Dal {new Date(client.created_at).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {client.taskCount > 0 && (
                                        <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
                                            {client.taskCount} task attivi
                                        </span>
                                    )}
                                </div>

                                {/* Link esterni */}
                                <div className="flex flex-wrap items-center gap-3 mt-3">
                                    {client.drive_folder_id && (
                                        <a href={`https://drive.google.com/drive/folders/${client.drive_folder_id}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-medium">
                                            <FolderOpen className="w-3.5 h-3.5" /> Drive
                                        </a>
                                    )}
                                    {client.canva_brand_kit_id && (
                                        <a href={`https://www.canva.com/brand/${client.canva_brand_kit_id}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-medium">
                                            ✦ Brand Kit Canva
                                        </a>
                                    )}
                                    {client.figjam_board_id && (
                                        <a href={`https://www.figma.com/board/${client.figjam_board_id}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-medium">
                                            ◈ FigJam
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Vault inline */}
                            <div className="p-5 border-b border-border">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary/30 mb-3">Vault</h4>
                                <VaultEditor clientId={client.id} initialContent={client.vault_md_content} />
                            </div>

                            {/* File Drive */}
                            {client.drive_folder_id ? (
                                <div className="p-5">
                                    <DriveFiles folderId={client.drive_folder_id} folderName={client.name} />
                                </div>
                            ) : (
                                <div className="p-5">
                                    <SetupVaultButton clientId={client.id} clientName={client.name} />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
