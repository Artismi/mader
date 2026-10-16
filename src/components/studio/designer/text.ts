/**
 * Misura e impaginazione del testo con i caratteri veri: a capo bilanciato per i
 * titoli (righe di lunghezza simile, come farebbe un designer), a capo normale
 * per i paragrafi, e la dimensione più grande che sta nello spazio dato.
 */
import type { FontSpec } from './types'
import { cssFont } from './fonts'

let ctx: CanvasRenderingContext2D | null = null
function c2d() {
  if (!ctx) ctx = document.createElement('canvas').getContext('2d')!
  return ctx
}

/** Larghezza di una riga, spaziatura compresa (tracking in em). */
export function lineWidth(text: string, font: FontSpec, size: number, tracking = 0) {
  const c = c2d()
  c.font = cssFont(font, size)
  return c.measureText(text).width + Math.max(0, text.length - 1) * tracking * size
}

/**
 * Inchiostro vero di una riga (misura del canvas, gli stessi caratteri del render):
 * quanto sporge a sinistra dell'origine, fin dove arriva a destra, sopra e sotto la linea di base.
 */
export function inkLine(text: string, font: FontSpec, size: number, tracking = 0) {
  const c = c2d()
  c.font = cssFont(font, size)
  const m = c.measureText(text), extra = Math.max(0, text.length - 1) * tracking * size
  return { l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight + extra, a: m.actualBoundingBoxAscent, d: m.actualBoundingBoxDescent, w: m.width + extra }
}

/** Altezza di un blocco come la disegna Fabric (prima riga 1.13 em, poi l'interlinea). */
export const blockHeight = (size: number, lines: number, leading: number) =>
  lines <= 0 ? 0 : size * 1.13 + (lines - 1) * size * leading

function greedy(words: string[], font: FontSpec, size: number, maxW: number, tracking: number): string[] | null {
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (lineWidth(next, font, size, tracking) <= maxW) cur = next
    else {
      if (!cur) return null // una parola sola non entra
      lines.push(cur)
      if (lineWidth(w, font, size, tracking) > maxW) return null
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

/** Divide in k righe minimizzando la riga più lunga (titoli bilanciati). */
function balanced(words: string[], k: number, font: FontSpec, size: number, tracking: number): string[] {
  const n = words.length
  if (k >= n) return words.slice()
  const W = (i: number, j: number) => lineWidth(words.slice(i, j).join(' '), font, size, tracking)
  // best[j][r] = larghezza massima minima per le prime j parole in r righe
  const best: number[][] = Array.from({ length: n + 1 }, () => Array(k + 1).fill(Infinity))
  const cut: number[][] = Array.from({ length: n + 1 }, () => Array(k + 1).fill(0))
  best[0][0] = 0
  for (let j = 1; j <= n; j++) {
    for (let r = 1; r <= Math.min(k, j); r++) {
      for (let i = r - 1; i < j; i++) {
        const v = Math.max(best[i][r - 1], W(i, j))
        if (v < best[j][r]) { best[j][r] = v; cut[j][r] = i }
      }
    }
  }
  const lines: string[] = []
  let j = n
  for (let r = k; r > 0; r--) { const i = cut[j][r]; lines.unshift(words.slice(i, j).join(' ')); j = i }
  return lines
}

/** Parole che in italiano non si lasciano a fine riga: articoli, preposizioni, congiunzioni brevi. */
const STOP = new Set(['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', "l'", "un'", 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
  'e', 'ed', 'o', 'ma', 'che', 'se', 'del', 'dello', 'della', 'dei', 'degli', 'delle', 'al', 'allo', 'alla', 'ai', 'agli', 'alle',
  'dal', 'dalla', 'dai', 'nel', 'nello', 'nella', 'nei', 'negli', 'nelle', 'sul', 'sulla', 'sui', 'non', 'ogni', 'the', 'a', 'of', 'and'])
const isStop = (w: string) => STOP.has(w.toLowerCase().replace(/[^\p{L}']/gu, '')) || /^[\p{L}]'$/u.test(w)

/** Sposta a capo le parole deboli rimaste in fondo alla riga, se la riga dopo le accoglie. */
function fixStops(lines: string[], font: FontSpec, size: number, maxW: number, tracking: number): string[] {
  const out = lines.slice()
  for (let i = 0; i < out.length - 1; i++) {
    const ws = out[i].split(' ')
    if (ws.length < 2 || !isStop(ws[ws.length - 1])) continue
    const moved = `${ws[ws.length - 1]} ${out[i + 1]}`
    if (lineWidth(moved, font, size, tracking) <= maxW) { out[i] = ws.slice(0, -1).join(' '); out[i + 1] = moved }
  }
  return out
}

export interface FitOpts {
  text: string
  font: FontSpec
  maxW: number
  maxH?: number
  maxSize: number
  minSize: number
  maxLines: number
  leading: number
  tracking?: number
  upper?: boolean
  /** a capo bilanciato (titoli) invece di riempire le righe (paragrafi) */
  balance?: boolean
}

/** Risultato: corpo, righe e misure; interlinea e spaziatura usate (da riusare quando si piazza il testo). */
export interface Fit { size: number; lines: string[]; h: number; w: number; leading?: number; tracking?: number }

/** La dimensione più grande (a passi di ~3%) con cui il testo sta nello spazio; null se non sta nemmeno al minimo. */
export function fit(o: FitOpts): Fit | null {
  const text = (o.upper ? o.text.toUpperCase() : o.text).trim()
  if (!text) return null
  const tracking = o.tracking ?? 0
  const paragraphs = text.split(/\n+/).map(p => p.split(/\s+/).filter(Boolean))
  const sizes: number[] = []
  for (let s = Math.round(o.maxSize); s > o.minSize; s = Math.floor(s * 0.97)) sizes.push(s)
  sizes.push(Math.round(o.minSize))
  for (const s of sizes) {
    const lines: string[] = []
    let ok = true
    for (const words of paragraphs) {
      const g = greedy(words, o.font, s, o.maxW, tracking)
      if (!g) { ok = false; break }
      let ls = g
      if (g.length > 1) {
        // titoli sempre bilanciati; i paragrafi solo se l'ultima riga resterebbe una vedova
        const last = lineWidth(g[g.length - 1], o.font, s, tracking), widest = Math.max(...g.map(l => lineWidth(l, o.font, s, tracking)))
        if (o.balance || last < widest * 0.35 || !g[g.length - 1].includes(' ')) ls = balanced(words, g.length, o.font, s, tracking)
        ls = fixStops(ls, o.font, s, o.maxW, tracking)
      }
      lines.push(...ls)
    }
    if (!ok || lines.length > o.maxLines) continue
    const h = blockHeight(s, lines.length, o.leading)
    if (o.maxH !== undefined && h > o.maxH) continue
    const w = Math.max(...lines.map(l => lineWidth(l, o.font, s, tracking)))
    return { size: s, lines, h, w, leading: o.leading, tracking }
  }
  return null
}
