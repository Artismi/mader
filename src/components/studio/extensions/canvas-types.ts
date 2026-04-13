/**
 * Shared types and default state for the Creative Studio canvas.
 */

// ─── SELECTION STATE ─────────────────────────────────────────────────────────

export interface SelState {
  type: 'text' | 'shape' | 'line' | 'image' | 'group' | 'none'
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
}

/** Default SelState — no object selected. */
export const D: SelState = {
  type: 'none',
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
}
