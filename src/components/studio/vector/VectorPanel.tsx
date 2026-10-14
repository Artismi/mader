'use client'

/**
 * Pannello "Vettoriale" (si apre dalla barra Disponi). Mostra solo ciò che serve
 * per la selezione corrente:
 * - Poligono/Stella vivi: lati, rientro, arrotondamento
 * - 2+ forme: Pathfinder (unisci, sottrai, interseca, escludi, dividi)
 * - 2 oggetti: Fusione
 * - 1 forma: Offset tracciato
 * - 1 oggetto: Ripeti (radiale, griglia, specchio); su una ripetizione/fusione, i suoi parametri
 */
import React, { useEffect, useRef, useState } from 'react'
import * as fabric from 'fabric'
import { cn } from '@/lib/utils'
import { isShape } from './geom'
import { runPathOp, type PathOp } from './pathfinder'
import { getLiveShape, updateLiveShape, type PolyParams } from './shapes'
import { offsetSelection } from './offset'
import { expandRepeat, getRepeat, makeRepeat, updateRepeat, type RepeatKind, type RepeatSpec } from './repeat'
import { getBlend, makeBlend, updateBlend } from './blend'

/** Esegue le ricostruzioni asincrone una alla volta, tenendo solo l'ultima richiesta in attesa. */
function useLatest() {
  const busy = useRef(false), next = useRef<(() => Promise<unknown>) | null>(null)
  const run = (job: () => Promise<unknown>) => {
    if (busy.current) { next.current = job; return }
    busy.current = true
    job().catch(e => console.warn('[vettoriale]', e)).finally(() => {
      busy.current = false
      const n = next.current; next.current = null
      if (n) run(n)
    })
  }
  return run
}

function Row({ label, value, min, max, step = 1, onChange, suffix = '' }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[9px] text-white/40 w-20 flex-shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="flex-1 accent-accent" />
      <span className="text-[9px] font-bold text-white/60 w-10 text-right">{value}{suffix}</span>
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[7px] text-white/25 uppercase tracking-widest">{title}</p>
      {children}
    </div>
  )
}

function Btn({ onClick, children, title, active }: { onClick: () => void; children: React.ReactNode; title?: string; active?: boolean }) {
  return (
    <button onClick={onClick} title={title}
      className={cn('h-7 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1',
        active ? 'bg-accent text-black' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white')}>{children}</button>
  )
}

const PATH_OPS: { op: PathOp; label: string; hint: string; icon: string }[] = [
  { op: 'union', label: 'Unisci', hint: 'Tutto in una forma (stile della più in alto)', icon: '⊕' },
  { op: 'subtract', label: 'Sottrai', hint: 'La forma più in basso meno quelle sopra', icon: '⊖' },
  { op: 'intersect', label: 'Interseca', hint: 'Solo l’area comune', icon: '⊗' },
  { op: 'exclude', label: 'Escludi', hint: 'Le sovrapposizioni diventano buchi', icon: '⊘' },
  { op: 'divide', label: 'Dividi', hint: 'Ogni zona diventa un pezzo separato', icon: '⊞' },
]

export function VectorPanel({ canvas }: { canvas: fabric.Canvas }) {
  const [, force] = useState(0)
  const [offset, setOffset] = useState(12)
  const [keepOriginal, setKeep] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const latest = useLatest()

  useEffect(() => {
    const refresh = () => { force(n => n + 1); setMsg(null) }
    const evs = ['selection:created', 'selection:updated', 'selection:cleared'] as const
    evs.forEach(e => canvas.on(e, refresh))
    return () => { evs.forEach(e => canvas.off(e, refresh)) }
  }, [canvas])

  const objs = canvas.getActiveObjects()
  const active = canvas.getActiveObject()
  const single = objs.length === 1 ? active : undefined
  const live = getLiveShape(single)
  const rep = getRepeat(single)
  const blendSteps = getBlend(single)
  const report = (m: string | null) => { setMsg(m); force(n => n + 1) }

  const setLive = (patch: Partial<PolyParams>) => { if (single) { updateLiveShape(canvas, single, patch); force(n => n + 1) } }
  const setRep = (patch: Partial<RepeatSpec>) => latest(async () => { const g = canvas.getActiveObject(); if (g) await updateRepeat(canvas, g, patch); force(n => n + 1) })
  const setBlend = (n: number) => latest(async () => { const g = canvas.getActiveObject(); if (g) await updateBlend(canvas, g, n); force(k => k + 1) })

  return (
    <div className="bg-[#141414]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-4 w-[300px] max-h-[60vh] overflow-y-auto"
      onMouseDown={e => { if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault() }}>

      {live && (
        <Section title={live.kind === 'star' ? 'Stella' : 'Poligono'}>
          <div className="flex gap-1">
            <Btn active={live.kind === 'polygon'} onClick={() => setLive({ kind: 'polygon' })}>Poligono</Btn>
            <Btn active={live.kind === 'star'} onClick={() => setLive({ kind: 'star' })}>Stella</Btn>
          </div>
          <Row label={live.kind === 'star' ? 'Punte' : 'Lati'} value={live.sides} min={3} max={32} onChange={v => setLive({ sides: v })} />
          {live.kind === 'star' && <Row label="Rientro" value={live.inner} min={5} max={95} suffix="%" onChange={v => setLive({ inner: v })} />}
          <Row label="Arrotonda" value={live.round} min={0} max={100} suffix="%" onChange={v => setLive({ round: v })} />
        </Section>
      )}

      {rep && (
        <Section title={rep.kind === 'radial' ? 'Ripetizione radiale' : rep.kind === 'grid' ? 'Ripetizione a griglia' : 'Specchio'}>
          {rep.kind === 'radial' && <>
            <Row label="Copie" value={rep.count} min={2} max={48} onChange={v => setRep({ count: v })} />
            <Row label="Raggio" value={rep.radius} min={0} max={800} onChange={v => setRep({ radius: v })} suffix="px" />
            <div className="flex gap-1"><Btn active={rep.rotate} onClick={() => setRep({ rotate: !rep.rotate })}>Orienta al centro</Btn></div>
          </>}
          {rep.kind === 'grid' && <>
            <Row label="Colonne" value={rep.cols} min={1} max={20} onChange={v => setRep({ cols: v })} />
            <Row label="Righe" value={rep.rows} min={1} max={20} onChange={v => setRep({ rows: v })} />
            <Row label="Spazio orizz." value={rep.gapX} min={-200} max={400} onChange={v => setRep({ gapX: v })} suffix="px" />
            <Row label="Spazio vert." value={rep.gapY} min={-200} max={400} onChange={v => setRep({ gapY: v })} suffix="px" />
            <div className="flex gap-1">
              <Btn active={rep.brick} onClick={() => setRep({ brick: !rep.brick })}>Sfalsata</Btn>
              <Btn active={rep.flip} onClick={() => setRep({ flip: !rep.flip })}>Specchia alterne</Btn>
            </div>
          </>}
          {rep.kind === 'mirror' && <>
            <div className="flex gap-1">
              <Btn active={rep.axis === 'v'} onClick={() => setRep({ axis: 'v' })}>Asse verticale</Btn>
              <Btn active={rep.axis === 'h'} onClick={() => setRep({ axis: 'h' })}>Asse orizzontale</Btn>
            </div>
            <Row label="Distanza" value={rep.gap} min={-400} max={400} onChange={v => setRep({ gap: v })} suffix="px" />
          </>}
          <div className="flex gap-1"><Btn onClick={() => { if (single) expandRepeat(canvas, single) }} title="Scioglie la ripetizione in oggetti normali">Espandi</Btn></div>
        </Section>
      )}

      {blendSteps !== undefined && (
        <Section title="Fusione">
          <Row label="Passaggi" value={blendSteps} min={1} max={60} onChange={setBlend} />
          <div className="flex gap-1"><Btn onClick={() => { if (single) expandRepeat(canvas, single) }}>Espandi</Btn></div>
        </Section>
      )}

      {objs.length >= 2 && (
        <Section title="Elabora tracciati">
          <div className="grid grid-cols-5 gap-1">
            {PATH_OPS.map(p => (
              <button key={p.op} onClick={() => report(runPathOp(canvas, p.op))} title={p.hint}
                className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                <span className="text-base leading-none">{p.icon}</span>
                <span className="text-[7px] font-bold uppercase tracking-wider">{p.label}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {objs.length === 2 && (
        <Section title="Fusione">
          <Btn onClick={() => latest(async () => report(await makeBlend(canvas, 6)))} title="Passaggi intermedi di forma, colore, posizione e scala">Crea fusione tra i due</Btn>
        </Section>
      )}

      {single && !rep && blendSteps === undefined && isShape(single) && (
        <Section title="Offset tracciato">
          <Row label="Distanza" value={offset} min={-80} max={80} onChange={setOffset} suffix="px" />
          <div className="flex gap-1">
            <Btn active={keepOriginal} onClick={() => setKeep(!keepOriginal)} title="Il nuovo contorno va sotto l'originale (bordo adesivo, linea di taglio)">Tieni originale</Btn>
            <Btn onClick={() => report(offsetSelection(canvas, offset, keepOriginal, keepOriginal ? '#ffffff' : undefined))}>Applica</Btn>
          </div>
        </Section>
      )}

      {single && !rep && blendSteps === undefined && !(single as fabric.FabricObject & { isArtboard?: boolean }).isArtboard && (
        <Section title="Ripeti">
          <div className="flex gap-1">
            {([['radial', 'Radiale'], ['grid', 'Griglia'], ['mirror', 'Specchio']] as [RepeatKind, string][]).map(([k, l]) => (
              <Btn key={k} onClick={() => latest(async () => { await makeRepeat(canvas, single, k); force(n => n + 1) })}>{l}</Btn>
            ))}
          </div>
        </Section>
      )}

      {!objs.length && <p className="text-[10px] text-white/40">Seleziona una o più forme.</p>}
      {msg && <p className="text-[10px] text-amber-300/90 leading-snug">{msg}</p>}
    </div>
  )
}
