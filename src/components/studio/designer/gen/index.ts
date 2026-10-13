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
export function proposeKnobs(c: DesignContent, opts: { styleId?: string; hasPhoto: boolean; sistemi?: SistemaId[]; tinta?: number; seme?: number; ampio?: boolean | number }): Knobs[] {
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
  const vicini = [...VICINI[registro]].sort(() => r.next() - 0.5)
  const identita = opts.styleId
    ? [{ stile: opts.styleId, registro, n: opts.ampio ? 6 * (opts.ampio === true ? 5 : opts.ampio) : 8 }]
    : opts.ampio
    ? Array.from({ length: opts.ampio === true ? 5 : opts.ampio }, (_, i) => {
        // vivaio ampio per la selezione del critico: metà identità nel registro del contenuto
        // (una su due accordata alla foto), metà dai registri vicini; sei composizioni ciascuna
        const reg = i % 2 === 0 || !vicini.length ? registro : vicini[Math.floor(i / 2) % vicini.length]
        return { stile: idIdentita(reg, r.int(1, 99999), { tinta: i % 3 === 0 ? opts.tinta : undefined }), registro: reg, n: 6 }
      })
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
      ? [...(dedicato ? [dedicato, dedicato] : []), ...Array(id.n).fill('composto')] as SistemaId[]
      : opts.ampio
      ? ['composto', ...mano.slice(0, id.n - 2), 'composto'] as SistemaId[]
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

export interface Proposte { scene: Scene[]; candidate: number; promosse: number; giri: number }

/**
 * Le proposte: un vivaio ampio di candidate (identità × sistemi × ossature),
 * tutte esaminate dal critico; restano le migliori promosse, diverse tra loro
 * per ossatura, sistema e identità. Se le promosse non bastano si apre un
 * altro giro con semi nuovi (al massimo `giri`); in ultimo si completa con le
 * bocciate migliori, segnate come tali.
 */
export async function proponi(c: DesignContent, format: Format, o: { photo?: string; n?: number; knobs?: Knobs[]; styleId?: string; seme?: number; giri?: number; vivaio?: number; onProgress?: (fatte: number, totale: number) => void } = {}): Promise<Proposte> {
  const n = o.n ?? 12
  // si genera quattro volte quello che si mostra: il critico sceglie su un vivaio ampio
  const vivaio = o.vivaio ?? n * 4
  const tinta = await tintaFoto(o.photo)
  const tutte: Scene[] = []
  let candidate = 0, giro = 0
  const maxGiri = o.giri ?? 3
  for (; giro < maxGiri; giro++) {
    const pool = giro === 0 && o.knobs?.length
      ? o.knobs
      : proposeKnobs(c, { hasPhoto: !!o.photo, styleId: o.styleId, tinta, seme: (o.seme ?? 0) + giro * 104729, ampio: Math.max(3, Math.ceil(vivaio / 6)) })
    for (const [i, k] of pool.entries()) {
      const sc = await generateSystem(c, format, k, o.photo, { tentativi: k.sistema === 'composto' ? 8 : 4 })
      candidate++
      o.onProgress?.(i + 1, pool.length)
      if (sc) tutte.push(sc)
    }
    // un altro giro prima di accettare doppioni: si ferma solo quando le 12 sono tutte di sistemi diversi
    if (scegli(tutte, n, true, 1).length >= n) break
  }
  const promosse = scegli(tutte, n, true)
  const scene = promosse.length >= n ? promosse : [...promosse, ...scegli(tutte.filter(x => !promosse.includes(x)), n - promosse.length, false)]
  return { scene, candidate, promosse: tutte.filter(x => x.esame?.promossa).length, giri: Math.min(giro + 1, maxGiri) }
}

/** Selezione: per voto, senza tavole gemelle (stessa ossatura), con un tetto per sistema e per identità. */
function scegli(tutte: Scene[], n: number, soloPromosse: boolean, maxLivello = 3): Scene[] {
  const cand = tutte.filter(x => !soloPromosse || x.esame?.promossa).sort((a, b) => (b.esame?.voto ?? 0) - (a.esame?.voto ?? 0))
  // prima un solo esemplare per sistema (niente coppie quasi uguali), poi si allarga se non bastano
  for (const [perSistema, perStile] of ([[1, 3], [2, 4], [3, 6]] as const).slice(0, maxLivello)) {
    const out: Scene[] = []
    const firme = new Set<string>(), sist = new Map<string, number>(), stili = new Map<string, number>()
    for (const sc of cand) {
      const k = sc.knobs as Knobs | undefined
      const sis = k?.sistema ?? sc.layout, st = k?.stile ?? sc.style
      const firma = `${sis}|${sc.esame?.firma ?? ''}`
      const tetto = sis === 'composto' ? perSistema + 2 : perSistema
      if (firme.has(firma) || (sist.get(sis) ?? 0) >= tetto || (stili.get(st) ?? 0) >= perStile) continue
      out.push(sc); firme.add(firma); sist.set(sis, (sist.get(sis) ?? 0) + 1); stili.set(st, (stili.get(st) ?? 0) + 1)
      if (out.length >= n) return out
    }
    if (out.length >= n || perSistema === maxLivello) return out
  }
  return []
}
