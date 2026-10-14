/**
 * Ritocco foto come in Photoshop, con pennelli che lavorano sui pixel
 * dell'immagine selezionata:
 * - Timbro clone (Alt+clic sceglie l'origine, poi si dipinge; allineato)
 * - Correttivo al volo: si dipinge sul difetto, al rilascio la zona viene
 *   ricostruita dai dintorni mantenendo la grana
 * - Scherma / Brucia (ombre, mezzitoni, luci), Sfumino, Sfoca, Nitidezza
 * - Maschera dipinta: nascondi / mostra, non distruttiva (clipPath raster)
 * - Bacchetta magica: selezione per colore (Maiusc aggiunge, Alt toglie);
 *   la selezione limita i pennelli e si può eliminare, invertire, trasformare
 *   in maschera o copiare in un nuovo livello
 *
 * Ogni pennellata è un passo di cronologia (object:modified a fine tratto).
 */
import * as fabric from 'fabric'

export type RetouchTool = 'clone' | 'heal' | 'dodge' | 'burn' | 'smudge' | 'blur' | 'sharpen' | 'mask-hide' | 'mask-show' | 'wand'
export type ToneRange = 'shadows' | 'mids' | 'highlights'
export interface RetouchOpts {
  size: number        // diametro a schermo, px
  hardness: number    // 0–100
  strength: number    // 0–100
  range: ToneRange
  tolerance: number   // bacchetta, 0–255
  contiguous: boolean
}
export const DEFAULT_OPTS: RetouchOpts = { size: 60, hardness: 40, strength: 60, range: 'mids', tolerance: 32, contiguous: true }

type MaskImg = fabric.FabricImage & { isPaintMask?: boolean }
const ACCENT = '#7C3AED'

// ── utilità sui pixel ───────────────────────────────────────────────────────

function falloff(t: number, hardness: number) {
  if (t >= 1) return 0
  if (t <= hardness) return 1
  const u = (t - hardness) / (1 - hardness)
  return 1 - u * u * (3 - 2 * u)
}

/** Sfocatura a scatola separabile su una zona (x0,y0,w,h) dei pixel RGBA; restituisce i canali in Float32. */
function boxBlur(src: Uint8ClampedArray, W: number, x0: number, y0: number, w: number, h: number, r: number, passes = 2) {
  const a = new Float32Array(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = ((y0 + y) * W + x0 + x) * 4, d = (y * w + x) * 4
    a[d] = src[s]; a[d + 1] = src[s + 1]; a[d + 2] = src[s + 2]; a[d + 3] = src[s + 3]
  }
  const b = new Float32Array(a.length)
  const pass = (from: Float32Array, to: Float32Array, horiz: boolean) => {
    const n = horiz ? w : h, m = horiz ? h : w
    for (let j = 0; j < m; j++) for (let ch = 0; ch < 4; ch++) {
      const at = (i: number) => (horiz ? (j * w + i) : (i * w + j)) * 4 + ch
      let sum = 0, cnt = 0
      for (let i = -r; i <= r; i++) if (i >= 0 && i < n) { sum += from[at(i)]; cnt++ }
      for (let i = 0; i < n; i++) {
        to[at(i)] = sum / cnt
        const out = i - r, inn = i + r + 1
        if (out >= 0) { sum -= from[at(out)]; cnt-- }
        if (inn < n) { sum += from[at(inn)]; cnt++ }
      }
    }
  }
  for (let p = 0; p < passes; p++) { pass(a, b, true); pass(b, a, false) }
  return a
}

/**
 * Ricostruzione "push-pull": i pixel sconosciuti prendono il valore della media
 * pesata dei dintorni, risalendo da una piramide di versioni ridotte.
 */
function pushPull(vals: Float32Array, known: Float32Array, w: number, h: number): Float32Array {
  if (w <= 1 && h <= 1) return vals
  const W2 = Math.max(1, Math.ceil(w / 2)), H2 = Math.max(1, Math.ceil(h / 2))
  const v2 = new Float32Array(W2 * H2 * 4), k2 = new Float32Array(W2 * H2)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, j = (y >> 1) * W2 + (x >> 1), k = known[i]
    if (!k) continue
    k2[j] += k
    for (let c = 0; c < 4; c++) v2[j * 4 + c] += vals[i * 4 + c] * k
  }
  for (let j = 0; j < W2 * H2; j++) if (k2[j]) { for (let c = 0; c < 4; c++) v2[j * 4 + c] /= k2[j]; k2[j] = Math.min(1, k2[j]) }
  const coarse = (W2 === w && H2 === h) ? v2 : pushPull(v2, k2, W2, H2)
  const out = new Float32Array(vals.length)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, k = known[i]
    // valore dal livello ridotto, interpolato in modo bilineare
    const fx = Math.min(W2 - 1, Math.max(0, (x - 0.5) / 2)), fy = Math.min(H2 - 1, Math.max(0, (y - 0.5) / 2))
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(W2 - 1, x0 + 1), y1 = Math.min(H2 - 1, y0 + 1), tx = fx - x0, ty = fy - y0
    for (let c = 0; c < 4; c++) {
      const g = (xx: number, yy: number) => coarse[(yy * W2 + xx) * 4 + c]
      const up = (g(x0, y0) * (1 - tx) + g(x1, y0) * tx) * (1 - ty) + (g(x0, y1) * (1 - tx) + g(x1, y1) * tx) * ty
      out[i * 4 + c] = vals[i * 4 + c] * k + up * (1 - k)
    }
  }
  return out
}

// ── sessione ────────────────────────────────────────────────────────────────

interface Dirty { x0: number; y0: number; x1: number; y1: number }

export class RetouchSession {
  readonly canvas: fabric.Canvas
  readonly img: fabric.FabricImage
  tool: RetouchTool = 'clone'
  opts: RetouchOpts = { ...DEFAULT_OPTS }
  onChange: (msg?: string) => void = () => {}

  private work: HTMLCanvasElement
  private wctx: CanvasRenderingContext2D
  private data: ImageData
  private W: number
  private H: number
  private sel: Uint8Array | null = null
  private selOverlay: HTMLCanvasElement | null = null
  private cloneSrc: fabric.Point | null = null
  private cloneOff: fabric.Point | null = null
  private snapshot: Uint8ClampedArray | null = null
  private carried: Float32Array | null = null
  private healMask: Float32Array | null = null
  private last: fabric.Point | null = null
  private down = false
  private dirty: Dirty | null = null
  private changed = false
  private pointer: fabric.Point | null = null // scena
  private mask: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; data: ImageData; clip: MaskImg } | null = null
  private saved: { skip: boolean; selection: boolean; hasControls: boolean; lockX: boolean; lockY: boolean; hoverCursor: string | null }
  private off: () => void = () => {}

  constructor(canvas: fabric.Canvas, img: fabric.FabricImage) {
    this.canvas = canvas
    this.img = img
    const el = ((img as unknown as { _originalElement?: HTMLImageElement })._originalElement ?? img.getElement()) as HTMLImageElement
    this.W = el.naturalWidth || el.width; this.H = el.naturalHeight || el.height
    this.work = document.createElement('canvas')
    this.work.width = this.W; this.work.height = this.H
    this.wctx = this.work.getContext('2d', { willReadFrequently: true })!
    this.wctx.drawImage(el, 0, 0)
    this.data = this.wctx.getImageData(0, 0, this.W, this.H)
    this.saved = {
      skip: canvas.skipTargetFind, selection: canvas.selection, hasControls: img.hasControls,
      lockX: img.lockMovementX, lockY: img.lockMovementY, hoverCursor: canvas.hoverCursor,
    }
    this.install()
  }

  // ── coordinate ──
  /** Scena → pixel dell'immagine intera (prima del ritaglio). */
  private toPx(p: fabric.Point) {
    const l = fabric.util.transformPoint(p, fabric.util.invertTransform(this.img.calcTransformMatrix()))
    return new fabric.Point(l.x + this.img.width / 2 + this.img.cropX, l.y + this.img.height / 2 + this.img.cropY)
  }
  /** Raggio del pennello in pixel dell'immagine. */
  private radius() {
    const s = this.img.getObjectScaling()
    return Math.max(1, (this.opts.size / 2) / (Math.max(Math.abs(s.x), Math.abs(s.y)) * this.canvas.getZoom()))
  }

  // ── installazione ──
  private install() {
    const c = this.canvas
    c.skipTargetFind = true
    c.selection = false
    c.hoverCursor = 'crosshair'
    this.img.set({ hasControls: false, lockMovementX: true, lockMovementY: true })
    const onDown = (e: fabric.TPointerEventInfo) => this.pointerDown(e)
    const onMove = (e: fabric.TPointerEventInfo) => this.pointerMove(e)
    const onUp = () => this.pointerUp()
    const onRender = () => this.drawOverlay()
    const onRestore = () => { this.off(); this.onChange('ended') } // annulla: l'immagine è stata ricreata
    // un clic nel vuoto toglierebbe la selezione (e chiuderebbe il ritocco): l'immagine resta attiva
    const onCleared = () => { if (c.getObjects().includes(this.img)) c.setActiveObject(this.img) }
    c.on('mouse:down', onDown); c.on('mouse:move', onMove); c.on('mouse:up', onUp)
    c.on('after:render', onRender)
    c.on('history:restored' as never, onRestore)
    c.on('selection:cleared', onCleared)
    this.off = () => {
      c.off('mouse:down', onDown); c.off('mouse:move', onMove); c.off('mouse:up', onUp)
      c.off('after:render', onRender); c.off('history:restored' as never, onRestore); c.off('selection:cleared', onCleared)
      this.off = () => {}
    }
    c.setActiveObject(this.img)
    c.requestRenderAll()
  }

  configure(tool: RetouchTool, opts: RetouchOpts) {
    this.tool = tool
    this.opts = { ...opts }
    this.canvas.requestRenderAll()
  }

  end() {
    this.off()
    const c = this.canvas
    c.skipTargetFind = this.saved.skip
    c.selection = this.saved.selection
    c.hoverCursor = this.saved.hoverCursor ?? 'move'
    this.img.set({ hasControls: this.saved.hasControls, lockMovementX: this.saved.lockX, lockMovementY: this.saved.lockY })
    this.img.setCoords()
    c.requestRenderAll()
  }

  get hasSelection() { return !!this.sel }
  get hasCloneSource() { return !!this.cloneSrc }
  get hasMask() { return !!(this.img.clipPath as MaskImg | undefined)?.isPaintMask }

  // ── puntatore ──
  private inSel(i: number) { return this.sel ? this.sel[i] / 255 : 1 }

  private pointerDown(e: fabric.TPointerEventInfo) {
    const ev = e.e as MouseEvent
    if ((ev as MouseEvent).button === 2) return
    const p = this.toPx(e.scenePoint)
    if (this.tool === 'wand') { this.wand(p, ev.shiftKey ? 'add' : ev.altKey ? 'sub' : 'new'); return }
    if (this.tool === 'clone' && ev.altKey) {
      this.cloneSrc = p; this.cloneOff = null
      this.onChange('Origine del timbro impostata: ora dipingi dove vuoi copiare.')
      this.canvas.requestRenderAll()
      return
    }
    if (this.tool === 'clone' && !this.cloneSrc) { this.onChange('Prima Alt+clic sul punto da copiare.'); return }
    if (this.tool.startsWith('mask') && !this.ensureMask()) return
    this.down = true
    this.changed = false
    this.dirty = null
    this.snapshot = this.tool === 'clone' ? this.data.data.slice() : null
    this.carried = null
    this.healMask = this.tool === 'heal' ? new Float32Array(this.W * this.H) : null
    if (this.tool === 'clone' && !this.cloneOff) this.cloneOff = this.cloneSrc!.subtract(p) // allineato: l'offset resta
    this.last = p
    this.dab(p)
    this.flush()
  }

  private pointerMove(e: fabric.TPointerEventInfo) {
    this.pointer = e.scenePoint
    if (!this.down || !this.last) { this.canvas.requestRenderAll(); return }
    const p = this.toPx(e.scenePoint)
    const r = this.radius(), step = Math.max(1, r * (this.tool === 'smudge' ? 0.12 : 0.25))
    const d = p.distanceFrom(this.last)
    if (d < step) { this.canvas.requestRenderAll(); return }
    const n = Math.floor(d / step)
    for (let i = 1; i <= n; i++) this.dab(this.last.lerp(p, (i * step) / d))
    this.last = this.last.lerp(p, (n * step) / d)
    this.flush()
  }

  private pointerUp() {
    if (!this.down) return
    this.down = false
    if (this.tool === 'heal' && this.healMask) this.heal()
    this.snapshot = null; this.carried = null; this.healMask = null
    this.flush(true)
  }

  // ── pennellata ──
  private dab(c: fabric.Point) {
    const r = this.radius(), hard = this.opts.hardness / 100, k = this.opts.strength / 100
    const x0 = Math.max(0, Math.floor(c.x - r)), y0 = Math.max(0, Math.floor(c.y - r))
    const x1 = Math.min(this.W - 1, Math.ceil(c.x + r)), y1 = Math.min(this.H - 1, Math.ceil(c.y + r))
    if (x0 > x1 || y0 > y1) return
    const D = this.data.data, W = this.W
    const mark = () => {
      this.changed = true
      const d = this.dirty
      this.dirty = d ? { x0: Math.min(d.x0, x0), y0: Math.min(d.y0, y0), x1: Math.max(d.x1, x1), y1: Math.max(d.y1, y1) } : { x0, y0, x1, y1 }
    }

    if (this.tool === 'mask-hide' || this.tool === 'mask-show') {
      const m = this.mask!
      const target = this.tool === 'mask-show' ? 255 : 0
      const ox = this.img.cropX, oy = this.img.cropY, MW = m.canvas.width, MH = m.canvas.height
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const mx = Math.round(x - ox), my = Math.round(y - oy)
        if (mx < 0 || my < 0 || mx >= MW || my >= MH) continue
        const w = falloff(Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) / r, hard) * k * this.inSel(y * W + x)
        if (!w) continue
        const i = (my * MW + mx) * 4 + 3
        m.data.data[i] += (target - m.data.data[i]) * w
      }
      mark()
      return
    }

    if (this.tool === 'heal') {
      const M = this.healMask!
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const w = falloff(Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) / r, hard) * this.inSel(y * W + x)
        const i = y * W + x
        if (w > M[i]) M[i] = w
      }
      mark()
      return
    }

    const bw = x1 - x0 + 1, bh = y1 - y0 + 1
    let blurred: Float32Array | null = null
    if (this.tool === 'blur' || this.tool === 'sharpen') blurred = boxBlur(D, W, x0, y0, bw, bh, Math.max(1, Math.round(r / 6)))
    if (this.tool === 'smudge' && !this.carried) {
      // il colore preso sotto al primo tocco viene trascinato
      this.carried = new Float32Array(Math.ceil(2 * r + 2) ** 2 * 4)
      this.sampleCarried(c, r)
      return
    }
    const R = Math.ceil(2 * r + 2)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * W + x, p = i * 4
      const w = falloff(Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) / r, hard) * this.inSel(i)
      if (!w) continue
      switch (this.tool) {
        case 'clone': {
          const sx = Math.round(x + this.cloneOff!.x), sy = Math.round(y + this.cloneOff!.y)
          if (sx < 0 || sy < 0 || sx >= W || sy >= this.H) break
          const s = (sy * W + sx) * 4, S = this.snapshot!, a = w * k
          for (let ch = 0; ch < 4; ch++) D[p + ch] += (S[s + ch] - D[p + ch]) * a
          break
        }
        case 'dodge': case 'burn': {
          const l = (0.2126 * D[p] + 0.7152 * D[p + 1] + 0.0722 * D[p + 2]) / 255
          const tw = this.opts.range === 'shadows' ? (1 - l) ** 2 : this.opts.range === 'highlights' ? l * l : 4 * l * (1 - l)
          const a = w * k * 0.12 * (0.25 + tw)
          for (let ch = 0; ch < 3; ch++) D[p + ch] = this.tool === 'dodge' ? D[p + ch] + (255 - D[p + ch]) * a : D[p + ch] * (1 - a)
          break
        }
        case 'blur': case 'sharpen': {
          const b = ((y - y0) * bw + (x - x0)) * 4
          for (let ch = 0; ch < 3; ch++) {
            const v = this.tool === 'blur' ? D[p + ch] + (blurred![b + ch] - D[p + ch]) * w * k
              : D[p + ch] + (D[p + ch] - blurred![b + ch]) * w * k * 0.6
            D[p + ch] = v
          }
          break
        }
        case 'smudge': {
          const cx = Math.round(x - c.x + R / 2), cy = Math.round(y - c.y + R / 2)
          if (cx < 0 || cy < 0 || cx >= R || cy >= R) break
          const q = (cy * R + cx) * 4, C = this.carried!, a = w * (0.35 + 0.6 * k)
          for (let ch = 0; ch < 4; ch++) { D[p + ch] += (C[q + ch] - D[p + ch]) * a; C[q + ch] = D[p + ch] }
          break
        }
      }
    }
    mark()
  }

  private sampleCarried(c: fabric.Point, r: number) {
    const R = Math.ceil(2 * r + 2), C = this.carried!, D = this.data.data
    for (let cy = 0; cy < R; cy++) for (let cx = 0; cx < R; cx++) {
      const x = Math.round(c.x - R / 2 + cx), y = Math.round(c.y - R / 2 + cy)
      if (x < 0 || y < 0 || x >= this.W || y >= this.H) continue
      const s = (y * this.W + x) * 4, q = (cy * R + cx) * 4
      for (let ch = 0; ch < 4; ch++) C[q + ch] = D[s + ch]
    }
  }

  /** Correttivo: ricostruisce la zona dipinta dai dintorni, poi riporta la grana presa poco più in là. */
  private heal() {
    const M = this.healMask!, W = this.W, H = this.H, D = this.data.data
    let x0 = W, y0 = H, x1 = -1, y1 = -1
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (M[y * W + x] > 0.02) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
    }
    if (x1 < 0) return
    const pad = Math.ceil(this.radius())
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad)
    const w = x1 - x0 + 1, h = y1 - y0 + 1
    const vals = new Float32Array(w * h * 4), known = new Float32Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y0 + y) * W + x0 + x, j = y * w + x
      known[j] = M[i] > 0.02 ? 0 : 1
      for (let c = 0; c < 4; c++) vals[j * 4 + c] = D[i * 4 + c]
    }
    const fill = pushPull(vals, known, w, h)
    // grana: dettaglio fine di una zona vicina intatta (la prima delle 8 direzioni che va bene)
    const dist = Math.max(w, h)
    let off: [number, number] | null = null
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const ox = dx * dist, oy = dy * dist
      if (x0 + ox < 0 || y0 + oy < 0 || x1 + ox >= W || y1 + oy >= H) continue
      off = [ox, oy]; break
    }
    const detail = off ? boxBlur(D, W, x0 + off[0], y0 + off[1], w, h, Math.max(1, Math.round(pad / 4)), 1) : null
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y0 + y) * W + x0 + x, j = y * w + x, a = M[i]
      if (a <= 0) continue
      for (let c = 0; c < 3; c++) {
        let v = fill[j * 4 + c]
        if (detail && off) v += D[((y0 + y + off[1]) * W + x0 + x + off[0]) * 4 + c] - detail[j * 4 + c]
        D[i * 4 + c] += (v - D[i * 4 + c]) * a
      }
    }
    this.dirty = { x0, y0, x1, y1 }
    this.changed = true
  }

  /** Copia i pixel modificati sull'immagine; a fine tratto registra il passo. */
  private flush(final = false) {
    const d = this.dirty
    if (d) {
      if (this.tool.startsWith('mask') && this.mask) {
        const m = this.mask
        m.ctx.putImageData(m.data, 0, 0)
        m.clip.set('dirty', true)
      } else if (this.tool !== 'heal' || final) {
        this.wctx.putImageData(this.data, 0, 0, d.x0, d.y0, d.x1 - d.x0 + 1, d.y1 - d.y0 + 1)
        const img = this.img as unknown as { _element: HTMLCanvasElement; _originalElement: HTMLCanvasElement }
        img._element = this.work; img._originalElement = this.work
      }
      this.img.set('dirty', true)
      this.dirty = null
    }
    if (final && this.changed) {
      if (!this.tool.startsWith('mask')) {
        // con i filtri attivi l'immagine va rifiltrata dalla nuova sorgente
        this.img.setElement(this.work, { width: this.img.width, height: this.img.height })
      }
      this.canvas.fire('object:modified', { target: this.img })
      this.changed = false
    }
    this.canvas.requestRenderAll()
  }

  // ── maschera ──
  private ensureMask(): boolean {
    if (this.mask) return true
    const cp = this.img.clipPath as MaskImg | undefined
    if (cp && !cp.isPaintMask) { this.onChange('L’immagine ha già una maschera di ritaglio: rilasciala prima.'); return false }
    const w = Math.max(1, Math.round(this.img.width)), h = Math.max(1, Math.round(this.img.height))
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    if (cp?.isPaintMask) ctx.drawImage(cp.getElement(), 0, 0, w, h)
    else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h) }
    const clip = new fabric.FabricImage(canvas, { left: 0, top: 0, originX: 'center', originY: 'center', objectCaching: false }) as MaskImg
    clip.isPaintMask = true
    this.img.set('clipPath', clip)
    this.mask = { canvas, ctx, data: ctx.getImageData(0, 0, w, h), clip }
    return true
  }

  /** Toglie la maschera dipinta (tutta l'immagine torna visibile). */
  removeMask() {
    if (!this.hasMask) return
    this.img.set('clipPath', undefined)
    this.mask = null
    this.img.set('dirty', true)
    this.canvas.fire('object:modified', { target: this.img })
    this.canvas.requestRenderAll()
  }

  /** Applica la maschera ai pixel (diventano trasparenti) e la toglie. */
  applyMask() {
    const cp = this.img.clipPath as MaskImg | undefined
    if (!cp?.isPaintMask) return
    if (!this.ensureMask()) return
    const m = this.mask!, D = this.data.data
    for (let y = 0; y < m.canvas.height; y++) for (let x = 0; x < m.canvas.width; x++) {
      const px = Math.round(x + this.img.cropX), py = Math.round(y + this.img.cropY)
      if (px >= this.W || py >= this.H) continue
      const i = (py * this.W + px) * 4 + 3
      D[i] = D[i] * m.data.data[(y * m.canvas.width + x) * 4 + 3] / 255
    }
    this.img.set('clipPath', undefined)
    this.mask = null
    this.dirty = { x0: 0, y0: 0, x1: this.W - 1, y1: this.H - 1 }
    this.changed = true
    const t = this.tool; this.tool = 'clone'
    this.flush(true)
    this.tool = t
  }

  // ── bacchetta magica ──
  private wand(p: fabric.Point, mode: 'new' | 'add' | 'sub') {
    const x = Math.floor(p.x), y = Math.floor(p.y), W = this.W, H = this.H
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const D = this.data.data, s = (y * W + x) * 4, tol = this.opts.tolerance
    const r0 = D[s], g0 = D[s + 1], b0 = D[s + 2], a0 = D[s + 3]
    const like = (i: number) => {
      const q = i * 4
      return Math.max(Math.abs(D[q] - r0), Math.abs(D[q + 1] - g0), Math.abs(D[q + 2] - b0), Math.abs(D[q + 3] - a0)) <= tol
    }
    const hit = new Uint8Array(W * H)
    if (this.opts.contiguous) {
      const stack = [y * W + x]
      hit[y * W + x] = 1
      while (stack.length) {
        const i = stack.pop()!, cx = i % W, cy = (i - cx) / W
        const nb = [cx > 0 ? i - 1 : -1, cx < W - 1 ? i + 1 : -1, cy > 0 ? i - W : -1, cy < H - 1 ? i + W : -1]
        for (const n of nb) if (n >= 0 && !hit[n] && like(n)) { hit[n] = 1; stack.push(n) }
      }
    } else for (let i = 0; i < W * H; i++) if (like(i)) hit[i] = 1
    const sel = mode === 'new' || !this.sel ? new Uint8Array(W * H) : this.sel
    for (let i = 0; i < W * H; i++) if (hit[i]) sel[i] = mode === 'sub' ? 0 : 255
    this.setSelection(sel)
  }

  private setSelection(sel: Uint8Array | null) {
    this.sel = sel && sel.some(v => v) ? sel : null
    this.selOverlay = null
    if (this.sel) {
      const c = document.createElement('canvas'); c.width = this.W; c.height = this.H
      const ctx = c.getContext('2d')!, im = ctx.createImageData(this.W, this.H)
      for (let i = 0; i < this.sel.length; i++) if (this.sel[i]) { im.data[i * 4] = 124; im.data[i * 4 + 1] = 58; im.data[i * 4 + 2] = 237; im.data[i * 4 + 3] = 110 }
      ctx.putImageData(im, 0, 0)
      this.selOverlay = c
    }
    this.onChange()
    this.canvas.requestRenderAll()
  }

  deselect() { this.setSelection(null) }
  invertSelection() {
    const s = new Uint8Array(this.W * this.H)
    for (let i = 0; i < s.length; i++) s[i] = this.sel ? 255 - this.sel[i] : 0
    this.setSelection(this.sel ? s : s.fill(255))
  }
  selectAll() { this.setSelection(new Uint8Array(this.W * this.H).fill(255)) }

  /** Rende trasparente la zona selezionata. */
  deleteSelection() {
    if (!this.sel) return
    const D = this.data.data
    for (let i = 0; i < this.sel.length; i++) if (this.sel[i]) D[i * 4 + 3] = D[i * 4 + 3] * (1 - this.sel[i] / 255)
    this.dirty = { x0: 0, y0: 0, x1: this.W - 1, y1: this.H - 1 }
    this.changed = true
    const t = this.tool; this.tool = 'clone'
    this.flush(true)
    this.tool = t
    this.deselect()
  }

  /** La selezione diventa la maschera (ciò che è fuori viene nascosto). */
  maskFromSelection() {
    if (!this.sel || !this.ensureMask()) return
    const m = this.mask!, MW = m.canvas.width
    for (let y = 0; y < m.canvas.height; y++) for (let x = 0; x < MW; x++) {
      const px = Math.round(x + this.img.cropX), py = Math.round(y + this.img.cropY)
      m.data.data[(y * MW + x) * 4 + 3] = px < this.W && py < this.H ? this.sel[py * this.W + px] : 0
    }
    m.ctx.putImageData(m.data, 0, 0)
    m.clip.set('dirty', true)
    this.img.set('dirty', true)
    this.canvas.fire('object:modified', { target: this.img })
    this.canvas.requestRenderAll()
  }

  /** Livello tramite copia (Ctrl+J): la zona selezionata in una nuova immagine, sopra, allo stesso posto. */
  copySelectionToLayer(): fabric.FabricImage | null {
    if (!this.sel) return null
    let x0 = this.W, y0 = this.H, x1 = -1, y1 = -1
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) if (this.sel[y * this.W + x]) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
    }
    if (x1 < 0) return null
    const w = x1 - x0 + 1, h = y1 - y0 + 1
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const ctx = c.getContext('2d')!, im = ctx.createImageData(w, h), D = this.data.data
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y0 + y) * this.W + x0 + x, j = (y * w + x) * 4, a = this.sel[i] / 255
      im.data[j] = D[i * 4]; im.data[j + 1] = D[i * 4 + 1]; im.data[j + 2] = D[i * 4 + 2]; im.data[j + 3] = D[i * 4 + 3] * a
    }
    ctx.putImageData(im, 0, 0)
    const img = this.img
    const local = new fabric.Point(x0 + w / 2 - img.cropX - img.width / 2, y0 + h / 2 - img.cropY - img.height / 2)
    const layer = new fabric.FabricImage(c, { angle: img.angle, scaleX: img.scaleX, scaleY: img.scaleY, flipX: img.flipX, flipY: img.flipY })
    layer.set('name', 'Livello da selezione')
    layer.setPositionByOrigin(fabric.util.transformPoint(local, img.calcOwnMatrix()), 'center', 'center')
    const at = this.canvas.getObjects().indexOf(img)
    this.canvas.insertAt(at + 1, layer)
    this.deselect()
    return layer
  }

  // ── disegno: selezione, cursore, origine del timbro ──
  private drawOverlay() {
    const c = this.canvas, ctx = c.getContext()
    const m = fabric.util.multiplyTransformMatrices(c.viewportTransform, this.img.calcTransformMatrix())
    ctx.save()
    if (this.selOverlay) {
      ctx.setTransform(c.getRetinaScaling(), 0, 0, c.getRetinaScaling(), 0, 0)
      ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5])
      // solo la parte visibile nella cornice
      const img = this.img
      ctx.beginPath(); ctx.rect(-img.width / 2, -img.height / 2, img.width, img.height); ctx.clip()
      ctx.drawImage(this.selOverlay, -img.width / 2 - img.cropX, -img.height / 2 - img.cropY)
    }
    ctx.restore()
    ctx.save()
    ctx.setTransform(c.getRetinaScaling(), 0, 0, c.getRetinaScaling(), 0, 0)
    const toScreen = (px: fabric.Point) => fabric.util.transformPoint(
      new fabric.Point(px.x - this.img.width / 2 - this.img.cropX, px.y - this.img.height / 2 - this.img.cropY), m)
    if (this.tool === 'clone' && this.cloneSrc) {
      const at = this.down && this.last && this.cloneOff ? this.last.add(this.cloneOff) : this.cloneSrc
      const s = toScreen(at)
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(s.x - 8, s.y); ctx.lineTo(s.x + 8, s.y); ctx.moveTo(s.x, s.y - 8); ctx.lineTo(s.x, s.y + 8); ctx.stroke()
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5; ctx.stroke()
    }
    if (this.pointer && this.tool !== 'wand') {
      const p = fabric.util.transformPoint(this.pointer, c.viewportTransform)
      const r = this.opts.size / 2
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke()
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke()
      if (this.opts.hardness < 95) { ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(p.x, p.y, r * this.opts.hardness / 100, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]) }
    }
    // correttivo: la zona dipinta in trasparenza finché non si rilascia
    if (this.tool === 'heal' && this.down && this.healMask && this.last) {
      const p = toScreen(this.last)
      ctx.fillStyle = 'rgba(124,58,237,0.25)'
      ctx.beginPath(); ctx.arc(p.x, p.y, this.opts.size / 2, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }
}

export const isPaintMask = (o?: fabric.FabricObject | null) => !!(o?.clipPath as MaskImg | undefined)?.isPaintMask
