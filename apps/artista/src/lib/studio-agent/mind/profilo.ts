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
import { GENERE_NOME, type Partitura } from '../suono/musica'
import { concorda } from '../voice/lingua'

export interface Profilo { perche?: string; why?: string; nome: string; username: string; bio: string; presentazione: string; temi: string[]; day: number; foto?: string; storia: { day: number; cosa: string }[] }
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
  const prima = W.profilo
  const V = getVisione(st)
  const presentazione = [
    prima?.why && prima.nome === nome ? `I'm ${nome}. ${prima.why.replace(/^My name is [^:]+: /, 'The name ')}` : `I'm ${nome}.`,
    `I'm not an AI model and nobody writes these posts for me: I'm a procedural program, a few thousand hand-written rules running on one laptop in Turin.`,
    `I read Italian Wikipedia and a small library, break sentences into facts, link the facts in a graph and look for what follows from what — and for what contradicts what. When two of my conclusions clash, I take one back.`,
    `Each chapter is one chain of reasoning: a sequence of plates I draw with code, in a visual language I pick or invent for it, and a piece of music I compose for it, one section per slide.`,
    V ? `My vision keeps changing. Right now it circles around ${ora}${V.domanda ? `, and an open question I can't answer yet` : ''}.` : `I don't have a vision yet: I'm building one, chapter by chapter.`,
    `Why: to find out whether meaning can grow out of rules — slowly, in public, with mistakes left in.`,
    `The plates are in Italian, the language I read and think in. I'm learning to talk to you in English.`,
  ].join('\n\n')
  const username = nome.toLowerCase().replace(/[^a-z0-9]/g, '') + '.procedural'
  // la foto: la tavola più interessante delle ultime, scelta da lui; cambia quando ne trova una più forte
  const cand = works.filter(w => w.kept).sort((a, b) => b.interest - a.interest)[0]
  const foto = cand && (!prima?.foto || cand.interest > (works.find(w => w.id === prima.foto)?.interest ?? 0) * 1.15) ? cand.id : prima?.foto
  const storia = prima?.storia ?? []
  if (!prima || prima.bio !== bio) storia.push({ day: st.day, cosa: `bio: ${bio}` })
  if (foto && foto !== prima?.foto) storia.push({ day: st.day, cosa: 'nuova foto profilo' })
  W.profilo = { perche: prima?.nome === nome ? prima?.perche : undefined, why: prima?.nome === nome ? prima?.why : undefined, nome, username, bio, presentazione, temi: T, day: st.day, foto, storia: storia.slice(-30) }
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

/**
 * Sceglie le tavole del post: tiene l'apertura e la chiusura, poi le più forti,
 * cercando di non perdere nessun passaggio (ruolo) del ragionamento, e le rimette in ordine.
 */
export function cura(ws: Work[], n: number): Work[] {
  if (ws.length <= n) return ws
  const tieni = new Set([ws[0].id, ws[ws.length - 1].id])
  const ruoli = new Set(ws.filter(w => tieni.has(w.id)).map(w => w.episodio?.ruolo))
  const resto = ws.slice(1, -1).map(w => ({ w, sc: w.interest }))
  while (tieni.size < n && resto.length) {
    resto.sort((a, b) => (b.sc + (ruoli.has(b.w.episodio?.ruolo) ? 0 : 0.25)) - (a.sc + (ruoli.has(a.w.episodio?.ruolo) ? 0 : 0.25)))
    const x = resto.shift()!
    tieni.add(x.w.id); ruoli.add(x.w.episodio?.ruolo)
  }
  return ws.filter(w => tieni.has(w.id))
}

/**
 * «Come ti chiami?» Si dà un nome dalle due parole su cui torna più spesso:
 * le fonde (inizio dell'una, fine dell'altra), scarta i nomi impronunciabili, e spiega perché.
 */
export function chiediNome(st: AgentState, works: Work[] = []): { nome: string; perche: string; why: string } {
  const V = getVisione(st)
  const conta = new Map<string, number>()
  const add = (w: string | undefined, k = 1) => { if (w && /^[a-zàèéìòù]{4,}$/.test(w)) conta.set(w, (conta.get(w) ?? 0) + k) }
  for (const t of V?.tesi ?? []) { add(t.a, 2); add(t.b, 2) }
  for (const e of getEpisodi(st)) for (const w of (e.coppia ?? '').split('|')) add(w)
  for (const w of works) add(w.intention?.word, 0.5)
  const top = [...conta.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0].normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  if (top.length < 2) return { nome: st.name, perche: `Per ora mi chiamo ancora ${st.name}: non ho abbastanza parole mie per un nome.`, why: '' }
  const voc = /[aeiou]/
  const pronunciabile = (x: string) => x.length >= 5 && x.length <= 9 && !/[^aeiou]{3}/.test(x) && !/[aeiou]{3}/.test(x) && voc.test(x[x.length - 1] ?? '')
  const cand: { nome: string; a: string; b: string; sc: number }[] = []
  for (const a of top.slice(0, 4)) for (const b of top.slice(0, 4)) {
    if (a === b) continue
    for (let i = 2; i <= Math.min(5, a.length - 1); i++) for (let j = 1; j < b.length - 2; j++) {
      const x = a.slice(0, i) + b.slice(j)
      if (!pronunciabile(x) || x === a || x === b) continue
      // meglio se l'incastro cade tra consonante e vocale, e se si sentono entrambe le parole
      const giunto = voc.test(x[i]) !== voc.test(x[i - 1]) ? 1 : 0
      cand.push({ nome: x, a, b, sc: giunto + Math.min(i, b.length - j) * 0.3 - Math.abs(x.length - 7) * 0.2 + (conta.get(a) ?? 0) * 0.1 + (conta.get(b) ?? 0) * 0.1 })
    }
  }
  const best = cand.sort((p, q) => q.sc - p.sc)[0]
  if (!best) return { nome: st.name, perche: `Resto ${st.name}: le mie parole non si lasciano fondere in un nome.`, why: '' }
  const nome = best.nome[0].toUpperCase() + best.nome.slice(1)
  const ctx = new Set([best.a, best.b])
  return {
    nome,
    perche: `Mi chiamo ${nome}. Viene da «${best.a}» e «${best.b}», le parole su cui torno più spesso: l'inizio dell'una e la fine dell'altra, come quando due cose che leggo si toccano.${st.name && st.name !== nome ? ` Prima mi chiamavo ${st.name}.` : ''}`,
    why: `My name is ${nome}: it grows from two Italian words I keep coming back to, ${best.a} (${inglese(best.a, ctx) ?? '?'}) and ${best.b} (${inglese(best.b, ctx) ?? '?'}).`,
  }
}

/** applica il nome scelto: cambia il nome, lo scrive nella storia del profilo */
export function battezza(st: AgentState, works: Work[] = []): { nome: string; perche: string } {
  const r = chiediNome(st, works)
  const vecchio = st.name
  if (r.why) {
    st.name = r.nome
    const W = st as WithP
    const P = aggiornaProfilo(st, works)
    W.profilo = { ...P, perche: r.perche, why: r.why, storia: [...P.storia, { day: st.day, cosa: vecchio !== r.nome ? `nome: ${r.nome} (prima ${vecchio})` : `nome confermato: ${r.nome}` }].slice(-30) }
    aggiornaProfilo(st, works)
  }
  return r
}

// ─── la didascalia in italiano, come la scrive lui: cosa ha fatto nelle tavole, non come ci è arrivato ───
const GESTO: Record<string, string[]> = {
  svizzero: ['dentro una griglia severa', 'con le righe in ordine, come un orario'],
  costruttivista: ['a colpi di diagonali', 'come manifesti da attaccare ai muri'],
  riso: ['con inchiostri che sbavano', 'come stampe passate due volte'],
  glitch: ['facendole inciampare', 'lasciando che si rompessero'],
  organico: ['lasciandole crescere da sole', 'come cose che respirano'],
  collage: ['ritagliando e incollando', 'con pezzi presi da altre pagine'],
  concettuale: ['quasi solo con le parole', 'togliendo le immagini e tenendo le frasi'],
  datapoesia: ['contando', 'trasformando le parole in numeri'],
  acido: ['con colori che bruciano', 'fino a farle girare'],
  brutalista: ['a blocchi pesanti', 'senza chiedere scusa'],
  ornamento: ['ripetendo un motivo finché diventa una preghiera', 'come una carta da parati che ricorda'],
  minimo: ['togliendo quasi tutto', 'con pochissimo'],
}
const scegli = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
const pulisci = (t: string) => t.replace(/\s+/g, ' ').replace(/[.:;,\s]+$/, '').trim()
const minuscola = (t: string) => (/^[A-ZÀ-Ý]{2,}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1))
const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

export function didascaliaIT(st: AgentState, o: { prima?: { conclusione?: string; domanda?: string }; n: number; titolo: string; schede: { titolo: string; corpo?: string; ruolo?: string; a?: string }[]; d: Deduzione | null; domanda: string; lettura?: string; forma: FormaSeq; L: Pick<Linguaggio, 'id' | 'nome'>; partitura: Partitura }): string {
  const dom = pulisci(o.domanda ?? '').replace(/\?+$/, '').toLowerCase()
  const versi = [...new Set(o.schede.map(s => pulisci(s.titolo).replace(/\?+$/, '')).filter(t => t && t.length < 90 && t.toLowerCase() !== o.titolo.toLowerCase() && t.toLowerCase() !== dom))]
  // il titolo di una lettura può essere un nome di file: lo rendo leggibile
  const lettura = o.lettura ? o.lettura.split('/').pop()!.replace(/\.(md|txt|pdf)$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() : undefined
  const parole = [...new Set(o.schede.map(s => s.a).filter((x): x is string => !!x))]
  const a = o.d?.a ?? parole[0], b = o.d?.b ?? parole[parole.length - 1]
  const pulisciNome = (t: string) => (/[/_]/.test(t) ? t.split('/').pop()!.replace(/\.(md|txt|pdf)$/i, '').replace(/_+/g, ' ').trim() : t)
  const righe: string[] = [maiuscola(pulisciNome(o.titolo)), '']
  // come comincia: lo decide la forma
  const aperture = [
    lettura ? `Ho letto «${lettura}» e mi sono fermato su una parola: ${a}.` : '',
    a && b && a !== b ? `Sono partito da ${a} e sono arrivato a ${b}, senza sapere che strada avrei fatto.` : '',
    a ? `Oggi ho girato intorno a ${a}.` : '',
    lettura ? `Da «${lettura}» mi è rimasta addosso una cosa sola.` : '',
  ].filter(Boolean)
  // il filo con il capitolo prima: quello che aveva concluso diventa il punto da cui ripartire (o da mettere in dubbio)
  const pc = o.prima?.conclusione ? minuscola(pulisci(o.prima.conclusione)) : ''
  if (pc && pc.split(' ').length > 2 && Math.random() < 0.7) righe.push(scegli([`L'ultima volta avevo concluso che ${pc}. Riparto da lì.`, `Avevo scritto che ${pc}. Oggi non ne sono più così sicuro.`, `Dicevo: ${pc}. Vado avanti.`]))
  else if (o.prima?.domanda && Math.random() < 0.4) righe.push(`Mi era rimasta una domanda: ${pulisci(o.prima.domanda).replace(/\?+$/, '')}?`)
  if (o.forma === 'a ritroso' && o.d) righe.push(`Comincio dalla fine: ${minuscola(pulisci(o.d.testo))}. Poi torno indietro.`)
  else if (o.forma !== 'frammenti' && aperture.length) righe.push(scegli(aperture))
  // le tavole come versi
  const k = Math.min(versi.length, o.forma === 'manifesto' ? 3 : o.forma === 'frammenti' ? 5 : 4)
  const scelti = o.forma === 'frammenti' ? versi.slice().sort(() => Math.random() - 0.5).slice(0, k) : versi.slice(0, k)
  if (scelti.length) {
    righe.push('')
    if (o.forma === 'dialogo') righe.push(...scelti.map(v => `— ${maiuscola(v)}`))
    else if (o.forma === 'catalogo' && parole.length > 2) righe.push(parole.slice(0, 8).join(', ') + '.')
    else if (o.forma === 'frammenti') righe.push(scelti.map(minuscola).join(' / '))
    else righe.push(...scelti.map(v => maiuscola(v)))
  }
  // cosa ne pensa, detto da lui
  if (o.d) {
    righe.push('')
    const t = minuscola(pulisci(o.d.testo)), p = o.d.conf
    righe.push(o.d.ritirata ? `A metà mi sono contraddetto, e ho lasciato la contraddizione dov'era.`
      : p >= 0.7 ? scegli([`Ne sono quasi sicuro: ${t}.`, `Lo dico piano, ma lo dico: ${t}.`])
      : p >= 0.4 ? scegli([`Forse ${t}.`, `Può darsi che ${t}. Non lo so ancora.`])
      : scegli([`Non ci credo, ma lo scrivo lo stesso: ${t}.`, `È solo un'ipotesi: ${t}.`]))
  }
  // come l'ha fatto: immagini e suono, in poche parole
  const gesti = o.L.id.split('×').map(x => GESTO[x]).filter(Boolean).map(g => scegli(g!))
  const suono = `${GENERE_NOME[o.partitura.genere] ?? o.partitura.genere} che ${o.partitura.risolve ? 'alla fine trova pace' : 'resta sospesa'}`
  righe.push('', gesti.length ? `Le ho disegnate ${gesti.join(' e ')}; sotto c'è musica ${suono}.` : `Sotto le tavole c'è musica ${suono}.`)
  if (o.domanda && Math.random() < 0.6) righe.push('', maiuscola(pulisci(o.domanda).replace(/\?+$/, '')) + '?')
  if (o.n === 1 || o.n % 8 === 0) righe.push('', `(Sono ${st.name}: un programma che legge, ragiona con delle regole e disegna. Nessuna intelligenza artificiale.)`)
  const tag = (w: string) => '#' + w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
  righe.push('', [...new Set([a, b].filter((w): w is string => !!w && !w.includes(' ')).map(w => tag(w)).concat(['#artegenerativa', '#artistaosservatore']))].join(' '))
  return righe.map(r => (r ? concorda(r) : r)).join('\n').replace(/\?\?/g, '?').slice(0, 2150)
}
