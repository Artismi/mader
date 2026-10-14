'use client'
/**
 * Scheda "Pack" della Libreria: gli asset importati dai pack scaricati
 * (texture, luci ed effetti, elementi, pattern, foto). L'elenco arriva da
 * public/library/manifest.json, generato da scripts/import-packs.py.
 * Clic = inserisci nel canvas; "riempi" = usa come riempimento dell'oggetto selezionato.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, PaintBucket } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PackCat { id: string; label: string }
export interface PackInfo { id: string; name: string; cat: string; blend: string | null; count: number }
export interface PackItem { id: string; pack: string; name: string; src: string; thumb: string; w: number; h: number; alpha: boolean }
interface Manifest { cats: PackCat[]; packs: PackInfo[]; items: PackItem[] }

let cache: Promise<Manifest | null> | null = null
const loadManifest = () => (cache ??= fetch('/library/manifest.json', { cache: 'no-store' })
  .then(r => (r.ok ? r.json() : null)).catch(() => null))

const PAGE = 60

export function PackPanel({ search, onInsert, onFill }: {
  search: string
  onInsert: (item: PackItem, pack: PackInfo) => void
  onFill: (item: PackItem) => void
}) {
  const [m, setM] = useState<Manifest | null | undefined>(undefined)
  const [cat, setCat] = useState<string>('texture')
  const [pack, setPack] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => { loadManifest().then(setM) }, [])
  useEffect(() => { setLimit(PAGE) }, [cat, pack, search])

  const packs = useMemo(() => new Map((m?.packs ?? []).map(p => [p.id, p])), [m])
  const q = search.trim().toLowerCase()

  const items = useMemo(() => {
    if (!m) return []
    if (q) return m.items.filter(i => i.name.toLowerCase().includes(q) || (packs.get(i.pack)?.name ?? '').toLowerCase().includes(q))
    if (pack) return m.items.filter(i => i.pack === pack)
    return []
  }, [m, q, pack, packs])

  if (m === undefined) return <p className="text-center text-[9px] text-white/20 mt-8 uppercase tracking-widest">Carico i pack…</p>
  if (m === null) return (
    <p className="text-[10px] text-white/40 leading-relaxed mt-4">
      Nessun pack importato. Esegui <code className="text-accent">python3 scripts/import-packs.py &lt;cartella-zip&gt;</code> per generare <code>public/library/</code>.
    </p>
  )

  const grid = (list: PackItem[]) => {
    const wide = (p?: PackInfo) => p && p.cat !== 'elementi'
    return (
      <>
        <div className="grid grid-cols-3 gap-2">
          {list.slice(0, limit).map(it => {
            const p = packs.get(it.pack)!
            return (
              <div key={it.id} className={cn('group relative rounded-xl border border-white/8 overflow-hidden hover:border-accent/40 transition-colors',
                it.alpha ? 'bg-[repeating-conic-gradient(#2a2a2a_0_25%,#1c1c1c_0_50%)] [background-size:12px_12px]' : 'bg-white/5')}>
                <button onClick={() => onInsert(it, p)} title={`${it.name} · ${p.name}`}
                  className="block w-full aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.thumb} alt={it.name} loading="lazy" draggable={false}
                    className={cn('w-full h-full', wide(p) ? 'object-cover' : 'object-contain p-1.5')} />
                </button>
                {(p.cat === 'pattern' || p.cat === 'texture') && (
                  <button onClick={() => onFill(it)} title="Usa come riempimento della selezione"
                    className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-white/60 hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                    <PaintBucket className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {list.length > limit && (
          <button onClick={() => setLimit(l => l + PAGE)}
            className="w-full mt-3 py-2 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white/70">
            Altri {list.length - limit}
          </button>
        )}
      </>
    )
  }

  if (q) return items.length ? grid(items) : <p className="text-center text-[9px] text-white/20 mt-8 uppercase tracking-widest">Nessun risultato</p>

  if (pack) {
    const p = packs.get(pack)!
    return (
      <div className="space-y-3">
        <button onClick={() => setPack(null)} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white">
          <ArrowLeft className="w-3 h-3" /> {p.name}
          <span className="text-white/20 font-bold">· {p.count}{p.blend ? ` · ${BLEND[p.blend] ?? p.blend}` : ''}</span>
        </button>
        {grid(items)}
      </div>
    )
  }

  const inCat = m.packs.filter(p => p.cat === cat)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {m.cats.filter(c => m.packs.some(p => p.cat === c.id)).map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}
            className={cn('px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors',
              cat === c.id ? 'bg-accent/15 text-accent' : 'bg-white/5 text-white/35 hover:text-white/70')}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {inCat.map(p => {
          const cover = m.items.filter(i => i.pack === p.id).slice(0, 4)
          return (
            <button key={p.id} onClick={() => setPack(p.id)}
              className="group text-left rounded-2xl border border-white/8 bg-white/5 overflow-hidden hover:border-accent/40 transition-colors">
              <div className={cn('grid gap-px aspect-square bg-black/40', cover.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
                {cover.map(it => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={it.id} src={it.thumb} alt="" loading="lazy" className={cn('w-full h-full', it.alpha ? 'object-contain p-1 bg-white/10' : 'object-cover')} />
                ))}
              </div>
              <div className="px-2.5 py-2">
                <p className="text-[9px] font-black uppercase tracking-wider text-white/70 group-hover:text-white truncate">{p.name}</p>
                <p className="text-[8px] text-white/25">{p.count} asset{p.blend ? ` · ${BLEND[p.blend] ?? p.blend}` : ''}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const BLEND: Record<string, string> = { multiply: 'moltiplica', screen: 'schermo', overlay: 'sovrapponi' }
