import { 
  vec2, float
} from 'three/tsl'
import { gnoise, getSelectionMask } from './shared-tsl'

/**
 * Liquid Distortion Logic (Cinema-Grade FBM)
 * Now supports Selective Masking
 */
export const liquidDistort = (
  vUv: any,
  uTime: any,
  uIntensity: any,
  uViscosity: any,
  uComplexity: any,
  uSelectionRect: any,
  uSelectionActive: any,
  uSelectionFeather: any
) => {
  const t = uTime.mul(uViscosity)
  const complexity = uComplexity.mul(0.5)
  
  const fbm = (p: any) => {
    let value = float(0.0)
    let amplitude = float(0.5)
    let pos = p
    
    // 3 Layers of organic noise (FBM)
    value = value.add(gnoise(pos).mul(amplitude))
    pos = pos.mul(2.0).add(t.mul(0.2))
    amplitude = amplitude.mul(0.5)
    
    value = value.add(gnoise(pos).mul(amplitude))
    pos = pos.mul(2.1).add(t.mul(0.3))
    amplitude = amplitude.mul(0.5)
    
    value = value.add(gnoise(pos).mul(amplitude))
    return value
  }

  const q = vec2(
    fbm(vUv.mul(complexity).add(t)), 
    fbm(vUv.mul(complexity).add(vec2(5.2, 1.3)))
  )
  
  const r = vec2(
    fbm(vUv.mul(complexity).add(q.mul(4.0)).add(t.mul(0.5))), 
    fbm(vUv.mul(complexity).add(q.mul(4.0)).add(vec2(1.7, 9.2)))
  )
  
  const distortion = r.mul(uIntensity).mul(0.12)
  const mask = getSelectionMask(vUv, uSelectionRect, uSelectionActive, uSelectionFeather)
  
  return vUv.add(distortion.mul(mask))
}
