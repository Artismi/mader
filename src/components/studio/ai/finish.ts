/**
 * Finiture con i pack dell'utente (public/library, importati con scripts/import-packs.py).
 * L'IA sceglie la finitura per nome; lo Studio la applica in modo procedurale e
 * deterministico (stesso contenuto, stessi asset):
 * - texture a tutta tavola in moltiplica (carta, grana, grunge, retini, halftone)
 * - luci in scherma a bassa opacità (light leak, polvere, graffi, plastica, vetro)
 * - elementi (simboli Y2K, segni a mano, forme, ritagli) negli spazi vuoti, mai sui testi
 *
 * Senza pack importati non fa nulla: la tavola resta quella pulita.
 */
import * as fabric from 'fabric'
import { childrenOf } from '../arrange/artboards'
import { boardTopLeft } from './board-fit'

interface PackInfo { id: string; name: string; cat: string; blend: string | null; count: number }
interface PackItem { id: string; pack: string; name: string; src: string; thumb: string; w: number; h: number; alpha: boolean }
interface Manifest { packs: PackInfo[]; items: PackItem[] }

let cache: Promise<Manifest | null> | null = null
export const loadLibrary = () => (cache ??= fetch('/library/manifest.json', { cache: 'no-store' })
  .then(r => (r.ok ? r.json() : null)).catch(() => null))

type Layer = 'texture' | 'luce' | 'elementi'
interface FinishDef { label: string; layer: Layer; packs: string[]; blend: GlobalCompositeOperation; opacity: [number, number] }

/** Le finiture: nome → pack preferiti (id di import-packs.py), modo di fusione, opacità. */
export const FINISHES: Record<string, FinishDef> = {
  carta: { label: 'carta stampata', layer: 'texture', packs: ['carte', 'paper-print', 'printed-paper', 'print-scanned', 'century'], blend: 'multiply', opacity: [0.35, 0.55] },
  grana: { label: 'grana colorata', layer: 'texture', packs: ['grana-colorata', 'retini-fini'], blend: 'multiply', opacity: [0.25, 0.4] },
  grunge: { label: 'grunge e ruggine', layer: 'texture', packs: ['grunge-ruggine', 'macchie', 'egypt'], blend: 'multiply', opacity: [0.3, 0.45] },
  retino: { label: 'halftone', layer: 'texture', packs: ['halftone', 'retini-fini'], blend: 'multiply', opacity: [0.25, 0.4] },
  luce: { label: 'light leak', layer: 'luce', packs: ['fotocopia'], blend: 'screen', opacity: [0.35, 0.6] },
  polvere: { label: 'polvere', layer: 'luce', packs: ['polvere'], blend: 'screen', opacity: [0.3, 0.5] },
  graffi: { label: 'graffi e usura', layer: 'luce', packs: ['graffi'], blend: 'screen', opacity: [0.3, 0.5] },
  fotocopia: { label: 'fotocopia', layer: 'luce', packs: ['fotocopia', 'graffi'], blend: 'screen', opacity: [0.45, 0.7] },
  plastica: { label: 'plastica', layer: 'luce', packs: ['plastica-nera'], blend: 'screen', opacity: [0.45, 0.7] },
  vetro: { label: 'vetro rotto', layer: 'luce', packs: ['vetro-rotto'], blend: 'screen', opacity: [0.35, 0.55] },
  strappi: { label: 'carta strappata', layer: 'luce', packs: ['carta-strappata', 'strappi-fumo'], blend: 'screen', opacity: [0.7, 0.9] },
  y2k: { label: 'simboli Y2K', layer: 'elementi', packs: ['y2k-simboli', 'y2k-forme', 'first-drop'], blend: 'source-over', opacity: [1, 1] },
  segni: { label: 'segni a mano', layer: 'elementi', packs: ['logo-hand-drawn', 'abstract-logo-shapes'], blend: 'source-over', opacity: [1, 1] },
  collage: { label: 'ritagli collage', layer: 'elementi', packs: ['collage', 'free-assets'], blend: 'source-over', opacity: [1, 1] },
}

const hash = (t: string) => [...t].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7) >>> 0
function rng(seed: number) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

function poolFor(m: Manifest, def: FinishDef) {
  const byPack = (ids: string[]) => m.items.filter(i => ids.includes(i.pack))
  let list = byPack(def.packs)
  if (!list.length) {
    // pack con altri nomi: si va per categoria e fusione
    const cat = def.layer === 'elementi' ? 'elementi' : def.layer === 'luce' ? 'luce' : 'texture'
    list = byPack(m.packs.filter(p => p.cat === cat).map(p => p.id))
  }
  return def.layer === 'elementi' ? list.filter(i => i.alpha) : list.filter(i => !i.alpha || def.layer === 'luce')
}

const load = (src: string) => fabric.FabricImage.fromURL(src, { crossOrigin: 'anonymous' }).catch(() => null)

type Box = { l: number; t: number; r: number; b: number }
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t))

/**
 * Applica le finiture alla tavola. Restituisce quante cose ha aggiunto.
 * `seed`: di solito titolo + nome tavola, così lo stesso contenuto dà lo stesso risultato.
 */
export async function applyFinish(canvas: fabric.Canvas, ab: fabric.FabricObject, finishes: string[], seed: string): Promise<number> {
  const m = await loadLibrary()
  if (!m?.items?.length || !finishes.length) return 0
  const R = rng(hash(seed))
  const tl = boardTopLeft(ab), W = ab.getScaledWidth(), H = ab.getScaledHeight()
  const kids = childrenOf(canvas, ab)
  const texts = kids.filter(o => o instanceof fabric.FabricText).map(o => { const r = o.getBoundingRect(); return { l: r.left, t: r.top, r: r.left + r.width, b: r.top + r.height } })
  const top = Math.max(...kids.map(o => canvas.getObjects().indexOf(o)), canvas.getObjects().indexOf(ab))
  let added = 0
  const name = String(ab.get('name') ?? 'tavola')

  for (const id of finishes.slice(0, 3)) {
    const def = FINISHES[id]
    if (!def) continue
    const pool = poolFor(m, def)
    if (!pool.length) continue

    if (def.layer === 'elementi') {
      // 1-3 accenti negli spazi liberi: si prova una griglia di posizioni e si tengono quelle lontane dai testi
      const count = 1 + Math.floor(R() * 3)
      const placed: Box[] = []
      for (let k = 0; k < count; k++) {
        const item = pool[Math.floor(R() * pool.length)]
        const img = await load(item.src)
        if (!img) continue
        const size = Math.min(W, H) * (0.12 + R() * 0.12)
        const s = size / Math.max(img.width, img.height)
        const w = img.width * s, h = img.height * s
        let best: Box | null = null
        for (let tries = 0; tries < 40 && !best; tries++) {
          const x = tl.x + W * 0.04 + R() * (W * 0.92 - w), y = tl.y + H * 0.04 + R() * (H * 0.92 - h)
          const box = { l: x, t: y, r: x + w, b: y + h }
          if (texts.some(t => overlap(t, box) > 0) || placed.some(p => overlap(p, box) > 0)) continue
          best = box
        }
        if (!best) continue
        img.set({ originX: 'left', originY: 'top', left: best.l, top: best.t, scaleX: s, scaleY: s, angle: (R() - 0.5) * 24 })
        img.set('name', `${name}_finitura_${id}_${k + 1}`)
        canvas.insertAt(top + 1 + added, img); added++
        placed.push(best)
      }
      continue
    }

    // texture e luci: a coprire tutta la tavola, ruotate di 0/180° per variare
    const item = pool[Math.floor(R() * pool.length)]
    const img = await load(item.src)
    if (!img) continue
    const s = Math.max(W / img.width, H / img.height)
    const flip = R() < 0.5
    img.set({
      originX: 'center', originY: 'center', left: tl.x + W / 2, top: tl.y + H / 2, scaleX: s, scaleY: s, angle: flip ? 180 : 0,
      opacity: def.opacity[0] + R() * (def.opacity[1] - def.opacity[0]), globalCompositeOperation: def.blend,
      selectable: true,
    })
    img.set('name', `${name}_finitura_${id}`)
    // le texture sopra tutto (danno l'effetto stampato anche ai testi), le luci in cima
    canvas.insertAt(top + 1 + added, img); added++
  }
  canvas.requestRenderAll()
  return added
}
