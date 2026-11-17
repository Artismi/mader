/**
 * Poetica: nasce da un seme minimo e ogni 7 giornate si riscrive da sola,
 * rileggendo criteri, strumenti, voci, registri e mappa del sapere.
 * Le versioni vecchie restano: si vede come cambia.
 */
import type { AgentState, Register } from '../core/types'
import { rng, uid, type Rnd } from '../core/rng'
import { born } from './criteria'
import { VOICES } from './voices'
import { mapCounts } from '../reader/lexicon'
import { emptySpace } from '../reader/wordspace'

export const SEED_POETICS = 'Lavoro in uno studio con strumenti di grafica procedurale. Leggo il mondo e rispondo con opere. Nessuno mi chiede di piacere.'

export const DEFAULT_FEEDS = [
  'wiki:casuale',
  'wiki:vetrina',
]

export function initialState(seed = Math.floor(Math.random() * 1e9)): AgentState {
  const r = rng(seed)
  const registers = { filosofico: 1, poetico: 1, scherzoso: 1, documentario: 1, slogan: 1, silenzio: 0.5 } as Record<Register, number>
  return {
    version: 1, name: '', day: 0, seed, mood: 'curioso', temperature: 1, wundtPeak: 0.45,
    poetics: [{ day: 0, date: new Date().toISOString(), text: SEED_POETICS }],
    notebook: [], questions: [], readings: [], beliefs: [], lexicon: {},
    criteria: Array.from({ length: 4 }, () => born(r, 0)),
    voices: Object.fromEntries(VOICES.map(v => [v, 1])),
    tools: {}, registers, codebook: [], codebookCounts: [],
    words: emptySpace(), feeds: DEFAULT_FEEDS.slice(), shaders: [], visits: [], recentVisual: [], history: [],
  }
}

const SYL = ['ra', 've', 'lo', 'mi', 'su', 'ta', 'ne', 'ko', 'ri', 'sa', 'do', 'lu', 'ze', 'na', 'go', 'fi']
export function chooseName(r: Rnd, firstWords: string[]): string {
  const base = firstWords.find(w => w.length > 4)?.slice(0, 3) ?? ''
  const n = base + Array.from({ length: 1 + Math.floor(r() * 2) }, () => SYL[Math.floor(r() * SYL.length)]).join('')
  return n.charAt(0).toUpperCase() + n.slice(1)
}

const FEATURE_WORDS: Record<string, [string, string]> = {
  luminosita: ['il buio', 'la luce'], contrasto: ['le mezze tinte', 'il contrasto netto'], densita: ['la rarefazione', 'la densità'],
  bordi: ['le campiture', 'i bordi'], diagonali: ['la stabilità', 'la diagonale'], verticali: ['il disteso', "l'eretto"], orizzontali: ["l'eretto", "l'orizzonte"],
  simmetria: ["l'asimmetria", 'lo specchio'], vuoto: ['il pieno', 'il vuoto'], squilibrio: ['il centro', 'il margine'], peso_quadrante: ['il peso distribuito', 'il peso in un angolo'],
  terzi: ['il centro', 'i terzi'], entropia: ['la semplicità', 'la varietà di toni'], complessita: ['il liscio', 'la pelle ruvida'], saturazione: ['lo spento', "l'acceso"],
  tinte: ['il monocromo', 'molti colori'], punti: ['il pieno', 'il punto'], linee: ['la massa', 'la linea'], superfici: ['il segno', 'la superficie'], elementi: ['la solitudine', 'la moltitudine'],
  centroX: ['la sinistra', 'la destra'], centroY: ["l'alto", 'il basso'],
}
const describe = (feature: string, target: number) => {
  const w = FEATURE_WORDS[feature] ?? [feature + ' basso', feature + ' alto']
  return target > 0.5 ? w[1] : w[0]
}

export function rewritePoetics(st: AgentState): string {
  const cr = st.criteria.slice().sort((a, b) => b.weight - a.weight)
  const seek = cr.slice(0, 3).map(c => describe(c.feature, c.target))
  const tools = Object.entries(st.tools).filter(([, t]) => t.uses >= 2).sort((a, b) => b[1].gain - a[1].gain)
  const hands = tools.slice(0, 3).map(([id]) => id)
  const tired = tools.slice(-2).filter(([, t]) => t.gain < 0.35).map(([id]) => id)
  const voices = Object.entries(st.voices).sort((a, b) => b[1] - a[1])
  const regs = (Object.entries(st.registers) as [Register, number][]).sort((a, b) => b[1] - a[1])
  const refused = [...new Set(st.notebook.slice(-7).flatMap(e => e.bored))].slice(0, 3)
  const m = mapCounts(st)
  const voids = Object.values(st.lexicon).filter(e => e.state === 'a_vuoto').slice(0, 5).map(e => e.word)
  const qs = st.questions.filter(q => !q.closed).slice(0, 3).map(q => q.text)
  const lines = [
    `Mi chiamo ${st.name || 'ancora senza nome'}. Giorno ${st.day}.`,
    seek.length ? `Cerco ${seek.join(', ')}.` : '',
    refused.length ? `Non voglio più: ${refused.join('; ')}.` : '',
    hands.length ? `Le mie mani sono ${hands.join(', ')}.` : '',
    tired.length ? `Mi annoiano ${tired.join(', ')}.` : '',
    `Ascolto soprattutto ${voices.slice(0, 2).map(v => v[0]).join(' e ')}; meno ${voices[voices.length - 1][0]}.`,
    `Parlo di preferenza in tono ${regs[0][0]}, a volte ${regs[1][0]}.`,
    `So fare ${m.ancorata} parole, ne capisco per definizione ${m.definita}, ${m.a_vuoto} mi girano a vuoto${voids.length ? ` (${voids.join(', ')})` : ''}.`,
    qs.length ? `Mi chiedo: ${qs.join(' / ')}` : '',
    `Mi interessa ciò che dista da me circa ${Math.round(st.wundtPeak * 100)} su 100.`,
  ]
  return lines.filter(Boolean).join('\n')
}

export function newQuestion(word: string, day: number, r: Rnd): { id: string; text: string; word: string; openedDay: number; visits: number } {
  const forms = [`Che forma ha ${word}?`, `Dove finisce ${word}?`, `Si può disegnare ${word}?`, `Chi decide che cos'è ${word}?`, `Cosa resta di ${word} se tolgo le parole?`, `${word}: è una cosa o un gesto?`]
  return { id: uid(), text: forms[Math.floor(r() * forms.length)], word, openedDay: day, visits: 0 }
}
