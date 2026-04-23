/**
 * Creative OS — Custom Fabric.js Filter Extensions (v3)
 * 
 * This file acts as the main entry point for the modular filter system.
 * Filters are separated into submodules for better performance and maintainability.
 */

import * as fabric from 'fabric'

// Re-export shared utilities
export * from './filters/shared-utils'

// Re-export categories
export * from './filters/motion-filters'
export * from './filters/optical-filters'
export * from './filters/texture-filters'
export * from './filters/style-filters'

// Import for internal use in the patch
import { 
  Glitch, WavyFilter, LiquidMotionFilter, 
  VHSFilter, MatrixFilter, LiquidMetalFilter,
  AdvancedCRTFilter
} from './filters/motion-filters'
import { 
  ThermalFilter, PrismFilter, NeonGlowFilter, 
  HolographicFilter, BloomFilter, PixelateFilter 
} from './filters/optical-filters'
import { 
  GrainFilter, FiberFilter, EliteHalftone, ASCIIFilter,
  DitheringFilter
} from './filters/texture-filters'
import { 
  Risograph, EliteClay, OilPaintFilter, OutlineFilter, 
  DuotoneFilter, VignetteFilter, PosterizeFilter, 
  VolumetricDepthFilter 
} from './filters/style-filters'

// ─── FILTER ENGINE PATCH ──────────────────────────────────────────────────────
// Extends Fabric.js objects to support WebGL/CPU filters by intercepting the
// built-in caching system.

// @ts-ignore
const originalDrawCache = fabric.Object.prototype._drawCache

/**
 * PHASE 2: Dynamic Padding (Fix Clipping)
 * Increases the selection area to accommodate distortions (waves, glitches, glows).
 */
// @ts-ignore
fabric.Object.prototype.applyFilters = function() {
  if (!this.filters || this.filters.length === 0) {
    this.padding = 0
    if (!this.isVideo) this.set('objectCaching', false)
  } else {
    let maxMargin = 0
    this.filters.forEach((f: any) => {
      const type = f.constructor.type || f.type
      if (type === 'Wavy')       maxMargin = Math.max(maxMargin, (f.uIntensity || 0) * 2.5)
      if (type === 'Glitch')     maxMargin = Math.max(maxMargin, (f.uAmount || 0) * 3.0)
      if (type === 'LiquidMotion') maxMargin = Math.max(maxMargin, (f.uIntensity || 0) * 2.0 * (f.uScale || 1))
      if (type === 'LiquidMarbling') maxMargin = Math.max(maxMargin, (f.uIntensity || 0) * 3.5 * (f.uScale || 1))
      if (type === 'NeonGlow' || type === 'Neon') maxMargin = Math.max(maxMargin, (f.uRadius || 0) * 2.5)
      if (type === 'Bloom' || type === 'BloomFilter') maxMargin = Math.max(maxMargin, (f.uRadius || 0) * 1.5)
      if (type === 'Outline' || type === 'OutlineFilter') maxMargin = Math.max(maxMargin, (f.uThickness || 0) * 1.5)
      if (type === 'VolumetricDepthFilter') maxMargin = Math.max(maxMargin, (f.uDepth || 0) * 100)
      if (type === 'AdvancedCRT' || type === 'AdvancedCRTFilter') maxMargin = Math.max(maxMargin, (f.uDistortion || 0) * 30.0 + (f.uConvergence || 0) * 5.0)
    })
    this.padding = Math.ceil(maxMargin)
    // Ensure text objects are cached so WebGL filters can be applied
    if (['text', 'i-text', 'textbox'].includes(this.type)) {
      this.set('objectCaching', true);
      (this as any)._filterDirty = true;
      this.dirty = true;
    }
  }
  this.dirty = true
  this.canvas?.requestRenderAll()
}

/**
 * PHASE 1: On-The-Fly Rasterization Engine
 * Intercepts the rendering call to bridge Fabric.js cache with WebGL filters.
 */
// @ts-ignore
fabric.Object.prototype._drawCache = function(ctx: CanvasRenderingContext2D) {
  const isDirty = (this as any)._filterDirty || (this as any).isCacheDirty?.() || this.dirty;

  if (this.filters && this.filters.length > 0 && isDirty) {
    ;(this as any)._filterDirty = false
    this.dirty = true
    
    // @ts-ignore
    this._renderCache()
    
    const cacheEl = (this as any).cacheCanvasEl || (this as any)._cacheCanvas;
    if (cacheEl) {
      const backend = (fabric as any).getFilterBackend?.() || (fabric as any).filterBackend
      if (backend) {
        try {
          backend.applyFilters(
            this.filters,
            cacheEl,
            cacheEl.width,
            cacheEl.height,
            cacheEl
          )
        } catch (e) {
          console.warn('WebGL Filter application failed:', e)
          ;(this as any)._filterDirty = true
        }
      }
    }
    this.dirty = false
  }
  
  originalDrawCache.call(this, ctx)
}
