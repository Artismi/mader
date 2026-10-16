/**
 * A2 (docs/cosa-manca.md): regia per passo con `prepareStep`. A ogni passo
 * decide il codice, non il modello:
 *
 *   - richiesta d'azione ("programma", "crea", "sposta") → al primo passo
 *     `toolChoice: 'required'`: il modello non può rispondere solo a parole;
 *   - la fase del compito (leggere → scrivere → verificare → chiudere) si
 *     ricava dai passi già fatti e si dice in un promemoria breve in coda ai
 *     messaggi. L'elenco degli strumenti non cambia mai: toglierne rompe la
 *     cache del prefisso (la lezione di Manus);
 *   - il modello può cambiare per passo (il forte pianifica, il debole esegue).
 */
import type { LanguageModel, ModelMessage, PrepareStepFunction, StepResult, ToolSet } from 'ai'
import type { Risk } from './tools'
import { clearOldToolOutputs, estimateTokens } from './compact'

export type Fase = 'leggere' | 'scrivere' | 'verificare' | 'chiudere'

// verbi che cambiano qualcosa nel sistema; "scrivi", "fai", "genera" no: spesso chiedono solo un testo
const AZIONE = /\b(programma(re|mi)?|pianifica(re|mi)?|crea(re|mi)?|aggiung[ie](re)?|salva(re|mi)?|sposta(re|mi)?|aggiorna(re)?|modifica(re)?|cambia(re)?|elimina(re)?|cancella(re)?|segna(re|mi)?|registra(re)?|ricorda(mi|ti)|annota(re)?|imposta(re)?|inserisci|metti|fattura(re)?|archivia(re)?|completa(re)?|assegna(re)?|rinomina(re)?|duplica(re)?|approva(re)?|rimanda(re)?)\b/i
const DOMANDA = /^\s*(come|cosa|che cosa|perch[eé]|quando|quale|quali|quanto|quanti|chi|dove|mi spieghi|spiegami|secondo te)\b/i

/** La richiesta chiede di cambiare qualcosa nel sistema (non solo di rispondere)? */
export function isActionRequest(text: string): boolean {
  return AZIONE.test(text) && !DOMANDA.test(text)
}

/** Fase del compito dai passi già fatti: le scritture riuscite e le letture dopo di esse. */
export function phaseOf(steps: Pick<StepResult<ToolSet>, 'toolCalls' | 'toolResults'>[], risks: Record<string, Risk | undefined>): Fase {
  let scritto = false, verificato = false, letto = false
  for (const s of steps) {
    for (const r of s.toolResults) {
      const out = (r as { output?: unknown }).output
      const ok = !(out && typeof out === 'object' && (out as { success?: unknown }).success === false)
      const risk = risks[r.toolName] ?? 'read'
      if (risk === 'read') { letto = true; if (scritto && ok) verificato = true }
      else if (ok) { scritto = true; verificato = false }
    }
  }
  if (verificato) return 'chiudere'
  if (scritto) return 'verificare'
  return letto ? 'scrivere' : 'leggere'
}

const COSA: Record<Fase, string> = {
  leggere: 'leggi quello che serve (cerca con filtri, non elencare tutto)',
  scrivere: 'hai le informazioni: esegui le scritture richieste, una per oggetto',
  verificare: 'rileggi quello che hai scritto e controlla che sia tutto come richiesto',
  chiudere: 'il lavoro è verificato: rispondi in poche righe con cosa hai fatto e gli ID',
}

/** Il promemoria di fase: poche parole in coda, mai nel prefisso. */
export function phaseNote(fase: Fase, risks: Record<string, Risk | undefined>, active?: string[]): string {
  const nomi = (active ?? Object.keys(risks)).filter(n => {
    const r = risks[n] ?? 'read'
    return fase === 'scrivere' ? r !== 'read' : fase === 'chiudere' ? false : r === 'read'
  }).slice(0, 8)
  return `<promemoria>fase: ${fase}; ${COSA[fase]}${nomi.length ? `; strumenti utili: ${nomi.join(', ')}` : ''}</promemoria>`
}

export interface SteerOptions {
  /** la richiesta è un'azione: al primo passo il modello deve usare uno strumento */
  azione: boolean
  /** rischio di ogni strumento (dalle definizioni) */
  risks: Record<string, Risk | undefined>
  /** strumenti attivi, se ridotti (solo per scegliere i nomi del promemoria) */
  active?: string[]
  /** modello diverso per passo; `undefined` = quello della richiesta */
  modelloPerPasso?: (stepNumber: number, fase: Fase) => LanguageModel | undefined
  /** si chiama a ogni passo con la fase (traccia, prove) */
  onFase?: (fase: Fase, stepNumber: number) => void
  /** L1, profilo medio: gli strumenti attivi seguono la fase (pochi schemi costano meno della cache persa) */
  perFase?: (fase: Fase) => string[] | undefined
  /** L1: tetto di contesto in token stimati; oltre, i risultati vecchi si svuotano */
  contesto?: number
}

const piano = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const parole = (t: string) => [...new Set(piano(t).match(/[a-z]{4,}/g) ?? [])].map(w => w.slice(0, 5))

/**
 * L1: gli strumenti più utili per la fase, al massimo `max`. Conta la pertinenza
 * con il compito (radici delle parole in nome e descrizione) più un bonus di fase:
 * in lettura e verifica le letture, in scrittura le scritture.
 */
export function toolsForPhase(defs: { name: string; risk: Risk; description: string }[], fase: Fase, o: { max: number; compito: string; always?: string[] }): string[] {
  const chiave = parole(o.compito)
  const bonus = (r: Risk) => fase === 'scrivere' ? (r === 'read' ? 0 : 3) : fase === 'leggere' ? (r === 'read' ? 2 : 1) : (r === 'read' ? 3 : 0)
  const voti = defs.map((d, i) => {
    const testo = piano(`${d.name.replace(/([A-Z])/g, ' $1')} ${d.description}`)
    return { n: d.name, v: chiave.filter(w => testo.includes(w)).length * 2 + bonus(d.risk), i }
  }).filter(x => !o.always?.includes(x.n))
  const scelti = voti.sort((a, b) => b.v - a.v || a.i - b.i).slice(0, Math.max(0, o.max - (o.always?.length ?? 0))).map(x => x.n)
  return [...(o.always ?? []).filter(n => defs.some(d => d.name === n)), ...scelti]
}

export function createPrepareStep(o: SteerOptions): PrepareStepFunction<ToolSet> {
  return ({ stepNumber, steps, messages }) => {
    const fase = phaseOf(steps, o.risks)
    o.onFase?.(fase, stepNumber)
    const out: { toolChoice?: 'required'; messages?: ModelMessage[]; model?: LanguageModel; activeTools?: string[] } = {}
    if (stepNumber === 0 && o.azione) out.toolChoice = 'required'
    const attivi = o.perFase?.(fase)
    if (attivi) out.activeTools = attivi
    const base = o.contesto && estimateTokens(messages) > o.contesto ? clearOldToolOutputs(messages, 2) : messages
    // al primo passo il promemoria grande c'è già; dopo si aggiunge solo la fase, in coda (la cache resta)
    if (stepNumber > 0) out.messages = [...base, { role: 'user', content: phaseNote(fase, o.risks, attivi ?? o.active) }]
    else if (base !== messages) out.messages = base
    const m = o.modelloPerPasso?.(stepNumber, fase)
    if (m) out.model = m
    return out
  }
}

export function risksOf(defs: { name: string; risk: Risk }[]): Record<string, Risk> {
  return Object.fromEntries(defs.map(d => [d.name, d.risk]))
}
