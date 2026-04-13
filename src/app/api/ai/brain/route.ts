import { NextResponse } from 'next/server'
import { skills, memories, config, contextInstructions, clients } from '@/lib/db'
import { DEFAULT_ARCHITECTURE } from '@/lib/ai/defaults'
import fs from 'node:fs'

export async function GET() {
  try {
    const archContent = config.get('architecture') || DEFAULT_ARCHITECTURE

    const allSkills = skills.getAll()

    const allMems = memories.getAll({ excludeVault: true })
    const semantic = allMems.filter(m => m.tier === 'semantic')
    const episodic = allMems.filter(m => m.tier === 'episodic')

    // COUNT vault chunks directly
    let vaultCount = 0
    try {
      const { getDb } = await import('@/lib/db/client')
      const dbInst = getDb()
      const row = dbInst.prepare("SELECT COUNT(*) as n FROM memories WHERE tier = 'vault' OR context_type = 'vault'").get() as { n: number }
      vaultCount = row?.n ?? 0
    } catch { /* fallback */ }

    const ctxInstructions = contextInstructions.getAll()

    // Vault top-level listing
    const vaultPath = config.get('vault_path') as string | undefined
    let vaultConfigured = false
    let topLevelFiles: { name: string; isDir: boolean; relativePath: string }[] = []
    if (vaultPath && fs.existsSync(vaultPath)) {
      vaultConfigured = true
      try {
        const entries = fs.readdirSync(vaultPath, { withFileTypes: true })
        topLevelFiles = entries.slice(0, 60).map(e => ({
          name: e.name,
          isDir: e.isDirectory(),
          relativePath: e.name,
        }))
      } catch { /* read error, non-blocking */ }
    }

    const activeSkills = allSkills.filter(s => s.active).length

    // Clients with their vault content (for Brain Editor)
    const allClients = clients.getAll().map(c => ({
      id: c.id,
      name: c.name,
      sector: c.sector ?? null,
      vault_md_content: c.vault_md_content ?? '',
    }))

    return NextResponse.json({
      architecture: { content: archContent },
      skills: allSkills,
      memories: { semantic, episodic, vaultCount },
      contextInstructions: ctxInstructions,
      vault: { configured: vaultConfigured, path: vaultPath ?? null, topLevelFiles },
      clients: allClients,
      stats: {
        totalMemories: allMems.length,
        vaultChunks: vaultCount,
        activeSkills,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    switch (body.type) {
      case 'architecture':
        if (typeof body.content !== 'string') return NextResponse.json({ error: 'content mancante' }, { status: 400 })
        config.set('architecture', body.content)
        break
      case 'skill':
        if (!body.data?.id) return NextResponse.json({ error: 'id skill mancante' }, { status: 400 })
        skills.update(body.data.id, body.data)
        break
      case 'memory':
        if (!body.id) return NextResponse.json({ error: 'id memoria mancante' }, { status: 400 })
        memories.update(body.id, body.data)
        break
      case 'context_instruction':
        if (!body.file_path) return NextResponse.json({ error: 'file_path mancante' }, { status: 400 })
        contextInstructions.upsert({ file_path: body.file_path, instructions: body.instructions ?? '' })
        break
      case 'client_vault':
        if (!body.id) return NextResponse.json({ error: 'id cliente mancante' }, { status: 400 })
        clients.update(body.id, { vault_md_content: body.vault_md_content ?? '' })
        break
      default:
        return NextResponse.json({ error: `Tipo non valido: ${body.type}` }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { type, id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })
    if (type === 'memory') {
      memories.delete(id)
    } else if (type === 'context_instruction') {
      contextInstructions.delete(id)
    } else {
      return NextResponse.json({ error: `Tipo non valido: ${type}` }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
