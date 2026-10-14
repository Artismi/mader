import { 
  Fn, vec4, vec3, float, mix, smoothstep, min, max
} from 'three/tsl'

/**
 * State of the Art Adaptive Threshold (Luma Keying / Soft Edge)
 */

const lumaWeights = vec3(0.2126, 0.7152, 0.0722)

export const thresholdNode = Fn(([
  colorNode,
  uValue,       // 0.0 to 1.0 (threshold center)
  uSmoothing    // 0.0 to 1.0 (edge softness)
]: any[]) => {
  // Rec.709 Luminance
  const luma = colorNode.rgb.dot(lumaWeights)
  
  // Calculate soft boundaries
  const halfSmooth = uSmoothing.mul(0.5)
  const lower = max(float(0.0), uValue.sub(halfSmooth))
  const upper = min(float(1.0), uValue.add(halfSmooth))

  // smoothstep for high-end edge-aware soft thresholding
  const alpha = smoothstep(lower, upper, luma)
  
  // Output a pure grayscale threshold mask
  const thresholdColor = vec3(alpha)
  
  return vec4(thresholdColor, colorNode.a)
})
