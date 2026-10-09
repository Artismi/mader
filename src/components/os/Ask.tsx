'use client'

import { useEffect, useRef, useState } from 'react'
import type { NodeSummary } from '@/lib/os/graph'
import { useOs, current, kindOf } from './store'
import { I, KIND_ICON, KIND_LABEL } from './parts'
import { SECTIONS } from './Around'

interface Item { t: string; m: string; icon: string; sug?: boolean; run: () => void }

const SECTION_OF: Record<string, string> = { mail: 'messaggi', client: 'clienti', task: 'lavori', design: 'studio' }

/** Chiedi o cerca (Ctrl+K): in cima i suggerimenti per ciò che stai guardando, ognuno col suo perché */
export function Ask({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<NodeSummary[]>([])
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const s = useOs.getState()
  const here = current(s), node = s.nodes[here.ref]

  useEffect(() => { input.current?.focus() }, [])
  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const t = setTimeout(() => fetch(`/api/os?q=${encodeURIComponent(q)}`).then(r => r.json()).then(setResults).catch(() => setResults([])), 140)
    return () => clearTimeout(t)
  }, [q])

  const open = (ref: string) => { const st = useOs.getState(); st.root(SECTION_OF[kindOf(ref)] ?? 'oggi'); st.go(ref) }

  const suggestions: Item[] = []
  if (!q.trim() && node) {
    if (kindOf(here.ref) === 'mail' && here.mode !== 'reply') suggestions.push({ t: `Rispondi a ${(node.who ?? '').split(/[\s@]/)[0]}`, m: node.why ?? 'aspetta una risposta', icon: 'reply', sug: true, run: () => s.go(here.ref, 'reply') })
    for (const sat of node.sats.filter(x => x.kind !== 'client')) {
      const [why, what] = sat.tip.split('→').map(x => x.trim())
      suggestions.push({ t: (what ?? why).replace(/^./, c => c.toUpperCase()), m: what ? why : 'accessorio', icon: sat.kind === 'calendar' ? 'cal' : sat.kind === 'quote' ? 'euro' : 'check', sug: true, run: () => s.toggleAcc(sat.kind, sat.ref) })
    }
    const hero = s.nodes['list:oggi']?.groups?.find(g => g[0] === '__hero')?.[1]?.[0]
    if (hero && hero.ref !== here.ref) suggestions.push({ t: hero.kind === 'mail' ? `Rispondi a ${hero.sub.split(' · ')[0]}` : hero.title, m: hero.why ?? 'la cosa più importante adesso', icon: 'arrow', sug: true, run: () => open(hero.ref) })
  }
  const sections: Item[] = SECTIONS.filter(([, l]) => q.trim() && l.toLowerCase().includes(q.trim().toLowerCase())).map(([id, l, icon]) => ({ t: l, m: 'sezione', icon, run: () => s.root(id) }))
  const found: Item[] = results.map(n => ({ t: n.title, m: [KIND_LABEL[n.kind], n.sub].filter(Boolean).join(' · '), icon: KIND_ICON[n.kind] ?? 'file', run: () => open(n.ref) }))
  const items = [...suggestions, ...sections, ...found]

  const pick = (i: number) => { const it = items[i]; if (!it) return; onClose(); it.run() }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose() }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (items.length) setSel(v => (v + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(sel) }
  }

  return (
    <div className="k" role="dialog" aria-label="Chiedi o cerca" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="kbox">
        <div className="kin"><span className="o"><I n="spark" /></span>
          <input ref={input} value={q} onChange={e => { setQ(e.target.value); setSel(0) }} onKeyDown={onKey} placeholder="Cerca una persona, una mail, un lavoro…" aria-label="Cerca" /></div>
        <div className="klist" role="listbox">
          {suggestions.length > 0 && <h5>✦ suggeriti adesso</h5>}
          {items.map((it, i) => (
            <div key={i}>
              {i === suggestions.length && suggestions.length > 0 && i < items.length && <h5>risultati</h5>}
              <button className={`kit${it.sug ? ' sug' : ''}`} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => pick(i)}>
                <span className="av"><I n={it.icon} /></span><span className="mn"><span className="t">{it.t}</span><span className="m">{it.m}</span></span>{i === sel && <kbd>Invio</kbd>}
              </button>
            </div>
          ))}
          {!items.length && <p style={{ padding: 20, color: 'var(--t3)' }}>{q.trim() ? 'Nessun risultato. Prova con il nome di una persona.' : 'Scrivi per cercare.'}</p>}
        </div>
      </div>
    </div>
  )
}
