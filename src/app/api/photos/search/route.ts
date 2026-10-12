import { NextResponse } from 'next/server'

/**
 * Cerca una foto per una grafica, in ordine:
 * 1. Openverse: foto vere con licenza CC0 o pubblico dominio (nessuna attribuzione dovuta)
 * 2. Pexels / Unsplash, solo se c'è la chiave (PEXELS_API_KEY, UNSPLASH_ACCESS_KEY)
 * 3. altrimenti nessun risultato: lo Studio ripiega sulla foto generata
 *
 * GET /api/photos/search?q=chicchi di caffè&orient=square|landscape|portrait&n=0
 * → { url, source, license, credit, page } | { url: null }
 */

type Orient = 'square' | 'landscape' | 'portrait'
interface Photo { url: string; source: string; license: string; title?: string; credit?: string; page?: string; w: number; h: number }

const cache = new Map<string, Photo[]>()

/** Le richieste in italiano trovano poco: si traducono in inglese (servizio gratuito, senza chiave). */
async function toEnglish(q: string) {
  if (/^[\x20-\x7e]+$/.test(q) && /\b(the|and|on|with|of|photo|light)\b/i.test(q)) return q
  try {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q.slice(0, 400))}&langpair=it|en`, { signal: AbortSignal.timeout(8000) })
    const j = await r.json() as { responseData?: { translatedText?: string } }
    const t = j.responseData?.translatedText
    return t && !/MYMEMORY WARNING/i.test(t) ? t : q
  } catch { return q }
}

/** Poche parole chiare danno risultati migliori di una frase lunga. */
function keywords(q: string) {
  const stop = new Set(['a', 'an', 'the', 'of', 'for', 'with', 'and', 'on', 'in', 'to', 'by', 'photo', 'photograph', 'image', 'picture', 'high', 'detail', 'quality', 'professional', 'editorial', 'mood', 'style', 'no', 'text', 'letters', 'logo', 'notes', 'note', 'new', 'who', 'those', 'seeks', 'looking', 'one', 'our', 'your', 'this', 'that', 'more', 'best'])
  return q.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stop.has(w)).slice(0, 5).join(' ')
}

async function openverse(q: string, orient: Orient): Promise<Photo[]> {
  // solo archivi di fotografia contemporanea in CC0 (il pubblico dominio è pieno di stampe d'epoca)
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0&category=photograph&source=stocksnap,wordpress,rawpixel,nappy&aspect_ratio=${orient === 'square' ? 'square' : orient === 'portrait' ? 'tall' : 'wide'}&page_size=20&mature=false`
  const r = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'CreativeOS/1.0' } })
  if (!r.ok) return []
  const j = await r.json() as { results?: { url: string; source: string; license: string; title?: string; creator?: string; foreign_landing_url?: string; width?: number; height?: number }[] }
  return (j.results ?? [])
    .filter(x => x.url && !/\.(png|gif|svg)(\?|$)/i.test(x.url) && (x.width ?? 0) >= 900)
    .map(x => ({ url: x.url, source: `openverse/${x.source}`, license: x.license, title: x.title, credit: x.creator, page: x.foreign_landing_url, w: x.width ?? 0, h: x.height ?? 0 }))
}

async function pexels(q: string, orient: Orient): Promise<Photo[]> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return []
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=${orient}&per_page=15`, { headers: { Authorization: key }, signal: AbortSignal.timeout(12000) })
  if (!r.ok) return []
  const j = await r.json() as { photos?: { src: { large2x: string }; photographer: string; url: string; width: number; height: number }[] }
  return (j.photos ?? []).map(p => ({ url: p.src.large2x, source: 'pexels', license: 'pexels', credit: p.photographer, page: p.url, w: p.width, h: p.height }))
}

async function unsplash(q: string, orient: Orient): Promise<Photo[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return []
  const o = orient === 'square' ? 'squarish' : orient
  const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&orientation=${o}&per_page=15&content_filter=high`, { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(12000) })
  if (!r.ok) return []
  const j = await r.json() as { results?: { urls: { regular: string }; user: { name: string }; links: { html: string }; width: number; height: number }[] }
  return (j.results ?? []).map(p => ({ url: p.urls.regular, source: 'unsplash', license: 'unsplash', credit: p.user.name, page: p.links.html, w: p.width, h: p.height }))
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = (searchParams.get('q') ?? '').trim()
  const orient = (['square', 'landscape', 'portrait'].includes(searchParams.get('orient') ?? '') ? searchParams.get('orient') : 'square') as Orient
  const n = Math.max(0, Number(searchParams.get('n') ?? 0) || 0)
  if (!raw) return NextResponse.json({ url: null })

  const en = await toEnglish(raw)
  const q = keywords(en) || en
  const key = `${q}|${orient}`
  let list = cache.get(key)
  if (!list) {
    list = []
    // prima chi ha le foto migliori (se c'è la chiave), poi l'archivio libero
    for (const src of [pexels, unsplash]) {
      try { list = await src(q, orient) } catch { list = [] }
      if (list.length) break
    }
    if (!list.length) {
      // archivio libero: più ricerche (frase intera, soggetto, dettaglio) e si sceglie per pertinenza,
      // con un piccolo vantaggio alle prime parole
      const w = q.split(' ')
      const found = new Map<string, Photo>()
      for (const t of [...new Set([q, w.slice(0, 2).join(' '), w[0]])]) {
        try { for (const p of await openverse(t, orient)) found.set(p.url, p) } catch { /* si prosegue */ }
        if (found.size >= 30) break
      }
      const score = (t?: string) => w.reduce((s, word, i) => s + ((t ?? '').toLowerCase().includes(word.replace(/s$/, '')) ? 10 - i * 0.5 : 0), 0)
      list = [...found.values()].sort((a, b) => score(b.title) - score(a.title))
    }
    // niente? si riprova con meno parole (coppie, poi parole singole), anche in altri formati
    if (!list.length) {
      const w = q.split(' ')
      const tries = [...new Set([w.slice(-2).join(' '), w.slice(1, 3).join(' '), w.slice(0, 2).join(' '), ...w.slice().reverse()])].filter(t => t && t !== q)
      outer: for (const t of tries) for (const o of [orient, 'landscape', 'square'] as Orient[]) {
        try { list = await openverse(t, o) } catch { list = [] }
        if (list.length) break outer
      }
    }
    cache.set(key, list)
  }
  const pick = list[n % Math.max(1, list.length)]
  if (!pick) return NextResponse.json({ url: null, query: q })
  return NextResponse.json({ ...pick, query: q })
}
