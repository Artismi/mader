/**
 * Una giornata di studio, dall'inizio alla fine. Gira nel browser (servono
 * canvas e WebGL per le mani); legge e salva tramite /api/studio-agent.
 *
 *  1. rilegge quaderno, poetica, storia → umore e temperatura
 *  2. cerca e legge 3–6 testi, aggiorna spazio delle parole, logica, mappa del sapere
 *  3. sceglie un'intenzione (parola + bersagli visivi + registro + strumenti)
 *  4. genera e interviene: gesti guardati uno per uno (codelet + ricottura)
 *  5. titola e scrive
 *  6. dibattito interno → tiene o butta
 *  7. ricorsione: codebook, criteri, voci, strumenti, registri, poetica
 */
import type { AgentState, Genome, Gesture, Intention, NotebookEntry, Reading, Ricerca, Visit, Work } from './core/types'
import { rng, pick, weighted, uid } from './core/rng'
import * as T from './transport'
import { serializza, ricostruisci } from './hands/cassetto'
import { GENERICI } from './mind/pensiero'
import { posDi } from './reader/concepts'
import { cerca, merita, raccontato, decidiForma } from './mind/curatore'
import { TONES } from '@/components/studio/genera/recipes'
import { emptySheet, flatten, type Sheet } from './hands/sheet'
import type { ToolCtx } from './hands/tools'
import { measure, rasterize, palette } from './eyes/measure'
import { histogram, learn, patches, seedCodebook } from './eyes/visual-words'
import { addText, embed, freqOf, neighbors, similarity, type Embedding } from './reader/wordspace'
import { salient, sentences, words } from './reader/tokenize'
import { addTags } from './reader/analysis'
import { addBeliefs, contradictions, extract } from './reader/logic'
import { frontier, ground, setDefinition, toLookUp } from './reader/lexicon'
import { MOOD_TEMPERATURE, chooseIntention, moodOf } from './mind/intention'
import { learnTools, look, replay, runStudio } from './mind/studio'
import { computeThemes, openRicerca, ricercaFinished, stepRicerca } from './mind/ricerca'
import { evolve } from './mind/criteria'
import { adaptPeak, interest as interestOf, novelty as noveltyOf } from './mind/taste'
import { reweigh, speak, verbale as verbaleOf } from './mind/voices'
import { grounded, verdict, wireAttacks } from './mind/argue'
import { DEFAULT_SITES, chooseName, newQuestion, rewritePoetics } from './mind/poetics'
import { inscription, reflection, title as makeTitle, workText, type VoiceCtx } from './voice/writer'
import { ensureVetrina, predict, publish } from './mind/vetrina'
import { applicaEsercizio, autocritica, ensureScuola, esitoSferzata, evolviFirma, getScuola, redazione, registraStudio, sferzata } from './mind/scuola'
import { loadGeneri } from './voice/lingua'
import { chiudiEpisodio, getEpisodi, getVisione, pianifica, rendiScheda, ultimaImpaginazione } from './mind/episodio'
import { smonta, evolviCoreografia, gira as giraCoreografia, descriviCoreografia, type Coreografia, type Accoppiamento } from './hands/coreografo'
import { suonaBeat, scegliStile, premiaStile, type Gusto } from './suono/beat'
import { ascoltaBeat } from './suono/ascolto'
import { testoGrafico } from './hands/testiReel'
import { fraseDi } from './voice/scrittura'
import { lavora, type Lavoro } from './mind/cantiere'
import { formatoDi, rendiPagina } from './mind/pagina'
import { scegliLinguaggio, esitoLinguaggio } from './mind/linguaggi'
import { componi, durata, GENERE_NOME, wav } from './suono/musica'
import { FACES, type FaceId } from '@/components/studio/genera/fonts'
import { tavolozza, diversifica, aggiornaAtlante, enunciato, ensureAtlante, mettiInScena, registraTesi, scriviEnunciato, type Enunciato, type ModoTesto } from './mind/atlante'
import { costruisci, impagina, progetta, scenaFeatures, toneFor, type Forma } from './mind/scena'
import { flaws, readability } from './eyes/judgement'
import { conceptsReady, describe, loadConcepts, loadInglese } from './reader/concepts'
import { aggiornaProfilo, battezza, didascaliaIT } from './mind/profilo'
import { esitoVisivo, osservaRetorica, ricorda } from './mind/retorica'


export interface DayHooks {
  log: (msg: string) => void
  preview?: (c: HTMLCanvasElement) => void
  /** chiamato a ogni tavola salvata, per aggiornare la galleria in diretta */
  onWork?: (w: Work) => void
  /** modalità veloce: meno gesti, ricette più leggere, opere a 800×1000, niente anteprima a ogni gesto */
  fast?: boolean
  /** interrompere dopo la tavola in corso */
  shouldStop?: () => boolean
  /** modalità episodio: invece di 1–3 tavole, un episodio di N tavole che si leggono in sequenza */
  episodio?: number
  /** montare anche il reel animato della sequenza */
  reel?: boolean
  /** per le prove: il curatore racconta il discorso migliore che trova, anche se non è più forte del solito */
  reelForza?: boolean
}

const toReading = (x: T.Raw): Reading => ({ ...x, id: uid(), fetchedAt: new Date().toISOString() })

/** codifica sicura: le stringhe tagliate a metà di un carattere (surrogati soli) non fanno più saltare la giornata */
const enc = (x: string) => { try { return encodeURIComponent(x) } catch { return encodeURIComponent(x.replace(/[\uD800-\uDFFF]/g, '')) } }

async function gather(st: AgentState, r: () => number, thread: string | null, E: Embedding | null, log: DayHooks['log']): Promise<Reading[]> {
  const got: T.Raw[] = []
  const seen = new Set(st.readings.map(x => x.url))
  // 0. lo studio deciso ieri sera nell'autocritica
  const sc = getScuola(st)
  for (const q of (sc?.studiare ?? []).slice(0, 2)) {
    log(`Studio: ${q}.`)
    sc!.letti = [...(sc!.letti ?? []), q].slice(-200)
    got.push(...await T.read(`mode=cerca&n=1&q=${enc(q)}`))
  }
  // 1. cerca la parola del giorno
  if (thread) got.push(...await T.read(`mode=cerca&n=2&q=${enc(thread)}`))
  // 2. segue un link letto nei giorni prima, il più vicino alla parola del giorno
  const sites = st.sites ?? DEFAULT_SITES
  const host = (u: string) => { try { return new URL(u).host } catch { return '' } }
  const poolHosts = new Set(sites.map(host))
  const queue = (st.linkQueue ?? []).filter(t => !/^https?:/.test(t) ? !/[\uD800-\uDFFF]/.test(t) : (st.liberta || poolHosts.has(host(t))) && !!host(t))
  if (queue.length) {
    const dec = (x: string) => { try { return decodeURIComponent(x) } catch { return x } }
    const key = (t: string) => { if (!/^https?:/.test(t)) return t.toLowerCase().split(' ')[0]; try { return dec(new URL(t).pathname).split(/[\/\-_]/).filter(Boolean).pop() ?? '' } catch { return '' } }
    const scored = queue.map(t => ({ t, s: (thread && E ? similarity(E, thread, key(t)) : 0) + (thread && t.toLowerCase().includes(thread) ? 0.5 : 0) + r() * 0.3 }))
    const link = scored.sort((a, b) => b.s - a.s)[0].t
    st.linkQueue = (st.linkQueue ?? []).filter(t => t !== link)
    log(`Seguo un link: ${link}`)
    got.push(...await T.read(/^https?:/.test(link) ? `mode=pagina&url=${enc(link)}` : `mode=voce&t=${enc(link)}`))
  }
  // 3. esplora uno dei siti scelti (o una fonte delle impostazioni)
  if (sites.length && r() < 0.65) {
    const site = pick(r, sites)
    log(`Esploro ${host(site)}${thread ? ` cercando "${thread}"` : ''}.`)
    got.push(...await T.esplora(site, thread ?? '', [...seen].filter(u => u.includes(host(site))).slice(-200)))
  } else {
    const feeds = st.feeds.length ? st.feeds : ['wiki:casuale']
    const f = pick(r, feeds)
    if (f === 'wiki:casuale') got.push(...await T.read('mode=casuale'))
    else if (f === 'wiki:vetrina') got.push(...await T.read('mode=vetrina'))
    else if (f.startsWith('pagina:')) got.push(...await T.read(`mode=pagina&url=${enc(f.slice(7))}`))
    else got.push(...await T.read(`mode=rss&n=2&url=${enc(f)}`))
  }
  // 4. biblioteca dello studio
  const fresh0 = got.filter(x => x && x.text && x.text.length > 120 && !seen.has(x.url))
  if (r() < 0.5 || fresh0.length < 2) {
    const lib = await T.library()
    if (lib.length) {
      const b = thread ? (lib.find(x => x.text.toLowerCase().includes(thread)) ?? pick(r, lib)) : pick(r, lib)
      const paras = b.text.split(/\n\s*\n/).filter(p => p.length > 200)
      const hit = thread ? paras.findIndex(p => p.toLowerCase().includes(thread)) : -1
      const start = hit >= 0 ? hit : Math.floor(r() * Math.max(1, paras.length - 4))
      fresh0.push({ url: `biblioteca/${b.name}#${start}`, source: 'biblioteca', title: b.name.replace(/\.(md|txt)$/i, ''), text: paras.slice(start, start + 5).join('\n\n'), kind: 'biblioteca' })
    }
  }
  let fresh = fresh0.slice(0, 6).map(toReading)
  // 5. se il mondo non risponde, rilegge: cerca nelle letture vecchie la parola del giorno
  if (fresh.length < 2 && st.readings.length) {
    const old = st.readings.filter(x => thread && x.text.toLowerCase().includes(thread)).concat(st.readings).slice(0, 40)
    const two = [pick(r, old), pick(r, old)].filter((x, i, a) => a.indexOf(x) === i)
    for (const o of two) { fresh.push({ ...o, id: uid(), kind: 'rilettura', fetchedAt: new Date().toISOString() }); log(`Rileggo: ${o.title}`) }
  }
  fresh = fresh.slice(0, 6)
  // i link letti oggi entrano nella coda
  const links = fresh.flatMap(x => x.links ?? [])
  st.linkQueue = [...new Set([...(st.linkQueue ?? []), ...links])].slice(-400)
  for (const x of fresh) if (x.kind !== 'rilettura') log(`Leggo: ${x.title} (${x.source})`)
  return fresh
}

export async function runDay(input: AgentState, hooks: DayHooks): Promise<{ state: AgentState; works: Work[] }> {
  const st: AgentState = structuredClone(input)
  const log = hooks.log
  st.day++
  const r = rng(st.seed + st.day * 7919)

  // 1 · rileggere
  st.mood = moodOf(st.history.slice(-5), r)
  st.temperature = MOOD_TEMPERATURE[st.mood]
  log(`Giorno ${st.day}. Umore: ${st.mood} (temperatura ${st.temperature}).`)
  const visits = st.visits.filter(v => !v.read)
  if (visits.length) log(`Trovo ${visits.length} note lasciate in studio.`)
  ensureVetrina(st, r)
  if (await loadConcepts()) log('Ho il lessico: 50.000 parole italiane con i loro legami.')
  await loadInglese()
  const sc = ensureScuola(st, r)
  await loadGeneri()

  // 2 · ricerca in corso (struttura su più giorni) e parola del giorno
  const E0 = st.words.docs > 3 ? embed(st.words, 1200, 24, st.seed) : null
  if (E0 && (!st.themes?.length || st.day % 7 === 0)) st.themes = computeThemes(E0, freqOf(st.words), 10, r)
  // una ricerca aperta su una parola vuota («inoltre», «alcuni»): la lascia e ne apre una vera (con temi rifatti)
  if (st.ricerca && !st.ricerca.closed && (GENERICI.has(st.ricerca.word) || !posDi(st.ricerca.word).has('n') || posDi(st.ricerca.word).has('r'))) {
    log(`Lascio la ricerca su "${st.ricerca.word}": non è una cosa, è una parola di passaggio.`)
    st.ricerca.closed = true; st.ricercheChiuse = [...(st.ricercheChiuse ?? []), st.ricerca].slice(-30) // chiusa e archiviata, non buttata
    st.ricerca = undefined; if (E0) st.themes = computeThemes(E0, freqOf(st.words), 10, r)
  }
  if (!st.ricerca || st.ricerca.closed) {
    st.ricerca = openRicerca(st, r)
    if (st.ricerca) log(`Apro una ricerca su "${st.ricerca.word}" (${st.ricerca.words.join(', ')}), per ${st.ricerca.length} giorni. ${st.ricerca.question}`)
  }
  const step = st.ricerca ? stepRicerca(st.ricerca, st.day) : null
  if (st.ricerca && step) { st.ricerca.phase = step.phase; log(`Ricerca "${st.ricerca.word}", fase: ${step.phase}.`) }
  const openQ = st.questions.filter(q => !q.closed).sort((a, b) => a.visits - b.visits)
  const voids = Object.values(st.lexicon).filter(e => e.state === 'a_vuoto').map(e => e.word)
  const domEp = hooks.episodio ? (getVisione(st)?.domanda ?? '').toLowerCase().split(/[^a-zàèéìòù]+/).find(w => w.length > 3 && ensureAtlante(st).concetti[w]) : undefined
  // la sequenza riparte da dove era finita la precedente: il punto d'arrivo dell'ultimo capitolo (più spesso) o la sua domanda
  const precEp = hooks.episodio ? getEpisodi(st).slice(-1)[0] as (ReturnType<typeof getEpisodi>[number] & { coppia?: string }) | undefined : undefined
  const daPrec = precEp?.coppia && r() < 0.65 ? precEp.coppia.split('|')[1] : undefined
  if (daPrec) log(`Riparto da dove avevo finito: "${daPrec}".`)
  const thread = daPrec ?? domEp ?? step?.word ?? openQ[0]?.word ?? (voids.length ? pick(r, voids) : null)
  if (thread) log(`Seguo un filo: "${thread}".`)
  const readings = await gather(st, r, thread, E0, log).catch(e => { log(`Non riesco a leggere (${e instanceof Error ? e.message : e}): lavoro con quello che ho.`); return [] as Reading[] })
  if (!readings.length) log('Non sono riuscito a leggere niente: lavoro con quello che ho.')
  const concettiNoti = Object.keys(ensureAtlante(st).concetti).slice(-400)
  for (const rd of readings) { registraStudio(st, rd.title, rd.text); try { osservaRetorica(st, rd.text, thread ? [thread, ...concettiNoti] : concettiNoti, rd.title) } catch { /* niente */ } }
  sc.studiare = []
  for (const rd of readings) if (rd.kind !== 'rilettura') addText(st.words, rd.text)
  const nFrasi = ensureAtlante(st).frasi.length
  aggiornaAtlante(st, readings)
  log(`Atlante: ${ensureAtlante(st).frasi.length - nFrasi} frasi nuove da rileggere, ${Object.keys(ensureAtlante(st).concetti).length} concetti.`)
  enDelGiorno = null
  // il cantiere: il lavoro lungo avanza di un passo
  const lavoro = lavora(st, r, log)
  paginaOggi = lavoro && (formatoDi(lavoro) === 'copertina' || lavoro.azione === 'chiude' || r() < 0.5) ? lavoro : null

  // analisi grammaticale con il lessico del server, se c'è
  const sent = readings.flatMap(rd => sentences(rd.text).slice(0, 40).map(s => ({ s, src: rd.title })))
  const vocab = [...new Set(sent.flatMap(x => words(x.s)))]
  addTags(await T.posTags(vocab))
  const fresh = sent.map(x => extract(x.s, x.src)).filter(Boolean) as NonNullable<ReturnType<typeof extract>>[]
  st.beliefs = addBeliefs(st.beliefs, fresh)
  log(`Ho estratto ${fresh.length} affermazioni dalle letture.`)

  // mappa del sapere: cerca le definizioni di ciò che non conosce, e scende di un livello
  const df = freqOf(st.words)
  const salientToday = [...new Set(readings.flatMap(rd => salient(rd.text, df, st.words.docs, 10)))]
  // con il lessico le definizioni sono istantanee: ne cerca di più, e il web solo per ciò che il lessico non sa
  const nLook = conceptsReady() ? 14 : hooks.fast ? 3 : 6
  const look = [...toLookUp(st, salientToday, nLook), ...frontier(st, conceptsReady() ? 10 : hooks.fast ? 2 : 5)]
  let webDefs = 0
  for (const w of look) {
    const d = describe(w)
    if (d) { setDefinition(st, w, d.text, st.day, d.words); continue }
    if (webDefs++ >= 3) continue
    const wd = await T.define(w)
    setDefinition(st, w, wd.definition, st.day)
  }
  ground(st)
  if (look.length) log(`Ho cercato ${look.length} definizioni: ${look.join(', ')}.`)
  for (const q of st.questions) {
    if (q.word === thread) q.visits++
    const e = st.lexicon[q.word]
    if (e && (e.state === 'definita' || e.state === 'ancorata')) q.closed = true
  }
  for (const w of salientToday.filter(w => st.lexicon[w]?.state === 'a_vuoto').slice(0, 2)) {
    if (!st.questions.some(q => q.word === w)) st.questions.push(newQuestion(w, st.day, r))
  }
  st.questions = st.questions.slice(-30)

  // 3 · intenzione
  const E = embed(st.words, 1200, 24, st.seed)
  if (!st.name) { st.name = chooseName(r, salientToday); log(`Mi chiamerò ${st.name}.`) }
  const intention: Intention = chooseIntention(st, r, E, salientToday, readings[0]?.title ?? '', step?.word)
  if (st.ricerca && step) intention.why += `; ricerca "${st.ricerca.word}" (${step.phase}): ${st.ricerca.question}`
  // sferzata (rompe apposta la firma) oppure l'esercizio deciso ieri sera
  const sf = sferzata(st, r)
  if (sf) { Object.assign(intention.targets, sf.intention.targets); intention.tools = sf.intention.tools ?? intention.tools; intention.why += `; sferzata: ${sf.rottura}`; log(`Oggi una sferzata: ${sf.rottura}.`) }
  else { const ex = applicaEsercizio(st, intention); if (ex) log(`Esercizio di oggi: ${ex}.`) }
  if (lavoro && !sf) { intention.word = lavoro.capitolo.concetto; intention.why += `; cantiere «${lavoro.cantiere.titolo}», capitolo «${lavoro.capitolo.titolo}» (${lavoro.azione})` }
  log(`Intenzione: "${intention.word}", tono ${intention.register}. Perché: ${intention.why}.`)

  // 4–7 · una o più tavole: la prima, poi una serie se ha funzionato, o un ritentativo se l'ha buttata
  for (const sh of st.shaders.filter(x => !x.code)) {
    const res = await T.shader(sh.url)
    if (res.code) { sh.code = res.code; log(`Ho raccolto uno shader: ${sh.url}`) }
  }
  const near = neighbors(E, intention.word, 12).map(n => n.word)
  const ownTexts = st.notebook.slice(-6).flatMap(n => n.verbale).slice(-40)
  const works: Work[] = []
  const allVerb: string[] = [], allDone: string[] = [], allBored: string[] = [], newborn: string[] = []
  let ragione: Work['ragione'] = 'prima'
  let cur: Intention = intention
  let parent: Genome | null = pickParent(st, r, step?.phase)
  if (parent) log(`Riparto da una tavola riuscita del giorno ${parent.day} e la vario.`)
  if (hooks.episodio) {
    try { works.push(...await episodio(st, r, hooks, intention, thread, readings)) } catch (e) { log(`Episodio interrotto: ${e instanceof Error ? e.message : e}`) }
  }
  for (let n = 1; n <= (hooks.episodio ? 0 : MAX_TAVOLE); n++) {
    let out: Awaited<ReturnType<typeof tavola>>
    try { out = await tavola(st, r, cur, n, ragione, readings, near, ownTexts, visits, hooks, parent, step?.phase, sf?.rottura)
    } catch (e) { log(`Tavola ${n} saltata: ${e instanceof Error ? e.message : e}`); break }
    parent = out.genome
    works.push(out.work)
    allVerb.push(...out.work.debate.verbale.map(l => `[tavola ${n}] ${l}`))
    allDone.push(...out.work.gestures.filter(g => g.kept).map(g => g.tool))
    allBored.push(...out.bored)
    newborn.push(...out.newborn)
    // decide se continuare: dipende da esito, interesse e umore
    const restless = st.mood === 'curioso' || st.mood === 'inquieto' || st.mood === 'giocoso'
    const pSerie = out.work.kept && out.work.interest > 0.5 ? (restless ? 0.6 : 0.3) : 0
    const pRitenta = !out.work.kept ? (st.mood === 'cupo' ? 0.2 : 0.5) : 0
    const roll = r()
    if (n < MAX_TAVOLE && roll < pSerie) {
      ragione = 'serie'
      cur = vary(cur, r, out.work.visual.features)
      log(`Continuo in serie: un'altra tavola su "${cur.word}".`)
    } else if (n < MAX_TAVOLE && roll < pRitenta) {
      ragione = 'ritenta'
      cur = { ...cur, tools: cur.tools.slice().reverse(), why: cur.why + '; ritento dopo averla buttata' }
      log('Ritento: la tavola di prima non teneva.')
    } else break
    if (hooks.shouldStop?.()) break
  }

  // quaderno della giornata
  const used = new Set(allDone)
  const neverUsed = ['semina', 'materia', 'luce', 'geometria', 'pattern', 'traccia', 'scrivi', 'grana', 'taglia', 'ripeti', 'disponi', 'togli', 'fondo', 'shader']
    .filter(t => !st.tools[t] && !used.has(t))
  const entry: NotebookEntry = {
    day: st.day, date: new Date().toISOString(),
    intention: `${intention.word} — ${intention.why}${works.length > 1 ? ` (${works.length} tavole)` : ''}`,
    done: allDone, verbale: allVerb,
    wants: [
      ...(neverUsed.length ? [`provare ${pick(r, neverUsed)}`] : []),
      ...st.questions.filter(q => !q.closed).slice(0, 1).map(q => q.text),
      ...newborn.map(c => `cercare ${c}`),
    ],
    bored: [...new Set(allBored)],
    workId: works[0]?.id, workIds: works.map(w => w.id),
  }
  st.notebook = [...st.notebook, entry].slice(-120)
  st.readings = [...st.readings, ...readings.map(x => ({ ...x, text: x.text.slice(0, 4000) }))].slice(-60)
  for (const vv of st.visits) if (!vv.read) vv.read = true
  if (st.day % 7 === 0 || st.poetics.length === 1) {
    st.poetics.push({ day: st.day, date: new Date().toISOString(), text: rewritePoetics(st) })
    log('Ho riscritto la mia poetica.')
  }
  // autocritica serale: debolezza, cosa studiare domani, esercizio; la firma evolve
  const dg = autocritica(st, r)
  if (dg) {
    const near0 = dg.affinita[0]
    log(`Autocritica: il mio punto debole è ${dg.debolezza}, il forte ${dg.forza}. Somiglio di più a: ${near0.maestro}. Domani studio ${sc.studiare.join(', ') || 'niente'}${sc.esercizio ? `, esercizio: ${sc.esercizio.vincoli}` : ''}.`)
    entry.wants.push(`studiare ${sc.studiare.join(', ')}`)
  }
  if (st.day % 5 === 0) evolviFirma(st, r)
  if (st.ricerca && ricercaFinished(st.ricerca, st.day)) {
    st.ricerca.closed = true
    st.ricercheChiuse = [...(st.ricercheChiuse ?? []), st.ricerca].slice(-30)
    entry.wants.push(`chiusa la ricerca su "${st.ricerca.word}" dopo ${st.ricerca.workIds.length} tavole`)
    log(`Chiudo la ricerca su "${st.ricerca.word}". Ho trovato: ${st.ricerca.findings.slice(-2).join(' / ') || 'poco'}.`)
  }
  st.lastRun = new Date().toISOString()
  await T.putState(st)
  return { state: st, works }
}

const MAX_TAVOLE = 3

/** da quale tavola riuscita ripartire: nella ricerca in corso quando approfondisce o sintetizza, a volte dal repertorio intero */
function pickParent(st: AgentState, r: () => number, phase?: Ricerca['phase']): Genome | null {
  const rep = st.repertorio ?? []
  if (!rep.length && !Object.keys(st.archivio ?? {}).length) return null
  const mine = rep.filter(g => g.ricercaId && g.ricercaId === st.ricerca?.id)
  if ((phase === 'approfondire' || phase === 'sintesi') && mine.length) return weighted(r, mine, g => g.interest, 0.6)
  const p = st.mood === 'annoiato' || st.mood === 'inquieto' ? 0.2 : 0.45
  if (r() >= p) return null
  // dall'archivio degli stili: caselle diverse, la migliore di ciascuna
  const arch = Object.values(st.archivio ?? {})
  if (arch.length) return weighted(r, arch, g => g.quality, st.temperature)
  return weighted(r, rep, g => g.interest, st.temperature)
}

/** variazione in serie: stessi temi, bersagli spostati verso ciò che ha funzionato e un po' oltre */
function vary(it: Intention, r: () => number, f: Record<string, number>): Intention {
  const targets: Record<string, number> = {}
  for (const [k, v] of Object.entries(it.targets)) targets[k] = Math.max(0.02, Math.min(0.98, (f[k] ?? v) + (r() - 0.5) * 0.3))
  return { ...it, targets, why: it.why.split('; serie')[0] + '; serie: varia la tavola precedente' }
}

let enDelGiorno: Enunciato | null = null

/** un episodio: N tavole che si leggono in fila, un ragionamento dall'inizio alla fine */
async function episodio(st: AgentState, r: () => number, hooks: DayHooks, intention: Intention, thread: string | null, readings: Reading[]): Promise<Work[]> {
  const log = hooks.log
  const N = Math.max(4, Math.min(20, hooks.episodio ?? 12))
  const F = getScuola(st)!.firma
  const cambiati = diversifica(st, r)
  if (cambiati.length) log(`Alcuni segni si somigliavano troppo: ${cambiati.join(', ')} ne hanno uno nuovo.`)
  const plan = pianifica(st, r, N, thread ?? intention.word, fraseDi, readings)
  const nEp = ((st as AgentState & { episodi?: unknown[] }).episodi?.length ?? 0) + 1
  // il linguaggio: lo sceglie (o lo inventa) per quello che sta dicendo
  const parole = [...new Set(plan.schede.flatMap(x => [x.a, x.b]).filter(Boolean) as string[])]
  const { L, perche: perL } = scegliLinguaggio(st, r, parole)
  // il tono: dal linguaggio, diverso dalle ultime sequenze
  const W = st as AgentState & { toniRecenti?: string[] }
  const tone = weighted(r, TONES, t => ((W.toniRecenti ?? []).slice(-3).includes(t.id) ? 0.15 : 1) * (L.toni.includes(t.id) ? 3 : 0.5), 1)
  W.toniRecenti = [...(W.toniRecenti ?? []), tone.id].slice(-10)
  const { colori, armonia } = tavolozza(tone, r, L.armonie)
  // i suoi numeri, per i grafici: quanto crede alle premesse, quanto ha letto dei concetti
  const A = ensureAtlante(st)
  const dati = parole.slice(0, 10).map(w => ({ label: w, v: (A.concetti[w]?.frasi ?? 0) + (A.concetti[w]?.usi ?? 0) * 2 + 1 }))
  const tctx: ToolCtx = { r, tone, intention, mood: st.mood, say: () => pick(r, plan.schede.map(x => x.titolo).filter(Boolean)) ?? '', shaders: st.shaders, quality: hooks.fast ? 0.35 : 0.5, noText: true, tipoOk: L.tipo.immagine, colori, dati, preferiti: L.strumenti }
  // le follie: qualche salto dentro la sequenza (di più se è curioso, inquieto o giocoso)
  const pF = 0.12 + (st.temperature - 0.8) * 0.2 + (['curioso', 'inquieto', 'giocoso'].includes(st.mood) ? 0.1 : 0)
  let nF = 0
  for (const sc of plan.schede) if (nF < 3 && sc.a && r() < pF) { sc.follia = pick(r, r() < 0.7 ? L.follie : ['scala', 'ossessione', 'scambio', 'assenza', 'istruzione', 'grafico', 'inversione', 'caleido']); nF++ }
  log(`Sequenza ${nEp} in forma «${plan.forma}», linguaggio «${L.nome}», tono ${tone.label} (${armonia}). ${perL}`)
  log(`«${plan.titolo}», ${plan.schede.length} tavole.${plan.d ? ` Il ragionamento: ${plan.d.passi} passaggi, ci credo al ${Math.round(plan.d.conf * 100)}%.` : ` Niente da dedurre oggi: leggo${plan.lettura ? ` «${plan.lettura}»` : ''}.`}${nF ? ` Salti: ${plan.schede.filter(x => x.follia).map(x => x.follia).join(', ')}.` : ''}`)
  const passi = Math.round(({ curioso: 22, annoiato: 26, inquieto: 30, giocoso: 24, cupo: 16, calmo: 18 }[st.mood]) * (hooks.fast ? 0.45 : 0.7))
  const studio = async (s0: Sheet) => {
    const it: Intention = { ...intention, targets: {}, tools: [...L.strumenti, 'materia', 'luce', 'shader', 'traccia', 'taglia'] }
    const res = await runStudio(st, r, s0, it, { ...tctx }, passi)
    learnTools(st, res.effects)
    return res.sheet
  }
  const works: Work[] = []
  const epId = uid()
  // la musica si compone prima: così il reel può montare le tavole a tempo mentre le disegna
  const partitura0 = componi({ linguaggio: L.id, forma: plan.forma, scuro: tone.dark, conf: plan.d?.conf ?? 0.3, mood: st.mood, schede: plan.schede.map(x => ({ rel: x.rel, concetto: x.a, follia: x.follia, parole: `${x.titolo} ${x.corpo ?? ''}`.split(/\s+/).filter(Boolean).length })), seme: Math.floor(r() * 1e9) })
  const riuscite: number[] = []
  // per il reel le tavole restano smontate: si tengono i fogli con i loro livelli
  const fogli: Sheet[] = [], infoReel: { rel?: string; interesse: number }[] = []
  for (let i = 0; i < plan.schede.length; i++) {
    if (hooks.shouldStop?.()) break
    const sc = plan.schede[i]
    let sheet
    try { sheet = await rendiScheda(st, r, sc, i + 1, plan.schede.length, nEp, tctx, F.face, { studio: sc.ruolo === 'parola' && r() < 0.5 ? undefined : studio, colori, L }) } catch (e) { log(`Tavola ${i + 1} saltata: ${e instanceof Error ? e.message : e}`); continue }
    const final = flatten(sheet, 1)
    const R = rasterize(final)
    const f = measure(R)
    const ps = patches(R)
    if (!st.codebook.length) { const s0 = seedCodebook(ps, r); st.codebook = s0.cb; st.codebookCounts = s0.counts }
    const nov = noveltyOf(st, f, histogram(st.codebook, ps))
    const progress = Math.min(1, learn(st.codebook, st.codebookCounts, ps) * 5)
    const id = uid()
    const work: Work = {
      id, day: st.day, createdAt: new Date().toISOString(), title: `${i + 1}/${plan.schede.length} · ${sc.titolo}`, text: sc.corpo, intention: { ...intention, word: sc.a ?? intention.word }, mood: st.mood,
      readings: sc.fonte ? [{ title: sc.fonte, url: '', source: sc.fonte }] : [], gestures: [{ tool: `episodio:${sc.ruolo}`, params: {}, kept: true, delta: 0 }],
      visual: { features: f, words: histogram(st.codebook, ps), palette: palette(R) },
      debate: { args: [], accepted: [], verdict: 'tiene', verbale: [] }, interest: interestOf(st, nov, progress), progress, novelty: nov, kept: true, image: '',
      tavola: i + 1, ragione: i ? 'serie' : 'prima', episodio: { id: epId, n: nEp, i: i + 1, N: plan.schede.length, ruolo: sc.ruolo, titolo: plan.titolo },
    }
    st.recentVisual = [...st.recentVisual, { id, features: f, words: work.visual.words }].slice(-40)
    const saved = await T.saveWork(work, final.toDataURL('image/png'))
    // nel cassetto, con i suoi livelli: potrà tornare in un discorso tra più giornate
    try { await T.riponiFoglio(saved.id, JSON.stringify(serializza(sheet))) } catch (e) { log(`Cassetto: ${e instanceof Error ? e.message : e}`) }
    works.push(saved); riuscite.push(i)
    if (sc.b && ultimaImpaginazione()) esitoVisivo(st, sc.rel ?? 'accanto', ultimaImpaginazione()!, saved.interest)
    if (hooks.reel) { fogli.push(sheet); infoReel.push({ rel: sc.rel, interesse: saved.interest }) }
    hooks.onWork?.(saved)
    hooks.preview?.(flatten(sheet, 0.5))
    log(`${i + 1}/${plan.schede.length} ${sc.ruolo}${sc.titolo ? `: ${sc.titolo}` : ''}`)
  }
  if (!works.length) return works
  // la musica: un brano composto per questa sequenza, un pezzo per tavola
  // le sezioni delle tavole saltate si tolgono; l'ultima rimasta chiude il brano
  const partitura = { ...partitura0, sezioni: riuscite.map((i, k) => ({ ...partitura0.sezioni[i], ultimo: k === riuscite.length - 1 })) }
  let video: Blob | null = null
  let audioReel: Blob | null = null
  // il reel non nasce da ogni sequenza: lo decide il curatore, quando le tavole di più giornate si allineano in un discorso
  if (hooks.reel) {
    try {
      const tutte = await T.listWorks()
      const d = cerca(st, tutte, new Set(await T.nelCassetto()), works.map(w => w.id))
      const m = merita(st, d)
      log(`Curatore: ${m.perche}.`)
      if (d && (m.si || hooks.reelForza)) {
        const fogliD: Sheet[] = [], infoD: { rel?: string; interesse: number }[] = []
        for (const id of d.ids) { const j = await T.prendiFoglio(id); if (!j) continue; fogliD.push(await ricostruisci(JSON.parse(j))); infoD.push({ interesse: tutte.find(x => x.id === id)?.interest ?? 0.5 }) }
        if (fogliD.length >= 3) {
          log(`Curatore: racconto «${d.tema}» con ${fogliD.length} tavole di ${d.giorni.length} giornate.`)
          const rr = await faiReel(st, r, fogliD, infoD, { domanda: d.domanda, conclusione: d.conclusione, face: F.face as FaceId, parola: d.tema }, log)
          if (rr) { video = rr.video; audioReel = rr.audio; raccontato(st, d) }
        }
      }
    } catch (e) { log(`Reel non riuscito: ${e instanceof Error ? e.message : e}`) }
  }
  void fogli; void infoReel
  const descrMusica = `${GENERE_NOME[partitura.genere]}, ${partitura.bpm} bpm, ${partitura.risolve ? 'chiude risolta' : 'resta sospesa'}`
  log(`Musica: ${descrMusica}. Le tavole durano da ${Math.min(...partitura.sezioni.map((_, k) => durata(partitura, k))).toFixed(1)} a ${Math.max(...partitura.sezioni.map((_, k) => durata(partitura, k))).toFixed(1)} secondi, quanto serve per leggerle.${partitura.grooveCodice ? ` Il groove me lo scrivo: ${partitura.grooveCodice}.` : ''}`)
  const prec = getEpisodi(st).slice(-1)[0] as ({ conclusione?: string; domanda?: string } | undefined)
  const caption = didascaliaIT(st, { prima: prec ? { conclusione: prec.conclusione, domanda: prec.domanda } : undefined, n: getEpisodi(st).length + 1, titolo: plan.titolo, schede: plan.schede.slice(0, works.length), d: plan.d, domanda: plan.domanda, lettura: plan.lettura, forma: plan.forma, L, partitura })
  esitoLinguaggio(st, L.id, works.reduce((a, w) => a + w.interest, 0) / Math.max(1, works.length))
  const ep = chiudiEpisodio(st, r, { musica: { partitura, descr: descrMusica }, lettura: plan.lettura, coppia: plan.d ? `${plan.d.a}|${plan.d.b}` : undefined, titolo: plan.titolo, day: st.day, schede: works.map(w => w.id), conclusione: plan.d?.testo ?? plan.titolo, domanda: plan.domanda, caption }, plan.d)
  if (video) await T.salvaReel(ep.id, video).catch(() => {})
  if (audioReel) await T.salvaReel(`${ep.id}:audio`, audioReel).catch(() => {})
  // che forma dare a quello che è nato: la sceglie lui
  { const fp = decidiForma(st, ep, works, !!video); log(`Forma: ${({ reel: 'un reel', carosello: 'un carosello', storia: 'una storia', niente: 'niente' })[fp.forma]} — ${fp.perche}.`) }
  ricorda(st, caption)
  {
    const recenti = (await T.listWorks()).filter(w => w.day >= st.day - 20)
    const P = aggiornaProfilo(st, recenti)
    // alla terza sequenza ha abbastanza parole sue: si sceglie un nome vero
    if (!P.why && getEpisodi(st).length >= 3) { const b = battezza(st, recenti); log(b.perche) }
  }
  const post = publish(st, r, works[0], [plan.d?.a, plan.d?.b].filter(Boolean) as string[], caption, [])
  post.carosello = works.map(w => w.id)
  post.title = plan.titolo
  post.caption = caption
  log(`Pubblicata la sequenza ${ep.n}: ${post.views} visualizzazioni, ${post.likes} like${post.virale ? ' — virale' : ''}`)
  return works
}
let paginaOggi: Lavoro | null = null

async function tavola(
  st: AgentState, r: () => number, intention: Intention, n: number, ragione: Work['ragione'],
  readings: Reading[], near: string[], ownTexts: string[], visits: Visit[], hooks: DayHooks,
  parent: Genome | null, phase?: Ricerca['phase'], rottura?: string,
): Promise<{ work: Work; bored: string[]; newborn: string[]; genome: Genome | null }> {
  const log = hooks.log
  const fast = !!hooks.fast
  const F = getScuola(st)!.firma
  // la regia: prima decide che cosa mostrare (le sferzate no: lì si va a briglia sciolta)
  // che cosa dice questa tavola: un enunciato dall'atlante (le letture reinterpretate)
  const pag = n === 1 && !rottura ? paginaOggi : null
  if (n === 1) paginaOggi = null
  const en = rottura || pag ? null : enunciato(st, r, intention.word, ragione === 'serie' ? enDelGiorno : null)
  if (en) { enDelGiorno = en; intention.word = en.a; intention.why += `; enunciato: «${en.frase}» (${en.perche})`; log(`Enunciato: «${en.frase}». Da «${en.citazione}» (${en.fonte}). ${en.perche}.`) }
  const scena = rottura || en || pag ? null : progetta(st, r, intention, near, ragione === 'serie' ? (parent as Genome & { forma?: Forma } | null)?.forma : undefined)
  const tone = scena ? toneFor(scena, r, TONES, F.tone) : weighted(r, TONES, t => (t.id === F.tone ? 1.6 : 1) * ((st.mood === 'cupo' || st.mood === 'inquieto') === t.dark ? 2 : 1), st.temperature)
  const vctx: VoiceCtx = { r, register: intention.register, word: intention.word, near, readings: readings.length ? readings : st.readings.slice(-4), ownTexts, day: st.day, beliefs: st.beliefs.slice(-400) }
  const tctx: ToolCtx = { r, tone, intention, mood: st.mood, say: () => inscription(vctx), shaders: st.shaders, quality: fast ? 0.35 : 0.5, noText: !!(scena || en || pag) }
  const base = { curioso: 22, annoiato: 26, inquieto: 30, giocoso: 24, cupo: 16, calmo: 18 }[st.mood]
  const steps = Math.round(base * (fast ? 0.6 : 1) * (scena ? 0.45 : en ? 0.8 : 1))
  log(`— Tavola ${n} (${ragione}), tono ${tone.label}.`)
  let start = emptySheet(800, 1000, tone.bg)
  let pre: { gestures: Gesture[]; genome: { tool: string; params: Record<string, unknown> }[] } = { gestures: [], genome: [] }
  let costr: Awaited<ReturnType<typeof costruisci>> | null = null
  let messa: Awaited<ReturnType<typeof mettiInScena>> | null = null
  if (pag) {
    log(`Pagina del cantiere (${formatoDi(pag)}): «${pag.capitolo.titolo}».`)
    start = await rendiPagina(st, r, pag, start, tctx, F.face)
    pre = { gestures: [{ tool: `pagina:${formatoDi(pag)}`, params: { capitolo: pag.capitolo.titolo }, kept: true, delta: 0 }], genome: [] }
  } else if (en) {
    messa = await mettiInScena(st, r, en, start, tctx)
    start = messa.sheet
    pre = { gestures: messa.passi, genome: [] }
    if (!fast) hooks.preview?.(flatten(start, 0.5))
  } else if (scena) {
    log(`Scena: ${scena.perche}. «${scena.didascalia}».`)
    intention.why += `; scena: ${scena.perche}`
    Object.assign(intention.targets, scenaFeatures(scena))
    costr = await costruisci(st, r, scena, start, tctx, F.face)
    start = costr.sheet
    pre = { gestures: costr.passi, genome: [] }
    if (!fast) hooks.preview?.(flatten(start, 0.5))
  } else if (parent) {
    const amount = phase === 'sintesi' ? 0.25 : ragione === 'serie' ? 0.4 : 0.6
    const rp = await replay(st, r, start, parent.gestures, tctx, amount)
    start = rp.sheet; pre = rp
    log(`Rifatti ${rp.gestures.length} gesti dal genoma (variazione ${Math.round(amount * 100)}%).`)
  }
  const res0 = pag ? { sheet: start, gestures: [] as Gesture[], last: look(st, start, intention), effects: [], genome: [] } : await runStudio(st, r, start, intention, tctx, parent && !scena && !en ? Math.ceil(steps * 0.5) : steps, (s, g) => {
    log(`${g.kept ? '✓' : '✗'} ${g.tool} (${g.delta >= 0 ? '+' : ''}${g.delta})`)
    if (!fast) hooks.preview?.(flatten(s, 0.5))
  })
  const res = { ...res0, gestures: [...pre.gestures, ...res0.gestures], genome: [...pre.genome, ...res0.genome] }
  // il testo per ultimo: dentro la composizione, dove c'è spazio, leggibile su ciò che c'è sotto
  let ttl0 = pag ? `${pag.cantiere.titolo} — ${pag.capitolo.titolo}` : ''
  if (en && messa) {
    const modo = weighted(r, ['riga', 'colonna', 'etichette', 'grande'] as ModoTesto[], m => (m === 'grande' && intention.register === 'slogan' ? 3 : m === 'etichette' && (en.rel === 'contro' || en.rel === 'causa') ? 2 : 1), 0.8)
    res.sheet = await scriviEnunciato(res.sheet, r, en, messa, F.face, tone, modo)
    ttl0 = en.frase.charAt(0).toUpperCase() + en.frase.slice(1)
  } else if (scena && costr && intention.register !== 'silenzio') {
    ttl0 = makeTitle(vctx, true)
    res.sheet = await impagina(res.sheet, scena, costr, ttl0, F.face, tone, F.margine)
  }
  // la redazione: togliere, ordinare, rendere leggibile, firmare (non nelle sferzate)
  if (!rottura && !pag) {
    const red = await redazione(st, r, res.sheet, s => look(st, s, intention), { firma: true, nome: st.name, impaginato: !!(scena || en) })
    res.sheet = red.sheet
    res.gestures = [...res.gestures, ...red.passi]
    const tenuti = red.passi.filter(p => p.kept).map(p => p.tool.replace('redazione:', ''))
    if (tenuti.length) log(`Redazione: ${tenuti.join(', ')}.`)
  }
  if (fast) hooks.preview?.(flatten(res.sheet, 0.5))

  // guardare la tavola finita
  const final = flatten(res.sheet, fast ? 1 : 2)
  const R = rasterize(final)
  const f = measure(R)
  const ps = patches(R)
  if (!st.codebook.length) { const s = seedCodebook(ps, r); st.codebook = s.cb; st.codebookCounts = s.counts }
  const nov = noveltyOf(st, f, histogram(st.codebook, ps))
  const progress = Math.min(1, learn(st.codebook, st.codebookCounts, ps) * 5)
  const intr = interestOf(st, nov, progress)
  const vis = { features: f, words: histogram(st.codebook, ps), palette: palette(R) }
  vctx.features = f
  const ttl = ttl0 || makeTitle(vctx)
  log(`Titolo: ${ttl || '(nessuno)'}`)

  // cosa vedrebbe chiunque, e cosa ne penserebbe il pubblico
  const read = readability(res.sheet)
  const fl = flaws(f, read, res.last.parts.intenzione ?? 0.5, res.sheet.layers.map(l => l.kind))
  const tagWords = [intention.word, ...(st.ricerca?.words ?? []).slice(0, 2), ...near.slice(0, 2)]
  const audience = predict(st, f, tagWords, nov, fl)

  // dibattito
  const args = speak({
    st, f, novelty: nov, intention, title: ttl, toolsUsed: res.gestures.filter(g => g.kept).map(g => g.tool),
    readingsTitles: readings.map(x => x.title), contradictions: contradictions(st.beliefs), visits: n === 1 ? visits : [], interest: intr, audience, flaws: fl,
  })
  wireAttacks(args)
  const acc = grounded(args)
  const v = verdict(args, acc)
  const verb = verbaleOf(args, acc)
  // tiene se il fronte pro regge di più e la tavola gli ha insegnato almeno qualcosa
  const kept = v.keep && intr > 0.3
  log(`Dibattito: ${acc.size} argomenti reggono su ${args.length}. Pro ${v.pro.toFixed(2)}, contro ${v.contro.toFixed(2)} → ${kept ? 'la tengo' : 'la butto'}.`)
  const held = args.filter(a => acc.has(a.id)).sort((a, b) => b.weight - a.weight).map(a => a.claim)
  const fell = args.filter(a => !acc.has(a.id)).sort((a, b) => b.weight - a.weight).map(a => a.claim)
  const text = (pag ? `${pag.paragrafo.testo}\n\n` : '') + workText(vctx, intention.why, res.gestures, held, fell)

  // ricorsione
  const crit = evolve(st, r, f, intr)
  reweigh(st, args, acc, kept, intr)
  learnTools(st, res.effects)
  adaptPeak(st, nov, progress)
  st.registers[intention.register] = Math.max(0.2, Math.min(3, (st.registers[intention.register] ?? 1) + (kept ? 0.1 : -0.06)))
  const id = uid()
  st.recentVisual = [...st.recentVisual, { id, features: f, words: vis.words }].slice(-40)
  st.history = [...st.history, { day: st.day, interest: intr, novelty: nov, progress, kept }].slice(-300)
  addText(st.words, text)
  st.beliefs = addBeliefs(st.beliefs, sentences(text).filter(s => !/^(Ha retto|È caduto|Oggi:|Ho |Da )/.test(s) && !/%/.test(s)).map(s => extract(s, 'io')).filter(Boolean) as NonNullable<ReturnType<typeof extract>>[])

  const gestures: Gesture[] = res.gestures
  const work: Work = {
    id, day: st.day, createdAt: new Date().toISOString(), title: ttl, text, intention, mood: st.mood,
    readings: readings.map(x => ({ title: x.title, url: x.url, source: x.source })),
    gestures, visual: vis,
    debate: { args, accepted: [...acc], verdict: kept ? 'tiene' : 'butta', verbale: verb },
    interest: intr, progress, novelty: nov, kept, image: '', tavola: n, ragione,
  }
  const saved = await T.saveWork(work, final.toDataURL('image/png'))
  hooks.onWork?.(saved)
  if (kept) {
    const refl = reflection(vctx, intention.why, held, fell, fl.map(x => x.flaw), st.ricerca?.question)
    const post = publish(st, r, saved, tagWords, refl, fl)
    log(`Pubblicata: ${post.views} visualizzazioni, ${post.likes} like${post.virale ? ' — è andata virale' : ''}.`)
    if (rottura) esitoSferzata(st, saved.id, rottura, intr, post.virale)
  } else if (rottura) {
    esitoSferzata(st, saved.id, rottura, intr, false)
  }
  if (en) registraTesi(st, en, intr, kept)
  log(`Tavola ${n}: interesse ${(intr * 100).toFixed(0)}, novità ${(nov * 100).toFixed(0)}, progresso ${(progress * 100).toFixed(0)}.`)
  const genes = res.genome.length > 16 ? [...res.genome.slice(0, 6), ...res.genome.slice(-10)] : res.genome
  const genome: Genome & { forma?: Forma } = { id: uid(), workId: id, day: st.day, interest: intr, tone: tone.id, ricercaId: st.ricerca?.id, gestures: genes, forma: scena?.forma }
  if (kept && intr > 0.5 && res.genome.length) {
    st.repertorio = [...(st.repertorio ?? []), genome]
      .sort((a, b) => (b.interest - (st.day - b.day) * 0.004) - (a.interest - (st.day - a.day) * 0.004))
      .slice(0, 60)
  }
  getScuola(st)!.registro = [...getScuola(st)!.registro, { day: st.day, features: f, kept, novelty: nov, interest: intr, flaws: fl.map(x => x.flaw), targets: Object.keys(intention.targets).length, tone: tone.id }].slice(-40)
  // archivio degli stili: una tavola per casella, vince la migliore (qualità = interesse senza rumore né difetti)
  if (kept && res.genome.length) {
    const dom = (['punti', 'linee', 'superfici'] as const).reduce((a, k) => (f[k] > f[a] ? k : a), 'superfici' as 'punti' | 'linee' | 'superfici')
    const cell = `${Math.min(3, Math.floor(f.densita * 4))}·${dom}·${f.luminosita > 0.5 ? 'chiara' : 'scura'}`
    const quality = intr * (1 - (f.rumore ?? 0)) * (1 - Math.min(0.6, fl.reduce((a, x) => a + x.severity, 0) * 0.3))
    st.archivio ??= {}
    const prev = st.archivio[cell]
    if (!prev || quality > prev.quality) {
      st.archivio[cell] = { ...genome, quality, cell }
      log(`Archivio degli stili: nuova migliore nella casella ${cell} (${(quality * 100).toFixed(0)}).`)
    }
  }
  if (st.ricerca && !st.ricerca.closed) {
    st.ricerca.workIds.push(id)
    if (kept && held[0]) st.ricerca.findings = [...st.ricerca.findings, held[0]].slice(-12)
  }
  return {
    work: saved,
    genome: res.genome.length ? genome : null,
    bored: [...args.filter(a => acc.has(a.id) && a.voice === 'memoria').map(a => a.claim), ...crit.died.map(c => `il criterio ${c}`)],
    newborn: crit.newborn,
  }
}

export async function loadOrCreate(): Promise<AgentState> {
  const st = await T.getState()
  if (st) {
    // campi aggiunti dopo la prima versione
    st.history ??= []
    st.sites ??= DEFAULT_SITES.slice()
    return st
  }
  const { initialState } = await import('./mind/poetics')
  const fresh = initialState()
  await T.putState(fresh)
  return fresh
}



// ── il reel: un beat suo, la scena smontata, una coreografia che si evolve ──
type ConMovimento = AgentState & { beat?: Gusto; movimento?: { memoria: Coreografia[]; rel: Record<string, Partial<Record<Accoppiamento, number>>>; diario: string[] } }
async function faiReel(st0: AgentState, r: () => number, fogli: Sheet[], info: { rel?: string; interesse: number }[], t: { domanda?: string; conclusione?: string; face: FaceId; parola: string }, log: (m: string) => void): Promise<{ video: Blob; audio: Blob } | null> {
  const st = st0 as ConMovimento
  // le tavole che hanno poco da far vedere (solo testo su un fondo) restano fuori dal reel, se ne restano almeno due
  {
    const TESTI = new Set(['testo', 'tipografia', 'etichette', 'firma', 'piastra'])
    const corpo = (s: Sheet) => s.layers.filter(l => !TESTI.has(l.kind) && l.scale < 0.99).length
    const tieni = fogli.map((f, i) => ({ i, c: corpo(f) })).filter(x => x.c >= 2).map(x => x.i)
    // e quelle povere a vedersi (poco contrasto, pochi bordi) cedono il posto alle più ricche, se ce ne sono abbastanza
    const ricco = (s: Sheet) => { const c = flatten(s, 0.04), d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data, w = c.width; let m = 0, m2 = 0, bordi = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 765; m += l; m2 += l * l; n++; if ((i / 4) % w && Math.abs(l - (d[i - 4] + d[i - 3] + d[i - 2]) / 765) > 0.12) bordi++ } return Math.sqrt(Math.max(0, m2 / n - (m / n) ** 2)) + (bordi / n) * 0.8 }
    const rv = tieni.map(i => ricco(fogli[i])), top = Math.max(...rv, 1e-6)
    const ricche = tieni.filter((_, k) => rv[k] >= top * 0.45)
    if (ricche.length >= 3) tieni.splice(0, tieni.length, ...ricche)
    if (tieni.length >= 2 && tieni.length < fogli.length) { log(`Reel: lascio fuori ${fogli.length - tieni.length} tavole che sono solo parole.`); fogli = tieni.map(i => fogli[i]); info = tieni.map(i => info[i]) }
  }
  const gusto = st.beat ?? (st.beat = { stili: [], pattern: [] })
  const M = st.movimento ?? (st.movimento = { memoria: [], rel: {}, diario: [] })
  // l'orecchio sceglie: tre beat candidati (stili diversi), vince quello che suona meglio; tutti gli stili prendono il loro voto
  // il tempo di lettura di ogni tavola (parole dei suoi testi), e del reel intero: la musica dura quanto serve
  const parole = (s: Sheet) => s.layers.filter(l => l.meta?.text && l.meta.size * (720 / s.W) >= 24).reduce((a, l) => a + (l.meta!.text.split(/\s+/).filter(Boolean).length), 0)
  const legge = (n: number) => (n ? 1 + n * 0.28 : 0) // il ritmo dei sottotitoli
  const scena = smonta(fogli, r)
  void parole
  const lettura = scena.parole.map(legge)
  const forte0 = info.reduce((m, x, i) => (x.interesse > info[m].interesse ? i : m), 0)
  const servono = lettura.slice().sort((a, b) => b - a).slice(0, 4).reduce((a, b) => a + Math.max(b, 2.5), 0) + legge((t.domanda ?? '').split(/\s+/).length) + legge((t.conclusione ?? '').split(/\s+/).length)
  let migliore: { audio: AudioBuffer; brano: Awaited<ReturnType<typeof suonaBeat>>['brano']; voto: number; stile: ReturnType<typeof scegliStile>; orecchio: ReturnType<typeof ascoltaBeat> } | null = null
  for (let k = 0; k < 3; k++) {
    const stile = scegliStile(gusto, r, st.day)
    const b = await suonaBeat(stile, { seme: Math.floor(r() * 1e9), parola: t.parola, secondi: Math.max(15, Math.min(40, servono)), memoria: gusto.pattern })
    const o = ascoltaBeat(b.audio, b.brano.cassa, b.brano.rullante)
    premiaStile(gusto, stile.id, Math.max(0, Math.min(1, (o.voto + 1) / 3)))
    if (!migliore || o.voto > migliore.voto) migliore = { ...b, voto: o.voto, stile, orecchio: o }
  }
  const { audio, brano, stile, orecchio } = migliore!
  gusto.pattern = [...gusto.pattern, brano.pattern].slice(-24)
  const forte = forte0
  // la domanda si legge sulla prima ripresa, la conclusione sulla penultima: le loro tavole devono restare abbastanza
  const lett2 = lettura.slice()
  const ev = evolviCoreografia(scena, brano, forte, info.map(x => x.rel), Math.floor(r() * 1e9), M.memoria, M.rel, lett2)
  // i testi del reel: la domanda all'inizio, la conclusione verso la fine, impaginati dai suoi generatori, senza aloni
  const testi: { t0: number; t1: number; cv: HTMLCanvasElement }[] = []
  const palette = (s: Sheet) => { const c = flatten(s, 0.05), g = c.getContext('2d')!, d = g.getImageData(0, 0, c.width, c.height).data, out: string[] = []; for (let i = 0; i < d.length; i += 4 * 37) out.push('#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('')); return out }
  const bar = brano.beat * 4
  const conImg = async (tav: number, s: string, t0: number, t1: number) => { const f = flatten(fogli[tav], 0.5); const p = palette(fogli[tav]); const { cv } = await testoGrafico(f, s, { face: t.face, lettura: 'corsivo', colori: p.slice(0, 5), bg: fogli[tav].bg }, r, ['blocco', 'colonna', 'divaricato', 'verticale']); testi.push({ t0, t1, cv }) }
  // niente testi sovrapposti: le parole del reel sono quelle delle tavole, al loro posto, nel loro carattere (la domanda va nella didascalia)
  void conImg
  let copertinaMs = 0
  const video = await giraCoreografia({ scena, brano, coreografia: ev.coreografia, riprese: ev.riprese, testi, copertina: ms => { copertinaMs = ms } })
  if (!video) { log('Il reel non si può fare in questo browser (manca la codifica video).'); return null }
  // memoria del movimento: la coreografia scelta, e gli accoppiamenti che hanno funzionato si rafforzano
  M.memoria = [...M.memoria, ev.coreografia].slice(-20)
  for (const [rel, a] of Object.entries(ev.coreografia.accoppia)) { const x = M.rel[rel] ?? (M.rel[rel] = {}); x[a] = (x[a] ?? 0) * 0.9 + Math.max(0, ev.voto) * 0.1 }
  void stile
  const descr = descriviCoreografia(ev.coreografia)
  M.diario = [...M.diario, descr].slice(-30)
  log(`Reel: beat ${brano.descr} (orecchio: punch cassa ${orecchio.punchCassa.toFixed(1)} dB, rullante ${orecchio.punchRullante.toFixed(1)} dB, baricentro ${Math.round(orecchio.baricentro)} Hz); ${descr}. Copertina a ${(copertinaMs / 1000).toFixed(1)} s. ${(video.size / 1e6).toFixed(1)} MB.`)
  ;(st as ConMovimento & { copertine?: Record<string, number> }).copertine = { ...((st as ConMovimento & { copertine?: Record<string, number> }).copertine ?? {}), ultima: copertinaMs }
  return { video, audio: wav(audio) }
}
