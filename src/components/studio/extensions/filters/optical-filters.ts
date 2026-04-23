import * as fabric from 'fabric'
import { clamp } from './shared-utils'

/**
 * Thermal 2.0 — Heat Pulse Edition.
 */
export class ThermalFilter extends fabric.filters.BaseFilter<'ThermalFilter'> {
  static type = 'ThermalFilter'
  static uniformLocations = ['uIntensity', 'uShift', 'uHaze', 'uThreshold', 'uTime']
  
  uIntensity = 1.0
  uShift     = 0.0
  uHaze      = 0.6
  uThreshold = 1.0
  uTime      = 0.0

  constructor(opts?: any) {
    super()
    if (opts?.uIntensity !== undefined) this.uIntensity = opts.uIntensity
    if (opts?.uShift     !== undefined) this.uShift     = opts.uShift
    if (opts?.uHaze      !== undefined) this.uHaze      = opts.uHaze
    if (opts?.uThreshold !== undefined) this.uThreshold = opts.uThreshold
    if (opts?.uTime      !== undefined) this.uTime      = opts.uTime
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uIntensity, uShift, uHaze, uThreshold, uTime;

      vec3 thermal_ramp(float t) {
          t = clamp(t, 0.0, 1.0);
          vec3 col = mix(vec3(0.0, 0.0, 0.2), vec3(0.0, 0.0, 1.0), smoothstep(0.0, 0.15, t));
          col = mix(col, vec3(0.0, 1.0, 1.0), smoothstep(0.15, 0.35, t));
          col = mix(col, vec3(0.0, 1.0, 0.0), smoothstep(0.35, 0.55, t));
          col = mix(col, vec3(1.0, 1.0, 0.0), smoothstep(0.55, 0.70, t));
          col = mix(col, vec3(1.0, 0.3, 0.0), smoothstep(0.70, 0.85, t));
          col = mix(col, vec3(1.0, 1.0, 1.0), smoothstep(0.85, 1.0, t));
          return col;
      }

      void main(){
        vec2 uv = vTexCoord;
        vec4 sampleColor = texture2D(uTexture, uv);
        float luma_ref = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
        
        float shimmer = sin(uv.x * 25.0 + uTime * 6.0) * 0.004 * uHaze * luma_ref;
        vec2 distortedUV = uv + vec2(0.0, shimmer);
        
        vec4 color = texture2D(uTexture, distortedUV);
        if (color.a < 0.01) discard;

        float luma = clamp((dot(color.rgb, vec3(0.299, 0.587, 0.114)) + uShift) * uThreshold, 0.0, 1.0);
        vec3 therm = thermal_ramp(luma);

        vec3 result = mix(color.rgb, therm, uIntensity);
        float glow = smoothstep(0.88, 1.0, luma) * 0.25 * uIntensity;
        result += vec3(glow);

        gl_FragColor = vec4(result * color.a, color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uIntensity, this.uIntensity)
    gl.uniform1f(u.uShift,     this.uShift)
    gl.uniform1f(u.uHaze,      this.uHaze)
    gl.uniform1f(u.uThreshold, this.uThreshold)
    gl.uniform1f(u.uTime,      this.uTime)
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const stops  = [[0,0,51],[0,0,255],[0,255,255],[0,230,0],[255,255,0],[255,51,0],[255,255,255]]
    const breaks = [0, 0.15, 0.35, 0.55, 0.70, 0.85, 1.0]
    for (let i = 0; i < data.length; i += 4) {
      const l = Math.min(1, Math.max(0, (data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114) / 255 + this.uShift))
      let si = 0
      while (si < breaks.length - 2 && l > breaks[si + 1]) si++
      const t   = (l - breaks[si]) / (breaks[si + 1] - breaks[si])
      const [r1,g1,b1] = stops[si]
      const [r2,g2,b2] = stops[si + 1]
      const tr = r1 + (r2-r1)*t, tg = g1 + (g2-g1)*t, tb = b1 + (b2-b1)*t
      data[i]   = data[i]   * (1-this.uIntensity) + tr * this.uIntensity
      data[i+1] = data[i+1] * (1-this.uIntensity) + tg * this.uIntensity
      data[i+2] = data[i+2] * (1-this.uIntensity) + tb * this.uIntensity
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(ThermalFilter, 'ThermalFilter')

/**
 * Prism 2.0 — Glass Spectral Edition.
 */
export class PrismFilter extends fabric.filters.BaseFilter<'PrismFilter'> {
  static type = 'PrismFilter'
  static uniformLocations = ['uDispersion', 'uDistortion', 'uRadius']
  
  uDispersion = 0.5
  uDistortion = 0.4
  uRadius     = 1.0

  constructor(opts?: any) {
    super()
    if (opts?.uDispersion !== undefined) this.uDispersion = opts.uDispersion
    if (opts?.uDistortion !== undefined) this.uDistortion = opts.uDistortion
    if (opts?.uRadius     !== undefined) this.uRadius     = opts.uRadius
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uDispersion, uDistortion, uRadius;

      void main(){
        vec2 uv = vTexCoord;
        vec2 dir = uv - 0.5;
        float d = length(dir);
        
        vec2 distortedUV = uv + dir * (d * d) * uDistortion * uRadius;
        
        vec3 result = vec3(0.0);
        float totalWeight = 0.0;
        vec2 aberr = dir * uDispersion * 0.06;
        
        for(float i=0.0; i<5.0; i++) {
            float offset = (i / 4.0) - 0.5;
            vec4 s = texture2D(uTexture, clamp(distortedUV + aberr * offset, 0.001, 0.999));
            vec3 tint = vec3(
                max(0.0, 1.0 - abs(offset - 0.5) * 4.0), 
                max(0.0, 1.0 - abs(offset - 0.0) * 4.0), 
                max(0.0, 1.0 - abs(offset + 0.5) * 4.0)
            );
            result += s.rgb * tint;
            totalWeight += (tint.r + tint.g + tint.b) / 3.0;
        }
        
        result /= (totalWeight * 0.9);
        float fresnel = pow(d * 1.6, 5.0) * 0.15 * uDispersion;
        result += vec3(fresnel);

        vec4 orig = texture2D(uTexture, uv);
        gl_FragColor = vec4(clamp(result, 0.0, 1.0) * orig.a, orig.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uDispersion, this.uDispersion)
    gl.uniform1f(u.uDistortion, this.uDistortion)
    gl.uniform1f(u.uRadius,     this.uRadius)
  }

  applyTo2d({ imageData }: any) {
    const { data, width, height } = imageData
    const copy  = new Uint8ClampedArray(data)
    const shift = Math.round(this.uDispersion * 10)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i    = (y * width + x) * 4
        const rIdx = (y * width + Math.max(0, x - shift)) * 4
        const bIdx = (y * width + Math.min(width - 1, x + shift)) * 4
        data[i]     = copy[rIdx]
        data[i + 2] = copy[bIdx]
      }
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(PrismFilter, 'PrismFilter')

/**
 * Neon Glow 2.0 — Cyber-Emissive Edition.
 */
export class NeonGlowFilter extends fabric.filters.BaseFilter<'NeonGlowFilter'> {
  static type = 'NeonGlow'
  static uniformLocations = ['uIntensity', 'uGlowRange', 'uFlicker', 'uTime', 'uGlowTint']
  
  uIntensity  = 0.8
  uGlowRange  = 1.5
  uFlicker    = 0.4
  uTime       = 0.0
  uGlowTint   = [0, 255, 255]

  constructor(opts?: any) {
    super()
    if (opts?.uIntensity !== undefined) this.uIntensity = opts.uIntensity
    if (opts?.uGlowRange !== undefined) this.uGlowRange = opts.uGlowRange
    if (opts?.uFlicker   !== undefined) this.uFlicker   = opts.uFlicker
    if (opts?.uTime      !== undefined) this.uTime      = opts.uTime
    if (opts?.uGlowTint  !== undefined) this.uGlowTint  = opts.uGlowTint
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uIntensity, uGlowRange, uFlicker, uTime;
      uniform vec3 uGlowTint;

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        
        vec3 glow = vec3(0.0);
        float noise = fract(sin(dot(uv, vec2(12.989, 78.233))) * 43758.5453 + uTime);
        
        float r = uGlowRange * 0.015;
        for(int i=0; i<8; i++){
          float angle = float(i) * 0.785398 + noise;
          vec2 off = vec2(cos(angle), sin(angle)) * r;
          vec4 s = texture2D(uTexture, clamp(uv + off, 0.0, 1.0));
          float d = length(off) * 60.0;
          float decay = 1.0 / (1.0 + d * d);
          float b = dot(s.rgb, vec3(0.299, 0.587, 0.114));
          glow += s.rgb * s.a * decay * smoothstep(0.1, 0.9, b);
        }
        glow /= 8.0;

        float hum = 1.0 + sin(uTime * 25.0 * uFlicker) * 0.04 * uFlicker;
        vec3 tint = uGlowTint / 255.0;
        vec3 spectralGlow = mix(tint, vec3(1.0, 1.0, 1.0), 0.2); 
        vec3 finalGlow = glow * spectralGlow * uIntensity * 12.0 * hum;
        vec3 core = color.rgb * (1.0 + uIntensity * 0.6);
        vec3 result = core + finalGlow;

        gl_FragColor = vec4(clamp(result, 0.0, 1.0) * color.a, color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uIntensity,  this.uIntensity)
    gl.uniform1f(u.uGlowRange,  this.uGlowRange)
    gl.uniform1f(u.uFlicker,    this.uFlicker)
    gl.uniform1f(u.uTime,       this.uTime)
    gl.uniform3fv(u.uGlowTint,  new Float32Array(this.uGlowTint.map(c => c/255)))
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const boost = this.uIntensity * 60
    for (let i = 0; i < data.length; i += 4) {
      const lum = (data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114) / 255
      data[i]   = Math.min(255, data[i]   + boost * (1 - lum))
      data[i+1] = Math.min(255, data[i+1] + boost * (1 - lum))
      data[i+2] = Math.min(255, data[i+2] + boost * (1 - lum))
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(NeonGlowFilter, 'NeonGlow')

/**
 * Holographic 2.0 — Iridescent Projection Edition.
 */
export class HolographicFilter extends fabric.filters.BaseFilter<'HolographicFilter'> {
  static type = 'Holographic'
  static uniformLocations = ['uThickness', 'uIridescence', 'uGlow', 'uTime', 'uScanlineSpeed', 'uBaseTint']
  
  uThickness      = 1.5
  uIridescence    = 0.6
  uGlow           = 0.5
  uTime           = 0.0
  uScanlineSpeed  = 1.0
  uBaseTint       = [150, 220, 255]

  constructor(opts?: any) {
    super()
    if (opts?.uThickness !== undefined)      this.uThickness     = opts.uThickness
    if (opts?.uIridescence !== undefined)    this.uIridescence   = opts.uIridescence
    if (opts?.uGlow !== undefined)           this.uGlow          = opts.uGlow
    if (opts?.uTime !== undefined)           this.uTime          = opts.uTime
    if (opts?.uScanlineSpeed !== undefined)  this.uScanlineSpeed = opts.uScanlineSpeed
    if (opts?.uBaseTint !== undefined)       this.uBaseTint      = opts.uBaseTint
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uThickness, uIridescence, uGlow, uTime, uScanlineSpeed;
      uniform vec3 uBaseTint;

      vec3 irid_spectra(float delta) {
          vec3 col = vec3(0.5) + 0.5 * cos(6.28318 * (vec3(1.0, 0.66, 0.33) + delta));
          return clamp(col, 0.0, 1.0);
      }

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        if (color.a < 0.01) discard;

        vec2 dist = uv - 0.5;
        float l = length(dist);
        float fresnel = pow(l * 1.8, 3.5) * uGlow;
        
        float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
        float phase = l * uThickness + noise * 0.06 + uTime * 0.12;
        vec3 irid = irid_spectra(phase) * uIridescence;

        float scan = sin(uv.y * 130.0 - uTime * 22.0 * uScanlineSpeed) * 0.06 * uIridescence;
        float flicker = step(0.992, fract(sin(uTime * 12.0))) * 0.12;
        
        vec3 tint = uBaseTint / 255.0;
        vec3 base = color.rgb * tint;
        vec3 final = base + irid + vec3(scan + flicker) + vec3(fresnel * 0.5);
        float alpha = color.a * (0.8 + fresnel * 0.5);
        
        gl_FragColor = vec4(clamp(final, 0.0, 1.0) * alpha, alpha);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uThickness,     this.uThickness)
    gl.uniform1f(u.uIridescence,   this.uIridescence)
    gl.uniform1f(u.uGlow,          this.uGlow)
    gl.uniform1f(u.uTime,          this.uTime)
    gl.uniform1f(u.uScanlineSpeed, this.uScanlineSpeed)
    gl.uniform3fv(u.uBaseTint,     new Float32Array(this.uBaseTint.map(c => c/255)))
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const iri = this.uIridescence * 0.3
    for (let i = 0; i < data.length; i += 4) {
      const lum = (data[i] + data[i+1] + data[i+2])/3
      data[i]   = clamp(data[i]   + (Math.sin(lum * 0.1) * 255) * iri)
      data[i+1] = clamp(data[i+1] + (Math.cos(lum * 0.1) * 255) * iri)
      data[i+2] = clamp(data[i+2] + 255 * iri)
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(HolographicFilter, 'Holographic')

/**
 * Bloom 3.0 — High-Dynamic Cinematic Diffusion.
 * Features a soft-knee curve and highlight drive for physically accurate light bleeding.
 */
export class BloomFilter extends fabric.filters.BaseFilter<'BloomFilter'> {
  static type = 'BloomFilter'
  static uniformLocations = ['uThreshold', 'uStrength', 'uRadius', 'uSoftness', 'uHighlightDrive', 'uTime', 'uGlowTint']
  
  uThreshold      = 0.5
  uStrength       = 0.8
  uRadius         = 1.5
  uSoftness       = 0.2
  uHighlightDrive = 1.2
  uTime           = 0.0
  uGlowTint       = [255, 255, 255]

  constructor(opts?: any) {
    super()
    if (opts?.uThreshold      !== undefined) this.uThreshold      = opts.uThreshold
    if (opts?.uStrength       !== undefined) this.uStrength       = opts.uStrength
    if (opts?.uRadius         !== undefined) this.uRadius         = opts.uRadius
    if (opts?.uSoftness       !== undefined) this.uSoftness       = opts.uSoftness
    if (opts?.uHighlightDrive !== undefined) this.uHighlightDrive = opts.uHighlightDrive
    if (opts?.uTime           !== undefined) this.uTime           = opts.uTime
    if (opts?.uGlowTint       !== undefined) this.uGlowTint       = opts.uGlowTint
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uThreshold, uStrength, uRadius, uSoftness, uHighlightDrive, uTime;
      uniform vec3 uGlowTint;

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        
        float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
        
        // Cinematic Soft Knee curve (Professional Grade)
        float knee = max(0.01, uSoftness);
        float soft = luma - uThreshold + knee;
        soft = clamp(soft, 0.0, 2.0 * knee);
        soft = soft * soft / (4.0 * knee);
        float brightness = max(soft, luma - uThreshold);
        brightness *= uHighlightDrive;

        vec3 glow = vec3(0.0);
        float noise = fract(sin(dot(uv, vec2(12.9, 78.2))) * 43758.5 + uTime);
        
        float r = uRadius * 0.015;
        // Multi-tap approximation for high-fidelity bleed
        for(int i=0; i<8; i++){
          float angle = float(i) * 0.785;
          vec2 off = vec2(cos(angle), sin(angle)) * r;
          vec4 s = texture2D(uTexture, clamp(uv + off, 0.001, 0.999));
          float sl = dot(s.rgb, vec3(0.21, 0.71, 0.07));
          glow += s.rgb * smoothstep(uThreshold - knee, uThreshold + knee, sl);
        }
        glow /= 8.0;

        // Subtle electric flicker as seen in Shader Lab
        float flicker = 1.0 + sin(uTime * 40.0) * 0.02;
        
        vec3 tint = uGlowTint / 255.0;
        vec3 finalGlow = glow * tint * uStrength * 6.0 * brightness * flicker;
        vec3 finalColor = color.rgb + finalGlow;
        
        gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0) * color.a, color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uThreshold,      this.uThreshold)
    gl.uniform1f(u.uStrength,       this.uStrength)
    gl.uniform1f(u.uRadius,         this.uRadius)
    gl.uniform1f(u.uSoftness,       this.uSoftness)
    gl.uniform1f(u.uHighlightDrive, this.uHighlightDrive)
    gl.uniform1f(u.uTime,           this.uTime)
    gl.uniform3fv(u.uGlowTint,      new Float32Array(this.uGlowTint.map(c => c/255)))
  }
}
// @ts-ignore
fabric.classRegistry.setClass(BloomFilter, 'BloomFilter')

/**
 * Pixelate 2.0 — Retro-Mod Mosaic.
 */
export class PixelateFilter extends fabric.filters.BaseFilter<'PixelateFilter'> {
  static type = 'PixelateFilter'
  static uniformLocations = ['uBlockSize', 'uGridMode', 'uDither', 'uBevel']
  
  uBlockSize = 8.0
  uGridMode  = 0.0
  uDither    = 0.4
  uBevel     = 0.5

  constructor(opts?: any) {
    super()
    if (opts?.uBlockSize !== undefined) this.uBlockSize = opts.uBlockSize
    if (opts?.uGridMode !== undefined)  this.uGridMode  = opts.uGridMode
    if (opts?.uDither !== undefined)    this.uDither    = opts.uDither
    if (opts?.uBevel !== undefined)     this.uBevel     = opts.uBevel
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uBlockSize, uGridMode, uDither, uBevel;

      float bayer4(vec2 p) {
          vec2 pos = mod(floor(p), 4.0);
          float idx = pos.x + pos.y * 4.0;
          if (idx < 1.0) return 0.0/16.0;  if (idx < 2.0) return 8.0/16.0;  if (idx < 3.0) return 2.0/16.0;  if (idx < 4.0) return 10.0/16.0;
          if (idx < 5.0) return 12.0/16.0; if (idx < 6.0) return 4.0/16.0;  if (idx < 7.0) return 14.0/16.0; if (idx < 8.0) return 6.0/16.0;
          if (idx < 9.0) return 3.0/16.0;  if (idx < 10.0) return 11.0/16.0; if (idx < 11.0) return 1.0/16.0;  if (idx < 12.0) return 9.0/16.0;
          if (idx < 13.0) return 15.0/16.0; if (idx < 14.0) return 7.0/16.0; if (idx < 15.0) return 13.0/16.0; return 5.0/16.0;
      }

      void main(){
        vec2 uv = vTexCoord;
        float res = 280.0 / max(uBlockSize, 1.0);
        vec2 gridUV = uv;
        
        if (uGridMode > 0.5 && uGridMode < 1.5) {
          gridUV.x += step(1.0, mod(uv.y * res * 0.866, 2.0)) * (0.5 / res);
        } else if (uGridMode >= 1.5) {
          gridUV.x += step(1.0, mod(uv.y * res, 2.0)) * (0.5 / res);
        }

        vec2 block = floor(gridUV * res + 0.5) / res;
        vec4 color = texture2D(uTexture, block);
        if (color.a < 0.01) discard;

        vec2 f = fract(gridUV * res);
        float bevel = smoothstep(0.0, 0.15, f.x) * smoothstep(1.0, 0.85, f.x) *
                      smoothstep(0.0, 0.15, f.y) * smoothstep(1.0, 0.85, f.y);
        vec3 col = color.rgb;
        col *= (0.9 + bevel * 0.15 * uBevel);
        
        float threshold = bayer4(uv * 1024.0);
        float dither = (threshold - 0.5) * uDither * 0.2;
        col = clamp(col + dither, 0.0, 1.0);

        float mask = texture2D(uTexture, uv).a;
        gl_FragColor = vec4(col * mask, mask);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uBlockSize, this.uBlockSize)
    gl.uniform1f(u.uGridMode,  this.uGridMode)
    gl.uniform1f(u.uDither,    this.uDither)
    gl.uniform1f(u.uBevel,     this.uBevel)
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const ps = Math.max(2, Math.round(this.uBlockSize))
    for (let x = 0; x < imageData.width; x += ps) {
      for (let y = 0; y < imageData.height; y += ps) {
        const i = (y * imageData.width + x) * 4
        const r=data[i], g=data[i+1], b=data[i+2], a=data[i+3]
        for (let dx=0; dx<ps; dx++) {
          for (let dy=0; dy<ps; dy++) {
            const ni = ((y+dy)*imageData.width + (x+dx)) * 4
            if (ni < data.length) {
              data[ni]=r; data[ni+1]=g; data[ni+2]=b; data[ni+3]=a
            }
          }
        }
      }
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(PixelateFilter, 'PixelateFilter')
