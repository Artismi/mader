/**
 * Vault — chokidar watcher + Gemini embeddings + JS cosine similarity RAG
 * Non usa sqlite-vec (prebuilt non disponibile per Node 24).
 * Funziona perfettamente per vault personali < 10.000 chunks.
 * Supporta: .md .txt .pdf .docx .png .jpg .jpeg .webp
 */

import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db/client'
import { config } from '@/lib/db'
import { google } from '@ai-sdk/google'
import { anthropic } from '@ai-sdk/anthropic'
import { embed, generateText } from 'ai'

const SUPPORTED_EXTS = new Set(['.md', '.txt', '.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp'])
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

// ─── Globals ──────────────────────────────────────────────────────────────────

declare global {
  var __vault_watcher: ReturnType<typeof import('chokidar').watch> | undefined
}

// ─── Chunker — Parent-Document RAG ───────────────────────────────────────────
//
// Strategia: ogni sezione H1/H2 diventa un "parent chunk" (contesto esteso).
// Il parent viene suddiviso in "child chunks" (~200 parole) per la ricerca vettoriale.
// La ricerca trova i child più simili → restituisce il parent completo → contesto ricco.

interface ParentChunk { heading: string; text: string }
interface ChildChunk  { heading: string; text: string; parentIdx: number }

function chunkMarkdownParents(content: string, filePath: string): ParentChunk[] {
  const fileName = path.basename(filePath, path.extname(filePath))
  const lines = content.split('\n')
  const parents: ParentChunk[] = []
  let heading = fileName
  let buf: string[] = []

  const flush = () => {
    const text = buf.join('\n').trim()
    if (text.length > 60) parents.push({ heading, text })
    buf = []
  }

  for (const line of lines) {
    if (/^#{1,2} /.test(line)) {
      flush()
      heading = line.replace(/^#{1,2} /, '').trim()
    } else {
      buf.push(line)
    }
  }
  flush()
  return parents
}

function splitParentIntoChildren(parent: ParentChunk, parentIdx: number, wordsPerChild = 180): ChildChunk[] {
  const words = parent.text.split(/\s+/).filter(Boolean)
  const children: ChildChunk[] = []
  const overlap = 30

  for (let i = 0; i < words.length; i += wordsPerChild - overlap) {
    const slice = words.slice(i, i + wordsPerChild).join(' ')
    if (slice.trim().length > 80) {
      children.push({ heading: parent.heading, text: slice, parentIdx })
    }
    if (i + wordsPerChild >= words.length) break
  }
  // Se il parent è corto, un solo child
  if (children.length === 0 && parent.text.length > 60) {
    children.push({ heading: parent.heading, text: parent.text, parentIdx })
  }
  return children
}

// Compat: usato da chunkText (PDF/DOCX/TXT)
function chunkMarkdown(content: string, filePath: string): { heading: string; text: string }[] {
  return chunkMarkdownParents(content, filePath)
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

// ─── Memory Files helpers ──────────────────────────────────────────────────────

function getFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.md' || ext === '.txt') return 'md'
  if (ext === '.pdf') return 'pdf'
  if (ext === '.docx') return 'docx'
  if (IMAGE_EXTS.has(ext)) return 'image'
  return 'other'
}

function upsertMemoryFile(filePath: string, status: string, chunkCount = 0, errorMsg?: string) {
  const existing = db.prepare('SELECT id FROM memory_files WHERE source_path = ?').get(filePath) as { id: string } | undefined
  const now = new Date().toISOString()
  if (existing) {
    db.prepare(`UPDATE memory_files SET index_status = ?, error_msg = ?, chunk_count = ?, indexed_at = ?, size_bytes = ? WHERE source_path = ?`)
      .run(status, errorMsg ?? null, chunkCount, status === 'indexed' ? now : null, fs.existsSync(filePath) ? fs.statSync(filePath).size : null, filePath)
  } else {
    db.prepare(`INSERT INTO memory_files (id, source_path, file_name, file_type, index_status, error_msg, chunk_count, size_bytes, indexed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), filePath, path.basename(filePath), getFileType(filePath), status, errorMsg ?? null, chunkCount, fs.existsSync(filePath) ? fs.statSync(filePath).size : null, status === 'indexed' ? now : null)
  }
}

// ─── Text extractors ──────────────────────────────────────────────────────────

async function extractPdf(filePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const buffer = fs.readFileSync(filePath)
  const data = await pdfParse(buffer)
  return data.text
}

async function extractDocx(filePath: string): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ path: filePath })
  return result.value
}

async function describeImage(filePath: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return ''
  const ext = path.extname(filePath).slice(1).toLowerCase()
  const mimeMap: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }
  const mime = mimeMap[ext] || 'image/png'
  const imageData = fs.readFileSync(filePath).toString('base64')
  const { text } = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    messages: [{
      role: 'user',
      content: [
        { type: 'image', image: imageData },
        { type: 'text', text: 'Descrivi questa immagine in modo dettagliato per l\'indicizzazione AI: colori, soggetti, testo visibile, stile, uso probabile. Rispondi solo con la descrizione, senza preamboli.' }
      ]
    }]
  })
  return text
}

function chunkText(text: string, source: string, chunkSize = 1200, overlap = 150): { heading: string; text: string }[] {
  const fileName = path.basename(source, path.extname(source))
  const words = text.split(/\s+/).filter(Boolean)
  const chunks: { heading: string; text: string }[] = []
  let i = 0
  let chunkIdx = 0
  while (i < words.length) {
    const slice = words.slice(i, i + chunkSize).join(' ')
    if (slice.trim().length > 80) {
      chunks.push({ heading: `${fileName} — parte ${chunkIdx + 1}`, text: slice })
      chunkIdx++
    }
    i += chunkSize - overlap
  }
  return chunks
}

// ─── Indexer ──────────────────────────────────────────────────────────────────

export async function indexFile(filePath: string): Promise<void> {
  if (!process.env.GEMINI_API_KEY) return
  const ext = path.extname(filePath).toLowerCase()
  if (!SUPPORTED_EXTS.has(ext)) return

  upsertMemoryFile(filePath, 'indexing')

  try {
    db.prepare("DELETE FROM memories WHERE context_type = 'vault' AND context_id = ?").run(filePath)

    let totalChunks = 0

    if (ext === '.md' || ext === '.txt') {
      // Parent-Document RAG: indicizza sia parent (contesto) che child (ricerca)
      const content = fs.readFileSync(filePath, 'utf-8')
      const parents = chunkMarkdownParents(content, filePath)

      for (let pi = 0; pi < parents.length; pi++) {
        const parent = parents[pi]
        const parentId = randomUUID()
        const parentText = `${parent.heading}\n${parent.text}`

        // Salva parent (no embedding — usato solo come contesto esteso)
        db.prepare(`INSERT INTO memories (id, content, context_type, context_id, tier, parent_id)
          VALUES (?, ?, 'vault', ?, 'vault_parent', NULL)`)
          .run(parentId, parentText, filePath)

        // Salva child chunks con embedding + riferimento al parent
        const children = splitParentIntoChildren(parent, pi)
        for (const child of children) {
          const childText = `${child.heading}\n${child.text}`
          const embedding = await getEmbedding(childText)
          db.prepare(`INSERT INTO memories (id, content, context_type, context_id, embedding, parent_id)
            VALUES (?, ?, 'vault', ?, ?, ?)`)
            .run(randomUUID(), childText, filePath, toBuffer(embedding), parentId)
          totalChunks++
        }
      }
    } else if (ext === '.pdf') {
      const text = await extractPdf(filePath)
      const chunks = chunkText(text, filePath)
      for (const chunk of chunks) {
        const fullText = `${chunk.heading}\n${chunk.text}`
        const embedding = await getEmbedding(fullText)
        db.prepare(`INSERT INTO memories (id, content, context_type, context_id, embedding) VALUES (?, ?, 'vault', ?, ?)`)
          .run(randomUUID(), fullText, filePath, toBuffer(embedding))
        totalChunks++
      }
    } else if (ext === '.docx') {
      const text = await extractDocx(filePath)
      const chunks = chunkText(text, filePath)
      for (const chunk of chunks) {
        const fullText = `${chunk.heading}\n${chunk.text}`
        const embedding = await getEmbedding(fullText)
        db.prepare(`INSERT INTO memories (id, content, context_type, context_id, embedding) VALUES (?, ?, 'vault', ?, ?)`)
          .run(randomUUID(), fullText, filePath, toBuffer(embedding))
        totalChunks++
      }
    } else if (IMAGE_EXTS.has(ext)) {
      const description = await describeImage(filePath)
      if (description) {
        const embedding = await getEmbedding(description)
        db.prepare(`INSERT INTO memories (id, content, context_type, context_id, embedding) VALUES (?, ?, 'vault', ?, ?)`)
          .run(randomUUID(), `${path.basename(filePath)}\n${description}`, filePath, toBuffer(embedding))
        totalChunks++
      }
    }

    upsertMemoryFile(filePath, 'indexed', totalChunks)
  } catch (err) {
    console.error('[vault] indexFile error:', filePath, err)
    upsertMemoryFile(filePath, 'error', 0, String(err))
  }
}

export async function deleteFileIndex(filePath: string): Promise<void> {
  db.prepare("DELETE FROM memories WHERE context_type = 'vault' AND context_id = ?").run(filePath)
  db.prepare("DELETE FROM memory_files WHERE source_path = ?").run(filePath)
}

// ─── RAG Search ───────────────────────────────────────────────────────────────

export async function searchVault(query: string, topK = 4): Promise<string[]> {
  if (!process.env.GEMINI_API_KEY) return []

  // Cerca tra i child chunks (hanno embedding)
  const rows = db.prepare(
    "SELECT id, content, embedding, parent_id FROM memories WHERE context_type = 'vault' AND embedding IS NOT NULL AND (tier IS NULL OR tier != 'vault_parent')"
  ).all() as { id: string; content: string; embedding: Buffer; parent_id: string | null }[]

  if (rows.length === 0) return []

  try {
    const queryEmb = await getEmbedding(query)
    const scored = rows
      .map(r => ({ id: r.id, content: r.content, parent_id: r.parent_id, score: cosine(queryEmb, fromBuffer(r.embedding)) }))
      .sort((a, b) => b.score - a.score)
      .filter(r => r.score > 0.45)
      .slice(0, topK)

    // Parent-Document RAG: se il child ha un parent, restituisci il contesto esteso del parent
    return scored.map(r => {
      if (r.parent_id) {
        const parent = db.prepare("SELECT content FROM memories WHERE id = ?").get(r.parent_id) as { content: string } | undefined
        if (parent) return parent.content
      }
      return r.content
    })
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
    const pattern = path.join(vaultPath, '**', '*.{md,txt,pdf,docx,png,jpg,jpeg,webp}').replace(/\\/g, '/')
    global.__vault_watcher = chokidar.watch(pattern, { persistent: true, ignoreInitial: false })

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
