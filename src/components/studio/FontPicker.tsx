'use client'

/**
 * Selettore dei caratteri: ricerca, famiglie, preferiti, recenti e abbinamenti.
 * Ogni voce è scritta nel proprio carattere (anteprime leggere, caricate solo
 * quando la voce compare). I Fontshare che non arrivano vengono nascosti.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { Search, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FONTS, FONT_CATS, type FontEntry } from './libraries/font-catalog'
import { PAIRINGS, loadPreviews } from './libraries/font-loader'

const FAV = 'studio-font-fav', REC = 'studio-font-recent'
const read = (k: string): string[] => { try { return JSON.parse(localStorage.getItem(k) ?? '[]') } catch { return [] } }
const write = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* archiviazione non disponibile */ } }
const catLabel = Object.fromEntries(FONT_CATS.map(c => [c.id, c.label]))
const PAGE = 60

export function FontPicker({ value, sample, onChange, onPair, className }: {
  value: string
  /** testo di anteprima (di solito il testo selezionato) */
  sample?: string
  onChange: (family: string) => void
  onPair?: (title: string, body: string) => void
  className?: string
}) {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<string>('tutti')
  const [fav, setFav] = useState<string[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const [limit, setLimit] = useState(PAGE)
  const [missing, setMissing] = useState<Set<string>>(new Set())
  const text = (sample?.trim() || 'Aa Bb Cc').slice(0, 24)

  useEffect(() => { const id = requestAnimationFrame(() => { setFav(read(FAV)); setRecent(read(REC)) }); return () => cancelAnimationFrame(id) }, [])

  const list: FontEntry[] = useMemo(() => {
    const s = q.trim().toLowerCase()
    let l = FONTS.filter(f => !missing.has(f.family))
    if (s) return l.filter(f => f.family.toLowerCase().includes(s) || (catLabel[f.cat] ?? '').toLowerCase().includes(s))
    if (tab === 'preferiti') return fav.map(f => FONTS.find(x => x.family === f)).filter(Boolean) as FontEntry[]
    if (tab === 'recenti') return recent.map(f => FONTS.find(x => x.family === f)).filter(Boolean) as FontEntry[]
    if (tab !== 'tutti') l = l.filter(f => f.cat === tab)
    return l
  }, [q, tab, fav, recent, missing])
  const shown = list.slice(0, limit)

  // anteprime delle voci visibili; i Fontshare che non arrivano entro 6 s spariscono
  useEffect(() => {
    loadPreviews(shown, text)
    const fs = shown.filter(f => f.source === 'fontshare')
    if (!fs.length) return
    const t = setTimeout(() => {
      const gone = fs.filter(f => !document.fonts.check(`400 16px "${f.family}"`)).map(f => f.family)
      if (gone.length) setMissing(m => new Set([...m, ...gone]))
    }, 6000)
    return () => clearTimeout(t)
  }, [shown, text])

  const pick = (family: string) => {
    const r = [family, ...recent.filter(x => x !== family)].slice(0, 16)
    setRecent(r); write(REC, r)
    onChange(family)
  }
  const toggleFav = (family: string) => {
    const f = fav.includes(family) ? fav.filter(x => x !== family) : [family, ...fav]
    setFav(f); write(FAV, f)
  }
  const pairs = PAIRINGS.filter(p => !missing.has(p.title) && !missing.has(p.body))
  useEffect(() => {
    if (tab !== 'abbinamenti') return
    loadPreviews(pairs.flatMap(p => [FONTS.find(f => f.family === p.title), FONTS.find(f => f.family === p.body)]).filter(Boolean) as FontEntry[], 'Titolo forte Testo di prova leggibile')
  }, [tab, pairs])

  const tabs = [['tutti', 'Tutti'], ['preferiti', 'Preferiti'], ['recenti', 'Recenti'], ...(onPair ? [['abbinamenti', 'Abbinamenti']] : []), ...FONT_CATS.map(c => [c.id, c.label])]

  return (
    <div className={cn('bg-[#141414] border border-white/10 rounded-2xl shadow-2xl w-[320px] flex flex-col max-h-[70vh]', className)}>
      <div className="p-2.5 space-y-2 border-b border-white/[0.06]">
        <label className="flex items-center gap-2 h-8 px-2.5 rounded-lg bg-white/[0.05] border border-white/[0.06]">
          <Search className="w-3.5 h-3.5 text-white/30" />
          <input autoFocus value={q} onChange={e => { setQ(e.target.value); setLimit(PAGE) }} placeholder={`Cerca tra ${FONTS.length - missing.size} caratteri`}
            className="flex-1 bg-transparent text-[11px] text-white/85 placeholder:text-white/25 outline-none" aria-label="Cerca carattere" />
        </label>
        {!q && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5">
            {tabs.map(([id, label]) => (
              <button key={id} onClick={() => { setTab(id); setLimit(PAGE) }}
                className={cn('h-6 px-2 rounded-md text-[9px] font-bold whitespace-nowrap flex-shrink-0', tab === id ? 'bg-violet-500/25 text-violet-200' : 'bg-white/[0.04] text-white/45 hover:text-white/75')}>{label}</button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-y-auto scrollbar-hide p-1.5 flex-1">
        {tab === 'abbinamenti' && !q ? (
          <div className="space-y-1.5">
            {pairs.map(p => (
              <button key={p.title + p.body} onClick={() => onPair?.(p.title, p.body)} className="w-full text-left rounded-xl p-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05]">
                <span className="block text-[22px] leading-tight text-white" style={{ fontFamily: `"${p.title}"` }}>Titolo forte</span>
                <span className="block text-[12px] text-white/60 mt-0.5" style={{ fontFamily: `"${p.body}"` }}>Testo di prova leggibile, per paragrafi e didascalie.</span>
                <span className="block text-[8px] uppercase tracking-widest text-white/30 mt-2">{p.title} + {p.body} · {p.mood}</span>
              </button>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="text-center text-[10px] text-white/30 py-8">{tab === 'preferiti' ? 'Nessun preferito: tocca la stella accanto a un carattere' : 'Nessun carattere trovato'}</p>
        ) : (
          <>
            {shown.map((f, i) => {
              const header = tab === 'tutti' && !q && (i === 0 || shown[i - 1].cat !== f.cat)
              return (
                <React.Fragment key={f.family}>
                  {header && <p className="px-2 pt-3 pb-1 text-[8px] font-black uppercase tracking-widest text-white/25">{catLabel[f.cat]}</p>}
                  <div className={cn('group flex items-center gap-1 rounded-lg', value === f.family ? 'bg-violet-500/15' : 'hover:bg-white/[0.06]')}>
                    <button onClick={() => pick(f.family)} className="flex-1 min-w-0 text-left px-2.5 py-1.5">
                      <span className="block text-[18px] leading-snug text-white/90 truncate" style={{ fontFamily: `"${f.family}", system-ui` }}>{sample?.trim() ? text : f.family}</span>
                      <span className="block text-[8px] text-white/30 truncate">{f.family} · {f.weights.length > 1 ? `${f.weights.length} pesi` : '1 peso'}{f.source === 'fontshare' ? ' · Fontshare' : ''}</span>
                    </button>
                    <button onClick={() => toggleFav(f.family)} title={fav.includes(f.family) ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}
                      className={cn('p-1.5 mr-1 rounded-md', fav.includes(f.family) ? 'text-amber-300' : 'text-white/15 opacity-0 group-hover:opacity-100 hover:text-white/60')}>
                      <Star className={cn('w-3 h-3', fav.includes(f.family) && 'fill-amber-300')} />
                    </button>
                  </div>
                </React.Fragment>
              )
            })}
            {list.length > limit && (
              <button onClick={() => setLimit(l => l + PAGE)} className="w-full h-8 mt-1 rounded-lg text-[10px] font-semibold text-white/50 bg-white/[0.04] hover:bg-white/[0.08]">
                Mostra altri ({list.length - limit})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
