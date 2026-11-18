/**
 * La scuola interna: come l'artista cresce invece di ascoltare i commenti.
 *
 * LA FIRMA. Una grammatica personale che si stabilizza col tempo: carattere,
 * tono, margini, griglia, un marchio nell'angolo, regole di ordine. La forza
 * con cui la applica cresce con la maturità e con i risultati.
 *
 * LA REDAZIONE. Dopo lo studio, una passata editoriale guardata gesto per gesto:
 * toglie ciò che non serve, mette in griglia e dentro i margini, rifà il testo
 * leggibile nel suo carattere, tiene al massimo due testi, firma.
 *
 * I MAESTRI. Profili di stili storici (svizzero, Bauhaus, costruttivismo,
 * minimalismo, fanzine punk, dada, pop) come misure. L'artista si confronta:
 * a chi somiglia, cosa gli manca. Studiarne uno (leggerne davvero) sblocca la
 * sua lezione nella redazione.
 *
 * L'AUTOCRITICA. Ogni sera guarda le ultime tavole: rumore, forma, leggibilità,
 * vuoti, pasticci, intenzione, varietà, coerenza con la firma. Trova la
 * debolezza più grande, decide cosa studiare domani e un esercizio con vincoli.
 *
 * LE SFERZATE. Ogni tanto rompe apposta la sua firma. Se la sferzata funziona,
 * qualcosa entra nella firma: è così che la firma non diventa maniera.
 */
import type { AgentState, Features, Intention } from '../core/types'
import { pick, uid, weighted, type Rnd } from '../core/rng'
import { TONES } from '@/components/studio/genera/recipes'
import { FACES, type FaceId } from '@/components/studio/genera/fonts'
import type { Sheet } from '../hands/sheet'
import { textLayer } from '../hands/tools'
import { ratio } from '../eyes/judgement'
import { featureDistance } from '../eyes/measure'

export interface Firma {
  face: FaceId
  tone: string
  margine: number
  griglia: 3 | 4 | 6
  angolo: 'bl' | 'br' | 'tl' | 'tr'
  maxTesti: 1 | 2
  forza: number
  regole: string[]
  storia: { day: number; cambio: string }[]
}
export interface Maestro { id: string; nome: string; profilo: Features; lezione: string; cerca: string; regola: string }
export interface Diagnosi { day: number; misure: Record<string, number>; debolezza: string; forza: string; affinita: { maestro: string; d: number }[] }
export interface Esercizio { day: number; tema: string; vincoli: string; targets: Features; tools: string[]; register?: Intention['register'] }
export interface Scuola {
  firma: Firma
  studiati: { maestro: string; day: number; letto: string }[]
  studiare: string[]
  esercizio?: Esercizio
  diagnosi: Diagnosi[]
  sferzate: { day: number; workId: string; rottura: string; esito?: number; entrata?: boolean }[]
  lezioni: string[]
  /** registro leggero delle ultime tavole, per l'autocritica */
  registro: Registro[]
  letti?: string[]
}
export interface Registro { day: number; features: Features; kept: boolean; novelty: number; interest: number; flaws: string[]; targets: number; tone: string }

export const MAESTRI: Maestro[] = [
  { id: 'svizzero', nome: 'stile tipografico internazionale', profilo: { vuoto: 0.45, elementi: 0.2, complessita: 0.2, terzi: 0.8, contrasto: 0.7, rumore: 0.05, forma: 0.7 }, lezione: 'griglia, margini, un solo carattere, gerarchia', cerca: 'Stile tipografico internazionale', regola: 'griglia' },
  { id: 'bauhaus', nome: 'Bauhaus', profilo: { superfici: 0.7, saturazione: 0.6, elementi: 0.3, forma: 0.75, rumore: 0.05 }, lezione: 'forme primarie, colori puri, funzione', cerca: 'Bauhaus', regola: 'forme' },
  { id: 'costruttivismo', nome: 'costruttivismo russo', profilo: { diagonali: 0.7, contrasto: 0.8, squilibrio: 0.45, forma: 0.7 }, lezione: 'diagonale, rosso e nero, testo come struttura', cerca: 'Costruttivismo russo', regola: 'diagonale' },
  { id: 'minimalismo', nome: 'minimalismo', profilo: { vuoto: 0.7, elementi: 0.05, complessita: 0.1, densita: 0.15, rumore: 0.02 }, lezione: 'togliere finché regge', cerca: 'Minimalismo', regola: 'togliere' },
  { id: 'fanzine', nome: 'fanzine punk', profilo: { complessita: 0.65, contrasto: 0.9, saturazione: 0.1, densita: 0.55, forma: 0.5 }, lezione: 'fotocopia, collage, urgenza, ma si legge', cerca: 'Fanzine', regola: 'urgenza' },
  { id: 'dada', nome: 'dadaismo', profilo: { elementi: 0.65, squilibrio: 0.5, forma: 0.5, densita: 0.45 }, lezione: 'il caso come metodo, il nonsenso preciso', cerca: 'Dadaismo', regola: 'caso' },
  { id: 'pop', nome: 'pop art', profilo: { saturazione: 0.8, contrasto: 0.7, superfici: 0.6, punti: 0.4, forma: 0.7 }, lezione: 'ripetizione, colore pieno, icona', cerca: 'Pop art', regola: 'icona' },
]

const DEBOLEZZE: Record<string, { studia: string[]; esercizio: () => Omit<Esercizio, 'day'> }> = {
  rumore: { studia: ['Minimalismo', 'Gestalt'], esercizio: () => ({ tema: 'rumore', vincoli: 'un solo elemento che comanda e molto vuoto', targets: { vuoto: 0.55, elementi: 0.08, rumore: 0.02, forma: 0.8 }, tools: ['geometria', 'semina', 'togli', 'disponi'] }) },
  leggibilita: { studia: ['Leggibilità', 'Tipografia', 'Gerarchia visiva'], esercizio: () => ({ tema: 'leggibilità', vincoli: 'solo testo e una forma: deve leggersi da lontano', targets: { contrasto: 0.8, vuoto: 0.4 }, tools: ['scrivi', 'geometria', 'fondo', 'disponi'], register: 'slogan' }) },
  ordine: { studia: ['Griglia tipografica', 'Stile tipografico internazionale', 'Impaginazione'], esercizio: () => ({ tema: 'ordine', vincoli: 'griglia rigida, tre elementi allineati', targets: { terzi: 0.85, simmetria: 0.5, elementi: 0.2 }, tools: ['geometria', 'scrivi', 'disponi', 'ripeti'] }) },
  senso: { studia: ['Manifesto (grafica)', 'Arte concettuale', 'Semiotica'], esercizio: () => ({ tema: 'senso', vincoli: 'una parola e un segno che la dicono', targets: { elementi: 0.15, forma: 0.75 }, tools: ['scrivi', 'traccia', 'taglia'], register: 'filosofico' }) },
  varieta: { studia: ['Collage', 'Dadaismo', 'Costruttivismo russo'], esercizio: () => ({ tema: 'varietà', vincoli: 'mai fatto prima: materiale nuovo, composizione nuova', targets: { diagonali: 0.6, squilibrio: 0.45 }, tools: ['materia', 'shader', 'pattern', 'taglia'] }) },
  equilibrio: { studia: ['Sezione aurea', 'Composizione (arte)'], esercizio: () => ({ tema: 'equilibrio', vincoli: 'il peso sui terzi, nessun angolo vuoto per sbaglio', targets: { terzi: 0.85, squilibrio: 0.3, peso_quadrante: 0.3 }, tools: ['disponi', 'geometria', 'semina'] }) },
  firma: { studia: ['Stile (arte)', 'Identità visiva'], esercizio: () => ({ tema: 'firma', vincoli: 'rifare una tavola riuscita con più ordine', targets: {}, tools: ['disponi', 'togli', 'scrivi'] }) },
}

type WithS = AgentState & { scuola?: Scuola }
export const getScuola = (st: AgentState) => (st as WithS).scuola

export function ensureScuola(st: AgentState, r: Rnd): Scuola {
  const s = (st as WithS).scuola
  if (s) return s
  const tone = pick(r, TONES).id
  const face = pick(r, ['grotesk', 'condensato', 'corsivo', 'mono', 'bodoni'] as FaceId[])
  const fresh: Scuola = {
    firma: { face, tone, margine: 0.06, griglia: 4, angolo: pick(r, ['bl', 'br'] as const), maxTesti: 2, forza: 0.25, regole: ['firma in basso', `carattere ${FACES[face].family}`], storia: [{ day: st.day, cambio: 'nasce la firma' }] },
    studiati: [], studiare: [], diagnosi: [], sferzate: [], lezioni: [], registro: [],
  }
  ;(st as WithS).scuola = fresh
  return fresh
}

// ─── la redazione ────────────────────────────────────────────────────────────

type Look = (s: Sheet) => { score: number }
export interface Passo { tool: string; params: Record<string, unknown>; kept: boolean; delta: number }

/** passata editoriale guardata gesto per gesto: tiene solo ciò che non peggiora */
export async function redazione(st: AgentState, r: Rnd, sheet: Sheet, look: Look, opts: { firma: boolean; nome: string; impaginato?: boolean }): Promise<{ sheet: Sheet; passi: Passo[] }> {
  const sc = (st as WithS).scuola!
  const F = sc.firma
  const studied = new Set(sc.studiati.map(x => x.maestro))
  const passi: Passo[] = []
  let cur = sheet, score = look(sheet).score
  const prova = async (tool: string, params: Record<string, unknown>, next: Sheet, tolleranza = 0.004) => {
    const sc2 = look(next).score
    const ok = sc2 >= score - tolleranza * (1 + F.forza)
    passi.push({ tool: `redazione:${tool}`, params, kept: ok, delta: Math.round((sc2 - score) * 1000) / 1000 })
    if (ok) { cur = next; score = Math.max(score, sc2) }
  }
  // 1. togliere il superfluo (dall'alto; con il minimalismo studiato prova di più)
  const tries = studied.has('minimalismo') ? 8 : 5
  for (const l of cur.layers.slice().reverse().slice(0, tries)) {
    if (cur.layers.length <= 1 || ['firma', 'testo', 'piastra', 'mappa', 'etichette', 'orizzonte', 'pannelli'].includes(l.kind)) continue
    await prova('togli', { livello: l.kind }, { ...cur, layers: cur.layers.filter(x => x.id !== l.id) })
  }
  // 2. troppi testi: tiene i più grandi
  const testi = cur.layers.filter(l => l.meta && l.kind !== 'firma').sort((a, b) => b.meta!.size - a.meta!.size)
  if (!opts.impaginato && testi.length > F.maxTesti) {
    const via = new Set(testi.slice(F.maxTesti).map(l => l.id))
    await prova('testi', { tolti: via.size }, { ...cur, layers: cur.layers.filter(l => !via.has(l.id)) }, 0.01)
  }
  // 3. testo leggibile, nel carattere della firma, col colore che contrasta di più
  for (const l of opts.impaginato ? [] : cur.layers.filter(x => x.meta && x.kind !== 'firma')) {
    const tone = TONES.find(t => t.id === F.tone) ?? TONES[0]
    const colors = [tone.ink, tone.acc, tone.bg, '#111111', '#f2f0ea']
    const best = colors.sort((a, b) => ratio(b, cur.bg) - ratio(a, cur.bg))[0]
    if (ratio(l.meta!.color, cur.bg) > 4.5 && r() > F.forza) continue
    const base = { ...cur, layers: cur.layers.filter(x => x.id !== l.id) }
    const rot = 0
    const rifatto = await textLayer(base, { text: l.meta!.text, face: F.face, sizePx: Math.max(l.meta!.size, Math.min(cur.W, cur.H) * 0.035), color: best, x: l.x, y: l.y, rot })
    // il testo rifatto va dove stava nella pila
    const nuovo = rifatto.layers[rifatto.layers.length - 1]
    const i = cur.layers.findIndex(x => x.id === l.id)
    const layers = cur.layers.slice(); layers[i] = nuovo
    await prova('testo', { carattere: F.face, colore: best }, { ...cur, layers }, 0.01)
  }
  // 4. griglia e margini (la regola svizzera, più forte se studiata)
  const g = studied.has('svizzero') ? 6 : F.griglia
  const snap = (v: number) => { const m = F.margine; const step = (1 - 2 * m) / g; return Math.min(1 - m, Math.max(m, m + Math.round((v - m) / step) * step)) }
  const pezzi = cur.layers.filter(l => !['grana', 'pattern', 'firma', 'testo', 'piastra', 'mappa', 'etichette'].includes(l.kind) && l.scale < 1.2)
  if (pezzi.length && r() < 0.4 + F.forza * 0.6) {
    const layers = cur.layers.map(l => (pezzi.includes(l) ? { ...l, x: snap(l.x), y: snap(l.y) } : l))
    await prova('griglia', { colonne: g, margine: F.margine }, { ...cur, layers })
  }
  // 5. la firma: il marchio nell'angolo
  if (opts.firma && opts.nome) {
    const m = F.margine, a = F.angolo
    const tone = TONES.find(t => t.id === F.tone) ?? TONES[0]
    const color = [tone.ink, tone.acc, '#111111', '#f2f0ea'].sort((x, y) => ratio(y, cur.bg) - ratio(x, cur.bg))[0]
    const x = a.endsWith('l') ? m + 0.06 : 1 - m - 0.06, y = a.startsWith('b') ? 1 - m - 0.015 : m + 0.015
    const firmato = await textLayer(cur, { text: opts.nome, face: F.face, sizePx: Math.min(cur.W, cur.H) * 0.022, color, x, y, kind: 'firma', maxW: 0.3 })
    cur = firmato
    passi.push({ tool: 'redazione:firma', params: { angolo: a }, kept: true, delta: 0 })
  }
  return { sheet: cur, passi }
}

// ─── autocritica serale ─────────────────────────────────────────────────────

const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export function autocritica(st: AgentState, r: Rnd): Diagnosi | null {
  const sc = (st as WithS).scuola!
  const recenti = sc.registro.slice(-12)
  if (recenti.length < 3) return null
  const fs = recenti.map(w => w.features)
  const fl = recenti.map(w => w.flaws)
  const misure: Record<string, number> = {
    rumore: media(fs.map(f => f.rumore ?? 0)) + media(fl.map(x => (x.includes('pasticcio') || x.includes('pattern a caso') ? 1 : 0))) * 0.5,
    leggibilita: media(fl.map(x => (x.includes('illeggibile') ? 1 : 0))),
    ordine: 1 - media(fs.map(f => f.terzi ?? 0.5)),
    senso: media(fl.map(x => (x.includes('non dice niente') || x.includes('vuota') ? 1 : 0))) + (1 - media(recenti.map(w => (w.targets ? 1 : 0.5)))) * 0.3,
    varieta: 1 - media(recenti.map(w => w.novelty)) * 1.6,
    equilibrio: media(fl.map(x => (x.includes('sbilanciata') ? 1 : 0))),
  }
  // coerenza con la firma: quanto si somigliano le tavole tenute (troppo poco = nessuna voce)
  const kept = recenti.filter(w => w.kept).map(w => w.features)
  if (kept.length >= 3) {
    const c = Object.fromEntries(Object.keys(kept[0]).map(k => [k, media(kept.map(f => f[k] ?? 0))]))
    misure.firma = Math.min(1, media(kept.map(f => featureDistance(f, c))) * 2)
  }
  const ordine = Object.entries(misure).sort((a, b) => b[1] - a[1])
  // se è la stessa debolezza da tre sere, lavora sulla seconda (non si incaponisce)
  const ultime = sc.diagnosi.slice(-3).map(x => x.debolezza)
  const debolezza = ultime.length === 3 && ultime.every(x => x === ordine[0][0]) ? ordine[1][0] : ordine[0][0]
  const forza = ordine[ordine.length - 1][0]
  const meanF = Object.fromEntries(Object.keys(fs[0]).map(k => [k, media(fs.map(f => f[k] ?? 0))]))
  const affinita = MAESTRI.map(m => ({ maestro: m.id, d: Object.entries(m.profilo).reduce((a, [k, v]) => a + Math.abs((meanF[k] ?? 0) - v), 0) / Object.keys(m.profilo).length }))
    .sort((a, b) => a.d - b.d)
  const d: Diagnosi = { day: st.day, misure, debolezza, forza, affinita }
  sc.diagnosi = [...sc.diagnosi, d].slice(-60)
  // il piano: cosa leggere domani (la debolezza, e il maestro più vicino non ancora studiato), e l'esercizio
  const plan = DEBOLEZZE[debolezza]
  const maestroDaStudiare = affinita.map(a => MAESTRI.find(m => m.id === a.maestro)!).find(m => !sc.studiati.some(s => s.maestro === m.id))
  const letti = new Set(sc.letti ?? [])
  const nuovi = plan.studia.filter(q => !letti.has(q))
  sc.studiare = [...new Set([...(nuovi.length ? [pick(r, nuovi)] : []), ...(maestroDaStudiare && !letti.has(maestroDaStudiare.cerca) ? [maestroDaStudiare.cerca] : [])])]
  sc.esercizio = misure[debolezza] > 0.3 && r() < 0.7 ? { day: st.day + 1, ...plan.esercizio() } : undefined
  return d
}

/** quando una lettura di studio è stata davvero letta: la lezione del maestro entra nella redazione */
export function registraStudio(st: AgentState, titolo: string, testo: string) {
  const sc = (st as WithS).scuola!
  for (const m of MAESTRI) {
    if (sc.studiati.some(s => s.maestro === m.id)) continue
    if (titolo.toLowerCase().includes(m.cerca.toLowerCase().split(' ')[0]) || testo.toLowerCase().includes(m.cerca.toLowerCase())) {
      sc.studiati.push({ maestro: m.id, day: st.day, letto: titolo })
      sc.lezioni = [...sc.lezioni, `giorno ${st.day}: dal ${m.nome} ho preso: ${m.lezione}`].slice(-40)
    }
  }
}

/** la firma cambia: impara dalle tavole tenute migliori, si rafforza se la coerenza paga */
export function evolviFirma(st: AgentState, r: Rnd) {
  const sc = (st as WithS).scuola!
  const F = sc.firma
  const migliori = sc.registro.filter(x => x.kept).sort((a, b) => b.interest - a.interest).slice(0, 6)
  const tones = migliori.map(x => x.tone)
  const faceUsate: FaceId[] = []
  const topTone = tones.sort((a, b) => tones.filter(x => x === b).length - tones.filter(x => x === a).length)[0]
  if (topTone && topTone !== F.tone && tones.filter(x => x === topTone).length >= 2) { F.tone = topTone; F.storia.push({ day: st.day, cambio: `il tono diventa ${topTone}` }) }
  const topFace = faceUsate.sort((a, b) => faceUsate.filter(x => x === b).length - faceUsate.filter(x => x === a).length)[0]
  if (topFace && topFace !== F.face && faceUsate.filter(x => x === topFace).length >= 3) { F.face = topFace; F.storia.push({ day: st.day, cambio: `il carattere diventa ${FACES[topFace].family}` }) }
  const last = sc.diagnosi[sc.diagnosi.length - 1]
  if (last?.misure.ordine !== undefined && last.misure.ordine < 0.35 && F.margine < 0.1) { F.margine = Math.round((F.margine + 0.01) * 100) / 100; F.storia.push({ day: st.day, cambio: `margini più larghi (${F.margine})` }) }
  F.forza = Math.min(0.9, F.forza + 0.01 + (last && last.misure.rumore < 0.2 ? 0.01 : 0))
  F.regole = [`carattere ${FACES[F.face].family}`, `tono ${F.tone}`, `margine ${Math.round(F.margine * 100)}%`, `griglia ${F.griglia}`, `firma in ${F.angolo === 'bl' ? 'basso a sinistra' : F.angolo === 'br' ? 'basso a destra' : 'alto'}`, `al massimo ${F.maxTesti} testi`, ...sc.studiati.map(s => MAESTRI.find(m => m.id === s.maestro)!.lezione)]
  F.storia = F.storia.slice(-40)
  void r
}

// ─── le sferzate ────────────────────────────────────────────────────────────

const ROTTURE: { id: string; testo: string; targets: Features; tools: string[] }[] = [
  { id: 'gigante', testo: 'una parola sola, enorme, che esce dal foglio', targets: { densita: 0.6, contrasto: 0.9 }, tools: ['scrivi', 'disponi'] },
  { id: 'tutto-grana', testo: 'tutta materia, nessuna forma', targets: { complessita: 0.85, forma: 0.2 }, tools: ['grana', 'materia', 'shader'] },
  { id: 'fuori-griglia', testo: 'tutto storto, contro la griglia', targets: { diagonali: 0.8, squilibrio: 0.7 }, tools: ['disponi', 'ripeti', 'traccia'] },
  { id: 'vuoto-totale', testo: 'quasi niente, un segno nell\'angolo', targets: { vuoto: 0.9, densita: 0.03 }, tools: ['traccia', 'togli'] },
  { id: 'colore-urlato', testo: 'colore che urla, contro il tono', targets: { saturazione: 0.9, contrasto: 0.8 }, tools: ['fondo', 'luce', 'geometria'] },
]

/** oggi una sferzata? più probabile se annoiato, maturo, o se la firma è troppo forte */
export function sferzata(st: AgentState, r: Rnd): { rottura: string; intention: Partial<Intention> } | null {
  const sc = (st as WithS).scuola!
  const p = 0.04 + (st.mood === 'annoiato' || st.mood === 'inquieto' ? 0.08 : 0) + sc.firma.forza * 0.08 + Math.min(0.06, st.day / 3000)
  if (r() > p || st.day < 10) return null
  const x = pick(r, ROTTURE)
  return { rottura: x.testo, intention: { targets: x.targets, tools: x.tools } }
}

/** la sferzata ha funzionato? allora qualcosa entra nella firma */
export function esitoSferzata(st: AgentState, workId: string, rottura: string, interesse: number, virale: boolean) {
  const sc = (st as WithS).scuola!
  const entrata = interesse > 0.6 || virale
  sc.sferzate = [...sc.sferzate, { day: st.day, workId, rottura, esito: interesse, entrata }].slice(-50)
  if (entrata) {
    sc.firma.storia.push({ day: st.day, cambio: `una sferzata entra nella firma: ${rottura}` })
    sc.lezioni = [...sc.lezioni, `giorno ${st.day}: ho rotto le regole (${rottura}) e ha funzionato`].slice(-40)
    sc.firma.forza = Math.max(0.2, sc.firma.forza - 0.1) // meno rigido
  }
}

/** l'esercizio di oggi diventa l'intenzione (vincoli su bersagli e strumenti) */
export function applicaEsercizio(st: AgentState, it: Intention): string | null {
  const sc = (st as WithS).scuola
  const e = sc?.esercizio
  if (!e || e.day !== st.day) return null
  Object.assign(it.targets, e.targets)
  it.tools = e.tools
  if (e.register) it.register = e.register
  it.why += `; esercizio di ${e.tema}: ${e.vincoli}`
  return `${e.tema}: ${e.vincoli}`
}

export function nuovoId() { return uid() }
void weighted
