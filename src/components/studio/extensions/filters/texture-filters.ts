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
 * Halftone — WebGL dot-grid with luminance-driven dot radius.
 */
export class EliteHalftone extends fabric.filters.BaseFilter<'EliteHalftone'> {
  static type = 'EliteHalftone'
  static uniformLocations = ['uSize', 'uIntensity']
  uSize      = 10.0
  uIntensity = 0.5

  constructor(opts?: any) {
    super()
    if (opts?.uSize !== undefined) this.uSize = opts.uSize
    if (opts?.uIntensity !== undefined) this.uIntensity = opts.uIntensity
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uSize;
      uniform float uIntensity;
      void main(){
        vec2 uv=vTexCoord;
        float cs=uSize*0.010;
        vec2 cell=floor(uv/cs)*cs+cs*0.5;
        vec4 cc=texture2D(uTexture,clamp(cell,0.0,1.0));
        float cl=dot(cc.rgb,vec3(0.299,0.587,0.114));
        vec2 grid=(uv-cell)/cs;
        float dist=length(grid);
        float radius=(1.0-cl)*0.52*uIntensity;
        float mask=smoothstep(radius+0.025,radius-0.025,dist);
        vec3 final=mix(vec3(1.0),cc.rgb,mask);
        gl_FragColor=vec4(final,texture2D(uTexture,uv).a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uSize, this.uSize)
    gl.uniform1f(u.uIntensity, this.uIntensity)
  }

  applyTo2d({ imageData }: any) {
    const { data, width, height } = imageData
    const cell = Math.max(2, Math.round(this.uSize))
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        const cx = Math.min(x + Math.floor(cell/2), width-1)
        const cy = Math.min(y + Math.floor(cell/2), height-1)
        const ci = (cy * width + cx) * 4
        const lum = (data[ci]*0.299 + data[ci+1]*0.587 + data[ci+2]*0.114) / 255
        const radius = (1 - lum) * (cell/2) * this.uIntensity
        for (let dy = 0; dy < cell && y+dy < height; dy++) {
          for (let dx = 0; dx < cell && x+dx < width; dx++) {
            const i    = ((y+dy) * width + (x+dx)) * 4
            const dist = Math.sqrt((dx-cell/2)**2 + (dy-cell/2)**2)
            if (dist < radius) {
              data[i]=data[ci]; data[i+1]=data[ci+1]; data[i+2]=data[ci+2]
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
