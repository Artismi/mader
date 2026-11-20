/**
 * Lo studio: il ciclo genera → guarda → interviene, alla Copycat.
 * Ogni strumento è un codelet con un'urgenza (intenzione, esperienza, umore,
 * ciò che manca all'immagine). Si sceglie a caso pesato dalla temperatura;
 * dopo ogni gesto l'immagine viene misurata e il gesto tenuto o annullato
 * (ricottura simulata: all'inizio accetta anche peggioramenti, poi si fa
 * esigente). La temperatura scende man mano che l'opera si assesta.
 */
import type { AgentState, Features, Gesture, Intention, ToolSense } from '../core/types'
import { weighted, type Rnd } from '../core/rng'
import { flatten, type Sheet } from '../hands/sheet'
import { TOOLS, type Tool, type ToolCtx } from '../hands/tools'
import { applica } from '../hands/tools'
import { measure, rasterize } from '../eyes/measure'
import { patches } from '../eyes/visual-words'
import { flaws as flawsOf, readability } from '../eyes/judgement'
import { judge } from './criteria'
import { expectedProgress, novelty, wundt } from './taste'
import type { Mood } from '../core/types'

export interface Look { f: Features; words: number[]; ps: number[][]; score: number; parts: Record<string, number> }

export function look(st: AgentState, s: Sheet, intention: Intention): Look {
  const R = rasterize(flatten(s, 0.25))
  const f = measure(R)
  const ps = patches(R)
  const words = st.codebook.length ? histogramQuick(st.codebook, ps) : []
  const keys = Object.keys(intention.targets)
  const fit = keys.length ? 1 - keys.reduce((a, k) => a + Math.abs((f[k] ?? 0) - intention.targets[k]), 0) / keys.length : 0.5
  const crit = st.criteria.length ? judge(st.criteria, f) : 0.5
  const nov = novelty(st, f, words)
  const won = wundt(nov, st.wundtPeak)
  const prog = expectedProgress(st, ps)
  // un'immagine vuota non è un'opera
  const alive = Math.min(1, f.densita * 4 + f.bordi * 2)
  // struttura: un elemento che comanda (Kandinsky), un vuoto che lavora, un baricentro sui terzi (Arnheim)
  const dominance = Math.max(f.punti ?? 0, f.linee ?? 0, f.superfici ?? 0)
  const vuotoBuono = f.vuoto > 0.12 && f.vuoto < 0.65 ? 1 : 0.35
  const struct = 0.3 * dominance + 0.2 * vuotoBuono + 0.2 * f.terzi + 0.3 * (f.forma ?? 0.5)
  // rumore: tanti elementi diversi, pelle troppo fitta, nessuno che comanda
  const noise = Math.max(0, Math.min(1, Math.max(0.45 * f.elementi + 0.35 * f.complessita + 0.25 * f.entropia - 0.5 * dominance, (f.rumore ?? 0) * 1.3)))
  const noisePenalty = noise > 0.45 ? (noise - 0.45) / 0.55 : 0
  const base = 0.3 * fit + 0.15 * crit + 0.2 * won + 0.15 * prog + 0.2 * struct
  // difetti che chiunque vedrebbe (vuota, illeggibile, pattern a caso…): pesano quanto la voce "pubblico"
  const read = readability(s)
  const fl = flawsOf(f, read, fit, s.layers.map(l => l.kind))
  const care = Math.min(1.5, st.voices.pubblico ?? 1)
  const flawPenalty = Math.min(0.45, fl.reduce((a, x) => a + x.severity, 0) * 0.12 * care)
  const score = base * (0.4 + 0.6 * alive) * (1 - 0.6 * noisePenalty) * (1 - flawPenalty)
  return { f, words, ps, score, parts: { intenzione: fit, criteri: crit, novita: nov, wundt: won, progresso: prog, struttura: struct, rumore: noise, leggibilita: read.leggibilita } }
}

function histogramQuick(cb: number[][], ps: number[][]) {
  const h = new Array(cb.length).fill(0)
  for (const p of ps) {
    let bi = 0, bd = Infinity
    for (let i = 0; i < cb.length; i++) { let d = 0; for (let k = 0; k < p.length; k++) d += (cb[i][k] - p[k]) ** 2; if (d < bd) { bd = d; bi = i } }
    h[bi]++
  }
  return h.map(x => x / (ps.length || 1))
}

const MOOD_TOOLS: Record<Mood, string[]> = {
  curioso: ['shader', 'materia', 'pattern'], annoiato: ['taglia', 'materia', 'fondo'], inquieto: ['traccia', 'taglia', 'ripeti'],
  giocoso: ['geometria', 'scrivi', 'ripeti'], cupo: ['togli', 'grana', 'luce'], calmo: ['disponi', 'togli', 'geometria'],
}

function urgency(t: Tool, s: Sheet, st: AgentState, intention: Intention, f: Features | null, mood: Mood): number {
  let u = 1
  if (intention.tools.includes(t.id)) u += 1.5
  const sense: ToolSense | undefined = st.tools[t.id]
  if (sense && sense.uses > 2) u += sense.gain * 2
  if (MOOD_TOOLS[mood].includes(t.id)) u += 0.8
  if (f) {
    // spinta verso ciò che manca: effetto atteso (appreso, o ipotesi iniziale) · distanza dal bersaglio
    const eff = sense && sense.uses > 2 ? sense.effect : t.pushes
    for (const [k, target] of Object.entries(intention.targets)) u += Math.max(0, (eff[k] ?? 0) * (target - (f[k] ?? 0))) * 6
  }
  if (!s.layers.length) u *= ['semina', 'geometria', 'pattern', 'traccia', 'shader', 'scrivi'].includes(t.id) ? 2 : 0.05
  if (t.id === 'schiaccia') u *= 0.3
  // troppi fogli sovrapposti: meno aggiungere, più togliere e unire
  if (s.layers.length > 7) u *= ['togli', 'schiaccia', 'disponi', 'taglia'].includes(t.id) ? 2.5 : 0.35
  return u
}

const SPERIMENTA = new Set(['materia', 'luce', 'traccia', 'taglia', 'shader', 'grana', 'retino', 'duotono', 'deforma', 'caleido', 'flusso', 'ombra', 'sfasa'])
const REGIA_NO = new Set(['geometria', 'scrivi', 'fondo', 'disponi'])

export interface StudioResult { sheet: Sheet; gestures: Gesture[]; last: Look; effects: { tool: string; before: Features; after: Features; delta: number }[]; genome: { tool: string; params: Record<string, unknown> }[] }

export async function runStudio(
  st: AgentState, r: Rnd, start: Sheet, intention: Intention, ctx: ToolCtx, steps: number,
  onStep?: (s: Sheet, g: Gesture, l: Look) => void,
): Promise<StudioResult> {
  let sheet = start
  let cur = look(st, sheet, intention)
  const gestures: Gesture[] = []
  const effects: StudioResult['effects'] = []
  const genome: StudioResult['genome'] = []
  const T0 = st.temperature
  for (let i = 0; i < steps; i++) {
    const T = T0 * (1 - i / steps) + 0.1
    // con la regia lo studio lavora la materia, non aggiunge cose a caso
    const avail = TOOLS.filter(t => t.available(sheet, ctx) && (!ctx.noText || !REGIA_NO.has(t.id)))
    if (!avail.length) break
    const tool = weighted(r, avail, t => urgency(t, sheet, st, intention, sheet.layers.length ? cur.f : null, st.mood) * (ctx.noText && SPERIMENTA.has(t.id) ? 1.8 : 1) * (ctx.preferiti?.includes(t.id) ? 2.5 : 1), T)
    let next: Sheet
    const params = tool.propose(sheet, ctx)
    try { next = await applica(tool, sheet, params, ctx) } catch (e) { console.warn('[studio-agent] gesto fallito', tool.id, e); continue }
    const nl = look(st, next, intention)
    const delta = nl.score - cur.score
    const keep = delta >= 0 || r() < Math.exp(delta / (0.04 * T))
    const g: Gesture = { tool: tool.id, params: summarize(params), kept: keep, delta: Math.round(delta * 1000) / 1000 }
    gestures.push(g)
    effects.push({ tool: tool.id, before: cur.f, after: nl.f, delta })
    if (keep) { genome.push({ tool: tool.id, params: encode(params, sheet) }); sheet = next; cur = nl }
    onStep?.(sheet, g, cur)
    // l'opera si assesta: la temperatura cala più in fretta se l'interesse è alto
    if (cur.score > 0.75 && i > steps / 2) break
  }
  return { sheet, gestures, last: cur, effects, genome }
}

/** i parametri dei gesti si salvano senza i dati pesanti */
function summarize(p: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(p)) {
    if (k === 'strokes') out[k] = (v as unknown[]).length
    else if (k === 'values') out[k] = '…'
    else if (typeof v === 'number') out[k] = Math.round(v * 1000) / 1000
    else out[k] = v
  }
  return out
}

/** dopo la giornata: aggiorna il senso degli strumenti (effetto medio e resa) */
export function learnTools(st: AgentState, effects: StudioResult['effects']) {
  for (const e of effects) {
    const t: ToolSense = st.tools[e.tool] ?? { uses: 0, effect: {}, gain: 0.5 }
    t.uses++
    const lr = 1 / Math.min(t.uses, 30)
    for (const k of Object.keys(e.after)) {
      const d = (e.after[k] ?? 0) - (e.before[k] ?? 0)
      t.effect[k] = (t.effect[k] ?? 0) + lr * (d - (t.effect[k] ?? 0))
    }
    const g = Math.max(0, Math.min(1, 0.5 + e.delta * 5))
    t.gain += lr * (g - t.gain)
    st.tools[e.tool] = t
  }
}

// ─── genomi: rifare e variare una tavola riuscita ────────────────────────────

/** il riferimento a un livello diventa la sua posizione nella pila (gli id cambiano a ogni tavola) */
function encode(p: Record<string, unknown>, s: Sheet): Record<string, unknown> {
  if (typeof p.layer === 'string' && p.layer !== 'tutti') {
    const i = s.layers.findIndex(l => l.id === p.layer)
    return { ...p, layer: undefined, __layer: i }
  }
  return { ...p }
}
function decode(p: Record<string, unknown>, s: Sheet): Record<string, unknown> | null {
  if (typeof p.__layer === 'number') {
    if (!s.layers.length) return null
    const l = s.layers[Math.min(s.layers.length - 1, p.__layer)]
    const { __layer: _x, ...rest } = p
    void _x
    return { ...rest, layer: l.id }
  }
  return p
}

function mutate(p: Record<string, unknown>, r: Rnd, amount: number): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(p)) {
    if (k === 'seed' && typeof v === 'number') out[k] = r() < amount * 1.5 ? Math.floor(r() * 1e9) : v
    else if (typeof v === 'number' && k !== '__layer' && k !== 'n') out[k] = v * (1 + (r() - 0.5) * 2 * amount * 0.3)
    else out[k] = v
  }
  return out
}

/**
 * Rifà una tavola dal suo genoma, con mutazioni (amount 0 = copia, 1 = molto libera).
 * Restituisce il foglio e i gesti, come se li avesse fatti ora.
 */
export async function replay(
  st: AgentState, r: Rnd, start: Sheet, genes: { tool: string; params: Record<string, unknown> }[], ctx: ToolCtx, amount: number,
): Promise<{ sheet: Sheet; gestures: Gesture[]; genome: StudioResult['genome'] }> {
  let sheet = start
  const gestures: Gesture[] = []
  const genome: StudioResult['genome'] = []
  for (const g of genes) {
    if (r() < 0.12 * amount) continue // a volte salta un gesto
    const tool = TOOLS.find(t => t.id === g.tool)
    if (!tool) continue
    const dec = decode(mutate(g.params, r, amount), sheet)
    if (!dec) continue
    try {
      const next = await applica(tool, sheet, dec, ctx)
      genome.push({ tool: tool.id, params: encode(dec, sheet) })
      gestures.push({ tool: tool.id, params: summarize(dec), kept: true, delta: 0 })
      sheet = next
    } catch { /* il gesto non si può rifare: pazienza */ }
  }
  void st
  return { sheet, gestures, genome }
}
