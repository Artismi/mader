import { tasks, clients, messages, bookings, contextInstructions } from '@/lib/db'
import { searchVault, searchMemories } from '@/lib/vault'
import { readFileSync } from 'fs'

export interface OperativeContext {
  snapshot: string
  ragChunks: string []
  memories: string []
  clientVaults: string []      // vault content per ogni cliente rilevato nella query
  activatedFiles: string []    // context_instructions attivi
}

/**
 * Builds a synthetic, high-density operative snapshot of the user's situation.
 * Follows the "Zero-Fluff" principle: only adds sections if they contain relevant data.
 */
export async function buildContext(userQuery: string): Promise<OperativeContext> {
  const now = new Date()
  const lines: string [] = []

  // 1. TIME CONTEXT
  const dateStr = now.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  lines.push(`## Contesto: ${dateStr}, ${timeStr}\n`)

  // 2. SNAPSHOT DATA
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  
  const in3days = new Date(now)
  in3days.setDate(in3days.getDate() + 3)

  // Fetching data
  const tTasks = tasks.getAll({
    status: 'todo',
    deadlineAfter: now.toISOString(),
    deadlineBefore: todayEnd.toISOString(),
    limit: 10
  })

  const oTasks = tasks.getOverdue(5)
  
  const nextTasks = tasks.getAll({
    status: 'todo',
    deadlineAfter: todayEnd.toISOString(),
    deadlineBefore: in3days.toISOString(),
    limit: 5
  })

  const unreadMsg = messages.getAll({
    unreadOnly: true,
    limit: 3
  })

  const nextBookings = bookings.getUpcoming().slice(0, 2)
  const activeClients = clients.getAll('cliente').slice(0, 5)

  // 3. FORMATTING (Zero-Fluff Approach)
  
  if (oTasks.length > 0) {
    lines.push('### ⚠ IN RITARDO')
    oTasks.forEach(t => {
      const d = t.deadline ? new Date(t.deadline).toLocaleDateString('it-IT') : '—'
      lines.push(`- [${t.id.slice(0, 8)}] ${t.title} [${t.client_name || '—'}] → scaduto il ${d}`)
    })
    lines.push('')
  }

  if (tTasks.length > 0) {
    lines.push('### OGGI')
    tTasks.forEach(t => {
      const d = t.deadline ? new Date(t.deadline).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '—'
      lines.push(`- [${t.id.slice(0, 8)}] ${t.title} [${t.client_name || '—'}] → ${d}`)
    })
    lines.push('')
  }

  if (nextTasks.length > 0) {
    lines.push('### PROSSIMI 3 GIORNI')
    nextTasks.forEach(t => {
      const d = t.deadline ? new Date(t.deadline).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'
      lines.push(`- [${t.id.slice(0, 8)}] ${t.title} [${t.client_name || '—'}] → ${d}`)
    })
    lines.push('')
  }

  if (nextBookings.length > 0) {
    lines.push('### APPUNTAMENTI')
    nextBookings.forEach(b => {
      const d = new Date(b.start_time).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      lines.push(`- ${b.title || 'Call'} con ${b.attendee_name} — ${d}`)
    })
    lines.push('')
  }

  if (unreadMsg.length > 0) {
    lines.push('### MESSAGGI NON LETTI')
    unreadMsg.forEach(m => {
      const content = m.content.length > 60 ? m.content.slice(0, 60) + '...' : m.content
      lines.push(`- [${m.channel.toUpperCase()}] ${m.sender_name || 'Sconosciuto'}: ${m.subject || content}`)
    })
    lines.push('')
  }

  if (activeClients.length > 0) {
    lines.push('### CLIENTI ATTIVI')
    lines.push(activeClients.map(c => c.name).join(' · '))
    lines.push('')
  }

  // 4. RAG SEARCH (Asynchronous)
  const ragChunks = await searchVault(userQuery, 4)
  const relevantMemories = await searchMemories(userQuery, 3)

  // 5. CLIENT VAULT — rileva nomi clienti nella query e carica il loro vault
  const clientVaults: string [] = []
  const allClients = clients.getAll()
  for (const client of allClients) {
    const nameLower = client.name.toLowerCase()
    const queryLower = userQuery.toLowerCase()
    if (queryLower.includes(nameLower)) {
      // Prima priorità: vault_md_content già in DB
      if (client.vault_md_content?.trim()) {
        clientVaults.push(`## Vault Cliente: ${client.name}\n${client.vault_md_content.trim()}`)
      } else if (client.vault_path) {
        // Fallback: leggi il file dal disco (sincrono, piccolo)
        try {
          const content = readFileSync(client.vault_path, 'utf-8')
          if (content.trim()) {
            clientVaults.push(`## Vault Cliente: ${client.name}\n${content.trim()}`)
          }
        } catch { /* file non leggibile — zero-fluff, ignora */ }
      }
    }
  }

  // 6. FILE ATTIVATI NEL CONTESTO — inietta sempre tutti i context_instructions attivi
  const activatedFiles: string [] = []
  const activeInstructions = contextInstructions.getAll()
  for (const ci of activeInstructions) {
    if (ci.instructions?.trim()) {
      // Estrai nome file dall'intero path per header leggibile
      const label = ci.file_path.split(/[\\/]/).pop() || ci.file_path
      activatedFiles.push(`## File Attivato: ${label}\n${ci.instructions.trim()}`)
    }
  }

  return {
    snapshot: lines.join('\n').trim(),
    ragChunks,
    memories: relevantMemories,
    clientVaults,
    activatedFiles,
  }
}
