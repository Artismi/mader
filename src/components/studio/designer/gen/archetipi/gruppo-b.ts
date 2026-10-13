/**
 * Archetipi del gruppo B · collage e materia. Ogni funzione compone una tavola
 * intera con gli strumenti di ../tools e ../forme, legge regolatori e registro,
 * ha varianti interne scelte dal seme e chiude con finish().
 * Le idee e le ricette d'origine sono in ./elenco.ts.
 */
import type { Scene } from '../../types'
import type { G } from '../tools'

type Sistema = (g: G) => Scene | null

export const SYSTEMS_B: Record<'collage' | 'polaroid' | 'zine' | 'mosaico' | 'acquerello' | 'biglietto' | 'etichetta' | 'fumetto', Sistema> = {
  collage: () => null,
  polaroid: () => null,
  zine: () => null,
  mosaico: () => null,
  acquerello: () => null,
  biglietto: () => null,
  etichetta: () => null,
  fumetto: () => null,
}
