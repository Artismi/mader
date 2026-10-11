'use client'

/**
 * Pannello "Genera": il laboratorio grafico dello Studio. Ricette d'autore
 * (sigilli neo-tribali, gotico, cromo, inchiostro, distorsioni, decori leggeri)
 * renderizzate su pixel veri e inserite in alta risoluzione.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Dices, Loader2, Plus, Shuffle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FORMATS, RECIPES, RECIPE_CATS, defaults, runRecipe, shuffle, type RParam, type RValues, type Recipe } from './genera/recipes'
import { loadLabFonts } from './genera/fonts'

const newSeed = () => Math.floor(Math.random() * 1e6)
const CHECKER = 'repeating-conic-gradient(#2a2a2a 0% 25%, #1f1f1f 0% 50%) 50% / 14px 14px'

/** lascia respirare il thread dell'interfaccia tra un render e l'altro */
const idle = () => new Promise<void>(res => setTimeout(res, 0))

function toUrl(c: HTMLCanvasElement, transparent: boolean, q = 0.92) {
  return transparent ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', q)
}

export function GeneratePanel({ search, onInsert }: { search: string; onInsert: (url: string, name: string) => void }) {
  const [active, setActive] = useState<Recipe | null>(null)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [fontsReady, setFontsReady] = useState(false)
  const q = search.trim().toLowerCase()

  useEffect(() => {
    let alive = true
    ;(async () => {
      await loadLabFonts()
      if (!alive) return
      setFontsReady(true)
      for (const rc of RECIPES) {
        await idle()
        if (!alive) return
        try {
          const c = runRecipe(rc, defaults(rc), 11, rc.piece ? 'pezzo' : '4:5', 0.14)
          setThumbs(t => ({ ...t, [rc.id]: toUrl(c, !!rc.piece, 0.8) }))
        } catch (e) { console.warn('[genera] anteprima', rc.id, e) }
      }
    })()
    return () => { alive = false }
  }, [])

  if (active) return <Editor key={active.id} rc={active} onBack={() => setActive(null)} onInsert={onInsert} fontsReady={fontsReady} />

  return (
    <div className="space-y-6">
      {RECIPE_CATS.map(cat => {
        const items = RECIPES.filter(r => r.cat === cat && (!q || `${r.label} ${r.hint}`.toLowerCase().includes(q)))
        if (!items.length) return null
        return (
          <div key={cat}>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-3 ml-1">{cat}</p>
            <div className="grid grid-cols-2 gap-2.5">
              {items.map(rc => (
                <button key={rc.id} onClick={() => setActive(rc)} title={rc.hint}
                  className="group flex flex-col items-stretch gap-1.5 p-1.5 bg-white/5 border border-white/8 rounded-2xl hover:bg-white/10 hover:border-accent/30 transition-all">
                  <div className="aspect-[4/5] rounded-xl flex items-center justify-center overflow-hidden" style={{ background: rc.piece ? '#e9e5dc' : '#151515' }}>
                    {thumbs[rc.id]
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={thumbs[rc.id]} alt={rc.label} className={cn('object-contain group-hover:scale-[1.03] transition-transform', rc.piece ? 'max-w-[82%] max-h-[82%]' : 'w-full h-full')} />
                      : <Loader2 className="w-4 h-4 text-white/20 animate-spin" />}
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/80 text-left px-1 pb-0.5">{rc.label}</span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Editor({ rc, onBack, onInsert, fontsReady }: { rc: Recipe; onBack: () => void; onInsert: (url: string, name: string) => void; fontsReady: boolean }) {
  const [values, setValues] = useState<RValues>(() => defaults(rc))
  const [seed, setSeed] = useState(11)
  const [format, setFormat] = useState(rc.piece ? 'pezzo' : '4:5')
  const [preview, setPreview] = useState<string | null>(null)
  const [variants, setVariants] = useState<{ s: number; url: string }[]>([])
  const [busy, setBusy] = useState(false)
  const job = useRef(0)
  const transparent = format === 'pezzo'

  // anteprima: si ridisegna poco dopo l'ultima modifica, le variazioni subito dopo
  useEffect(() => {
    if (!fontsReady) return
    const id = ++job.current
    const t = setTimeout(async () => {
      try {
        const c = runRecipe(rc, values, seed, format, 0.3)
        if (id !== job.current) return
        setPreview(toUrl(c, transparent, 0.85))
        const out: { s: number; url: string }[] = []
        for (let i = 1; i <= 6; i++) {
          await idle()
          if (id !== job.current) return
          const s = seed + i * 7919
          out.push({ s, url: toUrl(runRecipe(rc, values, s, format, 0.09), transparent, 0.75) })
        }
        if (id === job.current) setVariants(out)
      } catch (e) { console.warn('[genera] render', rc.id, e) }
    }, 140)
    return () => clearTimeout(t)
  }, [rc, values, seed, format, transparent, fontsReady])

  const set = (k: string, v: RValues[string]) => setValues(prev => ({ ...prev, [k]: v }))

  const insert = async () => {
    setBusy(true)
    await idle()
    try {
      const c = runRecipe(rc, values, seed, format, 1)
      onInsert(toUrl(c, transparent), rc.label)
    } finally { setBusy(false) }
  }

  const ratio = useMemo(() => { const f = FORMATS.find(x => x.id === format)!; return `${f.w} / ${f.h}` }, [format])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors" title="Tutte le ricette"><ArrowLeft className="w-4 h-4" /></button>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-white/80">{rc.label}</p>
          <p className="text-[9px] text-white/30 truncate">{rc.hint}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center" style={{ aspectRatio: ratio, background: transparent ? CHECKER : '#111' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview ? <img src={preview} alt="" className="w-full h-full object-contain" /> : <Loader2 className="w-5 h-5 text-white/20 animate-spin" />}
      </div>

      <div className="flex gap-1">
        {FORMATS.map(f => (
          <button key={f.id} onClick={() => setFormat(f.id)}
            className={cn('flex-1 h-7 rounded-lg text-[9px] font-bold transition-all', format === f.id ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40 hover:text-white')}>{f.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-1.5">
        <button onClick={() => setSeed(newSeed())} title="Nuovo seme: stessa ricetta, segno diverso"
          className="h-9 flex items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10">
          <Shuffle className="w-3.5 h-3.5" /> Seme
        </button>
        <button onClick={() => { const s = newSeed(); setValues(v => shuffle(rc, v, s)); setSeed(s) }} title="Parametri a caso, dentro lo stile"
          className="h-9 flex items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10">
          <Dices className="w-3.5 h-3.5" /> Dado
        </button>
        <button onClick={insert} disabled={busy}
          className="h-9 flex items-center justify-center gap-1.5 rounded-xl bg-accent text-black text-[9px] font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-60">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Inserisci
        </button>
      </div>

      {variants.length > 0 && (
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-2 ml-1">Variazioni</p>
          <div className="grid grid-cols-6 gap-1.5">
            {variants.map(v => (
              <button key={v.s} onClick={() => setSeed(v.s)} className="rounded-lg border border-white/10 hover:border-accent/50 overflow-hidden" style={{ aspectRatio: ratio, background: transparent ? '#e9e5dc' : '#111' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.url} alt="" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {rc.params.map(p => <ParamRow key={p.key} p={p} value={values[p.key]} onChange={v => set(p.key, v)} />)}
      </div>

      <p className="text-[9px] leading-relaxed text-white/25 px-1">
        Inserito come immagine ad alta risoluzione ({transparent ? 'PNG scontornato' : 'tavola intera'}). Nei testi, il carattere | va a capo.
      </p>
    </div>
  )
}

function ParamRow({ p, value, onChange }: { p: RParam; value: RValues[string]; onChange: (v: RValues[string]) => void }) {
  const label = <span className="text-[9px] text-white/40 w-20 flex-shrink-0 truncate">{p.label}</span>
  if (p.type === 'range') return (
    <div className="flex items-center gap-2">
      {label}
      <input type="range" min={p.min} max={p.max} value={Number(value)} onChange={e => onChange(Number(e.target.value))} className="flex-1 accent-accent min-w-0" />
      <span className="text-[9px] text-white/50 w-7 text-right tabular-nums flex-shrink-0">{Number(value)}</span>
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
