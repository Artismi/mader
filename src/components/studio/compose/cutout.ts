/**
 * Scontorno automatico in locale (niente servizi esterni): modello U²-Net leggero
 * (Apache-2.0) eseguito con onnxruntime-web (MIT). Il runtime si carica solo
 * alla prima richiesta. Restituisce una tela con il soggetto su fondo trasparente.
 * File serviti da public/ (vedi scripts/copy-vendor.mjs).
 */
type Ort = typeof import('onnxruntime-web/wasm')
let ortP: Promise<Ort> | null = null
let sessionP: Promise<import('onnxruntime-web/wasm').InferenceSession> | null = null

async function session() {
  if (!ortP) ortP = import('onnxruntime-web/wasm').then(ort => {
    ort.env.wasm.wasmPaths = '/vendor/ort/'
    ort.env.wasm.numThreads = 1
    return ort
  })
  const ort = await ortP
  if (!sessionP) sessionP = ort.InferenceSession.create('/models/u2netp.onnx', { executionProviders: ['wasm'] })
  return { ort, s: await sessionP }
}

const SIZE = 320
type Src = HTMLImageElement | HTMLCanvasElement | ImageBitmap

/** maschera del soggetto (0..1) alla risoluzione dell'immagine */
export async function subjectMask(src: Src): Promise<HTMLCanvasElement> {
  const { ort, s } = await session()
  const w = 'naturalWidth' in src ? src.naturalWidth : src.width, h = 'naturalHeight' in src ? src.naturalHeight : src.height
  const cv = document.createElement('canvas'); cv.width = SIZE; cv.height = SIZE
  const cx = cv.getContext('2d', { willReadFrequently: true })!
  cx.drawImage(src, 0, 0, SIZE, SIZE)
  const px = cx.getImageData(0, 0, SIZE, SIZE).data
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225]
  const input = new Float32Array(3 * SIZE * SIZE)
  for (let i = 0; i < SIZE * SIZE; i++) for (let k = 0; k < 3; k++) input[k * SIZE * SIZE + i] = (px[i * 4 + k] / 255 - mean[k]) / std[k]
  const feeds = { [s.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) }
  const out = await s.run(feeds)
  const pred = out[s.outputNames[0]].data as Float32Array
  let mn = Infinity, mx = -Infinity
  for (const v of pred) { if (v < mn) mn = v; if (v > mx) mx = v }
  // maschera a bassa risoluzione, con bordo rifinito (curva morbida sulle mezze tinte)
  const m = document.createElement('canvas'); m.width = SIZE; m.height = SIZE
  const mx2 = m.getContext('2d')!, md = mx2.createImageData(SIZE, SIZE)
  for (let i = 0; i < SIZE * SIZE; i++) {
    let a = (pred[i] - mn) / (mx - mn || 1)
    a = Math.min(1, Math.max(0, (a - 0.12) / 0.76)); a = a * a * (3 - 2 * a)
    md.data[i * 4] = md.data[i * 4 + 1] = md.data[i * 4 + 2] = 255; md.data[i * 4 + 3] = Math.round(a * 255)
  }
  mx2.putImageData(md, 0, 0)
  const full = document.createElement('canvas'); full.width = w; full.height = h
  const fx = full.getContext('2d')!
  fx.imageSmoothingQuality = 'high'
  fx.drawImage(m, 0, 0, w, h)
  return full
}

/** soggetto scontornato: immagine originale con la maschera come trasparenza */
export async function cutout(src: Src): Promise<HTMLCanvasElement> {
  const mask = await subjectMask(src)
  const out = document.createElement('canvas'); out.width = mask.width; out.height = mask.height
  const ox = out.getContext('2d')!
  ox.drawImage(src, 0, 0, out.width, out.height)
  ox.globalCompositeOperation = 'destination-in'
  ox.drawImage(mask, 0, 0)
  return out
}
