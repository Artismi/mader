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
import { accorda, art, concorda, genere, isNome, isNomeQ, osservaGenere, realizza } from './lingua'

export interface Fatto { s: string; v: Verbo; forma: string; o?: string; compl: { prep: string; n: string; pre?: string }[]; neg: boolean; rifl: boolean; fonte: string }

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

/** smonta una frase in fatti (uno per verbo principale riconosciuto) */
export function fattiDi(frase: string, fonte: string): Fatto[] {
  return frase.split(/[:;]|,\s*(?=(?:ma|però|mentre|perché|quando|che|e)\s)/i).slice(0, 3).flatMap(c => fattiClausola(c, fonte)).slice(0, 2)
}
const COPULA = /^(diventare|essere|sembrare|restare|rimanere|nascere|apparire|stare|crescere|morire|vivere|andare|venire|tornare|cadere)$/
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
    out.push({ s: soggetto, v, forma: w, o, compl: compl.slice(0, 2), neg, rifl, fonte })
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
  const out: Fatto[] = []
  const seen = new Set<string>()
  for (const rd of st.readings) for (const s of sentences(rd.text).slice(0, 150)) {
    if (s.length > 300 || !s.toLowerCase().includes(concetto)) continue
    for (const f of fattiDi(s, rd.title)) {
      if (f.s !== concetto && f.o !== concetto && !f.compl.some(c => c.n === concetto)) continue
      const k = `${f.s}|${f.v.inf}|${f.o}`
      if (seen.has(k)) continue
      seen.add(k); out.push(f)
      if (out.length >= max) return out
    }
  }
  return out
}

// ─── coniugare (solo dove è regolare) ──────────────────────────────────────
const part = (v: Verbo) => (v.con === 'are' ? v.stem + 'ato' : v.con === 'ire' ? v.stem + 'ito' : null)
const pres3p = (v: Verbo, forma: string) => (v.con === 'are' ? v.stem + 'ano' : v.con === 'rre' ? v.stem + 'cono' : /isc/.test(forma) ? v.stem + 'iscono' : v.stem + 'ono')
const coniuga = (v: Verbo, forma: string, sogg: string) => (genere(sogg).n === 'p' ? pres3p(v, forma) : pres3(v, forma))
const pres3 = (v: Verbo, forma: string) => (v.con === 'are' ? v.stem + 'a' : v.con === 'rre' ? v.stem + 'ce' : /isc/.test(forma) ? v.stem + 'isce' : v.stem + 'e')
const infinito = (v: Verbo, rifl: boolean) => (rifl ? v.inf.replace(/e$/, '') + 'si' : v.inf)

const d = (x: string) => art(x, 'det')
function complemento(f: Fatto): string {
  const k0 = f.compl.find(k => !(k.prep === 'di' && COPULA.test(f.v.inf)))
  if (!k0) return ''
  const base = ['di', 'a', 'da', 'in', 'su'].includes(k0.prep) ? art(k0.n, k0.prep as 'di') : `${k0.prep} ${d(k0.n)}`
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
export const chiaveFatto = (f: Fatto) => `${f.s}|${f.v.inf}|${f.o ?? ''}|${f.compl[0]?.n ?? ''}`
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
    const ded = deduci(st, r, [c, ...(ctx.altri ?? [])].slice(0, 6)).filter(x => (x.a === c || x.b === c) && !ctx.dedotte?.has(x.testo))
    if (ded.length) { frasi.push(diciDeduzione(r, ded[0]).replace(/\.$/, '')); dedotta = ded[0] }
    // 3. sintesi: che cosa fa questo concetto, nel complesso
    const verbiS = [...new Set(scelti.filter(f => f.s === c).map(f => f.v.inf))].slice(0, 3)
    const subisce = [...new Set(scelti.filter(f => f.o === c).map(f => f.s))].slice(0, 3)
    if (verbiS.length >= 2) frasi.push(`Riassumendo: ${d(c)} è qualcosa che sa ${verbiS.slice(0, -1).join(', ')} e ${verbiS[verbiS.length - 1]}`)
    else if (subisce.length >= 2) frasi.push(`${cap(d(c))}, insomma, dipende da altro: da ${subisce.map(x => d(x)).join(', ')}`)
  } else frasi.push(pick(r, [`Su ${d(c)} ho letto poco, e quel poco non basta`, `${cap(d(c))} per ora è più una parola che una cosa: ne so troppo poco`]))
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
export interface Deduzione { testo: string; premesse: string[]; tipo: 'catena' | 'dipendenza' | 'contesa' | 'disaccordo' | 'eredita'; a: string; b: string }

const DIPENDE = /^(dipendere|vivere|nascere|derivare|crescere|nutrire|reggere)$/
/** ragiona sui fatti di più concetti: catene, dipendenze, contese, disaccordi tra fonti, eredità dal genere */
export function deduci(st: AgentState, r: Rnd, concetti: string[]): Deduzione[] {
  const fs = [...new Map(concetti.flatMap(c => fattiSu(st, c, 30)).map(f => [chiaveFatto(f), f])).values()]
  const out: Deduzione[] = []
  const frase = (f: Fatto) => riscrivi(r, f, new Set(), 'attiva')
  // dipendenze: «senza A, X si svuota» → X dipende da A; «X nasce intorno a A», «X vive di A»
  const dip: { x: string; a: string; f: Fatto }[] = []
  for (const f of fs) {
    for (const k of f.compl) {
      if (k.prep === 'senza') dip.push({ x: f.s, a: k.n, f })
      else if (DIPENDE.test(f.v.inf) && ['da', 'di', 'a', 'intorno'].includes(k.prep)) dip.push({ x: f.s, a: k.n, f })
    }
  }
  for (const t of st.readings) for (const s0 of sentences(t.text).slice(0, 150)) {
    const m = s0.toLowerCase().match(/senza (?:il |lo |la |l'|i |gli |le )?([a-zàèéìòù]+)[ ,]+(?:il |lo |la |l'|i |gli |le )?([a-zàèéìòù]+) (?:si |non )?([a-zàèéìòù]+)/)
    if (m && isNomeQ(m[1]) && isNomeQ(m[2]) && concetti.some(c => c === m[1] || c === m[2])) {
      const v = verbi().get(m[3])
      if (v) dip.push({ x: m[2], a: m[1], f: { s: m[2], v, forma: m[3], compl: [{ prep: 'senza', n: m[1] }], neg: false, rifl: /\bsi\b/.test(s0), fonte: t.title } })
    }
  }
  // 1. dipendenza + ciò che fa la cosa da cui si dipende → «X vive del B di A»
  for (const d0 of dip) for (const f of fs) {
    if (f.s !== d0.a || !f.o || f.o === d0.x) continue
    out.push({ tipo: 'dipendenza', a: d0.x, b: f.o, premesse: [frase(d0.f), frase(f)], testo: realizza(pick(r, ['{det:x} vive {di:b} {di:a}', 'quello che regge {det:x} è {det:b} che {det:a} decide', 'tolto {det:a}, {a:x} manca {det:b}']), { x: d0.x, a: d0.a, b: f.o }) })
  }
  // 2. catena: A fa B, B fa C → A arriva a C passando per B
  for (const f1 of fs) for (const f2 of fs) {
    if (f1 === f2 || !f1.o || f1.o !== f2.s || !(f2.o || f2.compl[0]) || f1.s === (f2.o ?? f2.compl[0]?.n)) continue
    const c = f2.o ?? f2.compl[0].n
    out.push({ tipo: 'catena', a: f1.s, b: c, premesse: [frase(f1), frase(f2)], testo: realizza(pick(r, ['{det:a} arriva fino {a:c}, passando per {det:b}', 'dietro {a:c} c\'è {det:a}, anche se non si vede: in mezzo sta {det:b}', 'se tocchi {det:a} si muove anche {det:c}']), { a: f1.s, b: f1.o, c }) })
  }
  // 3. contesa: due soggetti agiscono sulla stessa cosa
  const perO = new Map<string, Fatto[]>()
  for (const f of fs) if (f.o) perO.set(f.o, [...(perO.get(f.o) ?? []), f])
  for (const [o, g] of perO) {
    const sogg = [...new Set(g.map(f => f.s))]
    if (sogg.length < 2) continue
    out.push({ tipo: 'contesa', a: sogg[0], b: sogg[1], premesse: g.slice(0, 2).map(frase), testo: realizza(pick(r, ['{det:a} e {det:b} si contendono {det:o}', '{det:o} sta in mezzo, tirato da {det:a} e da {det:b}']), { a: sogg[0], b: sogg[1], o }) })
  }
  // 4. disaccordo: stessa cosa detta e negata da fonti diverse
  for (const f1 of fs) for (const f2 of fs) {
    if (f1.s === f2.s && f1.v.inf === f2.v.inf && f1.o === f2.o && f1.neg !== f2.neg && f1.fonte !== f2.fonte) {
      out.push({ tipo: 'disaccordo', a: f1.s, b: f1.o ?? '', premesse: [frase(f1), frase(f2)], testo: `su questo le fonti non sono d'accordo: per «${f1.fonte}» sì, per «${f2.fonte}» no` })
    }
  }
  // 5. eredità: A è un tipo di H, e di H si dice che fa X → forse anche A
  for (const c of concetti) {
    const h = iperonimo(c, new Set(concetti))
    if (!h || h === c) continue
    const fh = fattiSu(st, h, 10).find(f => f.s === h && f.o)
    if (fh) out.push({ tipo: 'eredita', a: c, b: fh.o!, premesse: [`${art(c, 'det')} è un tipo ${art(h, 'di')}`, frase(fh)], testo: realizza('forse anche {det:a} {v} {det:b}: se è un tipo {di:h}, gli tocca', { a: c, b: fh.o!, h, v: pres3(fh.v, fh.forma) }) })
  }
  const seen = new Set<string>()
  return out.filter(d => { const k = d.testo; if (seen.has(k)) return false; seen.add(k); return true }).sort(() => r() - 0.5)
}

/** una deduzione detta per esteso: le premesse e la conclusione */
export function diciDeduzione(r: Rnd, d: Deduzione): string {
  const intro = pick(r, ['Metto insieme due cose', 'Provo a ragionare', 'Ne ricavo una cosa che non ho letto da nessuna parte'])
  return concorda(`${intro}: ${d.premesse.join(', e ')}. ${pick(r, ['Allora', 'Quindi', 'Ne viene che'])} ${d.testo}.`)
}
