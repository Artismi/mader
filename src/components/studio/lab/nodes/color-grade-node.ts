import {
  vec4, float, mix, cos, sin, pow, max, min, clamp
} from 'three/tsl'

/**
 * Cinematic Color Grading Pipeline
 *
 * Execution order (mirrors DaVinci Resolve / ACES pipeline):
 *   Exposure → Contrast → Saturation → Vibrance → Temperature → Hue → ACES Tonemapping
 *
 * All parameters have neutral values that produce zero transformation:
 *   exposure=0, contrast=1, saturation=1, vibrance=0, temperature=0, hue=0, toneMap=0
 */
export const colorGradeNode = (
  inputColor: any,
  uExposure: any,      // EV stops  −2..+2   (0 = neutral)
  uContrast: any,      // 0.5..2.0            (1 = neutral)
  uSaturation: any,    // 0..2                (1 = neutral)
  uVibrance: any,      // −1..+1              (0 = neutral)
  uTemperature: any,   // −1 cool..+1 warm    (0 = neutral)
  uHue: any,           // radians 0..2π       (0 = neutral)
  uToneMap: any,       // 0 = linear, 1 = ACES filmic
) => {
  // ── 1. Exposure ───────────────────────────────────────────────────────────
  // Physical EV: multiply by 2^stops. pow(2, 0) = 1 → identity.
  const expMul = pow(float(2), uExposure)
  let r = inputColor.r.mul(expMul)
  let g = inputColor.g.mul(expMul)
  let b = inputColor.b.mul(expMul)

  // ── 2. Contrast ───────────────────────────────────────────────────────────
  // Pivoted at 0.5 in gamma space. contrast=1 → (x-0.5)*1+0.5 = x (identity).
  r = r.sub(0.5).mul(uContrast).add(0.5)
  g = g.sub(0.5).mul(uContrast).add(0.5)
  b = b.sub(0.5).mul(uContrast).add(0.5)

  // ── 3. Saturation ─────────────────────────────────────────────────────────
  // Rec.709 luma weights. saturation=1 → mix(luma, color, 1) = color (identity).
  const luma = r.mul(0.2126).add(g.mul(0.7152)).add(b.mul(0.0722))
  r = mix(luma, r, uSaturation)
  g = mix(luma, g, uSaturation)
  b = mix(luma, b, uSaturation)

  // ── 4. Vibrance ───────────────────────────────────────────────────────────
  // Selective saturation: boosts desaturated pixels more than already-vivid ones.
  // vibrance=0 → vibranceScale=0 → mix(luma, color, 1+0) = color (identity).
  const localSat = max(max(r, g), b).sub(min(min(r, g), b))
  const vibranceScale = uVibrance.mul(float(1).sub(localSat).clamp(0, 1))
  r = mix(luma, r, float(1).add(vibranceScale))
  g = mix(luma, g, float(1).add(vibranceScale))
  b = mix(luma, b, float(1).add(vibranceScale))

  // ── 5. Temperature ────────────────────────────────────────────────────────
  // Warm (+): push toward orange/yellow by lifting R, slightly G, pulling B.
  // Cool (−): inverse. temperature=0 → adds zero (identity).
  r = r.add(uTemperature.mul(0.08))
  g = g.add(uTemperature.mul(0.02))
  b = b.sub(uTemperature.mul(0.12))

  // ── 6. Hue Rotation ───────────────────────────────────────────────────────
  // Luminance-preserving rotation matrix (Haeberli & Voorhies, 1994).
  // hue=0 → cos=1, sin=0 → matrix collapses to identity.
  const cosH = cos(uHue)
  const sinH = sin(uHue)

  const hr =
    r.mul(float(0.299).add(float(0.701).mul(cosH)).add(float(0.168).mul(sinH))).add(
    g.mul(float(0.587).sub(float(0.587).mul(cosH)).add(float(0.330).mul(sinH)))).add(
    b.mul(float(0.114).sub(float(0.114).mul(cosH)).sub(float(0.497).mul(sinH))))

  const hg =
    r.mul(float(0.299).sub(float(0.299).mul(cosH)).sub(float(0.328).mul(sinH))).add(
    g.mul(float(0.587).add(float(0.413).mul(cosH)).add(float(0.035).mul(sinH)))).add(
    b.mul(float(0.114).sub(float(0.114).mul(cosH)).add(float(0.292).mul(sinH))))

  const hb =
    r.mul(float(0.299).sub(float(0.300).mul(cosH)).add(float(1.250).mul(sinH))).add(
    g.mul(float(0.587).sub(float(0.588).mul(cosH)).sub(float(1.050).mul(sinH)))).add(
    b.mul(float(0.114).add(float(0.886).mul(cosH)).sub(float(0.203).mul(sinH))))

  // ── 7. ACES Filmic Tonemapping ────────────────────────────────────────────
  // Stephen Hill's fit of the ACES reference transform.
  // Maps HDR-like values through an S-curve and clamps to [0,1].
  // toneMap=0 → select passes through linear-clamped value (identity).
  const aces = (x: any) => {
    const a = float(2.51)
    const bv = float(0.03)
    const cv = float(2.43)
    const dv = float(0.59)
    const ev = float(0.14)
    return x.mul(x.mul(a).add(bv)).div(x.mul(x.mul(cv).add(dv)).add(ev)).clamp(0, 1)
  }

  const outR = uToneMap.greaterThan(0.5).select(aces(hr), hr.clamp(0, 1))
  const outG = uToneMap.greaterThan(0.5).select(aces(hg), hg.clamp(0, 1))
  const outB = uToneMap.greaterThan(0.5).select(aces(hb), hb.clamp(0, 1))

  return vec4(outR, outG, outB, inputColor.a)
}
