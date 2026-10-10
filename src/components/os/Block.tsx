'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'   // navigazione interna: la catena resta in memoria
import type { NodeDetail } from '@/lib/os/graph'
import { useOs, current, kindOf } from './store'
import { Clock, Group, I, KIND_LABEL, useNode } from './parts'

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

  if (node.ref === 'list:oggi') {
    const groups = Object.fromEntries(node.groups ?? [])
    const hero = groups.__hero?.[0]
    const date = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
    return (
      <>
        <Head kicker={date} title={node.title} lead={node.lead} />
        <div className="today">
          <Clock events={node.events} />
          {hero ? (
            <button className="hero" onClick={() => go(hero.ref)}>
              <span className="lbl">Inizia da qui</span>
              <span className="t">{hero.kind === 'mail' ? `Rispondi a ${hero.sub.split(' · ')[0]}` : hero.title}</span>
              <span className="m">{hero.kind === 'mail' ? `“${hero.title}” · ${hero.when}` : hero.sub}</span>
              {hero.why && <span className="why">{hero.why}</span>}
            </button>
          ) : <p className="why">nessuno ti aspetta: è il momento buono per lo Studio</p>}
        </div>
        {(node.groups ?? []).filter(([l]) => l !== '__hero').map(([l, items]) => <Group key={l} label={l} items={items} empty="Tutto fatto qui." />)}
      </>
    )
  }

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
      {(node.groups ?? []).map(([l, items]) => <Group key={l} label={l} items={items} empty={l === 'Prossima cosa' ? 'Non aspetta nulla da te.' : 'Niente qui.'} />)}
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
