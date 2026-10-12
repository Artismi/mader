/**
 * Selezione diretta (Illustrator: strumento A): si modificano i singoli punti
 * di ancoraggio e le maniglie di qualsiasi forma. Rettangoli, ellissi, poligoni,
 * linee e forme vive vengono prima convertiti in tracciato.
 *
 * - trascina un punto: lo sposta insieme alle sue maniglie
 * - trascina una maniglia: sui punti morbidi l'altra maniglia la segue (Alt la stacca)
 * - Alt+clic su un punto: angolo ↔ morbido
 * - doppio clic sul contorno: aggiunge un punto
 * - Canc/Backspace: elimina il punto selezionato
 * - Esc, A o clic fuori: fine modifica
 */
import * as fabric from 'fabric'
import { SERIAL_PROPS } from '../canvas-serial'

type Cmd = (string | number)[]
type EditPath = fabric.Path & {
  pointEditing?: boolean
  _dsSaved?: { controls: Record<string, fabric.Control>; hasBorders: boolean }
  _dsSel?: number
  _bzAnchors?: unknown
  liveShape?: unknown
}

const ACCENT = '#7C3AED'
const K = 0.5522847498 // maniglie per approssimare un quarto di ellisse

const cmds = (p: fabric.Path) => p.path as unknown as Cmd[]
const end = (c: Cmd) => new fabric.Point(c[c.length - 2] as number, c[c.length - 1] as number)
const setEnd = (c: Cmd, q: fabric.Point) => { c[c.length - 2] = q.x; c[c.length - 1] = q.y }
const near = (a: fabric.Point, b: fabric.Point, eps = 0.01) => Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps
const drawing = (c?: Cmd) => !!c && (c[0] === 'L' || c[0] === 'C')

export const isPointEditing = (o?: fabric.FabricObject | null) => !!(o as EditPath | undefined)?.pointEditing

// ── conversione in tracciato ────────────────────────────────────────────────

const f = (n: number) => Math.round(n * 1000) / 1000

function ellipseD(rx: number, ry: number) {
  const kx = rx * K, ky = ry * K
  return `M ${f(rx)} 0 C ${f(rx)} ${f(ky)} ${f(kx)} ${f(ry)} 0 ${f(ry)} C ${f(-kx)} ${f(ry)} ${f(-rx)} ${f(ky)} ${f(-rx)} 0 `
    + `C ${f(-rx)} ${f(-ky)} ${f(-kx)} ${f(-ry)} 0 ${f(-ry)} C ${f(kx)} ${f(-ry)} ${f(rx)} ${f(-ky)} ${f(rx)} 0 Z`
}

function rectD(w: number, h: number, rx0 = 0, ry0 = 0) {
  const hw = w / 2, hh = h / 2
  const rx = Math.min(rx0, hw), ry = Math.min(ry0 || rx0, hh)
  if (!rx || !ry) return `M ${f(-hw)} ${f(-hh)} L ${f(hw)} ${f(-hh)} L ${f(hw)} ${f(hh)} L ${f(-hw)} ${f(hh)} Z`
  const kx = rx * (1 - K), ky = ry * (1 - K)
  return [
    `M ${f(-hw + rx)} ${f(-hh)}`, `L ${f(hw - rx)} ${f(-hh)}`,
    `C ${f(hw - kx)} ${f(-hh)} ${f(hw)} ${f(-hh + ky)} ${f(hw)} ${f(-hh + ry)}`, `L ${f(hw)} ${f(hh - ry)}`,
    `C ${f(hw)} ${f(hh - ky)} ${f(hw - kx)} ${f(hh)} ${f(hw - rx)} ${f(hh)}`, `L ${f(-hw + rx)} ${f(hh)}`,
    `C ${f(-hw + kx)} ${f(hh)} ${f(-hw)} ${f(hh - ky)} ${f(-hw)} ${f(hh - ry)}`, `L ${f(-hw)} ${f(-hh + ry)}`,
    `C ${f(-hw)} ${f(-hh + ky)} ${f(-hw + kx)} ${f(-hh)} ${f(-hw + rx)} ${f(-hh)}`, 'Z',
  ].join(' ')
}

/** Tracciato equivalente in coordinate locali (centro dell'oggetto = 0,0), o null se non convertibile. */
function localPathD(o: fabric.FabricObject): string | null {
  if (o instanceof fabric.Rect) return rectD(o.width, o.height, o.rx, o.ry)
  if (o instanceof fabric.Circle) return ellipseD(o.radius, o.radius)
  if (o instanceof fabric.Ellipse) return ellipseD(o.rx, o.ry)
  if (o instanceof fabric.Triangle) {
    const hw = o.width / 2, hh = o.height / 2
    return `M 0 ${f(-hh)} L ${f(hw)} ${f(hh)} L ${f(-hw)} ${f(hh)} Z`
  }
  if (o instanceof fabric.Line) {
    const { x1, y1, x2, y2 } = o.calcLinePoints()
    return `M ${f(x1)} ${f(y1)} L ${f(x2)} ${f(y2)}`
  }
  if (o instanceof fabric.Polyline) { // anche Polygon
    const po = o.pathOffset
    const d = o.points.map((q, i) => `${i ? 'L' : 'M'} ${f(q.x - po.x)} ${f(q.y - po.y)}`).join(' ')
    return o instanceof fabric.Polygon ? d + ' Z' : d
  }
  return null
}

const DROP = ['type', 'version', 'width', 'height', 'left', 'top', 'points', 'rx', 'ry', 'radius', 'startAngle', 'endAngle',
  'counterClockwise', 'x1', 'y1', 'x2', 'y2', 'path', 'pathOffset', 'liveShape', 'fill', 'stroke', 'shadow', 'clipPath', 'filters']

/** Rende `o` un tracciato modificabile, sostituendolo sul canvas se serve. */
export function convertToPath(canvas: fabric.Canvas, o: fabric.FabricObject): fabric.Path | null {
  if (o instanceof fabric.Path) {
    const p = o as EditPath
    if (p.liveShape) { p.liveShape = undefined; p.set('name', 'Tracciato') } // da qui non è più parametrica
    return p
  }
  const d = localPathD(o)
  if (!d) return null
  const json = o.toObject(SERIAL_PROPS as never[]) as Record<string, unknown>
  DROP.forEach(k => delete json[k])
  const p = new fabric.Path(d, {
    ...json, fill: o instanceof fabric.Line ? '' : o.fill, stroke: o.stroke, shadow: o.shadow, clipPath: o.clipPath,
  } as Partial<fabric.PathProps>)
  if (o instanceof fabric.Line && !p.stroke) p.set('stroke', o.fill as string)
  // il punto locale q stava in centro + L·q; nel tracciato sta in centro' + L·(q − pathOffset)
  const L = o.calcOwnMatrix()
  const shift = fabric.util.transformPoint(p.pathOffset, L, true)
  p.setPositionByOrigin(o.getRelativeCenterPoint().add(shift), 'center', 'center')
  p.setCoords()
  const at = canvas.getObjects().indexOf(o)
  canvas.remove(o)
  canvas.insertAt(Math.max(0, at), p)
  return p
}

// ── modello dei punti ───────────────────────────────────────────────────────

/** Q → C, e chiusure rese esplicite: ogni contorno chiuso termina con un segmento che torna sull'M. */
function normalize(p: fabric.Path) {
  const src = cmds(p), out: Cmd[] = []
  let cur = new fabric.Point(0, 0), start = cur
  for (const c of src) {
    const t = c[0]
    if (t === 'M') { start = cur = end(c); out.push(['M', cur.x, cur.y]) }
    else if (t === 'L') { cur = end(c); out.push(['L', cur.x, cur.y]) }
    else if (t === 'C') { cur = end(c); out.push([...c]) }
    else if (t === 'Q') {
      const q1 = new fabric.Point(c[1] as number, c[2] as number), e = end(c)
      const c1 = cur.add(q1.subtract(cur).scalarMultiply(2 / 3)), c2 = e.add(q1.subtract(e).scalarMultiply(2 / 3))
      out.push(['C', c1.x, c1.y, c2.x, c2.y, e.x, e.y]); cur = e
    } else if (t === 'Z' || t === 'z') {
      if (!near(cur, start)) out.push(['L', start.x, start.y])
      out.push(['Z']); cur = start
    }
  }
  p.set({ path: out as unknown as fabric.TSimplePathData })
}

interface Sub { m: number; z: number | null } // indice dell'M e dello Z (se chiuso)

function subpaths(c: Cmd[]): Sub[] {
  const out: Sub[] = []
  c.forEach((k, i) => {
    if (k[0] === 'M') out.push({ m: i, z: null })
    else if (k[0] === 'Z' && out.length) out[out.length - 1].z = i
  })
  return out
}
const subOf = (c: Cmd[], i: number) => subpaths(c).filter(s => s.m <= i).pop()!

/** Il comando di chiusura (che termina sull'M) non è un punto a sé: è il gemello dell'M. */
function isTwin(c: Cmd[], i: number) {
  const s = subOf(c, i)
  return s.z !== null && i === s.z - 1 && i !== s.m
}

const anchorIndexes = (c: Cmd[]) => c.map((k, i) => i).filter(i => c[i][0] !== 'Z' && !isTwin(c, i))

/** Segmento che arriva al punto `i` e segmento che ne parte (indici di comando). */
function segments(c: Cmd[], i: number): { inc: number | null; out: number | null } {
  const s = subOf(c, i)
  if (c[i][0] === 'M') return { inc: s.z !== null ? s.z - 1 : null, out: drawing(c[i + 1]) ? i + 1 : null }
  return { inc: i, out: drawing(c[i + 1]) ? i + 1 : null }
}

function handles(c: Cmd[], i: number) {
  const { inc, out } = segments(c, i)
  return {
    hin: inc !== null && c[inc][0] === 'C' ? { cmd: inc, k: 3 } : null,
    hout: out !== null && c[out][0] === 'C' ? { cmd: out, k: 1 } : null,
  }
}
const hp = (c: Cmd[], h: { cmd: number; k: number }) => new fabric.Point(c[h.cmd][h.k] as number, c[h.cmd][h.k + 1] as number)
const setHp = (c: Cmd[], h: { cmd: number; k: number }, q: fabric.Point) => { c[h.cmd][h.k] = q.x; c[h.cmd][h.k + 1] = q.y }

function startOf(c: Cmd[], i: number) { return end(c[i - 1]) }

function moveAnchor(c: Cmd[], i: number, to: fabric.Point) {
  const d = to.subtract(end(c[i]))
  const { hin, hout } = handles(c, i)
  if (hin) setHp(c, hin, hp(c, hin).add(d))
  if (hout) setHp(c, hout, hp(c, hout).add(d))
  setEnd(c[i], to)
  const s = subOf(c, i)
  if (c[i][0] === 'M' && s.z !== null) setEnd(c[s.z - 1], to)
}

/** Sposta una maniglia; se il punto è morbido l'opposta resta allineata (con la sua lunghezza). */
function moveHandle(c: Cmd[], i: number, which: 'in' | 'out', to: fabric.Point, breakIt: boolean) {
  const { hin, hout } = handles(c, i)
  const h = which === 'in' ? hin : hout, o = which === 'in' ? hout : hin
  if (!h) return
  const P = end(c[i])
  if (o && !breakIt) {
    const a = hp(c, h).subtract(P), b = hp(c, o).subtract(P)
    const la = Math.hypot(a.x, a.y), lb = Math.hypot(b.x, b.y)
    const smooth = la > 0.01 && lb > 0.01 && Math.abs(a.x * b.y - a.y * b.x) / (la * lb) < 0.05 && a.x * b.x + a.y * b.y < 0
    if (smooth) {
      const n = to.subtract(P), ln = Math.hypot(n.x, n.y)
      if (ln > 0.01) setHp(c, o, P.subtract(n.scalarMultiply(lb / ln)))
    }
  }
  setHp(c, h, to)
}

function toCurve(c: Cmd[], i: number) {
  if (c[i][0] !== 'L') return
  const a = startOf(c, i), b = end(c[i])
  const c1 = a.add(b.subtract(a).scalarMultiply(1 / 3)), c2 = a.add(b.subtract(a).scalarMultiply(2 / 3))
  c[i] = ['C', c1.x, c1.y, c2.x, c2.y, b.x, b.y]
}

/** Angolo ↔ morbido. */
function convertAnchor(c: Cmd[], i: number) {
  const P = end(c[i])
  const { hin, hout } = handles(c, i)
  const hasHandles = [hin, hout].some(h => h && !near(hp(c, h), P, 0.5))
  if (hasHandles) {
    if (hin) setHp(c, hin, P)
    if (hout) setHp(c, hout, P)
    return
  }
  const { inc, out } = segments(c, i)
  if (inc !== null) toCurve(c, inc)
  if (out !== null) toCurve(c, out)
  const prev = inc !== null ? startOf(c, inc) : null, next = out !== null ? end(c[out]) : null
  const A = prev ?? P.subtract(next!.subtract(P)), B = next ?? P.subtract(prev!.subtract(P))
  const t = B.subtract(A), lt = Math.hypot(t.x, t.y) || 1
  const u = t.scalarMultiply(1 / lt)
  const h2 = handles(c, i)
  if (h2.hin && prev) setHp(c, h2.hin, P.subtract(u.scalarMultiply(P.distanceFrom(prev) / 3)))
  if (h2.hout && next) setHp(c, h2.hout, P.add(u.scalarMultiply(P.distanceFrom(next) / 3)))
}

/** Elimina il punto `i` unendo i due segmenti vicini. Restituisce false se il contorno resterebbe troppo corto. */
function deleteAnchor(c: Cmd[], i: number): boolean {
  const s = subOf(c, i)
  const last = s.z !== null ? s.z - 1 : (() => { let j = s.m; while (drawing(c[j + 1])) j++; return j })()
  const count = last - s.m + (s.z !== null ? 0 : 1)
  if (count <= (s.z !== null ? 3 : 2)) return false
  if (c[i][0] === 'M') {
    const n = end(c[i + 1])
    c.splice(i, 2, ['M', n.x, n.y])
    if (s.z !== null) setEnd(c[s.z - 2], n) // il gemello di chiusura segue il nuovo inizio
    return true
  }
  const nx = c[i + 1]
  if (drawing(nx) && c[i][0] === 'C' && nx[0] === 'C') {
    c.splice(i, 2, ['C', c[i][1], c[i][2], nx[3], nx[4], nx[5], nx[6]])
  } else c.splice(i, 1)
  return true
}

function bez(a: fabric.Point, c: Cmd, t: number) {
  if (c[0] === 'L') return a.lerp(end(c), t)
  const p1 = new fabric.Point(c[1] as number, c[2] as number), p2 = new fabric.Point(c[3] as number, c[4] as number), p3 = end(c)
  const u = 1 - t
  return new fabric.Point(
    u * u * u * a.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    u * u * u * a.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y)
}

/** Aggiunge un punto sul segmento più vicino a `q` (coordinate del tracciato); restituisce il suo indice. */
function insertAnchor(c: Cmd[], q: fabric.Point, maxDist: number): number | null {
  let best = { i: -1, t: 0, d: Infinity }
  for (let i = 1; i < c.length; i++) {
    if (!drawing(c[i])) continue
    const a = startOf(c, i)
    for (let k = 1; k < 64; k++) {
      const t = k / 64, d = bez(a, c[i], t).distanceFrom(q)
      if (d < best.d) best = { i, t, d }
    }
  }
  if (best.i < 0 || best.d > maxDist) return null
  // rifinitura attorno al campione migliore
  const a = startOf(c, best.i)
  for (let step = 1 / 128; step > 1e-4; step /= 2) {
    for (const t of [best.t - step, best.t + step]) {
      if (t <= 0 || t >= 1) continue
      const d = bez(a, c[best.i], t).distanceFrom(q)
      if (d < best.d) best = { ...best, t, d }
    }
  }
  const { i, t } = best, cm = c[i]
  if (cm[0] === 'L') {
    const m = a.lerp(end(cm), t)
    c.splice(i, 0, ['L', m.x, m.y])
    return i
  }
  const p1 = new fabric.Point(cm[1] as number, cm[2] as number), p2 = new fabric.Point(cm[3] as number, cm[4] as number), p3 = end(cm)
  const ab = a.lerp(p1, t), bc = p1.lerp(p2, t), cd = p2.lerp(p3, t), abc = ab.lerp(bc, t), bcd = bc.lerp(cd, t), m = abc.lerp(bcd, t)
  c.splice(i, 1, ['C', ab.x, ab.y, abc.x, abc.y, m.x, m.y], ['C', bcd.x, bcd.y, cd.x, cd.y, p3.x, p3.y])
  return i
}

// ── controlli Fabric ────────────────────────────────────────────────────────

const toScreen = (p: fabric.Path, q: fabric.Point) =>
  fabric.util.transformPoint(q.subtract(p.pathOffset), fabric.util.multiplyTransformMatrices(p.getViewportTransform(), p.calcTransformMatrix()))
const fromScene = (p: fabric.Path, x: number, y: number) =>
  fabric.util.transformPoint(new fabric.Point(x, y), fabric.util.invertTransform(p.calcTransformMatrix())).add(p.pathOffset)

/** Ricalcola il riquadro del tracciato senza spostarne il disegno. */
function refit(p: fabric.Path) {
  const before = p.pathOffset.clone(), center = p.getRelativeCenterPoint()
  p.setDimensions()
  const shift = fabric.util.transformPoint(p.pathOffset.subtract(before), p.calcOwnMatrix(), true)
  p.setPositionByOrigin(center.add(shift), 'center', 'center')
  p.set('dirty', true)
  p.setCoords()
}

let dragLock = false // dopo un Alt+clic il trascinamento non sposta nulla

function anchorControl(i: number) {
  return new fabric.Control({
    sizeX: 9, sizeY: 9, cursorStyle: 'move', actionName: 'modifyPath',
    positionHandler: (_d, _m, o) => toScreen(o as fabric.Path, end(cmds(o as fabric.Path)[i])),
    mouseDownHandler: (ev, tr) => {
      const p = tr.target as EditPath
      p._dsSel = i
      dragLock = false
      if ((ev as MouseEvent).altKey) {
        dragLock = true
        convertAnchor(cmds(p), i)
        refit(p)
        p.canvas?.fire('object:modified', { target: p })
      }
      p.canvas?.requestRenderAll()
      return false
    },
    actionHandler: (_ev, tr, x, y) => {
      if (dragLock) return false
      const p = tr.target as EditPath
      moveAnchor(cmds(p), i, fromScene(p, x, y))
      refit(p)
      return true
    },
    render: (ctx, left, top, _s, o) => {
      const sel = (o as EditPath)._dsSel === i
      ctx.save()
      ctx.fillStyle = sel ? ACCENT : '#ffffff'; ctx.strokeStyle = sel ? '#ffffff' : ACCENT; ctx.lineWidth = 1.5
      ctx.fillRect(left - 4, top - 4, 8, 8); ctx.strokeRect(left - 4, top - 4, 8, 8)
      ctx.restore()
    },
  })
}

function handleControl(i: number, which: 'in' | 'out') {
  const get = (p: fabric.Path) => { const h = handles(cmds(p), i)[which === 'in' ? 'hin' : 'hout']; return h ? hp(cmds(p), h) : null }
  const ctl = new fabric.Control({
    sizeX: 9, sizeY: 9, cursorStyle: 'pointer', actionName: 'modifyPath',
    positionHandler: (_d, _m, o) => toScreen(o as fabric.Path, get(o as fabric.Path) ?? end(cmds(o as fabric.Path)[i])),
    actionHandler: (ev, tr, x, y) => {
      const p = tr.target as EditPath
      p._dsSel = i
      moveHandle(cmds(p), i, which, fromScene(p, x, y), (ev as MouseEvent).altKey)
      refit(p)
      return true
    },
    render: (ctx, left, top, _s, o) => {
      const a = toScreen(o as fabric.Path, end(cmds(o as fabric.Path)[i]))
      ctx.save()
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(left, top); ctx.stroke()
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(left, top, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.restore()
    },
  })
  // le maniglie chiuse sul loro punto non si vedono (resterebbero sotto il quadratino)
  ctl.getVisibility = (o: fabric.FabricObject) => {
    const p = o as fabric.Path, q = get(p)
    return !!q && !near(q, end(cmds(p)[i]), 0.5)
  }
  return ctl
}

function buildControls(p: EditPath) {
  const c = cmds(p), out: Record<string, fabric.Control> = {}
  const idx = anchorIndexes(c)
  idx.forEach(i => { out[`a_${i}`] = anchorControl(i) })
  idx.forEach(i => { // dopo i punti: a parità di posizione vince la maniglia
    const { hin, hout } = handles(c, i)
    if (hin) out[`h_${i}_in`] = handleControl(i, 'in')
    if (hout) out[`h_${i}_out`] = handleControl(i, 'out')
  })
  p.controls = out
  p.setCoords()
}

// ── ingresso / uscita ───────────────────────────────────────────────────────

export function enterPointEdit(canvas: fabric.Canvas, p: fabric.Path) {
  const e = p as EditPath
  if (e.pointEditing) return
  normalize(p)
  refit(p)
  e._bzAnchors = undefined // i punti della penna ora vivono nel tracciato
  e._dsSaved = { controls: p.controls, hasBorders: p.hasBorders }
  e.pointEditing = true
  e._dsSel = undefined
  p.hasBorders = false
  buildControls(e)
  canvas.setActiveObject(p)
  canvas.requestRenderAll()
}

export function exitPointEdit(canvas: fabric.Canvas, o?: fabric.FabricObject | null) {
  const targets = o ? [o] : canvas.getObjects()
  for (const t of targets) {
    const e = t as EditPath
    if (!e.pointEditing || !e._dsSaved) continue
    e.controls = e._dsSaved.controls
    e.hasBorders = e._dsSaved.hasBorders
    e.pointEditing = false
    e._dsSaved = undefined
    e._dsSel = undefined
    e.setCoords()
  }
  canvas.requestRenderAll()
}

/** Avvia la selezione diretta sull'oggetto (convertendolo se serve). Restituisce un messaggio se non si può. */
export function startDirectSelect(canvas: fabric.Canvas, o?: fabric.FabricObject | null): string | null {
  if (!o || o instanceof fabric.ActiveSelection) return 'Seleziona una sola forma.'
  if ((o as fabric.FabricObject & { isArtboard?: boolean }).isArtboard) return 'Le tavole non hanno punti da modificare.'
  const p = convertToPath(canvas, o)
  if (!p) return 'I punti si modificano su forme e tracciati (testi e immagini vanno prima vettorializzati).'
  enterPointEdit(canvas, p)
  if (p !== o) canvas.fire('object:modified', { target: p })
  return null
}

/** Doppio clic su un tracciato: entra in modifica, oppure aggiunge un punto se già in modifica. */
export function pathDoubleClick(canvas: fabric.Canvas, p: fabric.Path, scene: fabric.Point) {
  const e = p as EditPath
  if (!e.pointEditing) { enterPointEdit(canvas, p); return }
  const local = fromScene(p, scene.x, scene.y)
  const s = p.getObjectScaling()
  const scale = Math.max(1e-6, Math.abs(s.x), Math.abs(s.y)) * canvas.getZoom()
  const at = insertAnchor(cmds(p), local, 12 / scale) // 12 px a schermo
  if (at === null) return
  refit(p)
  e._dsSel = at
  buildControls(e)
  canvas.fire('object:modified', { target: p })
  canvas.requestRenderAll()
}

function deleteSelected(canvas: fabric.Canvas, p: EditPath) {
  if (p._dsSel === undefined) return false
  if (!deleteAnchor(cmds(p), p._dsSel)) return true // contorno minimo: il tasto non cancella l'oggetto
  p._dsSel = undefined
  refit(p)
  buildControls(p)
  canvas.fire('object:modified', { target: p })
  canvas.requestRenderAll()
  return true
}

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

/** Esce dalla modifica quando la selezione cambia; tasti A, Canc, Esc. */
export function installDirectSelect(canvas: fabric.Canvas) {
  const onSel = () => {
    const active = canvas.getActiveObject()
    canvas.getObjects().forEach(o => { if (isPointEditing(o) && o !== active) exitPointEdit(canvas, o) })
  }
  const onKey = (e: KeyboardEvent) => {
    if (typing(e.target)) return
    const active = canvas.getActiveObject() as EditPath | undefined
    if ((active as unknown as fabric.IText | undefined)?.isEditing) return
    const editing = isPointEditing(active)
    if (editing && (e.key === 'Delete' || e.key === 'Backspace')) {
      if (deleteSelected(canvas, active!)) { e.preventDefault(); e.stopImmediatePropagation() }
      return
    }
    if (editing && e.key === 'Escape') {
      exitPointEdit(canvas, active); e.preventDefault(); e.stopImmediatePropagation(); return
    }
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'a' && active) {
      if (editing) exitPointEdit(canvas, active)
      else startDirectSelect(canvas, active)
      e.preventDefault()
    }
  }
  const evs = ['selection:created', 'selection:updated', 'selection:cleared'] as const
  evs.forEach(ev => canvas.on(ev, onSel))
  window.addEventListener('keydown', onKey, true)
  return () => {
    evs.forEach(ev => canvas.off(ev, onSel))
    window.removeEventListener('keydown', onKey, true)
    exitPointEdit(canvas)
  }
}
