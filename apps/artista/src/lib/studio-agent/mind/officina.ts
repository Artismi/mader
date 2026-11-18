/**
 * L'officina: l'artista scrive codice suo.
 *
 * Due piccoli linguaggi, leggibili come testo:
 *  - TARTARUGA (LOGO, alla DreamCoder): avanti, gira, ripeti{…}, ramo{…}, scala(k){…},
 *    spessore, salta, e le funzioni che si è inventato lui;
 *  - CAMPO (alla Karl Sims): una formula f(x, y) fatta di sin, cos, distanze, angoli,
 *    moduli… che diventa una texture, una maschera, un colore.
 *
 * Quando gli serve una forma che non ha, scrive programmi a caso dalla sua grammatica,
 * li guarda (rasterizza e misura), li critica e li fa evolvere per qualche generazione
 * (mutazioni, incroci). Tiene il migliore, lo battezza, scrive cosa non gli piace.
 * Dalla tartaruga riuscita estrae il pezzo che si ripete e lo aggiunge alla sua
 * libreria come funzione nuova: i programmi di domani potranno chiamarla
 * (apprendimento di libreria). Così il suo linguaggio cresce con lui.
 *
 * Guarda con occhio critico: niente rumore, una forma che regge, densità sensata,
 * diverso da ciò che ha già (novità), vicino a quello che il concetto chiede.
 */
import type { AgentState, Features } from '../core/types'
import { pick, range, type Rnd } from '../core/rng'
import { measure, rasterize, featureDistance } from '../eyes/measure'
import { newCanvas } from '../hands/sheet'

export type TNode = ['F', number] | ['T', number] | ['R', number, TNode[]] | ['B', TNode[]] | ['S', number, TNode[]] | ['W', number] | ['J', number] | ['C', string]
export type ENode = ['x'] | ['y'] | ['r'] | ['a'] | ['k', number] | [EOp, ENode] | [EOp2, ENode, ENode]
type EOp = 'sin' | 'cos' | 'abs' | 'neg' | 'sq' | 'fract'
type EOp2 = 'add' | 'mul' | 'sub' | 'max' | 'min' | 'mod'

export interface Generatore {
  id: string; nome: string; tipo: 'tartaruga' | 'campo'
  prog: TNode[] | ENode; testo: string
  nato: number; concetto: string; critica: string; punteggio: number; usi: number; f: Features
}
export interface Officina { gen: Generatore[]; libreria: Record<string, { body: TNode[]; testo: string; nato: number }>; diario: string[] }

type WithO = AgentState & { officina?: Officina }
export const getOfficina = (st: AgentState) => (st as WithO).officina
export function ensureOfficina(st: AgentState): Officina { return ((st as WithO).officina ??= { gen: [], libreria: {}, diario: [] }) }

// ─── tartaruga ──────────────────────────────────────────────────────────────
function rndT(r: Rnd, lib: string[], depth: number): TNode[] {
  const n = 1 + Math.floor(r() * (depth > 1 ? 3 : 4))
  const out: TNode[] = []
  for (let i = 0; i < n; i++) {
    const k = r()
    if (lib.length && k < 0.14) out.push(['C', pick(r, lib)])
    else if (depth > 0 && k < 0.36) out.push(['R', 2 + Math.floor(r() * 9), rndT(r, lib, depth - 1)])
    else if (depth > 0 && k < 0.5) out.push(['B', rndT(r, lib, depth - 1)])
    else if (depth > 0 && k < 0.57) out.push(['S', +range(r, 0.5, 0.92).toFixed(2), rndT(r, lib, depth - 1)])
    else if (k < 0.62) out.push(['W', +range(r, 0.5, 6).toFixed(1)])
    else if (k < 0.66) out.push(['J', Math.round(range(r, 5, 40))])
    else if (k < 0.84) out.push(['F', Math.round(range(r, 5, 60))])
    else out.push(['T', Math.round(pick(r, [15, 30, 45, 60, 72, 90, 120, 137, 144, 160, range(r, -170, 170)]))])
  }
  if (!out.some(x => x[0] === 'F' || x[0] === 'R' || x[0] === 'C')) out.push(['F', 30])
  return out
}

export function testoT(p: TNode[]): string {
  return p.map(n => {
    switch (n[0]) {
      case 'F': return `avanti(${n[1]})`
      case 'T': return `gira(${n[1]})`
      case 'W': return `spessore(${n[1]})`
      case 'J': return `salta(${n[1]})`
      case 'C': return `${n[1]}()`
      case 'R': return `ripeti(${n[1]}) { ${testoT(n[2])} }`
      case 'B': return `ramo { ${testoT(n[1])} }`
      case 'S': return `scala(${n[1]}) { ${testoT(n[2])} }`
    }
  }).join(' ')
}

interface Seg { x0: number; y0: number; x1: number; y1: number; w: number }
function eseguiT(p: TNode[], lib: Officina['libreria'], max = 12000): Seg[] {
  const segs: Seg[] = []
  let x = 0, y = 0, a = -Math.PI / 2, s = 1, w = 2
  let calls = 0
  const run = (ns: TNode[], depth: number) => {
    if (depth > 9) return
    for (const n of ns) {
      if (segs.length > max || ++calls > 60000) return
      switch (n[0]) {
        case 'F': { const nx = x + Math.cos(a) * n[1] * s, ny = y + Math.sin(a) * n[1] * s; segs.push({ x0: x, y0: y, x1: nx, y1: ny, w: w * s }); x = nx; y = ny; break }
        case 'J': x += Math.cos(a) * n[1] * s; y += Math.sin(a) * n[1] * s; break
        case 'T': a += (n[1] * Math.PI) / 180; break
        case 'W': w = n[1]; break
        case 'R': for (let i = 0; i < n[1]; i++) run(n[2], depth + 1); break
        case 'B': { const sv = [x, y, a, s, w] as const; run(n[1], depth + 1); [x, y, a, s, w] = sv; break }
        case 'S': { const sv = s; s *= n[1]; run(n[2], depth + 1); s = sv; break }
        case 'C': { const f = lib[n[1]]; if (f) run(f.body, depth + 1); break }
      }
    }
  }
  run(p, 0)
  return segs
}

export function disegnaT(p: TNode[], lib: Officina['libreria'], size: number, color: string, peso = 1): HTMLCanvasElement {
  const segs = eseguiT(p, lib)
  const cv = newCanvas(size, size), g = cv.getContext('2d')!
  if (!segs.length) return cv
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const s of segs) { x0 = Math.min(x0, s.x0, s.x1); y0 = Math.min(y0, s.y0, s.y1); x1 = Math.max(x1, s.x0, s.x1); y1 = Math.max(y1, s.y0, s.y1) }
  const k = (size * 0.9) / Math.max(1e-6, x1 - x0, y1 - y0)
  const ox = size / 2 - ((x0 + x1) / 2) * k, oy = size / 2 - ((y0 + y1) / 2) * k
  g.strokeStyle = color; g.lineCap = 'round'
  const wk = Math.max(0.6, (size / 400) * peso)
  for (const s of segs) { g.lineWidth = Math.max(0.6, s.w * wk); g.beginPath(); g.moveTo(ox + s.x0 * k, oy + s.y0 * k); g.lineTo(ox + s.x1 * k, oy + s.y1 * k); g.stroke() }
  return cv
}

const sizeT = (p: TNode[]): number => p.reduce((a, n) => a + 1 + (n[0] === 'R' || n[0] === 'S' ? sizeT(n[2]) : n[0] === 'B' ? sizeT(n[1]) : 0), 0)
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

function mutaT(p: TNode[], r: Rnd, lib: string[]): TNode[] {
  const q = clone(p)
  const all: { arr: TNode[]; i: number }[] = []
  const walk = (arr: TNode[]) => arr.forEach((n, i) => { all.push({ arr, i }); if (n[0] === 'R' || n[0] === 'S') walk(n[2]); if (n[0] === 'B') walk(n[1]) })
  walk(q)
  const { arr, i } = pick(r, all)
  const n = arr[i]
  const k = r()
  if (k < 0.4 && (n[0] === 'F' || n[0] === 'T' || n[0] === 'R' || n[0] === 'S' || n[0] === 'W' || n[0] === 'J')) {
    if (n[0] === 'R') n[1] = Math.max(2, Math.min(24, n[1] + pick(r, [-2, -1, 1, 2, 3])))
    else if (n[0] === 'S') n[1] = +Math.max(0.4, Math.min(0.95, n[1] + (r() - 0.5) * 0.2)).toFixed(2)
    else n[1] = Math.round(n[1] * range(r, 0.6, 1.5) + (n[0] === 'T' ? range(r, -15, 15) : 0))
  } else if (k < 0.6) arr[i] = rndT(r, lib, 1)[0]
  else if (k < 0.75) arr.splice(i, 0, ...rndT(r, lib, 1))
  else if (k < 0.85 && arr.length > 1) arr.splice(i, 1)
  else arr[i] = ['R', 2 + Math.floor(r() * 6), [n]]
  return q
}
function incrociaT(a: TNode[], b: TNode[], r: Rnd): TNode[] {
  const cut = Math.floor(r() * (a.length + 1)), cut2 = Math.floor(r() * (b.length + 1))
  const c = [...clone(a).slice(0, cut), ...clone(b).slice(cut2)]
  return c.length ? c : clone(a)
}

// ─── campo ──────────────────────────────────────────────────────────────────
function rndE(r: Rnd, d: number): ENode {
  if (d <= 0 || r() < 0.22) { const k = r(); return k < 0.25 ? ['x'] : k < 0.5 ? ['y'] : k < 0.68 ? ['r'] : k < 0.8 ? ['a'] : ['k', +range(r, -3, 6).toFixed(2)] }
  if (r() < 0.45) return [pick(r, ['sin', 'cos', 'abs', 'neg', 'sq', 'fract'] as EOp[]), rndE(r, d - 1)]
  return [pick(r, ['add', 'mul', 'sub', 'max', 'min', 'mod', 'mul', 'mul'] as EOp2[]), rndE(r, d - 1), rndE(r, d - 1)]
}
export function testoE(e: ENode): string {
  switch (e[0]) {
    case 'x': case 'y': case 'r': case 'a': return e[0]
    case 'k': return String(e[1])
    case 'add': return `(${testoE(e[1] as ENode)} + ${testoE(e[2] as ENode)})`
    case 'sub': return `(${testoE(e[1] as ENode)} − ${testoE(e[2] as ENode)})`
    case 'mul': return `${testoE(e[1] as ENode)}·${testoE(e[2] as ENode)}`
    default: return e.length === 3 ? `${e[0]}(${testoE(e[1] as ENode)}, ${testoE(e[2] as ENode)})` : `${e[0]}(${testoE(e[1] as ENode)})`
  }
}
function evalE(e: ENode, x: number, y: number, r0: number, a0: number): number {
  switch (e[0]) {
    case 'x': return x
    case 'y': return y
    case 'r': return r0
    case 'a': return a0
    case 'k': return e[1]
    case 'sin': return Math.sin(evalE(e[1], x, y, r0, a0) * Math.PI)
    case 'cos': return Math.cos(evalE(e[1], x, y, r0, a0) * Math.PI)
    case 'abs': return Math.abs(evalE(e[1], x, y, r0, a0))
    case 'neg': return -evalE(e[1], x, y, r0, a0)
    case 'sq': { const v = evalE(e[1], x, y, r0, a0); return v * v }
    case 'fract': { const v = evalE(e[1], x, y, r0, a0); return v - Math.floor(v) }
    case 'add': return evalE(e[1], x, y, r0, a0) + evalE(e[2], x, y, r0, a0)
    case 'sub': return evalE(e[1], x, y, r0, a0) - evalE(e[2], x, y, r0, a0)
    case 'mul': return evalE(e[1], x, y, r0, a0) * evalE(e[2], x, y, r0, a0)
    case 'max': return Math.max(evalE(e[1], x, y, r0, a0), evalE(e[2], x, y, r0, a0))
    case 'min': return Math.min(evalE(e[1], x, y, r0, a0), evalE(e[2], x, y, r0, a0))
    case 'mod': { const b = evalE(e[2], x, y, r0, a0); return Math.abs(b) < 1e-3 ? 0 : evalE(e[1], x, y, r0, a0) % b }
  }
}
const hexRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
/** il campo come immagine: due colori, o maschera (trasparente dove il valore è basso) */
export function disegnaE(e: ENode, size: number, c1: string, c2: string | null): HTMLCanvasElement {
  const cv = newCanvas(size, size), g = cv.getContext('2d')!
  const img = g.createImageData(size, size)
  const A = hexRgb(c1), B = c2 ? hexRgb(c2) : A
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = (i / size) * 2 - 1, y = (j / size) * 2 - 1
    let v = evalE(e, x, y, Math.hypot(x, y), Math.atan2(y, x) / Math.PI)
    v = Number.isFinite(v) ? 0.5 + 0.5 * Math.tanh(v) : 0
    const o = (j * size + i) * 4
    img.data[o] = A[0] * v + B[0] * (1 - v); img.data[o + 1] = A[1] * v + B[1] * (1 - v); img.data[o + 2] = A[2] * v + B[2] * (1 - v)
    img.data[o + 3] = c2 ? 255 : v > 0.55 ? 255 : v > 0.45 ? (v - 0.45) * 2550 : 0
  }
  g.putImageData(img, 0, 0)
  return cv
}
const sizeE = (e: ENode): number => (e.length === 3 && typeof e[1] !== 'number' ? 1 + sizeE(e[1] as ENode) + sizeE(e[2] as ENode) : e.length === 2 && typeof e[1] !== 'number' ? 1 + sizeE(e[1] as ENode) : 1)
function mutaE(e: ENode, r: Rnd): ENode {
  if (r() < 0.25) return rndE(r, 3)
  const q = clone(e)
  if (q[0] === 'k') { q[1] = +(q[1] + (r() - 0.5) * 2).toFixed(2); return q }
  if (q.length === 2 && typeof q[1] !== 'number') return r() < 0.3 ? [pick(r, ['sin', 'cos', 'abs', 'sq', 'fract'] as EOp[]), q[1] as ENode] : [q[0] as EOp, mutaE(q[1] as ENode, r)]
  if (q.length === 3) return r() < 0.5 ? [q[0] as EOp2, mutaE(q[1] as ENode, r), q[2] as ENode] : [q[0] as EOp2, q[1] as ENode, mutaE(q[2] as ENode, r)]
  return rndE(r, 2)
}

// ─── l'occhio critico ───────────────────────────────────────────────────────
function critica(f: Features, vuole: Features, archivio: Features[]): { score: number; giudizio: string } {
  const difetti: string[] = []
  let s = 0.35 * (f.forma ?? 0.5) + 0.2 * (1 - Math.min(1, (f.rumore ?? 0) * 1.5))
  const dens = f.densita
  if (dens < 0.04) { difetti.push('quasi vuoto'); s -= 0.3 } else if (dens > 0.7) { difetti.push('troppo pieno'); s -= 0.2 } else s += 0.1
  if ((f.rumore ?? 0) > 0.45) difetti.push('rumore')
  if ((f.forma ?? 0) < 0.35) difetti.push('nessuna forma regge')
  if (f.simmetria > 0.92 && f.complessita < 0.15) { difetti.push('simmetrico e morto'); s -= 0.1 }
  const keys = Object.keys(vuole)
  if (keys.length) s += 0.2 * (1 - keys.reduce((a, k) => a + Math.abs((f[k] ?? 0) - vuole[k]), 0) / keys.length)
  const nov = archivio.length ? Math.min(...archivio.map(a => featureDistance(f, a))) : 0.5
  s += 0.2 * Math.min(1, nov * 3)
  if (nov < 0.05) difetti.push('già fatto')
  return { score: s, giudizio: difetti.length ? difetti.join(', ') : 'regge' }
}

const guarda = (cv: HTMLCanvasElement) => measure(rasterize(cv, 64))

/** scrive e fa evolvere un generatore per un concetto; restituisce il migliore, con la sua critica */
export function scriviGeneratore(st: AgentState, r: Rnd, concetto: string, vuole: Features, tipo?: 'tartaruga' | 'campo'): Generatore {
  const O = ensureOfficina(st)
  const t = tipo ?? (r() < 0.6 ? 'tartaruga' : 'campo')
  const lib = Object.keys(O.libreria)
  const arch = O.gen.filter(g => g.tipo === t).map(g => g.f)
  type Ind = { p: TNode[] | ENode; f: Features; s: number; g: string }
  const val = (p: TNode[] | ENode): Ind => {
    const cv = t === 'tartaruga' ? disegnaT(p as TNode[], O.libreria, 96, '#000') : disegnaE(p as ENode, 64, '#000000', '#ffffff')
    if (t === 'tartaruga') { const g = cv.getContext('2d')!; g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height) }
    const f = guarda(cv)
    const c = critica(f, vuole, arch)
    const lungo = t === 'tartaruga' ? sizeT(p as TNode[]) : sizeE(p as ENode)
    return { p, f, s: c.score - Math.max(0, lungo - 30) * 0.004, g: c.giudizio }
  }
  let pop: Ind[] = Array.from({ length: 10 }, () => val(t === 'tartaruga' ? rndT(r, lib, 2) : rndE(r, 4)))
  for (let gen = 0; gen < 4; gen++) {
    pop.sort((a, b) => b.s - a.s)
    const elite = pop.slice(0, 4)
    const figli: Ind[] = []
    for (let i = 0; i < 6; i++) {
      const a = pick(r, elite), b = pick(r, elite)
      const p = t === 'tartaruga'
        ? mutaT(r() < 0.4 ? incrociaT(a.p as TNode[], b.p as TNode[], r) : (a.p as TNode[]), r, lib)
        : mutaE(r() < 0.3 ? ([pick(r, ['add', 'mul', 'max', 'min'] as EOp2[]), a.p as ENode, b.p as ENode] as ENode) : (a.p as ENode), r)
      figli.push(val(p))
    }
    pop = [...elite, ...figli]
  }
  pop.sort((a, b) => b.s - a.s)
  const best = pop[0]
  const n = O.gen.length + 1
  const nome = `${concetto}_${n}`
  const gen: Generatore = {
    id: `g${Date.now().toString(36)}${n}`, nome, tipo: t, prog: best.p,
    testo: t === 'tartaruga' ? testoT(best.p as TNode[]) : `f(x, y) = ${testoE(best.p as ENode)}`,
    nato: st.day, concetto, critica: best.g, punteggio: +best.s.toFixed(3), usi: 0, f: best.f,
  }
  O.gen = [...O.gen, gen].slice(-120)
  // apprendimento di libreria: il pezzo ripetuto più ricco diventa una funzione sua
  if (t === 'tartaruga' && best.s > 0.45) {
    let cand: TNode[] | null = null
    const walk = (ns: TNode[]) => ns.forEach(x => { if ((x[0] === 'R' || x[0] === 'S') && sizeT(x[2]) >= 3 && (!cand || sizeT(x[2]) > sizeT(cand))) cand = x[2]; if (x[0] === 'R' || x[0] === 'S') walk(x[2]); if (x[0] === 'B') walk(x[1]) })
    walk(best.p as TNode[])
    const c = cand as TNode[] | null
    if (c) {
      const tx = testoT(c)
      if (!Object.values(O.libreria).some(f => f.testo === tx)) {
        const fname = `${concetto.slice(0, 8)}${Object.keys(O.libreria).length + 1}`
        O.libreria[fname] = { body: clone(c), testo: tx, nato: st.day }
        O.diario = [...O.diario, `giorno ${st.day}: nuova funzione ${fname}() = ${tx}`].slice(-60)
      }
    }
  }
  O.diario = [...O.diario, `giorno ${st.day}: ${nome} (${t}) — ${gen.testo.slice(0, 120)} — critica: ${gen.critica}`].slice(-60)
  return gen
}

export const generatoreById = (st: AgentState, id?: string) => (id ? ensureOfficina(st).gen.find(g => g.id === id) : undefined)

/** disegna un generatore come segno (tartaruga: tratto; campo: maschera piena o due colori) */
export function disegnaGeneratore(st: AgentState, g: Generatore, size: number, color: string, secondo: string | null = null): HTMLCanvasElement {
  g.usi++
  return g.tipo === 'tartaruga' ? disegnaT(g.prog as TNode[], ensureOfficina(st).libreria, size, color, 1.6) : disegnaE(g.prog as ENode, Math.min(size, 360), color, secondo)
}
