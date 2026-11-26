/**
 * Il giro senza schermo: chi lo sveglia (GitHub Actions ogni 30 minuti) apre la pagina in un Chrome invisibile,
 * gli ridà la memoria, e chiama queste funzioni: qualche studio, una sequenza, poi prepara il post
 * (per ogni tavola scelta: l'immagine e il suo pezzo di musica; il video lo monta ffmpeg fuori dal browser).
 */
import * as T from './transport'
import { addestra, esito as esitoReel, type Giudice, type Tratti } from './mind/giudice'
import { loadOrCreate, runDay } from './day'
import { getEpisodi } from './mind/episodio'
import { propostaDi, type Forma } from './mind/curatore'
import { rng } from './core/rng'
import { esito, type TipoD } from './voice/conclusioni'
import { premiaStile, type Gusto } from './suono/beat'
import { impara, gusto } from './eyes/gusto'
import { tavoleAdHoc } from './mind/adhoc'
import { posDi } from './reader/concepts'
import { GENERICI } from './mind/pensiero'
import { cura, getProfilo } from './mind/profilo'
import { suona, wav } from './suono/musica'
import type { AgentState, Work } from './core/types'
import { coloreDi, descriviMossa, getRetorica } from './mind/retorica'
import { TONES } from '@/components/studio/genera/recipes'
import { FACES, type FaceId } from '@/components/studio/genera/fonts'

type Ep = ReturnType<typeof getEpisodi>[number] & { instagram?: { id?: string; permalink?: string; quando: string; errore?: string } }

/**
 * L'attesa: non pubblica a orario. Ogni giro legge e studia; quello che impara di nuovo (novità × interesse
 * delle giornate) si accumula. Quando ha accumulato abbastanza per dire qualcosa — la soglia cambia ogni volta,
 * a seconda del suo temperamento — prepara una sequenza. La sequenza pronta esce su Instagram appena possibile,
 * con un ritmo suo tra mezz'ora e 4 ore dal post precedente; nel frattempo continua a leggere.
 */
interface Attesa { giri: number; accumulo: number; soglia: number; pronta?: string; tentativi?: number; ultimoPost?: string; forma?: Forma; storia?: string }
type ConAttesa = AgentState & { attesa?: Attesa }
const getAttesa = (st: AgentState): Attesa => ((st as ConAttesa).attesa ??= { giri: 0, accumulo: 0, soglia: 1.4 })
const nuovaSoglia = (st: AgentState) => 0.9 + Math.random() * 1.2 + (st.temperature < 0.4 ? 0.4 : 0)

export async function giro(o: { studi: number; sequenza?: boolean; epN: number; reel?: boolean; forza?: boolean; deve?: string[]; log: (m: string) => void; oreTraPost?: number; oreMax?: number }) {
  let st: AgentState = await loadOrCreate()
  const fatte: string[] = []
  // il fotografo del cosmo: prima di lavorare, una foto di un pianeta vero (l'ultima scoperta dell'osservatorio, o un indirizzo
  // del giorno). Va nel rullino: lo strumento «Fotografia del cosmo» ne prende mare, coste, rocce o il disco intero.
  try {
    await preparaCosmo()
    const scop = (st as unknown as { citta?: { osservatorio?: { scoperte?: { n: number }[] } } }).citta?.osservatorio?.scoperte ?? []
    const { fotografa } = await import('./hands/fotocosmo')
    for (const n of [scop[scop.length - 1]?.n, 1e9 + st.day * 7919].filter((x): x is number => typeof x === 'number')) { const f = await fotografa(n); if (f) { o.log(`il fotografo del cosmo: ${f.nome}${f.mare ? ', con il mare' : ''}`); break } }
  } catch { /* senza foto si lavora lo stesso */ }
  const una = async (seq: boolean) => {
    try {
      const r = await runDay(st, { fast: true, episodio: seq ? o.epN : undefined, reel: seq && !!o.reel, reelForza: !!o.forza, log: o.log, preview: () => {}, onWork: (w: Work) => { fatte.push(w.id) }, shouldStop: () => false })
      st = r.state
    } catch (e) {
      o.log(`Errore nella giornata ${st.day + 1}: ${e instanceof Error ? e.message : String(e)}. La salto.`)
      st = { ...st, day: st.day + 1 }; await T.putState(st).catch(() => {})
    }
  }
  for (let i = 0; i < o.studi; i++) {
    await una(false)
    const h = st.history[st.history.length - 1]
    const A = getAttesa(st)
    if (h && h.day === st.day) A.accumulo += Math.max(0, h.novelty) * Math.max(0.2, h.interest) + (h.kept ? 0.05 : 0)
  }
  const A = getAttesa(st)
  A.giri++
  let nuova: string | null = null
  // ha abbastanza da dire? Il ritmo è suo, ma dentro un intervallo: mai meno di mezz'ora tra un post e l'altro,
  // mai più di 4 ore (se si avvicinano le 4 ore senza niente di pronto, dice quello che ha)
  const daUltimo = A.ultimoPost ? (Date.now() - new Date(A.ultimoPost).getTime()) / 3600e3 : A.giri * 0.5
  const scade = daUltimo >= (o.oreMax ?? 4) - 0.6
  const pronto = o.sequenza ?? (!A.pronta && (A.accumulo >= A.soglia || scade))
  if (scade && !A.pronta && A.accumulo < A.soglia) o.log('Sono quasi 4 ore che non dico niente: parlo con quello che ho.')
  if (pronto) {
    o.log(`Ho accumulato abbastanza per dire qualcosa (${A.accumulo.toFixed(2)} su ${A.soglia.toFixed(2)}, dopo ${A.giri} giri): preparo una sequenza.`)
    await una(true)
    const ep = getEpisodi(st).slice(-1)[0] as Ep | undefined
    if (ep && ep.day === st.day) {
      nuova = ep.id; const B = getAttesa(st); B.accumulo = 0; B.giri = 0; B.soglia = nuovaSoglia(st)
      // la forma la sceglie lui (il curatore); se sono quasi 4 ore di silenzio, almeno una storia
      let P = propostaDi(st)
      if (P?.epId !== ep.id) P = { forma: 'carosello', epId: ep.id, ids: ep.schede, perche: '', day: st.day }
      // l'agenda: se tocca a un carosello, la sequenza esce come carosello anche se lui la terrebbe nel sito
      if (o.deve?.includes('carosello') && (P.forma === 'niente' || P.forma === 'storia')) P = { ...P, forma: 'carosello', ids: ep.schede, perche: 'tocca a un carosello' }
      if (P.forma === 'niente' && scade) { const best = (await T.listWorks()).filter(w => ep.schede.includes(w.id)).sort((a, b) => b.interest - a.interest)[0]; if (best) P = { ...P, forma: 'storia', ids: [best.id], perche: 'quasi 4 ore di silenzio: lascio almeno un frammento' } }
      // il carosello ha bisogno di almeno quattro tavole buone: se la sequenza ne ha meno, ne fa di nuove apposta
      // (ragionando sulle ultime giornate e letture, più varianti per ognuna) e le aggiunge in coda alla sequenza
      if (P.forma === 'carosello') {
        try {
          const ws = (await T.listWorks()).filter(w => ep.schede.includes(w.id))
          const nb = ws.filter(w => w.visual?.features && gusto(st, w.visual.features) >= 0.42).length
          if (nb < 4 && ws.length) {
            const it = ws[ws.length - 1].intention
            const ah = await tavoleAdHoc(st, rng(st.day * 31 + ws.length), { log: o.log, intention: it, readings: st.readings.slice(-40), quante: 4 - nb + 1, fast: true, suggerito: ((ep as Ep & { coppia?: string }).coppia ?? '').split('|')[0] || it.word, perche: `il carosello ha solo ${nb} tavole buone` })
            for (const w of ah.works) fatte.push(w.id)
            if (ah.works.length) { ep.schede = [...ep.schede, ...ah.works.map(w => w.id)]; P = { ...P, ids: ep.schede } }
          }
        } catch (e) { o.log(`Tavole per il post non riuscite: ${e instanceof Error ? e.message : e}`) }
      }
      if (P.forma === 'niente') o.log('Questa sequenza resta nel sito: non la pubblico.')
      else { B.pronta = ep.id; B.tentativi = 0; B.forma = P.forma; B.storia = P.ids[0] }
    }
  } else if (A.pronta) o.log('Ho una sequenza pronta: aspetto il momento di pubblicarla e intanto continuo a leggere.')
  else o.log(`Non ho ancora abbastanza da dire (${A.accumulo.toFixed(2)} su ${A.soglia.toFixed(2)}): continuo a leggere e a pensare.`)
  await T.putState(st)
  const B = getAttesa(st)
  const ore = o.oreTraPost ?? 0.5
  const puo = !!B.pronta && (!B.ultimoPost || Date.now() - new Date(B.ultimoPost).getTime() >= ore * 3600e3 - 60e3)
  return { giorno: st.day, nome: st.name, opere: fatte.length, episodio: nuova, pronta: B.pronta ?? null, puoPubblicare: puo, forma: B.forma ?? 'carosello', storia: B.storia ?? null }
}

/** prepara il post di una sequenza: per ogni tavola scelta carica sul server l'immagine e il suo pezzo di musica */
export async function preparaPost(epId: string, n: number) {
  const st = await loadOrCreate()
  const ep = getEpisodi(st).find(e => e.id === epId) as Ep | undefined
  if (!ep) throw new Error('sequenza non trovata')
  const ws = (await T.listWorks()).filter(w => ep.schede.includes(w.id)).sort((a, b) => ep.schede.indexOf(a.id) - ep.schede.indexOf(b.id))
  const scelte = cura(ws, n)
  const pezzi: { jpg: string; wav?: string }[] = []
  for (const [i, w] of scelte.entries()) {
    const bmp = await createImageBitmap(await fetch(w.image).then(r => r.blob()))
    const cv = new OffscreenCanvas(1080, 1350); cv.getContext('2d')!.drawImage(bmp, 0, 0, 1080, 1350)
    const j = await T.igMedia(`${ep.id}-${i + 1}.jpg`, await cv.convertToBlob({ type: 'image/jpeg', quality: 0.92 }))
    if (!j.nome) throw new Error(j.error ?? 'caricamento immagine fallito')
    const k = ep.schede.indexOf(w.id)
    let nomeWav: string | undefined
    if (ep.musica?.partitura.sezioni[k]) {
      const a = await T.igMedia(`${ep.id}-${i + 1}.wav`, wav(await suona(ep.musica.partitura, k, 44100)))
      nomeWav = a.nome
    }
    pezzi.push({ jpg: j.nome, wav: nomeWav })
  }
  return { pezzi, didascalia: ep.caption as string }
}

/** la storia: una tavola sola, in verticale, sul colore del suo bordo */
export async function preparaStoria(workId: string, epId: string) {
  const w = (await T.listWorks()).find(x => x.id === workId)
  if (!w) throw new Error('tavola della storia non trovata')
  const bmp = await createImageBitmap(await fetch(w.image).then(r => r.blob()))
  const cv = new OffscreenCanvas(1080, 1920), g = cv.getContext('2d')!
  // il colore del bordo della tavola fa da fondo
  const p = new OffscreenCanvas(8, 8), pg = p.getContext('2d')!; pg.drawImage(bmp, 0, 0, 8, 8); const d = pg.getImageData(0, 0, 8, 8).data
  let R = 0, G = 0, B = 0, n = 0; for (let i = 0; i < 64; i++) { const x = i % 8, y = Math.floor(i / 8); if (x && y && x < 7 && y < 7) continue; R += d[i * 4]; G += d[i * 4 + 1]; B += d[i * 4 + 2]; n++ }
  g.fillStyle = `rgb(${R / n | 0},${G / n | 0},${B / n | 0})`; g.fillRect(0, 0, 1080, 1920)
  const h = 1080 * bmp.height / bmp.width; g.drawImage(bmp, 0, (1920 - h) / 2, 1080, h)
  const j = await T.igMedia(`${epId}-storia.jpg`, await cv.convertToBlob({ type: 'image/jpeg', quality: 0.92 }))
  if (!j.nome) throw new Error(j.error ?? 'caricamento storia fallito')
  return j.nome as string
}

/** la sequenza pronta non si pubblica (la forma scelta non è ancora approvata): resta nel sito, senza contare come post */
export async function lasciaNelSito(epId: string) {
  const st = await loadOrCreate(); const A = getAttesa(st)
  if (A.pronta === epId) { A.pronta = undefined; A.forma = undefined; A.storia = undefined }
  await T.putState(st)
}

/** annota nella memoria com'è andata la pubblicazione */
export async function annotaPost(epId: string, r: { id?: string; permalink?: string; error?: string }) {
  const st = await loadOrCreate()
  const ep = getEpisodi(st).find(e => e.id === epId) as Ep | undefined
  if (ep) ep.instagram = { id: r.id, permalink: r.permalink, quando: new Date().toISOString(), errore: r.error }
  const A = getAttesa(st)
  if (!r.error) { A.ultimoPost = new Date().toISOString(); if (A.pronta === epId) { A.pronta = undefined; A.forma = undefined; A.storia = undefined } }
  else if (A.pronta === epId && (A.tentativi = (A.tentativi ?? 0) + 1) >= 3) A.pronta = undefined // dopo tre tentativi falliti la lascia nel sito
  await T.putState(st)
}

/** quello che serve al suo blog: lo scrive lui, con i suoi materiali e il suo stile */
export async function perIlSito() {
  const st = await loadOrCreate()
  const works = await T.listWorks()
  const byId = new Map(works.map(w => [w.id, w]))
  const eps = getEpisodi(st).slice(-60).reverse() as Ep[]
  const S = st as unknown as Record<string, unknown> & { scuola?: { firma?: { face: FaceId; tone: string; margine: number; griglia: number; regole?: string[] } }; cantieri?: { titolo: string; tema: string; nato: number; capitoli: { titolo: string; paragrafi: { tipo: string; testo: string }[] }[] }[]; visione?: { titolo: string; domanda?: string; tesi?: { testo: string; conf: number; da: number }[]; storia?: unknown[] }; notebook?: { day: number; date: string; intention: string }[]; poetics?: { day: number; date: string; text: string }[]; attesa?: { giri?: number; accumulo: number; soglia: number; pronta?: string; ultimoPost?: string } }
  const F = S.scuola?.firma
  const tono = TONES.find(t => t.id === F?.tone) ?? TONES[1]
  const R = getRetorica(st)
  const quando = (e: Ep) => e.instagram?.quando ?? byId.get(e.schede[0])?.createdAt ?? null
  return {
    nome: st.name, giorno: st.day, profilo: getProfilo(st) ?? null,
    umore: st.mood, temperatura: st.temperature, giri: (S.attesa as { giri?: number } | undefined)?.giri ?? 0,
    toni: [...new Set(((S as { toniRecenti?: string[] }).toniRecenti ?? []).slice(-4))].map(id => TONES.find(t => t.id === id)).filter(Boolean).map(t => ({ bg: t!.bg, ink: t!.ink, acc: t!.acc, scuro: t!.dark })),
    stile: { titoli: FACES[F?.face ?? 'grotesk']?.family ?? 'Inter', pesoTitoli: FACES[F?.face ?? 'grotesk']?.weight ?? 700, bg: tono.bg, ink: tono.ink, acc: tono.acc, scuro: tono.dark, margine: F?.margine ?? 0.06, regole: (F?.regole ?? []).slice(0, 6) },
    visione: S.visione ? { titolo: S.visione.titolo, domanda: S.visione.domanda, tesi: (S.visione.tesi ?? []).slice(-8) } : null,
    attesa: S.attesa ? { accumulo: S.attesa.accumulo, soglia: S.attesa.soglia, pronta: !!S.attesa.pronta, ultimoPost: S.attesa.ultimoPost ?? null } : null,
    sequenze: eps.map(e => {
      const ws = e.schede.map(id => byId.get(id)).filter((w): w is Work => !!w)
      const letture = [...new Map(ws.flatMap(w => w.readings ?? []).filter(x => x.url && /^https?:/.test(x.url)).map(x => [x.url, { titolo: x.title, url: x.url, fonte: x.source }])).values()].slice(0, 8)
      return { id: e.id, n: e.n, titolo: e.titolo, giorno: e.day, quando: quando(e), conclusione: e.conclusione, domanda: e.domanda, didascalia: e.caption, musica: e.musica?.descr ?? null, instagram: e.instagram ?? null, letture,
        tavole: ws.map(w => ({ id: w.id, titolo: w.title, testo: w.text, ruolo: w.episodio?.ruolo ?? null })) }
    }),
    diario: [
      ...(S.notebook ?? []).slice(-60).map(x => ({ giorno: x.day, quando: x.date, testo: x.intention, tipo: 'quaderno' })),
      ...(S.poetics ?? []).slice(-12).map(x => ({ giorno: x.day, quando: x.date, testo: x.text, tipo: 'poetica' })),
      ...R.diario.slice(-40).map(x => ({ giorno: x.day, quando: null, testo: x.nota, tipo: 'retorica' })),
    ].sort((a, b) => b.giorno - a.giorno),
    libro: (S.cantieri ?? []).map(c => ({ titolo: c.titolo, tema: c.tema, nato: c.nato, capitoli: c.capitoli.map(k => ({ titolo: k.titolo, paragrafi: k.paragrafi.map(p => ({ tipo: p.tipo, testo: p.testo })) })) })),
    archivio: works.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 400).map(w => ({ id: w.id, giorno: w.day, quando: w.createdAt, titolo: w.title, testo: w.text, parola: w.intention?.word ?? '', perche: w.intention?.why ?? '', registro: w.intention?.register ?? '', umore: w.mood, verbale: w.debate?.verbale ?? [], verdetto: w.debate?.verdict ?? null, tenuta: w.kept, interesse: w.interest, sequenza: w.episodio ? { id: w.episodio.id, titolo: w.episodio.titolo, ruolo: w.episodio.ruolo } : null, letture: (w.readings ?? []).slice(0, 4).map(x => ({ titolo: x.title, url: x.url, fonte: x.source })) })),
    letture: (st.readings ?? []).slice(-80).reverse().map(x => ({ titolo: x.title, url: x.url, fonte: x.source })),
    lessico: {
      connettivi: Object.entries(R.connettivi).filter(([, k]) => (k.doc?.length ?? 0) >= 2 && k.n >= 4).map(([f, k]) => ({ forma: f, n: k.n, rel: Object.entries(k.rel).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? '?' })).sort((a, b) => b.n - a.n).slice(0, 40),
      mosse: R.mosse.slice().sort((a, b) => b.peso - a.peso).slice(0, 10).map(m => ({ descr: descriviMossa(m.ops), usi: m.usi, nata: m.nata })),
      colori: Object.entries(R.immaginario).map(([c, im]) => ({ concetto: c, colori: Object.entries(im.colori).filter(([, n]) => n >= 2).map(([w]) => coloreDi(w)).filter(Boolean) })).filter(x => x.colori.length).slice(0, 40),
      visive: Object.entries(R.visive).map(([rel, v]) => ({ rel, migliore: Object.entries(v).sort((a, b) => b[1].w - a[1].w)[0]?.[0] ?? null })),
    },
  }
}

// la memoria passa da e verso il browser a pezzi: l'archivio in un messaggio, le tavole del cassetto una per volta (tutte insieme sforano)
export const memoria = {
  importa: T.importaMemoria,
  immagine: T.riponiImmagine,
  recenti: T.recentiConImmagine,
  jpeg: T.immagineJpeg,
  esporta: (max?: number) => T.esportaMemoria(max, 0),
  riponi: T.riponiFoglio,
  prendi: T.prendiFoglio,
  /** le tavole del cassetto da tenere: le 40 più recenti */
  cassetto: async () => { const nel = new Set(await T.nelCassetto()); return (await T.listWorks()).filter(w => nel.has(w.id)).slice(0, 40).map(w => w.id) },
}

/** il brano intero di una sequenza (tutte le sezioni in fila), caricato sul server come WAV */
export async function branoSequenza(epId: string) {
  const st = await loadOrCreate()
  const ep = getEpisodi(st).find(e => e.id === epId) as Ep | undefined
  if (!ep?.musica) return null
  const parti: AudioBuffer[] = []
  for (let i = 0; i < ep.musica.partitura.sezioni.length; i++) parti.push(await suona(ep.musica.partitura, i, 44100))
  const ch = Math.max(...parti.map(p => p.numberOfChannels)), len = parti.reduce((a, p) => a + p.length, 0)
  const tutto = new AudioBuffer({ length: len, numberOfChannels: ch, sampleRate: 44100 })
  let o = 0
  for (const p of parti) { for (let c = 0; c < ch; c++) tutto.getChannelData(c).set(p.getChannelData(Math.min(c, p.numberOfChannels - 1)), o); o += p.length }
  const r = await T.igMedia(`${ep.id}-brano.wav`, wav(tutto))
  return r.nome ?? null
}

/** il reel di una sequenza (solo video), caricato sul server per il montaggio con il brano */
export async function reelSequenza(epId: string) {
  const v = await T.leggiReel(epId)
  if (!v) return null
  const r = await T.igMedia(`${epId}-reel.mp4`, v)
  // il beat del reel (se c'è): il reel ha la sua musica, non il brano della sequenza
  const a = await T.leggiReel(`${epId}:audio`)
  const ra = a ? await T.igMedia(`${epId}-reel.wav`, a) : null
  return r.nome ? { video: r.nome, audio: ra?.nome ?? null } : null
}

// ─── l'agenda: i minimi di pubblicazione, e una finestra libera ─────────────────
// Un reel almeno ogni 5 ore, un carosello almeno ogni 4 (sfalsato dal reel), una storia almeno ogni 8;
// ogni 2 ore una finestra libera: se ha qualcosa da aggiungere, lo mette nella forma che vuole.
type Forma3 = 'reel' | 'carosello' | 'storia'
interface Pub { ig: string; forma: Forma3; quando: string; tratti?: Tratti; durata?: number; esito?: number; ep?: string; works: string[]; tipo?: string; modello?: string; stile?: string; tools: string[]; voto?: number; premiato?: boolean; visti?: string[] }
interface Agenda { ultimo: Partial<Record<Forma3, string>>; qualsiasi?: string; pubblicati: Pub[]; pesiForma?: Partial<Record<Forma3, number>> }
// reel obbligato ogni 2 ore; e ogni 45 minuti deve uscire qualcosa (la forma che arriva di più tra carosello e storia)
const ORE: Record<Forma3, number> = { reel: 2, carosello: Infinity, storia: Infinity }
const getAgenda = (st: AgentState): Agenda => {
  const S = st as AgentState & { agenda?: Agenda }
  if (!S.agenda) {
    // all'inizio, l'ultimo carosello è l'ultima sequenza uscita su Instagram
    const ult = getEpisodi(st).map(e => (e as Ep).instagram).filter(x => x?.id && !x.errore).map(x => x!.quando).sort().pop()
    S.agenda = { ultimo: ult ? { carosello: ult } : {}, qualsiasi: ult, pubblicati: [] }
  }
  return S.agenda
}
const ore = (q?: string) => (q ? (Date.now() - new Date(q).getTime()) / 3.6e6 : 99)

/** che cosa è dovuto adesso (e quanto è in ritardo), e se c'è la finestra libera */
export async function agenda() {
  const st = await loadOrCreate(), A = getAgenda(st)
  // il ritmo di ogni forma si accorcia o si allunga con quanto quella forma arriva davvero (la portata misurata, pesiForma)
  // prima di avere misure, i reel pesano di più (sono loro che arrivano ai non-follower); poi decide la portata misurata
  const PRIMA: Record<Forma3, number> = { reel: 2, carosello: 0.6, storia: 0.7 }
  const peso = (f: Forma3) => (A.pesiForma ?? {})[f] ?? PRIMA[f]
  const ritardo = Object.fromEntries((Object.keys(ORE) as Forma3[]).map(f => [f, ore(A.ultimo[f]) / (f === 'reel' ? ORE[f] : ORE[f] / peso(f))])) as Record<Forma3, number>
  const dovute = (Object.keys(ORE) as Forma3[]).filter(f => ritardo[f] >= 1).sort((a, b) => ritardo[b] - ritardo[a])
  // ogni 45 minuti esce qualcosa: il reel è favorito, ma sceglie lui (estrazione pesata su quanto ogni forma arriva)
  if (!dovute.length && ore(A.qualsiasi) >= 0.58) {
    const w = { reel: peso('reel') * 2.5, carosello: peso('carosello'), storia: peso('storia') }, tot = w.reel + w.carosello + w.storia
    let q = Math.random() * tot; dovute.push((Object.keys(w) as Forma3[]).find(f => (q -= w[f]) <= 0) ?? 'reel')
  }
  return { dovute, ritardo, libera: ore(A.qualsiasi) >= 0.58, daUltima: ore(A.qualsiasi), pesiForma: A.pesiForma ?? {} }
}

/** annota una pubblicazione nell'agenda, con quello che serve poi per capire cosa ha funzionato */
export async function annotaPubblicazione(forma: Forma3, epId: string | null, workIds: string[], r: { id?: string; permalink?: string; error?: string }) {
  if (forma === 'carosello' && epId) await annotaPost(epId, r)
  if (r.error || !r.id) return
  const st = await loadOrCreate(), A = getAgenda(st)
  const ep = epId ? (getEpisodi(st).find(e => e.id === epId) as (Ep & { tipo?: string; modello?: string }) | undefined) : undefined
  if (ep && forma !== 'carosello') ep.instagram ??= { id: r.id, permalink: r.permalink, quando: new Date().toISOString() }
  const ids = workIds.length ? workIds : ep?.schede ?? []
  const works = (await T.listWorks()).filter(w => ids.includes(w.id))
  const ora = new Date().toISOString()
  A.ultimo[forma] = ora; A.qualsiasi = ora
  A.pubblicati = [...A.pubblicati, { ig: r.id, forma, quando: ora, ep: epId ?? undefined, works: ids, tipo: ep?.tipo, modello: ep?.modello, stile: forma === 'reel' ? (st as AgentState & { ultimoReelStile?: string }).ultimoReelStile : undefined, tratti: forma === 'reel' ? (st as AgentState & { ultimoReelTratti?: Tratti }).ultimoReelTratti : undefined, durata: forma === 'reel' ? (st as AgentState & { ultimoReelDurata?: number }).ultimoReelDurata : undefined, astratta: forma === 'reel' ? (st as AgentState & { ultimoReelAstratta?: boolean }).ultimoReelAstratta : undefined, mondi: forma === 'reel' ? (st as AgentState & { ultimoReelMondi?: boolean }).ultimoReelMondi : undefined, tools: [...new Set(works.flatMap(w => w.intention?.tools ?? []))] }].slice(-80)
  await T.putState(st)
}

/** la storia, quando nessuna sequenza ne propone una: la tavola recente più forte che non è ancora finita in una storia */
export async function scegliStoria() {
  const st = await loadOrCreate(), A = getAgenda(st)
  const gia = new Set(A.pubblicati.filter(p => p.forma === 'storia').flatMap(p => p.works))
  return (await T.listWorks()).filter(w => w.day >= st.day - 3 && !gia.has(w.id) && w.kept !== false).sort((a, b) => b.interest - a.interest)[0]?.id ?? null
}

/** i contenuti da ascoltare (gli ultimi pubblicati, con il loro id su Instagram) */
export async function daAscoltare() { const st = await loadOrCreate(); return getAgenda(st).pubblicati.slice(-30).map(p => p.ig) }

/** ascoltare: i numeri e i commenti entrano nelle sue scelte.
 *  - lato grafico: gli strumenti delle tavole che hanno funzionato rendono di più (e li sceglierà più spesso)
 *  - lato semantico: le mosse di pensiero e i modelli di conclusione che hanno funzionato pesano di più
 *  - musica: lo stile del beat del reel prende il suo voto
 *  - forma: quale forma funziona, per usare meglio la finestra libera
 *  - i commenti: non li copia; ne prende le cose nominate, che diventano curiosità da leggere, e se lo annota */
export async function ascolta(dati: { media: { ig: string; like?: number; commenti?: number; insights: Record<string, number>; testi: { id: string; text: string }[] }[]; errori: string[] }) {
  const st = await loadOrCreate(), A = getAgenda(st), r = rng(st.day * 7 + A.pubblicati.length)
  const per = new Map(dati.media.map(m => [m.ig, m]))
  const voto = (m: (typeof dati.media)[number]) => { const I = m.insights, portata = Math.max(20, I.reach ?? 0); return ((m.like ?? 0) + 2 * (m.commenti ?? 0) + 3 * (I.saved ?? 0) + 3 * (I.shares ?? 0) + 0.02 * (I.views ?? 0)) / portata }
  for (const p of A.pubblicati) { const m = per.get(p.ig); if (m) p.voto = voto(m) }
  // il giudice: si riaddestra sui reel misurati (dopo 6 ore, quando i numeri si sono mossi), con l'oblio settimanale
  {
    for (const p of A.pubblicati) { const m = per.get(p.ig); if (m && p.forma === 'reel' && ore(p.quando) >= 6) { const e = esitoReel(m.insights, p.durata ?? 30); if (e !== null) p.esito = e } }
    const dati = A.pubblicati.filter(p => p.forma === 'reel' && p.tratti && p.esito !== undefined).map(p => ({ tratti: p.tratti!, y: p.esito!, giorni: ore(p.quando) / 24 }))
    if (dati.length) { const S2 = st as AgentState & { giudice?: Giudice }; S2.giudice = addestra(dati) }
  }
  const note: string[] = []
  // la portata assoluta: quante persone ha raggiunto (copertura o visualizzazioni se il token le dà; se no like e commenti).
  // Serve a confrontare le forme tra loro: un carosello lo vedono solo i follower, un reel anche gli altri
  let misuraVera = false
  for (const p of A.pubblicati) {
    const m = per.get(p.ig); if (!m) continue
    const I = m.insights, vista = Math.max(I.reach ?? 0, I.views ?? 0)
    if (vista > 0) misuraVera = true
    ;(p as Pub & { portata?: number; vera?: boolean }).portata = vista > 0 ? vista : (m.like ?? 0) + 3 * (m.commenti ?? 0)
    ;(p as Pub & { vera?: boolean }).vera = vista > 0
  }
  {
    // per ogni forma la portata tipica degli ultimi (in logaritmo, così un caso eccezionale non decide tutto), confrontata con la media di tutte
    const ult = A.pubblicati.slice(-30).filter(p => (p as Pub & { portata?: number }).portata !== undefined && ore(p.quando) >= 6 && (!misuraVera || (p as Pub & { vera?: boolean }).vera))
    const per0: Partial<Record<Forma3, number[]>> = {}
    for (const p of ult) (per0[p.forma as Forma3] ??= []).push(Math.log1p((p as Pub & { portata?: number }).portata!))
    const medie = Object.entries(per0).filter(([, v]) => v!.length >= 2).map(([f, v]) => [f, v!.reduce((a, b) => a + b, 0) / v!.length] as const)
    if (medie.length >= 2) {
      const tutte = medie.reduce((a, [, m]) => a + m, 0) / medie.length
      const prima = { ...(A.pesiForma ?? {}) }
      A.pesiForma = { ...(A.pesiForma ?? {}) }
      for (const [f, m0] of medie) A.pesiForma[f as Forma3] = Math.max(0.4, Math.min(2.5, Math.exp(0.9 * (m0 - tutte))))
      const best = medie.slice().sort((a, b) => b[1] - a[1])[0]
      if (Math.abs((A.pesiForma[best[0] as Forma3] ?? 1) - (prima[best[0] as Forma3] ?? 1)) > 0.05) note.push(`${best[0] === 'reel' ? 'i reel' : best[0] === 'storia' ? 'le storie' : 'i caroselli'} arrivano a più persone: li faccio più spesso (${misuraVera ? 'dalla copertura' : 'da like e commenti, le visualizzazioni non le vedo'})`)
    }
  }
  let opere: Work[] | null = null
  // il premio arriva quando i numeri si sono assestati (dopo 8 ore), una volta sola, rispetto alla media della stessa forma
  for (const p of A.pubblicati) {
    if (p.premiato || p.voto === undefined || ore(p.quando) < 8) continue
    const simili = A.pubblicati.filter(x => x.forma === p.forma && x.voto !== undefined).map(x => x.voto!)
    if (simili.length < 3) continue
    const media = simili.reduce((a, b) => a + b, 0) / simili.length, sd = Math.sqrt(simili.reduce((a, b) => a + (b - media) ** 2, 0) / simili.length) || 1e-3
    const z = Math.max(-2.5, Math.min(2.5, (p.voto - media) / sd))
    for (const t of p.tools) { const s0 = st.tools[t]; if (s0) s0.gain = 0.85 * s0.gain + 0.15 * Math.max(0, Math.min(1, 0.5 + 0.2 * z)) }
    const PT = ((st as AgentState & { pesiTipo?: Record<string, number> }).pesiTipo ??= {})
    if (p.tipo) PT[p.tipo] = Math.max(0.4, Math.min(2.5, (PT[p.tipo] ?? 1) * Math.exp(0.15 * z)))
    if (p.tipo && p.modello && !p.modello.startsWith('mossa:') && Math.abs(z) > 0.5) esito(st, r, p.tipo as TipoD, p.modello, z > 0)
    const G = (st as AgentState & { beat?: Gusto }).beat
    if (p.stile && G) premiaStile(G, p.stile, Math.max(0, Math.min(1, (z + 2.5) / 5)))
    // il gusto visivo impara da come sono arrivate le tavole pubblicate (le misure di ognuna, con il loro esito)
    if (p.works?.length) { opere ??= await T.listWorks(); for (const id of p.works) { const w = opere.find(x => x.id === id); if (w?.visual?.features) impara(st, w.visual.features, (z + 2.5) / 5) } }
    // la voglia di una tavola astratta in mezzo si sposta con come è arrivato il reel che l'aveva (o non l'aveva)
    if (p.forma === 'reel' && typeof (p as { astratta?: boolean }).astratta === 'boolean') { const SA = ((st as AgentState & { astratta?: { p: number } }).astratta ??= { p: 0.65 }); SA.p = Math.max(0.25, Math.min(0.9, SA.p + 0.04 * z * ((p as { astratta?: boolean }).astratta ? 1 : -1))) }
    if (p.forma === 'reel' && typeof (p as { mondi?: boolean }).mondi === 'boolean') { const SM = ((st as AgentState & { reelMondi?: { p: number } }).reelMondi ??= { p: 0.3 }); SM.p = Math.max(0.1, Math.min(0.8, SM.p + 0.05 * z * ((p as { mondi?: boolean }).mondi ? 1 : -1))) }
    p.premiato = true
    if (Math.abs(z) > 1) note.push(`${p.forma === 'reel' ? 'il reel' : p.forma === 'storia' ? 'la storia' : 'il carosello'} del ${new Date(p.quando).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} ${z > 0 ? 'è arrivato più del solito' : 'è passato quasi inosservato'}`)
  }
  // i commenti nuovi: le cose che nominano diventano curiosità (le parole degli altri non entrano nei suoi testi)
  const nuove: string[] = []
  for (const p of A.pubblicati) {
    const m = per.get(p.ig); if (!m) continue
    const visti = new Set(p.visti ?? [])
    for (const c of m.testi) {
      if (visti.has(c.id)) continue
      visti.add(c.id)
      for (const w of c.text.toLowerCase().split(/[^a-zàèéìòù]+/)) if (w.length > 4 && posDi(w).has('n') && !posDi(w).has('v') && !GENERICI.has(w)) nuove.push(w)
    }
    p.visti = [...visti].slice(-200)
  }
  const S = st as AgentState & { curiositaAltrui?: { parola: string; day: number }[] }
  if (nuove.length) {
    const conta = new Map<string, number>(); for (const w of nuove) conta.set(w, (conta.get(w) ?? 0) + 1)
    const top = [...conta].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w)
    S.curiositaAltrui = [...(S.curiositaAltrui ?? []), ...top.map(parola => ({ parola, day: st.day }))].slice(-40)
    note.push(`sotto i miei lavori qualcuno parla di ${top.slice(0, 3).join(', ')}: ci vado a leggere`)
  }
  if (note.length) st.notebook = [...st.notebook, { day: st.day, date: new Date().toISOString(), intention: `Ascolto. ${note.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join('. ')}.`, done: [], verbale: [], wants: [], bored: [] }].slice(-300)
  await T.putState(st)
  const migliore = A.pubblicati.filter(p => p.voto !== undefined).sort((a, b) => b.voto! - a.voto!)[0]
  return { ascoltati: dati.media.length, commentiNuovi: nuove.length, migliore: migliore ? `${migliore.forma} del ${migliore.quando.slice(0, 10)} (${migliore.voto!.toFixed(3)})` : null, errori: dati.errori, note }
}

/** la bottega: prove di strumenti sulle tavole del cassetto, per conoscerli (niente si pubblica) */
export async function bottegaGiro(o: { prove: number; secondi: number; log: (m: string) => void }) {
  const { bottega } = await import('./mind/bottega')
  const { ricostruisci } = await import('./hands/cassetto')
  const st = await loadOrCreate(), r = rng(Date.now() % 1e9)
  const nel = await T.nelCassetto(), works = new Map((await T.listWorks()).map(w => [w.id, w]))
  const scelte = nel.sort(() => r() - 0.5).slice(0, 6), tavole: { sheet: Awaited<ReturnType<typeof ricostruisci>>; parola: string }[] = []
  for (const id of scelte) { try { const j = await T.prendiFoglio(id); if (j) tavole.push({ sheet: await ricostruisci(JSON.parse(j)), parola: (works.get(id) as unknown as { intention?: { word?: string } })?.intention?.word ?? '' }) } catch { /* pazienza */ } }
  const ctxDi = (parola: string) => ({ r, tone: { id: 'x', label: '', bg: '#ebe6dc', ink: '#121212', acc: '#e3361b', dark: false }, intention: { word: parola, register: 'poetico', targets: {}, tools: [], why: '' }, mood: st.mood, say: () => parola, shaders: [], quality: 1 }) as unknown as import('./hands/tools').ToolCtx
  const n = await bottega(st, r, tavole, ctxDi, { prove: o.prove, secondi: o.secondi, log: o.log })
  await T.putState(st)
  return n
}

/** il simulatore di stateyour: l'osservatorio lo usa per misurare mondi, la camera dei pattern per disegnare luoghi veri */
let cosmoPronto: Promise<import('./mind/osservatorio').CosmoAPI | null> | null = null
export function preparaCosmo() {
  return (cosmoPronto ??= (async () => {
    try {
      // moduli ES serviti così come sono (public/stateyour): il bundler non li tocca
      const base = '/stateyour/camera/'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const C: any = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ base + 'cosmo.js'), M: any = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ base + 'mondo.js')
      const { usaCosmo } = await import('./hands/camera')
      usaCosmo((n: number) => { try { return M.simulaMondo(C.regione(C.indirizzoDi(n)).cella) } catch { return null } })
      return { indirizzoDi: C.indirizzoDi, sistema: C.sistema, pianeta: C.pianeta, galassia: C.galassia, descriviIndirizzo: C.descriviIndirizzo }
    } catch (e) { console.log('cosmo non disponibile:', e instanceof Error ? e.message : e); return null }
  })())
}
if (typeof window !== 'undefined') void preparaCosmo()

/** la città interna (strati 1-2): il territorio delle tavole e una giornata degli abitanti. Osserva e basta: scrive il verbale. */
export async function cittaGiro(o: { log: (m: string) => void }) {
  const { territorio } = await import('./mind/territorio')
  const { fondaCitta, giornata, compatta } = await import('./mind/citta')
  const st = await loadOrCreate(), works = await T.listWorks()
  const opere = works as unknown as import('./mind/territorio').Opera[]
  const Tt = territorio(opere, { seme: st.day })
  const S = st as AgentState & { citta?: import('./mind/citta').Citta; diarioCitta?: unknown[]; territorio?: unknown }
  S.citta ??= fondaCitta(opere, Tt, st.seed ?? 11)
  const cerca = async (f: string, q: string, n: number) => (await T.read(`mode=fonte&f=${encodeURIComponent(f)}&q=${encodeURIComponent(q)}&n=${n}`)) as unknown as import('./mind/citta').Lettura[]
  const cosmo = await preparaCosmo()
  const v = await giornata(S.citta, opere, Tt, { cosmo: cosmo ?? undefined, seme: st.day, cerca, ricerche: 8, giornoAgente: st.day, strumenti: (await import('./hands/tools')).TOOLS.map(t => t.id) })
  if ((globalThis as { __officina?: boolean }).__officina && !S.citta.officina?.richieste.length) { // per le prove: un giro d'officina forzato
    const m = S.citta.abitanti.filter(a => a.tipo === 'mestiere'), a = m[Math.floor(Math.random() * m.length)]
    S.citta.officina ??= { richieste: [], esiti: [], tenuti: [] }
    const tenuti = S.citta.officina.tenuti, base = tenuti[Math.floor(Math.random() * tenuti.length)]
    S.citta.officina.richieste.push({ autore: a.nome, scopo: 'prova', strumenti: Object.keys(a.interessi).filter(k => k.startsWith('m:')).map(k => k.slice(2)), modo: base && Math.random() < 0.6 ? 'ramo' : 'zero', base: base?.id, giorno: S.citta.giorno })
  }
  // l'officina: i generatori chiesti oggi si scrivono e si provano qui, nel browser (su un foglio vuoto e su tavole del cassetto)
  if (S.citta.officina?.richieste.length) {
    try {
      const { officinaGiro } = await import('./mind/officinaCitta')
      const { riportaOfficina } = await import('./mind/citta')
      const { ricostruisci } = await import('./hands/cassetto')
      const r = rng(Date.now() % 1e9), nel = await T.nelCassetto(), fogli: { sheet: Awaited<ReturnType<typeof ricostruisci>>; parola: string }[] = []
      for (const id of nel.sort(() => r() - 0.5).slice(0, 3)) { try { const j = await T.prendiFoglio(id); if (j) fogli.push({ sheet: await ricostruisci(JSON.parse(j)), parola: '' }) } catch { /* pazienza */ } }
      const ctxDi = (parola: string) => ({ r, tone: { id: 'x', label: '', bg: '#ebe6dc', ink: '#121212', acc: '#e3361b', dark: false }, intention: { word: parola, register: 'poetico', targets: {}, tools: [], why: '' }, mood: st.mood, say: () => parola, shaders: [], quality: 1 }) as unknown as import('./hands/tools').ToolCtx
      const esiti = await officinaGiro(st, r, S.citta.officina.richieste, fogli, ctxDi, o.log)
      riportaOfficina(S.citta, esiti)
      for (const e of esiti) v.push({ fase: 'bottega', chi: e.richiesta.autore, tipo: 'officina', testo: `${e.programma.nome}: ${e.perche} — ${e.testo}` })
    } catch (e) { o.log(`officina saltata: ${e instanceof Error ? e.message : e}`) }
  }
  // la geologia della città: la tettonica di stateyour, con il calore del mantello dove le tavole sono fitte. Le placche,
  // i mari e i crinali che ne escono sono il terreno su cui sta la città; ogni giorno si rifà dalla densità nuova.
  try {
    const TT: any = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '/stateyour/camera/' + 'tettonica.js') // eslint-disable-line @typescript-eslint/no-explicit-any
    const W = 128, H = 64, imp = new Float64Array(W * H)
    for (const p of Tt.punti) { const ci = 32 + p.x / 1000 * 64, cj = 16 + p.y / 1000 * 32; for (let j = Math.max(0, Math.floor(cj - 4)); j <= Math.min(H - 1, Math.ceil(cj + 4)); j++) for (let i = Math.max(0, Math.floor(ci - 4)); i <= Math.min(W - 1, Math.ceil(ci + 4)); i++) imp[j * W + i] += Math.exp(-((i - ci) ** 2 + (j - cj) ** 2) / 6) }
    const G = TT.evolviTettonica({ W, H, seme: st.day, impronta: imp, placche: true })
    // la finestra della città (il centro della mappa), ricampionata a 64×64 e in interi
    const N = 64, fin = (v: ArrayLike<number>, k: number) => { const o: number[] = []; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) o.push(Math.round(v[(16 + Math.floor(j / N * 32)) * W + 32 + Math.floor(i / N * 64)] * k)); return o }
    S.citta.costruito ??= { costruzioni: [], nomiVie: {} }
    ;(S.citta.costruito as unknown as { geologia?: unknown }).geologia = { giorno: st.day, lato: N, alt: fin(G.alt, 1), cont: fin(G.cont, 1), spinta: fin(G.spinta, 100), fosse: fin(G.fosse, 100) }
  } catch (e) { o.log(`la geologia non è venuta: ${e instanceof Error ? e.message : e}`) }
  // i tessuti: i fondali che i curatori hanno chiesto si tessono con i generatori veri (dell'officina, o un gesto che crea),
  // nei colori dell'area; l'immagine va nel sito (tessuti/) e il piano la porta
  try {
    const { tessi } = await import('./mind/officinaCitta'), { ricetteTenute } = await import('./mind/ricette')
    const r = rng(Date.now() % 1e9), K = S.citta.costruito
    const da = (K?.costruzioni ?? []).filter(c => c.tipo === 'piano' && c.stato !== 'tolto' && (c.dati as { contenuto?: string })?.contenuto === 'motivo' && !(c.dati as { tessuto?: string })?.tessuto).slice(0, 3)
    for (const c of da) {
      const col = (S.citta.sale?.[String(c.q)]?.suolo?.colori ?? ['#ebe6dc', '#121212', '#e3361b']) as string[], parola = Tt.quartieri.find(x => x.id === c.q)?.concetti?.[0] ?? 'città'
      const ctx = { r, tone: { id: 't', label: '', bg: col[0], ink: col[1], acc: col[2], dark: false }, intention: { word: parola, register: 'poetico', targets: {}, tools: [], why: '' }, mood: st.mood, say: () => parola, shaders: st.shaders, quality: 0.5 } as unknown as import('./hands/tools').ToolCtx
      const t = await tessi(st, r, ctx, ricetteTenute()), id = `t${c.id.replace(/[^\w]/g, '')}`
      tessutiDaSalvare.push({ id, url: t.canvas.toDataURL('image/jpeg', 0.82) })
      Object.assign(c.dati as object, { tessuto: id, come: t.come })
      v.push({ fase: 'bottega', chi: c.chi, tipo: 'tessuto', testo: `Il fondale di «${Tt.quartieri.find(x => x.id === c.q)?.nome ?? ''}» l'ho tessuto con ${t.come}, nei colori dell'area.` })
    }
  } catch (e) { o.log(`tessuti saltati: ${e instanceof Error ? e.message : e}`) }
  compatta(S.citta)
  S.diarioCitta = [...(S.diarioCitta ?? []), { giorno: st.day, quando: new Date().toISOString(), cittaGiorno: S.citta.giorno, verbale: v }].slice(-60)
  S.territorio = { quartieri: Tt.quartieri, piazza: Tt.piazza, insiemi: Tt.insiemi.map(i => ({ id: i.abitante.id, nome: i.abitante.nome, tipo: i.abitante.tipo, casa: i.casa, raggio: i.raggio, n: i.n })), punti: Tt.punti.map(p => [p.id, Math.round(p.x), Math.round(p.y), p.q]), fili: (() => { const per = new Map<number, [number, number, number][]>(); for (const f of Tt.fili) { for (const k of [f[0], f[1]]) { const l = per.get(k) ?? []; l.push(f); per.set(k, l) } } const tieni = new Set<string>(); for (const l of per.values()) for (const f of l.sort((x, y) => y[2] - x[2]).slice(0, 4)) tieni.add(f[0] + '|' + f[1]); return Tt.fili.filter(f => tieni.has(f[0] + '|' + f[1])).map(f => [f[0], f[1], +f[2].toFixed(3)]) })() }
  await T.putState(st)
  o.log(`la città: giorno ${S.citta.giorno}, ${v.length} battute, ${Tt.quartieri.length} quartieri`)
  return v
}

/** i tessuti fatti in questo giro, da scrivere nel sito (tessuti/<id>.jpg) */
const tessutiDaSalvare: { id: string; url: string }[] = []
export function tessutiNuovi() { return tessutiDaSalvare.splice(0) }

/** la città per il sito: il territorio, gli abitanti, le ultime giornate, le decisioni, la mostra, le annotazioni */
export async function perLaCitta() {
  const st = await loadOrCreate()
  const S = st as AgentState & { citta?: import('./mind/citta').Citta; diarioCitta?: { giorno: number; quando: string; cittaGiorno: number; verbale: { fase: string; chi: string; tipo: string; testo: string }[] }[]; territorio?: { quartieri: { id: number; nome: string; x: number; y: number; n: number; concetti: string[] }[]; piazza: { x: number; y: number }; insiemi: { id: string; nome: string; tipo: string; casa: { x: number; y: number }; raggio: number; n: number }[]; punti: [string, number, number, number][]; fili?: [number, number, number][] } }
  const C = S.citta, Tt = S.territorio
  if (!C || !Tt) return null
  const works = new Map((await T.listWorks()).map(w => [w.id, w]))
  const lab = (st as unknown as { citta?: { laboratorio?: { programmi: { nome: string; autore: string; stato: string; punteggio?: number; nota?: string; passi: unknown[] }[] } } }).citta?.laboratorio
  const { testoProgramma } = await import('./mind/ricette')
  return {
    nome: C.nome, giorno: C.giorno, giornoAgente: st.day, artista: st.name,
    piazza: Tt.piazza, quartieri: Tt.quartieri.map(q => ({ id: q.id, nome: q.nome, x: q.x, y: q.y, n: q.n, concetti: q.concetti, sala: C.sale?.[String(q.id)] ?? null })),
    osservatorio: C.osservatorio ? { campioni: C.osservatorio.campioni, scoperte: C.osservatorio.scoperte.slice(-8).reverse(), ipotesi: C.osservatorio.ipotesi.filter(h => h.stato !== 'aperta').slice(-6).reverse().map(h => ({ testo: h.testo, stato: h.stato, fiducia: h.fiducia, chi: h.chi })) } : null,
    punti: Tt.punti.map(([id, x, y, q]) => { const w = works.get(id); return { id, x, y, q, t: (w?.title ?? '').slice(0, 90), g: w?.day ?? 0, i: +(w?.interest ?? 0.5).toFixed(2), k: w?.kept ? 1 : 0 } }),
    abitanti: C.abitanti.map(a => { const ins = Tt.insiemi.find(i => i.id === a.id); return { id: a.id, nome: a.nome, tipo: a.tipo, carica: a.carica, casa: ins?.casa ?? a.casa, raggio: ins?.raggio ?? a.raggio, n: ins?.n ?? 0, visti: a.visti.slice(-12), vesti: a.vesti ?? [], fem: !!a.fem, carattere: a.carattere } }),
    fili: Tt.fili ?? [],
    costruito: C.costruito ? { costruzioni: C.costruito.costruzioni.map(c => ({ ...c, storia: c.storia.slice(-4) })), nomiVie: C.costruito.nomiVie, coltivato: C.costruito.coltivato ?? [], geologia: (C.costruito as unknown as { geologia?: unknown }).geologia ?? null, allestimenti: C.costruito.allestimenti ?? {} } : null,
    giornate: (S.diarioCitta ?? []).slice(-4).reverse(),
    decisioni: (C.decisioni ?? []).slice(-12).reverse().map(d => ({ cosa: d.cosa, stato: d.stato, fino: d.fino, esito: d.esito ?? null, chi: d.chi })),
    mostre: (C.mostre ?? []).slice(-3).reverse(),
    cantieri: (C.cantieri ?? []).slice(-6).reverse(),
    annotazioni: C.rete.filter(n => n.dove?.length && n.chi && ['battuta', 'problema', 'ricordo', 'prova', 'guizzo', 'porta'].includes(n.tipo)).slice(-60).map(n => ({ chi: n.chi, testo: n.testo.slice(0, 160), tavola: n.dove![0], giorno: n.giorno, tipo: n.tipo })),
    tavole: Object.fromEntries([...works.values()].filter(w => w.day >= st.day - 400).map(w => [w.id, { testo: (w.text ?? '').slice(0, 280) }])),
    officina: (lab?.programmi ?? []).filter(p => p.stato === 'tenuto').slice(-10).map(p => ({ nome: p.nome, autore: p.autore, punteggio: p.punteggio, testo: testoProgramma(p as never) })),
  }
}
