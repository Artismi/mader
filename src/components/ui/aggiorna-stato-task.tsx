'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATI = [
  { value: 'todo', label: 'Da Iniziare' },
  { value: 'in_progress', label: 'In Corso' },
  { value: 'done', label: 'Completato' },
]

export function AggiornaStatoTask({ taskId, currentStatus }: { taskId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleChange = async (newStatus: string) => {
    setLoading(true)
    setStatus(newStatus)
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, status: newStatus }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={e => handleChange(e.target.value)}
        disabled={loading}
        className="text-sm font-medium border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent disabled:opacity-50"
      >
        {STATI.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  )
}
