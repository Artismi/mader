/**
 * La camera dei pattern, nell'artista. Un indirizzo è un posto nella biblioteca di tutti gli universi possibili:
 * quale universo, dove guardare (la finestra), da che angolo (la sezione inclinata nello spaziotempo), quale fetta
 * di tempo, e se ripetere quello che si vede in un caleidoscopio. Lo stesso indirizzo dà sempre lo stesso disegno.
 *
 *   cam/<universo>/<cx>,<cy>,<lato>/<inclinazione>,<rotazione>,<scalaTempo>/<fine>,<durata>/<gruppo>,<angolo>
 *
 * Due modi: TRACCE (la lastra di una camera a bolle: forcelle, spirali, sciami, rosette) e ORNAMENTO (il triangolo
 * della sezione ripetuto dagli specchi). Le tracce crescono nel tempo dell'evento: ogni stato è il prefisso del successivo.
 */
import { newCanvas } from '../sheet'
import { simulaMondo, generatore, hash, type Traccia } from './mondo'
import { universo } from './biblioteca'
import { segmentiSezione, VISTA_SOPRA, type Seg, type Vista, type Finestra, type Fetta } from './sezione'
import { motivo, bellezzaFinestra, type Gruppo, type Ripeti, type Motivo } from './pattern'

export type Caleido = 'sei' | 'quattro' | 'specchio' | 'giro' | 'affiancata' | 'sola'
const DA_CALEIDO: Record<Caleido, Gruppo> = { sei: 'esagoni', quattro: 'quadrati', specchio: 'specchio', giro: 'rotazione', affiancata: 'traslazione', sola: 'una' }
export interface OpzioniCamera { S?: number; colore: string; fondo?: string | null; fino?: number; caleido?: Caleido }
export interface Indirizzo { numero: number; finestra: Finestra; vista: Vista; fetta: [number, number]; ripeti: Ripeti }

// ---------- l'indirizzo
const r2 = (x: number) => Math.round(x * 100) / 100
export function scriviIndirizzo(a: Indirizzo): string {
  return `cam/${a.numero}/${Math.round(a.finestra.centro[0])},${Math.round(a.finestra.centro[1])},${Math.round(a.finestra.lato)}/${Math.round(a.vista.inclinazione)},${Math.round(a.vista.rotazione)},${r2(a.vista.scalaTempo)}/${r2(a.fetta[0])},${r2(a.fetta[1])}/${a.ripeti.gruppo},${Math.round(a.ripeti.angolo)}`
}
export function leggiIndirizzo(s: string): Indirizzo {
  const p = s.split('/'), n = (x: string | undefined) => (x ?? '').split(',').map(Number)
  if (p[0] !== 'cam' || p.length < 3) {
    // un indirizzo «libero» (una parola, un seme): l'universo e la finestra vengono dal caso dell'indirizzo
    const c = generatore(hash(s))
    return { numero: 1 + Math.floor(c() * 1e7), finestra: { centro: [300 + c() * 400, 300 + c() * 400], lato: 160 + c() * 300 }, vista: VISTA_SOPRA, fetta: [1, 1], ripeti: { gruppo: 'una', angolo: 0 } }
  }
  const [cx, cy, l] = n(p[2]), [inc, rot, k] = n(p[3]), [fi, du] = n(p[4]), [g, ang] = (p[5] ?? 'una,0').split(',')
  return { numero: Number(p[1]), finestra: { centro: [cx, cy], lato: l || 300 }, vista: { inclinazione: inc || 0, rotazione: rot || 0, scalaTempo: k || 5 }, fetta: [fi || 1, du || 1], ripeti: { gruppo: (g as Gruppo) || 'una', angolo: Number(ang) || 0 } }
}

// ---------- gli universi simulati, tenuti un poco (la ricerca e la crescita li riusano)
const cache = new Map<number, { tracce: Traccia[]; tMax: number }>()
function simulato(numero: number) {
  let v = cache.get(numero)
  if (v) return v
  const tracce = simulaMondo(universo(numero).cella, { maxParticelle: 700, maxPassi: 1500 })
  let tMax = 1; for (const t of tracce) tMax = Math.max(tMax, t.punti[t.punti.length - 1][3])
  v = { tracce, tMax }; cache.set(numero, v)
  if (cache.size > 24) cache.delete(cache.keys().next().value as number)
  return v
}
function segmentiDi(a: Indirizzo) {
  const { tracce, tMax } = simulato(a.numero)
  const fine = Math.max(0.05, a.fetta[0]) * tMax, fetta: Fetta = { fine, durata: Math.max(0.05, a.fetta[1]) * fine }
  return segmentiSezione(tracce, a.finestra, fetta, a.vista)
}

// ---------- il disegno
interface Piano { modo: 'tracce' | 'ornamento'; seg: Seg[]; fermi: Set<string>; k: number; S: number; ox: number; oy: number; M?: Motivo; cella?: { w: number; h: number; x0: number; y0: number }; tessere?: [number, number][] }
function piano(a: Indirizzo, S: number): Piano {
  const seg = segmentiDi(a)
  // dove una particella si è fermata nella materia resta una macchia (il picco di Bragg)
  const fermi = new Set<string>(); for (const t of simulato(a.numero).tracce) if (t.fine === 'fermo') fermi.add(`${t.id}:${t.punti.length - 1}`)
  if (a.ripeti.gruppo === 'una') return { modo: 'tracce', seg, fermi, k: S / a.finestra.lato, S, ox: 0, oy: 0 }
  const M = motivo(seg, a.ripeti, a.finestra.lato)
  if (!M.reticolo) return { modo: 'tracce', seg, fermi, k: S / a.finestra.lato, S, ox: 0, oy: 0 }
  // la vista: due passi del reticolo, centrata sul motivo (come la misura dell'ornamento)
  const La = Math.hypot(...M.reticolo.a), Lv = 2 * La, k = S / Lv, ox = M.centro[0] - Lv / 2, oy = M.centro[1] - Lv / 2
  const xs = M.poligono.map(p => p[0]), ys = M.poligono.map(p => p[1]), pad = 6 / k
  const cella = { x0: Math.min(...xs) - pad, y0: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + 2 * pad, h: Math.max(...ys) - Math.min(...ys) + 2 * pad }
  const tessere: [number, number][] = [], { a: A, b: B } = M.reticolo
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
    const dx = i * A[0] + j * B[0], dy = i * A[1] + j * B[1], x = (cella.x0 + dx - ox) * k, y = (cella.y0 + dy - oy) * k
    if (x > S || y > S || x + cella.w * k < 0 || y + cella.h * k < 0) continue
    tessere.push([dx, dy])
  }
  return { modo: 'ornamento', seg: M.segmenti, fermi, k, S, ox, oy, M, cella, tessere }
}

/** la crescita: simula una volta, poi ogni stato disegna solo i segmenti nati fino a quella frazione del tempo */
export function crescitaCamera(indirizzo: string, o: OpzioniCamera): (fino: number) => HTMLCanvasElement {
  const S = o.S ?? 560, a = leggiIndirizzo(indirizzo)
  if (o.caleido) a.ripeti = { gruppo: DA_CALEIDO[o.caleido], angolo: a.ripeti.angolo }
  const P = piano(a, S)
  const ord = P.seg.slice().sort((x, y) => x[7] - y[7])
  let t0 = Infinity, t1 = -Infinity; for (const s of ord) { t0 = Math.min(t0, s[7]); t1 = Math.max(t1, s[7]) }
  if (!isFinite(t0)) { t0 = 0; t1 = 1 }
  const out = newCanvas(S, S), g = out.getContext('2d')!
  // il supporto su cui si accumulano i segmenti: la tela stessa (tracce) o la cella dell'ornamento
  const sup = P.modo === 'ornamento' ? newCanvas(Math.max(1, Math.ceil(P.cella!.w * P.k)), Math.max(1, Math.ceil(P.cella!.h * P.k))) : newCanvas(S, S)
  const q = sup.getContext('2d')!
  const bx = P.modo === 'ornamento' ? P.cella!.x0 : P.ox, by = P.modo === 'ornamento' ? P.cella!.y0 : P.oy
  const maxW = S * 0.022
  // la mano della lastra: un tratto continuo, o le bolle di una camera vera (dall'indirizzo: fa parte del disegno)
  const bolle = hash(indirizzo) % 10 < 4, spess = 0.75 + (hash(indirizzo + '/s') % 100) / 100
  let fatti = 0, ultimo = -1
  const traccia = (s: Seg) => {
    const w = Math.min(maxW, Math.max(1.1, s[4] * P.k * spess)), x0 = (s[0] - bx) * P.k, y0 = (s[1] - by) * P.k, x1 = (s[2] - bx) * P.k, y1 = (s[3] - by) * P.k
    if (bolle) {
      // una bolla ogni tanto lungo il tratto, più fitte e grosse dove la particella rallenta (lo spessore)
      const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / Math.max(2, w * 1.4)))
      for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, r = (w / 2) * (0.75 + 0.5 * (((s[6] * 7 + i * 13) % 10) / 10)); q.beginPath(); q.arc(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, r, 0, 6.2832); q.fill() }
    } else { q.lineWidth = w; q.beginPath(); q.moveTo(x0, y0); q.lineTo(x1, y1); q.stroke() }
    if (P.fermi.has(`${s[5]}:${s[6]}`)) { q.beginPath(); q.arc(x1, y1, Math.min(maxW * 1.6, w * 1.9), 0, 6.2832); q.fill() }
  }
  const prepara = () => { q.clearRect(0, 0, sup.width, sup.height); q.strokeStyle = o.colore; q.fillStyle = o.colore; q.lineCap = 'round'; q.lineJoin = 'round'; q.globalAlpha = 0.92; fatti = 0 }
  prepara()
  const stato = (fino: number) => {
    const f = Math.max(0, Math.min(1, fino))
    if (f < ultimo) prepara()
    const taglio = t0 + f * (t1 - t0)
    while (fatti < ord.length && (f >= 1 || ord[fatti][7] <= taglio)) traccia(ord[fatti++])
    ultimo = f
    g.globalCompositeOperation = 'copy'; g.clearRect(0, 0, S, S); g.globalCompositeOperation = 'source-over'
    if (o.fondo) { g.fillStyle = o.fondo; g.fillRect(0, 0, S, S) }
    if (P.modo === 'tracce') g.drawImage(sup, 0, 0)
    else for (const [dx, dy] of P.tessere!) g.drawImage(sup, Math.round((P.cella!.x0 + dx - P.ox) * P.k), Math.round((P.cella!.y0 + dy - P.oy) * P.k))
    ;(out as HTMLCanvasElement & { __ricetta?: unknown }).__ricetta = { tool: 'camera', p: { indirizzo, colore: o.colore, S } }
    return out
  }
  return stato
}

export function disegnaCamera(indirizzo: string, o: OpzioniCamera): HTMLCanvasElement {
  const st = crescitaCamera(indirizzo, o)(o.fino ?? 1)
  // una copia: la crescita riusa la sua tela
  const c = newCanvas(st.width, st.height); c.getContext('2d')!.drawImage(st, 0, 0)
  ;(c as HTMLCanvasElement & { __ricetta?: unknown }).__ricetta = { tool: 'camera', p: { indirizzo, colore: o.colore, S: o.S ?? 560 } }
  return c
}

/** le polilinee in coordinate della tela: [x, y, tempo, spessore] per punto */
export function lineeCamera(indirizzo: string, o: OpzioniCamera): { punti: [number, number, number, number][] }[] {
  const S = o.S ?? 560, a = leggiIndirizzo(indirizzo)
  if (o.caleido) a.ripeti = { gruppo: DA_CALEIDO[o.caleido], angolo: a.ripeti.angolo }
  const P = piano(a, S), linee: { punti: [number, number, number, number][] }[] = []
  const spostamenti: [number, number][] = P.modo === 'ornamento' ? P.tessere! : [[0, 0]]
  for (const [dx, dy] of spostamenti) {
    let cur: [number, number, number, number][] | null = null, prec: Seg | null = null
    for (const s of P.seg) {
      const A: [number, number, number, number] = [(s[0] + dx - P.ox) * P.k, (s[1] + dy - P.oy) * P.k, s[7], s[4] * P.k * 0.55], B: [number, number, number, number] = [(s[2] + dx - P.ox) * P.k, (s[3] + dy - P.oy) * P.k, s[7], s[4] * P.k * 0.55]
      const attaccato = prec && prec[5] === s[5] && s[6] === prec[6] + 1 && Math.hypot(prec[2] - s[0], prec[3] - s[1]) < 1e-6
      if (!attaccato || !cur) { cur = [A]; linee.push({ punti: cur }) }
      cur.push(B); prec = s
    }
  }
  return linee.filter(l => l.punti.some(p => p[0] >= 0 && p[0] <= S && p[1] >= 0 && p[1] <= S))
}

/** la ricerca di una sezione bella: molti universi, molte inquadrature; metà tracce, metà ornamenti; un indirizzo per universo */
export function cercaCamere(seme: string, n: number, budgetMs = 3000): { indirizzo: string; voto: number }[] {
  const c = generatore(hash(`cerca/${seme}`)), tra = (a: number, b: number) => a + c() * (b - a), t00 = performance.now()
  const migliori: Record<'tracce' | 'ornamento', Map<number, { indirizzo: string; voto: number }>> = { tracce: new Map(), ornamento: new Map() }
  const gruppi: Gruppo[] = ['esagoni', 'esagoni', 'quadrati', 'quadrati', 'specchio', 'rotazione', 'traslazione']
  let u = 0
  while (performance.now() - t00 < budgetMs && u < 400) {
    u++
    const numero = 1 + Math.floor(c() * 9_999_999), { tracce, tMax } = simulato(numero)
    if (!tracce.length) continue
    // i posti interessanti: dove c'è inchiostro
    const centri: [number, number][] = []
    for (const t of tracce) if (t.punti.length > 20) { const p = t.punti[Math.floor(c() * t.punti.length)]; centri.push([p[0], p[1]]) }
    if (!centri.length) continue
    for (let j = 0; j < 10; j++) {
      const ct = centri[Math.floor(c() * centri.length)], modo: 'tracce' | 'ornamento' = j % 2 ? 'ornamento' : 'tracce'
      const a: Indirizzo = {
        numero,
        finestra: { centro: [ct[0] + tra(-60, 60), ct[1] + tra(-60, 60)], lato: modo === 'tracce' ? tra(160, 520) : tra(90, 360) },
        vista: c() < 0.5 ? VISTA_SOPRA : { inclinazione: tra(15, 70), rotazione: tra(0, 360), scalaTempo: tra(2, 8) },
        fetta: [tra(0.35, 1), c() < 0.5 ? 1 : tra(0.2, 0.8)],
        ripeti: modo === 'tracce' ? { gruppo: 'una', angolo: 0 } : { gruppo: gruppi[Math.floor(c() * gruppi.length)], angolo: tra(0, 360) },
      }
      const fine = Math.max(0.05, a.fetta[0]) * tMax
      const seg = segmentiSezione(tracce, a.finestra, { fine, durata: Math.max(0.05, a.fetta[1]) * fine }, a.vista)
      if (seg.length < 30) continue
      const voto = bellezzaFinestra(seg, a.ripeti, a.finestra.lato).totale
      const M = migliori[modo], vecchio = M.get(numero)
      if (!vecchio || voto > vecchio.voto) M.set(numero, { indirizzo: scriviIndirizzo(a), voto })
    }
  }
  // metà e metà, ognuna nel suo ordine (le due misure hanno scale diverse: si confrontano dentro il loro modo)
  const t = [...migliori.tracce.values()].sort((a, b) => b.voto - a.voto), o = [...migliori.ornamento.values()].sort((a, b) => b.voto - a.voto)
  const out: { indirizzo: string; voto: number }[] = []
  for (let i = 0; out.length < n && (i < t.length || i < o.length); i++) { if (t[i]) out.push(t[i]); if (o[i] && out.length < n) out.push(o[i]) }
  return out
}

export { universo } from './biblioteca'
