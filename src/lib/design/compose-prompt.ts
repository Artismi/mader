/**
 * Descrizione del tool composeDesign per il modello: stili, impaginazioni,
 * formati, effetti, filtri e caratteri realmente disponibili nello Studio.
 * Generata dagli stessi cataloghi usati dal motore, così non va mai fuori sync.
 */
import { FORMATS, LAYOUTS, STYLES } from './compose-spec'
import { FX_DEFS, LOOKS } from '@/components/studio/fx/catalog'
import { FONTS, FONT_CATS } from '@/components/studio/libraries/font-catalog'

const TITLE_FX = ['material3d', 'genFill', 'neon', 'extrude', 'longShadow', 'echo', 'splice', 'hollow', 'gradientOverlay', 'stroke', 'dropShadow', 'glitch', 'riso', 'halftone', 'outerGlow', 'bevel', 'textureOverlay']
const IMAGE_FX = ['gradientMap', 'halftone', 'riso', 'screenprint', 'dither', 'posterize', 'tiltShift', 'chroma', 'vhs', 'lightLeak', 'bloom', 'mosaic']

const fxLine = (id: string) => {
  const d = FX_DEFS.find(f => f.id === id)
  return d ? `${id} (${d.label}: ${d.variants.map(v => v.id).join(', ')})` : ''
}

export function composeToolDescription() {
  const styles = STYLES.map(s => `- ${s.id}: ${s.mood} [caratteri ${s.display.family} + ${s.text.family}; palette 0..${s.palettes.length - 1}]`).join('\n')
  const layouts = LAYOUTS.map(l => `- ${l.id}: ${l.use}${l.needsImage ? ' (serve image)' : ''}`).join('\n')
  const formats = Object.entries(FORMATS).map(([k, f]) => `${k} ${f.w}×${f.h} (${f.label})`).join(', ')
  const looks = LOOKS.map(l => l.id).join(', ')
  const genFill = FX_DEFS.find(f => f.id === 'genFill')!.variants.map(v => v.id).join(', ')
  const fonts = FONT_CATS.map(c => `${c.label}: ${FONTS.filter(f => f.cat === c.id && f.source === 'google').slice(0, 9).map(f => f.family).join(', ')}`).join('\n')

  return `Crea grafiche impaginate da professionista. TU scegli formato, direzione artistica, impaginazione e scrivi i contenuti; lo Studio calcola margini, griglia a 12 colonne, scala tipografica, adattamento del titolo, contrasto, decorazioni ed effetti. Ogni pezzo resta modificabile dall'utente. Preferisci SEMPRE questo tool a createDesignBoards per creare grafiche nuove (post, storie, poster, copertine, slide, banner, inviti, caroselli).

COME SCRIVERE BENE
- Titoli brevi e forti: 2-7 parole (per "gigante" 1-4 parole). Mai frasi lunghe nel titolo.
- Occhiello (eyebrow) 1-4 parole, sottotitolo una frase, testo (body) solo dove serve (rivista).
- meta: 1-4 informazioni brevi (data, luogo, sito, numero) — finiscono in testata e piede.
- Usa contenuti veri della richiesta; non inventare dati, prezzi o date se non ci sono.
- Carosello/slide: una tavola per pagina, stesso stile e palette, impaginazioni che variano con ritmo (es. gigante → elenco → numeri → citazione → eroe con cta).
- Lascia lo stile scegliere effetti e caratteri (titleEffect "stile") salvo richieste precise.

FORMATI (format): ${formats}

STILI (style):
${styles}

IMPAGINAZIONI (layout):
${layouts}

IMMAGINI: content.image.url (da generateAIImage) oppure content.image.prompt (prompt fotografico in inglese, generata in automatico). Senza immagine non usare diviso/copertina/galleria.

EFFETTO TITOLO (titleEffect): "stile" | "nessuno" | "id:variante" tra
${TITLE_FX.map(fxLine).filter(Boolean).join('\n')}

FILTRI FOTO (imageLook): ${looks}
EFFETTO FOTO (imageEffect): "id:variante" tra ${IMAGE_FX.map(fxLine).filter(Boolean).join('; ')}
SFONDO (background): "stile" | "tinta" | variante generativa: ${genFill}
DECORAZIONI (decor, facoltativo): folio, columns, crop, frame, bauhaus, blob, ticker, index, badge (serve content.badge), orbs, dots, bars. noDecor:true per toglierle.

CARATTERI (displayFont / textFont, facoltativi — nomi esatti):
${fonts}`
}
