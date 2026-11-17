/**
 * Sandbox per frammenti di codice raccolti dal web: solo shader GLSL di
 * frammento, compilati in un contesto WebGL chiuso. Uno shader non può
 * accedere a rete, file o pagina: produce solo pixel.
 *
 * Convenzioni accettate (quelle più diffuse nei sorgenti liberi):
 *   u_time / iTime, u_resolution / iResolution, mainImage(out vec4, in vec2) o main()
 */

const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }'

export function adaptShader(code: string): string | null {
  if (!code || code.length > 40000) return null
  // niente estensioni, include o direttive strane
  if (/#\s*(include|extension)/.test(code)) return null
  let body = code.replace(/#version[^\n]*\n/g, '')
  const isShadertoy = /mainImage\s*\(/.test(body)
  const hasPrecision = /precision\s+(lowp|mediump|highp)\s+float/.test(body)
  const header = [
    hasPrecision ? '' : 'precision highp float;',
    /uniform\s+float\s+u_time/.test(body) ? '' : 'uniform float u_time;',
    /uniform\s+vec2\s+u_resolution/.test(body) ? '' : 'uniform vec2 u_resolution;',
    'uniform float u_seed;',
  ]
  if (isShadertoy) {
    header.push('#define iTime u_time', '#define iResolution vec3(u_resolution, 1.0)')
    body = body + '\nvoid main(){ vec4 c = vec4(0.0); mainImage(c, gl_FragCoord.xy); gl_FragColor = vec4(c.rgb, 1.0); }'
  }
  // GLSL ES 3 → 1: le uscite più comuni
  body = body.replace(/\bout\s+vec4\s+(\w+)\s*;/g, (_m, n) => `#define ${n} gl_FragColor`)
  body = body.replace(/\btexture\s*\(/g, 'texture2D(')
  return header.filter(Boolean).join('\n') + '\n' + body
}

export function runShader(code: string, w: number, h: number, time: number, seed: number): HTMLCanvasElement | null {
  const src = adaptShader(code)
  if (!src) return null
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const gl = c.getContext('webgl', { preserveDrawingBuffer: true })
  if (!gl) return null
  const sh = (type: number, s: string) => {
    const o = gl.createShader(type)!
    gl.shaderSource(o, s); gl.compileShader(o)
    return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null
  }
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, src)
  if (!vs || !fs) return null
  const pr = gl.createProgram()!
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr)
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null
  gl.useProgram(pr)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(pr, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  gl.uniform1f(gl.getUniformLocation(pr, 'u_time'), time)
  gl.uniform2f(gl.getUniformLocation(pr, 'u_resolution'), w, h)
  gl.uniform1f(gl.getUniformLocation(pr, 'u_seed'), seed)
  gl.viewport(0, 0, w, h)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
  const err = gl.getError()
  const out = document.createElement('canvas'); out.width = w; out.height = h
  out.getContext('2d')!.drawImage(c, 0, 0)
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  return err === gl.NO_ERROR ? out : null
}
