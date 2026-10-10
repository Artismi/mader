import {
  vec3, vec4, floor, mod, float, uv,
  mix, clamp, step
} from 'three/tsl'

/**
 * Bayer Matrix Dithering Node for WebGPU
 * Simulates low color depth hardware
 */
export const ditherNode = (
  inputColor: any,
  uMode: any, // -1: disabled, 0: 4x4, 1: 8x8
  uColorDepth: any
) => {
  const bayer4 = (p: any) => {
    const x = mod(floor(p.x), float(4))
    const y = mod(floor(p.y), float(4))
    return mod(x.add(y.mul(float(4))), float(16)).div(float(16))
  }

  // Object-local pixel coordinates (consistent with object position, not screen)
  const pos = uv().mul(float(1000))
  const threshold = bayer4(pos)

  const levels = clamp(uColorDepth, float(1), float(255))
  const quantized = floor(inputColor.rgb.mul(levels).add(threshold.sub(float(0.5)))).div(levels)

  // step(0, uMode): 0.0 when uMode < 0 (disabled), 1.0 when uMode >= 0 (enabled)
  const enabled = step(float(0), uMode)
  return mix(inputColor, vec4(vec3(quantized), inputColor.a), enabled)
}
