import { type AudioTrack } from './audio-timeline'
import { extractBPM } from '@/lib/audio/beat-detection'

export class AudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null

  // Buffer-based sources (pure audio tracks)
  private buffers: Map<string, AudioBuffer> = new Map()
  private activeSources: { id: string; source: AudioBufferSourceNode; gain: GainNode }[] = []

  // MediaElement-based sources (video tracks)
  private mediaNodes: Map<string, { source: MediaElementAudioSourceNode; gain: GainNode }> = new Map()

  constructor() {
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      this.ctx = new AudioCtx()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
    }
  }

  async resume() {
    if (this.ctx?.state === 'suspended') await this.ctx.resume()
  }

  get context() { return this.ctx }

  // ── Video element routing ────────────────────────────────────────────────────
  // Route audio from an HTMLVideoElement through the AudioContext graph.
  // This gives perfect sync: audio follows video.currentTime automatically.
  attachVideoElement(id: string, videoEl: HTMLVideoElement, volume = 1.0) {
    if (!this.ctx || !this.masterGain) return
    // Detach any existing node for this id
    this.detachVideoElement(id)
    try {
      const source = this.ctx.createMediaElementSource(videoEl)
      const gain = this.ctx.createGain()
      gain.gain.value = volume
      source.connect(gain)
      gain.connect(this.masterGain)
      this.mediaNodes.set(id, { source, gain })
    } catch (e) {
      // Element already captured — safe to ignore
      console.warn('[AudioEngine] attachVideoElement:', e)
    }
  }

  detachVideoElement(id: string) {
    const node = this.mediaNodes.get(id)
    if (!node) return
    try { node.source.disconnect(); node.gain.disconnect() } catch (_) {}
    this.mediaNodes.delete(id)
  }

  setVideoVolume(id: string, volume: number) {
    const node = this.mediaNodes.get(id)
    if (node) node.gain.gain.value = Math.max(0, volume) / 100
  }

  muteVideo(id: string, muted: boolean) {
    const node = this.mediaNodes.get(id)
    if (node) node.gain.gain.value = muted ? 0 : 1
  }

  // ── Pure audio track playback (buffer-based) ─────────────────────────────────
  // Only plays tracks of type 'audio' — video tracks are handled by MediaElementSource.
  async startPlayback(tracks: AudioTrack[], startTime: number) {
    await this.resume()
    this.stopPlayback()

    for (const track of tracks) {
      if (track.isMuted || track.type === 'video') continue

      let buffer: AudioBuffer
      try {
        buffer = await this.decodeAudio(track.url, track.id)
      } catch (e) {
        console.warn('[AudioEngine] decodeAudio failed for', track.name, e)
        continue
      }

      const source = this.ctx!.createBufferSource()
      source.buffer = buffer

      const gain = this.ctx!.createGain()
      gain.gain.value = track.volume / 100

      source.connect(gain)
      gain.connect(this.masterGain!)

      const trimStart = track.trimStart ?? 0
      const bufferOffset = Math.max(0, (startTime - track.startTime) + trimStart)
      const playStartDelay = Math.max(0, track.startTime - startTime)

      if (bufferOffset < buffer.duration) {
        source.start(this.ctx!.currentTime + playStartDelay, bufferOffset)
        this.activeSources.push({ id: track.id, source, gain })
      }
    }
  }

  stopPlayback() {
    this.activeSources.forEach(s => {
      try { s.source.stop(); s.source.disconnect(); s.gain.disconnect() } catch (_) {}
    })
    this.activeSources = []
  }

  async decodeAudio(url: string, id: string): Promise<AudioBuffer> {
    if (this.buffers.has(id)) return this.buffers.get(id)!
    const resp = await fetch(url)
    const arrayBuffer = await resp.arrayBuffer()
    const buffer = await this.ctx!.decodeAudioData(arrayBuffer)
    this.buffers.set(id, buffer)
    return buffer
  }

  async getBPM(id: string): Promise<number | null> {
    const buffer = this.buffers.get(id)
    if (!buffer) return null
    return extractBPM(buffer)
  }

  // Creates an audio-only track (not video)
  async createTrack(name: string, source: string | File): Promise<AudioTrack> {
    const url = typeof source === 'string' ? source : URL.createObjectURL(source)
    const id = Math.random().toString(36).slice(2, 11)

    let duration = 0
    try {
      const buffer = await this.decodeAudio(url, id)
      duration = buffer.duration
    } catch (e) {
      console.warn('[AudioEngine] createTrack duration:', name, e)
    }

    return {
      id, name, url,
      startTime: 0, duration,
      trimStart: 0, trimEnd: 0,
      volume: 100, isMuted: false,
      type: 'audio',
    }
  }

  // Offline render for Whisper transcription
  async renderMix(tracks: AudioTrack[]): Promise<Float32Array> {
    const duration = Math.max(...tracks.map(t => t.startTime + t.duration), 1)
    const offlineCtx = new OfflineAudioContext(1, 16000 * duration, 16000)

    for (const track of tracks) {
      if (track.isMuted) continue
      try {
        const buffer = await this.decodeAudio(track.url, track.id)
        const source = offlineCtx.createBufferSource()
        source.buffer = buffer
        const gain = offlineCtx.createGain()
        gain.gain.value = track.volume / 100
        source.connect(gain)
        gain.connect(offlineCtx.destination)
        source.start(track.startTime)
      } catch (e) {
        console.warn('[AudioEngine] renderMix skip track:', track.name, e)
      }
    }

    const rendered = await offlineCtx.startRendering()
    return rendered.getChannelData(0)
  }
}

export const audioEngine = new AudioEngine()

export function useAudioEngine() {
  return audioEngine
}
