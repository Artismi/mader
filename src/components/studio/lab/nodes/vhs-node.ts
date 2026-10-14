import {
  vec2, vec4, float, sin, step, floor, mix, texture
} from 'three/tsl'
import { gnoise, getSelectionMask } from './shared-tsl'

/**
 * VHS Distortion Logic
 * Now supports Selective Masking
 */
export const vhsDistort = (
  vUv: any,
  uTime: any,
  uIntensity: any,
  uTracking: any,
  uSelectionRect: any,
  uSelectionActive: any,
  uSelectionFeather: any
) => {
  const t = uTime
  
  // 1. Analog Jitter & Tracking Error
  const switchSize = uTracking.mul(0.04)
  const isSwitch = step(float(1.0).sub(switchSize), vUv.y)
  
  const jitterCoords = vec2(vUv.y, floor(t.mul(30.0)))
  const trackingShift = isSwitch.mul(gnoise(jitterCoords).sub(0.5)).mul(0.03).mul(uIntensity)
  
  const jitter = sin(vUv.y.mul(30.0).add(t.mul(8.0))).mul(0.0012).add(gnoise(vec2(t, 0.0)).sub(0.5).mul(0.002)).mul(uTracking)
  
  const distortion = vec2(trackingShift.add(jitter), float(0.0))
  const mask = getSelectionMask(vUv, uSelectionRect, uSelectionActive, uSelectionFeather)
  
  return vUv.add(distortion.mul(mask))
}

/**
 * VHS Color Effect — horizontal chroma bleed (R/B channel offset)
 * Simulates the color-channel separation artifact of degraded tape.
 * bleed controls the lateral separation distance.
 */
export const vhsColorEffect = (
  sourceTex: any,
  fc: any,
  vUv: any,
  uTime: any,
  uIntensity: any,
  uBleed: any
) => {
  const offset = uBleed.mul(uIntensity).mul(0.006)
  const rSample = texture(sourceTex, vUv.add(vec2(offset, float(0)))).r
  const bSample = texture(sourceTex, vUv.sub(vec2(offset, float(0)))).b
  const bleedAmt = uIntensity.mul(0.6)
  return vec4(
    mix(fc.r, rSample, bleedAmt),
    fc.g,
    mix(fc.b, bSample, bleedAmt),
    fc.a
  )
}
