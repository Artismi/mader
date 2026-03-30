'use client'

import { useState, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { TaskFormModal } from './nuovo-task-modal';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'event' | 'task';
  category?: 'task' | 'engagement';
  color?: string;
}

export function WeeklyCalendar({ initialEvents, initialTasks }: { initialEvents: any[], initialTasks: any[] }) {
  const router = useRouter();
  const [viewDate, setViewDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  
  // Orari: dalle 08:00 alle 20:00 (12 ore)
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);
  
  // Calcolo dei giorni della settimana corrente
  const days = useMemo(() => {
    const startOfWeek = new Date(viewDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Lunedì come inizio
    startOfWeek.setDate(diff);
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [viewDate]);

  // Formattazione eventi per la griglia
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
        end: new Date(new Date(t.deadline).getTime() + 3600000), // Default 1h
        type: 'task' as const,
        category: t.category as 'task' | 'engagement',
        color: t.category === 'engagement' 
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-200/90' 
          : 'bg-white/10 border-white/20 text-white/90 shadow-lg'
      }))
    ];
    return events;
  }, [initialEvents, initialTasks]);

  const getEventsForDayAndHour = (day: Date, hour: number) => {
    return gridEvents.filter(e => {
      const eDay = e.start.toDateString() === day.toDateString();
      const eHour = e.start.getHours() === hour;
      return eDay && eHour;
    });
  };

  const handleQuickCreate = (day: Date) => {
    const dateStr = day.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, eventId: string, eventType: string) => {
    e.dataTransfer.setData('text/plain', eventId);
    e.dataTransfer.setData('event-type', eventType);
    
    // Feedback visivo immediato (opzionale)
    const ghost = e.currentTarget as HTMLElement;
    ghost.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
  };

  const handleDrop = async (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('text/plain');
    const eventType = e.dataTransfer.getData('event-type');

    if (eventType === 'task') {
        const newDate = new Date(day);
        newDate.setHours(hour, 0, 0, 0);
        
        const supabase = createClient();
        const { error } = await supabase
            .from('tasks')
            .update({ deadline: newDate.toISOString() })
            .eq('id', eventId);
        
        if (!error) {
            router.refresh();
        }
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo impegno?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
        router.refresh();
    }
  };

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isCurrentHour = (day: Date, hour: number) => {
    return day.toDateString() === currentTime.toDateString() && currentTime.getHours() === hour;
  };

  return (
    <div className="glass-card shadow-2xl border-white/5 bg-white/[0.01] rounded-2xl overflow-hidden">
      <TaskFormModal open={isModalOpen} onClose={() => setIsModalOpen(false)} initialDate={selectedDate} />
      
      {/* Header Calendario */}
      <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-accent/10 rounded-lg">
            <CalendarIcon className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-white/90">
              Agenda Settimanale
            </h2>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
              Visualizzazione 12 Ore • Drag & Drop Attivo
              {initialEvents.length > 0 && (
                <span className="flex items-center gap-1 text-green-400/60 ml-2">
                  <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                  Google Sync OK
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            <button 
                onClick={() => {
                    const d = new Date(viewDate);
                    d.setDate(d.getDate() - 7);
                    setViewDate(d);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/50 hover:text-white"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest px-4 text-white/60 min-w-[170px] text-center">
                {days[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} — {days[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
            </span>
            <button 
                onClick={() => {
                    const d = new Date(viewDate);
                    d.setDate(d.getDate() + 7);
                    setViewDate(d);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/50 hover:text-white"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Griglia Calendario */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="min-w-[1100px]">
          {/* Giorni Header */}
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

          {/* Slot Orari */}
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
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, day, hour)}
                      onClick={() => handleQuickCreate(day)}
                      className="relative border-l border-white/[0.03] min-h-[120px] hover:bg-white/[0.02] transition-colors cursor-crosshair group/slot"
                    >
                      {/* Plus indicator on hover */}
                      <div className="absolute top-4 right-4 opacity-0 group-hover/slot:opacity-100 transition-opacity">
                         <Plus className="w-4 h-4 text-accent/30" />
                      </div>

                      <div className="absolute inset-x-2 top-2 flex flex-col gap-2 z-10">
                        {events.map((event) => (
                          <div 
                            key={event.id}
                            draggable={event.type === 'task'}
                            onDragStart={(e) => handleDragStart(e, event.id, event.type)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => e.stopPropagation()}
                            className={clsx(
                              "group/card p-3 rounded-xl border text-[10px] font-bold leading-tight shadow-xl transition-all duration-300",
                              "hover:scale-[1.02] hover:brightness-110",
                              event.type === 'task' ? "cursor-grab active:cursor-grabbing border-white/10 bg-white/5 backdrop-blur-md" : "cursor-default opacity-60 border-accent/20 bg-accent/10",
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
                                  <button 
                                    onClick={() => handleDelete(event.id)}
                                    className="opacity-0 group-hover/card:opacity-100 p-1 hover:bg-red-500/20 rounded-md transition-all"
                                  >
                                    <X className="w-3 h-3 text-red-400" />
                                  </button>
                                )}
                            </div>
                            <span className="block truncate text-white/90">{event.title}</span>
                          </div>
                        ))}
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
