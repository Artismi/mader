'use client'

import { useEffect, useRef, useState } from 'react'
import './os.css'
import { useOs } from './store'
import { I, Sprite, Toast } from './parts'
import { Block } from './Block'
import { Accessories, Chain, Dial, Orbit } from './Around'
import { Ask } from './Ask'

/** Avviso solo quando serve: senza Google non si inviano risposte e le mail non si aggiornano */
function GoogleLink() {
  const [s, setS] = useState<{ connected: boolean } | null>(null)
  useEffect(() => { fetch('/api/os?google').then(r => r.json()).then(setS).catch(() => setS(null)) }, [])
  if (!s || s.connected) return null
  return (
    <a className="glink" href="/login">
      <span className="o"><I n="inbox" /></span>
      <span><b>Google scollegato</b><small>mail e invio fermi · ricollega</small></span>
    </a>
  )
}

// Lo streaming di Next può lasciare montata una seconda copia nascosta (#S:0):
// solo un guscio alla volta ascolta la tastiera, altrimenti Ctrl+K scatterebbe due volte.
let owner = 0, seq = 0

/** Guscio circolare: ghiera + catena a sinistra, un blocco al centro, satelliti e accessori a destra */
export function Shell() {
  const [asking, setAsking] = useState(false)
  const hydrate = useOs(s => s.hydrate)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => { hydrate() }, [hydrate])

  useEffect(() => {
    if (owner || !rootRef.current?.offsetWidth) return   // solo la copia visibile
    const me = owner = ++seq
    // il punto del clic serve alla trasformazione "a cerchio"
    const onDown = (e: PointerEvent) => useOs.getState().setOrigin({ x: e.clientX, y: e.clientY })
    const onKey = (e: KeyboardEvent) => {
      const s = useOs.getState()
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setAsking(v => !v); return }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); s.back(); return }
      if (e.key === 'Escape' && !document.querySelector('.os .k')) {
        if (s.petals) s.setPetals(false)
        else if (s.accs.length) s.closeAcc(s.accs[0].key)
        else if (!(e.target as HTMLElement).closest('textarea')) s.back()
      }
    }
    addEventListener('pointerdown', onDown)
    addEventListener('keydown', onKey)
    return () => { removeEventListener('pointerdown', onDown); removeEventListener('keydown', onKey); if (owner === me) owner = 0 }
  }, [])

  return (
    <div className="os" ref={rootRef}>
      <Sprite />
      <aside className="left">
        <Dial />
        <Chain />
        <GoogleLink />
        <button className="ask" onClick={() => setAsking(true)}><span className="o"><I n="spark" /></span>Chiedi o cerca<kbd>Ctrl K</kbd></button>
        <a className="legacy" href="/" title="L'interfaccia precedente resta disponibile durante il passaggio">interfaccia precedente</a>
      </aside>
      <div className="stage">
        <Block />
        <Orbit />
      </div>
      <Accessories />
      {asking && <Ask onClose={() => setAsking(false)} />}
      <Toast />
    </div>
  )
}
