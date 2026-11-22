/**
 * Cristallo nell'artista: una pallina corre dentro un cristallo e lascia una linea; il cristallo ripete la sua cella e la
 * linea diventa un motivo (fregi, carte da parati, corridoi in prospettiva, intrecci, rosoni dalla sorgente simmetrica).
 * Il motore è quello di Cristallo (stateyour, ramo claude/pattern-cristallo), portato com'è nei file accanto.
 *
 * Un pattern è un INDIRIZZO: un numero («4127») che sceglie dal caso con indirizzo il reticolo, gli atomi, il lancio, il
 * magnete, la finestra e una delle famiglie di sguardo (tessera o viaggio, prospettiva, lastra o parallelo, cristallo
 * piano, sorgente simmetrica); oppure l'indirizzo testuale completo di Cristallo («reticolo=cubico.F a=1 …»).
 * Lo stesso indirizzo dà sempre lo stesso disegno.
 *
 * La linea ha un tempo: ogni tratto nasce in un momento del viaggio della pallina. Disegnare fino a una frazione del
 * tempo fa crescere il motivo (ogni stato è il prefisso del successivo; a fino = 1 è il disegno intero).
 */
import { creaSorgente } from './motore'
import { creaFinestra, creaProiettore } from './finestra'
import { casuale, leggi, POSTI, direzioneUniforme } from './indirizzo'
import { reticoloACaso, vincola, vettoriCella, combina, creaCristallo } from './reticolo'
import { sorgente } from './caso'
import { sitiSpeciali } from './simmetria'
import { direzioniSemplici } from './indici'
import { catalogo, scriviOrbita } from './orbite'
import { tesseraDelleOrbite } from './linee'

type Vec = [number, number, number]
interface Pattern { orbite?: string[]; reticolo: Record<string, unknown> & { piano?: boolean }; atomi: { p: Vec; s: number }[]; w: number; U0: number; r0: Vec; v0: Vec; B: Vec; T: number; difetti: number; finestra: { C: Vec; R: number; n: Vec; psi: number; L: number; D: number; h: number; modo: string }; vista: string; tempo: number; sorgente?: number; famiglia?: string }
export interface OpzioniCristallo { S?: number; colore: string; fondo?: string | null; fino?: number; spessore?: number }
/** un tratto nella finestra (unità di Cristallo: la finestra è larga L), con la sua luminosità (profondità), la velocità e il tempo */
interface Tratto { x1: number; y1: number; x2: number; y2: number; l: number; v: number; t: number }
interface Simulato { p: Pattern; L: number; tratti: Tratto[]; famiglia: string; ms: number }

/**
 * Le famiglie, scelte dal caso dell'indirizzo; i pesi vengono da quello che dà motivi leggibili (le traiettorie regolari e
 * le finestre lungo piani semplici: dove il cristallo si ripete; il caso uniforme dà quasi sempre intrecci caotici):
 *  - orbite (30%): nel cristallo piano, le linee chiuse del catalogo (orbite periodiche), ripetute dal reticolo; a volte con
 *    la sorgente simmetrica (le sorelle per simmetria: rosoni) → carte da parati alla Lewis Day
 *  - canale (35%): nello spazio, lancio lungo una fila di atomi ad alta energia, finestra lungo un piano semplice (hkl) →
 *    fregi, righe ondulate, intrecci regolari; in prospettiva diventano corridoi
 *  - lastra (15%): una fetta spessa del cristallo, tratti lunghi proiettati → tessuti, trame
 *  - viaggio (20%): nel piano col magnete, la linea stesa su molte celle → anelli, cicloidi, fiori che derivano
 */
function patternDi(indirizzo: string): Pattern & { orbiteDa?: { semi: number; quante: number; sorgente: boolean } } {
  const s = String(indirizzo).trim()
  if (!/^-?\d+$/.test(s)) { const p = leggi(s) as unknown as Pattern; p.famiglia = 'testo'; return p }
  const k = Number(s), c = sorgente(`artista/${k}`)
  const p = casuale(k) as unknown as Pattern & { orbiteDa?: { semi: number; quante: number; sorgente: boolean } }
  const u = c('famiglia'), fam = u < 0.3 ? 'orbite' : u < 0.65 ? 'canale' : u < 0.8 ? 'lastra' : 'viaggio'
  const piano = fam === 'orbite' || fam === 'viaggio'
  if (piano) {
    const r = vincola(reticoloACaso(c.sotto('reticolo piano'), true)) as Record<string, unknown>
    p.reticolo = { ...r, piano: true }
    const A = vettoriCella(p.reticolo) as Vec[]
    p.atomi = p.atomi.map(a => ({ ...a, p: [a.p[0], a.p[1], 0] as Vec }))
    p.r0 = combina([c('r0 x'), c('r0 y'), 0], A) as Vec
    const E = 0.5 * Math.pow(12, c('energia piano')), an = 2 * Math.PI * c('angolo piano'), vv = Math.sqrt(2 * E)
    p.v0 = [vv * Math.cos(an), vv * Math.sin(an), 0]
    p.B = fam === 'viaggio' ? [0, 0, (vv / (0.15 + 0.45 * c('raggio viaggio'))) * (c('verso') < 0.5 ? 1 : -1)] : c('magnete piano') < 0.6 ? [0, 0, (vv / (0.2 + 1.2 * c('raggio piano'))) * (c('verso') < 0.5 ? 1 : -1)] : [0, 0, 0]
    p.finestra = { ...p.finestra, n: [0, 0, 1], psi: 2 * Math.PI * c('psi piano'), C: combina(p.atomi[0].p, A) as Vec, R: Infinity, L: fam === 'viaggio' ? 6 + 6 * c('L viaggio') : 2.5 + 3 * c('L orbite') }
    if (fam === 'viaggio') { p.vista = 'viaggio'; p.tempo = 30 + 60 * c('tempo viaggio'); p.v0 = p.v0.map(x => x * 1.6) as Vec }
    if (fam === 'orbite') {
      p.orbiteDa = { semi: 40, quante: 1 + Math.floor(c('quante orbite') * 3), sorgente: c('sorgente orbite') < 0.45 }
      if (p.orbiteDa.sorgente) {
        const cr = creaCristallo({ ...vincola(p.reticolo), atomi: p.atomi, w: p.w, U0: p.U0 })
        const siti = (sitiSpeciali(cr) as { x: Vec; elementi: number }[]).filter(x => x.elementi >= 3)
        if (siti.length) p.r0 = [...siti[Math.floor(c('sito') * siti.length)].x] as Vec; else p.orbiteDa.sorgente = false
      }
    }
  } else {
    const cr = creaCristallo({ ...vincola(p.reticolo), atomi: p.atomi, w: p.w, U0: p.U0 })
    const A = cr.A as Vec[]
    // la finestra lungo un piano semplice: lì il cristallo si ripete (con prospettiva o, una volta su tre, carta da parati)
    const sempl = direzioniSemplici(cr, 2) as unknown as { n: Vec }[]
    const n0 = sempl[Math.floor(c('piano semplice') * sempl.length)].n, ln = Math.hypot(...n0)
    p.finestra = { ...p.finestra, n: n0.map(x => x / ln) as Vec, R: c('lontano canale') < 0.35 ? Infinity : p.finestra.R }
    if (fam === 'canale' || fam === 'lastra') {
      // il lancio lungo una fila: un vettore del reticolo semplice, appena storto, con l'energia alta (incanalamento)
      const fila = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]][Math.floor(c('fila') * 7)]
      const d = combina(fila, A) as Vec, l = Math.hypot(...d), E = 2 + 8 * c('energia canale'), vv = Math.sqrt(2 * E), st = 0.04 * c('storto')
      p.v0 = d.map((x, i) => (x / l + st * (c(`storto ${i}`) - 0.5)) * vv) as Vec
      p.B = c('magnete canale') < 0.3 ? p.B : [0, 0, 0]
    }
    if (fam === 'lastra') { p.finestra = { ...p.finestra, modo: 'lastra', h: 0.05 + 0.3 * c('spessore lastra') }; p.tempo = 20 }
  }
  void POSTI; void direzioneUniforme
  p.famiglia = fam + (p.finestra.R === Infinity ? '/parallelo' : '/prospettiva') + (p.orbiteDa?.sorgente ? '/sorgente' : '')
  return p
}

const PIENO = 0.2          // l'inchiostro oltre il quale la linea smette di crescere (il motivo diventerebbe nebbia)
const MAX_TRATTI = 220_000  // un tetto sui tratti disegnati
const LOTTO = 40            // i tratti della tessera proiettati insieme: il tempo di ognuno è quello del suo lotto

/** simula una volta: i tratti con il loro tempo, ordinati per tempo */
function simula(indirizzo: string, budgetMs = 650): Simulato {
  const t0 = performance.now(), p = patternDi(indirizzo)
  // le orbite chiuse: il catalogo di questo cristallo a questa energia, poi le prime (le più semplici) ripetute dal reticolo
  let orbite: { s: Float64Array; vel: Float32Array; n: number } | null = null
  if (p.orbiteDa) {
    const cr = creaCristallo({ ...vincola(p.reticolo), atomi: p.atomi, w: p.w, U0: p.U0 })
    const E = 0.5 * (p.v0[0] ** 2 + p.v0[1] ** 2) + cr.campo(p.r0[0], p.r0[1], 0, null)
    const L0 = catalogo(cr, E, p.B, { semi: p.orbiteDa.semi, max: 8, tempoMax: Math.min(450, budgetMs * 0.6), radice: `artista/${indirizzo}/${E}` }) as unknown[]
    if (L0.length) {
      // prima le orbite che si richiudono nella stessa cella (anelli, rosette), poi i canali; la scelta dal caso dell'indirizzo
      const c2 = sorgente(`orbite/${indirizzo}`), chiuse = (L0 as { m: number[] }[]).filter(o => !o.m[0] && !o.m[1]), aperte = (L0 as { m: number[] }[]).filter(o => o.m[0] || o.m[1])
      const pool = chiuse.length && c2('chiuse') < 0.7 ? [...chiuse, ...aperte] : [...aperte, ...chiuse]
      const da = Math.floor(c2('da') * Math.max(1, pool.length - p.orbiteDa.quante + 1)), scelte = pool.slice(da, da + p.orbiteDa.quante); p.orbite = scelte.map(o => scriviOrbita(o)) as never; p.sorgente = p.orbiteDa.sorgente ? 1 : 0; orbite = (tesseraDelleOrbite(p) as { tessera: { s: Float64Array; vel: Float32Array; n: number } }).tessera }
  }
  const So = creaSorgente(orbite ? { ...p, sorgente: 0, tempo: 0.01 } : p), S0 = So.sessioni[0]
  const tessera = !!orbite || p.vista !== 'viaggio'
  // il viaggio si guarda da una finestra larghissima (niente si taglia), poi si inquadra sul percorso
  const fin = creaFinestra({ ...p.finestra, ...(tessera ? {} : { L: 400, D: 400, h: 400 }), aspetto: 1 })
  const P = creaProiettore(fin, S0.cristallo, tessera) as unknown as { proietta: (s: Float64Array, vel: Float32Array, da: number, a: number) => Float64Array; pieno: boolean }
  const sess = So.sessioni as unknown as { finito: boolean; ogni: number; avanza: (n: number) => unknown; tessera: { n: number; s: Float64Array; vel: Float32Array }; tratti: { n: number; s: Float64Array; vel: Float32Array } }[]
  const fatti = sess.map(() => 0), out: Tratto[] = []
  const L = p.finestra.L, k = 560 / L
  let inchiostro = 0, passo = 0
  const alfa = (l: number) => 0.28 + 0.6 * Math.min(1, l)
  if (orbite) {
    // le linee chiuse: un periodo di ogni orbita, proiettato a lotti (il tempo cresce lungo l'orbita, in tutte le copie insieme)
    for (let a0 = 0; a0 < orbite.n; a0 += LOTTO) {
      const s = P.proietta(orbite.s, orbite.vel, a0, Math.min(orbite.n, a0 + LOTTO)) as Float64Array; passo++
      for (let q = 0; q < s.length; q += 6) out.push({ x1: s[q], y1: s[q + 1], x2: s[q + 2], y2: s[q + 3], l: Math.max(0.6, s[q + 4]), v: s[q + 5], t: passo })
    }
  }
  while (!orbite && performance.now() - t0 < budgetMs && out.length < MAX_TRATTI && !P.pieno) {
    let lavoro = false
    for (let i = 0; i < sess.length; i++) {
      const src = tessera ? sess[i].tessera : sess[i].tratti
      while (fatti[i] < src.n) {
        const a = Math.min(src.n, fatti[i] + LOTTO), s = P.proietta(src.s, src.vel, fatti[i], a) as Float64Array
        passo++
        for (let q = 0; q < s.length; q += 6) {
          const tr: Tratto = { x1: s[q], y1: s[q + 1], x2: s[q + 2], y2: s[q + 3], l: s[q + 4], v: s[q + 5], t: passo }
          out.push(tr); inchiostro += Math.hypot(tr.x2 - tr.x1, tr.y2 - tr.y1) * k * alfa(tr.l) * 1.3 / (560 * 560)
        }
        fatti[i] = a; lavoro = true
      }
    }
    if (inchiostro >= PIENO || sess.every(x => x.finito)) break
    void lavoro
    for (const x of sess) if (!x.finito) x.avanza(Math.max(x.ogni, Math.ceil(400 / sess.length)))
  }
  // il viaggio si inquadra sul suo percorso: la linea va dove vuole, la finestra la segue (centrata, con un margine)
  if (!tessera && out.length) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const t of out) { x0 = Math.min(x0, t.x1, t.x2); x1 = Math.max(x1, t.x1, t.x2); y0 = Math.min(y0, t.y1, t.y2); y1 = Math.max(y1, t.y1, t.y2) }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, kk = (L * 0.88) / Math.max(1e-9, x1 - x0, y1 - y0)
    for (const t of out) { t.x1 = (t.x1 - cx) * kk; t.x2 = (t.x2 - cx) * kk; t.y1 = (t.y1 - cy) * kk; t.y2 = (t.y2 - cy) * kk }
  }
  // il tempo da 0 a 1 (l'ordine in cui la pallina li ha tracciati)
  const T = Math.max(1, passo)
  for (const tr of out) tr.t /= T
  return { p, L, tratti: out, famiglia: p.famiglia ?? '', ms: performance.now() - t0 }
}

const cache = new Map<string, Simulato>()
function simulato(indirizzo: string) {
  let s = cache.get(indirizzo)
  if (!s) { s = simula(indirizzo); cache.set(indirizzo, s); if (cache.size > 24) cache.delete(cache.keys().next().value as string) }
  return s
}

const Q = 64 // i passi di crescita: il disegno va per pezzi di tempo, ognuno con i suoi tratti raggruppati per tono
function disegnaPezzi(g: CanvasRenderingContext2D, sim: Simulato, S: number, colore: string, spessore: number, da: number, a: number) {
  const k = S / sim.L, cx = S / 2, cy = S / 2
  g.strokeStyle = colore; g.lineWidth = spessore; g.lineCap = 'round'; g.lineJoin = 'round'; g.globalCompositeOperation = 'source-over'
  const tr = sim.tratti
  for (let pz = da; pz < a; pz++) {
    const t0 = pz / Q, t1 = (pz + 1) / Q
    // i tratti di questo pezzo di tempo (sono in ordine di tempo: si cerca l'inizio con una bisezione)
    let lo = 0, hi = tr.length
    while (lo < hi) { const m = (lo + hi) >> 1; if (tr[m].t <= t0 && pz > 0) lo = m + 1; else hi = m }
    const gruppi: Tratto[][] = [[], [], [], []]
    for (let i = pz === 0 ? 0 : lo; i < tr.length && (tr[i].t <= t1 || pz === Q - 1); i++) gruppi[Math.min(3, Math.floor(tr[i].l * 4))].push(tr[i])
    gruppi.forEach((gr, j) => {
      if (!gr.length) return
      g.globalAlpha = 0.3 + 0.18 * j
      g.beginPath()
      for (const s of gr) { g.moveTo(cx + s.x1 * k, cy - s.y1 * k); g.lineTo(cx + s.x2 * k, cy - s.y2 * k) }
      g.stroke()
    })
  }
  g.globalAlpha = 1
}
const quanti = (fino: number) => Math.max(0, Math.min(Q, Math.ceil(fino * Q - 1e-9)))
function tela(S: number, fondo: string | null | undefined) {
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S
  const g = cv.getContext('2d')!
  if (fondo) { g.fillStyle = fondo; g.fillRect(0, 0, S, S) }
  return { cv, g }
}
function marca(cv: HTMLCanvasElement, indirizzo: string, o: OpzioniCristallo, S: number) {
  (cv as HTMLCanvasElement & { __ricetta?: unknown }).__ricetta = { tool: 'cristallo', p: { indirizzo, colore: o.colore, S } }
  return cv
}

/** il motivo dell'indirizzo, di un colore solo (fondo trasparente se null), cresciuto fino alla frazione `fino` del suo tempo */
export function disegnaCristallo(indirizzo: string, o: OpzioniCristallo): HTMLCanvasElement {
  const S = o.S ?? 560, sim = simulato(indirizzo), { cv, g } = tela(S, o.fondo)
  disegnaPezzi(g, sim, S, o.colore, o.spessore ?? Math.max(1, S / 520), 0, quanti(o.fino ?? 1))
  return marca(cv, indirizzo, o, S)
}

/** la crescita: simula una volta; ogni stato aggiunge solo i pezzi nuovi (all'indietro ridisegna da capo) */
export function crescitaCristallo(indirizzo: string, o: OpzioniCristallo): (fino: number) => HTMLCanvasElement {
  const S = o.S ?? 560, sim = simulato(indirizzo), sp = o.spessore ?? Math.max(1, S / 520)
  let { cv, g } = tela(S, o.fondo), fatti = 0
  marca(cv, indirizzo, o, S)
  return (fino: number) => {
    const n = quanti(fino)
    if (n < fatti) { ({ cv, g } = tela(S, o.fondo)); marca(cv, indirizzo, o, S); fatti = 0 }
    if (n > fatti) { disegnaPezzi(g, sim, S, o.colore, sp, fatti, n); fatti = n }
    return cv
  }
}

/** le linee come polilinee con il loro tempo, in pixel di una tela S×S (per il vettoriale) */
export function lineeCristallo(indirizzo: string, o: { S?: number } = {}): { punti: [number, number][]; t: number[] }[] {
  const S = o.S ?? 560, sim = simulato(indirizzo), k = S / sim.L, c = S / 2, eps = 1e-6
  const out: { punti: [number, number][]; t: number[] }[] = []
  let cur: { punti: [number, number][]; t: number[] } | null = null, ux = NaN, uy = NaN
  for (const s of sim.tratti) {
    const a: [number, number] = [c + s.x1 * k, c - s.y1 * k], b: [number, number] = [c + s.x2 * k, c - s.y2 * k]
    if (cur && Math.abs(s.x1 - ux) < eps && Math.abs(s.y1 - uy) < eps) { cur.punti.push(b); cur.t.push(s.t) }
    else { cur = { punti: [a, b], t: [s.t, s.t] }; out.push(cur) }
    ux = s.x2; uy = s.y2
  }
  return out
}

/** la famiglia di sguardo di un indirizzo (per la varietà: piano, lastra, prospettiva, parallelo, viaggio, sorgente…) */
export const famigliaCristallo = (indirizzo: string) => patternDi(indirizzo).famiglia ?? ''

/**
 * La bellezza dichiarata di un motivo (dall'idea del cercatore della camera dei pattern): né vuoto né saturo, il fondo
 * diviso in celle di misura media (le maglie, non buchi minuscoli o grandi vuoti), nitido (poche zone dove tante linee
 * si ammucchiano), pochi frammenti (pezzetti di linea isolati che sembrano rumore).
 */
function voto(sim: Simulato): number {
  if (sim.tratti.length < 30) return 0
  const N = 128, cv = document.createElement('canvas'); cv.width = N; cv.height = N
  const g = cv.getContext('2d', { willReadFrequently: true })!
  disegnaPezzi(g, sim, N, '#000', 1, 0, Q)
  const d = g.getImageData(0, 0, N, N).data, a = new Float32Array(N * N)
  let pieno = 0, saturo = 0
  for (let i = 0; i < N * N; i++) { a[i] = d[i * 4 + 3] / 255; if (a[i] > 0.15) pieno++; if (a[i] > 0.97) saturo++ }
  const fr = pieno / (N * N)
  const campana = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2))
  // le celle: le regioni di fondo, con un riempimento a macchia
  const vis = new Uint8Array(N * N), celle: number[] = []
  for (let i = 0; i < N * N; i++) {
    if (vis[i] || a[i] > 0.15) continue
    let n = 0; const st = [i]; vis[i] = 1
    while (st.length) { const j = st.pop()!; n++; const x = j % N, y = (j / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const q = yy * N + xx; if (!vis[q] && a[q] <= 0.15) { vis[q] = 1; st.push(q) } } }
    celle.push(n)
  }
  const medie = celle.filter(n => n >= 12 && n <= N * N * 0.05).reduce((s, n) => s + n, 0) / Math.max(1, N * N * (1 - fr))
  const minuscole = celle.filter(n => n < 12).length / Math.max(1, celle.length)
  // i frammenti: le isole d'inchiostro piccole
  const vis2 = new Uint8Array(N * N); let isole = 0, piccole = 0
  for (let i = 0; i < N * N; i++) {
    if (vis2[i] || a[i] <= 0.15) continue
    let n = 0; const st = [i]; vis2[i] = 1
    while (st.length) { const j = st.pop()!; n++; const x = j % N, y = (j / N) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const q = yy * N + xx; if (!vis2[q] && a[q] > 0.15) { vis2[q] = 1; st.push(q) } } }
    isole++; if (n < 10) piccole++
  }
  // la ripetizione: quanto l'immagine somiglia a sé stessa spostata (il motivo che torna, non una copia accanto)
  const M = 64, b = new Float32Array(M * M); for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) b[y * M + x] = a[(y * 2) * N + x * 2]
  let mu = 0; for (let i = 0; i < M * M; i++) mu += b[i]; mu /= M * M
  let v0 = 0; for (let i = 0; i < M * M; i++) v0 += (b[i] - mu) ** 2
  let rip = 0
  for (let sy = 0; sy <= 24; sy += 2) for (let sx = (sy ? -24 : 4); sx <= 24; sx += 2) {
    if (Math.hypot(sx, sy) < 4) continue
    let cc = 0, n = 0
    for (let y = Math.max(0, -sy); y < M - Math.max(0, sy); y++) for (let x = Math.max(0, -sx); x < M - Math.max(0, sx); x++) { cc += (b[y * M + x] - mu) * (b[(y + sy) * M + x + sx] - mu); n++ }
    rip = Math.max(rip, (cc / n) / (v0 / (M * M) || 1))
  }
  const vPieno = campana(fr, 0.26, 0.15)
  const vCelle = 0.3 + 0.7 * Math.min(1, medie * 1.6)
  const vNitido = 1 - Math.min(1, (saturo / Math.max(1, pieno)) * 1.8)
  const vPulito = 1 - Math.min(1, (piccole / Math.max(1, isole)) * 0.9) * 0.6 - Math.min(0.4, minuscole * 0.5)
  return Math.max(0, vPieno * vCelle * vNitido * vPulito * (0.35 + 0.9 * Math.min(1, Math.max(0, rip))))
}

/**
 * Cerca nella biblioteca: prova molti indirizzi dal seme finché c'è tempo, e tiene i più belli. Per la varietà, ogni
 * famiglia di sguardo non può prendere più di un terzo dei posti.
 */
export function cercaCristalli(seme: string, n: number, budgetMs: number): { indirizzo: string; voto: number; famiglia: string }[] {
  const t0 = performance.now(), c = sorgente(`cerca/${seme}`)
  const base = Math.floor(c('base') * 1e8), prove: { indirizzo: string; voto: number; famiglia: string }[] = []
  for (let i = 0; performance.now() - t0 < budgetMs; i++) {
    const indirizzo = String(base + i * 7919)
    try {
      const sim = simula(indirizzo, Math.min(500, Math.max(120, budgetMs / 12)))
      cache.set(indirizzo, sim); if (cache.size > 24) cache.delete(cache.keys().next().value as string)
      prove.push({ indirizzo, voto: voto(sim), famiglia: sim.famiglia })
    } catch { /* un indirizzo che non si simula: si passa oltre */ }
  }
  prove.sort((a, b) => b.voto - a.voto)
  const presi: typeof prove = [], perFam = new Map<string, number>(), tetto = Math.max(1, Math.ceil(n / 3))
  const chiave = (f: string) => f.split('/').filter(x => x !== 'tessera').slice(0, 2).join('/')
  for (const p of prove) { if (presi.length >= n) break; const f = chiave(p.famiglia); if ((perFam.get(f) ?? 0) >= tetto) continue; perFam.set(f, (perFam.get(f) ?? 0) + 1); presi.push(p) }
  for (const p of prove) { if (presi.length >= n) break; if (!presi.includes(p)) presi.push(p) }
  return presi
}
