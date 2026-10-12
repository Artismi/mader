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
import { SYSTEMS_BASE } from './systems'
import { SYSTEMS_REGISTRI } from './systems2'
import type { Scene as SceneT } from '../types'
import type { G } from './tools'
import type { RegistroId } from '../styles'
import { loadPix } from '../core/foto'

export * from './knobs'

export const SYSTEMS: Record<SistemaId, (g: G) => SceneT | null> = { ...SYSTEMS_BASE, ...SYSTEMS_REGISTRI }

/** Sistemi che parlano ciascun registro, dal più tipico. */
export const SISTEMI_DEL_REGISTRO: Record<RegistroId, SistemaId[]> = {
  infantile: ['giocoso', 'orbita', 'modulare', 'riso', 'supertipo'],
  pop: ['giocoso', 'eco', 'strisce', 'supertipo', 'riso', 'orbita'],
  editoriale: ['rivista', 'supertipo', 'modulare', 'ritaglio', 'eco'],
  svizzero: ['modulare', 'supertipo', 'costruttivo', 'strisce', 'eco'],
  avanguardia: ['decostruito', 'eco', 'strisce', 'ritaglio', 'riso', 'costruttivo'],
  lusso: ['rivista', 'orbita', 'ritaglio', 'supertipo', 'modulare'],
  artigianale: ['riso', 'rivista', 'supertipo', 'modulare', 'orbita', 'giocoso'],
  notte: ['eco', 'strisce', 'supertipo', 'costruttivo', 'ritaglio', 'decostruito'],
  tech: ['modulare', 'orbita', 'supertipo', 'strisce', 'giocoso'],
  retro: ['strisce', 'orbita', 'giocoso', 'supertipo', 'eco'],
  sportivo: ['costruttivo', 'strisce', 'eco', 'supertipo', 'ritaglio'],
}

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
  const style = opts.styleId ? styleById(opts.styleId) : inferStyle(allText(c), 'lancio')
  const stile = style.id
  const r = rng(hashText(allText(c)))
  // i sistemi del registro prima, poi gli altri (che senza foto devono reggere da soli)
  const ok = (id: SistemaId) => opts.hasPhoto || SISTEMI.find(s => s.id === id)?.foto !== 'serve'
  const pref = SISTEMI_DEL_REGISTRO[style.registro].filter(ok)
  const list = opts.sistemi ?? [...pref, ...SISTEMI.map(s => s.id).filter(id => ok(id) && !pref.includes(id))].slice(0, 8)
  const tratt: Knobs['trattamento'][] = ['pellicola', 'duotone', 'retino', 'riso', 'serigrafia', 'bn', 'poster']
  const prefK: Partial<Record<SistemaId, Partial<Knobs>>> = {
    costruttivo: { trattamento: 'retino' }, riso: { trattamento: 'riso', sovrastampa: 0.7 }, strisce: { trattamento: 'pellicola' },
    eco: { trattamento: 'retino' }, ritaglio: { trattamento: 'pellicola' }, orbita: { trattamento: 'duotone' },
  }
  return list.map((sistema, i) => ({
    sistema, stile,
    scala: 0.55 + r.range(0, 0.4), energia: 0.25 + r.range(0, 0.6), densita: 0.45 + r.range(0, 0.45),
    sovrastampa: 0.3 + r.range(0, 0.5), trattamento: r.pick(tratt), inverti: i % 4 === 3, grana: 0.35 + r.range(0, 0.4),
    seme: r.int(1, 99999),
    ...prefK[sistema],
  }))
}
