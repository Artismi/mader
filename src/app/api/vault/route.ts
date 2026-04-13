import { NextResponse } from 'next/server'
import { config } from '@/lib/db'
import { getVaultStats, startVaultWatcher, ensureVaultInitialized } from '@/lib/vault'
import { db } from '@/lib/db/client'

export async function GET() {
  const stats = getVaultStats()
  return NextResponse.json(stats)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { vaultPath } = body

    if (vaultPath) {
      config.set('vault_path', vaultPath)
    }

    const currentPath = ensureVaultInitialized()
    
    // Reset e re-indicizza tutto
    db.prepare("DELETE FROM memories WHERE context_type = 'vault'").run()
    startVaultWatcher(currentPath)

    return NextResponse.json({ ok: true, vaultPath: currentPath })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
