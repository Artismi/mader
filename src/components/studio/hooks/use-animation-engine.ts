/**
 * use-animation-engine.ts
 *
 * Keyframe animation system for the Fabric.js canvas.
 *
 * Architecture:
 *  - Each canvas object gets a "track" (list of Keyframes keyed by objectId/objId).
 *  - Recording mode: captures a keyframe whenever the user modifies an object.
 *  - Playback: RAF loop that interpolates between surrounding keyframes.
 *  - Presets: one-click preset animations that auto-generate keyframe arrays.
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import * as fabric from 'fabric'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnimKeyframe {
  time:       number   // seconds
  x:          number
  y:          number
  scaleX:     number
  scaleY:     number
  angle:      number
  opacity:    number
  textReveal?: number  // 0–1 fraction of chars visible (typeOn only)
  easing:     'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce'
}

export interface AnimTrack {
  objectId:   string   // fabric object name/objId
  objectName: string
  keyframes:  AnimKeyframe[]
  color:      string   // lane color in timeline
  fullText?:  string   // stored for typeOn text reveal
  preset?:    AnimPreset  // primary preset applied (for Lancio CSS export)
}

export type AnimPreset =
  | 'fadeIn' | 'fadeOut'
  | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown'
  | 'scaleIn' | 'scaleOut' | 'pop'
  | 'bounceIn'
  | 'spin360' | 'shake'
  | 'pulse'
  | 'typeOn'

export interface AnimEngineState {
  tracks:      AnimTrack[]
  currentTime: number
  duration:    number
  isPlaying:   boolean
  isRecording: boolean
}

// ─── Easing ──────────────────────────────────────────────────────────────────

function applyEasing(t: number, easing: AnimKeyframe['easing']): number {
  switch (easing) {
    case 'ease-in':     return t * t
    case 'ease-out':    return t * (2 - t)
    case 'ease-in-out': return t < 0.5 ? 2*t*t : -1+(4-2*t)*t
    case 'bounce': {
      if (t < 1/2.75) return 7.5625*t*t
      if (t < 2/2.75) { t -= 1.5/2.75;  return 7.5625*t*t+0.75 }
      if (t < 2.5/2.75) { t -= 2.25/2.75; return 7.5625*t*t+0.9375 }
      t -= 2.625/2.75; return 7.5625*t*t+0.984375
    }
    default: return t // linear
  }
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

/** Interpolate object props at a given time along a track. */
export function interpolateTrack(
  track: AnimTrack,
  time:  number,
): Omit<AnimKeyframe, 'time' | 'easing'> | null {
  const kf = track.keyframes
  if (kf.length === 0) return null
  if (kf.length === 1) {
    const { x, y, scaleX, scaleY, angle, opacity, textReveal } = kf[0]
    return { x, y, scaleX, scaleY, angle, opacity, textReveal }
  }

  // Find surrounding keyframes
  const sorted = [...kf].sort((a, b) => a.time - b.time)
  if (time <= sorted[0].time) {
    const { x, y, scaleX, scaleY, angle, opacity, textReveal } = sorted[0]
    return { x, y, scaleX, scaleY, angle, opacity, textReveal }
  }
  if (time >= sorted[sorted.length - 1].time) {
    const { x, y, scaleX, scaleY, angle, opacity, textReveal } = sorted[sorted.length - 1]
    return { x, y, scaleX, scaleY, angle, opacity, textReveal }
  }

  let lo = sorted[0], hi = sorted[1]
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].time <= time && time <= sorted[i + 1].time) {
      lo = sorted[i]; hi = sorted[i + 1]; break
    }
  }

  const rawT = (time - lo.time) / Math.max(hi.time - lo.time, 0.001)
  const t = applyEasing(rawT, hi.easing)
  return {
    x:          lerp(lo.x,       hi.x,       t),
    y:          lerp(lo.y,       hi.y,       t),
    scaleX:     lerp(lo.scaleX,  hi.scaleX,  t),
    scaleY:     lerp(lo.scaleY,  hi.scaleY,  t),
    angle:      lerp(lo.angle,   hi.angle,   t),
    opacity:    lerp(lo.opacity, hi.opacity, t),
    textReveal: lo.textReveal !== undefined || hi.textReveal !== undefined
      ? lerp(lo.textReveal ?? 0, hi.textReveal ?? 1, t)
      : undefined,
  }
}

// ─── Preset generators ───────────────────────────────────────────────────────

function captureBase(obj: fabric.FabricObject): Omit<AnimKeyframe, 'time' | 'easing'> {
  return {
    x:       obj.left   ?? 0,
    y:       obj.top    ?? 0,
    scaleX:  obj.scaleX ?? 1,
    scaleY:  obj.scaleY ?? 1,
    angle:   obj.angle  ?? 0,
    opacity: obj.opacity ?? 1,
  }
}

export function generatePresetKeyframes(
  preset:  AnimPreset,
  obj:     fabric.FabricObject,
  startAt: number = 0,
): AnimKeyframe[] {
  const b   = captureBase(obj)
  const dur = 0.8   // duration of animation in seconds
  const end = startAt + dur
  const ez  = (e: AnimKeyframe['easing']): AnimKeyframe['easing'] => e

  switch (preset) {
    case 'fadeIn':
      return [
        { ...b, time: startAt, opacity: 0,          easing: ez('ease-out') },
        { ...b, time: end,     opacity: b.opacity,  easing: ez('linear') },
      ]
    case 'fadeOut':
      return [
        { ...b, time: startAt, opacity: b.opacity,  easing: ez('ease-in') },
        { ...b, time: end,     opacity: 0,          easing: ez('linear') },
      ]
    case 'slideLeft':
      return [
        { ...b, time: startAt, x: b.x + 200,        easing: ez('ease-out') },
        { ...b, time: end,     x: b.x,              easing: ez('linear') },
      ]
    case 'slideRight':
      return [
        { ...b, time: startAt, x: b.x - 200,        easing: ez('ease-out') },
        { ...b, time: end,     x: b.x,              easing: ez('linear') },
      ]
    case 'slideUp':
      return [
        { ...b, time: startAt, y: b.y + 150,        easing: ez('ease-out') },
        { ...b, time: end,     y: b.y,              easing: ez('linear') },
      ]
    case 'slideDown':
      return [
        { ...b, time: startAt, y: b.y - 150,        easing: ez('ease-out') },
        { ...b, time: end,     y: b.y,              easing: ez('linear') },
      ]
    case 'scaleIn':
      return [
        { ...b, time: startAt, scaleX: 0, scaleY: 0, easing: ez('ease-out') },
        { ...b, time: end,     scaleX: b.scaleX, scaleY: b.scaleY, easing: ez('linear') },
      ]
    case 'scaleOut':
      return [
        { ...b, time: startAt, scaleX: b.scaleX, scaleY: b.scaleY, easing: ez('ease-in') },
        { ...b, time: end,     scaleX: 0, scaleY: 0, easing: ez('linear') },
      ]
    case 'pop':
      return [
        { ...b, time: startAt,        scaleX: 0,           scaleY: 0,           easing: ez('ease-out') },
        { ...b, time: startAt+dur*0.7, scaleX: b.scaleX*1.15, scaleY: b.scaleY*1.15, easing: ez('ease-in-out') },
        { ...b, time: end,            scaleX: b.scaleX,    scaleY: b.scaleY,    easing: ez('linear') },
      ]
    case 'bounceIn':
      return [
        { ...b, time: startAt, scaleX: 0, scaleY: 0, easing: ez('bounce') },
        { ...b, time: end,     scaleX: b.scaleX, scaleY: b.scaleY, easing: ez('linear') },
      ]
    case 'spin360':
      return [
        { ...b, time: startAt, angle: b.angle,       easing: ez('ease-in-out') },
        { ...b, time: end,     angle: b.angle + 360, easing: ez('linear') },
      ]
    case 'shake': {
      const offset = 15
      return [
        { ...b, time: startAt,          x: b.x,          easing: ez('linear') },
        { ...b, time: startAt+dur*0.15, x: b.x - offset, easing: ez('linear') },
        { ...b, time: startAt+dur*0.30, x: b.x + offset, easing: ez('linear') },
        { ...b, time: startAt+dur*0.45, x: b.x - offset, easing: ez('linear') },
        { ...b, time: startAt+dur*0.60, x: b.x + offset, easing: ez('linear') },
        { ...b, time: startAt+dur*0.75, x: b.x - offset, easing: ez('linear') },
        { ...b, time: end,              x: b.x,          easing: ez('linear') },
      ]
    }
    case 'pulse':
      return [
        { ...b, time: startAt,       scaleX: b.scaleX,      scaleY: b.scaleY,      easing: ez('ease-in-out') },
        { ...b, time: startAt+dur/2, scaleX: b.scaleX*1.12, scaleY: b.scaleY*1.12, easing: ez('ease-in-out') },
        { ...b, time: end,           scaleX: b.scaleX,      scaleY: b.scaleY,      easing: ez('linear') },
      ]
    case 'typeOn': {
      // Character-by-character reveal: duration scales with text length (max 4s)
      const textLen = Math.max(1, ((obj as any).text || '').length)
      const typeDur = Math.min(4, Math.max(0.5, textLen * 0.04))
      return [
        { ...b, time: startAt,           opacity: 1, textReveal: 0, easing: ez('linear') },
        { ...b, time: startAt + typeDur, opacity: 1, textReveal: 1, easing: ez('linear') },
      ]
    }
    default:
      return [{ ...b, time: startAt, easing: ez('linear') }]
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const TRACK_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#db2777', '#0891b2', '#65a30d', '#9333ea', '#e11d48',
]

export function useAnimationEngine(fabricRef: React.RefObject<fabric.Canvas | null>) {
  const [tracks,      setTracks]      = useState<AnimTrack[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(10)
  const [isPlaying,   setIsPlaying]   = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const rafRef       = useRef<number>(0)
  const playStartRef = useRef<{ wallTime: number; animTime: number } | null>(null)
  const isPlayingRef = useRef(false)
  const tracksRef    = useRef<AnimTrack[]>([])
  const durationRef  = useRef(10)

  useEffect(() => { tracksRef.current  = tracks   }, [tracks])
  useEffect(() => { durationRef.current = duration }, [duration])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const getObjId = (obj: fabric.FabricObject): string =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((obj as any).objId || (obj as any).name || obj.type || 'obj') as string

  const getOrCreateTrack = useCallback((obj: fabric.FabricObject): AnimTrack => {
    const id = getObjId(obj)
    const existing = tracksRef.current.find(t => t.objectId === id)
    if (existing) return existing
    const color = TRACK_COLORS[tracksRef.current.length % TRACK_COLORS.length]
    return {
      objectId:   id,
      objectName: (obj as any).name || obj.type || 'Object',
      keyframes:  [],
      color,
    }
  }, [])

  // ── Recording ────────────────────────────────────────────────────────────────

  const recordKeyframe = useCallback((obj: fabric.FabricObject, time: number) => {
    const id    = getObjId(obj)
    const kf: AnimKeyframe = {
      time,
      x:       obj.left   ?? 0,
      y:       obj.top    ?? 0,
      scaleX:  obj.scaleX ?? 1,
      scaleY:  obj.scaleY ?? 1,
      angle:   obj.angle  ?? 0,
      opacity: obj.opacity ?? 1,
      easing:  'ease-in-out',
    }
    setTracks(prev => {
      const existing = prev.find(t => t.objectId === id)
      if (existing) {
        return prev.map(t => t.objectId === id
          ? { ...t, keyframes: [...t.keyframes.filter(k => Math.abs(k.time - time) > 0.05), kf] }
          : t
        )
      }
      const color = TRACK_COLORS[prev.length % TRACK_COLORS.length]
      return [...prev, {
        objectId:   id,
        objectName: (obj as any).name || obj.type || 'Object',
        keyframes:  [kf],
        color,
      }]
    })
  }, [])

  // ── Apply preset to selected object ─────────────────────────────────────────

  const applyPreset = useCallback((preset: AnimPreset, startAt = 0) => {
    const canvas = fabricRef.current; if (!canvas) return
    const obj = canvas.getActiveObject(); if (!obj) return
    const kfs = generatePresetKeyframes(preset, obj, startAt)
    const id  = getObjId(obj)
    const color = TRACK_COLORS[tracksRef.current.length % TRACK_COLORS.length]
    // For typeOn, capture the full text at apply time so playback can slice it
    const fullText = preset === 'typeOn'
      ? ((obj as any).text || (obj as any)._text || '') as string
      : undefined
    setTracks(prev => {
      const existing = prev.find(t => t.objectId === id)
      if (existing) {
        return prev.map(t => t.objectId === id
          ? { ...t, keyframes: [...t.keyframes, ...kfs], preset, ...(fullText !== undefined && { fullText }) }
          : t
        )
      }
      return [...prev, {
        objectId:   id,
        objectName: (obj as any).name || obj.type || 'Object',
        keyframes:  kfs,
        color,
        preset,
        fullText,
      }]
    })
    // Expand duration if needed
    const endTime = Math.max(...kfs.map(k => k.time))
    if (endTime > durationRef.current) setDuration(endTime + 1)
  }, [fabricRef])

  // ── Seek (apply interpolated state at a given time) ─────────────────────────

  const seek = useCallback((time: number) => {
    const canvas = fabricRef.current; if (!canvas) return
    const t = Math.max(0, Math.min(time, durationRef.current))
    setCurrentTime(t)
    const objs = canvas.getObjects()
    for (const track of tracksRef.current) {
      const obj = objs.find(o => getObjId(o) === track.objectId)
      if (!obj) continue
      const props = interpolateTrack(track, t)
      if (props) {
        obj.set({ left: props.x, top: props.y, scaleX: props.scaleX, scaleY: props.scaleY, angle: props.angle, opacity: props.opacity })
        // TypeOn: reveal characters progressively
        if (track.fullText && props.textReveal !== undefined) {
          const charCount = Math.round(props.textReveal * track.fullText.length)
          ;(obj as any).set('text', track.fullText.slice(0, Math.max(1, charCount)) || track.fullText[0] || '')
        }
        obj.setCoords()
      }
    }
    canvas.requestRenderAll()
  }, [fabricRef])

  // ── Playback ─────────────────────────────────────────────────────────────────

  const stopPlayback = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    playStartRef.current = null
    setIsPlaying(false)
  }, [])

  const startPlayback = useCallback((fromTime?: number) => {
    const canvas = fabricRef.current; if (!canvas) return
    cancelAnimationFrame(rafRef.current)
    const startTime = fromTime ?? currentTime
    playStartRef.current = { wallTime: performance.now() / 1000, animTime: startTime }
    setIsPlaying(true)

    const tick = () => {
      if (!playStartRef.current) return
      const elapsed = performance.now() / 1000 - playStartRef.current.wallTime
      const t = playStartRef.current.animTime + elapsed
      if (t >= durationRef.current) {
        seek(durationRef.current)
        stopPlayback()
        return
      }
      // Apply all tracks
      const objs = canvas.getObjects()
      for (const track of tracksRef.current) {
        const obj = objs.find(o => getObjId(o) === track.objectId)
        if (!obj) continue
        const props = interpolateTrack(track, t)
        if (props) {
          obj.set({ left: props.x, top: props.y, scaleX: props.scaleX, scaleY: props.scaleY, angle: props.angle, opacity: props.opacity })
          // TypeOn: reveal characters progressively
          if (track.fullText && props.textReveal !== undefined) {
            const charCount = Math.round(props.textReveal * track.fullText.length)
            ;(obj as any).set('text', track.fullText.slice(0, Math.max(1, charCount)) || track.fullText[0] || '')
          }
          obj.setCoords()
        }
      }
      canvas.requestRenderAll()
      setCurrentTime(t)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [fabricRef, currentTime, seek, stopPlayback])

  // ── Delete keyframe / track ──────────────────────────────────────────────────

  const deleteKeyframe = useCallback((objectId: string, time: number) => {
    setTracks(prev => prev.map(t => t.objectId === objectId
      ? { ...t, keyframes: t.keyframes.filter(k => Math.abs(k.time - time) > 0.01) }
      : t
    ))
  }, [])

  const deleteTrack = useCallback((objectId: string) => {
    setTracks(prev => prev.filter(t => t.objectId !== objectId))
  }, [])

  const clearAll = useCallback(() => {
    setTracks([]); setCurrentTime(0); stopPlayback()
  }, [stopPlayback])

  // Cleanup on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  return {
    tracks, currentTime, duration, isPlaying, isRecording,
    setDuration, setIsRecording,
    recordKeyframe, applyPreset,
    seek, startPlayback, stopPlayback,
    deleteKeyframe, deleteTrack, clearAll,
  }
}
