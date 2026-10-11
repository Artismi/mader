/**
 * Filtri WebGL del motore effetti (fx/engine.ts).
 *
 * Regole comuni:
 * - i colori arrivano "dritti" (alpha NON premoltiplicato): sfocature e bagliori
 *   pesano i campioni per l'alpha, altrimenti i bordi diventano neri;
 * - le misure sono in pixel di design; `uZoom` le porta in pixel della cache,
 *   così l'effetto ha lo stesso aspetto a qualsiasi zoom e nell'export;
 * - `uAmount` (0–1) miscela il risultato con l'ingresso: è lo slider "Intensità".
 * Niente inizializzatori di campo nelle classi: BaseFilter assegna le opzioni nel
 * costruttore e un inizializzatore le sovrascriverebbe subito dopo.
 */
import { filters } from 'fabric'

type GL = WebGLRenderingContext
type U = Record<string, WebGLUniformLocation | null>
type RGB = [number, number, number]

const HEAD = `
  precision highp float;
  uniform sampler2D uTexture;
  varying vec2 vTexCoord;
  uniform float uStepW;
  uniform float uStepH;
  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  vec2 texSize() { return vec2(1.0 / uStepW, 1.0 / uStepH); }
`

export const hexToRgb = (hex: string): RGB => {
  const h = (hex || '#000000').replace('#', '')
  const f = h.length === 3 ? h.split('').map(x => x + x).join('') : h.padEnd(6, '0')
  return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16) / 255) as RGB
}

abstract class Fx extends filters.BaseFilter<string> {
  declare uZoom: number
  declare uTime: number
}

/* ───────────────── Regolazioni di tono e colore (un solo passaggio) ───────────────── */
export class FxTone extends Fx {
  static type = 'FxTone'
  static defaults = { bri: 0, con: 0, hi: 0, sh: 0, temp: 0, tint: 0, sat: 0, vib: 0, fade: 0 }
  static uniformLocations = ['uBri', 'uCon', 'uHi', 'uSh', 'uTemp', 'uTint', 'uSat', 'uVib', 'uFade']
  declare bri: number; declare con: number; declare hi: number; declare sh: number
  declare temp: number; declare tint: number; declare sat: number; declare vib: number; declare fade: number
  getFragmentSource() {
    return HEAD + `
      uniform float uBri, uCon, uHi, uSh, uTemp, uTint, uSat, uVib, uFade;
      void main() {
        vec4 c = texture2D(uTexture, vTexCoord);
        if (c.a <= 0.0) { gl_FragColor = c; return; }
        vec3 col = c.rgb;
        // luminosità come curva gamma: neri e bianchi restano al loro posto
        col = pow(max(col, 0.0), vec3(pow(2.0, -uBri * 1.1)));
        float k = uCon > 0.0 ? 1.0 / (1.0 - uCon * 0.7) : 1.0 + uCon * 0.7;
        col = (col - 0.5) * k + 0.5;
        float L = luma(clamp(col, 0.0, 1.0));
        col += uSh * 0.35 * (1.0 - smoothstep(0.0, 0.55, L));
        col += uHi * 0.30 * smoothstep(0.45, 1.0, L);
        col *= vec3(1.0 + 0.14 * uTemp, 1.0 + 0.02 * uTemp, 1.0 - 0.16 * uTemp);
        col *= vec3(1.0 + 0.06 * uTint, 1.0 - 0.10 * uTint, 1.0 + 0.06 * uTint);
        col = clamp(col, 0.0, 1.0);
        L = luma(col);
        float mx = max(col.r, max(col.g, col.b)), mn = min(col.r, min(col.g, col.b));
        // vividezza: spinge solo i colori spenti, protegge quelli già saturi
        float vib = uVib * (1.0 - (mx - mn)) * 1.2;
        col = mix(vec3(L), col, 1.0 + uSat + vib);
        // dissolvenza: neri sollevati, come una stampa sbiadita
        col = mix(col, vec3(0.1) + col * 0.85, uFade);
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
      }`
  }
  sendUniformData(gl: GL, u: U) {
    gl.uniform1f(u.uBri, this.bri); gl.uniform1f(u.uCon, this.con); gl.uniform1f(u.uHi, this.hi)
    gl.uniform1f(u.uSh, this.sh); gl.uniform1f(u.uTemp, this.temp); gl.uniform1f(u.uTint, this.tint)
    gl.uniform1f(u.uSat, this.sat); gl.uniform1f(u.uVib, this.vib); gl.uniform1f(u.uFade, this.fade)
  }
}

/* ───────────────── Finitura: vignettatura e grana (sempre per ultime) ───────────────── */
export class FxFinish extends Fx {
  static type = 'FxFinish'
  static defaults = { vig: 0, grain: 0, uZoom: 1, uTime: 0 }
  static uniformLocations = ['uVig', 'uGrain', 'uZoom', 'uTime']
  declare vig: number; declare grain: number
  getFragmentSource() {
    return HEAD + `
      uniform float uVig, uGrain, uZoom, uTime;
      void main() {
        vec4 c = texture2D(uTexture, vTexCoord);
        if (c.a <= 0.0) { gl_FragColor = c; return; }
        vec3 col = c.rgb;
        vec2 size = texSize();
        float aspect = size.x / size.y;
        vec2 d = (vTexCoord - 0.5) * vec2(aspect, 1.0);
        float f = smoothstep(0.3, 1.05, length(d) / length(vec2(aspect, 1.0) * 0.5));
        if (uVig > 0.0) col *= 1.0 - f * uVig * 0.85;
        else col = mix(col, vec3(1.0), f * (-uVig) * 0.85);
        // grana triangolare, più forte nei mezzitoni come sulla pellicola
        vec2 g = floor(vTexCoord * size / max(uZoom * 1.2, 0.5));
        float n = hash(g + fract(uTime) * 91.7) + hash(g * 1.7 + 3.1) - 1.0;
        col += n * uGrain * 0.18 * (1.0 - abs(luma(col) - 0.5) * 1.4);
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
      }`
  }
  sendUniformData(gl: GL, u: U) {
    gl.uniform1f(u.uVig, this.vig); gl.uniform1f(u.uGrain, this.grain)
    gl.uniform1f(u.uZoom, this.uZoom); gl.uniform1f(u.uTime, this.uTime)
  }
}

/* ───────────────── Sfocatura gaussiana separabile (orizzontale poi verticale) ───────────────── */
export class FxBlur extends Fx {
  static type = 'FxBlur'
  static defaults = { radius: 4, horizontal: true, uZoom: 1 }
  static uniformLocations = ['uDir', 'uRadius']
  declare radius: number; declare horizontal: boolean
  getFragmentSource() {
    return HEAD + `
      uniform vec2 uDir;
      uniform float uRadius;
      void main() {
        vec4 acc = vec4(0.0); float wsum = 0.0;
        for (int i = -12; i <= 12; i++) {
          float x = float(i) / 12.0;
          float w = exp(-x * x * 4.5);
          vec4 s = texture2D(uTexture, vTexCoord + uDir * vec2(uStepW, uStepH) * x * uRadius);
          acc += vec4(s.rgb * s.a, s.a) * w; wsum += w;
        }
        acc /= wsum;
        gl_FragColor = acc.a > 0.0 ? vec4(acc.rgb / acc.a, acc.a) : vec4(0.0);
      }`
  }
  sendUniformData(gl: GL, u: U) {
    gl.uniform2f(u.uDir, this.horizontal ? 1 : 0, this.horizontal ? 0 : 1)
    gl.uniform1f(u.uRadius, this.radius * this.uZoom)
  }
}

/* ───────────────── Nitidezza (maschera di contrasto) ───────────────── */
export class FxSharpen extends Fx {
  static type = 'FxSharpen'
  static defaults = { amount: 0.5, uZoom: 1 }
  static uniformLocations = ['uAmount', 'uZoom']
  declare amount: number
  getFragmentSource() {
    return HEAD + `
      uniform float uAmount, uZoom;
      void main() {
        vec4 c = texture2D(uTexture, vTexCoord);
        vec2 o = vec2(uStepW, uStepH) * max(1.0, uZoom);
        vec3 avg = (texture2D(uTexture, vTexCoord + vec2(o.x, 0.0)).rgb + texture2D(uTexture, vTexCoord - vec2(o.x, 0.0)).rgb
                  + texture2D(uTexture, vTexCoord + vec2(0.0, o.y)).rgb + texture2D(uTexture, vTexCoord - vec2(0.0, o.y)).rgb) * 0.25;
        gl_FragColor = vec4(clamp(c.rgb + (c.rgb - avg) * uAmount * 1.8, 0.0, 1.0), c.a);
      }`
  }
  sendUniformData(gl: GL, u: U) { gl.uniform1f(u.uAmount, this.amount); gl.uniform1f(u.uZoom, this.uZoom) }
}

/* ───────────────── Duotone: luminanza → due colori ───────────────── */
export class FxDuotone extends Fx {
  static type = 'FxDuotone'
  static defaults = { c1: [0.11, 0.1, 0.43] as RGB, c2: [1, 0.48, 0.66] as RGB, amount: 1 }
  static uniformLocations = ['uC1', 'uC2', 'uAmount']
  declare c1: RGB; declare c2: RGB; declare amount: number
  getFragmentSource() {
    return HEAD + `
      uniform vec3 uC1, uC2; uniform float uAmount;
      void main() {
        vec4 c = texture2D(uTexture, vTexCoord);
        float L = smoothstep(0.02, 0.98, luma(c.rgb));
        gl_FragColor = vec4(mix(c.rgb, mix(uC1, uC2, L), uAmount), c.a);
      }`
  }
  sendUniformData(gl: GL, u: U) { gl.uniform3fv(u.uC1, this.c1); gl.uniform3fv(u.uC2, this.c2); gl.uniform1f(u.uAmount, this.amount) }
}

/* ───────────────── Retino (halftone) ───────────────── */
export class FxHalftone extends Fx {
  static type = 'FxHalftone'
  static defaults = { size: 9, angle: 45, ink: [0.07, 0.07, 0.07] as RGB, paper: [1, 1, 1] as RGB, paperOn: 0, colored: 0, amount: 1, uZoom: 1 }
  static uniformLocations = ['uSize', 'uAngle', 'uInk', 'uPaper', 'uPaperOn', 'uColored', 'uAmount', 'uZoom']
  declare size: number; declare angle: number; declare ink: RGB; declare paper: RGB
  declare paperOn: number; declare colored: number; declare amount: number
  getFragmentSource() {
    return HEAD + `
      uniform float uSize, uAngle, uPaperOn, uColored, uAmount, uZoom;
      uniform vec3 uInk, uPaper;
      void main() {
        vec4 c = texture2D(uTexture, vTexCoord);
        vec2 size = texSize();
        float cell = max(uSize * uZoom, 2.0);
        float a = radians(uAngle);
        mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
        mat2 Rt = mat2(cos(a), sin(a), -sin(a), cos(a));
        vec2 p = R * (vTexCoord * size);
        vec2 cc = (floor(p / cell) + 0.5) * cell;
        vec4 s = texture2D(uTexture, clamp((Rt * cc) / size, 0.0, 1.0));
        float dark = uColored > 0.5 ? clamp(1.0 - luma(s.rgb) + 0.35, 0.0, 1.0) : 1.0 - luma(s.rgb);
        float rad = sqrt(clamp(dark, 0.0, 1.0)) * cell * 0.62;
        float dotv = smoothstep(rad + 0.8, rad - 0.8, length(p - cc)) * s.a;
        vec3 ink = uColored > 0.5 ? s.rgb : uInk;
        vec4 o = uPaperOn > 0.5 ? vec4(mix(uPaper, ink, dotv), c.a) : vec4(ink, dotv);
        gl_FragColor = mix(c, o, uAmount);
      }`
  }
  sendUniformData(gl: GL, u: U) {
    gl.uniform1f(u.uSize, this.size); gl.uniform1f(u.uAngle, this.angle); gl.uniform3fv(u.uInk, this.ink)
    gl.uniform3fv(u.uPaper, this.paper); gl.uniform1f(u.uPaperOn, this.paperOn); gl.uniform1f(u.uColored, this.colored)
    gl.uniform1f(u.uAmount, this.amount); gl.uniform1f(u.uZoom, this.uZoom)
  }
}

/* ───────────────── Risograph: due inchiostri a retino, fuori registro, su carta ───────────────── */
export class FxRiso extends Fx {
  static type = 'FxRiso'
  static defaults = { ink1: [1, 0.28, 0.69] as RGB, ink2: [0, 0.47, 0.75] as RGB, paper: [0.95, 0.93, 0.89] as RGB, size: 6, offset: 4, amount: 1, uZoom: 1 }
  static uniformLocations = ['uInk1', 'uInk2', 'uPaper', 'uSize', 'uOffset', 'uAmount', 'uZoom']
  declare ink1: RGB; declare ink2: RGB; declare paper: RGB; declare size: number; declare offset: number; declare amount: number
  getFragmentSource() {
    return HEAD + `
      uniform vec3 uInk1, uInk2, uPaper; uniform float uSize, uOffset, uAmount, uZoom;
      float screen(vec2 px, float cell, float ang, int ch, vec2 shift, out float al) {
        mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
        mat2 Rt = mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
        vec2 p = R * px;
        vec2 cc = (floor(p / cell) + 0.5) * cell;
        vec4 s = texture2D(uTexture, clamp((Rt * cc - shift) / texSize(), 0.0, 1.0));
        al = s.a;
        float d = ch == 0 ? 1.0 - s.g : 1.0 - s.r;
        d = max(d, (1.0 - luma(s.rgb)) * 0.9) * s.a;
        float rad = sqrt(clamp(d, 0.0, 1.0)) * cell * 0.66;
        return smoothstep(rad + 0.8, rad - 0.8, length(p - cc));
      }
      void main() {
        vec4 c = texture2D(uTexture, vTexCoord);
        vec2 px = vTexCoord * texSize();
        float cell = max(uSize * uZoom, 2.0);
        vec2 shift = vec2(uOffset, uOffset * 0.6) * uZoom;
        float a1, a2;
        float k1 = screen(px, cell, radians(15.0), 0, vec2(0.0), a1);
        float k2 = screen(px, cell, radians(75.0), 1, shift, a2);
        vec3 col = uPaper * mix(vec3(1.0), uInk1, k1) * mix(vec3(1.0), uInk2, k2);
        col += (hash(floor(px / max(uZoom, 0.5))) - 0.5) * 0.06;
        float al = max(a1, a2);
        gl_FragColor = mix(c, vec4(clamp(col, 0.0, 1.0), al), uAmount);
      }`
  }
  sendUniformData(gl: GL, u: U) {
    gl.uniform3fv(u.uInk1, this.ink1); gl.uniform3fv(u.uInk2, this.ink2); gl.uniform3fv(u.uPaper, this.paper)
    gl.uniform1f(u.uSize, this.size); gl.uniform1f(u.uOffset, this.offset); gl.uniform1f(u.uAmount, this.amount); gl.uniform1f(u.uZoom, this.uZoom)
  }
}

/* ───────────────── Pixel ───────────────── */
export class FxPixel extends Fx {
  static type = 'FxPixel'
  static defaults = { size: 10, amount: 1, uZoom: 1 }
  static uniformLocations = ['uSize', 'uAmount', 'uZoom']
  declare size: number; declare amount: number
  getFragmentSource() {
    return HEAD + `
      uniform float uSize, uAmount, uZoom;
      void main() {
        vec2 size = texSize();
        float cell = max(uSize * uZoom, 1.0);
        vec2 uv = (floor(vTexCoord * size / cell) + 0.5) * cell / size;
        gl_FragColor = mix(texture2D(uTexture, vTexCoord), texture2D(uTexture, uv), uAmount);
      }`
  }
  sendUniformData(gl: GL, u: U) { gl.uniform1f(u.uSize, this.size); gl.uniform1f(u.uAmount, this.amount); gl.uniform1f(u.uZoom, this.uZoom) }
}

/* ───────────────── Poster (livelli di colore) ───────────────── */
export class FxPosterize extends Fx {
  static type = 'FxPosterize'
  static defaults = { levels: 4, amount: 1 }
  static uniformLocations = ['uLevels', 'uAmount']
  declare levels: number; declare amount: number
  getFragmentSource() {
    return HEAD + `
      uniform float uLevels, uAmount;
      void main() {
        vec4 c = texture2D(uTexture, vTexCoord);
        vec3 p = floor(c.rgb * (uLevels - 1.0) + 0.5) / (uLevels - 1.0);
        gl_FragColor = vec4(mix(c.rgb, p, uAmount), c.a);
      }`
  }
  sendUniformData(gl: GL, u: U) { gl.uniform1f(u.uLevels, Math.max(2, this.levels)); gl.uniform1f(u.uAmount, this.amount) }
}

/* ───────────────── Aberrazione cromatica (radiale, leggera) ───────────────── */
export class FxChroma extends Fx {
  static type = 'FxChroma'
  static defaults = { px: 6, amount: 1, uZoom: 1 }
  static uniformLocations = ['uPx', 'uAmount', 'uZoom']
  declare px: number; declare amount: number
  getFragmentSource() {
    return HEAD + `
      uniform float uPx, uAmount, uZoom;
      void main() {
        vec4 c = texture2D(uTexture, vTexCoord);
        vec2 d = vTexCoord - 0.5;
        vec2 o = (length(d) > 0.0 ? normalize(d) : vec2(1.0, 0.0)) * uPx * uZoom * (0.4 + length(d) * 1.2) * vec2(uStepW, uStepH);
        vec4 r = texture2D(uTexture, vTexCoord + o), b = texture2D(uTexture, vTexCoord - o);
        vec4 o4 = vec4(r.r, c.g, b.b, max(c.a, max(r.a, b.a)));
        o4.rgb = vec3(r.r * r.a, c.g * c.a, b.b * b.a) / max(o4.a, 0.001);
        gl_FragColor = mix(c, o4, uAmount);
      }`
  }
  sendUniformData(gl: GL, u: U) { gl.uniform1f(u.uPx, this.px); gl.uniform1f(u.uAmount, this.amount); gl.uniform1f(u.uZoom, this.uZoom) }
}

/* ───────────────── Glitch (spostamento a blocchi + separazione RGB) ───────────────── */
export class FxGlitch extends Fx {
  static type = 'FxGlitch'
  static defaults = { power: 0.4, seed: 1, amount: 1, uZoom: 1, uTime: 0 }
  static uniformLocations = ['uPower', 'uSeed', 'uAmount', 'uTime']
  declare power: number; declare seed: number; declare amount: number
  getFragmentSource() {
    return HEAD + `
      uniform float uPower, uSeed, uAmount, uTime;
      void main() {
        vec4 c = texture2D(uTexture, vTexCoord);
        float t = floor(uTime * 10.0) + uSeed;
        float rows = 22.0;
        float row = floor(vTexCoord.y * rows + hash(vec2(t, 1.3)) * 4.0);
        float n = hash(vec2(row, t));
        float shift = n > 1.0 - uPower * 0.55 ? (hash(vec2(t, row)) - 0.5) * uPower * 0.18 : 0.0;
        vec2 uv = vec2(vTexCoord.x + shift, vTexCoord.y);
        float sp = uPower * 0.012;
        vec4 r = texture2D(uTexture, uv + vec2(sp, 0.0)), g = texture2D(uTexture, uv), b = texture2D(uTexture, uv - vec2(sp, 0.0));
        float a = max(g.a, max(r.a, b.a));
        vec3 col = vec3(r.r * r.a, g.g * g.a, b.b * b.a) / max(a, 0.001);
        col *= 1.0 - step(0.5, fract(vTexCoord.y / uStepH / 3.0)) * 0.08 * uPower;
        gl_FragColor = mix(c, vec4(col, a), uAmount);
      }`
  }
  sendUniformData(gl: GL, u: U) {
    gl.uniform1f(u.uPower, this.power); gl.uniform1f(u.uSeed, this.seed); gl.uniform1f(u.uAmount, this.amount); gl.uniform1f(u.uTime, this.uTime)
  }
}

/* ───────────────── Onda ───────────────── */
export class FxWave extends Fx {
  static type = 'FxWave'
  static defaults = { amp: 8, freq: 6, amount: 1, uZoom: 1, uTime: 0 }
  static uniformLocations = ['uAmp', 'uFreq', 'uAmount', 'uZoom', 'uTime']
  declare amp: number; declare freq: number; declare amount: number
  getFragmentSource() {
    return HEAD + `
      uniform float uAmp, uFreq, uAmount, uZoom, uTime;
      void main() {
        vec2 uv = vTexCoord;
        float ph = uTime * 2.0;
        uv.x += sin(uv.y * uFreq * 6.2832 + ph) * uAmp * uZoom * uStepW;
        uv.y += cos(uv.x * uFreq * 4.0 + ph * 0.7) * uAmp * 0.35 * uZoom * uStepH;
        gl_FragColor = mix(texture2D(uTexture, vTexCoord), texture2D(uTexture, uv), uAmount);
      }`
  }
  sendUniformData(gl: GL, u: U) {
    gl.uniform1f(u.uAmp, this.amp); gl.uniform1f(u.uFreq, this.freq); gl.uniform1f(u.uAmount, this.amount)
    gl.uniform1f(u.uZoom, this.uZoom); gl.uniform1f(u.uTime, this.uTime)
  }
}

/* ───────────────── VHS: righe, sbavatura di colore, banda di tracking ───────────────── */
export class FxVhs extends Fx {
  static type = 'FxVhs'
  static defaults = { power: 0.6, amount: 1, uZoom: 1, uTime: 0 }
  static uniformLocations = ['uPower', 'uAmount', 'uZoom', 'uTime']
  declare power: number; declare amount: number
  getFragmentSource() {
    return HEAD + `
      uniform float uPower, uAmount, uZoom, uTime;
      void main() {
        vec2 uv = vTexCoord;
        float band = smoothstep(0.0, 0.04, abs(fract(uv.y - uTime * 0.12) - 0.5) - 0.44);
        uv.x += (1.0 - band) * 0.012 * uPower * sin(uv.y * 300.0 + uTime * 20.0);
        float sp = uPower * 0.006;
        vec4 c = texture2D(uTexture, vTexCoord);
        vec4 r = texture2D(uTexture, uv + vec2(sp, 0.0)), g = texture2D(uTexture, uv), b = texture2D(uTexture, uv - vec2(sp, 0.0));
        float a = max(g.a, max(r.a, b.a));
        vec3 col = vec3(r.r * r.a, g.g * g.a, b.b * b.a) / max(a, 0.001);
        float line = 0.5 + 0.5 * sin(vTexCoord.y / uStepH / max(uZoom, 0.5) * 1.7);
        col *= 1.0 - line * 0.18 * uPower;
        col += (hash(vec2(floor(vTexCoord.y / uStepH), floor(uTime * 24.0))) - 0.5) * 0.08 * uPower;
        col = mix(col, vec3(luma(col)), 0.15 * uPower);
        gl_FragColor = mix(c, vec4(clamp(col, 0.0, 1.0), a), uAmount);
      }`
  }
  sendUniformData(gl: GL, u: U) {
    gl.uniform1f(u.uPower, this.power); gl.uniform1f(u.uAmount, this.amount); gl.uniform1f(u.uZoom, this.uZoom); gl.uniform1f(u.uTime, this.uTime)
  }
}

/* ───────────────── Bagliore e Neon: alone dalla forma (alpha), dietro l'oggetto ───────────────── */
export class FxGlow extends Fx {
  static type = 'FxGlow'
  static defaults = { size: 18, color: [1, 0.82, 0.4] as RGB, strength: 0.7, neon: 0, amount: 1, uZoom: 1 }
  static uniformLocations = ['uSize', 'uColor', 'uStrength', 'uNeon', 'uAmount', 'uZoom']
  declare size: number; declare color: RGB; declare strength: number; declare neon: number; declare amount: number
  getFragmentSource() {
    return HEAD + `
      uniform float uSize, uStrength, uNeon, uAmount, uZoom; uniform vec3 uColor;
      void main() {
        vec4 c = texture2D(uTexture, vTexCoord);
        float R = max(uSize * uZoom, 1.0);
        float acc = 0.0, wsum = 0.0;
        for (int i = 0; i < 64; i++) {
          float fi = float(i);
          float r = sqrt((fi + 0.5) / 64.0) * R;
          float th = fi * 2.39996;
          float w = 1.0 - (r / R) * 0.7;
          acc += texture2D(uTexture, vTexCoord + vec2(cos(th), sin(th)) * r * vec2(uStepW, uStepH)).a * w;
          wsum += w;
        }
        float g = clamp(acc / wsum * uStrength * 2.2, 0.0, 1.0);
        // neon: il nucleo prende la luce del tubo ma conserva parte del colore dell'oggetto
        vec3 core = uNeon > 0.5 ? mix(c.rgb, mix(uColor, vec3(1.0), 0.35), 0.6) : c.rgb;
        float a = c.a + g * (1.0 - c.a);
        vec3 col = a > 0.0 ? (core * c.a + uColor * g * (1.0 - c.a)) / a : vec3(0.0);
        gl_FragColor = mix(c, vec4(col, a), uAmount);
      }`
  }
  sendUniformData(gl: GL, u: U) {
    gl.uniform1f(u.uSize, this.size); gl.uniform3fv(u.uColor, this.color); gl.uniform1f(u.uStrength, this.strength)
    gl.uniform1f(u.uNeon, this.neon); gl.uniform1f(u.uAmount, this.amount); gl.uniform1f(u.uZoom, this.uZoom)
  }
}

/* ───────────────── Contorno (dilatazione della forma) ───────────────── */
export class FxOutline extends Fx {
  static type = 'FxOutline'
  static defaults = { width: 6, color: [1, 1, 1] as RGB, amount: 1, uZoom: 1 }
  static uniformLocations = ['uWidth', 'uColor', 'uAmount', 'uZoom']
  declare width: number; declare color: RGB; declare amount: number
  getFragmentSource() {
    return HEAD + `
      uniform float uWidth, uAmount, uZoom; uniform vec3 uColor;
      void main() {
        vec4 c = texture2D(uTexture, vTexCoord);
        float R = max(uWidth * uZoom, 1.0);
        float m = 0.0;
        for (int i = 0; i < 32; i++) {
          float th = float(i) / 32.0 * 6.2832;
          vec2 dir = vec2(cos(th), sin(th)) * vec2(uStepW, uStepH);
          m = max(m, texture2D(uTexture, vTexCoord + dir * R).a);
          m = max(m, texture2D(uTexture, vTexCoord + dir * R * 0.66).a);
          m = max(m, texture2D(uTexture, vTexCoord + dir * R * 0.33).a);
        }
        float a = c.a + m * (1.0 - c.a);
        vec3 col = a > 0.0 ? (c.rgb * c.a + uColor * m * (1.0 - c.a)) / a : vec3(0.0);
        gl_FragColor = mix(c, vec4(col, a), uAmount);
      }`
  }
  sendUniformData(gl: GL, u: U) {
    gl.uniform1f(u.uWidth, this.width); gl.uniform3fv(u.uColor, this.color); gl.uniform1f(u.uAmount, this.amount); gl.uniform1f(u.uZoom, this.uZoom)
  }
}
