/**
 * Renderer WebGL2 del motore effetti.
 *
 * Perché non i filtri di Fabric: quelli sono una catena con UN ingresso. Gli
 * effetti belli (ombre con spread, rilievi, contorni interni, bagliori a più
 * strati, halation) hanno bisogno di più texture insieme: l'originale, la forma
 * sfocata, il campo di distanze dal bordo.
 *
 * Convenzioni:
 * - colori PREMOLTIPLICATI ovunque (sfocare e comporre resta corretto sui bordi);
 * - texture in mezza precisione (RGBA16F) se la scheda lo consente: niente bande
 *   nei bagliori e nelle sfumature;
 * - le coordinate texture hanno l'origine in alto (come il canvas sorgente),
 *   solo `present` capovolge per scrivere sul canvas 2D.
 */

export interface Tex { t: WebGLTexture; f: WebGLFramebuffer; w: number; h: number; fmt: Fmt }
type Fmt = 'rgba8' | 'rgba16f' | 'rgba32f'
export type UVal = number | number[] | Tex

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`

/** Funzioni GLSL comuni a tutti gli shader */
export const LIB = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUv;
out vec4 o;
uniform vec2 uRes;      // dimensione dell'uscita in pixel
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec4 unpre(vec4 c) { return c.a > 0.0 ? vec4(c.rgb / c.a, c.a) : vec4(0.0); }
vec4 pre(vec4 c) { return vec4(c.rgb * c.a, c.a); }
vec4 over(vec4 top, vec4 bot) { return top + bot * (1.0 - top.a); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y); float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
// modi di fusione su colori NON premoltiplicati: b = sotto, s = sopra
vec3 blend(vec3 b, vec3 s, float m) {
  if (m < 0.5) return s;                                              // normale
  if (m < 1.5) return b * s;                                          // moltiplica
  if (m < 2.5) return 1.0 - (1.0 - b) * (1.0 - s);                    // schermo
  if (m < 3.5) return mix(2.0 * b * s, 1.0 - 2.0 * (1.0 - b) * (1.0 - s), step(0.5, b)); // sovrapponi
  if (m < 4.5) return mix(2.0 * b * s + b * b * (1.0 - 2.0 * s), sqrt(b) * (2.0 * s - 1.0) + 2.0 * b * (1.0 - s), step(0.5, s)); // luce soffusa
  if (m < 5.5) return min(b + s, 1.0);                                // aggiungi
  if (m < 6.5) return b / max(1.0 - s, 1e-3);                         // colore scherma
  return hsv2rgb(vec3(rgb2hsv(s).xy, rgb2hsv(b).z));                  // colore
}
`

let shared: FxGL | null = null
/** immagini (texture di materiali) caricate una volta e tenute fuori dal pool */
const images = new Map<string, { tex: Tex | null }>()
const readyListeners = new Set<() => void>()
export const onAssetReady = (f: () => void) => { readyListeners.add(f); return () => { readyListeners.delete(f) } }
let broken = false

export class FxGL {
  readonly canvas: HTMLCanvasElement
  readonly gl: WebGL2RenderingContext
  readonly floatOK: boolean
  private progs = new Map<string, { p: WebGLProgram; u: Map<string, { loc: WebGLUniformLocation; type: number }> }>()
  private pool: Tex[] = []
  private live = new Set<Tex>()
  private vao: WebGLVertexArrayObject

  /** il renderer condiviso, o null se WebGL2 non c'è */
  static get(): FxGL | null {
    if (broken) return null
    if (shared && !shared.gl.isContextLost()) return shared
    try { shared = new FxGL() } catch (e) { console.warn('[fx] WebGL2 non disponibile', e); broken = true; shared = null }
    return shared
  }

  private constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.canvas.height = 2
    const gl = this.canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true })
    if (!gl) throw new Error('webgl2')
    this.gl = gl
    this.floatOK = !!gl.getExtension('EXT_color_buffer_float')
    gl.getExtension('OES_texture_float_linear')
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    this.vao = gl.createVertexArray()!
    gl.bindVertexArray(this.vao)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.disable(gl.BLEND)
    this.canvas.addEventListener('webglcontextlost', () => { shared = null })
  }

  /* ───────── texture ───────── */
  tex(w: number, h: number, fmt: Fmt = this.floatOK ? 'rgba16f' : 'rgba8'): Tex {
    if (fmt !== 'rgba8' && !this.floatOK) fmt = 'rgba8'
    const i = this.pool.findIndex(t => t.w === w && t.h === h && t.fmt === fmt)
    if (i >= 0) { const t = this.pool.splice(i, 1)[0]; this.live.add(t); return t }
    const gl = this.gl
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    const [ifmt, type] = fmt === 'rgba32f' ? [gl.RGBA32F, gl.FLOAT] : fmt === 'rgba16f' ? [gl.RGBA16F, gl.HALF_FLOAT] : [gl.RGBA8, gl.UNSIGNED_BYTE]
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, gl.RGBA, type, null)
    const filter = fmt === 'rgba32f' ? gl.NEAREST : gl.LINEAR
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const f = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, f)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
    const tex = { t, f, w, h, fmt }
    this.live.add(tex)
    return tex
  }
  release(...ts: (Tex | null | undefined)[]) {
    for (const t of ts) if (t && this.live.delete(t)) this.pool.push(t)
    // il pool non cresce senza limiti: si liberano le texture più vecchie
    while (this.pool.length > 48) {
      const t = this.pool.shift()!
      this.gl.deleteTexture(t.t); this.gl.deleteFramebuffer(t.f)
    }
  }
  /** libera tutto ciò che non è stato rilasciato (fine di un render) */
  releaseAll() { this.release(...this.live) }

  /** texture persistente costruita al volo da una tela (es. atlante di caratteri) */
  canvasTex(key: string, make: () => HTMLCanvasElement): Tex {
    let e = images.get(key)
    if (!e?.tex) {
      const cv = make(), gl = this.gl, t = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      e = { tex: { t, f: null as unknown as WebGLFramebuffer, w: cv.width, h: cv.height, fmt: 'rgba8' } }
      images.set(key, e)
    }
    return e.tex!
  }

  /** texture ripetibile da un'immagine (materiali): null finché non è arrivata */
  image(url: string): Tex | null {
    let e = images.get(url)
    if (!e) {
      e = { tex: null }; images.set(url, e)
      const entry = e, img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const gl = this.gl, t = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img)
        gl.generateMipmap(gl.TEXTURE_2D)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT)
        entry.tex = { t, f: null as unknown as WebGLFramebuffer, w: img.width, h: img.height, fmt: 'rgba8' }
        readyListeners.forEach(f => f())
      }
      img.src = url
    }
    return e.tex
  }

  upload(src: TexImageSource, w: number, h: number): Tex {
    const gl = this.gl
    const t = this.tex(w, h, 'rgba8')
    gl.bindTexture(gl.TEXTURE_2D, t.t)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, src)
    return t
  }

  /* ───────── programmi ───────── */
  private program(key: string, frag: string) {
    const hit = this.progs.get(key)
    if (hit) return hit
    const gl = this.gl
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src); gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`[fx] shader "${key}": ${gl.getShaderInfoLog(s)}`)
      return s
    }
    const p = gl.createProgram()!
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT))
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, frag))
    gl.bindAttribLocation(p, 0, 'aPos')
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`[fx] link "${key}": ${gl.getProgramInfoLog(p)}`)
    const u = new Map<string, { loc: WebGLUniformLocation; type: number }>()
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i)!
      u.set(info.name.replace(/\[0\]$/, ''), { loc: gl.getUniformLocation(p, info.name)!, type: info.type })
    }
    const prog = { p, u }
    this.progs.set(key, prog)
    return prog
  }

  /** Esegue uno shader a schermo intero su `out` (o sul canvas, se null) */
  run(key: string, frag: string, out: Tex | null, uniforms: Record<string, UVal> = {}, size?: [number, number]) {
    const gl = this.gl
    const prog = this.program(key, frag)
    gl.useProgram(prog.p)
    gl.bindVertexArray(this.vao)
    const [w, h] = out ? [out.w, out.h] : size!
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.f : null)
    gl.viewport(0, 0, w, h)
    let unit = 0
    const all: Record<string, UVal> = { uRes: [w, h], ...uniforms }
    for (const [name, v] of Object.entries(all)) {
      const u = prog.u.get(name); if (!u) continue
      if (typeof v === 'object' && !Array.isArray(v)) {
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, v.t)
        gl.uniform1i(u.loc, unit++)
      } else if (typeof v === 'number') {
        if (u.type === gl.INT || u.type === gl.BOOL) gl.uniform1i(u.loc, v); else gl.uniform1f(u.loc, v)
      } else if (v.length === 2) gl.uniform2fv(u.loc, v)
      else if (v.length === 3) gl.uniform3fv(u.loc, v)
      else if (v.length === 4) gl.uniform4fv(u.loc, v)
      else gl.uniform1fv(u.loc, v)
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.activeTexture(gl.TEXTURE0)
  }

  /** shader → nuova texture della dimensione data */
  pass(key: string, frag: string, w: number, h: number, uniforms: Record<string, UVal>, fmt?: Fmt): Tex {
    const out = this.tex(w, h, fmt)
    this.run(key, frag, out, uniforms)
    return out
  }

  /* ───────── sfocatura a piramide ─────────
     Si dimezza la texture finché il raggio residuo è piccolo, si sfoca con una
     gaussiana separabile e si risale con un filtro a tenda (Dual Kawase "up"):
     aloni morbidi e senza puntinature anche con raggi di centinaia di pixel. */
  blur(src: Tex, radius: number): Tex {
    const levels: Tex[] = []
    let cur = src, scale = 1
    while (radius * scale > 6 && cur.w > 4 && cur.h > 4) {
      const d = this.pass('down', DOWN, Math.max(1, Math.ceil(cur.w / 2)), Math.max(1, Math.ceil(cur.h / 2)), { uSrc: cur, uTexel: [1 / cur.w, 1 / cur.h] })
      levels.push(d); cur = d; scale *= 0.5
    }
    const sigma = Math.max(0.01, (radius * scale) / 2.2)
    const h = this.pass('gauss', GAUSS, cur.w, cur.h, { uSrc: cur, uDir: [1 / cur.w, 0], uSigma: sigma })
    const v = this.pass('gauss', GAUSS, cur.w, cur.h, { uSrc: h, uDir: [0, 1 / cur.h], uSigma: sigma })
    this.release(h)
    let up = v
    for (let i = levels.length - 2; i >= -1; i--) {
      const target = i >= 0 ? levels[i] : src
      const u = this.pass('up', UP, target.w, target.h, { uSrc: up, uHalf: [0.5 / up.w, 0.5 / up.h] })
      this.release(up)
      up = u
    }
    this.release(...levels)
    return up
  }

  /* ───────── campo di distanze dal bordo (Jump Flooding) ─────────
     Ritorna una texture float: R = distanza firmata in pixel (negativa dentro la
     forma, positiva fuori), calcolata dal canale alpha. Base di contorni, rilievi,
     bagliori interni, spread e choke come negli stili livello di Photoshop. */
  sdf(alpha: Tex, maxDist: number): Tex | null {
    if (!this.floatOK) return null
    const { w, h } = alpha
    let a = this.pass('jfaInit', JFA_INIT, w, h, { uSrc: alpha }, 'rgba32f')
    let step = 1
    while (step < Math.min(Math.max(w, h), Math.max(2, maxDist))) step *= 2
    for (; step >= 1; step = Math.floor(step / 2)) {
      const b = this.pass('jfaStep', JFA_STEP, w, h, { uSeed: a, uStep: step }, 'rgba32f')
      this.release(a); a = b
    }
    const extra = this.pass('jfaStep', JFA_STEP, w, h, { uSeed: a, uStep: 1 }, 'rgba32f')
    this.release(a)
    // mezza precisione con interpolazione lineare: superfici e bordi lisci (rilievo, 3D)
    const d = this.pass('jfaDist', JFA_DIST, w, h, { uSeed: extra, uSrc: alpha })
    this.release(extra)
    return d
  }

  /** copia la texture sul canvas 2D di uscita */
  present(t: Tex, out: HTMLCanvasElement) {
    if (this.canvas.width < t.w || this.canvas.height < t.h) {
      this.canvas.width = Math.max(this.canvas.width, t.w)
      this.canvas.height = Math.max(this.canvas.height, t.h)
    }
    this.run('present', PRESENT, null, { uSrc: t }, [t.w, t.h])
    out.width = t.w; out.height = t.h
    const ctx = out.getContext('2d')!
    ctx.clearRect(0, 0, t.w, t.h)
    ctx.drawImage(this.canvas, 0, this.canvas.height - t.h, t.w, t.h, 0, 0, t.w, t.h)
  }
}

const DOWN = LIB + `
uniform sampler2D uSrc; uniform vec2 uTexel;
void main() {
  vec2 uv = vUv;
  o = (texture(uSrc, uv) * 4.0
     + texture(uSrc, uv + vec2(-1.0, -1.0) * uTexel) + texture(uSrc, uv + vec2(1.0, -1.0) * uTexel)
     + texture(uSrc, uv + vec2(-1.0, 1.0) * uTexel) + texture(uSrc, uv + vec2(1.0, 1.0) * uTexel)) / 8.0;
}`

const UP = LIB + `
uniform sampler2D uSrc; uniform vec2 uHalf;
void main() {
  vec2 uv = vUv; vec2 h = uHalf;
  vec4 s = texture(uSrc, uv + vec2(-2.0 * h.x, 0.0)) + texture(uSrc, uv + vec2(2.0 * h.x, 0.0))
         + texture(uSrc, uv + vec2(0.0, -2.0 * h.y)) + texture(uSrc, uv + vec2(0.0, 2.0 * h.y));
  s += 2.0 * (texture(uSrc, uv + vec2(-h.x, h.y)) + texture(uSrc, uv + vec2(h.x, h.y))
            + texture(uSrc, uv + vec2(-h.x, -h.y)) + texture(uSrc, uv + vec2(h.x, -h.y)));
  o = s / 12.0;
}`

const GAUSS = LIB + `
uniform sampler2D uSrc; uniform vec2 uDir; uniform float uSigma;
void main() {
  if (uSigma < 0.35) { o = texture(uSrc, vUv); return; }
  vec4 acc = vec4(0.0); float ws = 0.0;
  for (int i = -14; i <= 14; i++) {
    float x = float(i);
    float w = exp(-x * x / (2.0 * uSigma * uSigma));
    acc += texture(uSrc, vUv + uDir * x) * w; ws += w;
  }
  o = acc / ws;
}`

const JFA_INIT = LIB + `
uniform sampler2D uSrc;
void main() {
  vec2 p = gl_FragCoord.xy;
  float a = texelFetch(uSrc, ivec2(p), 0).a;
  // xy = pixel "dentro" più vicino, zw = pixel "fuori" più vicino (-1 = nessuno)
  o = a >= 0.5 ? vec4(p, -1.0, -1.0) : vec4(-1.0, -1.0, p);
}`

const JFA_STEP = LIB + `
uniform sampler2D uSeed; uniform float uStep;
void main() {
  vec2 p = gl_FragCoord.xy;
  ivec2 sz = textureSize(uSeed, 0);
  vec4 best = texelFetch(uSeed, ivec2(p), 0);
  float dIn = best.x < 0.0 ? 1e9 : distance(p, best.xy);
  float dOut = best.z < 0.0 ? 1e9 : distance(p, best.zw);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    ivec2 q = ivec2(p) + ivec2(x, y) * int(uStep);
    if (q.x < 0 || q.y < 0 || q.x >= sz.x || q.y >= sz.y) continue;
    vec4 s = texelFetch(uSeed, q, 0);
    if (s.x >= 0.0) { float d = distance(p, s.xy); if (d < dIn) { dIn = d; best.xy = s.xy; } }
    if (s.z >= 0.0) { float d = distance(p, s.zw); if (d < dOut) { dOut = d; best.zw = s.zw; } }
  }
  o = best;
}`

const JFA_DIST = LIB + `
uniform sampler2D uSeed; uniform sampler2D uSrc;
void main() {
  vec2 p = gl_FragCoord.xy;
  vec4 s = texelFetch(uSeed, ivec2(p), 0);
  float a = texelFetch(uSrc, ivec2(p), 0).a;
  float d;
  if (a >= 0.5) d = s.z < 0.0 ? -1e4 : -(distance(p, s.zw) - 0.5);
  else d = s.x < 0.0 ? 1e4 : distance(p, s.xy) - 0.5;
  // vicino al bordo l'alpha (copertura) dà la posizione sub-pixel: bordi senza scalette
  if (abs(d) < 1.0) d = 0.5 - a;
  o = vec4(d, a, 0.0, 1.0);
}`

const PRESENT = LIB + `
uniform sampler2D uSrc;
void main() { o = clamp(texture(uSrc, vec2(vUv.x, 1.0 - vUv.y)), 0.0, 1.0); }`
