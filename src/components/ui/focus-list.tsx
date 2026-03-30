'use client'

import { useState, useTransition } from 'react'
import { Clock, CheckCircle2, Check, Trash2, Pencil } from 'lucide-react'
import { markTaskDone, deleteTask } from '@/app/actions'
import { TaskFormModal } from './nuovo-task-modal'

interface Task {
  id: string
  title: string
  type: string
  category: 'task' | 'engagement'
  deadline: string
  client_id: string | null
  clients?: { name: string } | null
}

export function FocusList({
  urgentTasks: initialUrgent,
  suggestedTasks: initialSuggested,
}: {
  urgentTasks: Task[]
  suggestedTasks: Task[]
}) {
  const [urgent, setUrgent] = useState(initialUrgent)
  const [suggested, setSuggested] = useState(initialSuggested)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [, startTransition] = useTransition()

  const removeFromLists = (taskId: string) => {
    setUrgent(prev => prev.filter(t => t.id !== taskId))
    setSuggested(prev => prev.filter(t => t.id !== taskId))
  }

  const handleDone = (taskId: string) => {
    removeFromLists(taskId)
    startTransition(async () => {
      await markTaskDone(taskId)
    })
  }

  const handleDelete = (taskId: string) => {
    removeFromLists(taskId)
    startTransition(async () => {
      await deleteTask(taskId)
    })
  }

  const total = urgent.length + suggested.length

  return (
    <>
      <div className="space-y-10 pt-1">
        <p className="text-sm text-white/30 italic leading-relaxed">
          {total === 0
            ? 'Nessuna priorità attiva.'
            : urgent.length > 0
              ? `${urgent.length} in ritardo · ${suggested.length} in arrivo.`
              : `${suggested.length} task in arrivo.`
          }
        </p>

        {urgent.length > 0 && (
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400/50 mb-5 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> In Ritardo
            </h2>
            <div className="space-y-4">
              {urgent.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  variant="urgent"
                  onDone={handleDone}
                  onDelete={handleDelete}
                  onEdit={setEditingTask}
                />
              ))}
            </div>
          </section>
        )}

        {suggested.length > 0 && (
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20 mb-5 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Prossimi
            </h2>
            <div className="space-y-4">
              {suggested.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  variant="normal"
                  onDone={handleDone}
                  onDelete={handleDelete}
                  onEdit={setEditingTask}
                />
              ))}
            </div>
          </section>
        )}

        {total === 0 && (
          <p className="text-xs text-white/15 italic">Aggiungi un task per iniziare.</p>
        )}
      </div>

      <TaskFormModal
        open={editingTask !== null}
        onClose={() => setEditingTask(null)}
        editTask={editingTask ?? undefined}
      />
    </>
  )
}

function TaskRow({
  task,
  variant,
  onDone,
  onDelete,
  onEdit,
}: {
  task: Task
  variant: 'urgent' | 'normal'
  onDone: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
}) {
  return (
    <div className="flex items-start gap-3 group">
      {variant === 'urgent'
        ? <div className="w-1.5 h-1.5 rounded-full bg-red-400/50 mt-[7px] shrink-0" />
        : <div className="w-4 h-4 rounded-full border border-white/12 group-hover:border-accent/40 transition-colors shrink-0 mt-0.5" />
      }
      <div className="flex-1 min-w-0">
        <span className={`text-sm leading-snug ${variant === 'urgent' ? 'font-bold text-white/70' : 'font-medium text-white/45'}`}>
          {task.title}
        </span>
        {task.clients?.name && (
          <p className="text-[10px] font-bold text-white/20 mt-0.5 uppercase tracking-wider">
            {task.clients.name}
          </p>
        )}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
        <button
          onClick={() => onDone(task.id)}
          className="p-1.5 hover:bg-green-500/20 rounded-lg transition-colors"
          title="Fatto"
        >
          <Check className="w-3 h-3 text-green-400/70" />
        </button>
        <button
          onClick={() => onEdit(task)}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          title="Modifica"
        >
          <Pencil className="w-3 h-3 text-white/30" />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
          title="Elimina"
        >
          <Trash2 className="w-3 h-3 text-red-400/50" />
        </button>
      </div>
    </div>
  )
}
