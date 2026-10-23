import { NextResponse } from 'next/server'
import { ideas } from '@/lib/db'

// GET /api/ideas — tutte le idee con il nome del cliente (per i client component, es. Studio)
export async function GET() {
  try {
    return NextResponse.json(ideas.getAllWithClient())
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
