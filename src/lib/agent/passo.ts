/**
 * L1: un passo alla volta, per il profilo base (modelli semplici). Decide il
 * codice; il modello fa solo il pezzo che il codice non sa fare:
 *
 *   1. il codice sceglie la fase e 3–5 strumenti adatti (toolsForPhase);
 *   2. il modello ragiona liberamente in testo: quale strumento, con quali dati,
 *      oppure la risposta finale (niente function calling da reggere);
 *   3. una seconda chiamata minima estrae la decisione in JSON, riparato da A1
 *      (repairJson); se il ragionamento contiene già una chiamata leggibile la
 *      seconda chiamata si salta;
 *   4. il codice valida i dati con lo schema, esegue (con maestra, guardia e
 *      registro delle prove) e mette nel contesto un riassunto di poche righe;
 *   5. la chiusura passa da A3: se il registro non la conferma si riprende,
 *      dopo 3 riprese il compito sale al candidato successivo.
 *
 * Il contesto resta sotto ~3k token: dei passi vecchi resta solo l'esito.
 */
import { generateText, type LanguageModel, type Tool } from 'ai'
import type { z } from 'zod'
import type { AgentToolDef, Risk } from './tools'
import { phaseOf, toolsForPhase, type Fase } from './steer'
import { createRepairBudget, matchToolName, parseTextToolCalls, repairJson } from './repair'
import { checkClosure, type Prova } from './evidence'
import { riassunto } from './summary'

type Def = AgentToolDef<z.ZodTypeAny>

export interface PassoInput {
  model: LanguageModel
  label: string
  compito: string
  /** materiale e registro del modello precedente, già formattati */
  extra?: string
  defs: Def[]
  tools: Record<string, Tool>
  prove: Prova[]
  risks: Record<string, Risk | undefined>
  azione: boolean
  maxPassi: number
  /** strumenti per passo (3–5) */
  strumenti: number
  /** tetto di contesto in token stimati */
  contesto: number
  now: Date
  log: (s: string) => void
  /** fermo dall'esterno (rilevatore di ripetizioni) */
  fermo: () => boolean
  abortSignal?: AbortSignal
}

export interface PassoResult {
  esito: 'ok' | 'riprese' | 'illeggibile' | 'passi' | 'stallo'
  testo: string
  passi: number
  chiamateModello: number
  token: { input: number; cached: number; output: number }
}

const SYSTEM = 'Sei l\'assistente di Creative OS. Lavori un passo alla volta: a ogni turno scegli una sola azione tra gli strumenti elencati, oppure chiudi con la risposta per l\'utente. Usa solo dati presenti nel compito o nei risultati: niente ID inventati. Rispondi in italiano, breve.'
const ESTRAI = 'Estrai la decisione dal ragionamento. Rispondi solo con un oggetto JSON, senza altro testo.'

/** Campi dello schema in una riga: `title, text, platforms?` con la descrizione corta. */
export function campiOf(schema: unknown): string {
  const shape = (schema as { shape?: Record<string, { isOptional?: () => boolean; description?: string }> })?.shape
  if (!shape) return 'oggetto'
  return Object.entries(shape).map(([k, v]) => `${k}${v.isOptional?.() ? '?' : ''}${v.description ? ` (${v.description.slice(0, 50)})` : ''}`).join(', ') || 'nessuno'
}

const primaFrase = (s: string) => (s.split(/(?<=[.!?])\s/)[0] ?? s).slice(0, 160)

/** Le prove come passi dell'AI SDK, per riusare phaseOf. */
const comePassi = (prove: Prova[]) => prove.map(p => ({ toolCalls: [], toolResults: [{ toolName: p.strumento, output: { success: p.esito === 'ok' } }] })) as never

/** Storia dei passi entro il tetto: gli ultimi interi, i vecchi ridotti all'esito. */
export function storia(fatti: { breve: string; pieno: string }[], maxChars: number): string {
  const out: string[] = []
  let usati = 0
  for (let i = fatti.length - 1; i >= 0; i--) {
    const s = usati + fatti[i].pieno.length <= maxChars ? fatti[i].pieno : fatti[i].breve
    usati += s.length
    out.unshift(s)
  }
  return out.join('\n')
}

export async function runPassoPasso(o: PassoInput): Promise<PassoResult> {
  const token = { input: 0, cached: 0, output: 0 }
  const somma = (u: { inputTokens?: number; cachedInputTokens?: number; outputTokens?: number }) => {
    token.input += u.inputTokens ?? 0; token.cached += u.cachedInputTokens ?? 0; token.output += u.outputTokens ?? 0
  }
  const nomi = o.defs.map(d => d.name)
  const budget = createRepairBudget(2)
  const fatti: { breve: string; pieno: string }[] = []
  let nota = ''
  let riprese = 0
  let chiamateModello = 0
  let ultimo = ''
  // ~4 caratteri per token; metà del tetto alla storia, il resto a compito, menu e istruzioni
  const maxStoria = Math.max(600, o.contesto * 2)

  for (let passi = 0; passi < o.maxPassi; passi++) {
    if (o.fermo()) return { esito: 'stallo', testo: ultimo, passi, chiamateModello, token }
    const fase: Fase = phaseOf(comePassi(o.prove), o.risks)
    const scelti = toolsForPhase(o.defs, fase, { max: o.strumenti, compito: o.compito })
    const menu = scelti.map(n => { const d = o.defs.find(x => x.name === n)!; return `- ${n}: ${primaFrase(d.description)} Dati: ${campiOf(d.inputSchema)}` }).join('\n')
    const prompt = [
      `Compito: ${o.compito}`,
      o.extra ?? '',
      fatti.length ? `Fatto finora:\n${storia(fatti, maxStoria)}` : 'Non hai ancora fatto niente.',
      nota ? `Attenzione: ${nota}` : '',
      `Fase: ${fase}. Strumenti per questo passo:\n${menu}`,
      'Ragiona in poche righe: qual è il prossimo passo? Scegli UNO strumento e scrivi i dati che gli servono. Se il compito è finito (o non c\'è altro da fare) scrivi invece la risposta finale per l\'utente, con gli ID di quello che hai fatto.',
    ].filter(Boolean).join('\n\n')
    nota = ''

    const r1 = await generateText({ model: o.model, system: SYSTEM, prompt, maxRetries: 0, abortSignal: o.abortSignal })
    chiamateModello++
    somma(r1.usage)
    const ragionamento = r1.text.trim()

    // A1: se il ragionamento contiene già una chiamata leggibile, la seconda chiamata non serve
    const scritta = parseTextToolCalls(ragionamento, nomi).chiamate[0]
    let dec: { strumento?: unknown; dati?: unknown; risposta?: unknown } | undefined
    if (scritta) dec = { strumento: scritta.toolName, dati: scritta.input }
    else {
      const r2 = await generateText({
        model: o.model, system: ESTRAI, maxRetries: 0, abortSignal: o.abortSignal,
        prompt: `Formato: {"strumento": uno tra ${scelti.map(n => `"${n}"`).join(', ')} oppure "fine", "dati": {…} se usi uno strumento, "risposta": "…" se è "fine"}\n\n<ragionamento>\n${ragionamento.slice(0, 2500)}\n</ragionamento>`,
      })
      chiamateModello++
      somma(r2.usage)
      const j = repairJson(r2.text)
      if (j && typeof j === 'object' && !Array.isArray(j)) dec = j as typeof dec
    }

    if (!dec) {
      budget.ko()
      if (budget.esaurito) { o.log(`${o.label}: decisione illeggibile due volte, passo al modello successivo`); return { esito: 'illeggibile', testo: ultimo, passi: passi + 1, chiamateModello, token } }
      nota = 'la decisione non si leggeva: scegli uno strumento dall\'elenco con i suoi dati, oppure scrivi la risposta finale.'
      continue
    }
    budget.ok()

    const nome = typeof dec.strumento === 'string' ? matchToolName(dec.strumento, nomi) : undefined
    if (!nome) {
      if (typeof dec.strumento === 'string' && dec.strumento.toLowerCase() !== 'fine' && !dec.risposta) {
        nota = `lo strumento "${dec.strumento}" non esiste: scegli tra ${scelti.join(', ')}.`
        continue
      }
      // A3: si chiude solo con le prove
      const testo = String(dec.risposta ?? ragionamento).trim()
      ultimo = testo
      const motivi = checkClosure({ prove: o.prove, testo, azione: o.azione })
      if (!motivi.length) return { esito: 'ok', testo, passi: passi + 1, chiamateModello, token }
      if (++riprese > 3) { o.log(`${o.label}: tre riprese senza prove, il compito sale al modello successivo`); return { esito: 'riprese', testo, passi: passi + 1, chiamateModello, token } }
      o.log(`${o.label}: chiusura senza prove (${riprese}/3): ${motivi[0]}`)
      nota = `non chiudere ancora, il registro non conferma il lavoro: ${motivi.join('; ')}`
      continue
    }

    const def = o.defs.find(d => d.name === nome)!
    const dati = dec.dati && typeof dec.dati === 'object' ? dec.dati : {}
    const ok = def.inputSchema.safeParse(dati)
    if (!ok.success) {
      const problemi = ok.error.issues.slice(0, 3).map(i => `${i.path.join('.') || 'dati'}: ${i.message}`).join('; ')
      nota = `i dati per ${nome} non vanno: ${problemi}. Campi: ${campiOf(def.inputSchema)}.`
      fatti.push({ breve: `${passi + 1}. ${nome} → dati sbagliati`, pieno: `${passi + 1}. ${nome} → dati sbagliati (${problemi})` })
      continue
    }
    const out = await o.tools[nome].execute!(ok.data, { toolCallId: `passo-${passi}`, messages: [] })
    const esito = out && typeof out === 'object' && (out as { success?: unknown }).success === false ? 'errore' : 'ok'
    const datiBrevi = JSON.stringify(ok.data).slice(0, 160)
    fatti.push({ breve: `${passi + 1}. ${nome} → ${esito}`, pieno: `${passi + 1}. ${nome} ${datiBrevi} →\n${riassunto(nome, out, 900)}` })
  }
  o.log(`${o.label}: passi finiti (${o.maxPassi}) senza chiudere`)
  return { esito: 'passi', testo: ultimo, passi: o.maxPassi, chiamateModello, token }
}
