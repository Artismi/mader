/**
 * I filtri WebGL del software di grafica (risograph, halftone, dithering, fibra, olio, clay, prisma, bloom, VHS, CRT…)
 * fatti girare fuori da Fabric: si prende lo shader di ogni filtro, lo si esegue su un livello con un esecutore WebGL minimo.
 * Quelli da stampa sono frequenti (sono il linguaggio delle tavole); quelli vistosi rari, perché rischiano l'effetto "filtro".
 */
import * as O from '@/components/studio/extensions/filters/optical-filters'
import * as M from '@/components/studio/extensions/filters/motion-filters'
import * as S from '@/components/studio/extensions/filters/style-filters'
import * as T from '@/components/studio/extensions/filters/texture-filters'
import { newCanvas, replaceLayer, type Sheet } from './sheet'
import type { Tool } from './tools'

type Cls = (new (o?: Record<string, number>) => { getFragmentSource?: () => string; sendUniformData?: (gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation | null>) => void; applyTo2d?: (o: { imageData: ImageData }) => void; [k: string]: unknown }) & { uniformLocations?: string[] }
const TUTTI: Record<string, unknown> = { ...O, ...M, ...S, ...T }
// peso: quanto spesso lo sceglie (la stampa spesso, il vistoso di rado)
const PESI: Record<string, number> = {
  // Risograph e Duotone (escono neri) e Holographic (cancella l'immagine) sono da sistemare: per ora fuori
  EliteHalftone: 4, DitheringFilter: 4, FiberFilter: 4, GrainFilter: 3, PosterizeFilter: 3, OilPaintFilter: 2, EliteClay: 2,
  OutlineFilter: 2, VignetteFilter: 1, PixelateFilter: 2, PrismFilter: 2, BloomFilter: 2, WavyFilter: 2, LiquidMotionFilter: 1.5, Glitch: 1.5, VHSFilter: 1.2, AdvancedCRTFilter: 1,
  ASCIIFilter: 0.4, VolumetricDepthFilter: 1, NeonGlowFilter: 0.5, ThermalFilter: 0.4, MatrixFilter: 0.3, LiquidMetalFilter: 0.6,
}
export const FILTRI = Object.keys(PESI).filter(k => typeof TUTTI[k] === 'function')

const VERT = 'attribute vec2 aPosition; varying vec2 vTexCoord; void main(){ vTexCoord = aPosition; gl_Position = vec4(aPosition * 2.0 - 1.0, 0.0, 1.0); }'

/** esegue un filtro su un canvas: GPU se ha lo shader, altrimenti la sua versione 2D */
export function filtra(src: HTMLCanvasElement, nome: string, parametri: Record<string, number> = {}): HTMLCanvasElement | null {
  const C = TUTTI[nome] as Cls | undefined
  if (!C) return null
  const f = new C(parametri)
  for (const [k, v] of Object.entries(parametri)) (f as Record<string, unknown>)[k] = v
  const W = src.width, H = src.height
  if (!f.getFragmentSource) {
    if (!f.applyTo2d) return null
    const out = newCanvas(W, H), g = out.getContext('2d')!; g.drawImage(src, 0, 0)
    const id = g.getImageData(0, 0, W, H); f.applyTo2d({ imageData: id }); g.putImageData(id, 0, 0); return out
  }
  const cv = newCanvas(W, H), gl = cv.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true }) as WebGLRenderingContext | null
  if (!gl) return null
  const sh = (t: number, s: string) => { const x = gl.createShader(t)!; gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) ?? 'shader'); return x }
  const p = gl.createProgram()!
  gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, f.getFragmentSource())); gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null
  gl.useProgram(p)
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW)
  const ap = gl.getAttribLocation(p, 'aPosition'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0)
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
  for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
  const u: Record<string, WebGLUniformLocation | null> = {}
  for (const n of [...(C.uniformLocations ?? []), 'uTexture', 'uStepW', 'uStepH', 'uWidth', 'uHeight', 'uResolution']) u[n] = gl.getUniformLocation(p, n)
  gl.uniform1i(u.uTexture, 0)
  if (u.uStepW) gl.uniform1f(u.uStepW, 1 / W); if (u.uStepH) gl.uniform1f(u.uStepH, 1 / H)
  if (u.uWidth) gl.uniform1f(u.uWidth, W); if (u.uHeight) gl.uniform1f(u.uHeight, H)
  if (u.uResolution) gl.uniform2f(u.uResolution, W, H)
  f.sendUniformData?.(gl, u)
  gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 6)
  const out = newCanvas(W, H), g = out.getContext('2d')!; g.drawImage(cv, 0, 0)
  return out
}

export const filtro: Tool = {
  id: 'filtro', label: 'Filtro del software', nature: 'materia',
  pushes: { contrasto: 0.05, complessita: 0.05 },
  available: s => s.layers.length > 0 && FILTRI.length > 0,
  propose: (s, c) => {
    const tot = FILTRI.reduce((a, k) => a + PESI[k], 0)
    let q = c.r() * tot; const nome = FILTRI.find(k => (q -= PESI[k]) <= 0) ?? FILTRI[0]
    // i parametri: attorno ai valori del filtro (0.6–1.4 volte), il tempo a caso
    const C = TUTTI[nome] as Cls, base = new C() as Record<string, unknown>, par: Record<string, number> = {}
    for (const k of C.uniformLocations ?? []) if (typeof base[k] === 'number') par[k] = k === 'uTime' ? c.r() * 20 : (base[k] as number) * (0.6 + c.r() * 0.8)
    const figure = s.layers.filter(l => l.scale < 0.99)
    return { filtro: nome, par, layer: (figure.length && c.r() < 0.6 ? figure[Math.floor(c.r() * figure.length)] : s.layers[Math.floor(c.r() * s.layers.length)]).id }
  },
  apply: async (s: Sheet, p) => {
    const l = s.layers.find(x => x.id === p.layer); if (!l) return s
    try { const out = filtra(l.canvas, p.filtro as string, p.par as Record<string, number>); return out ? replaceLayer(s, l.id, { canvas: out }) : s } catch { return s }
  },
}
