'use client'

import { useState, Fragment } from 'react'
import { Clock, Save, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AvailabilitySlot } from '@/lib/db'

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']

interface Props {
  initialSlots: AvailabilitySlot[]
}

// Converte slots in una griglia [day][hour] = active
function slotsToGrid(slots: AvailabilitySlot[]): boolean[][] {
  const grid = Array.from({ length: 7 }, () => Array(HOURS.length).fill(false))
  for (const slot of slots) {
    const hi = HOURS.indexOf(slot.start_time)
    if (hi >= 0) grid[slot.day_of_week][hi] = slot.active
  }
  return grid
}

function gridToSlots(grid: boolean[][]): Omit<AvailabilitySlot, 'id'>[] {
  const slots: Omit<AvailabilitySlot, 'id'>[] = []
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < HOURS.length; h++) {
      if (grid[d][h]) {
        const endIdx = Math.min(h + 1, HOURS.length - 1)
        slots.push({
          day_of_week: d,
          start_time: HOURS[h],
          end_time: HOURS[endIdx],
          active: true,
        })
      }
    }
  }
  return slots
}

export function AvailabilityPanel({ initialSlots }: Props) {
  const [grid, setGrid] = useState<boolean[][]>(() => slotsToGrid(initialSlots))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [collapsed, setCollapsed] = useState(true)

  const toggle = (day: number, hour: number) => {
    setGrid(prev => {
      const next = prev.map(r => [...r])
      next[day][hour] = !next[day][hour]
      return next
    })
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: gridToSlots(grid) }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const activeCount = grid.flat().filter(Boolean).length

  if (collapsed) {
    return (
      <div className="w-12 flex flex-col items-center pt-6 border-r border-white/[0.06] bg-[#090909]/20 hover:bg-[#090909]/40 transition-colors cursor-pointer group" onClick={() => setCollapsed(false)}>
        <button
          className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.1] text-white/30 group-hover:text-white group-hover:border-accent/40 transition-all shadow-xl"
          title="Espandi Disponibilità"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="mt-8 flex flex-col items-center gap-6">
          <Clock className="w-4 h-4 text-white/10" />
          <div className="[writing-mode:vertical-lr] rotate-180 text-[9px] font-black uppercase tracking-[0.3em] text-white/10 group-hover:text-white/30 transition-colors">
            Disponibilità
          </div>
        </div>
        {activeCount > 0 && (
          <div className="mt-auto mb-8 w-6 h-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
            {activeCount}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-[220px] flex-shrink-0 flex flex-col border-r border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-white/30" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Disponibilità</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={save}
            disabled={saving}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors',
              saved
                ? 'text-green-400'
                : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'
            )}
          >
            {saved ? <CheckCircle className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            {saved ? 'Salvato' : 'Salva'}
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/20 hover:text-white/50 transition-all"
            title="Contrai"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Griglia */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-2">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `24px repeat(7, 1fr)` }}>
          {/* Header giorni */}
          <div />
          {DAYS.map(d => (
            <div key={d} className="text-center text-[8px] font-black uppercase tracking-wider text-white/25 py-0.5">
              {d}
            </div>
          ))}

          {/* Righe ore */}
          {HOURS.map((hour, hi) => (
            <Fragment key={`row-${hi}`}>
              <div className="text-[8px] text-white/20 flex items-center pr-1 justify-end">
                {hour.slice(0, 5)}
              </div>
              {Array.from({ length: 7 }, (_, di) => (
                <button
                  key={`${hi}-${di}`}
                  onClick={() => toggle(di, hi)}
                  className={cn(
                    'h-5 w-full rounded-sm transition-colors border',
                    grid[di][hi]
                      ? 'bg-accent/40 border-accent/30 hover:bg-accent/50'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07]'
                  )}
                />
              ))}
            </Fragment>
          ))}
        </div>

        <p className="text-[9px] text-white/15 mt-3 leading-relaxed px-1">
          Queste fasce saranno usate da Calendly per mostrare la tua disponibilità.
        </p>
      </div>
    </div>
  )
}
