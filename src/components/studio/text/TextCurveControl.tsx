'use client'

/** Cursore "Curva" per il testo selezionato (−100 ∪ … 0 dritto … +100 ∩). */
import React, { useEffect, useRef, useState } from 'react'
import * as fabric from 'fabric'
import { cn } from '@/lib/utils'
import { applyTextCurve, getTextCurve, isText } from './curve'

const PRESETS = [{ v: -60, l: '∪' }, { v: 0, l: '—' }, { v: 40, l: '⌒' }, { v: 100, l: '◯' }]

export function TextCurveControl({ canvas }: { canvas: fabric.Canvas | null }) {
  const [value, setValue] = useState(0)
  const [visible, setVisible] = useState(false)
  // le conversioni Textbox ⇄ IText sono asincrone: durante il trascinamento si accodano
  const chain = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    if (!canvas) return
    const sync = () => {
      const o = canvas.getActiveObject()
      setVisible(isText(o))
      setValue(getTextCurve(o))
    }
    const evs = ['selection:created', 'selection:updated', 'selection:cleared'] as const
    evs.forEach(e => canvas.on(e, sync))
    sync()
    return () => { evs.forEach(e => canvas.off(e, sync)) }
  }, [canvas])

  if (!canvas || !visible) return null

  const apply = (v: number) => {
    setValue(v)
    chain.current = chain.current.then(() => {
      const o = canvas.getActiveObject()
      return isText(o) ? applyTextCurve(canvas, o, v) : undefined
    }).catch(e => console.warn('[curva] non applicata', e))
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/5 mt-2" title="Curva il testo lungo un arco (una riga)">
      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Curva</span>
      <input type="range" min={-100} max={100} value={value} onChange={e => apply(parseInt(e.target.value))}
        onDoubleClick={() => apply(0)} className="flex-1 min-w-[80px] accent-accent opacity-70 hover:opacity-100 transition-opacity" />
      <span className="text-[10px] font-black text-white/60 w-8 text-right">{value}</span>
      <div className="flex items-center gap-0.5">
        {PRESETS.map(p => (
          <button key={p.v} onClick={() => apply(p.v)}
            className={cn('w-6 h-6 rounded-md text-[11px] leading-none transition-colors',
              value === p.v ? 'bg-accent text-black' : 'text-white/40 hover:bg-white/10 hover:text-white')}>{p.l}</button>
        ))}
      </div>
    </div>
  )
}
