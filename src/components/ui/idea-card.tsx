'use client'

import { useTransition, useState } from 'react'
import { Trash2, ChevronDown } from 'lucide-react'
import { deleteIdea, updateIdea } from '@/app/actions'
import { useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
    { value: 'idea', label: 'Idea', color: 'bg-gray-100 text-gray-600' },
    { value: 'in_lavorazione', label: 'In lavorazione', color: 'bg-blue-100 text-blue-700' },
    { value: 'pronto', label: 'Pronto', color: 'bg-green-100 text-green-700' },
    { value: 'pubblicato', label: 'Pubblicato', color: 'bg-accent/10 text-accent' },
    { value: 'archiviato', label: 'Archiviato', color: 'bg-gray-100 text-gray-400' },
]

const PLATFORM_LABELS: Record<string, string> = {
    ig: 'IG',
    fb: 'FB',
    newsletter: 'NL',
    whatsapp: 'WA',
    altro: '…',
}

interface IdeaCardProps {
    idea: {
        id: string
        text: string
        title: string | null
        assigned: boolean
        created_at: string
        idea_status: string | null
        platforms: string[] | null
        clients: { name: string } | null
    }
}

export function IdeaCard({ idea }: IdeaCardProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [status, setStatus] = useState(idea.idea_status || 'idea')

    const statusMeta = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]

    const handleDelete = () => {
        startTransition(async () => {
            await deleteIdea(idea.id)
            router.refresh()
        })
    }

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus)
        startTransition(async () => {
            await updateIdea(idea.id, { idea_status: newStatus })
            router.refresh()
        })
    }

    const platforms = idea.platforms || []

    return (
        <div className={`bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col gap-3 ${isPending ? 'opacity-60' : ''}`}>
            {/* Title / text */}
            <div className="pr-8">
                {idea.title ? (
                    <>
                        <p className="text-sm font-semibold text-primary leading-snug">{idea.title}</p>
                        {idea.text && <p className="text-xs text-primary/50 mt-1 leading-relaxed">{idea.text}</p>}
                    </>
                ) : (
                    <p className="text-sm text-primary leading-relaxed">{idea.text}</p>
                )}
            </div>

            {/* Platforms */}
            {platforms.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {platforms.map(p => (
                        <span key={p} className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-accent/10 text-accent tracking-wider">
                            {PLATFORM_LABELS[p] ?? p}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto">
                <span className="text-xs text-primary/40">
                    {new Date(idea.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                    {idea.clients?.name && <span className="ml-1.5 text-primary/50">· {idea.clients.name}</span>}
                </span>

                {/* Status picker */}
                <div className="relative">
                    <button
                        className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full ${statusMeta.color} tracking-wider`}
                        onClick={e => {
                            e.stopPropagation()
                            const next = document.getElementById(`status-menu-${idea.id}`)
                            next?.classList.toggle('hidden')
                        }}
                    >
                        {statusMeta.label}
                        <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                    <div
                        id={`status-menu-${idea.id}`}
                        className="hidden absolute right-0 bottom-full mb-1 bg-white rounded-lg shadow-lg border border-border py-1 z-10 min-w-[140px]"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${opt.value === status ? 'font-semibold text-accent' : 'text-primary/70'}`}
                                onClick={() => {
                                    handleStatusChange(opt.value)
                                    document.getElementById(`status-menu-${idea.id}`)?.classList.add('hidden')
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Delete button */}
            <button
                onClick={handleDelete}
                disabled={isPending}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-primary/20 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                title="Elimina idea"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
