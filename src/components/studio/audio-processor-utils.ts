import { audioEngine } from './audio-engine'
import { type AudioTrack } from './audio-timeline'

export async function mixAndResample(tracks: AudioTrack[]): Promise<Float32Array> {
  // 1. Determine total duration
  const duration = Math.max(...tracks.map(t => t.startTime + t.duration), 1)
  
  // 2. Setup OfflineAudioContext at 16000Hz (Whisper requirement)
  const offlineCtx = new OfflineAudioContext(1, 16000 * duration, 16000)

  // 3. Add each active track to the offline context
  for (const track of tracks) {
    if (track.isMuted) continue
    
    try {
      const resp = await fetch(track.url)
      const arrayBuffer = await resp.arrayBuffer()
      const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer)
      
      const source = offlineCtx.createBufferSource()
      source.buffer = audioBuffer
      
      const gain = offlineCtx.createGain()
      gain.gain.value = track.volume / 100
      
      source.connect(gain)
      gain.connect(offlineCtx.destination)
      
      // Start at track's startTime
      source.start(0, 0, track.duration) // Simplification: assuming track.url is the clip
    } catch (e) {
      console.error(`Failed to load track ${track.name}:`, e)
    }
  }

  // 4. Render
  const renderedBuffer = await offlineCtx.startRendering()
  
  // 5. Get Float32Array
  return renderedBuffer.getChannelData(0)
}
