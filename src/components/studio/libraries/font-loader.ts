/**
 * Caricamento dei caratteri del catalogo (Google Fonts e Fontshare).
 * - anteprime: un solo foglio per molte famiglie, ridotto alle lettere mostrate;
 * - uso vero: tutti i pesi disponibili del carattere scelto;
 * - quando un carattere arriva, i testi che lo usano vengono rimisurati (Fabric
 *   mette in cache le larghezze dei glifi: senza pulizia il testo resta sfasato).
 */
import * as fabric from 'fabric'
import { FONTS, type FontEntry } from './font-catalog'

const byFamily = new Map(FONTS.map(f => [f.family, f]))
export const fontEntry = (family: string): FontEntry | undefined => byFamily.get(family)

const slug = (f: string) => f.toLowerCase().replace(/\s+/g, '-')
const gq = (f: string) => f.replace(/ /g, '+')

function addCss(id: string, href: string): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  let l = document.getElementById(id) as HTMLLinkElement | null
  if (!l) {
    l = document.createElement('link')
    l.id = id; l.rel = 'stylesheet'; l.href = href
    document.head.appendChild(l)
  }
  if (l.sheet) return Promise.resolve()
  const link = l
  return new Promise(res => { link.addEventListener('load', () => res(), { once: true }); link.addEventListener('error', () => res(), { once: true }); setTimeout(res, 8000) })
}

/** il carattere è davvero arrivato? (`fonts.check` dice sì anche quando il foglio CSS non c'è ancora) */
const hasFace = (family: string) => [...document.fonts].some(f => f.family.replace(/["']/g, '') === family && f.status === 'loaded')

function fullHref(e: FontEntry) {
  if (e.source === 'fontshare') return `https://api.fontshare.com/v2/css?f[]=${slug(e.family)}@${e.weights.join(',')}&display=swap`
  const w = e.weights.length > 1 ? `:wght@${e.weights.join(';')}` : ''
  return `https://fonts.googleapis.com/css2?family=${gq(e.family)}${w}&display=swap`
}

/** carica il carattere completo e aspetta che sia pronto; false se non arriva */
const pending = new Map<string, Promise<boolean>>()
export function ensureFont(family: string, weight: number | string = 400): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false)
  const e = fontEntry(family)
  if (!e) return Promise.resolve(document.fonts.check(`${weight} 16px "${family}"`))
  const key = `${family}|${weight}`
  if (!pending.has(key)) {
    pending.set(key, (async () => {
      await addCss(`font-full-${slug(family)}`, fullHref(e))   // il foglio CSS deve prima arrivare
      for (let i = 0; i < 40; i++) {
        try { await document.fonts.load(`${weight} 40px "${family}"`) } catch { /* riprova */ }
        if (hasFace(family) && document.fonts.check(`${weight} 40px "${family}"`)) return true
        await new Promise(r => setTimeout(r, 150))
      }
      return false
    })())
  }
  return pending.get(key)!
}

/** anteprime leggere: le famiglie Google in un unico foglio, solo con le lettere necessarie */
export function loadPreviews(entries: FontEntry[], sample: string) {
  const google = entries.filter(e => e.source === 'google')
  for (let i = 0; i < google.length; i += 20) {
    const chunk = google.slice(i, i + 20)
    const text = encodeURIComponent([...new Set((sample + chunk.map(c => c.family).join('')).split(''))].join(''))
    addCss(`font-prev-${chunk.map(c => slug(c.family)).join('_').slice(0, 120)}`,
      `https://fonts.googleapis.com/css2?${chunk.map(c => `family=${gq(c.family)}`).join('&')}&text=${text}&display=swap`)
  }
  for (const e of entries.filter(e => e.source === 'fontshare')) addCss(`font-full-${slug(e.family)}`, fullHref(e))
}

/** dopo il caricamento: misure nuove per i testi che usano il carattere */
export function refreshTexts(canvas: fabric.Canvas | null | undefined, family?: string) {
  if (!canvas) return
  const fc = (fabric as unknown as { cache?: { clearFontCache?: (f?: string) => void } }).cache
  fc?.clearFontCache?.(family)
  const visit = (o: fabric.FabricObject) => {
    if (o instanceof fabric.IText || o instanceof fabric.Text) {
      if (!family || (o as fabric.Text).fontFamily === family) { (o as fabric.Text).initDimensions(); o.setCoords(); o.set('dirty', true) }
    }
    if (o instanceof fabric.Group) o.getObjects().forEach(visit)
  }
  canvas.getObjects().forEach(visit)
  canvas.requestRenderAll()
}

/** ogni testo che entra nel canvas (anche da un progetto salvato) carica il suo carattere */
export function watchCanvasFonts(canvas: fabric.Canvas) {
  const onAdded = (e: { target: fabric.FabricObject }) => {
    const visit = (o: fabric.FabricObject) => {
      if (o instanceof fabric.Text && o.fontFamily) {
        const fam = String(o.fontFamily).split(',')[0].replace(/["']/g, '').trim()
        if (fontEntry(fam)) ensureFont(fam, o.fontWeight ?? 400).then(ok => { if (ok) refreshTexts(canvas, fam) })
      }
      if (o instanceof fabric.Group) o.getObjects().forEach(visit)
    }
    visit(e.target)
  }
  canvas.on('object:added', onAdded)
  return () => canvas.off('object:added', onAdded)
}

export const WEIGHT_NAMES: Record<number, string> = { 100: 'Sottile', 200: 'Extra leggero', 300: 'Leggero', 400: 'Normale', 500: 'Medio', 600: 'Semigrassetto', 700: 'Grassetto', 800: 'Extra grassetto', 900: 'Nero' }

/** abbinamenti titolo + testo, scelti per contrasto e armonia */
export const PAIRINGS: { title: string; body: string; mood: string }[] = [
  { title: 'Clash Display', body: 'Satoshi', mood: 'contemporaneo' },
  { title: 'Instrument Serif', body: 'Instrument Sans', mood: 'editoriale pulito' },
  { title: 'Fraunces', body: 'Inter', mood: 'caldo e leggibile' },
  { title: 'Bodoni Moda', body: 'Manrope', mood: 'moda e lusso' },
  { title: 'Syne', body: 'Space Grotesk', mood: 'creativo tecnico' },
  { title: 'Unbounded', body: 'Onest', mood: 'brand giovane' },
  { title: 'Cabinet Grotesk', body: 'Zodiak', mood: 'studio di design' },
  { title: 'Gambetta', body: 'General Sans', mood: 'rivista' },
  { title: 'Bricolage Grotesque', body: 'Hanken Grotesk', mood: 'amichevole' },
  { title: 'Gloock', body: 'Figtree', mood: 'raffinato' },
  { title: 'Big Shoulders Display', body: 'IBM Plex Mono', mood: 'industriale' },
  { title: 'Newsreader', body: 'Geist', mood: 'giornalistico' },
  { title: 'Archivo Black', body: 'Archivo', mood: 'manifesto' },
  { title: 'Panchang', body: 'Switzer', mood: 'architettura' },
  { title: 'Playfair Display', body: 'Work Sans', mood: 'classico' },
  { title: 'Tanker', body: 'Supreme', mood: 'poster urlato' },
  { title: 'Krona One', body: 'Inter Tight', mood: 'tech largo' },
  { title: 'Italiana', body: 'Jost', mood: 'boutique' },
]
