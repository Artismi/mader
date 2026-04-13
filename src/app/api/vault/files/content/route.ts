import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { config } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const relativePath = searchParams.get('path')
    const vaultPath = config.get('vault_path')

    if (!vaultPath) {
      return NextResponse.json({ error: 'Vault path non configurato' }, { status: 400 })
    }

    if (!relativePath) {
      return NextResponse.json({ error: 'Percorso file non specificato' }, { status: 400 })
    }

    const absolutePath = path.resolve(vaultPath, relativePath)

    // Security check: must stay within vault
    if (!absolutePath.startsWith(path.resolve(vaultPath))) {
      return NextResponse.json({ error: 'Accesso negato al di fuori del vault' }, { status: 403 })
    }

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({ error: 'File non trovato' }, { status: 404 })
    }

    const stats = fs.statSync(absolutePath)
    if (stats.isDirectory()) {
      return NextResponse.json({ error: 'Il percorso è una directory' }, { status: 400 })
    }

    // Per ora supportiamo solo file markdown per l'anteprima
    const ext = path.extname(absolutePath).toLowerCase()
    if (ext !== '.md') {
      return NextResponse.json({ error: 'Tipo di file non supportato per l\'anteprima (solo .md)' }, { status: 400 })
    }

    const content = fs.readFileSync(absolutePath, 'utf-8')

    return NextResponse.json({ 
      content, 
      name: path.basename(absolutePath),
      relativePath 
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
