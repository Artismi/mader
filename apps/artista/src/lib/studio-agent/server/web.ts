/**
 * Letture dal web, server-side, senza motori di ricerca intelligenti:
 * Wikipedia (casuale, vetrina, ricerca per parola), feed RSS scelti da
 * Andrea, pagine seguite dai link, definizioni dal Wikizionario,
 * shader GLSL da indirizzi dichiarati.
 */
const UA = 'CreativeOS-StudioAgent/0.1 (artista-osservatore; uso personale)'

async function get(url: string, ms = 12000): Promise<string> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, signal: ctl.signal, redirect: 'follow' })
    if (!res.ok) throw new Error(`${res.status} ${url}`)
    const txt = await res.text()
    return txt.slice(0, 2_000_000)
  } finally { clearTimeout(t) }
}

export interface RawReading { url: string; source: string; title: string; text: string; kind: 'wiki' | 'rss' | 'pagina' }

const decode = (s: string) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))

export function htmlToText(html: string): { title: string; text: string } {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim())
  const body = html
    .replace(/<(script|style|nav|header|footer|aside|form|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
  const paras = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => decode(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
  const text = paras.filter(p => p.length > 60).join('\n')
  return { title, text: text.slice(0, 20000) }
}

const WIKI = 'https://it.wikipedia.org'

async function wikiExtract(title: string): Promise<RawReading | null> {
  const u = `${WIKI}/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=plain&redirects=1&format=json&titles=${encodeURIComponent(title)}`
  const j = JSON.parse(await get(u))
  const page = Object.values(j?.query?.pages ?? {})[0] as { title?: string; extract?: string; missing?: string } | undefined
  if (!page || page.missing !== undefined || !page.extract) return null
  return { url: `${WIKI}/wiki/${encodeURIComponent(page.title!.replace(/ /g, '_'))}`, source: 'Wikipedia', title: page.title!, text: page.extract.slice(0, 20000), kind: 'wiki' }
}

export async function wikiRandom(): Promise<RawReading | null> {
  const j = JSON.parse(await get(`${WIKI}/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json`))
  const t = j?.query?.random?.[0]?.title
  return t ? wikiExtract(t) : null
}

export async function wikiSearch(q: string, n = 2): Promise<RawReading[]> {
  const j = JSON.parse(await get(`${WIKI}/w/api.php?action=query&list=search&srlimit=${n}&format=json&srsearch=${encodeURIComponent(q)}`))
  const titles: string[] = (j?.query?.search ?? []).map((x: { title: string }) => x.title)
  const out = await Promise.all(titles.map(t => wikiExtract(t).catch(() => null)))
  return out.filter(Boolean) as RawReading[]
}

/** voce in vetrina del giorno (feed del portale), con ricaduta sulla casuale */
export async function wikiFeatured(): Promise<RawReading | null> {
  try {
    const d = new Date()
    const u = `${WIKI}/api/rest_v1/feed/featured/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`
    const j = JSON.parse(await get(u))
    const t = j?.tfa?.titles?.normalized ?? j?.mostread?.articles?.[0]?.titles?.normalized
    if (t) return wikiExtract(t)
  } catch { /* ricade sotto */ }
  return wikiRandom()
}

export async function rss(url: string, n = 3): Promise<RawReading[]> {
  const xml = await get(url)
  const items = [...xml.matchAll(/<(item|entry)[\s\S]*?<\/\1>/gi)].slice(0, 12).map(m => m[0])
  const source = decode(xml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] ?? new URL(url).hostname).trim()
  const out: RawReading[] = []
  for (const it of items) {
    const title = decode((it.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] ?? '').trim())
    const link = (it.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? it.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? '').trim()
    const desc = decode((it.match(/<(description|summary|content:encoded|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/i)?.[2] ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    if (!title) continue
    out.push({ url: link || url, source, title, text: desc, kind: 'rss' })
  }
  // per alcuni articoli prova a leggere la pagina intera
  const picked = out.sort(() => Math.random() - 0.5).slice(0, n)
  await Promise.all(picked.map(async p => {
    if (!/^https?:/.test(p.url) || p.text.length > 1500) return
    try { const t = htmlToText(await get(p.url)); if (t.text.length > p.text.length) p.text = t.text } catch { /* resta il sommario */ }
  }))
  return picked
}

export async function page(url: string): Promise<RawReading | null> {
  const h = await get(url)
  const t = htmlToText(h)
  if (t.text.length < 200) return null
  return { url, source: new URL(url).hostname, title: t.title || url, text: t.text, kind: 'pagina' }
}

/** definizione dal Wikizionario: le righe "#" della sezione italiana, ripulite */
export async function define(word: string): Promise<string | null> {
  const u = `https://it.wiktionary.org/w/api.php?action=parse&prop=wikitext&format=json&redirects=1&page=${encodeURIComponent(word)}`
  let wt = ''
  try { wt = JSON.parse(await get(u))?.parse?.wikitext?.['*'] ?? '' } catch { return null }
  if (!wt) return null
  const it = wt.split(/==\s*\{\{-it-\}\}\s*==/)[1] ?? wt
  const section = it.split(/==\s*\{\{-[a-z]{2,3}-\}\}\s*==/)[0]
  const defs = section.split('\n')
    .filter(l => /^#[^*:]/.test(l))
    .map(l => l.replace(/^#+\s*/, '')
      .replace(/\{\{[^{}]*\}\}/g, '')
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
      .replace(/'''?/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ').trim())
    .filter(l => l.length > 3)
  return defs.length ? defs.slice(0, 3).join('; ') : null
}

export async function fetchShader(url: string): Promise<string | null> {
  if (!/^https:\/\//.test(url)) return null
  const t = await get(url, 10000)
  if (t.length > 40000) return null
  return /gl_FragColor|mainImage|fragColor/.test(t) ? t : null
}
