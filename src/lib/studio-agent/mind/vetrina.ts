/**
 * Vetrina: un social finto, solo numeri. L'artista pubblica le tavole che tiene
 * con la sua nota; il pubblico (follower con gusti e sensibilità ai difetti)
 * guarda e mette like. Le visualizzazioni hanno una coda lunga: quasi sempre
 * poche, ogni tanto una tavola esce dalla bolla e va virale, e porta gente
 * nuova. Niente commenti: l'artista legge solo i numeri, e decide lui quanto
 * contano (il peso della voce "pubblico").
 */
import type { AgentState, Features, Work } from '../core/types'
import { range, uid, type Rnd } from '../core/rng'
import type { Flaw } from '../eyes/judgement'

export interface Follower {
  id: string
  taste: { feature: string; target: number; weight: number }[]
  words: string[]
  loyalty: number
  touchy: Partial<Record<Flaw, number>>
  since: number
  seen: number[]
}

export interface Post {
  workId: string; day: number; title: string; caption: string; reflection: string
  views: number; likes: number; virale: boolean; image?: string
  /** carosello: le tavole dell'episodio, in ordine */
  carosello?: string[]
  flaws: { flaw: Flaw; severity: number }[]
}
export interface Vetrina { followers: Follower[]; posts: Post[]; left: number; joined: number; virali: number }

const TASTE_FEATURES = ['luminosita', 'contrasto', 'densita', 'vuoto', 'saturazione', 'simmetria', 'squilibrio', 'complessita', 'linee', 'superfici', 'punti', 'diagonali', 'forma']
const FLAWS: Flaw[] = ['vuota', 'illeggibile', 'pattern a caso', 'non dice niente', 'sbilanciata', 'pasticcio']

function newFollower(r: Rnd, day: number, like?: Features, words: string[] = []): Follower {
  const feats = [...TASTE_FEATURES].sort(() => r() - 0.5).slice(0, 3 + Math.floor(r() * 3))
  return {
    id: uid(), since: day, seen: [], loyalty: r(),
    taste: feats.map(f => ({ feature: f, target: like ? Math.max(0, Math.min(1, (like[f] ?? 0.5) + (r() - 0.5) * 0.2)) : r(), weight: range(r, 0.3, 1) })),
    words: words.slice(0, 4),
    touchy: Object.fromEntries(FLAWS.map(fl => [fl, range(r, 0.2, 1)])),
  }
}

type WithV = AgentState & { vetrina?: Vetrina }
export const getVetrina = (st: AgentState) => (st as WithV).vetrina

export function ensureVetrina(st: AgentState, r: Rnd): Vetrina {
  const v = (st as WithV).vetrina as (Vetrina & { advice?: unknown }) | undefined
  if (v) {
    v.virali ??= 0
    delete v.advice
    // dalle versioni con i commenti: si alleggerisce
    for (const p of v.posts as (Post & { comments?: unknown })[]) { delete p.comments; p.virale ??= false }
    return v
  }
  const fresh: Vetrina = { followers: Array.from({ length: 30 }, () => newFollower(r, st.day)), posts: [], left: 0, joined: 0, virali: 0 }
  ;(st as WithV).vetrina = fresh
  return fresh
}

export function appreciation(fl: Follower, f: Features, words: string[], novelty: number, fl_: { flaw: Flaw; severity: number }[]) {
  const tot = fl.taste.reduce((a, t) => a + t.weight, 0) || 1
  const taste = fl.taste.reduce((a, t) => a + t.weight * (1 - Math.min(1, Math.abs((f[t.feature] ?? 0) - t.target) * 2)), 0) / tot
  const topic = fl.words.length ? fl.words.filter(w => words.includes(w)).length / fl.words.length : 0
  const nov = fl.loyalty > 0.5 ? 1 - novelty : novelty
  const hurt = fl_.reduce((a, x) => a + x.severity * (fl.touchy[x.flaw] ?? 0.5), 0)
  return 0.6 * taste + 0.25 * topic + 0.15 * nov - 0.22 * hurt
}

/** prima di pubblicare: quanti la apprezzerebbero */
export function predict(st: AgentState, f: Features, words: string[], novelty: number, fl_: { flaw: Flaw; severity: number }[]) {
  const v = getVetrina(st)
  if (!v?.followers.length) return null
  const liked = v.followers.filter(x => appreciation(x, f, words, novelty, fl_) > 0.55).length
  return { liked, total: v.followers.length }
}

/** pubblica: like dai follower, poi la coda lunga delle visualizzazioni (a volte virale) */
export function publish(st: AgentState, r: Rnd, w: Work, words: string[], reflection: string, fl_: { flaw: Flaw; severity: number }[]): Post {
  const v = ensureVetrina(st, r)
  const tags = [...new Set(words)].slice(0, 4).map(x => '#' + x).join(' ')
  const post: Post = { workId: w.id, day: w.day, title: w.title, caption: `${w.title || 'Senza titolo'}\n${tags}`, reflection, views: 0, likes: 0, virale: false, image: w.image, flaws: fl_ }
  let sum = 0
  for (const fl of v.followers) {
    if (r() < 0.2) continue
    post.views++
    const a = appreciation(fl, w.visual.features, words, w.novelty, fl_) + (r() - 0.5) * 0.1
    fl.seen = [...fl.seen, a].slice(-6)
    sum += a
    if (a > 0.55) post.likes++
  }
  // la bolla: chi mette like condivide; se il tasso è alto e il caso aiuta, si esce dalla bolla
  const rate = post.likes / Math.max(1, post.views)
  const spinta = Math.exp((rate - 0.35) * 6) * (0.5 + r())
  const esterni = Math.floor(post.views * spinta * (r() < 0.08 * spinta ? range(r, 8, 60) : range(r, 0.3, 2)))
  post.views += esterni
  post.likes += Math.floor(esterni * rate * range(r, 0.3, 0.9))
  post.virale = esterni > Math.max(200, v.followers.length * 5)
  if (post.virale) v.virali++
  // chi si annoia se ne va, una parte di chi è passato resta
  const before = v.followers.length
  v.followers = v.followers.filter(fl => fl.seen.length < 5 || fl.seen.reduce((a, b) => a + b, 0) / fl.seen.length > 0.38)
  v.left += before - v.followers.length
  const arrivals = Math.min(400, Math.floor(esterni * rate * range(r, 0.02, 0.08)))
  for (let i = 0; i < arrivals; i++) v.followers.push(newFollower(r, st.day, w.visual.features, words))
  v.joined += arrivals
  if (v.followers.length > 1500) v.followers = v.followers.slice(-1500)
  v.posts = [post, ...v.posts].slice(0, 400)
  void sum
  return post
}
