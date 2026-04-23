import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { config } from '@/lib/db'
import { db } from '@/lib/db/client'

function resolveSafe(vaultPath: string, relative: string) {
  const abs = path.resolve(vaultPath, relative)
  if (!abs.startsWith(path.resolve(vaultPath))) throw new Error('Accesso negato')
  return abs
}

// POST — crea cartella
export async function POST(req: Request) {
  try {
    const vaultPath = config.get('vault_path') as string | undefined
    if (!vaultPath) return NextResponse.json({ error: 'Vault non configurato' }, { status: 400 })
    const { dir } = await req.json()
    if (!dir) return NextResponse.json({ error: 'dir mancante' }, { status: 400 })
    const abs = resolveSafe(vaultPath, dir)
    fs.mkdirSync(abs, { recursive: true })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE — elimina file o cartella
export async function DELETE(req: Request) {
  try {
    const vaultPath = config.get('vault_path') as string | undefined
    if (!vaultPath) return NextResponse.json({ error: 'Vault non configurato' }, { status: 400 })
    const { target } = await req.json()
    if (!target) return NextResponse.json({ error: 'target mancante' }, { status: 400 })
    const abs = resolveSafe(vaultPath, target)
    if (!fs.existsSync(abs)) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

    const stat = fs.statSync(abs)
    if (stat.isDirectory()) {
      fs.rmSync(abs, { recursive: true, force: true })
    } else {
      fs.unlinkSync(abs)
      // Rimuovi index dal DB
      const normPath = abs.replace(/\\/g, '/')
      db.prepare("DELETE FROM memories WHERE context_type = 'vault' AND context_id = ?").run(abs)
      db.prepare("DELETE FROM memories WHERE context_type = 'vault' AND context_id = ?").run(normPath)
      db.prepare("DELETE FROM memory_files WHERE source_path = ? OR source_path = ?").run(abs, normPath)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// PATCH — rinomina file o cartella
export async function PATCH(req: Request) {
  try {
    const vaultPath = config.get('vault_path') as string | undefined
    if (!vaultPath) return NextResponse.json({ error: 'Vault non configurato' }, { status: 400 })
    const { from, to } = await req.json()
    if (!from || !to) return NextResponse.json({ error: 'from/to mancanti' }, { status: 400 })
    const absFrom = resolveSafe(vaultPath, from)
    const absTo = resolveSafe(vaultPath, to)
    if (!fs.existsSync(absFrom)) return NextResponse.json({ error: 'Sorgente non trovata' }, { status: 404 })
    fs.renameSync(absFrom, absTo)
    // Aggiorna riferimenti nel DB
    const normFrom = absFrom.replace(/\\/g, '/')
    const normTo = absTo.replace(/\\/g, '/')
    db.prepare("UPDATE memories SET context_id = ? WHERE context_type = 'vault' AND (context_id = ? OR context_id = ?)").run(normTo, absFrom, normFrom)
    db.prepare("UPDATE memory_files SET source_path = ?, file_name = ? WHERE source_path = ? OR source_path = ?").run(normTo, path.basename(absTo), absFrom, normFrom)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
