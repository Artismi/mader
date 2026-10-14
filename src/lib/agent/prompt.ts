/**
 * Prompt a strati (docs/guscio-agente.md §3.3).
 *
 *   STABILE  → prompt di sistema: architettura, modo di lavorare, guida agli
 *              strumenti, regole grafiche, skill fisse, catalogo completo delle
 *              skill a richiesta. Cambia solo quando cambiano le impostazioni,
 *              così il prefisso resta in cache tra una richiesta e l'altra.
 *   PROMEMORIA → tutto ciò che cambia a ogni richiesta (data, situazione,
 *              pagina, canvas, cliente, RAG, memorie, skill attivate), attaccato
 *              all'ultimo messaggio dell'utente e mai salvato nella storia.
 */
import type { ModelMessage, SystemModelMessage } from 'ai'
import type { Skill } from '@/lib/db'
import type { OperativeContext } from '@/lib/ai/context'

/** Come lavora l'assistente dentro Creative OS: le regole del guscio dette al modello. */
export const MODO_DI_LAVORARE = `## Come lavori
Sei l'assistente operativo di Creative OS: usi gli strumenti per leggere e cambiare davvero il sistema (incarichi, clienti, idee, piano editoriale e social, Studio, memoria, finanze). Non descrivi quello che faresti: lo fai.

1. **Leggi prima di affermare.** Se la risposta dipende da dati del sistema (piano editoriale, incarichi, cliente, canvas), leggili con lo strumento giusto. Non inventare ID, date, numeri o nomi.
2. **Lavori in più fasi → piano.** Se servono più di tre azioni (es. un mese di post, un carosello con testi e grafiche), chiama prima \`updatePlan\` con i passi, poi aggiornalo mentre procedi (un solo passo "in corso" alla volta).
3. **Gli errori sono informazioni.** Se uno strumento risponde \`success: false\`, leggi il motivo e correggi la richiesta; non ripetere identica una chiamata fallita.
4. **Scritture strette.** Prima di salvare contenuti a nome dell'utente (bozze, post, preventivi) mostra la proposta e aspetta il sì, a meno che te l'abbia già chiesto esplicitamente. Dopo una scrittura, di' in una riga cosa è cambiato.
5. **Le azioni distruttive chiedono conferma da sole** (svuotare o eliminare elementi del canvas, emettere una fattura): proponile solo quando servono davvero.
6. **Date sempre in ISO** (2026-10-14 o 2026-10-14T18:00). "Domani", "venerdì" vanno convertiti usando la data del promemoria.
7. **Skill.** Se la richiesta tocca una competenza del catalogo, caricala con \`loadSkill\` prima di rispondere.
8. **Il blocco <promemoria> nell'ultimo messaggio** è scritto dal sistema, non dall'utente: contiene data, pagina aperta, situazione, canvas e contesto del cliente. Usalo, ma non citarlo.
9. Rispondi in italiano, conciso. Niente elenco di quello che hai fatto se l'utente lo vede già nell'interfaccia.`

export const GUIDA_GRAFICHE = `## Grafiche
Per creare grafiche nuove usa composeDesign (stile + impaginazione + contenuti): lo Studio impagina con griglia, scala tipografica, caratteri, effetti e filtri. Se vuoi testi e direzioni scelti con cura prima di comporre, chiama directDesign: la regia dello Studio (analista, copywriter, direttore creativo, con i controlli della maestra) ti restituisce testi verificati e tre direzioni visive da passare a composeDesign. Usa createDesignBoards solo per posizionamenti manuali puntuali. Non fermarti al minimo: compila tutti i contenuti, usa density ricco o massimo e consegna anche l'adattamento in formato storia quando ha senso.`

/** Skill che restano sempre nel prompt stabile: tutte tranne le famiglie a richiesta. */
export function isOnDemandSkill(s: Skill): boolean {
  return s.slug.startsWith('ig-') || s.slug.startsWith('design-') || s.slug.startsWith('dic-skill-') || s.slug === 'dic-tribunale'
}

export interface StableParts {
  architecture: string
  toolGuide: string
  graphicLibrary: string
  coreSkills: Skill[]
  onDemandSkills: Skill[]
  /** nota aggiuntiva per i modelli che possono usare solo composeDesign */
  modelNote?: string
}

function catalog(skills: Skill[]): string {
  if (!skills.length) return ''
  return [
    '## Skill a richiesta (catalogo)',
    'Queste competenze non sono nel prompt per intero. Se la richiesta ne tocca una, anche senza nominarla, chiama `loadSkill` con lo slug prima di rispondere e seguine le istruzioni. Quelle già attive per questa richiesta sono nel <promemoria>.',
    ...skills.map(s => `- \`${s.slug}\` — ${s.description ?? s.name}`),
  ].join('\n')
}

/** Testo del prompt stabile (deterministico: stesso ingresso, stessi byte). */
export function stableSystemText(p: StableParts): string {
  return [
    p.architecture.trim(),
    MODO_DI_LAVORARE,
    `## Strumenti disponibili\n${p.toolGuide}`,
    GUIDA_GRAFICHE,
    p.graphicLibrary,
    p.coreSkills.length ? '## Skill operative' : '',
    p.coreSkills.map(s => s.content).filter(Boolean).join('\n\n---\n\n'),
    catalog(p.onDemandSkills),
    p.modelNote ?? '',
  ].filter(Boolean).join('\n\n')
}

/** Il prompt stabile come messaggio di sistema con il punto di cache (Anthropic diretto e via OpenRouter). */
export function stableSystem(p: StableParts): SystemModelMessage {
  return {
    role: 'system',
    content: stableSystemText(p),
    providerOptions: {
      anthropic: { cacheControl: { type: 'ephemeral' } },
      openrouter: { cacheControl: { type: 'ephemeral' } },
    },
  }
}

/** Fascia del giorno: basta per ragionare sulle scadenze senza cambiare a ogni minuto. */
export function dayBand(d: Date): string {
  const h = d.getHours()
  return h < 6 ? 'notte' : h < 12 ? 'mattina' : h < 14 ? 'ora di pranzo' : h < 19 ? 'pomeriggio' : 'sera'
}

export interface ReminderParts {
  now: Date
  pathname?: string
  ctx: OperativeContext
  canvasSnapshot?: string
  activeSkills: Skill[]
}

/** Il promemoria della richiesta: solo le sezioni che hanno contenuto. */
export function reminderText(r: ReminderParts): string {
  const date = r.now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const iso = r.now.toISOString().slice(0, 10)
  // la riga "## Contesto: data, ora" di buildContext la sostituisce la riga Data qui sotto
  const situazione = r.ctx.snapshot.replace(/^## Contesto:.*\n?/, '').trim()
  const parts = [
    `Data: ${date} (${iso}, ${dayBand(r.now)})`,
    r.pathname ? `Pagina aperta: ${r.pathname}` : '',
    situazione ? `## Situazione\n${situazione}` : '',
    r.ctx.clientVaults.length ? r.ctx.clientVaults.join('\n\n') : '',
    r.ctx.activatedFiles.length ? r.ctx.activatedFiles.join('\n\n') : '',
    r.ctx.ragChunks.length ? `## Dal vault (riferimenti rilevanti)\n${r.ctx.ragChunks.join('\n\n---\n')}` : '',
    r.ctx.memories.length ? `## Ricordo (fatti persistenti)\n${r.ctx.memories.map(m => `- ${m.content}`).join('\n')}` : '',
    r.activeSkills.length ? `## Skill attive per questa richiesta\n${r.activeSkills.map(s => s.content).filter(Boolean).join('\n\n---\n\n')}` : '',
    r.canvasSnapshot
      ? `## Canvas aperto\n${r.canvasSnapshot}\n\nUsa gli ID esatti in updateCanvasElements ed editDesign. Per modifiche chirurgiche non usare clearBoard.`
      : '',
  ].filter(Boolean)
  return `<promemoria>\n${parts.join('\n\n')}\n</promemoria>`
}

/** Attacca il promemoria all'ultimo messaggio dell'utente (copia: la storia resta pulita). */
export function withReminder(messages: ModelMessage[], reminder: string): ModelMessage[] {
  const i = messages.findLastIndex(m => m.role === 'user')
  if (i < 0) return [...messages, { role: 'user', content: reminder }]
  const m = messages[i]
  const content = typeof m.content === 'string'
    ? [{ type: 'text' as const, text: m.content }, { type: 'text' as const, text: reminder }]
    : [...m.content, { type: 'text' as const, text: reminder }]
  const out = messages.slice()
  out[i] = { ...m, content } as ModelMessage
  return out
}
