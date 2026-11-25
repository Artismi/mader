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
import { motivo, bellezzaFinestra, CARTE, FREGI, type Gruppo, type Ripeti, type Motivo } from './pattern'

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
// la madre: i numeri da COSMO in su sono luoghi veri del cosmo di stateyour (trovati dall'osservatorio della città);
// le loro tracce le calcola il simulatore completo, iniettato dall'app (usaCosmo). Gli altri numeri restano la biblioteca leggera.
export const COSMO = 1e9
let cosmoTracce: ((n: number) => Traccia[] | null) | null = null
export function usaCosmo(f: ((n: number) => Traccia[] | null) | null) { cosmoTracce = f; cache.clear() }
export const indirizzoCosmico = (n: number, gruppo = 'una', angolo = 0) => `cam/${COSMO + n}/500,500,400/0,0,1/1,1/${gruppo},${angolo}`
function simulato(numero: number) {
  let v = cache.get(numero)
  if (v) return v
  const vere = numero >= COSMO && cosmoTracce ? cosmoTracce(numero - COSMO) : null
  const tracce = vere && vere.length ? vere : simulaMondo(universo(numero % COSMO).cella, { maxParticelle: 700, maxPassi: 1500 })
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
interface Piano { modo: 'tracce' | 'ornamento'; seg: Seg[]; fermi: Set<string>; gen: Map<number, number>; k: number; S: number; ox: number; oy: number; M?: Motivo; cella?: { w: number; h: number; x0: number; y0: number }; tessere?: [number, number][] }
function piano(a: Indirizzo, S: number): Piano {
  const seg = segmentiDi(a)
  // dove una particella si è fermata nella materia resta una macchia (il picco di Bragg)
  const fermi = new Set<string>(), gen = new Map<number, number>()
  for (const t of simulato(a.numero).tracce) { gen.set(t.id, t.generazione ?? 0); if (t.fine === 'fermo') fermi.add(`${t.id}:${t.punti.length - 1}`) }
  if (a.ripeti.gruppo === 'una') return { modo: 'tracce', seg, fermi, gen, k: S / a.finestra.lato, S, ox: 0, oy: 0 }
  const M = motivo(seg, a.ripeti, a.finestra.lato)
  if (!M.reticolo || !M.segmenti.length) return { modo: 'tracce', seg, fermi, gen, k: S / a.finestra.lato, S, ox: 0, oy: 0 }
  // la vista: due passi del reticolo (tre lungo un fregio), centrata sul motivo (come la misura dell'ornamento)
  const La = Math.hypot(...M.reticolo.a), Lv = (M.fregio ? 2.4 : 2) * La, k = S / Lv, ox = M.centro[0] - Lv / 2, oy = M.centro[1] - Lv / 2
  // la tessera: il riquadro di tutte le copie del motivo (con gruppi qualunque le copie escono dalla cella: si sovrappongono, non si tagliano)
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const g0 of M.segmenti) { x0 = Math.min(x0, g0[0], g0[2]); y0 = Math.min(y0, g0[1], g0[3]); x1 = Math.max(x1, g0[0], g0[2]); y1 = Math.max(y1, g0[1], g0[3]) }
  const pad = 8 / k
  const cella = { x0: x0 - pad, y0: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad }
  const tessere: [number, number][] = [], { a: A, b: B } = M.reticolo
  for (let i = -8; i <= 8; i++) for (let j = M.fregio ? 0 : -8; j <= (M.fregio ? 0 : 8); j++) {
    const dx = i * A[0] + j * B[0], dy = i * A[1] + j * B[1], x = (cella.x0 + dx - ox) * k, y = (cella.y0 + dy - oy) * k
    if (x > S || y > S || x + cella.w * k < 0 || y + cella.h * k < 0) continue
    tessere.push([dx, dy])
  }
  return { modo: 'ornamento', seg: M.segmenti, fermi, gen, k, S, ox, oy, M, cella, tessere }
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
  // la mano: tratto, bolle (la camera vera), tubo (un tratto cavo) o inchiostro (le figlie sbiadiscono)
  const mani = ['tratto', 'tratto', 'bolle', 'bolle', 'tubo', 'inchiostro'] as const, mano = mani[hash(indirizzo + '/m') % mani.length]
  const bolle = mano === 'bolle', spess = 0.75 + (hash(indirizzo + '/s') % 100) / 100
  // la gerarchia: le primarie piene e spesse, le figlie più sottili, le nipoti un filo
  const pesoGen = [1.25, 0.85, 0.6, 0.45, 0.35]
  let fatti = 0, ultimo = -1
  const traccia = (s: Seg) => {
    const gg = P.gen.get(s[5]) ?? 0, pg = pesoGen[Math.min(4, gg)]
    if (mano === 'inchiostro') q.globalAlpha = 0.92 * (gg === 0 ? 1 : gg === 1 ? 0.7 : 0.45)
    const w = Math.min(maxW, Math.max(mano === 'tubo' ? 2.2 : 1.1, s[4] * P.k * spess * pg * (mano === 'tubo' ? 1.6 : 1))), x0 = (s[0] - bx) * P.k, y0 = (s[1] - by) * P.k, x1 = (s[2] - bx) * P.k, y1 = (s[3] - by) * P.k
    if (bolle) {
      // una bolla ogni tanto lungo il tratto, più fitte e grosse dove la particella rallenta (lo spessore)
      const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / Math.max(2, w * 1.4)))
      for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, r = (w / 2) * (0.75 + 0.5 * (((s[6] * 7 + i * 13) % 10) / 10)); q.beginPath(); q.arc(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, r, 0, 6.2832); q.fill() }
    } else if (mano === 'tubo') {
      // il tubo: un tratto pieno, poi il suo cuore tolto (resta il contorno: un filo cavo, come vetro soffiato)
      q.lineWidth = w; q.beginPath(); q.moveTo(x0, y0); q.lineTo(x1, y1); q.stroke()
      q.globalCompositeOperation = 'destination-out'; q.lineWidth = Math.max(0.6, w - 2.2); q.beginPath(); q.moveTo(x0, y0); q.lineTo(x1, y1); q.stroke(); q.globalCompositeOperation = 'source-over'
    } else { q.lineWidth = w; q.beginPath(); q.moveTo(x0, y0); q.lineTo(x1, y1); q.stroke() }
    if (P.fermi.has(`${s[5]}:${s[6]}`)) { q.beginPath(); q.arc(x1, y1, Math.min(maxW * 1.6, w * 1.9), 0, 6.2832); q.fill() }
  }
  const prepara = () => { q.clearRect(0, 0, sup.width, sup.height); q.strokeStyle = o.colore; q.fillStyle = o.colore; q.lineCap = 'round'; q.lineJoin = 'round'; q.globalAlpha = 0.92; fatti = 0 }
  prepara()
  // la vetrata: dall'indirizzo (un ornamento su tre); le celle chiuse di misura media, una sì e una no, velate
  const vetrata = P.modo === 'ornamento' && hash(indirizzo + '/v') % 3 === 0
  let cpCache: HTMLCanvasElement | null = null
  const campiture = () => {
    if (cpCache) return cpCache
    // il motivo intero, in un'altra tela, e le sue celle sulla tela intera (le celle attraversano le tessere)
    const tmp = newCanvas(S, S), tq = tmp.getContext('2d', { willReadFrequently: true })!
    const cel = newCanvas(sup.width, sup.height), cq = cel.getContext('2d')!
    cq.strokeStyle = o.colore; cq.lineCap = 'round'
    for (const s of ord) { cq.lineWidth = Math.max(1.5, s[4] * P.k * spess); cq.beginPath(); cq.moveTo((s[0] - bx) * P.k, (s[1] - by) * P.k); cq.lineTo((s[2] - bx) * P.k, (s[3] - by) * P.k); cq.stroke() }
    for (const [dx, dy] of P.tessere!) tq.drawImage(cel, Math.round((P.cella!.x0 + dx - P.ox) * P.k), Math.round((P.cella!.y0 + dy - P.oy) * P.k))
    const N = 180, mini = newCanvas(N, N), mq = mini.getContext('2d', { willReadFrequently: true })!; mq.drawImage(tmp, 0, 0, N, N)
    const d = mq.getImageData(0, 0, N, N).data, et = new Int32Array(N * N).fill(-1), coda = new Int32Array(N * N)
    const out0 = newCanvas(S, S), oq = out0.getContext('2d')!, fill = mq.createImageData(N, N), fd = fill.data
    const col = o.colore.replace('#', ''), cr = parseInt(col.slice(0, 2), 16) || 0, cgv = parseInt(col.slice(2, 4), 16) || 0, cb = parseInt(col.slice(4, 6), 16) || 0
    let reg = 0
    for (let s0 = 0; s0 < N * N; s0++) {
      if (d[s0 * 4 + 3] > 50 || et[s0] >= 0) continue
      let testa = 0, fine = 0, tocca = false; coda[fine++] = s0; et[s0] = reg
      while (testa < fine) { const p = coda[testa++], x = p % N, y = (p - x) / N; if (x === 0 || y === 0 || x === N - 1 || y === N - 1) tocca = true
        for (const nn of [x > 0 ? p - 1 : -1, x < N - 1 ? p + 1 : -1, y > 0 ? p - N : -1, y < N - 1 ? p + N : -1]) if (nn >= 0 && et[nn] < 0 && d[nn * 4 + 3] <= 50) { et[nn] = reg; coda[fine++] = nn } }
      const area = fine
      if (!tocca && area > N * N * 0.0015 && area < N * N * 0.04 && (hash(`${indirizzo}/c${Math.round(area / 6)}`) % 2 === 0)) {
        const al = 70 + (hash(`${indirizzo}/a${Math.round(area / 6)}`) % 90)
        for (let i = 0; i < fine; i++) { const p = coda[i]; fd[p * 4] = cr; fd[p * 4 + 1] = cgv; fd[p * 4 + 2] = cb; fd[p * 4 + 3] = al }
      }
      reg++
    }
    mq.clearRect(0, 0, N, N); mq.putImageData(fill, 0, 0)
    oq.imageSmoothingEnabled = true; oq.filter = 'blur(1px)'; oq.drawImage(mini, 0, 0, S, S); oq.filter = 'none'
    // dalla tela intera alla tessera: la vetrata va disegnata una volta sola, non per tessera
    cpCache = out0
    return cpCache
  }
  const stato = (fino: number) => {
    const f = Math.max(0, Math.min(1, fino))
    if (f < ultimo) prepara()
    const taglio = t0 + f * (t1 - t0)
    while (fatti < ord.length && (f >= 1 || ord[fatti][7] <= taglio)) traccia(ord[fatti++])
    ultimo = f
    g.globalCompositeOperation = 'copy'; g.clearRect(0, 0, S, S); g.globalCompositeOperation = 'source-over'
    if (o.fondo) { g.fillStyle = o.fondo; g.fillRect(0, 0, S, S) }
    if (P.modo === 'tracce') g.drawImage(sup, 0, 0)
    else {
      // le campiture: alla fine (dopo il 90% della crescita) alcune celle dell'ornamento si riempiono di un velo, come una vetrata
      if (vetrata && f > 0.9) { const cp = campiture(); g.globalAlpha = Math.min(1, (f - 0.9) / 0.1); g.drawImage(cp, 0, 0); g.globalAlpha = 1 }
      for (const [dx, dy] of P.tessere!) g.drawImage(sup, Math.round((P.cella!.x0 + dx - P.ox) * P.k), Math.round((P.cella!.y0 + dy - P.oy) * P.k))
    }
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

/** la ricerca di una sezione bella: molti universi, molte inquadrature. Tre modi: le tracce libere, le carte da parati
 *  (i 17 gruppi), i fregi (i 7). Poi i migliori si rifiniscono: piccoli spostamenti della finestra, dell'angolo, del
 *  tempo, finché la misura sale (la sezione si mette a fuoco). */
type Modo = 'tracce' | 'carta' | 'fregio'
const GRUPPI_CARTA: Gruppo[] = [...CARTE, 'p6m', 'p4m', 'p31m', 'p3m1', 'p4g', 'cmm', 'pgg']
export function cercaCamere(seme: string, n: number, budgetMs = 3000): { indirizzo: string; voto: number }[] {
  const c = generatore(hash(`cerca/${seme}`)), tra = (a: number, b: number) => a + c() * (b - a), t00 = performance.now()
  const migliori: Record<Modo, Map<number, { a: Indirizzo; voto: number }>> = { tracce: new Map(), carta: new Map(), fregio: new Map() }
  const vota = (a: Indirizzo) => {
    const { tracce, tMax } = simulato(a.numero)
    const fine = Math.max(0.05, a.fetta[0]) * tMax
    const seg = segmentiSezione(tracce, a.finestra, { fine, durata: Math.max(0.05, a.fetta[1]) * fine }, a.vista)
    if (seg.length < 30) return 0
    const v = bellezzaFinestra(seg, a.ripeti, a.finestra.lato).totale
    // le tracce libere viste dall'alto sono spesso scarabocchi: valgono meno, e si cercano soprattutto di sbieco
    return a.ripeti.gruppo === 'una' && !a.vista.inclinazione ? v * 0.7 : v
  }
  let u = 0
  const tempoRicerca = budgetMs * 0.75
  while (performance.now() - t00 < tempoRicerca && u < 400) {
    u++
    const numero = 1 + Math.floor(c() * 9_999_999), { tracce } = simulato(numero)
    if (!tracce.length) continue
    const centri: [number, number][] = []
    for (const t of tracce) if (t.punti.length > 20) { const p = t.punti[Math.floor(c() * t.punti.length)]; centri.push([p[0], p[1]]) }
    if (!centri.length) continue
    for (let j = 0; j < 9; j++) {
      const ct = centri[Math.floor(c() * centri.length)], modo: Modo = j % 3 === 0 ? 'tracce' : j % 3 === 1 ? 'carta' : 'fregio'
      const a: Indirizzo = {
        numero,
        finestra: { centro: [ct[0] + tra(-60, 60), ct[1] + tra(-60, 60)], lato: modo === 'tracce' ? tra(160, 520) : tra(70, 340) },
        // la sezione inclinata dello spaziotempo: le spirali diventano eliche, onde, trocoidi, cordoni
        vista: c() < (modo === 'tracce' ? 0.12 : 0.5) ? VISTA_SOPRA : { inclinazione: tra(15, 78), rotazione: tra(0, 360), scalaTempo: tra(2, 9) },
        fetta: [tra(0.35, 1), c() < 0.5 ? 1 : tra(0.15, 0.8)],
        ripeti: modo === 'tracce' ? { gruppo: 'una', angolo: 0 } : { gruppo: modo === 'carta' ? GRUPPI_CARTA[Math.floor(c() * GRUPPI_CARTA.length)] : FREGI[Math.floor(c() * FREGI.length)], angolo: modo === 'fregio' && c() < 0.7 ? Math.round(c() * 4) * 90 + Math.round(tra(-4, 4)) : Math.round(tra(0, 360)) },
      }
      const voto = vota(a)
      if (!voto) continue
      const M = migliori[modo], vecchio = M.get(numero)
      if (!vecchio || voto > vecchio.voto) M.set(numero, { a, voto })
    }
  }
  // quanti per modo: un terzo abbondante di tracce, poco meno della metà carte, il resto fregi
  const quote: Record<Modo, number> = { tracce: Math.round(n * 0.35), carta: Math.round(n * 0.45), fregio: 0 }
  quote.fregio = Math.max(0, n - quote.tracce - quote.carta)
  const scelti: { a: Indirizzo; voto: number }[] = []
  // la varietà: prima il migliore di ogni gruppo (e, per le tracce, di vista dall'alto e inclinata), poi gli altri
  for (const m of ['tracce', 'carta', 'fregio'] as Modo[]) {
    const tutti = [...migliori[m].values()].sort((x, y) => y.voto - x.voto), visti = new Set<string>(), primi: typeof tutti = [], resto: typeof tutti = []
    for (const x of tutti) { const chiave = m === 'tracce' ? (x.a.vista.inclinazione ? 'incl' : 'sopra') + Math.round(x.a.finestra.lato / 150) : x.a.ripeti.gruppo; if (!visti.has(chiave)) { visti.add(chiave); primi.push(x) } else resto.push(x) }
    scelti.push(...[...primi, ...resto].slice(0, quote[m]))
  }
  // la messa a fuoco: piccoli passi attorno a ognuno, si tiene quello che migliora
  const fineRif = t00 + budgetMs
  for (const sc of scelti) {
    for (let k = 0; k < 6 && performance.now() < fineRif; k++) {
      const b: Indirizzo = JSON.parse(JSON.stringify(sc.a))
      b.finestra.centro = [b.finestra.centro[0] + tra(-15, 15), b.finestra.centro[1] + tra(-15, 15)]
      b.finestra.lato *= tra(0.88, 1.12)
      if (b.ripeti.gruppo !== 'una') b.ripeti.angolo = Math.round(b.ripeti.angolo + tra(-12, 12))
      if (b.vista.inclinazione) b.vista.inclinazione = Math.max(5, Math.min(85, b.vista.inclinazione + tra(-6, 6)))
      b.fetta = [Math.max(0.1, Math.min(1, b.fetta[0] + tra(-0.08, 0.08))), b.fetta[1]]
      const v = vota(b)
      if (v > sc.voto) { sc.a = b; sc.voto = v }
    }
  }
  return scelti.map(x => ({ indirizzo: scriviIndirizzo(x.a), voto: x.voto }))
}

/** le famiglie che la camera sa fare (per una collezione a nicchie) */
export function famiglieCamera(): string[] { return ['tracce', 'tracce-inclinate', ...CARTE.map(g => `carta-${g}`), ...FREGI.map(g => `fregio-${g}`)] }
/** pochi numeri che descrivono un segno della camera: modo, ordine di simmetria, inclinazione, pieno, celle, curve.
 *  Servono a dividere i segni in nicchie (MAP-Elites): così cerca anche dove non ha ancora fatto niente. */
export function descrittoreCamera(indirizzo: string): number[] {
  const a = leggiIndirizzo(indirizzo), g = a.ripeti.gruppo
  const modo = g === 'una' ? 0 : (FREGI as string[]).includes(g) ? 1 : 2
  const ordine = g === 'una' ? 1 : g === 'esagoni' || g === 'p6m' ? 12 : g === 'quadrati' || g === 'p4m' || g === 'p4g' ? 8 : ['p6', 'p3m1', 'p31m'].includes(g) ? 6 : ['p4', 'pmm', 'pmg', 'pgg', 'cmm', 'f2mg', 'f2mm', 'rotazione', 'specchio'].includes(g) ? 4 : ['p3'].includes(g) ? 3 : ['p2', 'pm', 'pg', 'cm', 'f11g', 'f1m1', 'f11m', 'f2'].includes(g) ? 2 : 1
  const { tracce, tMax } = simulato(a.numero)
  const fine = Math.max(0.05, a.fetta[0]) * tMax
  const seg = segmentiSezione(tracce, a.finestra, { fine, durata: Math.max(0.05, a.fetta[1]) * fine }, a.vista)
  const b = bellezzaFinestra(seg, a.ripeti, a.finestra.lato) as { pieno?: number; celle?: number; distese?: number }
  return [modo / 2, Math.log2(ordine) / Math.log2(12), Math.min(1, a.vista.inclinazione / 80), Math.min(1, (b.pieno ?? 0) * 3), b.celle ?? 0, 1 - (b.distese ?? 1)]
}

export { universo } from './biblioteca'
