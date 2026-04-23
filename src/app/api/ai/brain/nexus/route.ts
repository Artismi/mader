import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import path from 'path'

// Cosine similarity tra due buffer Float32Array
function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  const d = Math.sqrt(na) * Math.sqrt(nb)
  return d === 0 ? 0 : dot / d
}

function fromBuffer(buf: Buffer): Float32Array {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return new Float32Array(ab)
}

function fileTypeColor(fileType: string) {
  if (fileType === 'pdf') return 'pdf'
  if (fileType === 'image') return 'image'
  if (fileType === 'docx') return 'docx'
  return 'md'
}

export async function GET() {
  try {
    const nodes: any[] = []
    const links: any[] = []

    // 1. Clients (hub principali)
    const clients = db.prepare('SELECT id, name FROM clients').all() as any[]
    clients.forEach(c => nodes.push({ id: c.id, name: c.name, type: 'client', importance: 1.0 }))

    // 2. Projects
    const projects = db.prepare('SELECT id, name, client_id FROM design_projects').all() as any[]
    projects.forEach(p => {
      nodes.push({ id: p.id, name: p.name, type: 'project', importance: 0.7 })
      if (p.client_id) links.push({ source: p.id, target: p.client_id, relation: 'belongs_to' })
    })

    // 3. Skills attive
    const skills = db.prepare('SELECT id, name FROM skills WHERE active = 1').all() as any[]
    skills.forEach(s => nodes.push({ id: s.id, name: s.name, type: 'skill', importance: 0.8 }))

    // 4. Memorie AI (semantic + episodic)
    const memories = db.prepare("SELECT id, content, context_type, context_id, importance FROM memories WHERE context_type != 'vault'").all() as any[]
    memories.forEach(m => {
      nodes.push({
        id: m.id,
        name: m.content.length > 50 ? m.content.substring(0, 47) + '...' : m.content,
        full_content: m.content,
        type: 'memory',
        importance: m.importance || 0.5
      })
      if (m.context_id) links.push({ source: m.id, target: m.context_id, relation: 'contextual' })
    })

    // 5. File indicizzati (vault) — un nodo per file, non per chunk
    const memFiles = db.prepare(
      "SELECT id, source_path, file_name, file_type, chunk_count FROM memory_files WHERE index_status = 'indexed'"
    ).all() as { id: string; source_path: string; file_name: string; file_type: string; chunk_count: number }[]

    memFiles.forEach(f => {
      nodes.push({
        id: `file_${f.id}`,
        name: f.file_name,
        type: `file_${fileTypeColor(f.file_type)}`,
        importance: 0.5 + Math.min(f.chunk_count / 20, 0.4),
        file_type: f.file_type,
        source_path: f.source_path,
      })
    })

    // 6. Edge di similarità semantica tra file vault (cosine > 0.72)
    // Prendiamo il primo chunk embedding per ogni file
    const SIMILARITY_THRESHOLD = 0.72
    const MAX_FILE_EDGES = 80 // limite per non sovraffollare il grafo

    const fileEmbeddings: { fileId: string; emb: Float32Array }[] = []
    for (const f of memFiles) {
      const row = db.prepare(
        "SELECT embedding FROM memories WHERE context_type = 'vault' AND context_id = ? AND embedding IS NOT NULL LIMIT 1"
      ).get(f.source_path) as { embedding: Buffer } | undefined
      if (row?.embedding) {
        fileEmbeddings.push({ fileId: `file_${f.id}`, emb: fromBuffer(row.embedding) })
      }
    }

    let edgeCount = 0
    for (let i = 0; i < fileEmbeddings.length && edgeCount < MAX_FILE_EDGES; i++) {
      for (let j = i + 1; j < fileEmbeddings.length && edgeCount < MAX_FILE_EDGES; j++) {
        const sim = cosine(fileEmbeddings[i].emb, fileEmbeddings[j].emb)
        if (sim > SIMILARITY_THRESHOLD) {
          links.push({ source: fileEmbeddings[i].fileId, target: fileEmbeddings[j].fileId, relation: 'similar', strength: sim })
          edgeCount++
        }
      }
    }

    // 7. Link file vault → cliente (se il file è in una sottocartella con il nome del cliente)
    clients.forEach(c => {
      const clientName = c.name.toLowerCase()
      memFiles.forEach(f => {
        const filePath = f.source_path.toLowerCase().replace(/\\/g, '/')
        if (filePath.includes(`/clienti/${clientName}`) || filePath.includes(`/${clientName}/`)) {
          links.push({ source: `file_${f.id}`, target: c.id, relation: 'belongs_to' })
        }
      })
    })

    // 8. Explicit memory links
    const mLinks = db.prepare('SELECT source_id, target_id, relation FROM memory_links').all() as any[]
    mLinks.forEach(l => links.push({ source: l.source_id, target: l.target_id, relation: l.relation }))

    // 9. Rimuovi link con nodi inesistenti
    const nodeIds = new Set(nodes.map((n: any) => n.id))
    const validLinks = links.filter((l: any) => nodeIds.has(l.source) && nodeIds.has(l.target))

    return NextResponse.json({ nodes, links: validLinks })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
