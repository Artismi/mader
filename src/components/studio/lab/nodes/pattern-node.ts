import {
  vec3, vec4, uv,
  fract, smoothstep, fwidth, length, distance, float,
  mix, equal, max, clamp
} from 'three/tsl'

/**
 * Procedural Pattern Node for WebGPU
 * Uses analytic anti-aliasing (fwidth) for sharp results.
 *
 * Blend modes (uBlendMode):
 *   0 = Multiply  — base * tint (darkens, stampa su carta)
 *   1 = Screen    — 1-(1-base)*(1-tint) (lightens, glow/neon)
 *   2 = Overlay   — contrast-aware luminance blend
 *   3 = Add       — base + tint (light-leak)
 */
export const patternNode = (
  uTime: any,
  uScale: any,
  uThickness: any,
  uPatternType: any,   // 0: Grid, 1: Circles
  uColor: any,         // vec4 tint color
  uBlendMode: any = float(0),  // 0–3 blend mode
  sourceColor: any = vec4(float(0), float(0), float(0), float(1)) // base layer
) => {
  const gridUv = fract(uv().mul(uScale).add(uTime.mul(0.1)))

  // Grid Logic
  const aliasX = fwidth(gridUv.x)
  const aliasY = fwidth(gridUv.y)
  const lineX = smoothstep(uThickness.add(aliasX), uThickness.sub(aliasX), gridUv.x)
  const lineY = smoothstep(uThickness.add(aliasY), uThickness.sub(aliasY), gridUv.y)
  const gridColor = lineX.max(lineY)

  // Circle Logic
  const dist = distance(gridUv, float(0.5))
  const antialias = fwidth(dist)
  const circleColor = smoothstep(uThickness.add(antialias), uThickness.sub(antialias), dist)

  // Shape selection
  const mask = equal(uPatternType, 0).select(gridColor, circleColor)

  const tint = uColor.rgb
  const base = sourceColor.rgb

  // Blend modes
  const multiply = base.mul(tint)
  const screen    = float(1).sub(float(1).sub(base).mul(float(1).sub(tint)))
  const overlayLo = base.mul(tint).mul(2)
  const overlayHi = float(1).sub(float(1).sub(base).mul(float(1).sub(tint)).mul(2))
  const luma      = base.dot(vec3(float(0.299), float(0.587), float(0.114)))
  const overlay   = equal(luma, float(0)).select(overlayLo, overlayHi)
  const add       = clamp(base.add(tint), float(0), float(1))

  const blended = equal(uBlendMode, float(0)).select(multiply,
    equal(uBlendMode, float(1)).select(screen,
    equal(uBlendMode, float(2)).select(overlay,
    add)))

  // Apply pattern mask: blend where mask > 0, keep source elsewhere
  const rgb = mix(base, blended, mask)
  return vec4(rgb, sourceColor.a)
}
