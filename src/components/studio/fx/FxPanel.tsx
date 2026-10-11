'use client'

/**
 * Pannello Effetti, sul modello di Canva: tre schede.
 * - Filtri: miniature dei filtri pronti sull'oggetto vero + intensità
 * - Regola: luce, colore, texture
 * - Effetti: una pila di effetti, ognuno attivabile, regolabile, riordinabile
 * Funziona su testo, forme, tratti, immagini e gruppi (anche su più oggetti selezionati).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import * as fabric from 'fabric'
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ADJUST_GROUPS, FX_DEFS, LOOKS, fxDef, newFx, type Adjust, type AdjustKey, type FxEntry, type FxId, type Look } from './catalog'
import { applyFx, lookPreviews } from './engine'

type FxTarget = fabric.FabricObject & { adjust?: Adjust; look?: Look; fx?: FxEntry[] }
type Tab = 'filtri' | 'regola' | 'effetti'

export function FxPanel({ fabricRef, selKey, initialTab = 'filtri' }: {
  fabricRef: React.RefObject<fabric.Canvas | null>
  /** cambia quando cambia la selezione: il pannello rilegge l'oggetto */
  selKey: unknown
  initialTab?: Tab
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  // l'oggetto mostrato: si rilegge dal canvas fuori dal render (alla selezione e dopo ogni modifica)
  const [view, setView] = useState<{ obj?: FxTarget; v: number }>({ v: 0 })

  const targets = useCallback((): FxTarget[] => {
    const c = fabricRef.current; if (!c) return []
    return c.getActiveObjects().filter(o => !(o as { isArtboard?: boolean }).isArtboard) as FxTarget[]
  }, [fabricRef])
  const refresh = useCallback(() => setView(s => ({ obj: targets()[0], v: s.v + 1 })), [targets])
  const first = view.obj

  /** modifica i dati su tutti gli oggetti selezionati, ricostruisce i filtri e lascia un passo di cronologia */
  const mutate = useCallback((fn: (o: FxTarget) => void) => {
    const c = fabricRef.current; if (!c) return
    const list = targets()
    list.forEach(o => { fn(o); applyFx(o) })
    c.requestRenderAll()
    list.forEach(o => c.fire('object:modified', { target: o }))
    refresh()
  }, [fabricRef, targets, refresh])

  useEffect(() => { const id = requestAnimationFrame(refresh); return () => cancelAnimationFrame(id) }, [selKey, refresh])

  if (!first) return <p className="text-[10px] text-white/30 py-6 text-center">Seleziona un oggetto</p>

  return (
    <div className="space-y-3">
      <div className="flex p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
        {(['filtri', 'regola', 'effetti'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex-1 h-7 rounded-[10px] text-[10px] font-bold capitalize transition-colors',
              tab === t ? 'bg-white/[0.12] text-white' : 'text-white/40 hover:text-white/70')}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'filtri' && <Looks obj={first} selKey={selKey} mutate={mutate} />}
      {tab === 'regola' && <Adjustments obj={first} mutate={mutate} />}
      {tab === 'effetti' && <Effects obj={first} mutate={mutate} />}
    </div>
  )
}

/* ───────── Filtri pronti con miniature ───────── */
function Looks({ obj, selKey, mutate }: { obj: FxTarget; selKey: unknown; mutate: (fn: (o: FxTarget) => void) => void }) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  useEffect(() => {
    // le miniature si calcolano dopo il disegno, per non bloccare il clic che ha selezionato l'oggetto
    const id = requestAnimationFrame(() => { try { setThumbs(lookPreviews(obj)) } catch { setThumbs({}) } })
    return () => cancelAnimationFrame(id)
  }, [obj, selKey])
  const current = obj.look?.id ?? ''
  const amount = obj.look?.amount ?? 100
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[{ id: '', label: 'Nessuno' }, ...LOOKS].map(l => (
          <button key={l.id || 'none'} onClick={() => mutate(o => { o.look = l.id ? { id: l.id, amount: o.look?.id === l.id ? o.look.amount : 100 } : undefined })}
            className="group flex flex-col items-center gap-1" title={l.label}>
            <span className={cn('w-full aspect-square rounded-xl overflow-hidden border-2 bg-[repeating-conic-gradient(#222_0_25%,#2a2a2a_0_50%)] bg-[length:12px_12px] flex items-center justify-center transition-all',
              current === l.id ? 'border-violet-400' : 'border-transparent group-hover:border-white/20')}>
              {/* eslint-disable-next-line @next/next/no-img-element -- miniature generate al volo (data URL) */}
              {thumbs[l.id] ? <img src={thumbs[l.id]} alt="" className="max-w-full max-h-full object-contain" /> : <span className="w-3 h-3 rounded-full bg-white/10 animate-pulse" />}
            </span>
            <span className={cn('text-[9px] font-semibold truncate max-w-full', current === l.id ? 'text-white' : 'text-white/45')}>{l.label}</span>
          </button>
        ))}
      </div>
      {current && (
        <Slider label="Intensità" value={amount} min={0} max={100}
          onChange={v => mutate(o => { if (o.look) o.look = { ...o.look, amount: v } })} />
      )}
    </div>
  )
}

/* ───────── Regolazioni ───────── */
function Adjustments({ obj, mutate }: { obj: FxTarget; mutate: (fn: (o: FxTarget) => void) => void }) {
  const a = obj.adjust ?? {}
  const touched = Object.values(a).some(x => x)
  const set = (k: AdjustKey, v: number) => mutate(o => { o.adjust = { ...(o.adjust ?? {}), [k]: v } })
  return (
    <div className="space-y-4">
      {ADJUST_GROUPS.map(g => (
        <div key={g.label} className="space-y-2.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">{g.label}</p>
          {g.items.map(it => (
            <Slider key={it.key} label={it.label} value={a[it.key] ?? 0} min={it.min} max={100} centered={it.min < 0}
              onChange={v => set(it.key, v)} />
          ))}
        </div>
      ))}
      <button disabled={!touched} onClick={() => mutate(o => { o.adjust = undefined })}
        className="w-full h-8 rounded-lg flex items-center justify-center gap-2 text-[10px] font-semibold text-white/50 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30">
        <RotateCcw className="w-3 h-3" /> Ripristina regolazioni
      </button>
    </div>
  )
}

/* ───────── Effetti a pila ───────── */
function Effects({ obj, mutate }: { obj: FxTarget; mutate: (fn: (o: FxTarget) => void) => void }) {
  const stack = obj.fx ?? []
  const [open, setOpen] = useState<number | null>(stack.length ? stack.length - 1 : null)
  const [adding, setAdding] = useState(stack.length === 0)
  const groups = useMemo(() => [...new Set(FX_DEFS.map(d => d.group))], [])

  const add = (id: FxId) => {
    mutate(o => { o.fx = [...(o.fx ?? []), newFx(id)] })
    setOpen(stack.length); setAdding(false)
  }
  const edit = (i: number, fn: (e: FxEntry) => FxEntry) => mutate(o => { o.fx = (o.fx ?? []).map((e, k) => k === i ? fn({ ...e, p: { ...e.p } }) : e) })
  const move = (i: number, d: -1 | 1) => mutate(o => {
    const f = [...(o.fx ?? [])]; const j = i + d
    if (j < 0 || j >= f.length) return
    ;[f[i], f[j]] = [f[j], f[i]]; o.fx = f
  })

  return (
    <div className="space-y-2">
      {stack.map((e, i) => {
        const d = fxDef(e.id); if (!d) return null
        const isOpen = open === i
        return (
          <div key={i} className={cn('rounded-xl border transition-colors', e.on ? 'border-white/10 bg-white/[0.05]' : 'border-white/[0.05] bg-transparent')}>
            <div className="flex items-center gap-1 pl-3 pr-1 h-9">
              <button className={cn('flex-1 text-left text-[11px] font-semibold', e.on ? 'text-white/85' : 'text-white/30')} onClick={() => setOpen(isOpen ? null : i)}>
                {d.label}
              </button>
              <IconBtn title={e.on ? 'Nascondi' : 'Mostra'} onClick={() => edit(i, x => ({ ...x, on: !x.on }))}>{e.on ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}</IconBtn>
              <IconBtn title="Su (applicato prima)" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp className="w-3 h-3" /></IconBtn>
              <IconBtn title="Giù (applicato dopo)" onClick={() => move(i, 1)} disabled={i === stack.length - 1}><ChevronDown className="w-3 h-3" /></IconBtn>
              <IconBtn title="Rimuovi" onClick={() => mutate(o => { o.fx = (o.fx ?? []).filter((_, k) => k !== i) })}><Trash2 className="w-3 h-3" /></IconBtn>
            </div>
            {isOpen && (
              <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-white/[0.05]">
                {!d.noAmount && <Slider label="Intensità" value={e.amount} min={0} max={100} onChange={v => edit(i, x => ({ ...x, amount: v }))} />}
                {d.params.map(p => p.type === 'range'
                  ? <Slider key={p.key} label={p.label} value={Number(e.p[p.key] ?? p.def)} min={p.min} max={p.max} onChange={v => edit(i, x => { x.p[p.key] = v; return x })} />
                  : p.type === 'toggle'
                    ? <Toggle key={p.key} label={p.label} on={Number(e.p[p.key] ?? p.def) > 0} onChange={v => edit(i, x => { x.p[p.key] = v ? 1 : 0; return x })} />
                    : <ColorRow key={p.key} label={p.label} value={String(e.p[p.key] ?? p.def)} onChange={v => edit(i, x => { x.p[p.key] = v; return x })} />)}
              </div>
            )}
          </div>
        )
      })}

      {adding ? (
        <div className="rounded-xl border border-white/[0.08] p-2.5 space-y-3">
          {groups.map(g => (
            <div key={g}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1.5">{g}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {FX_DEFS.filter(d => d.group === g).map(d => (
                  <button key={d.id} onClick={() => add(d.id)} title={d.hint}
                    className="h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-[10px] font-semibold text-white/70 text-left px-2.5 truncate">{d.label}</button>
                ))}
              </div>
            </div>
          ))}
          {stack.length > 0 && <button onClick={() => setAdding(false)} className="w-full text-[10px] text-white/40 hover:text-white/70">chiudi</button>}
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full h-9 rounded-xl border border-dashed border-white/15 text-[10px] font-semibold text-white/55 hover:text-white hover:border-white/30 flex items-center justify-center gap-1.5">
          <Plus className="w-3 h-3" /> Aggiungi effetto
        </button>
      )}
    </div>
  )
}

/* ───────── controlli ───────── */
function Slider({ label, value, min, max, centered, onChange }: { label: string; value: number; min: number; max: number; centered?: boolean; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100
  const zero = centered ? ((0 - min) / (max - min)) * 100 : 0
  return (
    <label className="block space-y-1" onDoubleClick={() => onChange(centered ? 0 : min)} title="Doppio clic per azzerare">
      <span className="flex justify-between text-[10px]">
        <span className="text-white/55">{label}</span>
        <span className="font-mono text-white/35 tabular-nums">{Math.round(value)}</span>
      </span>
      <span className="relative block h-4">
        <span className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1 rounded-full bg-white/10" />
        <span className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-violet-400/80"
          style={{ left: `${Math.min(zero, pct)}%`, width: `${Math.abs(pct - zero)}%` }} />
        <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label={label} />
        <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow pointer-events-none" style={{ left: `${pct}%` }} />
      </span>
    </label>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="w-full flex items-center justify-between text-[10px] text-white/55">
      {label}
      <span className={cn('w-7 h-4 rounded-full p-0.5 transition-colors', on ? 'bg-violet-400' : 'bg-white/15')}>
        <span className={cn('block w-3 h-3 rounded-full bg-white transition-transform', on && 'translate-x-3')} />
      </span>
    </button>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between text-[10px] text-white/55 cursor-pointer">
      {label}
      <span className="flex items-center gap-2">
        <span className="font-mono text-white/35">{value}</span>
        <span className="relative w-6 h-6 rounded-md border border-white/20 overflow-hidden" style={{ background: value }}>
          <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label={label} />
        </span>
      </span>
    </label>
  )
}

function IconBtn({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button title={title} aria-label={title} onClick={onClick} disabled={disabled}
      className="w-6 h-6 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent">
      {children}
    </button>
  )
}
