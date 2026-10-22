'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'   // navigazione interna: la catena resta in memoria
import type { NodeDetail } from '@/lib/os/graph'
import { useOs, current, kindOf } from './store'
import { Group, I, KIND_LABEL, useNode } from './parts'

/** Il blocco principale: uno solo, si trasforma */
export function Block() {
  const step = useOs(current)
  const anim = useOs(s => s.anim)
  const origin = useOs(s => s.origin)
  const petals = useOs(s => s.petals)
  const remember = useOs(s => s.remember)
  const { node, err } = useNode(step.ref)
  const mainRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const key = `${step.ref}|${step.mode}`

  // ritorno con memoria: si riprende dalla stessa posizione
  useLayoutEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = step.mem.scroll ?? 0 }, [key, node]) // eslint-disable-line react-hooks/exhaustive-deps

  // trasformazione: il nuovo stato si apre a cerchio dal punto cliccato
  useLayoutEffect(() => {
    const el = mainRef.current?.firstElementChild as HTMLElement | null
    if (anim !== 'morph' || !origin || !el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = mainRef.current!.getBoundingClientRect(), x = origin.x - r.left, y = origin.y - r.top
    el.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${Math.hypot(r.width, r.height)}px at ${x}px ${y}px)` }], { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' })
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className={`main${petals ? ' choosing' : ''}`} ref={mainRef} aria-live="polite">
      <div className={`inner ${anim === 'morph' ? '' : anim}`} key={key}>
        <div className="scroll" ref={scrollRef} onScroll={e => remember((e.target as HTMLDivElement).scrollTop)}>
          <div className="col">
            {err ? <p className="loading">non riesco a caricarlo · {err}</p>
              : !node ? <p className="loading">un attimo…</p>
              : <View node={node} mode={step.mode} />}
          </div>
        </div>
        {node && <Petals node={node} />}
      </div>
    </section>
  )
}

function Head({ kicker, title, lead, orb, action }: { kicker?: React.ReactNode; title: string; lead?: string; orb?: string; action?: React.ReactNode }) {
  return (
    <div className="head">
      {orb && <span className="orb">{orb}</span>}
      <div className="tt">{kicker && <div className="kicker">{kicker}</div>}<h1>{title}</h1>{lead && <p className="lead">{lead}</p>}</div>
      {action && <div className="act">{action}</div>}
    </div>
  )
}

function PlusButton({ node }: { node: NodeDetail }) {
  const setPetals = useOs(s => s.setPetals)
  if (!node.petals.length) return null
  return <button className="plus" data-plus onClick={() => setPetals(true)} aria-label="Cosa puoi fare da qui" title="Cosa puoi fare da qui"><I n="plus" /></button>
}

function View({ node, mode }: { node: NodeDetail; mode: 'view' | 'reply' }) {
  const go = useOs(s => s.go)
  const kind = kindOf(node.ref)

  if (kind === 'list') return (
    <>
      <Head title={node.title} lead={node.lead} action={node.legacy && <a className="legacy" href={node.legacy}>vista completa ↗</a>} />
      {(node.groups ?? []).map(([l, items]) => <Group key={l} label={l} items={items} />)}
    </>
  )

  if (kind === 'mail' && mode === 'reply') return <Reply node={node} />

  if (kind === 'mail') return (
    <>
      <Head kicker={<>mail{node.clientName ? ` · ${node.clientName}` : ''}</>} title={node.title} orb={node.ini}
        action={<><PlusButton node={node} /><button className="primary" onClick={() => go(node.ref, 'reply')}><span className="dot"><I n="reply" /></span>Rispondi</button></>} />
      <p style={{ fontSize: 14, color: 'var(--t3)', margin: '-16px 0 24px' }}>{node.who}{node.email && node.email !== node.who ? ` · ${node.email}` : ''} · {node.when}</p>
      <div className="letter">{(node.html ?? []).map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: p }} />)}</div>
      {node.html?.some(p => p.includes('<mark>')) && <p className="why" style={{ marginTop: 26 }}>ho sottolineato le richieste · gli strumenti giusti sono nei cerchi a destra</p>}
    </>
  )

  if (kind === 'client') return (
    <>
      <Head kicker="cliente" title={node.title} lead={node.lead} orb={node.ini} action={<PlusButton node={node} />} />
      {(node.groups ?? []).map(([l, items]) => <Group key={l} label={l} items={items} empty={l === 'Da rispondere' ? 'Non aspetta nulla da te.' : 'Niente qui.'} />)}
    </>
  )

  if (kind === 'task') return <TaskView node={node} />

  if (kind === 'design') return (
    <>
      <Head kicker={`design${node.clientName ? ` · ${node.clientName}` : ''}`} title={node.title} lead={node.sub}
        action={node.href && <Link className="primary" href={node.href}><span className="dot"><I n="pen" /></span>Apri nello Studio</Link>} />
      <div className="preview-art">anteprima</div>
    </>
  )

  if (kind === 'event') return (
    <>
      <Head kicker="evento" title={node.title} lead={node.lead}
        action={node.href && <a className="primary" href={node.href} target="_blank" rel="noreferrer"><span className="dot"><I n="out" /></span>Apri</a>} />
      <p className="why">l&apos;evento è nel tuo calendario: si modifica lì, qui lo vedi nel contesto della giornata</p>
    </>
  )

  if (kind === 'post') return <PostView node={node} />

  if (kind === 'quote') return mode === 'reply' ? <QuoteSend node={node} /> : <QuoteView node={node} />

  if (kind === 'idea') return (
    <>
      <Head kicker={`idea${node.clientName ? ` · ${node.clientName}` : ''}`} title={node.title} action={<PlusButton node={node} />} />
      <div className="letter"><p>{node.lead}</p></div>
      {node.legacy && <p style={{ marginTop: 28 }}><a className="legacy" href={node.legacy}>modifica nelle Idee ↗</a></p>}
    </>
  )

  return <Head title={node.title} />
}

function TaskView({ node }: { node: NodeDetail }) {
  const { go, back, say, invalidate } = useOs.getState()
  const [busy, setBusy] = useState(false)
  const done = async () => {
    setBusy(true)
    const r = await fetch('/api/os', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'done', ref: node.ref }) })
    setBusy(false)
    if (!r.ok) return say('Non sono riuscito a segnarlo', true)
    invalidate(); say('Fatto. Un cerchio in meno'); back()
  }
  return (
    <>
      <Head kicker={`task${node.clientName ? ` · ${node.clientName}` : ''}`} title={node.title} lead={node.lead}
        action={!node.done && <button className="primary" onClick={done} disabled={busy}><span className="dot"><I n="check" /></span>Fatto</button>} />
      {node.origin && (
        <>
          <h2>Nato da</h2>
          <button className="origin" onClick={() => go(node.origin!.ref)}><span className="av">{node.origin.ini ?? <I n="inbox" />}</span>{node.origin.title}<span style={{ color: 'var(--t3)', fontSize: 13 }}>· {node.origin.when}</span></button>
        </>
      )}
      {node.done && <p className="why">già fatto</p>}
    </>
  )
}

const call = async (body: object) => {
  const r = await fetch('/api/os', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error ?? 'Non riuscito')
  return j
}
const eur = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
type QItem = { desc: string; qty: number; unit_price: number }

/* Preventivo / fattura: voci, PDF, invio; lo stato avanza di un passo alla volta */
function QuoteView({ node }: { node: NodeDetail }) {
  const { go, say, invalidate } = useOs.getState()
  const q = node.quote!
  const [rows, setRows] = useState<QItem[] | null>(null)       // non null = sto modificando
  const [busy, setBusy] = useState(false)
  const run = async (body: object, ok: string) => {
    setBusy(true)
    try { const j = await call({ ref: node.ref, ...body }); invalidate(); say(ok); return j } catch (e) { say((e as Error).message, true) } finally { setBusy(false) }
  }
  const set = (i: number, patch: Partial<QItem>) => setRows(r => r!.map((x, k) => k === i ? { ...x, ...patch } : x))
  const pdf = `/api/os/quote-pdf?id=${q.id}`
  const isInvoice = q.type === 'fattura'

  const action = q.status === 'bozza'
    ? <button className="primary" onClick={() => go(node.ref, 'reply')} disabled={!!rows}><span className="dot"><I n="send" /></span>Invia al cliente</button>
    : q.status === 'accettato' && !isInvoice
      ? <button className="primary" disabled={busy} onClick={async () => { const j = await run({ action: 'quote-invoice' }, 'Fattura creata in bozza'); if (j?.ref) go(j.ref) }}><span className="dot"><I n="file" /></span>Crea la fattura</button>
      : null

  return (
    <>
      <Head kicker={`${q.type}${node.clientName ? ` · ${node.clientName}` : ''}`} title={node.title} lead={node.lead} action={<><PlusButton node={node} />{action}</>} />
      {rows ? (
        <>
          {rows.map((r, i) => (
            <div className="qrow" key={i}>
              <input className="fld" value={r.desc} onChange={e => set(i, { desc: e.target.value })} placeholder="Voce" aria-label={`Voce ${i + 1}`} autoFocus={i === rows.length - 1 && !r.desc} />
              <input className="fld num" type="number" min={1} value={r.qty} onChange={e => set(i, { qty: +e.target.value })} aria-label="Quantità" />
              <input className="fld num" type="number" min={0} step={10} value={r.unit_price || ''} onChange={e => set(i, { unit_price: +e.target.value })} placeholder="€" aria-label="Prezzo unitario" />
            </div>
          ))}
          <p style={{ marginTop: 10, display: 'flex', gap: 18, alignItems: 'center' }}>
            <button className="legacy" onClick={() => setRows(r => [...r!, { desc: '', qty: 1, unit_price: 0 }])}>+ aggiungi voce</button>
            <span className="why" style={{ margin: 0 }}>totale {eur(rows.reduce((s, r) => s + r.qty * r.unit_price, 0))}</span>
          </p>
          <p style={{ marginTop: 18, display: 'flex', gap: 12 }}>
            <button className="primary" disabled={busy || !rows.some(r => r.desc.trim())} onClick={async () => { if (await run({ action: 'quote-items', items: rows }, 'Voci salvate')) setRows(null) }}><span className="dot"><I n="check" /></span>Salva</button>
            <button className="legacy" onClick={() => setRows(null)}>annulla</button>
          </p>
        </>
      ) : (
        <>
          <table className="lines big"><tbody>
            {q.items.map((it, i) => <tr key={i}><td>{it.desc}{it.qty > 1 ? ` × ${it.qty}` : ''}</td><td>{eur(it.qty * it.unit_price)}</td></tr>)}
            <tr><td>Totale</td><td>{eur(q.total)}</td></tr>
          </tbody></table>
          {q.notes && <p className="why" style={{ whiteSpace: 'pre-line' }}>{q.notes}</p>}
        </>
      )}

      {!rows && (
        <div className="qacts">
          <a className="legacy" href={pdf} target="_blank" rel="noreferrer">vedi il PDF ↗</a>
          {q.drive_pdf_url
            ? <a className="legacy" href={q.drive_pdf_url} target="_blank" rel="noreferrer">su Drive ↗</a>
            : <button className="legacy" disabled={busy} onClick={() => run({ action: 'quote-drive' }, 'Copia salvata su Drive')}>salva su Drive</button>}
          {q.status === 'bozza' && <button className="legacy" onClick={() => setRows(q.items.map(i => ({ ...i })))}>modifica le voci</button>}
          {q.status === 'inviato' && <>
            <button className="legacy" disabled={busy} onClick={() => run({ action: 'quote-status', status: 'accettato' }, isInvoice ? 'Segnata come pagata' : 'Accettato: ora puoi fare la fattura')}>{isInvoice ? 'segna pagata' : 'il cliente ha accettato'}</button>
            {!isInvoice && <button className="legacy" disabled={busy} onClick={() => run({ action: 'quote-status', status: 'rifiutato' }, 'Segnato come rifiutato')}>ha rifiutato</button>}
            <button className="legacy" onClick={() => go(node.ref, 'reply')}>invia di nuovo</button>
          </>}
        </div>
      )}

      {node.origin && (
        <>
          <h2>Nato da</h2>
          <button className="origin" onClick={() => go(node.origin!.ref)}><span className="av">{node.origin.ini ?? <I n={node.origin.kind === 'quote' ? 'euro' : 'inbox'} />}</span>{node.origin.title}{node.origin.when && <span style={{ color: 'var(--t3)', fontSize: 13 }}>· {node.origin.when}</span>}</button>
        </>
      )}
      {q.status === 'bozza' && <Profile />}
    </>
  )
}

/* Chi emette il documento: compare nell'intestazione del PDF */
function Profile() {
  const say = useOs(s => s.say)
  const [p, setP] = useState<{ name: string; details: string } | null>(null)
  useEffect(() => { fetch('/api/os?profile').then(r => r.json()).then(setP).catch(() => setP(null)) }, [])
  if (!p) return null
  const save = async () => { try { setP(await call({ action: 'profile', ...p })); say('Intestazione salvata') } catch (e) { say((e as Error).message, true) } }
  return (
    <details className="profile" open={!p.details}>
      <summary>Intestazione del PDF{!p.details && <span className="pill">da completare</span>}</summary>
      <input className="fld" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} aria-label="Nome o studio" placeholder="Nome o studio" />
      <textarea className="fld" value={p.details} onChange={e => setP({ ...p, details: e.target.value })} aria-label="Dati fiscali"
        placeholder={'Indirizzo\nP.IVA / Codice fiscale\nIBAN\nemail · telefono'} rows={4} />
      <button className="legacy" onClick={save}>salva intestazione</button>
    </details>
  )
}

/* Stesso preventivo, funzione diversa: inviarlo */
function QuoteSend({ node }: { node: NodeDetail }) {
  const q = node.quote!
  const draft = useOs(s => s.drafts[node.ref])
  const { setDraft, clearDraft, say, back, invalidate } = useOs.getState()
  const label = q.type === 'fattura' ? 'la fattura' : 'il preventivo'
  const text = draft ?? `Buongiorno,\n\nin allegato ${label} n. ${q.number} per “${node.title}”, per un totale di ${eur(q.total)}.\n\nResto a disposizione per qualsiasi domanda.\n\nUn saluto`
  const [to, setTo] = useState(q.to ?? '')
  const [subject, setSubject] = useState(`${q.type === 'fattura' ? 'Fattura' : 'Preventivo'} ${q.number} · ${node.title}`)
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true)
    try {
      const j = await call({ action: 'quote-send', ref: node.ref, to, subject, text })
      clearDraft(node.ref); invalidate(); say(`Inviato a ${to} con il PDF allegato${j.drive ? ' · copia su Drive' : ''}`); back()
    } catch (e) { say((e as Error).message, true) } finally { setBusy(false) }
  }
  return (
    <>
      <Head kicker={<><span className="tag">stesso {q.type} · ora invialo</span>{draft && <span className="saved">● bozza salvata</span>}</>}
        title={`Invia a ${node.clientName ?? 'cliente'}`}
        action={<button className="primary" onClick={send} disabled={busy || !to.trim() || !text.trim()}><span className="dot"><I n="send" /></span>{busy ? 'Invio…' : 'Invia'}</button>} />
      <input className="fld" type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="email del cliente" aria-label="Destinatario" autoFocus={!to} />
      <input className="fld" value={subject} onChange={e => setSubject(e.target.value)} aria-label="Oggetto" style={{ marginTop: 8 }} />
      <textarea id="os-draft" value={text} onChange={e => setDraft(node.ref, e.target.value)} aria-label="Messaggio" style={{ marginTop: 22 }} />
      <p className="why"><a className="legacy" href={`/api/os/quote-pdf?id=${q.id}`} target="_blank" rel="noreferrer">📎 {q.type} {q.number}.pdf</a> · {eur(q.total)} · parte dal tuo Gmail</p>
    </>
  )
}

/* Contenuto social: un solo passo avanti alla volta */
function PostView({ node }: { node: NodeDetail }) {
  const { say, invalidate } = useOs.getState()
  const [busy, setBusy] = useState(false)
  const advance = async () => {
    if (!node.next) return
    setBusy(true)
    const r = await fetch('/api/os', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'post-status', ref: node.ref, status: node.next.status }) })
    setBusy(false)
    if (!r.ok) return say('Non sono riuscito ad aggiornarlo', true)
    invalidate(); say(`Ora è “${node.next.status}”`)
  }
  return (
    <>
      <Head kicker={`contenuto${node.clientName ? ` · ${node.clientName}` : ''}`} title={node.title} lead={node.lead}
        action={<><PlusButton node={node} />{node.next && <button className="primary" onClick={advance} disabled={busy}><span className="dot"><I n="arrow" /></span>{node.next.label}</button>}</>} />
      {node.plain ? <div className="letter"><p style={{ whiteSpace: 'pre-line' }}>{node.plain}</p></div> : <p className="empty">Ancora nessun testo.</p>}
      {node.legacy && <p style={{ marginTop: 28 }}><a className="legacy" href={node.legacy}>modifica nell&apos;Editoriale ↗</a></p>}
    </>
  )
}

/* Stessa mail, funzione diversa: rispondere */
function Reply({ node }: { node: NodeDetail }) {
  const draft = useOs(s => s.drafts[node.ref] ?? '')
  const setDraft = useOs(s => s.setDraft)
  const clearDraft = useOs(s => s.clearDraft)
  const say = useOs(s => s.say)
  const back = useOs(s => s.back)
  const invalidate = useOs(s => s.invalidate)
  const [busy, setBusy] = useState<'draft' | 'send' | null>(null)
  const [suggested, setSuggested] = useState(false)
  const ta = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { const t = ta.current; if (t) { t.focus(); t.selectionStart = t.value.length } }, [])

  const askDraft = async () => {
    setBusy('draft')
    const r = await fetch('/api/os', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'draft', ref: node.ref }) })
    const j = await r.json().catch(() => ({}))
    setBusy(null)
    if (!r.ok) return say(j.error ?? 'Bozza non riuscita', true)
    setSuggested(true)
    // la bozza "si scrive" per far capire che è nuova; con movimento ridotto compare subito
    const text: string = j.text, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return setDraft(node.ref, text)
    let i = 0; const tick = () => { i += 4; setDraft(node.ref, text.slice(0, i)); if (i < text.length) requestAnimationFrame(tick) }; tick()
  }
  const send = async () => {
    setBusy('send')
    const r = await fetch('/api/os', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reply', ref: node.ref, text: draft }) })
    const j = await r.json().catch(() => ({}))
    setBusy(null)
    if (!r.ok) return say(j.error ?? 'Invio non riuscito', true)
    clearDraft(node.ref); invalidate(); say('Inviata · ti riporto da dove eri partito'); back(0)
  }

  return (
    <>
      <Head kicker={<><span className="tag">stessa mail · ora rispondi</span>{draft && <span className="saved">● bozza salvata</span>}</>}
        title={`Risposta a ${(node.who ?? '').split(/[\s@]/)[0]}`} orb={node.ini}
        action={<button className="primary" onClick={send} disabled={!draft.trim() || busy === 'send'}><span className="dot"><I n="send" /></span>{busy === 'send' ? 'Invio…' : 'Invia'}</button>} />
      <div className="quote"><b style={{ color: 'var(--ink)' }}>{node.who}:</b> {node.plain?.slice(0, 300)}</div>
      {!draft && <button className="suggest" onClick={askDraft} disabled={busy === 'draft'}><span className="o"><I n="spark" /></span>{busy === 'draft' ? 'Scrivo…' : 'Scrivi una bozza per me'}</button>}
      {suggested && <p className="sugnote">✦ bozza scritta da quello che chiede: rileggila prima di inviare</p>}
      <textarea ref={ta} id="os-draft" value={draft} onChange={e => setDraft(node.ref, e.target.value)} placeholder="Scrivi la risposta…" aria-label="Risposta" />
    </>
  )
}

/* Petali: i rami possibili si aprono a ventaglio dal + ; il resto si attenua */
function Petals({ node }: { node: NodeDetail }) {
  const open = useOs(s => s.petals)
  const setPetals = useOs(s => s.setPetals)
  const toggleAcc = useOs(s => s.toggleAcc)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    if (!open) return
    const plus = document.querySelector('.os [data-plus]'), main = document.querySelector('.os .main')
    if (!plus || !main) return
    const p = plus.getBoundingClientRect(), m = main.getBoundingClientRect()
    setPos({ x: p.left + p.width / 2 - m.left, y: p.top + p.height / 2 - m.top })
  }, [open])
  const k = node.petals.length
  return (
    <>
      <div className="veil" onClick={() => setPetals(false)} />
      {open && pos && (
        <div className="petals" style={{ left: pos.x, top: pos.y }}>
          <button className="petal-hub" onClick={() => setPetals(false)} aria-label="Chiudi"><I n="plus" /></button>
          {node.petals.map((p, i) => {
            const ang = (k === 1 ? 110 : 75 + i * 75 / (k - 1)) * Math.PI / 180
            return (
              <button key={p.label} className={`petal${p.why ? ' best' : ''}`}
                style={{ transform: `translate(${Math.cos(ang) * 128}px, ${Math.sin(ang) * 128}px)`, animationDelay: `${i * 45}ms` }}
                onClick={() => { setPetals(false); toggleAcc(p.kind) }}>
                <I n={p.icon} />{p.label}{p.why && <small>✦ {p.why}</small>}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

export { KIND_LABEL }
