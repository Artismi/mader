import { NextResponse } from 'next/server'
import { editorialPosts } from '@/lib/db'
import type { EditorialPost } from '@/lib/db'
import { instagramScores } from '@/lib/ai/instagram'

// Circuito Instagram: ogni post IG con testo viene valutato in automatico
// (linter caption + human score) e il risultato finisce nei metadati.
function withInstagramScores(channels: string[] | undefined, content: string | undefined, metadata?: Record<string, unknown>) {
  if (!channels?.includes('instagram') || !content?.trim()) return metadata
  return { ...(metadata ?? {}), circuit: 'instagram', ...instagramScores(content) }
}

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
    const metadata = withInstagramScores(data.channels, data.content, data.metadata)
    const post = editorialPosts.create(metadata ? { ...data, metadata } : data)
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
      if (data.content !== undefined || data.channels !== undefined) {
        const current = editorialPosts.getById(id)
        const metadata = withInstagramScores(
          data.channels ?? current?.channels,
          data.content ?? current?.content,
          data.metadata ?? current?.metadata,
        )
        if (metadata) data.metadata = metadata
      }
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
