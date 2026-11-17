/**
 * La voce: titoli, scritte e testi senza modelli linguistici.
 * Tre tecniche, scelte dal registro e dal caso:
 *  - cut-up (Burroughs): frammenti di letture diverse cuciti insieme
 *  - catena di Markov di ordine 2 sul suo corpus (letture + suoi testi)
 *  - grammatiche a modelli, riempite con le parole dell'intenzione,
 *    i vicini nello spazio delle parole e gli aggettivi visivi dell'opera
 */
import type { Belief, Features, Gesture, Register, Reading } from '../core/types'
import { semanticLine, semanticLines } from './semantic'
import { conceptsReady } from '../reader/concepts'
import { concorda } from './lingua'
import { pick, chance, type Rnd } from '../core/rng'
import { sentences, words, content, STOP } from '../reader/tokenize'

const ADJ: [string, (f: Features) => boolean][] = [
  ['denso', f => f.densita > 0.6], ['vuoto', f => f.vuoto > 0.45], ['buio', f => f.luminosita < 0.3], ['chiaro', f => f.luminosita > 0.7],
  ['obliquo', f => f.diagonali > 0.45], ['ruvido', f => f.complessita > 0.7], ['liscio', f => f.complessita < 0.2],
  ['sbilanciato', f => f.squilibrio > 0.45], ['speculare', f => f.simmetria > 0.75], ['netto', f => f.contrasto > 0.7],
  ['spento', f => f.saturazione < 0.12], ['acceso', f => f.saturazione > 0.5], ['affollato', f => f.elementi > 0.7], ['solo', f => f.elementi < 0.1],
  ['verticale', f => f.verticali > 0.45], ['disteso', f => f.orizzontali > 0.45], ['puntiforme', f => f.punti > 0.6], ['filiforme', f => f.linee > 0.55],
]
export const adjectivesOf = (f: Features) => ADJ.filter(([, t]) => t(f)).map(([a]) => a)

const VERBI = ['resta', 'cade', 'brucia', 'aspetta', 'si spezza', 'torna', 'tace', 'insiste', 'si ripete', 'manca', 'resiste', 'scivola']

const TEMPLATES: Record<Register, string[]> = {
  filosofico: ['Del {w} resta {a}', '{W} come {n}', 'Che cosa {v} nel {w}?', 'Il {w} non è {n}', 'Ciò che {v} quando manca il {w}', '{W} e il suo contrario'],
  poetico: ['{W} {a}', '{w}, {n} e {n2}', 'Per un {w} {a}', 'Dove {v} il {n}', 'Piccolo {w} {a}', '{N} sotto il {w}'],
  scherzoso: ['Istruzioni per {w}', '{W} (versione economica)', 'Il {w} è in pausa pranzo', 'Manuale del perfetto {w}', '{W}, ma di lunedì', 'Ho perso il {w}, se lo trovate {v}'],
  documentario: ['{W}, giorno {d}', 'Studio n. {d} su {w}', '{W}: {n}', 'Appunti su {w} e {n}', '{W} ({a})'],
  slogan: ['{W} SUBITO', '{W} PER TUTTI', 'IL {w} {v}', 'NESSUN {w} È {a}', 'TUTTO IL {w} A CHI {v}'],
  silenzio: ['', 'Senza titolo {d}', '—', '{d}'],
}

export interface VoiceCtx {
  r: Rnd
  register: Register
  word: string
  near: string[]
  features?: Features
  readings: Reading[]
  ownTexts: string[]
  day: number
  beliefs?: Belief[]
}

const sem = (c: VoiceCtx) => ({ r: c.r, register: c.register, word: c.word, near: c.near, beliefs: c.beliefs ?? [] })

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function fill(t: string, c: VoiceCtx) {
  const n = c.near.length ? c.near : content(words(c.readings.map(r => r.title).join(' '))).slice(0, 8)
  const adjs = c.features ? adjectivesOf(c.features) : []
  return t
    .replace(/\{W\}/g, c.register === 'slogan' ? c.word.toUpperCase() : cap(c.word))
    .replace(/\{w\}/g, c.register === 'slogan' ? c.word.toUpperCase() : c.word)
    .replace(/\{N\}/g, () => cap(pick(c.r, n.length ? n : ['resto'])))
    .replace(/\{n2\}/g, () => pick(c.r, n.length ? n : ['niente']))
    .replace(/\{n\}/g, () => pick(c.r, n.length ? n : ['niente']))
    .replace(/\{a\}/g, () => (c.register === 'slogan' ? pick(c.r, adjs.length ? adjs : ['inutile']).toUpperCase() : pick(c.r, adjs.length ? adjs : ['incerto'])))
    .replace(/\{v\}/g, () => (c.register === 'slogan' ? pick(c.r, VERBI).toUpperCase() : pick(c.r, VERBI)))
    .replace(/\{d\}/g, String(c.day))
}

/** cut-up: 2–3 frammenti brevi da letture diverse */
export function cutup(c: VoiceCtx, parts = 2): string {
  const pool = c.readings.flatMap(r => sentences(r.text).slice(0, 30))
  if (!pool.length) return c.word
  const frags: string[] = []
  for (let i = 0; i < parts; i++) {
    const ws = pick(c.r, pool).split(/\s+/)
    const len = 2 + Math.floor(c.r() * 4)
    const st = Math.floor(c.r() * Math.max(1, ws.length - len))
    const piece = ws.slice(st, st + len).map(w => w.replace(/[.,;:«»"()*]/g, '')).filter(w => /^[\p{L}'’-]+$/u.test(w))
    // non comincia né finisce su una parola vuota
    while (piece.length && STOP.has(piece[0].toLowerCase())) piece.shift()
    while (piece.length > 1 && STOP.has(piece[piece.length - 1].toLowerCase())) piece.pop()
    if (piece.length) frags.push(piece.join(' '))
  }
  return (frags.join(' ') || c.word).toLowerCase()
}

/** catena di Markov di ordine 2 */
export function markov(c: VoiceCtx, maxWords = 14): string {
  const corpus = [...c.readings.flatMap(r => sentences(r.text)), ...c.ownTexts].join(' ').toLowerCase().replace(/[«»"()*]/g, '')
  const toks = corpus.split(/\s+/).filter(Boolean)
  if (toks.length < 30) return cutup(c, 3)
  const next = new Map<string, string[]>()
  for (let i = 0; i < toks.length - 2; i++) {
    const k = toks[i] + ' ' + toks[i + 1]
    const arr = next.get(k) ?? []
    arr.push(toks[i + 2]); next.set(k, arr)
  }
  const starts = [...next.keys()].filter(k => k.includes(c.word))
  let key = starts.length ? pick(c.r, starts) : pick(c.r, [...next.keys()])
  const out = key.split(' ')
  for (let i = 0; i < maxWords; i++) {
    const opts = next.get(key)
    if (!opts) break
    const w = pick(c.r, opts)
    out.push(w)
    if (/[.!?]$/.test(w) && out.length > 5) break
    key = out.slice(-2).join(' ')
  }
  return cap(out.join(' ').replace(/[,;:]$/, ''))
}

export function title(c: VoiceCtx): string { return concorda(titleRaw(c)) }
function titleRaw(c: VoiceCtx): string {
  const roll = c.r()
  if (c.register === 'silenzio') return fill(pick(c.r, TEMPLATES.silenzio), c)
  if (conceptsReady() && roll < 0.7) { const l = semanticLine(sem(c)); if (l) return cap(l) }
  if (roll < 0.55) return fill(pick(c.r, TEMPLATES[c.register]), c)
  if (roll < 0.8) return cap(cutup(c, 2))
  return markov(c, 6)
}

/** testo breve da scrivere dentro l'opera */
export function inscription(c: VoiceCtx): string { return concorda(inscriptionRaw(c)) }
function inscriptionRaw(c: VoiceCtx): string {
  if (conceptsReady() && c.register !== 'silenzio' && c.r() < 0.7) { const l = semanticLine(sem(c)); if (l) return l }
  switch (c.register) {
    case 'slogan': return fill(pick(c.r, TEMPLATES.slogan), c)
    case 'documentario': return chance(c.r, 0.5) ? cutup(c, 3) : `${c.word} / ${c.near.slice(0, 3).join(' / ')}`
    case 'scherzoso': return fill(pick(c.r, TEMPLATES.scherzoso), c)
    case 'silenzio': return c.word
    default: return chance(c.r, 0.5) ? cutup(c, 2) : fill(pick(c.r, TEMPLATES[c.register]), c)
  }
}

const GESTO: Record<string, string> = {
  semina: 'seminato una ricetta', materia: 'dato materia con un effetto', luce: 'cambiato la luce', geometria: 'messo una forma geometrica',
  pattern: 'steso un pattern', traccia: 'tracciato col pennello', scrivi: 'scritto', grana: 'sporcato di grana', taglia: 'tagliato',
  ripeti: 'ripetuto', disponi: 'spostato le cose', togli: 'tolto un livello', fondo: 'cambiato il fondo', shader: 'usato codice raccolto', schiaccia: 'unito i livelli',
}

export function gestureAccount(gs: Gesture[]): string {
  const kept = gs.filter(g => g.kept)
  const thrown = gs.length - kept.length
  const counts = new Map<string, number>()
  for (const g of kept) counts.set(g.tool, (counts.get(g.tool) ?? 0) + 1)
  const parts = [...counts.entries()].map(([t, n]) => `${GESTO[t] ?? t}${n > 1 ? ` (${n} volte)` : ''}`)
  return parts.length ? `Ho ${parts.join(', ')}. ${thrown ? `Ho annullato ${thrown} gesti dopo averli guardati.` : ''}`.trim() : 'Non ho tenuto nessun gesto.'
}

/** il testo dell'opera: intenzione, lettura, gesti, frase del registro, esito del dibattito */
export function workText(c: VoiceCtx, why: string, gs: Gesture[], held: string[], fell: string[]): string {
  const src = c.readings[0]
  const lines = [
    `Oggi: ${c.word}. ${cap(why)}.`,
    src ? `Da ${src.source}: «${cutup({ ...c, readings: [src] }, 1)}».` : '',
    gestureAccount(gs),
    c.register === 'silenzio' ? '' : conceptsReady() ? semanticLines(sem(c), 2).map(cap).join('. ') + '.' : markov(c, 16) + '.',
    held[0] ? `Ha retto: ${held[0]}` : '',
    fell[0] ? `È caduto: ${fell[0]}` : '',
  ]
  return lines.filter(Boolean).map(concorda).join('\n')
}

/** la riflessione che accompagna il post: cosa voleva, cosa ha tenuto, cosa non sa */
export function reflection(c: VoiceCtx, why: string, held: string[], fell: string[], flaws: string[], question?: string): string {
  const open = c.r() < 0.5 ? `Volevo ${c.word}.` : `Ho lavorato intorno a ${c.word}.`
  const keep = held[0] ? ` ${held[0].replace(/\.$/, '')}.` : ''
  const doubt = flaws[0] ? ` Forse è ${flaws[0]}, lo so.` : fell[0] ? ` Ho ignorato una voce che diceva: ${fell[0].toLowerCase()}` : ''
  const lines = conceptsReady() ? semanticLines(sem(c), 2).map(cap) : []
  const thought = lines.length ? ` ${lines.join('. ')}.` : ''
  const q = question && c.r() < 0.6 ? ` ${question}` : c.register === 'silenzio' ? '' : ` ${cutup(c, 1)}.`
  return concorda((open + thought + keep + doubt + q).replace(/\s+/g, ' ').trim())
}
