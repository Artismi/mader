'use client'

import { useState, useEffect, useCallback } from 'react'
import { Mail, RefreshCw, Reply, ExternalLink, User, Clock, AlertCircle, Loader2, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message, Client } from '@/lib/db'

interface InboxViewProps {
  initialMessages: Message[]
  clients: Client[]
}

function formatDate(timestamp: string): string {
  const d = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)

  if (days === 0) return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return 'Ieri'
  if (days < 7) return d.toLocaleDateString('it-IT', { weekday: 'short' })
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export function InboxView({ initialMessages, clients }: InboxViewProps) {
  const [msgs, setMsgs] = useState<Message[]>(initialMessages)
  const [selected, setSelected] = useState<Message | null>(null)
  const [body, setBody] = useState<{ html: string; text: string } | null>(null)
  const [loadingBody, setLoadingBody] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))

  const sync = useCallback(async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/gmail')
      const data = await res.json()
      if (data.messages) setMsgs(data.messages)
      if (data.error) setSyncError(data.error)
    } catch {
      setSyncError('Errore di rete')
    } finally {
      setSyncing(false)
    }
  }, [])

  // Sync automatico all'apertura
  useEffect(() => { sync() }, [sync])

  const openMessage = async (msg: Message) => {
    setSelected(msg)
    setBody(null)
    setLoadingBody(true)

    // Segna come letto localmente
    setMsgs(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))

    const gmailId = (msg.metadata as Record<string, string>).gmail_id || msg.id
    try {
      const res = await fetch(`/api/gmail/${gmailId}`)
      const data = await res.json()
      setBody({ html: data.html || '', text: data.text || data.snippet || '' })
    } catch {
      setBody({ html: '', text: msg.content })
    } finally {
      setLoadingBody(false)
    }
  }

  const unreadCount = msgs.filter(m => !m.read).length

  return (
    <div className="h-full flex overflow-hidden rounded-2xl border border-white/[0.06]">

      {/* ── Lista messaggi ─────────────────────────────── */}
      <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-white/[0.06]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-white/40" />
            <span className="text-sm font-bold text-white/80">Inbox</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-black bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={sync}
            disabled={syncing}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/40 hover:text-white/70"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />
          </button>
        </div>

        {syncError && (
          <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-[11px] text-red-400 truncate">{syncError}</span>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {msgs.length === 0 && !syncing ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-white/20">
              <Mail className="w-8 h-8" />
              <p className="text-sm">Inbox vuota</p>
            </div>
          ) : (
            msgs.map(msg => {
              const client = msg.client_id ? clientMap[msg.client_id] : null
              const isSelected = selected?.id === msg.id
              return (
                <button
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-white/[0.04] transition-colors',
                    isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={cn(
                      'text-xs truncate',
                      msg.read ? 'text-white/50 font-normal' : 'text-white/90 font-semibold'
                    )}>
                      {msg.sender_name || msg.sender_id}
                    </span>
                    <span className="text-[10px] text-white/25 shrink-0 mt-0.5">
                      {formatDate(msg.timestamp)}
                    </span>
                  </div>
                  <p className={cn(
                    'text-[11px] truncate mb-1',
                    msg.read ? 'text-white/30' : 'text-white/60'
                  )}>
                    {msg.subject}
                  </p>
                  <p className="text-[10px] text-white/20 truncate">{msg.content}</p>
                  {client && (
                    <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider bg-accent/15 text-accent/70 px-1.5 py-0.5 rounded-full">
                      {client.name}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Dettaglio messaggio ─────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/15">
            <Mail className="w-12 h-12" />
            <p className="text-sm">Seleziona un messaggio</p>
          </div>
        ) : (
          <>
            {/* Header messaggio */}
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white/80 truncate mb-2">{selected.subject}</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <User className="w-3.5 h-3.5" />
                    <span>{selected.sender_name}</span>
                    {selected.sender_id && selected.sender_id !== selected.sender_name && (
                      <span className="text-white/20">&lt;{selected.sender_id}&gt;</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/25">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(selected.timestamp).toLocaleString('it-IT')}</span>
                  </div>
                  {selected.client_id && clientMap[selected.client_id] && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent/70 px-2 py-0.5 rounded-full">
                      {clientMap[selected.client_id].name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${(selected.metadata as Record<string, string>).gmail_id || selected.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
                  title="Apri in Gmail"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href={`/lancio?reply=${selected.id}&subject=${encodeURIComponent(selected.subject || '')}&to=${encodeURIComponent(selected.sender_id || '')}&name=${encodeURIComponent(selected.sender_name || '')}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent text-xs font-semibold transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" />
                  Rispondi
                </a>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
              {loadingBody ? (
                <div className="flex items-center gap-2 text-white/20 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Caricamento...</span>
                </div>
              ) : body?.html ? (
                <div
                  className="prose prose-invert prose-sm max-w-none text-white/70 email-body"
                  dangerouslySetInnerHTML={{ __html: body.html }}
                />
              ) : (
                <p className="text-sm text-white/60 whitespace-pre-wrap leading-relaxed">
                  {body?.text || selected.content}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
