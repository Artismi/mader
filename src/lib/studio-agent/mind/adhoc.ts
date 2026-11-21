/**
 * Le tavole fatte apposta per un post. Quando l'agenda vuole un reel o un carosello e le tavole buone sono poche,
 * non si gira a vuoto con quelle che ci sono: si ragiona sulle ultime giornate (le parole che tornano negli ultimi
 * episodi, quello che chiedono sotto i suoi lavori, il filo di oggi), si sceglie un tema, si costruisce un piccolo
 * discorso con il suo modo di pensare (sulle letture recenti, mai con frasi copiate) e se ne disegna più del necessario:
 * ogni scheda in più varianti, e restano quelle che il suo occhio giudica migliori (lo sguardo dello studio + il gusto
 * per la materia). Sono opere vere: si salvano, vanno nel cassetto, sanno di essere nate per il post.
 */
import type { AgentState, Intention, Reading, Work } from '../core/types'
import { rng, pick, weighted, uid } from '../core/rng'
import * as T from '../transport'
import { serializza } from '../hands/cassetto'
import { gusto } from '../eyes/gusto'
import { GENERICI } from './pensiero'
import { posDi } from '../reader/concepts'
import { memoriaCuratore } from './curatore'
import { TONES } from '@/components/studio/genera/recipes'
import { flatten, type Sheet } from '../hands/sheet'
import type { ToolCtx } from '../hands/tools'
import { measure, rasterize, palette } from '../eyes/measure'
import { histogram, learn, patches, seedCodebook } from '../eyes/visual-words'
import { learnTools, look, runStudio } from './studio'
import { interest as interestOf, novelty as noveltyOf } from './taste'
import { getScuola } from './scuola'
import { getEpisodi, pianifica, rendiScheda } from './episodio'
import { fraseDi } from '../voice/scrittura'
import { scegliLinguaggio } from './linguaggi'
import { tavolozza, ensureAtlante } from './atlante'

export interface AdHoc { works: Work[]; fogli: Sheet[]; info: { rel?: string; interesse: number }[]; tema: string; perche: string }

const ora = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

/** quanto vale una tavola per il suo occhio: lo sguardo dello studio e il gusto per la materia */
const TESTI = new Set(['testo', 'tipografia', 'etichette', 'firma', 'piastra'])
/** le figure e le materie della tavola che non sono solo parole su un fondo (un post ha bisogno di qualcosa da vedere) */
export const corpo = (s: Sheet) => s.layers.filter(l => !TESTI.has(l.kind) && l.scale < 0.99).length
export function valoreTavola(st: AgentState, s: Sheet, it: Intention) {
  const L = look(st, s, it), m = gusto(st, L.f), c = corpo(s)
  return { v: (0.5 * L.score + 0.5 * m) * (c >= 2 ? 1 : 0.6), look: L.score, materia: m, corpo: c }
}

/** quante tavole buone ci sono tra queste (per il gusto, o perché lo sguardo le promuove) */
export function buone(st: AgentState, fogli: Sheet[], it: Intention, soglia = 0.42) {
  return fogli.map((s, i) => ({ i, ...valoreTavola(st, s, it) })).filter(x => x.corpo >= 2 && (x.materia >= soglia || x.v >= 0.5))
}

/** il tema: le parole che tornano nelle ultime giornate (più vicine = più peso), quello che chiedono sotto i suoi lavori,
 *  il filo di oggi; non quello che ha appena raccontato */
export function scegliTema(st: AgentState, suggerito?: string): { tema: string; perche: string } {
  const eps = getEpisodi(st).slice(-10)
  const C = memoriaCuratore(st)
  const detto = new Set(C.raccontati.filter(x => x.day > st.day - 3).map(x => x.tema.toLowerCase()))
  const peso = new Map<string, { v: number; giorni: Set<number> }>()
  const conta = (w: string, v: number, giorno: number) => {
    w = w.toLowerCase()
    if (w.length < 4 || GENERICI.has(w) || detto.has(w) || !posDi(w).has('n') || posDi(w).has('v')) return
    const e = peso.get(w) ?? { v: 0, giorni: new Set<number>() }; e.v += v; e.giorni.add(giorno); peso.set(w, e)
  }
  for (const e of eps) {
    const rec = Math.exp(-(st.day - e.day) / 4)
    for (const w of (e.coppia ?? '').split('|')) if (w) conta(w, 2 * rec, e.day)
    for (const w of `${e.titolo} ${e.conclusione} ${e.domanda}`.split(/[^a-zàèéìòù]+/i)) conta(w, 0.4 * rec, e.day)
  }
  const altrui = ((st as AgentState & { curiositaAltrui?: { parola: string; day: number }[] }).curiositaAltrui ?? []).filter(x => x.day > st.day - 7)
  for (const x of altrui) conta(x.parola, 1.5, x.day)
  if (suggerito) conta(suggerito, 1, st.day)
  const A = ensureAtlante(st)
  // un tema vale se torna in più giornate e se ha di che pensare (frasi lette su quel concetto)
  const cand = [...peso].map(([w, e]) => ({ w, s: e.v * (1 + 0.5 * Math.min(4, e.giorni.size)) * (A.concetti[w] ? 1 + Math.min(1, (A.concetti[w].frasi ?? 0) / 10) : 0.6), g: e.giorni.size })).sort((a, b) => b.s - a.s)
  const scelto = cand[0]
  if (!scelto) return { tema: suggerito ?? 'tempo', perche: 'non trovo parole che tornino: riparto dal filo di oggi' }
  const daAltri = altrui.some(x => x.parola === scelto.w)
  return { tema: scelto.w, perche: `«${scelto.w}» torna in ${scelto.g} giornat${scelto.g === 1 ? 'a' : 'e'}${daAltri ? ' e qualcuno ne parla sotto i miei lavori' : ''}` }
}

/** produce `quante` tavole nuove per il post, provando più varianti per ognuna; si ferma da sé entro il tempo dato */
export async function tavoleAdHoc(st: AgentState, r0: () => number, o: { log: (m: string) => void; intention: Intention; readings: Reading[]; quante: number; fast?: boolean; suggerito?: string; tempoMax?: number; perche: string }): Promise<AdHoc> {
  const t0 = ora(), tempoMax = (o.tempoMax ?? 210) * 1000
  const { tema, perche } = scegliTema(st, o.suggerito)
  o.log(`Per il post: ${o.perche}. Faccio tavole apposta su «${tema}»: ${perche}.`)
  const quante = Math.max(2, Math.min(6, o.quante))
  // ne pianifica qualcuna in più: le tavole che restano solo parole non contano tra quelle buone per il post
  const plan = pianifica(st, r0, Math.max(4, quante + 2), tema, fraseDi, o.readings.length ? o.readings : st.readings.slice(-40))
  const schede = plan.schede.slice(0, quante + 2)
  const parole = [...new Set(schede.flatMap(x => [x.a, x.b]).filter(Boolean) as string[])]
  const { L } = scegliLinguaggio(st, r0, parole)
  const W = st as AgentState & { toniRecenti?: string[] }
  const tone = weighted(r0, TONES, t => ((W.toniRecenti ?? []).slice(-3).includes(t.id) ? 0.15 : 1) * (L.toni.includes(t.id) ? 3 : 0.5), 1)
  const { colori } = tavolozza(tone, r0, L.armonie)
  const A = ensureAtlante(st)
  const dati = parole.slice(0, 10).map(w => ({ label: w, v: (A.concetti[w]?.frasi ?? 0) + (A.concetti[w]?.usi ?? 0) * 2 + 1 }))
  const intention: Intention = { ...o.intention, word: tema }
  const tctx: ToolCtx = { r: r0, tone, intention, mood: st.mood, say: () => pick(r0, schede.map(x => x.titolo).filter(Boolean)) ?? '', shaders: st.shaders, quality: o.fast ? 0.35 : 0.5, noText: true, tipoOk: L.tipo.immagine, colori, dati, preferiti: L.strumenti }
  const F = getScuola(st)!.firma
  const passi = Math.round(({ curioso: 22, annoiato: 26, inquieto: 30, giocoso: 24, cupo: 16, calmo: 18 }[st.mood]) * (o.fast ? 0.45 : 0.7))
  const nEp = ((st as AgentState & { episodi?: unknown[] }).episodi?.length ?? 0) + 1
  const epId = uid()
  o.log(`Il discorso per il post: «${plan.titolo}», ${schede.length} tavole, linguaggio «${L.nome}», tono ${tone.label}.`)
  const out: AdHoc = { works: [], fogli: [], info: [], tema, perche }
  let tempoUna = 0, conCorpo = 0
  for (let i = 0; i < schede.length; i++) {
    // per il post ogni tavola ha qualcosa da vedere: due segni in relazione, non solo parole su un fondo
    const sc0 = schede[i], altro = parole.find(w => w !== (sc0.a ?? tema)) ?? tema
    const sc = { ...sc0, a: sc0.a ?? tema, b: sc0.b ?? (sc0.catena?.length ? undefined : altro), rel: sc0.rel ?? ('accanto' as NonNullable<typeof sc0.rel>) }
    // quante varianti: tre se c'è tempo, poi meno; almeno una
    const resta = tempoMax - (ora() - t0), daFare = schede.length - i
    const K = tempoUna ? Math.max(1, Math.min(4, Math.floor(resta / Math.max(1, daFare * tempoUna)))) : 3
    if (resta < tempoUna * 1.1 && out.works.length >= 2) { o.log(`Per il post: il tempo è finito, mi fermo a ${out.works.length} tavole.`); break }
    let meglio: { s: Sheet; v: number; look: number; materia: number; corpo: number } | null = null
    const voti: string[] = []
    for (let k = 0; k < K; k++) {
      const a = ora()
      const r = rng(Math.floor(r0() * 1e9))
      const studio = async (s0: Sheet) => {
        const it: Intention = { ...intention, targets: {}, tools: [...L.strumenti, 'materia', 'luce', 'shader', 'traccia', 'taglia'] }
        const res = await runStudio(st, r, s0, it, { ...tctx, r }, passi)
        learnTools(st, res.effects)
        return res.sheet
      }
      let s: Sheet
      try { s = await rendiScheda(st, r, { ...sc }, i + 1, schede.length, nEp, { ...tctx, r }, F.face, { studio: sc.ruolo === 'parola' && r() < 0.5 ? undefined : studio, colori, L }) } catch (e) { o.log(`Per il post: variante ${k + 1} della tavola ${i + 1} saltata (${e instanceof Error ? e.message : e}).`); continue }
      const g = valoreTavola(st, s, intention)
      voti.push(`${g.v.toFixed(2)}`)
      if (!meglio || g.v > meglio.v) meglio = { s, ...g }
      const dt = ora() - a
      tempoUna = tempoUna ? 0.7 * tempoUna + 0.3 * dt : dt
      if (ora() - t0 > tempoMax) break
    }
    if (!meglio) continue
    if (meglio.corpo >= 2) conCorpo++
    const sheet = meglio.s
    // la tavola scelta diventa un'opera, come tutte le altre
    const final = flatten(sheet, 1)
    const R = rasterize(final)
    const f = measure(R)
    const ps = patches(R)
    if (!st.codebook.length) { const s0 = seedCodebook(ps, r0); st.codebook = s0.cb; st.codebookCounts = s0.counts }
    const nov = noveltyOf(st, f, histogram(st.codebook, ps))
    const progress = Math.min(1, learn(st.codebook, st.codebookCounts, ps) * 5)
    const id = uid()
    const work: Work = {
      id, day: st.day, createdAt: new Date().toISOString(), title: `${i + 1}/${schede.length} · ${sc.titolo}`, text: sc.corpo, intention: { ...intention, word: sc.a ?? tema }, mood: st.mood,
      readings: sc.fonte ? [{ title: sc.fonte, url: '', source: sc.fonte }] : [], gestures: [{ tool: `episodio:${sc.ruolo}`, params: {}, kept: true, delta: 0 }, { tool: 'per-il-post', params: { varianti: voti.length, voti: voti.join(' '), tema }, kept: true, delta: 0 }],
      visual: { features: f, words: histogram(st.codebook, ps), palette: palette(R) },
      debate: { args: [], accepted: [], verdict: 'tiene', verbale: [] }, interest: interestOf(st, nov, progress), progress, novelty: nov, kept: true, image: '',
      tavola: i + 1, ragione: i ? 'serie' : 'prima', episodio: { id: epId, n: nEp, i: i + 1, N: schede.length, ruolo: sc.ruolo, titolo: plan.titolo },
    }
    ;(work as Work & { perIlPost?: { tema: string; perche: string } }).perIlPost = { tema, perche }
    st.recentVisual = [...st.recentVisual, { id, features: f, words: work.visual.words }].slice(-40)
    const saved = await T.saveWork(work, final.toDataURL('image/png'))
    try { await T.riponiFoglio(saved.id, JSON.stringify(serializza(sheet))) } catch (e) { o.log(`Cassetto: ${e instanceof Error ? e.message : e}`) }
    out.works.push(saved); out.fogli.push(sheet); out.info.push({ rel: sc.rel, interesse: saved.interest })
    if (conCorpo >= quante && i < schede.length - 1) { o.log(`Per il post ${i + 1}/${schede.length}: ho le ${quante} tavole che servono (sguardo ${meglio.look.toFixed(2)}, materia ${meglio.materia.toFixed(2)}).`); break }
    o.log(`Per il post ${i + 1}/${schede.length}: ${voti.length} variant${voti.length === 1 ? 'e' : 'i'} (${voti.join(', ')}), tengo la migliore — sguardo ${meglio.look.toFixed(2)}, materia ${meglio.materia.toFixed(2)}${sc.titolo ? `: ${sc.titolo}` : ''}.`)
  }
  o.log(`Per il post: ${out.works.length} tavole nuove in ${((ora() - t0) / 1000).toFixed(0)} s.`)
  return out
}
