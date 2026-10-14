import {
  Fn, vec2, vec3, vec4, float, texture,
  sin, cos, abs, clamp,
  smoothstep, mix, length, step, equal,
  pow
} from 'three/tsl'
import { hash2 } from './shared-tsl'

/**
 * Dot Matrix Node — High-End Analog Reconstruction Engine.
 * 
 * EVOLUTION:
 * • DISSECTION: The source image is destroyed; only dots convey the visual.
 * • HARDWARE: A dark sub-pixel grid acts as the substrate.
 * • PRECISION: Ultra-sharp SDF edges (no blurry halos).
 */

const circSDF = (localPos: any, radius: any) => {
  // Ultra-fine AA for sharp "punchy" dots
  const aa = float(0.005)
  return smoothstep(radius.add(aa), radius.sub(aa), length(localPos))
}

const squareSDF = (localPos: any, radius: any) => {
  const aa = float(0.005)
  const d = localPos.x.abs().max(localPos.y.abs())
  return smoothstep(radius.add(aa), radius.sub(aa), d)
}

export const dotMatrixNode = Fn(([
  sourceTex,
  vUv,
  uSpacing,
  uDotSize,
  uThreshold,
  uDotShape,
  uPattern,
  uMotionMode,
  uSpeed,
  uStrength,
  uPatScale,
  uMotionAngle,
  uDotW,
  uDotH,
  uTime,
]: any[]) => {

  // ── 1. HARDWARE GRID SETUP ─────────────────────────────────────────────────
  const invSpacing    = float(1.0).div(uSpacing.clamp(0.005, 0.2))
  const gridUv        = vUv.mul(invSpacing)
  const cellIndex     = gridUv.floor()
  const cellUv        = gridUv.fract()

  // ── 2. DATA ACQUISITION (SIGNAL) ───────────────────────────────────────────
  const cellCenterUv  = cellIndex.add(float(0.5)).mul(uSpacing)
  const srcCell       = texture(sourceTex, cellCenterUv.clamp(0.0, 1.0))

  // Precision Luminance calculate
  const luma = srcCell.r.mul(0.2126).add(srcCell.g.mul(0.7152)).add(srcCell.b.mul(0.0722))
  
  // Refined content threshold (hard cut for deterministic look)
  const contentMask = step(uThreshold, luma.add(srcCell.a.mul(0.1)))

  // ── 3. PATTERN LOGIC ───────────────────────────────────────────────────────
  const checkerEven = step(cellIndex.x.add(cellIndex.y).mul(0.5).fract(), float(0.25))
  const vertEven    = step(cellIndex.x.mul(0.5).fract(), float(0.25))
  const horizEven   = step(cellIndex.y.mul(0.5).fract(), float(0.25))

  const patMask = equal(uPattern, 0).select(float(1.0),
    equal(uPattern, 1).select(checkerEven,
    equal(uPattern, 2).select(vertEven,
    horizEven)))

  // ── 4. REFINED SIZING (NO "FAT/CRUDE" LOOK) ────────────────────────────────
  // We use a power curve for more elegant size response
  const refinedLuma = pow(luma, 1.2)
  const baseR       = uDotSize.mul(float(0.48)).mul(refinedLuma.mul(0.75).add(0.25))
  const amp         = uStrength.mul(0.12)

  const pulseR = baseR.add(amp.mul(sin(uSpeed.mul(uTime))))
  const waveP  = cellIndex.x.add(cellIndex.y).mul(uPatScale.mul(0.5))
  const waveR  = baseR.add(amp.mul(sin(uSpeed.mul(uTime).sub(waveP))))

  // Random flicker with high-frequency noise
  const tStep  = uTime.mul(uSpeed).mul(1.5).floor()
  const rndKey = cellIndex.add(vec2(tStep.mul(7.31), tStep.mul(3.17)))
  const randR  = baseR.add(amp.mul(hash2(rndKey).x.mul(2.0).sub(1.0)))

  const motionR = equal(uMotionMode, 1).select(pulseR,
    equal(uMotionMode, 2).select(waveR,
    equal(uMotionMode, 3).select(randR,
    baseR)))
  
  const finalR = motionR.clamp(float(0.01), float(0.49))

  // ── 5. MOTION VECTOR (SWIRL/SLIDE) ─────────────────────────────────────────
  const orb      = uStrength.mul(0.18)
  const swirlCtr = vec2(
    float(0.5).add(cos(uSpeed.mul(uTime)).mul(orb)),
    float(0.5).add(sin(uSpeed.mul(uTime)).mul(orb))
  )
  const slideT   = uSpeed.mul(uTime).mul(0.12).fract()
  const slideUv  = cellUv.add(
    vec2(cos(uMotionAngle).mul(slideT), sin(uMotionAngle).mul(slideT))
  ).fract()

  const activeCellUv = equal(uMotionMode, 5).select(slideUv, cellUv)
  const dotCtr       = equal(uMotionMode, 4).select(swirlCtr, vec2(0.5, 0.5))

  // ── 6. GEOMETRY PROVISON ──────────────────────────────────────────────────
  const delta   = activeCellUv.sub(dotCtr)
  const asDelta = vec2(delta.x.div(uDotW.clamp(0.1, 4.0)), delta.y.div(uDotH.clamp(0.1, 4.0)))

  const circMask  = circSDF(asDelta, finalR)
  const sqMask    = squareSDF(asDelta, finalR)
  const shapeMask = equal(uDotShape, 0).select(circMask, sqMask)

  const finalDotMask = shapeMask.mul(patMask).mul(contentMask)

  // ── 7. THE HARDWARE SUBSTRATE (BACKGROUND) ─────────────────────────────────
  // A subtle grid that feels like a physical panel
  const gridLines = abs(cellUv.sub(0.5)).mul(2.0).pow(10.0)
  const gridGrain = gridLines.x.add(gridLines.y).clamp(0, 1).mul(0.15)
  // Transparent base but darker, to simulate the panel depth
  const hardwareBase = vec4(vec3(0.02).add(gridGrain), srcCell.a.mul(0.6))

  // ── 8. DETERMINISTIC COLOR RECONSTRUCTION ──────────────────────────────────
  // Saturation and vibrance boost for the "emissive" look
  const satF = float(1.45)
  const dR   = clamp(luma.add(srcCell.r.sub(luma).mul(satF)), 0, 1)
  const dG   = clamp(luma.add(srcCell.g.sub(luma).mul(satF)), 0, 1)
  const dB   = clamp(luma.add(srcCell.b.sub(luma).mul(satF)), 0, 1)
  const dotColor = vec4(dR, dG, dB, srcCell.a)

  // RECONSTRUCTION: The original srcPixel is NOT used as bg.
  // Only the hardware base and the dots exist.
  return mix(hardwareBase, dotColor, finalDotMask)
})
