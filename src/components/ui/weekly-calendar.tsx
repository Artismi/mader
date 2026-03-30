'use client'

import { useState, useMemo, useEffect, useTransition } from 'react';
import { clsx } from 'clsx';
import {
  Plus, ChevronLeft, ChevronRight, X, Check, Pencil,
  CalendarPlus, Copy, ClipboardPaste, Clock, User, Tag,
  ArrowRight, Zap, BookOpen, Briefcase
} from 'lucide-react';
import { TaskFormModal } from './nuovo-task-modal';
import { useRouter } from 'next/navigation';
import { markTaskDone, deleteTask, duplicateTask } from '@/app/actions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'event' | 'task';
  category?: 'task' | 'engagement';
  calLayer: 'impegni' | 'editoriale' | 'progetti';
  color: string;
  durationMinutes?: number;
  rawTask?: {
    id: string; title: string; type: string;
    category: 'task' | 'engagement'; deadline: string;
    client_id: string | null; client_name?: string; status?: string;
  };
}

type Layer = 'impegni' | 'editoriale' | 'progetti';

// ─── Config ───────────────────────────────────────────────────────────────────

const LAYERS: { id: Layer; label: string; icon: React.ElementType; dot: string; ring: string; badge: string }[] = [
  { id: 'impegni',    label: 'Impegni',    icon: Zap,       dot: 'bg-blue-400',   ring: 'ring-blue-400/40',   badge: 'bg-blue-500/15 text-blue-300 border-blue-500/20' },
  { id: 'editoriale', label: 'Editoriale', icon: BookOpen,  dot: 'bg-violet-400', ring: 'ring-violet-400/40', badge: 'bg-violet-500/15 text-violet-300 border-violet-500/20' },
  { id: 'progetti',   label: 'Progetti',   icon: Briefcase, dot: 'bg-amber-400',  ring: 'ring-amber-400/40',  badge: 'bg-amber-500/15 text-amber-300 border-amber-500/20' },
];

const LAYER_EVENT_COLOR: Record<Layer, string> = {
  impegni:    'bg-blue-500/10 border-blue-500/25 text-blue-100',
  editoriale: 'bg-violet-500/10 border-violet-500/25 text-violet-100',
  progetti:   'bg-amber-500/10 border-amber-500/25 text-amber-100',
};

const TYPE_LABELS: Record<string, string> = {
  design: 'Design', dev: 'Dev', bando: 'Bando',
  social: 'Social', finanze: 'Finanze', general: 'Gen.',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'Da fare', in_progress: 'In corso', done: 'Fatto',
};

function classifyTask(t: any): Layer {
  if (t.category === 'engagement') return 'impegni';
  if (t.type === 'social') return 'editoriale';
  return 'progetti';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeeklyCalendar({
  initialEvents,
  initialTasks,
}: {
  initialEvents: any[];
  initialTasks: any[];
}) {
  const router = useRouter();

  // Active layers — tutti on di default
  const [activeLayers, setActiveLayers] = useState<Set<Layer>>(new Set(['impegni', 'editoriale', 'progetti']));
  const toggleLayer = (l: Layer) =>
    setActiveLayers(prev => {
      const s = new Set(prev);
      s.has(l) ? s.delete(l) : s.add(l);
      return s;
    });

  const [viewDate, setViewDate] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<CalendarEvent['rawTask'] | null>(null);
  const [googleForm, setGoogleForm] = useState<{ open: boolean; date: string; hour: number }>({ open: false, date: '', hour: 9 });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [, startTransition] = useTransition();

  // Copy/paste
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<CalendarEvent | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ day: Date; hour: number } | null>(null);

  // Detail drawer
  const [previewTask, setPreviewTask] = useState<CalendarEvent | null>(null);

  // 08:00 – 19:00 (12 slot)
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  const days = useMemo(() => {
    const s = new Date(viewDate);
    const d = s.getDay();
    s.setDate(s.getDate() - d + (d === 0 ? -6 : 1));
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(s); x.setDate(s.getDate() + i); return x;
    });
  }, [viewDate]);

  // All events classified by layer
  const allEvents = useMemo<CalendarEvent[]>(() => [
    ...initialEvents.map(e => ({
      id: e.id,
      title: e.summary || '(Nessun titolo)',
      start: new Date(e.start?.dateTime || e.start?.date),
      end: new Date(e.end?.dateTime || e.end?.date),
      type: 'event' as const,
      calLayer: 'impegni' as Layer,
      color: LAYER_EVENT_COLOR.impegni,
    })),
    ...(initialTasks || []).map(t => {
      const layer = classifyTask(t);
      return {
        id: t.id,
        title: t.title,
        start: new Date(t.deadline),
        end: new Date(new Date(t.deadline).getTime() + (t.duration_minutes || 60) * 60000),
        type: 'task' as const,
        category: t.category as 'task' | 'engagement',
        calLayer: layer,
        color: LAYER_EVENT_COLOR[layer],
        durationMinutes: t.duration_minutes || 60,
        rawTask: {
          id: t.id, title: t.title, type: t.type, category: t.category,
          deadline: t.deadline, client_id: t.client_id,
          client_name: t.clients?.name, status: t.status,
        },
      };
    }),
  ], [initialEvents, initialTasks]);

  // Filtered by active layers
  const visibleEvents = useMemo(
    () => allEvents.filter(e => activeLayers.has(e.calLayer)),
    [allEvents, activeLayers]
  );

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'c' && hoveredEventId) {
        const ev = visibleEvents.find(x => x.id === hoveredEventId);
        if (ev?.type === 'task') { setClipboard(ev); setCopyFeedback(true); setTimeout(() => setCopyFeedback(false), 1800); }
      }
      if (ctrl && e.key === 'v' && clipboard && hoveredCell) {
        e.preventDefault();
        const d = new Date(hoveredCell.day); d.setHours(hoveredCell.hour, 0, 0, 0);
        startTransition(async () => {
          await duplicateTask({
            title: clipboard.title,
            type: clipboard.rawTask?.type || 'general',
            category: clipboard.category || 'task',
            deadline: d.toISOString(),
            client_id: clipboard.rawTask?.client_id || null,
            duration_minutes: clipboard.durationMinutes || 60,
          });
          router.refresh();
        });
      }
      if (e.key === 'Escape') { setPreviewTask(null); setClipboard(null); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hoveredEventId, clipboard, hoveredCell, visibleEvents, startTransition, router]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCellClick = (day: Date) => {
    setSelectedDate(day.toISOString().split('T')[0]);
    setIsTaskModalOpen(true);
  };

  const handleDrop = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    const nd = new Date(day); nd.setHours(hour, 0, 0, 0);
    startTransition(async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const sb = createClient();
      await sb.from('tasks').update({ deadline: nd.toISOString() }).eq('id', id);
      router.refresh();
    });
  };

  const done = (id: string) => startTransition(async () => { await markTaskDone(id); router.refresh(); });
  const del  = (id: string) => startTransition(async () => { await deleteTask(id); router.refresh(); });

  const submitGoogle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget)) as any;
    if (!fd.title || !fd.date) return;
    setGoogleLoading(true); setGoogleError('');
    try {
      const r = await fetch('/api/calendar/event', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: fd.title, date: fd.date, startHour: +fd.startHour, endHour: +fd.endHour }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Errore');
      setGoogleForm({ open: false, date: '', hour: 9 }); router.refresh();
    } catch (err: any) { setGoogleError(err.message || 'Errore'); }
    finally { setGoogleLoading(false); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const slotEvents = (day: Date, hour: number) =>
    visibleEvents.filter(e => e.start.toDateString() === day.toDateString() && e.start.getHours() === hour);

  const pasteHere = (day: Date, hour: number) =>
    !!clipboard &&
    hoveredCell?.day.toDateString() === day.toDateString() &&
    hoveredCell?.hour === hour;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.01]">

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <TaskFormModal open={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} initialDate={selectedDate} />
      <TaskFormModal open={editingTask !== null} onClose={() => setEditingTask(null)} editTask={editingTask ?? undefined} />

      {/* Google event modal */}
      {googleForm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setGoogleForm({ open: false, date: '', hour: 9 }) }}>
          <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-7 w-full max-w-sm mx-4 relative">
            <button onClick={() => setGoogleForm({ open: false, date: '', hour: 9 })} className="absolute top-4 right-4 text-white/30 hover:text-white/70"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-3 mb-5">
              <CalendarPlus className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm font-black text-white/80 uppercase tracking-widest">Nuovo Evento</h2>
            </div>
            <form onSubmit={submitGoogle} className="space-y-3">
              <input name="title" autoFocus required placeholder="Titolo…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-blue-400/40" />
              <input name="date" type="date" required defaultValue={googleForm.date}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-blue-400/40" />
              <div className="grid grid-cols-2 gap-2">
                <input name="startHour" type="number" min="0" max="23" defaultValue={googleForm.hour} placeholder="Inizio"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-blue-400/40" />
                <input name="endHour" type="number" min="0" max="23" defaultValue={googleForm.hour + 1} placeholder="Fine"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-blue-400/40" />
              </div>
              {googleError && <p className="text-xs text-red-400">{googleError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setGoogleForm({ open: false, date: '', hour: 9 })} className="text-xs text-white/30 hover:text-white/60 px-3 py-2">Annulla</button>
                <button type="submit" disabled={googleLoading}
                  className="bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-500/30 transition-colors disabled:opacity-50">
                  {googleLoading ? 'Creando…' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {previewTask && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setPreviewTask(null)}>
          <div className="w-80 bg-[#0c0c0c] border-l border-white/[0.07] h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-3">
                {(() => {
                  const cfg = LAYERS.find(l => l.id === previewTask.calLayer)!;
                  return (
                    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border mb-2', cfg.badge)}>
                      <cfg.icon className="w-2.5 h-2.5" /> {cfg.label}
                    </span>
                  );
                })()}
                <h3 className="text-base font-black text-white/90 leading-tight">{previewTask.title}</h3>
              </div>
              <button onClick={() => setPreviewTask(null)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/30"><X className="w-3.5 h-3.5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {previewTask.rawTask?.client_name && (
                <Row icon={<User className="w-3 h-3" />} label="Cliente" value={previewTask.rawTask.client_name} />
              )}
              <Row icon={<Clock className="w-3 h-3" />} label="Data"
                value={`${previewTask.start.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })} ${previewTask.start.getHours().toString().padStart(2,'0')}:00`} />
              <Row icon={<Tag className="w-3 h-3" />} label="Tipo"
                value={TYPE_LABELS[previewTask.rawTask?.type || ''] || previewTask.rawTask?.type || '—'} />
              {previewTask.rawTask?.status && (
                <Row icon={<Check className="w-3 h-3" />} label="Stato"
                  value={STATUS_LABELS[previewTask.rawTask.status] || previewTask.rawTask.status} />
              )}

              <div className="pt-2 space-y-2">
                <button onClick={() => done(previewTask.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all">
                  <Check className="w-3.5 h-3.5" /> Segna Fatto
                </button>
                <button onClick={() => { previewTask.rawTask && setEditingTask(previewTask.rawTask); setPreviewTask(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                  <Pencil className="w-3.5 h-3.5" /> Modifica
                </button>
              </div>
            </div>

            <div className="p-5 border-t border-white/5">
              <a href={`/incarichi/${previewTask.id}`}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white/80 transition-all group">
                <span>Scheda Completa</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Copy toast */}
      <div className={clsx(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111] border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all duration-300',
        copyFeedback ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      )}>
        <Copy className="w-3 h-3" /> Copiato — Ctrl+V per incollare
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">

        {/* Layer toggles */}
        <div className="flex items-center gap-1">
          {LAYERS.map(l => {
            const Icon = l.icon;
            const on = activeLayers.has(l.id);
            return (
              <button
                key={l.id}
                onClick={() => toggleLayer(l.id)}
                title={on ? `Nascondi ${l.label}` : `Mostra ${l.label}`}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border',
                  on
                    ? `${l.badge} border-opacity-100`
                    : 'bg-white/0 border-transparent text-white/20 hover:text-white/40'
                )}
              >
                <div className={clsx('w-1.5 h-1.5 rounded-full transition-all', on ? l.dot : 'bg-white/15')} />
                <Icon className="w-3 h-3" />
                {l.label}
                {(() => {
                  const count = allEvents.filter(e => e.calLayer === l.id).length;
                  return count > 0 && on ? (
                    <span className="ml-0.5 opacity-60">{count}</span>
                  ) : null;
                })()}
              </button>
            );
          })}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {activeLayers.has('impegni') && (
            <button
              onClick={() => setGoogleForm({ open: true, date: new Date().toISOString().split('T')[0], hour: 9 })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
            >
              <CalendarPlus className="w-3 h-3" /> Evento
            </button>
          )}
          {clipboard && (
            <button onClick={() => setClipboard(null)} title="Svuota appunti"
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/30 hover:text-red-400/60 transition-all">
              <X className="w-3 h-3" />
            </button>
          )}
          {/* Week nav */}
          <div className="flex items-center bg-white/5 rounded-lg border border-white/[0.06] overflow-hidden">
            <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate()-7); setViewDate(d); }}
              className="px-2 py-1.5 hover:bg-white/10 transition-all text-white/40 hover:text-white border-r border-white/[0.06]">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[9px] font-black uppercase tracking-widest px-3 text-white/50 whitespace-nowrap">
              {days[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} — {days[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
            </span>
            <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate()+7); setViewDate(d); }}
              className="px-2 py-1.5 hover:bg-white/10 transition-all text-white/40 hover:text-white border-l border-white/[0.06]">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Calendar grid ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto scrollbar-hide">
        {/* Day headers — sticky */}
        <div className="grid border-b border-white/[0.06] bg-[#090909] sticky top-0 z-10"
          style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
          <div className="py-2.5 flex items-center justify-center text-[7px] font-black uppercase tracking-widest text-white/10">ora</div>
          {days.map((day, i) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const dayEvents = visibleEvents.filter(e => e.start.toDateString() === day.toDateString());
            return (
              <div key={i} className={clsx('py-2 text-center border-l border-white/[0.05]', isToday && 'bg-white/[0.03]')}>
                <p className="text-[8px] font-bold uppercase tracking-widest text-white/20">
                  {day.toLocaleDateString('it-IT', { weekday: 'short' })}
                </p>
                <p className={clsx('text-base font-black tracking-tighter leading-none mt-0.5',
                  isToday ? 'text-white' : 'text-white/60')}>
                  {day.getDate()}
                </p>
                {/* Layer dots for this day */}
                {dayEvents.length > 0 && (
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    {LAYERS.filter(l => activeLayers.has(l.id) && dayEvents.some(e => e.calLayer === l.id)).map(l => (
                      <div key={l.id} className={clsx('w-1 h-1 rounded-full', l.dot)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hour rows */}
        {hours.map(hour => (
          <div key={hour} className="grid border-b border-white/[0.03] group/row"
            style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
            {/* Time label */}
            <div className="h-[56px] flex items-center justify-center text-[8px] font-black text-white/[0.12] group-hover/row:text-white/25 transition-colors border-r border-white/[0.05]">
              {hour.toString().padStart(2,'0')}
            </div>

            {/* Day cells */}
            {days.map((day, i) => {
              const events = slotEvents(day, hour);
              const paste  = pasteHere(day, hour);
              return (
                <div
                  key={i}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDrop(e, day, hour)}
                  onClick={() => handleCellClick(day)}
                  onMouseEnter={() => setHoveredCell({ day, hour })}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={clsx(
                    'relative border-l border-white/[0.04] h-[56px] cursor-crosshair group/cell transition-colors',
                    paste ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'
                  )}
                >
                  {/* Hint icons */}
                  <div className="absolute top-1.5 right-1.5 z-10">
                    {paste ? (
                      <div className="flex items-center gap-0.5 opacity-50">
                        <ClipboardPaste className="w-2.5 h-2.5 text-white/50" />
                      </div>
                    ) : (
                      <Plus className="w-2.5 h-2.5 text-white/20 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                    )}
                  </div>

                  {/* Event cards */}
                  <div className="absolute inset-x-1 top-1 flex flex-col gap-0.5 z-10">
                    {events.map(event => {
                      const dh = (event.durationMinutes || 60) / 60;
                      const bh = dh > 1 ? dh * 56 - 4 : undefined;
                      const isCopied = clipboard?.id === event.id;
                      return (
                        <div
                          key={event.id}
                          draggable={event.type === 'task'}
                          onDragStart={e => { e.dataTransfer.setData('text/plain', event.id); (e.currentTarget as HTMLElement).style.opacity = '0.4'; }}
                          onDragEnd={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                          onMouseEnter={e => { e.stopPropagation(); setHoveredEventId(event.id); }}
                          onMouseLeave={() => setHoveredEventId(null)}
                          onClick={e => { e.stopPropagation(); if (event.type === 'task') setPreviewTask(event); }}
                          style={bh ? { height: `${bh}px` } : undefined}
                          className={clsx(
                            'group/card px-1.5 py-1 rounded border text-[8px] font-bold leading-tight transition-all duration-150 cursor-pointer hover:brightness-125 overflow-hidden',
                            isCopied && 'ring-1 ring-white/20',
                            event.color,
                          )}
                        >
                          <div className="flex items-center justify-between gap-0.5">
                            <span className="truncate flex-1 text-[8px] font-bold opacity-90">{event.title}</span>
                            {event.type === 'task' && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity flex-shrink-0">
                                <button onClick={e => { e.stopPropagation(); setClipboard(event); setCopyFeedback(true); setTimeout(() => setCopyFeedback(false), 1800); }}
                                  className="p-0.5 hover:bg-white/10 rounded"><Copy className="w-2 h-2 opacity-60" /></button>
                                <button onClick={e => { e.stopPropagation(); done(event.id); }}
                                  className="p-0.5 hover:bg-green-500/20 rounded"><Check className="w-2 h-2 text-green-400" /></button>
                                <button onClick={e => { e.stopPropagation(); event.rawTask && setEditingTask(event.rawTask); }}
                                  className="p-0.5 hover:bg-white/10 rounded"><Pencil className="w-2 h-2 opacity-40" /></button>
                                <button onClick={e => { e.stopPropagation(); del(event.id); }}
                                  className="p-0.5 hover:bg-red-500/20 rounded"><X className="w-2 h-2 text-red-400" /></button>
                              </div>
                            )}
                          </div>
                          {event.rawTask?.client_name && (
                            <span className="block text-[7px] opacity-40 truncate mt-0.5">{event.rawTask.client_name}</span>
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
  );
}

// Small helper component
function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-white/25 flex-shrink-0">{icon}</div>
      <div>
        <p className="text-[8px] font-black uppercase tracking-widest text-white/20">{label}</p>
        <p className="text-xs font-semibold text-white/70 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
