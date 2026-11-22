/**
 * I mondi: la camera dei pattern (sezioni di un universo possibile, da sole o ripetute a caleidoscopio)
 * e il Cristallo (una pallina che corre in un cristallo e lascia una linea). I sorgenti vengono dal
 * progetto «pattern» e dal ramo «pattern-cristallo» di stateyour, copiati in hands/camera e hands/cristallo.
 *
 * Qui stanno solo gli agganci: cercare un indirizzo bello, e disegnarlo come inchiostro (alfa) su un
 * canvas trasparente, cresciuto fino a `crescita` (0..1). La veste (colore, luce, grana) la mette veste.ts.
 * Simulazioni e disegni pieni stanno in cache: nel reel ogni fotogramma ridisegna solo la soglia di crescita.
 */
import { newCanvas } from './sheet'
import { cercaSezione } from './camera/cercatore.js'
import { universo } from './camera/cosmo/biblioteca.js'
import { simulaMondo } from './camera/cosmo/mondo.js'
import { segmentiSezione } from './camera/cosmo/sezione.js'
import { motivo } from './camera/pattern.js'
import { creaSorgente } from './cristallo/motore.js'
import { creaFinestra, creaProiettore } from './cristallo/finestra.js'
import { casuale } from './cristallo/indirizzo.js'

export type TipoMondo = 'camera' | 'cristallo'
export interface IndCamera { tipo: 'camera'; numero: number; finestra: { centro: [number, number]; lato: number }; vista: Record<string, number>; sezione: { fine: number; durata: number }; ripeti: { gruppo: string; angolo: number }; bellezza: number }
export interface IndCristallo { tipo: 'cristallo'; k: number; vista: 'tessera' | 'viaggio'; bellezza: number }
export type Indirizzo = IndCamera | IndCristallo
export interface Opzioni { S?: number; colore?: string; crescita?: number; spessore?: number }

const chiave = (x: unknown) => JSON.stringify(x)
function ricorda<T>(m: Map<string, T>, k: string, fai: () => T, max = 6): T {
  const v = m.get(k); if (v !== undefined) { m.delete(k); m.set(k, v); return v }
  const n = fai(); m.set(k, n); if (m.size > max) m.delete(m.keys().next().value as string); return n
}

// ── la camera ──

/** cerca una sezione bella: a volte la finestra da sola, a volte ripetuta a caleidoscopio */
export function cercaCamera(r: () => number, caleido = r() < 0.75): IndCamera {
  const m = cercaSezione({ da: 1 + Math.floor(r() * 4e6), universi: 4, inquadrature: 12, seme: 1 + Math.floor(r() * 1e6), gruppo: caleido ? 'caleidoscopio' : null })
  // la finestra da sola regge solo se è davvero ordinata: altrimenti la si ripete
  if (!caleido && m.bellezza.totale < 0.2) return cercaCamera(r, true)
  return { tipo: 'camera', numero: m.numero, finestra: m.finestra, vista: m.vista, sezione: m.sezione, ripeti: m.ripeti, bellezza: m.bellezza.totale }
}

const segCamera = new Map<string, { seg: number[][]; maxi: Map<number, [number, number]>; reticolo: { a: [number, number]; b: [number, number] } | null; centro: [number, number]; vista: number }>()
function pezziCamera(ind: IndCamera) {
  return ricorda(segCamera, chiave(ind), () => {
    const cella = universo(ind.numero).cella, tracce = simulaMondo(cella)
    const grezzi = segmentiSezione(tracce, { ...cella, finestra: ind.finestra, vista: ind.vista, sezione: ind.sezione })
    const L = ind.finestra.lato
    const M = ind.ripeti.gruppo === 'una' ? null : motivo(grezzi, ind.ripeti, L)
    const seg = M ? M.segmenti : grezzi
    const maxi = new Map<number, [number, number]>(); for (const s of seg) { const m = maxi.get(s[5]); maxi.set(s[5], m ? [Math.min(m[0], s[6]), Math.max(m[1], s[6])] : [s[6], s[6]]) }
    // quanto piano si vede: la finestra intera, oppure circa tre celle del motivo
    const vista = M?.reticolo ? 3 * Math.hypot(...M.reticolo.a) : L
    return { seg, maxi, reticolo: M?.reticolo ?? null, centro: M ? M.centro : [L / 2, L / 2] as [number, number], vista }
  })
}

export function disegnaCamera(ind: IndCamera, o: Opzioni = {}): HTMLCanvasElement {
  const S = o.S ?? 900, cr = o.crescita ?? 1, cv = newCanvas(S, S), g = cv.getContext('2d')!
  const P = pezziCamera(ind), k = S / P.vista, ox = S / 2 - P.centro[0] * k, oy = S / 2 - P.centro[1] * k
  const offs: [number, number][] = [[0, 0]]
  if (P.reticolo) {
    offs.length = 0
    const { a, b } = P.reticolo, n = Math.ceil(P.vista / Math.min(Math.hypot(...a), Math.hypot(...b))) + 2
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const dx = i * a[0] + j * b[0], dy = i * a[1] + j * b[1]
      if (Math.abs(dx) < P.vista * 1.2 && Math.abs(dy) < P.vista * 1.2) offs.push([dx, dy])
    }
  }
  g.strokeStyle = o.colore ?? '#000'; g.lineCap = 'round'; g.lineJoin = 'round'
  // un percorso per spessore (pochi gruppi), le linee crescono lungo la loro traccia, tutte insieme
  const gruppi = new Map<number, number[][]>()
  for (const s of P.seg) {
    const m = P.maxi.get(s[5]) ?? [0, 0]
    if (cr < 1 && s[6] > m[0] + cr * (m[1] - m[0])) continue
    const w = Math.round(Math.max(1, s[4] * k * (o.spessore ?? 1.6), S / 500) * 2) / 2
    let l = gruppi.get(w); if (!l) gruppi.set(w, (l = [])); l.push(s)
  }
  for (const [w, lista] of gruppi) {
    g.lineWidth = w; g.beginPath()
    for (const [dx, dy] of offs) for (const s of lista) {
      const x0 = ox + (s[0] + dx) * k, y0 = oy + (s[1] + dy) * k, x1 = ox + (s[2] + dx) * k, y1 = oy + (s[3] + dy) * k
      if (Math.max(x0, x1) < -4 || Math.min(x0, x1) > S + 4 || Math.max(y0, y1) < -4 || Math.min(y0, y1) > S + 4) continue
      g.moveTo(x0, y0); g.lineTo(x1, y1)
    }
    g.stroke()
  }
  return cv
}

// ── il Cristallo ──

/** l'inchiostro pieno e, per ogni pixel, quando è arrivato (per la crescita) */
const pieniCristallo = new Map<string, { ink: ImageData; quando: Uint16Array; tappe: number; pieno: number }>()

const PIENO = 0.3 // si ferma quando l'inchiostro copre questa parte: più in là è una matassa
function simulaCristallo(ind: IndCristallo, S: number, colore: string, maxTratti: number, budget: number) {
  const p = casuale(ind.k), So = creaSorgente(p), sess = So.sessioni
  const fin = creaFinestra({ ...p.finestra, aspetto: 1 }), P = creaProiettore(fin, sess[0].cristallo, ind.vista === 'tessera', maxTratti)
  const cv = newCanvas(S, S), g = cv.getContext('2d')!, k = S / fin.L, c = S / 2
  const quando = new Uint16Array(S * S).fill(65535)
  const fatti = sess.map(() => 0), t0 = Date.now()
  g.strokeStyle = colore; g.lineWidth = Math.max(1, S / 700); g.lineCap = 'round'
  let tappa = 0, daSegnare = 0, coperto = 0
  const segna = () => {
    const d = g.getImageData(0, 0, S, S).data
    for (let i = 0; i < S * S; i++) if (quando[i] === 65535 && d[4 * i + 3] > 24) { quando[i] = tappa; coperto++ }
    tappa++; daSegnare = 0
  }
  const disegna = (s: Float64Array) => {
    // la profondità (l) fa la luce: vicino più denso, lontano più velato
    for (let l = 0; l < 4; l++) {
      g.globalAlpha = 0.1 + 0.16 * l; g.beginPath()
      for (let q = 0; q < s.length; q += 6) { if (Math.min(3, Math.floor(s[q + 4] * 4)) !== l) continue; g.moveTo(c + s[q] * k, c - s[q + 1] * k); g.lineTo(c + s[q + 2] * k, c - s[q + 3] * k) }
      g.stroke()
    }
    daSegnare += s.length / 6
    if (daSegnare > maxTratti / 250) segna()
  }
  while (Date.now() - t0 < budget && !P.pieno && coperto < PIENO * S * S) {
    let lavoro = false
    sess.forEach((x, i) => {
      const src = ind.vista === 'tessera' ? x.tessera : x.tratti
      if (fatti[i] < src.n) { const a = Math.min(src.n, fatti[i] + 4000); disegna(P.proietta(src.s, src.vel, fatti[i], a)); fatti[i] = a; lavoro = true }
    })
    if (lavoro) continue
    if (sess.every(x => x.finito)) break
    for (const x of sess) if (!x.finito) x.avanza(Math.max(x.ogni, Math.ceil(400 / sess.length)))
  }
  segna()
  const ink = g.getImageData(0, 0, S, S)
  let pieno = 0; for (let i = 3; i < ink.data.length; i += 4) if (ink.data[i] > 24) pieno++
  return { ink, quando, tappe: tappa, pieno: pieno / (S * S), p }
}

/** la misura di un cristallo in anteprima: abbastanza inchiostro, sparso bene, non un gomitolo al centro */
function misuraCristallo(ink: ImageData, S: number): number {
  const c16 = new Float64Array(16), q = S / 4; let tot = 0
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const a = ink.data[4 * (y * S + x) + 3] > 24 ? 1 : 0; c16[Math.min(3, Math.floor(y / q)) * 4 + Math.min(3, Math.floor(x / q))] += a; tot += a }
  const f = tot / (S * S); if (f < 0.02) return 0
  let H = 0; for (const v of c16) if (v) { const p = v / tot; H -= p * Math.log(p) }
  return Math.exp(-(((f - 0.32) / 0.18) ** 2)) * (0.3 + 0.7 * H / Math.log(16))
}

/** cerca un cristallo bello: qualche indirizzo a caso, preferendo la prospettiva (la profondità) al piano */
export function cercaCristallo(r: () => number, prove = 4): IndCristallo {
  let meglio: IndCristallo | null = null
  for (let i = 0; i < prove * 3 && (i < prove || !meglio); i++) {
    const k = Math.floor(r() * 1e7), p = casuale(k)
    if ((p.finestra as { R: number }).R === Infinity && r() < 0.7) continue
    const ind: IndCristallo = { tipo: 'cristallo', k, vista: 'tessera', bellezza: 0 }
    const sim = simulaCristallo(ind, 200, '#000', 60000, 350)
    ind.bellezza = misuraCristallo(sim.ink, 200)
    if (!meglio || ind.bellezza > meglio.bellezza) meglio = ind
  }
  return meglio ?? { tipo: 'cristallo', k: Math.floor(r() * 1e7), vista: 'tessera', bellezza: 0 }
}

export function disegnaCristallo(ind: IndCristallo, o: Opzioni = {}): HTMLCanvasElement {
  const S = o.S ?? 900, cr = o.crescita ?? 1, colore = o.colore ?? '#000'
  const P = ricorda(pieniCristallo, chiave([ind.k, ind.vista, S, colore]), () => simulaCristallo(ind, S, colore, 400000, 2500), 4)
  const cv = newCanvas(S, S), g = cv.getContext('2d')!
  if (cr >= 1) { g.putImageData(P.ink, 0, 0); return cv }
  const soglia = cr * P.tappe, out = g.createImageData(S, S), d = out.data, src = P.ink.data
  for (let i = 0; i < S * S; i++) if (P.quando[i] <= soglia) { const j = 4 * i; d[j] = src[j]; d[j + 1] = src[j + 1]; d[j + 2] = src[j + 2]; d[j + 3] = src[j + 3] }
  g.putImageData(out, 0, 0)
  return cv
}

// ── insieme ──

export function cercaMondo(tipo: TipoMondo, r: () => number): Indirizzo { return tipo === 'camera' ? cercaCamera(r) : cercaCristallo(r) }
export function disegnaMondo(ind: Indirizzo, o: Opzioni = {}): HTMLCanvasElement { return ind.tipo === 'camera' ? disegnaCamera(ind, o) : disegnaCristallo(ind, o) }
