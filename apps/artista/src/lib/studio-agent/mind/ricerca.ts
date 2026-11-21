/**
 * Struttura nel tempo. Invece di saltare ogni giorno su una parola nuova,
 * l'artista apre una ricerca che dura più giorni:
 *  - esplorare: una parola del tema al giorno, letture e tavole intorno
 *  - approfondire: torna sulla parola centrale, variando le tavole riuscite
 *  - sintesi: l'ultima giornata ricombina il meglio della ricerca
 * I temi sono gruppi di parole vicine nello spazio delle parole (k-medie
 * sulle direzioni della SVD): sono la sua mappa dei significati.
 */
import { posDi } from '../reader/concepts'
import { GENERICI } from './pensiero'
import type { AgentState, Ricerca, Theme } from '../core/types'
import { pick, uid, weighted, type Rnd } from '../core/rng'
import { STOP } from '../reader/tokenize'
import type { Embedding } from '../reader/wordspace'
import { pos } from '../reader/analysis'
import { looksItalian } from '../reader/tokenize'

export function computeThemes(E: Embedding, freq: (w: string) => number, k = 10, r: Rnd): Theme[] {
  // i temi si fanno con i nomi: verbi e avverbi li legano ma non li nominano
  const idx = E.words.map((_w, i) => i).filter(i => { const w = E.words[i]; return !STOP.has(w) && w.length > 3 && looksItalian(w) && pos(w) === 'nome' && posDi(w).has('n') && !posDi(w).has('r') && !GENERICI.has(w) && !/^(alcun|inoltre|quanto|primo|prima|ultimo|nuovo|volta|modo|fino|venne|diverse|molti|spesso)/.test(w) }).slice(0, 500)
  if (idx.length < k * 3) return []
  const dim = E.vecs[0].length
  let cent = Array.from({ length: k }, () => Float32Array.from(E.vecs[idx[Math.floor(r() * idx.length)]]))
  let assign = new Array(idx.length).fill(0)
  for (let it = 0; it < 12; it++) {
    assign = idx.map(i => {
      let best = 0, bs = -Infinity
      cent.forEach((c, j) => { let d = 0; for (let t = 0; t < dim; t++) d += c[t] * E.vecs[i][t]; if (d > bs) { bs = d; best = j } })
      return best
    })
    cent = cent.map((c, j) => {
      const m = new Float32Array(dim); let n = 0
      idx.forEach((i, a) => { if (assign[a] === j) { n++; for (let t = 0; t < dim; t++) m[t] += E.vecs[i][t] } })
      if (!n) return c
      const nr = Math.hypot(...m) || 1
      return m.map(x => x / nr)
    })
  }
  const themes: Theme[] = []
  for (let j = 0; j < k; j++) {
    const members = idx.filter((_, a) => assign[a] === j)
    if (members.length < 4) continue
    // parole più centrali e più frequenti per prime
    const scored = members.map(i => {
      let d = 0; for (let t = 0; t < dim; t++) d += cent[j][t] * E.vecs[i][t]
      return { w: E.words[i], s: d * Math.log(2 + freq(E.words[i])) }
    }).sort((a, b) => b.s - a.s)
    themes.push({ id: uid(), words: scored.slice(0, 12).map(x => x.w), weight: members.length })
  }
  return themes
}

const QUESTIONS = [
  (w: string) => `Che forma ha ${w}?`, (w: string) => `Dove finisce ${w}?`, (w: string) => `Chi decide che cos'è ${w}?`,
  (w: string) => `Cosa resta di ${w} se tolgo le parole?`, (w: string) => `${w}: è una cosa o un gesto?`, (w: string) => `Come si guarda ${w} da vicino?`,
]

/** apre una ricerca nuova, preferendo temi che contengono parole a vuoto e lontani dalle ricerche già chiuse */
export function openRicerca(st: AgentState, r: Rnd): Ricerca | undefined {
  const themes = st.themes ?? []
  if (!themes.length) return undefined
  const done = new Set((st.ricercheChiuse ?? []).flatMap(x => x.words))
  const theme = weighted(r, themes, t => {
    const voids = t.words.filter(w => st.lexicon[w]?.state === 'a_vuoto' || st.lexicon[w]?.state === 'ignota').length
    const seen = t.words.filter(w => done.has(w)).length
    return (1 + voids) * Math.log(2 + t.weight) / (1 + seen * 2)
  }, st.temperature)
  const word = theme.words[0]
  const length = { curioso: 8, annoiato: 5, inquieto: 5, giocoso: 6, cupo: 10, calmo: 12 }[st.mood]
  return {
    id: uid(), word, words: theme.words.slice(1, 6), question: pick(r, QUESTIONS)(word),
    start: st.day, length, phase: 'esplorare', workIds: [], findings: [],
  }
}

/** la parola di oggi dentro la ricerca, e la fase */
export function stepRicerca(rc: Ricerca, day: number): { word: string; phase: Ricerca['phase'] } {
  const t = day - rc.start
  const explore = Math.max(2, Math.floor(rc.length * 0.55))
  if (t >= rc.length - 1) return { word: rc.word, phase: 'sintesi' }
  if (t < explore) return { word: rc.words[t % Math.max(1, rc.words.length)] ?? rc.word, phase: 'esplorare' }
  return { word: rc.word, phase: 'approfondire' }
}

export const ricercaFinished = (rc: Ricerca, day: number) => day - rc.start >= rc.length - 1
