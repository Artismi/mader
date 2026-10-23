'use client'

import { useEffect, useState } from 'react'
import type { NodeDetail, NodeSummary } from '@/lib/os/graph'
import { useOs, current } from './store'

/* ───── icone (sprite unico, tratto lucide) ───── */
const PATHS: Record<string, string> = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  check: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  euro: '<path d="M18 7a7 7 0 1 0 0 10M4 10h10M4 14h10"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  reply: '<path d="M9 17l-5-5 5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
  spark: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  out: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
}
export function Sprite() {
  return (
    <svg style={{ display: 'none' }} xmlns="http://www.w3.org/2000/svg"
      dangerouslySetInnerHTML={{ __html: Object.entries(PATHS).map(([k, p]) => `<symbol id="os-${k}" viewBox="0 0 24 24">${p}</symbol>`).join('') }} />
  )
}
export const I = ({ n }: { n: string }) => <svg className="i" aria-hidden="true"><use href={`#os-${n}`} /></svg>
export const KIND_ICON: Record<string, string> = { mail: 'inbox', client: 'users', task: 'check', design: 'pen', quote: 'euro', idea: 'spark', event: 'cal', post: 'send' }
export const KIND_LABEL: Record<string, string> = { list: '', mail: 'mail', client: 'cliente', task: 'task', design: 'design', quote: 'preventivo', idea: 'idea', event: 'evento', post: 'contenuto' }

/* ───── caricamento di un nodo (con cache nello store) ───── */
export function useNode(ref: string) {
  const node = useOs(s => s.nodes[ref])
  const setNode = useOs(s => s.setNode)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    if (node) return
    setErr(null)
    const url = ref.startsWith('list:') ? `/api/os?list=${ref.slice(5)}` : `/api/os?ref=${encodeURIComponent(ref)}`
    let alive = true
    fetch(url).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Errore'); return j as NodeDetail })
      .then(n => { if (alive) setNode({ ...n, ref }) })
      .catch(e => { if (alive) setErr(e.message) })
    return () => { alive = false }
  }, [ref, node, setNode])
  return { node, err }
}

/* ───── riga di elenco ───── */
export function Row({ n }: { n: NodeSummary }) {
  const go = useOs(s => s.go)
  const was = useOs(s => current(s).mem.from === n.ref)
  return (
    <button className={`row${was ? ' was' : ''}`} onClick={() => go(n.ref)}>
      <span className="av">{n.ini ?? <I n={KIND_ICON[n.kind] ?? 'file'} />}</span>
      <span className="mn"><span className="t">{n.title}</span><span className="m">{n.sub}</span></span>
      {n.urgent ? <span className="pill">{n.kind === 'mail' ? 'da rispondere' : n.kind === 'post' ? 'doveva uscire' : n.kind === 'quote' ? 'da sollecitare' : 'in ritardo'}</span> : <span className="w">{n.when}</span>}
    </button>
  )
}

export function Group({ label, items, empty = 'Niente qui.' }: { label: string; items: NodeSummary[]; empty?: string }) {
  return (
    <>
      <h2>{label}<span>{items.length}</span></h2>
      {items.length ? items.map(n => <Row key={n.ref} n={n} />) : <p className="empty">{empty}</p>}
    </>
  )
}

/* ───── messaggio a comparsa ───── */
export function Toast() {
  const toast = useOs(s => s.toast)
  const [on, setOn] = useState(false)
  useEffect(() => { if (!toast) return; setOn(true); const t = setTimeout(() => setOn(false), 2800); return () => clearTimeout(t) }, [toast])
  return <div className={`toast${on ? ' on' : ''}${toast?.err ? ' err' : ''}`} role="status">{toast?.text}</div>
}
