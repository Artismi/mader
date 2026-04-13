import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const nodes: any[] = []
    const links: any[] = []

    // 1. Clients (Hubs)
    const clients = db.prepare('SELECT id, name, created_at FROM clients').all() as any[]
    clients.forEach(c => {
      nodes.push({ id: c.id, name: c.name, type: 'client', importance: 1.0 })
    })

    // 2. Projects
    const projects = db.prepare('SELECT id, name, client_id FROM design_projects').all() as any[]
    projects.forEach(p => {
      nodes.push({ id: p.id, name: p.name, type: 'project', importance: 0.7 })
      if (p.client_id) {
        links.push({ source: p.id, target: p.client_id, relation: 'belongs_to' })
      }
    })

    // 3. Skills
    const skills = db.prepare('SELECT id, name FROM skills WHERE active = 1').all() as any[]
    skills.forEach(s => {
      nodes.push({ id: s.id, name: s.name, type: 'skill', importance: 0.8 })
    })

    // 4. Memories
    const memories = db.prepare("SELECT id, content, context_type, context_id, importance FROM memories WHERE context_type != 'vault'").all() as any[]
    memories.forEach(m => {
      nodes.push({ 
        id: m.id, 
        name: m.content.length > 50 ? m.content.substring(0, 47) + '...' : m.content, 
        full_content: m.content,
        type: 'memory', 
        importance: m.importance || 0.5 
      })
      
      // Implicit link to context entity
      if (m.context_id) {
        links.push({ source: m.id, target: m.context_id, relation: 'contextual' })
      }
    })

    // 5. Explicit Memory Links
    const mLinks = db.prepare('SELECT source_id, target_id, relation FROM memory_links').all() as any[]
    mLinks.forEach(l => {
      links.push({ source: l.source_id, target: l.target_id, relation: l.relation })
    })

    // 6. Validation: remove links pointing to non-existent nodes
    const nodeIds = new Set(nodes.map(n => n.id))
    const validLinks = links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))

    return NextResponse.json({ nodes, links: validLinks })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
