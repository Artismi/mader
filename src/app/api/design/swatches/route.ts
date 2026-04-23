import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/db'

function key(projectId: string) {
  return `canvas_swatches_${projectId}`
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId') ?? 'global'
  const raw = config.get(key(projectId))
  const swatches = raw ? JSON.parse(raw) : []
  return NextResponse.json({ swatches })
}

export async function POST(req: NextRequest) {
  const { projectId = 'global', swatches } = await req.json()
  config.set(key(projectId), JSON.stringify(swatches))
  return NextResponse.json({ ok: true })
}
