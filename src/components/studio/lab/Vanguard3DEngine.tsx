'use client'

import React, { useEffect, useRef } from 'react'
// @ts-ignore
import * as THREE from 'three'
import { useLabStore, LAB_FILTER_DEFAULTS } from '../hooks/use-lab-store'

interface Vanguard3DEngineProps {
  fabricObject: any
  onFrameUpdate?: (dataUrl: string) => void
  onAspectChange?: (aspect: number) => void
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
  isSelected?: boolean
}

export function Vanguard3DEngine({ fabricObject, onFrameUpdate, onAspectChange, onCanvasReady, isSelected = true }: Vanguard3DEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef  = useRef<any>(null)
  const sceneRef     = useRef<any>(null)
  const cameraRef    = useRef<any>(null)
  const meshRef      = useRef<any>(null)
  const keyLightRef  = useRef<THREE.DirectionalLight | null>(null)
  const frameRef     = useRef<number>(0)
  const geometryRef  = useRef<THREE.PlaneGeometry | null>(null)
  const hTexRef      = useRef<THREE.CanvasTexture | null>(null)
  const materialsRef = useRef<Record<string, any>>({})
  // 2D copy buffer — updated after every WebGL render so drawImage always gets valid pixels
  // (hidden WebGL canvas backing stores are not reliably preserved for external readback)
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const bufferCtxRef    = useRef<CanvasRenderingContext2D | null>(null)
  const copyToBufferRef = useRef<(() => void) | null>(null)
  const globalStore  = useLabStore()
  const s = isSelected ? globalStore : (fabricObject.labParams ?? LAB_FILTER_DEFAULTS)
  
  const isDraggingRef = useRef(false)
  const velRef = useRef({ x: 0, y: 0 })
  const targetRotRef = useRef(new THREE.Quaternion())
  const isResetingRef = useRef(false)
  const forceRenderRef = useRef(false)  // set true after geometry build to guarantee first paint

  // ── Sync Props to Refs (Fixes Closure Bugs) ────────────────────────────────
  const propsRef = useRef({ onFrameUpdate, fabricObject, isSelected })
  useEffect(() => { 
    propsRef.current = { onFrameUpdate, fabricObject, isSelected } 
  }, [onFrameUpdate, fabricObject, isSelected])

  // ── Scene Init with Premium Environment ───────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const obj = propsRef.current.fabricObject
    if (obj && onCanvasReady) (obj as any)._threeDReady = false

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(280, 280, false)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.outputColorSpace = THREE.SRGBColorSpace
    
    const dom = renderer.domElement as HTMLCanvasElement
    dom.style.width  = '100%'
    dom.style.height = '100%'
    containerRef.current.appendChild(dom)
    rendererRef.current = renderer

    // Create the 2D copy buffer that consumers read from.
    // Using a 2D canvas (not the raw WebGL canvas) guarantees drawImage readback works
    // even when the WebGL canvas lives in a tiny hidden offscreen container.
    const bc = document.createElement('canvas')
    bc.width = 280; bc.height = 280
    bufferCanvasRef.current = bc
    bufferCtxRef.current = bc.getContext('2d')!
    copyToBufferRef.current = () => {
      const r = rendererRef.current
      const bCanvas = bufferCanvasRef.current
      let bCtx = bufferCtxRef.current
      if (!r || !bCanvas || !bCtx) return
      const dEl = r.domElement
      const w = dEl.width
      const h = dEl.height
      if (w !== bCanvas.width || h !== bCanvas.height) {
        bCanvas.width  = w
        bCanvas.height = h
        bCtx = bCanvas.getContext('2d')!
        bufferCtxRef.current = bCtx
      }
      // gl.readPixels reads directly from the GPU framebuffer — works regardless of
      // canvas visibility or container display properties (drawImage on a hidden
      // WebGL canvas returns blank pixels in Electron/Chrome even with preserveDrawingBuffer).
      try {
        const gl = r.getContext() as WebGL2RenderingContext
        const pixels = new Uint8Array(w * h * 4)
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        // WebGL y=0 is at the bottom; Canvas y=0 is at the top — flip vertically.
        const imgData = new ImageData(w, h)
        for (let y = 0; y < h; y++) {
          imgData.data.set(pixels.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4)
        }
        bCtx.putImageData(imgData, 0, 0)
      } catch (e) {
        // gl.readPixels failed (context lost or driver issue) — fall back to drawImage
        console.warn('[Vanguard3D] readPixels fallback:', e)
        bCtx.clearRect(0, 0, w, h)
        bCtx.drawImage(dEl, 0, 0)
      }
    }

    // Expose the 2D buffer (not the raw WebGL canvas) to consumers
    if (onCanvasReady) onCanvasReady(bc)

    const scene = new THREE.Scene()
    
    // Synthetic Studio Environment for reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x000000);
    
    // Add multiple light panels for premium reflections
    const createLight = (pos: [number, number, number], size: [number, number], color = 0xffffff) => {
      const light = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ color }));
      light.position.set(...pos);
      light.lookAt(0, 0, 0);
      envScene.add(light);
    }
    createLight([0, 20, 0], [40, 40]); // Top
    createLight([20, 5, 10], [10, 30]); // Right
    createLight([-20, 5, 10], [10, 30]); // Left
    
    scene.environment = pmremGenerator.fromScene(envScene).texture;
    sceneRef.current = scene

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    camera.position.set(0, 0, 50)
    cameraRef.current = camera

    scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    const key = new THREE.DirectionalLight(0xffffff, 4.0)
    key.position.set(10, 10, 10)
    scene.add(key)
    
    const rim = new THREE.DirectionalLight(0xffffff, 2.0)
    rim.position.set(-10, -10, -5)
    scene.add(rim)

    keyLightRef.current = key

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return

      const currentProps = propsRef.current
      const currentStore = useLabStore.getState()
      const currentState = currentProps.isSelected ? currentStore : (currentProps.fabricObject?.labParams ?? LAB_FILTER_DEFAULTS)

      let needsRender = isDraggingRef.current

      if (meshRef.current && !isDraggingRef.current) {
        const hasVel = Math.abs(velRef.current.x) > 0.0001 || Math.abs(velRef.current.y) > 0.0001
        if (hasVel) {
          const deltaQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(velRef.current.y, velRef.current.x, 0))
          meshRef.current.quaternion.multiplyQuaternions(deltaQ, meshRef.current.quaternion)
          velRef.current.x *= 0.92
          velRef.current.y *= 0.92
          needsRender = true
        }
        // Auto-rotation when enabled
        if (currentState.threeDMotion && currentState.threeDEnabled) {
          meshRef.current.rotation.y += 0.008
          needsRender = true
        }
      }

      if (forceRenderRef.current) { needsRender = true; forceRenderRef.current = false }

      if (needsRender) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
        // Copy WebGL frame → 2D buffer while we're still inside the RAF callback
        // (the WebGL context is guaranteed active here, so readback works)
        copyToBufferRef.current?.()
        if (currentProps.onFrameUpdate) {
          currentProps.onFrameUpdate('')
        }
      }
    }
    animate()

    return () => {
      const obj = propsRef.current.fabricObject
      if (obj && onCanvasReady) (obj as any)._threeDReady = false
      cancelAnimationFrame(frameRef.current)
      copyToBufferRef.current = null
      bufferCanvasRef.current = null
      bufferCtxRef.current = null
      pmremGenerator.dispose()
      if (geometryRef.current) { geometryRef.current.dispose(); geometryRef.current = null }
      if (hTexRef.current) { hTexRef.current.dispose(); hTexRef.current = null }
      Object.values(materialsRef.current).forEach((m: any) => m?.dispose?.())
      materialsRef.current = {}
      renderer.dispose()
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])


    // ── Build Geometry & Material ─────────────────────────────────────────────
  useEffect(() => {
    if (!sceneRef.current || !fabricObject || !rendererRef.current) return

    try {
      const hadValid3D = !!(fabricObject as any)._threeDReady && !!(fabricObject as any)._threeDCanvas
      if (!hadValid3D && onCanvasReady) (fabricObject as any)._threeDReady = false
      const wasPadding = fabricObject.padding
      const wasCaching = fabricObject.objectCaching

      const targetH = 512
      const currentH = fabricObject.height * (fabricObject.scaleY || 1)
      const multiplier = Math.max(2, Math.min(8, Math.ceil(targetH / Math.max(currentH, 1))))

      const captureCanvas = (withoutTransform: boolean) => fabricObject.toCanvasElement({
        multiplier,
        withoutShadow: true,
        withoutTransform,
      })
      const buildSilhouette = (source: HTMLCanvasElement) => {
        const sil = document.createElement('canvas')
        sil.width = source.width
        sil.height = source.height
        const ctx = sil.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(source, 0, 0)
        const data = ctx.getImageData(0, 0, sil.width, sil.height)
        let solid = 0
        let minX = sil.width, minY = sil.height, maxX = -1, maxY = -1
        for (let i = 0; i < data.data.length; i += 4) {
          const a = data.data[i + 3]
          if (a > 8) {
            solid++
            const px = (i / 4) % sil.width
            const py = Math.floor((i / 4) / sil.width)
            if (px < minX) minX = px
            if (py < minY) minY = py
            if (px > maxX) maxX = px
            if (py > maxY) maxY = py
          }
          data.data[i] = data.data[i + 1] = data.data[i + 2] = a
          data.data[i + 3] = 255
        }
        const cov = solid / Math.max(1, sil.width * sil.height)
        ctx.putImageData(data, 0, 0)
        if (solid === 0 || maxX < minX || maxY < minY) {
          return {
            sil,
            cov,
            meta: {
              sourceW: source.width,
              sourceH: source.height,
              tightW: source.width,
              tightH: source.height,
              tightCx: source.width / 2,
              tightCy: source.height / 2,
            },
          }
        }

        // Tight crop around visible alpha so the rotation pivot matches real content.
        const pad = 2
        const sx = Math.max(0, minX - pad)
        const sy = Math.max(0, minY - pad)
        const sw = Math.min(sil.width - sx, (maxX - minX + 1) + pad * 2)
        const sh = Math.min(sil.height - sy, (maxY - minY + 1) + pad * 2)
        const tight = document.createElement('canvas')
        tight.width = Math.max(1, sw)
        tight.height = Math.max(1, sh)
        const tctx = tight.getContext('2d')!
        tctx.drawImage(sil, sx, sy, sw, sh, 0, 0, sw, sh)
        return {
          sil: tight,
          cov,
          meta: {
            sourceW: source.width,
            sourceH: source.height,
            tightW: sw,
            tightH: sh,
            tightCx: sx + sw / 2,
            tightCy: sy + sh / 2,
          },
        }
      }

      // Capture 2D (primary: object-local space, no transforms)
      let objCanvas: HTMLCanvasElement | null = null
      try {
        fabricObject.padding = 10
        fabricObject.objectCaching = false
        fabricObject._isGenerating3D = true
        objCanvas = captureCanvas(true)
      } finally {
        // Always restore — even if captureCanvas throws.
        fabricObject._isGenerating3D = false
        fabricObject.objectCaching = wasCaching
        fabricObject.padding = wasPadding
      }

      if (!objCanvas || objCanvas.width === 0 || objCanvas.height === 0) {
        console.warn('[Vanguard3D] toCanvasElement returned empty canvas', { objCanvas })
        return
      }

      let { sil: silCvs, cov: coverage, meta } = buildSilhouette(objCanvas)
      if (coverage < 0.00005) {
        // Fallback: retry with world transforms preserved (e.g. scaled-down objects).
        const retryCanvas = captureCanvas(false)
        if (retryCanvas && retryCanvas.width > 0 && retryCanvas.height > 0) {
          objCanvas = retryCanvas
          const retry = buildSilhouette(retryCanvas)
          silCvs = retry.sil
          coverage = retry.cov
          meta = retry.meta
        }
      }

      if (coverage < 0.00005) {
        if (onCanvasReady) (fabricObject as any)._threeDReady = false
        console.warn('[Vanguard3D] Empty source mask, skip 3D frame', { coverage })
        return
      }
      ;(fabricObject as any)._threeDMeta = meta

      const aspect = silCvs.width / silCvs.height
      const padding = 2.0

      // Match renderer size to high-res capture aspect
      const renderW = Math.min(silCvs.width * padding, 2048)
      const renderH = renderW / aspect
      rendererRef.current.setSize(renderW, renderH, false)

      const PLANE_H = 6
      const planeW  = PLANE_H * aspect
      const cam = cameraRef.current as THREE.OrthographicCamera
      
      // Dynamic framing based on actual capture bounds
      cam.left   = -planeW / 2 * padding; cam.right = planeW / 2 * padding;
      cam.top    =  PLANE_H / 2 * padding; cam.bottom = -PLANE_H / 2 * padding;
      cam.updateProjectionMatrix()
      onAspectChange?.(aspect)

      // 3. Process Heightmap (already built in buildSilhouette)

      if (hTexRef.current) {
        hTexRef.current.image = silCvs
        hTexRef.current.needsUpdate = true
      } else {
        hTexRef.current = new THREE.CanvasTexture(silCvs)
        hTexRef.current.minFilter = THREE.LinearFilter
        hTexRef.current.magFilter = THREE.LinearFilter
      }
      
      if (geometryRef.current) geometryRef.current.dispose()
      geometryRef.current = new THREE.PlaneGeometry(planeW, PLANE_H, 256, 256)
      const geo = geometryRef.current
      geo.computeBoundingBox()
      const center = new THREE.Vector3()
      geo.boundingBox?.getCenter(center)
      geo.translate(-center.x, -center.y, -center.z)

      // Near-black fills produce invisible metallic surfaces → boost to silver.
      // Text default is #000000; reflective materials need a visible base color.
      let fill = typeof fabricObject.fill === 'string' ? fabricObject.fill : '#ffffff'
      const _fillC = new THREE.Color(fill)
      if (_fillC.r + _fillC.g + _fillC.b < 0.3) {
        _fillC.setRGB(0.75, 0.78, 0.82)
        fill = '#' + _fillC.getHexString()
      }
      const mat = buildMaterial(s, hTexRef.current, fill, materialsRef.current)
      
      if (!meshRef.current) {
        meshRef.current = new THREE.Mesh(geo, mat)
        sceneRef.current.add(meshRef.current)
      } else {
        meshRef.current.geometry = geo
        meshRef.current.material = mat
        if (meshRef.current.material.userData.shader) {
           meshRef.current.material.userData.shader.uniforms.uH.value = hTexRef.current
        }
      }

      meshRef.current.quaternion.setFromEuler(new THREE.Euler(
        (s.threeDRotX || 0) * (Math.PI / 180),
        (s.threeDRotY || 0) * (Math.PI / 180),
        (s.threeDRotZ || 0) * (Math.PI / 180),
        'XYZ'
      ))
      // Render once, then immediately copy to 2D buffer BEFORE setting _threeDReady.
      // Consumers check _threeDReady before reading _threeDCanvas; the buffer must
      // have valid pixels by the time the flag is raised.
      rendererRef.current.render(sceneRef.current, cameraRef.current)
      copyToBufferRef.current?.()
      if (onCanvasReady) {
        ;(fabricObject as any)._threeDReady = true
      }
      forceRenderRef.current = true  // keep next RAF paint for consistency
      onFrameUpdate?.('')

    } catch (e) { console.error('[Vanguard3D] build error:', e) }
  }, [s.threeDEnabled, s.threeDDepth, s.threeDMaterial, s.threeDInflation, fabricObject, s.threeDType])

  // ── Rotation Sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!meshRef.current || isDraggingRef.current) return
    meshRef.current.quaternion.setFromEuler(new THREE.Euler(
      (s.threeDRotX || 0) * (Math.PI / 180),
      (s.threeDRotY || 0) * (Math.PI / 180),
      (s.threeDRotZ || 0) * (Math.PI / 180),
      'XYZ'
    ))
    forceRenderRef.current = true
  }, [s.threeDRotX, s.threeDRotY, s.threeDRotZ])

  // ── Light Sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!keyLightRef.current) return
    keyLightRef.current.intensity = s.threeDLightIntensity ?? 4.0
    keyLightRef.current.color.set(s.threeDLightColor ?? '#ffffff')
    forceRenderRef.current = true
  }, [s.threeDLightIntensity, s.threeDLightColor])

  // ── Material Props Sync (metalness/roughness live update) ──────────────────
  useEffect(() => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as any
    if (mat.metalness !== undefined) mat.metalness = s.threeDMetalness ?? 0.5
    if (mat.roughness !== undefined) mat.roughness = s.threeDRoughness ?? 0.3
    mat.needsUpdate = true
    forceRenderRef.current = true
  }, [s.threeDMetalness, s.threeDRoughness])

  // ── Interaction ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fabricObject?.canvas || !isSelected) return
    const el = fabricObject.canvas.upperCanvasEl as HTMLCanvasElement
    let lx = 0, ly = 0
    
    const down = (e: MouseEvent) => {
      if (!e.altKey) return
      e.preventDefault(); e.stopImmediatePropagation()
      isDraggingRef.current = true; lx = e.clientX; ly = e.clientY
      if (typeof fabricObject.exitEditing === 'function') fabricObject.exitEditing()
    }
    const move = (e: MouseEvent) => {
      if (!isDraggingRef.current || !meshRef.current) return
      const dx = e.clientX - lx, dy = e.clientY - ly
      const sens = 0.008
      const dq = new THREE.Quaternion().setFromEuler(new THREE.Euler(dy*sens, dx*sens, 0))
      meshRef.current.quaternion.multiplyQuaternions(dq, meshRef.current.quaternion)
      velRef.current = { x: dx*sens, y: dy*sens }
      lx = e.clientX; ly = e.clientY
    }
    const up = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      const e = new THREE.Euler().setFromQuaternion(meshRef.current.quaternion, 'XYZ')
      useLabStore.getState().set({ 
        threeDRotX: e.x*180/Math.PI, 
        threeDRotY: e.y*180/Math.PI, 
        threeDRotZ: e.z*180/Math.PI 
      })
    }
    el.addEventListener('mousedown', down, true)
    window.addEventListener('mousemove', move, true)
    window.addEventListener('mouseup', up, true)
    return () => {
      el.removeEventListener('mousedown', down, true)
      window.removeEventListener('mousemove', move, true)
      window.removeEventListener('mouseup', up, true)
    }
  }, [fabricObject, isSelected])

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl bg-black/20 backdrop-blur-xl border border-white/5 group/vanguard">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* ── Rich UI HUD Overlay ── */}
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between font-mono text-[10px] uppercase tracking-[0.2em] opacity-0 group-hover/vanguard:opacity-100 transition-all duration-700 ease-out">
        <div className="flex justify-between items-start">
          <div className="space-y-2 bg-black/60 backdrop-blur-xl p-3 rounded-lg border border-white/10 shadow-2xl">
            <div className="flex justify-between gap-6">
              <span className="text-white/40">AXIS_X</span>
              <span className="text-accent font-bold">{(s.threeDRotX || 0).toFixed(1)}°</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-white/40">AXIS_Y</span>
              <span className="text-accent font-bold">{(s.threeDRotY || 0).toFixed(1)}°</span>
            </div>
            <div className="pt-1 mt-1 border-t border-white/5 flex justify-between gap-6">
              <span className="text-white/20">DEPTH</span>
              <span className="text-white/60">{(s.threeDDepth || 0).toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-black/60 backdrop-blur-xl p-3 rounded-lg border border-white/10 text-right shadow-2xl">
             <div className="text-accent font-black text-xs mb-0.5 tracking-tighter">VANGUARD_V9.0</div>
             <div className="text-white/30 text-[8px]">ULTRA_SDF_CORE</div>
             <div className="flex gap-1 justify-end mt-2">
                <div className="w-1 h-1 rounded-full bg-accent animate-ping" />
                <div className="w-1 h-1 rounded-full bg-accent/40" />
                <div className="w-1 h-1 rounded-full bg-accent/20" />
             </div>
          </div>
        </div>

        <div className="flex justify-between items-end">
           <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <div className="w-8 h-8 flex items-center justify-center relative">
                <div className="absolute inset-0 border border-accent/20 rounded-full animate-spin-slow" />
                <svg viewBox="0 0 100 100" className="w-5 h-5">
                   <g transform={`translate(50,50) rotate(${s.threeDRotZ || 0})`}>
                      <line x1="0" y1="0" x2="35" y2="0" stroke="#ff3366" strokeWidth="6" strokeLinecap="round" />
                      <line x1="0" y1="0" x2="0" y2="-35" stroke="#33ff55" strokeWidth="6" strokeLinecap="round" />
                   </g>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] text-white/30 leading-none">ORIENTATION</span>
                <span className="text-accent font-bold">STABLE</span>
              </div>
           </div>
           <div className="flex flex-col items-end gap-1">
              <div className="text-accent/60 animate-pulse text-[8px] font-bold">LIVE_RECONSTRUCTION</div>
              <div className="text-white/20 text-[6px]">SAMPLES: 256_PER_AXIS</div>
           </div>
        </div>
      </div>

      {/* ── Scanline Effect ── */}
      <div className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(51, 255, 85, 0.1) 3px, transparent 4px)`,
          backgroundSize: '100% 4px'
        }}
      />
    </div>
  )
}

function buildMaterial(s: any, hTex: any, color: any, cache: any) {
  const type = s.threeDMaterial || 'standard'
  const depth = (s.threeDDepth || 0.5) * 0.4 * (1.0 + (s.threeDInflation || 0))
  
  if (cache[type]) {
    const m = cache[type]
    m.displacementMap = hTex; m.displacementScale = depth
    if (m.userData.shader) m.userData.shader.uniforms.uH.value = hTex
    if (m.color && type !== 'hyperglass') m.color.set(type === 'neon' ? 0x000000 : color)
    if (m.emissive) m.emissive.set(color)
    if (m.metalness !== undefined) m.metalness = s.threeDMetalness ?? 0.5
    if (m.roughness !== undefined) m.roughness = s.threeDRoughness ?? 0.3
    m.needsUpdate = true
    return m
  }

  // Opaque material + discard is better for depth testing and sorting with displacement
  const p = { 
    transparent: false, 
    displacementMap: hTex, 
    displacementScale: depth, 
    side: THREE.DoubleSide, 
    envMapIntensity: 2.0 
  }
  let mat: any
  
  const metal = s.threeDMetalness ?? 0.5
  const rough = s.threeDRoughness ?? 0.3

  switch(type) {
    case 'holo':
      mat = new THREE.MeshPhysicalMaterial({ ...p, color, metalness: metal, roughness: rough, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1 }); break
    case 'hyperglass':
      mat = new THREE.MeshPhysicalMaterial({ ...p, transparent: true, color: 0xffffff, transmission: 1, thickness: 3, ior: 1.5, clearcoat: 1, attenuationColor: new THREE.Color(color), attenuationDistance: 1.5 }); break
    case 'neon':
      mat = new THREE.MeshPhysicalMaterial({ ...p, color: 0, emissive: color, emissiveIntensity: 10, metalness: metal, roughness: rough }); break
    case 'liquidmetal':
      mat = new THREE.MeshPhysicalMaterial({ ...p, color, metalness: metal, roughness: rough, clearcoat: 1, envMapIntensity: 3.0 }); break
    default:
      mat = new THREE.MeshPhysicalMaterial({ ...p, color, metalness: metal, roughness: rough, clearcoat: 0.5 })
  }

  mat.onBeforeCompile = (shader: any) => {
    mat.userData.shader = shader
    shader.uniforms.uH = { value: hTex }
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vUvH;')
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvUvH = uv;')
    
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uH;\nvarying vec2 vUvH;')
    
    // Inject discard early in the fragment shader to avoid expensive lighting calculations for empty pixels
     shader.fragmentShader = shader.fragmentShader.replace('void main() {', `
       void main() {
         float hv = texture2D(uH, vUvH).r;
         if (hv < 0.005) discard;
     `)

    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', `
      #include <normal_fragment_begin>
      
      // Calculate normal from heightmap gradient
      vec2 ts = vec2(1.0/512.0);
      float hL = texture2D(uH, vUvH - vec2(ts.x, 0.0)).r;
      float hR = texture2D(uH, vUvH + vec2(ts.x, 0.0)).r;
      float hU = texture2D(uH, vUvH - vec2(0.0, ts.y)).r;
      float hD = texture2D(uH, vUvH + vec2(0.0, ts.y)).r;
      
      // Compute surface gradient
      float strength = 10.0;
      vec3 gn = normalize(vec3((hL - hR) * strength, (hU - hD) * strength, 1.0));
      
      // Simple TBN reconstruction for plane
      vec3 N = normalize(vNormal);
      vec3 T = normalize(cross(N, vec3(0, 1, 0)));
      if (length(T) < 0.1) T = normalize(cross(N, vec3(1, 0, 0)));
      vec3 B = normalize(cross(N, T));
      mat3 tbn = mat3(T, B, N);
      
      normal = normalize(tbn * gn);
    `)
  }
  
  cache[type] = mat
  return mat
}
