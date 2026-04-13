import { NextResponse } from 'next/server'
import { availabilitySlots } from '@/lib/db'

export async function GET() {
  return NextResponse.json({ slots: availabilitySlots.getAll() })
}

export async function POST(req: Request) {
  try {
    const { slots } = await req.json()
    availabilitySlots.replace(slots)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
