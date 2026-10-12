/**
 * Ricette pulite per composeDesign: combinazioni di impaginazione e stile scelte
 * guardando la matrice completa (12 layout × 16 stili) e tenendo solo quelle che
 * reggono. Ogni ricetta toglie i difetti visti nella prova: niente scritta
 * fantasma tagliata in fondo, niente materia sporca sugli stili chiari.
 *
 * L'IA sceglie (o lo Studio deduce dal contenuto) la famiglia; lo Studio propone
 * più versioni pulite, in modo deterministico: stesso contenuto, stesse proposte.
 */
import type { ComposeBoard, DecorId } from './compose-spec'

export type RecipeFamily = 'poster' | 'annuncio' | 'citazione' | 'dati' | 'elenco' | 'foto'

export interface Recipe {
  id: string
  layout: string
  style: string
  family: RecipeFamily
  /** materia: le carte scure e il rumore leggero restano, lo sporco sui chiari no */
  texture?: 'nessuna' | 'stile'
  density?: 'essenziale' | 'ricco'
  needsPhoto?: boolean
}

const R = (layout: string, style: string, family: RecipeFamily, extra: Partial<Recipe> = {}): Recipe =>
  ({ id: `${layout}-${style}`, layout, style, family, ...extra })

/** Stili chiari con materia (carta/cemento) che sporca: senza texture nelle ricette pulite. */
const CLEAN_PAPER = new Set(['editoriale', 'galleria', 'poster', 'riso', 'bauhaus', 'organico', 'svizzero', 'minimal'])

export const RECIPES: Recipe[] = [
  // poster: il titolo è l'immagine
  R('gigante', 'minimal', 'poster'), R('gigante', 'svizzero', 'poster'), R('gigante', 'lusso', 'poster'),
  R('gigante', 'tech', 'poster'), R('gigante', 'bauhaus', 'poster'), R('gigante', 'brutalista', 'poster'),
  R('gigante', 'retro', 'poster'), R('gigante', 'organico', 'poster'), R('gigante', 'editoriale', 'poster'),
  R('manifesto', 'minimal', 'poster'), R('manifesto', 'svizzero', 'poster'), R('manifesto', 'tech', 'poster'),
  R('manifesto', 'cinema', 'poster'), R('manifesto', 'bauhaus', 'poster'), R('manifesto', 'poster', 'poster'),
  R('manifesto', 'lusso', 'poster'), R('manifesto', 'retro', 'poster'),
  R('tipografico', 'svizzero', 'poster'), R('tipografico', 'tech', 'poster'), R('tipografico', 'lusso', 'poster'),
  R('tipografico', 'cinema', 'poster'), R('tipografico', 'minimal', 'poster'), R('tipografico', 'bauhaus', 'poster'),
  // annuncio: titolo, sottotitolo e invito, con un'arte di supporto
  R('eroe', 'minimal', 'annuncio'), R('eroe', 'svizzero', 'annuncio'), R('eroe', 'cinema', 'annuncio'),
  R('eroe', 'lusso', 'annuncio'), R('eroe', 'tech', 'annuncio'), R('eroe', 'bauhaus', 'annuncio'),
  R('eroe', 'editoriale', 'annuncio'), R('scheda', 'morbido', 'annuncio'), R('scheda', 'minimal', 'annuncio'),
  R('scheda', 'svizzero', 'annuncio'), R('scheda', 'cinema', 'annuncio'), R('scheda', 'tech', 'annuncio'),
  R('scheda', 'lusso', 'annuncio'), R('arte', 'svizzero', 'annuncio'), R('arte', 'minimal', 'annuncio'),
  // citazioni
  R('citazione', 'lusso', 'citazione'), R('citazione', 'cinema', 'citazione'), R('citazione', 'minimal', 'citazione'),
  R('citazione', 'svizzero', 'citazione'), R('citazione', 'tech', 'citazione'), R('citazione', 'organico', 'citazione'),
  R('citazione', 'editoriale', 'citazione'),
  // dati e riepiloghi
  R('bento', 'minimal', 'dati'), R('bento', 'svizzero', 'dati'), R('bento', 'morbido', 'dati'), R('bento', 'tech', 'dati'),
  R('bento', 'cinema', 'dati'), R('bento', 'lusso', 'dati'), R('bento', 'bauhaus', 'dati'),
  R('numeri', 'minimal', 'dati'), R('numeri', 'svizzero', 'dati'), R('numeri', 'cinema', 'dati'),
  R('numeri', 'lusso', 'dati'), R('numeri', 'tech', 'dati'),
  // elenchi
  R('elenco', 'minimal', 'elenco'), R('elenco', 'svizzero', 'elenco'), R('elenco', 'cinema', 'elenco'), R('elenco', 'lusso', 'elenco'),
  // con una foto vera
  R('copertina', 'cinema', 'foto', { needsPhoto: true }), R('copertina', 'lusso', 'foto', { needsPhoto: true }),
  R('copertina', 'editoriale', 'foto', { needsPhoto: true }), R('copertina', 'minimal', 'foto', { needsPhoto: true }),
  R('cover', 'svizzero', 'foto', { needsPhoto: true }), R('cover', 'editoriale', 'foto', { needsPhoto: true }),
  R('diviso', 'minimal', 'foto', { needsPhoto: true }), R('diviso', 'svizzero', 'foto', { needsPhoto: true }),
  R('galleria', 'galleria', 'foto', { needsPhoto: true }), R('galleria', 'minimal', 'foto', { needsPhoto: true }),
]

export const recipeOf = (id?: string) => RECIPES.find(r => r.id === id)

/** Le impostazioni della ricetta, da fondere nella tavola. */
export function recipeSpec(r: Recipe): Partial<ComposeBoard> {
  return {
    layout: r.layout, style: r.style, recipe: r.id,
    // la scritta fantasma esce tagliata dalla tavola: sembra un errore
    excludeDecor: ['ghost'] as DecorId[],
    texture: r.texture ?? (CLEAN_PAPER.has(r.style) ? 'nessuna' : 'stile'),
    density: r.density ?? 'ricco',
  }
}

/** Che tipo di contenuto è: decide la famiglia di ricette. */
export function familyFor(b: Partial<ComposeBoard>): RecipeFamily {
  const c = b.content ?? ({} as ComposeBoard['content'])
  if (c.image?.url || c.image?.query || c.image?.prompt) return 'foto'
  if (c.quote) return 'citazione'
  if ((c.stats?.length ?? 0) >= 2) return 'dati'
  if ((c.items?.length ?? 0) >= 3) return 'elenco'
  const words = String(c.title ?? '').trim().split(/\s+/).length
  return words <= 4 && !c.body ? 'poster' : 'annuncio'
}

const hash = (t: string) => [...t].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7) >>> 0

/**
 * Le proposte per un contenuto: n ricette diverse della famiglia giusta.
 * Se lo stile è indicato (brand), si resta in quello stile variando l'impaginazione;
 * altrimenti si variano gli stili. Sempre le stesse per lo stesso contenuto.
 */
export function pickRecipes(b: Partial<ComposeBoard>, n: number, family = familyFor(b)): Recipe[] {
  let pool = RECIPES.filter(r => r.family === family)
  if (!pool.length) pool = RECIPES.filter(r => r.family === 'annuncio')
  const sameStyle = b.style ? pool.filter(r => r.style === b.style) : []
  const seed = hash(String(b.content?.title ?? '') + (b.content?.brand ?? ''))
  const rot = (list: Recipe[]) => list.map((_, i) => list[(i + seed) % list.length])
  const out: Recipe[] = []
  // prima lo stile richiesto, poi stili diversi tra loro
  for (const r of [...rot(sameStyle), ...rot(pool)]) {
    if (out.length >= n) break
    if (out.some(o => o.id === r.id)) continue
    if (!sameStyle.length && out.some(o => o.style === r.style)) continue
    out.push(r)
  }
  return out
}

/** Finiture disponibili (i pack li applica lo Studio: src/components/studio/ai/finish.ts). */
export const FINISH_IDS = ['carta', 'grana', 'grunge', 'retino', 'luce', 'polvere', 'graffi', 'fotocopia', 'plastica', 'vetro', 'strappi', 'y2k', 'segni', 'collage'] as const

/** Finitura consigliata per stile, quando l'IA non ne chiede: misurata, mai più di due livelli. */
export const STYLE_FINISH: Record<string, string[]> = {
  editoriale: ['carta'], galleria: ['carta'], organico: ['carta', 'segni'], retro: ['carta', 'grana'], riso: ['grana', 'retino'],
  poster: ['carta'], bauhaus: ['carta'], brutalista: ['fotocopia', 'y2k'], cinema: ['polvere', 'luce'], neon: ['plastica'],
  tech: ['graffi'], cromo: ['plastica', 'y2k'], lusso: ['polvere'], morbido: [], minimal: [], svizzero: [],
}

/** Decorazioni d'effetto che fanno a pugni con un visual: con il visual si spengono. */
export const LOUD_DECOR = ['ghost', 'orbs', 'starburst', 'shape3d', 'halftoneDisc', 'blob', 'bauhaus', 'sticker', 'scribble', 'badge', 'dots'] as const
