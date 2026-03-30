'use client'

import { useState } from 'react'
import { Plus, FileText, Table, Loader2, ExternalLink, X } from 'lucide-react'

interface Client {
    id: string
    name: string
    drive_folder_id: string | null
    drive_progetti_id: string | null
    drive_asset_id: string | null
    drive_documenti_id: string | null
}

interface Props {
    clients: Client[]
    onCreated?: () => void
}

export function CreaDocumentoModal({ clients, onCreated }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<{ id: string; webViewLink: string } | null>(null)

    const [clientId, setClientId] = useState('')
    const [folder, setFolder] = useState<'progetti' | 'asset' | 'documenti' | 'root'>('progetti')
    const [name, setName] = useState('')
    const [type, setType] = useState<'doc' | 'sheet'>('doc')

    const selectedClient = clients.find(c => c.id === clientId)

    function getFolderId(): string | null {
        if (!selectedClient) return null
        if (folder === 'progetti') return selectedClient.drive_progetti_id
        if (folder === 'asset') return selectedClient.drive_asset_id
        if (folder === 'documenti') return selectedClient.drive_documenti_id
        return selectedClient.drive_folder_id
    }

    async function handleCreate() {
        if (!name.trim() || !clientId) return
        const folderId = getFolderId()
        if (!folderId) {
            setError('Cartella Drive non configurata per questo cliente. Ricrea il vault dal pannello Clienti.')
            return
        }

        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/drive/create-doc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), folderId, type }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Errore nella creazione')
            setResult({ id: data.id, webViewLink: data.webViewLink })
            onCreated?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore sconosciuto')
        } finally {
            setLoading(false)
        }
    }

    function handleClose() {
        setOpen(false)
        setResult(null)
        setError('')
        setName('')
        setClientId('')
        setFolder('progetti')
        setType('doc')
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
            >
                <Plus className="w-4 h-4" />
                Nuovo Documento
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-primary">Crea Documento</h2>
                            <button onClick={handleClose} className="text-primary/40 hover:text-primary transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {result ? (
                            <div className="space-y-4 text-center py-4">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <FileText className="w-6 h-6 text-green-600" />
                                </div>
                                <p className="font-semibold text-primary">Documento creato!</p>
                                <a
                                    href={result.webViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 text-accent text-sm hover:underline"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Apri su Google Drive
                                </a>
                                <button
                                    onClick={handleClose}
                                    className="w-full py-2 bg-gray-100 text-primary rounded-lg text-sm hover:bg-gray-200 transition-colors"
                                >
                                    Chiudi
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Client */}
                                <div>
                                    <label className="block text-xs font-semibold text-primary/50 uppercase tracking-wider mb-1.5">
                                        Cliente
                                    </label>
                                    <select
                                        value={clientId}
                                        onChange={e => setClientId(e.target.value)}
                                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                                    >
                                        <option value="">Seleziona cliente...</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Folder */}
                                <div>
                                    <label className="block text-xs font-semibold text-primary/50 uppercase tracking-wider mb-1.5">
                                        Cartella
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['progetti', 'documenti', 'asset', 'root'] as const).map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setFolder(f)}
                                                className={`py-2 px-3 rounded-lg text-sm border transition-colors ${
                                                    folder === f
                                                        ? 'bg-accent text-white border-accent'
                                                        : 'bg-white text-primary/70 border-border hover:border-accent/50'
                                                }`}
                                            >
                                                {f === 'root' ? 'Radice cliente' : f.charAt(0).toUpperCase() + f.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Type */}
                                <div>
                                    <label className="block text-xs font-semibold text-primary/50 uppercase tracking-wider mb-1.5">
                                        Tipo
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setType('doc')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm border transition-colors ${
                                                type === 'doc'
                                                    ? 'bg-accent text-white border-accent'
                                                    : 'bg-white text-primary/70 border-border hover:border-accent/50'
                                            }`}
                                        >
                                            <FileText className="w-4 h-4" />
                                            Google Doc
                                        </button>
                                        <button
                                            onClick={() => setType('sheet')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm border transition-colors ${
                                                type === 'sheet'
                                                    ? 'bg-green-600 text-white border-green-600'
                                                    : 'bg-white text-primary/70 border-border hover:border-green-500/50'
                                            }`}
                                        >
                                            <Table className="w-4 h-4" />
                                            Spreadsheet
                                        </button>
                                    </div>
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-primary/50 uppercase tracking-wider mb-1.5">
                                        Nome documento
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="es. Proposta commerciale Q2..."
                                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                    />
                                </div>

                                {error && (
                                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                                )}

                                <button
                                    onClick={handleCreate}
                                    disabled={loading || !name.trim() || !clientId}
                                    className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Creazione in corso...
                                        </>
                                    ) : (
                                        'Crea Documento'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
