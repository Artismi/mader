import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { config } from '@/lib/db'

const ALLOWED_EXTS = new Set(['.md', '.txt', '.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp'])

export async function POST(req: Request) {
  try {
    const vaultPath = config.get('vault_path') as string | undefined
    if (!vaultPath) return NextResponse.json({ error: 'Vault path non configurato' }, { status: 400 })

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    const targetDir = (formData.get('dir') as string) || ''

    if (!files.length) return NextResponse.json({ error: 'Nessun file ricevuto' }, { status: 400 })

    const destDir = path.resolve(vaultPath, targetDir)
    if (!destDir.startsWith(path.resolve(vaultPath))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

    const saved: string[] = []
    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase()
      if (!ALLOWED_EXTS.has(ext)) continue

      const destPath = path.join(destDir, file.name)
      const buffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(destPath, buffer)
      saved.push(file.name)
    }

    // Chokidar rileverà i file automaticamente e partirà l'indicizzazione
    return NextResponse.json({ ok: true, saved })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
