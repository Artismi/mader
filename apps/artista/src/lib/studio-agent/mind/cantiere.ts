/**
 * Il cantiere: un lavoro lungo che si costruisce su se stesso.
 *
 * Un cantiere ha un tema (il concetto su cui ha letto di più) e una forma:
 * un libro, un saggio o una presentazione. È fatto di capitoli (concetti
 * legati al tema nell'atlante) e i capitoli di paragrafi. Ogni giorno lavora:
 *  - ESPONE: compone un paragrafo dalle frasi lette (TextRank: sceglie le frasi
 *    centrali, quelle che condividono più concetti con le altre), le lega con
 *    relazioni retoriche (elaborazione, contrasto, causa: Rhetorical Structure
 *    Theory) e chiude con la sua tesi;
 *  - OBIETTA: trova una frase che contraddice quello che ha scritto e la mette
 *    accanto, segnando il paragrafo come contestato;
 *  - RIVEDE: riscrive un paragrafo vecchio o contestato; la versione di prima resta;
 *  - APRE un capitolo nuovo, su un concetto che nell'atlante sta spesso col tema;
 *  - SI SPOSTA: se un capitolo è cresciuto più del tema, il cantiere cambia nome;
 *  - CHIUDE: quando ha abbastanza, scrive la conclusione e una domanda aperta,
 *    da cui nascerà il cantiere successivo.
 * Il cantiere si esporta come testo (markdown) e diventa pagine e diapositive.
 */
import type { AgentState } from '../core/types'
import { pick, uid, weighted, type Rnd } from '../core/rng'
import { sentences } from '../reader/tokenize'
import { ensureAtlante, type Tesi } from './atlante'
import { isNome, realizza } from '../voice/lingua'
import { scriviObiezione, scriviParagrafo } from '../voice/scrittura'
import { generatoreById } from './officina'

export type FormaCantiere = 'libro' | 'saggio' | 'presentazione'
export interface Versione { day: number; testo: string; perche: string }
export interface Paragrafo { id: string; tipo: 'esposizione' | 'tesi' | 'obiezione' | 'revisione' | 'conclusione'; testo: string; punti?: string[]; fonti: string[]; day: number; versioni: Versione[]; contestato?: boolean }
export interface Capitolo { id: string; concetto: string; titolo: string; paragrafi: Paragrafo[]; nato: number }
export interface Cantiere { usate?: string[]; fattiUsati?: string[]; id: string; titolo: string; tema: string; forma: FormaCantiere; nato: number; chiuso?: number; capitoli: Capitolo[]; diario: { day: number; nota: string }[]; domanda?: string; da?: string }
export interface Lavoro { cantiere: Cantiere; capitolo: Capitolo; paragrafo: Paragrafo; azione: string }

type WithC = AgentState & { cantieri?: Cantiere[] }
export const getCantieri = (st: AgentState) => (st as WithC).cantieri ?? []
const aperto = (st: AgentState) => getCantieri(st).find(c => !c.chiuso)

const VUOTE = new Set(['cosa', 'cose', 'modo', 'parte', 'fatto', 'volta', 'tipo', 'caso', 'anno', 'anni', 'nome', 'numero', 'serie'])
const nomiIn = (s: string) => [...new Set(s.toLowerCase().split(/[^a-zàèéìòù']+/).filter(w => w.length > 3 && !VUOTE.has(w) && isNome(w)))]
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// ─── frasi dalle letture: TextRank leggero ──────────────────────────────────
interface Cand { t: string; fonte: string; nomi: string[]; peso: number }
function candidate(st: AgentState, concetto: string, altri: string[]): Cand[] {
  const out: Cand[] = []
  const seen = new Set<string>()
  for (const rd of st.readings) for (const s of sentences(rd.text).slice(0, 120)) {
    if (s.length < 50 || s.length > 260 || seen.has(s) || /\d{4,}|[{}<>=|#*`]/.test(s)) continue
    const nomi = nomiIn(s)
    if (!nomi.includes(concetto)) continue
    seen.add(s)
    out.push({ t: s.trim(), fonte: rd.title, nomi, peso: 0 })
  }
  // grafo: due frasi sono legate quanti più concetti condividono; il peso è la centralità (poche iterazioni di PageRank)
  const n = out.length
  if (!n) return out
  const W = out.map(a => out.map(b => (a === b ? 0 : a.nomi.filter(x => b.nomi.includes(x)).length)))
  let pr = new Array(n).fill(1 / n)
  for (let it = 0; it < 12; it++) {
    pr = pr.map((_, i) => 0.15 / n + 0.85 * out.reduce((acc, _b, j) => { const tot = W[j].reduce((a, b) => a + b, 0); return acc + (tot ? (W[j][i] / tot) * pr[j] : 0) }, 0))
  }
  out.forEach((c, i) => { c.peso = pr[i] + c.nomi.filter(x => altri.includes(x)).length * 0.02 })
  return out.sort((a, b) => b.peso - a.peso)
}

const RX_CONTRO = /\b(ma|però|tuttavia|invece|contro|non|senza)\b/i
const RX_CAUSA = /\b(perché|quindi|per questo|causa|porta|produce|genera|nasce|deriva)\b/i
/** un paragrafo con struttura retorica: nucleo, elaborazione, contrasto o causa */
function componi(r: Rnd, cs: Cand[], gia: Set<string>, n: number): { testo: string; fonti: string[]; usate: string[] } {
  const scelte: Cand[] = []
  for (const c of cs) {
    if (gia.has(c.t)) continue
    if (scelte.some(s => s.t.slice(0, 40) === c.t.slice(0, 40))) continue
    scelte.push(c)
    if (scelte.length >= n) break
  }
  if (!scelte.length) return { testo: '', fonti: [], usate: [] }
  const parti: string[] = []
  scelte.forEach((c, i) => {
    let t = c.t.replace(/\s+/g, ' ').replace(/^[«"]|[»"]$/g, '')
    if (!/[.!?]$/.test(t)) t += '.'
    if (i === 0) parti.push(`Secondo «${c.fonte}», ${t.charAt(0).toLowerCase()}${t.slice(1)}`)
    else if (RX_CONTRO.test(t.slice(0, 30))) parti.push(`Eppure ${t.charAt(0).toLowerCase()}${t.slice(1)}`)
    else if (RX_CAUSA.test(t)) parti.push(`Ne viene che ${t.charAt(0).toLowerCase()}${t.slice(1)}`)
    else parti.push(pick(r, ['Inoltre', 'E ancora:', 'In più,', 'Accanto a questo,']) + ' ' + t.charAt(0).toLowerCase() + t.slice(1))
  })
  return { testo: parti.join(' '), fonti: [...new Set(scelte.map(c => c.fonte))], usate: scelte.map(c => c.t) }
}

function segnoTesto(st: AgentState, w: string): string | undefined {
  const m = ensureAtlante(st).concetti[w]?.motivo
  if (!m) return undefined
  if (m.forma === 'codice') { const g = generatoreById(st, m.gen); return g ? (g.tipo === 'tartaruga' ? 'un segno che ho scritto io in codice, una traccia che si ripete e si ramifica' : 'una formula mia che diventa una superficie') : undefined }
  if (m.forma === 'ricetta') return `un disegno che torna ogni volta uguale, il suo`
  const tr = { pieno: 'pieno', righe: 'a righe', punti: 'a punti', tratteggio: 'tratteggiato', contorno: 'solo il contorno' }[m.trama]
  return `${realizza('{ind:f}', { f: m.forma })} ${tr}${m.colore === 'acc' ? ', nel colore acceso' : ''}`
}

function suaTesi(st: AgentState, concetto: string): Tesi | undefined {
  const T = ensureAtlante(st).tesi.filter(t => t.a === concetto || t.b === concetto)
  return T[T.length - 1]
}

// ─── un giorno di lavoro ────────────────────────────────────────────────────
export function lavora(st: AgentState, r: Rnd, log: (s: string) => void): Lavoro | null {
  const A = ensureAtlante(st)
  ;(st as WithC).cantieri ??= []
  let C = aperto(st)
  if (!C) {
    const ricchi = Object.values(A.concetti).filter(c => c.frasi >= 2).sort((a, b) => b.frasi + b.usi * 2 - (a.frasi + a.usi * 2))
    if (ricchi.length < 3) return null
    const prev = getCantieri(st).slice(-1)[0]
    const tema = prev?.domanda && A.concetti[prev.tema] ? ricchi.find(c => c.word !== prev.tema && prev.capitoli.some(k => k.concetto === c.word))?.word ?? ricchi[0].word : ricchi[0].word
    const forma: FormaCantiere = weighted(r, ['libro', 'saggio', 'presentazione'] as FormaCantiere[], f => (f === 'libro' ? 2 : 1), 1)
    const titolo = cap1(realizza(pick(r, ['{su:t}', 'quello che so {di:t}', '{det:t}, da vicino', 'intorno {a:t}', '{det:t} e il resto']), { t: tema }))
    C = { id: uid(), titolo, tema, forma, nato: st.day, capitoli: [], diario: [], da: prev?.titolo }
    ;(st as WithC).cantieri = [...getCantieri(st).filter(x => x.id !== C!.id), C]
    C.diario.push({ day: st.day, nota: `apro ${forma === 'presentazione' ? 'una' : 'un'} ${forma}: «${titolo}»${prev ? `, dopo «${prev.titolo}»` : ''}` })
    log(`Cantiere: apro ${forma === 'presentazione' ? 'una' : 'un'} ${forma}, «${titolo}».`)
  }
  const target = C.forma === 'presentazione' ? 7 : C.forma === 'saggio' ? 4 : 8
  const usate = new Set(C.usate ?? [])
  const capitoloNuovo = (concetto: string) => {
    const titolo = cap1(realizza(pick(r, ['{det:c}', '{su:c}', 'dove entra {det:c}', '{det:c}, ancora']), { c: concetto }))
    const k: Capitolo = { id: uid(), concetto, titolo, paragrafi: [], nato: st.day }
    C!.capitoli.push(k)
    C!.diario.push({ day: st.day, nota: `capitolo ${C!.capitoli.length}: ${titolo}` })
    return k
  }
  if (!C.capitoli.length) capitoloNuovo(C.tema)
  // concetti che stanno spesso col tema: candidati a capitolo
  const vicini = new Map<string, number>()
  for (const f of A.frasi) if (f.nomi.includes(C.tema)) for (const w of f.nomi) if (w !== C.tema) vicini.set(w, (vicini.get(w) ?? 0) + 1)
  const liberi = [...vicini.entries()].filter(([w]) => !C!.capitoli.some(k => k.concetto === w)).sort((a, b) => b[1] - a[1])
  const pieni = C.capitoli.every(k => k.paragrafi.length >= (C!.forma === 'presentazione' ? 1 : 2))
  // l'azione di oggi
  const contestati = C.capitoli.flatMap(k => k.paragrafi.filter(p => p.contestato).map(p => ({ k, p })))
  const vecchi = C.capitoli.flatMap(k => k.paragrafi.filter(p => p.tipo === 'esposizione' && st.day - p.day > 6 && p.versioni.length < 3).map(p => ({ k, p })))
  const pesi: Record<string, number> = {
    esponi: 3 / (1 + Math.max(0, Math.min(...C.capitoli.map(k => k.paragrafi.length)) - 1)), obietta: 1.2, rivedi: contestati.length ? 2.5 : vecchi.length ? 1 : 0,
    apri: liberi.length && C.capitoli.length < target ? (pieni ? 3 : 0.6) : 0,
    chiudi: C.capitoli.length >= target && pieni ? 6 : 0,
  }
  const azione = weighted(r, Object.keys(pesi), k => pesi[k] + 1e-6, 0.8)
  const corrente = C.capitoli.slice().sort((a, b) => a.paragrafi.length - b.paragrafi.length)[0]

  if (azione === 'apri') {
    const k = capitoloNuovo(liberi[0][0])
    return esponi(st, r, C, k, usate, log, 'apre un capitolo') ?? null
  }
  if (azione === 'rivedi') {
    const { k, p } = contestati[0] ?? pick(r, vecchi)
    const t = suaTesi(st, k.concetto)
    const nuovo = scriviParagrafo(st, r, k.concetto, { tesi: t?.frase, contro: p.contestato, altri: C.capitoli.map(x => x.concetto).filter(x => x !== k.concetto), usati: new Set(C.fattiUsati ?? []) })
    C.fattiUsati = [...(C.fattiUsati ?? []), ...nuovo.chiavi].slice(-600)
    const testo = `${pick(r, ['Riscrivo questa parte.', 'Torno su quello che avevo scritto: non mi convince più.', 'Lo dico di nuovo, meglio.'])} ${nuovo.testo}`
    p.versioni.push({ day: p.day, testo: p.testo, perche: p.contestato ? 'era contestato' : 'era vecchio' })
    p.testo = testo; p.day = st.day; p.contestato = false; p.tipo = 'revisione'; p.fonti = [...new Set([...p.fonti, ...nuovo.fonti])]
    C.diario.push({ day: st.day, nota: `rivedo un paragrafo di «${k.titolo}»` })
    log(`Cantiere: rivedo un paragrafo di «${k.titolo}».`)
    deforma(st, C, log)
    return { cantiere: C, capitolo: k, paragrafo: p, azione: 'rivede' }
  }
  if (azione === 'obietta') {
    const k = corrente
    const t = suaTesi(st, k.concetto)
    const ob = scriviObiezione(st, r, k.concetto, t?.frase)
    if (ob && k.paragrafi.length) {
      const bersaglio = k.paragrafi[k.paragrafi.length - 1]
      bersaglio.contestato = true
      const p: Paragrafo = { id: uid(), tipo: 'obiezione', testo: ob.testo, fonti: [ob.fonte], day: st.day, versioni: [] }
      k.paragrafi.push(p)
      C.diario.push({ day: st.day, nota: `obiezione in «${k.titolo}»` })
      log(`Cantiere: un'obiezione in «${k.titolo}».`)
      return { cantiere: C, capitolo: k, paragrafo: p, azione: 'obietta' }
    }
  }
  if (azione === 'chiudi') {
    const tesi = C.capitoli.map(k => suaTesi(st, k.concetto)).filter(Boolean) as Tesi[]
    const fili = tesi.slice(0, 5).map(t => t.frase)
    const domanda = realizza(pick(r, ['e se {det:a} non fosse il centro, ma {det:b}?', 'che cosa resta {di:a} senza {det:b}?', 'chi decide dove finisce {det:a}?']), { a: C.tema, b: C.capitoli[C.capitoli.length - 1].concetto })
    const p: Paragrafo = { id: uid(), tipo: 'conclusione', testo: `Alla fine di questo lavoro tengo insieme alcune cose: ${fili.join('; ') || 'poche certezze'}. Non tutte reggono allo stesso modo, e alcune le ho riscritte strada facendo. Resta una domanda: ${domanda}`, fonti: [], day: st.day, versioni: [] }
    const k = C.capitoli[C.capitoli.length - 1]
    k.paragrafi.push(p)
    C.chiuso = st.day; C.domanda = domanda
    C.diario.push({ day: st.day, nota: `chiudo. Domanda aperta: ${domanda}` })
    log(`Cantiere: chiudo «${C.titolo}» (${C.capitoli.length} capitoli). Resta: ${domanda}`)
    return { cantiere: C, capitolo: k, paragrafo: p, azione: 'chiude' }
  }
  const fatto = esponi(st, r, C, corrente, usate, log, 'espone')
  if (fatto) return fatto
  // niente di nuovo da dire qui: apre un capitolo nuovo, se può
  if (liberi.length && C.capitoli.length < target) return esponi(st, r, C, capitoloNuovo(liberi[0][0]), usate, log, 'apre un capitolo')
  return null
}

function esponi(st: AgentState, r: Rnd, C: Cantiere, k: Capitolo, usate: Set<string>, log: (s: string) => void, azione: string): Lavoro | null {
  void usate
  const altri = C.capitoli.map(x => x.concetto).filter(x => x !== k.concetto)
  const t = suaTesi(st, k.concetto)
  const precedente = C.capitoli[C.capitoli.indexOf(k) - 1]
  const tp = precedente ? suaTesi(st, precedente.concetto) : undefined
  const w = scriviParagrafo(st, r, k.concetto, { tesi: t?.frase, segno: r() < 0.6 ? segnoTesto(st, k.concetto) : undefined, altri, prima: k.paragrafi.length === 0 ? tp?.frase : undefined, usati: new Set(C.fattiUsati ?? []), dedotte: new Set((ensureAtlante(st).deduzioni ?? []).map(x => x.testo)) })
  if (!w.fatti && (k.paragrafi.length || !t)) return null
  if (w.dedotta) { const A = ensureAtlante(st); A.deduzioni = [...(A.deduzioni ?? []), { day: st.day, a: w.dedotta.a, b: w.dedotta.b, tipo: w.dedotta.tipo, testo: w.dedotta.testo, premesse: w.dedotta.premesse }].slice(-100); log(`Deduco: ${w.dedotta.testo}.`) }
  C.fattiUsati = [...(C.fattiUsati ?? []), ...w.chiavi].slice(-600)
  const p: Paragrafo = { id: uid(), tipo: w.fatti ? 'esposizione' : 'tesi', testo: w.testo, punti: C.forma === 'presentazione' ? w.punti.slice(0, 4) : undefined, fonti: w.fonti, day: st.day, versioni: [] }
  k.paragrafi.push(p)
  log(`Cantiere: scrivo in «${k.titolo}» (${k.paragrafi.length}° paragrafo, ${w.fatti} fatti riscritti${w.fonti.length ? ` da ${w.fonti.join(', ')}` : ''}).`)
  deforma(st, C, log)
  return { cantiere: C, capitolo: k, paragrafo: p, azione }
}

/** il cantiere si sposta: se un capitolo pesa più del tema, il titolo cambia */
function deforma(st: AgentState, C: Cantiere, log: (s: string) => void) {
  const peso = (k: Capitolo) => k.paragrafi.reduce((a, p) => a + p.testo.length, 0)
  const tema = C.capitoli.find(k => k.concetto === C.tema)
  const big = C.capitoli.slice().sort((a, b) => peso(b) - peso(a))[0]
  if (tema && big && big !== tema && peso(big) > peso(tema) * 1.8 && C.capitoli.length >= 3) {
    const vecchio = C.titolo
    C.titolo = cap1(realizza('{det:b}, partendo {da:a}', { a: C.tema, b: big.concetto }))
    C.tema = big.concetto
    C.diario.push({ day: st.day, nota: `il cantiere si sposta: «${vecchio}» diventa «${C.titolo}»` })
    log(`Cantiere: si sposta, ora è «${C.titolo}».`)
  }
}

/** il cantiere come testo da scaricare */
export function esporta(C: Cantiere): string {
  const out = [`# ${C.titolo}`, `_${C.forma}, dal giorno ${C.nato}${C.chiuso ? ` al giorno ${C.chiuso}` : ' (in corso)'}${C.da ? ` — viene da «${C.da}»` : ''}_`, '']
  C.capitoli.forEach((k, i) => {
    out.push(`## ${i + 1}. ${k.titolo}`, '')
    for (const p of k.paragrafi) {
      if (p.punti?.length) out.push(...p.punti.map(x => `- ${x}`), '')
      out.push(p.testo + (p.contestato ? ' _[contestato]_' : ''), '')
      for (const v of p.versioni) out.push(`> ~~${v.testo}~~ _(giorno ${v.day}, ${v.perche})_`, '')
      if (p.fonti.length) out.push(`<small>Fonti: ${p.fonti.join('; ')}</small>`, '')
    }
  })
  if (C.domanda) out.push('---', `**Domanda aperta:** ${C.domanda}`, '')
  out.push('---', '### Diario del cantiere', ...C.diario.map(d => `- giorno ${d.day}: ${d.nota}`))
  return out.join('\n')
}
