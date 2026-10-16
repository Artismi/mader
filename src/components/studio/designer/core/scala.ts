/**
 * Scala dei corpi e delle distanze, e le correzioni ottiche che un tipografo
 * fa a mano: spaziatura e interlinea cambiano con il corpo.
 *
 * I corpi sono pensati per il telefono: una tavola di 1080 px si vede larga
 * ~390 punti, quindi il testo parte da 28 px (≈10 pt) e le etichette da 18;
 * corpoMinimo fa da pavimento (lo stesso che misura il critico).
 */
import type { Misure } from './misure'

export const RAPPORTI = { sobria: 1.25, editoriale: 1.333, decisa: 1.5, aurea: 1.618, manifesto: 2 } as const

export type Voce = 'etichetta' | 'testo' | 'titolo' | 'titoloGraziato' | 'manifesto'

export interface Scala {
  /** rapporto tra un livello e il successivo */
  r: number
  /** corpi in px della tavola */
  testo: number
  note: number
  /** corpi minimi leggibili sul telefono (corpoMinimo): note e testi di lettura */
  minNota: number
  minLettura: number
  attacco: number
  sotto: number
  /** titolo al livello n (3 = sobrio … 6 = enorme) */
  titolo: (n: number) => number
  /** distanze sulla griglia di base: 1, 2, 3, 5, 8, 13 passi */
  spazio: (n: 1 | 2 | 3 | 4 | 5 | 6) => number
  /** spaziatura delle lettere (em) per corpo e voce */
  tracking: (size: number, voce: Voce) => number
  /** interlinea (multiplo del corpo) per corpo e voce */
  leading: (size: number, voce: Voce, maiuscolo?: boolean) => number
}

const FIB = [1, 2, 3, 5, 8, 13]
const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t))

/** Rapporto della scala dal regolatore Scala (0 sobria → 1 manifesto). */
export const rapportoDa = (scala: number) => lerp(RAPPORTI.sobria, RAPPORTI.manifesto, scala)

/**
 * Corpo minimo leggibile su telefono, in px della tavola: frazione della larghezza
 * (la tavola si vede larga quanto lo schermo). Testi di lettura più grandi delle note;
 * la storia si guarda a tutto schermo e da vicino, regge un filo meno.
 * Il critico lo misura, il motore lo usa come pavimento dei corpi.
 */
export function corpoMinimo(nome: string, format: string, W: number) {
  const lettura = /^(testo|corpo|voce|risposta|domanda|punto|descrizione)/.test(nome)
  const f = format === 'storia' ? (lettura ? 0.024 : 0.019) : (lettura ? 0.026 : 0.02)
  return f * W
}

export function scala(ms: Misure, r: number, format = ''): Scala {
  const u = ms.u
  const minNota = Math.ceil(corpoMinimo('nota', format, ms.W))
  const minLettura = Math.ceil(corpoMinimo('testo', format, ms.W))
  const testo = Math.max(28 * u, minLettura)
  const note = Math.max(18 * u, minNota, Math.min(22 * u, testo / r))
  return {
    r, testo, note, minNota, minLettura,
    attacco: testo * r,
    sotto: testo * r * r,
    titolo: n => testo * r ** n,
    spazio: n => FIB[n - 1] * ms.b,
    tracking: (size, voce) => {
      const s = size / u
      switch (voce) {
        // maiuscolo piccolo: più aria; si stringe salendo di corpo
        case 'etichetta': return lerp(0.16, 0.08, (s - 16) / 24)
        case 'testo': return s < 24 ? 0.005 : 0
        // grandi bastoni: si stringono con il corpo
        case 'titolo': return lerp(-0.005, -0.035, (s - 56) / 160)
        case 'titoloGraziato': return lerp(-0.005, -0.02, (s - 56) / 160)
        // caratteri da manifesto: già stretti di disegno
        case 'manifesto': return lerp(0, -0.015, (s - 80) / 200)
      }
    },
    leading: (size, voce, maiuscolo) => {
      const s = size / u
      if (voce === 'etichetta') return 1.25
      if (voce === 'testo') return s <= 30 ? 1.43 : 1.35
      // i titoli si chiudono con il corpo; il tutto maiuscolo non ha discendenti
      const l = lerp(1.02, 0.88, (s - 50) / 150)
      return maiuscolo ? l - 0.06 : l
    },
  }
}
