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
  if (a.kind === 'task' && !a.ref) return (
    <Card a={a} k={`da · ${forNode?.title ?? ''}`} title="Nuovo task">
      <p className="why" style={{ marginTop: 0 }}>sarà collegato a {forNode?.title}</p>
      <a className="accbtn" href="/incarichi">Crea in Lavori</a>
    </Card>
  )
  return <NodeCard a={a} onPromote={() => promote(a.key)} />
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

function QuoteCard({ a, clientRef, forTitle }: { a: Acc; clientRef?: string; forTitle?: string }) {
  const [q, setQ] = useState<{ title: string; total: number; items: { desc: string; qty: number; unit_price: number }[]; status: string } | null | undefined>(undefined)
  useEffect(() => {
    fetch(`/api/os?quote=${clientRef ? clientRef.split(':')[1] : ''}`).then(r => r.json()).then(setQ).catch(() => setQ(null))
  }, [clientRef])
  const eur = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
  return (
    <Card a={a} k={`per · ${forTitle ?? ''}`} title={q?.title ?? 'Preventivo'}>
      {q === undefined ? <p className="empty">un attimo…</p> : q ? (
        <table className="lines"><tbody>
          {q.items.map((it, i) => <tr key={i}><td>{it.desc}{it.qty > 1 ? ` × ${it.qty}` : ''}</td><td>{eur(it.qty * it.unit_price)}</td></tr>)}
          <tr><td>Totale · {q.status}</td><td>{eur(q.total)}</td></tr>
        </tbody></table>
      ) : <p className="why" style={{ marginTop: 0 }}>nessun preventivo per questo cliente: crealo in Finanze</p>}
      <a className="accbtn" href="/finanze">{q ? 'Apri in Finanze' : 'Crea preventivo'}</a>
    </Card>
  )
}
