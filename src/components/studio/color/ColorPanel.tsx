'use client'

/**
 * Pannello "Colore" (si apre dalla barra Disponi):
 * - Ricolora grafica: tutti i colori della selezione, ognuno sostituibile, più
 *   tonalità/saturazione/luminosità globali; si può applicare una palette intera
 * - Colori del documento e campioni salvati: clic = riempimento, Maiusc+clic = tratto
 * - Palette da foto (immagine selezionata) e armonie di colore
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as fabric from 'fabric'
import { Plus, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  applyColor, documentColors, extractPalette, harmony, HARMONIES, loadSwatches, placePalette, Recolor, saveSwatches,
  type Harmony, type RecolorAdjust,
} from './colors'

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[7px] text-white/25 uppercase tracking-widest">{title}</p>
        {right}
      </div>
      {children}
    </div>
  )
}

function Chip({ hex, onClick, title, size = 'md', onRemove }: { hex: string; onClick: (e: React.MouseEvent) => void; title?: string; size?: 'md' | 'lg'; onRemove?: () => void }) {
  return (
    <span className="relative group">
      <button onClick={onClick} title={title ?? `${hex.toUpperCase()} · clic: riempimento, Maiusc+clic: tratto`}
        className={cn('rounded-md border border-white/15 hover:scale-110 transition-transform block', size === 'lg' ? 'w-8 h-8' : 'w-6 h-6')}
        style={{ background: hex }} />
      {onRemove && (
        <button onClick={onRemove} title="Togli dai campioni"
          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-black border border-white/20 text-white/70 hidden group-hover:flex items-center justify-center">
          <X className="w-2 h-2" />
        </button>
      )}
    </span>
  )
}

function Row({ label, value, min, max, onChange, onCommit, suffix = '' }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; onCommit: () => void; suffix?: string }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[9px] text-white/40 w-20 flex-shrink-0">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
        onPointerUp={onCommit} onKeyUp={onCommit} onDoubleClick={() => { onChange(0); onCommit() }} className="flex-1 accent-accent" />
      <span className="text-[9px] font-bold text-white/60 w-10 text-right">{value}{suffix}</span>
    </label>
  )
}

function SmallBtn({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button onClick={onClick} title={title}
      className="h-6 px-2 rounded-md text-[8px] font-bold uppercase tracking-wider bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1">
      {children}
    </button>
  )
}

const ZERO: RecolorAdjust = { hue: 0, sat: 0, light: 0 }

export function ColorPanel({ canvas }: { canvas: fabric.Canvas }) {
  const [, force] = useState(0)
  const [swatches, setSwatches] = useState<string[]>(() => loadSwatches())
  const [map, setMap] = useState<Record<string, string>>({})
  const [adj, setAdj] = useState<RecolorAdjust>(ZERO)
  const [harm, setHarm] = useState<Harmony>('complementare')
  const [base, setBase] = useState('#7c3aed')
  const [rc, setRc] = useState<Recolor | null>(null)
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // una nuova sessione di ricolorazione per ogni nuova selezione
  useEffect(() => {
    const reset = () => {
      const objs = canvas.getActiveObjects().filter(o => !(o as fabric.FabricObject & { isArtboard?: boolean }).isArtboard)
      const next = objs.length ? new Recolor(objs) : null
      setRc(next); setMap({}); setAdj(ZERO)
      const first = next?.colors[0]?.hex
      if (first) setBase(first)
    }
    reset()
    let t: ReturnType<typeof setTimeout> | null = null
    const later = () => { if (t) clearTimeout(t); t = setTimeout(() => force(n => n + 1), 250) } // colori del documento
    const evs = ['selection:created', 'selection:updated', 'selection:cleared'] as const
    evs.forEach(e => canvas.on(e, reset))
    canvas.on('object:modified', later); canvas.on('object:added', later); canvas.on('object:removed', later)
    return () => {
      evs.forEach(e => canvas.off(e, reset))
      canvas.off('object:modified', later); canvas.off('object:added', later); canvas.off('object:removed', later)
      if (t) clearTimeout(t)
    }
  }, [canvas])

  const docColors = documentColors(canvas).slice(0, 40)
  const active = canvas.getActiveObject()
  const photo = active instanceof fabric.FabricImage ? active : null
  const photoPalette = useMemo(() => {
    if (!photo) return []
    try { return extractPalette((photo as unknown as { _originalElement?: HTMLImageElement })._originalElement ?? photo.getElement() as HTMLImageElement, 6) } catch { return [] }
  }, [photo])
  const harmonyColors = harmony(base, harm)

  /** Ridisegna subito; la cronologia registra un passo solo a gesto finito. */
  const run = (m: Record<string, string>, a: RecolorAdjust, commit: boolean) => {
    if (!rc) return
    const touched = rc.apply(m, a)
    canvas.requestRenderAll()
    if (commitTimer.current) clearTimeout(commitTimer.current)
    const fire = () => touched.forEach(o => canvas.fire('object:modified', { target: o.group && !(o.group instanceof fabric.ActiveSelection) ? o.group : o }))
    if (commit) fire(); else commitTimer.current = setTimeout(fire, 500)
  }
  const setOne = (key: string, hex: string) => { const m = { ...map, [key]: hex }; setMap(m); run(m, adj, false) }
  const setAdjust = (patch: Partial<RecolorAdjust>) => { const a = { ...adj, ...patch }; setAdj(a); run(map, a, false) }
  const applyPalette = (pal: string[]) => { if (!rc || !pal.length) return; const m = rc.mapToPalette(pal); setMap(m); run(m, adj, true) }
  const resetAll = () => { if (!rc) return; rc.reset(); setMap({}); setAdj(ZERO); run({}, ZERO, true) }

  const paint = (hex: string) => (e: React.MouseEvent) => {
    applyColor(canvas, hex, e.shiftKey ? 'stroke' : 'auto'); setBase(hex)
    // i colori di partenza della ricolorazione ora sono questi
    const objs = canvas.getActiveObjects().filter(o => !(o as fabric.FabricObject & { isArtboard?: boolean }).isArtboard)
    setRc(objs.length ? new Recolor(objs) : null)
    setMap({}); setAdj(ZERO)
  }
  const addSwatches = (list: string[]) => { const s = [...swatches, ...list.filter(c => !swatches.includes(c))]; setSwatches(s); saveSwatches(s) }
  const removeSwatch = (hex: string) => { const s = swatches.filter(c => c !== hex); setSwatches(s); saveSwatches(s) }
  const center = () => { const v = canvas.viewportTransform, z = canvas.getZoom(); return { x: (canvas.getWidth() / 2 - v[4]) / z, y: (canvas.getHeight() / 2 - v[5]) / z } }

  return (
    <div className="bg-[#141414]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-4 w-[300px] max-h-[60vh] overflow-y-auto"
      onMouseDown={e => { if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault() }}>

      {rc && !rc.empty && (
        <Section title={`Ricolora grafica · ${rc.colors.length} ${rc.colors.length === 1 ? "colore" : "colori"}`} right={<SmallBtn onClick={resetAll} title="Torna ai colori di partenza"><RotateCcw className="w-2.5 h-2.5" />Ripristina</SmallBtn>}>
          <div className="flex flex-col gap-1">
            {rc.colors.slice(0, 16).map(u => (
              <div key={u.key} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded border border-white/15" style={{ background: u.hex, opacity: u.alpha }} title={`Originale ${u.hex.toUpperCase()}`} />
                <span className="text-white/25 text-[10px]">→</span>
                <label className="relative w-5 h-5 rounded border border-white/15 overflow-hidden cursor-pointer" style={{ background: map[u.key] ?? u.hex }} title="Nuovo colore">
                  <input type="color" value={map[u.key] ?? u.hex} onChange={e => setOne(u.key, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </label>
                <span className="text-[9px] font-mono text-white/40 flex-1">{(map[u.key] ?? u.hex).toUpperCase()}</span>
                <span className="text-[8px] text-white/25">×{u.count}</span>
              </div>
            ))}
            {rc.colors.length > 16 && <p className="text-[8px] text-white/30">…e altri {rc.colors.length - 16} (seguono le regolazioni sotto)</p>}
          </div>
          <Row label="Tonalità" value={adj.hue} min={-180} max={180} suffix="°" onChange={v => setAdjust({ hue: v })} onCommit={() => run(map, adj, true)} />
          <Row label="Saturazione" value={adj.sat} min={-100} max={100} onChange={v => setAdjust({ sat: v })} onCommit={() => run(map, adj, true)} />
          <Row label="Luminosità" value={adj.light} min={-100} max={100} onChange={v => setAdjust({ light: v })} onCommit={() => run(map, adj, true)} />
          <div className="flex flex-wrap gap-1">
            {swatches.length > 0 && <SmallBtn onClick={() => applyPalette(swatches)} title="I colori della grafica prendono i campioni, dal più chiaro al più scuro">Usa i campioni</SmallBtn>}
            <SmallBtn onClick={() => applyPalette(harmonyColors)} title="Usa l'armonia qui sotto">Usa l’armonia</SmallBtn>
            <SmallBtn onClick={() => applyPalette(['#ffffff', '#000000'])} title="Bianco e nero, per luminosità">B/N</SmallBtn>
          </div>
        </Section>
      )}

      {photo && photoPalette.length > 0 && (
        <Section title="Palette dalla foto">
          <div className="flex gap-1.5 flex-wrap">{photoPalette.map(c => <Chip key={c} hex={c} size="lg" onClick={() => setBase(c)} title={`${c.toUpperCase()} · base per le armonie`} />)}</div>
          <div className="flex gap-1">
            <SmallBtn onClick={() => addSwatches(photoPalette)}><Plus className="w-2.5 h-2.5" />Nei campioni</SmallBtn>
            <SmallBtn onClick={() => { const b = photo.getBoundingRect(); placePalette(canvas, photoPalette, { x: b.left + b.width / 2, y: b.top + b.height + 70 }) }}>Metti sul canvas</SmallBtn>
          </div>
        </Section>
      )}

      <Section title="Campioni" right={
        <SmallBtn onClick={() => addSwatches(rc?.colors.map(u => u.hex) ?? [base])} title="Aggiungi i colori della selezione"><Plus className="w-2.5 h-2.5" />Selezione</SmallBtn>
      }>
        {swatches.length
          ? <div className="flex gap-1.5 flex-wrap">{swatches.map(c => <Chip key={c} hex={c} onClick={paint(c)} onRemove={() => removeSwatch(c)} />)}</div>
          : <p className="text-[9px] text-white/30">Nessun campione: aggiungi i colori della selezione, di una foto o di un’armonia.</p>}
      </Section>

      {docColors.length > 0 && (
        <Section title="Colori del documento">
          <div className="flex gap-1.5 flex-wrap">{docColors.map(u => <Chip key={u.key} hex={u.hex} onClick={paint(u.hex)} title={`${u.hex.toUpperCase()} · usato ${u.count} volte · clic: riempimento, Maiusc+clic: tratto`} />)}</div>
        </Section>
      )}

      <Section title="Armonie">
        <div className="flex items-center gap-2">
          <label className="relative w-7 h-7 rounded-md border border-white/15 overflow-hidden cursor-pointer flex-shrink-0" style={{ background: base }} title="Colore di base">
            <input type="color" value={base} onChange={e => setBase(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>
          <select value={harm} onChange={e => setHarm(e.target.value as Harmony)}
            className="flex-1 h-7 bg-white/5 border border-white/10 rounded-md text-[10px] text-white/70 px-2 capitalize">
            {HARMONIES.map(h => <option key={h} value={h} className="bg-[#141414]">{h}</option>)}
          </select>
        </div>
        <div className="flex gap-1.5 flex-wrap">{harmonyColors.map((c, i) => <Chip key={c + i} hex={c} onClick={paint(c)} />)}</div>
        <div className="flex gap-1">
          <SmallBtn onClick={() => addSwatches(harmonyColors)}><Plus className="w-2.5 h-2.5" />Nei campioni</SmallBtn>
          <SmallBtn onClick={() => placePalette(canvas, harmonyColors, center())}>Metti sul canvas</SmallBtn>
        </div>
      </Section>
    </div>
  )
}
