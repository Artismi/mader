'use client'

import { useState } from 'react'
import type { NodeDetail, NodeSummary } from '@/lib/os/graph'
import { useOs } from './store'
import { Group, I, useNode } from './parts'
import { Accessories } from './Around'
import { Item, round } from './Today'

type Mark = NonNullable<NodeDetail['marks']>[number]

/** Scheda cliente "ad anello": il cliente al centro, i suoi ultimi 30 giorni intorno,
 *  a sinistra cosa fare per lui, a destra i suoi numeri, in basso le sezioni della scheda */
export function ClientView({ cref, notice }: { cref: string; notice?: React.ReactNode }) {
  const { node, err } = useNode(cref)
  const [tab, setTab] = useState<string | null>(null)
  const groups = node?.groups ?? []
  const byLabel = Object.fromEntries(groups)
  const next: NodeSummary[] = [...(byLabel['Da rispondere'] ?? []), ...(byLabel.Lavori ?? [])].slice(0, 3)
  const shown = tab ? groups.find(([l]) => l === tab) : undefined

  return (
    <>
      <div className="subline">
        {notice}
        {node?.brief && <span className="brief">{node.brief}</span>}
      </div>

      <div className="body today">
        <aside className="side l" aria-label="Prossime cose">
          <span className="kick">Prossime cose</span>
          {next.length ? next.map(n => <Item key={n.ref} n={n} />) : <div className="itm"><span>Non aspetta nulla da te.</span></div>}
        </aside>

        <div className="center">
          {shown ? (
            <section className="main" aria-label={shown[0]}>
              <div className="scroll"><div className="col">
                <p className="kicker">{node?.title}</p>
                <h1>{shown[0]}</h1>
                <Group label="Tutto" items={shown[1]} empty="Niente qui." />
              </div></div>
            </section>
          ) : (
            <div className="ringbox">
              <MarksRing marks={node?.marks ?? []} />
              <div className="disc">
                {err ? <p className="loading">non riesco a caricare il cliente · {err}</p>
                  : !node ? <p className="loading">un attimo…</p>
                  : <ClientCore node={node} next={next[0]} />}
              </div>
            </div>
          )}
        </div>

        <aside className="side r" aria-label="In numeri">
          <span className="kick">In numeri</span>
          {(node?.stats ?? []).map(s => <div key={s.label} className="itm num"><b>{s.value}</b><span>{s.label}</span></div>)}
          <Accessories />
        </aside>
      </div>

      <footer className="foot">
        <nav className="places tabs" aria-label="Sezioni del cliente">
          <button aria-current={!tab ? 'page' : undefined} onClick={() => setTab(null)}>Panoramica</button>
          {groups.map(([l, items]) => (
            <button key={l} aria-current={tab === l ? 'page' : undefined} onClick={() => setTab(l)}>{l}<span className="c">{items.length}</span></button>
          ))}
        </nav>
      </footer>
    </>
  )
}

function ClientCore({ node, next }: { node: NodeDetail; next?: NodeSummary }) {
  const toggleAcc = useOs(s => s.toggleAcc)
  const [choosing, setChoosing] = useState(false)
  const sector = node.lead?.split(' · ').find(x => !x.includes('@'))
  return (
    <div className="in">
      <span className="orb">{node.ini}</span>
      <span className="kick">Cliente{sector ? ` · ${sector}` : ''}</span>
      <h1>{node.title}</h1>
      <p>{next ? `Prossima cosa: ${next.title}` : 'Non aspetta nulla da te.'}</p>
      {choosing ? (
        <div className="choices" role="group" aria-label="Crea per questo cliente">
          {node.petals.map(p => (
            <button key={p.label} className="choice" onClick={() => { setChoosing(false); toggleAcc(p.kind) }}><I n={p.icon} />{p.label}</button>
          ))}
          <button className="choice x" onClick={() => setChoosing(false)} aria-label="Chiudi"><I n="x" /></button>
        </div>
      ) : (
        <button className="primary" onClick={() => setChoosing(true)}><span className="dot" />Nuovo…</button>
      )}
    </div>
  )
}

/** Anello dei 30 giorni: oggi in alto, si va indietro in senso orario; ogni contatto è un punto */
function MarksRing({ marks }: { marks: Mark[] }) {
  const go = useOs(s => s.go)
  const c = 300, R = 262
  const pt = (d: number, r = R) => { const a = (d / 30 * 360 - 90) * Math.PI / 180; return [round(c + r * Math.cos(a)), round(c + r * Math.sin(a))] }
  const perDay = new Map<number, number>()
  return (
    <svg viewBox="0 0 600 600" role="img" aria-label={`${marks.length} contatti negli ultimi 30 giorni`}>
      <circle cx={c} cy={c} r={R} fill="none" stroke="var(--line)" strokeWidth="2" />
      {Array.from({ length: 30 }, (_, d) => { const [x1, y1] = pt(d, R - 6), [x2, y2] = pt(d, R + 6); return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c9cfd7" strokeWidth={d % 10 ? 1 : 2} /> })}
      {([[0, 'oggi'], [10, '−10 g'], [20, '−20 g']] as const).map(([d, t]) => { const [x, y] = pt(d, R + 30); return <text key={d} x={x} y={y + 5} textAnchor="middle" fill="var(--t3)" fontFamily="Figtree Variable, sans-serif" fontSize="14" fontWeight="600">{t}</text> })}
      {[...marks].sort((a, b) => Number(!!a.waiting) - Number(!!b.waiting)).map(m => {
        const k = perDay.get(m.days) ?? 0
        perDay.set(m.days, k + 1)
        if (k > 2) return null                                   // più di tre nello stesso giorno: basta il segno
        const [x, y] = pt(m.days, R - k * 20)
        return (
          <circle key={m.ref} cx={x} cy={y} r={m.waiting ? 11 : 9} fill={m.waiting ? 'var(--surface)' : 'var(--ink)'} stroke={m.waiting ? 'var(--hot)' : 'var(--bg)'} strokeWidth={m.waiting ? 3.5 : 3}
            style={{ cursor: 'pointer' }} onClick={() => go(m.ref)}>
            <title>{`${m.days === 0 ? 'oggi' : `${m.days} giorni fa`} · ${m.title}${m.waiting ? ' · senza risposta' : ''}`}</title>
          </circle>
        )
      })}
    </svg>
  )
}
