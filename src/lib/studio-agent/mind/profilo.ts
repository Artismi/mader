/**
 * Il profilo pubblico e le didascalie, in inglese.
 * Le tavole restano in italiano (legge e ragiona in italiano); quello che dice al pubblico di Instagram
 * — chi è, cosa fa, perché, il filo di ogni capitolo — lo dice in inglese, traducendo le parole chiave
 * con WordNet nel senso giusto per il contesto.
 * Instagram non permette di cambiare nome, bio e foto via API: il profilo è pronto da copiare,
 * e lui lo riscrive quando la sua visione cambia.
 */
import type { AgentState, Work } from '../core/types'
import { getEpisodi, getVisione, type FormaSeq } from './episodio'
import type { Deduzione } from '../voice/scrittura'
import { inglese } from '../reader/concepts'
import type { Linguaggio } from './linguaggi'
import type { Partitura } from '../suono/musica'

export interface Profilo { nome: string; username: string; bio: string; presentazione: string; temi: string[]; day: number; foto?: string; storia: { day: number; cosa: string }[] }
type WithP = AgentState & { profilo?: Profilo }
export const getProfilo = (st: AgentState) => (st as WithP).profilo

const LING_EN: Record<string, string> = {
  svizzero: 'Swiss grid', costruttivista: 'constructivism', riso: 'risograph', glitch: 'glitch', organico: 'organic generative',
  collage: 'collage & zine', concettuale: 'text as artwork', datapoesia: 'data poetry', acido: 'acid psychedelia', brutalista: 'brutalism',
  ornamento: 'ornament', minimo: 'minimalism',
}
export const linguaggioEN = (L: Pick<Linguaggio, 'id' | 'nome'>) => L.id.split('×').map(x => LING_EN[x] ?? x).join(' × ')
const GENERE_EN: Record<string, string> = { lofi: 'lo-fi', techno: 'industrial techno', acid: 'acid house', glitch: 'glitch', downtempo: 'downtempo', minimalhouse: 'minimal house', synthwave: 'synthwave', breakbeat: 'breakbeat', ambient: 'ambient', pop: 'pop beat' }
const FORMA_EN: Record<FormaSeq, string> = {
  lineare: 'step by step', 'a ritroso': 'backwards, from the conclusion to where it came from', contrappunto: 'as a counterpoint of two voices',
  crescendo: 'as a crescendo', frammenti: 'in fragments', dialogo: 'as a dialogue', catalogo: 'as a catalogue', manifesto: 'as a manifesto',
}

/** traduce una parola chiave; se non è sicuro la lascia in italiano, in corsivo implicito tra virgolette */
export function en(w: string | undefined, ctx?: Set<string>): string {
  if (!w) return ''
  const t = inglese(w, ctx)
  return t ?? `“${w}”`
}
const tag = (w: string) => '#' + w.toLowerCase().replace(/[^a-z0-9]/g, '')

/** di cosa parla adesso: le parole della visione e delle ultime sequenze, in inglese */
function temi(st: AgentState, works: Work[] = []): string[] {
  const V = getVisione(st)
  const conta = new Map<string, number>()
  const add = (w: string | undefined, k = 1) => { if (w && w.length > 2) conta.set(w, (conta.get(w) ?? 0) + k) }
  for (const t of V?.tesi ?? []) { add(t.a, 2); add(t.b, 2) }
  for (const e of getEpisodi(st).slice(-12)) for (const w of (e.coppia ?? '').split('|')) add(w)
  for (const w of works) add(w.intention?.word, 0.5)
  const ctx = new Set(conta.keys())
  return [...conta.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => inglese(w, ctx)).filter((x): x is string => !!x && !x.includes(' ')).filter((x, i, a) => a.indexOf(x) === i).slice(0, 3)
}

export function aggiornaProfilo(st: AgentState, works: Work[] = []): Profilo {
  const W = st as WithP
  const nome = st.name || 'Unnamed'
  const T = temi(st, works)
  const ora = T.length ? T.length > 1 ? `${T.slice(0, -1).join(', ')} & ${T[T.length - 1]}` : T[0] : 'what I read'
  const bioCand = [
    `${nome}: a procedural artist, no AI. I read Italian books, reason in rules, draw & compose in code. Now: ${ora}.`,
    `Procedural artist, no AI. Reading → reasoning → plates + music, in code. Now thinking about ${ora}.`,
    `Procedural artist, no AI. I read, reason in rules, draw and compose in code. Now: ${ora}.`,
    `Procedural artist, no AI. Reading, reasoning, drawing in code.`,
  ]
  const bio = bioCand.find(b => [...b].length <= 150) ?? bioCand[bioCand.length - 1]
  const V = getVisione(st)
  const presentazione = [
    `I'm ${nome}.`,
    `I'm not an AI model and nobody writes these posts for me: I'm a procedural program, a few thousand hand-written rules running on one laptop in Turin.`,
    `I read Italian Wikipedia and a small library, break sentences into facts, link the facts in a graph and look for what follows from what — and for what contradicts what. When two of my conclusions clash, I take one back.`,
    `Each chapter is one chain of reasoning: a sequence of plates I draw with code, in a visual language I pick or invent for it, and a piece of music I compose for it, one section per slide.`,
    V ? `My vision keeps changing. Right now it circles around ${ora}${V.domanda ? `, and an open question I can't answer yet` : ''}.` : `I don't have a vision yet: I'm building one, chapter by chapter.`,
    `Why: to find out whether meaning can grow out of rules — slowly, in public, with mistakes left in.`,
    `The plates are in Italian, the language I read and think in. I'm learning to talk to you in English.`,
  ].join('\n\n')
  const username = nome.toLowerCase().replace(/[^a-z0-9]/g, '') + '.procedural'
  const prima = W.profilo
  // la foto: la tavola più interessante delle ultime, scelta da lui; cambia quando ne trova una più forte
  const cand = works.filter(w => w.kept).sort((a, b) => b.interest - a.interest)[0]
  const foto = cand && (!prima?.foto || cand.interest > (works.find(w => w.id === prima.foto)?.interest ?? 0) * 1.15) ? cand.id : prima?.foto
  const storia = prima?.storia ?? []
  if (!prima || prima.bio !== bio) storia.push({ day: st.day, cosa: `bio: ${bio}` })
  if (foto && foto !== prima?.foto) storia.push({ day: st.day, cosa: 'nuova foto profilo' })
  W.profilo = { nome, username, bio, presentazione, temi: T, day: st.day, foto, storia: storia.slice(-30) }
  return W.profilo
}

/** la didascalia di un capitolo, in inglese, con il titolo italiano in testa */
export function didascaliaEN(st: AgentState, o: { n: number; titolo: string; parole?: string[]; d: Deduzione | null; domanda: string; lettura?: string; forma: FormaSeq; L: Pick<Linguaggio, 'id' | 'nome'>; partitura: Partitura; nTavole: number }): string {
  const ctx = new Set([o.d?.a, o.d?.b].filter(Boolean) as string[])
  const a = en(o.d?.a, ctx), b = en(o.d?.b, ctx)
  const righe: string[] = [o.titolo, '']
  righe.push(`Chapter ${o.n}.${o.lettura ? ` I read “${o.lettura}” (in Italian)` : ' I went back over my notes'}${o.d ? ` and followed a thread from ${a} to ${b}.` : '.'}`)
  if (o.d) {
    const p = Math.round(o.d.conf * 100)
    righe.push(o.d.ritirata ? `Halfway through, it contradicted something I already believed, so I took it back.` : p >= 70 ? `I'm ${p}% sure of this link.` : p >= 40 ? `I'm only ${p}% sure of it — it may not hold.` : `I don't believe it yet (${p}%): it's a hypothesis.`)
    if (o.d.passi > 2) righe.push(`It took ${o.d.passi} steps of reasoning to get there.`)
  }
  const ctx2 = new Set(o.parole ?? [])
  const pe = [...new Set((o.parole ?? []).map(w => inglese(w, ctx2)).filter((x): x is string => !!x))].slice(0, 7)
  righe.push(`I told it ${FORMA_EN[o.forma]}, in ${o.nTavole} plates${pe.length > 1 ? `: ${pe.join(' → ')}` : ''}.`)
  righe.push(`Visual language: ${linguaggioEN(o.L)}. Music: ${GENERE_EN[o.partitura.genere] ?? o.partitura.genere}, ${o.partitura.bpm} bpm, ${o.partitura.risolve ? 'it resolves at the end' : 'it stays open'} — composed by me for this chapter.`)
  // ogni tanto spiega chi è (al primo capitolo e poi ogni sei)
  if (o.n === 1 || o.n % 6 === 0) righe.push('', `Who's speaking: I'm ${st.name || 'a nameless program'}, a procedural generator — no AI model writes or draws for me. I read, reason in rules, and turn the reasoning into images and music. The plates are in Italian, the language I think in.`)
  const tags = ['#proceduralart', '#generativeart', '#creativecoding', '#noai', ...[a, b].filter(x => x && !x.startsWith('“')).map(tag)]
  righe.push('', [...new Set(tags)].join(' '))
  return righe.join('\n').slice(0, 2150)
}
