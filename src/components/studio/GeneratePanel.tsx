'use client'

/**
 * Pannello "Genera" della libreria: galleria di generatori procedurali
 * (adesivi, badge, sparkle, guilloche, Truchet, dot matrix…) con editor dei
 * parametri, palette rapide, variazioni per seme e inserimento vettoriale.
 */
import React, { useMemo, useState } from 'react'
import { ArrowLeft, Dices, Plus, Shuffle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  GENERATORS, GEN_CATEGORIES, GEN_PALETTES, applyPalette, defaultValues, randomValues,
  renderGenerator, svgToDataUri, type GenDef, type GenParam, type GenValues,
} from './libraries/generative-assets'

const newSeed = () => Math.floor(Math.random() * 1e9)

// sfondo a scacchi per leggere le trasparenze, come in Photoshop
const CHECKER = 'repeating-conic-gradient(#2a2a2a 0% 25%, #1f1f1f 0% 50%) 50% / 16px 16px'

export function GeneratePanel({ search, onInsert }: { search: string; onInsert: (svg: string, name: string) => void }) {
  const [active, setActive] = useState<GenDef | null>(null)
  const q = search.trim().toLowerCase()

  // miniature della galleria: calcolate una sola volta (sono funzioni pure)
  const thumbs = useMemo(() => Object.fromEntries(GENERATORS.map(g => [g.id, svgToDataUri(renderGenerator(g, defaultValues(g), 7))])), [])

  if (active) return <GenEditor key={active.id} gen={active} onBack={() => setActive(null)} onInsert={onInsert} />

  return (
    <div className="space-y-6">
      {GEN_CATEGORIES.map(cat => {
        const items = GENERATORS.filter(g => g.cat === cat && (!q || `${g.label} ${g.hint}`.toLowerCase().includes(q)))
        if (!items.length) return null
        return (
          <div key={cat}>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-3 ml-1">{cat}</p>
            <div className="grid grid-cols-2 gap-2.5">
              {items.map(g => (
                <button key={g.id} onClick={() => setActive(g)} title={g.hint}
                  className="group flex flex-col items-stretch gap-1.5 p-2 bg-white/5 border border-white/8 rounded-2xl hover:bg-white/10 hover:border-accent/30 transition-all">
                  <div className="aspect-[4/3] rounded-xl flex items-center justify-center overflow-hidden" style={{ background: CHECKER }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbs[g.id]} alt={g.label} className="max-w-[86%] max-h-[86%] object-contain group-hover:scale-105 transition-transform" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/80 text-left px-0.5">{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GenEditor({ gen, onBack, onInsert }: { gen: GenDef; onBack: () => void; onInsert: (svg: string, name: string) => void }) {
  const [values, setValues] = useState<GenValues>(() => defaultValues(gen))
  const [seed, setSeed] = useState(7)
  const [pal, setPal] = useState<string | null>(null)

  const svg = useMemo(() => renderGenerator(gen, values, seed), [gen, values, seed])
  const preview = useMemo(() => svgToDataUri(svg), [svg])

  // variazioni: stessi parametri, semi vicini. Se il generatore ignora il seme non le mostriamo.
  const variations = useMemo(() => {
    const seeds = Array.from({ length: 6 }, (_, i) => seed + 101 * (i + 1))
    const out = seeds.map(s => ({ s, svg: renderGenerator(gen, values, s) }))
    return out.every(v => v.svg === svg) ? [] : out.map(v => ({ s: v.s, uri: svgToDataUri(v.svg) }))
  }, [gen, values, seed, svg])

  const set = (k: string, v: GenValues[string]) => { setValues(prev => ({ ...prev, [k]: v })); if (k.startsWith('c') || k === 'ink') setPal(null) }
  const hasColors = gen.params.some(p => p.type === 'color')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors" title="Tutti i generatori"><ArrowLeft className="w-4 h-4" /></button>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-white/80">{gen.label}</p>
          <p className="text-[9px] text-white/30 truncate">{gen.hint}</p>
        </div>
      </div>

      <div className="aspect-square rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden" style={{ background: CHECKER }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="" className="max-w-[90%] max-h-[90%] object-contain" />
      </div>

      <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-1.5">
        <button onClick={() => setSeed(newSeed())} title="Nuovo seme: stessa ricetta, disegno diverso"
          className="h-9 flex items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10">
          <Shuffle className="w-3.5 h-3.5" /> Seme
        </button>
        <button onClick={() => { const s = newSeed(); setValues(v => randomValues(gen, v, s)); setSeed(s); setPal(null) }} title="Parametri e colori a caso"
          className="h-9 flex items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10">
          <Dices className="w-3.5 h-3.5" /> Dado
        </button>
        <button onClick={() => onInsert(svg, gen.label)}
          className="h-9 flex items-center justify-center gap-1.5 rounded-xl bg-accent text-black text-[9px] font-black uppercase tracking-widest hover:brightness-110">
          <Plus className="w-3.5 h-3.5" /> Inserisci
        </button>
      </div>

      {variations.length > 0 && (
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-2 ml-1">Variazioni</p>
          <div className="grid grid-cols-6 gap-1.5">
            {variations.map(v => (
              <button key={v.s} onClick={() => setSeed(v.s)} className="aspect-square rounded-lg border border-white/10 hover:border-accent/50 overflow-hidden flex items-center justify-center" style={{ background: CHECKER }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.uri} alt="" className="max-w-[88%] max-h-[88%] object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      {hasColors && (
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-2 ml-1">Palette</p>
          <div className="grid grid-cols-4 gap-1.5">
            {GEN_PALETTES.map(pl => (
              <button key={pl.id} onClick={() => { setValues(v => applyPalette(gen, v, pl)); setPal(pl.id) }} title={pl.label}
                className={cn('h-7 rounded-lg overflow-hidden flex border transition-all', pal === pl.id ? 'border-accent' : 'border-white/10 hover:border-white/30')}>
                {[pl.c1, pl.c2, pl.c3, pl.ink].map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {gen.params.map(p => <ParamRow key={p.key} p={p} value={values[p.key]} onChange={v => set(p.key, v)} />)}
      </div>

      <p className="text-[9px] leading-relaxed text-white/25 px-1">
        Inserito come gruppo vettoriale: Ctrl/Cmd+Shift+G lo separa per modificare i singoli pezzi, testi compresi. Nei testi, il carattere | va a capo.
      </p>
    </div>
  )
}

function ParamRow({ p, value, onChange }: { p: GenParam; value: GenValues[string]; onChange: (v: GenValues[string]) => void }) {
  const label = <span className="text-[9px] text-white/40 w-20 flex-shrink-0 truncate">{p.label}</span>
  if (p.type === 'range') return (
    <div className="flex items-center gap-2">
      {label}
      <input type="range" min={p.min} max={p.max} step={p.step ?? 1} value={Number(value)} onChange={e => onChange(Number(e.target.value))} className="flex-1 accent-accent min-w-0" />
      <span className="text-[9px] text-white/50 w-7 text-right tabular-nums flex-shrink-0">{Number(value)}</span>
    </div>
  )
  if (p.type === 'color') return (
    <div className="flex items-center gap-2">
      {label}
      <input type="color" value={String(value)} onChange={e => onChange(e.target.value)} className="w-7 h-7 rounded-lg bg-transparent border border-white/10 cursor-pointer flex-shrink-0" />
      <span className="text-[9px] text-white/30 font-mono uppercase">{String(value)}</span>
    </div>
  )
  if (p.type === 'toggle') return (
    <div className="flex items-center gap-2">
      {label}
      <button onClick={() => onChange(!value)} className={cn('w-8 h-4 rounded-full transition-colors relative flex-shrink-0', value ? 'bg-accent' : 'bg-white/10')}>
        <div className={cn('w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all', value ? 'left-4' : 'left-0.5')} />
      </button>
    </div>
  )
  if (p.type === 'select') return (
    <div className="flex items-start gap-2">
      {label}
      <div className="flex flex-wrap gap-1 flex-1">
        {p.options.map((o, i) => (
          <button key={o} onClick={() => onChange(i)}
            className={cn('px-2 py-1 rounded-md text-[9px] font-bold transition-all', Number(value) === i ? 'bg-accent text-black' : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10')}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
  return (
    <div className="flex items-center gap-2">
      {label}
      <input type="text" value={String(value)} onChange={e => onChange(e.target.value)}
        className="flex-1 min-w-0 h-8 px-2.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/80 focus:outline-none focus:border-accent/40" />
    </div>
  )
}
