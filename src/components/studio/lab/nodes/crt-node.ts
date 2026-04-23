import { 
  vec3, vec4, dot, sin, mix, float, lessThan, greaterThan, or, floor, uniform
} from 'three/tsl'
import { getSelectionMask } from './shared-tsl'

/**
 * CRT Distortion Logic
 * Returns distorted UV coordinates with Selective Masking
 */
export const crtDistort = (
  vUv: any, 
  uDistortion: any,
  uSelectionRect: any,
  uSelectionActive: any,
  uSelectionFeather: any
) => {
  const cc = vUv.sub(0.5)
  const dist = dot(cc, cc)
  const distortion = cc.mul(dist.mul(uDistortion).mul(0.15))
  const mask = getSelectionMask(vUv, uSelectionRect, uSelectionActive, uSelectionFeather)
  
  return vUv.add(distortion.mul(mask))
}

/**
 * CRT Color Effects Logic
 * Now supports Selective Masking for scanlines and masks
 */
export const crtColorEffect = (
  baseColor: any,
  vUv: any,
  uTime: any,
  uMaskScale: any,
  uMaskIntensity: any,
  uScanlineIntensity: any,
  uBrightness: any,
  uSelectionRect: any,
  uSelectionActive: any,
  uSelectionFeather: any
) => {
  // 1. Bounds Check
  const isOutOfBounds = or(
    lessThan(vUv.x, 0),
    greaterThan(vUv.x, 1),
    lessThan(vUv.y, 0),
    greaterThan(vUv.y, 1)
  )

  // 2. Selection Mask factor
  const selectionMask = getSelectionMask(vUv, uSelectionRect, uSelectionActive, uSelectionFeather)

  // 3. Master Mask (RPG Slot-Mask)
  const pos = vUv.mul(uniform(float(1000))).div(uMaskScale.max(1.0))
  const column = floor(pos.x).mod(3.0)
  
  const mask = column.equal(0.0).select(vec3(1.0, 0.2, 0.2),
    column.equal(1.0).select(vec3(0.2, 1.0, 0.2),
    vec3(0.2, 0.2, 1.0)))

  const brick = floor(pos.y).add(floor(pos.x.div(3.0))).mod(2.0)
  const patternMask = mix(vec3(1.0), mask.mul(float(0.7).add(float(0.3).mul(brick))), uMaskIntensity)

  // 4. Scanlines
  const scanline = sin(vUv.y.mul(800.0)).mul(0.05).mul(uScanlineIntensity)
  
  // 5. Composition (Only apply effects if inside selection mask)
  const crtColor = baseColor.rgb.mul(patternMask).sub(scanline).mul(uBrightness)
  const finalRgb = mix(baseColor.rgb, crtColor, selectionMask)

  return isOutOfBounds.select(vec4(0, 0, 0, 1), vec4(finalRgb.mul(baseColor.a), baseColor.a))
}
