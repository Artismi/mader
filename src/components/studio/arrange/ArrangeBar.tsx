'use client'

/**
 * Barra "Disponi" (compare con una selezione) + menu Esporta per tavole.
 *
 * Scorciatoie (le stesse di Figma, dove esistono):
 *   Frecce / Maiusc+Frecce  sposta di 1 / 10 px
 *   Alt+A  Alt+H  Alt+D     allinea a sinistra / al centro / a destra
 *   Alt+W  Alt+V  Alt+S     allinea in alto / al centro / in basso
 *   Alt+Maiusc+H / V        distribuisci in orizzontale / verticale
 *   Ctrl+7 / Ctrl+Alt+7     maschera di ritaglio / rilascia (come Illustrator)
 *   Alt+I                   contagocce (I da sola resta lo strumento Immagine)
 *   A                       selezione diretta: modifica i punti della forma
 *   Ctrl+Maiusc+D           distorci / prospettiva a 4 angoli
 *   doppio clic su immagine ritaglia dentro la cornice
 */
import React, { useEffect, useState } from 'react'
import * as fabric from 'fabric'
import {
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalSpaceAround, AlignVerticalSpaceAround, Crop, Pipette, Unlink, Spline,
  MousePointer2, Frame, Replace, Move3d, Undo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { alignObjects, canAlign, distributeObjects, isMaskGroup, makeClipMask, nudgeSelection, releaseClipMask, type AlignMode } from './align'
import { boardOf } from './artboards'
import { boardLabel, exportBoards, listBoards, selectionToDataURL, type ExportFormat } from './export'
import { installTextCurve } from '../text/curve'
import { VectorPanel } from '../vector/VectorPanel'
import { installDirectSelect, isPointEditing, startDirectSelect, exitPointEdit } from '../vector/direct-select'
import { isCropping, pickAndReplace, resetCrop, startCrop, endCrop } from '../image/crop'
import { endDistort, isDistorting, isWarped, resetDistort, startDistort } from '../image/distort'

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> }

function isTyping(canvas: fabric.Canvas) {
  const el = document.activeElement as HTMLElement | null
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return true
  return !!(canvas.getActiveObject() as fabric.IText | undefined)?.isEditing
}

/** Contagocce di sistema (Chromium/Electron): campiona qualsiasi pixel dello schermo. */
export async function pickColor(canvas: fabric.Canvas) {
  const ED = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper
  if (!ED) { alert('Il contagocce non è supportato da questo browser.'); return }
  let hex: string
  try { hex = (await new ED().open()).sRGBHex } catch { return } // Esc: annullato
  const objs = canvas.getActiveObjects().filter(o => !(o as fabric.FabricObject & { isArtboard?: boolean }).isArtboard || canvas.getActiveObjects().length === 1)
  if (!objs.length) { navigator.clipboard?.writeText(hex).catch(() => {}); return hex }
  for (const o of objs) {
    // le linee e i tracciati senza riempimento prendono il colore sul tratto
    const strokeOnly = o.type === 'line' || (!o.fill || o.fill === 'transparent')
    o.set(strokeOnly ? { stroke: hex } : { fill: hex })
    canvas.fire('object:modified', { target: o })
  }
  canvas.requestRenderAll()
  return hex
}

const ALIGN: { mode: AlignMode; icon: React.ElementType; label: string; key: string }[] = [
  { mode: 'left', icon: AlignStartVertical, label: 'Allinea a sinistra', key: 'Alt+A' },
  { mode: 'hcenter', icon: AlignCenterVertical, label: 'Centra in orizzontale', key: 'Alt+H' },
  { mode: 'right', icon: AlignEndVertical, label: 'Allinea a destra', key: 'Alt+D' },
  { mode: 'top', icon: AlignStartHorizontal, label: 'Allinea in alto', key: 'Alt+W' },
  { mode: 'vcenter', icon: AlignCenterHorizontal, label: 'Centra in verticale', key: 'Alt+V' },
  { mode: 'bottom', icon: AlignEndHorizontal, label: 'Allinea in basso', key: 'Alt+S' },
]
const ALIGN_KEYS: Record<string, AlignMode> = { KeyA: 'left', KeyH: 'hcenter', KeyD: 'right', KeyW: 'top', KeyV: 'vcenter', KeyS: 'bottom' }

function Btn({ onClick, title, disabled, children, active }: { onClick: () => void; title: string; disabled?: boolean; children: React.ReactNode; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-20 disabled:pointer-events-none',
        active ? 'bg-accent/20 text-accent' : 'text-white/45 hover:text-white hover:bg-white/10')}>
      {children}
    </button>
  )
}

function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn('px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-colors disabled:opacity-25',
        on ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]')}>{children}</button>
  )
}

export function ArrangeBar({ canvas }: { canvas: fabric.Canvas | null }) {
  const [count, setCount] = useState(0)
  const [masked, setMasked] = useState(false)
  const [alignable, setAlignable] = useState(false)
  const [showVector, setShowVector] = useState(false)
  const [, setTick] = useState(0)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (!canvas) return
    const sync = () => {
      setCount(canvas.getActiveObjects().length)
      setMasked(isMaskGroup(canvas.getActiveObject()))
      setAlignable(canAlign(canvas))
      setTick(n => n + 1)
      setNote(null)
    }
    const evs = ['selection:created', 'selection:updated', 'selection:cleared', 'object:modified'] as const
    evs.forEach(e => canvas.on(e, sync))
    sync()
    // il testo curvo ricalcola l'arco mentre si scrive: serve sempre, non solo con la barra visibile
    const offCurve = installTextCurve(canvas)
    const offDirect = installDirectSelect(canvas)
    return () => { evs.forEach(e => canvas.off(e, sync)); offCurve(); offDirect() }
  }, [canvas])

  useEffect(() => {
    if (!canvas) return
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(canvas)) return
      const mod = e.ctrlKey || e.metaKey
      if (e.key.startsWith('Arrow') && !mod && !e.altKey && canvas.getActiveObject()) {
        const s = e.shiftKey ? 10 : 1
        const d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key]
        if (d) { e.preventDefault(); nudgeSelection(canvas, d[0], d[1]) }
        return
      }
      if (mod && e.shiftKey && e.code === 'KeyD' && canvas.getActiveObject()) {
        e.preventDefault()
        if (isDistorting(canvas)) endDistort(canvas)
        else startDistort(canvas, canvas.getActiveObject()).then(m => { setNote(m); setTick(n => n + 1) }).catch(err => setNote(String(err.message ?? err)))
        return
      }
      if (mod && e.code === 'Digit7') {
        e.preventDefault()
        if (e.altKey) releaseClipMask(canvas); else makeClipMask(canvas)
        return
      }
      if (e.altKey && !mod) {
        if (e.shiftKey && (e.code === 'KeyH' || e.code === 'KeyV')) { e.preventDefault(); distributeObjects(canvas, e.code === 'KeyH' ? 'h' : 'v'); return }
        if (e.code === 'KeyI') { e.preventDefault(); pickColor(canvas); return }
        const mode = !e.shiftKey ? ALIGN_KEYS[e.code] : undefined
        if (mode && canvas.getActiveObject()) { e.preventDefault(); alignObjects(canvas, mode) }
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canvas])

  if (!canvas || count === 0) return null

  return (<>
    {/* pannello al bordo destro dell'area di lavoro: non copre l'oggetto che si sta modificando */}
    {showVector && <div className="absolute right-4 bottom-20 z-[60]"><VectorPanel canvas={canvas} /></div>}
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-0.5 p-1 bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
      onMouseDown={e => { if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault() }}>
      {ALIGN.map(a => (
        <Btn key={a.mode} onClick={() => alignObjects(canvas, a.mode)} disabled={!alignable}
          title={`${a.label}${count === 1 ? ' (alla tavola)' : ''} · ${a.key}`}>
          <a.icon className="w-3.5 h-3.5" />
        </Btn>
      ))}
      <div className="w-px h-4 bg-white/10 mx-1" />
      <Btn onClick={() => distributeObjects(canvas, 'h')} disabled={count < 3} title="Distribuisci in orizzontale · Alt+Maiusc+H">
        <AlignHorizontalSpaceAround className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => distributeObjects(canvas, 'v')} disabled={count < 3} title="Distribuisci in verticale · Alt+Maiusc+V">
        <AlignVerticalSpaceAround className="w-3.5 h-3.5" />
      </Btn>
      <div className="w-px h-4 bg-white/10 mx-1" />
      {masked
        ? <Btn onClick={() => releaseClipMask(canvas)} title="Rilascia maschera · Ctrl+Alt+7" active><Unlink className="w-3.5 h-3.5" /></Btn>
        : <Btn onClick={() => makeClipMask(canvas)} disabled={count < 2} title="Maschera di ritaglio: l'oggetto più in alto ritaglia gli altri · Ctrl+7"><Crop className="w-3.5 h-3.5" /></Btn>}
      <Btn onClick={() => pickColor(canvas)} title="Contagocce: prendi un colore dallo schermo · Alt+I"><Pipette className="w-3.5 h-3.5" /></Btn>
      <TransformButtons canvas={canvas} onNote={m => { setNote(m); setTick(n => n + 1) }} />
      <div className="w-px h-4 bg-white/10 mx-1" />
      <Btn onClick={() => setShowVector(v => !v)} active={showVector} title="Vettoriale: elabora tracciati, offset, ripeti, fusione, poligoni">
        <Spline className="w-3.5 h-3.5" />
      </Btn>
      {note && <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg bg-[#111]/95 border border-white/10 text-[10px] text-amber-300/90">{note}</span>}
    </div>
  </>)
}

/**
 * Strumenti di trasformazione per l'oggetto singolo selezionato:
 * selezione diretta, distorsione, e per le immagini ritaglio e sostituzione.
 */
function TransformButtons({ canvas, onNote }: { canvas: fabric.Canvas; onNote: (m: string | null) => void }) {
  const objs = canvas.getActiveObjects()
  if (objs.length !== 1) return null
  const o = canvas.getActiveObject()!
  if ((o as fabric.FabricObject & { isArtboard?: boolean }).isArtboard) return null
  const cropping = isCropping(canvas)
  const frame = cropping ? undefined : o
  const isImg = o instanceof fabric.FabricImage && !cropping
  const isText = o instanceof fabric.FabricText
  const vector = !isImg && !isText && !(o instanceof fabric.Group) && !cropping
  const distorting = isDistorting(canvas)
  const editing = isPointEditing(o)
  const say = (m: string | null) => onNote(m)
  return (<>
    <div className="w-px h-4 bg-white/10 mx-1" />
    {vector && (
      <Btn active={editing} onClick={() => { if (editing) exitPointEdit(canvas, o); else say(startDirectSelect(canvas, o)) }}
        title="Selezione diretta: modifica i punti · A — Alt+clic su un punto: angolo/morbido, doppio clic sul contorno: aggiungi, Canc: elimina">
        <MousePointer2 className="w-3.5 h-3.5" />
      </Btn>
    )}
    {(isImg || cropping) && (
      <Btn active={cropping} onClick={() => { if (cropping) endCrop(canvas); else say(startCrop(canvas, frame)) }}
        title="Ritaglia dentro la cornice · doppio clic sull'immagine — trascina la foto, gli angoli la ingrandiscono, le maniglie viola spostano i bordi">
        <Frame className="w-3.5 h-3.5" />
      </Btn>
    )}
    {isImg && !isWarped(o) && (
      <Btn onClick={() => pickAndReplace(canvas, o, say)} title="Sostituisci immagine: stessa cornice, ritaglio, filtri e maschera">
        <Replace className="w-3.5 h-3.5" />
      </Btn>
    )}
    {isImg && !isWarped(o) && ((o as fabric.FabricImage).cropX > 0 || (o as fabric.FabricImage).cropY > 0) && (
      <Btn onClick={() => resetCrop(canvas, o)} title="Mostra tutta la foto (annulla il ritaglio)"><Undo2 className="w-3.5 h-3.5" /></Btn>
    )}
    {!cropping && (
      <Btn active={distorting} onClick={() => {
        if (distorting) endDistort(canvas)
        else startDistort(canvas, o).then(say).catch(e => say(String(e.message ?? e)))
      }} title={`Distorci a 4 angoli · Ctrl+Maiusc+D — Maiusc+trascina: prospettiva${isText || o instanceof fabric.Group ? ' (testi e gruppi diventano immagine)' : ''}`}>
        <Move3d className="w-3.5 h-3.5" />
      </Btn>
    )}
    {isWarped(o) && !distorting && (
      <Btn onClick={() => { resetDistort(canvas, o).catch(e => say(String(e.message ?? e))) }} title="Togli la distorsione"><Undo2 className="w-3.5 h-3.5" /></Btn>
    )}
  </>)
}

// ─── MENU ESPORTA ────────────────────────────────────────────────────────────

type Scope = 'board' | 'all' | 'selection' | 'canvas'

export function ExportMenu({ canvas, onLegacyExport, onDone }: {
  canvas: fabric.Canvas | null
  onLegacyExport: (fmt: 'png' | 'jpg' | 'svg', mult: number) => void
  onDone: () => void
}) {
  const boards = canvas ? listBoards(canvas) : []
  const active = canvas?.getActiveObject()
  const current = active ? ((active as fabric.FabricObject & { isArtboard?: boolean }).isArtboard ? active : boardOf(canvas!, active)) : undefined
  const [scope, setScope] = useState<Scope>(current ? 'board' : boards.length ? 'all' : 'canvas')
  const [format, setFormat] = useState<ExportFormat>('png')
  const [mult, setMult] = useState(2)
  const [transparent, setTransparent] = useState(false)
  const [busy, setBusy] = useState(false)

  const formats: ExportFormat[] = scope === 'selection' ? ['png'] : scope === 'canvas' ? ['png', 'jpg', 'svg'] : ['png', 'jpg', 'svg', 'pdf']
  const fmt = formats.includes(format) ? format : 'png'

  async function run() {
    if (!canvas) return
    setBusy(true)
    try {
      if (scope === 'canvas') onLegacyExport(fmt === 'pdf' ? 'png' : fmt, mult)
      else if (scope === 'selection') {
        const url = selectionToDataURL(canvas, mult)
        if (url) { const a = document.createElement('a'); a.href = url; a.download = `selezione@${mult}x.png`; a.click() }
      } else await exportBoards(canvas, { format: fmt, multiplier: mult, transparent }, scope === 'board' && current ? [current] : undefined)
      onDone()
    } catch (e) {
      alert('Esportazione non riuscita: ' + (e as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-[#141414] border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-3 w-[250px]">
      <div className="flex flex-col gap-1">
        <p className="text-[7px] text-white/25 uppercase tracking-widest">Cosa</p>
        <div className="flex flex-wrap gap-1">
          <Chip on={scope === 'board'} disabled={!current} onClick={() => setScope('board')}>{current ? boardLabel(current) : 'Tavola'}</Chip>
          <Chip on={scope === 'all'} disabled={!boards.length} onClick={() => setScope('all')}>Tutte ({boards.length})</Chip>
          <Chip on={scope === 'selection'} disabled={!active} onClick={() => setScope('selection')}>Selezione</Chip>
          <Chip on={scope === 'canvas'} onClick={() => setScope('canvas')}>Vista</Chip>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[7px] text-white/25 uppercase tracking-widest">Formato</p>
        <div className="flex gap-1">
          {(['png', 'jpg', 'svg', 'pdf'] as const).map(f => (
            <Chip key={f} on={fmt === f} disabled={!formats.includes(f)} onClick={() => setFormat(f)}>{f}</Chip>
          ))}
        </div>
      </div>
      {fmt !== 'svg' && (
        <div className="flex flex-col gap-1">
          <p className="text-[7px] text-white/25 uppercase tracking-widest">Scala</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(m => <Chip key={m} on={mult === m} onClick={() => setMult(m)}>{m}x</Chip>)}
          </div>
        </div>
      )}
      {fmt === 'png' && (scope === 'board' || scope === 'all') && (
        <label className="flex items-center gap-2 text-[9px] text-white/50 cursor-pointer select-none">
          <input type="checkbox" checked={transparent} onChange={e => setTransparent(e.target.checked)} className="accent-accent" />
          Sfondo trasparente
        </label>
      )}
      <button onClick={run} disabled={busy || !canvas}
        className="h-8 rounded-lg bg-accent/90 text-black text-[9px] font-black uppercase tracking-widest hover:bg-accent disabled:opacity-40 transition-colors">
        {busy ? 'Esporto…' : 'Esporta'}
      </button>
    </div>
  )
}
