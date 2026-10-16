/**
 * L'occhio: una sola chiamata con visione su una griglia numerata di miniature
 * mette in classifica le finaliste dell'imbuto, invece di una chiamata per tavola.
 * I verdetti si ricordano per impronta (immagine + criterio) e non si rifanno;
 * nessuna chiamata se le finaliste sono tutte sicure e bastano. Il disegno della
 * griglia e la chiamata vera si passano da fuori (node: sharp, vedi scripts/occhio),
 * così il modulo resta puro e si prova senza rete.
 */
import type { Candidata, Vaglio } from './imbuto'

export interface Immagine { mime: string; dati: Uint8Array; w: number; h: number }
export interface Verdetto { punteggio: number; ok: boolean; quando?: string }
export interface MemoriaVerdetti { get(k: string): Verdetto | undefined; set(k: string, v: Verdetto): void }
export interface Conta { chiamate: number; tokenImmagine: number; tokenTesto: number; consegnate: number }
export const contaVuota = (): Conta => ({ chiamate: 0, tokenImmagine: 0, tokenTesto: 0, consegnate: 0 })

/** Token d'immagine stimati (regola di Anthropic: lato lungo ≤ 1568 px, w·h/750). */
export function tokenImmagine(w: number, h: number) {
  const s = Math.min(1, 1568 / Math.max(w, h))
  return Math.ceil((w * s) * (h * s) / 750)
}
export const tokenTesto = (t: string) => Math.ceil(t.length / 4)

async function sha(x: Uint8Array | string) {
  const b = typeof x === 'string' ? new TextEncoder().encode(x) : x
  const d = await crypto.subtle.digest('SHA-256', b as BufferSource)
  return Array.from(new Uint8Array(d), v => v.toString(16).padStart(2, '0')).join('')
}
/** Impronta di una tavola per un criterio: la stessa immagine con lo stesso criterio non si giudica due volte. */
export const impronta = async (img: Immagine, criterio: string) => `${(await sha(img.dati)).slice(0, 32)}:${(await sha(criterio)).slice(0, 12)}`

export const CRITERIO = [
  'Sei un direttore artistico. Nella griglia ci sono tavole numerate per lo stesso brief.',
  'Per ognuna: il titolo si legge? c\'è un protagonista chiaro? margini e allineamenti tengono? i colori stanno insieme?',
  'Mettile in classifica dalla migliore alla peggiore e indica quelle da non consegnare (difetti evidenti).',
  'Rispondi SOLO con JSON: {"ordine": [numeri dalla migliore], "scarta": [numeri]}',
].join('\n')

export function leggiClassifica(testo: string, n: number): { ordine: number[]; scarta: number[] } | null {
  const m = String(testo).match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    const j = JSON.parse(m[0]) as { ordine?: unknown[]; scarta?: unknown[] }
    const valido = (v: unknown) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= n
    const ordine = [...new Set((j.ordine ?? []).filter(valido) as number[])]
    if (!ordine.length) return null
    for (let i = 1; i <= n; i++) if (!ordine.includes(i)) ordine.push(i)
    return { ordine, scarta: [...new Set((j.scarta ?? []).filter(valido) as number[])] }
  } catch { return null }
}

export interface Occhio {
  /** miniatura (~512 px di lato lungo) di una tavola */
  miniatura(id: string): Promise<Immagine>
  /** compone le miniature in una sola immagine numerata 1…n */
  griglia(imgs: Immagine[]): Promise<Immagine>
  /** chiamata al modello con visione: testo della risposta */
  chiedi(prompt: string, img: Immagine): Promise<string>
  memoria: MemoriaVerdetti
  conta: Conta
  criterio?: string
}

/**
 * Ordina le finaliste con l'occhio: i verdetti già in memoria non si richiedono,
 * le nuove vanno insieme in una sola griglia. Senza risposta valida resta l'ordine del codice.
 */
export async function giudica<T>(fin: { x: Candidata<T>; v: Vaglio }[], n: number, oc: Occhio) {
  const criterio = oc.criterio ?? CRITERIO
  const tutteSicure = fin.every(f => f.v.esito === 'buona')
  if (fin.length <= 1 || (tutteSicure && fin.length <= n)) return { scelte: fin.slice(0, n).map(f => f.x), chiamata: false }
  const mini = await Promise.all(fin.map(f => oc.miniatura(f.x.id)))
  const chiavi = await Promise.all(mini.map(m => impronta(m, criterio)))
  const voti = new Map<number, Verdetto>()
  chiavi.forEach((k, i) => { const v = oc.memoria.get(k); if (v) voti.set(i, v) })
  const nuove = fin.map((_, i) => i).filter(i => !voti.has(i))
  let chiamata = false
  if (nuove.length >= 2 || (nuove.length === 1 && voti.size === 0)) {
    const g = await oc.griglia(nuove.map(i => mini[i]))
    const prompt = `${criterio}\nTavole: ${nuove.length}.`
    const r = await oc.chiedi(prompt, g)
    chiamata = true
    oc.conta.chiamate++; oc.conta.tokenImmagine += tokenImmagine(g.w, g.h); oc.conta.tokenTesto += tokenTesto(prompt) + tokenTesto(r)
    const cl = leggiClassifica(r, nuove.length)
    if (cl) cl.ordine.forEach((num, pos) => {
      const i = nuove[num - 1], v = { punteggio: 1 - pos / Math.max(1, nuove.length - 1), ok: !cl.scarta.includes(num), quando: new Date().toISOString() }
      voti.set(i, v); oc.memoria.set(chiavi[i], v)
    })
  } else if (nuove.length === 1) voti.set(nuove[0], { punteggio: 0.5, ok: true }) // una sola nuova tra giudicate: decide il codice
  // punteggio finale: l'occhio pesa più del voto del codice, che rompe i pari
  const punti = fin.map((f, i) => { const v = voti.get(i); return { f, ok: v?.ok ?? true, p: (v?.punteggio ?? 0.5) * 100 + f.x.esame.voto / 10 } })
  const scelte = punti.filter(p => p.ok).sort((a, b) => b.p - a.p).map(p => p.f.x)
  if (scelte.length < Math.min(n, fin.length)) scelte.push(...punti.filter(p => !p.ok).map(p => p.f.x)) // mai meno tavole di quante ne servono
  return { scelte: scelte.slice(0, n), chiamata }
}
