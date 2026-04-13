import { NextResponse } from 'next/server'
import { clients } from '@/lib/db'

export async function GET() {
  try {
    const all = clients.getAll()
    return NextResponse.json(all)
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
