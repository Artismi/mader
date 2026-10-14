'use client'

import React, { useState, useRef } from 'react'
import * as fabric from 'fabric'
import { X, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Auto-size font to fill a target pixel width ─────────────────────────────

function measureTextWidth(text: string, fontFamily: string, fontWeight: string, fontSize: number): number {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return fontSize * text.length * 0.6
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`
  return ctx.measureText(text).width
}

function fitFontSize(text: string, fontFamily: string, fontWeight: string, targetWidth: number): number {
  const baseMeasured = measureTextWidth(text, fontFamily, fontWeight, 100)
  if (baseMeasured <= 0) return 60
  return (targetWidth / baseMeasured) * 100 * 0.97 // 3% breathing room
}

// ─── Layout modes ────────────────────────────────────────────────────────────

type LayoutMode = 'fill' | 'pyramid' | 'cascade'
type TextAlign  = 'left' | 'center' | 'right'

interface StackParams {
  fontFamily:  string
  fontWeight:  string
  color:       string
  spacing:     number       // vertical gap between rows (px)
  align:       TextAlign
  mode:        LayoutMode
  leading:     number       // fractional line-height multiplier for pyramid
}

function computeRows(lines: string[], params: StackParams, containerWidth: number): {
  text: string; fontSize: number
}[] {
  const n = lines.length
  return lines.map((text, i) => {
    let targetW = containerWidth
    if (params.mode === 'pyramid') {
      // largest at centre, smaller toward edges — peak at middle index
      const centre = (n - 1) / 2
      const dist   = Math.abs(i - centre) / (centre || 1)  // 0 = peak, 1 = edge
      targetW = containerWidth * (1 - dist * 0.5)          // edge rows = 50% narrower
    } else if (params.mode === 'cascade') {
      // descending staircase: each row 10% narrower than the previous
      const factor = Math.max(0.4, 1 - i * 0.1)
      targetW = containerWidth * factor
    }
    return {
      text,
      fontSize: fitFontSize(text, params.fontFamily, params.fontWeight, targetW),
    }
  })
}

// ─── Fabric object creation ───────────────────────────────────────────────────

function buildTextboxes(
  lines: { text: string; fontSize: number }[],
  params: StackParams,
  originX: number,
  originY: number,
  containerWidth: number,
): fabric.Textbox[] {
  const objs: fabric.Textbox[] = []
  let curY = originY

  for (const { text, fontSize } of lines) {
    const tb = new fabric.Textbox(text, {
      left: originX,
      top:  curY,
      width: containerWidth,
      fontSize,
      fontFamily: params.fontFamily,
      fontWeight: params.fontWeight,
      fill: params.color,
      textAlign: params.align,
      selectable: true,
      hasControls: true,
    } as any)
    ;(tb as any)._isStackedText = true
    objs.push(tb)
    curY += fontSize * 1.02 + params.spacing
  }

  return objs
}

// ─── Panel component ─────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  'Montserrat', 'Archivo Black', 'Syncopate', 'Space Mono', 'Playfair Display',
  'Unbounded', 'Anton', 'Staatliches', 'Syne', 'Inter', 'Arial', 'Georgia',
]

const MODE_LABELS: { value: LayoutMode; label: string }[] = [
  { value: 'fill',    label: 'Fill' },
  { value: 'pyramid', label: 'Pyramid' },
  { value: 'cascade', label: 'Cascade' },
]

export function StackedTextPanel({ fabricCanvas, activeArtboard, onClose, onGenerate }: {
  fabricCanvas: any
  activeArtboard: any | null   // fabric Rect representing the active artboard
  onClose: () => void
  onGenerate: () => void       // pushHistory callback
}) {
  const [rawText, setRawText]   = useState('CREATIVI\nOS\nSTUDIO\nDESIGN')
  const [fontFamily, setFont]   = useState('Archivo Black')
  const [fontWeight, setWeight] = useState('bold')
  const [color, setColor]       = useState('#ffffff')
  const [spacing, setSpacing]   = useState(8)
  const [align, setAlign]       = useState<TextAlign>('left')
  const [mode, setMode]         = useState<LayoutMode>('fill')
  const [generating, setGenerating] = useState(false)

  function handleGenerate() {
    if (!fabricCanvas) return
    setGenerating(true)

    // Determine layout container
    let originX = 60, originY = 60, containerWidth = 600
    if (activeArtboard) {
      const ab = activeArtboard
      originX      = (ab.left ?? 0)
      originY      = (ab.top  ?? 0)
      containerWidth = ab.width  ?? 600
    } else {
      const vp = fabricCanvas.viewportTransform as number[]
      const vpW = fabricCanvas.getWidth()
      originX      = -vp[4] / vp[0] + 40
      originY      = -vp[5] / vp[3] + 40
      containerWidth = vpW / vp[0] - 80
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) { setGenerating(false); return }

    const params: StackParams = { fontFamily, fontWeight, color, spacing, align, mode, leading: 1.1 }
    const rowData = computeRows(lines, params, containerWidth)
    const textboxes = buildTextboxes(rowData, params, originX, originY, containerWidth)

    // Remove previously generated stacked text objects
    const prev = fabricCanvas.getObjects().filter((o: any) => o._isStackedText)
    prev.forEach((o: any) => fabricCanvas.remove(o))

    // Add new objects
    textboxes.forEach(tb => fabricCanvas.add(tb))
    fabricCanvas.discardActiveObject()
    fabricCanvas.requestRenderAll()

    onGenerate()
    setGenerating(false)
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto w-96 bg-[#141414]/99 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Layers className="w-3.5 h-3.5 text-accent/70" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">Stacked Text</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/20 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto scrollbar-hide">

          {/* Text input */}
          <div>
            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Testo — una riga per linea</p>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 font-mono resize-none outline-none focus:border-accent/40 focus:bg-white/8 transition-all placeholder-white/20 scrollbar-hide"
              placeholder={'RIGA UNO\nRIGA DUE\nRIGA TRE'}
            />
          </div>

          {/* Layout mode */}
          <div>
            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Layout</p>
            <div className="grid grid-cols-3 gap-1.5">
              {MODE_LABELS.map(m => (
                <button key={m.value} onClick={() => setMode(m.value)}
                  className={cn(
                    'py-2.5 rounded-xl border text-[8px] font-black uppercase tracking-[0.2em] transition-all',
                    mode === m.value
                      ? 'bg-accent/10 border-accent/30 text-accent'
                      : 'border-white/5 text-white/25 hover:bg-white/5 hover:text-white/50'
                  )}
                >{m.label}</button>
              ))}
            </div>
          </div>

          {/* Font + Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Font</p>
              <select
                value={fontFamily}
                onChange={e => setFont(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white/70 outline-none focus:border-accent/30 transition-all"
              >
                {FONT_OPTIONS.map(f => (
                  <option key={f} value={f} style={{ backgroundColor: '#141414' }}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Stile</p>
              <div className="grid grid-cols-2 gap-1">
                {(['bold', 'normal'] as const).map(w => (
                  <button key={w} onClick={() => setWeight(w)}
                    className={cn(
                      'py-2 rounded-xl border text-[8px] font-black uppercase tracking-[0.15em] transition-all',
                      fontWeight === w ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-white/25 hover:bg-white/5'
                    )}
                  >{w === 'bold' ? 'Bold' : 'Regular'}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Alignment + Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Allineamento</p>
              <div className="grid grid-cols-3 gap-1">
                {(['left', 'center', 'right'] as const).map(a => (
                  <button key={a} onClick={() => setAlign(a)}
                    className={cn(
                      'py-2 rounded-xl border text-[8px] font-black uppercase tracking-[0.1em] transition-all',
                      align === a ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-white/20 hover:bg-white/5'
                    )}
                  >{a === 'left' ? '←' : a === 'center' ? '↔' : '→'}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Colore</p>
              <div className="flex items-center gap-2">
                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
                <span className="text-[9px] text-white/40 font-mono">{color.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Spacing slider */}
          <div>
            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Spaziatura verticale</p>
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={60} step={1} value={spacing}
                onChange={e => setSpacing(parseInt(e.target.value))}
                className="flex-1 accent-accent" />
              <span className="text-[9px] text-white/40 w-8 text-right">{spacing}px</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/8 flex items-center gap-3">
          <button onClick={handleGenerate} disabled={generating}
            className="flex-1 py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent text-[9px] font-black uppercase tracking-[0.25em] hover:bg-accent/30 transition-all disabled:opacity-50">
            {generating ? '...' : 'Genera'}
          </button>
          <button onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-white/8 text-white/25 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white/50 transition-all">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
