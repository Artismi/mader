/**
 * Generatori procedurali come mattoni "campo" (fondo o zona libera) e
 * "trama" (dentro una superficie): disegnati in un canvas e composti nella
 * tavola come immagine. Due strade:
 * - il nodo mezzatinta del Lab con il renderer WebGPU di three, che
 *   ripiega da solo sul backend WebGL2 se il browser non ha la WebGPU;
 * - generatori in canvas 2D (truchet, voronoi, flusso, moiré, isoipse,
 *   liquido, nebbia, chladni) come ripiego e per tutti gli altri.
 * Il backend usato resta in `backendCampi` (la vetrina lo annota).
 */
import type { Palette } from './types'

export const GENERATORI_CAMPO = ['chladni', 'truchet', 'voronoi', 'flusso', 'moire', 'isoipse', 'liquido', 'nebbia', 'mezzatinta'] as const
export type GeneratoreCampo = typeof GENERATORI_CAMPO[number]

/** Quale strada ha disegnato i campi: 'webgpu', 'webgl' (ripiego di three) o 'canvas'. */
export const backendCampi: { ultimo?: string; conta: Record<string, number> } = { conta: {} }

const rnd = (seed: number) => { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296 }
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }

/** Rumore a valori lisciato (fbm) per liquido, nebbia, flusso. */
function rumore(seed: number) {
  const r = rnd(seed), P = Array.from({ length: 512 }, () => r())
  const v = (x: number, y: number) => P[((Math.floor(x) * 73 + Math.floor(y) * 151) & 511 + 512) & 511]
  const s = (t: number) => t * t * (3 - 2 * t)
  const n = (x: number, y: number) => { const xi = Math.floor(x), yi = Math.floor(y), fx = s(x - xi), fy = s(y - yi); const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy }
  return (x: number, y: number) => { let t = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { t += a * n(x * f, y * f); a /= 2; f *= 2 } return t / 0.9375 }
}

/** Generatori in canvas 2D: inchiostro `ink` su fondo trasparente (il fondo lo dà la tavola). */
function disegna2D(tipo: GeneratoreCampo, w: number, h: number, pal: Palette, seed: number): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w)); cv.height = Math.max(1, Math.round(h))
  const c = cv.getContext('2d')!
  const r = rnd(seed), S = Math.min(w, h)
  c.strokeStyle = pal.ink; c.fillStyle = pal.ink; c.lineCap = 'round'
  if (tipo === 'truchet') {
    const t = S / (6 + Math.floor(r() * 8)); c.lineWidth = t * 0.12
    for (let y = 0; y < h; y += t) for (let x = 0; x < w; x += t) {
      c.beginPath()
      if (r() < 0.5) { c.arc(x, y, t / 2, 0, Math.PI / 2); c.moveTo(x + t, y + t / 2); c.arc(x + t, y + t, t / 2, -Math.PI / 2, -Math.PI, true) }
      else { c.arc(x + t, y, t / 2, Math.PI / 2, Math.PI); c.moveTo(x + t / 2, y + t); c.arc(x, y + t, t / 2, 0, -Math.PI / 2, true) }
      c.stroke()
    }
  } else if (tipo === 'voronoi') {
    const pts = Array.from({ length: 18 + Math.floor(r() * 30) }, () => [r() * w, r() * h])
    const im = c.createImageData(cv.width, cv.height), [ir, ig, ib] = rgb(pal.ink)
    for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2) {
      let d1 = 1e9, d2 = 1e9
      for (const p of pts) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < d1) { d2 = d1; d1 = d } else if (d < d2) d2 = d }
      if (Math.sqrt(d2) - Math.sqrt(d1) >= S * 0.005) continue
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const i = ((y + dy) * cv.width + x + dx) * 4; if (i < im.data.length) { im.data[i] = ir; im.data[i + 1] = ig; im.data[i + 2] = ib; im.data[i + 3] = 255 } }
    }
    c.putImageData(im, 0, 0)
  } else if (tipo === 'flusso') {
    const n = rumore(seed), sc = 2.2 / S; c.lineWidth = S * 0.003
    for (let i = 0; i < 420; i++) {
      let x = r() * w, y = r() * h
      c.beginPath(); c.moveTo(x, y)
      for (let j = 0; j < 40; j++) { const a = n(x * sc, y * sc) * Math.PI * 4; x += Math.cos(a) * S * 0.008; y += Math.sin(a) * S * 0.008; c.lineTo(x, y) }
      c.stroke()
    }
  } else if (tipo === 'moire') {
    const cx1 = w * (0.3 + r() * 0.2), cy1 = h * (0.3 + r() * 0.4), cx2 = cx1 + S * (0.04 + r() * 0.08), cy2 = cy1 + S * 0.03, step = S * 0.012
    c.lineWidth = step * 0.45
    for (const [cx, cy] of [[cx1, cy1], [cx2, cy2]]) for (let rr = step; rr < S * 1.5; rr += step) { c.beginPath(); c.arc(cx, cy, rr, 0, Math.PI * 2); c.stroke() }
  } else if (tipo === 'isoipse' || tipo === 'liquido' || tipo === 'nebbia' || tipo === 'chladni' || tipo === 'mezzatinta') {
    // campi scalari: isolinee (isoipse, chladni), velature (nebbia, liquido) o punti (mezzatinta)
    const n = rumore(seed), m = 2 + Math.floor(r() * 4), nn = m + 1 + Math.floor(r() * 3)
    const f = (x: number, y: number) => {
      const u = x / w, v = y / h
      if (tipo === 'chladni') return Math.cos(m * Math.PI * u) * Math.cos(nn * Math.PI * v) - Math.cos(nn * Math.PI * u) * Math.cos(m * Math.PI * v)
      if (tipo === 'liquido') return n(u * 3 + n(u * 2, v * 2) * 2, v * 3)
      return n(u * 2.5, v * 2.5)
    }
    const k = 3, im = c.createImageData(cv.width, cv.height), [ir, ig, ib] = rgb(pal.ink)
    if (tipo === 'mezzatinta') {
      const t = S / 44
      for (let y = t / 2; y < h; y += t) for (let x = t / 2; x < w; x += t) { const v = f(x, y); c.beginPath(); c.arc(x, y, Math.max(0, (v - 0.25) * t * 0.85), 0, Math.PI * 2); c.fill() }
      return cv
    }
    for (let y = 0; y < cv.height; y += k) for (let x = 0; x < cv.width; x += k) {
      const v = f(x, y)
      const a = tipo === 'chladni' ? (Math.abs(v) < 0.06 ? 1 : 0) : tipo === 'isoipse' ? (Math.abs((v * 14) % 1) < 0.12 ? 1 : 0) : tipo === 'nebbia' ? v * v : (Math.sin(v * 26) > 0.6 ? 0.9 : 0)
      if (!a) continue
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) { const i = ((y + dy) * cv.width + x + dx) * 4; if (i >= im.data.length) continue; im.data[i] = ir; im.data[i + 1] = ig; im.data[i + 2] = ib; im.data[i + 3] = a * 255 }
    }
    c.putImageData(im, 0, 0)
  }
  return cv
}

/**
 * Nodo mezzatinta del Lab con three/webgpu (ripiego WebGL2 di three se manca la WebGPU).
 * Il nodo chladni del Lab è un effetto su foto (punti sulla luminanza) e su un campo piatto
 * dà un'uscita quasi vuota: chladni resta in 2D, con le linee nodali vere.
 */
async function disegnaLab(w: number, h: number, pal: Palette, seed: number): Promise<HTMLCanvasElement | null> {
  try {
    const THREE = await import('three/webgpu')
    const tsl = await import('three/tsl')
    const { halftoneNode } = await import('../lab/nodes/halftone-node')
    // sorgente: il campo in 2D come luminanza (i nodi del Lab leggono un'immagine)
    // sorgente: macchie liquide chiare su nero, che il nodo traduce in punti
    const src2d = disegna2D('liquido', w, h, { ...pal, ink: '#ffffff' }, seed)
    const base = document.createElement('canvas'); base.width = src2d.width; base.height = src2d.height
    const bc = base.getContext('2d')!; bc.fillStyle = '#000'; bc.fillRect(0, 0, base.width, base.height); bc.drawImage(src2d, 0, 0)
    const out = document.createElement('canvas'); out.width = base.width; out.height = base.height
    const renderer = new THREE.WebGPURenderer({ canvas: out, alpha: true, antialias: true, preserveDrawingBuffer: true } as ConstructorParameters<typeof THREE.WebGPURenderer>[0])
    await renderer.init()
    const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'webgpu' : 'webgl'
    renderer.setSize(out.width, out.height, false)
    const tex = new THREE.CanvasTexture(base); tex.flipY = false
    const vUv = tsl.vec2(tsl.uv().x, tsl.float(1).sub(tsl.uv().y))
    const node = halftoneNode(tex, vUv, tsl.float(0.02), tsl.float(1), tsl.float(0.4), tsl.float(0))
    const mat = new THREE.MeshBasicNodeMaterial(); mat.colorNode = node
    const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat))
    await renderer.renderAsync(scene, cam)
    // il risultato: inchiostro dove il nodo scurisce, trasparente dove resta chiaro
    const res = document.createElement('canvas'); res.width = out.width; res.height = out.height
    const rc = res.getContext('2d', { willReadFrequently: true })!
    rc.drawImage(out, 0, 0)
    const im = rc.getImageData(0, 0, res.width, res.height), [ir, ig, ib] = rgb(pal.ink)
    let pieni = 0
    for (let i = 0; i < im.data.length; i += 4) {
      const l = (im.data[i] + im.data[i + 1] + im.data[i + 2]) / 765
      const a = 1 - l
      im.data[i] = ir; im.data[i + 1] = ig; im.data[i + 2] = ib; im.data[i + 3] = Math.max(0, Math.min(255, a * 255))
      if (a > 0.5) pieni++
    }
    rc.putImageData(im, 0, 0)
    renderer.dispose()
    // un'uscita vuota o piena (contesto perso, lettura fallita) vale come errore: si ripiega sul 2D
    const q = pieni / (im.data.length / 4)
    if (q < 0.005 || q > 0.95) return null
    backendCampi.ultimo = backend
    return res
  } catch (e) {
    console.warn('[designer] campo lab', e)
    return null
  }
}

/** Il campo come canvas (inchiostro su trasparente). */
export async function disegnaCampo(tipo: string, w: number, h: number, pal: Palette, seed: number): Promise<HTMLCanvasElement> {
  const t = (GENERATORI_CAMPO as readonly string[]).includes(tipo) ? tipo as GeneratoreCampo : 'flusso'
  let cv: HTMLCanvasElement | null = null
  if (t === 'mezzatinta') cv = await disegnaLab(w, h, pal, seed)
  if (!cv) { cv = disegna2D(t, w, h, pal, seed); backendCampi.ultimo = 'canvas' }
  backendCampi.conta[backendCampi.ultimo!] = (backendCampi.conta[backendCampi.ultimo!] ?? 0) + 1
  return cv
}
