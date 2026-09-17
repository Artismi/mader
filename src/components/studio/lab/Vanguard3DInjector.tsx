import React, { useEffect } from 'react'
import { Vanguard3DEngine } from './Vanguard3DEngine'
import { useLabStore } from '../hooks/use-lab-store'

interface Props {
  fabricObject: any
  fabricCanvas: any
  isSelected: boolean
}

export function Vanguard3DInjector({ fabricObject, fabricCanvas, isSelected }: Props) {
  const storeThreeD = useLabStore(s => s.threeDEnabled)
  // Stabilize is3D state: it's active if the object has it enabled OR if the store has it enabled while selected.
  // We use a ref to prevent flickering during rapid selection changes.
  const is3D = (fabricObject.labParams?.threeDEnabled ?? false) || (isSelected && storeThreeD)

  useEffect(() => {
    const obj = fabricObject as any
    
    // 1. Cleanup: Restore original state if 3D is totally disabled
    if (!is3D) {
      if (obj._originalDrawObject) {
        obj.drawObject = obj._originalDrawObject
        delete obj._originalDrawObject
      }
      if (obj._originalObjectCaching !== undefined) {
        obj.objectCaching = obj._originalObjectCaching
        delete obj._originalObjectCaching
      }
      obj._threeDReady = false
      delete obj._threeDCanvas
      delete obj._threeDMeta
      obj.dirty = true
      fabricCanvas.requestRenderAll()
      return
    }

    if (obj._originalObjectCaching === undefined) {
      obj._originalObjectCaching = obj.objectCaching
    }
    obj.objectCaching = false
    obj.dirty = true

    // 2. Setup: Override drawObject to inject the 3D overlay
    if (!obj._originalDrawObject) {
      obj._originalDrawObject = obj.drawObject
      
      obj.drawObject = function(ctx: CanvasRenderingContext2D, ...args: any[]) {
        // During 3D capture: render 2D so toCanvasElement gets clean pixels.
        if (this._isGenerating3D) {
          this._originalDrawObject(ctx, ...args)
          return
        }

        // Always render base 2D first to avoid full invisibility in edge cases.
        this._originalDrawObject(ctx, ...args)

        // 3D ready: overlay the 3D canvas centered on the object.
        const hasThreeDCanvas = !!this._threeDCanvas && this._threeDCanvas.width > 0 && this._threeDCanvas.height > 0 && !!this._threeDReady
        if (hasThreeDCanvas) {
          ctx.save()
          const baseW = Math.max(1, this.width || this._threeDCanvas.width / 2) * 2.0
          const baseH = Math.max(1, this.height || this._threeDCanvas.height / 2) * 2.0
          ctx.drawImage(this._threeDCanvas, -baseW / 2, -baseH / 2, baseW, baseH)
          ctx.restore()
        }
      }
    }

    // Cleanup: restore drawObject and state when 3D is disabled or component unmounts.
    return () => {
      if (obj._originalDrawObject) {
        obj.drawObject = obj._originalDrawObject
        delete obj._originalDrawObject
      }
      if (obj._originalObjectCaching !== undefined) {
        obj.objectCaching = obj._originalObjectCaching
        delete obj._originalObjectCaching
      }
      obj._threeDReady = false
      obj._isGenerating3D = false
      delete obj._threeDCanvas
      delete obj._threeDMeta
      obj.dirty = true
      fabricCanvas?.requestRenderAll()
    }
  }, [is3D, fabricObject, fabricCanvas])

  if (!is3D) return null

  return (
    // position:fixed keeps this off every screen regardless of scroll/DOM nesting.
    // Full 2048×2048 size (no overflow clipping, no opacity:0) ensures the WebGL
    // context renders at full resolution — 1×1 + opacity:0 can cause Chrome to
    // throttle or skip compositing the backing store before readPixels.
    <div style={{
      position: 'fixed',
      top: -9999,
      left: -9999,
      width: 2048,
      height: 2048,
      overflow: 'visible',
      pointerEvents: 'none',
      zIndex: -1,
    }}>
      <Vanguard3DEngine
        fabricObject={fabricObject}
        isSelected={isSelected}
        onCanvasReady={(c) => {
          // Store the buffer canvas reference. Do NOT touch _threeDReady here —
          // the geometry build inside Vanguard3DEngine sets it to true once the
          // first valid frame is rendered. Clearing it here would race-condition
          // against that set and leave the overlay permanently blank.
          fabricObject._threeDCanvas = c
          fabricObject.dirty = true
        }}
        onFrameUpdate={() => {
          // Re-assert _threeDReady every frame so any incidental clear (e.g. from
          // cleanup deps firing between renders) doesn't permanently kill the overlay.
          const c = fabricObject._threeDCanvas as HTMLCanvasElement | undefined
          if (c && c.width > 0 && c.height > 0) {
            fabricObject._threeDReady = true
          }
          fabricObject.objectCaching = false
          fabricObject.dirty = true
          fabricCanvas.requestRenderAll()
        }}
      />
    </div>
  )
}
