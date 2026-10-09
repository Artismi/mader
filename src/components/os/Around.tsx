'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useOs, current, kindOf, type Acc } from './store'
import { I, useNode } from './parts'

export const SECTIONS: [string, string, string][] = [
  ['oggi', 'Oggi', 'sun'], ['messaggi', 'Messaggi', 'inbox'], ['clienti', 'Clienti', 'users'],
  ['lavori', 'Lavori', 'check'], ['studio', 'Studio', 'pen'], ['archivio', 'Archivio', 'archive'],
]

/* ───── Ghiera: la sezione attiva gira in alto; si gira con clic, rotella o frecce ───── */
export function Dial() {
  const chain = useOs(s => s.chain)
  const root = useOs(s => s.root)
  const { node: msgs } = useNode('list:messaggi')
  const count = msgs?.groups?.[0]?.[1]?.length ?? 0
  const [hover, setHover] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const active = Math.max(0, SECTIONS.findIndex(s => `list:${s[0]}` === chain[0].ref))

  useEffect(() => {
    const el = ref.current; if (!el) return
    let lock = 0
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (Date.now() - lock < 260) return
      lock = Date.now()
      root(SECTIONS[(active + (e.deltaY > 0 ? 1 : -1) + SECTIONS.length) % SECTIONS.length][0])
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [active, root])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    root(SECTIONS[(active + (e.key === 'ArrowRight' ? 1 : -1) + SECTIONS.length) % SECTIONS.length][0])
  }
  const show = hover ?? active
  const sub = hover !== null && hover !== active ? 'clic per aprire' : chain.length > 1 ? `${chain.length - 1} ${chain.length === 2 ? 'passo' : 'passi'}` : 'inizio'
  return (
    <div className="dial" ref={ref} role="navigation" aria-label="Sezioni: gira con la rotella o con le frecce" onKeyDown={onKey} onMouseLeave={() => setHover(null)}>
      <div className="track" />
      {SECTIONS.map(([id, label, icon], i) => {
        const a = ((i - active) * 60 - 90) * Math.PI / 180
        return (
          <button key={id} className="spot" aria-label={label} aria-current={i === active ? 'true' : undefined} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)}
            style={{ transform: `translate(${(Math.cos(a) * 92).toFixed(1)}px, ${(Math.sin(a) * 92).toFixed(1)}px)` }} onClick={() => root(id)}>
            <I n={icon} />{id === 'messaggi' && count > 0 && <span className="n">{count}</span>}
          </button>
        )
      })}
      <div className={`core${show !== active ? ' preview' : ''}`}><div><b>{SECTIONS[show][1]}</b><small>{sub}</small></div></div>
    </div>
  )
}

/* ───── Catena: il percorso come cerchi su un filo, più il passo consigliato ───── */
export function Chain() {
  const chain = useOs(s => s.chain)
  const nodes = useOs(s => s.nodes)
  const back = useOs(s => s.back)
  const name = (i: number) => { const s = chain[i]; return s.mode === 'reply' ? 'Risposta' : nodes[s.ref]?.title ?? '…' }
  const here = chain[chain.length - 1], hn = nodes[here.ref]
  const next = here.mode === 'reply' ? 'Invia' : kindOf(here.ref) === 'mail' && hn?.urgent ? 'Rispondi'
    : here.ref === 'list:oggi' ? hn?.groups?.find(g => g[0] === '__hero')?.[1]?.[0]?.title : null
  return (
    <nav className="chain" aria-label="Percorso">
      <h4>Percorso</h4>
      {chain.map((s, i) => {
        const now = i === chain.length - 1
        return (
          <button key={i} className={`step${now ? ' now' : ''}`} onClick={() => back(i)} aria-current={now ? 'step' : undefined} title={now ? undefined : 'Torna qui (Alt+←)'}>
            <span className="c">{i + 1}</span><span className="l">{name(i)}</span>
          </button>
        )
      })}
      {next && <div className="step next"><span className="c">✦</span><span className="l">poi: {next}</span></div>}
    </nav>
  )
}

/* ───── Satelliti: accessori utili per QUESTO nodo, su un arco d'orbita ───── */
export function Orbit() {
  const step = useOs(current)
  const node = useOs(s => s.nodes[step.ref])
  const accs = useOs(s => s.accs)
  const toggleAcc = useOs(s => s.toggleAcc)
  const ref = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(800)
  const [speak, setSpeak] = useState(true)
  useLayoutEffect(() => { const update = () => setH(ref.current?.getBoundingClientRect().height ?? 800); update(); addEventListener('resize', update); return () => removeEventListener('resize', update) }, [])
  useEffect(() => { setSpeak(true); const t = setTimeout(() => setSpeak(false), 4000); return () => clearTimeout(t) }, [step.ref, step.mode])

  const sats = (node?.sats ?? []).filter(s => !(step.mode === 'reply' && s.kind === 'client'))
  const R = Math.max(420, h / 2 + 40), gap = 74, off = (dy: number) => R - Math.sqrt(R * R - dy * dy)
  const edge = 83 - off(h / 2)
  return (
    <div className="orbit" ref={ref} aria-label="Accessori suggeriti">
      {sats.length > 0 && <svg aria-hidden="true"><path d={`M ${edge} 0 A ${R} ${R} 0 0 1 ${edge} ${h}`} fill="none" stroke="var(--t3)" strokeOpacity=".5" strokeDasharray="2 7" /></svg>}
      {sats.map((s, i) => {
        const dy = (i - (sats.length - 1) / 2) * gap
        const open = accs.some(a => a.key === `${s.kind}:${s.ref ?? ''}`)
        const ini = s.kind === 'client' ? s.tip.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') : null
        return (
          <button key={s.kind + i} className={`sat${s.smart && !open ? ' smart' : ''}${s.smart && speak && !open ? ' speak' : ''}`} aria-pressed={open} aria-label={s.tip}
            style={{ transform: `translate(${-off(dy)}px, ${dy}px)` }} onClick={() => toggleAcc(s.kind, s.ref)}>
            {ini ? <span style={{ font: '700 13px system-ui' }}>{ini}</span> : <I n={{ calendar: 'cal', quote: 'euro', task: 'check', client: 'users' }[s.kind]} />}
            <span className="tip">{s.tip}</span>
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
  // prossimi 3 giorni lavorativi, due fasce ciascuno; il primo è il consigliato
  const slots: { label: string; text: string }[] = []
  const d = new Date()
  while (slots.length < 6) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    for (const h of ['10:00', '15:00']) {
      const day = d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', '')
      slots.push({ label: `${day}\n${h}`, text: `${d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })} alle ${h}` })
    }
  }
  const [pick, setPick] = useState(0)
  return (
    <Card a={a} k={`per · ${forTitle ?? ''}`} title="Proponi un orario">
      <div className="slots">{slots.map((s, i) => <button key={i} aria-pressed={pick === i} className={i === 0 ? 'best' : ''} onClick={() => setPick(i)} style={{ whiteSpace: 'pre-line' }}>{s.label}</button>)}</div>
      <p className="why">il primo orario libero nei prossimi giorni lavorativi</p>
      <button className="accbtn" onClick={() => onInsert(`Ti andrebbe bene ${slots[pick].text}?`)}>Inserisci nella risposta</button>
    </Card>
  )
}

type QItem = { desc: string; qty: number; unit_price: number }
const eur = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

function QuoteCard({ a, clientRef, forTitle }: { a: Acc; clientRef?: string; forTitle?: string }) {
  const [q, setQ] = useState<{ title: string; number: string; total: number; items: QItem[]; status: string } | null | undefined>(undefined)
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
      <a className="accbtn" href="/finanze">Apri in Finanze</a>
    </Card>
  )
}
