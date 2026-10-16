/**
 * Prima il concetto (C1): dal brief 3–5 idee visive (una metafora, un gioco di
 * parole visivo, un gesto tipografico), ciascuna tradotta in istruzioni per il
 * motore: il gesto dominante, la parola che lo porta, i poli dei regolatori, la
 * ricetta che lo esegue, cosa si toglie e quali ornamenti l'idea motiva.
 *
 * Tre strade, dalla più ricca alla più economica:
 * - `concetti(c, { chiedi })`: una chiamata testuale breve (prompt ~350 token, risposta JSON);
 * - `simulato(c)`: la stessa chiamata a secco per la vetrina (risponde con le regole, in JSON);
 * - `ideeDaRegole(c)`: il ripiego senza modello (metafore da un piccolo dizionario, numeri, parole).
 */
import type { DesignContent } from '../types'

export type Gesto = 'parola-immagine' | 'scala' | 'taglio' | 'ripetizione' | 'vuoto' | 'spezzato'
export const GESTI: Gesto[] = ['parola-immagine', 'scala', 'taglio', 'ripetizione', 'vuoto', 'spezzato']
/** gli ornamenti che un'idea può motivare (vedi ORNAMENTI in carattere.ts) */
export const MOTIVI = ['ripetizione', 'documento', 'decoro', 'ritmo', 'stampa', 'mano', 'materia', 'numero'] as const

export interface Idea {
  /** l'idea in tre-sei parole ("la notte come un taglio di luce") */
  nome: string
  gesto: Gesto
  /** la parola (o il numero) che porta il gesto; vuota = la parola chiave del titolo */
  parola?: string
  /** poli dei regolatori: 0 o 1, mai il centro */
  scala: 0 | 1; energia: 0 | 1; densita: 0 | 1
  /** cosa si toglie per lasciare il gesto da solo */
  togli: ('testo' | 'dettagli' | 'foto' | 'ornamenti')[]
  /** gli ornamenti che l'idea giustifica (gli altri non entrano) */
  motivi: string[]
  /** l'archetipo che la esegue nel pilota */
  ricetta: 'eco' | 'costruttivo' | 'scontrino'
}

const VUOTE = new Set('il lo la i gli le un una uno di da in con su per tra fra e o a al allo alla ai agli alle del dello della dei degli delle nel nella sul sulla come più'.split(' '))
const parole = (t?: string) => (t ?? '').split(/[\s'’]+/).map(w => w.replace(/[.,;:!?«»"()]/g, '')).filter(w => w && !VUOTE.has(w.toLowerCase()))
/** la parola chiave: la più lunga del titolo (le parole vuote non contano) */
export const parolaChiave = (c: DesignContent) => [...parole(c.title)].sort((a, b) => b.length - a.length)[0] ?? c.title

/** Metafore dal brief: radici di parole → un gesto e il suo perché. */
const METAFORE: [RegExp, Gesto, string, Partial<Idea>][] = [
  [/nott|buio|luce|lum|ombr|stell/i, 'vuoto', 'una sola luce nel buio', { scala: 0, densita: 0 }],
  [/mare|onda|eco|suon|music|disc|ritm|techno|ballo/i, 'ripetizione', 'l’onda che si ripete', { motivi: ['ripetizione'], energia: 1 }],
  [/forz|allen|squadr|sport|corsa|vinc|gara/i, 'scala', 'la parola che non sta nella tavola', { scala: 1, energia: 1 }],
  [/menu|pranzo|cena|prezz|conto|spesa|ordin/i, 'vuoto', 'il conto sul tavolo vuoto', { motivi: ['documento', 'mano'], ricetta: 'scontrino' }],
  [/taglio|tost|macin|fett|pezz|frammen|rott/i, 'taglio', 'il dettaglio tagliato da vicino', { scala: 1 }],
  [/incontr|insieme|unit|legam|intrecc|mano/i, 'spezzato', 'le lettere che si incastrano', { energia: 1 }],
]
const RICETTA: Record<Gesto, Idea['ricetta']> = { 'parola-immagine': 'eco', ripetizione: 'eco', scala: 'costruttivo', taglio: 'costruttivo', spezzato: 'eco', vuoto: 'scontrino' }

const idea = (nome: string, gesto: Gesto, o: Partial<Idea> = {}): Idea => ({
  nome, gesto, scala: gesto === 'vuoto' ? 0 : 1, energia: gesto === 'vuoto' ? 0 : 1, densita: 0, togli: ['ornamenti'], motivi: [], ricetta: RICETTA[gesto], ...o,
})

/** Ripiego senza modello: da 3 a 5 idee, diverse per gesto. */
export function ideeDaRegole(c: DesignContent): Idea[] {
  const testo = [c.title, c.kicker, c.body, c.imageQuery, ...(c.details ?? [])].filter(Boolean).join(' ')
  const kw = parolaChiave(c)
  const out: Idea[] = []
  for (const [re, gesto, nome, o] of METAFORE) if (re.test(testo)) out.push(idea(nome, gesto, o))
  if (c.numero) out.push(idea(`il ${c.numero} come immagine`, 'parola-immagine', { parola: c.numero, motivi: ['numero'] }))
  out.push(idea(`«${kw}» come immagine`, 'parola-immagine', { parola: kw }))
  out.push(idea('il titolo enorme, il resto sussurrato', 'scala', { togli: ['ornamenti', 'dettagli'] }))
  if (parole(c.title).length >= 2) out.push(idea(`«${kw}» ripetuta fino a riempire la tavola`, 'ripetizione', { parola: kw, motivi: ['ripetizione'] }))
  out.push(idea('il messaggio piccolo nel vuoto', 'vuoto', { togli: ['ornamenti', 'dettagli', 'testo'] }))
  // una per gesto, nell'ordine trovato (le metafore prima)
  const visti = new Set<Gesto>()
  return out.filter(x => (visti.has(x.gesto) ? false : (visti.add(x.gesto), true))).slice(0, 5)
}

/** Esempi d'autore (non decorazioni): mostrano il tipo di salto che si chiede. */
const ESEMPI = [
  'Caffè "Notte Etiope" → {"nome":"una tazzina che è una luna nel nero","gesto":"vuoto","parola":"Notte","scala":0,"energia":0,"densita":0,"togli":["dettagli","ornamenti"],"motivi":[]}',
  'Palestra "Allenati come una squadra" → {"nome":"ALLENATI troppo grande per stare nel quadrato","gesto":"scala","parola":"Allenati","scala":1,"energia":1,"densita":0,"togli":["ornamenti"],"motivi":[]}',
  'Mostra "Creature della luce" → {"nome":"la foto della medusa dentro la parola LUCE","gesto":"parola-immagine","parola":"luce","scala":1,"energia":0,"densita":0,"togli":["dettagli"],"motivi":[]}',
]

/** Il prompt della chiamata (breve: il brief, i gesti ammessi, tre esempi d'autore, lo schema). */
export function promptIdee(c: DesignContent) {
  return [
    'Sei un direttore artistico. Dal brief ricava da 3 a 5 idee visive per un post: una metafora, un gioco di parole visivo o un gesto tipografico. Non decorazioni (cornici, texture, sfondi, icone): un’idea che si capisce in un secondo.',
    `Ogni idea ha un solo gesto dominante tra: ${GESTI.join(', ')}; spingilo all'estremo e riduci il resto. Idee diverse, gesti diversi.`,
    'Esempi:', ...ESEMPI,
    `Brief: ${[c.brand, c.kicker, c.title, c.body, ...(c.details ?? [])].filter(Boolean).join(' · ')}`,
    `Rispondi solo con un array JSON: [{"nome":"…","gesto":"…","parola":"una parola del titolo","scala":0|1,"energia":0|1,"densita":0|1,"togli":["testo"|"dettagli"|"foto"|"ornamenti"],"motivi":[${MOTIVI.map(m => `"${m}"`).join('|')}]}]`,
  ].join('\n')
}

/** Idee che sono decorazioni travestite: si scartano. */
const DECORO = /cornic|ornament|decor|texture|trama|sfond|bordo|icon|cuoric|stellin|glitter|elegan|carin/i

/** Legge la risposta del modello; idee non valide si scartano, meno di 3 → si completano con le regole. */
export function leggiIdee(testo: string, c: DesignContent): Idea[] {
  let grezze: unknown[] = []
  const da = testo.indexOf('[')
  try { grezze = JSON.parse(testo.slice(da, testo.lastIndexOf(']') + 1)) } catch {
    // lista troncata (il modello ha finito i token): si tengono le idee complete
    try { grezze = JSON.parse(testo.slice(da, testo.lastIndexOf('}') + 1) + ']') } catch { /* risposta non leggibile: le regole */ }
  }
  const polo = (v: unknown): 0 | 1 => (Number(v) >= 0.5 ? 1 : 0)
  const idee = (Array.isArray(grezze) ? grezze : []).flatMap(x => {
    const o = x as Record<string, unknown>
    const gesto = GESTI.find(gg => gg === o?.gesto)
    if (!gesto || typeof o.nome !== 'string' || DECORO.test(o.nome)) return []
    const parola = typeof o.parola === 'string' && (c.title + ' ' + (c.numero ?? '')).toLowerCase().includes(o.parola.toLowerCase()) ? o.parola : undefined
    return [idea(o.nome.slice(0, 80), gesto, {
      parola, scala: polo(o.scala), energia: polo(o.energia), densita: polo(o.densita),
      togli: (Array.isArray(o.togli) ? o.togli : []).filter((t): t is Idea['togli'][number] => ['testo', 'dettagli', 'foto', 'ornamenti'].includes(t as string)),
      motivi: (Array.isArray(o.motivi) ? o.motivi : []).filter((m): m is string => (MOTIVI as readonly string[]).includes(m as string)),
    })]
  })
  // un gesto per idea: i doppioni si tolgono (si tiene la prima)
  const visti = new Set<Gesto>()
  const uniche = idee.filter(i => (visti.has(i.gesto) ? false : (visti.add(i.gesto), true))).slice(0, 5)
  if (uniche.length >= 3) return uniche
  const resto = ideeDaRegole(c).filter(r => !uniche.some(i => i.gesto === r.gesto))
  return [...uniche, ...resto].slice(0, Math.max(3, uniche.length))
}

export type Chiedi = (prompt: string) => Promise<string>

/** Le idee del brief: con il modello se c'è (una chiamata), altrimenti con le regole. */
export async function concetti(c: DesignContent, o: { chiedi?: Chiedi } = {}): Promise<Idea[]> {
  if (!o.chiedi) return ideeDaRegole(c)
  try { return leggiIdee(await o.chiedi(promptIdee(c)), c) } catch { return ideeDaRegole(c) }
}

/** La chiamata a secco per la vetrina: risponde con le idee delle regole in JSON (passa dal lettore) e conta i token che costerebbe. */
export function simulato(c: DesignContent, conta?: { chiamate: number; token: number }): Chiedi {
  return async prompt => {
    const risposta = JSON.stringify(ideeDaRegole(c).map(({ nome, gesto, parola, scala, energia, densita, togli, motivi }) => ({ nome, gesto, parola, scala, energia, densita, togli, motivi })))
    if (conta) { conta.chiamate++; conta.token += Math.ceil((prompt.length + risposta.length) / 4) }
    return risposta
  }
}
