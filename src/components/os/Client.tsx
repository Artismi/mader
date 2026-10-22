'use client'

import { useState } from 'react'
import type { NodeDetail, NodeSummary } from '@/lib/os/graph'
import { useOs } from './store'
import { I } from './parts'
import { DotsRing, RingPlace } from './Ring'

const next = (n: NodeDetail): NodeSummary[] => {
  const byLabel = Object.fromEntries(n.groups ?? [])
  return [...(byLabel['Da rispondere'] ?? []), ...(byLabel.Lavori ?? [])].slice(0, 3)
}

/** Scheda cliente "ad anello": il cliente al centro, i suoi ultimi 30 giorni intorno,
 *  a sinistra cosa fare per lui, a destra i suoi numeri, in basso le sezioni della scheda */
export function ClientView({ cref, notice }: { cref: string; notice?: React.ReactNode }) {
  return (
    <RingPlace
      nref={cref}
      notice={notice}
      leftLabel="Prossime cose"
      left={next}
      emptyLeft="Non aspetta nulla da te."
      ring={n => <DotsRing marks={n?.marks ?? []} span={30} labels={[[0, 'oggi'], [10, '−10 g'], [20, '−20 g']]} label={`${n?.marks?.length ?? 0} contatti negli ultimi 30 giorni`} />}
      core={n => <ClientCore node={n} next={next(n)[0]} />}
    />
  )
}

function ClientCore({ node, next }: { node: NodeDetail; next?: NodeSummary }) {
  const sector = node.lead?.split(' · ').find(x => !x.includes('@'))
  return (
    <div className="in">
      <span className="orb">{node.ini}</span>
      <span className="kick">Cliente{sector ? ` · ${sector}` : ''}</span>
      <h1>{node.title}</h1>
      <p>{next ? `Prossima cosa: ${next.title}` : 'Non aspetta nulla da te.'}</p>
      <NewChoices petals={node.petals} />
    </div>
  )
}

/** "Nuovo…": i rami possibili da qui, aperti come accessori a destra */
export function NewChoices({ petals, label = 'Nuovo…' }: { petals: NodeDetail['petals']; label?: string }) {
  const toggleAcc = useOs(s => s.toggleAcc)
  const [choosing, setChoosing] = useState(false)
  if (!petals.length) return null
  if (!choosing) return <button className="primary" onClick={() => setChoosing(true)}><span className="dot" />{label}</button>
  return (
    <div className="choices" role="group" aria-label="Crea">
      {petals.map(p => (
        <button key={p.label} className="choice" onClick={() => { setChoosing(false); toggleAcc(p.kind) }}><I n={p.icon} />{p.label}</button>
      ))}
      <button className="choice x" onClick={() => setChoosing(false)} aria-label="Chiudi"><I n="x" /></button>
    </div>
  )
}
