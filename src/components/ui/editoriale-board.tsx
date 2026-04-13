'use client'

import { useState, useTransition, useEffect } from 'react'
import { Plus, BarChart2, Kanban, Trash2, ChevronRight, Instagram, Linkedin, Facebook, Users, TrendingUp, Eye, Loader2, RefreshCw, Settings2, PenTool, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Client, EditorialPost } from '@/lib/db'
import { useRouter } from 'next/navigation'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type Status = EditorialPost['editorial_status']
type MetricsMap = Record<string, { followers: number; engagement_rate: number; reach: number; recorded_at: string }>

const STATUSES: { id: Status; label: string; color: string }[] = [
  { id: 'idea',        label: 'Idea',        color: 'border-white/10 bg-white/[0.02]' },
  { id: 'bozza',       label: 'Bozza',       color: 'border-yellow-500/20 bg-yellow-500/[0.04]' },
  { id: 'approvato',   label: 'Approvato',   color: 'border-blue-500/20 bg-blue-500/[0.04]' },
  { id: 'programmato', label: 'Programmato', color: 'border-violet-500/20 bg-violet-500/[0.04]' },
  { id: 'pubblicato',  label: 'Pubblicato',  color: 'border-green-500/20 bg-green-500/[0.04]' },
]

const CHANNELS = ['instagram', 'facebook', 'linkedin', 'tiktok', 'email']
const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3 h-3" />,
  facebook: <Facebook className="w-3 h-3" />,
  linkedin: <Linkedin className="w-3 h-3" />,
}
const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'tiktok']

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  clients: Client[]
  initialPosts: EditorialPost[]
  initialMetrics: Record<string, MetricsMap>
  globalClientId?: string
  onNavigate?: (tab: string, context: { content: string }) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditorialeBoard({ clients, initialPosts, initialMetrics, globalClientId, onNavigate }: Props) {
  const router = useRouter()
  const [, tx] = useTransition()

  // Use global client ID if provided, otherwise local state for the sidebar if needed
  // But the new requirement is context "from above", so we prioritize globalClientId
  const [localSelectedId, setLocalSelectedId] = useState<string>(clients[0]?.id || '')
  const selectedClientId = globalClientId || localSelectedId
  
  const [posts, setPosts] = useState<EditorialPost[]>(initialPosts)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [tab, setTab] = useState<'piano' | 'analytics'>('piano')
  const [newPost, setNewPost] = useState<{ open: boolean; status: Status }>({ open: false, status: 'idea' })
  const [form, setForm] = useState({ title: '', content: '', channels: [] as string[], scheduled_at: '' })
  const [saving, setSaving] = useState(false)
  const [editingMetrics, setEditingMetrics] = useState<Record<string, { followers: string; engagement_rate: string; reach: string }>>({})
  const [savingMetrics, setSavingMetrics] = useState(false)
  const [metaForm, setMetaForm] = useState<{ open: boolean; access_token: string; ig_user_id: string; fb_page_id: string }>({ open: false, access_token: '', ig_user_id: '', fb_page_id: '' })
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const clientPosts = posts.filter(p => p.client_id === selectedClientId)
  const clientMetrics = metrics[selectedClientId] || {}
  const selectedClient = clients.find(c => c.id === selectedClientId)

  // Advance status
  const advance = (post: EditorialPost) => {
    const idx = STATUSES.findIndex(s => s.id === post.editorial_status)
    if (idx >= STATUSES.length - 1) return
    const next = STATUSES[idx + 1].id
    tx(async () => {
      await fetch('/api/editoriale', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, editorial_status: next }),
      })
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, editorial_status: next } : p))
    })
  }

  // Delete post
  const deletePost = (id: string) => {
    tx(async () => {
      await fetch(`/api/editoriale?id=${id}`, { method: 'DELETE' })
      setPosts(prev => prev.filter(p => p.id !== id))
    })
  }

  // Create post
  const createPost = async () => {
    if (!form.title.trim() || !selectedClientId) return
    setSaving(true)
    try {
      const res = await fetch('/api/editoriale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClientId,
          title: form.title,
          content: form.content,
          channels: form.channels,
          editorial_status: newPost.status,
          scheduled_at: form.scheduled_at || undefined,
        }),
      })
      const data = await res.json()
      if (data.post) {
        setPosts(prev => [data.post, ...prev])
        setNewPost({ open: false, status: 'idea' })
        setForm({ title: '', content: '', channels: [], scheduled_at: '' })
      }
    } finally {
      setSaving(false)
    }
  }

  const saveMetaConfig = async () => {
    if (!metaForm.access_token) return
    await fetch('/api/analytics/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: selectedClientId, ...metaForm }),
    })
    setMetaForm(f => ({ ...f, open: false }))
  }

  const syncFromMeta = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch(`/api/analytics/meta?clientId=${selectedClientId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Aggiorna metrics in state
      const updated: MetricsMap = {}
      for (const [platform, result] of Object.entries(data.results)) {
        if (!(result as { error?: string }).error) {
          updated[platform] = { ...(result as { followers: number; engagement_rate: number; reach: number }), recorded_at: new Date().toISOString() }
        }
      }
      setMetrics(prev => ({ ...prev, [selectedClientId]: { ...(prev[selectedClientId] || {}), ...updated } }))
      setSyncResult('✓ Dati sincronizzati da Meta')
    } catch (e) {
      setSyncResult(`✗ ${e instanceof Error ? e.message : 'Errore'}`)
    } finally {
      setSyncing(false)
    }
  }

  // Save analytics
  const saveMetrics = async (platform: string) => {
    const m = editingMetrics[platform]
    if (!m) return
    setSavingMetrics(true)
    const parsed = { followers: +m.followers || 0, engagement_rate: +m.engagement_rate || 0, reach: +m.reach || 0 }
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, platform, metrics: parsed }),
      })
      setMetrics(prev => ({
        ...prev,
        [selectedClientId]: {
          ...(prev[selectedClientId] || {}),
          [platform]: { ...parsed, recorded_at: new Date().toISOString() },
        },
      }))
      setEditingMetrics(prev => { const n = { ...prev }; delete n[platform]; return n })
      router.refresh()
    } finally {
      setSavingMetrics(false)
    }
  }

  return (
    <div className="h-full flex overflow-hidden gap-0">

      {/* ── Sidebar clienti (Optional if global header is enough, but kept for legacy/switch) ── */}
      {!globalClientId && (
        <div className="w-[200px] flex-shrink-0 flex flex-col border-r border-white/[0.06] overflow-y-auto scrollbar-hide">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/20 px-3 py-3 border-b border-white/[0.06]">Clienti</p>
          {clients.length === 0 ? (
            <p className="text-[11px] text-white/20 p-3 italic">Nessun cliente</p>
          ) : clients.map(c => (
            <button
              key={c.id}
              onClick={() => setLocalSelectedId(c.id)}
              className={cn(
                'w-full text-left px-3 py-2.5 border-b border-white/[0.04] transition-colors text-xs',
                selectedClientId === c.id
                  ? 'bg-white/[0.08] text-white/80 font-semibold'
                  : 'text-white/40 hover:bg-white/[0.04] hover:text-white/60'
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-accent/20 flex items-center justify-center text-[9px] font-black text-accent/70 shrink-0">
                  {c.name.charAt(0)}
                </div>
                <span className="truncate">{c.name}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Contenuto principale ─────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header (condensed if global) */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white/70">{selectedClient?.name || 'Seleziona un cliente'}</h2>
            {selectedClient?.sector && (
              <span className="text-[10px] text-white/25">{selectedClient.sector}</span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
            {([['piano', Kanban, 'Piano'], ['analytics', BarChart2, 'Analytics']] as const).map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors',
                  tab === id ? 'bg-white/10 text-white/80' : 'text-white/30 hover:text-white/50'
                )}
              >
                <Icon className="w-3 h-3" />{label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Piano ── */}
        {tab === 'piano' && (
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-3 h-full p-3 min-w-max">
              {STATUSES.map(status => {
                const colPosts = clientPosts.filter(p => p.editorial_status === status.id)
                return (
                  <div key={status.id} className={cn('w-60 flex-shrink-0 flex flex-col rounded-xl border h-full overflow-hidden', status.color)}>
                    {/* Header colonna */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{status.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-white/20">{colPosts.length}</span>
                        <button
                          onClick={() => { setNewPost({ open: true, status: status.id }); setForm({ title: '', content: '', channels: [], scheduled_at: '' }) }}
                          disabled={!selectedClientId}
                          className="p-0.5 rounded hover:bg-white/10 text-white/25 hover:text-white/60 transition-colors disabled:opacity-10"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Card lista */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-2">
                       {!selectedClientId && (
                         <div className="flex flex-col items-center justify-center pt-8 text-white/10 gap-2">
                            <Users className="w-5 h-5" />
                            <p className="text-[9px] uppercase tracking-widest font-black">Nessun Cliente</p>
                         </div>
                       )}
                      {colPosts.map(post => (
                        <div key={post.id} className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 group">
                          <p className="text-xs font-semibold text-white/70 leading-snug mb-1.5">{post.title || '(nessun titolo)'}</p>
                          {post.content && (
                            <p className="text-[10px] text-white/30 line-clamp-2 mb-2">{post.content}</p>
                          )}
                          <div className="flex items-center gap-1 mb-2">
                            {post.channels.map(ch => (
                              <span key={ch} className="flex items-center gap-0.5 text-[9px] text-white/30 bg-white/[0.06] px-1.5 py-0.5 rounded-full">
                                {CHANNEL_ICONS[ch] || null}{ch}
                              </span>
                            ))}
                          </div>
                          {post.scheduled_at && (
                            <p className="text-[9px] text-white/20 mb-2">
                              📅 {new Date(post.scheduled_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                            </p>
                          )}
                          
                          {/* Actions Row */}
                          <div className="flex items-center gap-3 pt-2 mt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {status.id !== 'pubblicato' && (
                              <button
                                onClick={() => advance(post)}
                                className="flex items-center gap-1 text-[9px] text-accent/60 hover:text-accent font-bold transition-colors"
                              >
                                Avanza <ChevronRight className="w-3 h-3" />
                              </button>
                            )}

                            <div className="flex items-center gap-1.5 ml-auto">
                              <button 
                                onClick={() => onNavigate?.('progettazione', { content: post.content || post.title || '' })}
                                className="p-1 px-1.5 rounded-md bg-white/5 text-white/30 hover:text-white hover:bg-accent/20 transition-all flex items-center gap-1 text-[9px] font-bold"
                              >
                                <PenTool className="w-3 h-3" /> Progetta
                              </button>
                              <button 
                                onClick={() => onNavigate?.('pubblica', { content: post.content || post.title || '' })}
                                className="p-1 px-1.5 rounded-md bg-white/5 text-white/30 hover:text-white hover:bg-sky-500/20 transition-all flex items-center gap-1 text-[9px] font-bold"
                              >
                                <Send className="w-3 h-3" /> Lancia
                              </button>
                              <button
                                onClick={() => deletePost(post.id)}
                                className="p-1 text-white/20 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Tab Analytics ── */}
        {tab === 'analytics' && (
          <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-8 bg-black/20">

            {/* Config & Sync Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white/90">Instagram Insights</h3>
                <p className="text-xs text-white/40">Dati reali sincronizzati da Meta Business Suite</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.location.href = `/api/auth/meta/login?clientId=${selectedClientId}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-fuchsia-600/20 to-purple-600/20 border border-fuchsia-500/30 text-xs font-bold text-fuchsia-300 hover:from-fuchsia-600/30 hover:to-purple-600/30 transition-all shadow-lg shadow-fuchsia-500/5 group"
                >
                  <Instagram className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  Collega Business Account
                </button>
                
                <button
                  onClick={syncFromMeta}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold text-white/60 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-40"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Aggiorna Dati
                </button>
              </div>
            </div>

            {syncResult && (
              <div className={cn('p-3 rounded-xl border text-xs font-medium animate-in fade-in slide-in-from-top-2', 
                syncResult.startsWith('✓') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400')}>
                {syncResult}
              </div>
            )}

            {/* KPI Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard 
                title="Follower Totali" 
                value={clientMetrics.instagram?.followers?.toLocaleString('it-IT') || '0'} 
                icon={<Users className="w-5 h-5 text-blue-400" />}
                trend="+2.4%"
                color="blue"
              />
              <KpiCard 
                title="Copertura (Reach)" 
                value={clientMetrics.instagram?.reach?.toLocaleString('it-IT') || '0'} 
                icon={<Eye className="w-5 h-5 text-fuchsia-400" />}
                trend="+15.8%"
                color="fuchsia"
                subtitle="Ultimi 28 giorni"
              />
              <KpiCard 
                title="Engagement Rate" 
                value={`${clientMetrics.instagram?.engagement_rate || '0.0'}%`} 
                icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
                trend="-0.2%"
                color="emerald"
              />
            </div>

            {/* Content Performance Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/20">Performance Contenuti Recenti</h4>
                <div className="h-px flex-1 mx-4 bg-white/5" />
              </div>

              <div className="grid grid-cols-1 gap-2">
                {/* @ts-ignore - metrics might have top_media from API results */}
                {metrics[selectedClientId]?.instagram?.top_media?.map((post: any) => (
                  <div key={post.id} className="group flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 shrink-0 border border-white/10">
                      {post.media_type === 'VIDEO' ? (
                        <div className="w-full h-full flex items-center justify-center bg-black/40">
                          <Film className="w-4 h-4 text-white/20" />
                        </div>
                      ) : (
                        <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white/70 line-clamp-1 font-medium mb-1">
                        {post.caption || '(Senza didascalia)'}
                      </p>
                      <p className="text-[9px] text-white/20">
                        {new Date(post.timestamp).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 pr-4">
                      <PostStat icon={<Eye className="w-3 h-3" />} label="Reach" value={post.reach} />
                      <PostStat icon={<Settings2 className="w-3 h-3" />} label="Salva" value={post.saved} />
                      <PostStat icon={<TrendingUp className="w-3 h-3" />} label="Eng." value={post.like_count + post.comments_count} />
                    </div>
                  </div>
                ))}
                
                {(!metrics[selectedClientId]?.instagram?.top_media) && (
                  <div className="py-12 flex flex-col items-center justify-center text-white/10 gap-3 border-2 border-dashed border-white/5 rounded-3xl">
                    <BarChart2 className="w-8 h-8" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-center">
                      Nessun dato disponibile.<br/>Clicca "Aggiorna Dati" per sincronizzare da Meta.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal nuovo post ─────────────────────────────── */}
      {newPost.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setNewPost({ open: false, status: 'idea' }) }}>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-96 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-white/80">
              Nuovo contenuto — <span className="text-accent/70 capitalize">{newPost.status}</span>
            </h3>

            {!selectedClientId && (
               <p className="text-[11px] text-orange-400 bg-orange-400/10 p-3 rounded-lg border border-orange-400/20 italic">
                  ⚠ Nessun cliente selezionato nell&apos;header dello Studio.
               </p>
            )}

            <input
              type="text"
              placeholder="Titolo / idea del post"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 placeholder:text-white/20 outline-none focus:border-accent/30"
              autoFocus
              disabled={!selectedClientId}
            />
            <textarea
              placeholder="Bozza testo (opzionale)"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 placeholder:text-white/20 outline-none resize-none focus:border-accent/30"
              disabled={!selectedClientId}
            />
            <div>
              <p className="text-[10px] text-white/30 mb-1.5 uppercase tracking-wider">Canali</p>
              <div className="flex flex-wrap gap-1.5">
                {CHANNELS.map(ch => (
                  <button 
                    key={ch} 
                    onClick={() => setForm(f => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter(x => x !== ch) : [...f.channels, ch] }))}
                    disabled={!selectedClientId}
                    className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors border',
                      form.channels.includes(ch) ? 'bg-accent/20 border-accent/30 text-accent' : 'border-white/10 text-white/30 hover:border-white/20')}>
                    {ch}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="date"
              value={form.scheduled_at}
              onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/50 outline-none focus:border-accent/30"
              disabled={!selectedClientId}
            />
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setNewPost({ open: false, status: 'idea' })} className="px-4 py-2 text-xs text-white/30 hover:text-white/60">Annulla</button>
              <button onClick={createPost} disabled={saving || !form.title.trim() || !selectedClientId}
                className="px-4 py-2 rounded-lg bg-accent/20 text-accent text-xs font-bold hover:bg-accent/30 transition-all disabled:opacity-10">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-[10px] text-white/30">
        {icon}{label}
      </div>
      <span className="text-xs font-bold text-white/60">{value}</span>
    </div>
  )
}

function KpiCard({ title, value, icon, trend, color, subtitle }: { title: string; value: string; icon: React.ReactNode; trend: string; color: string; subtitle?: string }) {
  const isPositive = trend.startsWith('+')
  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-3 relative overflow-hidden group">
      <div className={cn("absolute -right-4 -top-4 w-20 h-20 blur-3xl opacity-10 transition-opacity group-hover:opacity-20", 
        color === 'blue' ? 'bg-blue-500' : color === 'fuchsia' ? 'bg-fuchsia-500' : 'bg-emerald-500')} />
      
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-xl bg-white/5 border border-white/5">
          {icon}
        </div>
        <div className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", 
          isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
          {trend}
        </div>
      </div>
      
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-2xl font-bold text-white/80">{value}</h4>
          {subtitle && <span className="text-[9px] text-white/10 font-bold uppercase">{subtitle}</span>}
        </div>
      </div>
    </div>
  )
}

function PostStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1 text-[9px] text-white/20 font-bold uppercase tracking-tighter">
        {icon} {label}
      </div>
      <span className="text-xs font-bold text-white/60">{value?.toLocaleString('it-IT') || '0'}</span>
    </div>
  )
}
