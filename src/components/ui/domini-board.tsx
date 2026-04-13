'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, ExternalLink, Globe, AlertTriangle, Check, Loader2, ChevronDown, ChevronUp, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Domain } from '@/lib/db'
import { useRouter } from 'next/navigation'

const STATUS_COLORS: Record<string, string> = {
  live:     'bg-green-500/10 text-green-600 border-green-500/20',
  dev:      'bg-blue-500/10 text-blue-500 border-blue-500/20',
  sospeso:  'bg-white/[0.06] text-primary/40 border-border',
}

const STATUS_LABELS: Record<string, string> = {
  live: 'Live', dev: 'In Sviluppo', sospeso: 'Sospeso',
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function ExpiryBadge({ label, date }: { label: string; date?: string }) {
  if (!date) return null
  const days = daysUntil(date)
  if (days === null) return null
  const isUrgent = days <= 30
  const isPast = days < 0
  return (
    <div className={cn(
      'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium',
      isPast ? 'bg-red-500/10 text-red-600 border-red-500/20' :
      isUrgent ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
      'bg-white/[0.04] text-primary/50 border-border'
    )}>
      {isUrgent && <AlertTriangle className="w-3 h-3" />}
      {label}: {isPast ? `scaduto da ${Math.abs(days)}g` : `${days}g`}
    </div>
  )
}

const EMPTY_FORM = {
  name: '', url: '', status: 'live' as Domain['status'],
  domain_expires: '', hosting_expires: '', panel_url: '', notes: '',
}

interface Props {
  initialDomains: Domain[]
}

export function DominiBoard({ initialDomains }: Props) {
  const router = useRouter()
  const [, tx] = useTransition()
  const [list, setList] = useState<Domain[]>(initialDomains)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Domain | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const openCreate = () => {
    setForm({ ...EMPTY_FORM })
    setEditing(null)
    setCreating(true)
  }

  const openEdit = (d: Domain, e: React.MouseEvent) => {
    e.stopPropagation()
    setForm({
      name: d.name,
      url: d.url || '',
      status: d.status,
      domain_expires: d.domain_expires?.split('T')[0] || '',
      hosting_expires: d.hosting_expires?.split('T')[0] || '',
      panel_url: d.panel_url || '',
      notes: d.notes || '',
    })
    setEditing(d)
    setCreating(true)
  }

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch('/api/domains', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...form }),
        })
        if (res.ok) {
          setList(prev => prev.map(d => d.id === editing.id ? { ...d, ...form } : d))
          setCreating(false)
          setEditing(null)
          router.refresh()
        }
      } else {
        const res = await fetch('/api/domains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (data.domain) {
          setList(prev => [data.domain, ...prev])
          setCreating(false)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    tx(async () => {
      await fetch(`/api/domains?id=${id}`, { method: 'DELETE' })
      setList(prev => prev.filter(d => d.id !== id))
    })
  }

  const updateStatus = (id: string, status: Domain['status'], e: React.MouseEvent) => {
    e.stopPropagation()
    tx(async () => {
      await fetch('/api/domains', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      setList(prev => prev.map(d => d.id === id ? { ...d, status } : d))
    })
  }

  // Alert: domini in scadenza entro 30 giorni
  const expiring = list.filter(d => {
    const dd = daysUntil(d.domain_expires)
    const hd = daysUntil(d.hosting_expires)
    return (dd !== null && dd <= 30) || (hd !== null && hd <= 30)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Web & Domini</h1>
          <p className="mt-1 text-sm text-primary/70">Scadenze dominio e hosting, pannelli di gestione.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
        >
          <Plus className="w-4 h-4" /> Nuovo dominio
        </button>
      </div>

      {/* Alert scadenze */}
      {expiring.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-orange-700">{expiring.length} dominio/i in scadenza entro 30 giorni</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {expiring.map(d => (
              <span key={d.id} className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">{d.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {(['live', 'dev', 'sospeso'] as const).map(status => {
          const filtered = list.filter(d => d.status === status)
          return (
            <div key={status} className={cn('rounded-xl border p-4', STATUS_COLORS[status])}>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{STATUS_LABELS[status]}</p>
              <p className="text-2xl font-black">{filtered.length}</p>
            </div>
          )
        })}
      </div>

      {/* Lista domini */}
      <div className="space-y-3">
        {list.length === 0 && !creating && (
          <div className="flex flex-col items-center justify-center py-20 text-primary/30">
            <Globe className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm italic">Nessun dominio registrato.</p>
          </div>
        )}

        {list.map(domain => (
          <div key={domain.id} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpanded(expanded === domain.id ? null : domain.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-primary/30 shrink-0" />
                  <h3 className="font-bold text-primary truncate">{domain.name}</h3>
                  <span className={cn('text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border', STATUS_COLORS[domain.status])}>
                    {STATUS_LABELS[domain.status]}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 ml-7">
                  <ExpiryBadge label="Dominio" date={domain.domain_expires} />
                  <ExpiryBadge label="Hosting" date={domain.hosting_expires} />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={e => openEdit(domain, e)} className="p-1.5 rounded-lg text-primary/30 hover:text-accent hover:bg-accent/5 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={e => handleDelete(domain.id, e)} className="p-1.5 rounded-lg text-primary/20 hover:text-red-400 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                {expanded === domain.id ? <ChevronUp className="w-4 h-4 text-primary/30" /> : <ChevronDown className="w-4 h-4 text-primary/30" />}
              </div>
            </div>

            {expanded === domain.id && (
              <div className="px-5 pb-5 border-t border-border space-y-4">
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {domain.url && (
                    <a href={domain.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-accent hover:underline font-medium">
                      <ExternalLink className="w-4 h-4" /> Visita il sito
                    </a>
                  )}
                  {domain.panel_url && (
                    <a href={domain.panel_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-accent hover:underline font-medium">
                      <ExternalLink className="w-4 h-4" /> Pannello gestione
                    </a>
                  )}
                </div>

                {domain.notes && (
                  <p className="text-sm text-primary/50 bg-gray-50 rounded-lg px-3 py-2">{domain.notes}</p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <span className="text-xs text-primary/40">Cambia stato:</span>
                  {(['live', 'dev', 'sospeso'] as const).filter(s => s !== domain.status).map(s => (
                    <button key={s} onClick={e => updateStatus(domain.id, s, e)}
                      className={cn('flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors', STATUS_COLORS[s], 'hover:opacity-80')}>
                      {s === 'live' && <Check className="w-3 h-3" />}
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal crea/modifica */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) { setCreating(false); setEditing(null) } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-black text-primary">{editing ? 'Modifica dominio' : 'Nuovo dominio'}</h2>
              <button onClick={() => { setCreating(false); setEditing(null) }} className="text-primary/30 hover:text-primary/60 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-primary/50 mb-1 block">Nome dominio *</label>
                  <input type="text" placeholder="es. artismi.it"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-accent/50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-primary/50 mb-1 block">URL sito</label>
                  <input type="url" placeholder="https://artismi.it"
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-primary/50 mb-1 block">Stato</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Domain['status'] }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary bg-white outline-none focus:border-accent/50">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-primary/50 mb-1 block">URL pannello</label>
                  <input type="url" placeholder="https://aruba.it/..."
                    value={form.panel_url}
                    onChange={e => setForm(f => ({ ...f, panel_url: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-primary/50 mb-1 block">Scadenza dominio</label>
                  <input type="date" value={form.domain_expires}
                    onChange={e => setForm(f => ({ ...f, domain_expires: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-primary/50 mb-1 block">Scadenza hosting</label>
                  <input type="date" value={form.hosting_expires}
                    onChange={e => setForm(f => ({ ...f, hosting_expires: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-accent/50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-primary/50 mb-1 block">Note</label>
                  <textarea placeholder="Note, credenziali, info registrar..."
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-primary outline-none resize-none focus:border-accent/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setCreating(false); setEditing(null) }} className="px-4 py-2 text-sm text-primary/40 hover:text-primary/60">Annulla</button>
                <button onClick={handleSave} disabled={saving || !form.name}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors disabled:opacity-30">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  {editing ? 'Salva modifiche' : 'Aggiungi dominio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
