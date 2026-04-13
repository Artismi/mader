/**
 * Creative OS — Custom Fabric.js Filter Extensions (v3)
 *
 * Architecture:
 *   All filters implement WebGL (getFragmentSource + sendUniformData)
 *   with a CPU applyTo2d fallback. Animated filters expose uTime —
 *   incremented by the RAF loop in creative-studio.tsx (ANIMATED_FX map).
 *   Each class is registered in fabric.classRegistry for JSON round-trips.
 *
 * Categories:
 *   MOTION   — uTime-animated: Glitch, WavyFilter, LiquidMotionFilter,
 *              VHSFilter, MatrixFilter, LiquidMetalFilter
 *   OPTICAL  — Light/lens: ThermalFilter, PrismFilter, NeonGlowFilter,
 *              HolographicFilter, BloomFilter, PixelateFilter
 *   TEXTURE  — Surface: GrainFilter, FiberFilter, EliteHalftone, ASCIIFilter
 *   STYLE    — Artistic: Risograph, EliteClay, OilPaintFilter, OutlineFilter,
 *              DuotoneFilter, VignetteFilter, PosterizeFilter
 */

import * as fabric from 'fabric'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function clamp(v: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, v))
}

// Shared GLSL: Simplex Noise 2D (Ashima Arts / Stefan Gustavson, MIT / public domain)
const GLSL_SNOISE = `
  vec3 mod289_sn(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec2 mod289_sn(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec3 permute_sn(vec3 x){return mod289_sn(((x*34.0)+1.0)*x);}
  float snoise(vec2 v){
    const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i=floor(v+dot(v,C.yy));
    vec2 x0=v-i+dot(i,C.xx);
    vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
    vec4 x12=x0.xyxy+C.xxzz;
    x12.xy-=i1;
    i=mod289_sn(i);
    vec3 p=permute_sn(permute_sn(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
    vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
    m=m*m;m=m*m;
    vec3 xv=2.0*fract(p*C.www)-1.0;
    vec3 h=abs(xv)-0.5;
    vec3 ox=floor(xv+0.5);
    vec3 a0=xv-ox;
    m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
    vec3 g;
    g.x=a0.x*x0.x+h.x*x0.y;
    g.yz=a0.yz*x12.xz+h.yz*x12.yw;
    return 130.0*dot(m,g);
  }
`

// Shared GLSL: HSV → RGB
const GLSL_HSV2RGB = `
  vec3 hsv2rgb(vec3 c){
    vec4 K=vec4(1.0,2.0/3.0,1.0/3.0,3.0);
    vec3 p=abs(fract(c.xxx+K.xyz)*6.0-K.www);
    return c.z*mix(K.xxx,clamp(p-K.xxx,0.0,1.0),c.y);
  }
`

// Shared GLSL: value noise 2D
const GLSL_VNOISE = `
  float hashf(float n){return fract(sin(n)*43758.5453);}
  float vnoise(vec2 p){
    vec2 i=floor(p);vec2 f=fract(p);
    f=f*f*(3.0-2.0*f);
    float a=hashf(i.x+i.y*57.0);
    float b=hashf(i.x+1.0+i.y*57.0);
    float c=hashf(i.x+(i.y+1.0)*57.0);
    float d=hashf(i.x+1.0+(i.y+1.0)*57.0);
    return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
  }
`

// Shared GLSL: Gold Noise (High quality procedural randomness)
const GLSL_GOLD_NOISE = `
  float gnoise(vec2 co){
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }
`

// ─── ① MOTION FILTERS (uTime animated) ───────────────────────────────────────

/**
 * Glitch 2.0 — Sophisticated block displacement + dispersive chromatic aberration 
 * + digital corruption strips + scanlines.
 * Premium, non-linear animation using procedural noise.
 */
class Glitch extends fabric.filters.BaseFilter<'Glitch'> {
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
        // Quantize time to create a "stepping" retro feel
        float t = floor(uTime * 18.0) * 0.1337 + uSeed;
        
        // 1. DYNAMIC BLOCK DISPLACEMENT
        // Grid size scales with intensity for mass-corruption feel
        float grid = mix(16.0, 48.0, uAmount);
        vec2 block = floor(uv * grid) / grid;
        float n = gnoise(block + t);
        
        // Probability of a block being displaced increases with uAmount
        if (n < uAmount * 0.22) {
            float strength = uAmount * 0.15;
            uv.x += (gnoise(vec2(t, block.y)) - 0.5) * strength;
            uv.y += (gnoise(vec2(block.x, t)) - 0.5) * strength * 0.3;
        }

        // 2. DISPERSIVE CHROMATIC ABERRATION
        // Increases toward the edges for a "lens" feel
        vec2 distVec = uv - 0.5;
        float dist = dot(distVec, distVec);
        float aberr = uAmount * 0.025 * (0.5 + dist * 2.0);
        
        float r = texture2D(uTexture, clamp(uv + vec2(aberr, 0.0), 0.001, 0.999)).r;
        float g = texture2D(uTexture, clamp(uv,                   0.001, 0.999)).g;
        float b = texture2D(uTexture, clamp(uv - vec2(aberr, 0.0), 0.001, 0.999)).b;
        float a = texture2D(uTexture, clamp(uv,                   0.001, 0.999)).a;

        // 3. DIGITAL STRIP CORRUPTION (Inversion)
        vec3 col = vec3(r, g, b);
        float stripChance = gnoise(vec2(t * 0.44, uv.y));
        if (stripChance > 0.985 - uAmount * 0.04) {
            col = 1.0 - col; // Invert colors in the strip
        }

        // 4. SCANLINE FLICKER
        float scan = 1.0 - step(0.5, fract(uv.y * 240.0)) * 0.06 * uAmount;
        
        // Final composite
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
    
    // CPU fallback: RGB split + randomized block shift approximation
    for (let y = 0; y < height; y++) {
      const rowOffset = (Math.random() > 0.95 - this.uAmount * 0.1) 
                        ? Math.round((Math.random() - 0.5) * width * 0.05 * this.uAmount) 
                        : 0
      
      for (let x = 0; x < width; x++) {
        const i  = (y * width + x) * 4
        // RGB Split
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

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wavy 2.0 — Fluid Dynamics Edition.
 * Professional Recursive Simplex Domain Warping
 * + Refractive Caustics + Dispersive light splitting.
 */
class WavyFilter extends fabric.filters.BaseFilter<'WavyFilter'> {
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
        
        // 1. DOMAIN WARPING (Fluid Layer 1)
        vec2 flow = vec2(
            snoise(uv * uFrequency + t * 0.5),
            snoise(uv * uFrequency + vec2(1.7, 9.2) - t * 0.4)
        );
        
        // 2. RECURSIVE DISPLACEMENT (Fluid Layer 2)
        // Warp coordinates recursively for gooey interconnected stretching
        vec2 warpedUV = uv + flow * uIntensity * 0.08;
        float noiseVal = snoise(warpedUV * uFrequency * 1.5 + t * 0.8);
        vec2 finalUV = uv + flow * noiseVal * uIntensity * 0.04;

        // 3. REFRACTIVE CHROMATIC ABERRATION
        // Light split magnitude tied to local warp speed
        float aberr = uIntensity * 0.02 * abs(noiseVal);
        float r = texture2D(uTexture, clamp(finalUV + vec2(aberr, 0.0), 0.001, 0.999)).r;
        float g = texture2D(uTexture, clamp(finalUV, 0.001, 0.999)).g;
        float b = texture2D(uTexture, clamp(finalUV - vec2(aberr, 0.0), 0.001, 0.999)).b;
        vec3 col = vec3(r, g, b);

        // 4. REFRACTIVE CAUSTIC LIGHTING
        // Focus light on the "crests" of the procedural waves
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * Triple-nested FBM coordinator warping + Molten surface shading
 * + Specular heat highlights. Simulates marbled, premium fluids.
 */
class LiquidMotionFilter extends fabric.filters.BaseFilter<'LiquidMotionFilter'> {
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

      // 3-Octave Fractional Brownian Motion with rotation
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
        
        // 1. TRIPLE-NESTED DOMAIN WARP
        vec2 q = vec2(fbm(uv * uComplexity + t), fbm(uv * uComplexity + vec2(5.2, 1.3)));
        vec2 r = vec2(fbm(uv * uComplexity + q * 4.0 + t * 0.5), fbm(uv * uComplexity + q * 4.0 + vec2(1.7, 9.2)));
        
        float n = fbm(uv * uComplexity + r * 3.5);
        vec2 finalUV = uv + r * uIntensity * 0.15;

        vec4 color = texture2D(uTexture, clamp(finalUV, 0.001, 0.999));
        
        // 2. MOLTEN SURFACE SHADING
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
 * Liquid Marbling — Domain Warping for high-end fluid patterns.
 * ANIMATED: uTime drives the fluid evolution.
 */
class LiquidMarblingFilter extends fabric.filters.BaseFilter<'LiquidMarblingFilter'> {
  static type = 'LiquidMarbling'
  static uniformLocations = ['uIntensity', 'uScale', 'uTime']
  uIntensity = 0.5
  uScale     = 4.0
  uTime      = 0.0

  constructor(opts?: any) {
    super()
    if (opts?.uIntensity !== undefined) this.uIntensity = opts.uIntensity
    if (opts?.uScale !== undefined) this.uScale = opts.uScale
    if (opts?.uTime !== undefined) this.uTime = opts.uTime
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uIntensity;
      uniform float uScale;
      uniform float uTime;

      ${GLSL_SNOISE}

      // Fractal Brownian Motion
      float fbm(vec2 p) {
        float f = 0.0;
        float amp = 0.5;
        for(int i = 0; i < 4; i++) {
          f += amp * snoise(p);
          p *= 2.0;
          amp *= 0.5;
        }
        return f;
      }

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        
        // Domain Warping: calcoliamo due offset vettoriali basati sul rumore
        vec2 q = vec2(fbm(uv * uScale + uTime * 0.1), fbm(uv * uScale + vec2(5.2, 1.3)));
        vec2 r = vec2(fbm(uv * uScale + 4.0 * q + vec2(1.7, 9.2) + uTime * 0.15),
                      fbm(uv * uScale + 4.0 * q + vec2(8.3, 2.8) + uTime * 0.12));
        
        // Applichiamo la distorsione liquida alle coordinate originali
        vec2 fluidUV = uv + r * (uIntensity * 0.15);
        
        // Campioniamo l'immagine originale con le nuove coordinate fluide
        vec4 fluidColor = texture2D(uTexture, clamp(fluidUV, 0.0, 1.0));
        
        // Aggiungiamo ombreggiatura volumetrica basata sulle pieghe del fluido
        float shading = fbm(uv * uScale + 4.0 * r) * 0.5 + 0.5;
        fluidColor.rgb *= mix(1.0, shading, uIntensity * 0.8);

        gl_FragColor = vec4(fluidColor.rgb * color.a, color.a);
      }
    `
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uIntensity, this.uIntensity)
    gl.uniform1f(u.uScale,     this.uScale)
    gl.uniform1f(u.uTime,      this.uTime)
  }
}
// @ts-ignore
fabric.classRegistry.setClass(LiquidMarblingFilter, 'LiquidMarbling')

// ─────────────────────────────────────────────────────────────────────────────

/**
 * VHS — Barrel distortion + tracking jitter + color bleed + scanlines + tape noise.
 * ANIMATED: uTime drives jitter and noise patterns.
 */
/**
 * VHS 2.0 — High-Fidelity Analog Emulation.
 * Professional RGB->YIQ->RGB color space signal processing
 * + Head-switching noise gap + horizontal limited-bandwidth smearing.
 */
class VHSFilter extends fabric.filters.BaseFilter<'VHSFilter'> {
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

      // YIQ Conversion Matrices
      const mat3 RGB_TO_YIQ = mat3(0.299, 0.587, 0.114, 0.596, -0.274, -0.322, 0.211, -0.523, 0.312);
      const mat3 YIQ_TO_RGB = mat3(1.0, 0.956, 0.621, 1.0, -0.272, -0.647, 1.0, -1.106, 1.703);

      float hashV(vec2 co){return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453);}

      void main(){
        vec2 uv = vTexCoord;
        float t = uTime;
        
        // 1. HEAD-SWITCHING NOISE
        float switchSize = 0.04 * uTracking;
        float isSwitch = step(1.0 - switchSize, uv.y);
        uv.x += isSwitch * (hashV(vec2(uv.y, floor(t * 30.0))) - 0.5) * 0.03 * uIntensity;

        // 2. MECHANICAL JITTER
        // Slow wobble (tape stretch) + fast vibration
        float jitter = (sin(uv.y * 30.0 + t * 8.0) * 0.0012 + (hashV(vec2(t, 0.0)) - 0.5) * 0.002) * uTracking;
        uv.x += jitter;

        // 3. COLOR SIGNAL CONVERSION (YIQ)
        vec4 base = texture2D(uTexture, clamp(uv, 0.001, 0.999));
        vec3 yiq = RGB_TO_YIQ * base.rgb;
        
        // 4. CHROMA BLEED (Horizontal low-pass on I and Q)
        float bSize = 0.012 * uBleed;
        vec3 i_sample = RGB_TO_YIQ * texture2D(uTexture, clamp(uv - vec2(bSize, 0.0), 0.0, 1.0)).rgb;
        vec3 q_sample = RGB_TO_YIQ * texture2D(uTexture, clamp(uv - vec2(bSize * 1.6, 0.0), 0.0, 1.0)).rgb;
        
        vec3 mixedYIQ = vec3(yiq.x, i_sample.y, q_sample.z);
        vec3 rgb = YIQ_TO_RGB * mixedYIQ;

        // 5. TAPE GRAIN & SCANLINES
        float grain = (hashV(uv + vec2(t * 0.1, t * 13.0)) - 0.5) * 0.1 * uIntensity;
        float scan = 1.0 - step(0.5, fract(uv.y * 240.0)) * 0.12 * uIntensity;

        // 6. SIGNAL DROPOUT
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

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Matrix — Digital rain overlay with animated column streaks.
 * ANIMATED: uTime drives rain position and character shimmer.
 */
class MatrixFilter extends fabric.filters.BaseFilter<'MatrixFilter'> {
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

        // Signed distance from head (wrapping)
        float relY   = fract(uv.y-headY);
        if(relY>0.5) relY=relY-1.0;   // wrap to -0.5..0.5
        float tailLen= 0.25+hashM(cell.x+2.0)*0.35;

        // Trail brightness (behind head = relY < 0)
        float trail  = relY<0.0 ? max(0.0,1.0+relY/tailLen) : 0.0;
        // Head flash
        float head   = smoothstep(0.04,0.0,abs(relY));
        // Character shimmer
        float flicker= hashM(cell.x+cell.y*137.0+floor(uTime*10.0)*7.3);
        trail       *= 0.5+flicker*0.5;

        // Color: white head → bright green → fading dark green
        vec3 headCol  = vec3(0.85,1.0,0.85);
        vec3 trailCol = vec3(0.0,1.0,0.3)*trail;
        vec3 matrix   = headCol*head + trailCol;

        // Add ambient green tint proportional to column activity
        vec3 ambient = vec3(0.0,0.05,0.0)*uIntensity;

        vec3 result = mix(color.rgb, matrix+ambient, min((trail+head)*uIntensity,1.0)*color.a);
        gl_FragColor=vec4(result,color.a);
      }
    `
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uIntensity, this.uIntensity)
    gl.uniform1f(u.uTime,      this.uTime)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Liquid Metal / Chrome — Animated metallic banding with specular noise.
 * ANIMATED: uTime drives the flowing chrome reflections.
 */
class LiquidMetalFilter extends fabric.filters.BaseFilter<'LiquidMetalFilter'> {
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
        // Animated metallic band driven by luminance + flowing noise
        float n=vnoise(uv*3.5+vec2(uTime*0.08,uTime*0.05));
        float band=fract(sin((lum+n*0.3)*12.566*uIntensity+uTime*0.4)*0.5+0.5);
        // Chrome palette: near-black → steel-grey → silver → specular-white
        vec3 chrome;
        if(band<0.28)      chrome=mix(vec3(0.02,0.02,0.03),vec3(0.20,0.23,0.28),band/0.28);
        else if(band<0.55) chrome=mix(vec3(0.20,0.23,0.28),vec3(0.68,0.74,0.82),(band-0.28)/0.27);
        else if(band<0.80) chrome=mix(vec3(0.68,0.74,0.82),vec3(0.95,0.97,1.00),(band-0.55)/0.25);
        else               chrome=mix(vec3(0.95,0.97,1.00),vec3(1.0), (band-0.80)/0.20);
        // Thin specular streak
        float spec=step(0.96,band)*0.6;
        chrome=clamp(chrome+spec,0.0,1.0);
        gl_FragColor=vec4(chrome*color.a,color.a);
      }
    `
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uIntensity, this.uIntensity)
    gl.uniform1f(u.uTime,      this.uTime)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ─── ② OPTICAL FILTERS ───────────────────────────────────────────────────────

/**
 * Thermal 2.0 — Heat Pulse Edition.
 * Professional 7-stop FLIR spectrometry mapping + rising heat-haze (UV distortion)
 * + high-temperature IR glow. Simulates tactical infrared optics.
 */
class ThermalFilter extends fabric.filters.BaseFilter<'ThermalFilter'> {
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

      // Professional 7-stop FLIR Gradient Mapping
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
        
        // 1. HEAT HAZE DISTORTION (UV Warping)
        // High luma areas trigger the "shimmer"
        vec4 sampleColor = texture2D(uTexture, uv);
        float luma_ref = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
        
        float shimmer = sin(uv.x * 25.0 + uTime * 6.0) * 0.004 * uHaze * luma_ref;
        vec2 distortedUV = uv + vec2(0.0, shimmer);
        
        vec4 color = texture2D(uTexture, distortedUV);
        if (color.a < 0.01) discard;

        // 2. THERMAL CORE (Normalized spectrometry)
        float luma = clamp((dot(color.rgb, vec3(0.299, 0.587, 0.114)) + uShift) * uThreshold, 0.0, 1.0);
        vec3 therm = thermal_ramp(luma);

        // 3. FINAL COMPOSITE
        vec3 result = mix(color.rgb, therm, uIntensity);
        
        // IR Glow bloom for hot peaks (white-hot)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  isNeutralState() { return this.uIntensity === 0 }
}
// @ts-ignore
fabric.classRegistry.setClass(ThermalFilter, 'ThermalFilter')

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prism — Radial chromatic aberration from object center.
 * Upgraded to full WebGL radial dispersion.
 */
/**
 * Prism 2.0 — Glass Spectral Edition.
 * Iterative 5-tap dispersion for smooth rainbow fringes + barrel lens distortion
 * + Fresnel reflectance for high-end optical glass simulation.
 */
class PrismFilter extends fabric.filters.BaseFilter<'PrismFilter'> {
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
        
        // 1. BARREL DISTORTION (Lens Thickness)
        vec2 distortedUV = uv + dir * (d * d) * uDistortion * uRadius;
        
        // 2. ITERATIVE SPECTRAL DISPERSION (5-Tap)
        vec3 result = vec3(0.0);
        float totalWeight = 0.0;
        
        // Dispersion vector based on radial distance
        vec2 aberr = dir * uDispersion * 0.06;
        
        for(float i=0.0; i<5.0; i++) {
            float offset = (i / 4.0) - 0.5;
            // Sample color at wavelength offset
            vec4 s = texture2D(uTexture, clamp(distortedUV + aberr * offset, 0.001, 0.999));
            
            // Physical spectral weights: Red, Yellow-Green, Blue-Violet
            vec3 tint = vec3(
                max(0.0, 1.0 - abs(offset - 0.5) * 4.0), 
                max(0.0, 1.0 - abs(offset - 0.0) * 4.0), 
                max(0.0, 1.0 - abs(offset + 0.5) * 4.0)
            );
            
            result += s.rgb * tint;
            totalWeight += (tint.r + tint.g + tint.b) / 3.0;
        }
        
        result /= (totalWeight * 0.9); // Normalization
        
        // 3. FRESNEL SURFACE GLINT
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTo2d({ imageData }: any) {
    const { data, width, height } = imageData
    const copy  = new Uint8ClampedArray(data)
    const shift = Math.round(this.amount)
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

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Neon Glow — Inner edge glow with luminance-driven bloom and pulse animation.
 * ANIMATED: uTime drives the pulse frequency.
 */
/**
 * Neon Glow 2.0 — Cyber-Emissive Edition.
 * Physically informed inverse-square bloom + chromatic light bleed
 * + temporal gas-flicker (hum). Simulates professional cyberpunk light tubes.
 */
class NeonGlowFilter extends fabric.filters.BaseFilter<'NeonGlowFilter'> {
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
        
        // 1. INVERSE-SQUARE BLOOM ENGINE (8-Tap Sparse Jitter)
        vec3 glow = vec3(0.0);
        float noise = fract(sin(dot(uv, vec2(12.989, 78.233))) * 43758.5453 + uTime);
        
        float r = uGlowRange * 0.015;
        for(int i=0; i<8; i++){
          float angle = float(i) * 0.785398 + noise;
          vec2 off = vec2(cos(angle), sin(angle)) * r;
          
          vec4 s = texture2D(uTexture, clamp(uv + off, 0.0, 1.0));
          
          // Physical decay: 1 / (1 + dist^2)
          float d = length(off) * 60.0;
          float decay = 1.0 / (1.0 + d * d);
          
          // Sample brightness contribution
          float b = dot(s.rgb, vec3(0.299, 0.587, 0.114));
          glow += s.rgb * s.a * decay * smoothstep(0.1, 0.9, b);
        }
        glow /= 8.0;

        // 2. CHROMATIC SHIFT & TEMPORAL FLICKER (Electrical Hum)
        float hum = 1.0 + sin(uTime * 25.0 * uFlicker) * 0.04 * uFlicker;
        vec3 tint = uGlowTint / 255.0;
        
        // Chromatic shift: glow color shifts based on intensity
        vec3 spectralGlow = mix(tint, vec3(1.0, 1.0, 1.0), 0.2); 
        vec3 finalGlow = glow * spectralGlow * uIntensity * 12.0 * hum;
        
        // 3. CORE SHARPENING (Over-exposed emissive center)
        vec3 core = color.rgb * (1.0 + uIntensity * 0.6);
        
        // Screen blend logic
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Holographic — HSV rainbow iridescence overlay animated over time.
 * ANIMATED: uTime shifts the hue continuously.
 */
/**
 * Holographic 2.0 — Iridescent Projection Edition.
 * Analytical thin-film interference (rainbow shimmer) + Fresnel edge-glow
 * + drifting holographic scanlines. Transforms objects into glowing foils.
 */
class HolographicFilter extends fabric.filters.BaseFilter<'HolographicFilter'> {
  static type = 'Holographic'
  static uniformLocations = ['uThickness', 'uIridescence', 'uGlow', 'uTime', 'uScanlineSpeed', 'uBaseTint']
  
  uThickness      = 1.5
  uIridescence    = 0.6
  uGlow           = 0.5
  uTime           = 0.0
  uScanlineSpeed  = 1.0
  uBaseTint       = [150, 220, 255] // Cyan/Light Blue

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

      // Mathematical spectral approximation for smooth thin-film rainbows
      vec3 irid_spectra(float delta) {
          vec3 col = vec3(0.5) + 0.5 * cos(6.28318 * (vec3(1.0, 0.66, 0.33) + delta));
          return clamp(col, 0.0, 1.0);
      }

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        if (color.a < 0.01) discard;

        // 1. PSEUDO-NORMAL & FRESNEL (Edge intensity)
        vec2 dist = uv - 0.5;
        float l = length(dist);
        float fresnel = pow(l * 1.8, 3.5) * uGlow;
        
        // 2. THIN-FILM INTERFERENCE (Iridescence)
        float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
        float phase = l * uThickness + noise * 0.06 + uTime * 0.12;
        vec3 irid = irid_spectra(phase) * uIridescence;

        // 3. HOLOGRAPHIC SCANLINES & JITTER
        float scan = sin(uv.y * 130.0 - uTime * 22.0 * uScanlineSpeed) * 0.06 * uIridescence;
        float flicker = step(0.992, fract(sin(uTime * 12.0))) * 0.12;
        
        // 4. FINAL COMPOSITE
        vec3 tint = uBaseTint / 255.0;
        vec3 base = color.rgb * tint;
        
        // Additive-like glow logic
        vec3 final = base + irid + vec3(scan + flicker) + vec3(fresnel * 0.5);
        
        // Fade alpha at edges to enhance the "projected light" feel
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const iri = this.uIridescence * 0.3
    // CPU fallback: Luminance-driven rainbow tint
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

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bloom — Threshold-based luminance bloom via 5×5 box blur + additive blend.
 */
/**
 * Bloom 2.0 — Cinematic Glow Edition.
 * Jittered 12-tap Kawase-style sampling + Anamorphic stretching 
 * + Adaptive Soft-Knee Thresholding for premium light-bleed.
 */
class BloomFilter extends fabric.filters.BaseFilter<'BloomFilter'> {
  static type = 'BloomFilter'
  static uniformLocations = ['uThreshold', 'uStrength', 'uRadius', 'uTime', 'uGlowTint']
  
  uThreshold = 0.5
  uStrength  = 0.8
  uRadius    = 1.5
  uTime      = 0.0
  uGlowTint  = [255, 255, 255]

  constructor(opts?: any) {
    super()
    if (opts?.uThreshold !== undefined) this.uThreshold = opts.uThreshold
    if (opts?.uStrength  !== undefined) this.uStrength  = opts.uStrength
    if (opts?.uRadius    !== undefined) this.uRadius    = opts.uRadius
    if (opts?.uTime      !== undefined) this.uTime      = opts.uTime
    if (opts?.uGlowTint  !== undefined) this.uGlowTint  = opts.uGlowTint
  }

  getFragmentSource(): string {
    return `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uThreshold, uStrength, uRadius, uTime;
      uniform vec3 uGlowTint;

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        
        // 1. ADAPTIVE LUMINANCE THRESHOLD (Soft-Knee)
        float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
        float knee = 0.12;
        float soft = max(0.0, luma - uThreshold + knee);
        soft = (soft * soft) / (soft + knee * 4.0);
        float brightness = max(soft, luma - uThreshold);

        // 2. JITTERED KAWASE SAMPLING (12-Tap)
        vec3 glow = vec3(0.0);
        float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453 + uTime);
        
        // Sparse sampling kernel
        vec2 d[4];
        d[0]=vec2(1.,1.); d[1]=vec2(-1.,1.); d[2]=vec2(-1.,-1.); d[3]=vec2(1.,-1.);
        
        float r = uRadius * 0.012;
        for(int i=0; i<4; i++){
          // 3 layers of diffusion
          for(float j=1.0; j<=3.0; j++){
            vec2 off = d[i] * r * j + (noise - 0.5) * r * 0.4;
            // Anamorphic horizontal stretch
            off.x *= 1.45;
            vec4 s = texture2D(uTexture, clamp(uv + off, 0.001, 0.999));
            float sl = dot(s.rgb, vec3(0.2126, 0.7152, 0.0722));
            glow += s.rgb * smoothstep(uThreshold - 0.1, uThreshold + 0.2, sl);
          }
        }
        glow /= 12.0;

        // 3. FINAL COMPOSITE
        vec3 tint = uGlowTint / 255.0;
        vec3 finalGlow = glow * tint * uStrength * 2.8;
        
        // Screen blend for highlights
        vec3 finalColor = color.rgb + finalGlow;
        
        gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0) * color.a, color.a);
      }
    `
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uThreshold,  this.uThreshold)
    gl.uniform1f(u.uStrength,   this.uStrength)
    gl.uniform1f(u.uRadius,      this.uRadius)
    gl.uniform1f(u.uTime,        this.uTime)
    gl.uniform3fv(u.uGlowTint,   new Float32Array(this.uGlowTint.map(c => c/255)))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const strength = this.uStrength * 0.4
    // CPU fallback: Luminance-targeted gamma boost
    for (let i = 0; i < data.length; i += 4) {
      const l = (data[i]*0.21 + data[i+1]*0.71 + data[i+2]*0.07)/255
      if (l > this.uThreshold) {
        data[i]   = clamp(data[i]   + (255 - data[i])   * strength)
        data[i+1] = clamp(data[i+1] + (255 - data[i+1]) * strength)
        data[i+2] = clamp(data[i+2] + (255 - data[i+2]) * strength)
      }
    }
  }
}

// @ts-ignore
fabric.classRegistry.setClass(BloomFilter, 'BloomFilter')

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pixelate — Hard pixel art quantization via UV flooring.
 */
/**
 * Pixelate 2.0 — Retro-Mod Mosaic.
 * Support for Square, Hexagonal, and Triangular grids + 4x4 Bayer Dithering
 * + 3D Tile Beveling. Preserves sharp silhouttes with high-res alpha.
 */
class PixelateFilter extends fabric.filters.BaseFilter<'PixelateFilter'> {
  static type = 'PixelateFilter'
  static uniformLocations = ['uBlockSize', 'uGridMode', 'uDither', 'uBevel']
  
  uBlockSize = 8.0
  uGridMode  = 0.0 // 0=Sq, 1=Hex, 2=Tri
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

      // 4x4 Bayer Matrix for Ordered Dithering
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
        
        // 1. DYNAMIC GRID GEOMETRY
        if (uGridMode > 0.5 && uGridMode < 1.5) {
          // HEXAGONAL COORDINATES
          gridUV.x += step(1.0, mod(uv.y * res * 0.866, 2.0)) * (0.5 / res);
        } else if (uGridMode >= 1.5) {
          // TRIANGULAR (Offset rows)
          gridUV.x += step(1.0, mod(uv.y * res, 2.0)) * (0.5 / res);
        }

        vec2 block = floor(gridUV * res + 0.5) / res;
        vec4 color = texture2D(uTexture, block);
        if (color.a < 0.01) discard;

        // 2. 3D BEVELING (Tile Depth)
        vec2 f = fract(gridUV * res);
        float bevel = smoothstep(0.0, 0.15, f.x) * smoothstep(1.0, 0.85, f.x) *
                      smoothstep(0.0, 0.15, f.y) * smoothstep(1.0, 0.85, f.y);
        vec3 col = color.rgb;
        // Mock lighting: darken bottom-right, lighten top-left
        col *= (0.9 + bevel * 0.15 * uBevel);
        
        // 3. ORDERED BAYER DITHERING
        float threshold = bayer4(uv * 1024.0);
        float luma = dot(col, vec3(0.299, 0.587, 0.114));
        float dither = (threshold - 0.5) * uDither * 0.2;
        col = clamp(col + dither, 0.0, 1.0);

        // 4. SILHOUETTE GUARD (Preserve sharp vector borders)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTo2d({ imageData }: any) {
    const { data } = imageData
    // CPU Fallback: Simplified square pixelation
    const ps = Math.max(2, Math.round(this.uBlockSize))
    for (let x = 0; x < imageData.width; x += ps) {
      for (let y = 0; y < imageData.height; y += ps) {
        // Average slightly then fill block
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

// ─── ③ TEXTURE FILTERS ───────────────────────────────────────────────────────

/**
 * Grain 2.0 — Emulsion Engine.
 * Luminance-weighted noise + chromatic dye-layer simulation
 * + Soft-Light physical blending for authentic film stock feel.
 */
class GrainFilter extends fabric.filters.BaseFilter<'GrainFilter'> {
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
        
        // 1. LUMINANCE WEIGHTING (Analog emulsion is most visible in midtones)
        // Bell-curve centered at 0.35 brightness
        float weight = 1.0 - pow(abs(luma - 0.35) * 1.6, 2.0);
        weight = clamp(weight, 0.15, 1.0) * uIntensity;

        // 2. EMULSION LAYERS (Chromatic Grain)
        vec2 p = vTexCoord * 1850.0 + uTime * 0.04;
        float nr = hashGr(p + 0.11);
        float ng = hashGr(p + 0.22);
        float nb = hashGr(p + 0.33);
        
        vec3 grain = vec3(nr, ng, nb);
        float mono = (nr + ng + nb) * 0.333;
        grain = mix(vec3(mono), grain, uColorSaturation);

        // 3. SOFT-LIGHT BLENDING
        // Preserves image contrast and exposure better than additive noise
        vec3 final = color.rgb;
        vec3 blend = grain;
        
        // (1-2*blend)*base^2 + 2*blend*base
        final = (vec3(1.0) - 2.0 * blend) * final * final + 2.0 * blend * final;
        
        // Fade the grain integration by the luminance weight
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paper Fiber — Organic surface noise for paper/canvas feel.
 */
/**
 * Fiber 2.0 — Organic Stock Edition.
 * Anisotropic (stretched) pulp synthesis + clumping domain warping
 * + Tonal relief (3D shading) for authentic paper/canvas tooth.
 */
class FiberFilter extends fabric.filters.BaseFilter<'FiberFilter'> {
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

      // Anisotropic fiber-like noise
      float pulp_noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        // Stretched coordinate for fiber needle look
        vec2 st = vec2(1.0, 15.0);
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

        // 1. DOMAIN WARPING (Clumping engine)
        float warp = hashF(uv * 4.0) * 0.15;
        vec2 p = uv * 320.0 * uScale + warp;
        
        // 2. FIBER SYNTHESIS
        float f1 = pulp_noise(p);
        float f2 = pulp_noise(p * 2.2 + 8.0);
        float n = (f1 * 0.65 + f2 * 0.35);

        // 3. TONAL RELIEF (3D Tooth Shading)
        float tooth = smoothstep(0.42, 0.58, n);
        // Physical "dent" shading
        float shading = 1.0 - (tooth * 0.18 * uRoughness * uIntensity);
        
        // 4. FINAL COMPOSITE
        vec3 final = color.rgb * shading;
        // Subtle highlight for fiber tips
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const strength = this.uIntensity * 40
    // CPU Fallback: Oriented jitter
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * strength
      data[i] = clamp(data[i] + n); data[i+1] = clamp(data[i+1] + n); data[i+2] = clamp(data[i+2] + n)
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(FiberFilter, 'Fiber')

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Halftone — WebGL dot-grid with luminance-driven dot radius.
 */
class EliteHalftone extends fabric.filters.BaseFilter<'EliteHalftone'> {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uSize, this.uSize)
    gl.uniform1f(u.uIntensity, this.uIntensity)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ─────────────────────────────────────────────────────────────────────────────

/**
 * ASCII Art — CPU character-density mapping (intentionally CPU-only).
 */
class ASCIIFilter extends fabric.filters.BaseFilter<'ASCIIFilter'> {
  static type = 'ASCIIFilter'
  cellSize  = 8
  intensity = 1.0

  constructor(opts?: any) {
    super()
    if (opts?.uSize !== undefined) this.cellSize = opts.uSize
    if (opts?.intensity !== undefined) this.intensity = opts.intensity
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ─── ④ STYLE FILTERS ─────────────────────────────────────────────────────────

/**
 * Risograph 2.0 — Mechanical Plate Edition.
 * Decomposes image into virtual ink drums (plates) with misregistration,
 * dot gain, and subtractive overprint blending.
 */
class Risograph extends fabric.filters.BaseFilter<'Risograph'> {
  static type = 'Risograph'
  static uniformLocations = ['uDotSize', 'uMisregistration', 'uDotGain', 'uInk1', 'uInk2', 'uPaperColor']
  
  uDotSize         = 1.0
  uMisregistration = 0.2
  uDotGain         = 0.15
  uInk1            = [255, 0, 150] // Fluo Pink
  uInk2            = [0, 80, 255]  // Deep Blue
  uPaperColor      = [250, 248, 240] // Creamy Stock

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
      uniform float uDotSize;
      uniform float uMisregistration;
      uniform float uDotGain;
      uniform vec3 uInk1;
      uniform vec3 uInk2;
      uniform vec3 uPaperColor;

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        if (color.a < 0.01) discard;

        // 1. DYNAMIC COLOR SPLITTING (Luma to Plates)
        float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        // Plate 1: Targets highlights/midtones
        float plate1 = smoothstep(0.35, 0.9, luma);         
        // Plate 2: Targets shadows/midtones
        float plate2 = smoothstep(0.0, 0.55, 1.0 - luma);   

        // 2. MECHANICAL MISREGISTRATION (Plate shift)
        vec2 off1 = vec2(0.0018 * uMisregistration, 0.0);
        vec2 off2 = vec2(-0.0012 * uMisregistration, 0.0008 * uMisregistration);
        
        // 3. HALFTONE DOTS with DOT GAIN (Rotated screens)
        float angle1 = 0.26; // 15 deg
        float angle2 = 1.30; // 75 deg
        mat2 rot1 = mat2(cos(angle1), -sin(angle1), sin(angle1), cos(angle1));
        mat2 rot2 = mat2(cos(angle2), -sin(angle2), sin(angle2), cos(angle2));
        
        vec2 st1 = rot1 * (uv + off1) * (140.0 / max(uDotSize, 0.1));
        vec2 st2 = rot2 * (uv + off2) * (120.0 / max(uDotSize, 0.1)); 
        
        float dist1 = length(fract(st1) - 0.5);
        float dist2 = length(fract(st2) - 0.5);

        // Dot growth based on plate intensity + Dot Gain factor
        float size1 = (1.0 - plate1) * 0.7 + uDotGain * 0.3;
        float size2 = plate2 * 0.7 + uDotGain * 0.3;
        
        float mask1 = 1.0 - smoothstep(size1 - 0.1, size1 + 0.1, dist1);
        float mask2 = 1.0 - smoothstep(size2 - 0.1, size2 + 0.1, dist2);

        // 4. OVERPRINT BLENDING (Multiply Logic)
        vec3 paper = uPaperColor / 255.0;
        vec3 i1    = uInk1 / 255.0;
        vec3 i2    = uInk2 / 255.0;
        
        vec3 result = paper;
        // Apply Plate 1 (Ink Multiply)
        result = mix(result, result * i1, mask1);
        // Apply Plate 2 (Ink Multiply)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTo2d({ imageData }: any) {
    const { data } = imageData
    // CPU fallback: Simplified duotone halftone
    const i1 = this.uInk1, i2 = this.uInk2, p = this.uPaperColor
    for (let i = 0; i < data.length; i += 4) {
      const l = (data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114) / 255
      const mixVal = Math.floor(l * 2) / 2 // crude quantization
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

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Elite Clay 2.0 — Maximum Premium Edition.
 * Analytical Subsurface Scattering (SSS) + Wrap-Around Lighting + Subdermal Saturation.
 * Transforms objects into photorealistic 3D "soft-sculpted" clay/plastic.
 */
class EliteClay extends fabric.filters.BaseFilter<'EliteClay'> {
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
      uniform float uInflate;
      uniform float uGlow;
      uniform float uMatte;
      uniform float uLightAngle;
      uniform float uTranslucency;

      void main(){
        vec2 uv = vTexCoord;
        vec4 color = texture2D(uTexture, uv);
        if (color.a < 0.01) discard;

        // 1. DYNAMIC NORMAL & THICKNESS SENSING
        // Distance 's' dictates how "chunky" or "tight" the edge embossing feels
        float s = 0.002 + (uInflate * 0.012); 
        float aT = texture2D(uTexture, uv + vec2(0.0, s)).a;
        float aB = texture2D(uTexture, uv + vec2(0.0, -s)).a;
        float aL = texture2D(uTexture, uv + vec2(-s, 0.0)).a;
        float aR = texture2D(uTexture, uv + vec2(s, 0.0)).a;
        
        // Normal vector from alpha gradient (Sobel-like)
        vec3 normal = normalize(vec3(aL - aR, aB - aT, 0.52 / max(uInflate, 0.05)));
        
        // Thickness approximation (inverse curvature for SSS logic)
        float edges = abs(aL - aR) + abs(aT - aB);
        float thickness = smoothstep(0.0, 0.8, 1.0 - edges);

        // 2. LIGHTING MODEL (Wrap-Around + SSS)
        float rad = uLightAngle * 0.0174533;
        vec3 L = normalize(vec3(cos(rad), sin(rad), 1.0)); // Light Source
        vec3 V = vec3(0.0, 0.0, 1.0);                     // View Vector
        vec3 H = normalize(L + V);                        // Half Vector for Specular
        
        // Diffuse with Wrap-Around (Softening the Terminator)
        // This is key for the "clay" vs "stone" feel
        float wrap = 0.4;
        float diff = max(0.0, (dot(normal, L) + wrap) / (1.0 + wrap));
        
        // ANALYTICAL SUBSURFACE SCATTERING: Light bleeding through translucent edges
        float sss = pow(max(0.0, dot(V, -L)), 3.0) * (1.0 - thickness) * uTranslucency * 2.1;
        
        // Subdermal saturation boost in the light-to-shadow transition zone
        float saturationBoost = smoothstep(0.3, 0.7, diff) * (1.0 - diff) * uMatte * 2.2;

        // 3. SPECULARITY (Sharp Gloss + Soft Sheen)
        float specSharp = pow(max(dot(normal, H), 0.0), 64.0) * uGlow * 1.8;
        float specSoft  = pow(max(dot(normal, H), 0.0), 12.0) * uGlow * 0.5;
        
        // 4. FINAL COMPOSITE
        vec3 base = color.rgb;
        // Apply saturation shift (Warmth in the shadows)
        base = mix(base, base * vec3(1.15, 0.85, 0.75), saturationBoost);
        
        // Combine base lighting with red-shifted SSS and dual-specular
        vec3 final = base * (0.32 + 0.68 * diff) + (sss * vec3(1.0, 0.25, 0.1)) + (specSharp + specSoft);
        
        // Procedural Matte Grain
        float grain = (fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * uMatte * 0.14;
        final += grain;

        gl_FragColor = vec4(clamp(final, 0.0, 1.0) * color.a, color.a);
      }
    `
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uInflate,     this.uInflate)
    gl.uniform1f(u.uGlow,        this.uGlow)
    gl.uniform1f(u.uMatte,       this.uMatte)
    gl.uniform1f(u.uLightAngle,  this.uLightAngle)
    gl.uniform1f(u.uTranslucency, this.uTranslucency)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const glow = this.uGlow * 45
    const mat  = this.uMatte * 18
    // CPU approximation: Simple embossing + luminance boost
    for (let i = 0; i < data.length; i += 4) {
      const g = (Math.random() - 0.5) * mat
      data[i]   = Math.min(255, Math.max(0, data[i]   + glow + g))
      data[i+1] = Math.min(255, Math.max(0, data[i+1] + glow * 0.85 + g))
      data[i+2] = Math.min(255, Math.max(0, data[i+2] + glow * 0.75 + g))
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(EliteClay, 'EliteClay')

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Oil Paint — Simplified Kuwahara: per-pixel, pick the quadrant with minimum
 * color variance from the center sample. Creates a painterly, brushed look.
 */
class OilPaintFilter extends fabric.filters.BaseFilter<'OilPaintFilter'> {
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
        
        // 1. REFINED QUADRANT ENGINE (8-Tap sparse Kuwahara)
        float r = uRadius * 0.005;
        
        // Directional offsets for 4 quadrants
        vec2 off[8];
        off[0]=vec2(-r,-r); off[1]=vec2(0.0,-r);
        off[2]=vec2(r,-r);  off[3]=vec2(r,0.0);
        off[4]=vec2(r,r);   off[5]=vec2(0.0,r);
        off[6]=vec2(-r,r);  off[7]=vec2(-r,0.0);
        
        // Sample quadrants to find mean colors
        vec3 q0 = (texture2D(uTexture, clamp(uv + off[0], 0.0, 1.0)).rgb + texture2D(uTexture, clamp(uv + off[1], 0.0, 1.0)).rgb) * 0.5;
        vec3 q1 = (texture2D(uTexture, clamp(uv + off[2], 0.0, 1.0)).rgb + texture2D(uTexture, clamp(uv + off[3], 0.0, 1.0)).rgb) * 0.5;
        vec3 q2 = (texture2D(uTexture, clamp(uv + off[4], 0.0, 1.0)).rgb + texture2D(uTexture, clamp(uv + off[5], 0.0, 1.0)).rgb) * 0.5;
        vec3 q3 = (texture2D(uTexture, clamp(uv + off[6], 0.0, 1.0)).rgb + texture2D(uTexture, clamp(uv + off[7], 0.0, 1.0)).rgb) * 0.5;

        // Pick quadrant with minimum variance (simplified via distance to center)
        float d0 = length(q0 - color.rgb);
        float d1 = length(q1 - color.rgb);
        float d2 = length(q2 - color.rgb);
        float d3 = length(q3 - color.rgb);
        
        vec3 best = q0; float minD = d0;
        if(d1 < minD) { best = q1; minD = d1; }
        if(d2 < minD) { best = q2; minD = d2; }
        if(d3 < minD) { best = q3; minD = d3; }

        // 2. IMPASTO RELIEF (3D Shading)
        // Detect local slope for paint thickness
        float hL = dot(texture2D(uTexture, uv + vec2(-0.002, 0.0)).rgb, vec3(0.33));
        float hR = dot(texture2D(uTexture, uv + vec2( 0.002, 0.0)).rgb, vec3(0.33));
        float hT = dot(texture2D(uTexture, uv + vec2( 0.0, -0.002)).rgb, vec3(0.33));
        float hB = dot(texture2D(uTexture, uv + vec2( 0.0,  0.002)).rgb, vec3(0.33));
        
        // Normal vector from height gradient
        vec3 normal = normalize(vec3(hL - hR, hT - hB, 0.2 / max(0.01, uImpasto)));
        vec3 light = normalize(vec3(1.0, 1.0, 1.2));
        float diff = max(0.0, dot(normal, light));
        
        // 3. FINAL COMPOSITE
        vec3 paint = mix(color.rgb, best, uCoherence);
        // Apply directional relief with specular highlight
        vec3 shaded = paint * (0.85 + diff * 0.35);
        
        // Add subtle bristle noise
        float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453) * 0.05 * uImpasto;
        shaded += noise;

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const strength = this.uIntensity * 0.5
    for (let i = 0; i < data.length; i += 4) {
      data[i]   = clamp(data[i]   * (1 + this.uImpasto * 0.2))
      data[i+1] = clamp(data[i+1] * (1 + this.uImpasto * 0.2))
      data[i+2] = clamp(data[i+2] * (1 + this.uImpasto * 0.2))
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(OilPaintFilter, 'OilPaint')

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Outline 2.0 — Dynamic Silhouette Edition.
 * Anti-aliased 9-tap Sobel engine + sub-pixel smoothing
 * + internal light bleed for premium sticker/vector effects.
 */
class OutlineFilter extends fabric.filters.BaseFilter<'OutlineFilter'> {
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
        
        // 1. SUB-PIXEL SOBEL ENGINE (9-Tap Alpha)
        float t = uThickness * 0.0018;
        float tl = texture2D(uTexture, clamp(uv + vec2(-t, -t), 0.0, 1.0)).a;
        float tc = texture2D(uTexture, clamp(uv + vec2( 0.0, -t), 0.0, 1.0)).a;
        float tr = texture2D(uTexture, clamp(uv + vec2( t, -t), 0.0, 1.0)).a;
        float ml = texture2D(uTexture, clamp(uv + vec2(-t, 0.0), 0.0, 1.0)).a;
        float mr = texture2D(uTexture, clamp(uv + vec2( t, 0.0), 0.0, 1.0)).a;
        float bl = texture2D(uTexture, clamp(uv + vec2(-t, t), 0.0, 1.0)).a;
        float bc = texture2D(uTexture, clamp(uv + vec2( 0.0, t), 0.0, 1.0)).a;
        float br = texture2D(uTexture, clamp(uv + vec2( t, t), 0.0, 1.0)).a;
        
        float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
        float gy = -tl - 2.0*tc - tr + bl + 2.0*bc + br;
        float edge = sqrt(gx*gx + gy*gy);

        // 2. ANTI-ALIASING & SMOOTHING
        // Refined threshold with smooth transition
        float stroke = smoothstep(0.4 - uSoftness, 0.45 + uSoftness, edge);
        
        // 3. INNER GLOW BLEED (Internal scattering)
        float inner = smoothstep(0.1, 0.7, edge) * color.a * uInnerGlow;
        
        // Color conversion
        vec3 tint = uOutlineColor / 255.0;
        
        // 4. FINAL COMPOSITE
        vec3 result = mix(color.rgb, tint, stroke);
        // Apply inner bleed
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const t = this.uOutlineColor
    const strength = this.uThickness * 0.1
    // CPU fallback: Simplified white-balance shift toward outline color
    for (let i = 0; i < data.length; i += 4) {
      if (data[i+3] > 0 && data[i+3] < 255) {
        data[i]   = clamp(data[i]   + (t[0] - data[i])   * strength)
        data[i+1] = clamp(data[i+1] + (t[1] - data[i+1]) * strength)
        data[i+2] = clamp(data[i+2] + (t[2] - data[i+2]) * strength)
      }
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(OutlineFilter, 'OutlineFilter')

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Duotone — Two-color tonal mapping via WebGL luminance ramp.
 */
/**
 * Duotone 2.0 — Editorial Split-Tonality Edition.
 * Professional 3-way color grading (Shadows, Midtones, Highlights)
 * + Perceptual luminance mapping + Adaptive contrast S-curves.
 */
class DuotoneFilter extends fabric.filters.BaseFilter<'DuotoneFilter'> {
  static type = 'Duotone'
  static uniformLocations = ['uShadowColor', 'uMidColor', 'uHighlightColor', 'uContrast', 'uIntensity']
  
  uShadowColor    = [0, 10, 60]    // Deep Navy
  uMidColor       = [120, 150, 180] // Steel
  uHighlightColor = [255, 230, 200] // Warm Ivory
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
        
        // 1. PERCEPTUAL LUMINANCE
        float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
        
        // 2. CONTRAST HUB (Adaptive Curve)
        luma = pow(luma, uContrast);
        
        // 3. 3-WAY SPLIT TONING (Shadows, Midtones, Highlights)
        // Transition masks
        float shadowMask = 1.0 - smoothstep(0.0, 0.45, luma);
        float highlightMask = smoothstep(0.55, 1.0, luma);
        float midMask = 1.0 - shadowMask - highlightMask;
        
        vec3 sc = uShadowColor / 255.0;
        vec3 mc = uMidColor / 255.0;
        vec3 hc = uHighlightColor / 255.0;
        
        vec3 graded = (shadowMask * sc) + 
                     (midMask * mc) + 
                     (highlightMask * hc);
        
        // 4. FINAL COMPOSITE
        vec3 result = mix(color.rgb, graded, uIntensity);
        gl_FragColor = vec4(result * color.a, color.a);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const sc = this.uShadowColor
    const hc = this.uHighlightColor
    // CPU fallback: Luminance-weighted blend between shadow and highlight
    for (let i = 0; i < data.length; i += 4) {
      const l = (data[i]*0.21 + data[i+1]*0.72 + data[i+2]*0.07)/255
      data[i]   = Math.round(sc[0] + (hc[0] - sc[0]) * l)
      data[i+1] = Math.round(sc[1] + (hc[1] - sc[1]) * l)
      data[i+2] = Math.round(sc[2] + (hc[2] - sc[2]) * l)
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(DuotoneFilter, 'Duotone')

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Posterize 2.0 — Smart Quantization Edition.
 * Professional Bayer-dithered quantization + edge-preserving detail protection
 * + Pop-Art vibrance tuning. Simulates high-end silk-screen prints.
 */
class PosterizeFilter extends fabric.filters.BaseFilter<'PosterizeFilter'> {
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

      // 4x4 Bayer Matrix for high-fidelity ordered dithering
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
        
        // 1. DETAIL PROTECTION (Sobel-based silhouette)
        vec2 off = 1.0 / vec2(600.0); 
        float h = dot(texture2D(uTexture, uv + vec2(off.x, 0.0)).rgb, vec3(0.33));
        float v = dot(texture2D(uTexture, uv + vec2(0.0, off.y)).rgb, vec3(0.33));
        float edge = abs(h - dot(color.rgb, vec3(0.33))) + abs(v - dot(color.rgb, vec3(0.33)));

        // 2. DITHERED QUANTIZATION
        // Structured noise breaks up banding artifacts
        float bay = bayer4x4(gl_FragCoord.xy);
        vec3 inputCol = color.rgb + (bay - 0.5) * uDither * 0.18;
        
        float stepSize = 1.0 / max(uSteps - 1.0, 1.0);
        vec3 post = floor(inputCol / stepSize + 0.5) * stepSize;
        
        // 3. POP-ART VIBRANCE BOOST
        vec3 vibrance = post * (1.0 + uVibrance * 0.5);
        vec3 finalResult = mix(post, vibrance, uVibrance);
        
        // Anti-posterized edges for maximum sharpness
        vec3 result = mix(finalResult, color.rgb, clamp(edge * 8.0 * (1.1 - uThreshold), 0.0, 1.0));

        gl_FragColor = vec4(clamp(result, 0.0, 1.0), color.a);
      }
    `
  }

  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uSteps,      this.uSteps)
    gl.uniform1f(u.uDither,     this.uDither)
    gl.uniform1f(u.uVibrance,   this.uVibrance)
    gl.uniform1f(u.uThreshold,  this.uThreshold)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const s = 255 / Math.max(1, this.uSteps - 1)
    for (let i = 0; i < data.length; i += 4) {
      data[i]   = Math.round(data[i]   / s) * s
      data[i+1] = Math.round(data[i+1] / s) * s
      data[i+2] = Math.round(data[i+2] / s) * s
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(PosterizeFilter, 'PosterizeFilter')

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vignette 2.0 — Physical Lens Restoration Edition.
 * Quadratic + Cosine Fourth Law falloff approximation (Natural Decay)
 * + Saturation-preserving luminance blending + Radial chromatic dispersion.
 */
class VignetteFilter extends fabric.filters.BaseFilter<'VignetteFilter'> {
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
        vec2 center = vec2(0.5);
        
        // 1. ANAMORPHIC OVAL MAPPING
        vec2 distVec = (uv - center);
        distVec.x *= uAspect;
        float d = length(distVec) * 2.0;

        // 2. RADIAL CHROMATIC DISPERSION
        // Shift increases with distance squared for professional aesthetics
        float ca = uAberration * 0.015 * (d * d);
        vec2 caDir = normalize(uv - center) * ca;
        
        float r = texture2D(uTexture, clamp(uv + caDir, 0.0, 1.0)).r;
        float g = texture2D(uTexture, uv).g;
        float b = texture2D(uTexture, clamp(uv - caDir, 0.0, 1.0)).b;
        vec3 col = vec3(r, g, b);

        // 3. PHYSICAL FALLOFF (Quadratic + Cos^4 approximation)
        float mask = smoothstep(uRadius, uRadius + 0.65, d);
        float falloff = clamp(1.0 - (mask * mask * uStrength), 0.0, 1.0);
        
        // 4. SATURATION-PRESERVING LUMINANCE BLENDING
        // Prevents muddy grey corners by mixing toward a rich darker version of the hue
        float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
        vec3 darkened = col * falloff;
        // Rich shadows preservation: blend back original hue character
        vec3 result = mix(darkened, col * falloff * 1.15, uSaturationPreserve * (1.0 - falloff));

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTo2d({ imageData }: any) {
    const { data } = imageData
    const strength = this.uStrength * 0.5
    // CPU fallback: Luminance-driven contrast darkening
    for (let i = 0; i < data.length; i += 4) {
      const l = (data[i]*0.21 + data[i+1]*0.72 + data[i+2]*0.07)/255
      data[i]   = clamp(data[i]   - (255 - data[i]  ) * strength * (1-l))
      data[i+1] = clamp(data[i+1] - (255 - data[i+1]) * strength * (1-l))
      data[i+2] = clamp(data[i+2] - (255 - data[i+2]) * strength * (1-l))
    }
  }
}
// @ts-ignore
fabric.classRegistry.setClass(VignetteFilter, 'VignetteFilter')


// ─────────────────────────────────────────────────────────────────────────────

/**
 * VolumetricDepthFilter — Real WebGL 3D extrusion via multilayer parallax compositing.
 * Renders 8 depth slices offset along `uAngle` direction with progressive darkening
 * and semi-transparency, producing a true volumetric semi-transparent 3D look.
 *
 * uDepth:   0.0–1.0  extrusion amount
 * uOpacity: 0.0–1.0  depth layer translucency
 * uAngle:   radians  extrusion direction (default ≈135° = bottom-right)
 */
class VolumetricDepthFilter extends fabric.filters.BaseFilter<'VolumetricDepthFilter'> {
  static type = 'VolumetricDepthFilter'
  static uniformLocations = ['uDepth', 'uOpacity', 'uAngle']
  uDepth   = 0.3
  uOpacity = 0.72
  uAngle   = 2.356   // 135° in radians

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      uniform float uDepth;
      uniform float uOpacity;
      uniform float uAngle;

      void main() {
        vec2 dir = vec2(cos(uAngle), sin(uAngle));
        float maxOff = uDepth * 0.06;

        // Back-to-front Porter-Duff 'over' compositing of 8 depth layers
        vec4 stack = vec4(0.0);

        // i=8 (back) to i=1 (front-ish depth), 0=surface rendered separately
        for (int i = 8; i >= 1; i--) {
          float t = float(i) / 8.0;
          vec2 off = dir * t * maxOff;
          vec4 c = texture2D(uTexture, vTexCoord - off);
          if (c.a < 0.01) continue;

          // Progressive darkening + translucency for side walls
          float shade  = 1.0 - t * 0.72;
          float layerA = c.a * uOpacity * (0.20 + (1.0 - t) * 0.45);

          vec4 depthPx = vec4(c.rgb * shade, layerA);
          // Over: new layer on top of accumulated stack
          stack = depthPx + stack * (1.0 - depthPx.a);
        }

        // Surface: original pixel composited over depth stack
        vec4 front  = texture2D(uTexture, vTexCoord);
        vec4 result = front + stack * (1.0 - front.a);

        gl_FragColor = result;
      }
    `
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
    gl.uniform1f(u.uDepth,   this.uDepth)
    gl.uniform1f(u.uOpacity, this.uOpacity)
    gl.uniform1f(u.uAngle,   this.uAngle)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTo2d({ imageData }: any) {
    // CPU fallback: simple offset shadow approximation
    const { data, width, height } = imageData
    const copy      = new Uint8ClampedArray(data)
    const maxOff    = Math.round(this.uDepth * width * 0.06)
    const cosDx     = Math.cos(this.uAngle)
    const sinDy     = Math.sin(this.uAngle)
    const LAYERS    = 8

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4

        // Accumulate depth layers back-to-front
        let stackR = 0, stackG = 0, stackB = 0, stackA = 0

        for (let li = LAYERS; li >= 1; li--) {
          const t  = li / LAYERS
          const sx = Math.round(x - cosDx * t * maxOff)
          const sy = Math.round(y - sinDy * t * maxOff)
          if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue
          const si   = (sy * width + sx) * 4
          const cA   = copy[si + 3] / 255
          if (cA < 0.01) continue
          const shade   = 1.0 - t * 0.72
          const layerA  = cA * this.uOpacity * (0.20 + (1.0 - t) * 0.45)
          const prevA   = stackA / 255
          const newA    = layerA + prevA * (1 - layerA)
          if (newA > 0.001) {
            const lr = (copy[si]   / 255) * shade
            const lg = (copy[si+1] / 255) * shade
            const lb = (copy[si+2] / 255) * shade
            stackR = (lr * layerA + (stackR / 255) * prevA * (1 - layerA)) / newA * 255
            stackG = (lg * layerA + (stackG / 255) * prevA * (1 - layerA)) / newA * 255
            stackB = (lb * layerA + (stackB / 255) * prevA * (1 - layerA)) / newA * 255
            stackA = newA * 255
          }
        }

        // Composite front pixel over depth stack
        const fA  = copy[i + 3] / 255
        const sA  = stackA / 255
        const rA  = fA + sA * (1 - fA)
        if (rA > 0.001) {
          data[i]   = (copy[i]   / 255 * fA + (stackR / 255) * sA * (1 - fA)) / rA * 255
          data[i+1] = (copy[i+1] / 255 * fA + (stackG / 255) * sA * (1 - fA)) / rA * 255
          data[i+2] = (copy[i+2] / 255 * fA + (stackB / 255) * sA * (1 - fA)) / rA * 255
          data[i+3] = rA * 255
        } else {
          data[i] = data[i+1] = data[i+2] = data[i+3] = 0
        }
      }
    }
  }

  isNeutralState() { return this.uDepth === 0 }
}
// @ts-ignore
fabric.classRegistry.setClass(VolumetricDepthFilter, 'VolumetricDepthFilter')

// ─── FILTER ENGINE PATCH ──────────────────────────────────────────────────────
// Extends Fabric.js objects to support WebGL/CPU filters by intercepting the
// built-in caching system.
//
// Problem with naive _drawCache override: it runs on EVERY object EVERY frame.
// Fix: use a custom _filterDirty flag so filter work only happens when
// applyFilters() is explicitly called — zero overhead on unfiltered objects
// and on subsequent frames once applied.

// @ts-ignore
const originalDrawCache = fabric.Object.prototype._drawCache

/**
 * PHASE 2: Dynamic Padding (Fix Clipping)
 * Increases the selection area to accommodate distortions (waves, glitches, glows).
 */
// @ts-ignore
fabric.Object.prototype.applyFilters = function() {
  if (!this.filters || this.filters.length === 0) {
    this.padding = 0
    // Keep caching off if no filters, unless explicitly needed
    if (!this.isVideo) this.set('objectCaching', false)
  } else {
    // Calculate required margin based on active filters
    let maxMargin = 0
    this.filters.forEach((f: any) => {
      // Distortion filters need space for displacement
      const type = f.constructor.type || f.type
      if (type === 'Wavy')       maxMargin = Math.max(maxMargin, (f.uIntensity || 0) * 2.5)
      if (type === 'Glitch')     maxMargin = Math.max(maxMargin, (f.uAmount || 0) * 3.0)
      if (type === 'LiquidMotion') maxMargin = Math.max(maxMargin, (f.uIntensity || 0) * 2.0 * (f.uScale || 1))
      if (type === 'LiquidMarbling') maxMargin = Math.max(maxMargin, (f.uIntensity || 0) * 3.5 * (f.uScale || 1))
      // Spread filters need space for radiation
      if (type === 'NeonGlow' || type === 'Neon') maxMargin = Math.max(maxMargin, (f.uRadius || 0) * 2.5)
      if (type === 'Bloom' || type === 'BloomFilter') maxMargin = Math.max(maxMargin, (f.uRadius || 0) * 1.5)
      if (type === 'Outline' || type === 'OutlineFilter') maxMargin = Math.max(maxMargin, (f.uThickness || 0) * 1.5)
      if (type === 'VolumetricDepthFilter') maxMargin = Math.max(maxMargin, (f.uDepth || 0) * 100)
    })
    this.padding = Math.ceil(maxMargin)
    this.set('objectCaching', true)
    ;(this as any)._filterDirty = true
  }
  this.dirty = true
  
  // If this is an Image, we should actually trigger the original applyFilters
  // to ensure WebGL contexts are initialized if needed, but for custom engine
  // we primarily rely on the _drawCache interceptor.
  if (this instanceof fabric.Image) {
    // @ts-ignore
    // fabric.Image.prototype.applyFilters.call(this) 
  }

  this.canvas?.requestRenderAll()
}

/**
 * PHASE 1: On-The-Fly Rasterization Engine
 * Intercepts the rendering call to bridge Fabric.js cache with WebGL filters.
 * Eliminates the "black box" issue on text and vectors.
 */
// @ts-ignore
fabric.Object.prototype._drawCache = function(ctx: CanvasRenderingContext2D) {
  // If object has filters and cache is dirty, re-rasterize and apply
  if (this.filters && this.filters.length > 0 && (this as any)._filterDirty) {
    ;(this as any)._filterDirty = false
    this.dirty = true
    
    // 1. Force a clean rasterization of the base object into the cache
    // @ts-ignore
    this._renderCache()
    
    if (this._cacheCanvas) {
      const backend = (fabric as any).getFilterBackend?.() || (fabric as any).filterBackend
      if (backend) {
        try {
          // 2. Apply WebGL filters to the fresh raster
          backend.applyFilters(
            this.filters,
            this._cacheCanvas,
            this._cacheCanvas.width,
            this._cacheCanvas.height,
            this._cacheCanvas
          )
        } catch (e) {
          console.warn('WebGL Filter application failed, retrying on next frame.', e)
          ;(this as any)._filterDirty = true
        }
      }
    }
    this.dirty = false
  }
  
  // 3. Draw the resulting cache (filtered or not) to the main canvas
  originalDrawCache.call(this, ctx)
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

export {
  // Motion (animated)
  Glitch, WavyFilter, LiquidMotionFilter, LiquidMarblingFilter, VHSFilter, MatrixFilter, LiquidMetalFilter,
  // Optical
  ThermalFilter, PrismFilter, NeonGlowFilter, HolographicFilter, BloomFilter, PixelateFilter,
  // Texture
  GrainFilter, FiberFilter, EliteHalftone, ASCIIFilter,
  // Style
  Risograph, EliteClay, OilPaintFilter, OutlineFilter,
  DuotoneFilter, VignetteFilter, PosterizeFilter,
  VolumetricDepthFilter,
}
