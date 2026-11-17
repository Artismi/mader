/**
 * Caratteri del laboratorio: pochi, scelti, con i corsivi veri (il caricatore
 * generale del catalogo scarica solo i tondi). Un solo foglio Google Fonts.
 */
import type { Face } from './raster'

export const FACES = {
  gotico: { family: 'UnifrakturMaguntia', weight: 400 },
  pirata: { family: 'Pirata One', weight: 400 },
  grenze: { family: 'Grenze Gotisch', weight: 900 },
  condensato: { family: 'Anton', weight: 400, upper: true, track: -0.005 },
  espanso: { family: 'Unbounded', weight: 900, upper: true, track: -0.04 },
  corsivo: { family: 'Instrument Serif', weight: 400, italic: true, track: -0.02 },
  bodoni: { family: 'Bodoni Moda', weight: 900, italic: true, track: -0.03 },
  grotesk: { family: 'Inter Tight', weight: 800, upper: true, track: -0.03 },
  mono: { family: 'Geist Mono', weight: 500, upper: true, track: 0.14 },
} satisfies Record<string, Face>

export type FaceId = keyof typeof FACES

/** scelte esposte nei parametri "Carattere" */
export const DISPLAY_FACES: { id: FaceId; label: string }[] = [
  { id: 'gotico', label: 'Fraktur' }, { id: 'pirata', label: 'Gotico pirata' }, { id: 'grenze', label: 'Gotico nero' },
  { id: 'condensato', label: 'Condensato' }, { id: 'espanso', label: 'Espanso' }, { id: 'bodoni', label: 'Bodoni corsivo' },
  { id: 'corsivo', label: 'Serif corsivo' }, { id: 'grotesk', label: 'Grotesk' },
]

const HREF = 'https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Pirata+One&family=Grenze+Gotisch:wght@400;900' +
  '&family=Anton&family=Unbounded:wght@400;900&family=Instrument+Serif:ital@0;1&family=Bodoni+Moda:ital,wght@1,400;1,900' +
  '&family=Inter+Tight:wght@500;800&family=Geist+Mono:wght@400;500&display=swap'

let ready: Promise<void> | null = null

/** carica (una volta) tutti i caratteri e aspetta che siano davvero disponibili al canvas */
export function loadLabFonts(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  if (ready) return ready
  ready = (async () => {
    if (!document.getElementById('genera-fonts')) {
      const l = document.createElement('link')
      l.id = 'genera-fonts'; l.rel = 'stylesheet'; l.href = HREF
      document.head.appendChild(l)
      await new Promise<void>(res => { l.addEventListener('load', () => res(), { once: true }); l.addEventListener('error', () => res(), { once: true }); setTimeout(res, 8000) })
    }
    await Promise.all(Object.values(FACES).map(f =>
      document.fonts.load(`${'italic' in f && f.italic ? 'italic ' : ''}${f.weight} 48px "${f.family}"`).catch(() => [])))
  })()
  return ready
}
