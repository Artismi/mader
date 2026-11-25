/**
 * Disegnare una cosa, non ricalcarla. Dagli schizzi ha imparato com'è fatta (le parti, dove stanno, quanto sono grandi,
 * che forma hanno e quanto variano: forme/parti.json). Ogni volta IMMAGINA la cosa da capo: sceglie quali parti,
 * con quali proporzioni, quanto esagerare (la creatività), e poi la DISEGNA nel modo che vuole:
 *  - schizzo: il gesto segue le parti, insiste, sbaglia, ripassa (espressionista);
 *  - sagoma: le parti fuse in un'unica forma chiusa, pulita, con curve sue (vettoriale);
 *  - volumi: ogni parte diventa un volume (le chiuse si gonfiano, le aperte diventano tubi), montati e illuminati.
 */
import { newCanvas } from './sheet'

export interface Parte { freq: number; cx: number; cy: number; w: number; h: number; sdx: number; sdy: number; sdw: number; sdh: number; chiuso: number; dritto: number; ordine: number; esempi: number[][][] }
export interface Cosa { en: string; parti: Parte[]; interi: [number, number[], number[]][][] }
let COSE: Record<string, Cosa> | null = null
export async function caricaCose() { if (COSE) return COSE; try { COSE = (await (await fetch('/forme/parti.json')).json()).cose } catch { COSE = {} } return COSE! }

type Pt = [number, number]
export interface PezzoImmaginato { pts: Pt[]; chiuso: boolean; peso: number; z: number }
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r())

/**
 * immagina la cosa: parte da una struttura intera (un disegno tipico, ogni tratto col suo tipo di parte), così la cosa
 * è sempre completa e coerente; poi la reinventa: ogni parte cambia proporzioni dentro la variazione che ha imparato
 * per quel tipo, a volte è sostituita da un'altra forma dello stesso tipo (presa da altri disegni), i dettagli rari
 * a volte cadono; con più creatività le proporzioni si esagerano. creativita 0 → tipica, 1 → libera.
 */
export function immagina(c: Cosa, r: () => number, creativita = 0.5): PezzoImmaginato[] {
  const base = c.interi[Math.floor(Math.pow(r(), 1.5) * c.interi.length)] ?? []
  // un'esagerazione d'insieme (per tutta la cosa): più larga, più alta, più tozza
  const ex = 1 + (r() - 0.5) * creativita * 0.5, ey = 1 + (r() - 0.5) * creativita * 0.5
  const out: PezzoImmaginato[] = []
  base.forEach(([tipo, xs, ys], i) => {
    const p = c.parti[tipo]
    if (p && p.freq < 0.35 && r() < creativita * 0.5) return
    let X = xs.map(v => v / 255), Y = ys.map(v => v / 255)
    const x0 = Math.min(...X), x1 = Math.max(...X), y0 = Math.min(...Y), y1 = Math.max(...Y)
    let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = Math.max(0.02, x1 - x0), h = Math.max(0.02, y1 - y0)
    // sostituzione: la stessa parte, con la forma di un altro disegno
    if (p && X.length > 2 && r() < 0.25 + creativita * 0.5) { const es = p.esempi[Math.floor(r() * p.esempi.length)]; X = es[0].map(v => x0 + v * w); Y = es[1].map(v => y0 + v * h) }
    // proporzioni della parte, nella variazione imparata
    if (p) { const kw = 1 + gauss(r) * (p.sdw / Math.max(0.05, p.w)) * creativita * 0.6, kh = 1 + gauss(r) * (p.sdh / Math.max(0.05, p.h)) * creativita * 0.6; const ncx = cx + gauss(r) * p.sdx * creativita * 0.3, ncy = cy + gauss(r) * p.sdy * creativita * 0.3; X = X.map(v => ncx + (v - cx) * kw); Y = Y.map(v => ncy + (v - cy) * kh); cx = ncx; cy = ncy }
    const fase = r() * 6.28, amp = 0.015 * creativita
    const pts: Pt[] = X.map((x, j) => { const t = j / Math.max(1, X.length - 1); return [0.5 + (x - 0.5) * ex + Math.sin(t * 6 + fase) * amp, 0.5 + (Y[j] - 0.5) * ey + Math.cos(t * 5 + fase) * amp] })
    const chiuso = Math.hypot(X[0] - X[X.length - 1], Y[0] - Y[Y.length - 1]) < 0.06 && X.length > 3
    out.push({ pts, chiuso, peso: p?.freq ?? 0.5, z: i })
  })
  return out
}

/** schizzo espressionista: ogni pezzo ripassato 2-4 volte, il tratto trema, cambia spessore, a volte sfora */
export function schizzo(pz: PezzoImmaginato[], S: number, colore: string, r: () => number, energia = 0.6): HTMLCanvasElement {
  const cv = newCanvas(S, S), g = cv.getContext('2d')!
  g.strokeStyle = colore; g.lineCap = 'round'; g.lineJoin = 'round'
  const M = S * 0.08, K = S - 2 * M
  for (const p of pz) {
    const passate = 1 + Math.round(1 + r() * 2 * energia + p.peso)
    for (let k = 0; k < passate; k++) {
      const dev = S * 0.008 * (1 + energia * 2) * (k ? 1 : 0.4)
      const pts = p.pts.map(([x, y]) => [M + x * K + gauss(r) * dev, M + y * K + gauss(r) * dev] as Pt)
      if (p.chiuso && r() < 0.6) pts.push([pts[0][0] + gauss(r) * dev * 2, pts[0][1] + gauss(r) * dev * 2])
      // sfora: il tratto continua un poco oltre l'ultimo punto
      if (pts.length > 1 && r() < energia * 0.6) { const a = pts[pts.length - 2], b = pts[pts.length - 1]; pts.push([b[0] + (b[0] - a[0]) * 0.6, b[1] + (b[1] - a[1]) * 0.6]) }
      g.globalAlpha = k ? 0.35 + r() * 0.35 : 0.9
      for (let i = 1; i < pts.length; i++) {
        g.lineWidth = S * (0.003 + r() * 0.006 * (1 + energia)) * (k ? 0.7 : 1.2)
        g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1])
        const mx = (pts[i - 1][0] + pts[i][0]) / 2 + gauss(r) * dev * 0.5, my = (pts[i - 1][1] + pts[i][1]) / 2 + gauss(r) * dev * 0.5
        g.quadraticCurveTo(mx, my, pts[i][0], pts[i][1]); g.stroke()
      }
    }
  }
  g.globalAlpha = 1
  return cv
}

/** il campo dei pezzi a griglia N: le chiuse piene, le aperte come tubi; restituisce copertura e altezza (volume) */
function campo(pz: PezzoImmaginato[], N: number, spessore = 0.035) {
  const M = N * 0.08, K = N - 2 * M, cov = new Float32Array(N * N), alt = new Float32Array(N * N)
  for (const p of pz) {
    const pts = p.pts.map(([x, y]) => [M + x * K, M + y * K] as Pt)
    const t = newCanvas(N, N), g = t.getContext('2d', { willReadFrequently: true })!
    g.fillStyle = g.strokeStyle = '#000'; g.lineCap = 'round'; g.lineJoin = 'round'
    if (p.chiuso) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill() }
    g.lineWidth = N * spessore * (p.chiuso ? 0.6 : 1); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke()
    const d = g.getImageData(0, 0, N, N).data, m = new Float32Array(N * N)
    for (let i = 0; i < N * N; i++) m[i] = d[i * 4 + 3] > 100 ? 1e6 : 0
    // distanza dal bordo (chamfer)
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (!m[i]) continue; let v = m[i]; if (x) v = Math.min(v, m[i - 1] + 1); if (y) v = Math.min(v, m[i - N] + 1); if (!x || !y) v = 1; m[i] = v }
    for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) { const i = y * N + x; if (!m[i]) continue; let v = m[i]; if (x < N - 1) v = Math.min(v, m[i + 1] + 1); if (y < N - 1) v = Math.min(v, m[i + N] + 1); if (x === N - 1 || y === N - 1) v = 1; m[i] = v }
    let dm = 1; for (let i = 0; i < N * N; i++) if (m[i] > dm) dm = m[i]
    const sopra = p.z * N * 0.01
    for (let i = 0; i < N * N; i++) if (m[i]) { cov[i] = 1; const q = m[i] / dm, hh = Math.sqrt(Math.max(0, q * (2 - q))) * dm * 0.7 + sopra; if (hh > alt[i]) alt[i] = hh }
  }
  return { cov, alt }
}

/** sagoma: le parti fuse, i bordi ammorbiditi, una forma chiusa sola (con i suoi vuoti) */
export function sagoma(pz: PezzoImmaginato[], S: number, colore: string, morbido = 0.5): HTMLCanvasElement {
  const N = 220, { cov } = campo(pz, N, 0.05)
  const t = newCanvas(N, N), tg = t.getContext('2d')!, id = tg.createImageData(N, N)
  for (let i = 0; i < N * N; i++) { id.data[i * 4 + 3] = cov[i] ? 255 : 0 }
  tg.putImageData(id, 0, 0)
  // ammorbidisco e ritaglio a soglia: le parti si saldano con curve continue
  const b = newCanvas(S, S), bg = b.getContext('2d', { willReadFrequently: true })!
  bg.filter = `blur(${S * (0.006 + morbido * 0.012)}px)`; bg.drawImage(t, 0, 0, S, S)
  const d = bg.getImageData(0, 0, S, S), D = d.data, c = [parseInt(colore.slice(1, 3), 16), parseInt(colore.slice(3, 5), 16), parseInt(colore.slice(5, 7), 16)]
  for (let i = 0; i < S * S; i++) { const a = D[i * 4 + 3], v = Math.max(0, Math.min(255, (a - 110) * 12)); D[i * 4] = c[0]; D[i * 4 + 1] = c[1]; D[i * 4 + 2] = c[2]; D[i * 4 + 3] = v }
  const out = newCanvas(S, S); out.getContext('2d')!.putImageData(d, 0, 0)
  return out
}

/** volumi: ogni parte un volume, montati per ordine, con luce, riflesso e ombra portata */
export function volumi(pz: PezzoImmaginato[], S: number, colore: string, o: { luce?: number; lucido?: number; materia?: HTMLCanvasElement } = {}): HTMLCanvasElement {
  const N = S, { cov, alt } = campo(pz, N, 0.04)
  const ang = o.luce ?? -2.3, Lx = Math.cos(ang), Ly = Math.sin(ang), Lz = 0.7, ln = Math.hypot(Lx, Ly, Lz)
  const out = newCanvas(S, S), g = out.getContext('2d')!
  // ombra portata
  const sh = newCanvas(N, N), sg = sh.getContext('2d')!, sid = sg.createImageData(N, N)
  for (let i = 0; i < N * N; i++) sid.data[i * 4 + 3] = cov[i] ? 255 : 0
  sg.putImageData(sid, 0, 0)
  g.save(); g.globalAlpha = 0.3; g.filter = `blur(${S * 0.02}px)`; g.drawImage(sh, -Lx * S * 0.025, -Ly * S * 0.025 + S * 0.015); g.restore()
  g.globalCompositeOperation = 'source-in'; g.fillStyle = '#1e1812'; g.fillRect(0, 0, S, S); g.globalCompositeOperation = 'source-over'
  const prima = g.getImageData(0, 0, S, S).data, id = g.createImageData(S, S), D = id.data
  const base = [parseInt(colore.slice(1, 3), 16), parseInt(colore.slice(3, 5), 16), parseInt(colore.slice(5, 7), 16)]
  const md = o.materia?.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, o.materia.width, o.materia.height).data
  const lucido = o.lucido ?? 0.45
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const i = y * N + x
    if (!cov[i]) { for (let c = 0; c < 4; c++) D[i * 4 + c] = prima[i * 4 + c]; continue }
    const nx = -(alt[i + 1] - alt[i - 1]) * 0.5, ny = -(alt[i + N] - alt[i - N]) * 0.5, nl = Math.hypot(nx, ny, 1)
    const dif = Math.max(0, (nx * Lx + ny * Ly + Lz) / (nl * ln)), spec = Math.pow(dif, 24) * lucido, bordo = Math.pow(1 - 1 / nl, 2)
    // occlusione: dove un volume sta sotto un altro (l'altezza salta), scurisce
    const salto = Math.max(0, Math.max(alt[i - 1], alt[i + 1], alt[i - N], alt[i + N]) - alt[i] - 2) / 8
    let col = base
    if (md && o.materia) { const sx = Math.min(o.materia.width - 1, Math.max(0, Math.round(((x + nx * 5) / S) * o.materia.width))), sy = Math.min(o.materia.height - 1, Math.max(0, Math.round(((y + ny * 5) / S) * o.materia.height))), k = (sy * o.materia.width + sx) * 4, a = md[k + 3] / 255; col = [base[0] * (1 - a) + md[k] * a, base[1] * (1 - a) + md[k + 1] * a, base[2] * (1 - a) + md[k + 2] * a] }
    for (let c = 0; c < 3; c++) D[i * 4 + c] = Math.min(255, col[c] * (0.3 + 0.8 * dif) * (1 - Math.min(0.5, salto)) + 255 * spec + 35 * bordo)
    D[i * 4 + 3] = 255
  }
  g.putImageData(id, 0, 0)
  return out
}
