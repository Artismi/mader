'use client'

import { useState } from 'react'
import type { NodeDetail, NodeSummary } from '@/lib/os/graph'
import { useOs } from './store'
import { Group, useNode } from './parts'
import { Accessories } from './Around'
import { Item, round } from './Today'

type Mark = NonNullable<NodeDetail['marks']>[number]

/** Lo schema "ad anello" di un luogo: riga di contesto, a sinistra cosa fare, al centro l'anello
 *  con il disco, a destra i numeri e gli accessori, in basso le sezioni. Una sezione aperta
 *  prende il posto dell'anello come foglio; `center` lo sostituisce del tutto (es. una ricerca). */
export function RingPlace({ nref, notice, leftLabel, left, emptyLeft, ring, core, rightExtra, center }: {
  nref: string
  notice?: React.ReactNode
  leftLabel: string
  left: (n: NodeDetail) => NodeSummary[]
  emptyLeft: string
  ring: (n?: NodeDetail) => React.ReactNode
  core: (n: NodeDetail) => React.ReactNode
  rightExtra?: React.ReactNode
  center?: React.ReactNode
}) {
  const { node, err } = useNode(nref)
  const [tab, setTab] = useState<string | null>(null)
  const groups = node?.groups ?? []
  const shown = tab ? groups.find(([l]) => l === tab) : undefined
  const items = node ? left(node) : []

  return (
    <>
      <div className="subline">
        {notice}
        {node?.brief && <span className="brief">{node.brief}</span>}
      </div>

      <div className="body today">
        <aside className="side l" aria-label={leftLabel}>
          <span className="kick">{leftLabel}</span>
          {items.length ? items.map(n => <Item key={n.ref} n={n} />) : <div className="itm"><span>{node ? emptyLeft : '…'}</span></div>}
        </aside>

        <div className="center">
          {center ?? (shown ? <Sheet kicker={node?.title} title={shown[0]} items={shown[1]} /> : (
            <div className="ringbox">
              {ring(node)}
              <div className="disc">
                {err ? <p className="loading">non riesco a caricarlo · {err}</p>
                  : !node ? <p className="loading">un attimo…</p>
                  : core(node)}
              </div>
            </div>
          ))}
        </div>

        <aside className="side r" aria-label="In numeri">
          <span className="kick">In numeri</span>
          {(node?.stats ?? []).map(s => <div key={s.label} className="itm num"><b>{s.value}</b><span>{s.label}</span></div>)}
          {rightExtra}
          <Accessories />
        </aside>
      </div>

      <footer className="foot">
        <nav className="places tabs" aria-label="Sezioni">
          <button aria-current={!tab ? 'page' : undefined} onClick={() => setTab(null)}>Panoramica</button>
          {groups.map(([l, list]) => (
            <button key={l} aria-current={tab === l ? 'page' : undefined} onClick={() => setTab(l)}>{l}<span className="c">{list.length}</span></button>
          ))}
        </nav>
      </footer>
    </>
  )
}

/** Un elenco al posto dell'anello: stesso posto, stessa larghezza del disco */
export function Sheet({ kicker, title, items, empty = 'Niente qui.' }: { kicker?: string; title: string; items: NodeSummary[]; empty?: string }) {
  return (
    <section className="main" aria-label={title}>
      <div className="scroll"><div className="col">
        {kicker && <p className="kicker">{kicker}</p>}
        <h1>{title}</h1>
        <Group label="Elenco" items={items} empty={empty} />
      </div></div>
    </section>
  )
}

/** Anello a punti: `span` parti in un giro, la parte 0 in alto, in senso orario.
 *  Ogni segno è un punto cliccabile; quelli `waiting` restano cerchi vuoti arancio. */
export function DotsRing({ marks, span, labels, mid = false, label }: {
  marks: Mark[]
  span: number
  labels: [number, string][]
  mid?: boolean                       // i segni stanno a metà della loro parte (giorni della settimana)
  label: string
}) {
  const go = useOs(s => s.go)
  const c = 300, R = 262
  const pt = (d: number, r = R) => { const a = (d / span * 360 - 90) * Math.PI / 180; return [round(c + r * Math.cos(a)), round(c + r * Math.sin(a))] }
  const perPart = new Map<number, number>()
  return (
    <svg viewBox="0 0 600 600" role="img" aria-label={label}>
      <circle cx={c} cy={c} r={R} fill="none" stroke="var(--line)" strokeWidth="2" />
      {Array.from({ length: span }, (_, d) => { const [x1, y1] = pt(d, R - 7), [x2, y2] = pt(d, R + 7); return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c9cfd7" strokeWidth={span <= 12 || d % 10 === 0 ? 2 : 1} /> })}
      {labels.map(([d, t]) => { const [x, y] = pt(d, R + 30); return <text key={t} x={x} y={y + 5} textAnchor="middle" fill="var(--t3)" fontFamily="Figtree Variable, sans-serif" fontSize="14" fontWeight="600">{t}</text> })}
      {[...marks].sort((a, b) => Number(!!a.waiting) - Number(!!b.waiting)).map(m => {
        const k = perPart.get(m.days) ?? 0
        perPart.set(m.days, k + 1)
        if (k > 3) return null                                   // oltre quattro nella stessa parte: basta il segno
        const [x, y] = pt(m.days + (mid ? .5 : 0), R - k * 20)
        return (
          <circle key={m.ref} cx={x} cy={y} r={m.waiting ? 11 : 9} fill={m.waiting ? 'var(--surface)' : 'var(--ink)'} stroke={m.waiting ? 'var(--hot)' : 'var(--bg)'} strokeWidth={m.waiting ? 3.5 : 3}
            style={{ cursor: 'pointer' }} onClick={() => go(m.ref)}>
            <title>{m.title}</title>
          </circle>
        )
      })}
    </svg>
  )
}
