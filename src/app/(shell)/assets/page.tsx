import { createClient } from '@/lib/supabase/server'
import { FolderOpen, ExternalLink } from 'lucide-react'
import { DriveFiles } from '@/components/ui/drive-files'
import { CreaDocumentoModal } from '@/components/ui/crea-documento-modal'

export default async function AssetsPage() {
    const supabase = await createClient()

    const { data: clients } = await supabase
        .from('clients')
        .select('id, name, drive_folder_id, drive_progetti_id, drive_asset_id, drive_documenti_id, vault_path')
        .order('name')

    const clientsWithDrive = (clients || []).filter(c => c.drive_folder_id)
    const clientsWithoutDrive = (clients || []).filter(c => !c.drive_folder_id)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Asset Library</h1>
                    <p className="mt-1 text-sm text-primary/50">
                        File e documenti da Google Drive, organizzati per cliente.
                    </p>
                </div>
                {clients && clients.length > 0 && (
                    <CreaDocumentoModal clients={clientsWithDrive} />
                )}
            </div>

            {/* No clients at all */}
            {(!clients || clients.length === 0) && (
                <div className="flex flex-col items-center justify-center py-24 text-primary/30">
                    <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-base font-semibold">Nessun cliente ancora</p>
                    <p className="text-sm mt-1 text-primary/40 max-w-sm text-center">
                        Crea il tuo primo cliente dalla sezione Clienti per configurare il vault Drive.
                    </p>
                </div>
            )}

            {/* Clients with Drive */}
            {clientsWithDrive.length > 0 && (
                <div className="space-y-8">
                    {clientsWithDrive.map(client => (
                        <div key={client.id} className="bg-white rounded-2xl border border-border overflow-hidden">
                            {/* Client header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                                        <span className="text-sm font-bold text-accent">
                                            {client.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <h2 className="font-bold text-primary">{client.name}</h2>
                                </div>
                                {client.vault_path && (
                                    <a
                                        href={`https://drive.google.com/drive/search?q=${encodeURIComponent(client.vault_path)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs text-accent hover:underline"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Apri vault su Drive
                                    </a>
                                )}
                            </div>

                            {/* Subfolders grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                                {/* Progetti */}
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <FolderOpen className="w-4 h-4 text-blue-500" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-primary/50">Progetti</h3>
                                    </div>
                                    {client.drive_progetti_id ? (
                                        <DriveFiles
                                            folderId={client.drive_progetti_id}
                                            folderName="progetti"
                                        />
                                    ) : (
                                        <p className="text-xs text-primary/30 italic">Cartella non configurata</p>
                                    )}
                                </div>

                                {/* Asset */}
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <FolderOpen className="w-4 h-4 text-purple-500" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-primary/50">Asset</h3>
                                    </div>
                                    {client.drive_asset_id ? (
                                        <DriveFiles
                                            folderId={client.drive_asset_id}
                                            folderName="asset"
                                        />
                                    ) : (
                                        <p className="text-xs text-primary/30 italic">Cartella non configurata</p>
                                    )}
                                </div>

                                {/* Documenti */}
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <FolderOpen className="w-4 h-4 text-orange-500" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-primary/50">Documenti</h3>
                                    </div>
                                    {client.drive_documenti_id ? (
                                        <DriveFiles
                                            folderId={client.drive_documenti_id}
                                            folderName="documenti"
                                        />
                                    ) : (
                                        <p className="text-xs text-primary/30 italic">Cartella non configurata</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Clients without Drive vault */}
            {clientsWithoutDrive.length > 0 && (
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-primary/30 mb-3">
                        Clienti senza vault Drive
                    </h2>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                        {clientsWithoutDrive.map(c => (
                            <div key={c.id} className="flex items-center justify-between text-sm">
                                <span className="text-primary/70">{c.name}</span>
                                <a
                                    href="/clienti"
                                    className="text-xs text-accent hover:underline"
                                >
                                    Configura da Clienti →
                                </a>
                            </div>
                        ))}
                        <p className="text-xs text-amber-700 mt-2">
                            Entra in Clienti e usa "Crea Vault Drive" per collegare questi clienti a Google Drive.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
