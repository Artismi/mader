/**
 * L'IA usa gli strumenti dello Studio: esegue le operazioni del tool "editDesign"
 * (schema in src/lib/design/design-ops-spec.ts) e descrive il canvas con ID
 * stabili, così il modello può indicare con precisione su cosa lavorare.
 */
import * as fabric from 'fabric'
import type { DesignOp } from '@/lib/design/design-ops-spec'
import { alignObjects, distributeObjects, makeClipMask } from '../arrange/align'
import { boardOf, childrenOf } from '../arrange/artboards'
import { boardLabel, exportBoards, listBoards } from '../arrange/export'
import { runPathOp } from '../vector/pathfinder'
import { offsetSelection } from '../vector/offset'
import { makeRepeat, updateRepeat, type RepeatSpec } from '../vector/repeat'
import { makeBlend } from '../vector/blend'
import { DEFAULT_POLYGON, DEFAULT_STAR, getLiveShape, makeLiveShape } from '../vector/shapes'
import { applyTextCurve, getTextCurve, isText } from '../text/curve'
import { collectColors, documentColors, placePalette, Recolor, toHex, parse } from '../color/colors'
import { getRepeat } from '../vector/repeat'
import { getBlend } from '../vector/blend'
import { buildVisual, type VisualSpec } from './visual'
import { applyGenerator } from '../subject/apply'

type Obj = fabric.FabricObject & { isArtboard?: boolean; name?: string; isClipMask?: boolean; warpCorners?: unknown }
const nameOf = (o: fabric.FabricObject) => String(o.get('name') ?? '')
const isBoard = (o: fabric.FabricObject) => !!(o as Obj).isArtboard
const isLabel = (o: fabric.FabricObject) => nameOf(o).startsWith('label_')
const elements = (c: fabric.Canvas) => c.getObjects().filter(o => !isBoard(o) && !isLabel(o) && !o.excludeFromExport)

const KIND: Record<string, string> = {
  rect: 'rettangolo', circle: 'cerchio', ellipse: 'ellisse', triangle: 'triangolo', path: 'tracciato', polygon: 'poligono',
  polyline: 'spezzata', line: 'linea', textbox: 'testo', 'i-text': 'testo', text: 'testo', image: 'immagine', group: 'gruppo',
}

/** Ogni elemento ha un ID unico (il suo nome): se manca o è doppio, ne riceve uno. */
export function ensureIds(c: fabric.Canvas) {
  const seen = new Set<string>()
  const count: Record<string, number> = {}
  for (const o of c.getObjects()) {
    if (isLabel(o)) continue
    let n = nameOf(o).trim()
    if (!n || seen.has(n)) {
      const base = (KIND[o.type] ?? o.type).replace(/\s+/g, '_')
      do { count[base] = (count[base] ?? 0) + 1; n = `${base}_${count[base]}` } while (seen.has(n))
      o.set('name', n)
    }
    seen.add(n)
  }
}

const r = (n: number) => Math.round(n)
const colorText = (v: unknown) => (typeof v === 'string' ? (parse(v) ? toHex(parse(v)!) : v) : v instanceof fabric.Gradient ? 'sfumatura' : '—')

function describe(o: fabric.FabricObject, origin: { x: number; y: number }) {
  const b = o.getBoundingRect()
  const parts = [`[${nameOf(o)}] ${KIND[o.type] ?? o.type}`, `x${r(b.left - origin.x)} y${r(b.top - origin.y)} ${r(b.width)}×${r(b.height)}`]
  if (isText(o)) {
    const t = o as fabric.Textbox
    const txt = t.text.length > 80 ? t.text.slice(0, 77) + '…' : t.text
    parts.push(`"${txt.replace(/\n/g, ' / ')}"`, `${t.fontFamily} ${r(t.fontSize * t.scaleY)}px`, `colore ${colorText(t.fill)}`)
    const curve = getTextCurve(o); if (curve) parts.push(`curvo ${curve}`)
  } else if (o.type !== 'image' && o.type !== 'group') {
    parts.push(`riempimento ${colorText(o.fill)}`)
    if (o.stroke && o.strokeWidth) parts.push(`tratto ${colorText(o.stroke)} ${o.strokeWidth}px`)
  }
  const live = getLiveShape(o); if (live) parts.push(`${live.kind === 'star' ? 'stella' : 'poligono'} ${live.sides} lati`)
  const rep = getRepeat(o); if (rep) parts.push(`ripetizione ${rep.kind}`)
  if (getBlend(o) !== undefined) parts.push('fusione')
  if ((o as Obj).isClipMask || o.clipPath) parts.push('mascherato')
  if (o.angle) parts.push(`ruotato ${r(o.angle)}°`)
  if (o.opacity < 1) parts.push(`opacità ${Math.round(o.opacity * 100)}%`)
  return '- ' + parts.join(' · ')
}

/** Stato del canvas per il modello: tavole, elementi con ID, posizione relativa alla tavola, colori. */
export function describeCanvas(c: fabric.Canvas, max = 160) {
  ensureIds(c)
  const boards = listBoards(c)
  const placed = new Set<fabric.FabricObject>()
  const lines: string[] = [`Il progetto contiene ${boards.length} tavole. Gli ID tra [ ] servono a updateCanvasElements, deleteElements ed editDesign. Coordinate in px relative alla tavola.`]
  let n = 0
  for (const ab of boards) {
    const kids = childrenOf(c, ab)
    lines.push('', `## Tavola [${nameOf(ab)}] "${boardLabel(ab)}" ${r(ab.width * ab.scaleX)}×${r(ab.height * ab.scaleY)} · sfondo ${colorText(ab.fill)}`)
    const b = ab.getBoundingRect()
    for (const o of kids) { placed.add(o); if (n++ < max) lines.push(describe(o, { x: b.left, y: b.top })) }
  }
  const loose = elements(c).filter(o => !placed.has(o))
  if (loose.length) {
    lines.push('', '## Fuori dalle tavole (coordinate assolute)')
    for (const o of loose) if (n++ < max) lines.push(describe(o, { x: 0, y: 0 }))
  }
  if (n > max) lines.push(`… altri ${n - max} elementi non elencati`)
  const palette = documentColors(c).slice(0, 12).map(u => u.hex)
  if (palette.length) lines.push('', `Colori del documento: ${palette.join(', ')}`)
  return lines.join('\n')
}

// ── esecuzione ──────────────────────────────────────────────────────────────

function find(c: fabric.Canvas, id: string) {
  const clean = id.replace(/['"[\]]/g, '').trim()
  const all = c.getObjects()
  return all.find(o => nameOf(o) === clean) ?? all.find(o => nameOf(o).toLowerCase() === clean.toLowerCase())
}

function pick(c: fabric.Canvas, list: string[]) {
  const found = list.map(i => find(c, i)).filter((o): o is fabric.FabricObject => !!o)
  const missing = list.filter(i => !find(c, i))
  return { found: [...new Set(found)], missing }
}

function select(c: fabric.Canvas, objs: fabric.FabricObject[]) {
  c.discardActiveObject()
  if (objs.length === 1) c.setActiveObject(objs[0])
  else if (objs.length > 1) {
    const all = c.getObjects()
    c.setActiveObject(new fabric.ActiveSelection(objs.slice().sort((a, b) => all.indexOf(a) - all.indexOf(b)), { canvas: c }))
  }
}

const boardByName = (c: fabric.Canvas, name?: string) => {
  if (!name) return listBoards(c)[0]
  return listBoards(c).find(b => nameOf(b) === name || boardLabel(b) === name) ?? listBoards(c).find(b => boardLabel(b).toLowerCase() === name.toLowerCase())
}

async function runOne(c: fabric.Canvas, op: DesignOp): Promise<string> {
  switch (op.op) {
    case 'align': {
      const { found } = pick(c, op.ids)
      if (!found.length) return 'nessun elemento'
      if (op.to === 'board' || found.length === 1) found.forEach(o => { select(c, [o]); alignObjects(c, op.mode) })
      else { select(c, found); alignObjects(c, op.mode) }
      return `allineati ${found.length}`
    }
    case 'distribute': {
      const { found } = pick(c, op.ids)
      if (found.length < 3) return 'servono almeno 3 elementi'
      select(c, found); distributeObjects(c, op.axis)
      return `distribuiti ${found.length}`
    }
    case 'pathfinder': {
      const { found } = pick(c, op.ids)
      select(c, found)
      return runPathOp(c, op.mode) ?? `${op.mode} → [${nameOf(c.getActiveObject()!)}]`
    }
    case 'offset': {
      const o = find(c, op.id); if (!o) return 'elemento non trovato'
      select(c, [o])
      const keep = op.keepOriginal ?? true
      return offsetSelection(c, op.distance, keep, op.color ?? (keep ? '#ffffff' : undefined)) ?? 'contorno creato'
    }
    case 'repeat': {
      const o = find(c, op.id); if (!o) return 'elemento non trovato'
      const g = await makeRepeat(c, o, op.kind)
      if (!g) return 'non ripetibile'
      const patch: Partial<RepeatSpec> = {}
      for (const k of ['count', 'radius', 'rotate', 'cols', 'rows', 'gapX', 'gapY', 'brick', 'flip', 'axis', 'gap'] as const)
        if (op[k as keyof typeof op] !== undefined) (patch as Record<string, unknown>)[k] = op[k as keyof typeof op]
      if (Object.keys(patch).length) await updateRepeat(c, c.getActiveObject()!, patch)
      return `ripetizione ${op.kind}`
    }
    case 'blend': {
      const { found } = pick(c, op.ids)
      if (found.length !== 2) return 'servono due elementi'
      select(c, found)
      return (await makeBlend(c, op.steps ?? 6)) ?? 'fusione creata'
    }
    case 'shape': {
      const ab = op.board ? boardByName(c, op.board) : undefined
      const b = ab?.getBoundingRect()
      const base = op.kind === 'star' ? DEFAULT_STAR : DEFAULT_POLYGON
      const s = makeLiveShape({ ...base, ...(op.sides ? { sides: op.sides } : {}), ...(op.inner ? { inner: op.inner } : {}), ...(op.round !== undefined ? { round: op.round } : {}) },
        { x: (b?.left ?? 0) + op.x, y: (b?.top ?? 0) + op.y }, { fill: op.color ?? '#1d3557' })
      const k = op.size / 200
      s.set({ scaleX: k, scaleY: k })
      s.setPositionByOrigin(new fabric.Point((b?.left ?? 0) + op.x, (b?.top ?? 0) + op.y), 'center', 'center')
      if (op.name) s.set('name', op.name)
      c.add(s); s.setCoords(); c.setActiveObject(s)
      return `forma creata`
    }
    case 'curveText': {
      const o = find(c, op.id)
      if (!o || !isText(o)) return 'testo non trovato'
      await applyTextCurve(c, o, op.curve)
      return `testo curvato ${op.curve}`
    }
    case 'mask': {
      const { found } = pick(c, op.ids)
      if (found.length < 2) return 'servono almeno due elementi'
      select(c, found)
      await makeClipMask(c)
      return 'maschera creata'
    }
    case 'recolor': {
      const objs = op.ids ? pick(c, op.ids).found : elements(c)
      if (!objs.length) return 'nessun elemento'
      const rc = new Recolor(objs)
      const map: Record<string, string> = {}
      if (op.palette?.length) Object.assign(map, rc.mapToPalette(op.palette))
      if (op.map) for (const [from, to] of Object.entries(op.map)) {
        const p = parse(from); if (!p) continue
        const hex = toHex(p)
        rc.colors.filter(u => u.hex === hex).forEach(u => { map[u.key] = to })
      }
      const touched = rc.apply(map, { hue: op.hue ?? 0, sat: op.saturation ?? 0, light: op.lightness ?? 0 })
      touched.forEach(o => c.fire('object:modified', { target: o.group && !(o.group instanceof fabric.ActiveSelection) ? o.group : o }))
      return `ricolorati ${collectColors(objs).length} colori`
    }
    case 'palette': {
      const ab = boardByName(c, op.board)
      const b = ab?.getBoundingRect()
      const at = op.x !== undefined && op.y !== undefined
        ? { x: (b?.left ?? 0) + op.x, y: (b?.top ?? 0) + op.y }
        : b ? { x: b.left + b.width / 2, y: b.top + b.height + 90 } : { x: 400, y: 400 }
      placePalette(c, op.colors, at)
      return 'palette messa sul canvas'
    }
    case 'layer': {
      const o = find(c, op.id); if (!o) return 'elemento non trovato'
      const all = c.getObjects(), i = all.indexOf(o)
      // mai sotto la tavola né sotto il suo rettangolo di sfondo (un figlio che la copre quasi tutta)
      const ab = boardOf(c, o)
      let floor = ab ? all.indexOf(ab) + 1 : 0
      if (ab) {
        const B = ab.getBoundingRect(), A = B.width * B.height
        for (const k of childrenOf(c, ab)) {
          if (k === o) continue
          const r = k.getBoundingRect()
          const w = Math.min(r.left + r.width, B.left + B.width) - Math.max(r.left, B.left), h = Math.min(r.top + r.height, B.top + B.height) - Math.max(r.top, B.top)
          if (w > 0 && h > 0 && w * h > A * 0.85) floor = Math.max(floor, all.indexOf(k) + 1)
        }
      }
      if (i < floor) floor = i
      const to = op.to === 'front' ? all.length - 1 : op.to === 'back' ? floor : op.to === 'forward' ? Math.min(all.length - 1, i + 1) : Math.max(floor, i - 1)
      c.moveObjectTo(o, to)
      c.fire('object:modified', { target: o })
      return `livello ${op.to}`
    }
    case 'subject': {
      const o = find(c, op.id); if (!o) return 'elemento non trovato'
      const { generator, id: _id, op: _op, ...params } = op
      void _id; void _op
      const res = await applyGenerator(c, o, generator, params)
      return typeof res === 'string' ? res : `${generator} → [${nameOf(res)}]`
    }
    case 'visual': {
      const ab = boardByName(c, op.board)
      const res = await buildVisual(c, ab, { ...op, arrangement: op.arrangement as VisualSpec['arrangement'] })
      return typeof res === 'string' ? res : `visual [${nameOf(res)}]`
    }
    case 'export': {
      const only = op.boards?.map(n => boardByName(c, n)).filter((b): b is fabric.FabricObject => !!b)
      await exportBoards(c, { format: op.format, multiplier: op.scale ?? 2 }, only?.length ? only : undefined)
      return `esportato ${op.format}`
    }
  }
}

/** Esegue le operazioni in ordine; una che fallisce non ferma le altre. */
export async function runDesignOps(c: fabric.Canvas, ops: DesignOp[]): Promise<string[]> {
  ensureIds(c)
  const out: string[] = []
  for (const op of ops ?? []) {
    try {
      const res = await runOne(c, op)
      out.push(`${op.op}: ${res}`)
    } catch (e) {
      out.push(`${op.op}: errore ${(e as Error).message}`)
    }
  }
  ensureIds(c)
  c.requestRenderAll()
  return out
}
