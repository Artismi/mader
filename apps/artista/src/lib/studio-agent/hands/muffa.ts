/**
 * La muffa: colonie che crescono davvero, secondo i meccanismi che le fanno crescere.
 *
 * 1. MICELIO (il modello "Neighbour-Sensing" di David Moore): ogni punta di ifa avanza, sente quanto micelio ha attorno
 *    e gira verso dove ce n'è meno; ogni tanto si ramifica di lato. Le ife si sommano in un feltro: fitto al centro,
 *    filamentoso al margine.
 * 2. ZONAZIONE: le colonie vere crescono a giornate; dove il fronte si ferma la notte, sporula di più. Restano anelli.
 * 3. BATTERI (Gray–Scott): due sostanze, una che nutre e una che consuma; con certe dosi di nutrimento e di morte
 *    nascono macchie che si dividono (mitosi) o dita che si ramificano (corallo). Cresce dentro il suo dominio, che si allarga.
 * 4. INCONTRO: due colonie che si toccano si fermano; tra loro resta una linea vuota (l'inibizione).
 */
import { newCanvas } from './sheet'

/*
 * LA CRESCITA. La simulazione si calcola una volta; ogni gesto (un tratto, un grumo, un'ifa) viene registrato con il
 * suo tempo (0..1) invece di essere disegnato. Uno stato a "fino" ridisegna i gesti nati fino a quel momento: gli
 * stati sono uno il prefisso dell'altro, e a fino = 1 si ripercorrono tutti nell'ordine originale (identico a prima).
 * I tubi e i corpi della rete si ingrossano mentre crescono; le ife si allungano passo per passo.
 */
type Cmd = number[] // [0,x,y,t] moveTo · [1,x,y,t] lineTo · [2,cx,cy,x,y,t] quad · [3,x,y,r,a0,a1,t] arc · [4,t] close
interface Stile { a: number; lw: number; ss: string; fs: string; cap: CanvasLineCap; join: CanvasLineJoin; comp: GlobalCompositeOperation }
type Prim = { k: 's' | 'f'; st: Stile; p: Cmd[]; t: number; L: 'A' | 'B' | 'C' } | { k: 'spec'; t: number; L: 'S1' | 'S2' | 'S3'; draw: (g: CanvasRenderingContext2D, fino: number, esatto: boolean) => void }
const tOf = (c: Cmd) => c[c.length - 1]
class Registro {
  t = 0; L: 'A' | 'B' | 'C' = 'A'
  globalAlpha = 1; lineWidth = 1; strokeStyle = '#000'; fillStyle = '#000'; lineCap: CanvasLineCap = 'butt'; lineJoin: CanvasLineJoin = 'miter'; globalCompositeOperation: GlobalCompositeOperation = 'source-over'
  prims: Prim[] = []; private path: Cmd[] = []; private pila: Stile[] = []
  private stile(): Stile { return { a: this.globalAlpha, lw: this.lineWidth, ss: this.strokeStyle, fs: this.fillStyle, cap: this.lineCap, join: this.lineJoin, comp: this.globalCompositeOperation } }
  beginPath() { this.path = [] }
  moveTo(x: number, y: number) { this.path.push([0, x, y, this.t]) }
  lineTo(x: number, y: number) { this.path.push([1, x, y, this.t]) }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number) { this.path.push([2, cx, cy, x, y, this.t]) }
  arc(x: number, y: number, r: number, a0: number, a1: number) { this.path.push([3, x, y, r, a0, a1, this.t]) }
  closePath() { this.path.push([4, this.t]) }
  stroke() { if (this.path.length) this.prims.push({ k: 's', st: this.stile(), p: this.path.slice(), t: tOf(this.path[0]), L: this.L }) }
  fill() { if (this.path.length) this.prims.push({ k: 'f', st: this.stile(), p: this.path.slice(), t: tOf(this.path[0]), L: this.L }) }
  save() { this.pila.push(this.stile()) }
  restore() { const s = this.pila.pop(); if (s) { this.globalAlpha = s.a; this.lineWidth = s.lw; this.strokeStyle = s.ss; this.fillStyle = s.fs; this.lineCap = s.cap; this.lineJoin = s.join; this.globalCompositeOperation = s.comp } }
  spec(L: 'S1' | 'S2' | 'S3', t: number, draw: (g: CanvasRenderingContext2D, fino: number, esatto: boolean) => void) { this.prims.push({ k: 'spec', t, L, draw }) }
}
/** quanto un tubo o un corpo è cresciuto: nasce sottile e si ingrossa */
const ingrossa = (fino: number, t: number) => (fino >= 1 ? 1 : Math.max(0.3, Math.min(1, 0.3 + 0.7 * (fino - t) / 0.15)))
function traccia(g: CanvasRenderingContext2D, pr: Extract<Prim, { k: 's' | 'f' }>, fino: number) {
  const gf = pr.L === 'B' ? ingrossa(fino, pr.t) : 1
  g.globalAlpha = pr.st.a; g.globalCompositeOperation = pr.st.comp; g.lineCap = pr.st.cap; g.lineJoin = pr.st.join
  g.beginPath()
  for (const c of pr.p) {
    if (tOf(c) > fino) break
    if (c[0] === 0) g.moveTo(c[1], c[2]); else if (c[0] === 1) g.lineTo(c[1], c[2]); else if (c[0] === 2) g.quadraticCurveTo(c[1], c[2], c[3], c[4])
    else if (c[0] === 3) g.arc(c[1], c[2], c[3] * (pr.k === 'f' ? gf : 1), c[4], c[5]); else g.closePath()
  }
  if (pr.k === 's') { g.strokeStyle = pr.st.ss; g.lineWidth = pr.st.lw * gf; g.stroke() } else { g.fillStyle = pr.st.fs; g.fill() }
}

/** la crescita di un segno di muffa: si calcola una volta, poi ogni stato (0..1) si disegna in poco tempo */
export function crescitaMuffa(seme: number, colore: string, S = 560): (fino: number) => HTMLCanvasElement {
  const { prims } = simula(seme, colore, S)
  const ricetta = { seme, colore, S }
  const A = prims.filter(p => p.k !== 'spec' && p.L === 'A').sort((a, b) => a.t - b.t) as Extract<Prim, { k: 's' | 'f' }>[]
  const C = prims.filter(p => p.k !== 'spec' && p.L === 'C').sort((a, b) => a.t - b.t) as Extract<Prim, { k: 's' | 'f' }>[]
  const B = prims.filter(p => p.k !== 'spec' && p.L === 'B') as Extract<Prim, { k: 's' | 'f' }>[]
  const spec = (L: string) => prims.filter(p => p.k === 'spec' && p.L === L) as Extract<Prim, { k: 'spec' }>[]
  const S1 = spec('S1'), S2 = spec('S2'), S3 = spec('S3')
  // le ife e il merletto (A) e le spore (C) si accumulano: ogni stato aggiunge solo quello che è nato dall'ultimo
  const cvA = newCanvas(S, S), gA = cvA.getContext('2d')!, cvC = newCanvas(S, S), gC = cvC.getContext('2d')!
  let iA = 0, iC = 0, ultimo = -1
  let finale: HTMLCanvasElement | null = null
  return (fino0: number) => {
    const fino = Math.max(0, Math.min(1, fino0))
    const out = newCanvas(S, S), g = out.getContext('2d')!
    if (fino >= 1) {
      // l'ultimo stato: tutti i gesti nell'ordine in cui sono nati (è il segno di prima, identico)
      if (!finale) { finale = newCanvas(S, S); const q = finale.getContext('2d')!; for (const p of prims) { if (p.k === 'spec') { if (p.L !== 'S3') p.draw(q, 1, true) } else traccia(q, p, 1) } for (const p of S3) p.draw(q, 1, true) }
      g.drawImage(finale, 0, 0)
    } else {
      if (fino < ultimo) { gA.clearRect(0, 0, S, S); gC.clearRect(0, 0, S, S); iA = 0; iC = 0 }
      ultimo = fino
      while (iA < A.length && A[iA].t <= fino) traccia(gA, A[iA++], fino)
      while (iC < C.length && C[iC].t <= fino) traccia(gC, C[iC++], fino)
      for (const p of S1) p.draw(g, fino, false)
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.drawImage(cvA, 0, 0)
      for (const p of S2) p.draw(g, fino, false)
      for (const p of B) if (p.t <= fino) traccia(g, p, fino)
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.drawImage(cvC, 0, 0)
      for (const p of S3) p.draw(g, fino, false)
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'
    ;(out as HTMLCanvasElement & { __muffa?: typeof ricetta }).__muffa = ricetta
    return out
  }
}

/** la ricetta di un segno di muffa (se il canvas lo è): serve per farlo ricrescere altrove (nel reel) */
export function ricettaMuffa(cv: HTMLCanvasElement): { seme: number; colore: string; S: number } | undefined {
  return (cv as HTMLCanvasElement & { __muffa?: { seme: number; colore: string; S: number } }).__muffa
}

function rng(seed: number) { let a = seed >>> 0 || 1; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296) }
/** rumore liscio periodico sull'angolo: quanto cresce la colonia in ogni direzione (le colonie vere non sono dischi) */
function lobi(r: () => number, n = 5) { const ph = Array.from({ length: n }, () => r() * 6.283), am = Array.from({ length: n }, (_, i) => (r() * 0.6) / (i + 1)); return (a: number) => 1 + am.reduce((s, x, i) => s + x * Math.sin((i + 1) * a + ph[i]), 0) }

export type Specie = 'micelio' | 'batterio'
export interface Colonia { x: number; y: number; specie: Specie; vigore: number }

/** il segno di muffa a uno stato della sua crescita (fino = 1: la colonia intera) */
const cacheCrescite = new Map<string, (fino: number) => HTMLCanvasElement>()
export function disegnaMuffa(seme: number, colore: string, S = 560, fino = 1): HTMLCanvasElement {
  const k = `${seme}|${colore}|${S}`
  let c = cacheCrescite.get(k)
  if (!c) { c = crescitaMuffa(seme, colore, S); cacheCrescite.set(k, c); if (cacheCrescite.size > 12) cacheCrescite.delete(cacheCrescite.keys().next().value as string) }
  return c(fino)
}

/** l'alone si calcola sul segno finito (ne segue la sagoma); nella crescita si allarga e si fa avanti piano */
function conAlone(reg: Registro, S: number, colore: string, r: () => number) {
  const cv = newCanvas(S, S), q = cv.getContext('2d')!
  for (const p of reg.prims) { if (p.k === 'spec') p.draw(q, 1, true); else traccia(q, p, 1) }
  const t = alone(cv, S, colore, r)
  if (!t) return
  reg.spec('S3', 0, (g, fino, esatto) => {
    const a = esatto ? 1 : Math.max(0, Math.min(1, (fino - 0.12) / 0.7)); if (a <= 0) return
    const k = esatto ? 1 : 0.6 + 0.4 * Math.min(1, fino / 0.85)
    g.save(); g.globalCompositeOperation = 'destination-over'; g.globalAlpha = a; g.imageSmoothingQuality = 'high'; g.translate(S / 2, S / 2); g.scale(k, k); g.drawImage(t, -S / 2, -S / 2, S, S); g.restore()
  })
}

function simula(seme: number, colore: string, S: number): Registro {
  // il seme si mescola prima (semi vicini darebbero colonie simili)
  let h0 = (seme ^ 0x9e3779b9) >>> 0; h0 = Math.imul(h0 ^ (h0 >>> 16), 0x85ebca6b) >>> 0; h0 = Math.imul(h0 ^ (h0 >>> 13), 0xc2b2ae35) >>> 0; h0 = (h0 ^ (h0 >>> 16)) >>> 0
  const r = rng(h0)
  const reg = new Registro(), g = reg as unknown as CanvasRenderingContext2D
  // la forma principale: la rete tra più fulcri (Physarum); a volte le colonie di prima
  if (r() < 0.6) { rete(reg, S, colore, r); conAlone(reg, S, colore, r); return reg }
  // le colonie: una o più, di specie diverse, seminate vicine così si incontrano
  const n = 1 + Math.floor(r() * r() * 4)
  const col: Colonia[] = []
  for (let i = 0; i < n; i++) { const a = r() * 6.283, d = i ? S * (0.12 + r() * 0.2) : 0; col.push({ x: S / 2 + Math.cos(a) * d + (r() - 0.5) * S * 0.08, y: S / 2 + Math.sin(a) * d + (r() - 0.5) * S * 0.08, specie: r() < 0.68 ? 'micelio' : 'batterio', vigore: i ? 0.4 + r() * 0.5 : 1 }) }
  // chi occupa cosa (per l'incontro): una griglia grossa con il numero della colonia
  const Q = 4, GW = Math.ceil(S / Q), chi = new Int16Array(GW * GW).fill(-1), densita = new Float32Array(GW * GW)
  // i batteri si disegnano prima (stanno sotto, piatti sull'agar), il micelio sopra (è un feltro che si alza)
  for (const [k, c] of col.entries()) if (c.specie === 'batterio') batteri(reg, S, c, k, colore, r, chi, GW, Q)
  micelio(reg, S, col, colore, r, chi, densita, GW, Q)
  void g
  conAlone(reg, S, colore, r)
  return reg
}

/**
 * I batteri: crescita per aggregazione (DLA con riduzione del rumore), come le colonie di Bacillus su agar povero.
 * Particelle di nutrimento vagano a caso e, quando toccano la colonia abbastanza volte, ci si attaccano: le punte, più esposte,
 * crescono più in fretta e si dividono; nascono dita ramificate. Più colpi servono, più le dita sono grasse e lisce.
 */
function batteri(reg: Registro, S: number, c: Colonia, k: number, colore: string, r: () => number, chi: Int16Array, GW: number, Q: number) {
  const N = 300, sc = S / N, occ = new Uint8Array(N * N), colpi = new Uint8Array(N * N), eta = new Uint16Array(N * N), px = new Float32Array(N * N), py = new Float32Array(N * N)
  const cx = Math.round(c.x / sc), cy = Math.round(c.y / sc)
  const Rm = Math.min(N * (0.17 + 0.15 * c.vigore), N * 0.44 - Math.hypot(c.x / sc - N / 2, c.y / sc - N / 2)), m = 1 + Math.floor(r() * 2), deriva = 0.02 + r() * 0.06
  occ[cy * N + cx] = 1
  let Rc = 2, n = 1
  const t0 = performance.now()
  while (Rc < Rm && n < 14000 && performance.now() - t0 < 700) {
    const a = r() * 6.283; let x = cx + Math.cos(a) * (Rc + 4), y = cy + Math.sin(a) * (Rc + 4)
    for (let passo = 0; passo < 6000; passo++) {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy)
      if (d > Rc + 40) break
      // lontano dalla colonia salta più lungo (risparmia tempo senza cambiare la forma)
      const L = d > Rc + 6 ? Math.max(1, d - Rc - 4) : 1
      const an = r() * 6.283
      x += Math.cos(an) * L - (dx / (d || 1)) * deriva * L; y += Math.sin(an) * L - (dy / (d || 1)) * deriva * L
      const xi = Math.round(x), yi = Math.round(y)
      if (xi < 2 || yi < 2 || xi >= N - 2 || yi >= N - 2) break
      const i = yi * N + xi
      if (occ[i - 1] || occ[i + 1] || occ[i - N] || occ[i + N] || occ[i - N - 1] || occ[i - N + 1] || occ[i + N - 1] || occ[i + N + 1]) {
        // si attacca dove è arrivata davvero (non al centro della casella): niente croci del reticolo
        if (++colpi[i] >= m && !occ[i]) { occ[i] = 1; eta[i] = n++; px[i] = x; py[i] = y; Rc = Math.max(Rc, Math.hypot(xi - cx, yi - cy)) ; const gx = Math.floor(xi * sc / Q), gy = Math.floor(yi * sc / Q); if (chi[gy * GW + gx] < 0) chi[gy * GW + gx] = k }
        break
      }
    }
  }
  // il disegno: ogni cellula è un punto; le vecchie (al centro) più dense; un alone di velo attorno alle dita (l'agar bagnato)
  const anelli = 2 + Math.floor(r() * 4)
  const cel: { x: number; y: number; r: number; a: number; t: number }[] = []
  for (let i = 0; i < N * N; i++) if (occ[i]) { const x = (px[i] || i % N) * sc, y = (py[i] || (i / N) | 0) * sc, vec = 1 - eta[i] / n, anello = 0.78 + 0.22 * Math.sin((eta[i] / n) * 6.283 * anelli); cel.push({ x, y, r: sc * (1.1 + 0.9 * vec), a: (0.5 + 0.5 * vec) * anello, t: 0.02 + 0.93 * eta[i] / n }) }
  // crescita: le cellule si attaccano nell'ordine in cui sono arrivate; la tela si accumula, il velo si rifà
  const perTempo = cel.slice().sort((a, b) => a.t - b.t)
  const tmp = newCanvas(S, S), q = tmp.getContext('2d')!; let iT = 0, ult = -1
  const HS = Math.round(S / 2), halo = newCanvas(HS, HS), hq = halo.getContext('2d')!
  reg.spec('S1', 0, (g, fino, esatto) => {
    if (esatto) {
      const f = newCanvas(S, S), fq = f.getContext('2d')!; fq.fillStyle = colore
      for (const c0 of cel) { fq.globalAlpha = c0.a; fq.beginPath(); fq.arc(c0.x, c0.y, c0.r, 0, 6.283); fq.fill() }
      g.save(); g.globalAlpha = 0.22; g.filter = `blur(${Math.round(S * 0.012)}px)`; g.drawImage(f, 0, 0); g.filter = 'none'; g.globalAlpha = 1; g.drawImage(f, 0, 0); g.restore(); return
    }
    if (fino < ult) { q.clearRect(0, 0, S, S); iT = 0 }
    ult = fino; q.fillStyle = colore
    while (iT < perTempo.length && perTempo[iT].t <= fino) { const c0 = perTempo[iT++]; q.globalAlpha = c0.a; q.beginPath(); q.arc(c0.x, c0.y, c0.r, 0, 6.283); q.fill() }
    // il velo sfocato si fa su una tela piccola (negli stati intermedi): costa un quarto
    hq.clearRect(0, 0, HS, HS); hq.filter = `blur(${Math.max(1, Math.round(S * 0.012 * HS / S))}px)`; hq.drawImage(tmp, 0, 0, HS, HS); hq.filter = 'none'
    g.save(); g.globalAlpha = 0.22; g.imageSmoothingQuality = 'high'; g.drawImage(halo, 0, 0, S, S); g.globalAlpha = 1; g.drawImage(tmp, 0, 0); g.restore()
  })
}

/** il micelio: punte che crescono sentendo i vicini, si ramificano, si fermano dove c'è un'altra colonia */
function micelio(reg: Registro, S: number, col: Colonia[], colore: string, r: () => number, chi: Int16Array, densita: Float32Array, GW: number, Q: number) {
  interface Punta { x: number; y: number; a: number; c: number; w: number; eta: number; vive: boolean }
  const punte: Punta[] = []
  col.forEach((c, k) => { if (c.specie !== 'micelio') return; const n0 = 20 + Math.floor(r() * 16); const ino = S * (0.02 + 0.03 * r()); for (let i = 0; i < n0; i++) { const a0 = r() * 6.283, d0 = Math.sqrt(r()) * ino; punte.push({ x: c.x + Math.cos(a0) * d0, y: c.y + Math.sin(a0) * d0, a: a0 + (r() - 0.5) * 1.2, c: k, w: 1, eta: 0, vive: true }) } })
  if (!punte.length) return
  const g = reg as unknown as CanvasRenderingContext2D, k0 = reg.prims.length
  const incrCella: number[] = [], incrT: number[] = [] // la storia del feltro: quando ogni cella si è addensata
  g.strokeStyle = colore; g.fillStyle = colore; g.lineCap = 'round'
  const fronte: { t: number; d: number[] }[] = []
  const notte = 60 + Math.floor(r() * 40) // ogni quanti passi il fronte si ferma (una "giornata")
  const passi = 340, MAXP = 1700
  const forma = col.map(() => lobi(r, 5)), Rmax = col.map(c => S * (0.2 + 0.18 * c.vigore))
  const dens = (x: number, y: number) => { const gx = (x / Q) | 0, gy = (y / Q) | 0; return gx < 0 || gy < 0 || gx >= GW || gy >= GW ? 99 : densita[gy * GW + gx] }
  const spore: { x: number; y: number; c: number; giorno: number; t?: number }[] = []
  let ultimoPasso = 1
  for (let t = 0; t < passi; t++) {
    reg.t = t; ultimoPasso = t
    const giorno = Math.floor(t / notte), sera = t % notte > notte * 0.8 // a sera rallenta e sporula
    const vivi = punte.filter(p => p.vive)
    if (!vivi.length) break
    for (const p of vivi) {
      const c = col[p.c]
      // sente i vicini davanti, a sinistra, a destra: gira verso dove c'è meno micelio
      const L = 6, s0 = dens(p.x + Math.cos(p.a) * L, p.y + Math.sin(p.a) * L), sl = dens(p.x + Math.cos(p.a - 0.5) * L, p.y + Math.sin(p.a - 0.5) * L), sr = dens(p.x + Math.cos(p.a + 0.5) * L, p.y + Math.sin(p.a + 0.5) * L)
      if (sl < s0 && sl < sr) p.a -= 0.12; else if (sr < s0 && sr < sl) p.a += 0.12
      // e la spinta ad allontanarsi dal centro della sua colonia (il fronte cresce verso fuori)
      const fuori = Math.atan2(p.y - c.y, p.x - c.x), dd = Math.atan2(Math.sin(fuori - p.a), Math.cos(fuori - p.a))
      p.a += dd * 0.035 + (r() - 0.5) * 0.3
      // il margine della colonia: oltre il suo raggio (diverso per direzione) la punta si ferma, sfilacciando
      const lim = Math.min(Rmax[p.c] * forma[p.c](fuori), S * 0.47 - Math.hypot(c.x - S / 2, c.y - S / 2)), rd = Math.hypot(p.x - c.x, p.y - c.y) / Math.max(10, lim)
      if (rd > 1 && r() < (rd - 1) * 8 + 0.02) { p.vive = false; continue }
      const v = (sera ? 0.5 : 1.6) * (0.6 + 0.4 * c.vigore) * (0.7 + 0.3 * forma[p.c](fuori))
      const nx = p.x + Math.cos(p.a) * v, ny = p.y + Math.sin(p.a) * v
      // l'incontro: se il territorio è di un'altra colonia, la punta si ferma
      const gx = (nx / Q) | 0, gy = (ny / Q) | 0
      if (gx < 1 || gy < 1 || gx >= GW - 1 || gy >= GW - 1) { p.vive = false; continue }
      const occ = chi[gy * GW + gx]
      if (occ >= 0 && occ !== p.c) { p.vive = false; continue }
      chi[gy * GW + gx] = p.c
      if (densita[gy * GW + gx] > 7) { p.vive = false; continue }
      densita[gy * GW + gx] += 0.35; incrCella.push(gy * GW + gx); incrT.push(t)
      // il tratto: sottile e trasparente, si somma in feltro
      g.globalAlpha = 0.22 + 0.25 * p.w; g.lineWidth = 0.5 + 0.9 * p.w
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(nx, ny); g.stroke()
      p.x = nx; p.y = ny; p.eta++
      // ramificazione laterale, più frequente nelle ife giovani; le ramificazioni sono più sottili
      if (punte.length < MAXP && r() < 0.045 * (1 - p.eta / 600)) punte.push({ x: p.x, y: p.y, a: p.a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5), c: p.c, w: p.w * 0.8, eta: 0, vive: true })
      // a sera sporula: teste di spore sulle ife (più dense negli anelli)
      if (sera && r() < 0.08) spore.push({ x: p.x, y: p.y, c: p.c, giorno, t } as typeof spore[0])
    }
    if (t % notte === 0) fronte.push({ t, d: [] })
  }
  // il tempo: i passi diventano 0..1 (la colonia cresce per tutta la durata, anche se si ferma prima del limite)
  const tempo = (passo: number) => 0.04 + 0.94 * passo / Math.max(1, ultimoPasso)
  for (let i = k0; i < reg.prims.length; i++) { const p = reg.prims[i]; if (p.k !== 'spec') { for (const c of p.p) c[c.length - 1] = tempo(c[c.length - 1]); p.t = tempo(p.t) } }
  // il feltro: dove le ife sono tante si fa una massa opaca, morbida (la densità, sfocata). Cresce con la sua storia
  {
    const h = colore.replace('#', ''), R0 = parseInt(h.slice(0, 2), 16), G0 = parseInt(h.slice(2, 4), 16), B0 = parseInt(h.slice(4, 6), 16)
    const f = newCanvas(GW, GW), fq = f.getContext('2d')!, im = fq.createImageData(GW, GW), dn = new Float32Array(GW * GW)
    const tI = incrT.map(tempo); let iI = 0, ult = -1
    const PS = Math.round(S / 2), piccola = newCanvas(PS, PS), pq = piccola.getContext('2d')!
    const finale = densita.slice()
    reg.spec('S2', 0, (g2, fino, esatto) => {
      if (esatto) dn.set(finale)
      else { if (fino < ult) { dn.fill(0); iI = 0 } ult = fino; while (iI < tI.length && tI[iI] <= fino) { dn[incrCella[iI]] += 0.35; iI++ } }
      for (let i = 0; i < GW * GW; i++) { const v = Math.min(1, Math.max(0, dn[i] - 1.2) / 5); im.data[i * 4] = R0; im.data[i * 4 + 1] = G0; im.data[i * 4 + 2] = B0; im.data[i * 4 + 3] = Math.round(v * v * 200) }
      fq.putImageData(im, 0, 0)
      g2.save(); g2.globalAlpha = 1; g2.imageSmoothingQuality = 'high'
      if (esatto) { g2.filter = `blur(${Math.round(S * 0.01)}px)`; g2.drawImage(f, 0, 0, S, S); g2.filter = 'none' }
      else { pq.clearRect(0, 0, PS, PS); pq.filter = `blur(${Math.max(1, Math.round(S * 0.01 * PS / S))}px)`; pq.drawImage(f, 0, 0, PS, PS); pq.filter = 'none'; g2.drawImage(piccola, 0, 0, S, S) }
      g2.restore()
      if (esatto) { iI = tI.length; ult = 1 }
    })
  }
  reg.L = 'C'
  // le spore: piccole teste (un punto con una corona), fitte negli anelli della zonazione
  for (const s of spore) {
    reg.t = tempo(s.t ?? 0) + 0.01
    const rr = 0.8 + r() * 2.2
    g.globalAlpha = 0.55; g.beginPath(); g.arc(s.x, s.y, rr, 0, 6.283); g.fill()
    g.globalAlpha = 0.25; g.lineWidth = 0.5
    for (let k = 0; k < 6; k++) { const a = r() * 6.283; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x + Math.cos(a) * rr * 2.2, s.y + Math.sin(a) * rr * 2.2); g.stroke() }
  }
  // il centro: dove la colonia è nata il feltro è più fitto e vecchio (un nucleo opaco)
  for (const c of col) if (c.specie === 'micelio') {
    // il tassello d'innesto: un groviglio fitto di ife corte e arricciate
    const R1 = S * (0.025 + 0.025 * c.vigore)
    g.lineWidth = 0.7
    for (let i = 0; i < 260; i++) { reg.t = 0.005 + 0.05 * i / 260; const a0 = r() * 6.283, d0 = Math.sqrt(r()) * R1; let x = c.x + Math.cos(a0) * d0, y = c.y + Math.sin(a0) * d0, an = r() * 6.283; g.globalAlpha = 0.25; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { an += (r() - 0.5) * 1.4; x += Math.cos(an) * 2; y += Math.sin(an) * 2; g.lineTo(x, y) } g.stroke() }
  }
  g.globalAlpha = 1
  reg.L = 'A'
}

/** l'alone: sotto la colonia il terreno si è bagnato e asciugato come una macchia di caffè. Non un contorno pulito:
 *  la macchia è spostata dove il liquido è colato, il bordo è irregolare e a tratti si interrompe; a volte non c'è. */
function alone(cv: HTMLCanvasElement, S: number, colore: string, r: () => number): HTMLCanvasElement | null {
  if (r() < 0.3) return null
  const M = 140, t = newCanvas(M, M), q = t.getContext('2d', { willReadFrequently: true })!
  const sx = (r() - 0.5) * 10, sy = (r() - 0.5) * 10, k = 1.02 + r() * 0.12
  q.filter = `blur(${3 + Math.floor(r() * 3)}px)`; q.translate(M / 2 + sx, M / 2 + sy); q.scale(k, k); q.drawImage(cv, -M / 2, -M / 2, M, M); q.setTransform(1, 0, 0, 1, 0, 0); q.filter = 'none'
  const d = q.getImageData(0, 0, M, M), o = q.createImageData(M, M)
  const h = colore.replace('#', ''), R0 = parseInt(h.slice(0, 2), 16), G0 = parseInt(h.slice(2, 4), 16), B0 = parseInt(h.slice(4, 6), 16)
  // un rumore grosso fa respirare la soglia (bordo frastagliato) e la forza dell'anello (a tratti sparisce)
  const ph = Array.from({ length: 6 }, () => [r() * 6.283, 0.05 + r() * 0.15])
  const nz = (x: number, y: number) => ph.reduce((a, [p, f], i) => a + Math.sin(x * f + p + i) * Math.cos(y * f * 1.3 - p), 0) / 6
  for (let i = 0; i < M * M; i++) {
    const x = i % M, y = (i / M) | 0, b = d.data[i * 4 + 3] / 255, n = nz(x, y)
    const soglia = 0.12 + 0.08 * n
    const velo = b > soglia ? 0.06 + 0.06 * (0.5 + n) : 0
    const bordo = Math.exp(-(((b - soglia) / 0.03) ** 2)) * Math.max(0, 0.2 + 0.5 * n)
    const sb = Math.min(x, y, M - 1 - x, M - 1 - y) / 8 // mai fino al bordo del foglio
    o.data[i * 4] = R0; o.data[i * 4 + 1] = G0; o.data[i * 4 + 2] = B0; o.data[i * 4 + 3] = Math.round(Math.min(1, velo + bordo) * Math.min(1, sb) * 255)
  }
  q.putImageData(o, 0, 0)
  return t
}

/**
 * La rete (Tero et al. 2010): il Physarum collega le fonti di cibo con tubi che si adattano al flusso. Un grafo fitto
 * riempie una sagoma organica; a ogni ciclo una coppia di fulcri fa da sorgente e pozzo, si risolvono le pressioni
 * (Kirchhoff, gradiente coniugato), il flusso in ogni tubo è Q = D/L·Δp, e la conduttanza cresce dove passa flusso e
 * si consuma dove no: dD/dt = f(|Q|) − D, con f sigmoide (gerarchia). Restano vene spesse sulle strade di priorità,
 * capillari sottili, lacune vuote; al fronte esterno il merletto.
 */
function rete(reg: Registro, S: number, colore: string, r: () => number) {
  const g = reg as unknown as CanvasRenderingContext2D
  const t0 = performance.now()
  // i fulcri: 3–9, irregolari, non troppo vicini; il primo è il corpo principale
  const nF = 3 + Math.floor(r() * 7), F: { x: number; y: number; m: number }[] = []
  for (let t = 0; t < 400 && F.length < nF; t++) {
    const a = r() * 6.283, d = F.length ? S * (nF <= 4 ? 0.24 + r() * 0.1 : 0.16 + r() * 0.24) : S * r() * 0.06
    const x = S / 2 + Math.cos(a) * d * (1 + 0.3 * Math.cos(a * 2)), y = S / 2 + Math.sin(a) * d
    if (x < S * 0.2 || y < S * 0.2 || x > S * 0.8 || y > S * 0.8) continue
    if (F.some(f => Math.hypot(f.x - x, f.y - y) < S * 0.17)) continue
    F.push({ x, y, m: F.length ? 0.3 + r() * 0.5 : 1 })
  }
  // la sagoma: l'inviluppo morbido dei fulcri, con lobi (dove cresce il plasmodio)
  const lb = lobi(r, 5)
  const dentro = (x: number, y: number) => { const eb = Math.min(x, y, S - x, S - y) / S; if (eb < 0.03) return 0; let v = 0; for (const f of F) { const d = Math.hypot(x - f.x, y - f.y) / (S * (0.14 + 0.08 * f.m) * lb(Math.atan2(y - f.y, x - f.x))); v = Math.max(v, 1 - d) } return v * Math.min(1, (eb - 0.03) / 0.1) - (eb < 0.13 ? 0.15 * (1 - eb / 0.13) : 0) }
  // il grafo: una griglia scossa (punti quasi a caso, mai allineati) e i vicini entro un raggio
  const h = S / 31, P: { x: number; y: number; m: number }[] = []
  for (let y = h / 2; y < S; y += h) for (let x = h / 2; x < S; x += h) { const px = x + (r() - 0.5) * h * 0.9, py = y + (r() - 0.5) * h * 0.9, m = dentro(px, py); if (m > 0 && px > 4 && py > 4 && px < S - 4 && py < S - 4) P.push({ x: px, y: py, m }) }
  const n = P.length, G = Math.ceil(S / h) + 1, cell: number[][] = Array.from({ length: G * G }, () => [])
  P.forEach((p, i) => cell[Math.floor(p.y / h) * G + Math.floor(p.x / h)].push(i))
  const ea: number[] = [], eb: number[] = [], eL: number[] = []
  P.forEach((p, i) => { const cx = Math.floor(p.x / h), cy = Math.floor(p.y / h); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = cell[(cy + dy) * G + cx + dx]; if (!c) continue; for (const j of c) if (j > i) { const L = Math.hypot(P[j].x - p.x, P[j].y - p.y); if (L < h * 1.6) { ea.push(i); eb.push(j); eL.push(L) } } } })
  const m = ea.length, D = new Float64Array(m).fill(1), Q = new Float64Array(m)
  const adj: number[][] = Array.from({ length: n }, () => [])
  for (let e = 0; e < m; e++) { adj[ea[e]].push(e); adj[eb[e]].push(e) }
  // il nodo più vicino a ogni fulcro
  const nodoDi = (f: { x: number; y: number }) => { let b = 0, bd = 1e9; P.forEach((p, i) => { const d = Math.hypot(p.x - f.x, p.y - f.y); if (d < bd) { bd = d; b = i } }); return b }
  const NF = F.map(nodoDi)
  // il sistema di Kirchhoff con il pozzo a terra: L p = b, risolto col gradiente coniugato
  const p = new Float64Array(n), rr = new Float64Array(n), dd = new Float64Array(n), Ad = new Float64Array(n), b = new Float64Array(n)
  const mul = (x: Float64Array, out: Float64Array, pozzo: number) => { out.fill(0); for (let e = 0; e < m; e++) { const c = D[e] / eL[e], i = ea[e], j = eb[e], v = c * (x[i] - x[j]); out[i] += v; out[j] -= v } out[pozzo] = x[pozzo] }
  const cicli = 80, I0 = 1, mu = 2.6
  for (let k = 0; k < cicli && performance.now() - t0 < 420; k++) {
    // la coppia: di solito il corpo principale contro un satellite, a volte due satelliti
    const s0 = r() < 0.6 ? 0 : Math.floor(r() * F.length); let s1 = Math.floor(r() * F.length); if (s1 === s0) s1 = (s1 + 1) % F.length
    const src = NF[s0], snk = NF[s1]
    b.fill(0); b[src] = I0; b[snk] = 0
    // CG
    p.fill(0); mul(p, Ad, snk); for (let i = 0; i < n; i++) { rr[i] = b[i] - Ad[i]; dd[i] = rr[i] } rr[snk] = 0; dd[snk] = 0
    let rs = 0; for (let i = 0; i < n; i++) rs += rr[i] * rr[i]
    for (let it = 0; it < 45 && rs > 1e-9; it++) {
      mul(dd, Ad, snk); Ad[snk] = 0
      let dAd = 0; for (let i = 0; i < n; i++) dAd += dd[i] * Ad[i]
      const al = rs / (dAd || 1e-12)
      let rs2 = 0; for (let i = 0; i < n; i++) { p[i] += al * dd[i]; rr[i] -= al * Ad[i]; rs2 += rr[i] * rr[i] }
      const be = rs2 / rs; rs = rs2; for (let i = 0; i < n; i++) dd[i] = rr[i] + be * dd[i]
      dd[snk] = 0
    }
    // i tubi si adattano al flusso
    for (let e = 0; e < m; e++) { const q = Math.abs(D[e] / eL[e] * (p[ea[e]] - p[eb[e]])) / I0, fq = q ** mu / (0.03 ** mu + q ** mu); Q[e] = Q[e] * 0.7 + q * 0.3; D[e] += 0.45 * (fq - D[e]) }
  }
  // il tempo della crescita: la distanza lungo il grafo dal fulcro più vicino (seguendo di preferenza le vene: più conducono, più corta la strada)
  const Dm0 = Math.max(...D), dist = new Float64Array(n).fill(1e9), fatto = new Uint8Array(n)
  for (const v of NF) dist[v] = 0
  for (let it = 0; it < n; it++) {
    let u = -1, du = 1e9; for (let i = 0; i < n; i++) if (!fatto[i] && dist[i] < du) { du = dist[i]; u = i }
    if (u < 0) break; fatto[u] = 1
    for (const e of adj[u]) { const v = ea[e] === u ? eb[e] : ea[e], w = eL[e] / Math.sqrt(D[e] / Dm0 + 0.05); if (du + w < dist[v]) dist[v] = du + w }
  }
  let maxD = 1; for (let i = 0; i < n; i++) if (dist[i] < 1e8) maxD = Math.max(maxD, dist[i])
  // il tempo è il rango della distanza (non la distanza): le vene si allungano a passo costante, non tutte all'inizio
  const ordine = Array.from({ length: n }, (_, i) => i).sort((a, b) => (dist[a] < 1e8 ? dist[a] : maxD) - (dist[b] < 1e8 ? dist[b] : maxD)), rango = new Float64Array(n)
  ordine.forEach((v, k) => { rango[v] = k / Math.max(1, n - 1) })
  // le vene si allungano per conto loro: il loro tempo è il rango tra i nodi che stanno su una vena
  const Dm1 = Math.max(...D), Qm1 = Math.max(...Q), suVena = new Uint8Array(n)
  for (let e = 0; e < m; e++) if (D[e] / Dm1 > 0.12 && Q[e] / Qm1 > 0.035) { suVena[ea[e]] = 1; suVena[eb[e]] = 1 }
  const ordV = ordine.filter(i => suVena[i]), rangoV = new Float64Array(n).fill(-1)
  ordV.forEach((v, k) => { rangoV[v] = k / Math.max(1, ordV.length - 1) })
  const tN = (i: number) => (rangoV[i] >= 0 ? 0.12 + 0.55 * rangoV[i] : 0.13 + 0.5 * rango[i])
  const tE = (e: number) => Math.min(tN(ea[e]), tN(eb[e]))
  // il disegno
  const Dmax = Math.max(...D), W = S * 0.022
  g.strokeStyle = g.fillStyle = colore; g.lineCap = 'round'; g.lineJoin = 'round'
  // un tubo non è un segmento: si piega un poco, sempre nello stesso verso per lo stesso tubo
  const tubo = (e: number, w: number) => { const A = P[ea[e]], B = P[eb[e]], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, nx = -(B.y - A.y), ny = B.x - A.x, k = ((e * 2654435761) % 1000) / 1000 - 0.5; g.lineWidth = w; g.beginPath(); g.moveTo(A.x, A.y); g.quadraticCurveTo(mx + nx * k * 0.35, my + ny * k * 0.35, B.x, B.y); g.stroke() }
  // il merletto: al fronte esterno ventagli di filamenti finissimi che si ramificano verso fuori (dove la rete non serve muore)
  const vicino = (x: number, y: number) => F.reduce((m0, f) => (Math.hypot(f.x - x, f.y - y) < Math.hypot(m0.x - x, m0.y - y) ? f : m0), F[0])
  const ramo = (x: number, y: number, an: number, w: number, passi: number, prof: number, tl: number) => {
    reg.t = tl; g.lineWidth = w; g.beginPath(); g.moveTo(x, y)
    for (let k = 0; k < passi; k++) {
      tl = Math.min(0.99, tl + 0.006); reg.t = tl
      an += (r() - 0.5) * 0.6; const nx = x + Math.cos(an) * 2.4, ny = y + Math.sin(an) * 2.4
      if (dentro(nx, ny) <= 0 || nx < 3 || ny < 3 || nx > S - 3 || ny > S - 3) break
      g.lineTo(nx, ny); x = nx; y = ny
      if (prof < 6 && r() < 0.2) { g.stroke(); ramo(x, y, an + (r() < 0.5 ? -1 : 1) * (0.35 + r() * 0.4), w * 0.8, passi - k, prof + 1, tl); reg.t = tl; g.lineWidth = w; g.beginPath(); g.moveTo(x, y) }
    }
    g.stroke()
  }
  g.globalAlpha = 0.38
  for (let i = 0; i < n; i++) {
    const q0 = P[i]
    if (q0.m > 0.6 || r() > 0.3 || performance.now() - t0 > 800) continue
    const f = vicino(q0.x, q0.y), an = Math.atan2(q0.y - f.y, q0.x - f.x) + (r() - 0.5) * 0.6
    ramo(q0.x, q0.y, an, 0.5, 18 + Math.floor(r() * 22), 0, 0.5 + 0.25 * rango[i])
  }
  // i capillari: i tubi sottili che restano vivi, senza alone
  reg.L = 'B'
  for (let e = 0; e < m; e++) { const rel = D[e] / Dmax; if (rel > 0.02 && rel <= 0.12) { reg.t = tE(e) + 0.04; g.globalAlpha = 0.25 + 2 * rel; tubo(e, 0.6 + 6 * rel) } }
  // le vene: lo spessore viene dal flusso che portano (il tronco tra due corpi è più grosso dei rami); il tubo passa
  // morbido attraverso i nodi: da metà di un tubo a metà dell'altro, curvando sul nodo (niente spigoli, niente segmenti)
  const Qmax = Math.max(...Q)
  const vene: number[] = []; for (let e = 0; e < m; e++) if (D[e] / Dmax > 0.12 && Q[e] / Qmax > 0.035) vene.push(e)
  const larg = (e: number) => 0.7 + W * 1.2 * Math.pow(Q[e] / Qmax, 0.85)
  const mezzo = (e: number) => ({ x: (P[ea[e]].x + P[eb[e]].x) / 2, y: (P[ea[e]].y + P[eb[e]].y) / 2 })
  const perNodo: number[][] = Array.from({ length: n }, () => [])
  for (const e of vene) { perNodo[ea[e]].push(e); perNodo[eb[e]].push(e) }
  const disegnaVene = (k: number, alpha: (w: number) => number) => {
    for (let i = 0; i < n; i++) {
      const es = perNodo[i]; if (!es.length) continue
      const N0 = P[i]
      reg.t = tN(i)
      if (es.length === 1) { const M = mezzo(es[0]), w = larg(es[0]) * k; g.globalAlpha = alpha(w); g.lineWidth = w; g.beginPath(); g.moveTo(N0.x, N0.y); g.lineTo(M.x, M.y); g.stroke(); continue }
      // ogni vena prosegue nella sua continuazione più diritta (come un tubo che si biforca), non con tutte: niente groppi sul nodo
      const dir = (e: number) => { const M = mezzo(e); const l = Math.hypot(M.x - N0.x, M.y - N0.y) || 1; return [(M.x - N0.x) / l, (M.y - N0.y) / l] }
      const fatte = new Set<string>()
      for (let a2 = 0; a2 < es.length; a2++) {
        const da = dir(es[a2]); let b2 = -1, best = 2
        for (let c2 = 0; c2 < es.length; c2++) if (c2 !== a2) { const dc = dir(es[c2]), cos = da[0] * dc[0] + da[1] * dc[1]; if (cos < best) { best = cos; b2 = c2 } }
        const key = a2 < b2 ? `${a2},${b2}` : `${b2},${a2}`
        if (b2 < 0 || fatte.has(key)) continue
        fatte.add(key)
        const A = mezzo(es[a2]), B = mezzo(es[b2]), wa = larg(es[a2]) * k, wb = larg(es[b2]) * k
        // lo spessore passa da una vena all'altra in tre tratti, senza scalino
        const Q1 = { x: (A.x + N0.x) / 2, y: (A.y + N0.y) / 2 }, Q2 = { x: (B.x + N0.x) / 2, y: (B.y + N0.y) / 2 }
        g.globalAlpha = alpha(wa); g.lineWidth = wa; g.beginPath(); g.moveTo(A.x, A.y); g.quadraticCurveTo(Q1.x, Q1.y, (Q1.x + Q2.x) / 2 * 0.5 + N0.x * 0.5, (Q1.y + Q2.y) / 2 * 0.5 + N0.y * 0.5); g.stroke()
        const Mx = (Q1.x + Q2.x) / 2 * 0.5 + N0.x * 0.5, My = (Q1.y + Q2.y) / 2 * 0.5 + N0.y * 0.5
        g.globalAlpha = alpha(wb); g.lineWidth = (wa + wb) / 2; g.beginPath(); g.moveTo(Mx, My); g.quadraticCurveTo(Q2.x, Q2.y, B.x, B.y); g.stroke()
      }
    }
  }
  // l'alone del tubo senza filtri (costano): due passate larghe e trasparenti
  disegnaVene(2.2, () => 0.1); disegnaVene(1.6, () => 0.16)
  g.strokeStyle = g.fillStyle = colore
  disegnaVene(1, w => Math.min(1, 0.45 + w / W * 0.5))
  // ife che escono dalle vene grosse, corte e arricciate
  reg.L = 'A'
  for (const e of vene.slice().sort((x, y) => Q[x] - Q[y]).slice(-60)) if (r() < 0.5) { reg.t = tE(e) + 0.06; const A = P[ea[e]]; let x = A.x, y = A.y, an = r() * 6.283; g.globalAlpha = 0.35; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6 + r() * 10; k++) { an += (r() - 0.5) * 0.9; x += Math.cos(an) * 2.5; y += Math.sin(an) * 2.5; g.lineTo(x, y) } g.stroke() }
  // i corpi sui fulcri: masse rugose di grumi (il plasmodio che mangia), il principale più grande
  reg.L = 'B'
  for (const [iF, f] of F.entries()) {
    // il corpo: più piccolo e diffuso (non una pallina incollata), grumi chiari che sfumano nella rete, e un ventaglio di filamenti
    const R1 = S * (0.014 + 0.032 * f.m), base = 0.12 * iF / Math.max(1, F.length)
    for (let i = 0; i < 60 + 120 * f.m; i++) { const a = r() * 6.283, d = Math.pow(r(), 0.7) * R1 * (0.85 + 0.3 * lb(a)), rr0 = R1 * (0.05 + r() * 0.16) * (1 - 0.5 * d / R1); reg.t = base + 0.1 * d / R1; g.globalAlpha = 0.1 + r() * 0.22; g.beginPath(); g.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, rr0, 0, 6.283); g.fill() }
    g.lineWidth = 0.5
    for (let i = 0; i < 24 + 40 * f.m; i++) { reg.t = base + 0.08; let x = f.x, y = f.y, an = r() * 6.283; const L0 = R1 * (1.2 + r() * 1.4); g.globalAlpha = 0.18 + r() * 0.2; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 10; k++) { an += (r() - 0.5) * 0.5; x += Math.cos(an) * L0 / 10; y += Math.sin(an) * L0 / 10; g.lineTo(x, y) } g.stroke() }
    // le pieghe: piccoli vuoti dentro il corpo
    reg.t = base + 0.11
    g.save(); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 12 * f.m + 3; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * R1 * 0.85; g.globalAlpha = 0.3; g.beginPath(); g.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, R1 * (0.02 + r() * 0.05), 0, 6.283); g.fill() } g.restore()
  }
  g.globalAlpha = 1
  reg.L = 'A'
}
