/**
 * Incrocio dei mattoni (V1, punto 2 del pilota): una piccola evoluzione per
 * contenuto e formato. La popolazione parte dalle ricette nominate e da
 * genomi a caso; a ogni generazione le tavole migliori secondo il critico si
 * incrociano (ossatura di una, titolo di un'altra, segni dell'una e
 * dell'altra) e mutano nei parametri. Restano solo gli ibridi veri (mattoni
 * di almeno due ricette) che il critico promuove, uno per combinazione.
 */
import type { DesignContent, Format, Scene } from '../types'
import { type Knobs, rng, hashText } from './knobs'
import { RICETTE, compatibile, genomaCasuale, incrocio, muta, sigla, origini, geni, type Genoma } from './mattoni'

export interface OpzioniIncrocio {
  base: Knobs[]
  seme?: number
  popolazione?: number
  generazioni?: number
  figli?: number
  /** genera e fa esaminare la tavola (generateSystem): passata da fuori per non avere import circolari */
  valuta: (k: Knobs) => Promise<Scene | null>
}

type Individuo = { gen: Genoma; k: Knobs; sc: Scene }
const voto = (x: Individuo) => (x.sc.esame?.voto ?? 0) + (x.sc.esame?.promossa ? 100 : 0)
/** impronta del genoma: mattoni e segni (i parametri no) */
const firma = (gen: Genoma) => geni(gen).map(x => x.id).join('|')

export async function incrocia(c: DesignContent, format: Format, o: OpzioniIncrocio): Promise<Scene[]> {
  if (!o.base.length) return []
  const vin = { voci: !!c.tipo && c.tipo !== 'copertina', orizzontale: format === 'orizzontale' }
  const r = rng(hashText(`${c.title}|incrocio`) ^ (o.seme ?? 0))
  const N = o.popolazione ?? 8, G = o.generazioni ?? 3, F = o.figli ?? 8
  const stili = o.base
  const prova = async (gen: Genoma, da?: Knobs): Promise<Individuo | null> => {
    const k: Knobs = { ...(da ?? r.pick(stili)), sistema: 'ibrido', genoma: gen, seme: r.int(1, 99999) }
    const sc = await o.valuta(k)
    return sc ? { gen, k, sc } : null
  }
  let pop: Individuo[] = []
  const iniziali: Genoma[] = [...Object.values(RICETTE).map(x => structuredClone(x) as Genoma).filter(x => compatibile(x, vin))]
  while (iniziali.length < N) iniziali.push(genomaCasuale(r, vin))
  for (const gen of iniziali) { const x = await prova(gen); if (x) pop.push(x) }
  const tutti: Individuo[] = [...pop]
  for (let gi = 0; gi < G && pop.length >= 2; gi++) {
    pop.sort((a, b) => voto(b) - voto(a))
    const genitori = pop.slice(0, Math.max(2, Math.ceil(pop.length / 2)))
    // torneo a due: il migliore di due a caso
    const torneo = () => { const a = r.pick(genitori), b = r.pick(genitori); return voto(a) >= voto(b) ? a : b }
    const visti = new Set(tutti.map(x => firma(x.gen)))
    for (let i = 0; i < F; i++) {
      const a = torneo(), b = torneo()
      let f = muta(r, incrocio(r, a.gen, b.gen, vin), { ...vin, forza: 0.3 + 0.2 * gi })
      // un doppione si muta di nuovo (al massimo due volte): la varietà conta quanto il voto
      for (let t = 0; t < 2 && visti.has(firma(f)); t++) f = muta(r, f, { ...vin, forza: 1 })
      visti.add(firma(f))
      // lo stile dall'uno o dall'altro genitore: l'identità viaggia con la composizione
      const x = await prova(f, r.chance(0.5) ? a.k : b.k)
      if (x) { pop.push(x); tutti.push(x) }
    }
    // sopravvivono i migliori, uno per combinazione
    pop.sort((a, b) => voto(b) - voto(a))
    const per = new Set<string>()
    pop = pop.filter(x => { const s = firma(x.gen); if (per.has(s)) return false; per.add(s); return true }).slice(0, N)
  }
  ;(globalThis as { __designerSink?: string[] }).__designerSink?.push(`incrocio: ${tutti.length} riusciti, ${tutti.filter(x => x.sc.esame?.promossa).length} promossi, ${tutti.filter(x => x.sc.esame?.promossa && origini(x.gen).size >= 2).length} ibridi veri`)
  // in uscita: ibridi veri promossi, il migliore per ossatura+titolo+foto
  const out = new Map<string, Individuo>()
  for (const x of tutti.sort((a, b) => voto(b) - voto(a))) {
    if (!x.sc.esame?.promossa || origini(x.gen).size < 2) continue
    const s = sigla(x.gen)
    if (!out.has(s)) out.set(s, x)
  }
  return [...out.values()].map(x => x.sc)
}
