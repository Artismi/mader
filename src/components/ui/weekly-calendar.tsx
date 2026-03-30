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
  calLayer: Layer;
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

const HOURS = Array.from({ length: 10 }, (_, i) => i + 9); // 09–18

const LAYERS: {
  id: Layer; label: string; icon: React.ElementType;
  dot: string; badge: string; activeBg: string;
}[] = [
  { id: 'impegni',    label: 'Impegni',    icon: Zap,       dot: 'bg-sky-400',    badge: 'text-sky-300',    activeBg: 'bg-sky-500/10 border-sky-500/25' },
  { id: 'editoriale', label: 'Editoriale', icon: BookOpen,  dot: 'bg-violet-400', badge: 'text-violet-300', activeBg: 'bg-violet-500/10 border-violet-500/25' },
  { id: 'progetti',   label: 'Progetti',   icon: Briefcase, dot: 'bg-amber-400',  badge: 'text-amber-300',  activeBg: 'bg-amber-500/10 border-amber-500/25' },
];

const LAYER_COLOR: Record<Layer, string> = {
  impegni:    'bg-sky-500/10 border-sky-500/20 text-sky-100',
  editoriale: 'bg-violet-500/10 border-violet-500/20 text-violet-100',
  progetti:   'bg-amber-500/10 border-amber-500/20 text-amber-100',
};

const TYPE_LABELS: Record<string, string> = {
  design: 'Design', dev: 'Dev', bando: 'Bando',
  social: 'Social', finanze: 'Fin.', general: 'Gen.',
};
const STATUS_LABELS: Record<string, string> = {
  todo: 'Da fare', in_progress: 'In corso', done: 'Fatto',
};

function classify(t: any): Layer {
  if (t.category === 'engagement') return 'impegni';
  if (t.type === 'social') return 'editoriale';
  return 'progetti';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeeklyCalendar({ initialEvents, initialTasks }: {
  initialEvents: any[]; initialTasks: any[];
}) {
  const router = useRouter();

  const [active, setActive] = useState<Set<Layer>>(new Set(['impegni', 'editoriale', 'progetti']));
  const toggle = (l: Layer) => setActive(p => { const s = new Set(p); s.has(l) ? s.delete(l) : s.add(l); return s; });

  const [viewDate, setViewDate]   = useState(new Date());
  const [taskModal, setTaskModal] = useState(false);
  const [selDate,  setSelDate]    = useState<string | undefined>();
  const [editing,  setEditing]    = useState<CalendarEvent['rawTask'] | null>(null);
  const [gForm,    setGForm]      = useState<{ open: boolean; date: string; hour: number }>({ open: false, date: '', hour: 9 });
  const [gLoading, setGLoading]   = useState(false);
  const [gError,   setGError]     = useState('');
  const [, tx] = useTransition();

  const [hoveredEv,   setHoveredEv]   = useState<string | null>(null);
  const [clipboard,   setClipboard]   = useState<CalendarEvent | null>(null);
  const [copyFb,      setCopyFb]      = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ day: Date; hour: number } | null>(null);
  const [preview,     setPreview]     = useState<CalendarEvent | null>(null);

  const days = useMemo(() => {
    const s = new Date(viewDate);
    const d = s.getDay();
    s.setDate(s.getDate() - d + (d === 0 ? -6 : 1));
    return Array.from({ length: 7 }, (_, i) => { const x = new Date(s); x.setDate(s.getDate() + i); return x; });
  }, [viewDate]);

  const allEvents = useMemo<CalendarEvent[]>(() => [
    ...initialEvents.map(e => ({
      id: e.id, title: e.summary || '(Nessun titolo)',
      start: new Date(e.start?.dateTime || e.start?.date),
      end: new Date(e.end?.dateTime || e.end?.date),
      type: 'event' as const, calLayer: 'impegni' as Layer,
      color: LAYER_COLOR.impegni,
    })),
    ...(initialTasks || []).map(t => {
      const layer = classify(t);
      return {
        id: t.id, title: t.title,
        start: new Date(t.deadline),
        end: new Date(new Date(t.deadline).getTime() + (t.duration_minutes || 60) * 60000),
        type: 'task' as const, category: t.category as 'task' | 'engagement',
        calLayer: layer, color: LAYER_COLOR[layer],
        durationMinutes: t.duration_minutes || 60,
        rawTask: {
          id: t.id, title: t.title, type: t.type, category: t.category,
          deadline: t.deadline, client_id: t.client_id,
          client_name: t.clients?.name, status: t.status,
        },
      };
    }),
  ], [initialEvents, initialTasks]);

  const visible = useMemo(() => allEvents.filter(e => active.has(e.calLayer)), [allEvents, active]);

  // Keyboard Ctrl+C / Ctrl+V
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'c' && hoveredEv) {
        const ev = visible.find(x => x.id === hoveredEv);
        if (ev?.type === 'task') { setClipboard(ev); setCopyFb(true); setTimeout(() => setCopyFb(false), 1600); }
      }
      if (ctrl && e.key === 'v' && clipboard && hoveredCell) {
        e.preventDefault();
        const d = new Date(hoveredCell.day); d.setHours(hoveredCell.hour, 0, 0, 0);
        tx(async () => {
          await duplicateTask({ title: clipboard.title, type: clipboard.rawTask?.type || 'general',
            category: clipboard.category || 'task', deadline: d.toISOString(),
            client_id: clipboard.rawTask?.client_id || null, duration_minutes: clipboard.durationMinutes || 60 });
          router.refresh();
        });
      }
      if (e.key === 'Escape') { setPreview(null); setClipboard(null); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hoveredEv, clipboard, hoveredCell, visible, tx, router]);

  // Handlers
  const openNew = (day: Date) => { setSelDate(day.toISOString().split('T')[0]); setTaskModal(true); };
  const drop = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    const d = new Date(day); d.setHours(hour, 0, 0, 0);
    tx(async () => {
      const { createClient } = await import('@/lib/supabase/client');
      await createClient().from('tasks').update({ deadline: d.toISOString() }).eq('id', id);
      router.refresh();
    });
  };
  const done = (id: string) => tx(async () => { await markTaskDone(id); router.refresh(); });
  const del  = (id: string) => tx(async () => { await deleteTask(id);   router.refresh(); });
  const copy = (ev: CalendarEvent) => { setClipboard(ev); setCopyFb(true); setTimeout(() => setCopyFb(false), 1600); };

  const submitGoogle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget)) as any;
    setGLoading(true); setGError('');
    try {
      const r = await fetch('/api/calendar/event', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: fd.title, date: fd.date, startHour: +fd.startHour, endHour: +fd.endHour }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Errore');
      setGForm({ open: false, date: '', hour: 9 }); router.refresh();
    } catch (err: any) { setGError(err.message); }
    finally { setGLoading(false); }
  };

  const slotEvs = (day: Date, hour: number) =>
    visible.filter(e => e.start.toDateString() === day.toDateString() && e.start.getHours() === hour);

  const isPaste = (day: Date, hour: number) =>
    !!clipboard && hoveredCell?.day.toDateString() === day.toDateString() && hoveredCell?.hour === hour;

  const navPrev = () => { const d = new Date(viewDate); d.setDate(d.getDate()-7); setViewDate(d); };
  const navNext = () => { const d = new Date(viewDate); d.setDate(d.getDate()+7); setViewDate(d); };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col rounded-xl overflow-hidden border border-white/[0.06] bg-[#080808]">

      {/* Modals */}
      <TaskFormModal open={taskModal}    onClose={() => setTaskModal(false)} initialDate={selDate} />
      <TaskFormModal open={editing !== null} onClose={() => setEditing(null)} editTask={editing ?? undefined} />

      {/* Google event modal */}
      {gForm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setGForm({ open: false, date: '', hour: 9 }) }}>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-80 shadow-2xl relative">
            <button onClick={() => setGForm({ open: false, date: '', hour: 9 })} className="absolute top-3 right-3 text-white/30 hover:text-white/70"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-2 mb-4">
              <CalendarPlus className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-black uppercase tracking-widest text-white/70">Nuovo Evento</span>
            </div>
            <form onSubmit={submitGoogle} className="space-y-2.5">
              <input name="title" autoFocus required placeholder="Titolo…"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-sky-400/40" />
              <input name="date" type="date" required defaultValue={gForm.date}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-sky-400/40" />
              <div className="grid grid-cols-2 gap-2">
                <input name="startHour" type="number" min="0" max="23" defaultValue={gForm.hour}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-sky-400/40" />
                <input name="endHour" type="number" min="0" max="23" defaultValue={gForm.hour + 1}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-sky-400/40" />
              </div>
              {gError && <p className="text-[10px] text-red-400">{gError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setGForm({ open: false, date: '', hour: 9 })} className="text-xs text-white/30 px-3 py-1.5">Annulla</button>
                <button type="submit" disabled={gLoading}
                  className="bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-sky-500/30 disabled:opacity-50">
                  {gLoading ? '…' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {preview && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setPreview(null)}>
          <div className="w-72 bg-[#0b0b0b] border-l border-white/[0.07] h-full flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {(() => { const l = LAYERS.find(x => x.id === preview.calLayer)!; const Icon = l.icon;
                  return <span className={clsx('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border mb-1.5', l.activeBg, l.badge)}>
                    <Icon className="w-2.5 h-2.5" />{l.label}</span>; })()}
                <h3 className="text-sm font-black text-white/90 leading-tight">{preview.title}</h3>
              </div>
              <button onClick={() => setPreview(null)} className="text-white/25 hover:text-white/60 p-1"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {preview.rawTask?.client_name && <DrawerRow icon={<User className="w-3 h-3"/>} label="Cliente" value={preview.rawTask.client_name} />}
              <DrawerRow icon={<Clock className="w-3 h-3"/>} label="Data"
                value={`${preview.start.toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'})} ${preview.start.getHours().toString().padStart(2,'0')}:00`} />
              <DrawerRow icon={<Tag className="w-3 h-3"/>} label="Tipo" value={TYPE_LABELS[preview.rawTask?.type||'']||'—'} />
              {preview.rawTask?.status && <DrawerRow icon={<Check className="w-3 h-3"/>} label="Stato" value={STATUS_LABELS[preview.rawTask.status]||preview.rawTask.status} />}
              <div className="pt-2 space-y-1.5">
                <button onClick={() => done(preview.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all">
                  <Check className="w-3 h-3"/> Segna Fatto
                </button>
                <button onClick={() => { preview.rawTask && setEditing(preview.rawTask); setPreview(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                  <Pencil className="w-3 h-3"/> Modifica
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-white/5">
              <a href={`/incarichi/${preview.id}`}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white/70 transition-all group">
                <span>Scheda Completa</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"/>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Copy toast */}
      <div className={clsx(
        'fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111] border border-white/10 text-white/50 text-[9px] font-black uppercase tracking-widest shadow-2xl transition-all duration-200',
        copyFb ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5 pointer-events-none'
      )}>
        <Copy className="w-3 h-3"/> Copiato · Ctrl+V per incollare
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 h-10 border-b border-white/[0.06] bg-[#090909]">

        {/* Layer toggles */}
        <div className="flex items-center gap-1">
          {LAYERS.map(l => {
            const Icon = l.icon; const on = active.has(l.id);
            const count = allEvents.filter(e => e.calLayer === l.id).length;
            return (
              <button key={l.id} onClick={() => toggle(l.id)}
                className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border',
                  on ? `${l.activeBg} ${l.badge}` : 'border-transparent text-white/15 hover:text-white/35'
                )}>
                <div className={clsx('w-1.5 h-1.5 rounded-full', on ? l.dot : 'bg-white/15')} />
                <Icon className="w-3 h-3"/>
                <span className="hidden sm:inline">{l.label}</span>
                {on && count > 0 && <span className="opacity-50">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {active.has('impegni') && (
            <button onClick={() => setGForm({ open: true, date: new Date().toISOString().split('T')[0], hour: 9 })}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-all">
              <CalendarPlus className="w-3 h-3"/> <span className="hidden sm:inline">Evento</span>
            </button>
          )}
          {clipboard && (
            <button onClick={() => setClipboard(null)} title="Svuota appunti"
              className="p-1 rounded-lg border border-white/10 text-white/25 hover:text-red-400/60 transition-all">
              <X className="w-3 h-3"/>
            </button>
          )}
          <div className="flex items-center bg-white/[0.04] rounded-lg border border-white/[0.06] overflow-hidden h-7">
            <button onClick={navPrev} className="px-1.5 h-full hover:bg-white/10 transition-all text-white/40 border-r border-white/[0.06]">
              <ChevronLeft className="w-3 h-3"/>
            </button>
            <span className="text-[8px] font-black uppercase tracking-widest px-2.5 text-white/40 whitespace-nowrap">
              {days[0].toLocaleDateString('it-IT', { day:'numeric', month:'short' })} — {days[6].toLocaleDateString('it-IT', { day:'numeric', month:'short' })}
            </span>
            <button onClick={navNext} className="px-1.5 h-full hover:bg-white/10 transition-all text-white/40 border-l border-white/[0.06]">
              <ChevronRight className="w-3 h-3"/>
            </button>
          </div>
        </div>
      </div>

      {/* ── Calendar grid — flat CSS grid, fills remaining height ─────── */}
      {/*
        gridTemplateColumns: 40px (time) + 7 × 1fr (days)
        gridTemplateRows: auto (day headers) + 10 × 1fr (hours 09–18)
        → rows share available height perfectly, no scroll needed
      */}
      <div
        className="flex-1 min-h-0 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: '40px repeat(7, 1fr)',
          gridTemplateRows: `auto repeat(${HOURS.length}, 1fr)`,
        }}
      >
        {/* ── Row 0: day headers ────────────────────────────────────────── */}
        {/* time corner */}
        <div className="border-b border-r border-white/[0.06] bg-[#090909]" />

        {days.map((day, i) => {
          const isToday = day.toDateString() === new Date().toDateString();
          const dayEvs  = visible.filter(e => e.start.toDateString() === day.toDateString());
          return (
            <div key={`dh-${i}`} className={clsx(
              'border-b border-l border-white/[0.06] bg-[#090909] flex flex-col items-center justify-center py-1.5 gap-0.5',
              isToday && 'bg-white/[0.025]'
            )}>
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">
                {day.toLocaleDateString('it-IT', { weekday: 'short' })}
              </span>
              <span className={clsx('text-base font-black tracking-tighter leading-none',
                isToday ? 'text-white' : 'text-white/55')}>
                {day.getDate()}
              </span>
              {/* Layer dots */}
              {dayEvs.length > 0 && (
                <div className="flex gap-0.5">
                  {LAYERS.filter(l => active.has(l.id) && dayEvs.some(e => e.calLayer === l.id)).map(l => (
                    <div key={l.id} className={clsx('w-1 h-1 rounded-full', l.dot)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Rows 1–N: hour slots ──────────────────────────────────────── */}
        {HOURS.flatMap(hour => [

          /* Time label cell */
          <div key={`tl-${hour}`}
            className="border-b border-r border-white/[0.04] bg-[#070707] flex items-start justify-center pt-1.5">
            <span className="text-[8px] font-black text-white/[0.18]">
              {hour.toString().padStart(2,'0')}
            </span>
          </div>,

          /* 7 day cells */
          ...days.map((day, di) => {
            const evs   = slotEvs(day, hour);
            const paste = isPaste(day, hour);
            return (
              <div
                key={`sc-${hour}-${di}`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => drop(e, day, hour)}
                onClick={() => openNew(day)}
                onMouseEnter={() => setHoveredCell({ day, hour })}
                onMouseLeave={() => setHoveredCell(null)}
                className={clsx(
                  'relative border-b border-l border-white/[0.04] cursor-crosshair overflow-hidden transition-colors group/cell',
                  paste ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]',
                  day.toDateString() === new Date().toDateString() && 'bg-white/[0.01]'
                )}
              >
                {/* Hint */}
                <div className="absolute top-1 right-1 z-20 pointer-events-none">
                  {paste
                    ? <ClipboardPaste className="w-2.5 h-2.5 text-white/25"/>
                    : <Plus className="w-2.5 h-2.5 text-white/10 opacity-0 group-hover/cell:opacity-100 transition-opacity"/>
                  }
                </div>

                {/* Events */}
                <div className="absolute inset-x-0.5 inset-y-0.5 flex flex-col gap-0.5 overflow-hidden z-10">
                  {evs.map(ev => (
                    <div
                      key={ev.id}
                      draggable={ev.type === 'task'}
                      onDragStart={e => { e.dataTransfer.setData('text/plain', ev.id); (e.currentTarget as HTMLElement).style.opacity = '0.4'; }}
                      onDragEnd={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                      onMouseEnter={e => { e.stopPropagation(); setHoveredEv(ev.id); }}
                      onMouseLeave={() => setHoveredEv(null)}
                      onClick={e => { e.stopPropagation(); if (ev.type === 'task') setPreview(ev); }}
                      className={clsx(
                        'group/ev flex items-center justify-between gap-0.5 px-1.5 rounded border text-[8px] font-semibold leading-none cursor-pointer overflow-hidden transition-all hover:brightness-125',
                        'min-h-[18px]',
                        clipboard?.id === ev.id && 'ring-1 ring-white/20',
                        ev.color,
                      )}
                    >
                      <span className="truncate flex-1">{ev.title}</span>
                      {ev.type === 'task' && (
                        <div className="flex items-center gap-px opacity-0 group-hover/ev:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={e=>{e.stopPropagation();copy(ev)}} className="p-0.5 hover:bg-white/10 rounded"><Copy className="w-2 h-2 opacity-50"/></button>
                          <button onClick={e=>{e.stopPropagation();done(ev.id)}} className="p-0.5 hover:bg-green-500/20 rounded"><Check className="w-2 h-2 text-green-400"/></button>
                          <button onClick={e=>{e.stopPropagation();ev.rawTask&&setEditing(ev.rawTask)}} className="p-0.5 hover:bg-white/10 rounded"><Pencil className="w-2 h-2 opacity-40"/></button>
                          <button onClick={e=>{e.stopPropagation();del(ev.id)}} className="p-0.5 hover:bg-red-500/20 rounded"><X className="w-2 h-2 text-red-400"/></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }),
        ])}
      </div>
    </div>
  );
}

function DrawerRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-white/25 flex-shrink-0">{icon}</div>
      <div>
        <p className="text-[7px] font-black uppercase tracking-widest text-white/20">{label}</p>
        <p className="text-xs font-semibold text-white/65 mt-px">{value}</p>
      </div>
    </div>
  );
}
