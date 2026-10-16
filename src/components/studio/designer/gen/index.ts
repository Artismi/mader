/**
 * Ingresso dei sistemi generativi: dai contenuti e dai regolatori alla scena.
 * Senza IA le proposte partono da regolatori diversi per ogni sistema; con
 * l'IA i regolatori li sceglie il modello (e poi li ritocca guardando le tavole).
 */
import type { DesignContent, Format, Scene } from '../types'
import { styleById, fontsOf, inferRegistro } from '../styles'
import { idIdentita, VICINI, conSperimentazione } from '../identita'
import { creditiCaratteri } from '../asset/catalogo'
import { tintaDominante } from '../core/colore'
import { loadFonts } from '../fonts'
import { type Knobs, type SistemaId, SISTEMI, hashText, rng } from './knobs'
import { makeG, scarti } from './tools'
import { esamina, ECCELLENTE, SOGLIA } from './critico'
import { SYSTEMS_BASE } from './systems'
import { SYSTEMS_REGISTRI } from './systems2'
import { SYSTEMS_SLIDE } from './slides'
import { SYSTEMS_TIPI } from './tipi'
import { composto } from './compositore'
import { ibrido, scheletro } from './mattoni'
import { incrocia } from './incrocio'
import { ARCHETIPI } from './archetipi/elenco'
import { affinita } from './affinita'
import { SYSTEMS_A } from './archetipi/gruppo-a'
import { SYSTEMS_B } from './archetipi/gruppo-b'
import { SYSTEMS_C } from './archetipi/gruppo-c'
import { SYSTEMS_D } from './archetipi/gruppo-d'
import { SYSTEMS_E } from './archetipi/gruppo-e'
import { TIPI_ELENCO } from './archetipi/voci'
import { curiosita, mostrato, ricorda } from './memoria'
import type { Scene as SceneT } from '../types'
import type { G } from './tools'
import type { RegistroId } from '../styles'
import { loadPix } from '../core/foto'

export * from './knobs'
export { dimentica as dimenticaMemoria } from './memoria'

export const SYSTEMS: Record<SistemaId, (g: G) => SceneT | null> = { ...SYSTEMS_BASE, ...SYSTEMS_REGISTRI, ...SYSTEMS_SLIDE, ...SYSTEMS_TIPI, composto, ibrido, ...SYSTEMS_A, ...SYSTEMS_B, ...SYSTEMS_C, ...SYSTEMS_D, ...SYSTEMS_E }

/** Sistemi che parlano ciascun registro, dal più tipico. */
const SISTEMI_A_MANO: Record<RegistroId, SistemaId[]> = {
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

/** Sistemi che parlano ciascun registro: quelli a mano e gli archetipi di casa nel registro. */
export const SISTEMI_DEL_REGISTRO = Object.fromEntries(Object.entries(SISTEMI_A_MANO).map(([reg, l]) => [
  reg, [...l, ...ARCHETIPI.filter(a => (a.registri as readonly string[]).includes(reg)).map(a => a.id)],
])) as Record<RegistroId, SistemaId[]>

/**
 * Una scena dai regolatori, passata dal critico. Il sistema prova più semi
 * (ossature diverse) e tiene la tavola col voto più alto; si ferma prima se ne
 * trova una eccellente. Se nessuna regge, riprova con il titolo più piccolo.
 */
export async function generateSystem(c: DesignContent, format: Format, k: Knobs, photo?: string, o: { tentativi?: number } = {}): Promise<Scene | null> {
  const style = styleById(conSperimentazione(k.stile, k.sperimentazione))
  const [, pix] = await Promise.all([loadFonts(fontsOf(style)), loadPix(photo ?? c.imageUrl)])
  const tentativi = o.tentativi ?? (k.sistema === 'composto' ? 14 : 6)
  let best: Scene | null = null, falliti = 0, nonCiSta = false
  for (let attempt = 0; attempt < tentativi; attempt++) {
    const kk = attempt ? { ...k, seme: k.seme + attempt * 7919, scala: Math.max(0, k.scala - falliti * 0.06) } : k
    try {
      const g = makeG(format, style, kk, c, photo, pix)
      scarti.ultimo = ''
      const sc = SYSTEMS[k.sistema](g)
      if (!sc) { falliti++; nonCiSta ||= NON_CI_STA.test(scarti.ultimo); continue }
      const esame = esamina(g)
      const scena: Scene = { ...sc, els: g.els, knobs: { ...kk }, esame, crediti: creditiCaratteri([style.display.family, style.text.family, style.label.family, style.impact.family]) }
      if (!best || esame.voto > (best.esame?.voto ?? 0)) best = scena
      if (esame.voto >= ECCELLENTE) break
    } catch (e) {
      console.warn('[designer]', k.sistema, e)
      ;(globalThis as { __designerSink?: string[] }).__designerSink?.push(`${k.sistema}: errore ${(e as Error).message}`)
      return null
    }
  }
  // il testo non ci sta in nessun tentativo: prima si tolgono le righe meno importanti del messaggio,
  // poi (se non basta) il vivaio passa a un'altra ossatura
  if (!best && nonCiSta) for (const [livello, [cosa, cc]] of accorciamenti(c).entries()) {
    for (let attempt = 0; attempt < 2 && !best; attempt++) {
      const kk = { ...k, seme: k.seme + (livello * 2 + attempt + 1) * 104729 }
      try {
        const g = makeG(format, style, kk, cc, photo, pix)
        const sc = SYSTEMS[k.sistema](g)
        if (!sc) continue
        const esame = esamina(g)
        // il contenuto accorciato costa: più si toglie, più pesa
        esame.difetti.push(`contenuto accorciato: ${cosa}`)
        esame.voto = Math.max(0, esame.voto - 3 * (livello + 1))
        esame.promossa = esame.voto >= SOGLIA
        best = { ...sc, els: g.els, knobs: { ...kk }, esame }
        ;(globalThis as { __designerSink?: string[] }).__designerSink?.push(`${k.sistema}: accorciato ${cosa}`)
      } catch { /* come un tentativo fallito */ }
    }
    if (best) break
  }
  if (best && !best.esame?.promossa) (globalThis as { __designerSink?: string[] }).__designerSink?.push(`${k.sistema}: bocciata ${best.esame?.voto} — ${best.esame?.difetti.slice(0, 3).join('; ')}`)
  return best
}

/**
 * Il contenuto via via più corto, dalle righe meno importanti del messaggio alle più importanti:
 * dettagli in coda, poi tutti, poi il testo alla prima frase, le spiegazioni delle voci,
 * le voci oltre la quarta, l'occhiello. Titolo, brand, invito e numero non si toccano mai.
 */
/** Scarti che vogliono dire "il testo non ci sta": si riprova con meno righe. */
const NON_CI_STA = /non entr|troppo|fuori|spazi|sovrappost|stretto|incomplet|lung|pien/

export function accorciamenti(c: DesignContent): [string, DesignContent][] {
  const out: [string, DesignContent][] = []
  let x = { ...c }
  const passo = (cosa: string, ok: boolean, f: (y: DesignContent) => DesignContent) => { if (ok) { x = f(x); out.push([cosa, x]) } }
  passo('dettagli in coda', (x.details?.length ?? 0) > 2, y => ({ ...y, details: y.details!.slice(0, 2) }))
  passo('dettagli', !!x.details?.length, y => ({ ...y, details: [] }))
  const frasi = x.body?.match(/[^.!?]+[.!?]+/g)
  passo('testo alla prima frase', !!frasi && frasi.length > 1 && frasi[0].trim().length < x.body!.trim().length, y => ({ ...y, body: frasi![0].trim() }))
  passo('spiegazioni delle voci', !!x.voci?.some(v => v.testo), y => ({ ...y, voci: y.voci!.map(v => ({ ...v, testo: undefined })) }))
  passo('voci oltre la quarta', (x.voci?.length ?? 0) > 4, y => ({ ...y, voci: y.voci!.slice(0, 4) }))
  passo('occhiello', !!x.kicker, y => ({ ...y, kicker: undefined }))
  return out
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
/** Il sistema entra nel vivaio delle copertine per questo contenuto? Niente slide, niente esclusi per tema, foto se serve. */
export function ammesso(c: DesignContent, id: SistemaId, hasPhoto: boolean) {
  const tipo = c.tipo && c.tipo !== 'copertina' ? c.tipo : undefined
  // con un tipo con voci entrano anche gli archetipi che sanno impaginare elenchi (scontrino, lavagna…)
  const elenco = !!tipo && TIPI_ELENCO.includes(tipo)
  const info = SISTEMI.find(s => s.id === id)
  const sa = ARCHETIPI.some(a => a.id === id && 'voci' in a && a.voci)
  return !info?.slide && !info?.tipo && id !== 'composto' && id !== 'ibrido' && affinita(c, id) !== 'esclusa' && (hasPhoto || info?.foto !== 'serve') && (!tipo || (elenco && sa))
}

/** Composizioni per identità nel vivaio ampio. */
const PER_IDENTITA = 3

export function proposeKnobs(c: DesignContent, opts: { styleId?: string; hasPhoto: boolean; sistemi?: SistemaId[]; tinta?: number; seme?: number; ampio?: boolean | number; sperimentazione?: number }): Knobs[] {
  const r = rng(hashText(allText(c)) ^ (opts.seme ?? 0))
  const registro = opts.styleId ? styleById(opts.styleId).registro : inferRegistro(allText(c))
  const tipo = c.tipo && c.tipo !== 'copertina' ? c.tipo : undefined
  // con un tipo con voci entrano anche gli archetipi che sanno impaginare elenchi (scontrino, lavagna…)
  const ok = (id: SistemaId) => ammesso(c, id, opts.hasPhoto)
  // il sistema dedicato al tipo di contenuto (o la slide equivalente), se c'è
  const dedicato = tipo ? (SISTEMI.find(s => s.tipo === tipo)?.id ?? (tipo === 'citazione' ? 'citazione' : undefined)) : undefined
  const tratt: Knobs['trattamento'][] = ['pellicola', 'duotone', 'retino', 'riso', 'serigrafia', 'bn', 'poster']
  const prefK: Partial<Record<SistemaId, Partial<Knobs>>> = {
    costruttivo: { trattamento: 'retino' }, riso: { trattamento: 'riso', sovrastampa: 0.7 }, strisce: { trattamento: 'pellicola' },
    eco: { trattamento: 'retino' }, ritaglio: { trattamento: 'pellicola' }, orbita: { trattamento: 'duotone' },
  }
  const vicini = [...VICINI[registro]].sort(() => r.next() - 0.5)
  const identita = opts.styleId
    ? [{ stile: opts.styleId, registro, n: opts.ampio ? PER_IDENTITA * (opts.ampio === true ? 5 : opts.ampio) : 8 }]
    : opts.ampio
    ? Array.from({ length: opts.ampio === true ? 5 : opts.ampio }, (_, i) => {
        // vivaio ampio per la selezione del critico: metà identità nel registro del contenuto
        // (una su due accordata alla foto), metà dai registri vicini; poche composizioni ciascuna (più identità e più coppie di caratteri tra le prime)
        const reg = i % 2 === 0 || !vicini.length ? registro : vicini[Math.floor(i / 2) % vicini.length]
        return { stile: idIdentita(reg, r.int(1, 99999), { tinta: i % 3 === 0 ? opts.tinta : undefined, sperimentazione: opts.sperimentazione }), registro: reg, n: PER_IDENTITA }
      })
    : [
        // la prima accordata alla foto, la seconda libera, la terza da un registro vicino
        { stile: idIdentita(registro, r.int(1, 99999), { tinta: opts.tinta, sperimentazione: opts.sperimentazione }), registro, n: 3 },
        { stile: idIdentita(registro, r.int(1, 99999), { sperimentazione: opts.sperimentazione }), registro, n: 3 },
        ((v: RegistroId) => ({ stile: idIdentita(v, r.int(1, 99999), { tinta: r.chance(0.5) ? opts.tinta : undefined, sperimentazione: opts.sperimentazione }), registro: v, n: 2 }))(r.pick(VICINI[registro])),
      ]
  const out: Knobs[] = []
  const usati = new Set<SistemaId>()
  for (const id of identita) {
    // l'ordine dei sistemi preferiti cambia con il seme e con la curiosità: prima quelli
    // che il motore ha mostrato meno, così le impaginazioni nuove entrano nel vivaio
    const curioso = (l: SistemaId[]) => l.map(x => ({ x, key: mostrato(x) + r.next() * 0.9 })).sort((a, b) => a.key - b.key).map(o => o.x)
    const pref = curioso(SISTEMI_DEL_REGISTRO[id.registro].filter(ok))
    // gli stili lontani dal soggetto vanno in fondo: entrano solo se il resto è finito
    const lontano = (x: SistemaId) => affinita(c, x) === 'lontana'
    const tutti = [...pref, ...curioso(SISTEMI.map(s => s.id).filter(x => ok(x) && !pref.includes(x)))].sort((a, b) => Number(lontano(a)) - Number(lontano(b)))
    // sistemi non ancora usati prima: le identità non si ripetono la stessa composizione.
    // Il compositore (ogni seme un'ossatura nuova) c'è in ogni identità; con un tipo di
    // contenuto (elenco, programma…) le proposte sono il sistema dedicato e il compositore.
    const mano = [...tutti.filter(x => !usati.has(x)), ...tutti]
    const scelti = opts.sistemi ?? (tipo
      ? [...(dedicato ? [dedicato] : []), 'composto', ...mano.slice(0, Math.max(0, id.n - (dedicato ? 2 : 1))), ...Array(id.n).fill('composto')] as SistemaId[]
      : opts.ampio
      ? ['composto', ...mano.slice(0, id.n - (id.n > 3 ? 2 : 1)), ...(id.n > 3 ? ['composto'] : [])] as SistemaId[]
      : ['composto', ...mano.slice(0, id.n - 1), ...(id.n > 3 ? ['composto'] : [])] as SistemaId[])
    for (const sistema of scelti.slice(0, opts.sistemi ? opts.sistemi.length : id.n)) {
      usati.add(sistema)
      out.push({
        sistema, stile: id.stile,
        scala: 0.55 + r.range(0, 0.4), energia: 0.25 + r.range(0, 0.6), densita: 0.45 + r.range(0, 0.45),
        sovrastampa: 0.3 + r.range(0, 0.5), trattamento: r.pick(tratt), inverti: r.chance(0.15), grana: 0.3 + r.range(0, 0.4),
        seme: r.int(1, 99999), ...(opts.sperimentazione !== undefined ? { sperimentazione: opts.sperimentazione } : {}), ...prefK[sistema],
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
export async function proponi(c: DesignContent, format: Format, o: { photo?: string; n?: number; knobs?: Knobs[]; styleId?: string; seme?: number; sperimentazione?: number; giri?: number; vivaio?: number; ibridi?: boolean; onProgress?: (fatte: number, totale: number) => void } = {}): Promise<Proposte> {
  const n = o.n ?? 12
  // si genera quattro volte quello che si mostra: il critico sceglie su un vivaio ampio
  const vivaio = o.vivaio ?? n * 4
  const tinta = await tintaFoto(o.photo)
  const tutte: Scene[] = []
  let candidate = 0, giro = 0
  const maxGiri = o.giri ?? 3
  for (; giro < maxGiri; giro++) {
    // le direzioni dell'IA (se ci sono) entrano nel primo giro; il resto del vivaio lo genera il motore
    const date = giro === 0 ? o.knobs ?? [] : []
    const pool = [...date, ...proposeKnobs(c, { hasPhoto: !!o.photo, styleId: o.styleId, tinta, sperimentazione: o.sperimentazione, seme: (o.seme ?? 0) + giro * 104729, ampio: Math.max(2, Math.ceil((vivaio - date.length) / PER_IDENTITA)) })]
    for (const [i, k] of pool.entries()) {
      const sc = await generateSystem(c, format, k, o.photo, { tentativi: k.sistema === 'composto' ? 8 : 4 })
      candidate++
      o.onProgress?.(i + 1, pool.length)
      if (sc) tutte.push(sc)
    }
    // gli incroci dei mattoni (V1): le identità del vivaio, poche generazioni, restano gli ibridi promossi
    if (giro === 0 && o.ibridi !== false) tutte.push(...await incrocia(c, format, { base: pool, seme: o.seme, valuta: k => generateSystem(c, format, k, o.photo, { tentativi: 2 }) }))
    // un altro giro prima di accettare doppioni: si ferma solo quando le 12 sono tutte di sistemi diversi
    if (scegli(tutte, n, true, 1).length >= n) break
  }
  const promosse = scegli(tutte, n, true)
  const scene = promosse.length >= n ? promosse : [...promosse, ...scegli(tutte.filter(x => !promosse.includes(x)), n - promosse.length, false)]
  ricorda(scene.map(sc => ({ sistema: (sc.knobs as Knobs | undefined)?.sistema ?? sc.layout, firma: sc.esame?.firma })))
  return { scene, candidate, promosse: tutte.filter(x => x.esame?.promossa).length, giri: Math.min(giro + 1, maxGiri) }
}

/**
 * Punteggio per l'ordine delle proposte: il voto del critico più la curiosità
 * (sistemi e ossature che il motore non ha ancora mostrato). La curiosità pesa
 * per intero solo sulle tavole eccellenti: tra quelle appena promosse decide poco.
 */
const punteggio = (sc: Scene) => {
  const v = sc.esame?.voto ?? 0
  const cur = curiosita((sc.knobs as Knobs | undefined)?.sistema ?? sc.layout, sc.esame?.firma)
  return v + (v >= ECCELLENTE ? cur : cur * 0.4)
}

/** Il sistema per la selezione: un ibrido vale come l'archetipo del suo scheletro (stessa ossatura, stessa idea di pagina). */
const sistemaDi = (sc: Scene) => { const k = sc.knobs as Knobs | undefined; return k?.sistema === 'ibrido' && k.genoma ? scheletro(k.genoma) : k?.sistema ?? sc.layout }

/** Selezione: per punteggio, senza tavole gemelle (stessa ossatura), con un tetto per sistema e per identità (gli ibridi al più un terzo). */
function scegli(tutte: Scene[], n: number, soloPromosse: boolean, maxLivello = 3): Scene[] {
  const cand = tutte.filter(x => !soloPromosse || x.esame?.promossa).map(x => ({ x, p: punteggio(x) })).sort((a, b) => b.p - a.p).map(o => o.x)
  // prima un solo esemplare per sistema (niente coppie quasi uguali), poi si allarga se non bastano
  for (const [perSistema, perStile] of ([[1, 3], [2, 4], [3, 6]] as const).slice(0, maxLivello)) {
    const out: Scene[] = []
    const firme = new Set<string>(), sist = new Map<string, number>(), stili = new Map<string, number>()
    let ibridi = 0
    for (const sc of cand) {
      const k = sc.knobs as Knobs | undefined
      const sis = sistemaDi(sc), st = k?.stile ?? sc.style
      const ib = k?.sistema === 'ibrido'
      if (ib && ibridi >= Math.ceil(n / 3)) continue
      const firma = `${sis}|${sc.esame?.firma ?? ''}`
      const tetto = sis === 'composto' ? perSistema + 2 : perSistema
      if (firme.has(firma) || (sist.get(sis) ?? 0) >= tetto || (stili.get(st) ?? 0) >= perStile) continue
      if (ib) ibridi++
      out.push(sc); firme.add(firma); sist.set(sis, (sist.get(sis) ?? 0) + 1); stili.set(st, (stili.get(st) ?? 0) + 1)
      if (out.length >= n) return out
    }
    if (out.length >= n || perSistema === maxLivello) return out
  }
  return []
}
