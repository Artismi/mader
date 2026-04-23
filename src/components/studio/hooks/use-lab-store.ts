import { create } from 'zustand'

export type LabLayerType = 'CRT' | 'DITHER' | 'BLOOM' | 'POST'

export interface LabStore {
  // Pattern Settings (Base Layer)
  patternType: number
  patternScale: number
  patternThickness: number
  patternColor: string

  // CRT Settings
  crtEnabled: boolean
  crtMode: number // 1: Slot, 2: Shadow, 3: Aperture
  crtMaskScale: number
  crtMaskIntensity: number
  crtScanlineIntensity: number
  crtDistortion: number
  crtConvergence: number
  crtBeamFocus: number
  crtPersistence: number
  crtBrightness: number

  // Dither Settings
  ditherEnabled: boolean
  ditherMode: number // 0: Bayer 4x4, 1: Bayer 8x8
  ditherColorDepth: number

  // Bloom Settings
  bloomEnabled: boolean
  bloomIntensity: number
  bloomThreshold: number
  bloomRadius: number
  bloomSmoothing: number

  // Liquid Settings
  liquidEnabled: boolean
  liquidIntensity: number
  liquidViscosity: number
  liquidComplexity: number
  liquidSurfaceGlow: number

  // VHS Settings
  vhsEnabled: boolean
  vhsIntensity: number
  vhsBleed: number
  vhsTracking: number

  // Glitch Settings
  glitchEnabled: boolean
  glitchAmount: number
  glitchSeed: number

  // Vanguard V6: Physics & Motion
  springEnabled: boolean
  springStiffness: number
  springDamping: number
  springMass: number
  
  motionBlurEnabled: boolean
  motionBlurIntensity: number
  
  trailEnabled: boolean
  trailPersistence: number
  trailScale: number

  reactiveTypography: boolean

  // BPM & Global Clock
  bpmSource: 'auto' | 'manual'
  bpmValue: number
  bpmActive: boolean

  // Selection Tracking (for Selective Filtering)
  selectionRect: [number, number, number, number] // [x, y, w, h] normalized 0-1
  selectionActive: boolean
  selectionFeather: number

  // Global & Workflow
  labActive: boolean
  set: (params: Partial<LabStore>) => void
}

export const useLabStore = create<LabStore>((set) => ({
  // Defaults based on Shader Lab Clone Engine V3 specs
  patternType: 0,
  patternScale: 50.0,
  patternThickness: 0.2,
  patternColor: '#33ff55',

  crtEnabled: false,
  crtMode: 1,
  crtMaskScale: 6.0,
  crtMaskIntensity: 0.8,
  crtScanlineIntensity: 0.25,
  crtDistortion: 0.15,
  crtConvergence: 2.0,
  crtBeamFocus: 0.6,
  crtPersistence: 0.4,
  crtBrightness: 1.1,

  ditherEnabled: false,
  ditherMode: 0,
  ditherColorDepth: 8,

  bloomEnabled: false,
  bloomIntensity: 1.5,
  bloomThreshold: 0.1,
  bloomRadius: 0.5,
  bloomSmoothing: 0.9,

  liquidEnabled: false,
  liquidIntensity: 0.5,
  liquidViscosity: 0.4,
  liquidComplexity: 3.0,
  liquidSurfaceGlow: 0.5,

  vhsEnabled: false,
  vhsIntensity: 0.5,
  vhsBleed: 0.5,
  vhsTracking: 0.5,

  glitchEnabled: false,
  glitchAmount: 0.4,
  glitchSeed: 1.0,

  springEnabled: false,
  springStiffness: 150.0,
  springDamping: 15.0,
  springMass: 1.0,

  motionBlurEnabled: false,
  motionBlurIntensity: 0.5,

  trailEnabled: false,
  trailPersistence: 0.85,
  trailScale: 1.0,

  reactiveTypography: false,

  bpmSource: 'manual',
  bpmValue: 120,
  bpmActive: false,

  selectionRect: [0, 0, 1, 1],
  selectionActive: false,
  selectionFeather: 0.02,

  labActive: false,
  set: (params) => set((state) => ({ ...state, ...params })),
}))
