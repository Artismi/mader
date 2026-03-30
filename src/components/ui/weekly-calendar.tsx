'use client'

import { useState, useMemo, useEffect, useTransition } from 'react';
import { clsx } from 'clsx';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, X, Check, Pencil, CalendarPlus } from 'lucide-react';
import { TaskFormModal } from './nuovo-task-modal';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { markTaskDone, deleteTask } from '@/app/actions';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'event' | 'task';
  category?: 'task' | 'engagement';
  color?: string;
  durationMinutes?: number;
  rawTask?: {
    id: string; title: string; type: string;
    category: 'task' | 'engagement'; deadline: string; client_id: string | null;
  };
}

interface GoogleEventForm {
  title: string;
  date: string;
  startHour: string;
  endHour: string;
}

export function WeeklyCalendar({ initialEvents, initialTasks }: { initialEvents: any[], initialTasks: any[] }) {
  const router = useRouter();
  const [viewDate, setViewDate] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<CalendarEvent['rawTask'] | null>(null);
  const [googleForm, setGoogleForm] = useState<{ open: boolean; date: string; hour: number }>({ open: false, date: '', hour: 9 });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [, startTransition] = useTransition();

  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  const days = useMemo(() => {
    const startOfWeek = new Date(viewDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [viewDate]);

  const gridEvents = useMemo(() => {
    const events: CalendarEvent[] = [
      ...initialEvents.map(e => ({
        id: e.id,
        title: e.summary || '(Nessun titolo)',
        start: new Date(e.start?.dateTime || e.start?.date),
        end: new Date(e.end?.dateTime || e.end?.date),
        type: 'event' as const,
        color: 'bg-accent/20 border-accent/40 text-accent-foreground'
      })),
      ...(initialTasks || []).map(t => ({
        id: t.id,
        title: t.title,
        start: new Date(t.deadline),
        end: new Date(new Date(t.deadline).getTime() + (t.duration_minutes || 60) * 60000),
        type: 'task' as const,
        category: t.category as 'task' | 'engagement',
        durationMinutes: t.duration_minutes || 60,
        color: t.category === 'engagement'
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-200/90'
          : 'bg-white/10 border-white/20 text-white/90 shadow-lg',
        rawTask: { id: t.id, title: t.title, type: t.type, category: t.category, deadline: t.deadline, client_id: t.client_id }
      }))
    ];
    return events;
  }, [initialEvents, initialTasks]);

  const getEventsForDayAndHour = (day: Date, hour: number) => {
    return gridEvents.filter(e => {
      return e.start.toDateString() === day.toDateString() && e.start.getHours() === hour;
    });
  };

  const handleCellClick = (day: Date) => {
    const dateStr = day.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setIsTaskModalOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, eventId: string, eventType: string) => {
    e.dataTransfer.setData('text/plain', eventId);
    e.dataTransfer.setData('event-type', eventType);
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
  };

  const handleDrop = async (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('text/plain');
    const eventType = e.dataTransfer.getData('event-type');
    if (eventType !== 'task') return;
    const newDate = new Date(day);
    newDate.setHours(hour, 0, 0, 0);
    const supabase = createClient();
    const { error } = await supabase.from('tasks').update({ deadline: newDate.toISOString() }).eq('id', eventId);
    if (!error) router.refresh();
  };

  const handleDone = (id: string) => {
    startTransition(async () => {
      await markTaskDone(id);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteTask(id);
      router.refresh();
    });
  };

  const handleGoogleEventSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as unknown as GoogleEventForm;
    if (!data.title || !data.date) return;
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const res = await fetch('/api/calendar/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          date: data.date,
          startHour: parseInt(data.startHour),
          endHour: parseInt(data.endHour),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore creazione evento');
      }
      setGoogleForm({ open: false, date: '', hour: 9 });
      router.refresh();
    } catch (err: unknown) {
      setGoogleError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setGoogleLoading(false);
    }
  };

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass-card shadow-2xl border-white/5 bg-white/[0.01] rounded-2xl overflow-hidden">
      <TaskFormModal
        open={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        initialDate={selectedDate}
      />
      <TaskFormModal
        open={editingTask !== null}
        onClose={() => setEditingTask(null)}
        editTask={editingTask ?? undefined}
      />

      {/* Modal evento Google */}
      {googleForm.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setGoogleForm({ open: false, date: '', hour: 9 }) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 relative">
            <button
              onClick={() => setGoogleForm({ open: false, date: '', hour: 9 })}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <CalendarPlus className="w-6 h-6 text-accent" />
              <h2 className="text-lg font-bold text-gray-900">Nuovo Evento Google</h2>
            </div>
            <form onSubmit={handleGoogleEventSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Titolo</label>
                <input name="title" autoFocus required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                  placeholder="es. Call con cliente..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Data</label>
                <input name="date" type="date" required defaultValue={googleForm.date}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Inizio</label>
                  <input name="startHour" type="number" min="0" max="23" defaultValue={googleForm.hour}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Fine</label>
                  <input name="endHour" type="number" min="0" max="23" defaultValue={googleForm.hour + 1}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
                </div>
              </div>
              {googleError && <p className="text-sm text-red-600">{googleError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setGoogleForm({ open: false, date: '', hour: 9 })}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
                  Annulla
                </button>
                <button type="submit" disabled={googleLoading}
                  className="bg-accent text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50">
                  {googleLoading ? 'Creando...' : 'Crea Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-accent/10 rounded-lg">
            <CalendarIcon className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-white/90">Agenda Settimanale</h2>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
              Drag & Drop Attivo
              {initialEvents.length > 0 && (
                <span className="flex items-center gap-1 text-green-400/60 ml-2">
                  <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                  Google Sync OK
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setGoogleForm({ open: true, date: today, hour: 9 });
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition-all"
            title="Nuovo evento Google Calendar"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Evento
          </button>
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 7); setViewDate(d); }}
              className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/50 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest px-4 text-white/60 min-w-[170px] text-center">
              {days[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} — {days[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
            </span>
            <button
              onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 7); setViewDate(d); }}
              className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/50 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Griglia */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="min-w-[1100px]">
          <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-white/5 bg-white/[0.01]">
            <div className="p-4 flex items-center justify-center text-[9px] font-black uppercase tracking-[0.3em] text-white/10">GMT +1</div>
            {days.map((day, i) => (
              <div
                key={i}
                className={clsx(
                  "p-4 text-center border-l border-white/5 transition-colors",
                  day.toDateString() === new Date().toDateString() ? "bg-accent/[0.04]" : ""
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
                  {day.toLocaleDateString('it-IT', { weekday: 'short' })}
                </p>
                <p className={clsx(
                  "text-2xl font-black mt-1 tracking-tighter",
                  day.toDateString() === new Date().toDateString() ? "text-accent" : "text-white/80"
                )}>
                  {day.getDate()}
                </p>
              </div>
            ))}
          </div>

          <div className="relative">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-white/[0.04] group">
                <div className="py-12 flex items-center justify-center text-[10px] font-black text-white/10 group-hover:text-accent/40 transition-colors border-r border-white/5">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {days.map((day, i) => {
                  const events = getEventsForDayAndHour(day, hour);
                  return (
                    <div
                      key={i}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => handleDrop(e, day, hour)}
                      onClick={() => handleCellClick(day)}
                      className="relative border-l border-white/[0.03] min-h-[120px] hover:bg-white/[0.02] transition-colors cursor-crosshair group/slot"
                    >
                      <div className="absolute top-4 right-4 opacity-0 group-hover/slot:opacity-100 transition-opacity">
                        <Plus className="w-4 h-4 text-accent/30" />
                      </div>

                      <div className="absolute inset-x-2 top-2 flex flex-col gap-2 z-10">
                        {events.map((event) => {
                          const durationHours = (event.durationMinutes || 60) / 60;
                          // 120px per ora = altezza di ogni slot; sottraiamo 8px di margine
                          const blockHeight = durationHours > 1 ? durationHours * 120 - 8 : undefined;
                          return (
                          <div
                            key={event.id}
                            draggable={event.type === 'task'}
                            onDragStart={e => handleDragStart(e, event.id, event.type)}
                            onDragEnd={handleDragEnd}
                            onClick={e => e.stopPropagation()}
                            style={blockHeight ? { height: `${blockHeight}px` } : undefined}
                            className={clsx(
                              "group/card p-3 rounded-xl border text-[10px] font-bold leading-tight shadow-xl transition-all duration-300",
                              durationHours <= 1 && "hover:scale-[1.02] hover:brightness-110",
                              event.type === 'task' ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-60",
                              event.color
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={clsx(
                                "px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest",
                                event.type === 'task'
                                  ? (event.category === 'engagement' ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/50")
                                  : "bg-accent/20 text-accent"
                              )}>
                                {event.type === 'task' ? (event.category === 'engagement' ? 'Impegno' : 'Progetto') : 'Evento'}
                              </span>
                              {event.type === 'task' && (
                                <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                  <button onClick={() => handleDone(event.id)} className="p-1 hover:bg-green-500/20 rounded-md transition-all" title="Fatto">
                                    <Check className="w-3 h-3 text-green-400" />
                                  </button>
                                  <button onClick={() => event.rawTask && setEditingTask(event.rawTask)} className="p-1 hover:bg-white/10 rounded-md transition-all" title="Modifica">
                                    <Pencil className="w-3 h-3 text-white/50" />
                                  </button>
                                  <button onClick={() => handleDelete(event.id)} className="p-1 hover:bg-red-500/20 rounded-md transition-all" title="Elimina">
                                    <X className="w-3 h-3 text-red-400" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <span className="block truncate text-white/90">{event.title}</span>
                            {durationHours > 1 && (
                              <span className="block text-[9px] opacity-60 mt-1">
                                {event.start.getHours().toString().padStart(2,'0')}:00 – {event.end.getHours().toString().padStart(2,'0')}:00
                              </span>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
