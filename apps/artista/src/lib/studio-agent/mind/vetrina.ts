/**
 * Vetrina: un social finto, tutto procedurale. L'artista pubblica le tavole
 * che tiene, con una riflessione scritta; un pubblico di follower con gusti e
 * sensibilità diverse guarda (views), mette like, commenta l'immagine, il testo
 * scritto dentro e la riflessione, arriva o se ne va. Il giorno dopo l'artista
 * rilegge i commenti e risponde: se è d'accordo ne tiene conto (un consiglio
 * per la prossima tavola), se no difende la scelta. Il peso della voce
 * "pubblico" nel dibattito cambia con la storia: può imparare a farsi capire
 * senza smettere di sperimentare.
 */
import type { AgentState, Features, Work } from '../core/types'
import { pick, range, uid, type Rnd } from '../core/rng'
import type { Flaw } from '../eyes/judgement'

export interface Follower {
  id: string
  name: string
  taste: { feature: string; target: number; weight: number }[]
  words: string[]
  /** 0 = ama la novità, 1 = ama il riconoscibile */
  loyalty: number
  /** quanto lo infastidisce ciascun difetto */
  touchy: Partial<Record<Flaw, number>>
  /** legge i testi e le riflessioni (0..1) */
  reader: number
  since: number
  seen: number[]
}

export interface PostComment { id: string; who: string; text: string; like?: boolean; byArtist?: boolean; replyTo?: string; about?: string }
export interface Post {
  workId: string; day: number; title: string; caption: string; reflection: string
  views: number; likes: number; comments: PostComment[]; image?: string
  flaws: { flaw: Flaw; severity: number }[]; inscriptions: string[]
}
export interface Advice { feature: string; target: number; reason: string; untilDay: number }
export interface Vetrina { followers: Follower[]; posts: Post[]; left: number; joined: number; advice: Advice[] }

const TASTE_FEATURES = ['luminosita', 'contrasto', 'densita', 'vuoto', 'saturazione', 'simmetria', 'squilibrio', 'complessita', 'linee', 'superfici', 'punti', 'diagonali']
const FLAWS: Flaw[] = ['vuota', 'illeggibile', 'pattern a caso', 'non dice niente', 'sbilanciata', 'pasticcio']
const SYL = ['ma', 'ri', 'lo', 'ne', 'ta', 'vi', 'sa', 'co', 'lu', 'pe', 'gi', 'ro', 'da', 'fe', 'mi', 'no', 'za', 'be']
const WORDS = ['carta', 'nero', 'mare', 'ferro', 'polvere', 'luna', 'segno', 'ruggine', 'fumo', 'vetro', 'notte', 'osso', 'lana', 'spina']

const handle = (r: Rnd) => `${Array.from({ length: 2 + Math.floor(r() * 2) }, () => pick(r, SYL)).join('')}${pick(r, ['', '_', '.'])}${r() < 0.5 ? pick(r, WORDS) : Math.floor(r() * 99)}`

function newFollower(r: Rnd, day: number, like?: Features, words: string[] = []): Follower {
  const feats = [...TASTE_FEATURES].sort(() => r() - 0.5).slice(0, 3 + Math.floor(r() * 3))
  return {
    id: uid(), name: handle(r), since: day, seen: [], loyalty: r(), reader: r(),
    taste: feats.map(f => ({ feature: f, target: like ? Math.max(0, Math.min(1, (like[f] ?? 0.5) + (r() - 0.5) * 0.2)) : r(), weight: range(r, 0.3, 1) })),
    words: words.slice(0, 4),
    touchy: Object.fromEntries(FLAWS.map(fl => [fl, range(r, 0.2, 1)])),
  }
}

type WithV = AgentState & { vetrina?: Vetrina }
export const getVetrina = (st: AgentState) => (st as WithV).vetrina

export function ensureVetrina(st: AgentState, r: Rnd): Vetrina {
  const v = (st as WithV).vetrina
  if (v) { v.advice ??= []; return v }
  const fresh: Vetrina = { followers: Array.from({ length: 14 }, () => newFollower(r, st.day)), posts: [], left: 0, joined: 0, advice: [] }
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

/** prima di pubblicare: quanti la apprezzerebbero, e quali difetti noterebbero */
export function predict(st: AgentState, f: Features, words: string[], novelty: number, fl_: { flaw: Flaw; severity: number }[]) {
  const v = getVetrina(st)
  if (!v?.followers.length) return null
  const liked = v.followers.filter(x => appreciation(x, f, words, novelty, fl_) > 0.55).length
  return { liked, total: v.followers.length }
}

const FEAT_SAY: Record<string, [string, string]> = {
  luminosita: ['troppo buio per me', 'quella luce'], contrasto: ['tutto uguale', 'che contrasto'], densita: ['troppo piena', 'densissima'],
  vuoto: ['dove sei finito?', 'quel vuoto'], saturazione: ['grigia', 'i colori'], simmetria: ['ferma', 'lo specchio'],
  squilibrio: ['tutto al centro', 'sbilanciata, ma bella'], complessita: ['piatta', 'la grana'], linee: ['dove sono le linee?', 'quelle linee'],
  superfici: ['manca un piano', 'le campiture'], punti: ['vuota di segni', 'tutti quei punti'], diagonali: ['statica', 'la diagonale'],
}
const FLAW_SAY: Record<Flaw, string[]> = {
  vuota: ['non c\'è niente', 'è vuota', 'e quindi?'],
  illeggibile: ['non si legge la scritta', 'cosa c\'è scritto?', 'il testo si perde'],
  'pattern a caso': ['un pattern a caso', 'sembra uno sfondo', 'texture e basta'],
  'non dice niente': ['non mi dice niente', 'non capisco cosa vuoi dire', 'ok ma… cosa?'],
  sbilanciata: ['tutta da una parte', 'sbilanciata male', 'cade di lato'],
  pasticcio: ['un pasticcio', 'troppa roba', 'rumore'],
}

function comment(r: Rnd, fl: Follower, w: Work, liked: boolean, words: string[], fl_: { flaw: Flaw; severity: number }[], inscriptions: string[]): PostComment {
  const id = uid()
  // il difetto che lo infastidisce di più, se c'è
  const worst = fl_.map(x => ({ ...x, s: x.severity * (fl.touchy[x.flaw] ?? 0.5) })).sort((a, b) => b.s - a.s)[0]
  if (!liked && worst && worst.s > 0.35) return { id, who: fl.name, text: pick(r, FLAW_SAY[worst.flaw]), like: false, about: worst.flaw }
  // chi legge commenta il testo scritto dentro o la riflessione
  if (fl.reader > 0.6 && r() < 0.5) {
    const ins = inscriptions.find(t => t.length > 3)
    if (ins) return { id, who: fl.name, text: liked ? `«${ins.slice(0, 50)}»: mi ha fatto pensare` : `«${ins.slice(0, 50)}» non lo capisco`, like: liked, about: 'testo' }
    const q = words.find(x => fl.words.includes(x)) ?? words[0]
    if (q) return { id, who: fl.name, text: liked ? `cosa intendi con ${q}?` : `${q} non c'entra niente qui`, like: liked, about: 'riflessione' }
  }
  const t = fl.taste.slice().sort((a, b) => b.weight - a.weight)[0]
  const say = FEAT_SAY[t.feature] ?? ['mah', 'sì']
  const close = Math.abs((w.visual.features[t.feature] ?? 0) - t.target) < 0.2
  const topic = fl.words.find(x => words.includes(x))
  const text = liked
    ? pick(r, [`${close ? say[1] : 'questa'}!`, topic ? `ancora ${topic}, ti prego` : 'sempre meglio', 'la stamperei', 'questa mi resta in testa'])
    : pick(r, [say[0], topic ? `ma ${topic} dov'è?` : 'non la capisco', 'preferivo le vecchie', 'boh'])
  return { id, who: fl.name, text, like: liked, about: t.feature }
}

/** pubblica una tavola con la sua riflessione e raccoglie le reazioni */
export function publish(st: AgentState, r: Rnd, w: Work, words: string[], reflection: string, fl_: { flaw: Flaw; severity: number }[], inscriptions: string[]): Post {
  const v = ensureVetrina(st, r)
  const tags = [...new Set(words)].slice(0, 4).map(x => '#' + x).join(' ')
  const post: Post = { workId: w.id, day: w.day, title: w.title, caption: `${w.title || 'Senza titolo'}\n${tags}`, reflection, views: 0, likes: 0, comments: [], image: w.image, flaws: fl_, inscriptions }
  for (const fl of v.followers) {
    if (r() < 0.12) continue
    post.views++
    const a = appreciation(fl, w.visual.features, words, w.novelty, fl_) + (r() - 0.5) * 0.1
    fl.seen = [...fl.seen, a].slice(-6)
    const liked = a > 0.55
    if (liked) post.likes++
    if (r() < (liked ? 0.2 : a < 0.35 ? 0.22 : 0.05)) post.comments.push(comment(r, fl, w, liked, words, fl_, inscriptions))
  }
  // chi non segue arriva dalle condivisioni: views extra, qualcuno resta
  const shares = Math.floor(post.likes * range(r, 0.2, 1.2))
  post.views += shares * (2 + Math.floor(r() * 5))
  const before = v.followers.length
  v.followers = v.followers.filter(fl => fl.seen.length < 5 || fl.seen.reduce((a, b) => a + b, 0) / fl.seen.length > 0.38)
  v.left += before - v.followers.length
  const arrivals = Math.floor(shares / 3 + (r() < post.likes / Math.max(1, post.views) * 3 ? 1 : 0))
  for (let i = 0; i < arrivals; i++) v.followers.push(newFollower(r, st.day, w.visual.features, words))
  v.joined += arrivals
  v.posts = [post, ...v.posts].slice(0, 300)
  return post
}

const ADVICE: Partial<Record<string, { feature: string; dir: 1 | -1; yes: string[]; no: string[] }>> = {
  vuota: { feature: 'densita', dir: 1, yes: ['Hai ragione, era troppo poco: domani riempio.', 'Vero, mi sono fermato presto.'], no: ['È vuota apposta: il vuoto è il soggetto.', 'Il niente è la parte che conta.'] },
  illeggibile: { feature: 'contrasto', dir: 1, yes: ['Giusto, la scritta si perdeva: la prossima la faccio leggere.', 'Hai ragione, la copro troppo.'], no: ['Non deve leggersi tutto: si legge abbastanza.', 'La scritta è una texture, qui.'] },
  'pattern a caso': { feature: 'complessita', dir: -1, yes: ['Sì, era solo superficie. Cerco una forma.', 'Hai ragione, ho riempito senza dire.'], no: ['Il pattern è il discorso: ripetere è il punto.'] },
  'non dice niente': { feature: 'superfici', dir: 1, yes: ['Forse sì: era un esercizio. Ci riprovo più chiaro.', 'Giusto, era confusa.'], no: ['Dice poco, ma lo dice piano.', 'Non tutto deve dire qualcosa.'] },
  sbilanciata: { feature: 'squilibrio', dir: -1, yes: ['Vero, cade di lato senza motivo.'], no: ['Lo squilibrio è voluto: deve cadere.'] },
  pasticcio: { feature: 'elementi', dir: -1, yes: ['Hai ragione, troppa roba. Tolgo.', 'Sì, era rumore.'], no: ['Il pasticcio è onesto: è com\'era la giornata.'] },
}

/**
 * Il giorno dopo: rilegge i commenti dei post recenti e risponde ad alcuni.
 * Se la voce "pubblico" pesa abbastanza, o il difetto torna spesso, è d'accordo
 * e ne nasce un consiglio per le prossime tavole; altrimenti difende la scelta.
 */
export function replyToComments(st: AgentState, r: Rnd, name: string): { replies: string[]; advice: Advice[] } {
  const v = getVetrina(st)
  if (!v) return { replies: [], advice: [] }
  const weight = st.voices.pubblico ?? 1
  const out: string[] = []
  const recentFlaws = v.posts.slice(0, 6).flatMap(p => p.comments.filter(c => !c.byArtist && c.about).map(c => c.about!))
  for (const p of v.posts.slice(0, 3)) {
    const open = p.comments.filter(c => !c.byArtist && !p.comments.some(x => x.replyTo === c.id))
    for (const c of open.slice(0, 2)) {
      if (r() < 0.35) continue
      const rule = c.about ? ADVICE[c.about] : undefined
      let text: string
      if (rule) {
        const often = recentFlaws.filter(x => x === c.about).length >= 3
        const agree = r() < Math.min(0.9, 0.25 + weight * 0.25 + (often ? 0.3 : 0))
        text = pick(r, agree ? rule.yes : rule.no)
        if (agree && !v.advice.some(a => a.feature === rule.feature)) {
          v.advice.push({ feature: rule.feature, target: rule.dir > 0 ? 0.6 : 0.25, reason: `${c.who}: "${c.text}"`, untilDay: st.day + 3 })
        }
      } else if (c.about === 'testo' || c.about === 'riflessione') {
        text = c.like ? pick(r, ['Grazie. Ci sto ancora pensando anch\'io.', 'Era una domanda più che una risposta.']) : pick(r, ['Forse non lo capisco neanche io: è per questo che l\'ho scritto.', 'Hai ragione, provo a dirlo meglio.'])
      } else {
        text = c.like ? pick(r, ['Grazie.', 'Contento che ti arrivi.', 'Sì, anche a me.']) : pick(r, ['Capisco. Non era per tutti.', 'Ci penso.', 'Domani provo un\'altra strada.'])
      }
      p.comments.push({ id: uid(), who: name || 'artista', text, byArtist: true, replyTo: c.id })
      out.push(`a ${c.who} ("${c.text}"): ${text}`)
    }
  }
  v.advice = v.advice.filter(a => a.untilDay >= st.day)
  return { replies: out, advice: v.advice }
}
