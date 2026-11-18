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
import { newCanvas, withLayer, fullLayer, emptySheet, type Sheet } from '../hands/sheet'
import { textLayer, toolById, type ToolCtx } from '../hands/tools'
import { ratio } from '../eyes/judgement'
import { ensureAtlante, mettiInScena, segnoDi, type Enunciato, type Rel } from './atlante'
import { coerenza, deduci, diciDeduzione, fattiDi, fattiSu, scriviObiezione, type Deduzione, type Fatto } from '../voice/scrittura'
import { art, concorda, realizza } from '../voice/lingua'
import { getCantieri } from './cantiere'
import { APERTURE } from '../voice/conclusioni'

// ─── la visione ─────────────────────────────────────────────────────────────
export interface Tesi { testo: string; conf: number; da: number; a: string; b: string; ritirata?: boolean }
export interface Visione { titolo: string; tesi: Tesi[]; domanda: string; storia: { day: number; nota: string }[] }
export interface EpisodioInfo { lettura?: string; coppia?: string; id: string; n: number; titolo: string; day: number; schede: string[]; conclusione: string; domanda: string; caption: string }
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
type Ruolo = 'copertina' | 'prima' | 'domanda' | 'premessa' | 'passaggio' | 'conclusione' | 'controllo' | 'obiezione' | 'fiducia' | 'visione' | 'immagine' | 'altra' | 'coda'
interface Scheda { ruolo: Ruolo; titolo: string; corpo: string; a?: string; b?: string; rel?: Rel; catena?: string[]; fonte?: string }

const REL_VERBO = (f: Fatto): Rel => (f.neg ? 'contro' : /^(divent|trasform|cambi|passa)/.test(f.v.inf) ? 'diventa' : /^(restare|stare|vivere|abitare|contenere)/.test(f.v.inf) ? 'dentro' : /^(essere|sembrare)/.test(f.v.inf) ? 'identita' : 'causa')
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function pianifica(st: AgentState, r: Rnd, N: number, filo: string | null, frase: (f: Fatto) => string, letture: Reading[] = []): { schede: Scheda[]; d: Deduzione | null; titolo: string; domanda: string; lettura?: string } {
  const V = ensureVisione(st, r)
  const A = ensureAtlante(st)
  const ep = getEpisodi(st)
  const prev = ep[ep.length - 1]
  const C = getCantieri(st).slice(-1)[0]
  const concetti = [...new Set([filo, ...(C?.capitoli.map(k => k.concetto) ?? []), ...V.tesi.slice(-4).flatMap(t => [t.a, t.b]), ...Object.values(A.concetti).sort((a, b) => b.frasi - a.frasi).slice(0, 6).map(c => c.word)].filter(Boolean) as string[])].slice(0, 8)
  // niente coppie già raccontate; si riparte dalla domanda con cui era finito l'episodio prima
  const giaFatte = new Set(ep.map(e => e.coppia).filter(Boolean))
  const dallaDomanda = new Set((prev?.domanda ?? '').toLowerCase().split(/[^a-zàèéìòù]+/))
  const ds = deduci(st, r, [...new Set([...dallaDomanda].filter(w => w.length > 3 && ensureAtlante(st).concetti[w]).concat(concetti))].slice(0, 9))
    .filter(d => !V.tesi.some(t => t.testo === d.testo) && !giaFatte.has(`${d.a}|${d.b}`) && !giaFatte.has(`${d.b}|${d.a}`))
  // la deduzione centrale: preferisce quelle lunghe, che toccano la domanda aperta, abbastanza credibili
  const d = ds.length ? weighted(r, ds, x => (x.conf + 0.1) * (1 + (x.passi - 1) * 0.8) * (dallaDomanda.has(x.a) || dallaDomanda.has(x.b) ? 3 : 1) * (filo && (x.a === filo || x.b === filo) ? 1.5 : 1) * (x.tipo === 'contesa' ? 0.5 : 1), 0.7) : null
  const schede: Scheda[] = []
  let lettura: string | undefined
  const domanda = d ? realizza(pick(r, ['che cosa lega {det:a} {a:b}?', 'da dove viene {det:b}?', 'chi muove {det:b}?', 'cosa c\'entra {det:a} con {det:b}?']), { a: d.a, b: d.b }) : V.domanda
  const senzaAttacco = (x: string) => { let t = x; for (const a of APERTURE.slice().sort((p, q) => q.length - p.length)) if (t.toLowerCase().startsWith(a.toLowerCase())) { t = t.slice(a.length).trim(); break } return t }
  let titolo = d ? cap(senzaAttacco(d.testo).split(/[:;]/)[0].split(/, (?:e|ma|anche|almeno) /)[0]) : cap(domanda)
  schede.push({ ruolo: 'copertina', titolo, corpo: `${V.titolo}. Episodio ${ep.length + 1}.`, a: d?.a, b: d?.b })
  if (prev) schede.push({ ruolo: 'prima', titolo: 'Nella puntata precedente', corpo: `${cap(prev.conclusione)}. E restava una domanda: ${prev.domanda}`, a: d?.a })
  schede.push({ ruolo: 'domanda', titolo: cap(domanda), corpo: pick(r, ['Provo a rispondere solo con quello che ho letto, e con quello che ne ricavo.', 'Metto in fila quello che so. Poi vedo dove porta.', 'Parto dalle fonti. Il resto lo deduco io, e lo dico quando non sono sicuro.']), a: d?.a, b: d?.b })
  if (d) {
    // premesse: i fatti su cui poggia la deduzione, uno per tavola, con la sua fonte
    const fs = [...new Map(concetti.flatMap(c => fattiSu(st, c, 30)).map(f => [frase(f), f])).values()]
    const usate = d.premesse.map(p => fs.find(f => frase(f) === p || p.includes(f.s) && (f.o ? p.includes(f.o) : true))).filter(Boolean) as Fatto[]
    d.premesse.forEach((p, i) => {
      const f = usate[i]
      schede.push({ ruolo: 'premessa', titolo: cap(p), corpo: f ? `Lo leggo in «${f.fonte}». ${pick(r, ['È un fatto, non un\'opinione mia.', 'Lo prendo così com\'è.', 'Per ora lo do per buono.'])}` : 'È una cosa che ho già stabilito prima.', a: f?.s, b: f?.o ?? f?.compl[0]?.n, rel: f ? REL_VERBO(f) : 'accanto', fonte: f?.fonte })
      if (i > 0 && i < d.premesse.length) schede.push({ ruolo: 'passaggio', titolo: pick(r, ['Metto insieme', 'Il passaggio', 'Qui si collega']), corpo: `${cap(d.premesse[i - 1])}; ${p}. ${pick(r, ['Le due cose hanno un punto in comune.', 'Il pezzo che le unisce è lo stesso.', 'Una finisce dove comincia l\'altra.'])}`, catena: [d.a, ...(usate[i - 1]?.o ? [usate[i - 1].o!] : []), ...(f?.o ? [f.o] : []), d.b].filter((x, k, xs) => xs.indexOf(x) === k) })
    })
    schede.push({ ruolo: 'conclusione', titolo: cap(d.testo), corpo: diciDeduzione(r, d), catena: [d.a, d.b], a: d.a, b: d.b })
    // controllo di coerenza contro le tesi e le deduzioni passate
    const co = coerenza(st, r, d, A.deduzioni ?? [])
    schede.push({ ruolo: 'controllo', titolo: co.ritrattazione ? 'Non torna' : 'Controllo', corpo: co.ritrattazione ? diciDeduzione(r, co.ritrattazione) : `Ho confrontato questa conclusione con le ${(A.deduzioni ?? []).length} cose che avevo già dedotto: non ne contraddice nessuna.`, a: d.a, b: d.b, rel: co.ritrattazione ? 'contro' : 'identita' })
    const ob = scriviObiezione(st, r, d.a) ?? scriviObiezione(st, r, d.b)
    if (ob) schede.push({ ruolo: 'obiezione', titolo: 'Un\'obiezione', corpo: ob.testo, a: d.a, b: d.b, rel: 'contro', fonte: ob.fonte })
    const pct = Math.round(d.conf * 100)
    schede.push({ ruolo: 'fiducia', titolo: `Ci credo al ${pct}%`, corpo: `${d.passi} passaggi, ${new Set(usate.map(f => f.fonte)).size} fonti. ${pct > 50 ? 'Abbastanza per tenerla.' : pct > 25 ? 'La tengo, ma come ipotesi.' : 'È poco: la segno, ma non ci costruisco sopra.'}`, catena: [d.a, d.b] })
    // altre strade, se c'è posto
    for (const x of ds.filter(y => y !== d && (y.a === d.a || y.b === d.b)).slice(0, Math.max(0, N - schede.length - 3))) schede.push({ ruolo: 'altra', titolo: cap(x.testo.split(/[:;]/)[0]), corpo: `Un'altra strada dagli stessi fatti. ${diciDeduzione(r, x)}`, a: x.a, b: x.b, rel: x.segno < 0 ? 'contro' : 'causa' })
  }
  // niente di nuovo da dedurre: l'episodio racconta una lettura, e la collega alla visione
  if (!d) {
    const lette = new Set(ep.map(e => e.lettura).filter(Boolean))
    const tutte = [...letture, ...st.readings.slice().reverse()].filter(x => x.text.length > 200)
    const usoDi = (t: string) => ep.filter(e => e.lettura === t).length
    const nuovaLettura = tutte.find(x => !lette.has(x.title))
    const ripassabili = (A.deduzioni ?? []).filter(x => !x.ritirata && x.tipo !== 'ritrattazione').length
    // se ha già letto tutto, ma ha conclusioni da rimettere alla prova, alterna: un ripasso, poi una rilettura
    const ultimoRipasso = ep.length && !ep[ep.length - 1].lettura && !ep[ep.length - 1].coppia
    const rd = nuovaLettura ?? (ripassabili >= 2 && !ultimoRipasso ? undefined : tutte.slice().sort((a, b) => usoDi(a.title) - usoDi(b.title))[0])
    if (rd && lette.has(rd.title)) schede.push({ ruolo: 'prima', titolo: 'Lo rileggo', corpo: `Avevo già letto «${rd.title}». Lo riprendo: con quello che so adesso, forse dice altro.` })
    if (rd) {
      const fs = sentences(rd.text).slice(0, 80).flatMap(x => fattiDi(x, rd.title)).slice(0, Math.max(3, N - 7))
      titolo = cap(rd.title); lettura = rd.title
      schede[0] = { ruolo: 'copertina', titolo: cap(rd.title), corpo: `Oggi leggo. ${V.titolo}: episodio ${ep.length + 1}.`, a: fs[0]?.s, b: fs[0]?.o }
      const qi = schede.findIndex(x => x.ruolo === 'domanda')
      const dq: Scheda = { ruolo: 'domanda', titolo: 'Che cosa dice questo testo?', corpo: `Non ho ancora niente da dedurre. Allora leggo «${rd.title}» e lo smonto in fatti, uno per tavola.` }
      if (qi >= 0) schede[qi] = dq; else schede.push(dq)
      for (const f of fs) schede.push({ ruolo: 'premessa', titolo: cap(frase(f)), corpo: `Da «${rd.title}».`, a: f.s, b: f.o ?? f.compl[0]?.n, rel: REL_VERBO(f), fonte: rd.title })
      const tocca = [...new Set(fs.flatMap(f => [f.s, f.o]).filter(w => w && V.tesi.some(t => t.a === w || t.b === w)))] as string[]
      schede.push({ ruolo: 'visione', titolo: tocca.length ? 'Dove tocca la mia visione' : 'Materiale nuovo', corpo: tocca.length ? `Questo testo parla anche di ${tocca.join(', ')}: lo stesso terreno delle mie tesi (${V.tesi.filter(t => !t.ritirata).slice(-2).map(t => t.testo).join('; ')}).` : 'Per ora non tocca le mie tesi. Lo tengo da parte: domani ci ragiono sopra.', catena: tocca.slice(0, 4) })
    }
  }
  // né deduzioni nuove né letture: ripassa quello che ha dedotto, e lo mette alla prova
  if (!d && !lettura) {
    const vecchie = (A.deduzioni ?? []).filter(x => !x.ritirata && x.tipo !== 'ritrattazione').slice(-6)
    titolo = 'Ripasso quello che penso'
    schede[0] = { ruolo: 'copertina', titolo, corpo: `${V.titolo}. Episodio ${ep.length + 1}: rimetto in fila le mie conclusioni e le metto alla prova.`, a: vecchie[0]?.a, b: vecchie[0]?.b }
    for (const x of vecchie) schede.push({ ruolo: 'conclusione', titolo: cap(x.testo.split(/[:;]/)[0]), corpo: `Lo avevo dedotto il giorno ${x.day}, con fiducia ${Math.round(x.conf * 100)}%.`, catena: [x.a, x.b], a: x.a, b: x.b })
    const bersaglio = vecchie[vecchie.length - 1]
    const ob = bersaglio ? scriviObiezione(st, r, bersaglio.a) ?? scriviObiezione(st, r, bersaglio.b) : null
    if (ob) { schede.push({ ruolo: 'obiezione', titolo: 'Regge?', corpo: ob.testo, a: bersaglio!.a, b: bersaglio!.b, rel: 'contro', fonte: ob.fonte }); bersaglio!.conf *= 0.8 }
  }
  // cosa cambia nella visione
  const nuova = d && !d.ritirata && d.conf > 0.3
  if (!lettura) schede.push({ ruolo: 'visione', titolo: nuova ? 'Cosa cambia' : 'Niente di nuovo, per ora', corpo: nuova ? `La mia visione («${V.titolo}») si allarga: ${d!.testo}. Le tesi che tengo adesso: ${[...V.tesi.filter(t => !t.ritirata).slice(-3).map(t => t.testo), d!.testo].join('; ')}.` : `La visione resta quella: ${V.titolo}. Mi manca ancora materiale.`, catena: [...new Set(V.tesi.filter(t => !t.ritirata).slice(-4).flatMap(t => [t.a, t.b]).concat(d ? [d.a, d.b] : []))].slice(0, 6) })
  const coppie = [...new Set(schede.filter(x => x.a && x.b).map(x => `${x.a}|${x.b}`))].map(k => k.split('|'))
  let riempi = 0
  while (schede.length < N - 1 && riempi++ < 2 && coppie.length) { const [a0, b0] = pick(r, coppie); schede.push({ ruolo: 'immagine', titolo: cap(pick(r, [a0, b0])), corpo: '', a: a0, b: b0, rel: pick(r, ['causa', 'dentro', 'identita', 'diventa', 'contro'] as Rel[]) }) }
  const nextQ = d ? realizza(pick(r, ['e se fosse {det:b} a muovere {det:a}?', 'che cosa succede {a:a} quando manca {det:b}?', 'chi altro tocca {det:b}?']), { a: d.a, b: d.b }) : V.domanda
  schede.push({ ruolo: 'coda', titolo: 'Prossima puntata', corpo: cap(nextQ), a: d?.b })
  return { schede: schede.slice(0, N), d, titolo, domanda: nextQ, lettura }
}

// ─── rendere una scheda ─────────────────────────────────────────────────────
const lid = () => `e${Math.random().toString(36).slice(2, 9)}`

export async function rendiScheda(st: AgentState, r: Rnd, sc: Scheda, i: number, N: number, nEp: number, ctx: ToolCtx, face: FaceId): Promise<Sheet> {
  const t: Tone = ctx.tone
  let s = emptySheet(800, 1000, t.bg)
  const M = Math.min(s.W, s.H)
  const lettura: FaceId = (FACES[face] as { upper?: boolean }).upper ? ((Object.keys(FACES) as FaceId[]).find(id => !(FACES[id] as { upper?: boolean }).upper && id !== 'mono') ?? face) : face
  let zona = { x0: 0.07, y0: 0.66, x1: 0.93 }
  // il visivo, secondo il ruolo
  if (!(sc.catena?.length && (sc.ruolo === 'passaggio' || sc.ruolo === 'conclusione' || sc.ruolo === 'fiducia')) && sc.a && sc.b && sc.a !== sc.b) {
    const en: Enunciato = { a: sc.a, b: sc.b, rel: sc.rel ?? 'causa', citazione: '', fonte: sc.fonte ?? '', frase: sc.titolo, postura: 'legge', perche: '' }
    const m = await mettiInScena(st, r, en, s, ctx)
    s = m.sheet
    const z = m.libere[0]
    zona = { x0: z.x0, y0: Math.min(z.y0, 0.7), x1: z.x1 }
  } else if (sc.catena?.length) {
    s = await catena(st, r, s, sc.catena, ctx, sc.ruolo === 'conclusione')
    zona = { x0: 0.07, y0: 0.64, x1: 0.93 }
  } else {
    const tool = toolById(pick(r, ['grana', 'pattern']))
    if (tool) s = await tool.apply(s, { ...tool.propose(s, ctx), alpha: 0.25 }, ctx)
    if (sc.a) { const cv = await segnoDi(st, r, sc.a, t, ctx); s = withLayer(s, { id: lid(), kind: 'motivo', canvas: cv, x: 0.72, y: 0.3, scale: 0.36, rot: 0, alpha: 0.9, blend: 'source-over' }) }
    zona = { x0: 0.07, y0: sc.ruolo === 'domanda' || sc.ruolo === 'coda' ? 0.5 : 0.56, x1: 0.93 }
  }
  // il testo: intestazione, titolo, corpo
  const ink = [t.ink, t.acc, '#111111', '#f4f2ec'].sort((a, b) => ratio(b, t.bg) - ratio(a, t.bg))[0]
  const prova = { ...s, layers: [] }
  const metti = async (text: string, left: number, top: number, size: number, maxW: number, f: FaceId, color = ink, piastra = false) => {
    const L = (await textLayer(prova, { text, face: f, sizePx: size * M, color, x: 0, y: 0, maxW })).layers[0]
    const w = L.canvas.width / s.W, h = L.canvas.height / s.H
    if (piastra) {
      const cv = newCanvas(Math.round(w * s.W), Math.round(h * s.H)); const g = cv.getContext('2d')!; g.fillStyle = t.bg; g.fillRect(0, 0, cv.width, cv.height)
      s = withLayer(s, { id: lid(), kind: 'piastra', canvas: cv, x: left + w / 2, y: top + h / 2, scale: Math.max(cv.width, cv.height) / M, rot: 0, alpha: 0.88, blend: 'source-over' })
    }
    s = withLayer(s, { ...L, x: left + w / 2, y: top + h / 2 })
    return h
  }
  const RUOLO: Record<Ruolo, string> = { copertina: 'episodio', prima: 'prima', domanda: 'domanda', premessa: 'premessa', passaggio: 'passaggio', conclusione: 'conclusione', controllo: 'controllo', obiezione: 'obiezione', fiducia: 'fiducia', visione: 'visione', immagine: 'immagine', altra: 'altra strada', coda: 'prossima puntata' }
  await metti(`EP. ${nEp} · ${i}/${N} · ${RUOLO[sc.ruolo].toUpperCase()}`, 0.07, 0.04, 0.016, 0.8, 'mono')
  const big = sc.ruolo === 'copertina' || sc.ruolo === 'domanda' || sc.ruolo === 'coda'
  const h = await metti(sc.titolo, zona.x0, zona.y0, big ? (sc.titolo.length > 40 ? 0.055 : 0.07) : sc.titolo.length > 60 ? 0.034 : 0.044, Math.min(0.86, zona.x1 - zona.x0), big ? face : lettura, ink, true)
  if (sc.corpo) {
    let corpo = sc.corpo
    if (corpo.length > 520) corpo = corpo.slice(0, 520).replace(/\s\S*$/, '') + '…'
    await metti(corpo, zona.x0, Math.min(0.9, zona.y0 + h + 0.012), corpo.length > 300 ? 0.02 : 0.024, Math.min(0.82, zona.x1 - zona.x0), lettura, ink, true)
  }
  if (sc.fonte) await metti(`fonte: ${sc.fonte}`, 0.07, 0.955, 0.013, 0.6, 'mono')
  return s
}

/** i segni in fila, uniti da frecce: si vede il passaggio da un concetto all'altro */
async function catena(st: AgentState, r: Rnd, s0: Sheet, ws: string[], ctx: ToolCtx, enfasi: boolean): Promise<Sheet> {
  let s = s0
  const t = ctx.tone
  const tool = toolById(pick(r, ['grana', 'pattern', 'shader']))
  if (tool && tool.available(s, ctx)) s = await tool.apply(s, { ...tool.propose(s, ctx), alpha: range(r, 0.2, 0.5) }, ctx)
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
    s = withLayer(s, { id: lid(), kind: 'motivo', canvas: c, x, y, scale: enfasi && (k === 0 || k === n - 1) ? scale * 1.3 : scale, rot: 0, alpha: 1, blend: 'source-over' })
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
    V.storia.push({ day: st.day, nota: `aggiungo: ${d.testo}` })
  }
  // le tesi contraddette da una deduzione nuova escono dalla visione
  if (d) for (const t of V.tesi) if (t.a === d.a && t.b === d.b && t.testo !== d.testo && d.ritirata === false && d.conf > t.conf) { t.ritirata = true; V.storia.push({ day: st.day, nota: `lascio: ${t.testo}` }) }
  V.domanda = info.domanda
  const ep: EpisodioInfo = { ...info, id: uid(), n: (W.episodi?.length ?? 0) + 1 }
  W.episodi = [...(W.episodi ?? []), ep].slice(-300)
  const A = ensureAtlante(st)
  if (d) A.deduzioni = [...(A.deduzioni ?? []), { ...d, day: st.day }].slice(-150)
  return ep
}

export function didascalia(st: AgentState, titolo: string, d: Deduzione | null, domanda: string): string {
  const V = getVisione(st)
  return concorda(`${titolo}.\n\n${d ? `${d.premesse.map((p, i) => `${i + 1}. ${cap(p)}`).join('\n')}\n→ ${cap(d.testo)} (ci credo al ${Math.round(d.conf * 100)}%).` : ''}\n\nProssima puntata: ${domanda}\n\n${V ? `#${V.titolo.split(' ').slice(-1)[0]} ` : ''}#generatoreprocedurale #artistaosservatore`)
}
void art
