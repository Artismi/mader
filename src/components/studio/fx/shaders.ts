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

export const EXTRUDE = FX + `uniform vec2 uDir; uniform vec3 uCol, uC2, uC3, uC4; uniform float uShade, uBands;
void main() {
  // la copia più vicina che copre davvero il pixel: fermarsi al primo bordo
  // sfumato (alfa bassa) dava un volume pallido e a righe
  float best = 0.0, bf = 0.0;
  for (int k = 1; k <= 96; k++) {
    float f = float(k) / 96.0;
    float a = texture(uOrig, vUv - uDir * f).a;
    if (a > best + 0.01) { best = a; bf = f; }
    if (best > 0.97) break;
  }
  vec3 col = uCol * (1.0 - uShade * 0.55 * bf) + vec3(0.06) * (1.0 - bf);
  if (uBands > 0.5) {
    // strisce di colore lungo il volume, con un filo scuro tra una fascia e l'altra
    float b = bf * uBands; int bi = int(floor(b)) % 4;
    vec3 bc = bi == 0 ? uCol : bi == 1 ? uC2 : bi == 2 ? uC3 : uC4;
    float edge = smoothstep(0.0, 0.08, fract(b)) * smoothstep(1.0, 0.92, fract(b));
    col = bc * mix(0.25, 1.0, edge) * (1.0 - uShade * 0.25 * bf);
  }
  vec4 lay = vec4(col * best, best);
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

/* ───────── Materiali 3D ─────────
   La forma (testo, vettore, sagoma) diventa un solido: estruso con smusso o
   gonfiato, ruotato in prospettiva, illuminato e con riflessi di un ambiente.
   Raymarching sul campo di distanze 2D: d3 = estrusione arrotondata di sd2. */
export const MAT3D = LIB + `
uniform sampler2D uSrc; uniform sampler2D uS3;
uniform float uDepth, uBevel, uRx, uRy, uPersp, uMat, uShape, uUseCol, uEnv, uLightA, uRough, uZ;
uniform vec3 uCol;
float sd2(vec2 q) {
  vec2 uv = q / uRes + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { vec2 e = max(abs(q) - uRes * 0.5, 0.0); return length(e) + 40.0; }
  return texture(uS3, uv).r;
}
float map(vec3 p) {
  float s = sd2(p.xy), hd = uDepth * 0.5;
  if (uShape < 0.5) {
    float b = min(uBevel, hd * 0.95);
    vec2 w = vec2(s + b, abs(p.z) - hd + b);
    return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - b;
  }
  // gonfiato: il profilo sale come un cuscino dal bordo verso l'interno
  float R = max(uBevel * 2.5, 2.0);
  float t = clamp(-s / R, 0.0, 1.0);
  float h = hd * sqrt(t * (2.0 - t));
  return max(s, (abs(p.z) - h) * 0.55);
}
vec3 nrm(vec3 p) {
  vec2 e = vec2(1.0, -1.0) * 1.4;
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}
mat3 rotX(float a) { return mat3(1.0, 0.0, 0.0, 0.0, cos(a), sin(a), 0.0, -sin(a), cos(a)); }
mat3 rotY(float a) { return mat3(cos(a), 0.0, -sin(a), 0.0, 1.0, 0.0, sin(a), 0.0, cos(a)); }
float box(vec3 d, vec3 c, float k) { return exp(-k * max(0.0, 1.0 - dot(d, normalize(c)))); }
// ambienti: lo spazio vista ha y verso il basso e la camera guarda +z (i riflessi frontali tornano verso -z)
vec3 env(vec3 d) {
  float up = -d.y;
  if (uEnv < 0.5) {            // studio fotografico: fondale chiaro, due softbox, pavimento grigio
    vec3 c = mix(vec3(0.16, 0.16, 0.17), vec3(0.92), smoothstep(-0.25, 0.4, up));
    c *= 1.0 - 0.55 * smoothstep(0.06, 0.0, abs(up + 0.02));
    c += vec3(1.0) * box(d, vec3(-0.55, -0.55, -0.62), 40.0) * 2.0;
    c += vec3(0.95, 0.97, 1.0) * box(d, vec3(0.7, -0.25, -0.65), 26.0) * 1.2;
    return c;
  }
  if (uEnv < 1.5) {            // tramonto
    vec3 sky = mix(vec3(1.0, 0.55, 0.25), vec3(0.42, 0.18, 0.52), smoothstep(0.0, 0.9, up));
    vec3 ground = mix(vec3(0.16, 0.06, 0.12), vec3(0.6, 0.25, 0.2), smoothstep(-0.6, 0.0, up));
    vec3 c = up > 0.0 ? sky : ground;
    c += vec3(1.0, 0.85, 0.55) * box(d, vec3(0.2, -0.12, -0.97), 60.0) * 2.5;
    return c;
  }
  if (uEnv < 2.5) {            // notte al neon: fasce magenta e ciano
    vec3 c = mix(vec3(0.05, 0.02, 0.12), vec3(0.35, 0.08, 0.4), smoothstep(-0.2, 0.6, up));
    c += vec3(1.0, 0.15, 0.7) * box(d, vec3(-0.8, -0.3, -0.5), 30.0) * 1.8;
    c += vec3(0.1, 0.9, 1.0) * box(d, vec3(0.8, -0.2, -0.55), 30.0) * 1.6;
    c += vec3(0.5, 0.3, 1.0) * smoothstep(0.03, 0.0, abs(up - 0.25)) * 0.8;
    return c;
  }
  // cielo e terra con orizzonte netto: il cromo classico da copertina anni '80
  vec3 c = mix(vec3(0.97, 0.98, 1.0), vec3(0.22, 0.45, 0.92), smoothstep(0.0, 0.75, up));
  if (up < 0.0) c = mix(vec3(0.1, 0.07, 0.05), vec3(0.62, 0.55, 0.48), smoothstep(-0.02, -0.7, up));
  c += vec3(1.0, 0.97, 0.9) * box(d, vec3(-0.4, -0.8, -0.45), 80.0) * 3.0;
  return c;
}
vec4 albedo(vec2 q) {
  // sui fianchi si prende il colore del bordo più vicino
  float s = sd2(q);
  if (s > -1.0) {
    vec2 g = vec2(sd2(q + vec2(1.0, 0.0)) - sd2(q - vec2(1.0, 0.0)), sd2(q + vec2(0.0, 1.0)) - sd2(q - vec2(0.0, 1.0)));
    q -= normalize(g + 1e-5) * (s + 1.5);
  }
  vec4 c = texture(uSrc, q / uRes + 0.5);
  return c.a > 0.0 ? vec4(c.rgb / c.a, 1.0) : vec4(0.5, 0.5, 0.5, 1.0);
}
vec4 shade(vec3 p, vec3 rd, mat3 R) {
  vec3 n = R * nrm(p);
  vec3 v = -(R * rd);
  vec3 alb = uUseCol > 0.5 ? uCol : albedo(p.xy).rgb;
  vec3 L = normalize(vec3(cos(uLightA) * 0.65, -0.75, -0.6 + sin(uLightA) * 0.2));
  float dif = max(dot(n, L), 0.0);
  float shin = mix(220.0, 18.0, uRough);
  float spe = pow(max(dot(n, normalize(L + v)), 0.0), shin);
  float fr = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 r = reflect(-v, n);
  float front = smoothstep(0.55, 0.9, abs(n.z));
  r.y += front * ((p.y / (uRes.y * 0.5)) * 1.1 - 0.25);
  r = normalize(r);
  vec3 ev = env(r);
  vec3 c; float a = 1.0;
  if (uMat < 0.5) c = alb * (0.22 + 0.85 * dif) + spe * 0.9 + ev * fr * 0.55;                         // plastica lucida
  else if (uMat < 1.5) c = ev * mix(vec3(0.62), alb * 1.1, uUseCol * 0.35) + spe * 1.3;              // cromo
  else if (uMat < 2.5) { float l = luma(ev); c = mix(vec3(0.28, 0.14, 0.03), vec3(1.0, 0.86, 0.5), smoothstep(0.05, 0.85, l)) * (0.65 + 0.6 * l) + spe * vec3(1.0, 0.92, 0.65) * 1.2; } // oro: luce, non colore, del riflesso
  else if (uMat < 3.5) {                                                                            // vetro
    vec3 t = env(refract(-v, n, 0.66)) * mix(vec3(1.0), alb, 0.65);
    c = mix(t, ev, fr) + spe * 1.4; a = mix(0.6, 1.0, fr);
  }
  else if (uMat < 4.5) c = alb * (0.32 + 0.72 * dif) + spe * 0.12 + vec3(0.06) * pow(1.0 - max(dot(n, v), 0.0), 2.0); // ceramica opaca
  else if (uMat < 5.5) {                                                                            // olografico
    float h = fract(dot(n, vec3(0.35, 0.55, 0.25)) * 1.6 + fr * 0.8);
    c = mix(ev * 0.5, hsv2rgb(vec3(h, 0.5, 1.0)), 0.7) + spe;
  }
  else c = ev * alb * 1.35 + spe * mix(alb, vec3(1.0), 0.5);                                         // metallo colorato
  return vec4(clamp(c, 0.0, 1.0) * a, a);
}
void main() {
  vec2 q = gl_FragCoord.xy - uRes * 0.5;
  float D = max(uRes.x, uRes.y) * mix(7.0, 1.4, uPersp);
  vec3 ro = vec3(0.0, 0.0, -D), rd = normalize(vec3(q, D));
  mat3 R = rotY(uRy) * rotX(uRx);
  mat3 Ri = transpose(R);
  vec3 o2 = Ri * ro, d2 = Ri * rd;
  float hd = uDepth * 0.5 + 3.0;
  float t0 = 0.0, t1 = D * 2.5;
  if (abs(d2.z) > 1e-4) {
    float ta = (-hd - o2.z) / d2.z, tb = (hd - o2.z) / d2.z;
    t0 = max(min(ta, tb), 0.0); t1 = max(ta, tb);
  }
  float t = t0, md = 1e9, tm = t0;
  bool hit = false;
  for (int i = 0; i < 260; i++) {
    vec3 p = o2 + d2 * t;
    float d = map(p);
    if (d < md) { md = d; tm = t; }
    if (d < 0.15) { hit = true; break; }
    t += max(d * 0.7, 0.25);
    if (t > t1) break;
  }
  if (hit) { o = shade(o2 + d2 * t, d2, R); return; }
  // bordo antialias: il punto in cui il raggio è passato più vicino alla superficie
  float cov = clamp(0.6 - md, 0.0, 1.0);
  if (cov > 0.0) { vec4 c = shade(o2 + d2 * tm, d2, R); o = c * cov; return; }
  o = vec4(0.0);
}`

/* ───────── Riempimenti generativi ─────────
   Dentro la forma (o su un rettangolo-sfondo) un campo di colore procedurale:
   gradiente mesh, aurora, marmo liquido, grana sfumata, linee topografiche, bolle. */
export const GENFILL = LIB + `
uniform sampler2D uSrc; uniform float uMode, uScale, uWarp, uGrain, uT, uZ, uAmt, uMix;
uniform vec3 uC1, uC2, uC3, uC4;
vec3 pal(float t) { t = fract(t); return t < 0.333 ? mix(uC1, uC2, t * 3.0) : t < 0.666 ? mix(uC2, uC3, t * 3.0 - 1.0) : mix(uC3, uC4, t * 3.0 - 2.0); }
vec2 warp(vec2 p, float k) { return p + k * vec2(fbm(p + vec2(0.0, uT * 0.07)), fbm(p + vec2(5.2, 1.3) - uT * 0.05)); }
void main() {
  vec4 s = texture(uSrc, vUv);
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (vUv - 0.5) * asp / uScale;
  vec3 c;
  if (uMode < 0.5) {                       // gradiente mesh: quattro punti colore che fluttuano
    vec2 q = warp(p * 1.4, uWarp * 0.8);
    vec2 a = vec2(-0.45, -0.35) + 0.08 * sin(uT * 0.3), b = vec2(0.5, -0.3), cc = vec2(-0.35, 0.45), d = vec2(0.45, 0.4) + 0.08 * cos(uT * 0.25);
    float wa = 1.0 / pow(length(q - a) + 0.15, 2.4), wb = 1.0 / pow(length(q - b) + 0.15, 2.4), wc = 1.0 / pow(length(q - cc) + 0.15, 2.4), wd = 1.0 / pow(length(q - d) + 0.15, 2.4);
    c = (uC1 * wa + uC2 * wb + uC3 * wc + uC4 * wd) / (wa + wb + wc + wd);
  } else if (uMode < 1.5) {                // aurora: tende di luce ondulate su fondo scuro
    vec2 q = warp(p * vec2(1.0, 2.2), uWarp * 0.6);
    float b1 = exp(-pow((q.y + 0.25 * sin(q.x * 2.2 + uT * 0.2)) * 3.0, 2.0));
    float b2 = exp(-pow((q.y - 0.3 + 0.2 * sin(q.x * 1.7 - uT * 0.15)) * 3.5, 2.0));
    c = uC4 * 0.9 + uC1 * b1 * 1.1 + uC2 * b2 * 0.9 + uC3 * pow(max(b1, b2), 3.0) * 0.6;
  } else if (uMode < 2.5) {                // marmo liquido: domain warping a due livelli
    vec2 q = p * 2.0;
    vec2 w1 = vec2(fbm(q + uT * 0.05), fbm(q + vec2(5.2, 1.3)));
    vec2 w2 = vec2(fbm(q + 3.0 * uWarp * w1 + vec2(1.7, 9.2)), fbm(q + 3.0 * uWarp * w1 + vec2(8.3, 2.8) + uT * 0.04));
    c = pal(fbm(q + 3.5 * w2) * 1.3);
  } else if (uMode < 3.5) {                // grana sfumata: gradiente morbido + grana forte
    vec2 q = warp(p, uWarp * 0.5);
    float t = smoothstep(-0.7, 0.7, q.x * 0.7 + q.y * 0.9);
    c = mix(mix(uC1, uC2, t), mix(uC3, uC4, t), smoothstep(-0.6, 0.6, q.y - q.x * 0.3));
  } else if (uMode < 4.5) {                // linee topografiche
    float h = fbm(p * 1.6 + uT * 0.03) * 22.0 * (0.5 + uWarp);
    float l = abs(fract(h) - 0.5) / max(fwidth(h), 1e-4);
    float line = 1.0 - smoothstep(0.6, 1.6, l);
    c = mix(mix(uC4, uC3, smoothstep(0.0, 22.0, h)), uC1, line * 0.9);
  } else {                                 // bolle: metaball morbide
    float f = 0.0;
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      vec2 c0 = vec2(sin(fi * 1.7 + uT * 0.2 * (1.0 + fi * 0.1)), cos(fi * 2.3 + uT * 0.17)) * 0.55;
      f += (0.06 + 0.02 * sin(fi)) / dot(p - c0, p - c0);
    }
    float m = smoothstep(0.9, 1.1, f);
    c = mix(mix(uC4, uC3, smoothstep(0.0, 0.9, f)), mix(uC1, uC2, smoothstep(1.0, 3.0, f)), m);
  }
  vec2 g = floor(gl_FragCoord.xy / max(uZ, 0.5));
  c += (hash12(g + fract(uT) * 31.0) - 0.5) * uGrain * 0.35;
  vec3 base = s.a > 0.0 ? s.rgb / s.a : vec3(0.0);
  c = mix(c, blend(base, c, 4.0), uMix);
  o = mix(s, vec4(clamp(c, 0.0, 1.0) * s.a, s.a), uAmt);
}`

export const MIX_AMT = LIB + `uniform sampler2D uA, uB; uniform float uK;
void main() { o = mix(texture(uA, vUv), texture(uB, vUv), uK); }`

/* ─── effetti testo da "stile Photoshop" ─── */

/** usura: l'inchiostro si consuma con macchie e puntini, più sui bordi */
export const GRUNGE = FX + `uniform float uWear, uScale, uSpeck;
void main() {
  vec4 s = texture(uSrc, vUv);
  if (s.a <= 0.0) { o = s; return; }
  vec2 p = vUv * uRes / (uZ * uScale);
  float n = fbm(p * 0.018) * 0.55 + fbm(p * 0.085 + 7.0) * 0.3 + vnoise(p * 0.6) * 0.15;
  float d = -sd(vUv) / uZ;
  float edge = smoothstep(0.0, 7.0, d);
  float keep = smoothstep(uWear - 0.06, uWear + 0.06, n + edge * 0.22);
  float spk = step(1.0 - uSpeck * 0.12, hash12(floor(p * 0.55)));
  keep *= 1.0 - spk;
  o = mix(s, s * keep, uAmt);
}`

/** ricamo: fili in diagonale, rilievo morbido, punto filo lungo il bordo */
export const STITCH = FX + `uniform vec3 uThread, uStitch; uniform float uUseColor, uDensity, uInset;
void main() {
  vec4 s = texture(uSrc, vUv);
  if (s.a <= 0.0) { o = s; return; }
  vec2 p = vUv * uRes / uZ;
  vec2 e = px();
  float d = -sd(vUv) / uZ;
  vec2 gr = vec2(sd(vUv + vec2(e.x, 0.0)) - sd(vUv - vec2(e.x, 0.0)), sd(vUv + vec2(0.0, e.y)) - sd(vUv - vec2(0.0, e.y)));
  vec2 tg = normalize(vec2(-gr.y, gr.x) + 1e-5);
  vec3 base = uUseColor > 0.5 ? uThread : s.rgb / s.a;
  float t = (p.x + p.y) * 0.7071;
  float fiber = 0.5 + 0.5 * sin(t * uDensity + vnoise(p * 0.12) * 4.0);
  float grain = vnoise(p * vec2(0.9, 0.25));
  vec3 col = base * (0.72 + 0.22 * fiber + 0.12 * grain);
  col *= 0.78 + 0.32 * smoothstep(0.0, 4.0, d);                 // il filo si arrotonda verso il bordo
  float band = 1.0 - smoothstep(0.7, 1.5, abs(d - uInset));
  float dash = smoothstep(0.35, 0.45, fract(dot(p, tg) / 6.0)) * (1.0 - smoothstep(0.85, 0.95, fract(dot(p, tg) / 6.0)));
  col = mix(col, uStitch, band * dash * 0.95);
  o = mix(s, vec4(col * s.a, s.a), uAmt);
}`

/** lamina metallica: superficie stropicciata, smusso sui bordi, riflessi */
export const FOIL = FX + `uniform vec3 uA, uB; uniform float uCrinkle, uLight, uBevel;
float hgt(vec2 p) { return fbm(p * 0.03) * 0.6 + vnoise(p * 0.2) * 0.4 * uCrinkle; }
void main() {
  vec4 s = texture(uSrc, vUv);
  if (s.a <= 0.0) { o = s; return; }
  vec2 p = vUv * uRes / uZ;
  vec2 e = px();
  float h = hgt(p);
  vec2 g = vec2(hgt(p + vec2(1.0, 0.0)) - h, hgt(p + vec2(0.0, 1.0)) - h) * 26.0;
  float di = -sd(vUv) / uZ;
  vec2 sg = vec2(sd(vUv + vec2(e.x, 0.0)) - sd(vUv - vec2(e.x, 0.0)), sd(vUv + vec2(0.0, e.y)) - sd(vUv - vec2(0.0, e.y)));
  float bev = 1.0 - smoothstep(0.0, uBevel, di);
  vec3 n = normalize(vec3(-g + normalize(sg + 1e-5) * bev * 1.6, 1.0));
  vec3 L = normalize(vec3(cos(uLight), sin(uLight), 0.75));
  float dif = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 28.0);
  float band = 0.5 + 0.5 * sin((p.x * 0.6 + p.y) * 0.012 + dif * 3.0);
  vec3 col = mix(uA, uB, clamp(dif * 0.75 + band * 0.35, 0.0, 1.0)) + spec * 0.85;
  o = mix(s, vec4(col * s.a, s.a), uAmt);
}`

/** impressione su materiale vero (carta, pietra, pelle…): a secco, in rilievo, in lamina,
 *  a inchiostro, oppure solo superficie. Luce dal campo di distanze + normal map del materiale. */
export const IMPRESS = FX + `uniform sampler2D uMat, uNrm, uH, uHb; uniform float uHasMat, uMode, uDepth, uSize, uLight, uScale, uMicro, uScene;
uniform vec3 uInk, uFoilA, uFoilB, uTint;
// rilievo morbido: la forma sfocata, come la carta che si deforma sotto il cliché
float hgt(vec2 uv) { float h = texture(uH, uv).a; return (uMode < 0.5 || uMode > 2.5) ? -h : h; }
void main() {
  vec4 s = texture(uSrc, vUv);
  vec2 p = vUv * uRes / uZ;
  vec2 tuv = p / (1024.0 * uScale);
  vec3 mat = uHasMat > 0.5 ? texture(uMat, tuv).rgb * uTint : uTint * 0.92;
  vec3 nm = uHasMat > 0.5 ? texture(uNrm, tuv).rgb * 2.0 - 1.0 : vec3(0.0, 0.0, 1.0);
  vec3 L = normalize(vec3(cos(uLight), -sin(uLight), 0.9));
  // luce di scena: più luce dal lato della lampada, caduta morbida verso i bordi
  vec2 q = vUv - 0.5;
  float scene = 1.0 + uScene * (dot(normalize(vec2(L.x, -L.y)), q) * 0.35 - dot(q, q) * 0.9);
  if (uMode > 3.5) {
    float micro = 1.0 + dot(nm.xy, L.xy) * uMicro * 0.35;
    o = mix(s, vec4(mat * micro * scene * s.a, s.a), uAmt); return;
  }
  vec2 e = px() * max(1.0, uSize * uZ * 0.25);
  float h = hgt(vUv);
  vec2 g = vec2(hgt(vUv + vec2(e.x, 0.0)) - hgt(vUv - vec2(e.x, 0.0)), hgt(vUv + vec2(0.0, e.y)) - hgt(vUv - vec2(0.0, e.y))) / (2.0 * max(1.0, uSize * uZ * 0.25));
  vec3 n = normalize(vec3(-g * uDepth * uSize * uZ * 1.2 + nm.xy * uMicro * 0.5, 1.0));
  float dif = dot(n, L) - L.z;
  float shade = 1.0 + dif * 0.9;
  // ombra portata morbida (dal rilievo sfocato più largo) e occlusione negli angoli
  vec2 ldir = normalize(vec2(L.x, -L.y)) * px() * uSize * uZ * 0.9;
  float hb = texture(uHb, vUv).a, hbl = texture(uHb, vUv + ldir).a;
  float sgn = (uMode < 0.5 || uMode > 2.5) ? -1.0 : 1.0;
  float castSh = clamp((hbl - hb) * sgn * 2.2, 0.0, 1.0);
  float ao = sgn < 0.0 ? clamp(texture(uH, vUv).a - hb, 0.0, 1.0) : clamp(hb - texture(uH, vUv).a, 0.0, 1.0);
  shade *= (1.0 - castSh * 0.28 * uDepth) * (1.0 - ao * 0.35 * uDepth);
  float inside = texture(uOrig, vUv).a;
  vec3 col = mat * shade;
  if (uMode > 1.5 && uMode < 2.5) {
    vec3 nf = normalize(n + vec3(nm.xy * 0.5, 0.0));
    float spec = pow(max(dot(reflect(-L, nf), vec3(0.0, 0.0, 1.0)), 0.0), 22.0);
    float sweep = 0.5 + 0.5 * sin(p.x * 0.004 - p.y * 0.006 + nf.x * 2.5);
    vec3 foil = mix(uFoilA, uFoilB, clamp(0.25 + dif * 1.4 + sweep * 0.45, 0.0, 1.0)) + spec * 0.8;
    col = mix(col, foil * (1.0 - castSh * 0.2), inside);
  } else if (uMode > 2.5) {
    float ink = inside * (0.8 + 0.2 * vnoise(p * 0.35)) * smoothstep(0.15, 0.55, vnoise(p * 0.05) * 0.3 + 0.7);
    col = mix(col, uInk * (0.5 + 0.5 * dot(mat, vec3(0.33))) * shade, ink);
  }
  col *= scene;
  // copre la lettera e l'alone di carta deformata attorno
  float a = clamp(max(inside, texture(uHb, vUv).a * 1.6), 0.0, 1.0);
  o = mix(s, vec4(col * a, a), uAmt);
}`

/* ─── luce e movimento (stile poster) ─── */

/** colatura: il colore delle lettere scende in scie lunghe che sfumano, con leggera ondulazione */
export const SMEAR = FX + `uniform vec2 uDir; uniform float uFade, uWobble, uGlow, uSpectrum;
// distanza (in frazione della scia) dalla lettera più vicina risalendo controcorrente, con rifinitura
float reach(vec2 uv0, out vec4 hit) {
  float lo = 0.0, hi = -1.0;
  for (int k = 1; k <= 96; k++) {
    float f = float(k) / 96.0;
    if (texture(uOrig, uv0 - uDir * f).a > 0.5) { hi = f; lo = float(k - 1) / 96.0; break; }
  }
  if (hi < 0.0) { hit = vec4(0.0); return 1.0; }
  for (int i = 0; i < 6; i++) { float m = (lo + hi) * 0.5; if (texture(uOrig, uv0 - uDir * m).a > 0.5) hi = m; else lo = m; }
  hit = texture(uSrc, uv0 - uDir * (hi + 1.5 / 96.0));
  return hi;
}
void main() {
  vec4 s = texture(uSrc, vUv);
  vec2 p = vUv * uRes / uZ;
  vec2 perp = normalize(vec2(-uDir.y, uDir.x) + 1e-6);
  float wob = (vnoise(vec2(dot(p, perp) * 0.03, 5.0)) - 0.5) * uWobble;
  vec3 col = vec3(0.0); float a = 0.0;
  // tre campioni affiancati: la scia è morbida, non a righe
  for (int j = -1; j <= 1; j++) {
    vec2 uv = vUv + perp * px() * (float(j) * 1.5 + wob * 40.0);
    vec4 hit; float f = reach(uv, hit);
    float w = hit.a * pow(1.0 - f, uFade);
    vec3 c = hit.a > 0.0 ? hit.rgb / hit.a : vec3(0.0);
    // dispersione: ogni colonna prende una tinta dello spettro che scorre lungo la scia
    float hue = fract(vnoise(vec2(dot(p, perp) * 0.018, 1.0)) * 1.4 + f * 0.35);
    c = mix(c, hsv2rgb(vec3(hue, 0.9, 1.0)), uSpectrum * smoothstep(0.0, 0.25, f));
    c = mix(c, vec3(1.0), uGlow * pow(1.0 - f, 8.0) * 0.7);
    col += c * w; a += w;
  }
  col /= 3.0; a /= 3.0;
  vec4 tr = vec4(col, a);
  o = mix(s, over(s, tr), uAmt);
}`

/** raggi di luce: le lettere proiettano fasci verso l'esterno (radiali o orizzontali) */
export const RAYS = FX + `uniform vec2 uCenter; uniform float uLen, uInt, uMode; uniform vec3 uCol;
void main() {
  vec4 s = texture(uSrc, vUv);
  vec2 dir = uMode < 0.5 ? (vUv - uCenter) : vec2(sign(vUv.x - uCenter.x) * 0.5, 0.0);
  float acc = 0.0, w = 1.0, tot = 0.0;
  for (int k = 0; k < 64; k++) {
    float f = float(k) / 64.0;
    vec2 uv = vUv - dir * f * uLen;
    acc += texture(uOrig, uv).a * w; tot += w;
    w *= 0.965;
  }
  float r = acc / tot;
  float n = 0.7 + 0.3 * vnoise(vec2(atan(vUv.y - uCenter.y, vUv.x - uCenter.x) * 40.0, 1.0));
  // scie orizzontali: ogni riga ha la sua intensità, come luce che scorre
  float row = vnoise(vec2(3.0, vUv.y * uRes.y / uZ * 0.12)) * 0.6 + vnoise(vec2(9.0, vUv.y * uRes.y / uZ * 0.5)) * 0.4;
  float m = uMode < 0.5 ? n : pow(row, 2.2) * 2.4;
  float dd = max(sd(vUv) / uZ, 0.0);
  float i = clamp(r * uInt * m * 2.2, 0.0, 1.0) * exp(-dd / (uLen * (uMode < 0.5 ? 700.0 : 380.0)));
  vec3 col = mix(uCol, vec3(1.0), pow(i, 2.0) * 0.8);
  vec4 glow = vec4(col * i, i * 0.9);
  // i raggi stanno dietro; sopra, le lettere restano piene (con un lieve alone chiaro)
  vec4 over1 = over(s, glow);
  o = mix(s, vec4(over1.rgb + uCol * i * 0.25 * s.a, over1.a), uAmt);
}`

/** glitter: lettere fatte di scaglie che brillano, con polvere attorno */
export const GLITTER = FX + `uniform vec3 uBase; uniform float uUse, uSize, uSpark, uDust;
vec2 cellRnd(vec2 c) { return vec2(hash12(c), hash12(c + 17.3)); }
void main() {
  vec4 s = texture(uSrc, vUv);
  vec2 p = vUv * uRes / (uZ * uSize);
  vec2 c = floor(p), f = fract(p);
  float md = 9.0; vec2 mc = c;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)); vec2 o2 = cellRnd(c + g);
    float d = length(g + o2 - f); if (d < md) { md = d; mc = c + g; }
  }
  float h = hash12(mc * 1.7);
  float bright = pow(h, 6.0) * uSpark * 3.0 + 0.35 + 0.65 * h;
  vec3 base = uUse > 0.5 ? uBase : (s.a > 0.0 ? s.rgb / s.a : uBase);
  vec3 col = base * bright + vec3(pow(h, 18.0) * uSpark * 2.0);
  float dust = 0.0;
  float d = sd(vUv) / uZ;
  if (d > 0.0) { float r = hash12(floor(vUv * uRes / 2.0)); dust = step(1.0 - uDust * 0.06 * exp(-d / 40.0), r); }
  float a = max(s.a, dust);
  o = mix(s, vec4(col * a, a), uAmt);
}`

/* ─── tendenze: ottica, stampa, segnale ─── */

/** vetro scanalato: ogni costa è una lente cilindrica che rimpicciolisce e capovolge
 *  ciò che ha dietro, con dispersione dei colori, satinatura e luce sui bordi */
export const FLUTED = FX + `uniform sampler2D uFrostTex; uniform float uW, uStr, uAng, uHi, uShade, uDisp, uFrost;
vec4 lens(vec2 p, float k, float s, float mag, vec2 ax, vec2 nr) {
  // centro della costa + posizione locale ridotta/capovolta dalla lente
  vec2 q = ax * ((k + 0.5) * uW + s * uW * mag) + nr * dot(p, nr);
  vec2 uv = q * uZ / uRes;
  return mix(texture(uSrc, uv), texture(uFrostTex, uv), uFrost);
}
void main() {
  vec2 p = vUv * uRes / uZ;
  vec2 ax = vec2(cos(uAng), sin(uAng)), nr = vec2(-ax.y, ax.x);
  float u = dot(p, ax) / uW, k = floor(u), s = fract(u) - 0.5;
  float mag = 1.0 - uStr * 4.5;   // < 0: l'immagine dietro la costa si capovolge e si comprime
  vec4 c;
  c.ga = lens(p, k, s, mag, ax, nr).ga;
  c.r = lens(p, k, s, mag * (1.0 + uDisp), ax, nr).r;
  c.b = lens(p, k, s, mag * (1.0 - uDisp), ax, nr).b;
  // volume della costa: ombra ai lati, una luce stretta e un filo scuro di giunzione
  float bend = s * 2.0;
  float sh = 1.0 - uShade * 0.38 * bend * bend;
  float hi = exp(-pow((s - 0.26) * 16.0, 2.0)) * uHi * 0.55 + exp(-pow((s + 0.33) * 26.0, 2.0)) * uHi * 0.18;
  float seam = smoothstep(0.47, 0.5, abs(s)) * uShade * 0.35;
  c.rgb = c.rgb * sh * (1.0 - seam) + vec3(hi) * c.a;
  vec4 base = texture(uSrc, vUv);
  c = vec4(c.rgb + base.rgb * (1.0 - c.a), c.a + base.a * (1.0 - c.a));   // ai bordi non entra il vuoto
  c *= base.a / max(c.a, 1e-4);
  o = mix(base, c, uAmt);
}`

/** ASCII: tono medio della cella, contrasto locale e caratteri orientati sui contorni.
 *  Il colore e il volume della foto restano: i caratteri si accendono con la luce,
 *  sotto rimane una velatura della fotografia. */
export const ASCII = FX + `uniform sampler2D uAtlas, uCellTex, uLocal; uniform float uCell, uN, uMode, uColor, uUnder, uEdges, uCon, uSat, uInv, uStyle; uniform vec3 uInk, uBg;
vec3 unp(vec4 c) { return c.a > 0.0 ? c.rgb / c.a : vec3(0.0); }
void main() {
  vec2 p = vUv * uRes / uZ;
  vec2 cs = vec2(uCell * 0.62, uCell);
  vec2 cell = floor(p / cs), f = fract(p / cs);
  vec2 cuv = (cell + 0.5) * cs * uZ / uRes;
  vec4 cc = texture(uCellTex, cuv);
  float a = cc.a;
  vec3 col = unp(cc);
  float L = luma(col), Lb = luma(unp(texture(uLocal, cuv)));
  // contrasto locale: i volumi si leggono anche nelle zone piatte
  float t = clamp(L + (L - Lb) * uCon * 2.2, 0.0, 1.0);
  t = mix(t, smoothstep(0.0, 1.0, t), 0.5);
  float dens = uInv > 0.5 ? pow(1.0 - t, 0.85) : t;
  // contorni: gradiente sul tono delle celle vicine, diventa un segno orientato
  vec2 st = cs * uZ / uRes;
  float gx = luma(unp(texture(uCellTex, cuv + vec2(st.x, 0.0)))) - luma(unp(texture(uCellTex, cuv - vec2(st.x, 0.0))));
  float gy = luma(unp(texture(uCellTex, cuv + vec2(0.0, st.y)))) - luma(unp(texture(uCellTex, cuv - vec2(0.0, st.y))));
  float gm = length(vec2(gx, gy));
  float idx = floor(clamp(dens, 0.0, 0.999) * uN);
  if (uEdges > 0.0 && gm > 0.2 / uEdges && dens > 0.15) {
    float ang = atan(gy, gx);                               // direzione del gradiente
    float e = mod(floor((ang + 3.14159) / 0.785398 + 0.5), 4.0);  // 0 orizz. grad. → contorno verticale
    idx = uN + e;
  }
  float g = texture(uAtlas, vec2((idx + f.x) / (uN + 4.0), f.y)).r;
  // colore del carattere: tinta della foto, rinforzata, con luminosità che segue il tono
  vec3 hue = col / max(max(col.r, max(col.g, col.b)), 0.02);
  vec3 tint = mix(vec3(luma(hue)), hue, uSat);
  vec4 under = texture(uLocal, vUv) * 0.5 + texture(uSrc, vUv) * 0.5;
  vec3 res; float alpha;
  if (uMode < 0.5) {            // foto in caratteri: la foto resta intera, i caratteri ne modulano la luce
    vec3 ph = unp(texture(uSrc, vUv)) * 0.6 + col * 0.4;
    vec3 ink = mix(uInk, ph * 1.12 + tint * 0.05, uColor);
    // più stile = fondo più scuro tra i caratteri, la foto la disegnano loro
    res = mix(ph * (0.38 + 0.25 * uUnder) * (1.0 - uStyle * 0.75), ink * (1.0 + uStyle * 0.35), g);
    alpha = 1.0;
  } else if (uMode < 1.5) {     // luce su nero: caratteri luminosi, foto velata sotto
    vec3 ink = mix(uInk * (0.3 + 0.9 * t), min(col * 2.1 + tint * 0.2 * t, vec3(1.4)), uColor);
    res = mix(uBg, unp(under), uUnder * (0.35 + 0.9 * t)) * (1.0 - g * 0.9) + ink * g;
    alpha = 1.0;
  } else if (uMode < 2.5) {     // inchiostro su carta
    vec3 ink = mix(uInk, col * 0.45 * (0.5 + 0.5 * t), uColor);
    vec3 paper = mix(uBg, uBg * (unp(under) * 0.85 + 0.15), uUnder);
    paper *= 0.965 + 0.05 * fbm(p * 0.6);
    res = mix(paper, ink, g * (0.82 + 0.18 * vnoise(p * 1.7)));
    alpha = 1.0;
  } else {                      // solo caratteri, fondo trasparente
    res = mix(uInk, tint * (0.4 + 0.8 * t), uColor);
    alpha = g;
  }
  alpha *= step(0.02, a);
  o = mix(texture(uSrc, vUv), vec4(res * alpha, alpha), uAmt);
}`

/** incisione / linoleografia: linee che seguono i volumi (come le banconote), spesse nelle
 *  ombre e sottili nelle luci, tratteggio incrociato nei neri; inchiostro anche a colori */
export const LINOCUT = FX + `uniform sampler2D uFlowTex; uniform vec3 uInk, uPaper; uniform float uLines, uAng, uFlow, uCross, uColor, uRough, uTh;
vec3 unp(vec4 c) { return c.a > 0.0 ? c.rgb / c.a : vec3(0.0); }
float lineInk(vec2 p, float ang, float dark, float phase) {
  vec2 ax = vec2(cos(ang), sin(ang));
  float t = dot(p, ax) / uLines + phase;
  float tri = abs(fract(t) - 0.5) * 2.0;           // 0 al centro della linea
  float w = fwidth(t) * 1.1 + 0.015;
  return 1.0 - smoothstep(dark - w, dark + w, tri);
}
void main() {
  vec4 s = texture(uSrc, vUv);
  if (s.a <= 0.0) { o = s; return; }
  vec2 p = vUv * uRes / uZ;
  vec3 col = unp(s), fc = unp(texture(uFlowTex, vUv));
  float L = luma(col), Lf = luma(fc);
  float tone = clamp((L - uTh) * 1.55 + 0.5, 0.0, 1.0);
  float dark = pow(1.0 - tone, 1.1);
  float rough = (vnoise(p * 0.35) - 0.5) * uRough * 0.25;
  // le linee si piegano sul tono sfocato: avvolgono i volumi
  float phase = Lf * uFlow * 3.0 + fbm(p * 0.008) * 0.6;
  float ink = lineInk(p, uAng, dark * 0.95 + rough, phase);
  if (uCross > 0.0) {
    float d2 = clamp((dark - 0.55) / 0.45, 0.0, 1.0) * uCross;
    ink = max(ink, lineInk(p, uAng + 1.0472, d2 * 0.9 + rough, phase * 0.6));
    float d3 = clamp((dark - 0.8) / 0.2, 0.0, 1.0) * uCross;
    ink = max(ink, lineInk(p, uAng - 1.0472, d3 * 0.8 + rough, phase * 0.4));
  }
  vec3 inkC = mix(uInk, col * 0.55 * (0.6 + 0.4 * tone) + uInk * 0.15, uColor);
  vec3 paper = mix(uPaper, uPaper * (0.82 + 0.18 * col / max(L, 0.05)), uColor * 0.35);
  o = mix(s, vec4(mix(paper, inkC, ink) * s.a, s.a), uAmt);
}`

/** mosaico a specchio: tessere che rifrangono e riflettono, con fughe e luce propria */
export const MIRRORTILE = FX + `uniform float uSize, uRefr, uGrout, uGloss; uniform vec3 uGroutCol;
void main() {
  vec2 p = vUv * uRes / uZ;
  vec2 cell = floor(p / uSize), f = fract(p / uSize);
  vec2 rnd = vec2(hash12(cell), hash12(cell + 7.1)) - 0.5;
  vec2 off = (rnd * uRefr + (f - 0.5) * uRefr * 0.6) * uSize * uZ / uRes;
  vec4 c = texture(uSrc, vUv + off);
  float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
  float bev = smoothstep(0.0, 0.12, e);
  float light = 0.85 + 0.3 * dot(normalize(vec2(0.6, -0.8)), (f - 0.5) * 2.0) * (1.0 - bev) + rnd.x * 0.25;
  c.rgb *= light;
  // riflesso: un bagliore morbido in un angolo di ogni tessera, diverso per ognuna
  vec2 gp = vec2(0.22 + rnd.x * 0.3, 0.2 + rnd.y * 0.3);
  c.rgb += vec3(exp(-dot(f - gp, f - gp) * 40.0) * uGloss * 0.45) * c.a;
  float grout = 1.0 - smoothstep(uGrout * 0.5, uGrout * 0.5 + 0.02, e);
  c.rgb = mix(c.rgb, uGroutCol * c.a, grout);
  o = mix(texture(uSrc, vUv), c, uAmt);
}`

/** luce proiettata: ombre di una finestra, di foglie o caustiche d'acqua sopra l'oggetto */
export const LIGHTCAST = FX + `uniform float uMode, uAng, uScale, uSoft, uStr; uniform vec3 uWarm;
void main() {
  vec4 s = texture(uSrc, vUv);
  vec2 p = vUv * uRes / uZ / uScale;
  float ca = cos(uAng), sa = sin(uAng);
  vec2 q = vec2(ca * p.x + sa * p.y, -sa * p.x + ca * p.y);
  float lit;
  if (uMode < 0.5) {            // finestra: riquadri con montanti, prospettiva obliqua
    q.x += q.y * 0.35;
    vec2 g = fract(q / vec2(260.0, 330.0));
    float bar = min(min(g.x, 1.0 - g.x) * 260.0, min(g.y, 1.0 - g.y) * 330.0);
    lit = smoothstep(10.0, 10.0 + uSoft * 60.0, bar);
  } else if (uMode < 1.5) {     // foglie: macchie di luce e ombra
    float n = fbm(q * 0.006) * 0.7 + fbm(q * 0.02 + 3.0) * 0.3;
    lit = smoothstep(0.42 - uSoft * 0.2, 0.58 + uSoft * 0.2, n);
  } else {                      // caustiche: reticolo luminoso dell'acqua
    vec2 w = q * 0.012;
    float c = 0.0;
    for (int i = 0; i < 3; i++) { w += vec2(sin(w.y * 1.7 + float(i)), cos(w.x * 1.3 - float(i))) * 0.6; c += abs(sin(w.x + w.y)); }
    lit = pow(1.0 - c / 3.0, 3.0 - uSoft * 2.0) * 1.6;
  }
  vec3 col = s.a > 0.0 ? s.rgb / s.a : vec3(0.0);
  float L = luma(col), li = clamp(lit, 0.0, 1.0);
  // ombra fredda e profonda, luce calda che si accende di più sulle superfici chiare
  vec3 shadow = col * mix(vec3(1.0), vec3(0.55, 0.62, 0.8) * (1.0 - uStr * 0.55), uStr);
  vec3 shaded = mix(shadow, col, li) + uWarm * clamp(lit, 0.0, 1.5) * uStr * (0.12 + 0.35 * L) * col;
  shaded += uWarm * pow(clamp(lit, 0.0, 1.5), 3.0) * uStr * 0.08;
  o = mix(s, vec4(shaded * s.a, s.a), uAmt);
}`

/** pixel sorting vero: dentro ogni tratto di luminosità compresa nella soglia, i pixel
 *  vengono ordinati per luce (scelta per rango su 32 campioni); fuori resta la foto */
export const PIXELSORT = FX + `uniform vec2 uDir; uniform float uLo, uHi, uVar, uRev;
float lu(vec4 c) { return luma(c.a > 0.0 ? c.rgb / c.a : vec3(0.0)); }
bool inside(float l) { return l >= uLo && l <= uHi; }
void main() {
  vec4 s = texture(uSrc, vUv);
  float l0 = lu(s);
  if (!inside(l0) || s.a < 0.01) { o = s; return; }
  vec2 px = vUv * uRes;
  vec2 dn = normalize(uDir * uRes);
  float row = floor(dot(px, vec2(-dn.y, dn.x)) / max(1.0, uZ));
  float maxLen = mix(1.0, 0.25 + 0.75 * hash12(vec2(row, 3.1)), uVar);
  vec2 stp = uDir * maxLen / 64.0;
  float b = 0.0, f = 0.0;
  for (int k = 1; k <= 64; k++) { vec4 c = texture(uSrc, vUv - stp * float(k)); if (!inside(lu(c)) || c.a < 0.01) break; b = float(k); }
  for (int k = 1; k <= 64; k++) { vec4 c = texture(uSrc, vUv + stp * float(k)); if (!inside(lu(c)) || c.a < 0.01) break; f = float(k); }
  float n = b + f;
  if (n < 2.0) { o = s; return; }
  vec4 cs[32]; float ls[32];
  for (int i = 0; i < 32; i++) { vec4 c = texture(uSrc, vUv + stp * (-b + n * (float(i) + 0.5) / 32.0)); cs[i] = c; ls[i] = lu(c); }
  float t = b / n; if (uRev > 0.5) t = 1.0 - t;
  int want = int(clamp(t * 32.0, 0.0, 31.0));
  vec4 pick = s;
  for (int i = 0; i < 32; i++) {
    int r = 0;
    for (int j = 0; j < 32; j++) r += (ls[j] < ls[i] || (ls[j] == ls[i] && j < i)) ? 1 : 0;
    if (r == want) { pick = cs[i]; break; }
  }
  o = mix(s, pick, uAmt);
}`

/** low-poly adattivo: triangoli più piccoli dove c'è dettaglio, ogni faccia ha il colore
 *  medio dei suoi vertici e una luce propria (la luminosità fa da rilievo) */
export const LOWPOLY = FX + `uniform sampler2D uSoft; uniform float uSize, uEdge, uDetail, uRelief, uJit;
vec3 unp(vec4 c) { return c.a > 0.0 ? c.rgb / c.a : vec3(0.0); }
vec2 warp(vec2 p) { return vec2(vnoise(p / (uSize * 2.3)), vnoise(p / (uSize * 2.3) + 31.7)) * uSize * uJit; }
vec2 toPx(vec2 v, float sz) { vec2 q = vec2(v.x + v.y * 0.5, v.y * 0.866) * sz; return q - warp(q); }
vec4 samp(vec2 q) { return texture(uSoft, q * uZ / uRes); }
void main() {
  vec2 p = vUv * uRes / uZ;
  vec2 pw = p + warp(p);
  float sz = uSize;
  vec2 v0, v1, v2, f; float up;
  for (int lv = 0; lv < 2; lv++) {
    vec2 g = pw / sz;
    vec2 sk = vec2(g.x - g.y * 0.57735, g.y * 1.1547);
    vec2 c = floor(sk); f = fract(sk);
    up = step(1.0, f.x + f.y);
    v0 = up > 0.5 ? c + vec2(1.0, 1.0) : c;
    v1 = c + vec2(1.0, 0.0); v2 = c + vec2(0.0, 1.0);
    if (lv == 1) break;
    vec3 a = unp(samp(toPx(v0, sz))), b = unp(samp(toPx(v1, sz))), d = unp(samp(toPx(v2, sz)));
    vec3 m = unp(samp(toPx((v0 + v1 + v2) / 3.0, sz)));
    float det = max(max(length(a - m), length(b - m)), length(d - m));
    if (det < 0.3 * (1.0 - uDetail) + 0.07) break;
    sz *= 0.5;
  }
  vec2 P0 = toPx(v0, sz), P1 = toPx(v1, sz), P2 = toPx(v2, sz);
  vec4 A = samp(P0), B = samp(P1), C = samp(P2), M = samp((P0 + P1 + P2) / 3.0);
  vec4 col = (A + B + C + M * 3.0) / 6.0;
  // normale della faccia: la luminosità dei vertici fa da altezza
  vec3 e1 = vec3(P1 - P0, (luma(unp(B)) - luma(unp(A))) * sz * 2.2 * uRelief);
  vec3 e2 = vec3(P2 - P0, (luma(unp(C)) - luma(unp(A))) * sz * 2.2 * uRelief);
  vec3 nrm = normalize(cross(e1, e2)); if (nrm.z < 0.0) nrm = -nrm;
  float lit = dot(nrm, normalize(vec3(-0.5, -0.6, 0.62)));
  col.rgb *= 0.78 + 0.34 * lit + 0.06 * (hash12(v0 * 7.0 + up + sz) - 0.5);
  col.rgb += vec3(pow(max(lit, 0.0), 12.0) * 0.12 * uRelief) * col.a;
  float e = min(min(f.x, f.y), abs(1.0 - f.x - f.y));
  col.rgb = mix(col.rgb, col.rgb * 1.18 + 0.03 * col.a, uEdge * (1.0 - smoothstep(0.0, 0.035, e)));
  vec4 base = texture(uSrc, vUv);
  col = vec4(unp(col) * base.a, base.a);   // il contorno resta quello dell'immagine
  o = mix(base, col, uAmt);
}`

/** caleidoscopio: un frammento ripetuto e specchiato attorno al centro */
export const KALEIDO = FX + `uniform float uSeg, uRot, uZoom; uniform vec2 uC;
void main() {
  vec2 q = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float r = length(q) / uZoom, a = atan(q.y, q.x) + uRot;
  float seg = 6.2832 / uSeg;
  a = mod(a, seg); a = abs(a - seg * 0.5);
  vec2 uv = uC + vec2(cos(a), sin(a)) * r * vec2(uRes.y / uRes.x, 1.0);
  o = mix(texture(uSrc, vUv), texture(uSrc, clamp(uv, 0.0, 1.0)), uAmt);
}`

/** rifinitura comune agli effetti foto: riporta la luce media della foto originale
 *  (niente più risultati scuri), bagliore morbido, spalla dolce sulle luci, grana fine */
export const TONEMATCH = LIB + `uniform sampler2D uSrc, uRef, uResB, uGlow; uniform float uK, uBloom, uGrain, uT;
vec3 unp(vec4 c) { return c.a > 0.0 ? c.rgb / c.a : vec3(0.0); }
float shoulder(float x) { return x < 0.78 ? x : 0.78 + 0.22 * (1.0 - exp(-(x - 0.78) / 0.22)); }
void main() {
  vec4 s = texture(uSrc, vUv);
  if (s.a <= 0.0) { o = s; return; }
  vec3 c = s.rgb / s.a;
  vec3 rc = unp(texture(uRef, vUv)), bc = unp(texture(uResB, vUv));
  float f = clamp((luma(rc) + 0.03) / (luma(bc) + 0.03), 0.6, 1.9);
  c *= mix(1.0, f, uK);
  // anche il colore medio torna quello della foto
  c += (rc - bc * f) * uK * 0.35;
  c += unp(texture(uGlow, vUv)) * uBloom;
  c = max(c, 0.0);
  c = vec3(shoulder(c.r), shoulder(c.g), shoulder(c.b));
  c += (hash12(vUv * uRes + fract(uT) * 91.0) - 0.5) * uGrain;
  o = vec4(clamp(c, 0.0, 1.0) * s.a, s.a);
}`
