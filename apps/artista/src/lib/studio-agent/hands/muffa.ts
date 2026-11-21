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

function rng(seed: number) { let a = seed >>> 0 || 1; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296) }
/** rumore liscio periodico sull'angolo: quanto cresce la colonia in ogni direzione (le colonie vere non sono dischi) */
function lobi(r: () => number, n = 5) { const ph = Array.from({ length: n }, () => r() * 6.283), am = Array.from({ length: n }, (_, i) => (r() * 0.6) / (i + 1)); return (a: number) => 1 + am.reduce((s, x, i) => s + x * Math.sin((i + 1) * a + ph[i]), 0) }

export type Specie = 'micelio' | 'batterio'
export interface Colonia { x: number; y: number; specie: Specie; vigore: number }

export function disegnaMuffa(seme: number, colore: string, S = 560): HTMLCanvasElement {
  // il seme si mescola prima (semi vicini darebbero colonie simili)
  let h0 = (seme ^ 0x9e3779b9) >>> 0; h0 = Math.imul(h0 ^ (h0 >>> 16), 0x85ebca6b) >>> 0; h0 = Math.imul(h0 ^ (h0 >>> 13), 0xc2b2ae35) >>> 0; h0 = (h0 ^ (h0 >>> 16)) >>> 0
  const r = rng(h0)
  const cv = newCanvas(S, S), g = cv.getContext('2d')!
  // la forma principale: la rete tra più fulcri (Physarum); a volte le colonie di prima
  if (r() < 0.6) { rete(g, S, colore, r); alone(cv, S, colore, r); return cv }
  // le colonie: una o più, di specie diverse, seminate vicine così si incontrano
  const n = 1 + Math.floor(r() * r() * 4)
  const col: Colonia[] = []
  for (let i = 0; i < n; i++) { const a = r() * 6.283, d = i ? S * (0.12 + r() * 0.2) : 0; col.push({ x: S / 2 + Math.cos(a) * d + (r() - 0.5) * S * 0.08, y: S / 2 + Math.sin(a) * d + (r() - 0.5) * S * 0.08, specie: r() < 0.68 ? 'micelio' : 'batterio', vigore: i ? 0.4 + r() * 0.5 : 1 }) }
  // chi occupa cosa (per l'incontro): una griglia grossa con il numero della colonia
  const Q = 4, GW = Math.ceil(S / Q), chi = new Int16Array(GW * GW).fill(-1), densita = new Float32Array(GW * GW)
  // i batteri si disegnano prima (stanno sotto, piatti sull'agar), il micelio sopra (è un feltro che si alza)
  for (const [k, c] of col.entries()) if (c.specie === 'batterio') batteri(g, S, c, k, colore, r, chi, GW, Q)
  micelio(g, S, col, colore, r, chi, densita, GW, Q)
  alone(cv, S, colore, r)
  return cv
}

/**
 * I batteri: crescita per aggregazione (DLA con riduzione del rumore), come le colonie di Bacillus su agar povero.
 * Particelle di nutrimento vagano a caso e, quando toccano la colonia abbastanza volte, ci si attaccano: le punte, più esposte,
 * crescono più in fretta e si dividono; nascono dita ramificate. Più colpi servono, più le dita sono grasse e lisce.
 */
function batteri(g: CanvasRenderingContext2D, S: number, c: Colonia, k: number, colore: string, r: () => number, chi: Int16Array, GW: number, Q: number) {
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
  const tmp = newCanvas(S, S), q = tmp.getContext('2d')!, anelli = 2 + Math.floor(r() * 4)
  q.fillStyle = colore
  for (let i = 0; i < N * N; i++) if (occ[i]) { const x = (px[i] || i % N) * sc, y = (py[i] || (i / N) | 0) * sc, vec = 1 - eta[i] / n, anello = 0.78 + 0.22 * Math.sin((eta[i] / n) * 6.283 * anelli); q.globalAlpha = (0.5 + 0.5 * vec) * anello; q.beginPath(); q.arc(x, y, sc * (1.1 + 0.9 * vec), 0, 6.283); q.fill() }
  g.save(); g.globalAlpha = 0.22; g.filter = `blur(${Math.round(S * 0.012)}px)`; g.drawImage(tmp, 0, 0); g.filter = 'none'; g.globalAlpha = 1; g.drawImage(tmp, 0, 0); g.restore()
}

/** il micelio: punte che crescono sentendo i vicini, si ramificano, si fermano dove c'è un'altra colonia */
function micelio(g: CanvasRenderingContext2D, S: number, col: Colonia[], colore: string, r: () => number, chi: Int16Array, densita: Float32Array, GW: number, Q: number) {
  interface Punta { x: number; y: number; a: number; c: number; w: number; eta: number; vive: boolean }
  const punte: Punta[] = []
  col.forEach((c, k) => { if (c.specie !== 'micelio') return; const n0 = 20 + Math.floor(r() * 16); const ino = S * (0.02 + 0.03 * r()); for (let i = 0; i < n0; i++) { const a0 = r() * 6.283, d0 = Math.sqrt(r()) * ino; punte.push({ x: c.x + Math.cos(a0) * d0, y: c.y + Math.sin(a0) * d0, a: a0 + (r() - 0.5) * 1.2, c: k, w: 1, eta: 0, vive: true }) } })
  if (!punte.length) return
  g.strokeStyle = colore; g.fillStyle = colore; g.lineCap = 'round'
  const fronte: { t: number; d: number[] }[] = []
  const notte = 60 + Math.floor(r() * 40) // ogni quanti passi il fronte si ferma (una "giornata")
  const passi = 340, MAXP = 1700
  const forma = col.map(() => lobi(r, 5)), Rmax = col.map(c => S * (0.2 + 0.18 * c.vigore))
  const dens = (x: number, y: number) => { const gx = (x / Q) | 0, gy = (y / Q) | 0; return gx < 0 || gy < 0 || gx >= GW || gy >= GW ? 99 : densita[gy * GW + gx] }
  const spore: { x: number; y: number; c: number; giorno: number }[] = []
  for (let t = 0; t < passi; t++) {
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
      densita[gy * GW + gx] += 0.35
      // il tratto: sottile e trasparente, si somma in feltro
      g.globalAlpha = 0.22 + 0.25 * p.w; g.lineWidth = 0.5 + 0.9 * p.w
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(nx, ny); g.stroke()
      p.x = nx; p.y = ny; p.eta++
      // ramificazione laterale, più frequente nelle ife giovani; le ramificazioni sono più sottili
      if (punte.length < MAXP && r() < 0.045 * (1 - p.eta / 600)) punte.push({ x: p.x, y: p.y, a: p.a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5), c: p.c, w: p.w * 0.8, eta: 0, vive: true })
      // a sera sporula: teste di spore sulle ife (più dense negli anelli)
      if (sera && r() < 0.08) spore.push({ x: p.x, y: p.y, c: p.c, giorno })
    }
    if (t % notte === 0) fronte.push({ t, d: [] })
  }
  // il feltro: dove le ife sono tante si fa una massa opaca, morbida (la densità, sfocata)
  {
    const f = newCanvas(GW, GW), fq = f.getContext('2d')!, im = fq.createImageData(GW, GW)
    const h = colore.replace('#', ''), R0 = parseInt(h.slice(0, 2), 16), G0 = parseInt(h.slice(2, 4), 16), B0 = parseInt(h.slice(4, 6), 16)
    for (let i = 0; i < GW * GW; i++) { const v = Math.min(1, Math.max(0, densita[i] - 1.2) / 5); im.data[i * 4] = R0; im.data[i * 4 + 1] = G0; im.data[i * 4 + 2] = B0; im.data[i * 4 + 3] = Math.round(v * v * 200) }
    fq.putImageData(im, 0, 0)
    g.save(); g.globalAlpha = 1; g.filter = `blur(${Math.round(S * 0.01)}px)`; g.imageSmoothingQuality = 'high'; g.drawImage(f, 0, 0, S, S); g.filter = 'none'; g.restore()
  }
  // le spore: piccole teste (un punto con una corona), fitte negli anelli della zonazione
  for (const s of spore) {
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
    for (let i = 0; i < 260; i++) { const a0 = r() * 6.283, d0 = Math.sqrt(r()) * R1; let x = c.x + Math.cos(a0) * d0, y = c.y + Math.sin(a0) * d0, an = r() * 6.283; g.globalAlpha = 0.25; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { an += (r() - 0.5) * 1.4; x += Math.cos(an) * 2; y += Math.sin(an) * 2; g.lineTo(x, y) } g.stroke() }
  }
  g.globalAlpha = 1
}

/** l'alone: sotto la colonia il terreno si è bagnato e asciugato come una macchia di caffè. Non un contorno pulito:
 *  la macchia è spostata dove il liquido è colato, il bordo è irregolare e a tratti si interrompe; a volte non c'è. */
function alone(cv: HTMLCanvasElement, S: number, colore: string, r: () => number) {
  if (r() < 0.3) return
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
  const g = cv.getContext('2d')!
  g.save(); g.globalCompositeOperation = 'destination-over'; g.imageSmoothingQuality = 'high'; g.drawImage(t, 0, 0, S, S); g.restore()
}

/**
 * La rete (Tero et al. 2010): il Physarum collega le fonti di cibo con tubi che si adattano al flusso. Un grafo fitto
 * riempie una sagoma organica; a ogni ciclo una coppia di fulcri fa da sorgente e pozzo, si risolvono le pressioni
 * (Kirchhoff, gradiente coniugato), il flusso in ogni tubo è Q = D/L·Δp, e la conduttanza cresce dove passa flusso e
 * si consuma dove no: dD/dt = f(|Q|) − D, con f sigmoide (gerarchia). Restano vene spesse sulle strade di priorità,
 * capillari sottili, lacune vuote; al fronte esterno il merletto.
 */
function rete(g: CanvasRenderingContext2D, S: number, colore: string, r: () => number) {
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
  // il disegno
  const Dmax = Math.max(...D), W = S * 0.022
  g.strokeStyle = g.fillStyle = colore; g.lineCap = 'round'; g.lineJoin = 'round'
  // un tubo non è un segmento: si piega un poco, sempre nello stesso verso per lo stesso tubo
  const tubo = (e: number, w: number) => { const A = P[ea[e]], B = P[eb[e]], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, nx = -(B.y - A.y), ny = B.x - A.x, k = ((e * 2654435761) % 1000) / 1000 - 0.5; g.lineWidth = w; g.beginPath(); g.moveTo(A.x, A.y); g.quadraticCurveTo(mx + nx * k * 0.35, my + ny * k * 0.35, B.x, B.y); g.stroke() }
  // il merletto: al fronte esterno ventagli di filamenti finissimi che si ramificano verso fuori (dove la rete non serve muore)
  const vicino = (x: number, y: number) => F.reduce((m0, f) => (Math.hypot(f.x - x, f.y - y) < Math.hypot(m0.x - x, m0.y - y) ? f : m0), F[0])
  const ramo = (x: number, y: number, an: number, w: number, passi: number, prof: number) => {
    g.lineWidth = w; g.beginPath(); g.moveTo(x, y)
    for (let k = 0; k < passi; k++) {
      an += (r() - 0.5) * 0.6; const nx = x + Math.cos(an) * 2.4, ny = y + Math.sin(an) * 2.4
      if (dentro(nx, ny) <= 0 || nx < 3 || ny < 3 || nx > S - 3 || ny > S - 3) break
      g.lineTo(nx, ny); x = nx; y = ny
      if (prof < 6 && r() < 0.2) { g.stroke(); ramo(x, y, an + (r() < 0.5 ? -1 : 1) * (0.35 + r() * 0.4), w * 0.8, passi - k, prof + 1); g.lineWidth = w; g.beginPath(); g.moveTo(x, y) }
    }
    g.stroke()
  }
  g.globalAlpha = 0.38
  for (let i = 0; i < n; i++) {
    const q0 = P[i]
    if (q0.m > 0.6 || r() > 0.3 || performance.now() - t0 > 800) continue
    const f = vicino(q0.x, q0.y), an = Math.atan2(q0.y - f.y, q0.x - f.x) + (r() - 0.5) * 0.6
    ramo(q0.x, q0.y, an, 0.5, 18 + Math.floor(r() * 22), 0)
  }
  // i capillari: i tubi sottili che restano vivi, senza alone
  for (let e = 0; e < m; e++) { const rel = D[e] / Dmax; if (rel > 0.02 && rel <= 0.12) { g.globalAlpha = 0.25 + 2 * rel; tubo(e, 0.6 + 6 * rel) } }
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
      if (es.length === 1) { const M = mezzo(es[0]), w = larg(es[0]) * k; g.globalAlpha = alpha(w); g.lineWidth = w; g.beginPath(); g.moveTo(N0.x, N0.y); g.lineTo(M.x, M.y); g.stroke(); continue }
      for (let a2 = 0; a2 < es.length; a2++) for (let b2 = a2 + 1; b2 < es.length; b2++) {
        const A = mezzo(es[a2]), B = mezzo(es[b2]), w = Math.min(larg(es[a2]), larg(es[b2])) * k
        g.globalAlpha = alpha(w); g.lineWidth = w; g.beginPath(); g.moveTo(A.x, A.y); g.quadraticCurveTo(N0.x, N0.y, B.x, B.y); g.stroke()
      }
    }
  }
  // l'alone del tubo senza filtri (costano): due passate larghe e trasparenti
  disegnaVene(2.2, () => 0.1); disegnaVene(1.6, () => 0.16)
  g.strokeStyle = g.fillStyle = colore
  disegnaVene(1, w => Math.min(1, 0.45 + w / W * 0.5))
  // ife che escono dalle vene grosse, corte e arricciate
  for (const e of vene.slice().sort((x, y) => Q[x] - Q[y]).slice(-60)) if (r() < 0.5) { const A = P[ea[e]]; let x = A.x, y = A.y, an = r() * 6.283; g.globalAlpha = 0.35; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6 + r() * 10; k++) { an += (r() - 0.5) * 0.9; x += Math.cos(an) * 2.5; y += Math.sin(an) * 2.5; g.lineTo(x, y) } g.stroke() }
  // i corpi sui fulcri: masse rugose di grumi (il plasmodio che mangia), il principale più grande
  for (const f of F) {
    const R1 = S * (0.02 + 0.05 * f.m)
    for (let i = 0; i < 90 + 200 * f.m; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * R1 * (0.85 + 0.3 * lb(a)), rr0 = R1 * (0.08 + r() * 0.22); g.globalAlpha = 0.25 + r() * 0.35; g.beginPath(); g.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, rr0, 0, 6.283); g.fill() }
    // le pieghe: piccoli vuoti dentro il corpo
    g.save(); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 12 * f.m + 3; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * R1 * 0.85; g.globalAlpha = 0.3; g.beginPath(); g.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, R1 * (0.02 + r() * 0.05), 0, 6.283); g.fill() } g.restore()
  }
  g.globalAlpha = 1
}
