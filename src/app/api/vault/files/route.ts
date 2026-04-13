import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { config } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const relativePath = searchParams.get('path') || ''
    const vaultPath = config.get('vault_path')

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

    const entries = fs.readdirSync(absolutePath, { withFileTypes: true })
    const files = entries.map(entry => {
      const fullPath = path.join(absolutePath, entry.name)
      const baseStats = fs.statSync(fullPath)
      const ext = path.extname(entry.name).toLowerCase()
      
      return {
        name: entry.name,
        isDir: entry.isDirectory(),
        size: baseStats.size,
        mtime: baseStats.mtime,
        ext: ext.replace('.', ''),
        relativePath: path.relative(vaultPath, fullPath).replace(/\\/g, '/')
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
