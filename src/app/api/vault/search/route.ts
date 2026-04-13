import { NextResponse } from 'next/server'
import { searchVault } from '@/lib/vault'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  if (!q) return NextResponse.json({ results: [] })

  const results = await searchVault(q, 5)
  return NextResponse.json({ results })
}
