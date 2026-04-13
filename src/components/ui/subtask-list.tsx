'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, CheckSquare, Square, Loader2 } from 'lucide-react'
import { addSubtask, toggleSubtask, deleteSubtask } from '@/app/actions'

import { Subtask } from '@/lib/db'

interface Props {
    taskId: string
    initialSubtasks: Subtask[]
}

export function SubtaskList({ taskId, initialSubtasks }: Props) {
    const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks)
    const [newTitle, setNewTitle] = useState('')
    const [showInput, setShowInput] = useState(false)
    const [isPending, startTransition] = useTransition()

    const handleAdd = () => {
        if (!newTitle.trim()) return
        const title = newTitle.trim()
        setNewTitle('')
        setShowInput(false)

        // Ottimistico
        const tempId = `temp-${Date.now()}`
        setSubtasks(prev => [...prev, { 
            id: tempId, 
            task_id: taskId, 
            title, 
            done: false, 
            fase: undefined, 
            sort_order: prev.length,
            created_at: new Date().toISOString()
        }])

        startTransition(async () => {
            await addSubtask(taskId, title)
            // La pagina si ricarica via revalidatePath, ma lo stato locale è già aggiornato
        })
    }

    const handleToggle = (subtask: Subtask) => {
        setSubtasks(prev => prev.map(s => s.id === subtask.id ? { ...s, done: !s.done } : s))
        startTransition(async () => {
            await toggleSubtask(subtask.id, !subtask.done, taskId)
        })
    }

    const handleDelete = (subtaskId: string) => {
        setSubtasks(prev => prev.filter(s => s.id !== subtaskId))
        startTransition(async () => {
            await deleteSubtask(subtaskId, taskId)
        })
    }

    const done = subtasks.filter(s => s.done).length
    const total = subtasks.length
    const progress = total > 0 ? Math.round((done / total) * 100) : 0

    return (
        <div className="space-y-3">
            {/* Progress bar */}
            {total > 0 && (
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-primary/50">
                        <span>{done}/{total} completati</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Subtask list */}
            <ul className="space-y-1.5">
                {subtasks.map(subtask => (
                    <li
                        key={subtask.id}
                        className={`flex items-center gap-3 p-2 rounded-lg group transition-colors ${subtask.done ? 'opacity-60' : 'hover:bg-black/5'}`}
                    >
                        <button
                            onClick={() => handleToggle(subtask)}
                            className="shrink-0 text-primary/40 hover:text-accent transition-colors"
                        >
                            {subtask.done
                                ? <CheckSquare className="w-4 h-4 text-accent" />
                                : <Square className="w-4 h-4" />
                            }
                        </button>
                        <span className={`flex-1 text-sm ${subtask.done ? 'line-through text-primary/40' : 'text-primary'}`}>
                            {subtask.title}
                        </span>
                        <button
                            onClick={() => handleDelete(subtask.id)}
                            className="opacity-0 group-hover:opacity-100 text-primary/20 hover:text-red-500 transition-all p-1 rounded"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </li>
                ))}
            </ul>

            {/* Add subtask */}
            {showInput ? (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleAdd()
                            if (e.key === 'Escape') { setShowInput(false); setNewTitle('') }
                        }}
                        placeholder="Titolo subtask..."
                        autoFocus
                        className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newTitle.trim() || isPending}
                        className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors hover:bg-accent/90"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aggiungi'}
                    </button>
                    <button
                        onClick={() => { setShowInput(false); setNewTitle('') }}
                        className="px-3 py-1.5 text-primary/50 hover:text-primary text-sm transition-colors"
                    >
                        Annulla
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setShowInput(true)}
                    className="flex items-center gap-2 text-sm text-primary/40 hover:text-accent transition-colors py-1"
                >
                    <Plus className="w-4 h-4" />
                    Aggiungi subtask
                </button>
            )}
        </div>
    )
}
