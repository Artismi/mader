'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Volume2, VolumeX, Trash2, Play, Square, Scissors, Mic, Music,
  ChevronLeft, ChevronRight, Plus, ZoomIn, ZoomOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AudioTrack {
  id: string
  name: string
  url: string
  startTime: number   // position on timeline (seconds)
  duration: number    // total source duration (seconds)
  trimStart: number   // seconds cut from the start of the source
  trimEnd: number     // seconds cut from the end of the source
  volume: number      // 0-100
  isMuted: boolean
  type: 'video' | 'audio'
}

interface Props {
  tracks: AudioTrack[]
  currentTime: number
  isPlaying: boolean
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onUpdateTrack: (id: string, updates: Partial<AudioTrack>) => void
  onDeleteTrack: (id: string) => void
  onCutTrack: (id: string, atTime: number) => void   // split clip at playhead
  onAddTrack: () => void
  onGenerateSubtitles: () => void
}

// ─── Drag state ───────────────────────────────────────────────────────────────
type DragState =
  | { kind: 'move';       trackId: string; initStartTime: number; initX: number }
  | { kind: 'trim-left';  trackId: string; initTrimStart: number; initDuration: number; initStartTime: number; initX: number }
  | { kind: 'trim-right'; trackId: string; initTrimEnd: number;   initX: number }
  | { kind: 'seek';       initX: number }
  | null

const TRACK_INFO_W = 180 // px

export function AudioTimeline({
  tracks, currentTime, isPlaying, onTogglePlay, onSeek,
  onUpdateTrack, onDeleteTrack, onCutTrack, onAddTrack, onGenerateSubtitles,
}: Props) {
  const [zoom, setZoom]               = useState(60)   // px per second
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [drag, setDrag]               = useState<DragState>(null)
  const timelineRef                   = useRef<HTMLDivElement>(null)
  const dragRef                       = useRef<DragState>(null)

  // Keep ref in sync with state so document handlers can read it without re-binding
  useEffect(() => { dragRef.current = drag }, [drag])

  // ── Timeline click → seek ──────────────────────────────────────────────────
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return
    if (drag) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft - TRACK_INFO_W
    if (x < 0) return
    onSeek(x / zoom)
  }

  // ── Playhead drag (click on ruler) ────────────────────────────────────────
  const startSeekDrag = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDrag({ kind: 'seek', initX: e.clientX })
    const initScrollLeft = timelineRef.current?.scrollLeft ?? 0
    const initTime = currentTime
    const move = (ev: MouseEvent) => {
      const dx = ev.clientX - e.clientX
      const t = Math.max(0, initTime + dx / zoom)
      onSeek(t)
    }
    const up = () => { setDrag(null); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  // ── Clip drag / trim ──────────────────────────────────────────────────────
  const startClipDrag = (e: React.MouseEvent, track: AudioTrack, kind: 'move' | 'trim-left' | 'trim-right') => {
    e.stopPropagation()
    setSelectedId(track.id)

    const initX = e.clientX
    let ds: DragState
    if (kind === 'move') {
      ds = { kind: 'move', trackId: track.id, initStartTime: track.startTime, initX }
    } else if (kind === 'trim-left') {
      ds = { kind: 'trim-left', trackId: track.id, initTrimStart: track.trimStart, initDuration: track.duration, initStartTime: track.startTime, initX }
    } else {
      ds = { kind: 'trim-right', trackId: track.id, initTrimEnd: track.trimEnd, initX }
    }
    setDrag(ds)
    dragRef.current = ds

    const move = (ev: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = ev.clientX - initX
      const dt = dx / zoom

      if (d.kind === 'move') {
        onUpdateTrack(d.trackId, { startTime: Math.max(0, d.initStartTime + dt) })
      } else if (d.kind === 'trim-left') {
        // d.initDuration is the full source duration stored at drag start
        const maxRight = d.initDuration - d.initTrimStart - (track.trimEnd ?? 0) - 0.1
        const delta = Math.max(-d.initTrimStart, Math.min(dt, maxRight))
        onUpdateTrack(d.trackId, {
          trimStart: Math.max(0, d.initTrimStart + delta),
          startTime: Math.max(0, d.initStartTime + delta),
        })
      } else if (d.kind === 'trim-right') {
        const maxDelta = track.duration - (track.trimStart ?? 0) - d.initTrimEnd - 0.1
        const delta = Math.max(-maxDelta, dt)
        onUpdateTrack(d.trackId, { trimEnd: Math.max(0, d.initTrimEnd - delta) })
      }
    }

    const up = () => {
      setDrag(null)
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const totalDuration = Math.max(
    ...tracks.map(t => t.startTime + t.duration - t.trimStart - t.trimEnd),
    30
  )

  const timelineWidth = Math.max(totalDuration * zoom + TRACK_INFO_W + 200, 1600)

  // ── Ruler tick marks ──────────────────────────────────────────────────────
  const ticks = useCallback(() => {
    const step = zoom >= 100 ? 1 : zoom >= 40 ? 5 : 10
    const count = Math.ceil(totalDuration / step) + 1
    return Array.from({ length: count }, (_, i) => i * step)
  }, [zoom, totalDuration])

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const selectedTrack = tracks.find(t => t.id === selectedId)

  return (
    <div className="flex flex-col h-full bg-[#060606] border-t border-white/10 select-none">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="h-10 flex-shrink-0 flex items-center gap-2 px-3 border-b border-white/[0.06]">

        {/* Transport */}
        <button onClick={onTogglePlay}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all">
          {isPlaying
            ? <Square className="w-3.5 h-3.5 fill-current" />
            : <Play   className="w-3.5 h-3.5 fill-current" />}
        </button>

        <div className="text-[10px] font-mono text-white/50 w-20 text-center bg-white/[0.04] rounded px-2 py-0.5 tabular-nums">
          {fmt(currentTime)}
        </div>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Cut at playhead */}
        <button
          onClick={() => selectedId && onCutTrack(selectedId, currentTime)}
          disabled={!selectedId}
          title="Taglia clip al playhead (C)"
          className={cn(
            'flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
            selectedId
              ? 'bg-orange-500/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500/30'
              : 'bg-white/[0.03] border border-white/10 text-white/20 cursor-not-allowed'
          )}>
          <Scissors className="w-3 h-3" /> Taglia
        </button>

        {/* Add audio track */}
        <button onClick={onAddTrack}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-widest hover:bg-accent/20 transition-all">
          <Music className="w-3 h-3" /> Traccia Audio
        </button>

        <div className="flex-1" />

        {/* Subtitles */}
        <button onClick={onGenerateSubtitles}
          className="flex items-center gap-1.5 h-7 px-3 bg-violet-600/20 border border-violet-500/30 text-violet-300 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-violet-500/30 transition-all">
          <Mic className="w-3 h-3" /> AI Sottotitoli
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Zoom */}
        <button onClick={() => setZoom(z => Math.max(10, z - 20))}
          className="p-1.5 rounded-md bg-white/[0.03] border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all">
          <ZoomOut className="w-3 h-3" />
        </button>
        <span className="text-[8px] font-black text-white/20 w-8 text-center tabular-nums">{zoom}px</span>
        <button onClick={() => setZoom(z => Math.min(300, z + 20))}
          className="p-1.5 rounded-md bg-white/[0.03] border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all">
          <ZoomIn className="w-3 h-3" />
        </button>
      </div>

      {/* ── Tracks area ─────────────────────────────────────────────────────── */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-auto scrollbar-hide relative cursor-default"
        onClick={handleTimelineClick}
      >
        <div style={{ width: timelineWidth, minHeight: '100%' }} className="relative flex flex-col">

          {/* Ruler */}
          <div className="h-6 flex-shrink-0 bg-black/60 border-b border-white/[0.06] relative flex items-end"
            onMouseDown={startSeekDrag}>
            <div className="w-[180px] flex-shrink-0 bg-black/40 border-r border-white/10" />
            <div className="flex-1 relative h-full overflow-hidden">
              {ticks().map(t => (
                <div key={t} className="absolute bottom-0 flex flex-col items-start" style={{ left: t * zoom }}>
                  <span className="text-[7px] font-mono text-white/20 leading-none mb-px pl-0.5">{fmt(t)}</span>
                  <div className="w-px h-2 bg-white/10" />
                </div>
              ))}
            </div>
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 z-50 pointer-events-none"
            style={{ left: TRACK_INFO_W + currentTime * zoom }}>
            <div className="w-px h-full bg-red-500 opacity-80" />
            <div className="absolute top-0 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-sm" />
          </div>

          {/* Empty state */}
          {tracks.length === 0 && (
            <div className="flex-1 flex items-center justify-center pt-12">
              <div className="text-center space-y-2">
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-black">Nessuna traccia</p>
                <p className="text-[8px] text-white/10">Aggiungi un video o una traccia audio per iniziare</p>
              </div>
            </div>
          )}

          {/* Track rows */}
          {tracks.map(track => {
            const trimStart  = track.trimStart ?? 0
            const trimEnd    = track.trimEnd   ?? 0
            const clipW      = Math.max(0, (track.duration - trimStart - trimEnd) * zoom)
            const clipLeft   = TRACK_INFO_W + track.startTime * zoom
            const isSelected = track.id === selectedId
            const isVideo    = track.type === 'video'

            return (
              <div key={track.id}
                className={cn('h-14 flex flex-shrink-0 border-b border-white/[0.04] group/row',
                  isSelected && 'bg-white/[0.015]')}
                onClick={e => { e.stopPropagation(); setSelectedId(track.id) }}>

                {/* Track info panel */}
                <div className="w-[180px] flex-shrink-0 bg-black/40 border-r border-white/[0.08] flex items-center px-2.5 gap-2 sticky left-0 z-20">
                  <div className={cn('w-1.5 h-6 rounded-full flex-shrink-0',
                    isVideo ? 'bg-emerald-500/60' : 'bg-blue-500/60')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-white/60 truncate">{track.name}</p>
                    <p className="text-[7px] font-black uppercase text-white/20 tracking-wider">
                      {isVideo ? 'VIDEO' : 'AUDIO'} · {fmt(track.duration - trimStart - trimEnd)}
                    </p>
                  </div>
                  {/* Track controls */}
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); onUpdateTrack(track.id, { isMuted: !track.isMuted }) }}
                      className={cn('p-0.5 rounded', track.isMuted ? 'text-red-400' : 'text-white/30 hover:text-white')}>
                      {track.isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); onDeleteTrack(track.id) }}
                      className="p-0.5 rounded text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Track lane */}
                <div className="flex-1 relative">
                  {/* Clip body */}
                  <div
                    className={cn(
                      'absolute top-1.5 bottom-1.5 rounded-md border flex items-center overflow-hidden transition-shadow',
                      isVideo
                        ? 'bg-emerald-500/20 border-emerald-500/40'
                        : 'bg-blue-500/20 border-blue-500/40',
                      track.isMuted && 'opacity-30 grayscale',
                      isSelected && 'ring-1 ring-white/30 shadow-lg shadow-black/40',
                      'cursor-grab active:cursor-grabbing',
                    )}
                    style={{ left: clipLeft - TRACK_INFO_W, width: clipW }}
                    onMouseDown={e => startClipDrag(e, track, 'move')}
                  >
                    {/* Waveform (decorative) */}
                    <div className="absolute inset-0 opacity-15 flex items-center gap-[1.5px] px-2 pointer-events-none">
                      {Array.from({ length: Math.max(4, Math.floor(clipW / 4)) }).map((_, i) => (
                        <div key={i} className={cn('flex-1 rounded-full min-w-[1px]',
                          isVideo ? 'bg-emerald-300' : 'bg-blue-300')}
                          style={{ height: `${25 + Math.abs(Math.sin(i * 0.7)) * 60}%` }}
                        />
                      ))}
                    </div>

                    {/* Label */}
                    <span className={cn('relative z-10 px-2 text-[8px] font-black uppercase truncate pointer-events-none',
                      isVideo ? 'text-emerald-200' : 'text-blue-200')}>
                      {track.name}
                    </span>

                    {/* Left trim handle */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize flex items-center justify-center z-10 group/trim"
                      onMouseDown={e => startClipDrag(e, track, 'trim-left')}
                    >
                      <div className="w-1 h-6 rounded-full bg-white/30 group-hover/trim:bg-white/70 transition-colors" />
                    </div>

                    {/* Right trim handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize flex items-center justify-center z-10 group/trim"
                      onMouseDown={e => startClipDrag(e, track, 'trim-right')}
                    >
                      <div className="w-1 h-6 rounded-full bg-white/30 group-hover/trim:bg-white/70 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Selection inspector ─────────────────────────────────────────────── */}
      {selectedTrack && (
        <div className="h-9 flex-shrink-0 flex items-center gap-4 px-4 border-t border-white/[0.06] bg-black/40">
          <span className="text-[8px] font-black uppercase text-white/30 tracking-widest truncate max-w-[120px]">
            {selectedTrack.name}
          </span>
          <label className="flex items-center gap-1.5">
            <span className="text-[8px] text-white/20 font-black uppercase">Vol</span>
            <input type="range" min={0} max={100} value={selectedTrack.volume}
              onChange={e => onUpdateTrack(selectedTrack.id, { volume: parseInt(e.target.value) })}
              className="w-20 accent-accent h-1" />
            <span className="text-[8px] font-mono text-white/30 w-7 tabular-nums">{selectedTrack.volume}%</span>
          </label>
          <span className="text-[8px] text-white/20">
            In: {(selectedTrack.trimStart ?? 0).toFixed(2)}s &nbsp;
            Out: {(selectedTrack.duration - (selectedTrack.trimEnd ?? 0)).toFixed(2)}s
          </span>
          <button onClick={() => { onCutTrack(selectedTrack.id, currentTime) }}
            className="ml-auto flex items-center gap-1 h-6 px-2 rounded-md bg-orange-500/20 border border-orange-500/30 text-orange-300 text-[8px] font-black uppercase hover:bg-orange-500/30 transition-all">
            <Scissors className="w-2.5 h-2.5" /> Taglia qui
          </button>
        </div>
      )}
    </div>
  )
}
