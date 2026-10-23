'use client'

import { useEffect, useState } from 'react'
import type { NodeDetail, NodeSummary } from '@/lib/os/graph'
import { useOs } from './store'
import { DotsRing, RingPlace, Sheet } from './Ring'

const dueList = (n: NodeDetail): NodeSummary[] => Object.fromEntries(n.groups ?? [])['Per scadenza'] ?? []

/** I sette giorni da oggi, come parole sull'anello; calcolati solo nel browser (fuso dell'utente) */
function useWeekLabels() {
  const [labels, setLabels] = useState<[number, string][]>([[.5, 'oggi']])
  useEffect(() => {
    const d = new Date()
    setLabels(Array.from({ length: 7 }, (_, i) => {
      const x = new Date(d); x.setDate(d.getDate() + i)
      return [i + .5, i === 0 ? 'oggi' : i === 1 ? 'domani' : x.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', '')]
    }))
  }, [])
  return labels
}

/** Lavori: la settimana è l'anello (oggi in alto, sette spicchi), al centro ciò che scade per primo */
export function LavoriView({ notice }: { notice?: React.ReactNode }) {
  const labels = useWeekLabels()
  return (
    <RingPlace
      nref="list:lavori"
      notice={notice}
      leftLabel="Da fare"
      left={n => dueList(n).slice(0, 4)}
      emptyLeft="Nessun task con una scadenza."
      ring={n => <DotsRing marks={n?.marks ?? []} span={7} mid labels={labels} label={`${n?.marks?.length ?? 0} cose nei prossimi 7 giorni`} />}
      core={n => <WorkCore first={dueList(n)[0]} />}
    />
  )
}

function WorkCore({ first }: { first?: NodeSummary }) {
  const go = useOs(s => s.go)
  const toggleAcc = useOs(s => s.toggleAcc)
  return (
    <div className="in">
      <span className="kick">{first?.urgent ? 'In ritardo' : first ? 'Scade per primo' : 'Settimana libera'}</span>
      <h1 className={(first?.title.length ?? 0) > 24 ? 'long' : undefined} title={first?.title}>{first?.title ?? 'Niente in scadenza'}</h1>
      <p>{first ? first.sub : 'Nessun task ha una data: aggiungine uno o dai una scadenza a quelli aperti.'}</p>
      <div className="choices">
        {first && <button className="primary" onClick={() => go(first.ref)}><span className="dot" />Apri</button>}
        <button className="choice" onClick={() => toggleAcc('task')}>+ Nuovo task</button>
      </div>
    </div>
  )
}

/** Archivio: al centro una domanda e un campo, intorno ciò che hai salvato negli ultimi 30 giorni */
export function ArchivioView({ notice }: { notice?: React.ReactNode }) {
  const [q, setQ] = useState('')
  const [found, setFound] = useState<NodeSummary[] | null>(null)
  useEffect(() => {
    if (!q.trim()) { setFound(null); return }
    const t = setTimeout(() => fetch(`/api/os?q=${encodeURIComponent(q)}`).then(r => r.json()).then(setFound).catch(() => setFound([])), 160)
    return () => clearTimeout(t)
  }, [q])
  // il campo passa dal disco al foglio dei risultati: riprende il fuoco con il cursore in fondo
  const field = (
    <input key="seek" className="fld seek" value={q} onChange={e => setQ(e.target.value)} placeholder="un nome, un cliente, un'idea…" aria-label="Cerca nell'archivio"
      autoFocus={!!q} onFocus={e => { const l = e.target.value.length; e.target.setSelectionRange(l, l) }}
      onKeyDown={e => { if (e.key === 'Escape') setQ('') }} />
  )
  return (
    <RingPlace
      nref="list:archivio"
      notice={notice}
      leftLabel="Ripresi di recente"
      left={n => { const g = Object.fromEntries(n.groups ?? []); return [...(g.Design ?? []).slice(0, 2), ...(g.Idee ?? []).slice(0, 2)] }}
      emptyLeft="Ancora niente di salvato."
      ring={n => <DotsRing marks={n?.marks ?? []} span={30} labels={[[0, 'oggi'], [10, '−10 g'], [20, '−20 g']]} label={`${n?.marks?.length ?? 0} cose salvate negli ultimi 30 giorni`} />}
      core={() => (
        <div className="in">
          <span className="kick">Archivio</span>
          <h1>Cosa cerchi?</h1>
          <p>Idee, design, clienti, mail e preventivi in un solo campo.</p>
          {field}
        </div>
      )}
      rightExtra={<a className="itm" href="/memoria"><b>File del vault ↗</b><span>cartelle e note su Drive</span></a>}
      center={q.trim() ? (
        <div className="seek-wrap">
          {field}
          <Sheet kicker="Archivio" title={`Risultati per “${q.trim()}”`} items={found ?? []} empty={found ? 'Niente con queste parole. Prova con il nome di un cliente.' : 'Cerco…'} />
        </div>
      ) : undefined}
    />
  )
}

const groupOf = (n: NodeDetail, label: string): NodeSummary[] => Object.fromEntries(n.groups ?? [])[label] ?? []
const RING_30: [number, string][] = [[0, 'oggi'], [10, '−10 g'], [20, '−20 g']]

/** Messaggi: chi aspetta una risposta sta al centro; intorno le mail che contano degli ultimi 30 giorni */
export function MessaggiView({ notice }: { notice?: React.ReactNode }) {
  return (
    <RingPlace
      nref="list:messaggi"
      notice={notice}
      leftLabel="Aspettano anche"
      left={n => groupOf(n, 'Da rispondere').slice(1, 5)}
      emptyLeft="Nessun altro aspetta."
      ring={n => <DotsRing marks={n?.marks ?? []} span={30} labels={RING_30} label={`${n?.marks?.length ?? 0} mail importanti negli ultimi 30 giorni`} />}
      core={n => <MailCore first={groupOf(n, 'Da rispondere')[0]} />}
    />
  )
}

function MailCore({ first }: { first?: NodeSummary }) {
  const go = useOs(s => s.go)
  const root = useOs(s => s.root)
  if (!first) return (
    <div className="in">
      <span className="kick">Messaggi</span>
      <h1>Nessuno ti aspetta</h1>
      <p>Le newsletter e le notifiche sono raccolte in “Il resto”.</p>
      <button className="primary" onClick={() => root('studio')}><span className="dot" />Vai allo Studio</button>
    </div>
  )
  const from = first.sub.split(' · ')[0]
  const who = from.includes('@') ? from.split('@')[0] : from
  return (
    <div className="in">
      <span className="kick">Da rispondere · {first.when}</span>
      <h1 className={who.length + 11 > 24 ? 'long' : undefined}>Rispondi a {who}</h1>
      <p>{first.why ? first.why.charAt(0).toUpperCase() + first.why.slice(1) : `“${first.title}”`}</p>
      <div className="choices">
        <button className="primary" onClick={() => go(first.ref, 'reply')}><span className="dot" />Rispondi</button>
        <button className="choice" onClick={() => go(first.ref)}>Leggi la mail</button>
      </div>
    </div>
  )
}

/** Studio: al centro il design da riprendere, a sinistra i contenuti in uscita, intorno gli ultimi 30 giorni */
export function StudioView({ notice }: { notice?: React.ReactNode }) {
  return (
    <RingPlace
      nref="list:studio"
      notice={notice}
      leftLabel="Contenuti in uscita"
      left={n => groupOf(n, 'Contenuti social').slice(0, 4)}
      emptyLeft="Nessun contenuto in piano."
      ring={n => <DotsRing marks={n?.marks ?? []} span={30} labels={RING_30} label={`${n?.marks?.length ?? 0} lavori toccati negli ultimi 30 giorni`} />}
      core={n => <DesignCore last={groupOf(n, 'Design')[0]} />}
    />
  )
}

function DesignCore({ last }: { last?: NodeSummary }) {
  const go = useOs(s => s.go)
  if (!last) return (
    <div className="in">
      <span className="kick">Studio</span>
      <h1>Il primo design</h1>
      <p>Apri il canvas e scegli un formato: post, story o copertina.</p>
      <a className="primary" href="/os/studio/nuovo"><span className="dot" />Apri il canvas</a>
    </div>
  )
  return (
    <div className="in">
      <span className="kick">Riprendi da qui</span>
      <h1 className={last.title.length > 24 ? 'long' : undefined}>{last.title}</h1>
      <p>{last.sub}</p>
      <div className="choices">
        <a className="primary" href={`/os/studio/${last.ref.slice('design:'.length)}`}><span className="dot" />Apri nello Studio</a>
        <button className="choice" onClick={() => go(last.ref)}>Dettagli</button>
      </div>
    </div>
  )
}
