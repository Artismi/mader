import * as fabric from 'fabric';
import { getStroke } from 'perfect-freehand';

/**
 * Custom Brush Collection for Creative Studio
 */

export const BRUSH_TYPES = {
  PENCIL: 'pencil',
  SPRAY: 'spray',
  CRAYON: 'crayon',
  INK: 'ink',
  MARKER: 'marker',
  GENERATIVE: 'generative',
  LIQUID: 'liquid',
  GLOW: 'glow',
  NEON: 'neon',
  CHARCOAL: 'charcoal',
  WATERCOLOR: 'watercolor',
  DOTTED: 'dotted',
  DASHED: 'dashed',
  CHROME: 'chrome',
  INK_BLEED: 'ink_bleed',
  THORN: 'thorn',
  GLITCH: 'glitch',
  CALLIGRAPHY: 'calligraphy'
};

// --- LIQUID GLITCH BRUSH ---
export function createGlitchBrush(canvas: fabric.Canvas) {
  const brush = new fabric.PencilBrush(canvas);
  brush.width = 15;
  brush.color = '#00ff00';
  (brush as any).isGlitch = true;
  return brush;
}

// --- CALLIGRAPHY BRUSH (Flat/Expressive) ---
export class CalligraphyBrush extends fabric.PencilBrush {
  _finalizeAndAddPath() {
    const ctx = (this.canvas as any).contextTop as CanvasRenderingContext2D | null;
    if (ctx) ctx.clearRect(0, 0, (this.canvas as any).width, (this.canvas as any).height);

    const pathData = this._getfreeDrawingPathData();
    const path = new fabric.Path(pathData, {
      fill: 'transparent',
      stroke: this.color,
      strokeWidth: this.width,
      strokeLineCap: 'square',
      strokeLineJoin: 'miter',
      miterLimit: 2
    });
    
    // Distort the path to simulate a flat nib
    path.set({
      scaleX: 1.5,
      scaleY: 0.5,
      angle: 45
    });

    (this.canvas as any).fire('before:path:created', { path });
    this.canvas.add(path);
    (this.canvas as any).fire('path:created', { path });
    this.canvas.requestRenderAll();
    this._resetShadow();
  }
}


// --- GLOW BRUSH ---
export function createGlowBrush(canvas: fabric.Canvas) {
  const brush = new fabric.PencilBrush(canvas);
  brush.width = 20;
  brush.shadow = new fabric.Shadow({
    blur: 30,
    offsetX: 0,
    offsetY: 0,
    color: 'rgba(255, 255, 255, 0.8)'
  });
  return brush;
}

// --- NEON BRUSH ---
export function createNeonBrush(canvas: fabric.Canvas) {
  const brush = new fabric.PencilBrush(canvas);
  brush.width = 8;
  brush.shadow = new fabric.Shadow({
    blur: 15,
    offsetX: 0,
    offsetY: 0,
    color: '#00ffff'
  });
  return brush;
}

// --- CHARCOAL BRUSH ---
export function createCharcoalBrush(canvas: fabric.Canvas) {
  const brush = new fabric.PatternBrush(canvas);
  brush.width = 12;
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = 20; patternCanvas.height = 20;
  const ctx = patternCanvas.getContext('2d')!;
  ctx.fillStyle = '#111111';
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 20;
    const y = Math.random() * 20;
    const s = Math.random() * 1.2;
    ctx.globalAlpha = Math.random() * 0.5;
    ctx.fillRect(x, y, s, s);
  }
  brush.source = patternCanvas;
  return brush;
}

// --- WATERCOLOR BRUSH ---
export function createWatercolorBrush(canvas: fabric.Canvas) {
  const brush = new fabric.PatternBrush(canvas);
  brush.width = 40;
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = 100; patternCanvas.height = 100;
  const ctx = patternCanvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(50, 50, 0, 50, 50, 50);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 100, 100);
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 100, Math.random() * 100, Math.random() * 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fill();
  }
  brush.source = patternCanvas;
  return brush;
}

// --- DOTTED/DASHED ---
export function createDottedBrush(canvas: fabric.Canvas) {
  const brush = new fabric.PencilBrush(canvas);
  brush.width = 4;
  brush.strokeDashArray = [1, 8];
  return brush;
}
export function createDashedBrush(canvas: fabric.Canvas) {
  const brush = new fabric.PencilBrush(canvas);
  brush.width = 4;
  brush.strokeDashArray = [12, 8];
  return brush;
}

// --- CRAYON ---
export function createCrayonBrush(canvas: fabric.Canvas) {
  const brush = new fabric.PatternBrush(canvas);
  brush.width = 10;
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = 10; patternCanvas.height = 10;
  const ctx = patternCanvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 10; const y = Math.random() * 10; const s = Math.random() * 1.5;
    ctx.globalAlpha = Math.random(); ctx.fillRect(x, y, s, s);
  }
  brush.source = patternCanvas;
  return brush;
}

// --- SPRAY ---
export function createSprayBrush(canvas: fabric.Canvas) {
  const brush = new fabric.SprayBrush(canvas);
  brush.width = 15; brush.density = 20; brush.dotWidth = 2; brush.dotWidthVariance = 1;
  return brush;
}

// --- MARKER ---
export function createMarkerBrush(canvas: fabric.Canvas) {
  const brush = new fabric.PencilBrush(canvas);
  brush.width = 30; brush.color = 'rgba(255, 255, 0, 0.4)';
  return brush;
}

// --- INK ---
export function createInkBrush(canvas: fabric.Canvas) {
  const brush = new fabric.PencilBrush(canvas);
  brush.width = 5; brush.decimate = 2;
  return brush;
}

// --- GENERATIVE ---
export function createGenerativeBrush(canvas: fabric.Canvas) {
  const brush = new fabric.PencilBrush(canvas);
  brush.width = 4;
  brush.shadow = new fabric.Shadow({ blur: 15, offsetX: 0, offsetY: 0, color: 'white' });
  return brush;
}

// --- CHROME BRUSH (Metal) ---
export function createChromeBrush(canvas: fabric.Canvas) {
  const brush = new fabric.PencilBrush(canvas);
  brush.width = 15;
  brush.color = '#c0c0c0';
  (brush as any).isChrome = true;
  return brush;
}

// ─── ADVANCED LIQUID ENGINE ───────────────────────────────────────────────────

export interface LiquidOptions {
  size?: number;
  thinning?: number;
  smoothing?: number;
  streamline?: number;
  simulatePressure?: boolean;
}

function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';
  const d: (string | number)[] = ['M', stroke[0][0], stroke[0][1], 'Q'];
  for (let i = 0; i < stroke.length - 1; i++) {
    const [x0, y0] = stroke[i]; const [x1, y1] = stroke[i + 1];
    d.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  d.push('Z');
  return d.join(' ');
}

export class LiquidBrush extends fabric.PencilBrush {
  protected _liquidPoints: [number, number, number][] = []  // x, y, pressure
  protected _liquidOptions: LiquidOptions

  // Pro Brush Dynamics (updated live by creative-studio.tsx via updateProParams)
  thinning   = 0.6
  smoothing  = 0.5
  streamline = 0.5
  taperStart = 0
  taperEnd   = 0
  jitter     = 0
  simulatePressure = true

  constructor(canvas: fabric.Canvas, options: LiquidOptions = {}) {
    super(canvas)
    this._liquidOptions = { size: 10, thinning: 0.6, smoothing: 0.5, streamline: 0.5, simulatePressure: true, ...options }
    // Sync initial options to Pro fields
    if (options.thinning   !== undefined) this.thinning   = options.thinning
    if (options.smoothing  !== undefined) this.smoothing  = options.smoothing
    if (options.streamline !== undefined) this.streamline = options.streamline
  }

  /** Called by creative-studio.tsx after setting thinning/smoothing/streamline/etc. */
  updateProParams() {
    // All params already live on `this` directly — nothing extra needed
  }

  onMouseDown(pointer: fabric.Point, options: any) {
    const pressure = options?.e?.pressure ?? 0.5
    this._liquidPoints = [[pointer.x, pointer.y, pressure]]
    super.onMouseDown(pointer, options)
  }

  onMouseMove(pointer: fabric.Point, options: any) {
    const pressure = options?.e?.pressure ?? 0.5
    // Apply jitter to position if set
    const jx = this.jitter > 0 ? (Math.random() - 0.5) * this.jitter * 10 : 0
    const jy = this.jitter > 0 ? (Math.random() - 0.5) * this.jitter * 10 : 0
    this._liquidPoints.push([pointer.x + jx, pointer.y + jy, pressure])
    super.onMouseMove(pointer, options)
  }

  _finalizeAndAddPath() {
    const ctx = (this.canvas as any).contextTop as CanvasRenderingContext2D | null
    if (ctx) ctx.clearRect(0, 0, (this.canvas as any).width, (this.canvas as any).height)
    if (this._liquidPoints.length < 2) { this.canvas.requestRenderAll(); this._liquidPoints = []; return }

    const stroke = getStroke(this._liquidPoints, {
      size:             this.width,
      thinning:         this.thinning,
      smoothing:        this.smoothing,
      streamline:       this.streamline,
      simulatePressure: this.simulatePressure,
      ...(this.taperStart > 0 || this.taperEnd > 0
        ? { start: { taper: this.taperStart * 100, cap: true }, end: { taper: this.taperEnd * 100, cap: true } }
        : {}),
    })

    const svgPath = getSvgPathFromStroke(stroke)
    if (!svgPath) { this.canvas.requestRenderAll(); this._liquidPoints = []; return }

    const path = new fabric.Path(svgPath, { fill: this.color, stroke: undefined, strokeWidth: 0 });
    if ((this as any).isDeepInk) {
      path.set({ shadow: new fabric.Shadow({ blur: 15, color: this.color, offsetX: 0, offsetY: 0 }), opacity: 0.94 })
    }
    ;(this.canvas as any).fire('before:path:created', { path })
    this.canvas.add(path)
    ;(this.canvas as any).fire('path:created', { path })
    this.canvas.requestRenderAll()
    ;(this.canvas as any).setCoords?.()
    this._liquidPoints = []
  }
}

export class DeepInkBrush extends LiquidBrush {
  constructor(canvas: fabric.Canvas) {
    super(canvas, { thinning: 0.7, smoothing: 0.6, streamline: 0.4 })
    this.width = 12; this.color = '#1a0a2e'; (this as any).isDeepInk = true
  }
}

export class ToxicThornBrush extends LiquidBrush {
  constructor(canvas: fabric.Canvas) {
    super(canvas, { thinning: -0.8, smoothing: 0.3, streamline: 0.7 })
    this.width = 6; this.color = '#2d004d'
  }
}
