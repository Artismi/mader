/**
 * Strumenti dei mondi: la camera dei pattern e il Cristallo come livelli della tavola.
 * Il livello nasce già vestito (veste.ts: la luce, il bagliore, la grana) e, essendo animabile,
 * nel reel cresce davvero: le linee si allungano lungo le loro tracce, il cristallo si riempie.
 */
import { pick, range, type Rnd } from '../core/rng'
import { tempoDi } from './tempo'
import { withLayer, fullLayer, type Blend } from './sheet'
import type { Tool, ToolCtx } from './tools'
import { cercaMondo, disegnaMondo, type Indirizzo, type TipoMondo } from './mondi'
import { vesti, vesteACaso, type Veste } from './veste'
import { hexToLch } from './colore'

let n = 0
const lid = () => `w${Date.now().toString(36)}${(n++).toString(36)}`
const luce = (h: string) => hexToLch(h && h.length >= 7 ? h : '#808080').l

/** l'inchiostro del mondo: su fondo scuro la tinta più chiara della veste, su chiaro la più scura */
const inchiostroDi = (v: Veste, scuro: boolean) => [...v.colori].sort((a, b) => (scuro ? luce(b) - luce(a) : luce(a) - luce(b)))[0]

export const mondo: Tool = {
  id: 'mondo', label: 'Mondo (camera dei pattern, Cristallo)', nature: 'ripetizione', pushes: { linee: 0.35, simmetria: 0.3, complessita: 0.25 },
  available: () => typeof document !== 'undefined',
  propose: (s, c: ToolCtx) => {
    const r: Rnd = c.r, scuro = luce(s.bg) < 0.5
    const tipo: TipoMondo = r() < 0.5 ? 'camera' : 'cristallo'
    const veste = vesteACaso(r, c.colori?.length ? c.colori : [c.tone.ink, c.tone.acc], scuro)
    return {
      tipo, ind: cercaMondo(tipo, r) as unknown as Record<string, unknown>, veste: veste as unknown as Record<string, unknown>,
      spessore: range(r, 1.1, 2.6), S: 900, scuro,
      blend: scuro ? pick(r, ['screen', 'lighter', 'source-over']) : pick(r, ['multiply', 'source-over', 'darken']),
      alpha: range(r, 0.75, 1),
    }
  },
  apply: async (s, p, c) => {
    // scuro si decide alla nascita: nel reel il generatore ridisegna su un foglio neutro
    const T = tempoDi(c), v = p.veste as unknown as Veste, scuro = typeof p.scuro === 'boolean' ? p.scuro : luce(s.bg) < 0.5
    const crudo = disegnaMondo(p.ind as unknown as Indirizzo, { S: p.S as number, colore: inchiostroDi(v, scuro), crescita: T.crescita, spessore: p.spessore as number })
    return withLayer(s, fullLayer(s, lid(), 'mondo', vesti(crudo, v), p.blend as Blend, p.alpha as number))
  },
}

export const MONDI: Tool[] = [mondo]
