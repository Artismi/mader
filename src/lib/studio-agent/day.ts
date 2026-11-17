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
import { TONES } from '@/components/studio/genera/recipes'
import { emptySheet, flatten } from './hands/sheet'
import type { ToolCtx } from './hands/tools'
import { measure, rasterize, palette } from './eyes/measure'
import { histogram, learn, patches, seedCodebook } from './eyes/visual-words'
import { addText, embed, freqOf, neighbors, similarity, type Embedding } from './reader/wordspace'
import { salient, sentences, words } from './reader/tokenize'
import { addTags } from './reader/analysis'
import { addBeliefs, contradictions, extract } from './reader/logic'
import { frontier, ground, setDefinition, toLookUp } from './reader/lexicon'
import { MOOD_TEMPERATURE, chooseIntention, moodOf } from './mind/intention'
import { learnTools, replay, runStudio } from './mind/studio'
import { computeThemes, openRicerca, ricercaFinished, stepRicerca } from './mind/ricerca'
import { evolve } from './mind/criteria'
import { adaptPeak, interest as interestOf, novelty as noveltyOf } from './mind/taste'
import { reweigh, speak, verbale as verbaleOf } from './mind/voices'
import { grounded, verdict, wireAttacks } from './mind/argue'
import { DEFAULT_SITES, chooseName, newQuestion, rewritePoetics } from './mind/poetics'
import { inscription, reflection, title as makeTitle, workText, type VoiceCtx } from './voice/writer'
import { ensureVetrina, predict, publish, replyToComments } from './mind/vetrina'
import { flaws, readability } from './eyes/judgement'


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

async function gather(st: AgentState, r: () => number, thread: string | null, E: Embedding | null, log: DayHooks['log']): Promise<Reading[]> {
  const got: T.Raw[] = []
  const seen = new Set(st.readings.map(x => x.url))
  // 1. cerca la parola del giorno
  if (thread) got.push(...await T.read(`mode=cerca&n=2&q=${encodeURIComponent(thread)}`))
  // 2. segue un link letto nei giorni prima, il più vicino alla parola del giorno
  const sites = st.sites ?? DEFAULT_SITES
  const poolHosts = new Set(sites.map(u => { try { return new URL(u).host } catch { return '' } }))
  const queue = (st.linkQueue ?? []).filter(t => !/^https?:/.test(t) || st.liberta || poolHosts.has(new URL(t).host))
  if (queue.length) {
    const key = (t: string) => /^https?:/.test(t) ? decodeURIComponent(new URL(t).pathname).split(/[\/\-_]/).filter(Boolean).pop() ?? '' : t.toLowerCase().split(' ')[0]
    const scored = queue.map(t => ({ t, s: (thread && E ? similarity(E, thread, key(t)) : 0) + (thread && t.toLowerCase().includes(thread) ? 0.5 : 0) + r() * 0.3 }))
    const link = scored.sort((a, b) => b.s - a.s)[0].t
    st.linkQueue = (st.linkQueue ?? []).filter(t => t !== link)
    log(`Seguo un link: ${link}`)
    got.push(...await T.read(/^https?:/.test(link) ? `mode=pagina&url=${encodeURIComponent(link)}` : `mode=voce&t=${encodeURIComponent(link)}`))
  }
  // 3. esplora uno dei siti scelti (o una fonte delle impostazioni)
  if (sites.length && r() < 0.65) {
    const site = pick(r, sites)
    log(`Esploro ${new URL(site).host}${thread ? ` cercando "${thread}"` : ''}.`)
    got.push(...await T.esplora(site, thread ?? '', [...seen].filter(u => u.includes(new URL(site).host)).slice(-200)))
  } else {
    const feeds = st.feeds.length ? st.feeds : ['wiki:casuale']
    const f = pick(r, feeds)
    if (f === 'wiki:casuale') got.push(...await T.read('mode=casuale'))
    else if (f === 'wiki:vetrina') got.push(...await T.read('mode=vetrina'))
    else if (f.startsWith('pagina:')) got.push(...await T.read(`mode=pagina&url=${encodeURIComponent(f.slice(7))}`))
    else got.push(...await T.read(`mode=rss&n=2&url=${encodeURIComponent(f)}`))
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
  const { replies, advice } = replyToComments(st, r, st.name)
  for (const rp of replies) log(`Rispondo ${rp}`)

  // 2 · ricerca in corso (struttura su più giorni) e parola del giorno
  const E0 = st.words.docs > 3 ? embed(st.words, 1200, 24, st.seed) : null
  if (E0 && (!st.themes?.length || st.day % 7 === 0)) st.themes = computeThemes(E0, freqOf(st.words), 10, r)
  if (!st.ricerca || st.ricerca.closed) {
    st.ricerca = openRicerca(st, r)
    if (st.ricerca) log(`Apro una ricerca su "${st.ricerca.word}" (${st.ricerca.words.join(', ')}), per ${st.ricerca.length} giorni. ${st.ricerca.question}`)
  }
  const step = st.ricerca ? stepRicerca(st.ricerca, st.day) : null
  if (st.ricerca && step) { st.ricerca.phase = step.phase; log(`Ricerca "${st.ricerca.word}", fase: ${step.phase}.`) }
  const openQ = st.questions.filter(q => !q.closed).sort((a, b) => a.visits - b.visits)
  const voids = Object.values(st.lexicon).filter(e => e.state === 'a_vuoto').map(e => e.word)
  const thread = step?.word ?? openQ[0]?.word ?? (voids.length ? pick(r, voids) : null)
  if (thread) log(`Seguo un filo: "${thread}".`)
  const readings = await gather(st, r, thread, E0, log)
  if (!readings.length) log('Non sono riuscito a leggere niente: lavoro con quello che ho.')
  for (const rd of readings) if (rd.kind !== 'rilettura') addText(st.words, rd.text)

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
  const intention: Intention = chooseIntention(st, r, E, salientToday, readings[0]?.title ?? '', step?.word)
  if (st.ricerca && step) intention.why += `; ricerca "${st.ricerca.word}" (${step.phase}): ${st.ricerca.question}`
  for (const a of advice) { intention.targets[a.feature] = a.target; log(`Tengo conto di un commento (${a.reason}): ${a.feature} verso ${a.target}.`) }
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
  for (let n = 1; n <= MAX_TAVOLE; n++) {
    const out = await tavola(st, r, cur, n, ragione, readings, near, ownTexts, visits, hooks, parent, step?.phase)
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
  if (!rep.length) return null
  const mine = rep.filter(g => g.ricercaId && g.ricercaId === st.ricerca?.id)
  if ((phase === 'approfondire' || phase === 'sintesi') && mine.length) return weighted(r, mine, g => g.interest, 0.6)
  const p = st.mood === 'annoiato' || st.mood === 'inquieto' ? 0.15 : 0.35
  return r() < p ? weighted(r, rep, g => g.interest, st.temperature) : null
}

/** variazione in serie: stessi temi, bersagli spostati verso ciò che ha funzionato e un po' oltre */
function vary(it: Intention, r: () => number, f: Record<string, number>): Intention {
  const targets: Record<string, number> = {}
  for (const [k, v] of Object.entries(it.targets)) targets[k] = Math.max(0.02, Math.min(0.98, (f[k] ?? v) + (r() - 0.5) * 0.3))
  return { ...it, targets, why: it.why.split('; serie')[0] + '; serie: varia la tavola precedente' }
}

async function tavola(
  st: AgentState, r: () => number, intention: Intention, n: number, ragione: Work['ragione'],
  readings: Reading[], near: string[], ownTexts: string[], visits: Visit[], hooks: DayHooks,
  parent: Genome | null, phase?: Ricerca['phase'],
): Promise<{ work: Work; bored: string[]; newborn: string[]; genome: Genome | null }> {
  const log = hooks.log
  const fast = !!hooks.fast
  const tone = weighted(r, TONES, t => (st.mood === 'cupo' || st.mood === 'inquieto') === t.dark ? 2 : 1, st.temperature)
  const vctx: VoiceCtx = { r, register: intention.register, word: intention.word, near, readings: readings.length ? readings : st.readings.slice(-4), ownTexts, day: st.day }
  const tctx: ToolCtx = { r, tone, intention, mood: st.mood, say: () => inscription(vctx), shaders: st.shaders, quality: fast ? 0.35 : 0.5 }
  const base = { curioso: 22, annoiato: 26, inquieto: 30, giocoso: 24, cupo: 16, calmo: 18 }[st.mood]
  const steps = Math.round(base * (fast ? 0.6 : 1))
  log(`— Tavola ${n} (${ragione}), tono ${tone.label}.`)
  // da un genoma riuscito (variato) o da zero
  let start = emptySheet(800, 1000, tone.bg)
  let pre: { gestures: Gesture[]; genome: { tool: string; params: Record<string, unknown> }[] } = { gestures: [], genome: [] }
  if (parent) {
    const amount = phase === 'sintesi' ? 0.25 : ragione === 'serie' ? 0.4 : 0.6
    const rp = await replay(st, r, start, parent.gestures, tctx, amount)
    start = rp.sheet; pre = rp
    log(`Rifatti ${rp.gestures.length} gesti dal genoma (variazione ${Math.round(amount * 100)}%).`)
  }
  const res0 = await runStudio(st, r, start, intention, tctx, parent ? Math.ceil(steps * 0.5) : steps, (s, g) => {
    log(`${g.kept ? '✓' : '✗'} ${g.tool} (${g.delta >= 0 ? '+' : ''}${g.delta})`)
    if (!fast) hooks.preview?.(flatten(s, 0.5))
  })
  const res = { ...res0, gestures: [...pre.gestures, ...res0.gestures], genome: [...pre.genome, ...res0.genome] }
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
  if (kept) {
    const refl = reflection(vctx, intention.why, held, fell, fl.map(x => x.flaw), st.ricerca?.question)
    const post = publish(st, r, saved, tagWords, refl, fl, read.texts)
    log(`Pubblico: ${post.views} visualizzazioni, ${post.likes} like, ${post.comments.length} commenti.`)
  }
  log(`Tavola ${n}: interesse ${(intr * 100).toFixed(0)}, novità ${(nov * 100).toFixed(0)}, progresso ${(progress * 100).toFixed(0)}.`)
  const genes = res.genome.length > 16 ? [...res.genome.slice(0, 6), ...res.genome.slice(-10)] : res.genome
  const genome: Genome = { id: uid(), workId: id, day: st.day, interest: intr, tone: tone.id, ricercaId: st.ricerca?.id, gestures: genes }
  if (kept && intr > 0.5 && res.genome.length) {
    st.repertorio = [...(st.repertorio ?? []), genome]
      .sort((a, b) => (b.interest - (st.day - b.day) * 0.004) - (a.interest - (st.day - a.day) * 0.004))
      .slice(0, 60)
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

