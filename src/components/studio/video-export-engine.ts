/**
 * Video Export Engine — Vanguard Creative OS
 *
 * Captures the live Fabric.js canvas (including 3D, Lab effects, embedded videos)
 * using the native Canvas Capture API and MediaRecorder, producing downloadable
 * video files sized and formatted for each publishing channel.
 */

export type VideoChannelPreset = {
  id: string
  label: string
  aspectLabel: string
  /** Target width for the output, artboard is letterboxed/cropped to fit */
  width: number
  height: number
  /** Max recording duration in seconds */
  maxDuration: number
  fps: number
  videoBitsPerSecond: number
  /** MIME type to attempt first */
  mimeType: string
}

export const VIDEO_CHANNEL_PRESETS: VideoChannelPreset[] = [
  {
    id: 'reels',
    label: 'Instagram Reels / TikTok',
    aspectLabel: '9:16',
    width: 1080,
    height: 1920,
    maxDuration: 60,
    fps: 30,
    videoBitsPerSecond: 8_000_000,
    mimeType: 'video/webm;codecs=vp9',
  },
  {
    id: 'post',
    label: 'Instagram / Facebook Post',
    aspectLabel: '1:1',
    width: 1080,
    height: 1080,
    maxDuration: 60,
    fps: 30,
    videoBitsPerSecond: 6_000_000,
    mimeType: 'video/webm;codecs=vp9',
  },
  {
    id: 'story',
    label: 'Instagram / WhatsApp Story',
    aspectLabel: '9:16',
    width: 1080,
    height: 1920,
    maxDuration: 15,
    fps: 30,
    videoBitsPerSecond: 6_000_000,
    mimeType: 'video/webm;codecs=vp9',
  },
  {
    id: 'youtube',
    label: 'YouTube / Landscape',
    aspectLabel: '16:9',
    width: 1920,
    height: 1080,
    maxDuration: 3600,
    fps: 30,
    videoBitsPerSecond: 12_000_000,
    mimeType: 'video/webm;codecs=vp9',
  },
  {
    id: 'square_hd',
    label: 'LinkedIn / Twitter HD',
    aspectLabel: '1:1',
    width: 1200,
    height: 1200,
    maxDuration: 140,
    fps: 30,
    videoBitsPerSecond: 8_000_000,
    mimeType: 'video/webm;codecs=vp9',
  },
]

export type VideoExportState =
  | { status: 'idle' }
  | { status: 'recording'; elapsed: number; duration: number; preset: VideoChannelPreset }
  | { status: 'encoding' }
  | { status: 'done'; url: string; preset: VideoChannelPreset; filename: string }
  | { status: 'error'; message: string }

/**
 * Records the artboard area of the Fabric canvas for `durationSec` seconds,
 * compositing any Lab effect canvases on top before saving each frame.
 *
 * @param fabricCanvasEl   The underlying <canvas> DOM element of the Fabric canvas
 * @param artboardRect     { left, top, width, height } in canvas coordinates (pre-zoom)
 * @param preset           The channel export preset
 * @param durationSec      How long to record (capped at preset.maxDuration)
 * @param onStateChange    Callback to push status updates to the UI
 * @param labEffectCanvas  Optional WebGL effect overlay canvas to composite above
 */
export async function recordArtboardVideo(
  fabricCanvasEl: HTMLCanvasElement,
  artboardRect: { left: number; top: number; width: number; height: number },
  preset: VideoChannelPreset,
  durationSec: number,
  onStateChange: (state: VideoExportState) => void,
  labEffectCanvas?: HTMLCanvasElement | null,
): Promise<void> {
  // ── 1. Resolve MIME type ──────────────────────────────────────────────────
  const mimeType = [
    preset.mimeType,
    'video/webm;codecs=vp8',
    'video/webm',
  ].find(m => MediaRecorder.isTypeSupported(m)) ?? 'video/webm'

  // ── 2. Create offscreen composite canvas ────────────────────────────────
  // We render a cropped + scaled view of the artboard here each frame,
  // then pipe it to MediaRecorder via captureStream().
  const offscreen = document.createElement('canvas')
  offscreen.width  = preset.width
  offscreen.height = preset.height
  const ctx = offscreen.getContext('2d')!

  // Compute letterbox / crop transform so the artboard fills the frame
  const { left: abL, top: abT, width: abW, height: abH } = artboardRect
  const scaleX = preset.width  / abW
  const scaleY = preset.height / abH
  const scale  = Math.max(scaleX, scaleY) // cover mode (crop)
  const drawW  = abW * scale
  const drawH  = abH * scale
  const offX   = (preset.width  - drawW) / 2
  const offY   = (preset.height - drawH) / 2

  // ── 3. Frame pump ────────────────────────────────────────────────────────
  let rafId = 0
  const drawFrame = () => {
    ctx.clearRect(0, 0, offscreen.width, offscreen.height)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, offscreen.width, offscreen.height)

    // Fabric canvas — crop to artboard region, scaled up
    ctx.drawImage(
      fabricCanvasEl,
      abL, abT, abW, abH,   // source crop
      offX, offY, drawW, drawH // dest
    )

    // Composite Lab effect overlay if provided (drawn at same transform)
    if (labEffectCanvas && labEffectCanvas.width > 0 && labEffectCanvas.height > 0) {
      ctx.drawImage(
        labEffectCanvas,
        abL, abT, abW, abH,
        offX, offY, drawW, drawH
      )
    }
  }

  // Pre-draw first frame immediately
  drawFrame()

  // ── 4. Start MediaRecorder ────────────────────────────────────────────────
  const stream = offscreen.captureStream(preset.fps)
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: preset.videoBitsPerSecond,
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

  const actualDuration = Math.min(durationSec, preset.maxDuration)

  const recordingPromise = new Promise<void>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('MediaRecorder error'))

    recorder.onstop = () => {
      cancelAnimationFrame(rafId)
      resolve()
    }

    recorder.start(100) // collect in 100ms chunks

    // Elapsed timer
    let elapsed = 0
    const tick = () => {
      elapsed += 1 / preset.fps
      onStateChange({ status: 'recording', elapsed, duration: actualDuration, preset })

      if (elapsed < actualDuration) {
        drawFrame()
        rafId = requestAnimationFrame(tick)
      } else {
        recorder.stop()
      }
    }
    rafId = requestAnimationFrame(tick)
  })

  await recordingPromise

  // ── 5. Assemble Blob & trigger download ──────────────────────────────────
  onStateChange({ status: 'encoding' })
  await new Promise(r => setTimeout(r, 50)) // flush micro-tasks

  const blob = new Blob(chunks, { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const ext  = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
  const filename = `creative-os_${preset.id}_${Date.now()}.${ext}`

  onStateChange({ status: 'done', url, preset, filename })
}

/** Trigger browser download of a blob URL */
export function downloadVideoBlob(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after a delay to allow download to start
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
