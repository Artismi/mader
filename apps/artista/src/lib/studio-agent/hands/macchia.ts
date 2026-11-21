/**
 * La macchia: un segno organico, a metà tra una macchia di caffè o d'inchiostro e una muffa, un batterio.
 * Nessuna simmetria, nessuna ripetizione: un bordo irregolare (rumore frattale), l'anello scuro dove il liquido
 * si è asciugato, la pelle interna che si addensa e si schiarisce, gocce satellite, sbavature; poi la vita che ci cresce
 * sopra: colonie tonde con il loro bordo, ife che si ramificano dal margine verso fuori.
 * I parametri (quanto è macchia, quanto è muffa, quanto si espande) nascono dal concetto e si evolvono col segno.
 */
import { newCanvas } from './sheet'
import { disegnaMuffa } from './muffa'

export interface Macchia { seme: number; muffa: number; anello: number; satelliti: number; lobi: number; espansione: number; rete?: number }

function rng(seed: number) { let a = seed >>> 0 || 1; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296) }

export const macchiaDa = (seme: number): Macchia => {
  const r = rng(seme)
  return { seme, muffa: r(), anello: 0.3 + r() * 0.7, satelliti: Math.floor(r() * 9), lobi: 2 + r() * 5, espansione: r(), rete: r() }
}

/** disegna la macchia: è muffa vera (micelio, batteri, zonazione, incontri, l'alone del caffè) — vedi muffa.ts */
export function disegnaMacchia(m: Macchia, colore: string, S = 560): HTMLCanvasElement {
  return disegnaMuffa(m.seme, colore, S)
}

/** l'occhio sui segni: boccia la ripetizione (tassellature), il radiale vuoto (un anello sottile e niente dentro), il segno senza massa */
export function segnoBocciato(cv: HTMLCanvasElement): string | null {
  const N = 64, t = newCanvas(N, N), g = t.getContext('2d', { willReadFrequently: true })!; g.drawImage(cv, 0, 0, N, N)
  const d = g.getImageData(0, 0, N, N).data, a = new Float32Array(N * N)
  let tot = 0; for (let i = 0; i < N * N; i++) { a[i] = d[i * 4 + 3] / 255; tot += a[i] }
  const massa = tot / (N * N)
  if (massa < 0.035) return 'senza massa'
  // ripetizione: la somiglianza dell'immagine con se stessa spostata (oltre un ottavo del lato), al massimo su tutti gli spostamenti
  const media = tot / (N * N); let v0 = 0; for (let i = 0; i < N * N; i++) v0 += (a[i] - media) ** 2
  let auto = 0
  for (let sy = 0; sy < N / 2; sy += 2) for (let sx = 0; sx < N / 2; sx += 2) {
    if (Math.hypot(sx, sy) < N / 7) continue
    let c = 0; for (let y = 0; y < N - sy; y++) for (let x = 0; x < N - sx; x++) c += (a[y * N + x] - media) * (a[(y + sy) * N + x + sx] - media)
    auto = Math.max(auto, (c / ((N - sx) * (N - sy))) / (v0 / (N * N) || 1))
  }
  if (auto > 0.55) return 'ripetizione'
  // radiale vuoto: la massa sta tutta su un anello sottile attorno al centro, dentro non c'è niente
  let cx = 0, cy = 0; for (let i = 0; i < N * N; i++) { cx += (i % N) * a[i]; cy += ((i / N) | 0) * a[i] }
  cx /= tot; cy /= tot
  const anelli = new Float32Array(N); for (let i = 0; i < N * N; i++) { const rr = Math.min(N - 1, Math.round(Math.hypot((i % N) - cx, ((i / N) | 0) - cy))); anelli[rr] += a[i] }
  const picco = Math.max(...anelli), dove = anelli.indexOf(picco), vicino = anelli.slice(Math.max(0, dove - 3), dove + 4).reduce((x, y) => x + y, 0)
  if (vicino / tot > 0.6 && dove > N * 0.2 && massa < 0.15) return 'anello vuoto'
  return null
}

