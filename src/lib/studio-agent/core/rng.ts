/** Caso con seme: ogni giornata è riproducibile dal suo seme, ma due giornate non sono mai uguali. */
export type Rnd = () => number

export function rng(seed: number): Rnd {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const pick = <T,>(r: Rnd, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]
export const range = (r: Rnd, a: number, b: number) => a + r() * (b - a)
export const chance = (r: Rnd, p: number) => r() < p
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))

export function gauss(r: Rnd) {
  const u = Math.max(1e-9, r()), v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** scelta pesata; la temperatura appiattisce (alta) o accentua (bassa) le differenze */
export function weighted<T>(r: Rnd, items: readonly T[], w: (x: T) => number, temperature = 1): T {
  const t = Math.max(0.05, temperature)
  const ws = items.map(x => Math.pow(Math.max(1e-6, w(x)), 1 / t))
  const tot = ws.reduce((a, b) => a + b, 0)
  let x = r() * tot
  for (let i = 0; i < items.length; i++) { x -= ws[i]; if (x <= 0) return items[i] }
  return items[items.length - 1]
}

export function shuffle<T>(r: Rnd, arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)
