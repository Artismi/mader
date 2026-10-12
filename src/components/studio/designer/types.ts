/**
 * Motore "designer": dai contenuti nasce una scena di elementi già misurati e
 * posizionati (niente coordinate scelte dall'IA). Ogni impaginazione riserva
 * zone separate per testo e immagine, misura i testi con i font veri e scarta
 * le proposte che non stanno.
 */

export type DesignKind = 'lancio' | 'evento' | 'citazione' | 'annuncio'

export interface DesignContent {
  brand?: string
  /** occhiello: "Nuovo blend", "Sabato 14 novembre"… */
  kicker?: string
  title: string
  body?: string
  /** dettagli brevi: formato, origine, orari, luogo… */
  details?: string[]
  cta?: string
  /** cosa mostra la foto (per la ricerca): "chicchi di caffè su pietra scura" */
  imageQuery?: string
  imageUrl?: string
}

export type Format = 'quadrato' | 'verticale' | 'storia' | 'orizzontale'

export const FORMAT_SIZE: Record<Format, [number, number]> = {
  quadrato: [1080, 1080],
  verticale: [1080, 1350],
  storia: [1080, 1920],
  orizzontale: [1920, 1080],
}

export interface FontSpec { family: string; weight: number; italic?: boolean }

export interface Gradient { from: string; to: string; fromAt: number; toAt: number; vertical: boolean }

export type SceneEl =
  | { kind: 'rect'; name: string; x: number; y: number; w: number; h: number; fill: string | Gradient; r?: number; opacity?: number }
  | { kind: 'circle'; name: string; cx: number; cy: number; r: number; fill: string }
  | { kind: 'line'; name: string; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | {
      kind: 'text'; name: string; x: number; y: number; w: number; h: number
      /** larghezza reale della riga più lunga (w è il box della colonna) */
      tw: number
      lines: string[]; font: FontSpec; size: number; color: string
      align: 'left' | 'center' | 'right'; lineHeight: number; tracking: number
    }
  | {
      kind: 'image'; name: string; x: number; y: number; w: number; h: number; url?: string; fallback: string; shape?: 'rect' | 'arch' | 'circle'
      /** look pellicola del motore effetti (portra, trix, kodachrome…) e regolazioni (grana, vignettatura) */
      look?: string; adjust?: Record<string, number>
    }
  /** ornamento generativo del laboratorio in una zona; `under` = trama leggera che può stare sotto i testi */
  | { kind: 'ornament'; name: string; id: string; x: number; y: number; w: number; h: number; seed: number; opacity: number; under?: boolean; r?: number; pal?: Palette }
  /** glifo vettoriale (set Celestial e forme) centrato in (cx, cy) */
  | { kind: 'glyph'; name: string; path: string; cx: number; cy: number; size: number; color: string; angle?: number; opacity?: number }
  /** sigillo: anello con testo che gira e un glifo al centro */
  | { kind: 'seal'; name: string; cx: number; cy: number; r: number; text: string; color: string; font: FontSpec; glyph?: string; bg?: string }

export interface Palette { bg: string; ink: string; accent: string; muted: string; surface: string }

export interface Scene {
  w: number
  h: number
  bg: string
  /** colori dello stile, per gli ornamenti */
  palette?: Palette
  els: SceneEl[]
  layout: string
  style: string
  label: string
  /** finiture dai pack dell'utente (carta, grana, luce…) e seme per sceglierle; ripiego procedurale se non ci sono pack */
  finish?: { ids: string[]; seed: string; fallback?: 'grana' | 'carta' }
}
