/**
 * Shared types and default state for the Creative Studio canvas.
 */

import type * as fabric from 'fabric'

// ─── EXTENDED FABRIC OBJECT ──────────────────────────────────────────────────
// Intersection type that augments FabricObject with all custom runtime properties.
// Cast to this type instead of `as any` when accessing custom fields.

export type ExtendedFabricObject = fabric.FabricObject & {
  // Identity
  name: string
  id: string

  // Artboard
  isArtboard: boolean
  artboardColor: string

  // Video / media
  isVideo: boolean
  videoElement: HTMLVideoElement
  startTime: number
  endTime: number

  // Subtitle overlay
  isSubtitle: boolean

  // Physics (Matter.js body reference)
  matterBody: unknown

  // FX pipeline ─ maintained by reapplyAllEffects()
  _baseProps: {
    fill: unknown
    stroke: unknown
    strokeWidth: number
    shadow: fabric.Shadow | null
    skewX: number
    skewY: number
    fontWeight: string
    opacity: number
    [key: string]: unknown
  } | null
  _appliedFX: string[]
  _filterDirty: boolean
  fxProps: Record<string, Record<string, number>>

  // Image filters (fabric.Image has these, FabricObject base does not)
  filters: unknown[]
  applyFilters: () => void

  // Drawing / brushes
  isHandDrawn: boolean
  brushType: string

  // Arrow / connector (ArrowLine subclass)
  hasStartArrow: boolean
  hasEndArrow: boolean
  isConnector: boolean
  startObjId: string | null
  endObjId: string | null

  // Raster pixel layer
  isRasterLayer: boolean
  offscreenCanvas: OffscreenCanvas | null
}

// ─── SELECTION STATE ─────────────────────────────────────────────────────────

export interface SelState {
  type: 'text' | 'shape' | 'line' | 'image' | 'group' | 'artboard' | 'none'
  artboardName: string
  fontFamily: string
  fontSize: number
  bold: boolean
  italic: boolean
  underline: boolean
  linethrough: boolean
  textAlign: string
  fillColor: string
  strokeColor: string
  strokeWidth: number
  opacity: number
  hasStartArrow: boolean
  hasEndArrow: boolean
  isConnector: boolean
  lineHeight: number
  charSpacing: number
  shadowEnabled: boolean
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
  strokeText: boolean
  strokeTextColor: string
  strokeTextWidth: number
  brushType: string
  brushWidth: number
  brushColor: string
  brushThinning: number
  brushSmoothing: number
  brushStreamline: number
  brushTaperStart: number
  brushTaperEnd: number
  brushJitter: number
  isHandDrawn: boolean
  animation: 'pulse' | 'float' | 'shake' | 'spin' | null
  blendMode: string
  appliedFX: string[]
  fxProps: Record<string, Record<string, number>>
  cornerRadii: [number, number, number, number]
}

/** Default SelState — no object selected. */
export const D: SelState = {
  type: 'none',
  artboardName: '',
  fontFamily: 'Inter',
  fontSize: 24,
  bold: false,
  italic: false,
  underline: false,
  linethrough: false,
  textAlign: 'left',
  fillColor: '#ffffff',
  strokeColor: '#ffffff',
  strokeWidth: 2,
  opacity: 100,
  hasStartArrow: false,
  hasEndArrow: false,
  isConnector: false,
  lineHeight: 1.2,
  charSpacing: 0,
  shadowEnabled: false,
  shadowColor: '#000000',
  shadowBlur: 10,
  shadowOffsetX: 4,
  shadowOffsetY: 4,
  strokeText: false,
  strokeTextColor: '#000000',
  strokeTextWidth: 1,
  brushType: 'pencil',
  brushWidth: 3,
  brushColor: '#ffffff',
  brushThinning: 0,
  brushSmoothing: 30,
  brushStreamline: 50,
  brushTaperStart: 0,
  brushTaperEnd: 0,
  brushJitter: 0,
  isHandDrawn: false,
  animation: null,
  blendMode: 'source-over',
  appliedFX: [],
  fxProps: {},
  cornerRadii: [0, 0, 0, 0],
}
