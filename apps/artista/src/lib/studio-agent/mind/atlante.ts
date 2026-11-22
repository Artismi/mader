/**
 * L'atlante: dove le letture diventano significato, giorno dopo giorno.
 *
 * LE FRASI. Da ogni lettura tiene le frasi in cui due nomi stanno insieme
 * («il lavoro produce la città»). Sono la sua biblioteca: ogni posto letto
 * lascia spiegazioni, e da quelle parte.
 *
 * I MOTIVI. Ogni concetto, la prima volta che lo usa, riceve un segno suo
 * (una forma riempita di una trama, oppure un disegno procedurale col suo seme).
 * Da lì in poi quel concetto ha sempre quel segno: un'iconografia personale che
 * chi guarda impara a riconoscere. Il segno si rafforza se funziona, muta se no.
 *
 * GLI ENUNCIATI. Una tavola dice una cosa: A sta a B in un certo modo
 * (contro, porta a, dentro, è, diventa). La relazione la ricava dalla frase
 * letta, poi la REINTERPRETA: la conferma, la rovescia, la porta avanti dal
 * punto dove era arrivato. L'immagine mette in scena la stessa relazione con i
 * due segni. Il testo è la sua frase, e sotto, piccola, la fonte.
 *
 * LE TESI. Ogni enunciato resta: domani può riprenderlo, contraddirlo,
 * proseguirlo (B diventa il nuovo A). Così il senso si costruisce nel tempo.
 */
import type { AgentState, Reading } from '../core/types'
import { pick, range, weighted, type Rnd } from '../core/rng'
import { RECIPES, defaults, runRecipe, shuffle as shuffleParams, type Tone } from '@/components/studio/genera/recipes'
import { loadLabFonts, type FaceId } from '@/components/studio/genera/fonts'
import { LOOKS } from '@/components/studio/fx/catalog'
import { sentences, words, looksItalian } from '../reader/tokenize'
import { anchorOf } from '../reader/lexicon'
import { conceptsReady, relationsOf, REL_LABEL } from '../reader/concepts'
import { newCanvas, withLayer, fullLayer, flatten, sfuma, type Layer, type Sheet } from '../hands/sheet'
import { textLayer, toolById, type ToolCtx } from '../hands/tools'
import { applica } from '../hands/tools'
import { runShader } from '../hands/shader'
import { ratio } from '../eyes/judgement'
import { isNome, realizza } from '../voice/lingua'
import { esito } from '../voice/conclusioni'
import type { Sogg } from './scena'
import { disegnaGeneratore, ensureOfficina, generatoreById, scriviGeneratore } from './officina'
import type { Features } from '../core/types'
import type { Deduzione } from '../voice/scrittura'
import { armoniaSu, rampa, hexToLch, type Armonia } from '../hands/colore'

export type Rel = 'contro' | 'causa' | 'dentro' | 'identita' | 'diventa' | 'accanto'
export interface Motivo { forma: Sogg | 'ricetta' | 'codice'; gen?: string; trama: 'pieno' | 'righe' | 'punti' | 'tratteggio' | 'contorno'; colore: 'ink' | 'acc'; recipe?: string; seed: number; forza: number; nato: number }
export interface Concetto { word: string; motivo?: Motivo; frasi: number; usi: number; ultima: number }
export interface Frase { t: string; fonte: string; nomi: string[]; day: number; usata?: number; rel?: Rel }
export interface Tesi { day: number; a: string; b: string; rel: Rel; frase: string; fonte: string; postura: 'legge' | 'conferma' | 'rovescia' | 'prosegue' | 'dubita' | 'deduce'; riuscita?: number }
export interface Atlante { concetti: Record<string, Concetto>; frasi: Frase[]; tesi: Tesi[]; deduzioni?: (Deduzione & { day: number })[] }
export interface Enunciato { modello?: string; tipoD?: string; a: string; b: string; rel: Rel; citazione: string; fonte: string; frase: string; postura: Tesi['postura']; perche: string }

type WithA = AgentState & { atlante?: Atlante }
export const getAtlante = (st: AgentState) => (st as WithA).atlante
export function ensureAtlante(st: AgentState): Atlante {
  return ((st as WithA).atlante ??= { concetti: {}, frasi: [], tesi: [] })
}

const VUOTE = new Set(['cosa', 'cose', 'modo', 'parte', 'fatto', 'volta', 'tipo', 'caso', 'resto', 'genere', 'senso', 'anno', 'anni', 'nome', 'numero', 'base', 'forma', 'termine', 'periodo', 'secolo', 'esempio', 'serie', 'oggi', 'voce', 'pagina', 'articolo', 'italia'])
const nomiDi = (s: string) => [...new Set(words(s).map(w => w.toLowerCase()).filter(w => w.length > 3 && !VUOTE.has(w) && isNome(w)))]

/** dopo le letture: frasi con due nomi, concetti che crescono */
export function aggiornaAtlante(st: AgentState, readings: Reading[]) {
  const A = ensureAtlante(st)
  const known = new Set(A.frasi.map(f => f.t))
  for (const rd of readings) {
    if (rd.kind === 'rilettura') continue
    for (const s of sentences(rd.text).slice(0, 80)) {
      if (s.length < 40 || s.length > 220 || /\d{3,}|[{}<>=|]/.test(s) || known.has(s)) continue
      if (!looksItalian(s.split(' ').find(w => w.length > 5) ?? 'ciao')) continue
      const nomi = nomiDi(s)
      if (nomi.length < 2) continue
      A.frasi.push({ t: s, fonte: rd.title, nomi: nomi.slice(0, 6), day: st.day })
      for (const w of nomi) { const c = (A.concetti[w] ??= { word: w, frasi: 0, usi: 0, ultima: 0 }); c.frasi++ }
    }
  }
  // tiene le frasi più ricche di concetti ricorrenti, e le più recenti
  if (A.frasi.length > 600) {
    const score = (f: Frase) => f.nomi.reduce((a, w) => a + Math.min(6, A.concetti[w]?.frasi ?? 0), 0) - (st.day - f.day) * 0.05 - (f.usata ? 3 : 0)
    A.frasi = A.frasi.sort((a, b) => score(b) - score(a)).slice(0, 500)
  }
  const cs = Object.values(A.concetti)
  if (cs.length > 900) {
    const keep = cs.sort((a, b) => b.frasi + b.usi * 3 - (a.frasi + a.usi * 3)).slice(0, 700)
    A.concetti = Object.fromEntries(keep.map(c => [c.word, c]))
  }
}

// ─── la relazione dentro una frase ──────────────────────────────────────────
const REL_RX: [Rel, RegExp][] = [
  ['contro', /\b(contro|oppost[oaie]|contrari[oa]|invece|ma|non|né|senza|nemic[oi]|lott[ao]|resist\w*|si oppon\w*|svuot\w*|distrugg\w*|consum\w*|nascond\w*|ferm\w*|scompar\w*|chius[oaie])\b/i],
  ['diventa', /\b(divent\w*|trasform\w*|si evolv\w*|passa\w* a|si cambi\w*|muta\w*|origin\w*)\b/i],
  ['causa', /\b(caus\w*|produc\w*|provoc\w*|gener\w*|port\w*|determin\w*|per cui|quindi|grazie a|crea\w*|nasc\w*|nacque|organizz\w*|muov\w*|sping\w*|decid\w*|rend\w*|prepar\w*|offr\w*)\b/i],
  ['dentro', /\b(dentro|interno|parte d\w*|comprend\w*|contien\w*|tra|fra|nell?[aoe']?|negli|nei|composto|intorno|attorno|sotto|conserv\w*|resta\w*|vive)\b/i],
  ['identita', /\b(è|sono|era|erano|cioè|detto|chiamat\w*|come)\b/i],
]
function relazione(frase: string, a: string, b: string): Rel {
  const lo = frase.toLowerCase()
  const i = lo.indexOf(a), j = lo.indexOf(b)
  const mezzo = i >= 0 && j >= 0 ? lo.slice(Math.min(i, j), Math.max(i, j) + Math.max(a.length, b.length)) : lo
  for (const [rel, rx] of REL_RX) if (rx.test(mezzo)) return rel
  for (const [rel, rx] of REL_RX) if (rel !== 'identita' && rx.test(lo)) return rel
  return 'accanto'
}
const ROVESCIO: Record<Rel, Rel> = { contro: 'identita', identita: 'contro', causa: 'causa', dentro: 'dentro', diventa: 'diventa', accanto: 'contro' }

/** la citazione: un pezzo breve della frase intorno ai due nomi (mai più di 14 parole) */
function citazione(frase: string, a: string, b: string): string {
  const ws = frase.replace(/\s+/g, ' ').split(' ')
  const lo = ws.map(w => w.toLowerCase().replace(/[^a-zàèéìòù']/g, ''))
  const i = lo.findIndex(w => w === a), j = lo.findIndex(w => w === b)
  if (i < 0 || j < 0) return ws.slice(0, 12).join(' ')
  let s = Math.max(0, Math.min(i, j) - 3), e = Math.min(ws.length, Math.max(i, j) + 4)
  if (e - s > 14) { s = Math.min(i, j); e = Math.min(ws.length, s + 14) }
  return (s > 0 ? '…' : '') + ws.slice(s, e).join(' ').replace(/[,;:]$/, '') + (e < ws.length ? '…' : '')
}

// ─── scegliere che cosa dire oggi ──────────────────────────────────────────
export function enunciato(st: AgentState, r: Rnd, parola: string, precedente?: Enunciato | null): Enunciato | null {
  const A = ensureAtlante(st)
  if (!A.frasi.length) return null
  const last = A.tesi[A.tesi.length - 1]
  // serie: stessa cosa detta in un altro modo
  if (precedente) {
    const postura: Tesi['postura'] = r() < 0.5 ? 'dubita' : 'conferma'
    return { ...precedente, postura, frase: dire(r, precedente.a, precedente.b, precedente.rel, postura), perche: 'la stessa cosa, detta un\'altra volta' }
  }
  // a volte la tavola dice una cosa che ha dedotto lui, non letta
  const ds = (A.deduzioni ?? []).filter(x => !x.ritirata && x.tipo !== 'ritrattazione' && st.day - x.day < 6 && !A.tesi.some(t => t.frase === x.testo))
  if (ds.length && r() < 0.4) {
    const x = pick(r, ds)
    const rel: Rel = x.tipo === 'contesa' || x.tipo === 'disaccordo' ? 'contro' : x.tipo === 'dipendenza' ? 'dentro' : x.tipo === 'catena' ? 'causa' : 'identita'
    return { a: x.a, b: x.b || x.a, rel, citazione: x.premesse.join('; ').slice(0, 120), fonte: 'ragionamento mio', frase: x.testo, postura: 'deduce', perche: `l'ho dedotto io: ${x.premesse.join(', e ')}`, modello: x.modello, tipoD: x.tipo }
  }
  // da dove partire: il filo di ieri (prosegue da B), la parola del giorno, o un concetto ricco
  const filo = last && r() < 0.5 ? last.b : null
  const peso = (w: string) => Math.min(8, A.concetti[w]?.frasi ?? 0) + (A.concetti[w]?.motivo ? 2 : 0) + (anchorOf(w) ? 1 : 0)
  const starts = [filo, parola].filter(Boolean) as string[]
  let cand = A.frasi.filter(f => starts.some(w => f.nomi.includes(w)) && (f.usata ?? 0) < 2)
  // nessuna frase letta su questa parola: le spiegazioni del dizionario (iperonimi, parti, contrari, cause)
  if (!cand.length && conceptsReady()) {
    const MAP: Record<string, Rel> = { h: 'identita', s: 'identita', p: 'dentro', w: 'dentro', a: 'contro', c: 'causa', e: 'causa', d: 'accanto', t: 'accanto' }
    for (const w of starts) {
      const ts = relationsOf(w, 2).filter(x => isNome(x.b) && x.b !== w && !VUOTE.has(x.b))
      if (!ts.length) continue
      const x = pick(r, ts.slice(0, 8))
      const [aa, bb] = x.rel === 'w' ? [x.b, x.a] : [x.a, x.b]
      const fr: Frase = { t: `${x.a} ${REL_LABEL[x.rel]} ${x.b}`, fonte: 'dizionario', nomi: [aa, bb], day: st.day, rel: MAP[x.rel] }
      A.frasi.push(fr); cand = [fr]
      break
    }
  }
  if (!cand.length) cand = A.frasi.filter(f => (f.usata ?? 0) < 1)
  if (!cand.length) cand = A.frasi
  const f = weighted(r, cand, x => 1 + x.nomi.reduce((a, w) => a + peso(w), 0) * 0.3 + (x.day === st.day ? 2 : 0), 0.8)
  f.usata = (f.usata ?? 0) + 1
  const start = starts.find(w => f.nomi.includes(w))
  const nomi = f.nomi.slice().sort((x, y) => peso(y) - peso(x))
  const a = f.rel ? f.nomi[0] : start ?? nomi[0]
  const b = f.rel ? f.nomi[1] : nomi.find(w => w !== a) ?? nomi[1]
  let rel = f.rel ?? relazione(f.t, a, b)
  // la postura: cosa ne fa, rispetto a ciò che ha già detto
  const prima = A.tesi.filter(t => (t.a === a && t.b === b) || (t.a === b && t.b === a))
  let postura: Tesi['postura'] = 'legge'
  let perche = `ho letto in «${f.fonte}» che ${a} e ${b} stanno insieme (${rel})`
  if (prima.length) {
    const p = prima[prima.length - 1]
    if (p.rel === rel) { postura = (p.riuscita ?? 0.5) > 0.5 ? 'conferma' : 'rovescia'; if (postura === 'rovescia') rel = ROVESCIO[rel] }
    else postura = 'dubita'
    perche = `il giorno ${p.day} avevo detto «${p.frase}»; ora ${postura === 'conferma' ? 'lo confermo' : postura === 'rovescia' ? 'lo rovescio' : 'ne dubito'}`
  } else if (filo && a === filo) { postura = 'prosegue'; perche = `proseguo da ieri: là arrivavo a ${a}, da qui vado a ${b}` }
  else if (r() < 0.2) { postura = 'rovescia'; rel = ROVESCIO[rel] }
  const frase = dire(r, a, b, rel, postura)
  return { a, b, rel, citazione: citazione(f.t, a, b), fonte: f.fonte, frase, postura, perche }
}

function dire(r: Rnd, a: string, b: string, rel: Rel, postura: Tesi['postura']): string {
  const T: Record<Rel, string[]> = {
    contro: ['{det:a} contro {det:b}', 'dove comincia {det:a} finisce {det:b}', '{det:a} non sa niente {di:b}', 'tra {det:a} e {det:b} non c\'è pace'],
    causa: ['{da:a} viene {det:b}', '{det:a} porta {det:b}', 'senza {det:a}, niente {b}', 'prima {det:a}, poi {det:b}'],
    dentro: ['{det:b} sta dentro {det:a}', '{in:a} c\'è sempre {det:b}', '{det:a} tiene {det:b}', '{det:b} abita {det:a}'],
    identita: ['{det:a} è {det:b} con un altro nome', '{det:a}, cioè {det:b}', '{det:a} somiglia {a:b} più di quanto sembri'],
    diventa: ['{det:a} diventa {det:b}', '{det:a} si consuma in {b}', 'da {a} a {b}, lentamente'],
    accanto: ['{det:a} accanto {a:b}', '{det:a} e {det:b}, vicini senza saperlo', 'mettere {det:a} vicino {a:b}'],
  }
  const pre = { legge: '', conferma: 'ancora: ', rovescia: 'e invece ', prosegue: 'e poi ', dubita: 'forse ', deduce: 'allora ' }[postura]
  return pre + realizza(pick(r, T[rel]), { a, b })
}

/** dopo la tavola: la tesi resta, i concetti si contano, i motivi si rafforzano o mutano */
export function registraTesi(st: AgentState, e: Enunciato, interesse: number, tenuta: boolean) {
  const A = ensureAtlante(st)
  if (e.modello && e.tipoD) esito(st, Math.random, e.tipoD as never, e.modello, tenuta && interesse > 0.45)
  A.tesi = [...A.tesi, { day: st.day, a: e.a, b: e.b, rel: e.rel, frase: e.frase, fonte: e.fonte, postura: e.postura, riuscita: tenuta ? interesse : interesse * 0.5 }].slice(-200)
  for (const w of [e.a, e.b]) {
    const c = A.concetti[w]
    if (!c) continue
    c.usi++; c.ultima = st.day
    if (c.motivo) {
      if (tenuta && interesse > 0.5) c.motivo.forza = Math.min(1, c.motivo.forza + 0.1)
      else if (!tenuta) { c.motivo.forza -= 0.15; if (c.motivo.forza < 0) { c.motivo.seed = Math.floor(Math.random() * 1e9); c.motivo.forza = 0.3 } }
    }
  }
}

// ─── i motivi ───────────────────────────────────────────────────────────────
const SHAPE_ROOTS: [string, Sogg][] = [
  ['sol', 'cerchio'], ['lun', 'cerchio'], ['occh', 'cerchio'], ['sfer', 'cerchio'], ['mond', 'cerchio'], ['pianet', 'cerchio'], ['terra', 'cerchio'],
  ['mont', 'triangolo'], ['piramid', 'triangolo'], ['fiamm', 'triangolo'], ['fuoc', 'triangolo'], ['poter', 'triangolo'],
  ['croc', 'croce'], ['chies', 'croce'], ['mort', 'croce'],
  ['mur', 'rettangolo'], ['cas', 'rettangolo'], ['port', 'rettangolo'], ['libr', 'rettangolo'], ['edific', 'rettangolo'], ['citt', 'rettangolo'], ['stat', 'rettangolo'], ['legg', 'rettangolo'],
  ['torr', 'colonna'], ['alber', 'colonna'], ['person', 'colonna'], ['uom', 'colonna'], ['donn', 'colonna'], ['corp', 'colonna'], ['soldat', 'colonna'],
  ['pont', 'arco'], ['volt', 'arco'], ['tempo', 'arco'],
  ['ond', 'onde'], ['mar', 'onde'], ['acqu', 'onde'], ['vent', 'onde'], ['suon', 'onde'],
  ['fium', 'traccia'], ['strad', 'traccia'], ['radic', 'traccia'], ['sangu', 'traccia'], ['cammin', 'traccia'], ['vita', 'traccia'], ['storia', 'traccia'],
  ['stell', 'punti'], ['sem', 'punti'], ['piogg', 'punti'], ['foll', 'punti'], ['popol', 'punti'], ['polver', 'punti'], ['cener', 'punti'], ['massa', 'punti'], ['gent', 'punti'],
]
const shapeOf = (w: string): Sogg | null => {
  let best: Sogg | null = null, len = 0
  for (const [r0, s] of SHAPE_ROOTS) if (w.startsWith(r0) && r0.length > len && w.length - r0.length <= (r0.length <= 3 ? 3 : 5)) { best = s; len = r0.length }
  return best
}
const TEXTLESS = () => RECIPES.filter(rc => !rc.params.some(p => p.type === 'text'))

/** la ricetta che meno concetti hanno già come segno: concetti diversi, segni diversi */
function menoUsata(A: Atlante, r: Rnd, ids: string[]): string {
  const uso = new Map<string, number>()
  for (const c of Object.values(A.concetti)) if (c.motivo?.recipe) uso.set(c.motivo.recipe, (uso.get(c.motivo.recipe) ?? 0) + 1)
  return weighted(r, ids, id => 1 / (1 + (uso.get(id) ?? 0) * 3) ** 2, 0.5)
}

/** se troppi concetti hanno lo stesso disegno, i meno usati ne ricevono uno nuovo */
export function diversifica(st: AgentState, r: Rnd): string[] {
  const A = ensureAtlante(st)
  const per = new Map<string, Concetto[]>()
  for (const c of Object.values(A.concetti)) if (c.motivo?.forma === 'ricetta' && c.motivo.recipe) per.set(c.motivo.recipe, [...(per.get(c.motivo.recipe) ?? []), c])
  const cambiati: string[] = []
  for (const cs of per.values()) {
    if (cs.length < 2) continue
    for (const c of cs.sort((a, b) => b.usi - a.usi).slice(1)) { c.motivo = undefined; motivoDi(st, r, c.word); cambiati.push(c.word) }
  }
  return cambiati
}

export function motivoDi(st: AgentState, r: Rnd, w: string): Motivo {
  const A = ensureAtlante(st)
  const c = (A.concetti[w] ??= { word: w, frasi: 0, usi: 0, ultima: 0 })
  if (c.motivo) return c.motivo
  const sh = shapeOf(w)
  const a = anchorOf(w)
  const trama = a?.feature === 'linee' || a?.feature === 'orizzontali' ? 'righe' : a?.feature === 'punti' || a?.feature === 'elementi' ? 'punti' : a?.feature === 'vuoto' ? 'contorno' : a?.feature === 'complessita' ? 'tratteggio' : pick(r, ['pieno', 'pieno', 'righe', 'punti', 'tratteggio', 'contorno'] as const)
  const pool = TEXTLESS()
  // niente forma nota: a volte scrive un generatore suo per questo concetto
  if (!sh && r() < 0.65) {
    const vuole: Features = {}
    if (a?.feature) vuole[a.feature] = (a.dir ?? 1) > 0 ? 0.7 : 0.15
    const g = scriviGeneratore(st, r, w, vuole)
    c.motivo = { forma: 'codice', gen: g.id, trama, colore: r() < 0.35 ? 'acc' : 'ink', seed: Math.floor(r() * 1e9), forza: 0.4, nato: st.day }
    return c.motivo
  }
  c.motivo = sh
    ? { forma: sh, trama, colore: r() < 0.35 ? 'acc' : 'ink', seed: Math.floor(r() * 1e9), forza: 0.4, nato: st.day }
    : { forma: 'ricetta', trama, colore: r() < 0.35 ? 'acc' : 'ink', recipe: menoUsata(A, r, pool.map(x => x.id)), seed: Math.floor(r() * 1e9), forza: 0.4, nato: st.day }
  return c.motivo
}

let ST: AgentState | null = null
async function disegnaMotivo(m: Motivo, t: Tone, q: number, override?: string): Promise<HTMLCanvasElement> {
  const color = override ?? (m.colore === 'acc' ? t.acc : t.ink)
  if (m.forma === 'codice' && ST) {
    const g = generatoreById(ST, m.gen)
    if (g) return disegnaGeneratore(ST, g, 600, color, null)
  }
  if (m.forma === 'ricetta') {
    const rc = RECIPES.find(x => x.id === m.recipe) ?? TEXTLESS()[0]
    const values = shuffleParams(rc, defaults(rc), m.seed)
    return runRecipe(rc, values, m.seed, 'pezzo', q)
  }
  const S = 700, cv = newCanvas(S, S), g = cv.getContext('2d')!
  let a = m.seed >>> 0
  const rnd = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
  g.translate(S / 2, S / 2)
  const R = S * 0.44
  const path = () => {
    g.beginPath()
    switch (m.forma) {
      case 'cerchio': g.arc(0, 0, R, 0, Math.PI * 2); break
      case 'triangolo': g.moveTo(0, -R); g.lineTo(R * 0.9, R * 0.62); g.lineTo(-R * 0.9, R * 0.62); g.closePath(); break
      case 'croce': g.rect(-R * 0.16, -R, R * 0.32, R * 2); g.rect(-R * 0.7, -R * 0.45, R * 1.4, R * 0.3); break
      case 'rettangolo': g.rect(-R * 0.8, -R * 0.55, R * 1.6, R * 1.1); break
      case 'colonna': g.rect(-R * 0.22, -R, R * 0.44, R * 2); break
      case 'arco': g.arc(0, R * 0.35, R * 0.9, Math.PI, 0); g.lineTo(R * 0.55, R * 0.35); g.arc(0, R * 0.35, R * 0.55, 0, Math.PI, true); g.closePath(); break
      case 'onde': for (let k = -2; k <= 2; k++) { g.moveTo(-R, k * R * 0.3); for (let x = -R; x <= R; x += 6) g.lineTo(x, k * R * 0.3 + Math.sin(x / (R * 0.18)) * R * 0.08) } break
      case 'traccia': { let x = -R, y = (rnd() - 0.5) * R * 0.4, an = 0; g.moveTo(x, y); for (let i = 0; i < 60; i++) { an += (rnd() - 0.5) * 0.5; x += Math.cos(an) * R * 0.04; y += Math.sin(an) * R * 0.04; g.lineTo(x, y) } break }
      case 'punti': for (let i = 0; i < 160; i++) { const an = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * R; const rr = 3 + rnd() * 9; g.moveTo(Math.cos(an) * d + rr, Math.sin(an) * d); g.arc(Math.cos(an) * d, Math.sin(an) * d, rr, 0, Math.PI * 2) } break
    }
  }
  const lineare = m.forma === 'onde' || m.forma === 'traccia'
  g.fillStyle = g.strokeStyle = color
  if (lineare) { g.lineWidth = m.forma === 'traccia' ? 22 : 9; g.lineCap = 'round'; path(); g.stroke(); return cv }
  if (m.trama === 'pieno' || m.forma === 'punti') { path(); g.fill(); return cv }
  if (m.trama === 'contorno') { g.lineWidth = 10; path(); g.stroke(); return cv }
  // trama dentro la forma
  g.save(); path(); g.clip()
  g.lineWidth = m.trama === 'tratteggio' ? 3 : 7
  const st = m.trama === 'punti' ? 22 : m.trama === 'righe' ? 20 : 14
  if (m.trama === 'punti') { for (let y = -R; y <= R; y += st) for (let x = -R; x <= R; x += st) { g.beginPath(); g.arc(x + ((y / st) % 2) * st / 2, y, 5, 0, Math.PI * 2); g.fill() } }
  else for (let v = -2 * R; v <= 2 * R; v += st) { g.beginPath(); g.moveTo(v, -R); g.lineTo(m.trama === 'tratteggio' ? v + R : v, R); g.stroke() }
  g.restore()
  g.lineWidth = 6; path(); g.stroke()
  return cv
}

// ─── colore, pennello, maschere ─────────────────────────────────────────────

function hslHex(h: number, sa: number, l: number) {
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * sa, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return hex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}
function hueOf(hx: string) {
  const n = parseInt(hx.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  if (!d) return 0
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return h * 60
}
export type { Armonia } from '../hands/colore'
/** una tavolozza oltre il tono: armonie costruite sull'accento (in OKLCH) */
export function tavolozza(t: Tone, r: Rnd, scelte?: Armonia[]): { colori: string[]; armonia: Armonia } {
  const armonia = pick(r, scelte?.length ? scelte : ['tono', 'tono', 'complementare', 'analoga', 'triade', 'acida', 'notturna'] as Armonia[])
  return { colori: armoniaSu(t.acc, t.ink, armonia, r), armonia }
}

/** un campo di colore: sfumatura o blocchi, fusi con un metodo che cambia il colore sotto */
export function campoColore(s: Sheet, r: Rnd, col: string[]): Layer {
  const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
  if (r() < 0.6) {
    const radiale = r() < 0.4
    const gr = radiale ? g.createRadialGradient(s.W * range(r, 0.2, 0.8), s.H * range(r, 0.2, 0.8), 0, s.W / 2, s.H / 2, s.H * 0.8)
      : (() => { const a = r() * Math.PI; return g.createLinearGradient(s.W / 2 - Math.cos(a) * s.W, s.H / 2 - Math.sin(a) * s.H, s.W / 2 + Math.cos(a) * s.W, s.H / 2 + Math.sin(a) * s.H) })()
    const c0 = pick(r, col), c1 = pick(r, col.filter(c => c !== c0).length ? col.filter(c => c !== c0) : col)
    const tappe = rampa([c0, c1], 7); tappe.forEach((c, i) => gr.addColorStop(i / (tappe.length - 1), c))
    g.fillStyle = gr; g.fillRect(0, 0, s.W, s.H)
  } else {
    for (let i = 0; i < 2 + Math.floor(r() * 3); i++) {
      g.fillStyle = pick(r, col)
      g.save(); g.translate(s.W * r(), s.H * r()); g.rotate(r() < 0.5 ? 0 : (r() - 0.5) * 1.2)
      if (r() < 0.5) g.fillRect(-s.W * 0.3, -s.H * 0.15, s.W * range(r, 0.3, 0.9), s.H * range(r, 0.15, 0.5))
      else { g.beginPath(); g.arc(0, 0, s.W * range(r, 0.15, 0.4), 0, Math.PI * 2); g.fill() }
      g.restore()
    }
  }
  return { ...fullLayer(s, lid(), 'colore', cv, pick(r, (hexToLch(s.bg.length >= 7 ? s.bg : '#808080').l > 0.6 ? ['multiply', 'multiply', 'soft-light', 'color-burn', 'color'] : ['screen', 'soft-light', 'soft-light', 'overlay', 'color'])) as GlobalCompositeOperation, range(r, 0.45, 0.95)) }
}

/** il segno disegnato a pennellate: tratti dentro la forma, qualcuno che scappa fuori */
export function pennella(base: HTMLCanvasElement, color: string, r: Rnd, colori: string[]): HTMLCanvasElement {
  const W = base.width, H = base.height
  const cv = newCanvas(W, H), g = cv.getContext('2d')!
  const ang = r() * Math.PI, n = 50 + Math.floor(r() * 90)
  g.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    g.strokeStyle = r() < 0.8 ? color : pick(r, colori)
    g.globalAlpha = range(r, 0.55, 1)
    g.lineWidth = range(r, W * 0.008, W * 0.05)
    let x = r() * W, y = r() * H, a = ang + (r() - 0.5) * 0.6
    g.beginPath(); g.moveTo(x, y)
    for (let k = 0; k < 12; k++) { a += (r() - 0.5) * 0.3; x += Math.cos(a) * W * 0.03; y += Math.sin(a) * H * 0.03; g.lineTo(x, y) }
    g.stroke()
  }
  g.globalAlpha = 1
  g.globalCompositeOperation = 'destination-in'
  g.drawImage(base, 0, 0)
  g.globalCompositeOperation = 'source-over'
  // qualche gesto che esce dal contorno
  g.strokeStyle = color; g.globalAlpha = 0.7
  for (let i = 0; i < 2 + Math.floor(r() * 4); i++) {
    g.lineWidth = range(r, W * 0.004, W * 0.015)
    let x = W * range(r, 0.2, 0.8), y = H * range(r, 0.2, 0.8), a = r() * Math.PI * 2
    g.beginPath(); g.moveTo(x, y)
    for (let k = 0; k < 18; k++) { a += (r() - 0.5) * 0.5; x += Math.cos(a) * W * 0.035; y += Math.sin(a) * H * 0.035; g.lineTo(x, y) }
    g.stroke()
  }
  return cv
}

/** il segno come maschera: dentro c'è una materia (shader, ricetta o sfumatura) */
export function maschera(base: HTMLCanvasElement, r: Rnd, ctx: ToolCtx, colori: string[]): HTMLCanvasElement {
  const W = base.width, H = base.height
  const cv = newCanvas(W, H), g = cv.getContext('2d')!
  const pool = ctx.shaders.filter(x => x.code)
  let fatto = false
  if (pool.length && r() < 0.5) {
    const sh = runShader(pick(r, pool).code!, Math.round(W / 2), Math.round(H / 2), r() * 60, r())
    if (sh) { g.drawImage(sh, 0, 0, W, H); fatto = true }
  }
  if (!fatto && r() < 0.6) {
    const rc = pick(r, TEXTLESS()), seed = Math.floor(r() * 1e9)
    const tex = runRecipe(rc, shuffleParams(rc, defaults(rc), seed), seed, '4:5', ctx.quality)
    g.drawImage(tex, 0, 0, W, H); fatto = true
  }
  if (!fatto) {
    const gr = g.createLinearGradient(0, 0, W, H)
    rampa([pick(r, colori), pick(r, colori)], 7).forEach((c, i, a) => gr.addColorStop(i / (a.length - 1), c))
    g.fillStyle = gr; g.fillRect(0, 0, W, H)
  }
  g.globalCompositeOperation = 'destination-in'
  g.drawImage(base, 0, 0)
  return cv
}

export type Stile = 'netto' | 'pennello' | 'maschera'

// ─── mettere in scena un enunciato ──────────────────────────────────────────
export interface Messa { sheet: Sheet; passi: { tool: string; params: Record<string, unknown>; kept: boolean; delta: number }[]; libere: { x0: number; y0: number; x1: number; y1: number }[]; posA: [number, number]; posB: [number, number] }

const lid = () => `m${Math.random().toString(36).slice(2, 9)}`

/** il segno di un concetto, disegnato netto (per pagine e diapositive) */
export async function segnoDi(st: AgentState, r: Rnd, w: string, t: Tone, ctx: ToolCtx): Promise<HTMLCanvasElement> {
  ST = st
  return disegnaMotivo(motivoDi(st, r, w), t, ctx.quality)
}

export async function mettiInScena(st: AgentState, r: Rnd, e: Enunciato, start: Sheet, ctx: ToolCtx): Promise<Messa> {
  ST = st
  let s = start
  const t = ctx.tone
  const passi: Messa['passi'] = []
  const usa = async (id: string, params: Record<string, unknown>) => {
    const tool = toolById(id)
    if (!tool) return
    try { s = await applica(tool, s, params, ctx); passi.push({ tool: `scena:${id}`, params: { ...params, values: undefined, strokes: undefined }, kept: true, delta: 0 }) } catch { /* pazienza */ }
  }
  // 1. il campo: strati di materia, liberi (qui sperimenta)
  const nStrati = Math.floor(range(r, 1, 4))
  for (let i = 0; i < nStrati; i++) {
    const k = pick(r, ['ricetta', 'pattern', 'grana', ...(ctx.shaders.some(x => x.code) ? ['shader', 'shader'] : [])])
    const alpha = range(r, 0.2, 0.7)
    if (k === 'ricetta') {
      const rc = pick(r, TEXTLESS()), seed = Math.floor(r() * 1e9)
      await usa('semina', { recipe: rc.id, seed, values: shuffleParams(rc, defaults(rc), seed), piece: false, x: 0.5, y: 0.5, scale: 1, rot: 0, blend: pick(r, ['multiply', 'overlay', 'soft-light', 'screen', 'difference']) })
      if (s.layers.length) s.layers[s.layers.length - 1].alpha = alpha
    } else if (k === 'pattern') await usa('pattern', { ...toolById('pattern')!.propose(s, ctx), alpha: alpha * 0.7 })
    else if (k === 'grana') await usa('grana', toolById('grana')!.propose(s, ctx))
    else await usa('shader', { ...toolById('shader')!.propose(s, ctx), alpha })
  }
  if (s.layers.length && r() < 0.5) await usa('luce', { layer: s.layers[0].id, look: pick(r, LOOKS).id, amount: Math.round(range(r, 40, 90)) })
  // il colore: una tavolozza oltre il tono, e un campo che la mette in gioco
  const { colori, armonia } = tavolozza(t, r)
  if (r() < 0.35) {
    // un campo scritto da lui: una formula che diventa colore
    const O = ensureOfficina(st)
    const campi = O.gen.filter(g => g.tipo === 'campo' && g.punteggio > 0.4)
    const g = campi.length && r() < 0.5 ? pick(r, campi) : scriviGeneratore(st, r, e.a, { complessita: 0.4 }, 'campo')
    const cv = disegnaGeneratore(st, g, 360, colori[1], pick(r, [colori[0], colori[2] ?? colori[0], t.bg]))
    const big = newCanvas(s.W, s.H); big.getContext('2d')!.drawImage(cv, 0, 0, s.W, s.H)
    s = withLayer(s, fullLayer(s, lid(), 'colore', big, pick(r, ['multiply', 'overlay', 'soft-light', 'color', 'screen']) as GlobalCompositeOperation, range(r, 0.4, 0.85)))
    passi.push({ tool: 'scena:campo', params: { generatore: g.nome, formula: g.testo.slice(0, 80) }, kept: true, delta: 0 })
  } else if (armonia !== 'tono' || r() < 0.4) { s = withLayer(s, campoColore(s, r, colori)); passi.push({ tool: 'scena:colore', params: { armonia }, kept: true, delta: 0 }) }

  // 2. i due segni, disposti secondo la relazione; oggi disegnati in uno stile (netto, a pennello, come maschera)
  const mA = motivoDi(st, r, e.a), mB = motivoDi(st, r, e.b)
  const stile: Stile = weighted(r, ['netto', 'pennello', 'maschera'] as Stile[], x => (x === 'netto' ? 1 : 1.3), 1)
  const colA = mA.colore === 'acc' ? colori[1] : armonia !== 'tono' && r() < 0.4 ? colori[2] : colori[0]
  const colB = mB.colore === 'acc' ? colori[1] : armonia !== 'tono' && r() < 0.4 ? colori[3] ?? colori[0] : colori[0]
  const rendi = (c: HTMLCanvasElement, col: string) => (stile === 'pennello' ? pennella(c, col, r, colori) : stile === 'maschera' ? maschera(c, r, ctx, colori) : c)
  const [bA, bB] = await Promise.all([disegnaMotivo(mA, t, ctx.quality, colA), disegnaMotivo(mB, t, ctx.quality, colB)])
  const cA = rendi(bA, colA), cB = stile === 'maschera' && r() < 0.5 ? bB : rendi(bB, colB)
  passi.push({ tool: 'scena:stile', params: { stile, armonia }, kept: true, delta: 0 })
  const lay = (cv: HTMLCanvasElement, x: number, y: number, scale: number, extra: Partial<{ alpha: number; blend: GlobalCompositeOperation; rot: number }> = {}) => {
    s = withLayer(s, { id: lid(), kind: 'motivo', canvas: sfuma(cv, 0.08), x, y, scale, rot: extra.rot ?? 0, alpha: extra.alpha ?? 1, blend: extra.blend ?? 'source-over' })
  }
  let posA: [number, number] = [0.33, 0.45], posB: [number, number] = [0.66, 0.45]
  let libere: Messa['libere'] = []
  const lato = r() < 0.5
  switch (e.rel) {
    case 'contro': {
      // il campo diviso: una metà velata; i due segni si fronteggiano
      const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
      g.fillStyle = t.ink; g.globalAlpha = 0.18
      if (lato) g.fillRect(s.W / 2, 0, s.W / 2, s.H); else g.fillRect(0, 0, s.W / 2, s.H)
      s = withLayer(s, fullLayer(s, lid(), 'campo', cv, 'multiply'))
      posA = [0.27, 0.47]; posB = [0.73, 0.47]
      lay(cA, ...posA, 0.38); lay(cB, ...posB, 0.38, { rot: r() < 0.3 ? Math.PI : 0 })
      libere = [{ x0: 0.06, y0: 0.72, x1: 0.94, y1: 0.88 }, { x0: 0.06, y0: 0.05, x1: 0.94, y1: 0.22 }]
      break
    }
    case 'causa': {
      posA = [0.28, 0.3]; posB = [0.66, 0.62]
      lay(cA, ...posA, 0.26)
      // la traccia da A a B: il passaggio
      const pts: [number, number][] = []
      for (let i = 0; i <= 30; i++) { const k = i / 30; pts.push([posA[0] + (posB[0] - posA[0]) * k + Math.sin(k * 7) * 0.02, posA[1] + (posB[1] - posA[1]) * k]) }
      await usa('traccia', { strokes: [pts], width: 5, taper: true, color: t.acc, alpha: 0.9, dry: true })
      lay(cB, ...posB, 0.46)
      libere = [{ x0: 0.5, y0: 0.06, x1: 0.94, y1: 0.36 }, { x0: 0.06, y0: 0.74, x1: 0.94, y1: 0.88 }]
      break
    }
    case 'dentro': {
      posA = [0.5, 0.44]; posB = [0.5 + (r() - 0.5) * 0.1, 0.46]
      lay(cA, ...posA, 0.66)
      lay(cB, ...posB, 0.2, { blend: r() < 0.5 ? 'difference' : 'source-over' })
      libere = [{ x0: 0.06, y0: 0.8, x1: 0.94, y1: 0.88 }, { x0: 0.06, y0: 0.04, x1: 0.94, y1: 0.12 }]
      break
    }
    case 'identita': {
      posA = [0.44, 0.42]; posB = [0.56, 0.48]
      lay(cA, ...posA, 0.5)
      lay(cB, ...posB, 0.5, { blend: pick(r, ['multiply', 'difference', 'screen', 'exclusion']), alpha: 0.9 })
      libere = [{ x0: 0.06, y0: 0.76, x1: 0.94, y1: 0.88 }, { x0: 0.06, y0: 0.04, x1: 0.6, y1: 0.16 }]
      break
    }
    case 'diventa': {
      posA = [0.2, 0.45]; posB = [0.8, 0.45]
      lay(cA, ...posA, 0.26)
      for (let i = 1; i <= 3; i++) lay(i < 2 ? cA : cB, 0.2 + i * 0.15, 0.45, 0.26 + i * 0.02, { alpha: 0.25 + i * 0.12 })
      lay(cB, ...posB, 0.32)
      libere = [{ x0: 0.06, y0: 0.66, x1: 0.94, y1: 0.88 }, { x0: 0.06, y0: 0.05, x1: 0.94, y1: 0.25 }]
      break
    }
    default: {
      posA = [0.35, 0.36]; posB = [0.62, 0.58]
      lay(cA, ...posA, 0.34); lay(cB, ...posB, 0.34)
      libere = [{ x0: 0.06, y0: 0.76, x1: 0.94, y1: 0.88 }, { x0: 0.55, y0: 0.06, x1: 0.94, y1: 0.24 }]
    }
  }
  passi.push({ tool: 'scena:motivi', params: { a: e.a, b: e.b, rel: e.rel }, kept: true, delta: 0 })
  // filtri sui segni e sul campo: materia, look, a volte un taglio
  const motivi = s.layers.filter(l => l.kind === 'motivo')
  for (const l of motivi) if (r() < 0.35) await usa('materia', { ...toolById('materia')!.propose(s, ctx), layer: l.id })
  if (r() < 0.4 && motivi.length) await usa('luce', { layer: pick(r, motivi).id, look: pick(r, LOOKS).id, amount: Math.round(range(r, 50, 100)) })
  if (r() < 0.25 && motivi.length) await usa('taglia', { ...toolById('taglia')!.propose(s, ctx), layer: pick(r, motivi).id })
  return { sheet: s, passi, libere, posA, posB }
}

// ─── il testo dentro la composizione ────────────────────────────────────────

const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
function mediaSotto(s: Sheet, x0: number, y0: number, x1: number, y1: number): string {
  const k = 0.2, c = flatten(s, k), g = c.getContext('2d')!
  const X = Math.max(0, Math.floor(x0 * c.width)), Y = Math.max(0, Math.floor(y0 * c.height))
  const w = Math.max(1, Math.min(c.width - X, Math.ceil((x1 - x0) * c.width))), h = Math.max(1, Math.min(c.height - Y, Math.ceil((y1 - y0) * c.height)))
  const d = g.getImageData(X, Y, w, h).data
  let R = 0, G = 0, B = 0, n = 0
  for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++ }
  return hex(R / n, G / n, B / n)
}

export type ModoTesto = 'riga' | 'colonna' | 'etichette' | 'grande'

/** scrive la frase e la fonte dove c'è spazio, col colore che si legge su ciò che c'è sotto */
export async function scriviEnunciato(s: Sheet, r: Rnd, e: Enunciato, m: Messa, face: FaceId, t: Tone, modo: ModoTesto): Promise<Sheet> {
  await loadLabFonts()
  const M = Math.min(s.W, s.H)
  const prova = { ...s, layers: [] }
  const colori = [t.ink, t.acc, t.bg, '#111111', '#f4f2ec']
  const metti = async (out: Sheet, text: string, left: number, top: number, size: number, maxW: number, align: CanvasTextAlign = 'left', f: FaceId = face) => {
    const L = (await textLayer(prova, { text, face: f, sizePx: size * M, color: '#000', x: 0, y: 0, maxW, align })).layers[0]
    const w = L.canvas.width / s.W, h = L.canvas.height / s.H
    const x0 = align === 'right' ? left - w : align === 'center' ? left - w / 2 : left
    const sotto = mediaSotto(out, x0, top, x0 + w, top + h)
    const col = colori.slice().sort((a, b) => ratio(b, sotto) - ratio(a, sotto))[0]
    if (ratio(col, sotto) < 3.2) {
      // velatura minima: una fascia del colore di fondo appena sotto le righe
      const cv = newCanvas(Math.round(w * s.W), Math.round(h * s.H)), g = cv.getContext('2d')!
      g.fillStyle = ratio(t.bg, col) > 3 ? t.bg : col === '#111111' ? '#f4f2ec' : '#111111'; g.fillRect(0, 0, cv.width, cv.height)
      out = withLayer(out, { id: lid(), kind: 'piastra', canvas: cv, x: x0 + w / 2, y: top + h / 2, scale: Math.max(cv.width, cv.height) / M, rot: 0, alpha: 0.82, blend: 'source-over' })
    }
    const fin = (await textLayer(prova, { text, face: f, sizePx: size * M, color: ratio(col, sotto) < 3.2 ? (ratio(t.bg, col) > 3 ? col : col === '#111111' ? '#111111' : '#f4f2ec') : col, x: 0, y: 0, maxW, align })).layers[0]
    return { out: withLayer(out, { ...fin, x: x0 + w / 2, y: top + h / 2 }), h }
  }
  const z = m.libere[0], z2 = m.libere[1] ?? m.libere[0]
  const fonte = `«${e.citazione}» — ${e.fonte}`
  const misura = async (text: string, size: number, maxW: number, f: FaceId = face) => { const L = (await textLayer(prova, { text, face: f, sizePx: size * M, color: '#000', x: 0, y: 0, maxW })).layers[0]; return L.canvas.height / s.H }
  /** frase e fonte in un blocco unico: misura prima, poi sistema; se non ci sta, sale o rimpicciolisce. Mai testo sopra testo. */
  const blocco = async (o: Sheet, left: number, top: number, maxW: number, sizeF: number, sizeS: number): Promise<Sheet> => {
    let sf = sizeF, ss = sizeS, hF = 0, hS = 0
    for (let k = 0; k < 4; k++) {
      hF = await misura(e.frase, sf, maxW); hS = await misura(fonte, ss, Math.min(0.8, maxW + 0.1), 'mono')
      if (hF + hS + 0.015 <= 0.9) break
      sf *= 0.85; ss *= 0.9
    }
    const tot = hF + 0.015 + hS
    const y = Math.max(0.05, Math.min(top, 0.95 - tot))
    const a = await metti(o, e.frase, left, y, sf, maxW)
    return (await metti(a.out, fonte, left, y + a.h + 0.015, ss, Math.min(0.8, maxW + 0.1), 'left', 'mono')).out
  }
  let out = s
  switch (modo) {
    case 'grande': out = await blocco(out, z.x0, z.y0, Math.min(0.86, z.x1 - z.x0), e.frase.length > 34 ? 0.06 : 0.075, 0.017); break
    case 'colonna': { const colW = 0.3, left = r() < 0.5 ? 0.07 : 0.93 - colW; out = await blocco(out, left, z2.y0, colW, 0.034, 0.015); break }
    case 'etichette': {
      // le due parole accanto ai loro segni, la frase in basso
      const lab = async (o: Sheet, w: string, p: [number, number], dy: number) => (p[0] > 0.6 ? metti(o, w, p[0] - 0.02, p[1] + dy, 0.03, 0.4, 'right') : metti(o, w, p[0] + 0.02, p[1] + dy, 0.03, 0.4))
      out = (await lab(out, e.a, m.posA, -0.2)).out
      out = (await lab(out, e.b, m.posB, 0.16)).out
      out = await blocco(out, z.x0, z.y0 + 0.02, z.x1 - z.x0, 0.04, 0.015)
      break
    }
    default: out = await blocco(out, z.x0, z.y0 + 0.02, z.x1 - z.x0, 0.045, 0.016)
  }
  return out
}
