/**
 * Versione autonoma: il server legge solo il web (i browser bloccano queste
 * letture per i CORS). Archivio e opere stanno nel browser.
 *   GET  read?mode=casuale|vetrina|cerca&q=|rss&url=|pagina&url=
 *   GET  define?w=parola
 *   POST shader {url}
 */
import { NextResponse } from 'next/server'
import { define, fetchShader, page, rss, wikiFeatured, wikiRandom, wikiSearch } from '@/lib/studio-agent/server/web'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

type Ctx = { params: Promise<{ op: string[] }> }
const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })

export async function GET(req: Request, { params }: Ctx) {
  const [op] = (await params).op
  const q = new URL(req.url).searchParams
  try {
    if (op === 'read') {
      const mode = q.get('mode') ?? 'casuale'
      if (mode === 'casuale') return NextResponse.json([await wikiRandom()].filter(Boolean))
      if (mode === 'vetrina') return NextResponse.json([await wikiFeatured()].filter(Boolean))
      if (mode === 'cerca') return NextResponse.json(await wikiSearch(q.get('q') ?? '', Number(q.get('n') ?? 2)))
      if (mode === 'rss') return NextResponse.json(await rss(q.get('url') ?? '', Number(q.get('n') ?? 2)))
      if (mode === 'pagina') return NextResponse.json([await page(q.get('url') ?? '')].filter(Boolean))
      return bad('modo sconosciuto')
    }
    if (op === 'define') return NextResponse.json({ word: q.get('w'), definition: await define(q.get('w') ?? '') })
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'errore', 502)
  }
  return bad('operazione sconosciuta', 404)
}

export async function POST(req: Request, { params }: Ctx) {
  const [op] = (await params).op
  if (op !== 'shader') return bad('operazione sconosciuta', 404)
  const body = await req.json().catch(() => ({}))
  try { return NextResponse.json({ code: await fetchShader(String(body.url ?? '')) }) }
  catch (e) { return bad(e instanceof Error ? e.message : 'errore', 502) }
}
