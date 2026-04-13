/**
 * Vault — chokidar watcher + Gemini embeddings + JS cosine similarity RAG
 * Non usa sqlite-vec (prebuilt non disponibile per Node 24).
 * Funziona perfettamente per vault personali < 10.000 chunks.
 */

import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db/client'
import { config } from '@/lib/db'
import { google } from '@ai-sdk/google'
import { embed } from 'ai'

// ─── Globals ──────────────────────────────────────────────────────────────────

declare global {
  var __vault_watcher: ReturnType<typeof import('chokidar').watch> | undefined
}

// ─── Chunker ──────────────────────────────────────────────────────────────────

function chunkMarkdown(content: string, filePath: string): { heading: string; text: string }[] {
  const fileName = path.basename(filePath, '.md')
  const lines = content.split('\n')
  const chunks: { heading: string; text: string }[] = []
  let heading = fileName
  let buf: string[] = []

  const flush = () => {
    const text = buf.join('\n').trim()
    if (text.length > 40) chunks.push({ heading, text })
    buf = []
  }

  for (const line of lines) {
    if (/^#{1,3} /.test(line)) {
      flush()
      heading = line.replace(/^#{1,3} /, '')
    } else {
      buf.push(line)
    }
  }
  flush()
  return chunks
}

// ─── Embeddings ───────────────────────────────────────────────────────────────

async function getEmbedding(text: string): Promise<Float32Array> {
  const { embedding } = await embed({
    model: google.textEmbeddingModel('text-embedding-004'),
    value: text.slice(0, 8000),
  })
  return new Float32Array(embedding)
}

function toBuffer(arr: Float32Array): Buffer {
  return Buffer.from(arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength))
}

function fromBuffer(buf: Buffer): Float32Array {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return new Float32Array(ab)
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

// ─── Indexer ──────────────────────────────────────────────────────────────────

export async function indexFile(filePath: string): Promise<void> {
  if (!process.env.GEMINI_API_KEY) return
  if (!filePath.endsWith('.md')) return

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    db.prepare("DELETE FROM memories WHERE context_type = 'vault' AND context_id = ?").run(filePath)

    const chunks = chunkMarkdown(content, filePath)
    for (const chunk of chunks) {
      const fullText = `${chunk.heading}\n${chunk.text}`
      const embedding = await getEmbedding(fullText)
      db.prepare(`
        INSERT INTO memories (id, content, context_type, context_id, embedding)
        VALUES (?, ?, 'vault', ?, ?)
      `).run(randomUUID(), fullText, filePath, toBuffer(embedding))
    }
  } catch (err) {
    console.error('[vault] indexFile error:', filePath, err)
  }
}

export async function deleteFileIndex(filePath: string): Promise<void> {
  db.prepare("DELETE FROM memories WHERE context_type = 'vault' AND context_id = ?").run(filePath)
}

// ─── RAG Search ───────────────────────────────────────────────────────────────

export async function searchVault(query: string, topK = 4): Promise<string[]> {
  if (!process.env.GEMINI_API_KEY) return []

  const rows = db.prepare(
    "SELECT content, embedding FROM memories WHERE context_type = 'vault' AND embedding IS NOT NULL"
  ).all() as { content: string; embedding: Buffer }[]

  if (rows.length === 0) return []

  try {
    const queryEmb = await getEmbedding(query)
    const scored = rows
      .map(r => ({ content: r.content, score: cosine(queryEmb, fromBuffer(r.embedding)) }))
      .sort((a, b) => b.score - a.score)
      .filter(r => r.score > 0.45)
      .slice(0, topK)
    return scored.map(r => r.content)
  } catch (e) {
    console.warn('[vault] searchVault embedding fallito (quota?), skip RAG:', (e as Error).message)
    return []
  }
}

// ─── Conversational Memory ───────────────────────────────────────────────────

async function autoLinkMemory(memoryId: string, content: string, embedding: Buffer | null) {
  if (!embedding) return;
  const queryEmb = fromBuffer(embedding);
  
  // Find top similar memory (EXCLUDING the new one)
  const rows = db.prepare("SELECT id, embedding FROM memories WHERE id != ? AND context_type != 'vault' AND embedding IS NOT NULL").all(memoryId) as { id: string, embedding: Buffer }[];
  
  if (rows.length === 0) return;
  
  const scored = rows
    .map(r => ({ id: r.id, score: cosine(queryEmb, fromBuffer(r.embedding)) }))
    .sort((a, b) => b.score - a.score)
    .filter(r => r.score > 0.85) // High threshold for auto-linking
    .slice(0, 1);
    
  if (scored.length > 0) {
    linkMemories(memoryId, scored[0].id, 'relates_to');
  }
}

export async function linkMemories(sourceId: string, targetId: string, relation: string = 'relates_to'): Promise<void> {
  const source_type = 'memory'; // Default for auto-linking
  const target_type = 'memory';
  
  db.prepare(`
    INSERT INTO memory_links (id, source_id, source_type, target_id, target_type, relation)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), sourceId, source_type, targetId, target_type, relation);
}

export function getRelatedMemories(memoryId: string): { id: string, content: string, relation: string }[] {
  return db.prepare(`
    SELECT m.id, m.content, l.relation
    FROM memories m
    JOIN memory_links l ON (l.target_id = m.id OR l.source_id = m.id)
    WHERE (l.source_id = ? AND l.target_id != ?) OR (l.target_id = ? AND l.source_id != ?)
  `).all(memoryId, memoryId, memoryId, memoryId) as { id: string, content: string, relation: string }[];
}

export async function saveMemory(
  content: string,
  contextType: string = 'general',
  contextId?: string,
  tier: 'semantic' | 'episodic' = 'episodic',
  importance: number = 0.5,
  id?: string,
  allowUpsert: boolean = false
): Promise<string> {
  let embedding: Buffer | null = null
  const finalId = id || randomUUID()

  // If allowUpsert and id is provided, check if we should delete old version
  if (allowUpsert && id) {
    db.prepare('DELETE FROM memories WHERE id = ?').run(id)
  } else if (allowUpsert && contextId && contextType === 'progetto') {
    // Specialized dedup for projects
    db.prepare("DELETE FROM memories WHERE context_type = 'progetto' AND context_id = ?").run(contextId)
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const emb = await getEmbedding(content)
      embedding = toBuffer(emb)
    } catch (e) {
      console.error('[memory] failed to generate embedding:', e)
    }
  }

  db.prepare(`
    INSERT INTO memories (id, content, context_type, context_id, tier, importance, last_accessed_at, embedding)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    finalId, 
    content, 
    contextType, 
    contextId ?? null, 
    tier, 
    importance, 
    new Date().toISOString(),
    embedding
  )

  // Lightweight Auto-Link (Phase 3)
  if (embedding) {
    autoLinkMemory(finalId, content, embedding).catch(e => console.error('[memory] auto-link failed:', e))
  }

  return finalId
}

export async function searchMemories(
  query: string,
  topK = 5,
  contextType?: string,
  tier?: 'semantic' | 'episodic'
): Promise<{ id: string; content: string; score: number }[]> {
  const sql = `
    SELECT id, content, embedding, tier, importance FROM memories 
    WHERE context_type != 'vault'
    ${contextType ? "AND context_type = ?" : ""}
    ${tier ? "AND tier = ?" : ""}
    ${process.env.GEMINI_API_KEY ? "AND embedding IS NOT NULL" : ""}
  `
  const params = []
  if (contextType) params.push(contextType)
  if (tier) params.push(tier)

  const rows = db.prepare(sql).all(...params) as { id: string; content: string; embedding: Buffer | null; tier: string; importance: number }[]

  if (rows.length === 0) return []

  // Semantic Search fallback to Date-based search if no API Key
  if (!process.env.GEMINI_API_KEY) {
    return rows.slice(0, topK).map(r => ({ id: r.id, content: r.content, score: 1 }))
  }

  try {
    const queryEmb = await getEmbedding(query)
    const scored = rows
      .filter(r => r.embedding !== null)
      .map(r => {
        const sim = r.embedding ? cosine(queryEmb, fromBuffer(r.embedding)) : 0
        // Pesa la similarità con l'importanza del tier (le memorie semantiche hanno un leggero boost)
        const tierBoost = r.tier === 'semantic' ? 1.1 : 1.0
        
        // --- HYBRID SEARCH (Phase 3): Lexical Booster ---
        // If the content contains the exact query (lowercase), apply a boost
        const lexicalBoost = r.content.toLowerCase().includes(query.toLowerCase()) ? 1.3 : 1.0
        
        return {
          id: r.id,
          content: r.content,
          score: sim * tierBoost * lexicalBoost * (0.8 + r.importance * 0.4) 
        }
      })
      .sort((a, b) => b.score - a.score)
      .filter(r => r.score > 0.45) 
      .slice(0, topK)

    // Update last_accessed_at for the retrieved memories
    const now = new Date().toISOString()
    const updateStmt = db.prepare("UPDATE memories SET last_accessed_at = ? WHERE id = ?")
    for (const s of scored) {
      updateStmt.run(now, s.id)
    }

    return scored
  } catch (e) {
    console.warn('[vault] searchMemories embedding fallito (quota?), fallback ordine cronologico:', (e as Error).message)
    return rows.slice(0, topK).map(r => ({ id: r.id, content: r.content, score: 1 }))
  }
}

// ─── Watcher ──────────────────────────────────────────────────────────────────

export function startVaultWatcher(vaultPath: string): void {
  if (!fs.existsSync(vaultPath)) {
    console.warn('[vault] path non trovato:', vaultPath)
    return
  }

  if (global.__vault_watcher) {
    global.__vault_watcher.close()
    global.__vault_watcher = undefined
  }

  // Lazy import chokidar per evitare problemi SSR
  import('chokidar').then(({ default: chokidar }) => {
    const pattern = path.join(vaultPath, '**', '*.md').replace(/\\/g, '/')
    global.__vault_watcher = chokidar.watch(pattern, { persistent: true })

    global.__vault_watcher
      .on('add', indexFile)
      .on('change', indexFile)
      .on('unlink', deleteFileIndex)

    console.log('[vault] watcher avviato su', vaultPath)
  })
}

export function initVaultWatcher(): void {
  const vaultPath = config.get('vault_path')
  if (vaultPath && !global.__vault_watcher) {
    startVaultWatcher(vaultPath)
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function ensureVaultInitialized(): string {
  let vaultPath = config.get('vault_path')
  if (!vaultPath) {
    // Default to project root if not set
    vaultPath = process.cwd()
    config.set('vault_path', vaultPath)
    console.log('[vault] auto-initialized to', vaultPath)
  }
  
  if (!global.__vault_watcher) {
    startVaultWatcher(vaultPath)
  }
  return vaultPath
}

export function getVaultStats(): { vaultPath: string; chunks: number; files: number; totalMemories: number; totalSkills: number } {
  const vaultPath = config.get('vault_path') || ''
  
  const vStats = db.prepare(
    "SELECT COUNT(*) as chunks, COUNT(DISTINCT context_id) as files FROM memories WHERE context_type = 'vault'"
  ).get() as { chunks: number; files: number }
  
  const mStats = db.prepare(
    "SELECT COUNT(*) as total FROM memories WHERE context_type != 'vault'"
  ).get() as { total: number }

  const sStats = db.prepare(
    "SELECT COUNT(*) as total FROM skills WHERE active = 1"
  ).get() as { total: number }

  return { 
    vaultPath, 
    chunks: vStats.chunks, 
    files: vStats.files, 
    totalMemories: mStats.total,
    totalSkills: sStats.total
  }
}
