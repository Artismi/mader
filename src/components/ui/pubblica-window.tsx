'use client'

import { useState } from 'react'
import { Send, Eye, ChevronDown, X, Check, Loader2, Instagram, Facebook, MessageCircle, Mail, Globe, Sparkles } from 'lucide-react'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

const CHANNELS = [
    {
        id: 'instagram',
        label: 'Instagram',
        icon: Instagram,
        color: 'from-purple-500 to-pink-500',
        maxChars: 2200,
        hint: 'Caption: 125 car. visibili prima del "...altro" · una sola richiesta · max 5 hashtag',
        placeholder: (text: string) => text,
    },
    {
        id: 'facebook',
        label: 'Facebook',
        icon: Facebook,
        color: 'from-blue-600 to-blue-500',
        maxChars: 63206,
        hint: 'Post pagina · testo libero · link in anteprima automatico',
        placeholder: (text: string) => text,
    },
    {
        id: 'telegram',
        label: 'Telegram',
        icon: MessageCircle,
        color: 'from-sky-400 to-sky-500',
        maxChars: 4096,
        hint: 'Canale/Chat · supporta bold e italic con markdown',
        placeholder: (text: string) => text.replace(/\*\*/g, '*'),
    },
    {
        id: 'whatsapp',
        label: 'WhatsApp',
        icon: MessageCircle,
        color: 'from-green-500 to-emerald-500',
        maxChars: 65536,
        hint: 'Broadcast list / canale · testo semplice consigliato',
        placeholder: (text: string) => text.replace(/\*\*/g, '*').replace(/_/g, '_'),
    },
    {
        id: 'newsletter',
        label: 'Newsletter',
        icon: Mail,
        color: 'from-orange-400 to-amber-400',
        maxChars: 0,
        hint: 'Email HTML · oggetto separato · pulsante CTA consigliato',
        placeholder: (text: string) => text,
    },
    {
        id: 'altro',
        label: 'Altro',
        icon: Globe,
        color: 'from-gray-400 to-gray-500',
        maxChars: 0,
        hint: 'Copia il testo adattato per qualsiasi altra piattaforma',
        placeholder: (text: string) => text,
    },
]

interface Client {
    id: string
    name: string
}

// Risultato di /api/instagram/lab action "polish" (vedi src/lib/ai/instagram/index.ts)
interface IgPolish {
    human: { text: string; changes: unknown[]; flags: { id: string; name: string; fix: string }[] }
    score: { before: { humanScore: number }; after: { humanScore: number; verdict: string; weakest: string } }
    caption: {
        feedWindow: string
        truncated: boolean
        verdict: 'READY' | 'REVIEW' | 'FIX'
        checks: { id: string; status: 'PASS' | 'WARN' | 'FAIL'; label: string; detail: string }[]
    }
}

const STATUS_COLOR = { PASS: 'text-green-600', WARN: 'text-amber-600', FAIL: 'text-red-600' } as const

interface Props {
    clients: Client[]
}

// ─── Componente principale ─────────────────────────────────────────────────────

export function PubblicaWindow({ clients }: Props) {
    const [body, setBody] = useState('')
    const [subject, setSubject] = useState('')
    const [selectedChannels, setSelectedChannels] = useState<string[]>([])
    const [clientId, setClientId] = useState('')
    const [previews, setPreviews] = useState<Record<string, string>>({})
    const [confirmed, setConfirmed] = useState<Record<string, boolean>>({})
    const [publishing, setPublishing] = useState<Record<string, boolean>>({})
    const [published, setPublished] = useState<Record<string, boolean>>({})
    const [previewOpen, setPreviewOpen] = useState(false)
    const [igKeywords, setIgKeywords] = useState('')
    const [igLab, setIgLab] = useState<IgPolish | null>(null)
    const [igLoading, setIgLoading] = useState(false)
    const [publishError, setPublishError] = useState<Record<string, string>>({})

    const selectedClient = clients.find(c => c.id === clientId)

    const toggleChannel = (id: string) => {
        setSelectedChannels(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        )
    }

    // Genera anteprima per ogni canale basandosi sul corpo comune
    const generatePreviews = () => {
        const generated: Record<string, string> = {}
        for (const ch of CHANNELS) {
            if (selectedChannels.includes(ch.id)) {
                let adapted = ch.placeholder(body)
                // Tronca se necessario
                if (ch.maxChars > 0 && adapted.length > ch.maxChars) {
                    adapted = adapted.slice(0, ch.maxChars - 3) + '...'
                }
                generated[ch.id] = previews[ch.id] ?? adapted
            }
        }
        setPreviews(generated)
        setPreviewOpen(true)
    }

    // Circuito Instagram: umanizza → human score → linter caption (calcolo locale)
    const analyzeInstagram = async () => {
        setIgLoading(true)
        try {
            const res = await fetch('/api/instagram/lab', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'polish',
                    text: previews.instagram || body,
                    keywords: igKeywords.split(',').map(k => k.trim()).filter(Boolean),
                }),
            })
            const data = await res.json()
            setIgLab(data.ok ? data.data as IgPolish : null)
        } finally {
            setIgLoading(false)
        }
    }

    const confirmChannel = (channelId: string) => {
        setConfirmed(prev => ({ ...prev, [channelId]: !prev[channelId] }))
    }

    const publishAll = async () => {
        const toPublish = selectedChannels.filter(id => confirmed[id])
        for (const channelId of toPublish) {
            setPublishing(prev => ({ ...prev, [channelId]: true }))
            setPublishError(prev => ({ ...prev, [channelId]: '' }))
            try {
                const res = await fetch('/api/social/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        channel: channelId,
                        content: previews[channelId] || body,
                        subject,
                        clientId,
                    }),
                })
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}))
                    setPublishError(prev => ({ ...prev, [channelId]: [data.error, ...(data.fails ?? [])].filter(Boolean).join(' · ') || 'Errore di pubblicazione' }))
                    continue
                }
                setPublished(prev => ({ ...prev, [channelId]: true }))
            } finally {
                setPublishing(prev => ({ ...prev, [channelId]: false }))
            }
        }
    }

    const confirmedCount = selectedChannels.filter(id => confirmed[id]).length
    const hasContent = body.trim().length > 0 && selectedChannels.length > 0

    return (
        <div className="flex h-full gap-4 min-h-0">

            {/* ─ Colonna sinistra: editor + configurazione ─ */}
            <div className="flex-1 flex flex-col min-w-0 gap-4">

                {/* Header riga */}
                <div className="flex items-center gap-3">
                    {/* Cliente */}
                    <div className="relative">
                        <select
                            value={clientId}
                            onChange={e => setClientId(e.target.value)}
                            className="appearance-none border border-border rounded-xl pl-3 pr-8 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
                        >
                            <option value="">— Soggetto —</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/40 pointer-events-none" />
                    </div>

                    {selectedClient && (
                        <span className="text-xs font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded-full">
                            {selectedClient.name}
                        </span>
                    )}
                </div>

                {/* Subject (newsletter) */}
                {selectedChannels.includes('newsletter') && (
                    <input
                        type="text"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Oggetto email..."
                        className="border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                )}

                {/* Corpo principale */}
                <div className="flex-1 relative bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder={`Scrivi il contenuto principale una volta sola.\n\nL'anteprima mostrerà la versione ottimizzata per ogni canale scelto.\n\nSuggerimenti:\n• Scrivi naturalmente, senza curarti dei limiti di caratteri\n• Asterischi **grassetto** e _corsivo_ supportati\n• L'IA dell'estensione può aiutarti a riscrivere`}
                        className="w-full h-full resize-none p-6 text-sm text-primary leading-relaxed focus:outline-none font-sans placeholder:text-primary/25"
                    />
                    {body.length > 0 && (
                        <div className="absolute bottom-3 right-4 text-[10px] text-primary/30 font-mono">
                            {body.length} car.
                        </div>
                    )}
                </div>

                {/* Selezione canali */}
                <div className="bg-white rounded-2xl border border-border p-4">
                    <p className="text-xs font-semibold text-primary/40 uppercase tracking-wider mb-3">Canali di pubblicazione</p>
                    <div className="flex flex-wrap gap-2">
                        {CHANNELS.map(ch => {
                            const active = selectedChannels.includes(ch.id)
                            return (
                                <button
                                    key={ch.id}
                                    onClick={() => toggleChannel(ch.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${active
                                        ? `bg-gradient-to-r ${ch.color} text-white border-transparent shadow-sm`
                                        : 'bg-white text-primary/60 border-border hover:border-primary/30'
                                        }`}
                                >
                                    <ch.icon className="w-3.5 h-3.5" />
                                    {ch.label}
                                    {active && (
                                        published[ch.id]
                                            ? <Check className="w-3 h-3" />
                                            : confirmed[ch.id]
                                                ? <Check className="w-3 h-3 opacity-60" />
                                                : null
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* CTA principale */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={generatePreviews}
                        disabled={!hasContent}
                        className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-primary hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >
                        <Eye className="w-4 h-4" />
                        Vedi Anteprime ({selectedChannels.length})
                    </button>

                    {confirmedCount > 0 && (
                        <button
                            onClick={publishAll}
                            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm"
                        >
                            <Send className="w-4 h-4" />
                            Pubblica su {confirmedCount} {confirmedCount === 1 ? 'canale' : 'canali'}
                        </button>
                    )}
                </div>
            </div>

            {/* ─ Colonna destra: anteprima declinazioni ─ */}
            {previewOpen && (
                <div className="w-96 flex-shrink-0 flex flex-col min-h-0 gap-3 overflow-y-auto pr-1 scrollbar-hide">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-widest text-primary/40">Anteprime</p>
                        <button onClick={() => setPreviewOpen(false)} className="text-primary/30 hover:text-primary transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {CHANNELS.filter(ch => selectedChannels.includes(ch.id)).map(ch => (
                        <div
                            key={ch.id}
                            className={`rounded-2xl border overflow-hidden ${confirmed[ch.id] ? 'border-accent/40 shadow-[0_0_0_2px_rgba(124,58,237,0.15)]' : 'border-border'}`}
                        >
                            {/* Header canale */}
                            <div className={`flex items-center justify-between px-4 py-2.5 bg-gradient-to-r ${ch.color}`}>
                                <span className="flex items-center gap-2 text-white text-xs font-bold">
                                    <ch.icon className="w-3.5 h-3.5" />
                                    {ch.label}
                                </span>
                                <div className="flex items-center gap-2">
                                    {published[ch.id] ? (
                                        <span className="text-white/80 text-[10px] font-bold">✓ Pubblicato</span>
                                    ) : publishing[ch.id] ? (
                                        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                                    ) : (
                                        <button
                                            onClick={() => confirmChannel(ch.id)}
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${confirmed[ch.id]
                                                ? 'bg-white/30 text-white'
                                                : 'bg-white/20 text-white/80 hover:bg-white/30'
                                                }`}
                                        >
                                            {confirmed[ch.id] ? '✓ Confermato' : 'Conferma'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Hint */}
                            <div className="px-4 py-1.5 bg-gray-50 border-b border-border">
                                <p className="text-[10px] text-primary/40">{ch.hint}</p>
                            </div>

                            {/* Testo editabile */}
                            <textarea
                                value={previews[ch.id] || ''}
                                onChange={e => setPreviews(prev => ({ ...prev, [ch.id]: e.target.value }))}
                                className="w-full p-4 text-sm text-primary leading-relaxed resize-none focus:outline-none bg-white min-h-[120px]"
                                rows={6}
                            />

                            {publishError[ch.id] && (
                                <div className="px-4 py-2 text-[11px] text-red-600 bg-red-50 border-t border-red-100">{publishError[ch.id]}</div>
                            )}

                            {/* Laboratorio Instagram */}
                            {ch.id === 'instagram' && (
                                <div className="border-t border-border px-4 py-3 space-y-2 bg-gray-50/60">
                                    <div className="flex gap-2">
                                        <input
                                            value={igKeywords}
                                            onChange={e => setIgKeywords(e.target.value)}
                                            placeholder="Termini di ricerca, separati da virgola"
                                            className="flex-1 min-w-0 border border-border rounded-lg px-2 py-1 text-[11px] bg-white focus:outline-none"
                                        />
                                        <button
                                            onClick={analyzeInstagram}
                                            disabled={igLoading || !(previews.instagram || body).trim()}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white disabled:opacity-40"
                                        >
                                            {igLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            Analizza
                                        </button>
                                    </div>

                                    {igLab && (
                                        <>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/40">Cosa mostra il feed</p>
                                            <div className="rounded-lg border border-border bg-white p-2 text-[11px] text-primary whitespace-pre-wrap">
                                                {igLab.caption.feedWindow}
                                                {igLab.caption.truncated && <span className="text-primary/40"> ... altro</span>}
                                            </div>
                                            <ul className="space-y-0.5">
                                                {igLab.caption.checks.map(c => (
                                                    <li key={c.id} className="text-[11px] leading-snug">
                                                        <span className={`font-mono font-bold ${STATUS_COLOR[c.status]}`}>{c.status}</span>{' '}
                                                        <span className="font-semibold">{c.label}</span>{' '}
                                                        <span className="text-primary/50">{c.detail}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="text-[11px]">
                                                <span className="font-semibold">Human score</span>{' '}
                                                {igLab.score.before.humanScore.toFixed(1)} → {igLab.score.after.humanScore.toFixed(1)}{' '}
                                                <span className={igLab.score.after.verdict === 'PASS' ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>{igLab.score.after.verdict}</span>
                                                <span className="text-primary/40"> · punto debole: {igLab.score.after.weakest}</span>
                                            </p>
                                            {igLab.human.flags.length > 0 && (
                                                <ul className="space-y-0.5">
                                                    {igLab.human.flags.map(f => (
                                                        <li key={f.id} className="text-[11px] text-amber-700">⚑ {f.name}: <span className="text-primary/50">{f.fix}</span></li>
                                                    ))}
                                                </ul>
                                            )}
                                            {igLab.human.text !== (previews.instagram || body).trim() && (
                                                <button
                                                    onClick={() => { setPreviews(prev => ({ ...prev, instagram: igLab.human.text })); setIgLab(null) }}
                                                    className="text-[11px] font-semibold text-accent hover:underline"
                                                >
                                                    Applica testo umanizzato ({igLab.human.changes.length} modifiche)
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Contatore */}
                            {ch.maxChars > 0 && (
                                <div className={`px-4 py-1.5 text-right text-[10px] font-mono ${(previews[ch.id] || '').length > ch.maxChars ? 'text-red-500' : 'text-primary/30'}`}>
                                    {(previews[ch.id] || '').length}/{ch.maxChars}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
