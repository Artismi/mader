import { 
  vec2, floor, mix, step
} from 'three/tsl'
import { gnoise, getSelectionMask } from './shared-tsl'

/**
 * Glitch Distortion Logic
 * Now supports Selective Masking
 */
export const glitchDistort = (
  vUv: any,
  uTime: any,
  uAmount: any,
  uSeed: any,
  uSelectionRect: any,
  uSelectionActive: any,
  uSelectionFeather: any
) => {
  const t = floor(uTime.mul(18.0)).mul(0.1337).add(uSeed)
  
  const grid = mix(16.0, 48.0, uAmount)
  const block = floor(vUv.mul(grid)).div(grid)
  const n = gnoise(block.add(t))
  
  const isGlitchRow = step(n, uAmount.mul(0.22))
  
  const strength = uAmount.mul(0.15)
  const shiftX = gnoise(vec2(t, block.y)).sub(0.5).mul(strength)
  const shiftY = gnoise(vec2(block.x, t)).sub(0.5).mul(strength).mul(0.3)
  
  const distortion = vec2(shiftX, shiftY).mul(isGlitchRow)
  const mask = getSelectionMask(vUv, uSelectionRect, uSelectionActive, uSelectionFeather)
  
  return vUv.add(distortion.mul(mask))
}
