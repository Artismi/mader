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
import { makeG, scarti, palette, type Seq } from './tools'
import { esamina, ECCELLENTE, SOGLIA } from './critico'
import { SYSTEMS_BASE } from './systems'
import { SYSTEMS_REGISTRI } from './systems2'
import { SYSTEMS_SLIDE } from './slides'
import { SYSTEMS_TIPI } from './tipi'
import { composto } from './compositore'
import { ibrido, scheletro } from './mattoni'
import { incrocia } from './incrocio'
import { ideeDaRegole, type Idea } from './concetto'
import { sistemaEsempi, chiediProgrammi, simulatoEsempi, type Chiedi as ChiediEsempi } from './esempi'
import { vicini } from '../archivio/cerca'
import type { Archivio } from '../archivio/tipi'
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
import { rifinisciPixel, type Pixel } from './pixel'

export * from './knobs'
export { dimentica as dimenticaMemoria } from './memoria'

export const SYSTEMS: Record<SistemaId, (g: G) => SceneT | null> = { ...SYSTEMS_BASE, ...SYSTEMS_REGISTRI, ...SYSTEMS_SLIDE, ...SYSTEMS_TIPI, composto, ibrido, esempi: sistemaEsempi, ...SYSTEMS_A, ...SYSTEMS_B, ...SYSTEMS_C, ...SYSTEMS_D, ...SYSTEMS_E }

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
export async function generateSystem(c: DesignContent, format: Format, k: Knobs, photo?: string, o: { tentativi?: number; seq?: Omit<Seq, 'colore'> & { colore?: string } } = {}): Promise<Scene | null> {
  const style = styleById(conSperimentazione(k.stile, k.sperimentazione))
  const [, pix] = await Promise.all([loadFonts(fontsOf(style)), loadPix(photo ?? c.imageUrl)])
  const tentativi = o.tentativi ?? (k.sistema === 'composto' ? 14 : 6)
  // l'idea toglie dal messaggio quello che distrae dal gesto (i dettagli; il testo solo nel vuoto)
  if (k.idea?.togli.includes('dettagli') && c.details?.length) c = { ...c, details: [] }
  if (k.idea?.gesto === 'vuoto' && k.idea.togli.includes('testo') && c.body) c = { ...c, body: undefined }
  let best: Scene | null = null, falliti = 0, nonCiSta = false
  for (let attempt = 0; attempt < tentativi; attempt++) {
    const kk = attempt ? { ...k, seme: k.seme + attempt * 7919, scala: Math.max(0, k.scala - falliti * 0.06) } : k
    try {
      const g = makeG(format, style, kk, c, photo, pix, conColore(o.seq, style, kk))
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
  // anche quando la tavola regge ma ha perso il testo del brief: una versione accorciata può tenerne di più
  const perso = !!best?.esame?.difetti.some(d => /^testo (saltato|tagliato): testo/.test(d))
  if ((!best && nonCiSta) || perso) for (const [livello, [cosa, cc]] of accorciamenti(c).entries()) {
    let fatta = false
    for (let attempt = 0; attempt < 2 && !fatta; attempt++) {
      const kk = { ...k, seme: k.seme + (livello * 2 + attempt + 1) * 104729 }
      try {
        const g = makeG(format, style, kk, cc, photo, pix, conColore(o.seq, style, kk))
        const sc = SYSTEMS[k.sistema](g)
        if (!sc) continue
        const esame = esamina(g)
        // il contenuto accorciato costa: più si toglie, più pesa
        esame.difetti.push(`contenuto accorciato: ${cosa}`)
        esame.voto = Math.max(0, esame.voto - 3 * (livello + 1))
        esame.promossa = esame.voto >= SOGLIA
        fatta = true
        if (best && esame.voto <= (best.esame?.voto ?? 0)) continue
        best = { ...sc, els: g.els, knobs: { ...kk }, esame }
        ;(globalThis as { __designerSink?: string[] }).__designerSink?.push(`${k.sistema}: accorciato ${cosa}`)
      } catch { /* come un tentativo fallito */ }
    }
    if (fatta) break
  }
  if (best && !best.esame?.promossa) (globalThis as { __designerSink?: string[] }).__designerSink?.push(`${k.sistema}: bocciata ${best.esame?.voto} — ${best.esame?.difetti.slice(0, 3).join('; ')}`)
  return best
}

/**
 * Il contenuto via via più corto, dalle righe meno importanti del messaggio alle più importanti:
 * dettagli in coda, poi tutti, poi il testo alla prima frase, le spiegazioni delle voci,
 * le voci oltre la quarta, l'occhiello. Titolo, brand, invito e numero non si toccano mai.
 */
/** La posizione nella sequenza con il colore dei ponti: l'accento della palette, se non è dato. */
const conColore = (q: (Omit<Seq, 'colore'> & { colore?: string }) | undefined, style: ReturnType<typeof styleById>, k: Knobs): Seq | undefined =>
  q ? { ...q, colore: q.colore ?? palette(style, k.inverti).acc } : undefined

/** Scarti che vogliono dire "il testo non ci sta": si riprova con meno righe. */
const NON_CI_STA = /non entr|troppo|fuori|spazi|sovrappost|stretto|incomplet|lung|pien/

export function accorciamenti(c: DesignContent): [string, DesignContent][] {
  const out: [string, DesignContent][] = []
  let x = { ...c }
  const passo = (cosa: string, ok: boolean, f: (y: DesignContent) => DesignContent) => { if (ok) { x = f(x); out.push([cosa, x]) } }
  passo('dettagli in coda', (x.details?.length ?? 0) > 2, y => ({ ...y, details: y.details!.slice(0, 2) }))
  passo('dettagli', !!x.details?.length, y => ({ ...y, details: [] }))
  const frasi = x.body?.match(/[^.!?]+[.!?]+/g)
  // il testo lungo si accorcia una frase alla volta (dalla fine), non subito alla prima
  if (frasi) for (let k = frasi.length - 1; k >= 2; k--) passo(`testo a ${k} frasi`, true, y => ({ ...y, body: frasi.slice(0, k).join(' ').trim() }))
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
  return !info?.slide && !info?.tipo && id !== 'composto' && id !== 'ibrido' && id !== 'esempi' && affinita(c, id) !== 'esclusa' && (hasPhoto || info?.foto !== 'serve') && (!tipo || (elenco && sa))
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
  // regolatori a due poli (C3): scala, energia e densità vanno verso un estremo, mai verso il centro
  const polo = () => (r.chance(0.5) ? 0.03 + r.range(0, 0.17) : 0.8 + r.range(0, 0.17))
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
        scala: polo(), energia: polo(), densita: polo(),
        sovrastampa: 0.3 + r.range(0, 0.5), trattamento: r.pick(tratt), inverti: r.chance(0.15), grana: 0.3 + r.range(0, 0.4),
        // una tavola su tre prova un intreccio voluto (titolo dietro e davanti, foto nelle lettere, incastro)
        intreccio: r.chance(0.35),
        seme: r.int(1, 99999), ...(opts.sperimentazione !== undefined ? { sperimentazione: opts.sperimentazione } : {}), ...prefK[sistema],
      })
    }
  }
  return out
}

export interface Proposte { scene: Scene[]; candidate: number; /** candidate che nessun tentativo ha retto (scartate dal codice) */ scartate: number; promosse: number; giri: number }

/**
 * Le proposte: un vivaio ampio di candidate (identità × sistemi × ossature),
 * tutte esaminate dal critico; restano le migliori promosse, diverse tra loro
 * per ossatura, sistema e identità. Se le promosse non bastano si apre un
 * altro giro con semi nuovi (al massimo `giri`); in ultimo si completa con le
 * bocciate migliori, segnate come tali.
 */
export async function proponi(c: DesignContent, format: Format, o: { photo?: string; n?: number; knobs?: Knobs[]; styleId?: string; seme?: number; sperimentazione?: number; giri?: number; vivaio?: number; ibridi?: boolean; idee?: Idea[] | false; /** G2: programmi dagli esempi dell'archivio (simulati senza `chiedi`); false = niente */ esempi?: false | OpzioniEsempi; onProgress?: (fatte: number, totale: number) => void; /** la tavola senza testi renderizzata e ridotta: abilita il controllo sui pixel veri */ pixel?: (sc: Scene) => Promise<Pixel> } = {}): Promise<Proposte> {
  const n = o.n ?? 12
  // si genera quattro volte quello che si mostra: il critico sceglie su un vivaio ampio
  const vivaio = o.vivaio ?? n * 4
  const tinta = await tintaFoto(o.photo)
  const tutte: Scene[] = []
  let candidate = 0, giro = 0, scartate = 0
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
      else scartate++
    }
    // le idee (C1–C2): ogni idea del brief eseguita dalla sua ricetta, con due identità del vivaio
    if (giro === 0 && o.idee !== false) for (const k of knobsDelleIdee(c, o.idee ?? ideeDaRegole(c), pool, !!o.photo)) {
      const sc = await generateSystem(c, format, k, o.photo, { tentativi: 3 })
      candidate++
      if (sc) tutte.push(sc)
      else scartate++
      ;(globalThis as { __designerSink?: string[] }).__designerSink?.push(`idea ${k.sistema}: ${k.idea!.gesto} → ${sc ? `${sc.esame?.voto}${sc.esame?.promossa ? '' : ' bocciata'} car ${sc.esame?.carattere?.carattere} — ${sc.esame?.difetti.slice(0, 3).join('; ')}` : 'scartata'}`)
    }
    // G2: programmi scritti dagli esempi più vicini dell'archivio, con le identità del vivaio
    if (giro === 0 && o.esempi !== false) for (const k of await knobsDagliEsempi(c, format, pool, !!o.photo, o.esempi ?? {}, o.seme ?? 0)) {
      const sc = await generateSystem(c, format, k, o.photo, { tentativi: 2 })
      candidate++
      if (sc) tutte.push(sc)
      else scartate++
      ;(globalThis as { __designerSink?: string[] }).__designerSink?.push(`esempi ${k.esempi?.slice(0, 3).join('+')}: ${sc ? `${sc.esame?.voto}${sc.esame?.promossa ? '' : ' bocciata'} car ${sc.esame?.carattere?.carattere}` : `scartata (${scarti.ultimo || 'senza titolo'})`}`)
    }
    // gli incroci dei mattoni (V1): le identità del vivaio, poche generazioni, restano gli ibridi promossi
    if (giro === 0 && o.ibridi !== false) tutte.push(...await incrocia(c, format, { base: pool, seme: o.seme, valuta: k => generateSystem(c, format, k, o.photo, { tentativi: 2 }) }))
    // un altro giro prima di accettare doppioni: si ferma solo quando le 12 sono tutte di sistemi diversi
    if (scegli(tutte, n, true, 1).length >= n) break
  }
  const sceltaDa = (lista: Scene[]) => { const pr = scegli(lista, n, true); return pr.length >= n ? pr : [...pr, ...scegli(lista.filter(x => !pr.includes(x)), n - pr.length, false)] }
  let scene = sceltaDa(tutte)
  // G2 accanto agli archetipi: fino a 2 posti per le tavole promosse dagli esempi (le migliori),
  // al posto delle ultime della lista; senza questa riserva i voti alti degli archetipi rodati le coprono tutte
  const riservaG2 = tutte.filter(x => (x.knobs as Knobs | undefined)?.sistema === 'esempi' && x.esame?.promossa && !scene.includes(x)).sort((a, b) => punteggio(b) - punteggio(a))
  for (const g2 of riservaG2.slice(0, Math.max(0, 2 - scene.filter(x => (x.knobs as Knobs | undefined)?.sistema === 'esempi').length))) {
    const via = [...scene].reverse().find(x => (x.knobs as Knobs | undefined)?.sistema !== 'esempi')
    if (via && scene.length >= n) scene = [...scene.filter(x => x !== via), g2]
    else scene = [...scene, g2]
  }
  // leggibilità sui pixel veri (blocco A): le scelte renderizzate senza testi, corrette o scartate;
  // al posto delle scartate entrano le candidate successive
  if (o.pixel) {
    const via = new Set<Scene>(), lette = new Set<Scene>()
    for (let giro = 0; giro < 4; giro++) {
      for (const sc of scene) {
        if (lette.has(sc) || via.has(sc)) continue
        const r = await rifinisciPixel(sc, o.pixel)
        if (r.scena) { sc.els = r.scena.els; if (r.correzioni && sc.esame) sc.esame = { ...sc.esame, correzioni: [...sc.esame.correzioni, `leggibilità sui pixel: ${r.correzioni} testi corretti`] }; lette.add(sc) }
        else via.add(sc)
      }
      if (!scene.some(x => via.has(x))) break
      scene = sceltaDa(tutte.filter(x => !via.has(x)))
    }
    scene = scene.filter(x => !via.has(x))
    scartate += via.size
  }
  ricorda(scene.map(sc => ({ sistema: (sc.knobs as Knobs | undefined)?.sistema ?? sc.layout, firma: sc.esame?.firma })))
  return { scene, candidate, scartate, promosse: tutte.filter(x => x.esame?.promossa).length, giri: Math.min(giro + 1, maxGiri) }
}

/**
 * Punteggio per l'ordine delle proposte: il voto del critico più la curiosità
 * (sistemi e ossature che il motore non ha ancora mostrato). La curiosità pesa
 * per intero solo sulle tavole eccellenti: tra quelle appena promosse decide poco.
 */
const punteggio = (sc: Scene) => {
  const v = sc.esame?.voto ?? 0
  const cur = curiosita((sc.knobs as Knobs | undefined)?.sistema ?? sc.layout, sc.esame?.firma)
  // il carattere (C4) sposta l'ordine: una tavola determinata batte una corretta e generica
  const car = sc.esame?.carattere?.carattere ?? 50
  return v + (v >= ECCELLENTE ? cur : cur * 0.4) + (car - 50) * 0.3
}

export interface OpzioniEsempi { archivio?: Archivio; /** la chiamata vera (registro dei modelli); senza, i programmi simulati */ chiedi?: ChiediEsempi; /** chiamate (3 programmi ciascuna) */ chiamate?: number; conta?: { chiamate: number; token: number }; /** ultimi esempi usati (per la vetrina) */ usati?: string[] }

let archivioCache: Archivio | null = null
/** L'archivio G1 incluso nel motore (caricato una volta, a richiesta). */
export async function caricaArchivio(): Promise<Archivio> {
  if (!archivioCache) archivioCache = (await import('../archivio/archivio.json')).default as unknown as Archivio
  return archivioCache
}

/**
 * G2: i regolatori dei programmi scritti dagli esempi. Per ogni chiamata, gli
 * 8 esempi più vicini (con un seme diverso, la scelta cambia tra quelli di
 * affinità simile) e 3 programmi; ognuno con un'identità del vivaio a rotazione.
 * Gli elenchi (menu, programma…) restano agli archetipi delle voci.
 */
export async function knobsDagliEsempi(c: DesignContent, format: Format, pool: Knobs[], hasPhoto: boolean, o: OpzioniEsempi, seme: number): Promise<Knobs[]> {
  if (c.tipo && c.tipo !== 'copertina') return []
  const arch = o.archivio ?? await caricaArchivio().catch(() => null)
  if (!arch?.esempi.length || !pool.length) return []
  const stili = [...new Map(pool.map(k => [k.stile, k])).values()]
  const r = rng(hashText(`${c.title}|esempi`) ^ seme)
  const out: Knobs[] = []
  o.usati = []
  for (let i = 0; i < (o.chiamate ?? 2); i++) {
    const es = vicini(c, format, arch, { k: 8, hasPhoto, seme: seme + i * 31 })
    o.usati.push(...es.map(e => e.id))
    const chiedi = o.chiedi ?? simulatoEsempi(c, format, es, { seme: seme + i * 104729, hasPhoto, conta: o.conta })
    const { programmi } = await chiediProgrammi(c, format, es, { chiedi, quanti: 3, seme: seme + i * 104729, hasPhoto })
    for (const [j, programma] of programmi.entries()) {
      const b = stili[(i * 3 + j) % stili.length]
      out.push({ ...b, sistema: 'esempi', programma, esempi: es.slice(0, 3).map(e => e.id), idea: undefined, genoma: undefined, intreccio: false, seme: r.int(1, 99999) })
    }
  }
  return out
}

/** Gli archetipi che sanno eseguire ogni gesto (oltre alla ricetta a mattoni dell'idea). */
const ESECUTORI: Record<Idea['gesto'], SistemaId[]> = {
  'parola-immagine': ['eco', 'ritaglio', 'supertipo'],
  scala: ['costruttivo', 'supertipo', 'decostruito'],
  taglio: ['costruttivo', 'ritaglio', 'rivista', 'modulare'],
  ripetizione: ['eco', 'orbita', 'modulare'],
  vuoto: ['scontrino', 'rivista', 'orbita'],
  spezzato: ['eco', 'decostruito', 'supertipo'],
}
/** Con le voci (menu, programma…): gli archetipi che impaginano elenchi. */
const ESECUTORI_VOCI: SistemaId[] = ['scontrino', 'lavagna', 'tabellone', 'foglietti', 'agenzia', 'brutale']

/**
 * I regolatori di un'idea: la sua ricetta (con le voci solo lo scontrino), i poli
 * dell'idea spinti all'estremo, la grana solo se l'idea vuole la materia.
 */
export function knobsDelleIdee(c: DesignContent, idee: Idea[], pool: Knobs[], hasPhoto: boolean): Knobs[] {
  const elenco = !!c.tipo && c.tipo !== 'copertina'
  const stili = [...new Map(pool.map(k => [k.stile, k])).values()].slice(0, 2)
  const r = rng(hashText(`${c.title}|idee`))
  const polo = (v: 0 | 1) => (v ? 0.86 + r.range(0, 0.12) : 0.02 + r.range(0, 0.12))
  return idee.flatMap((idea, i) => {
    // più modi di eseguire la stessa idea: la ricetta a mattoni e gli altri archetipi adatti al gesto
    const lista = elenco ? ESECUTORI_VOCI : [idea.ricetta, ...ESECUTORI[idea.gesto].filter(x => x !== idea.ricetta)]
    const ok = lista.filter(x => ammesso(c, x, hasPhoto))
    if (!ok.length) return []
    const scelti = [ok[(i * 2) % ok.length], ok[(i * 2 + 1) % ok.length]]
    return stili.map((b, j) => ({ ...b, sistema: scelti[j % scelti.length], idea, scala: polo(idea.scala), energia: polo(idea.energia), densita: polo(idea.densita), intreccio: j === 1 || idea.gesto === 'spezzato', grana: idea.motivi.includes('materia') ? b.grana : 0, seme: r.int(1, 99999) }) as Knobs)
  })
}

/** Il sistema per la selezione: un ibrido vale come l'archetipo del suo scheletro (stessa ossatura, stessa idea di pagina). */
const sistemaDi = (sc: Scene) => { const k = sc.knobs as Knobs | undefined; return k?.sistema === 'esempi' ? `esempi|${k.seme}` : k?.sistema === 'ibrido' && k.genoma ? scheletro(k.genoma) : k?.idea ? `${k.sistema}|${k.idea.gesto}` : k?.sistema ?? sc.layout }

/** Selezione: per punteggio, senza tavole gemelle (stessa ossatura), con un tetto per sistema e per identità (gli ibridi al più un terzo). */
function scegli(tutte: Scene[], n: number, soloPromosse: boolean, maxLivello = 3): Scene[] {
  const cand = tutte.filter(x => !soloPromosse || x.esame?.promossa).map(x => ({ x, p: punteggio(x) })).sort((a, b) => b.p - a.p).map(o => o.x)
  // prima un solo esemplare per sistema (niente coppie quasi uguali), poi si allarga se non bastano
  for (const [perSistema, perStile] of ([[1, 3], [2, 4], [3, 6]] as const).slice(0, maxLivello)) {
    const out: Scene[] = []
    const firme = new Set<string>(), sist = new Map<string, number>(), stili = new Map<string, number>()
    let ibridi = 0, daEsempi = 0
    for (const sc of cand) {
      const k = sc.knobs as Knobs | undefined
      const sis = sistemaDi(sc), st = k?.stile ?? sc.style
      const ib = k?.sistema === 'ibrido', es = k?.sistema === 'esempi'
      if (ib && ibridi >= Math.ceil(n / 3)) continue
      if (es && daEsempi >= Math.ceil(n / 3)) continue
      const firma = `${sis}|${sc.esame?.firma ?? ''}`
      const tetto = sis === 'composto' ? perSistema + 2 : perSistema
      if (firme.has(firma) || (sist.get(sis) ?? 0) >= tetto || (stili.get(st) ?? 0) >= perStile) continue
      if (ib) ibridi++
      if (es) daEsempi++
      out.push(sc); firme.add(firma); sist.set(sis, (sist.get(sis) ?? 0) + 1); stili.set(st, (stili.get(st) ?? 0) + 1)
      if (out.length >= n) return out
    }
    if (out.length >= n || perSistema === maxLivello) return out
  }
  return []
}
