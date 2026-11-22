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

/** un lato del dominio: il semipiano n·p ≤ c; «specchio» se sul lato il gruppo riflette (la linea continua nella sua immagine),
 *  «aperto» se no (lì una linea finirebbe a metà), «bordo» per i margini della striscia di un fregio */
export interface Piano { n: [number, number]; c: number; tipo: 'specchio' | 'aperto' | 'bordo' }
export interface Geometria { gruppo: Gruppo; dominio: [number, number][]; copie: T6[]; poligono: [number, number][]; reticolo: { a: [number, number]; b: [number, number] } | null; centro: [number, number]; fregio?: boolean; piani?: Piano[] }

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
  // il dominio vero (di Dirichlet): i punti più vicini a un punto qualunque g0 che a ogni sua immagine nel gruppo.
  // Le sue copie coprono il piano senza buchi e senza sovrapposizioni; ogni lato è lo spartiacque tra g0 e un'immagine,
  // e se quell'immagine viene da una riflessione il lato è uno specchio (la linea continua da sola nella copia).
  const piani: Piano[] = []
  {
    const nrm = Math.hypot(Ar[0], Ar[1]), perp: [number, number] = [-Ar[1] / nrm, Ar[0] / nrm]
    const g0: [number, number] = fregio ? [O[0] + 0.1931 * Ar[0] + 0.1173 * l * perp[0], O[1] + 0.1931 * Ar[1] + 0.1173 * l * perp[1]] : [O[0] + 0.1931 * Ar[0] + 0.1173 * Br[0], O[1] + 0.1931 * Ar[1] + 0.1173 * Br[1]]
    const raggio = 2.6 * Math.max(nrm, fregio ? 0 : Math.hypot(Br[0], Br[1]))
    const eps = l * 1e-6
    for (const T of copie) for (let i = -3; i <= 3; i++) for (let j = fregio ? 0 : -3; j <= (fregio ? 0 : 3); j++) {
      const U: T6 = [T[0], T[1], T[2], T[3], T[4] + i * Ar[0] + j * Br[0], T[5] + i * Ar[1] + j * Br[1]]
      const gi = applica(U, g0[0], g0[1]), dx = gi[0] - g0[0], dy = gi[1] - g0[1], d = Math.hypot(dx, dy)
      if (d < eps || d > raggio) continue
      const c = (gi[0] * gi[0] + gi[1] * gi[1] - g0[0] * g0[0] - g0[1] * g0[1]) / 2
      // specchio: U è una riflessione che lascia ferma la retta spartiacque
      const det = U[0] * U[3] - U[1] * U[2]
      let tipo: Piano['tipo'] = 'aperto'
      if (det < 0) {
        const m: [number, number] = [(g0[0] + gi[0]) / 2, (g0[1] + gi[1]) / 2], t: [number, number] = [-dy / d, dx / d]
        const a1 = applica(U, m[0], m[1]), a2 = applica(U, m[0] + t[0] * l, m[1] + t[1] * l)
        if (Math.hypot(a1[0] - m[0], a1[1] - m[1]) < l * 1e-6 && Math.hypot(a2[0] - m[0] - t[0] * l, a2[1] - m[1] - t[1] * l) < l * 1e-5) tipo = 'specchio'
      }
      piani.push({ n: [dx, dy], c, tipo })
    }
    if (fregio) {
      // la striscia: alta 2h attorno all'asse del fregio (i margini sono bordi, non ferite)
      const h = l * 0.42, cO = perp[0] * O[0] + perp[1] * O[1]
      piani.push({ n: [perp[0], perp[1]], c: cO + h, tipo: 'bordo' }, { n: [-perp[0], -perp[1]], c: -cO + h, tipo: 'bordo' })
    }
  }
  return { gruppo: g, dominio, copie, poligono, reticolo: { a: Ar, b: Br }, centro: O, fregio, piani }
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

/** il taglio di un segmento con i semipiani del dominio: i due capi e, per ciascuno, che tipo di lato l'ha tagliato */
function ritagliaPiani(x0: number, y0: number, x1: number, y1: number, P: Piano[]): { s: [number, number, number, number]; a: Piano['tipo'] | null; b: Piano['tipo'] | null } | null {
  let t0 = 0, t1 = 1, a: Piano['tipo'] | null = null, b: Piano['tipo'] | null = null
  const dx = x1 - x0, dy = y1 - y0
  for (const p of P) {
    const num = p.n[0] * x0 + p.n[1] * y0 - p.c, den = p.n[0] * dx + p.n[1] * dy
    if (Math.abs(den) < 1e-12) { if (num > 0) return null; continue }
    const t = -num / den
    if (den < 0) { if (t > t0) { t0 = t; a = p.tipo } } else if (t < t1) { t1 = t; b = p.tipo }
    if (t0 > t1) return null
  }
  if (t1 - t0 < 1e-9) return null
  return { s: [x0 + dx * t0, y0 + dy * t0, x0 + dx * t1, y0 + dy * t1], a, b }
}

/** niente ripassi: i tratti uguali o quasi coincidenti (sugli specchi, nei centri di rotazione, tra tessere vicine) restano una volta sola */
export function senzaRipassi(segs: Seg[], eps: number, traslazioni: [number, number][] = []): Seg[] {
  const q = (v: number) => Math.round(v / eps)
  const chiave = (x0: number, y0: number, x1: number, y1: number) => { const A = `${q(x0)},${q(y0)}`, B = `${q(x1)},${q(y1)}`; return A < B ? `${A}|${B}` : `${B}|${A}` }
  // prima i più antichi: chi resta è quello nato per primo (la crescita resta coerente)
  const ord = segs.slice().sort((a, b) => a[7] - b[7])
  const visti = new Set<string>(), out: Seg[] = []
  // e un indice per vicinanza: midpoint in una griglia, per i tratti quasi coincidenti (stessa direzione, sovrapposti)
  const cella = eps * 3, griglia = new Map<string, Seg[]>()
  const vicino = (s: Seg) => {
    const mx = (s[0] + s[2]) / 2, my = (s[1] + s[3]) / 2, L = Math.hypot(s[2] - s[0], s[3] - s[1]), ang = Math.atan2(s[3] - s[1], s[2] - s[0])
    const gx = Math.floor(mx / cella), gy = Math.floor(my / cella)
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const o of griglia.get(`${gx + i},${gy + j}`) ?? []) {
      const omx = (o[0] + o[2]) / 2, omy = (o[1] + o[3]) / 2
      if (Math.hypot(omx - mx, omy - my) > eps * 1.5) continue
      let da = Math.abs(Math.atan2(o[3] - o[1], o[2] - o[0]) - ang) % Math.PI; da = Math.min(da, Math.PI - da)
      const Lo = Math.hypot(o[2] - o[0], o[3] - o[1])
      if (da < 0.08 && Math.abs(Lo - L) < Math.max(eps * 2, 0.35 * Math.max(L, Lo))) return true
    }
    return false
  }
  const metti = (s: Seg) => { const mx = (s[0] + s[2]) / 2, my = (s[1] + s[3]) / 2, k = `${Math.floor(mx / cella)},${Math.floor(my / cella)}`; const a = griglia.get(k); if (a) a.push(s); else griglia.set(k, [s]) }
  for (const s of ord) {
    const k = chiave(s[0], s[1], s[2], s[3])
    if (visti.has(k)) continue
    // lo stesso tratto in una tessera vicina (spostato di un passo del reticolo) è già disegnato da quella
    if (traslazioni.some(([tx, ty]) => visti.has(chiave(s[0] - tx, s[1] - ty, s[2] - tx, s[3] - ty)) || visti.has(chiave(s[0] + tx, s[1] + ty, s[2] + tx, s[3] + ty)))) continue
    if (vicino(s)) continue
    visti.add(k); metti(s); out.push(s)
  }
  return out
}

export interface Motivo extends Geometria { dentro: Seg[]; segmenti: Seg[] }
export function motivo(seg: Seg[], rip: Ripeti, lato: number): Motivo {
  const G = geometria(rip, lato), out: Seg[] = []
  let dentro: Seg[] = []
  if (G.piani) {
    // il dominio vero; le linee tagliate da un lato «aperto» finirebbero a metà nella copia: si tengono solo i tratti
    // interi (che finiscono dove finisce la traccia, su uno specchio o sul bordo della striscia)
    const pezzi: { s: Seg; a: Piano['tipo'] | null; b: Piano['tipo'] | null }[] = []
    for (const s of seg) { const r = ritagliaPiani(s[0], s[1], s[2], s[3], G.piani); if (r) pezzi.push({ s: [r.s[0], r.s[1], r.s[2], r.s[3], s[4], s[5], s[6], s[7]], a: r.a, b: r.b }) }
    // i tratti: pezzi consecutivi della stessa traccia
    let run: typeof pezzi = []
    const chiudi = () => {
      if (!run.length) return
      const aperto = run[0].a === 'aperto' || run[run.length - 1].b === 'aperto'
      // un pezzo tagliato a metà da un lato aperto in mezzo al tratto lo spezza: si scarta tutto il tratto
      const ferito = run.some((p, k) => (k > 0 && p.a === 'aperto') || (k < run.length - 1 && p.b === 'aperto'))
      if (!aperto && !ferito) dentro.push(...run.map(p => p.s))
      run = []
    }
    for (const p of pezzi) {
      const prec = run[run.length - 1]
      const attaccato = prec && prec.s[5] === p.s[5] && p.s[6] === prec.s[6] + 1 && !prec.b && !p.a
      if (!attaccato) chiudi()
      run.push(p)
    }
    chiudi()
  } else {
    for (const s of seg) { const r = ritaglia(s[0], s[1], s[2], s[3], G.dominio); if (r) dentro.push([r[0], r[1], r[2], r[3], s[4], s[5], s[6], s[7]]) }
  }
  // via i frammenti minuscoli (un tratto più corto di un ventesimo del lato non disegna niente, fa rumore)
  {
    const lung = new Map<string, number>()
    for (const s of dentro) lung.set(`${s[5]}`, (lung.get(`${s[5]}`) ?? 0) + Math.hypot(s[2] - s[0], s[3] - s[1]))
    dentro = dentro.filter(s => (lung.get(`${s[5]}`) ?? 0) >= lato * 0.05)
  }
  for (const T of G.copie) for (const s of dentro) { const p = applica(T, s[0], s[1]), q = applica(T, s[2], s[3]); out.push([p[0], p[1], q[0], q[1], s[4], s[5], s[6], s[7]]) }
  const tr: [number, number][] = G.reticolo ? (G.fregio ? [G.reticolo.a] : [G.reticolo.a, G.reticolo.b, [G.reticolo.a[0] + G.reticolo.b[0], G.reticolo.a[1] + G.reticolo.b[1]], [G.reticolo.a[0] - G.reticolo.b[0], G.reticolo.a[1] - G.reticolo.b[1]]]) : []
  return { ...G, dentro, segmenti: senzaRipassi(out, lato / 450, tr) }
}

export function rasterizzaPattern(M: Motivo, N = 128) {
  const im = new Uint8Array(N * N), conta = new Uint8Array(N * N), timbro = new Int32Array(N * N).fill(-1)
  let ns = 0
  if (!M.reticolo) return { im, N, conta }
  const La = Math.hypot(...M.reticolo.a), lato = 2 * La, [cx, cy] = M.centro, x0 = cx - lato / 2, y0 = cy - lato / 2, k = N / lato, { a, b } = M.reticolo
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const ox = i * a[0] + j * b[0], oy = i * a[1] + j * b[1]
    if (Math.abs(ox) > lato * 1.3 || Math.abs(oy) > lato * 1.3) continue
    for (const s of M.segmenti) {
      const ax = (s[0] + ox - x0) * k, ay = (s[1] + oy - y0) * k, bx = (s[2] + ox - x0) * k, by = (s[3] + oy - y0) * k
      if (Math.max(ax, bx) < -2 || Math.min(ax, bx) > N + 2 || Math.max(ay, by) < -2 || Math.min(ay, by) > N + 2) continue
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 1.5)), r = Math.max(0.55, (s[4] * k) / 2), id = ns++
      for (let t = 0; t <= n; t++) {
        const x = ax + ((bx - ax) * t) / n, y = ay + ((by - ay) * t) / n
        for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
          if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue
          if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r) { const pp = yy * N + xx; im[pp] = 1; if (timbro[pp] !== id) { timbro[pp] = id; if (conta[pp] < 255) conta[pp]++ } }
        }
      }
    }
  }
  return { im, N, conta }
}

/** la bellezza di un ornamento: inchiostro giusto, il fondo diviso in celle medie, nitido, linee distese, pochi frammenti */
export function bellezzaPattern(seg: Seg[], rip: Ripeti, lato: number) {
  const M = motivo(seg, rip, lato), zero = { totale: 0, pieno: 0 }
  if (!M.dentro.length || !M.reticolo) return zero
  const { im, N, conta } = rasterizzaPattern(M)
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
  // gli spigoli: dove passano troppe linee insieme (nodi affollati) e dove l'inchiostro si ripassa
  // (i segmenti consecutivi di una traccia si toccano nei giunti: per questo si conta da 3 in su)
  let ink = 0, tre = 0, cinque = 0
  for (let i = 0; i < N * N; i++) { const v = conta[i]; if (!v) continue; ink++; if (v >= 4) tre++; if (v >= 6) cinque++ }
  const fTre = ink ? tre / ink : 0, fCinque = ink ? cinque / ink : 0
  const sRipassi = Math.max(0, 1 - 5 * fTre), sNodi = Math.max(0, 1 - 14 * fCinque)
  const totale = sPieno * (0.15 + 0.85 * sCelle) * (0.2 + 0.8 * sNitido) * (0.25 + 0.75 * sDistese) * (0.5 + 0.5 * sPulizia) * (0.4 + 0.6 * sEq) * (0.3 + 0.7 * sRipassi) * (0.45 + 0.55 * sNodi)
  return { totale, pieno, celle: sCelle, nitido: sNitido, distese: sDistese, pulizia: sPulizia, equilibrio: sEq, ripassi: sRipassi, nodi: sNodi }
}

export const bellezzaFinestra = (seg: Seg[], rip: Ripeti, lato: number) => (rip.gruppo === 'una' ? bellezza(seg, lato) : bellezzaPattern(seg, rip, lato))
