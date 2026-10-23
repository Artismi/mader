'use client'

import { useEffect, useState } from 'react'
import { useOs, current, kindOf, type Acc } from './store'
import { I, useNode } from './parts'
import { Item } from './Today'

export const SECTIONS: [string, string, string][] = [
  ['oggi', 'Oggi', 'sun'], ['messaggi', 'Messaggi', 'inbox'], ['clienti', 'Clienti', 'users'],
  ['lavori', 'Lavori', 'check'], ['studio', 'Studio', 'pen'], ['archivio', 'Archivio', 'archive'],
]

/* ───── Luoghi: sei voci in una pillola sull'asse; il numero dice cosa ti aspetta ───── */
export function Places() {
  const chain = useOs(s => s.chain)
  const root = useOs(s => s.root)
  const { node: msgs } = useNode('list:messaggi')
  const count = msgs?.groups?.[0]?.[1]?.length ?? 0
  const active = Math.max(0, SECTIONS.findIndex(s => `list:${s[0]}` === chain[0].ref))
  return (
    <nav className="places" aria-label="Luoghi">
      {SECTIONS.map(([id, label], i) => (
        <button key={id} aria-current={i === active ? 'page' : undefined} onClick={() => root(id)} title={`${label} (Ctrl ${i + 1})`}>
          {label}{id === 'messaggi' && count > 0 && <span className="n">{count}</span>}
        </button>
      ))}
    </nav>
  )
}

/* ───── Percorso: da dove vieni, allineato verso il centro; ogni passo riporta lì con memoria ───── */
export function Path() {
  const chain = useOs(s => s.chain)
  const nodes = useOs(s => s.nodes)
  const back = useOs(s => s.back)
  const name = (i: number) => {
    const s = chain[i]
    if (s.mode === 'reply') return kindOf(s.ref) === 'quote' ? 'Invio' : 'Risposta'
    if (kindOf(s.ref) === 'list') return SECTIONS.find(x => `list:${x[0]}` === s.ref)?.[1] ?? '…'
    return nodes[s.ref]?.title ?? '…'
  }
  const here = chain[chain.length - 1], hn = nodes[here.ref]
  const next = here.mode === 'reply' ? 'Invia' : kindOf(here.ref) === 'mail' && hn?.urgent ? 'Rispondi' : null
  return (
    <nav className="path" aria-label="Percorso">
      <span className="kick">Percorso</span>
      {chain.map((s, i) => {
        const now = i === chain.length - 1
        return (
          <button key={i} className="itm" onClick={() => back(i)} aria-current={now ? 'step' : undefined} title={now ? undefined : 'Torna qui (Alt+←)'}>
            <b>{name(i)}</b>{!now && <span>passo {i + 1}</span>}
          </button>
        )
      })}
      {next && <div className="itm next"><b>poi: {next}</b></div>}
    </nav>
  )
}

/* ───── Altre mail che aspettano: accanto alla mail aperta, per passare alla prossima ───── */
export function Waiting() {
  const here = useOs(s => current(s).ref)
  const { node } = useNode('list:messaggi')
  const others = (node?.groups?.[0]?.[1] ?? []).filter(n => n.ref !== here).slice(0, 4)
  if (!others.length) return null
  return (
    <div className="path">
      <span className="kick">Aspettano anche</span>
      {others.map(n => <Item key={n.ref} n={n} />)}
    </div>
  )
}

/* ───── Cosa serve: gli accessori utili per QUESTO nodo, con il motivo scritto ───── */
export function Needs() {
  const step = useOs(current)
  const node = useOs(s => s.nodes[step.ref])
  const accs = useOs(s => s.accs)
  const toggleAcc = useOs(s => s.toggleAcc)
  const sats = (node?.sats ?? []).filter(s => !(step.mode === 'reply' && s.kind === 'client'))
  if (!sats.length) return null
  return (
    <div className="needs" aria-label="Cosa serve">
      <span className="kick">Cosa serve</span>
      {sats.map((s, i) => {
        const open = accs.some(a => a.key === `${s.kind}:${s.ref ?? ''}`)
        const ini = s.kind === 'client' ? s.tip.split(/s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') : null
        return (
          <button key={s.kind + i} className={`need${s.smart && !open ? ' smart' : ''}`} aria-pressed={open} onClick={() => toggleAcc(s.kind, s.ref)}>
            <span className="o">{ini ?? <I n={{ calendar: 'cal', quote: 'euro', task: 'check', client: 'users' }[s.kind]} />}</span>
            <span>{s.tip}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ───── Accessori: lavorano PER il blocco principale ───── */
export function Accessories() {
  const accs = useOs(s => s.accs)
  return <aside className={`accs${accs.length ? ' on' : ''}`} aria-label="Blocchi accessori">{accs.map(a => <AccCard key={a.key} a={a} />)}</aside>
}

function Card({ a, k, title, children }: { a: Acc; k: string; title: string; children: React.ReactNode }) {
  const closeAcc = useOs(s => s.closeAcc)
  return (
    <section className="acc" aria-label={title}>
      <div className="ah"><div className="tt"><div className="k">{k}</div><h3>{title}</h3></div>
        <button className="ib" title="Chiudi (Esc)" onClick={() => closeAcc(a.key)}><I n="x" /></button></div>
      {children}
    </section>
  )
}

/** inserisce testo nella risposta; se il blocco è la mail, prima si trasforma in risposta */
function useInsert() {
  const go = useOs(s => s.go), setDraft = useOs(s => s.setDraft), say = useOs(s => s.say)
  return (forRef: string, text: string) => {
    const s = useOs.getState(), here = current(s)
    if (kindOf(forRef) !== 'mail') return say('Apri una mail per inserirlo nella risposta', true)
    const prev = s.drafts[forRef] ?? ''
    setDraft(forRef, (prev ? prev.trimEnd() + '\n\n' : '') + text)
    if (!(here.ref === forRef && here.mode === 'reply')) go(forRef, 'reply')
    say('Inserito nella risposta')
  }
}

function AccCard({ a }: { a: Acc }) {
  const insert = useInsert()
  const promote = useOs(s => s.promote)
  const forNode = useOs(s => s.nodes[a.forRef])

  if (a.kind === 'calendar') return <CalendarCard a={a} forTitle={forNode?.title} onInsert={t => insert(a.forRef, t)} />
  if (a.kind === 'quote') return <QuoteCard a={a} clientRef={forNode?.clientRef ?? (kindOf(a.forRef) === 'client' ? a.forRef : undefined)} forTitle={forNode?.title} />
  if (a.kind === 'task' && !a.ref) return <TaskCreateCard a={a} forTitle={forNode?.title} forKind={kindOf(a.forRef)} />
  return <NodeCard a={a} onPromote={() => promote(a.key)} />
}

const post = async (body: object) => {
  const r = await fetch('/api/os', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error ?? 'Non riuscito')
  return j
}

/** prossime scadenze sensate, come cerchi da scegliere */
function dueOptions() {
  const d = (n: number) => { const x = new Date(); x.setDate(x.getDate() + n); x.setHours(18, 0, 0, 0); return x }
  const nextDow = (dow: number) => { const x = new Date(); const add = ((dow - x.getDay() + 7) % 7) || 7; return d(add) }
  return [['oggi', d(0)], ['domani', d(1)], ['venerdì', nextDow(5)], ['lunedì', nextDow(1)], ['senza', null]] as [string, Date | null][]
}

function TaskCreateCard({ a, forTitle, forKind }: { a: Acc; forTitle?: string; forKind: string }) {
  const { closeAcc, invalidate, say } = useOs.getState()
  const [title, setTitle] = useState(forKind === 'mail' && forTitle ? `Seguire: ${forTitle.replace(/^(re|fw|fwd):\s*/i, '')}` : '')
  const opts = dueOptions()
  const [due, setDue] = useState(2)
  const [busy, setBusy] = useState(false)
  const create = async () => {
    setBusy(true)
    try {
      const j = await post({ action: 'task', title, deadline: opts[due][1]?.toISOString() ?? null, fromRef: a.forRef })
      invalidate(); closeAcc(a.key); say(`Task creato · nato da ${forTitle ?? 'qui'}`)
      useOs.getState().toggleAcc('task', j.ref)        // resta a portata come accessorio
    } catch (e) { say((e as Error).message, true) } finally { setBusy(false) }
  }
  return (
    <Card a={a} k={`da · ${forTitle ?? ''}`} title="Nuovo task">
      <input className="fld" value={title} onChange={e => setTitle(e.target.value)} placeholder="Cosa c'è da fare?" aria-label="Nome del task" autoFocus
        onKeyDown={e => { if (e.key === 'Enter' && title.trim()) create() }} />
      <p className="why" style={{ marginTop: 12 }}>scadenza</p>
      <div className="slots" style={{ marginTop: 6 }}>{opts.map(([l], i) => <button key={l} aria-pressed={due === i} onClick={() => setDue(i)}>{l}</button>)}</div>
      <button className="accbtn" onClick={create} disabled={!title.trim() || busy}>{busy ? 'Creo…' : 'Crea task'}</button>
    </Card>
  )
}

function NodeCard({ a, onPromote }: { a: Acc; onPromote: () => void }) {
  const { node } = useNode(a.ref!)
  return (
    <Card a={a} k={a.kind === 'client' ? 'cliente' : a.kind} title={node?.title ?? '…'}>
      <p>{node?.lead || node?.sub}</p>
      <button className="accbtn" onClick={onPromote}>Apri al centro</button>
    </Card>
  )
}

function CalendarCard({ a, forTitle, onInsert }: { a: Acc; forTitle?: string; onInsert: (t: string) => void }) {
  // orari occupati dal calendario: si propongono solo fasce libere
  const [busy, setBusy] = useState<{ start: string; end: string }[] | null>(null)
  useEffect(() => { fetch('/api/os?busy').then(r => r.json()).then(setBusy).catch(() => setBusy([])) }, [])
  const free = (from: Date) => { const to = from.getTime() + 3600_000; return !(busy ?? []).some(b => Date.parse(b.start) < to && Date.parse(b.end) > from.getTime()) }

  const slots: { label: string; text: string }[] = []
  const d = new Date()
  for (let guard = 0; slots.length < 6 && guard < 21; guard++) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    for (const h of [10, 15]) {
      const at = new Date(d); at.setHours(h, 0, 0, 0)
      if (!free(at) || slots.length >= 6) continue
      const day = at.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', '')
      slots.push({ label: `${day}\n${h}:00`, text: `${at.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })} alle ${h}:00` })
    }
  }
  const [pick, setPick] = useState(0)
  return (
    <Card a={a} k={`per · ${forTitle ?? ''}`} title="Proponi un orario">
      {busy === null ? <p className="empty">guardo il calendario…</p> :
        <div className="slots">{slots.map((s, i) => <button key={i} aria-pressed={pick === i} className={i === 0 ? 'best' : ''} onClick={() => setPick(i)} style={{ whiteSpace: 'pre-line' }}>{s.label}</button>)}</div>}
      <p className="why">{busy?.length ? 'solo orari liberi nel tuo calendario' : 'primi orari nei giorni lavorativi · collega Google per vedere gli impegni'}</p>
      <button className="accbtn" onClick={() => onInsert(`Ti andrebbe bene ${slots[pick].text}?`)}>Inserisci nella risposta</button>
    </Card>
  )
}

type QItem = { desc: string; qty: number; unit_price: number }
const eur = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

function QuoteCard({ a, clientRef, forTitle }: { a: Acc; clientRef?: string; forTitle?: string }) {
  const go = useOs(s => s.go)
  const [q, setQ] = useState<{ id: string; title: string; number: string; total: number; items: QItem[]; status: string } | null | undefined>(undefined)
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<QItem[]>([{ desc: '', qty: 1, unit_price: 0 }])
  const [busy, setBusy] = useState(false)
  const say = useOs(s => s.say)
  const load = () => fetch(`/api/os?quote=${clientRef ? clientRef.split(':')[1] : ''}&from=${encodeURIComponent(a.forRef)}`).then(r => r.json()).then(setQ).catch(() => setQ(null))
  useEffect(() => { load() }, [clientRef]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (i: number, patch: Partial<QItem>) => setRows(r => r.map((x, k) => k === i ? { ...x, ...patch } : x))
  const total = rows.reduce((s, r) => s + r.qty * r.unit_price, 0)
  const save = async () => {
    setBusy(true)
    try {
      const j = await post({ action: 'quote', fromRef: a.forRef, title: forTitle?.replace(/^(re|fw|fwd):\s*/i, '') ?? 'Preventivo', items: rows })
      say(`Preventivo ${j.number} salvato in bozza`); setEditing(false); load()
    } catch (e) { say((e as Error).message, true) } finally { setBusy(false) }
  }

  if (editing || q === null) return (
    <Card a={a} k={`per · ${forTitle ?? ''}`} title="Nuovo preventivo">
      {rows.map((r, i) => (
        <div className="qrow" key={i}>
          <input className="fld" value={r.desc} onChange={e => set(i, { desc: e.target.value })} placeholder="Voce (es. Logo, 3 varianti)" aria-label={`Voce ${i + 1}`} />
          <input className="fld num" type="number" min={1} value={r.qty} onChange={e => set(i, { qty: +e.target.value })} aria-label="Quantità" />
          <input className="fld num" type="number" min={0} step={10} value={r.unit_price || ''} onChange={e => set(i, { unit_price: +e.target.value })} placeholder="€" aria-label="Prezzo unitario" />
        </div>
      ))}
      <button className="legacy" style={{ marginTop: 8 }} onClick={() => setRows(r => [...r, { desc: '', qty: 1, unit_price: 0 }])}>+ aggiungi voce</button>
      <p className="why">totale {eur(total)} · resta in bozza finché non lo invii</p>
      <button className="accbtn" onClick={save} disabled={busy || !rows.some(r => r.desc.trim())}>{busy ? 'Salvo…' : 'Salva in bozza'}</button>
    </Card>
  )
  return (
    <Card a={a} k={`per · ${forTitle ?? ''}`} title={q ? `${q.title} · ${q.number}` : 'Preventivo'}>
      {q === undefined ? <p className="empty">un attimo…</p> : (
        <table className="lines"><tbody>
          {q.items.map((it, i) => <tr key={i}><td>{it.desc}{it.qty > 1 ? ` × ${it.qty}` : ''}</td><td>{eur(it.qty * it.unit_price)}</td></tr>)}
          <tr><td>Totale · {q.status}</td><td>{eur(q.total)}</td></tr>
        </tbody></table>
      )}
      <button className="legacy" style={{ marginTop: 12 }} onClick={() => setEditing(true)}>+ nuovo preventivo</button>
      {q && <button className="accbtn" onClick={() => go(`quote:${q.id}`)}>{q.status === 'bozza' ? 'Apri e invia' : 'Apri al centro'}</button>}
    </Card>
  )
}
