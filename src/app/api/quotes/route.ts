import { NextResponse } from 'next/server'
import { quotes } from '@/lib/db'

export async function GET() {
  return NextResponse.json(quotes.getAll())
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { client_id, client_name, title, items, notes, canva_doc_url, expires_at } = body
    if (!client_name || !title) {
      return NextResponse.json({ error: 'client_name e title obbligatori' }, { status: 400 })
    }
    const total = (items || []).reduce((s: number, i: { qty: number; unit_price: number }) => s + i.qty * i.unit_price, 0)
    const quote = quotes.create({
      client_id, client_name, title,
      number: quotes.nextNumber(body.type || 'preventivo'),
      type: body.type || 'preventivo',
      status: 'bozza',
      items: items || [],
      total,
      notes,
      canva_doc_url,
      expires_at,
      issued_at: new Date().toISOString().split('T')[0],
    })
    return NextResponse.json({ quote })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })
    if (data.items !== undefined) {
      data.total = data.items.reduce((s: number, i: { qty: number; unit_price: number }) => s + i.qty * i.unit_price, 0)
    }
    quotes.update(id, data)
    return NextResponse.json({ ok: true, quote: quotes.getById(id) })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })
  quotes.delete(id)
  return NextResponse.json({ ok: true })
}
