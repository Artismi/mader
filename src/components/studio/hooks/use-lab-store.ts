import { create } from 'zustand'

export type LabLayerType = 'CRT' | 'DITHER' | 'BLOOM' | 'POST'

export interface LabStore {
  // Pattern Settings (Base Layer)
  patternEnabled: boolean
  patternType: number
  patternScale: number
  patternThickness: number
  patternColor: string
  patternBlendMode: number  // 0=multiply, 1=screen, 2=overlay, 3=add

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
  cinemaDitherEnabled: boolean

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

  // Color Grading
  colorGradeEnabled: boolean
  gradeExposure: number
  gradeContrast: number
  gradeSaturation: number
  gradeVibrance: number
  gradeTemperature: number
  gradeHue: number
  gradeToneMap: number  // 0 = linear, 1 = ACES

  // Halftone Settings
  halftoneEnabled: boolean
  halftoneSpacing: number
  halftoneDotSize: number
  halftoneAngle: number
  halftoneMode: number

  // Dot Matrix Settings
  dotMatrixEnabled: boolean
  dotMatrixSpacing: number      // grid cell size in UV (0.01–0.12)
  dotMatrixDotSize: number      // dot radius relative to cell (0.1–0.9)
  dotMatrixThreshold: number    // luminance threshold for content-aware activation
  dotMatrixShape: number        // 0=circle, 1=square
  dotMatrixPattern: number      // 0=grid, 1=checker, 2=vertical, 3=horizontal
  dotMatrixMotion: number       // 0=none,1=pulse,2=wave,3=rand,4=swirl,5=slide
  dotMatrixSpeed: number
  dotMatrixStrength: number
  dotMatrixPatScale: number     // wave phase accumulation factor
  dotMatrixAngle: number        // slide direction (radians)
  dotMatrixDotW: number         // dot aspect X
  dotMatrixDotH: number         // dot aspect Y

  // Chladni Particle Field Settings
  chladniEnabled: boolean
  chladniM: number              // wave segments along X (1–8)
  chladniN: number              // wave segments along Y (1–8)
  chladniDensity: number        // particle grid cell size in UV
  chladniParticleSize: number   // dot radius relative to cell
  chladniSettle: number         // 0=at grid centers, 1=on nodal lines
  chladniSpeed: number
  chladniIntensity: number      // overlay opacity (0–1)
  chladniColor: string
  chladniUseSourceColor: boolean

  // Filter target
  filterTarget: 'object' | 'artboard'
  isolationActive: boolean
  // Threshold Settings
  thresholdEnabled: boolean
  thresholdValue: number
  thresholdSmoothing: number

  // Noise Settings
  noiseEnabled: boolean
  noiseIntensity: number
  noiseMonochrome: boolean

  // Fog Pointcloud Settings
  fogEnabled: boolean
  fogDensity: number
  fogOscillation: number
  fogDepth: number
  fogLuminescence: number
  fogPointScale: number

  // 3D Genesis
  threeDEnabled: boolean
  threeDType: number
  threeDDepth: number
  threeDBevel: number
  threeDMaterial: string
  threeDMetalness: number
  threeDRoughness: number
  threeDRefraction: number
  threeDInflation: number
  threeDRoundness: number
  threeDMotion: boolean
  threeDRotX: number
  threeDRotY: number
  threeDRotZ: number

  // 3D Manipulation & Visuals (Adjustable)
  threeDInertia: number
  threeDSnap: boolean
  threeDSnapAngle: number
  threeDGridEnabled: boolean
  threeDGridOpacity: number
  threeDScanlineEnabled: boolean
  threeDScanlineIntensity: number
  threeDLightColor: string
  threeDLightIntensity: number

  // Global & Workflow
  labActive: boolean
  animated: boolean  // true = live animation, false = frozen time (static export)
  /** Animation engine clock (-1 = use wall clock, ≥0 = locked to keyframe time) */
  animTime: number
  set: (params: Partial<LabStore>) => void
}

// Keys that belong to the global session, not stored per-object
export const LAB_GLOBAL_KEYS = new Set([
  'set', 'labActive', 'filterTarget', 'isolationActive', 'animated', 'animTime',
  'bpmSource', 'bpmValue', 'bpmActive',
  'springEnabled', 'springStiffness', 'springDamping', 'springMass',
  'trailEnabled', 'trailPersistence', 'trailScale', 'reactiveTypography',
  'cinemaDitherEnabled',
])

// Per-object filter defaults — what a "clean" object looks like before any Lab edits
export const LAB_FILTER_DEFAULTS = {
  patternEnabled: false, patternType: 0, patternScale: 50.0, patternThickness: 0.2, patternColor: '#33ff55', patternBlendMode: 0,
  crtEnabled: false, crtMode: 1, crtMaskScale: 6.0, crtMaskIntensity: 0.8, crtScanlineIntensity: 0.25,
  crtDistortion: 0.15, crtConvergence: 2.0, crtBeamFocus: 0.6, crtPersistence: 0.4, crtBrightness: 1.1,
  ditherEnabled: false, ditherMode: 0, ditherColorDepth: 8,
  bloomEnabled: false, bloomIntensity: 1.5, bloomThreshold: 0.1, bloomRadius: 0.5, bloomSmoothing: 0.9,
  liquidEnabled: false, liquidIntensity: 0.5, liquidViscosity: 0.4, liquidComplexity: 3.0, liquidSurfaceGlow: 0.5,
  vhsEnabled: false, vhsIntensity: 0.5, vhsBleed: 0.5, vhsTracking: 0.5,
  glitchEnabled: false, glitchAmount: 0.4, glitchSeed: 1.0,
  motionBlurEnabled: false, motionBlurIntensity: 0.5,
  colorGradeEnabled: false, gradeExposure: 0, gradeContrast: 1.0, gradeSaturation: 1.0, gradeVibrance: 0,
  gradeTemperature: 0, gradeHue: 0, gradeToneMap: 0,
  halftoneEnabled: false, halftoneSpacing: 0.010, halftoneDotSize: 0.85, halftoneAngle: 0.0, halftoneMode: 0,
  selectionRect: [0, 0, 1, 1] as [number, number, number, number],
  selectionActive: false, selectionFeather: 0.02,

  // Dot Matrix Defaults
  dotMatrixEnabled: false, dotMatrixSpacing: 0.016, dotMatrixDotSize: 0.50,
  dotMatrixThreshold: 0.0, dotMatrixShape: 0, dotMatrixPattern: 0,
  dotMatrixMotion: 0, dotMatrixSpeed: 1.0, dotMatrixStrength: 0.5,
  dotMatrixPatScale: 1.0, dotMatrixAngle: 0.0, dotMatrixDotW: 1.0, dotMatrixDotH: 1.0,

  // Chladni Defaults
  chladniEnabled: false, chladniM: 3, chladniN: 2, chladniDensity: 0.022,
  chladniParticleSize: 0.20, chladniSettle: 0.85, chladniSpeed: 1.0,
  chladniIntensity: 0.9, chladniColor: '#ffffff', chladniUseSourceColor: true,

  thresholdEnabled: false, thresholdValue: 0.5, thresholdSmoothing: 0.1,
  
  noiseEnabled: false, noiseIntensity: 0.1, noiseMonochrome: true,

  fogEnabled: false, fogDensity: 0.5, fogOscillation: 0.5, fogDepth: 0.5,
  fogLuminescence: 0.8, fogPointScale: 1.0,

  // 3D Genesis Defaults
  threeDEnabled: false, threeDType: 0, threeDDepth: 0.5, threeDBevel: 0.05,
  threeDMaterial: 'liquidmetal', threeDMetalness: 0.8, threeDRoughness: 0.2,
  threeDRefraction: 1.5, threeDInflation: 0.0, threeDRoundness: 0.05,
  threeDMotion: true,
  threeDRotX: 0,
  threeDRotY: 0,
  threeDRotZ: 0,
  threeDInertia: 0.85,
  threeDSnap: false,
  threeDSnapAngle: 90,
  threeDGridEnabled: false,
  threeDGridOpacity: 0.2,
  threeDScanlineEnabled: false,
  threeDScanlineIntensity: 0.3,
  threeDLightColor: '#ffffff',
  threeDLightIntensity: 3.5,
} as const

export const useLabStore = create<LabStore>((set) => ({
  patternEnabled: false,
  patternType: 0,
  patternScale: 50.0,
  patternThickness: 0.2,
  patternColor: '#33ff55',
  patternBlendMode: 0,

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
  cinemaDitherEnabled: false,

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

  colorGradeEnabled: false,
  gradeExposure: 0,
  gradeContrast: 1.0,
  gradeSaturation: 1.0,
  gradeVibrance: 0,
  gradeTemperature: 0,
  gradeHue: 0,
  gradeToneMap: 0,

  halftoneEnabled: false,
  halftoneSpacing: 0.010,
  halftoneDotSize: 0.85,
  halftoneAngle: 0.0,
  halftoneMode: 0,

  dotMatrixEnabled: false,
  dotMatrixSpacing: 0.016,
  dotMatrixDotSize: 0.50,
  dotMatrixThreshold: 0.0,
  dotMatrixShape: 0,
  dotMatrixPattern: 0,
  dotMatrixMotion: 0,
  dotMatrixSpeed: 1.0,
  dotMatrixStrength: 0.5,
  dotMatrixPatScale: 1.0,
  dotMatrixAngle: 0.0,
  dotMatrixDotW: 1.0,
  dotMatrixDotH: 1.0,

  chladniEnabled: false,
  chladniM: 3,
  chladniN: 2,
  chladniDensity: 0.022,
  chladniParticleSize: 0.20,
  chladniSettle: 0.85,
  chladniSpeed: 1.0,
  chladniIntensity: 0.9,
  chladniColor: '#ffffff',
  chladniUseSourceColor: true,

  thresholdEnabled: false,
  thresholdValue: 0.5,
  thresholdSmoothing: 0.1,

  noiseEnabled: false,
  noiseIntensity: 0.1,
  noiseMonochrome: true,

  fogEnabled: false,
  fogDensity: 0.5,
  fogOscillation: 0.5,
  fogDepth: 0.5,
  fogLuminescence: 0.8,
  fogPointScale: 1.0,

  filterTarget: 'artboard',
  isolationActive: false,

  threeDEnabled: false,
  threeDType: 0,
  threeDDepth: 0.5,
  threeDBevel: 0.05,
  threeDMaterial: 'liquidmetal',
  threeDMetalness: 0.8,
  threeDRoughness: 0.2,
  threeDRefraction: 1.5,
  threeDInflation: 0.0,
  threeDRoundness: 0.05,
  threeDMotion: true,
  threeDRotX: 0,
  threeDRotY: 0,
  threeDRotZ: 0,
  threeDInertia: 0.85,
  threeDSnap: false,
  threeDSnapAngle: 90,
  threeDGridEnabled: false,
  threeDGridOpacity: 0.2,
  threeDScanlineEnabled: false,
  threeDScanlineIntensity: 0.3,
  threeDLightColor: '#ffffff',
  threeDLightIntensity: 3.5,

  labActive: false,
  animated: false,
  animTime: -1,
  set: (params) => set((state) => ({ ...state, ...params })),
}))
