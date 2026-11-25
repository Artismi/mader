/**
 * La direzione: prima di fare, decide che tavola è. Una visione d'insieme (il registro) con la sua economia:
 * quanti gesti ancora dopo la scena, quante figure al massimo, quanto vuoto deve restare, se è ammesso un trattamento
 * che cambia tutta la tavola (uno al massimo, mai due). I gesti poi servono la direzione: quelli che la tradiscono
 * (una figura di troppo, un secondo trattamento, il vuoto che sparisce) non si tengono, anche se lo sguardo li gradisce.
 * Quale registro scegliere lo impara: ognuno ha la sua media di esiti (interesse della tavola), e si campiona (Thompson).
 */
import type { AgentState } from '../core/types'
import type { Rnd } from '../core/rng'
import type { Sheet } from '../hands/sheet'

export interface Registro { id: string; nome: string; passi: [number, number]; figure: number; vuoto: number; trattamento: boolean }
export const REGISTRI: Registro[] = [
  { id: 'segno', nome: 'un solo segno, molto vuoto', passi: [0, 2], figure: 1, vuoto: 0.45, trattamento: false },
  { id: 'manifesto', nome: 'manifesto tipografico', passi: [1, 3], figure: 2, vuoto: 0.3, trattamento: true },
  { id: 'scientifica', nome: 'tavola scientifica, con etichette', passi: [2, 4], figure: 3, vuoto: 0.25, trattamento: false },
  { id: 'pagina', nome: 'pagina di rivista: griglia, immagine e testo', passi: [2, 4], figure: 2, vuoto: 0.3, trattamento: true },
  { id: 'materico', nome: 'collage materico', passi: [4, 7], figure: 4, vuoto: 0.12, trattamento: true },
]
/** i trattamenti che cambiano tutta la tavola: uno al massimo per tavola */
export const TRATTAMENTI = new Set(['duotono', 'caleido', 'ondine', 'mosaico', 'dither', 'colata', 'memoria', 'affettatore', 'filtro', 'vetro', 'luce3d', 'stiro', 'sciame', 'particelle', 'acqua', 'shader', 'sfasa'])

type Memo = Record<string, { n: number; m: number; s2: number }>
const memo = (st: AgentState): Memo => ((st as AgentState & { registri?: Memo }).registri ??= {})

export function scegliRegistro(st: AgentState, r: Rnd): Registro {
  const M = memo(st)
  let best = REGISTRI[0], bv = -Infinity
  for (const g of REGISTRI) {
    const x = M[g.id] ?? { n: 0, m: 0.5, s2: 0.04 }
    const sd = Math.sqrt((x.s2 + 0.02) / (x.n + 1))
    const z = Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r())
    const v = x.m + sd * z
    if (v > bv) { bv = v; best = g }
  }
  return best
}

export function esitoRegistro(st: AgentState, id: string, v: number) {
  const M = memo(st), x = (M[id] ??= { n: 0, m: 0.5, s2: 0.04 })
  x.n = Math.min(x.n + 1, 40) // dimentica piano: le cose cambiano
  const d = v - x.m; x.m += d / x.n; x.s2 += (d * (v - x.m) - x.s2) / x.n
}

const TXT = /testo|tipografia|etichette|firma|piastra/
export const figure = (s: Sheet) => s.layers.filter(l => !TXT.test(l.kind) && !l.meta?.text && l.scale < 0.99).length
export const trattamenti = (ids: string[]) => ids.filter(id => TRATTAMENTI.has(id)).length

/** il gesto tradisce la direzione? (dopo il gesto) */
export function tradisce(g: Registro, prima: Sheet, dopo: Sheet, tenuti: string[], tool: string, vuotoDopo: number): string | null {
  if (TRATTAMENTI.has(tool) && (!g.trattamento || trattamenti(tenuti) >= 1)) return 'un secondo trattamento'
  if (figure(dopo) > Math.max(g.figure, figure(prima))) return 'una figura di troppo'
  if (vuotoDopo < g.vuoto && vuotoDopo < 0.9) return 'il vuoto che sparisce'
  return null
}
