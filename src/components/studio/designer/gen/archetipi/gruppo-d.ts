/**
 * Archetipi del gruppo D · digitale e notte. Ogni funzione compone una tavola
 * intera con gli strumenti di ../tools e ../forme, legge regolatori e registro,
 * ha varianti interne scelte dal seme e chiude con finish().
 * Le idee e le ricette d'origine sono in ./elenco.ts.
 */
import type { Scene } from '../../types'
import type { G } from '../tools'

type Sistema = (g: G) => Scene | null

export const SYSTEMS_D: Record<'interfaccia' | 'sorveglianza' | 'terminale' | 'brutale' | 'acido' | 'aero' | 'pixel' | 'manga' | 'agenzia', Sistema> = {
  interfaccia: () => null,
  sorveglianza: () => null,
  terminale: () => null,
  brutale: () => null,
  acido: () => null,
  aero: () => null,
  pixel: () => null,
  manga: () => null,
  agenzia: () => null,
}
