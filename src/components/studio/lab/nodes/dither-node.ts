import { 
  vec3, floor, mod, float,
  screenUV, uniform, mix, clamp
} from 'three/tsl'

/**
 * Bayer Matrix Dithering Node for WebGPU
 * Simulates low color depth hardware
 */
export const ditherNode = (
  inputColor: any,
  uMode: any, // 0: 4x4, 1: 8x8
  uColorDepth: any
) => {
  // Bayer 4x4 Pre-calculated values (scaled to 1.0)
  const bayer4 = (p: any) => {
    const x = mod(floor(p.x), 4.0)
    const y = mod(floor(p.y), 4.0)
    // Simplified Bayer 4x4 formula
    return mod(x.add(y.mul(4.0)), 16.0).div(16.0) 
  }

  const pos = screenUV.mul(uniform(float(1000))) // Screen-space pixels
  const threshold = bayer4(pos)
  
  // Quantization
  const levels = clamp(uColorDepth, 1.0, 255.0)
  const quantized = floor(inputColor.rgb.mul(levels).add(threshold.sub(0.5))).div(levels)

  return vec3(quantized)
}
