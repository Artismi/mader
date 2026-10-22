'use client'

import { useEffect, useRef, useState } from 'react'
import './os.css'
import { useOs, current, kindOf } from './store'
import { I, Sprite, Toast } from './parts'
import { Block } from './Block'
import { Accessories, Needs, Path, Places, SECTIONS, Waiting } from './Around'
import { ClientView } from './Client'
import { Ask } from './Ask'
import { DayLine, Today } from './Today'
import { useSidebar } from '@/components/layout/SidebarContext'

/** Avviso solo quando serve: senza Google non si inviano risposte e le mail non si aggiornano */
function GoogleLink() {
  const [s, setS] = useState<{ connected: boolean } | null>(null)
  useEffect(() => { fetch('/api/os?google').then(r => r.json()).then(setS).catch(() => setS(null)) }, [])
  if (!s || s.connected) return null
  return <a className="glink" href="/login"><b>Google è scollegato</b>mail e invio sono fermi · ricollega</a>
}

// Lo streaming di Next può lasciare montata una seconda copia nascosta (#S:0):
// solo un guscio alla volta ascolta la tastiera, altrimenti Ctrl+K scatterebbe due volte.
let owner = 0, seq = 0

/** Guscio "Anello": luoghi in alto sull'asse, tre colonne 3 · 6 · 3, Co-Pilot in basso al centro */
export function Shell() {
  const [asking, setAsking] = useState(false)
  const hydrate = useOs(s => s.hydrate)
  const step = useOs(current)
  const root = useOs(s => s.root)
  const { setCoPilotOpen } = useSidebar()
  const rootRef = useRef<HTMLDivElement>(null)
  const isToday = step.ref === 'list:oggi'
  const isClient = kindOf(step.ref) === 'client' && step.mode === 'view'
  const isMail = kindOf(step.ref) === 'mail'

  useEffect(() => { hydrate() }, [hydrate])

  useEffect(() => {
    if (owner || !rootRef.current?.offsetWidth) return   // solo la copia visibile
    const me = owner = ++seq
    // il punto del clic serve alla trasformazione "a cerchio"
    const onDown = (e: PointerEvent) => useOs.getState().setOrigin({ x: e.clientX, y: e.clientY })
    const onKey = (e: KeyboardEvent) => {
      const s = useOs.getState()
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); setAsking(v => !v); return }
      if (mod && e.key.toLowerCase() === 'j') { e.preventDefault(); setCoPilotOpen(true); return }
      if (mod && /^[1-6]$/.test(e.key)) { e.preventDefault(); s.root(SECTIONS[+e.key - 1][0]); return }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); s.back(); return }
      if (e.key === 'Escape' && !document.querySelector('.os .ask-veil')) {
        if (s.petals) s.setPetals(false)
        else if (s.accs.length) s.closeAcc(s.accs[0].key)
        else if (!(e.target as HTMLElement).closest('textarea')) s.back()
      }
    }
    addEventListener('pointerdown', onDown)
    addEventListener('keydown', onKey)
    return () => { removeEventListener('pointerdown', onDown); removeEventListener('keydown', onKey); if (owner === me) owner = 0 }
  }, [setCoPilotOpen])

  return (
    <div className="os" ref={rootRef}>
      <Sprite />
      <header className="topbar">
        <button className="mark" onClick={() => root('oggi')} aria-label="Torna a Oggi" title="Oggi" />
        <Places />
        <button className="kbtn" onClick={() => setAsking(true)}><span className="o"><I n="spark" /></span><span className="l">Cerca o chiedi</span><kbd>Ctrl K</kbd></button>
      </header>

      {isClient ? <ClientView key={step.ref} cref={step.ref} notice={<GoogleLink />} /> : <>
      <div className="subline">
        <GoogleLink />
        {isToday && <DayLine />}
      </div>

      {isToday ? <Today /> : (
        <div className="body">
          <aside className="side l"><Path />{isMail && <Waiting />}</aside>
          <div className="center"><Block /></div>
          <aside className="side r"><Needs /><Accessories /></aside>
        </div>
      )}

      <footer className="foot">
        <button className="copilot" onClick={() => setCoPilotOpen(true)}>
          <span className="o"><I n="spark" /></span>
          Chiedi qualcosa su {isToday ? 'questa giornata' : 'quello che stai guardando'}
          <kbd>Ctrl J</kbd>
        </button>
      </footer>
      </>}

      {asking && <Ask onClose={() => setAsking(false)} />}
      <Toast />
    </div>
  )
}
