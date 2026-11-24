/**
 * Gli strumenti di Creative OS visti dall'artista. Ogni strumento sa proporre
 * un gesto (parametri scelti dal caso, dall'intenzione e dall'umore) e
 * applicarlo al foglio. Lo stesso strumento, usato da intenzioni diverse,
 * fa gesti diversi: il "senso" di uno strumento lo impara usandolo.
 */
import { RECIPES, TONES, runRecipe, shuffle as shuffleParams, defaults, type Tone } from '@/components/studio/genera/recipes'
import { renderFx } from '@/components/studio/fx/render'
import { FX_DEFS, LOOKS, newFx, type FxId } from '@/components/studio/fx/catalog'
import { FACES, loadLabFonts, perCarattere, type FaceId } from '@/components/studio/genera/fonts'
import { fontCss, type Face } from '@/components/studio/genera/raster'
import { pick, range, chance, type Rnd } from '../core/rng'
import type { Intention, Mood, ShaderSource } from '../core/types'
import { tempoDi, finestra } from './tempo'
export { tempoDi, finestra }
import { newCanvas, withLayer, replaceLayer, fullLayer, flatten, sfuma, type Sheet, type Layer, type Blend } from './sheet'
import { runShader } from './shader'
import { NUOVI } from './tools2'
import { MONDI } from './tools3'

export interface ToolCtx {
  r: Rnd
  tone: Tone
  intention: Intention
  mood: Mood
  /** testo che la voce propone di scrivere sull'opera */
  say: () => string
  shaders: ShaderSource[]
  /** scala di lavoro delle ricette (anteprima veloce) */
  quality: number
  /** il testo lo mette la regia alla fine: lo studio non scrive */
  noText?: boolean
  /** il linguaggio permette il testo come immagine (parola gigante, barre, tessiture di frasi) */
  tipoOk?: boolean
  /** la tavolozza della sequenza */
  colori?: string[]
  /** numeri suoi da mettere in grafico (fiducia, letture…) */
  dati?: { label: string; v: number }[]
  /** strumenti preferiti dal linguaggio in uso */
  preferiti?: string[]
  /** il tempo del generatore: crescita (0 = niente, 1 = finito) e fase (la sua vita, ciclica). Senza: finito e fermo */
  tempo?: { crescita: number; fase: number }
}

export type Params = Record<string, unknown>

export interface Tool {
  id: string
  label: string
  /** che cosa fa, in termini di poetica: le voci e le intenzioni ragionano su questo */
  nature: 'segno' | 'materia' | 'struttura' | 'parola' | 'vuoto' | 'ripetizione' | 'trasformazione' | 'luce'
  /** le misure che lo strumento tende a muovere (ipotesi iniziale, poi corretta dall'esperienza) */
  pushes: Record<string, number>
  available: (s: Sheet, c: ToolCtx) => boolean
  propose: (s: Sheet, c: ToolCtx) => Params
  apply: (s: Sheet, p: Params, c: ToolCtx) => Promise<Sheet>
}

let nextId = 0
const lid = () => `l${Date.now().toString(36)}${(nextId++).toString(36)}`
const colorOf = (t: Tone, r: Rnd) => pick(r, [t.ink, t.ink, t.acc, t.bg])
const LOCKED = new Set(['testo', 'firma', 'piastra', 'mappa', 'etichette'])
const free = (s: Sheet) => { const xs = s.layers.filter(l => !LOCKED.has(l.kind)); return xs.length ? xs : s.layers }
const someLayer = (s: Sheet, r: Rnd) => { const xs = free(s); return xs[Math.floor(r() * xs.length)] }

// ─── segno: ricette del laboratorio ─────────────────────────────────────────
const semina: Tool = {
  id: 'semina', label: 'Ricetta', nature: 'segno',
  pushes: { densita: 0.3, complessita: 0.2, elementi: 0.2 },
  available: () => true,
  propose: (s, c) => {
    const rc = pick(c.r, c.noText ? RECIPES.filter(x => !x.params.some(p => p.type === 'text')) : RECIPES)
    const seed = Math.floor(c.r() * 1e9)
    return {
      recipe: rc.id, seed, values: shuffleParams(rc, defaults(rc), seed),
      piece: c.noText ? false : rc.piece || chance(c.r, s.layers.length ? 0.7 : 0.3),
      x: range(c.r, 0.2, 0.8), y: range(c.r, 0.2, 0.8),
      scale: range(c.r, 0.35, 1.1), rot: chance(c.r, 0.3) ? range(c.r, -0.6, 0.6) : 0,
      blend: chance(c.r, 0.25) ? pick(c.r, ['multiply', 'screen', 'difference', 'overlay']) : 'source-over',
    }
  },
  apply: async (s, p, c) => {
    const rc = RECIPES.find(x => x.id === p.recipe)
    if (!rc) return s
    const values = { ...(p.values as Record<string, number | string | boolean>) }
    // il testo delle ricette tipografiche lo decide la voce
    for (const prm of rc.params) if (prm.type === 'text') values[prm.key] = c.say()
    await loadLabFonts()
    const canvas = runRecipe(rc, values, p.seed as number, p.piece ? 'pezzo' : '4:5', c.quality)
    if (!p.piece) return withLayer(s, fullLayer(s, lid(), 'ricetta', canvas, p.blend as Blend))
    return withLayer(s, { id: lid(), kind: 'ricetta', canvas: sfuma(canvas, 0.14), x: p.x as number, y: p.y as number, scale: p.scale as number, rot: p.rot as number, alpha: 1, blend: p.blend as Blend })
  },
}

// ─── materia: effetti del pannello fx ───────────────────────────────────────
const FX_POOL = FX_DEFS.filter(d => d.cat !== 'Testo' || d.id === 'glitch' || d.id === 'echo')
const materia: Tool = {
  id: 'materia', label: 'Effetto', nature: 'materia',
  pushes: { complessita: 0.2, bordi: 0.1, saturazione: 0.1 },
  available: s => s.layers.length > 0,
  propose: (s, c) => {
    const d = pick(c.r, FX_POOL)
    const v = d.variants.length ? pick(c.r, d.variants).id : undefined
    return { layer: someLayer(s, c.r).id, fx: d.id, variant: v, amount: Math.round(range(c.r, 50, 100)) }
  },
  apply: async (s, p) => {
    const l = s.layers.find(x => x.id === p.layer)
    if (!l) return s
    const entry = { ...newFx(p.fx as FxId, p.variant as string | undefined), amount: p.amount as number }
    const out = newCanvas(l.canvas.width, l.canvas.height)
    const ok = renderFx(l.canvas, out, { fx: [entry] }, 1, 0)
    return ok ? replaceLayer(s, l.id, { canvas: out }) : s
  },
}

const luce: Tool = {
  id: 'luce', label: 'Look', nature: 'luce',
  pushes: { saturazione: 0.1, contrasto: 0.1 },
  available: s => s.layers.length > 0,
  propose: (s, c) => ({ layer: someLayer(s, c.r).id, look: pick(c.r, LOOKS).id, amount: Math.round(range(c.r, 40, 100)) }),
  apply: async (s, p) => {
    const l = s.layers.find(x => x.id === p.layer)
    if (!l) return s
    const out = newCanvas(l.canvas.width, l.canvas.height)
    const ok = renderFx(l.canvas, out, { look: { id: p.look as string, amount: p.amount as number } }, 1, 0)
    return ok ? replaceLayer(s, l.id, { canvas: out }) : s
  },
}

// ─── struttura: geometrie ───────────────────────────────────────────────────
const geometria: Tool = {
  id: 'geometria', label: 'Forma geometrica', nature: 'struttura',
  pushes: { superfici: 0.3, simmetria: 0.1, bordi: 0.1 },
  available: () => true,
  propose: (s, c) => ({
    // una forma che sta nella composizione: sui terzi, dritta (o a 45°), sottile; piena solo il cerchio (mai un blocco ruotato a caso)
    shape: pick(c.r, ['cerchio', 'cerchio', 'arco', 'linea', 'rettangolo', 'croce']),
    x: pick(c.r, [1 / 3, 0.5, 2 / 3]), y: pick(c.r, [1 / 3, 0.5, 2 / 3]), size: range(c.r, 0.1, 0.38),
    rot: pick(c.r, [0, 0, Math.PI / 2, Math.PI / 4]), fill: false, stroke: range(c.r, 1, 3.5),
    color: colorOf(c.tone, c.r), alpha: range(c.r, 0.6, 1),
    blend: chance(c.r, 0.2) ? 'difference' : 'source-over',
  }),
  apply: async (s, p, c) => {
    const T = tempoDi(c)
    const S = 1024, cv = newCanvas(S, S), g = cv.getContext('2d')!
    g.translate(S / 2, S / 2)
    // vita: respira; crescita: il contorno si traccia, poi la forma si riempie
    const resp = 1 + Math.sin(T.fase * 6.283) * 0.03; g.scale(resp, resp)
    const traccia = Math.min(1, T.crescita / 0.7), riempi = Math.max(0, (T.crescita - 0.6) / 0.4)
    g.fillStyle = g.strokeStyle = p.color as string
    g.lineWidth = (p.stroke as number) * 3
    g.lineCap = 'butt'
    const R = S * 0.45
    g.beginPath()
    switch (p.shape) {
      case 'cerchio': g.arc(0, 0, R, 0, Math.PI * 2); break
      case 'rettangolo': g.rect(-R, -R * 0.62, R * 2, R * 1.24); break
      case 'linea': g.moveTo(-R, 0); g.lineTo(R, 0); break
      case 'triangolo': g.moveTo(0, -R); g.lineTo(R * 0.87, R * 0.5); g.lineTo(-R * 0.87, R * 0.5); g.closePath(); break
      case 'arco': g.arc(0, 0, R, Math.PI * 0.1, Math.PI * 1.2); break
      case 'croce': g.moveTo(-R, 0); g.lineTo(R, 0); g.moveTo(0, -R); g.lineTo(0, R); break
    }
    const pieno = p.fill && p.shape !== 'linea' && p.shape !== 'arco' && p.shape !== 'croce'
    if (traccia < 1 || (pieno && riempi < 1)) {
      // il contorno tracciato in parte (tratteggio lungo quanto la crescita), il riempimento che sale di opacità
      const L = R * 8
      g.save(); g.setLineDash([L * traccia, L]); g.lineWidth = Math.max(4, (p.stroke as number) * 3); g.stroke(); g.restore()
      if (pieno && riempi > 0) { g.globalAlpha = riempi; g.fill() }
    } else if (pieno) g.fill(); else g.stroke()
    return withLayer(s, { id: lid(), kind: 'geometria', canvas: cv, x: p.x as number, y: p.y as number, scale: p.size as number, rot: p.rot as number, alpha: p.alpha as number, blend: p.blend as Blend })
  },
}

// ─── ripetizione: pattern ───────────────────────────────────────────────────
const pattern: Tool = {
  id: 'pattern', label: 'Pattern', nature: 'ripetizione',
  pushes: { complessita: 0.2, simmetria: 0.2, densita: 0.15 },
  available: () => true,
  propose: (s, c) => ({
    kind: pick(c.r, ['righe', 'punti', 'griglia', 'onde', 'tratteggio', 'scacchi']),
    step: range(c.r, 10, 60), angle: range(c.r, 0, Math.PI), weight: range(c.r, 1, 8),
    color: colorOf(c.tone, c.r), alpha: range(c.r, 0.25, 0.9),
    region: chance(c.r, 0.5) ? 'tutto' : pick(c.r, ['sinistra', 'destra', 'alto', 'basso', 'centro']),
    blend: chance(c.r, 0.3) ? 'multiply' : 'source-over',
  }),
  apply: async (s, p, c) => {
    const T = tempoDi(c)
    const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
    g.save()
    const reg = p.region as string
    const rx = reg === 'destra' ? s.W / 2 : 0, ry = reg === 'basso' ? s.H / 2 : 0
    const rw = reg === 'sinistra' || reg === 'destra' ? s.W / 2 : s.W, rh = reg === 'alto' || reg === 'basso' ? s.H / 2 : s.H
    void rx; void ry; void rw; void rh
    g.translate(s.W / 2, s.H / 2); g.rotate(p.angle as number); g.translate(-s.W, -s.H)
    g.fillStyle = g.strokeStyle = p.color as string
    g.lineWidth = p.weight as number
    const st = p.step as number, L = Math.max(s.W, s.H) * 2
    // vita: il pattern scorre di un passo per ciclo di fase; crescita: le righe si tracciano una dopo l'altra, ognuna da sinistra
    const off = (T.fase % 1) * st, nR = Math.ceil(L / st)
    g.translate(0, off)
    const riga = (k: number) => finestra(T.crescita, k, nR, 0.6)
    switch (p.kind) {
      case 'righe': for (let y = 0, k = 0; y < L; y += st, k++) { const f = riga(k); if (f <= 0) continue; g.beginPath(); g.moveTo(0, y); g.lineTo(L * f, y); g.stroke() } break
      case 'punti': for (let y = 0, k = 0; y < L; y += st, k++) { const f = riga(k); if (f <= 0) continue; for (let x = 0; x < L * f; x += st) { g.beginPath(); g.arc(x + (y / st % 2) * st / 2, y, (p.weight as number) * 1.2 * (1 + 0.15 * T.a * Math.sin(T.fase * 6.283 + x * 0.01)), 0, Math.PI * 2); g.fill() } } break
      case 'griglia': for (let v = 0, k = 0; v < L; v += st, k++) { const f = riga(k); if (f <= 0) continue; g.beginPath(); g.moveTo(0, v); g.lineTo(L * f, v); g.moveTo(v, 0); g.lineTo(v, L * f); g.stroke() } break
      case 'onde': for (let y = 0, k = 0; y < L; y += st, k++) { const f = riga(k); if (f <= 0) continue; g.beginPath(); for (let x = 0; x <= L * f; x += 8) g.lineTo(x, y + Math.sin(x / st + T.fase * 6.283) * st * 0.35); g.stroke() } break
      case 'tratteggio': for (let v = -L, k = 0; v < L; v += st, k++) { const f = finestra(T.crescita, k, Math.ceil(2 * L / st), 0.6); if (f <= 0) continue; g.beginPath(); g.moveTo(v, 0); g.lineTo(v + L * f, L * f); g.stroke(); g.beginPath(); g.moveTo(v + L, 0); g.lineTo(v + L - L * f, L * f); g.stroke() } break
      case 'scacchi': for (let y = 0, k = 0; y < L; y += st, k++) { const f = riga(k); if (f <= 0) continue; for (let x = 0; x < L * f; x += st) if (((x + y) / st) % 2 === 0) g.fillRect(x, y, st, st) } break
    }
    g.restore()
    // la regione sfuma invece di finire con un taglio netto
    if (reg !== 'tutto') {
      g.globalCompositeOperation = 'destination-in'
      const gr = reg === 'alto' ? g.createLinearGradient(0, 0, 0, s.H) : reg === 'basso' ? g.createLinearGradient(0, s.H, 0, 0) : reg === 'sinistra' ? g.createLinearGradient(0, 0, s.W, 0) : reg === 'destra' ? g.createLinearGradient(s.W, 0, 0, 0) : null
      if (gr) { gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.35, 'rgba(0,0,0,1)'); gr.addColorStop(0.65, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr }
      else { const rg = g.createRadialGradient(s.W / 2, s.H / 2, 0, s.W / 2, s.H / 2, s.H * 0.5); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(0.6, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg }
      g.fillRect(0, 0, s.W, s.H)
    }
    return withLayer(s, fullLayer(s, lid(), 'pattern', cv, p.blend as Blend, p.alpha as number))
  },
}

// ─── segno: traccia a pennello ──────────────────────────────────────────────
const traccia: Tool = {
  id: 'traccia', label: 'Pennello', nature: 'segno',
  pushes: { linee: 0.3, diagonali: 0.1, bordi: 0.1 },
  available: () => true,
  propose: (s, c) => {
    // un gesto solo (al massimo due), lungo e fluido: non scarabocchi spessi sparsi
    const n = chance(c.r, 0.75) ? 1 : 2
    const strokes = Array.from({ length: n }, () => {
      const pts: [number, number][] = []
      let x = range(c.r, 0.05, 0.95), y = range(c.r, 0.05, 0.95), a = range(c.r, 0, Math.PI * 2)
      const len = Math.floor(range(c.r, 25, 60)), curl = range(c.r, 0, 0.22)
      for (let i = 0; i < len; i++) { pts.push([x, y]); a += (c.r() - 0.5) * curl; x += Math.cos(a) * 0.025; y += Math.sin(a) * 0.025 }
      return pts
    })
    return { strokes, width: range(c.r, 1.2, 6), taper: true, color: colorOf(c.tone, c.r), alpha: range(c.r, 0.6, 1), dry: chance(c.r, 0.35) }
  },
  apply: async (s, p, c) => {
    const T = tempoDi(c)
    const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
    g.fillStyle = p.color as string
    let seme = 9
    const rnd = () => ((seme = (seme * 1664525 + 1013904223) >>> 0) / 4294967296) // stesso "secco" a ogni ridisegno
    const tratti = p.strokes as [number, number][][]
    for (const [si, pts0] of tratti.entries()) {
      // crescita: ogni pennellata avanza lungo il suo percorso, una dopo l'altra; vita: il segno trema appena
      const f = finestra(T.crescita, si, tratti.length, 0.5)
      if (f <= 0) continue
      const pts = pts0.slice(0, Math.max(2, Math.ceil(pts0.length * f))).map(([x, y], k) => [x + Math.sin(T.fase * 6.283 + k * 0.9 + si) * 0.002 * T.a, y + Math.cos(T.fase * 6.283 + k * 1.3 + si) * 0.002 * T.a] as [number, number])
      for (let i = 0; i < pts.length; i++) {
        const t = i / Math.max(1, pts.length - 1)
        const w = (p.width as number) * (p.taper ? Math.sin(Math.PI * t) * 0.9 + 0.1 : 1)
        const [x, y] = pts[i]
        const steps = 6
        const [nx, ny] = pts[Math.min(pts.length - 1, i + 1)]
        for (let k = 0; k < steps; k++) {
          const px = (x + (nx - x) * k / steps) * s.W, py = (y + (ny - y) * k / steps) * s.H
          if (p.dry && rnd() < 0.3) continue
          g.beginPath(); g.arc(px, py, Math.max(0.5, w / 2), 0, Math.PI * 2); g.fill()
        }
      }
    }
    return withLayer(s, fullLayer(s, lid(), 'traccia', cv, 'source-over', p.alpha as number))
  },
}

// ─── parola: testo sull'opera ───────────────────────────────────────────────
const scrivi: Tool = {
  id: 'scrivi', label: 'Testo', nature: 'parola',
  pushes: { orizzontali: 0.2, bordi: 0.15, linee: 0.1 },
  available: (_s, c) => !c.noText && c.intention.register !== 'silenzio',
  propose: (s, c) => ({
    text: c.say(), face: pick(c.r, Object.keys(FACES)) as FaceId,
    size: range(c.r, 0.03, 0.18), x: range(c.r, 0.1, 0.9), y: range(c.r, 0.1, 0.9),
    rot: chance(c.r, 0.25) ? range(c.r, -Math.PI / 2, Math.PI / 2) : 0,
    color: colorOf(c.tone, c.r), align: pick(c.r, ['left', 'center', 'right']),
    blend: chance(c.r, 0.2) ? 'difference' : 'source-over',
  }),
  apply: async (s, p) => textLayer(s, {
    text: String(p.text), face: p.face as FaceId, sizePx: Math.round((p.size as number) * Math.min(s.W, s.H)),
    color: p.color as string, x: p.x as number, y: p.y as number, rot: p.rot as number, align: p.align as CanvasTextAlign, blend: p.blend as Blend,
  }),
}

/** un livello di testo (usato dallo strumento, dalla redazione e dalla firma) */
export async function textLayer(s: Sheet, o: { text: string; face: FaceId; sizePx: number; color: string; x: number; y: number; rot?: number; align?: CanvasTextAlign; blend?: Blend; kind?: string; maxW?: number }): Promise<Sheet> {
  await loadLabFonts()
  const face: Face = FACES[o.face] ?? FACES.grotesk
  // un paragrafo lungo non si urla: corpo da lettura, non da titolo
  const size = Math.max(8, Math.round(o.text.length > 120 ? Math.min(o.sizePx, s.W * 0.03) : o.text.length > 60 ? Math.min(o.sizePx, s.W * 0.045) : o.sizePx))
  const txt = perCarattere(face.upper && o.text.length <= 40 ? o.text.toUpperCase() : o.text, face.family)
  const probe = newCanvas(4, 4).getContext('2d')!
  probe.font = fontCss(face, size)
  const lines = wrap(probe, txt, s.W * (o.maxW ?? 0.8))
  const tw = Math.max(...lines.map(l => probe.measureText(l).width), 10)
  const cv = newCanvas(tw + size, lines.length * size * 1.15 + size), g = cv.getContext('2d')!
  const align = o.align ?? 'left'
  g.font = fontCss(face, size); g.fillStyle = o.color; g.textBaseline = 'top'; g.textAlign = align
  const ax = align === 'left' ? size / 2 : align === 'right' ? cv.width - size / 2 : cv.width / 2
  lines.forEach((l, i) => g.fillText(l, ax, size / 2 + i * size * 1.15))
  const scale = Math.max(cv.width, cv.height) / Math.min(s.W, s.H)
  return withLayer(s, { id: lid(), kind: o.kind ?? 'testo', canvas: cv, x: o.x, y: o.y, scale, rot: o.rot ?? 0, alpha: 1, blend: o.blend ?? 'source-over', meta: { text: txt, color: o.color, size } })
}

function wrap(g: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const out: string[] = []
  let cur = ''
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w
    if (g.measureText(t).width > max && cur) { out.push(cur); cur = w } else cur = t
  }
  if (cur) out.push(cur)
  return out.length ? out : ['']
}

// ─── materia: grana e texture ───────────────────────────────────────────────
const grana: Tool = {
  id: 'grana', label: 'Grana', nature: 'materia',
  pushes: { complessita: 0.25, entropia: 0.1 },
  available: () => true,
  propose: (_s, c) => ({ amount: range(c.r, 0.05, 0.4), size: Math.floor(range(c.r, 1, 4)), seed: Math.floor(c.r() * 1e9), blend: pick(c.r, ['overlay', 'multiply', 'screen', 'soft-light']) }),
  apply: async (s, p) => {
    const sz = p.size as number
    const w = Math.ceil(s.W / sz), h = Math.ceil(s.H / sz)
    const small = newCanvas(w, h), g = small.getContext('2d')!
    const img = g.createImageData(w, h)
    let a = (p.seed as number) >>> 0
    for (let i = 0; i < w * h; i++) {
      a = (a * 1664525 + 1013904223) >>> 0
      const v = (a / 4294967296) * 255
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
      img.data[i * 4 + 3] = (p.amount as number) * 255
    }
    g.putImageData(img, 0, 0)
    const cv = newCanvas(s.W, s.H), cg = cv.getContext('2d')!
    cg.imageSmoothingEnabled = false
    cg.drawImage(small, 0, 0, s.W, s.H)
    return withLayer(s, fullLayer(s, lid(), 'grana', cv, p.blend as Blend))
  },
}

// ─── vuoto: tagliare, cancellare ────────────────────────────────────────────
const taglia: Tool = {
  id: 'taglia', label: 'Taglio', nature: 'vuoto',
  pushes: { vuoto: 0.3, densita: -0.2, bordi: 0.1 },
  available: s => s.layers.length > 0,
  propose: (s, c) => ({
    layer: chance(c.r, 0.5) ? 'tutti' : someLayer(s, c.r).id,
    shape: pick(c.r, ['rettangolo', 'cerchio', 'fascia', 'strappo']),
    x: range(c.r, 0.1, 0.9), y: range(c.r, 0.1, 0.9), size: range(c.r, 0.1, 0.5), rot: range(c.r, 0, Math.PI), seed: Math.floor(c.r() * 1e9),
  }),
  apply: async (s, p) => {
    const cut = (l: Layer): Layer => {
      const cv = newCanvas(l.canvas.width, l.canvas.height), g = cv.getContext('2d')!
      g.drawImage(l.canvas, 0, 0)
      g.globalCompositeOperation = 'destination-out'
      // il taglio è in coordinate del foglio: lo riporto nel livello
      const side = Math.min(s.W, s.H) * l.scale, k = Math.max(l.canvas.width, l.canvas.height) / side
      const fx = ((p.x as number) - l.x) * s.W, fy = ((p.y as number) - l.y) * s.H
      const cx = l.canvas.width / 2 + (fx * Math.cos(-l.rot) - fy * Math.sin(-l.rot)) * k
      const cy = l.canvas.height / 2 + (fx * Math.sin(-l.rot) + fy * Math.cos(-l.rot)) * k
      const R = (p.size as number) * Math.min(s.W, s.H) * k
      g.translate(cx, cy); g.rotate(p.rot as number)
      g.beginPath()
      if (p.shape === 'cerchio') g.arc(0, 0, R, 0, Math.PI * 2)
      else if (p.shape === 'fascia') g.rect(-R * 4, -R * 0.15, R * 8, R * 0.3)
      else if (p.shape === 'strappo') {
        let a = (p.seed as number) >>> 0
        g.moveTo(-R, -R)
        for (let i = 0; i <= 20; i++) { a = (a * 1664525 + 1013904223) >>> 0; g.lineTo(-R + i * R / 10, -R * 0.2 + (a / 4294967296) * R * 0.4) }
        g.lineTo(R, R); g.lineTo(-R, R); g.closePath()
      } else g.rect(-R, -R * 0.7, R * 2, R * 1.4)
      g.fill()
      return { ...l, canvas: cv }
    }
    return { ...s, layers: s.layers.map(l => ((p.layer === 'tutti' && !LOCKED.has(l.kind)) || l.id === p.layer ? cut(l) : l)) }
  },
}

// ─── ripetizione: duplicare un livello ──────────────────────────────────────
const ripeti: Tool = {
  id: 'ripeti', label: 'Ripetizione', nature: 'ripetizione',
  pushes: { elementi: 0.2, simmetria: 0.1, densita: 0.15 },
  available: s => s.layers.some(l => l.kind !== 'grana' && l.kind !== 'pattern' && !LOCKED.has(l.kind)),
  propose: (s, c) => {
    const ls = s.layers.filter(l => l.kind !== 'grana' && l.kind !== 'pattern' && !LOCKED.has(l.kind))
    return {
      layer: pick(c.r, ls).id, n: Math.floor(range(c.r, 2, 7)), dx: range(c.r, -0.2, 0.2), dy: range(c.r, -0.2, 0.2),
      dscale: range(c.r, 0.75, 1.15), drot: chance(c.r, 0.4) ? range(c.r, -0.5, 0.5) : 0, fade: chance(c.r, 0.5),
    }
  },
  apply: async (s, p) => {
    const l = s.layers.find(x => x.id === p.layer)
    if (!l) return s
    let out = s
    for (let i = 1; i <= (p.n as number); i++) {
      out = withLayer(out, {
        ...l, id: lid(), x: l.x + (p.dx as number) * i, y: l.y + (p.dy as number) * i,
        scale: l.scale * Math.pow(p.dscale as number, i), rot: l.rot + (p.drot as number) * i,
        alpha: p.fade ? l.alpha * Math.pow(0.7, i) : l.alpha,
      })
    }
    return out
  },
}

// ─── trasformazione: spostare, scalare, ruotare, specchiare, fondere ────────
const disponi: Tool = {
  id: 'disponi', label: 'Disposizione', nature: 'trasformazione',
  pushes: { squilibrio: 0.1, terzi: 0.1 },
  available: s => s.layers.length > 0,
  propose: (s, c) => {
    const l = someLayer(s, c.r)
    const mode = pick(c.r, ['sposta', 'scala', 'ruota', 'specchia', 'fondi', 'terzi', 'centra', 'bordo'])
    return {
      layer: l.id, mode, dx: range(c.r, -0.25, 0.25), dy: range(c.r, -0.25, 0.25), k: range(c.r, 0.6, 1.6), drot: range(c.r, -0.8, 0.8),
      blend: pick(c.r, ['source-over', 'multiply', 'screen', 'difference', 'overlay', 'exclusion', 'color-dodge']),
      tx: pick(c.r, [1 / 3, 2 / 3]), ty: pick(c.r, [1 / 3, 2 / 3]), edge: pick(c.r, ['l', 'r', 't', 'b']),
    }
  },
  apply: async (s, p) => {
    const l = s.layers.find(x => x.id === p.layer)
    if (!l) return s
    switch (p.mode) {
      case 'sposta': return replaceLayer(s, l.id, { x: l.x + (p.dx as number), y: l.y + (p.dy as number) })
      case 'scala': return replaceLayer(s, l.id, { scale: l.scale * (p.k as number) })
      case 'ruota': return replaceLayer(s, l.id, { rot: l.rot + (p.drot as number) })
      case 'specchia': return replaceLayer(s, l.id, { flipX: !l.flipX })
      case 'fondi': return replaceLayer(s, l.id, { blend: p.blend as Blend })
      case 'terzi': return replaceLayer(s, l.id, { x: p.tx as number, y: p.ty as number })
      case 'centra': return replaceLayer(s, l.id, { x: 0.5, y: 0.5 })
      case 'bordo': {
        const e = p.edge as string
        return replaceLayer(s, l.id, e === 'l' ? { x: 0.05 } : e === 'r' ? { x: 0.95 } : e === 't' ? { y: 0.05 } : { y: 0.95 })
      }
    }
    return s
  },
}

// ─── vuoto: togliere un livello intero ──────────────────────────────────────
const togli: Tool = {
  id: 'togli', label: 'Togliere', nature: 'vuoto',
  pushes: { vuoto: 0.2, densita: -0.3, complessita: -0.2 },
  available: s => free(s).filter(l => l.kind !== 'motivo').length > 1,
  propose: (s, c) => { const xs = free(s).filter(l => l.kind !== 'motivo'); return { layer: xs[Math.floor(c.r() * xs.length)].id } },
  apply: async (s, p) => ({ ...s, layers: s.layers.filter(l => l.id !== p.layer) }),
}

// ─── fondo ──────────────────────────────────────────────────────────────────
const fondo: Tool = {
  id: 'fondo', label: 'Fondo', nature: 'luce',
  pushes: { luminosita: 0.2 },
  available: () => true,
  propose: (_s, c) => ({ tone: pick(c.r, TONES).id, use: pick(c.r, ['bg', 'bg', 'ink', 'acc']) }),
  apply: async (s, p) => {
    const t = TONES.find(x => x.id === p.tone) ?? TONES[0]
    return { ...s, bg: p.use === 'ink' ? t.ink : p.use === 'acc' ? t.acc : t.bg }
  },
}

// ─── codice raccolto: shader in sandbox ─────────────────────────────────────
const shader: Tool = {
  id: 'shader', label: 'Shader raccolto', nature: 'materia',
  pushes: { complessita: 0.3, saturazione: 0.1 },
  available: (_s, c) => c.shaders.some(x => x.code),
  propose: (_s, c) => {
    const pool = c.shaders.filter(x => x.code)
    return { source: pick(c.r, pool).id, time: range(c.r, 0, 60), seed: c.r(), blend: pick(c.r, ['source-over', 'multiply', 'screen', 'overlay', 'difference']), alpha: range(c.r, 0.4, 1) }
  },
  apply: async (s, p, c) => {
    const src = c.shaders.find(x => x.id === p.source)
    if (!src?.code) return s
    const cv = runShader(src.code, Math.round(s.W / 2), Math.round(s.H / 2), p.time as number, p.seed as number)
    if (!cv) return s
    const big = newCanvas(s.W, s.H); big.getContext('2d')!.drawImage(cv, 0, 0, s.W, s.H)
    return withLayer(s, fullLayer(s, lid(), 'shader', big, p.blend as Blend, p.alpha as number))
  },
}

// ─── ricomporre: schiacciare tutto in un livello (per poi lavorarci sopra) ──
const schiaccia: Tool = {
  id: 'schiaccia', label: 'Unire i livelli', nature: 'trasformazione',
  pushes: {},
  available: s => s.layers.length > 4,
  propose: () => ({}),
  apply: async s => {
    const flat = flatten(s)
    return { ...s, layers: [fullLayer(s, lid(), 'unito', flat)] }
  },
}

/** applica uno strumento e marca i livelli nuovi con la loro ricetta (strumento, parametri, immagine di partenza se serve) */
export async function applica(tool: Tool, s: Sheet, p: Params, c: ToolCtx): Promise<Sheet> {
  const prima = new Set(s.layers.map(l => l.id))
  const out = await tool.apply(s, p, c)
  if (!ANIMABILI.has(tool.id)) return out
  const fonte = tool.id === 'retino' || tool.id === 'caleido' ? flatten({ ...s, layers: s.layers.filter(l => !LOCKED.has(l.kind)) }, 0.5)
    : tool.id === 'ornato' ? s.layers.find(l => l.id === p.layer)?.canvas : undefined
  return { ...out, layers: out.layers.map(l => (prima.has(l.id) ? l : { ...l, genera: { tool: tool.id, p, fonte } })) }
}
/** gli strumenti che sanno crescere e vivere */
export const ANIMABILI = new Set(['pattern', 'traccia', 'geometria', 'flusso', 'ornato', 'retino', 'caleido', 'grafico', 'cristallo', 'camera'])

export const TOOLS: Tool[] = [semina, materia, luce, geometria, pattern, traccia, scrivi, grana, taglia, ripeti, disponi, togli, fondo, shader, schiaccia, ...NUOVI, ...MONDI]
export const toolById = (id: string) => TOOLS.find(t => t.id === id)
