/**
 * G2, primo passo: dato il brief, i design più vicini dell'archivio. Senza
 * impronta CLIP (arriva con V2/G6) la vicinanza è fatta di tag e di forma:
 * settore, registro, foto sì o no, quanti testi ha il brief, formato. Poi una
 * scelta MMR sulle impronte di layout, perché gli esempi non si somiglino tra
 * loro: dieci manifesti tutti uguali insegnerebbero una sola cosa.
 */
import type { DesignContent, Format } from '../types'
import { FORMAT_SIZE } from '../types'
import { inferRegistro } from '../styles'
import type { Archivio, Esempio } from './tipi'
import { distanza, settoriDi, testiDi } from './scheda'

const testoBrief = (c: DesignContent) => [c.brand, c.kicker, c.title, c.body, c.imageQuery, ...(c.details ?? [])].filter(Boolean).join(' ')

/** Quanto un esempio fa al caso del brief (più alto = più vicino). */
export function affinitaEsempio(c: DesignContent, format: Format, e: Esempio, hasPhoto: boolean): number {
  const testo = testoBrief(c)
  const settori = settoriDi(testo), registro = inferRegistro(testo)
  const ruoli = new Set(testiDi(e.programma).map(s => s.ruolo))
  const fotoE = e.programma.strati.some(s => s.ruolo === 'foto' && s.box[2] * s.box[3] > 0.12)
  const [W, H] = FORMAT_SIZE[format]
  let p = 0
  p += 2 * settori.filter(s => e.settore.includes(s)).length
  if (e.registro === registro) p += 1.5
  p += fotoE === hasPhoto ? 1 : -0.5
  if (c.numero && ruoli.has('numero')) p += 0.5
  if (c.body && ruoli.has('testo')) p += 0.5
  if ((c.details?.length ?? 0) > 1 && ruoli.has('dettagli')) p += 0.3
  // il formato: un manifesto verticale insegna poco a una tavola orizzontale
  p -= 1.2 * Math.abs(Math.log((e.programma.rapporto ?? 0.75) / (W / H)))
  // le tavole del motore valgono meno: l'archivio serve a uscire dalle nostre regole
  if (e.origine === 'motore') p -= 1
  return p
}

/**
 * I k esempi per il brief: i migliori per affinità, scelti uno alla volta con
 * MMR (affinità meno somiglianza con quelli già presi); al più 2 del motore.
 * `seme` cambia la scelta tra esempi di affinità simile.
 */
export function vicini(c: DesignContent, format: Format, a: Archivio | Esempio[], o: { k?: number; hasPhoto?: boolean; seme?: number; lambda?: number } = {}): Esempio[] {
  const tutti = Array.isArray(a) ? a : a.esempi
  const k = Math.min(o.k ?? 8, tutti.length), lambda = o.lambda ?? 0.6
  let s = (o.seme ?? 0) * 2654435761 >>> 0
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  const cand = tutti.map(e => ({ e, a: affinitaEsempio(c, format, e, !!o.hasPhoto) + rnd() * 0.8 }))
  const max = Math.max(...cand.map(x => x.a)), min = Math.min(...cand.map(x => x.a))
  const norm = (v: number) => (max > min ? (v - min) / (max - min) : 1)
  const presi: Esempio[] = []
  let motore = 0
  while (presi.length < k) {
    let best: { e: Esempio; v: number } | null = null
    for (const x of cand) {
      if (presi.includes(x.e) || (x.e.origine === 'motore' && motore >= 2)) continue
      const sim = presi.length ? Math.max(...presi.map(p => 1 - Math.min(1, distanza(p.impronta, x.e.impronta) * 3))) : 0
      const v = lambda * norm(x.a) - (1 - lambda) * sim
      if (!best || v > best.v) best = { e: x.e, v }
    }
    if (!best) break
    presi.push(best.e)
    if (best.e.origine === 'motore') motore++
  }
  return presi
}
