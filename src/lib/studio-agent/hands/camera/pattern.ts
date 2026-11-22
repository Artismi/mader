/**
 * Il caleidoscopio (da stateyour/pattern/src/camera/pattern.js): un ornamento vero non è una figura copiata accanto
 * a sé, è un pezzo di piano (il dominio fondamentale) ripetuto da un gruppo di simmetrie. Qui il pezzo è un triangolo
 * della sezione dell'universo: la natura disegna il triangolo, gli specchi fanno il resto, come nei cristalli e nei
 * fiocchi di neve.
 *   esagoni p6m · quadrati p4m · specchio pmm · rotazione p4 · traslazione p1 · una (la finestra da sola)
 */
import { bellezza, type Seg } from './sezione'

export type Gruppo = 'esagoni' | 'quadrati' | 'specchio' | 'rotazione' | 'traslazione' | 'una' | Carta | Fregio
/** i 17 gruppi delle carte da parati (tutti i modi di ripetere un motivo nel piano) */
export type Carta = 'p1' | 'p2' | 'pm' | 'pg' | 'cm' | 'pmm' | 'pmg' | 'pgg' | 'cmm' | 'p4' | 'p4m' | 'p4g' | 'p3' | 'p3m1' | 'p31m' | 'p6' | 'p6m'
/** i 7 gruppi dei fregi (ripetere lungo una striscia: le cornici, le greche, i cordoni) */
export type Fregio = 'f1' | 'f11g' | 'f1m1' | 'f11m' | 'f2' | 'f2mg' | 'f2mm'
export const CARTE: Carta[] = ['p1', 'p2', 'pm', 'pg', 'cm', 'pmm', 'pmg', 'pgg', 'cmm', 'p4', 'p4m', 'p4g', 'p3', 'p3m1', 'p31m', 'p6', 'p6m']
export const FREGI: Fregio[] = ['f1', 'f11g', 'f1m1', 'f11m', 'f2', 'f2mg', 'f2mm']
export interface Ripeti { gruppo: Gruppo; angolo: number }
type T6 = [number, number, number, number, number, number]
const applica = (T: T6, x: number, y: number): [number, number] => [T[0] * x + T[1] * y + T[4], T[2] * x + T[3] * y + T[5]]
const rotIntorno = (th: number, cx: number, cy: number): T6 => { const c = Math.cos(th), s = Math.sin(th); return [c, -s, s, c, cx - c * cx + s * cy, cy - s * cx - c * cy] }
const riflIntorno = (th: number, cx: number, cy: number): T6 => { const c = Math.cos(2 * th), s = Math.sin(2 * th); return [c, s, s, -c, cx - c * cx - s * cy, cy - s * cx + c * cy] }
const componi = (A: T6, B: T6): T6 => [A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3], A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3], A[0] * B[4] + A[1] * B[5] + A[4], A[2] * B[4] + A[3] * B[5] + A[5]]
const ID: T6 = [1, 0, 0, 1, 0, 0]

export interface Geometria { gruppo: Gruppo; dominio: [number, number][]; copie: T6[]; poligono: [number, number][]; reticolo: { a: [number, number]; b: [number, number] } | null; centro: [number, number]; fregio?: boolean }

// ---------- i 17 gruppi e i 7 fregi, costruiti tutti allo stesso modo: un reticolo, le operazioni del gruppo (una matrice
// e una traslazione in frazioni del reticolo), un pezzo di piano (il dominio) di area cella/ordine attorno al centro.
type Op = [number[], number, number]
const I = [1, 0, 0, 1], R2 = [-1, 0, 0, -1], MX = [-1, 0, 0, 1], MY = [1, 0, 0, -1], R4 = [0, -1, 1, 0], R43 = [0, 1, -1, 0], DXY = [0, 1, 1, 0], DAN = [0, -1, -1, 0]
const rot = (t: number) => [Math.cos(t), -Math.sin(t), Math.sin(t), Math.cos(t)], rifl = (t: number) => [Math.cos(2 * t), Math.sin(2 * t), Math.sin(2 * t), -Math.cos(2 * t)]
const conC = (ops: Op[]): Op[] => [...ops, ...ops.map(([m, u, v]) => [m, u + 0.5, v + 0.5] as Op)]
const OPS: Record<Carta | Fregio, Op[]> = {
  p1: [[I, 0, 0]], p2: [[I, 0, 0], [R2, 0, 0]], pm: [[I, 0, 0], [MX, 0, 0]], pg: [[I, 0, 0], [MX, 0, 0.5]],
  cm: conC([[I, 0, 0], [MX, 0, 0]]), pmm: [[I, 0, 0], [R2, 0, 0], [MX, 0, 0], [MY, 0, 0]],
  pmg: [[I, 0, 0], [R2, 0, 0], [MX, 0.5, 0], [MY, 0.5, 0]], pgg: [[I, 0, 0], [R2, 0, 0], [MX, 0.5, 0.5], [MY, 0.5, 0.5]],
  cmm: conC([[I, 0, 0], [R2, 0, 0], [MX, 0, 0], [MY, 0, 0]]),
  p4: [[I, 0, 0], [R4, 0, 0], [R2, 0, 0], [R43, 0, 0]],
  p4m: [[I, 0, 0], [R4, 0, 0], [R2, 0, 0], [R43, 0, 0], [MX, 0, 0], [MY, 0, 0], [DXY, 0, 0], [DAN, 0, 0]],
  p4g: [[I, 0, 0], [R4, 0, 0], [R2, 0, 0], [R43, 0, 0], [MX, 0.5, 0.5], [MY, 0.5, 0.5], [DXY, 0.5, 0.5], [DAN, 0.5, 0.5]],
  p3: [0, 1, 2].map(k => [rot((2 * Math.PI * k) / 3), 0, 0] as Op),
  p3m1: [...[0, 1, 2].map(k => [rot((2 * Math.PI * k) / 3), 0, 0] as Op), ...[0, 1, 2].map(k => [rifl(Math.PI / 2 + (2 * Math.PI * k) / 3), 0, 0] as Op)],
  p31m: [...[0, 1, 2].map(k => [rot((2 * Math.PI * k) / 3), 0, 0] as Op), ...[0, 1, 2].map(k => [rifl((2 * Math.PI * k) / 3), 0, 0] as Op)],
  p6: [0, 1, 2, 3, 4, 5].map(k => [rot((Math.PI * k) / 3), 0, 0] as Op),
  p6m: [...[0, 1, 2, 3, 4, 5].map(k => [rot((Math.PI * k) / 3), 0, 0] as Op), ...[0, 1, 2, 3, 4, 5].map(k => [rifl((Math.PI * k) / 6), 0, 0] as Op)],
  f1: [[I, 0, 0]], f11g: [[I, 0, 0], [MY, 0.5, 0]], f1m1: [[I, 0, 0], [MX, 0, 0]], f11m: [[I, 0, 0], [MY, 0, 0]],
  f2: [[I, 0, 0], [R2, 0, 0]], f2mg: [[I, 0, 0], [R2, 0, 0], [MX, 0.5, 0], [MY, 0.5, 0]], f2mm: [[I, 0, 0], [R2, 0, 0], [MX, 0, 0], [MY, 0, 0]],
}
const isCarta = (g: string): g is Carta => (CARTE as string[]).includes(g)
const isFregio = (g: string): g is Fregio => (FREGI as string[]).includes(g)
function geometriaGruppo(g: Carta | Fregio, angolo: number, lato: number): Geometria {
  const l = lato, O: [number, number] = [l / 2, l / 2], th = (angolo * Math.PI) / 180
  // la forma del reticolo: dall'angolo (una parte dell'indirizzo) vengono anche le proporzioni, dove il gruppo le lascia libere
  const fr = ((angolo % 37) / 37), ratio = 0.62 + 0.76 * fr
  let A: [number, number] = [l, 0], B: [number, number] = [0, l]
  if (g === 'p1' || g === 'p2') B = [l * (0.18 + 0.3 * fr), l * (0.75 + 0.3 * (1 - fr))]
  else if (['pm', 'pg', 'pmm', 'pmg', 'pgg', 'cm', 'cmm'].includes(g)) B = [0, l * ratio]
  else if (['p3', 'p3m1', 'p31m', 'p6', 'p6m'].includes(g)) B = [l / 2, (l * Math.sqrt(3)) / 2]
  const fregio = isFregio(g)
  if (fregio) B = [0, l * 1e4]
  const ops = OPS[g]
  // la rotazione di tutto (il gruppo resta lo stesso)
  const Rt = rot(th), ruota = (v: [number, number]): [number, number] => [Rt[0] * v[0] + Rt[1] * v[1], Rt[2] * v[0] + Rt[3] * v[1]]
  const Ar = ruota(A), Br = ruota(B)
  const copie: T6[] = ops.map(([m, u, v]) => {
    // m nel riferimento ruotato: R·m·R⁻¹; poi attorno a O, poi la traslazione u·a + v·b
    const Ri = rot(-th), mm = [Rt[0] * (m[0] * Ri[0] + m[1] * Ri[2]) + Rt[1] * (m[2] * Ri[0] + m[3] * Ri[2]), Rt[0] * (m[0] * Ri[1] + m[1] * Ri[3]) + Rt[1] * (m[2] * Ri[1] + m[3] * Ri[3]), Rt[2] * (m[0] * Ri[0] + m[1] * Ri[2]) + Rt[3] * (m[2] * Ri[0] + m[3] * Ri[2]), Rt[2] * (m[0] * Ri[1] + m[1] * Ri[3]) + Rt[3] * (m[2] * Ri[1] + m[3] * Ri[3])]
    const tx = u * Ar[0] + (fregio ? 0 : v * Br[0]), ty = u * Ar[1] + (fregio ? 0 : v * Br[1])
    return [mm[0], mm[1], mm[2], mm[3], O[0] - mm[0] * O[0] - mm[1] * O[1] + tx, O[1] - mm[2] * O[0] - mm[3] * O[1] + ty] as T6
  })
  // il dominio: un parallelogramma di area cella/ordine con un vertice nel centro (dove stanno gli assi e i centri di rotazione)
  const sc = 1 / Math.sqrt(ops.length)
  let dominio: [number, number][]
  if (fregio) { const h = l * 0.42; const a2 = ruota([l * sc * 1.2, 0]), n2 = ruota([0, h]); dominio = [[O[0], O[1]], [O[0] + a2[0], O[1] + a2[1]], [O[0] + a2[0] + n2[0], O[1] + a2[1] + n2[1]], [O[0] + n2[0], O[1] + n2[1]]] }
  else { const a2: [number, number] = [Ar[0] * sc, Ar[1] * sc], b2: [number, number] = [Br[0] * sc, Br[1] * sc]; dominio = [[O[0], O[1]], [O[0] + a2[0], O[1] + a2[1]], [O[0] + a2[0] + b2[0], O[1] + a2[1] + b2[1]], [O[0] + b2[0], O[1] + b2[1]]] }
  const poligono: [number, number][] = fregio ? dominio : [[O[0], O[1]], [O[0] + Ar[0], O[1] + Ar[1]], [O[0] + Ar[0] + Br[0], O[1] + Ar[1] + Br[1]], [O[0] + Br[0], O[1] + Br[1]]]
  return { gruppo: g, dominio, copie, poligono, reticolo: { a: Ar, b: Br }, centro: O, fregio }
}


export function geometria(rip: Ripeti, lato: number): Geometria {
  if (isCarta(rip.gruppo) || isFregio(rip.gruppo)) return geometriaGruppo(rip.gruppo, rip.angolo, lato)
  const g = rip.gruppo, a = (rip.angolo * Math.PI) / 180, l = lato, O: [number, number] = [l / 2, l / 2]
  if (g === 'esagoni' || g === 'quadrati') {
    const n = g === 'esagoni' ? 6 : 4, r = l / 2, R = r / Math.cos(Math.PI / n)
    const M: [number, number] = [O[0] + r * Math.cos(a), O[1] + r * Math.sin(a)], V: [number, number] = [O[0] + R * Math.cos(a + Math.PI / n), O[1] + R * Math.sin(a + Math.PI / n)]
    const copie: T6[] = []
    for (let k = 0; k < n; k++) { const Rk = rotIntorno((2 * Math.PI * k) / n, O[0], O[1]); copie.push(Rk, componi(Rk, riflIntorno(a, O[0], O[1]))) }
    const poligono = Array.from({ length: n }, (_, k) => [O[0] + R * Math.cos(a + Math.PI / n + (2 * Math.PI * k) / n), O[1] + R * Math.sin(a + Math.PI / n + (2 * Math.PI * k) / n)] as [number, number])
    const reticolo = { a: [2 * r * Math.cos(a), 2 * r * Math.sin(a)] as [number, number], b: [2 * r * Math.cos(a + (2 * Math.PI) / n), 2 * r * Math.sin(a + (2 * Math.PI) / n)] as [number, number] }
    return { gruppo: g, dominio: [O, M, V], copie, poligono, reticolo, centro: O }
  }
  const quadrato: [number, number][] = [[0, 0], [l, 0], [l, l], [0, l]], doppio: [number, number][] = [[0, 0], [2 * l, 0], [2 * l, 2 * l], [0, 2 * l]]
  if (g === 'specchio') return { gruppo: g, dominio: quadrato, copie: [ID, [-1, 0, 0, 1, 2 * l, 0], [1, 0, 0, -1, 0, 2 * l], [-1, 0, 0, -1, 2 * l, 2 * l]], poligono: doppio, reticolo: { a: [2 * l, 0], b: [0, 2 * l] }, centro: [l, l] }
  if (g === 'rotazione') return { gruppo: g, dominio: quadrato, copie: [0, 1, 2, 3].map(k => rotIntorno((k * Math.PI) / 2, l, l)), poligono: doppio, reticolo: { a: [2 * l, 0], b: [0, 2 * l] }, centro: [l, l] }
  return { gruppo: g, dominio: quadrato, copie: [ID], poligono: quadrato, reticolo: g === 'una' ? null : { a: [l, 0], b: [0, l] }, centro: O }
}

function ritaglia(x0: number, y0: number, x1: number, y1: number, P: [number, number][]): [number, number, number, number] | null {
  let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0, n = P.length
  let area = 0; for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; area += p[0] * q[1] - q[0] * p[1] }
  const s = Math.sign(area) || 1
  for (let i = 0; i < n; i++) {
    const p = P[i], q = P[(i + 1) % n], nx = -(q[1] - p[1]) * s, ny = (q[0] - p[0]) * s
    const num = nx * (x0 - p[0]) + ny * (y0 - p[1]), den = nx * dx + ny * dy
    if (Math.abs(den) < 1e-12) { if (num < 0) return null; continue }
    const t = -num / den
    if (den > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t)
    if (t0 > t1) return null
  }
  return [x0 + dx * t0, y0 + dy * t0, x0 + dx * t1, y0 + dy * t1]
}

export interface Motivo extends Geometria { dentro: Seg[]; segmenti: Seg[] }
export function motivo(seg: Seg[], rip: Ripeti, lato: number): Motivo {
  const G = geometria(rip, lato), dentro: Seg[] = [], out: Seg[] = []
  for (const s of seg) { const r = ritaglia(s[0], s[1], s[2], s[3], G.dominio); if (r) dentro.push([r[0], r[1], r[2], r[3], s[4], s[5], s[6], s[7]]) }
  for (const T of G.copie) for (const s of dentro) { const p = applica(T, s[0], s[1]), q = applica(T, s[2], s[3]); out.push([p[0], p[1], q[0], q[1], s[4], s[5], s[6], s[7]]) }
  return { ...G, dentro, segmenti: out }
}

export function rasterizzaPattern(M: Motivo, N = 128) {
  const im = new Uint8Array(N * N)
  if (!M.reticolo) return { im, N }
  const La = Math.hypot(...M.reticolo.a), lato = 2 * La, [cx, cy] = M.centro, x0 = cx - lato / 2, y0 = cy - lato / 2, k = N / lato, { a, b } = M.reticolo
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const ox = i * a[0] + j * b[0], oy = i * a[1] + j * b[1]
    if (Math.abs(ox) > lato * 1.3 || Math.abs(oy) > lato * 1.3) continue
    for (const s of M.segmenti) {
      const ax = (s[0] + ox - x0) * k, ay = (s[1] + oy - y0) * k, bx = (s[2] + ox - x0) * k, by = (s[3] + oy - y0) * k
      if (Math.max(ax, bx) < -2 || Math.min(ax, bx) > N + 2 || Math.max(ay, by) < -2 || Math.min(ay, by) > N + 2) continue
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 1.5)), r = Math.max(0.55, (s[4] * k) / 2)
      for (let t = 0; t <= n; t++) {
        const x = ax + ((bx - ax) * t) / n, y = ay + ((by - ay) * t) / n
        for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
          if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue
          if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r) im[yy * N + xx] = 1
        }
      }
    }
  }
  return { im, N }
}

/** la bellezza di un ornamento: inchiostro giusto, il fondo diviso in celle medie, nitido, linee distese, pochi frammenti */
export function bellezzaPattern(seg: Seg[], rip: Ripeti, lato: number) {
  const M = motivo(seg, rip, lato), zero = { totale: 0, pieno: 0 }
  if (!M.dentro.length || !M.reticolo) return zero
  const { im, N } = rasterizzaPattern(M)
  let pieno = 0; for (const v of im) pieno += v; pieno /= N * N
  if (pieno < 0.02) return { ...zero, pieno }
  const sPieno = Math.exp(-(((pieno - (M.fregio ? 0.1 : 0.2)) / (M.fregio ? 0.06 : 0.1)) ** 2))
  const et = new Int32Array(N * N).fill(-1), coda = new Int32Array(N * N), aree: number[] = []
  for (let s = 0; s < N * N; s++) {
    if (im[s] || et[s] >= 0) continue
    let testa = 0, fine = 0; coda[fine++] = s; et[s] = aree.length; let area = 0
    while (testa < fine) {
      const p = coda[testa++]; area++; const x = p % N, y = (p - x) / N
      if (x > 0 && !im[p - 1] && et[p - 1] < 0) { et[p - 1] = aree.length; coda[fine++] = p - 1 }
      if (x < N - 1 && !im[p + 1] && et[p + 1] < 0) { et[p + 1] = aree.length; coda[fine++] = p + 1 }
      if (y > 0 && !im[p - N] && et[p - N] < 0) { et[p - N] = aree.length; coda[fine++] = p - N }
      if (y < N - 1 && !im[p + N] && et[p + N] < 0) { et[p + N] = aree.length; coda[fine++] = p + N }
    }
    aree.push(area)
  }
  const fondo = N * N * (1 - pieno), aMin = 0.002 * N * N, aMax = 0.05 * N * N
  let medie = 0, nMedie = 0, nPiccole = 0; for (const A of aree) { if (A >= aMin && A <= aMax) { medie += A; nMedie++ } else if (A < aMin) nPiccole++ }
  const sCelle = (medie / fondo) * Math.min(1, nMedie / 16), sNitido = nMedie / (nMedie + 0.6 * nPiccole + 1e-9)
  let stretto = 0, lung = 0; const D = M.dentro
  for (let j = 1; j < D.length; j++) {
    const s0 = D[j - 1], s1 = D[j], L = Math.hypot(s1[2] - s1[0], s1[3] - s1[1]); lung += L
    if (s0[5] !== s1[5] || s1[6] !== s0[6] + 1) continue
    let d = Math.atan2(s1[3] - s1[1], s1[2] - s1[0]) - Math.atan2(s0[3] - s0[1], s0[2] - s0[0]); d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)))
    if (d > 1e-6 && L / d < lato / 30) stretto += L
  }
  const sDistese = lung ? 1 - stretto / lung : 0
  const perT = new Map<number, number>(); for (const s of D) perT.set(s[5], (perT.get(s[5]) || 0) + Math.hypot(s[2] - s[0], s[3] - s[1]))
  let tutto = 0, fr = 0; for (const w of perT.values()) { tutto += w; if (w < 0.06 * lato) fr += w }
  const sPulizia = tutto ? 1 - fr / tutto : 0
  const c16 = new Float64Array(16), q = N / 4; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c16[Math.floor(y / q) * 4 + Math.floor(x / q)] += im[y * N + x]
  const tot = c16.reduce((a, b) => a + b, 0); let H = 0; for (const c of c16) if (c) { const p = c / tot; H -= p * Math.log(p) }
  const sEq = M.fregio ? 1 : H / Math.log(16)
  const totale = sPieno * (0.15 + 0.85 * sCelle) * (0.2 + 0.8 * sNitido) * (0.25 + 0.75 * sDistese) * (0.5 + 0.5 * sPulizia) * (0.4 + 0.6 * sEq)
  return { totale, pieno, celle: sCelle, nitido: sNitido, distese: sDistese, pulizia: sPulizia, equilibrio: sEq }
}

export const bellezzaFinestra = (seg: Seg[], rip: Ripeti, lato: number) => (rip.gruppo === 'una' ? bellezza(seg, lato) : bellezzaPattern(seg, rip, lato))
