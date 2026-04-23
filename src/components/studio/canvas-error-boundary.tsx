'use client'

import React from 'react'

interface State {
  error: Error | null
  savedAt: string | null
}

interface Props {
  children: React.ReactNode
}

export class CanvasErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, savedAt: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[CanvasErrorBoundary]', error, info)
    // Emergency dump del canvas in localStorage
    try {
      const canvas = (window as any).__fabricCanvas
      if (canvas) {
        const json = JSON.stringify(canvas.toJSON())
        localStorage.setItem('canvas_autosave_emergency', json)
        localStorage.setItem('canvas_autosave_emergency_ts', new Date().toISOString())
        this.setState({ savedAt: new Date().toLocaleTimeString() })
      }
    } catch {
      // se il canvas stesso è corrotto non blocchiamo il recovery UI
    }
  }

  handleDownload() {
    const raw = localStorage.getItem('canvas_autosave_emergency')
    if (!raw) return
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `canvas-recovery-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  handleRetry() {
    this.setState({ error: null, savedAt: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="w-full h-full bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-[400px] bg-[#141414] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-lg font-bold">!</div>
            <h2 className="text-sm font-semibold text-white">Il canvas ha incontrato un errore</h2>
          </div>

          <p className="text-xs text-[#888] leading-relaxed">
            {this.state.error.message || 'Errore sconosciuto'}
          </p>

          {this.state.savedAt && (
            <p className="text-[10px] text-green-400">
              Backup automatico salvato alle {this.state.savedAt}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => this.handleRetry()}
              className="flex-1 py-2 rounded-lg text-xs font-medium bg-white text-black hover:bg-[#e0e0e0] transition-colors"
            >
              Riprova
            </button>
            {this.state.savedAt && (
              <button
                onClick={() => this.handleDownload()}
                className="flex-1 py-2 rounded-lg text-xs border border-[#2a2a2a] text-[#aaa] hover:text-white hover:border-[#444] transition-colors"
              >
                Scarica backup
              </button>
            )}
          </div>

          <p className="text-[10px] text-[#555] leading-relaxed">
            Se il problema persiste, il backup può essere reimportato da File → Apri.
          </p>
        </div>
      </div>
    )
  }
}
