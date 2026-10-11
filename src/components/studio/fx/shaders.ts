/**
 * Shader GLSL (WebGL2) del motore effetti. Colori premoltiplicati; le misure
 * arrivano già in pixel della cache (moltiplicate per lo zoom `uZ`).
 */
import { LIB } from './gl'

/* ════════════════ shader ════════════════ */
// intestazione comune agli effetti: sorgente corrente, originale, campo di distanze
export const FX = LIB + `
uniform sampler2D uSrc; uniform sampler2D uOrig; uniform sampler2D uSdf;
uniform float uZ, uT, uAmt, uHasSdf;
float sd(vec2 uv) { return uHasSdf > 0.5 ? texture(uSdf, uv).r : 0.5 - texture(uOrig, uv).a; }
vec2 px() { return 1.0 / uRes; }
`

export const MASK = LIB + `uniform sampler2D uSdf; uniform float uE;
void main() { float m = clamp(0.5 - (texture(uSdf, vUv).r + uE), 0.0, 1.0); o = vec4(m); }`
export const MASK_A = LIB + `uniform sampler2D uSrc; void main() { o = vec4(texture(uSrc, vUv).a); }`

export const ADJUST = LIB + `
uniform sampler2D uSrc, uBlurL, uBlurS;
uniform float uTemp, uTint, uExp, uCon, uHi, uSh, uWh, uBl, uClar, uVib, uSat, uSharp, uFade, uCurve, uBal;
uniform vec2 uGSh, uGMid, uGHi;
uniform float uHslH[8]; uniform float uHslS[8]; uniform float uHslL[8];
const float HUES[8] = float[8](0.0, 30.0, 58.0, 115.0, 180.0, 225.0, 275.0, 320.0);
float curveF(float x, float k) {
  if (k < 0.5) return x;
  if (k < 1.5) return mix(x, smoothstep(0.0, 1.0, x), 0.45);
  if (k < 2.5) return mix(x, smoothstep(0.0, 1.0, smoothstep(0.0, 1.0, x)), 0.5);
  if (k < 3.5) return 0.07 + 0.9 * mix(x, smoothstep(0.0, 1.0, x), 0.25);
  if (k < 4.5) { float s = mix(x, smoothstep(0.0, 1.0, x), 0.35); return 0.045 + s * (x > 0.75 ? 0.9 : 0.93); }
  return x <= 0.6 ? x : 0.6 + 0.4 * (1.0 - exp(-(x - 0.6) / 0.4 * 1.6)) / (1.0 - exp(-1.6));
}
vec3 tintOf(float hueDeg) { vec3 c = hsv2rgb(vec3(hueDeg / 360.0, 1.0, 1.0)); return c - vec3(luma(c)); }
void main() {
  vec4 s = texture(uSrc, vUv);
  if (s.a <= 0.0) { o = s; return; }
  vec3 c = s.rgb / s.a;
  if (uSharp > 0.0) { vec4 b = texture(uBlurS, vUv); vec3 bc = b.a > 0.0 ? b.rgb / b.a : c; c += (c - bc) * uSharp * 2.2; }
  if (uClar != 0.0) {
    vec4 b = texture(uBlurL, vUv); vec3 bc = b.a > 0.0 ? b.rgb / b.a : c;
    float L = luma(c), BL = luma(bc), mid = 1.0 - abs(L - 0.5) * 2.0;
    c += vec3((L - BL) * uClar * 1.1 * (0.25 + 0.75 * mid));
  }
  c = max(c, 0.0);
  c *= vec3(1.0 + 0.18 * uTemp, 1.0 + 0.03 * uTemp, 1.0 - 0.20 * uTemp);
  c *= vec3(1.0 + 0.07 * uTint, 1.0 - 0.12 * uTint, 1.0 + 0.07 * uTint);
  c *= exp2(uExp * 1.5);
  float k = uCon > 0.0 ? 1.0 + uCon * 1.1 : 1.0 + uCon * 0.7;
  c = (c - 0.5) * k + 0.5;
  float L = luma(clamp(c, 0.0, 1.0));
  c += uSh * 0.4 * (1.0 - smoothstep(0.0, 0.5, L)) * (1.0 - L)
     + uHi * 0.4 * smoothstep(0.5, 1.0, L) * L
     + uBl * 0.22 * (1.0 - smoothstep(0.0, 0.28, L))
     + uWh * 0.22 * smoothstep(0.72, 1.0, L);
  c = clamp(c, 0.0, 1.0);
  c = vec3(curveF(c.r, uCurve), curveF(c.g, uCurve), curveF(c.b, uCurve));
  // mixer per tonalità: pesi morbidi tra bande vicine, solo sui colori (non sui grigi)
  vec3 hsv = rgb2hsv(c);
  float hd = hsv.x * 360.0, dh = 0.0, ds = 0.0, dl = 0.0;
  for (int i = 0; i < 8; i++) {
    float d = abs(mod(hd - HUES[i] + 180.0, 360.0) - 180.0);
    float w = clamp(1.0 - d / 45.0, 0.0, 1.0); w = w * w * (3.0 - 2.0 * w);
    dh += uHslH[i] * w; ds += uHslS[i] * w; dl += uHslL[i] * w;
  }
  float sw = smoothstep(0.03, 0.3, hsv.y);
  hsv.x = fract(hsv.x + dh * sw * 30.0 / 360.0);
  hsv.y = clamp(hsv.y * (1.0 + ds * sw), 0.0, 1.0);
  c = hsv2rgb(hsv) * (1.0 + dl * sw * 0.45);
  L = luma(c);
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  c = mix(vec3(L), c, 1.0 + uVib * (1.0 - (mx - mn)) * 1.4);
  c = mix(vec3(luma(c)), c, 1.0 + uSat);
  // color grading a tre zone (viraggio senza cambiare la luminanza)
  L = clamp(luma(c), 0.0, 1.0);
  float pivot = 0.5 + uBal * 0.25;
  float wS = 1.0 - smoothstep(0.0, pivot, L), wH = smoothstep(pivot, 1.0, L), wM = clamp(1.0 - wS - wH, 0.0, 1.0);
  c += tintOf(uGSh.x) * uGSh.y * 0.42 * wS + tintOf(uGMid.x) * uGMid.y * 0.32 * wM + tintOf(uGHi.x) * uGHi.y * 0.36 * wH;
  c = mix(c, vec3(0.08) + c * 0.86, uFade);
  o = vec4(clamp(c, 0.0, 1.0) * s.a, s.a);
}`

export const HAL_MASK = LIB + `uniform sampler2D uSrc; uniform float uTh;
void main() {
  vec4 s = texture(uSrc, vUv); vec3 c = s.a > 0.0 ? s.rgb / s.a : vec3(0.0);
  float m = smoothstep(uTh, 1.0, luma(c)) * s.a;
  o = vec4(vec3(1.0, 0.28, 0.1) * m, m);
}`
export const HAL_ADD = LIB + `uniform sampler2D uSrc, uB; uniform float uK;
void main() { vec4 s = texture(uSrc, vUv), h = texture(uB, vUv) * uK; o = clamp(vec4(s.rgb + h.rgb, max(s.a, min(1.0, h.a * 0.8))), 0.0, 1.0); }`

export const FINISH = LIB + `uniform sampler2D uSrc; uniform float uVig, uVigF, uGrain, uGrainSize, uZ, uT;
void main() {
  vec4 s = texture(uSrc, vUv);
  if (s.a <= 0.0) { o = s; return; }
  vec3 c = s.rgb / s.a;
  float asp = uRes.x / uRes.y;
  float r = length((vUv - 0.5) * vec2(asp, 1.0)) / length(vec2(asp, 1.0) * 0.5);
  float f = smoothstep(mix(0.6, 0.05, uVigF), 1.05, r);
  if (uVig > 0.0) c *= 1.0 - f * uVig * 0.9; else c = mix(c, vec3(1.0), f * (-uVig) * 0.9);
  float gs = mix(0.7, 3.6, uGrainSize) * uZ;
  vec2 q = gl_FragCoord.xy / max(gs, 0.35) + fract(uT * 7.31) * vec2(91.7, 37.3);
  float n = (vnoise(q) * 2.0 - 1.0) * 0.65 + (vnoise(q * 2.13 + 5.2) * 2.0 - 1.0) * 0.35;
  float L = luma(c);
  c += n * uGrain * 0.24 * (0.25 + 3.0 * L * (1.0 - L));
  o = vec4(clamp(c, 0.0, 1.0) * s.a, s.a);
}`

export const SHADOW_COMP = LIB + `uniform sampler2D uSrc, uM; uniform vec2 uOff; uniform vec3 uCol; uniform float uOp;
void main() { float a = texture(uM, vUv - uOff).a * uOp; o = over(texture(uSrc, vUv), vec4(uCol * a, a)); }`

export const INNER_SHADOW = LIB + `uniform sampler2D uSrc, uM; uniform vec2 uOff; uniform vec3 uCol; uniform float uOp;
void main() {
  vec4 s = texture(uSrc, vUv);
  if (s.a <= 0.0) { o = s; return; }
  float k = (1.0 - texture(uM, vUv - uOff).a) * uOp;
  vec3 c = s.rgb / s.a;
  vec3 t = luma(uCol) > 0.5 ? blend(c, uCol, 2.0) : blend(c, uCol, 1.0);
  o = vec4(mix(c, t, k) * s.a, s.a);
}`

export const GLOW_COMP = LIB + `uniform sampler2D uSrc, uM; uniform vec3 uCol, uCol2; uniform float uTwo, uOp;
void main() {
  float g = texture(uM, vUv).a;
  float a = clamp(g * 1.7, 0.0, 1.0) * uOp;
  vec3 col = uTwo > 0.5 ? mix(uCol2, uCol, smoothstep(0.05, 0.75, g)) : uCol;
  o = over(texture(uSrc, vUv), vec4(col * a, a));
}`

export const INNER_GLOW = FX + `uniform vec3 uCol; uniform float uOp, uCenter, uChoke, uSize;
void main() {
  vec4 s = texture(uSrc, vUv);
  if (s.a <= 0.0) { o = s; return; }
  float di = -sd(vUv);
  float g = uCenter > 0.5 ? smoothstep(uChoke, uChoke + uSize, di) : 1.0 - smoothstep(uChoke, uChoke + uSize, di);
  vec3 c = s.rgb / s.a;
  o = vec4(mix(c, blend(c, uCol, 2.0), g * uOp) * s.a, s.a);
}`

export const BEVEL_H = FX + `uniform float uSize, uStyle, uTech;
float prof(float x) { x = clamp(x, 0.0, 1.0); return uTech > 0.5 ? x : sin(x * 1.5708); }
void main() {
  float d = sd(vUv), di = -d, h;
  if (uStyle < 0.5) h = d < 0.0 ? prof(di / uSize) : 0.0;
  else if (uStyle < 1.5) h = d > 0.0 ? 1.0 - prof(d / uSize) : 1.0;
  else if (uStyle < 2.5) h = prof((di + uSize * 0.5) / uSize);
  else h = d < 0.0 ? 1.0 - prof(di / uSize) : 1.0 - prof(d / uSize);
  o = vec4(h, h, h, 1.0);
}`

export const BEVEL = FX + `uniform sampler2D uH; uniform float uSize, uStyle, uDepth, uAng, uAlt, uGloss, uHiOp, uShOp; uniform vec3 uHi, uShC;
void main() {
  vec4 s = texture(uSrc, vUv);
  vec2 e = px() * 1.5;
  float hx = (texture(uH, vUv + vec2(e.x, 0.0)).r - texture(uH, vUv - vec2(e.x, 0.0)).r) / 1.5;
  float hy = (texture(uH, vUv + vec2(0.0, e.y)).r - texture(uH, vUv - vec2(0.0, e.y)).r) / 1.5;
  float D = uSize * 0.5 * uDepth;
  vec3 n = normalize(vec3(-hx * D, -hy * D, 1.0));
  vec3 L = normalize(vec3(cos(uAng) * cos(uAlt), -sin(uAng) * cos(uAlt), sin(uAlt)));
  float sh0 = L.z, sl = dot(n, L);
  float hl = max(sl - sh0, 0.0) / (1.0 - sh0 + 1e-3);
  float dk = max(sh0 - sl, 0.0) / (sh0 + 1e-3);
  hl = mix(hl, 0.5 - 0.5 * cos(hl * 9.4248), uGloss);
  dk = mix(dk, 0.5 - 0.5 * cos(dk * 6.2832), uGloss * 0.6);
  float d = sd(vUv);
  bool inner = uStyle < 0.5 || uStyle > 1.5;
  vec4 res = s;
  if (s.a > 0.0 && (inner || uStyle < 1.5)) {
    vec3 c = s.rgb / s.a;
    c = mix(c, blend(c, uHi, 2.0), clamp(hl * uHiOp, 0.0, 1.0));
    c = mix(c, blend(c, uShC, 1.0), clamp(dk * uShOp, 0.0, 1.0));
    res = vec4(c * s.a, s.a);
  }
  // smusso esterno, rilievo e cuscino disegnano anche fuori dalla forma
  if (uStyle > 0.5 && d > 0.0 && d < uSize) {
    float ah = clamp(hl * uHiOp, 0.0, 1.0) * 0.75, ad = clamp(dk * uShOp, 0.0, 1.0) * 0.75;
    vec4 lay = ah > ad ? vec4(uHi * ah, ah) : vec4(uShC * ad, ad);
    res = over(res, lay);
  }
  o = res;
}`

export const STROKE = FX + `uniform float uPos, uSize, uGrad, uGAng, uOp; uniform vec3 uCol, uCol2;
void main() {
  vec4 s = texture(uSrc, vUv);
  float d = sd(vUv), w = uSize;
  vec3 col = uCol;
  if (uGrad > 0.5) { vec2 dir = vec2(cos(uGAng), sin(uGAng)); col = mix(uCol, uCol2, clamp(dot(vUv - 0.5, dir) + 0.5, 0.0, 1.0)); }
  if (uPos < 0.5) {           // esterno: sotto il riempimento, così il bordo interno resta pulito
    float cov = clamp(w - d + 0.5, 0.0, 1.0) * uOp;
    o = over(s, vec4(col * cov, cov));
  } else {
    float e1 = uPos < 1.5 ? -w * 0.5 : -w, e2 = uPos < 1.5 ? w * 0.5 : 0.0;
    float cov = clamp(e2 - d + 0.5, 0.0, 1.0) * clamp(d - e1 + 0.5, 0.0, 1.0) * uOp;
    if (uPos > 1.5) cov *= s.a;
    o = over(vec4(col * cov, cov), s);
  }
}`

export const SATIN = LIB + `uniform sampler2D uSrc, uB; uniform vec2 uOff; uniform vec3 uCol; uniform float uOp, uInv;
void main() {
  vec4 s = texture(uSrc, vUv);
  if (s.a <= 0.0) { o = s; return; }
  float v = abs(texture(uB, vUv + uOff).a - texture(uB, vUv - uOff).a);
  v = uInv > 0.5 ? 1.0 - v : v;
  vec3 c = s.rgb / s.a;
  vec3 t = luma(uCol) > 0.5 ? blend(c, uCol, 2.0) : blend(c, uCol, 1.0);
  o = vec4(mix(c, t, clamp(v * 1.4, 0.0, 1.0) * uOp) * s.a, s.a);
}`

export const COLOR_OVERLAY = FX + `uniform vec3 uCol; uniform float uMode, uOp;
void main() { vec4 s = texture(uSrc, vUv); if (s.a <= 0.0) { o = s; return; } vec3 c = s.rgb / s.a; o = vec4(mix(c, blend(c, uCol, uMode), uOp) * s.a, s.a); }`

export const GRAD_OVERLAY = FX + `uniform vec3 uC1, uC2, uC3; uniform float uThree, uType, uAng, uScale, uMode, uOp;
void main() {
  vec4 s = texture(uSrc, vUv); if (s.a <= 0.0) { o = s; return; }
  vec2 p = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  vec2 dir = vec2(cos(uAng), sin(uAng));
  float t;
  if (uType < 0.5) t = dot(vUv - 0.5, dir) / uScale + 0.5;
  else if (uType < 1.5) t = length(p) / (0.6 * uScale);
  else if (uType < 2.5) t = 1.0 - abs(dot(vUv - 0.5, dir)) * 2.0 / uScale;
  else t = fract(atan(p.y, p.x) / 6.2832 + uAng / 6.2832);
  t = clamp(t, 0.0, 1.0);
  vec3 g = uThree > 0.5 ? (t < 0.5 ? mix(uC1, uC2, t * 2.0) : mix(uC2, uC3, t * 2.0 - 1.0)) : mix(uC1, uC2, t);
  vec3 c = s.rgb / s.a;
  o = vec4(mix(c, blend(c, g, uMode), uOp) * s.a, s.a);
}`

export const TEX_OVERLAY = FX + `uniform float uKind, uScale, uMode, uOp;
void main() {
  vec4 s = texture(uSrc, vUv); if (s.a <= 0.0) { o = s; return; }
  vec2 q = gl_FragCoord.xy / (uZ * uScale);
  float v;
  if (uKind < 0.5) v = 0.5 + (hash12(floor(q * 1.5)) - 0.5) * 0.9;
  else if (uKind < 1.5) { float f = fbm(q * vec2(0.012, 0.05)) * 0.6 + fbm(q * 0.08) * 0.4; v = 0.62 + (f - 0.5) * 0.55 + (hash12(floor(q)) - 0.5) * 0.08; }
  else if (uKind < 2.5) { float w = sin(q.x * 1.3) * sin(q.y * 1.3); v = 0.55 + w * 0.12 + (fbm(q * 0.15) - 0.5) * 0.3; }
  else if (uKind < 3.5) { v = 0.5 + (fbm(q * 0.05) - 0.5) * 0.7 + (fbm(q * 0.6) - 0.5) * 0.25; v -= step(0.985, hash12(floor(q * 0.5))) * 0.35; }
  else { float l = smoothstep(0.985, 1.0, vnoise(vec2(q.x * 0.02 + q.y * 0.2, q.y * 0.004) * 6.0)); v = 0.5 + l * 0.5 + (fbm(q * 0.08) - 0.5) * 0.15; }
  vec3 c = s.rgb / s.a;
  o = vec4(mix(c, clamp(blend(c, vec3(v), uMode), 0.0, 1.0), uOp) * s.a, s.a);
}`

export const NEON = FX + `uniform sampler2D uB1, uB2, uB3; uniform vec3 uCol; uniform float uInt, uTube, uFlick, uEdge;
void main() {
  vec4 s = texture(uSrc, vUv);
  float fl = 1.0;
  if (uFlick > 0.0) { float tt = floor(uT * 14.0); fl = 1.0 - step(1.0 - uFlick * 0.35, hash12(vec2(tt, 3.7))) * 0.55; }
  float g = (texture(uB1, vUv).a * 0.9 + texture(uB2, vUv).a * 0.65 + texture(uB3, vUv).a * 0.45) * uInt * 1.35 * fl;
  g = clamp(g, 0.0, 1.0);
  vec4 glow = vec4(uCol * g, g);
  float A = s.a;
  float e = 1.0 - smoothstep(0.0, uEdge, -sd(vUv));
  vec3 core = mix(uCol, vec3(1.0), uTube * fl);
  vec3 fill = mix(core, uCol, e * 0.8);
  vec4 res = over(vec4(fill * A, A), glow);
  o = mix(s, res, uAmt);
}`

export const ECHO = FX + `uniform int uCount; uniform vec2 uOff; uniform float uUse, uFade; uniform vec3 uCol;
void main() {
  vec4 acc = vec4(0.0);
  for (int i = 10; i >= 1; i--) {
    if (i > uCount) continue;
    vec4 e = texture(uOrig, vUv - uOff * float(i));
    float k = 1.0 - uFade * float(i) / float(uCount + 1);
    vec3 col = uUse > 0.5 ? uCol : (e.a > 0.0 ? e.rgb / e.a : vec3(0.0));
    float a = e.a * k;
    acc = over(vec4(col * a, a), acc);
  }
  vec4 s = texture(uSrc, vUv);
  o = mix(s, over(s, acc), uAmt);
}`

export const HOLLOW = FX + `uniform float uW;
void main() {
  vec4 s = texture(uSrc, vUv);
  float d = sd(vUv);
  float band = clamp(d + uW + 0.5, 0.0, 1.0) * clamp(0.5 - d, 0.0, 1.0);
  vec3 c = s.a > 0.0 ? s.rgb / s.a : vec3(0.0);
  o = mix(s, vec4(c * band * s.a, band * s.a), uAmt);
}`

export const SPLICE = FX + `uniform float uW; uniform vec2 uOff; uniform vec3 uCol;
void main() {
  vec4 s = texture(uSrc, vUv);
  float d = sd(vUv);
  float band = clamp(d + uW + 0.5, 0.0, 1.0) * clamp(0.5 - d, 0.0, 1.0) * s.a;
  vec3 c = s.a > 0.0 ? s.rgb / s.a : vec3(0.0);
  float a2 = texture(uOrig, vUv - uOff).a;
  o = mix(s, over(vec4(c * band, band), vec4(uCol * a2, a2)), uAmt);
}`

export const LONG_SHADOW = FX + `uniform vec2 uDir; uniform vec3 uCol; uniform float uOp, uFade;
void main() {
  float acc = 0.0;
  for (int k = 1; k <= 128; k++) {
    float f = float(k) / 128.0;
    acc = max(acc, texture(uOrig, vUv - uDir * f).a * (1.0 - uFade * f));
  }
  float a = acc * uOp;
  vec4 s = texture(uSrc, vUv);
  o = mix(s, over(s, vec4(uCol * a, a)), uAmt);
}`

export const EXTRUDE = FX + `uniform vec2 uDir; uniform vec3 uCol; uniform float uShade;
void main() {
  vec4 lay = vec4(0.0);
  for (int k = 1; k <= 96; k++) {
    float f = float(k) / 96.0;
    float a = texture(uOrig, vUv - uDir * f).a;
    if (a > 0.02) {
      vec3 col = uCol * (1.0 - uShade * 0.55 * f) + vec3(0.06) * (1.0 - f);
      lay = vec4(col * a, a);
      break;
    }
  }
  vec4 s = texture(uSrc, vUv);
  o = mix(s, over(s, lay), uAmt);
}`

export const GLITCH = FX + `uniform float uPow, uSplit, uSlices, uNoise;
void main() {
  float t = floor(uT * 12.0) + 1.0;
  float row = floor(vUv.y * uSlices + hash12(vec2(t, 3.0)) * 2.0);
  float r1 = hash12(vec2(row, t));
  float shift = r1 > 1.0 - uPow * 0.6 ? (hash12(vec2(t, row * 1.7)) - 0.5) * uPow * 0.12 : 0.0;
  vec2 uv = vUv + vec2(shift, 0.0);
  vec2 blk = floor(vUv * vec2(6.0, uSlices * 0.5));
  if (hash12(blk + t) > 1.0 - uPow * 0.15) uv.x += (hash12(blk * 3.1 + t) - 0.5) * 0.08 * uPow;
  float sp = uSplit * 0.025;
  vec4 r = texture(uSrc, uv + vec2(sp, 0.0)), g = texture(uSrc, uv), b = texture(uSrc, uv - vec2(sp * 0.7, sp * 0.25));
  vec4 res = vec4(r.r, g.g, b.b, max(g.a, max(r.a, b.a)));
  vec2 cell = floor(gl_FragCoord.xy / (3.0 * uZ));
  if (hash12(cell + t * 1.3) < uNoise * 0.05) res.rgb = vec3(hash12(cell * 2.1 + t)) * res.a;
  res.rgb *= 1.0 - 0.14 * uPow * step(0.5, fract(gl_FragCoord.y / (2.0 * uZ)));
  o = mix(texture(uSrc, vUv), res, uAmt);
}`

export const BLOOM_MASK = LIB + `uniform sampler2D uSrc; uniform float uTh;
void main() { vec4 s = texture(uSrc, vUv); vec3 c = s.a > 0.0 ? s.rgb / s.a : vec3(0.0); float m = smoothstep(uTh, uTh + 0.25, luma(c)) * s.a; o = vec4(c * m, m); }`
export const BLOOM = FX + `uniform sampler2D uB1, uB2; uniform float uInt, uWarm;
void main() {
  vec4 s = texture(uSrc, vUv);
  vec4 b = (texture(uB1, vUv) * 0.6 + texture(uB2, vUv) * 0.8) * uInt * 1.6;
  vec3 tint = mix(vec3(1.0), uWarm > 0.0 ? vec3(1.0, 0.82, 0.58) : vec3(0.62, 0.8, 1.0), abs(uWarm));
  vec4 res = vec4(min(s.rgb + b.rgb * tint, 1.0), clamp(max(s.a, b.a * 0.9), 0.0, 1.0));
  o = mix(s, res, uAmt);
}`

export const LIGHT_LEAK = FX + `uniform vec3 uC1, uC2; uniform float uPos, uSize, uSpeed;
void main() {
  vec4 s = texture(uSrc, vUv); if (s.a <= 0.0) { o = s; return; }
  float t = uT * 0.15 * (uSpeed > 0.0 ? 1.0 : 0.0);
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p1 = vec2(uPos + 0.12 * sin(t), 0.15 + 0.1 * cos(t * 1.3));
  vec2 p2 = vec2(1.0 - uPos * 0.6, 0.85 + 0.08 * sin(t * 0.7));
  float r = uSize * 0.9;
  float l1 = exp(-pow(length((vUv - p1) * asp) / r, 2.0) * 2.2);
  float l2 = exp(-pow(length((vUv - p2) * asp) / (r * 0.8), 2.0) * 2.6);
  vec3 light = uC1 * l1 + uC2 * l2 * 0.8;
  vec3 c = s.rgb / s.a;
  o = mix(s, vec4(blend(c, clamp(light, 0.0, 1.0), 2.0) * s.a, s.a), uAmt);
}`

export const HALFTONE = FX + `uniform float uMode, uShape, uSize, uAng, uPaperOn; uniform vec3 uInk, uPaper;
vec4 cellSample(vec2 pp, float ang, float cell, out vec2 f) {
  mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)), Rt = mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
  vec2 p = R * pp; vec2 cc = (floor(p / cell) + 0.5) * cell; f = p - cc;
  return texture(uSrc, clamp((Rt * cc) / uRes, 0.0, 1.0));
}
float dotCov(vec2 f, float cell, float v) {
  float aa = 1.0 / cell; v = clamp(v, 0.0, 1.0);
  if (uShape < 0.5) return smoothstep(sqrt(v) * 0.72 + aa, sqrt(v) * 0.72 - aa, length(f) / cell);
  if (uShape < 1.5) return smoothstep(sqrt(v) * 0.5 + aa, sqrt(v) * 0.5 - aa, max(abs(f.x), abs(f.y)) / cell);
  return smoothstep(v * 0.5 + aa, v * 0.5 - aa, abs(f.y) / cell);
}
void main() {
  vec4 s = texture(uSrc, vUv);
  vec2 pp = vUv * uRes;
  float cell = max(uSize * uZ, 2.0);
  vec4 res;
  if (uMode > 1.5) {
    vec2 f; vec4 sc; vec3 cc; float kk;
    vec3 col = uPaperOn > 0.5 ? uPaper : vec3(1.0);
    float cov = 0.0;
    // quadricromia: quattro retini ad angoli diversi, inchiostri sottrattivi
    sc = cellSample(pp, radians(15.0), cell, f); cc = sc.a > 0.0 ? sc.rgb / sc.a : vec3(1.0); kk = 1.0 - max(cc.r, max(cc.g, cc.b));
    float cC = dotCov(f, cell, (1.0 - cc.r - kk) / max(1.0 - kk, 1e-3) * sc.a);
    sc = cellSample(pp, radians(75.0), cell, f); cc = sc.a > 0.0 ? sc.rgb / sc.a : vec3(1.0); kk = 1.0 - max(cc.r, max(cc.g, cc.b));
    float cM = dotCov(f, cell, (1.0 - cc.g - kk) / max(1.0 - kk, 1e-3) * sc.a);
    sc = cellSample(pp, radians(0.0), cell, f); cc = sc.a > 0.0 ? sc.rgb / sc.a : vec3(1.0); kk = 1.0 - max(cc.r, max(cc.g, cc.b));
    float cY = dotCov(f, cell, (1.0 - cc.b - kk) / max(1.0 - kk, 1e-3) * sc.a);
    sc = cellSample(pp, radians(45.0), cell, f); cc = sc.a > 0.0 ? sc.rgb / sc.a : vec3(1.0);
    float cK = dotCov(f, cell, (1.0 - max(cc.r, max(cc.g, cc.b))) * sc.a);
    col *= mix(vec3(1.0), vec3(0.0, 0.68, 0.94), cC) * mix(vec3(1.0), vec3(0.93, 0.0, 0.55), cM) * mix(vec3(1.0), vec3(1.0, 0.95, 0.0), cY) * mix(vec3(1.0), vec3(0.12), cK);
    cov = max(max(cC, cM), max(cY, cK));
    float a = uPaperOn > 0.5 ? s.a : cov * s.a;
    res = vec4(col * a, a);
  } else {
    vec2 f; vec4 sc = cellSample(pp, uAng, cell, f);
    vec3 cc = sc.a > 0.0 ? sc.rgb / sc.a : vec3(1.0);
    float v = uMode < 0.5 ? (1.0 - luma(cc)) : clamp(1.15 - luma(cc) * 0.85, 0.0, 1.0);
    float cov = dotCov(f, cell, v * sc.a);
    vec3 ink = uMode < 0.5 ? uInk : cc;
    if (uPaperOn > 0.5) res = vec4(mix(uPaper, ink, cov) * s.a, s.a);
    else { float a = cov * max(s.a, sc.a); res = vec4(ink * a, a); }
  }
  o = mix(s, res, uAmt);
}`

export const RISO = FX + `uniform vec3 uInk1, uInk2, uPaper; uniform float uScreen, uSize, uReg1, uReg2, uLoad, uWear;
float sep(vec3 c, vec3 ink) { vec3 k = 1.0 - ink; return clamp(dot(1.0 - c, k) / max(dot(k, k), 1e-3), 0.0, 1.0); }
float b2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float b4(vec2 a) { return b2(0.5 * a) * 0.25 + b2(a); }
float b8(vec2 a) { return b4(0.5 * a) * 0.25 + b2(a); }
float screenT(vec2 p, float ang) {
  if (uScreen < 0.5) {
    // trama della matrice Riso: ordinata ma "sporcata" da macchie morbide, mai rumore pixel per pixel
    vec2 c = floor(p / max(uSize * uZ, 1.0));
    return clamp(b8(c) * 0.6 + vnoise(c * 0.37) * 0.25 + hash12(c) * 0.15, 0.0, 1.0);
  }
  mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  float cell = max(uSize * uZ * 2.5, 2.0);
  vec2 q = R * p; vec2 f = fract(q / cell) - 0.5;
  return clamp(length(f) * 1.41, 0.0, 1.0);
}
void main() {
  vec4 s = texture(uSrc, vUv);
  vec2 p = vUv * uRes;
  vec2 o1 = vec2(-0.7, 0.45) * uReg1 * uZ / uRes, o2 = vec2(0.6, -0.5) * uReg2 * uZ / uRes;
  vec4 s1 = texture(uSrc, vUv - o1), s2 = texture(uSrc, vUv - o2);
  vec3 c1 = s1.a > 0.0 ? s1.rgb / s1.a : vec3(1.0), c2 = s2.a > 0.0 ? s2.rgb / s2.a : vec3(1.0);
  float v1 = pow(sep(c1, uInk1), 1.35) * s1.a * 0.92, v2 = pow(sep(c2, uInk2), 1.35) * s2.a * 0.92;
  // inchiostro steso in modo irregolare + carta che non lo prende tutto
  float wear = mix(1.0, 0.55 + 0.45 * fbm(p / (60.0 * uZ)), uWear) * mix(1.0, 0.8 + 0.2 * hash12(floor(p / max(uZ, 0.5))), uWear);
  float t1 = screenT(p, radians(15.0)), t2 = screenT(p + 31.7, radians(75.0));
  float k1 = smoothstep(t1 - 0.06, t1 + 0.06, v1 * uLoad * 1.15 * wear) * 0.94;
  float k2 = smoothstep(t2 - 0.06, t2 + 0.06, v2 * uLoad * 1.15 * wear) * 0.94;
  vec3 col = uPaper * mix(vec3(1.0), uInk1, k1) * mix(vec3(1.0), uInk2, k2);
  col *= 1.0 - (fbm(p / (9.0 * uZ)) - 0.5) * 0.06;
  float a = max(s.a, max(s1.a, s2.a));
  o = mix(s, vec4(col * a, a), uAmt);
}`

export const DITHER = FX + `uniform vec3 uDark, uLight; uniform float uPattern, uSize, uCon, uFour;
float b2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float b4(vec2 a) { return b2(0.5 * a) * 0.25 + b2(a); }
float b8(vec2 a) { return b4(0.5 * a) * 0.25 + b2(a); }
void main() {
  vec4 s = texture(uSrc, vUv);
  float cs = max(uSize * uZ, 1.0);
  vec2 cell = floor(gl_FragCoord.xy / cs);
  vec2 uv = (cell + 0.5) * cs / uRes;
  vec4 sc = texture(uSrc, vec2(uv.x, uv.y));
  vec3 c = sc.a > 0.0 ? sc.rgb / sc.a : vec3(1.0);
  float L = clamp((luma(c) - 0.5) * (1.0 + uCon) + 0.5, 0.0, 1.0);
  float th = uPattern < 0.5 ? b4(cell) : uPattern < 1.5 ? b8(cell) : hash12(cell);
  vec3 col;
  if (uFour > 0.5) { float q = L * 3.0, base = floor(q); float lv = min(base + step(th, q - base), 3.0); col = mix(uDark, uLight, lv / 3.0); }
  else col = step(th, L) > 0.5 ? uLight : uDark;
  float a = step(0.5, sc.a);
  o = mix(s, vec4(col * a, a), uAmt);
}`

export const SCREENPRINT = FX + `uniform vec3 uC1, uC2, uC3; uniform float uTh, uRough, uOffset;
void main() {
  vec4 s = texture(uSrc, vUv);
  vec2 p = vUv * uRes;
  float n = (fbm(p / (7.0 * uZ)) - 0.5) * uRough * 0.35;
  vec2 off = vec2(0.8, -0.5) * uOffset * uZ / uRes;
  vec4 sa = texture(uSrc, vUv - off), sb = texture(uSrc, vUv + off);
  float La = sa.a > 0.0 ? luma(sa.rgb / sa.a) : 1.0, Lb = sb.a > 0.0 ? luma(sb.rgb / sb.a) : 1.0;
  vec3 col = uC3;
  if (Lb < uTh + 0.18 + n && sb.a > 0.5) col = mix(col, uC2, 0.97);
  if (La < uTh - 0.18 + n && sa.a > 0.5) col = col * 0.25 + uC1 * 0.75;
  col *= 1.0 - (hash12(floor(p / max(uZ, 0.5))) - 0.5) * 0.05;
  float a = max(s.a, max(sa.a, sb.a) * 0.98);
  o = mix(s, vec4(col * a, a), uAmt);
}`

export const GRAD_MAP = FX + `uniform vec3 uC1, uC2, uC3; uniform float uThree, uCon;
void main() {
  vec4 s = texture(uSrc, vUv); if (s.a <= 0.0) { o = s; return; }
  vec3 c = s.rgb / s.a;
  float t = clamp((luma(c) - 0.5) * (1.0 + uCon) + 0.5, 0.0, 1.0);
  t = smoothstep(0.0, 1.0, t) * 0.6 + t * 0.4;
  vec3 g = uThree > 0.5 ? (t < 0.5 ? mix(uC1, uC2, t * 2.0) : mix(uC2, uC3, t * 2.0 - 1.0)) : mix(uC1, uC2, t);
  o = mix(s, vec4(g * s.a, s.a), uAmt);
}`

export const POSTERIZE = FX + `uniform float uLevels, uDither, uSat;
float b2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float b4(vec2 a) { return b2(0.5 * a) * 0.25 + b2(a); }
void main() {
  vec4 s = texture(uSrc, vUv); if (s.a <= 0.0) { o = s; return; }
  vec3 c = s.rgb / s.a;
  c = mix(vec3(luma(c)), c, 1.0 + uSat);
  float d = uDither > 0.5 ? (b4(gl_FragCoord.xy / max(uZ, 1.0)) - 0.5) / (uLevels - 1.0) : 0.0;
  vec3 p = floor(clamp(c + d, 0.0, 1.0) * (uLevels - 1.0) + 0.5) / (uLevels - 1.0);
  o = mix(s, vec4(p * s.a, s.a), uAmt);
}`

export const TILT = FX + `uniform sampler2D uB; uniform float uPos, uWidth, uFeather, uAng;
void main() {
  vec2 n = vec2(-sin(uAng), cos(uAng));
  float d = abs(dot(vUv - vec2(0.5, uPos), n));
  float m = smoothstep(uWidth * 0.5, uWidth * 0.5 + uFeather, d);
  o = mix(texture(uSrc, vUv), mix(texture(uSrc, vUv), texture(uB, vUv), m), uAmt);
}`

export const MOTION = FX + `uniform vec2 uDir;
void main() {
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 40; i++) acc += texture(uSrc, vUv + uDir * (float(i) / 39.0 - 0.5));
  o = mix(texture(uSrc, vUv), acc / 40.0, uAmt);
}`

export const ZOOM_BLUR = FX + `uniform float uK; uniform vec2 uC;
void main() {
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 40; i++) acc += texture(uSrc, uC + (vUv - uC) * (1.0 - uK * 0.45 * float(i) / 39.0));
  o = mix(texture(uSrc, vUv), acc / 40.0, uAmt);
}`

export const WAVE = FX + `uniform float uAmp, uLen, uAng, uSpeed;
void main() {
  vec2 pp = vUv * uRes;
  vec2 dir = vec2(cos(uAng), sin(uAng)), perp = vec2(-dir.y, dir.x);
  float ph = dot(pp, dir) / (uLen * uZ) * 6.2832 + uT * 3.0 * step(0.001, uSpeed);
  vec2 uv = vUv + perp * sin(ph) * uAmp * uZ / uRes;
  o = mix(texture(uSrc, vUv), texture(uSrc, uv), uAmt);
}`

export const RIPPLE = FX + `uniform float uAmp, uLen, uSpeed;
void main() {
  vec2 pp = vUv * uRes, c = 0.5 * uRes;
  float r = length(pp - c);
  float d = sin(r / (uLen * uZ) * 6.2832 - uT * 3.0 * step(0.001, uSpeed)) * uAmp * uZ * smoothstep(0.0, 30.0 * uZ, r);
  vec2 uv = vUv + normalize(pp - c + 1e-4) * d / uRes;
  o = mix(texture(uSrc, vUv), texture(uSrc, uv), uAmt);
}`

export const TWIRL = FX + `uniform float uAng, uR;
void main() {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (vUv - 0.5) * asp;
  float R = uR * 0.5 * min(asp.x, 1.0) * 2.0;
  float r = length(p);
  vec2 q = p;
  if (r < R) { float a = uAng * pow(1.0 - r / R, 2.0); q = mat2(cos(a), -sin(a), sin(a), cos(a)) * p; }
  o = mix(texture(uSrc, vUv), texture(uSrc, q / asp + 0.5), uAmt);
}`

export const BULGE = FX + `uniform float uK, uR;
void main() {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (vUv - 0.5) * asp;
  float R = uR * 0.5 * max(asp.x, 1.0);
  float r = length(p);
  vec2 q = p;
  if (r < R && r > 0.0) { float e = uK >= 0.0 ? 1.0 + uK : 1.0 / (1.0 - uK); q = normalize(p) * R * pow(r / R, e); }
  o = mix(texture(uSrc, vUv), texture(uSrc, q / asp + 0.5), uAmt);
}`

export const MOSAIC = FX + `uniform float uShape, uSize, uGap;
void main() {
  float cs = max(uSize * uZ, 1.0);
  vec2 pp = vUv * uRes;
  vec2 center; float edge;
  if (uShape < 0.5) {
    vec2 cell = floor(pp / cs); center = (cell + 0.5) * cs;
    vec2 f = abs(pp - center) / cs; edge = max(f.x, f.y) * 2.0;
  } else {
    vec2 r = vec2(1.0, 1.732) * cs;
    vec2 a = mod(pp, r) - r * 0.5, b = mod(pp - r * 0.5, r) - r * 0.5;
    vec2 g = dot(a, a) < dot(b, b) ? a : b;
    center = pp - g;
    vec2 q = abs(g) / cs; edge = max(q.x * 0.866 + q.y * 0.5, q.y) * 2.0 / 0.866;
  }
  vec4 c = texture(uSrc, center / uRes);
  float keep = 1.0 - smoothstep(1.0 - uGap - 1.0 / cs, 1.0 - uGap, edge);
  if (uGap <= 0.0) keep = 1.0;
  o = mix(texture(uSrc, vUv), c * keep, uAmt);
}`

export const CHROMA = FX + `uniform float uPx, uDist, uRadial;
void main() {
  vec2 d = vUv - 0.5;
  vec2 uv = 0.5 + d * (1.0 + uDist * dot(d, d) * 1.5);
  vec2 dir = uRadial > 0.5 ? (length(d) > 0.0 ? normalize(d) * (0.35 + length(d) * 1.3) : vec2(0.0)) : vec2(1.0, 0.0);
  vec2 off = dir * uPx * uZ / uRes;
  vec4 r = texture(uSrc, uv + off), g = texture(uSrc, uv), b = texture(uSrc, uv - off);
  o = mix(texture(uSrc, vUv), vec4(r.r, g.g, b.b, max(g.a, max(r.a, b.a))), uAmt);
}`

export const VHS = FX + `uniform float uPow, uBleed, uLines;
vec3 yiq(vec3 c) { return mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312) * c; }
vec3 rgbq(vec3 c) { return mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703) * c; }
void main() {
  vec2 uv = vUv;
  float line = floor(gl_FragCoord.y / max(uZ, 0.5));
  float tt = floor(uT * 24.0);
  uv.x += (hash12(vec2(line, tt)) - 0.5) * 0.004 * uPow;
  float bd = abs(fract(uv.y - uT * 0.11 - 0.3) - 0.5);
  float band = 1.0 - smoothstep(0.0, 0.035, bd);
  uv.x += band * 0.012 * uPow * sin(uv.y * 160.0 + uT * 15.0);
  vec4 s = texture(uSrc, uv);
  vec3 Y = yiq(s.a > 0.0 ? s.rgb / s.a : vec3(0.0));
  // il colore (I, Q) sbava in orizzontale molto più della luminanza
  vec2 iq = vec2(0.0); float ws = 0.0;
  for (int i = -8; i <= 8; i++) {
    vec4 t = texture(uSrc, uv + vec2(float(i) * uBleed * 0.0035, 0.0));
    vec3 q = yiq(t.a > 0.0 ? t.rgb / t.a : vec3(0.0));
    float w = exp(-float(i * i) / 18.0) * t.a; iq += q.yz * w; ws += w;
  }
  if (ws > 0.0) Y.yz = iq / ws * 0.85;
  vec3 c = rgbq(Y);
  c *= 1.0 - uLines * 0.25 * (0.5 + 0.5 * sin(gl_FragCoord.y / max(uZ, 0.5) * 1.6));
  c += (hash12(vec2(line * 0.37, tt)) - 0.5) * 0.12 * uPow;
  c = mix(c, vec3(luma(c)), 0.12 * uPow);
  float a = s.a;
  o = mix(texture(uSrc, vUv), vec4(clamp(c, 0.0, 1.0) * a, a), uAmt);
}`

export const CRT = FX + `uniform sampler2D uB; uniform float uScan, uMask, uCurve, uGlow, uFlick;
void main() {
  vec2 d = vUv - 0.5;
  vec2 uv = 0.5 + d * (1.0 + uCurve * 0.35 * dot(d, d) * 4.0);
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { o = mix(texture(uSrc, vUv), vec4(0.0), uAmt); return; }
  vec4 s = texture(uSrc, uv);
  vec3 c = s.a > 0.0 ? s.rgb / s.a : vec3(0.0);
  vec4 b = texture(uB, uv); vec3 bc = b.a > 0.0 ? b.rgb / b.a : vec3(0.0);
  c = blend(c, bc * uGlow, 2.0);
  float y = gl_FragCoord.y / max(uZ * 1.5, 0.5);
  c *= 1.0 - uScan * 0.45 * (0.5 - 0.5 * cos(y * 6.2832));
  float m = mod(floor(gl_FragCoord.x / max(uZ, 0.5)), 3.0);
  vec3 mask = m < 1.0 ? vec3(1.0, 0.7, 0.7) : m < 2.0 ? vec3(0.7, 1.0, 0.7) : vec3(0.7, 0.7, 1.0);
  c *= mix(vec3(1.0), mask * 1.15, uMask);
  c *= 1.0 - uFlick * 0.08 * hash12(vec2(floor(uT * 30.0), 1.0));
  float v = smoothstep(0.75, 0.35, length(d * vec2(1.0, 1.1)) * (0.6 + uCurve));
  c *= mix(1.0, v, uCurve);
  o = mix(texture(uSrc, vUv), vec4(clamp(c, 0.0, 1.0) * s.a, s.a), uAmt);
}`
