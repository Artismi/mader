import { clients, siteAnalytics } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')
  const days = parseInt(searchParams.get('days') || '30')

  if (!clientId) return Response.json({ error: 'clientId mancante' }, { status: 400 })

  const client = clients.getById(clientId)
  if (!client) return Response.json({ error: 'Cliente non trovato' }, { status: 404 })
  if (!client.umami_website_id) return Response.json({ error: 'Nessun umami_website_id configurato per questo cliente' }, { status: 422 })

  const baseUrl = process.env.UMAMI_BASE_URL
  const apiKey = process.env.UMAMI_API_KEY
  if (!baseUrl || !apiKey) return Response.json({ error: 'UMAMI_BASE_URL o UMAMI_API_KEY non configurati' }, { status: 500 })

  const endAt = Date.now()
  const startAt = endAt - days * 24 * 60 * 60 * 1000

  const headers = { Authorization: `Bearer ${apiKey}` }

  // Fetch stats
  const statsRes = await fetch(
    `${baseUrl}/api/websites/${client.umami_website_id}/stats?startAt=${startAt}&endAt=${endAt}`,
    { headers }
  )
  if (!statsRes.ok) {
    const text = await statsRes.text()
    return Response.json({ error: `Umami stats error: ${statsRes.status} ${text}` }, { status: 502 })
  }
  const stats = await statsRes.json() as {
    pageviews: { value: number }
    sessions: { value: number }
    bounces: { value: number }
  }

  // Fetch top pages
  const pagesRes = await fetch(
    `${baseUrl}/api/websites/${client.umami_website_id}/metrics?type=url&startAt=${startAt}&endAt=${endAt}&limit=5`,
    { headers }
  )
  let topPages: string[] = []
  if (pagesRes.ok) {
    const pages = await pagesRes.json() as { x: string; y: number }[]
    topPages = pages.map(p => p.x)
  }

  const pageviews = stats.pageviews?.value ?? 0
  const sessions = stats.sessions?.value ?? 0
  const bounceRate = sessions > 0 ? Math.round((stats.bounces?.value ?? 0) / sessions * 100) : 0

  // Salva in cache (data odierna)
  const today = new Date().toISOString().split('T')[0]
  siteAnalytics.upsert(clientId, today, { pageviews, sessions, bounce_rate: bounceRate })

  return Response.json({ pageviews, sessions, bounceRate, topPages })
}

export async function POST(req: Request) {
  const { clientId, websiteId } = await req.json() as { clientId: string; websiteId: string }

  if (!clientId || !websiteId) return Response.json({ error: 'clientId e websiteId obbligatori' }, { status: 400 })

  const client = clients.getById(clientId)
  if (!client) return Response.json({ error: 'Cliente non trovato' }, { status: 404 })

  clients.update(clientId, { umami_website_id: websiteId })
  return Response.json({ success: true })
}
