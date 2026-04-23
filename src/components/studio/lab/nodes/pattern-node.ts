import { 
  vec3, vec4, uv, 
  fract, smoothstep, fwidth, length, distance, float,
  mix, equal, max
} from 'three/tsl'

/**
 * Procedural Pattern Node for WebGPU
 * Uses analytic anti-aliasing (fwidth) for sharp results
 */
export const patternNode = (
  uTime: any,
  uScale: any,
  uThickness: any,
  uPatternType: any, // 0: Grid, 1: Circles
  uColor: any
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

  // Selection
  const mask = equal(uPatternType, 0).select(gridColor, circleColor)
  
  return vec4(uColor.rgb.mul(mask), mask)
}
