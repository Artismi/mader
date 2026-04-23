import * as fabric from 'fabric'
import { clamp } from './shared-utils'

/**
 * Risograph 2.0 — Mechanical Plate Edition.
 */
export class Risograph extends fabric.filters.BaseFilter<'Risograph'> {
  static type = 'Risograph'
  static uniformLocations = ['uDotSize', 'uMisregistration', 'uDotGain', 'uInk1', 'uInk2', 'uPaperColor']
  
  uDotSize         = 1.0
  uMisregistration = 0.2
  uDotGain         = 0.15
  uInk1            = [255, 0, 150]
  uInk2            = [0, 80, 255]
  uPaperColor      = [250, 248, 240]

  constructor(opts?: any) {
    super()
    if (opts?.uDotSize !== undefined)         this.uDotSize = opts.uDotSize
    if (opts?.uMisregistration !== undefined) this.uMisregistration = opts.uMisregistration
    if (opts?.uDotGain !== undefined)         this.uDotGain = opts.uDotGain
    if (opts?.uInk1 !== undefined)            this.uInk1 = opts.uInk1
    if (opts?.uInk2 !== undefined)            this.uInk2 = opts.uInk2
    if (opts?.uPaperColor !== undefined)      this.uPaperColor = opts.uPaperColor
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uDotSize, uMisregistration, uDotGain;
      uniform vec3 uInk1, uInk2, uPaperColor;

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        if (color.a < 0.01) discard;

        float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        float plate1 = smoothstep(0.35, 0.9, luma);         
        float plate2 = smoothstep(0.0, 0.55, 1.0 - luma);   

        vec2 off1 = vec2(0.0018 * uMisregistration, 0.0);
        vec2 off2 = vec2(-0.0012 * uMisregistration, 0.0008 * uMisregistration);
        
        float angle1 = 0.26; float angle2 = 1.30;
        mat2 rot1 = mat2(cos(angle1), -sin(angle1), sin(angle1), cos(angle1));
        mat2 rot2 = mat2(cos(angle2), -sin(angle2), sin(angle2), cos(angle2));
        
        vec2 st1 = rot1 * (uv + off1) * (140.0 / max(uDotSize, 0.1));
        vec2 st2 = rot2 * (uv + off2) * (120.0 / max(uDotSize, 0.1)); 
        
        float dist1 = length(fract(st1) - 0.5);
        float dist2 = length(fract(st2) - 0.5);

        float size1 = (1.0 - plate1) * 0.7 + uDotGain * 0.3;
        float size2 = plate2 * 0.7 + uDotGain * 0.3;
        
        float mask1 = 1.0 - smoothstep(size1 - 0.1, size1 + 0.1, dist1);
        float mask2 = 1.0 - smoothstep(size2 - 0.1, size2 + 0.1, dist2);

        vec3 paper = uPaperColor / 255.0;
        vec3 i1    = uInk1 / 255.0;
        vec3 i2    = uInk2 / 255.0;
        
        vec3 result = paper;
        result = mix(result, result * i1, mask1);
        result = mix(result, result * i2, mask2);
        
        gl_FragColor = vec4(result * color.a, color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uDotSize,         this.uDotSize)
    gl.uniform1f(u.uMisregistration, this.uMisregistration)
    gl.uniform1f(u.uDotGain,         this.uDotGain)
    gl.uniform3fv(u.uInk1,           new Float32Array(this.uInk1.map(c => c/255)))
    gl.uniform3fv(u.uInk2,           new Float32Array(this.uInk2.map(c => c/255)))
    gl.uniform3fv(u.uPaperColor,     new Float32Array(this.uPaperColor.map(c => c/255)))
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const i1 = this.uInk1, i2 = this.uInk2, p = this.uPaperColor
    for (let i = 0; i < data.length; i += 4) {
      const l = (data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114) / 255
      const mixVal = Math.floor(l * 2) / 2
      if (mixVal > 0.6) {
        data[i]=p[0]; data[i+1]=p[1]; data[i+2]=p[2]
      } else if (mixVal > 0.3) {
        data[i]=i1[0]; data[i+1]=i1[1]; data[i+2]=i1[2]
      } else {
        data[i]=i2[0]; data[i+1]=i2[1]; data[i+2]=i2[2]
      }
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(Risograph, 'Risograph')

/**
 * Elite Clay 2.0 — Maximum Premium Edition.
 */
export class EliteClay extends fabric.filters.BaseFilter<'EliteClay'> {
  static type = 'EliteClay'
  static uniformLocations = ['uInflate', 'uGlow', 'uMatte', 'uLightAngle', 'uTranslucency']
  uInflate     = 0.5
  uGlow        = 0.35
  uMatte       = 0.2
  uLightAngle  = 135.0
  uTranslucency = 0.4

  constructor(opts?: any) {
    super()
    if (opts?.uInflate !== undefined)     this.uInflate     = opts.uInflate
    if (opts?.uGlow !== undefined)        this.uGlow        = opts.uGlow
    if (opts?.uMatte !== undefined)       this.uMatte       = opts.uMatte
    if (opts?.uLightAngle !== undefined)  this.uLightAngle  = opts.uLightAngle
    if (opts?.uTranslucency !== undefined) this.uTranslucency = opts.uTranslucency
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uInflate, uGlow, uMatte, uLightAngle, uTranslucency;

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        if (color.a < 0.01) discard;

        float s = 0.002 + (uInflate * 0.012); float s2 = s * 2.5;
        float aT = texture2D(uTexture, uv + vec2(0.0, s)).a;
        float aB = texture2D(uTexture, uv + vec2(0.0, -s)).a;
        float aL = texture2D(uTexture, uv + vec2(-s, 0.0)).a;
        float aR = texture2D(uTexture, uv + vec2(s, 0.0)).a;
        float aT2 = texture2D(uTexture, uv + vec2(0.0, s2)).a;
        float aB2 = texture2D(uTexture, uv + vec2(0.0, -s2)).a;
        float aL2 = texture2D(uTexture, uv + vec2(-s2, 0.0)).a;
        float aR2 = texture2D(uTexture, uv + vec2(s2, 0.0)).a;
        
        float dX = mix(aL - aR, aL2 - aR2, 0.6);
        float dY = mix(aB - aT, aB2 - aT2, 0.6);
        vec3 normal = normalize(vec3(dX, dY, 0.55 / max(uInflate, 0.05)));
        float thickness = smoothstep(0.0, 0.8, 1.0 - (abs(aL - aR) + abs(aT - aB)));

        float rad = uLightAngle * 0.0174533;
        vec3 L = normalize(vec3(cos(rad), sin(rad), 1.0));
        vec3 V = vec3(0.0, 0.0, 1.0); vec3 H = normalize(L + V);
        
        float wrap = 0.4;
        float diff = max(0.0, (dot(normal, L) + wrap) / (1.0 + wrap));
        float sss = pow(max(0.0, dot(V, -L)), 3.0) * (1.0 - thickness) * uTranslucency * 2.1;
        float saturationBoost = smoothstep(0.3, 0.7, diff) * (1.0 - diff) * uMatte * 2.2;

        float specSharp = pow(max(dot(normal, H), 0.0), 64.0) * uGlow * 1.8;
        float specSoft  = pow(max(dot(normal, H), 0.0), 12.0) * uGlow * 0.5;
        
        vec3 base = color.rgb;
        base = mix(base, base * vec3(1.15, 0.85, 0.75), saturationBoost);
        vec3 final = base * (0.32 + 0.68 * diff) + (sss * vec3(1.0, 0.25, 0.1)) + (specSharp + specSoft);
        
        float grain = (fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * uMatte * 0.14;
        final += grain;

        gl_FragColor = vec4(clamp(final, 0.0, 1.0) * color.a, color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uInflate,     this.uInflate)
    gl.uniform1f(u.uGlow,        this.uGlow)
    gl.uniform1f(u.uMatte,       this.uMatte)
    gl.uniform1f(u.uLightAngle,  this.uLightAngle)
    gl.uniform1f(u.uTranslucency, this.uTranslucency)
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const glow = this.uGlow * 45; const mat = this.uMatte * 18
    for (let i = 0; i < data.length; i += 4) {
      const g = (Math.random() - 0.5) * mat
      data[i]   = clamp(data[i]   + glow + g)
      data[i+1] = clamp(data[i+1] + glow * 0.85 + g)
      data[i+2] = clamp(data[i+2] + glow * 0.75 + g)
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(EliteClay, 'EliteClay')

/**
 * Oil Paint — Simplified Kuwahara Quadrant Engine.
 */
export class OilPaintFilter extends fabric.filters.BaseFilter<'OilPaintFilter'> {
  static type = 'OilPaint'
  static uniformLocations = ['uRadius', 'uImpasto', 'uCoherence', 'uIntensity']
  
  uRadius    = 4.0
  uImpasto   = 0.5
  uCoherence = 0.8
  uIntensity = 1.0

  constructor(opts?: any) {
    super()
    if (opts?.uRadius    !== undefined) this.uRadius    = opts.uRadius
    if (opts?.uImpasto   !== undefined) this.uImpasto   = opts.uImpasto
    if (opts?.uCoherence !== undefined) this.uCoherence = opts.uCoherence
    if (opts?.uIntensity !== undefined) this.uIntensity = opts.uIntensity
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uRadius, uImpasto, uCoherence, uIntensity;

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        float r = uRadius * 0.005;
        vec2 off[8];
        off[0]=vec2(-r,-r); off[1]=vec2(0.0,-r); off[2]=vec2(r,-r);  off[3]=vec2(r,0.0);
        off[4]=vec2(r,r);   off[5]=vec2(0.0,r);  off[6]=vec2(-r,r);  off[7]=vec2(-r,0.0);
        
        vec3 q0 = (texture2D(uTexture, clamp(uv + off[0], 0.0, 1.0)).rgb + texture2D(uTexture, clamp(uv + off[1], 0.0, 1.0)).rgb) * 0.5;
        vec3 q1 = (texture2D(uTexture, clamp(uv + off[2], 0.0, 1.0)).rgb + texture2D(uTexture, clamp(uv + off[3], 0.0, 1.0)).rgb) * 0.5;
        vec3 q2 = (texture2D(uTexture, clamp(uv + off[4], 0.0, 1.0)).rgb + texture2D(uTexture, clamp(uv + off[5], 0.0, 1.0)).rgb) * 0.5;
        vec3 q3 = (texture2D(uTexture, clamp(uv + off[6], 0.0, 1.0)).rgb + texture2D(uTexture, clamp(uv + off[7], 0.0, 1.0)).rgb) * 0.5;

        float d0 = length(q0 - color.rgb); float d1 = length(q1 - color.rgb);
        float d2 = length(q2 - color.rgb); float d3 = length(q3 - color.rgb);
        
        vec3 best = q0; float minD = d0;
        if(d1 < minD) { best = q1; minD = d1; }
        if(d2 < minD) { best = q2; minD = d2; }
        if(d3 < minD) { best = q3; minD = d3; }

        float hL = dot(texture2D(uTexture, uv + vec2(-0.002, 0.0)).rgb, vec3(0.33));
        float hR = dot(texture2D(uTexture, uv + vec2( 0.002, 0.0)).rgb, vec3(0.33));
        float hT = dot(texture2D(uTexture, uv + vec2( 0.0, -0.002)).rgb, vec3(0.33));
        float hB = dot(texture2D(uTexture, uv + vec2( 0.0,  0.002)).rgb, vec3(0.33));
        float hL2 = dot(texture2D(uTexture, uv + vec2(-0.006, 0.0)).rgb, vec3(0.33));
        float hR2 = dot(texture2D(uTexture, uv + vec2( 0.006, 0.0)).rgb, vec3(0.33));
        float hT2 = dot(texture2D(uTexture, uv + vec2( 0.0, -0.006)).rgb, vec3(0.33));
        float hB2 = dot(texture2D(uTexture, uv + vec2( 0.0,  0.006)).rgb, vec3(0.33));
        
        vec3 normal = normalize(vec3(mix(hL - hR, hL2 - hR2, 0.5), mix(hT - hB, hT2 - hB2, 0.5), 0.2 / max(0.01, uImpasto)));
        float diff = max(0.0, dot(normal, normalize(vec3(1.0, 1.0, 1.2))));
        
        vec3 paint = mix(color.rgb, best, uCoherence);
        vec3 shaded = paint * (0.85 + diff * 0.35);
        shaded += fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453) * 0.05 * uImpasto;

        gl_FragColor = vec4(mix(color.rgb, shaded, uIntensity) * color.a, color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uRadius,    this.uRadius)
    gl.uniform1f(u.uImpasto,   this.uImpasto)
    gl.uniform1f(u.uCoherence, this.uCoherence)
    gl.uniform1f(u.uIntensity, this.uIntensity)
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    for (let i = 0; i < data.length; i += 4) {
      data[i]   = clamp(data[i]   * (1 + this.uImpasto * 0.2))
      data[i+1] = clamp(data[i+1] * (1 + this.uImpasto * 0.2))
      data[i+2] = clamp(data[i+2] * (1 + this.uImpasto * 0.2))
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(OilPaintFilter, 'OilPaint')

/**
 * Outline 2.0 — Dynamic Silhouette Edition.
 */
export class OutlineFilter extends fabric.filters.BaseFilter<'OutlineFilter'> {
  static type = 'OutlineFilter'
  static uniformLocations = ['uThickness', 'uSoftness', 'uInnerGlow', 'uOutlineColor']
  
  uThickness    = 2.0
  uSoftness     = 0.1
  uInnerGlow    = 0.4
  uOutlineColor = [255, 255, 255]

  constructor(opts?: any) {
    super()
    if (opts?.uThickness    !== undefined) this.uThickness    = opts.uThickness
    if (opts?.uSoftness     !== undefined) this.uSoftness     = opts.uSoftness
    if (opts?.uInnerGlow    !== undefined) this.uInnerGlow    = opts.uInnerGlow
    if (opts?.uOutlineColor !== undefined) this.uOutlineColor = opts.uOutlineColor
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uThickness, uSoftness, uInnerGlow;
      uniform vec3 uOutlineColor;

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        float t = uThickness * 0.0018;
        float tl = texture2D(uTexture, clamp(uv + vec2(-t, -t), 0.0, 1.0)).a;
        float tc = texture2D(uTexture, clamp(uv + vec2( 0.0, -t), 0.0, 1.0)).a;
        float tr = texture2D(uTexture, clamp(uv + vec2( t, -t), 0.0, 1.0)).a;
        float ml = texture2D(uTexture, clamp(uv + vec2(-t, 0.0), 0.0, 1.0)).a;
        float mr = texture2D(uTexture, clamp(uv + vec2( t, 0.0), 0.0, 1.0)).a;
        float bl = texture2D(uTexture, clamp(uv + vec2(-t, t), 0.0, 1.0)).a;
        float bc = texture2D(uTexture, clamp(uv + vec2( 0.0, t), 0.0, 1.0)).a;
        float br = texture2D(uTexture, clamp(uv + vec2( t, t), 0.0, 1.0)).a;
        
        float edge = sqrt(pow(-tl - 2.0*ml - bl + tr + 2.0*mr + br, 2.0) + pow(-tl - 2.0*tc - tr + bl + 2.0*bc + br, 2.0));
        float stroke = smoothstep(0.4 - uSoftness, 0.45 + uSoftness, edge);
        float inner = smoothstep(0.1, 0.7, edge) * color.a * uInnerGlow;
        
        vec3 tint = uOutlineColor / 255.0;
        vec3 result = mix(color.rgb, tint, stroke);
        result = mix(result, tint, inner * 0.5);

        float finalAlpha = max(color.a, stroke * 0.98);
        gl_FragColor = vec4(result * finalAlpha, finalAlpha);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uThickness,  this.uThickness)
    gl.uniform1f(u.uSoftness,   this.uSoftness)
    gl.uniform1f(u.uInnerGlow,  this.uInnerGlow)
    gl.uniform3fv(u.uOutlineColor, new Float32Array(this.uOutlineColor.map(c => c/255)))
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const t = this.uOutlineColor; const strength = this.uThickness * 0.1
    for (let i = 0; i < data.length; i += 4) {
      if (data[i+3] > 0 && data[i+3] < 255) {
        data[i]=clamp(data[i]+(t[0]-data[i])*strength); data[i+1]=clamp(data[i+1]+(t[1]-data[i+1])*strength); data[i+2]=clamp(data[i+2]+(t[2]-data[i+2])*strength)
      }
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(OutlineFilter, 'OutlineFilter')

/**
 * Duotone 2.0 — Editorial Split-Tonality Edition.
 */
export class DuotoneFilter extends fabric.filters.BaseFilter<'DuotoneFilter'> {
  static type = 'Duotone'
  static uniformLocations = ['uShadowColor', 'uMidColor', 'uHighlightColor', 'uContrast', 'uIntensity']
  
  uShadowColor    = [0, 10, 60]
  uMidColor       = [120, 150, 180]
  uHighlightColor = [255, 230, 200]
  uContrast       = 1.0
  uIntensity      = 1.0

  constructor(opts?: any) {
    super()
    if (opts?.uShadowColor    !== undefined) this.uShadowColor    = opts.uShadowColor
    if (opts?.uMidColor       !== undefined) this.uMidColor       = opts.uMidColor
    if (opts?.uHighlightColor !== undefined) this.uHighlightColor = opts.uHighlightColor
    if (opts?.uContrast       !== undefined) this.uContrast       = opts.uContrast
    if (opts?.uIntensity      !== undefined) this.uIntensity      = opts.uIntensity
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform vec3 uShadowColor, uMidColor, uHighlightColor;
      uniform float uContrast, uIntensity;

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        float luma = pow(dot(color.rgb, vec3(0.2126, 0.7152, 0.0722)), uContrast);
        
        float shadowMask = 1.0 - smoothstep(0.0, 0.45, luma);
        float highlightMask = smoothstep(0.55, 1.0, luma);
        float midMask = 1.0 - shadowMask - highlightMask;
        
        vec3 graded = (shadowMask * uShadowColor/255.0) + (midMask * uMidColor/255.0) + (highlightMask * uHighlightColor/255.0);
        gl_FragColor = vec4(mix(color.rgb, graded, uIntensity) * color.a, color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform3fv(u.uShadowColor,    new Float32Array(this.uShadowColor.map(c => c/255)))
    gl.uniform3fv(u.uMidColor,       new Float32Array(this.uMidColor.map(c => c/255)))
    gl.uniform3fv(u.uHighlightColor, new Float32Array(this.uHighlightColor.map(c => c/255)))
    gl.uniform1f(u.uContrast,        this.uContrast)
    gl.uniform1f(u.uIntensity,       this.uIntensity)
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const sc = this.uShadowColor; const hc = this.uHighlightColor
    for (let i = 0; i < data.length; i += 4) {
      const l = (data[i]*0.21 + data[i+1]*0.72 + data[i+2]*0.07)/255
      data[i]=Math.round(sc[0]+(hc[0]-sc[0])*l); data[i+1]=Math.round(sc[1]+(hc[1]-sc[1])*l); data[i+2]=Math.round(sc[2]+(hc[2]-sc[2])*l)
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(DuotoneFilter, 'Duotone')

/**
 * Posterize 2.0 — Smart Quantization Edition.
 */
export class PosterizeFilter extends fabric.filters.BaseFilter<'PosterizeFilter'> {
  static type = 'PosterizeFilter'
  static uniformLocations = ['uSteps', 'uDither', 'uVibrance', 'uThreshold']
  
  uSteps     = 4.0
  uDither    = 0.5
  uVibrance  = 0.4
  uThreshold = 0.5

  constructor(opts?: any) {
    super()
    if (opts?.uSteps     !== undefined) this.uSteps     = opts.uSteps
    if (opts?.uDither    !== undefined) this.uDither    = opts.uDither
    if (opts?.uVibrance  !== undefined) this.uVibrance  = opts.uVibrance
    if (opts?.uThreshold !== undefined) this.uThreshold = opts.uThreshold
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uSteps, uDither, uVibrance, uThreshold;

      float bayer4x4(vec2 p) {
          vec2 pos = floor(mod(p, 4.0));
          if (pos.y == 0.0) return (pos.x == 0.0 ? 0.0 : (pos.x == 1.0 ? 0.5 : (pos.x == 2.0 ? 0.125 : 0.625)));
          if (pos.y == 1.0) return (pos.x == 0.0 ? 0.75 : (pos.x == 1.0 ? 0.25 : (pos.x == 2.0 ? 0.875 : 0.375)));
          if (pos.y == 2.0) return (pos.x == 0.0 ? 0.1875 : (pos.x == 1.0 ? 0.6875 : (pos.x == 2.0 ? 0.0625 : 0.5625)));
          return (pos.x == 0.0 ? 0.9375 : (pos.x == 1.0 ? 0.4375 : (pos.x == 2.0 ? 0.8125 : 0.3125)));
      }

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        float edge = abs(dot(texture2D(uTexture, uv + 1.0/600.0).rgb, vec3(0.33)) - dot(color.rgb, vec3(0.33)));
        float stepSize = 1.0 / max(uSteps - 1.0, 1.0);
        vec3 post = floor((color.rgb + (bayer4x4(gl_FragCoord.xy) - 0.5) * uDither * 0.18) / stepSize + 0.5) * stepSize;
        vec3 result = mix(post, post * (1.0 + uVibrance * 0.5), uVibrance);
        gl_FragColor = vec4(clamp(mix(result, color.rgb, clamp(edge * 8.0 * (1.1 - uThreshold), 0.0, 1.0)), 0.0, 1.0), color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uSteps,      this.uSteps)
    gl.uniform1f(u.uDither,     this.uDither)
    gl.uniform1f(u.uVibrance,   this.uVibrance)
    gl.uniform1f(u.uThreshold,  this.uThreshold)
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const s = 255 / Math.max(1, this.uSteps - 1)
    for (let i = 0; i < data.length; i += 4) {
      data[i]=Math.round(data[i]/s)*s; data[i+1]=Math.round(data[i+1]/s)*s; data[i+2]=Math.round(data[i+2]/s)*s
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(PosterizeFilter, 'PosterizeFilter')

/**
 * Vignette 2.0 — Physical Lens Restoration Edition.
 */
export class VignetteFilter extends fabric.filters.BaseFilter<'VignetteFilter'> {
  static type = 'VignetteFilter'
  static uniformLocations = ['uStrength', 'uRadius', 'uAspect', 'uAberration', 'uSaturationPreserve']
  
  uStrength            = 0.7
  uRadius              = 0.5
  uAspect              = 1.0
  uAberration          = 0.3
  uSaturationPreserve  = 0.6

  constructor(opts?: any) {
    super()
    if (opts?.uStrength           !== undefined) this.uStrength           = opts.uStrength
    if (opts?.uRadius             !== undefined) this.uRadius             = opts.uRadius
    if (opts?.uAspect             !== undefined) this.uAspect             = opts.uAspect
    if (opts?.uAberration         !== undefined) this.uAberration         = opts.uAberration
    if (opts?.uSaturationPreserve !== undefined) this.uSaturationPreserve = opts.uSaturationPreserve
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uStrength, uRadius, uAspect, uAberration, uSaturationPreserve;

      void main(){
        vec2 uv = vTexCoord;
        vec2 distVec = (uv - 0.5); distVec.x *= uAspect;
        float d = length(distVec) * 2.0;
        float ca = uAberration * 0.015 * (d * d);
        vec2 caDir = normalize(uv - 0.5) * ca;
        vec3 col = vec3(texture2D(uTexture, clamp(uv + caDir, 0.0, 1.0)).r, texture2D(uTexture, uv).g, texture2D(uTexture, clamp(uv - caDir, 0.0, 1.0)).b);
        float falloff = clamp(1.0 - (pow(smoothstep(uRadius, uRadius + 0.65, d), 2.0) * uStrength), 0.0, 1.0);
        vec3 result = mix(col * falloff, col * falloff * 1.15, uSaturationPreserve * (1.0 - falloff));
        gl_FragColor = vec4(clamp(result, 0.0, 1.0), texture2D(uTexture, uv).a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uStrength,           this.uStrength)
    gl.uniform1f(u.uRadius,             this.uRadius)
    gl.uniform1f(u.uAspect,             this.uAspect)
    gl.uniform1f(u.uAberration,         this.uAberration)
    gl.uniform1f(u.uSaturationPreserve, this.uSaturationPreserve)
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const strength = this.uStrength * 0.5
    for (let i = 0; i < data.length; i += 4) {
      const l = (data[i]*0.21 + data[i+1]*0.72 + data[i+2]*0.07)/255
      data[i]=clamp(data[i]-(255-data[i])*strength*(1-l)); data[i+1]=clamp(data[i+1]-(255-data[i+1])*strength*(1-l)); data[i+2]=clamp(data[i+2]-(255-data[i+2])*strength*(1-l))
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(VignetteFilter, 'VignetteFilter')

/**
 * VolumetricDepthFilter — Real WebGL 3D extrusion.
 */
export class VolumetricDepthFilter extends fabric.filters.BaseFilter<'VolumetricDepthFilter'> {
  static type = 'VolumetricDepthFilter'
  static uniformLocations = ['uDepth', 'uOpacity', 'uAngle']
  uDepth   = 0.3
  uOpacity = 0.72
  uAngle   = 2.356

  constructor(opts?: any) {
    super()
    if (opts?.uDepth   !== undefined) this.uDepth   = opts.uDepth
    if (opts?.uOpacity !== undefined) this.uOpacity = opts.uOpacity
    if (opts?.uAngle   !== undefined) this.uAngle   = opts.uAngle
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uDepth, uOpacity, uAngle;

      void main() {
        vec2 dir = vec2(cos(uAngle), sin(uAngle));
        float maxOff = uDepth * 0.06;
        vec4 stack = vec4(0.0);
        for (int i = 8; i >= 1; i--) {
          float t = float(i) / 8.0;
          vec4 c = texture2D(uTexture, vTexCoord - dir * t * maxOff);
          if (c.a < 0.01) continue;
          vec4 depthPx = vec4(c.rgb * (1.0 - t * 0.72), c.a * uOpacity * (0.20 + (1.0 - t) * 0.45));
          stack = depthPx + stack * (1.0 - depthPx.a);
        }
        vec4 front = texture2D(uTexture, vTexCoord);
        gl_FragColor = front + stack * (1.0 - front.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uDepth,   this.uDepth)
    gl.uniform1f(u.uOpacity, this.uOpacity)
    gl.uniform1f(u.uAngle,   this.uAngle)
  }

  applyTo2d({ imageData }: any) {
    const { data, width, height } = imageData
    const copy = new Uint8ClampedArray(data)
    const maxOff = Math.round(this.uDepth * width * 0.06)
    const cosDx = Math.cos(this.uAngle); const sinDy = Math.sin(this.uAngle)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4; let stackR = 0, stackG = 0, stackB = 0, stackA = 0
        for (let li = 8; li >= 1; li--) {
          const t = li / 8; const sx = Math.round(x - cosDx * t * maxOff); const sy = Math.round(y - sinDy * t * maxOff)
          if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue
          const si = (sy * width + sx) * 4; const cA = copy[si + 3] / 255
          if (cA < 0.01) continue
          const layerA = cA * this.uOpacity * (0.20 + (1.0 - t) * 0.45); const prevA = stackA / 255; const newA = layerA + prevA * (1 - layerA)
          if (newA > 0.001) {
            stackR=((copy[si]/255)*(1-t*0.72)*layerA+(stackR/255)*prevA*(1-layerA))/newA*255
            stackG=((copy[si+1]/255)*(1-t*0.72)*layerA+(stackG/255)*prevA*(1-layerA))/newA*255
            stackB=((copy[si+2]/255)*(1-t*0.72)*layerA+(stackB/255)*prevA*(1-layerA))/newA*255
            stackA=newA*255
          }
        }
        const fA = copy[i + 3] / 255; const sA = stackA / 255; const rA = fA + sA * (1 - fA)
        if (rA > 0.001) {
          data[i]=(copy[i]/255*fA+(stackR/255)*sA*(1-fA))/rA*255; data[i+1]=(copy[i+1]/255*fA+(stackG/255)*sA*(1-fA))/rA*255; data[i+2]=(copy[i+2]/255*fA+(stackB/255)*sA*(1-fA))/rA*255; data[i+3]=rA*255
        } else { data[i]=data[i+1]=data[i+2]=data[i+3]=0 }
      }
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(VolumetricDepthFilter, 'VolumetricDepthFilter')
