/**
 * Video: una tavola ferma con il suo pezzo di brano, in MP4 (H.264 + AAC), come lo vuole Instagram.
 * Si fa tutto nel browser con WebCodecs; se il browser non sa codificare, lo dice e si scaricano
 * immagine e audio separati.
 */
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'

export async function puoVideo(): Promise<{ ok: boolean; perche?: string }> {
  if (typeof VideoEncoder === 'undefined' || typeof AudioEncoder === 'undefined') return { ok: false, perche: 'questo browser non ha WebCodecs' }
  const v = await VideoEncoder.isConfigSupported({ codec: 'avc1.640028', width: 1080, height: 1350, bitrate: 3_000_000, framerate: 30 }).catch(() => ({ supported: false }))
  if (!v.supported) return { ok: false, perche: 'il browser non codifica H.264' }
  const a = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 }).catch(() => ({ supported: false }))
  if (!a.supported) return { ok: false, perche: 'il browser non codifica AAC' }
  return { ok: true }
}

/** immagine ferma + audio → MP4 1080×1350, 30 fotogrammi al secondo */
export async function videoFermo(img: CanvasImageSource, audio: AudioBuffer, W = 1080, H = 1350): Promise<Blob> {
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: W, height: H, frameRate: 30 },
    audio: { codec: 'aac', numberOfChannels: 2, sampleRate: audio.sampleRate },
    fastStart: 'in-memory',
  })
  const ve = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { throw e } })
  ve.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: 3_000_000, framerate: 30 })
  const cv = new OffscreenCanvas(W, H), g = cv.getContext('2d')!
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H)
  g.drawImage(img, 0, 0, W, H)
  const secondi = audio.duration
  const n = Math.ceil(secondi * 30)
  for (let i = 0; i < n; i++) {
    const fr = new VideoFrame(cv, { timestamp: Math.round((i * 1e6) / 30), duration: Math.round(1e6 / 30) })
    ve.encode(fr, { keyFrame: i % 60 === 0 })
    fr.close()
    if (i % 30 === 0) await new Promise(r => setTimeout(r, 0))
  }
  await ve.flush()
  const ae = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => { throw e } })
  ae.configure({ codec: 'mp4a.40.2', sampleRate: audio.sampleRate, numberOfChannels: 2, bitrate: 128000 })
  const L = audio.getChannelData(0), R = audio.numberOfChannels > 1 ? audio.getChannelData(1) : L
  const blocco = 1024
  for (let o = 0; o < audio.length; o += blocco) {
    const len = Math.min(blocco, audio.length - o)
    const dati = new Float32Array(len * 2)
    dati.set(L.subarray(o, o + len), 0); dati.set(R.subarray(o, o + len), len)
    const ad = new AudioData({ format: 'f32-planar', sampleRate: audio.sampleRate, numberOfFrames: len, numberOfChannels: 2, timestamp: Math.round((o / audio.sampleRate) * 1e6), data: dati })
    ae.encode(ad); ad.close()
  }
  await ae.flush()
  muxer.finalize()
  return new Blob([muxer.target.buffer], { type: 'video/mp4' })
}
