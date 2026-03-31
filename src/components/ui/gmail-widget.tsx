'use client'

import { useEffect, useState } from 'react'
import { Mail, ExternalLink, Loader2, AlertCircle } from 'lucide-react'

interface Email {
    id: string
    subject: string
    from: string
    fromEmail: string
    date: string
    snippet: string
}

export function GmailWidget() {
    const [emails, setEmails] = useState<Email[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/gmail')
            .then(r => r.json())
            .then(data => {
                setEmails(data.emails || [])
                if (data.error && !data.emails?.length) setError(data.error)
            })
            .catch(() => setError('Errore di rete'))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-white/20 text-xs py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Caricamento email...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 text-white/20 text-xs py-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="italic">Gmail non connessa</span>
            </div>
        )
    }

    if (emails.length === 0) {
        return (
            <p className="text-xs text-white/20 italic py-1">Inbox vuota — ottimo!</p>
        )
    }

    return (
        <div className="space-y-1.5">
            {emails.map(email => (
                <a
                    key={email.id}
                    href={`https://mail.google.com/mail/u/0/#inbox/${email.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors group"
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white/70 truncate">{email.from}</p>
                            <p className="text-xs text-white/50 truncate mt-0.5">{email.subject}</p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/40 shrink-0 mt-0.5 transition-colors" />
                    </div>
                    {email.snippet && (
                        <p className="text-[10px] text-white/25 mt-1 line-clamp-1">{email.snippet}</p>
                    )}
                </a>
            ))}
        </div>
    )
}
