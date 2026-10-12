/**
 * Ingresso dei sistemi generativi: dai contenuti e dai regolatori alla scena.
 * Senza IA le proposte partono da regolatori diversi per ogni sistema; con
 * l'IA i regolatori li sceglie il modello (e poi li ritocca guardando le tavole).
 */
import type { DesignContent, Format, Scene } from '../types'
import { styleById, fontsOf, inferStyle } from '../styles'
import { loadFonts } from '../fonts'
import { type Knobs, type SistemaId, SISTEMI, hashText, rng } from './knobs'
import { makeG } from './tools'
import { SYSTEMS } from './systems'
import { loadPix } from '../core/foto'

export * from './knobs'

/** Una scena dai regolatori; se la composizione non regge prova qualche variante del seme. */
export async function generateSystem(c: DesignContent, format: Format, k: Knobs, photo?: string): Promise<Scene | null> {
  const style = styleById(k.stile)
  const [, pix] = await Promise.all([loadFonts(fontsOf(style)), loadPix(photo ?? c.imageUrl)])
  for (let attempt = 0; attempt < 6; attempt++) {
    const kk = attempt ? { ...k, seme: k.seme + attempt * 7919, scala: Math.max(0, k.scala - attempt * 0.08) } : k
    try {
      const sc = SYSTEMS[k.sistema](makeG(format, style, kk, c, photo, pix))
      if (sc) return { ...sc, knobs: { ...k } }
    } catch (e) {
      console.warn('[designer]', k.sistema, e)
      ;(globalThis as { __designerSink?: string[] }).__designerSink?.push(`${k.sistema}: errore ${(e as Error).message}`)
      return null
    }
  }
  return null
}

const allText = (c: DesignContent) => [c.brand, c.kicker, c.title, c.body, c.imageQuery, ...(c.details ?? [])].filter(Boolean).join(' ')

/** Regolatori di partenza per ogni sistema: varianti diverse, decise dal contenuto (stesso testo, stesse proposte). */
export function proposeKnobs(c: DesignContent, opts: { styleId?: string; hasPhoto: boolean; sistemi?: SistemaId[] }): Knobs[] {
  const stile = opts.styleId ?? inferStyle(allText(c), 'lancio').id
  const r = rng(hashText(allText(c)))
  const list = opts.sistemi ?? SISTEMI.filter(s => opts.hasPhoto || s.foto !== 'serve').map(s => s.id)
  const tratt: Knobs['trattamento'][] = ['pellicola', 'duotone', 'retino', 'riso', 'serigrafia', 'bn', 'poster']
  const pref: Partial<Record<SistemaId, Partial<Knobs>>> = {
    costruttivo: { trattamento: 'retino' }, riso: { trattamento: 'riso', sovrastampa: 0.7 }, strisce: { trattamento: 'pellicola' },
    eco: { trattamento: 'retino' }, ritaglio: { trattamento: 'pellicola' }, orbita: { trattamento: 'duotone' },
  }
  return list.map((sistema, i) => ({
    sistema, stile,
    scala: 0.55 + r.range(0, 0.4), energia: 0.25 + r.range(0, 0.6), densita: 0.45 + r.range(0, 0.45),
    sovrastampa: 0.3 + r.range(0, 0.5), trattamento: r.pick(tratt), inverti: i % 4 === 3, grana: 0.35 + r.range(0, 0.4),
    seme: r.int(1, 99999),
    ...pref[sistema],
  }))
}
