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
import type { AgentState, Gesture, NotebookEntry, Reading, Work } from './core/types'
import { rng, pick, weighted, uid } from './core/rng'
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

const API = '/api/studio-agent'

export interface DayHooks {
  log: (msg: string) => void
  preview?: (c: HTMLCanvasElement) => void
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json() as Promise<T>
}

type Raw = { url: string; source: string; title: string; text: string; kind: Reading['kind'] }
const toReading = (x: Raw): Reading => ({ ...x, id: uid(), fetchedAt: new Date().toISOString() })

async function gather(st: AgentState, r: () => number, thread: string | null, log: DayHooks['log']): Promise<Reading[]> {
  const jobs: Promise<Raw[]>[] = []
  if (thread) jobs.push(api<Raw[]>(`/read?mode=cerca&n=2&q=${encodeURIComponent(thread)}`).catch(() => []))
  const feeds = st.feeds.length ? st.feeds : ['wiki:casuale']
  const nFeeds = 1 + Math.floor(r() * 2)
  for (let i = 0; i < nFeeds; i++) {
    const f = pick(r, feeds)
    if (f === 'wiki:casuale') jobs.push(api<Raw[]>('/read?mode=casuale').catch(() => []))
    else if (f === 'wiki:vetrina') jobs.push(api<Raw[]>('/read?mode=vetrina').catch(() => []))
    else if (f.startsWith('pagina:')) jobs.push(api<Raw[]>(`/read?mode=pagina&url=${encodeURIComponent(f.slice(7))}`).catch(() => []))
    else jobs.push(api<Raw[]>(`/read?mode=rss&n=2&url=${encodeURIComponent(f)}`).catch(() => []))
  }
  const got = (await Promise.all(jobs)).flat().filter(x => x && x.text && x.text.length > 120)
  // biblioteca: a volte rilegge un pezzo dei testi messi in studio
  if (r() < 0.4) {
    const lib = await api<{ name: string; text: string }[]>('/library').catch(() => [])
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

export async function runDay(input: AgentState, hooks: DayHooks): Promise<{ state: AgentState; work: Work }> {
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
  addTags(await api<Record<string, string>>('/pos', { method: 'POST', body: JSON.stringify({ words: vocab }) }).catch(() => ({})))
  const fresh = sent.map(x => extract(x.s, x.src)).filter(Boolean) as NonNullable<ReturnType<typeof extract>>[]
  st.beliefs = addBeliefs(st.beliefs, fresh)
  log(`Ho estratto ${fresh.length} affermazioni dalle letture.`)

  // mappa del sapere: cerca le definizioni di ciò che non conosce, e scende di un livello
  const df = freqOf(st.words)
  const salientToday = [...new Set(readings.flatMap(rd => salient(rd.text, df, st.words.docs, 10)))]
  const look = [...toLookUp(st, salientToday, 6), ...frontier(st, 5)]
  for (const w of look) {
    const d = await api<{ definition: string | null }>(`/define?w=${encodeURIComponent(w)}`).catch(() => ({ definition: null }))
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
  const intention = chooseIntention(st, r, E, salientToday, readings[0]?.title ?? '')
  log(`Intenzione: "${intention.word}", tono ${intention.register}. Perché: ${intention.why}.`)

  // 4 · generare e intervenire
  const tone = weighted(r, TONES, t => (st.mood === 'cupo' || st.mood === 'inquieto') === t.dark ? 2 : 1, st.temperature)
  const near = neighbors(E, intention.word, 12).map(n => n.word)
  const ownTexts = st.notebook.slice(-6).flatMap(n => n.verbale).slice(-40)
  const vctx: VoiceCtx = { r, register: intention.register, word: intention.word, near, readings: readings.length ? readings : st.readings.slice(-4), ownTexts, day: st.day }
  for (const s of st.shaders.filter(x => !x.code)) {
    const res = await api<{ code: string | null }>('/shader', { method: 'POST', body: JSON.stringify({ url: s.url }) }).catch(() => ({ code: null }))
    if (res.code) { s.code = res.code; log(`Ho raccolto uno shader: ${s.url}`) }
  }
  const tctx: ToolCtx = { r, tone, intention, mood: st.mood, say: () => inscription(vctx), shaders: st.shaders, quality: 0.5 }
  const steps = { curioso: 22, annoiato: 26, inquieto: 30, giocoso: 24, cupo: 16, calmo: 18 }[st.mood]
  const start = emptySheet(800, 1000, tone.bg)
  const res = await runStudio(st, r, start, intention, tctx, steps, (s, g) => {
    log(`${g.kept ? '✓' : '✗'} ${g.tool} (${g.delta >= 0 ? '+' : ''}${g.delta})`)
    hooks.preview?.(flatten(s, 0.5))
  })

  // 5 · guardare l'opera finita
  const final = flatten(res.sheet, 2)
  const R = rasterize(final)
  const f = measure(R)
  const ps = patches(R)
  if (!st.codebook.length) { const s = seedCodebook(ps, r); st.codebook = s.cb; st.codebookCounts = s.counts }
  const wordsBefore = histogram(st.codebook, ps)
  const nov = noveltyOf(st, f, wordsBefore)
  const rawProgress = learn(st.codebook, st.codebookCounts, ps)
  const progress = Math.min(1, rawProgress * 5)
  const intr = interestOf(st, nov, progress)
  const vis = { features: f, words: histogram(st.codebook, ps), palette: palette(R) }
  vctx.features = f
  const ttl = makeTitle(vctx)
  log(`Titolo: ${ttl || '(nessuno)'}`)

  // 6 · dibattito
  const contr = contradictions(st.beliefs)
  const args = speak({
    st, f, novelty: nov, intention, title: ttl, toolsUsed: res.gestures.filter(g => g.kept).map(g => g.tool),
    readingsTitles: readings.map(x => x.title), contradictions: contr, visits,
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

  // 7 · ricorsione
  const crit = evolve(st, r, f, intr)
  reweigh(st, args, acc, kept, intr)
  learnTools(st, res.effects)
  adaptPeak(st, nov, progress)
  st.registers[intention.register] = Math.max(0.2, Math.min(3, (st.registers[intention.register] ?? 1) + (kept ? 0.1 : -0.06)))
  const id = uid()
  st.recentVisual = [...st.recentVisual, { id, features: f, words: vis.words }].slice(-40)
  st.history = [...st.history, { day: st.day, interest: intr, novelty: nov, progress, kept }].slice(-200)
  // anche ciò che scrive diventa materia di logica e di parole
  addText(st.words, text)
  st.beliefs = addBeliefs(st.beliefs, sentences(text).map(s => extract(s, 'io')).filter(Boolean) as NonNullable<ReturnType<typeof extract>>[])

  const used = new Set(res.gestures.map(g => g.tool))
  const neverUsed = ['semina', 'materia', 'luce', 'geometria', 'pattern', 'traccia', 'scrivi', 'grana', 'taglia', 'ripeti', 'disponi', 'togli', 'fondo', 'shader']
    .filter(t => !st.tools[t] && !used.has(t))
  const entry: NotebookEntry = {
    day: st.day, date: new Date().toISOString(), intention: `${intention.word} — ${intention.why}`,
    done: res.gestures.filter(g => g.kept).map(g => g.tool),
    verbale: verb,
    wants: [
      ...(neverUsed.length ? [`provare ${pick(r, neverUsed)}`] : []),
      ...st.questions.filter(q => !q.closed).slice(0, 1).map(q => q.text),
      ...crit.newborn.map(c => `cercare ${c}`),
    ],
    bored: [
      ...args.filter(a => acc.has(a.id) && a.voice === 'memoria').map(a => a.claim),
      ...crit.died.map(c => `il criterio ${c}`),
    ],
    workId: id,
  }
  st.notebook = [...st.notebook, entry].slice(-120)
  st.readings = [...st.readings, ...readings.map(x => ({ ...x, text: x.text.slice(0, 4000) }))].slice(-60)
  for (const vv of st.visits) if (!vv.read) vv.read = true
  if (st.day % 7 === 0 || st.poetics.length === 1) {
    st.poetics.push({ day: st.day, date: new Date().toISOString(), text: rewritePoetics(st) })
    log('Ho riscritto la mia poetica.')
  }
  st.lastRun = new Date().toISOString()

  const gestures: Gesture[] = res.gestures
  const work: Work = {
    id, day: st.day, createdAt: new Date().toISOString(), title: ttl, text, intention, mood: st.mood,
    readings: readings.map(x => ({ title: x.title, url: x.url, source: x.source })),
    gestures, visual: vis,
    debate: { args, accepted: [...acc], verdict: kept ? 'tiene' : 'butta', verbale: verb },
    interest: intr, progress, novelty: nov, kept, image: '',
  }
  const saved = await api<Work>('/works', { method: 'POST', body: JSON.stringify({ work, png: final.toDataURL('image/png') }) })
  await api('/state', { method: 'PUT', body: JSON.stringify(st) })
  log(`Fatto. Interesse ${(intr * 100).toFixed(0)}, novità ${(nov * 100).toFixed(0)}, progresso ${(progress * 100).toFixed(0)}.`)
  return { state: st, work: saved }
}

export async function loadOrCreate(): Promise<AgentState> {
  const st = await api<AgentState | null>('/state')
  if (st) {
    // campi aggiunti dopo la prima versione
    st.history ??= []
    return st
  }
  const { initialState } = await import('./mind/poetics')
  const fresh = initialState()
  await api('/state', { method: 'PUT', body: JSON.stringify(fresh) })
  return fresh
}

