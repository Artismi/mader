/**
 * Ingresso dei sistemi generativi: dai contenuti e dai regolatori alla scena.
 * Senza IA le proposte partono da regolatori diversi per ogni sistema; con
 * l'IA i regolatori li sceglie il modello (e poi li ritocca guardando le tavole).
 */
import type { DesignContent, Format, Scene } from '../types'
import { styleById, fontsOf, inferRegistro } from '../styles'
import { idIdentita, VICINI } from '../identita'
import { tintaDominante } from '../core/colore'
import { loadFonts } from '../fonts'
import { type Knobs, type SistemaId, SISTEMI, hashText, rng } from './knobs'
import { makeG } from './tools'
import { esamina, ECCELLENTE } from './critico'
import { SYSTEMS_BASE } from './systems'
import { SYSTEMS_REGISTRI } from './systems2'
import { SYSTEMS_SLIDE } from './slides'
import { SYSTEMS_TIPI } from './tipi'
import { composto } from './compositore'
import type { Scene as SceneT } from '../types'
import type { G } from './tools'
import type { RegistroId } from '../styles'
import { loadPix } from '../core/foto'

export * from './knobs'

export const SYSTEMS: Record<SistemaId, (g: G) => SceneT | null> = { ...SYSTEMS_BASE, ...SYSTEMS_REGISTRI, ...SYSTEMS_SLIDE, ...SYSTEMS_TIPI, composto }

/** Sistemi che parlano ciascun registro, dal più tipico. */
export const SISTEMI_DEL_REGISTRO: Record<RegistroId, SistemaId[]> = {
  infantile: ['giocoso', 'orbita', 'modulare', 'riso', 'supertipo'],
  pop: ['giocoso', 'eco', 'strisce', 'supertipo', 'riso', 'orbita'],
  editoriale: ['rivista', 'supertipo', 'modulare', 'ritaglio', 'eco'],
  svizzero: ['modulare', 'supertipo', 'costruttivo', 'strisce', 'eco'],
  avanguardia: ['decostruito', 'eco', 'strisce', 'ritaglio', 'riso', 'costruttivo'],
  lusso: ['rivista', 'orbita', 'ritaglio', 'supertipo', 'modulare'],
  artigianale: ['riso', 'rivista', 'supertipo', 'modulare', 'orbita', 'giocoso'],
  notte: ['eco', 'strisce', 'supertipo', 'costruttivo', 'ritaglio', 'decostruito'],
  tech: ['modulare', 'orbita', 'supertipo', 'strisce', 'giocoso'],
  retro: ['strisce', 'orbita', 'giocoso', 'supertipo', 'eco'],
  sportivo: ['costruttivo', 'strisce', 'eco', 'supertipo', 'ritaglio'],
}

/**
 * Una scena dai regolatori, passata dal critico. Il sistema prova più semi
 * (ossature diverse) e tiene la tavola col voto più alto; si ferma prima se ne
 * trova una eccellente. Se nessuna regge, riprova con il titolo più piccolo.
 */
export async function generateSystem(c: DesignContent, format: Format, k: Knobs, photo?: string, o: { tentativi?: number } = {}): Promise<Scene | null> {
  const style = styleById(k.stile)
  const [, pix] = await Promise.all([loadFonts(fontsOf(style)), loadPix(photo ?? c.imageUrl)])
  const tentativi = o.tentativi ?? (k.sistema === 'composto' ? 14 : 6)
  let best: Scene | null = null, falliti = 0
  for (let attempt = 0; attempt < tentativi; attempt++) {
    const kk = attempt ? { ...k, seme: k.seme + attempt * 7919, scala: Math.max(0, k.scala - falliti * 0.06) } : k
    try {
      const g = makeG(format, style, kk, c, photo, pix)
      const sc = SYSTEMS[k.sistema](g)
      if (!sc) { falliti++; continue }
      const esame = esamina(g)
      const scena: Scene = { ...sc, els: g.els, knobs: { ...kk }, esame }
      if (!best || esame.voto > (best.esame?.voto ?? 0)) best = scena
      if (esame.voto >= ECCELLENTE) break
    } catch (e) {
      console.warn('[designer]', k.sistema, e)
      ;(globalThis as { __designerSink?: string[] }).__designerSink?.push(`${k.sistema}: errore ${(e as Error).message}`)
      return null
    }
  }
  if (best && !best.esame?.promossa) (globalThis as { __designerSink?: string[] }).__designerSink?.push(`${k.sistema}: bocciata ${best.esame?.voto} — ${best.esame?.difetti.slice(0, 3).join('; ')}`)
  return best
}

const allText = (c: DesignContent) => [c.brand, c.kicker, c.title, c.body, c.imageQuery, ...(c.details ?? [])].filter(Boolean).join(' ')

/** Tinta dominante della foto (per accordarle la palette). */
export async function tintaFoto(url?: string) {
  const pix = await loadPix(url)
  return pix ? tintaDominante(pix)?.tinta : undefined
}

/**
 * Regolatori di partenza senza IA: tre identità generate (due nel registro
 * del contenuto, una da un registro vicino), ognuna con due o tre sistemi
 * del suo registro. Varietà tra le identità, coerenza dentro ciascuna.
 */
export function proposeKnobs(c: DesignContent, opts: { styleId?: string; hasPhoto: boolean; sistemi?: SistemaId[]; tinta?: number; seme?: number }): Knobs[] {
  const r = rng(hashText(allText(c)) ^ (opts.seme ?? 0))
  const registro = opts.styleId ? styleById(opts.styleId).registro : inferRegistro(allText(c))
  const tipo = c.tipo && c.tipo !== 'copertina' ? c.tipo : undefined
  const ok = (id: SistemaId) => { const info = SISTEMI.find(s => s.id === id); return !info?.slide && !info?.tipo && id !== 'composto' && (opts.hasPhoto || info?.foto !== 'serve') }
  // il sistema dedicato al tipo di contenuto (o la slide equivalente), se c'è
  const dedicato = tipo ? (SISTEMI.find(s => s.tipo === tipo)?.id ?? (tipo === 'citazione' ? 'citazione' : undefined)) : undefined
  const tratt: Knobs['trattamento'][] = ['pellicola', 'duotone', 'retino', 'riso', 'serigrafia', 'bn', 'poster']
  const prefK: Partial<Record<SistemaId, Partial<Knobs>>> = {
    costruttivo: { trattamento: 'retino' }, riso: { trattamento: 'riso', sovrastampa: 0.7 }, strisce: { trattamento: 'pellicola' },
    eco: { trattamento: 'retino' }, ritaglio: { trattamento: 'pellicola' }, orbita: { trattamento: 'duotone' },
  }
  const identita = opts.styleId
    ? [{ stile: opts.styleId, registro, n: 8 }]
    : [
        // la prima accordata alla foto, la seconda libera, la terza da un registro vicino
        { stile: idIdentita(registro, r.int(1, 99999), { tinta: opts.tinta }), registro, n: 3 },
        { stile: idIdentita(registro, r.int(1, 99999)), registro, n: 3 },
        ((v: RegistroId) => ({ stile: idIdentita(v, r.int(1, 99999), { tinta: r.chance(0.5) ? opts.tinta : undefined }), registro: v, n: 2 }))(r.pick(VICINI[registro])),
      ]
  const out: Knobs[] = []
  const usati = new Set<SistemaId>()
  for (const id of identita) {
    const pref = SISTEMI_DEL_REGISTRO[id.registro].filter(ok)
    const tutti = [...pref, ...SISTEMI.map(s => s.id).filter(x => ok(x) && !pref.includes(x))]
    // sistemi non ancora usati prima: le identità non si ripetono la stessa composizione.
    // Il compositore (ogni seme un'ossatura nuova) c'è in ogni identità; con un tipo di
    // contenuto (elenco, programma…) le proposte sono il sistema dedicato e il compositore.
    const mano = [...tutti.filter(x => !usati.has(x)), ...tutti]
    const scelti = opts.sistemi ?? (tipo
      ? [...(dedicato ? [dedicato] : []), 'composto', 'composto', 'composto'] as SistemaId[]
      : ['composto', ...mano.slice(0, id.n - 1), ...(id.n > 3 ? ['composto'] : [])] as SistemaId[])
    for (const sistema of scelti.slice(0, id.n)) {
      usati.add(sistema)
      out.push({
        sistema, stile: id.stile,
        scala: 0.55 + r.range(0, 0.4), energia: 0.25 + r.range(0, 0.6), densita: 0.45 + r.range(0, 0.45),
        sovrastampa: 0.3 + r.range(0, 0.5), trattamento: r.pick(tratt), inverti: r.chance(0.15), grana: 0.3 + r.range(0, 0.4),
        seme: r.int(1, 99999), ...prefK[sistema],
      })
    }
  }
  return out
}
