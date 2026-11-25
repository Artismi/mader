/**
 * Crescite che cercano lo spazio (space colonization, Runions 2007): una nuvola di punti "nutrimento",
 * i rami crescono verso quelli vicini e li consumano. Lo spessore si somma dalle punte al tronco
 * (modello a tubi: d^2.4 del padre = somma dei figli), il tratto trema appena e sfuma come inchiostro.
 * Quattro nature: albero (chioma), radice (verso il basso), corallo (ventaglio), rizoma (più origini, orizzontale).
 */
import { newCanvas } from './sheet'

export type Natura = 'albero' | 'radice' | 'corallo' | 'rizoma'
export const NATURE: Natura[] = ['albero', 'radice', 'corallo', 'rizoma']

export function disegnaAlbero(seme: number, colore: string, S = 900, natura?: Natura, fino = 1, tentativo = 0): HTMLCanvasElement {
  let a = seme >>> 0
  const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
  const nat = natura ?? NATURE[Math.floor(r() * NATURE.length)]
  const nA = nat === 'rizoma' ? 1000 : 800 + Math.floor(r() * 300)
  const A: [number, number][] = []
  for (let i = 0; i < nA; i++) {
    let x = 0, y = 0
    if (nat === 'albero') { const t = r() * Math.PI * 2, q = Math.sqrt(r()); x = 0.5 + Math.cos(t) * q * (0.3 + r() * 0.08); y = 0.36 + Math.sin(t) * q * 0.26 }
    else if (nat === 'radice') { const t = r() * Math.PI, q = Math.sqrt(r()); x = 0.5 + Math.cos(t) * q * 0.42; y = 0.2 + Math.sin(t) * q * 0.7 }
    else if (nat === 'corallo') { const t = Math.PI + r() * Math.PI, q = 0.25 + Math.sqrt(r()) * 0.6; x = 0.5 + Math.cos(t) * q * 0.55; y = 0.88 + Math.sin(t) * q * 0.85 }
    else { x = 0.06 + r() * 0.88; y = 0.5 + (r() - 0.5) * (0.25 + 0.3 * Math.abs(Math.sin(x * 7 + seme))) }
    A.push([x, y])
  }
  // le origini
  const N: { x: number; y: number; p: number; dx: number; dy: number; n: number; f: number }[] = []
  const radici: [number, number][] = nat === 'albero' ? [[0.5, 0.96]] : nat === 'radice' ? [[0.5, 0.08]] : nat === 'corallo' ? [[0.5, 0.92]] : [[0.08, 0.5], [0.5, 0.5 + (r() - 0.5) * 0.1], [0.92, 0.5]]
  for (const [x, y] of radici) N.push({ x, y, p: -1, dx: 0, dy: 0, n: 0, f: 0 })
  const passo = nat === 'corallo' ? 0.008 : 0.009, D = 0.2, K = passo * 1.6
  // il tronco sale finché non trova nutrimento
  for (let k = 0; k < 120 && nat !== 'rizoma'; k++) {
    const u = N[N.length - 1]
    if (A.some(([x, y]) => Math.hypot(x - u.x, y - u.y) < D)) break
    const dir = nat === 'radice' ? 1 : -1
    N.push({ x: u.x + (r() - 0.5) * passo * 0.6, y: u.y + dir * passo, p: N.length - 1, dx: 0, dy: 0, n: 0, f: 0 })
  }
  const vivi = A.map(() => true)
  for (let it = 0; it < 320; it++) {
    for (const u of N) { u.dx = 0; u.dy = 0; u.n = 0 }
    let crescono = 0
    for (let i = 0; i < A.length; i++) {
      if (!vivi[i]) continue
      let best = -1, bd = D
      for (let j = 0; j < N.length; j++) { const d = Math.hypot(A[i][0] - N[j].x, A[i][1] - N[j].y); if (d < bd) { bd = d; best = j } }
      if (best < 0) continue
      if (bd < K) { vivi[i] = false; continue }
      const u = N[best]; u.dx += (A[i][0] - u.x) / bd; u.dy += (A[i][1] - u.y) / bd; u.n++
    }
    const nuovi: typeof N = []
    for (let j = 0; j < N.length; j++) {
      const u = N[j]; if (!u.n) continue
      // un poco di tropismo: l'albero cerca la luce, la radice il basso, il rizoma resta orizzontale
      const tx = 0, ty = nat === 'albero' ? -0.25 : nat === 'radice' ? 0.35 : nat === 'corallo' ? -0.15 : 0
      let dx = u.dx / u.n + tx + (r() - 0.5) * 0.35, dy = u.dy / u.n + ty + (r() - 0.5) * 0.35
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l
      nuovi.push({ x: u.x + dx * passo, y: u.y + dy * passo, p: j, dx: 0, dy: 0, n: 0, f: 0 }); crescono++
    }
    N.push(...nuovi)
    if (!crescono || N.length > 4200) break
  }
  // se non è cresciuto (il nutrimento era troppo lontano), si riprova con un altro seme
  if (N.length < 150 && tentativo < 3) return disegnaAlbero(seme * 7 + 13, colore, S, natura, fino, tentativo + 1)
  // lo spessore: dalle punte al tronco
  const figli = N.map(() => 0)
  for (let j = N.length - 1; j >= 0; j--) { const u = N[j]; u.f = Math.max(1, u.f); if (u.p >= 0) N[u.p].f = (N[u.p].f ** 2.4 + u.f ** 2.4) ** (1 / 2.4); if (u.p >= 0) figli[u.p]++ }
  const cv = newCanvas(S, S), g = cv.getContext('2d')!
  const w0 = S * (nat === 'corallo' ? 0.0026 : 0.002)
  const disegna = (alpha: number, extra: number) => {
    g.globalAlpha = alpha; g.strokeStyle = colore; g.lineCap = 'round'
    for (let j = 0; j < N.length; j++) {
      const u = N[j]; if (u.p < 0) continue
      if (fino < 1 && j > N.length * fino) break
      const v = N[u.p], w = w0 * Math.pow(u.f, 0.75) + extra
      g.lineWidth = Math.min(S * 0.05, w)
      g.beginPath(); g.moveTo(v.x * S, v.y * S); g.lineTo(u.x * S, u.y * S); g.stroke()
    }
  }
  // l'inchiostro che si allarga appena sotto, poi il tratto
  g.filter = `blur(${Math.max(1, S * 0.0025)}px)`; disegna(0.25, S * 0.002); g.filter = 'none'
  disegna(1, 0)
  // le punte: un granello dove il ramo si ferma
  g.globalAlpha = 0.85; g.fillStyle = colore
  for (let j = 0; j < N.length; j++) if (!figli[j] && r() < (nat === 'corallo' ? 0.5 : 0.18)) { g.beginPath(); g.arc(N[j].x * S, N[j].y * S, S * (0.0015 + r() * 0.002), 0, 6.283); g.fill() }
  g.globalAlpha = 1
  return cv
}
