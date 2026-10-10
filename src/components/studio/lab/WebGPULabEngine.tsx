'use client'

import React, { useRef, useEffect } from 'react'
import * as THREE from 'three/webgpu'
import { useLabStore } from '../hooks/use-lab-store'
import {
  texture, uniform, vec4, vec2, float, uv, mix
} from 'three/tsl'
import { crtDistort, crtColorEffect }    from './nodes/crt-node'
import { ditherNode }                    from './nodes/dither-node'
import { liquidDistort }                 from './nodes/liquid-node'
import { vhsDistort, vhsColorEffect }    from './nodes/vhs-node'
import { glitchDistort }                 from './nodes/glitch-node'
import { opticalFlowBlur, cinemaDither } from './nodes/motion-node'
import { bloomPass }                     from './nodes/bloom-node'
import { patternNode }                   from './nodes/pattern-node'
import { halftoneNode }                  from './nodes/halftone-node'
import { colorGradeNode }                from './nodes/color-grade-node'
import { dotMatrixNode }                 from './nodes/dot-matrix-node'
import { chladniNode }                   from './nodes/chladni-node'
import { thresholdNode }                 from './nodes/threshold-node'
import { gaussianNoiseNode }             from './nodes/noise-node'
import { fogPointcloudNode }             from './nodes/fog-node'

interface Props {
  fabricCanvas: any
  className?: string
  onReady?: () => void
}

/**
 * WebGPU Lab Engine — Artboard Mode
 *
 * Full-canvas single-pass post-processing. Captures the Fabric canvas as a
 * texture and renders it back with all enabled Lab effects applied. Positioned
 * as a pointer-events:none overlay so Fabric still receives all input.
 *
 * Only mounts when filterTarget === 'artboard'. Object-mode per-object overlays
 * are handled by WebGPUObjectOverlay (creative-studio.tsx).
 */
export function WebGPULabEngine({ fabricCanvas, className, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rendererRef  = useRef<THREE.WebGPURenderer | null>(null)
  const onReadyRef   = useRef(onReady)
  useEffect(() => { onReadyRef.current = onReady }, [onReady])

  const labActive    = useLabStore(s => s.labActive)
  const filterTarget = useLabStore(s => s.filterTarget)

  useEffect(() => {
    if (!fabricCanvas || !canvasRef.current) return
    if (!labActive || filterTarget !== 'artboard') return

    let renderer: THREE.WebGPURenderer
    let mainTarget: THREE.RenderTarget
    let src: THREE.CanvasTexture
    let mat: THREE.MeshBasicNodeMaterial | undefined
    let bloomMat: THREE.MeshBasicNodeMaterial | undefined
    let planeGeo: THREE.PlaneGeometry | undefined

    // ── Uniforms ────────────────────────────────────────────────────────────
    const U = {
      crtDistortion:        uniform(0),
      crtMaskScale:         uniform(6),
      crtMaskIntensity:     uniform(0),
      crtScanlineIntensity: uniform(0),
      crtBrightness:        uniform(1),
      liquidIntensity:      uniform(0),
      liquidViscosity:      uniform(0.4),
      liquidComplexity:     uniform(3),
      vhsIntensity:         uniform(0),
      vhsTracking:          uniform(0.5),
      vhsBleed:             uniform(0.5),
      glitchAmount:         uniform(0),
      glitchSeed:           uniform(0),
      ditherMode:           uniform(-1),
      ditherColorDepth:     uniform(8),
      uVelocity:            uniform(new THREE.Vector2(0, 0)),
      motionBlurIntensity:  uniform(0),
      cinemaDitherAmt:      uniform(0),
      chromaticAberration:  uniform(0),
      selectionRect:        uniform(new THREE.Vector4(0, 0, 1, 1)),
      selectionActive:      uniform(0),
      selectionFeather:     uniform(0.02),
      patternEnabled:       uniform(0),
      patternType:          uniform(0),
      patternScale:         uniform(50),
      patternThickness:     uniform(0.2),
      patternBlend:         uniform(0),
      halftoneEnabled:      uniform(0),
      halftoneSpacing:      uniform(0.025),
      halftoneDotSize:      uniform(1.0),
      halftoneAngle:        uniform(0),
      halftoneMode:         uniform(0),
      dotMatrixEnabled:     uniform(0),
      dotMatrixSpacing:     uniform(0.04),
      dotMatrixDotSize:     uniform(0.7),
      dotMatrixThreshold:   uniform(0.05),
      dotMatrixShape:       uniform(0),
      dotMatrixPattern:     uniform(0),
      dotMatrixMotion:      uniform(0),
      dotMatrixSpeed:       uniform(1.0),
      dotMatrixStrength:    uniform(0.5),
      dotMatrixPatScale:    uniform(1.0),
      dotMatrixAngle:       uniform(0),
      dotMatrixDotW:        uniform(1.0),
      dotMatrixDotH:        uniform(1.0),
      chladniEnabled:       uniform(0),
      chladniM:             uniform(3),
      chladniN:             uniform(2),
      chladniDensity:       uniform(0.03),
      chladniParticleSize:  uniform(0.25),
      chladniSettle:        uniform(0.85),
      chladniSpeed:         uniform(1.0),
      chladniIntensity:     uniform(0.9),
      chladniUseSourceColor: uniform(0),
      thresholdEnabled:     uniform(0),
      thresholdValue:       uniform(0.5),
      thresholdSmoothing:   uniform(0.1),
      noiseEnabled:         uniform(0),
      noiseIntensity:       uniform(0.1),
      noiseMonochrome:      uniform(1),
      fogEnabled:           uniform(0),
      fogDensity:           uniform(0.5),
      fogOscillation:       uniform(0.5),
      fogDepth:             uniform(0.5),
      fogLuminescence:      uniform(0.8),
      fogPointScale:        uniform(1.0),
      gradeExposure:        uniform(0),
      gradeContrast:        uniform(1),
      gradeSaturation:      uniform(1),
      gradeVibrance:        uniform(0),
      gradeTemperature:     uniform(0),
      gradeHue:             uniform(0),
      gradeToneMap:         uniform(0),
    }
    const uTime         = uniform(0)
    const uBloom        = uniform(0)
    const uBloomTh      = uniform(0.1)
    const uBloomRad     = uniform(0.025)
    const uPatColor     = uniform(new THREE.Color(0x33ff55))
    const uChladniColor = uniform(new THREE.Color(0xffffff))

    // ── Push store state into uniforms ───────────────────────────────────────
    const pushUniforms = (s: any) => {
      U.crtDistortion.value        = s.crtEnabled ? s.crtDistortion : 0
      U.crtMaskScale.value         = s.crtMaskScale
      U.crtMaskIntensity.value     = s.crtEnabled ? s.crtMaskIntensity : 0
      U.crtScanlineIntensity.value = s.crtEnabled ? s.crtScanlineIntensity : 0
      U.crtBrightness.value        = s.crtBrightness
      U.liquidIntensity.value      = s.liquidEnabled ? s.liquidIntensity : 0
      U.liquidViscosity.value      = s.liquidViscosity
      U.liquidComplexity.value     = s.liquidComplexity
      U.vhsIntensity.value         = s.vhsEnabled ? s.vhsIntensity : 0
      U.vhsBleed.value             = s.vhsBleed
      U.vhsTracking.value          = s.vhsTracking
      U.glitchAmount.value         = s.glitchEnabled ? s.glitchAmount : 0
      U.glitchSeed.value           = s.glitchSeed
      U.ditherMode.value           = s.ditherEnabled ? s.ditherMode : -1
      U.ditherColorDepth.value     = s.ditherColorDepth
      U.motionBlurIntensity.value  = s.motionBlurEnabled ? s.motionBlurIntensity : 0
      U.cinemaDitherAmt.value      = s.cinemaDitherEnabled ? 1 : 0
      U.chromaticAberration.value  =
        (s.vhsEnabled    ? s.vhsIntensity * 0.003 : 0) +
        (s.glitchEnabled ? s.glitchAmount  * 0.004 : 0)
      uBloom.value    = s.bloomEnabled ? s.bloomIntensity : 0
      uBloomTh.value  = s.bloomThreshold
      uBloomRad.value = s.bloomRadius * 0.025
      U.patternEnabled.value   = s.patternEnabled ? 1 : 0
      U.patternType.value      = s.patternType
      U.patternScale.value     = s.patternScale
      U.patternThickness.value = s.patternThickness
      U.patternBlend.value     = s.patternBlendMode
      if (s.patternEnabled) uPatColor.value.setStyle(s.patternColor)
      U.halftoneEnabled.value  = s.halftoneEnabled ? 1 : 0
      U.halftoneSpacing.value  = s.halftoneSpacing
      U.halftoneDotSize.value  = s.halftoneDotSize
      U.halftoneAngle.value    = s.halftoneAngle
      U.halftoneMode.value     = s.halftoneMode
      U.dotMatrixEnabled.value    = s.dotMatrixEnabled ? 1 : 0
      U.dotMatrixSpacing.value    = s.dotMatrixSpacing
      U.dotMatrixDotSize.value    = s.dotMatrixDotSize
      U.dotMatrixThreshold.value  = s.dotMatrixThreshold
      U.dotMatrixShape.value      = s.dotMatrixShape
      U.dotMatrixPattern.value    = s.dotMatrixPattern
      U.dotMatrixMotion.value     = s.dotMatrixMotion
      U.dotMatrixSpeed.value      = s.dotMatrixSpeed
      U.dotMatrixStrength.value   = s.dotMatrixStrength
      U.dotMatrixPatScale.value   = s.dotMatrixPatScale
      U.dotMatrixAngle.value      = s.dotMatrixAngle
      U.dotMatrixDotW.value       = s.dotMatrixDotW
      U.dotMatrixDotH.value       = s.dotMatrixDotH
      U.chladniEnabled.value        = s.chladniEnabled ? 1 : 0
      U.chladniM.value              = s.chladniM
      U.chladniN.value              = s.chladniN
      U.chladniDensity.value        = s.chladniDensity
      U.chladniParticleSize.value   = s.chladniParticleSize
      U.chladniSettle.value         = s.chladniSettle
      U.chladniSpeed.value          = s.chladniSpeed
      U.chladniIntensity.value      = s.chladniIntensity
      U.chladniUseSourceColor.value = s.chladniUseSourceColor ? 1 : 0
      if (s.chladniEnabled) uChladniColor.value.setStyle(s.chladniColor)
      U.thresholdEnabled.value   = s.thresholdEnabled ? 1 : 0
      U.thresholdValue.value     = s.thresholdValue
      U.thresholdSmoothing.value = s.thresholdSmoothing
      U.noiseEnabled.value       = s.noiseEnabled ? 1 : 0
      U.noiseIntensity.value     = s.noiseIntensity
      U.noiseMonochrome.value    = s.noiseMonochrome ? 1 : 0
      U.fogEnabled.value         = s.fogEnabled ? 1 : 0
      U.fogDensity.value         = s.fogDensity
      U.fogOscillation.value     = s.fogOscillation
      U.fogDepth.value           = s.fogDepth
      U.fogLuminescence.value    = s.fogLuminescence
      U.fogPointScale.value      = s.fogPointScale
      U.gradeExposure.value    = s.colorGradeEnabled ? s.gradeExposure    : 0
      U.gradeContrast.value    = s.colorGradeEnabled ? s.gradeContrast    : 1
      U.gradeSaturation.value  = s.colorGradeEnabled ? s.gradeSaturation  : 1
      U.gradeVibrance.value    = s.colorGradeEnabled ? s.gradeVibrance    : 0
      U.gradeTemperature.value = s.colorGradeEnabled ? s.gradeTemperature : 0
      U.gradeHue.value         = s.colorGradeEnabled ? s.gradeHue         : 0
      U.gradeToneMap.value     = s.colorGradeEnabled ? s.gradeToneMap     : 0
      U.selectionActive.value      = s.selectionActive ? 1 : 0
      if (s.selectionActive) U.selectionRect.value.fromArray(s.selectionRect)
      U.selectionFeather.value     = s.selectionFeather
    }

    // ── WebGPU init ──────────────────────────────────────────────────────────
    const init = async () => {
      try {
        renderer = new THREE.WebGPURenderer({
          canvas: canvasRef.current!,
          antialias: true,
          alpha: true,
          forceWebGL: false,
        })
      } catch (e) { console.error('[LabEngine] init failed:', e); return }

      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.setClearColor(0x000000, 0)
      renderer.autoClear = false
      try { await renderer.init() } catch (e) { console.error('[LabEngine] renderer.init:', e); return }
      rendererRef.current = renderer

      const cw = fabricCanvas.getWidth?.() ?? canvasRef.current!.clientWidth
      const ch = fabricCanvas.getHeight?.() ?? canvasRef.current!.clientHeight
      renderer.setSize(cw, ch)

      mainTarget = new THREE.RenderTarget(cw, ch, { type: THREE.HalfFloatType })
      const scene  = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

      // flipY=false: WebGPU UV (0,0)=top-left matches canvas (0,0)=top-left.
      // We flip Y manually in the shader so all downstream effect nodes get it right.
      src = new THREE.CanvasTexture(fabricCanvas.lowerCanvasEl)
      src.flipY = false
      src.minFilter = THREE.LinearFilter
      src.magFilter = THREE.LinearFilter

      // ── Shader graph ────────────────────────────────────────────────────────
      const vUv = vec2(uv().x, float(1).sub(uv().y))
      let dUv = vUv

      dUv = liquidDistort(dUv, uTime, U.liquidIntensity, U.liquidViscosity, U.liquidComplexity, U.selectionRect, U.selectionActive, U.selectionFeather)
      dUv = glitchDistort(dUv, uTime, U.glitchAmount, U.glitchSeed, U.selectionRect, U.selectionActive, U.selectionFeather)
      dUv = vhsDistort(dUv, uTime, U.vhsIntensity, U.vhsTracking, U.selectionRect, U.selectionActive, U.selectionFeather)
      dUv = crtDistort(dUv, U.crtDistortion, U.selectionRect, U.selectionActive, U.selectionFeather)

      const rCh    = texture(src, dUv.add(vec2(U.chromaticAberration, float(0)))).r
      const gCh    = texture(src, dUv).g
      const bCh    = texture(src, dUv.sub(vec2(U.chromaticAberration, float(0)))).b
      const sampled = vec4(rCh, gCh, bCh, texture(src, dUv).a)
      let fc = vec4(sampled.rgb, sampled.a)

      fc = vhsColorEffect(src, fc, dUv, uTime, U.vhsIntensity, U.vhsBleed)
      const halftoned = halftoneNode(src, vUv, U.halftoneSpacing, U.halftoneDotSize, U.halftoneAngle, U.halftoneMode)
      fc = mix(fc, halftoned, U.halftoneEnabled)
      fc = colorGradeNode(fc, U.gradeExposure, U.gradeContrast, U.gradeSaturation, U.gradeVibrance, U.gradeTemperature, U.gradeHue, U.gradeToneMap)
      fc = crtColorEffect(fc, dUv, uTime, U.crtMaskScale, U.crtMaskIntensity, U.crtScanlineIntensity, U.crtBrightness, U.selectionRect, U.selectionActive, U.selectionFeather)
      fc = ditherNode(fc, U.ditherMode, U.ditherColorDepth)
      const blurred = opticalFlowBlur(src, dUv, U.uVelocity, U.motionBlurIntensity)
      fc = mix(fc, blurred, U.motionBlurIntensity.mul(0.5))
      fc = cinemaDither(fc, uTime, U.cinemaDitherAmt)

      const patResult = patternNode(uTime, U.patternScale, U.patternThickness, U.patternType, vec4(uPatColor, float(1)), U.patternBlend, fc)
      fc = mix(fc, patResult, U.patternEnabled)

      const dmResult = dotMatrixNode(src, vUv, U.dotMatrixSpacing, U.dotMatrixDotSize, U.dotMatrixThreshold, U.dotMatrixShape, U.dotMatrixPattern, U.dotMatrixMotion, U.dotMatrixSpeed, U.dotMatrixStrength, U.dotMatrixPatScale, U.dotMatrixAngle, U.dotMatrixDotW, U.dotMatrixDotH, uTime)
      fc = mix(fc, dmResult, U.dotMatrixEnabled)

      const chResult = chladniNode(src, vUv, U.chladniM, U.chladniN, U.chladniDensity, U.chladniParticleSize, U.chladniSettle, U.chladniSpeed, U.chladniIntensity, vec4(uChladniColor, float(1)), U.chladniUseSourceColor, uTime)
      fc = mix(fc, chResult, U.chladniEnabled)

      const threshResult = thresholdNode(fc, U.thresholdValue, U.thresholdSmoothing)
      fc = mix(fc, threshResult, U.thresholdEnabled)
      
      const fogResult = fogPointcloudNode(src, fc, vUv, uTime, U.fogDensity, U.fogOscillation, U.fogDepth, U.fogLuminescence, U.fogPointScale)
      fc = mix(fc, fogResult, U.fogEnabled)
      
      const noiseResult = gaussianNoiseNode(fc, vUv, uTime, U.noiseIntensity, U.noiseMonochrome)
      fc = mix(fc, noiseResult, U.noiseEnabled)

      const colorNode = vec4(fc.rgb, sampled.a)

      let effectMesh: THREE.Mesh
      let bloomMesh: THREE.Mesh
      planeGeo = new THREE.PlaneGeometry(2, 2)
      try {
        mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false })
        mat.colorNode = colorNode
        effectMesh = new THREE.Mesh(planeGeo, mat)
        scene.add(effectMesh)

        // compUv flips Y so the intermediate render target reads top→top (matches IsolationWindow)
        const compUv = vec2(uv().x, float(1).sub(uv().y))
        bloomMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false })
        bloomMat.colorNode = bloomPass(mainTarget.texture, compUv, uBloom, uBloomTh, uBloomRad)
        bloomMesh = new THREE.Mesh(planeGeo, bloomMat)
        bloomMesh.visible = false
        scene.add(bloomMesh)
      } catch (e) { console.error('[LabEngine] scene build:', e); return }

      let didCallReady = false
      let readyFrameCount = 0
      const drawFrame = () => {
        src.needsUpdate = true
        effectMesh.visible = true
        bloomMesh.visible  = false
        renderer.setRenderTarget(mainTarget)
        renderer.setClearAlpha(0)
        renderer.clear()
        renderer.render(scene, camera)
        effectMesh.visible = false
        bloomMesh.visible  = true
        renderer.setRenderTarget(null)
        renderer.setClearAlpha(0)
        renderer.clear()
        renderer.render(scene, camera)
        // Wait for 2 frames so the CanvasTexture is fully uploaded before hiding
        // the Fabric canvas — avoids a one-frame blank flash on activation.
        readyFrameCount++
        if (readyFrameCount >= 2 && !didCallReady) { didCallReady = true; onReadyRef.current?.() }
      }

      const tick = () => {
        const s = useLabStore.getState()
        if (s.animated) uTime.value = s.animTime >= 0 ? s.animTime : (performance.now() / 1000)
        pushUniforms(s)
        drawFrame()
      }

      const startLoop = () => renderer.setAnimationLoop(tick)
      const stopLoop  = () => { renderer.setAnimationLoop(null); tick() }

      // Force Fabric to render NOW so the CanvasTexture captures current content.
      fabricCanvas.requestRenderAll()

      if (useLabStore.getState().animated) startLoop()
      else stopLoop()

      const unsubStore = useLabStore.subscribe((state, prev) => {
        if (state.animated !== prev.animated) {
          state.animated ? startLoop() : stopLoop()
        } else if (!state.animated) {
          tick()
        }
      })
      ;(renderer as any)._unsubStore = unsubStore

      // Re-render whenever Fabric redraws (drag, scale, object add/remove).
      // In animated mode the loop already handles this; in static mode it's the
      // only way to keep the WebGPU output in sync with the live Fabric canvas.
      const onFabricRender = () => { if (!useLabStore.getState().animated) tick() }
      fabricCanvas.on('after:render', onFabricRender)
      ;(renderer as any)._offFabric = () => fabricCanvas.off('after:render', onFabricRender)

      const updateSize = () => {
        if (!containerRef.current || !renderer) return
        const { clientWidth: w, clientHeight: h } = containerRef.current
        renderer.setSize(w, h)
        mainTarget.setSize(w, h)
      }
      window.addEventListener('resize', updateSize)
      ;(renderer as any)._offResize = () => window.removeEventListener('resize', updateSize)
    }

    init()

    return () => {
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null)
        ;(rendererRef.current as any)._unsubStore?.()
        ;(rendererRef.current as any)._offResize?.()
        ;(rendererRef.current as any)._offFabric?.()
        rendererRef.current.dispose()
        rendererRef.current = null
      }
      src?.dispose()
      mainTarget?.dispose()
      mat?.dispose()
      bloomMat?.dispose()
      planeGeo?.dispose()
    }
  }, [fabricCanvas, labActive, filterTarget])

  if (!labActive || filterTarget !== 'artboard') return null

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'absolute', inset: 0, zIndex: 9999, pointerEvents: 'none' }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />
    </div>
  )
}
