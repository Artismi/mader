/**
 * Il curatore: rilegge le tavole degli ultimi giorni (quelle nel cassetto) e sente se si allineano in un discorso.
 * Un discorso c'è quando un concetto torna in giornate diverse, o quando le idee si concatenano
 * (la conclusione di un giorno è la premessa di un altro); e quando le tavole si somigliano abbastanza
 * da stare in uno stesso immaginario. Se l'allineamento è più forte del solito, monta un reel;
 * se no aspetta. Ogni discorso si racconta una volta sola.
 */
import type { AgentState, Work } from '../core/types'
import { getEpisodi } from './episodio'
import { gusto } from '../eyes/gusto'
import { posDi, verbi } from '../reader/concepts'

export interface Discorso { tema: string; ids: string[]; giorni: number[]; voto: number; perche: string; domanda?: string; conclusione?: string }
interface MemoriaCuratore { voti: number[]; raccontati: { tema: string; ids: string[]; day: number }[]; ultimoReel?: number }
type ConC = AgentState & { curatore?: MemoriaCuratore }
export const memoriaCuratore = (st: AgentState): MemoriaCuratore => ((st as ConC).curatore ??= { voti: [], raccontati: [] })

const norm = (s?: string) => (s ?? '').toLowerCase().trim()
const VUOTE = new Set('il lo la i gli le un uno una di a da in con su per tra fra e o ma se che chi non come più è sono era fosse essere avere ha hanno del della dei delle dello degli al alla ai alle allo agli nel nella nei nelle sul sulla questo questa quello quella anche cosa quando dove perché tutto tutti ogni sua suo suoi sue loro mio tuo tavola'.split(' '))
/** la radice di una parola: senza la vocale finale (città/citta, tempi/tempo), almeno quattro lettere */
const radice = (w: string) => { const x = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, ''); return x.length >= 5 ? x.replace(/[aeiou]$/, '') : x }
const parole = (t: string) => t.toLowerCase().replace(/^\s*\d+\/\d+\s*·\s*/, '').split(/[^a-zàèéìòù']+/).map(w => w.replace(/^.*'/, '')).filter(w => w.length >= 4 && !VUOTE.has(w) && posDi(w).has('n') && !verbi().has(w) && !/^(materiale|gesto|rima|prova|stesso|stessa|cosa|parte)$/.test(w)) // solo nomi veri (non i verbi delle sue formule)
const coseno = (a: number[], b: number[]) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] } return na && nb ? d / Math.sqrt(na * nb) : 0 }

/** cerca il discorso più forte che passa per le tavole di oggi */
/** quanto vale una tavola per il racconto: l'interesse (novità, progresso) e il gusto (la materia che ha) */
let ST_C: AgentState | null = null
const valore = (w: Work) => w.interest + 0 * (ST_C && w.visual?.features ? gusto(ST_C, w.visual.features) : 0.5)
export function cerca(st: AgentState, tutte: Work[], nelCassetto: Set<string>, oggi: string[]): Discorso | null {
  ST_C = st
  const C = memoriaCuratore(st)
  const eps = getEpisodi(st)
  const epDi = new Map<string, (typeof eps)[number]>(); for (const e of eps) for (const id of e.schede) epDi.set(id, e)
  const cand = tutte.filter(w => nelCassetto.has(w.id) && w.day >= st.day - 21)
  // i concetti di ogni tavola: la sua parola, e la coppia dell'episodio di cui fa parte
  // (le radici: così «città» e «citta», «tempi» e «tempo» sono lo stesso concetto); la parola com'è scritta più spesso fa da nome
  const concetti = new Map<string, Set<string>>(), forma = new Map<string, Map<string, number>>()
  for (const w of cand) {
    const e = epDi.get(w.id); const [a, b] = (e?.coppia ?? '').split('|')
    const ws = [norm(w.intention?.word), norm(a), norm(b), ...(w.episodio?.ruolo === 'silenzio' ? [] : parole(w.title ?? '')), ...parole(e?.titolo ?? '')] // le tavole di silenzio hanno un titolo di servizio.filter(x => x && x.length >= 3 && !VUOTE.has(x))
    concetti.set(w.id, new Set(ws.map(radice).filter(k => k.length >= 3)))
    for (const x of ws) { const m = forma.get(radice(x)) ?? new Map(); m.set(x, (m.get(x) ?? 0) + 1); forma.set(radice(x), m) }
  }
  const nome = (k: string) => [...(forma.get(k) ?? new Map([[k, 1]])).entries()].sort((a, b) => b[1] - a[1])[0][0]
  const temi = new Set<string>(); for (const id of oggi) for (const k of concetti.get(id) ?? []) temi.add(k)
  let meglio: Discorso | null = null
  for (const tema0 of temi) {
    const tema = tema0
    // il concetto è il ponte; il discorso è fatto degli episodi interi che il ponte collega
    const conTema = cand.filter(w => concetti.get(w.id)?.has(tema0))
    if (new Set(conTema.map(w => w.day)).size < 2) continue
    const epT = new Set(conTema.map(w => w.episodio?.id).filter(Boolean))
    const G = cand.filter(w => conTema.includes(w) || (w.episodio?.id && epT.has(w.episodio.id) && w.episodio.ruolo !== 'silenzio'))
    const giorni = [...new Set(G.map(w => w.day))].sort((a, b) => a - b)
    if (G.length < 4 || giorni.length < 2) continue
    const ponti = conTema.length
    // concatenazione: episodi diversi in cui la seconda parola di uno è la prima di un altro (il pensiero si sposta)
    const coppie = [...new Set(G.map(w => epDi.get(w.id)?.coppia).filter(Boolean) as string[])].map(c => c.split('|'))
    const catena = coppie.filter(([, b]) => coppie.some(([a2]) => a2 === b)).length
    // un solo immaginario: quanto si somigliano le tavole (parole visive)
    let sim = 0, n = 0; for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) { sim += coseno(G[i].visual.words, G[j].visual.words); n++ }
    const coerenza = n ? sim / n : 0
    const interesse = G.reduce((a, w) => a + valore(w), 0) / G.length
    const giaDetto = C.raccontati.some(x => radice(x.tema) === tema0 && x.day > st.day - 10) ? 1.2 : 0
    // e già raccontato anche se cambia la parola: quanta parte di queste tavole era già in un reel recente
    const giaVisti = new Set(C.raccontati.filter(x => x.day > st.day - 14).flatMap(x => x.ids))
    const ripete = G.filter(w => giaVisti.has(w.id)).length / G.length
    // e una giornata che rifà le stesse parole di un'altra non è un discorso che matura: è un ritornello
    const perGiorno = new Map<number, Set<string>>(); for (const w of G) { const m = perGiorno.get(w.day) ?? new Set(); for (const k of concetti.get(w.id) ?? []) m.add(k); perGiorno.set(w.day, m) }
    const gs = [...perGiorno.values()]; let uguali = 0, cp = 0
    for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) { const inter = [...gs[i]].filter(k => gs[j].has(k)).length; uguali += inter / Math.max(1, Math.min(gs[i].size, gs[j].size)); cp++ }
    const ritornello = cp ? uguali / cp : 0
    const voto = Math.min(G.length, 7) / 7 + 0.25 * Math.min(ponti, 4) + 0.35 * Math.min(giorni.length, 4) + 0.3 * catena + 0.9 * coerenza + interesse - giaDetto - ripete * 1.5 - Math.max(0, ritornello - 0.5) * 3
    if (meglio && voto <= meglio.voto) continue
    // la scelta delle tavole: almeno una per giornata, poi le più interessanti; quelle di oggi ci sono; massimo sei
    const scelte: Work[] = []
    for (const d of giorni) { const w = G.filter(x => x.day === d).sort((a, b) => (conTema.includes(b) ? 1 : 0) - (conTema.includes(a) ? 1 : 0) || valore(b) - valore(a))[0]; if (w) scelte.push(w) }
    for (const w of G.filter(x => oggi.includes(x.id)).sort((a, b) => valore(b) - valore(a)).slice(0, 1)) if (!scelte.includes(w)) scelte.push(w)
    for (const w of G.slice().sort((a, b) => valore(b) - valore(a))) if (scelte.length < 6 && !scelte.includes(w)) scelte.push(w)
    // l'ordine del racconto: il tempo del pensiero (giorno, poi posizione nell'episodio)
    scelte.splice(6); scelte.sort((a, b) => a.day - b.day || (a.episodio?.i ?? 0) - (b.episodio?.i ?? 0))
    const ultimo = epDi.get(scelte[scelte.length - 1].id), primo = epDi.get(scelte[0].id)
    meglio = {
      tema: nome(tema0), ids: scelte.map(w => w.id), giorni, voto,
      perche: `«${nome(tema0)}» torna in ${giorni.length} giornate (${G.length} tavole)${catena ? `, e il pensiero si sposta ${catena} volt${catena === 1 ? 'a' : 'e'} da un'idea alla successiva` : ''}; le tavole si somigliano al ${Math.round(coerenza * 100)}%`,
      domanda: primo?.domanda, conclusione: ultimo?.conclusione,
    }
  }
  return meglio
}

/** decide se il discorso merita di essere raccontato adesso: più forte del solito, e non due reel nella stessa giornata */
export function merita(st: AgentState, d: Discorso | null): { si: boolean; perche: string } {
  const C = memoriaCuratore(st)
  if (!d) return { si: false, perche: 'niente si allinea ancora tra le giornate' }
  const storia = C.voti.slice(-20)
  C.voti = [...C.voti, d.voto].slice(-40)
  const soglia = Math.max(1.6, storia.length >= 5 ? storia.slice().sort((a, b) => a - b)[Math.floor(storia.length * 0.7)] : 1.6)
  if (C.ultimoReel === st.day) return { si: false, perche: `${d.perche}; ma oggi ha già raccontato un discorso` }
  if (d.voto < soglia) return { si: false, perche: `${d.perche}; non ancora abbastanza (${d.voto.toFixed(2)} contro ${soglia.toFixed(2)})` }
  return { si: true, perche: d.perche }
}

export function raccontato(st: AgentState, d: Discorso) {
  const C = memoriaCuratore(st)
  C.raccontati = [...C.raccontati, { tema: d.tema, ids: d.ids, day: st.day }].slice(-60)
  C.ultimoReel = st.day
}

// ── la forma: reel, carosello, storia o niente ──
export type Forma = 'reel' | 'carosello' | 'storia' | 'niente'
export interface Proposta { forma: Forma; epId: string; ids: string[]; perche: string; day: number }
type ConP = AgentState & { curatore?: MemoriaCuratore & { proposta?: Proposta; medieEp?: number[]; interessi?: number[] } }
const quantile = (xs: number[], q: number, d: number) => (xs.length >= 5 ? xs.slice().sort((a, b) => a - b)[Math.floor(xs.length * q)] : d)

/** decide che forma dare a quello che è nato oggi: il reel se ha raccontato un discorso tra più giornate;
 *  il carosello se la sequenza è un ragionamento che regge (più interessante del suo solito, con una conclusione);
 *  la storia se della sequenza resta solo un frammento forte; niente se non c'è niente da dire */
export function decidiForma(st: AgentState, ep: { id: string; schede: string[]; conclusione?: string; coppia?: string }, opere: Work[], reel: boolean): Proposta {
  const C = memoriaCuratore(st) as NonNullable<ConP['curatore']>
  const ws = opere.filter(w => ep.schede.includes(w.id))
  const media = ws.length ? ws.reduce((a, w) => a + w.interest, 0) / ws.length : 0
  const soglia = quantile(C.medieEp ?? [], 0.4, 0)
  const forte = quantile(C.interessi ?? [], 0.7, 0)
  C.medieEp = [...(C.medieEp ?? []), media].slice(-30)
  C.interessi = [...(C.interessi ?? []), ...ws.map(w => w.interest)].slice(-200)
  const migliore = ws.slice().sort((a, b) => b.interest - a.interest)[0]
  let p: Proposta
  if (reel) p = { forma: 'reel', epId: ep.id, ids: [], perche: 'oggi un discorso attraversa più giornate: lo racconto in movimento', day: st.day }
  else if (ws.length >= 3 && (media >= soglia || (!!ep.coppia && media >= soglia * 0.85))) p = { forma: 'carosello', epId: ep.id, ids: ep.schede, perche: `la sequenza regge da sola${ep.coppia ? ' e arriva a una conclusione' : ''} (interesse ${media.toFixed(2)}, il mio solito ${soglia.toFixed(2)})`, day: st.day }
  else if (migliore && migliore.interest >= forte) p = { forma: 'storia', epId: ep.id, ids: [migliore.id], perche: `della sequenza resta un frammento: «${(migliore.title ?? '').replace(/^\d+\/\d+\s*·\s*/, '')}»`, day: st.day }
  else p = { forma: 'niente', epId: ep.id, ids: [], perche: `la sequenza è più debole del mio solito (${media.toFixed(2)} contro ${soglia.toFixed(2)}): resta nel sito`, day: st.day }
  C.proposta = p
  return p
}
export const propostaDi = (st: AgentState): Proposta | undefined => (st as ConP).curatore?.proposta
