/**
 * La maestra sulle scritture (docs/guscio-agente.md, fase G5): controlli
 * riusabili che gli strumenti mettono in `verify` (prima di scrivere) e in
 * `after` (rilettura di quello che è stato scritto). Ogni controllo restituisce
 * frasi che dicono al modello cosa correggere, non codici.
 */
import { clients } from '@/lib/db'
import { detect, lintCaption } from '@/lib/ai/instagram'

const ISO = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/

const today = (now: Date) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

/** Data ISO valida; con `futura` non può stare prima di oggi (oggi è ammesso). */
export function dataIso(campo: string, v: string | undefined, o: { futura?: boolean; obbligatoria?: boolean; now?: Date } = {}): string[] {
  if (!v?.trim()) return o.obbligatoria ? [`${campo}: manca la data (formato AAAA-MM-GG).`] : []
  if (!ISO.test(v.trim())) return [`${campo}: "${v}" non è una data ISO (AAAA-MM-GG o AAAA-MM-GGTHH:MM). Converti "domani", "venerdì" ecc. usando la data di oggi.`]
  const d = new Date(v.length === 10 ? `${v}T12:00:00` : v)
  if (isNaN(d.getTime())) return [`${campo}: "${v}" non è una data esistente.`]
  const now = o.now ?? new Date()
  if (o.futura && v.slice(0, 10) < today(now)) return [`${campo}: ${v.slice(0, 10)} è nel passato (oggi è ${today(now)}). Usa una data futura, o chiedi all'utente se intendeva un'altra data.`]
  return []
}

/** Il cliente indicato esiste (ID completo, ID corto o nome univoco). Vuoto = va bene se non obbligatorio. */
export function clienteEsiste(campo: string, ref: string | undefined, o: { obbligatorio?: boolean } = {}): string[] {
  if (!ref?.trim()) return o.obbligatorio ? [`${campo}: indica il cliente (nome o ID; cercalo con searchClient).`] : []
  const all = clients.getAll()
  const key = ref.trim().toLowerCase()
  if (all.some(c => c.id === ref || c.id.startsWith(ref))) return []
  const byName = all.filter(c => c.name.toLowerCase().includes(key))
  if (byName.length === 1) return []
  if (byName.length > 1) return [`${campo}: "${ref}" corrisponde a più clienti (${byName.map(c => c.name).join(', ')}). Usa l'ID.`]
  return [`${campo}: il cliente "${ref}" non esiste. Cercalo con searchClient; se è nuovo, chiedi all'utente prima di procedere.`]
}

/** Budget di caratteri. */
export function budget(campo: string, v: string | undefined, max: number, min = 0): string[] {
  const t = (v ?? '').trim()
  if (t.length > max) return [`${campo}: ${t.length} caratteri, massimo ${max}. Accorcia tenendo il senso.`]
  if (t.length < min) return [`${campo}: troppo corto (minimo ${min} caratteri).`]
  return []
}

/**
 * Testo social pronto per la pubblicazione: lint della caption (prima riga,
 * hashtag, lunghezza…) e rilevatore di testo generato. Blocca solo i difetti
 * gravi (FIX, FLAGGED); i dubbi passano come avvisi in `after`.
 */
export function testoSocial(campo: string, testo: string | undefined): string[] {
  const t = (testo ?? '').trim()
  if (!t) return []
  const lint = lintCaption(t)
  const out = lint.checks.filter(c => c.status === 'FAIL').map(c => `${campo}: ${c.label.toLowerCase()} da correggere (${c.detail}).`)
  const human = detect(t)
  if (human.verdict === 'FLAGGED') out.push(`${campo}: suona scritto da un'IA (human score ${human.humanScore.toFixed(1)}, punto debole: ${human.weakest}). Passalo da instagramLab con action "polish" e usa la versione pulita.`)
  return out
}

/** Avvisi non bloccanti sul testo social (REVIEW): finiscono nel risultato dello strumento. */
export function avvisiSocial(testo: string | undefined): string[] {
  const t = (testo ?? '').trim()
  if (!t) return []
  const lint = lintCaption(t)
  const out = lint.checks.filter(c => c.status === 'WARN').map(c => `${c.label.toLowerCase()}: ${c.detail}`)
  if (detect(t).verdict === 'REVIEW') out.push('il testo è al limite del "generato": valuta instagramLab polish')
  return out
}

export const tutti = (...liste: string[][]) => liste.flat()
