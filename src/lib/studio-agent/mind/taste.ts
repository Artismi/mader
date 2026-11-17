/**
 * Gusto procedurale.
 *  - progresso di compressione (Schmidhuber): un'opera interessa se costringe
 *    a riorganizzare il codebook delle forme; ciò che è già capito annoia.
 *  - curva di Wundt (Berlyne, Saunders e Gero): interesse massimo a distanza
 *    intermedia dal già visto; troppo simile annoia, troppo diverso è rumore.
 */
import type { AgentState, Features } from '../core/types'
import { featureDistance } from '../eyes/measure'
import { histDistance, quantError } from '../eyes/visual-words'

export function novelty(st: AgentState, f: Features, words: number[]): number {
  if (!st.recentVisual.length) return 0.5
  let best = Infinity
  for (const v of st.recentVisual) {
    const d = 0.6 * Math.min(1, featureDistance(f, v.features) * 3) + 0.4 * histDistance(words, v.words)
    best = Math.min(best, d)
  }
  return Math.min(1, best)
}

export function wundt(nov: number, peak: number) {
  const width = 0.22
  return Math.exp(-((nov - peak) ** 2) / (2 * width * width))
}

/** progresso stimato senza toccare il codebook (per i gesti intermedi) */
export function expectedProgress(st: AgentState, patches: number[][]) {
  if (!st.codebook.length) return 0.3
  return Math.min(1, quantError(st.codebook, patches) / 0.8)
}

export function interest(st: AgentState, nov: number, prog: number) {
  return 0.55 * wundt(nov, st.wundtPeak) + 0.45 * prog
}

/** il picco di Wundt si sposta verso le novità che hanno dato più progresso */
export function adaptPeak(st: AgentState, nov: number, prog: number) {
  const lr = 0.05 * prog
  st.wundtPeak = Math.max(0.15, Math.min(0.85, st.wundtPeak + lr * (nov - st.wundtPeak)))
}
