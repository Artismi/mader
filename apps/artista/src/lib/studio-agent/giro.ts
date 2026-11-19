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

export async function giro(o: { studi: number; sequenza: boolean; epN: number; log: (m: string) => void }) {
  let st: AgentState = await loadOrCreate()
  const fatte: string[] = []
  const una = async (seq: boolean) => {
    try {
      const r = await runDay(st, { fast: true, episodio: seq ? o.epN : undefined, log: o.log, preview: () => {}, onWork: (w: Work) => { fatte.push(w.id) }, shouldStop: () => false })
      st = r.state
    } catch (e) {
      o.log(`Errore nella giornata ${st.day + 1}: ${e instanceof Error ? e.message : String(e)}. La salto.`)
      st = { ...st, day: st.day + 1 }; await T.putState(st).catch(() => {})
    }
  }
  for (let i = 0; i < o.studi; i++) await una(false)
  if (o.sequenza) await una(true)
  const ep = o.sequenza ? (getEpisodi(st).slice(-1)[0] as Ep | undefined) : undefined
  return { giorno: st.day, nome: st.name, opere: fatte.length, episodio: ep && ep.day === st.day ? ep.id : null }
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
  if (ep) { ep.instagram = { id: r.id, permalink: r.permalink, quando: new Date().toISOString(), errore: r.error }; await T.putState(st) }
}

/** quello che serve al sito della memoria: profilo, visione, sequenze */
export async function perIlSito() {
  const st = await loadOrCreate()
  const eps = getEpisodi(st).slice(-40).reverse() as Ep[]
  return { nome: st.name, giorno: st.day, profilo: getProfilo(st) ?? null, visione: (st as unknown as { visione?: unknown }).visione ?? null,
    sequenze: eps.map(e => ({ id: e.id, titolo: e.titolo, giorno: e.day, schede: e.schede, didascalia: e.caption, instagram: e.instagram ?? null, musica: e.musica?.descr ?? null })) }
}

export const memoria = { importa: T.importaMemoria, esporta: T.esportaMemoria }
