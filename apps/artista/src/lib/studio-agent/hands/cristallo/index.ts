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
import { tesseraDelleOrbite, controcampo } from './linee'

type Vec = [number, number, number]
interface Pattern { orbite?: string[]; reticolo: Record<string, unknown> & { piano?: boolean }; atomi: { p: Vec; s: number }[]; w: number; U0: number; r0: Vec; v0: Vec; B: Vec; T: number; difetti: number; finestra: { C: Vec; R: number; n: Vec; psi: number; L: number; D: number; h: number; modo: string }; vista: string; tempo: number; sorgente?: number; famiglia?: string }
export interface OpzioniCristallo { S?: number; colore: string; fondo?: string | null; fino?: number; spessore?: number }
/** un tratto nella finestra (unità di Cristallo: la finestra è larga L), con la sua luminosità (profondità), la velocità e il tempo */
interface Tratto { x1: number; y1: number; x2: number; y2: number; l: number; v: number; t: number }
/** come si disegna (dal caso dell'indirizzo): filo sottile, gerarchia di spessori, nastro alla Lewis Day (linea spessa con il
 *  contorno, che si intreccia sopra e sotto), campitura (il controcampo: le celle chiuse piene a scacchi), luce (alone) */
export type Stile = 'filo' | 'gerarchia' | 'nastro' | 'campitura' | 'luce' | 'tratteggio'
interface Simulato { p: Pattern; L: number; tratti: Tratto[]; famiglia: string; ms: number; stile: Stile; vmax: number; bande?: { G: number; b: Uint8Array } }

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
  const u = c('famiglia'), fam = u < 0.3 ? 'orbite' : u < 0.52 ? 'canale' : u < 0.6 ? 'lastra' : u < 0.75 ? 'viaggio' : 'onde'
  if (fam === 'onde') { p.famiglia = 'onde'; p.vista = 'onde'; p.finestra = { ...p.finestra, L: 1, R: Infinity }; return p }
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
      p.orbiteDa = { semi: 40, quante: 1 + Math.floor(c('quante orbite') * 4), sorgente: c('sorgente orbite') < 0.62 }
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

/** lo stile, dal caso dell'indirizzo, pesato per famiglia (i nastri e le campiture stanno bene sulle linee chiuse) */
function stileDi(indirizzo: string, fam: string): Stile {
  const u = sorgente(`stile/${indirizzo}`)('stile'), f = fam.split('/')[0]
  const pesi: [Stile, number][] = f === 'orbite' ? [['filo', 1], ['gerarchia', 1.2], ['nastro', 2], ['campitura', 1.6], ['luce', 1], ['tratteggio', 0.6]]
    : f === 'onde' ? [['campitura', 2.4], ['nastro', 1.4], ['tratteggio', 1], ['filo', 0.6]]
    : f === 'viaggio' ? [['filo', 1.2], ['gerarchia', 1.4], ['luce', 1.6], ['nastro', 0.5]]
    : [['filo', 1.4], ['gerarchia', 1.6], ['luce', 1], ['nastro', 0.4], ['campitura', 0.4]]
  const tot = pesi.reduce((a, [, w]) => a + w, 0); let x = u * tot
  for (const [st, w] of pesi) { if ((x -= w) <= 0) return st }
  return 'filo'
}

/**
 * Le onde stazionarie nel cristallo: la somma di onde piane sui vettori del reticolo reciproco, presi a orbite intere sotto
 * le rotazioni della cella (6 nell'esagonale, 4 nel quadrato). Le linee nodali (dove la somma vale un livello) sono il
 * disegno, il segno della somma è il controcampo. Il tempo: le linee nascono dal centro verso fuori (come un cristallo).
 */
function simulaOnde(indirizzo: string): Simulato {
  const t0 = performance.now(), c = sorgente(`onde/${indirizzo}`)
  const esa = c('reticolo') < 0.55, rec = esa ? [[1, 1 / Math.sqrt(3)], [0, 2 / Math.sqrt(3)]] : [[1, 0], [0, 1]], nrot = esa ? 6 : 4
  const ruota = (v: number[], a: number) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)]
  const scelte: [number, number][] = [[1, 0], [1, 1], [2, 1], [2, 0], [3, 1], [3, 2], [1, 2]]
  const nOnde = 2 + Math.floor(c('quante onde') * 2), chirale = c('chirale') < 0.4
  const termini: [number, number, number, number][] = []
  for (let i = 0; i < nOnde; i++) {
    const [h, k] = scelte[Math.floor(c(`hk ${i}`) * scelte.length)], A = i === 0 ? 1 : 0.25 + 0.6 * c(`A ${i}`), ph = chirale ? 2 * Math.PI * c(`fase ${i}`) : 0
    const G = [h * rec[0][0] + k * rec[1][0], h * rec[0][1] + k * rec[1][1]]
    for (let j = 0; j < nrot; j++) { const g = ruota(G, (2 * Math.PI * j) / nrot); termini.push([g[0] * 2 * Math.PI, g[1] * 2 * Math.PI, A, ph]) }
  }
  const nLiv = 1 + Math.floor(c('livelli') * 3), livelli = Array.from({ length: nLiv }, (_, i) => nLiv === 1 ? (c('livello') - 0.5) * 0.8 : -0.9 + (1.8 * (i + 0.5)) / nLiv + (c(`liv ${i}`) - 0.5) * 0.2)
  const scala = 2 + 2.5 * c('scala'), rot0 = 2 * Math.PI * c('rotazione'), G = 260, L = 1
  const f = new Float32Array((G + 1) * (G + 1))
  for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
    const [x, y] = ruota([((i / G) - 0.5) * scala, ((j / G) - 0.5) * scala], rot0)
    let v = 0; for (const [gx, gy, A, ph] of termini) v += A * Math.cos(gx * x + gy * y + ph)
    f[j * (G + 1) + i] = v
  }
  let mx = 0; for (let i = 0; i < f.length; i++) mx = Math.max(mx, Math.abs(f[i])); for (let i = 0; i < f.length; i++) f[i] /= mx || 1
  // le linee nodali: marching squares su ogni livello
  const out: Tratto[] = [], P = (i: number, j: number) => [((i / G) - 0.5) * L, (0.5 - j / G) * L]
  for (const lv of livelli) for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    const a = f[j * (G + 1) + i] - lv, b = f[j * (G + 1) + i + 1] - lv, cc = f[(j + 1) * (G + 1) + i + 1] - lv, d = f[(j + 1) * (G + 1) + i] - lv
    const pts: number[][] = []
    const e = (x0: number, y0: number, v0: number, x1: number, y1: number, v1: number) => { const t = v0 / (v0 - v1); pts.push(P(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) }
    if ((a > 0) !== (b > 0)) e(i, j, a, i + 1, j, b)
    if ((b > 0) !== (cc > 0)) e(i + 1, j, b, i + 1, j + 1, cc)
    if ((cc > 0) !== (d > 0)) e(i + 1, j + 1, cc, i, j + 1, d)
    if ((d > 0) !== (a > 0)) e(i, j + 1, d, i, j, a)
    for (let q = 0; q + 1 < pts.length; q += 2) out.push({ x1: pts[q][0], y1: pts[q][1], x2: pts[q + 1][0], y2: pts[q + 1][1], l: 1, v: 0, t: 0 })
  }
  // il tempo: dal centro verso fuori, con un po' di rumore (fronti di cristallizzazione)
  const ru = c.serie('ritmo')
  out.forEach((t, k) => { const m = Math.hypot((t.x1 + t.x2) / 2, (t.y1 + t.y2) / 2) / (L * 0.72); t.t = Math.min(1, m * 0.92 + 0.08 * ru(k % 997)) })
  out.sort((a, b) => a.t - b.t)
  // il controcampo: le bande tra i livelli, a pari e dispari
  const b = new Uint8Array(G * G)
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const v = f[j * (G + 1) + i]; let n = 0; for (const lv of livelli) if (v > lv) n++; b[j * G + i] = n % 2 }
  const p = { famiglia: 'onde', finestra: { L } } as unknown as Pattern
  return { p, L, tratti: out, famiglia: 'onde/' + (esa ? 'esagonale' : 'quadrato') + (chirale ? '/chirale' : ''), ms: performance.now() - t0, stile: stileDi(indirizzo, 'onde'), vmax: 1, bande: { G, b } }
}

const PIENO = 0.2          // l'inchiostro oltre il quale la linea smette di crescere (il motivo diventerebbe nebbia)
const MAX_TRATTI = 220_000  // un tetto sui tratti disegnati
const LOTTO = 40            // i tratti della tessera proiettati insieme: il tempo di ognuno è quello del suo lotto

/** simula una volta: i tratti con il loro tempo, ordinati per tempo */
function simula(indirizzo: string, budgetMs = 650): Simulato {
  const t0 = performance.now(), p = patternDi(indirizzo)
  if (p.famiglia === 'onde') return simulaOnde(indirizzo)
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
  let vmax = 0; for (const t of out) vmax = Math.max(vmax, t.v)
  return { p, L, tratti: out, famiglia: p.famiglia ?? '', ms: performance.now() - t0, stile: stileDi(indirizzo, p.famiglia ?? ''), vmax: vmax || 1 }
}

const cache = new Map<string, Simulato>()
function simulato(indirizzo: string) {
  let s = cache.get(indirizzo)
  if (!s) { s = simula(indirizzo); cache.set(indirizzo, s); if (cache.size > 24) cache.delete(cache.keys().next().value as string) }
  return s
}

const Q = 64 // i passi di crescita: il disegno va per pezzi di tempo, ognuno con i suoi tratti raggruppati per spessore e tono

/** quanto è spesso un tratto, nello stile: la gerarchia viene dalla fisica (lenta = spessa, vicina = spessa) */
function larghezza(sim: Simulato, t: Tratto, sp: number): number {
  const lento = 1 - Math.min(1, t.v / sim.vmax), vicino = 0.5 + 0.5 * Math.min(1, t.l)
  switch (sim.stile) {
    case 'gerarchia': return sp * (0.5 + 2.6 * lento * lento) * vicino
    case 'nastro': return sp * 4.6 * (0.65 + 0.35 * vicino)
    case 'campitura': case 'tratteggio': return sp * 1.5 * vicino
    case 'luce': return sp * 0.9 * vicino
    default: return sp * 0.95 * vicino
  }
}

function disegnaPezzi(g: CanvasRenderingContext2D, sim: Simulato, S: number, colore: string, spessore: number, da: number, a: number) {
  const k = S / sim.L, cx = S / 2, cy = S / 2, sp = spessore
  g.strokeStyle = colore; g.lineCap = 'round'; g.lineJoin = 'round'; g.globalCompositeOperation = 'source-over'
  const tr = sim.tratti
  for (let pz = da; pz < a; pz++) {
    const t0 = pz / Q, t1 = (pz + 1) / Q
    // i tratti di questo pezzo di tempo (sono in ordine di tempo: si cerca l'inizio con una bisezione)
    let lo = 0, hi = tr.length
    while (lo < hi) { const m = (lo + hi) >> 1; if (tr[m].t <= t0 && pz > 0) lo = m + 1; else hi = m }
    // raggruppati per spessore (6 classi) e tono (4 classi): pochi tracciati per pezzo
    const gruppi = new Map<number, { w: number; al: number; t: Tratto[] }>()
    for (let i = pz === 0 ? 0 : lo; i < tr.length && (tr[i].t <= t1 || pz === Q - 1); i++) {
      const w = larghezza(sim, tr[i], sp), wb = Math.round(Math.log2(Math.max(0.25, w)) * 3), ab = Math.min(3, Math.floor(tr[i].l * 4))
      const key = wb * 8 + ab
      let gr = gruppi.get(key); if (!gr) { gr = { w: Math.pow(2, wb / 3), al: 0.32 + 0.2 * ab, t: [] }; gruppi.set(key, gr) }
      gr.t.push(tr[i])
    }
    const traccia = (gr: { t: Tratto[] }) => { g.beginPath(); for (const s of gr.t) { g.moveTo(cx + s.x1 * k, cy - s.y1 * k); g.lineTo(cx + s.x2 * k, cy - s.y2 * k) } }
    for (const gr of [...gruppi.values()].sort((x, y) => y.w - x.w)) {
      if (sim.stile === 'nastro') {
        // il nastro: la linea spessa, poi il suo interno svuotato; i nastri dopo passano sopra quelli prima (l'intreccio)
        g.globalAlpha = 1; g.lineWidth = gr.w; traccia(gr); g.stroke()
        g.globalCompositeOperation = 'destination-out'; g.lineWidth = gr.w * 0.5; g.stroke(); g.globalCompositeOperation = 'source-over'
      } else if (sim.stile === 'luce') {
        // l'alone: tre passate, larga e lieve, media, sottile e piena
        traccia(gr)
        g.globalAlpha = 0.05 * (0.5 + gr.al); g.lineWidth = gr.w * 7; g.stroke()
        g.globalAlpha = 0.16 * (0.5 + gr.al); g.lineWidth = gr.w * 2.6; g.stroke()
        g.globalAlpha = Math.min(1, 0.4 + gr.al); g.lineWidth = gr.w; g.stroke()
      } else {
        g.globalAlpha = sim.stile === 'filo' ? gr.al : Math.min(1, gr.al + 0.25); g.lineWidth = gr.w; traccia(gr); g.stroke()
      }
    }
  }
  g.globalAlpha = 1
}

/**
 * Il controcampo (di Day): le regioni tra le linee colorate a scacchi, pari e dispari. Nelle onde è il segno della somma;
 * negli altri si calcola sulle linee disegnate. Va sotto le linee (destination-over), a disegno finito.
 */
function riempi(g: CanvasRenderingContext2D, sim: Simulato, S: number, colore: string, sp: number) {
  const sopra = campo(sim, S, colore, sp)
  if (sopra) { g.globalCompositeOperation = 'destination-over'; g.drawImage(sopra, 0, 0); g.globalCompositeOperation = 'source-over' }
}

/** il controcampo come tela a sé (le celle piene a scacchi, o tratteggiate), o null se lo stile non campisce */
function campo(sim: Simulato, S: number, colore: string, sp: number): HTMLCanvasElement | null {
  if (!(sim.stile === 'campitura' || sim.stile === 'tratteggio' || sim.stile === 'nastro' || sim.bande)) return null
  let N: number, cella: Uint8Array
  if (sim.bande) { N = sim.bande.G; cella = sim.bande.b }
  else {
    N = Math.min(360, S)
    const m = document.createElement('canvas'); m.width = N; m.height = N
    const q = m.getContext('2d', { willReadFrequently: true })!
    const sim2: Simulato = { ...sim, stile: 'filo' }
    disegnaPezzi(q, sim2, N, '#000', Math.max(1.4, (sp * N) / S * (sim.stile === 'nastro' ? 4 : 1.5)), 0, Q)
    const d = q.getImageData(0, 0, N, N).data, linee = new Uint8Array(N * N)
    for (let i = 0; i < N * N; i++) linee[i] = d[i * 4 + 3] > 50 ? 1 : 0
    const cc = controcampo(linee, N, N) as Uint8Array
    cella = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) cella[i] = cc[i] === 2 ? 1 : 0
  }
  const f = document.createElement('canvas'); f.width = N; f.height = N
  const fq = f.getContext('2d')!, img = fq.createImageData(N, N)
  const h = colore.replace('#', ''), R0 = parseInt(h.slice(0, 2), 16) || 0, G0 = parseInt(h.slice(2, 4), 16) || 0, B0 = parseInt(h.slice(4, 6), 16) || 0
  const alfa = sim.stile === 'nastro' ? 0.2 : sim.stile === 'tratteggio' ? 1 : 0.42
  for (let i = 0; i < N * N; i++) if (cella[i]) { img.data[i * 4] = R0; img.data[i * 4 + 1] = G0; img.data[i * 4 + 2] = B0; img.data[i * 4 + 3] = Math.round(255 * alfa) }
  fq.putImageData(img, 0, 0)
  const sopra = document.createElement('canvas'); sopra.width = S; sopra.height = S
  const sg = sopra.getContext('2d')!; sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = 'high'; sg.drawImage(f, 0, 0, S, S)
  if (sim.stile === 'tratteggio') {
    // il tratteggio da incisore: righe oblique fitte dentro le celle piene
    sg.globalCompositeOperation = 'source-in'; sg.strokeStyle = colore; sg.lineWidth = Math.max(1, S / 420); sg.beginPath()
    const passo = S / 70, an = sorgente(`tratteggio/${sim.famiglia}`)('angolo') < 0.5 ? 1 : -1
    for (let x = -S; x < 2 * S; x += passo) { sg.moveTo(x, 0); sg.lineTo(x + an * S, S) }
    sg.stroke()
  }
  return sopra
}

const quanti = (fino: number) => Math.max(0, Math.min(Q, Math.ceil(fino * Q - 1e-9)))
function tela(S: number, fondo: string | null | undefined) {
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S
  const g = cv.getContext('2d')!
  void fondo // il fondo va sotto a disegno fatto (i nastri svuotano il loro interno: non devono bucare il fondo)
  return { cv, g }
}
function marca(cv: HTMLCanvasElement, indirizzo: string, o: OpzioniCristallo, S: number) {
  (cv as HTMLCanvasElement & { __ricetta?: unknown }).__ricetta = { tool: 'cristallo', p: { indirizzo, colore: o.colore, S } }
  return cv
}

/** il motivo dell'indirizzo, di un colore solo (fondo trasparente se null), cresciuto fino alla frazione `fino` del suo tempo */
export function disegnaCristallo(indirizzo: string, o: OpzioniCristallo): HTMLCanvasElement {
  const S = o.S ?? 560, sim = simulato(indirizzo), { cv, g } = tela(S, o.fondo)
  const sp = o.spessore ?? Math.max(1, S / 520), n = quanti(o.fino ?? 1)
  disegnaPezzi(g, sim, S, o.colore, sp, 0, n)
  if (n >= Q) riempi(g, sim, S, o.colore, sp)
  if (o.fondo) { g.globalCompositeOperation = 'destination-over'; g.fillStyle = o.fondo; g.fillRect(0, 0, S, S); g.globalCompositeOperation = 'source-over' }
  return marca(cv, indirizzo, o, S)
}

/** la crescita: simula una volta; ogni stato aggiunge solo i pezzi nuovi (all'indietro ridisegna da capo) */
export function crescitaCristallo(indirizzo: string, o: OpzioniCristallo): (fino: number) => HTMLCanvasElement {
  const S = o.S ?? 560, sim = simulato(indirizzo), sp = o.spessore ?? Math.max(1, S / 520)
  // si lavora su una tela trasparente; ogni stato è il fondo, poi il controcampo che sale nell'ultimo quarto, poi le linee
  // (i nastri non bucano il fondo). Il controcampo si calcola una volta, alla creazione: gli stati restano leggeri
  let { cv, g } = tela(S, null), fatti = 0
  const piena = campo(sim, S, o.colore, sp)
  const fuori = o.fondo || piena ? tela(S, null) : null
  marca(fuori ? fuori.cv : cv, indirizzo, o, S)
  return (fino: number) => {
    const n = quanti(fino)
    if (n < fatti) { ({ cv, g } = tela(S, null)); fatti = 0; if (!fuori) marca(cv, indirizzo, o, S) }
    if (n > fatti) { disegnaPezzi(g, sim, S, o.colore, sp, fatti, n); fatti = n }
    if (!fuori) return cv
    const fg = fuori.g
    fg.globalCompositeOperation = 'source-over'; fg.globalAlpha = 1
    if (o.fondo) { fg.fillStyle = o.fondo; fg.fillRect(0, 0, S, S) } else fg.clearRect(0, 0, S, S)
    const a = piena ? Math.max(0, Math.min(1, (n - 0.75 * Q) / (0.25 * Q))) : 0
    if (piena && a > 0) { fg.globalAlpha = a; fg.drawImage(piena, 0, 0); fg.globalAlpha = 1 }
    fg.drawImage(cv, 0, 0)
    return fuori.cv
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

/** quello che si misura di un motivo finito (disegnato nel suo stile, a 128 px): serve al voto e alle nicchie */
interface Analisi { pieno: number; celleMedie: number; minuscole: number; frammenti: number; saturo: number; ripetizione: number; simmetria: number; curvatura: number; prospettiva: number; gerarchia: number }
const analisi = new Map<string, Analisi>()
function analizza(sim: Simulato, chiave?: string): Analisi {
  const giaFatta = chiave ? analisi.get(chiave) : undefined
  if (giaFatta) return giaFatta
  const N = 128, cv = document.createElement('canvas'); cv.width = N; cv.height = N
  const g = cv.getContext('2d', { willReadFrequently: true })!
  disegnaPezzi(g, sim, N, '#000', 1, 0, Q); riempi(g, sim, N, '#000', 1)
  const d = g.getImageData(0, 0, N, N).data, a = new Float32Array(N * N)
  let pieno = 0, saturo = 0
  for (let i = 0; i < N * N; i++) { a[i] = d[i * 4 + 3] / 255; if (a[i] > 0.15) pieno++; if (a[i] > 0.97) saturo++ }
  const fr = pieno / (N * N)
  // le celle: le regioni di fondo (riempimento a macchia); le isole d'inchiostro piccole sono frammenti
  const regioni = (dentro: (v: number) => boolean, otto: boolean) => {
    const vis = new Uint8Array(N * N), dim: number[] = []
    for (let i = 0; i < N * N; i++) {
      if (vis[i] || !dentro(a[i])) continue
      let n = 0; const st = [i]; vis[i] = 1
      while (st.length) { const j = st.pop()!; n++; const x = j % N, y = (j / N) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; if (!otto && dx && dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const q = yy * N + xx; if (!vis[q] && dentro(a[q])) { vis[q] = 1; st.push(q) } } }
      dim.push(n)
    }
    return dim
  }
  const celle = regioni(v => v <= 0.15, false), isole = regioni(v => v > 0.15, true)
  const celleMedie = celle.filter(n => n >= 12 && n <= N * N * 0.05).reduce((s, n) => s + n, 0) / Math.max(1, N * N * (1 - fr))
  const minuscole = celle.filter(n => n < 12).length / Math.max(1, celle.length)
  const frammenti = isole.filter(n => n < 10).length / Math.max(1, isole.length)
  // la ripetizione (il motivo che torna) e la simmetria (il motivo uguale a sé girato attorno al centro: 180°, 90°, 60°)
  const M = 64, b = new Float32Array(M * M); for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) b[y * M + x] = a[(y * 2) * N + x * 2]
  let mu = 0; for (let i = 0; i < M * M; i++) mu += b[i]; mu /= M * M
  let v0 = 0; for (let i = 0; i < M * M; i++) v0 += (b[i] - mu) ** 2
  const varianza = v0 / (M * M) || 1
  let rip = 0
  for (let sy = 0; sy <= 24; sy += 2) for (let sx = (sy ? -24 : 4); sx <= 24; sx += 2) {
    if (Math.hypot(sx, sy) < 4) continue
    let cc = 0, n = 0
    for (let y = Math.max(0, -sy); y < M - Math.max(0, sy); y++) for (let x = Math.max(0, -sx); x < M - Math.max(0, sx); x++) { cc += (b[y * M + x] - mu) * (b[(y + sy) * M + x + sx] - mu); n++ }
    rip = Math.max(rip, (cc / n) / varianza)
  }
  let sim2 = 0
  for (const ang of [Math.PI, Math.PI / 2, Math.PI / 3]) {
    let cc = 0, n = 0; const co = Math.cos(ang), si = Math.sin(ang)
    for (let y = 8; y < M - 8; y++) for (let x = 8; x < M - 8; x++) { const dx = x - M / 2, dy = y - M / 2, X = Math.round(M / 2 + dx * co - dy * si), Y = Math.round(M / 2 + dx * si + dy * co); if (X < 0 || Y < 0 || X >= M || Y >= M) continue; cc += (b[y * M + x] - mu) * (b[Y * M + X] - mu); n++ }
    sim2 = Math.max(sim2, (cc / Math.max(1, n)) / varianza)
  }
  // la curvatura: quanto gira la linea tra un tratto e il successivo (su un campione)
  let giro = 0, nn = 0
  const tr = sim.tratti, passoC = Math.max(1, Math.floor(tr.length / 3000))
  for (let i = passoC; i < tr.length; i += passoC) { const p0 = tr[i - 1], p1 = tr[i]; if (Math.abs(p0.x2 - p1.x1) + Math.abs(p0.y2 - p1.y1) > 1e-6) continue; const a0 = Math.atan2(p0.y2 - p0.y1, p0.x2 - p0.x1), a1 = Math.atan2(p1.y2 - p1.y1, p1.x2 - p1.x1); let da = Math.abs(a1 - a0); if (da > Math.PI) da = 2 * Math.PI - da; giro += da; nn++ }
  // la gerarchia: quanto variano gli spessori
  let w1 = 0, w2 = 0, nw = 0
  for (let i = 0; i < tr.length; i += passoC * 3) { const w = larghezza(sim, tr[i], 1); w1 += w; w2 += w * w; nw++ }
  const wm = w1 / Math.max(1, nw), gerarchia = nw ? Math.sqrt(Math.max(0, w2 / nw - wm * wm)) / (wm || 1) : 0
  const out: Analisi = {
    pieno: fr, celleMedie, minuscole, frammenti, saturo: saturo / Math.max(1, pieno),
    ripetizione: Math.max(0, Math.min(1, rip)), simmetria: Math.max(0, Math.min(1, sim2)),
    curvatura: Math.min(1, nn ? (giro / nn) * 4 : 0), prospettiva: sim.p?.finestra?.R !== undefined && Number.isFinite(sim.p.finestra.R) ? 1 : 0, gerarchia: Math.min(1, gerarchia),
  }
  if (chiave) { analisi.set(chiave, out); if (analisi.size > 400) analisi.delete(analisi.keys().next().value as string) }
  return out
}

/**
 * La bellezza dichiarata di un motivo (dall'idea del cercatore della camera dei pattern, corretta guardando i risultati):
 * né vuoto né saturo; il fondo diviso in celle di misura media (le maglie, non buchi minuscoli o grandi vuoti); nitido;
 * pochi frammenti (i coriandoli); niente groviglio (tanto inchiostro senza maglie); il motivo che torna o che è simmetrico;
 * una gerarchia di linee è un pregio.
 */
function voto(sim: Simulato, chiave?: string): number {
  if (sim.tratti.length < 30) return 0
  const A = analizza(sim, chiave)
  const campana = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2))
  const pieno = sim.stile === 'campitura' || sim.stile === 'tratteggio' || sim.stile === 'nastro' || sim.bande ? campana(A.pieno, 0.55, 0.3)
    : sim.stile === 'gerarchia' ? campana(A.pieno, 0.42, 0.26) : campana(A.pieno, 0.3, 0.2)
  const celle = 0.25 + 0.75 * Math.min(1, A.celleMedie * 1.7)
  const nitido = 1 - Math.min(1, A.saturo * (sim.stile === 'nastro' || sim.stile === 'campitura' ? 0.6 : 1.8))
  const pulito = 1 - Math.min(1, A.frammenti * 1.3) * 0.75 - Math.min(sim.stile === 'nastro' ? 0.25 : 0.4, A.minuscole * 0.6)
  // il groviglio: molto inchiostro senza celle, oppure tante isole minuscole senza celle medie (gomitoli di cerchi)
  const groviglio = (1 - Math.max(0, Math.min(0.85, (A.pieno - 0.3) * 2.5 * (1 - Math.min(1, A.celleMedie * 2)))))
    * (1 - Math.max(0, Math.min(0.9, (A.minuscole - 0.5) * 2 * (1 - Math.min(1, A.celleMedie * 3)))))
  const ordine = 0.3 + 0.7 * Math.max(A.ripetizione, A.simmetria * 0.9)
  const gerarchia = 1 + 0.25 * A.gerarchia
  return Math.max(0, pieno * celle * nitido * pulito * groviglio * ordine * gerarchia)
}

/** le famiglie di sguardo raggiungibili dagli indirizzi */
export function famiglieCristallo(): string[] { return ['orbite', 'orbite/sorgente', 'canale', 'lastra', 'viaggio', 'onde'] }

/**
 * Pochi numeri che dicono che motivo è (per una collezione a nicchie, MAP-Elites), tutti in [0, 1]:
 * [densità, simmetria, curvatura, regolarità (ripetizione), prospettiva, gerarchia delle linee, campitura]
 */
export function descrittoreCristallo(indirizzo: string): number[] {
  const sim = simulato(indirizzo), A = analizza(sim, indirizzo)
  const camp = sim.bande || sim.stile === 'campitura' || sim.stile === 'tratteggio' ? 1 : sim.stile === 'nastro' ? 0.5 : 0
  return [A.pieno, A.simmetria, A.curvatura, A.ripetizione, A.prospettiva, A.gerarchia, camp].map(x => +Math.max(0, Math.min(1, x)).toFixed(3))
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
      const sim = simula(indirizzo, Math.min(320, Math.max(90, budgetMs / 80)))
      cache.set(indirizzo, sim); if (cache.size > 24) cache.delete(cache.keys().next().value as string)
      prove.push({ indirizzo, voto: voto(sim, indirizzo), famiglia: `${sim.famiglia}·${sim.stile}` })
    } catch { /* un indirizzo che non si simula: si passa oltre */ }
  }
  prove.sort((a, b) => b.voto - a.voto)
  const presi: typeof prove = [], perFam = new Map<string, number>(), tetto = Math.max(1, Math.ceil(n / 4))
  // la varietà: la famiglia di sguardo e lo stile insieme (non più di un quarto dei posti a una sola coppia)
  const chiave = (f: string) => `${f.split('/')[0]}·${f.split('·')[1] ?? ''}`
  for (const p of prove) { if (presi.length >= n) break; const f = chiave(p.famiglia); if ((perFam.get(f) ?? 0) >= tetto) continue; perFam.set(f, (perFam.get(f) ?? 0) + 1); presi.push(p) }
  for (const p of prove) { if (presi.length >= n) break; if (!presi.includes(p)) presi.push(p) }
  return presi
}
