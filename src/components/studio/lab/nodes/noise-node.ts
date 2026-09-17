import { 
  Fn, vec4, vec3, float, vec2, mix, sin, cos, log, fract, max, sqrt
} from 'three/tsl'

/**
 * State of the Art Gaussian Noise (Box-Muller Transform)
 */

// Simple pseudo-random generator
const random2D = (st: any) => fract(sin(vec2(st.dot(vec2(12.9898, 78.233)), st.dot(vec2(39.346, 11.135)))).mul(43758.5453))

export const gaussianNoiseNode = Fn(([
  colorNode,
  vUv,
  uTime,
  uIntensity,
  uMonochrome
]: any[]) => {
  // Use time to animate the noise per frame
  const timeFract = fract(uTime)
  
  // Random pairs for Box-Muller
  const r1 = random2D(vUv.add(timeFract))
  const u1 = max(r1.x, 0.000001) // Prevent log(0)
  const u2 = r1.y

  // Box-Muller transform for standard normal distribution Z0, Z1
  const z0 = sqrt(float(-2.0).mul(log(u1))).mul(cos(float(Math.PI * 2.0).mul(u2)))
  const z1 = sqrt(float(-2.0).mul(log(u1))).mul(sin(float(Math.PI * 2.0).mul(u2)))

  // Generate a third component for full RGB noise
  const r2 = random2D(vUv.sub(timeFract))
  const u3 = max(r2.x, 0.000001)
  const u4 = r2.y
  const z2 = sqrt(float(-2.0).mul(log(u3))).mul(cos(float(Math.PI * 2.0).mul(u4)))

  const rgbNoise = vec3(z0, z1, z2).mul(uIntensity)
  const monoNoise = vec3(z0, z0, z0).mul(uIntensity)

  // Blend based on Monochrome toggle
  const finalNoise = mix(rgbNoise, monoNoise, uMonochrome)

  return vec4(colorNode.rgb.add(finalNoise), colorNode.a)
})
