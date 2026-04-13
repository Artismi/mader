'use client'

import { useState } from 'react'
import { Brain, FolderOpen, RefreshCw, CheckCircle, AlertCircle, FileText, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VaultStats {
  vaultPath: string
  chunks: number
  files: number
}

export function VaultPanel({ initialStats }: { initialStats: VaultStats }) {
  const [stats, setStats] = useState(initialStats)
  const [vaultPath, setVaultPath] = useState(initialStats.vaultPath || '')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [searching, setSearching] = useState(false)

  const sync = async () => {
    if (!vaultPath.trim()) return
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultPath }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Aggiorna stats dopo 3s (il watcher indicizza in background)
      setTimeout(async () => {
        const r = await fetch('/api/vault')
        const s = await r.json()
        setStats(s)
      }, 3000)

      setSyncMsg({ type: 'ok', text: `Sincronizzazione avviata — il vault verrà indicizzato in background.` })
    } catch (err) {
      setSyncMsg({ type: 'err', text: err instanceof Error ? err.message : 'Errore' })
    } finally {
      setSyncing(false)
    }
  }

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    setSearchResults([])
    try {
      const res = await fetch(`/api/vault/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setSearchResults(data.results || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="h-full flex gap-4 overflow-hidden">

      {/* ── Configurazione ──────────────────────────────── */}
      <div className="w-[320px] flex-shrink-0 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
            <Brain className="w-4 h-4 text-accent/70" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white/80">Cervello</h1>
            <p className="text-[10px] text-white/30">Vault Obsidian + RAG</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
            <p className="text-2xl font-black text-white/80">{stats.files}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mt-0.5">File .md</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
            <p className="text-2xl font-black text-white/80">{stats.chunks}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mt-0.5">Chunks</p>
          </div>
        </div>

        {/* Vault path */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
            <FolderOpen className="w-3 h-3" /> Percorso vault
          </p>
          <input
            type="text"
            value={vaultPath}
            onChange={e => setVaultPath(e.target.value)}
            placeholder="C:/Users/Acer/Documents/vault"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/60 placeholder:text-white/15 outline-none focus:border-accent/30"
          />
          <button
            onClick={sync}
            disabled={syncing || !vaultPath.trim()}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors',
              vaultPath.trim()
                ? 'bg-accent/20 hover:bg-accent/30 text-accent'
                : 'bg-white/[0.04] text-white/20 cursor-not-allowed'
            )}
          >
            {syncing
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sincronizzazione...</>
              : <><RefreshCw className="w-3.5 h-3.5" /> Sincronizza vault</>
            }
          </button>

          {syncMsg && (
            <div className={cn(
              'flex items-start gap-2 text-[11px] rounded-lg p-2',
              syncMsg.type === 'ok'
                ? 'bg-green-500/10 text-green-400'
                : 'bg-red-500/10 text-red-400'
            )}>
              {syncMsg.type === 'ok'
                ? <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              }
              {syncMsg.text}
            </div>
          )}
        </div>

        {/* me.md hint */}
        <div className="rounded-xl border border-white/[0.04] p-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20 flex items-center gap-2">
            <FileText className="w-3 h-3" /> vault/_brain/me.md
          </p>
          <p className="text-[11px] text-white/25 leading-relaxed">
            Crea questo file con una descrizione di chi sei, come lavori e le tue priorità. Diventa il system prompt globale dell&apos;AI.
          </p>
        </div>

        {/* OPENAI_API_KEY status */}
        <div className={cn(
          'rounded-xl border p-3 text-[11px]',
          process.env.NEXT_PUBLIC_HAS_GEMINI
            ? 'border-green-500/20 bg-green-500/5 text-green-400'
            : 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400/70'
        )}>
          {process.env.NEXT_PUBLIC_HAS_GEMINI
            ? '✓ GEMINI_API_KEY configurata — RAG attivo'
            : '⚠ Aggiungi GEMINI_API_KEY al .env.local per attivare embeddings e RAG'
          }
        </div>
      </div>

      {/* ── Test RAG ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-white/30" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Test ricerca semantica</span>
        </div>

        <div className="p-4 border-b border-white/[0.06] flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Scrivi una query per testare il RAG..."
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/60 placeholder:text-white/15 outline-none focus:border-accent/30"
          />
          <button
            onClick={search}
            disabled={searching || !query.trim()}
            className="px-4 py-2 rounded-lg bg-accent/20 text-accent text-xs font-bold hover:bg-accent/30 transition-colors disabled:opacity-30"
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cerca'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
          {searchResults.length === 0 && !searching && (
            <p className="text-white/15 text-sm text-center mt-8">
              {stats.chunks === 0
                ? 'Nessun file indicizzato. Configura il vault e sincronizza.'
                : 'Scrivi una query per vedere i chunk più rilevanti dal vault.'
              }
            </p>
          )}
          {searchResults.map((r, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-accent/40 mb-1.5">Chunk {i + 1}</p>
              <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">{r.slice(0, 400)}{r.length > 400 ? '…' : ''}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
