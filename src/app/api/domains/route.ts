import { NextRequest, NextResponse } from 'next/server'
import { domains } from '@/lib/db'

export async function GET() {
  try {
    return NextResponse.json(domains.getAll())
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, url, status, domain_expires, hosting_expires, panel_url, notes } = body
    if (!name) return NextResponse.json({ error: 'name è obbligatorio' }, { status: 400 })
    const domain = domains.create({ name, url, status: status || 'live', domain_expires, hosting_expires, panel_url, notes })
    return NextResponse.json({ domain }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'id obbligatorio' }, { status: 400 })
    domains.update(id, data)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id obbligatorio' }, { status: 400 })
    domains.delete(id)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
