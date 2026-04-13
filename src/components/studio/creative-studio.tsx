'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as fabric from 'fabric'
import {
  MousePointer2, Type, Square, Circle, Minus, Pencil, Eraser, ImageIcon,
  ZoomIn, ZoomOut, Save, Download, Undo2, Redo2,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link2, Sparkles, Trash2, ChevronDown, ChevronLeft, Layers,
  ArrowRight, ArrowLeft, ArrowLeftRight, Library,
  LassoSelect, Zap, Star, Scissors, PenTool,
  Eye, EyeOff, Lock, Unlock, GripVertical, Sliders, X, Palette,
  Search, Cpu, Highlighter, Play, Merge, Ghost, Maximize2, Heart, Droplets,
  Waves, Cloud, Triangle, LayoutList, LayoutGrid, Magnet
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type BzAnchor,
  anchorsToBzPath, makeAnchor, makeSmoothAnchor,
  closestOnBzPath, splitBzPath, insertAnchorAt, mirrorHandle,
} from './bezier-utils'
import polygonClipping from 'polygon-clipping'
import ImageTracer from 'imagetracerjs'
import rough from 'roughjs'
import * as Matter from 'matter-js'

// Libraries
import { ALL_FONTS, FONT_CATEGORIES, injectGoogleFont } from './libraries/font-library'
import { TEXTURE_LIBRARY, BRICOLAGE_ASSETS } from './libraries/texture-library'
import { SHAPE_LIBRARY, ICONS_LIBRARY } from './libraries/shape-library'
import { PRO_ASSETS } from './libraries/pro-assets'
import {
  BRUSH_TYPES, createCrayonBrush, createSprayBrush,
  createMarkerBrush, createInkBrush, createGenerativeBrush,
  createGlowBrush, createNeonBrush, createCharcoalBrush,
  createWatercolorBrush, createDottedBrush, createDashedBrush,
  createChromeBrush, DeepInkBrush, ToxicThornBrush,
  createGlitchBrush, CalligraphyBrush,
  LiquidBrush
} from './libraries/brush-library'
import { generateProceduralPattern, ProceduralType } from './libraries/procedural-generators'

// ─── FABRIC EXTENSIONS ───────────────────────────────────────────────────────
// Filters, ArrowLine, connector math and canvas types live in dedicated modules.
// Importing them here registers all classRegistry entries as a side effect.
import './extensions/filters'  // registers 15 custom filters + patches _drawCache
import {
  clamp,
  // Motion (animated)
  Glitch, WavyFilter, LiquidMotionFilter, VHSFilter, MatrixFilter, LiquidMetalFilter,
  // Optical
  ThermalFilter, PrismFilter, NeonGlowFilter, HolographicFilter, BloomFilter, PixelateFilter,
  // Texture
  GrainFilter, FiberFilter, EliteHalftone, ASCIIFilter,
  // Style
  Risograph, EliteClay, OilPaintFilter, OutlineFilter,
  DuotoneFilter, VignetteFilter, PosterizeFilter, VolumetricDepthFilter,
} from './extensions/filters'

import { solveBoard, type LayoutBoard } from '@/lib/design/engine'
import * as generative from '@/lib/design/generative'


import { UniversalLaunchHub } from './universal-launch-hub'
import { CervelloDashboard } from '@/components/ui/cervello-dashboard'

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface CanvasClient { id: string; name: string }

interface DesignProjectItem {
  id: string
  client_id: string | null
  name: string
  canvas_state: string | null
  updated_at: string
}

type ArtboardExportType = 'social' | 'story' | 'newsletter' | 'whatsapp' | 'document' | 'print'

interface Props {
  clients?: CanvasClient[]
  designProjects?: DesignProjectItem[]
  onSaveProject?: (data: {
    id: string | null
    name: string
    clientId: string | null
    canvasState: string
    thumbnail?: string | null
  }) => Promise<string>
  onDeleteProject?: (id: string) => Promise<void>
  onClientChange?: (clientId: string | null) => void
  onDropImage?: (url: string) => void
  onAICommand?: any
  aiCommands?: any[]
  onClearAICommands?: () => void
  onCanvasSnapshot?: (snapshot: string | null) => void
  imageUrlQueue?: string | null
}

type Tool = 'select' | 'lasso' | 'text' | 'rect' | 'circle' | 'line' | 'pen' | 'pencil' | 'eraser' | 'image' | 'scissors'

// ─── FONTS ───────────────────────────────────────────────────────────────────

// Google Fonts logic moved to library

function loadGoogleFonts() {
  const eliteFonts = [
    'Montserrat:wght@300;400;700',
    'Cormorant+Garamond:wght@300;400;700',
    'Archivo+Black',
    'Syncopate:wght@400;700',
    'Space+Mono:wght@400;700',
    'Playfair+Display:wght@400;700',
    'Unbounded:wght@300;400;700',
    'Anton',
    'Staatliches',
    'Syne:wght@400;700;800'
  ]
  const fams = eliteFonts.join('&family=')
  const l = document.createElement('link')
  l.rel = 'stylesheet'
  l.href = `https://fonts.googleapis.com/css2?family=${fams}&display=swap`
  document.head.appendChild(l)
}

// ─── DROPDOWN PORTAL ─────────────────────────────────────────────────────────
// Renders dropdown content into document.body via portal, positioned relative
// to a trigger element. Escapes any overflow-hidden/overflow-x-auto clipping.

function DropdownPortal({
  triggerRef, children, openUp = false, alignRight = false,
}: {
  triggerRef: React.RefObject<HTMLElement | null>
  children: React.ReactNode
  openUp?: boolean
  alignRight?: boolean
}) {
  const [pos, setPos] = React.useState<React.CSSProperties | null>(null)
  React.useEffect(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const style: React.CSSProperties = openUp
      ? { bottom: window.innerHeight - r.top + 4, ...(alignRight ? { right: window.innerWidth - r.right } : { left: r.left }) }
      : { top: r.bottom + 4, ...(alignRight ? { right: window.innerWidth - r.right } : { left: r.left }) }
    setPos(style)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!pos || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed z-[200]" style={pos}>{children}</div>,
    document.body
  )
}

// ─── PALETTE / GRADIENTS / SHAPES / ICONS ────────────────────────────────────

// Flatten the SHAPE_LIBRARY into a single map for quick AI/Tool access
const SHAPE_MAP: Record<string, string> = Object.values(SHAPE_LIBRARY).flat().reduce((acc, shape) => {
  acc[shape.name] = shape.path
  return acc
}, {} as Record<string, string>)

const PALETTE = ['#ffffff', '#000000', '#f5f5f5', '#1a1a1a', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#0ea5e9', '#f59e0b', '#10b981']

const GRADIENT_PRESETS = [
  { name: 'Tramonto', colors: ['#ff6b6b', '#feca57'] },
  { name: 'Oceano', colors: ['#0abde3', '#a29bfe'] },
  { name: 'Foresta', colors: ['#00b894', '#a8e063'] },
  { name: 'Viola', colors: ['#6c5ce7', '#fd79a8'] },
  { name: 'Fuoco', colors: ['#e17055', '#d63031'] },
  { name: 'Notte', colors: ['#2d3436', '#74b9ff'] },
  { name: 'Rosa', colors: ['#fd79a8', '#fddb92'] },
  { name: 'Menta', colors: ['#00b894', '#00cec9'] },
  { name: 'Aurora', colors: ['#a29bfe', '#00cec9'] },
  { name: 'Oro', colors: ['#f9ca24', '#f0932b'] },
]

// Libraries moved to external files

const ARTBOARDS: { label: string; w: number; h: number; exportType: ArtboardExportType }[] = [
  { label: 'Post Social 1:1', w: 1080, h: 1080, exportType: 'social' },
  { label: 'Story/Reel 9:16', w: 1080, h: 1920, exportType: 'story' },
  { label: 'Cover 16:9', w: 1920, h: 1080, exportType: 'social' },
  { label: 'Newsletter', w: 600, h: 900, exportType: 'newsletter' },
  { label: 'WhatsApp', w: 800, h: 600, exportType: 'whatsapp' },
  { label: 'A4 Documento', w: 794, h: 1123, exportType: 'document' },
  { label: 'Business Card', w: 1050, h: 600, exportType: 'print' },
]

import { ArrowLine, renderArrow, getEdgePoint, getObjId, updatePolylineConnections, findSnapPoint, SNAP_R, pointInPoly } from './extensions/arrow-line'
import { type SelState, D } from './extensions/canvas-types'
import { useCanvasHistory } from './hooks/use-canvas-history'
import { useCanvasLayers } from './hooks/use-canvas-layers'
import { useProjectSync } from './hooks/use-project-sync'

import { useAudioEngine } from './audio-engine'
import { VideoModeModal } from './video-mode-modal'
import { AudioTimeline } from './audio-timeline'
import { useAnimationEngine } from './hooks/use-animation-engine'
import { AnimationTimeline } from './animation-timeline'

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function CreativeStudio({ clients = [], designProjects = [], onSaveProject, onDeleteProject, onClientChange, onAICommand, aiCommands = [], onClearAICommands, onCanvasSnapshot, imageUrlQueue }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)

  const toolRef = useRef<Tool>('select')

  // Line drawing
  const drawingLine = useRef(false)
  const lineStart = useRef<{ x: number; y: number } | null>(null)
  const tempLine = useRef<ArrowLine | null>(null)
  const snapRef = useRef(false)
  const moveRaf = useRef<number | null>(null)
  const zoomRaf = useRef<number | null>(null)
  const effectRafRef = useRef<number | null>(null)
  const fxAnimRafRef = useRef<number | null>(null)  // animated filter loop (uTime)
  const pendingFXRef = useRef<{ type: string, value: number } | null>(null)

  const isPlayingRef = useRef(false)
  const currentTimeRef = useRef(0)
  const lastTickTime = useRef<number>(0)
  // Throttle React state update for currentTime — only needed for the timeline UI,
  // not for canvas rendering (canvas reads from video element directly).
  const lastStateUpdateRef = useRef(0)

  // Pan
  const panning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const spaceDown = useRef(false)   // Space+drag pan (no middle mouse needed)

  // Eraser
  const erasing = useRef(false)

  // Lasso
  const lassoPoints = useRef<{ x: number; y: number }[]>([])
  const lassoLine = useRef<fabric.Polyline | null>(null)

  // Pen tool — bezier path builder
  const penAnchors = useRef<BzAnchor[]>([])           // confirmed anchors
  const penFabricPath = useRef<fabric.Path | null>(null)   // live preview path
  const penDragging = useRef(false)                    // mouse held on new anchor
  const penDragStart = useRef<{ x: number; y: number } | null>(null)

  // Bezier editor overlay (double-click on path)
  const [bzEdit, setBzEdit] = useState<{
    pathId: string
    anchors: BzAnchor[]
    dragging: { role: 'anchor' | 'cp1' | 'cp2'; idx: number } | null
  } | null>(null)
  const bzEditRef = useRef<typeof bzEdit>(null)  // mirror for event handlers

  // Keep ref in sync with state
  useEffect(() => { bzEditRef.current = bzEdit }, [bzEdit])

  // Legacy polyline refs (lasso still needs them)
  const activePoly = useRef<fabric.Polyline | null>(null)
  const penPointsAbs = useRef<{ x: number; y: number }[]>([])

  // Grid / snap refs (needed inside Fabric event handlers)
  const snapGridRef = useRef(false)
  const gridSizeRef = useRef(20)

  const [gridColumns, setGridColumns] = useState(12)
  const [tool, setTool] = useState<Tool>('select')
  const [zoom, setZoom] = useState(1)
  const [bgRemoving, setBgR] = useState(false)
  const [sel, setSel] = useState<SelState>(D)
  // clientId managed via currentClientId (project-based)
  const [showFX, setShowFX] = useState(false)
  const [showAB, setShowAB] = useState(false)
  const [showFP, setShowFP] = useState(false)
  const [showLib, setShowLib] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const [showImgFx, setShowImgFx] = useState(false)
  const [activeArtboardId, setActiveArtboardId] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(false)
  const [snapGrid, setSnapGrid] = useState(false)
  const [gridSize, setGridSize] = useState(20)
  const [showRulers, setShowRulers] = useState(false)
  const [showBM, setShowBM] = useState(false)
  const [showEditorialGrid, setShowEditorialGrid] = useState(false)
  const [gridConfig, setGridConfig] = useState({ modular: 50, baseline: 12, opacity: 0.2 })
  const [guides, setGuides] = useState<{ x?: number; y?: number }[]>([])
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; objId: string } | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [showAnimMode, setShowAnimMode] = useState(false)
  // Inspector (position/size/rotation of selected object)
  const [insp, setInsp] = useState<{ x: number; y: number; w: number; h: number; r: number } | null>(null)
  // Clipboard
  const clipboardRef = useRef<fabric.FabricObject | null>(null)
  // Dropdown trigger refs (for DropdownPortal positioning)
  const artboardBtnRef = useRef<HTMLButtonElement | null>(null)
  const exportBtnRef = useRef<HTMLButtonElement | null>(null)
  const projectBtnRef = useRef<HTMLButtonElement | null>(null)
  // Project UI state (identity managed by useProjectSync)
  const [showProjectList, setShowProjectList] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [subtitles, setSubtitles] = useState<{ text: string, start: number, end: number, id: string }[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionProgress, setTranscriptionProgress] = useState(0)

  const audioTracksRef = useRef<any[]>([])
  const [showLaunchPanel, setShowLaunchPanel] = useState(false)
  const [showLaunchHub, setShowLaunchHub] = useState(false)
  const [launchData, setLaunchData] = useState<any[]>([])
  const [universalLaunchData, setUniversalLaunchData] = useState<any>(null)
  // Floating launch badges — screen-space rects of all artboards
  const [artboardBadges, setArtboardBadges] = useState<{ id: string; left: number; top: number; width: number }[]>([])
  const [selectedArtboardIds, setSelectedArtboardIds] = useState<Set<string>>(new Set())
  const [stripLayoutSettings, setStripLayoutSettings] = useState({ columns: 4, spacing: 100 })
  const [gravityEnabled, setGravityEnabled] = useState(false)

  // Video/Audio Edition State
  const [videoMode, setVideoMode] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioTracks, setAudioTracks] = useState<any[]>([])
  const [editingVideoObj, setEditingVideoObj] = useState<any>(null)
  const audioEngine = useAudioEngine()

  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  // NOTE: currentTimeRef is updated by the fxTick loop (reads from video element),
  // not from React state, to avoid one-frame lag.

  const activeArtboardIdRef = useRef<string | null>(null)
  const physicsRef = useRef<{ engine: any; runner: any; bodies: Map<string, any> } | null>(null)

  // Stable refs for animation recording (used inside canvas event listeners)
  const animIsRecordingRef = useRef(false)
  const animCurrentTimeRef = useRef(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const animRecordRef = useRef<((obj: any, time: number) => void) | null>(null)

  // ── Active Object Registry (Optimization) ──────────────────────────────────
  // Track subsets of objects that need per-frame updates to avoid $O(N)$ scans.
  const videoObjsRef = useRef<Set<any>>(new Set())
  const animFilterObjsRef = useRef<Set<any>>(new Set())
  const physicsObjsRef = useRef<Set<any>>(new Set())
  const subtitleObjsRef = useRef<Set<any>>(new Set())

  // Animated filter types: { FX key → filter .type string }
  const ANIMATED_FX: Record<string, string> = {
    liquid: 'LiquidMotion', wavy: 'Wavy', glitch: 'Glitch', vhs: 'VHSFilter',
    matrix: 'Matrix', grain: 'Grain', chrome: 'LiquidMetalFilter', holo: 'Holographic', neon: 'NeonGlow',
  }

  const updateRegistry = React.useCallback((obj: any, remove = false) => {
    if (remove) {
      videoObjsRef.current.delete(obj); animFilterObjsRef.current.delete(obj)
      physicsObjsRef.current.delete(obj); subtitleObjsRef.current.delete(obj)
      return
    }
    if (obj.isVideo || obj.videoElement) videoObjsRef.current.add(obj)
    else videoObjsRef.current.delete(obj)

    const hasAnimFx = obj._appliedFX?.some((fx: string) => ANIMATED_FX[fx])
    if (hasAnimFx) animFilterObjsRef.current.add(obj)
    else animFilterObjsRef.current.delete(obj)

    if (obj.isSubtitle) subtitleObjsRef.current.add(obj)
    else subtitleObjsRef.current.delete(obj)

    if (!obj.isArtboard && obj.selectable) physicsObjsRef.current.add(obj)
    else physicsObjsRef.current.delete(obj)
  }, [])

  /**
   * buildSemanticManifest: Serializes the current visual state into a
   * descriptive string for the AI's semantic memory.
   */
  const buildSemanticManifest = () => {
    const canvas = fabricRef.current; if (!canvas) return ''
    const artboards = canvas.getObjects().filter(o => (o as any).isArtboard)
    const elements = canvas.getObjects().filter(o => !(o as any).isArtboard && !o.get('name')?.startsWith('label_'))

    let manifest = `Il progetto contiene ${artboards.length} tavole.\n\n`
    
    artboards.forEach(ab => {
      const name = ab.get('name') || 'Senza nome'
      const abBounds = ab.getBoundingRect(false)
      const children = elements.filter(o => 
        o.left! >= abBounds.left && o.left! <= abBounds.left + abBounds.width &&
        o.top! >= abBounds.top && o.top! <= abBounds.top + abBounds.height
      )

      manifest += `## Tavola: ${name}\n`
      manifest += `- Dimensioni: ${ab.width}x${ab.height}\n`
      manifest += `- Elementi: ${children.length}\n`
      
      const texts = children.filter(o => o.type === 'textbox' || o.type === 'i-text') as fabric.Textbox[]
      if (texts.length > 0) {
        manifest += `  - Testi:\n`
        texts.forEach(t => {
            manifest += `    - "${t.text}" (${t.fontFamily}, ${t.fill})\n`
        })
      }

      const shapes = children.filter(o => o.type !== 'textbox' && o.type !== 'i-text')
      if (shapes.length > 0) {
        manifest += `  - Forme/Asset: ${shapes.map(s => s.type).join(', ')}\n`
      }
      manifest += `\n`
    })

    return manifest
  }

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { pushHistory, undo, redo, syncActiveArtboardAfterLoad, resetHistory } =
    useCanvasHistory(fabricRef, activeArtboardIdRef, setActiveArtboardId)

  const { layers, refreshLayers, layerSelect, layerToggleVisible, layerToggleLock, layerMoveUp, layerMoveDown, layerDelete } =
    useCanvasLayers(fabricRef)

  const anim = useAnimationEngine(fabricRef)

  const {
    saving, isDirty,
    currentProjectId, currentProjectName, currentClientId, currentUserDescription,
    currentProjectIdRef, currentProjectNameRef, currentClientIdRef,
    getCanvasState, scheduleAutoSave, triggerSave, saveProject, loadProject, newProject,
  } = useProjectSync(fabricRef, onSaveProject, onClientChange, {
    syncActiveArtboardAfterLoad,
    resetHistory,
    setShowSaveDialog,
    setShowProjectList,
    setActiveArtboardId,
    getManifest: buildSemanticManifest,
  })

  useEffect(() => { activeArtboardIdRef.current = activeArtboardId }, [activeArtboardId])

  useEffect(() => { loadGoogleFonts() }, [])
  useEffect(() => { snapGridRef.current = snapGrid }, [snapGrid])
  useEffect(() => { gridSizeRef.current = gridSize }, [gridSize])
  // Keep stable refs in sync for animation recording inside canvas event handlers
  useEffect(() => { animIsRecordingRef.current = anim.isRecording }, [anim.isRecording])
  useEffect(() => { animCurrentTimeRef.current = anim.currentTime }, [anim.currentTime])
  useEffect(() => { animRecordRef.current = anim.recordKeyframe }, [anim.recordKeyframe])

  // ── Compute all artboard badges screen positions ──────────────────────────
  const updateArtboardBadges = React.useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) { setArtboardBadges([]); return }

    const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
    const abs = canvas.getObjects().filter(o => (o as any).isArtboard)

    const newBadges = abs.map(obj => {
      const b = obj.getBoundingRect()
      const screenLeft = b.left * vpt[0] + vpt[4]
      const screenTop = b.top * vpt[3] + vpt[5]
      const screenWidth = b.width * vpt[0]
      // Positioned above the artboard frame
      return { id: obj.get('name')!, left: screenLeft, top: screenTop - 36, width: screenWidth }
    })

    setArtboardBadges(newBadges)
  }, [])

  const cleanupOrphanedLabels = React.useCallback((canvas: fabric.Canvas) => {
    const objs = canvas.getObjects()
    const artboardNames = new Set(objs.filter(o => (o as any).isArtboard).map(o => o.get('name')))
    objs.forEach(o => {
      const name = o.get('name')
      if (name?.startsWith('label_')) {
        const artboardName = name.replace('label_', 'artboard_')
        if (!artboardNames.has(artboardName)) {
          canvas.remove(o)
        }
      }
    })
  }, [])

  // Re-compute badges whenever things change
  useEffect(() => { updateArtboardBadges() }, [activeArtboardId, updateArtboardBadges])

  // Drop image/video from external source (e.g. asset sidebar)
  useEffect(() => {
    if (!imageUrlQueue) return
    const canvas = fabricRef.current; if (!canvas) return

    const isVideo = imageUrlQueue.match(/\.(mp4|mov|webm|avi|mkv|m4v|3gp|flv|wmv|mpeg|mpg)(\?.*)?$/i)
    if (isVideo) {
      addVideoToCanvas(imageUrlQueue, "Video Asset")
    } else {
      fabric.Image.fromURL(imageUrlQueue, { crossOrigin: 'anonymous' }).then(img => {
        if (img.width! > canvas.width! * 0.5) img.scaleToWidth(canvas.width! * 0.5)
        const cx = (canvas.width || 800) / 2, cy = (canvas.height || 600) / 2
        img.set({ left: cx - (img.getScaledWidth() / 2), top: cy - (img.getScaledHeight() / 2) })
        canvas.add(img); canvas.setActiveObject(img); canvas.requestRenderAll()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrlQueue])

  // ── Canvas init ───────────────────────────────────────────────────────────
  useEffect(() => {
    loadGoogleFonts()
    if (!canvasRef.current || !containerRef.current) return

    // Safety check for HMR
    if (fabricRef.current) {
      fabricRef.current.dispose()
    }

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasContainerRef.current?.clientWidth || containerRef.current.clientWidth || 800,
      height: canvasContainerRef.current?.clientHeight || containerRef.current.clientHeight || 600,
      backgroundColor: '#050505',
      preserveObjectStacking: true,
      selection: true,
    })
    fabricRef.current = canvas

    // Listen for artboard selection change to sync navigator
    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0]
      if (obj && (obj as any).isArtboard) {
        setActiveArtboardId(obj.get('name') || null)
      }
    })
    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0]
      if (obj && (obj as any).isArtboard) {
        setActiveArtboardId(obj.get('name') || null)
      }
    })

    // Resize Observer for robust sizing
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0] || !canvas) return
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        canvas.setDimensions({ width, height })
        canvas.renderAll()
      }
    })
    resizeObserver.observe(canvasContainerRef.current || containerRef.current)

    // History + layer list + auto-save + Registry
    canvas.on('object:added', e => { 
      const obj = e.target!; getObjId(obj); pushHistory(); refreshLayers(); scheduleAutoSave()
      updateRegistry(obj) 
    })
    canvas.on('object:modified', (e: any) => {
      pushHistory(); refreshLayers(); scheduleAutoSave()
      if (e.target) updateRegistry(e.target)
      // Animation recording: capture keyframe when recording is active
      if (animIsRecordingRef.current && e.target) {
        animRecordRef.current?.(e.target, animCurrentTimeRef.current)
      }
      // POSITION SYNC: If artboard moved/scaled, ensure label follows
      if (e.target && (e.target as any).isArtboard) {
        const name = e.target.get('name')
        if (name) {
          const labelName = name.replace('artboard_', 'label_')
          const label = canvas.getObjects().find(o => o.get('name') === labelName)
          if (label) {
            label.set({ left: e.target.left, top: (e.target.top || 0) - 25 })
            label.setCoords()
          }
        }
      }
    })

    // Artboard removal cleanup: handled by main object management
    canvas.on('object:removed', (e: any) => {
      pushHistory(); refreshLayers(); scheduleAutoSave()
      if (e.target) updateRegistry(e.target, true)
    })

    // Video DOM cleanup: rimuove il <video> nascosto quando l'oggetto viene cancellato dal canvas
    canvas.on('object:removed', (e: any) => {
      const obj = e.target
      if ((obj as any).isVideo) {
        const vid = (obj as any).videoElement as HTMLVideoElement | undefined
        if (vid?.parentElement) vid.parentElement.removeChild(vid)
      }
    })

    // Auto-apply filters for special brushes (Chrome)
    canvas.on('path:created', (e: any) => {
      const path = e.path
      const brush = canvas.freeDrawingBrush as any
      if (brush?.isChrome) {
        (path as any)._appliedFX = ['chrome']
        path.filters = [new LiquidMetalFilter({ uIntensity: 0.8, uTime: 0 })]
        path.applyFilters()
        canvas.requestRenderAll()
      }
      if (brush?.isGlitch) {
        (path as any)._appliedFX = ['glitch']
        path.filters = [new Glitch({ uAmount: 0.5, uTime: 0 })]
        path.applyFilters()
        canvas.requestRenderAll()
      }
    })

    // Selection state
    const refreshSel = () => {
      const obj = canvas.getActiveObject()
      if (!obj) { setSel(D); return }
      const base: Partial<SelState> = {
        fillColor: (obj.fill as string) || '#ffffff',
        strokeColor: (obj.stroke as string) || '#ffffff',
        strokeWidth: obj.strokeWidth || 2,
        opacity: Math.round((obj.opacity ?? 1) * 100),
        shadowEnabled: !!obj.shadow,
        blendMode: obj.globalCompositeOperation || 'source-over',
        appliedFX: (obj as any)._appliedFX || [],
        fxProps: (obj as any).fxProps || {},
      }
      if (obj.shadow) {
        const sh = obj.shadow as fabric.Shadow
        base.shadowColor = (sh.color as string) || '#000000'
        base.shadowBlur = sh.blur || 10; base.shadowOffsetX = sh.offsetX || 4; base.shadowOffsetY = sh.offsetY || 4
      }
      if (obj.type === 'textbox' || obj.type === 'i-text') {
        const t = obj as fabric.Textbox
        setSel({
          ...D, ...base, type: 'text', fontFamily: t.fontFamily || 'Inter', fontSize: t.fontSize || 24,
          bold: t.fontWeight === 'bold', italic: t.fontStyle === 'italic', underline: !!t.underline, linethrough: !!t.linethrough,
          textAlign: t.textAlign || 'left', lineHeight: t.lineHeight || 1.2, charSpacing: t.charSpacing || 0,
          fillColor: (t.fill as string) || '#ffffff', strokeText: !!t.stroke && (t.strokeWidth || 0) > 0,
          strokeTextColor: (t.stroke as string) || '#000000', strokeTextWidth: t.strokeWidth || 1
        } as SelState)
      } else if (obj instanceof ArrowLine) {
        setSel({ ...D, ...base, type: 'line', hasStartArrow: obj.hasStartArrow, hasEndArrow: obj.hasEndArrow, isConnector: obj.isConnector } as SelState)
      } else if (obj.type === 'image') {
        setSel({ ...D, ...base, type: 'image' } as SelState)
      } else if (obj.type === 'activeSelection') {
        setSel({ ...D, ...base, type: 'group' } as SelState)
      } else {
        setSel({ ...D, ...base, type: 'shape' } as SelState)
      }
    }
    const refreshInsp = () => {
      const obj = canvas.getActiveObject()
      if (!obj) { setInsp(null); return }
      setInsp({ x: Math.round(obj.left || 0), y: Math.round(obj.top || 0), w: Math.round(obj.getScaledWidth()), h: Math.round(obj.getScaledHeight()), r: Math.round(obj.angle || 0) })
    }
    canvas.on('selection:created', () => { refreshSel(); refreshInsp() })
    canvas.on('selection:updated', () => { refreshSel(); refreshInsp() })
    canvas.on('selection:cleared', () => { refreshSel(); setInsp(null) })

    const throttledTransform = () => {
      if (moveRaf.current) cancelAnimationFrame(moveRaf.current)
      moveRaf.current = requestAnimationFrame(() => {
        refreshInsp()
        updateArtboardBadges()
        moveRaf.current = null
      })
    }
    canvas.on('object:scaling', throttledTransform)
    canvas.on('object:rotating', throttledTransform)

    // Connector update + smart guides + snap-to-grid on move
    canvas.on('object:moving', e => {
      const moved = e.target as any
      if (!moved.objId) return

      // Snap to grid (Sync for UX precision)
      if (snapGridRef.current && gridSizeRef.current) {
        const gs = gridSizeRef.current
        moved.set({ left: Math.round((moved.left || 0) / gs) * gs, top: Math.round((moved.top || 0) / gs) * gs })
      }

      // Fabric schedules its own render on object:moving — no manual call needed

      // Throttle heavy logic with RAF (Forward-only lock, no cancellation)
      if (moveRaf.current) return
      moveRaf.current = requestAnimationFrame(() => {
        // Smart alignment guides
        const GUIDE_T = 6
        const mc = moved.getCenterPoint(), ml = moved.left || 0, mt = moved.top || 0
        const mw = moved.getScaledWidth(), mh = moved.getScaledHeight()
        const newGuides: { x?: number; y?: number }[] = []

        const allObjs = canvas.getObjects().filter(o => o.selectable && o !== moved && !(o as any).isArtboard)

        allObjs.forEach((obj: any) => {
          const oc = obj.getCenterPoint(), ol = obj.left || 0, ot = obj.top || 0
          const ow = obj.getScaledWidth(), oh = obj.getScaledHeight()
          const xPairs = [[mc.x, oc.x], [ml, ol], [ml + mw, ol + ow], [mc.x, ol], [mc.x, ol + ow]]
          xPairs.forEach(([a, b]) => { if (Math.abs(a - b) < GUIDE_T) newGuides.push({ x: b }) })
          const yPairs = [[mc.y, oc.y], [mt, ot], [mt + mh, ot + oh], [mc.y, ot], [mc.y, ot + oh]]
          yPairs.forEach(([a, b]) => { if (Math.abs(a - b) < GUIDE_T) newGuides.push({ y: b }) })
        })
        // Skip React update when guides unchanged (avoids re-render at 60fps during normal drag)
        setGuides(prev => {
          if (prev.length === 0 && newGuides.length === 0) return prev
          return newGuides
        })

        // Update ArrowLine connectors
        canvas.getObjects().forEach(obj => {
          if (!(obj instanceof ArrowLine) || !obj.isConnector) return
          if (obj.startObjId === moved.objId) { const cp = moved.getCenterPoint(); obj.set({ x1: cp.x - (obj.left || 0), y1: cp.y - (obj.top || 0) }); obj.setCoords() }
          if (obj.endObjId === moved.objId) { const cp = moved.getCenterPoint(); obj.set({ x2: cp.x - (obj.left || 0), y2: cp.y - (obj.top || 0) }); obj.setCoords() }
        })

        // LIVE LABEL SYNC: Artboard label follows the artboard during drag
        if (moved.isArtboard) {
          const name = moved.get('name')
          if (name) {
            const labelName = name.replace('artboard_', 'label_')
            const label = canvas.getObjects().find(o => o.get('name') === labelName)
            if (label) {
              label.set({ left: moved.left, top: (moved.top || 0) - 25 })
              label.setCoords()
            }
          }
        }

        if (moved.type !== 'polyline') {
          canvas.getObjects('polyline').forEach((l: any) => {
            if (!l.vertexConnections) return
            if (Object.values(l.vertexConnections).includes(moved.objId)) updatePolylineConnections(l, canvas)
          })
        }

        refreshInsp()
        updateArtboardBadges()
        moveRaf.current = null
      })
    })

    canvas.on('object:modified', () => setGuides([]))

    // Polyline modified → re-check connections
    canvas.on('object:modified', e => {
      if (e.target?.type === 'polyline') updatePolylineConnections(e.target as any, canvas)
    })

    // Double-click → bezier edit for Path, vertex edit for polylines, or video modal
    canvas.on('mouse:dblclick', e => {
      if (toolRef.current === 'pen') { finalizePenPath(); return }
      if (e.target?.type === 'path') { enterBzEdit(e.target as fabric.Path); return }
      if (e.target?.type === 'polyline') { toggleVertexEdit(e.target as any, canvas); return }

      if ((e.target as any)?.isVideo) {
        setEditingVideoObj(e.target)
        setVideoMode(true)
        return
      }
    })

    // Zoom on scroll — also update badge
    canvas.on('mouse:wheel', opt => {
      let z = canvas.getZoom() * (0.999 ** opt.e.deltaY)
      z = Math.max(0.05, Math.min(20, z))
      canvas.zoomToPoint(new fabric.Point((opt.e as MouseEvent).offsetX, (opt.e as MouseEvent).offsetY), z)

      // Mandatory immediate render for UX
      canvas.requestRenderAll()

      // Throttle React state updates (No cancel, leading edge lock)
      if (!zoomRaf.current) {
        zoomRaf.current = requestAnimationFrame(() => {
          setZoom(z)
          updateArtboardBadges()
          zoomRaf.current = null
        })
      }

      opt.e.preventDefault(); opt.e.stopPropagation()
    })

    // Badge sync: only on viewport or artboard change to avoid React re-renders at 60fps
    canvas.on('viewport:scaled', updateArtboardBadges)
    canvas.on('viewport:translated', updateArtboardBadges)
    // Add specific listener for artboard movement
    canvas.on('object:moving', (e) => { if ((e.target as any).isArtboard) updateArtboardBadges() })
    canvas.on('object:scaling', (e) => { if ((e.target as any).isArtboard) updateArtboardBadges() })

    // Right-click context menu
    canvas.on('mouse:down', opt => {
      const me = opt.e as MouseEvent
      if (me.button === 2) {
        me.preventDefault()
        const obj = canvas.findTarget(opt.e) as unknown as fabric.FabricObject | undefined
        if (obj) {
          try {
            canvas.setActiveObject(obj)
            setCtxMenu({ x: me.clientX, y: me.clientY, objId: getObjId(obj) })
          } catch (e) {
            console.warn('Selection error:', e)
            // fallback: at least show ctx menu if we have an objId
            setCtxMenu({ x: me.clientX, y: me.clientY, objId: getObjId(obj) })
          }
        } else {
          setCtxMenu(null)
        }
        return
      }
      setCtxMenu(null)
      // Pan: middle mouse OR Space+drag
      if (me.button === 1 || spaceDown.current) {
        panning.current = true; lastMouse.current = { x: me.clientX, y: me.clientY }
        canvas.selection = false; opt.e.preventDefault(); return
      }
      handleDown(canvas, opt)
    })
    canvas.on('mouse:move', opt => {
      if (panning.current) {
        const me = opt.e as MouseEvent, vpt = canvas.viewportTransform!
        vpt[4] += me.clientX - lastMouse.current.x; vpt[5] += me.clientY - lastMouse.current.y
        lastMouse.current = { x: me.clientX, y: me.clientY }; canvas.requestRenderAll(); return
      }
      handleMove(canvas, opt)
    })
    canvas.on('mouse:up', opt => {
      if (panning.current) {
        panning.current = false
        canvas.selection = toolRef.current === 'select'
        // If Space is still held after drag, stay in grab mode
        if (spaceDown.current && canvasContainerRef.current) canvasContainerRef.current.style.cursor = 'grab'
        return
      }
      handleUp(canvas, opt)
    })

    // Keyboard shortcuts
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const activeObj = canvas.getActiveObject() as any
      if (activeObj?.isEditing) {
        // Allow Enter to exit editing if desired, otherwise let Fabric handle it
        if (e.key === 'Enter' && !e.shiftKey) {
          activeObj.exitEditing()
          canvas.requestRenderAll()
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.altKey) { undo(); return } // Ctrl+Alt+Z as Undo (Alternative)
        if (e.shiftKey) { redo(); return } // Ctrl+Shift+Z as Redo
        undo(); return // Ctrl+Z as Undo
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { redo(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); triggerSave(); return }
      // Ctrl+A — select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        const objs = canvas.getObjects().filter(o => o.selectable !== false)
        if (objs.length === 1) canvas.setActiveObject(objs[0])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        else if (objs.length > 1) canvas.setActiveObject(new (fabric as any).ActiveSelection(objs, { canvas }))
        canvas.requestRenderAll(); return
      }
      // Ctrl+C — copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const a = canvas.getActiveObject(); if (!a) return
        a.clone().then(cl => { clipboardRef.current = cl }); return
      }
      // Ctrl+V — paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (!clipboardRef.current) return
        clipboardRef.current.clone().then(cl => {
          cl.set({ left: (cl.left || 0) + 20, top: (cl.top || 0) + 20, evented: true })
          getObjId(cl); canvas.add(cl); canvas.setActiveObject(cl); canvas.requestRenderAll()
          clipboardRef.current = cl // allow repeated pastes
        }); return
      }
      // Ctrl+D — duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        const a = canvas.getActiveObject()
        if (a) a.clone().then(cl => { cl.set({ left: (a.left || 0) + 20, top: (a.top || 0) + 20 }); getObjId(cl); canvas.add(cl); canvas.setActiveObject(cl) })
        return
      }
      // Ctrl+0 — fit to screen
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        // No preventDefault to allow global UI zoom reset in RootShell
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]); canvas.setZoom(1); setZoom(1)
        canvas.requestRenderAll(); return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault()
        const a = canvas.getActiveObject()
        if (a?.type === 'activeSelection') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const g = (a as any).toGroup?.() ?? (a as any).group?.()
          if (g) { canvas.setActiveObject(g); canvas.requestRenderAll() }
        }
        return
      }
      if (e.key === 'Enter') {
        if (bzEditRef.current) { exitBzEdit(); return }
        if (toolRef.current === 'pen') { finalizePenPath(); return }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const objs = canvas.getActiveObjects()
        if (objs.length) { objs.forEach(o => canvas.remove(o)); canvas.discardActiveObject(); canvas.requestRenderAll() }
        return
      }
      if (e.key === '[') { const o = canvas.getActiveObject(); if (o) canvas.sendObjectBackwards(o); canvas.requestRenderAll(); return }
      if (e.key === ']') { const o = canvas.getActiveObject(); if (o) canvas.bringObjectForward(o); canvas.requestRenderAll(); return }
      if (e.key === 'Escape') {
        if (activePoly.current) { canvas.remove(activePoly.current); activePoly.current = null; penPointsAbs.current = [] }
        canvas.discardActiveObject(); canvas.requestRenderAll(); return
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'g') { setShowGrid(p => !p); return }
      // Space — enter grab/pan mode (cursor feedback)
      if (e.key === ' ' && !spaceDown.current) {
        spaceDown.current = true
        if (canvasContainerRef.current) canvasContainerRef.current.style.cursor = 'grab'
        e.preventDefault(); return
      }
      // Arrow keys — scroll viewport by 60px
      const PAN_STEP = 60
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (!canvas.getActiveObject()) {
          const vpt = canvas.viewportTransform!
          if (e.key === 'ArrowLeft') vpt[4] += PAN_STEP
          if (e.key === 'ArrowRight') vpt[4] -= PAN_STEP
          if (e.key === 'ArrowUp') vpt[5] += PAN_STEP
          if (e.key === 'ArrowDown') vpt[5] -= PAN_STEP
          canvas.requestRenderAll(); updateArtboardBadges(); e.preventDefault(); return
        }
      }
      const tm: Record<string, Tool> = { v: 'select', a: 'lasso', t: 'text', r: 'rect', c: 'circle', l: 'line', f: 'pen', p: 'pencil', e: 'eraser', i: 'image', x: 'scissors' }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && tm[e.key.toLowerCase()]) changeTool(tm[e.key.toLowerCase()])
    }
    // Initial action: Load first project or create artboard
    setTimeout(() => {
      if (canvas.getObjects().filter(o => !(o as any).isArtboard).length === 0) {
        if (designProjects.length > 0) {
          loadProject(designProjects[0]).then(() => {
            cleanupOrphanedLabels(canvas)
          })
        } else {
          // Default artboard if totally empty
          addArtboard(1080, 1080, 'Social Square', 'social')
        }
      } else {
        cleanupOrphanedLabels(canvas)
      }
      // Populate registry initially
      canvas.getObjects().forEach(o => updateRegistry(o))
    }, 100)

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        spaceDown.current = false
        if (canvasContainerRef.current) canvasContainerRef.current.style.cursor = ''
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)

    // ── Animated filter loop ────────────────────────────────────────────────
    // Uses the animFilterObjsRef registry to avoid O(N) canvas scans every frame.
    const fxTick = (timestamp: number) => {
      const c = fabricRef.current
      if (!c) { fxAnimRafRef.current = null; return }

      let dirty = false

      // 1. Playback sync — video elements are master clock (video.play() is called).
      //    We read currentTime FROM the video, not advance it manually.
      if (isPlayingRef.current) {
        // Read master time from the first playing video element in registry
        let masterTime = currentTimeRef.current
        videoObjsRef.current.forEach(obj => {
          const vid = (obj as any).videoElement as HTMLVideoElement | undefined
          if (vid && !vid.paused) {
            masterTime = vid.currentTime
          }
        })
        currentTimeRef.current = masterTime

        // Throttle React state updates to ~10fps — the timeline only needs 10fps
        // to feel responsive. The canvas renders at full 60fps via dirty=true below.
        const now = timestamp
        if (now - lastStateUpdateRef.current > 100) {
          lastStateUpdateRef.current = now
          setCurrentTime(masterTime)
        }

        // Always repaint canvas at full frame rate (video frames change every tick)
        dirty = true

        // --- 1.1 Subtitle sync (via registry) ---
        subtitleObjsRef.current.forEach(obj => {
          const start = (obj as any).startTime || 0
          const end = (obj as any).endTime || 0
          const shouldBeVisible = masterTime >= start && masterTime <= end
          if (obj.visible !== shouldBeVisible) {
            obj.set({ visible: shouldBeVisible })
            dirty = true
          }
        })
      }

      // 2. Handle Filter Animations (via registry)
      animFilterObjsRef.current.forEach(obj => {
        const o = obj as any
        if (!o._appliedFX) return
        for (const [fxKey, filterType] of Object.entries(ANIMATED_FX)) {
          if (!o._appliedFX.includes(fxKey)) continue
          const f = o.filters?.find((f: any) => f.type === filterType)
          if (!f) continue
          f.uTime = (f.uTime || 0) + 0.016
          o._filterDirty = true
          o.dirty = true
          dirty = true
        }
      })
      if (dirty) c.requestRenderAll()
      fxAnimRafRef.current = requestAnimationFrame(fxTick)
    }
    fxAnimRafRef.current = requestAnimationFrame(fxTick)

    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      resizeObserver.disconnect()
      if (fxAnimRafRef.current) cancelAnimationFrame(fxAnimRafRef.current)
      canvas.dispose()
      fabricRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Physics Sync Hook (Moved to top level)
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !gravityEnabled) {
      if (physicsRef.current) {
        Matter.Runner.stop(physicsRef.current.runner)
        Matter.Engine.clear(physicsRef.current.engine)
        physicsRef.current = null
      }
      return
    }

    // Init Physics
    const engine = Matter.Engine.create({ gravity: { y: 1 } })
    const runner = Matter.Runner.create()
    const bodiesMap = new Map<string, any>()

    // Create ground
    const ground = Matter.Bodies.rectangle(canvas.width! / 2, canvas.height! + 50, canvas.width! * 2, 100, { isStatic: true })
    Matter.World.add(engine.world, ground)

    // Initial Body Sync
    canvas.getObjects().forEach(obj => {
      if ((obj as any).isArtboard || !obj.selectable) return
      const id = (obj as any).objId || getObjId(obj)
      const center = obj.getCenterPoint()
      const body = Matter.Bodies.rectangle(center.x, center.y, obj.getScaledWidth(), obj.getScaledHeight(), {
        restitution: 0.5,
        friction: 0.1,
        angle: (obj.angle || 0) * (Math.PI / 180)
      })
      bodiesMap.set(id, body)
      Matter.World.add(engine.world, body)
    })

    physicsRef.current = { engine, runner, bodies: bodiesMap }
    Matter.Runner.run(runner, engine)

    let animId: number
    const tick = () => {
      if (!gravityEnabled) return
      const canvas = fabricRef.current; if (!canvas) return

      physicsObjsRef.current.forEach(obj => {
        const id = (obj as any).objId
        const body = bodiesMap.get(id)
        if (body && !(obj as any).isEditing && canvas.getActiveObject() !== obj) {
          obj.set({
            left: body.position.x,
            top: body.position.y,
            angle: body.angle * (180 / Math.PI)
          })
          obj.setCoords()
        } else if (body && canvas.getActiveObject() === obj) {
          const center = obj.getCenterPoint()
          Matter.Body.setPosition(body, { x: center.x, y: center.y })
          Matter.Body.setAngle(body, (obj.angle || 0) * (Math.PI / 180))
          Matter.Body.setVelocity(body, { x: 0, y: 0 })
        }
      })

      canvas.requestRenderAll()
      animId = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(animId)
      Matter.Runner.stop(runner)
      Matter.Engine.clear(engine)
    }
  }, [gravityEnabled])

  // ── Tool effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current; if (!canvas) return
    toolRef.current = tool
    canvas.isDrawingMode = false
    canvas.selection = tool === 'select'
    canvas.defaultCursor = 'default'

    if (tool === 'pencil') {
      canvas.isDrawingMode = true
      canvas.defaultCursor = 'crosshair'

      let brush: fabric.BaseBrush
      switch (sel.brushType) {
        case BRUSH_TYPES.SPRAY: brush = createSprayBrush(canvas); break
        case BRUSH_TYPES.CRAYON: brush = createCrayonBrush(canvas); break
        case BRUSH_TYPES.MARKER: brush = createMarkerBrush(canvas); break
        case BRUSH_TYPES.INK: brush = createInkBrush(canvas); break
        case BRUSH_TYPES.GENERATIVE: brush = createGenerativeBrush(canvas); break
        case BRUSH_TYPES.LIQUID: brush = new LiquidBrush(canvas); break
        case BRUSH_TYPES.GLOW: brush = createGlowBrush(canvas); break
        case BRUSH_TYPES.NEON: brush = createNeonBrush(canvas); break
        case BRUSH_TYPES.CHARCOAL: brush = createCharcoalBrush(canvas); break
        case BRUSH_TYPES.WATERCOLOR: brush = createWatercolorBrush(canvas); break
        case BRUSH_TYPES.DOTTED: brush = createDottedBrush(canvas); break
        case BRUSH_TYPES.DASHED: brush = createDashedBrush(canvas); break
        case BRUSH_TYPES.CHROME: brush = createChromeBrush(canvas); break
        case BRUSH_TYPES.INK_BLEED: brush = new DeepInkBrush(canvas); break
        case BRUSH_TYPES.THORN: brush = new ToxicThornBrush(canvas); break
        case BRUSH_TYPES.GLITCH: brush = createGlitchBrush(canvas); break
        case BRUSH_TYPES.CALLIGRAPHY: brush = new CalligraphyBrush(canvas); break
        default: brush = new fabric.PencilBrush(canvas)
      }

      brush.width = sel.brushWidth || 3
      brush.color = sel.brushColor || '#ffffff'
      canvas.freeDrawingBrush = brush

      // Iniezione Pro Brush Dynamics (normalizzate 0.0 - 1.0)
      const activeBrush = canvas.freeDrawingBrush as any;
      if (activeBrush) {
        activeBrush.thinning = sel.brushThinning / 100;
        activeBrush.smoothing = sel.brushSmoothing / 100;
        activeBrush.streamline = sel.brushStreamline / 100;
        activeBrush.taperStart = sel.brushTaperStart;
        activeBrush.taperEnd = sel.brushTaperEnd;
        activeBrush.jitter = sel.brushJitter;

        // Triggera un eventuale aggiornamento shader/matematico se il pennello è custom
        if (typeof activeBrush.updateProParams === 'function') {
          activeBrush.updateProParams();
        }

        // Fallback nativo: mappa lo smoothing al decimate nativo di Fabric per pennelli base
        if (activeBrush instanceof fabric.PencilBrush) {
          activeBrush.decimate = (sel.brushSmoothing / 100) * 10;
        }
      }
    }
    if (tool === 'eraser') { canvas.selection = false; canvas.defaultCursor = 'cell' }
    if (tool === 'lasso') { canvas.selection = false; canvas.defaultCursor = 'crosshair' }
    if (tool === 'scissors') { canvas.selection = false; canvas.defaultCursor = 'crosshair' }
    if (['text', 'rect', 'circle', 'line', 'pen', 'image'].includes(tool)) { canvas.defaultCursor = 'crosshair'; canvas.selection = false }
  }, [tool, sel.brushType, sel.brushWidth, sel.brushColor, sel.brushThinning, sel.brushSmoothing, sel.brushStreamline, sel.brushTaperStart, sel.brushTaperEnd, sel.brushJitter])


  // ── Vertex edit mode (Gemini's approach) ──────────────────────────────────
  function toggleVertexEdit(obj: any, canvas: fabric.Canvas) {
    const isEditing = !!obj.get('editMode')
    obj.set({ editMode: !isEditing, hasBorders: isEditing, lockScalingX: !isEditing, lockScalingY: !isEditing, lockRotation: !isEditing, hasControls: true, objectCaching: false })
    if (!isEditing) {
      const points = obj.get('points') as { x: number; y: number }[]
      obj.controls = points.reduce((acc: any, pt: any, index: number) => {
        acc['p' + index] = new fabric.Control({
          x: -0.5, y: -0.5, offsetX: pt.x, offsetY: pt.y, cursorStyle: 'pointer',
          positionHandler: (_dim, _fm, fo: any) => fabric.util.transformPoint(new fabric.Point(fo.points[index].x, fo.points[index].y), fo.calcTransformMatrix()),
          render: (ctx, left, top) => {
            ctx.save(); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#7C3AED'; ctx.lineWidth = 2
            ctx.beginPath(); ctx.arc(left, top, 6, 0, Math.PI * 2, false); ctx.fill(); ctx.stroke(); ctx.restore()
          },
          actionHandler: (_ev, transform, x, y) => {
            const poly = transform.target as any
            const local = fabric.util.transformPoint(new fabric.Point(x, y), fabric.util.invertTransform(poly.calcTransformMatrix()))
            poly.points[index].x = local.x; poly.points[index].y = local.y
              // Recalculate bounding box so vertices outside original bbox are not clipped
              ; (poly as any)._setPositionDimensions?.({})
            poly.set({ dirty: true }); poly.setCoords()
            updatePolylineConnections(poly, canvas); return true
          },
          actionName: 'modifyPolyline'
        })
        return acc
      }, {})
    } else {
      obj.controls = fabric.Object.prototype.controls
    }
    canvas.renderAll()
  }

  // ── Polyline vertex connections ───────────────────────────────────────────
  function checkPolyConnections(line: any, canvas: fabric.Canvas) {
    if (line.type !== 'polyline') return
    if (!line.vertexConnections) line.vertexConnections = {}
    const m = line.calcTransformMatrix()
    const pts = line.get('points') as { x: number; y: number }[]
    pts.forEach((p, idx) => {
      const gp = fabric.util.transformPoint(new fabric.Point(p.x, p.y), m)
      line.vertexConnections[idx] = undefined
      canvas.getObjects().forEach((o: any) => {
        if (o === line || o.type === 'polyline') return
        const b = o.getBoundingRect()
        if (gp.x >= b.left && gp.x <= b.left + b.width && gp.y >= b.top && gp.y <= b.top + b.height) line.vertexConnections[idx] = getObjId(o)
      })
    })
    updatePolylineConnections(line, canvas)
    canvas.renderAll()
  }

  // ── Mouse handlers ────────────────────────────────────────────────────────
  function handleDown(canvas: fabric.Canvas, opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) {
    const t = toolRef.current, p = canvas.getScenePoint(opt.e)

    if (t === 'eraser') { erasing.current = true; eraseAt(canvas, p); return }

    if (t === 'lasso') {
      lassoPoints.current = [{ x: p.x, y: p.y }]
      const poly = new fabric.Polyline([{ x: p.x, y: p.y }], { fill: 'rgba(99,102,241,0.08)', stroke: '#6366f1', strokeWidth: 1.5, strokeDashArray: [5, 3], selectable: false, evented: false })
      lassoLine.current = poly; canvas.add(poly); return
    }

    // ── Scissors on bezier path ───────────────────────────────────────────
    if (t === 'scissors' && opt.target?.type === 'path') {
      const fp = opt.target as fabric.Path
      const stored = (fp as any)._bzAnchors as BzAnchor[] | undefined
      if (!stored || stored.length < 2) return
      const hit = closestOnBzPath(stored, p.x, p.y)
      if (hit.dist > 30) return           // too far from path
      const [leftA, rightA] = splitBzPath(stored, hit)
      const props = { stroke: (fp.stroke as string) || '#ffffff', strokeWidth: fp.strokeWidth || 2, fill: 'transparent', selectable: true, evented: true, objectCaching: false, lockScalingX: true, lockScalingY: true }
      const pathL = new fabric.Path(anchorsToBzPath(leftA), props)
      const pathR = new fabric.Path(anchorsToBzPath(rightA), props)
        ; (pathL as any)._bzAnchors = leftA; getObjId(pathL)
        ; (pathR as any)._bzAnchors = rightA; getObjId(pathR)
      canvas.remove(fp); canvas.add(pathL); canvas.add(pathR)
      canvas.setActiveObject(pathR); canvas.renderAll()
      pushHistory(); return
    }
    // Scissors on polyline (legacy)
    if (t === 'scissors' && opt.target?.type === 'polyline') {
      const poly = opt.target as any, pts = poly.get('points') as { x: number; y: number }[]
      if (pts.length > 2) {
        const mid = Math.floor(pts.length / 2)
        const p2 = new fabric.Polyline(pts.slice(mid), { left: poly.left, top: poly.top, stroke: poly.stroke, strokeWidth: poly.strokeWidth, fill: 'transparent' })
        getObjId(p2); poly.set({ points: pts.slice(0, mid + 1) }); canvas.add(p2); canvas.renderAll()
      }
      return
    }

    // ── Pen tool — bezier path builder ───────────────────────────────────
    if (t === 'pen') {
      penDragging.current = true
      penDragStart.current = { x: p.x, y: p.y }
      // Add a corner anchor at this position; drag will convert to smooth
      penAnchors.current.push(makeAnchor(p.x, p.y))
      renderPenPreview(canvas, p.x, p.y)
      return
    }

    if (t === 'text') {
      const txt = new fabric.Textbox('Scrivi qualcosa...', {
        left: p.x, top: p.y, width: 350,
        fill: '#ffffff', fontSize: 28, fontFamily: 'Inter',
        editable: true, textAlign: 'left'
      })
      canvas.add(txt)
      canvas.setActiveObject(txt)
      // Slight delay to ensure focus after React render cycle
      setTimeout(() => {
        txt.enterEditing()
        txt.selectAll()
        canvas.requestRenderAll()
      }, 50)
      setTool('select')
      return
    }
    if (t === 'rect') {
      const r = new fabric.Rect({ left: p.x, top: p.y, width: 200, height: 200, fill: 'rgba(255,255,255,0.1)', stroke: '#ffffff', strokeWidth: 2, rx: 8, ry: 8 })
      canvas.add(r); canvas.setActiveObject(r); setTool('select'); return
    }
    if (t === 'circle') {
      const el = new fabric.Ellipse({ left: p.x, top: p.y, rx: 80, ry: 80, fill: 'rgba(255,255,255,0.1)', stroke: '#ffffff', strokeWidth: 2 })
      canvas.add(el); canvas.setActiveObject(el); setTool('select'); return
    }
    if (t === 'line') {
      const snap = findSnapPoint(canvas, p.x, p.y)
      const sx = snap ? snap.x : p.x, sy = snap ? snap.y : p.y
      const line = new ArrowLine([sx, sy, sx, sy], { stroke: '#ffffff', strokeWidth: 2, selectable: false, evented: false })
      line.isConnector = snapRef.current; line.startObjId = snap ? snap.objId : null
      canvas.add(line); tempLine.current = line; lineStart.current = { x: sx, y: sy }; drawingLine.current = true; return
    }
    if (t === 'image') {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,video/*'
      inp.onchange = (ev) => {
        const file = (ev.target as HTMLInputElement).files?.[0]; if (!file) return
        const isVid = file.type.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv|m4v|3gp|flv|wmv|mpeg|mpg)$/i.test(file.name)
        if (isVid) {
          addVideoToCanvas(file, file.name)
        } else {
          const reader = new FileReader()
          reader.onload = e => {
            fabric.Image.fromURL(e.target?.result as string, { crossOrigin: 'anonymous' }).then(img => {
              if (img.width! > canvas.width! * 0.5) img.scaleToWidth(canvas.width! * 0.5)
              img.set({ left: p.x, top: p.y }); canvas.add(img); canvas.setActiveObject(img)
            })
          }
          reader.readAsDataURL(file)
        }
      }
      inp.click(); setTool('select')
    }
  }

  function eraseAt(canvas: fabric.Canvas, p: fabric.Point) {
    const remove = canvas.getObjects().filter(o => o.selectable !== false && o.evented !== false && o.containsPoint(p))
    remove.forEach(o => canvas.remove(o)); if (remove.length) canvas.requestRenderAll()
  }

  function handleMove(canvas: fabric.Canvas, opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) {
    const p = canvas.getScenePoint(opt.e)
    if (toolRef.current === 'eraser' && erasing.current) { eraseAt(canvas, p); return }
    if (toolRef.current === 'lasso' && lassoLine.current) {
      lassoPoints.current.push({ x: p.x, y: p.y })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lassoLine.current.set({ points: [...lassoPoints.current] } as any); lassoLine.current.setCoords(); canvas.requestRenderAll(); return
    }
    if (toolRef.current === 'pen') {
      const anchors = penAnchors.current
      if (!anchors.length) return
      if (penDragging.current && penDragStart.current) {
        // Drag on last anchor → convert to smooth (bezier handles)
        const start = penDragStart.current
        const dx = p.x - start.x, dy = p.y - start.y
        if (Math.hypot(dx, dy) > 4) {
          anchors[anchors.length - 1] = makeSmoothAnchor(start.x, start.y, dx * 0.5, dy * 0.5)
        }
      }
      renderPenPreview(canvas, p.x, p.y)
      return
    }
    if (drawingLine.current && tempLine.current) { tempLine.current.set({ x2: p.x, y2: p.y }); tempLine.current.setCoords(); canvas.requestRenderAll() }
  }

  function handleUp(canvas: fabric.Canvas, opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) {
    const p = canvas.getScenePoint(opt.e)
    if (toolRef.current === 'eraser') { if (erasing.current) pushHistory(); erasing.current = false; return }
    if (toolRef.current === 'lasso' && lassoLine.current) {
      canvas.remove(lassoLine.current); lassoLine.current = null
      const pts = lassoPoints.current
      if (pts.length > 2) {
        const sel = canvas.getObjects().filter(o => o.selectable !== false && pointInPoly(o.getCenterPoint(), pts))
        if (sel.length === 1) canvas.setActiveObject(sel[0])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        else if (sel.length > 1) canvas.setActiveObject(new (fabric as any).ActiveSelection(sel, { canvas }))
        canvas.requestRenderAll()
      }
      lassoPoints.current = []; setTool('select'); return
    }
    if (toolRef.current === 'pen') {
      penDragging.current = false; penDragStart.current = null
      return
    }
    if (drawingLine.current && tempLine.current) {
      const line = tempLine.current
      const snap = findSnapPoint(canvas, p.x, p.y, line.startObjId || undefined)
      const ex = snap ? snap.x : p.x, ey = snap ? snap.y : p.y
      const start = lineStart.current!, d = Math.hypot(ex - start.x, ey - start.y)
      if (d < 5) { canvas.remove(line) }
      else { line.set({ x2: ex, y2: ey, selectable: true, evented: true, endObjId: snap ? snap.objId : null }); line.setCoords(); canvas.setActiveObject(line) }
      drawingLine.current = false; tempLine.current = null; lineStart.current = null
      canvas.requestRenderAll(); setTool('select')
    }
  }

  // ── Bezier pen helpers ────────────────────────────────────────────────────
  function renderPenPreview(canvas: fabric.Canvas, cursorX: number, cursorY: number) {
    const anchors = penAnchors.current; if (!anchors.length) return
    // Build preview path including cursor as tentative last point
    const previewAnchors = [...anchors, makeAnchor(cursorX, cursorY)]
    const d = anchorsToBzPath(previewAnchors)
    if (penFabricPath.current) canvas.remove(penFabricPath.current)
    const fp = new fabric.Path(d, { stroke: '#ffffff', strokeWidth: 2, fill: 'transparent', selectable: false, evented: false, objectCaching: false })
    canvas.add(fp); penFabricPath.current = fp
    canvas.requestRenderAll()
  }

  function finalizePenPath() {
    const canvas = fabricRef.current; if (!canvas) return
    if (penFabricPath.current) { canvas.remove(penFabricPath.current); penFabricPath.current = null }
    const anchors = penAnchors.current
    if (anchors.length >= 2) {
      const d = anchorsToBzPath(anchors)
      const fp = new fabric.Path(d, {
        stroke: '#ffffff', strokeWidth: 2, fill: 'transparent',
        selectable: true, evented: true, objectCaching: false,
        lockScalingX: true, lockScalingY: true,
      })
        ; (fp as any)._bzAnchors = anchors.map(a => ({ ...a }))
      getObjId(fp); canvas.add(fp); canvas.setActiveObject(fp); pushHistory()
    }
    penAnchors.current = []; penDragging.current = false; penDragStart.current = null
    setTool('select')
  }

  // ── Bezier edit overlay ───────────────────────────────────────────────────
  function enterBzEdit(fp: fabric.Path) {
    // Parse stored anchors (if any) or synthesize from path commands
    const stored = (fp as any)._bzAnchors as BzAnchor[] | undefined
    if (!stored || stored.length < 2) return
    fp.set({ selectable: false, evented: false, hasControls: false })
    fabricRef.current?.requestRenderAll()
    setBzEdit({ pathId: getObjId(fp), anchors: stored.map(a => ({ ...a })), dragging: null })
  }

  function exitBzEdit() {
    if (!bzEditRef.current) return
    const canvas = fabricRef.current; if (!canvas) return
    const { pathId, anchors } = bzEditRef.current
    const fp = canvas.getObjects().find(o => (o as any).objId === pathId) as fabric.Path | undefined
    if (fp) {
      const d = anchorsToBzPath(anchors)
      fp.set({ path: (fabric.util as any).parsePath(d), selectable: true, evented: true, hasControls: true })
        ; (fp as any)._bzAnchors = anchors.map(a => ({ ...a }))
        ; (fp as any)._setPositionDimensions?.({})
      fp.setCoords(); canvas.setActiveObject(fp); pushHistory()
    }
    canvas.requestRenderAll()
    setBzEdit(null)
  }

  // ── Layers list ───────────────────────────────────────────────────────────
  function changeTool(t: Tool) { setTool(t); setShowFP(false); setShowFX(false) }

  function exportCanvas(format: 'png' | 'jpg' | 'svg' = 'png', multiplier = 2) {
    const canvas = fabricRef.current; if (!canvas) return
    if (format === 'svg') {
      const svg = (canvas as any).toSVG()
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'canvas.svg'; a.click()
      URL.revokeObjectURL(url); return
    }
    const url = canvas.toDataURL({ format: format as 'png' | 'jpeg', quality: 1, multiplier })
    const ext = format === 'jpg' ? 'jpg' : 'png'
    const a = document.createElement('a'); a.href = url; a.download = `canvas@${multiplier}x.${ext}`; a.click()
  }

  // ── Apply text ────────────────────────────────────────────────────────────
  function applyText(props: Partial<fabric.Textbox>) {
    const canvas = fabricRef.current, obj = canvas?.getActiveObject()
    if (!obj || (obj.type !== 'textbox' && obj.type !== 'i-text')) return
    obj.set(props as any)
    // If effects are active, update baseProps so the sum is correct
    if ((obj as any)._baseProps) {
      Object.assign((obj as any)._baseProps, props)
    }
    canvas!.requestRenderAll()
    setSel(prev => ({
      ...prev,
      ...(props.fontFamily !== undefined && { fontFamily: props.fontFamily }),
      ...(props.fontSize !== undefined && { fontSize: props.fontSize as number }),
      ...(props.fontWeight !== undefined && { bold: props.fontWeight === 'bold' }),
      ...(props.fontStyle !== undefined && { italic: props.fontStyle === 'italic' }),
      ...(props.underline !== undefined && { underline: !!props.underline }),
      ...(props.linethrough !== undefined && { linethrough: !!props.linethrough }),
      ...(props.textAlign !== undefined && { textAlign: props.textAlign }),
      ...(props.fill !== undefined && { fillColor: props.fill as string }),
      ...(props.stroke !== undefined && { strokeColor: props.stroke as string }),
      ...(props.strokeWidth !== undefined && { strokeWidth: props.strokeWidth as number }),
      ...(props.lineHeight !== undefined && { lineHeight: props.lineHeight as number }),
      ...(props.charSpacing !== undefined && { charSpacing: props.charSpacing as number }),
    }))
  }

  // ── Apply shape ───────────────────────────────────────────────────────────
  function applyShape(props: Partial<fabric.Object & { blendMode?: string }>) {
    const canvas = fabricRef.current, obj = canvas?.getActiveObject(); if (!obj) return
    if (props.blendMode) obj.set('globalCompositeOperation', props.blendMode as any)
    obj.set(props as any)
    // If effects are active, update baseProps so the sum is correct
    if ((obj as any)._baseProps) {
      Object.assign((obj as any)._baseProps, props)
    }
    canvas!.requestRenderAll()
    setSel(prev => ({
      ...prev,
      ...(props.fill !== undefined && { fillColor: props.fill as string }),
      ...(props.stroke !== undefined && { strokeColor: props.stroke as string }),
      ...(props.strokeWidth !== undefined && { strokeWidth: props.strokeWidth as number }),
      ...(props.opacity !== undefined && { opacity: Math.round((props.opacity as number) * 100) }),
      ...(props.blendMode !== undefined && { blendMode: props.blendMode }),
    }))
  }

  // ── Gradient ──────────────────────────────────────────────────────────────
  function applyGradient(colors: string[], angle = 0) {
    const canvas = fabricRef.current, obj = canvas?.getActiveObject(); if (!obj) return
    const rad = (angle * Math.PI) / 180, w = obj.width || 100, h = obj.height || 100
    const grad = new fabric.Gradient({
      type: 'linear', gradientUnits: 'pixels',
      coords: { x1: w / 2 - Math.cos(rad) * w / 2, y1: h / 2 - Math.sin(rad) * h / 2, x2: w / 2 + Math.cos(rad) * w / 2, y2: h / 2 + Math.sin(rad) * h / 2 },
      colorStops: colors.map((c, i) => ({ offset: i / (colors.length - 1), color: c }))
    })
    obj.set('fill', grad)
    if ((obj as any)._baseProps) (obj as any)._baseProps.fill = grad
    canvas!.requestRenderAll()
  }

  // ── Shadow ────────────────────────────────────────────────────────────────
  function applyShadow(u: Partial<SelState>) {
    const canvas = fabricRef.current, obj = canvas?.getActiveObject(); if (!obj) return
    const next = { ...sel, ...u }; setSel(next)
    const shadow = next.shadowEnabled ? new fabric.Shadow({ color: next.shadowColor, blur: next.shadowBlur, offsetX: next.shadowOffsetX, offsetY: next.shadowOffsetY }) : null
    obj.set('shadow', shadow)
    if ((obj as any)._baseProps) (obj as any)._baseProps.shadow = shadow
    canvas!.requestRenderAll()
  }

  // ── Effect presets ────────────────────────────────────────────────────────
  // ── Hex → RGB helper ──────────────────────────────────────────────────────
  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    if (!hex || typeof hex !== 'string') return null
    const clean = hex.replace('#', '')
    if (clean.length < 6) return null
    return { r: parseInt(clean.slice(0, 2), 16), g: parseInt(clean.slice(2, 4), 16), b: parseInt(clean.slice(4, 6), 16) }
  }
  function clamp(v: number, min = 0, max = 255) { return Math.min(max, Math.max(min, v)) }

  /**
   * REAPPLY ALL EFFECTS - The Single Source of Truth for object appearance.
   * This function rebuilds the visual stack from _baseProps + _appliedFX.
   */
  function reapplyAllEffects(obj: fabric.FabricObject, overrideProps?: any) {
    const canvas = fabricRef.current
    if (!obj || !canvas) return
    const fxObj = obj as any
    const fxProps = overrideProps || sel.fxProps || {}

    // 1. Ensure Base State is captured
    if (!fxObj._baseProps) {
      fxObj._baseProps = {
        fill: obj.fill,
        stroke: obj.stroke,
        strokeWidth: obj.strokeWidth,
        shadow: obj.shadow ? new fabric.Shadow({
          color: obj.shadow.color,
          blur: obj.shadow.blur,
          offsetX: obj.shadow.offsetX,
          offsetY: obj.shadow.offsetY
        }) : null,
        skewX: obj.skewX || 0,
        skewY: obj.skewY || 0,
        fontWeight: (obj as any).fontWeight || 'normal',
        opacity: obj.opacity ?? 1
      }
    }

    // 2. Start with a clean slate from baseProps
    const base = fxObj._baseProps
    const activeFX = fxObj._appliedFX || []

    // We start with base properties and will accumulate changes
    const workingProps = { ...base }
    // Filters are always a clear-and-rebuild array for the pipeline
    const workingFilters: any[] = []
    // Shadow accumulator — multiple effects can each contribute a shadow;
    // they are merged at the end (summed offsets, summed blurs, last color)
    const shadowAccum: Array<{ color: string; blur: number; offsetX: number; offsetY: number }> = []

    // 3. Process the stack of effects
    activeFX.forEach((key: string) => {
      const fp = fxProps[key] || {}
      const nc = sel.fillColor !== 'transparent' ? sel.fillColor : '#ffffff'

      // Determine base RGB for calculations (fallback to cyan if transparent)
      const baseCol = (typeof base.fill === 'string' && base.fill !== 'transparent') ? base.fill : '#00ffff'
      const rgb = hexToRgb(baseCol) || { r: 0, g: 255, b: 255 }

      switch (key) {
        case '3d': {
          const { r, g, b } = rgb
          const offset = fp.depth ?? 10
          const angleDeg = fp.angle ?? 45
          const angleRad = (angleDeg * Math.PI) / 180
          const color = fp.color || `rgba(${r},${g},${b},0.8)`

          workingProps.fill = color
          // Cumulative shadow contribution
          shadowAccum.push({
            color: 'rgba(0,0,0,0.4)',
            blur: 4,
            offsetX: Math.round(offset * Math.cos(angleRad) * 0.3),
            offsetY: Math.round(offset * Math.sin(angleRad) * 0.3),
          })
          // Volumetric 3D Filter
          workingFilters.push(new VolumetricDepthFilter({
            uDepth: offset / 50,
            uAngle: angleRad,
            uOpacity: 1.0,
          }))
          break
        }

        case 'glass': {
          const gcol = fp.color || '#ffffff'
          const op = (fp.opacity ?? 10) / 100
          workingProps.fill = gcol === 'transparent' ? 'transparent' : `${gcol}${Math.round(op * 255).toString(16).padStart(2, '0')}`
          workingProps.stroke = 'rgba(255,255,255,0.4)'
          workingProps.strokeWidth = (fp.border ?? 10) / 10
          shadowAccum.push({ color: 'rgba(255,255,255,0.15)', blur: 20, offsetX: 0, offsetY: 0 })
          break
        }

        case 'clay': {
          const { r, g, b } = rgb
          const soft = fp.softness ?? 30
          const ccol = fp.color || `rgba(${clamp(r + 20)},${clamp(g + 20)},${clamp(b + 20)},0.95)`
          workingProps.fill = ccol
          workingProps.stroke = `rgba(255,255,255,0.7)`
          workingProps.strokeWidth = 2
          shadowAccum.push({
            color: `rgba(${clamp(r - 50, 0)},${clamp(g - 50, 0)},${clamp(b - 50, 0)},0.4)`,
            blur: soft + 10,
            offsetX: Math.round(soft / 6),
            offsetY: Math.round(soft / 5),
          })
          workingFilters.push(new EliteClay({
            uInflate: (fp.volume ?? 50) / 100,
            uGlow: (fp.gloss ?? 30) / 100,
            uMatte: (fp.matte ?? 20) / 100,
          }))
          break
        }

        case 'skew':
          workingProps.skewX = fp.x ?? 10
          workingProps.skewY = fp.y ?? 0
          break

        case 'wavy':
          shadowAccum.push({ color: 'rgba(0,255,162,0.3)', blur: 25, offsetX: 0, offsetY: 0 })
          workingFilters.push(new WavyFilter({
            uIntensity: fp.intensity ?? 50,
            uFrequency: fp.frequency ?? 10
          }))
          break

        case 'glitch':
          shadowAccum.push({ color: '#ff0044', blur: 0, offsetX: (fp.amount ?? 10) / 5, offsetY: 0 })
          workingFilters.push(new Glitch({ uAmount: (fp.amount ?? 10) / 10 }))
          break

        case 'riso':
          workingProps.fill = fp.color1 || '#f72585'
          workingProps.stroke = fp.color2 || '#4cc9f0'
          workingFilters.push(new Risograph({ uIntensity: (fp.intensity ?? 50) / 100 }))
          break

        case 'thermal':
          workingFilters.push(new ThermalFilter({
            uIntensity: (fp.intensity ?? 100) / 100,
            uShift: (fp.shift ?? 0) / 100 * 0.6
          }))
          break

        case 'neon': {
          const ncol = fp.color || nc
          const aura = fp.blur ?? 30
          const weight = fp.intensity ?? 5
          workingProps.fill = ncol
          workingProps.stroke = ncol
          workingProps.strokeWidth = weight / 10
          shadowAccum.push({ color: ncol, blur: aura, offsetX: 0, offsetY: 0 })
          workingFilters.push(new NeonGlowFilter({
            uIntensity: aura / 50,
            uRadius: 1.5,
          }))
          break
        }

        case 'holo':
          workingFilters.push(new HolographicFilter({
            uIntensity: (fp.intensity ?? 50) / 100,
            uSpeed: (fp.speed ?? 50) / 50,
          }))
          break

        case 'bloom':
          workingFilters.push(new BloomFilter({
            uThreshold: (fp.threshold ?? 55) / 100,
            uIntensity: (fp.intensity ?? 50) / 100,
            uRadius: (fp.radius ?? 50) / 10,
          }))
          break

        case 'outline': {
          const oc = hexToRgb(fp.color ?? '#ffffff') || { r: 255, g: 255, b: 255 }
          workingFilters.push(new OutlineFilter({
            uThickness: (fp.thickness ?? 20) / 10,
            uR: oc.r / 255, uG: oc.g / 255, uB: oc.b / 255,
          }))
          break
        }

        case 'chrome':
          workingFilters.push(new LiquidMetalFilter({ uIntensity: (fp.intensity ?? 50) / 100 }))
          break

        case 'liquid':
          workingFilters.push(new LiquidMotionFilter({
            uIntensity: (fp.intensity ?? 50) / 100,
            uScale: (fp.scale ?? 30) / 10,
          }))
          break

        case 'vhs':
          workingFilters.push(new VHSFilter({ uIntensity: (fp.intensity ?? 60) / 100 }))
          break

        case 'matrix':
          workingFilters.push(new MatrixFilter({ uIntensity: (fp.intensity ?? 70) / 100 }))
          break

        case 'prism':
          workingFilters.push(new PrismFilter({ uAmount: fp.amount ?? 20 }))
          break

        case 'halftone':
          workingFilters.push(new EliteHalftone({
            uSize: fp.size ?? 10,
            uIntensity: (fp.intensity ?? 50) / 100
          }))
          break

        case 'pixelate':
          workingFilters.push(new PixelateFilter({ uSize: fp.size ?? 8 }))
          break

        case 'oil':
          workingFilters.push(new OilPaintFilter({
            uRadius: (fp.radius ?? 50) / 10,
            uIntensity: (fp.intensity ?? 80) / 100
          }))
          break

        // ── IMAGE CONTENT SPECIFIC FILTERS ────────────────────────────────────
        case 'Brightness': workingFilters.push(new fabric.filters.Brightness({ brightness: (fp.value ?? 0) / 100 })); break
        case 'Contrast': workingFilters.push(new fabric.filters.Contrast({ contrast: (fp.value ?? 0) / 100 })); break
        case 'Saturation': workingFilters.push(new fabric.filters.Saturation({ saturation: (fp.value ?? 0) / 100 })); break
        case 'Blur': workingFilters.push(new fabric.filters.Blur({ blur: (fp.value ?? 0) / 100 })); break
        case 'Noise': workingFilters.push(new fabric.filters.Noise({ noise: (fp.value ?? 0) * 0.5 })); break
        case 'HueRotation': workingFilters.push(new fabric.filters.HueRotation({ rotation: (fp.value ?? 0) / 180 * Math.PI })); break
        case 'Grayscale': workingFilters.push(new fabric.filters.Grayscale()); break
        case 'Sepia': workingFilters.push(new fabric.filters.Sepia()); break
        case 'Invert': workingFilters.push(new fabric.filters.Invert()); break

        default: break
      }
    })

    // ── SHADOW MERGING ────────────────────────────────────────────────────────
    if (shadowAccum.length > 0) {
      const merged = shadowAccum.reduce((acc, cur) => ({
        color: cur.color, // uses the last color
        blur: acc.blur + cur.blur,
        offsetX: acc.offsetX + cur.offsetX,
        offsetY: acc.offsetY + cur.offsetY
      }), { color: 'rgba(0,0,0,0.5)', blur: 0, offsetX: 0, offsetY: 0 })

      workingProps.shadow = new fabric.Shadow({
        color: merged.color,
        blur: Math.min(merged.blur, 100),
        offsetX: merged.offsetX,
        offsetY: merged.offsetY
      })
    }

    // 4. Apply everything back to the object
    obj.set({
      fill: workingProps.fill,
      stroke: workingProps.stroke,
      strokeWidth: workingProps.strokeWidth,
      shadow: workingProps.shadow,
      skewX: workingProps.skewX,
      skewY: workingProps.skewY,
      opacity: workingProps.opacity
    })
    if (workingProps.fontWeight) (obj as any).set('fontWeight', workingProps.fontWeight)

    // Handle Filters
    // Video objects MUST keep objectCaching:false so live frames are rendered every tick.
    // Setting objectCaching:true on a video-backed Image causes drawImage(0×0) crashes.
    const isVideoObj = !!(obj as any).isVideo
    obj.set({ objectCaching: !isVideoObj && (activeFX.length > 0 || workingFilters.length > 0) })
    ;(obj as any).filters = workingFilters
    if ((obj as any).filters.length > 0) {
      if (isVideoObj) {
        // For video: only call applyFilters when the video element has decoded frames
        const vid = (obj as any).videoElement as HTMLVideoElement | undefined
        if (vid && vid.videoWidth > 0 && vid.videoHeight > 0) {
          ; (obj as any).applyFilters?.()
        } else if (vid) {
          vid.addEventListener('loadeddata', () => {
            ; (obj as any).applyFilters?.()
            fabricRef.current?.requestRenderAll()
          }, { once: true })
        }
      } else {
        ; (obj as any).applyFilters?.()
      }
    }

    obj.set('dirty', true)
    canvas.requestRenderAll()
  }

  function applyPreset(key: string) {
    const canvas = fabricRef.current, obj = canvas?.getActiveObject(); if (!obj) return
    const fxObj = obj as any
    const prev: string[] = fxObj._appliedFX || []
    const isOn = prev.includes(key)

    if (isOn) {
      fxObj._appliedFX = prev.filter((k: string) => k !== key)
    } else {
      fxObj._appliedFX = [...prev, key]
    }

    reapplyAllEffects(obj)
    pushHistory()
    setSel(p => ({
      ...p,
      appliedFX: [...fxObj._appliedFX],
      shadowEnabled: !!obj.shadow,
      fillColor: (obj.fill && typeof obj.fill === 'string' ? obj.fill : p.fillColor)
    }))
  }

  function updateEffectProp(key: string, prop: string, val: number) {
    const canvas = fabricRef.current, obj = canvas?.getActiveObject()
    if (!obj) return
    const fxObj = obj as any
    if (!fxObj.fxProps) fxObj.fxProps = {}
    if (!fxObj.fxProps[key]) fxObj.fxProps[key] = {}

    // 1. Direct mutation on Fabric object for immediate visual update in RAF
    fxObj.fxProps[key][prop] = val

    // 2. Throttle the heavy re-render + React state sync
    if (!effectRafRef.current) {
      effectRafRef.current = requestAnimationFrame(() => {
        // Deep clone fxProps for React to ensure all sliders re-render
        const latestProps = JSON.parse(JSON.stringify(fxObj.fxProps))

        reapplyAllEffects(obj, latestProps)
        setSel(prev => ({ ...prev, fxProps: latestProps }))

        effectRafRef.current = null
      })
    }
  }

  // ── Arrow toggles ─────────────────────────────────────────────────────────
  function toggleArrow(w: 'start' | 'end') {
    const canvas = fabricRef.current, obj = canvas?.getActiveObject()
    if (!(obj instanceof ArrowLine)) return
    if (w === 'start') { obj.hasStartArrow = !obj.hasStartArrow; setSel(p => ({ ...p, hasStartArrow: obj.hasStartArrow })) }
    else { obj.hasEndArrow = !obj.hasEndArrow; setSel(p => ({ ...p, hasEndArrow: obj.hasEndArrow })) }
    canvas!.requestRenderAll()
  }
  function toggleConnector() {
    const canvas = fabricRef.current, obj = canvas?.getActiveObject()
    if (!(obj instanceof ArrowLine)) return
    obj.isConnector = !obj.isConnector; snapRef.current = obj.isConnector
    setSel(p => ({ ...p, isConnector: obj.isConnector })); canvas!.requestRenderAll()
  }

  // ── Artboard / Print Frame ────────────────────────────────────────────────
  function addArtboard(w: number, h: number, baseName: string, exportType: ArtboardExportType = 'social', x = 100, y = 100) {
    const canvas = fabricRef.current; if (!canvas) return

    // 1. Generate a unique name
    const all = canvas.getObjects()
    const existing = all.filter(o => (o as any).isArtboard).map(o => o.get('name') || '')
    let name = `artboard_${baseName}`
    let counter = 1
    while (existing.includes(name)) {
      name = `artboard_${baseName} (${++counter})`
    }
    const displayName = name.replace('artboard_', '')

    // Create the primary Frame (Rect)
    const rect = new fabric.Rect({
      left: x,
      top: y,
      width: w,
      height: h,
      fill: '#ffffff',
      stroke: 'rgba(255,255,255,0.1)',
      strokeWidth: 1,
      name: name,
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.5)',
        blur: 25,
        offsetX: 0,
        offsetY: 8
      })
    })
      ; (rect as any).isArtboard = true
      ; (rect as any).artboardExportType = exportType

    canvas.add(rect)
    canvas.sendObjectToBack(rect as fabric.FabricObject)
    canvas.renderAll()
    setActiveArtboardId(rect.get('name') || null)
    setShowAB(false)
    return name
  }



  function renameArtboard(oldName: string, newName: string) {
    const canvas = fabricRef.current; if (!canvas) return
    const all = canvas.getObjects()
    const rect = all.find(o => o.get('name') === oldName)
    if (rect) {
      rect.set('name', newName)
    }
    canvas.renderAll()
    updateArtboardBadges()
  }

  function rearrangeArtboards(layout: 'strip' | 'grid' = 'strip', spacing = 100, columns = 4) {
    const canvas = fabricRef.current; if (!canvas) return
    const abs = canvas.getObjects().filter(o => (o as any).isArtboard)

    // 1. Group objects by artboard
    const artboardMap = new Map<string, { rect: fabric.Object, children: fabric.Object[] }>()
    abs.forEach(ab => {
      const name = ab.get('name')!
      const b = ab.getBoundingRect(false)
      const children = canvas.getObjects().filter(o =>
        !(o as any).isArtboard &&
        !o.get('name')?.startsWith('label_') &&
        o.left! >= b.left && o.left! <= b.left + b.width &&
        o.top! >= b.top && o.top! <= b.top + b.height
      )

      artboardMap.set(name, { rect: ab, children })
    })

    // 2. Sort artboards by name or logic
    const sorted = Array.from(artboardMap.values()).sort((a, b) =>
      (a.rect.get('name') || '').localeCompare(b.rect.get('name') || '')
    )

    // 3. Position them
    let currentX = 100
    let currentY = 100
    let rowMaxHeight = 0

    sorted.forEach((item, i) => {
      const col = i % columns
      if (col === 0 && i > 0) {
        currentX = 100
        currentY += rowMaxHeight + spacing + 50 // 50 for label
        rowMaxHeight = 0
      }

      const dx = currentX - item.rect.left!
      const dy = currentY - item.rect.top!

      item.rect.set({ left: currentX, top: currentY })
      item.rect.setCoords()

      item.children.forEach(c => {
        c.set({ left: (c.left || 0) + dx, top: (c.top || 0) + dy })
        c.setCoords()
      })

      rowMaxHeight = Math.max(rowMaxHeight, item.rect.height || 0)
      currentX += (item.rect.width || 0) + spacing
    })

    canvas.requestRenderAll()
    updateArtboardBadges()
  }

  /**
   * handleAICommand: The core AI Design Engine executor.
   * Handles incoming tools (createDesignBoards, updateCanvasElements)
   * passed from the AI Co-Pilot / Launch Hub.
   */
  const handleAICommand = async (command: any) => {
    const canvas = fabricRef.current; if (!canvas) return
    if (!command || !command.toolName) return

    // ─── 1. createDesignBoards ─────────────────────────────────────────────
    if (command.toolName === 'createDesignBoards') {
      const payload = command.result ?? command.args ?? {}
      const boards = payload.boards || []
      const gridColumns = 12

      // Build flat shape lookup map once
      const SHAPE_MAP: Record<string, string> = {}
      Object.values(SHAPE_LIBRARY).forEach((items: any[]) => {
        items.forEach(item => { if (item.name && item.path) SHAPE_MAP[item.name] = item.path })
      })
      PRO_ASSETS.forEach(asset => { SHAPE_MAP[asset.name] = asset.path; SHAPE_MAP[asset.id] = asset.path })

      const deferredImages: Array<{ artboardName: string; boardW: number; boardH: number; el: any }> = []

      // ── AAA DESIGN GUARDRAILS ──
      const getLuminance = (hex: string) => {
        const rgb = hex.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16) / 255) || [0, 0, 0]
        const [r, g, b] = rgb.map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const getContrast = (hex1: string, hex2: string) => {
        const l1 = getLuminance(hex1) + 0.05
        const l2 = getLuminance(hex2) + 0.05
        return l1 > l2 ? l1 / l2 : l2 / l1
      }
      const contrastGuardrail = (textColor: string, bgColor: string) => {
        const contrast = getContrast(textColor, bgColor)
        if (contrast < 4.5) {
          return getLuminance(bgColor) > 0.5 ? '#000000' : '#ffffff'
        }
        return textColor
      }

      // SEMANTIC TOKEN RESOLVERS
      const resolveColor = (color: string) => {
        if (!color) return '#ffffff'
        const tokens: Record<string, string> = {
          'brand-primary': '#7c3aed', 'brand-secondary': '#00ffa2', 'brand-accent': '#ff00ff',
          'surface-0': '#090909', 'surface-1': '#1a1a1a', 'surface-2': '#2a2a2a',
          'text-high': '#ffffff', 'text-medium': '#a1a1aa', 'text-low': '#71717a',
          'status-success': '#22c55e', 'status-error': '#ef4444',
          'luxury-gold': '#C9A84C', 'luxury-cream': '#F5F5F0', 'tech-neon': '#00FFA2', 'organic-lime': '#A8E063'
        }
        return tokens[color] || color
      }
      const resolveFontSize = (size: string | number) => {
        if (typeof size === 'number') return size
        const tokens: Record<string, number> = {
          'fs-xs': 12, 'fs-sm': 14, 'fs-md': 16, 'fs-lg': 20, 'fs-xl': 28, 'fs-2xl': 44, 'fs-3xl': 80, 'fs-hero': 120
        }
        return tokens[size] || 16
      }
      const resolveRadius = (radius: string | number) => {
        if (typeof radius === 'number') return radius
        const tokens: Record<string, number> = {
          'radius-none': 0, 'radius-sm': 4, 'radius-md': 8, 'radius-lg': 16, 'radius-xl': 32, 'radius-full': 9999
        }
        return tokens[radius] || 0
      }
      const buildFill = (el: any): string | fabric.Gradient<'linear' | 'radial'> | fabric.Pattern => {
        if (el.gradient?.stops?.length >= 2) {
          const stops = el.gradient.stops.map((s: any) => ({ offset: s.offset, color: resolveColor(s.color) }))
          if (el.gradient.type === 'radial') {
            return new fabric.Gradient({
              type: 'radial', coords: { x1: 0.5, y1: 0.5, r1: 0, x2: 0.5, y2: 0.5, r2: 0.5 },
              colorStops: stops, gradientUnits: 'percentage'
            })
          }
          const angle = ((el.gradient.angle || 0) * Math.PI) / 180
          return new fabric.Gradient({
            type: 'linear',
            coords: { x1: 0.5 - Math.cos(angle) * 0.5, y1: 0.5 - Math.sin(angle) * 0.5, x2: 0.5 + Math.cos(angle) * 0.5, y2: 0.5 + Math.sin(angle) * 0.5 },
            colorStops: stops, gradientUnits: 'percentage'
          })
        }
        return resolveColor(el.color)
      }

      boards.forEach((b: any, bIdx: number) => {
        const boardW = b.width || 1080
        const boardH = b.height || 1080
        const colW = boardW / gridColumns

        // Find rightmost artboard to avoid overlap
        const existingAbs = canvas.getObjects().filter(o => (o as any).isArtboard)
        let maxX = 0
        existingAbs.forEach(ab => {
          const right = (ab.left || 0) + (ab.getScaledWidth() || 0)
          if (right > maxX) maxX = right
        })

        const initialX = (maxX > 0 ? maxX + 200 : 100) + (bIdx * (boardW + 200))
        const artboardName = addArtboard(boardW, boardH, b.name, 'social', initialX, 100)
        
        const rect = canvas.getObjects().find(o => o.get('name') === artboardName)
        if (!rect) return
        const offsetX = rect.left!, offsetY = rect.top!

        const elsByZIndex = [...(b.elements || [])].sort((a: any, c: any) => (a.zIndex ?? 0) - (c.zIndex ?? 0))
        elsByZIndex.forEach((el: any, index: number) => {
          const elId = el.id || `${b.name}_${el.type}_${index}`
          if (el.type === 'image' && el.url) {
            deferredImages.push({ artboardName, boardW, boardH, el: { ...el, id: elId } })
            return
          }

          let obj: fabric.Object | null = null
          const elW = el.w ?? (el.type === 'text' ? boardW : 100)
          const elH = el.h ?? (el.type === 'text' ? 60 : 100)

          let fx = el.x ?? 0, fy = el.y ?? 0
          if (el.column !== undefined) fx = el.column * colW
          if (el.span !== undefined) el.w = el.span * colW
          if (el.alignX === 'center') fx = (boardW - elW) / 2
          else if (el.alignX === 'right') fx = boardW - elW - (el.marginRight ?? 0)
          if (el.alignY === 'center') fy = (boardH - elH) / 2
          else if (el.alignY === 'bottom') fy = boardH - elH - (el.marginBottom ?? 0)

          const common: any = {
            left: offsetX + fx, top: offsetY + fy, name: elId, parentBoard: artboardName,
            fill: buildFill(el), ...(el.opacity !== undefined && { opacity: el.opacity }),
            ...(el.stroke && { stroke: resolveColor(el.stroke) }),
            ...(el.strokeWidth !== undefined && { strokeWidth: el.strokeWidth }),
            ...(el.originX && { originX: el.originX }),
            ...(el.originY && { originY: el.originY })
          }

          if (el.type === 'text') {
            injectGoogleFont(el.fontFamily || 'Inter')
            const rawText = el.text || ''
            const displayText = el.textTransform === 'uppercase' ? rawText.toUpperCase()
              : el.textTransform === 'lowercase' ? rawText.toLowerCase()
              : rawText
            obj = new fabric.Textbox(displayText, {
              ...common,
              fontSize: resolveFontSize(el.fontSize || 32),
              fontFamily: el.fontFamily || 'Inter',
              fontWeight: el.fontWeight || '400',
              fontStyle: el.fontStyle || 'normal',
              textAlign: el.textAlign || 'left',
              width: elW,
              ...(el.letterSpacing !== undefined && { charSpacing: el.letterSpacing * 1000 }),
              ...(el.lineHeight !== undefined && { lineHeight: el.lineHeight }),
            })
            if (el.textTransform) (obj as any)._textTransform = el.textTransform
          } else if (el.type === 'rect') {
            obj = new fabric.Rect({ ...common, width: elW, height: elH, rx: resolveRadius(el.borderRadius || 0), ry: resolveRadius(el.borderRadius || 0) })
          } else if (el.type === 'circle') {
            obj = new fabric.Ellipse({ ...common, rx: elW / 2, ry: elH / 2 })
          } else if (el.type === 'path') {
            let svgPath = (el.shapeId ? SHAPE_MAP[el.shapeId] : el.pathData) || ''
            if (svgPath) {
              obj = new fabric.Path(svgPath, { ...common, scaleX: (elW / 100), scaleY: (elH / 100) })
            }
          } else if (el.type === 'line') {
            // x1,y1,x2,y2 sono coordinate relative alla posizione x,y dell'elemento
            const x1 = el.x1 ?? 0
            const y1 = el.y1 ?? 0
            const x2 = el.x2 ?? elW
            const y2 = el.y2 ?? 0
            obj = new fabric.Line([x1, y1, x2, y2], {
              ...common,
              stroke: resolveColor(el.stroke || el.color || '#ffffff'),
              strokeWidth: el.strokeWidth ?? 2,
              fill: '',
            })
          } else if (el.type === 'procedural') {
            const pType = (el.proceduralType || 'halftone') as ProceduralType
            obj = generateProceduralPattern(pType, {
              width: elW, height: elH,
              color: resolveColor(el.color || '#ffffff'),
              density: el.density ?? 0.5,
              radius: el.procRadius ?? 5
            })
            // Apply common properties to the generated group
            obj.set(common)
          }

          if (obj) {
            if (el.effects) { (obj as any)._appliedFX = el.effects; (obj as any).fxProps = el.effectProps; reapplyAllEffects(obj) }
            canvas.add(obj)
          }
        })
      })

      // Load images and then final alignment
      if (deferredImages.length > 0) {
        // Helper: limita il caricamento immagini a 8s — evita blocchi su URL lenti/invalidi
        const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
          Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`img timeout ${ms}ms`)), ms))])

        Promise.all(deferredImages.map(({ artboardName, el }) => {
          const artboard = canvas.getObjects().find(o => o.get('name') === artboardName)
          if (!artboard) return Promise.resolve()

          const loadUrl = el.url.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(el.url)}` : el.url

          return withTimeout(fabric.FabricImage.fromURL(loadUrl, { crossOrigin: 'anonymous' }), 8000).then(img => {
            img.set({ left: artboard.left! + (el.x ?? 0), top: artboard.top! + (el.y ?? 0), name: el.id, parentBoard: artboardName })
            if (el.w) img.scaleToWidth(el.w)
            canvas.add(img); canvas.moveObjectTo(img, canvas.getObjects().indexOf(artboard) + 1)
          }).catch(e => {
            console.error('[canvas] image load failed:', el.url, e)
            // Fallback placeholder
            const placeholder = new fabric.Rect({
              left: artboard.left! + (el.x ?? 0),
              top: artboard.top! + (el.y ?? 0),
              width: el.w || 400,
              height: el.h || 400,
              fill: '#0f172a',
              stroke: '#ef4444',
              strokeWidth: 2,
              name: el.id,
              parentBoard: artboardName
            })
            const labelText = new fabric.Textbox('Immagine Non Disponibile', {
              left: artboard.left! + (el.x ?? 0) + 10,
              top: artboard.top! + (el.y ?? 0) + 10,
              fontSize: 16,
              fill: '#ef4444',
              fontFamily: 'Inter',
              width: (el.w || 400) - 20,
              parentBoard: artboardName
            })
            canvas.add(placeholder, labelText)
            canvas.moveObjectTo(placeholder, canvas.getObjects().indexOf(artboard) + 1)
            canvas.moveObjectTo(labelText, canvas.getObjects().indexOf(artboard) + 2)
          })
        })).then(() => {
          rearrangeArtboards('strip', 100, 1)
          canvas.requestRenderAll()
        })
      } else {
        rearrangeArtboards('strip', 100, 1)
      }

      requestAnimationFrame(() => {
        const allAbs = canvas.getObjects().filter(o => (o as any).isArtboard)
        if (!allAbs.length) return
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        allAbs.forEach(ab => {
          const b = ab.getBoundingRect(false)
          minX = Math.min(minX, b.left); minY = Math.min(minY, b.top); maxX = Math.max(maxX, b.left + b.width); maxY = Math.max(maxY, b.top + b.height)
        })
        const cw = maxX - minX, ch = maxY - minY
        const fitZoom = Math.min((canvas.width! * 0.8) / cw, (canvas.height! * 0.8) / ch, 2)
        canvas.setZoom(fitZoom)
        canvas.viewportTransform![4] = (canvas.width! - cw * fitZoom) / 2 - minX * fitZoom
        canvas.viewportTransform![5] = (canvas.height! - ch * fitZoom) / 2 - minY * fitZoom
        canvas.requestRenderAll(); setZoom(fitZoom); updateArtboardBadges()
      })
    }

    // ─── 2. updateCanvasElements ───────────────────────────────────────────
    if (command.toolName === 'updateCanvasElements') {
      const payload = command.result ?? command.args ?? {}
      const updates = payload.updates as Array<{ id: string; changes: any }> | undefined
      if (!updates?.length) return

      const findParentArtboard = (obj: fabric.Object) => {
        const objCenter = obj.getCenterPoint()
        return canvas.getObjects().find(o => {
          if (!(o as any).isArtboard) return false
          const b = o.getBoundingRect(false)
          return objCenter.x >= b.left && objCenter.x <= b.left + b.width &&
            objCenter.y >= b.top && objCenter.y <= b.top + b.height
        })
      }

      updates.forEach(({ id, changes }) => {
        // Robust ID matching: try exact name, then partial if reasonable
        const cleanId = id?.replace(/['"]/g, '').trim()
        let obj = canvas.getObjects().find(o => o.get('name') === cleanId) as any
        
        if (!obj && cleanId) {
          // Fallback: search for object whose name starts with or ends with the ID
          obj = canvas.getObjects().find(o => {
            const name = o.get('name')
            return name && (name.includes(cleanId) || cleanId.includes(name))
          })
        }

        if (!obj) return
        if (changes.color !== undefined) obj.set('fill', changes.color)
        if (changes.opacity !== undefined) obj.set('opacity', changes.opacity)
        if (changes.stroke !== undefined) obj.set('stroke', changes.stroke)
        if (changes.strokeWidth !== undefined) obj.set('strokeWidth', changes.strokeWidth)

        if (changes.x !== undefined || changes.y !== undefined || changes.w !== undefined || changes.h !== undefined) {
          const ab = findParentArtboard(obj)
          if (ab) {
            const abLeft = ab.left!
            const abTop = ab.top!
            const abW = (ab as any).width || ab.getScaledWidth()
            const abH = (ab as any).height || ab.getScaledHeight()
            if (changes.w !== undefined) {
              if (obj.type === 'textbox' || obj.type === 'i-text') obj.set('width', changes.w)
              else obj.set('width', changes.w)
            }
            if (changes.h !== undefined && obj.type !== 'textbox' && obj.type !== 'i-text') {
              obj.set('height', changes.h)
            }
            if (changes.x !== undefined) {
              const clamped = Math.max(0, Math.min(changes.x, abW - (obj.getScaledWidth?.() || 0)))
              obj.set('left', abLeft + clamped)
            }
            if (changes.y !== undefined) {
              const clamped = Math.max(0, Math.min(changes.y, abH - (obj.getScaledHeight?.() || 0)))
              obj.set('top', abTop + clamped)
            }
          }
        }

        // Text-specific properties
        if (obj.type === 'textbox' || obj.type === 'i-text') {
          if (changes.fontFamily) { injectGoogleFont(changes.fontFamily); obj.set('fontFamily', changes.fontFamily) }
          if (changes.fontWeight) obj.set('fontWeight', changes.fontWeight)
          if (changes.fontStyle) obj.set('fontStyle', changes.fontStyle)
          if (changes.fontSize) obj.set('fontSize', changes.fontSize)
          if (changes.textAlign) obj.set('textAlign', changes.textAlign)
          if (changes.letterSpacing !== undefined) obj.set('charSpacing', changes.letterSpacing * 1000)
          if (changes.lineHeight !== undefined) obj.set('lineHeight', changes.lineHeight)
          if (changes.text !== undefined) {
            const transform = changes.textTransform || (obj._textTransform)
            const t = transform === 'uppercase' ? changes.text.toUpperCase()
              : transform === 'lowercase' ? changes.text.toLowerCase()
                : changes.text
            obj.set('text', t)
          }
          if (changes.textTransform && !changes.text) {
            const currentText = obj.text || ''
            const t = changes.textTransform === 'uppercase' ? currentText.toUpperCase()
              : changes.textTransform === 'lowercase' ? currentText.toLowerCase()
                : currentText
            obj.set('text', t)
            obj._textTransform = changes.textTransform
          }
        }

        // Rect-specific
        if ((obj.type === 'rect') && changes.borderRadius !== undefined) {
          obj.set('rx', changes.borderRadius)
          obj.set('ry', changes.borderRadius)
        }

        // Scale for path/image
        if (obj.type === 'path' || obj.type === 'image') {
          if (changes.scaleX !== undefined) obj.set('scaleX', changes.scaleX)
          if (changes.scaleY !== undefined) obj.set('scaleY', changes.scaleY)
        }
      })

      canvas.requestRenderAll()
      pushHistory()
    }

    // ─── 3. clearBoard ────────────────────────────────────────────────────
    if (command.toolName === 'clearBoard') {
      const payload = command.result ?? command.args ?? {}
      const boardName = payload.boardName as string | undefined
      const objectsToRemove = canvas.getObjects().filter(o => {
        if ((o as any).isArtboard) return false
        if (boardName) return (o as any).parentBoard === boardName
        return true
      })
      objectsToRemove.forEach(o => canvas.remove(o))
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      pushHistory()
    }

    // ─── 4. deleteElements ────────────────────────────────────────────────
    if (command.toolName === 'deleteElements') {
      const payload = command.result ?? command.args ?? {}
      const ids = (payload.ids as string[]) || []
      ids.forEach(id => {
        const obj = canvas.getObjects().find(o => o.get('name') === id)
        if (obj) canvas.remove(obj)
      })
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      pushHistory()
    }

    // ─── 5. getCanvasState (read-only) ────────────────────────────────────
    if (command.toolName === 'getCanvasState') {
      const snapshot = canvas.getObjects()
        .filter(o => !(o as any).isArtboard)
        .map(o => ({
          name: o.get('name'),
          type: o.type,
          parentBoard: (o as any).parentBoard,
          left: Math.round(o.left ?? 0),
          top: Math.round(o.top ?? 0),
        }))
      canvas.requestRenderAll()
    }

    // Always push a snapshot after any tool was (at least tried to be) executed
    pushSnapshot()
  }

  // Handle aiCommands queue sequentially
  useEffect(() => {
    if (aiCommands && aiCommands.length > 0) {
      const processQueue = async () => {
        // Copia per evitare mutazioni durante il loop
        const queue = [...aiCommands]
        if (onClearAICommands) onClearAICommands()
        
        for (const cmd of queue) {
          await handleAICommand(cmd)
        }
      }
      processQueue()
    }
  }, [aiCommands, onClearAICommands])

  // Backward compatibility for single onAICommand
  useEffect(() => {
    if (onAICommand && (!aiCommands || aiCommands.length === 0)) {
      handleAICommand(onAICommand)
    }
  }, [onAICommand, aiCommands])

  // ── Canvas Snapshot for AI context ────────────────────────────────────────
  // Serializza lo stato del canvas in testo leggibile dall'AI ogni volta che
  // un comando AI viene eseguito o il canvas cambia significativamente.
  const buildCanvasSnapshot = React.useCallback((): string | null => {
    const canvas = fabricRef.current
    if (!canvas) return null
    const artboards = canvas.getObjects().filter(o => (o as any).isArtboard)
    if (artboards.length === 0) return null

    const lines: string[] = ['## Canvas attuale']
    artboards.forEach(ab => {
      const name = ab.get('name') || 'Senza nome'
      const w = Math.round((ab as any).width || ab.getScaledWidth())
      const h = Math.round((ab as any).height || ab.getScaledHeight())
      lines.push(`\nTavola "${name}" (${w}×${h}):`)
      const elements = canvas.getObjects().filter(o =>
        !(o as any).isArtboard && (o as any).parentBoard === name
      )
      elements.forEach(o => {
        const id = o.get('name') || '?'
        const type = o.type || '?'
        const x = Math.round((o.left ?? 0) - (ab.left ?? 0))
        const y = Math.round((o.top ?? 0) - (ab.top ?? 0))
        const w2 = Math.round(o.getScaledWidth())
        const h2 = Math.round(o.getScaledHeight())
        const extras: string[] = []
        if (type === 'textbox' || type === 'i-text') {
          const t = o as any
          extras.push(`text:"${(t.text || '').slice(0, 40).replace(/\n/g, ' ')}"`)
          if (t.fontFamily) extras.push(`font:${t.fontFamily}`)
          if (t.fontSize) extras.push(`size:${Math.round(t.fontSize)}`)
          if (t.fill) extras.push(`color:${t.fill}`)
        } else if (type === 'rect' || type === 'ellipse') {
          const r = o as any
          if (r.fill && typeof r.fill === 'string') extras.push(`color:${r.fill}`)
          if (r.opacity !== undefined && r.opacity < 1) extras.push(`opacity:${r.opacity}`)
        }
        lines.push(`  [${id}] ${type} @ x:${x} y:${y} w:${w2} h:${h2}${extras.length ? ' — ' + extras.join(' ') : ''}`)
      })
    })
    return lines.join('\n')
  }, [])

  // Aggiorna snapshot ogni volta che il canvas cambia (oggetti aggiunti/rimossi/modificati)
  // e dopo ogni comando AI. Usa debounce 600ms per non spammare.
  const snapshotTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const pushSnapshot = React.useCallback(() => {
    if (!onCanvasSnapshot) return
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current)
    snapshotTimerRef.current = setTimeout(() => {
      onCanvasSnapshot(buildCanvasSnapshot())
    }, 600)
  }, [onCanvasSnapshot, buildCanvasSnapshot])

  // Abbonati agli eventi del canvas appena è pronto
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !onCanvasSnapshot) return
    const handler = () => pushSnapshot()
    canvas.on('object:added', handler)
    canvas.on('object:removed', handler)
    canvas.on('object:modified', handler)
    // Prima snapshot al mount
    pushSnapshot()
    return () => {
      canvas.off('object:added', handler)
      canvas.off('object:removed', handler)
      canvas.off('object:modified', handler)
    }
  }, [onCanvasSnapshot, pushSnapshot])

  // Snapshot aggiuntivo dopo comandi AI (le immagini si caricano in async)
  useEffect(() => {
    if (onAICommand) pushSnapshot()
  }, [onAICommand, pushSnapshot])

  // ── Link ──────────────────────────────────────────────────────────────────
  function addLink() {
    const url = prompt('URL link:'); if (!url) return
    const canvas = fabricRef.current, obj = canvas?.getActiveObject() as any
    if (!obj || obj.type !== 'textbox') return
    obj._linkUrl = url; obj.set('fill', '#60a5fa'); obj.set('underline', true)
    canvas!.requestRenderAll(); setSel(p => ({ ...p, underline: true, fillColor: '#60a5fa' }))
  }

  // ── Image Filters ─────────────────────────────────────────────────────────
  /**
   * applyImgFilter - Unified Image Adjustment
   * Updates metadata and triggers the pipeline.
   */
  function applyImgFilter(type: string, value?: number) {
    const canvas = fabricRef.current, img = canvas?.getActiveObject()
    if (!img || img.type !== 'image') return
    const fxObj = img as any
    const prev: string[] = fxObj._appliedFX || []

    // 1. Maintain active list (Sync for logical consistency)
    if (value === 0 || value === undefined) {
      fxObj._appliedFX = prev.filter((k: string) => k !== type)
    } else if (!prev.includes(type)) {
      fxObj._appliedFX = [...prev, type]
    }

    // 2. Schedule throttled update
    pendingFXRef.current = { type, value: value ?? 0 }

    if (!effectRafRef.current) {
      effectRafRef.current = requestAnimationFrame(() => {
        const data = pendingFXRef.current
        if (!data) { effectRafRef.current = null; return }

        const latestProps = { ...sel.fxProps }
        latestProps[data.type] = { ...(latestProps[data.type] || {}), value: data.value }

        setSel(p => ({ ...p, appliedFX: [...fxObj._appliedFX], fxProps: latestProps }))
        reapplyAllEffects(img, latestProps)

        pendingFXRef.current = null
        effectRafRef.current = null
      })
    }
  }

  /**
   * applyPresetFilter - Cinematic Image Presets
   */
  function applyPresetFilter(preset: 'vintage' | 'chrome' | 'noir' | 'glitch' | 'riso') {
    const canvas = fabricRef.current, img = canvas?.getActiveObject()
    if (!img || img.type !== 'image') return
    const fxObj = img as any
    const internalKey = preset === 'chrome' ? 'img-chrome' : preset
    const prev: string[] = fxObj._appliedFX || []

    if (prev.includes(internalKey)) {
      fxObj._appliedFX = prev.filter((k: string) => k !== internalKey)
    } else {
      fxObj._appliedFX = [...prev, internalKey]
    }

    reapplyAllEffects(img)
    setSel(p => ({ ...p, appliedFX: [...(fxObj._appliedFX || [])] }))
  }

  function resetImgFilters() {
    const canvas = fabricRef.current, img = canvas?.getActiveObject()
    if (!img || img.type !== 'image') return
    const fxObj = img as any
    fxObj._appliedFX = []

    reapplyAllEffects(img)
    setSel(p => ({ ...p, appliedFX: [] }))
  }

  // ── Remove BG ─────────────────────────────────────────────────────────────
  async function removeBg() {
    const canvas = fabricRef.current, obj = canvas?.getActiveObject()
    if (!obj || obj.type !== 'image') return
    setBgR(true)
    try {
      const bg = await import('@imgly/background-removal')
      const fn = (bg as any).default ?? bg
      const blob = await fn((obj as any).getElement().src)
      const url = URL.createObjectURL(blob)
      const img = await fabric.Image.fromURL(url, { crossOrigin: 'anonymous' })
      img.set({ left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY })
      canvas!.remove(obj); canvas!.add(img); canvas!.setActiveObject(img); canvas!.renderAll()
    } catch (e: any) { alert('Errore: ' + e.message) } finally { setBgR(false) }
  }

  // ── Library ───────────────────────────────────────────────────────────────
  function addLibShape(path: string) {
    const canvas = fabricRef.current; if (!canvas) return
    const p = new fabric.Path(path, { left: 200, top: 200, fill: 'rgba(255,255,255,0.15)', stroke: '#ffffff', strokeWidth: 2, scaleX: 1.5, scaleY: 1.5 })
    canvas.add(p); canvas.setActiveObject(p); canvas.requestRenderAll()
  }
  function addLibIcon(svgPath: string) {
    const canvas = fabricRef.current; if (!canvas) return
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${svgPath}"/></svg>`
    fabric.loadSVGFromString(svg).then(({ objects }) => {
      const g = new fabric.Group(objects as fabric.FabricObject[], {
        left: 200, top: 200, scaleX: 3, scaleY: 3
      })
      canvas.add(g); canvas.setActiveObject(g); canvas.requestRenderAll()
    })
  }

  // ── Subtitles & AI ───────────────────────────────────────────────────────
  async function generateSubtitles() {
    if (audioTracks.length === 0) return
    setIsTranscribing(true)
    setTranscriptionProgress(0)

    try {
      // 1. Get Mixed Audio at 16kHz
      const audioData = await audioEngine.renderMix(audioTracks)

      // 2. Initialize Worker
      const worker = new Worker(new URL('./workers/transcription-worker.ts', import.meta.url))

      worker.onmessage = (e) => {
        const { status, progress, result, data, error } = e.data

        if (status === 'progress') {
          setTranscriptionProgress(progress)
        } else if (status === 'update') {
          // Partial updates if supported
        } else if (status === 'complete') {
          console.log("[AI] Transcription complete:", result)
          const segments = result.chunks || []

          // 3. Map to Canvas Objects
          const canvas = fabricRef.current; if (!canvas) return

          const newSubs = segments.map((s: any, idx: number) => {
            const text = new fabric.IText(s.text.trim(), {
              left: canvas.width! / 2,
              top: canvas.height! - 100,
              fontSize: 32,
              fill: '#ffffff',
              fontFamily: 'Inter',
              fontWeight: '900',
              textAlign: 'center',
              originX: 'center',
              visible: false,
              backgroundColor: 'rgba(0,0,0,0.6)',
              padding: 10,
              rx: 10, ry: 10,
              // Metadata for sync
              name: `sub_${idx}`,
              lockMovementX: true, lockMovementY: true
            })

              ; (text as any).isSubtitle = true
              ; (text as any).startTime = s.timestamp[0]
              ; (text as any).endTime = s.timestamp[1]

            canvas.add(text)
            return { text: s.text, start: s.timestamp[0], end: s.timestamp[1], id: text.name! }
          })

          setSubtitles(newSubs)
          setIsTranscribing(false)
          worker.terminate()
          alert("Sottotitoli generati con successo!")
        } else if (status === 'error') {
          console.error("[AI] Worker error:", error)
          alert("Errore durante la trascrizione: " + error)
          setIsTranscribing(false)
          worker.terminate()
        }
      }

      worker.postMessage({ audio: audioData, language: 'it' })

    } catch (err) {
      console.error("[AI] Failed to start transcription:", err)
      setIsTranscribing(false)
    }
  }

  // ── Video Loading ────────────────────────────────────────────────────────
  function addVideoToCanvas(source: string | File, name: string) {
    const canvas = fabricRef.current; if (!canvas) return

    const srcUrl = typeof source === 'string' ? source : URL.createObjectURL(source)
    const trackId = Math.random().toString(36).slice(2, 11)

    const video = document.createElement('video')
    // Do NOT set muted=true — audio is routed through AudioContext via MediaElementSource.
    // The browser may auto-mute until user interaction; we resume AudioContext on play.
    video.playsInline = true
    video.preload = 'auto'
    if (/^https?:\/\//.test(srcUrl)) video.crossOrigin = 'anonymous'

    // Chromium/Electron richiede che il <video> sia nel DOM per decodificare frame
    // da usare con ctx.drawImage(). Senza questo il video appare trasparente sul canvas.
    let videoPool = document.getElementById('_cos_video_pool')
    if (!videoPool) {
      videoPool = document.createElement('div')
      videoPool.id = '_cos_video_pool'
      videoPool.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:0;height:0;overflow:hidden;top:-1px;left:-1px'
      document.body.appendChild(videoPool)
    }
    videoPool.appendChild(video)

    video.onloadeddata = () => {
      if ((video as any)._initialized) return
        ; (video as any)._initialized = true

      const vw = video.videoWidth || 640
      const vh = video.videoHeight || 360

      // Fabric v7 usa element.width come fallback a naturalWidth (proprietà di HTMLImageElement).
      // Per <video> naturalWidth è undefined → Fabric chiama drawImage con sW=0 → frame invisibile.
      // Impostare width/height sull'elemento risolve il fallback correttamente.
      video.width = vw
      video.height = vh

      const vidObj = new fabric.Image(video, {
        left: 200, top: 200,
        width: vw,
        height: vh,
        objectCaching: false,   // MUST be false for live video frames
        name: `video_${name}`,
      })

      if (vw > canvas.width! * 0.6) vidObj.scaleToWidth(canvas.width! * 0.6)

        ; (vidObj as any).isVideo = true
        ; (vidObj as any).videoElement = video
        ; (vidObj as any)._trackId = trackId
        ; (vidObj as any)._blobUrl = srcUrl.startsWith('blob:') ? srcUrl : null

      // ── Prevent "Error loading blob:..." on undo/redo/project-load ─────────
      // Fabric's toObject() includes the video element's src (a blob: URL).
      // When canvas.loadFromJSON() is later called, Fabric tries to reload that
      // URL — which has expired.  Override toObject so it stores a blank
      // data URI instead; the object is treated as a non-reloadable placeholder
      // during JSON restore (and then purged — see use-canvas-history & use-project-sync).
      const _origToObject = (vidObj as any).toObject.bind(vidObj)
        ; (vidObj as any).toObject = function (props?: string[]) {
          const o = _origToObject(props)
          // 1×1 transparent GIF — valid image Fabric can decode without errors.
          // The purge step in use-canvas-history & use-project-sync removes this
          // placeholder after loadFromJSON completes.
          o.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
          return o
        }

      canvas.add(vidObj)
      canvas.setActiveObject(vidObj)

      // Show first frame immediately
      video.currentTime = 0.001
      video.onseeked = () => {
        vidObj.dirty = true          // forza Fabric a ri-campionare il frame decodificato
        canvas.requestRenderAll()
        video.onseeked = null
      }

      // Route audio through AudioContext — zero-latency sync with video.play()
      audioEngine.attachVideoElement(trackId, video)

      // Add a video track entry to the timeline (for display only — no buffer decode)
      const videoTrack: import('./audio-timeline').AudioTrack = {
        id: trackId,
        name,
        url: srcUrl,
        startTime: 0,
        duration: video.duration || 0,
        trimStart: 0,
        trimEnd: 0,
        volume: 100,
        isMuted: false,
        type: 'video',
      }
      setAudioTracks(prev => [...prev, videoTrack])

      // Update duration once metadata is fully available
      video.onloadedmetadata = () => {
        setAudioTracks(prev => prev.map(t =>
          t.id === trackId ? { ...t, duration: video.duration } : t
        ))
      }
    }

    video.onerror = () => {
      const err = (video as any).error
      console.error("[VideoLoad] Errore:", err?.code, err?.message)
      alert(`Errore caricamento video (code ${err?.code ?? '?'}): ${err?.message ?? 'formato non supportato o CSP block'}`)
    }

    video.src = srcUrl
    video.load()
  }

  // ── Launch logic ────────────────────────────────────────────────────────
  async function openLaunch() {
    const canvas = fabricRef.current; if (!canvas) return
    const all = canvas.getObjects()

    // 1. Identify ALL artboards on the canvas
    // Use both isArtboard flag AND name prefix as dual detection for robustness across undo/redo cycles
    const isArtboardObj = (o: fabric.FabricObject) =>
      !!(o as any).isArtboard || !!(o.name?.startsWith('artboard_')) || !!(o.get('name') as string | undefined)?.startsWith('artboard_')
    const artboards = all.filter(isArtboardObj)
    if (artboards.length === 0) {
      alert("Aggiungi una Tavola (Artboard) per lanciare il progetto.")
      return
    }

    // Sort artboards by priority: Active one first, then by Y position (top to bottom)
    const activeId = activeArtboardIdRef.current
    artboards.sort((a, b) => {
      const an = a.name || a.get('name') as string
      const bn = b.name || b.get('name') as string
      if (an === activeId) return -1
      if (bn === activeId) return 1
      return (a.top || 0) - (b.top || 0)
    })

    const originalVpt = canvas.viewportTransform;
    const labels = all.filter(o => (o.name || o.get('name') as string | undefined)?.startsWith('label_'))
    const artboardsData: any[] = []

    // 2. Process each artboard sequentially (due to viewport transform reset for high-res)
    for (const artboard of artboards) {
      const b = artboard.getBoundingRect(false)
      const bg = (artboard as any).fill || '#ffffff'

      // Reset viewport for clean screenshot capture
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      labels.forEach(l => l.set('visible', false))

      const screenshot = canvas.toDataURL({
        format: 'png',
        multiplier: 2,
        left: b.left,
        top: b.top,
        width: b.width,
        height: b.height,
        enableRetinaScaling: false
      })

      // Restore viewport temporarily to perform center-point check logic if needed 
      // (though bounding rect logic doesn't strictly need it if we use false param)

      // 3. Scrape ALL objects inside THIS specific artboard
      const inside = all.filter(o => {
        const oName = o.name || o.get('name') as string | undefined
        if (o === artboard || isArtboardObj(o) || oName?.startsWith('label_')) return false
        const ob = o.getBoundingRect(false)
        const cx = ob.left + ob.width / 2
        const cy = ob.top + ob.height / 2
        return (
          cx >= b.left && cx <= b.left + b.width &&
          cy >= b.top && cy <= b.top + b.height
        )
      })

      // Sort by reading order (Y then X)
      inside.sort((a, b) => {
        const ar = a.getBoundingRect(false), br = b.getBoundingRect(false)
        if (Math.abs(ar.top - br.top) > 15) return ar.top - br.top
        return ar.left - br.left
      })

      const rows = inside.map(o => {
        const ob = o.getBoundingRect(false)
        let fillColor = (o as any).fill
        if (fillColor && typeof fillColor === 'object') fillColor = '#888888'
        fillColor = fillColor || '#333333'
        return {
          type: o.type,
          text: (o as any).text || '',
          fontFamily: (o as any).fontFamily || 'Inter',
          fontSize: (o as any).fontSize || 14,
          fontWeight: (o as any).fontWeight || 'normal',
          fontStyle: (o as any).fontStyle || 'normal',
          underline: (o as any).underline || false,
          linethrough: (o as any).linethrough || false,
          letterSpacing: (o as any).charSpacing || 0,
          lineHeight: (o as any).lineHeight || 1.2,
          fill: fillColor,
          textAlign: (o as any).textAlign || 'left',
          src: o.type === 'image' ? (o as any).getSrc?.() || '' : null,
          angle: o.angle || 0,
          opacity: o.opacity || 1,
          top: ob.top - b.top,
          left: ob.left - b.left,
          width: ob.width,
          height: ob.height,
          id: (o as any).objId
        }
      })

      // 4. Semantic Analysis and Asset Classification for this artboard
      const textRows = rows.filter(r => r.type === 'textbox' || r.type === 'i-text' || r.type === 'text')
      const headRow = textRows.find(r => r.fontSize > 24) || textRows[0]
      const head = headRow?.text || ''
      const body = textRows.filter(r => r.id !== headRow?.id).map(r => r.text).join('\n\n')

      // Identify special "Symbols" (Bricolage items or specific paths)
      const symbols = rows.filter(r => {
        const obj = all.find(o => (o as any).objId === r.id)
        // Check if it's a Bricolage item (often has specific names or custom properties)
        return (obj as any)._isBricolage || (obj as any).name?.includes('Tape') || (obj as any).name?.includes('Pin')
      })

      const abName = artboard.name || artboard.get('name') as string | undefined || ''
      artboardsData.push({
        id: (artboard as any).objId || abName,
        name: (abName || 'Tavola').replace('artboard_', ''),
        screenshot,
        backgroundColor: bg,
        width: b.width,
        height: b.height,
        headline: head,
        content: body,
        rows: rows,
        symbols: symbols,
        palette: [...new Set(rows.map(r => r.fill).filter(f => typeof f === 'string'))]
      })
    }

    // Restore viewport and visibility
    canvas.setViewportTransform(originalVpt || [1, 0, 0, 1, 0, 0]);
    labels.forEach(l => l.set('visible', true))

    setUniversalLaunchData({
      projectTitle: currentProjectNameRef.current,
      artboards: artboardsData,
      globalPalette: [...new Set(artboardsData.flatMap(a => a.palette))],
      animationTracks: anim.tracks,
    })

    setShowLaunchHub(true)
  }

  // ── Elite Operations ──────────────────────────────────────────────────────

  // 1. Path Booleans (Union, Subtract, Intersect)
  // ── Boolean helpers ─────────────────────────────────────────────────────────

  /** Sample a Fabric object into a closed polygon ring in CANVAS space. */
  function flattenFabricObj(obj: fabric.FabricObject, steps = 48): polygonClipping.Pair[] {
    const mx = obj.calcTransformMatrix()
    const tp = (x: number, y: number): polygonClipping.Pair => {
      const pt = fabric.util.transformPoint(new fabric.Point(x, y), mx)
      return [pt.x, pt.y]
    }

    if (obj.type === 'rect') {
      const w = (obj.width || 0) / 2
      const h = (obj.height || 0) / 2
      const ring: polygonClipping.Pair[] = [tp(-w, -h), tp(w, -h), tp(w, h), tp(-w, h)]
      ring.push(ring[0])
      return ring
    }

    if (obj.type === 'circle') {
      const r = (obj as any).radius || 50
      const ring: polygonClipping.Pair[] = []
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2
        ring.push(tp(Math.cos(a) * r, Math.sin(a) * r))
      }
      return ring
    }

    if (obj.type === 'ellipse') {
      const rx = (obj as any).rx || 50, ry = (obj as any).ry || 30
      const ring: polygonClipping.Pair[] = []
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2
        ring.push(tp(Math.cos(a) * rx, Math.sin(a) * ry))
      }
      return ring
    }

    if (obj.type === 'path') {
      const cmds: any[][] = (obj as fabric.Path).path as any
      const pts: polygonClipping.Pair[] = []
      let cx = 0, cy = 0
      for (const cmd of cmds) {
        const t = cmd[0] as string
        if (t === 'M') { cx = cmd[1]; cy = cmd[2]; pts.push(tp(cx, cy)) }
        else if (t === 'm') { cx += cmd[1]; cy += cmd[2]; pts.push(tp(cx, cy)) }
        else if (t === 'L') { cx = cmd[1]; cy = cmd[2]; pts.push(tp(cx, cy)) }
        else if (t === 'l') { cx += cmd[1]; cy += cmd[2]; pts.push(tp(cx, cy)) }
        else if (t === 'H') { cx = cmd[1]; pts.push(tp(cx, cy)) }
        else if (t === 'h') { cx += cmd[1]; pts.push(tp(cx, cy)) }
        else if (t === 'V') { cy = cmd[1]; pts.push(tp(cx, cy)) }
        else if (t === 'v') { cy += cmd[1]; pts.push(tp(cx, cy)) }
        else if (t === 'C' || t === 'c') {
          const abs = t === 'C'
          const c1x = abs ? cmd[1] : cx + cmd[1], c1y = abs ? cmd[2] : cy + cmd[2]
          const c2x = abs ? cmd[3] : cx + cmd[3], c2y = abs ? cmd[4] : cy + cmd[4]
          const ex = abs ? cmd[5] : cx + cmd[5], ey = abs ? cmd[6] : cy + cmd[6]
          for (let i = 1; i <= steps; i++) {
            const s = i / steps, is = 1 - s
            pts.push(tp(
              is ** 3 * cx + 3 * is ** 2 * s * c1x + 3 * is * s ** 2 * c2x + s ** 3 * ex,
              is ** 3 * cy + 3 * is ** 2 * s * c1y + 3 * is * s ** 2 * c2y + s ** 3 * ey,
            ))
          }
          cx = ex; cy = ey
        }
        else if (t === 'Q' || t === 'q') {
          const abs = t === 'Q'
          const qx = abs ? cmd[1] : cx + cmd[1], qy = abs ? cmd[2] : cy + cmd[2]
          const ex = abs ? cmd[3] : cx + cmd[3], ey = abs ? cmd[4] : cy + cmd[4]
          for (let i = 1; i <= steps; i++) {
            const s = i / steps, is = 1 - s
            pts.push(tp(is ** 2 * cx + 2 * is * s * qx + s ** 2 * ex, is ** 2 * cy + 2 * is * s * qy + s ** 2 * ey))
          }
          cx = ex; cy = ey
        }
      }
      if (pts.length && (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1])) {
        pts.push(pts[0])
      }
      return pts
    }

    // Fallback: use bounding box corners
    const coords = (obj as any).getCoords(true, true) as { x: number; y: number }[]
    const ring = coords.map((p: { x: number; y: number }) => [p.x, p.y] as polygonClipping.Pair)
    ring.push(ring[0])
    return ring
  }

  /** Convert a polygon-clipping MultiPolygon back to an SVG path string. */
  function multiPolyToSVGPath(mp: polygonClipping.MultiPolygon): string {
    let d = ''
    mp.forEach(poly => {
      poly.forEach(ring => {
        ring.forEach((p, i) => { d += (i === 0 ? `M ${p[0]} ${p[1]}` : ` L ${p[0]} ${p[1]}`) })
        d += ' Z '
      })
    })
    return d.trim()
  }

  function doBoolean(op: 'union' | 'subtract' | 'intersect') {
    const canvas = fabricRef.current; if (!canvas) return
    const active = canvas.getActiveObject()
    if (!active || active.type !== 'activeSelection') {
      alert("Seleziona almeno 2 forme per le operazioni booleane.")
      return
    }
    const objs = (active as fabric.ActiveSelection).getObjects()
    if (objs.length < 2) return

    try {
      const polys = objs.map(o => flattenFabricObj(o))
      if (polys.some(p => p.length < 4)) {
        alert("Uno degli oggetti non è convertibile in poligono.")
        return
      }

      // polygon-clipping expects MultiPolygon = Polygon[][], Polygon = Ring[][], Ring = Pair[]
      const toMP = (ring: polygonClipping.Pair[]): polygonClipping.MultiPolygon => [[[...ring]]]
      let result: polygonClipping.MultiPolygon
      if (op === 'union') result = polygonClipping.union(toMP(polys[0])[0], ...polys.slice(1).map(p => toMP(p)[0]))
      else if (op === 'subtract') result = polygonClipping.difference(toMP(polys[0])[0], ...polys.slice(1).map(p => toMP(p)[0]))
      else result = polygonClipping.intersection(toMP(polys[0])[0], ...polys.slice(1).map(p => toMP(p)[0]))

      if (!result || result.length === 0) { alert('Nessuna intersezione trovata.'); return }

      const d = multiPolyToSVGPath(result)
      const src = objs[0]
      const newPath = new fabric.Path(d, {
        fill: (src as any).fill || '#ffffff',
        stroke: (src as any).stroke || '',
        strokeWidth: (src as any).strokeWidth || 0,
        objectCaching: false,
      })
      canvas.remove(...objs)
      canvas.discardActiveObject()
      canvas.add(newPath)
      canvas.setActiveObject(newPath)
      canvas.requestRenderAll()
      pushHistory()
    } catch (e) { console.error('[doBoolean]', e) }
  }

  // 2. Text on Path
  function bindTextToPath() {
    const canvas = fabricRef.current; if (!canvas) return
    const sel = canvas.getActiveObject()
    if (!sel || sel.type !== 'activeSelection') {
      alert("Seleziona un Testo e un Tracciato per binderli.")
      return
    }
    const objs = (sel as fabric.ActiveSelection).getObjects()
    const text = objs.find(o => o.type === 'textbox' || o.type === 'i-text')
    const path = objs.find(o => o.type === 'path')
    if (!text || !path) {
      alert("Seleziona esattamente 1 Testo e 1 Tracciato.")
      return
    }
    // Fabric.js 4+ supports path property on Text
    (text as any).set({ path: path, textAlign: 'center' })
    path.set({ visible: false }) // Hide path, text follows it
    canvas.discardActiveObject(); canvas.setActiveObject(text); canvas.requestRenderAll(); pushHistory()
  }

  // 3. AI Tracing (Bitmap to Vector)
  async function traceImage() {
    const canvas = fabricRef.current; if (!canvas) return
    const obj = canvas.getActiveObject()
    if (!obj || obj.type !== 'image') return
    const img = obj as fabric.Image

    // Use ImageTracer
    const src = (img as any).getElement().src
    ImageTracer.imageToSVG(src, (svgstr: string) => {
      fabric.loadSVGFromString(svgstr).then(({ objects }) => {
        const g = new fabric.Group(objects as fabric.FabricObject[], {
          left: img.left, top: img.top, scaleX: img.scaleX, scaleY: img.scaleY
        })
        canvas.remove(img); canvas.add(g); canvas.setActiveObject(g); canvas.requestRenderAll(); pushHistory()
      })
    }, { ltres: 1, qtres: 1, pathomit: 8, strokewidth: 1 })
  }

  // 4. Motion / Animation
  function applyAnimation(type: 'pulse' | 'float' | 'shake' | 'spin' | null) {
    const canvas = fabricRef.current; if (!canvas) return
    const obj = canvas.getActiveObject()
    if (!obj) return

    // Clear existing animation interval/state if any
    if ((obj as any)._animCleanup) { (obj as any)._animCleanup(); delete (obj as any)._animCleanup }

    if (!type) { setSel(p => ({ ...p, animation: null })); return }

    setSel(p => ({ ...p, animation: type }))

    const startScale = obj.scaleX || 1
    const startTop = obj.top || 0
    let stop = false

    const tick = () => {
      if (stop) return
      if (type === 'pulse') {
        fabric.util.animate({
          startValue: startScale, endValue: startScale * 1.1, duration: 1000,
          onChange: (v) => { obj.set({ scaleX: v, scaleY: v }); canvas.requestRenderAll() },
          onComplete: () => {
            fabric.util.animate({
              startValue: startScale * 1.1, endValue: startScale, duration: 1000,
              onChange: (v) => { obj.set({ scaleX: v, scaleY: v }); canvas.requestRenderAll() },
              onComplete: tick
            })
          }
        })
      } else if (type === 'float') {
        fabric.util.animate({
          startValue: startTop, endValue: startTop - 20, duration: 1500,
          onChange: (v) => { obj.set({ top: v }); canvas.requestRenderAll() },
          onComplete: () => {
            fabric.util.animate({
              startValue: startTop - 20, endValue: startTop, duration: 1500,
              onChange: (v) => { obj.set({ top: v }); canvas.requestRenderAll() },
              onComplete: tick
            })
          }
        })
      }
    }

    tick()
      ; (obj as any)._animCleanup = () => { stop = true }
  }

  // 5. Hand-Drawn Mode (Rough.js)
  function toggleHandDrawn() {
    const canvas = fabricRef.current; if (!canvas) return
    const obj = canvas.getActiveObject()
    if (!obj) return

    // Restore if already roughed
    if ((obj as any)._roughOriginalPath) {
      const origD = (obj as any)._roughOriginalPath as string
      const restored = new fabric.Path(origD, {
        left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY,
        angle: obj.angle, fill: (obj as any).fill,
        stroke: (obj as any).stroke, strokeWidth: (obj as any).strokeWidth,
      })
      canvas.remove(obj); canvas.add(restored); canvas.setActiveObject(restored)
      setSel(p => ({ ...p, isHandDrawn: false }))
      canvas.requestRenderAll(); pushHistory(); return
    }

    // Build SVG d string from the selected object
    let srcD = ''
    if (obj.type === 'path') {
      srcD = (obj as fabric.Path).path.map((step: any) => step.join(' ')).join(' ')
    } else if (obj.type === 'rect') {
      const w = (obj.width || 0), h = (obj.height || 0)
      srcD = `M ${-w / 2} ${-h / 2} L ${w / 2} ${-h / 2} L ${w / 2} ${h / 2} L ${-w / 2} ${h / 2} Z`
    } else if (obj.type === 'circle') {
      const r = (obj as any).radius || 50
      srcD = `M ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0`
    } else { return }

    try {
      const gen = rough.generator()
      const drawable = gen.path(srcD, {
        roughness: 1.8, bowing: 1.2,
        stroke: (obj as any).stroke || '#ffffff',
        strokeWidth: ((obj as any).strokeWidth || 1) * 1.2,
        fill: 'none', disableMultiStroke: false,
      })

      const opSetToD = (ops: { op: string; data: number[] }[]) => ops.map(o => {
        if (o.op === 'move') return `M ${o.data[0]} ${o.data[1]}`
        if (o.op === 'lineTo') return `L ${o.data[0]} ${o.data[1]}`
        if (o.op === 'bcurveTo') return `C ${o.data[0]} ${o.data[1]} ${o.data[2]} ${o.data[3]} ${o.data[4]} ${o.data[5]}`
        return ''
      }).join(' ')

      const combinedD = drawable.sets.map((s: any) => opSetToD(s.ops)).filter(Boolean).join(' ')
      if (!combinedD) return

      const roughPath = new fabric.Path(combinedD, {
        left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY, angle: obj.angle,
        fill: 'none', stroke: (obj as any).stroke || '#ffffff',
        strokeWidth: (obj as any).strokeWidth || 1.5, objectCaching: false,
      })
        ; (roughPath as any)._roughOriginalPath = srcD

      canvas.remove(obj); canvas.add(roughPath); canvas.setActiveObject(roughPath)
      setSel(p => ({ ...p, isHandDrawn: true }))
      canvas.requestRenderAll(); pushHistory()
    } catch (e) { console.error('[toggleHandDrawn]', e) }
  }

  // ── Asset Explorer Handlers ──────────────────────────────────────────────
  function applyTexture(tex: any) {
    const canvas = fabricRef.current; if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;

    const targets = (obj.type === 'activeSelection')
      ? (obj as fabric.ActiveSelection).getObjects()
      : [obj];

    // CASE 1: Materic textures apply via WebGL Filters (Non-destructive)
    if (tex.type === 'materic') {
      targets.forEach(t => {
        const filterType = tex.filterType || 'Grain';
        const intensity = 10; // Lower default intensity for a light editorial feel

        if (t.type === 'image') {
          applyImgFilter(filterType, intensity);
        } else {
          // For shapes, we force filter application via cache
          t.set('objectCaching', true);
          // @ts-ignore
          const F = fabric.filters;
          let filter = null;
          if (filterType === 'Grain') filter = new (GrainFilter as any)({ uIntensity: intensity / 100 });
          if (filterType === 'Fiber') filter = new (FiberFilter as any)({ uIntensity: intensity / 100 });

          if (filter) {
            // Ensure filters list exists
            t.filters = (t.filters || []).filter((f: any) => f.type !== filterType);
            t.filters.push(filter);
            if (t.applyFilters) (t as any).applyFilters()
            else (t as any).dirty = true;
          }
        }
      });
      canvas.requestRenderAll();
      return;
    }

    // CASE 2: Geometric & Overlays (Traditional Pattern but high-res)
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const pattern = new fabric.Pattern({ source: img, repeat: 'repeat' });
      targets.forEach(t => {
        t.set('fill', pattern);
        (t as any).dirty = true;
      });
      canvas.requestRenderAll();
    };
    img.src = tex.url;
  }

  function addBricolage(asset: any) {
    const canvas = fabricRef.current; if (!canvas) return;
    const p = new fabric.Path(asset.path, {
      left: 200, top: 200, fill: asset.color, stroke: asset.stroke, strokeWidth: 1,
      opacity: asset.opacity, scaleX: 2, scaleY: 2,
      name: asset.name
    });
    // Technical tag for semantic extraction in Launch Hub
    (p as any)._isBricolage = true;

    canvas.add(p); canvas.setActiveObject(p); canvas.requestRenderAll();
  }

  function applyFont(font: string) {
    const canvas = fabricRef.current; if (!canvas) return;
    injectGoogleFont(font);
    const obj = canvas.getActiveObject();
    if (obj && (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text')) {
      (obj as fabric.Textbox).set({ fontFamily: font });
      canvas.requestRenderAll();
    }
  }

  // ── Client canvas load ────────────────────────────────────────────────────
  // loadClient removed — replaced by loadProject/newProject

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#0d0d0d] overflow-hidden flex flex-col"
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
      onDrop={(e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (!file) return
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            fabric.Image.fromURL(ev.target?.result as string, { crossOrigin: 'anonymous' }).then(img => {
              img.scaleToWidth(200); fabricRef.current?.add(img); fabricRef.current?.setActiveObject(img)
            })
          }
          reader.readAsDataURL(file)
        } else if (file.type.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv|m4v|3gp|flv|wmv|mpeg|mpg)$/i.test(file.name)) {
          addVideoToCanvas(file, file.name)
        }
      }}
    >

      {/* Noise texture */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {/* ── APP BAR ────────────────────────────────────────────────────────────
          Categoria: Identità progetto + Azioni output
          Sempre visibile, non cambia mai con la selezione                      */}
      <div className="h-12 flex-shrink-0 flex items-center justify-between px-4 bg-[#080808]/80 backdrop-blur-3xl border-b border-white/[0.05] z-[100] relative">

        {/* ── Sinistra: identità progetto ── */}
        <div className="flex items-center gap-3">
          {/* App name */}
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 flex-shrink-0">◈</span>

          <div className="h-5 w-px bg-white/[0.06] flex-shrink-0" />

          {/* Project selector */}
          <div className="flex items-center gap-1">
            <button ref={projectBtnRef} onClick={() => setShowProjectList(p => !p)}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg hover:bg-white/[0.05] transition-colors">
              <span className="text-[10px] font-bold text-white/60 truncate max-w-[140px]">{currentProjectName}</span>
              {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Modifiche non salvate" />}
              <ChevronDown className="w-3 h-3 text-white/20 flex-shrink-0" />
            </button>
            <button onClick={newProject} title="Nuovo progetto [Ctrl+N]"
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/[0.05] text-white/25 hover:text-white/60 flex-shrink-0 transition-colors">
              <span className="text-base leading-none">+</span>
            </button>
          </div>

          {showProjectList && typeof document !== 'undefined' && <DropdownPortal triggerRef={projectBtnRef}>
            <div className="bg-[#141414] border border-white/10 rounded-xl shadow-2xl py-1 w-64 max-h-72 overflow-y-auto scrollbar-hide">
              <div className="px-3 py-2 flex items-center justify-between border-b border-white/[0.06]">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/25">Progetti</span>
                <button onClick={() => { newProject(); setShowProjectList(false) }}
                  className="text-[9px] font-black uppercase tracking-widest text-accent/80 hover:text-accent">+ Nuovo</button>
              </div>
              {designProjects.length === 0 && <p className="text-center text-[9px] text-white/20 py-4 uppercase tracking-widest">Nessun progetto</p>}
              {designProjects.map(p => (
                <div key={p.id} className={cn('group flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] cursor-pointer', p.id === currentProjectId && 'bg-white/[0.06]')}>
                  <button className="flex-1 text-left min-w-0" onClick={() => { loadProject(p); setShowProjectList(false) }}>
                    <p className="text-[10px] font-bold text-white/70 truncate">{p.name}</p>
                    <p className="text-[8px] text-white/30 truncate">{clients.find(c => c.id === p.client_id)?.name || '—'} · {new Date(p.updated_at).toLocaleDateString('it')}</p>
                  </button>
                  {onDeleteProject && <button onClick={() => onDeleteProject(p.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 flex-shrink-0 transition-opacity">
                    <Trash2 className="w-3 h-3" />
                  </button>}
                </div>
              ))}
            </div>
          </DropdownPortal>}
        </div>

        {/* ── Destra: azioni output ── */}
        <div className="flex items-center gap-2">
          {/* Artboard */}
          <button ref={artboardBtnRef} onClick={() => setShowAB(p => !p)}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest text-white/35 hover:text-white/60 hover:bg-white/[0.05] transition-colors">
            <Layers className="w-3 h-3" /> Tavola <ChevronDown className="w-3 h-3 opacity-50" />
          </button>
          {showAB && <DropdownPortal triggerRef={artboardBtnRef} alignRight>
            <div className="bg-[#141414] border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col gap-0.5 min-w-[180px]">
              <p className="text-[7px] font-black uppercase tracking-widest text-white/20 px-2 py-1">Nuova tavola</p>
              {ARTBOARDS.map(ab => (
                <button key={ab.label} onClick={() => { addArtboard(ab.w, ab.h, ab.label, ab.exportType); setShowAB(false) }}
                  className="px-2.5 py-1.5 text-left rounded-lg hover:bg-white/[0.06] flex items-center justify-between gap-3 transition-colors">
                  <span className="text-[9px] font-bold text-white/60">{ab.label}</span>
                  <span className="text-[8px] text-white/20">{ab.w}×{ab.h}</span>
                </button>
              ))}
              <div className="h-px bg-white/[0.06] my-1" />
              <p className="text-[7px] font-black uppercase tracking-widest text-white/20 px-2 py-1">Layout</p>
              <button onClick={() => { rearrangeArtboards('strip', 100, 1); setShowAB(false); }}
                className="px-2.5 py-1.5 text-left rounded-lg hover:bg-white/[0.06] flex items-center gap-3 transition-colors group">
                <LayoutList className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors" />
                <span className="text-[9px] font-bold text-white/60">Striscia Verticale</span>
              </button>
              <button onClick={() => { rearrangeArtboards('grid', 100, 4); setShowAB(false); }}
                className="px-2.5 py-1.5 text-left rounded-lg hover:bg-white/[0.06] flex items-center gap-3 transition-colors group">
                <LayoutGrid className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors" />
                <span className="text-[9px] font-bold text-white/60">Griglia (4 col)</span>
              </button>
            </div>
          </DropdownPortal>}

          <div className="h-5 w-px bg-white/[0.06]" />

          {/* Save */}
          <button onClick={triggerSave}
            className={cn('flex items-center gap-1.5 h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
              saving ? 'text-emerald-400 bg-emerald-400/10'
                : isDirty ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/15'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/[0.05]')}>
            <Save className="w-3 h-3" />
            {saving ? 'Salvato ✓' : isDirty ? 'Salva*' : 'Salva'}
          </button>

          {/* Export */}
          <button ref={exportBtnRef} onClick={() => setShowExport(p => !p)}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[9px] font-bold text-white/35 hover:text-white/60 hover:bg-white/[0.05] transition-colors">
            <Download className="w-3 h-3" /> Esporta
          </button>
          {showExport && typeof document !== 'undefined' && (
            <DropdownPortal triggerRef={exportBtnRef} alignRight>
              <div className="bg-[#141414] border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col gap-0.5 min-w-[130px]">
                <p className="text-[7px] text-white/25 uppercase tracking-widest px-2 py-1">Formato</p>
                {([['PNG 1x', 'png', 1], ['PNG 2x', 'png', 2], ['PNG 3x', 'png', 3], ['JPG 2x', 'jpg', 2], ['SVG', 'svg', 1]] as const).map(([label, fmt, mult]) => (
                  <button key={label} onClick={() => { exportCanvas(fmt, mult); setShowExport(false) }}
                    className="px-2.5 py-1.5 text-left text-[9px] font-bold text-white/60 hover:bg-white/[0.06] rounded-lg transition-colors">{label}</button>
                ))}
              </div>
            </DropdownPortal>
          )}

          <div className="h-5 w-px bg-white/[0.06]" />

          {/* Launch */}
          <button onClick={openLaunch}
            className="flex items-center gap-1.5 h-7 px-3 bg-accent/90 text-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-accent hover:scale-[1.03] active:scale-95 transition-all shadow-lg shadow-accent/20">
            <Zap className="w-3 h-3 fill-black" /> Lancia
          </button>
        </div>

        {/* AI Control Center Floating Bar */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 p-1.5 bg-[#0d0d0d]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <button
            onClick={() => setShowAB(!showAB)}
            className={cn(
              "p-2 rounded-xl transition-all group flex items-center gap-2",
              showAB ? "bg-accent/20 text-accent border border-accent/20" : "bg-white/5 text-white/40 hover:bg-white/10 border border-transparent"
            )}
          >
            <Sparkles className={cn("w-4 h-4 transition-transform duration-500", showAB ? "scale-110" : "group-hover:scale-110")} />
            <span className="text-[10px] font-black uppercase tracking-widest pr-1">Art Director</span>
          </button>
          
          <div className="w-px h-4 bg-white/10 mx-1" />
          
          <button
            onClick={() => setShowLaunchHub(!showLaunchHub)}
            className={cn(
              "p-2 rounded-xl transition-all group flex items-center gap-2",
              showLaunchHub ? "bg-blue-500/20 text-blue-400 border border-blue-500/20" : "bg-white/5 text-white/40 hover:bg-white/10 border border-transparent"
            )}
          >
            <Zap className={cn("w-4 h-4 transition-transform duration-500", showLaunchHub ? "scale-110" : "group-hover:scale-110")} />
            <span className="text-[10px] font-black uppercase tracking-widest pr-1">Launch Hub</span>
          </button>
        </div>
      </div>

      {/* ── WORKSPACE ROW — occupa tutto lo spazio residuo ─────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── TOOL BAR ─────────────────────────────────────────────────────────
            Categoria: Selezione strumento
            Lista piatta con label sezione. Tutto visibile, niente hover-expand. */}
        <div className="w-[52px] flex-shrink-0 flex flex-col items-center py-3 gap-0 bg-[#080808]/60 border-r border-white/[0.05] z-[20] overflow-y-auto scrollbar-hide">

          {/* SELEZIONA */}
          <p className="text-[6px] font-black uppercase tracking-widest text-white/15 mb-1.5 px-1 text-center leading-tight">Sel.</p>
          <button onClick={() => changeTool('select')} title="Selezione [V]"
            className={cn('w-9 h-9 flex items-center justify-center rounded-xl transition-all mb-0.5',
              tool === 'select' ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]')}>
            <MousePointer2 className="w-4 h-4" />
          </button>
          <button onClick={() => changeTool('lasso')} title="Lasso [A]"
            className={cn('w-9 h-9 flex items-center justify-center rounded-xl transition-all',
              tool === 'lasso' ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]')}>
            <LassoSelect className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-white/[0.06] my-2.5" />

          {/* FORMA */}
          <p className="text-[6px] font-black uppercase tracking-widest text-white/15 mb-1.5 px-1 text-center leading-tight">Forma</p>
          <button onClick={() => changeTool('rect')} title="Rettangolo [R]"
            className={cn('w-9 h-9 flex items-center justify-center rounded-xl transition-all mb-0.5',
              tool === 'rect' ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]')}>
            <Square className="w-4 h-4" />
          </button>
          <button onClick={() => changeTool('circle')} title="Cerchio [C]"
            className={cn('w-9 h-9 flex items-center justify-center rounded-xl transition-all mb-0.5',
              tool === 'circle' ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]')}>
            <Circle className="w-4 h-4" />
          </button>
          <button onClick={() => changeTool('line')} title="Linea [L]"
            className={cn('w-9 h-9 flex items-center justify-center rounded-xl transition-all',
              tool === 'line' ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]')}>
            <Minus className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-white/[0.06] my-2.5" />

          {/* DISEGNO */}
          <p className="text-[6px] font-black uppercase tracking-widest text-white/15 mb-1.5 px-1 text-center leading-tight">Dis.</p>
          <button onClick={() => changeTool('pen')} title="Penna Bezier [F]"
            className={cn('w-9 h-9 flex items-center justify-center rounded-xl transition-all mb-0.5',
              tool === 'pen' ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]')}>
            <PenTool className="w-4 h-4" />
          </button>
          <button onClick={() => changeTool('pencil')} title="Matita [P]"
            className={cn('w-9 h-9 flex items-center justify-center rounded-xl transition-all mb-0.5',
              tool === 'pencil' ? 'bg-accent/20 text-accent shadow-inner' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]')}>
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => changeTool('eraser')} title="Gomma [E]"
            className={cn('w-9 h-9 flex items-center justify-center rounded-xl transition-all mb-0.5',
              tool === 'eraser' ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]')}>
            <Eraser className="w-4 h-4" />
          </button>
          <button onClick={() => changeTool('scissors')} title="Forbici [X]"
            className={cn('w-9 h-9 flex items-center justify-center rounded-xl transition-all',
              tool === 'scissors' ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]')}>
            <Scissors className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-white/[0.06] my-2.5" />

          {/* CONTENUTO */}
          <p className="text-[6px] font-black uppercase tracking-widest text-white/15 mb-1.5 px-1 text-center leading-tight">Cont.</p>
          <button onClick={() => changeTool('text')} title="Testo [T]"
            className={cn('w-9 h-9 flex items-center justify-center rounded-xl transition-all mb-0.5',
              tool === 'text' ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]')}>
            <Type className="w-4 h-4" />
          </button>
          <button onClick={() => changeTool('image')} title="Immagine [I]"
            className={cn('w-9 h-9 flex items-center justify-center rounded-xl transition-all',
              tool === 'image' ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]')}>
            <ImageIcon className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-white/[0.06] my-2.5" />

          {/* INQUADRATURE */}
          <p className="text-[6px] font-black uppercase tracking-widest text-white/15 mb-1.5 px-1 text-center leading-tight">Cornice</p>
          <ArtboardBtn onAdd={addArtboard} />
        </div>

        {/* ── CANVAS AREA ──────────────────────────────────────────────────────── */}
        <div ref={canvasContainerRef} className="flex-1 relative overflow-hidden"
          onContextMenu={e => e.preventDefault()}>
          <canvas ref={canvasRef} className="w-full h-full" />

          {/* Grid overlay */}
          {showGrid && (
            <div className="absolute inset-0 z-[5] pointer-events-none" style={{
              backgroundImage: `radial-gradient(circle,rgba(255,255,255,0.12) 1px,transparent 1px)`,
              backgroundSize: `${gridSize}px ${gridSize}px`
            }} />
          )}

          {/* Editorial Grid */}
          {showEditorialGrid && (
            <div className="absolute inset-0 z-[6] pointer-events-none overflow-hidden"
              style={{ opacity: gridConfig.opacity }}>
              {/* Baseline Grid */}
              <div className="absolute inset-0" style={{
                backgroundImage: `linear-gradient(to bottom, rgba(76, 201, 240, 0.5) 1px, transparent 1px)`,
                backgroundSize: `100% ${gridConfig.baseline}px`
              }} />
              {/* Modular Grid */}
              <div className="absolute inset-0" style={{
                backgroundImage: `
              linear-gradient(to right, rgba(247, 37, 133, 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(247, 37, 133, 0.3) 1px, transparent 1px)
            `,
                backgroundSize: `${gridConfig.modular}px ${gridConfig.modular}px`
              }} />
            </div>
          )}

          {/* Bezier Editor */}
          {bzEdit && (
            <BzEditorOverlay
              anchors={bzEdit.anchors}
              zoom={zoom}
              canvas={fabricRef.current}
              onAnchorMove={(idx, x, y) => {
                setBzEdit(prev => {
                  if (!prev) return prev
                  const anchors = [...prev.anchors]
                  const a = anchors[idx]
                  const dx = x - a.x, dy = y - a.y
                  anchors[idx] = { ...a, x, y, cp1x: a.cp1x + dx, cp1y: a.cp1y + dy, cp2x: a.cp2x + dx, cp2y: a.cp2y + dy }
                  const canvas = fabricRef.current
                  const fp = canvas?.getObjects().find(o => (o as any).objId === prev.pathId) as fabric.Path | undefined
                  if (fp && canvas) { const d = anchorsToBzPath(anchors); fp.set({ path: (fabric.util as any).parsePath(d) }); (fp as any)._setPositionDimensions?.({}); fp.setCoords(); canvas.requestRenderAll() }
                  return { ...prev, anchors }
                })
              }}
              onHandleMove={(idx, role, x, y) => {
                setBzEdit(prev => {
                  if (!prev) return prev
                  const anchors = [...prev.anchors]
                  anchors[idx] = mirrorHandle(anchors[idx], role, x, y)
                  const canvas = fabricRef.current
                  const fp = canvas?.getObjects().find(o => (o as any).objId === prev.pathId) as fabric.Path | undefined
                  if (fp && canvas) { const d = anchorsToBzPath(anchors); fp.set({ path: (fabric.util as any).parsePath(d) }); (fp as any)._setPositionDimensions?.({}); fp.setCoords(); canvas.requestRenderAll() }
                  return { ...prev, anchors }
                })
              }}
              onToggleCorner={(idx) => {
                setBzEdit(prev => {
                  if (!prev) return prev
                  const anchors = [...prev.anchors]
                  anchors[idx] = { ...anchors[idx], corner: !anchors[idx].corner }
                  return { ...prev, anchors }
                })
              }}
              onDone={exitBzEdit}
            />
          )}

          {/* Alignment guides */}
          {guides.length > 0 && (
            <svg className="absolute inset-0 z-[15] pointer-events-none w-full h-full">
              {guides.map((g, i) => (
                g.x != null
                  ? <line key={i} x1={g.x} y1={0} x2={g.x} y2="100%" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" opacity={0.7} />
                  : <line key={i} x1={0} y1={g.y} x2="100%" y2={g.y} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" opacity={0.7} />
              ))}
            </svg>
          )}

          {/* Rulers */}
          {showRulers && <Rulers zoom={zoom} canvas={fabricRef.current} />}

          {/* Artboard badges */}
          {!showLaunchHub && artboardBadges.map(badge => (
            <div key={badge.id} className="absolute z-[23] pointer-events-auto transition-all duration-75"
              style={{ left: badge.left, top: badge.top }}>
              <div className="flex items-center gap-1.5 px-2 h-7 bg-[#141414]/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl group hover:bg-[#1a1a1a]/80 transition-all">
                {/* Artboard Icon & ID */}
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <Layers className="w-2.5 h-2.5 text-white/40 group-hover:text-accent transition-colors" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tighter text-white/60 cursor-default select-none group-hover:text-white transition-colors">
                    {badge.id.replace('artboard_', '')}
                  </span>
                </div>

                {/* Vertical Separator (Subtle) */}
                <div className="w-px h-3 bg-white/5" />

                {/* Launch Button (Icon Only) */}
                <button 
                  onClick={() => { setActiveArtboardId(badge.id); openLaunch(); }}
                  title="Lancia Artboard"
                  className={cn(
                    "flex items-center justify-center w-5 h-5 rounded-full transition-all",
                    activeArtboardId === badge.id
                      ? "bg-accent/20 text-accent border border-accent/20"
                      : "text-white/20 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Zap className={cn("w-2.5 h-2.5", activeArtboardId === badge.id && "fill-accent")} />
                </button>
              </div>
            </div>
          ))}


        </div>{/* end CANVAS AREA */}

        {/* ── PROPERTIES PANEL ───────────────────────────────────────────────────
            Categoria: Proprietà oggetto + Trasformazione + Layer + Libreria
            Sempre visibile come colonna destra. Sezioni con label + valore compresso.
            Click sulla sezione → espande in-place → click fuori → richiude.        */}
        <PropertiesPanel
          sel={sel}
          insp={insp}
          tool={tool}
          layers={layers}
          fabricRef={fabricRef}
          setInsp={setInsp}
          onApplyText={applyText}
          onApplyShape={applyShape}
          onApplyShadow={applyShadow}
          onApplyGradient={applyGradient}
          onApplyAnimation={applyAnimation}
          onRemoveBg={removeBg}
          onTraceImage={traceImage}
          onToggleArrowStart={() => toggleArrow('start')}
          onToggleArrowEnd={() => toggleArrow('end')}
          onToggleConnector={toggleConnector}
          onDoBoolean={doBoolean}
          onApplyPreset={applyPreset}
          onUpdateFx={updateEffectProp}
          onApplyLink={addLink}
          onApplyImgFilter={applyImgFilter}
          onApplyPresetFilter={applyPresetFilter}
          onResetImgFilters={resetImgFilters}
          onApplyFont={applyFont}
          onApplyTexture={applyTexture}
          onAddShape={addLibShape}
          onAddIcon={addLibIcon}
          onAddBricolage={addBricolage}
          onLayerSelect={layerSelect}
          onLayerToggleVisible={layerToggleVisible}
          onLayerToggleLock={layerToggleLock}
          onLayerMoveUp={layerMoveUp}
          onLayerMoveDown={layerMoveDown}
          onLayerDelete={layerDelete}
          onRefreshLayers={refreshLayers}
          onApplyPencil={(p) => setSel(prev => ({ ...prev, ...p }))}
          bgRemoving={bgRemoving}
          showFX={showFX}
          setShowFX={setShowFX}
          showImgFx={showImgFx}
          setShowImgFx={setShowImgFx}
          showFP={showFP}
          setShowFP={setShowFP}
        />

        {showImgFx && sel.type === 'image' && (
          <ImgFxPanel
            onFilter={applyImgFilter}
            onPreset={applyPresetFilter}
            onReset={resetImgFilters}
            onClose={() => setShowImgFx(false)}
            activeFX={sel.appliedFX}
            fxProps={sel.fxProps}
          />
        )}

      </div>{/* end WORKSPACE ROW */}

      {showSaveDialog && (
        <SaveDialog
          initialName={currentProjectName}
          initialClientId={currentClientId}
          initialDescription={currentUserDescription}
          clients={clients}
          onClose={() => setShowSaveDialog(false)}
          onSave={saveProject}
        />
      )}

      {/* ── BOTTOM BAR ─────────────────────────────────────────────────────────
          Due categorie separate, due pillole.
          Sinistra: Ausili visivi (toggles)
          Centro: Navigazione canvas (zoom + history)                            */}
      <div className="h-9 flex-shrink-0 flex items-center justify-between px-4 bg-[#080808]/60 border-t border-white/[0.05] z-[20]">

        {/* ── Sinistra: View toggles ── */}
        <div className="flex items-center gap-1">
          {([
            ['Grid', showGrid, () => setShowGrid(p => !p), 'G'],
            ['Snap', snapGrid, () => setSnapGrid(p => !p), 'S'],
            ['Ruler', showRulers, () => setShowRulers(p => !p), 'R'],
            ['Editorial', showEditorialGrid, () => setShowEditorialGrid(p => !p), 'E'],
            ['Organic', sel.isHandDrawn, () => setSel(p => ({ ...p, isHandDrawn: !p.isHandDrawn })), 'O'],
            ['Gravity', gravityEnabled, () => setGravityEnabled(p => !p), ''],
          ] as [string, boolean, () => void, string][]).map(([label, active, toggle, key]) => (
            <button key={label} onClick={toggle} title={key ? `${label} [${key}]` : label}
              className={cn('h-6 px-2 rounded-md text-[8px] font-black uppercase tracking-widest transition-all',
                active
                  ? 'bg-white/[0.08] text-white/80'
                  : 'text-white/20 hover:text-white/50 hover:bg-white/[0.04]')}>
              {label}
              <span className={cn('ml-1 inline-block w-1.5 h-1.5 rounded-full align-middle',
                active ? 'bg-accent' : 'bg-white/10')} />
            </button>
          ))}

          {/* Animation mode toggle */}
          <div className="w-px h-4 bg-white/[0.06] mx-1" />
          <button
            onClick={() => setShowAnimMode(p => !p)}
            className={cn(
              'h-6 px-2 rounded-md text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1',
              showAnimMode
                ? 'bg-violet-500/20 text-violet-300'
                : 'text-white/20 hover:text-white/50 hover:bg-white/[0.04]',
            )}
          >
            <Play className="w-2.5 h-2.5" />
            Animazione
            <span className={cn('ml-0.5 inline-block w-1.5 h-1.5 rounded-full align-middle',
              showAnimMode ? 'bg-violet-400' : 'bg-white/10')} />
          </button>
        </div>

        {/* ── Centro: Navigator (history + zoom) ── */}
        <div className="flex items-center gap-2">
          <button onClick={undo} title="Annulla [Ctrl+Z]"
            className="h-6 w-6 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors">
            <Undo2 className="w-3 h-3" />
          </button>
          <button onClick={redo} title="Ripristina [Ctrl+Y]"
            className="h-6 w-6 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors">
            <Redo2 className="w-3 h-3" />
          </button>

          <div className="w-px h-4 bg-white/[0.06]" />

          <button onClick={() => { const c = fabricRef.current; if (!c) return; const z = Math.max(0.05, c.getZoom() * 0.8); c.setZoom(z); setZoom(z) }}
            className="h-6 w-6 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors">
            <ZoomOut className="w-3 h-3" />
          </button>
          <button onClick={() => { const c = fabricRef.current; if (!c) return; c.setViewportTransform([1, 0, 0, 1, 0, 0]); c.setZoom(1); setZoom(1) }}
            className="h-6 px-2 rounded-md text-[9px] font-black text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors w-14 text-center"
            title="Fit [Ctrl+0]">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => { const c = fabricRef.current; if (!c) return; const z = Math.min(20, c.getZoom() * 1.2); c.setZoom(z); setZoom(z) }}
            className="h-6 w-6 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors">
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        {/* ── Destra: spazio vuoto per bilanciamento ── */}
        <div className="w-[160px]" />
      </div>

      {/* ── ANIMATION TIMELINE (collapsible, below bottom bar) ──────────────── */}
      {showAnimMode && (
        <div className="h-52 flex-shrink-0 border-t border-white/[0.05]">
          <AnimationTimeline
            tracks={anim.tracks}
            currentTime={anim.currentTime}
            duration={anim.duration}
            isPlaying={anim.isPlaying}
            isRecording={anim.isRecording}
            onSeek={anim.seek}
            onPlay={() => anim.startPlayback()}
            onStop={anim.stopPlayback}
            onRecord={anim.setIsRecording}
            onPreset={anim.applyPreset}
            onDeleteKf={anim.deleteKeyframe}
            onDeleteTrack={anim.deleteTrack}
            onSetDuration={anim.setDuration}
            onClear={anim.clearAll}
          />
        </div>
      )}

      {/* Art Director Dashboard Overlay */}
      {showAB && (
        <div className="fixed inset-0 z-[500] pointer-events-none p-4">
          <div className="h-full flex flex-col pointer-events-auto">
            <CervelloDashboard onClose={() => setShowAB(false)} />
          </div>
        </div>
      )}

      {/* Universal Launch Hub Overlay */}
      {showLaunchHub && (
        <UniversalLaunchHub 
          onClose={() => setShowLaunchHub(false)} 
          data={universalLaunchData}
        />
      )}

      {/* ── PORTALS (fuori dal layout, sempre su document.body) ─────────────── */}
      {showSaveDialog && typeof document !== 'undefined' && createPortal(
        <SaveDialog
          initialName={currentProjectName}
          initialClientId={currentClientId}
          initialDescription={currentUserDescription}
          clients={clients}
          onSave={saveProject}
          onClose={() => setShowSaveDialog(false)}
        />,
        document.body
      )}
      {ctxMenu && typeof document !== 'undefined' && createPortal(
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y}
          onDuplicate={() => {
            const canvas = fabricRef.current, obj = canvas?.getActiveObject(); if (!obj) return
            obj.clone().then((cl: fabric.FabricObject) => { cl.set({ left: (cl.left || 0) + 20, top: (cl.top || 0) + 20 }); canvas!.add(cl); canvas!.setActiveObject(cl) })
            setCtxMenu(null)
          }}
          onDelete={() => { const canvas = fabricRef.current, obj = canvas?.getActiveObject(); if (!obj) return; canvas!.remove(obj); setCtxMenu(null) }}
          onBringForward={() => { const canvas = fabricRef.current, obj = canvas?.getActiveObject(); if (!obj) return; canvas!.bringObjectForward(obj); canvas!.requestRenderAll(); setCtxMenu(null) }}
          onSendBackward={() => { const canvas = fabricRef.current, obj = canvas?.getActiveObject(); if (!obj) return; canvas!.sendObjectBackwards(obj); canvas!.requestRenderAll(); setCtxMenu(null) }}
          onGroup={() => {
            const canvas = fabricRef.current, objs = canvas?.getActiveObjects(); if (!objs?.length) return
            const a = canvas!.getActiveObject() as any
            const g = a.toGroup?.() ?? a.group?.()
            if (g) { canvas!.setActiveObject(g); canvas!.requestRenderAll() }
            setCtxMenu(null)
          }}
          onClose={() => setCtxMenu(null)}
        />,
        document.body
      )}
      {showLaunchHub && universalLaunchData && (
        <UniversalLaunchHub data={universalLaunchData} animationTracks={anim.tracks} onClose={() => setShowLaunchHub(false)} />
      )}

      {videoMode && (
        <VideoModeModal
          videoObj={editingVideoObj}
          audioTracks={audioTracks}
          currentTime={currentTime}
          isPlaying={isPlaying}
          isTranscribing={isTranscribing}
          transcriptionProgress={transcriptionProgress}
          onClose={() => {
            // Pause all videos on close
            const c = fabricRef.current
            if (c) {
              c.getObjects().forEach(obj => {
                const vid = (obj as any).videoElement as HTMLVideoElement | undefined
                if (vid) vid.pause()
              })
            }
            audioEngine.stopPlayback()
            setIsPlaying(false)
            setVideoMode(false)
            setEditingVideoObj(null)
          }}
          onTogglePlay={() => {
            const c = fabricRef.current; if (!c) return
            const next = !isPlaying
            const videos = c.getObjects()
              .filter((o: any) => o.isVideo && o.videoElement)
              .map((o: any) => o.videoElement as HTMLVideoElement)

            if (next) {
              // Resume AudioContext (browser autoplay policy)
              audioEngine.resume().then(() => {
                const t = currentTimeRef.current
                videos.forEach(vid => { vid.currentTime = t; vid.play().catch(() => { }) })
                // Start buffer-based audio tracks (pure audio, not video)
                audioEngine.startPlayback(audioTracks, t)
              })
            } else {
              videos.forEach(vid => vid.pause())
              audioEngine.stopPlayback()
            }
            setIsPlaying(next)
          }}
          onSeek={(time) => {
            const c = fabricRef.current; if (!c) return
            currentTimeRef.current = time
            setCurrentTime(time)
            // Seek all video elements
            c.getObjects().forEach(obj => {
              const vid = (obj as any).videoElement as HTMLVideoElement | undefined
              if (vid) vid.currentTime = time
            })
            // Restart pure-audio tracks at new position
            if (isPlaying) audioEngine.startPlayback(audioTracks, time)
            // Repaint frame at seek position
            c.requestRenderAll()
          }}
          onUpdateTrack={(id, ups) => {
            setAudioTracks(prev => prev.map(t => t.id === id ? { ...t, ...ups } : t))
            // Sync volume to video element if it's a video track
            if (ups.volume !== undefined || ups.isMuted !== undefined) {
              const track = audioTracks.find(t => t.id === id)
              if (track?.type === 'video') {
                if (ups.isMuted !== undefined) audioEngine.muteVideo(id, ups.isMuted ?? track.isMuted)
                if (ups.volume !== undefined) audioEngine.setVideoVolume(id, ups.volume)
              }
            }
          }}
          onDeleteTrack={(id) => {
            audioEngine.detachVideoElement(id)
            setAudioTracks(prev => prev.filter(t => t.id !== id))
          }}
          onCutTrack={(id, atTime) => {
            setAudioTracks(prev => {
              const track = prev.find(t => t.id === id); if (!track) return prev
              const trimStart = track.trimStart ?? 0
              const trimEnd = track.trimEnd ?? 0
              const clipStart = track.startTime + trimStart
              const clipEnd = track.startTime + track.duration - trimEnd
              if (atTime <= clipStart || atTime >= clipEnd) return prev

              const newId = Math.random().toString(36).slice(2, 11)
              const left: typeof track = {
                ...track,
                trimEnd: track.duration - (atTime - track.startTime),
              }
              const right: typeof track = {
                ...track,
                id: newId,
                startTime: atTime,
                trimStart: atTime - track.startTime,
              }
              return prev.map(t => t.id === id ? left : t).concat(right)
            })
          }}
          onAddTrack={() => {
            const inp = document.createElement('input')
            inp.type = 'file'
            inp.accept = 'audio/*'
            inp.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (!file) return
              audioEngine.createTrack(file.name, file).then(track => {
                setAudioTracks(prev => [...prev, track])
              })
            }
            inp.click()
          }}
          onGenerateSubtitles={generateSubtitles}
          renderControls={() => (
            <div className="space-y-3">
              <p className="text-[9px] text-white/30 italic leading-relaxed">
                Seleziona il video sul canvas e usa il pannello laterale destro per applicare filtri, opacità e trasformazioni.
              </p>
            </div>
          )}
        />
      )}
    </div>
  )
}

// ─── PROPERTIES PANEL ────────────────────────────────────────────────────────

// Sezione collassabile: label sempre visibile + summary + contenuto in-place
function PropSection({ label, summary, children, defaultOpen = false }: {
  label: string; summary?: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="border-b border-white/[0.04]">
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.02] transition-colors group">
        <span className="text-[7px] font-black uppercase tracking-widest text-white/25 group-hover:text-white/40 transition-colors">{label}</span>
        <div className="flex items-center gap-2 min-w-0">
          {summary && <span className="text-[9px] font-bold text-white/40 truncate max-w-[110px]">{summary}</span>}
          <ChevronDown className={cn('w-3 h-3 text-white/15 flex-shrink-0 transition-transform duration-200', open && 'rotate-180')} />
        </div>
      </button>
      {open && <div className="px-3 pb-3 pt-0.5">{children}</div>}
    </div>
  )
}

// Input compatto per il panel
function PI({ label, value, onChange, min, max, className }:
  { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[7px] font-black uppercase tracking-widest text-white/20">{label}</span>
      <input type="number" value={value} min={min} max={max}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        className={cn('h-7 px-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-[11px] font-bold text-white/70 text-center focus:outline-none focus:border-accent/40 transition-colors', className)}
      />
    </div>
  )
}



// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface PanelProps {
  sel: SelState
  insp: { x: number; y: number; w: number; h: number; r: number } | null
  tool: Tool
  layers: { id: string; label: string; type: string; visible: boolean; locked: boolean }[]
  fabricRef: React.RefObject<fabric.Canvas | null>
  setInsp: React.Dispatch<React.SetStateAction<{ x: number; y: number; w: number; h: number; r: number } | null>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApplyText: (p: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApplyShape: (p: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApplyShadow: (...args: any[]) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApplyGradient: (...args: any[]) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApplyAnimation: (a: any) => void
  onRemoveBg: () => void
  onTraceImage: () => void
  onToggleArrowStart: () => void
  onToggleArrowEnd: () => void
  onToggleConnector: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDoBoolean: (op: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApplyPreset: (p: any) => void
  onUpdateFx: (k: string, p: string, v: number) => void
  onApplyLink: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApplyImgFilter: (f: string, v: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApplyPresetFilter: (f: any) => void
  onResetImgFilters: () => void
  onApplyFont: (f: string) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApplyTexture: (t: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAddShape: (s: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAddIcon: (s: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAddBricolage: (s: any) => void
  onLayerSelect: (id: string) => void
  onLayerToggleVisible: (id: string) => void
  onLayerToggleLock: (id: string) => void
  onLayerMoveUp: (id: string) => void
  onLayerMoveDown: (id: string) => void
  onLayerDelete: (id: string) => void
  onRefreshLayers: () => void
  onApplyPencil: (p: Partial<SelState>) => void
  bgRemoving: boolean
  showFX: boolean
  setShowFX: React.Dispatch<React.SetStateAction<boolean>>
  showImgFx: boolean
  setShowImgFx: React.Dispatch<React.SetStateAction<boolean>>
  showFP: boolean
  setShowFP: React.Dispatch<React.SetStateAction<boolean>>
}

type PanelTab = 'prop' | 'layers' | 'lib'
type PropSubTab = 'fill' | 'text' | 'shape' | 'fx' | 'img' | 'line' | 'pencil' | 'group'

function PropertiesPanel(props: PanelProps) {
  const { sel, insp, tool, layers, fabricRef, setInsp } = props
  const [tab, setTab] = React.useState<PanelTab>('prop')
  const [propTab, setPropTab] = React.useState<PropSubTab>('fill')
  const hasSelection = sel.type !== 'none'
  const isPencil = tool === 'pencil'

  // Auto-switch to prop tab when something is selected
  React.useEffect(() => {
    if (hasSelection || isPencil) setTab('prop')
  }, [hasSelection, isPencil])

  // Build available sub-tabs based on selection type
  const availSubTabs = React.useMemo<{ id: PropSubTab; icon: React.ReactNode; label: string }[]>(() => {
    const tabs: { id: PropSubTab; icon: React.ReactNode; label: string }[] = []
    if (isPencil) tabs.push({ id: 'pencil', icon: <Pencil className="w-3.5 h-3.5" />, label: 'Pennello' })
    if (sel.type === 'shape' || sel.type === 'text' || sel.type === 'line') tabs.push({ id: 'fill', icon: <Palette className="w-3.5 h-3.5" />, label: 'Colore' })
    if (sel.type === 'text') tabs.push({ id: 'text', icon: <Type className="w-3.5 h-3.5" />, label: 'Testo' })
    if (sel.type === 'shape') tabs.push({ id: 'shape', icon: <Square className="w-3.5 h-3.5" />, label: 'Forma' })
    if (sel.type === 'line') tabs.push({ id: 'line', icon: <Minus className="w-3.5 h-3.5" />, label: 'Linea' })
    if (sel.type === 'image') tabs.push({ id: 'img', icon: <ImageIcon className="w-3.5 h-3.5" />, label: 'Immagine' })
    if (sel.type === 'group') tabs.push({ id: 'group', icon: <Layers className="w-3.5 h-3.5" />, label: 'Gruppo' })
    if (hasSelection) tabs.push({ id: 'fx', icon: <Sparkles className="w-3.5 h-3.5" />, label: 'Effetti' })
    return tabs
  }, [sel.type, isPencil, hasSelection])

  // Auto-switch propTab when available tabs change
  React.useEffect(() => {
    if (availSubTabs.length > 0 && !availSubTabs.find(t => t.id === propTab)) {
      setPropTab(availSubTabs[0].id)
    }
  }, [availSubTabs, propTab])

  const inspUpdate = (prop: string, val: number) => {
    const canvas = fabricRef.current; const obj = canvas?.getActiveObject(); if (!obj) return
    if (prop === 'width') { obj.scaleX = (val || 1) / obj.width!; obj.setCoords() }
    else if (prop === 'height') { obj.scaleY = (val || 1) / obj.height!; obj.setCoords() }
    else if (prop === 'angle') { obj.set({ angle: val }); obj.setCoords() }
    else obj.set({ [prop]: val })
    canvas!.requestRenderAll()
    setInsp(p => p ? { ...p, [prop === 'left' ? 'x' : prop === 'top' ? 'y' : prop === 'width' ? 'w' : prop === 'height' ? 'h' : 'r']: val } : p)
  }

  return (
    <div className="w-[240px] flex-shrink-0 flex flex-col border-l border-white/[0.05] bg-[#070707]/80 z-[20] overflow-hidden">

      {/* Tab bar */}
      <div className="h-9 flex-shrink-0 flex items-center border-b border-white/[0.05]">
        {(['prop', 'layers', 'lib'] as PanelTab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === 'layers') props.onRefreshLayers() }}
            className={cn('flex-1 h-full text-[7px] font-black uppercase tracking-widest transition-colors',
              tab === t ? 'text-white/70 border-b border-white/30 -mb-px' : 'text-white/20 hover:text-white/40')}>
            {t === 'prop' ? 'Proprietà' : t === 'layers' ? 'Layer' : 'Libreria'}
          </button>
        ))}
      </div>

      {/* ── Tab: PROPRIETÀ ── */}
      {tab === 'prop' && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Stato vuoto */}
          {!hasSelection && !isPencil && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <MousePointer2 className="w-5 h-5 text-white/10" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/15 text-center px-4">
                Seleziona un oggetto
              </span>
            </div>
          )}

          {/* ── Trasformazione — header fisso, sempre visibile ── */}
          {insp && (
            <div className="flex-shrink-0 px-3 py-2.5 border-b border-white/[0.04] bg-white/[0.01]">
              <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                <PI label="X" value={insp.x} onChange={v => inspUpdate('left', v)} />
                <PI label="Y" value={insp.y} onChange={v => inspUpdate('top', v)} />
                <PI label="W" value={insp.w} onChange={v => inspUpdate('width', v)} />
                <PI label="H" value={insp.h} onChange={v => inspUpdate('height', v)} />
              </div>
              <PI label="Rotazione °" value={insp.r} min={-360} max={360} onChange={v => inspUpdate('angle', v)} className="w-full" />
            </div>
          )}

          {/* ── Icon sub-tabs — una sezione alla volta, zero scroll ── */}
          {(hasSelection || isPencil) && availSubTabs.length > 0 && (
            <div className="flex-shrink-0 flex items-center gap-0.5 px-2 h-9 border-b border-white/[0.04]">
              {availSubTabs.map(st => (
                <button key={st.id} onClick={() => setPropTab(st.id)} title={st.label}
                  className={cn(
                    'flex items-center justify-center w-8 h-7 rounded-lg transition-all',
                    propTab === st.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/25 hover:text-white/60 hover:bg-white/[0.05]'
                  )}>
                  {st.icon}
                </button>
              ))}
              <span className="ml-auto text-[7px] font-black uppercase tracking-widest text-white/15">
                {availSubTabs.find(t => t.id === propTab)?.label}
              </span>
            </div>
          )}

          {/* ── Sub-tab content ── */}
          {(hasSelection || isPencil) && (
            <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-4">

              {/* Pennello */}
              {propTab === 'pencil' && isPencil && (
                <PencilBar sel={sel} onApply={props.onApplyPencil} />
              )}

              {/* Colore — Riempimento + Bordo */}
              {propTab === 'fill' && (
                <div className="space-y-4">
                  {(sel.type === 'shape' || sel.type === 'text') && (() => {
                    const fillStr = typeof sel.fillColor === 'string' ? sel.fillColor : 'Pattern'
                    const fillForCP = typeof sel.fillColor === 'string' ? sel.fillColor : '#ffffff'
                    return (
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-widest text-white/20 mb-2">Riempimento</p>
                        <div className="flex items-center gap-2 mb-2">
                          <CP value={fillForCP} onChange={c => props.onApplyShape({ fill: c })} label="" />
                          <span className="text-[9px] font-mono text-white/40 flex-1 truncate">{fillStr}</span>
                        </div>
                        <SR label="Opacità" value={sel.opacity} min={0} max={100} onChange={v => props.onApplyShape({ opacity: v / 100 })} />
                      </div>
                    )
                  })()}
                  {(() => {
                    const strokeStr = typeof sel.strokeColor === 'string' ? sel.strokeColor : '#ffffff'
                    return (
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-widest text-white/20 mb-2">Bordo</p>
                        <div className="flex items-center gap-2 mb-2">
                          <CP value={strokeStr} onChange={c => props.onApplyShape({ stroke: c })} label="" />
                          <span className="text-[9px] font-mono text-white/40 flex-1 truncate">{strokeStr}</span>
                        </div>
                        <SR label="Peso" value={sel.strokeWidth} min={0} max={50} onChange={v => props.onApplyShape({ strokeWidth: v })} />
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Testo */}
              {propTab === 'text' && sel.type === 'text' && (
                <TextBar sel={sel} onApply={props.onApplyText} onLink={props.onApplyLink}
                  showFP={props.showFP} setShowFP={props.setShowFP}
                  showFX={props.showFX} setShowFX={props.setShowFX}
                  onShadow={props.onApplyShadow} onPreset={props.onApplyPreset} onUpdate={props.onUpdateFx}
                />
              )}

              {/* Forma */}
              {propTab === 'shape' && sel.type === 'shape' && (
                <ShapeBar sel={sel} onApply={props.onApplyShape} onShadow={props.onApplyShadow}
                  onGrad={props.onApplyGradient} showFX={props.showFX} setShowFX={props.setShowFX}
                  onBoolean={props.onDoBoolean} onBindTextToPath={() => { }} onPreset={props.onApplyPreset}
                  onUpdate={props.onUpdateFx}
                />
              )}

              {/* Linea */}
              {propTab === 'line' && sel.type === 'line' && (
                <LineBar sel={sel} onApply={props.onApplyShape}
                  onStart={props.onToggleArrowStart} onEnd={props.onToggleArrowEnd} onConn={props.onToggleConnector} />
              )}

              {/* Immagine */}
              {propTab === 'img' && sel.type === 'image' && (
                <ImageBar sel={sel} onApply={props.onApplyShape} onRemoveBg={props.onRemoveBg}
                  loading={props.bgRemoving} showFx={props.showImgFx} setShowFx={props.setShowImgFx}
                  onTraceImage={props.onTraceImage} onApplyAnimation={props.onApplyAnimation}
                />
              )}

              {/* Gruppo */}
              {propTab === 'group' && sel.type === 'group' && (
                <SR label="Opacità" value={sel.opacity} min={0} max={100} onChange={v => props.onApplyShape({ opacity: v })} />
              )}

              {/* Effetti + Filtri immagine */}
              {propTab === 'fx' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-widest text-white/20 mb-2">Effetti</p>
                    <div className="space-y-1">
                      {UNIFIED_FX_LIST.map(fx => (
                        <FXRow key={fx.key} fx={fx} active={sel.appliedFX.includes(fx.key)} fxProps={sel.fxProps}
                          onToggle={() => props.onApplyPreset(fx.key)}
                          onUpdate={(k, p, v) => props.onUpdateFx(k, p, v)}
                        />
                      ))}
                    </div>
                  </div>
                  {sel.type === 'image' && (
                    <div>
                      <p className="text-[7px] font-black uppercase tracking-widest text-white/20 mb-2">Filtri immagine</p>
                      <ImgFxPanel onFilter={props.onApplyImgFilter} onPreset={props.onApplyPresetFilter}
                        onReset={props.onResetImgFilters} onClose={() => { }} />
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* ── Tab: LAYER ── */}
      {tab === 'layers' && (
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <LayerPanel
            layers={layers}
            onSelect={props.onLayerSelect}
            onToggleVisible={props.onLayerToggleVisible}
            onToggleLock={props.onLayerToggleLock}
            onMoveUp={props.onLayerMoveUp}
            onMoveDown={props.onLayerMoveDown}
            onDelete={props.onLayerDelete}
            onClose={() => setTab('prop')}
            inline
          />
        </div>
      )}

      {/* ── Tab: LIBRERIA ── */}
      {tab === 'lib' && (
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <LibPanel
            onShape={props.onAddShape}
            onIcon={props.onAddIcon}
            onFont={props.onApplyFont}
            onTexture={props.onApplyTexture}
            onBricolage={props.onAddBricolage}
            onGrad={props.onApplyGradient}
            onClose={() => setTab('prop')}
            inline
          />
        </div>
      )}

    </div>
  )
}

// ─── TOOL BUTTON (kept for backward compat) ───────────────────────────────────

function TB({ t, cur, onClick, icon, label }: { t: Tool; cur: Tool; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button onClick={onClick} title={label} className={cn('p-2.5 rounded-xl transition-all', t === cur ? 'bg-accent text-black shadow-md' : 'text-white/30 hover:bg-white/8 hover:text-white')}>{icon}</button>
}

// ─── TOOL GROUP (hover-expandable) ───────────────────────────────────────────
function ToolGroup({ tools, cur, onChange }: {
  tools: { t: Tool; icon: React.ReactNode; label: string }[]
  cur: Tool; onChange: (t: Tool) => void
}) {
  const [open, setOpen] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>()
  const enter = () => { clearTimeout(timer.current); setOpen(true) }
  const leave = () => { timer.current = setTimeout(() => setOpen(false), 180) }
  const active = tools.find(x => x.t === cur)
  const shown = active ?? tools[0]
  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button onClick={() => onChange(shown.t)} title={shown.label}
        className={cn('p-2.5 rounded-xl transition-all relative', active ? 'bg-accent text-black shadow-md' : 'text-white/30 hover:bg-white/8 hover:text-white')}>
        {shown.icon}
        {!active && <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-white/25" />}
      </button>
      {open && (
        <div className="absolute left-full top-0 ml-2 flex flex-col gap-0.5 p-1.5 bg-[#141414]/96 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 min-w-max"
          onMouseEnter={enter} onMouseLeave={leave}>
          {tools.map(x => (
            <button key={x.t} onClick={() => onChange(x.t)} title={x.label}
              className={cn('flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest whitespace-nowrap',
                x.t === cur ? 'bg-accent text-black' : 'text-white/50 hover:bg-white/8 hover:text-white')}>
              {x.icon}<span>{x.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ARTBOARD FLYOUT BUTTON ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ArtboardBtn({ onAdd }: { onAdd: (w: number, h: number, name: string, type: any) => void }) {
  const [open, setOpen] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>()
  const enter = () => { clearTimeout(timer.current); setOpen(true) }
  const leave = () => { timer.current = setTimeout(() => setOpen(false), 200) }
  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button title="Nuova cornice / artboard"
        className="w-9 h-9 flex items-center justify-center rounded-xl transition-all text-white/30 hover:text-white/70 hover:bg-white/[0.04]">
        <Layers className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute left-full top-0 ml-2 flex flex-col gap-0.5 p-1.5 bg-[#141414]/96 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 min-w-max"
          onMouseEnter={enter} onMouseLeave={leave}>
          <p className="text-[7px] font-black uppercase tracking-widest text-white/20 px-2 py-1">Nuova Cornice</p>
          {ARTBOARDS.map(ab => (
            <button key={ab.label} onClick={() => { onAdd(ab.w, ab.h, ab.label, ab.exportType); setOpen(false) }}
              className="flex items-center justify-between gap-4 px-3 py-2 rounded-xl transition-all text-left hover:bg-white/[0.07]">
              <span className="text-[10px] font-bold text-white/60">{ab.label}</span>
              <span className="text-[8px] text-white/20">{ab.w}×{ab.h}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── COLOR PICKER ────────────────────────────────────────────────────────────

function CP({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const isNone = value === 'transparent' || !value
  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[9px] text-white/30 uppercase tracking-widest">{label}</span>}
      <button
        onClick={() => onChange('transparent')}
        title="Nessun colore"
        className={cn(
          "w-6 h-6 rounded-lg border flex-shrink-0 flex items-center justify-center overflow-hidden transition-all",
          isNone ? "border-accent ring-1 ring-accent/30" : "border-white/20 hover:border-white/40"
        )}
        style={{ background: 'repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 50% / 8px 8px' }}
      >
        <div className="w-px h-8 bg-red-500/60 rotate-45" />
      </button>
      <div className="relative w-6 h-6 rounded-lg border border-white/20 overflow-hidden flex-shrink-0" style={{ backgroundColor: isNone ? 'transparent' : value }}>
        <input type="color" value={isNone ? '#000000' : value} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
      </div>
      <div className="flex gap-0.5">
        {PALETTE.slice(0, 8).map((c, i) => <button key={`${i}-${c}`} onClick={() => onChange(c)} className={cn('w-3.5 h-3.5 rounded-sm border flex-shrink-0', value === c ? 'border-accent' : 'border-white/10')} style={{ backgroundColor: c }} />)}
      </div>
    </div>
  )
}

// ─── BLEND MODE PICKER ───────────────────────────────────────────────────────
const BLEND_MODES = [
  'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'
]

function BlendModeDrop({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-2 w-44 max-h-64 overflow-y-auto scrollbar-hide">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2 px-2">Metodo Fusione</p>
      {BLEND_MODES.map(m => (
        <button key={m} onClick={() => { onChange(m); onClose() }}
          className={cn('w-full text-left px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold hover:bg-white/10 tracking-widest transition-colors',
            value === m ? 'text-accent' : 'text-white/50')}>
          {m.replace('-', ' ')}
        </button>
      ))}
    </div>
  )
}

// ─── FONT PICKER ─────────────────────────────────────────────────────────────

function FontDrop({ value, onChange, onClose }: { value: string; onChange: (f: string) => void; onClose: () => void }) {
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-2 w-52 max-h-72 overflow-y-auto scrollbar-hide">
      {ALL_FONTS.map((f, i) => <button key={`${i}-${f}`} onClick={() => { onChange(f); onClose() }} className={cn('w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-white/10', value === f ? 'text-accent' : 'text-white/70')} style={{ fontFamily: f }}>{f}</button>)}
    </div>
  )
}

// ─── TEXT BAR ────────────────────────────────────────────────────────────────

function TextBar({ sel, onApply, onLink, showFP, setShowFP, showFX, setShowFX, onShadow, onPreset, onUpdate }: {
  sel: SelState; onApply: (p: Partial<fabric.Textbox>) => void; onLink: () => void
  showFP: boolean; setShowFP: (v: boolean) => void; showFX: boolean; setShowFX: (v: boolean) => void
  onShadow: (u: Partial<SelState>) => void; onPreset: (p: any) => void; onUpdate: (evt: string, p: string, v: any) => void
}) {
  const fontBtnRef = React.useRef<HTMLButtonElement | null>(null)
  const fxBtnRef = React.useRef<HTMLButtonElement | null>(null)
  const paraTimer = React.useRef<ReturnType<typeof setTimeout>>()
  const [showPara, setShowPara] = React.useState(false)
  const ib = (a: boolean) => cn('w-9 h-9 flex items-center justify-center rounded-lg transition-colors border-2 border-transparent', a ? 'bg-accent text-black' : 'text-white/40 hover:bg-white/10 hover:text-white')
  const PS = [{ l: 'H1', sz: 48, fw: 'bold' as const }, { l: 'H2', sz: 32, fw: 'bold' as const }, { l: 'H3', sz: 24, fw: 'bold' as const }, { l: 'CP', sz: 16, fw: 'normal' as const }, { l: 'C', sz: 12, fw: 'normal' as const }]
  return (
    <div className="flex items-center gap-4 flex-shrink-0">
      <div className="flex-shrink-0">
        <button ref={fontBtnRef} onClick={() => setShowFP(!showFP)} className="flex items-center gap-2 h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white/80 hover:bg-white/10 min-w-[130px]" style={{ fontFamily: sel.fontFamily }}>
          {sel.fontFamily}<ChevronDown className="w-4 h-4 ml-auto opacity-40" />
        </button>
        {showFP && typeof document !== 'undefined' && <DropdownPortal triggerRef={fontBtnRef}>
          <FontDrop value={sel.fontFamily} onChange={f => onApply({ fontFamily: f })} onClose={() => setShowFP(false)} />
        </DropdownPortal>}
      </div>
      <input type="number" value={sel.fontSize} min={6} max={400} onChange={e => onApply({ fontSize: parseInt(e.target.value) || 24 })} className="w-16 h-9 px-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white uppercase font-black text-center focus:outline-none flex-shrink-0" />
      <div className="w-px h-6 bg-white/10 flex-shrink-0" />
      <div className="flex items-center gap-1">
        <button onClick={() => onApply({ fontWeight: sel.bold ? 'normal' : 'bold' })} className={ib(sel.bold)}><Bold className="w-4 h-4" /></button>
        <button onClick={() => onApply({ fontStyle: sel.italic ? 'normal' : 'italic' })} className={ib(sel.italic)}><Italic className="w-4 h-4" /></button>
        <button onClick={() => onApply({ underline: !sel.underline })} className={ib(sel.underline)}><Underline className="w-4 h-4" /></button>
        <button onClick={() => onApply({ linethrough: !sel.linethrough })} className={ib(sel.linethrough)}><Strikethrough className="w-4 h-4" /></button>
      </div>
      <div className="w-px h-6 bg-white/10 flex-shrink-0" />
      <div className="flex items-center gap-1">
        <button onClick={() => onApply({ textAlign: 'left' })} className={ib(sel.textAlign === 'left')}><AlignLeft className="w-4 h-4" /></button>
        <button onClick={() => onApply({ textAlign: 'center' })} className={ib(sel.textAlign === 'center')}><AlignCenter className="w-4 h-4" /></button>
        <button onClick={() => onApply({ textAlign: 'right' })} className={ib(sel.textAlign === 'right')}><AlignRight className="w-4 h-4" /></button>
        <button onClick={() => onApply({ textAlign: 'justify' })} className={ib(sel.textAlign === 'justify')}><AlignJustify className="w-4 h-4" /></button>
      </div>
      <div className="w-px h-6 bg-white/10 flex-shrink-0" />
      <CP value={sel.fillColor} onChange={c => onApply({ fill: c })} label="A" />
      <div className="w-px h-6 bg-white/10 flex-shrink-0" />
      {/* Paragrafo — hover espande i preset */}
      <div className="relative flex-shrink-0"
        onMouseEnter={() => { clearTimeout(paraTimer.current); setShowPara(true) }}
        onMouseLeave={() => { paraTimer.current = setTimeout(() => setShowPara(false), 180) }}>
        <button className="h-8 w-8 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[13px] font-black text-white/40 hover:text-white hover:bg-white/10 select-none" title="Stili paragrafo">¶</button>
        {showPara && (
          <div className="absolute top-full left-0 mt-1.5 flex gap-1 p-1.5 bg-[#141414]/96 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50"
            onMouseEnter={() => { clearTimeout(paraTimer.current); setShowPara(true) }}
            onMouseLeave={() => { paraTimer.current = setTimeout(() => setShowPara(false), 180) }}>
            {PS.map(p => <button key={p.l} onClick={() => onApply({ fontSize: p.sz, fontWeight: p.fw })}
              className="h-7 px-3 rounded-lg text-[10px] font-black border border-white/8 text-white/40 hover:bg-white/10 hover:text-white uppercase tracking-widest whitespace-nowrap">{p.l}</button>)}
          </div>
        )}
      </div>
      <div className="w-px h-6 bg-white/10 flex-shrink-0" />
      <button onClick={onLink} className={ib(false)} title="Aggiungi link"><Link2 className="w-4 h-4" /></button>
      <div className="flex-shrink-0">
        <button ref={fxBtnRef} onClick={() => setShowFX(!showFX)} className={cn('h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 relative transition-all', showFX || sel.appliedFX?.length ? 'bg-accent/20 text-accent border border-accent/40' : 'bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20')}>
          <Sparkles className="w-3.5 h-3.5" /> Effetti
          {(sel.appliedFX?.length || 0) > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent text-black text-[7px] font-black flex items-center justify-center">{sel.appliedFX.length}</span>}
        </button>
        {showFX && typeof document !== 'undefined' && <DropdownPortal triggerRef={fxBtnRef} alignRight>
          <TextFXPanel sel={sel} onShadow={onShadow} onPreset={onPreset} onUpdate={onUpdate} onClose={() => setShowFX(false)} />
        </DropdownPortal>}
      </div>
      <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/5 flex-shrink-0">
        <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">Ila</span>
        <input type="range" min={0.8} max={3} step={0.1} value={sel.lineHeight} onChange={e => onApply({ lineHeight: parseFloat(e.target.value) })} className="w-20 accent-accent" />
        <span className="text-[10px] font-black text-white/60 w-6">{sel.lineHeight.toFixed(1)}</span>
      </div>
    </div>
  )
}

// ─── SHAPE BAR ───────────────────────────────────────────────────────────────

function ShapeBar({ sel, onApply, onShadow, onGrad, onPreset, onUpdate, showFX, setShowFX, onBoolean, onBindTextToPath }: {
  sel: SelState; onApply: (p: Partial<fabric.Object>) => void; onShadow: (u: Partial<SelState>) => void
  onGrad: (c: string[], a?: number) => void; onPreset: (p: any) => void; onUpdate: (evt: string, p: string, v: any) => void; showFX: boolean; setShowFX: (v: boolean) => void
  onBoolean: (op: 'union' | 'subtract' | 'intersect') => void; onBindTextToPath: void
}) {
  const fxBtnRef = React.useRef<HTMLButtonElement | null>(null)
  const bmBtnRef = React.useRef<HTMLButtonElement | null>(null)
  const [showBM, setShowBM] = useState(false)
  return (
    <div className="flex items-center gap-5 flex-shrink-0">
      <CP value={sel.fillColor} onChange={c => onApply({ fill: c })} label="Fill" />
      <div className="w-px h-6 bg-white/10" />
      <CP value={sel.strokeColor} onChange={c => onApply({ stroke: c })} label="Bordo" />
      <input type="number" min={0} max={50} value={sel.strokeWidth} onChange={e => onApply({ strokeWidth: parseInt(e.target.value) || 0 })} className="w-14 h-8 px-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/80 text-center focus:outline-none flex-shrink-0" />
      <div className="w-px h-6 bg-white/10" />
      <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/5">
        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Opacità</span>
        <input type="range" min={0} max={100} value={sel.opacity} onChange={e => onApply({ opacity: parseInt(e.target.value) / 100 })} className="w-24 accent-accent opacity-70 hover:opacity-100 transition-opacity" />
        <span className="text-[10px] font-black text-white/60 w-8">{sel.opacity}%</span>
      </div>
      <div className="w-px h-6 bg-white/10" />
      <div className="flex-shrink-0">
        <button ref={fxBtnRef} onClick={() => setShowFX(!showFX)} className={cn('h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all relative', showFX || sel.appliedFX?.length ? 'bg-accent/20 text-accent border border-accent/40' : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10')}>
          <Sparkles className="w-3.5 h-3.5" /> Effetti
          {(sel.appliedFX?.length || 0) > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent text-black text-[7px] font-black flex items-center justify-center">{sel.appliedFX.length}</span>}
        </button>
        {showFX && typeof document !== 'undefined' && <DropdownPortal triggerRef={fxBtnRef} alignRight>
          <ShapeFXPanel sel={sel} onShadow={onShadow} onGrad={onGrad} onPreset={onPreset} onUpdate={onUpdate} onClose={() => setShowFX(false)} />
        </DropdownPortal>}
      </div>
      <div className="w-px h-6 bg-white/10" />
      <div className="flex-shrink-0 relative">
        <button ref={bmBtnRef} onClick={() => setShowBM(!showBM)}
          className={cn('h-8 px-3 rounded-xl text-[10px] font-black border uppercase tracking-widest flex items-center gap-2 transition-all',
            sel.blendMode !== 'source-over' ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10')}>
          <Merge className="w-3.5 h-3.5" /> {sel.blendMode === 'source-over' ? 'Blend' : sel.blendMode}
        </button>
        {showBM && typeof document !== 'undefined' && (
          <DropdownPortal triggerRef={bmBtnRef} alignRight>
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-2 min-w-[200px]">
              <BlendModeDrop value={sel.blendMode} onChange={v => { onApply({ blendMode: v }); setShowBM(false) }} onClose={() => setShowBM(false)} />
            </div>
          </DropdownPortal>
        )}
      </div>
      <div className="w-px h-6 bg-white/10" />
      <div className="flex items-center gap-1">
        <button onClick={() => onBoolean('union')} title="Unione" className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-emerald-400"><Merge className="w-4 h-4" /></button>
        <button onClick={() => onBoolean('subtract')} title="Sottrai" className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-red-400"><Scissors className="w-4 h-4" /></button>
        <button onClick={() => onBoolean('intersect')} title="Interseca" className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-blue-400"><Ghost className="w-4 h-4" /></button>
        <button onClick={onBindTextToPath} title="Testo su Tracciato" className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-amber-400"><Type className="w-4 h-4" /></button>
      </div>
    </div>
  )
}

// ─── LINE BAR ────────────────────────────────────────────────────────────────

function LineBar({ sel, onApply, onStart, onEnd, onConn }: { sel: SelState; onApply: (p: Partial<fabric.Object>) => void; onStart: () => void; onEnd: () => void; onConn: () => void }) {
  const ib = (a: boolean) => cn('w-9 h-9 flex items-center justify-center rounded-xl border-2 transition-colors', a ? 'bg-accent text-black border-accent' : 'border-white/10 text-white/40 hover:bg-white/10 hover:text-white')
  return (
    <div className="flex items-center gap-4 flex-shrink-0">
      <CP value={sel.strokeColor} onChange={c => onApply({ stroke: c })} label="Linea" />
      <div className="w-px h-6 bg-white/10" />
      <input type="number" min={1} max={50} value={sel.strokeWidth} onChange={e => onApply({ strokeWidth: parseInt(e.target.value) || 1 })} className="w-14 h-8 px-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/80 text-center focus:outline-none flex-shrink-0" />
      <div className="w-px h-6 bg-white/10" />
      <div className="flex items-center gap-1">
        <button onClick={onStart} className={ib(sel.hasStartArrow)} title="Ancoraggio Inizio"><ArrowLeft className="w-4 h-4" /></button>
        <button onClick={onEnd} className={ib(sel.hasEndArrow)} title="Ancoraggio Fine"><ArrowRight className="w-4 h-4" /></button>
      </div>
      <div className="w-px h-6 bg-white/10" />
      <button onClick={onConn}
        className={cn('h-8 px-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2', sel.isConnector ? 'bg-accent text-black border-accent' : 'border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20')}>
        <ArrowLeftRight className="w-3.5 h-3.5" /> Aggancio
      </button>
    </div>
  )
}

// ─── IMAGE BAR ────────────────────────────────────────────────────────────────

function ImageBar({ sel, onApply, onRemoveBg, loading, showFx, setShowFx, onTraceImage, onApplyAnimation }: {
  sel: SelState; onApply: (p: Partial<fabric.Object>) => void; onRemoveBg: () => void; loading: boolean
  showFx: boolean; setShowFx: (v: boolean) => void; onTraceImage: () => void; onApplyAnimation: (a: string | null) => void
}) {
  return (
    <div className="flex items-center gap-6 flex-shrink-0">
      <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/5">
        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Opacità</span>
        <input type="range" min={0} max={100} value={sel.opacity} onChange={e => onApply({ opacity: parseInt(e.target.value) / 100 })} className="w-24 accent-accent opacity-70 hover:opacity-100 transition-opacity" />
        <span className="text-[10px] font-black text-white/60 w-8">{sel.opacity}%</span>
      </div>
      <div className="w-px h-6 bg-white/10" />
      {/* Filtri button — opens ImgFxPanel via portal (managed by parent via showImgFx state) */}
      <button onClick={() => setShowFx(!showFx)}
        className={cn('flex items-center gap-2 h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors',
          showFx ? 'bg-accent/30 text-accent border border-accent/40' : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10')}>
        <Sliders className="w-3.5 h-3.5" /> Filtri
      </button>
      <button onClick={onRemoveBg} disabled={loading} className="flex items-center gap-2 h-8 px-4 rounded-xl bg-violet-600/10 border border-violet-500/30 text-violet-300 text-[10px] font-black uppercase tracking-widest hover:bg-violet-500/20 disabled:opacity-30 transition-all">
        <Sparkles className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />{loading ? 'Rimozione...' : 'Rimuovi BG'}
      </button>
      <button onClick={onTraceImage} className="flex items-center gap-2 h-8 px-4 rounded-xl bg-emerald-600/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all">
        <Zap className="w-3.5 h-3.5" /> Vettorializza
      </button>
      <div className="w-px h-6 bg-white/10" />
      <button onClick={() => onApplyAnimation(sel.animation ? null : 'pulse')} className={cn('h-8 px-3 rounded-xl text-[10px] font-black border uppercase tracking-widest flex items-center gap-2 transition-all', sel.animation ? 'bg-amber-500 text-black border-amber-500' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10')}>
        <Play className={cn('w-3.5 h-3.5', sel.animation && 'animate-spin')} /> Animazione
      </button>
    </div>
  )
}

// ─── PENCIL BAR (Brush Settings) ──────────────────────────────────────────────

function PencilBar({ sel, onApply }: { sel: SelState; onApply: (p: Partial<SelState>) => void }) {
  const brushes = [
    { id: BRUSH_TYPES.PENCIL, label: 'Matita', icon: <Pencil className="w-3.5 h-3.5" /> },
    { id: BRUSH_TYPES.CRAYON, label: 'Crayon', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: BRUSH_TYPES.INK, label: 'Ink', icon: <Type className="w-3.5 h-3.5" /> },
    { id: BRUSH_TYPES.MARKER, label: 'Evind.', icon: <Highlighter className="w-3.5 h-3.5" /> },
    { id: BRUSH_TYPES.SPRAY, label: 'Spray', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: BRUSH_TYPES.GENERATIVE, label: 'Gen Art', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: BRUSH_TYPES.LIQUID, label: 'Liquid', icon: <Droplets className="w-3.5 h-3.5" /> },
    { id: BRUSH_TYPES.GLOW, label: 'Glow', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: BRUSH_TYPES.NEON, label: 'Neon', icon: <Star className="w-3.5 h-3.5" /> },
    { id: BRUSH_TYPES.CHARCOAL, label: 'Carbon.', icon: <GripVertical className="w-3.5 h-3.5" /> },
    { id: BRUSH_TYPES.WATERCOLOR, label: 'Acq.', icon: <Waves className="w-3.5 h-3.5" /> },
    { id: BRUSH_TYPES.DOTTED, label: 'Punti', icon: <Minus className="w-3.5 h-3.5" /> },
    { id: BRUSH_TYPES.DASHED, label: 'Tratti', icon: <Minus className="w-3.5 h-3.5" /> },
    { id: BRUSH_TYPES.CHROME, label: 'Chrome', icon: <Zap className="w-3.5 h-3.5 animate-pulse" /> },
    { id: BRUSH_TYPES.INK_BLEED, label: 'DarkInk', icon: <Droplets className="w-3.5 h-3.5 text-violet-400" /> },
    { id: BRUSH_TYPES.THORN, label: 'Toxic', icon: <Scissors className="w-3.5 h-3.5 text-fuchsia-500" /> },
    { id: BRUSH_TYPES.GLITCH, label: 'Glitch', icon: <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-bounce" /> },
    { id: BRUSH_TYPES.CALLIGRAPHY, label: 'Callig.', icon: <Type className="w-3.5 h-3.5 text-amber-500" /> },
  ]

  return (
    <div className="flex items-center gap-5 flex-shrink-0 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex bg-white/5 rounded-xl border border-white/10 p-1">
        {brushes.map(b => (
          <button key={b.id} onClick={() => onApply({ brushType: b.id })} title={b.label}
            className={cn('w-9 h-8 flex items-center justify-center rounded-lg transition-all',
              sel.brushType === b.id ? 'bg-accent text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5')}>
            {b.icon}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-white/10" />

      <div className="flex items-center gap-3">
        <span className="text-[9px] text-white/30 uppercase tracking-widest">Peso</span>
        <input type="range" min={1} max={100} value={sel.brushWidth}
          onChange={e => onApply({ brushWidth: parseInt(e.target.value) })}
          className="w-24 accent-accent" />
        <span className="text-[10px] font-black text-white/60 w-6">{sel.brushWidth}</span>
      </div>

      <div className="w-px h-6 bg-white/10" />

      <CP value={sel.brushColor || '#ffffff'} onChange={c => onApply({ brushColor: c })} label="TRATTO" />
    </div>
  )
}

// ─── UNIFIED FX — single list for text, shapes, images, connectors ────────────
// cat field is used for section headers in UnifiedFXPanel.
// animated:true = uTime-driven (shown with ✦ badge)

const UNIFIED_FX_LIST = [
  // ── MOTION ──────────────────────────────────────────────────────────────────
  {
    cat: 'Motion', key: 'liquid', label: 'Liquid', color: '#00c9ff', animated: true, icon: <Waves className="w-3 h-3" />,
    sliders: [{ label: 'Forza', prop: 'intensity', min: 0, max: 100, def: 50 }, { label: 'Scala', prop: 'scale', min: 5, max: 80, def: 30 }]
  },
  {
    cat: 'Motion', key: 'wavy', label: 'Wave', color: '#00ffa2', animated: true, icon: <Merge className="w-3 h-3" />,
    sliders: [{ label: 'Ampiezza', prop: 'intensity', min: 0, max: 100, def: 50 }, { label: 'Frequenza', prop: 'frequency', min: 1, max: 50, def: 10 }]
  },
  {
    cat: 'Motion', key: 'glitch', label: 'Glitch', color: '#ff0044', animated: true, icon: <Zap className="w-3 h-3" />,
    sliders: [{ label: 'Danno', prop: 'amount', min: 0, max: 50, def: 10 }]
  },
  {
    cat: 'Motion', key: 'vhs', label: 'VHS', color: '#c0ff00', animated: true, icon: <span className="text-[8px] font-black">VHS</span>,
    sliders: [{ label: 'Intensità', prop: 'intensity', min: 0, max: 100, def: 60 }]
  },
  {
    cat: 'Motion', key: 'matrix', label: 'Matrix', color: '#00ff44', animated: true, icon: <span className="text-[8px] font-black">01</span>,
    sliders: [{ label: 'Pioggia', prop: 'intensity', min: 0, max: 100, def: 70 }]
  },
  // ── OPTICAL ─────────────────────────────────────────────────────────────────
  {
    cat: 'Optical', key: 'neon', label: 'Neon', color: '#00ffff', animated: true, icon: <Zap className="w-3 h-3" />,
    sliders: [{ label: 'Aura', prop: 'blur', min: 0, max: 100, def: 30 }, { label: 'Tratto', prop: 'intensity', min: 0, max: 20, def: 5 }],
    colors: [{ label: 'Neon', prop: 'color', def: '#00ffff' }]
  },
  {
    cat: 'Optical', key: 'chrome', label: 'Chrome', color: '#a8edea', animated: true, icon: <Cloud className="w-3 h-3" />,
    sliders: [{ label: 'Contrasto', prop: 'intensity', min: 0, max: 100, def: 50 }]
  },
  {
    cat: 'Optical', key: 'holo', label: 'Holo', color: '#00eaff', animated: true, icon: <Sparkles className="w-3 h-3" />,
    sliders: [{ label: 'Riflesso', prop: 'intensity', min: 0, max: 100, def: 50 }, { label: 'Velocità', prop: 'speed', min: 0, max: 200, def: 50 }]
  },
  {
    cat: 'Optical', key: 'prism', label: 'Prism', color: '#ff00ff', animated: false, icon: <Triangle className="w-3 h-3" />,
    sliders: [{ label: 'Dispersion', prop: 'amount', min: 0, max: 100, def: 20 }]
  },
  {
    cat: 'Optical', key: 'bloom', label: 'Bloom', color: '#fffbe0', animated: false, icon: <Star className="w-3 h-3" />,
    sliders: [{ label: 'Soglia', prop: 'threshold', min: 0, max: 100, def: 55 }, { label: 'Intensità', prop: 'intensity', min: 0, max: 100, def: 50 }, { label: 'Raggio', prop: 'radius', min: 0, max: 100, def: 50 }]
  },
  // ── TEXTURE ─────────────────────────────────────────────────────────────────
  {
    cat: 'Texture', key: 'grain', label: 'Grain', color: '#d4c5a9', animated: true, icon: <span className="text-[8px] font-black">▒▒</span>,
    sliders: [{ label: 'Intensità', prop: 'intensity', min: 0, max: 100, def: 50 }]
  },
  {
    cat: 'Texture', key: 'halftone', label: 'Halftone', color: '#ffb142', animated: false, icon: <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center"><div className="w-1 h-1 bg-current rounded-full" /></div>,
    sliders: [{ label: 'Grana', prop: 'size', min: 1, max: 50, def: 10 }, { label: 'Densità', prop: 'intensity', min: 0, max: 100, def: 50 }]
  },
  {
    cat: 'Texture', key: 'riso', label: 'Riso', color: '#f72585', animated: false, icon: <Palette className="w-3 h-3" />,
    sliders: [{ label: 'Incid.', prop: 'intensity', min: 0, max: 100, def: 50 }],
    colors: [{ label: 'Colore1', prop: 'color1', def: '#f72585' }, { label: 'Colore2', prop: 'color2', def: '#4cc9f0' }]
  },
  {
    cat: 'Texture', key: 'thermal', label: 'Heat', color: '#ff4400', animated: false, icon: <Waves className="w-3 h-3" />,
    sliders: [{ label: 'Intensità', prop: 'intensity', min: 0, max: 100, def: 100 }, { label: 'Shift', prop: 'shift', min: -50, max: 50, def: 0 }]
  },
  {
    cat: 'Texture', key: 'ascii', label: 'ASCII', color: '#ffffff', animated: false, icon: <span className="text-[8px] font-black">@#</span>,
    sliders: [{ label: 'Grana', prop: 'size', min: 4, max: 20, def: 8 }, { label: 'Intensità', prop: 'intensity', min: 0, max: 100, def: 100 }]
  },
  // ── STYLE ───────────────────────────────────────────────────────────────────
  {
    cat: 'Style', key: 'clay', label: 'Clay', color: '#ff9ff3', animated: false, icon: <Heart className="w-3 h-3" />,
    sliders: [
      { label: 'Puffy', prop: 'softness', min: 0, max: 100, def: 30 },
      { label: 'Volume', prop: 'volume', min: 0, max: 100, def: 50 },
      { label: 'Gloss', prop: 'gloss', min: 0, max: 100, def: 30 },
      { label: 'Matte', prop: 'matte', min: 0, max: 100, def: 20 }
    ],
    colors: [{ label: 'Plastica', prop: 'color', def: '' }]
  },
  {
    cat: 'Style', key: 'glass', label: 'Glass', color: 'rgba(255,255,255,0.85)', animated: false, icon: <span className="text-[8px] font-black">GL</span>,
    sliders: [{ label: 'Vetro', prop: 'opacity', min: 0, max: 100, def: 10 }, { label: 'Bordo', prop: 'border', min: 0, max: 50, def: 10 }],
    colors: [{ label: 'Vetro', prop: 'color', def: '#ffffff' }]
  },
  {
    cat: 'Style', key: 'oil', label: 'Oil', color: '#f3a000', animated: false, icon: <Palette className="w-3 h-3" />,
    sliders: [{ label: 'Tocco', prop: 'radius', min: 10, max: 100, def: 50 }, { label: 'Pasta', prop: 'intensity', min: 0, max: 100, def: 80 }]
  },
  {
    cat: 'Style', key: 'outline', label: 'Outline', color: '#ffffff', animated: false, icon: <Triangle className="w-3 h-3" />,
    sliders: [{ label: 'Peso', prop: 'thickness', min: 5, max: 60, def: 20 }],
    colors: [{ label: 'Tratto', prop: 'color', def: '#ffffff' }]
  },
  {
    cat: 'Style', key: 'pixelate', label: 'Pixel', color: '#94a3b8', animated: false, icon: <span className="text-[8px] font-black">◼◼</span>,
    sliders: [{ label: 'Blocchi', prop: 'size', min: 2, max: 40, def: 8 }]
  },
  {
    cat: 'Style', key: '3d', label: '3D', color: '#6366f1', animated: false, icon: <span className="text-[8px] font-black">3D</span>,
    sliders: [{ label: 'Prof.', prop: 'depth', min: 1, max: 50, def: 10 }, { label: 'Angolo', prop: 'angle', min: 0, max: 360, def: 45 }],
    colors: [{ label: 'Volume', prop: 'color', def: '' }]
  },
  {
    cat: 'Style', key: 'retro', label: 'Retro', color: '#f9ca24', animated: false, icon: <Star className="w-3 h-3" />,
    sliders: [],
    colors: [{ label: 'Primario', prop: 'primary', def: '#f9ca24' }]
  },
  {
    cat: 'Style', key: 'skew', label: 'Skew', color: '#a855f7', animated: false, icon: <Maximize2 className="w-3 h-3" />,
    sliders: [{ label: 'Inclin. X', prop: 'x', min: -50, max: 50, def: 10 }, { label: 'Inclin. Y', prop: 'y', min: -50, max: 50, def: 0 }]
  },
] as const

type FXItem = typeof UNIFIED_FX_LIST[number]

function FXRow({ fx, active, fxProps, onToggle, onUpdate }: {
  fx: FXItem; active: boolean; fxProps: Record<string, Record<string, number>>
  onToggle: () => void; onUpdate: (k: string, p: string, v: number) => void
}) {
  const { key: fxKey, label, color, animated, icon } = fx
  const sliders = (fx as any).sliders as { label: string; prop: string; min: number; max: number; def: number }[]
  return (
    <div className={cn(
      'rounded-xl overflow-hidden transition-all duration-300 border backdrop-blur-md mb-1',
      active
        ? 'bg-white/[0.12] border-white/20 shadow-[0_0_18px_rgba(255,255,255,0.04)]'
        : 'bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.06] hover:border-white/10'
    )}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3 py-2.5 select-none text-left group">
        <div className={cn(
          'w-5 h-5 flex items-center justify-center rounded-lg transition-all',
          active ? 'scale-110' : 'opacity-40 grayscale group-hover:opacity-60 group-hover:grayscale-0'
        )} style={{ color: active ? color : 'inherit' }}>
          {icon}
        </div>
        <div className="flex-1 flex items-center gap-1.5">
          <span className={cn('text-[10px] font-black uppercase tracking-[0.15em] transition-all',
            active ? 'text-white/90' : 'text-white/30')}>
            {label}
          </span>
          {animated && <span className="text-[7px] text-white/20 font-bold">✦</span>}
        </div>
        <div className={cn(
          'w-1.5 h-1.5 rounded-full transition-all shadow-[0_0_8px_rgba(255,255,255,0.5)]',
          active ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        )} style={{ backgroundColor: color }} />
      </button>
      {active && sliders.length > 0 && (
        <div className="px-3 pb-3 space-y-3 pt-1 border-t border-white/[0.05] animate-in fade-in slide-in-from-top-1 duration-300">
          {sliders.map((sl: any) => (
            <SR key={sl.prop} label={sl.label}
              value={(fxProps || {})?.[fxKey]?.[sl.prop] ?? sl.def}
              min={sl.min} max={sl.max}
              onChange={(v: number) => onUpdate(fxKey, sl.prop, v)} />
          ))}
        </div>
      )}
    </div>
  )
}

// Single unified FX panel — used for text, shapes, images, and connectors.
function UnifiedFXPanel({ sel, onShadow, onGrad, onPreset, onUpdate, onClose }: {
  sel: SelState; onShadow: (u: Partial<SelState>) => void; onGrad?: (c: string[], a?: number) => void
  onPreset: (p: string) => void; onUpdate: (k: string, p: string, v: any) => void; onClose: () => void
}) {
  const active = sel.appliedFX || []
  const cats = ['Motion', 'Optical', 'Texture', 'Style'] as const
  const catColors: Record<string, string> = {
    Motion: 'text-cyan-400', Optical: 'text-violet-400', Texture: 'text-amber-400', Style: 'text-pink-400'
  }
  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-3 w-[17rem] animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto scrollbar-hide">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-accent" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Effetti</span>
          {active.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-accent text-black text-[7px] font-black flex items-center justify-center">{active.length}</span>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>

      {cats.map(cat => {
        const items = UNIFIED_FX_LIST.filter(f => f.cat === cat)
        return (
          <div key={cat} className="mb-3">
            <p className={cn('text-[8px] font-black uppercase tracking-widest px-1 mb-1.5', catColors[cat])}>{cat}</p>
            {items.map(fx => (
              <FXRow key={fx.key} fx={fx} active={active.includes(fx.key)} fxProps={sel.fxProps}
                onToggle={() => onPreset(fx.key)} onUpdate={onUpdate} />
            ))}
          </div>
        )
      })}

      {onGrad && (
        <div className="border-t border-white/8 pt-3 mb-3">
          <p className="text-[9px] text-white/25 uppercase tracking-widest mb-2 px-1">Gradienti</p>
          <div className="grid grid-cols-6 gap-1.5 px-1">
            {GRADIENT_PRESETS.map(gp => (
              <button key={gp.name} onClick={() => onGrad(gp.colors, 90)} title={gp.name}
                className="aspect-square rounded-lg border border-white/10 hover:scale-110 hover:border-white/30 transition-all overflow-hidden"
                style={{ background: `linear-gradient(135deg,${gp.colors[0]},${gp.colors[1]})` }} />
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-white/8 pt-3">
        <ShadowSec sel={sel} onShadow={onShadow} />
      </div>
    </div>
  )
}

// Keep legacy aliases so call-sites in TextBar/ShapeBar don't need simultaneous edits
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TextFXPanel(p: any) { return <UnifiedFXPanel {...p} /> }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ShapeFXPanel(p: any) { return <UnifiedFXPanel {...p} /> }

// ─── SHADOW SECTION ───────────────────────────────────────────────────────────

function ShadowSec({ sel, onShadow }: { sel: SelState; onShadow: (u: Partial<SelState>) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-white/60 font-bold">Ombra</span>
        <Tog active={sel.shadowEnabled} onToggle={() => onShadow({ shadowEnabled: !sel.shadowEnabled })} />
      </div>
      {sel.shadowEnabled && (
        <div className="space-y-2 pl-2 border-l border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/30 w-14">Colore</span>
            <div className="relative w-5 h-5 rounded border border-white/20" style={{ backgroundColor: sel.shadowColor }}>
              <input type="color" value={sel.shadowColor} onChange={e => onShadow({ shadowColor: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </div>
          </div>
          <SR label="Blur" value={sel.shadowBlur} min={0} max={80} onChange={v => onShadow({ shadowBlur: v })} />
          <SR label="Offset X" value={sel.shadowOffsetX} min={-50} max={50} onChange={v => onShadow({ shadowOffsetX: v })} />
          <SR label="Offset Y" value={sel.shadowOffsetY} min={-50} max={50} onChange={v => onShadow({ shadowOffsetY: v })} />
        </div>
      )}
    </div>
  )
}

// ─── LIBRARY PANEL (Advanced Asset Explorer) ─────────────────────────────────

function LibPanel({ onShape, onIcon, onFont, onTexture, onBricolage, onGrad, onClose, inline = false }: {
  onShape: (p: string) => void;
  onIcon: (svgPath: string) => void;
  onFont: (f: string) => void;
  onTexture: (tex: any) => void;
  onBricolage: (asset: any) => void;
  onGrad: (c: string[], a?: number) => void;
  onClose: () => void;
  inline?: boolean
}) {
  const [tab, setTab] = useState<'fonts' | 'shapes' | 'icons' | 'textures' | 'bricolage'>('shapes')
  const [search, setSearch] = useState('')

  return (
    <div className={inline ? "flex flex-col flex-1 overflow-hidden" : "fixed top-16 right-4 bottom-24 z-[200] w-80 bg-[#141414]/98 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300"}>
      {!inline && <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Library className="w-4 h-4 text-accent" />
          <span className="text-[11px] font-black uppercase tracking-widest text-white/70">Asset Explorer</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white/30 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
      </div>}

      {/* Tabs */}
      <div className="flex px-2 py-1.5 bg-black/20 gap-1 overflow-x-auto scrollbar-hide">
        {(['fonts', 'shapes', 'icons', 'textures', 'bricolage'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
              tab === t ? 'bg-white/10 text-accent shadow-inner' : 'text-white/30 hover:text-white/60')}>
            {t}
          </button>
        ))}
      </div>

      <div className="p-3 border-b border-white/5">
        <div className="relative">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`Cerca ${tab}...`}
            className="w-full h-9 pl-9 pr-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white/70 focus:outline-none focus:border-accent/40 placeholder-white/20" />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/20" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
        {tab === 'shapes' && (
          <div className="space-y-6">
            {Object.entries(SHAPE_LIBRARY).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-3 ml-1">{cat}</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).map(sh => (
                    <button key={sh.name} onClick={() => onShape(sh.path)}
                      className="aspect-square flex flex-col items-center justify-center gap-1.5 bg-white/5 border border-white/8 rounded-2xl hover:bg-white/10 hover:border-accent/30 transition-all group">
                      <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-lg"><path d={sh.path} fill="none" stroke="currentColor" strokeWidth="3" className="text-white/40 group-hover:text-white transition-colors" /></svg>
                      <span className="text-[7px] font-bold uppercase tracking-widest text-white/20 group-hover:text-white/50">{sh.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'icons' && (
          <div className="grid grid-cols-3 gap-2.5">
            {ICONS_LIBRARY.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).map(ic => (
              <button key={ic.name} onClick={() => onIcon(ic.path)}
                className="aspect-square flex flex-col items-center justify-center gap-1.5 bg-white/5 border border-white/8 rounded-2xl hover:bg-white/10 hover:border-accent/30 transition-all group">
                <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow-lg"><path d={ic.path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40 group-hover:text-white transition-colors" /></svg>
                <span className="text-[7px] font-bold uppercase tracking-widest text-white/20 group-hover:text-white/50">{ic.name}</span>
              </button>
            ))}
          </div>
        )}

        {tab === 'fonts' && (
          <div className="space-y-6">
            {Object.entries(FONT_CATEGORIES).map(([cat, fonts]) => (
              <div key={cat}>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-3 ml-1">{cat}</p>
                <div className="flex flex-col gap-1.5">
                  {fonts.filter(f => f.toLowerCase().includes(search.toLowerCase())).map((f, i) => (
                    <button key={`${cat}-${f}-${i}`} onClick={() => onFont(f)}
                      onMouseEnter={() => injectGoogleFont(f)}
                      className="group flex flex-col px-4 py-3 bg-white/5 border border-white/8 rounded-2xl hover:bg-white/10 hover:border-accent/30 transition-all text-left">
                      <span className="text-lg text-white/80 group-hover:text-white transition-colors" style={{ fontFamily: f }}>{f}</span>
                      <span className="text-[7px] font-bold uppercase tracking-widest text-white/20">{f}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'textures' && (
          <div className="space-y-6">
            {Object.entries(TEXTURE_LIBRARY).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-3 ml-1">{cat}</p>
                <div className="grid grid-cols-2 gap-3">
                  {items.map(tex => (
                    <button key={tex.name} onClick={() => onTexture(tex)}
                      className="group relative h-20 rounded-2xl border border-white/10 overflow-hidden hover:scale-105 transition-all">
                      <img src={tex.url} alt={tex.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <span className="absolute bottom-2 left-3 text-[8px] font-black uppercase tracking-widest text-white/90">{tex.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'bricolage' && (
          <div className="grid grid-cols-2 gap-3">
            {BRICOLAGE_ASSETS.map(asset => (
              <button key={asset.name} onClick={() => onBricolage(asset)}
                className="group flex flex-col items-center justify-center h-24 bg-white/5 border border-white/8 rounded-2xl hover:bg-white/10 hover:border-accent/30 transition-all">
                <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-2xl">
                  <path d={asset.path} fill={asset.color} stroke={asset.stroke} strokeWidth="1" opacity={asset.opacity} />
                </svg>
                <span className="text-[7px] font-bold uppercase tracking-widest text-white/20 group-hover:text-white/50">{asset.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MICRO HELPERS ────────────────────────────────────────────────────────────

function Tog({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return <button onClick={onToggle} className={cn('w-8 h-4 rounded-full transition-colors relative flex-shrink-0', active ? 'bg-accent' : 'bg-white/10')}><div className={cn('w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all', active ? 'left-4' : 'left-0.5')} /></button>
}

function SR({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-white/30 w-14 flex-shrink-0">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(parseInt(e.target.value))} className="flex-1 accent-accent" />
      <span className="text-[9px] text-white/40 w-6 text-right flex-shrink-0">{value}</span>
    </div>
  )
}

// ─── LAYER PANEL ─────────────────────────────────────────────────────────────

type LayerEntry = { id: string; label: string; type: string; visible: boolean; locked: boolean }
function LayerPanel({ layers, onSelect, onToggleVisible, onToggleLock, onMoveUp, onMoveDown, onDelete, onClose, inline = false }: {
  layers: LayerEntry[]; onSelect: (id: string) => void; onToggleVisible: (id: string) => void
  onToggleLock: (id: string) => void; onMoveUp: (id: string) => void; onMoveDown: (id: string) => void
  onDelete: (id: string) => void; onClose: () => void; inline?: boolean
}) {
  const typeIcon = (t: string) => {
    if (t === 'textbox') return <Type className="w-3 h-3 text-blue-400" />
    if (t === 'image') return <ImageIcon className="w-3 h-3 text-emerald-400" />
    if (t === 'polyline' || t === 'path') return <PenTool className="w-3 h-3 text-violet-400" />
    if (t === 'line') return <Minus className="w-3 h-3 text-white/50" />
    return <Square className="w-3 h-3 text-amber-400" />
  }
  return (
    <div className={inline ? "flex flex-col flex-1 overflow-hidden" : "fixed top-14 right-4 bottom-20 z-[200] w-60 bg-[#1a1a1a]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"}>
      {!inline && <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Layer</span>
        <button onClick={onClose} className="text-white/30 hover:text-white"><X className="w-3 h-3" /></button>
      </div>}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {layers.length === 0 && (
          <p className="text-center text-[9px] text-white/20 mt-8 uppercase tracking-widest">Nessun oggetto</p>
        )}
        {layers.map((l, i) => (
          <div key={l.id} className={cn('group flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.04] hover:bg-white/5 cursor-pointer transition-colors', !l.visible && 'opacity-40')}>
            <button onClick={() => onMoveUp(l.id)} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white transition-opacity"><GripVertical className="w-3 h-3 rotate-90" /></button>
            <div onClick={() => onSelect(l.id)} className="flex-1 flex items-center gap-1.5 min-w-0">
              {typeIcon(l.type)}
              <span className="text-[9px] text-white/60 truncate font-medium">{l.label}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onMoveUp(l.id)} title="Porta avanti" className="text-white/30 hover:text-white"><ChevronDown className="w-3 h-3 rotate-180" /></button>
              <button onClick={() => onMoveDown(l.id)} title="Porta indietro" className="text-white/30 hover:text-white"><ChevronDown className="w-3 h-3" /></button>
            </div>
            <button onClick={() => onToggleVisible(l.id)} className="text-white/30 hover:text-white flex-shrink-0">
              {l.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button onClick={() => onToggleLock(l.id)} className="text-white/30 hover:text-white flex-shrink-0">
              {l.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
            </button>
            <button onClick={() => onDelete(l.id)} className="text-white/20 hover:text-red-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-white/8 flex-shrink-0">
        <p className="text-[8px] text-white/20 uppercase tracking-widest">{layers.length} oggett{layers.length === 1 ? 'o' : 'i'} · ordine: alto=davanti</p>
      </div>
    </div>
  )
}

// ─── IMAGE FILTERS PANEL ──────────────────────────────────────────────────────

function ImgFxPanel({ onFilter, onPreset, onReset, onClose, activeFX = [], fxProps = {} }: {
  onFilter: (type: string, value?: number) => void
  onPreset: (p: 'vintage' | 'chrome' | 'noir' | 'glitch' | 'riso') => void
  onReset: () => void; onClose: () => void
  activeFX: string[]; fxProps: any
}) {
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [saturation, setSaturation] = useState(0)
  const [blur, setBlur] = useState(0)
  const [noise, setNoise] = useState(0)
  const [hue, setHue] = useState(0)
  const [sharpen, setSharpen] = useState(0)
  const [grain, setGrain] = useState(0)
  const [riso, setRiso] = useState(0)
  const [glitchAmt, setGlitchAmt] = useState(0)

  // High-end sync: initialize sliders from current object state
  useEffect(() => {
    if (fxProps) {
      setBrightness(fxProps.Brightness?.value ?? 0)
      setContrast(fxProps.Contrast?.value ?? 0)
      setSaturation(fxProps.Saturation?.value ?? 0)
      setBlur(fxProps.Blur?.value ?? 0)
      setNoise(fxProps.Noise?.value ?? 0)
      setHue(fxProps.HueRotation?.value ?? 0)
      setSharpen(fxProps.Sharpen?.value ?? 0)
      setGrain(fxProps.Grain?.value ?? 0)
      setRiso(fxProps.Risograph?.value ?? 0)
      setGlitchAmt(fxProps.Glitch?.value ?? 0)
    }
  }, [fxProps])

  const apply = (type: string, val: number, setter: (v: number) => void) => {
    setter(val)
    onFilter(type, val)
  }

  const IMG_PRESETS = [
    { key: 'vintage' as const, label: 'Vintage', color: '#f9ca24' },
    { key: 'chrome' as const, label: 'Chrome', color: '#a8edea' },
    { key: 'noir' as const, label: 'Noir', color: '#ddd' },
    { key: 'glitch' as const, label: 'Glitch', color: '#ff0044' },
    { key: 'riso' as const, label: 'Riso', color: '#f72585' },
  ]

  const activePreset = IMG_PRESETS.find(p => activeFX.includes(p.key === 'chrome' ? 'img-chrome' : p.key))?.key || null

  const TONES = [
    { label: 'Grigio', type: 'Grayscale' }, { label: 'Seppia', type: 'Sepia' }, { label: 'Inverti', type: 'Invert' }
  ]

  function handlePreset(key: typeof IMG_PRESETS[number]['key']) {
    onPreset(key)
  }

  function handleTone(type: string) {
    if (activeFX.includes(type)) onFilter(type, 0)
    else onFilter(type, 100)
  }

  function handleReset() {
    onReset()
  }
  return (
    <div className="fixed top-14 left-[72px] bottom-20 z-[200] w-72 bg-[#141414]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(0,255,162,0.5)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Regia Immagine</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="text-[9px] font-black text-white/25 hover:text-white uppercase tracking-widest transition-colors mr-1">Reset</button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/20 hover:text-white hover:bg-white/10 transition-all"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6">

        {/* Preset cinematici — toggle */}
        <div className="group/sec">
          <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-3 group-hover/sec:text-white/40 transition-colors">Cinematics</p>
          <div className="grid grid-cols-5 gap-1.5">
            {IMG_PRESETS.map(p => (
              <button key={p.key} onClick={() => handlePreset(p.key)}
                className={cn('flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border transition-all duration-300',
                  activePreset === p.key ? 'border-white/20 bg-white/10 shadow-lg shadow-black/20 scale-[1.05]' : 'border-white/5 hover:bg-white/5 opacity-50 hover:opacity-100')}>
                <div className={cn('w-4 h-4 rounded-full transition-all duration-500',
                  activePreset === p.key ? 'ring-4 ring-white/10 scale-110' : 'scale-90')} style={{ backgroundColor: p.color }} />
                <span className={cn('text-[7px] font-black uppercase tracking-[0.15em]', activePreset === p.key ? 'text-white' : 'text-white/30')}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Regolazioni — High Fidelity Sliders */}
        <div className="space-y-4 pt-4 border-t border-white/5 group/sec">
          <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] group-hover/sec:text-white/40 transition-colors">Adjustments</p>
          <div className="space-y-3 px-1">
            <SR label="Lux" value={brightness} min={-100} max={100} onChange={v => apply('Brightness', v, setBrightness)} />
            <SR label="Chrome" value={contrast} min={-100} max={100} onChange={v => apply('Contrast', v, setContrast)} />
            <SR label="Core" value={saturation} min={-100} max={100} onChange={v => apply('Saturation', v, setSaturation)} />
            <SR label="Tone" value={hue} min={-180} max={180} onChange={v => apply('HueRotation', v, setHue)} />
          </div>
        </div>

        {/* Effetti */}
        <div className="space-y-4 pt-4 border-t border-white/5 group/sec">
          <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] group-hover/sec:text-white/40 transition-colors">Artistic Lab</p>
          <div className="space-y-3 px-1">
            <SR label="Focus" value={blur} min={0} max={100} onChange={v => apply('Blur', v, setBlur)} />
            <SR label="Grit" value={noise} min={0} max={100} onChange={v => apply('Noise', v, setNoise)} />
            <SR label="Razor" value={sharpen} min={0} max={100} onChange={v => apply('Sharpen', v, setSharpen)} />
          </div>
        </div>

        {/* Ricerca Artistica */}
        <div className="space-y-4 pt-4 border-t border-white/5 group/sec">
          <p className="text-[8px] font-black text-accent/30 uppercase tracking-[0.3em] group-hover/sec:text-accent/60 transition-colors">Experimental</p>
          <div className="space-y-3 px-1">
            <SR label="Grain" value={grain} min={0} max={100} onChange={v => { setGrain(v); onFilter('Grain', v) }} />
            <SR label="Riso" value={riso} min={0} max={100} onChange={v => { setRiso(v); onFilter('Risograph', v) }} />
            <SR label="Glitch" value={glitchAmt} min={0} max={100} onChange={v => { setGlitchAmt(v); onFilter('Glitch', v) }} />
          </div>
        </div>

        {/* Tono — toggle */}
        <div className="pt-4 border-t border-white/5 group/sec">
          <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-3 group-hover/sec:text-white/40 transition-colors">Color Mapping</p>
          <div className="grid grid-cols-3 gap-1.5">
            {TONES.map(f => (
              <button key={f.type} onClick={() => handleTone(f.type)}
                className={cn('py-2.5 rounded-xl border text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-300',
                  activeFX.includes(f.type) ? 'bg-accent/10 border-accent/30 text-accent shadow-lg shadow-accent/5' : 'border-white/5 text-white/20 hover:bg-white/5 hover:text-white/50')}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-white/5 bg-white/[0.02]">
        <p className="text-[7px] text-white/15 uppercase tracking-[0.2em] text-center italic">Professional Grade Rendering Engine v2</p>
      </div>
    </div>
  )
}

// ─── SAVE DIALOG ─────────────────────────────────────────────────────────────

function SaveDialog({
  initialName, initialClientId, initialDescription, clients, onSave, onClose
}: {
  initialName: string
  initialClientId: string | null
  initialDescription?: string
  clients: CanvasClient[]
  onSave: (name: string, clientId: string | null, userDescription: string) => void
  onClose: () => void
}) {
  const [name, setName] = React.useState(initialName === 'Senza titolo' ? '' : initialName)
  const [clientId, setClientId] = React.useState<string>(initialClientId ?? '')
  const [userDescription, setUserDescription] = React.useState(initialDescription || '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const finalName = name.trim() || 'Senza titolo'
    onSave(finalName, clientId || null, userDescription)
  }

  return (
    <>
      <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed z-[251] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-6">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-white/70 mb-5">Salva Progetto</h3>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1.5">Nome</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome progetto..."
              className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/80 focus:outline-none focus:border-accent/40 placeholder-white/20"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1.5">Cliente (opzionale)</label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 focus:outline-none focus:border-accent/40 cursor-pointer"
            >
              <option value="">— Nessun cliente —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1.5 flex items-center justify-between">
                <span>Descrizione per l&apos;IA</span>
                <span className="text-[7px] bg-violet-500/10 text-violet-400 px-1 rounded">Semantic Brain</span>
            </label>
            <textarea
              value={userDescription}
              onChange={e => setUserDescription(e.target.value)}
              placeholder="Spiega all'IA come interpretare questo progetto..."
              className="w-full h-20 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white/60 focus:outline-none focus:border-violet-500/40 placeholder-white/10 resize-none font-medium"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-9 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-colors">
              Annulla
            </button>
            <button type="submit"
              className="flex-1 h-9 rounded-xl bg-accent text-black text-[10px] font-black uppercase tracking-widest hover:bg-accent/80 transition-colors">
              Salva
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ─── CONTEXT MENU ─────────────────────────────────────────────────────────────

function ContextMenu({ x, y, onDuplicate, onDelete, onBringForward, onSendBackward, onGroup, onClose }: {
  x: number; y: number; onDuplicate: () => void; onDelete: () => void
  onBringForward: () => void; onSendBackward: () => void; onGroup: () => void; onClose: () => void
}) {
  const items: [string, (() => void) | null, string, boolean?][] = [
    ['Duplica', onDuplicate, 'Ctrl+D'],
    ['Porta avanti', onBringForward, ']'],
    ['Porta indietro', onSendBackward, '['],
    ['Raggruppa', onGroup, 'Ctrl+G'],
    ['──────────', null, ''],
    ['Elimina', onDelete, 'Del', true],
  ]
  return (
    <>
      <div className="fixed inset-0 z-[300]" onClick={onClose} />
      <div className="fixed z-[301] bg-[#1a1a1a]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[180px]"
        style={{ left: Math.min(x, window.innerWidth - 200), top: Math.min(y, window.innerHeight - 220) }}>
        {items.map(([label, action, shortcut, danger], i) => (
          action === null
            ? <div key={i} className="h-px bg-white/8 my-1" />
            : <button key={i} onClick={action as () => void}
              className={cn('w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/8 transition-colors',
                danger ? 'text-red-400 hover:text-red-300' : 'text-white/60 hover:text-white')}>
              <span>{label}</span>
              <span className="text-[9px] text-white/20">{shortcut}</span>
            </button>
        ))}
      </div>
    </>
  )
}

// ─── RULERS ───────────────────────────────────────────────────────────────────

function Rulers({ zoom, canvas }: { zoom: number; canvas: fabric.Canvas | null }) {
  const SIZE = 20
  const w = canvas?.width || 800, h = canvas?.height || 600
  const step = zoom < 0.5 ? 100 : zoom < 1 ? 50 : zoom < 2 ? 20 : 10
  const ticks: number[] = []
  for (let i = 0; i <= Math.ceil(w / step) * step; i += step) ticks.push(i)
  const vticks: number[] = []
  for (let i = 0; i <= Math.ceil(h / step) * step; i += step) vticks.push(i)
  return (
    <>
      <div className="absolute top-12 left-5 right-0 z-[18] pointer-events-none overflow-hidden" style={{ height: SIZE }}>
        <svg width="100%" height={SIZE} className="text-white/20">
          <rect width="100%" height={SIZE} fill="#0d0d0d" />
          {ticks.map(t => (
            <g key={t} transform={`translate(${t * zoom},0)`}>
              <line x1={0} y1={SIZE * 0.6} x2={0} y2={SIZE} stroke="currentColor" strokeWidth={0.5} />
              {t % 50 === 0 && <text x={3} y={SIZE - 5} fontSize={7} fill="currentColor" fontFamily="monospace">{t}</text>}
            </g>
          ))}
        </svg>
      </div>
      <div className="absolute left-0 top-[calc(3rem+20px)] bottom-0 z-[18] pointer-events-none overflow-hidden" style={{ width: SIZE }}>
        <svg width={SIZE} height="100%" className="text-white/20">
          <rect width={SIZE} height="100%" fill="#0d0d0d" />
          {vticks.map(t => (
            <g key={t} transform={`translate(0,${t * zoom})`}>
              <line x1={SIZE * 0.6} y1={0} x2={SIZE} y2={0} stroke="currentColor" strokeWidth={0.5} />
              {t % 50 === 0 && <text x={2} y={t * zoom - 2} fontSize={7} fill="currentColor" fontFamily="monospace">{t}</text>}
            </g>
          ))}
        </svg>
      </div>
      <div className="absolute top-12 left-0 z-[19] pointer-events-none" style={{ width: SIZE, height: SIZE, backgroundColor: '#0d0d0d', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }} />
    </>
  )
}


// ─── BEZIER EDITOR OVERLAY ────────────────────────────────────────────────────
// Rendered as an absolute SVG layer over the canvas.
// All coordinates in canvas-space (zoom-aware via CSS transform scale).

interface BzOverlayProps {
  anchors: BzAnchor[]
  zoom: number
  canvas: fabric.Canvas | null
  onAnchorMove: (idx: number, x: number, y: number) => void
  onHandleMove: (idx: number, role: 'cp1' | 'cp2', x: number, y: number) => void
  onToggleCorner: (idx: number) => void
  onDone: () => void
}

function BzEditorOverlay({ anchors, zoom, canvas, onAnchorMove, onHandleMove, onToggleCorner, onDone }: BzOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef<{ type: 'anchor' | 'cp1' | 'cp2' | 'segment'; idx: number } | null>(null)

  // Convert SVG clientX/Y to canvas coords
  function toCanvas(e: React.MouseEvent | MouseEvent): { x: number; y: number } {
    const svg = svgRef.current; if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    if (!canvas) return { x: 0, y: 0 }
    const vpt = canvas.viewportTransform; if (!vpt) return { x: 0, y: 0 }
    // Correct for zoom AND pan (vpt[4], vpt[5])
    return {
      x: (e.clientX - rect.left - vpt[4]) / vpt[0],
      y: (e.clientY - rect.top - vpt[5]) / vpt[3]
    }
  }

  function onMouseDown(type: 'anchor' | 'cp1' | 'cp2' | 'segment', idx: number, e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault()
    const p = toCanvas(e)

    if (type === 'segment') {
      // Find exact hit point on segment to insert new anchor
      const hit = closestOnBzPath(anchors, p.x, p.y)
      if (hit.dist < 20) {
        const newAnchors = insertAnchorAt(anchors, hit)
        // Trigger update to parent with the new points, and start dragging the NEW anchor
        // hit.segIdx + 1 is the index of the newly inserted anchor
        onAnchorMove(hit.segIdx + 1, p.x, p.y)
        dragging.current = { type: 'anchor', idx: hit.segIdx + 1 }
      }
    } else {
      dragging.current = { type, idx }
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return
    const { type, idx } = dragging.current
    let { x, y } = toCanvas(e)

    if (type === 'anchor') {
      // Snap to grid/objects if canvas is available
      if (canvas) {
        const snap = findSnapPoint(canvas, x, y)
        if (snap) { x = snap.x; y = snap.y }
      }
      onAnchorMove(idx, x, y)
    } else if (type === 'cp1' || type === 'cp2') {
      onHandleMove(idx, type, x, y)
    }
  }

  function onMouseUp() { dragging.current = null }

  // Convert canvas space to screen space for SVG rendering
  function toS(cx: number, cy: number) {
    if (!canvas) return { x: cx * zoom, y: cy * zoom }
    const vpt = canvas.viewportTransform; if (!vpt) return { x: cx * zoom, y: cy * zoom }
    return { x: cx * vpt[0] + vpt[4], y: cy * vpt[3] + vpt[5] }
  }

  const A = 7   // anchor square half-size
  const HR = 5   // handle circle radius

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 z-[25] w-full h-full"
      style={{ marginTop: 64, cursor: 'crosshair' }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Hit-testable segments (invisible paths for clicking) */}
      {anchors.map((_, i) => {
        if (i === anchors.length - 1) return null
        const a = anchors[i], b = anchors[i + 1]
        const pa = toS(a.x, a.y), pb = toS(b.x, b.y)
        const pcp2 = toS(a.cp2x, a.cp2y), pcp1 = toS(b.cp1x, b.cp1y)
        const d = `M ${pa.x} ${pa.y} C ${pcp2.x} ${pcp2.y} ${pcp1.x} ${pcp1.y} ${pb.x} ${pb.y}`
        return (
          <path key={`seg${i}`} d={d} fill="none" stroke="transparent" strokeWidth={16}
            style={{ cursor: 'copy' }}
            onMouseDown={e => onMouseDown('segment', i, e)} />
        )
      })}

      {/* Handle stems + circles */}
      {anchors.map((a, i) => {
        const pa = toS(a.x, a.y), p1 = toS(a.cp1x, a.cp1y), p2 = toS(a.cp2x, a.cp2y)
        return (
          <g key={`h${i}`}>
            {(a.cp1x !== a.x || a.cp1y !== a.y) && (
              <>
                <line x1={pa.x} y1={pa.y} x2={p1.x} y2={p1.y}
                  stroke="rgba(99,102,241,0.5)" strokeWidth={1} strokeDasharray="3 2" />
                <circle cx={p1.x} cy={p1.y} r={HR}
                  fill="#6366f1" stroke="#fff" strokeWidth={1.5} style={{ cursor: 'grab' }}
                  onMouseDown={e => onMouseDown('cp1', i, e)} />
              </>
            )}
            {(a.cp2x !== a.x || a.cp2y !== a.y) && (
              <>
                <line x1={pa.x} y1={pa.y} x2={p2.x} y2={p2.y}
                  stroke="rgba(99,102,241,0.5)" strokeWidth={1} strokeDasharray="3 2" />
                <circle cx={p2.x} cy={p2.y} r={HR}
                  fill="#6366f1" stroke="#fff" strokeWidth={1.5} style={{ cursor: 'grab' }}
                  onMouseDown={e => onMouseDown('cp2', i, e)} />
              </>
            )}
          </g>
        )
      })}

      {/* Anchor squares */}
      {anchors.map((a, i) => {
        const p = toS(a.x, a.y)
        return (
          <g key={`a${i}`}>
            <rect
              x={p.x - A} y={p.y - A} width={A * 2} height={A * 2}
              fill={a.corner ? '#1a1a1a' : '#ffffff'}
              stroke={a.corner ? '#ffffff' : '#6366f1'}
              strokeWidth={1.5} rx={1}
              style={{ cursor: 'move' }}
              onMouseDown={e => onMouseDown('anchor', i, e)}
              onDoubleClick={e => { e.stopPropagation(); onToggleCorner(i) }}
            />
          </g>
        )
      })}

      {/* Control overlay label */}
      <foreignObject x={8} y={8} width={120} height={32}>
        <button onClick={onDone}
          className="px-3 py-1.5 bg-accent text-black text-[9px] font-black uppercase tracking-widest rounded-lg shadow-xl hover:scale-105 transition-transform">
          Fine [Enter]
        </button>
      </foreignObject>
    </svg>
  )
}


