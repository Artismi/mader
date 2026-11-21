/**
 * La retorica emergente: come argomenta, a parole e con le immagini.
 * Niente formule scritte a mano: pochi mattoni e regole che cambiano.
 *
 * 1. Impara i connettivi da quello che legge: le parole "di giuntura" (che non sono nomi né verbi del dizionario)
 *    all'inizio di una frase o dopo una virgola; dal contesto in cui compaiono capisce a cosa servono
 *    (contrasto, causa, somiglianza, sequenza, dubbio, esempio). Le regole che leggono il contesto hanno pesi
 *    che si spostano con l'esperienza.
 * 2. Impara un immaginario: per ogni concetto, i colori e i movimenti con cui lo trova scritto.
 * 3. Una mossa è un piccolo programma (fatto, legame, esempio, dubbio, citazione, domanda, conclusione...).
 *    A ogni conclusione genera varianti delle mosse migliori, le scrive, le giudica (coerenza, leggibilità,
 *    distanza da quello che ha già scritto) e tiene la migliore; le mosse si rafforzano o si spengono.
 * 4. La stessa relazione si dice anche con l'immagine: per ogni relazione impara quali impaginazioni la dicono meglio,
 *    dal giudizio del suo occhio sulle tavole, con un po' di esplorazione.
 * 5. Si stanca: connettivi, mosse e impaginazioni usate di recente valgono meno.
 * 6. La voce del profeta, se gli viene: dalle letture raccoglie frasi al futuro e racconti al passato remoto.
 *    Solo dopo averne letti abbastanza può usarli: volgere una conclusione al futuro (profezia), ridire il suo
 *    processo come un racconto letto altrove con dentro le sue parole (parabola), risalire dal concetto a ciò che lo
 *    contiene, gradino per gradino nel lessico, fino al tutto. Quanto ci tiene a questa voce (la vocazione) cambia
 *    con quello che succede ai testi che la usano.
 */
import { lette } from './pensiero'
import { fattiSu, fraseDi } from '../voice/scrittura'
import type { AgentState } from '../core/types'
import { pick, type Rnd } from '../core/rng'
import { categorie, iperonimo, verbi } from '../reader/concepts'
import { art } from '../voice/lingua'

export type RelR = 'contrasto' | 'causa' | 'somiglianza' | 'sequenza' | 'dubbio' | 'esempio'
const RELS: RelR[] = ['contrasto', 'causa', 'somiglianza', 'sequenza', 'dubbio', 'esempio']
export type Op = 'A' | 'B' | 'C' | 'L' | 'E' | 'D' | 'Q' | 'R' | 'N' | 'F' | 'P' | 'U'
// A = prima premessa, B = seconda premessa, C = conclusione, L = legame (un connettivo), E = esempio concreto dalla lettura,
// D = dubbio (un segnale di incertezza), Q = domanda, R = citazione breve, N = negazione/ripensamento,
// F = la conclusione volta al futuro (profezia), P = parabola (un racconto letto, con dentro i suoi concetti), U = risalita verso il tutto
export interface Mossa { ops: Op[]; rel: RelR; peso: number; usi: number; nata: number; ultimo: number }
interface Connettivo { n: number; rel: Partial<Record<RelR, number>>; usi: number; ultimo: number; doc?: string[] }
interface Immagine { colori: Record<string, number>; moti: Record<string, number>; docs?: Record<string, string[]> }
export interface Retorica {
  connettivi: Record<string, Connettivo>
  regole: Record<string, number> // i pesi delle regole che leggono il contesto: anche loro cambiano
  immaginario: Record<string, Immagine>
  mosse: Mossa[]
  visive: Record<string, Record<string, { w: number; n: number; ultimo: number }>>
  memoria: string[] // le ultime cose scritte, per non ripetersi
  fonti?: Record<string, string[]> // per ogni lettura recente, le frasi concrete (nomi, date, luoghi): la materia degli esempi
  diario: { day: number; nota: string }[]
  voci?: { futuro: string[]; racconto: string[] }
  vocazione?: number
}
type WithR = AgentState & { retorica?: Retorica }
export function getRetorica(st: AgentState): Retorica {
  const W = st as WithR
  if (!W.retorica) W.retorica = { connettivi: {}, regole: { neg: 1, come: 1, nome: 1, domanda: 1, modale: 1, ripete: 1, tempo: 1, perche: 1 }, immaginario: {}, mosse: [], visive: {}, memoria: [], diario: [] }
  const R = W.retorica
  // le mosse antenate: poche e semplici; tutto il resto nasce da qui
  if (!R.mosse.length) R.mosse = ([['A', 'L', 'C'], ['C', 'L', 'A'], ['A', 'B', 'C'], ['D', 'C'], ['A', 'L', 'B', 'Q'], ['E', 'C']] as Op[][]).map((ops, i) => ({ ops, rel: RELS[i % RELS.length], peso: 1, usi: 0, nata: st.day, ultimo: -99 }))
  return R
}
const nota = (st: AgentState, n: string) => { const R = getRetorica(st); R.diario = [...R.diario, { day: st.day, nota: n }].slice(-80) }

// ── 1. leggere: connettivi e immaginario ──
const COLORI: Record<string, string> = {
  rosso: '#c8102e', blu: '#1d4ed8', azzurro: '#38bdf8', celeste: '#7dd3fc', verde: '#15803d', giallo: '#facc15', nero: '#111111', bianco: '#f5f5f0',
  grigio: '#8a8a8a', viola: '#7c3aed', arancione: '#f97316', rosa: '#f472b6', marrone: '#7c4a2a', oro: '#c9a227', dorato: '#c9a227', argento: '#c0c0c0',
  porpora: '#7e1e5a', turchese: '#14b8a6', ocra: '#cc8a2e', cremisi: '#9b111e', scarlatto: '#ff2400', bruno: '#5b3a29', cenere: '#b2beb5', avorio: '#f4efe1',
  rossa: '#c8102e', nera: '#111111', bianca: '#f5f5f0', gialla: '#facc15', verdi: '#15803d', rossi: '#c8102e', neri: '#111111', bianchi: '#f5f5f0', blu_: '#1d4ed8',
}
export const coloreDi = (w: string) => COLORI[w.toLowerCase()]
const parole = (s: string): string[] => s.toLowerCase().match(/[a-zàèéìòù']+/g) ?? []
/** parola di giuntura: per il dizionario non è né nome né verbo né aggettivo (congiunzioni, avverbi, locuzioni) */
// la grammatica di base (articoli, preposizioni, pronomi, ausiliari) non è retorica: si esclude
const GRAMMATICA = /^(il|lo|la|i|gli|le|l'|un|uno|una|un'|di|a|da|in|con|su|per|tra|fra|del|dell'|della|dello|dei|degli|delle|al|all'|alla|allo|ai|agli|alle|dal|dall'|dalla|dallo|dai|dagli|dalle|nel|nell'|nella|nello|nei|negli|nelle|sul|sull'|sulla|sullo|sui|sugli|sulle|col|coi|che|chi|cui|si|ci|ne|non|e|ed|o|od|è|era|erano|fu|furono|sono|sia|siano|fosse|fossero|ha|hanno|aveva|avevano|ebbe|venne|vennero|viene|vengono|essere|avere|questo|questa|questi|queste|quello|quella|quelli|quelle|suo|sua|suoi|sue|loro|esso|essa|egli|ella|lui|lei|io|tu|noi|voi|mio|tuo)$/
/** è una parola "piena" (nome, verbo, aggettivo) anche se flessa? prova a ricondurla al dizionario */
function piena(w: string): boolean {
  const c = categorie(w)
  if (c.some(x => x !== 'r')) return true
  if (verbi().has(w)) return true
  const prove: string[] = []
  for (const [fine, base] of [['i', 'o'], ['i', 'e'], ['e', 'a'], ['he', 'a'], ['hi', 'o'], ['a', 'o'], ['e', 'o'], ['ie', 'ia']] as const) if (w.endsWith(fine)) prove.push(w.slice(0, -fine.length) + base)
  for (const [fine, base] of [['ando', 'are'], ['endo', 'ere'], ['endo', 'ire'], ['ato', 'are'], ['ata', 'are'], ['ati', 'are'], ['ate', 'are'], ['uto', 'ere'], ['uta', 'ere'], ['uti', 'ere'], ['ito', 'ire'], ['ita', 'ire'], ['iti', 'ire'], ['ite', 'ire'], ['ò', 'are'], ['ono', 'ere'], ['ono', 'ire'], ['ano', 'are']] as const) if (w.endsWith(fine)) prove.push(w.slice(0, -fine.length) + base)
  return prove.some(x => categorie(x).some(k => k !== 'r') || verbi().has(x))
}
const giuntura = (w: string) => { if (w.length < 2 || w.length > 12 || /^\d/.test(w) || GRAMMATICA.test(w)) return false; return !piena(w) && (categorie(w).length > 0 || w.length <= 8) }
function chain(w: string, n = 6): string[] { const out: string[] = []; let x: string | null = w; for (let i = 0; i < n && x; i++) { x = iperonimo(x); if (x) out.push(x) } return out }

/** osserva un testo letto: impara connettivi (con il loro uso) e l'immaginario dei concetti */
export function osservaRetorica(st: AgentState, testo: string, concetti: string[] = [], titolo?: string) {
  const R = getRetorica(st)
  if (titolo) {
    const F = R.fonti ?? (R.fonti = {})
    F[titolo] = testo.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(f => f.length > 30 && f.length < 220 && (/\b1\d{3}\b|\b20\d{2}\b/.test(f) || /\s[A-Z][a-zà-ü]{3,}/.test(f.slice(1)))).slice(0, 40)
    const ks = Object.keys(F); if (ks.length > 30) for (const k of ks.slice(0, ks.length - 30)) delete F[k]
  }
  const frasi = testo.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).slice(0, 400)
  // le voci: frasi al futuro e racconti al passato remoto, brevi, senza parentesi e numeri
  {
    const V = R.voci ?? (R.voci = { futuro: [], racconto: [] })
    for (const f of frasi) {
      if (f.length < 40 || f.length > 170 || /[()\[\]\d"]/.test(f)) continue
      if (FUT.test(f) && V.futuro.length < 400 && !V.futuro.includes(f)) V.futuro.push(f)
      else if (REM.test(f) && V.racconto.length < 400 && !V.racconto.includes(f)) V.racconto.push(f)
    }
    if (V.futuro.length > 120) V.futuro.splice(0, V.futuro.length - 120)
    if (V.racconto.length > 120) V.racconto.splice(0, V.racconto.length - 120)
  }
  const nuovi: string[] = []
  const concettiSet = new Set(concetti.filter(c => categorie(c).includes('n')))
  const visti = new Set<string>()
  const primaVolta = new Set<string>()
  for (let i = 0; i < frasi.length; i++) {
    const f = frasi[i], prima = frasi[i - 1] ?? ''
    const cand: { forma: string; dopo: string; prima: string }[] = []
    // all'inizio della frase, fino alla prima virgola (1–3 parole tutte di giuntura)
    const m = f.match(/^([A-ZÀ-Üa-zà-ü']+(?:\s+[a-zà-ü']+){0,2}),\s+(.*)$/)
    if (m) { const ws = parole(m[1]); if (ws.length && ws.every(giuntura)) cand.push({ forma: ws.join(' '), dopo: m[2], prima }) }
    // dentro la frase, dopo una virgola
    for (const mm of f.matchAll(/,\s+([a-zà-ü']+(?:\s+[a-zà-ü']+)?)\s+/g)) {
      const ws = parole(mm[1]); const w1 = ws[0]
      if (w1 && giuntura(w1) && !['e', 'o', 'il', 'la', 'lo', 'i', 'gli', 'le', 'un', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'che', 'si', 'ci', 'ne', 'non'].includes(w1)) {
        const forma = ws.length > 1 && giuntura(ws[1]) ? ws.join(' ') : w1
        cand.push({ forma, dopo: f.slice((mm.index ?? 0) + mm[0].length), prima: f.slice(0, mm.index ?? 0) })
      }
    }
    for (const c of cand) {
      const k = R.connettivi[c.forma] ?? (R.connettivi[c.forma] = { n: 0, rel: {}, usi: 0, ultimo: -99 })
      const doc = (titolo ?? '').slice(0, 40)
      const nuovaLettura = !doc || !(k.doc ??= []).includes(doc)
      if (doc && nuovaLettura) { k.doc!.push(doc); if (k.doc!.length > 6) k.doc!.shift(); if (k.doc!.length === 2) nuovi.push(c.forma) }
      if (!nuovaLettura && k.n > 0 && !primaVolta.has(c.forma)) continue
      primaVolta.add(c.forma)
      k.n++
      // le regole del contesto votano una relazione; i loro pesi stanno in R.regole
      const voti = contesto(R, c.prima, c.dopo)
      for (const [rel, v] of Object.entries(voti) as [RelR, number][]) k.rel[rel] = (k.rel[rel] ?? 0) + v
    }
    // l'immaginario: i colori vicini a un concetto (entro 4 parole, non nomi propri come "Mar Nero"), una volta per lettura
    const toks = f.match(/[A-Za-zÀ-ÿ']+/g) ?? []
    for (let q = 0; q < toks.length; q++) {
      const c = toks[q].toLowerCase()
      if (c.length < 4 || !concettiSet.has(c)) continue
      for (let z = Math.max(0, q - 4); z <= Math.min(toks.length - 1, q + 4); z++) {
        const w = toks[z]
        if (z === q || /^[A-ZÀ-Ü]/.test(w) && z > 0 || !coloreDi(w)) continue
        const col = w.toLowerCase(), doc = (titolo ?? '').slice(0, 40)
        const im = R.immaginario[c] ?? (R.immaginario[c] = { colori: {}, moti: {} })
        const ds = (im.docs ??= {})[col] ?? (im.docs[col] = [])
        if (visti.has(`${c}|${col}`) || ds.includes(doc)) continue // un colore conta una volta per lettura
        visti.add(`${c}|${col}`); ds.push(doc); if (ds.length > 8) ds.shift()
        im.colori[col] = (im.colori[col] ?? 0) + 1
      }
    }
  }
  if (nuovi.length) nota(st, `Dalle letture imparo modi di legare le frasi: ${nuovi.slice(0, 4).map(x => `«${x}»`).join(', ')}.`)
  // il dizionario dei connettivi non cresce all'infinito
  const ks = Object.entries(R.connettivi)
  if (ks.length > 400) for (const [f] of ks.sort((a, b) => a[1].n - b[1].n).slice(0, ks.length - 400)) delete R.connettivi[f]
}

/** le regole che leggono il contesto (cosa c'è prima e dopo il connettivo): ognuna vota con il suo peso */
function contesto(R: Retorica, prima: string, dopo: string): Partial<Record<RelR, number>> {
  const v: Partial<Record<RelR, number>> = {}
  const add = (rel: RelR, regola: string) => { v[rel] = (v[rel] ?? 0) + (R.regole[regola] ?? 1) }
  const neg = (s: string) => /\bnon\b|\bmai\b|\bnessun/.test(s)
  if (neg(dopo) !== neg(prima)) add('contrasto', 'neg')
  if (/\bcome\b|\bsimile\b|\bstesso\b|\banche\b/.test(dopo)) add('somiglianza', 'come')
  if (/\b\d{2,4}\b|[A-Z][a-zà-ü]+\s+[A-Z][a-zà-ü]+/.test(dopo)) add('esempio', 'nome')
  if (/\?/.test(dopo)) add('dubbio', 'domanda')
  if (/\b(forse|potrebbe|probabil|sembra|pare)\w*/.test(dopo)) add('dubbio', 'modale')
  if (/\b(poi|dopo|prima|quando|allora|infine)\b/.test(dopo)) add('sequenza', 'tempo')
  if (/\b(perch|causa|effett|quindi|dunque|cos[iì] che)\w*/.test(dopo + ' ' + prima.slice(-40))) add('causa', 'perche')
  const pp = new Set(parole(prima).filter(w => w.length > 4)), rip = parole(dopo).filter(w => pp.has(w)).length
  if (rip) add(rip > 1 ? 'somiglianza' : 'sequenza', 'ripete')
  if (!Object.keys(v).length) add('sequenza', 'tempo')
  return v
}
/** a cosa serve un connettivo, secondo l'esperienza */
const relDi = (k: Connettivo): RelR => (Object.entries(k.rel).sort((a, b) => b[1] - a[1])[0]?.[0] as RelR) ?? 'sequenza'

/** un connettivo per una relazione: tra quelli imparati, i più affidabili e i meno usati di recente */
export function connettivo(st: AgentState, r: Rnd, rel: RelR): string | null {
  const R = getRetorica(st)
  const cs = Object.entries(R.connettivi).filter(([, k]) => (k.doc?.length ?? 0) >= 2 && k.n >= 4 && relDi(k) === rel)
  if (!cs.length) return null
  const peso = ([, k]: [string, Connettivo]) => {
    const tot = Object.values(k.rel).reduce((a, b) => a + (b ?? 0), 0) || 1
    const fid = (k.rel[rel] ?? 0) / tot
    const stanco = 1 / (1 + k.usi * 0.6) * Math.min(1, (st.day - k.ultimo + 1) / 6)
    return Math.sqrt(k.n) * fid * stanco + 0.01
  }
  const tot = cs.reduce((a, c) => a + peso(c), 0)
  let x = r() * tot
  for (const c of cs) { x -= peso(c); if (x <= 0) { c[1].usi++; c[1].ultimo = st.day; return c[0] } }
  return cs[0][0]
}

// ── 6. la voce del profeta ──
const FUT = /\b[a-zà-ü]{2,}(?:erà|irà|arà|eranno|iranno|aranno|eremo|iremo|vrà|vranno|rrà|rranno)\b/
const REM = /\b[a-zà-ü]{3,}(?:ò|arono|erono|irono|ette|ettero)\b/
const IRR: Record<string, string> = { 'è': 'sarà', sono: 'saranno', ha: 'avrà', hanno: 'avranno', fa: 'farà', fanno: 'faranno', va: 'andrà', vanno: 'andranno', può: 'potrà', possono: 'potranno', deve: 'dovrà', devono: 'dovranno', viene: 'verrà', vengono: 'verranno', resta: 'resterà', restano: 'resteranno', sa: 'saprà', dà: 'darà', sta: 'starà', stanno: 'staranno', vuole: 'vorrà', tiene: 'terrà', porta: 'porterà', portano: 'porteranno' }
/** volge al futuro il primo verbo al presente (regole di morfologia, verbi riconosciuti nel lessico) */
export function alFuturo(t: string): string | null {
  const V = verbi()
  const ws = t.split(/(\s+)/)
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i], lw = w.toLowerCase().replace(/[.,;:]$/, ''), punt = w.slice(lw.length)
    let f: string | null = IRR[lw] ?? null
    if (!f) {
      const st = (x: string) => V.has(x)
      if (/a$/.test(lw) && st(lw.slice(0, -1) + 'are')) f = lw.slice(0, -1) + 'erà'
      else if (/ano$/.test(lw) && st(lw.slice(0, -3) + 'are')) f = lw.slice(0, -3) + 'eranno'
      else if (/e$/.test(lw) && st(lw.slice(0, -1) + 'ere')) f = lw.slice(0, -1) + 'erà'
      else if (/e$/.test(lw) && st(lw.slice(0, -1) + 'ire')) f = lw.slice(0, -1) + 'irà'
      else if (/ono$/.test(lw) && st(lw.slice(0, -3) + 'ere')) f = lw.slice(0, -3) + 'eranno'
      else if (/ono$/.test(lw) && st(lw.slice(0, -3) + 'ire')) f = lw.slice(0, -3) + 'iranno'
    }
    if (f && lw.length > 1) { ws[i] = (/^[A-ZÀ-Ü]/.test(w) ? f.charAt(0).toUpperCase() + f.slice(1) : f) + punt; return ws.join('') }
  }
  return null
}
/** una parabola, raccontata da lui: dalle letture prende solo un gesto (un verbo), lo fa fare ai concetti di adesso
 *  dentro una piccola storia sua. Le parole e i racconti degli altri restano dove sono. */
function parabola(st: AgentState, r: Rnd, a: string, b: string): string | null {
  const gesti = lette(st).filter(x => x.f.o && !/^(essere|avere|fare|venire|dare|andare|potere|dovere|volere|stare)$/.test(x.f.v.inf))
  if (gesti.length < 3) return null
  const g = gesti[Math.floor(r() * gesti.length)].f
  const f = fraseDi({ ...g, s: a, o: b, compl: [], neg: false, rifl: false })
  const T = ['una volta, in un posto che non so dire, {f}; e da allora nessuno ci ha più fatto caso', 'racconto una cosa: {f}; poi è venuta la sera, come sempre', 'c\'è un posto dove {f}, e basta', 'mi dicono che {f}; non ci credo, poi lo vedo', 'nel paese dove sono nato {f}, e nessuno lo chiamava per nome', 'un giorno {f}; il giorno dopo era già una legge']
  return pick(r, T).replace('{f}', f)
}
/** risale dal concetto a ciò che lo contiene, nel lessico, fino a tre gradini */
function scala(st: AgentState, r: Rnd, a: string): string | null {
  const g: string[] = [a]
  let x: string | null = a
  for (let i = 0; i < 4 && x; i++) { x = iperonimo(x); if (x && !g.includes(x) && !x.includes('_')) g.push(x) }
  if (g.length < 3) return null
  const c = connettivo(st, r, 'somiglianza') ?? connettivo(st, r, 'sequenza')
  if (!c) return null
  return g.slice(0, 4).map((w, i) => (i ? `${c} ${art(w)}` : art(w))).join(', ')
}

// ── 3. dire: le mosse ──
export interface Materia { a: string; b: string; premesse: string[]; conclusione: string; nuda?: string; conf: number; segno: 1 | -1; tipo: string; fonte?: string; esempio?: string; citazione?: string }
const REL_TIPO: Record<string, RelR> = { catena: 'causa', lunga: 'causa', dipendenza: 'causa', interrotta: 'contrasto', contesa: 'contrasto', disaccordo: 'contrasto', eredita: 'somiglianza', ritrattazione: 'contrasto', analogia: 'somiglianza', ponte: 'somiglianza', genere: 'somiglianza', tensione: 'contrasto' }
const pulisci = (t: string) => t.replace(/\s+/g, ' ').replace(/[.;:,\s]+$/, '').trim()
const min = (t: string) => (/^[A-ZÀ-Ü]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1))
const mai = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

function scrivi(st: AgentState, r: Rnd, ops: Op[], rel: RelR, m: Materia, nuda = false): string | null {
  const pezzi: string[] = []
  let attacco = '' // un connettivo che si appoggia alla frase successiva
  const usati = new Set<number>()
  const premessa = (k: number) => { const p = m.premesse[k]; if (!p || usati.has(k)) return null; usati.add(k); return pulisci(p) }
  const metti = (t: string | null) => { if (!t) return false; pezzi.push(attacco ? `${mai(attacco)}, ${min(t)}` : mai(t)); attacco = ''; return true }
  const conta = (o: Op) => ops.filter(x => x === o).length
  if (conta('C') + conta('F') !== 1 || conta('P') > 1 || conta('U') > 1 || conta('E') > 1 || conta('R') > 1 || conta('Q') > 1 || conta('A') > 1 || conta('B') > 1) return null
  for (const op of ops) {
    switch (op) {
      case 'A': if (!metti(premessa(0))) return null; break
      case 'B': if (!metti(premessa(1) ?? premessa(0))) return null; break
      case 'C': if (!metti(pulisci(nuda ? (m.nuda ?? m.conclusione) : m.conclusione))) return null; break
      case 'L': { const c = connettivo(st, r, rel); if (!c) return null; attacco = c; break }
      case 'D': { const c = connettivo(st, r, 'dubbio'); if (!c) return null; attacco = c; break }
      case 'E': if (!m.esempio) return null; if (!metti(m.esempio)) return null; break
      case 'R': return null // niente citazioni: le parole degli altri non entrano
      case 'Q': pezzi.push(`${mai(m.b)}${m.segno > 0 ? '' : ' no'}, davvero?`); break
      case 'N': { const c = connettivo(st, r, 'contrasto'); if (!c) return null; attacco = c; break }
      case 'F': { if ((getRetorica(st).voci?.futuro.length ?? 0) < 3) return null; const f = alFuturo(pulisci(nuda ? (m.nuda ?? m.conclusione) : m.conclusione)); if (!f || !metti(f)) return null; break }
      case 'P': { const p = parabola(st, r, m.a, m.b); if (!p || !metti(p)) return null; break }
      case 'U': { const u = scala(st, r, r() < 0.5 ? m.a : m.b); if (!u || !metti(u)) return null; break }
    }
  }
  if (attacco || !pezzi.length) return null
  if (!pezzi.some(p => p.toLowerCase().includes(m.b.toLowerCase()) || p.toLowerCase().includes(m.a.toLowerCase()))) return null
  return pezzi.join('. ').replace(/\?\./g, '?') + (pezzi[pezzi.length - 1].endsWith('?') ? '' : '.')
}

const trigrammi = (t: string) => { const w = parole(t); const s = new Set<string>(); for (let i = 0; i + 2 < w.length; i++) s.add(w.slice(i, i + 3).join(' ')); return s }
/** quanto un testo è nuovo rispetto a quello che ha già scritto (1 = mai detto niente di simile) */
export function novita(st: AgentState, t: string): number {
  const R = getRetorica(st), T = trigrammi(t)
  if (!T.size) return 0.5
  let peggio = 0
  for (const x of R.memoria.slice(-60)) { const M = trigrammi(x); let c = 0; for (const g of T) if (M.has(g)) c++; peggio = Math.max(peggio, c / T.size) }
  return 1 - peggio
}
function muta(r: Rnd, ops: Op[]): Op[] {
  const ALF: Op[] = ['A', 'B', 'C', 'L', 'E', 'D', 'Q', 'R', 'N', 'F', 'P', 'U']
  const o = ops.slice()
  const k = r()
  if (k < 0.3 && o.length < 6) o.splice(Math.floor(r() * (o.length + 1)), 0, pick(r, ALF))
  else if (k < 0.5 && o.length > 2) o.splice(Math.floor(r() * o.length), 1)
  else if (k < 0.75 && o.length > 1) { const i = Math.floor(r() * o.length), j = Math.floor(r() * o.length);[o[i], o[j]] = [o[j], o[i]] }
  else o[Math.floor(r() * o.length)] = pick(r, ALF)
  return o
}
const chiave = (ops: Op[]) => ops.join('')

/**
 * Dice una conclusione con una mossa sua: prova varianti delle mosse migliori, le scrive, le giudica
 * (coerenza, lunghezza, novità rispetto a quello che ha già scritto) e tiene la migliore.
 */
export function dici(st: AgentState, r: Rnd, m: Materia): { testo: string; mossa: string } | null {
  const R = getRetorica(st)
  if (Object.values(R.connettivi).filter(k => (k.doc?.length ?? 0) >= 2 && k.n >= 4).length < 4) return null // non ha ancora abbastanza modi di legare
  const rel: RelR = m.conf < 0.35 ? 'dubbio' : REL_TIPO[m.tipo] ?? 'causa'
  const base = R.mosse.slice().sort((a, b) => b.peso * (a.rel === rel ? 1 : 0.6) / (1 + Math.max(0, 3 - (st.day - b.ultimo))) - a.peso * (b.rel === rel ? 1 : 0.6) / (1 + Math.max(0, 3 - (st.day - a.ultimo))))
  const cand: { ops: Op[]; da?: Mossa }[] = []
  for (const x of base.slice(0, 4)) { cand.push({ ops: x.ops, da: x }); cand.push({ ops: muta(r, x.ops), da: x }) }
  for (let i = 0; i < 3; i++) cand.push({ ops: muta(r, muta(r, pick(r, base).ops)) })
  // incrocio: l'inizio di una mossa e la fine di un'altra
  if (base.length > 1) { const [x, y] = [base[0], pick(r, base.slice(1))]; cand.push({ ops: [...x.ops.slice(0, Math.ceil(x.ops.length / 2)), ...y.ops.slice(Math.floor(y.ops.length / 2))] }) }
  let best: { testo: string; ops: Op[]; voto: number; da?: Mossa } | null = null
  // ogni mossa si prova con la conclusione detta in due modi: quello della sua vecchia grammatica e quello nudo (solo i fatti)
  for (const c of cand.flatMap(x => [{ ...x, nuda: false }, { ...x, nuda: true }])) {
    const t = scrivi(st, r, c.ops, rel, m, c.nuda)
    if (!t) continue
    const n = parole(t).length
    const lung = n < 8 ? 0.3 : n > 55 ? 0.4 : 1
    const varieta = new Set(c.ops).size / c.ops.length
    const profeta = c.ops.filter(o => o === 'F' || o === 'P' || o === 'U').length
    const voto = novita(st, t) * 1.4 + lung + varieta * 0.4 + (c.ops.includes('E') || c.ops.includes('R') ? 0.25 : 0) + profeta * (R.vocazione ?? 0.35) * 0.5 + r() * 0.1
    if (!best || voto > best.voto) best = { testo: t, ops: c.ops, voto, da: c.da }
  }
  if (!best) return null
  // la mossa usata si rafforza (o nasce); quelle troppo usate si stancano
  const k = chiave(best.ops)
  let mo = R.mosse.find(x => chiave(x.ops) === k)
  if (!mo) { mo = { ops: best.ops, rel, peso: 0.8, usi: 0, nata: st.day, ultimo: st.day }; R.mosse.push(mo); if (best.ops.length >= 3) nota(st, `Provo un modo nuovo di argomentare: ${descriviMossa(best.ops)}.`) }
  mo.usi++; mo.ultimo = st.day; mo.peso = Math.min(3, mo.peso * 0.9 + best.voto * 0.3)
  for (const x of R.mosse) if (x !== mo) x.peso = Math.max(0.05, x.peso * 0.995)
  if (R.mosse.length > 40) { const via = R.mosse.sort((a, b) => b.peso - a.peso).splice(40); if (via[0]) nota(st, `Lascio perdere un modo di dire che non funzionava più: ${descriviMossa(via[0].ops)}.`) }
  R.memoria = [...R.memoria, best.testo].slice(-80)
  // la vocazione profetica si muove: cresce se i testi profetici vengono nuovi, si stanca se li usa troppo di fila
  const prof = best.ops.some(o => o === 'F' || o === 'P' || o === 'U')
  R.vocazione = Math.max(0.05, Math.min(1, (R.vocazione ?? 0.35) + (prof ? (novita(st, best.testo) > 0.6 ? 0.02 : -0.03) : 0.005) + (r() - 0.5) * 0.02))
  return { testo: best.testo, mossa: k }
}
const NOMI_OP: Record<Op, string> = { A: 'un fatto', B: 'un altro fatto', C: 'la conclusione', L: 'un legame', E: 'un esempio dalla lettura', D: 'un dubbio', Q: 'una domanda', R: 'una citazione', N: 'un ripensamento', F: 'la conclusione come profezia', P: 'una parabola', U: 'la risalita verso il tutto' }
export const descriviMossa = (ops: Op[]) => ops.map(o => NOMI_OP[o]).join(' → ')
/** ricorda anche i testi scritti in altri modi, così la novità si misura su tutto */
export function ricorda(st: AgentState, t: string) { const R = getRetorica(st); R.memoria = [...R.memoria, t].slice(-80) }

/** un esempio concreto: un fatto letto su uno dei due concetti, ridetto da lui (mai la frase della fonte) */
export function trovaEsempio(st: AgentState, fonti: string[], a: string, b: string): { esempio?: string; citazione?: string; fonte?: string } {
  const f = [...fattiSu(st, a, 12), ...fattiSu(st, b, 12)].find(x => fonti.includes(x.fonte) && x.o)
  return f ? { fonte: f.fonte, esempio: fraseDi(f) } : {}
}

// ── 4. mostrare: la stessa relazione con l'impaginazione ──
/** sceglie l'impaginazione per una relazione: quelle che il suo occhio ha giudicato migliori, con esplorazione e stanchezza */
export function scegliVisiva<T extends string>(st: AgentState, r: Rnd, rel: string, opzioni: T[], prior: T[], evita?: T | null): T {
  const R = getRetorica(st)
  const V = R.visive[rel] ?? (R.visive[rel] = {})
  const tot = Object.values(V).reduce((a, x) => a + x.n, 0) + 1
  const punteggio = (o: T) => {
    const x = V[o] ?? { w: prior.includes(o) ? 0.6 : 0.35, n: 0, ultimo: -99 }
    const esplora = Math.sqrt((2 * Math.log(tot + 1)) / (x.n + 1)) * 0.35 // UCB: anche quelle poco provate
    const stanco = Math.min(1, (st.day - x.ultimo + 1) / 3)
    return (x.w + esplora) * stanco * (o === evita ? 0.2 : 1) + r() * 0.15
  }
  return opzioni.slice().sort((a, b) => punteggio(b) - punteggio(a))[0]
}
/** l'occhio ha giudicato la tavola: l'impaginazione usata per quella relazione si sposta verso il voto */
export function esitoVisivo(st: AgentState, rel: string, lay: string, voto: number) {
  const R = getRetorica(st)
  const V = R.visive[rel] ?? (R.visive[rel] = {})
  const x = V[lay] ?? (V[lay] = { w: 0.5, n: 0, ultimo: -99 })
  const prima = x.w
  x.n++; x.ultimo = st.day; x.w = x.w + (voto - x.w) / Math.min(8, x.n + 1)
  if (x.n === 4 && x.w > 0.65 && prima <= 0.65) nota(st, `Per dire «${rel}» con l'immagine mi funziona l'impaginazione «${lay}».`)
}
/** i colori con cui ha letto un concetto (se ne ha visti abbastanza) */
export function coloriDi(st: AgentState, concetto: string): string[] {
  const im = getRetorica(st).immaginario[concetto]
  if (!im) return []
  return Object.entries(im.colori).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([w]) => coloreDi(w)!).filter(Boolean)
}
