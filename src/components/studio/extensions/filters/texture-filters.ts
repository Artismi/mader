import * as fabric from 'fabric'
import { clamp } from './shared-utils'

/**
 * Grain 2.0 — Emulsion Engine.
 */
export class GrainFilter extends fabric.filters.BaseFilter<'GrainFilter'> {
  static type = 'Grain'
  static uniformLocations = ['uIntensity', 'uTime', 'uColorSaturation']
  
  uIntensity       = 0.4
  uTime            = 0.0
  uColorSaturation = 0.35

  constructor(opts?: any) {
    super()
    if (opts?.uIntensity !== undefined)       this.uIntensity = opts.uIntensity
    if (opts?.uTime !== undefined)            this.uTime = opts.uTime
    if (opts?.uColorSaturation !== undefined) this.uColorSaturation = opts.uColorSaturation
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uIntensity, uTime, uColorSaturation;

      float hashGr(vec2 p){
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main(){
        vec4 color = texture2D(uTexture, vTexCoord);
        if (color.a < 0.01) discard;

        float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        float weight = 1.0 - pow(abs(luma - 0.35) * 1.6, 2.0);
        weight = clamp(weight, 0.15, 1.0) * uIntensity;

        vec2 p = vTexCoord * 1850.0 + uTime * 0.04;
        float nr = hashGr(p + 0.11);
        float ng = hashGr(p + 0.22);
        float nb = hashGr(p + 0.33);
        
        vec3 grain = vec3(nr, ng, nb);
        float mono = (nr + ng + nb) * 0.333;
        grain = mix(vec3(mono), grain, uColorSaturation);

        vec3 final = color.rgb;
        vec3 blend = grain;
        final = (vec3(1.0) - 2.0 * blend) * final * final + 2.0 * blend * final;
        final = mix(color.rgb, final, weight);

        gl_FragColor = vec4(clamp(final, 0.0, 1.0) * color.a, color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uIntensity,       this.uIntensity)
    gl.uniform1f(u.uTime,            this.uTime)
    gl.uniform1f(u.uColorSaturation, this.uColorSaturation)
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const amp = this.uIntensity * 40
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * amp
      data[i] = clamp(data[i] + n); data[i+1] = clamp(data[i+1] + n); data[i+2] = clamp(data[i+2] + n)
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(GrainFilter, 'Grain')

/**
 * Fiber 2.0 — Organic Stock Edition.
 */
export class FiberFilter extends fabric.filters.BaseFilter<'FiberFilter'> {
  static type = 'Fiber'
  static uniformLocations = ['uIntensity', 'uRoughness', 'uScale']
  
  uIntensity = 0.4
  uRoughness = 0.5
  uScale     = 1.0

  constructor(opts?: any) {
    super()
    if (opts?.uIntensity !== undefined) this.uIntensity = opts.uIntensity
    if (opts?.uRoughness !== undefined) this.uRoughness = opts.uRoughness
    if (opts?.uScale !== undefined)     this.uScale     = opts.uScale
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uIntensity, uRoughness, uScale;

      float hashF(vec2 p){
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float pulp_noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hashF(i);
        float b = hashF(i + vec2(1.0, 0.0));
        float c = hashF(i + vec2(0.0, 1.0));
        float d = hashF(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        if (color.a < 0.01) discard;

        float warp = hashF(uv * 4.0) * 0.15;
        vec2 p = uv * 320.0 * uScale + warp;
        
        float f1 = pulp_noise(p);
        float f2 = pulp_noise(p * 2.2 + 8.0);
        float n = (f1 * 0.65 + f2 * 0.35);

        float tooth = smoothstep(0.42, 0.58, n);
        float shading = 1.0 - (tooth * 0.18 * uRoughness * uIntensity);
        
        vec3 final = color.rgb * shading;
        final += (1.0 - shading) * 0.05 * uIntensity;

        gl_FragColor = vec4(clamp(final, 0.0, 1.0) * color.a, color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uIntensity, this.uIntensity)
    gl.uniform1f(u.uRoughness, this.uRoughness)
    gl.uniform1f(u.uScale,     this.uScale)
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const strength = this.uIntensity * 40
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * strength
      data[i] = clamp(data[i] + n); data[i+1] = clamp(data[i+1] + n); data[i+2] = clamp(data[i+2] + n)
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(FiberFilter, 'Fiber')

/**
 * Halftone — Pro-grade WebGL halftone with rotated screen, AA, and color modes.
 * uMode: 0 = mono dots on paper, 1 = mono dots on color, 2 = CMYK 4-screen
 * uAngle: screen rotation in radians (typical: 15° / 45° / 75°)
 * uPaperColor: background fill (only used in mono modes)
 * uOpacity: blend with original
 */
export class EliteHalftone extends fabric.filters.BaseFilter<'EliteHalftone'> {
  static type = 'EliteHalftone'
  static uniformLocations = ['uSize', 'uIntensity', 'uMode', 'uAngle', 'uPaperColor', 'uOpacity']

  uSize       = 10.0
  uIntensity  = 0.85
  uMode       = 0.0
  uAngle      = 0.785            // 45°
  uPaperColor = [250, 248, 240]
  uOpacity    = 1.0

  constructor(opts?: any) {
    super()
    if (opts?.uSize       !== undefined) this.uSize       = opts.uSize
    if (opts?.uIntensity  !== undefined) this.uIntensity  = opts.uIntensity
    if (opts?.uMode       !== undefined) this.uMode       = opts.uMode
    if (opts?.uAngle      !== undefined) this.uAngle      = opts.uAngle
    if (opts?.uPaperColor !== undefined) this.uPaperColor = opts.uPaperColor
    if (opts?.uOpacity    !== undefined) this.uOpacity    = opts.uOpacity
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uSize, uIntensity, uMode, uAngle, uOpacity;
      uniform vec3 uPaperColor;

      float halftoneDot(vec2 uv, float cellPx, float angle, float fillAmount) {
        mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        vec2 ruv = rot * uv;
        vec2 d = ruv - (floor(ruv / cellPx) * cellPx + cellPx * 0.5);
        float dist = length(d);
        float radius = sqrt(clamp(fillAmount, 0.0, 1.0)) * cellPx * 0.7071;
        float aa = cellPx * 0.04;
        return 1.0 - smoothstep(radius - aa, radius + aa, dist);
      }

      void main(){
        vec2 uv = vTexCoord;
        vec4 src = texture2D(uTexture, uv);
        if (src.a < 0.01) discard;

        // Sample center of the halftone cell to avoid sampling noise inside the dot
        float cs = max(uSize * 0.010, 0.0015);
        vec2 cellUV = (floor(uv / cs) + 0.5) * cs;
        vec4 cc = texture2D(uTexture, clamp(cellUV, vec2(0.0), vec2(1.0)));

        vec3 result;

        if (uMode < 0.5) {
          // Mono — black dots on paper
          float lum = dot(cc.rgb, vec3(0.299, 0.587, 0.114));
          float fill = (1.0 - lum) * uIntensity;
          float cov = halftoneDot(uv, cs, uAngle, fill);
          result = mix(uPaperColor / 255.0, vec3(0.0), cov);
        } else if (uMode < 1.5) {
          // Mono on color — preserve hue of cell, dots saturate the color
          float lum = dot(cc.rgb, vec3(0.299, 0.587, 0.114));
          float fill = (1.0 - lum) * uIntensity;
          float cov = halftoneDot(uv, cs, uAngle, fill);
          vec3 darken = cc.rgb * 0.35;
          result = mix(uPaperColor / 255.0, darken, cov);
        } else {
          // CMYK 4-screen — classic process-color simulation
          // RGB → CMY (no UCR/GCR, simple)
          vec3 cmy = 1.0 - cc.rgb;
          float k = min(min(cmy.r, cmy.g), cmy.b);
          vec3 cmy2 = (cmy - k) / max(1.0 - k, 0.001);
          float cF = cmy2.r * uIntensity;
          float mF = cmy2.g * uIntensity;
          float yF = cmy2.b * uIntensity;
          float kF = k * uIntensity;

          float covC = halftoneDot(uv, cs, 0.2618, cF); // 15°
          float covM = halftoneDot(uv, cs, 1.3090, mF); // 75°
          float covY = halftoneDot(uv, cs, 0.0,    yF); // 0°
          float covK = halftoneDot(uv, cs, 0.7854, kF); // 45°

          vec3 paper = uPaperColor / 255.0;
          vec3 inkC = vec3(0.0, 0.68, 0.94);
          vec3 inkM = vec3(0.93, 0.0, 0.55);
          vec3 inkY = vec3(0.99, 0.93, 0.0);
          vec3 inkK = vec3(0.05, 0.05, 0.06);

          // Multiplicative ink stack on paper
          result = paper;
          result *= mix(vec3(1.0), inkC, covC);
          result *= mix(vec3(1.0), inkM, covM);
          result *= mix(vec3(1.0), inkY, covY);
          result *= mix(vec3(1.0), inkK, covK);
        }

        vec3 final = mix(src.rgb, result, uOpacity);
        gl_FragColor = vec4(final * src.a, src.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uSize,      this.uSize)
    gl.uniform1f(u.uIntensity, this.uIntensity)
    gl.uniform1f(u.uMode,      this.uMode)
    gl.uniform1f(u.uAngle,     this.uAngle)
    gl.uniform1f(u.uOpacity,   this.uOpacity)
    gl.uniform3fv(u.uPaperColor, new Float32Array(this.uPaperColor.map(c => c / 255)))
  }

  applyTo2d({ imageData }: any) {
    const { data, width, height } = imageData
    const cell = Math.max(2, Math.round(this.uSize))
    const paper = this.uPaperColor
    const op = this.uOpacity
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        const cx = Math.min(x + Math.floor(cell/2), width-1)
        const cy = Math.min(y + Math.floor(cell/2), height-1)
        const ci = (cy * width + cx) * 4
        const lum = (data[ci]*0.299 + data[ci+1]*0.587 + data[ci+2]*0.114) / 255
        // Use sqrt for proper area-fill mapping (matches WebGL path)
        const fillAmt = Math.max(0, Math.min(1, (1 - lum) * this.uIntensity))
        const radius = Math.sqrt(fillAmt) * (cell * 0.7071)
        for (let dy = 0; dy < cell && y+dy < height; dy++) {
          for (let dx = 0; dx < cell && x+dx < width; dx++) {
            const i    = ((y+dy) * width + (x+dx)) * 4
            const ddx  = dx - cell / 2
            const ddy  = dy - cell / 2
            const dist = Math.sqrt(ddx*ddx + ddy*ddy)
            const aa   = cell * 0.04
            const cov  = 1 - Math.max(0, Math.min(1, (dist - (radius - aa)) / (2 * aa)))
            const ink  = [data[ci] * 0.25, data[ci+1] * 0.25, data[ci+2] * 0.25]
            const r = paper[0] + (ink[0] - paper[0]) * cov
            const g = paper[1] + (ink[1] - paper[1]) * cov
            const b = paper[2] + (ink[2] - paper[2]) * cov
            data[i]   = clamp(data[i]   + (r - data[i])   * op)
            data[i+1] = clamp(data[i+1] + (g - data[i+1]) * op)
            data[i+2] = clamp(data[i+2] + (b - data[i+2]) * op)
          }
        }
      }
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(EliteHalftone, 'EliteHalftone')

/**
 * ASCII Art — CPU character-density mapping.
 */
export class ASCIIFilter extends fabric.filters.BaseFilter<'ASCIIFilter'> {
  static type = 'ASCIIFilter'
  cellSize  = 8
  intensity = 1.0

  constructor(opts?: any) {
    super()
    if (opts?.uSize !== undefined) this.cellSize = opts.uSize
    if (opts?.intensity !== undefined) this.intensity = opts.intensity
  }

  applyTo2d({ imageData }: any) {
    const { data, width, height } = imageData
    const copy  = new Uint8ClampedArray(data)
    const chars = '@#S%?*+;:,. '
    for (let y = 0; y < height; y += this.cellSize) {
      for (let x = 0; x < width; x += this.cellSize) {
        let lumSum=0, rSum=0, gSum=0, bSum=0, count=0
        for (let dy = 0; dy < this.cellSize && y+dy < height; dy++) {
          for (let dx = 0; dx < this.cellSize && x+dx < width; dx++) {
            const i = ((y+dy)*width+(x+dx))*4
            rSum += copy[i]; gSum += copy[i+1]; bSum += copy[i+2]
            lumSum += (copy[i]*0.299+copy[i+1]*0.587+copy[i+2]*0.114)
            count++
          }
        }
        const lum     = (lumSum/count)/255
        const charIdx = Math.floor((1-lum)*(chars.length-1)*this.intensity)
        const r=rSum/count, g=gSum/count, b=bSum/count
        for (let dy = 0; dy < this.cellSize && y+dy < height; dy++) {
          for (let dx = 0; dx < this.cellSize && x+dx < width; dx++) {
            const i = ((y+dy)*width+(x+dx))*4
            if (charIdx < chars.length/2) {
              data[i]=r; data[i+1]=g; data[i+2]=b
            } else {
              data[i]=255; data[i+1]=255; data[i+2]=255
            }
          }
        }
      }
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(ASCIIFilter, 'ASCIIFilter')

/**
 * Dithering Filter — Retro Digital Quantization.
 * Implements Bayer matrices and Blue Noise for ordered and stochastic dithering.
 */
export class DitheringFilter extends fabric.filters.BaseFilter<'DitheringFilter'> {
  static type = 'Dithering'
  static uniformLocations = ['uMode', 'uOpacity', 'uScale', 'uThreshold']
  
  uMode      = 0.0  // 0: Bayer 4x4, 1: Bayer 8x8, 2: Blue Noise
  uOpacity   = 0.4
  uScale     = 1.0
  uThreshold = 0.5

  constructor(opts?: any) {
    super()
    if (opts?.uMode      !== undefined) this.uMode = opts.uMode
    if (opts?.uOpacity   !== undefined) this.uOpacity = opts.uOpacity
    if (opts?.uScale     !== undefined) this.uScale = opts.uScale
    if (opts?.uThreshold !== undefined) this.uThreshold = opts.uThreshold
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uMode, uOpacity, uScale, uThreshold;

      float bayer4(vec2 p) {
          vec2 pos = floor(mod(p, 4.0));
          float idx = pos.x + pos.y * 4.0;
          if (idx < 1.0) return 0.0/16.0;  if (idx < 2.0) return 8.0/16.0;  if (idx < 3.0) return 2.0/16.0;  if (idx < 4.0) return 10.0/16.0;
          if (idx < 5.0) return 12.0/16.0; if (idx < 6.0) return 4.0/16.0;  if (idx < 7.0) return 14.0/16.0; if (idx < 8.0) return 6.0/16.0;
          if (idx < 9.0) return 3.0/16.0;  if (idx < 10.0) return 11.0/16.0; if (idx < 11.0) return 1.0/16.0;  if (idx < 12.0) return 9.0/16.0;
          if (idx < 13.0) return 15.0/16.0; if (idx < 14.0) return 7.0/16.0; if (idx < 15.0) return 13.0/16.0; return 5.0/16.0;
      }

      float bayer8(vec2 p) {
        vec2 pos = floor(mod(p, 8.0));
        float x = pos.x; float y = pos.y;
        float res = 0.0;
        if (mod(x, 2.0) == 0.0 && mod(y, 2.0) == 0.0) res = bayer4(pos/2.0) * 0.25;
        else if (mod(x, 2.0) == 1.0 && mod(y, 2.0) == 1.0) res = bayer4(pos/2.0) * 0.25 + 0.5;
        else if (mod(x, 2.0) == 1.0 && mod(y, 2.0) == 0.0) res = bayer4(pos/2.0) * 0.25 + 0.75;
        else res = bayer4(pos/2.0) * 0.25 + 0.25;
        return res;
      }

      float blueNoise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
          vec2 uv = vTexCoord;
          vec4 color = texture2D(uTexture, uv);
          if (color.a < 0.01) discard;

          float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          float limit = 0.0;

          // Align with Master Code gl_FragCoord approach
          vec2 p = gl_FragCoord.xy / max(0.1, uScale);

          if (uMode < 0.5) limit = bayer4(p);
          else if (uMode < 1.5) limit = bayer8(p);
          else limit = blueNoise(p);

          // Master Dithering Step
          float dither = step(limit, luma);
          vec3 final = mix(color.rgb, vec3(dither), uOpacity);

          gl_FragColor = vec4(final * color.a, color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uMode,      this.uMode)
    gl.uniform1f(u.uOpacity,   this.uOpacity)
    gl.uniform1f(u.uScale,     this.uScale)
    gl.uniform1f(u.uThreshold, this.uThreshold)
  }
}

// @ts-ignore
fabric.classRegistry.setClass(DitheringFilter, 'Dithering')

/**
 * Threshold — B/W cutoff with soft edge.
 * Designer staple: any luminance > threshold → high color, otherwise → low color.
 */
export class ThresholdFilter extends fabric.filters.BaseFilter<'ThresholdFilter'> {
  static type = 'ThresholdFilter'
  static uniformLocations = ['uThreshold', 'uSoftness', 'uLowColor', 'uHighColor', 'uOpacity']

  uThreshold = 0.5
  uSoftness  = 0.02
  uLowColor  = [0, 0, 0]
  uHighColor = [255, 255, 255]
  uOpacity   = 1.0

  constructor(opts?: any) {
    super()
    if (opts?.uThreshold !== undefined) this.uThreshold = opts.uThreshold
    if (opts?.uSoftness  !== undefined) this.uSoftness  = opts.uSoftness
    if (opts?.uLowColor  !== undefined) this.uLowColor  = opts.uLowColor
    if (opts?.uHighColor !== undefined) this.uHighColor = opts.uHighColor
    if (opts?.uOpacity   !== undefined) this.uOpacity   = opts.uOpacity
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uThreshold, uSoftness, uOpacity;
      uniform vec3 uLowColor, uHighColor;

      void main(){
        vec4 color = texture2D(uTexture, vTexCoord);
        if (color.a < 0.01) discard;
        float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
        float t = smoothstep(uThreshold - uSoftness, uThreshold + uSoftness, luma);
        vec3 mapped = mix(uLowColor / 255.0, uHighColor / 255.0, t);
        vec3 final = mix(color.rgb, mapped, uOpacity);
        gl_FragColor = vec4(final * color.a, color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uThreshold, this.uThreshold)
    gl.uniform1f(u.uSoftness,  this.uSoftness)
    gl.uniform1f(u.uOpacity,   this.uOpacity)
    gl.uniform3fv(u.uLowColor,  new Float32Array(this.uLowColor.map(c => c / 255)))
    gl.uniform3fv(u.uHighColor, new Float32Array(this.uHighColor.map(c => c / 255)))
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const t = this.uThreshold * 255
    const lo = this.uLowColor, hi = this.uHighColor, op = this.uOpacity
    for (let i = 0; i < data.length; i += 4) {
      const luma = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722
      const above = luma > t
      const r = above ? hi[0] : lo[0]
      const g = above ? hi[1] : lo[1]
      const b = above ? hi[2] : lo[2]
      data[i]     = clamp(data[i]     + (r - data[i])     * op)
      data[i + 1] = clamp(data[i + 1] + (g - data[i + 1]) * op)
      data[i + 2] = clamp(data[i + 2] + (b - data[i + 2]) * op)
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(ThresholdFilter, 'ThresholdFilter')

/**
 * Sharpen — Unsharp mask via 3x3 convolution.
 * uAmount drives kernel center weight (1.0 = subtle, 4.0 = harsh).
 */
export class SharpenFilter extends fabric.filters.BaseFilter<'SharpenFilter'> {
  static type = 'SharpenFilter'
  static uniformLocations = ['uAmount', 'uOpacity']

  uAmount  = 1.0
  uOpacity = 1.0

  constructor(opts?: any) {
    super()
    if (opts?.uAmount  !== undefined) this.uAmount  = opts.uAmount
    if (opts?.uOpacity !== undefined) this.uOpacity = opts.uOpacity
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uAmount, uOpacity;

      void main(){
        vec4 c = texture2D(uTexture, vTexCoord);
        if (c.a < 0.01) discard;
        float k = max(uAmount, 0.0);
        vec2 px = vec2(1.0 / 1024.0); // approximation; cache canvases vary, but this gives a stable kernel
        vec3 n  = texture2D(uTexture, vTexCoord + vec2( 0.0, -px.y)).rgb;
        vec3 s  = texture2D(uTexture, vTexCoord + vec2( 0.0,  px.y)).rgb;
        vec3 e  = texture2D(uTexture, vTexCoord + vec2( px.x, 0.0)).rgb;
        vec3 w  = texture2D(uTexture, vTexCoord + vec2(-px.x, 0.0)).rgb;
        vec3 sharpened = c.rgb * (1.0 + 4.0 * k) - (n + s + e + w) * k;
        sharpened = clamp(sharpened, 0.0, 1.0);
        vec3 final = mix(c.rgb, sharpened, uOpacity);
        gl_FragColor = vec4(final * c.a, c.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uAmount,  this.uAmount)
    gl.uniform1f(u.uOpacity, this.uOpacity)
  }

  applyTo2d({ imageData }: any) {
    const { data, width, height } = imageData
    const copy = new Uint8ClampedArray(data)
    const k = this.uAmount, op = this.uOpacity
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4
        for (let ch = 0; ch < 3; ch++) {
          const c = copy[i + ch]
          const n = copy[i - width * 4 + ch]
          const s = copy[i + width * 4 + ch]
          const e = copy[i + 4 + ch]
          const w = copy[i - 4 + ch]
          const sharp = clamp(c * (1 + 4 * k) - (n + s + e + w) * k)
          data[i + ch] = clamp(c + (sharp - c) * op)
        }
      }
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(SharpenFilter, 'SharpenFilter')

/**
 * Gradient Map — Maps luminance to a color gradient.
 * Designer staple for stylization and color grading.
 */
export class GradientMapFilter extends fabric.filters.BaseFilter<'GradientMapFilter'> {
  static type = 'GradientMapFilter'
  static uniformLocations = ['uColor0', 'uColor1', 'uColor2', 'uColor3', 'uColor4', 'uPositions', 'uOpacity']

  uColor0    = [0, 0, 0]
  uColor1    = [60, 0, 80]
  uColor2    = [200, 50, 100]
  uColor3    = [255, 200, 80]
  uColor4    = [255, 255, 255]
  uPositions = [0.0, 0.25, 0.5, 0.75, 1.0]
  uOpacity   = 1.0

  constructor(opts?: any) {
    super()
    if (opts?.uColor0    !== undefined) this.uColor0    = opts.uColor0
    if (opts?.uColor1    !== undefined) this.uColor1    = opts.uColor1
    if (opts?.uColor2    !== undefined) this.uColor2    = opts.uColor2
    if (opts?.uColor3    !== undefined) this.uColor3    = opts.uColor3
    if (opts?.uColor4    !== undefined) this.uColor4    = opts.uColor4
    if (opts?.uPositions !== undefined) this.uPositions = opts.uPositions
    if (opts?.uOpacity   !== undefined) this.uOpacity   = opts.uOpacity
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform vec3 uColor0, uColor1, uColor2, uColor3, uColor4;
      uniform float uPositions[5];
      uniform float uOpacity;

      vec3 sampleGradient(float t) {
        vec3 c0 = uColor0 / 255.0; vec3 c1 = uColor1 / 255.0;
        vec3 c2 = uColor2 / 255.0; vec3 c3 = uColor3 / 255.0;
        vec3 c4 = uColor4 / 255.0;
        if (t <= uPositions[1]) return mix(c0, c1, smoothstep(uPositions[0], uPositions[1], t));
        if (t <= uPositions[2]) return mix(c1, c2, smoothstep(uPositions[1], uPositions[2], t));
        if (t <= uPositions[3]) return mix(c2, c3, smoothstep(uPositions[2], uPositions[3], t));
        return mix(c3, c4, smoothstep(uPositions[3], uPositions[4], t));
      }

      void main(){
        vec4 color = texture2D(uTexture, vTexCoord);
        if (color.a < 0.01) discard;
        float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
        vec3 mapped = sampleGradient(luma);
        vec3 final = mix(color.rgb, mapped, uOpacity);
        gl_FragColor = vec4(final * color.a, color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform3fv(u.uColor0, new Float32Array(this.uColor0.map(c => c / 255)))
    gl.uniform3fv(u.uColor1, new Float32Array(this.uColor1.map(c => c / 255)))
    gl.uniform3fv(u.uColor2, new Float32Array(this.uColor2.map(c => c / 255)))
    gl.uniform3fv(u.uColor3, new Float32Array(this.uColor3.map(c => c / 255)))
    gl.uniform3fv(u.uColor4, new Float32Array(this.uColor4.map(c => c / 255)))
    gl.uniform1fv(u.uPositions, new Float32Array(this.uPositions))
    gl.uniform1f(u.uOpacity, this.uOpacity)
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const colors = [this.uColor0, this.uColor1, this.uColor2, this.uColor3, this.uColor4]
    const pos = this.uPositions, op = this.uOpacity
    function sampleGrad(t: number): [number, number, number] {
      let i = 0
      for (; i < 4; i++) if (t <= pos[i + 1]) break
      const span = Math.max(0.0001, pos[i + 1] - pos[i])
      const f = Math.min(1, Math.max(0, (t - pos[i]) / span))
      const a = colors[i], b = colors[i + 1]
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
    }
    for (let i = 0; i < data.length; i += 4) {
      const luma = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255
      const [r, g, b] = sampleGrad(luma)
      data[i]     = clamp(data[i]     + (r - data[i])     * op)
      data[i + 1] = clamp(data[i + 1] + (g - data[i + 1]) * op)
      data[i + 2] = clamp(data[i + 2] + (b - data[i + 2]) * op)
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(GradientMapFilter, 'GradientMapFilter')

/**
 * Texture Overlay — Procedural texture overlay (paper, canvas, fabric, concrete).
 * Self-contained: doesn't load external textures, generates noise-based patterns
 * to keep the filter offline and fast.
 */
export class TextureOverlayFilter extends fabric.filters.BaseFilter<'TextureOverlayFilter'> {
  static type = 'TextureOverlayFilter'
  static uniformLocations = ['uPattern', 'uScale', 'uIntensity', 'uBlendMode', 'uOpacity']

  // 0 = paper, 1 = canvas, 2 = fabric, 3 = concrete, 4 = scratches
  uPattern   = 0.0
  uScale     = 1.0
  uIntensity = 0.5
  // 0 = multiply, 1 = overlay, 2 = screen, 3 = soft-light
  uBlendMode = 0.0
  uOpacity   = 0.6

  constructor(opts?: any) {
    super()
    if (opts?.uPattern   !== undefined) this.uPattern   = opts.uPattern
    if (opts?.uScale     !== undefined) this.uScale     = opts.uScale
    if (opts?.uIntensity !== undefined) this.uIntensity = opts.uIntensity
    if (opts?.uBlendMode !== undefined) this.uBlendMode = opts.uBlendMode
    if (opts?.uOpacity   !== undefined) this.uOpacity   = opts.uOpacity
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uPattern, uScale, uIntensity, uBlendMode, uOpacity;

      float hashTx(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoiseTx(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        float a = hashTx(i); float b = hashTx(i + vec2(1.0, 0.0));
        float c = hashTx(i + vec2(0.0, 1.0)); float d = hashTx(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      float fbm(vec2 p){
        float v = 0.0; float a = 0.5;
        for(int i = 0; i < 4; i++){ v += a * vnoiseTx(p); p *= 2.13; a *= 0.5; }
        return v;
      }

      vec3 multiply(vec3 b, vec3 t){ return b * t; }
      vec3 screen(vec3 b, vec3 t){ return 1.0 - (1.0 - b) * (1.0 - t); }
      vec3 overlay(vec3 b, vec3 t){
        return mix(2.0 * b * t, 1.0 - 2.0 * (1.0 - b) * (1.0 - t), step(0.5, b));
      }
      vec3 softLight(vec3 b, vec3 t){
        return mix(2.0 * b * t + b * b * (1.0 - 2.0 * t),
                   sqrt(b) * (2.0 * t - 1.0) + 2.0 * b * (1.0 - t),
                   step(0.5, t));
      }

      void main(){
        vec4 color = texture2D(uTexture, vTexCoord);
        if (color.a < 0.01) discard;

        vec2 p = vTexCoord * (200.0 / max(uScale, 0.01));
        float tex = 0.5;
        if (uPattern < 0.5) {
          tex = fbm(p * 0.4) * 0.7 + hashTx(floor(p * 8.0)) * 0.3;
        } else if (uPattern < 1.5) {
          float h = step(0.5, fract(p.x * 0.5)) * 0.1;
          float v = step(0.5, fract(p.y * 0.5)) * 0.1;
          tex = 0.5 + h + v + (fbm(p * 0.5) - 0.5) * 0.3;
        } else if (uPattern < 2.5) {
          tex = sin(p.x * 1.7) * sin(p.y * 1.7) * 0.15 + fbm(p * 0.6) * 0.7 + 0.15;
        } else if (uPattern < 3.5) {
          tex = fbm(p * 0.9) * 0.6 + fbm(p * 4.0) * 0.4;
        } else {
          float scratch = step(0.97, hashTx(vec2(floor(p.y * 0.5), 0.0)));
          tex = mix(0.5, 0.95, scratch) + (fbm(p) - 0.5) * 0.1;
        }
        tex = mix(0.5, tex, uIntensity);

        vec3 t3 = vec3(tex);
        vec3 blended;
        if      (uBlendMode < 0.5) blended = multiply(color.rgb, t3 * 2.0);
        else if (uBlendMode < 1.5) blended = overlay(color.rgb, t3);
        else if (uBlendMode < 2.5) blended = screen(color.rgb, t3);
        else                       blended = softLight(color.rgb, t3);

        vec3 final = mix(color.rgb, blended, uOpacity);
        gl_FragColor = vec4(clamp(final, 0.0, 1.0) * color.a, color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uPattern,   this.uPattern)
    gl.uniform1f(u.uScale,     this.uScale)
    gl.uniform1f(u.uIntensity, this.uIntensity)
    gl.uniform1f(u.uBlendMode, this.uBlendMode)
    gl.uniform1f(u.uOpacity,   this.uOpacity)
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const amp = this.uIntensity * this.uOpacity * 40
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * amp
      data[i]     = clamp(data[i]     + n)
      data[i + 1] = clamp(data[i + 1] + n)
      data[i + 2] = clamp(data[i + 2] + n)
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(TextureOverlayFilter, 'TextureOverlayFilter')
