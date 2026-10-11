'use client'

/**
 * Pannello "Ritocco" per l'immagine selezionata: timbro clone, correttivo,
 * scherma/brucia, sfumino, sfoca/nitidezza, maschera dipinta, bacchetta magica.
 *
 * Tasti mentre è aperto: [ ] dimensione pennello, Canc elimina la selezione,
 * Ctrl+D deseleziona, Ctrl+J livello tramite copia, Esc chiude.
 */
import React, { useEffect, useRef, useState } from 'react'
import * as fabric from 'fabric'
import { Stamp, Bandage, Sun, Moon, Hand, Droplets, Focus, EyeOff, Eye, Wand } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RetouchSession, type RetouchTool, type ToneRange } from './retouch'

const TOOLS: { id: RetouchTool; icon: React.ElementType; label: string; hint: string }[] = [
  { id: 'clone', icon: Stamp, label: 'Timbro', hint: 'Alt+clic sull’origine, poi dipingi dove copiarla' },
  { id: 'heal', icon: Bandage, label: 'Correttivo', hint: 'Dipingi sul difetto: al rilascio si ricostruisce dai dintorni' },
  { id: 'dodge', icon: Sun, label: 'Scherma', hint: 'Schiarisce dove passi' },
  { id: 'burn', icon: Moon, label: 'Brucia', hint: 'Scurisce dove passi' },
  { id: 'smudge', icon: Hand, label: 'Sfumino', hint: 'Trascina i colori come col dito' },
  { id: 'blur', icon: Droplets, label: 'Sfoca', hint: 'Ammorbidisce dove passi' },
  { id: 'sharpen', icon: Focus, label: 'Nitidezza', hint: 'Aumenta il dettaglio dove passi' },
  { id: 'mask-hide', icon: EyeOff, label: 'Nascondi', hint: 'Maschera: dipingi per nascondere (non distruttivo)' },
  { id: 'mask-show', icon: Eye, label: 'Mostra', hint: 'Maschera: dipingi per far riapparire' },
  { id: 'wand', icon: Wand, label: 'Bacchetta', hint: 'Clic seleziona per colore · Maiusc aggiunge · Alt toglie' },
]

function Row({ label, value, min, max, onChange, suffix = '' }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[9px] text-white/40 w-16 flex-shrink-0">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="flex-1 accent-accent" />
      <span className="text-[9px] font-bold text-white/60 w-10 text-right">{value}{suffix}</span>
    </label>
  )
}

function SmallBtn({ onClick, children, title, disabled }: { onClick: () => void; children: React.ReactNode; title?: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className="h-6 px-2 rounded-md text-[8px] font-bold uppercase tracking-wider bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-25 disabled:pointer-events-none">
      {children}
    </button>
  )
}

export function RetouchPanel({ canvas, onClose }: { canvas: fabric.Canvas; onClose: () => void }) {
  const [session, setSession] = useState<RetouchSession | null>(null)
  const [tool, setTool] = useState<RetouchTool>('clone')
  const [opts, setOpts] = useState(() => ({ size: 60, hardness: 40, strength: 60, range: 'mids' as ToneRange, tolerance: 32, contiguous: true }))
  const [msg, setMsg] = useState<string | null>(null)
  const [, force] = useState(0)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  // la sessione vive finché il pannello è aperto sulla stessa immagine
  useEffect(() => {
    const img = canvas.getActiveObject()
    if (!(img instanceof fabric.FabricImage)) return
    const s = new RetouchSession(canvas, img)
    s.onChange = m => { if (m === 'ended') { closeRef.current(); return } if (m !== undefined) setMsg(m); force(n => n + 1) }
    setSession(s) // eslint-disable-line react-hooks/set-state-in-effect
    return () => { s.end() }
  }, [canvas])

  useEffect(() => { session?.configure(tool, opts) }, [session, tool, opts])

  useEffect(() => {
    if (!session) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      const mod = e.ctrlKey || e.metaKey
      const stop = () => { e.preventDefault(); e.stopImmediatePropagation() }
      if (e.key === '[' || e.key === ']') { stop(); setOpts(o => ({ ...o, size: Math.max(2, Math.min(600, Math.round(o.size * (e.key === ']' ? 1.2 : 1 / 1.2)))) })); return }
      if (e.key === 'Escape') { stop(); closeRef.current(); return }
      if ((e.key === 'Delete' || e.key === 'Backspace') && session.hasSelection) { stop(); session.deleteSelection(); return }
      if ((e.key === 'Delete' || e.key === 'Backspace')) { stop(); return } // l'immagine non si cancella mentre si ritocca
      if (mod && e.key.toLowerCase() === 'd') { stop(); session.deselect(); return }
      if (mod && e.key.toLowerCase() === 'j') { stop(); if (session.hasSelection) session.copySelectionToLayer() ; return }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [session])

  if (!session) return (
    <div className="bg-[#141414]/95 border border-white/10 rounded-xl p-3 w-[300px] text-[10px] text-white/40">Seleziona un’immagine per ritoccarla.</div>
  )
  const def = TOOLS.find(t => t.id === tool)!
  const set = (patch: Partial<typeof opts>) => setOpts(o => ({ ...o, ...patch }))

  return (
    <div className="bg-[#141414]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-3 w-[300px] max-h-[60vh] overflow-y-auto"
      onMouseDown={e => { const t = (e.target as HTMLElement).tagName; if (t !== 'INPUT' && t !== 'SELECT') e.preventDefault() }}>
      <div className="flex items-center justify-between">
        <p className="text-[7px] text-white/25 uppercase tracking-widest">Ritocco</p>
        <SmallBtn onClick={onClose} title="Fine ritocco · Esc">Fine</SmallBtn>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => { setTool(t.id); setMsg(null) }} title={`${t.label}: ${t.hint}`}
            className={cn('flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors',
              tool === t.id ? 'bg-accent/20 text-accent' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white')}>
            <t.icon className="w-3.5 h-3.5" />
            <span className="text-[6.5px] font-bold uppercase tracking-wider">{t.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[9px] text-white/45 leading-snug">{def.hint}</p>

      {tool !== 'wand' ? <>
        <Row label="Dimensione" value={opts.size} min={2} max={600} suffix="px" onChange={v => set({ size: v })} />
        <Row label="Durezza" value={opts.hardness} min={0} max={100} suffix="%" onChange={v => set({ hardness: v })} />
        {tool !== 'heal' && <Row label={tool.startsWith('mask') || tool === 'clone' ? 'Opacità' : 'Intensità'} value={opts.strength} min={1} max={100} suffix="%" onChange={v => set({ strength: v })} />}
        {(tool === 'dodge' || tool === 'burn') && (
          <div className="flex gap-1">
            {([['shadows', 'Ombre'], ['mids', 'Mezzitoni'], ['highlights', 'Luci']] as [ToneRange, string][]).map(([r, l]) => (
              <button key={r} onClick={() => set({ range: r })}
                className={cn('flex-1 h-6 rounded-md text-[8px] font-bold uppercase tracking-wider', opts.range === r ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40')}>{l}</button>
            ))}
          </div>
        )}
      </> : <>
        <Row label="Tolleranza" value={opts.tolerance} min={0} max={255} onChange={v => set({ tolerance: v })} />
        <label className="flex items-center gap-2 text-[9px] text-white/50">
          <input type="checkbox" checked={opts.contiguous} onChange={e => set({ contiguous: e.target.checked })} className="accent-accent" />
          Solo zone contigue
        </label>
      </>}

      <div className="flex flex-col gap-1.5 pt-1 border-t border-white/5">
        <p className="text-[7px] text-white/25 uppercase tracking-widest">Selezione {session.hasSelection ? '· limita i pennelli' : ''}</p>
        <div className="flex flex-wrap gap-1">
          <SmallBtn onClick={() => session.selectAll()}>Tutto</SmallBtn>
          <SmallBtn onClick={() => session.invertSelection()} disabled={!session.hasSelection}>Inverti</SmallBtn>
          <SmallBtn onClick={() => session.deselect()} disabled={!session.hasSelection} title="Ctrl+D">Deseleziona</SmallBtn>
          <SmallBtn onClick={() => session.deleteSelection()} disabled={!session.hasSelection} title="Canc: rende trasparente la zona">Elimina</SmallBtn>
          <SmallBtn onClick={() => session.maskFromSelection()} disabled={!session.hasSelection} title="Ciò che è fuori dalla selezione viene nascosto">In maschera</SmallBtn>
          <SmallBtn onClick={() => session.copySelectionToLayer()} disabled={!session.hasSelection} title="Livello tramite copia · Ctrl+J">Nuovo livello</SmallBtn>
        </div>
      </div>
      {session.hasMask && (
        <div className="flex flex-col gap-1.5 pt-1 border-t border-white/5">
          <p className="text-[7px] text-white/25 uppercase tracking-widest">Maschera</p>
          <div className="flex gap-1">
            <SmallBtn onClick={() => session.applyMask()} title="I pixel nascosti diventano trasparenti">Applica</SmallBtn>
            <SmallBtn onClick={() => session.removeMask()} title="Torna visibile tutta l'immagine">Elimina maschera</SmallBtn>
          </div>
        </div>
      )}
      {msg && <p className="text-[10px] text-amber-300/90 leading-snug">{msg}</p>}
    </div>
  )
}
