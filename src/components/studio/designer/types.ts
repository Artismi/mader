/**
 * Motore "designer": dai contenuti nasce una scena di elementi già misurati e
 * posizionati (niente coordinate scelte dall'IA). Ogni impaginazione riserva
 * zone separate per testo e immagine, misura i testi con i font veri e scarta
 * le proposte che non stanno.
 */

import type { Esame } from './gen/critico'
import type { Specifica } from './progetto/specifica'

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
  /** numero protagonista: data, prezzo, percentuale, anno ("14.11", "-30%", "2026") */
  numero?: string
  /** tipo di contenuto: non solo copertine */
  tipo?: TipoContenuto
  /** voci strutturate: consigli, passi, dati, righe del programma, piatti del menu, domande, tappe */
  voci?: Voce[]
  /** confronto a due colonne (prima/dopo, sì/no, A contro B) */
  colonne?: { titolo: string; punti: string[] }[]
  /** chi parla (testimonianza, citazione) */
  persona?: { nome: string; ruolo?: string }
  /** cosa mostra la foto (per la ricerca): "chicchi di caffè su pietra scura" */
  imageQuery?: string
  imageUrl?: string
  /** altre foto dello stesso soggetto: il motore le usa a rotazione tra le composizioni (pixel già caricati con loadPix) */
  immagini?: string[]
  /** specifica di progetto per questo brief (regia o persona): motivi, icone, effetti, look, segni */
  progetto?: Specifica
}

export type TipoContenuto = 'copertina' | 'consigli' | 'passi' | 'dati' | 'confronto' | 'programma' | 'menu' | 'citazione' | 'faq' | 'prodotto' | 'timeline'

/** Una voce strutturata: i campi usati dipendono dal tipo (consiglio: titolo+testo; programma: ora+titolo; menu: titolo+testo+prezzo; dati: valore+titolo). */
export interface Voce { titolo?: string; testo?: string; valore?: string; ora?: string; prezzo?: string }

export type Format = 'quadrato' | 'verticale' | 'storia' | 'orizzontale'

export const FORMAT_SIZE: Record<Format, [number, number]> = {
  quadrato: [1080, 1080],
  verticale: [1080, 1350],
  storia: [1080, 1920],
  orizzontale: [1920, 1080],
}

export interface FontSpec { family: string; weight: number; italic?: boolean }

export interface Gradient { from: string; to: string; fromAt: number; toAt: number; vertical: boolean }

/** effetto del motore (fx/catalog) applicato a un elemento: duotone, retino, riso, genFill… */
export interface FxSpec { id: string; variant?: string; p?: Record<string, number | string> }

/**
 * Sovrapposizione voluta tra gli strati (V1): `sopra` = l'elemento resta sopra i testi
 * (il titolo passa dietro), `copre` = il testo che può coprire, `area` = mezzo disco
 * coperto (n = verso della metà; n nullo = disco intero). La regola di leggibilità
 * la applica il controllo degli spazi.
 */
export type AreaIntreccio = { cx: number; cy: number; r: number; nx: number; ny: number } | { x: number; y: number; w: number; h: number }
export interface Intreccio { tipo: string; sopra?: boolean; copre?: string; area?: AreaIntreccio }

/** Proprietà comuni di resa: sovrastampa (multiply…), trasparenza, effetti, intreccio voluto. */
export interface Look { blend?: GlobalCompositeOperation; opacity?: number; fx?: FxSpec[]; intreccio?: Intreccio }

export type SceneEl =
  | ({ kind: 'rect'; name: string; x: number; y: number; w: number; h: number; fill: string | Gradient; r?: number; angle?: number; stroke?: string; sw?: number } & Look)
  | ({ kind: 'circle'; name: string; cx: number; cy: number; r: number; fill: string; stroke?: string; sw?: number } & Look)
  | { kind: 'line'; name: string; x1: number; y1: number; x2: number; y2: number; color: string; width: number; opacity?: number; dash?: number[] }
  /** tracciato SVG in coordinate della tavola */
  | ({ kind: 'path'; name: string; d: string; fill: string; stroke?: string; sw?: number } & Look)
  | ({
      kind: 'text'; name: string; x: number; y: number; w: number; h: number
      /** larghezza reale della riga più lunga (w è il box della colonna) */
      tw: number
      lines: string[]; font: FontSpec; size: number; color: string
      align: 'left' | 'center' | 'right'; lineHeight: number; tracking: number
      /** rotazione in gradi attorno all'angolo in alto a sinistra (x, y) */
      angle?: number
      /** solo contorno: colore e spessore (fill trasparente se `hollow`) */
      stroke?: string; sw?: number; hollow?: boolean
      /** testo decorativo (ripetizioni, scritte che escono dalla tavola): fuori dai controlli */
      deco?: boolean
      /** sovrapposizione voluta dall'archetipo: il controllo degli spazi non la corregge */
      sovrapponibile?: boolean
      /** stili per lettera, riga per riga: colore, spostamento verticale (in em), corsivo */
      chars?: ({ c?: string; dy?: number; it?: boolean } | null)[][]
    } & Look)
  /** testo che gira su un cerchio; `full` distribuisce il testo su tutto il giro */
  | ({ kind: 'arcText'; name: string; cx: number; cy: number; r: number; text: string; font: FontSpec; size: number; color: string; start?: number; full?: boolean; tracking?: number } & Look)
  | ({
      kind: 'image'; name: string; x: number; y: number; w: number; h: number; url?: string; fallback: string; shape?: 'rect' | 'arch' | 'circle'
      /** look pellicola del motore effetti (portra, trix, kodachrome…) e regolazioni (grana, vignettatura) */
      look?: string; adjust?: Record<string, number>
      /** la foto è adattata a questo riquadro e poi ritagliata sull'elemento (strisce, celle della stessa foto) */
      view?: { x: number; y: number; w: number; h: number }
      /** maschera libera (tracciato SVG in coordinate della tavola): blob, forme morbide */
      mask?: string
      /** la foto si vede solo dentro queste lettere (coordinate della tavola) */
      clipText?: { lines: string[]; font: FontSpec; size: number; x: number; y: number; lineHeight: number; tracking: number }
    } & Look)
  /** ornamento generativo del laboratorio in una zona; `under` = trama leggera che può stare sotto i testi */
  | { kind: 'ornament'; name: string; id: string; x: number; y: number; w: number; h: number; seed: number; opacity: number; under?: boolean; r?: number; pal?: Palette; /** oggetto 3D (id "3d:<forma>") */ o3d?: Oggetto3D }
  /** glifo vettoriale (set Celestial e forme) centrato in (cx, cy) */
  | { kind: 'glyph'; name: string; path: string; cx: number; cy: number; size: number; color: string; angle?: number; opacity?: number; blend?: GlobalCompositeOperation }
  /** sigillo: anello con testo che gira e un glifo al centro */
  | { kind: 'seal'; name: string; cx: number; cy: number; r: number; text: string; color: string; font: FontSpec; glyph?: string; bg?: string; angle?: number }

/** Oggetto 3D renderizzato in un'immagine (oggetto3d.ts): forma, materiale, testo o segno estruso. */
export interface Oggetto3D {
  forma: 'sfera' | 'toro' | 'cubo' | 'cilindro' | 'disco' | 'capsula' | 'nodo' | 'testo'
  materiale: 'plastica' | 'cromo' | 'oro' | 'vetro' | 'argilla' | 'olografico'
  colore: string; colore2?: string
  /** testo estruso (1–3 caratteri: iniziale del marchio, cifra) e carattere da usare */
  testo?: string; famiglia?: string
  inclina?: number; gira?: number; angolo?: number
}

export interface Palette { bg: string; ink: string; accent: string; muted: string; surface: string; /** sorgente della palette (V5): identità, foto, marchio, armonia */ da?: string }

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
  finish?: { ids: string[]; seed: string; fallback?: 'grana' | 'carta'; amount?: number }
  /** regolatori che hanno prodotto la scena (sistemi generativi) */
  knobs?: Record<string, unknown>
  /** esame del critico: voto, difetti, gesti, correzioni fatte */
  esame?: Esame
  /** attribuzioni richieste dalle licenze degli asset usati (catalogo) */
  crediti?: string[]
  /** mattoni della ricetta (V1): ossatura, titolo, foto, dispositivi, finiture */
  mattoni?: string[]
}
