'use client'

import { useEffect, useState } from 'react'
import type { NodeDetail, NodeSummary } from '@/lib/os/graph'
import { useOs } from './store'
import { useNode } from './parts'

type DayEvent = NonNullable<NodeDetail['events']>[number]

const hm = (d: Date) => d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
// coordinate arrotondate: server e browser calcolano i seni con decimali diversi
export const round = (n: number) => Math.round(n * 100) / 100
const hours = (d: Date) => d.getHours() + d.getMinutes() / 60
const span = (mins: number) => { const h = Math.floor(mins / 60), m = mins % 60; return h ? `${h} or${h === 1 ? 'a' : 'e'}${m ? ` e ${m}` : ''}` : `${m} minuti` }

/** ora corrente solo nel browser: il server non la conosce, così la prima resa coincide */
function useNow() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t) }, [])
  return now
}

/** La riga sotto la barra: data e quante persone aspettano */
export function DayLine() {
  const { node } = useNode('list:oggi')
  const now = useNow()
  const date = now?.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  return <p>{date && <b>{date.charAt(0).toUpperCase() + date.slice(1)}</b>}{node?.lead ? `${date ? ' · ' : ''}${node.lead}` : ''}</p>
}

/** Oggi: a sinistra cosa viene dopo, al centro l'anello del giorno con la prima cosa, a destra l'agenda */
export function Today() {
  const { node, err } = useNode('list:oggi')
  const now = useNow()
  const groups = Object.fromEntries(node?.groups ?? [])
  const hero: NodeSummary | undefined = groups.__hero?.[0]
  const poi: NodeSummary[] = groups.Poi ?? []
  const recent: NodeSummary[] = groups['Ripresi di recente'] ?? []
  const changed: NodeSummary[] = groups['Cambiato da ieri'] ?? []
  const events = (node?.events ?? []).filter(e => !e.allDay)

  return (
    <div className="body today">
      <aside className="side l" aria-label="Poi">
        <span className="kick">Poi</span>
        {poi.length ? poi.map(n => <Item key={n.ref} n={n} />) : <p className="itm"><span>Niente in coda.</span></p>}
        {changed.length > 0 && <span className="kick" style={{ marginTop: 12 }}>Cambiato da ieri</span>}
        {changed.slice(0, 3).map(n => <Item key={n.ref} n={n} />)}
        {recent.length > 0 && <span className="kick" style={{ marginTop: 12 }}>Ripresi di recente</span>}
        {recent.map(n => <Item key={n.ref} n={n} />)}
      </aside>

      <div className="center">
        <div className="ringbox">
          <Ring events={events} now={now} />
          <div className="disc">
            {err ? <p className="loading">non riesco a caricare la giornata · {err}</p>
              : !node ? <p className="loading">un attimo…</p>
              : <Hero hero={hero} />}
          </div>
        </div>
      </div>

      <aside className="side r" aria-label="Agenda">
        <span className="kick">Agenda</span>
        <Agenda events={events} now={now} />
      </aside>
    </div>
  )
}

function Hero({ hero }: { hero?: NodeSummary }) {
  const go = useOs(s => s.go)
  const root = useOs(s => s.root)
  if (!hero) return (
    <div className="in">
      <span className="kick">Tutto in ordine</span>
      <h1>Nessuno ti aspetta</h1>
      <p>È il momento buono per il lavoro creativo.</p>
      <button className="primary" onClick={() => root('studio')}><span className="dot" />Apri lo Studio</button>
    </div>
  )
  const isMail = hero.kind === 'mail'
  const from = hero.sub.split(' · ')[0]
  const who = from.includes('@') ? from.split('@')[0] : from     // un indirizzo intero non sta nel disco
  return (
    <div className="in">
      <span className="kick">Inizia da qui</span>
      <h1 className={(isMail ? who.length + 11 : hero.title.length) > 24 ? 'long' : undefined}>{isMail ? `Rispondi a ${who}` : hero.title}</h1>
      <p>{hero.why ? hero.why.charAt(0).toUpperCase() + hero.why.slice(1) : isMail ? `“${hero.title}”` : hero.sub}</p>
      <button className="primary" onClick={() => go(hero.ref, isMail ? 'reply' : 'view')}><span className="dot" />{isMail ? 'Rispondi' : 'Apri'}</button>
    </div>
  )
}

export function Item({ n }: { n: NodeSummary }) {
  const go = useOs(s => s.go)
  const status = n.urgent ? (n.kind === 'mail' ? 'da rispondere' : n.kind === 'post' ? 'doveva uscire' : n.kind === 'quote' ? 'da sollecitare' : 'in ritardo') : null
  return (
    <button className="itm" onClick={() => go(n.ref)}>
      <b>{n.title}</b>
      <span>{n.sub}{status && <> · <em>{status}</em></>}</span>
    </button>
  )
}

/** Agenda in parole: il tempo libero fino al prossimo impegno, poi gli impegni rimasti */
function Agenda({ events, now: at }: { events: DayEvent[]; now: Date | null }) {
  const go = useOs(s => s.go)
  const now = at ?? new Date(0)
  const next = events.find(e => Date.parse(e.end) > now.getTime())
  const free = next ? Math.round((Date.parse(next.start) - now.getTime()) / 60000) : 0
  if (!events.length) return <div className="itm"><b>Nessun impegno</b><span>il calendario di oggi è libero</span></div>
  return (
    <>
      {at && next && free >= 30 && <div className="itm free"><span className="t">{hm(now)} → {hm(new Date(next.start))}</span><b>Libero, {span(free)}</b></div>}
      {events.map(e => {
        const s = new Date(e.start), en = new Date(e.end), past = en.getTime() < now.getTime()
        return (
          <button key={e.ref} className={`itm${past ? ' past' : ''}`} onClick={() => go(e.ref)}>
            <span className="t">{hm(s)} – {hm(en)}</span>
            <b>{e.title}</b>
          </button>
        )
      })}
    </>
  )
}

/** Anello del giorno: 8 in alto, un giro sono 12 ore; gli impegni sono archi cliccabili */
function Ring({ events, now: at }: { events: DayEvent[]; now: Date | null }) {
  const go = useOs(s => s.go)
  const now = at ?? new Date(0)
  const c = 300, R = 262
  const clamp = (h: number) => Math.min(Math.max(h, 8), 20)
  const pt = (h: number, r = R) => { const a = ((clamp(h) - 8) / 12 * 360 - 90) * Math.PI / 180; return [round(c + r * Math.cos(a)), round(c + r * Math.sin(a))] }
  const arc = (h1: number, h2: number) => {
    const [x1, y1] = pt(h1), [x2, y2] = pt(Math.max(h2, h1 + .05))
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 ${clamp(h2) - clamp(h1) > 6 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`
  }
  const h = hours(now)
  const next = events.find(e => Date.parse(e.end) > now.getTime())
  const [nx, ny] = pt(h)
  return (
    <svg viewBox="0 0 600 600" role="img" aria-label={`${at ? `Sono le ${hm(now)}. ` : ''}${events.length ? `${events.length} impegni oggi` : 'Nessun impegno oggi'}`}>
      <circle cx={c} cy={c} r={R} fill="none" stroke="var(--line)" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => { const [x1, y1] = pt(8 + i, R - 8), [x2, y2] = pt(8 + i, R + 8); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c3c9d1" strokeWidth={i % 3 ? 1 : 2} /> })}
      {[8, 11, 14, 17].map(x => { const [tx, ty] = pt(x, R + 28); return <text key={x} x={tx} y={ty + 5} textAnchor="middle" fill="var(--t3)" fontFamily="Figtree Variable, sans-serif" fontSize="14" fontWeight="600">{x}</text> })}
      {at && next && h >= 8 && h < 20 && <path d={arc(h, hours(new Date(next.start)))} fill="none" stroke="#ffd9c9" strokeWidth="4" strokeLinecap="round" />}
      {events.map(e => {
        const s = new Date(e.start), en = new Date(e.end), past = en.getTime() < now.getTime()
        if (hours(en) <= 8 || hours(s) >= 20) return null
        return <path key={e.ref} className="ev" d={arc(hours(s), hours(en))} fill="none" stroke={past ? '#b9c0ca' : 'var(--ink)'} strokeWidth="14" strokeLinecap="round" onClick={() => go(e.ref)}><title>{`${hm(s)} ${e.title}`}</title></path>
      })}
      {at && h >= 8 && h <= 20 && <><circle cx={nx} cy={ny} r="13" fill="var(--surface)" /><circle cx={nx} cy={ny} r="8" fill="var(--hot)" /></>}
    </svg>
  )
}
