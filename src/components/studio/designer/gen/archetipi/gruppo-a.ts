/**
 * Archetipi del gruppo A · editoriale e tipografico. Ogni funzione compone una tavola
 * intera con gli strumenti di ../tools e ../forme, legge regolatori e registro,
 * ha varianti interne scelte dal seme e chiude con finish().
 * Le idee e le ricette d'origine sono in ./elenco.ts.
 */
import type { Scene } from '../../types'
import type { G } from '../tools'

type Sistema = (g: G) => Scene | null

export const SYSTEMS_A: Record<'manifesto' | 'scalinata' | 'strilli' | 'colonne' | 'centrato' | 'verticale' | 'iniziale' | 'calligrafico', Sistema> = {
  manifesto: () => null,
  scalinata: () => null,
  strilli: () => null,
  colonne: () => null,
  centrato: () => null,
  verticale: () => null,
  iniziale: () => null,
  calligrafico: () => null,
}
