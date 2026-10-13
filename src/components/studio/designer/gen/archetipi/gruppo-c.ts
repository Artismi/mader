/**
 * Archetipi del gruppo C · geometria e forma. Ogni funzione compone una tavola
 * intera con gli strumenti di ../tools e ../forme, legge regolatori e registro,
 * ha varianti interne scelte dal seme e chiude con finish().
 * Le idee e le ricette d'origine sono in ./elenco.ts.
 */
import type { Scene } from '../../types'
import type { G } from '../tools'

type Sistema = (g: G) => Scene | null

export const SYSTEMS_C: Record<'bauhaus' | 'memphis' | 'bersaglio' | 'bande' | 'arco' | 'deformato' | 'onde' | 'piramide', Sistema> = {
  bauhaus: () => null,
  memphis: () => null,
  bersaglio: () => null,
  bande: () => null,
  arco: () => null,
  deformato: () => null,
  onde: () => null,
  piramide: () => null,
}
