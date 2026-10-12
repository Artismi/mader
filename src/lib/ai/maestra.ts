/**
 * La maestra: controlli scritti in codice sulle risposte dei modelli. I
 * modelli (soprattutto gratuiti) tendono alla pigrizia: frasi fatte, campi
 * vuoti, testi troppo lunghi, numeri inventati, alternative tutte uguali.
 * Ogni controllo restituisce errori precisi, che tornano al modello come
 * istruzioni di correzione.
 */

/** Frasi fatte da pubblicità che un buon copywriter non scrive. */
const VIETATE = [
  'scopri di più', 'scopri di piu', 'il meglio per te', 'non perdere', 'unico nel suo genere', 'a portata di mano', 'esperienza unica',
  'qualità superiore', 'rivoluzionari', 'innovativ', 'eccellenza', 'all\'avanguardia', 'soluzione ideale', 'a 360', 'per tutte le esigenze',
  'clicca qui', 'non aspettare', 'imperdibile', 'il tuo partner', 'passione e qualità', 'da non perdere', 'leader del settore',
]

export const clean = (s?: string) => (s ?? '').trim()

export function lunghezza(campo: string, valore: string | undefined, max: number, min = 0): string[] {
  const v = clean(valore)
  if (v.length > max) return [`${campo}: ${v.length} caratteri, massimo ${max} ("${v}"). Accorcia mantenendo il senso.`]
  if (v.length < min) return [`${campo}: è vuoto o troppo corto, scrivilo (almeno ${min} caratteri).`]
  return []
}

export function frasiFatte(campo: string, valore: string | undefined): string[] {
  const v = clean(valore).toLowerCase()
  const hit = VIETATE.find(f => v.includes(f))
  const out: string[] = []
  if (hit) out.push(`${campo}: "${hit}" è una frase fatta, non ammessa. Scrivi qualcosa di specifico per questo contenuto.`)
  if (/!/.test(v)) out.push(`${campo}: niente punti esclamativi.`)
  if (/\p{Extended_Pictographic}/u.test(v)) out.push(`${campo}: niente emoji.`)
  return out
}

/** Numeri presenti nella risposta ma non nel brief: probabilmente inventati. */
export function numeriInventati(campo: string, valore: string | undefined, fonte: string): string[] {
  const nums = clean(valore).match(/\d+(?:[.,:]\d+)?/g) ?? []
  const src = fonte.replace(/\s+/g, ' ')
  const bad = nums.filter(n => !src.includes(n) && !src.includes(n.replace(',', '.')) && !src.includes(n.replace('.', ',')))
  return bad.length ? [`${campo}: i numeri ${bad.join(', ')} non compaiono nel brief. Non inventare dati: usa solo quelli forniti.`] : []
}

const wordsOf = (s: string) => new Set(s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 2))

/** Le alternative devono essere davvero diverse (parole in comune). */
export function diverse(campo: string, lista: string[], soglia = 0.5): string[] {
  for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) {
    const a = wordsOf(lista[i]), b = wordsOf(lista[j])
    const inter = [...a].filter(w => b.has(w)).length
    const uni = new Set([...a, ...b]).size || 1
    if (inter / uni > soglia) return [`${campo}: le alternative ${i + 1} e ${j + 1} sono troppo simili ("${lista[i]}" / "${lista[j]}"). Proponi strade diverse.`]
  }
  return []
}

/** La parola di enfasi deve stare davvero nel titolo. */
export function enfasiNelTitolo(campo: string, titolo: string, enfasi: string): string[] {
  const t = titolo.toLowerCase(), e = clean(enfasi).toLowerCase()
  if (!e) return [`${campo}: indica la parola chiave da mettere in evidenza.`]
  return t.includes(e) ? [] : [`${campo}: la parola chiave "${enfasi}" non compare nel titolo "${titolo}". Scegline una che c'è.`]
}

export const tutti = (...liste: string[][]) => liste.flat()
