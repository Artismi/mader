/**
 * Giudizio ricorsivo su tre livelli:
 *  1. le opere sono giudicate dai criteri;
 *  2. i criteri sono giudicati dalla storia: chi li ha seguiti ha prodotto
 *     interesse o stagnazione? (correlazione tra punteggio e interesse)
 *  3. i criteri che falliscono perdono peso e muoiono; ne nascono di nuovi
 *     per mutazione, a partire dalle opere che hanno funzionato.
 * È la co-evoluzione artista–critico portata dentro un solo agente.
 */
import type { AgentState, Criterion, Features } from '../core/types'
import { FEATURE_KEYS } from '../eyes/measure'
import { gauss, pick, uid, type Rnd } from '../core/rng'

export function score(c: Criterion, f: Features) {
  const v = f[c.feature] ?? 0
  return Math.max(0, 1 - Math.abs(v - c.target) / c.tolerance)
}

export function judge(criteria: Criterion[], f: Features) {
  const tot = criteria.reduce((a, c) => a + c.weight, 0) || 1
  return criteria.reduce((a, c) => a + c.weight * score(c, f), 0) / tot
}

export function born(r: Rnd, day: number, f?: Features): Criterion {
  const feature = pick(r, FEATURE_KEYS)
  const base = f ? f[feature] ?? 0.5 : r()
  return {
    id: uid(), feature, target: Math.max(0, Math.min(1, base + gauss(r) * 0.08)),
    tolerance: 0.15 + r() * 0.3, weight: 0.5, born: day, scores: [], outcomes: [],
  }
}

function corr(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length)
  if (n < 3) return 0
  const mx = x.slice(-n).reduce((a, b) => a + b, 0) / n, my = y.slice(-n).reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) { const a = x[x.length - n + i] - mx, b = y[y.length - n + i] - my; sxy += a * b; sxx += a * a; syy += b * b }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0
}

export interface CriteriaReport { strengthened: string[]; weakened: string[]; died: string[]; newborn: string[] }

/** dopo ogni opera: registra, rigiudica i criteri, fa morire e nascere */
export function evolve(st: AgentState, r: Rnd, f: Features, outcome: number): CriteriaReport {
  const rep: CriteriaReport = { strengthened: [], weakened: [], died: [], newborn: [] }
  for (const c of st.criteria) {
    c.scores.push(score(c, f)); c.outcomes.push(outcome)
    if (c.scores.length > 20) { c.scores.shift(); c.outcomes.shift() }
    const k = corr(c.scores, c.outcomes)
    const before = c.weight
    c.weight = Math.max(0, Math.min(2, c.weight + 0.15 * k))
    // il criterio impara anche il suo bersaglio: si sposta verso le opere che hanno interessato
    if (outcome > 0.55) c.target += 0.1 * ((f[c.feature] ?? c.target) - c.target)
    if (c.weight - before > 0.04) rep.strengthened.push(c.feature)
    if (before - c.weight > 0.04) rep.weakened.push(c.feature)
  }
  const dead = st.criteria.filter(c => c.weight < 0.12 && st.day - c.born > 4)
  for (const d of dead) rep.died.push(`${d.feature}≈${d.target.toFixed(2)}`)
  st.criteria = st.criteria.filter(c => !dead.includes(c))
  // nascite: da un'opera che ha interessato, o per mutazione di un criterio forte
  const births = dead.length + (r() < 0.25 ? 1 : 0)
  for (let i = 0; i < births && st.criteria.length < 14; i++) {
    let c: Criterion
    if (outcome > 0.5 || !st.criteria.length) c = born(r, st.day, f)
    else {
      const parent = st.criteria.slice().sort((a, b) => b.weight - a.weight)[0]
      c = { ...born(r, st.day), feature: parent.feature, target: Math.max(0, Math.min(1, parent.target + gauss(r) * 0.15)), tolerance: parent.tolerance }
    }
    st.criteria.push(c)
    rep.newborn.push(`${c.feature}≈${c.target.toFixed(2)}`)
  }
  return rep
}
