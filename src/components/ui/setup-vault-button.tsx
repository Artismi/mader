'use client'

import { useState } from 'react'
import { FolderOpen, Loader2 } from 'lucide-react'

interface Props {
    clientId: string
    clientName: string
    onDone?: () => void
}

export function SetupVaultButton({ clientId, clientName, onDone }: Props) {
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const [error, setError] = useState('')

    async function handleSetup() {
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/drive/setup-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId, clientName }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Errore')
            setDone(true)
            onDone?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore sconosciuto')
        } finally {
            setLoading(false)
        }
    }

    if (done) {
        return (
            <span className="text-xs text-green-600 font-medium">
                Vault creato! Ricarica la pagina.
            </span>
        )
    }

    return (
        <div className="space-y-1">
            <button
                onClick={handleSetup}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-accent hover:underline font-medium disabled:opacity-50"
            >
                {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                    <FolderOpen className="w-3.5 h-3.5" />
                )}
                {loading ? 'Creazione vault...' : 'Crea Vault Drive'}
            </button>
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    )
}
