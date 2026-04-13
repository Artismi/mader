'use client'

import { useState } from 'react'
import { Plus, Check, X, GripVertical, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/db'

interface Props {
  initialTasks: Task[]
}

export function OverlayWidget({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)

  const addTask = async () => {
    if (!input.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input.trim(), type: 'task', category: 'generale', status: 'todo' }),
      })
      const data = await res.json()
      if (data.task) {
        setTasks(prev => [data.task, ...prev])
        setInput('')
      }
    } finally {
      setAdding(false)
    }
  }

  const completeTask = async (id: string) => {
    setCompleting(id)
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'done' }),
      })
      setTasks(prev => prev.filter(t => t.id !== id))
    } finally {
      setCompleting(null)
    }
  }

  return (
    <div
      className="w-[380px] h-[600px] flex flex-col rounded-2xl overflow-hidden select-none"
      style={{
        background: 'rgba(10,10,12,0.92)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 32px 64px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.05)',
      }}
    >
      {/* Header — drag region */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] cursor-move"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-3.5 h-3.5 text-white/20" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Task rapidi</span>
        </div>
        <button
          onClick={() => window.close()}
          className="w-5 h-5 rounded-full bg-white/[0.06] hover:bg-red-500/30 flex items-center justify-center transition-colors"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <X className="w-3 h-3 text-white/30 hover:text-red-400" />
        </button>
      </div>

      {/* Quick add */}
      <div className="px-3 py-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 py-2 border border-white/[0.06] focus-within:border-accent/30 transition-colors">
          <Plus className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
          <input
            type="text"
            placeholder="Aggiungi task veloce..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTask() }}
            className="flex-1 bg-transparent text-[12px] text-white/70 placeholder:text-white/20 outline-none"
            autoFocus
          />
          {adding && <Loader2 className="w-3 h-3 text-accent/50 animate-spin flex-shrink-0" />}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-2 py-1.5 space-y-0.5">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/15 gap-2">
            <Check className="w-8 h-8 opacity-30" />
            <p className="text-[11px] italic">Tutto a posto. Nessun task.</p>
          </div>
        ) : tasks.map(task => (
          <div
            key={task.id}
            className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <button
              onClick={() => completeTask(task.id)}
              disabled={completing === task.id}
              className={cn(
                'w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors',
                completing === task.id
                  ? 'border-accent/50 bg-accent/20'
                  : 'border-white/15 hover:border-accent/50 hover:bg-accent/10 group-hover:border-white/25'
              )}
            >
              {completing === task.id && <Loader2 className="w-2.5 h-2.5 text-accent animate-spin" />}
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-white/60 leading-snug truncate">{task.title}</p>
              {task.client_name && (
                <p className="text-[9px] text-white/20 truncate mt-0.5">{task.client_name}</p>
              )}
            </div>

            {task.deadline && (
              <span className="text-[9px] text-white/20 flex-shrink-0">
                {new Date(task.deadline).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/[0.04]">
        <p className="text-[9px] text-white/15 text-center">
          Ctrl+Shift+Space per aprire/chiudere
        </p>
      </div>
    </div>
  )
}
