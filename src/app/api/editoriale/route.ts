import { NextResponse } from 'next/server'
import { editorialPosts } from '@/lib/db'
import type { EditorialPost } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')
  const posts = clientId
    ? editorialPosts.getByClient(clientId)
    : editorialPosts.getAll()
  return NextResponse.json({ posts })
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const post = editorialPosts.create(data)
    return NextResponse.json({ post })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, ...data } = await req.json()
    if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

    if (data.editorial_status && Object.keys(data).length === 1) {
      editorialPosts.updateStatus(id, data.editorial_status as EditorialPost['editorial_status'])
    } else {
      editorialPosts.update(id, data)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })
  editorialPosts.delete(id)
  return NextResponse.json({ ok: true })
}
