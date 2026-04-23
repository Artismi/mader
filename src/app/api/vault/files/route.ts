import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { config } from '@/lib/db'
import { db } from '@/lib/db/client'

const SUPPORTED_EXTS = new Set(['md', 'txt', 'pdf', 'docx', 'png', 'jpg', 'jpeg', 'webp'])

function collectMdFiles(dir: string, vaultRoot: string): { name: string; relativePath: string; isDir: boolean }[] {
  const results: { name: string; relativePath: string; isDir: boolean }[] = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...collectMdFiles(full, vaultRoot))
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push({
          name: entry.name,
          relativePath: path.relative(vaultRoot, full).replace(/\\/g, '/'),
          isDir: false,
        })
      }
    }
  } catch { /* directory non leggibile */ }
  return results
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const relativePath = searchParams.get('path') || ''
    const recursive = searchParams.get('recursive') === 'true'
    const vaultPath = config.get('vault_path') as string | undefined

    if (!vaultPath) {
      return NextResponse.json({ error: 'Vault path non configurato' }, { status: 400 })
    }

    const absolutePath = path.resolve(vaultPath, relativePath)

    // Security check: must stay within vault
    if (!absolutePath.startsWith(path.resolve(vaultPath))) {
      return NextResponse.json({ error: 'Accesso negato al di fuori del vault' }, { status: 403 })
    }

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({ error: 'Percorso non trovato' }, { status: 404 })
    }

    const stats = fs.statSync(absolutePath)
    if (!stats.isDirectory()) {
      return NextResponse.json({ error: 'Il percorso non è una directory' }, { status: 400 })
    }

    // Modalità ricorsiva: restituisce tutti i .md file flat (per il file picker della chat)
    if (recursive) {
      const files = collectMdFiles(absolutePath, vaultPath)
      files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
      return NextResponse.json({ files, currentPath: relativePath })
    }

    // Carica stati di indicizzazione da DB per la cartella corrente
    const absResolved = absolutePath
    const fileStatuses = db.prepare(
      "SELECT source_path, index_status, error_msg, chunk_count FROM memory_files WHERE source_path LIKE ?"
    ).all(absResolved.replace(/\\/g, '/') + '%') as { source_path: string; index_status: string; error_msg: string | null; chunk_count: number }[]
    const statusMap = new Map(fileStatuses.map(r => [r.source_path.replace(/\\/g, '/'), r]))

    const entries = fs.readdirSync(absolutePath, { withFileTypes: true })
    const files = entries.map(entry => {
      const fullPath = path.join(absolutePath, entry.name)
      const baseStats = fs.statSync(fullPath)
      const ext = path.extname(entry.name).toLowerCase().replace('.', '')
      const normPath = fullPath.replace(/\\/g, '/')
      const status = statusMap.get(normPath)

      return {
        name: entry.name,
        isDir: entry.isDirectory(),
        size: baseStats.size,
        mtime: baseStats.mtime,
        ext,
        relativePath: path.relative(vaultPath, fullPath).replace(/\\/g, '/'),
        indexStatus: entry.isDirectory() ? null : (SUPPORTED_EXTS.has(ext) ? (status?.index_status ?? 'pending') : null),
        errorMsg: status?.error_msg ?? null,
        chunkCount: status?.chunk_count ?? 0,
      }
    })

    // Ordina: prima cartelle, poi file alfabetico
    const sorted = files.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1
      if (!a.isDir && b.isDir) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({ files: sorted, currentPath: relativePath })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
