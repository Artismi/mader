/**
 * La scrittura: dire con parole sue quello che ha letto.
 *
 * Non copia frasi. Le smonta in FATTI (chi, fa cosa, a chi, con quali complementi,
 * negato o no, da quale fonte) e poi scrive da capo, come un sistema di generazione
 * del linguaggio a pipeline (Reiter & Dale):
 *  1. SELEZIONE: i fatti sul concetto, i più ricorrenti tra le fonti;
 *  2. PIANO DEL DISCORSO: definizione → fatti raggruppati → sintesi → immagine → presa
 *     di posizione → domanda, legati da relazioni retoriche (causa, contrasto, elaborazione);
 *  3. MICROPIANIFICAZIONE: aggrega i fatti con lo stesso soggetto o lo stesso oggetto,
 *     sceglie la costruzione (attiva, passiva, scissa, domanda-risposta, generalizzazione
 *     con l'iperonimo), varia il lessico con sinonimi, usa riferimenti all'indietro;
 *  4. REALIZZAZIONE: articoli, preposizioni articolate, accordi (lingua.ts).
 * Le fonti restano nominate, ma le frasi sono sue.
 */
import type { AgentState } from '../core/types'
import { pick, type Rnd } from '../core/rng'
import { sentences } from '../reader/tokenize'
import { describe, iperonimo, sinonimi, verbi, conceptsReady, type Verbo } from '../reader/concepts'
import { proposizioni } from '../reader/frasi'
import { pensa, GENERICI } from '../mind/pensiero'
import { dici, trovaEsempio } from '../mind/retorica'
import { concludi, type TipoD } from './conclusioni'
import { singolare } from './lingua'
import { accorda, art, concorda, genere, isNome, isNomeQ, osservaGenere, realizza, nomeComune } from './lingua'

export interface Fatto { s: string; v: Verbo; forma: string; o?: string; compl: { prep: string; n: string; pre?: string; sup?: string }[]; neg: boolean; rifl: boolean; fonte: string
  /** le parole com'erano nella fonte: il soggetto intero, il gruppo del verbo, quello che segue (in ordine) */
  parole?: { s: string; v: string; resto: string[]; proprio: boolean } }

const ART = new Set(['il', 'lo', 'la', 'i', 'gli', 'le', "l'", 'un', 'uno', 'una', "un'"])
const PREP: Record<string, string> = {
  di: 'di', del: 'di', dello: 'di', della: 'di', dei: 'di', degli: 'di', delle: 'di', "dell'": 'di',
  a: 'a', al: 'a', allo: 'a', alla: 'a', ai: 'a', agli: 'a', alle: 'a', "all'": 'a',
  da: 'da', dal: 'da', dallo: 'da', dalla: 'da', dai: 'da', dagli: 'da', dalle: 'da', "dall'": 'da',
  come: 'come', intorno: 'intorno', vicino: 'vicino', davanti: 'davanti', oltre: 'oltre', lontano: 'lontano',
  in: 'in', nel: 'in', nello: 'in', nella: 'in', nei: 'in', negli: 'in', nelle: 'in', "nell'": 'in',
  su: 'su', sul: 'su', sullo: 'su', sulla: 'su', sui: 'su', sugli: 'su', sulle: 'su', "sull'": 'su',
  con: 'con', per: 'per', tra: 'tra', fra: 'tra', verso: 'verso', contro: 'contro', senza: 'senza', sotto: 'sotto', dentro: 'dentro', attraverso: 'attraverso',
}
const VUOTI = new Set(['migliaia', 'centinaia', 'milioni', 'decine', 'cosa', 'cose', 'modo', 'parte', 'fatto', 'volta', 'tipo', 'caso', 'anno', 'anni', 'numero', 'serie'])
const nome = (w: string) => w.length > 2 && !VUOTI.has(w) && isNomeQ(w)

// ─── capire, non copiare ────────────────────────────────────────────────────
// Dalla frase letta tiene solo lo scheletro: chi, che gesto (il verbo all'infinito), su che cosa.
// Le parole dell'autore restano nella fonte. I nomi propri diventano quello che sono
// («Roma» → città, «il Gran Sasso» → massiccio): lo impara dalle letture stesse («X è un…»)
// o dal lessico; se non sa che cosa sono, li lascia cadere (prende poco, e solo quello che capisce).
const CATEG = new Map<string, Map<string, string>>() // nome → (lettura → categoria)
let CATEG_K = ''
export function imparaCategorie(st: AgentState) {
  const k = `${st.readings.length}|${st.readings[st.readings.length - 1]?.title ?? ''}`
  if (k === CATEG_K) return
  CATEG_K = k
  for (const rd of st.readings.slice(-40)) for (const fr of sentences(rd.text).slice(0, 60)) for (const p of proposizioni(fr, '')) {
    if (p.verbo.lemma === 'essere' && p.sogg.proprio && p.ogg && !p.ogg.proprio) { const m = CATEG.get(p.sogg.testa.toLowerCase()) ?? new Map(); if (!m.has(rd.title)) m.set(rd.title, singolare(p.ogg.testa.toLowerCase())); CATEG.set(p.sogg.testa.toLowerCase(), m) }
  }
}
/** la categoria di un nome proprio: solo quella imparata dalle letture (il lessico generico sbaglia: «Roma» → «national capital») */
// la categoria imparata nella stessa lettura; da un'altra solo se tutte le letture dicono la stessa (il fiume Fino non è il film «Fino a prova contraria»)
const categoria = (nome: string, fonte: string) => { const m = CATEG.get(nome.toLowerCase()); if (!m) return null; const c = m.get(fonte) ?? (new Set(m.values()).size === 1 ? [...m.values()][0] : null); return c && /^[a-zàèéìòù]+$/.test(c) && nomeComune(c) ? c : null }

/** smonta una frase in fatti: lo scheletro di quello che dice, con parole sue (teste, infiniti, categorie) */
export function fattiDi(frase: string, fonte: string): Fatto[] {
  const V = verbi()
  const argomento = fonte.replace(/\s*\(.*\)\s*$/, '').replace(/^.*\/\s*/, '')
  const out: Fatto[] = []
  for (const p of proposizioni(frase, argomento)) {
    const v = V.get(p.verbo.lemma)
    if (!v) continue // un verbo che non conosce: non lo capisce, non lo dice
    // una testa comune deve essere un nome del dizionario (non «lascia», che è un verbo)
    const testa = (g: { testa: string; proprio: boolean }) => { if (g.proprio) return categoria(g.testa, fonte); const w = singolare(g.testa.toLowerCase()); return nomeComune(w) ? w : null }
    // il passivo con l'agente si gira all'attivo («fu fondata da Foschi» → Foschi fonda); senza agente si lascia
    let sogg: { testa: string; proprio: boolean } | undefined = p.sogg, ogg: { testa: string; proprio: boolean } | undefined = p.ogg
    let compl = p.compl
    // il passivo con l'agente si gira all'attivo, ma solo se il participio è quello regolare di quel verbo («composta» non è di «compostare»)
    if (p.verbo.passivo) {
      const part = p.verbo.sup.split(' ').pop() ?? '', base = v.con === 'are' ? v.stem + 'at' : v.con === 'ere' ? v.stem + 'ut' : v.con === 'ire' ? v.stem + 'it' : ''
      if (!base || part.slice(0, -1) !== base) continue
      const ag = compl.find(k => k.prep === 'da'); if (!ag) continue; ogg = p.sogg; sogg = ag.g; compl = compl.filter(k => k !== ag) }
    const s = testa(sogg)
    const o = ogg ? testa(ogg) : undefined
    if (!s || (ogg && !o) || s === o) continue
    const cs = compl.map(k => ({ prep: k.prep, n: testa(k.g) ?? '' })).filter(k => k.n)
    if (!o && !cs.length) continue
    out.push({ s, v, forma: p.verbo.passivo ? v.inf : p.verbo.forma, o: o ?? undefined, neg: p.verbo.neg, rifl: p.verbo.rifl && !p.verbo.passivo, fonte, compl: cs.slice(0, 1).map(k => ({ ...k, sup: k.n })) })
  }
  return out.slice(0, 2)
}

const COPULA = /^(avere|potere|dovere|volere|diventare|essere|sembrare|restare|rimanere|nascere|apparire|stare|crescere|morire|vivere|andare|venire|tornare|cadere)$/
const RELATIVI = /^(chi|che|cui|il quale|la quale)$/
function fattiClausola(frase: string, fonte: string): Fatto[] {
  const V = verbi()
  const toks = frase.toLowerCase().replace(/[«»"()]/g, ' ').replace(/(\w)'(\w)/g, "$1' $2").split(/[\s,;:.!?]+/).filter(Boolean)
  const out: Fatto[] = []
  let soggetto: string | null = null
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i]
    let pi = i - 1
    while (pi >= 0 && ART.has(toks[pi])) pi--
    const prev = toks[i - 1]
    const prevW = toks[pi]
    if (nome(w) && ART.has(prev)) osservaGenere(w, /^(la|le|una|un')$/.test(prev) ? 'f' : 'm')
    // parola che può essere nome o verbo («porta», «lotta», «lavoro»): è verbo se c'è già un soggetto,
    // non segue articolo o preposizione, e dopo viene un articolo, una preposizione o un nome
    const nx = toks[i + 1]
    const ambiguaVerbo = V.has(w) && soggetto && !ART.has(prev) && !(prev && PREP[prev]) && !!nx && (ART.has(nx) || !!PREP[nx] || nome(nx))
    if (nome(w) && (!V.has(w) || ART.has(prev)) && !ambiguaVerbo) {
      if (!(prevW && PREP[prevW] && soggetto)) soggetto = w
      continue
    }
    if (false && (!V.has(w) || ART.has(prev))) {
      // un nome dopo una preposizione è un complemento: il soggetto resta quello di prima
      if (!(prev && PREP[prev] && soggetto)) soggetto = w
      continue
    }
    const v = V.get(w)
    if (RELATIVI.test(w) && !soggetto) return []
    if (!v || ART.has(prev) || (prev && PREP[prev]) || !soggetto) continue
    if (/(ato|uto|ito|ata|uta|ita|ate|ati|ute|uti|ite|iti)$/.test(w) && !/^(è|sono|ha|hanno|viene|vengono)$/.test(prev ?? '')) continue
    const neg = prev === 'non' || toks[i - 2] === 'non'
    const rifl = prev === 'si' || toks[i - 2] === 'si'
    // oggetto e complementi dopo il verbo, fino alla prossima congiunzione
    let o: string | undefined
    const compl: Fatto['compl'] = []
    let prep: string | null = null
    for (let j = i + 1; j < Math.min(toks.length, i + 12); j++) {
      const t = toks[j]
      if (/^(ma|che|quando|perché|mentre|se|dove|però|quindi|o|oppure)$/.test(t) && (o || compl.length)) break
      if (V.has(t) && !isNome(t)) break
      if (t === 'e' && toks.slice(j + 1, j + 4).some(x => V.has(x) && !isNomeQ(x))) break
      if (PREP[t]) { prep = prep && ['intorno', 'vicino', 'davanti', 'oltre', 'lontano'].includes(prep) ? `${prep}+${PREP[t]}` : PREP[t]; continue }
      if (ART.has(t)) continue
      if (nome(t) && ART.has(toks[j - 1])) osservaGenere(t, /^(la|le|una|un')$/.test(toks[j - 1]) ? 'f' : 'm')
      if (nome(t) && (!V.has(t) || prep || ART.has(toks[j - 1]))) {
        if (prep) { const [pre, pp] = prep.includes('+') ? prep.split('+') : [undefined, prep]; compl.push({ prep: pp, n: t, pre }); prep = null } else if (!o) o = t
      }
    }
    if (rifl) o = undefined
    if (!o && !compl.length) continue
    out.push({ s: singolare(soggetto), v, forma: w, o: o && singolare(o), compl: compl.slice(0, 2).map(k => ({ ...k, sup: k.n, n: singolare(k.n) })), neg, rifl, fonte })
    break
  }
  return out
}

/** i fatti su un concetto, da tutte le letture in memoria */
export function fattiSu(st: AgentState, concetto: string, max = 40): Fatto[] {
  const k = `${concetto}|${st.readings.length}|${st.readings[st.readings.length - 1]?.title ?? ''}`
  const hit = CACHE.get(k)
  if (hit) return hit
  const res = fattiSuRaw(st, concetto, max)
  if (CACHE.size > 300) CACHE.clear()
  CACHE.set(k, res)
  return res
}
const CACHE = new Map<string, Fatto[]>()
function fattiSuRaw(st: AgentState, concetto: string, max: number): Fatto[] {
  if (!conceptsReady()) return []
  imparaCategorie(st)
  const out: Fatto[] = []
  const seen = new Set<string>()
  for (const rd of st.readings) for (const s of sentences(rd.text).slice(0, 150)) {
    if (s.length > 300 || !s.toLowerCase().includes(concetto.slice(0, Math.max(4, concetto.length - 2)))) continue
    for (const f of fattiDi(s, rd.title)) {
      if (f.s !== concetto && f.o !== concetto && !f.compl.some(c => c.n === concetto)) continue
      const k = `${f.neg}|${f.s}|${f.v.inf}|${f.o}|${f.fonte}`
      if (seen.has(k)) continue
      seen.add(k); out.push(f)
      if (out.length >= max) return out
    }
  }
  return out
}

// ─── coniugare (solo dove è regolare) ──────────────────────────────────────
const part = (v: Verbo) => v.irr ? v.irr.part ?? null : (v.con === 'are' ? v.stem + 'ato' : v.con === 'ire' ? v.stem + 'ito' : null)
const pres3p = (v: Verbo, forma: string) => v.irr ? v.irr.p : (v.con === 'are' ? v.stem + 'ano' : v.con === 'rre' ? v.stem + 'cono' : /isc/.test(forma) ? v.stem + 'iscono' : v.stem + 'ono')
const coniuga = (v: Verbo, forma: string, sogg: string) => (genere(sogg).n === 'p' ? pres3p(v, forma) : pres3(v, forma))
const pres3 = (v: Verbo, forma: string) => v.irr ? v.irr.s : (v.con === 'are' ? v.stem + 'a' : v.con === 'rre' ? v.stem + 'ce' : /isc/.test(forma) ? v.stem + 'isce' : v.stem + 'e')
const infinito = (v: Verbo, rifl: boolean) => (rifl ? v.inf.replace(/e$/, '') + 'si' : v.inf)

const d = (x: string) => art(x, 'det')
function complemento(f: Fatto): string {
  const k0 = f.compl.find(k => !(k.prep === 'di' && COPULA.test(f.v.inf)))
  if (!k0) return ''
  const n0 = k0.sup ?? k0.n
  const base = ['di', 'a', 'da', 'in', 'su'].includes(k0.prep) ? art(n0, k0.prep as 'di') : `${k0.prep} ${d(n0)}`
  return ' ' + (k0.pre ? `${k0.pre} ${base}` : base)
}
const varia = (r: Rnd, w: string, usate: Set<string>) => {
  if (usate.has(w) && r() < 0.5) { const s = sinonimi(w).filter(isNome); if (s.length) return pick(r, s) }
  usate.add(w); return w
}

/** riscrive un fatto in una costruzione scelta */
function riscrivi(r: Rnd, f: Fatto, usate: Set<string>, forza?: 'attiva' | 'passiva' | 'scissa' | 'domanda' | 'generale'): string {
  const S = varia(r, f.s, usate)
  const O = f.o ? varia(r, f.o, usate) : null
  const v3 = coniuga(f.v, f.forma, S)
  const non = f.neg ? 'non ' : ''
  const si = f.rifl ? 'si ' : ''
  const comp = complemento(f)
  const p = part(f.v)
  const trans = !!O && !COPULA.test(f.v.inf)
  const h = O ? iperonimo(O) : null
  const scelte = ['attiva', 'attiva', 'scissa', ...(trans ? ['domanda'] : []), ...(trans && p && !f.rifl ? ['passiva', 'passiva'] : []), ...(trans && h && h !== O && isNome(h) && sinonimi(O!).length && r() < 0.3 ? ['generale'] : [])]
  const k = forza && scelte.includes(forza) ? forza : pick(r, scelte)
  switch (k) {
    case 'passiva': return `${d(O!)} ${non}${genere(O!).n === 'p' ? 'vengono' : 'viene'} ${accorda(p!, O!)} ${art(S, 'da')}${comp}`
    case 'scissa': return `${genere(S).n === 'p' ? 'sono' : 'è'} ${d(S)} a ${non}${infinito(f.v, f.rifl)}${O ? ' ' + d(O) : ''}${comp}`
    case 'domanda': return `che cosa ${non}${si}${v3} ${d(S)}? ${O ? d(O) : (f.compl[0]?.n ?? '')}${O && comp ? ',' + comp : ''}`
    case 'generale': { const h = iperonimo(O!)!; return `${d(S)} ${non}${si}${v3} ${art(h, 'ind')}: ${d(O!)}` }
    default: return `${d(S)} ${non}${si}${v3}${O ? ' ' + d(O) : ''}${comp}`
  }
}

/** aggrega: più fatti con lo stesso soggetto diventano una frase sola */
function aggrega(r: Rnd, fs: Fatto[], usate: Set<string>): string[] {
  const perS = new Map<string, Fatto[]>()
  for (const f of fs) perS.set(f.s, [...(perS.get(f.s) ?? []), f])
  const out: string[] = []
  for (const [s, g] of perS) {
    if (g.length >= 2) {
      const azioni = g.slice(0, 3).map(f => `${f.neg ? 'non ' : ''}${f.rifl ? 'si ' : ''}${coniuga(f.v, f.forma, s)}${f.o ? ' ' + d(f.o) : ''}${complemento(f)}`)
      out.push(`${d(varia(r, s, usate))} ${azioni.slice(0, -1).join(', ')} e ${azioni[azioni.length - 1]}`)
    } else out.push(riscrivi(r, g[0], usate))
  }
  return out
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const fine = (s: string) => (/[.?!:]$/.test(s) ? s : s + '.')

export interface Contesto { tesi?: string; prima?: string; segno?: string; altri?: string[]; contro?: boolean; usati?: Set<string>; dedotte?: Set<string> }
export const chiaveFatto = (f: Fatto) => `${f.neg ? "!" : ""}${f.s}|${f.v.inf}|${f.o ?? ""}|${f.compl[0]?.n ?? ""}|${f.fonte}`
const pulisciTesi = (t: string) => t.replace(/^(ancora|forse|e poi|e invece|e)\s*:?\s+/i, '')

/** un paragrafo scritto da lui sul concetto */
export function scriviParagrafo(st: AgentState, r: Rnd, c: string, ctx: Contesto = {}): { testo: string; fonti: string[]; punti: string[]; fatti: number; chiavi: string[]; dedotta?: Deduzione } {
  const usate = new Set<string>()
  const fs = fattiSu(st, c).filter(f => !ctx.usati?.has(chiaveFatto(f))).sort(() => r() - 0.5)
  const frasi: string[] = []
  const punti: string[] = []
  let dedotta: Deduzione | undefined
  // 1. da dove parte: la definizione, detta a modo suo
  const ctxSet = new Set([...fs.flatMap(f => [f.s, f.o, ...f.compl.map(z => z.n)]).filter(Boolean) as string[], ...(ctx.altri ?? [])])
  const D = describe(c, ctxSet)
  if (D && D.sicuro && r() < 0.45) {
    const h = D.text.match(/un tipo di ([^;(]+)/)?.[1]?.split(',')[0]?.trim()
    const ha = D.text.match(/ha ([^;(]+)/)?.[1]?.split(',')[0]?.trim()
    const contr = D.text.match(/contrario di ([^;(]+)/)?.[1]?.split(',')[0]?.trim()
    const pezzi = [h && h !== c ? `è una specie di ${h}` : '', ha && ha !== c ? `ha dentro ${art(ha, 'ind')}` : '', contr ? `sta dalla parte opposta rispetto ${art(contr, 'a')}` : ''].filter(Boolean)
    if (pezzi.length) frasi.push(pick(r, [`Sulla carta, ${d(c)} ${pezzi.join(', ')}`, `Se guardo il dizionario, ${d(c)} ${pezzi.join(' e ')}`, `Comincio dalla definizione: ${d(c)} ${pezzi.join(', ')}`]))
  }
  if (ctx.prima) frasi.push(pick(r, ['Più indietro avevo scritto', 'Nel capitolo prima dicevo']) + ` che ${pulisciTesi(ctx.prima).replace(/[.]$/, '')}; qui la cosa si complica`)
  // 2. i fatti, riscritti e aggregati, legati da connettivi secondo il tipo di legame
  // ordine a catena: l'oggetto di un fatto diventa il soggetto del successivo, quando si può
  const pool = fs.slice(0, 8), scelti: Fatto[] = []
  while (pool.length && scelti.length < 5) {
    const last = scelti[scelti.length - 1]
    const i = last ? pool.findIndex(f => f.s === last.o || f.s === last.s || f.o === last.o) : -1
    scelti.push(pool.splice(i >= 0 ? i : 0, 1)[0])
  }
  if (scelti.length) {
    const righe = aggrega(r, scelti, usate)
    righe.forEach((x, i) => {
      const f = scelti[Math.min(i, scelti.length - 1)], g = scelti[Math.min(i, scelti.length - 1) - 1]
      const parole = (k?: Fatto) => (k ? [k.s, k.o, ...k.compl.map(z => z.n)].filter(Boolean) as string[] : [])
      const comune = parole(g).find(w => parole(f).includes(w))
      const conn = i === 0 ? pick(r, ['Nelle cose che ho letto', 'Da quello che ho letto', 'Per quello che ho capito']) + ', '
        : f.neg ? 'Eppure ' : g && g.o && g.o === f.s ? 'E a sua volta ' : comune ? pick(r, [`E sempre a proposito ${art(comune, 'di')}, `, `Torna ${art(comune, 'det')}: `, `Ancora ${art(comune, 'su')}: `]) : pick(r, ['In un\'altra lettura, ', 'Altrove: ', 'Da un\'altra parte, '])
      const t = /\?/.test(x) ? cap(x) : conn + (conn ? x : cap(x))
      frasi.push(t)
      punti.push(cap(x).slice(0, 90))
    })
    // 2b. confronto: dove questo concetto tocca un altro capitolo
    for (const altro of (ctx.altri ?? []).slice(0, 4)) {
      const fa = fattiSu(st, altro, 20)
      const mie = new Set(scelti.flatMap(f => [f.s, f.o, ...f.compl.map(z => z.n)]).filter(Boolean) as string[])
      const chiaviMie = new Set(scelti.map(chiaveFatto))
      const ponte = fa.find(f => !chiaviMie.has(chiaveFatto(f)) && [f.s, f.o, ...f.compl.map(z => z.n)].some(w => w && w !== c && w !== altro && mie.has(w)))
      if (!ponte) continue
      const w = [ponte.s, ponte.o, ...ponte.compl.map(z => z.n)].find(x => x && x !== c && x !== altro && mie.has(x))!
      frasi.push(`${cap(d(c))} e ${d(altro)} si toccano in un punto: ${d(w)}. Da una parte ${riscrivi(r, scelti.find(f => [f.s, f.o, ...f.compl.map(z => z.n)].includes(w))!, usate, 'attiva')}; dall'altra ${riscrivi(r, ponte, usate, 'attiva')}`)
      scelti.push(ponte)
      break
    }
    // 2c. dedurre: qualcosa che non ha letto da nessuna parte
    const ded = deduci(st, r, [c, ...(ctx.altri ?? [])].slice(0, 6)).filter(x => (x.a === c || x.b === c || x.premesse.some(p => p.includes(c))) && !ctx.dedotte?.has(x.testo))
    if (ded.length) { frasi.push(diciDeduzione(r, ded[0]).replace(/\.$/, '')); dedotta = ded[0] }
    // 3. sintesi: che cosa fa questo concetto, nel complesso
    const verbiS = [...new Set(scelti.filter(f => f.s === c).map(f => f.v.inf))].slice(0, 3)
    const subisce = [...new Set(scelti.filter(f => f.o === c).map(f => f.s))].slice(0, 3)
    if (verbiS.length >= 2) frasi.push(`Riassumendo: ${d(c)} è qualcosa che sa ${verbiS.slice(0, -1).join(', ')} e ${verbiS[verbiS.length - 1]}`)
    else if (subisce.length >= 2) frasi.push(`${cap(d(c))}, insomma, dipende da altro: da ${subisce.map(x => d(x)).join(', ')}`)
  } else frasi.push(pick(r, [`${cap(art(c, 'su'))} ho letto poco, e quel poco non basta`, `${cap(d(c))} per ora è più una parola che una cosa: ne so troppo poco`]))
  // 4. l'immagine: come lo disegnerebbe
  if (ctx.segno) frasi.push(pick(r, ['Se dovessi disegnarlo', 'In una tavola lo farei così', 'Il suo segno, per me']) + `: ${ctx.segno}`)
  // 5. la sua posizione
  if (ctx.tesi) frasi.push(ctx.contro ? `Ma non sono d'accordo con me stesso fino in fondo: ${pulisciTesi(ctx.tesi)}` : pick(r, ['La mia idea', 'Quello che ne tiro fuori', 'Io la metterei così']) + `: ${pulisciTesi(ctx.tesi)}`)
  // 6. una domanda, se resta qualcosa di aperto
  if (ctx.altri?.length && r() < 0.6) frasi.push(realizza(pick(r, ['resta da capire che cosa c\'entri {det:x}', 'e {det:x}, dove sta in tutto questo?', 'non so ancora cosa farmene {di:x}']), { x: pick(r, ctx.altri) }))
  const fonti = [...new Set(scelti.map(f => f.fonte))]
  const testo = concorda(frasi.map(x => fine(cap(x.trim()))).join(' ')) + (fonti.length ? ` (Letto in: ${fonti.map(x => `«${x}»`).join(', ')}.)` : '')
  if (dedotta) punti.push(cap(dedotta.testo))
  return { testo, fonti, punti, fatti: scelti.length, chiavi: scelti.map(chiaveFatto), dedotta }
}

/** un'obiezione: un fatto che va contro, riscritto */
export function scriviObiezione(st: AgentState, r: Rnd, c: string, sua?: string): { testo: string; fonte: string } | null {
  const fs = fattiSu(st, c).filter(f => f.neg || /^(svuot|distrugg|consum|nascond|ferm|oppor|imped|toglie|nega)/.test(f.v.inf))
  if (!fs.length) return null
  const f = pick(r, fs)
  const x = riscrivi(r, f, new Set(), pick(r, ['attiva', 'passiva']))
  return {
    testo: concorda(`${pick(r, ['Ma c\'è un\'altra lettura', 'Qualcosa non torna', 'Devo contraddirmi'])}: in «${f.fonte}» viene fuori che ${x}. ${sua ? `Se è così, quello che sostenevo (${sua}) regge meno di quanto credevo.` : 'Se è così, quello che ho scritto sopra regge meno.'} Ci devo tornare.`),
    fonte: f.fonte,
  }
}


// ─── dedurre: frasi che non ha letto da nessuna parte ──────────────────────
export interface Deduzione {
  testo: string; premesse: string[]; tipo: TipoD; a: string; b: string
  segno: 1 | -1; conf: number; passi: number; modello: string; ritirata?: boolean
}

const DIPENDE = /^(dipendere|vivere|nascere|derivare|crescere|nutrire|reggere)$/
/** i verbi che fanno passare qualcosa da una cosa all'altra: solo questi fanno catena (con gli altri, «porta a» sarebbe un'associazione di parole) */
const CAUSALI = /^(portare|causare|provocare|produrre|generare|determinare|creare|permettere|favorire|impedire|ridurre|aumentare|alimentare|spingere|costringere|trasformare|distruggere|costruire|fondare|governare|controllare|dominare|influenzare|sostenere|nutrire|reggere|muovere|cambiare|guidare|formare|originare|scatenare|accendere|spegnere|minacciare|proteggere|difendere|liberare|unire|dividere|separare|attirare|respingere|sostituire|eliminare|limitare|regolare|organizzare|dirigere|ispirare|influire)$/
interface Arco { da: string; a: string; f: Fatto; segno: 1 | -1; conf: number }

/** il grafo dei fatti: chi agisce su cosa, chi regge cosa; la fiducia cresce con le fonti che lo dicono */
function grafo(st: AgentState, fs: Fatto[]): Arco[] {
  const archi: Arco[] = []
  const quante = new Map<string, Set<string>>()
  for (const f of fs) { const k = `${f.s}|${f.o ?? f.compl[0]?.n}`; quante.set(k, new Set([...(quante.get(k) ?? []), f.fonte])) }
  const conf = (s0: string, o: string) => Math.min(0.95, 0.7 + 0.1 * ((quante.get(`${s0}|${o}`)?.size ?? 1) - 1))
  for (const f of fs) {
    const segno: 1 | -1 = f.neg ? -1 : 1
    if (f.o && (CAUSALI.test(f.v.inf) || DIPENDE.test(f.v.inf))) archi.push({ da: f.s, a: f.o, f, segno, conf: conf(f.s, f.o) })
    for (const k of f.compl) {
      if (k.prep === 'senza') archi.push({ da: k.n, a: f.s, f, segno: 1, conf: 0.6 }) // senza A, X… → A regge X
      else if (DIPENDE.test(f.v.inf) && ['da', 'di', 'a', 'intorno'].includes(k.prep)) archi.push({ da: k.n, a: f.s, f, segno, conf: 0.6 })
      else if (!f.o && CAUSALI.test(f.v.inf) && ['a', 'in', 'su', 'verso', 'contro'].includes(k.prep)) archi.push({ da: f.s, a: k.n, f, segno: k.prep === 'contro' ? -1 : segno, conf: 0.5 })
    }
  }
  // «senza il lavoro la città si svuota»: anche dalle frasi intere
  for (const t of st.readings) for (const s0 of sentences(t.text).slice(0, 150)) {
    const m = s0.toLowerCase().match(/senza (?:il |lo |la |l'|i |gli |le )?([a-zàèéìòù]+)[ ,]+(?:il |lo |la |l'|i |gli |le )?([a-zàèéìòù]+) (?:si |non )?([a-zàèéìòù]+)/)
    if (m && isNomeQ(m[1]) && isNomeQ(m[2])) {
      const v = verbi().get(m[3])
      if (v) archi.push({ da: m[1], a: m[2], segno: 1, conf: 0.6, f: { s: m[2], v, forma: m[3], compl: [{ prep: 'senza', n: m[1] }], neg: false, rifl: /\bsi\b/.test(s0), fonte: t.title } })
    }
  }
  return archi
}

/** ragiona: catene corte e lunghe (fino a 4 passi), dipendenze, contese, disaccordi, eredità */
export function deduci(st: AgentState, r: Rnd, concetti: string[]): Deduzione[] {
  const fs = [...new Map(concetti.flatMap(c => fattiSu(st, c, 30)).map(f => [chiaveFatto(f), f])).values()]
  const archi = grafo(st, fs)
  const out: Deduzione[] = []
  const frase = (f: Fatto) => riscrivi(r, f, new Set(), 'attiva')
  const fonti = [...new Set(fs.map(f => f.fonte))]
  const metti = (tipo: TipoD, a: string, b: string, v: Record<string, string>, premesse: string[], segno: 1 | -1, conf: number, passi: number) => {
    const t2: TipoD = segno < 0 && (tipo === 'catena' || tipo === 'lunga' || tipo === 'dipendenza') ? 'interrotta' : tipo
    let c = concludi(st, r, t2, v)
    // la retorica sua: se ha imparato abbastanza modi di legare, dice la conclusione con una mossa propria
    const ex = trovaEsempio(st, fonti, a, b)
    // la conclusione "nuda": solo il legame tra i due capi, detto con il verbo più semplice
    // la conclusione "nuda": il legame tra i due capi detto con la relazione che è davvero (non sempre «porta a»)
    const NUDE: Partial<Record<TipoD, string>> = { catena: '{det:a} arriva fino {a:b}', lunga: '{det:a}, alla lontana, arriva fino {a:b}', dipendenza: '{det:a} regge {det:b}', interrotta: '{det:a} non arriva {a:b}', contesa: '{det:a} e {det:b} vogliono la stessa cosa', disaccordo: 'su {det:a} e {det:b} le fonti non si accordano', eredita: '{det:a} somiglia {a:b}', analogia: '{det:a} e {det:b} fanno lo stesso gesto', ponte: '{det:a} tiene insieme due storie', genere: '{det:a} e {det:b} sono della stessa specie', tensione: '{det:a} tiene insieme due contrari' }
    const nuda = realizza(NUDE[t2] ?? '{det:a} e {det:b} si toccano', { a, b })
    const mia = dici(st, r, { a, b, premesse, conclusione: c.testo, nuda, conf, segno, tipo: t2, ...ex })
    if (mia) c = { testo: mia.testo, modello: `mossa:${mia.mossa}` }
    out.push({ tipo: t2, a, b, premesse, testo: c.testo, segno, conf, passi, modello: c.modello })
  }
  // catene: cammini nel grafo, da 2 a 4 archi, senza tornare indietro
  const da = new Map<string, Arco[]>()
  for (const e of archi) da.set(e.da, [...(da.get(e.da) ?? []), e])
  for (const c0 of concetti) {
    const pila: Arco[][] = (da.get(c0) ?? []).map(e => [e])
    let giri = 0
    while (pila.length && giri++ < 400) {
      const cam = pila.pop()!
      const fine = cam[cam.length - 1].a
      if (cam.length >= 2) {
        const segno = (cam.reduce((x: number, e) => x * e.segno, 1) >= 0 ? 1 : -1) as 1 | -1
        const conf = cam.reduce((x: number, e) => x * e.conf, 1)
        const nodi = [c0, ...cam.map(e => e.a)]
        if (conf > 0.12) {
          const dip = cam[0].f.compl.some(k => k.prep === 'senza') || DIPENDE.test(cam[0].f.v.inf)
          if (cam.length === 2 && dip && false) metti('dipendenza', cam[0].a, cam[1].a, { x: cam[0].a, a: c0, b: cam[1].a }, cam.map(e => frase(e.f)), segno, conf, 2)
          else if (cam.length === 2) metti('catena', c0, fine, { a: c0, b: fine, x: nodi[1] }, cam.map(e => frase(e.f)), segno, conf, 2)
          else metti('lunga', c0, fine, { a: c0, b: fine, x: nodi[1], y: nodi[2] }, cam.map(e => frase(e.f)), segno, conf, cam.length)
        }
      }
      if (cam.length < 4) for (const e of da.get(fine) ?? []) if (![c0, ...cam.map(x => x.a)].includes(e.a)) pila.push([...cam, e])
    }
  }
  // dipendenza: senza A, X… ; e A fa B → X vive del B di A
  for (const e1 of archi) {
    if (!e1.f.compl.some(k => k.prep === 'senza' && k.n === e1.da)) continue
    for (const e2 of da.get(e1.da) ?? []) {
      if (e2 === e1 || e2.a === e1.a || !e2.f.o) continue
      metti('dipendenza', e1.a, e2.a, { x: e1.a, a: e1.da, b: e2.a }, [frase(e1.f), frase(e2.f)], (e1.segno * e2.segno >= 0 ? 1 : -1) as 1 | -1, e1.conf * e2.conf, 2)
    }
  }
  // contesa: due soggetti agiscono sulla stessa cosa
  const perO = new Map<string, Fatto[]>()
  for (const f of fs) if (f.o) perO.set(f.o, [...(perO.get(f.o) ?? []), f])
  for (const [o, g] of perO) {
    const sogg = [...new Set(g.map(f => f.s))]
    if (sogg.length >= 2) metti('contesa', sogg[0], sogg[1], { a: sogg[0], b: sogg[1], x: o }, g.slice(0, 2).map(frase), 1, 0.5, 1)
  }
  // disaccordo tra fonti
  for (const f1 of fs) for (const f2 of fs) {
    if (f1.s === f2.s && f1.v.inf === f2.v.inf && f1.o === f2.o && f1.neg !== f2.neg && f1.fonte !== f2.fonte && f1.o) metti('disaccordo', f1.s, f1.o, { a: f1.s, b: f1.o }, [frase(f1), frase(f2)], -1, 0.5, 1)
  }
  // eredità dal genere: «A è un tipo di H, H fa B ⇒ A eredita B» — tolta: era il ragionamento più vuoto (la lega eredita il supporto)

  // il pensiero tra letture diverse (analogie, ponti, regole, tensioni)
  out.push(...pensa(st, r, concetti))
  const seen = new Set<string>()
  // il critico: concetti vuoti e fonti finte fuori
  return out.filter(d => !GENERICI.has(d.a) && !GENERICI.has(d.b) && d.a !== d.b && !d.premesse.some(p => /campione|wikipedia-/i.test(p)))
    .filter(d => { const k = `${d.tipo}|${d.a}|${d.b}|${d.segno}`; if (seen.has(k)) return false; seen.add(k); return true })
    .sort((x, y) => y.conf * (1 + (y.passi - 1) * 0.25) - x.conf * (1 + (x.passi - 1) * 0.25) + (r() - 0.5) * 0.2)
}

/** controlla una deduzione nuova contro quelle già fatte e contro i testi: se si contraddicono, ne ritira una */
export function coerenza(st: AgentState, r: Rnd, nuova: Deduzione, vecchie: Deduzione[]): { ritrattazione?: Deduzione; contro?: Deduzione } {
  // contro i testi letti: un fatto negato che dice il contrario della conclusione
  const fs = fattiSu(st, nuova.a, 30)
  const smentita = fs.find(f => f.s === nuova.a && (f.o === nuova.b || f.compl.some(k => k.n === nuova.b)) && (f.neg ? -1 : 1) !== nuova.segno)
  if (smentita) nuova.conf *= 0.5
  const LOGICHE = ['catena', 'lunga', 'dipendenza', 'interrotta', 'eredita']
  if (!LOGICHE.includes(nuova.tipo)) return {}
  const opposta = vecchie.find(v => !v.ritirata && LOGICHE.includes(v.tipo) && v.a === nuova.a && v.b === nuova.b && v.segno !== nuova.segno)
  if (!opposta && !smentita) return {}
  const [debole, forte] = opposta ? (opposta.conf < nuova.conf ? [opposta, nuova] : [nuova, opposta]) : [nuova, nuova]
  debole.ritirata = true
  const claim = (d: Deduzione) => realizza(d.segno > 0 ? '{det:a} arriva {a:b}' : '{det:a} non arriva {a:b}', { a: d.a, b: d.b })
  const neg = (opposta ? [debole, forte] : [nuova]).flatMap(d => d.premesse).find(p => /\bnon\b/.test(p))
  const b = smentita && !opposta ? `${riscrivi(r, smentita, new Set(), 'attiva')} (lo dice «${smentita.fonte}»)` : claim(forte)
  const c = concludi(st, r, 'ritrattazione', { a: claim(debole), b })
  return { ritrattazione: { tipo: 'ritrattazione', a: nuova.a, b: nuova.b, premesse: neg ? [`in mezzo c'è un no: ${neg}`] : [], testo: c.testo, segno: forte.segno, conf: forte.conf, passi: 0, modello: c.modello }, contro: opposta }
}

/** una deduzione detta per esteso: le premesse e la conclusione, con quanto ci crede */
export function diciDeduzione(r: Rnd, d: Deduzione): string {
  if (d.tipo === 'ritrattazione') return concorda(`${cap(d.testo)}${d.premesse.length ? ` (${d.premesse[0]})` : ''}.`)
  const intro = d.passi >= 3 ? pick(r, ['Seguo un filo lungo', 'Metto in fila più cose']) : pick(r, ['Metto insieme due cose', 'Provo a ragionare', 'Ne ricavo una cosa che non ho letto da nessuna parte'])
  const quanto = d.conf > 0.5 ? '' : d.conf > 0.25 ? pick(r, [' (ma non ne sono sicuro)', ' (con qualche dubbio)']) : ' (è poco più di un\'ipotesi)'
  return concorda(`${intro}: ${d.premesse.join('; ')}. ${cap(d.testo)}${quanto}.`)
}

/** un fatto detto piano, sempre allo stesso modo (per premesse e confronti) */
export const fraseDi = (f: Fatto) => riscrivi(() => 0.5, f, new Set(), 'attiva')
