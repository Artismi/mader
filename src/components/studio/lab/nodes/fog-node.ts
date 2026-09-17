import { 
  Fn, texture, vec4, vec3, vec2, float, fract, length, mix, smoothstep
} from 'three/tsl'
import { gnoise } from './shared-tsl'

/**
 * State of the Art 3D Fog Pointcloud
 * Simulates a volumetric pointcloud by distorting a high-frequency grid
 * using luminance as Z-depth and FBM noise as temporal fog displacement.
 */

const lumaWeights = vec3(0.2126, 0.7152, 0.0722)

export const fogPointcloudNode = Fn(([
  sourceTex,
  colorNode,
  vUv,
  uTime,
  uDensity,
  uOscillation,
  uDepth,
  uLuminescence,
  uPointScale
]: any[]) => {
  const t = uTime.mul(uOscillation).mul(2.0)
  
  // 1. Fog Displacement (Temporal 3D Noise)
  // We offset the UV used for sampling to create a "drifting fog" look.
  const fogNoise = gnoise(vUv.mul(10.0).add(t)).mul(0.05).mul(uDepth)
  const displacedUv = vUv.add(fogNoise)
  
  // 2. Sample the original texture
  const texColor = texture(sourceTex, displacedUv)
  const luma = texColor.rgb.dot(lumaWeights)
  
  // 3. Grid Setup
  // Density scales the number of points (resolution)
  const gridRes = mix(50.0, 400.0, uDensity)
  const cellUv = vUv.mul(gridRes)
  const cellFract = fract(cellUv)
  
  // 4. Z-Depth Parallax (Luminance-based 3D Extrusion)
  // Brighter pixels are shifted upwards (or along an axis) to simulate 3D relief
  const parallax = vec2(0.0, luma.mul(uDepth).mul(0.8))
  
  // Apply parallax and center the dot
  const dotPos = cellFract.sub(0.5).add(parallax)
  const dist = length(dotPos)
  
  // 5. Point Radius & Softness
  // Base radius modulated by point scale, and further modulated by luminance (brighter = larger)
  const radius = uPointScale.mul(0.3).mul(mix(0.5, 1.0, luma))
  
  // High-end smoothstep for a glowing, volumetric "foggy" point
  // inner core is bright, outer edge is soft
  const alpha = smoothstep(radius, radius.mul(0.1), dist)
  
  // 6. Luminescence (HDR Emission simulation)
  const fogLuma = texColor.rgb.mul(uLuminescence).mul(2.5) // Boosted for glowing effect
  
  // Composite OVER colorNode.rgb using alpha
  const outRgb = mix(colorNode.rgb, fogLuma, alpha)
  
  return vec4(outRgb, colorNode.a)
})
