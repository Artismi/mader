/**
 * Catalogo dei mattoni, ricette nominate e genetica (V1, pilota su Eco,
 * Costruttivista e Scontrino). Una ricetta è un genoma: un gene per categoria,
 * ognuno con i suoi parametri. Gli ibridi nascono incrociando i genomi
 * (ossatura di uno, titolo di un altro, dispositivi di un terzo) e mutando i
 * parametri dentro gli intervalli dichiarati; le combinazioni che non
 * rispettano `serve`/`offre` non si generano.
 */
import type { Scene } from '../../types'
import type { G } from '../tools'
import type { Rng } from '../knobs'
import { componi, type Genoma, type Gene, type Mattone, type Ossatura, type MTitolo, type Categoria, type Param } from './tipi'
import { fasce, titoloEco, tondo, nastro, stella, asse, barra, disco, numeroContorno, puntini, gigante } from './eco-costruttivo'
import type { Idea } from '../concetto'
import { banco, cassa, pieno, piena, quadretti, strato, cerchiato, timbro, freccia, varianteScontrino } from './scontrino'
import { INTRECCI } from './intreccio'

export * from './tipi'

const LISTA: Mattone[] = [fasce, titoloEco, gigante, tondo, nastro, stella, asse, barra, disco, numeroContorno, puntini, banco, cassa, pieno, piena, quadretti, strato, cerchiato, timbro, freccia, ...INTRECCI]
export const MATTONI: Record<string, Mattone> = Object.fromEntries(LISTA.map(m => [m.id, m]))
export const perCategoria = (c: Categoria) => LISTA.filter(m => m.cat === c)

/** Le ricette nominate: gli archetipi di prima, come combinazioni di mattoni. */
export const RICETTE = {
  eco: { ossatura: { id: 'fasce' }, titolo: { id: 'eco' }, foto: { id: 'tondo' }, dispositivi: [{ id: 'nastro' }, { id: 'stella' }], finiture: [] },
  costruttivo: { ossatura: { id: 'asse' }, titolo: { id: 'barra' }, foto: { id: 'disco' }, dispositivi: [{ id: 'numero-contorno' }, { id: 'puntini' }], finiture: [] },
  scontrino: { ossatura: { id: 'banco' }, titolo: { id: 'cassa' }, foto: { id: 'piena' }, dispositivi: [{ id: 'cerchiato' }, { id: 'timbro' }, { id: 'freccia' }], finiture: [{ id: 'quadretti' }, { id: 'strato' }] },
} satisfies Record<string, Genoma>
export type RicettaId = keyof typeof RICETTE

const ETICHETTE: Record<RicettaId, [string, boolean]> = { eco: ['Eco', true], costruttivo: ['Costruttivista', true], scontrino: ['Scontrino', false] }

/**
 * Il gesto dell'idea sul genoma della ricetta (C2): un solo protagonista spinto
 * all'estremo, il resto ridotto. Gli ornamenti li filtra `componi` (solo i motivati).
 */
export function genomaPerIdea(idea: Idea, base: Genoma): Genoma {
  const gen: Genoma = structuredClone(base)
  const senzaFoto = idea.togli.includes('foto')
  switch (idea.gesto) {
    case 'parola-immagine':
      gen.titolo = { id: 'gigante' }
      if (gen.ossatura.id !== 'banco') gen.foto = undefined
      break
    case 'ripetizione':
      if (gen.ossatura.id === 'fasce') gen.titolo = { id: 'eco', p: { passo: 0.6, spostamento: 1 } }
      break
    case 'scala':
      if (gen.ossatura.id === 'asse') { gen.ossatura.p = { ...gen.ossatura.p, titolo: 1.6, disco: 0.28 }; gen.titolo.p = { ...gen.titolo.p, margine: 0.2, sottile: 0 } }
      else gen.titolo = { id: 'pieno', p: { scala: 1.15 } }
      break
    case 'taglio':
      // il disco (con la foto) così grande e spostato che il bordo lo taglia
      if (gen.ossatura.id === 'asse') { gen.ossatura.p = { ...gen.ossatura.p, disco: 0.66, discoX: 0.92 }; gen.foto = { id: 'disco', p: { raggio: 0.96 } } }
      break
    case 'spezzato':
      if (gen.ossatura.id === 'fasce') { gen.titolo = { id: 'pieno', p: { scala: 1.15 } }; gen.foto = { id: 'tondo', p: { diametro: 0.6 } } }
      gen.intreccio = [{ id: 'davanti-dietro', p: { avvicina: 0.6 } }]
      break
    case 'vuoto':
      if (gen.ossatura.id === 'banco') gen.ossatura.p = { ...gen.ossatura.p, larghezza: 0.42 }
      gen.foto = undefined
      break
  }
  if (senzaFoto) gen.foto = undefined
  return gen
}

/** L'archetipo di prima come ricetta. Lo scontrino con il titolo dentro, se non entra, passa al titolo fuori. */
export function ricetta(g: G, id: RicettaId): Scene | null {
  const [label, specchio] = ETICHETTE[id]
  // con un'idea la ricetta esegue il suo gesto (C2)
  const idea = g.k.idea
  const conIdea = (gen: Genoma) => (idea ? genomaPerIdea(idea, gen) : gen)
  const etichetta = idea ? `${label}: ${idea.nome}` : label
  if (id !== 'scontrino') return componi(g, conIdea(RICETTE[id]), MATTONI, { layout: id, label: etichetta, specchio })
  const v = idea?.gesto === 'vuoto' ? 0 : varianteScontrino(g)
  const fuori: Genoma = { ...RICETTE.scontrino, titolo: { id: 'pieno' } }
  const sc = componi(g, conIdea(v === 2 ? fuori : RICETTE.scontrino), MATTONI, { layout: id, label: etichetta, specchio })
  if (sc || v === 2) return sc
  g.els = []; g.letture = []
  return componi(g, conIdea(fuori), MATTONI, { layout: id, label: etichetta, specchio })
}

/** Sigla del genoma (per i doppioni e per la selezione): ossatura+titolo+foto. */
export const sigla = (gen: Genoma) => [gen.ossatura.id, gen.titolo.id, gen.foto?.id ?? '-'].join('+')
/** Le ricette dei mattoni principali (ossatura, titolo, foto): un ibrido vero ne mescola almeno due. */
export const origini = (gen: Genoma) => new Set([gen.ossatura, gen.titolo, ...(gen.foto ? [gen.foto] : [])].map(x => MATTONI[x.id]?.ricetta).filter(Boolean))
/** La ricetta dell'ossatura: nella selezione un ibrido occupa il posto dell'archetipo con lo stesso scheletro. */
export const scheletro = (gen: Genoma) => MATTONI[gen.ossatura.id]?.ricetta ?? gen.ossatura.id

/** Vincoli statici: il titolo e la foto stanno nell'ossatura, i segni hanno quello che serve. */
export interface Vincoli { voci?: boolean; orizzontale?: boolean }
export function compatibile(gen: Genoma, o: Vincoli = {}) {
  const O = MATTONI[gen.ossatura.id] as Ossatura | undefined, T = MATTONI[gen.titolo.id] as MTitolo | undefined
  if (!O || O.cat !== 'ossatura' || !T || T.cat !== 'titolo') return false
  if (o.voci && !O.voci) return false
  const offre = new Set([...(O.offre ?? []), ...(O.id === 'banco' ? [o.orizzontale ? 'campo' : 'riga'] : [])])
  if ((T.serve ?? []).some(x => !offre.has(x))) return false
  if (T.forme.length && !T.forme.some(f => offre.has(f))) return false
  if (!T.forme.length && O.id !== 'banco') return false
  const F = gen.foto && MATTONI[gen.foto.id]
  if (F && (F.serve ?? []).some(x => !offre.has(x))) return false
  return true
}

/** Parametri a caso dentro gli intervalli del mattone (una parte resta ai regolatori). */
function parametri(r: Rng, m: Mattone, quota = 0.5): Param | undefined {
  const p: Param = {}
  for (const [k, [a, b]] of Object.entries(m.param ?? {})) if (r.chance(quota)) p[k] = k === 'variante' ? r.int(a, b) : a + r.next() * (b - a)
  return Object.keys(p).length ? p : undefined
}
const gene = (r: Rng, m: Mattone, quota?: number): Gene => ({ id: m.id, p: parametri(r, m, quota) })

/** Un genoma a caso che rispetta i vincoli. */
export function genomaCasuale(r: Rng, o: Vincoli = {}): Genoma {
  for (let i = 0; i < 40; i++) {
    const os = perCategoria('ossatura').filter(x => !o.voci || (x as Ossatura).voci)
    const gen: Genoma = {
      ossatura: gene(r, r.pick(os)), titolo: gene(r, r.pick(perCategoria('titolo'))), foto: gene(r, r.pick(perCategoria('foto'))),
      dispositivi: perCategoria('dispositivi').filter(() => r.chance(0.4)).map(m => gene(r, m)),
      finiture: perCategoria('finiture').filter(() => r.chance(0.3)).map(m => gene(r, m)),
      intreccio: perCategoria('intreccio').filter(() => r.chance(0.25)).slice(0, 1).map(m => gene(r, m)),
    }
    if (compatibile(gen, o)) return gen
  }
  return structuredClone(o.voci ? RICETTE.scontrino : RICETTE.eco)
}

/** Incrocio uniforme per categoria; i segni si ereditano uno per uno dall'uno o dall'altro genitore. */
export function incrocio(r: Rng, a: Genoma, b: Genoma, o: Vincoli = {}): Genoma {
  const scegli = <T>(x: T, y: T) => (r.chance(0.5) ? x : y)
  const unione = (x: Gene[], y: Gene[]) => [...new Map([...x, ...y].map(q => [q.id, q])).values()].filter(() => r.chance(0.6))
  for (let i = 0; i < 12; i++) {
    const f: Genoma = structuredClone({
      ossatura: scegli(a.ossatura, b.ossatura), titolo: scegli(a.titolo, b.titolo), foto: scegli(a.foto, b.foto),
      dispositivi: unione(a.dispositivi, b.dispositivi), finiture: unione(a.finiture, b.finiture), intreccio: unione(a.intreccio ?? [], b.intreccio ?? []).slice(0, 1),
    })
    if (compatibile(f, o)) return f
  }
  // il titolo che non sta nell'ossatura si cambia con uno che ci sta
  const f = structuredClone(a)
  const tit = perCategoria('titolo').filter(t => compatibile({ ...f, titolo: { id: t.id } }, o))
  if (tit.length) f.titolo = { id: r.pick(tit).id }
  return f
}

/** Mutazione: sposta un parametro, scambia un segno o un mattone con uno compatibile. */
export function muta(r: Rng, gen: Genoma, o: Vincoli & { forza?: number } = {}): Genoma {
  const f = structuredClone(gen)
  const n = 1 + Math.round((o.forza ?? 0.5) * 2)
  for (let i = 0; i < n; i++) {
    const tiro = r.next()
    if (tiro < 0.55) {
      // un parametro: dentro l'intervallo, vicino al valore di prima (o dal nulla se era dei regolatori)
      const geniF = [f.ossatura, f.titolo, ...(f.foto ? [f.foto] : []), ...f.dispositivi, ...f.finiture]
      const q = r.pick(geniF), m = MATTONI[q.id]
      const chiavi = Object.keys(m?.param ?? {})
      if (!chiavi.length) continue
      const k = r.pick(chiavi), [a, b] = m.param![k]
      const prima = q.p?.[k] ?? a + r.next() * (b - a)
      q.p = { ...q.p, [k]: k === 'variante' ? r.int(a, b) : Math.max(a, Math.min(b, prima + (r.next() - 0.5) * (b - a) * 0.4)) }
    } else if (tiro < 0.8) {
      // un segno in più o in meno
      const cat = r.pick(['dispositivi', 'finiture', 'intreccio'] as const)
      const lista = (f[cat] ??= [])
      const fuori = perCategoria(cat).filter(m => !lista.some(x => x.id === m.id))
      if (lista.length && (r.chance(0.5) || !fuori.length)) lista.splice(r.int(0, lista.length - 1), 1)
      else if (fuori.length) lista.push(gene(r, r.pick(fuori)))
      if (cat === 'intreccio' && lista.length > 1) lista.splice(0, lista.length - 1)
    } else {
      // un mattone principale: foto o titolo
      const cat = r.pick(['titolo', 'foto'] as const)
      const alt = perCategoria(cat).filter(m => m.id !== f[cat]?.id && compatibile({ ...f, [cat]: { id: m.id } }, o))
      if (alt.length) f[cat] = gene(r, r.pick(alt))
    }
  }
  return compatibile(f, o) ? f : gen
}

/** Il sistema "ibrido": compone il genoma dei regolatori (o uno a caso). */
export function ibrido(g: G): Scene | null {
  const voci = !!g.c.tipo && g.c.tipo !== 'copertina'
  const gen = (g.k as { genoma?: Genoma }).genoma ?? genomaCasuale(g.r, { voci })
  return componi(g, gen, MATTONI, { layout: 'ibrido', label: `Ibrido ${sigla(gen)}`, specchio: gen.ossatura.id !== 'banco' })
}
