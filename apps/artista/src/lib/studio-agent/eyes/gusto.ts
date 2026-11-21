/**
 * Il gusto: quanto una tavola ha materia (non quanto è nuova, non quanto segue l'intenzione).
 *
 * Nasce da un'analisi di 80 sue tavole giudicate a occhio (24 belle, 29 generiche): il suo interesse non le
 * distingueva affatto (0,49 contro 0,49; correlazione 0,08 su 660 opere). Quello che le separa sono tre misure:
 * i bordi (la grana, la stratificazione, i retini, i flussi: 0,67 nelle belle contro 0,34 nelle generiche),
 * le tinte (0,33 contro 0,11) e il vuoto (0,15 contro 0,34). Con queste tre, un modello logistico riconosce
 * le belle 4 volte su 5 (validazione uno-fuori).
 *
 * Il modello è il punto di partenza, non una regola: i pesi stanno nella sua memoria e si spostano con quello
 * che succede alle tavole pubblicate (impara).
 */
import type { AgentState, Features } from '../core/types'

export interface Gusto { w: Record<string, number>; b: number; n: number }
export const GUSTO0: Gusto = { w: { bordi: 2.22, tinte: 2.25, vuoto: -0.78 }, b: -1.58, n: 0 }

type ConGusto = AgentState & { gusto?: Gusto }
const sig = (z: number) => 1 / (1 + Math.exp(-z))

/** 0..1: quanto la tavola ha materia per il suo gusto di adesso */
export function gusto(st: AgentState, f: Features): number {
  const G = (st as ConGusto).gusto ?? GUSTO0
  let z = G.b
  for (const [k, w] of Object.entries(G.w)) z += w * (f[k] ?? 0)
  return sig(z)
}

/** il gusto si sposta: una tavola che è piaciuta (esito vicino a 1) o no (vicino a 0) corregge i pesi.
 *  Possono entrare anche misure nuove (partono da zero), così il gusto non resta chiuso nelle tre di partenza. */
export function impara(st: AgentState, f: Features, esito: number, lr = 0.08) {
  const s = st as ConGusto
  const G = s.gusto ?? (s.gusto = { w: { ...GUSTO0.w }, b: GUSTO0.b, n: 0 })
  const p = gusto(st, f), e = Math.max(0, Math.min(1, esito)) - p
  const passo = lr / Math.sqrt(1 + G.n / 10)
  for (const k of Object.keys(f)) { if (!(k in G.w) && Math.abs(e) < 0.3) continue; G.w[k] = (G.w[k] ?? 0) + passo * e * (f[k] ?? 0) }
  G.b += passo * e
  G.n++
}
