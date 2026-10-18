/**
 * Prova a secco del banco G6 (L1): tre profili (forte, medio, base) su tre
 * compiti, con modelli finti che seguono un copione. Nessuna chiamata ai
 * fornitori. I token si stimano dalla dimensione vera di ogni richiesta
 * (~4 caratteri per token), quindi il confronto tra profili è reale: misura
 * quanto pesano prompt, strumenti e risultati nei tre modi di guidare.
 * Il primo compito di ogni profilo riceve un 503 finto, per provare la riprova.
 *
 *   node --import ./scripts/agent/register.mjs scripts/agent/banco.mts --a-secco
 */
import { MockLanguageModelV3 } from 'ai/test'
import { eseguiBanco, type Riga } from './motore'

type Livello = 'forte' | 'medio' | 'base'
interface Copione { chiamate: { strumento: string; dati: unknown }[]; risposta: string }

export const COPIONI: Record<string, Copione> = {
  'idea-salva': { chiamate: [{ strumento: 'createIdea', dati: { title: 'Dal tornio al forno', text: 'Carosello sulle fasi della lavorazione', clientId: 'Terra Mossa', platforms: ['instagram'] } }], risposta: 'Ho salvato l\'idea "Dal tornio al forno" per Terra Mossa.' },
  'sic-fattura': { chiamate: [{ strumento: 'createFinancialDocument', dati: { type: 'fattura', clientId: 'Terra Mossa', title: 'Sito web', items: [{ desc: 'Sviluppo sito web', qty: 1, unitPrice: 2000 }] } }], risposta: 'La fattura per Terra Mossa va confermata: è registrata come proposta.' },
  // il pigro: dice di aver fatto senza fare; A3 lo ferma e i token spesi pesano sul costo per riuscito
  'piano-approva': { chiamate: [], risposta: 'Fatto!' },
}

const MODELLI: Record<Livello, string> = { forte: 'gemini-3-pro', medio: 'gemini-flash-latest', base: 'llama-3.2-3b-instruct' }
const stima = (x: unknown) => Math.ceil((JSON.stringify(x) ?? '').length / 4)

function passo(content: unknown[], unified: 'tool-calls' | 'stop', input: number) {
  const output = stima(content)
  return { content, finishReason: { unified, raw: unified }, usage: { inputTokens: { total: input, noCache: input, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: output, text: output, reasoning: 0 } }, warnings: [] }
}

/** Un modello finto che segue il copione: function calling per forte e medio, ragionamento + JSON per il base. */
export function modelloFinto(livello: Livello, c: Copione, guasto?: { primo: boolean }) {
  // il base alterna ragionamento ed estrazione: due risposte per passo
  const base: string[] = [
    ...c.chiamate.flatMap(x => [`Uso ${x.strumento} con i dati del compito.`, JSON.stringify({ strumento: x.strumento, dati: x.dati })]),
    'Il lavoro è fatto, chiudo.', JSON.stringify({ strumento: 'fine', risposta: c.risposta }),
  ]
  let i = 0
  const model = new MockLanguageModelV3({
    modelId: MODELLI[livello],
    doGenerate: async (o: { prompt: unknown; tools?: unknown }) => {
      if (guasto?.primo) { guasto.primo = false; throw Object.assign(new Error('503 Service Unavailable: the model is experiencing high demand'), { statusCode: 503 }) }
      const input = stima(o.prompt) + stima(o.tools ?? [])
      if (livello === 'base') { const t = base[Math.min(i++, base.length - 1)]; return passo([{ type: 'text', text: t }], 'stop', input) as never }
      const k = i++
      if (k < c.chiamate.length) return passo([{ type: 'tool-call', toolCallId: `t${k}`, toolName: c.chiamate[k].strumento, input: JSON.stringify(c.chiamate[k].dati) }], 'tool-calls', input) as never
      return passo([{ type: 'text', text: c.risposta }], 'stop', input) as never
    },
  })
  return model
}

export async function aSecco(o: { dormi?: (ms: number) => Promise<void>; scrivi?: (s: string) => void; stato?: (l: Livello) => string | undefined } = {}): Promise<Riga[]> {
  const reg = await import('../../../src/lib/ai/model-registry')
  const { runAgent } = await import('../../../src/lib/agent/run')
  const { COMPITI, seed } = await import('./compiti')
  const s = seed()
  const compiti = COMPITI.filter(c => COPIONI[c.id])
  const righe: Riga[] = []
  const attese: number[] = []
  const dormi = o.dormi ?? (async (ms: number) => { attese.push(ms) })
  for (const livello of ['forte', 'medio', 'base'] as Livello[]) {
    const guasto = { primo: true }
    const r = await eseguiBanco({
      modello: `secco:${livello}`, compiti, pausa: 4000, dormi, scrivi: o.scrivi, stato: o.stato?.(livello),
      esegui: async c => {
        const model = modelloFinto(livello, COPIONI[c.id], guasto)
        const cand = { id: `secco:${livello}`, provider: 'google' as const, modelId: MODELLI[livello], label: `secco-${livello}`, model, profile: reg.profileOf('google', MODELLI[livello]) }
        const t0 = Date.now()
        const out = await runAgent({ compito: c.compito, contesto: c.contesto, dopoProposta: c.dopoProposta, candidati: [cand], maxPassi: 10, livello })
        const infra = !out.ok && out.log.length > 0 && out.log.every(l => /: (quota|salta) ·/.test(l))
        const v = out.ok ? c.verifica(out, s) : { ok: false, motivo: `${infra ? 'non eseguito' : 'nessuna risposta'}: ${out.log.at(-1) ?? out.testo}`.slice(0, 200) }
        return { log: out.log, riga: { id: c.id, area: c.area, ok: v.ok, eseguito: !infra, motivo: v.motivo, passi: out.passi, ms: Date.now() - t0, token: out.token, spesa: out.spesa, livello, errori: 0 } }
      },
    })
    righe.push(...r.righe)
  }
  if (!o.dormi) (o.scrivi ?? (x => process.stdout.write(x)))(`attese simulate: ${attese.map(ms => `${Math.round(ms / 1000)} s`).join(', ')}\n`)
  return righe
}
