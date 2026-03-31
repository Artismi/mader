'use client'

import { useState, useTransition } from 'react'
import { upsertSkill, upsertArchitecture } from '@/app/actions'
import { ChevronDown, ChevronRight, Sparkles, ToggleLeft, ToggleRight, Save, Loader2 } from 'lucide-react'

interface Skill {
    slug: string
    name: string
    description: string
    content: string
    triggers: string[]
    active: boolean
    sort_order: number
}

interface Props {
    initialSkills: Skill[]
    initialArchitecture: string
}

export function SkillsEditor({ initialSkills, initialArchitecture }: Props) {
    const [skills, setSkills] = useState<Skill[]>(initialSkills)
    const [architecture, setArchitecture] = useState(initialArchitecture)
    const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
    const [savedSkill, setSavedSkill] = useState<string | null>(null)
    const [savedArch, setSavedArch] = useState(false)
    const [isPending, startTransition] = useTransition()

    const updateSkill = (slug: string, field: keyof Skill, value: unknown) => {
        setSkills(prev => prev.map(s => s.slug === slug ? { ...s, [field]: value } : s))
    }

    const saveSkill = (skill: Skill) => {
        startTransition(async () => {
            await upsertSkill({
                slug: skill.slug,
                name: skill.name,
                description: skill.description,
                content: skill.content,
                triggers: skill.triggers,
                active: skill.active,
                sort_order: skill.sort_order,
            })
            setSavedSkill(skill.slug)
            setTimeout(() => setSavedSkill(null), 2000)
        })
    }

    const saveArchitecture = () => {
        startTransition(async () => {
            await upsertArchitecture(architecture)
            setSavedArch(true)
            setTimeout(() => setSavedArch(false), 2000)
        })
    }

    return (
        <div className="space-y-8">
            {/* Skills section */}
            <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary/40 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Skill Attive
                </h2>
                <p className="text-xs text-primary/50">
                    Le skill definiscono come il Co-Pilot risponde a diversi tipi di richieste. Disattiva quelle che non usi.
                </p>

                <div className="space-y-2">
                    {skills.map(skill => (
                        <div key={skill.slug} className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
                            <div className="flex items-center gap-4 px-5 py-4">
                                {/* Toggle active */}
                                <button
                                    onClick={() => {
                                        updateSkill(skill.slug, 'active', !skill.active)
                                    }}
                                    className="shrink-0 text-primary/40 hover:text-accent transition-colors"
                                >
                                    {skill.active
                                        ? <ToggleRight className="w-6 h-6 text-accent" />
                                        : <ToggleLeft className="w-6 h-6" />
                                    }
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-semibold text-sm ${skill.active ? 'text-primary' : 'text-primary/40'}`}>
                                            {skill.name}
                                        </span>
                                        <span className="text-xs text-primary/30">{skill.description}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {skill.triggers.slice(0, 4).map(t => (
                                            <span key={t} className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">
                                                {t}
                                            </span>
                                        ))}
                                        {skill.triggers.length > 4 && (
                                            <span className="text-[10px] text-primary/30">+{skill.triggers.length - 4}</span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setExpandedSkill(expandedSkill === skill.slug ? null : skill.slug)}
                                    className="shrink-0 text-primary/30 hover:text-primary transition-colors"
                                >
                                    {expandedSkill === skill.slug
                                        ? <ChevronDown className="w-4 h-4" />
                                        : <ChevronRight className="w-4 h-4" />
                                    }
                                </button>
                            </div>

                            {expandedSkill === skill.slug && (
                                <div className="px-5 pb-5 space-y-4 border-t border-border">
                                    <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-primary/40 mb-1.5 uppercase tracking-wider">Nome</label>
                                            <input
                                                value={skill.name}
                                                onChange={e => updateSkill(skill.slug, 'name', e.target.value)}
                                                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-primary/40 mb-1.5 uppercase tracking-wider">Trigger (virgola separati)</label>
                                            <input
                                                value={skill.triggers.join(', ')}
                                                onChange={e => updateSkill(skill.slug, 'triggers', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                                                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/20"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-primary/40 mb-1.5 uppercase tracking-wider">Istruzioni skill (Markdown)</label>
                                        <textarea
                                            value={skill.content}
                                            onChange={e => updateSkill(skill.slug, 'content', e.target.value)}
                                            rows={8}
                                            className="w-full border border-border rounded-lg px-3 py-2 text-xs font-mono text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => saveSkill(skill)}
                                            disabled={isPending}
                                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
                                        >
                                            {isPending && savedSkill !== skill.slug ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : savedSkill === skill.slug ? (
                                                <span className="text-green-300">✓ Salvato</span>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4" />
                                                    Salva Skill
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Architecture section */}
            <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary/40">
                    Architettura Sistema
                </h2>
                <p className="text-xs text-primary/50">
                    Il prompt di sistema base che definisce identità e comportamento del Co-Pilot. Modifica con attenzione.
                </p>
                <div className="bg-white rounded-xl border border-border p-5 space-y-4 shadow-sm">
                    <textarea
                        value={architecture}
                        onChange={e => setArchitecture(e.target.value)}
                        rows={20}
                        className="w-full border border-border rounded-lg px-3 py-2 text-xs font-mono text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={saveArchitecture}
                            disabled={isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : savedArch ? (
                                <span className="text-green-300">✓ Salvato</span>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Salva Architettura
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
