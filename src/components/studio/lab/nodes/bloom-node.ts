import {
  Fn, texture, vec2, vec4, float, smoothstep
} from 'three/tsl'

/**
 * Bloom — 4-octave dual-Kawase radial accumulation
 *
 * Architecture:
 *   The original Dual Kawase algorithm achieves smooth large-area bloom via
 *   iterated ping-pong downscale/upscale passes. Without true multi-pass in a
 *   single shader, we approximate it by sampling four concentric rings at
 *   exponentially growing radii (1×, 2×, 4×, 8× the base radius), using the
 *   classic Kawase diagonal tap pattern at each ring.
 *
 *   After 4 octaves the effective kernel radius is 8× the base — covering
 *   20% of screen width at max user setting — while 17 total samples keep the
 *   cost equivalent to our previous 13-tap version.
 *
 * Octave radii and weights (Gaussian-ish power-of-two decay):
 *   Oct 0:  1× radius  — weight 1.00  (tight halo)
 *   Oct 1:  2× radius  — weight 0.50  (inner glow)
 *   Oct 2:  4× radius  — weight 0.25  (wide corona)
 *   Oct 3:  8× radius  — weight 0.12  (far nebula)
 *   Center: 0× radius  — weight 1.00  (isolated bright pixels still bloom)
 *   ΣW = 4×(1.00+0.50+0.25+0.12) + 1.00 = 8.48
 *
 * Bright-area extraction:
 *   Hard threshold → patchy, artificial.  We use a smooth-knee curve
 *   (smoothstep over ±10% of threshold) that matches the photochemical response
 *   of film highlights — the industry standard since UE4's bloom rework.
 */

// Pre-compile: extract bright contribution from a sampled colour.
// Soft knee: luminance below (threshold − knee) contributes nothing; above
// (threshold + knee) contributes fully; in between, a smooth S-curve.
const brightExtract = (s: any, threshold: any) => {
  const luma  = s.r.mul(0.2126).add(s.g.mul(0.7152)).add(s.b.mul(0.0722))
  const knee  = threshold.mul(0.2).add(0.001)   // knee width = 20% of threshold + ε
  const bright = smoothstep(threshold.sub(knee), threshold.add(knee), luma)
  return s.mul(bright)
}

// ── Compile-time constants ────────────────────────────────────────────────────
// JavaScript arrays → shader literals via float() — no uniform overhead.
const OCT_RADII   = [1, 2, 4, 8] as const        // tap offset multipliers per octave
const OCT_WEIGHTS = [1.0, 0.50, 0.25, 0.12] as const
// Total weight = 4 × Σ(weights) + 1 (center) = 8.48
const TOTAL_W = OCT_WEIGHTS.reduce((sum, w) => sum + w * 4, 0) + 1.0   // 8.48

export const bloomPass = Fn(([sourceTex, vUv, intensity, threshold, radius]: any[]) => {
  const base = texture(sourceTex, vUv)

  let bloom = vec4(0, 0, 0, 0)

  // 4 octaves × 4 diagonal taps (Kawase pattern: ±corner of a square)
  for (let oct = 0; oct < 4; oct++) {
    const r = OCT_RADII[oct]          // compile-time: 1, 2, 4, 8
    const w = float(OCT_WEIGHTS[oct]) // compile-time weight as shader literal
    // Diagonal taps — (±r, ±r) — approximate a circle via iterated convolution.
    // Using purely diagonal taps (no cardinal) maximises angular coverage per sample.
    for (const [ox, oy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
      const tapUv = vUv.add(vec2(float(ox * r), float(oy * r)).mul(radius))
      bloom = bloom.add(brightExtract(texture(sourceTex, tapUv), threshold).mul(w))
    }
  }

  // Center tap — ensures isolated bright pixels still generate a glow halo
  bloom = bloom.add(brightExtract(base, threshold))

  // Normalise, scale by user intensity, additive blend over base
  const glow = bloom.div(float(TOTAL_W)).mul(intensity)
  return vec4(base.rgb.add(glow.rgb), base.a)
})
