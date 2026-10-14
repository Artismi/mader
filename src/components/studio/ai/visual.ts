/**
 * Visual: sorgente × trattamento × disposizione, per immagini d'impatto fatte con
 * gli strumenti dello Studio (non con foto prese a caso).
 *
 * - sorgente: un glifo/forma vettoriale, una parola, un PNG dei pack dell'utente,
 *   o un generatore procedurale della scheda Genera
 * - trattamento: ricette curate del motore effetti (materiale 3D + filtri): il 3D
 *   lavora sulla sagoma, quindi va su vettori, testi e PNG scontornati
 * - disposizione: protagonista, raggiera, pioggia, specchio, griglia, eco
 *
 * Tutto deterministico: stesso seme, stesso visual. L'IA lo chiede per nome
 * (op "visual" di editDesign, o "visual" di composeDesign).
 */
import * as fabric from 'fabric'
import { applyFx } from '../fx/engine'
import { fxDef, newFx, type FxEntry, type FxId } from '../fx/catalog'
import { SHAPE_LIBRARY } from '../libraries/shape-library'
import { childrenOf } from '../arrange/artboards'
import { boardTopLeft } from './board-fit'
import { loadLibrary, FINISHES } from './finish'

export interface VisualSpec {
  /** 'glifo:Sparkle' · 'testo:ACID' · 'pack:y2k' (finitura, pack o categoria) · 'genera:membrana' */
  source: string
  treatment?: string
  arrangement?: 'solo' | 'raggiera' | 'pioggia' | 'specchio' | 'griglia' | 'eco'
  /** px rispetto alla tavola; predefinito il centro */
  x?: number; y?: number
  /** lato del visual in px; predefinito 62% del lato corto della tavola */
  size?: number
  angle?: number
  color?: string
  count?: number
  opacity?: number
  /** dietro ai testi (predefinito) o sopra tutto */
  front?: boolean
  seed?: string
}

type Step = [FxId | string, string?, Record<string, number | string>?]

/** Trattamenti curati: ordine = ordine di applicazione (prima le distorsioni, poi la materia, poi la luce). */
export const TREATMENTS: Record<string, { label: string; steps: Step[] }> = {
  cromo: { label: 'cromo liquido', steps: [['material3d', 'cromo'], ['bloom', 'sognante']] },
  oro: { label: 'oro', steps: [['material3d', 'oro'], ['outerGlow', 'caldo']] },
  vetro: { label: 'vetro', steps: [['material3d', 'vetro'], ['chroma', 'leggera']] },
  gonfio: { label: 'gonfiabile', steps: [['material3d', 'gonfio'], ['dropShadow', 'morbida']] },
  olografico: { label: 'olografico', steps: [['material3d', 'olografico'], ['glitter', 'argento']] },
  ceramica: { label: 'ceramica', steps: [['material3d', 'ceramica'], ['dropShadow', 'contatto']] },
  neon: { label: 'tubo neon', steps: [['material3d', 'neon'], ['outerGlow', 'aura']] },
  tramonto: { label: 'tramonto', steps: [['material3d', 'tramonto'], ['lightLeak', 'ambra']] },
  liquido: { label: 'metallo fuso', steps: [['twirl', 'orario'], ['material3d', 'cromo']] },
  caleido: { label: 'caleidoscopio', steps: [['caleido', 'rosone'], ['material3d', 'vetro']] },
  prisma: { label: 'prisma', steps: [['vetro', 'prisma'], ['chroma', 'forte']] },
  retino: { label: 'retino pop', steps: [['halftone', 'pop']] },
  riso: { label: 'risograph', steps: [['riso', 'rosablu']] },
  glitch: { label: 'glitch', steps: [['glitch', 'rgb'], ['chroma', 'forte']] },
  estruso: { label: 'estruso retrò', steps: [['extrude', 'retro'], ['dropShadow', 'netta']] },
  eco: { label: 'eco', steps: [['echo', 'scia']] },
  linocut: { label: 'linoleum', steps: [['linocut', 'nero']] },
  foil: { label: 'lamina', steps: [['foil', 'olografico']] },
  piatto: { label: 'piatto', steps: [] },
}

const hash = (t: string) => [...t].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7) >>> 0
function rng(seed: number) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '')
const ALL_SHAPES = Object.values(SHAPE_LIBRARY as Record<string, { name: string; path: string }[]>).flat()
export const GLYPH_NAMES = ALL_SHAPES.map(s => s.name)

function findShape(name: string, R: () => number) {
  const n = norm(name)
  return ALL_SHAPES.find(s => norm(s.name) === n) ?? ALL_SHAPES.find(s => norm(s.name).includes(n))
    ?? (n ? undefined : ALL_SHAPES[Math.floor(R() * ALL_SHAPES.length)])
}

/** Un esemplare della sorgente, alto/largo `size` px, centrato in (0,0). */
async function makeSource(src: string, size: number, color: string, R: () => number): Promise<fabric.FabricObject | string> {
  const [kind, ...rest] = src.split(':')
  const arg = rest.join(':').trim()
  if (kind === 'testo') {
    const t = new fabric.FabricText(arg || 'ACID', { fontFamily: 'Archivo Black', fontSize: 200, fill: color, originX: 'center', originY: 'center' })
    t.scale(size / Math.max(t.width, t.height))
    return t
  }
  if (kind === 'pack') {
    const m = await loadLibrary() as { items: { id: string; pack: string; src: string; alpha: boolean }[]; packs: { id: string; cat: string }[] } | null
    if (!m?.items?.length) return 'Nessun pack importato: carica public/library'
    const fin = FINISHES[arg]
    const ids = fin ? fin.packs : m.packs.filter(p => p.id === arg || p.cat === arg).map(p => p.id)
    let pool = m.items.filter(i => (ids.length ? ids.includes(i.pack) : true) && i.alpha)
    if (!pool.length) pool = m.items.filter(i => i.id === arg)
    if (!pool.length) return `Nessun elemento scontornato per "${arg}"`
    const item = pool[Math.floor(R() * pool.length)]
    const img = await fabric.FabricImage.fromURL(item.src, { crossOrigin: 'anonymous' }).catch(() => null)
    if (!img) return 'Elemento non leggibile'
    img.set({ originX: 'center', originY: 'center' })
    img.scale(size / Math.max(img.width, img.height))
    return img
  }
  if (kind === 'genera') {
    // generatori procedurali (scheda Genera): pezzo scontornato, colore dal tono
    try {
      const mod = await import('../genera/recipes')
      const rc = mod.RECIPES.find(r => r.id === norm(arg)) ?? mod.RECIPES.find(r => r.piece) ?? mod.RECIPES[0]
      // risoluzione del generatore proporzionata alla misura del visual
      const canvasEl = mod.runRecipe(rc, mod.defaults(rc), hash(arg) % 100000, 'pezzo', Math.max(0.2, Math.min(0.8, size / 1500)))
      const img = new fabric.FabricImage(canvasEl, { originX: 'center', originY: 'center' })
      img.scale(size / Math.max(img.width, img.height))
      return img
    } catch (e) {
      return `Generatore non disponibile: ${(e as Error).message}`
    }
  }
  // glifo / forma vettoriale (predefinito)
  const shape = findShape(kind === 'glifo' || kind === 'forma' ? arg : src, R)
  if (!shape) return `Glifo "${arg || src}" non trovato`
  const p = new fabric.Path(shape.path, { fill: color, strokeWidth: 0, originX: 'center', originY: 'center' })
  p.scale(size / Math.max(p.width, p.height))
  return p
}

const clone = (o: fabric.FabricObject) => o.clone() as Promise<fabric.FabricObject>

async function arrange(base: fabric.FabricObject, how: VisualSpec['arrangement'], size: number, count: number, R: () => number) {
  const items: fabric.FabricObject[] = []
  const at = async (x: number, y: number, k: number, angle = 0, opacity = 1, flipX = false) => {
    const c = await clone(base)
    c.set({ left: x, top: y, scaleX: base.scaleX * k * (flipX ? -1 : 1), scaleY: base.scaleY * k, angle, opacity })
    items.push(c)
  }
  switch (how) {
    case 'raggiera': {
      const n = count || 8, r = size * 0.36
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; await at(Math.sin(a) * r, -Math.cos(a) * r, 0.34, (a * 180) / Math.PI) }
      break
    }
    case 'pioggia': {
      const n = count || 7
      for (let i = 0; i < n; i++) await at((R() - 0.5) * size, (R() - 0.5) * size, 0.18 + R() * 0.32, (R() - 0.5) * 50)
      break
    }
    case 'specchio': { await at(-size * 0.26, 0, 0.55); await at(size * 0.26, 0, 0.55, 0, 1, true); break }
    case 'griglia': {
      const n = Math.max(2, Math.round(Math.sqrt(count || 9))), step = size / n
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) await at((j - (n - 1) / 2) * step, (i - (n - 1) / 2) * step, 0.85 / n)
      break
    }
    case 'eco': {
      const n = count || 5
      for (let i = n - 1; i >= 0; i--) await at(0, 0, 1 - i * (0.7 / n), 0, i === 0 ? 1 : 0.25 + 0.5 * (1 - i / n))
      break
    }
    default: await at(0, 0, 1)
  }
  return items.length === 1 ? items[0] : new fabric.Group(items, { originX: 'center', originY: 'center' })
}

function treatment(o: fabric.FabricObject, id?: string) {
  const t = TREATMENTS[id ?? 'cromo'] ?? TREATMENTS.cromo
  const fx: FxEntry[] = []
  for (const [fid, variant, p] of t.steps) {
    if (!fxDef(fid)) continue
    const e = newFx(fid as FxId, variant)
    if (p) e.p = { ...e.p, ...p }
    fx.push(e)
  }
  ;(o as fabric.FabricObject & { fx?: FxEntry[] }).fx = fx
  applyFx(o)
}

/**
 * Il rettangolo libero più grande della tavola (dentro i margini), lontano da
 * testi, foto, bottoni e filetti: una griglia di celle, poi il rettangolo massimo
 * sull'istogramma delle celle libere.
 */
export function freeRect(canvas: fabric.Canvas, ab: fabric.FabricObject) {
  const tl = boardTopLeft(ab), W = ab.getScaledWidth(), H = ab.getScaledHeight()
  const m = Math.min(W, H) * 0.06, pad = Math.min(W, H) * 0.03
  const N = 32, cw = (W - 2 * m) / N, ch = (H - 2 * m) / N
  const B = { l: tl.x, t: tl.y, r: tl.x + W, b: tl.y + H }
  const busy: { l: number; t: number; r: number; b: number }[] = []
  for (const k of childrenOf(canvas, ab)) {
    if (k.excludeFromExport || (k.opacity ?? 1) < 0.35) continue
    const r = k.getBoundingRect()
    const area = Math.max(0, Math.min(r.left + r.width, B.r) - Math.max(r.left, B.l)) * Math.max(0, Math.min(r.top + r.height, B.b) - Math.max(r.top, B.t))
    if (area > W * H * 0.85) continue // lo sfondo
    busy.push({ l: r.left - pad, t: r.top - pad, r: r.left + r.width + pad, b: r.top + r.height + pad })
  }
  const free: boolean[][] = []
  for (let i = 0; i < N; i++) {
    free.push([])
    for (let j = 0; j < N; j++) {
      const x0 = tl.x + m + j * cw, y0 = tl.y + m + i * ch
      free[i].push(!busy.some(b => b.l < x0 + cw && b.r > x0 && b.t < y0 + ch && b.b > y0))
    }
  }
  // rettangolo massimo: istogramma delle altezze riga per riga; si preferiscono le forme quasi quadrate
  const hgt = new Array(N).fill(0)
  let best: { x: number; y: number; w: number; h: number } | null = null, bestScore = 0
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) hgt[j] = free[i][j] ? hgt[j] + 1 : 0
    for (let j = 0; j < N; j++) {
      let minH = Infinity
      for (let k = j; k < N && hgt[k] > 0; k++) {
        minH = Math.min(minH, hgt[k])
        const w = (k - j + 1) * cw, h = minH * ch
        const score = Math.min(w, h) ** 2 // conta il lato corto: il visual è quasi quadrato
        if (score > bestScore) { bestScore = score; best = { x: tl.x + m + j * cw, y: tl.y + m + (i - minH + 1) * ch, w, h } }
      }
    }
  }
  return best
}

/** Crea il visual sulla tavola (o al centro della vista). Restituisce l'oggetto o un messaggio. */
export async function buildVisual(canvas: fabric.Canvas, ab: fabric.FabricObject | undefined, spec: VisualSpec): Promise<fabric.FabricObject | string> {
  const R = rng(hash(spec.seed ?? `${spec.source}|${spec.treatment}|${spec.arrangement}`))
  const tl = ab ? boardTopLeft(ab) : new fabric.Point(0, 0)
  const W = ab ? ab.getScaledWidth() : canvas.getWidth(), H = ab ? ab.getScaledHeight() : canvas.getHeight()
  // dove: se non è indicato, nel rettangolo libero più grande (i testi restano leggibili)
  let cx = spec.x, cy = spec.y, size = spec.size
  if (ab && (cx === undefined || cy === undefined)) {
    const free = freeRect(canvas, ab)
    if (!free || Math.min(free.w, free.h) < Math.min(W, H) * 0.2) return 'Nessuno spazio libero per il visual: la tavola resta tipografica'
    cx = free.x - tl.x + free.w / 2; cy = free.y - tl.y + free.h / 2
    size = size ?? Math.min(free.w, free.h) * 0.9
  }
  size = size ?? Math.min(W, H) * 0.62
  const src = await makeSource(spec.source || 'glifo:', size, spec.color ?? '#d9d9d9', R)
  if (typeof src === 'string') return src
  const o = await arrange(src, spec.arrangement ?? 'solo', size, spec.count ?? 0, R)
  o.set({ angle: spec.angle ?? 0, opacity: spec.opacity ?? 1 })
  o.setPositionByOrigin(new fabric.Point(tl.x + (cx ?? W / 2), tl.y + (cy ?? H / 2)), 'center', 'center')
  o.set('name', `visual_${norm(spec.source).slice(0, 18) || 'glifo'}_${spec.treatment ?? 'cromo'}`)
  treatment(o, spec.treatment)
  o.setCoords()

  // dietro ai testi, sopra lo sfondo della tavola
  const all = canvas.getObjects()
  let at = all.length
  if (ab && !spec.front) {
    const kids = childrenOf(canvas, ab)
    const B = ab.getBoundingRect()
    const bg = kids.filter(k => { const r = k.getBoundingRect(); return r.width * r.height > B.width * B.height * 0.85 && !(k instanceof fabric.FabricText) })
    const firstText = kids.filter(k => k instanceof fabric.FabricText).map(k => all.indexOf(k)).sort((a, b) => a - b)[0]
    const floor = Math.max(all.indexOf(ab) + 1, ...bg.map(k => all.indexOf(k) + 1))
    at = firstText !== undefined ? Math.max(floor, firstText) : floor
  }
  canvas.insertAt(at, o)
  canvas.fire('object:modified', { target: o })
  canvas.requestRenderAll()
  return o
}
