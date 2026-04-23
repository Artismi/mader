/**
 * Proxy route: Next.js → CrewAI microservice (localhost:8765)
 * Usato dal route.ts principale quando il dispatcher riconosce un task canvas.
 */

import { NextResponse } from 'next/server'

const CREW_URL = process.env.CREW_SERVICE_URL ?? 'http://127.0.0.1:8765'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const crewRes = await fetch(`${CREW_URL}/canvas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000), // 3 min max
    })

    if (!crewRes.ok) {
      const err = await crewRes.text()
      return NextResponse.json({ error: `Crew service error: ${err}` }, { status: 502 })
    }

    const result = await crewRes.json()
    return NextResponse.json(result)

  } catch (err: any) {
    // Se il crew service non è disponibile → restituisce errore gestibile dal dispatcher
    if (err.name === 'TimeoutError' || err.cause?.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'crew_unavailable', detail: 'Microservizio Python non raggiungibile' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const res = await fetch(`${CREW_URL}/health`, { signal: AbortSignal.timeout(3_000) })
    const data = await res.json()
    return NextResponse.json({ crew_available: true, ...data })
  } catch {
    return NextResponse.json({ crew_available: false })
  }
}
