'use client'

import { useState } from 'react'
import { FileText, LayoutTemplate, ExternalLink, Save, Download, Loader2, ChevronDown } from 'lucide-react'

interface Client {
    id: string
    name: string
    figjam_board_id: string | null
}

const DOC_TYPES = [
    { value: 'bando', label: 'Bando / Progetto' },
    { value: 'proposta', label: 'Proposta commerciale' },
    { value: 'articolo', label: 'Articolo / Blog' },
    { value: 'script', label: 'Script video' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'report', label: 'Report' },
    { value: 'altro', label: 'Altro' },
]

interface Props {
    clients: Client[]
}

export function DesignWindow({ clients }: Props) {
    const [mode, setMode] = useState<'testo' | 'figjam'>('testo')
    const [docType, setDocType] = useState('bando')
    const [selectedClientId, setSelectedClientId] = useState('')
    const [content, setContent] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const selectedClient = clients.find(c => c.id === selectedClientId)

    const handleExportDoc = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/drive/create-doc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `${DOC_TYPES.find(d => d.value === docType)?.label || 'Documento'} — ${selectedClient?.name || 'Senza cliente'}`,
                    content,
                    clientId: selectedClientId || null,
                    folder: 'testi',
                }),
            })
            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-gray-50/50">
                {/* Mode tabs */}
                <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                    <button
                        onClick={() => setMode('testo')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${mode === 'testo' ? 'bg-white text-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <FileText className="w-3.5 h-3.5" /> Testo
                    </button>
                    <button
                        onClick={() => setMode('figjam')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${mode === 'figjam' ? 'bg-white text-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <LayoutTemplate className="w-3.5 h-3.5" /> Canvas
                    </button>
                </div>

                {/* Doc type */}
                {mode === 'testo' && (
                    <div className="relative">
                        <select
                            value={docType}
                            onChange={e => setDocType(e.target.value)}
                            className="appearance-none border border-border rounded-lg pl-3 pr-7 py-1.5 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 bg-white cursor-pointer"
                        >
                            {DOC_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-primary/40 pointer-events-none" />
                    </div>
                )}

                {/* Cliente */}
                <div className="relative">
                    <select
                        value={selectedClientId}
                        onChange={e => setSelectedClientId(e.target.value)}
                        className="appearance-none border border-border rounded-lg pl-3 pr-7 py-1.5 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 bg-white cursor-pointer"
                    >
                        <option value="">— Nessun cliente —</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-primary/40 pointer-events-none" />
                </div>

                <div className="flex-1" />

                {/* Actions */}
                {mode === 'testo' && (
                    <button
                        onClick={handleExportDoc}
                        disabled={!content.trim() || saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent/90 transition-colors disabled:opacity-40"
                    >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {saved ? 'Salvato su Drive ✓' : 'Esporta su Drive'}
                    </button>
                )}

                {mode === 'figjam' && selectedClient?.figjam_board_id && (
                    <a
                        href={`https://www.figma.com/board/${selectedClient.figjam_board_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-primary hover:bg-gray-50 transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" /> Apri in FigJam
                    </a>
                )}
            </div>

            {/* Content area */}
            {mode === 'testo' ? (
                <div className="flex-1 overflow-hidden">
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder={`Inizia a scrivere il tuo ${DOC_TYPES.find(d => d.value === docType)?.label?.toLowerCase() || 'documento'}...\n\nPuoi chiedere al Co-Pilot di:\n• Generare la struttura completa\n• Scrivere sezioni specifiche\n• Proporre 3 varianti di apertura\n• Adattare il tono per una piattaforma specifica`}
                        className="w-full h-full resize-none p-6 text-sm text-primary leading-relaxed focus:outline-none font-serif placeholder:text-primary/25 placeholder:font-sans"
                    />
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-primary/40">
                    {selectedClient?.figjam_board_id ? (
                        <div className="text-center space-y-3">
                            <LayoutTemplate className="w-12 h-12 mx-auto opacity-20" />
                            <p className="text-sm font-medium">Board FigJam di {selectedClient.name}</p>
                            <a
                                href={`https://www.figma.com/board/${selectedClient.figjam_board_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" /> Apri FigJam in una nuova scheda
                            </a>
                            <p className="text-xs text-primary/30 max-w-xs">
                                FigJam si apre nella scheda del browser. L'estensione Chrome mostra il contesto attivo mentre lavori.
                            </p>
                        </div>
                    ) : (
                        <div className="text-center space-y-3">
                            <LayoutTemplate className="w-12 h-12 mx-auto opacity-20" />
                            <p className="text-sm">
                                {selectedClientId
                                    ? 'Nessun board FigJam collegato a questo cliente.'
                                    : 'Seleziona un cliente per vedere il suo board FigJam.'}
                            </p>
                            {selectedClientId && (
                                <p className="text-xs text-primary/30 max-w-xs">
                                    Aggiungi l'ID del board FigJam nelle impostazioni del cliente.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
