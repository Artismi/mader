'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, ChevronDown, X, Sparkles } from 'lucide-react'

interface Client {
    id: string
    name: string
}

interface ActiveFile {
    path: string
    label: string
    instructions: string
}

interface Props {
    onContextChange?: (context: { clientId?: string; clientName?: string; files: ActiveFile[] }) => void
}

export function ContextPanel({ onContextChange }: Props) {
    const [clients, setClients] = useState<Client[]>([])
    const [activeClientId, setActiveClientId] = useState('')
    const [activeClientName, setActiveClientName] = useState('')
    const [activeFiles, setActiveFiles] = useState<ActiveFile[]>([])
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const supabase = createClient()
        supabase.from('clients').select('id, name').order('name').then(({ data }) => {
            setClients(data || [])
        })
    }, [])

    useEffect(() => {
        onContextChange?.({
            clientId: activeClientId || undefined,
            clientName: activeClientName || undefined,
            files: activeFiles,
        })
    }, [activeClientId, activeClientName, activeFiles])

    const selectClient = (client: Client | null) => {
        if (!client) {
            setActiveClientId('')
            setActiveClientName('')
        } else {
            setActiveClientId(client.id)
            setActiveClientName(client.name)
        }
        setOpen(false)
    }

    const removeFile = (path: string) => {
        setActiveFiles(prev => prev.filter(f => f.path !== path))
    }

    return (
        <div className="space-y-2">
            {/* Soggetto attivo */}
            <div className="relative">
                <button
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white/60 hover:bg-white/[0.06] transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-white/30" />
                        {activeClientName || 'Nessun soggetto'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden">
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
                                className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                                    c.id === activeClientId
                                        ? 'bg-accent/15 text-accent'
                                        : 'text-white/60 hover:bg-white/5'
                                }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* File attivi */}
            {activeFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {activeFiles.map(f => (
                        <div
                            key={f.path}
                            className="flex items-center gap-1.5 px-2 py-1 bg-accent/10 border border-accent/20 rounded-lg text-[10px] text-accent font-medium"
                        >
                            <span className="truncate max-w-[120px]">{f.label}</span>
                            <button onClick={() => removeFile(f.path)} className="hover:text-red-400 transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Context status */}
            {(activeClientName || activeFiles.length > 0) && (
                <div className="flex items-center gap-1.5 text-[10px] text-white/25">
                    <Sparkles className="w-3 h-3" />
                    <span>
                        {[
                            activeClientName && `vault ${activeClientName}`,
                            activeFiles.length > 0 && `${activeFiles.length} file`,
                        ].filter(Boolean).join(' + ')} attivi
                    </span>
                </div>
            )}
        </div>
    )
}
