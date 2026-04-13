'use client'

/**
 * animation-timeline.tsx
 *
 * Full keyframe animation timeline for the Creative OS canvas.
 * Renders below the canvas in animation mode.
 *
 * Features:
 *  - Per-object tracks with keyframe diamond markers
 *  - Draggable playhead scrubber
 *  - Record / Play / Stop buttons
 *  - Duration resizer
 *  - Preset animation library panel
 *  - Keyframe easing selector
 */

import React, { useRef, useState, useCallback } from 'react'
import {
  Play, Square, Circle, Trash2, ChevronDown,
  ZoomIn, ZoomOut, Mic, Sparkles, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type AnimTrack,
  type AnimKeyframe,
  type AnimPreset,
} from './hooks/use-animation-engine'

// ─── Preset catalogue ─────────────────────────────────────────────────────────

const PRESET_GROUPS: { label: string; items: { id: AnimPreset; label: string }[] }[] = [
  {
    label: 'Entrata',
    items: [
      { id: 'fadeIn',    label: 'Fade In'     },
      { id: 'slideLeft', label: 'Slide ←'     },
      { id: 'slideRight',label: 'Slide →'     },
      { id: 'slideUp',   label: 'Slide ↑'     },
      { id: 'slideDown', label: 'Slide ↓'     },
      { id: 'scaleIn',   label: 'Scale In'    },
      { id: 'pop',       label: 'Pop'         },
      { id: 'bounceIn',  label: 'Bounce In'   },
    ],
  },
  {
    label: 'Uscita',
    items: [
      { id: 'fadeOut',   label: 'Fade Out'    },
      { id: 'scaleOut',  label: 'Scale Out'   },
    ],
  },
  {
    label: 'Loop',
    items: [
      { id: 'pulse',     label: 'Pulse'       },
      { id: 'spin360',   label: 'Spin 360°'   },
      { id: 'shake',     label: 'Shake'       },
    ],
  },
  {
    label: 'Scrittura',
    items: [
      { id: 'typeOn',    label: '✍ Typewriter' },
    ],
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function KeyframeDiamond({
  kf, track, pxPerSec, selected, onSelect, onDelete,
}: {
  kf: AnimKeyframe; track: AnimTrack; pxPerSec: number
  selected: boolean
  onSelect: () => void; onDelete: () => void
}) {
  const left = kf.time * pxPerSec

  return (
    <div
      className={cn(
        'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10 group',
      )}
      style={{ left }}
      onClick={e => { e.stopPropagation(); onSelect() }}
      title={`t=${kf.time.toFixed(2)}s`}
    >
      <div className={cn(
        'w-3 h-3 rotate-45 border-2 transition-all',
        selected
          ? 'bg-white border-white scale-125'
          : 'bg-transparent border-white/60 group-hover:border-white group-hover:scale-110',
      )} style={{ borderColor: selected ? '#fff' : track.color }} />
      {selected && (
        <button
          className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => { e.stopPropagation(); onDelete() }}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  tracks:      AnimTrack[]
  currentTime: number
  duration:    number
  isPlaying:   boolean
  isRecording: boolean
  onSeek:      (t: number) => void
  onPlay:      () => void
  onStop:      () => void
  onRecord:    (v: boolean) => void
  onPreset:    (p: AnimPreset, startAt: number) => void
  onDeleteKf:  (objectId: string, time: number) => void
  onDeleteTrack: (objectId: string) => void
  onSetDuration: (d: number) => void
  onClear:     () => void
}

export function AnimationTimeline({
  tracks, currentTime, duration, isPlaying, isRecording,
  onSeek, onPlay, onStop, onRecord, onPreset,
  onDeleteKf, onDeleteTrack, onSetDuration, onClear,
}: Props) {
  const [zoom,         setZoom]         = useState(80)   // px per second
  const [showPresets,  setShowPresets]  = useState(false)
  const [selectedKf,   setSelectedKf]  = useState<{ oid: string; time: number } | null>(null)
  const [presetAt,     setPresetAt]    = useState(0)     // insert preset at this time

  const rulerRef    = useRef<HTMLDivElement>(null)
  const isDragging  = useRef(false)

  const pxPerSec = zoom

  // ── Ruler click / drag for seek ──────────────────────────────────────────────
  const handleRulerPointer = useCallback((e: React.PointerEvent) => {
    if (!rulerRef.current) return
    const rect = rulerRef.current.getBoundingClientRect()
    const x    = e.clientX - rect.left
    const t    = Math.max(0, Math.min(x / pxPerSec, duration))
    onSeek(t)
    isDragging.current = true
    rulerRef.current.setPointerCapture(e.pointerId)
  }, [pxPerSec, duration, onSeek])

  const handleRulerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !rulerRef.current) return
    const rect = rulerRef.current.getBoundingClientRect()
    const t    = Math.max(0, Math.min((e.clientX - rect.left) / pxPerSec, duration))
    onSeek(t)
  }, [pxPerSec, duration, onSeek])

  const handleRulerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false
    rulerRef.current?.releasePointerCapture(e.pointerId)
  }, [])

  // ── Ruler ticks ──────────────────────────────────────────────────────────────
  const totalWidth = duration * pxPerSec + 60
  const tickStep   = pxPerSec >= 60 ? 1 : pxPerSec >= 30 ? 2 : 5
  const ticks: number[] = []
  for (let t = 0; t <= duration + tickStep; t += tickStep) ticks.push(t)

  const fmt = (t: number) => {
    const m = Math.floor(t / 60), s = t % 60
    return m > 0 ? `${m}:${s.toString().padStart(2,'0')}` : `${s}s`
  }

  return (
    <div className="flex flex-col h-full bg-[#080808] border-t border-white/[0.05] select-none">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="h-10 flex-shrink-0 flex items-center gap-2 px-4 border-b border-white/[0.05]">

        {/* Transport */}
        <button
          onClick={() => isPlaying ? onStop() : onPlay()}
          className={cn(
            'flex items-center gap-1.5 h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
            isPlaying
              ? 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30'
              : 'bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30',
          )}
        >
          {isPlaying
            ? <><Square className="w-3 h-3 fill-current" />Stop</>
            : <><Play   className="w-3 h-3 fill-current" />Play</>}
        </button>

        {/* Record */}
        <button
          onClick={() => onRecord(!isRecording)}
          className={cn(
            'flex items-center gap-1.5 h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border',
            isRecording
              ? 'bg-red-600/30 border-red-500/60 text-red-300 animate-pulse'
              : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60 hover:bg-white/[0.08]',
          )}
        >
          <Circle className={cn('w-2.5 h-2.5', isRecording && 'fill-red-400 text-red-400')} />
          {isRecording ? 'REC' : 'Rec'}
        </button>

        <div className="w-px h-5 bg-white/[0.06] mx-1" />

        {/* Presets */}
        <button
          onClick={() => setShowPresets(p => !p)}
          className={cn(
            'flex items-center gap-1.5 h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all',
            showPresets
              ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
              : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60',
          )}
        >
          <Sparkles className="w-3 h-3" /> Preset
        </button>

        <div className="w-px h-5 bg-white/[0.06] mx-1" />

        {/* Timecode */}
        <span className="text-[10px] font-mono text-white/40 tabular-nums w-14">
          {fmt(Math.floor(currentTime))}
        </span>
        <span className="text-[8px] text-white/20">/ {fmt(duration)}</span>

        <div className="flex-1" />

        {/* Duration */}
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-white/20 uppercase tracking-widest">Dur.</span>
          <input
            type="number" min={1} max={300} step={1} value={duration}
            onChange={e => onSetDuration(Math.max(1, parseInt(e.target.value) || 10))}
            className="w-14 h-6 px-1.5 text-center bg-white/[0.04] border border-white/[0.08] rounded-lg text-[10px] font-bold text-white/60 focus:outline-none focus:border-accent/40"
          />
          <span className="text-[8px] text-white/20">s</span>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-0.5 ml-2">
          <button onClick={() => setZoom(z => Math.max(20, z - 20))} className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white/60 rounded-lg hover:bg-white/[0.05]">
            <ZoomOut className="w-3 h-3" />
          </button>
          <button onClick={() => setZoom(z => Math.min(200, z + 20))} className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white/60 rounded-lg hover:bg-white/[0.05]">
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        {/* Clear */}
        {tracks.length > 0 && (
          <button onClick={onClear} className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-red-400 rounded-lg hover:bg-white/[0.05] ml-1" title="Cancella tutto">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Preset panel (collapsible) ─────────────────────────────────────── */}
      {showPresets && (
        <div className="flex-shrink-0 border-b border-white/[0.05] bg-[#0a0a0a] px-4 py-3 flex gap-6">
          {/* Preset at time */}
          <div className="flex items-center gap-2 mr-2">
            <span className="text-[7px] font-black uppercase tracking-widest text-white/20">A t=</span>
            <input
              type="number" min={0} max={duration} step={0.1} value={presetAt.toFixed(1)}
              onChange={e => setPresetAt(parseFloat(e.target.value) || 0)}
              className="w-14 h-6 px-1.5 text-center bg-white/[0.04] border border-white/[0.08] rounded-lg text-[10px] font-bold text-white/60 focus:outline-none"
            />
            <span className="text-[7px] text-white/20">s</span>
          </div>

          {PRESET_GROUPS.map(group => (
            <div key={group.label} className="flex flex-col gap-1.5">
              <p className="text-[7px] font-black uppercase tracking-widest text-white/20">{group.label}</p>
              <div className="flex flex-wrap gap-1">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { onPreset(item.id, presetAt); setShowPresets(false) }}
                    className="h-6 px-2.5 rounded-lg text-[9px] font-bold text-white/50 bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.09] hover:text-white/80 transition-all"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Track area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">

        {/* Track labels */}
        <div className="w-36 flex-shrink-0 border-r border-white/[0.05] overflow-hidden">
          {/* Ruler spacer */}
          <div className="h-6 border-b border-white/[0.05]" />
          {/* Track rows */}
          <div className="overflow-y-auto scrollbar-hide">
            {tracks.map(track => (
              <div key={track.objectId}
                className="h-9 flex items-center gap-2 px-3 border-b border-white/[0.03] group">
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: track.color }} />
                <span className="text-[9px] font-bold text-white/40 truncate flex-1 group-hover:text-white/70">
                  {track.objectName}
                </span>
                <button onClick={() => onDeleteTrack(track.objectId)}
                  className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable timeline lanes */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide relative">
          <div style={{ width: totalWidth, minWidth: '100%', height: '100%' }} className="relative">

            {/* Ruler */}
            <div
              ref={rulerRef}
              className="h-6 border-b border-white/[0.05] relative bg-[#0a0a0a] cursor-col-resize"
              onPointerDown={handleRulerPointer}
              onPointerMove={handleRulerMove}
              onPointerUp={handleRulerUp}
            >
              {ticks.map(t => (
                <div key={t} className="absolute top-0 bottom-0 flex flex-col items-center"
                  style={{ left: t * pxPerSec }}>
                  <div className={cn('w-px bg-white/10', t % 5 === 0 ? 'h-3' : 'h-1.5')} />
                  {t % 5 === 0 && (
                    <span className="text-[7px] font-mono text-white/20 mt-0.5 whitespace-nowrap">{fmt(t)}</span>
                  )}
                </div>
              ))}
              {/* Playhead on ruler */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-accent/80 z-20 pointer-events-none"
                style={{ left: currentTime * pxPerSec }}
              />
            </div>

            {/* Track lanes */}
            {tracks.map(track => (
              <div
                key={track.objectId}
                className="h-9 border-b border-white/[0.03] relative"
                style={{ width: totalWidth }}
                onClick={e => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                  const t    = Math.max(0, (e.clientX - rect.left) / pxPerSec)
                  setPresetAt(Math.round(t * 10) / 10)
                }}
              >
                {/* Lane fill */}
                <div className="absolute inset-y-0 left-0 right-0 opacity-[0.04]"
                  style={{ background: track.color }} />

                {/* Keyframe diamonds */}
                {track.keyframes.map(kf => (
                  <KeyframeDiamond
                    key={kf.time}
                    kf={kf} track={track} pxPerSec={pxPerSec}
                    selected={selectedKf?.oid === track.objectId && Math.abs(selectedKf.time - kf.time) < 0.01}
                    onSelect={() => setSelectedKf({ oid: track.objectId, time: kf.time })}
                    onDelete={() => { onDeleteKf(track.objectId, kf.time); setSelectedKf(null) }}
                  />
                ))}
              </div>
            ))}

            {/* Empty state */}
            {tracks.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/10">
                <Mic className="w-5 h-5" />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  Attiva REC e muovi oggetti, o scegli un Preset
                </span>
              </div>
            )}

            {/* Global playhead */}
            <div
              className="absolute top-6 bottom-0 w-px z-20 pointer-events-none"
              style={{ left: currentTime * pxPerSec, background: 'rgba(139,92,246,0.7)' }}
            >
              <div className="w-2 h-2 rounded-full bg-violet-400 -translate-x-[3px] -translate-y-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
