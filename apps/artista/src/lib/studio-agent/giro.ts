/**
 * Il giro senza schermo: chi lo sveglia (GitHub Actions ogni 30 minuti) apre la pagina in un Chrome invisibile,
 * gli ridà la memoria, e chiama queste funzioni: qualche studio, una sequenza, poi prepara il post
 * (per ogni tavola scelta: l'immagine e il suo pezzo di musica; il video lo monta ffmpeg fuori dal browser).
 */
import * as T from './transport'
import { loadOrCreate, runDay } from './day'
import { getEpisodi } from './mind/episodio'
import { cura, getProfilo } from './mind/profilo'
import { suona, wav } from './suono/musica'
import type { AgentState, Work } from './core/types'

type Ep = ReturnType<typeof getEpisodi>[number] & { instagram?: { id?: string; permalink?: string; quando: string; errore?: string } }

/**
 * L'attesa: non pubblica a orario. Ogni giro legge e studia; quello che impara di nuovo (novità × interesse
 * delle giornate) si accumula. Quando ha accumulato abbastanza per dire qualcosa — la soglia cambia ogni volta,
 * a seconda del suo temperamento — prepara una sequenza. La sequenza pronta esce su Instagram appena possibile,
 * con un ritmo suo tra mezz'ora e 4 ore dal post precedente; nel frattempo continua a leggere.
 */
interface Attesa { giri: number; accumulo: number; soglia: number; pronta?: string; tentativi?: number; ultimoPost?: string }
type ConAttesa = AgentState & { attesa?: Attesa }
const getAttesa = (st: AgentState): Attesa => ((st as ConAttesa).attesa ??= { giri: 0, accumulo: 0, soglia: 1.4 })
const nuovaSoglia = (st: AgentState) => 0.9 + Math.random() * 1.2 + (st.temperature < 0.4 ? 0.4 : 0)

export async function giro(o: { studi: number; sequenza?: boolean; epN: number; reel?: boolean; log: (m: string) => void; oreTraPost?: number; oreMax?: number }) {
  let st: AgentState = await loadOrCreate()
  const fatte: string[] = []
  const una = async (seq: boolean) => {
    try {
      const r = await runDay(st, { fast: true, episodio: seq ? o.epN : undefined, reel: seq && !!o.reel, log: o.log, preview: () => {}, onWork: (w: Work) => { fatte.push(w.id) }, shouldStop: () => false })
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
    if (ep && ep.day === st.day) { nuova = ep.id; const B = getAttesa(st); B.pronta = ep.id; B.tentativi = 0; B.accumulo = 0; B.giri = 0; B.soglia = nuovaSoglia(st) }
  } else if (A.pronta) o.log('Ho una sequenza pronta: aspetto il momento di pubblicarla e intanto continuo a leggere.')
  else o.log(`Non ho ancora abbastanza da dire (${A.accumulo.toFixed(2)} su ${A.soglia.toFixed(2)}): continuo a leggere e a pensare.`)
  await T.putState(st)
  const B = getAttesa(st)
  const ore = o.oreTraPost ?? 0.5
  const puo = !!B.pronta && (!B.ultimoPost || Date.now() - new Date(B.ultimoPost).getTime() >= ore * 3600e3 - 60e3)
  return { giorno: st.day, nome: st.name, opere: fatte.length, episodio: nuova, pronta: B.pronta ?? null, puoPubblicare: puo }
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

/** annota nella memoria com'è andata la pubblicazione */
export async function annotaPost(epId: string, r: { id?: string; permalink?: string; error?: string }) {
  const st = await loadOrCreate()
  const ep = getEpisodi(st).find(e => e.id === epId) as Ep | undefined
  if (ep) ep.instagram = { id: r.id, permalink: r.permalink, quando: new Date().toISOString(), errore: r.error }
  const A = getAttesa(st)
  if (!r.error) { A.ultimoPost = new Date().toISOString(); if (A.pronta === epId) A.pronta = undefined }
  else if (A.pronta === epId && (A.tentativi = (A.tentativi ?? 0) + 1) >= 3) A.pronta = undefined // dopo tre tentativi falliti la lascia nel sito
  await T.putState(st)
}

/** quello che serve al sito della memoria: profilo, visione, sequenze */
export async function perIlSito() {
  const st = await loadOrCreate()
  const eps = getEpisodi(st).slice(-40).reverse() as Ep[]
  return { nome: st.name, giorno: st.day, profilo: getProfilo(st) ?? null, visione: (st as unknown as { visione?: unknown }).visione ?? null,
    sequenze: eps.map(e => ({ id: e.id, titolo: e.titolo, giorno: e.day, schede: e.schede, didascalia: e.caption, instagram: e.instagram ?? null, musica: e.musica?.descr ?? null })) }
}

export const memoria = { importa: T.importaMemoria, esporta: T.esportaMemoria }

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
  return r.nome ?? null
}
