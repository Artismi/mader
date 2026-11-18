/**
 * La regia: prima di toccare il foglio l'artista decide che cosa sta mostrando.
 *
 * Dalla parola del giorno e dal suo campo semantico (lessico) ricava:
 *  - la FORMA della tavola: ambiente (uno spazio, un orizzonte), icona (una cosa
 *    sola, grande), sensazione (solo materia e luce), racconto (tre tempi),
 *    mappa (le parole come luoghi collegati), manifesto (la parola che comanda);
 *  - le QUALITÀ (luce, peso, vuoto, colore, direzione) dalle radici delle parole;
 *  - il SOGGETTO: una parola concreta del campo e la forma che la dice
 *    (sole → cerchio, monte → triangolo, strada → traccia, folla → punti…);
 *  - il TESTO che va con l'immagine: titolo e didascalia parlano di ciò che si vede.
 *
 * Poi costruisce per ruoli, dal fondo in su: atmosfera (strati di materia,
 * texture, shader), struttura, soggetto, dettagli; il testo per ultimo, in una
 * zona sua, orizzontale, in gerarchia (titolo + didascalia), mai sopra il soggetto.
 */
import type { AgentState, Features, Intention } from '../core/types'
import { pick, range, weighted, type Rnd } from '../core/rng'
import { RECIPES, defaults, shuffle as shuffleParams, type Tone } from '@/components/studio/genera/recipes'
import { FACES, loadLabFonts, type FaceId } from '@/components/studio/genera/fonts'
import { fontCss, type Face } from '@/components/studio/genera/raster'
import { LOOKS } from '@/components/studio/fx/catalog'
import { anchorOf } from '../reader/lexicon'
import { category, conceptsReady, field, relationsOf } from '../reader/concepts'
import { newCanvas, withLayer, fullLayer, type Layer, type Sheet } from '../hands/sheet'
import { textLayer, toolById, type ToolCtx } from '../hands/tools'
import { ratio } from '../eyes/judgement'
import { isNome, realizza } from '../voice/lingua'

export type Forma = 'ambiente' | 'icona' | 'sensazione' | 'racconto' | 'mappa' | 'manifesto'
export type Sogg = 'cerchio' | 'triangolo' | 'croce' | 'rettangolo' | 'colonna' | 'arco' | 'onde' | 'traccia' | 'punti'
export interface Scena {
  forma: Forma
  word: string
  soggetto: { parola: string; forma: Sogg }
  campo: string[]
  catena: string[]
  q: Record<string, number>
  didascalia: string
  perche: string
}

/** i livelli che il resto dello studio non deve toccare */
export const PROTETTI = new Set(['testo', 'firma', 'piastra', 'mappa', 'etichette'])

const CAT_FORMA: Record<string, Forma> = {
  luogo: 'ambiente', 'cosa naturale': 'ambiente', fenomeno: 'ambiente', tempo: 'ambiente', pianta: 'ambiente',
  'oggetto fatto': 'icona', corpo: 'icona', animale: 'icona', forma: 'icona', cibo: 'icona',
  sentimento: 'sensazione', stato: 'sensazione', qualità: 'sensazione', percepire: 'sensazione', sentire: 'sensazione', proprietà: 'sensazione', sostanza: 'sensazione',
  azione: 'racconto', evento: 'racconto', processo: 'racconto', cambiamento: 'racconto', muoversi: 'racconto', creare: 'racconto',
  relazione: 'mappa', pensiero: 'mappa', comunicazione: 'mappa', gruppo: 'mappa', quantità: 'mappa', pensare: 'mappa', 'vivere insieme': 'mappa', possesso: 'mappa',
  persona: 'manifesto', lottare: 'manifesto', comunicare: 'manifesto',
}
const CONCRETE = new Set(['luogo', 'cosa naturale', 'oggetto fatto', 'corpo', 'animale', 'pianta', 'forma', 'cibo', 'sostanza', 'fenomeno'])
const POLITICA = ['lott', 'resist', 'guerr', 'liber', 'fascis', 'partigian', 'scioper', 'rivolt', 'poter', 'popol', 'giustiz', 'diritt', 'pace', 'oppress', 'confin', 'lavor', 'operai']
const SHAPE_ROOTS: [string, Sogg][] = [
  ['sol', 'cerchio'], ['lun', 'cerchio'], ['occh', 'cerchio'], ['sfer', 'cerchio'], ['cerch', 'cerchio'], ['ruot', 'cerchio'], ['mond', 'cerchio'], ['pianet', 'cerchio'], ['buc', 'cerchio'], ['pall', 'cerchio'],
  ['mont', 'triangolo'], ['picc', 'triangolo'], ['vett', 'triangolo'], ['piramid', 'triangolo'], ['tend', 'triangolo'], ['fiamm', 'triangolo'], ['vel', 'triangolo'],
  ['croc', 'croce'], ['incroc', 'croce'], ['tomb', 'croce'],
  ['mur', 'rettangolo'], ['cas', 'rettangolo'], ['port', 'rettangolo'], ['finestr', 'rettangolo'], ['libr', 'rettangolo'], ['scatol', 'rettangolo'], ['edific', 'rettangolo'], ['citt', 'rettangolo'], ['stanz', 'rettangolo'], ['letto', 'rettangolo'], ['tavol', 'rettangolo'], ['schermo', 'rettangolo'],
  ['torr', 'colonna'], ['alber', 'colonna'], ['person', 'colonna'], ['uom', 'colonna'], ['donn', 'colonna'], ['corp', 'colonna'], ['pal', 'colonna'], ['colonn', 'colonna'], ['soldat', 'colonna'],
  ['pont', 'arco'], ['arc', 'arco'], ['volt', 'arco'], ['orizzont', 'arco'],
  ['ond', 'onde'], ['mar', 'onde'], ['acqu', 'onde'], ['vent', 'onde'], ['suon', 'onde'], ['lag', 'onde'],
  ['fium', 'traccia'], ['strad', 'traccia'], ['fil', 'traccia'], ['ram', 'traccia'], ['radic', 'traccia'], ['ven', 'traccia'], ['sangu', 'traccia'], ['sentier', 'traccia'], ['serpent', 'traccia'], ['fum', 'traccia'], ['cammin', 'traccia'],
  ['stell', 'punti'], ['sem', 'punti'], ['gocc', 'punti'], ['piogg', 'punti'], ['foll', 'punti'], ['popol', 'punti'], ['polver', 'punti'], ['cener', 'punti'], ['neve', 'punti'], ['grano', 'punti'], ['sciam', 'punti'],
]
const shapeOf = (w: string): Sogg | null => {
  let best: Sogg | null = null, len = 0
  for (const [r, s] of SHAPE_ROOTS) if (w.startsWith(r) && r.length > len && w.length - r.length <= (r.length <= 3 ? 3 : 5)) { best = s; len = r.length }
  return best
}

type WithScene = AgentState & { scene?: Forma[] }

/** decide che cosa mostrare */
export function progetta(st: AgentState, r: Rnd, it: Intention, near: string[], forzata?: Forma): Scena {
  const word = it.word
  const fld = conceptsReady() ? field(word, 2, 30) : []
  const campo = [...new Set([...fld.map(x => x.word), ...near])].filter(w => w !== word && w.length > 2 && !w.includes(' ')).slice(0, 14)
  // qualità: le radici della parola e del suo campo (la parola conta tre volte)
  const q: Record<string, number> = {}
  const acc = (w: string, k: number) => { const a = anchorOf(w); if (a?.feature) q[a.feature] = (q[a.feature] ?? 0) + (a.dir ?? 1) * k }
  acc(word, 3); campo.forEach(w => acc(w, 1))
  for (const k of Object.keys(q)) q[k] = Math.max(-1, Math.min(1, q[k] / 3))
  // la forma
  const cat = category(word)
  const pesi: Record<Forma, number> = { ambiente: 1, icona: 1, sensazione: 1, racconto: 1, mappa: 1, manifesto: 0.6 }
  if (CAT_FORMA[cat]) pesi[CAT_FORMA[cat]] += 3
  if (POLITICA.some(p => word.startsWith(p))) pesi.manifesto += 3
  if (it.register === 'slogan') pesi.manifesto += 2
  if (it.register === 'silenzio') pesi.sensazione += 3
  if (it.register === 'documentario') pesi.mappa += 1.5
  if (it.register === 'poetico') pesi.ambiente += 1
  if (campo.length < 4) pesi.mappa *= 0.2
  const recenti = (st as WithScene).scene ?? []
  for (const f of recenti.slice(-3)) pesi[f] *= 0.55
  const forme = Object.keys(pesi) as Forma[]
  const forma = forzata ?? weighted(r, forme, f => pesi[f], Math.max(0.3, st.temperature))
  ;(st as WithScene).scene = [...recenti, forma].slice(-20)
  // il soggetto: una parola concreta con una forma; altrimenti la parola stessa
  const candidati = [word, ...campo].filter((w, i) => !i || isNome(w)).map(w => ({ w, s: shapeOf(w), c: CONCRETE.has(category(w)) }))
  const conForma = candidati.filter(x => x.s)
  const scelto = conForma.find(x => x.w === word) ?? (conForma.length ? pick(r, conForma.slice(0, 5)) : candidati.find(x => x.c) ?? candidati[0])
  const fallback: Sogg = (q.verticali ?? 0) > 0.2 ? 'colonna' : (q.linee ?? 0) > 0.2 ? 'traccia' : (q.punti ?? 0) > 0.2 || (q.elementi ?? 0) > 0.3 ? 'punti' : (q.superfici ?? 0) > 0.2 ? 'rettangolo' : (q.orizzontali ?? 0) > 0.2 ? 'onde' : pick(r, ['cerchio', 'triangolo', 'arco', 'rettangolo'] as Sogg[])
  const soggetto = { parola: scelto.w, forma: scelto.s ?? fallback }
  // una catena di parole per il racconto e la mappa: la parola, una relazione, un'altra
  const rel = conceptsReady() ? relationsOf(word, 2) : []
  const catena = [word, ...(rel.length ? [rel[0].b] : campo.slice(0, 1)), ...(campo.filter(w => w !== rel[0]?.b).slice(0, 1))].slice(0, 3)
  const didascalia = didascaliaDi(r, forma, word, soggetto.parola, catena)
  const perche = `${forma}${cat ? ` (perché «${word}» è ${cat})` : ''}: ${soggetto.parola !== word ? `${soggetto.parola} come ${soggetto.forma}` : `${soggetto.forma}`}`
  return { forma, word, soggetto, campo, catena, q, didascalia, perche }
}

function didascaliaDi(r: Rnd, f: Forma, word: string, sogg: string, catena: string[]): string {
  const v = { w: word, s: sogg, b: catena[1] ?? word, c: catena[2] ?? sogg }
  const T: Record<Forma, string[]> = {
    ambiente: ['{det:s} sulla linea {di:w}', 'qui, {in:w}, resta {det:s}', 'paesaggio con {s}, visto {da:w}', '{det:w} come luogo: {det:s} al centro, il resto è aria'],
    icona: ['{det:s}, e nient\'altro', 'ritratto {di:s}', '{det:s} pesa quanto {det:w}', 'una cosa sola: {det:s}'],
    sensazione: ['come stare {in:w}', 'la pelle {di:w}', 'non c\'è niente da vedere, c\'è {det:w}', 'questo è il colore {di:w}'],
    racconto: ['prima {det:w}, poi {det:b}, infine {det:c}', 'i tre tempi {di:w}', '{da:w} {a:c}, passando per {det:b}'],
    mappa: ['dove sta {det:w}', 'mappa {di:w} e dintorni', '{det:w} e le parole che tocca', 'ogni parola è un luogo: si parte {da:w}'],
    manifesto: ['{det:w} non si delega', 'tutto parte {da:w}', '{det:w} è adesso', 'contro chi vuole togliere {det:w}'],
  }
  return realizza(pick(r, T[f]), v)
}

// ─── costruire ──────────────────────────────────────────────────────────────

const TEXTLESS = RECIPES.filter(rc => !rc.params.some(p => p.type === 'text'))
const lid = () => `s${Math.random().toString(36).slice(2, 9)}`
const dark = (t: Tone) => t.dark

/** sceglie il tono dalla luce della scena */
export function toneFor(sc: Scena, r: Rnd, tones: Tone[], firmaTone?: string): Tone {
  const l = sc.q.luminosita ?? 0
  return weighted(r, tones, t => (t.id === firmaTone ? 2 : 1) * (l < -0.15 ? (dark(t) ? 3 : 0.4) : l > 0.15 ? (dark(t) ? 0.3 : 3) : 1), 0.6)
}

export interface Costruzione { sheet: Sheet; passi: { tool: string; params: Record<string, unknown>; kept: boolean; delta: number }[]; soggettoY: number; zona: 'alto' | 'basso' }

export async function costruisci(st: AgentState, r: Rnd, sc: Scena, start: Sheet, ctx: ToolCtx, face: FaceId): Promise<Costruzione> {
  let s = start
  const passi: Costruzione['passi'] = []
  const t = ctx.tone
  const usa = async (id: string, params: Record<string, unknown>) => {
    const tool = toolById(id)
    if (!tool) return
    try { s = await tool.apply(s, params, ctx); passi.push({ tool: `scena:${id}`, params: compatti(params), kept: true, delta: 0 }) } catch { /* pazienza */ }
  }
  // 1. atmosfera: strati di materia (più strati nella sensazione, meno nell'icona)
  const strati = { sensazione: 4, ambiente: 3, racconto: 2, mappa: 2, icona: 2, manifesto: 2 }[sc.forma]
  const peso = (sc.q.densita ?? 0) + (sc.q.complessita ?? 0)
  for (let i = 0; i < strati; i++) {
    const opts = ['ricetta', 'pattern', 'grana', ...(ctx.shaders.some(x => x.code) ? ['shader', 'shader'] : [])]
    const k = pick(r, opts)
    const alpha = sc.forma === 'sensazione' ? range(r, 0.45, 0.9) : range(r, 0.18, 0.45) * (1 + peso * 0.3)
    if (k === 'ricetta' && TEXTLESS.length) {
      const rc = pick(r, TEXTLESS), seed = Math.floor(r() * 1e9)
      await usa('semina', { recipe: rc.id, seed, values: shuffleParams(rc, defaults(rc), seed), piece: false, x: 0.5, y: 0.5, scale: 1, rot: 0, blend: pick(r, ['multiply', 'overlay', 'soft-light', 'screen']) })
      if (s.layers.length) s.layers[s.layers.length - 1].alpha = alpha
    } else if (k === 'pattern') {
      const kind = (sc.q.orizzontali ?? 0) > 0.2 ? 'righe' : (sc.q.punti ?? 0) > 0.2 ? 'punti' : pick(r, ['righe', 'tratteggio', 'griglia', 'onde', 'punti'])
      await usa('pattern', { kind, step: range(r, 6, 22), angle: (sc.q.diagonali ?? 0) > 0.2 ? Math.PI / 4 : kind === 'righe' ? 0 : range(r, 0, Math.PI), weight: range(r, 0.6, 2.5), color: t.ink, alpha: alpha * 0.6, region: sc.forma === 'ambiente' ? 'basso' : 'tutto', blend: 'multiply' })
    } else if (k === 'grana') {
      await usa('grana', { amount: range(r, 0.06, 0.2) * (1 + peso * 0.5), size: Math.floor(range(r, 1, 3)), seed: Math.floor(r() * 1e9), blend: pick(r, ['overlay', 'multiply', 'soft-light']) })
    } else {
      const pool = ctx.shaders.filter(x => x.code)
      await usa('shader', { source: pick(r, pool).id, time: range(r, 0, 60), seed: r(), blend: pick(r, ['multiply', 'overlay', 'screen', 'soft-light']), alpha })
    }
  }
  // un look su uno strato: la luce della scena
  if (s.layers.length && r() < 0.6) await usa('luce', { layer: s.layers[0].id, look: pick(r, LOOKS).id, amount: Math.round(range(r, 40, 90)) })

  // 2. struttura e soggetto, per forma
  const ink = pick(r, [t.ink, t.ink, t.acc])
  let soggettoY = 0.45, zona: 'alto' | 'basso' = 'basso'
  const SO = sc.soggetto.forma
  const big = (x: number, y: number, size: number, extra: Record<string, unknown> = {}) => soggetto(SO, x, y, size, ink, extra)
  const soggetto = async (f: Sogg, x: number, y: number, size: number, color: string, extra: Record<string, unknown> = {}) => {
    if (f === 'traccia') {
      const pts: [number, number][] = []
      let px = x - size * 0.6, py = y + (r() - 0.5) * size * 0.3, a = (sc.q.diagonali ?? 0) > 0.2 ? -0.5 : 0
      for (let i = 0; i < 40; i++) { pts.push([px, py]); a += (r() - 0.5) * 0.35; px += Math.cos(a) * size * 0.032; py += Math.sin(a) * size * 0.032 }
      return usa('traccia', { strokes: [pts], width: 6 + size * 40, taper: true, color, alpha: 0.95, dry: r() < 0.3, ...extra })
    }
    if (f === 'onde') return usa('pattern', { kind: 'onde', step: 14 + size * 30, angle: 0, weight: 2 + size * 4, color, alpha: 0.85, region: y > 0.55 ? 'basso' : 'centro', blend: 'source-over' })
    if (f === 'punti') { s = puntiLayer(s, r, x, y, size, color, (sc.q.elementi ?? 0) > 0 ? 220 : 70); passi.push({ tool: 'scena:punti', params: { x, y, size }, kept: true, delta: 0 }); return }
    const shape = f === 'colonna' ? 'rettangolo' : f
    return usa('geometria', { shape, x, y, size, rot: f === 'colonna' ? Math.PI / 2 : f === 'triangolo' || f === 'arco' ? (f === 'arco' ? Math.PI : 0) : f === 'croce' ? 0 : (sc.q.diagonali ?? 0) > 0.2 ? Math.PI / 6 : 0, fill: f !== 'arco' && f !== 'croce', stroke: 6, color, alpha: 1, blend: 'source-over', ...extra })
  }
  switch (sc.forma) {
    case 'ambiente': {
      const hy = (sc.q.vuoto ?? 0) > 0.2 || (sc.q.verticali ?? 0) > 0.2 ? 0.72 : 0.62
      s = bandaLayer(s, hy, t.ink, 0.22 + Math.max(0, peso) * 0.15)
      passi.push({ tool: 'scena:orizzonte', params: { y: hy }, kept: true, delta: 0 })
      const sx = pick(r, [1 / 3, 2 / 3])
      const size = SO === 'colonna' ? 0.32 : SO === 'traccia' || SO === 'onde' ? 0.6 : 0.16
      soggettoY = SO === 'colonna' ? hy - 0.1 : SO === 'cerchio' ? hy - 0.2 : hy - 0.04
      await big(sx, soggettoY, size)
      zona = 'alto'
      break
    }
    case 'icona': {
      const sx = pick(r, [0.5, 0.5, 1 / 3, 2 / 3])
      soggettoY = 0.4
      await big(sx, soggettoY, SO === 'colonna' ? 0.75 : 0.5)
      if (r() < 0.35) await usa('taglia', { layer: s.layers[s.layers.length - 1].id, shape: pick(r, ['fascia', 'strappo']), x: sx, y: soggettoY, size: 0.15, rot: 0, seed: Math.floor(r() * 1e9) })
      zona = 'basso'
      break
    }
    case 'sensazione': {
      if (r() < 0.5) await soggetto(pick(r, ['traccia', 'punti', 'cerchio'] as Sogg[]), range(r, 0.3, 0.7), 0.45, 0.25, t.acc, { alpha: 0.7 })
      // un look in più sull'ultimo strato: la sensazione è materia
      if (s.layers.length) await usa('materia', { ...toolById('materia')!.propose(s, ctx), layer: s.layers[s.layers.length - 1].id })
      zona = 'basso'
      break
    }
    case 'racconto': {
      s = pannelliLayer(s, t.ink)
      passi.push({ tool: 'scena:pannelli', params: { n: 3 }, kept: true, delta: 0 })
      soggettoY = 0.5
      for (let i = 0; i < 3; i++) {
        const x = (i + 0.5) / 3
        // il soggetto cambia nei tre tempi: cresce, si sposta, si rompe o svanisce
        const size = 0.14 + i * 0.05
        await soggetto(SO === 'onde' || SO === 'traccia' ? 'traccia' : SO, x, soggettoY + (i === 1 ? -0.04 : 0), size, i === 2 ? t.acc : ink, { alpha: i === 2 && r() < 0.5 ? 0.45 : 1 })
        if (i === 2 && r() < 0.5) await usa('taglia', { layer: s.layers[s.layers.length - 1].id, shape: 'strappo', x, y: soggettoY, size: 0.08, rot: 0, seed: Math.floor(r() * 1e9) })
      }
      s = await etichette(s, sc.catena.map((w, i) => ({ text: `${['I', 'II', 'III'][i]}  ${w}`, x: (i + 0.5) / 3, y: 0.68 })), face, t)
      zona = 'alto'
      break
    }
    case 'mappa': {
      s = await mappaLayer(s, r, sc, face, t)
      passi.push({ tool: 'scena:mappa', params: { nodi: Math.min(8, sc.campo.length + 1) }, kept: true, delta: 0 })
      soggettoY = 0.42
      zona = 'basso'
      break
    }
    case 'manifesto': {
      soggettoY = 0.62
      await big(pick(r, [1 / 3, 2 / 3]), soggettoY, SO === 'colonna' ? 0.5 : 0.42, { color: t.acc })
      zona = 'alto'
      break
    }
  }
  return { sheet: s, passi, soggettoY, zona }
}

/** l'impaginazione: titolo e didascalia in una zona loro, orizzontali, in gerarchia, leggibili */
export async function impagina(s: Sheet, sc: Scena, c: Costruzione, titolo: string, face: FaceId, t: Tone, margine: number): Promise<Sheet> {
  const M = Math.min(s.W, s.H)
  const grande = sc.forma === 'manifesto'
  const sizeT = M * (grande ? 0.1 : titolo.length > 40 ? 0.042 : 0.056)
  const sizeD = M * 0.024
  // prima li compongo fuori dal foglio per misurarli
  const prova = { ...s, layers: [] as Layer[] }
  const bgPiastra = t.bg
  const colore = [t.ink, t.acc, '#111111', '#f2f0ea'].sort((a, b) => ratio(b, bgPiastra) - ratio(a, bgPiastra))[0]
  const a = await textLayer(prova, { text: grande ? titolo.toUpperCase() : titolo, face, sizePx: sizeT, color: colore, x: 0, y: 0, maxW: grande ? 0.74 : 0.62 })
  const b = await textLayer(prova, { text: sc.didascalia, face, sizePx: sizeD, color: colore, x: 0, y: 0, maxW: 0.55 })
  const lt = a.layers[0], ld = b.layers[0]
  const wT = lt.canvas.width / s.W, hT = lt.canvas.height / s.H, wD = ld.canvas.width / s.W, hD = ld.canvas.height / s.H
  const m = margine + 0.02
  const top = c.zona === 'alto' ? m : 1 - m - 0.04 - hT - hD
  const left = m
  // la piastra: un fondo pieno dietro il testo quando sotto c'è materia
  const materia = s.layers.filter(l => ['ricetta', 'shader', 'grana', 'pattern'].includes(l.kind)).length
  let out = s
  if (materia >= 2 && !grande) {
    const pw = Math.max(wT, wD) + 0.02, ph = hT + hD + 0.02
    const cv = newCanvas(Math.round(pw * s.W), Math.round(ph * s.H)), g = cv.getContext('2d')!
    g.fillStyle = bgPiastra; g.fillRect(0, 0, cv.width, cv.height)
    out = withLayer(out, { id: lid(), kind: 'piastra', canvas: cv, x: left - 0.01 + pw / 2, y: top - 0.01 + ph / 2, scale: Math.max(cv.width, cv.height) / M, rot: 0, alpha: 0.92, blend: 'source-over' })
  }
  out = withLayer(out, { ...lt, x: left + wT / 2, y: top + hT / 2 })
  out = withLayer(out, { ...ld, x: left + wD / 2, y: top + hT + hD / 2 })
  return out
}

// ─── livelli disegnati dalla regia ──────────────────────────────────────────

function bandaLayer(s: Sheet, hy: number, color: string, alpha: number): Sheet {
  const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
  g.fillStyle = color
  g.globalAlpha = alpha
  g.fillRect(0, hy * s.H, s.W, s.H * (1 - hy))
  g.globalAlpha = 1
  g.fillRect(0, hy * s.H - 1.5, s.W, 3)
  return withLayer(s, fullLayer(s, lid(), 'orizzonte', cv, 'multiply'))
}

function pannelliLayer(s: Sheet, color: string): Sheet {
  const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
  g.strokeStyle = color; g.lineWidth = 2
  for (const x of [1 / 3, 2 / 3]) { g.beginPath(); g.moveTo(x * s.W, s.H * 0.28); g.lineTo(x * s.W, s.H * 0.74); g.stroke() }
  return withLayer(s, fullLayer(s, lid(), 'pannelli', cv))
}

function puntiLayer(s: Sheet, r: Rnd, x: number, y: number, size: number, color: string, n: number): Sheet {
  const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
  g.fillStyle = color
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * size * 0.6
    const rad = (1.5 + r() * 4) * (s.W / 800)
    g.beginPath(); g.arc((x + Math.cos(a) * d) * s.W, (y + Math.sin(a) * d * 0.8) * s.H, rad, 0, Math.PI * 2); g.fill()
  }
  return withLayer(s, fullLayer(s, lid(), 'punti', cv))
}

async function etichette(s: Sheet, items: { text: string; x: number; y: number }[], face: FaceId, t: Tone): Promise<Sheet> {
  await loadLabFonts()
  const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
  const F: Face = FACES[face] ?? FACES.grotesk
  const size = Math.round(Math.min(s.W, s.H) * 0.022)
  g.font = fontCss(F, size); g.fillStyle = [t.ink, t.acc].sort((a, b) => ratio(b, t.bg) - ratio(a, t.bg))[0]; g.textAlign = 'center'; g.textBaseline = 'top'
  for (const it of items) g.fillText(F.upper ? it.text.toUpperCase() : it.text, it.x * s.W, it.y * s.H)
  return withLayer(s, fullLayer(s, lid(), 'etichette', cv))
}

async function mappaLayer(s: Sheet, r: Rnd, sc: Scena, face: FaceId, t: Tone): Promise<Sheet> {
  await loadLabFonts()
  const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
  const F: Face = FACES[face] ?? FACES.grotesk
  const words = [sc.word, ...sc.campo.slice(0, 7)]
  const cx = pick(r, [0.38, 0.5, 0.62]), cy = 0.42
  // posizioni: la parola al centro, le altre su un'ellisse irregolare; le più vicine (prime del campo) più vicine
  const pos = words.map((_, i) => {
    if (!i) return [cx, cy]
    const a = (i / (words.length - 1)) * Math.PI * 2 + r() * 0.5, d = 0.14 + (i / words.length) * 0.16 + r() * 0.04
    return [Math.min(0.85, Math.max(0.12, cx + Math.cos(a) * d)), Math.min(0.68, Math.max(0.14, cy + Math.sin(a) * d * 0.9))]
  })
  const ink = [t.ink, t.acc].sort((a, b) => ratio(b, t.bg) - ratio(a, t.bg))[0]
  g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 1.5
  // archi: dal centro a ciascuna, e qualche legame tra vicine
  for (let i = 1; i < words.length; i++) {
    const from = i > 3 && r() < 0.4 ? Math.max(1, i - 3) : 0
    g.setLineDash(from ? [4, 4] : [])
    g.beginPath(); g.moveTo(pos[from][0] * s.W, pos[from][1] * s.H); g.lineTo(pos[i][0] * s.W, pos[i][1] * s.H); g.stroke()
  }
  g.setLineDash([])
  const size = Math.round(Math.min(s.W, s.H) * 0.022)
  g.textBaseline = 'middle'
  words.forEach((w, i) => {
    const [x, y] = pos[i]
    const R = i ? 4 : 11
    g.beginPath(); g.arc(x * s.W, y * s.H, R * (s.W / 800), 0, Math.PI * 2); g.fill()
    g.font = fontCss(F, i ? size : Math.round(size * 1.5))
    g.textAlign = x > 0.6 ? 'right' : 'left'
    g.fillText(F.upper ? w.toUpperCase() : w, x * s.W + (x > 0.6 ? -14 : 14), y * s.H)
  })
  return withLayer(s, fullLayer(s, lid(), 'mappa', cv))
}

function compatti(p: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(p)) out[k] = k === 'strokes' ? (v as unknown[]).length : k === 'values' ? '…' : typeof v === 'number' ? Math.round(v * 1000) / 1000 : v
  return out
}

export const scenaFeatures = (sc: Scena): Features => {
  // i bersagli che la regia dà allo studio: la tavola deve somigliare alla sua scena
  const f: Features = {}
  if (sc.q.luminosita) f.luminosita = 0.5 + sc.q.luminosita * 0.35
  if (sc.q.vuoto) f.vuoto = 0.35 + sc.q.vuoto * 0.3
  if (sc.q.saturazione) f.saturazione = 0.4 + sc.q.saturazione * 0.35
  if (sc.forma === 'icona' || sc.forma === 'manifesto') f.elementi = 0.12
  if (sc.forma === 'sensazione') f.complessita = 0.6
  return f
}
