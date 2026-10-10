'use client'

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import * as THREE from 'three/webgpu'
import { useLabStore, LAB_FILTER_DEFAULTS } from '../hooks/use-lab-store'
import { dotMatrixNode } from './nodes/dot-matrix-node'
import { chladniNode } from './nodes/chladni-node'
import { thresholdNode }                 from './nodes/threshold-node'
import { gaussianNoiseNode }             from './nodes/noise-node'
import { fogPointcloudNode }             from './nodes/fog-node'
import {
  texture, uniform, vec4, vec3, uv, mix, vec2, float
} from 'three/tsl'
import { crtDistort, crtColorEffect }   from './nodes/crt-node'
import { ditherNode }                   from './nodes/dither-node'
import { liquidDistort }                from './nodes/liquid-node'
import { vhsDistort, vhsColorEffect }   from './nodes/vhs-node'
import { glitchDistort }                from './nodes/glitch-node'
import { opticalFlowBlur, cinemaDither } from './nodes/motion-node'
import { bloomPass }                    from './nodes/bloom-node'
import { patternNode }                  from './nodes/pattern-node'
import { halftoneNode }                 from './nodes/halftone-node'
import { colorGradeNode }               from './nodes/color-grade-node'

interface Props {
  fabricObject: any
  fabricCanvas: any
  onApply?: (dataUrl: string, obj: any) => void
  isSelected?: boolean  // true = read params from global store; false = use obj.labParams (frozen)
}

export interface WebGPUObjectOverlayHandle {
  applyFiltered: () => void
}

interface Rect { left: number; top: number; width: number; height: number }

function getScreenRect(obj: any, canvas: any): Rect {
  const vpt: number[] = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
  const br = obj.getBoundingRect()
  return {
    left:   br.left   * vpt[0] + vpt[4],
    top:    br.top    * vpt[3] + vpt[5],
    width:  br.width  * vpt[0],
    height: br.height * vpt[3],
  }
}

// ... (imports remain the same)

/**
 * WebGPUObjectOverlay — renders Lab shaders on the selected object, directly
 * on the canvas (no modal). The original Fabric object is hidden while this
 * overlay is active; the overlay preserves alpha so transparent areas stay
 * transparent on export.
 */
export const WebGPUObjectOverlay = forwardRef<WebGPUObjectOverlayHandle, Props>(function WebGPUObjectOverlay({ fabricObject, fabricCanvas, onApply, isSelected = true }, ref) {
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const rendererRef   = useRef<THREE.WebGPURenderer | null>(null)
  const onApplyRef    = useRef(onApply)
  const fabricObjRef  = useRef(fabricObject)
  const isSelectedRef = useRef(isSelected)
  const tickRef          = useRef<(() => void) | null>(null)
  const threeDLatchedRef = useRef(false)
  const activeRef        = useRef(true)  // false after cleanup, prevents stale-async updates
  const readyPollRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => { onApplyRef.current = onApply }, [onApply])
  useEffect(() => { fabricObjRef.current = fabricObject }, [fabricObject])
  useEffect(() => { isSelectedRef.current = isSelected }, [isSelected])

  useImperativeHandle(ref, () => ({
    applyFiltered() {
      if (!canvasRef.current || !onApplyRef.current) return
      const dataUrl = canvasRef.current.toDataURL('image/png')
      onApplyRef.current(dataUrl, fabricObjRef.current)
    }
  }), [])

  // ── Track viewport + drive overlay re-render on every Fabric frame (drag) ──
  useEffect(() => {
    if (!fabricCanvas) return
    const onFabricRender = () => {
      setViewport({ width: fabricCanvas.getWidth(), height: fabricCanvas.getHeight() })
      if (tickRef.current && !useLabStore.getState().animated) tickRef.current()
    }
    setViewport({ width: fabricCanvas.getWidth(), height: fabricCanvas.getHeight() })
    fabricCanvas.on('after:render', onFabricRender)
    return () => fabricCanvas.off('after:render', onFabricRender)
  }, [fabricCanvas])

  // ── WebGPU init (once per mount) ───────────────────────────────────────────
  useEffect(() => {
    activeRef.current = true
    if (!canvasRef.current || !fabricCanvas) return

    let renderer: THREE.WebGPURenderer | null = null
    let mainTarget: THREE.RenderTarget | null = null
    let src: THREE.CanvasTexture | null = null
    let currentObjCanvas: HTMLCanvasElement | null = null
    // Intermediate buffer canvas to avoid "Texture already initialized" in WebGPU
    // By keeping it at a fixed large size, the GPU texture memory is allocated once.
    const MAX_TEX_SIZE = 4096
    let intermediateCanvas = document.createElement('canvas')
    intermediateCanvas.width = MAX_TEX_SIZE
    intermediateCanvas.height = MAX_TEX_SIZE
    let ctxIntermediate = intermediateCanvas.getContext('2d', { willReadFrequently: true })
    let mat: THREE.MeshBasicNodeMaterial | undefined
    let bloomMat: THREE.MeshBasicNodeMaterial | undefined
    let planeGeo: THREE.PlaneGeometry | undefined
    let scene: THREE.Scene | null = null
    let camera: THREE.OrthographicCamera | null = null
    let effectMesh: THREE.Mesh | null = null
    let bloomMesh: THREE.Mesh | null = null
    let animationId: any = null

    const cleanupCore = () => {
      if (renderer) {
        renderer.setAnimationLoop(null)
        ;(renderer as any)._unsubStore?.()
        ;(renderer as any)._cleanupEvents?.()
        renderer.dispose()
        renderer = null
      }
      if (src) { src.dispose(); src = null }
      if (mainTarget) { mainTarget.dispose(); mainTarget = null }
      if (mat) { mat.dispose(); mat = undefined }
      if (bloomMat) { bloomMat.dispose(); bloomMat = undefined }
      if (planeGeo) { planeGeo.dispose(); planeGeo = undefined }
      scene = null
      camera = null
      effectMesh = null
      bloomMesh = null
    }

    const NO_SEL = new THREE.Vector4(0, 0, 1, 1)

    const uTexScale = uniform(vec2(1.0, 1.0))

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
      selectionRect:        uniform(NO_SEL),
      selectionActive:      uniform(0),
      selectionFeather:     uniform(0.01),
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

    const init = async () => {
      if (!activeRef.current) return
      cleanupCore()

      const vptW = fabricCanvas.getWidth()
      const vptH = fabricCanvas.getHeight()
      if (!vptW || !vptH) return

      const store = useLabStore.getState()
      const s = isSelectedRef.current ? store : ((fabricObjRef.current as any).labParams ?? LAB_FILTER_DEFAULTS)

      const objAny = fabricObjRef.current as any
      let threeDCanvas = objAny._threeDCanvas as HTMLCanvasElement | undefined
      const hasThreeDCanvas = !!threeDCanvas && threeDCanvas.width > 0 && threeDCanvas.height > 0 && !!objAny._threeDReady
      const is3DMode = !!(s.threeDEnabled && hasThreeDCanvas)

      currentObjCanvas = fabricObject.toCanvasElement({ multiplier: 2 }) as HTMLCanvasElement
      if (!currentObjCanvas || currentObjCanvas.width === 0) return

      const targetCanvas = is3DMode ? threeDCanvas! : currentObjCanvas
      ctxIntermediate!.clearRect(0, 0, MAX_TEX_SIZE, MAX_TEX_SIZE)
      ctxIntermediate!.drawImage(targetCanvas, 0, 0)
      uTexScale.value.set(targetCanvas.width / MAX_TEX_SIZE, targetCanvas.height / MAX_TEX_SIZE)

      // Try native WebGPU first; fall back to WebGL if unavailable (most browsers/Electron builds)
      const tryRenderer = async (forceWebGL: boolean): Promise<THREE.WebGPURenderer | null> => {
        try {
          const r = new THREE.WebGPURenderer({
            canvas: canvasRef.current!,
            antialias: true,
            alpha: true,
            forceWebGL,
          })
          await r.init()
          return r
        } catch {
          return null
        }
      }

      renderer = await tryRenderer(false)          // native WebGPU
      if (!renderer) renderer = await tryRenderer(true)  // WebGL fallback

      if (!activeRef.current) { cleanupCore(); return }
      if (!renderer) {
        if (activeRef.current) setError('GPU non disponibile (WebGPU/WebGL entrambi falliti)')
        return
      }

      const pixelRatio = window.devicePixelRatio || 1
      renderer.setPixelRatio(pixelRatio)
      renderer.setClearColor(0x000000, 0)
      renderer.autoClear = true

      if (!activeRef.current || !renderer) { cleanupCore(); return }
      renderer.setSize(vptW, vptH)
      rendererRef.current = renderer

      mainTarget = new THREE.RenderTarget(vptW * pixelRatio, vptH * pixelRatio, { type: THREE.HalfFloatType })
      scene  = new THREE.Scene()
      camera = new THREE.OrthographicCamera(0, vptW, 0, vptH, -1000, 1000)

      src = new THREE.CanvasTexture(intermediateCanvas)
      src.flipY = false
      src.minFilter = THREE.LinearFilter
      src.magFilter = THREE.LinearFilter

      // ── Shader graph ──────────────────────────────────────────────────────
      // Scale UVs to read only the populated area of the 4096x4096 buffer
      const scaledUvX = uv().x.mul(uTexScale.x)
      const scaledUvY = float(1).sub(uv().y).mul(uTexScale.y)
      const vUv = vec2(scaledUvX, scaledUvY)
      let dUv = vUv
      dUv = liquidDistort(dUv, uTime, U.liquidIntensity, U.liquidViscosity, U.liquidComplexity, U.selectionRect, U.selectionActive, U.selectionFeather)
      dUv = glitchDistort(dUv, uTime, U.glitchAmount, U.glitchSeed, U.selectionRect, U.selectionActive, U.selectionFeather)
      dUv = vhsDistort(dUv, uTime, U.vhsIntensity, U.vhsTracking, U.selectionRect, U.selectionActive, U.selectionFeather)
      dUv = crtDistort(dUv, U.crtDistortion, U.selectionRect, U.selectionActive, U.selectionFeather)

      const sampled = texture(src, dUv)
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

      const dmResult = dotMatrixNode(
        src, vUv,
        U.dotMatrixSpacing, U.dotMatrixDotSize, U.dotMatrixThreshold,
        U.dotMatrixShape, U.dotMatrixPattern, U.dotMatrixMotion,
        U.dotMatrixSpeed, U.dotMatrixStrength, U.dotMatrixPatScale,
        U.dotMatrixAngle, U.dotMatrixDotW, U.dotMatrixDotH, uTime
      )
      fc = mix(fc, dmResult, U.dotMatrixEnabled)

      const chResult = chladniNode(
        src, vUv,
        U.chladniM, U.chladniN, U.chladniDensity, U.chladniParticleSize,
        U.chladniSettle, U.chladniSpeed, U.chladniIntensity,
        vec4(uChladniColor, float(1)), U.chladniUseSourceColor, uTime
      )
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
      // Plane sized exactly to the object's original bounding box on screen
      planeGeo = new THREE.PlaneGeometry(1, 1)

      mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false })
      mat.colorNode = colorNode
      effectMesh = new THREE.Mesh(planeGeo, mat)
      scene.add(effectMesh)

      // UV.y=0 at screen-top matches mainTarget tex_y=0 — no flip needed here
      const screenBloomUv = uv()
      bloomMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false })
      bloomMat.blending = 2 as any // THREE.AdditiveBlending — bloom is pure glow, added on top
      bloomMat.colorNode = bloomPass(mainTarget.texture, screenBloomUv, uBloom, uBloomTh, uBloomRad)
      // Bloom covers the whole screen
      const bloomPlane = new THREE.PlaneGeometry(vptW, vptH)
      bloomMesh = new THREE.Mesh(bloomPlane, bloomMat)
      bloomMesh.position.set(vptW/2, vptH/2, 0)
      bloomMesh.visible = false
      scene.add(bloomMesh)

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
        U.chromaticAberration.value  = (s.vhsEnabled ? s.vhsIntensity * 0.003 : 0) + (s.glitchEnabled ? s.glitchAmount * 0.004 : 0)
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
        U.dotMatrixEnabled.value   = s.dotMatrixEnabled ? 1 : 0
        U.dotMatrixSpacing.value   = s.dotMatrixSpacing
        U.dotMatrixDotSize.value   = s.dotMatrixDotSize
        U.dotMatrixThreshold.value = s.dotMatrixThreshold
        U.dotMatrixShape.value     = s.dotMatrixShape
        U.dotMatrixPattern.value   = s.dotMatrixPattern
        U.dotMatrixMotion.value    = s.dotMatrixMotion
        U.dotMatrixSpeed.value     = s.dotMatrixSpeed
        U.dotMatrixStrength.value  = s.dotMatrixStrength
        U.dotMatrixPatScale.value  = s.dotMatrixPatScale
        U.dotMatrixAngle.value     = s.dotMatrixAngle
        U.dotMatrixDotW.value      = s.dotMatrixDotW
        U.dotMatrixDotH.value      = s.dotMatrixDotH
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
      }

      let didSetReady = false
      let consecutiveErrors = 0

      const drawFrame = () => {
        if (!renderer || !scene || !camera || !mainTarget || !effectMesh || !bloomMesh || !src) return

        const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0]
        const obj = fabricObjRef.current
        const center = obj.getCenterPoint()
        const scaledW = obj.getScaledWidth() * vpt[0]
        const scaledH = obj.getScaledHeight() * vpt[3]
        const screenX = center.x * vpt[0] + vpt[4]
        const screenY = center.y * vpt[3] + vpt[5]
        const rotation = (obj.angle || 0) * (Math.PI / 180)

        // When 3D is active the _threeDCanvas covers 2× the object area (the 3D mesh
        // occupies the central 50%). Scale to 2× so the mesh aligns 1:1 with object bounds.
        const objAny = obj as any
        const threeDCanvas = objAny._threeDCanvas as HTMLCanvasElement | undefined
        const hasThreeDCanvas = !!threeDCanvas && threeDCanvas.width > 0 && threeDCanvas.height > 0 && !!objAny._threeDReady
        const is3DMode = !!(useLabStore.getState().threeDEnabled && hasThreeDCanvas)
        const meshW = is3DMode ? scaledW * 2 : scaledW
        const meshH = is3DMode ? scaledH * 2 : scaledH

        effectMesh.position.set(screenX, screenY, 0)
        effectMesh.scale.set(meshW, meshH, 1)
        effectMesh.rotation.z = -rotation

        src.needsUpdate = true
        effectMesh.visible = true
        bloomMesh.visible  = false
        renderer.setRenderTarget(mainTarget)
        renderer.setClearAlpha(0)
        renderer.clear()

        try {
          renderer.render(scene, camera)
          consecutiveErrors = 0
        } catch (e) {
          consecutiveErrors++
          if (consecutiveErrors >= 3 && activeRef.current) { setError(`render: ${e}`); return }
        }

        effectMesh.visible = false
        bloomMesh.visible  = true
        renderer.setRenderTarget(null)
        renderer.setClearAlpha(0)
        renderer.clear()

        try {
          renderer.render(scene, camera)
        } catch { /* bloom pass failure is non-fatal */ }
      }

      const tick = () => {
        if (!activeRef.current || !renderer) return
        
        const store = useLabStore.getState()
        const s = isSelectedRef.current ? store : ((fabricObjRef.current as any).labParams ?? LAB_FILTER_DEFAULTS)
        if (store.animated) uTime.value = store.animTime >= 0 ? store.animTime : (performance.now() / 1000)

        const objAny = fabricObjRef.current as any
        const cvs = objAny._threeDCanvas as HTMLCanvasElement | undefined
        const hasValidCanvas = !!cvs && cvs.width > 0 && cvs.height > 0 && !!objAny._threeDReady
        const targetCvs = (s.threeDEnabled && hasValidCanvas) ? cvs : currentObjCanvas

        // ── Video objects: use live frame from HTMLVideoElement ────────────────
        const isVideoObj = !!objAny.isVideo
        if (isVideoObj && !s.threeDEnabled && src && ctxIntermediate) {
          const vid = objAny.videoElement as HTMLVideoElement | undefined
          if (vid && vid.readyState >= 2 && vid.videoWidth > 0) {
            const vw = vid.videoWidth
            const vh = vid.videoHeight
            uTexScale.value.set(vw / MAX_TEX_SIZE, vh / MAX_TEX_SIZE)
            ctxIntermediate.clearRect(0, 0, vw + 4, vh + 4)
            ctxIntermediate.drawImage(vid, 0, 0, vw, vh)
            src.needsUpdate = true
          }
        } else if (targetCvs && targetCvs.width > 0 && src && ctxIntermediate) {
          if (s.threeDEnabled) threeDLatchedRef.current = true
          else threeDLatchedRef.current = false

          uTexScale.value.set(targetCvs.width / MAX_TEX_SIZE, targetCvs.height / MAX_TEX_SIZE)
          ctxIntermediate.clearRect(0, 0, targetCvs.width + 10, targetCvs.height + 10)
          ctxIntermediate.drawImage(targetCvs, 0, 0)
          src.needsUpdate = true
        }

        pushUniforms(s)
        drawFrame()
      }
      tickRef.current = tick

      // ── Real-time texture update: re-capture object pixels after edits ──────
      const updateTexture = () => {
        if (!src || !activeRef.current) return
        currentObjCanvas = fabricObject.toCanvasElement({ multiplier: 2 }) as HTMLCanvasElement
        
        const store = useLabStore.getState()
        const s = isSelectedRef.current ? store : ((fabricObjRef.current as any).labParams ?? LAB_FILTER_DEFAULTS)
        
        const objAny = fabricObjRef.current as any
        const threeDCanvas = objAny._threeDCanvas as HTMLCanvasElement | undefined
        const hasThreeDSource = !!threeDCanvas && threeDCanvas.width > 0 && threeDCanvas.height > 0 && !!objAny._threeDReady
        
        if (!s.threeDEnabled || !hasThreeDSource) {
          threeDLatchedRef.current = false
          if (currentObjCanvas && currentObjCanvas.width > 0 && ctxIntermediate) {
             uTexScale.value.set(currentObjCanvas.width / MAX_TEX_SIZE, currentObjCanvas.height / MAX_TEX_SIZE)
             ctxIntermediate.clearRect(0, 0, currentObjCanvas.width + 10, currentObjCanvas.height + 10)
             ctxIntermediate.drawImage(currentObjCanvas, 0, 0)
             src.needsUpdate = true
          }
        }
        
        if (!store.animated) tick()
      }

      fabricCanvas.on('object:modified',      updateTexture)
      fabricCanvas.on('text:changed',          updateTexture)
      fabricCanvas.on('text:editing:exited',   updateTexture)  // recapture after inline text edit
      
      // Update when moving so the WebGPU texture stays locked to the object
      fabricCanvas.on('object:moving', () => { if (!useLabStore.getState().animated) tick() })
      fabricCanvas.on('object:scaling', () => { if (!useLabStore.getState().animated) tick() })

      // Poll until _threeDReady flips true after geometry build.
      // Uses exponential backoff: checks at 16ms, 32ms, 64ms … up to 500ms cap.
      // Stops after 3 seconds total to avoid zombie polls on mount/unmount races.
      const startReadyPoll = () => {
        if (readyPollRef.current) return
        let delay = 16
        let elapsed = 0
        const MAX_ELAPSED = 3000
        const schedule = () => {
          readyPollRef.current = setTimeout(() => {
            readyPollRef.current = null
            const shouldStop = !activeRef.current || threeDLatchedRef.current || !useLabStore.getState().threeDEnabled
            if (shouldStop || elapsed >= MAX_ELAPSED) return
            if ((fabricObjRef.current as any)._threeDReady && tickRef.current) {
              tickRef.current()
              return  // done — 3D is ready
            }
            // Not ready yet — reschedule with backoff
            elapsed += delay
            delay = Math.min(delay * 2, 500)
            schedule()
          }, delay) as any
        }
        schedule()
      }

      const startLoop = () => { if (renderer) renderer.setAnimationLoop(tick) }
      const stopLoop  = () => {
        if (renderer) renderer.setAnimationLoop(null)
        tick()
        // If 3D is enabled but not yet latched, poll until geometry build finishes
        if (useLabStore.getState().threeDEnabled && !threeDLatchedRef.current) startReadyPoll()
      }
      if (useLabStore.getState().animated) startLoop()
      else stopLoop()

      const unsubStore = useLabStore.subscribe((state, prev) => {
        if (!renderer) return
        if (state.animated !== prev.animated) {
          state.animated ? startLoop() : stopLoop()
        } else if (!state.animated) {
          tick()
          // threeDEnabled just toggled on — start polling if 3D canvas not ready yet
          if (state.threeDEnabled && !prev.threeDEnabled && !(fabricObjRef.current as any)._threeDReady) {
            startReadyPoll()
          }
        }
      })
      ;(renderer as any)._unsubStore = unsubStore
      ;(renderer as any)._cleanupEvents = () => {
         fabricCanvas.off('object:modified',    updateTexture)
         fabricCanvas.off('text:changed',       updateTexture)
         fabricCanvas.off('text:editing:exited', updateTexture)
      }
    }

    init()

    return () => {
      activeRef.current = false
      tickRef.current = null
      if (readyPollRef.current) { clearTimeout(readyPollRef.current); readyPollRef.current = null }
      cleanupCore()
    }
  }, [fabricObject, fabricCanvas])

  return (
    <>
      {/* WebGPU/WebGL object overlay — absolute CSS layer above the Fabric canvas.
          A "merge" (bake) happens when the user clicks Apply in the Lab panel. */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: viewport.width || '100%',
          height: viewport.height || '100%',
          pointerEvents: 'none',
          zIndex: 100,
          visibility: (viewport.width && !error) ? 'visible' : 'hidden',
        }}
      />
      {/* Error badge — shown in bottom-left corner when GPU init fails */}
      {error && (
        <div style={{
          position: 'absolute',
          left: 10,
          bottom: 10,
          background: 'rgba(180,30,30,0.92)',
          color: '#fff',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 9,
          fontFamily: 'monospace',
          pointerEvents: 'none',
          zIndex: 102,
          maxWidth: 320,
          lineHeight: 1.4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}>
          ⚠ Lab GPU: {error}
        </div>
      )}
    </>
  )
})
