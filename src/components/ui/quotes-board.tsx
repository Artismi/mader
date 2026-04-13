'use client'

import { useState, useTransition } from 'react'
import { 
  Plus, Trash2, ExternalLink, Send, Check, FileText, 
  Loader2, ChevronDown, ChevronUp, Receipt, LayoutGrid, 
  ListFilter, ArrowRightLeft, CreditCard
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Quote, QuoteItem, Client } from '@/lib/db'
import { useRouter } from 'next/navigation'

const STATUS_COLORS: Record<string, string> = {
  bozza:     'bg-white/[0.03] text-white/40 border-white/[0.06]',
  inviato:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  accettato: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rifiutato: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const STATUS_LABELS: Record<string, string> = {
  bozza: 'Bozza', inviato: 'Inviato', accettato: 'Accettato', rifiutato: 'Rifiutato',
}

const EMPTY_ITEM: QuoteItem = { desc: '', qty: 1, unit_price: 0 }

interface Props {
  initialQuotes: Quote[]
  clients: Client[]
}

export function QuotesBoard({ initialQuotes, clients }: Props) {
  const router = useRouter()
  const [, tx] = useTransition()
  const [quotesList, setQuotes] = useState<Quote[]>(initialQuotes)
  const [activeType, setActiveType] = useState<'preventivo' | 'fattura'>('preventivo')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newForm, setNewForm] = useState({
    client_id: '', client_name: '', title: '', notes: '', canva_doc_url: '', expires_at: '',
    items: [{ ...EMPTY_ITEM }] as QuoteItem[],
  })

  const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)

  const filteredQuotes = quotesList.filter(q => q.type === activeType)
  const totalInFlow = filteredQuotes.reduce((s, q) => s + q.total, 0)

  const createQuote = async () => {
    if (!newForm.client_name || !newForm.title) return
    setSaving(true)
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newForm, type: activeType }),
      })
      const data = await res.json()
      if (data.quote) {
        setQuotes(prev => [data.quote, ...prev])
        setCreating(false)
        setNewForm({ client_id: '', client_name: '', title: '', notes: '', canva_doc_url: '', expires_at: '', items: [{ ...EMPTY_ITEM }] })
      }
    } finally {
      setSaving(false)
    }
  }

  const convertToInvoice = async (quote: Quote) => {
    setSaving(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote.id }),
      })
      const data = await res.json()
      if (data.invoice) {
        setQuotes(prev => [data.invoice, ...prev])
        setActiveType('fattura')
        setExpanded(data.invoice.id)
      }
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = (id: string, status: Quote['status']) => {
    tx(async () => {
      await fetch('/api/quotes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q))
    })
  }

  const deleteQuote = (id: string) => {
    tx(async () => {
      await fetch(`/api/quotes?id=${id}`, { method: 'DELETE' })
      setQuotes(prev => prev.filter(q => q.id !== id))
    })
  }

  const sendViaLancio = (quote: Quote) => {
    const isInf = quote.type === 'fattura'
    const subject = isInf ? `Fattura ${quote.number} — ${quote.title}` : `Preventivo ${quote.number} — ${quote.title}`
    const body = buildEmailBody(quote)
    const params = new URLSearchParams({
      to: clients.find(c => c.id === quote.client_id)?.email || '',
      subject,
      body,
      name: quote.client_name,
    })
    router.push(`/lancio?${params.toString()}`)
  }

  return (
    <div className="space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h1 className="text-3xl font-black text-white/90 tracking-tight">Finanze.</h1>
          <div className="flex bg-white/5 p-1 rounded-xl mt-4 border border-white/5 self-start">
            <button
              onClick={() => setActiveType('preventivo')}
              className={cn(
                "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activeType === 'preventivo' ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-white/30 hover:text-white/60"
              )}
            >
              Preventivi
            </button>
            <button
              onClick={() => setActiveType('fattura')}
              className={cn(
                "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activeType === 'fattura' ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-white/30 hover:text-white/60"
              )}
            >
              Fatture
            </button>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/90 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all shadow-xl"
        >
          <Plus className="w-4 h-4 text-violet-400" /> Nuovo {activeType}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(['bozza', 'inviato', 'accettato', 'rifiutato'] as const).map(status => {
          const filtered = filteredQuotes.filter(q => q.status === status)
          const totalVal = filtered.reduce((s, q) => s + q.total, 0)
          return (
            <div key={status} className={cn('rounded-[2rem] border p-6 backdrop-blur-xl transition-all duration-500 hover:scale-[1.02]', STATUS_COLORS[status])}>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-3">{STATUS_LABELS[status]}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">{filtered.length}</span>
                <span className="text-[10px] font-mono opacity-40 italic">{activeType}</span>
              </div>
              {totalVal > 0 && <p className="text-sm font-black mt-2 text-white/80">{fmt(totalVal)}</p>}
            </div>
          )
        })}
      </div>

      {/* Main List */}
      <div className="space-y-4">
        {filteredQuotes.length === 0 && !creating && (
          <div className="flex flex-col items-center justify-center py-32 border border-white/5 bg-white/[0.02] rounded-[3rem]">
            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
              <Receipt className="w-8 h-8 text-white/10" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Nessun {activeType} trovato</p>
          </div>
        )}

        {filteredQuotes.map(quote => (
          <div 
            key={quote.id} 
            className={cn(
              "group relative bg-white/[0.03] border rounded-[2.5rem] transition-all duration-500 overflow-hidden",
              expanded === quote.id ? "border-violet-500/30 ring-1 ring-violet-500/10 shadow-2xl" : "border-white/10 hover:border-white/20"
            )}
          >
            <div
              className="flex flex-col md:flex-row md:items-center gap-6 px-8 py-7 cursor-pointer"
              onClick={() => setExpanded(expanded === quote.id ? null : quote.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-[10px] font-black font-mono text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-md">#{quote.number}</span>
                  <span className={cn('text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border', STATUS_COLORS[quote.status])}>
                    {STATUS_LABELS[quote.status]}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white/90 group-hover:text-violet-400 transition-colors tracking-tight">{quote.title}</h3>
                <p className="text-[11px] text-white/30 uppercase tracking-widest mt-1 font-medium">{quote.client_name}</p>
              </div>

              <div className="flex items-center gap-8 text-right">
                <div>
                  <p className="text-2xl font-black text-white/90 italic tracking-tighter">{fmt(quote.total)}</p>
                  {quote.issued_at && (
                    <p className="text-[9px] text-white/20 font-mono uppercase tracking-widest mt-1">
                      {new Date(quote.issued_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className={cn("p-2 rounded-xl bg-white/5 transition-transform duration-500", expanded === quote.id && "rotate-180")}>
                  <ChevronDown className="w-4 h-4 text-white/20" />
                </div>
              </div>
            </div>

            {expanded === quote.id && (
              <div className="px-8 pb-8 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="h-px bg-white/5 w-full" />
                
                {/* Items Table - Premium Style */}
                <div className="overflow-x-auto rounded-[1.5rem] border border-white/5 bg-black/40">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                        <th className="px-6 py-4">Descrizione</th>
                        <th className="px-6 py-4 text-center w-24">Qtà</th>
                        <th className="px-6 py-4 text-right w-32">Unitario</th>
                        <th className="px-6 py-4 text-right w-32">Subtotale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {quote.items.map((item, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-5 text-sm font-medium text-white/70">{item.desc}</td>
                          <td className="px-6 py-5 text-center text-xs font-mono text-white/40">{item.qty}</td>
                          <td className="px-6 py-5 text-right text-xs font-mono text-white/40">{fmt(item.unit_price)}</td>
                          <td className="px-6 py-5 text-right text-sm font-black text-white/80 italic">{fmt(item.qty * item.unit_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-white/[0.02]">
                        <td colSpan={3} className="px-6 py-6 text-right text-[10px] font-black uppercase tracking-widest text-white/30">Totale {activeType}</td>
                        <td className="px-6 py-6 text-right text-xl font-black text-violet-400 italic">{fmt(quote.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {quote.notes && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                    <p className="text-[11px] text-white/40 leading-relaxed italic">{quote.notes}</p>
                  </div>
                )}

                {/* Actions Panel */}
                <div className="flex flex-col md:flex-row items-center gap-4 justify-between pt-4">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => sendViaLancio(quote)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      <Send size={14} />
                      {activeType === 'fattura' ? 'Invia Fattura' : 'Invia Preventivo'}
                    </button>
                    
                    {activeType === 'preventivo' && quote.status === 'accettato' && (
                      <button 
                        onClick={() => convertToInvoice(quote)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        <ArrowRightLeft size={14} />
                        Converti in Fattura
                      </button>
                    )}

                    <div className="flex gap-2 ml-2">
                      {quote.canva_doc_url && (
                        <a href={quote.canva_doc_url} target="_blank" className="p-2.5 rounded-xl bg-white/5 text-white/40 hover:text-white/80 transition-all border border-white/5">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={quote.status}
                      onChange={e => updateStatus(quote.id, e.target.value as Quote['status'])}
                      className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 focus:outline-none focus:border-violet-500/50"
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <button 
                      onClick={() => deleteQuote(quote.id)}
                      className="p-3 rounded-xl bg-red-500/5 text-red-500/30 hover:bg-red-500/10 hover:text-red-500 transition-all border border-red-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* NEW MODAL (Adapted for Premium Dark) */}
      {creating && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={e => { if (e.target === e.currentTarget) setCreating(false) }}>
          <div className="bg-[#0c0c0c] border border-white/10 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white/90">Nuovo {activeType}.</h2>
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mt-1 italic">Compila i dettagli per generare il documento</p>
              </div>
              <button onClick={() => setCreating(false)} className="text-white/20 hover:text-white/60 transition-colors">✕</button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Cliente</label>
                  <select
                    value={newForm.client_id}
                    onChange={e => {
                      const c = clients.find(c => c.id === e.target.value)
                      setNewForm(f => ({ ...f, client_id: e.target.value, client_name: c?.name || f.client_name }))
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/90 focus:border-violet-500/50 outline-none appearance-none"
                  >
                    <option value="" className="bg-black">Seleziona...</option>
                    {clients.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Titolo Documento</label>
                  <input type="text" placeholder="es. Pacchetto Branding"
                    value={newForm.title}
                    onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/90 focus:border-violet-500/50 outline-none"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Voci di spesa</span>
                  <button 
                    onClick={() => setNewForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))}
                    className="text-[10px] font-black uppercase tracking-widest text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    + Aggiungi Voce
                  </button>
                </div>
                
                {newForm.items.map((item, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <input type="text" placeholder="Descrizione" 
                      value={item.desc}
                      onChange={e => setNewForm(f => ({ ...f, items: f.items.map((it, j) => j === i ? { ...it, desc: e.target.value } : it) }))}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/80 outline-none focus:border-violet-500/30"
                    />
                    <input type="number" placeholder="Qtà" 
                      value={item.qty}
                      onChange={e => setNewForm(f => ({ ...f, items: f.items.map((it, j) => j === i ? { ...it, qty: +e.target.value } : it) }))}
                      className="w-20 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/80 text-center outline-none"
                    />
                    <input type="number" placeholder="€ Unitario" 
                      value={item.unit_price}
                      onChange={e => setNewForm(f => ({ ...f, items: f.items.map((it, j) => j === i ? { ...it, unit_price: +e.target.value } : it) }))}
                      className="w-28 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/80 outline-none"
                    />
                    <button onClick={() => setNewForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))} className="text-white/10 hover:text-red-500/50 p-2">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-6 flex justify-end">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Totale Provvisorio</p>
                  <p className="text-3xl font-black text-violet-400 italic tracking-tighter">{fmt(newForm.items.reduce((s, i) => s + i.qty * i.unit_price, 0))}</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4 justify-end">
              <button onClick={() => setCreating(false)} className="text-[10px] font-black uppercase text-white/30 hover:text-white/60">Annulla</button>
              <button 
                onClick={createQuote} 
                className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-violet-600/20 disabled:opacity-30 flex items-center gap-2"
                disabled={saving}
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Salva {activeType}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function buildEmailBody(quote: Quote): string {
  const isInv = quote.type === 'fattura'
  const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
  
  if (isInv) {
    return `Gentile ${quote.client_name},\n\nti invio in allegato la fattura #${quote.number} relativa a: "${quote.title}".\n\nTotale: ${fmt(quote.total)}\n\nTi ringrazio per la collaborazione.\n\nCordiali saluti,\nCreative OS Hub`
  }

  const rows = quote.items.map(i => `• ${i.desc} — ${i.qty}x ${fmt(i.unit_price)} = ${fmt(i.qty * i.unit_price)}`).join('\n')
  return `Gentile ${quote.client_name},\n\nti invio il preventivo #${quote.number} per "${quote.title}":\n\n${rows}\n\nTotale: ${fmt(quote.total)}\n\n${quote.notes ? quote.notes + '\n\n' : ''}Rimango a disposizione per qualsiasi domanda.\n\nCordiali saluti,\nCreative OS Hub`
}
