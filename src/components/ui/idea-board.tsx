'use client'

import { useState } from 'react'
import { IdeaCard } from './idea-card'

const STATUS_TABS = [
    { value: 'all', label: 'Tutte' },
    { value: 'idea', label: 'Idea' },
    { value: 'in_lavorazione', label: 'In lavorazione' },
    { value: 'pronto', label: 'Pronto' },
    { value: 'pubblicato', label: 'Pubblicato' },
    { value: 'archiviato', label: 'Archiviato' },
]

interface Idea {
    id: string
    text: string
    title: string | null
    assigned: boolean
    created_at: string
    idea_status: string | null
    platforms: string[] | null
    clients: { name: string } | null
}

export function IdeaBoard({ ideas }: { ideas: Idea[] }) {
    const [activeStatus, setActiveStatus] = useState('all')

    const filtered = activeStatus === 'all'
        ? ideas
        : ideas.filter(i => (i.idea_status || 'idea') === activeStatus)

    const countFor = (status: string) =>
        status === 'all' ? ideas.length : ideas.filter(i => (i.idea_status || 'idea') === status).length

    return (
        <div className="space-y-4">
            {/* Status filter tabs */}
            <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map(tab => {
                    const count = countFor(tab.value)
                    if (tab.value !== 'all' && count === 0) return null
                    return (
                        <button
                            key={tab.value}
                            onClick={() => setActiveStatus(tab.value)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                activeStatus === tab.value
                                    ? 'bg-accent text-white border-accent'
                                    : 'bg-white text-primary/60 border-border hover:border-accent/40 hover:text-primary'
                            }`}
                        >
                            {tab.label}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                activeStatus === tab.value ? 'bg-white/20' : 'bg-gray-100'
                            }`}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(idea => (
                    <IdeaCard key={idea.id} idea={idea} />
                ))}
            </div>
        </div>
    )
}
