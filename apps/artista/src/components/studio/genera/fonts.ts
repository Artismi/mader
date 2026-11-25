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
  // da rivista: grotesk larghi e nervosi, serif ad alto contrasto, mono da display
  syne: { family: 'Syne', weight: 800, upper: true, track: -0.03 },
  spazio: { family: 'Space Grotesk', weight: 700, track: -0.03 },
  fraunces: { family: 'Fraunces', weight: 900, track: -0.03 },
  fraunces_corsivo: { family: 'Fraunces', weight: 400, italic: true, track: -0.01 },
  giovane: { family: 'Young Serif', weight: 400, track: -0.01 },
  spalle: { family: 'Big Shoulders Display', weight: 900, upper: true, track: 0 },
  maggiore: { family: 'Major Mono Display', weight: 400, track: 0.04 },
  bricolage: { family: 'Bricolage Grotesque', weight: 800, track: -0.04 },
  // libere ma di ricerca: serif da rivista, grotesk estremi (larghissimo, strettissimo), mono e pixel
  bagnard: { family: 'Bagnard', weight: 400, track: -0.01 },
  redaction: { family: 'Redaction', weight: 400, track: -0.01 },
  redaction_corsivo: { family: 'Redaction', weight: 400, italic: true, track: -0.01 },
  gloock: { family: 'Gloock', weight: 400, track: -0.02 },
  newsreader: { family: 'Newsreader', weight: 400, italic: true, track: -0.01 },
  dmserif: { family: 'DM Serif Display', weight: 400, track: -0.02 },
  kalnia: { family: 'Kalnia', weight: 700, track: -0.02 },
  familjen: { family: 'Familjen Grotesk', weight: 700, track: -0.03 },
  schibsted: { family: 'Schibsted Grotesk', weight: 900, upper: true, track: -0.04 },
  largo: { family: 'Anybody', weight: 900, upper: true, track: -0.02 },
  stretto: { family: 'Six Caps', weight: 400, upper: true, track: 0.02 },
  bluu: { family: 'BluuNext', weight: 700, track: -0.02 },
  frammento: { family: 'Fragment Mono', weight: 400, track: 0.02 },
  marziano: { family: 'Martian Mono', weight: 400, upper: true, track: 0.06 },
  punti: { family: 'Handjet', weight: 600, upper: true, track: 0.02 },
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
    // prima i file del progetto (/fonts): si caricano sempre, anche senza rete verso Google
    const LOCALI: [string, string, number, string][] = [
      ['UnifrakturMaguntia', 'unifrakturmaguntia-latin-400-normal', 400, 'normal'], ['Pirata One', 'pirata-one-latin-400-normal', 400, 'normal'],
      ['Grenze Gotisch', 'grenze-gotisch-latin-900-normal', 900, 'normal'], ['Anton', 'anton-latin-400-normal', 400, 'normal'],
      ['Unbounded', 'unbounded-latin-900-normal', 900, 'normal'], ['Instrument Serif', 'instrument-serif-latin-400-normal', 400, 'normal'],
      ['Instrument Serif', 'instrument-serif-latin-400-italic', 400, 'italic'], ['Bodoni Moda', 'bodoni-moda-latin-900-italic', 900, 'italic'],
      ['Bodoni Moda', 'bodoni-moda-latin-400-italic', 400, 'italic'], ['Inter Tight', 'inter-tight-latin-800-normal', 800, 'normal'],
      ['Inter Tight', 'inter-tight-latin-500-normal', 500, 'normal'], ['Geist Mono', 'geist-mono-latin-500-normal', 500, 'normal'],
      ['Geist Mono', 'geist-mono-latin-400-normal', 400, 'normal'], ['Syne', 'syne-latin-800-normal', 800, 'normal'],
      ['Space Grotesk', 'space-grotesk-latin-700-normal', 700, 'normal'], ['Fraunces', 'fraunces-latin-900-normal', 900, 'normal'],
      ['Fraunces', 'fraunces-latin-400-italic', 400, 'italic'], ['Young Serif', 'young-serif-latin-400-normal', 400, 'normal'],
      ['Big Shoulders Display', 'big-shoulders-display-latin-900-normal', 900, 'normal'], ['Major Mono Display', 'major-mono-display-latin-400-normal', 400, 'normal'],
      ['Bricolage Grotesque', 'bricolage-grotesque-latin-800-normal', 800, 'normal'],
      ['Bagnard', 'bagnard-latin-400-normal', 400, 'normal'], ['Redaction', 'redaction-latin-400-normal', 400, 'normal'], ['Redaction', 'redaction-latin-400-italic', 400, 'italic'],
      ['Gloock', 'gloock-latin-400-normal', 400, 'normal'], ['Newsreader', 'newsreader-latin-400-italic', 400, 'italic'], ['DM Serif Display', 'dm-serif-display-latin-400-normal', 400, 'normal'],
      ['Kalnia', 'kalnia-latin-700-normal', 700, 'normal'], ['Familjen Grotesk', 'familjen-grotesk-latin-700-normal', 700, 'normal'], ['Schibsted Grotesk', 'schibsted-grotesk-latin-900-normal', 900, 'normal'],
      ['Anybody', 'anybody-latin-900-normal', 900, 'normal'], ['Six Caps', 'six-caps-latin-400-normal', 400, 'normal'], ['BluuNext', 'bluu-next-latin-700-normal', 700, 'normal'],
      ['Fragment Mono', 'fragment-mono-latin-400-normal', 400, 'normal'], ['Martian Mono', 'martian-mono-latin-400-normal', 400, 'normal'], ['Handjet', 'handjet-latin-600-normal', 600, 'normal'],
      ['Jacquard 24', 'jacquard-24-latin-400-normal', 400, 'normal'],
    ]
    await Promise.all(LOCALI.map(async ([fam, file, w, st]) => { try { const f = new FontFace(fam, `url(/fonts/${file}.woff2)`, { weight: String(w), style: st }); await f.load(); document.fonts.add(f) } catch { /* resta Google */ } }))
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

/** il fraktur (UnifrakturMaguntia) in tutto maiuscolo non si legge: con quel carattere il testo va in minuscolo, con l'iniziale maiuscola */
export function perCarattere(text: string, family: string): string {
  if (!/Unifraktur/i.test(family)) return text
  if (text !== text.toUpperCase()) return text
  const l = text.toLowerCase()
  return l.replace(/(^|[.!?]\s+)(\p{L})/gu, (_m, a, c) => a + c.toUpperCase())
}
