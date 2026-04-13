'use client'

import React, { useEffect, useRef } from 'react'
import { X, Play, Square, Mic } from 'lucide-react'
import { AudioTimeline, type AudioTrack } from './audio-timeline'
import { cn } from '@/lib/utils'

interface Props {
  videoObj: any
  audioTracks: AudioTrack[]
  currentTime: number
  isPlaying: boolean
  onClose: () => void
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onUpdateTrack: (id: string, updates: Partial<AudioTrack>) => void
  onDeleteTrack: (id: string) => void
  onCutTrack: (id: string, atTime: number) => void
  onAddTrack: () => void
  onGenerateSubtitles: () => void
  isTranscribing?: boolean
  transcriptionProgress?: number
  renderControls: () => React.ReactNode
}

// ─── Mirror canvas ────────────────────────────────────────────────────────────
// Copies frames from the video element to a <canvas> via RAF.
// We NEVER move the actual video element out of the DOM — that would break
// Fabric.js rendering and cause "Error loading blob:…" crashes.
function VideoMirror({ videoElement }: { videoElement: HTMLVideoElement }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const sizeRef   = useRef({ w: 0, h: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !videoElement) return

    const draw = () => {
      const vw = videoElement.videoWidth
      const vh = videoElement.videoHeight
      if (vw > 0 && vh > 0) {
        // Only resize when dimensions actually change (avoids flicker on every frame)
        if (sizeRef.current.w !== vw || sizeRef.current.h !== vh) {
          canvas.width  = vw
          canvas.height = vh
          sizeRef.current = { w: vw, h: vh }
        }
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.drawImage(videoElement, 0, 0, vw, vh)
      }
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [videoElement])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full object-contain"
      style={{ imageRendering: 'auto' }}
    />
  )
}

// ─── Timecode display (reads directly from video element, no React state) ─────
function Timecode({ videoElement }: { videoElement: HTMLVideoElement }) {
  const spanRef = useRef<HTMLSpanElement>(null)
  const rafRef  = useRef<number>(0)

  useEffect(() => {
    const tick = () => {
      if (spanRef.current) {
        const t = videoElement.currentTime
        const m = Math.floor(t / 60)
        const s = Math.floor(t % 60)
        const ms = Math.floor((t % 1) * 10)
        spanRef.current.textContent = `${m}:${s.toString().padStart(2,'0')}.${ms}`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [videoElement])

  return (
    <span ref={spanRef}
      className="text-[10px] font-mono text-white/50 bg-white/[0.04] rounded px-2 py-0.5 tabular-nums">
      0:00.0
    </span>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function VideoModeModal({
  videoObj, audioTracks, currentTime, isPlaying,
  onClose, onTogglePlay, onSeek,
  onUpdateTrack, onDeleteTrack, onCutTrack, onAddTrack, onGenerateSubtitles,
  isTranscribing, transcriptionProgress,
  renderControls,
}: Props) {
  if (!videoObj) return null

  const videoElement = videoObj.getElement() as HTMLVideoElement
  const videoName    = (videoObj.name as string | undefined)?.replace(/^video_/, '') ?? 'Video Asset'

  return (
    <div className="fixed inset-0 z-[1000] bg-black/92 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="h-12 flex-shrink-0 flex items-center justify-between px-5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
            <Play className="w-3.5 h-3.5 text-accent fill-current" />
          </div>
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-widest text-white/90">Editor Video</h2>
            <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">{videoName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live timecode — reads from DOM, no React re-render */}
          <Timecode videoElement={videoElement} />

          <button onClick={onTogglePlay}
            className={cn(
              'flex items-center gap-2 h-8 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all',
              isPlaying
                ? 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30'
                : 'bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30'
            )}>
            {isPlaying
              ? <><Square className="w-3 h-3 fill-current" />Stop</>
              : <><Play   className="w-3 h-3 fill-current" />Play</>}
          </button>

          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Preview — canvas mirror (never moves the real video element) */}
        <div className="flex-1 relative flex items-center justify-center bg-black p-8">
          <div
            className="relative shadow-2xl shadow-black rounded-xl overflow-hidden border border-white/10 max-w-full max-h-full"
            style={{
              aspectRatio: `${videoElement.videoWidth || 16} / ${videoElement.videoHeight || 9}`,
            }}
          >
            <VideoMirror videoElement={videoElement} />
            <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-xl" />
          </div>

          {/* Transcription overlay */}
          {isTranscribing && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-80 space-y-4 p-8 bg-[#0a0a0a] border border-white/10 rounded-2xl text-center">
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${(transcriptionProgress || 0) * 100}%` }} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">Trascrizione AI…</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls panel */}
        <div className="w-72 flex-shrink-0 border-l border-white/10 bg-white/[0.015] overflow-y-auto scrollbar-hide p-5 space-y-5">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-white/25 border-b border-white/5 pb-2">
            Controlli & Filtri
          </h3>
          {renderControls()}
          <button onClick={onGenerateSubtitles}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[9px] font-black uppercase tracking-widest hover:bg-violet-500/30 transition-all">
            <Mic className="w-3.5 h-3.5" /> Genera Sottotitoli AI
          </button>
        </div>
      </div>

      {/* ── Timeline ───────────────────────────────────────────────────────── */}
      <div className="h-52 flex-shrink-0 border-t border-white/10">
        <AudioTimeline
          tracks={audioTracks}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onTogglePlay={onTogglePlay}
          onSeek={onSeek}
          onUpdateTrack={onUpdateTrack}
          onDeleteTrack={onDeleteTrack}
          onCutTrack={onCutTrack}
          onAddTrack={onAddTrack}
          onGenerateSubtitles={onGenerateSubtitles}
        />
      </div>
    </div>
  )
}
