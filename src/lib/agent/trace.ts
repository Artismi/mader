/**
 * Traccia di una richiesta all'assistente: modello, passi, strumenti usati,
 * token e quota letta dalla cache. Una riga nel log del server per richiesta,
 * così si vede subito se il prefisso stabile sta funzionando e quali strumenti
 * falliscono.
 */
export interface Trace {
  tool(name: string, ms: number, ok: boolean): void
  finish(info: { steps: number; inputTokens?: number; cachedInputTokens?: number; outputTokens?: number; compacted?: string; prove?: string }): void
}

export function createTrace(label: string): Trace {
  const t0 = Date.now()
  const calls: { name: string; ms: number; ok: boolean }[] = []
  return {
    tool(name, ms, ok) { calls.push({ name, ms, ok }) },
    finish({ steps, inputTokens = 0, cachedInputTokens = 0, outputTokens = 0, compacted, prove }) {
      const cache = inputTokens ? Math.round((cachedInputTokens / inputTokens) * 100) : 0
      const tools = calls.map(c => `${c.name}${c.ok ? '' : '✗'}(${c.ms}ms)`).join(' ') || '—'
      console.log(`[agente] ${label} · ${steps} passi · in ${inputTokens} (cache ${cache}%) · out ${outputTokens} · ${((Date.now() - t0) / 1000).toFixed(1)}s${compacted ? ` · ${compacted}` : ''} · strumenti: ${tools}${prove ? ` · prove: ${prove}` : ''}`)
    },
  }
}
