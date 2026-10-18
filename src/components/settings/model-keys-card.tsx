'use client'

import { useEffect, useState } from 'react'
import { Check, KeyRound, Loader2 } from 'lucide-react'

// Schermata Modelli: le chiavi dei fornitori inserite dall'utente.
// Il server le conserva cifrate (src/lib/ai/chiavi.ts) e non le rimanda mai indietro.

interface StatoChiave {
  id: string
  nome: string
  uso: string
  dove: string
  origine: 'cassaforte' | 'ambiente' | null
}

interface Stato {
  attiva: boolean
  chiavi: StatoChiave[]
}

const ORIGINE: Record<NonNullable<StatoChiave['origine']>, { testo: string; classe: string }> = {
  cassaforte: { testo: 'Salvata, cifrata', classe: 'is-ok' },
  ambiente: { testo: 'Da .env.local', classe: 'is-plain' },
}

export function ModelKeysCard() {
  const [stato, setStato] = useState<Stato | null>(null)
  const [bozze, setBozze] = useState<Record<string, string>>({})
  const [occupato, setOccupato] = useState<string | null>(null)
  const [fatto, setFatto] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/ai/chiavi')
      .then(res => res.json() as Promise<Stato>)
      .then(setStato)
      .catch(() => setErrore('Impossibile leggere lo stato delle chiavi.'))
  }, [])

  const salva = async (id: string, valore: string) => {
    setOccupato(id)
    setErrore(null)
    try {
      const res = await fetch('/api/ai/chiavi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, valore }),
      })
      const json = await res.json() as Stato & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Salvataggio non riuscito')
      setStato(json)
      setBozze(b => ({ ...b, [id]: '' }))
      setFatto(id)
      setTimeout(() => setFatto(f => (f === id ? null : f)), 1500)
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Salvataggio non riuscito')
    } finally {
      setOccupato(null)
    }
  }

  return (
    <section className="cos-card space-y-5 p-6 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <h2 className="cos-kicker flex items-center gap-2">
          <KeyRound className="h-3.5 w-3.5" aria-hidden /> Chiavi dei modelli
        </h2>
      </div>

      <p className="text-sm text-ink-2">
        {stato && !stato.attiva
          ? 'In sviluppo le chiavi si leggono da .env.local. Nell\'app installata si inseriscono qui e restano cifrate su questo computer.'
          : 'Le chiavi restano su questo computer, cifrate con il portachiavi del sistema, e non vengono mai mostrate. Basta Gemini per partire gratis.'}
      </p>

      {errore && <p className="cos-error" role="alert">{errore}</p>}

      {!stato ? (
        <span className="cos-reg !h-5 !w-5" aria-label="Caricamento" />
      ) : (
        <ul className="divide-y divide-[var(--cos-line)]">
          {stato.chiavi.map(c => {
            const badge = c.origine ? ORIGINE[c.origine] : null
            const bozza = bozze[c.id] ?? ''
            return (
              <li key={c.id} className="space-y-2.5 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <span className="text-[15px] font-semibold text-ink">{c.nome}</span>
                    <span className="ml-2 text-[13px] text-ink-3">{c.uso}</span>
                  </div>
                  {badge
                    ? <span className={`cos-badge ${badge.classe}`}>{badge.testo}</span>
                    : <span className="cos-badge is-plain">Assente</span>}
                </div>
                {stato.attiva && (
                  <form
                    className="flex flex-col gap-2 sm:flex-row"
                    onSubmit={e => { e.preventDefault(); if (bozza.trim()) salva(c.id, bozza) }}
                  >
                    <input
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      value={bozza}
                      onChange={e => setBozze(b => ({ ...b, [c.id]: e.target.value }))}
                      placeholder={c.origine === 'cassaforte' ? 'Incolla una chiave nuova per sostituirla' : 'Incolla la chiave'}
                      aria-label={`Chiave ${c.nome}`}
                      className="cos-field min-w-0 w-full font-mono sm:flex-1"
                    />
                    <div className="flex items-center gap-2">
                      <button type="submit" disabled={!bozza.trim() || occupato === c.id} className="cos-btn cos-btn-primary cos-btn-sm">
                        {occupato === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : fatto === c.id ? <Check className="h-4 w-4" /> : null}
                        Salva
                      </button>
                      {c.origine === 'cassaforte' && (
                        <button type="button" onClick={() => salva(c.id, '')} disabled={occupato === c.id} className="cos-btn cos-btn-ghost cos-btn-sm !text-[var(--cos-err)]">
                          Togli
                        </button>
                      )}
                    </div>
                  </form>
                )}
                <a href={c.dove} target="_blank" rel="noreferrer" className="inline-block text-xs text-ink-3 underline underline-offset-2 hover:text-ink">
                  Dove si prende la chiave
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
