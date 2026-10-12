'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Bot, Check, Loader2, Unplug } from 'lucide-react'

type Task = 'design' | 'general'

interface ProviderState {
  connected: boolean
  models: Record<Task, string>
  defaults: Record<Task, string>
  credits: { usage: number; limit: number | null } | null
}

// Modelli suggeriti: tutti supportano i tool. Si può scrivere qualsiasi altro ID OpenRouter.
const SUGGESTED: Record<Task, { id: string; label: string }[]> = {
  design: [
    { id: 'anthropic/claude-sonnet-5.5', label: 'Claude Sonnet 5.5 — consigliato' },
    { id: 'anthropic/claude-opus-5.5', label: 'Claude Opus 5.5 — massima qualità' },
    { id: 'openai/gpt-5.5', label: 'GPT-5.5' },
    { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro' },
  ],
  general: [
    { id: 'anthropic/claude-haiku-5.5', label: 'Claude Haiku 5.5 — consigliato' },
    { id: 'google/gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' },
    { id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 mini' },
  ],
}

const TASK_LABEL: Record<Task, string> = {
  design: 'Grafiche e canvas',
  general: 'Incarichi, idee, chat',
}

export function AiProviderCard() {
  const params = useSearchParams()
  const [state, setState] = useState<ProviderState | null>(null)
  const [draft, setDraft] = useState<Record<Task, string>>({ design: '', general: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = () =>
    fetch('/api/ai/provider')
      .then(res => res.json() as Promise<{ openrouter: ProviderState }>)
      .then(({ openrouter }) => {
        setState(openrouter)
        setDraft(openrouter.models)
      })
      .catch(() => {})

  useEffect(() => { load() }, [])

  const connect = async () => {
    const startUrl = `${window.location.origin}/api/auth/openrouter/start`
    const w = window as unknown as { electronAPI?: { openOAuthWindow: (url: string) => Promise<unknown> } }
    if (w.electronAPI?.openOAuthWindow) {
      // Electron: popup dedicato, il callback torna nella finestra principale
      await w.electronAPI.openOAuthWindow(startUrl)
    } else {
      window.location.href = startUrl
    }
  }

  const disconnect = async () => {
    await fetch('/api/ai/provider', { method: 'DELETE' })
    await load()
  }

  const saveModels = async () => {
    setSaving(true)
    await fetch('/api/ai/provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    await load()
  }

  const outcome = params.get('openrouter')

  return (
    <div className="bg-white rounded-xl border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-primary flex items-center gap-2">
          <Bot className="w-4 h-4" /> Modelli AI
        </h2>
        {state?.connected && (
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            OpenRouter collegato
          </span>
        )}
      </div>

      {outcome === 'error' && (
        <p className="text-sm text-red-600">Collegamento a OpenRouter non riuscito. Riprova.</p>
      )}

      {!state ? (
        <Loader2 className="w-4 h-4 animate-spin text-primary/40" />
      ) : !state.connected ? (
        <div className="space-y-3">
          <p className="text-sm text-primary/70">
            Collega il tuo account OpenRouter per usare i modelli più potenti (Claude, GPT, Gemini Pro)
            con i tuoi crediti. La chiave resta su questo computer e non viene mai mostrata.
          </p>
          <button
            onClick={connect}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
          >
            Collega OpenRouter
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {state.credits && (
            <p className="text-xs text-primary/60">
              Spesa con questa chiave: ${state.credits.usage.toFixed(2)}
              {state.credits.limit !== null && ` su un limite di $${state.credits.limit.toFixed(2)}`}
            </p>
          )}

          {(['design', 'general'] as Task[]).map(task => (
            <label key={task} className="block space-y-1">
              <span className="text-xs font-medium text-primary">{TASK_LABEL[task]}</span>
              <input
                list={`or-models-${task}`}
                value={draft[task]}
                onChange={e => setDraft(d => ({ ...d, [task]: e.target.value }))}
                placeholder={state.defaults[task]}
                className="w-full text-sm font-mono px-3 py-2 rounded-lg border border-border bg-transparent focus:outline-none focus:border-accent/60"
              />
              <datalist id={`or-models-${task}`}>
                {SUGGESTED[task].map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </datalist>
            </label>
          ))}

          <div className="flex items-center gap-4">
            <button
              onClick={saveModels}
              disabled={saving}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
            >
              {saved ? <Check className="w-4 h-4" /> : saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Salva modelli
            </button>
            <button
              onClick={disconnect}
              className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors flex items-center gap-1.5"
            >
              <Unplug className="w-4 h-4" /> Scollega
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
