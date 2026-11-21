/**
 * Versione autonoma: il server legge solo il web (i browser bloccano queste
 * letture per i CORS). Archivio e opere stanno nel browser.
 *   GET  read?mode=casuale|vetrina|cerca&q=|rss&url=|pagina&url=
 *   GET  define?w=parola
 *   POST shader {url}
 */
import { NextResponse } from 'next/server'
import { apriTunnel, ascoltaMedia, leggiConf, leggiMedia, pubblica, pubblicaStoria, pubblicaUploadPost, salvaMedia, salvaToken, salvaUploadPost, stato } from '@/lib/studio-agent/server/instagram'
import { define, explore, fetchShader, page, rss, wikiFeatured, wikiRandom, wikiSearch, wikiVoce } from '@/lib/studio-agent/server/web'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** richiesta arrivata da internet attraverso il tunnel: può solo scaricare i file da pubblicare */
const daFuori = (req: Request) => req.headers.has('cf-connecting-ip') || /trycloudflare\.com$/i.test(new URL(req.url).hostname) || /trycloudflare\.com/i.test(req.headers.get('host') ?? '')
type Ctx = { params: Promise<{ op: string[] }> }
const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })

export async function GET(req: Request, { params }: Ctx) {
  const [op, arg] = (await params).op
  const q = new URL(req.url).searchParams
  if (daFuori(req) && op !== 'media') return bad('non disponibile', 403)
  try {
    // i file da pubblicare, serviti a Instagram attraverso il tunnel
    if (op === 'media' && arg) { const m = leggiMedia(decodeURIComponent(arg)); return m ? new NextResponse(new Uint8Array(m.dati), { headers: { 'content-type': m.tipo, 'cache-control': 'no-store' } }) : bad('non trovato', 404) }
    if (op === 'ig-stato') return NextResponse.json(await stato())
    if (op === 'read') {
      const mode = q.get('mode') ?? 'casuale'
      if (mode === 'casuale') return NextResponse.json([await wikiRandom()].filter(Boolean))
      if (mode === 'vetrina') return NextResponse.json([await wikiFeatured()].filter(Boolean))
      if (mode === 'cerca') return NextResponse.json(await wikiSearch(q.get('q') ?? '', Number(q.get('n') ?? 2)))
      if (mode === 'rss') return NextResponse.json(await rss(q.get('url') ?? '', Number(q.get('n') ?? 2)))
      if (mode === 'voce') return NextResponse.json([await wikiVoce(q.get('t') ?? '')].filter(Boolean))
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
  if (daFuori(req)) return bad('non disponibile', 403)
  if (op === 'ig-media') {
    try { return NextResponse.json({ nome: salvaMedia(new URL(req.url).searchParams.get('nome') ?? 'file.bin', await req.arrayBuffer()) }) } catch (e) { return bad(e instanceof Error ? e.message : 'errore', 500) }
  }
  const body = await req.json().catch(() => ({}))
  try {
    if (op === 'ig-token') return NextResponse.json(await salvaToken(String(body.token ?? '')))
    if (op === 'ig-tunnel') return NextResponse.json({ tunnel: await apriTunnel() })
    if (op === 'up-chiave') return NextResponse.json(await salvaUploadPost(String(body.key ?? ''), String(body.user ?? '')))
    if (op === 'ig-ascolta') return NextResponse.json(await ascoltaMedia((body.ids as string[] | undefined) ?? []))
    if (op === 'ig-storia') return NextResponse.json(await pubblicaStoria(String(body.file ?? '')))
    if (op === 'ig-pubblica') return NextResponse.json(await (leggiConf().upKey ? pubblicaUploadPost : pubblica)(Array.isArray(body.file) ? body.file : [], String(body.didascalia ?? '')))
    if (op === 'esplora') return NextResponse.json([await explore(String(body.url ?? ''), String(body.word ?? ''), Array.isArray(body.skip) ? body.skip : [])].filter(Boolean))
    if (op !== 'shader') return bad('operazione sconosciuta', 404)
    return NextResponse.json({ code: await fetchShader(String(body.url ?? '')) })
  }
  catch (e) { return bad(e instanceof Error ? e.message : 'errore', 502) }
}
