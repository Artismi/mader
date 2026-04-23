'use client'

import React, { useRef, useEffect } from 'react'
import * as THREE from 'three/webgpu'
import { useLabStore } from '../hooks/use-lab-store'
import { SpringIntegrator } from '@/lib/motion/spring-physics'
import * as fabric from 'fabric'
const getObjId = (obj: any): string => {
  if (!obj) return ''
  if (!obj.objId) {
    obj.objId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) 
      ? (crypto as any).randomUUID() 
      : 'obj_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now()
  }
  return obj.objId
}

// TSL Nodes
import {
  texture, uniform, vec4, uv, mix, vec2, float
} from 'three/tsl'
import { crtDistort, crtColorEffect } from './nodes/crt-node'
import { patternNode } from './nodes/pattern-node'
import { ditherNode } from './nodes/dither-node'
import { liquidDistort } from './nodes/liquid-node'
import { vhsDistort } from './nodes/vhs-node'
import { glitchDistort } from './nodes/glitch-node'
import { getSelectionMask } from './nodes/shared-tsl'
import { opticalFlowBlur, temporalFeedback, cinemaDither } from './nodes/motion-node'

interface Props {
  fabricCanvas: any // This is now the Fabric Instance
  className?: string
}

/**
 * WebGPULabEngine V7.0 - PERSISTENT MULTI-OBJECT ENGINE
 * Performs high-precision rendering with matrix-projections and mesh pooling.
 */
export function WebGPULabEngine({ fabricCanvas, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<THREE.WebGPURenderer | null>(null)
  const fabricRef = useRef<any>(fabricCanvas) // Initialize with prop
  const store = useLabStore()

  // Mesh/Material Pool for Vanguard V7.0
  const pool = useRef<Map<string, { mesh: THREE.Mesh, material: THREE.MeshBasicNodeMaterial, uniforms: any }>>(new Map()).current

  // B4: Spring integrator + per-object previous positions for velocity
  const spring = useRef(new SpringIntegrator()).current
  const prevPositions = useRef<Map<string, { x: number; y: number }>>(new Map()).current
  const lastFrameTime = useRef(performance.now())

  // Unified Frame Time
  const uTime = React.useMemo(() => uniform(0), [])

  // Helper to create a unique Material Instance for an object
  const createLabMaterial = (initialUniforms: any, sourceTex: THREE.CanvasTexture) => {
    const vUv = uv()
    const u = initialUniforms
    
    let distortedUv = vUv
    distortedUv = liquidDistort(distortedUv, uTime, u.liquidIntensity, u.liquidViscosity, u.liquidComplexity, u.selectionRect, u.selectionActive, u.selectionFeather)
    distortedUv = glitchDistort(distortedUv, uTime, u.glitchAmount, u.glitchSeed, u.selectionRect, u.selectionActive, u.selectionFeather)
    distortedUv = vhsDistort(distortedUv, uTime, u.vhsIntensity, u.vhsTracking, u.selectionRect, u.selectionActive, u.selectionFeather)
    distortedUv = crtDistort(distortedUv, u.crtDistortion, u.selectionRect, u.selectionActive, u.selectionFeather)

    // AG3: Chromatic aberration — R and B channels sampled at ±offset UVs
    const aberr = u.chromaticAberration
    const r = texture(sourceTex, distortedUv.add(vec2(aberr, float(0)))).r
    const g = texture(sourceTex, distortedUv).g
    const b = texture(sourceTex, distortedUv.sub(vec2(aberr, float(0)))).b
    const sampledColor = vec4(r, g, b, texture(sourceTex, distortedUv).a)
    let finalColor = vec4(sampledColor.rgb, sampledColor.a)

    finalColor = crtColorEffect(finalColor, distortedUv, uTime, u.crtMaskScale, u.crtMaskIntensity, u.crtScanlineIntensity, u.crtBrightness, u.selectionRect, u.selectionActive, u.selectionFeather)
    finalColor = ditherNode(finalColor, u.ditherMode, u.ditherColorDepth)

    // B3: Motion blur blends OVER post-processed color — does not replace it
    const blurredColor = opticalFlowBlur(sourceTex, distortedUv, u.uVelocity, u.motionBlurIntensity)
    finalColor = mix(finalColor, blurredColor, u.motionBlurIntensity.mul(0.5))
    finalColor = cinemaDither(finalColor)

    const mask = getSelectionMask(vUv, u.selectionRect, u.selectionActive, u.selectionFeather)
    
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.NormalBlending })
    mat.colorNode = finalColor.mul(mask)
    return mat
  }

  // Keep fabricRef in sync with props
  useEffect(() => {
    if (!fabricCanvas || !canvasRef.current || !store.labActive) return
    
    let renderer: THREE.WebGPURenderer
    let scene: THREE.Scene
    let camera: THREE.OrthographicCamera
    let sourceTexture: THREE.CanvasTexture
    let mainTarget: THREE.RenderTarget
    let bgMesh: THREE.Mesh
    let compositeMesh: THREE.Mesh
    let bgMaterial: THREE.MeshBasicNodeMaterial
    let finalMaterial: THREE.MeshBasicNodeMaterial

    const updateSize = () => {
      const width = containerRef.current?.clientWidth || window.innerWidth
      const height = containerRef.current?.clientHeight || window.innerHeight
      if (renderer) renderer.setSize(width, height)
    }

    const initFeedback = () => {
      const f = fabricRef.current
      if (!f || !mainTarget) return
      const width = f.getWidth(), height = f.getHeight()
      mainTarget.setSize(width, height)
    }

    const init = async () => {
      try {
        renderer = new THREE.WebGPURenderer({ 
          canvas: canvasRef.current!, 
          antialias: true,
          alpha: true,
          forceWebGL: false 
        })
        console.info("[LabEngine] Renderer initialized successfully.")
        
        // Initial target creation
        mainTarget = new THREE.RenderTarget(1, 1, { type: THREE.HalfFloatType })
      } catch (e) {
        console.error("[LabEngine] Renderer initialization failed:", e)
        return
      }
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.setClearColor(0x000000, 0)
      renderer.setClearAlpha(0)
      renderer.autoClear = false
      await renderer.init()
      rendererRef.current = renderer
      // B2: Size mainTarget to actual canvas dimensions immediately — not 1×1
      mainTarget.setSize(fabricCanvas.getWidth(), fabricCanvas.getHeight())

      scene = new THREE.Scene()
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      sourceTexture = new THREE.CanvasTexture(fabricCanvas.lowerCanvasEl)
      
      const vUv = uv()

      // BG Material
      const uBg = {
        patternScale: uniform(50),
        patternThickness: uniform(0.2),
        patternType: uniform(0),
        patternColor: uniform(new THREE.Color('#ffffff'))
      }
      bgMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, opacity: 0.1 })
      const bgNode = patternNode(vUv, uBg.patternScale, uBg.patternThickness, uBg.patternType, uBg.patternColor)
      bgMaterial.colorNode = vec4(bgNode.rgb, bgNode.a)
      bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMaterial)
      bgMesh.visible = false
      scene.add(bgMesh)

      // Final Composite
      finalMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true })
      finalMaterial.colorNode = texture(mainTarget.texture)
      compositeMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), finalMaterial)
      compositeMesh.visible = false
      scene.add(compositeMesh)

      const getScreenUVs = (obj: any, f: any) => {
        const cw = f.getWidth(), ch = f.getHeight()
        
        // Use Fabric's internal projection utility for 100% accuracy
        const rect = obj.getBoundingRect(false)
        const tl = fabric.util.transformPoint(new fabric.Point(rect.left, rect.top), f.viewportTransform)
        const br = fabric.util.transformPoint(new fabric.Point(rect.left + rect.width, rect.top + rect.height), f.viewportTransform)

        const uvX = tl.x / cw
        const uvY = 1.0 - (br.y / ch) 
        const uvW = (br.x - tl.x) / cw
        const uvH = (br.y - tl.y) / ch
        
        return [uvX, uvY, uvW, uvH] as [number, number, number, number]
      }

      renderer.setAnimationLoop(() => {
        // Sync with the actual rendering canvas in case of disposal/REBIND
        if (!fabricRef.current) fabricRef.current = fabricCanvas
        
        const f = fabricRef.current
        if (!f) return

        if (sourceTexture.image !== f.lowerCanvasEl) {
           sourceTexture.image = f.lowerCanvasEl
           sourceTexture.needsUpdate = true
           initFeedback()
        }
        
        const now = performance.now()
        const dt = Math.min((now - lastFrameTime.current) / 1000, 0.05) // cap at 50ms
        lastFrameTime.current = now
        uTime.value = now / 1000

        // 1. CAPTURE PHASE
        f.renderAll()
        sourceTexture.needsUpdate = true
        
        // 2. SYNC MESH POOL
        const labObjects = f.getObjects().filter((o: any) => o.labParams)
        const activeIds = new Set(labObjects.map((o: any) => getObjId(o)))

        // Cleanup stale meshes + spring state
        for (const [id, data] of pool.entries()) {
          if (!activeIds.has(id)) {
            scene.remove(data.mesh)
            data.material.dispose()
            pool.delete(id)
            spring.reset(`${id}_x`, 0)
            spring.reset(`${id}_y`, 0)
            prevPositions.delete(id)
          }
        }

        // Update/Create meshes
        labObjects.forEach((obj: any) => {
          const id = getObjId(obj)
          let data = pool.get(id)
          if (!data) {
            const uniforms = {
              crtDistortion: uniform(0),
              crtMaskScale: uniform(6),
              crtMaskIntensity: uniform(0),
              crtScanlineIntensity: uniform(0),
              crtBrightness: uniform(1),
              liquidIntensity: uniform(0),
              liquidViscosity: uniform(0.4),
              liquidComplexity: uniform(3),
              vhsIntensity: uniform(0),
              vhsTracking: uniform(0.5),
              glitchAmount: uniform(0),
              glitchSeed: uniform(0),
              ditherMode: uniform(-1),
              ditherColorDepth: uniform(8),
              selectionRect: uniform(new THREE.Vector4(0, 0, 1, 1)),
              selectionActive: uniform(1),
              selectionFeather: uniform(0.01),
              uVelocity: uniform(new THREE.Vector2(0, 0)),
              motionBlurIntensity: uniform(0),
              chromaticAberration: uniform(0)
            }
            const material = createLabMaterial(uniforms, sourceTexture)
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
            data = { mesh, material, uniforms }
            pool.set(id, data)
            scene.add(mesh)
          }

          // Update Uniforms
          const p = obj.labParams
          const u = data.uniforms
          const rect = getScreenUVs(obj, f)
          const cw = f.getWidth(), ch = f.getHeight()
          
          u.crtDistortion.value = p.crtEnabled ? (p.crtDistortion ?? 0.15) : 0
          u.crtMaskScale.value = p.crtMaskScale ?? 6
          u.crtMaskIntensity.value = p.crtEnabled ? (p.crtMaskIntensity ?? 0.8) : 0
          u.crtScanlineIntensity.value = p.crtEnabled ? (p.crtScanlineIntensity ?? 0.25) : 0
          u.crtBrightness.value = p.crtBrightness ?? 1
          u.liquidIntensity.value = p.liquidEnabled ? (p.liquidIntensity ?? 0.5) : 0
          u.vhsIntensity.value = p.vhsEnabled ? (p.vhsIntensity ?? 0.5) : 0
          u.glitchAmount.value = p.glitchEnabled ? (p.glitchAmount ?? 0.4) : 0
          u.ditherMode.value = (p.ditherEnabled) ? (p.ditherMode ?? 0) : -1
          u.selectionRect.value.fromArray(rect)
          
          // B4: Advance spring toward object's current position, read resulting velocity
          const springConfig = {
            stiffness: store.springStiffness,
            damping: store.springDamping,
            mass: store.springMass,
          }
          const prev = prevPositions.get(id) ?? { x: obj.left ?? 0, y: obj.top ?? 0 }
          spring.update(`${id}_x`, obj.left ?? 0, springConfig, dt)
          spring.update(`${id}_y`, obj.top ?? 0, springConfig, dt)
          prevPositions.set(id, { x: obj.left ?? 0, y: obj.top ?? 0 })
          const vx = store.springEnabled ? spring.getVelocity(`${id}_x`) : 0
          const vy = store.springEnabled ? spring.getVelocity(`${id}_y`) : 0
          u.uVelocity.value.set(vx / cw, vy / ch)
          u.motionBlurIntensity.value = p.motionBlurEnabled ? (p.motionBlurIntensity ?? 0.5) : 0
          u.chromaticAberration.value =
            (p.vhsEnabled ? (p.vhsIntensity ?? 0) * 0.003 : 0) +
            (p.glitchEnabled ? (p.glitchAmount ?? 0) * 0.004 : 0)

          data.mesh.visible = true
        })

        // 3. RENDER VANGUARD PASS to mainTarget
        renderer.setRenderTarget(mainTarget)
        renderer.setClearAlpha(0)
        renderer.clear()

        bgMesh.visible = false
        compositeMesh.visible = false

        renderer.render(scene, camera)

        // 4. FINAL COMPOSITE — GPU overlay occludes Fabric objects via zIndex:9999
        renderer.setRenderTarget(null)
        renderer.setClearAlpha(0)
        renderer.clear()

        for (const data of pool.values()) data.mesh.visible = false
        compositeMesh.visible = true
        renderer.render(scene, camera)
      })

      window.addEventListener('resize', updateSize)
      updateSize()
    }

    init()

    return () => {
      window.removeEventListener('resize', updateSize)
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null)
        rendererRef.current.dispose()
      }
      if (sourceTexture) sourceTexture.dispose()
      for (const data of pool.values()) {
        data.material.dispose()
      }
      pool.clear()
      rendererRef.current = null
    }
  }, [fabricCanvas, store.labActive])

  if (!store.labActive) return null

  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={{ 
        position: 'absolute', 
        inset: 0, 
        zIndex: 9999, 
        pointerEvents: 'none'
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}
