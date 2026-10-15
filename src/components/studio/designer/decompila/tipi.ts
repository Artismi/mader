/**
 * Decompilatore (fase D1 di docs/occhio-del-designer.md): tipi condivisi tra
 * la pagina (strati, caratteri, verifica) e il server (lettura del testo con
 * un modello con visione). Lo schema zod è lo stesso da tutte e due le parti.
 */
import { z } from 'zod'
import type { FontSpec, Scene } from '../types'

/* ── lettura del modello con visione: domande chiuse, uscita validata ───── */

/** Riquadro in millesimi della tavola: [alto, sinistra, basso, destra] (la convenzione di Gemini). */
const riquadro = z.array(z.number()).length(4)

export const rigaSchema = z.object({
  testo: z.string().describe('il testo della riga esattamente come è scritto, con maiuscole, accenti e punteggiatura'),
  box: riquadro.describe('riquadro della riga: [alto, sinistra, basso, destra] in millesimi della tavola (0-1000)'),
})

export const bloccoSchema = z.object({
  righe: z.array(rigaSchema).min(1).describe('le righe del blocco, dall\'alto in basso'),
  famiglia: z.enum(['bastoni', 'graziato', 'mono', 'calligrafico']).describe('bastoni = senza grazie; graziato = con grazie; mono = a spaziatura fissa; calligrafico = scritto a mano'),
  peso: z.enum(['sottile', 'regolare', 'medio', 'neretto', 'nero']).describe('spessore delle aste'),
  corsivo: z.boolean().describe('il carattere è inclinato (corsivo)'),
  allineamento: z.enum(['sinistra', 'centro', 'destra']).describe('come sono allineate le righe tra loro (con una sola riga: sinistra)'),
  ruolo: z.enum(['titolo', 'occhiello', 'testo', 'dettaglio', 'invito', 'marchio', 'numero']).describe('ruolo nella grafica'),
})

export const letturaSchema = z.object({
  blocchi: z.array(bloccoSchema).describe('i blocchi di testo orizzontale; ogni blocco ha un solo carattere, un solo corpo e un solo colore'),
})

export type Riga = z.infer<typeof rigaSchema>
export type Blocco = z.infer<typeof bloccoSchema>
export type Lettura = z.infer<typeof letturaSchema>

/* ── raster: un'immagine come pixel RGBA, senza dipendere dal DOM ───────── */

export interface Raster { w: number; h: number; data: Uint8ClampedArray }
export type RGB = [number, number, number]
/** riquadro in pixel della tavola */
export interface Box { x: number; y: number; w: number; h: number }

/* ── risultato ──────────────────────────────────────────────────────────── */

export interface TestoTrovato {
  nome: string
  ruolo: Blocco['ruolo']
  righe: string[]
  font: FontSpec
  size: number
  lineHeight: number
  tracking: number
  colore: string
  allineamento: 'left' | 'center' | 'right'
  /** riquadro dell'inchiostro nell'originale, del blocco e di ogni riga */
  box: Box
  righeBox: Box[]
  /** differenza di pixel del carattere scelto (0 = identico) e i migliori candidati */
  errore: number
  candidati: { family: string; weight: number; errore: number }[]
}

export interface Decompilato {
  scena: Scene
  /** 0..1: 1 - differenza media per pixel tra originale e scena resa, su immagini ridotte */
  fedelta: number
  /** fedeltà prima dei giri di correzione */
  fedeltaIniziale: number
  /** giri di correzione dei parametri dopo la prima ricostruzione (al massimo 3) */
  giri: number
  testi: TestoTrovato[]
  /** millisecondi per fase */
  tempi: Record<string, number>
  avvisi: string[]
}

/** Come la pagina chiede la lettura del testo: alla route nello Studio, direttamente al modello nel banco. */
export type Lettore = (png: string) => Promise<Lettura>
