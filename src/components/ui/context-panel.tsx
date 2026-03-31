'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, ChevronDown, X, Sparkles, FolderOpen, FileText, Loader2, Info } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Client {
    id: string
    name: string
    drive_folder_id: string | null
    drive_progetti_id: string | null
    drive_asset_id: string | null
    drive_documenti_id: string | null
}

interface DriveFile {
    id: string
    name: string
    mimeType: string
    modifiedTime: string
    webViewLink: string
}

interface ActiveFile {
    id: string
    name: string
    webViewLink: string
    instructions: string
    source?: string // nome cliente se cross-progetto
}

interface Props {
    onContextChange?: (context: {
        clientId?: string
        clientName?: string
        files: ActiveFile[]
    }) => void
}

const FOLDER_TABS = [
    { key: 'progetti', label: 'Progetti' },
    { key: 'asset', label: 'Asset' },
    { key: 'documenti', label: 'Documenti' },
] as const

// ─── Componente ────────────────────────────────────────────────────────────────

export function ContextPanel({ onContextChange }: Props) {
    const [clients, setClients] = useState<Client[]>([])
    const [activeClient, setActiveClient] = useState<Client | null>(null)
    const [clientOpen, setClientOpen] = useState(false)

    // Drive file browser
    const [folderTab, setFolderTab] = useState<'progetti' | 'asset' | 'documenti'>('progetti')
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
    const [driveLoading, setDriveLoading] = useState(false)
    const [driveError, setDriveError] = useState('')
    const [fileBrowserOpen, setFileBrowserOpen] = useState(false)

    // Contesto attivo
    const [activeFiles, setActiveFiles] = useState<ActiveFile[]>([])
    const [instructionPopup, setInstructionPopup] = useState<string | null>(null) // fileId

    // ─── Load clients ─────────────────────────────────────────────────────────

    useEffect(() => {
        const supabase = createClient()
        supabase
            .from('clients')
            .select('id, name, drive_folder_id, drive_progetti_id, drive_asset_id, drive_documenti_id')
            .order('name')
            .then(({ data }) => setClients(data || []))
    }, [])

    // ─── Notify parent ───────────────────────────────────────────────────────

    useEffect(() => {
        onContextChange?.({
            clientId: activeClient?.id,
            clientName: activeClient?.name,
            files: activeFiles,
        })
    }, [activeClient, activeFiles])

    // ─── Load Drive files ─────────────────────────────────────────────────────

    const loadDriveFiles = useCallback(async (client: Client, folder: 'progetti' | 'asset' | 'documenti') => {
        const folderId =
            folder === 'progetti' ? client.drive_progetti_id :
                folder === 'asset' ? client.drive_asset_id :
                    client.drive_documenti_id

        if (!folderId) {
            setDriveFiles([])
            setDriveError('Cartella Drive non configurata. Ricrea il vault dal pannello Clienti.')
            return
        }

        setDriveLoading(true)
        setDriveError('')
        try {
            const res = await fetch(`/api/drive/files?folderId=${folderId}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Errore caricamento file')
            setDriveFiles(data.files || [])
        } catch (err) {
            setDriveError(err instanceof Error ? err.message : 'Errore')
            setDriveFiles([])
        } finally {
            setDriveLoading(false)
        }
    }, [])

    const selectClient = (client: Client | null) => {
        setActiveClient(client)
        setClientOpen(false)
        setDriveFiles([])
        setDriveError('')
        setFileBrowserOpen(false)
        if (client) {
            setFileBrowserOpen(true)
            loadDriveFiles(client, folderTab)
        }
    }

    const switchFolder = (tab: typeof folderTab) => {
        setFolderTab(tab)
        if (activeClient) loadDriveFiles(activeClient, tab)
    }

    // ─── Gestione file attivi ─────────────────────────────────────────────────

    const isFileActive = (fileId: string) => activeFiles.some(f => f.id === fileId)

    const toggleFile = (file: DriveFile) => {
        if (isFileActive(file.id)) {
            setActiveFiles(prev => prev.filter(f => f.id !== file.id))
            if (instructionPopup === file.id) setInstructionPopup(null)
        } else {
            setActiveFiles(prev => [...prev, {
                id: file.id,
                name: file.name,
                webViewLink: file.webViewLink,
                instructions: '',
                source: activeClient?.name,
            }])
        }
    }

    const updateInstructions = (fileId: string, instructions: string) => {
        setActiveFiles(prev => prev.map(f => f.id === fileId ? { ...f, instructions } : f))
    }

    const removeFile = (fileId: string) => {
        setActiveFiles(prev => prev.filter(f => f.id !== fileId))
        if (instructionPopup === fileId) setInstructionPopup(null)
    }

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-3">

            {/* ─ Selettore cliente ─ */}
            <div className="relative">
                <button
                    onClick={() => setClientOpen(!clientOpen)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white/60 hover:bg-white/[0.06] transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-white/30" />
                        <span className={activeClient ? 'text-white/80 font-semibold' : ''}>
                            {activeClient?.name || 'Nessun soggetto'}
                        </span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${clientOpen ? 'rotate-180' : ''}`} />
                </button>

                {clientOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden max-h-52 overflow-y-auto scrollbar-hide">
                        <button
                            onClick={() => selectClient(null)}
                            className="w-full px-3 py-2 text-left text-xs text-white/40 hover:bg-white/5 transition-colors"
                        >
                            — Nessun soggetto —
                        </button>
                        {clients.map(c => (
                            <button
                                key={c.id}
                                onClick={() => selectClient(c)}
                                className={`w-full px-3 py-2 text-left text-xs transition-colors ${c.id === activeClient?.id
                                    ? 'bg-accent/15 text-accent'
                                    : 'text-white/60 hover:bg-white/5'
                                    }`}
                            >
                                {c.name}
                                {!c.drive_folder_id && (
                                    <span className="ml-2 text-[9px] text-white/20">· no vault</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ─ File browser Drive ─ */}
            {activeClient && (
                <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl overflow-hidden">
                    {/* Header browser */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                        <button
                            onClick={() => setFileBrowserOpen(!fileBrowserOpen)}
                            className="flex items-center gap-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider hover:text-white/60 transition-colors"
                        >
                            <FolderOpen className="w-3 h-3" />
                            Drive · {activeClient.name}
                        </button>
                    </div>

                    {fileBrowserOpen && (
                        <>
                            {/* Tab cartelle */}
                            <div className="flex border-b border-white/[0.06]">
                                {FOLDER_TABS.map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => switchFolder(tab.key)}
                                        className={`flex-1 py-1.5 text-[10px] font-semibold transition-colors ${folderTab === tab.key
                                            ? 'text-accent border-b border-accent'
                                            : 'text-white/30 hover:text-white/50'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Lista file */}
                            <div className="max-h-48 overflow-y-auto scrollbar-hide">
                                {driveLoading ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                                    </div>
                                ) : driveError ? (
                                    <div className="px-3 py-4 text-[10px] text-red-400/70 text-center">
                                        {driveError}
                                    </div>
                                ) : driveFiles.length === 0 ? (
                                    <div className="px-3 py-4 text-[10px] text-white/20 text-center italic">
                                        Nessun file in questa cartella
                                    </div>
                                ) : (
                                    driveFiles.map(file => {
                                        const active = isFileActive(file.id)
                                        return (
                                            <button
                                                key={file.id}
                                                onClick={() => toggleFile(file)}
                                                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${active
                                                    ? 'bg-accent/10 text-accent'
                                                    : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                                                    }`}
                                            >
                                                <FileText className="w-3 h-3 flex-shrink-0" />
                                                <span className="text-[10px] truncate">{file.name}</span>
                                                {active && (
                                                    <span className="ml-auto text-[9px] font-bold text-accent">✓</span>
                                                )}
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ─ File attivi con istruzioni pipeline ─ */}
            {activeFiles.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Contesto attivo ({activeFiles.length})
                    </p>
                    {activeFiles.map(file => (
                        <div key={file.id} className="relative">
                            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-accent/10 border border-accent/20 rounded-lg">
                                {/* Punto pipeline */}
                                <button
                                    onClick={() => setInstructionPopup(instructionPopup === file.id ? null : file.id)}
                                    title="Aggiungi istruzione per questo file"
                                    className={`w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 transition-colors ${file.instructions
                                        ? 'bg-accent border-accent'
                                        : 'border-accent/40 hover:border-accent'
                                        }`}
                                />
                                {/* Nome file */}
                                <a
                                    href={file.webViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-accent font-medium truncate flex-1 hover:underline"
                                    onClick={e => e.stopPropagation()}
                                >
                                    {file.name}
                                </a>
                                {/* Badge source cross-progetto */}
                                {file.source && file.source !== activeClient?.name && (
                                    <span className="text-[8px] px-1 bg-violet-500/20 text-violet-400 rounded-full">
                                        {file.source}
                                    </span>
                                )}
                                {/* Rimuovi */}
                                <button onClick={() => removeFile(file.id)} className="hover:text-red-400 text-accent/40 transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Popup istruzioni pipeline */}
                            {instructionPopup === file.id && (
                                <div className="mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg overflow-hidden shadow-xl z-30">
                                    <div className="flex items-center gap-1 px-2 pt-2 pb-1">
                                        <Info className="w-3 h-3 text-white/30" />
                                        <span className="text-[9px] text-white/30 uppercase tracking-wider">Istruzione pipeline</span>
                                    </div>
                                    <textarea
                                        autoFocus
                                        value={file.instructions}
                                        onChange={e => updateInstructions(file.id, e.target.value)}
                                        placeholder={`es. "usa solo i dati numerici"\n"questo è il tono da replicare, non il contenuto"`}
                                        className="w-full bg-transparent text-[10px] text-white/60 px-2 pb-2 resize-none focus:outline-none leading-relaxed placeholder:text-white/20"
                                        rows={3}
                                        onBlur={() => setInstructionPopup(null)}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ─ Sommario contesto attivo ─ */}
            {(activeClient || activeFiles.length > 0) && (
                <div className="flex items-center gap-1.5 text-[10px] text-white/25 pt-1">
                    <Sparkles className="w-3 h-3" />
                    <span>
                        {[
                            activeClient && `vault ${activeClient.name}`,
                            activeFiles.length > 0 && `${activeFiles.length} file`,
                        ].filter(Boolean).join(' + ')} in contesto
                    </span>
                </div>
            )}
        </div>
    )
}
