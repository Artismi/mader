/**
 * Caricamento dei caratteri del motore designer: solo i pesi usati, da Google
 * Fonts, e si aspetta che siano pronti prima di misurare (un testo misurato
 * con il carattere di ripiego andrebbe a capo nel punto sbagliato).
 */
import type { FontSpec } from './types'

const loaded = new Map<string, Promise<void>>()

const timeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<void>(r => setTimeout(r, ms))])

const sheets = new Map<string, Promise<void>>()

/** Varianti richieste per una famiglia: [corsivo 0/1, peso], in ordine come vuole Google Fonts. */
type Variant = [0 | 1, number]
const key = (vs: Variant[]) => [...new Set(vs.map(v => v.join(',')))].sort((a, b) => (a < b ? -1 : 1))

/** Aggiunge il foglio di Google Fonts e aspetta che sia arrivato (prima i @font-face non esistono). */
function sheet(family: string, vs: Variant[]): Promise<void> {
  const tuples = key(vs).map(t => t.split(',').map(Number) as Variant).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const axis = tuples.some(t => t[0])
    ? `ital,wght@${tuples.map(t => `${t[0]},${t[1]}`).join(';')}`
    : `wght@${tuples.map(t => t[1]).join(';')}`
  const href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:${axis}&display=swap`
  if (!sheets.has(href)) {
    sheets.set(href, new Promise<void>(resolve => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.onload = () => resolve()
      link.onerror = () => resolve()
      document.head.appendChild(link)
    }))
  }
  return sheets.get(href)!
}

async function ready(family: string, [ital, weight]: Variant) {
  for (let i = 0; i < 30; i++) {
    try { await document.fonts.load(`${ital ? 'italic ' : ''}${weight} 40px "${family}"`, 'AaÈè0') } catch { /* riprova */ }
    if ([...document.fonts].some(f => f.family.replace(/["']/g, '') === family && f.status === 'loaded' && (f.style === 'italic') === !!ital)) return
    await new Promise(r => setTimeout(r, 120))
  }
}

export async function loadFonts(specs: FontSpec[]) {
  if (typeof document === 'undefined') return
  const byFamily = new Map<string, Variant[]>()
  for (const f of specs) byFamily.set(f.family, [...(byFamily.get(f.family) ?? []), [f.italic ? 1 : 0, f.weight]])
  await Promise.all([...byFamily].map(([family, vs]) => {
    const k = `${family}|${key(vs).join(';')}`
    if (!loaded.has(k)) {
      const uniq = key(vs).map(t => t.split(',').map(Number) as Variant)
      loaded.set(k, timeout(sheet(family, uniq).then(() => Promise.all(uniq.map(v => ready(family, v)))).then(() => undefined), 10000))
    }
    return loaded.get(k)!
  }))
}

export const cssFont = (f: FontSpec, size: number) => `${f.italic ? 'italic ' : ''}${f.weight} ${size}px "${f.family}"`
