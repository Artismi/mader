import {
  Fn, vec2, vec3, vec4, float, texture,
  sin, cos, abs, clamp,
  smoothstep, mix, length, equal
} from 'three/tsl'

/**
 * Chladni Particle Field Node
 *
 * Particles accumulate on the nodal lines of a vibrating plate:
 *   f(x,y) = cos(m·π·x)·cos(n·π·y) − cos(n·π·x)·cos(m·π·y) ≈ 0
 *
 * Image reactivity: particle OPACITY is modulated by the image luminance at
 * the particle origin — particles are vivid where the image is bright and
 * fade out in dark areas, so the effect reads the image rather than ignoring it.
 *
 * The SOURCE IMAGE is ALWAYS the background.
 * Particles sit on top without erasing the content beneath them.
 *
 * Color modes:
 *   uUseSourceColor = 0 → solid uColor tint (still image-luminance modulated)
 *   uUseSourceColor = 1 → image color sampled at particle origin (vivid, image-aware)
 */

const chladniField = (p: any, m: any, n: any) => {
  const PI  = float(3.14159265358979)
  const mpi = m.mul(PI)
  const npi = n.mul(PI)
  return cos(mpi.mul(p.x)).mul(cos(npi.mul(p.y)))
        .sub(cos(npi.mul(p.x)).mul(cos(mpi.mul(p.y))))
}

export const chladniNode = Fn(([
  sourceTex,
  vUv,
  uM,
  uN,
  uDensity,
  uParticleSize,
  uSettle,
  uSpeed,
  uIntensity,
  uColor,
  uUseSourceColor,
  uTime,
]: any[]) => {

  // ── Topological Distortion (Chladni Vector Field) ──────────────────────────
  const eps = float(0.01)
  const fC  = chladniField(vUv, uM, uN)
  const fPx = chladniField(vec2(vUv.x.add(eps), vUv.y), uM, uN)
  const fPy = chladniField(vec2(vUv.x, vUv.y.add(eps)), uM, uN)
  
  const gx = fPx.sub(fC).div(eps)
  const gy = fPy.sub(fC).div(eps)
  
  const oscillate = sin(uTime.mul(uSpeed)).mul(0.5).add(0.5)
  // uIntensity modula quanto le coordinate UV si "storgono" verso le onde
  const warpForce = uIntensity.mul(0.05).mul(uSettle).mul(oscillate)
  const warpedUv  = vec2(vUv.x.add(gx.mul(warpForce)), vUv.y.add(gy.mul(warpForce)))
  
  // ── Quantum Halftone Grid ────────────────────────────────────────────────
  const invD      = float(1.0).div(uDensity.clamp(float(0.001), float(0.5)))
  const gridUv    = warpedUv.mul(invD)
  const cellIndex = gridUv.floor()
  const cellUv    = gridUv.fract()
  
  // Mappatura UV corretta per estrarre l'immagine
  const originSampleUv = cellIndex.add(vec2(0.5)).div(invD)
  const srcAtOrigin    = texture(sourceTex, originSampleUv.clamp(float(0.0), float(1.0)))
  const luma           = srcAtOrigin.r.mul(0.2126).add(srcAtOrigin.g.mul(0.7152)).add(srcAtOrigin.b.mul(0.0722))
  
  // ── Luma-Driven Scale (Supreme Quality Halftone) ─────────────────────────
  // Nelle ombre (luma = 0) il punto è enorme (uParticleSize)
  // Nelle luci (luma = 1) il punto scompare
  const baseRadius = uParticleSize.mul(0.75) // .75 fa toccare i punti nei neri densi
  const dotRadius  = mix(baseRadius, float(0.0), luma)
  
  const dist = length(cellUv.sub(vec2(0.5)))
  const aa   = float(0.015)
  const dotMask = smoothstep(dotRadius.add(aa), dotRadius.sub(aa), dist)
  
  // ── Color & Compositing ──────────────────────────────────────────────────
  const satF = float(1.5)
  const srcR = clamp(luma.add(srcAtOrigin.r.sub(luma).mul(satF)), float(0), float(1))
  const srcG = clamp(luma.add(srcAtOrigin.g.sub(luma).mul(satF)), float(0), float(1))
  const srcB = clamp(luma.add(srcAtOrigin.b.sub(luma).mul(satF)), float(0), float(1))
  
  const dotColor = equal(uUseSourceColor, 1).select(
    vec4(srcR, srcG, srcB, float(1.0)),
    uColor
  )
  
  // Manteniamo la trasparenza (alpha) dell'oggetto originale
  const srcColor = texture(sourceTex, vUv)
  // Se vogliamo non distruggere, "sfondiamo" l'immagine non con nero ma con la foto stessa scolorita o trasparente.
  // Un "pornographic" design blend: manteniamo un leggero tint dello sfondo
  const paperColor = mix(srcColor.rgb, vec3(1.0), float(0.9)) // Sfondo quasi bianco ma con ghosting
  
  // Se è in modalità vettoriale/inchiostro puro, mixiamo i punti sopra.
  const finalRgb = mix(paperColor, dotColor.rgb, dotMask)
  
  return vec4(finalRgb, srcColor.a)
})
