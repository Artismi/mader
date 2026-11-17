/**
 * Umore e intenzione del giorno. L'umore nasce dalla storia recente
 * (interesse, novità, opere buttate); l'intenzione nasce dalle letture e
 * dalle parole che non capisce, tradotte in bersagli visivi attraverso le
 * parole ancorate più vicine nello spazio delle parole.
 */
import type { AgentState, Intention, Mood, Register, Work } from '../core/types'
import { weighted, pick, type Rnd } from '../core/rng'
import { anchorOf } from '../reader/lexicon'
import { neighbors, type Embedding } from '../reader/wordspace'
import { TOOLS } from '../hands/tools'

export function moodOf(recent: Pick<Work, 'interest' | 'novelty' | 'kept'>[], r: Rnd): Mood {
  if (!recent.length) return 'curioso'
  const avg = (k: 'interest' | 'novelty') => recent.reduce((a, w) => a + w[k], 0) / recent.length
  const i = avg('interest'), n = avg('novelty')
  const varI = recent.reduce((a, w) => a + (w.interest - i) ** 2, 0) / recent.length
  const thrown = recent.slice(-2).filter(w => !w.kept).length
  if (r() < 0.12) return 'giocoso'
  if (thrown >= 2) return 'cupo'
  if (n < 0.2 && i < 0.45) return 'annoiato'
  if (varI > 0.04) return 'inquieto'
  if (i > 0.55) return 'curioso'
  return 'calmo'
}

export const MOOD_TEMPERATURE: Record<Mood, number> = { curioso: 1.0, annoiato: 1.4, inquieto: 1.6, giocoso: 1.3, cupo: 0.7, calmo: 0.8 }

const MOOD_REGISTER: Record<Mood, Register[]> = {
  curioso: ['documentario', 'filosofico'], annoiato: ['scherzoso', 'slogan'], inquieto: ['slogan', 'poetico'],
  giocoso: ['scherzoso'], cupo: ['filosofico', 'poetico', 'silenzio'], calmo: ['poetico', 'silenzio'],
}

export function chooseIntention(st: AgentState, r: Rnd, E: Embedding, candidates: string[], readingTitle: string): Intention {
  // preferisce le parole a vuoto (le vuole ancorare) e quelle vicine alle domande aperte
  const qWords = st.questions.filter(q => !q.closed).map(q => q.word)
  const pool = [...new Set([...candidates, ...qWords])].filter(w => w.length > 3)
  const wScore = (w: string) => {
    const e = st.lexicon[w]
    let s = 1
    if (e?.state === 'a_vuoto') s += 2
    if (e?.state === 'ignota') s += 0.5
    if (qWords.includes(w)) s += 1.5
    if (anchorOf(w)) s += 0.3
    return s
  }
  const word = pool.length ? weighted(r, pool, wScore, st.temperature) : pick(r, ['soglia', 'peso', 'confine', 'resto'])

  // bersagli visivi: dalla parola stessa o dalle ancorate vicine
  const targets: Record<string, number> = {}
  const tools = new Set<string>()
  const push = (w: string, k: number) => {
    const a = anchorOf(w)
    if (!a) return
    if (a.feature) targets[a.feature] = (targets[a.feature] ?? 0.5) + (a.dir ?? 1) * 0.3 * k
    if (a.tool) tools.add(a.tool)
  }
  push(word, 1)
  const near = neighbors(E, word, 40).filter(n => anchorOf(n.word)).slice(0, 4)
  for (const n of near) push(n.word, Math.max(0.2, n.sim))
  for (const k of Object.keys(targets)) targets[k] = Math.max(0.02, Math.min(0.98, targets[k]))
  // un criterio forte della poetica entra sempre nell'intenzione
  const strong = st.criteria.slice().sort((a, b) => b.weight - a.weight)[0]
  if (strong && targets[strong.feature] === undefined) targets[strong.feature] = strong.target

  // strumenti che hanno reso di più, più quelli suggeriti dalle parole
  const best = Object.entries(st.tools).sort((a, b) => b[1].gain - a[1].gain).slice(0, 3).map(([id]) => id)
  for (const b of best) tools.add(b)
  if (!tools.size) tools.add(pick(r, TOOLS).id)

  const regs = MOOD_REGISTER[st.mood]
  const register = weighted(r, Object.keys(st.registers) as Register[], g => (st.registers[g] ?? 1) * (regs.includes(g) ? 2.5 : 1), st.temperature)

  const e = st.lexicon[word]
  const why = [
    readingTitle ? `ho letto "${readingTitle}"` : '',
    e?.state === 'a_vuoto' ? `"${word}" per me gira a vuoto` : e?.state === 'definita' ? `"${word}" lo capisco solo per definizioni` : anchorOf(word) ? `"${word}" lo so fare` : `"${word}" non so cosa sia`,
    near.length ? `mi sta vicino a ${near.map(n => n.word).join(', ')}` : '',
  ].filter(Boolean).join('; ')

  return { word, register, targets, tools: [...tools], why }
}
