/**
 * Ritaglio dentro la cornice (come Canva / InDesign): doppio clic su un'immagine
 * mostra la foto intera in trasparenza. Si trascina la foto per scegliere
 * l'inquadratura, gli angoli la ingrandiscono, le maniglie viola spostano i bordi
 * della cornice. Invio, Esc, doppio clic o clic fuori confermano.
 *
 * La cornice è l'immagine stessa (cropX/cropY/width/height); la foto intera è un
 * "fantasma" temporaneo, escluso da salvataggio e cronologia.
 *
 * Qui anche Sostituisci immagine: la nuova foto riempie la stessa cornice
 * mantenendo posizione, rotazione, filtri, maschera e punto d'interesse.
 */
import * as fabric from 'fabric'

type Img = fabric.FabricImage
interface Session { frame: Img; ghost: Img; evented: boolean; selectable: boolean; off: () => void }

const ACCENT = '#7C3AED'
const MIN = 8 // lato minimo della cornice, in px dell'immagine
const sessions = new WeakMap<fabric.Canvas, Session>()

const src = (img: Img) => (img as unknown as { _originalElement?: HTMLImageElement | HTMLCanvasElement })._originalElement ?? img.getElement()
const srcSize = (img: Img) => {
  const el = src(img) as HTMLImageElement
  return { w: el.naturalWidth || el.width, h: el.naturalHeight || el.height }
}

export const isCropping = (canvas: fabric.Canvas, o?: fabric.FabricObject | null) => {
  const s = sessions.get(canvas)
  return !!s && (!o || o === s.frame || o === s.ghost)
}

/** Allinea il fantasma alla cornice: stessa scala/rotazione, foto intera nella sua posizione reale. */
function placeGhost(frame: Img, ghost: Img) {
  const { w, h } = srcSize(frame)
  const local = new fabric.Point(-frame.width / 2 - frame.cropX + w / 2, -frame.height / 2 - frame.cropY + h / 2)
  const center = fabric.util.transformPoint(local, frame.calcOwnMatrix())
  ghost.set({ angle: frame.angle, scaleX: frame.scaleX, scaleY: frame.scaleY, flipX: frame.flipX, flipY: frame.flipY, skewX: frame.skewX, skewY: frame.skewY })
  ghost.setPositionByOrigin(center, 'center', 'center')
  ghost.setCoords()
}

/**
 * Ricava il ritaglio della cornice dalla posizione del fantasma. Se la cornice
 * uscirebbe dalla foto, è il fantasma a fermarsi.
 */
function syncFromGhost(frame: Img, ghost: Img) {
  const { w, h } = srcSize(frame)
  // la cornice resta ferma: stessa misura visibile, nuova densità
  const visW = frame.width * Math.abs(frame.scaleX), visH = frame.height * Math.abs(frame.scaleY)
  const sx = Math.abs(ghost.scaleX), sy = Math.abs(ghost.scaleY)
  const width = Math.min(w, visW / sx), height = Math.min(h, visH / sy)
  const center = frame.getRelativeCenterPoint()
  frame.set({ width, height, scaleX: ghost.scaleX, scaleY: ghost.scaleY })
  // centro della cornice nelle coordinate della foto (origine in alto a sinistra)
  const local = fabric.util.transformPoint(center, fabric.util.invertTransform(ghost.calcOwnMatrix()))
  const cropX = local.x + w / 2 - width / 2, cropY = local.y + h / 2 - height / 2
  const cx = Math.max(0, Math.min(w - width, cropX)), cy = Math.max(0, Math.min(h - height, cropY))
  frame.set({ cropX: cx, cropY: cy })
  frame.setPositionByOrigin(center, 'center', 'center')
  if (cx !== cropX || cy !== cropY) placeGhost(frame, ghost)
  frame.set('dirty', true)
  frame.setCoords()
}

/** Maniglia che sposta un bordo (o un angolo) della cornice dentro i limiti della foto. */
function edgeControl(x: -0.5 | 0 | 0.5, y: -0.5 | 0 | 0.5, frame: Img) {
  return new fabric.Control({
    x, y, sizeX: 18, sizeY: 18, actionName: 'crop',
    cursorStyle: x && y ? (x === y ? 'nwse-resize' : 'nesw-resize') : x ? 'ew-resize' : 'ns-resize',
    positionHandler: () => fabric.util.transformPoint(
      new fabric.Point(x * frame.width, y * frame.height),
      fabric.util.multiplyTransformMatrices(frame.getViewportTransform(), frame.calcTransformMatrix())),
    actionHandler: (_e, _t, mx, my) => {
      const { w, h } = srcSize(frame)
      const m = fabric.util.transformPoint(new fabric.Point(mx, my), fabric.util.invertTransform(frame.calcTransformMatrix()))
      let l = -frame.width / 2, r = frame.width / 2, t = -frame.height / 2, b = frame.height / 2
      const imgL = l - frame.cropX, imgT = t - frame.cropY
      if (x < 0) l = Math.max(imgL, Math.min(r - MIN, m.x))
      if (x > 0) r = Math.min(imgL + w, Math.max(l + MIN, m.x))
      if (y < 0) t = Math.max(imgT, Math.min(b - MIN, m.y))
      if (y > 0) b = Math.min(imgT + h, Math.max(t + MIN, m.y))
      const center = fabric.util.transformPoint(new fabric.Point((l + r) / 2, (t + b) / 2), frame.calcOwnMatrix())
      frame.set({ cropX: l - imgL, cropY: t - imgT, width: r - l, height: b - t, dirty: true })
      frame.setPositionByOrigin(center, 'center', 'center')
      frame.setCoords()
      return true
    },
    render: (ctx, left, top, _s, o) => {
      const ang = fabric.util.degreesToRadians(o.getTotalAngle())
      ctx.save()
      if (x < 0 && y < 0) { // il bordo della cornice, una volta sola, tratteggiato per vederlo anche sul chiaro
        const m = fabric.util.multiplyTransformMatrices(frame.getViewportTransform(), frame.calcTransformMatrix())
        const pts = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([px, py]) => fabric.util.transformPoint(new fabric.Point(px * frame.width, py * frame.height), m))
        ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4])
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke()
        ctx.setLineDash([])
      }
      ctx.translate(left, top); ctx.rotate(ang)
      ctx.strokeStyle = '#ffffff'; ctx.fillStyle = ACCENT; ctx.lineWidth = 1
      const L = 12, T = 4
      ctx.beginPath()
      if (x && y) { // angolo a L
        const sx = -Math.sign(x), sy = -Math.sign(y)
        ctx.rect(0, 0, sx * L, sy * T); ctx.rect(0, 0, sx * T, sy * L)
      } else if (x) ctx.rect(-T / 2, -L / 2, T, L)
      else ctx.rect(-L / 2, -T / 2, L, T)
      ctx.fill(); ctx.stroke()
      ctx.restore()
    },
  })
}

export function startCrop(canvas: fabric.Canvas, o?: fabric.FabricObject | null): string | null {
  if (!(o instanceof fabric.FabricImage)) return 'Seleziona un’immagine.'
  if ((o as unknown as { warpCorners?: unknown }).warpCorners) return 'L’immagine è distorta: ritagliala prima di distorcerla, o annulla la distorsione.'
  endCrop(canvas)
  const frame = o
  const ghost = new fabric.FabricImage(src(frame) as HTMLImageElement, {
    opacity: 0.35, excludeFromExport: true, hasBorders: false, lockRotation: true, lockSkewingX: true, lockSkewingY: true,
    objectCaching: false,
  })
  ghost.set('name', '__crop_ghost')
  placeGhost(frame, ghost)
  const { evented, selectable } = frame
  frame.set({ evented: false, selectable: false })
  // la foto sta sotto la cornice: dentro la cornice si vede piena, fuori in trasparenza
  canvas.insertAt(canvas.getObjects().indexOf(frame), ghost)

  const corner = fabric.controlsUtils.scalingEqually
  const def = fabric.controlsUtils.createObjectDefaultControls()
  const controls: Record<string, fabric.Control> = {}
  for (const k of ['tl', 'tr', 'bl', 'br'] as const) controls[k] = new fabric.Control({ ...def[k], actionHandler: corner, sizeX: 10, sizeY: 10 })
  for (const [k, x, y] of [['ctl', -0.5, -0.5], ['ct', 0, -0.5], ['cb', 0, 0.5], ['cl', -0.5, 0], ['cr', 0.5, 0], ['ctr', 0.5, -0.5], ['cbl', -0.5, 0.5], ['cbr', 0.5, 0.5]] as const)
    controls[k] = edgeControl(x, y, frame)
  ghost.controls = controls
  ghost.cornerColor = '#ffffff'; ghost.cornerStrokeColor = ACCENT; ghost.transparentCorners = false

  const onMove = (e: { target?: fabric.FabricObject }) => { if (e.target === ghost) syncFromGhost(frame, ghost) }
  const onScale = (e: { target?: fabric.FabricObject }) => {
    if (e.target !== ghost) return
    // la foto non può diventare più piccola della cornice
    const { w, h } = srcSize(frame)
    const visW = frame.width * Math.abs(frame.scaleX), visH = frame.height * Math.abs(frame.scaleY)
    const min = Math.max(visW / w, visH / h)
    if (Math.abs(ghost.scaleX) < min) {
      const c = ghost.getRelativeCenterPoint()
      ghost.set({ scaleX: Math.sign(ghost.scaleX || 1) * min, scaleY: Math.sign(ghost.scaleY || 1) * min })
      ghost.setPositionByOrigin(c, 'center', 'center')
    }
    syncFromGhost(frame, ghost)
  }
  const onSel = () => { if (canvas.getActiveObject() !== ghost) endCrop(canvas) }
  const born = performance.now()
  const onDbl = () => { if (performance.now() - born > 400) endCrop(canvas) } // non il doppio clic che l'ha aperto
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); endCrop(canvas) }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopImmediatePropagation() } // niente cancellazioni a metà ritaglio
  }
  // annulla/ripristina sostituisce gli oggetti: la sessione si chiude senza toccare nulla
  const onRestore = () => { off(); sessions.delete(canvas) }
  canvas.on('history:restored' as never, onRestore)
  canvas.on('object:moving', onMove)
  canvas.on('object:scaling', onScale)
  canvas.on('selection:updated', onSel)
  canvas.on('selection:cleared', onSel)
  canvas.on('mouse:dblclick', onDbl)
  window.addEventListener('keydown', onKey, true)
  const off = () => {
    canvas.off('object:moving', onMove); canvas.off('object:scaling', onScale)
    canvas.off('selection:updated', onSel); canvas.off('selection:cleared', onSel); canvas.off('mouse:dblclick', onDbl)
    canvas.off('history:restored' as never, onRestore)
    window.removeEventListener('keydown', onKey, true)
  }
  sessions.set(canvas, { frame, ghost, evented, selectable, off })
  canvas.setActiveObject(ghost)
  canvas.requestRenderAll()
  return null
}

export function endCrop(canvas: fabric.Canvas) {
  const s = sessions.get(canvas)
  if (!s) return
  sessions.delete(canvas)
  const { frame, ghost } = s
  s.off()
  canvas.remove(ghost)
  frame.set({ evented: s.evented, selectable: s.selectable })
  frame.setCoords()
  canvas.setActiveObject(frame)
  canvas.fire('object:modified', { target: frame })
  canvas.requestRenderAll()
}

/** Adatta la cornice a tutta la foto (annulla il ritaglio), mantenendo la scala. */
export function resetCrop(canvas: fabric.Canvas, o?: fabric.FabricObject | null) {
  if (!(o instanceof fabric.FabricImage)) return
  endCrop(canvas)
  const { w, h } = srcSize(o)
  const center = fabric.util.transformPoint(new fabric.Point(-o.width / 2 - o.cropX + w / 2, -o.height / 2 - o.cropY + h / 2), o.calcOwnMatrix())
  o.set({ cropX: 0, cropY: 0, width: w, height: h, dirty: true })
  o.setPositionByOrigin(center, 'center', 'center')
  o.setCoords()
  canvas.fire('object:modified', { target: o })
  canvas.requestRenderAll()
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const el = new Image()
    el.crossOrigin = 'anonymous'
    el.onload = () => res(el); el.onerror = () => rej(new Error('Immagine non leggibile'))
    el.src = url
  })
}

/**
 * Sostituisci immagine: la nuova foto riempie la stessa cornice (come "riempi"),
 * centrata sullo stesso punto della vecchia inquadratura.
 */
export async function replaceImage(canvas: fabric.Canvas, o: fabric.FabricObject, url: string): Promise<string | null> {
  if (!(o instanceof fabric.FabricImage)) return 'Seleziona un’immagine.'
  if ((o as unknown as { warpCorners?: unknown }).warpCorners) return 'Annulla prima la distorsione dell’immagine.'
  endCrop(canvas)
  const el = await loadImage(url)
  const old = srcSize(o)
  const W = el.naturalWidth, H = el.naturalHeight
  const visW = o.width * Math.abs(o.scaleX), visH = o.height * Math.abs(o.scaleY)
  const s = Math.max(visW / W, visH / H)
  const width = Math.min(W, visW / s), height = Math.min(H, visH / s)
  // punto d'interesse: il centro della vecchia inquadratura, in proporzione
  const fx = (o.cropX + o.width / 2) / old.w, fy = (o.cropY + o.height / 2) / old.h
  const cropX = Math.max(0, Math.min(W - width, fx * W - width / 2)), cropY = Math.max(0, Math.min(H - height, fy * H - height / 2))
  const center = o.getRelativeCenterPoint()
  await o.setSrc(url, { crossOrigin: 'anonymous' })
  o.set({ cropX, cropY, width, height, scaleX: Math.sign(o.scaleX || 1) * s, scaleY: Math.sign(o.scaleY || 1) * s, dirty: true })
  if (o.filters?.length) o.applyFilters()
  o.setPositionByOrigin(center, 'center', 'center')
  o.setCoords()
  canvas.fire('object:modified', { target: o })
  canvas.requestRenderAll()
  return null
}

/** Chiede un file all'utente e lo usa per Sostituisci immagine. */
export function pickAndReplace(canvas: fabric.Canvas, o: fabric.FabricObject, onMsg?: (m: string | null) => void) {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    const r = new FileReader()
    r.onload = () => { replaceImage(canvas, o, r.result as string).then(m => onMsg?.(m)).catch(e => onMsg?.(String(e.message ?? e))) }
    r.readAsDataURL(file)
  }
  input.click()
}
