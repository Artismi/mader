import { NextResponse } from 'next/server'
import { searchMemories } from '@/lib/vault'

export async function POST(req: Request) {
  try {
    const { query, contextType, topK } = await req.json() as {
      query: string
      contextType?: string
      topK?: number
    }

    if (!query?.trim()) {
      return NextResponse.json({ memories: [] })
    }

    const results = await searchMemories(
      query,
      topK ?? 5,
      contextType,
    )

    return NextResponse.json({
      memories: results.map(r => ({
        id: r.id,
        content: r.content,
        score: r.score,
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, memories: [] }, { status: 500 })
  }
}
