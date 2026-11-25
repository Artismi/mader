/**
 * Le fonti della biblioteca: ogni abitante e ogni saggista ha la sua tavolozza di siti.
 * Solo API pubbliche e feed, con la stessa cortesia del resto (cache, un host alla volta, User-Agent chiaro).
 * Ogni fonte risponde a una domanda con poche letture: titolo, fonte, un testo (che poi si cita poco e si parafrasa).
 */
import { page, rss, type RawReading } from './web'

const UA = 'ArtistaOsservatore/0.2 (https://artismidesignstudio.com; uso personale, artistico)'
async function json(url: string, ms = 12000): Promise<any> {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms)
  try { const r = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA, Accept: 'application/json' }, signal: ctl.signal }); return r.ok ? r.json() : null } finally { clearTimeout(t) }
}
async function testo(url: string, ms = 12000): Promise<string> {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms)
  try { const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctl.signal }); return r.ok ? r.text() : '' } finally { clearTimeout(t) }
}
const pulisci = (s: string) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
const R = (url: string, source: string, title: string, text: string, kind: RawReading['kind'] = 'pagina'): RawReading => ({ url, source, title: pulisci(title), text: pulisci(text).slice(0, 12000), kind })

// una wiki MediaWiki qualsiasi: cerca, poi prende l'estratto delle prime voci
async function mediawiki(base: string, nome: string, q: string, n: number, ns = 0): Promise<RawReading[]> {
  const s = await json(`${base}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=${n}&srnamespace=${ns}&format=json&maxlag=5`)
  const titoli: string[] = (s?.query?.search ?? []).map((x: { title: string }) => x.title)
  if (!titoli.length) return []
  if (ns === 6) return (s.query.search as { title: string; snippet: string }[]).map(x => R(`${base}/wiki/${encodeURIComponent(x.title.replace(/ /g, '_'))}`, nome, x.title.replace(/^File:/, '').replace(/\.\w+$/, ''), x.snippet))
  const e = await json(`${base}/w/api.php?action=query&prop=extracts&explaintext=1&exintro=0&redirects=1&format=json&maxlag=5&titles=${encodeURIComponent(titoli.join('|'))}`)
  return Object.values(e?.query?.pages ?? {}).filter((p: any) => p.extract).map((p: any) => R(`${base}/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`, nome, p.title, p.extract, 'wiki'))
}

// le riviste: niente ricerca pubblica, quindi si guarda nel loro feed cosa parla della parola
const RIVISTE: Record<string, string> = {
  'Il Post': 'https://www.ilpost.it/feed/',
  'Internazionale': 'https://www.internazionale.it/sitemaps/rss.xml',
  'Doppiozero': 'https://www.doppiozero.com/rss.xml',
  'Il Tascabile': 'https://www.iltascabile.com/feed/',
  'cheFare': 'https://www.che-fare.com/feed/',
  'Artribune': 'https://www.artribune.com/feed/',
  'Le Scienze': 'https://www.lescienze.it/rss/all/rss2.0.xml',
  'Scienza in Rete': 'https://www.scienzainrete.it/rss.xml',
  'minima&moralia': 'https://www.minimaetmoralia.it/wp/feed/',
  'Nazione Indiana': 'https://www.nazioneindiana.com/feed/',
}

export type Fonte = { id: string; nome: string; tipo: 'enciclopedia' | 'classici' | 'scienza' | 'immagini' | 'rivista' | 'lessico'; cerca: (q: string, n: number) => Promise<RawReading[]> }

export const FONTI: Fonte[] = [
  ...(['it', 'en', 'fr', 'de', 'es'] as const).map(l => ({ id: `wiki-${l}`, nome: `Wikipedia (${l})`, tipo: 'enciclopedia' as const, cerca: (q: string, n: number) => mediawiki(`https://${l}.wikipedia.org`, `Wikipedia (${l})`, q, n) })),
  { id: 'wikisource', nome: 'Wikisource', tipo: 'classici', cerca: (q, n) => mediawiki('https://it.wikisource.org', 'Wikisource', q, n) },
  { id: 'wikizionario', nome: 'Wikizionario', tipo: 'lessico', cerca: (q, n) => mediawiki('https://it.wiktionary.org', 'Wikizionario', q, n) },
  { id: 'wikiquote', nome: 'Wikiquote', tipo: 'classici', cerca: (q, n) => mediawiki('https://it.wikiquote.org', 'Wikiquote', q, n) },
  { id: 'commons', nome: 'Wikimedia Commons', tipo: 'immagini', cerca: (q, n) => mediawiki('https://commons.wikimedia.org', 'Wikimedia Commons', q, n, 6) },
  {
    id: 'openlibrary', nome: 'Open Library', tipo: 'classici', cerca: async (q, n) => {
      const j = await json(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${n}&fields=key,title,author_name,first_sentence,subject,first_publish_year`)
      return (j?.docs ?? []).map((d: any) => R(`https://openlibrary.org${d.key}`, 'Open Library', `${d.title}${d.author_name ? ` — ${d.author_name[0]}` : ''}${d.first_publish_year ? ` (${d.first_publish_year})` : ''}`, `${(d.first_sentence ?? []).join(' ')} ${(d.subject ?? []).slice(0, 12).join(', ')}`))
    },
  },
  {
    id: 'gutenberg', nome: 'Project Gutenberg', tipo: 'classici', cerca: async (q, n) => {
      const j = await json(`https://gutendex.com/books?search=${encodeURIComponent(q)}`)
      return (j?.results ?? []).slice(0, n).map((b: any) => R(`https://www.gutenberg.org/ebooks/${b.id}`, 'Project Gutenberg', `${b.title}${b.authors?.[0] ? ` — ${b.authors[0].name}` : ''}`, [...(b.subjects ?? []), ...(b.summaries ?? [])].join('. ')))
    },
  },
  {
    id: 'archive', nome: 'Internet Archive', tipo: 'classici', cerca: async (q, n) => {
      const j = await json(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=description&fl[]=subject&rows=${n}&output=json`)
      return (j?.response?.docs ?? []).map((d: any) => R(`https://archive.org/details/${d.identifier}`, 'Internet Archive', String(d.title ?? d.identifier), `${[].concat(d.description ?? []).join(' ')} ${[].concat(d.subject ?? []).join(', ')}`))
    },
  },
  {
    id: 'arxiv', nome: 'arXiv', tipo: 'scienza', cerca: async (q, n) => {
      const x = await testo(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&max_results=${n}`)
      return [...x.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => R(m[1].match(/<id>(.*?)<\/id>/)?.[1] ?? 'https://arxiv.org', 'arXiv', m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '', m[1].match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? ''))
    },
  },
  ...Object.entries(RIVISTE).map(([nome, url]) => ({
    id: 'rivista:' + nome, nome, tipo: 'rivista' as const, cerca: async (q: string, n: number) => {
      const voci = await rss(url, 12).catch(() => [] as RawReading[])
      const parole = q.toLowerCase().split(/\s+/).filter(w => w.length > 3).map(w => w.slice(0, Math.max(4, w.length - 2)))
      const buone = voci.filter(v => parole.some(p => `${v.title} ${v.text}`.toLowerCase().includes(p))).slice(0, n)
      for (const b of buone) if (b.text.length < 600) { const p = await page(b.url).catch(() => null); if (p) b.text = p.text }
      return buone.map(b => ({ ...b, source: nome }))
    },
  })),
]

export const fonteDi = (id: string) => FONTI.find(f => f.id === id)
export async function cercaIn(id: string, q: string, n = 2): Promise<RawReading[]> {
  const f = fonteDi(id); if (!f || !q.trim()) return []
  try { return await f.cerca(q, n) } catch { return [] }
}
