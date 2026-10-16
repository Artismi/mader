/**
 * G1, archivio di design veri (docs/competitor-e-gradini.md): lo schema.
 *
 * Ogni design è un **programma**: l'albero degli strati della nostra scena
 * ridotto a frazioni della tavola e a ruoli (titolo, foto, campo…), con i
 * colori come ruoli della palette e i caratteri come voci dell'identità. È lo
 * stesso formato che il generatore G2 (gen/esempi.ts) fa scrivere a un modello:
 * gli esempi entrano nel prompt e la risposta torna nel motore.
 */
import { z } from 'zod'

export const RUOLI_TESTO = ['titolo', 'occhiello', 'testo', 'dettagli', 'invito', 'marchio', 'numero'] as const
export const RUOLI = [...RUOLI_TESTO, 'fondo', 'campo', 'disco', 'filetto', 'foto'] as const
export const COLORI = ['fondo', 'inchiostro', 'accento', 'accento2', 'tenue', 'superficie'] as const
export const FAMIGLIE = ['display', 'testo', 'etichetta', 'impatto'] as const

const fr = z.number().min(-0.2).max(1.2)

/** Uno strato: geometria in frazioni della tavola [x, y, w, h], ruolo, colore e (per i testi) voce tipografica. */
export const stratoSchema = z.object({
  ruolo: z.enum(RUOLI),
  box: z.tuple([fr, fr, fr, fr]).describe('[x, y, larghezza, altezza] in frazioni della tavola (0-1)'),
  colore: z.enum(COLORI).optional(),
  angolo: z.number().min(-90).max(90).optional(),
  opacita: z.number().min(0).max(1).optional(),
  /** solo testi */
  famiglia: z.enum(FAMIGLIE).optional(),
  maiuscolo: z.boolean().optional(),
  corsivo: z.boolean().optional(),
  allinea: z.enum(['left', 'center', 'right']).optional(),
  /** corpo massimo in frazione dell'altezza della tavola (il motore lo adatta al riquadro) */
  corpo: z.number().min(0.005).max(0.6).optional(),
  /** solo foto: forma della maschera */
  forma: z.enum(['rect', 'arch', 'circle']).optional(),
})
export type Strato = z.infer<typeof stratoSchema>

export const programmaSchema = z.object({
  /** larghezza/altezza della tavola di partenza */
  rapporto: z.number().min(0.3).max(3).optional(),
  strati: z.array(stratoSchema).min(2).max(40),
})
export type Programma = z.infer<typeof programmaSchema>

export interface Licenza { fonte: string; licenza: string; verifica: string; immagine?: string; pagina?: string }

/** Un design dell'archivio. */
export interface Esempio {
  id: string
  origine: 'museo' | 'motore'
  titolo?: string
  autore?: string
  /** anno (inizio) e decennio, se noti */
  anno?: number
  epoca?: string
  programma: Programma
  /** griglia ricavata dagli strati: margini, colonne, asse dei testi */
  griglia: { margini: [number, number, number, number]; colonne: number; asse: 'sinistra' | 'centro' | 'destra' | 'libero' }
  /** tipografia: rapporto tra corpo massimo e minimo, quota di maiuscolo, voci usate, famiglie trovate dal decompilatore */
  tipografia: { contrasto: number; maiuscolo: number; voci: string[]; famiglie: string[]; titolo: number }
  /** palette vera (dal decompilatore) e se il fondo è scuro */
  palette: { fondo: string; inchiostro: string; accenti: string[]; scuro: boolean }
  /** tag di settore e di tono, registro del motore più vicino */
  settore: string[]
  tono: string[]
  registro?: string
  /** impronta numerica per la ricerca (impronta.ts) */
  impronta: number[]
  /** fedeltà della decompilazione (1 per le tavole del motore) */
  fedelta: number
  licenza: Licenza
}

export interface Archivio { versione: number; creato: string; esempi: Esempio[]; note?: string[] }
