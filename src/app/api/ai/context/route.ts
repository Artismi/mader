import { NextResponse } from 'next/server'
import { buildContext } from '@/lib/ai/context'
import { skills, tasks, messages } from '@/lib/db'
import { getVaultStats } from '@/lib/vault'

/** Query usata solo per anteprima RAG/memorie in dashboard; se assente evita stringa vuota (embedding debole). */
const DEFAULT_CONTEXT_PREVIEW_QUERY =
  'contesto lavorativo task clienti progetti documentazione brand'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const rawQ = searchParams.get('q')
    const query = rawQ != null && rawQ.trim() !== '' ? rawQ.trim() : DEFAULT_CONTEXT_PREVIEW_QUERY

    const ctx = await buildContext(query)
    
    // Fetch real skills from DB
    const dbSkills = skills.getAll().map(s => ({
      name: s.name,
      active: s.active,
      triggers: s.triggers
    }))

    // Generate recent activities from real data
    const recentActivities: string[] = []
    
    // Last finished tasks
    const doneTasks = tasks.getAll({ status: 'done', limit: 2 })
    doneTasks.forEach(t => {
      recentActivities.push(`[Task] Completato: "${t.title}" per ${t.client_name || 'Studio'}`)
    })

    // Last messages
    const recentMsgs = messages.getAll({ limit: 2 })
    recentMsgs.forEach(m => {
       const time = new Date(m.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
       recentActivities.push(`[${time}] Nuova mail registrata: "${m.subject || 'Senza Oggetto'}"`)
    })

    if (recentActivities.length === 0) {
       recentActivities.push(`[System] RAG Context Optimization completata`)
       recentActivities.push(`[System] Nessuna variazione recente nei database`)
    }

    // Briefing visivo: snapshot operativo + anteprime (in chat il prompt usa la stessa logica in route.ts)
    const ragPreview =
      ctx.ragChunks.length > 0
        ? `\n\n---\n## Dal vault (anteprima RAG, query: "${query.slice(0, 80)}${query.length > 80 ? '…' : ''}")\n${ctx.ragChunks
            .map((c, i) => `[${i + 1}] ${c.length > 600 ? `${c.slice(0, 600)}…` : c}`)
            .join('\n---\n')}`
        : ''
    const memoriesPreview =
      ctx.memories.length > 0
        ? `\n\n---\n## Memorie richiamate (anteprima)\n${ctx.memories.map(m => `- ${m.length > 400 ? `${m.slice(0, 400)}…` : m}`).join('\n')}`
        : ''

    const globalStats = getVaultStats()
    const snapshot = [ctx.snapshot, ragPreview, memoriesPreview].filter(Boolean).join('')

    return NextResponse.json({
      snapshot,
      ragCount: globalStats.chunks,
      memoryCount: globalStats.totalMemories,
      timestamp: new Date().toISOString(),
      skills: dbSkills,
      recentActivities,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

