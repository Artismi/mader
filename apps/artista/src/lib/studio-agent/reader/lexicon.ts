/**
 * Mappa del sapere. Ogni parola è:
 *  - ancorata: la sa fare o misurare (mani e occhi)
 *  - definita: ci arriva passando dalle definizioni fino a parole ancorate
 *  - a_vuoto: ha una definizione, ma gira su sé stessa senza toccare terra
 *  - ignota: non ne ha ancora letto la definizione
 * Il fondo del dizionario (le parole che non si spiegano con altre parole)
 * è ancorato a gesti e misure sulle immagini.
 */
import type { AgentState, LexEntry } from '../core/types'
import { content, words } from './tokenize'

export interface Anchor { feature?: string; dir?: 1 | -1; tool?: string }

/** radici → ancoraggio. La radice copre le flessioni (spezz- → spezzato, spezzare…) */
const ROOTS: [string, Anchor][] = [
  ['luc', { feature: 'luminosita', dir: 1 }], ['chiar', { feature: 'luminosita', dir: 1 }], ['bianc', { feature: 'luminosita', dir: 1 }], ['giorn', { feature: 'luminosita', dir: 1 }],
  ['buio', { feature: 'luminosita', dir: -1 }], ['bui', { feature: 'luminosita', dir: -1 }], ['scur', { feature: 'luminosita', dir: -1 }], ['ner', { feature: 'luminosita', dir: -1 }], ['ombr', { feature: 'luminosita', dir: -1 }], ['nott', { feature: 'luminosita', dir: -1 }],
  ['dens', { feature: 'densita', dir: 1 }], ['pien', { feature: 'densita', dir: 1 }], ['fitt', { feature: 'densita', dir: 1 }], ['mass', { feature: 'densita', dir: 1 }], ['peso', { feature: 'densita', dir: 1 }],
  ['vuot', { feature: 'vuoto', dir: 1 }], ['assen', { feature: 'vuoto', dir: 1 }], ['spazi', { feature: 'vuoto', dir: 1 }], ['silenz', { feature: 'vuoto', dir: 1 }], ['nulla', { feature: 'vuoto', dir: 1 }],
  ['line', { feature: 'linee', dir: 1 }], ['fil', { feature: 'linee', dir: 1, tool: 'traccia' }], ['tracc', { feature: 'linee', dir: 1, tool: 'traccia' }], ['segn', { feature: 'linee', dir: 1, tool: 'traccia' }], ['strad', { feature: 'linee', dir: 1 }],
  ['punt', { feature: 'punti', dir: 1 }], ['stell', { feature: 'punti', dir: 1 }], ['gocc', { feature: 'punti', dir: 1 }], ['sem', { feature: 'punti', dir: 1 }],
  ['superfic', { feature: 'superfici', dir: 1 }], ['pian', { feature: 'superfici', dir: 1 }], ['camp', { feature: 'superfici', dir: 1 }], ['mur', { feature: 'superfici', dir: 1, tool: 'geometria' }], ['pietr', { feature: 'superfici', dir: 1 }],
  ['diagonal', { feature: 'diagonali', dir: 1 }], ['cad', { feature: 'diagonali', dir: 1 }], ['obliqu', { feature: 'diagonali', dir: 1 }], ['salit', { feature: 'diagonali', dir: 1 }],
  ['vertical', { feature: 'verticali', dir: 1 }], ['alt', { feature: 'verticali', dir: 1 }], ['torr', { feature: 'verticali', dir: 1 }], ['alber', { feature: 'verticali', dir: 1 }], ['erett', { feature: 'verticali', dir: 1 }],
  ['orizzont', { feature: 'orizzontali', dir: 1 }], ['terr', { feature: 'orizzontali', dir: 1 }], ['mar', { feature: 'orizzontali', dir: 1 }], ['distes', { feature: 'orizzontali', dir: 1 }],
  ['simmetr', { feature: 'simmetria', dir: 1 }], ['specch', { feature: 'simmetria', dir: 1 }], ['equilibr', { feature: 'simmetria', dir: 1 }], ['ordin', { feature: 'simmetria', dir: 1 }],
  ['caos', { feature: 'complessita', dir: 1 }], ['disordin', { feature: 'complessita', dir: 1 }], ['rumor', { feature: 'complessita', dir: 1, tool: 'grana' }], ['frattur', { feature: 'complessita', dir: 1 }], ['spezz', { feature: 'complessita', dir: 1, tool: 'taglia' }], ['rott', { feature: 'complessita', dir: 1 }],
  ['contrast', { feature: 'contrasto', dir: 1 }], ['scontr', { feature: 'contrasto', dir: 1 }], ['conflitt', { feature: 'contrasto', dir: 1 }], ['lott', { feature: 'contrasto', dir: 1 }],
  ['color', { feature: 'saturazione', dir: 1 }], ['viv', { feature: 'saturazione', dir: 1 }], ['ross', { feature: 'saturazione', dir: 1 }], ['acces', { feature: 'saturazione', dir: 1 }],
  ['grig', { feature: 'saturazione', dir: -1 }], ['spent', { feature: 'saturazione', dir: -1 }], ['cener', { feature: 'saturazione', dir: -1 }], ['pallid', { feature: 'saturazione', dir: -1 }],
  ['centr', { feature: 'squilibrio', dir: -1 }], ['margin', { feature: 'squilibrio', dir: 1 }], ['bord', { feature: 'squilibrio', dir: 1 }], ['perifer', { feature: 'squilibrio', dir: 1 }], ['esil', { feature: 'squilibrio', dir: 1 }],
  ['moltitud', { feature: 'elementi', dir: 1 }], ['foll', { feature: 'elementi', dir: 1 }], ['molt', { feature: 'elementi', dir: 1 }], ['soli', { feature: 'elementi', dir: -1 }],
  ['ripet', { tool: 'ripeti' }], ['ritm', { tool: 'pattern' }], ['ond', { tool: 'pattern' }], ['trama', { tool: 'pattern' }],
  ['cerch', { tool: 'geometria' }], ['sfer', { tool: 'geometria' }], ['occh', { tool: 'geometria' }], ['croc', { tool: 'geometria' }],
  ['tagl', { tool: 'taglia' }], ['ferit', { tool: 'taglia' }], ['confin', { tool: 'taglia', feature: 'contrasto', dir: 1 }],
  ['parol', { tool: 'scrivi' }], ['scritt', { tool: 'scrivi' }], ['voce', { tool: 'scrivi' }], ['nome', { tool: 'scrivi' }],
  ['materi', { tool: 'materia' }], ['pelle', { tool: 'materia' }], ['polver', { tool: 'grana' }], ['sabbi', { tool: 'grana' }],
]

export function anchorOf(w: string): Anchor | null {
  if (w.length < 3) return null
  let best: Anchor | null = null, len = 0
  for (const [root, a] of ROOTS) if (w.startsWith(root) && root.length > len && w.length - root.length <= 6) { best = a; len = root.length }
  return best
}

export const anchorLabel = (a: Anchor) => [a.feature ? `${a.feature}${a.dir === -1 ? '−' : '+'}` : '', a.tool ? `strumento ${a.tool}` : ''].filter(Boolean).join(', ')

export function setDefinition(st: AgentState, word: string, definition: string | null, day: number) {
  const e: LexEntry = st.lexicon[word] ?? { word, state: 'ignota' }
  e.checkedDay = day
  if (definition) {
    e.definition = definition.slice(0, 600)
    e.defWords = content(words(definition)).filter(x => x !== word).slice(0, 14)
  }
  st.lexicon[word] = e
}

/** ricalcola gli stati: punto fisso "definita se la sua definizione tocca terra" */
export function ground(st: AgentState) {
  const L = st.lexicon
  for (const e of Object.values(L)) {
    const a = anchorOf(e.word)
    e.anchor = a ? anchorLabel(a) : undefined
    e.state = a ? 'ancorata' : e.definition ? 'a_vuoto' : 'ignota'
  }
  const solid = (w: string) => { const e = L[w]; return anchorOf(w) !== null || e?.state === 'ancorata' || e?.state === 'definita' }
  let changed = true, guard = 0
  while (changed && guard++ < 30) {
    changed = false
    for (const e of Object.values(L)) {
      if (e.state !== 'a_vuoto' || !e.defWords?.length) continue
      const ok = e.defWords.filter(solid).length
      if (ok / e.defWords.length >= 0.5) { e.state = 'definita'; changed = true }
    }
  }
}

export function mapCounts(st: AgentState) {
  const c = { ancorata: 0, definita: 0, a_vuoto: 0, ignota: 0 }
  for (const e of Object.values(st.lexicon)) c[e.state]++
  return c
}

/** parole da andare a cercare: quelle che ricorrono nelle letture e che non conosce */
export function toLookUp(st: AgentState, candidates: string[], n: number): string[] {
  return candidates.filter(w => {
    const e = st.lexicon[w]
    return !anchorOf(w) && (!e || (e.state === 'ignota' && (e.checkedDay ?? -99) < st.day - 7))
  }).slice(0, n)
}

/** parole della definizione ancora non toccate: il passo successivo della ricorsione */
export function frontier(st: AgentState, n: number): string[] {
  const out: string[] = []
  for (const e of Object.values(st.lexicon)) {
    if (e.state !== 'a_vuoto') continue
    for (const w of e.defWords ?? []) if (!st.lexicon[w] && !anchorOf(w) && !out.includes(w)) out.push(w)
    if (out.length >= n) break
  }
  return out.slice(0, n)
}
