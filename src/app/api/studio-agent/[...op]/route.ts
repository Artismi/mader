/**
 * API dell'artista-osservatore. Un solo punto d'ingresso:
 *   GET  state | works | works/:id | image/:id | library
 *   GET  read?mode=casuale|vetrina|cerca&q=|rss&url=|pagina&url=
 *   GET  define?w=parola
 *   POST pos {words} · shader {url} · visit {text, workId?, vote?} · works {work, png}
 *   PUT  state {…} · DELETE state
 */
import { NextResponse } from 'next/server'
import fs from 'fs'
import { addVisit, getWork, imagePath, libraryFiles, listWorks, loadState, posTags, resetState, saveState, saveWork } from '@/lib/studio-agent/server/store'
import { define, explore, fetchShader, page, rss, wikiFeatured, wikiRandom, wikiSearch, wikiVoce } from '@/lib/studio-agent/server/web'
import type { AgentState, Work } from '@/lib/studio-agent/core/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ op: string[] }> }
const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })

export async function GET(req: Request, { params }: Ctx) {
  const [op, id] = (await params).op
  const q = new URL(req.url).searchParams
  try {
    switch (op) {
      case 'state': return NextResponse.json(loadState())
      case 'works':
        if (id) { const w = getWork(id); return w ? NextResponse.json(w) : bad('opera non trovata', 404) }
        return NextResponse.json(listWorks(Number(q.get('limit') ?? 200)))
      case 'image': {
        const p = id ? imagePath(id) : null
        if (!p) return bad('immagine non trovata', 404)
        return new NextResponse(new Uint8Array(fs.readFileSync(p)), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } })
      }
      case 'library': return NextResponse.json(libraryFiles())
      case 'read': {
        const mode = q.get('mode') ?? 'casuale'
        if (mode === 'casuale') return NextResponse.json([await wikiRandom()].filter(Boolean))
        if (mode === 'vetrina') return NextResponse.json([await wikiFeatured()].filter(Boolean))
        if (mode === 'cerca') return NextResponse.json(await wikiSearch(q.get('q') ?? '', Number(q.get('n') ?? 2)))
        if (mode === 'rss') return NextResponse.json(await rss(q.get('url') ?? '', Number(q.get('n') ?? 2)))
        if (mode === 'voce') return NextResponse.json([await wikiVoce(q.get('t') ?? '')].filter(Boolean))
        if (mode === 'pagina') return NextResponse.json([await page(q.get('url') ?? '')].filter(Boolean))
        return bad('modo sconosciuto')
      }
      case 'define': return NextResponse.json({ word: q.get('w'), definition: await define(q.get('w') ?? '') })
    }
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'errore', 502)
  }
  return bad('operazione sconosciuta', 404)
}

export async function POST(req: Request, { params }: Ctx) {
  const [op] = (await params).op
  const body = await req.json().catch(() => ({}))
  try {
    switch (op) {
      case 'pos': return NextResponse.json(posTags(Array.isArray(body.words) ? body.words : []))
      case 'shader': return NextResponse.json({ code: await fetchShader(String(body.url ?? '')) })
      case 'esplora': return NextResponse.json([await explore(String(body.url ?? ''), String(body.word ?? ''), Array.isArray(body.skip) ? body.skip : [])].filter(Boolean))
      case 'visit': {
        const ok = addVisit({ id: crypto.randomUUID(), date: new Date().toISOString(), text: String(body.text ?? '').slice(0, 1000), workId: body.workId, vote: body.vote === 1 || body.vote === -1 ? body.vote : undefined })
        return ok ? NextResponse.json({ ok }) : bad("l'artista non esiste ancora")
      }
      case 'works': {
        const w = body.work as Work
        if (!w?.id || typeof body.png !== 'string') return bad('opera incompleta')
        return NextResponse.json(saveWork(w, body.png))
      }
    }
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'errore', 502)
  }
  return bad('operazione sconosciuta', 404)
}

export async function PUT(req: Request, { params }: Ctx) {
  const [op] = (await params).op
  if (op !== 'state') return bad('operazione sconosciuta', 404)
  const st = (await req.json()) as AgentState
  if (st?.version !== 1) return bad('stato non valido')
  saveState(st)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const [op] = (await params).op
  if (op !== 'state') return bad('operazione sconosciuta', 404)
  resetState()
  return NextResponse.json({ ok: true })
}
