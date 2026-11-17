/**
 * Giudizio estetico di base, quello che darebbe chiunque guardando:
 * è vuota, il testo non si legge, è un pattern a caso, non dice niente,
 * è sbilanciata, è un pasticcio. Lo usano le voci interne e il pubblico.
 */
import type { Features } from '../core/types'
import type { Sheet } from '../hands/sheet'

function lum(hex: string) {
  const m = hex.replace('#', '').match(/.{2}/g)
  if (!m || m.length < 3) return 0.5
  const [r, g, b] = m.map(x => { const c = parseInt(x, 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

export interface TextRead { hasText: boolean; leggibilita: number; texts: string[] }

/** il testo si legge? contrasto col fondo (WCAG), corpo, livelli che lo coprono, fusione */
export function readability(s: Sheet): TextRead {
  const idx = s.layers.map((l, i) => [l, i] as const).filter(([l]) => l.meta)
  if (!idx.length) return { hasText: false, leggibilita: 1, texts: [] }
  const scores = idx.map(([l, i]) => {
    const m = l.meta!
    const c = Math.min(1, (ratio(m.color, s.bg) - 1) / 6)
    const size = Math.min(1, m.size / (Math.min(s.W, s.H) * 0.035))
    const above = s.layers.slice(i + 1).filter(x => x.kind !== 'grana').length
    const cover = 1 / (1 + above * 0.45)
    const blend = l.blend === 'source-over' ? 1 : 0.6
    const tilt = Math.abs(Math.sin(l.rot)) > 0.5 ? 0.7 : 1
    return c * 0.45 + size * 0.25 + cover * 0.3 * blend * tilt
  })
  return { hasText: true, leggibilita: Math.max(...scores), texts: idx.map(([l]) => l.meta!.text) }
}

export type Flaw = 'vuota' | 'illeggibile' | 'pattern a caso' | 'non dice niente' | 'sbilanciata' | 'pasticcio'

export function flaws(f: Features, t: TextRead, fit: number, toolsUsed: string[]): { flaw: Flaw; severity: number }[] {
  const out: { flaw: Flaw; severity: number }[] = []
  const dom = Math.max(f.punti ?? 0, f.linee ?? 0, f.superfici ?? 0)
  if (f.densita < 0.08 || (f.elementi < 0.04 && f.bordi < 0.05)) out.push({ flaw: 'vuota', severity: 1 - f.densita * 8 })
  if (t.hasText && t.leggibilita < 0.45) out.push({ flaw: 'illeggibile', severity: 1 - t.leggibilita })
  if (toolsUsed.includes('pattern') && f.complessita > 0.65 && dom < 0.45) out.push({ flaw: 'pattern a caso', severity: f.complessita - dom })
  if (fit < 0.45 && dom < 0.4 && f.terzi < 0.4) out.push({ flaw: 'non dice niente', severity: 0.5 + (0.45 - fit) })
  if (f.peso_quadrante > 0.6 && f.squilibrio > 0.45) out.push({ flaw: 'sbilanciata', severity: f.peso_quadrante })
  const noise = 0.45 * f.elementi + 0.35 * f.complessita + 0.25 * f.entropia - 0.5 * dom
  if (noise > 0.55) out.push({ flaw: 'pasticcio', severity: Math.min(1, noise) })
  return out.map(x => ({ ...x, severity: Math.max(0.1, Math.min(1, x.severity)) }))
}
