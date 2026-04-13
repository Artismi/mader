// Creative OS — Memory Route
// Updated: 2026-04-06 02:06
import { NextResponse } from 'next/server'
import { memories } from '@/lib/db'
import { saveMemory } from '@/lib/vault'

export async function GET() {
  try {
    const list = memories.getAll({ excludeVault: true })
    return NextResponse.json({ memories: list })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { content, context_type, context_id, tier, importance } = data
    if (!content) return NextResponse.json({ error: 'Contenuto mancante' }, { status: 400 })

    await saveMemory(content, context_type, context_id, tier, importance)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json()
    const { id, ...updates } = data
    if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })

    memories.update(id, updates)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })
    
    memories.delete(id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
