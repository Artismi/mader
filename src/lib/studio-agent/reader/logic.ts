/**
 * Logica minima: dalle frasi lette (e da quelle che scrive) estrae
 * affermazioni soggetto–predicato–oggetto, deduce per transitività sulle
 * frasi "X è Y", e trova contraddizioni. Le contraddizioni non le risolve:
 * le porta nel dibattito interno.
 */
import type { Belief } from '../core/types'
import { logica } from './analysis'
import { content, words } from './tokenize'

const head = (s: string) => content(words(s)).slice(-1)[0] ?? ''

export function extract(sentence: string, source: string): Belief | null {
  const L = logica(sentence)
  if (!L.predicato) return null
  const s = head(L.soggetto)
  const o = head(L.oggetto || L.complementi[0]?.testo || '')
  const verb = L.predicato.split(' ').filter(w => w !== 'non')
  const p = verb.some(v => /^(è|sono|era|erano|sia|siano|fu|furono)$/.test(v)) ? 'è' : (verb[verb.length - 1] ?? '')
  if (!s || !o || s === o || !p) return null
  return { s, p, o, neg: L.negata, source }
}

export function contradictions(beliefs: Belief[]): { a: Belief; b: Belief }[] {
  const out: { a: Belief; b: Belief }[] = []
  const key = (b: Belief) => `${b.s}|${b.p}|${b.o}`
  const seen = new Map<string, Belief>()
  for (const b of beliefs) {
    const k = key(b), prev = seen.get(k)
    if (prev && prev.neg !== b.neg) out.push({ a: prev, b })
    else seen.set(k, b)
  }
  // transitività su "è": X è Y, Y è Z ⇒ X è Z; contro "X non è Z"
  const isA = beliefs.filter(b => b.p === 'è' && !b.neg)
  const neg = beliefs.filter(b => b.p === 'è' && b.neg)
  for (const ab of isA) for (const bc of isA) {
    if (ab.o !== bc.s) continue
    const n = neg.find(x => x.s === ab.s && x.o === bc.o)
    if (n) out.push({ a: { ...ab, o: `${ab.o} → ${bc.o}`, source: `${ab.source} + ${bc.source}` }, b: n })
  }
  return out.slice(0, 12)
}

export function addBeliefs(list: Belief[], fresh: Belief[], max = 1500): Belief[] {
  const all = [...list, ...fresh]
  return all.slice(Math.max(0, all.length - max))
}
