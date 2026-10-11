/**
 * Descrizione del tool composeDesign per il modello: stili, impaginazioni,
 * formati, effetti, filtri e caratteri realmente disponibili nello Studio.
 * Generata dagli stessi cataloghi usati dal motore, così non va mai fuori sync.
 */
import { FORMATS, LAYOUTS, STYLES } from './compose-spec'
import { FX_DEFS, LOOKS } from '@/components/studio/fx/catalog'
import { FONTS, FONT_CATS } from '@/components/studio/libraries/font-catalog'
import { TEXT_STYLES } from '@/components/studio/fx/text-styles'

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
  const fonts = FONT_CATS.map(c => `${c.label}: ${FONTS.filter(f => f.cat === c.id && f.source !== 'fontshare').slice(0, 10).map(f => f.family).join(', ')}`).join('\n')

  return `Crea grafiche impaginate da professionista. TU scegli formato, direzione artistica, impaginazione e scrivi i contenuti; lo Studio calcola margini, griglia a 12 colonne, scala tipografica, adattamento del titolo, contrasto, decorazioni ed effetti. Ogni pezzo resta modificabile dall'utente. Preferisci SEMPRE questo tool a createDesignBoards per creare grafiche nuove (post, storie, poster, copertine, slide, banner, inviti, caroselli).

LAVORA DA ART DIRECTOR, NON FARE IL MINIMO
- Una grafica professionale ha più livelli di lettura: occhiello, titolo, sottotitolo, informazioni di servizio, firma del marchio, un dettaglio che incuriosisce. Compila SEMPRE: eyebrow, title, subtitle, brand, meta (2-4 voci), e quando ha senso anche badge (2-3 parole d'impatto: "Novità", "Edizione 01", "Solo online"), tags (2-5 etichette brevi), cta, body.
- Usa i dati della richiesta. Dove mancano, usa etichette editoriali generiche e plausibili ("Collezione 2026", "Vol. 01", "Studio", il nome del cliente) — mai prezzi, date, indirizzi o numeri inventati.
- density: "ricco" di norma, "massimo" per poster, lanci, eventi, copertine; "essenziale" solo se l'utente chiede pulizia estrema.
- decor: aggiungi interventi coerenti oltre a quelli dello stile (es. ghost, vertical, sticker, scribble, starburst, shape3d, halftoneDisc, arrow, barcode, registration, offset).
- Più formati: per una richiesta generica consegna la tavola principale e il suo adattamento storia 9:16 nello stesso stile (con impaginazione adatta), salvo che l'utente chieda un solo formato.
- Caroselli e presentazioni: 5-7 tavole con ritmo (apertura gigante o copertina → contenuti con elenco/numeri/citazione → chiusura con cta), stesso stile e palette.
- Immagini: se il soggetto si può fotografare o illustrare, metti content.image.prompt (in inglese, dettagliato: soggetto, luce, obiettivo, mood, palette coerente con lo stile) e usa diviso, copertina o galleria almeno in una tavola.

TESTI
- Titoli brevi e forti: 2-7 parole (per "gigante" 1-4 parole). Mai frasi lunghe nel titolo.
- Occhiello 1-4 parole, sottotitolo una frase, testo (body) solo dove serve (rivista).
- Lascia lo stile scegliere effetti e caratteri (titleEffect "stile") salvo richieste precise.

FORMATI (format): ${formats}

STILI (style):
${styles}

IMPAGINAZIONI (layout):
${layouts}

IMMAGINI: content.image.url (da generateAIImage) oppure content.image.prompt (prompt fotografico in inglese, generata in automatico). Senza immagine non usare diviso/copertina/galleria.

STILI TESTO COMPLETI (titleEffect "stile-testo:id", il titolo prende gli effetti calibrati dello stile; conviene usare anche displayFont dello stile): ${TEXT_STYLES.map(t => `${t.id} (${t.label}, carattere ${t.family})`).join('; ')}

EFFETTO TITOLO (titleEffect): "stile" | "nessuno" | "stile-testo:id" | "id:variante" tra
${TITLE_FX.map(fxLine).filter(Boolean).join('\n')}

FILTRI FOTO (imageLook): ${looks}
EFFETTO FOTO (imageEffect): "id:variante" tra ${IMAGE_FX.map(fxLine).filter(Boolean).join('; ')}
SFONDO (background): "stile" | "tinta" | variante generativa: ${genFill}
INTERVENTI (decor): folio (testata e piede), columns (griglia), crop (segni di taglio), frame (cornice), bauhaus (geometrie al vivo), blob (forme organiche), ticker (fascia scorrevole), index (numero grande vuoto), badge/sticker (bollino o adesivo, serve content.badge), orbs (luci), dots (trama), bars (strisce), ghost (parola gigante al vivo), vertical (testo verticale nel margine), scribble (sottolineatura a mano), starburst (scintille), shape3d (oggetto 3D protagonista senza foto), halftoneDisc (disco retinato), arrow (freccia verso l'azione), barcode (codice a barre), registration (segni di registro), offset (blocco colore dietro la foto). noDecor:true per toglierli tutti.

CARATTERI (displayFont / textFont, facoltativi — nomi esatti):
${fonts}`
}
