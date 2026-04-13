import { NextResponse } from 'next/server'
import { socialAnalytics } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId mancante' }, { status: 400 })
  const metrics = socialAnalytics.getClientMetrics(clientId)
  return NextResponse.json({ metrics })
}

export async function POST(req: Request) {
  try {
    const { clientId, platform, metrics } = await req.json()
    socialAnalytics.upsertClientMetrics(clientId, platform, metrics)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
