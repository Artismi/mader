'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Geometry primitives ────────────────────────────────────────────────────

type Pt = [number, number]

function extractPolyline(path: any[]): { pts: Pt[]; closed: boolean } {
  const pts: Pt[] = []
  let closed = false
  let cx = 0, cy = 0
  for (const cmd of path) {
    const t = (cmd[0] as string).toUpperCase()
    if      (t === 'M') { cx = cmd[1]; cy = cmd[2]; pts.push([cx, cy]) }
    else if (t === 'L') { cx = cmd[1]; cy = cmd[2]; pts.push([cx, cy]) }
    else if (t === 'H') { cx = cmd[1]; pts.push([cx, cy]) }
    else if (t === 'V') { cy = cmd[1]; pts.push([cx, cy]) }
    else if (t === 'C') { cx = cmd[5]; cy = cmd[6]; pts.push([cx, cy]) }
    else if (t === 'Q') { cx = cmd[3]; cy = cmd[4]; pts.push([cx, cy]) }
    else if (t === 'Z') { closed = true }
  }
  return { pts, closed }
}

function ptsToLinear(pts: Pt[], closed: boolean): any[] {
  if (!pts.length) return []
  const r: any[] = [['M', pts[0][0], pts[0][1]]]
  for (let i = 1; i < pts.length; i++) r.push(['L', pts[i][0], pts[i][1]])
  if (closed) r.push(['Z'])
  return r
}

function ptsToCatmull(pts: Pt[], closed: boolean): any[] {
  if (pts.length < 2) return ptsToLinear(pts, closed)
  const n = pts.length
  const r: any[] = [['M', pts[0][0], pts[0][1]]]
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(i + 2, n - 1)]
    r.push(['C',
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1],
    ])
  }
  if (closed) r.push(['Z'])
  return r
}

// ─── Algorithms ─────────────────────────────────────────────────────────────

function subdivide(pts: Pt[], iters: number): Pt[] {
  let cur = pts
  for (let it = 0; it < iters; it++) {
    const next: Pt[] = [cur[0]]
    for (let i = 0; i < cur.length - 1; i++) {
      next.push([(cur[i][0] + cur[i + 1][0]) / 2, (cur[i][1] + cur[i + 1][1]) / 2])
      next.push(cur[i + 1])
    }
    cur = next
  }
  return cur
}

// Laplacian smoothing — pull each interior point toward neighbor average
function pathAverage(pts: Pt[], iters: number, str: number): Pt[] {
  let cur = pts
  for (let it = 0; it < iters; it++) {
    const next: Pt[] = [cur[0]]
    for (let i = 1; i < cur.length - 1; i++) {
      const ax = (cur[i - 1][0] + cur[i + 1][0]) / 2
      const ay = (cur[i - 1][1] + cur[i + 1][1]) / 2
      next.push([cur[i][0] + (ax - cur[i][0]) * str, cur[i][1] + (ay - cur[i][1]) * str])
    }
    next.push(cur[cur.length - 1])
    cur = next
  }
  return cur
}

// Anti-Laplacian — push each point away from the averaged position to preserve arc length
function pathRelax(pts: Pt[], iters: number, str: number): Pt[] {
  let cur = pts
  for (let it = 0; it < iters; it++) {
    const next: Pt[] = [cur[0]]
    for (let i = 1; i < cur.length - 1; i++) {
      const ax = (cur[i - 1][0] + cur[i + 1][0]) / 2
      const ay = (cur[i - 1][1] + cur[i + 1][1]) / 2
      next.push([cur[i][0] - (ax - cur[i][0]) * str, cur[i][1] - (ay - cur[i][1]) * str])
    }
    next.push(cur[cur.length - 1])
    cur = next
  }
  return cur
}

function pipeline(pts: Pt[], params: RelaxParams): Pt[] {
  let p = subdivide(pts, params.subdivideN)
  p = pathAverage(p, params.avgIter, params.avgStr / 100)
  p = pathRelax(p, params.relaxIter, params.relaxStr / 100)
  return p
}

function applyToObj(obj: any, canvas: any, pts: Pt[], closed: boolean, catmull: boolean) {
  const newPath = catmull ? ptsToCatmull(pts, closed) : ptsToLinear(pts, closed)
  obj.set({ path: newPath })
  ;(obj as any)._setPositionDimensions?.({})
  obj.setCoords()
  canvas.requestRenderAll()
}

// ─── Presets ─────────────────────────────────────────────────────────────────

interface RelaxParams {
  subdivideN: number
  avgIter: number
  avgStr: number
  relaxIter: number
  relaxStr: number
  catmull: boolean
}

const DEFAULTS: RelaxParams = { subdivideN: 1, avgIter: 3, avgStr: 40, relaxIter: 2, relaxStr: 20, catmull: true }

const PRESETS: { name: string; color: string; p: RelaxParams }[] = [
  { name: 'Gentle Bloom',   color: '#a8ff78', p: { subdivideN: 1, avgIter: 3, avgStr: 40, relaxIter: 2, relaxStr: 20, catmull: true } },
  { name: 'Organic Spread', color: '#f9ca24', p: { subdivideN: 2, avgIter: 5, avgStr: 55, relaxIter: 3, relaxStr: 30, catmull: true } },
  { name: 'Sharp Burst',    color: '#ff6b6b', p: { subdivideN: 3, avgIter: 2, avgStr: 25, relaxIter: 4, relaxStr: 50, catmull: false } },
  { name: 'Wave Flow',      color: '#74b9ff', p: { subdivideN: 2, avgIter: 4, avgStr: 50, relaxIter: 3, relaxStr: 35, catmull: true } },
  { name: 'Tight Creep',    color: '#dfe6e9', p: { subdivideN: 1, avgIter: 2, avgStr: 20, relaxIter: 2, relaxStr: 15, catmull: false } },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function PathRelaxPanel({ fabricObject, fabricCanvas, onClose, onApply }: {
  fabricObject: any
  fabricCanvas: any
  onClose: () => void
  onApply: () => void
}) {
  const [params, setParams] = useState<RelaxParams>(DEFAULTS)
  const origRef = useRef<{ pts: Pt[]; closed: boolean } | null>(null)

  // Preserve original path on first open
  useEffect(() => {
    if (!fabricObject) return
    if (!(fabricObject as any)._pathRelaxOriginal) {
      ;(fabricObject as any)._pathRelaxOriginal = JSON.parse(JSON.stringify(fabricObject.path))
    }
    origRef.current = extractPolyline((fabricObject as any)._pathRelaxOriginal)
  }, [fabricObject])

  // Live preview — re-run pipeline whenever params change
  useEffect(() => {
    if (!fabricObject || !fabricCanvas || !origRef.current) return
    const { pts, closed } = origRef.current
    const relaxed = pipeline(pts, params)
    applyToObj(fabricObject, fabricCanvas, relaxed, closed, params.catmull)
  }, [params, fabricObject, fabricCanvas])

  function set<K extends keyof RelaxParams>(key: K, val: RelaxParams[K]) {
    setParams(p => ({ ...p, [key]: val }))
  }

  function handlePreset(p: RelaxParams) { setParams(p) }

  function handleReset() {
    if (!origRef.current) return
    setParams(DEFAULTS)
    const { pts, closed } = origRef.current
    applyToObj(fabricObject, fabricCanvas, pts, closed, false)
  }

  function handleClose() {
    // Revert to original and close
    if (origRef.current) {
      const { pts, closed } = origRef.current
      applyToObj(fabricObject, fabricCanvas, pts, closed, false)
    }
    onClose()
  }

  function handleApply() {
    onApply()
    onClose()
  }

  return (
    <div className="fixed top-14 left-[72px] bottom-20 z-[200] w-72 bg-[#141414]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_rgba(167,139,250,0.5)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Path Relax</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="text-[9px] font-black text-white/25 hover:text-white uppercase tracking-widest transition-colors">Reset</button>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-white/20 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-5">

        {/* Presets */}
        <div>
          <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2.5">Presets</p>
          <div className="flex flex-col gap-1">
            {PRESETS.map(pre => (
              <button key={pre.name} onClick={() => handlePreset(pre.p)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all text-left group">
                <div className="w-2 h-2 rounded-full flex-shrink-0 transition-all group-hover:scale-125"
                  style={{ backgroundColor: pre.color, boxShadow: `0 0 5px ${pre.color}50` }} />
                <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/35 group-hover:text-white/65 transition-colors">{pre.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Subdivide */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Subdivide</p>
          <SRow label="Iter." value={params.subdivideN} min={0} max={4} step={1}
            onChange={v => set('subdivideN', v)} />
        </div>

        {/* Path Average */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Path Average</p>
          <SRow label="Iter."  value={params.avgIter} min={0} max={12} step={1}
            onChange={v => set('avgIter', v)} />
          <SRow label="Forza"  value={params.avgStr}  min={0} max={100} step={1}
            onChange={v => set('avgStr', v)} suffix="%" />
        </div>

        {/* Path Relax */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <p className="text-[8px] font-black text-violet-400/50 uppercase tracking-[0.3em]">Path Relax</p>
          <SRow label="Iter."  value={params.relaxIter} min={0} max={12} step={1}
            onChange={v => set('relaxIter', v)} />
          <SRow label="Forza"  value={params.relaxStr}  min={0} max={100} step={1}
            onChange={v => set('relaxStr', v)} suffix="%" />
        </div>

        {/* Catmull-Rom */}
        <div className="pt-4 border-t border-white/5">
          <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2.5">Render</p>
          <button
            onClick={() => set('catmull', !params.catmull)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all',
              params.catmull
                ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                : 'border-white/5 text-white/30 hover:bg-white/5 hover:border-white/10'
            )}
          >
            <span className="text-[9px] font-black uppercase tracking-[0.12em]">Catmull-Rom Smooth</span>
            <div className={cn('w-2 h-2 rounded-full transition-all', params.catmull ? 'bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.6)]' : 'bg-white/10')} />
          </button>
        </div>

      </div>

      {/* Footer — Apply */}
      <div className="px-4 py-3 border-t border-white/8 flex-shrink-0 flex items-center gap-2">
        <button onClick={handleApply}
          className="flex-1 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-violet-500/30 transition-all">
          Applica
        </button>
        <button onClick={handleClose}
          className="py-2 px-3 rounded-xl border border-white/8 text-white/25 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white/50 transition-all">
          Annulla
        </button>
      </div>
    </div>
  )
}

function SRow({ label, value, min, max, step, onChange, suffix = '' }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; suffix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-white/30 w-10 flex-shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className="flex-1 accent-violet-400 cursor-pointer" />
      <span className="text-[9px] text-white/40 w-8 text-right flex-shrink-0">{value}{suffix}</span>
    </div>
  )
}
