import { Users, FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NuovoClienteModal } from "@/components/ui/nuovo-cliente-modal";
import { DriveFiles } from "@/components/ui/drive-files";
import { SetupVaultButton } from "@/components/ui/setup-vault-button";

type Client = {
    id: string
    name: string
    vault_path: string | null
    drive_folder_id: string | null
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
                                            <Users className="w-5 h-5 text-accent" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-primary text-lg leading-none">{client.name}</h3>
                                            <p className="text-xs text-primary/40 mt-1">
                                                Dal {new Date(client.created_at).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    {client.taskCount > 0 && (
                                        <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
                                            {client.taskCount} task attivi
                                        </span>
                                    )}
                                </div>

                                {/* Drive link */}
                                {client.drive_folder_id && (
                                    <a
                                        href={`https://drive.google.com/drive/folders/${client.drive_folder_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-medium"
                                    >
                                        <FolderOpen className="w-3.5 h-3.5" />
                                        Apri cartella Drive
                                    </a>
                                )}
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
