import {
  Fn, vec2, vec4, float, texture,
  length, smoothstep, mix, cos, sin, clamp
} from 'three/tsl'

/**
 * Halftone Node — image-reactive pointillist / screen-printing simulation
 *
 * Mode 0 — Mono Pointillist
 *   Source image background + luminance-driven dot radius + vivid cell-center color.
 *   Bright area → large colorful dot; dark area → small or no dot.
 *   Dots are NOT on black — the image is always visible between them.
 *
 * Mode 1 — CMYK Offset Print
 *   Four rotated grids at classic screen angles (K45°, C15°, M75°, Y0°).
 *   UCR separation, subtractive compositing on white. Traditional print simulation.
 */

// Rotate UV, snap to cell center, back-rotate to sample source at the center.
// Returns the cell-center colour and the pixel's position within its cell.
const gridSample = (tex: any, vUv: any, spacing: any, angle: any) => {
  const cosA = cos(angle)
  const sinA = sin(angle)

  const rotUv = vec2(
    vUv.x.mul(cosA).sub(vUv.y.mul(sinA)),
    vUv.x.mul(sinA).add(vUv.y.mul(cosA)),
  )

  const scaled   = rotUv.div(spacing)
  const cell     = scaled.floor()
  const localPos = scaled.fract().sub(float(0.5))

  const cRot = cell.add(float(0.5)).mul(spacing)
  const cUv  = vec2(
    cRot.x.mul(cosA).add(cRot.y.mul(sinA.negate())),
    cRot.x.mul(sinA).add(cRot.y.mul(cosA)),
  )

  return { s: texture(tex, cUv.clamp(0, 1)), localPos }
}

// Anti-aliased circular dot coverage — 1 inside, 0 outside, smooth edge.
const dotCoverage = (channelVal: any, dotSize: any, localPos: any) => {
  const radius = channelVal.mul(float(0.5)).mul(dotSize)
  const aa     = float(0.012)
  return smoothstep(radius.add(aa), radius.sub(aa), length(localPos))
}

export const halftoneNode = Fn(([
  tex,       // source texture
  vUv,       // Y-corrected UV (matches engine/overlay convention)
  spacing,   // cell size in UV space  — smaller = more dots, finer grid
  dotSize,   // dot scale multiplier   — controls max dot radius
  angle,     // base grid angle (radians)
  mode,      // 0 = mono pointillist, 1 = CMYK offset print
]: any[]) => {

  // ── Background: source image at the current pixel ────────────────────────
  // Dots sit ON TOP of the image — no black void between them.
  const bg = texture(tex, vUv)

  // ── MODE 0: Mono Pointillist ─────────────────────────────────────────────
  const { s: s0, localPos: lp0 } = gridSample(tex, vUv, spacing, angle)

  // Rec.709 luma at cell center → dot radius
  const luma0 = s0.r.mul(0.2126).add(s0.g.mul(0.7152)).add(s0.b.mul(0.0722))
  const cov0  = dotCoverage(luma0, dotSize, lp0)

  // Vivid dot color: cell-center RGB with a 30% saturation boost
  const satF  = float(1.3)
  const lumaS = s0.r.mul(0.299).add(s0.g.mul(0.587)).add(s0.b.mul(0.114))
  const vR    = clamp(lumaS.add(s0.r.sub(lumaS).mul(satF)), float(0), float(1))
  const vG    = clamp(lumaS.add(s0.g.sub(lumaS).mul(satF)), float(0), float(1))
  const vB    = clamp(lumaS.add(s0.b.sub(lumaS).mul(satF)), float(0), float(1))

  // Mix: outside dot → source image; inside dot → vivid cell color
  const monoOut = mix(bg, vec4(vR, vG, vB, s0.a), cov0)

  // ── MODE 1: CMYK Offset Print ────────────────────────────────────────────
  // Four independent rotated grids at traditional screen angles.
  const { s: sK, localPos: lpK } = gridSample(tex, vUv, spacing, angle.add(float(0.7854)))
  const { s: sC, localPos: lpC } = gridSample(tex, vUv, spacing, angle.add(float(0.2618)))
  const { s: sM, localPos: lpM } = gridSample(tex, vUv, spacing, angle.add(float(1.3090)))
  const { s: sY, localPos: lpY } = gridSample(tex, vUv, spacing, angle)

  // UCR separation: K absorbs shadow density, CMY carry chromatic remainder
  const kVal = float(1).sub(sK.r.max(sK.g).max(sK.b))
  const cVal = sC.r.max(sC.g).max(sC.b).sub(sC.r).max(0)
  const mVal = sM.r.max(sM.g).max(sM.b).sub(sM.g).max(0)
  const yVal = sY.r.max(sY.g).max(sY.b).sub(sY.b).max(0)

  const covK = dotCoverage(kVal, dotSize,           lpK)
  const covC = dotCoverage(cVal, dotSize.mul(0.85), lpC)
  const covM = dotCoverage(mVal, dotSize.mul(0.85), lpM)
  const covY = dotCoverage(yVal, dotSize.mul(0.85), lpY)

  // Subtractive compositing on white paper
  const one  = float(1)
  const outR = one.sub(covC).mul(one.sub(covK))
  const outG = one.sub(covM).mul(one.sub(covK))
  const outB = one.sub(covY).mul(one.sub(covK))

  const cmykOut = vec4(outR, outG, outB, sK.a)

  return mode.equal(1).select(cmykOut, monoOut)
})
