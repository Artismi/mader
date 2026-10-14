import { NextResponse } from 'next/server'
import { listActions } from '@/lib/kernel'

/**
 * Elenco delle azioni del nucleo per Ctrl+K e per chi integra Creative OS
 * (docs/sistema-centrale.md §3.1). GET ?tutte=1 include anche le letture.
 */
export async function GET(req: Request) {
  return NextResponse.json(listActions({ all: !!new URL(req.url).searchParams.get('tutte') }))
}
