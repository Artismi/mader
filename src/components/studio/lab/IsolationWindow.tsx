'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react'
import * as THREE from 'three/webgpu'
import { useLabStore, type LabStore } from '../hooks/use-lab-store'
import { Vanguard3DEngine } from './Vanguard3DEngine'

// TSL Nodes — identical pipeline to artboard engine
import {
  texture, uniform, vec4, uv, mix, vec2, float
} from 'three/tsl'
import { crtDistort, crtColorEffect } from './nodes/crt-node'
import { ditherNode } from './nodes/dither-node'
import { liquidDistort } from './nodes/liquid-node'
import { vhsDistort, vhsColorEffect } from './nodes/vhs-node'
import { glitchDistort } from './nodes/glitch-node'
import { opticalFlowBlur, cinemaDither } from './nodes/motion-node'
import { bloomPass } from './nodes/bloom-node'
import { patternNode } from './nodes/pattern-node'
import { halftoneNode } from './nodes/halftone-node'
import { colorGradeNode } from './nodes/color-grade-node'
import { thresholdNode }                 from './nodes/threshold-node'
import { gaussianNoiseNode }             from './nodes/noise-node'
import { fogPointcloudNode }             from './nodes/fog-node'

import { X, Check, Loader2, ZoomIn, ZoomOut, RotateCcw, Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  fabricObject: any
  fabricCanvas: any
  onClose: () => void
  onApply: (dataUrl: string, obj: any) => void
}

// Shared no-selection constants (object always fills its own space)
const NO_SEL  = new THREE.Vector4(0, 0, 1, 1)

// ── Uniform helpers ────────────────────────────────────────────────────────
function makeUniforms() {
  return {
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
    selectionActive:      uniform(0),      // always full-coverage in isolation
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
    gradeExposure:        uniform(0),
    gradeContrast:        uniform(1),
    gradeSaturation:      uniform(1),
    gradeVibrance:        uniform(0),
    gradeTemperature:     uniform(0),
    gradeHue:             uniform(0),
    gradeToneMap:         uniform(0),
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
  }
}

function pushUniforms(
  U: ReturnType<typeof makeUniforms>,
  s: LabStore,
  uBloom: any, uBloomTh: any, uBloomRad: any,
  uPatColor: any
) {
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
  if (s.patternEnabled) {
    uPatColor.value.setStyle(s.patternColor)
  }
  U.halftoneEnabled.value  = s.halftoneEnabled ? 1 : 0
  U.halftoneSpacing.value  = s.halftoneSpacing
  U.halftoneDotSize.value  = s.halftoneDotSize
  U.halftoneAngle.value    = s.halftoneAngle
  U.halftoneMode.value     = s.halftoneMode
  U.gradeExposure.value    = s.colorGradeEnabled ? s.gradeExposure    : 0
  U.gradeContrast.value    = s.colorGradeEnabled ? s.gradeContrast    : 1
  U.gradeSaturation.value  = s.colorGradeEnabled ? s.gradeSaturation  : 1
  U.gradeVibrance.value    = s.colorGradeEnabled ? s.gradeVibrance    : 0
  U.gradeTemperature.value = s.colorGradeEnabled ? s.gradeTemperature : 0
  U.gradeHue.value         = s.colorGradeEnabled ? s.gradeHue         : 0
  U.gradeToneMap.value     = s.colorGradeEnabled ? s.gradeToneMap     : 0
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
}

function buildGraph(src: any, U: ReturnType<typeof makeUniforms>, uTime: any, uPatColor: any) {
  const vUv = vec2(uv().x, float(1).sub(uv().y))
  let dUv = vUv

  dUv = liquidDistort(dUv, uTime, U.liquidIntensity, U.liquidViscosity, U.liquidComplexity, U.selectionRect, U.selectionActive, U.selectionFeather)
  dUv = glitchDistort(dUv, uTime, U.glitchAmount, U.glitchSeed, U.selectionRect, U.selectionActive, U.selectionFeather)
  dUv = vhsDistort(dUv, uTime, U.vhsIntensity, U.vhsTracking, U.selectionRect, U.selectionActive, U.selectionFeather)
  dUv = crtDistort(dUv, U.crtDistortion, U.selectionRect, U.selectionActive, U.selectionFeather)

  const aberr = U.chromaticAberration
  const rCh = texture(src, dUv.add(vec2(aberr, float(0)))).r
  const gCh = texture(src, dUv).g
  const bCh = texture(src, dUv.sub(vec2(aberr, float(0)))).b
  const sampled = vec4(rCh, gCh, bCh, texture(src, dUv).a)
  let fc = vec4(sampled.rgb, sampled.a)

  // VHS YIQ chroma bleed
  fc = vhsColorEffect(src, fc, dUv, uTime, U.vhsIntensity, U.vhsBleed)

  // Halftone
  const halftoned = halftoneNode(src, vUv, U.halftoneSpacing, U.halftoneDotSize, U.halftoneAngle, U.halftoneMode)
  fc = mix(fc, halftoned, U.halftoneEnabled)

  // Color grading — neutral defaults are mathematical identities, zero cost when off
  fc = colorGradeNode(fc, U.gradeExposure, U.gradeContrast, U.gradeSaturation, U.gradeVibrance, U.gradeTemperature, U.gradeHue, U.gradeToneMap)

  fc = crtColorEffect(fc, dUv, uTime, U.crtMaskScale, U.crtMaskIntensity, U.crtScanlineIntensity, U.crtBrightness, U.selectionRect, U.selectionActive, U.selectionFeather)
  fc = ditherNode(fc, U.ditherMode, U.ditherColorDepth)
  const blurred = opticalFlowBlur(src, dUv, U.uVelocity, U.motionBlurIntensity)
  fc = mix(fc, blurred, U.motionBlurIntensity.mul(0.5))
  fc = cinemaDither(fc, uTime, U.cinemaDitherAmt)

  const patResult = patternNode(uTime, U.patternScale, U.patternThickness, U.patternType, vec4(uPatColor, float(1)), U.patternBlend, fc)
  fc = mix(fc, patResult, U.patternEnabled)

  const threshResult = thresholdNode(fc, U.thresholdValue, U.thresholdSmoothing)
  fc = mix(fc, threshResult, U.thresholdEnabled)
  
  const fogResult = fogPointcloudNode(src, fc, vUv, uTime, U.fogDensity, U.fogOscillation, U.fogDepth, U.fogLuminescence, U.fogPointScale)
  fc = mix(fc, fogResult, U.fogEnabled)
  
  const noiseResult = gaussianNoiseNode(fc, vUv, uTime, U.noiseIntensity, U.noiseMonochrome)
  fc = mix(fc, noiseResult, U.noiseEnabled)

  // Preserve original object alpha so transparent areas remain transparent (shown on checkerboard)
  return vec4(fc.rgb, sampled.a)
}

// ── Export helper — static offscreen render ────────────────────────────────
async function exportFiltered(objCanvas: HTMLCanvasElement, s: LabStore): Promise<string> {
  const w = objCanvas.width
  const h = objCanvas.height

  const off = document.createElement('canvas')
  off.width = w; off.height = h

  const renderer = new THREE.WebGPURenderer({ canvas: off, antialias: true, alpha: true, forceWebGL: false })
  renderer.setPixelRatio(1)
  renderer.setClearColor(0x000000, 1)
  renderer.autoClear = false
  await renderer.init()
  renderer.setSize(w, h)

  const scene  = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const src = new THREE.CanvasTexture(objCanvas)
  src.flipY = false
  src.minFilter = THREE.LinearFilter
  src.magFilter = THREE.LinearFilter

  const uTime    = uniform(performance.now() / 1000)
  const U        = makeUniforms()
  const uBloom   = uniform(0)
  const uBloomTh = uniform(0.1)
  const uBloomRad = uniform(0.025)
  const uPatColor = uniform(new THREE.Color(0x33ff55))
  pushUniforms(U, s, uBloom, uBloomTh, uBloomRad, uPatColor)

  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false })
  mat.colorNode = buildGraph(src, U, uTime, uPatColor)
  const effectMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
  scene.add(effectMesh)

  const mainTarget = new THREE.RenderTarget(w, h, { type: THREE.HalfFloatType })

  src.needsUpdate = true
  renderer.setRenderTarget(mainTarget)
  renderer.clear()
  await renderer.renderAsync(scene, camera)

  const compUv = vec2(uv().x, float(1).sub(uv().y))
  const bloomMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false })
  bloomMat.colorNode = bloomPass(mainTarget.texture, compUv, uBloom, uBloomTh, uBloomRad)
  const bloomMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bloomMat)
  scene.add(bloomMesh)
  effectMesh.visible = false
  renderer.setRenderTarget(null)
  renderer.clear()
  await renderer.renderAsync(scene, camera)

  const dataUrl = off.toDataURL('image/png')
  renderer.dispose(); mainTarget.dispose(); src.dispose()
  return dataUrl
}

// ── Main component ─────────────────────────────────────────────────────────
export function IsolationWindow({ fabricObject, fabricCanvas, onClose, onApply }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rendererRef  = useRef<THREE.WebGPURenderer | null>(null)
  const objCanvasRef = useRef<HTMLCanvasElement | null>(null)  // source canvas from Fabric

  const animated = useLabStore(s => s.animated)
  const setLab   = useLabStore(s => s.set)
  const s = useLabStore()

  const [zoom, setZoom] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [ready, setReady] = useState(false)
  const [objPx, setObjPx] = useState({ w: 512, h: 512 })
  const [engineError, setEngineError] = useState<string | null>(null)

  // Build the object canvas once at mount using Fabric's toCanvasElement()
  // This mirrors what the artboard engine does with lowerCanvasEl
  useEffect(() => {
    if (!fabricObject) return

    const prev = fabricObject.opacity
    fabricObject.set('opacity', 1)

    // toCanvasElement() returns an <canvas> element with the object rendered on it
    // multiplier=1 → natural CSS-pixel size
    const objCanvas: HTMLCanvasElement = fabricObject.toCanvasElement({ multiplier: 1 })

    fabricObject.set('opacity', prev)
    objCanvasRef.current = objCanvas

    const br = fabricObject.getBoundingRect(true, true)
    setObjPx({ w: Math.max(1, Math.round(br.width)), h: Math.max(1, Math.round(br.height)) })
    setReady(true)
  }, [fabricObject])

  // WebGPU live preview — same architecture as WebGPULabEngine
  useEffect(() => {
    if (!ready || !canvasRef.current || !objCanvasRef.current) return

    const objCanvas = objCanvasRef.current
    const w = objCanvas.width
    const h = objCanvas.height

    let renderer: THREE.WebGPURenderer
    let src: THREE.CanvasTexture
    let mainTarget: THREE.RenderTarget
    let feedbackTarget: THREE.RenderTarget

    const uTime    = uniform(0)
    const U        = makeUniforms()
    const uBloom   = uniform(0)
    const uBloomTh = uniform(0.1)
    const uBloomRad = uniform(0.025)
    const uTrail   = uniform(0)
    const uPatColor = uniform(new THREE.Color(0x33ff55))

    const init = async () => {
      try {
        renderer = new THREE.WebGPURenderer({
          canvas: canvasRef.current!,
          antialias: true,
          alpha: true,
          forceWebGL: false,
        })
      } catch (e) {
        setEngineError(`WebGPU init: ${e}`)
        return
      }

      renderer.setPixelRatio(1)
      renderer.setClearColor(0x000000, 1)
      renderer.autoClear = false
      try {
        await renderer.init()
      } catch (e) {
        setEngineError(`renderer.init: ${e}`)
        return
      }
      renderer.setSize(w, h)
      rendererRef.current = renderer

      mainTarget    = new THREE.RenderTarget(w, h, { type: THREE.HalfFloatType })
      feedbackTarget = new THREE.RenderTarget(w, h, { type: THREE.HalfFloatType })

      const scene  = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

      // CanvasTexture from the Fabric-rendered canvas — same approach as artboard engine
      src = new THREE.CanvasTexture(objCanvas)
      src.flipY = false   // WebGPU renderer: no Y-inversion needed
      src.minFilter = THREE.LinearFilter
      src.magFilter = THREE.LinearFilter

      // Effect mesh + bloom composite
      let effectMesh: THREE.Mesh
      let bloomMesh: THREE.Mesh
      try {
        const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false })
        mat.colorNode = buildGraph(src, U, uTime, uPatColor)
        effectMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
        scene.add(effectMesh)

        const compUv = vec2(uv().x, float(1).sub(uv().y))
        const bloomMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false })
        bloomMat.colorNode = mix(
          bloomPass(mainTarget.texture, compUv, uBloom, uBloomTh, uBloomRad),
          texture(feedbackTarget.texture, compUv),
          uTrail
        )
        bloomMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bloomMat)
        bloomMesh.visible = false
        scene.add(bloomMesh)
      } catch (e) {
        setEngineError(`Scene build: ${e}`)
        return
      }

      renderer.setAnimationLoop(() => {
        const s = useLabStore.getState()
        // Advance time only in animated mode; freeze for static export
        if (s.animated) uTime.value = s.animTime >= 0 ? s.animTime : (performance.now() / 1000)
        src.needsUpdate = true  // object canvas is static but mark for consistent upload

        pushUniforms(U, s, uBloom, uBloomTh, uBloomRad, uPatColor)
        uTrail.value = 0  // no temporal trails in isolation (object is static)

        // Effect → mainTarget
        effectMesh.visible = true
        bloomMesh.visible  = false
        renderer.setRenderTarget(mainTarget)
        renderer.setClearAlpha(0)
        renderer.clear()
        renderer.render(scene, camera)

        // Composite → screen
        effectMesh.visible = false
        bloomMesh.visible  = true
        renderer.setRenderTarget(null)
        renderer.setClearAlpha(0)
        renderer.clear()
        renderer.render(scene, camera)
      })
    }

    init()

    return () => {
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null)
        rendererRef.current.dispose()
        rendererRef.current = null
      }
      src?.dispose()
      mainTarget?.dispose()
      feedbackTarget?.dispose()
    }
  }, [ready])  // re-init only when object capture changes

  const handleApply = useCallback(async () => {
    const objCanvas = objCanvasRef.current
    if (!objCanvas || !fabricObject) return
    setExporting(true)
    try {
      const filtered = await exportFiltered(objCanvas, useLabStore.getState())
      onApply(filtered, fabricObject)
    } catch (e) {
      console.error('[IsolationWindow] Export failed:', e)
    } finally {
      setExporting(false)
    }
  }, [fabricObject, onApply])

  // Compute display CSS size — fit the object in the window, then apply user zoom
  const maxW = typeof window !== 'undefined' ? window.innerWidth  - 96  : 800
  const maxH = typeof window !== 'undefined' ? window.innerHeight - 180 : 600
  const fitS  = Math.min(maxW / Math.max(objPx.w, 1), maxH / Math.max(objPx.h, 1), 1)
  const cssW  = Math.round(objPx.w * fitS * zoom)
  const cssH  = Math.round(objPx.h * fitS * zoom)

  // Restore visibility if 3D is disabled
  useEffect(() => {
    if (!s.threeDEnabled && fabricObject && fabricCanvas) {
      fabricObject.set('visible', true)
      fabricCanvas.requestRenderAll()
    }
  }, [s.threeDEnabled, fabricObject, fabricCanvas])

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div
        className="relative flex flex-col bg-[#0d0d0d] border border-white/10 rounded-[28px] shadow-2xl overflow-hidden"
        style={{ width: Math.min(cssW + 48, maxW + 48) }}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Lab Isolato</p>
            <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest mt-0.5">
              {fabricObject?.type ?? 'oggetto'} — Vanguard V8
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Animated / Static toggle */}
            <button
              onClick={() => setLab({ animated: !animated })}
              title={animated ? 'Passa a Statico' : 'Passa ad Animato'}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all',
                animated
                  ? 'bg-accent/10 border-accent/30 text-accent'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
              )}
            >
              {animated ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
              {animated ? 'Live' : 'Statico'}
            </button>
            <button onClick={onClose}
              className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>
        </div>

        {/* Preview — checkerboard = transparent bg */}
        <div
          className="flex items-center justify-center p-5 overflow-auto"
          style={{
            background: 'repeating-conic-gradient(#1c1c1c 0% 25%, #111 0% 50%) 0 0 / 16px 16px',
            minHeight: 120,
          }}
        >
          {engineError ? (
            <div style={{
              background: 'rgba(180,0,0,0.85)', color: '#fff', padding: '10px 14px',
              borderRadius: 8, fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all',
              maxWidth: 400,
            }}>
              <strong>[Lab Engine Error]</strong><br />{engineError}
            </div>
          ) : !ready ? (
            <div className="flex items-center gap-2 text-white/20 py-8">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[9px] font-black uppercase tracking-widest">Caricamento…</span>
            </div>
          ) : (
            /* canvas pixel dimensions set by renderer.setSize(w, h)
               CSS display dimensions set by style — independent of pixel buffer */
            <div className="relative" style={{ width: cssW, height: cssH }}>
              {/* 2D Canvas View */}
              <canvas
                ref={canvasRef}
                className={cn(s.threeDEnabled && "opacity-0 pointer-events-none")}
                style={{ width: cssW, height: cssH, display: 'block', borderRadius: 6 }}
              />
              
              {/* 3D Engine View */}
              {s.threeDEnabled && (
                <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
                  <Vanguard3DEngine 
                    key={fabricObject?.id || '3d-preview'}
                    fabricObject={fabricObject} 
                    onFrameUpdate={(dataUrl) => {
                      if (!fabricObject || !fabricCanvas) return
                      
                      // SAFE SYNC: We store the 3D render in a custom property 
                      // without breaking the Fabric object's internal class or type.
                      // The main LabEngine will use this buffer if available.
                      ;(fabricObject as any)._threeDPreview = dataUrl
                      
                      // Notify canvas of updates
                      fabricCanvas.requestRenderAll()
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-white/6 shrink-0">
          <button onClick={() => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))}
            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <ZoomOut className="w-3 h-3 text-white/40" />
          </button>
          <span className="text-[8px] font-black text-white/20 uppercase tracking-widest w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <ZoomIn className="w-3 h-3 text-white/40" />
          </button>
          <button onClick={() => setZoom(1)}
            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center ml-1 transition-colors">
            <RotateCcw className="w-3 h-3 text-white/40" />
          </button>

          <div className="flex-1" />

          <button onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/30 hover:bg-white/5 transition-all">
            Annulla
          </button>
          <button
            onClick={handleApply}
            disabled={exporting || !ready || !!engineError}
            className={cn(
              'flex items-center gap-2 px-5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all',
              exporting || !ready || !!engineError
                ? 'bg-accent/30 text-accent/50 cursor-not-allowed'
                : 'bg-accent text-black hover:bg-accent/80'
            )}
          >
            {exporting
              ? <><Loader2 className="w-3 h-3 animate-spin" />Rendering…</>
              : <><Check className="w-3 h-3" />Applica &amp; Esporta</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
