/**
 * Le voci del dibattito interno. Ognuna guarda l'opera con un criterio suo e
 * produce argomenti pro o contro. I pesi delle voci cambiano con la storia:
 * una voce che ha avuto ragione (le sue opere hanno interessato) conta di più.
 */
import type { AgentState, Argument, Features, Intention, Polarity, Visit, Belief } from '../core/types'
import { judge } from './criteria'
import { uid } from '../core/rng'

export const VOICES = ['formale', 'occhio', 'distruttore', 'memoria', 'conservatore', 'intenzione', 'materia', 'ironia', 'logica', 'visitatore'] as const
export type VoiceId = typeof VOICES[number]

export interface DebateInput {
  st: AgentState
  f: Features
  novelty: number
  intention: Intention
  title: string
  toolsUsed: string[]
  readingsTitles: string[]
  contradictions: { a: Belief; b: Belief }[]
  visits: Visit[]
}

const pct = (v: number) => `${Math.round(v * 100)}%`

export function speak(inp: DebateInput): Argument[] {
  const { st, f, novelty, intention } = inp
  const out: Argument[] = []
  const say = (voice: VoiceId, aspect: string, polarity: Polarity, strength: number, claim: string) =>
    out.push({ id: uid(), voice, aspect, polarity, claim, weight: (st.voices[voice] ?? 1) * strength, attacks: [] })

  // formale: equilibrio, peso, terzi (Arnheim)
  if (f.peso_quadrante > 0.55 && f.squilibrio > 0.35) say('formale', 'equilibrio', 'contro', 0.7, `Il peso cade tutto in un angolo (${pct(f.peso_quadrante)}): l'occhio scivola fuori.`)
  else if (f.terzi > 0.7) say('formale', 'equilibrio', 'pro', 0.6, `Il baricentro sta su un terzo: la composizione respira.`)
  if (f.squilibrio < 0.08 && f.simmetria > 0.7) say('formale', 'tensione', 'contro', 0.5, `Centrato e simmetrico: è fermo, non c'è tensione.`)
  else if (f.squilibrio > 0.2 && f.squilibrio < 0.6) say('formale', 'tensione', 'pro', 0.5, `Fuori centro quanto basta: c'è una forza che tira.`)

  // occhio: punto, linea, superficie (Kandinsky)
  const dom = (['punti', 'linee', 'superfici'] as const).map(k => [k, f[k]] as const).sort((a, b) => b[1] - a[1])[0]
  if (dom[1] > 0.6) say('occhio', 'elementi', 'pro', 0.6, `Parla soprattutto per ${dom[0]}: una lingua sola, chiara.`)
  if (f.elementi > 0.8 && dom[1] < 0.45) say('occhio', 'elementi', 'contro', 0.6, `Troppi elementi di tipo diverso, nessuno comanda.`)
  if (f.diagonali > 0.45) say('occhio', 'direzione', 'pro', 0.4, `Le diagonali (${pct(f.diagonali)}) mettono tutto in caduta.`)
  if (f.vuoto > 0.25 && f.vuoto < 0.65) say('occhio', 'vuoto', 'pro', 0.5, `Il vuoto (${pct(f.vuoto)}) lavora quanto il pieno.`)
  if (f.vuoto < 0.03 && f.densita > 0.7) say('occhio', 'vuoto', 'contro', 0.5, `Non c'è un punto dove l'occhio possa riposare.`)

  // distruttore e memoria: novità
  if (novelty > 0.45) say('distruttore', 'novita', 'pro', 0.5 + novelty * 0.5, `Non somiglia a niente di quello che ho fatto (novità ${pct(novelty)}).`)
  if (novelty < 0.18) say('memoria', 'novita', 'contro', 0.9 - novelty, `L'ho già fatta, quasi uguale (novità ${pct(novelty)}).`)
  const recentTools = st.notebook.slice(-5).flatMap(e => e.done)
  const repeated = inp.toolsUsed.filter(t => recentTools.filter(x => x.startsWith(t)).length >= 4)
  if (repeated.length) say('memoria', 'mano', 'contro', 0.5, `La mano si ripete: ${[...new Set(repeated)].join(', ')} ancora una volta.`)
  if (novelty > 0.85) say('memoria', 'novita', 'contro', 0.4, `È così lontana da tutto che non so leggerla: rumore?`)

  // conservatore: i criteri della poetica
  const j = st.criteria.length ? judge(st.criteria, f) : 0.5
  if (j > 0.55) say('conservatore', 'poetica', 'pro', 0.4 + j * 0.5, `Tiene i miei criteri (${pct(j)}).`)
  else if (j < 0.35) say('conservatore', 'poetica', 'contro', 0.4 + (1 - j) * 0.4, `Tradisce quello che credevo di cercare (${pct(j)}).`)

  // intenzione: ha tenuto ciò che voleva dire?
  const keys = Object.keys(intention.targets)
  if (keys.length) {
    const miss = keys.reduce((a, k) => a + Math.abs((f[k] ?? 0) - intention.targets[k]), 0) / keys.length
    if (miss < 0.2) say('intenzione', 'intenzione', 'pro', 0.8, `Tiene l'intenzione: "${intention.word}" si vede (${keys.join(', ')}).`)
    else if (miss > 0.4) say('intenzione', 'intenzione', 'contro', 0.7, `"${intention.word}" si è perso per strada.`)
  }
  if (inp.readingsTitles.length && intention.why) say('intenzione', 'mondo', 'pro', 0.3, `Viene da: ${inp.readingsTitles[0]}.`)

  // materia
  if (f.complessita < 0.15) say('materia', 'materia', 'contro', 0.5, `Troppo liscio, sa di schermo.`)
  else if (f.complessita > 0.35 && f.complessita < 0.85) say('materia', 'materia', 'pro', 0.4, `Ha una pelle: si sente la materia.`)

  // ironia: titolo e immagine si contraddicono?
  const tl = inp.title.toLowerCase()
  if ((/vuot|silenz|niente|assen/.test(tl) && f.densita > 0.6) || (/pien|folla|tutto/.test(tl) && f.vuoto > 0.5))
    say('ironia', 'ironia', 'pro', 0.6, `Il titolo dice il contrario dell'immagine: va bene così.`)
  if (intention.register === 'filosofico' && st.mood === 'giocoso') say('ironia', 'tono', 'contro', 0.4, `Troppo serio per l'umore di oggi.`)
  if (intention.register === 'scherzoso' && f.contrasto > 0.6) say('ironia', 'tono', 'pro', 0.4, `Ride forte, con tutto quel contrasto.`)

  // logica: contraddizioni nelle letture
  for (const c of inp.contradictions.slice(0, 2)) {
    const touches = [c.a.s, c.a.o, c.b.s, c.b.o].some(w => w.includes(intention.word) || intention.word.includes(w))
    say('logica', 'pensiero', touches ? 'pro' : 'contro', 0.4,
      `Ho letto che ${c.a.s} ${c.a.neg ? 'non ' : ''}${c.a.p} ${c.a.o} e che ${c.b.s} ${c.b.neg ? 'non ' : ''}${c.b.p} ${c.b.o}. ${touches ? "L'opera sta dentro la contraddizione." : "L'opera la ignora."}`)
  }

  // visitatore: le note lasciate in studio
  for (const v of inp.visits) {
    const t = v.text.toLowerCase()
    const neg = /\b(no|non|brutt|troppo|noios|banale|ripet|male)\w*/.test(t)
    const pos = /\b(bell|sì|si|funzion|forte|ottim|ancora|brav)\w*/.test(t)
    const pol: Polarity = neg && !pos ? 'contro' : 'pro'
    say('visitatore', 'visita', pol, 0.6, `Qualcuno è passato e ha scritto: "${v.text.slice(0, 140)}".`)
  }
  return out
}

/** dopo l'opera: le voci accettate guadagnano peso se l'opera ha interessato, lo perdono se no */
export function reweigh(st: AgentState, args: Argument[], accepted: Set<string>, kept: boolean, outcome: number) {
  for (const a of args) {
    if (!accepted.has(a.id)) continue
    const right = (a.polarity === 'pro') === (outcome > 0.45)
    const lr = 0.06
    st.voices[a.voice] = Math.max(0.2, Math.min(2.5, (st.voices[a.voice] ?? 1) + (right ? lr : -lr)))
  }
  void kept
}

export function verbale(args: Argument[], accepted: Set<string>): string[] {
  return args.map(a => `${a.voice} (${a.polarity}, ${a.weight.toFixed(2)}): ${a.claim} — ${accepted.has(a.id) ? 'regge' : 'cade'}`)
}
