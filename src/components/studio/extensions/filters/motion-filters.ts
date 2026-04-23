import * as fabric from 'fabric'
import { GLSL_GOLD_NOISE, GLSL_SNOISE, GLSL_VNOISE, clamp } from './shared-utils'

/**
 * Glitch 2.0 — Sophisticated block displacement + dispersive chromatic aberration 
 * + digital corruption strips + scanlines.
 */
export class Glitch extends fabric.filters.BaseFilter<'Glitch'> {
  static type = 'Glitch'
  static uniformLocations = ['uAmount', 'uTime', 'uSeed']
  uAmount = 0.4
  uTime   = 0.0
  uSeed   = 1.0

  constructor(opts?: any) {
    super()
    if (opts?.uAmount !== undefined) this.uAmount = opts.uAmount
    if (opts?.uTime   !== undefined) this.uTime   = opts.uTime
    if (opts?.uSeed   !== undefined) this.uSeed   = opts.uSeed
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uAmount;
      uniform float uTime;
      uniform float uSeed;

      ${GLSL_GOLD_NOISE}

      void main(){
        vec2 uv = vTexCoord;
        float t = floor(uTime * 18.0) * 0.1337 + uSeed;
        
        float grid = mix(16.0, 48.0, uAmount);
        vec2 block = floor(uv * grid) / grid;
        float n = gnoise(block + t);
        
        if (n < uAmount * 0.22) {
            float strength = uAmount * 0.15;
            uv.x += (gnoise(vec2(t, block.y)) - 0.5) * strength;
            uv.y += (gnoise(vec2(block.x, t)) - 0.5) * strength * 0.3;
        }

        vec2 distVec = uv - 0.5;
        float dist = dot(distVec, distVec);
        float aberr = uAmount * 0.025 * (0.5 + dist * 2.0);
        
        float r = texture2D(uTexture, clamp(uv + vec2(aberr, 0.0), 0.001, 0.999)).r;
        float g = texture2D(uTexture, clamp(uv,                   0.001, 0.999)).g;
        float b = texture2D(uTexture, clamp(uv - vec2(aberr, 0.0), 0.001, 0.999)).b;
        float a = texture2D(uTexture, clamp(uv,                   0.001, 0.999)).a;

        vec3 col = vec3(r, g, b);
        float stripChance = gnoise(vec2(t * 0.44, uv.y));
        if (stripChance > 0.985 - uAmount * 0.04) {
            col = 1.0 - col;
        }

        float scan = 1.0 - step(0.5, fract(uv.y * 240.0)) * 0.06 * uAmount;
        gl_FragColor = vec4(clamp(col * scan, 0.0, 1.0) * a, a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uAmount, this.uAmount)
    gl.uniform1f(u.uTime,   this.uTime)
    gl.uniform1f(u.uSeed,   this.uSeed)
  }

  applyTo2d({ imageData }: any) {
    const { data, width, height } = imageData
    const copy  = new Uint8ClampedArray(data)
    const shift = Math.round(this.uAmount * 5)
    for (let y = 0; y < height; y++) {
      const rowOffset = (Math.random() > 0.95 - this.uAmount * 0.1) 
                        ? Math.round((Math.random() - 0.5) * width * 0.05 * this.uAmount) 
                        : 0
      for (let x = 0; x < width; x++) {
        const i  = (y * width + x) * 4
        const rx = clamp(x + shift + rowOffset, 0, width - 1)
        const bx = clamp(x - shift + rowOffset, 0, width - 1)
        data[i]     = copy[(y * width + rx) * 4]
        data[i + 1] = copy[(y * width + clamp(x + rowOffset, 0, width - 1)) * 4 + 1]
        data[i + 2] = copy[(y * width + bx) * 4 + 2]
        data[i + 3] = copy[i + 3]
      }
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(Glitch, 'Glitch')

/**
 * Wavy 2.0 — Fluid Dynamics Edition.
 */
export class WavyFilter extends fabric.filters.BaseFilter<'WavyFilter'> {
  static type = 'Wavy'
  static uniformLocations = ['uIntensity', 'uFrequency', 'uTime', 'uSpeed', 'uRefraction']
  
  uIntensity = 0.5
  uFrequency = 4.0
  uTime      = 0.0
  uSpeed     = 0.5
  uRefraction = 0.4

  constructor(opts?: any) {
    super()
    if (opts?.uIntensity  !== undefined) this.uIntensity  = opts.uIntensity
    if (opts?.uFrequency  !== undefined) this.uFrequency  = opts.uFrequency
    if (opts?.uTime       !== undefined) this.uTime       = opts.uTime
    if (opts?.uSpeed      !== undefined) this.uSpeed      = opts.uSpeed
    if (opts?.uRefraction !== undefined) this.uRefraction = opts.uRefraction
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uIntensity, uFrequency, uTime, uSpeed, uRefraction;

      ${GLSL_SNOISE}

      void main(){
        vec2 uv = vTexCoord;
        float t = uTime * uSpeed;
        
        vec2 flow = vec2(
            snoise(uv * uFrequency + t * 0.5),
            snoise(uv * uFrequency + vec2(1.7, 9.2) - t * 0.4)
        );
        
        vec2 warpedUV = uv + flow * uIntensity * 0.08;
        float noiseVal = snoise(warpedUV * uFrequency * 1.5 + t * 0.8);
        vec2 finalUV = uv + flow * noiseVal * uIntensity * 0.04;

        float aberr = uIntensity * 0.02 * abs(noiseVal);
        float r = texture2D(uTexture, clamp(finalUV + vec2(aberr, 0.0), 0.001, 0.999)).r;
        float g = texture2D(uTexture, clamp(finalUV, 0.001, 0.999)).g;
        float b = texture2D(uTexture, clamp(finalUV - vec2(aberr, 0.0), 0.001, 0.999)).b;
        vec3 col = vec3(r, g, b);

        float caustic = pow(clamp(noiseVal * 0.5 + 0.5, 0.0, 1.0), 4.0) * uRefraction * 2.0;
        col += caustic * vec3(0.85, 0.95, 1.0); 

        gl_FragColor = vec4(col * texture2D(uTexture, uv).a, texture2D(uTexture, uv).a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uIntensity,  this.uIntensity)
    gl.uniform1f(u.uFrequency,  this.uFrequency)
    gl.uniform1f(u.uTime,       this.uTime)
    gl.uniform1f(u.uSpeed,      this.uSpeed)
    gl.uniform1f(u.uRefraction, this.uRefraction)
  }

  applyTo2d({ imageData }: any) {
    const { data, width, height } = imageData
    const copy = new Uint8ClampedArray(data)
    const amp  = this.uIntensity * 12
    const freq = this.uFrequency
    for (let y = 0; y < height; y++) {
      const ox = Math.round(Math.sin((y/height)*freq*Math.PI)*amp)
      for (let x = 0; x < width; x++) {
        const i = (y*width+x)*4
        const sx = clamp(x+ox, 0, width-1)
        const si = (y*width+sx)*4
        data[i]=copy[si]; data[i+1]=copy[si+1]; data[i+2]=copy[si+2]
      }
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(WavyFilter, 'Wavy')

/**
 * Liquid Motion 2.0 — Viscous Domain Warp Edition.
 */
export class LiquidMotionFilter extends fabric.filters.BaseFilter<'LiquidMotionFilter'> {
  static type = 'LiquidMotion'
  static uniformLocations = ['uIntensity', 'uViscosity', 'uComplexity', 'uTime', 'uSurfaceGlow']
  
  uIntensity   = 0.5
  uViscosity   = 0.4
  uComplexity  = 3.0
  uTime        = 0.0
  uSurfaceGlow = 0.5

  constructor(opts?: any) {
    super()
    if (opts?.uIntensity    !== undefined) this.uIntensity   = opts.uIntensity
    if (opts?.uViscosity    !== undefined) this.uViscosity   = opts.uViscosity
    if (opts?.uComplexity   !== undefined) this.uComplexity  = opts.uComplexity
    if (opts?.uTime         !== undefined) this.uTime        = opts.uTime
    if (opts?.uSurfaceGlow  !== undefined) this.uSurfaceGlow = opts.uSurfaceGlow
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uIntensity, uViscosity, uComplexity, uTime, uSurfaceGlow;

      ${GLSL_SNOISE}

      float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 rot = mat2(1.6, 1.2, -1.2, 1.6);
          for (int i = 0; i < 3; i++) {
              v += a * snoise(p);
              p = rot * p * 2.0 + uTime * uViscosity * 0.2;
              a *= 0.5;
          }
          return v;
      }

      void main(){
        vec2 uv = vTexCoord;
        float t = uTime * uViscosity;
        
        vec2 q = vec2(fbm(uv * uComplexity + t), fbm(uv * uComplexity + vec2(5.2, 1.3)));
        vec2 r = vec2(fbm(uv * uComplexity + q * 4.0 + t * 0.5), fbm(uv * uComplexity + q * 4.0 + vec2(1.7, 9.2)));
        
        float n = fbm(uv * uComplexity + r * 3.5);
        vec2 finalUV = uv + r * uIntensity * 0.15;

        vec4 color = texture2D(uTexture, clamp(finalUV, 0.001, 0.999));
        
        float g = fbm(finalUV * 10.0 + t);
        float spec = pow(max(0.0, g), 8.0) * uSurfaceGlow * 1.5;
        vec3 col = color.rgb + spec * vec3(1.0, 0.9, 0.7);

        gl_FragColor = vec4(col * color.a, color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uIntensity,   this.uIntensity)
    gl.uniform1f(u.uViscosity,   this.uViscosity)
    gl.uniform1f(u.uComplexity,  this.uComplexity)
    gl.uniform1f(u.uTime,        this.uTime)
    gl.uniform1f(u.uSurfaceGlow, this.uSurfaceGlow)
  }

  applyTo2d({ imageData }: any) {
    const { data, width, height } = imageData
    const copy = new Uint8ClampedArray(data)
    const amp  = Math.round(this.uIntensity * width * 0.06)
    for (let y = 0; y < height; y++) {
      const shift = Math.round(Math.sin((y/height)*Math.PI*2)*amp)
      for (let x = 0; x < width; x++) {
        const i = (y*width+x)*4; const sx = Math.min(width-1, Math.max(0, x+shift))
        const si = (y*width+sx)*4
        data[i]=copy[si]; data[i+1]=copy[si+1]; data[i+2]=copy[si+2]
      }
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(LiquidMotionFilter, 'LiquidMotion')

/**
 * VHS 2.0 — High-Fidelity Analog Emulation.
 */
export class VHSFilter extends fabric.filters.BaseFilter<'VHSFilter'> {
  static type = 'VHSFilter'
  static uniformLocations = ['uIntensity', 'uBleed', 'uTracking', 'uTime']
  
  uIntensity = 0.5
  uBleed     = 0.5
  uTracking  = 0.5
  uTime      = 0.0

  constructor(opts?: any) {
    super()
    if (opts?.uIntensity !== undefined) this.uIntensity = opts.uIntensity
    if (opts?.uBleed     !== undefined) this.uBleed     = opts.uBleed
    if (opts?.uTracking  !== undefined) this.uTracking  = opts.uTracking
    if (opts?.uTime      !== undefined) this.uTime      = opts.uTime
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uIntensity, uBleed, uTracking, uTime;

      const mat3 RGB_TO_YIQ = mat3(0.299, 0.587, 0.114, 0.596, -0.274, -0.322, 0.211, -0.523, 0.312);
      const mat3 YIQ_TO_RGB = mat3(1.0, 0.956, 0.621, 1.0, -0.272, -0.647, 1.0, -1.106, 1.703);

      float hashV(vec2 co){return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453);}

      void main(){
        vec2 uv = vTexCoord;
        float t = uTime;
        
        float switchSize = 0.04 * uTracking;
        float isSwitch = step(1.0 - switchSize, uv.y);
        uv.x += isSwitch * (hashV(vec2(uv.y, floor(t * 30.0))) - 0.5) * 0.03 * uIntensity;

        float jitter = (sin(uv.y * 30.0 + t * 8.0) * 0.0012 + (hashV(vec2(t, 0.0)) - 0.5) * 0.002) * uTracking;
        uv.x += jitter;

        vec4 base = texture2D(uTexture, clamp(uv, 0.001, 0.999));
        vec3 yiq = RGB_TO_YIQ * base.rgb;
        
        float bSize = 0.012 * uBleed;
        vec3 i_sample = RGB_TO_YIQ * texture2D(uTexture, clamp(uv - vec2(bSize, 0.0), 0.0, 1.0)).rgb;
        vec3 q_sample = RGB_TO_YIQ * texture2D(uTexture, clamp(uv - vec2(bSize * 1.6, 0.0), 0.0, 1.0)).rgb;
        
        vec3 mixedYIQ = vec3(yiq.x, i_sample.y, q_sample.z);
        vec3 rgb = YIQ_TO_RGB * mixedYIQ;

        float grain = (hashV(uv + vec2(t * 0.1, t * 13.0)) - 0.5) * 0.1 * uIntensity;
        float scan = 1.0 - step(0.5, fract(uv.y * 240.0)) * 0.12 * uIntensity;

        float dropout = step(0.996, hashV(vec2(floor(uv.y * 100.0) / 100.0, floor(t * 12.0)))) * 0.4 * uIntensity;
        
        vec3 col = rgb * scan + grain - dropout;
        gl_FragColor = vec4(clamp(col, 0.0, 1.0) * base.a, base.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uIntensity, this.uIntensity)
    gl.uniform1f(u.uBleed,     this.uBleed)
    gl.uniform1f(u.uTracking,  this.uTracking)
    gl.uniform1f(u.uTime,      this.uTime)
  }

  applyTo2d({ imageData }: any) {
    const { data, width, height } = imageData
    const copy  = new Uint8ClampedArray(data)
    const drift = Math.round(this.uTracking * 8)
    for (let y = 0; y < height; y++) {
      const lineShift = Math.round(Math.sin((y/height)*8)*drift)
      for (let x = 0; x < width; x++) {
        const i  = (y * width + x) * 4
        const sx = clamp(x+lineShift, 0, width-1)
        const si = (y * width + sx) * 4
        data[i]=copy[si]; data[i+1]=copy[si+1]; data[i+2]=copy[si+2]
      }
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(VHSFilter, 'VHSFilter')

/**
 * Matrix — Digital rain overlay.
 */
export class MatrixFilter extends fabric.filters.BaseFilter<'MatrixFilter'> {
  static type = 'Matrix'
  static uniformLocations = ['uIntensity', 'uTime']
  uIntensity = 0.7
  uTime      = 0.0

  constructor(opts?: any) {
    super()
    if (opts?.uIntensity !== undefined) this.uIntensity = opts.uIntensity
    if (opts?.uTime !== undefined) this.uTime = opts.uTime
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uIntensity;
      uniform float uTime;

      float hashM(float n){return fract(sin(n)*43758.5453);}

      void main(){
        vec2 uv=vTexCoord;
        vec4 color=texture2D(uTexture,uv);

        float cols=22.0; float rows=32.0;
        vec2 cell=vec2(floor(uv.x*cols),floor(uv.y*rows));

        float speed  = 0.4+hashM(cell.x*17.3)*1.8;
        float offset = hashM(cell.x*31.7+7.0);
        float headY  = fract(offset+uTime*speed*0.25);

        float relY   = fract(uv.y-headY);
        if(relY>0.5) relY=relY-1.0;
        float tailLen= 0.25+hashM(cell.x+2.0)*0.35;

        float trail  = relY<0.0 ? max(0.0,1.0+relY/tailLen) : 0.0;
        float head   = smoothstep(0.04,0.0,abs(relY));
        float flicker= hashM(cell.x+cell.y*137.0+floor(uTime*10.0)*7.3);
        trail       *= 0.5+flicker*0.5;

        vec3 headCol  = vec3(0.85,1.0,0.85);
        vec3 trailCol = vec3(0.0,1.0,0.3)*trail;
        vec3 matrix   = headCol*head + trailCol;

        vec3 ambient = vec3(0.0,0.05,0.0)*uIntensity;

        vec3 result = mix(color.rgb, matrix+ambient, min((trail+head)*uIntensity,1.0)*color.a);
        gl_FragColor=vec4(result,color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uIntensity, this.uIntensity)
    gl.uniform1f(u.uTime,      this.uTime)
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = Math.min(255, data[i]     * 0.3)
      data[i + 1] = Math.min(255, data[i + 1] * 0.8 + 30 * this.uIntensity)
      data[i + 2] = Math.min(255, data[i + 2] * 0.3)
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(MatrixFilter, 'Matrix')

/**
 * Liquid Metal / Chrome — Animated metallic banding.
 */
export class LiquidMetalFilter extends fabric.filters.BaseFilter<'LiquidMetalFilter'> {
  static type = 'LiquidMetalFilter'
  static uniformLocations = ['uIntensity', 'uTime']
  uIntensity = 0.5
  uTime      = 0.0

  constructor(opts?: any) {
    super()
    if (opts?.uIntensity !== undefined) this.uIntensity = opts.uIntensity
    if (opts?.uTime !== undefined) this.uTime = opts.uTime
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uIntensity;
      uniform float uTime;
      ${GLSL_VNOISE}
      void main(){
        vec2 uv=vTexCoord;
        vec4 color=texture2D(uTexture,uv);
        float lum=dot(color.rgb,vec3(0.299,0.587,0.114));
        float n=vnoise(uv*3.5+vec2(uTime*0.08,uTime*0.05));
        float band=fract(sin((lum+n*0.3)*12.566*uIntensity+uTime*0.4)*0.5+0.5);
        vec3 chrome;
        if(band<0.28)      chrome=mix(vec3(0.02,0.02,0.03),vec3(0.20,0.23,0.28),band/0.28);
        else if(band<0.55) chrome=mix(vec3(0.20,0.23,0.28),vec3(0.68,0.74,0.82),(band-0.28)/0.27);
        else if(band<0.80) chrome=mix(vec3(0.68,0.74,0.82),vec3(0.95,0.97,1.00),(band-0.55)/0.25);
        else               chrome=mix(vec3(0.95,0.97,1.00),vec3(1.0), (band-0.80)/0.20);
        float spec=step(0.96,band)*0.6;
        chrome=clamp(chrome+spec,0.0,1.0);
        gl_FragColor=vec4(chrome*color.a,color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uIntensity, this.uIntensity)
    gl.uniform1f(u.uTime,      this.uTime)
  }

  applyTo2d({ imageData }: any) {
    const { data } = imageData
    for (let i = 0; i < data.length; i += 4) {
      const lum = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114) / 255
      const val = Math.sin(lum * Math.PI * 4 * this.uIntensity) * 0.5 + 0.5
      const s = val > 0.8 ? 255 : val > 0.4 ? 140 : 20
      data[i] = s; data[i+1] = s; data[i+2] = s
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(LiquidMetalFilter, 'LiquidMetalFilter')

/**
 * Advanced CRT — The "Trinitron" Physics Engine.
 * Simulates phosphor masks, electron beam focus, and physical tube distortion.
 */
export class AdvancedCRTFilter extends fabric.filters.BaseFilter<'AdvancedCRTFilter'> {
  static type = 'AdvancedCRT'
  static uniformLocations = [
    'uMode', 'uMaskScale', 'uMaskIntensity', 'uScanlineIntensity', 
    'uDistortion', 'uConvergence', 'uBeamFocus', 'uPersistence',
    'uBrightness', 'uTime'
  ]
  
  uMode              = 1.0  // 0: None, 1: Slot-Mask, 2: Shadow-Mask, 3: Aperture-Grille
  uMaskScale         = 1.0
  uMaskIntensity     = 0.4
  uScanlineIntensity = 0.5
  uDistortion        = 0.15
  uConvergence       = 0.3
  uBeamFocus         = 0.6
  uPersistence       = 0.4
  uBrightness        = 1.1
  uTime              = 0.0

  constructor(opts?: any) {
    super()
    if (opts?.uMode !== undefined)              this.uMode = opts.uMode
    if (opts?.uMaskScale !== undefined)         this.uMaskScale = opts.uMaskScale
    if (opts?.uMaskIntensity !== undefined)     this.uMaskIntensity = opts.uMaskIntensity
    if (opts?.uScanlineIntensity !== undefined) this.uScanlineIntensity = opts.uScanlineIntensity
    if (opts?.uDistortion !== undefined)        this.uDistortion = opts.uDistortion
    if (opts?.uConvergence !== undefined)       this.uConvergence = opts.uConvergence
    if (opts?.uBeamFocus !== undefined)         this.uBeamFocus = opts.uBeamFocus
    if (opts?.uPersistence !== undefined)       this.uPersistence = opts.uPersistence
    if (opts?.uBrightness !== undefined)        this.uBrightness = opts.uBrightness
    if (opts?.uTime !== undefined)              this.uTime = opts.uTime
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform sampler2D uPersistenceBuffer;
      uniform float uMode, uMaskScale, uMaskIntensity, uScanlineIntensity;
      uniform float uDistortion, uConvergence, uBeamFocus, uPersistence;
      uniform float uBrightness, uTime;

      vec2 distort(vec2 coord, float amt) {
          vec2 cc = coord - 0.5;
          float dist = dot(cc, cc);
          return coord + cc * (dist * amt * 0.15);
      }

      void main() {
          vec2 uv = distort(vTexCoord, uDistortion);
          
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
              gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
              return;
          }

          // Radial Convergence
          vec2 direction = uv - 0.5;
          float distFromCenter = length(direction);
          vec2 radialOffset = direction * (uConvergence * distFromCenter * 0.01);
          
          float r = texture2D(uTexture, uv + radialOffset).r;
          float g = texture2D(uTexture, uv).g;
          float b = texture2D(uTexture, uv - radialOffset).b;
          float a = texture2D(uTexture, uv).a;
          
          // Master Slot Mask & Brick Pattern
          vec2 pos = gl_FragCoord.xy / max(1.0, uMaskScale);
          float col = mod(floor(pos.x), 3.0);
          vec3 mask = vec3(1.0);
          if (uMode > 0.5) {
              if (col == 0.0) mask = vec3(1.0, 0.2, 0.2);
              else if (col == 1.0) mask = vec3(0.2, 1.0, 0.2);
              else mask = vec3(0.2, 0.2, 1.0);
              float brick = mod(floor(pos.y) + floor(pos.x/3.0), 2.0);
              mask *= (0.7 + 0.3 * brick);
          }
          vec3 finalMask = mix(vec3(1.0), mask, uMaskIntensity);

          float scan = sin(uv.y * 800.0) * 0.05 * uScanlineIntensity;
          vec3 color = (vec3(r, g, b) * finalMask) - scan;
          color *= uBrightness;

          // Persistence (Temporal decay)
          vec3 prev = texture2D(uPersistenceBuffer, uv).rgb;
          color = max(color, prev * (uPersistence * 0.95));

          gl_FragColor = vec4(color * a, a);
      }
    `
  }

  applyTo(options: any) {
    const gl = options.gl;
    if (!this._persistenceTexture) {
      this._persistenceTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this._persistenceTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, options.sourceWidth, options.sourceHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    super.applyTo(options);
    
    // After render, copy current frame to persistence buffer
    gl.bindTexture(gl.TEXTURE_2D, this._persistenceTexture);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, options.sourceWidth, options.sourceHeight, 0);
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uMode,              this.uMode)
    gl.uniform1f(u.uMaskScale,         this.uMaskScale)
    gl.uniform1f(u.uMaskIntensity,     this.uMaskIntensity)
    gl.uniform1f(u.uScanlineIntensity, this.uScanlineIntensity)
    gl.uniform1f(u.uDistortion,        this.uDistortion)
    gl.uniform1f(u.uConvergence,       this.uConvergence)
    gl.uniform1f(u.uBeamFocus,         this.uBeamFocus)
    gl.uniform1f(u.uPersistence,       this.uPersistence)
    gl.uniform1f(u.uBrightness,        this.uBrightness)
    gl.uniform1f(u.uTime,              this.uTime)
    
    // Bind persistence buffer to unit 1
    if (this._persistenceTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this._persistenceTexture);
      gl.uniform1i(u.uPersistenceBuffer, 1);
      gl.activeTexture(gl.TEXTURE0);
    }
  }
}

// @ts-ignore
fabric.classRegistry.setClass(AdvancedCRTFilter, 'AdvancedCRT')
