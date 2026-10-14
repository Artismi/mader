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
}

export function createPrepareStep(o: SteerOptions): PrepareStepFunction<ToolSet> {
  return ({ stepNumber, steps, messages }) => {
    const fase = phaseOf(steps, o.risks)
    o.onFase?.(fase, stepNumber)
    const out: { toolChoice?: 'required'; messages?: ModelMessage[]; model?: LanguageModel } = {}
    if (stepNumber === 0 && o.azione) out.toolChoice = 'required'
    // al primo passo il promemoria grande c'è già; dopo si aggiunge solo la fase, in coda (la cache resta)
    if (stepNumber > 0) out.messages = [...messages, { role: 'user', content: phaseNote(fase, o.risks, o.active) }]
    const m = o.modelloPerPasso?.(stepNumber, fase)
    if (m) out.model = m
    return out
  }
}

export function risksOf(defs: { name: string; risk: Risk }[]): Record<string, Risk> {
  return Object.fromEntries(defs.map(d => [d.name, d.risk]))
}
