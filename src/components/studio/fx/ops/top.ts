/**
 * Operatori di immagine alla TouchDesigner (i "TOP"): blocchi piccoli, precisi e
 * combinabili. Ogni effetto di rete (networks.ts) è una catena di questi blocchi,
 * come una rete TOP: Noise → Displace → Level → Composite…
 *
 * Convenzioni del motore (gl.ts): colori premoltiplicati, origine in alto,
 * texture in mezza precisione quando possibile. I parametri in pixel sono in
 * pixel della cache: chi li chiama li moltiplica per lo zoom (z) e, per i testi,
 * per lo spessore del tratto, così l'effetto si adatta a ogni font.
 */
import { LIB, type FxGL, type Tex } from '../gl'

export type Vec = [number, number]
const hex = (c: string): [number, number, number] => {
  const h = c.replace('#', '')
  const v = h.length === 3 ? h.split('').map(x => x + x).join('') : h.padEnd(6, '0').slice(0, 6)
  return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255) as [number, number, number]
}

/* ── Noise TOP (come in TD): base + armoniche (spread = moltiplicatore di frequenza,
   roughness = attenuazione di ogni armonica), poi esponente, ampiezza e offset.
   R,G = due campi indipendenti (per Displace), B = terzo campo; monocromo = tutti uguali ── */
const NOISE = LIB + `
uniform float uPeriod, uSeed, uHarm, uSpread, uRough, uGain, uExp, uAmp, uOffset, uMono; uniform vec2 uT;
float field(vec2 p, float k) {
  float base = vnoise(p + k * 31.7 + uSeed * 13.1) * 2.0 - 1.0;
  float sum = 0.0, a = 1.0, f = 1.0, norm = 0.0;
  for (int i = 1; i <= 8; i++) { if (float(i) > uHarm) break; f *= uSpread; a *= uRough; sum += a * (vnoise(p * f + k * 31.7 + uSeed * 13.1 + float(i) * 5.3) * 2.0 - 1.0); norm += a; }
  float v = base + uGain * (norm > 0.0 ? sum / max(1.0, norm) : 0.0);
  v = sign(v) * pow(abs(clamp(v, -1.0, 1.0)), uExp);
  return v * uAmp * 0.5 + uOffset;
}
void main() {
  vec2 p = (vUv * uRes + uT) / max(1.0, uPeriod);
  float r = field(p, 0.0);
  o = uMono > 0.5 ? vec4(r, r, r, 1.0) : vec4(r, field(p, 1.0), field(p, 2.0), 1.0);
}`
export interface NoiseOpts { period: number; seed?: number; harmonics?: number; spread?: number; roughness?: number; gain?: number; exponent?: number; amplitude?: number; offset?: number; monochrome?: boolean; translate?: Vec }
export function noise(g: FxGL, w: number, h: number, o: NoiseOpts): Tex {
  return g.pass('top-noise', NOISE, w, h, {
    uPeriod: o.period, uSeed: o.seed ?? 0, uHarm: o.harmonics ?? 3, uSpread: o.spread ?? 2, uRough: o.roughness ?? 0.5, uGain: o.gain ?? 0.7,
    uExp: o.exponent ?? 1, uAmp: o.amplitude ?? 1, uOffset: o.offset ?? 0.5, uMono: o.monochrome ? 1 : 0, uT: o.translate ?? [0, 0],
  })
}

/* ── Level TOP (ordine di TD): Pre (invert, black level, brightness 1, gamma 1, contrast)
   → Range (in low/high → out low/high) → Post (gamma 2, opacity, brightness 2, clamp) ── */
const LEVEL = LIB + `
uniform sampler2D uSrc; uniform float uInvert, uBlack, uB1, uG1, uContrast, uInLo, uInHi, uOutLo, uOutHi, uG2, uOpacity, uB2;
void main() {
  vec4 c = unpre(texture(uSrc, vUv));
  vec3 v = c.rgb;
  if (uInvert > 0.5) v = 1.0 - v;
  v = max(vec3(0.0), (v - uBlack) / max(1e-4, 1.0 - uBlack));
  v = v * uB1;
  v = pow(max(v, 0.0), vec3(1.0 / max(0.01, uG1)));
  v = (v - 0.5) * uContrast + 0.5;
  v = (v - uInLo) / max(1e-4, uInHi - uInLo) * (uOutHi - uOutLo) + uOutLo;
  v = pow(clamp(v, 0.0, 1.0), vec3(1.0 / max(0.01, uG2)));
  v = clamp(v * uB2, 0.0, 1.0);
  o = pre(vec4(v, c.a * uOpacity));
}`
export interface LevelOpts { invert?: boolean; blackLevel?: number; brightness1?: number; gamma1?: number; contrast?: number; inLow?: number; inHigh?: number; outLow?: number; outHigh?: number; gamma2?: number; opacity?: number; brightness2?: number }
export function level(g: FxGL, src: Tex, o: LevelOpts): Tex {
  return g.pass('top-level', LEVEL, src.w, src.h, {
    uSrc: src, uInvert: o.invert ? 1 : 0, uBlack: o.blackLevel ?? 0, uB1: o.brightness1 ?? 1, uG1: o.gamma1 ?? 1, uContrast: o.contrast ?? 1,
    uInLo: o.inLow ?? 0, uInHi: o.inHigh ?? 1, uOutLo: o.outLow ?? 0, uOutHi: o.outHigh ?? 1, uG2: o.gamma2 ?? 1, uOpacity: o.opacity ?? 1, uB2: o.brightness2 ?? 1,
  })
}

/* ── Blur TOP: sfocatura a piramide del motore ── */
export const blur = (g: FxGL, src: Tex, radius: number): Tex => g.blur(src, Math.max(0.01, radius))

/* ── Displace TOP (come in TD): canali scelti per orizzontale/verticale, midpoint,
   peso per asse (in unità della texture: 1 = tutta la larghezza), bordi hold/zero/repeat/mirror ── */
const DISPLACE = LIB + `
uniform sampler2D uSrc, uMap; uniform vec2 uWeight, uMid; uniform float uH, uV, uExtend;
float ch(vec4 c, float k) { return k < 0.5 ? c.r : k < 1.5 ? c.g : k < 2.5 ? c.b : k < 3.5 ? c.a : 0.5; }
void main() {
  vec4 m = texture(uMap, vUv);
  vec2 d = vec2(ch(m, uH) - uMid.x, uMid.y - ch(m, uV)) * uWeight;
  vec2 uv = vUv + vec2(d.x, -d.y);
  if (uExtend < 0.5) uv = clamp(uv, 0.0, 1.0);                                   // hold
  else if (uExtend < 1.5) { if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) { o = vec4(0.0); return; } } // zero
  else if (uExtend < 2.5) uv = fract(uv);                                         // repeat
  else uv = 1.0 - abs(1.0 - mod(uv, 2.0));                                       // mirror
  o = texture(uSrc, uv);
}`
const CH = { r: 0, g: 1, b: 2, a: 3, none: 4 } as const
const EXT = { hold: 0, zero: 1, repeat: 2, mirror: 3 } as const
export interface DisplaceOpts { horizontal?: keyof typeof CH; vertical?: keyof typeof CH; midpoint?: Vec; weight: Vec; extend?: keyof typeof EXT }
export function displace(g: FxGL, src: Tex, map: Tex, o: DisplaceOpts): Tex {
  return g.pass('top-displace', DISPLACE, src.w, src.h, {
    uSrc: src, uMap: map, uWeight: o.weight, uMid: o.midpoint ?? [0.5, 0.5], uH: CH[o.horizontal ?? 'r'], uV: CH[o.vertical ?? 'g'], uExtend: EXT[o.extend ?? 'zero'],
  })
}

/* ── Edge TOP (come in TD): canale scelto (luminanza, alpha, media RGB), black level,
   sample step in px, strength; bordi colorati, solo bordo o composti sull'ingresso ── */
const EDGE = LIB + `
uniform sampler2D uSrc; uniform float uStrength, uStep, uSel, uBlack, uCombine; uniform vec4 uColor;
float s(vec2 uv) {
  vec4 c = texture(uSrc, uv); vec3 u = unpre(c).rgb;
  float v = uSel < 0.5 ? luma(u) * c.a : uSel < 1.5 ? c.a : (u.r + u.g + u.b) / 3.0 * c.a;
  return max(0.0, v - uBlack) / max(1e-4, 1.0 - uBlack);
}
void main() {
  vec2 t = uStep / uRes;
  float tl = s(vUv + t * vec2(-1, -1)), tc = s(vUv + t * vec2(0, -1)), tr = s(vUv + t * vec2(1, -1));
  float ml = s(vUv + t * vec2(-1, 0)), mr = s(vUv + t * vec2(1, 0));
  float bl = s(vUv + t * vec2(-1, 1)), bc = s(vUv + t * vec2(0, 1)), br = s(vUv + t * vec2(1, 1));
  float gx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl), gy = (bl + 2.0 * bc + br) - (tl + 2.0 * tc + tr);
  float e = clamp(length(vec2(gx, gy)) * uStrength * 0.25, 0.0, 1.0);
  vec4 edgeC = vec4(uColor.rgb * uColor.a * e, uColor.a * e);
  vec4 src = texture(uSrc, vUv);
  o = uCombine < 0.5 ? edgeC : uCombine < 1.5 ? over(edgeC, src) : vec4(min(src.rgb + edgeC.rgb, 1.0), max(src.a, edgeC.a));
}`
const SEL = { luminanza: 0, alpha: 1, rgb: 2 } as const
export interface EdgeOpts { select?: keyof typeof SEL; blackLevel?: number; step?: number; strength?: number; color?: string; alpha?: number; combine?: 'edge' | 'over' | 'add' }
export function edge(g: FxGL, src: Tex, o: EdgeOpts = {}): Tex {
  const [r, gg, b] = hex(o.color ?? '#ffffff')
  return g.pass('top-edge', EDGE, src.w, src.h, {
    uSrc: src, uStrength: o.strength ?? 1, uStep: o.step ?? 1, uSel: SEL[o.select ?? 'luminanza'], uBlack: o.blackLevel ?? 0,
    uCombine: o.combine === 'over' ? 1 : o.combine === 'add' ? 2 : 0, uColor: [r, gg, b, o.alpha ?? 1],
  })
}

/* ── Composite TOP: A sopra B con modo di fusione (indici di blend() in gl.ts) ── */
export const MODE = { over: 0, multiply: 1, screen: 2, overlay: 3, softlight: 4, add: 5, dodge: 6, color: 7 } as const
const COMPOSITE = LIB + `
uniform sampler2D uA, uB; uniform float uMode, uOpacity, uInside;
void main() {
  vec4 a = texture(uA, vUv) * uOpacity, b = texture(uB, vUv);
  if (uInside > 0.5) a *= b.a; // solo dentro la forma di B
  vec4 ua = unpre(a), ub = unpre(b);
  vec3 mixed = blend(ub.rgb, ua.rgb, uMode);
  vec3 rgb = mixed * a.a * b.a + ua.rgb * a.a * (1.0 - b.a) + ub.rgb * b.a * (1.0 - a.a);
  o = vec4(rgb, a.a + b.a * (1.0 - a.a));
}`
export function composite(g: FxGL, a: Tex, b: Tex, mode: keyof typeof MODE = 'over', opacity = 1, insideB = false): Tex {
  return g.pass('top-composite', COMPOSITE, b.w, b.h, { uA: a, uB: b, uMode: MODE[mode], uOpacity: opacity, uInside: insideB ? 1 : 0 })
}

/* ── Lookup TOP: rampa di colori indicizzata dalla luminanza (o dall'alpha) ── */
const LOOKUP = LIB + `
uniform sampler2D uSrc; uniform vec3 uC0, uC1, uC2, uC3, uC4, uC5; uniform float uN, uByAlpha, uKeepAlpha;
vec3 col(int k) { return k <= 0 ? uC0 : k == 1 ? uC1 : k == 2 ? uC2 : k == 3 ? uC3 : k == 4 ? uC4 : uC5; }
vec3 ramp(float x) {
  float f = clamp(x, 0.0, 1.0) * (uN - 1.0); int i = int(floor(f)); float t = f - float(i);
  int last = int(uN) - 1;
  return mix(col(min(i, last)), col(min(i + 1, last)), smoothstep(0.0, 1.0, t));
}
void main() {
  vec4 c = texture(uSrc, vUv), u = unpre(c);
  float x = uByAlpha > 0.5 ? c.a : luma(u.rgb);
  float a = uKeepAlpha > 0.5 ? c.a : 1.0;
  o = pre(vec4(ramp(x), a));
}`
export function lookup(g: FxGL, src: Tex, colors: string[], o: { byAlpha?: boolean; keepAlpha?: boolean } = {}): Tex {
  const list = colors.slice(0, 6).map(hex)
  while (list.length < 6) list.push(list[list.length - 1] ?? [1, 1, 1])
  return g.pass('top-lookup', LOOKUP, src.w, src.h, { uSrc: src, uC0: list[0], uC1: list[1], uC2: list[2], uC3: list[3], uC4: list[4], uC5: list[5], uN: Math.max(2, Math.min(6, colors.length)), uByAlpha: o.byAlpha ? 1 : 0, uKeepAlpha: o.keepAlpha === false ? 0 : 1 })
}

/* ── Transform TOP: sposta, scala, ruota attorno al centro ── */
const TRANSFORM = LIB + `
uniform sampler2D uSrc; uniform vec2 uT; uniform float uS, uR;
void main() {
  vec2 p = vUv * uRes - uRes * 0.5 - uT;
  float c = cos(-uR), s = sin(-uR);
  p = mat2(c, -s, s, c) * p / uS + uRes * 0.5;
  vec2 uv = p / uRes;
  o = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? vec4(0.0) : texture(uSrc, uv);
}`
export function transform(g: FxGL, src: Tex, o: { translate?: Vec; scale?: number; rotate?: number }): Tex {
  return g.pass('top-transform', TRANSFORM, src.w, src.h, { uSrc: src, uT: o.translate ?? [0, 0], uS: o.scale ?? 1, uR: o.rotate ?? 0 })
}

/* ── Feedback TOP (fermo immagine): l'uscita rientra n volte, trasformata e attenuata ── */
export function feedback(g: FxGL, src: Tex, o: { steps: number; translate?: Vec; scale?: number; rotate?: number; decay: number; mode?: keyof typeof MODE; tint?: string[] }): Tex {
  let acc = src
  for (let i = 0; i < o.steps; i++) {
    const moved = transform(g, acc, { translate: o.translate, scale: o.scale, rotate: o.rotate })
    const faded = level(g, moved, { opacity: o.decay })
    const next = composite(g, src, faded, o.mode ?? 'over')
    g.release(moved, faded)
    if (acc !== src) g.release(acc)
    acc = next
  }
  if (o.tint?.length) { const t = lookup(g, acc, o.tint, { byAlpha: true }); if (acc !== src) g.release(acc); acc = t }
  return acc
}

/* ── Threshold TOP: soglia morbida sulla copertura (bordi "gooey" dopo una sfocatura) ── */
const THRESHOLD = LIB + `
uniform sampler2D uSrc; uniform float uLevel, uSoft; uniform vec3 uColor; uniform float uUseColor;
void main() {
  vec4 c = texture(uSrc, vUv); vec4 u = unpre(c);
  float a = smoothstep(uLevel - uSoft, uLevel + uSoft, c.a);
  vec3 rgb = uUseColor > 0.5 ? uColor : u.rgb;
  o = pre(vec4(rgb, a));
}`
export function threshold(g: FxGL, src: Tex, o: { level?: number; soft?: number; color?: string } = {}): Tex {
  return g.pass('top-threshold', THRESHOLD, src.w, src.h, { uSrc: src, uLevel: o.level ?? 0.5, uSoft: o.soft ?? 0.04, uColor: hex(o.color ?? '#ffffff'), uUseColor: o.color ? 1 : 0 })
}

/* ── Channel Shift: canali R/G/B spostati (aberrazione cromatica controllata) ── */
const SHIFT = LIB + `
uniform sampler2D uSrc; uniform vec2 uR, uB;
void main() {
  vec4 r = texture(uSrc, vUv + uR / uRes), g = texture(uSrc, vUv), b = texture(uSrc, vUv + uB / uRes);
  float a = max(max(r.a, g.a), b.a);
  o = vec4(r.r, g.g, b.b, a);
}`
export function channelShift(g: FxGL, src: Tex, red: Vec, blue: Vec): Tex {
  return g.pass('top-shift', SHIFT, src.w, src.h, { uSrc: src, uR: red, uB: blue })
}

/* ── Normal Map TOP + luce ambiente: rilievo da una mappa d'altezza, riflesso a strisce (cromo) ── */
const SHADE = LIB + `
uniform sampler2D uSrc, uHeight; uniform float uDepth, uChrome; uniform vec3 uE0, uE1, uE2, uE3; uniform vec2 uLight;
void main() {
  vec2 t = 1.0 / uRes;
  float hl = texture(uHeight, vUv - vec2(t.x, 0)).a, hr = texture(uHeight, vUv + vec2(t.x, 0)).a;
  float hu = texture(uHeight, vUv - vec2(0, t.y)).a, hd = texture(uHeight, vUv + vec2(0, t.y)).a;
  vec3 n = normalize(vec3((hl - hr) * uDepth, (hu - hd) * uDepth, 1.0));
  vec4 c = texture(uSrc, vUv);
  // ambiente a bande, come un riflesso di studio: cielo chiaro, orizzonte scuro, terra calda
  float e = n.y * 0.5 + 0.5 + n.x * 0.15;
  vec3 env = e < 0.45 ? mix(uE0, uE1, smoothstep(0.0, 0.45, e)) : e < 0.55 ? mix(uE1, uE2, smoothstep(0.45, 0.55, e)) : mix(uE2, uE3, smoothstep(0.55, 1.0, e));
  float spec = pow(max(0.0, dot(n, normalize(vec3(uLight, 1.0)))), 40.0);
  vec3 base = unpre(c).rgb;
  vec3 rgb = mix(base * (0.55 + 0.45 * dot(n, normalize(vec3(uLight, 1.0)))), env, uChrome) + spec * 0.9;
  o = pre(vec4(rgb, c.a));
}`
export function shade(g: FxGL, src: Tex, height: Tex, o: { depth: number; chrome?: number; env?: string[]; light?: Vec }): Tex {
  const env = (o.env ?? ['#1b1d22', '#f4f6fb', '#2a2c33', '#c9ccd4']).slice(0, 4).map(hex)
  return g.pass('top-shade', SHADE, src.w, src.h, { uSrc: src, uHeight: height, uDepth: o.depth, uChrome: o.chrome ?? 1, uE0: env[0], uE1: env[1], uE2: env[2], uE3: env[3], uLight: o.light ?? [-0.4, -0.6] })
}

export { hex as hexToRgb }
