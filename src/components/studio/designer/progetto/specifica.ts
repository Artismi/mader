/**
 * La specifica di progetto: lo strato che orienta il generatore dall'alto per
 * un brief preciso. La scrive l'IA (il progettista della regia) o una persona,
 * solo con voci del vocabolario; il motore la usa come preferenze e vincoli in
 * ogni archetipo (decori dello stile sostituiti, icone, effetti del titolo,
 * look della foto, segni).
 */
import type { Trattamento } from '../gen/knobs'
import { MOTIVI, ORNAMENTI, LOOK_FOTO, TRATTAMENTI_FOTO, SEGNI, EFFETTI_TESTO, EVITABILI, type EffettoTesto, type Evitabile, type Segno } from './vocabolario'

/** Un'icona Iconify; `d` è il tracciato risolto (lato server o dal banco di prova). */
export interface IconaSpec { id: string; d?: string }

export interface Specifica {
  /** pacchetti di segni per settore (vocabolario MOTIVI) */
  motivi?: string[]
  /** icone in più, oltre a quelle dei motivi */
  icone?: IconaSpec[]
  ornamenti?: string[]
  glifi?: string[]
  /** effetto del titolo, o più effetti in ordine di preferenza (il motore usa il primo che si addice al fondo) */
  testo?: { titolo?: EffettoTesto | EffettoTesto[] }
  /** colore d'accento del brief (esadecimale) */
  colore?: { accento?: string }
  foto?: { look?: string; trattamento?: Trattamento; cerca?: string }
  segni?: Segno[]
  /** parola del titolo da mettere in evidenza */
  enfasi?: string
  evita?: Evitabile[]
}

/** Specifica concreta: i motivi sciolti nelle loro voci, solo voci valide. */
export interface SpecificaEsplicita {
  icone: IconaSpec[]
  ornamenti: string[]
  glifi: string[]
  /** effetti del titolo in ordine di preferenza */
  effetti: EffettoTesto[]
  accento?: string
  look?: string
  trattamento?: Trattamento
  segni: Segno[]
  enfasi?: string
  evita: Evitabile[]
}

const uniq = <T,>(l: T[]) => [...new Set(l)]

/** Scioglie i motivi nelle loro voci; le scelte esplicite vincono su quelle dei motivi. Le voci sconosciute si scartano. */
export function espandi(sp: Specifica): SpecificaEsplicita {
  const mot = (sp.motivi ?? []).map(m => MOTIVI[m]).filter(Boolean)
  const evita = uniq((sp.evita ?? []).filter(e => e in EVITABILI))
  const byId = new Map<string, IconaSpec>()
  for (const i of [...(sp.icone ?? []), ...mot.flatMap(m => m.icone.map((id): IconaSpec => ({ id })))]) if (!byId.has(i.id) || (i.d && !byId.get(i.id)!.d)) byId.set(i.id, { ...byId.get(i.id), ...i })
  const dati = sp.testo?.titolo ? (Array.isArray(sp.testo.titolo) ? sp.testo.titolo : [sp.testo.titolo]) : []
  const effetti = uniq([...dati, ...mot.map(m => m.effetto)].filter((e): e is EffettoTesto => !!e && e in EFFETTI_TESTO))
    .filter(e => !(e === 'neon' && evita.includes('neon')) && !(e === 'lamina-oro' && evita.includes('lamina')))
  const accento = [sp.colore?.accento, ...mot.map(m => m.accento)].find(c => !!c && /^#[0-9a-f]{6}$/i.test(c))
  return {
    icone: [...byId.values()],
    ornamenti: uniq([...(sp.ornamenti ?? []), ...mot.flatMap(m => m.ornamenti ?? [])]).filter(o => (ORNAMENTI as readonly string[]).includes(o)),
    glifi: uniq([...(sp.glifi ?? []), ...mot.flatMap(m => m.glifi ?? [])]),
    effetti,
    accento,
    look: [sp.foto?.look, ...mot.map(m => m.look)].find(l => !!l && (LOOK_FOTO as readonly string[]).includes(l)),
    trattamento: sp.foto?.trattamento && TRATTAMENTI_FOTO.includes(sp.foto.trattamento) ? sp.foto.trattamento : undefined,
    segni: uniq([...(sp.segni ?? []), ...mot.flatMap(m => m.segni ?? [])]).filter(s => (SEGNI as readonly string[]).includes(s)) as Segno[],
    enfasi: sp.enfasi,
    evita,
  }
}

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Ripiego senza IA: i motivi riconosciuti dalle parole del brief (al massimo
 * tre, dal più citato). Serve quando la regia non risponde e come base del banco.
 */
export function ripiego(testo: string): Specifica {
  const t = ` ${norm(testo)} `
  const punti = Object.entries(MOTIVI)
    .map(([id, m]) => [id, m.parole.filter(p => t.includes(norm(p))).length] as const)
    .filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
  return { motivi: punti.slice(0, 3).map(([id]) => id) }
}

/** Ids delle icone ancora da risolvere (senza tracciato). */
export const iconeDaRisolvere = (sp: Specifica) => espandi(sp).icone.filter(i => !i.d).map(i => i.id)
