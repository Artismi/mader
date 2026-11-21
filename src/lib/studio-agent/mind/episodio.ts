/**
 * Gli episodi: una sequenza di tavole che si legge come un ragionamento.
 *
 * Ogni episodio (un post, un carosello) porta avanti la sua VISIONE: poche tesi che
 * tiene, con quanto ci crede, e una domanda aperta. Un episodio:
 *   copertina → cosa era successo prima → la domanda → le premesse (una tavola per fatto
 *   letto, con la fonte) → i passaggi → la conclusione → il controllo (contraddice
 *   qualcosa?) → l'obiezione → quanto ci crede → cosa cambia nella visione → la domanda
 *   che apre l'episodio successivo.
 * Le tavole condividono tono, carattere e segni: lo stesso concetto ha sempre lo stesso
 * segno, così nella sequenza si vede la logica (A, poi A con B, poi A che arriva a C).
 * Ogni tavola ha un numero, un ruolo e un titolo.
 */
import type { AgentState, Reading, Work } from '../core/types'
import { sentences } from '../reader/tokenize'
import { pick, range, uid, weighted, type Rnd } from '../core/rng'
import { FACES, type FaceId } from '@/components/studio/genera/fonts'
import type { Tone } from '@/components/studio/genera/recipes'
import { newCanvas, withLayer, fullLayer, emptySheet, flatten, sfuma, type Sheet, generaDi } from '../hands/sheet'
import { textLayer, toolById, type ToolCtx } from '../hands/tools'
import { applica } from '../hands/tools'
import { ratio } from '../eyes/judgement'
import { campoColore, ensureAtlante, maschera, pennella, segnoDi, type Rel } from './atlante'
import { coerenza, deduci, diciDeduzione, fattiDi, fattiSu, scriviObiezione, scriviParagrafo, type Deduzione, type Fatto } from '../voice/scrittura'
import { art, concorda, realizza } from '../voice/lingua'
import { getCantieri } from './cantiere'
import { APERTURE } from '../voice/conclusioni'
import type { Follia, Linguaggio } from './linguaggi'
import { impaginaTesti, type Impagina } from '../hands/tipo'
import { coloriDi, scegliVisiva } from './retorica'

// ─── la visione ─────────────────────────────────────────────────────────────
export interface Tesi { testo: string; conf: number; da: number; a: string; b: string; ritirata?: boolean }
export interface Visione { titolo: string; tesi: Tesi[]; domanda: string; storia: { day: number; nota: string }[] }
export interface EpisodioInfo { tipo?: string; modello?: string; musica?: { partitura: import('../suono/musica').Partitura; descr: string }; lettura?: string; coppia?: string; id: string; n: number; titolo: string; day: number; schede: string[]; conclusione: string; domanda: string; caption: string }
type WithV = AgentState & { visione?: Visione; episodi?: EpisodioInfo[] }
export const getVisione = (st: AgentState) => (st as WithV).visione
export const getEpisodi = (st: AgentState) => (st as WithV).episodi ?? []

function ensureVisione(st: AgentState, r: Rnd): Visione {
  const W = st as WithV
  if (W.visione) return W.visione
  const C = getCantieri(st).slice(-1)[0]
  const tema = C?.tema ?? Object.values(ensureAtlante(st).concetti).sort((a, b) => b.frasi - a.frasi)[0]?.word ?? 'mondo'
  W.visione = { titolo: realizza(pick(r, ['che cosa tiene insieme {det:t}', 'contro chi lavora {det:t}', '{det:t} e quello che ci sta sotto']), { t: tema }), tesi: [], domanda: realizza('che cosa regge davvero {det:t}?', { t: tema }), storia: [{ day: st.day, nota: 'nasce la visione' }] }
  return W.visione
}

// ─── il piano di un episodio ───────────────────────────────────────────────
type Ruolo = 'copertina' | 'prima' | 'domanda' | 'premessa' | 'passaggio' | 'conclusione' | 'controllo' | 'obiezione' | 'fiducia' | 'visione' | 'immagine' | 'altra' | 'coda' | 'silenzio' | 'parola' | 'definizione' | 'risposta'
interface Scheda { follia?: Follia; ruolo: Ruolo; titolo: string; corpo: string; a?: string; b?: string; rel?: Rel; catena?: string[]; fonte?: string }

const REL_VERBO = (f: Fatto): Rel => (f.neg ? 'contro' : /^(divent|trasform|cambi|passa)/.test(f.v.inf) ? 'diventa' : /^(restare|stare|vivere|abitare|contenere)/.test(f.v.inf) ? 'dentro' : /^(essere|sembrare)/.test(f.v.inf) ? 'identita' : 'causa')
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export type FormaSeq = 'lineare' | 'a ritroso' | 'contrappunto' | 'crescendo' | 'frammenti' | 'dialogo' | 'catalogo' | 'manifesto'

/**
 * Il piano di una sequenza. Non c'è una scaletta fissa: raccoglie il materiale (fatti letti,
 * la deduzione, il controllo, un'obiezione, le sue tesi) e sceglie lui una FORMA per dirlo:
 * lineare, a ritroso (prima la conclusione), contrappunto (immagini mute e frasi alternate),
 * crescendo (da una parola sola a tutto), frammenti (in disordine, senza spiegare), dialogo
 * (lui contro le fonti), catalogo (un concetto per tavola), manifesto (poche frasi grandi).
 * La lunghezza la decide la forma, fino al massimo indicato.
 */
export function pianifica(st: AgentState, r: Rnd, N: number, filo: string | null, frase: (f: Fatto) => string, letture: Reading[] = []): { schede: Scheda[]; d: Deduzione | null; titolo: string; domanda: string; lettura?: string; forma: FormaSeq } {
  const V = ensureVisione(st, r)
  const A = ensureAtlante(st)
  // le tesi del vecchio modo di ragionare («l'essere porta alla stagione», «eredita», nomi di mosse finiti nel testo) non si ripropongono
  const vuota = (t: string) => /mossa:|\bporta (al|alla|allo|ai|agli|alle|all'|a)\b|un tipo d|eredita|davvero\?/i.test(t)
  // e alla prima giornata col pensiero nuovo si riparte puliti: le tesi del vecchio motore erano associazioni di parole
  const S2 = st as AgentState & { pensiero2?: number }
  // niente si cancella: le tesi e le deduzioni del vecchio modo di ragionare vanno in archivio (restano sue, nella memoria),
  // semplicemente non si ripropongono come copertine o premesse
  const S4 = st as AgentState & { archivioPensiero?: { tesi: typeof V.tesi; deduzioni: NonNullable<typeof A.deduzioni>; dal: number } }
  if (!S2.pensiero2) { S4.archivioPensiero = { tesi: [...(S4.archivioPensiero?.tesi ?? []), ...V.tesi], deduzioni: [...(S4.archivioPensiero?.deduzioni ?? []), ...(A.deduzioni ?? [])], dal: st.day }; V.tesi = []; A.deduzioni = []; S2.pensiero2 = st.day }
  const via = V.tesi.filter(t => vuota(t.testo)), viaD = (A.deduzioni ?? []).filter(d0 => vuota(d0.testo))
  if (via.length || viaD.length) { const Ar = S4.archivioPensiero ??= { tesi: [], deduzioni: [], dal: st.day }; Ar.tesi.push(...via); Ar.deduzioni.push(...viaD); V.tesi = V.tesi.filter(t => !vuota(t.testo)); if (A.deduzioni) A.deduzioni = A.deduzioni.filter(d0 => !vuota(d0.testo)) }
  const ep = getEpisodi(st)
  const prev = ep[ep.length - 1]
  const C = getCantieri(st).slice(-1)[0]
  const concetti = [...new Set([filo, ...(C?.capitoli.map(k => k.concetto) ?? []), ...V.tesi.slice(-4).flatMap(t => [t.a, t.b]), ...Object.values(A.concetti).sort((a, b) => b.frasi - a.frasi).slice(0, 6).map(c => c.word)].filter(Boolean) as string[])].slice(0, 8)
  const giaFatte = new Set(ep.map(e => e.coppia).filter(Boolean))
  const dallaDomanda = new Set((prev?.domanda ?? '').toLowerCase().split(/[^a-zàèéìòù]+/))
  const ds = deduci(st, r, [...new Set([...dallaDomanda].filter(w => w.length > 3 && A.concetti[w]).concat(concetti))].slice(0, 9))
    .filter(d => !V.tesi.some(t => t.testo === d.testo) && !giaFatte.has(`${d.a}|${d.b}`) && !giaFatte.has(`${d.b}|${d.a}`))
  // le premesse già usate di recente non tornano (né le stesse frasi, né lo stesso gesto con altre parole)
  const S3 = st as AgentState & { premesseUsate?: string[] }
  const giaUsate = new Set(S3.premesseUsate ?? [])
  const fresche = ds.filter(x => !x.premesse.some(p => giaUsate.has(p)))
  ds.splice(0, ds.length, ...fresche) // se resta solo roba già detta, oggi non deduce: legge
  const d = ds.length ? weighted(r, ds, x => (x.conf + 0.1) * (1 + (x.passi - 1) * 0.8) * (dallaDomanda.has(x.a) || dallaDomanda.has(x.b) ? 3 : 1) * (filo && (x.a === filo || x.b === filo) ? 1.5 : 1) * (x.tipo === 'contesa' ? 0.5 : 1) * (['analogia', 'ponte', 'genere', 'tensione'].includes(x.tipo) ? 1.8 : 1) * ((st as AgentState & { pesiTipo?: Record<string, number> }).pesiTipo?.[x.tipo] ?? 1), 0.7) : null
  const senzaAttacco = (x: string) => { let t = x; for (const a of APERTURE.slice().sort((p, q) => q.length - p.length)) if (t.toLowerCase().startsWith(a.toLowerCase())) { t = t.slice(a.length).trim(); break } return t }

  // ── il materiale ──
  type Fat = { titolo: string; f?: Fatto }
  let fatti: Fat[] = []
  let lettura: string | undefined
  const allFs = [...new Map(concetti.flatMap(c => fattiSu(st, c, 30)).map(f => [frase(f), f])).values()]
  if (d) fatti = d.premesse.map(p => ({ titolo: p, f: allFs.find(f => frase(f) === p || (p.includes(f.s) && (f.o ? p.includes(f.o) : true))) }))
  else {
    const lette = new Set(ep.map(e => e.lettura).filter(Boolean))
    const tutte = [...letture, ...st.readings.slice().reverse()].filter(x => x.text.length > 200)
    const rd = tutte.find(x => !lette.has(x.title)) ?? tutte[Math.floor(r() * Math.max(1, tutte.length))]
    if (rd) { lettura = rd.title; fatti = sentences(rd.text).slice(0, 80).flatMap(x => fattiDi(x, rd.title)).slice(0, 7).map(f => ({ titolo: frase(f), f })) }
  }
  const co = d ? coerenza(st, r, d, A.deduzioni ?? []) : {}
  const ob = d ? scriviObiezione(st, r, d.a) ?? scriviObiezione(st, r, d.b) : null
  const tesi = V.tesi.filter(t => !t.ritirata)
  const nodi = [...new Set([d?.a, d?.b, ...fatti.flatMap(x => [x.f?.s, x.f?.o])].filter(Boolean) as string[])]
  const domanda = d ? realizza(pick(r, ['che cosa lega {det:a} {a:b}?', 'da dove viene {det:b}?', 'chi muove {det:b}?', 'cosa c\'entra {det:a} con {det:b}?', 'e se fosse {det:b} a muovere {det:a}?']), { a: d.a, b: d.b }) : V.domanda
  const titolo = d ? cap(senzaAttacco(d.testo).split(/[:;]/)[0].split(/, (?:e|ma|anche|almeno) /)[0]) : lettura ? cap(lettura) : cap(V.titolo)

  // ── la forma: la sceglie lui (umore, materiale, e non la stessa di prima) ──
  const forme: FormaSeq[] = ['lineare', 'a ritroso', 'contrappunto', 'crescendo', 'frammenti', 'dialogo', 'catalogo', 'manifesto']
  const usate = (st as WithV & { formeUsate?: FormaSeq[] }).formeUsate ?? []
  const pesoF = (f: FormaSeq) => {
    let w = 1
    if (usate.slice(-3).includes(f)) w *= 0.25
    if (!d && (f === 'a ritroso' || f === 'dialogo' || f === 'lineare')) w *= 0.3
    if (f === 'dialogo' && ob) w *= 2
    if (f === 'catalogo') w *= nodi.length >= 4 ? 1.6 : 0.2
    if (f === 'manifesto') w *= tesi.length + (d ? 1 : 0) >= 2 ? 1.5 : 0
    if (f === 'frammenti' && (st.mood === 'inquieto' || st.mood === 'giocoso')) w *= 2
    if (f === 'contrappunto' && (st.mood === 'calmo' || st.mood === 'cupo')) w *= 1.8
    if (f === 'crescendo' && d && d.passi >= 3) w *= 2
    return w
  }
  const forma = weighted(r, forme, pesoF, 0.8)
  ;(st as WithV & { formeUsate?: FormaSeq[] }).formeUsate = [...usate, forma].slice(-20)

  const centro = d?.a ?? filo ?? nodi[0] ?? ''
  /** il suo commento a un fatto: che cosa vuol dire, e perché gli interessa */
  const glossa = (f?: Fatto): string => {
    if (!f) return ''
    const o0 = f.o ?? f.compl[0]?.n ?? ''
    // «X nasce da Y»: la causa è Y, l'effetto X
    const origine = !f.o && (f.compl[0]?.prep === 'da' || /^(nascere|derivare|venire|dipendere)$/.test(f.v.inf))
    const v = origine ? { s: o0, o: f.s, c: centro } : { s: f.s, o: o0, c: centro }
    const o = v.o
    const T: Record<Rel, string[]> = {
      causa: ['quindi {det:o} non viene dal nulla: dietro c\'è {det:s}', 'se cambia {det:s}, cambia anche {det:o}', 'chi tocca {det:s} tocca anche {det:o}, anche senza volerlo'],
      contro: ['qui c\'è un no: {det:s} e {det:o} non stanno insieme', 'tra {det:s} e {det:o} non passa niente', 'è una frattura, non un legame'],
      dentro: ['{det:o} è il posto dove {det:s} succede', '{det:s} non si capisce fuori {da:o}', 'uno contiene l\'altro: {det:s} sta {in:o}'],
      identita: ['due nomi per quasi la stessa cosa', 'dire {det:s} è già un po\' dire {det:o}', '{det:s} e {det:o} si somigliano più di quanto pensavo'],
      diventa: ['niente resta com\'è: {det:s} passa {in:o}', 'è un passaggio, non uno stato', 'oggi {det:s}, domani {det:o}'],
      accanto: ['stanno vicini, e la vicinanza conta', '{det:s} e {det:o} non si toccano, ma si guardano'],
    }
    const g = o ? realizza(pick(r, T[REL_VERBO(f)]), v) : ''
    const perche = centro && centro !== f.s && centro !== o && r() < 0.5 ? realizza(pick(r, [' E mi serve per capire {det:c}.', ' Lo tengo perché parlo {di:c}.', ' Questo sposta qualcosa {in:c}.']), v) : ''
    return concorda(cap(g) + '.' + perche + ` (${f.fonte})`)
  }
  let lunghi = 0
  /** due frasi sue su una parola: quello che sa di lei, riscritto */
  const riassunto = (w: string) => {
    const p = scriviParagrafo(st, r, w, { altri: nodi.filter(x => x !== w).slice(0, 3) })
    // di solito due frasi; ogni tanto il paragrafo intero (fino a sei), quando ha abbastanza da dire
    const fr = p.testo.replace(/\s*\(Letto in:.*$/, '').split(/(?<=[.?!])\s+/)
    // un paragrafo lungo ogni tanto, e al massimo uno per sequenza
    const lungo = !lunghi && fr.length >= 4 && r() < 0.12
    if (lungo) lunghi++
    return fr.slice(0, lungo ? 6 : 2).join(' ')
  }
  /** il ragionamento disteso: quello che ha capito delle due cose, il confronto, la conclusione, una domanda. Tutto suo */
  const disteso = (dd: Deduzione): string => {
    const fa = (w: string) => scriviParagrafo(st, r, w, { altri: [dd.a, dd.b].filter(x => x !== w) }).testo.replace(/\s*\(Letto in:.*$/, '').split(/(?<=[.?!])\s+/).filter(x => !/^(Riassumendo|Metto insieme|Provo a ragionare|Seguo un filo|Ne ricavo|Comincio dalla definizione|Sulla carta|Se guardo il dizionario)/.test(x)).slice(0, 2).join(' ')
    const apre = pick(r, ['Parto da due cose che ho capito leggendo, in posti lontani.', 'Le ho trovate in letture che non si conoscono.', 'Due cose, da due parti diverse.'])
    const prem = dd.premesse.map((p0, i) => (i ? pick(r, ['Dall\'altra parte', 'Altrove', 'E poi']) + ', ' + p0 : cap(p0))).join('. ')
    const c1 = fa(dd.a), c2 = dd.b !== dd.a ? fa(dd.b) : ''
    const passo = pick(r, ['Messe vicine, cambiano tutte e due.', 'Non le avrei mai accostate, eppure.', 'Il punto non è che si somigliano: è dove si somigliano.'])
    const dubbio = dd.conf < 0.5 ? pick(r, [' Non ne sono sicuro, ma la tengo.', ' Può darsi che sia solo una rima.']) : ''
    const dom = realizza(pick(r, ['Resta da capire chi dei due ha imparato dall\'altro.', 'E se fosse {det:b} a spiegare {det:a}, e non il contrario?', 'Cosa succede {a:a} il giorno che {det:b} smette?']), { a: dd.a, b: dd.b })
    return concorda([apre, prem + '.', c1, c2, passo, cap(senzaAttacco(dd.testo)).replace(/\.?$/, '.') + dubbio, dom].filter(Boolean).join(' ').replace(/\.\./g, '.'))
  }
  let mute = 0
  const S: Scheda[] = []
  const pre = (x: Fat): Scheda => ({ ruolo: 'premessa', titolo: cap(x.titolo), corpo: glossa(x.f), a: x.f?.s, b: x.f?.o ?? x.f?.compl[0]?.n, rel: x.f ? REL_VERBO(x.f) : 'accanto', fonte: x.f?.fonte })
  let corpoConc: string | undefined
  const conc = (): Scheda | null => (d ? { ruolo: 'conclusione', titolo: cap(senzaAttacco(d.testo)), corpo: corpoConc ??= (!lunghi && r() < 0.22 ? (lunghi++, disteso(d)) : concorda(`${pick(r, ['Ci arrivo così', 'Il ragionamento', 'Metto in fila'])}: ${d.premesse.join('; ')}.${d.conf < 0.4 ? pick(r, [' Non ne sono sicuro.', ' È un\'ipotesi.']) : ''}`)), catena: [d.a, d.b], a: d.a, b: d.b } : null)
  const muta = (a?: string, b?: string): Scheda | null => (mute++ >= 1 ? null : { ruolo: 'silenzio', titolo: d ? cap(senzaAttacco(d.testo).split(/[,:;]/)[0]) : tesi.length ? cap(senzaAttacco(pick(r, tesi).testo).split(/[,:;]/)[0]) : cap(V.titolo), corpo: '', a: a ?? pick(r, nodi.length ? nodi : [V.titolo]), b: b ?? (nodi.length > 1 ? pick(r, nodi) : undefined), rel: pick(r, ['causa', 'dentro', 'identita', 'diventa', 'contro'] as Rel[]) })
  const parola = (w: string): Scheda => ({ ruolo: 'parola', titolo: w.toUpperCase(), corpo: riassunto(w), a: w })
  const ritorno = (): Scheda | null => (prev && r() < 0.35 ? { ruolo: 'prima', titolo: pick(r, ['Torno su una cosa', 'Me lo ero già chiesto', 'Ancora']), corpo: `${cap(prev.conclusione)}.`, a: d?.a } : null)
  const dub = (): Scheda[] => [co.ritrattazione ? { ruolo: 'controllo', titolo: 'Non torna', corpo: diciDeduzione(r, co.ritrattazione), a: d?.a, b: d?.b, rel: 'contro' as Rel } : null, ob ? { ruolo: 'obiezione', titolo: pick(r, ['Però', 'Eppure', 'Qualcuno direbbe di no']), corpo: ob.testo, a: d?.a, b: d?.b, rel: 'contro' as Rel, fonte: ob.fonte } : null].filter(Boolean) as Scheda[]
  const push = (...xs: (Scheda | null | undefined)[]) => { for (const x of xs) if (x) S.push(x) }

  switch (forma) {
    case 'lineare':
      push(r() < 0.6 ? { ruolo: 'domanda', titolo: cap(domanda), corpo: pick(r, ['Provo a rispondere con quello che ho letto.', 'Parto dalle fonti, il resto lo deduco io.', 'Non lo so ancora. Vediamo.']), a: d?.a, b: d?.b } : muta(), ritorno())
      fatti.forEach((x, i) => { push(pre(x)); if (i > 0 && r() < 0.5) push({ ruolo: 'passaggio', titolo: pick(r, ['Metto insieme', 'E quindi', 'Qui si toccano']), corpo: concorda(`${cap(fatti[i - 1].titolo)}; ${fatti[i].titolo}.`), catena: nodi.slice(0, 4) }) })
      push(conc(), ...dub())
      break
    case 'a ritroso':
      push(conc() && { ...conc()!, ruolo: 'copertina' as Ruolo, corpo: '' }, { ruolo: 'risposta', titolo: pick(r, ['Perché lo dico?', 'Da dove viene?', 'Come ci arrivo']), corpo: pick(r, ['Torno indietro, un fatto alla volta.', 'Smonto la frase nei pezzi che la reggono.']), a: d?.a })
      fatti.slice().reverse().forEach(x => push(pre(x)))
      push(...dub(), r() < 0.5 ? muta(d?.a, d?.b) : null)
      break
    case 'contrappunto':
      fatti.forEach((x, i) => { if (i % 2 === 0) push(muta(x.f?.s, x.f?.o)); push(pre(x)) })
      push(muta(d?.a, d?.b), conc())
      break
    case 'crescendo':
      push(parola(d?.a ?? nodi[0] ?? V.titolo.split(' ').slice(-1)[0]))
      fatti.forEach((x, i) => push({ ...pre(x), catena: nodi.slice(0, i + 2) }))
      push(conc() && { ...conc()!, catena: nodi.slice(0, 6) })
      break
    case 'frammenti': {
      const pezzi: Scheda[] = [...fatti.map(pre), ...(conc() ? [conc()!] : []), ...nodi.slice(0, 2).map(w => parola(w)), muta()].filter(Boolean) as Scheda[]
      for (let i = pezzi.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pezzi[i], pezzi[j]] = [pezzi[j], pezzi[i]] }
      push(...pezzi)
      break
    }
    case 'dialogo':
      fatti.forEach((x, i) => { push(pre(x)); if (i === 0 && ob) push({ ruolo: 'obiezione', titolo: 'No.', corpo: ob.testo, a: x.f?.s, b: x.f?.o, rel: 'contro', fonte: ob.fonte }) })
      push(conc(), { ruolo: 'risposta', titolo: pick(r, ['E tu cosa dici?', 'Rispondo così', 'Lo tengo lo stesso']), corpo: d ? `${d.conf > 0.4 ? 'Lo tengo' : 'Lo tengo come ipotesi'}: ${senzaAttacco(d.testo)}.` : '', a: d?.a, b: d?.b })
      break
    case 'catalogo':
      for (const w of nodi.slice(0, Math.max(3, N - 2))) {
        const f = allFs.find(x => x.s === w) ?? fatti.find(x => x.f?.s === w)?.f
        push({ ruolo: 'definizione', titolo: cap(w), corpo: riassunto(w) || (f ? cap(frase(f)) + '.' : ''), a: w })
      }
      push(d ? { ruolo: 'passaggio', titolo: cap(senzaAttacco(d.testo)), corpo: d.premesse.join('; ') + '.', catena: nodi.slice(0, 6) } : muta())
      break
    case 'manifesto':
      for (const t of [...tesi.slice(-3).map(t => t.testo), ...(d ? [d.testo] : [])]) push({ ruolo: 'copertina', titolo: cap(senzaAttacco(t)), corpo: '', a: tesi.find(x => x.testo === t)?.a ?? d?.a, b: tesi.find(x => x.testo === t)?.b ?? d?.b, rel: 'causa' })
      if (r() < 0.5) push(muta(d?.a, d?.b))
      break
  }
  // chiusa: a volte una domanda, a volte un'immagine sola, a volte niente
  if (r() < 0.35 && S.length < N) push({ ruolo: 'coda', titolo: cap(domanda), corpo: pick(r, ['Per ora resta aperta.', 'Non ho ancora la risposta.', 'Ci torno.']), a: d?.b })
  else if (r() < 0.3 && S.length < N) push(muta(d?.b))
  const schede = S.filter(x => x.titolo).slice(0, N)
  if (!schede.length) { mute = 0; schede.push(muta()!) }
  return { schede, d, titolo, domanda, lettura, forma }
}

// ─── rendere una scheda ─────────────────────────────────────────────────────
const lid = () => `e${Math.random().toString(36).slice(2, 9)}`

// ─── variazioni: lo stesso segno, trattato in modi diversi a seconda di cosa succede ──
type Modo = 'materia' | 'intero' | 'frammento' | 'ripetuto' | 'specchio' | 'spezzato' | 'sbiadito' | 'contorno' | 'ibrido' | 'pennello' | 'negativo'
function cv0(w: number, h: number) { const c = newCanvas(w, h); return { c, g: c.getContext('2d')! } }
function variante(src: HTMLCanvasElement, modo: Modo, r: Rnd, colore: string, altro?: HTMLCanvasElement): HTMLCanvasElement {
  const W = src.width, H = src.height
  const { c, g } = cv0(W, H)
  switch (modo) {
    case 'frammento': { const k = range(r, 0.35, 0.6); const x = r() * W * (1 - k), y = r() * H * (1 - k); g.drawImage(src, x, y, W * k, H * k, 0, 0, W, H); break }
    case 'ripetuto': {
      // non una griglia: una colonia. Copie di misure diverse che crescono una addosso all'altra e si fondono, dal centro verso fuori
      const n = 5 + Math.floor(r() * 8), pos: { x: number; y: number; k: number }[] = [{ x: W / 2, y: H / 2, k: range(r, 0.45, 0.65) }]
      for (let i = 1; i < n; i++) { const p = pos[Math.floor(r() * pos.length)], a = r() * 6.283, k = p.k * range(r, 0.5, 0.95), d = (p.k + k) * W * 0.28; pos.push({ x: Math.max(W * k / 2, Math.min(W - W * k / 2, p.x + Math.cos(a) * d)), y: Math.max(H * k / 2, Math.min(H - H * k / 2, p.y + Math.sin(a) * d)), k }) }
      for (const p of pos.sort((a, b) => a.k - b.k)) { g.save(); g.globalAlpha = range(r, 0.6, 1); g.translate(p.x, p.y); g.rotate((r() - 0.5) * 1.4); g.drawImage(src, -W * p.k / 2, -H * p.k / 2, W * p.k, H * p.k); g.restore() }
      break
    }
    case 'specchio': g.drawImage(src, 0, 0, W / 2, H, 0, 0, W / 2, H); g.save(); g.translate(W, 0); g.scale(-1, 1); g.drawImage(src, 0, 0, W / 2, H, 0, 0, W / 2, H); g.restore(); break
    case 'spezzato': { const n = 5 + Math.floor(r() * 6); for (let i = 0; i < n; i++) { const y0 = (i * H) / n, dx = (r() - 0.5) * W * 0.25; g.drawImage(src, 0, y0, W, H / n, dx, y0, W, H / n) } break }
    case 'sbiadito': g.globalAlpha = 0.28; g.drawImage(src, 0, 0); g.globalAlpha = 1; for (let i = 0; i < 400; i++) { g.clearRect(r() * W, r() * H, 3 + r() * 9, 3 + r() * 9) } break
    case 'contorno': { g.drawImage(src, 0, 0); g.globalCompositeOperation = 'destination-out'; g.drawImage(src, W * 0.035, H * 0.035, W * 0.93, H * 0.93); g.globalCompositeOperation = 'source-in'; g.fillStyle = colore; g.fillRect(0, 0, W, H); break }
    case 'ibrido': if (altro) { g.drawImage(altro, 0, 0, W, H); g.globalCompositeOperation = 'destination-in'; g.drawImage(src, 0, 0) } else g.drawImage(src, 0, 0); break
    case 'negativo': g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = colore; g.fillRect(0, 0, W, H); break
    case 'pennello': {
      g.lineCap = 'round'; g.strokeStyle = colore
      for (let i = 0; i < 90; i++) { g.lineWidth = W * range(r, 0.008, 0.04); g.globalAlpha = range(r, 0.5, 1); let x = r() * W, y = r() * H, a = r() * 6.3; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 10; k++) { a += (r() - 0.5) * 0.4; x += Math.cos(a) * W * 0.03; y += Math.sin(a) * H * 0.03; g.lineTo(x, y) } g.stroke() }
      g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.drawImage(src, 0, 0); break
    }
    default: g.drawImage(src, 0, 0)
  }
  return c
}
const MODI_RUOLO: Record<Ruolo, Modo[]> = {
  copertina: ['materia', 'intero', 'frammento', 'pennello'], prima: ['sbiadito', 'contorno'], domanda: ['frammento', 'contorno', 'negativo'],
  premessa: ['materia', 'intero', 'pennello', 'negativo', 'specchio', 'materia'], passaggio: ['ripetuto', 'spezzato', 'contorno'], conclusione: ['ibrido', 'materia', 'pennello'],
  controllo: ['contorno', 'specchio'], obiezione: ['spezzato', 'frammento', 'negativo'], fiducia: ['sbiadito', 'ripetuto'], visione: ['ripetuto', 'contorno', 'intero'],
  immagine: ['pennello', 'frammento', 'ibrido', 'spezzato', 'ripetuto'], altra: ['specchio', 'negativo', 'pennello'], coda: ['frammento', 'contorno'],
  silenzio: ['materia', 'materia', 'pennello', 'frammento', 'ibrido', 'spezzato', 'ripetuto', 'negativo', 'specchio'], parola: ['contorno', 'frammento', 'sbiadito', 'materia'], definizione: ['materia', 'intero', 'negativo', 'pennello'], risposta: ['frammento', 'contorno', 'specchio'],
}

// ─── composizioni: ognuna dice la relazione in un altro modo ──────────────────
type Lay = 'coppia' | 'zoom' | 'vuoto' | 'griglia' | 'sovrapposti' | 'diviso' | 'orbita' | 'solo'
const LAY_REL: Record<Rel, Lay[]> = {
  causa: ['coppia', 'zoom', 'vuoto', 'orbita'], contro: ['diviso', 'coppia', 'zoom'], dentro: ['orbita', 'sovrapposti', 'griglia'],
  identita: ['sovrapposti', 'griglia', 'zoom'], diventa: ['coppia', 'griglia', 'vuoto'], accanto: ['coppia', 'vuoto', 'griglia', 'diviso'],
}
let ultimoLay: Lay | null = null
export const ultimaImpaginazione = () => ultimoLay
let ultimoTipo: Impagina | null = null
const hx = (a: number, b: number, c: number) => '#' + [a, b, c].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
function mediaSotto(s: Sheet, x0: number, y0: number, x1: number, y1: number): string {
  const c = flatten(s, 0.2), g = c.getContext('2d')!
  const X = Math.max(0, Math.floor(x0 * c.width)), Y = Math.max(0, Math.floor(y0 * c.height))
  const w = Math.max(1, Math.min(c.width - X, Math.ceil((x1 - x0) * c.width))), h = Math.max(1, Math.min(c.height - Y, Math.ceil((y1 - y0) * c.height)))
  const d = g.getImageData(X, Y, w, h).data
  let R = 0, G = 0, B = 0, n = 0
  for (let i = 0; i < d.length; i += 16) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++ }
  return hx(R / n, G / n, B / n)
}
const lid2 = () => `e${Math.random().toString(36).slice(2, 9)}`

export async function rendiScheda(st: AgentState, r: Rnd, sc0: Scheda, i: number, N: number, nEp: number, ctx0: ToolCtx, face0: FaceId, opts: { studio?: (s: Sheet) => Promise<Sheet>; colori?: string[]; L?: Linguaggio } = {}): Promise<Sheet> {
  const L = opts.L
  let sc = sc0
  const face: FaceId = L?.tipo.face ?? face0
  // il colore cambia lungo l'episodio: la conclusione al negativo, l'obiezione sul colore acceso, le altre leggermente diverse
  const t0: Tone = ctx0.tone
  const t: Tone = sc.ruolo === 'conclusione' ? { ...t0, bg: t0.ink, ink: t0.bg, dark: !t0.dark } : sc.ruolo === 'obiezione' ? { ...t0, bg: t0.acc, acc: t0.ink, ink: ratio(t0.ink, t0.acc) > ratio(t0.bg, t0.acc) ? t0.ink : t0.bg } : t0
  const ctx: ToolCtx = { ...ctx0, tone: t }
  let s = emptySheet(800, 1000, t.bg)
  const M = Math.min(s.W, s.H)
  const lettura: FaceId = (FACES[face] as { upper?: boolean }).upper ? ((Object.keys(FACES) as FaceId[]).find(id => !(FACES[id] as { upper?: boolean }).upper && id !== 'mono') ?? face) : face
  // 1. il campo: una materia diversa a ogni tavola
  const mat = ['shader', 'pattern', 'grana', 'semina', 'pattern', 'shader'][(i + nEp) % 6]
  const tool = toolById(mat)
  if (tool && tool.available(s, ctx) && r() < 0.85) {
    const p = tool.propose(s, ctx)
    s = await applica(tool, s, { ...p, piece: false, alpha: range(r, 0.25, 0.75), blend: pick(r, ['source-over', 'multiply', 'overlay', 'screen']) }, ctx)
  }
  const colori = opts.colori?.length ? opts.colori : [t.ink, t.acc]
  if (r() < 0.65) s = withLayer(s, campoColore(s, r, [...colori, t.bg]))
  let zona = { x0: 0.07, y0: 0.66, x1: 0.93 }
  // il colore di un segno: stabile per parola dentro la sequenza, preso dalla tavolozza della sequenza
  const hash = (w: string) => [...w].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  const col = (x?: string) => (x ? colori[hash(x) % colori.length] : colori[0])
  const segno = async (w: string, modo: Modo, altro?: string) => {
    const base = await segnoDi(st, r, w, { ...t, ink: col(w), acc: col(w) }, ctx)
    const b2 = altro ? await segnoDi(st, r, altro, t, ctx) : undefined
    if (modo === 'materia') return maschera(base, r, ctx, colori)
    if (modo === 'pennello') return pennella(base, col(w), r, colori)
    return variante(base, modo, r, col(w), b2)
  }
  const metti = (cv: HTMLCanvasElement, x: number, y: number, scale: number, extra: Partial<{ alpha: number; blend: GlobalCompositeOperation; rot: number }> = {}) => {
    // la muffa a volte è la protagonista: grande, quasi a tutta tavola (il reel la farà crescere)
    const gen = generaDi(cv)
    if (gen && Math.random() < 0.3) { scale = Math.min(1.15, Math.max(scale, 0.75 + Math.random() * 0.35)); x = 0.5 + (x - 0.5) * 0.3; y = 0.42 + (y - 0.5) * 0.3 }
    s = withLayer(s, { id: lid2(), kind: 'motivo', genera: gen, canvas: sfuma(cv, 0.08), x, y, scale, rot: extra.rot ?? 0, alpha: extra.alpha ?? 1, blend: extra.blend ?? 'source-over' })
  }
  // 2. i segni, in una composizione scelta dalla relazione (e diversa dalla tavola prima)
  if (sc.catena?.length && sc.catena.length > 1 && (sc.ruolo === 'passaggio' || sc.ruolo === 'conclusione' || sc.ruolo === 'fiducia' || sc.ruolo === 'visione' || (sc.ruolo === 'premessa' && r() < 0.5))) {
    s = await catena(st, r, s, sc.catena, ctx, sc.ruolo === 'conclusione')
    if (sc.ruolo === 'conclusione' && sc.a && sc.b) metti(await segno(sc.a, 'ibrido', sc.b), 0.5, 0.36, 0.3, { blend: 'source-over', alpha: 0.9 })
    zona = { x0: 0.07, y0: 0.64, x1: 0.93 }
    ultimoLay = null
  } else if (sc.a) {
    const modi = L && r() < 0.6 ? (L.modi as Modo[]) : MODI_RUOLO[sc.ruolo]
    const ma = pick(r, modi), mb = pick(r, modi)
    // l'impaginazione dice la relazione: quale la dica meglio lo impara dal giudizio del suo occhio (con esplorazione)
    const TUTTE: Lay[] = ['coppia', 'zoom', 'vuoto', 'orbita', 'diviso', 'sovrapposti', 'griglia']
    let lay: Lay
    if (sc.b && sc.a !== sc.b) lay = scegliVisiva(st, r, sc.rel ?? 'accanto', TUTTE, [...LAY_REL[sc.rel ?? 'accanto'], ...((L?.lay ?? []) as Lay[])], ultimoLay)
    else lay = pick(r, (['zoom', 'vuoto', 'griglia', 'solo'] as Lay[]).filter(l => l !== ultimoLay))
    // le follie: i salti
    if (sc.follia === 'scala') lay = 'zoom'
    if (sc.follia === 'ossessione') lay = 'griglia'
    ultimoLay = lay
    const tinta = (cv: HTMLCanvasElement, w: string) => { const c = coloriDi(st, w)[0]; if (!c) return cv; const out = newCanvas(cv.width, cv.height), g = out.getContext('2d')!; g.drawImage(cv, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.8; g.fillStyle = c; g.fillRect(0, 0, out.width, out.height); return out }
    const wa = sc.follia === 'scambio' && sc.b ? sc.b : sc.a, wb = sc.follia === 'scambio' ? sc.a : sc.b
    let A = tinta(await segno(wa, ma, sc.b), wa)
    let B = sc.b && sc.b !== sc.a ? tinta(await segno(wb!, mb, sc.a), wb!) : null
    if (sc.follia === 'assenza') { A = newCanvas(4, 4); B = null; lay = 'vuoto' }
    const alto = r() < 0.5
    switch (lay) {
      case 'zoom': { const cx = pick(r, [0.15, 0.85]), cy = pick(r, [0.2, 0.45]); metti(A, cx, cy, sc.follia === 'scala' ? range(r, 1.8, 2.6) : range(r, 0.9, 1.3), { rot: (r() - 0.5) * 0.4 }); if (B) metti(B, 1 - cx * 0.9, 0.5, 0.16); zona = { x0: 0.07, y0: 0.68, x1: 0.93 }; break }
      case 'vuoto': { const x = pick(r, [1 / 3, 2 / 3]), y = alto ? 0.3 : 0.62; metti(A, x, y, 0.12); if (B) metti(B, 1 - x, y + 0.06, 0.07); zona = alto ? { x0: 0.07, y0: 0.6, x1: 0.93 } : { x0: 0.07, y0: 0.14, x1: 0.93 }; break }
      case 'griglia': { const n = sc.follia === 'ossessione' ? 8 + Math.floor(r() * 7) : 3 + Math.floor(r() * 2); const kk = Math.floor(r() * n * n); for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) metti(a * n + b === kk && B ? B : A, 0.18 + (a * 0.64) / (n - 1), 0.12 + (b * 0.42) / (n - 1), 0.5 / n, { alpha: a * n + b === kk ? 1 : 0.85 }); zona = { x0: 0.07, y0: 0.7, x1: 0.93 }; break }
      case 'sovrapposti': metti(A, 0.45, 0.36, 0.55); if (B) metti(B, 0.56, 0.42, 0.5, { blend: pick(r, ['difference', 'multiply', 'screen', 'exclusion']) }); zona = { x0: 0.07, y0: 0.72, x1: 0.93 }; break
      case 'diviso': { const cv = newCanvas(s.W, s.H); const g = cv.getContext('2d')!; g.fillStyle = t.acc; g.globalAlpha = 0.85; const sx = alto; if (sx) g.fillRect(0, 0, s.W / 2, s.H * 0.62); else g.fillRect(s.W / 2, 0, s.W / 2, s.H * 0.62); s = withLayer(s, fullLayer(s, lid2(), 'campo', cv)); metti(A, 0.25, 0.32, 0.36); if (B) metti(B, 0.75, 0.32, 0.36, { rot: r() < 0.3 ? Math.PI : 0 }); zona = { x0: 0.07, y0: 0.68, x1: 0.93 }; break }
      case 'orbita': { const cxo = 0.5, cyo = 0.36; if (B) metti(B, cxo, cyo, 0.26); const n = 5 + Math.floor(r() * 5); for (let k = 0; k < n; k++) { const an = (k / n) * Math.PI * 2; metti(A, cxo + Math.cos(an) * 0.3, cyo + Math.sin(an) * 0.24, 0.09, { rot: an }) } zona = { x0: 0.07, y0: 0.7, x1: 0.93 }; break }
      case 'coppia': { metti(A, 0.3, alto ? 0.3 : 0.4, range(r, 0.28, 0.4)); if (B) metti(B, 0.7, alto ? 0.42 : 0.3, range(r, 0.2, 0.34)); zona = { x0: 0.07, y0: 0.66, x1: 0.93 }; break }
      default: metti(A, pick(r, [0.5, 0.36, 0.64]), 0.36, range(r, 0.3, 0.55)); zona = { x0: 0.07, y0: 0.68, x1: 0.93 }
    }
  } else {
    zona = { x0: 0.07, y0: 0.4, x1: 0.93 }
  }
  if (sc.follia === 'inversione') {
    // figura e sfondo si scambiano: il campo diventa pieno, i segni diventano buchi
    const piena = newCanvas(s.W, s.H), g = piena.getContext('2d')!
    g.fillStyle = pick(r, colori); g.fillRect(0, 0, s.W, s.H)
    g.globalCompositeOperation = 'destination-out'
    g.drawImage(flatten({ ...s, bg: 'rgba(0,0,0,0)', layers: s.layers.filter(l => l.kind === 'motivo') }), 0, 0)
    s = withLayer(s, fullLayer(s, lid2(), 'inverso', piena))
  }
  if (sc.follia === 'caleido') { const tl = toolById('caleido'); if (tl) s = await applica(tl, s, { ...tl.propose(s, ctx), sostituisci: true, alpha: 1, blend: 'source-over' }, ctx) }
  if (sc.follia === 'grafico' && ctx.dati?.length) { const tl = toolById('grafico'); if (tl) s = await applica(tl, s, { ...tl.propose(s, ctx), y: 0.12, h: 0.35 }, ctx) }
  // lo studio: lavora la tavola come faceva prima (materia, luce, tagli, tracce), con l'occhio che giudica
  if (opts.studio) { try { s = await opts.studio(s) } catch { /* resta com'è */ } }
  if (sc.ruolo === 'parola') zona = { x0: 0.07, y0: pick(r, [0.5, 0.6]), x1: 0.93 }
  if (sc.corpo.length > 160 && zona.y0 > 0.6) zona = { ...zona, y0: 0.56 }
  // 3. il testo: intestazione, titolo, corpo; la piastra solo se sotto c'è troppa materia
  const ink = [t.ink, t.acc, t.bg, '#111111', '#f4f2ec'].sort((a, b) => ratio(b, t.bg) - ratio(a, t.bg))[0]
  const prova = { ...s, layers: [] }
  const scrivi = async (text: string, left: number, top: number, size: number, maxW: number, f: FaceId, color0 = ink, piastra0 = false) => {
    const L0 = (await textLayer(prova, { text, face: f, sizePx: size * M, color: '#000', x: 0, y: 0, maxW })).layers[0]
    const w = L0.canvas.width / s.W, h = L0.canvas.height / s.H
    // guarda che cosa c'è davvero sotto il testo e sceglie il colore che si legge; se nessuno basta, mette un fondo
    const sotto = mediaSotto(s, left, top, left + w, top + h)
    const cands = [color0, t.ink, t.bg, t.acc, '#111111', '#f4f2ec']
    const color = cands.sort((a, b) => ratio(b, sotto) - ratio(a, sotto))[0]
    const barra = !!L?.tipo.barra && f !== 'mono' && size >= 0.04
    const piastra = piastra0 || barra || ratio(color, sotto) < 4.5
    const fondo = barra ? t.acc : t.bg
    const TL = (await textLayer(prova, { text, face: f, sizePx: size * M, color: piastra ? ([t.ink, t.bg, '#111111', '#f4f2ec'].sort((a, b) => ratio(b, fondo) - ratio(a, fondo))[0]) : color, x: 0, y: 0, maxW })).layers[0]
    if (piastra) {
      const cv = newCanvas(Math.round(w * s.W), Math.round(h * s.H)); const g = cv.getContext('2d')!; g.fillStyle = barra ? t.acc : t.bg; g.fillRect(0, 0, cv.width, cv.height)
      s = withLayer(s, { id: lid2(), kind: 'piastra', canvas: cv, x: left + w / 2, y: top + h / 2, scale: Math.max(cv.width, cv.height) / M, rot: 0, alpha: barra ? 1 : 0.86, blend: 'source-over' })
    }
    s = withLayer(s, { ...TL, x: left + w / 2, y: top + h / 2 })
    return h
  }
  const RUOLO: Record<Ruolo, string> = { silenzio: '', parola: '', definizione: '', risposta: '', copertina: 'episodio', prima: 'prima', domanda: 'domanda', premessa: 'premessa', passaggio: 'passaggio', conclusione: 'conclusione', controllo: 'controllo', obiezione: 'obiezione', fiducia: 'fiducia', visione: 'visione', immagine: 'immagine', altra: 'altra strada', coda: 'prossima puntata' }
  void RUOLO
  const big = sc.ruolo === 'copertina' || sc.ruolo === 'domanda' || sc.ruolo === 'coda' || sc.ruolo === 'conclusione' || sc.ruolo === 'parola' || sc.ruolo === 'definizione'
  const pesante = s.layers.filter(l => ['ricetta', 'shader', 'pattern', 'grana'].includes(l.kind)).length > 0 || ultimoLay === 'zoom' || ultimoLay === 'sovrapposti'
  if (sc.follia === 'istruzione' && sc.a) { sc = { ...sc, titolo: realizza(pick(r, ['prendi {det:a}. mettilo accanto {a:b}. aspetta.', 'cerca {det:a} dove non c\'è {det:b}. scrivilo.', 'togli {det:b} {da:a}. guarda cosa resta.', 'ripeti {det:a} finché non diventa {det:b}.']), { a: sc.a, b: sc.b ?? sc.a }).toUpperCase(), corpo: sc.titolo } ; zona = { x0: 0.07, y0: 0.2, x1: 0.93 } }
  if (sc.follia === 'assenza' && sc.a) sc = { ...sc, corpo: `${sc.corpo} ${realizza('(Qui doveva esserci {det:a}. Non c\'è.)', { a: sc.a })}`.trim() }
  if (L?.tipo.maiuscolo && sc.titolo.length < 90) sc = { ...sc, titolo: sc.titolo.toUpperCase() }
  // il testo: un'idea tipografica per tavola (mai la stessa di quella prima), con le due regole ferme
  const vietate: Impagina[] = ultimoTipo ? [ultimoTipo] : []
  if (sc.ruolo === 'parola') vietate.push('colonna', 'verticale')
  const imp = await impaginaTesti(s, r, { titolo: sc.titolo, corpo: sc.corpo, fonte: sc.fonte ? `fonte: ${sc.fonte}` : undefined, numero: r() < 0.6 ? `${i}/${N}` : undefined }, {
    face: big ? face : lettura, lettura, colori: [...colori, t.ink, t.acc], bg: t.bg, maiuscolo: !!L?.tipo.maiuscolo, barra: !!L?.tipo.barra,
    espressivo: !!L?.tipo.immagine || sc.ruolo === 'parola' || sc.ruolo === 'copertina' || !!sc.follia, zona,
  }, vietate)
  s = imp.sheet
  ultimoTipo = imp.modo
  return s
}

/** i segni in fila, uniti da frecce: si vede il passaggio da un concetto all'altro */
async function catena(st: AgentState, r: Rnd, s0: Sheet, ws: string[], ctx: ToolCtx, enfasi: boolean): Promise<Sheet> {
  let s = s0
  const t = ctx.tone
  const tool = toolById(pick(r, ['grana', 'pattern', 'shader']))
  if (tool && tool.available(s, ctx)) s = await applica(tool, s, { ...tool.propose(s, ctx), alpha: range(r, 0.2, 0.5) }, ctx)
  const n = Math.min(6, ws.length)
  const pos = (k: number) => [0.14 + (0.72 * k) / Math.max(1, n - 1), 0.36 + (k % 2 ? -0.06 : 0.06) * (n > 3 ? 1 : 0)]
  const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
  g.strokeStyle = t.acc === t.bg ? t.ink : t.acc; g.fillStyle = g.strokeStyle; g.lineWidth = 3
  for (let k = 0; k < n - 1; k++) {
    const [x0, y0] = pos(k), [x1, y1] = pos(k + 1)
    const ax = x0 * s.W + 50, ay = y0 * s.H, bx = x1 * s.W - 50, by = y1 * s.H
    g.setLineDash(enfasi && n === 2 ? [10, 8] : [])
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke()
    const an = Math.atan2(by - ay, bx - ax)
    g.setLineDash([]); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 14 * Math.cos(an - 0.4), by - 14 * Math.sin(an - 0.4)); g.lineTo(bx - 14 * Math.cos(an + 0.4), by - 14 * Math.sin(an + 0.4)); g.closePath(); g.fill()
  }
  s = withLayer(s, fullLayer(s, lid(), 'frecce', cv))
  for (let k = 0; k < n; k++) {
    const [x, y] = pos(k)
    const c = await segnoDi(st, r, ws[k], t, ctx)
    const scale = n <= 2 ? 0.34 : n <= 4 ? 0.2 : 0.15
    s = withLayer(s, { id: lid(), kind: 'motivo', genera: generaDi(c), canvas: c, x, y, scale: enfasi && (k === 0 || k === n - 1) ? scale * 1.3 : scale, rot: 0, alpha: 1, blend: 'source-over' })
  }
  // le parole sotto ai segni
  const cvT = newCanvas(s.W, s.H), gt = cvT.getContext('2d')!
  const { fontCss } = await import('@/components/studio/genera/raster')
  gt.font = fontCss(FACES.mono, Math.round(M_(s) * 0.018)); gt.textAlign = 'center'; gt.fillStyle = [t.ink, t.acc].sort((a, b) => ratio(b, t.bg) - ratio(a, t.bg))[0]
  for (let k = 0; k < n; k++) { const [x, y] = pos(k); gt.fillText(ws[k].toUpperCase(), x * s.W, (y + (n <= 2 ? 0.2 : 0.13)) * s.H) }
  return withLayer(s, fullLayer(s, lid(), 'etichette', cvT))
}
const M_ = (s: Sheet) => Math.min(s.W, s.H)

/** dopo l'episodio: la visione si aggiorna, l'episodio resta in archivio */
export function chiudiEpisodio(st: AgentState, r: Rnd, info: Omit<EpisodioInfo, 'n' | 'id'>, d: Deduzione | null): EpisodioInfo {
  const W = st as WithV
  const V = ensureVisione(st, r)
  if (d && !d.ritirata && d.conf > 0.3) {
    V.tesi = [...V.tesi, { testo: d.testo, conf: d.conf, da: st.day, a: d.a, b: d.b }].slice(-12)
    ;(st as AgentState & { premesseUsate?: string[] }).premesseUsate = [...((st as AgentState & { premesseUsate?: string[] }).premesseUsate ?? []), ...d.premesse].slice(-80)
    V.storia.push({ day: st.day, nota: `aggiungo: ${d.testo}` })
  }
  // le tesi contraddette da una deduzione nuova escono dalla visione
  if (d) for (const t of V.tesi) if (t.a === d.a && t.b === d.b && t.testo !== d.testo && d.ritirata === false && d.conf > t.conf) { t.ritirata = true; V.storia.push({ day: st.day, nota: `lascio: ${t.testo}` }) }
  V.domanda = info.domanda
  const ep: EpisodioInfo = { ...info, id: uid(), n: (W.episodi?.length ?? 0) + 1, ...(d ? { tipo: d.tipo, modello: d.modello } : {}) }
  W.episodi = [...(W.episodi ?? []), ep].slice(-300)
  const A = ensureAtlante(st)
  if (d) A.deduzioni = [...(A.deduzioni ?? []), { ...d, day: st.day }].slice(-150)
  return ep
}

export function didascalia(st: AgentState, titolo: string, d: Deduzione | null, domanda: string): string {
  const V = getVisione(st)
  return concorda(`${titolo}.\n\n${d ? `${d.premesse.map((p, i) => `${i + 1}. ${cap(p)}`).join('\n')}\n→ ${cap(d.testo)} (ci credo al ${Math.round(d.conf * 100)}%).` : ''}\n\n${Math.random() < 0.4 ? cap(domanda) + '\n\n' : ''}${V ? `#${V.titolo.split(' ').slice(-1)[0]} ` : ''}#generatoreprocedurale #artistaosservatore`)
}
void art
