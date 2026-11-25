/**
 * La bottega: tra un giro e l'altro Copibolo prende tavole dal cassetto e prova strumenti, regolazioni e posti,
 * senza pubblicare niente, solo per conoscerli (come si studia uno strumento musicale). Va di più dove conosce meno.
 * Ogni prova finisce nel quaderno; le prove non toccano le tavole (si buttano).
 */
import type { AgentState } from '../core/types'
import type { Rnd } from '../core/rng'
import { weighted } from '../core/rng'
import { TOOLS, type ToolCtx } from '../hands/tools'
import type { Sheet } from '../hands/sheet'
import { look } from './studio'
import { scegli, applicaDove, annota, visibile, conoscenza, quadernoDi, racconta } from './quaderno'

export async function bottega(st: AgentState, r: Rnd, tavole: { sheet: Sheet; parola: string }[], ctxDi: (parola: string) => ToolCtx, o: { prove: number; secondi: number; log?: (m: string) => void }) {
  if (!tavole.length) return 0
  const fine = performance.now() + o.secondi * 1000
  const fatte: Record<string, number> = {}
  let n = 0
  for (; n < o.prove && performance.now() < fine; n++) {
    const tv = tavole[Math.floor(r() * tavole.length)], ctx = ctxDi(tv.parola)
    const intention = ctx.intention
    const av = TOOLS.filter(t => { try { return t.available(tv.sheet, ctx) && (quadernoDi(st).schede[t.id]?.costo ?? 0) < 25000 } catch { return false } })
    if (!av.length) continue
    const tool = weighted(r, av, t => 0.2 + (1 - conoscenza(st, t.id)) ** 2, 1)
    const prima = look(st, tv.sheet, intention)
    const sc = scegli(st, tool, tv.sheet, ctx, prima.f, r)
    const t0 = performance.now()
    let dopo: Sheet
    try { dopo = await applicaDove(tool, tv.sheet, sc.p, ctx, sc.dove) } catch { annota(st, tool.id, { x: sc.x, w: tv.parola, vis: 0, cambio: 0, delta: -0.2, tenuto: false, ms: performance.now() - t0, quando: Date.now() }, performance.now() - t0); continue }
    const ms = performance.now() - t0
    const l = look(st, dopo, intention), delta = l.score - prima.score
    annota(st, tool.id, { x: sc.x, w: tv.parola, vis: visibile(tv.sheet, dopo), cambio: Object.keys(l.f).reduce((a, k) => a + Math.abs((l.f[k] ?? 0) - (prima.f[k] ?? 0)), 0) / Math.max(1, Object.keys(l.f).length), delta, tenuto: delta >= 0, ms, quando: Date.now() }, ms)
    fatte[tool.id] = (fatte[tool.id] ?? 0) + 1
  }
  const ids = Object.keys(fatte)
  o.log?.(`Bottega: ${n} prove su ${tavole.length} tavole del cassetto, ${ids.length} strumenti. ${ids.slice(0, 6).map(id => racconta(st, id)).join('; ')}.`)
  return n
}
