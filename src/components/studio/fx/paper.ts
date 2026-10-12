/**
 * Paper Shaders dentro il motore effetti.
 *
 * Gli shader originali di Paper (metallo liquido, mappa termica, fumo di gemma,
 * mezzetinte CMYK, retino a punti, dithering, carta, vetro, acqua) girano su un
 * contesto WebGL2 dedicato: ricevono il livello (testo, forma o foto) come immagine
 * e il risultato torna nella pila degli effetti.
 *
 * Paper Shaders — https://github.com/paper-design/shaders — Apache-2.0,
 * Copyright 2026 Paper. Lo shader di vertice qui sotto è copiato dal pacchetto
 * (non esportato) senza modifiche. Vedi public/licenses/paper-shaders.txt.
 */
import {
  getShaderColorFromString, getShaderNoiseTexture, ShaderFitOptions,
  liquidMetalFragmentShader, toProcessedLiquidMetal,
  gemSmokeFragmentShader, toProcessedGemSmoke,
  halftoneCmykFragmentShader, HalftoneCmykTypes,
  halftoneDotsFragmentShader, HalftoneDotsTypes, HalftoneDotsGrids,
  paperTextureFragmentShader,
  waterFragmentShader,
} from '@paper-design/shaders'
import { assetReady } from './gl'

const VERT = `#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_imageAspectRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

out vec2 v_objectUV;
out vec2 v_objectBoxSize;
out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;
out vec2 v_patternUV;
out vec2 v_patternBoxSize;
out vec2 v_imageUV;

vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  // fit = none
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  if (u_fit == 1.) { // fit = contain
    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);
  } else if (u_fit == 2.) { // fit = cover
    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);
  }
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

void main() {
  gl_Position = a_position;

  vec2 uv = gl_Position.xy * .5;
  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * 3.14159265358979323846 / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);


  // ===================================================

  float fixedRatio = 1.;
  vec2 fixedRatioBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );

  v_objectBoxSize = getBoxSize(fixedRatio, fixedRatioBoxGivenSize).xy;
  vec2 objectWorldScale = u_resolution.xy / v_objectBoxSize;

  v_objectUV = uv;
  v_objectUV *= objectWorldScale;
  v_objectUV += boxOrigin * (objectWorldScale - 1.);
  v_objectUV += graphicOffset;
  v_objectUV /= u_scale;
  v_objectUV = graphicRotation * v_objectUV;

  // ===================================================

  v_responsiveBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;
  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;

  #ifdef ADD_HELPERS
  v_responsiveHelperBox = uv;
  v_responsiveHelperBox *= responsiveBoxScale;
  v_responsiveHelperBox += boxOrigin * (responsiveBoxScale - 1.);
  #endif

  v_responsiveUV = uv;
  v_responsiveUV *= responsiveBoxScale;
  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);
  v_responsiveUV += graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;

  // ===================================================

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 patternBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;

  vec3 boxSizeData = getBoxSize(patternBoxRatio, patternBoxGivenSize);
  v_patternBoxSize = boxSizeData.xy;
  float patternBoxNoFitBoxWidth = boxSizeData.z;
  vec2 patternBoxScale = u_resolution.xy / v_patternBoxSize;

  v_patternUV = uv;
  v_patternUV += graphicOffset / patternBoxScale;
  v_patternUV += boxOrigin;
  v_patternUV -= boxOrigin / patternBoxScale;
  v_patternUV *= u_resolution.xy;
  v_patternUV /= u_pixelRatio;
  if (u_fit > 0.) {
    v_patternUV *= (patternBoxNoFitBoxWidth / v_patternBoxSize.x);
  }
  v_patternUV /= u_scale;
  v_patternUV = graphicRotation * v_patternUV;
  v_patternUV += boxOrigin / patternBoxScale;
  v_patternUV -= boxOrigin;
  // x100 is a default multiplier between vertex and fragmant shaders
  // we use it to avoid UV presision issues
  v_patternUV *= .01;

  // ===================================================

  vec2 imageBoxSize;
  if (u_fit == 1.) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / u_imageAspectRatio * u_imageAspectRatio);
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  v_imageUV = uv;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= u_imageAspectRatio;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= u_imageAspectRatio;

  v_imageUV += .5;
  v_imageUV.y = 1. - v_imageUV.y;
}`

type UVal = number | boolean | number[] | number[][] | TexImageSource
export type PaperUniforms = Record<string, UVal>

/* ───────── contesto dedicato ───────── */
class PaperGL {
  canvas = document.createElement('canvas')
  gl: WebGL2RenderingContext
  progs = new Map<string, { p: WebGLProgram; u: { name: string; type: number; size: number; loc: WebGLUniformLocation }[] }>()
  constructor() {
    const gl = this.canvas.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, alpha: true, antialias: false })
    if (!gl) throw new Error('webgl2')
    this.gl = gl
    const b = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  }
  private prog(frag: string) {
    const hit = this.progs.get(frag); if (hit) return hit
    const gl = this.gl
    const sh = (t: number, src: string) => {
      const s = gl.createShader(t)!; gl.shaderSource(s, src); gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('[paper] ' + gl.getShaderInfoLog(s))
      return s
    }
    const p = gl.createProgram()!
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, frag))
    gl.bindAttribLocation(p, 0, 'a_position')
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('[paper] ' + gl.getProgramInfoLog(p))
    const u: { name: string; type: number; size: number; loc: WebGLUniformLocation }[] = []
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i)!
      const name = info.name.replace(/\[0\]$/, '')
      const loc = gl.getUniformLocation(p, info.name)
      if (loc) u.push({ name, type: info.type, size: info.size, loc })
    }
    const e = { p, u }; this.progs.set(frag, e); return e
  }
  render(frag: string, uni: PaperUniforms, w: number, h: number): HTMLCanvasElement {
    const gl = this.gl, { p, u } = this.prog(frag)
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h }
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(p)
    const texs: WebGLTexture[] = []
    let unit = 0
    for (const { name, type, loc } of u) {
      const v = uni[name]
      if (v === undefined) continue
      if (type === gl.SAMPLER_2D) {
        const t = gl.createTexture()!; texs.push(t)
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v as TexImageSource)
        gl.generateMipmap(gl.TEXTURE_2D)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        const wrap = name === 'u_noiseTexture' ? gl.REPEAT : gl.CLAMP_TO_EDGE
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
        gl.uniform1i(loc, unit++)
        continue
      }
      const flat = Array.isArray(v) ? (Array.isArray(v[0]) ? (v as number[][]).flat() : (v as number[])) : null
      if (type === gl.BOOL) gl.uniform1i(loc, v ? 1 : 0)
      else if (type === gl.INT) gl.uniform1i(loc, Number(v))
      else if (type === gl.FLOAT) gl.uniform1f(loc, typeof v === 'boolean' ? (v ? 1 : 0) : Number(v))
      else if (type === gl.FLOAT_VEC2 && flat) gl.uniform2fv(loc, flat)
      else if (type === gl.FLOAT_VEC3 && flat) gl.uniform3fv(loc, flat)
      else if (type === gl.FLOAT_VEC4 && flat) gl.uniform4fv(loc, flat)
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    texs.forEach(t => gl.deleteTexture(t))
    return this.canvas
  }
}
let paperGL: PaperGL | null = null
const getGL = () => {
  if (paperGL) return paperGL
  try { paperGL = new PaperGL() } catch { paperGL = null }
  return paperGL
}

/* ───────── risorse asincrone ───────── */
let noise: HTMLImageElement | null = null
function noiseTex(): HTMLImageElement | null {
  if (!noise) { noise = getShaderNoiseTexture() ?? null; if (noise) noise.onload = () => assetReady() }
  return noise && noise.complete && noise.naturalWidth ? noise : null
}

/** impronta della sagoma: cambia se cambia il disegno, non a ogni ridisegno */
export function shapeKey(src: HTMLCanvasElement) {
  const n = 40, cv = document.createElement('canvas'); cv.width = n; cv.height = n
  const x = cv.getContext('2d', { willReadFrequently: true })!
  x.drawImage(src, 0, 0, n, n)
  const d = x.getImageData(0, 0, n, n).data
  let h = 2166136261
  for (let i = 3; i < d.length; i += 4) { h ^= d[i] >> 3; h = Math.imul(h, 16777619) }
  return `${src.width}x${src.height}:${(h >>> 0).toString(36)}`
}

type Kind = 'metal' | 'gem'
const processed = new Map<string, ImageBitmap | 'pending' | 'error'>()
/** sagoma preparata da Paper (campo di Poisson): asincrona, poi l'effetto si ridisegna */
function prepared(kind: Kind, src: HTMLCanvasElement): ImageBitmap | null {
  const key = kind + '|' + shapeKey(src)
  const hit = processed.get(key)
  if (hit && hit !== 'pending' && hit !== 'error') return hit
  if (!hit) {
    processed.set(key, 'pending')
    const url = src.toDataURL('image/png')
    const job = kind === 'metal' ? toProcessedLiquidMetal(url).then(r => r.pngBlob)
      : toProcessedGemSmoke(url).then(r => r.pngBlob)
    job.then(b => createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })).then(bmp => {
      processed.set(key, bmp); if (processed.size > 40) processed.delete(processed.keys().next().value!); assetReady() })
      .catch(e => { console.warn('[paper] preparazione non riuscita', e); processed.set(key, 'error') })
  }
  return null
}


/** riquadri dei singoli segni: righe separate da spazi orizzontali, poi lettere separate da spazi verticali */
function segments(src: HTMLCanvasElement): { x: number; y: number; w: number; h: number }[] {
  const k = Math.min(1, 900 / Math.max(src.width, src.height))
  const w = Math.max(1, Math.round(src.width * k)), h = Math.max(1, Math.round(src.height * k))
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const x = cv.getContext('2d', { willReadFrequently: true })!
  x.drawImage(src, 0, 0, w, h)
  const d = x.getImageData(0, 0, w, h).data
  const on = (i: number, j: number) => d[(j * w + i) * 4 + 3] > 40
  const runs = (n: number, hit: (i: number) => boolean) => {
    const out: [number, number][] = []; let st = -1
    for (let i = 0; i <= n; i++) { const v = i < n && hit(i); if (v && st < 0) st = i; if (!v && st >= 0) { out.push([st, i]); st = -1 } }
    return out
  }
  const res: { x: number; y: number; w: number; h: number }[] = []
  for (const [y0, y1] of runs(h, j => { for (let i = 0; i < w; i++) if (on(i, j)) return true; return false })) {
    const rh = y1 - y0
    // lettere: spazi verticali; i pezzi troppo stretti (accenti, punti) si uniscono al vicino
    let cols = runs(w, i => { for (let j = y0; j < y1; j++) if (on(i, j)) return true; return false })
    const merged: [number, number][] = []
    for (const c of cols) {
      const last = merged[merged.length - 1]
      if (last && (c[0] - last[1] < rh * 0.04 || c[1] - c[0] < rh * 0.12)) last[1] = c[1]
      else merged.push([...c])
    }
    cols = merged
    for (const [x0, x1] of cols) {
      const m = Math.round(rh * 0.12)
      const X = Math.max(0, x0 - m), Y = Math.max(0, y0 - m), X1 = Math.min(w, x1 + m), Y1 = Math.min(h, y1 + m)
      res.push({ x: X / k, y: Y / k, w: (X1 - X) / k, h: (Y1 - Y) / k })
    }
  }
  return res
}

/** shader "da logo" applicato segno per segno: ogni lettera ha la sua luce, poi si ricompone */
function perGlyph(kind: Kind, src: HTMLCanvasElement, draw: (img: ImageBitmap, w: number, h: number) => HTMLCanvasElement): HTMLCanvasElement | null {
  const segs = segments(src)
  if (!segs.length) return null
  const crops = segs.map(r => {
    const cv = document.createElement('canvas'); cv.width = Math.max(2, Math.round(r.w)); cv.height = Math.max(2, Math.round(r.h))
    cv.getContext('2d')!.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, cv.width, cv.height)
    return cv
  })
  const imgs = crops.map(cv => prepared(kind, cv))
  if (imgs.some(i => !i)) return null
  const out = document.createElement('canvas'); out.width = src.width; out.height = src.height
  const ox = out.getContext('2d')!
  imgs.forEach((img, i) => { const r = segs[i], cv = crops[i]; ox.drawImage(draw(img!, cv.width, cv.height), r.x, r.y, r.w, r.h) })
  return out
}

/* ───────── effetti ───────── */
const col = (s: unknown, d: string) => getShaderColorFromString(typeof s === 'string' ? s : d) as number[]
const num = (v: unknown, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d)
const sizing = (w: number, h: number, aspect = w / h): PaperUniforms => ({
  u_resolution: [w, h], u_pixelRatio: 1, u_imageAspectRatio: aspect, u_originX: 0.5, u_originY: 0.5,
  u_worldWidth: 0, u_worldHeight: 0, u_fit: ShaderFitOptions.contain, u_scale: 1, u_rotation: 0, u_offsetX: 0, u_offsetY: 0,
})

const HEAT_PAL = [
  '#11206a,#1f3ba2,#2f63e7,#6bd7ff,#ffe679,#ff991e,#ff4c00', '#997F45,#ffffff',
  '#0b1a3a,#1f8a70,#5cffc8,#e6ff9a', '#1a0500,#7a0b00,#ff3b00,#ffb000,#fff2a8', '#06122b,#1d4e89,#6fc3ff,#e8fbff',
]
const GEM_PAL = ['#333333,#e7e6df', '#2fb64c,#cdff61,#ffffff', '#fe5b16,#f7ff61,#ffffff', '#ff9900,#fff67a,#dcff52,#00ffbb,#0077ff']

/** mask: 'shape' = ritagliato sulla forma, 'soft' = alone morbido attorno alla forma, 'none' = com'è */
export type PaperRun = (src: HTMLCanvasElement, p: Record<string, unknown>, t: number) => { out: HTMLCanvasElement; mask: 'shape' | 'soft' | 'none' } | null

export const PAPER: Record<string, PaperRun> = {
  /** metallo liquido: il cromo fluido con dispersione, sulla sagoma vera */
  metalloLiquido: (src, p, t) => {
    const gl = getGL(); if (!gl) return null
    const out = perGlyph('metal', src, (img, w, h) => gl.render(liquidMetalFragmentShader, {
      ...sizing(w, h, img.width / img.height), u_time: t + num(p.phase) * 0.1,
      u_image: img, u_isImage: true, u_shape: 0,
      u_colorBack: [0, 0, 0, 0], u_colorTint: col(p.tint, '#ffffff'),
      u_contour: num(p.contour, 40) / 100, u_distortion: num(p.distortion, 7) / 100, u_softness: num(p.softness, 10) / 100,
      u_repetition: num(p.repetition, 2), u_shiftRed: num(p.shiftRed, 30) / 100, u_shiftBlue: num(p.shiftBlue, 30) / 100, u_angle: num(p.angle, 70),
    }, w, h))
    return out ? { mask: 'none', out } : null
  },

  /** fumo di gemma: volute di colore dentro la sagoma, con bagliori */
  fumoGemma: (src, p, t) => {
    const gl = getGL(); if (!gl) return null
    const colors = (GEM_PAL[num(p.palette)] ?? GEM_PAL[0]).split(',').map(c => col(c.trim(), '#ffffff'))
    const out = perGlyph('gem', src, (img, w, h) => gl.render(gemSmokeFragmentShader, {
      ...sizing(w, h, img.width / img.height), u_time: t + num(p.phase) * 0.1,
      u_image: img, u_isImage: true, u_shape: 0, u_colorBack: [0, 0, 0, 0], u_colorInner: col(p.inner, '#00000000'),
      u_colors: colors, u_colorsCount: colors.length, u_outerGlow: num(p.outerGlow, 15) / 100, u_innerGlow: num(p.innerGlow, 100) / 100,
      u_innerDistortion: num(p.innerDistortion, 80) / 100, u_outerDistortion: num(p.outerDistortion, 60) / 100, u_offset: num(p.offset, 0) / 100,
      u_angle: num(p.angle, 0), u_size: num(p.size, 80) / 100,
    }, w, h))
    return out ? { mask: 'soft', out } : null
  },
  /** mezzetinte CMYK: quattro retini ruotati con inchiostro che si allarga e grana */
  mezzetinteCmyk: (src, p) => {
    const gl = getGL(), nz = noiseTex(); if (!gl || !nz) return null
    return { mask: 'shape', out: gl.render(halftoneCmykFragmentShader, {
      ...sizing(src.width, src.height), u_time: 0, u_image: src, u_noiseTexture: nz,
      u_colorBack: col(p.paper, '#fbfaf5'), u_colorC: col(p.c, '#00b4ff'), u_colorM: col(p.m, '#fc519f'), u_colorY: col(p.y, '#ffd800'), u_colorK: col(p.k, '#231f20'),
      u_size: num(p.size, 20) / 100, u_contrast: num(p.contrast, 100) / 100, u_softness: num(p.softness, 100) / 100,
      u_grainSize: 0.5, u_grainMixer: num(p.grain, 0) / 100, u_grainOverlay: num(p.grainOverlay, 0) / 100, u_gridNoise: num(p.gridNoise, 20) / 100,
      u_floodC: 0.15, u_floodM: 0, u_floodY: 0, u_floodK: 0, u_gainC: num(p.gainC, 30) / 100, u_gainM: num(p.gainM, 0) / 100, u_gainY: num(p.gainY, 20) / 100, u_gainK: 0,
      u_type: [HalftoneCmykTypes.sharp, HalftoneCmykTypes.ink, HalftoneCmykTypes.dots][num(p.type, 1)] ?? HalftoneCmykTypes.ink,
    }, src.width, src.height) }
  },
  /** retino a punti: classico, morbido, a gocce che si fondono, a buchi */
  retinoPunti: (src, p) => {
    const gl = getGL(); if (!gl) return null
    return { mask: 'shape', out: gl.render(halftoneDotsFragmentShader, {
      ...sizing(src.width, src.height), u_time: 0, u_image: src,
      u_colorBack: col(p.back, '#f2f1e8'), u_colorFront: col(p.front, '#2b2b2b'),
      u_size: num(p.size, 50) / 100, u_radius: num(p.radius, 125) / 100, u_contrast: num(p.contrast, 40) / 100,
      u_originalColors: !!num(p.original), u_inverted: !!num(p.inverted),
      u_grainMixer: num(p.grain, 20) / 100, u_grainOverlay: num(p.grainOverlay, 20) / 100, u_grainSize: 0.5,
      u_grid: num(p.grid, HalftoneDotsGrids.hex), u_type: num(p.type, HalftoneDotsTypes.gooey),
    }, src.width, src.height) }
  },

  /** carta vera: fibre, pieghe, grinze e macchie sopra il livello */
  cartaPaper: (src, p) => {
    const gl = getGL(), nz = noiseTex(); if (!gl || !nz) return null
    return { mask: 'shape', out: gl.render(paperTextureFragmentShader, {
      ...sizing(src.width, src.height), u_time: 0, u_image: src, u_noiseTexture: nz,
      u_colorBack: col(p.back, '#ffffff00'), u_colorFront: col(p.paper, '#ffffff'), u_colorPaper: col(p.paper, '#ffffff'), u_colorShadow: col(p.shadow, '#cccccc'),
      u_isImage: true, u_blending: 1, u_distortion: num(p.distortion, 30) / 100, u_clip: false, u_angle: num(p.angle, 300), u_seed: num(p.seed, 4),
      u_roughness: num(p.roughness, 40) / 100, u_roughnessSize: 0.5, u_roughnessRows: 0, u_fiber: num(p.fiber, 40) / 100, u_fiberSize: 0.5,
      u_folds: num(p.folds, 50) / 100, u_foldSizeX: 1, u_foldSizeY: 1, u_foldOffsetX: 0, u_foldOffsetY: 0, u_foldCount: 5,
      u_wrinkles: num(p.wrinkles, 100) / 100, u_wrinkleSize: 0.65, u_crumples: num(p.crumples, 0) / 100, u_crumpleCount: 6, u_crumpleSize: 0.5, u_drops: num(p.drops, 40) / 100, u_fade: 0, u_contrast: 0.3, u_scale: 1,
    }, src.width, src.height) }
  },

  /** acqua: caustiche e increspature sopra il livello */
  acqua: (src, p, t) => {
    const gl = getGL(); if (!gl) return null
    return { mask: 'shape', out: gl.render(waterFragmentShader, {
      ...sizing(src.width, src.height), u_time: t + num(p.phase) * 0.1, u_image: src,
      u_colorBack: col(p.back, '#909090'), u_colorHighlight: col(p.highlightColor, '#ffffff'),
      u_highlights: num(p.highlights, 7) / 100, u_layering: num(p.layering, 50) / 100, u_edges: num(p.edges, 80) / 100,
      u_waves: num(p.waves, 30) / 100, u_caustic: num(p.caustic, 10) / 100, u_size: num(p.size, 100) / 100,
    }, src.width, src.height) }
  },
}
