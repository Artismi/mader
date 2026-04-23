import { 
  vec2, float, smoothstep, mix, sin, dot, fract
} from 'three/tsl'

/**
 * Procedural Noise & FBM Utils for TSL
 */

export const hash2 = (p: any) => {
  const q = vec2(
    dot(p, vec2(127.1, 311.7)),
    dot(p, vec2(269.5, 183.3))
  )
  return fract(sin(q).mul(43758.5453123))
}

export const gnoise = (p: any) => {
  const i = p.floor()
  const f = p.fract()
  const u = f.mul(f).mul(float(3.0).sub(f.mul(2.0)))

  return mix(
    mix(dot(hash2(i.add(vec2(0.0, 0.0))), f.sub(vec2(0.0, 0.0))),
        dot(hash2(i.add(vec2(1.0, 0.0))), f.sub(vec2(1.0, 0.0))), u.x),
    mix(dot(hash2(i.add(vec2(0.0, 1.0))), f.sub(vec2(0.0, 1.0))),
        dot(hash2(i.add(vec2(1.0, 1.0))), f.sub(vec2(1.0, 1.0))), u.x), u.y)
}

/**
 * Selective Mask Factor
 * Returns 1.0 if inside rect, 0.0 outside, with smooth feathering
 */
export const getSelectionMask = (vUv: any, uRect: any, uActive: any, uFeather: any) => {
  // Add a small safety margin (5%) to the rect to avoid clipping edges during distortion
  const margin = float(0.05);
  const xMin = uRect.x.sub(margin)
  const yMin = uRect.y.sub(margin)
  const xMax = uRect.x.add(uRect.z).add(margin)
  const yMax = uRect.y.add(uRect.w).add(margin)
  
  // Use a slightly larger feather for transitions
  const feather = uFeather.add(0.005)

  const maskX = smoothstep(xMin, xMin.add(feather), vUv.x)
    .mul(float(1.0).sub(smoothstep(xMax.sub(feather), xMax, vUv.x)))
    
  const maskY = smoothstep(yMin, yMin.add(feather), vUv.y)
    .mul(float(1.0).sub(smoothstep(yMax.sub(feather), yMax, vUv.y)))
    
  const mask = maskX.mul(maskY)
  
  // If selection is not active OR if specific effects are off, we return 1.0
  // But uActive is consistently 1.0 in the lab loop, so we rely on the mask logic.
  return uActive.equal(1).select(mask, 1.0)
}
