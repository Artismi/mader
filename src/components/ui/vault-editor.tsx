'use client'

import { useState, useTransition } from 'react'
import { Save, Loader2, Edit3, Check } from 'lucide-react'
import { updateClient } from '@/app/actions'

interface Props {
    clientId: string
    initialContent: string | null
}

export function VaultEditor({ clientId, initialContent }: Props) {
    const [content, setContent] = useState(initialContent || '')
    const [editing, setEditing] = useState(false)
    const [saved, setSaved] = useState(false)
    const [isPending, startTransition] = useTransition()

    const handleSave = () => {
        startTransition(async () => {
            await updateClient(clientId, { vault_md_content: content })
            setSaved(true)
            setEditing(false)
            setTimeout(() => setSaved(false), 2000)
        })
    }

    if (!editing) {
        return (
            <div className="space-y-3">
                {content ? (
                    <div className="bg-gray-50 rounded-xl p-4 text-xs text-primary/70 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto border border-border">
                        {content}
                    </div>
                ) : (
                    <p className="text-sm text-primary/40 italic">Nessun vault ancora. Clicca Modifica per creare il profilo del cliente.</p>
                )}
                <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 transition-colors font-semibold"
                >
                    <Edit3 className="w-3.5 h-3.5" />
                    {content ? 'Modifica vault' : 'Crea vault'}
                </button>
                {saved && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                        <Check className="w-3 h-3" /> Salvato
                    </span>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={14}
                placeholder={`# Vault — [Nome Cliente]

## Identità visiva
- Colori: #hex1, #hex2
- Font: ...
- Note logo: ...

## Tone of voice
- Aggettivi: ...
- Esempi copy: ...
- Da evitare: ...

## Profilo
Chi è, missione, dati chiave.

## Deep link
- Canva brand kit: ...
- FigJam board: ...`}
                autoFocus
                className="w-full border border-border rounded-xl p-4 text-xs font-mono text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none bg-gray-50"
            />
            <div className="flex items-center gap-2">
                <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salva vault
                </button>
                <button
                    onClick={() => { setEditing(false); setContent(initialContent || '') }}
                    className="text-sm text-primary/50 hover:text-primary transition-colors"
                >
                    Annulla
                </button>
            </div>
        </div>
    )
}
