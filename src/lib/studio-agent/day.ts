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
import type { AgentState, Gesture, Intention, NotebookEntry, Reading, Visit, Work } from './core/types'
import { rng, pick, weighted, uid } from './core/rng'
import * as T from './transport'
import { TONES } from '@/components/studio/genera/recipes'
import { emptySheet, flatten } from './hands/sheet'
import type { ToolCtx } from './hands/tools'
import { measure, rasterize, palette } from './eyes/measure'
import { histogram, learn, patches, seedCodebook } from './eyes/visual-words'
import { addText, embed, freqOf, neighbors } from './reader/wordspace'
import { salient, sentences, words } from './reader/tokenize'
import { addTags } from './reader/analysis'
import { addBeliefs, contradictions, extract } from './reader/logic'
import { frontier, ground, setDefinition, toLookUp } from './reader/lexicon'
import { MOOD_TEMPERATURE, chooseIntention, moodOf } from './mind/intention'
import { learnTools, runStudio } from './mind/studio'
import { evolve } from './mind/criteria'
import { adaptPeak, interest as interestOf, novelty as noveltyOf } from './mind/taste'
import { reweigh, speak, verbale as verbaleOf } from './mind/voices'
import { grounded, verdict, wireAttacks } from './mind/argue'
import { chooseName, newQuestion, rewritePoetics } from './mind/poetics'
import { inscription, title as makeTitle, workText, type VoiceCtx } from './voice/writer'


export interface DayHooks {
  log: (msg: string) => void
  preview?: (c: HTMLCanvasElement) => void
  /** chiamato a ogni tavola salvata, per aggiornare la galleria in diretta */
  onWork?: (w: Work) => void
  /** modalità veloce: meno gesti, ricette più leggere, opere a 800×1000, niente anteprima a ogni gesto */
  fast?: boolean
  /** interrompere dopo la tavola in corso */
  shouldStop?: () => boolean
}

const toReading = (x: T.Raw): Reading => ({ ...x, id: uid(), fetchedAt: new Date().toISOString() })

async function gather(st: AgentState, r: () => number, thread: string | null, log: DayHooks['log']): Promise<Reading[]> {
  const jobs: Promise<T.Raw[]>[] = []
  if (thread) jobs.push(T.read(`mode=cerca&n=2&q=${encodeURIComponent(thread)}`))
  const feeds = st.feeds.length ? st.feeds : ['wiki:casuale']
  const nFeeds = 1 + Math.floor(r() * 2)
  for (let i = 0; i < nFeeds; i++) {
    const f = pick(r, feeds)
    if (f === 'wiki:casuale') jobs.push(T.read('mode=casuale'))
    else if (f === 'wiki:vetrina') jobs.push(T.read('mode=vetrina'))
    else if (f.startsWith('pagina:')) jobs.push(T.read(`mode=pagina&url=${encodeURIComponent(f.slice(7))}`))
    else jobs.push(T.read(`mode=rss&n=2&url=${encodeURIComponent(f)}`))
  }
  const got = (await Promise.all(jobs)).flat().filter(x => x && x.text && x.text.length > 120)
  // biblioteca: a volte rilegge un pezzo dei testi messi in studio
  if (r() < 0.4) {
    const lib = await T.library()
    if (lib.length) {
      const b = pick(r, lib)
      const paras = b.text.split(/\n\s*\n/).filter(p => p.length > 200)
      const start = Math.floor(r() * Math.max(1, paras.length - 4))
      got.push({ url: `biblioteca/${b.name}`, source: 'biblioteca', title: b.name.replace(/\.(md|txt)$/i, ''), text: paras.slice(start, start + 5).join('\n\n'), kind: 'biblioteca' })
    }
  }
  const seen = new Set(st.readings.map(x => x.url))
  const fresh = got.filter(x => !seen.has(x.url)).slice(0, 6).map(toReading)
  for (const x of fresh) log(`Leggo: ${x.title} (${x.source})`)
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

  // 2 · leggere
  const openQ = st.questions.filter(q => !q.closed).sort((a, b) => a.visits - b.visits)
  const voids = Object.values(st.lexicon).filter(e => e.state === 'a_vuoto').map(e => e.word)
  const thread = openQ[0]?.word ?? (voids.length ? pick(r, voids) : null)
  if (thread) log(`Seguo un filo: "${thread}".`)
  const readings = await gather(st, r, thread, log)
  if (!readings.length) log('Non sono riuscito a leggere niente di nuovo: lavoro con quello che ho.')
  for (const rd of readings) addText(st.words, rd.text)

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
  const look = [...toLookUp(st, salientToday, hooks.fast ? 3 : 6), ...frontier(st, hooks.fast ? 2 : 5)]
  for (const w of look) {
    const d = await T.define(w)
    setDefinition(st, w, d.definition, st.day)
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
  const intention: Intention = chooseIntention(st, r, E, salientToday, readings[0]?.title ?? '')
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
  for (let n = 1; n <= MAX_TAVOLE; n++) {
    const out = await tavola(st, r, cur, n, ragione, readings, near, ownTexts, visits, hooks)
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
  st.lastRun = new Date().toISOString()
  await T.putState(st)
  return { state: st, works }
}

const MAX_TAVOLE = 3

/** variazione in serie: stessi temi, bersagli spostati verso ciò che ha funzionato e un po' oltre */
function vary(it: Intention, r: () => number, f: Record<string, number>): Intention {
  const targets: Record<string, number> = {}
  for (const [k, v] of Object.entries(it.targets)) targets[k] = Math.max(0.02, Math.min(0.98, (f[k] ?? v) + (r() - 0.5) * 0.3))
  return { ...it, targets, why: it.why.split('; serie')[0] + '; serie: varia la tavola precedente' }
}

async function tavola(
  st: AgentState, r: () => number, intention: Intention, n: number, ragione: Work['ragione'],
  readings: Reading[], near: string[], ownTexts: string[], visits: Visit[], hooks: DayHooks,
): Promise<{ work: Work; bored: string[]; newborn: string[] }> {
  const log = hooks.log
  const fast = !!hooks.fast
  const tone = weighted(r, TONES, t => (st.mood === 'cupo' || st.mood === 'inquieto') === t.dark ? 2 : 1, st.temperature)
  const vctx: VoiceCtx = { r, register: intention.register, word: intention.word, near, readings: readings.length ? readings : st.readings.slice(-4), ownTexts, day: st.day }
  const tctx: ToolCtx = { r, tone, intention, mood: st.mood, say: () => inscription(vctx), shaders: st.shaders, quality: fast ? 0.35 : 0.5 }
  const base = { curioso: 22, annoiato: 26, inquieto: 30, giocoso: 24, cupo: 16, calmo: 18 }[st.mood]
  const steps = Math.round(base * (fast ? 0.6 : 1))
  log(`— Tavola ${n} (${ragione}), tono ${tone.label}.`)
  const res = await runStudio(st, r, emptySheet(800, 1000, tone.bg), intention, tctx, steps, (s, g) => {
    log(`${g.kept ? '✓' : '✗'} ${g.tool} (${g.delta >= 0 ? '+' : ''}${g.delta})`)
    if (!fast) hooks.preview?.(flatten(s, 0.5))
  })
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
  const ttl = makeTitle(vctx)
  log(`Titolo: ${ttl || '(nessuno)'}`)

  // dibattito
  const args = speak({
    st, f, novelty: nov, intention, title: ttl, toolsUsed: res.gestures.filter(g => g.kept).map(g => g.tool),
    readingsTitles: readings.map(x => x.title), contradictions: contradictions(st.beliefs), visits: n === 1 ? visits : [],
  })
  wireAttacks(args)
  const acc = grounded(args)
  const v = verdict(args, acc)
  const verb = verbaleOf(args, acc)
  const kept = v.keep
  log(`Dibattito: ${acc.size} argomenti reggono su ${args.length}. Pro ${v.pro.toFixed(2)}, contro ${v.contro.toFixed(2)} → ${kept ? 'la tengo' : 'la butto'}.`)
  const held = args.filter(a => acc.has(a.id)).sort((a, b) => b.weight - a.weight).map(a => a.claim)
  const fell = args.filter(a => !acc.has(a.id)).sort((a, b) => b.weight - a.weight).map(a => a.claim)
  const text = workText(vctx, intention.why, res.gestures, held, fell)

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
  st.beliefs = addBeliefs(st.beliefs, sentences(text).map(s => extract(s, 'io')).filter(Boolean) as NonNullable<ReturnType<typeof extract>>[])

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
  log(`Tavola ${n}: interesse ${(intr * 100).toFixed(0)}, novità ${(nov * 100).toFixed(0)}, progresso ${(progress * 100).toFixed(0)}.`)
  return {
    work: saved,
    bored: [...args.filter(a => acc.has(a.id) && a.voice === 'memoria').map(a => a.claim), ...crit.died.map(c => `il criterio ${c}`)],
    newborn: crit.newborn,
  }
}

export async function loadOrCreate(): Promise<AgentState> {
  const st = await T.getState()
  if (st) {
    // campi aggiunti dopo la prima versione
    st.history ??= []
    return st
  }
  const { initialState } = await import('./mind/poetics')
  const fresh = initialState()
  await T.putState(fresh)
  return fresh
}

