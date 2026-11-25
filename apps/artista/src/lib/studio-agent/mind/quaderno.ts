/**
 * Il quaderno degli strumenti: Copibolo impara a conoscere i suoi strumenti usandoli, non per regole scritte.
 *  - REGOLAZIONI: le scopre da solo. Chiede a ogni strumento tante proposte e ne ricava lo spazio delle regolazioni
 *    (numeri con il loro campo, scelte con i loro valori); poi il campo si allarga oltre l'abitudine dello strumento,
 *    perché le regolazioni estreme sono anche loro da conoscere. Lo spazio così è aperto: sceglie lui dove stare.
 *  - DOVE: ogni gesto può andare sulla tavola intera, su un solo livello (ritagliato sulla sua sagoma) o su una zona
 *    (una forma morbida: ellisse, fascia, riquadro). Anche il dove fa parte delle regolazioni.
 *  - QUADERNO: per ogni uso annota regolazioni, dove, com'era la tavola, per quale parola, e cosa è successo:
 *    quanto si vede, quanto ha cambiato la composizione, quanto ha guadagnato o perso lo sguardo, quanto è costato.
 *  - SCELTA: davanti a una tavola immagina tante regolazioni possibili e per ognuna stima cosa farebbe, guardando gli
 *    usi più simili nel quaderno; più è lontano da ciò che ha provato, più è incerto, e l'incertezza è anche curiosità
 *    (campiona, non indovina). Con il quaderno vuoto sceglie liberamente; con l'esperienza sceglie meglio, senza chiudersi.
 *  - PAROLE: quali strumenti hanno reso con quale parola e quale poetica: lo impara dagli esiti, non è scritto.
 */
import type { AgentState, Features } from '../core/types'
import type { Rnd } from '../core/rng'
import { flatten, fullLayer, newCanvas, type Sheet } from '../hands/sheet'
import { applica, type Tool, type ToolCtx } from '../hands/tools'

type Params = Record<string, unknown>
export type Regola = { k: string; tipo: 'num'; min: number; max: number; intero: boolean } | { k: string; tipo: 'scelta'; valori: (string | boolean)[] }
export interface Scheda { regole: Regola[]; costo: number; prove: number }
export type Dove = { modo: 'tutta' } | { modo: 'livello'; i: number } | { modo: 'zona'; forma: 'ellisse' | 'fascia' | 'riquadro'; cx: number; cy: number; rx: number; ry: number; ang: number; morbido: number }
export interface Voce { x: number[]; w: string; vis: number; cambio: number; delta: number; tenuto: boolean; ms: number; quando: number }
export interface Quaderno { schede: Record<string, Scheda>; voci: Record<string, Voce[]> }

const NON_REGOLE = /^(seed|seme|layer|__layer|id|strokes|values|testo|text|parola|word|font|colori?|fondo|ink|acc|bg|inchiostro|carta|a|b|luce|livello)$/
const MAX_VOCI = 300

export const quadernoDi = (st: AgentState): Quaderno => ((st as AgentState & { quaderno?: Quaderno }).quaderno ??= { schede: {}, voci: {} })

/** scopre lo spazio delle regolazioni di uno strumento dalle sue proposte, e lo allarga */
export function scopri(tool: Tool, s: Sheet, c: ToolCtx, n = 40): Scheda {
  const visti: Record<string, unknown[]> = {}
  for (let i = 0; i < n; i++) { let p: Params; try { p = tool.propose(s, c) } catch { continue } for (const [k, v] of Object.entries(p)) (visti[k] ??= []).push(v) }
  const regole: Regola[] = []
  for (const [k, vs] of Object.entries(visti)) {
    if (NON_REGOLE.test(k)) continue
    if (vs.every(v => typeof v === 'number' && isFinite(v))) {
      const ns = vs as number[], lo = Math.min(...ns), hi = Math.max(...ns)
      if (hi - lo < 1e-9) continue
      const intero = ns.every(v => Number.isInteger(v)), m = (hi - lo) * 0.3
      regole.push({ k, tipo: 'num', min: lo > 0 ? (intero && lo >= 1 ? Math.max(1, Math.floor(lo - m)) : Math.max(lo * 0.3, lo - m)) : lo - m, max: hi + m, intero })
    } else if (vs.every(v => typeof v === 'string' || typeof v === 'boolean')) {
      const val = [...new Set(vs as (string | boolean)[])]
      if (val.length >= 2 && val.length <= 40 && !(val as unknown[]).some(v => typeof v === 'string' && /^#|^[lfvz][0-9a-z]{6,}/.test(v as string))) regole.push({ k, tipo: 'scelta', valori: val })
    }
  }
  return { regole, costo: 0, prove: 0 }
}

const DOVI = ['tutta', 'livello', 'zona'] as const
function doveACaso(s: Sheet, r: Rnd): Dove {
  const m = DOVI[Math.floor(r() * 3)]
  if (m === 'livello' && s.layers.length) return { modo: 'livello', i: Math.floor(r() * s.layers.length) }
  if (m === 'zona') return { modo: 'zona', forma: (['ellisse', 'fascia', 'riquadro'] as const)[Math.floor(r() * 3)], cx: r(), cy: r(), rx: 0.15 + r() * 0.5, ry: 0.1 + r() * 0.5, ang: r() * Math.PI, morbido: r() }
  return { modo: 'tutta' }
}

/** le regolazioni in un vettore (0..1) più il dove e la tavola: è così che il quaderno confronta gli usi */
function vettore(sc: Scheda, p: Params, d: Dove, f: Features, nLiv: number): number[] {
  const x = sc.regole.map(g => g.tipo === 'num' ? Math.max(0, Math.min(1, ((p[g.k] as number) - g.min) / (g.max - g.min || 1))) : Math.max(0, g.valori.indexOf(p[g.k] as string)) / Math.max(1, g.valori.length - 1))
  x.push(d.modo === 'tutta' ? 0 : d.modo === 'livello' ? 0.5 : 1, d.modo === 'livello' ? d.i / Math.max(1, nLiv - 1) : d.modo === 'zona' ? d.rx * d.ry * 4 : 1)
  for (const k of ['complessita', 'vuoto', 'contrasto', 'ripetizione', 'densita', 'luminosita']) x.push(Math.max(0, Math.min(1, f[k] ?? 0.5)))
  return x
}

/** prende la proposta dello strumento (per le cose che le regolazioni non coprono: colori, semi, testi) e ci mette le sue regolazioni */
function campiona(sc: Scheda, base: Params, r: Rnd): Params {
  const p: Params = { ...base }
  for (const g of sc.regole) {
    if (g.tipo === 'num') { const v = g.min + r() * (g.max - g.min); p[g.k] = g.intero ? Math.round(v) : v }
    else p[g.k] = g.valori[Math.floor(r() * g.valori.length)]
  }
  return p
}

/** quanto si aspetta da un uso: i più simili del quaderno, pesati per vicinanza; l'incertezza cresce con la distanza */
function stima(voci: Voce[], x: number[], w: string) {
  if (!voci.length) return { m: 0, s: 1 }
  const d = voci.map(v => { let s = 0; const n = Math.min(v.x.length, x.length); for (let i = 0; i < n; i++) s += (v.x[i] - x[i]) ** 2; return Math.sqrt(s / Math.max(1, n)) + (v.w === w ? 0 : 0.08) + (v.x.length !== x.length ? 0.3 : 0) })
  const idx = d.map((_, i) => i).sort((a, b) => d[a] - d[b]).slice(0, 8)
  let sw = 0, sm = 0; for (const i of idx) { const k = 1 / (0.05 + d[i]); sw += k; sm += k * voci[i].delta }
  const m = sm / sw, vicino = d[idx[0]]
  const sp = Math.sqrt(idx.reduce((a, i) => a + (voci[i].delta - m) ** 2, 0) / idx.length)
  return { m, s: sp + vicino * 0.4 + 1 / Math.sqrt(1 + voci.length) * 0.05 }
}

/** sceglie regolazioni e dove per questa tavola: immagina, stima, campiona */
export function scegli(st: AgentState, tool: Tool, s: Sheet, c: ToolCtx, f: Features, r: Rnd, quante = 14): { p: Params; dove: Dove; x: number[] } {
  const Q = quadernoDi(st)
  const sc = (Q.schede[tool.id] ??= scopri(tool, s, c))
  const voci = Q.voci[tool.id] ?? [], w = c.intention?.word ?? ''
  let best: { p: Params; dove: Dove; x: number[] } | null = null, bv = -Infinity
  for (let i = 0; i < quante; i++) {
    let base: Params; try { base = tool.propose(s, c) } catch { continue }
    // a volte tiene la proposta dello strumento com'è (la sua abitudine), di solito esplora tutto lo spazio
    const p = r() < 0.2 ? base : campiona(sc, base, r), dove = r() < 0.35 ? { modo: 'tutta' as const } : doveACaso(s, r)
    const x = vettore(sc, p, dove, f, s.layers.length), e = stima(voci, x, w)
    const v = e.m + e.s * gauss(r) // Thompson: il campione dalla sua incertezza
    if (v > bv) { bv = v; best = { p, dove, x } }
  }
  return best ?? { p: tool.propose(s, c), dove: { modo: 'tutta' }, x: [] }
}
const gauss = (r: Rnd) => Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r())

/** la maschera del dove, alla grandezza del foglio */
function maschera(s: Sheet, d: Dove, W: number, H: number): HTMLCanvasElement | null {
  if (d.modo === 'tutta') return null
  const m = newCanvas(W, H), g = m.getContext('2d')!
  if (d.modo === 'livello') { const l = s.layers[Math.min(d.i, s.layers.length - 1)]; if (!l) return null; g.drawImage(flatten({ ...s, layers: [{ ...l, alpha: 1, blend: 'source-over' }] }, W / s.W), 0, 0, W, H); return m }
  g.filter = `blur(${Math.round(Math.min(W, H) * 0.08 * d.morbido)}px)`; g.fillStyle = '#000'
  g.translate(d.cx * W, d.cy * H); g.rotate(d.ang)
  if (d.forma === 'ellisse') { g.beginPath(); g.ellipse(0, 0, d.rx * W, d.ry * H, 0, 0, 7); g.fill() }
  else if (d.forma === 'fascia') g.fillRect(-W * 2, -d.ry * H * 0.5, W * 4, d.ry * H)
  else g.fillRect(-d.rx * W, -d.ry * H, d.rx * W * 2, d.ry * H * 2)
  return m
}

/** applica con il dove: i livelli nuovi o cambiati restano solo dentro la maschera */
export async function applicaDove(tool: Tool, s: Sheet, p: Params, c: ToolCtx, d: Dove): Promise<Sheet> {
  const out = await applica(tool, s, p, c)
  const W = Math.round(s.W), H = Math.round(s.H), m = maschera(s, d, W, H)
  if (!m) return out
  const prima = new Map(s.layers.map(l => [l.id, l.canvas]))
  const layers = out.layers.map(l => {
    if (prima.get(l.id) === l.canvas) return l
    const v = flatten({ ...out, layers: [{ ...l, blend: 'source-over' }] }, 1), g = v.getContext('2d')!
    g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0, v.width, v.height)
    // un livello trasformato al suo posto: sotto la maschera torna l'originale
    const vecchio = s.layers.find(x => x.id === l.id)
    if (vecchio) { const o = flatten({ ...s, layers: [{ ...vecchio, blend: 'source-over' }] }, 1), og = o.getContext('2d')!; og.globalCompositeOperation = 'destination-out'; og.drawImage(m, 0, 0, o.width, o.height); og.globalCompositeOperation = 'source-over'; og.drawImage(v, 0, 0); return { ...fullLayer(out, l.id, l.kind, o, l.blend), alpha: l.alpha } }
    return { ...fullLayer(out, l.id, l.kind, v, l.blend), alpha: l.alpha }
  })
  return { ...out, layers }
}

/** quanto si vede un gesto: differenza media dei pixel, a scala piccola */
export function visibile(a: Sheet, b: Sheet): number {
  const k = 96 / Math.max(a.W, a.H), A = flatten(a, k), B = flatten(b, k)
  const da = A.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, A.width, A.height).data, db = B.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, B.width, B.height).data
  let s = 0; for (let i = 0; i < da.length; i += 4) s += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])
  return s / (da.length / 4) / 765
}

export function annota(st: AgentState, tool: string, v: Voce, ms: number) {
  const Q = quadernoDi(st), xs = (Q.voci[tool] ??= [])
  xs.push(v); if (xs.length > MAX_VOCI) xs.splice(0, xs.length - MAX_VOCI)
  const sc = Q.schede[tool]; if (sc) { sc.prove++; sc.costo += (ms - sc.costo) / Math.min(sc.prove, 20) }
}

/** l'affinità imparata tra uno strumento e una parola: com'è andato con quella parola, rispetto a com'è andato in genere */
export function affinita(st: AgentState, tool: string, w: string): number {
  const xs = quadernoDi(st).voci[tool] ?? []; if (!w || xs.length < 3) return 0
  const con = xs.filter(v => v.w === w); if (!con.length) return 0
  const m = (a: Voce[]) => a.reduce((s, v) => s + v.delta, 0) / a.length
  return (m(con) - m(xs)) * con.length / (con.length + 3)
}

/** quanto conosce uno strumento (0 mai usato → 1 ben conosciuto): la curiosità va dove conosce meno */
export const conoscenza = (st: AgentState, tool: string) => Math.min(1, (quadernoDi(st).voci[tool]?.length ?? 0) / 60)

/** cosa sa di uno strumento, in parole (per il diario e per chi lo guarda) */
export function racconta(st: AgentState, tool: string): string {
  const xs = quadernoDi(st).voci[tool] ?? []; if (!xs.length) return `${tool}: mai provato`
  const tenuti = xs.filter(v => v.tenuto).length, vis = xs.reduce((a, v) => a + v.vis, 0) / xs.length, d = xs.reduce((a, v) => a + v.delta, 0) / xs.length
  return `${tool}: ${xs.length} prove, tenuto ${Math.round((tenuti / xs.length) * 100)}%, si vede ${(vis * 100).toFixed(0)}%, guadagno medio ${d >= 0 ? '+' : ''}${d.toFixed(3)}`
}
