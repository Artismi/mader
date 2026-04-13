'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Send, Eye, Edit3, User, Clock, CheckCircle, AlertCircle, Loader2, ArrowLeft, Mail, Paperclip,
  Instagram, MessageCircle, FileText, LayoutTemplate, ExternalLink, Bold, Italic, Underline, 
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Linkedin, Save, ChevronDown, 
  Sparkles, Megaphone, PenTool, Eraser, RotateCcw, Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { EditFigjamBtn } from '@/components/ui/edit-figjam-btn'
import { CreativeStudio } from '@/components/studio/creative-studio'
import { updateClient } from '@/app/actions'

interface ReplyMessage {
  id: string
  subject: string
  senderName: string
  senderEmail: string
  content: string
  timestamp: string
  gmailId: string
  threadId: string
  messageIdHeader: string
}

interface LancioClient {
  id: string
  name: string
  sector?: string
  figjam_board_id?: string | null
  canvas_state?: string | null
}

interface LancioClientOption {
  id: string
  name: string
  figjam_board_id?: string | null
  canvas_state?: string | null
}

interface LancioEditorProps {
  defaultTo: string
  defaultName: string
  defaultSubject: string
  replyMessage: ReplyMessage | null
  client: LancioClient | null
  allClients?: LancioClientOption[]
  initialContent?: string
}

const EMAIL_TEMPLATE = (bodyHtml: string) => `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
  .wrap{max-width:580px;margin:0 auto;padding:32px 16px}
  .card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .header{padding:24px 32px 20px;border-bottom:1px solid #f0f0ee}
  .logo{font-size:11px;font-weight:900;letter-spacing:.22em;text-transform:uppercase;color:#111}
  .body{padding:32px;font-size:15px;line-height:1.75;color:#333}
  .body p{margin-bottom:1em}
  .footer{padding:20px 32px;background:#fafaf9;border-top:1px solid #f0f0ee;font-size:11px;color:#aaa;letter-spacing:.05em}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="header"><div class="logo">artismi design studio</div></div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">artismi design studio &mdash; ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
  </div>
</div>
</body>
</html>`

// AppMode and WorkspaceMode removed — unified studio experience

export function LancioEditor({ 
  defaultTo, 
  defaultName, 
  defaultSubject, 
  replyMessage, 
  client: initialClient, 
  allClients = [], 
  initialContent 
}: LancioEditorProps) {
  const [activeClient, setActiveClient] = useState<LancioClientOption | null>(initialClient || null)

  return (
    <div className="h-full flex gap-4 overflow-hidden bg-[#090909]">
      
      {/* ── SIDEBAR: CONTEXT ─────────────────────────────────────────── */}
      <div className="w-[280px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto scrollbar-hide py-2">
        
        {/* Nav Header */}
        <div className="flex items-center justify-between px-1">
            <Link href="/inbox" className="flex items-center gap-2 text-white/20 hover:text-white/60 text-[10px] font-black uppercase tracking-widest transition-all">
                <ArrowLeft className="w-3 h-3" /> Inbox
            </Link>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-white/40 uppercase tracking-tighter">Live Studio</span>
            </div>
        </div>

        {/* Client Selection */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Contesto Progetto</p>
            <div className="relative">
                <select
                    value={activeClient?.id || ''}
                    onChange={(e) => {
                        const c = allClients.find(x => x.id === e.target.value)
                        setActiveClient(c || null)
                    }}
                    className="w-full appearance-none bg-white/[0.03] border border-white/10 rounded-xl pl-3 pr-8 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-accent transition-all cursor-pointer"
                >
                    <option value="" className="bg-[#0a0a0a]">Studio / Interno</option>
                    {allClients.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#0a0a0a]">{c.name}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
            </div>
            {activeClient && (
                <div className="pt-2 border-t border-white/[0.04]">
                     <EditFigjamBtn clientId={activeClient.id} initialId={activeClient.figjam_board_id} />
                </div>
            )}
        </div>

        {/* Contextual Idea (if reply) */}
        {replyMessage && (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 opacity-60">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Origin</p>
                <p className="text-[11px] font-bold text-white/60 line-clamp-1">{replyMessage.subject}</p>
                <p className="text-[10px] text-white/30 line-clamp-3 leading-relaxed">{replyMessage.content}</p>
            </div>
        )}
      </div>

      {/* ── MAIN WORKSPACE ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 rounded-2xl border border-white/[0.06] overflow-hidden bg-[#0a0a0a] shadow-2xl">
        {/* Content Viewport */}
        <div className="flex-1 overflow-hidden flex flex-col bg-[#0b0b0b]">
            <div className="flex-1 relative">
                <CreativeStudio
                    clients={activeClient ? [activeClient as any] : []}
                />
            </div>
        </div>
      </div>

    </div>
  )
}
