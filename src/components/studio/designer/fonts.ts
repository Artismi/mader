/**
 * Caricamento dei caratteri del motore designer: solo i pesi usati, da Google
 * Fonts, e si aspetta che siano pronti prima di misurare (un testo misurato
 * con il carattere di ripiego andrebbe a capo nel punto sbagliato).
 */
import type { FontSpec } from './types'

const loaded = new Map<string, Promise<void>>()

const timeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<void>(r => setTimeout(r, ms))])

const sheets = new Map<string, Promise<void>>()

/** Aggiunge il foglio di Google Fonts e aspetta che sia arrivato (prima i @font-face non esistono). */
function sheet(family: string, weights: number[]): Promise<void> {
  const href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${[...new Set(weights)].sort((a, b) => a - b).join(';')}&display=swap`
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

async function ready(family: string, weight: number) {
  for (let i = 0; i < 30; i++) {
    try { await document.fonts.load(`${weight} 40px "${family}"`, 'AaÈè0') } catch { /* riprova */ }
    if ([...document.fonts].some(f => f.family.replace(/["']/g, '') === family && f.status === 'loaded')) return
    await new Promise(r => setTimeout(r, 120))
  }
}

export async function loadFonts(specs: FontSpec[]) {
  if (typeof document === 'undefined') return
  const byFamily = new Map<string, number[]>()
  for (const f of specs) byFamily.set(f.family, [...(byFamily.get(f.family) ?? []), f.weight])
  await Promise.all([...byFamily].map(([family, weights]) => {
    const key = `${family}|${[...new Set(weights)].sort().join(',')}`
    if (!loaded.has(key)) {
      loaded.set(key, timeout(sheet(family, weights).then(() => Promise.all([...new Set(weights)].map(w => ready(family, w)))).then(() => undefined), 10000))
    }
    return loaded.get(key)!
  }))
}

export const cssFont = (f: FontSpec, size: number) => `${f.italic ? 'italic ' : ''}${f.weight} ${size}px "${f.family}"`
