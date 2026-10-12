'use client'

/**
 * Pannello Effetti, sul modello di Canva (e con la profondità di Lightroom e
 * degli stili livello di Photoshop):
 * - Filtri: filtri pronti per famiglia, con miniature sull'oggetto vero + intensità
 * - Regola: bilanciamento, tono, curva, presenza, mixer colore, color grading, pellicola
 * - Effetti: catalogo per categoria con miniature dal vivo; pila di effetti
 *   applicati, ognuno con varianti, intensità e parametri
 * Vale per testo, forme, tratti, immagini e gruppi, anche su più oggetti insieme.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type * as fabric from 'fabric'
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ADJUST_GROUPS, CURVES, FX_CATS, FX_DEFS, GRADE_ZONES, HSL_BANDS, LOOKS, fxDef, newFx,
  type Adjust, type FxCat, type FxEntry, type FxId, type Look, type Param,
} from './catalog'
import { applyFx, applyTextStyle, fxPreviews, lookPreviews, stylePreview, variantEntries, TEXT_REF } from './engine'
import { TEXT_STYLES } from './text-styles'
import { onAssetReady } from './gl'

type FxTarget = fabric.FabricObject & { adjust?: Adjust; look?: Look; fx?: FxEntry[] }
type Tab = 'stili' | 'filtri' | 'regola' | 'effetti'
type Mutate = (fn: (o: FxTarget) => void) => void

export function FxPanel({ fabricRef, selKey, initialTab = 'filtri' }: {
  fabricRef: React.RefObject<fabric.Canvas | null>
  /** cambia quando cambia la selezione: il pannello rilegge l'oggetto */
  selKey: unknown
  initialTab?: Tab
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [view, setView] = useState<{ obj?: FxTarget; v: number }>({ v: 0 })

  const targets = useCallback((): FxTarget[] => {
    const c = fabricRef.current; if (!c) return []
    return c.getActiveObjects().filter(o => !(o as { isArtboard?: boolean }).isArtboard) as FxTarget[]
  }, [fabricRef])
  const refresh = useCallback(() => setView(s => ({ obj: targets()[0], v: s.v + 1 })), [targets])

  /** modifica i dati su tutti gli oggetti selezionati e lascia un passo di cronologia */
  const mutate = useCallback<Mutate>(fn => {
    const c = fabricRef.current; if (!c) return
    const list = targets()
    list.forEach(o => { fn(o); applyFx(o) })
    c.requestRenderAll()
    list.forEach(o => c.fire('object:modified', { target: o }))
    refresh()
  }, [fabricRef, targets, refresh])

  useEffect(() => { const id = requestAnimationFrame(refresh); return () => cancelAnimationFrame(id) }, [selKey, refresh])

  const obj = view.obj
  if (!obj) return <p className="text-[10px] text-white/30 py-6 text-center">Seleziona un oggetto</p>

  return (
    <div className="space-y-3">
      <div className="flex p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.06] sticky top-0 z-10 backdrop-blur">
        {((isText(obj) ? ['stili', 'filtri', 'regola', 'effetti'] : ['filtri', 'regola', 'effetti']) as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex-1 h-7 rounded-[10px] text-[10px] font-bold capitalize transition-colors',
              tab === t ? 'bg-white/[0.12] text-white' : 'text-white/40 hover:text-white/70')}>
            {t}
            {t === 'effetti' && !!obj.fx?.length && <span className="ml-1 text-violet-300">{obj.fx.length}</span>}
          </button>
        ))}
      </div>
      {tab === 'stili' && isText(obj) && <TextStyles obj={obj} fabricRef={fabricRef} targets={targets} onDone={refresh} />}
      {tab === 'filtri' && <Looks obj={obj} selKey={selKey} mutate={mutate} />}
      {tab === 'regola' && <Adjustments obj={obj} mutate={mutate} />}
      {tab === 'effetti' && <Effects obj={obj} selKey={selKey} mutate={mutate} />}
    </div>
  )
}

const isText = (o: fabric.FabricObject) => o.type === 'textbox' || o.type === 'i-text' || o.type === 'text'

/* ═════════ Stili testo pronti ═════════ */
const styleCache = new Map<string, string>()
function TextStyles({ obj, fabricRef, targets, onDone }: { obj: FxTarget; fabricRef: React.RefObject<fabric.Canvas | null>; targets: () => FxTarget[]; onDone: () => void }) {
  const sample = String((obj as unknown as { text?: string }).text ?? '').trim().split(/\s+/)[0] || 'Aa'
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [tick, setTick] = useState(0)
  // le anteprime con materiali si rifanno quando arrivano le texture
  useEffect(() => onAssetReady(() => { TEXT_STYLES.forEach(st => { if (st.fx.some(f => f[0] === 'impressione')) styleCache.delete(`${st.id}|${sample}`) }); setTick(t => t + 1) }), [sample])
  useEffect(() => {
    let alive = true
    ;(async () => {
      for (const st of TEXT_STYLES) {
        const k = `${st.id}|${sample}`
        if (!styleCache.has(k)) { try { styleCache.set(k, await stylePreview(st, sample)) } catch { /* anteprima non disponibile */ } }
        if (!alive) return
        setThumbs(t => (t[st.id] === styleCache.get(k) ? t : { ...t, [st.id]: styleCache.get(k)! }))
        await new Promise(r => requestAnimationFrame(r))
      }
    })()
    return () => { alive = false }
  }, [sample, tick])
  const apply = async (id: string) => {
    const st = TEXT_STYLES.find(s => s.id === id); const c = fabricRef.current; if (!st || !c) return
    setBusy(id)
    for (const o of targets()) {
      // fondo reale sotto il testo: la tavola che contiene il suo centro
      const p = o.getCenterPoint()
      const ab = c.getObjects().filter(x => (x as { isArtboard?: boolean }).isArtboard).reverse().find(x => { const r = x.getBoundingRect(); return p.x >= r.left && p.x <= r.left + r.width && p.y >= r.top && p.y <= r.top + r.height })
      await applyTextStyle(o, st, typeof ab?.fill === 'string' ? ab.fill : undefined)
      c.fire('object:modified', { target: o })
    }
    c.requestRenderAll(); setBusy(''); onDone()
  }
  const groups = [...new Set(TEXT_STYLES.map(s => s.group))]
  return (
    <div className="space-y-4">
      <p className="text-[10px] text-white/35 leading-relaxed">Carattere, colore ed effetti già calibrati. Dopo l&apos;applicazione si ritoccano da «Effetti».</p>
      {groups.map(g => (
        <div key={g}>
          <SectionTitle>{g}</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {TEXT_STYLES.filter(s => s.group === g).map(st => (
              <button key={st.id} onClick={() => apply(st.id)} title={st.label}
                className={cn('group rounded-xl overflow-hidden border text-left transition-colors', busy === st.id ? 'border-violet-400' : 'border-white/[0.06] hover:border-white/25')}>
                <div className="aspect-[168/100] w-full" style={{ background: st.swatch }}>
                  {thumbs[st.id] && <img src={thumbs[st.id]} alt="" className="w-full h-full object-cover" />}
                </div>
                <span className="block px-2 py-1.5 text-[9px] font-bold text-white/60 group-hover:text-white truncate">{st.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═════════ Filtri pronti ═════════ */
function Looks({ obj, selKey, mutate }: { obj: FxTarget; selKey: unknown; mutate: Mutate }) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  useEffect(() => {
    // dopo il disegno, per non bloccare il clic che ha selezionato l'oggetto
    const id = requestAnimationFrame(() => { try { setThumbs(lookPreviews(obj)) } catch { setThumbs({}) } })
    return () => cancelAnimationFrame(id)
  }, [obj, selKey])
  const current = obj.look?.id ?? ''
  const families = [...new Set(LOOKS.map(l => l.family))]
  const pick = (id: string) => mutate(o => { o.look = id ? { id, amount: o.look?.id === id ? o.look.amount : 100 } : undefined })
  return (
    <div className="space-y-4">
      {current && (
        <div className="rounded-xl bg-white/[0.04] p-3">
          <Slider label={`Intensità · ${LOOKS.find(l => l.id === current)?.label}`} value={obj.look?.amount ?? 100} min={0} max={100}
            onChange={v => mutate(o => { if (o.look) o.look = { ...o.look, amount: v } })} />
        </div>
      )}
      <Thumb label="Originale" src={thumbs['']} active={!current} onClick={() => pick('')} wide />
      {families.map(f => (
        <div key={f}>
          <SectionTitle>{f}</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {LOOKS.filter(l => l.family === f).map(l => <Thumb key={l.id} label={l.label} src={thumbs[l.id]} active={current === l.id} onClick={() => pick(l.id)} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═════════ Regolazioni ═════════ */
function Adjustments({ obj, mutate }: { obj: FxTarget; mutate: Mutate }) {
  const a = obj.adjust ?? {}
  const [open, setOpen] = useState<string>('tone')
  const [band, setBand] = useState<string>('red')
  const set = (k: string, v: number) => mutate(o => { o.adjust = { ...(o.adjust ?? {}), [k]: v } })
  const resetKeys = (keys: string[]) => mutate(o => { const n = { ...(o.adjust ?? {}) }; keys.forEach(k => delete n[k]); o.adjust = n })
  const touched = (keys: string[]) => keys.some(k => a[k])

  const sections: { id: string; label: string; keys: string[]; body: React.ReactNode }[] = [
    ...ADJUST_GROUPS.filter(g => g.id !== 'film' && g.id !== 'detail').map(g => ({
      id: g.id, label: g.label, keys: g.items.map(i => i.key),
      body: g.items.map(it => <Slider key={it.key} label={it.label} value={a[it.key] ?? it.def ?? 0} min={it.min} max={it.max} centered={it.min < 0} onChange={v => set(it.key, v)} />),
    })),
    {
      id: 'curve', label: 'Curva', keys: ['curve'],
      body: <Chips options={[...CURVES]} value={a.curve ?? 0} onChange={v => set('curve', v)} />,
    },
    {
      id: 'hsl', label: 'Mixer colore', keys: HSL_BANDS.flatMap(b => ['h', 's', 'l'].map(x => `hsl_${b.key}_${x}`)),
      body: (
        <>
          <div className="flex justify-between">
            {HSL_BANDS.map(b => (
              <button key={b.key} title={b.label} onClick={() => setBand(b.key)}
                className={cn('w-6 h-6 rounded-full border-2 transition-transform', band === b.key ? 'border-white scale-110' : 'border-transparent')} style={{ background: b.swatch }} />
            ))}
          </div>
          {(['h', 's', 'l'] as const).map(x => {
            const k = `hsl_${band}_${x}`
            return <Slider key={k} label={{ h: 'Tinta', s: 'Saturazione', l: 'Luminanza' }[x] + ' · ' + HSL_BANDS.find(b => b.key === band)!.label.toLowerCase()} value={a[k] ?? 0} min={-100} max={100} centered onChange={v => set(k, v)} />
          })}
        </>
      ),
    },
    {
      id: 'grade', label: 'Color grading', keys: ['gSh_h', 'gSh_s', 'gMid_h', 'gMid_s', 'gHi_h', 'gHi_s', 'gBal'],
      body: (
        <>
          {GRADE_ZONES.map(z => (
            <div key={z.key} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: `hsl(${a[`${z.key}_h`] ?? 0} ${Math.max(15, a[`${z.key}_s`] ?? 0)}% 55%)` }} />
                <span className="text-[10px] text-white/55">{z.label}</span>
              </div>
              <HueSlider value={a[`${z.key}_h`] ?? 0} onChange={v => set(`${z.key}_h`, v)} />
              <Slider label="Forza" value={a[`${z.key}_s`] ?? 0} min={0} max={100} onChange={v => set(`${z.key}_s`, v)} />
            </div>
          ))}
          <Slider label="Bilanciamento" value={a.gBal ?? 0} min={-100} max={100} centered onChange={v => set('gBal', v)} />
        </>
      ),
    },
    ...ADJUST_GROUPS.filter(g => g.id === 'detail' || g.id === 'film').map(g => ({
      id: g.id, label: g.label, keys: g.items.map(i => i.key),
      body: g.items.map(it => <Slider key={it.key} label={it.label} value={a[it.key] ?? it.def ?? 0} min={it.min} max={it.max} centered={it.min < 0} onChange={v => set(it.key, v)} />),
    })),
  ]

  return (
    <div className="space-y-1.5">
      {sections.map(sec => (
        <div key={sec.id} className="rounded-xl border border-white/[0.06] overflow-hidden">
          <button onClick={() => setOpen(open === sec.id ? '' : sec.id)} className="w-full flex items-center justify-between px-3 h-9 text-[11px] font-semibold text-white/75 hover:bg-white/[0.03]">
            <span className="flex items-center gap-2">{sec.label}{touched(sec.keys) && <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />}</span>
            <span className="flex items-center gap-1">
              {touched(sec.keys) && <span role="button" title="Ripristina" onClick={e => { e.stopPropagation(); resetKeys(sec.keys) }} className="p-1 rounded hover:bg-white/10 text-white/40"><RotateCcw className="w-3 h-3" /></span>}
              <ChevronDown className={cn('w-3.5 h-3.5 text-white/30 transition-transform', open === sec.id && 'rotate-180')} />
            </span>
          </button>
          {open === sec.id && <div className="px-3 pb-3 pt-1 space-y-2.5">{sec.body}</div>}
        </div>
      ))}
      <button disabled={!Object.values(a).some(x => x)} onClick={() => mutate(o => { o.adjust = undefined })}
        className="w-full h-8 mt-2 rounded-lg flex items-center justify-center gap-2 text-[10px] font-semibold text-white/50 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30">
        <RotateCcw className="w-3 h-3" /> Ripristina tutte le regolazioni
      </button>
    </div>
  )
}

/* ═════════ Effetti ═════════ */
function Effects({ obj, selKey, mutate }: { obj: FxTarget; selKey: unknown; mutate: Mutate }) {
  const stack = obj.fx ?? []
  const [open, setOpen] = useState<number | null>(stack.length ? stack.length - 1 : null)
  const [adding, setAdding] = useState(stack.length === 0)
  const [cat, setCat] = useState<FxCat>('Stile')

  const add = (id: FxId, variant?: string) => {
    mutate(o => {
      // sul testo gli effetti si tarano sul corpo: restano in proporzione se il testo cambia misura
      if (isText(o as fabric.FabricObject) && !(o as { fxRef?: number }).fxRef && !(o.fx ?? []).length) (o as { fxRef?: number }).fxRef = TEXT_REF
      o.fx = [...(o.fx ?? []), newFx(id, variant)]
    })
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
          <div key={i} className={cn('rounded-xl border transition-colors', e.on ? 'border-white/10 bg-white/[0.05]' : 'border-white/[0.05]')}>
            <div className="flex items-center gap-0.5 pl-3 pr-1 h-9">
              <button className={cn('flex-1 text-left text-[11px] font-semibold truncate', e.on ? 'text-white/85' : 'text-white/30')} onClick={() => setOpen(isOpen ? null : i)}>
                {d.label}{e.variant && <span className="font-normal text-white/35"> · {d.variants.find(v => v.id === e.variant)?.label ?? 'personalizzato'}</span>}
              </button>
              <IconBtn title={e.on ? 'Nascondi' : 'Mostra'} onClick={() => edit(i, x => ({ ...x, on: !x.on }))}>{e.on ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}</IconBtn>
              <IconBtn title="Su (applicato prima)" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp className="w-3 h-3" /></IconBtn>
              <IconBtn title="Giù (applicato dopo)" onClick={() => move(i, 1)} disabled={i === stack.length - 1}><ChevronDown className="w-3 h-3" /></IconBtn>
              <IconBtn title="Rimuovi" onClick={() => mutate(o => { o.fx = (o.fx ?? []).filter((_, k) => k !== i) })}><Trash2 className="w-3 h-3" /></IconBtn>
            </div>
            {isOpen && (
              <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/[0.05]">
                <Variants obj={obj} selKey={selKey} id={e.id} current={e.variant}
                  onPick={vid => edit(i, x => ({ ...newFx(x.id, vid), on: x.on, amount: x.amount }))} />
                {!d.noAmount && <Slider label="Intensità" value={e.amount} min={0} max={100} onChange={v => edit(i, x => ({ ...x, amount: v }))} />}
                {d.params.map(p => <ParamRow key={p.key} p={p} value={e.p[p.key] ?? (p as { def: number | string }).def}
                  onChange={v => edit(i, x => { x.p[p.key] = v; x.variant = undefined; return x })} />)}
              </div>
            )}
          </div>
        )
      })}

      {adding ? (
        <div className="rounded-xl border border-white/[0.08] p-2.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <SectionTitle>Aggiungi effetto</SectionTitle>
            {stack.length > 0 && <IconBtn title="Chiudi" onClick={() => setAdding(false)}><X className="w-3 h-3" /></IconBtn>}
          </div>
          <div className="flex flex-wrap gap-1">
            {FX_CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={cn('h-6 px-2 rounded-md text-[9px] font-bold', cat === c ? 'bg-violet-500/25 text-violet-200' : 'bg-white/[0.04] text-white/45 hover:text-white/75')}>{c}</button>
            ))}
          </div>
          <Catalog obj={obj} selKey={selKey} cat={cat} onAdd={add} />
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

/** catalogo di una categoria: ogni effetto con la sua miniatura sull'oggetto vero */
function Catalog({ obj, selKey, cat, onAdd }: { obj: FxTarget; selKey: unknown; cat: FxCat; onAdd: (id: FxId) => void }) {
  const defs = useMemo(() => FX_DEFS.filter(d => d.cat === cat), [cat])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  useEffect(() => {
    const id = requestAnimationFrame(() => { try { setThumbs(fxPreviews(obj, defs.map(d => ({ key: d.id, entry: newFx(d.id) })))) } catch { /* anteprime facoltative */ } })
    return () => cancelAnimationFrame(id)
  }, [obj, selKey, defs])
  return (
    <div className="grid grid-cols-3 gap-2">
      {defs.map(d => <Thumb key={d.id} label={d.label} title={d.hint} src={thumbs[d.id]} onClick={() => onAdd(d.id)} />)}
    </div>
  )
}

function Variants({ obj, selKey, id, current, onPick }: { obj: FxTarget; selKey: unknown; id: FxId; current?: string; onPick: (v: string) => void }) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const variants = fxDef(id)?.variants ?? []
  useEffect(() => {
    const r = requestAnimationFrame(() => { try { setThumbs(fxPreviews(obj, variantEntries(id), 64)) } catch { /* facoltative */ } })
    return () => cancelAnimationFrame(r)
  }, [obj, selKey, id])
  if (!variants.length) return null
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {variants.map(v => <Thumb key={v.id} label={v.label} src={thumbs[v.id]} active={current === v.id} onClick={() => onPick(v.id)} small />)}
    </div>
  )
}

/* ═════════ controlli ═════════ */
function Thumb({ label, src, active, onClick, title, small, wide }: { label: string; src?: string; active?: boolean; onClick: () => void; title?: string; small?: boolean; wide?: boolean }) {
  return (
    <button onClick={onClick} title={title ?? label} className={cn('group flex flex-col items-center gap-1 min-w-0', wide && 'w-1/3')}>
      <span className={cn('w-full aspect-square rounded-xl overflow-hidden border-2 flex items-center justify-center transition-all',
        'bg-[repeating-conic-gradient(#1d1d1d_0_25%,#262626_0_50%)] bg-[length:10px_10px]',
        active ? 'border-violet-400' : 'border-transparent group-hover:border-white/20')}>
        {/* eslint-disable-next-line @next/next/no-img-element -- miniature generate al volo (data URL) */}
        {src ? <img src={src} alt="" className="w-full h-full object-contain" /> : <span className="w-3 h-3 rounded-full bg-white/10 animate-pulse" />}
      </span>
      <span className={cn('font-semibold truncate max-w-full', small ? 'text-[8px]' : 'text-[9px]', active ? 'text-white' : 'text-white/45')}>{label}</span>
    </button>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1.5">{children}</p>
}

function ParamRow({ p, value, onChange }: { p: Param; value: number | string; onChange: (v: number | string) => void }) {
  if (p.type === 'range') return <Slider label={p.label} value={Number(value)} min={p.min} max={p.max} centered={p.min < 0} onChange={onChange} />
  if (p.type === 'toggle') return <Toggle label={p.label} on={Number(value) > 0} onChange={v => onChange(v ? 1 : 0)} />
  if (p.type === 'select') return (
    <div className="space-y-1">
      <span className="text-[10px] text-white/55">{p.label}</span>
      <Chips options={p.options} value={Number(value)} onChange={onChange} />
    </div>
  )
  return <ColorRow label={p.label} value={String(value)} onChange={onChange} />
}

function Chips({ options, value, onChange }: { options: string[]; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o, i) => (
        <button key={o} onClick={() => onChange(i)}
          className={cn('h-6 px-2 rounded-md text-[9px] font-semibold', value === i ? 'bg-white text-black' : 'bg-white/[0.06] text-white/55 hover:text-white/85')}>{o}</button>
      ))}
    </div>
  )
}

function Slider({ label, value, min, max, centered, onChange }: { label: string; value: number; min: number; max: number; centered?: boolean; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100
  const zero = centered ? ((0 - min) / (max - min)) * 100 : 0
  return (
    <label className="block space-y-1" onDoubleClick={() => onChange(centered ? 0 : min)} title="Doppio clic per azzerare">
      <span className="flex justify-between text-[10px]">
        <span className="text-white/55 truncate">{label}</span>
        <span className="font-mono text-white/35 tabular-nums">{Math.round(value)}</span>
      </span>
      <span className="relative block h-4">
        <span className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1 rounded-full bg-white/10" />
        <span className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-violet-400/80" style={{ left: `${Math.min(zero, pct)}%`, width: `${Math.abs(pct - zero)}%` }} />
        <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label={label} />
        <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow pointer-events-none" style={{ left: `${pct}%` }} />
      </span>
    </label>
  )
}

function HueSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="relative block h-4" title="Tinta">
      <span className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-2 rounded-full"
        style={{ background: 'linear-gradient(90deg,#f33,#fa3,#ff3,#3f3,#3ff,#33f,#f3f,#f33)' }} />
      <input type="range" min={0} max={360} value={value} onChange={e => onChange(Number(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label="Tinta" />
      <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow pointer-events-none" style={{ left: `${(value / 360) * 100}%`, background: `hsl(${value} 90% 55%)` }} />
    </span>
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
