import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { searchVault } from '@/lib/vault'

// POST — ricerca semantica RAG (usata dal microservizio Python CrewAI)
export async function POST(req: Request) {
  try {
    const body = await req.json() as { query?: string; topK?: number }
    const query = body.query?.trim()
    if (!query) return NextResponse.json({ chunks: [] })
    const chunks = await searchVault(query, body.topK ?? 4)
    return NextResponse.json({ chunks })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, chunks: [] }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    if (!q) return NextResponse.json({ results: [] })

    const pattern = `%${q}%`
    const results: any[] = []

    // 1. Memories (including vault facts if search matches)
    const mems = db.prepare(`
      SELECT id, content, context_type, tier, importance, 'memory' as category
      FROM memories
      WHERE content LIKE ?
      ORDER BY importance DESC, created_at DESC
      LIMIT 10
    `).all(pattern) as any[]
    results.push(...mems)

    // 2. Skills (Handbooks)
    const sks = db.prepare(`
      SELECT id, name as content, 'skill' as context_type, 'semantic' as tier, 1.0 as importance, 'skill' as category
      FROM skills
      WHERE name LIKE ? OR description LIKE ?
      LIMIT 5
    `).all(pattern, pattern) as any[]
    results.push(...sks)

    // 3. Briefs / Projects
    const projects = db.prepare(`
      SELECT id, name as content, 'progetto' as context_type, 'episodic' as tier, 0.7 as importance, 'project' as category
      FROM design_projects
      WHERE name LIKE ?
      LIMIT 5
    `).all(pattern) as any[]
    results.push(...projects)

    // 4. Clients
    const clis = db.prepare(`
      SELECT id, name as content, 'cliente' as context_type, 'semantic' as tier, 0.9 as importance, 'client' as category
      FROM clients
      WHERE name LIKE ?
      LIMIT 5
    `).all(pattern) as any[]
    results.push(...clis)

    return NextResponse.json({ results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
