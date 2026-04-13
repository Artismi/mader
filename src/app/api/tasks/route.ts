import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'todo'
    const category = searchParams.get('category') || undefined
    const limit = parseInt(searchParams.get('limit') || '20')

    const result = tasks.getAll({ status, category, limit })

    return NextResponse.json({ tasks: result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, type, category, deadline, client_id, status } = body

    if (!title || !type) {
      return NextResponse.json({ error: 'title e type sono obbligatori' }, { status: 400 })
    }

    const task = tasks.create({
      title,
      type,
      category: category || 'task',
      deadline,
      client_id,
      status: status || 'todo',
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'id obbligatorio' }, { status: 400 })
    tasks.update(id, data)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id obbligatorio' }, { status: 400 })
    tasks.delete(id)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
