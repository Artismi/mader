/**
 * Letture dal web, server-side, senza motori di ricerca intelligenti:
 * Wikipedia (casuale, vetrina, ricerca, voce precisa con i suoi link), feed
 * RSS scelti da Andrea, pagine, definizioni dal Wikizionario (con riserva
 * sull'attacco della voce di Wikipedia), shader GLSL da indirizzi dichiarati.
 *
 * Educazione verso le fonti: User-Agent con contatto, una richiesta alla
 * volta per host con pausa, attesa sui 429/503, cache su disco. Senza questo
 * Wikipedia blocca dopo poche decine di giornate di fila.
 */
import { createHash } from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'

const UA = 'ArtistaOsservatore/0.2 (https://artismidesignstudio.com; uso personale, artistico)'
const CACHE = process.env.ARTISTA_CACHE || path.join(os.tmpdir(), 'artista-osservatore-cache')
const GAP_MS = 700

const lanes = new Map<string, Promise<unknown>>()
function throttle<T>(host: string, fn: () => Promise<T>): Promise<T> {
  const prev = lanes.get(host) ?? Promise.resolve()
  const next = prev.catch(() => {}).then(async () => {
    try { return await fn() } finally { await new Promise(r => setTimeout(r, GAP_MS)) }
  })
  lanes.set(host, next)
  return next as Promise<T>
}

const keyOf = (k: string) => path.join(CACHE, createHash('sha1').update(k).digest('hex'))
function cacheGet(key: string, ttlDays: number): string | null {
  try {
    const f = keyOf(key)
    if (ttlDays > 0 && Date.now() - fs.statSync(f).mtimeMs > ttlDays * 864e5) return null
    return fs.readFileSync(f, 'utf8')
  } catch { return null }
}
function cachePut(key: string, val: string) {
  try { fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(keyOf(key), val) } catch { /* cache facoltativa */ }
}

/** ttlDays: 0 = niente cache, -1 = per sempre */
async function get(url: string, opts: { ms?: number; ttlDays?: number } = {}): Promise<string> {
  const ttl = opts.ttlDays ?? 0
  if (ttl !== 0) { const c = cacheGet(url, ttl); if (c !== null) return c }
  const host = new URL(url).host
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await throttle(host, async () => {
      const ctl = new AbortController()
      const t = setTimeout(() => ctl.abort(), opts.ms ?? 15000)
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA, Accept: '*/*' }, signal: ctl.signal, redirect: 'follow' })
        return { status: res.status, retry: Number(res.headers.get('retry-after') ?? 0), text: res.ok ? (await res.text()).slice(0, 2_000_000) : '' }
      } finally { clearTimeout(t) }
    })
    if (r.status >= 200 && r.status < 300) { if (ttl !== 0) cachePut(url, r.text); return r.text }
    if (r.status === 429 || r.status === 503) {
      await new Promise(res => setTimeout(res, Math.min(30, r.retry || 2 ** (attempt + 1)) * 1000))
      continue
    }
    throw new Error(`${r.status} ${url}`)
  }
  throw new Error(`429 ${url} (troppe richieste)`)
}

export interface RawReading { url: string; source: string; title: string; text: string; kind: 'wiki' | 'rss' | 'pagina'; links?: string[] }

const decode = (s: string) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))

export function htmlToText(html: string): { title: string; text: string } {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim())
  const body = html.replace(/<(script|style|nav|header|footer|aside|form|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
  const paras = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => decode(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
  return { title, text: paras.filter(p => p.length > 60).join('\n').slice(0, 20000) }
}

const WIKI = 'https://it.wikipedia.org'

async function wikiExtract(title: string): Promise<RawReading | null> {
  const u = `${WIKI}/w/api.php?action=query&prop=extracts|links&explaintext=1&exsectionformat=plain&pllimit=80&plnamespace=0&redirects=1&format=json&maxlag=5&titles=${encodeURIComponent(title)}`
  const j = JSON.parse(await get(u, { ttlDays: 60 }))
  const page = Object.values(j?.query?.pages ?? {})[0] as { title?: string; extract?: string; missing?: string; links?: { title: string }[] } | undefined
  if (!page || page.missing !== undefined || !page.extract) return null
  return {
    url: `${WIKI}/wiki/${encodeURIComponent(page.title!.replace(/ /g, '_'))}`, source: 'Wikipedia', title: page.title!,
    text: page.extract.slice(0, 20000), kind: 'wiki',
    links: (page.links ?? []).map(l => l.title).filter(t => !/^\d+$|^(Anno|Anni|Secolo|Aiuto|Portale|Categoria)\b/.test(t)),
  }
}

/** una voce precisa (per seguire i link letti nei giorni prima) */
export const wikiVoce = (title: string) => wikiExtract(title)

export async function wikiRandom(): Promise<RawReading | null> {
  const j = JSON.parse(await get(`${WIKI}/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&maxlag=5`))
  const t = j?.query?.random?.[0]?.title
  return t ? wikiExtract(t) : null
}

export async function wikiSearch(q: string, n = 2): Promise<RawReading[]> {
  const j = JSON.parse(await get(`${WIKI}/w/api.php?action=query&list=search&srlimit=${n}&format=json&maxlag=5&srsearch=${encodeURIComponent(q)}`, { ttlDays: 30 }))
  const titles: string[] = (j?.query?.search ?? []).map((x: { title: string }) => x.title)
  const out: (RawReading | null)[] = []
  for (const t of titles) out.push(await wikiExtract(t).catch(() => null))
  return out.filter(Boolean) as RawReading[]
}

export async function wikiFeatured(): Promise<RawReading | null> {
  try {
    const d = new Date()
    const u = `${WIKI}/api/rest_v1/feed/featured/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`
    const j = JSON.parse(await get(u, { ttlDays: 1 }))
    const t = j?.tfa?.titles?.normalized ?? j?.mostread?.articles?.[0]?.titles?.normalized
    if (t) return wikiExtract(t)
  } catch { /* ricade sotto */ }
  return wikiRandom()
}

/** l'attacco di una voce di Wikipedia: definizione di riserva */
async function wikiLead(word: string): Promise<string | null> {
  const u = `${WIKI}/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exsentences=2&redirects=1&format=json&maxlag=5&titles=${encodeURIComponent(word)}`
  try {
    const j = JSON.parse(await get(u, { ttlDays: -1 }))
    const page = Object.values(j?.query?.pages ?? {})[0] as { extract?: string } | undefined
    const t = page?.extract?.replace(/\s+/g, ' ').trim()
    return t && t.length > 20 && !/può riferirsi a|può indicare|disambigua/i.test(t) ? t.slice(0, 400) : null
  } catch { return null }
}

export async function rss(url: string, n = 3): Promise<RawReading[]> {
  const xml = await get(url, { ttlDays: 0.1 })
  const items = [...xml.matchAll(/<(item|entry)[\s\S]*?<\/\1>/gi)].slice(0, 12).map(m => m[0])
  const source = decode(xml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] ?? new URL(url).hostname).trim()
  const out: RawReading[] = []
  for (const it of items) {
    const title = decode((it.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] ?? '').trim())
    const link = (it.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? it.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? '').trim()
    const desc = decode((it.match(/<(description|summary|content:encoded|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/i)?.[2] ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    if (title) out.push({ url: link || url, source, title, text: desc, kind: 'rss' })
  }
  const picked = out.sort(() => Math.random() - 0.5).slice(0, n)
  for (const p of picked) {
    if (!/^https?:/.test(p.url) || p.text.length > 1500) continue
    try { const t = htmlToText(await get(p.url, { ttlDays: 30 })); if (t.text.length > p.text.length) p.text = t.text } catch { /* resta il sommario */ }
  }
  return picked
}

export async function page(url: string): Promise<RawReading | null> {
  const t = htmlToText(await get(url, { ttlDays: 7 }))
  if (t.text.length < 200) return null
  return { url, source: new URL(url).hostname, title: t.title || url, text: t.text, kind: 'pagina' }
}

/** definizione: Wikizionario (righe "#" della sezione italiana), poi attacco di Wikipedia */
export async function define(word: string): Promise<string | null> {
  const u = `https://it.wiktionary.org/w/api.php?action=parse&prop=wikitext&format=json&redirects=1&maxlag=5&page=${encodeURIComponent(word)}`
  let wt = ''
  try { wt = JSON.parse(await get(u, { ttlDays: -1 }))?.parse?.wikitext?.['*'] ?? '' } catch { wt = '' }
  if (wt) {
    const it = wt.split(/==\s*\{\{-it-\}\}\s*==/)[1] ?? wt
    const section = it.split(/==\s*\{\{-[a-z]{2,3}-\}\}\s*==/)[0]
    const defs = section.split('\n')
      .filter(l => /^#[^*:]/.test(l))
      .map(l => l.replace(/^#+\s*/, '')
        .replace(/\{\{[^{}]*\}\}/g, '')
        .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
        .replace(/'{2,3}/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ').trim())
      .filter(l => l.length > 3)
    if (defs.length) return defs.slice(0, 3).join('; ')
  }
  return wikiLead(word)
}

export async function fetchShader(url: string): Promise<string | null> {
  if (!/^https:\/\//.test(url)) return null
  const t = await get(url, { ms: 10000, ttlDays: 30 })
  if (t.length > 40000) return null
  return /gl_FragColor|mainImage|fragColor/.test(t) ? t : null
}
